/**
 *
 * lib/Transform.js
 *
 * author: Pierre Marchand <pierremarc07@gmail.com>
 *
 * date: 2012-04-16
 *
 */


function M () {
    this._11 = 1;
        this._12 = 0;
            this._13 = 0;
    this._21 = 0;
        this._22 = 1;
            this._23 = 0;
    this._31 = 0;
        this._32 = 0;
            this._33 = 1;
}

M.prototype.clone = function () {
    var nm = new M();
    nm._11 = this._11;
        nm._12 = this._12;
            nm._13 = this._13;
    nm._21 = this._21;
        nm._22 = this._22;
            nm._23 = this._23;
    nm._31 = this._31;
        nm._32 = this._32;
            nm._33 = this._33;

    return nm;
};


function Matrix (a, b, c, d, e, f) {
    this.padding = null;
    if (arguments.length === 0) {
        this.m = new M();
    }
    else if (arguments.length === 1) {
        if (arguments[0] instanceof Matrix) {
            this.m = arguments[0].m.clone();
        }
        else if (Array.isArray(arguments[0])) {
            // we assume flat matrix
            Matrix.prototype.parseFlat.apply(this, arguments[0]);
        }
    }
    else if (arguments.length === 6) {
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
    mx.m = this.m.clone();
    return mx;
};


Matrix.prototype.parseFlat = function(a, b, c, d, e, f){
    this.m = new M();
    this.m._11 = a;
    this.m._12 = b;
    this.m._21 = c;
    this.m._22 = d;
    this.m._31 = e;
    this.m._32 = f;
};

Matrix.prototype.flat = function(){
    var fm = new Array(6);
    fm[0] = this.m._11;
    fm[1] = this.m._12;
    fm[2] = this.m._21;
    fm[3] = this.m._22;
    fm[4] = this.m._31;
    fm[5] = this.m._32;
    return fm;
};

    /**
    * Multiplies matrix with given matrix and returns resulting matrix
    *
    * @param o {Matrix}
    * @returns {Matrix}
    */
Matrix.prototype.mul = function(o) {
    var m = new M();
m._11 = (this.m._11 * o.m._11) + (this.m._12 * o.m._21) + (this.m._13 * o.m._31) ;
m._12 = (this.m._11 * o.m._12) + (this.m._12 * o.m._22) + (this.m._13 * o.m._32) ;
m._13 = (this.m._11 * o.m._13) + (this.m._12 * o.m._23) + (this.m._13 * o.m._33) ;
m._21 = (this.m._21 * o.m._11) + (this.m._22 * o.m._21) + (this.m._23 * o.m._31) ;
m._22 = (this.m._21 * o.m._12) + (this.m._22 * o.m._22) + (this.m._23 * o.m._32) ;
m._23 = (this.m._21 * o.m._13) + (this.m._22 * o.m._23) + (this.m._23 * o.m._33) ;
m._31 = (this.m._31 * o.m._11) + (this.m._32 * o.m._21) + (this.m._33 * o.m._31) ;
m._32 = (this.m._31 * o.m._12) + (this.m._32 * o.m._22) + (this.m._33 * o.m._32) ;
m._33 = (this.m._31 * o.m._13) + (this.m._32 * o.m._23) + (this.m._33 * o.m._33) ;

//
//     console.log('\nDOT ---------------');
// this.print();
// console.log(' x ');
// o.print();
//
//     for (var x = 1; x < 4; ++x)
//     {
//         for (var y = 1; y < 4; ++y)
//         {
//             var sum = 0;
//             var dbg = 'product.M( '+x+''+y+', ';
//             for (var z = 1; z < 4; ++z){
//                 sum += this.m[x][z] * o.m[z][y];
//                 dbg += '(this.M('+x+''+z+') * o.M('+z+''+y+')) ';
//                 if(z < 3) {
//                     dbg += '+ ';
//                 }
//             }
//             console.log(dbg + ')');
//             product.m[x][y] = sum;
//         }
//     }
    this.m = m;
    // console.log(' = ');
    // this.print();
    return this;
};


Matrix.prototype.print = function () {
    var str = [
        this.m._11 +' '+ this.m._21+' '+this.m._31,
        this.m._12 +' '+ this.m._22+' '+this.m._32,
        this.m._13 +' '+ this.m._23+' '+this.m._33].join('\n');
    console.log(str);
};

Matrix.prototype.determinant = function() {
    var min = this.minors(this.m);
    var a = this.m._11 * min._11;
    var b = this.m._12 * min._12;
    var c = this.m._13 * min._13;
    return (a - b + c);
};

Matrix.prototype.determinant2 = function(a, b, c, d) {
    return (a * d) - (b * c);
};

Matrix.prototype.minors = function(m) {
    var minor = new M();
     minor._11 = this.determinant2(m._22, m._23, m._32, m._33) ;
     minor._12 = this.determinant2(m._21, m._23, m._31, m._33) ;
     minor._13 = this.determinant2(m._21, m._22, m._31, m._32) ;
     minor._21 = this.determinant2(m._12, m._13, m._32, m._33) ;
     minor._22 = this.determinant2(m._11, m._13, m._31, m._33) ;
     minor._23 = this.determinant2(m._11, m._12, m._31, m._32) ;
     minor._31 = this.determinant2(m._12, m._13, m._22, m._23) ;
     minor._32 = this.determinant2(m._11, m._13, m._21, m._23) ;
    minor._33 = this.determinant2(m._11, m._12, m._21, m._23) ;
    return minor;
};

Matrix.prototype.cofactors = function(m) {
    var c = m.clone();
    c._12 = m._12 * -1;
    c._21 = m._21 * -1;
    c._23 = m._23 * -1;
    c._32 = m._32 * -1;
    return c;
};

Matrix.prototype.adjugate = function(m) {
    var a = m.clone();
    a._12 = m._21;
    a._21 = m._12;
    a._13 = m._31;
    a._31 = m._13;
    a._23 = m._32;
    a._32 = m._23;
    return a;
};

Matrix.prototype.inverse = function() {
    var det = this.determinant();
    // we assume that the matrix is always invertible, so wrong but restful :)
    // well, it would throw an division by 0 exception a bit later, thats it
    var m = this.adjugate(this.cofactors(this.minors(this.m)));

    var inverse = new Matrix();

inverse.m._11 = m._11 * (1/det);
inverse.m._12 = m._12 * (1/det);
inverse.m._13 = m._13 * (1/det);
inverse.m._21 = m._21 * (1/det);
inverse.m._22 = m._22 * (1/det);
inverse.m._23 = m._23 * (1/det);
inverse.m._31 = m._31 * (1/det);
inverse.m._32 = m._32 * (1/det);
inverse.m._33 = m._33 * (1/det);

    return inverse;
};




// get you an [a b c d e f] matrix
Transform.prototype.flatMatrix = function () {
    return this.m.flat();
};

Transform.prototype.M = function(){
    var key = '_' + arguments[0];
    if(arguments.length > 1) {
        this.m.m[key] = arguments[1];
    }
    else {
        return  this.m.m[key];
    }
};

Transform.prototype.reset = function(t){
    this.m.m = t.m.m.clone();
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
    transMat.m._31 = tx;
    transMat.m._32 = ty;
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
        tr1.m._31 = -origin.x;
        tr1.m._32 = -origin.y;
        scaleMat.mul(tr1);

        var tr2 = new Matrix();
        tr2.m._11 = sx;
        tr2.m._22 = sy;
        scaleMat.mul(tr2);

        var tr3 = new Matrix();
        tr3.m._31 = origin.x;
        tr3.m._32 = origin.y;
        scaleMat.mul(tr3);
    }
    else
    {
        scaleMat.m._11 = sx;
        scaleMat.m._22 = sy;
    }
    this.m.mul(scaleMat);
    return this;
};

Transform.prototype.rotate = function (r, origin) {
    var rGrad = (r * Math.PI / 180.0),
        cosR = Math.cos(rGrad),
        sinR = Math.sin(rGrad),
        rotMat = new Matrix ();

    if(origin)
    {
        var tr1 = new Matrix();
        tr1.m._31 = -origin.x;
        tr1.m._32 = -origin.y;
        rotMat.mul(tr1);
// console.log(tr1.flat());

        var tr2 = new Matrix();
        tr2.m._11 = cosR;
        tr2.m._12 =  sinR;
        tr2.m._21 =  -sinR;
        tr2.m._22 =  cosR;
        rotMat.mul(tr2);
// console.log(tr2.flat());

        var tr3 = new Matrix();
        tr3.m._31 = origin.x;
        tr3.m._32 = origin.y;
        rotMat.mul(tr3);
// console.log(tr3.flat());
    }
    else
    {
        rotMat.m._11 = cosR;
        rotMat.m._12 = sinR;
        rotMat.m._21 = -sinR;
        rotMat.m._22 = cosR;
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
