'use strict'
const gulp = require('gulp')
const del = require('del');
const templateCache = require('gulp-angular-templatecache')
const minifyHtml = require('gulp-minify-html')
const concat = require('gulp-concat')
const uglify = require('gulp-uglify')
const rename = require('gulp-rename')
const ngannotate = require('gulp-ng-annotate')
const closure = require('gulp-jsclosure')
const p = require('path')
const runSequence = require('run-sequence');
var cssnano = require('gulp-cssnano');
var deleteLines = require('gulp-delete-lines');
var useref = require('gulp-useref');
var gulpif = require('gulp-if');
var inject = require('gulp-inject');

const jsFilePaths = [
	'app/*.js',
	'app/directives/**/*.js',
	'app/services/*.js', 
	'app/controllers/*.js'
];

const jsLibFilePaths = [
	"node_modules/jquery/dist/jquery.min.js",
	"node_modules/jQuery.print/jQuery.print.js",
	"node_modules/moment/min/moment.min.js",
	"node_modules/bootstrap/dist/js/bootstrap.min.js",
	"node_modules/eonasdan-bootstrap-datetimepicker-npm/build/js/bootstrap-datetimepicker.min.js",
	"node_modules/angular/angular.min.js",
	"node_modules/angular-route/angular-route.min.js",
	"node_modules/angular-animate/angular-animate.min.js",
	"node_modules/angular-aria/angular-aria.min.js",
	"node_modules/angular-messages/angular-messages.min.js",
	"node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js",
	"node_modules/angular-file-upload/dist/angular-file-upload.min.js",
	"node_modules/mdPickers/dist/mdPickers.min.js",
	"node_modules/clipboard/dist/clipboard.min.js",
	"node_modules/ngclipboard/dist/ngclipboard.min.js",
	"node_modules/angular-local-storage/dist/angular-local-storage.min.js",
	"node_modules/ms-signalr-client/jquery.signalR.min.js",
	"node_modules/angular-signalr-hub/signalr-hub.min.js"
]

const cssFilePaths = [
	"node_modules/bootstrap/dist/css/bootstrap-theme.css",
	"node_modules/bootstrap/dist/css/bootstrap.css",
	"node_modules/font-awesome/css/font-awesome.css",
	"app/content/styles/style.css",
	"app/content/styles/sidebar.css",
	"app/content/component/loadinSnake/loading-snake.css",
	"app/content/component/sk-cube/sk-cube.css",
	"app/content/component/spinner/spinner.css",
	"node_modules/eonasdan-bootstrap-datetimepicker-npm/build/css/bootstrap-datetimepicker.min.css"
]

gulp.task('clean', function (cb) {
	del(['dist']).then(function (paths) {
		console.log('Deleted files and folders:\n', paths.join('\n'));
        cb();
	});
});


gulp.task('bundle', function () {
	//first load the services, then the directives and then the controller
	return gulp.src(jsFilePaths)			
			.pipe(ngannotate())
			.pipe(concat('main.js'))
			.pipe(uglify())
			.pipe(rename({suffix: '.min'}))
			.pipe(gulp.dest('dist/app'));
})


gulp.task('bundle-css', function(){
	return gulp.src(cssFilePaths)
		.pipe(cssnano())
		.pipe(concat('style.min.css'))
		.pipe(gulp.dest('dist/app'));
})


gulp.task('bundle-libs', function(){
	return gulp.src(jsLibFilePaths)
		.pipe(concat('lib.js'))
		.pipe(uglify())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('dist/app'));
});


gulp.task('copy-assets', function(){
	return gulp.src(['app/content/**/**/*'])
			.pipe(gulp.dest('dist/app/content/'))
});


gulp.task('copy-templates', function(){
	return gulp.src('app/views/**/*')
		.pipe(gulp.dest('dist/app/views/'))
});

gulp.task('remove-js-css', function(){
	return gulp.src('index.html')
			.pipe(deleteLines({
				'filters': [
					/<script\s+type=["']text\/javascript["']\s+src=/i
				]
			}))
			.pipe(deleteLines({
				'filters': [
					/<link\s+rel=["']/i
				]
			}))			
			.pipe(gulp.dest('dist/'))
})

gulp.task('inject-index', function(){
	var bundlesSources = gulp.src(['./dist/app/**.css', './dist/app/**.js'], {read: false});
	

	return gulp.src('/dist/index.html')
				.pipe(inject(bundlesSources, { ignorePath: 'dist' }))							
				.pipe(gulp.dest('dist/'));				
});



gulp.task('build', function(callback){
	runSequence('clean', 
				'bundle','bundle-libs', 
				'bundle-css', 
				'copy-assets', 
				'copy-templates', 
				'remove-js-css', 
				'inject-index', 
				callback);
});

