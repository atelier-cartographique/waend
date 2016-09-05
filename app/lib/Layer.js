import Context from './Context';
import listFeatures from './commands/layer/listFeatures';
import createFeature from './commands/layer/createFeature';
import importer from './commands/layer/importer';
import styler from './commands/layer/styleWidget';



class Layer extends Context {
    constructor () {
        super(...arguments);
    }

    get name () {
        return 'group';
    }

    get commands () {
        return {
            'lf': listFeatures.command,
            'create': createFeature.command,
            'import': importer.command,
            'sl': styler.command
        };
    }
}


export default Layer;
