import gulpSass from 'gulp-sass';
import * as dartSass from 'sass';
import { src, dest, watch, series } from 'gulp';
import { publish } from 'gh-pages';

const sass = gulpSass(dartSass);

export function js( done ) {
    src('src/js/app.js')
        .pipe( dest('build/js') )

    done();
}

export function css( done ) {
    src('src/scss/app.scss', { sourcemaps: true } )
        .pipe( sass().on('error', sass.logError) )
        .pipe( dest('build/css', { sourcemaps: './' }) );

    done();
}

export function html( done ) {
    src('src/*.html')
        .pipe(dest('build'));
    done();
}

export function deploy( done ) {
    publish('build', {
        branch: 'gh-pages',
    }, done);
}

export function dev() {
    watch('src/scss/**/*.scss', css);
    watch('src/js/**/*.js', js);
    watch('src/*.html', html);
}

export default series(js, css, html, dev);