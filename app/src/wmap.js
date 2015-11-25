/*
 * app/src/wmap.js
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

    wc.shell.env.map = wmap; // there might be a better way, but we want this result.
    wc.start();

    if (window.waendUser) {
        Bind.get()
            .getMe()
            .then(function(user){
                wc.shell.loginUser(user);
            });
    }
    else {
        semaphore.signal('shell:change:context', 0, []);
    }

    Sync.configure(config.notify);
}

document.onreadystatechange = function () {
    if (document.readyState === "interactive") {
        init();
    }
};
