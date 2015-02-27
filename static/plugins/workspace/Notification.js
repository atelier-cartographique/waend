/*
 * workspace/Notification.js
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
	'core/logger',
	'core/eproxy',
	'core/types',
	'core/collections',
	'core/template',
	'core/live',
	],	 
function (_, log, proxy, T, C, TP, Live) {
	'use strict';

	var EntityItem = T.Subview.extend({
		templateName: 'workspace/notification-entity',
		className: "notification-item",
		tagName: 'span',

		initialize: function(options){
			this.ready = true;
		},

	});


	var Notification = T.View.extend({

		template: 'workspace/notification',

		initialize: function(options){
			this.notifier = Live('Entity');
			this.notifier.on('notify', this.renderEntity, this);
		},

		render: function(){
			TP.render(TP.name(this.template), this, function(t){
				this.$el.html(t({}));
				this.rendered = true;
			});
			return this;
		},

		renderEntity: function(model){
			if(this.rendered){
				if(this.entity){
					this.entity.remove();
				}

				this.entity = new EntityItem({model:model});
				this.attachToAnchor(this.entity.render(), 'item');
			}
		},

	});


	return Notification;

});