/*
 * routers.js
 *     
 * 
 * Copyright (C) 2013  Pierre Marchand <pierremarc07@gmail.com>
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

define(["backbone", 'underscore', 'core/eproxy'], 
function( Backbone, _, P) {
    
    var setComponents = function(comps){
        var ca = comps.split(' ');
        P.delegate('app', 'setComponents', [ca]);
    };
    
    var addClass = function(r, klass){
        P.delegate(r, 'addClass', klass);
    };
    var removeClass = function(r, klass){
        P.delegate(r, 'removeClass', klass);
    };
    
    var main = Backbone.Router.extend({
        
        initialize:function(options){
            this._states = [];
        },

        /**
         * Create a route in the router
         *
         * @param route the router pattern
         * @param name the route name
         * @param callback
         * @returns {Router}
         */
        route: function(route, name, callback){
            console.log('router.route', route, name);
            return Backbone.Router.prototype.route.apply(this, [route, name, callback]);
        },
        
        navigate:function(route, options){
            options = _.extend({trigger: true}, options);
            this.resetClass(route);
            return Backbone.Router.prototype.navigate.apply(this, [route, options]);
        },
        
        reload:function(){
            var route = Backbone.history.fragment;
            Backbone.history.fragment = null;
            return Backbone.Router.prototype.navigate.apply(this, [route, {trigger: true}]);
        },
        
        back:function(){
            Backbone.history.history.back();
        },
        
        setClass:function(comp, klass){
            var s = {
                comp:comp,
                klass:klass,
            };
            this._states.push(s);
            addClass(comp, klass);
        },
        
        resetClass:function(route){
            _.each(this._states, function(s){
                removeClass(s.comp, s.klass);
            });
            this._states = [];
        },

    });
        
    
    return main;
});
