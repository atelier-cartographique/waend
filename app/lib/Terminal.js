import {Object as O} from '../../lib/object';
import Shell from '../lib/Shell';


const Terminal = O.extend({


    capabilities: {},

    constructor() {
        this.shell = new Shell(this);
        O.apply(this, arguments);
    },

    getCapabilities() {
        return Object.keys(this.capabilities);
    },

    start() { throw (new Error('Not Implemented')); },
    makeCommand() { throw (new Error('Not Implemented')); },
    setTitle() { throw (new Error('Not Implemented')); }

});

export default Terminal;