/*
 * template.js
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


define(["jquery", 'underscore', 'config'], 
function($, _, config) {
    
    var T = {
        appsUrl: config.appsUrl,
        locale: config.locale,
        defaultLocale: config.defaultLocale,
        templateDir: config.templateDir,
        development: true,
        cache: {},
        waiting: {},
        loading:{},
       
        /*
        * Utility function to preprocess template names
        */
        name : function(name){
            var parts = name.split('/');
            var app = parts.shift();
            var path =  parts.join('/');
            var locale = this.locale || this.defaultLocale;
            return [app, this.templateDir, locale, path ].join('/');
        },
       
       url: function(name){
            return this.appsUrl 
                    + name
                    + '.html'
                    + (this.development ? '?q='+Math.random() : '');
        },
        
       /*
        * Rendering method
        * 
        * the way it works is to compile the template called @name
        * and then call the provided @callback with this compiled
        * template as argument in the context of @el. An optional 
        * @error callback can be passed that will be called if any
        * exception is raised in the process.
        */
        render: function(name, el, cb, error){
            var that = this;
            if(this.cache[name] === undefined)
            {
                if(this.waiting[name] === undefined)
                {
                    this.waiting[name] = [];
                }
                this.waiting[name].push({element:el, callback:cb});
                if(this.loading[name] === undefined)
                {
                    this.loading[name] = true;
                    $.get(that.url(name), function(html){
                        that.cache[name] = _.template(html, false, {variable:'data'});
                        for(var k = 0; k < that.waiting[name].length; k++)
                        {
                            var w = that.waiting[name][k];
                            w.callback.apply(w.element, [that.cache[name]]);
                            if (!w.element.__prevent_trigger__)
                                w.element.trigger('rendered');
                            // Disabled the catch-block to get more informative errors - GDH
                            // try{
                            //    w.callback.apply(w.element, [that.cache[name]]);
                            //    if (!w.element.__prevent_trigger__)
                            //       w.element.trigger('rendered');
                            // }
                            // catch(e)
                            // {
                            //     if(error && (typeof error === 'function'))
                            //     {
                            //         error(e);
                            //     }
                            //     else
                            //     {
                            //         console.error('Failed on template: '+name+' ['+e+']');
                            //     }
                            // }
                        }
                    });
                }
            }
            else
            {
                cb.apply(el, [that.cache[name]]);
                if (!el.__prevent_trigger__)
                    el.trigger('rendered');
                // Disabled the catch-block to get more informative errors - GDH
                // try{
                //    cb.apply(el, [that.cache[name]]);
                //    if (!el.__prevent_trigger__)
                //      el.trigger('rendered');
                // }
                // catch(e)
                // {
                //     if(error && (typeof error === 'function'))
                //     {
                //         error(e);
                //     }
                //     else
                //     {
                //         console.error('Failed on template: '+name+' ['+e+']');
                //     }
                // }
            }
        }
    };
    
    return T;
});