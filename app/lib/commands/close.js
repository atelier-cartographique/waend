/*
 * app/lib/commands/layer/createFeature.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import Geometry from '../Geometry';

function close (sGeom) {
    const self = this;
    const env = self.shell.env;
    const binder = self.binder;
    const stdout = self.sys.stdout;
    const stdin = self.sys.stdin;
    const terminal = self.shell.terminal;
    const current = self.current();
    const uid = current[0];
    const gid = current[1];
    const lid = current[2];
    let geom;


    try { // args
        geom = Geometry.format.GeoJSON.read(sGeom);
    }
    catch (err) {
        try{ // stdout
            geom = Geometry.format.GeoJSON.read(self.sys.stdout.readSync());
        }
        catch (err) {
            try { // env
                if (env.DELIVERED
                    && env.DELIVERED.toGeoJSON) {
                    geom = env.DELIVERED;
                }
                else {
                    geom = Geometry.format.GeoJSON.read(env.DELIVERED); // if this last one throws, well, means we can stop
                }
            }
            catch (err) {
                throw (err);
            }
        }

    }

    if ('LineString' === geom.getType()) {
        const coords = geom.getCoordinates();
        coords.push(coords[0]);
        const poly = new Geometry.Polygon([coords]);
        return this.end(poly);
    }
    else{
        return this.end(geom);
    }
    return this.end();
}



export default {
    name: 'close',
    command: close
};
