/*
 * browser/Browser.js
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
	'plugins/browser/CreateForm',
	'plugins/user/User',
	'plugins/browser/AddLayerForm',
	],	 
function (_, config, L, proxy, T, C, TP, Layer, CreateForm, User, AddLayerForm) {
	'use strict';
	
	
	var GroupItem = T.Subview.extend({
		templateName: 'browser/group-item',
		className: "group-item",


		initialize: function(options){
			User(function(user){
				this.user = user;
				this.user.on('change', this.render, this);
				this.markReady();
			}, this);
		},

		templateData: function(){
			var data = this.model.toJSON();
			var groups = this.user.get('groups');
			data.isSubscribed = false;
			_.each(groups, function(group){
				if(group.id === data.id){
					data.isSubscribed = true;
				}
			});
			return data;
		},


		events: {
			'click [data-role=subscribe]' : 'subscribe',
			'click [data-role=unsubscribe]' : 'unsubscribe',
			'click [data-role=add]' : 'addLayer',
		},
		
		subscribe: function(e){
			var user = this.user;
			C.Group.subscribe(this.model.id, function(model){
				user.fetch();
				proxy.delegate('Subscription', 'addGroup', model);
			});
		},

		unsubscribe: function(e){
			var user = this.user;
			C.Group.unsubscribe(this.model.id, function(model){
				user.fetch();
				proxy.delegate('Subscription', 'removeGroup', model);
			});
		},

		addLayer: function(){
			var form = new AddLayerForm({model:this.model});
			proxy.delegate('modal', 'show', form);
		},

	});

	var mapDefaults = {
		center: [0,0],
		crs : 'EPSG4326',
		zoom: 10,
	}

	var Browser = T.ContainerView.extend({

		templateName: 'browser/browser',
		subviewContainer : 'groups',
		SubviewPrototype: GroupItem,
		className: "group-browser",


		initialize: function(options){
			this.ready = true;
			this.cursor = C.Group.browse(this.dataAvailable, this);

		},

		events: {
			'click [data-role=create]' : 'create',
		},
		
		create: function(){
			var self = this;
			var model = new C.Group.model;
			var form = new CreateForm({model:model});
			form.once('submit', function(){
				if(model.has('properties')){
					model.once('sync', function(){
						var subview = self.instantiateSubview(model);
		                self.includeSubview(subview);
					});
					model.save();
				}
			});
			proxy.delegate('modal', 'show', form);
		},

	});

	return Browser;
});
