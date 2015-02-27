/**
 *
 * geom.js 
 * 
 * author: Pierre Marchand <pierremarc07@gmail.com>
 * 
 * date: 2012-04-16
 * 
 */
define([
        'underscore',
        'core/algo'
    ],
function (_, A) {
    'use strict';
    
    var Geom =  {
        /**
        * Geometry matrix
        */
        Matrix: function() {
            this.padding = -1;
            this.m = this.new_m_();
        },
        
        /**
        * Transformation
        */
        Transform: function() {
            this.m = new Geom.Matrix(); 
        },
       
       /**
        * 
        * shortcuts
        * 
        * */
       
        transform: function(){
            return new Geom.Transform();
        },
       
        scale: function(sx, sy, origin){
           if(sy === undefined){
               sy = sx;
            }
            var T = new Geom.Transform;
            T.scale(sx, sy, origin);
            return T;
        },
       
        translate: function(tx, ty){
           if(ty === undefined){
               ty = 0;
            }
            var T = new Geom.Transform;
            T.translate(tx, ty);
            return T;
        },
        
        Point: function(x, y) {
            x = x || 0;
            y = y || 0;
            if ((x instanceof Geom.Point) || (x.x && x.y)) {
                    this.x = x.x;
                    this.y = x.y;
            } else {
                    this.x = x;
                    this.y = y;
            }
        },

        Line: function(from, to)  {
            if (arguments.length == 1 && ypeof(from) == "array") {
                to = new Geom.Point(from[1]);
                from = new Geom.Point(from[0]);
            }

            this.points = {'start': from, 'end': to};
        },
        
        Path: function() {
            this.points = [];
        },

        Rect: function(left, top, width, height) {
            if (left instanceof Geom.Rect) {
                    this._x = left._x;
                    this._y = left._y;
                    this._width = left._width;
                    this._height = left._height;
            } else if (_.isObject(left)
                && 'left' in left
                && 'top' in left
                && 'right' in left
                && 'bottom' in left
            ) {
                this._x = left.left;
                this._y = left.top;
                this._width = left.width;
                this._height = left.height;
            } else {
                    this._x = left;
                    this._y = top;
                    this._width = width;
                    this._height = height;
            }
        },
        
        Spiral: function (dt, dr, tmin, tmax, rmin, center) {
            this.dt = (dt == undefined) ? 1 : dt;
            this.dr = (dr == undefined) ? 1 : dr;
            this.tmin = (tmin == undefined) ? 0 : tmin;
            this.tmax = (tmax == undefined) ? Math.PI * 6 : tmax;
            this.rmin = (rmin == undefined) ? 0 : rmin;
            this.center = (center == undefined) ? new Geom.Point (0,0) : center;
            this.points = [];
            var r = this.rmin + (this.tmin * this.dr);
            
            for (var t = this.tmin; t < this.tmax; t += this.dt) {
                this.points.push (new Geom.Point (
                    this.center.x + r * Math.cos (t),
                    this.center.y + r * Math.sin (t)
                ));
                r += this.dr;
            }
        },
        
        SpiralPositioner: function () {
            this.idx = 0;
            this.dt = .2;
            this.dr = 1;
            this.tmin = 0;
            this.tmax = 190;
            this.rmin = 0;
            this.center = new Geom.Point (0,0);
            this.spiral = new Geom.Spiral (this.dt, this.dr, this.tmin, this.tmax, this.rmin, this.center);
            this.elements = {};
            this.canvas = new Geom.Rect (0,0,0,0);
            this._lastId = -1;
        },

        RowPositioner: function (canvas, align, valign) {
            this.alignments = {top: 'top', right: 'right', bottom: 'bottom', left: 'left', center: 'center'};
            this.canvas = canvas || new Geom.Rect (0,0,0,0);
            this.align = align || this.alignments.left;
            this.valign = valign || this.alignments.top
            this.width = 0;
            this.elements = [];
        },
    };
    
    
    _.extend (Geom.Matrix.prototype, {
        new_m_ : function(){
            return [[this.padding],
                [this.padding, 1,0,0],
                [this.padding, 0,1,0],
                [this.padding, 0,0,1]];
        },

        clone_m_ : function(m){
            var clone = this.new_m_();
            for (var x = 1; x<4; ++x)
            {
                    for (var y = 1; y<4; ++y)
                    {
                            clone[x][y] = m[x][y];
                    }
            }
            return clone;
        },

        /**
        * Multiplies matrix with given matrix and returns resulting matrix
        *
        * @param o {Geom.Matrix}
        * @returns {Geom.Matrix}
        */
        mul : function(o) {
            var product = new Geom.Matrix();

            for (var x = 1; x<4; ++x)
            {
                for (var y = 1; y<4; ++y)
                {
                        var sum = 0;
                        for (var z = 1; z<4; ++z)
                                sum += this.m[x][z] * o.m[z][y];
                        product.m[x][y] = sum;
                }
            }
            this.m = product.m;
            return this;
        },

        determinant : function() {
            var min = this.minors(this.m);
            var a = this.m[1][1] * min[1][1];
            var b = this.m[1][2] * min[1][2];
            var c = this.m[1][3] * min[1][3];
            return (a - b + c);
        },
        
        determinant2 : function(a, b , c, d) {
            return (a * d) - (b * c);
        },
        
        minors : function(m) {
            var minor11 = this.determinant2(m[2][2], m[2][3], m[3][2], m[3][3]) ;
            var minor12 = this.determinant2(m[2][1], m[2][3], m[3][1], m[3][3]) ;
            var minor13 = this.determinant2(m[2][1], m[2][2], m[3][1], m[3][2]) ;
            var minor21 = this.determinant2(m[1][2], m[1][3], m[3][2], m[3][3]) ;
            var minor22 = this.determinant2(m[1][1], m[1][3], m[3][1], m[3][3]) ;
            var minor23 = this.determinant2(m[1][1], m[1][2], m[3][1], m[3][2]) ;
            var minor31 = this.determinant2(m[1][2], m[1][3], m[2][2], m[2][3]) ;
            var minor32 = this.determinant2(m[1][1], m[1][3], m[2][1], m[2][3]) ;
            var minor33 = this.determinant2(m[1][1], m[1][2], m[2][1], m[2][3]) ; 
            var padding = -1;
            return  [[padding],
                    [padding, minor11,minor12,minor13],
                    [padding, minor21,minor22,minor23],
                    [padding, minor31,minor32,minor33]];
        },
        
        cofactors : function(m) {
            var c = this.clone_m_(m);
            c[1][2] = m[1][2] * -1;
            c[2][1] = m[2][1] * -1;
            c[2][3] = m[2][3] * -1;
            c[3][2] = m[3][2] * -1;
            return c;
        },
        
        adjugate: function(m) {
            var a = this.clone_m_(m);
            a[1][2] = m[2][1];
            a[2][1] = m[1][2];
            a[1][3] = m[3][1];
            a[3][1] = m[1][3];
            a[2][3] = m[3][2];
            a[3][2] = m[2][3];
            return a;
        },
        
        inverse : function() {
            var det = this.determinant();
            // we assume that the matrix is always invertible, so wrong but restful :)
            // well, it would throw an division by 0 exception a bit later, thats it
            var m = this.adjugate(this.cofactors(this.minors(this.m)));
            
            var inverse = new Geom.Matrix();
            for (var x = 1; x<4; ++x)
            {
                    for (var y = 1; y<4; ++y)
                    {
                            inverse.m[x][y] = m[x][y] * (1/det);
                    }
            }
            return inverse;
        },
    });
    
    _.extend(Geom.Transform.prototype, {
        
        M: function(p){
            var s = p.toString();
            var a = parseInt(s[0]);
            var b = parseInt(s[1]);
            return this.m.m[a][b];
        },
        
        reset: function(t){
            this.m.m = _.clone(t.m.m);
        },
        
        inverse: function() {
                var inverse_m = this.m.inverse();
                var inverse = new Geom.Transform();
                inverse.m = inverse_m;
                return inverse;
        },
        
        multiply: function(t){
            if(t instanceof Geom.Matrix){
                this.m.mul(t);
            }
            else{
                this.m.mul(t.m);
            }
            return this;
        },

        translate: function(tx,ty) {
            var transMat = new Geom.Matrix();
            transMat.m[3][1] = tx;
            transMat.m[3][2] = ty;
            this.m.mul(transMat);
            return this;
        },

        /**
        * Returns the current translate of the transformation matrix
        *
        * @returns {Geom.Points}
        */
        currentTranslate: function(){
            return new Geom.Point(this.m.m[3][1], this.m.m[3][2]);
        },

        /**
        * Resets the translation of the matrix to the given x and y
        * or 0, 0 if no points were provided. Returns itself
        * 
        * @param x int
        * @param y int
        * @returns {Geom.Transform}
        */
        resetTranslate: function(x,y) {            
            this.m.m[3][1] = x | 0;
            this.m.m[3][2] = y | 0;
            return this;
        },

        /**
        * Shortcut for resetTranslate
        */
        reset_translate: function(x,y){
            return this.resetTranslate(x,y);
        },

        /**
        * Scales with given scale on x-axis and 
        * given scale on y-axis, around given origin
        * 
        * If no sy is provided the scale will be proportional
        * @param sx Number
        * @param sy Number
        * @param origin {Geom.Point}|{}
        * @returns {Geom.Transform}
        */
        scale: function(sx, sy, origin) {
            var scaleMat = new Geom.Matrix();
            if(origin != undefined)
            {
                var tr1 = new Geom.Matrix();
                tr1.m[3][1] = -origin.x;
                tr1.m[3][2] = -origin.y;
                scaleMat.mul(tr1);

                var tr2 = new Geom.Matrix();
                tr2.m[1][1] = sx;
                tr2.m[2][2] = sy;
                scaleMat.mul(tr2);

                var tr3 = new Geom.Matrix();
                tr3.m[3][1] = origin.x;
                tr3.m[3][2] = origin.y;
                scaleMat.mul(tr3);
            }
            else
            {
                scaleMat.m[1][1] = sx;
                scaleMat.m[2][2] = sy;
            }
            this.m.mul(scaleMat);
            return this;
        },
        
        getScale: function(){
            return [this.m.m[1][1], this.m.m[2][2]];
        },

        resetScale: function(){
            this.m.m[1][1] = 1;
            this.m.m[2][2] = 1;

            return this;
        },

        mapPoint: function(p) {
            var rx = p.x * this.m.m[1][1] + p.y * this.m.m[2][1] + this.m.m[3][1];
            var ry = p.x * this.m.m[1][2] + p.y * this.m.m[2][2] + this.m.m[3][2];
            p.x = rx;
            p.y = ry;
            return p;
        },

        mapRect: function(r) {
            var tl = r.topleft();
            var br = r.bottomright();
            this.mapPoint(tl);
            this.mapPoint(br);
            r._x = tl.x;
            r._y = tl.y;
            r._width = br.x - tl.x;
            r._height = br.y - tl.y;

            return r;
        },

        toString: function(){
            return '('
                    +this.m.m[1][1]+', ' // A
                    +this.m.m[2][1]+', ' // C
                    +this.m.m[1][2]+', ' // B
                    +this.m.m[2][2]+', ' // D
                    +this.m.m[3][1]+', ' // E = tX
                    +this.m.m[3][2]      // F = tY
                    +')';
        },

        toString3D: function(){
            /*
             * [A,B,0,0
             *  C,D,0,0
             *  E,F,1,0
             *  0,0,0,1]
             */
            return '('
                    +this.m.m[1][1]+','+this.m.m[2][1]+',0,0,'
                    +this.m.m[1][2]+','+this.m.m[2][2]+',0,0,'
                    +'0,0,1,0,'
                    +this.m.m[3][1]+','+this.m.m[3][2]+',0,1)'
        }
    });
    
    _.extend (Geom.Point.prototype, {
        /**
        * Returns difference between this and given point
        *
        * @param p {Geom.Point}
        * @returns {Geom.Point}
        */
        delta: function(p) {
                return (new Geom.Point(p.x - this.x, p.y - this.y)); 
        },
        
        /**
        * Returns distance between this and given point
        *
        * @param p {Geom.Point}
        * @returns Number
        */
        distance:function(p){
            var d = this.delta(p);
            return Math.sqrt(d.x * d.x + d.y * d.y);
        },

        /**
        * Applies the given delta and returns itself
        * (Should deprecate this and use translate instead?) - GDH
        *
        * @param p {Geom.Point}
        * @returns {Geom.Point}
        */
        apply_delta: function(p) {
            console.warn("apply_delta is deprecated. Please use Geom.Transform instead")
            this.x += p.x;
            this.y += p.y;
            
            return this;
        },

        /**
        * Returns string representation of itself
        *
        * @returns String
        */
        toString: function() {
                return " [ " +this.x + " ; " +this.y + " ] ";
        },

        /**
        * Shortcut for a scale transformation on itself
        *
        * @returns {Geom.Point}
        */
        scale: function(sx, sy, origin) {
            var t = new Geom.Transform();
            t.scale(sx, sy, origin);
            return this.transform(t);
        },
        
        /**
        * Shortcut for a translate transformation on itself.
        * Returns a copy of itself with translation applied
        * 
        * @param dx Number
        * @param dy Number
        * @returns {Geom.Point}
        */
        translate: function(dx, dy) {
            if (dx instanceof Geom.Point) {
                dy = dx.y;
                dx = dx.x;
            }
            var t = new Geom.Transform();
            t.translate(dx, dy);
            return this.transform(t);
        },

        /**
        * Applies given transformation and returns itself
        * 
        * @param t {Geom.Transform}
        * @returns {Geom.Point}
        */
        transform: function(t){
            return t.mapPoint (this);
        },
        
    });

    _.extend(Geom.Path.prototype, {
        /**
        * Adds a given point, line, or list of points & lines to the path
        * 
        * @param data Point|Line|[]
        * @returns Geom.Path
        */
        add: function(data){
            if(data instanceof Geom.Line) {
                this.points.push(data.start);
                this.points.push(data.end);
            } else if (data instanceof Geom.Point) {
                this.points.push(data);
            } else if ('x' in data && 'y' in data) {
                this.add(new Geom.Point(data.x, data.y));
            } else {
                _.each(data,function(point){
                    this.add(point);
                }, this);
            }

            return this;
        },

        /**
        * Applies given transformation to itself. Returns itself.
        *
        * @param T {Geom.Transform}
        * @returns {Geom.Path}
        */        
        transform: function(T){
            _.each(this.points, function(point){
                T.mapPoint (point);
            }, this);

            return this;
        }
    });
    
    _.extend(Geom.Rect.prototype, {
        /**
        * Returns y-value topside of rectangle
        *
        * @returns Number
        */
        top: function() {
            return this._y;
        },

        /**
        * Returns x-value leftside of rectangle
        *
        * @returns Number
        */
        left: function() {
            return this._x;
        },

        /**
        * Returns x-value rightside of rectangle
        *
        * @returns Number
        */
        right: function() {
            return this._x + this._width;
        },

        /**
        * Returns y-value bottomside of rectangle
        *
        * @returns Number
        */
        bottom: function() {
            return this._y + this._height;
        },

        /**
        * Returns the width of the rectangle
        *
        * @returns Number
        */
        width: function() {
            return this._width;
        },

        /**
        * Returns the height of the rectangle
        *
        * @returns Number
        */
        height: function() {
            return this._height;
        },

        /**
        * Returns the center of the rectangle
        *
        * @returns {Geom.Point}
        */
        center: function() {
            return (new Geom.Point(this._x + (this._width / 2), this._y + (this._height / 2)));
        },

        /**
        * Returns the topleft-corner of the rectangle
        *
        * @returns {Geom.Point}
        */
        topleft: function() {
            return (new Geom.Point(this._x , this._y ));
        },
        
        /**
        * Returns the topright-corner of the rectangle
        *
        * @returns {Geom.Point}
        */
        topright: function() {
            return (new Geom.Point(this._x + this._width , this._y ));
        },
        
        /**
        * Returns the bottomleft-corner of the rectangle
        *
        * @returns {Geom.Point}
        */
        bottomleft: function() {
            return (new Geom.Point(this._x , this._y + this._height ));
        },
        
        /**
        * Returns the bottomright corner of the rectangle
        *
        * @returns {Geom.Point}
        */
        bottomright: function() {
            return (new Geom.Point(this._x + this._width, this._y + this._height));
        },
        
        /**
        * Returns the length of the diagonal of the reactangle
        *
        * @returns Number
        */
        diagonal: function() {
            return this.bottomright().distance(this.topleft());
        },

        /**
        * Returns the surface of this rectangle
        *
        * @returns Number
        */
        surface: function () {
            return this.width() * this.height();
        },

        translate: function(dx, dy) {
            this._x += dx; this._y += dy;
        },
        
        moveTo: function(x, y) {
            if (x instanceof Geom.Point) {
                this.moveTo(x.x, x.y);
            } else {
                this._x = x; this._y = y;
            }
        },
        
        /**
        * Tests whether this and given rect intersect
        *
        * @param r {Geom.Rect}
        * @returns bool
        */
        intersects: function(r)  {
            if (r instanceof Geom.Rect) {
                return (
                    this.left() <= r.right() 
                    && r.left() <= this.right()
                    && this.top() <= r.bottom()
                    && r.top() <= this.bottom()
                );
            } else {
                return false;
            }
        },

        /**
        * Tests whether the given rect is inside of this rect
        *
        * @param r {Geom.Rect}
        * @returns bool
        */
        includes: function(r) {
            if (r instanceof Geom.Rect) {
                return (
                    this.left() <= r.left() 
                    && this.right() >= r.right()
                    && this.bottom() >= r.bottom()
                    && this.top() <= r.top()
                );
            } else {
                return false
            }
        },
        
        /**
        * Returns a rectangle enlarged by s on all sides, if apply 
        * is true it also applies it to itself, defaults to True
        *
        * @param s Number
        * @param apply Bool optional, default: True
        * @returns {Geom.Rect}
        */
        buffer: function(s, apply){
            if (arguments.length > 1 && apply === false) {
                var rect = new Geom.Rect (this);
                return rect.buffer (s);
            }    
             
            this._x -= s;
            this._y -= s;
            this._width += 2*s;
            this._height += 2*s;

            return this;
        },
        
        /**
        * Enlarges rectangle to also include given rectangle,
        * returns itself
        *
        * @param r {Geom.Rect}
        * @returns {Geom.Rect}
        */
        add: function(r){
            var b0 = this.bottom();
            var b1 = r.bottom();
            var r0 = this.right();
            var r1 = r.right();
            this._x = Math.min(this.left(), r.left());
            this._y = Math.min(this.top(), r.top());
            this._width = Math.max(r0,r1) - this.left();
            this._height = Math.max(b0,b1) - this.top();
            return this;
        },
        
        /**
        * Shortcut for a scale transformation on itself
        *
        * @returns {Geom.Rect}
        */
        scale: function(s, o) {
            var t = new Geom.Transform();
            t.scale(s,s, o);
            t.mapRect(this);
            return this;
        },
        
        /**
        * Returns a string representation of itself
        */
        toString: function() {
            return '('+Math.floor(this._x)
                    +'+'+Math.floor(this._y)
                    +' '+Math.floor(this._width)
                    +'x'+Math.floor(this._height)+')';
        },

        /**
        * Returns a Geom.Transform to make itself fit inside 
        * given rectangle. Fill indicates wheter the rectangle
        * must fit in the given rectangle, False. Or fill the 
        * given rectangle, True.
        *
        * @param rectangle {Geom.Rect}
        * @param fill bool
        * @returns {Geom.Transform}
        */
        fitRect: function(rectangle, fill) {
            var itemRatio = this.height() / this.width();
            var rectRatio = rectangle.height() / rectangle.width();
            var scale = (fill ? itemRatio > rectRatio : itemRatio < rectRatio)
            ? rectangle.width() / this.width()
            : rectangle.height() / this.height();

            this.scale(scale);
            var dx = rectangle.center().x - this.center().x;
            var dy = rectangle.center().y - this.center().y;
            this.translate(dx,dy);
            
            var T = new Geom.Transform;
            T.scale(scale,scale);
            T.translate(dx,dy);
            return T;
        },

        /**
        * Clears a rectangle, with same properties as itself
        * on a given canvas.
        *
        * @FIXME: should not be here...
        *
        * @param CanvasElement
        */
        clear: function (canvas) {
            var ctx = canvas.getContext('2d');
            ctx.clearRect (this.left(), this.top(), this.right(), this.bottom());
        },

        /**
        * Applies given transformation to itself and returns itself
        *
        * @param t {Geom.Transform}
        * @returns {Geom.rect}
        */
        transform: function(t){
            if(t instanceof Geom.Transform) {
                t.mapRect(this);
                return this;
            }
        },

        /**
        * Compares given rect to itself. Returns true if width, height and
        * topleft corner are the same
        *
        * @returns bool
        */
        sameAs: function(rect) {
            return (
                rect instanceof Geom.Rect
                && this._x == rect._x
                && this._y == rect._y
                && this._width == rect._width
                && this._height == rect._height
            );
        }
    });
    
    _.extend (Geom.SpiralPositioner.prototype, {
        setCanvas: function (canvas) {
            if (canvas instanceof Geom.Rect) {
                this.canvas = canvas;
            }
        },
        intersects: function (rect) {
            return _.some (this.elements, function(element) {
                return rect.intersects(element);
            }, this);
        },
        
        position: function(rect, buffer) {
            if (buffer)
            {
                rect.buffer (buffer);
            }
            var T = new Geom.Transform ();
            T.translate (-rect.width()*.5, -rect.height()*.5);
            for (var i = 0; i < this.spiral.points.length; i++){
                var pnt = new Geom.Point (this.spiral.points[i]);
                T.mapPoint(pnt);
                rect.moveTo(pnt);
                if (this.canvas.includes(rect)
                    && this.intersects(rect) === false)
                {
                    var id = this.registerElement(rect);
                    if (buffer)
                    {
                        rect.buffer (-buffer);
                    }
                    return {
                        'id': id,
                        'rect': rect,
                        'position': rect.topleft()
                    };
                }
            }
            return false;
        },

        registerElement: function (rect) {
            if (rect instanceof Geom.Rect) {
                var id = A.nextInSequence();
                this.elements[id] = rect;
                return id;
            }
        },

        removeElement: function (id) {
            if (id in this.elements)
                delete this.elements[id];
        },

        clearElements: function () {
            this.elements = {};
        },
    });

    _.extend (Geom.RowPositioner.prototype, {
        setCanvas: function(canvas) {
            if (canvas instanceof Geom.Rect) {
                this.canvas = canvas;
            }
        },

        /*
         * Registers an element with the positioner, without 
         * positioning them
         */
        register: function(rect, buffer, callback, ctx){
            if (rect instanceof Geom.Rect){
                if (this.width + rect.width() <= this.canvas.width()) {
                    var el = {
                        'rect': rect.buffer(buffer),
                        'buffer': buffer,
                        'callback': callback.bind(ctx),
                    }

                    this.elements.push(el);
                    e
                    this.width += el.rect.width();
                    return el;
                }
            }

            return false;
        },

        /*
         * Sets internal width after calculation
         */
        setInternalWidth: function(){
            this.width = this.getInternalWidth();
        },

        /*
         * Repositionins all the elements
         */
        reposition: function(){
            var x = this.getX();

            _.each (this.elements, function (element) {
                var y = this.getY(element);
                element.rect.moveTo(x,y);
                element.callback(element.rect.buffer(-element.buffer, false).topleft());
                x += element.rect.width();
            }, this);
        },

        /*
         * Places the given element in the row. But will also
         * cause all the other elements top be repositioned
         */
        position: function(rect, buffer, callback, ctx){
            var el = this.register(rect, buffer, callback, ctx);
            if (el === false)
                return el;

            this.reposition();
            return el.rect.buffer(-el.buffer, false).topleft();
        },

        /*
         * Returns the internal X coordinate for the given element
         */
        getX: function (element) {
            var offset = 0;    

            if (arguments.length > 0) {
                for (var i=0; i<this.elements.length;i++) {
                    if (this.elements[i] == element)
                        break;

                    offset += this.elements[i].rect.width();
                }
            }

            switch (this.align) {
                case this.alignments.right:
                    return this.canvas.right() - this.width + offset;
                case this.alignments.center:
                    return this.canvas.left() + (this.canvas.width() - this.width) * .5 + offset;
                default:
                    return this.canvas.left() + offset;
            }
        },

        /*
         * Returns the Y-coordinate for the given element.
         */
        getY: function (element) {
            switch (this.valign) {
                case this.alignments.bottom:
                    return this.canvas.bottom() - element.rect.height();
                case this.alignments.center:
                    return this.canvas.top() + (this.canvas.height() - element.rect.height()) * .5
                default:
                    return this.canvas.top();
            }
        },

        /*
         * Calculates the width of all the elements
         */
        getInternalWidth: function(){
            return _.reduce(this.elements, function(width,el){
                return width + el.rect.width();
            },0);
        }
    });
    
    return Geom;
});