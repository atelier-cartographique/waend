/*
 * app/lib/commands/layer/createFeature.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var Geometry = require('../Geometry');

function close (sGeom) {
    var self = this,
        env = self.shell.env,
        binder = self.binder,
        stdout = self.sys.stdout,
        stdin = self.sys.stdin,
        terminal = self.shell.terminal,
        current = self.current(),
        uid = current[0],
        gid = current[1],
        lid = current[2],
        geom;


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
        var coords = geom.getCoordinates();
        coords.push(coords[0]);
        var poly = new Geometry.Polygon([coords]);
        return this.end(poly);
    }
    else{
        return this.end(geom);
    }
    return this.end();
}



module.exports = exports = {
    name: 'close',
    command: close
};
