/*
 * app/lib/User.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var Context = require('./Context'),
    Bind = require('./Bind');


function listGroups () {

};

function searchGroups (term) {

};

function createUser (email, password) {

};

function editUser () {

};

var User = Context.extend({
    name: 'user',
    commands:{
        list: listGroups,
        search: searchGroups,
        create: createUser,
        edit: editUser
    }
});


module.exports = exports = User;
