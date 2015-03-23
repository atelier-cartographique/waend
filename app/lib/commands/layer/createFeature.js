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

function createFeature (sGeom) {
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
        geom = JSON.parse(sGeom);
    }
    catch (err) {
        try{ // stdout
            sGeom = JSON.parse(self.sys.stdout.readSync());
            geom = JSON.parse(sGeom);
            if (!('type' in geom)) {
                throw (new Error('not a geometry'));
            }
        }
        catch (err) { 
            try { // env
                if (env.DELIVERED 
                    && env.DELIVERED.toGeoJSON) {
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

    }

    var data = {
        'user_id': uid,
        'layer_id': lid,
        'properties': {},
        'geom': geom
    }

    return binder.setFeature(uid, gid, lid, data)
        .then(function(model){
            var cmd = terminal.makeCommand({
                args: ['cc', '/'+uid+'/'+gid+'/'+lid+'/'+model.id],
                text: model.id
            });
            stdout.write('created feature ', cmd);
            return self.end(model);
        });
};



module.exports = exports = {
    name: 'create',
    command: createFeature
};