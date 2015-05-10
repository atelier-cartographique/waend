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
            self.updateGroup(path[0], path[1]);
        }
    });

}

// implementations
SourceProvider.prototype.updateGroup = function(userId, groupId) {
    var self = this;
    if (self.groupId === groupId) {
        return;
    }
    self.userId = userId;
    self.groupId = groupId;
    self.loadLayers()
        .then(function(){
            self.updateLayers();
            semaphore.signal('source:change', self.getSources());
        })
        .catch(console.error.bind(console));
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
    return binder
        .getLayers(self.userId, self.groupId)
        .then(function(layers){
            self.clearLayers();
            for (var lidx = 0; lidx < layers.length; lidx++) {
                console.log('SourceProvider load layer', layers[lidx].id);
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
