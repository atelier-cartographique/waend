/*
 * app.js
 *     
 * 
 Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 
 This program is free software: you can redistribute it and/or modify 
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.
 
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.
 
 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */


var deps = [
	'core/types',
	'jquery',
	'core/eproxy',
	'config'
];

define(deps, 
function(T, $, P, config){
	var App = T.View.extend({
		
		id: 'app',

        setupLayout:function(){
            this.layouts = {
                header:$('<div />'),
                viewport:$('<div />'),
                footer:$('<div />'),
            };
            
            for(var l in this.layouts)
            {
                this.layouts[l].attr('id',l).appendTo(this.el);
            }
            this.$el.appendTo($('body'));
        },
        
        registerComponent: function(name, view, layout, permanent){
            var comp = {
                view:view,
                visible:false,
                rendered: false,
                layout: layout || 'viewport',
            };
            
            if(permanent){
                this.permanentComps[name] = comp;
            }
            else{
                this.components[name] = comp;
            }
            
            P.register(name, view);
            if(name in this.pendingComponents){
                this.pendingComponents = _.omit(this.pendingComponents, name);
                this.setComponents(this.current_comps);
            }
            
        },

       
        getComponent:function(comp){
            if(this.components[comp] === undefined)
                return null;
            return this.components[comp].view;
        },
        
        renderComponent: function(c, k){
            console.log('app.renderComponent', k);
            this.layouts[c.layout].append(c.view.el);
            if(!c.rendered)
            {
                c.view.render();
                c.rendered = true;

                this.listenToOnce(c.view, 'rendered', _.partial(this.activate, c));
            } else {
                // Component is already renderd so we invoke
                // activate immediately 
                this.activate(c);
            }
        },

        activate: function (c) {
            if (c.view.activate)
                c.view.activate();
        },
        
        render:function(){
            
            _.each(this.components, function(c, k){
                if(c.visible)
                {
                    this.renderComponent(c, k);
                }
            }, this);
            
            _.each(this.permanentComps, function(c, k){
                this.renderComponent(c, k);
            }, this);
            
            return this;
        },
        resetViews:function(comps){
            for(var i=0; i<comps.length; i++)
            {
                var c = comps[i];
                try{
                    this.components[c].rendered = false;
                }
                catch(e){
                    //                     console.log('Could not reset: '+c);
                }
            }
            this.render();
        },
        setComponents:function(comps){
            for(var k in this.components){
                var c = this.components[k];
                if(c.visible && c.view.deactivate)
                {
                    c.view.deactivate();
                }
                c.visible = false;
                c.view.$el.detach();
            }
            this.current_comps = comps;
            
            for(var i=0; i < comps.length; i++)
            {
                var c = comps[i];
                try{
                    this.components[c].visible = true;
                }
                catch(e){
                    console.log('Could not activate: '+c, e);
                    this.pendingComponents[c] = e;
                }
            }
            return this.render();
        },
        unsetComponent:function(comp){
            this.current_comps = _.without(this.current_comps, comp);
            var c = this.components[comp];
            if(c.visible && c.view.deactivate)
            {
                c.view.deactivate();
            }
            c.visible = false;
            c.view.$el.detach();
        },
        
        setComponent:function(comp){
            this.current_comps = _.union(this.current_comps, [comp]);
            var c = this.components[comp];
            c.visible = true;
            this.renderComponent(c);
        },
         
        initialize:function(){
        	this.components = {};
            this.permanentComps = {};
            this.pendingComponents = {};
            this.setupLayout();
        },
       
        start: function(){

            var self = this;
            var triggerReady = _.after(config.apps.length, function(){
                self.trigger('ready');
            });
            _.each(config.apps, function(app){
                console.log('require', app);
                require([config.appsUrl + app + '/index.js'],
                        function(){
                            console.log('loaded', app);
            	            triggerReady();
                    });
            });
            
        },

	});

	var app = new App;
	P.register('app', app);
	return app;
});