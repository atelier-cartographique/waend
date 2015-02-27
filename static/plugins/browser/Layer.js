/*
 * browser/Layer.js
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
	'plugins/workspace/Creator',
	'plugins/workspace/LayerForm'
	], 
function(log, proxy, _, T, C, TP, L, Creator, LayerForm){

	function Layer(options){
			this.map = options.map;
			this.model = options.model;
			this.group = new L.FeatureGroup();
			this.group.addTo(this.map);

			this.entities = {};
			
			this.cursor = C.Entity.forLayer(this.model.id, 
												this.dataAvailable, this);

	};

	_.extend(Layer.prototype, {

		style: function(feature){
			var props = this.model.get('properties');
			// TODO the styling thing based on the feature
			console.log(feature);
			return _.extend({}, props.style); 
		},

		createEntityLayer: function(model){
			var geometry = model.get('geometry');

			var style = _.bind(this.style, this);
			var options = {
				style:style,
			};
			var layer = L.geoJson(geometry, options);
			
			layer.on('click', function(){
				this.editFeatureMeta(model);
			}, this);

			model.once('change', this.updateEntity, this);

			return layer;
		},


		renderEntity: function(model){
			if(model.id in this.entities) return;
			var layer = this.createEntityLayer(model);
			this.entities[model.id] = {
				model: model,
				layer: layer,
			};
			this.group.addLayer(layer);
			return this;
		},

        dataAvailable: function (data) {
            _.each(data.references, function (reference) {
            	this.renderEntity(reference);
            }, this);
            this.trigger('dataAvailable', this);
        },

		getBounds: function(){
			var bounds = this.group.getBounds();
			return new L.LatLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
		},		

		zoomLayer: function(e){
			this.map.fitBounds(this.getBounds());
			return this;
		},

		remove: function(){
			this.map.removeLayer(this.group);
		},
	}, T.Events);

	return Layer;	
});


