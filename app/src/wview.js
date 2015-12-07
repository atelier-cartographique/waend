/*
 * app/src/wview.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



var config = require('../../config'),
    Bind = require('../lib/Bind'),
    Sync = require('../lib/Sync'),
    semaphore = require('../lib/Semaphore'),
    WebConsole = require('./WebConsole'),
    LayerProvider = require('./LayerProvider'),
    SourceProvider = require('./SourceProvider'),
    WMap = require('./WaendMap'),
    ModelConfig = require('./ModelConfig');

Bind.configureModels(ModelConfig.configurator);

function init () {
    var elementWC = document.querySelector('#wc'),
        elementMap = document.querySelector('#map'),
        wc = new WebConsole(elementWC, elementMap),
        layer = new LayerProvider(),
        source = new SourceProvider(),
        wmap = new WMap({'root': elementMap});

    Sync.configure(config.notify);

    var pager = document.createElement('div');

    wc.shell.env.map = wmap;
    wc.start();
    wc.hide();
    semaphore.on('shell:change:context', function(ctxIndex){
        if (ctxIndex > 1) {
            wc.shell.exec('view');
        }
    });
}

document.onreadystatechange = function () {
    if (document.readyState === "interactive") {
        init();
    }
};
