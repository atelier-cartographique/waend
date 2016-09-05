import Context from './Context';
import getGeometry from './commands/feature/getGeometry';
import setGeometry from './commands/feature/setGeometry';
import styleWidget from './commands/feature/styleWidget';



class Feature extends Context {
    constructor () {
        super(...arguments);
    }
    
    get name () {
        return 'group';
    }

    get commands () {
        return {
            'gg' : getGeometry.command,
            'sg' : setGeometry.command,
            'sf': styleWidget.command
        };
    }
}


export default Feature;
