/*
 * app/src/Buttons.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


 var featureButtons = {
     'set name': ['get name | edit | set name'],
     'set image': ['media pick | set params.image'],
     'set color': ['get color | edit | set style.strokeStyle'],
     'set text': ['get text | edit | set params.text'],
     'go to feature' : ['gg | region set']
 };

var layerButtons = {
    'add text': [
        'draw | close | create | cc',
        'edit | set text'
    ],
    'add line': ['draw | create'],
    'add zone': ['draw | close | create'],
    'add image': [
        'draw | close | create | cc',
        'media pick | set image'
    ],
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
    'help' : ['help'],
    'login' : ['login'],
    'register' : ['register'],
    'get context infos': ['get']
};


module.exports = exports = {
    'feature': featureButtons,
    'layer': layerButtons,
    'group': groupButtons,
    'user' : userButtons,
    'shell' : shellButtons,
};
