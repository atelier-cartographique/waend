/*
 * marker/Marker.js
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
	'jquery',
	'leaflet',
	'core/logger',
	'core/types',
	'core/template',
	],	 
function (_, $, L, log, T, TP) {
	'use strict';

	var markerOptions = ['templateName', 'className', 'style'];

	var defaultStyle = {
		color: "#996600",
		fill: true,
		opacity: 0.8,
		stroke: true,
		weight: 1,
		fillColor: "#fefefe",
		fillOpacity: 0.8,
	};

	var Marker = T.BView.extend({
		templateName: 'marker/marker',
		className: 'marker',
		ready: true,

		initialize: function(options){
			_.extend(this, _.pick(options, markerOptions));

			var geometry = this.model.get('geometry');
			this.layer = L.geoJson(geometry);
			
		},

		templateData: function(){
			var props = this.model.get('properties');
			var main = props._main || 'NoDescription';
			if(main.length < 2){
				main = 'TooShortDescription';
			}
			var initials = {
				first: main[0].toUpperCase(),
				second: main[1].toLowerCase(),
			};

			if(('init' in props) 
				&& props.init.length > 1){
				initials = {
					first: props.init[0].toUpperCase(),
					second: props.init[1].toLowerCase(),
				};
			}

			var name = main.split(' ').shift();
			if(('label' in props) 
				&& props.label.length > 0){
				name = props.label;
			}

			var data = {name:name, initials:initials, main:main}
			data.style = _.defaults(this.style || {}, defaultStyle);
			return data;
		},

		getMarker: function(callback, ctx){
			var self = this;
			if(!self.html){
				self.once('rendered', function(){
					self.getMarker(callback, ctx);
				});
				self.render();
				return false;
			}
			if(!self.marker){
				// here a bit of a hack
				$('body').append(this.$el);
				var height = this.$el.height();
				var iconSize = [50, height];
				this.$el.detach();
				self.icon = L.divIcon({
					className: 'marker-icon',
					html: self.html,
					iconSize: iconSize,
				});
				var point = self.layer.getBounds().getCenter();

				self.marker = L.marker(point, {
					icon: self.icon,
					clickable: true,
					riseOnHover: true,
				});
			}
			callback.apply(ctx, [self.marker]);
			return true;
		},

	});

	return Marker;

});