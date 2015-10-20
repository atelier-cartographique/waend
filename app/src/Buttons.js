/*
 * app/src/Buttons.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var semaphore = require('../lib/Semaphore');

function loginButton(console, button) {
    var isLogged = false;
    button.setAttribute('class','wc-button icon-login');
    button.innerHTML = 'Login';

    button.addEventListener('click', function(){
        if(!isLogged) {
            console.runCommand('login');
        }
        else {
            console.runCommand('logout');
        }
    });

    semaphore.on('user:login', function (user) {
        isLogged = true;
        button.innerHTML = 'Logout';
    });
    semaphore.on('user:logout', function () {
        isLogged = false;
        button.innerHTML = 'Login';
    });
}

 var shellButtons = {
     'Help' : ['help'],
     'Login' : loginButton,
     'About' : ['cc /2232525b-a8cb-4579-af24-2b5629ba43b5/3a7f695b-cd37-43f4-9a7a-efb1e422aef8?c=view']
 };


 var userButtons = {
     'List maps': ['lg'],
     'Add map': ['ic'],
     'Upload image': ['media upload'],
     'Browse images': ['media list'],
     'My profile' : ['cc /me','lg']

 };

 var groupButtons = {
     'List layers' : ['ll'],
     'Add layer': ['ic'],
     'Show - Hide layers': ['visible | set visible'],
     'Re-order layers': ['visible | edit | set visible'],
     'Set map extent': ['region get | set extent']
 };


 var layerButtons = {
     'Trace': ['trace | create'],
     'Draw line': ['draw | create'],
     'Draw zone': ['draw | close | create'],
     'Import geo-datas': ['import','lf'],
     'List features': ['lf']
 };

 var featureButtons = {
     'Set name': ['get name | edit | set name'],
     'Set image': ['media pick | set params.image'],
     'Set color': ['get color | edit | set style.strokeStyle'],
     'Set text': ['get text | edit | set params.text'],
     'Edit geometry' : ['gg | trace | sg'],
     'Zoom to feature' : ['gg | region set'],
     'Delete feature' : ['del_feature', 'lf']

 };


module.exports = exports = {
    'shell' : shellButtons,
    'user' : userButtons,
    'group': groupButtons,
    'layer': layerButtons,
    'feature': featureButtons,
};
