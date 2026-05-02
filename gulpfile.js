import gulpSass from 'gulp-sass';
import * as dartSass from 'sass';
import { src, dest, watch, series } from 'gulp';
import terser from 'gulp-terser';
import { publish } from 'gh-pages';
import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'node:fs';
import path from 'path';
import 'dotenv/config';
import sharp from 'sharp';
import { glob } from 'glob';

const sass = gulpSass(dartSass);
const projectRoot = process.cwd();
const cloudinaryUrlCache = new Map();
const ASSET_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.avif',
    '.gif',
    '.svg',
    '.mp4',
    '.webm',
    '.ogv',
    '.mov',
    '.avi'
]);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogv', '.mov', '.avi']);

function configureCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Faltan variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET.');
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    });
}

function getCloudinaryPublicId(localAssetPath) {
    const cloudFolder = process.env.CLOUDINARY_FOLDER?.trim() || 'festival_musica';
    const parsed = path.parse(localAssetPath);
    const relativeDir = parsed.dir === '.' ? '' : parsed.dir;
    const safeDir = relativeDir.replace(/\\/g, '/');
    const ext = parsed.ext.toLowerCase();
    const basePath = safeDir ? `${safeDir}/${parsed.name}${ext}` : `${parsed.name}${ext}`;
    return `${cloudFolder}/${basePath}`;
}

function isExternalAsset(assetPath) {
    return /^(https?:)?\/\//i.test(assetPath) || assetPath.startsWith('data:');
}

function isUploadableAsset(localAssetPath) {
    const extension = path.extname(localAssetPath).toLowerCase();
    return ASSET_EXTENSIONS.has(extension);
}

/**
 * Parte ruta (query/hash) y devuelve candidatos para localizar el archivo en disco.
 */
function collectSrcsetUrls(srcsetValue) {
    return srcsetValue
        .split(',')
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean);
}

function collectHtmlAssetPaths(htmlContent) {
    const localAssets = new Set();

    const consider = (rawPath) => {
        const assetPath = rawPath.split(/[#?]/)[0].trim();
        if (!assetPath || isExternalAsset(assetPath)) {
            return;
        }
        if (!isUploadableAsset(assetPath)) {
            return;
        }
        localAssets.add(assetPath);
    };

    const srcRegex = /\bsrc="([^"]+)"/g;
    let match;
    while ((match = srcRegex.exec(htmlContent)) !== null) {
        consider(match[1]);
    }

    const srcsetRegex = /\bsrcset="([^"]+)"/g;
    while ((match = srcsetRegex.exec(htmlContent)) !== null) {
        for (const url of collectSrcsetUrls(match[1])) {
            consider(url);
        }
    }

    return localAssets;
}

async function resolveLocalAssetPath(localAssetPath) {
    const normalized = localAssetPath.replace(/\\/g, '/');
    const direct = path.resolve(projectRoot, normalized);
    try {
        await fs.access(direct);
        return normalized;
    } catch {
        // Referencias build/img/... pueden existir solo en src/img tras copiar lógica alternativa
    }

    if (normalized.startsWith('build/img/')) {
        const asSrc = normalized.replace(/^build\/img\//, 'src/img/');
        const ext = path.extname(asSrc).toLowerCase();
        const withoutExt = asSrc.slice(0, -ext.length);
        const fallbacks = [
            asSrc,
            `${withoutExt}.jpg`,
            `${withoutExt}.jpeg`,
            `${withoutExt}.png`
        ];
        for (const candidate of fallbacks) {
            const absolute = path.resolve(projectRoot, candidate);
            try {
                await fs.access(absolute);
                return candidate;
            } catch {
                continue;
            }
        }
    }

    throw new Error(`No se encontró el asset "${localAssetPath}" para subir a Cloudinary.`);
}

function getResourceType(localAssetPath) {
    const extension = path.extname(localAssetPath).toLowerCase();
    return VIDEO_EXTENSIONS.has(extension) ? 'video' : 'image';
}

function toErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }

    if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
            return error.message;
        }

        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }

    return String(error);
}

async function resolveGalleryImagePath(kind, index, ext) {
    const folder = kind === 'thumb' ? 'thumb' : 'full';
    const candidates = [
        `src/img/gallery/${folder}/${index}.${ext}`,
        `build/img/gallery/${folder}/${index}.${ext}`
    ];

    for (const candidate of candidates) {
        try {
            await fs.access(path.resolve(projectRoot, candidate));
            return candidate;
        } catch {
            continue;
        }
    }

    return null;
}

async function ensureAssetInCloudinary(localAssetPath) {
    if (cloudinaryUrlCache.has(localAssetPath)) {
        return cloudinaryUrlCache.get(localAssetPath);
    }

    const publicId = getCloudinaryPublicId(localAssetPath);
    const absolutePath = path.resolve(projectRoot, localAssetPath);
    const resourceType = getResourceType(localAssetPath);

    try {
        const existingAsset = await cloudinary.api.resource(publicId, {
            resource_type: resourceType,
            type: 'upload'
        });
        cloudinaryUrlCache.set(localAssetPath, existingAsset.secure_url);
        return existingAsset.secure_url;
    } catch (error) {
        const isNotFound = error?.http_code === 404 || error?.error?.http_code === 404;
        if (!isNotFound) {
            throw error;
        }
    }

    const uploadedAsset = await cloudinary.uploader.upload(absolutePath, {
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false,
        use_filename: true,
        unique_filename: false
    });

    cloudinaryUrlCache.set(localAssetPath, uploadedAsset.secure_url);
    return uploadedAsset.secure_url;
}

async function htmlProd() {
    configureCloudinary();

    const sourceHtmlPath = path.resolve(projectRoot, 'index.html');
    const outputHtmlPath = path.resolve(projectRoot, 'build/index.html');
    const htmlContent = await fs.readFile(sourceHtmlPath, 'utf-8');
    const localAssets = collectHtmlAssetPaths(htmlContent);

    const assetMap = new Map();

    for (const rawAssetPath of localAssets) {
        let cloudUrl;
        try {
            const resolvedPath = await resolveLocalAssetPath(rawAssetPath);
            cloudUrl = await ensureAssetInCloudinary(resolvedPath);
        } catch (error) {
            throw new Error(`No se pudo procesar el asset HTML "${rawAssetPath}": ${toErrorMessage(error)}`);
        }

        assetMap.set(rawAssetPath, cloudUrl);
    }

    let productionHtml = htmlContent;
    const sortedAssetEntries = [...assetMap.entries()].sort((a, b) => b[0].length - a[0].length);

    for (const [localPath, cloudUrl] of sortedAssetEntries) {
        productionHtml = productionHtml.replaceAll(`src="${localPath}"`, `src="${cloudUrl}"`);
        productionHtml = productionHtml.replaceAll(`srcset="${localPath}"`, `srcset="${cloudUrl}"`);
    }

    await fs.mkdir(path.dirname(outputHtmlPath), { recursive: true });
    await fs.writeFile(outputHtmlPath, productionHtml, 'utf-8');
}

async function jsProd() {
    configureCloudinary();

    const sourceJsPath = path.resolve(projectRoot, 'src/js/app.js');
    const outputJsPath = path.resolve(projectRoot, 'build/js/app.js');
    const jsContent = await fs.readFile(sourceJsPath, 'utf-8');
    const countMatch = jsContent.match(/const\s+CANTIDAD_IMG\s*=\s*(\d+)\s*;/);

    if (!countMatch) {
        throw new Error('No se encontró CANTIDAD_IMG en src/js/app.js para generar rutas de Cloudinary.');
    }

    const cantidadImg = Number.parseInt(countMatch[1], 10);

    async function buildIndexedUrlArray(kind, ext) {
        const parts = ['null'];

        for (let i = 1; i <= cantidadImg; i++) {
            const localPath = await resolveGalleryImagePath(kind, i, ext);

            if (!localPath) {
                parts.push('null');
                continue;
            }

            try {
                const cloudUrl = await ensureAssetInCloudinary(localPath);
                parts.push(JSON.stringify(cloudUrl));
            } catch (error) {
                throw new Error(
                    `No se pudo procesar la imagen de galería (${kind}, .${ext}) "${localPath}": ${toErrorMessage(error)}`
                );
            }
        }

        return `[${parts.join(', ')}]`;
    }

    const thumbAvif = await buildIndexedUrlArray('thumb', 'avif');
    const thumbWebp = await buildIndexedUrlArray('thumb', 'webp');
    const thumbJpg = await buildIndexedUrlArray('thumb', 'jpg');
    const fullAvif = await buildIndexedUrlArray('full', 'avif');
    const fullWebp = await buildIndexedUrlArray('full', 'webp');
    const fullJpg = await buildIndexedUrlArray('full', 'jpg');

    const galleryConst = [
        `const GALERIA_THUMB_URLS_AVIF = ${thumbAvif};`,
        `const GALERIA_THUMB_URLS_WEBP = ${thumbWebp};`,
        `const GALERIA_THUMB_URLS_JPG = ${thumbJpg};`,
        `const GALERIA_FULL_URLS_AVIF = ${fullAvif};`,
        `const GALERIA_FULL_URLS_WEBP = ${fullWebp};`,
        `const GALERIA_FULL_URLS_JPG = ${fullJpg};`,
        ''
    ].join('\n');

    const replacements = [
        [/`img\/gallery\/thumb\/\$\{i\}\.avif`/g, '(GALERIA_THUMB_URLS_AVIF[i] || `img/gallery/thumb/${i}.avif`)'],
        [/`img\/gallery\/thumb\/\$\{i\}\.webp`/g, '(GALERIA_THUMB_URLS_WEBP[i] || `img/gallery/thumb/${i}.webp`)'],
        [/`img\/gallery\/thumb\/\$\{i\}\.jpg`/g, '(GALERIA_THUMB_URLS_JPG[i] || `img/gallery/thumb/${i}.jpg`)'],
        [/`img\/gallery\/full\/\$\{i\}\.avif`/g, '(GALERIA_FULL_URLS_AVIF[i] || `img/gallery/full/${i}.avif`)'],
        [/`img\/gallery\/full\/\$\{i\}\.webp`/g, '(GALERIA_FULL_URLS_WEBP[i] || `img/gallery/full/${i}.webp`)'],
        [/`img\/gallery\/full\/\$\{i\}\.jpg`/g, '(GALERIA_FULL_URLS_JPG[i] || `img/gallery/full/${i}.jpg`)']
    ];

    let productionJs = jsContent;

    for (const [pattern, replacement] of replacements) {
        productionJs = productionJs.replace(pattern, replacement);
    }

    if (productionJs === jsContent) {
        throw new Error('No se encontró ningún patrón dinámico de galería para reescritura en producción.');
    }

    productionJs = `${galleryConst}${productionJs}`;

    await fs.mkdir(path.dirname(outputJsPath), { recursive: true });
    await fs.writeFile(outputJsPath, productionJs, 'utf-8');
}

export function js(done) {
    src('src/js/app.js')
        .pipe(terser())
        .pipe(dest('build/js'));
    done();
}

export function css(done) {
    src('src/scss/app.scss', { sourcemaps: true })
        .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
        .pipe(dest('build/css', { sourcemaps: './' }));
    done();
}

export function html(done) {
    src('index.html')
        .pipe(dest('build'));
    done();
}

export async function crop(done) {
    const inputFolder = 'src/img/gallery/full';
    const outputFolder = 'src/img/gallery/thumb';
    const width = 250;
    const height = 180;

    try {
        await fs.mkdir(outputFolder, { recursive: true });

        const files = await fs.readdir(inputFolder);
        const images = files.filter((file) => /\.(jpg)$/i.test(path.extname(file)));

        await Promise.all(images.map((file) => {
            const inputFile = path.join(inputFolder, file);
            const outputFile = path.join(outputFolder, file);

            return sharp(inputFile)
                .resize(width, height, {
                    position: 'center'
                })
                .toFile(outputFile);
        }));

        done();
    } catch (error) {
        done(error);
    }
}

export async function imagenes(done) {
    const srcDir = './src/img';
    const buildDir = './build/img';
    const images = await glob('./src/img/**/*{jpg,png}');

    try {
        await Promise.all(images.map((file) => {
            const relativePath = path.relative(srcDir, path.dirname(file));
            const outputSubDir = path.join(buildDir, relativePath);
            return procesarImagenes(file, outputSubDir);
        }));
        done();
    } catch (error) {
        done(error);
    }
}

async function procesarImagenes(file, outputSubDir) {
    await fs.mkdir(outputSubDir, { recursive: true });
    const baseName = path.basename(file, path.extname(file));
    const extName = path.extname(file);
    const outputFile = path.join(outputSubDir, `${baseName}${extName}`);
    const outputFileWebp = path.join(outputSubDir, `${baseName}.webp`);
    const outputFileAvif = path.join(outputSubDir, `${baseName}.avif`);

    const options = { quality: 80 };
    await Promise.all([
        sharp(file).jpeg(options).toFile(outputFile),
        sharp(file).webp(options).toFile(outputFileWebp),
        sharp(file).avif().toFile(outputFileAvif)
    ]);
}

export async function deploy() {
    const packageJsonPath = path.resolve(projectRoot, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const releaseVersion = packageJson.version;

    await new Promise((resolve, reject) => {
        publish('build', {
            branch: 'gh-pages',
            message: `release: v${releaseVersion}`
        }, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

export function dev() {
    watch('src/scss/**/*.scss', css);
    watch('src/js/**/*.js', js);
    watch('src/img/**/*.{jpg,png}', imagenes);
    watch('index.html', html);
}

export const build = series(crop, imagenes, js, css, html);
export const buildProd = series(css, jsProd, htmlProd);
export const deploySite = series(buildProd, deploy);
export default series(build, dev);