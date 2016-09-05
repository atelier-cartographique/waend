import Context from './Context';
import listLayers from './commands/group/listLayers';
import createLayer from './commands/group/createLayer';
import visible from './commands/group/visible';



class Group extends Context {
    constructor () {
        super(...arguments);
    }

    get name () {
        return 'group';
    }

    get commands (){
        return {
            'll': listLayers.command,
            'visible': visible.command,
            'mklayer': createLayer.command
        };
    }
}


export default Group;
