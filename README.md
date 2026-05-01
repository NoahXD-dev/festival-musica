# Festival de Musica

Proyecto web estatico para practicar flujo de trabajo frontend con **Sass**, **Gulp** y **NPM**.

Incluye un pipeline para manejar multimedia en dos modos:

- Desarrollo: usa rutas locales (archivos del proyecto).
- Produccion: sube assets a Cloudinary (solo los que no existen) y reescribe rutas automaticamente en el build.

## Tecnologias

- HTML5
- Sass (SCSS)
- JavaScript
- Gulp 5
- Cloudinary (API Node)
- dotenv

## Requisitos

- Node.js (version LTS recomendada)
- npm
- Git
- GitHub CLI (`gh`) autenticado con `gh auth login`

## Instalacion

1. Clona o descarga este repositorio.
2. Instala dependencias:

```bash
npm install
```

3. (Opcional para produccion) Crea un archivo `.env` en la raiz.

Variables requeridas para build de produccion:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Variable opcional:

- `CLOUDINARY_FOLDER` (default: `festival_musica`)

## Comandos disponibles

- `npm run dev`: compila JS y CSS, y deja Gulp en modo watch para desarrollo.
- `npm run build`: genera build local (sin reescritura Cloudinary).
- `npm run build:prod`: genera build de produccion, sube assets faltantes a Cloudinary y reescribe rutas en HTML/JS.
- `npm run deploy`: ejecuta `build:prod` y publica `build/` en `gh-pages`.
- `npm run release:patch`: incrementa version patch y crea commit/tag (`vX.Y.Z`).
- `npm run release:publish`: publica rama actual y tags al remoto.
- `npm run release:github`: crea GitHub Release del tag actual con notas automaticas.
- `npm run release`: flujo completo (patch -> deploy -> push -> tag push -> GitHub Release).
- `npm run css`: ejecuta la tarea de compilacion de estilos una vez.
- `npm run sass`: compila Sass en modo watch usando el CLI de Sass.

## Estructura principal

- `index.html`: pagina principal.
- `src/scss/`: archivos fuente de estilos.
- `src/js/`: archivos fuente de JavaScript.
- `video/`: multimedia local para desarrollo (ejemplo: `video/dj.mp4`).
- `build/css/`: salida CSS compilada.
- `build/js/`: salida JS para desarrollo/produccion.
- `gulpfile.js`: tareas de automatizacion.

## Flujo de trabajo recomendado

1. Ejecuta `npm run dev`.
2. Edita archivos en `index.html`, `src/scss` y `src/js`.
3. Usa rutas locales para multimedia durante desarrollo.
4. Para release, ejecuta `npm run build:prod` (requiere `.env`).
5. Si todo esta correcto, publica con `npm run deploy`.

## Flujo de releases y tags

- El commit generado en `gh-pages` durante deploy usa formato `release: vX.Y.Z`.
- Versionado configurado en modo **SemVer patch**.
- Cada release crea:
  - commit de version en rama principal (`npm version patch`),
  - tag `vX.Y.Z`,
  - deploy en `gh-pages`,
  - GitHub Release con notas automaticas.

Comando recomendado:

```bash
npm run release
```

Si necesitas hacerlo por pasos:

```bash
npm run release:patch
npm run deploy
npm run release:publish
npm run release:github
```

## Comportamiento Cloudinary en produccion

- En `index.html`, se detectan `src="..."` locales con extensiones multimedia soportadas (`.jpg`, `.png`, `.webp`, `.mp4`, `.webm`, etc.).
- Cada asset se consulta por `public_id` en Cloudinary:
  - si existe, se reutiliza su URL,
  - si no existe, se sube y se usa la nueva URL.
- El resultado se escribe en `build/index.html`; los archivos fuente no se modifican.
- Para galeria dinamica en `src/js/app.js`:
  - se lee `CANTIDAD_IMG`,
  - se procesan rutas `img/gallery/full/{i}.jpg`,
  - se genera `build/js/app.js` con URLs Cloudinary para produccion.

Nota: si faltan imagenes locales esperadas por la galeria (`img/gallery/full/1.jpg`, etc.), `build:prod` fallara hasta que existan esos archivos o se ajuste el patron en JS.

## Autor

Noe Ramirez
