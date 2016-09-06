import _ from 'underscore';
import Context from './Context';


class Root extends  Context {
    constructor () {
        super(...arguments);
    }

    get name () {
        return 'shell';
    }

    get commands () {
        return {};
    }

}


export default Root;
