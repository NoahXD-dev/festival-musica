import gulpSass from 'gulp-sass';
import * as dartSass from 'sass';
import { src, dest, watch, series } from 'gulp';
import { publish } from 'gh-pages';

const sass = gulpSass(dartSass);

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

export function images(done) {
    src('src/img/**/*')
        .pipe(dest('build/img'));
    done();
}

export function video(done) {
    src('video/**/*')
        .pipe(dest('build/video'));
    done();
}

export function deploy(done) {
    publish('build', {
        branch: 'gh-pages',
    }, done);
}

export function dev() {
    watch('src/scss/**/*.scss', css);
    watch('src/js/**/*.js', js);
    watch('index.html', html);
    watch('src/img/**/*', images);
    watch('video/**/*', video);
}

export const build = series(js, css, html, images, video);
export const deploySite = series(build, deploy);
export default series(build, dev);