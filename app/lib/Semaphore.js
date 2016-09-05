import _ from 'underscore';
import {Object as O} from '../../lib/object';


const Semaphore = O.extend({

    signal() {
        const args = _.toArray(arguments);
        this.emit(...args);
    }
    
});

const semaphore = new Semaphore();
export default semaphore;
