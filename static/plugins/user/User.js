/*
 * user/User.js
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

define(['underscore', 'core/collections'], 
function(_, C){

	var user = undefined;
	var pending = true;
	var pendingCalls = [];

	function setuser(result){
		if(result.count > 0){
			user = result.references[0];
			_.each(pendingCalls, function(p){
				p.callback.apply(p.ctx, [user]);
			});
			pendingCalls = [];
		}
		pending = false;
	};

	var cursor = C.User.me(setuser);
	cursor.next();

	function get(callback, ctx){
		if(pending){
			pendingCalls.push({
				callback:callback,
				ctx:ctx
			});
		}
		else{
			callback.apply(ctx, [user]);
		}
	};

	return get;

});