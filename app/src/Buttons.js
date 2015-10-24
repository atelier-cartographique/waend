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
     'Help' : {
         type: 'display',
         command: ['help']
     },
     'Login' : {
         type: 'function',
         command: loginButton
     },
     'About' : {
         type: 'shell',
         command: ['cc /2232525b-a8cb-4579-af24-2b5629ba43b5/3a7f695b-cd37-43f4-9a7a-efb1e422aef8', 'view'],
     },
 };


 var userButtons = {
     'List maps': {
        type: 'embed',
        command: ['lg']
     },
     'Add map': {
        type: 'display',
        command: ['mkgroup']
    },
     'Upload image': {
         type: 'display',
         command: ['media upload']
     },
     'Browse images': {
         type: 'display',
         command: ['media pick']
     },
     'My profile' : {
         type: 'shell',
         command: ['cc /me', 'get']
     }

 };

 var groupButtons = {
     'List layers' : {
         type: 'embed',
         command: ['ll']
     },
     'Add layer': {
         type: 'display',
         commmand: ['mklayer']
     },
     'Show - Hide layers': {
         type: 'display',
         command: ['visible | set visible']
     },
     'Re-order layers': {
         type: 'display',
         command: ['visible | edit | set visible']
     },
     'Set map extent': {
         type: 'shell',
         command: ['region get | set extent']
     }
 };


 var layerButtons = {
     'Trace': {
         type: 'display',
         command: ['trace | create']
     },
     'Draw line': {
         type: 'display',
         command: ['draw | create']
     },
     'Draw zone': {
         type: 'display',
         command: ['draw | close | create']
     },
     'Import geo-datas': {
         type: 'display',
         command: ['import','lf']
     },
     'List features': {
         type: 'embed',
         command: ['lf']
     }
 };

 var featureButtons = {
     'Set name': {
         type: 'display',
         command: ['get name | edit | set name']
     },
     'Set image': {
         type: 'display',
         command: ['media pick | set params.image']
     },
     'Set color': {
         type: 'display',
         command: ['get color | edit | set style.strokeStyle']
     },
     'Set text': {
         type: 'display',
         command: ['get text | edit | set params.text']
     },
     'Edit geometry' : {
         type: 'display',
         command: ['gg | trace | sg']
     },
     'Zoom to feature' : {
         type: 'shell',
         command: ['gg | region set']
     },
     'Delete feature' : {
         type: 'shell',
         command: ['del_feature', 'lf']
     }

 };


module.exports = exports = {
    'shell' : shellButtons,
    'user' : userButtons,
    'group': groupButtons,
    'layer': layerButtons,
    'feature': featureButtons,
};
