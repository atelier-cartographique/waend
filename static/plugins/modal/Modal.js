/*
 * modal/Modal.js
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
	'jquery',
	'core/types',
	'core/collections',
	'core/template',
	'core/css'
	], 
function(log, _, $, T, C, TP, CSS){
	'use strict';

	var Modal = T.View.extend({

		className:'modal-plugin',
		template: 'modal/modal',


		initialize: function(options){
			this.views = [];
			this.$modal = $('<div />');
		},

		render:function(){
			var $el = this.$modal;
			TP.render(TP.name(this.template), this, function(t){
				$el.html(t({}));
				$('body').append($el);
				CSS.block(CSS.absolute($el));
				$el.css({
					top:0,
					right:0,
					bottom:0,
					left:0,
					'z-index': 1015,
					'background-color': 'transparent',
				});
				$el.hide();
			});

			return this;
		},

		show: function(view){
			this.$modal.show();

			var a = this.$modal.find('[data-anchor=inner]');
			a.append(view.$el);
			
			var c = this.$modal.find('[data-role=close]');

			c.one('click', _.bind(this.close, this));
			this.views.push(view.render());

			view.on('modal:close', this.close, this);
		},

		close: function(){
			var v = this.views.pop();
			
			if(v){
				if(v.close){
					v.close();
				}
				else{
					v.remove();
				}
			}

			if(this.views.length === 0){
				this.$modal.hide();
			}
		},

	});

	return Modal;

});
