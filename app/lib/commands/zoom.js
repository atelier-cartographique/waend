/*
 * app/lib/commands/zoom.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import region from '../Region';


function bufferRegion (arg) {
    const extent = region.get();

    const newExtent = extent.buffer(parseFloat(arg || 0));
    region.push(newExtent);
    return this.end(newExtent);
}

export default {
    name: 'zoom',
    command: bufferRegion
};
