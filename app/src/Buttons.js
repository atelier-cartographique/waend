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
     'edit geometry' : ['gg | trace | sg'],
     'zoom to feature' : ['gg | region set'],
     'delete feature' : ['del_feature', 'lf']

 };

var layerButtons = {
    'trace': ['trace | create'],
    'draw line': ['draw | create'],
    'draw zone': ['draw | close | create'],
    'import datas': ['import','lf'],
    'list features': ['lf']
};

var groupButtons = {
    'add layer': ['ic'],
    'list layers' : ['ll'],
    'visible layers': ['visible | set visible'],
    're-order layers': ['visible | edit | set visible'],
    'set map extent': ['region get | set extent']
};

var userButtons = {
    'add map': ['ic'],
    'list my maps': ['lg'],
    'upload image': ['media upload'],
    'browse images': ['media list'],
    'my profile' : ['cc /me','lg']

};

var shellButtons = {
    'help' : ['help'],
    'login' : ['login']
};


module.exports = exports = {
    'feature': featureButtons,
    'layer': layerButtons,
    'group': groupButtons,
    'user' : userButtons,
    'shell' : shellButtons,
};
