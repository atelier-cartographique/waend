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

var glMatrix = require('../vendors/gl-matrix');

var mat3 = glMatrix.mat3,
    vec2 = glMatrix.vec2;

function Matrix (a, b, c, d, e, f) {
    if (0 === arguments.length) {
        this.m = mat3.create();
    }
    else if (1 === arguments.length) {
        if (arguments[0] instanceof Matrix) {
            this.m = arguments[0].m.clone();
        }
        else if (Array.isArray(arguments[0])) {
            // we assume flat matrix
            Matrix.prototype.parseFlat.apply(this, arguments[0]);
        }
    }
    else if (6 === arguments.length) {
        this.parseFlat(a,b,c,d,e,f);
    }
}

/**
* Transformation
*/
function Transform () {
    if (arguments.length > 0) {
        if (arguments[0] instanceof Transform) {
            this.m = arguments[0].m.clone();
        }
        else {
            var mx = new Matrix();
            Matrix.apply(mx, arguments);
            this.m = mx;
        }
    }
    else {
        this.m = new Matrix();
    }
}


//////////////////// IMPL ///////////////////////


Matrix.prototype.clone = function () {
    var mx = new Matrix();
    mx.m = mat3.clone(this.m);
    return mx;
};


Matrix.prototype.parseFlat = function(a, b, c, d, e, f){
    this.m = mat3.create();
    mat3.copy(this.m,
    [
        a, b, 0,
        c, d, 0,
        e, f, 1
    ]
    );
};

Matrix.prototype.flat = function(){
    var fm = new Array(6);
    fm[0] = this.m[0];
    fm[1] = this.m[1];
    fm[2] = this.m[3];
    fm[3] = this.m[4];
    fm[4] = this.m[6];
    fm[5] = this.m[7];
    return fm;
};

    /**
    * Multiplies matrix with given matrix and returns resulting matrix
    *
    * @param o {Matrix}
    * @returns {Matrix}
    */
Matrix.prototype.mul = function(o) {
    mat3.multiply(this.m, this.m, o.m);
    return this;
};

Matrix.prototype.inverse = function() {
    var inverse = new Matrix();
    mat3.invert(inverse.m, this.m);
    return inverse;
};




// get you an [a b c d e f] matrix
Transform.prototype.flatMatrix = function () {
    return this.m.flat();
};


Transform.prototype.reset = function(t){
    this.m = t.m.clone();
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

Transform.prototype.translate = function(tx, ty) {
    mat3.translate(this.m.m, this.m.m, [tx, ty]);
    return this;
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

    if (undefined !== origin) {
        mat3.translate(scaleMat.m, scaleMat.m, [-origin[0], -origin[1]]);
        mat3.scale(scaleMat.m, scaleMat.m, [sx, sy]);
        mat3.translate(scaleMat.m, scaleMat.m, [origin[0], origin[1]]);
    }
    else
    {
        mat3.scale(scaleMat.m, scaleMat.m, [sx, sy]);
    }
    this.m.mul(scaleMat);
    return this;
};

Transform.prototype.rotate = function (r, origin) {
    var rGrad = r * Math.PI / 180.0,
        rotMat = new Matrix();

    if (undefined !== origin) {
        var base = mat3.create(),
            trMat0 = mat3.create(),
            rMat = mat3.create(),
            trMat1 = mat3.create();
        //
        // mat3.translate(trMat0, base, [origin[0], origin[1]]);
        // mat3.rotate(rMat, base, rGrad);
        // mat3.translate(trMat1, base, [-origin[0], -origin[1]]);
        //
        // mat3.multiply(rotMat.m, rotMat.m, trMat0);
        // mat3.multiply(rotMat.m, rotMat.m, rMat);
        // mat3.multiply(rotMat.m, rotMat.m, trMat1);

        // console.log(mat3.str(rotMat.m));


        mat3.translate(rotMat.m, rotMat.m, [origin[0], origin[1]]);
        mat3.rotate(rotMat.m, rotMat.m, rGrad);
        mat3.translate(rotMat.m, rotMat.m, [-origin[0], -origin[1]]);
    }
    else
    {
        mat3.rotate(rotMat.m, rotMat.m, rGrad);
    }
    this.m.mul(rotMat);
    return this;
};


Transform.prototype.getScale = function(){
    return [this.m.m[0], this.m.m[4]];
};

Transform.prototype.getTranslate = function() {
    return [this.m.m[6], this.m.m[7]];
};

/**
 * an array [x,y]
 */
Transform.prototype.mapVec2 = function(v) {
    return vec2.transformMat3(v, v, this.m.m);
};

Transform.prototype.mapVec2Fn = function(name) {
    var m = this.m.clone();

    var f = function (v) {
        return vec2.transformMat3(v, v, m.m);
    };

    if (name) {
        try {
            Object.defineProperty(f, 'name', {value:name});
        }
        catch (e) {}
    }
    return f;
};



/**
 * an array of vec2s [[x,y], [x,y], ...]
 */
Transform.prototype.mapCoordinates = function(coordinates) {
    for (var i = coordinates.length - 1; i >= 0; i--) {
        this.mapVec2(coordinates[i]);
    }
    return coordinates;
};

Transform.prototype.mapPoint = function(p) {
    var v = this.mapVec2([p.x, p.y]);
    p.x = v[0];
    p.y = v[1];
    return p;
};

module.exports = exports =  Transform;
