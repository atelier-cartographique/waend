/*
 * types.js
 *     
 * 
 * Copyright (C) 2013, 2014  Pierre Marchand <pierremarc07@gmail.com>, Gijs de Heij <gijs@de-heij.com>
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



define(["backbone", 
       'underscore', 
       'jquery',
       'core/logger',
       'core/jqplugins',
       'core/collections',
       'core/template',
       'core/geom',
       'core/css',
       'core/algo',
       ],
function(B, _, $, log, $$, C, T, G, CSS, A){
    

    var TransformStack  = {
        /**
         * Shortcut for a translate transformation on View.$el
         * 
         * @param tx X translation
         * @param ty Y translation, defaults to 0
         * @returns {View}
         */
        translate: function(tx, ty){
            return this.transform(G.translate(tx, ty));
        },
        
        /**
        * Shortcut for a scale transformation on View.$el
        *
        * @param sx float|int x-scale
        * @param sy float|int y-scale (optional)
        * @param origin {}|{G.Point} origin for scale (optional)
        * @returns {View}
        */
        scale: function (sx, sy, origin) {
            return this.transform(G.scale(sx, sy, origin));
        },

        /**
        * Every view holds it's own transformation stack. Transformations
        * can be added using this function, or popped from the stack using
        * popTransform. By calling View.Transition the transformations are
        * applied to the Views.$el
        *
        * @param {Geom.Transform}
        * @returns {View}
        */
        transform: function(t){
            this._transforms || this.resetTransforms();
            if(!(t instanceof G.Transform)){
                throw {
                    name: 'ErrorArgumentType',
                    message: 'View.transform only accepts argument of type Geom.Transform'
                };
            }
            this._transforms.push(t);
            return this;
        },

        resetTransforms: function() {
            this._transforms = [new G.Transform];
        },
        
        /**
         * Removes the last transformation from the internal
         * transformation-stack and returns the View
         * 
         * @returns View
         */
        popTransform: function(){
            this._transforms.pop();
            return this;
        },
        
        /**
        * Applies all the transformations in the views' transformation-stack
        * takes an onComplete callback and context
        *
        * @param onComplete function callback
        * @param ctx object
        * @returnss {View}
        */
        transition: function(onComplete, ctx){
            var T = new G.Transform;
            var TS = this._transforms;

            _.each(TS, function(t){ T.multiply(t); });
            
            if (onComplete) {
                CSS.transform(this.$el, T, _.partial(this.transitionCallback, T, onComplete, ctx), this);
            } else {
                CSS.transform(this.$el, T);
                this.transitionCallback(T);
            }

            return this;
        },

        /**
        * Callback function, always invoked after a transition is completed
        * also fires a geomChange on the transitioned view.
        *
        * @param onComplete function optional
        * @param ctx object optional
        */
        transitionCallback: function (T, callback, ctx) {
            if (callback)
                callback.apply(ctx, [T]);

            this.geomChange();
        },

        /**
        * Triggers a geom:change event on the Views' element
        * 
        * Uses a triggerHandler call to prevent bubbling
        *
        * geom:change events trickle down instead of bubbling up. 
        * Bubbling would cause recursive calls untill the callstack
        * exceeds it's maximum size. -GDH
        */
        geomChange: function () {
            this.$el.triggerHandler('geom:change');
        },
    };

    var Geometry = {
        /**
        * Returns the boundingbox for found elements. If a parent is given it's
        * relative to this box.
        *
        * Both selector and parent can be a DomElement, a jQueryObject or a
        * selectorstring. If no selector is provided the Views' element is
        * used. If no parent is provided the boundingbox is relative to the browsers'
        * viewport.
        *
        * Returns an object with properties top, right, bottom, left, width, height
        * to get a {Geom.Rect} use getBoundingRect
        *
        * @param selector string|DonElement|{jQuery}|undefined
        * @param selector string|DonElement|{jQuery}|undefined
        * @returns {}
        */
        getBounds: function(selector, parent){
            var bounds = {'left': false, 'top': false, 'right': false, 'bottom': false};
            var target = selector ?
                        ((selector instanceof $) ? selector : this.$(selector))
                        // Selector was given, either a string or jQuery object
                        : this.$el; 
                        // If no selector was given we default to the element of the view
            
            // I a parent was given we first find the boundarr
            if (typeof(parent) != 'undefined') {            
                    var parent_bounds = this.getBounds(parent);
                    var dx = parent_bounds.left;
                    var dy = parent_bounds.top;
            }

            _.each (target, function(el){
                var el_bounds = el.getBoundingClientRect();

                if (typeof(parent) != 'undefined') {
                    el_bounds = {
                        'left': el_bounds.left - dx,
                        'right': el_bounds.right - dx,
                        'top': el_bounds.top - dy,
                        'bottom': el_bounds.bottom - dy,
                        'width': el_bounds.width,
                        'height': el_bounds.height,
                    }
                }
                
                if (bounds.left == false || el_bounds.left < bounds.left) {
                    bounds.left = el_bounds.left;
                }
                if (bounds.top == false || el_bounds.top < bounds.top) {
                    bounds.top = el_bounds.top;
                }
                if (bounds.right == false || el_bounds.right > bounds.right) {
                    bounds.right = el_bounds.right;
                }
                if (bounds.bottom == false || el_bounds.bottom > bounds.bottom) {
                    bounds.bottom = el_bounds.bottom;
                }
            },  this);
            
            return bounds;
        },

        /**
        * Returns a Geom.Rect representing the boundingbox for the element(s)
        * found with the given selector. 
        *
        * @param selector string|jQuery behaves the same as selector for View.getBounds
        * @paran parent string|jQuery behave the same as parent for View.getBounds
        * @returns {Geom.Rect}
        */
        getBoundingRect: function (selector, parent) {
            var bounds = this.getBounds(selector, parent);
            return new G.Rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
        },

        top: function () { return this._getProperty('top') },
        left: function () { return this._getProperty('left') },
        width: function () { return this._getProperty('width') },
        height: function () { return this._getProperty('height') },
        right: function () { return this._getProperty('right') },
        bottom: function () { return this._getProperty('bottom') },
        center: function () { return this._getProperty('center') },
        topleft: function () { return this._getProperty('topleft') },
        topright: function () { return this._getProperty('topright') },
        bottomleft: function () { return this._getProperty('bottomleft') },
        bottomright: function () { return this._getProperty('bottomright') },
        diagonal: function () { return this._getProperty('diagonal') },
        surface: function () { return this._getProperty('surface') },

        _getProperty: function (prop) {
            var r = this.getBoundingRect();
            return r[prop].apply(r);
        },
    };

    var View = B.View.extend(TransformStack).extend(Geometry).extend({
        
        options:{}, // quick fix
        
        /**
        * Empty function, usefull when a animation is desired, but no callback-'action'
        * is required
        */
        noop: function () {},

        /**
        * Returns a dictionary with all 'data-*' attributes and their
        * values of provided events' currentTarget.
        *
        * @param evt Event
        * @returns {}
        */
        collectEventData: function(evt){
            var attrs = evt.currentTarget.attributes;
            var data = {};
            _.each(attrs, function(attr){
                var name = attr.name;
                if(name.lastIndexOf('data-', 0) === 0){
                    var dataName = name.slice(5);
                    data[dataName] = attr.value;
                }
            });
            return data;
        },

        /**
         * Returns a dictionary of elements having a data-anchor attribute. Those elements will be used to attach other
         * elements. The key of the returned dict is the name of the anchor, and the value is the anchor element itself
         *
         * @returns {{}}
         */
        collectAnchors: function(){
            var anchors = this.$('[data-anchor]');
            var ret = {};
            _.each(anchors, function(a){
                var $el = $(a);
                var name = $el.attr('data-anchor');
                ret[name] = _.extend(new Object, TransformStack, Geometry, {$el: $el, $: $el.find});
                ret['$' + name] = $el;
            });

            return ret;
        },

        /**
         * Attaches the given jQuery element, or View to the anchor with the given name
         *
         * @param $el DOM-element|{jQuery}|{View}
         * @param anchorName string
         * @returns {View}
         */
        attachToAnchor: function($el, anchorName, mode){
            if (mode != 'prepend') mode = 'append';
            var anchors = this.anchors || this.collectAnchors();
            if(anchorName in anchors){
                if ($el instanceof View)
                    $el = $el.$el;
                if (mode == 'append') {
                    anchors['$' + anchorName].append($el);
                } else {
                    anchors['$' + anchorName].prepend($el);
                }
            } else {
                log.warning("Could not attach " + $el + " to " + anchorName + ", anchor doesn't exist", $el, anchorName);
            }

            return this;
        },
        
        constructor:function(){
            var self = this;
            B.View.apply(this, arguments);
            this.on('rendered', this._postRender, this);             
        },
        
        /**
        * !! Depracated triggers a 'rendered' event on the view
        */
        rendered: function(){
            log.warning('Please use trigger to trigger rendered event!');
            this.trigger('rendered');
        },
        
        /**
        * Default function which will be fired every time a template is
        * rendered
        */
        _postRender:function(){
            this._resolveRelated();
        },
        
        /**
        * Adds given class to the view's element
        *
        * @param cls string class to add
        * @returns {view}
        */
        addClass:function(cls){
            this.$el.addClass(cls);
        },

        /**
        * Removes given class from the view's element
        *
        * @param cls string class to remove
        * @returns {view}
        */
        removeClass:function(cls){
            this.$el.removeClass(cls);
        },
        
        /**
        * Default render function. Renders the template as is defined
        * by View.template and uses the result as content for View.$el
        *
        * @returns {View}
        */
        render: function(){
            T.render(T.name(this.template), this, function(ct){
                var data = this.model ? this.model.toJSON() : {};
                _.extend(data, {
                    Type:{
                        Connection : C.ConnectionType,
                        Api : C.ApiType,
                    }
                });
                this.$el.html(ct(data));
            });
            return this;
        },
        
        _getRelatedModel:function($el, modelSpec, template){
            
            if(modelSpec[0] === '{')
            {
                // the model spec is made of raw json data - yep, tricky
                var data = JSON.parse(modelSpec);
                var model = new B.Model(data);
                var v = new View({
                    model:model,
                });
                v.template = template;
                v.setElement($el[0]);
                v.render();
            }
            else
            {
                var spec = modelSpec.split('/');
                var id = spec.pop();
                var modelName = spec.pop();
                var model = C[modelName].get(id);
                if(!model)
                {
                    model = new M[modelName]({id:id});
                    C[modelName].add(model);
                }
                
                var v = new View({
                    model:model,
                });
                v.template = template;
                v.setElement($el[0]);
                v.render();
                model.on('change', v.render, v);
                model.fetch();
            }
        },
        
        _resolveRelated:function(){
            var relations = this.$('[data-template]');
            _.each(relations, function(el, idx, lst){
                var $el = $(el);
                var template = $el.attr('data-template');
                var modelSpec = $el.attr('data-model');
                this._getRelatedModel($el, modelSpec, template);
            }, this);
        },
        
        
        capture: function(preserveEventHandlers){
            if(preserveEventHandlers){
                this.$el.detach();
            }
            else{
                this.remove();
            }
            return this;
        },
        
        /**
        * !! - DEPRECATED, do not understand why it's here -GDH
        * Returns boundaries on the given DomElement, returns a list:
        * [left, top, right, bottom]
        * 
        * @param element DomElemt
        * @returns Array
        */
        getElementBounds: function (element){
            log.warning("Perhaps we should deprecate getElementBounds", 'types.js', 335);
            return [
                element.offsetLeft,
                element.offsetTop,
                element.offsetLeft + element.offsetWidth, 
                element.offsetTop + element.offsetHeight
            ];
        },
    });

    var viewOptions = ['templateName'];

    var BView = View.extend({
        __prevent_trigger__: true,
        /**
        * Indicator whether we are ready to render
        */
        ready: false,
        /**
        * Indicator whether we are rendered
        */
        rendered: false,
        /**
        * Template placeholder
        */
        template: undefined,
        
        constructor: function () {
            this.registerViewEvents();
            View.apply(this, arguments);
            this.loadTemplate(this.templateName);
        },

        /**
        * Register view events
        */
        registerViewEvents: function(viewEvents) {
            if (!(viewEvents || (viewEvents = _.result(this, 'viewEvents')))) return this;
            this.clearViewEvents();
            for (var eventName in viewEvents) {
                var methodString = viewEvents[eventName];
                var methods;
                if (_.isFunction(methodString)) methods = [methodString];
                else if (_.isArray(methodString)) methods = methodString;
                else methods = methodString.split(' ');
                
                _.each(methods, function (method) {
                    if(!_.isFunction(method)) method = this[method];
                    if(!method) return;
                    this.on(eventName, method, this);
                }, this);
            }
            return this;
        },

        /**
        * Clears previously set ViewEvents
        */
        clearViewEvents: function() {
            this.off(null, this.fireViewEvent);
            return this;
        },

        /**
        * Shortcut to fireing an event. Enables to clear events
        */
        fireViewEvent: function (callback) {
            callback.apply(this, _.rest(arguments, 1)); 
        },

        /**
        * Renders if view is ready. Otherwise awaits the ready event
        */
        render: function () {
            if (this.ready) {
                if (this.template) {
                    this.html = this.applyTemplate(this.template);
                    this.injectTemplate(this.html);
                    this.anchors = this.collectAnchors();
                    this.markRendered();
                } else {
                    this.on('ready:template', this.render);
                }
            } else {
                this.on('ready', this.render);
            }

            return this;
        },

        /**
        * Load template and trigger ready:template if the
        * template was loaded
        */
        loadTemplate: function (name) {
            T.render(T.name(name), this, function(template){
                this.template = template;
                this.trigger('ready:template', template);
            });
        },

        /**
        * Invoked by the template callback. Actually executes the template function.
        *
        * @param template callback
        * @returns string the HTML string to attach to the dom
        */
        applyTemplate: function (template) {
            var data = this.templateData(data);
            return template(data);
        },

        /**
        * Invoked by the template callback, attaches given HTML
        * to the DOM
        * @param string html
        */
        injectTemplate: function (html) {
            this.$el.html(html);
        },

        /**
        * Getter for the templateData
        * 
        * @return *
        */
        templateData: function () {
            return {};
        },

        /**
        * Marks view as rendered and triggers a rendered event
        */
        markRendered: function () {
            this.rendered = true;
            this.trigger('rendered', this);
        },  

        /**
        * Marks view as ready and triggers a rendered event
        */
        markReady: function () {
            this.ready = true;
            this.trigger('ready', this);
        },

        /**
        * Activate function. Expected to trigger an activate
        */
        activate: function () {
            if (this.ready) {
                this.trigger('activate');
                this.addClass('active');
            } else {
                this.on('ready', this.activate, this);
            }
        },

        /**
        * Deactivate function. Expected to at least trigger a deactivate
        */
        deactivate: function () {
            this.removeClass('active');
            this.trigger('deactivate');
        },

        /**
        * Shortcut to mixin mixin's. An arbitrary amount of objects can be provided
        */
        mixin: function() {
            _.each(arguments, function(mixin) { this.extend(mixin); }, this);
        },
    });

    var iterableViewOptions = ['subviewContainer', 'SubView'];

    /**
    * Two types of views, Iterable and non iterable
    * Iterables hold subViews
    *
    * View events 
    * [dataAvailable] -> optional, triggered on Iterables when data is available
    * ready -> triggered when the view is ready for render, unless it was ready
    *           on initialization
    * rendered -> triggered when the view was rendered
    * include:view -> triggerd when a subview is attached
    */
    ContainerView  = BView.extend({
        templateName: 'iterable', // loads callback and function becomes callable
        subviewContainer: 'subviews',
        
        /**
        * Subview prototype, used to instantiate subViews
        */
        SubviewPrototype: BView,
        
        constructor: function () {
            this.subviews = [];
            BView.apply(this, arguments);
        },

        /**
        * Includes the given subview and attaches them when the View is rendered.
        * triggers the include:view event when a view is included
        */
        includeSubview: function (subview) {
            this.subviews.push(subview);
            // If the view is already rendered we still want
            // to make sure include:view is triggered before
            // attach:view
            this.trigger('include:view', subview);
            subview.trigger('include', this);
            
            if (this.rendered) {
                this.attach(subview);
            } else {
                this.on('rendered', _.partial(this.attach, subview), this);
            }
        },

        /**
        * Called before a subview is attached to the DOM
        */
        prepareSubview: function (view) {
            return view;
        },
        
        /**
        * Attaches the given subview to the subview container.
        * triggers the attach:view event
        *
        * @param subview {View}
        */
        attach: function (subview) {
            var preparedView = this.prepareSubview(subview);
            var anchorName = this.subviewContainer;

            this.listenTo(preparedView, 'rendered', _.partial(this.renderedSubview, preparedView));
            
            this.attachToAnchor(preparedView, anchorName);
            preparedView.render();
            this.trigger('attach:subview', preparedView);
            preparedView.trigger('attach', this);
        },

        prepareData: function (data) { return data; },

        /**
        * Default funciton to parse data, takes all the references, instantiates
        * views and attaches them. The event dataAvailable is triggered after
        * all references are attached.
        */
        dataAvailable: function (data) {
            data = this.prepareData(data);
            _.each(data.references, function (reference) {
                var subview = this.instantiateSubview(reference);
                this.includeSubview(subview);
            }, this);
            this.trigger('dataAvailable', this);
        },

        /**
        * Default behaviour for instantiating a new subview
        * typically instantiated by dataAvailable
        */
        instantiateSubview: function (model) {
            return new this.SubviewPrototype({model: model})
        },

        /**
        * Triggers a 'rendered:subview' event for every subview
        * which was rendered and triggers 'rendered:subviews'
        * if all subviews were rendered
        *
        * @param subview {View} the subview which was rendered
        */
        renderedSubview: function (subview) {
            this.trigger('rendered:subview', subview);

            if (_.every(this.subviews, function (subview) { return subview.rendered }, this)) {
                this.trigger('rendered:subviews')
            }
        },

        /**
        * Activate function. Expected to trigger an activate
        */
        activate: function () {
            if (this.ready) {
                _.invoke(this.subviews, 'activate');
                this.addClass("active");
                this.trigger('activate', this);
            } else {
                this.removeClass("active");
                this.on('ready', this.activate, this);
            }
        },

        /**
        * Deactivate function. Expected to at least trigger a deactivate
        */
        deactivate: function () {
            _.invoke(this.subviews, 'deactivate');
            this.removeClass('active');
            this.trigger('deactivate', this);
        },

        /**
        * If the view has a model it will be forwarde to the 
        * template as a JSON string
        */
        templateData: function() {
            if (this.model)
                return _.result(this.model, 'toJSON');
        },
    });

    var IterableView = ContainerView.extend({
        constructor: function () {
            ContainerView.apply(this, arguments);
            log.warning('IterableView deprecated. Use ContainerView');
        },
    });

    var Subview = BView.extend({
        templatename: "subview",

        /**
        * Initialize forwarder
        */
        // initialize: function (options) {
        //     BView.prototype.initialize.apply(this, [options]);
        // },

        /**
        * Getter for the templateData
        * 
        * @return *
        */
        templateData: function () {
            return this.model.toJSON();
        },
    });

    /**
    * Mixin for the view to 'overlay'
    */
    var Overlay = {
        /**
        * Reveals overlay. If a callback is provided the movement is animated
        */
        reveal: function(callback, ctx) {
            if (this.__overlayState == 'hidden') {
                this.__overlayState = 'visible';
                this.translate(0, -this.height()).transition(callback, ctx);
            }
        },

        /**
        * Hides the overlay. If a callback is provided it will be animated
        */
        hide: function(callback, ctx) {
            if(!this.__overlayState) this.__overlayState = 'visible';
            if (this.__overlayState == 'visible') {
                this.__overlayState = 'hidden';
                this.translate(0, this.height()).transition(callback, ctx);
            }
        },
    };
    
    /**
    * Mixin for the containerView of the overlay
    */
    var OverlayHandler = {
        /**
        * Opens the given view as an overlay, but also closes the vurrent, if any.
        */
        showOverlay: function (overlay, anchor, callback, ctx) {
            this.attachToAnchor(overlay, anchor);
            overlay.hide();
            // Hide old
            this.hideOverlay(this.noop);
            // Reveal new
            overlay.reveal(this.noop);
            this._currentOverlay = overlay;
        },

        /**
        * Closes the active overlay, if there is one
        */
        hideOverlay: function (callback, ctx) {
            if(this._currentOverlay)  {
                var overlay = this._currentOverlay;
                callback = A.nowOrAtCallback(overlay.$el.detach, overlay.$el, callback, ctx);
                overlay.hide(callback, ctx);
                this._currentOverlay = undefined;
            }
        },
    };
    
    var Events = B.Events;
    
    var Binder = function($el, bmap, ctx){
        this.bmap = bmap;
        this.$el = $el;
        this.context = ctx;
        this.bindMethods();
    }
    
    _.extend(Binder.prototype, {
        bindMethods: function(){
            var self = this;
            _.each(self.bmap, function(cb, selector){
                var $els = self.$el.find(selector);
                $els.each(function(idx, el){
                    cb.apply(self.context, [$(el), idx]);
                });
            });
        },
    });
    
    return {
        TransformStack: TransformStack,
        Geometry: Geometry,
        View: View,
        BView: BView,
        ContainerView: ContainerView,
        IterableView: IterableView,
        Subview: Subview,
        Events: Events,
        Binder: Binder,
        Overlay: Overlay,
        OverlayHandler: OverlayHandler,
        extend: B.Model.extend, // get this from backbone
    };
    
});