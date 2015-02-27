/*
 * dataTypes.js
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

 define(['backbone', 'underscore', 'jquery', 'core/eproxy', 'config', 'core/logger'],
function(Backbone, _, $, P, config, logger)
{
    'use strict';
        
    var apiUrl = config.apiUrl;
    var apiName = config.apiName || 'apiNN';
    
    function makePath(){
        var parts = _.toArray(arguments);
        // Remove leading and trailing slashes
        parts = _.map(parts, function (part) {
            return part.replace(/^\/|\/$/g, '');
        }, this);
        return parts.join('/');
    };
        
    function FragmentException(msg){
        this.message = msg;
        this.name = "FragmentException";
    };
    
    function objectHash(o){
        var ks = _.keys(o).sort();
        var ret = '..';
        _.each(ks, function(k){
            ret += k + '..' + JSON.stringify(o[k]);
        });
        return ret;
    };
    
    
    /**
     * Fragment constructor
     *
     * Fragment objects manage Backbone collections and allow us to iterate trough page of results for a given
     * collection.
     * Please note that next must be called on the fragment object before you are able to iterate over the results.
     *
     * @param options
     * @constructor
     */
    function Fragment(options){
        if(!('query' in options) 
            || !('collection' in options)){
                throw new FragmentException('A fragment needs to be instantiated with a query and a collection');
            }
        this.qname = options.query;
        this.current = -1;
        this.totalPages = 0;
        this.totalItems = 0;
        this.ready = false;
                
        _.extend(this, options);
        
        this.initialize();
    };
    
    _.extend(Fragment.prototype, {
        
        _endInit: function(page){
            this.totalPages = page.numPages;
            this.totalItems = page.count;
            this.ready = true;
            this.trigger('ready');
        },
        
        initialize: function(){
            this.collection.queryPage(
                this.qname,
                this.query,
                0,
                this._endInit,
                this
               );
        },
        
        rewind: function(){
            this.current = 0;
            return this;
        },
        
        next: function(){
            if(!this.ready){
                this.once('ready', this.next, this);
                return this;
            }
            var pageReq = this.current + 1;
            if(pageReq <= this.totalPages){
                this.collection.queryPage(this.qname, this.query, pageReq, 
                                          _.partial(this._end, 'next'), this);
            }
            else if(0 === this.totalPages 
                && 0 === this.current){
                if(this.callback 
                    && 'function' === typeof(this.callback)){
                        this.callback.apply(this.context, [{ "number": 0, "count": 0, "num_pages": 0, "results": [] }]);
                }
                else{
                    this.trigger('next', { "number": 0, "count": 0, "num_pages": 0, "results": [] });
                }
            }
        },

        /**
        * Retreives previous page, and triggers callback when data is available
        */
        previous: function(){
            if(!this.ready){
                this.once('ready', this.previous, this);
                return this;
            }
            var pageReq = this.current - 1;
            if(pageReq > 0){
                this.collection.queryPage(this.qname, this.query, pageReq, 
                                          _.partial(this._end, 'previous'), this);
            }
            return this;
        },
        
        /**
        * Does an API-call for the requested page. Callback is invoked
        * when data is available. If no callback is available, the 'at'
        * event is triggered
        *
        * Does not 
        * 
        * @param pageReq int requested page
        * @return Cursor
        */
        at: function(pageReq){
            if(!this.ready){
                this.once('ready', _.partial(this.at, pageReq), this);
                return this;
            }
            if(pageReq <= this.totalPages){
                this.collection.queryPage(this.qname, this.query, pageReq, 
                                          _.partial(this._end, 'at'), this);   
            }
            return this;
        },

        /**
        * Callback, invoked after a query. If the fragment
        * has a callback the callback is invoked. Otherwise
        * an event with eventName is triggered
        * 
        * @param eventName string
        * @param page
        */
        _end: function(eventName, page) {
            if(this.callback 
                && 'function' === typeof(this.callback)){
                    this.callback.apply(this.context, [page]);
            }
            else{
                this.trigger(eventName, page);
            }
        },
        
    }, Backbone.Events);


    var Collection = Backbone.Collection.extend({

        apiUrl: apiUrl,

        constructor: function(){
            Backbone.Collection.apply(this, arguments);
            this.fragments = {};
        },

        initialize:function(options){
            this.fragmentPointer = {};
            if(this.proxyName)
            {
                 P.register(this.proxyName, this);
            }
            this._generateModel();
        },
        
        /**
         * _generateModel
         *
         * generates corresponding model for this collection
         * based on declared model name and API call
         * 
         */
        _generateModel: function(){
            this.model = Backbone.Model.extend({
                urlRoot: apiUrl + this.modelName + '/',
                idAttribute: 'id',
                getProperties: function(){
                    return this.get('properties');
                },
                setProperties: function(props){
                    this.set({properties:props});
                    this.trigger('change');
                    return this;
                },
            });
        },
        

        sync: function(method, model, options){
            var backboneOptions = _.omit(options, apiName);
            var apiOptions = _.result(options, apiName) || {};
            var path = '';
            var params = '';

            if('read' === method){
                if('query' in apiOptions){
                    backboneOptions.url = makePath(apiUrl,
                                                    this.modelName, 
                                                    apiOptions.query); 
                }
                else{
                    backboneOptions.url = makePath(apiUrl,
                                                    this.modelName) + '/'; 
                }
            }

            if('params' in apiOptions){
                backboneOptions.url += '?' + $.param(apiOptions.params);
            }
            
            return Backbone.sync.apply(this,[method, model, backboneOptions]);
        },

        
        parse: function(response, options){
            return response.results;
        },

        getCursor: function(options){
            var f = new Fragment(_.extend({collection:this}, options));
            return f.next();
        },

        resetFragment: function(name){
            delete this.fragments[name];
            delete this.fragmentPointer[name];
        },
        
        addFragment: function(name, data, callback, ctx){
            if(!this.fragments[name])
            {
                this.fragments[name] = {};
            }

            var fragment = {};
            
            fragment.count = data.count;
            fragment.numPages = data.numPages;
            fragment.page = data.page;
            fragment.references = [];
            _.each(data.results, function(obj){
                var model = this.get(obj.id);
                fragment.references.push(model);
            }, this);
            
            this.fragments[name][data.page] = fragment;

            this.fragmentAvailable(fragment, callback, ctx);
        },

        queryPage: function(name, query, page, callback, ctx){
            logger.debug('queryPage', name, page);
            var self = this;
            
            if (name in this.fragments 
                && page in this.fragments[name]) {
                this.fragmentAvailable(this.fragments[name][page], callback, ctx);
            }
            else {
                var params = {page:page};

                
                var fetchOptions = {
                    success:function(col, resp, opt){
                        self.addFragment(name, resp, callback, ctx);
                    }
                };

                fetchOptions[apiName] =  {
                        query: query,
                        params: params,
                    };

                this.fetch(fetchOptions);
            }
        },

        fragmentAvailable: function(fragment, callback, ctx) {
            if(callback){
                callback.apply(ctx, [fragment]);
            }
            else{
                this.trigger(name, fragment);
            }
        },


        getOrCreate:function(id, callback, checkList, ctx){
            var model = this.get(id);
            if(!Array.isArray(checkList))
            {
                ctx = checkList;
                checkList = undefined;
            }
            if(!model)
            {
                model = new this.model({id:id});
                this.add(model);
                if(callback){
                    model.once('sync', function(){
                        callback.apply(ctx, [model]);
                    });
                }
                model.fetch();
            }
            else
            {
                if(callback){
                    if(checkList)
                    {
                        for(var cidx=0; cidx < checkList.length; cidx++)
                        {
                            if(!model.has(checkList[cidx]))
                            {
                                model.once('sync', function(){
                                    callback.apply(ctx, [model]);
                                });
                                model.fetch();
                                return model;
                            }
                        }
                        callback.apply(ctx, [model]);
                    }
                    else
                    {
                        callback.apply(ctx, [model]);
                    }
                }
            }
            return model;
        },
    });

	return {
		Collection: Collection,
		Fragment: Fragment,
	}

});