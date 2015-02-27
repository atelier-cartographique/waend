/*
 * browser/AddLayerForm.js
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
	'underscore',
	'core/types',
	'core/collections',
	'core/template',
	'plugins/user/User',
	], 
function(log, _, T, C, TP, User){
	'use strict';


	var LayerItem = T.Subview.extend({
		className: 'add-layer-form-item',
		templateName: 'browser/add-layer-form-item',

		initialize: function(options){
			this.status(false);
			this.group = options.group;
			_.each(this.model.get('groups'), function(g){
				if(g.id === this.group.id){
					this.status(true);
				}
			}, this);
			this.markReady();
		},

		status: function(s){
			if(undefined === s){
				return this._status;
			}
			this._status = s;
		},

		templateData: function(){
			var data = this.model.toJSON();
			data.isAttached = this.status();
			return data;
		},

		events:{
			'click [data-role=add]': 'addLayer',
			'click [data-role=remove]': 'removeLayer',
		},

		addLayer: function(){
			C.Group.attach(this.group.id, this.model.id, function(group){
				this.group = group;
				this.status(true);
				this.render();
			}, this);
		},

		removeLayer: function(){
			C.Group.detach(this.group.id, this.model.id, function(group){
				this.group = group;
				this.status(false);
				this.render();
			}, this);
		},

	});

	var AddLayerForm = T.ContainerView.extend({

		className: 'create-form container',
		templateName: 'browser/add-layer-form',
		subviewContainer : 'layers',
		SubviewPrototype: LayerItem,
		
		initialize: function(){

			User(function(user){	
				this.user = user;
				this.cursor = C.Layer.forUser(user.id, this.dataAvailable, this);
				this.markReady();
			}, this);

		},

		instantiateSubview: function(model){
			return new this.SubviewPrototype({
				model:model,
				group:this.model
			}); 
		},
	});

	return AddLayerForm;

});
