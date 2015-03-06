/*
 * app/lib/Console.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



var Terminal = require('../lib/Terminal'),
    readline = require('readline');


var Console = Terminal.extend({

    capabilities: {
        'tty': {}
    },

    write: function (fragment) {
        console.log(fragment);
    },

    makeCommand: function (options) {
        var l = ' => ['+options.cmd;
        if('args' in options){
            for(var i = 0; i < options.args.length; i++){
                l += ' '+options.args[i];
            }
        }
        l += ']';

        return (options.text + l);
    },

    start: function () {
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.setPrompt('wænd> ');

        var self = this;
        
        rl.on('line', function(line) {
            var toks = self.commandLineTokens(line.trim());
            if(toks.length > 0){
                self.emit('input', toks);
            }
            rl.prompt();
        });

        rl.on('close', function() {
            console.log('Bye');
            process.exit(0);
        });

        self.shell.on('error', function(err){
            console.error(err.toString());
        });

        rl.prompt();
    }
});


module.exports = exports = Console;
