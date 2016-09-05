/*
 * app/lib/commands/logout.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import Transport from '../Transport';

import Promise from 'bluebird';
import config from '../../config';

function logout () {
    const self = this;
    const transport = new Transport();
    const shell = self.shell;


    const resolver = (resolve, reject) => {
        transport.post(config.public.logoutUrl, {
            body: {}
        })
            .then(() => {
                shell.logoutUser();
                resolve();
            })
            .catch(reject);
    };

    return (new Promise(resolver));
}


export default {
    name: 'logout',
    command: logout
};
