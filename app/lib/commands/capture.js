/*
 * app/lib/commands/capture.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    config = require('../../../config'),
    Transport = require('../Transport');

var MEDIA_URL = config.public.mediaUrl;


// from https://github.com/ebidel/filer.js/blob/master/src/filer.js#L137
  /**
   * Creates and returns a blob from a data URL (either base64 encoded or not).
   *
   * @param {string} dataURL The data URL to convert.
   * @return {Blob} A blob representing the array buffer data.
   */
function dataURLToBlob (dataURL) {
    var BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) == -1) {
      var parts = dataURL.split(',');
      var contentType = parts[0].split(':')[1];
      var raw = decodeURIComponent(parts[1]);

      return new Blob([raw], {type: contentType});
    }

    var parts = dataURL.split(BASE64_MARKER);
    var contentType = parts[0].split(':')[1];
    var raw = window.atob(parts[1]);
    var rawLength = raw.length;

    var uInt8Array = new Uint8Array(rawLength);

    for (var i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], {type: contentType});
};


function capture () {
    var shell = this.shell,
        env = shell.env,
        map = env.map,
        view = map.getView(),
        rect = view.getRect(),
        canvas = document.createElement('canvas'),
        images = [],
        ctx, data, alpha, idata;


    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, rect.width, rect.height);
    var previewImageData = ctx.getImageData(0, 0, rect.width, rect.height);
    data = previewImageData.data;

    view.forEachImage(function(imageData){
        images.push(imageData);
    });

    for (var i = 0; i < data.length; i += 4) {
        for (var j = 0; j < images.length; j++) {
            idata = images[j].data;
            alpha = idata[i + 3] / 255,
                r = i,
                g = i + 1,
                b = i + 2;
            if (alpha > 0) {
                data[r] = (data[r] * (1 - alpha)) + (idata[r] * alpha);
                data[g] = (data[g] * (1 - alpha)) + (idata[g] * alpha);
                data[b] = (data[b] * (1 - alpha)) + (idata[b] * alpha);
            }
        }
    }
    ctx.putImageData(previewImageData, 0, 0);

    var imgBlob = dataURLToBlob(canvas.toDataURL());

    var formData = new FormData(),
        transport = new Transport();

    formData.append('media', imgBlob, 'map_capture-'+ _.now() + '.png');

    return transport.post(MEDIA_URL, {
        'headers' : {
            'Content-Type': false //'multipart/form-data'
        },
        'body': formData
    });

}

module.exports = exports = {
    name: 'capture',
    command: capture
};
