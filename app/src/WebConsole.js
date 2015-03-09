/*
 * app/lib/WebConsole.js
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


function WebCommand (options) {
    this.cmd = options.cmd;
    this.args = options.args;
    this.text = options.text;
};

WebCommand.prototype.toString = function () {
    return this.text.toString();
};

WebCommand.prototype.toDomFragment = function () {
    var element = document.createElement('a'),
        textElement = document.createTextNode(this.text.toString());
    element.setAttribute('href', '#');
    element.setAttribute('class', 'wc-command');
    element.appendChild(textElement);
    return element;
};


var WebConsole = Terminal.extend({


    capabilities: {
        'dom': {}
    },

    initialize: function (container) {
        this.container = container;
        this.lines = [];
        this.history = [];
    };

    insertInput: function () {
        this.input = document.createElement('input');
        this.input.setAttribute('class', 'wc-input');
        this.input.setAttribute('type', 'text');
        this.container.appendChild(this.input);
        this.input.addEventListener('keypress', this.handleInput.bind(this), false);
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
        if(13 === event.which || 13 === event.keyCode) {
            var input = this.input,
                val = input.value.trim()
                toks = this.commandLineTokens(val);
            
            this.emit('input', toks);
            input.removeEventListener('keypress', this.handleInput.bind(this), false);
            this.history.push(val);
            this.insertInput();
        }
    }

    write: function (fragment) {
        var element = document.createElement('div');
        element.setAttribute('class', 'wc-line');
        if(fragment instanceof WebCommand){
            var df = fragment.toDomFragment();
            var self = this;
            df.addEventListener('click', function(){
                self.emit('input', [fragment.cmd].concat(fragment.args));
            }, false);
            element.appendChild(df);
        }
        else{
            var textElement = document.createTextNode(fragment.toString());
            element.appendChild(textElement);
        }
        this.container.appendChild(element);
    },

    makeCommand: function (options) {
        return (new WebCommand(options));
    }

});

module.exports = exports = WebConsole;
