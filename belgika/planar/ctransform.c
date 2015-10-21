/***************************************************************************
* Copyright (c) 2010 by Casey Duncan
* All rights reserved.
*
* This software is subject to the provisions of the BSD License
* A copy of the license should accompany this distribution.
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
****************************************************************************/
#include "Python.h"
#include <float.h>
#include "planar.h"

#define AFFINE_FREE_MAX 200
static PyObject *affine_free_list = NULL;
static int affine_free_size = 0;

static int
Affine_init(PlanarAffineObject *self, PyObject *args)
{
    int i;
    PyObject *f;

    assert(PlanarAffine_Check(self));
    if (PyTuple_GET_SIZE(args) != 6) {
        PyErr_SetString(PyExc_TypeError, 
            "Affine: wrong number of arguments");
        return -1;
    }
    for (i = 0; i < 6; i++) {
        f = PyObject_ToFloat(PyTuple_GET_ITEM(args, i));
        if (f == NULL) {
            return -1;
        }
        self->m[i] = PyFloat_AS_DOUBLE(f);
        Py_DECREF(f);
    }

    return 0;
}

static PyObject *
Affine_alloc(PyTypeObject *type, Py_ssize_t nitems)
{
    int i;
    PlanarAffineObject *t;

    assert(PyType_IsSubtype(type, &PlanarAffineType));
    if (affine_free_list != NULL) {
        t = (PlanarAffineObject *)affine_free_list;
        Py_INCREF(t);
        affine_free_list = t->next_free;
        --affine_free_size;
		for (i = 0; i < 6; i++) {
			t->m[i] = 0.0;
		}
		return (PyObject *)t;
    } else {
        return PyType_GenericAlloc(type, nitems);
    }
}

static void
Affine_dealloc(PlanarAffineObject *self)
{
    if (PlanarAffine_CheckExact(self) && affine_free_size < AFFINE_FREE_MAX) {
        self->next_free = affine_free_list;
        affine_free_list = (PyObject *)self;
        ++affine_free_size;
    } else {
        Py_TYPE(self)->tp_free((PyObject *)self);
    }
}

static PyObject *
Affine_compare(PlanarAffineObject *a, PlanarAffineObject *b, int op)
{
    int result = 0;

    if (PlanarAffine_Check(a) && PlanarAffine_Check(b)) {
        switch (op) {
            case Py_EQ:
                result = a->m[0] == b->m[0]
                      && a->m[1] == b->m[1]
                      && a->m[2] == b->m[2]
                      && a->m[3] == b->m[3]
                      && a->m[4] == b->m[4]
                      && a->m[5] == b->m[5];
                break;
            case Py_NE:
                result = a->m[0] != b->m[0]
                      || a->m[1] != b->m[1]
                      || a->m[2] != b->m[2]
                      || a->m[3] != b->m[3]
                      || a->m[4] != b->m[4]
                      || a->m[5] != b->m[5];
                break;
            default:
                RETURN_NOT_IMPLEMENTED;
        }
    } else {
        switch (op) {
            case Py_EQ:
                result = 0;
                break;
            case Py_NE:
                result = 1;
                break;
            default:
                RETURN_NOT_IMPLEMENTED;
        }
    }

    if (result) {
        Py_INCREF(Py_True);
        return Py_True;
    } else {
        Py_INCREF(Py_False);
        return Py_False;
    }
}

static long
Affine_hash(PlanarAffineObject *self) 
{
    int i;
    long hash = 0x345678L;
    long mult = 1000003L;

    /* This algorithm is derived from the Py 3.1.2 tuple hash */
    for (i = 0; i < 6; i++) {
        hash = (hash ^ hash_double(self->m[i])) * mult;
        mult += (long)(82520L + (6 - i)*2);
    }
    hash += 97531L;
    return (hash != -1) ? hash : -2;
}    

/* Property descriptors */

static PyObject *
Affine_get_determinant(PlanarAffineObject *self) {
    return PyFloat_FromDouble(self->a*self->e - self->b*self->d);
}

static PyObject *
Affine_get_is_identity(PlanarAffineObject *self) 
{
    PyObject *r;

    if (almost_eq(self->a, 1.0) && almost_eq(self->b, 0.0) 
        && almost_eq(self->c, 0.0) && almost_eq(self->d, 0.0)
        && almost_eq(self->e, 1.0) && almost_eq(self->f, 0.0)) {
        r = Py_True;
    } else {
        r = Py_False;
    }
    Py_INCREF(r);
    return r;
}

static PyObject *
Affine_get_is_rectilinear(PlanarAffineObject *self) 
{
    PyObject *r;

    if ((almost_eq(self->a, 0.0) && almost_eq(self->e, 0.0))
        || (almost_eq(self->d, 0.0) && almost_eq(self->b, 0.0))) {
        r = Py_True;
    } else {
        r = Py_False;
    }
    Py_INCREF(r);
    return r;
}

static PyObject *
Affine_get_is_conformal(PlanarAffineObject *self) 
{
    PyObject *r;

    if (almost_eq(self->a * self->b + self->d * self->e, 0.0)) {
        r = Py_True;
    } else {
        r = Py_False;
    }
    Py_INCREF(r);
    return r;
}

static PyObject *
Affine_get_is_orthonormal(PlanarAffineObject *self) 
{
    PyObject *r;

    if (almost_eq(self->a * self->b + self->d * self->e, 0.0)
		&& almost_eq(self->a * self->a + self->d * self->d, 1.0)
		&& almost_eq(self->b * self->b + self->e * self->e, 1.0)
	) {
        r = Py_True;
    } else {
        r = Py_False;
    }
    Py_INCREF(r);
    return r;
}

static PyObject *
Affine_get_is_degenerate(PlanarAffineObject *self) 
{
    PyObject *r;

    if (almost_eq(self->a*self->e - self->b*self->d, 0.0)) {
        r = Py_True;
    } else {
        r = Py_False;
    }
    Py_INCREF(r);
    return r;
}

static PyObject *
Affine_get_column_vectors(PlanarAffineObject *self) 
{
    PyObject *r, *v1, *v2, *v3;

	r = PyTuple_New(3);
	v1 = (PyObject *)PlanarVec2_FromDoubles(self->a, self->d);
	v2 = (PyObject *)PlanarVec2_FromDoubles(self->b, self->e);
	v3 = (PyObject *)PlanarVec2_FromDoubles(self->c, self->f);
	if (r == NULL || v1 == NULL || v2 == NULL || v3 == NULL) {
		Py_XDECREF(r);
		Py_XDECREF(v1);
		Py_XDECREF(v2);
		Py_XDECREF(v3);
		return NULL;
	}
	PyTuple_SET_ITEM(r, 0, v1);
	PyTuple_SET_ITEM(r, 1, v2);
	PyTuple_SET_ITEM(r, 2, v3);
    return r;
}

static PyGetSetDef Affine_getset[] = {
    {"determinant", (getter)Affine_get_determinant, NULL, 
        "The determinant of the transform matrix. This value "
        "is equal to the area scaling factor when the transform "
        "is applied to a shape.", NULL},
    {"is_identity", (getter)Affine_get_is_identity, NULL, 
        "True if this transform equals the identity matrix, "
        "within rounding limits.", NULL},
    {"is_rectilinear", (getter)Affine_get_is_rectilinear, NULL, 
        "True if the transform is rectilinear, i.e., whether "
        "a shape would remain axis-aligned, within rounding "
        "limits, after applying the transform. ", NULL},
    {"is_conformal", (getter)Affine_get_is_conformal, NULL, 
        "True if the transform is conformal, i.e., if angles between points "
        "are preserved after applying the transform, within rounding "
        "limits. This implies that the transform has no effective shear.",
        NULL},
    {"is_orthonormal", (getter)Affine_get_is_orthonormal, NULL, 
        "True if the transform is orthonormal, which means that the"
        "transform represents a rigid motion, which has no effective scaling or"
        "shear. Mathematically, this means that the axis vectors of the"
        "transform matrix are perpendicular and unit-length.  Applying an"
        "orthonormal transform to a shape always results in a congruent shape.",
        NULL},
    {"is_degenerate", (getter)Affine_get_is_degenerate, NULL, 
        "True if this transform is degenerate, which means that it "
        "will collapse a shape to an effective area of zero. "
        "Degenerate transforms cannot be inverted.", NULL},
    {"column_vectors", (getter)Affine_get_column_vectors, NULL, 
		"The values of the transform as three 2D column vectors", NULL},
    {NULL}
};

/* Methods */

static PlanarAffineObject *
Affine_new_identity(PyTypeObject *type)
{
    PlanarAffineObject *t;

    assert(PyType_IsSubtype(type, &PlanarAffineType));
    t = (PlanarAffineObject *)type->tp_alloc(type, 0);
    if (t == NULL) {
        return NULL;
    }
    t->a = t->e = 1.0;
    return t;
}

static PlanarAffineObject *
Affine_new_translation(PyTypeObject *type, PyObject *offset)
{
    PlanarAffineObject *t;
    double ox, oy;

    assert(PyType_IsSubtype(type, &PlanarAffineType));
    if (!PlanarVec2_Parse(offset, &ox, &oy)) {
        return NULL;
    }
    t = (PlanarAffineObject *)type->tp_alloc(type, 0);
    if (t == NULL) {
        return NULL;
    }
    t->a = t->e = 1.0;
    t->c = ox;
    t->f = oy;
    return t;
}

static PlanarAffineObject *
Affine_new_scale(PyTypeObject *type, PyObject *scaling)
{
    PlanarAffineObject *t;
    double sx, sy;

    if (!PlanarVec2_Parse(scaling, &sx, &sy)) {
        /* scalar arg */
        scaling = PyNumber_Float(scaling);
        if (scaling == NULL) {
            return NULL;
        }
        sx = sy = PyFloat_AS_DOUBLE(scaling);
        Py_DECREF(scaling);
    }
    t = (PlanarAffineObject *)type->tp_alloc(type, 0);
    if (t == NULL) {
        return NULL;
    }
    t->a = sx;
    t->e = sy;
    return t;
}

static PlanarAffineObject *
Affine_new_shear(PyTypeObject *type, PyObject *args, PyObject *kwargs)
{
    PlanarAffineObject *t;
    double sx, sy, ax = 0.0, ay = 0.0;

    static char *kwlist[] = {"x_angle", "y_angle", NULL};

    if (!PyArg_ParseTupleAndKeywords(
        args, kwargs, "|dd:Affine.shear", kwlist, &ax, &ay)) {
        return NULL;
    }
    t = (PlanarAffineObject *)type->tp_alloc(type, 0);
    if (t == NULL) {
        return NULL;
    }
	sx = ax ? tan(radians(ax)) : 0.0;
	sy = ay ? tan(radians(ay)) : 0.0;
    t->a = t->e = 1.0;
    t->b = sy;
    t->d = sx;
	return t;
}

static PlanarAffineObject *
Affine_new_rotation(PyTypeObject *type, PyObject *args, PyObject *kwargs)
{
    PyObject *pivot_arg = NULL;
    PlanarAffineObject *t;
    double angle, sa, ca, px, py;

    static char *kwlist[] = {"angle", "pivot", NULL};

    if (!PyArg_ParseTupleAndKeywords(
        args, kwargs, "d|O:Affine.shear", kwlist, 
        &angle, &pivot_arg)) {
        return NULL;
    }
    t = (PlanarAffineObject *)type->tp_alloc(type, 0);
    if (t == NULL) {
        return NULL;
    }
	cos_sin_deg(angle, &ca, &sa);
    t->a = ca;
    t->b = sa;
    t->d = -sa;
    t->e = ca;

    if (pivot_arg != NULL) {
        if (!PlanarVec2_Parse(pivot_arg, &px, &py)) {
			PyErr_SetString(PyExc_TypeError,
				"Expected sequence of two numbers for pivot argument"); 
            Py_DECREF(t);
            return NULL;
        }
        t->c = px - ca*px + sa*py;
        t->f = py - ca*py - sa*px;
    }
    return t;
}

static PyObject *
Affine_repr(PlanarAffineObject *self)
{
    char buf[255];
    buf[0] = 0; /* paranoid */
    PyOS_snprintf(buf, 255, 
        "Affine(%lg, %lg, %lg,\n"
        "       %lg, %lg, %lg)", 
        self->m[0], self->m[1], self->m[2],
		self->m[3], self->m[4], self->m[5]);
    return PyUnicode_FromString(buf);
}

static PyObject *
Affine_str(PlanarAffineObject *self)
{
    char buf[255];
    buf[0] = 0; /* paranoid */
    PyOS_snprintf(buf, 255, 
        "|% .2f,% .2f,% .2f|\n"
        "|% .2f,% .2f,% .2f|\n"
        "| 0.00, 0.00, 1.00|",
        self->m[0], self->m[1], self->m[2],
		self->m[3], self->m[4], self->m[5]);
    return PyUnicode_FromString(buf);
}

static PyObject *
Affine_almost_equals(PlanarAffineObject *self, PlanarAffineObject *other)
{
    PyObject *r;

    assert(PlanarAffine_Check(self));
    if (PlanarAffine_Check(other)) {
        if (almost_eq(self->a, other->a) 
         && almost_eq(self->b, other->b)
         && almost_eq(self->c, other->c)
         && almost_eq(self->d, other->d)
         && almost_eq(self->e, other->e)
         && almost_eq(self->f, other->f)) {
            r = Py_True;
        } else {
            r = Py_False;
        }
        Py_INCREF(r);
        return r;
    } else {
        CONVERSION_ERROR();
    }
}

static PyObject *
Affine_itransform(PlanarAffineObject *self, PyObject *seq)
{
    Py_ssize_t i;
    Py_ssize_t len;
    PyObject *point;
    PlanarSeq2Object *varray;
    double x, y, a, b, c, d, e, f;

    a = self->a;
    b = self->b;
    c = self->c;
    d = self->d;
    e = self->e;
    f = self->f;
    assert(PlanarAffine_Check(self));
    if (PlanarSeq2_Check(seq)) {
	/* Optimized code path for Seq2s */
	varray = (PlanarSeq2Object *)seq;
	for (i = 0; i < Py_SIZE(seq); i++) {
	    x = varray->vec[i].x;
	    y = varray->vec[i].y;
	    varray->vec[i].x = x*a + y*d + c;
	    varray->vec[i].y = x*b + y*e + f;
	}
    } else {
		/* General vector sequence */
		len = PySequence_Length(seq);
		if (len == -1) {
			PyErr_SetString(PyExc_TypeError, 
			"Affine.itransform(): Cannot transform non-sequence");
			return NULL;
		}
		for (i = 0; i < len; i++) {
			point = PySequence_GetItem(seq, i);
			if (point == NULL) {
				return NULL;
			}
			if (!PlanarVec2_Parse(point, &x, &y)) {
				Py_DECREF(point);
				PyErr_Format(PyExc_TypeError, 
					"Affine.itransform(): "
					"Element at position %lu is not a valid vector", i);
				return NULL;
			}
			Py_DECREF(point);
			point = (PyObject *)PlanarVec2_FromDoubles(x*a + y*d + c, x*b + y*e + f);
			if (point == NULL) {
				return NULL;
			}
			if (PySequence_SetItem(seq, i, point) < 0) {
			Py_DECREF(point);
				return NULL;
			}
			Py_DECREF(point);
		}
    }
    Py_INCREF(Py_None);
    return Py_None;
}

static PyMethodDef Affine_methods[] = {
    {"identity", (PyCFunction)Affine_new_identity, 
        METH_CLASS | METH_NOARGS, 
        "Return the identity transform."},
    {"translation", (PyCFunction)Affine_new_translation, 
        METH_CLASS | METH_O, 
        "Create a translation transform from an offset vector."},
    {"scale", (PyCFunction)Affine_new_scale, 
        METH_CLASS | METH_O, 
        "Create a scaling transform from a scalar or vector, "
        "optionally about an anchor point."},
    {"shear", (PyCFunction)Affine_new_shear, 
        METH_CLASS | METH_VARARGS | METH_KEYWORDS, 
        "Create a shear transform from a vector, "
        "optionally about an anchor point."},
    {"rotation", (PyCFunction)Affine_new_rotation, 
        METH_CLASS | METH_VARARGS | METH_KEYWORDS, 
        "Create a rotation transform at the specified angle, "
        "optionally about the specified anchor point."},
    {"almost_equals", (PyCFunction)Affine_almost_equals, METH_O, 
        "Compare transforms for approximate equality."},
    {"itransform", (PyCFunction)Affine_itransform, METH_O, 
        "Transform a sequence of points or vectors in place."},
    {NULL, NULL}
};

/* Aritmetic operations */

static PyObject *
affine_mul_vec2(PlanarAffineObject *t, PlanarVec2Object *v)
{
    /* Affine * Vec2 = Vec2 */
    return (PyObject *)PlanarVec2_FromDoubles(
        v->x * t->a + v->y * t->d + t->c,
        v->x * t->b + v->y * t->e + t->f);
}

static PyObject *
Affine__mul__(PyObject *a, PyObject *b)
{
    PlanarAffineObject *ta, *tb, *tr;
    int a_is_affine, b_is_affine;

    a_is_affine = PlanarAffine_Check(a);
    b_is_affine = PlanarAffine_Check(b);

    if (a_is_affine && b_is_affine) {
        /* Affine * Affine = Affine */
        ta = (PlanarAffineObject *)a;
        tb = (PlanarAffineObject *)b;
        tr = (PlanarAffineObject *)PlanarAffineType.tp_alloc(Py_TYPE(a), 0);
        if (tr == NULL) {
            return NULL;
        }
        tr->a = ta->a * tb->a + ta->b * tb->d;
        tr->b = ta->a * tb->b + ta->b * tb->e;
        tr->c = ta->a * tb->c + ta->b * tb->f + ta->c;
        tr->d = ta->d * tb->a + ta->e * tb->d;
        tr->e = ta->d * tb->b + ta->e * tb->e;
        tr->f = ta->d * tb->c + ta->e * tb->f + ta->f;
        return (PyObject *)tr;
    } else if (a_is_affine && PlanarVec2_Check(b)) {
		return affine_mul_vec2(
			(PlanarAffineObject *)a, (PlanarVec2Object *)b);
    } else if (PlanarVec2_Check(a) && b_is_affine) {
		return affine_mul_vec2(
			(PlanarAffineObject *)b, (PlanarVec2Object *)a);
    } else {
        /* Operation not supported */
        Py_INCREF(Py_NotImplemented);
        return Py_NotImplemented;
    }

}

static PlanarAffineObject *
Affine__invert__(PlanarAffineObject *self)
{
    PlanarAffineObject *t;
    double idet, ra, rb, rd, re;

    assert(PlanarAffine_Check(self));
    idet = self->a*self->e - self->b*self->d;
    if (abs(idet) < PLANAR_EPSILON) {
        PyErr_SetString(PlanarTransformNotInvertibleError,
            "Cannot invert degenerate transform");
        return NULL;
    }
    idet = 1.0 / idet;
    t = (PlanarAffineObject *)PlanarAffineType.tp_alloc(Py_TYPE(self), 0);
    if (t == NULL) {
        return NULL;
    }
    ra = self->e * idet;
    rb = -self->b * idet;
    rd = -self->d * idet;
    re = self->a * idet;
    t->a = ra;
    t->b = rb;
    t->c = -self->c*ra - self->f*rb;
    t->d = rd;
    t->e = re;
    t->f = -self->c*rd - self->f*re;
    return t;
}

static PyNumberMethods Affine_as_number = {
    0,       /* binaryfunc nb_add */
    0,       /* binaryfunc nb_subtract */
    (binaryfunc)Affine__mul__,       /* binaryfunc nb_multiply */
#if PY_MAJOR_VERSION < 3
    0,       /* binaryfunc nb_div */
#endif
    0,       /* binaryfunc nb_remainder */
    0,       /* binaryfunc nb_divmod */
    0,       /* ternaryfunc nb_power */
    0,       /* unaryfunc nb_negative */
    0,       /* unaryfunc nb_positive */
    0,       /* unaryfunc nb_absolute */
    0,       /* inquiry nb_bool */
    (unaryfunc)Affine__invert__,       /* unaryfunc nb_invert */
    0,       /* binaryfunc nb_lshift */
    0,       /* binaryfunc nb_rshift */
    0,       /* binaryfunc nb_and */
    0,       /* binaryfunc nb_xor */
    0,       /* binaryfunc nb_or */
#if PY_MAJOR_VERSION < 3
    0,       /* coercion nb_coerce */
#endif
    0,       /* unaryfunc nb_int */
    0,       /* void *nb_reserved */
    0,       /* unaryfunc nb_float */
#if PY_MAJOR_VERSION < 3
    0,       /* binaryfunc nb_oct */
    0,       /* binaryfunc nb_hex */
#endif

    0,       /* binaryfunc nb_inplace_add */
    0,       /* binaryfunc nb_inplace_subtract */
    (binaryfunc)Affine__mul__,       /* binaryfunc nb_inplace_multiply */
#if PY_MAJOR_VERSION < 3
    0,       /* binaryfunc nb_inplace_divide */
#endif
    0,       /* binaryfunc nb_inplace_remainder */
    0,       /* ternaryfunc nb_inplace_power */
    0,       /* binaryfunc nb_inplace_lshift */
    0,       /* binaryfunc nb_inplace_rshift */
    0,       /* binaryfunc nb_inplace_and */
    0,       /* binaryfunc nb_inplace_xor */
    0,       /* binaryfunc nb_inplace_or */

    0,       /* binaryfunc nb_floor_divide */
    0,       /* binaryfunc nb_true_divide */
    0,       /* binaryfunc nb_inplace_floor_divide */
    0,       /* binaryfunc nb_inplace_true_divide */

    0,       /* unaryfunc nb_index */
};

/* Sequence protocol methods */

static Py_ssize_t
Affine_len(PyObject *self)
{
    return 9;
}

static PyObject *
Affine_getitem(PlanarAffineObject *self, Py_ssize_t i)
{
    double m;

    assert(PlanarAffine_Check(self));
    if (i < 6) {
        m = self->m[i];
    } else if (i < 8) {
        m = 0.0;
    } else if (i == 8) {
        m = 1.0;
    } else {
        return NULL;
    }
    return PyFloat_FromDouble(m);
}

static PyObject *
Affine_subscript(PlanarAffineObject *self, PyObject *item)
{
    Py_ssize_t i;
    PyObject *t, *s;

    assert(PlanarAffine_Check(self));
    if (PyIndex_Check(item)) {
        i = PyNumber_AsSsize_t(item, PyExc_IndexError);
        if (i == -1 && PyErr_Occurred()) {
            return NULL;
        }
        if (i < 0) {
            i += Affine_len((PyObject *)self);
        }
        return Affine_getitem(self, i);
    } else if (PySlice_Check(item)) {
        /* We cheat a bit here by constructing a tuple from ourself and 
           slicing that, which is convenient since slicing a transform
           results in a tuple. Not the most efficient, but I don't expect
           transform slicing to be a common, performance sensitive operation
         */
        t = PySequence_Tuple((PyObject *)self);
        if (t == NULL) {
            return NULL;
        }
        s = PyObject_GetItem(t, item);
        Py_DECREF(t);
        return s;
    }
	PyErr_Format(PyExc_TypeError,
		 "Affine indices must be integers, not %.200s",
		 Py_TYPE(item)->tp_name);
	return NULL;
}

static PySequenceMethods Affine_as_sequence = {
    (lenfunc)Affine_len,          /* sq_length */
    0,                            /*sq_concat*/
    0,                            /*sq_repeat*/
    (ssizeargfunc)Affine_getitem, /*sq_item*/
    0,                            /* sq_slice */
    0,                            /* sq_ass_item */
};

static PyMappingMethods Affine_as_mapping = {
    (lenfunc)Affine_len,           /* mp_length */
    (binaryfunc)Affine_subscript,  /* mp_subscript */
    0                              /* mp_ass_subscript */
};

PyDoc_STRVAR(Affine_doc, 
    "Two dimensional immutable affine transform."
);

PyTypeObject PlanarAffineType = {
    PyVarObject_HEAD_INIT(NULL, 0)
    "planar.Affine",       /* tp_name */
    sizeof(PlanarAffineObject), /* tp_basicsize */
    0,                    /* tp_itemsize */
    (destructor)Affine_dealloc, /* tp_dealloc */
    0,                    /* tp_print */
    0,                    /* tp_getattr */
    0,                    /* tp_setattr */
    0,                    /* reserved */
    (reprfunc)Affine_repr,  /* tp_repr */
    &Affine_as_number,      /* tp_as_number */
    &Affine_as_sequence,    /* tp_as_sequence */
    &Affine_as_mapping,     /* tp_as_mapping */
    (hashfunc)Affine_hash,  /* tp_hash */
    0,                    /* tp_call */
    (reprfunc)Affine_str,   /* tp_str */
    0, /* PyObject_GenericGetAttr, */                   /* tp_getattro */
    0,/* PyObject_GenericSetAttr, */                    /* tp_setattro */
    0,                    /* tp_as_buffer */
    Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_CHECKTYPES,   /* tp_flags */
    Affine_doc,          /* tp_doc */
    0,                    /* tp_traverse */
    0,                    /* tp_clear */
    (richcmpfunc)Affine_compare,         /* tp_richcompare */
    0,                    /* tp_weaklistoffset */
    0,                    /* tp_iter */
    0,                    /* tp_iternext */
    Affine_methods,                    /* tp_methods */
    0,                    /* tp_members */
    Affine_getset,                    /* tp_getset */
    0,                    /* tp_base */
    0,                    /* tp_dict */
    0,                    /* tp_descr_get */
    0,                    /* tp_descr_set */
    0,                    /* tp_dictoffset */
    (initproc)Affine_init,  /* tp_init */
    Affine_alloc,           /* tp_alloc */
    0,          /* tp_new */
    0,              /* tp_free */
};

