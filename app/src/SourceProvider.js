/*
 * app/src/SourceProvider.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    Promise = require('bluebird'),
    region = require('../lib/Region'),
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore'),
    Bind = require('../lib/Bind'),
    Source = require('./Source');


var binder = Bind.get();


// declarations
function SourceProvider () {
    var self = this;
    self.layerSources = [];

    semaphore.on('shell:change:context', function(ctxIndex, path){
        if (ctxIndex > 1) {
            self.currentPath = path;
            self.updateGroup(path[0], path[1]);
        }
    });
    semaphore.on('create:layer', function(){
        self.updateGroup(self.currentPath[0], self.currentPath[1], true);
    });
}

// implementations
SourceProvider.prototype.updateGroup = function(userId, groupId, opt_force) {
    var self = this;
    if (!opt_force && self.groupId === groupId) {
        return;
    }
    self.userId = userId;
    self.groupId = groupId;
    binder.getGroup(userId, groupId)
        .then(function(group) {
            self.group = group;
            self.loadLayers()
                .then(function(){
                    self.updateLayers();
                    semaphore.signal('source:change', self.getSources());
                })
                .catch(console.error.bind(console));
        });
};


SourceProvider.prototype.clearLayers = function () {
    _.each(this.layerSources, function(layer){
        layer.clear();
    }, this);
    this.layerSources = [];
};


SourceProvider.prototype.updateLayers = function () {
    _.each(this.layerSources, function(layer){
        layer.update();
    }, this);
};


SourceProvider.prototype.loadLayers = function () {
    var self = this;
    self.group.once('set',function(key) {
        if ('visible' === key) {
            self.updateGroup(self.userId, self.groupId, true);
        }
    });
    if (self.group.has('visible')) {
        var layers = self.group.get('visible');
        self.clearLayers();
        return Promise.reduce(layers, function(total, item, index) {
            var lidx = layers[index];
            return binder.getLayer(self.userId, self.groupId, lidx)
                         .then(function(layer){
                             self.layerSources.push(new Source(
                                 self.userId,
                                 self.groupId,
                                 layer));
                         });
        }, 0);
    }

    return binder
        .getLayers(self.userId, self.groupId)
        .then(function(layers){
            self.clearLayers();
            for (var lidx = 0; lidx < layers.length; lidx++) {
                self.layerSources.push(new Source(self.userId, self.groupId, layers[lidx]));
            }
            return Promise.resolve();
        })
        .catch(console.error.bind(console));
};

SourceProvider.prototype.getSources = function () {
    return this.layerSources;
};

module.exports = exports = SourceProvider;
