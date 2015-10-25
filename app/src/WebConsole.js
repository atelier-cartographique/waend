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

var _ = require('underscore'),
    Bind = require('../lib/Bind'),
    Terminal = require('../lib/Terminal'),
    semaphore = require('../lib/Semaphore'),
    Mutex = require('../lib/Mutex'),
    helpers = require('../lib/helpers'),
    buttons = require('./Buttons'),
    Promise = require('bluebird');

var document = window.document;
var addClass = helpers.addClass,
    removeClass = helpers.removeClass,
    emptyElement = helpers.emptyElement,
    hasClass = helpers.hasClass,
    toggleClass = helpers.toggleClass,
    px = helpers.px;

var titleTypes = ['shell', 'user', 'group', 'layer', 'feature'];

function WebCommand (term, options) {
    this.term = term;
    this.args = options.args;
    this.text = options.text;
    this.fragment = options.fragment;
    this.attributes = options.attributes;
}

WebCommand.prototype.toString = function () {
    return this.text.toString();
};

WebCommand.prototype.onClick = function () {
    var term = this.term,
        args = this.args;
    var cb = function(event){
        event.preventDefault();
        Promise.reduce(args, function(t,i, index){
            var arg = args[index];
            return term.runCommand(arg);
        }, 0)
        .catch(function(err){
            console.error(err);
        });
    };
    return cb;
};

WebCommand.prototype.toDomFragment = function () {
    if (this.fragment) {
        this.fragment.addEventListener('click', this.onClick(), false);
        return this.fragment;
    }
    var element = document.createElement('a'),
        textElement = document.createTextNode(this.text.toString());
    element.setAttribute('href', '#');
    if (!!this.attributes) {
        for (var k in this.attributes) {
            element.setAttribute(k, this.attributes[k]);
        }
    }
    else {
        element.setAttribute('class', 'wc-command');
        element.setAttribute('title', this.args.join(' '));
    }
    element.appendChild(textElement);
    element.addEventListener('click', this.onClick(), false);
    return element;
};


function Display (container) {
    var id = _.uniqueId('wc-display-');
    this._root = container;
    this.node = document.createElement('div');
    this.node.setAttribute('id', id);
    this.node.setAttribute('class', 'wc-display');
    this._root.appendChild(this.node);
}

Display.prototype.setFinalizer = function(cb, ctx) {
    this.finalizer = {
        callback: cb,
        context: ctx
    };
    return this;
}

Display.prototype.end = function () {
    if (this._ended) {
        throw (new Error('Display Already Ended, check your event handlers :)'));
    }

    var container = this._root,
        el = this.node;
    container.removeChild(el);
    this._ended = true;
    if (this.finalizer) {
        this.finalizer.callback.call(this.finalizer.context);
    }
};


function Dock (options) {
    this.container = options.container;
}

Dock.prototype.detachPage = function (pageWrapper) {
    this.container.removeChild(pageWrapper);
};

Dock.prototype.addPage = function (page) {
    var wrapper = document.createElement('div'),
        buttons = document.createElement('div'),
        closeBtn = document.createElement('div'),
        collapseBtn = document.createElement('div');

    closeBtn.innerHTML = 'close';
    collapseBtn.innerHTML = 'collapse';
    addClass(wrapper, 'wc-dock-page');
    addClass(buttons, 'wc-dock-buttons');
    addClass(closeBtn, 'wc-close');
    addClass(collapseBtn, 'wc-collapse');

    var detacher = function () {
        this.detachPage(wrapper);
    };

    var collapser = function () {
        if (hasClass(page, 'wc-collapsed')) {
            collapseBtn.innerHTML = 'collapse';
        }
        else {
            collapseBtn.innerHTML = 'expand';
        }
        toggleClass(page, 'wc-collapsed');
    };

    closeBtn.addEventListener('click', _.bind(detacher, this), false);
    collapseBtn.addEventListener('click', collapser, false);

    buttons.appendChild(closeBtn);
    buttons.appendChild(collapseBtn);
    wrapper.appendChild(buttons);
    wrapper.appendChild(page);
    this.container.appendChild(wrapper);
};


function InputHistory (options) {
    this.commands = [];
    this.currentIndex = -1;
}


InputHistory.prototype.resetIndex = function () {
    this.currentIndex = this.commands.length;
};

InputHistory.prototype.push = function (cmd) {
    cmd = cmd.trim();
    if (this.commands.length > 0) {
        var lastCmd = this.commands[this.commands.length - 1];
        if (lastCmd === cmd) {
            return;
        }
    }
    this.commands.push(cmd);
    this.resetIndex();
};

InputHistory.prototype.backward = function () {
    if (this.commands.length > 0) {
        this.currentIndex -= 1;
        if (this.currentIndex < 0) {
            this.resetIndex();
            return '';
        }
        return this.commands[this.currentIndex];
    }
    return '';
};

InputHistory.prototype.forward = function () {
    if (this.commands.length > 0) {
        this.currentIndex += 1;
        if (this.currentIndex > (this.commands.length - 1)) {
            this.currentIndex = -1;
            return '';
        }
        return this.commands[this.currentIndex];
    }
    return '';
};


function Loader (text) {
    this.text = text || 'loading';
    this.init();
}

Loader.prototype.init = function () {
    var element = document.createElement('div'),
        textElement = document.createElement('div'),
        itemsElement = document.createElement('div');
    textElement.innerHTML = this.text;
    this.items = [];
    for (var i = 0; i < 100; i++) {
        var item = document.createElement('div');
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
};

Loader.prototype.start = function () {
    var self = this;
    self.running = true;
    var start = null,
        idx = 0,
        r = 100,
        dir = true;
    function step (ts) {
        if (self.running) {
            var offset = start ? ts - start : r;
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
};

Loader.prototype.stop = function () {
    this.running = false;
};


function isKeyCode (event, kc) {
    return (kc === event.which || kc === event.keyCode);
}


function isKeyReturnEvent (event) {
    return isKeyCode(event, 13);
}


var WebConsole = Terminal.extend({

    capabilities: {
        'dom': {
            'display': 'display'
        },
    },

    initialize: function (container, mapContainer) {
        this.root = container;
        this.mapContainer = mapContainer;
        this.lines = [];
        this.history = [];
        this.commandMutex = new Mutex();
    },

    insertInput: function (listener, events) {
        listener = listener || this.handleInput.bind(this);
        var oldInput = this._inputField;
        if (oldInput) {
            this.container.removeChild(oldInput);
        }
        this._inputField = document.createElement('input');
        this._inputField.setAttribute('id', 'command-line');
        this._inputField.setAttribute('class', 'wc-input');
        this._inputField.setAttribute('type', 'text');

            inputPrompt = document.createElement('div');
            inputPrompt.setAttribute('class', 'wc-input-prompt');
            inputPrompt.innerHTML='>';

            inputBottomline = document.createElement('div');
            inputBottomline.setAttribute('class', 'wc-input-bottom-line');

        this.container.appendChild(inputPrompt);
        this.container.appendChild(this._inputField);
        this.container.appendChild(inputBottomline);
        this._inputField.addEventListener('keyup', listener, false);
        return this._inputField;
    },

    // deprecated
    setTitle: function () {
        // var title = this.title;
        // while (title.firstChild) {
        //     title.removeChild(title.firstChild);
        // }
        // var element = document.createElement('div');
        // for(var i=0; i < arguments.length; i++){
        //     var fragment = arguments[i];
        //     if(fragment instanceof WebCommand){
        //         element.appendChild(fragment.toDomFragment());
        //     }
        //     else{
        //         var textElement = document.createTextNode(fragment.toString());
        //         element.appendChild(textElement);
        //     }
        // }
        // title.appendChild(element);
    },

    setButtons: function () {
        var self = this;
        var cmdHandler = function (cmds) {
            return (function () {
                for (var i = 0; i < cmds.length; i++) {
                    self.runCommand(cmds[i]);
                }
            });
        };
        var displayHandler = cmdHandler;

        var pagerHandler = function (button, pager, cmds) {
            var closePager = function (ev) {
                ev.stopPropagation();
                emptyElement(pager);
                removeClass(pager, 'wc-active');
                addClass(pager, 'wc-inactive');
            };
            var dockPage = function (ev) {
                ev.stopPropagation();
                var page = pager.wcPage;
                if (page) {
                    self.dock.addPage(page);
                }
                closePager(ev);
            };
            return (function () {
                emptyElement(pager);
                removeClass(pager, 'wc-inactive');
                addClass(pager, 'wc-active');
                var pagerBtns = document.createElement('div'),
                    closeBtn = document.createElement('span'),
                    dockBtn = document.createElement('span');
                closeBtn.innerHTML = 'close';
                dockBtn.innerHTML = 'dock';
                closeBtn.addEventListener('click', closePager, false);
                dockBtn.addEventListener('click', dockPage, false);
                pagerBtns.appendChild(closeBtn);
                pagerBtns.appendChild(dockBtn);
                pager.appendChild(pagerBtns);

                var rect = button.getBoundingClientRect();
                pager.style.top = px(rect.top);
                pager.style.left = px(rect.right);
                for (var i = 0; i < cmds.length; i++) {
                    self.runCommand(cmds[i], pager);
                }
            });
        };

        self.buttonsContainer = document.createElement('div');
        addClass(self.buttonsContainer, 'wc-buttons wc-element');
        self.root.appendChild(self.buttonsContainer);

        var groupKeys = _.keys(buttons);
        var groups = {};
        for (var gi = 0; gi < groupKeys.length; gi++) {
            var gn = groupKeys[gi],
                buttonKeys = _.keys(buttons[gn]),
                groupElement = document.createElement('div');
                groupTitlewrapper = document.createElement('div');
                groupTitlelabel = document.createElement('span');
                groupTitlevalue = document.createElement('span');

            addClass(groupTitlewrapper, 'wc-buttons-group-title-wrapper');
            addClass(groupTitlelabel, 'wc-buttons-group-title-label');
            addClass(groupTitlevalue, 'wc-buttons-group-title-value');
            addClass(groupElement, 'wc-buttons-group wc-inactive');


            var grplabel = gn;
            var grpname = 'name to be added';
            if (gn == 'shell') {
                var grplabel = 'wænd';
                var grpname = '';
            };
            if (gn == 'group') {
                var grplabel = 'map';
            };



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

            for (bi = 0 ; bi < buttonKeys.length; bi++) {
                var bn = buttonKeys[bi],
                    spec = buttons[gn][bn],
                    buttonElement = document.createElement('div');
                addClass(buttonElement, 'wc-button');

                if ('function' === spec.type) {
                    spec.command(self, buttonElement);
                    groupElement.appendChild(buttonElement);
                }
                else {
                    var bnNoSpace = bn.replace(/\s+/g, '');
                    var bnClass = bnNoSpace.toLowerCase();
                    addClass(buttonElement, 'icon-' + bnClass);
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
                        var pager = document.createElement('div');
                        addClass(pager, 'wc-button-pager');
                        pager.attachPage = function (page) {
                            this.appendChild(page);
                            this.wcPage = page;
                        };
                        buttonElement.addEventListener(
                            'click',
                            pagerHandler(buttonElement, pager, spec.command)
                        );
                        buttonElement.appendChild(pager);
                    }
                    groupElement.appendChild(buttonElement);
                }
            }
        }

        semaphore.on('shell:change:context', function(sctx, ctxPath){
            for (var gi = 0; gi < groupKeys.length; gi++) {
                var gn = groupKeys[gi],
                    elem = groups[gn].container
                    title = groups[gn].title;

                if (elem) {
                    elem.setAttribute('class', 'wc-buttons-group wc-inactive');
                }
            }

            var makeContextLink = function (pidx) {
                    var id = ctxPath[pidx],
                        name;
                    if (Bind.get().db.has(id)) {
                        var model = Bind.get().db.get(id);
                        name = helpers.getModelName(model);
                    }
                    return self.makeCommand({
                        'args': ['cc /' + ctxPath.slice(0, pidx + 1).join('/'), 'get'],
                        'text': name
                    });
            };

            for (var gi = 0; gi < (sctx + 1); gi++) {
                var gn = groupKeys[gi],
                    elem = groups[gn].container
                    title = groups[gn].title;

                if (elem) {
                    var klass = 'wc-buttons-'+ gn +' wc-active';
                    if (gi === sctx) {
                        klass += ' wc-current';
                    }
                    elem.setAttribute('class', klass);
                }

                if ((gi > 0) && title) {
                    var cmd = makeContextLink(gi - 1);
                    title.innerHTML = '';
                    title.appendChild(cmd.toDomFragment());
                }
            }
        }, this);
    },

    start: function () {
        this.container = document.createElement('div');
        this.pages = document.createElement('div');
        this.pagesTitle = document.createElement('div');
        this.dockContainer = document.createElement('div');

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
        this.setMapBlock();
        this.history = new InputHistory();
        var self = this;

        self.shell.stdout.on('data', self.write, self);
        self.shell.stderr.on('data', self.writeError, self);


        this.mapContainer.addEventListener('transitionend', function(){
            semaphore.signal('map:resize');
        }, false);

        semaphore.on('please:terminal:run', this.runCommand, this);
        semaphore.on('start:loader', this.startLoader, this);
        semaphore.on('stop:loader', this.stopLoader, this);
    },

    setMapBlock: function () {
        var self = this,
            mapBlock = document.createElement('div'),
            nav = document.createElement('div'),
            select = document.createElement('div');
            drawZoom = document.createElement('div');

        nav.innerHTML = 'navigate';
        select.innerHTML = 'select';
        drawZoom.innerHTML = 'draw zoom';

        addClass(mapBlock, 'wc-mapblock wc-element');
        addClass(nav, 'wc-nav');
        addClass(select, 'wc-select');
        addClass(drawZoom, 'wc-draw-zoom');

        nav.addEventListener('click', function(){
            self.runCommand('navigate');
        }, false);
        select.addEventListener('click', function(){
            self.runCommand('select');
        }, false);
        drawZoom.addEventListener('click', function(){
            self.runCommand('draw | region set');
        }, false);

        mapBlock.appendChild(drawZoom);
        mapBlock.appendChild(nav);
        mapBlock.appendChild(select);
        self.root.appendChild(mapBlock);
        this.mapBlock = mapBlock;
    },

    internalCommand: function (str) {
        if (':' !== str[0]) {
            return false;
        }
        var klassAttr = this.root.getAttribute('class') || '';
        var klass = klassAttr.split(' ');
        if (':fold' === str) {
            this.root.setAttribute('class', _.uniq(klass.concat(['fold'])).join(' '));
        }
        else if(':unfold' === str){
            this.root.setAttribute('class', _.without(klass, 'fold').join(' '));
        }
        return true;
    },

    runCommand: function (val, pager) {
        var self = this,
            input = self._inputField;

        self.commandMutex
            .get()
            .then(function(unlock){
                try {
                    addClass(input, 'wc-pending');
                    self.pageStart(val, pager);
                }
                catch(err) {
                    unlock();
                    throw err;
                }

                self.shell.exec(val)
                    .then(function(){
                        self.history.push(val);
                        self.insertInput().focus();
                    })
                    .catch(function(err){
                        self.writeError(err);
                        self.insertInput().focus();
                    })
                    .finally(unlock);
            })
            .catch(function(err){
                console.error('get mutex', err);
            });
    },

    pageStart: function (cmd, pager) {
        var page = document.createElement('div');

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
            var self = this,
                pager = this.pages,
                pagesTitle = pager.removeChild(this.pagesTitle),
                title = document.createElement('div'),
                docker = document.createElement('span');

            emptyElement(pager);
            emptyElement(pagesTitle);

            docker.innerHTML = 'dock';
            addClass(docker, 'wc-page-docker');
            docker.addEventListener('click', function(ev){
                self.pagesTitle.removeChild(title);
                self.dock.addPage(page);
                self.currentPage = null;
            }, false);
            addClass(title, 'wc-page-title');
            title.appendChild(document.createTextNode(cmd));
            title.appendChild(docker);

            pagesTitle.appendChild(title);
            pager.appendChild(pagesTitle);
            pager.appendChild(page);
        }
        this.currentPage = page;
    },



    handleInput: function (event) {
        if(isKeyReturnEvent(event)) {
            var self = this,
                input = self._inputField,
                val = input.value.trim();
            if(val.length === 0){
                var rinput = self.insertInput();
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

    },

    input: function (fdin, prompt) {
        var self = this;
        var handler = function (event) {
            if(isKeyReturnEvent(event)) {
                var input = self._inputField,
                    val = input.value.trim();
                    fdin.write(val);
            }
        };
        self.insertInput(handler).focus();
    },

    write: function () {
        var element = document.createElement('div');
        element.setAttribute('class', 'wc-line');
        for(var i=0; i < arguments.length; i++){
            var fragment = arguments[i];
            if(fragment instanceof WebCommand){
                element.appendChild(fragment.toDomFragment());
            }
            else{
                var textElement = document.createElement('span');
                textElement.innerHTML = fragment.toString();
                element.appendChild(textElement);
            }
        }
        this.currentPage.appendChild(element);
    },

    writeError: function () {
        var element = document.createElement('div');
        element.setAttribute('class', 'wc-line wc-error');
        for(var i=0; i < arguments.length; i++){
            var fragment = arguments[i];
            try{
                var textElement = document.createTextNode(fragment.toString());
                element.appendChild(textElement);
            }
            catch(err){
                console.error('wc.writeError', err);
            }
        }
        this.container.appendChild(element);
    },

    makeCommand: function (options) {
        return (new WebCommand(this, options));
    },

    display: function () {
        var display = new Display(this.root),
            mc = this.mapContainer;
        this.hide();
        addClass(mc, 'wc-fullscreen');
        display.setFinalizer(function () {
            removeClass(mc, 'wc-fullscreen');
            this.show();
            // semaphore.signal('map:resize');
        }, this);
        // _.defer(function(){
        //     semaphore.signal('map:resize');
        // });
        return display;
    },

    hide: function () {
        addClass(this.container, 'wc-hide');
        addClass(this.pages, 'wc-hide');
        addClass(this.buttonsContainer, 'wc-hide');
        addClass(this.mapBlock, 'wc-hide');
        addClass(this.dockContainer, 'wc-hide');
    },

    show: function () {
        removeClass(this.container, 'wc-hide');
        removeClass(this.pages, 'wc-hide');
        removeClass(this.buttonsContainer, 'wc-hide');
        removeClass(this.mapBlock, 'wc-hide');
        removeClass(this.dockContainer, 'wc-hide');
    },

    startLoader: function (text) {
        if (this.loader) {
            return null;
        }
        this.loader = new Loader(text);
        this.root.appendChild(this.loader.element);
        this.loader.start();
    },

    stopLoader: function (text) {
        if (this.loader) {
            this.loader.stop();
            this.root.removeChild(this.loader.element);
            this.loader = null;
        }
    },

});


module.exports = exports = WebConsole;
