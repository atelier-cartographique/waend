import _ from 'underscore';
import Context from './Context';
import * as commands from './commands';

class Root extends  Context {
    constructor () {
        super(...arguments);
    }

    get name () {
        return 'shell';
    }

    get commands () {
        const val = {};
        for (let k in commands) {
            const c = commands[k];
            val[c.name] = c.command;
        }
        return val;
    }
}


export default Root;
