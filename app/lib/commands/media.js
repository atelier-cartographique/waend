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
    var dropbox = document.createElement('div'),
        dropboxLabel = document.createElement('div');
    dropbox.setAttribute('class', 'importer-dropzone');
    dropboxLabel.setAttribute('class', 'importer-dropzone-label');

    dropboxLabel.innerHTML = '<span>-UPLOAD MEDIAS-</span><br><span>Drag & drop your images here,</span><br><span>or select a file</span>';

    dropbox.appendChild(dropboxLabel);
    container.appendChild(dropbox);
    return dropbox;
}

function setupInput (container) {
    var input = document.createElement('input'),
        inputWrapper = document.createElement('div');
    inputWrapper.setAttribute('class', 'importer-input-wrapper');
    input.setAttribute('class', 'importer-input');
    input.setAttribute('type', 'file');
    container.appendChild(input);
    return input;
}


function setupCancel (container) {
    var cancel = document.createElement('div');
    cancel.setAttribute('class', 'importer-cancel');
    cancel.innerHTML = '<a>cancel</a>';
    container.appendChild(cancel);
    return cancel;
}

function setupHints (container) {
    var hints = document.createElement('div');
    hints.setAttribute('class', 'importer-hints');
    hints.innerHTML = [
        '<span class="hint">You can import multiple files at once</span><br><span class="hint">Many images formats are supported, just try !</span>'
    ].join(' ');
    container.appendChild(hints);
}


function listMedia () {
    var self = this,
        stdout = self.sys.stdout,
        shell = self.shell,
        user = shell.user,
        terminal = shell.terminal,
        document = window.document;

    if (!user) {
        return self.endWithError('you are not logged in');
    }

    var resolver = function (resolve, reject) {
        var transport = new Transport();
        var success = function (data) {
            if('medias' in data) {
                for (var i = 0; i < data.medias.length; i++) {
                    var m = data.medias[i];
                    var imageUrl = MEDIA_URL + '/' + user.id+'/'+m + '/256';
                    var wrapper = document.createElement('div');
                    var style = [
                        'width:256px;',
                        'height:256px;',
                        'background-position: center center;',
                        'background-size: cover;',
                        'background-repeat: no-repeat;',
                        'background-image:url("'+imageUrl+'")'
                    ];
                    wrapper.setAttribute('style', style.join(''));
                    var cmd0 = terminal.makeCommand({
                        'args' : ['media show ' + m],
                        'fragment' : wrapper
                    });
                    // var cmd1 = terminal.makeCommand({
                    //     'args' : ['set image ' + user.id+'/'+m],
                    //     'text' : 'attach to current feature'
                    // });
                    stdout.write(cmd0);
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
        stdout = shell.stdout,
        terminal = shell.terminal,
        display = terminal.display(),
        dropbox = setupDropZone(display.node),
        input = setupInput(display.node),
        cancel = setupCancel(display.node);

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

            // Select
            input.addEventListener('change', function (e) {
                (function () {
                    handleFiles(input.files[0],
                        resolve, reject);
                })();
            }, false);

            // Cancel
            cancel.addEventListener('click', function () {
                display.end();
                reject('Cancel');
            }, false);
        };

        setupHints(display.node);

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
        mediaId = user.id + '/' + mediaName,
        mediaUrl = MEDIA_URL + '/' + mediaId + '/1024',
        wrapper = document.createElement('div'),
        closer = document.createElement('div');

    wrapper.setAttribute('class', 'media-wrapper');
    wrapper.setAttribute('style', 'background-image:url("'+mediaUrl+'");');
    closer.setAttribute('class', 'media-close');
    closer.innerHTML = ' close ';

    wrapper.appendChild(closer);
    display.node.appendChild(wrapper);

    var resolver = function (resolve, reject) {
        var close = function () {
            display.end();
            resolve(mediaId);
        };
        closer.addEventListener('click', close, false);
    };

    return (new Promise(resolver));
}

function pickMedia () {
    var self = this,
        shell = self.shell,
        user = shell.user,
        terminal = shell.terminal;

    if (!user) {
        return self.endWithError('you are not logged in');
    }

    var display = terminal.display(),
        wrapper = document.createElement('div'),
        closer = document.createElement('div');

    wrapper.setAttribute('class', 'media-wrapper');
    closer.setAttribute('class', 'media-close');
    closer.innerHTML = ' close ';

    wrapper.appendChild(closer);
    display.node.appendChild(wrapper);

    var resolver = function (resolve, reject) {

        var picker = function (mid) {
            return function (e) {
                display.end();
                resolve(mid);
            };
        };

        var close = function () {
            display.end();
            reject('NothingPicked');
        };

        var success = function (data) {
            if('medias' in data) {
                for (var i = 0; i < data.medias.length; i++) {
                    var m = data.medias[i];
                    var mid = user.id+'/'+m;
                    var imageUrl = MEDIA_URL + '/' + mid + '/256';
                    var pwrapper = document.createElement('div');
                    var style = [
                        'width:256px;',
                        'height:256px;',
                        'background-position: center center;',
                        'background-size: cover;',
                        'background-repeat: no-repeat;',
                        'background-image:url("'+imageUrl+'")'
                    ];
                    pwrapper.setAttribute('style', style.join(''));
                    pwrapper.setAttribute('class', 'media-pick-item');
                    pwrapper.addEventListener('click', picker(mid), false);

                    wrapper.appendChild(pwrapper);
                }

            }
            else {
                reject(new Error('empty set'));
            }
        };

        var error = function (err) {
            console.error(err);
            reject(err);
        };

        var transport = new Transport();
        transport
            .get(MEDIA_URL + '/' + user.id)
            .then(success)
            .catch(error);

        closer.addEventListener('click', close, false);
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
    else if('pick' === action){
        return pickMedia.apply(this, args);
    }
    return this.endWithError('not a valid action');
}


module.exports = exports = {
    name: 'media',
    command: media
};
