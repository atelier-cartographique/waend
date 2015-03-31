/*
 * app/src/wmap.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



var WebConsole = require('./WebConsole'),
    LayerProvider = require('./LayerProvider'),
    SourceProvider = require('./SourceProvider'),
    Map = require('./ThreeMap');


function init () {
    var elementWC = document.querySelector('#wc'),
        elementMap = document.querySelector('#map'),
        wc = new WebConsole(elementWC),
        layer = new LayerProvider(),
        source = new SourceProvider(),
        map = new Map(elementMap);
        
    wc.start();
    wc.shell.env.map = map; // there might be a better way, but we want this result.
};

document.onreadystatechange = function () {
    if (document.readyState == "interactive") {
        init();
    }
}