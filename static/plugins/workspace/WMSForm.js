/*
 * workspace/WMSForm.js
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
	], 
function(log, proxy, _, T, C, TP, L){
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
			this.keys = options.keys;
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

	var Editor = T.View.extend({

		className: 'wmseditor container closer',

		template: 'workspace/wms-editor',

		events: {
			'change .input' : 'updateModel',
			'click [data-role=close]' : 'close',
			'click [data-role=kvnew]' : 'newProperty',
		},

		initialize: function(options){
			this.model.on('change', this.updateForm, this);

			this.meta = {};
		},

		updateForm: function(){
			var $name = this.$el.find('[name=name]');
			var $url = this.$el.find('[name=url]');
			var props = this.model.get('properties') || {};
			$name.val(props.name);
			$url.val(props.url);

			this.updateKeys();
		},

		updateKeys: function(){
			var self = this;
			var props = _.extend({}, self.model.get('properties').options);
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
			var url, name;
			_.each(inputs, function(input){
				var $input = $(input);
				var k = $input.attr('name').trim();
				if('url' === k){
					url = $input.val().trim();
					return;
				}
				if('name' === k){
					name = $input.val().trim();
					return;
				}
				props[k] = $input.val().trim();
			});
			this.model.save({properties:{
				url:url,
				name:name,
				options: props,
			}});
		},

		newProperty: function(e){
			var k = 'new_key_name'
			if(k in this.meta){
				return;
			}
			var props =  this.model.get('properties') || {};
			if(!_.has(props, 'options')){
				props.options = {};
			}
			props.options[k] = '';
			this.model.set({properties:props});
			this.model.trigger('change', this.model);
		},

		close: function(e){
			this.isClosing = true;
			this.remove();
		},

	});


	return Editor;	
});


