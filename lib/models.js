/**
 * lib/models.js
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 */

var _ = require('underscore'),
    util = require('util'),
    uuid = require('node-uuid'),
    // getBBoxVanilla = require('./bbox'),
    wellknown = require('wellknown');


//
// function getBBox (geom) {
//     var bbox = getBBoxVanilla({'type': 'Feature', 'geometry': geom});
//     if(bbox.w <= 0) {
//         bbox.w = 0.000001;
//     }
//     if(bbox.h <= 0) {
//         bbox.h = 0.000001;
//     }
//     return _.pick(bbox, 'x', 'y', 'w', 'h');
// }

function AbstractObject(){}

_.extend(AbstractObject.prototype, {
    parse: JSON.parse,
    stringify: JSON.stringify,
    prepare: function (obj) {
        if(!('id' in obj)){
            return _.extend(obj, {
                id: uuid.v4()
            });
        }
        return obj;
    },
    getParameters: function(obj) {
        var p = _.result(this, 'parameters'),
            ret = [];
        _.each(p, function(key){
            ret.push(obj[key]);
        });
        return ret;
    },
    buildFromPersistent: function (row) {
        var p = _.result(this, 'parameters'),
            ret = {};
        _.each(p, function(key){
            ret[key] = row[key];
        });
        return ret;
    }
});


function geomBuildFromPersistent (row) {
    var p = _.result(this, 'parameters'),
        ret = {};
    _.each(p, function(key){
        if('geom' === key
            && _.isString(row[key])) {
            try{
                ret[key] = JSON.parse(row[key]);
            }
            catch(err){
                ret[key] = wellknown.parse(row[key]);
            }
        }
        else{
            ret[key] = row[key];
        }
    });
    return ret;
}

function geomPrepare (obj) {
    if(!('id' in obj)){
        _.extend(obj, {
            id: uuid.v4()
        });
    }
    if('geom' in obj
        && _.isObject(obj.geom)){
        obj.geom = JSON.stringify(obj.geom);
    }
    return obj;
}

function Entity () {
    this.parameters = ['id', 'layer_id', 'user_id', 'properties', 'geom'];
}
util.inherits(Entity, AbstractObject);


function Path () {
    this.parameters = ['id', 'layer_id', 'user_id', 'properties', 'geom'];
}
util.inherits(Path, AbstractObject);

function Spread () {
    this.parameters = ['id', 'layer_id', 'user_id', 'properties', 'geom'];
}
util.inherits(Spread, AbstractObject);

Entity.prototype.buildFromPersistent = geomBuildFromPersistent;
Path.prototype.buildFromPersistent = geomBuildFromPersistent;
Spread.prototype.buildFromPersistent = geomBuildFromPersistent;

Entity.prototype.prepare = geomPrepare;
Path.prototype.prepare = geomPrepare;
Spread.prototype.prepare = geomPrepare;

function Layer () {
    this.parameters = ['id', 'user_id', 'properties'];
}
util.inherits(Layer, AbstractObject);

function User () {
    this.parameters = ['id', 'auth_id', 'properties'];
}
util.inherits(User, AbstractObject);

function Subscription () {
    this.parameters = ['id', 'user_id', 'group_id'];
}
util.inherits(Subscription, AbstractObject);

function Composition () {
    this.parameters = ['id', 'layer_id', 'group_id'];
}
util.inherits(Composition, AbstractObject);

function Group () {
    this.parameters = ['id', 'user_id', 'status_flag', 'properties'];
}
util.inherits(Group, AbstractObject);


module.exports = exports = {
    entity: new Entity(),
    path: new Path(),
    spread: new Spread(),
    layer: new Layer(),
    user: new User(),
    subscription: new Subscription(),
    composition: new Composition(),
    group: new Group()
};
