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
    Promise = require("bluebird"),
    readline = require('readline');


var Console = Terminal.extend({

    capabilities: {
        'tty': {}
    },

    setTitle: function (title) {
        this.title = title || this.title;
        this.rl.setPrompt(this.title + this.prompt);
    },

    write: function () {
        var line = ''
        for(var i=0; i < arguments.length; i++){
            var fragment = arguments[i];
            line += fragment + ' ';
        }
        console.log(line);
    },

    makeCommand: function (options) {
        var l = ' => [' + options.args.join(' ') + ']';
        return (options.text + l);
    },

    read: function (prompt) {
        var self = this;
        self.reading = true;
        prompt = prompt || ': ';
        this.rl.setPrompt(prompt);

        var resolver = function (resolve, reject) {
            self.rl.on('line', function(line) {
                resolve(line);
                self.reading = false;
                self.setTitle();
                self.rl.prompt();
            });
        };

        return (new Promise(resolver));
    },

    start: function () {
        this.title = '';
        this.prompt = '@wænd> ';
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this.rl.setPrompt(this.title + this.prompt);

        var self = this;
        
        self.rl.on('line', function(line) {
            if(self.reading){return;}
            var toks = self.commandLineTokens(line.trim());
            if(toks.length > 0){
                self.shell.exec(toks)
                    .then(function(){
                        // console.log.apply(console, arguments);
                    })
                    .catch(function(err){
                        console.error(err.toString());
                    })
                    .finally(function(){
                        self.rl.prompt();
                    });
            }
            else{
                self.rl.prompt();
            }
            
        });

        self.rl.on('close', function() {
            console.log('Bye');
            process.exit(0);
        });

        self.shell.on('error', function(err){
            console.error(err.toString());
        });

        self.rl.prompt();
    }
});


module.exports = exports = Console;
