document.addEventListener('DOMContentLoaded', function() {
    crearGaleria()
});

function crearGaleria() {
    const CANTIDAD_IMG = 16;
    const galeria = document.querySelector('.galeria-imagenes');

    for (let i = 1; i <= CANTIDAD_IMG; i++) {
        const imagen = document.createElement('IMG');

        imagen.src = `src/img/gallery/full/${i}.jpg`
        imagen.alt = 'Imagen galeria'

        galeria.appendChild(imagen);
    }
}