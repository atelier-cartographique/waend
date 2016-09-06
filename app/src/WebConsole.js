/*
 * app/src/WebConsole.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

import _ from 'underscore';
import reduce from 'promise-reduce';
import {get as getBinder} from '../lib/Bind';
import Terminal from '../lib/Terminal';
import semaphore from '../lib/Semaphore';
import Mutex from '../lib/Mutex';
import buttons from './Buttons';
import Geometry from '../lib/Geometry';
import {addClass, removeClass, emptyElement,
    removeElement, hasClass, toggleClass,
    px, eventPreventer, getModelName,
    reducePromise} from '../lib/helpers';

const document = window.document;

const titleTypes = ['shell', 'user', 'group', 'layer', 'feature'];

class WebCommand {
    constructor(term, options) {
        this.term = term;
        this.args = options.args;
        this.text = options.text;
        this.fragment = options.fragment;
        this.attributes = options.attributes;
    }

    toString() {
        return this.text.toString();
    }

    onClick() {
        const term = this.term;
        const args = this.args;
        const cb = event => {
            event.preventDefault();
            reducePromise(args, (t, i, index) => {
                    const arg = args[index];
                    return term.runCommand(arg);
                }, 0)
                .catch(err => {
                    console.error(err);
                });
        };
        return cb;
    }

    toDomFragment() {
        if (this.fragment) {
            if (this.args) {
                this.fragment.addEventListener('click', this.onClick(), false);
            }
            return this.fragment;
        }
        const element = document.createElement('a');
        const textElement = document.createTextNode(this.text.toString());
        if (!!this.attributes) {
            for (const k in this.attributes) {
                element.setAttribute(k, this.attributes[k]);
            }
        }
        else {
            element.setAttribute('class', 'wc-command');
            element.setAttribute('title', this.args.join(' '));
        }
        element.appendChild(textElement);
        if (this.args) {
            element.setAttribute('href', '#');
            element.addEventListener('click', this.onClick(), false);
        }
        return element;
    }
}

class Display {
    constructor(container) {
        const id = _.uniqueId('wc-display-');
        this._root = container;
        this.node = document.createElement('div');
        this.node.setAttribute('id', id);
        this.node.setAttribute('class', 'wc-display');
        this._root.appendChild(this.node);
    }

    setFinalizer(cb, ctx) {
        this.finalizer = {
            callback: cb,
            context: ctx
        };
        return this;
    }

    end() {
        if (this._ended) {
            throw (new Error('Display Already Ended, check your event handlers :)'));
        }

        const container = this._root;
        const el = this.node;
        removeElement(el);
        this._ended = true;
        if (this.finalizer) {
            this.finalizer.callback.call(this.finalizer.context);
        }
    }
}

class Dock {
    constructor(options) {
        this.container = options.container;
    }

    detachPage(pageWrapper) {
        removeElement(pageWrapper);
    }

    addPage(page) {
        const wrapper = document.createElement('div');
        const buttons = document.createElement('div');
        const closeBtn = document.createElement('div');
        const collapseBtn = document.createElement('div');

        closeBtn.innerHTML = 'close';
        collapseBtn.innerHTML = 'collapse';
        addClass(wrapper, 'wc-dock-page');
        addClass(buttons, 'wc-dock-buttons');
        addClass(collapseBtn, 'wc-collapse icon-collapse');
        addClass(closeBtn, 'wc-close icon-close');


        const detacher = function () {
            this.detachPage(wrapper);
        };

        const collapser = () => {
            if (hasClass(page, 'wc-collapsed')) {
                collapseBtn.innerHTML = 'collapse';
                collapseBtn.className = 'wc-collapse icon-collapse';
            }
            else {
                collapseBtn.innerHTML = 'expand';
                collapseBtn.className = 'wc-expand icon-expand';

            }
            toggleClass(page, 'wc-collapsed');
        };

        closeBtn.addEventListener('click', _.bind(detacher, this), false);
        collapseBtn.addEventListener('click', collapser, false);

        buttons.appendChild(collapseBtn);
        buttons.appendChild(closeBtn);
        wrapper.appendChild(buttons);
        wrapper.appendChild(page);
        this.container.appendChild(wrapper);
    }
}

class InputHistory {
    constructor(options) {
        this.commands = [];
        this.currentIndex = -1;
    }

    resetIndex() {
        this.currentIndex = this.commands.length;
    }

    push(cmd) {
        cmd = cmd.trim();
        if (this.commands.length > 0) {
            const lastCmd = this.commands[this.commands.length - 1];
            if (lastCmd === cmd) {
                return;
            }
        }
        this.commands.push(cmd);
        this.resetIndex();
    }

    backward() {
        if (this.commands.length > 0) {
            this.currentIndex -= 1;
            if (this.currentIndex < 0) {
                this.resetIndex();
                return '';
            }
            return this.commands[this.currentIndex];
        }
        return '';
    }

    forward() {
        if (this.commands.length > 0) {
            this.currentIndex += 1;
            if (this.currentIndex > (this.commands.length - 1)) {
                this.currentIndex = -1;
                return '';
            }
            return this.commands[this.currentIndex];
        }
        return '';
    }
}

class Loader {
    constructor(text) {
        this.text = text || 'loading';
        this.init();
    }

    init() {
        const element = document.createElement('div');
        const textElement = document.createElement('div');
        const itemsElement = document.createElement('div');
        textElement.innerHTML = this.text;
        this.items = [];
        for (let i = 0; i < 100; i++) {
            const item = document.createElement('div');
            addClass(item, 'wc-loader-item');
            itemsElement.appendChild(item);
            this.items.push(item);
        }
        element.appendChild(textElement);
        element.appendChild(itemsElement);
        addClass(element, 'wc-loader');
        addClass(textElement, 'wc-loader-text');
        addClass(itemsElement, 'wc-loader-items');
        this.element = element;
        return this;
    }

    start() {
        const self = this;
        self.running = true;
        let start = null;
        let idx = 0;
        const r = 100;
        let dir = true;
        function step (ts) {
            if (self.running) {
                const offset = start ? ts - start : r;
                if (offset < r) {
                    return window.requestAnimationFrame(step);
                }
                start = ts;
                if (dir) {
                    for (var i = 0; i < idx; i++) {
                        var item = self.items[i];
                        item.style.backgroundColor = 'grey';
                    }
                    for (var i = idx + 1; i < self.items.length; i++) {
                        var item = self.items[i];
                        item.style.backgroundColor = 'transparent';
                    }
                    self.items[idx].style.backgroundColor = 'black';
                    idx += 1;
                    if (idx === self.items.length) {
                        dir = false;
                    }
                }
                else {
                    idx -= 1;
                    for (var i = 0; i < idx; i++) {
                        var item = self.items[i];
                        item.style.backgroundColor = 'transparent';
                    }
                    for (var i = idx + 1; i < self.items.length; i++) {
                        var item = self.items[i];
                        item.style.backgroundColor = 'grey';
                    }
                    self.items[idx].style.backgroundColor = 'black';
                    if (idx === 0) {
                        dir = true;
                    }
                }
                window.requestAnimationFrame(step);
            }
        }
        window.requestAnimationFrame(step);
    }

    stop() {
        this.running = false;
    }
}


function isKeyCode (event, kc) {
    return (kc === event.which || kc === event.keyCode);
}


function isKeyReturnEvent (event) {
    return isKeyCode(event, 13);
}


class WebConsole extends Terminal {

    get capabilities () {
        return {
            'dom': {
                'display': 'display'
            },
        };
    }

    constructor (container, mapContainer) {
        super();
        this.root = container;
        this.mapContainer = mapContainer;
        this.lines = [];
        this.history = [];
        this.commandMutex = new Mutex();
    }

    /*
    At the moment, the console is on top of everything
    except when asked for a fullscreen display. It means
    that the map is not receiving mouse events. We'll
    try to work this around by forwarding such events.
    It's not beautiful, well, near ugliness, but as long
    as it works, I'm OK.
    */
    forwardMouseEvents() {
        const root = this.root;
        const map = this.shell.env.map;
        const view = map.getView();
        const navigator = view.navigator;
        const node = navigator.getNode();
        const events = navigator.events;
        const self = this;
        const forward = event => {
            if (!self.onDisplay && (event.target === root)) {
                const extent = new Geometry.Extent(node.getBoundingClientRect());
                if (extent.intersects([event.clientX, event.clientY])) {
                    navigator.dispatcher(event);
                }
            }
        };

        _.each(events, e => {
            root.addEventListener(e, forward, false);
        });
    }

    insertInput(listener, events) {
        const map = this.shell.env.map;
        const view = map.getView();
        const navigator = view.navigator;
        const node = navigator.getNode();
        const eventsToFilter = _.without(navigator.events, 'keyup');

        listener = listener || this.handleInput.bind(this);
        const oldInput = this._inputField;
        if (oldInput) {
            removeElement(oldInput);
        }
        this._inputField = document.createElement('input');
        this._inputField.setAttribute('id', 'command-line');
        this._inputField.setAttribute('class', 'wc-input');
        this._inputField.setAttribute('type', 'text');

        eventPreventer(this._inputField, eventsToFilter);

        const inputPrompt = document.createElement('div');
        inputPrompt.setAttribute('class', 'wc-input-prompt');
        inputPrompt.innerHTML='>';

        const inputBottomline = document.createElement('div');
        inputBottomline.setAttribute('class', 'wc-input-bottom-line');

        this.container.appendChild(inputPrompt);
        this.container.appendChild(this._inputField);
        this.container.appendChild(inputBottomline);
        this._inputField.addEventListener('keyup', listener, false);
        return this._inputField;
    }

    setButtons () {
        const self = this;
        const map = this.shell.env.map;
        const view = map.getView();
        const navigator = view.navigator;
        const node = navigator.getNode();
        const eventsToFilter = _.without(navigator.events, 'click');

        const cmdHandler = cmds => ev => {
            ev.stopPropagation();
            for (let i = 0; i < cmds.length; i++) {
                self.runCommand(cmds[i]);
            }
        };
        const displayHandler = cmdHandler;

        let currentPager = null;
        const pagerHandler = (button, pager, cmds) => {
            const closePager_ = pager_ => {
                emptyElement(pager_);
                removeClass(pager_, 'wc-active');
                addClass(pager_, 'wc-inactive');
            };

            const closePager = ev => {
                ev.stopPropagation();
                closePager_(pager);
            };
            const dockPage = ev => {
                ev.stopPropagation();
                const page = pager.wcPage;
                if (page) {
                    self.dock.addPage(page);
                }
                closePager(ev);
            };
            return (ev => {
                ev.stopPropagation();
                if (currentPager) {
                    closePager_(currentPager);
                }
                // emptyElement(pager);
                currentPager = pager;
                removeClass(pager, 'wc-inactive');
                addClass(pager, 'wc-active');
                const pagerBtns = document.createElement('div');
                const closeBtn = document.createElement('span');
                const dockBtn = document.createElement('span');
                pagerBtns.className = 'pager-actions';
                dockBtn.className = 'pager-action-dock icon-docker';
                dockBtn.innerHTML = 'dock it';
                closeBtn.className = 'pager-action-close icon-close';
                closeBtn.innerHTML = 'close';
                dockBtn.addEventListener('click', dockPage, false);
                closeBtn.addEventListener('click', closePager, false);
                pagerBtns.appendChild(dockBtn);
                pagerBtns.appendChild(closeBtn);
                pager.appendChild(pagerBtns);

                const rect = button.getBoundingClientRect();
                pager.style.top = px(rect.top);
                // pager.style.left = px(rect.right);
                for (let i = 0; i < cmds.length; i++) {
                    self.runCommand(cmds[i], pager);
                }
            });
        };

        self.buttonsContainer = document.createElement('div');
        addClass(self.buttonsContainer, 'wc-buttons wc-element');
        self.root.appendChild(self.buttonsContainer);

        const groupKeys = _.keys(buttons);
        const groups = {};

        for (const gn of groupKeys) {
            const buttonKeys = _.keys(buttons[gn]);
            const groupElement = document.createElement('div');
            const groupTitlewrapper = document.createElement('div');
            const groupTitlelabel = document.createElement('span');
            const groupTitlevalue = document.createElement('span');

            addClass(groupTitlewrapper, 'wc-buttons-group-title-wrapper');
            addClass(groupTitlelabel, 'wc-buttons-group-title-label');
            addClass(groupTitlevalue, 'wc-buttons-group-title-value');
            addClass(groupElement, 'wc-buttons-group wc-inactive');


            let grplabel = gn;
            let grpname = 'name to be added';
            if (gn == 'shell') {
                var grplabel = 'wænd';
                var grpname = '';
            }
            if (gn == 'group') {
                grplabel = 'map';
            }



            groupTitlelabel.innerHTML = grplabel;
            groupTitlevalue.innerHTML = grpname;

            groupTitlewrapper.appendChild(groupTitlelabel);
            groupTitlewrapper.appendChild(groupTitlevalue);
            // groupElement.appendChild(document.createTextNode(gn));
            groupElement.appendChild(groupTitlewrapper);
            self.buttonsContainer.appendChild(groupElement);

            groups[gn] = {
                container: groupElement,
                title: groupTitlevalue
            };

            for (let bi = 0 ; bi < buttonKeys.length; bi++) {
                const bn = buttonKeys[bi];
                const spec = buttons[gn][bn];
                const buttonElement = document.createElement('div');

                addClass(buttonElement, 'wc-button');
                eventPreventer(buttonElement, eventsToFilter);

                if ('function' === spec.type) {
                    spec.command(self, buttonElement);
                    groupElement.appendChild(buttonElement);
                }
                else {
                    const bnNoSpace = bn.replace(/\s+/g, '');
                    const bnClass = bnNoSpace.toLowerCase();
                    const buttonWrapper = document.createElement('div');
                    let pager = null;

                    addClass(buttonWrapper, `button-wrapper ${bnClass}`);
                    addClass(buttonElement, `icon-${bnClass}`);
                    buttonElement.appendChild(document.createTextNode(bn));

                    if('shell' === spec.type) {
                        buttonElement.addEventListener(
                            'click',
                            cmdHandler(spec.command)
                        );
                    }
                    else if ('display' === spec.type) {
                        buttonElement.addEventListener(
                            'click',
                            displayHandler(spec.command)
                        );
                    }
                    else if ('embed' === spec.type) {
                        pager = document.createElement('div');
                        addClass(pager, 'wc-button-pager');
                        pager.attachPage = function (page) {
                            this.appendChild(page);
                            this.wcPage = page;
                        };
                        buttonElement.addEventListener(
                            'click',
                            pagerHandler(buttonElement, pager, spec.command)
                        );
                    }

                    buttonWrapper.appendChild(buttonElement);
                    if (pager) {
                        buttonWrapper.appendChild(pager);
                    }
                    groupElement.appendChild(buttonWrapper);
                }
            }
        }

        semaphore.on('shell:change:context', (sctx, ctxPath) => {
            // for (let gi = 0; gi < groupKeys.length; gi++) {
            //     const gn = groupKeys[gi];
            //     const elem = groups[gn].container;
            //     const title = groups[gn].title;
            //
            //     if (elem) {
            //         elem.setAttribute('class', 'wc-buttons-group wc-inactive');
            //     }
            // }

            const makeContextLink = pidx => {
                const id = ctxPath[pidx];
                const db = getBinder().db;
                let name;
                if (db.has(id)) {
                    var model = db.get(id);
                    name = getModelName(model);
                }
                const ccCmd = `cc /${ctxPath.slice(0, pidx + 1).join('/')}`;
                return self.makeCommand({
                    'args': [ccCmd, 'get'],
                    'text': name,
                    fragment: model.getDomFragment('name', 'a', {
                        'href': '#',
                        'title': ccCmd
                    })
                });
            };

            for (let gi = 0; gi < (sctx + 1); gi++) {
                const gn = groupKeys[gi];
                const elem = groups[gn].container;
                const title = groups[gn].title;

                if (elem) {
                    let klass = `wc-buttons-${gn} wc-active`;
                    if (gi === sctx) {
                        klass += ' wc-current';
                    }
                    elem.setAttribute('class', klass);
                }

                if ((gi > 0) && title) {
                    const cmd = makeContextLink(gi - 1);
                    title.innerHTML = '';
                    title.appendChild(cmd.toDomFragment());
                }
            }
        }, this);
    }

    start () {
        const map = this.shell.env.map;
        const view = map.getView();
        const navigator = view.navigator;
        const node = navigator.getNode();
        const eventsToFilter = _.without(navigator.events, 'click');

        this.container = document.createElement('div');
        this.pages = document.createElement('div');
        this.pagesTitle = document.createElement('div');
        this.dockContainer = document.createElement('div');

        eventPreventer(this.container, eventsToFilter);
        eventPreventer(this.dockContainer, eventsToFilter);
        eventPreventer(this.pages, eventsToFilter);

        addClass(this.container, 'wc-container wc-element');
        addClass(this.pages, 'wc-pages wc-element');
        addClass(this.pagesTitle, 'wc-title');
        addClass(this.dockContainer, 'wc-dock wc-element');

        this.pages.appendChild(this.pagesTitle);

        this.root.appendChild(this.container);
        this.root.appendChild(this.pages);
        this.root.appendChild(this.dockContainer);

        this.dock = new Dock({
            container: this.dockContainer
        });

        this.insertInput();
        this.setButtons();
        // this.setMapBlock();
        this.history = new InputHistory();
        const self = this;

        self.shell.stdout.on('data', self.write, self);
        self.shell.stderr.on('data', self.writeError, self);


        // this.mapContainer.addEventListener('transitionend', function(){
        //     semaphore.signal('map:resize');
        // }, false);

        this.forwardMouseEvents();

        semaphore.on('terminal:run', this.runCommand.bind(this));
        semaphore.on('start:loader', this.startLoader.bind(this));
        semaphore.on('stop:loader', this.stopLoader.bind(this));
    }

    internalCommand (str) {
        if (':' !== str[0]) {
            return false;
        }
        const klassAttr = this.root.getAttribute('class') || '';
        const klass = klassAttr.split(' ');
        if (':fold' === str) {
            this.root.setAttribute('class', _.uniq(klass.concat(['fold'])).join(' '));
        }
        else if(':unfold' === str){
            this.root.setAttribute('class', _.without(klass, 'fold').join(' '));
        }
        return true;
    }

    runCommand (val, pager) {
        const self = this;
        const input = self._inputField;

        self.commandMutex
            .get()
            .then(unlock => {
                try {
                    addClass(input, 'wc-pending');
                    self.pageStart(val, pager);
                }
                catch(err) {
                    unlock();
                    throw err;
                }

                const shellExeced = self.shell.exec(val);
                const shellThened = shellExeced.then(() => {
                        self.history.push(val);
                        self.insertInput().focus();
                        unlock();
                    });
                const shellCaught = shellThened.catch(err => {
                        self.writeError(err);
                        self.insertInput().focus();
                        unlock();
                    });
            })
            .catch(err => {
                console.error('get mutex', err);
            });
    }

    pageStart (cmd, pager) {
        const page = document.createElement('div');

        addClass(page, 'wc-page wc-active');

        if (pager) {
            if (_.isFunction(pager.attachPage)) {
                pager.attachPage(page);
            }
            else {
                pager.appendChild(page);
            }
        }
        else {
            const self = this;
            const pager = this.pages;
            const pagesTitle = removeElement(this.pagesTitle);
            const title = document.createElement('div');
            const docker = document.createElement('span');
            const closer = document.createElement('span');

            emptyElement(pager);
            emptyElement(this.pagesTitle);
            docker.innerHTML = 'dock it';
            addClass(docker, 'wc-page-docker icon-docker');
            docker.addEventListener('click', ev => {
                removeElement(title);
                self.dock.addPage(page);
                self.currentPage = null;
            }, false);
            closer.innerHTML = 'close';
            addClass(closer, 'wc-page-closer icon-close');
            closer.addEventListener('click', ev => {
                removeElement(title);
                removeElement(page);
            }, false);
            addClass(title, 'wc-page-title');
            title.appendChild(document.createTextNode(cmd));
            title.appendChild(closer);
            title.appendChild(docker);

            pagesTitle.appendChild(title);
            pager.appendChild(pagesTitle);
            pager.appendChild(page);
        }
        this.currentPage = page;
    }

    handleInput (event) {
        if(isKeyReturnEvent(event)) {
            const self = this;
            const input = self._inputField;
            const val = input.value.trim();
            if(val.length === 0){
                const rinput = self.insertInput();
                rinput.focus();
                return rinput;
            }
            if (this.internalCommand(val)) {
                return;
            }

            this.runCommand(val);
        }
        else if (isKeyCode(event, 40)) { // down
            this._inputField.value = this.history.forward();
        }
        else if (isKeyCode(event, 38)) { // up
            this._inputField.value = this.history.backward();
        }

    }

    input (fdin, prompt) {
        const self = this;
        const handler = event => {
            if(isKeyReturnEvent(event)) {
                const input = self._inputField;
                const val = input.value.trim();
                fdin.write(val);
            }
        };
        self.insertInput(handler).focus();
    }

    write () {
        const element = document.createElement('div');
        element.setAttribute('class', 'wc-line');

        for (const fragment of arguments) {
            if(fragment instanceof WebCommand){
                element.appendChild(fragment.toDomFragment());
            }
            else{
                const textElement = document.createElement('span');
                textElement.innerHTML = fragment.toString();
                element.appendChild(textElement);
            }
        }

        this.currentPage.appendChild(element);
    }

    writeError () {
        const element = document.createElement('div');
        element.setAttribute('class', 'wc-line wc-error');

        for (const fragment of arguments) {
            try{
                const textElement = document.createTextNode(fragment.toString());
                element.appendChild(textElement);
            }
            catch(err){
                console.error('wc.writeError', err);
            }
        }

        this.container.appendChild(element);
    }

    makeCommand (options) {
        return (new WebCommand(this, options));
    }

    display (options={}) {
        const display = new Display(this.root);
        const mc = this.mapContainer;
        const fullscreen = options.fullscreen;
        this.hide();
        if(fullscreen) {
            this.isFullscreen = true;
            addClass(mc, 'wc-fullscreen');
        }
        display.setFinalizer(function () {
            removeClass(mc, 'wc-fullscreen');
            this.show();
            if (fullscreen) {
                this.isFullscreen = false;
                semaphore.signal('map:resize');
            }
        }, this);
        if (fullscreen) {
            _.defer(() => {
                semaphore.signal('map:resize');
            });
        }
        return display;
    }

    hide () {
        this.onDisplay = true;
        addClass(this.container, 'wc-hide');
        addClass(this.pages, 'wc-hide');
        addClass(this.buttonsContainer, 'wc-hide');
        addClass(this.dockContainer, 'wc-hide');
    }

    show () {
        this.onDisplay = false;
        removeClass(this.container, 'wc-hide');
        removeClass(this.pages, 'wc-hide');
        removeClass(this.buttonsContainer, 'wc-hide');
        // removeClass(this.mapBlock, 'wc-hide');
        removeClass(this.dockContainer, 'wc-hide');
    }

    startLoader (text) {
        if (this.loader) {
            return null;
        }
        this.loader = new Loader(text);
        this.root.appendChild(this.loader.element);
        this.loader.start();
    }

    stopLoader (text) {
        if (this.loader) {
            this.loader.stop();
            removeElement(this.loader.element);
            this.loader = null;
        }
    }

}


export default WebConsole;
