/*
 * workspace/LayerManager.js
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
	'core/eproxy',
	'core/types',
	'core/collections',
	'core/template',
	'plugins/workspace/Layer',
	'plugins/workspace/WMSLayer',
	'plugins/workspace/LayerForm',
	'plugins/workspace/WMSForm',
	],	 
function (_, proxy, T, C, TP, Layer, WMSLayer, LayerForm, WMSForm) {
	'use strict';

	var LayerManager = T.View.extend({
		className: 'user-group-item panel panel-primary',
		template: 'workspace/layer-widget',

		events: {
			'click [data-role=new-layer]': 'createLayer',
			'click [data-role=new-wms]': 'createWMS',
		},

		initialize: function(options){
			this.layers = {};
			this.map = options.map;
			this.user = options.user;
			this.currentLayer = undefined;
			this.ready = false;
			this.rendered = false;
			var self = this;
			this.once('rendered', function(){
				_.each(self.model.get('layers'), self.renderLayerItem, self);
			});
		},

		render:function(){
			TP.render(TP.name(this.template), this, function(t){
				this.$el.html(t({}));
				this.rendered = true;
				this.trigger('rendered');
			});
			return this;
		},


		renderLayerItem: function(attrs){
			var layer = new C.Layer.model(attrs);
			if(layer.id in this.layers) return;

			var layerItem;
			var layerType = layer.get('type');
			
			if('wms' === layerType){
				layerItem = new WMSLayer({
					model:layer,
					map:this.map,
				});	
			}
			else if('geojson' === layerType){
				layerItem = new Layer({
					model:layer,
					map:this.map,
				});	
			}

			layerItem.movable = true;
			layerItem.editable = true;
			  
			this.layers[layer.id] = layerItem;
			
			this.attachToAnchor(layerItem.render(), 'items');

			var self = this;
			layerItem.on('select', function(l){
				_.each(self.layers, function(ly){
					if(ly.deselectLayer 
						&& ly !== l){
						ly.deselectLayer();
					}
				});
				self.currentLayer = l;
			});


			layer.on('destroy', function(){
				if(layer.removeFeatures){layer.removeFeatures();}
				delete self.layers[layer.id];
				layerItem.remove();
			});

			if(layerItem.selectLayer 
				&& !this.currentLayer){
				layerItem.selectLayer();
			}
		},

		getCurrentLayer: function(){
			return this.currentLayer;
		},

		createLayer: function(){
			if(!this.ready) return;
			
			var model = new C.Layer.model({
					user_id:this.user.id,
					type: 'geojson',
					properties:{
						name:'untitled',
					}
				});

			model.on('sync', this.renderLayerItem, this);

			var form = new LayerForm({model:model});
			proxy.delegate('modal', 'show', form);
		},

		createWMS: function(){
			if(!this.ready) return;
			
			var model = new C.Layer.model({
					user_id:this.user.id,
					type: 'wms',
					properties:{
						name:'untitled',
					}
				});

			model.on('sync', this.renderLayerItem, this);

			var form = new WMSForm({model:model});
			proxy.delegate('modal', 'show', form);
		},
	});


	return LayerManager;
})
