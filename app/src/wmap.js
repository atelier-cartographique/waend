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
    MapLayer = require('./Layer'),
    Source = require('./Source'),
    Map = require('./Map');


function init () {
    var elementWC = document.querySelector('#wc'),
        wc = new WebConsole(elementWC),
        layer = new MapLayer(),
        source = new Source(),
        map = new Map({target: 'map'});

    // map.getView().setZoom(0);
    wc.start();
};

document.onreadystatechange = function () {
    if (document.readyState == "interactive") {
        init();
    }
}