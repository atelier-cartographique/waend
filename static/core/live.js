/*
 * live.js
 *     
 * 
 * Copyright (C) 2013  Pierre Marchand <pierremarc07@gmail.com>
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

define([
    'underscore', 
    'jquery', 
    'sockjs',
    'core/logger',
    'config', 
    'core/collections',
    'plugins/user/User',
    ], 
function(_, $, S, log, config, C, User){


    function getToken(cb, ctx){
        var options = {
            type: "GET",
            url: '/token',
            dataType: 'json',
        };

        $.ajax(options)
            .done(_.bind(cb, ctx))
            .fail(log.error);
    };
    
    function Live(){
        log.debug('live.constructor');
        this._inited = false;
        this.subscribers = [];
        this._pendings = [];
        User(function(user){
                getToken(this.connect, this);
        }, this);
    };



    _.extend(Live.prototype, {
        
        connect: function(token){
            log.debug('live.connect');
            this._token = token;
            this._connection = new S(config.liveUrl),
            this._connection.onmessage = this._handleMessage.bind(this);
            this._connection.onopen = this.bootstrap.bind(this);
            this._inited = true;
        },
        
        bootstrap: function(){
            log.debug('live.bootstrap');
            var self = this;
            this._connection.send(JSON.stringify({access_token:this._token}));
            _.each(this._pendings, function(p){
                self.subscribe(p.channel, p.callback, p.ctx);
            });
            this._pendings = [];
        },
        
        _handleMessage: function(e){
            log.debug('live._handleMessage', e);
            var data;
            try{
                data = JSON.parse(e.data);
            }
            catch(e){}


            if(data)
            {
                if('channel' in data){
                    log.debug('live._handleMessage data', data);
                    var rec = _.where(this.subscribers, {channel:data.channel});
                    log.debug('live._handleMessage data', data, rec);
                    _.each(rec, function(o){
                        o.callback.apply(o.ctx, [data]);
                    });
                }
                else{
                    log.warning('live._handleMessage: no channel', data);
                }
            }
            else{
                log.warning('live._handleMessage: no data');
            }
        },

        
        subscribe:function(channel, callback, ctx){
            log.debug('live.subscribe', channel);
            
            var subscriber = {
                channel:channel,
                callback:callback,
                ctx:ctx,
            };
            
            if(this._inited 
                && this._connection.readyState == S.OPEN)
            {
                this.subscribers.push(subscriber);
                return this.subscribers.length;
            }
            
            this._pendings.push(subscriber);
            return this._pendings.length;
            
        },
        
    });
    
    var live = new Live;

    var Notification = C.Collection.extend({

        modelName: 'Notification',

        initialize: function(options){
            log.debug('Notification.initialize', options);
            live.subscribe(options.channel, 
                           this.handleNotification, this);
            this.collection = C[options.channel];
        },

        notify: function(model){
            this.trigger('notify', model);
        },

        handleNotification: function(data){
            data.ts = Date.now();
            this.add(data);
            var model = new this.collection.model({id:data.id});

            // log.debug('handleNotification', model);
            model.once('sync', this.notify, this);
            model.fetch();
        },

    });

    function notifier(channel){
        var n = new Notification({channel:channel});
        return n;
    };

    return notifier;
    
});