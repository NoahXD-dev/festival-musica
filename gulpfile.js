import gulpSass from 'gulp-sass';
import * as dartSass from 'sass';
import { src, dest, watch, series } from 'gulp';
import { publish } from 'gh-pages';
import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

const sass = gulpSass(dartSass);
const projectRoot = process.cwd();
const cloudinaryUrlCache = new Map();
const ASSET_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
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
    const basePath = safeDir ? `${safeDir}/${parsed.name}` : parsed.name;
    return `${cloudFolder}/${basePath}`;
}

function isExternalAsset(assetPath) {
    return /^(https?:)?\/\//i.test(assetPath) || assetPath.startsWith('data:');
}

function isUploadableAsset(localAssetPath) {
    const extension = path.extname(localAssetPath).toLowerCase();
    return ASSET_EXTENSIONS.has(extension);
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
    const assetRegex = /src="([^"]+)"/g;
    const localAssets = new Set();
    let match;

    while ((match = assetRegex.exec(htmlContent)) !== null) {
        const assetPath = match[1];
        if (!isExternalAsset(assetPath) && isUploadableAsset(assetPath)) {
            localAssets.add(assetPath);
        }
    }

    const assetMap = new Map();

    for (const localAssetPath of localAssets) {
        let cloudUrl;
        try {
            cloudUrl = await ensureAssetInCloudinary(localAssetPath);
        } catch (error) {
            throw new Error(`No se pudo procesar el asset HTML "${localAssetPath}": ${toErrorMessage(error)}`);
        }

        assetMap.set(localAssetPath, cloudUrl);
    }

    let productionHtml = htmlContent;
    for (const [localPath, cloudUrl] of assetMap.entries()) {
        productionHtml = productionHtml.replaceAll(`src="${localPath}"`, `src="${cloudUrl}"`);
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
    const galleryUrls = ['null'];

    for (let i = 1; i <= cantidadImg; i++) {
        const localPath = `src/img/gallery/full/${i}.jpg`;
        let cloudUrl;

        try {
            cloudUrl = await ensureAssetInCloudinary(localPath);
        } catch (error) {
            throw new Error(`No se pudo procesar la imagen dinámica "${localPath}": ${toErrorMessage(error)}`);
        }

        galleryUrls.push(JSON.stringify(cloudUrl));
    }

    const galleryConst = `const GALERIA_CLOUDINARY_URLS = [${galleryUrls.join(', ')}];\n\n`;
    const dynamicPattern = /`img\/gallery\/full\/\$\{i\}\.jpg`/g;
    let productionJs = jsContent.replace(dynamicPattern, '(GALERIA_CLOUDINARY_URLS[i] || `img/gallery/full/${i}.jpg`)');

    if (productionJs === jsContent) {
        throw new Error('No se encontró el patrón dinámico de galería para reescritura en producción.');
    }

    productionJs = `${galleryConst}${productionJs}`;

    await fs.mkdir(path.dirname(outputJsPath), { recursive: true });
    await fs.writeFile(outputJsPath, productionJs, 'utf-8');
}

export function js(done) {
    src('src/js/app.js')
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
    watch('index.html', html);
}

export const build = series(js, css, html);
export const buildProd = series(css, jsProd, htmlProd);
export const deploySite = series(buildProd, deploy);
export default series(build, dev);