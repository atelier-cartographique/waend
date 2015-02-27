/*
 * core/css.js
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


define([ 'underscore', 'backbone', 'core/geom'],
function(_, B, Geom){
    'use strict';

    var USE3D = false;
    
    function px(i){
        return Math.floor(i) + 'px';
    };

    var CSS = {
        withBasicComp: function(base, val){
            return _.object(['-webkit-'+base,'-moz-'+base,'-ms-'+base,'-o-'+base, base],
                [((base == 'transition' &&  val.substring(0, 9) == 'transform') ? '-webkit-':'')+val,val,val,val,val]
            );
        },
       
       center: function($el, $container){
            var ew = $el.width();
            var cw = $container.width();
            var eh = $el.height();
            var ch = $container.height();
            var x = (cw - ew) / 2;
            var y = (ch - eh) / 2;
            this.moveTo($el, {x:x, y:y});
        },
       
       centerVertical: function($el, $container, onComplete, ctx){
            var eh = $el.height();
            var ch = $container.height();
            var y = (ch - eh) / 2;
            var x = parseInt($el.position().left);
            this.moveTo($el, {x:x, y:y}, onComplete, ctx);
        },
       
       centerHorizontal: function($el, $container, onComplete, ctx){
            var ew = $el.width();
            var cw = $container.width();
            var x = (cw - ew) / 2;
            var y = parseInt($el.position().top);
            this.moveTo($el, {x:x, y:y}, onComplete, ctx);
        },
       
       resize: function($el, w, h){
            $el = this.absolute($el);
            h = h || w;
            if(w instanceof Geom.Rect){
                h = w.height();
                w = w.width();
            }
            return $el.css({
                    width: px(w),
                    height: px(h),
            });
        },
       
        absolute: function($el){
            return $el.css({ position: 'absolute',});
        },

        block: function($el, inline){
            if(inline){
                return $el.css({ display: 'inline-block',});
            }
            return $el.css({ display: 'block',});
        },
       
        moveTo:function($el, point, onComplete, ctx){
            if ('x' in point && 'y' in point) {
                this.absolute($el);
                var pos = $el.position();
                if (pos !== undefined) {
                    var tx = point.x - parseInt(pos.left);
                    var ty = point.y - parseInt(pos.top);
                    var T = this.getTransform($el);
                    T.translate(tx, ty);
                    this.transform($el, T, onComplete, ctx)
                } else {
                    console.warn("css.MoveTo: could not move", $el);
                }
            }
        },

        moveToX:function($el, x, onComplete, ctx){
            this.absolute($el);
            var pos = $el.position();
            if (pos !== undefined) {
                var T = this.getTransform($el);
                T.translate(x - parseInt(pos.left), 0);
                this.transform($el, T, onComplete, ctx);
            }
        },

        moveToY: function($el, y, onComplete, ctx){
            this.absolute($el);
            var pos = $el.position();
            if (pos !== undefined) {
                var T = this.getTransform($el);
                T.translate(0, y - parseInt(pos.top));
                this.transform($el, T, onComplete, ctx);
            }
        },

        scale: function ($el, sx, sy, o, onComplete, ctx){
            var T = this.getTransform($el);
            T.scale(sx,sy,o);
            this.transform($el, T, onComplete, ctx)
        },
       
        scaleAbs: function($el, sx, sy, o, onComplete, ctx){
            var T = this.getTransform($el);
            T.resetScale();
            T.scale(sx,sy,o);
            this.transform($el,T, onComplete, ctx);
        },

        translate: function($el, T, onComplete, ctx){
            $el = this.absolute($el);
            if (!(T instanceof Geom.Transform)) {
                if ('x' in T && 'y' in T) {
                    var tx = T.x;
                    var ty = T.y;

                    var T = this.getTransform($el);
                    T.translate(tx, ty);
                }
            }

            return this.transform($el, T, onComplete, ctx);
        },

        resetTranslate: function($el, x, y, onComplete, ctx){
            var T = this.getTransform($el);
            T.resetTranslate(x,y);
            this.transform($el,T, onComplete, ctx);
        },

        transform: function($el, T, onComplete, ctx){
            if (T instanceof Geom.Transform){
                new this.Transform($el, T, onComplete, ctx);
            }
            return $el;
        },

        getTransform: function($el){
            var T = $el.data('__transform__');
            if (T === undefined) {
                var T = new Geom.Transform();
                $el.data('__transform__', T);
            }

            return T;
        },

        Queued: function(){
            this.queue = [];
            this.running = false;
        },

        Transform: function($el, T, onComplete, ctx){
            if (T instanceof Geom.Transform) {
                this.transform = T;
                this.$el = $el;
                // Presence of animationComplete callback indicates a transition
                //  / animation. Therefore we create an animation object
                $el.data('__transform__', T);
                if (onComplete != undefined) {
                    this.transition = new CSS.Transition($el, onComplete, ctx);
                    var transitionString = CSS.withBasicComp('transition', this.transition.toString());
                    this.$el.css(transitionString);
                } else {
                    this.$el.css(CSS.withBasicComp('transition', ''));
                }
                //console.log($el, CSS.withBasicComp('transform', this.CSSMatrix()));
                this.$el.css(CSS.withBasicComp('transform', this.CSSMatrix()));
            }
        },

        Transition: function($el, onComplete, ctx) {
            this.$el = $el;
            this.delay = '0s';
            this.duration = '.8s';
            this.timingFunction = 'ease' // wow -> 'cubic-bezier(.8,3,.63,.02)';
            this.property = 'transform';
            if (_.isFunction(onComplete)) {
                this.$el.on('transitionend', function(evt){
                    if(evt.target == this.$el.get(0)) {
                        onComplete.apply(ctx, arguments)
                        this.$el.off('transitionend');
                    }
                }.bind(this));
            }
        }
    };

    _.extend(CSS.Transform.prototype, {
        CSSMatrix: function(){
            return 'matrix3d' + this.transform.toString3D();
        }
    });

    // Make event-handling available in Transition
    _.extend(CSS.Transition.prototype, B.Events);

    _.extend(CSS.Transition.prototype, {
        toString: function(){
            return  this.property + ' '
                    + this.duration + ' '
                    + this.timingFunction + ' '
                    + this.delay;
        }
    });

    _.extend(CSS.Queued.prototype, {
        register: function (queuedFunction, ctx, callbacks) {
            var entry = {
                queuedFunction: queuedFunction,
                ctx: ctx
            };
            
            if (callbacks !== undefined){
                if (_.isFunction(callbacks)) {
                    entry.onComplete = callbacks;
                } else {
                    if (_.isFunction(callbacks.onComplete))
                        entry.onComplete = callbacks.onComplete;
                    if (_.isFunction(callbacks.beforeStart))
                        entry.beforeStart = callbacks.beforeStart;
                }
            }

            this.queue.push (entry);
        },

        push: function (queuedFunction, ctx, callbacks) {
            this.register(queuedFunction, ctx, callbacks);
            this.run();
        },

        run: function(){
            if (this.running === false && this.queue.length > 0) {
                this.running = true;
                var entry = this.queue.shift();
                // Creation of callback function                
                if (entry.beforeStart !== undefined)
                    entry.beforeStart.apply();

                var onComplete = function () {
                    this.running = false;
                    if (entry.onComplete !== undefined)
                        entry.onComplete.apply();
                    this.run();
                }

                entry.queuedFunction.apply(entry.ctx, [onComplete, this]);
            }
        }
    });
    
    return CSS;
});
