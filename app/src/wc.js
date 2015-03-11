/*
 * app/src/wc.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



var WebConsole = require('./WebConsole');


function init () {
    var root = document.querySelector('#wc');
    var wc = new WebConsole(root);
    wc.start();
};

document.onreadystatechange = function () {
    if (document.readyState == "interactive") {
        init();
    }
}