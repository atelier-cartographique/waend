/*
 * app/lib/commands/filter.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';
import debug from 'debug';
const logger = debug('waend:command:filter');


function filter (pattern, flags) {
    const self = this;
    const shell = self.shell;
    const stdin = self.sys.stdin;
    const stdout = self.sys.stdout;
    const stderr = self.sys.stderr;
    const re = new RegExp(pattern, flags);



    const resolver = (resolve, reject) => {

        let depth = 0;

        const end = () => {
            logger('end', depth);
            depth -= 1;
            if(depth <= 0){
                resolve();
            }
        };

        const runFilter = () => {
            const line = stdin.read();
            if(!!line) {
                depth += 1;
                logger('inline', depth);
                line
                    .then(data => {
                        let match = false;
                        for (let i = 0; i < data.length; i++) {
                            const str = _.result(data[i], 'toString');
                            if(str && str.match(re)){
                                match = true;
                                break;
                            }
                        }
                        if (match) {
                            stdout.write(...data);
                        }
                    })
                    .catch(err => {
                        stderr.write(err);
                    })
                    .finally(() => {
                        end();
                        runFilter();
                    });
            }
            else {
                end();
            }
        };

        runFilter();
    };

    return self.end(resolver);
}

export default {
    name: 'filter',
    command: filter
};
