/*
 * app/lib/commands/echo.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';


function echo () {
    const self = this;
    const shell = self.shell;
    const args = (arguments.length >  0) ? _.toArray(arguments) : self.sys.stdout.readSync();
    const e = !!args ? args.join(' ') : '';

    self.sys.stdout.write(e);
    return self.end(e);
}

export default {
    name: 'echo',
    command: echo
};