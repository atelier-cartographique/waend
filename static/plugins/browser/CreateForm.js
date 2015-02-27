/*
 * browser/CreateForm.js
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
	], 
function(log, _, T, C, TP, Stylist){
	'use strict';


	var CreateForm = T.BView.extend({

		className: 'create-form container',
		templateName: 'browser/create-form',
		
		events:{
			'click [data-role=submit]' : 'submit'
		},

		initialize: function(){
			this.ready = true;
		},

		submit: function(){
			var name = this.$el.find('[name=name]').val().trim();
			var description = this.$el.find('[name=description]').val().trim();
			if(name.length > 1 && description.length > 10){
				this.model.set('properties', {
					name:name,
					description:description,
				});	
			}
		},


		close: function(e){
			this.trigger('submit');
			this.remove();
		},

	});

	return CreateForm;

});
