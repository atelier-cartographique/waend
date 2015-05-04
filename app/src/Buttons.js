/*
 * app/src/Buttons.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var layerButtons = {
    'add text': ['draw | close | create | cc | edit | set text'],
    'add line': ['draw | create'],
    'add zone': ['draw | close | create'],
    'add image': ['draw | close | create | cc | media pick | set image'],
    'import data': ['import'],
    'list features': ['lf']
};

var groupButtons = {
    'add layer': ['ic'],
    'list layers' : ['ll'],
    'set map extent': ['region print | set extent']
};

var userButtons = {
    'add map': ['ic'],
    'list maps': ['lg'],
    'upload media': ['media upload'],
    'browse medias': ['media list'],
    'logout' : ['logout']

};

var shellButtons = {
    'login' : ['login'],
    'register' : ['register'],
    'get context infos': ['get']
};


module.exports = exports = {
    'layer': layerButtons,
    'group': groupButtons,
    'user' : userButtons,
    'shell' : shellButtons,
};
