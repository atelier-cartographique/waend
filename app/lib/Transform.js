import glMatrix from '../vendors/gl-matrix';

const mat3 = glMatrix.mat3;
const vec2 = glMatrix.vec2;

class Matrix {
    constructor(a, b, c, d, e, f) {
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

    //////////////////// IMPL ///////////////////////


    clone() {
        const mx = new Matrix();
        mx.m = mat3.clone(this.m);
        return mx;
    }

    parseFlat(a, b, c, d, e, f) {
        this.m = mat3.create();
        mat3.copy(this.m,
        [
            a, b, 0,
            c, d, 0,
            e, f, 1
        ]
        );
    }

    flat() {
        const fm = new Array(6);
        fm[0] = this.m[0];
        fm[1] = this.m[1];
        fm[2] = this.m[3];
        fm[3] = this.m[4];
        fm[4] = this.m[6];
        fm[5] = this.m[7];
        return fm;
    }

    /**
    * Multiplies matrix with given matrix and returns resulting matrix
    *
    * @param o {Matrix}
    * @returns {Matrix}
    */
    mul(o) {
        mat3.multiply(this.m, this.m, o.m);
        return this;
    }

    inverse() {
        const inverse = new Matrix();
        mat3.invert(inverse.m, this.m);
        return inverse;
    }
}

/**
* Transformation
*/
class Transform {
    constructor() {
        if (arguments.length > 0) {
            if (arguments[0] instanceof Transform) {
                this.m = arguments[0].m.clone();
            }
            else {
                const mx = new Matrix();
                Matrix.apply(mx, arguments);
                this.m = mx;
            }
        }
        else {
            this.m = new Matrix();
        }
    }

    // get you an [a b c d e f] matrix
    flatMatrix() {
        return this.m.flat();
    }

    toString() {

        function decimalAdjust(type, value, exp) {
        // If the exp is undefined or zero...
            if (typeof exp === 'undefined' || +exp === 0) {
                return Math[type](value);
            }
            value = +value;
            exp = +exp;
            // If the value is not a number or the exp is not an integer...
            if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
                return NaN;
            }
            // Shift
            value = value.toString().split('e');
            value = Math[type](+(`${value[0]}e${value[1] ? (+value[1] - exp) : -exp}`));
            // Shift back
            value = value.toString().split('e');
            return +(`${value[0]}e${value[1] ? (+value[1] + exp) : exp}`);
        }

        function adjust (type, a, exp) {
            for (let i = 0; i < a.length; i++) {
                a[i] = decimalAdjust(type, a[i], exp);
            }
            return a;
        }

        const f = adjust('round', this.m.flat(), -5);
        const s = `<Matrix: (${f.join(', ')})>`;
        return s;
    }

    reset(t) {
        this.m = t.m.clone();
        return this;
    }

    clone() {
        const t = new Transform();
        return this.reset.apply(t, [this]);
    }

    inverse() {
        const inverse_m = this.m.inverse();
        const inverse = new Transform();
        inverse.m = inverse_m;
        return inverse;
    }

    multiply(t) {
        if(t instanceof Matrix){
            this.m.mul(t);
        }
        else{
            this.m.mul(t.m);
        }
        return this;
    }

    translate(tx, ty) {
        mat3.translate(this.m.m, this.m.m, [tx, ty]);
        return this;
    }

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
    scale(sx, sy, origin) {
        const scaleMat = new Matrix();

        if (undefined !== origin) {
            mat3.translate(scaleMat.m, scaleMat.m, [origin[0], origin[1]]);
            mat3.scale(scaleMat.m, scaleMat.m, [sx, sy]);
            mat3.translate(scaleMat.m, scaleMat.m, [-origin[0] , -origin[1]]);
        }
        else
        {
            mat3.scale(scaleMat.m, scaleMat.m, [sx, sy]);
        }
        this.m.mul(scaleMat);
        return this;
    }

    rotate(r, origin) {
        const rGrad = r * Math.PI / 180.0;
        const rotMat = new Matrix();

        if (undefined !== origin) {
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
    }

    getScale() {
        return [this.m.m[0], this.m.m[4]];
    }

    getTranslate() {
        return [this.m.m[6], this.m.m[7]];
    }

    /**
     * an array [x,y]
     */
    mapVec2(v) {
        return vec2.transformMat3(v, v, this.m.m);
    }

    mapVec2Fn(name) {
        const m = this.m.clone();

        const f = v => vec2.transformMat3(v, v, m.m);

        if (name) {
            try {
                Object.defineProperty(f, 'name', {value:name});
            }
            catch (e) {}
        }
        return f;
    }

    /**
     * an array of vec2s [[x,y], [x,y], ...]
     */
    mapCoordinates(coordinates) {
        for (let i = coordinates.length - 1; i >= 0; i--) {
            this.mapVec2(coordinates[i]);
        }
        return coordinates;
    }

    mapPoint(p) {
        const v = this.mapVec2([p.x, p.y]);
        p.x = v[0];
        p.y = v[1];
        return p;
    }
}

export default  Transform;
