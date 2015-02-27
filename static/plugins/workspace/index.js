/*
 * workspace/index.js
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



define(['core/eproxy', 'plugins/workspace/Workspace'], 
	function(proxy, Workspace){

		var workspace = new Workspace;
		var comp = ['workspace', workspace, 'viewport'];

		proxy.delegate('app', 
                   'registerComponent', 
                   comp);

		var route = [
	    'workspace',
	    'workspace',
	        function(){
	            proxy.delegate('app',
	                        'setComponents',
	                        [['workspace']]);
	        }
	    ];
	    proxy.delegate('router', 'route', route);
	    
	    return true;

	});