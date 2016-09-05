/*
 * app/lib/commands/lookup.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import Promise from 'bluebird';
import config from '../../config';
import Transport from '../Transport';

const API_URL = config.public.apiUrl;


function lookup (term) {
    if (!term) {
        return this.endWithError('this command expect a term to lookup argument');
    }
    const self = this;
    const stdout = self.sys.stdout;
    const shell = self.shell;
    const terminal = shell.terminal;

    const resolver = (resolve, reject) => {
        const transport = new Transport();
        const success = data => {
            if('results' in data) {
                const groups = {};
                for (var i = 0; i < data.results.length; i++) {
                    var result = data.results[i];
                    if (!(result.id in groups)) {
                        groups[result.id] = {
                            model: result,
                            score: 1
                        };
                    }
                    else {
                        groups[result.id].score += 1;
                    }
                }
                const og = _.values(groups);
                og.sort((a, b) => b.score - a.score);
                for (var i = 0; i < og.length; i++) {
                    const result = og[i].model;
                    const score = og[i].score;
                    const props = result.properties;
                    const name = props.name || result.id;
                    const ctxPath = `/${result.user_id}/${result.id}`;

                    const cmd0 = terminal.makeCommand({
                        'args' : [
                            `cc ${ctxPath}`,
                            'get'
                        ],
                        'text' : `${name} (${score})`
                    });
                    stdout.write(cmd0);
                }
                resolve(data.medias);
            }
            else {
                reject(new Error('NothingFound'));
            }
        };
        const error = err => {
            reject(err);
        };
        transport
            .get(`${API_URL}/group/${term}`)
            .then(success)
            .catch(error);
    };

    return (new Promise(resolver));
}


export default {
    name: 'lookup',
    command: lookup
};
