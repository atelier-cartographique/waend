/*
 * browser/LayerSubForm.js
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
	'underscore',
	'config',
	'leaflet',
	'core/eproxy',
	'core/types',
	'core/collections',
	'core/template',
	'plugins/browser/Layer',
	],	 
function (_, config, L, proxy, T, C, TP, Layer) {
	'use strict';
	
	var LayerSubForm = T.View.extend({

		className: 'layer-sub-form',
		template: 'browser/layer-sub-form',

		initialize: function(options){

		},

		addGroup: function(model){
			var self = this;

			if(!self.map){
				self.pendingGroups = self.pendingGroups || [];
				self.pendingGroups.push(model);
				self.once('map:ready', function(){
					_.each(self.pendingGroups, function(g){
						self.addGroup(g);
					});
				});
				return;
			}

			self.groups[model.id] = new GroupItem({
						model: model,
						map: self.map
					})
					
			self.groups[model.id].on('rendered', function(){
				self.groups[model.id].showLayers();
			});
			console.log('addGroup');
			if(this.rendered){
				self.attachToAnchor(self.groups[model.id].render(), 'items');
			}
			else{
				self.on('rendered', function(){
					self.attachToAnchor(self.groups[model.id].render(), 'items');
				});
			}
			
		},

		start: function(map, user){
			var self = this;
			self.map = map;
			self.user = user;
			var groups = user.get('groups');

			_.each(groups, function(groupData){
				C.Group.getOrCreate(groupData.id, self.addGroup, self);
			});
			self.trigger('map:ready');
		},

	});

	return LayerSubForm;

});
