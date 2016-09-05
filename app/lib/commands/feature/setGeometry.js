/*
 * app/lib/commands/feature/setGeometry.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

import _ from 'underscore';

import Geometry from '../../Geometry';

function setGeometry (geoJSON) {
    const self = this;
    const feature = self.data;
    let geom;

    if (geoJSON) {
        try {
            const data = JSON.parse(geoJSON);
            geom = new Geometry.Geometry(data);
        }
        catch (err) {
            return this.endWithError(err);
        }
    }
    else {
        geom = self.shell.env.DELIVERED;
    }


    return feature.setGeometry(geom);
    // sys.stdout.write(geom.format(format));
    // return self.end(feature);
}


export default {
    name: 'setGeometry',
    command: setGeometry
};
