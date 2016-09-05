import Context from './Context';
import listGroups from './commands/user/listGroups';


class User extends Context {
    constructor () {
        super(...arguments);
    }

    get name () {
        return 'user';
    }
    get commands (){
        return {
            'lg': listGroups.command
        };
    }
}


export default User;
