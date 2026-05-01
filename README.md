# Festival de Musica

Proyecto web estatico para practicar flujo de trabajo frontend con **Sass**, **Gulp** y **NPM**.

## Tecnologias

- HTML5
- Sass (SCSS)
- JavaScript
- Gulp 5

## Requisitos

- Node.js (version LTS recomendada)
- npm

## Instalacion

1. Clona o descarga este repositorio.
2. Instala dependencias:

```bash
npm install
```

## Comandos disponibles

- `npm run dev`: compila JS y CSS, y deja Gulp en modo watch para desarrollo.
- `npm run css`: ejecuta la tarea de compilacion de estilos una vez.
- `npm run sass`: compila Sass en modo watch usando el CLI de Sass.

## Estructura principal

- `index.html`: pagina principal.
- `src/scss/`: archivos fuente de estilos.
- `src/js/`: archivos fuente de JavaScript.
- `build/css/`: salida CSS compilada.
- `build/js/`: salida JS copiada para produccion/desarrollo.
- `gulpfile.js`: tareas de automatizacion.

## Flujo de trabajo recomendado

1. Ejecuta `npm run dev`.
2. Edita archivos en `src/scss` y `src/js`.
3. Revisa los cambios generados en `build/`.

## Autor

Noe Ramirez
