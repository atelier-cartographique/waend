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
    Terminal = require('../lib/Terminal'),
    semaphore = require('../lib/Semaphore'),
    Mutex = require('../lib/Mutex'),
    buttons = require('./Buttons'),
    Promise = require('bluebird');

var document = window.document;


function WebCommand (term, options) {
    this.term = term;
    this.args = options.args;
    this.text = options.text;
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
    var element = document.createElement('a'),
        textElement = document.createTextNode(this.text.toString());
    element.setAttribute('href', '#');
    element.setAttribute('class', 'wc-command');
    element.setAttribute('title', this.args.join(' '));
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

Display.prototype.end = function () {
    if (this._ended) {
        throw (new Error('Display Already Ended, check your event handlers :)'));
    }

    var container = this._root,
        el = this.node;
    container.removeChild(el);
    this._ended = true;
};



function isKeyReturnEvent (event) {
    return (13 === event.which || 13 === event.keyCode);
}

var WebConsole = Terminal.extend({


    capabilities: {
        'dom': {
            'display': 'display'
        },
    },

    initialize: function (container) {
        this.root = container;
        this.lines = [];
        this.history = [];
        this.commandMutex = new Mutex();
    },

    insertInput: function (listener) {
        listener = listener || this.handleInput.bind(this);
        var oldInput = this._inputField;
        if (oldInput) {
            this.container.removeChild(oldInput);
        }
        this._inputField = document.createElement('input');
        this._inputField.setAttribute('class', 'wc-input');
        this._inputField.setAttribute('type', 'text');
        this.container.appendChild(this._inputField);
        this._inputField.addEventListener('keypress', listener, false);
        this._inputField.focus();
    },

    setTitle: function (title) {
        this.title.innerHTML = title;
    },

    setButtons: function () {
        var self = this;
        var cmdHandler = function () {
            var group = arguments[0],
                name = arguments[1],
                cmds = buttons[group][name];
            return function () {
                for (var i = 0; i < cmds.length; i++) {
                    self.runCommand(cmds[i]);
                }
            };
        };

        self.buttonsContainer = document.createElement('div');
        self.buttonsContainer.setAttribute('class','wc-buttons');
        self.root.appendChild(self.buttonsContainer);

        var groupKeys = _.keys(buttons);
        var groups = {};
        for (var gi = 0; gi < groupKeys.length; gi++) {
            var gn = groupKeys[gi],
                buttonKeys = _.keys(buttons[gn]),
                groupElement = document.createElement('div');

            groupElement.setAttribute('class','wc-buttons-group wc-inactive');
            groupElement.appendChild(document.createTextNode(gn));
            self.buttonsContainer.appendChild(groupElement);

            groups[gn] = groupElement;

            for (bi = 0 ; bi < buttonKeys.length; bi++) {
                var bn = buttonKeys[bi],
                    buttonElement = document.createElement('div');

                buttonElement.setAttribute('class','wc-button');
                buttonElement.appendChild(document.createTextNode(bn));
                buttonElement.addEventListener('click', cmdHandler(gn, bn));
                groupElement.appendChild(buttonElement);
            }
        }

        semaphore.on('shell:change:context', function(sctx){
            for (var gi = 0; gi < groupKeys.length; gi++) {
                var gn = groupKeys[gi],
                    elem = groups[gn];
                if (elem) {
                    elem.setAttribute('class', 'wc-buttons-group wc-inactive');
                }
            }
            if (1 === sctx) {
                if (groups.user) {
                    groups.user.setAttribute('class', 'wc-buttons-group wc-active');
                }
            }
            else if (2 === sctx) {
                if (groups.group) {
                    groups.group.setAttribute('class', 'wc-buttons-group wc-active');
                }
            }
            else if (3 === sctx) {
                if (groups.layer) {
                    groups.layer.setAttribute('class', 'wc-buttons-group wc-active');
                }
            }
            else if (4 === sctx) {
                if (groups.feature) {
                    groups.feature.setAttribute('class', 'wc-buttons-group wc-active');
                }
            }
        });
    },

    start: function () {
        this.title = document.createElement('div');
        this.container = document.createElement('div');
        this.pages = document.createElement('div');

        this.container.setAttribute('class', 'wc-container');
        this.title.setAttribute('class','wc-title');
        this.pages.setAttribute('class', 'wc-pages');

        this.root.appendChild(this.title);
        this.root.appendChild(this.container);
        this.root.appendChild(this.pages);

        this.setTitle('/wænd');
        this.insertInput();
        this.setButtons();
        var self = this;
        // self.container.addEventListener('click', function(e){
        //     if(self._inputField){
        //         self._inputField.focus();
        //     }
        // });
        self.shell.stdout.on('data', self.write, self);
        self.shell.stderr.on('data', self.writeError, self);

        semaphore.on('please:terminal:run', this.runCommand, this);
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

    runCommand: function (val) {
        var self = this,
            input = self._inputField;

        self.commandMutex
            .get()
            .then(function(unlock){
                input.setAttribute('class', 'wc-input wc-pending');
                self.pageStart(val);
                self.shell.exec(val)
                    .then(function(){
                        console.log.apply(console, arguments);
                    })
                    .catch(function(err){
                        if(err.toString){
                            self.write(err.toString());
                        }
                    })
                    .finally(function(){
                        // input.setAttribute('class', 'wc-input wc-inactive');
                        // input.setAttribute('disabled', 'disabled');
                        self.history.push(val);
                        // self.pageEnd();
                        self.insertInput();
                        unlock();
                    });
            })
            .catch(function(){
                _.defer(function(){
                    self.runCommand(val);
                });
            });
    },

    pageStart: function (cmd) {
        var page = document.createElement('div'),
            title = document.createElement('div');

        page.setAttribute('class', 'wc-page wc-active');
        title.setAttribute('class', 'wc-page-title');
        title.appendChild(document.createTextNode(cmd));
        page.appendChild(title);

        if (this.currentPage) {
            var cp = this.currentPage;
            cp.addEventListener('transitionend', function(){
                cp.setAttribute('class', 'hidden');
            }, false);
            cp.setAttribute('class', 'wc-page wc-inactive');
        }

        this.currentPage = page;
        this.pages.appendChild(page);
    },

    // pageEnd: function () {
    //
    // },

    handleInput: function (event) {
        if(isKeyReturnEvent(event)) {
            var self = this,
                input = self._inputField,
                val = input.value.trim();
            if(val.length === 0){
                return self.insertInput();
            }
            if (this.internalCommand(val)) {
                return;
            }

            this.runCommand(val);
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
        self.insertInput(handler);
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
                var textElement = document.createTextNode(fragment.toString());
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
        return (new Display(this.root));
    }

});

module.exports = exports = WebConsole;
