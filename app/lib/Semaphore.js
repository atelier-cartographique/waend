import _ from 'underscore';
import EventEmitter from 'events';


class Semaphore extends EventEmitter {
    constructor () {
        super();
        this.setMaxListeners(256);
    }

    signal () {
        this.emit(...arguments);
    }

}

const semaphore = new Semaphore();
export default semaphore;
