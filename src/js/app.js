document.addEventListener('DOMContentLoaded', function() {
    crearGaleria()
});

function crearGaleria() {
    const CANTIDAD_IMG = 16;
    const galeria = document.querySelector('.galeria-imagenes');

    for (let i = 1; i <= CANTIDAD_IMG; i++) {
        const imagen = document.createElement('IMG');
        imagen.src = `src/img/gallery/full/${i}.jpg`;
        imagen.alt = 'Imagen galeria';

        // Event handler
        imagen.onclick = function() {
            mostrarImg(i);
        }

        galeria.appendChild(imagen);
    }
}

function mostrarImg(i) {
    const imagen = document.createElement('IMG');
    imagen.src = `src/img/gallery/full/${i}.jpg`;
    imagen.alt = 'Imagen galeria';

    const modal = document.createElement('DIV');
    modal.classList.add('modal');
    modal.onclick = cerrarModal;

    const btnCerrar = document.createElement('BUTTON');
    btnCerrar.textContent = 'X';
    btnCerrar.classList.add('btn-cerrar');
    btnCerrar.onclick = cerrarModal;

    modal.appendChild(imagen);
    modal.appendChild(btnCerrar);

    const body = document.querySelector('body');
    body.classList.add('overFlow-hiden');
    body.appendChild(modal);
}

function cerrarModal() {
    const modal = document.querySelector('.modal');
    modal.classList.add('fade-out');

    setTimeout(() => {
        modal?.remove();

        const body = document.querySelector('body');
        body.classList.remove('overFlow-hiden');
    }, 500);
}