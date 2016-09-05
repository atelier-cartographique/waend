/*
 * app/src/wc.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



import WebConsole from './WebConsole';


function init () {
    const root = document.querySelector('#wc');
    const wc = new WebConsole(root);
    wc.start();
}

document.onreadystatechange = () => {
    if (document.readyState == "interactive") {
        init();
    }
};
