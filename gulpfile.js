var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var less = require('gulp-less');
var cssmin = require('gulp-cssmin');

gulp.task('less', function() {
	return gulp.src('public/css/mysexybook.less')
		.pipe(less())
		.pipe(concat('mysexybook.min.css'))
		.pipe(cssmin())
		.pipe(gulp.dest('public/css/'));
});

gulp.task('js', function() {
	return gulp.src(['public/js/prototypes.js', 'public/js/mysexybook.js'])
		.pipe(concat('mysexybook.min.js'))
		.pipe(uglify({preserveComments: 'some'}))
		.pipe(gulp.dest('public/js/'));
});

gulp.task('watch', function() {
	gulp.watch('public/css/*.less', ['less']);
	gulp.watch(['public/js/prototypes.js', 'public/js/mysexybook.js'], ['js']);
});

gulp.task('default', ['watch']);