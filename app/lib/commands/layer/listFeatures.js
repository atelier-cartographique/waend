/*
 * app/lib/commands/group/listFeatures.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import {getModelName} from '../../helpers';


function listFeatures () {
    const self = this;
    const current = self.current();
    const userId = current[0];
    const groupId = current[1];
    const layerId = current[2];
    const shell = self.shell;
    const stdout = self.sys.stdout;
    const binder = self.binder;
    const terminal = shell.terminal;

    const makeOutput = feature => terminal.makeCommand({
        fragment: feature.getDomFragment('name'),
        text: getModelName(feature),
        args: [
            `cc /${userId}/${groupId}/${layerId}/${feature.id}`,
            'gg | region set',
            'get'
        ]
    });


    const res = (resolve, reject) => {
        binder.getFeatures(userId, groupId, layerId)
            .then(features => {
                for(let i = 0; i < features.length; i++){
                    stdout.write(
                        makeOutput(features[i])
                    );
                }
                resolve();
            })
            .catch(reject);
    };
    return (new Promise(res));
}

export default {
    name: 'listFeatures',
    command: listFeatures
};
