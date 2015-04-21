/**
 *
 * lib/Transform.js
 *
 * author: Pierre Marchand <pierremarc07@gmail.com>
 *
 * date: 2012-04-16
 *
 */




function Matrix (a, b, c, d, e, f) {
    this.padding = null;
    if (arguments.length === 0) {
        this.m = this.new_m_();
    }
    else if (arguments.length === 1) {
        if (arguments[0] instanceof Matrix) {
            this.m = this.clone_m_(arguments[0].m);
        }
        else if (Array.isArray(arguments[0])) {
            // we assume flat matrix
            Matrix.prototype.parseFlat.apply(this, arguments[0]);
        }
    }
    else if (arguments.length === 6) {
        this.m = this.parseFlat(a,b,c,d,e,f);
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

Matrix.prototype.new_m_ = function(){
    return [[this.padding],
        [this.padding, 1,0,0],
        [this.padding, 0,1,0],
        [this.padding, 0,0,1]];
};

Matrix.prototype.clone_m_ = function(m){
    return Array.apply(null, m);
};

Matrix.prototype.clone = function () {
    var mx = new Matrix();
    mx.m = this.clone_m_(this.m);
    return mx;
};

/*

11, 21, 31
12, 22, 32
--, --, --
*/
Matrix.prototype.M = function(p, val){
    var a,b;
    switch (p) {
        case 11:
            a = 1;
            b = 1;
            break;
        case 12:
            a = 2;
            b = 1;
            break;
        case 21:
            a = 1;
            b = 2;
            break;
        case 22:
            a = 2;
            b = 2;
            break;
        case 31:
            a = 1;
            b = 3;
            break;
        case 32:
            a = 2;
            b = 3;
            break;
    }
    if (arguments.length === 1) {
        return this.m[a][b];
    }
    else {
        this.m[a][b] = val;
    }
};

Matrix.prototype.parseFlat = function(a, b, c, d, e, f){
    this.M(11, a);
    this.M(12, b);
    this.M(21, c);
    this.M(22, d);
    this.M(31, e);
    this.M(32, f);
};

Matrix.prototype.flat = function(){
    var fm = new Array(6);
    fm[0] = this.M(11);
    fm[1] = this.M(12);
    fm[2] = this.M(21);
    fm[3] = this.M(22);
    fm[4] = this.M(31);
    fm[5] = this.M(32);
    return fm;
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

Matrix.prototype.determinant2 = function(a, b, c, d) {
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
    var padding = null;
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




// get you an [a b c d e f] matrix
Transform.prototype.flatMatrix = function () {
    return this.m.flat();
};

Transform.prototype.M = function(){
    return  Matrix.prototype.M.apply(this.m, arguments);
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
    transMat.M(31, tx);
    transMat.M(32, ty);
    this.m.mul(transMat);
    return this;
};

/**
* Returns the current translate of the transformation matrix
*
* @returns {Geom.Points}
*/
Transform.prototype.currentTranslate = function(){
    return new Geom.Point(this.M(31), this.M(32));
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
    this.M(31, x || 0);
    this.M(32, y || 0);
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
    if(origin !== undefined)
    {
        var tr1 = new Matrix();
        tr1.M(31, -origin.x);
        tr1.M(32, -origin.y);
        scaleMat.mul(tr1);

        var tr2 = new Matrix();
        tr2.M(11, sx);
        tr2.M(22, sy);
        scaleMat.mul(tr2);

        var tr3 = new Matrix();
        tr3.M(31, origin.x);
        tr3.M(32, origin.y);
        scaleMat.mul(tr3);
    }
    else
    {
        scaleMat.M(11, sx);
        scaleMat.M(22, sy);
    }
    this.m.mul(scaleMat);
    return this;
};

Transform.prototype.rotate = function (r, origin) {
    var rGrad = (r * 3.14159 / 180.0),
        cosR = Math.cos(rGrad),
        sinR = Math.sin(rGrad),
        rotMat = new Matrix ();

    if(origin)
    {
        var tr1 = new Matrix();
        tr1.M(31, -origin.x);
        tr1.M(32, -origin.y);
        rotMat.mul(tr1);

        var tr2 = new Matrix();
        tr2.M(11, cosR);
        tr2.M(12,  sinR);
        tr2.M(21,  -sinR);
        tr2.M(22,  cosR);
        rotMat.mul(tr2);

        var tr3 = new Matrix();
        tr3.M(31, origin.x);
        tr3.M(32, origin.y);
        rotMat.mul(tr3);
    }
    else
    {
        rotMat.m(11, cosR);
        rotMat.m(12, sinR);
        rotMat.m(21, -sinR);
        rotMat.m(22, cosR);
    }
    this.m.mul(rotMat);

    return this;
};


Transform.prototype.getScale = function(){
    return [this.M(11), this.M(22)];
};

Transform.prototype.resetScale = function(){
    this.M(11, 1);
    this.M(22, 1);
    return this;
};

/**
 * an array [x,y]
 */
Transform.prototype.mapVec2 = function(v) {
    var rx = v[0] * this.M(11) + v[1] * this.M(21) + this.M(31);
    var ry = v[0] * this.M(12) + v[1] * this.M(22) + this.M(32);
    v[0] = rx;
    v[1] = ry;
    return v;
};

Transform.prototype.mapVec2Fn = function() {
    var m11 = this.M(11),
        m21 = this.M(21),
        m31 = this.M(31),
        m12 = this.M(12),
        m22 = this.M(22),
        m32 = this.M(32);
    return function (v) {
        v[0] = (v[0] * m11) + (v[1] * m21) + m31;
        v[1] = (v[0] * m12) + (v[1] * m22) + m32;
        return v;
    };
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
