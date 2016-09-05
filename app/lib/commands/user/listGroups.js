/*
 * app/lib/commands/user/listGroups.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import {getModelName, addClass, emptyElement} from '../../helpers';

function listGroups () {
    const self = this;
    const userId = self.data.id;
    const shell = self.shell;
    const stdout = self.sys.stdout;
    const binder = self.binder;
    const terminal = self.shell.terminal;

    const makeOutput = group => terminal.makeCommand({
        fragment: group.getDomFragment('name'),
        text: getModelName(group),
        args: [
            `cc /${userId}/${group.id}`,
            'get'
        ]
    });

    const res = (resolve, reject) => {
        binder.getGroups(userId)
            .then(groups => {
                for(let i = 0; i < groups.length; i++){
                    stdout.write(
                        makeOutput(groups[i])
                    );
                }
                resolve();
            })
            .catch(reject);
    };
    return (new Promise(res));
}

export default {
    name: 'listGroups',
    command: listGroups
};
