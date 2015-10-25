/*
 * routes/media.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    fs = require('fs'),
    slugify = require('../lib/slugify'),
    magick = require('imagemagick-native');


var STEPS =
[ 4,
  8,
  16,
  32,
  64,
  128,
  256,
  512,
  1024
  ];

var STEPS_SZ = STEPS.length;

function processFile (rootDir, file, done) {
    console.log('processFile', file);
    var fileDir = path.join(rootDir, file.slug),
        processed = 0;

    var fileWritten = function (err) {
        processed += 1;
        if (processed === STEPS_SZ) {
            done(file.slug);
        }
    };

    var fileConverted = function (step, err, buffer) {
        console.log('fileConverted', processed);
        processed += 1;
        if (err) { return; }
        fs.writeFile(path.join(fileDir, step + '.png'), buffer, fileWritten);
    };

    var fileRed = function (err, data) {
        console.log('fileRed');
        if (err) {
            return done(false);
        }
        for (var i = 0; i < STEPS_SZ; i++) {
            magick.convert({
                'srcData': data,
                'width': STEPS[i],
                'height': STEPS[i],
                'resizeStyle': 'aspectfit',
                'format': 'PNG',
                'strip': true
            }, _.partial(fileConverted, STEPS[i]));
        }
    };

    var dirDone = function (err, made) {
        console.log('dirDone', err);
        if (err) {
            return done(false);
        }

        fs.readFile(file.path, fileRed);
    };

    mkdirp(fileDir, null, dirDone);
}

function uploadMedia (request, response) {
    console.log('uploadMedia');
    if (request.files
        && ('media' in request.files)
        && (request.files.media.length > 0)) {
        var medias = request.files.media,
            mediaDir = request.config.mediaDir,
            user = request.user,
            rootDir = path.join(mediaDir, user.id),
            filesCount = medias.length,
            urls = [];

            var fileDone = function (url) {
                console.log('fileDone', url);
                filesCount -= 1;
                urls.push('/media/' + user.id +'/'+ url);
                if (filesCount === 0) {
                    response
                        .status(201)
                        .send({'urls': urls});
                }
            };

            for (var i = 0; i < medias.length; i++) {
                var media = medias[i],
                    ext = path.extname(media.originalname),
                    name = path.basename(media.originalname, ext);
                media.slug = slugify(name);
                processFile(rootDir, media, fileDone);
            }
    }
}


function listMedia (request, response) {
    var userDir = path.basename(request.params.user_id),
        rootDir = path.join(request.config.mediaDir, userDir);

    var success = function (err, files) {
        if (err) {
            return response.status(404).end();
        }
        response.send({'medias': files});
    };
    fs.readdir(rootDir, success);
}


function getStep (sz) {
    for (var i = STEPS_SZ - 1; i >= 0; i--) {
        if (sz >= STEPS[i]) {
            return i;
        }
    }
    return STEPS_SZ - 1;
}

function getMedia (request, response) {
    var size = parseInt(request.params.size),
        step = getStep(size),
        userDir = path.basename(request.params.user_id),
        mediaName = path.basename(request.params.media_name),
        rootDir = path.join(request.config.mediaDir, userDir, mediaName);

        console.log('getMedia', size, step);
        response.sendFile(path.join(rootDir, STEPS[step] + '.png'));
}

module.exports = exports = function(router, app){

    // GETs
    router.get('/media/:user_id', listMedia);
    router.get('/media/:user_id/:media_name/:size', getMedia);

    // POSTs
    router.post('/media',  function(request, response){
        if (request.isAuthenticated()) {
            uploadMedia(request, response);
        }
        else {
            response.sendStatus(403);
        }
    });
};
