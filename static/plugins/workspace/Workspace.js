/*
 * workspace/Workspace.js
 *     
 * 
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
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
	'bootstrap',
	'backbone',
	'config',
	'core/logger',
	'core/types',
	'core/collections', 
	'leaflet', 
	'leaflet-draw', 
	'core/template',
	'plugins/user/User',
	'plugins/workspace/Subscription',
	'plugins/workspace/Notification'
	], 
function(_, bootstrap, B, config, log, T, C, L, LD, TP, User, Subscription, Notification){


	function MapEventHandler(options){
			this.map = options.map;
			this.attachHandlers();
	};

	var mapDefaults = {
		center: [0,0],
		crs : 'EPSG4326',
		zoom: 10,
	}

	_.extend(MapEventHandler.prototype, {
		
		attachHandler: function(event, handler){
			this.map.on(event, _.bind(this[handler], this));
		},

		attachHandlers: function(){
			var self = this;
			_.each(self.events, function(method, k){
				self.attachHandler(k, method);
			});
		},

		events: {
			'draw:created' : 'create',
		},

		create: function(event){
			var type = event.layerType;
        	var layer = event.layer;
        	var geoJSON = layer.toGeoJSON();
        	log.debug('create', geoJSON);

    		// if (type === 'marker') {
		    //     // Do marker specific actions
		    // }

		    this.trigger('create', layer);
		    // this.map.addLayer(layer);
		},

	}, B.Events);


	var Workspace = T.View.extend({

		className: 'workspace',
		template: 'workspace/main',

		initialize: function(options){
			this.subscription = new Subscription;
			this.notification = new Notification;
			var self = this;
			User(function(user){
				self.user = user;
				self.trigger('user:ready', user);
			});
		},

		setupMap: function(){
			if(this.map) return;
			var mapConfig = _.defaults(_.extend({}, config.map), mapDefaults);
			var anchors = this.collectAnchors();
			var mapElement = anchors.$map[0];
			log.debug('setupMap', mapElement);
			this.map = L.map(mapElement, {
				drawControl: true,
			    center: mapConfig.center,
			    crs: L.CRS[mapConfig.crs],
			    zoom: mapConfig.zoom,
			});

			if('base' in mapConfig){
				var base = mapConfig.base;
				if('tile' === base.type){
					this.baseLayer = L.tileLayer(base.url, base.options).addTo(this.map);
				}
			}

			this.handler = new MapEventHandler({map:this.map});
			this.map.WEventHandler = this.handler;
			// this.handler.on('create', function(layer){
			// 	if(this.layerManager.getCurrentLayer()){
			// 		this.layerManager.getCurrentLayer().createFeature(layer);
			// 	}
			// }, this);

			
			this.subscription.start(this.map, this.user);
			
		},

		render: function(){
			if(this.user){
				var data = {user:this.user.toJSON()};
				TP.render(TP.name(this.template), this, function(t){
					this.$el.html(t(data));
					// this.attachToAnchor(this.layerManager.render(), 'layers');
					this.attachToAnchor(this.subscription.render(), 'groups');
					this.attachToAnchor(this.notification.render(), 'notifications');
					this.setupMap();
				});
			}
			else{
				this.once('user:ready', this.render, this);
			}
			return this;
		},

	});

	return Workspace;

});
