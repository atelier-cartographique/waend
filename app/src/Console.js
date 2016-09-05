/*
 * app/lib/Console.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



import Terminal from '../lib/Terminal';

import Promise from "bluebird";
import readline from 'readline';


const Console = Terminal.extend({

    capabilities: {
        'tty': {}
    },

    setTitle(title) {
        this.title = title || this.title;
        this.rl.setPrompt(this.title + this.prompt);
    },

    write() {
        let line = '';

        for (const fragment of arguments) {
            line += `${fragment} `;
        }

        logger(line);
    },

    makeCommand(options) {
        const l = ` => [${options.args.join(' ')}]`;
        return (options.text + l);
    },

    input(fdin, prompt) {
        const self = this;
        self.reading = true;
        prompt = prompt || ': ';
        this.rl.setPrompt(prompt);

        self.rl.on('line', line => {
            fdin.write(line);
            self.reading = false;
            self.setTitle();
            self.rl.prompt();
        });
    },

    start() {
        this.title = '';
        this.prompt = '@wænd> ';
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this.rl.setPrompt(this.title + this.prompt);

        const self = this;


        self.rl.on('line', line => {
            if(self.reading){return;}
            const cl = line.trim();
            if(cl.length > 0){
                self.shell.exec(cl)
                    .then(() => {
                        // logger.apply(console, arguments);
                    })
                    .catch(err => {
                        console.error(err.toString());
                    })
                    .finally(() => {
                        self.rl.prompt();
                    });
            }
            else{
                self.rl.prompt();
            }

        });

        self.rl.on('close', () => {
            logger('Bye');
            process.exit(0);
        });

        self.shell.stdout('data', self.write, self);
        self.shell.stderr('data', err => {
            console.error('[error]'. err.toString());
        });

        self.rl.prompt();
    }
});


export default Console;
