/*
 * app/lib/commands/capture.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import config from '../../config';
import Transport from '../Transport';

const MEDIA_URL = config.public.mediaUrl;


// from https://github.com/ebidel/filer.js/blob/master/src/filer.js#L137
/**
 * Creates and returns a blob from a data URL (either base64 encoded or not).
 *
 * @param {string} dataURL The data URL to convert.
 * @return {Blob} A blob representing the array buffer data.
 */
function dataURLToBlob (dataURL) {
    const BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) == -1) {
      var parts = dataURL.split(',');
      var contentType = parts[0].split(':')[1];
      var raw = decodeURIComponent(parts[1]);

      return new Blob([raw], {type: contentType});
    }

    var parts = dataURL.split(BASE64_MARKER);
    var contentType = parts[0].split(':')[1];
    var raw = window.atob(parts[1]);
    const rawLength = raw.length;

    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], {type: contentType});
}


function capture () {
    const shell = this.shell;
    const env = shell.env;
    const map = env.map;
    const view = map.getView();
    const rect = view.getRect();
    const canvas = document.createElement('canvas');
    const images = [];
    let ctx;
    let data;
    let alpha;
    let idata;


    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, rect.width, rect.height);
    const previewImageData = ctx.getImageData(0, 0, rect.width, rect.height);
    data = previewImageData.data;

    view.forEachImage(imageData => {
        images.push(imageData);
    });

    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < images.length; j++) {
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

    const imgBlob = dataURLToBlob(canvas.toDataURL());

    const formData = new FormData();
    const transport = new Transport();

    formData.append('media', imgBlob, `map_capture-${_.now()}.png`);

    return transport.post(MEDIA_URL, {
        'headers' : {
            'Content-Type': false //'multipart/form-data'
        },
        'body': formData
    });
}

export default {
    name: 'capture',
    command: capture
};
