/*
 * workspace/Creator.js
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
	'backbone',
	'core/logger',
	'core/types',
	'core/collections', 
	'core/template',
	], 
function(_, $, B, log, T, C, TP){
	'use strict';


	var Property = T.View.extend({
		className: 'property',
		template: 'workspace/property',

		events: {
			'change [data-role=property_key]' : 'updateKey',
			'change [data-role=property_value]' : 'updateValue',
		},

		initialize: function(options){
			this.properties = options;
		},

		render:function(){
			TP.render(TP.name(this.template), this, function(t){
				this.$el.html(t(this.properties));
			});
			return this;
		},

		updateKey: function(e){
			var $k = this.$el.find('[data-role=property_key]');
			var $v = this.$el.find('[data-role=property_value]');
			var k = $k.val();
			var oldKey = $v.attr('name');
			$v.attr('name', k);
			this.trigger('change:key', oldKey, k);
		},

		updateValue: function(e){
			this.trigger('change:value');
		},

		reset: function(k, v){
			var $k = this.$el.find('[data-role=property_key]');
			var $v = this.$el.find('[data-role=property_value]');
			$k.val(k);
			$v.attr('name', k);
			$v.val(v);
		},

	});

	var Creator = T.View.extend({

		className: 'creator container closer',

		template: 'workspace/creator',

		events: {
			'change .input' : 'updateModel',
			'click [data-role=kvnew]' : 'newProperty',
			'click [data-role=delete]' : 'deleteEntity',
		},

		initialize: function(options){
			this.model.on('change', this.updateForm, this);

			this.meta = {};
		},

		updateForm: function(){
			var $main = this.$el.find('[name=_main]');
			var props = this.model.get('properties') || {};
			$main.val(props._main);

			this.updateKeys();
		},

		updateKeys: function(){
			var self = this;
			var props = _.omit(self.model.get('properties'), '_main');
			_.each(props, function(v,k){
				if(k in self.meta){
					self.meta[k].reset(k,v);
					return;
				}
				var kv = new Property({
					key: k,
					value: v
				});
				self.meta[k] = kv.render();
				kv.on('change:value', self.updateModel, self);
				kv.on('change:key', function(oldK, newK){
					self.meta[newK] = self.meta[oldK];
					delete self.meta[oldK];
				}, self);
				self.attachToAnchor(kv, 'properties');
			});

		},

		render:function(){
			var props = this.model.get('properties') || {};
			TP.render(TP.name(this.template), this, function(t){
				this.$el.html(t(props));
				this.updateKeys();
			});
			return this;
		},

		updateModel: function(e){
			var inputs = this.$el.find('.input');
			var props = {};
			_.each(inputs, function(input){
				var $input = $(input);
				var k = $input.attr('name').trim();
				props[k] = $input.val().trim();
			});
			this.model.save({properties:props});
		},

		newProperty: function(e){
			var k = 'new_key_name'
			if(k in this.meta){
				return;
			}
			var props =  this.model.get('properties') || {};
			props[k] = '';
			this.model.set({properties:props});
			this.model.trigger('change', this.model);
		},

		close: function(e){
			this.isClosing = true;
			this.remove();
		},

		deleteEntity: function(e){
			var success = _.bind(function(){
				this.trigger('modal:close');
			}, this);
			this.model.destroy({
				success:success,
				wait: true,
			});
		},

	});

	return Creator;
});
