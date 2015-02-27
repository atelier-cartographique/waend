/*
 * collections.js
 *
 *
 * Copyright (C) 2013  Pierre Marchand <pierremarc07@gmail.com>, Gijs de Heij <gijs@de-heij.com>
 *
 * This program is free software: you can redistribute it and/or modify *
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

/**

*/

define(['core/dataTypes'],
function(DT)
{

    var Collection = DT.Collection.extend({
        constructor: function () {
            DT.Collection.apply(this, arguments);
            // console.warn('Collections.Collection is deprecated. Please instantiate a new Collection through DataTypes');
        }
    });

    /**
    * Collection-prototypes container
    */
    var C = {};



    C.User = DT.Collection.extend({
        modelName: 'User',
        
        me: function(callback, ctx){
            return this.getCursor({
                query: 'me',
                callback: callback,
                context: ctx,
            });
        },
        
        
        browse: function(callback, ctx){
            return this.getCursor({
                query: '',
                callback: callback,
                context: ctx,
            });
        },

    });    

    C.Layer = DT.Collection.extend({
        modelName: 'Layer',

        forUser: function(userId, callback, ctx){
            return this.getCursor({
                query: 'u/'+userId,
                callback: callback,
                context: ctx,
            });
        },

        browse: function(callback, ctx){
            return this.getCursor({
                query: '',
                callback: callback,
                context: ctx,
            });
        },
        
    });

    C.Entity = DT.Collection.extend({
        modelName: 'Entity',
        
        forLayer: function(layerId, callback, ctx){
            return this.getCursor({
                query: 'l/'+layerId,
                callback: callback,
                context: ctx,
            });
        },

    });

    C.Group = DT.Collection.extend({
        modelName: 'Group',
        
        forLayer: function(layerId, callback, ctx){
            return this.getCursor({
                query: 'l/'+layerId,
                callback: callback,
                context: ctx,
            });
        },

        byUser: function(callback, ctx){
            return this.getCursor({
                query: 'u',
                callback: callback,
                context: ctx,
            });
        },

        browse: function(callback, ctx){
            return this.getCursor({
                query: '',
                callback: callback,
                context: ctx,
            });
        },
        
        subscribe: function(groupId, callback, ctx){
            var self = this;
            this.getOrCreate(groupId, function(model){
                model.urlRoot = self.apiUrl + 'group/subscribe/';
                model.save();
                model.once('sync', function(){
                    callback.apply(ctx, [model]);    
                });
            }, null, this);
        },

        unsubscribe: function(groupId, callback, ctx){
            var self = this;
            this.getOrCreate(groupId, function(model){
                model.urlRoot = self.apiUrl + 'group/unsubscribe/';
                model.save();
                model.once('sync', function(){
                    callback.apply(ctx, [model]);    
                });
            }, null, this);
        },

        attach: function(groupId, layerId, callback, ctx){
            var self = this;
            this.getOrCreate(groupId, function(model){
                model.urlRoot = self.apiUrl + 'group/attach/'+layerId+'/';
                model.save();
                model.once('sync', function(){
                    callback.apply(ctx, [model]);    
                });
            }, null, this);
        },

        detach: function(groupId, layerId, callback, ctx){
            var self = this;
            this.getOrCreate(groupId, function(model){
                model.urlRoot = self.apiUrl + 'group/detach/'+layerId+'/';
                model.save();
                model.once('sync', function(){
                    callback.apply(ctx, [model]);    
                });
            }, null, this);
        },

    });

    var collections = {}
    
    for(var c in C)
    {
        collections[c] = new C[c];
    }

    collections.Collection = Collection;

    return collections;
});
