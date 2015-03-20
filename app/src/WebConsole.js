/*
 * app/src/WebConsole.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var _ = require('underscore'),
    Terminal = require('../lib/Terminal');

var document = window.document;


function WebCommand (term, options) {
    this.term = term;
    this.args = options.args;
    this.text = options.text;
};

WebCommand.prototype.toString = function () {
    return this.text.toString();
};

WebCommand.prototype.onClick = function () {
    var shell = this.term.shell,
        args = this.args.join(' ');
    var cb = function(event){
        event.preventDefault();
        shell.exec(args)
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


function isKeyReturnEvent (event) {
    return (13 === event.which || 13 === event.keyCode);
};

var WebConsole = Terminal.extend({


    capabilities: {
        'dom': {}
    },

    initialize: function (container) {
        this.root = container;
        this.lines = [];
        this.history = [];
    },

    insertInput: function (listener) {
        listener = listener || this.handleInput.bind(this);
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

    start: function () {
        this.title = document.createElement('div');
        this.title.setAttribute('class','wc-title');
        this.root.appendChild(this.title);
        this.container = document.createElement('div');
        this.container.setAttribute('class', 'wc-lines');
        this.root.appendChild(this.container);
        this.setTitle('/wænd');
        this.insertInput();
        var self = this;
        self.container.addEventListener('click', function(e){
            if(self._inputField){
                self._inputField.focus();
            }
        });
        self.shell.stdout.on('data', self.write, self);
        self.shell.stderr.on('data', self.writeError, self);
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

            input.setAttribute('class', 'wc-input wc-pending');
            
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
                    input.setAttribute('class', 'wc-input wc-inactive');
                    input.setAttribute('disabled', 'disabled');
                    self.history.push(val);
                    self.insertInput();
                });
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
        this.container.appendChild(element);
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
    }

});

module.exports = exports = WebConsole;
