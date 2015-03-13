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

var Terminal = require('../lib/Terminal');

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
        args = this.args;
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
        this.container = container;
        this.lines = [];
        this.history = [];
    },

    insertInput: function (listener) {
        listener = listener || this.handleInput.bind(this);
        this.input = document.createElement('input');
        this.input.setAttribute('class', 'wc-input');
        this.input.setAttribute('type', 'text');
        this.container.appendChild(this.input);
        this.input.addEventListener('keypress', listener, false);
        this.input.focus();
    },

    setTitle: function (title) {
        this.title.innerHTML = title;
    },

    start: function () {
        this.title = document.createElement('div');
        this.title.setAttribute('class','wc-title');
        this.container.appendChild(this.title);
        this.setTitle('/wænd');
        this.insertInput();
    },

    handleInput: function (event) {
        if(isKeyReturnEvent(event)) {
            var self = this,
                input = self.input,
                val = input.value.trim(),
                toks = self.commandLineTokens(val);
            
            input.setAttribute('class', 'wc-input wc-pending');
            
            self.shell.exec(toks)
                .then(function(){
                    console.log.apply(console, arguments);
                })
                .catch(function(err){
                    console.error(err);
                })
                .finally(function(){
                    input.setAttribute('class', 'wc-input wc-inactive');
                    self.history.push(val);
                    self.insertInput();
                });
        }
    },

    read: function (prompt) {
        var self = this;
        var resolver = function (resolve, reject) {
            var handler = function (event) {
                if(isKeyReturnEvent(event)) {
                    var input = self.input,
                        val = input.value.trim();
                        resolve(val);
                }
            };
            self.insertInput(handler);
        };

        return (new Promise(resolver));
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

    makeCommand: function (options) {
        return (new WebCommand(this, options));
    }

});

module.exports = exports = WebConsole;
