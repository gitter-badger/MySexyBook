var elixir = require('laravel-elixir');

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

elixir(function(mix) {
    mix
    .less('mysexybook.less', 'public/assets/css/mysexybook.css')
    .less('mysexybook-opening.less', 'public/assets/css/mysexybook-opening.css')
    .scriptsIn('resources/assets/js', 'public/assets/js/mysexybook.js')
    .copy('resources/assets/js/libs', 'public/assets/js/libs');
});
