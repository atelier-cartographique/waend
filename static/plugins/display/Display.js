/*
 * display/Display.js
 *     
 * 
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * This program is free software: you can redistribute it and/or modify 
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
	'core/logger',
	'underscore',
	'config',
	'leaflet',
	'core/eproxy',
	'core/types',
	'core/collections',
	'core/template',
	'plugins/display/Layer',
	'plugins/user/User',
	],	 
function (log, _, config, L, proxy, T, C, TP, Layer, User) {
	'use strict';


	var LayerItem = T.Subview.extend({
		templateName: 'display/layer-item',
		tagName: 'tr',

		events: {
			'click [data-role=zoom]' : 'zoom',
		},

		viewEvents:{
			'rendered' : 'tooltips',
		},

		initialize: function(options){

			C.Layer.getOrCreate(options.model.id, function(layer){
				this.layer = new Layer(options);
				this.model = layer;
				this.markReady();
			}, ['user'], this);
			
		},


		templateData:function (){
			log.debug('templateData', this.model.id);
			var props = this.model.get('properties');
			var user = this.model.get('user');

			var description = props.description 
							  ? props.description
							  : '*';
			var excerpt = description.split(' ').slice(0,4).join(' ');
			var data = {
				id : this.model.id,
				name: props.name,
				description: description,
				excerpt: excerpt,
				author: user.name , 
			};
			return data;
		},



		zoom: function(){
			this.layer.zoomLayer();
		},



		tooltips: function(){
	        this.$el.tooltip({selector: '[data-toggle="tooltip"]'});
		}

	});


	var mapDefaults = {
		center: [0,0],
		crs : 'EPSG4326',
		zoom: 10,
	}

	var Display = T.BView.extend({

		templateName: 'display/display',
		className: "display",



		initialize: function(options){
			this.once('rendered', this.setupMap, this); 
			User(function(user){
				this.user = user;
				this.trigger('user:ready');
			}, this);
		},

		setupMap: function(){
			if(this.map){
				this.map.remove();
			}
			var mapConfig = _.defaults(_.extend({}, config.map), mapDefaults);
			var anchors = this.collectAnchors();
			var mapElement = anchors.$map[0];
			this.map = L.map(mapElement, {
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
			log.debug('Display.setupMap');
			this.trigger('map:rendered');
		},

		templateData: function(){
			var data = this.group ? this.group.toJSON() : {};
			var props = ('properties' in data) ? data.properties : {};
			return props;
		},

		renderLayer: function (attrs){
			var layer = C.Layer.add(attrs);
			var layerItem = new LayerItem({
				model: layer,
				map: this.map,
			});
			this.attachToAnchor(layerItem.render(), 'layers');
		},

		load: function(mapId){
			log.debug('Display.load', mapId);

			var self = this;
			if(!self.user){
				self.once('user:ready', function(){
					self.load(mapId);
				});
				return;
			}
			C.Group.getOrCreate(mapId, function(model){
				log.debug('Display.load.model', model);

				self.group = model;

				self.once('map:rendered', function(){
					var layers = self.group.get('layers');
					_.each(layers, function(layer){
						self.renderLayer(layer);
					});
				});

				self.markReady();
				self.render();
				self.setupMap();
			});
		},

	});

	return Display;
});
