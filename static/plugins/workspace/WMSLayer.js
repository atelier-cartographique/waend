/*
 * workspace/WMSLayer.js
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
	'core/logger',
	'core/eproxy',
	'underscore',
	'core/types',
	'core/collections',
	'core/template',
	'leaflet',
	'plugins/workspace/WMSForm'
	], 
function(log, proxy, _, T, C, TP, L, Editor){
	'use strict';

	var Layer = T.View.extend({

		className: 'list-group-item layer',
		template: 'workspace/layer-wms-item',

		events:{
			'click .layer-name': 'configureLayer',
		},

		initialize: function(options){
			this.visible = !!('visible' in options) ? options.visible : true;
			this.map = options.map;

			this.model.on('change', this.render, this);
		},


		render: function(){ // render item in list
			var data = this.model.toJSON().properties;
			TP.render(TP.name(this.template), this, function(t){
				this.$el.html(t(data));
			});
			this.show();
			return this;
		},

		show: function(){
			if(!this.visible) return;
			if(this.onMap){
				this.map.removeLayer(this.wms);
			}		

			var props = this.model.get('properties');
			var options = _.extend({}, props.options);
			if('crs' in options){
				options.crs = L.CRS[options.crs];
			}
			this.wms = L.tileLayer.wms(props.url, options);		
			this.wms.on('click', function(e){
				log.debug('pffff');
			});
			this.wms.addTo(this.map);
			this.onMap = true;
		},

		hide: function(){
			if(this.onMap){
				this.map.removeLayer(this.wms);
			}	
			this.onMap = false;
		},

		configureLayer: function(e){
			var editor = new Editor({model:this.model});
			proxy.delegate('modal', 'show', editor);
		},

	});

	return Layer;	
});


