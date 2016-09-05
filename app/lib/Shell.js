import EventEmitter from 'events';
import _ from 'underscore';
import url from 'url';
import Context from './Context';
import User from './User';
import Root from './Root';
import Group from './Group';
import Layer from './Layer';
import Feature from './Feature';
import {get as getBinder} from './Bind';
import Stream from './Stream';
import region from './Region';
import semaphore from './Semaphore';
import debug from 'debug';
const logger = debug('waend:Shell');


const SHELL = 0;
const USER = 1;
const GROUP = 2;
const LAYER = 3;
const FEATURE = 4;

const hasHistory = ((typeof window !== 'undefined') && window.history && window.history.pushState);
const FRAGMENT_ROOT = ((typeof window !== 'undefined') && window.FRAGMENT_ROOT) ?
                    window.FRAGMENT_ROOT :
                    '/map/';


function getCliChunk (chars, start, endChar) {
    let chunk = '';
    for (let i = start; i < chars.length; i++) {
        const c = chars[i];
        if(endChar === c){
            break;
        }
        chunk += c;
    }
    return chunk;
}

function cliSplit (str) {
    const chars = str.trim().split('');
    const ret = [];
    for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        let chunk;
        if ('"' === c) {
            chunk = getCliChunk(chars, i + 1, '"');
            i += chunk.length + 1;
            ret.push(chunk);
        }
        else if ("'" === c) {
            chunk = getCliChunk(chars, i + 1, "'");
            i += chunk.length + 1;
            ret.push(chunk);
        }
        else if (' ' !== c) {
            chunk = getCliChunk(chars, i, ' ');
            i += chunk.length;
            ret.push(chunk);
        }
    }

    return ret;
}

// some tests, i keep them around for whatever reason
// var tests = [
//     ['cmd arg', 2],
//     ['cmd arg0 arg1', 3],
//     ['cmd "arg0 arg1"', 2],
//     ['cmd \'"arg0 arg1" arg2\' arg3', 3],
//     ['cmd "\'arg0 arg1 arg2\' arg3" arg4', 3],
//     ['cmd "\'arg0 arg1 arg2\' arg3" "arg4 arg5"', 3],
// ];

// for (var i = 0; i < tests.length; i++) {
//     var str = tests[i][0];
//     var check = tests[i][1];
//     var splitted = split(str)
//     logger('<'+str+'>', check, splitted.length, splitted);
// }

function getUrl () {
    const purl = url.parse(window.location.href);
    const queryString = purl.query;

    if (queryString) {
        purl.query = {};
        _.each(queryString.split('&'), pair => {
            const spair = pair.split('=');
            purl.query[spair[0]] = window.decodeURIComponent(spair[1]);
        });
    }

    // backbone based
    const trailingSlash = /\/$/;
    const routeStripper = /^[#\/]|\s+$/g;
    let fragment = purl.pathname;
    const root = FRAGMENT_ROOT.replace(trailingSlash, '');
    if (!fragment.indexOf(root)) {
        fragment = fragment.substr(root.length);
    }
    fragment.replace(routeStripper, '');
    let path = fragment.split('/');
    while(path.length > 0 && 0 === path[0].length) {
        path = path.slice(1);
    }
    purl.fragment = fragment;
    purl.comps = path;
    return purl;
}

function ShellError () {
    if(arguments.length > 0){
        console.error(...arguments);
    }
}

ShellError.prototype = Object.create(Error.prototype);

const defaultDescriptor = {
    enumerable: false,
    configurable: false,
    // writable: false
};

class Shell extends EventEmitter {

    constructor (terminal) {
        super();
        this.historyStarted = false;
        this._contexts = new Array(5);
        this._contexts[SHELL] = new Root({shell:this});
        this._currentContext = SHELL;
        this.initStreams();

        this.env = {};
        this.terminal = terminal;

        semaphore.on('please:shell:context', this.switchContext, this);
        if (typeof window !== 'undefined') {
            this.initHistory();
        }
    }


    initHistory() {
        if (hasHistory) {
            const popStateCallback = function () {
                this.historyPopContext(...arguments);
            };
            window.onpopstate = popStateCallback;
        }

        const purl = getUrl();
        let startPath;
        if ((purl.fragment.length > 0) && (purl.comps.length > 0)) {
            let after = _.noop;
            startPath = purl.comps;
            if (purl.query && 'c' in purl.query) {
                const command = purl.query.c;
                const comps = purl.comps;
                let pre;
                if (comps.length === FEATURE) {
                    pre = 'gg | region set';
                }
                after = () => {
                    if (pre) {
                        this.exec(pre);
                    }
                    this.exec(command);
                };
            }
            else if (purl.comps.length === FEATURE) {
                after = () => {
                    this.exec('gg | region set');
                };
            }
            this.historyPushContext(purl.comps).then(after);
        }
        this.historyStarted = startPath;
        this.emit('history:start', startPath);
    }

    historyPopContext(event) {
        if (event.state) {
            this.switchContext(event.state);
        }
    }

    historyPushContext(opt_path, opt_title) {
        if (hasHistory) {
            const trailingSlash = /\/$/;
            const root = FRAGMENT_ROOT;
            window.history.pushState(
                opt_path,
                opt_title || '',
                root + opt_path.join('/')
            );
        }
        return this.switchContext(opt_path);
    }

    initStreams() {

        const streams = {
            stdin: new Stream(),
            stdout: new Stream(),
            stderr: new Stream()
        };

        Object.defineProperty(this, 'stdin', _.defaults({
            get() {
                return streams.stdin;
            },
        }, defaultDescriptor));

        Object.defineProperty(this, 'stdout', _.defaults({
            get() {
                return streams.stdout;
            },
        }, defaultDescriptor));

        Object.defineProperty(this, 'stderr', _.defaults({
            get() {
                return streams.stderr;
            },
        }, defaultDescriptor));

        this._streams = streams;

    }

    commandLineTokens(cl) {
        return cliSplit(cl);
    }


    makePipes(n) {
        const pipes = [];

        for (let i = 0; i < n; i++) {
            const sys = {
                'stdin': (new Stream()),
                'stdout': (new Stream()),
                'stderr': this.stderr
            };
            pipes.push(sys);
        }

        const concentrator = {
            'stdin': (new Stream()),
            'stdout': (new Stream()),
            'stderr': this.stderr
        };

        pipes.push(concentrator);

        concentrator.stdin.on('data', function(){
            this.stdout.write(...arguments);
        }, this);

        return pipes;
    }

    execOne(cl) {
        const toks = this.commandLineTokens(cl.trim());
        const context = this._contexts[this._currentContext];

        try {
            const sys = {
                'stdin': this.stdin,
                'stdout': this.stdout,
                'stderr': this.stderr
            };
            const args = [sys].concat(toks);
            return context.exec(...args)
                .then(result => {
                    this.env.DELIVERED = result;
                    return Promise.resolve(result);
                });
        }
        catch (err) {
            this.env.DELIVERED = err;
            return Promise.reject(err);
        }
    }

    execMany(cls) {
        const context = this._contexts[this._currentContext];
        const pipes = this.makePipes(cls.length);

        const pipeStreams = (s, t) => {

            s.stdout.on('data', function(){
                t.stdin.write(...arguments);
            });

            s.stdin.on('data', function(){
                t.stdout.write(...arguments);
            });

            // var directions = [
            //     ['stdout', 'stdin'],
            // ];

            // _.each(directions, function(stdnames){
            //     var sourceStream = s[stdnames[0]],
            //         targetStream = t[stdnames[1]];
            //     sourceStream.on('data', function(){
            //         targetStream.write.apply(targetStream, arguments);
            //     });
            // });
        };

        return Promise.reduce(cls, (total, item, index) => {
            this.env.DELIVERED = total;
            const cl = cls[index].trim();
            const toks = this.commandLineTokens(cl);
            const args = [pipes[index]].concat(toks);
            // if(index > 0){
            //     _.each(['stdin', 'stdout', 'stderr'], function(name){
            //         pipes[index - 1][name].close();
            //     });
            // }
            pipeStreams(pipes[index], pipes[index + 1]);
            return context.exec(...args);
        }, 0);
    }

    exec(cl) {
        const cls = cl.trim().split('|');
        // shall be called, but not doing it exposes weaknesses, which is good at this stage
        // this.stdin.dump();
        // this.stdout.dump();
        // this.stderr.dump();
        this.env.DELIVERED = null;
        if(1 === cls.length){
            return this.execOne(cls[0]);
        }
        return this.execMany(cls);
    }

    clearContexts() {
        const start = this._currentContext + 1;
        let i;
        for(i = start; i < this._contexts.length; i++){
            this._contexts[i] = null;
        }
        const path = [];
        for(i = 1; i < start; i++){
            path.push(this._contexts[i].data.id);
        }
        for (i = 0; i < this.postSwitchCallbacks.length; i++) {
            const cb = this.postSwitchCallbacks[i];
            cb();
        }
        semaphore.signal('shell:change:context', this._currentContext, path);
    }

    switchContext(pathComps) {
        this.postSwitchCallbacks = [];
        if(0 === pathComps.length){
            this._currentContext = SHELL;
            this.clearContexts();
            return Promise.resolve(0, 'shell');
        }
        else if(1 === pathComps.length){
            return this.loadUser(pathComps);
        }
        else if(2 === pathComps.length){
            return this.loadGroup(pathComps);
        }
        else if(3 === pathComps.length){
            return this.loadLayer(pathComps);
        }
        else if(4 === pathComps.length){
            return this.loadFeature(pathComps);
        }
    }

    getUserId(userName) {
        if('me' === userName){
            if(this.user){
                return this.user.id;
            }
            throw (new Error("you're not logged in"));
        }
        return userName;
    }

    getUser() {
        return this.user;
    }

    setUser(userId) {
        const bind = getBinder();

        const prm = bind.getUser(userId)
            .then(userData => {
                this._contexts[USER] = new User({
                    shell:this,
                    data:userData,
                    parent:this._contexts[SHELL]
                });
                this._currentContext = USER;
                this.clearContexts();
                return Promise.resolve(this);
            })
            .catch(err => {
                console.error('failed to switch context', err);
            });

        return prm;
    }

    setGroup(groupId) {
        const user = this._contexts[USER].data;
        const bind = getBinder();

        const prm = bind.getGroup(user.id, groupId)
            .then(groupData => {
                this._contexts[GROUP] = new Group({
                    shell:this,
                    data:groupData,
                    parent:this._contexts[USER]
                });
                this._currentContext = GROUP;
                if (this._previousGroup !== groupId) {
                    // here we check if a region set should happen
                    this._previousGroup = groupId;
                    if (groupData.has('extent')) {
                        // it should be an array [minx, miny, maxx, maxy];
                        const extent = groupData.get('extent');
                        this.postSwitchCallbacks.push(() => {
                            semaphore.once('layer:update:complete', () => {
                                region.push(extent);
                            });
                        });
                    }
                }
                this.clearContexts();
                return Promise.resolve(this);
            })
            .catch(err => {
                console.error('failed to switch context', err);
            });

        return prm;
    }

    setLayer(layerId) {
        const user = this._contexts[USER].data;
        const group = this._contexts[GROUP].data;
        const bind = getBinder();

        const prm = bind.getLayer(user.id, group.id, layerId)
            .then(layerData => {
                this._contexts[LAYER] = new Layer({
                    shell:this,
                    data:layerData,
                    parent:this._contexts[GROUP]
                });
                this._currentContext = LAYER;
                this.clearContexts();
                return Promise.resolve(this);
            })
            .catch(err => {
                console.error('failed to switch context', err);
            });

        return prm;
    }

    setFeature(featureId) {
        const user = this._contexts[USER].data;
        const group = this._contexts[GROUP].data;
        const layer = this._contexts[LAYER].data;
        const bind = getBinder();

        const prm = bind.getFeature(user.id, group.id, layer.id, featureId)
            .then(featureData => {
                this._contexts[FEATURE] = new Feature({
                    shell:this,
                    data:featureData,
                    parent:this._contexts[LAYER]
                });
                this._currentContext = FEATURE;
                this.clearContexts();
                return Promise.resolve(this);
            })
            .catch(err => {
                console.error('failed to switch context', err);
            });

        return prm;
    }

    loadUser(path) {
        //logger('shell.loadUser', path);
        try {
            const userName = this.getUserId(path[0]);
            return this.setUser(userName);
        }
        catch (err) {
            return Promise.reject('invalid user id');
        }

    }

    loadGroup(path) {
        const userName = this.getUserId(path[0]);
        const groupName = path[1];
        const getGroup = _.bind(_.partial(this.setGroup, groupName), this);

        return this.setUser(userName)
            .then(getGroup);
    }

    loadLayer(path) {
        const userName = this.getUserId(path[0]);
        const groupName = path[1];
        const layerName = path[2];
        const getGroup = _.bind(_.partial(this.setGroup, groupName), this);
        const getLayer = _.bind(_.partial(this.setLayer, layerName), this);

        return this.setUser(userName)
            .then(getGroup)
            .then(getLayer);
    }

    loadFeature(path) {
        const userName = this.getUserId(path[0]);
        const groupName = path[1];
        const layerName = path[2];
        const featureName = path[3];
        const getGroup = _.bind(_.partial(this.setGroup, groupName), this);
        const getLayer = _.bind(_.partial(this.setLayer, layerName), this);
        const getFeature = _.bind(_.partial(this.setFeature, featureName), this);

        return this.setUser(userName)
            .then(getGroup)
            .then(getLayer)
            .then(getFeature);
    }

    loginUser (u) {
        this.user = u;
        semaphore.signal('user:login', u);

        const next = startPath => {
            if (!startPath) {
                this.switchContext([u.id]);
            }
        };

        if (this.historyStarted !== false) {
            next(this.historyStarted);
        }
        else {
            this.once('history:start', next);
        }
    }

    logoutUser() {
        this.user = null;
        semaphore.signal('user:logout');
    }

}


export default Shell;
