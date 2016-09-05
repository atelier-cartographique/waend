/*
 * app/src/Buttons.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import semaphore from '../lib/Semaphore';

function loginButton(console, button) {
    let isLogged = false;
    button.setAttribute('class','wc-button icon-login');
    button.innerHTML = 'Login';

    button.addEventListener('click', () => {
        if(!isLogged) {
            console.runCommand('login');
        }
        else {
            console.runCommand('logout');
        }
    });

    semaphore.on('user:login', user => {
        isLogged = true;
        button.innerHTML = 'Logout';
    });
    semaphore.on('user:logout', () => {
        isLogged = false;
        button.innerHTML = 'Login';
    });
}

const shellButtons = {
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


const userButtons = {
   'My profile' : {
       type: 'embed',
       command: ['cc /me', 'get']
   },
   'Add map': {
       type: 'display',
       command: ['mkgroup']
   },
   'List maps': {
       type: 'embed',
       command: ['lg']
   },
   'Upload image': {
        type: 'display',
        command: ['media upload']
   },
    'Browse images': {
        type: 'embed',
        command: ['media list']
   }
};

const groupButtons = {
   'Add layer': {
       type: 'display',
       command: ['mklayer']
   },
    'List layers' : {
        type: 'embed',
        command: ['ll']
    },
    'Show - Hide layers': {
        type: 'display',
        command: ['visible']
    },
    // 'Re-order layers': {
    //     type: 'display',
    //     command: ['visible | edit | set visible']
    // },
    'Set map extent': {
        type: 'shell',
        command: ['region get | set extent']
    },
    'Select Features': {
        type: 'display',
        command: ['select']
    },

    'View mode': {
        type: 'shell',
        command: ['view']
    }

};


const layerButtons = {
   'Style layer': {
       type: 'embed',
       command: ['sl']
   },
    'Trace': {
        type: 'display',
        command: ['trace | create | cc']
    },
    'Draw line': {
        type: 'display',
        command: ['draw | create | cc']
    },
    'Draw zone': {
        type: 'display',
        command: ['draw | close | create | cc']
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

const featureButtons = {
   'Style feature': {
       type: 'embed',
       command: ['sf']
   },
    'Set name': {
        type: 'display',
        command: ['get name | edit | set name']
    },
    'Set image': {
        type: 'display',
        command: ['media pick | set params.image']
    },
    'Set text': {
        type: 'display',
        command: ['del params.image', 'get params.text | edit | set params.text']
    },
    'Edit shape' : {
        type: 'display',
        command: ['gg | trace | sg']
    },
    'Duplicate shape' : {
        type: 'shell',
        command: ['gg | create | cc']
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


export default {
    'shell' : shellButtons,
    'user' : userButtons,
    'group': groupButtons,
    'layer': layerButtons,
    'feature': featureButtons,
};
