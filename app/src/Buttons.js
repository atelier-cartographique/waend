/*
 * app/src/Buttons.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var userButtons = {
    'login' : ['login'],
    'logout' : ['logout'],
    'list maps': ['lg'],
    'create map': ['ic'],
    'list medias': ['media list']
};


var groupButtons = {
'list layers' : ['ll'],
    'create layer': ['ic'],
    'set map extent': ['region print | set extent']
};


var layerButtons = {
    'list features': ['lf'],
    'add line': ['draw | create'],
    'add polygon': ['draw | close | create'],
    'add text': ['draw | close | create | cc | edit | set text'],
    'add image': ['draw | close | create | cc | media pick | set image'],
    'import data': ['import']
};

module.exports = exports = {
    'user' : userButtons,
    'group': groupButtons,
    'layer': layerButtons
};
