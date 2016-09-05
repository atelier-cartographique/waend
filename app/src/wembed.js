/*
 * app/src/wview.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



import config from '../config';

import Bind from '../lib/Bind';
import Sync from '../lib/Sync';
import semaphore from '../lib/Semaphore';
import WebConsole from './WebConsole';
import LayerProvider from './LayerProvider';
import SourceProvider from './SourceProvider';
import WMap from './WaendMap';
import ModelConfig from './ModelConfig';

Bind.configureModels(ModelConfig.configurator);

function init () {
    const elementWC = document.querySelector('#wc');
    const elementMap = document.querySelector('#map');
    const wc = new WebConsole(elementWC, elementMap);
    const layer = new LayerProvider();
    const source = new SourceProvider();
    const wmap = new WMap({'root': elementMap});

    Sync.configure(config.notify);

    const pager = document.createElement('div');

    wc.shell.env.map = wmap;
    wc.start();
    wc.hide();
    semaphore.on('shell:change:context', ctxIndex => {
        if (ctxIndex > 1) {
            wc.shell.exec('embed');
        }
    });
}

document.onreadystatechange = () => {
    if (document.readyState === "interactive") {
        init();
    }
};
