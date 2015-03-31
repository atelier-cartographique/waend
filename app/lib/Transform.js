/**
 *
 * lib/Transform.js 
 * 
 * author: Pierre Marchand <pierremarc07@gmail.com>
 * 
 * date: 2012-04-16
 * 
 */


'use strict';


function Matrix () {
    this.padding = -1;
    this.m = this.new_m_();
};

/**
* Transformation
*/
function Transform () {
    this.m = new Matrix(); 
};

/**
* 
* shortcuts
* 
* */

function transform (){
    return new Transform();
};

function scale (sx, sy, origin){
   if(sy === undefined){
       sy = sx;
    }
    var T = new Transform;
    T.scale(sx, sy, origin);
    return T;
};

function translate (tx, ty){
   if(ty === undefined){
       ty = 0;
    }
    var T = new Transform;
    T.translate(tx, ty);
    return T;
};




Matrix.prototype.new_m_ = function(){
    return [[this.padding],
        [this.padding, 1,0,0],
        [this.padding, 0,1,0],
        [this.padding, 0,0,1]];
};

Matrix.prototype.clone_m_ = function(m){
        var clone = this.new_m_();
        for (var x = 1; x<4; ++x)
        {
                for (var y = 1; y<4; ++y)
                {
                        clone[x][y] = m[x][y];
                }
        }
        return clone;
    };

    /**
    * Multiplies matrix with given matrix and returns resulting matrix
    *
    * @param o {Matrix}
    * @returns {Matrix}
    */
Matrix.prototype.mul = function(o) {
        var product = new Matrix();

        for (var x = 1; x<4; ++x)
        {
            for (var y = 1; y<4; ++y)
            {
                    var sum = 0;
                    for (var z = 1; z<4; ++z){
                        sum += this.m[x][z] * o.m[z][y];
                    }
                    product.m[x][y] = sum;
            }
        }
        this.m = product.m;
        return this;
    };

Matrix.prototype.determinant = function() {
    var min = this.minors(this.m);
    var a = this.m[1][1] * min[1][1];
    var b = this.m[1][2] * min[1][2];
    var c = this.m[1][3] * min[1][3];
    return (a - b + c);
};

Matrix.prototype.determinant2 = function(a, b , c, d) {
    return (a * d) - (b * c);
};

Matrix.prototype.minors = function(m) {
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
};

Matrix.prototype.cofactors = function(m) {
    var c = this.clone_m_(m);
    c[1][2] = m[1][2] * -1;
    c[2][1] = m[2][1] * -1;
    c[2][3] = m[2][3] * -1;
    c[3][2] = m[3][2] * -1;
    return c;
};

Matrix.prototype.adjugate = function(m) {
    var a = this.clone_m_(m);
    a[1][2] = m[2][1];
    a[2][1] = m[1][2];
    a[1][3] = m[3][1];
    a[3][1] = m[1][3];
    a[2][3] = m[3][2];
    a[3][2] = m[2][3];
    return a;
};

Matrix.prototype.inverse = function() {
    var det = this.determinant();
    // we assume that the matrix is always invertible, so wrong but restful :)
    // well, it would throw an division by 0 exception a bit later, thats it
    var m = this.adjugate(this.cofactors(this.minors(this.m)));
    
    var inverse = new Matrix();
    for (var x = 1; x<4; ++x)
    {
            for (var y = 1; y<4; ++y)
            {
                    inverse.m[x][y] = m[x][y] * (1/det);
            }
    }
    return inverse;
};


// ??
Transform.prototype.M = function(p){
    var s = p.toString();
    var a = parseInt(s[0]);
    var b = parseInt(s[1]);
    return this.m.m[a][b];
};

Transform.prototype.reset = function(t){
    this.m.m = Array.apply(Array, t.m.m);
    return this;
};

Transform.prototype.clone = function(){
    var t = new Transform();
    return this.reset.apply(t, [this]);
};

Transform.prototype.inverse = function() {
        var inverse_m = this.m.inverse();
        var inverse = new Transform();
        inverse.m = inverse_m;
        return inverse;
};

Transform.prototype.multiply = function(t){
    if(t instanceof Matrix){
        this.m.mul(t);
    }
    else{
        this.m.mul(t.m);
    }
    return this;
};

Transform.prototype.translate = function(tx,ty) {
    var transMat = new Matrix();
    transMat.m[3][1] = tx;
    transMat.m[3][2] = ty;
    this.m.mul(transMat);
    return this;
};

/**
* Returns the current translate of the transformation matrix
*
* @returns {Geom.Points}
*/
Transform.prototype.currentTranslate = function(){
    return new Geom.Point(this.m.m[3][1], this.m.m[3][2]);
};

/**
* Resets the translation of the matrix to the given x and y
* or 0, 0 if no points were provided. Returns itself
* 
* @param x int
* @param y int
* @returns {Transform}
*/
Transform.prototype.resetTranslate = function(x,y) {            
    this.m.m[3][1] = x || 0;
    this.m.m[3][2] = y || 0;
    return this;
};

/**
* Shortcut for resetTranslate
*/
Transform.prototype.reset_translate = function(x,y){
    return this.resetTranslate(x,y);
};

/**
* Scales with given scale on x-axis and 
* given scale on y-axis, around given origin
* 
* If no sy is provided the scale will be proportional
* @param sx Number
* @param sy Number
* @param origin {Geom.Point}|{}
* @returns {Transform}
*/
Transform.prototype.scale = function(sx, sy, origin) {
    var scaleMat = new Matrix();
    if(origin != undefined)
    {
        var tr1 = new Matrix();
        tr1.m[3][1] = -origin.x;
        tr1.m[3][2] = -origin.y;
        scaleMat.mul(tr1);

        var tr2 = new Matrix();
        tr2.m[1][1] = sx;
        tr2.m[2][2] = sy;
        scaleMat.mul(tr2);

        var tr3 = new Matrix();
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
};

Transform.prototype.getScale = function(){
    return [this.m.m[1][1], this.m.m[2][2]];
},

Transform.prototype.resetScale = function(){
    this.m.m[1][1] = 1;
    this.m.m[2][2] = 1;

    return this;
};

/**
 * an array [x,y]
 */
Transform.prototype.mapVec2 = function(v) {
    var rx = v[0] * this.m.m[1][1] + v[1] * this.m.m[2][1] + this.m.m[3][1];
    var ry = v[0] * this.m.m[1][2] + v[1] * this.m.m[2][2] + this.m.m[3][2];
    v[0] = rx;
    v[1] = ry;
    return v;
};


/**
 * an array of vec2s [[x,y], [x,y], ...]
 */
Transform.prototype.mapCoordinates = function(coordinates) {
    for (var i = coordinates.length - 1; i >= 0; i--) {
        this.mapVec2(coordinates[i]);
    };
    return coordinates;
};

Transform.prototype.mapPoint = function(p) {
    var v = this.mapVec2([p.x, p.y]);
    p.x = v[0];
    p.y = v[1];
    return p;
};

module.exports = exports =  Transform;
