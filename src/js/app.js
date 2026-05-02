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
        const picture = document.createElement('picture');

        const sourceAvif = document.createElement('source');
        sourceAvif.type = 'image/avif';
        sourceAvif.srcset = `img/gallery/thumb/${i}.avif`;

        const sourceWebp = document.createElement('source');
        sourceWebp.type = 'image/webp';
        sourceWebp.srcset = `img/gallery/thumb/${i}.webp`;

        const imagen = document.createElement('img');
        imagen.loading = 'lazy';
        imagen.width = '300';
        imagen.height = '200';
        imagen.src = `img/gallery/thumb/${i}.jpg`;
        imagen.alt = 'Imagen galeria';

        picture.appendChild(sourceAvif);
        picture.appendChild(sourceWebp);
        picture.appendChild(imagen);

        imagen.onclick = function() {
            mostrarImg(i);
        };

        galeria.appendChild(picture);
    }
}

function mostrarImg(i) {
    const picture = document.createElement('picture');

    const sourceAvif = document.createElement('source');
    sourceAvif.type = 'image/avif';
    sourceAvif.srcset = `img/gallery/full/${i}.avif`;

    const sourceWebp = document.createElement('source');
    sourceWebp.type = 'image/webp';
    sourceWebp.srcset = `img/gallery/full/${i}.webp`;

    const imagen = document.createElement('img');
    imagen.src = `img/gallery/full/${i}.jpg`;
    imagen.alt = 'Imagen galeria';

    picture.appendChild(sourceAvif);
    picture.appendChild(sourceWebp);
    picture.appendChild(imagen);

    const modal = document.createElement('DIV');
    modal.classList.add('modal');
    modal.onclick = cerrarModal;

    const btnCerrar = document.createElement('BUTTON');
    btnCerrar.textContent = 'X';
    btnCerrar.classList.add('btn-cerrar');
    btnCerrar.onclick = cerrarModal;

    modal.appendChild(picture);
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