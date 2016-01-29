'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
// var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var less = require('gulp-less');
var path = require('path');

gulp.task('map', function () {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: './app/src/wmap.js',
    debug: true
  });

  return b.bundle()
    .pipe(source('wmap.js'))
    .pipe(buffer())
    // .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        // .pipe(uglify())
        // .on('error', gutil.log)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./bin/'));
});

gulp.task('view', function () {

  var b = browserify({
    entries: './app/src/wview.js',
    debug: true
  });

  return b.bundle()
    .pipe(source('wview.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./bin/'));
});

gulp.task('worker', function () {

  var b = browserify({
    entries: './app/src/libworker.js',
    debug: true
  });

  return b.bundle()
    .pipe(source('libworker.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./bin/'));
});


gulp.task('style', function(){
    return gulp.src('./styles/waend.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'styles') ]
    }))
    .pipe(gulp.dest('./styles/'));
});

gulp.task('default', ['map', 'view', 'worker', 'style']);
gulp.task('dev', ['map', 'style']);
