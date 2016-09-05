/*
 * app/lib/commands/layer/createFeature.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


// var Promise = require('bluebird'),
//     region = require('../Region');

import Geometry from '../../Geometry';

function createFeature (sGeom) {
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
        geom = JSON.parse(sGeom);
    }
    catch (err) {
        try { // env
            if (env.DELIVERED
                && (env.DELIVERED instanceof Geometry.Geometry)) {
                geom = env.DELIVERED.toGeoJSON();
            }
            else {
                geom = JSON.parse(env.DELIVERED); // if this last one throws, well, means we can stop
            }
        }
        catch (err) {
            throw (err);
        }

    }

    const data = {
        'user_id': uid,
        'layer_id': lid,
        'properties': {},
        'geom': geom
    };

    return binder.setFeature(uid, gid, lid, data)
        .then(model => {
            const cmd = terminal.makeCommand({
                args: [`cc /${uid}/${gid}/${lid}/${model.id}`],
                text: model.id
            });
            stdout.write('created feature ', cmd);
            return self.end(model);
        });
}



export default {
    name: 'create',
    command: createFeature
};
