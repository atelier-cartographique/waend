/*
 * app/lib/Terminal.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var O = require('../../lib/object').Object;


var argsRe = /'[^']*'|"[^"]*"|\S+/g ;


var Terminal = O.extend({

    commandLineTokens: function (cl) {
        var args = cl.match(argsRe);
        var cleanedArgs = [];
        for(var i = 0; i < args.length; i++){
            cleanedArgs.push(args[i].replace(/"/g,""));
        }
        return cleanedArgs;
    },

});

module.exports = exports = Terminal;