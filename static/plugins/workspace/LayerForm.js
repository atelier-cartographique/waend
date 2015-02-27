/*
 * workspace/LayerForm.js
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
	'plugins/workspace/Stylist'
	], 
function(log, _, T, C, TP, Stylist){
	'use strict';


	var LayerForm = T.View.extend({

		className: 'layer-form container closer',

		template: 'workspace/layer-form',


		events: {
			'change .input' : 'updateModel',
			'click [data-role=delete]' : 'deleteLayer',
		},

		initialize: function(options){

			var style = _.extend({}, this.model.getProperties().style);
			this.stylist = new Stylist({style:style});

			this.stylist.on('change', this.updateStyle, this);
		},

		render: function() {
			var props = _.extend({}, this.model.get('properties'));
			TP.render(TP.name(this.template), this, function(t){
				this.$el.html(t(props));
				 this.attachToAnchor(this.stylist.render(), 'stylist');
			});

			return this;
		},

		update: function(){
			var $name = this.$el.find('[name=name]');
			var $description = this.$el.find('[name=description]');
			var props = this.model.getProperties();
			props.name = $name.val().trim();
			props.description = $description.val().trim();
			this.model.setProperties(props).save();
		},

		updateStyle: function(style){
			var props = this.model.getProperties();
			props.style = props.stylist || {};
			_.extend(props.style, style);
			this.model.setProperties(props).save();
		},

		close: function(e){
			if(!this.doNotUpdate){
				this.update();
			}
				
			this.isClosing = true;
			this.remove();
		},

		deleteLayer: function(e){
			var success = _.bind(function(){
				this.doNotUpdate = true;
				this.trigger('modal:close');
			}, this);
			this.model.destroy({
				success:success,
				wait: true,
			});
		},

	});

	return LayerForm;

});
