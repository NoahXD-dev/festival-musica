const GALERIA_CLOUDINARY_URLS = [null, "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659271/festival_musica/src/img/gallery/full/1.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659271/festival_musica/src/img/gallery/full/2.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659278/festival_musica/src/img/gallery/full/3.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659279/festival_musica/src/img/gallery/full/4.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659280/festival_musica/src/img/gallery/full/5.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659281/festival_musica/src/img/gallery/full/6.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659282/festival_musica/src/img/gallery/full/7.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659283/festival_musica/src/img/gallery/full/8.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659285/festival_musica/src/img/gallery/full/9.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659286/festival_musica/src/img/gallery/full/10.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659287/festival_musica/src/img/gallery/full/11.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659289/festival_musica/src/img/gallery/full/12.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659290/festival_musica/src/img/gallery/full/13.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659291/festival_musica/src/img/gallery/full/14.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659292/festival_musica/src/img/gallery/full/15.jpg", "https://res.cloudinary.com/di12fiqfa/image/upload/v1777659293/festival_musica/src/img/gallery/full/16.jpg"];

document.addEventListener('DOMContentLoaded', function() {
    navegacionFija();
    crearGaleria();
    resaltarEnlace();
    scrollNav();
});

function navegacionFija() {
    const header = document.querySelector('.header');
    const sobreFestival = document.querySelector('.sobre-festival');

    document.addEventListener('scroll', function() {
        if(sobreFestival.getBoundingClientRect().bottom < 1) {
            header.classList.add('fixed');
        } else {
            header.classList.remove('fixed')
        }
    });
}

function crearGaleria() {
    const CANTIDAD_IMG = 16;
    const galeria = document.querySelector('.galeria-imagenes');

    for (let i = 1; i <= CANTIDAD_IMG; i++) {
        const imagen = document.createElement('IMG');
        imagen.src = (GALERIA_CLOUDINARY_URLS[i] || `img/gallery/full/${i}.jpg`);
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

function resaltarEnlace() {
    document.addEventListener('scroll', function() {
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.navegacion-principal a');
        let actual = '';

        sections.forEach( section => {
            const sectionTop = section.offsetTop;
            const sectionHight = section.offsetHeight;

            if(window.scrollY >= (sectionTop - sectionHight / 3)) {
                actual = section.id;
            }
        });

        navLinks.forEach( link => {
            link.classList.remove('active');

            if(link.getAttribute('href') === '#'+actual) {
                link.classList.add('active');
            }
        })
    });
}

function scrollNav() {
    const navLinks = document.querySelectorAll('.navegacion-principal a');

    navLinks.forEach( link => {
        link.addEventListener('click', e => {
            e.preventDefault();

            const sectionScroll = e.target.getAttribute('href');
            const section = document.querySelector(sectionScroll);
            section.scrollIntoView({ behavior: 'smooth' });
        });
    });
}