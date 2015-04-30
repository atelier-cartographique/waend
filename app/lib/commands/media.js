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
                    var imageUrl = MEDIA_URL + '/' + user.id+'/'+m + '?size=200';
                    var wrapper = document.createElement('div');
                    var style = [
                        'width:200px;',
                        'height:200px;',
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
        dropbox = setupDropZone(display.node);

    stdout.write('<span class="hint first-hint-line">Drag and Drop your media on the map to upload it</span>');
    stdout.write('<span class="hint">Many formats are supported so, please try !</span>');

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
        mediaId = user.id + '/' + mediaName,
        mediaUrl = MEDIA_URL + '/' + mediaId + '?size=2000',
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
                    var imageUrl = MEDIA_URL + '/' + mid + '?size=200';
                    var pwrapper = document.createElement('div');
                    var style = [
                        'width:200px;',
                        'height:200px;',
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
