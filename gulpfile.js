var elixir  = require('laravel-elixir'),
gulp    = require('gulp'),
htmlmin = require('gulp-htmlmin');

/*
|--------------------------------------------------------------------------
| Elixir Asset Management
|--------------------------------------------------------------------------
|
| Elixir provides a clean, fluent API for defining some basic Gulp tasks
| for your Laravel application. By default, we are compiling the Sass
| file for our application, as well as publishing vendor resources.
|
*/

elixir.extend('compress', function() {
    new elixir.Task('compress', function() {
        return gulp.src('./storage/framework/views/*')
        .pipe(htmlmin({
            collapseWhitespace:    true,
            removeAttributeQuotes: true,
            removeComments:        true,
            minifyJS:              true,
        }))
        .pipe(gulp.dest('./storage/framework/views/'));
    })
    .watch('./storage/framework/views/*');
});

elixir(function(mix) {
    mix
    .less('mysexybook.less', 'public/assets/css/mysexybook.css')
    .less('mysexybook-opening.less', 'public/assets/css/mysexybook-opening.css')
    .scriptsIn('resources/assets/js', 'public/assets/js/mysexybook.js')
    .copy('resources/assets/js/libs', 'public/assets/js/libs')
    .compress();
});

elixir(function(mix) {
    mix.compress();
});
