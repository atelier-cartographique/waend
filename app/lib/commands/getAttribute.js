import _ from 'underscore';
import {addClass, emptyElement} from '../helpers';


function getAttr () {
    const self = this;
    const shell = self.shell;
    const stdout = shell.stdout;
    const terminal = shell.terminal;
    const args = _.toArray(arguments);
    const key = args.shift();
    const sys = self.sys;

    const makeOutput = (k, model) => {
        const wrapper = document.createElement('div');
        const key = document.createElement('div');
        const value = model.getDomFragment(k);

        addClass(key, 'key-value');

        key.appendChild(
            document.createTextNode(k.toString())
        );

        wrapper.appendChild(key);
        wrapper.appendChild(value);


        return terminal.makeCommand({
            fragment: wrapper,
            text: k.toString()
        });
    };

    const result = key ? self.data.get(key) : self.data.getData();
    const keys = key ? [key] : _.keys(self.data.getData());

    _.each(keys, key => {
        stdout.write(makeOutput(key, self.data));
    });

    return self.end(result);
}


export default {
    name: 'get',
    command: getAttr
};
