/*
 * app/lib/commands/media.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    Promise = require('bluebird'),
    config = require('../../../config'),
    Transport = require('../Transport');

var MEDIA_URL = config.public.mediaUrl;

function setupDropZone (container) {
    var dropbox = document.createElement('canvas');
    dropbox.style.width = '100%';
    dropbox.style.height = '100%';
    dropbox.backgroundColor = 'transparent';
    container.appendChild(dropbox);
    return dropbox;
}


function listMedia () {
    var self = this,
        stdout = self.sys.stdout,
        shell = self.shell,
        user = shell.user,
        terminal = shell.terminal;

    if (!user) {
        return self.endWithError('you are not logged in');
    }

    var resolver = function (resolve, reject) {
        var transport = new Transport();
        var success = function (data) {
            if('medias' in data) {
                for (var i = 0; i < data.medias.length; i++) {
                    var m = data.medias[i];
                    var cmd = terminal.makeCommand({
                        'args' : ['media show ' + m],
                        'text' : m
                    });
                    stdout.write(cmd);
                }
                resolve(data.medias);
            }
            else {
                reject(new Error('empty set'));
            }
        };
        var error = function (err) {
            console.error(err);
            reject(err);
        };
        transport
            .get(MEDIA_URL + '/' + user.id)
            .then(success)
            .catch(error);
    };

    return (new Promise(resolver));
}


function uploadMedia () {
    var self = this,
        shell = self.shell,
        terminal = shell.terminal,
        display = terminal.display(),
        dropbox = setupDropZone(display.node);

        var resolver = function (resolve, reject) {
            var dragenter = function (e) {
              e.stopPropagation();
              e.preventDefault();
            };

            var dragover = function (e) {
              e.stopPropagation();
              e.preventDefault();
            };

            var drop = function (e) {
              e.stopPropagation();
              e.preventDefault();

              var dt = e.dataTransfer;
              var files = dt.files;

              handleFiles(files);
            };

            var handleFiles = function (files) {
                var formData = new FormData(),
                    transport = new Transport();
                for (var i = 0; i < files.length; i++) {
                    formData.append('media', files[i]);
                }



                transport.post(MEDIA_URL, {
                    'headers' : {
                        'Content-Type': false //'multipart/form-data'
                    },
                    'body': formData
                })
                .then(resolve)
                .catch(reject)
                .finally(function(){
                    display.end();
                });

            };

            dropbox.addEventListener("dragenter", dragenter, false);
            dropbox.addEventListener("dragover", dragover, false);
            dropbox.addEventListener("drop", drop, false);
        };

        return (new Promise(resolver));
}


function showMedia (mediaName) {
    var self = this,
        shell = self.shell,
        user = shell.user,
        terminal = shell.terminal;

    if (!user) {
        return self.endWithError('you are not logged in');
    }

    var display = terminal.display(),
        img = document.createElement('img');
    display.node.appendChild(img);
    img.setAttribute('src', MEDIA_URL + '/' +
                            user.id + '/' +
                            mediaName + '?size=2000');

    var resolver = function (resolve) {
        var close = function () {
            display.end();
            resolve(0);
        };
        display.node.setAttribute('tabindex', -1);
        display.node.focus();
        display.node.addEventListener('keydown', close, true);
    };
    return (new Promise(resolver));
}

function media () {
    var args = _.toArray(arguments),
        action = args.shift();

    if('list' === action){
        return listMedia.apply(this, args);
    }
    else if('upload' === action){
        return uploadMedia.apply(this, args);
    }
    else if('show' === action){
        return showMedia.apply(this, args);
    }
    return this.endWithError('not a valid action');
}


module.exports = exports = {
    name: 'media',
    command: media
};