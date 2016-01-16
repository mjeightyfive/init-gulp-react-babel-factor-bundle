'use strict';

var gulp = require('gulp'),
    del = require('del'),
    sequence = require('run-sequence'),
    browserify = require('browserify'),
    browserSync = require('browser-sync'),
    watchify = require('watchify'),
    bundler = require('gulp-watchify-factor-bundle'),
    path = require('path'),
    buffer = require('vinyl-buffer'),
    assign = require('lodash.assign');

var $ = require('gulp-load-plugins')();

var fixtures = path.resolve.bind(path, __dirname),
    reload = browserSync.reload,
    live = $.util.env.live || false,
    production = $.util.env.production || false,
    watch = $.util.env.watch || false,
    bs = $.util.env.bs || false;

var paths = {
    // root: 'web',
    app: 'app',
    dist: 'dist',
    bower: 'bower_components'
};

var files = {
    css: [
        // vendor / bower css files.
    ],
    scss: paths.app + '/scss/**/*.scss',
    js: [
        // bower javascript files
        // paths.bower + '/jquery/dist/jquery.js',
        // app javascript files
        // paths.app + '/js/app.js'
    ],
    entries: [
        paths.app + '/js/index.js',
        paths.app + '/js/about.js',
    ],
    outputs: [
        'index.js',
        'about.js'
    ],
    fonts: [
        paths.app + '/fonts/**/*',

    ],
    images: [
        paths.app + '/images/**/*'
    ],
    extras: [
        paths.app + '/favicon.ico',
        paths.app + '/apple-touch-icon-precomposed.png'
    ]
};

var autoprefixerBrowsers = [
    'ie >= 9',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
];

gulp.task('clean', del.bind(null, [paths.dist]));

gulp.task('default', ['clean'], function() {

    if(production) {
        live = true;
        sequence(['build']);
    } else if(live && !bs) {
        sequence(['build'], 'watch');
    } else if(bs) {
        sequence(['build'], 'serve', 'watch');
    } else if(watch) {
        sequence(['build'], 'watch');
    } else {
        sequence(['build']);
    }
});


gulp.task('build', [
    'styles',
    'scripts',
    'html',
    'fonts',
    'images',
    'extras'
]);

gulp.task('html', function() {
    gulp.src(paths.app + '/**/*.html')
        .pipe(gulp.dest(paths.dist));
});

gulp.task('styles', function() {
    gulp.src(files.scss)
        .pipe($.if(!live, $.newer(files.scss)))
        .pipe($.if(!live, $.sourcemaps.init()))
        .pipe($.sass({
            sourceMap: true
        })
            .on('error', function(err) {
                $.util.log('Sass error: ', $.util.colors.red(err.message));
                $.util.beep();
                this.emit('end');
            }))
        .pipe($.if(live, $.cssnano()))
        .pipe(gulp.dest(paths.dist + '/css'))
        .pipe($.autoprefixer({
            browsers: autoprefixerBrowsers
        }))
        .pipe($.if(!live, $.sourcemaps.write()))
        .pipe($.if(!live, reload({
            stream: true
        })));
});

var resolvedPathsEntries = [],
    resolvedPathsOutputs = [];

files.entries.forEach(function(entry) {
    resolvedPathsEntries.push(fixtures(entry));
});

files.outputs.forEach(function(output) {
    resolvedPathsOutputs.push(output);
});

gulp.task('scripts', function() {
    var customOpts = {
        entries: resolvedPathsEntries,
        debug: !live && !production
    };

    var opts = assign({}, watchify.args, customOpts);
    var b;

    if(bs) {
        b = watchify(browserify(opts));
    } else {
        b = browserify(opts);
    }

    b.transform('babelify', {
        presets: ['es2015', 'react']
    });

    var bundle = bundler(b, {
        entries: resolvedPathsEntries,
        outputs: resolvedPathsOutputs,
        common: 'core.js'
    },
        // more transforms. Should always return a stream.
        function(bundleStream) {

            return bundleStream
                .on('error', $.util.log.bind($.util, 'Browserify Error'))
                .pipe(buffer())
                .pipe($.if(!live, $.sourcemaps.init({
                    loadMaps: true
                })))
                .pipe($.if(live, $.uglify()))
                .pipe($.if(!live, $.sourcemaps.write()))
                .pipe(gulp.dest(paths.dist + '/js'));
        }
    );

    // var bundle = function() {
    //     return b.bundle()
    //         .on('error', $.util.log.bind($.util, 'Browserify Error'))
    //         .pipe(source('./js/scripts.js'))
    //         .pipe(vinylbuffer())
    //         .pipe($.if(!live, $.sourcemaps.init({
    //             loadMaps: true
    //         })))
    //         .pipe($.if(live, $.uglify()))
    //         .pipe($.if(!live, $.sourcemaps.write()))
    //         .pipe(gulp.dest(paths.dist))
    //         .pipe($.if(!production, browserSync.reload({
    //             stream: true
    //         })));
    // };

    b.on('log', $.util.log);

    if(!live && !production) {
        b.on('update', bundle);
    }

    return bundle();

});

gulp.task('fonts', function() {
    return gulp.src(files.fonts)
        .pipe(gulp.dest(paths.dist + '/fonts'));
});

gulp.task('images', function() {
    return gulp.src(files.images)
        .pipe($.cached($.imagemin({
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest(paths.dist + '/images'));
});

gulp.task('extras', function() {
    gulp.src(files.extras)
        .pipe(gulp.dest(paths.dist));
});

gulp.task('serve', function() {
    browserSync({
        open: false,
        notify: false,
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        // proxy: 'website.dev',
        server: {
            baseDir: paths.dist
        },
        port: 3000
    });
});

gulp.task('watch', function() {
    gulp.watch(paths.app + '/**/*.html', ['html', reload]);
    gulp.watch(files.scss, ['styles', reload]);
    gulp.watch([files.fonts], ['fonts', reload]);
    gulp.watch([files.images], ['images', reload]);
});
