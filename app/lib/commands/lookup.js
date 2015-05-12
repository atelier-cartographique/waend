/*
 * app/lib/commands/lookup.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    Promise = require('bluebird'),
    config = require('../../../config'),
    Transport = require('../Transport');

var API_URL = config.public.apiUrl;


function lookup (term) {
    if (!term) {
        return this.endWithError('this command expect a term to lookup argument');
    }
    var self = this,
        stdout = self.sys.stdout,
        shell = self.shell,
        terminal = shell.terminal;

    var resolver = function (resolve, reject) {
        var transport = new Transport();
        var success = function (data) {
            if('results' in data) {
                for (var i = 0; i < data.results.length; i++) {
                    var result = data.results[i],
                        props = result.properties,
                        name = props.name || result.id,
                        ctxPath = '/' + result.user_id + '/' + result.id;

                    var cmd0 = terminal.makeCommand({
                        'args' : [
                            'cc ' + ctxPath,
                            'get'
                        ],
                        'text' : name
                    });
                    stdout.write(cmd0);
                }
                resolve(data.medias);
            }
            else {
                reject(new Error('NothingFound'));
            }
        };
        var error = function (err) {
            reject(err);
        };
        transport
            .get(API_URL + '/group/' + term)
            .then(success)
            .catch(error);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'lookup',
    command: lookup
};