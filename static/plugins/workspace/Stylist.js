/*
 * workspace/Stylist.js
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

4

define([
	'core/logger',
	'jquery',
	'underscore',
	'core/types',
	'core/collections',
	'core/template',
	], 
function(log, $, _, T, C, TP){
	'use strict';

	// TODO move this in core and complete it

	function parseInput(input){
		var $input = $(input);
		var type = $input.attr('type');
		var key = $input.attr('name');
		var val = $input.val();
		switch(type){
			case 'checkbox': 
				val = $input.is(":checked");
				break;
			case 'button':
				val = $input.hasClass('active');
				break;
			case 'number': 
				val = parseFloat(val);
				break;
			default: val = val;
		}
		return {key:key, value:val};
		};


	var Stylist = T.View.extend({

		className: 'stylist',

		template: 'workspace/stylist',

		events: {
			'change [data-role=input]' : 'update',
			'click [name=stroke]' : 'toggleStroke',
			'click [name=fill]' : 'toggleFill',
		},

		initialize: function(options){
			this.style = options.style || {};
		},

		render: function() {
			var props = _.extend({}, this.style);
			log.debug(props);
			TP.render(TP.name(this.template), this, function(t){
				this.$el.html(t(props));
			});

			return this;
		},

		toggleStroke: function(){
			var strokeNames = 'color weight opacity'.split(' ');
			this.toggle('stroke', strokeNames);
		},

		toggleFill: function(){
			var strokeNames = 'fillColor fillOpacity'.split(' ');
			this.toggle('fill', strokeNames);
		},

		toggle: function(name, deps){
			var self = this;
			var $elem = self.$el.find('[name='+name+']');
			if($elem.hasClass('active')){
				$elem.removeClass('active');
				_.each(deps, function(sn){
					var $input = self.$el.find('[name='+sn+']');
					$input.attr('disabled', 'disabled');
				});
			}
			else{
				$elem.addClass('active');
				_.each(deps, function(sn){
					var $input = self.$el.find('[name='+sn+']');
					$input.removeAttr('disabled');
				});
			}
			this.update();
		},

		update: function(){
			var self = this;
			var changed = false;
			_.each(this.$el.find('[data-role=input]'), function(input){
				var res = parseInput(input);
				log.debug('style:', res.key, res.value);
				if(self.style[res.key] !== res.value) changed = true;
				self.style[res.key] = res.value;
			});
			if(changed){
				self.trigger('change', self.style);
			}
		},

	});

	return Stylist;

});
