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

#ifndef PY_PLANAR_H
#define PY_PLANAR_H

/* Python 2/3 compatibility */
#if PY_MAJOR_VERSION < 3
#define PyUnicode_InternFromString(o) PyString_InternFromString(o)
#endif

#ifndef Py_TPFLAGS_CHECKTYPES /* not in Py 3 */
#define Py_TPFLAGS_CHECKTYPES 0
#endif

#if PY_MAJOR_VERSION >= 3
#define RETURN_NOT_IMPLEMENTED {  \
    Py_INCREF(Py_NotImplemented); \
    return Py_NotImplemented;     \
}
#else
#define RETURN_NOT_IMPLEMENTED {                   \
    PyErr_Format(PyExc_TypeError,                  \
        "Unorderable types: %.200s and %.200s",    \
        Py_TYPE(a)->tp_name, Py_TYPE(b)->tp_name); \
    return NULL;                                   \
}
#endif

#define CONVERSION_ERROR() {                              \
    PyErr_Format(PyExc_TypeError,                         \
        "Can't compare %.200s to %.200s",                 \
        Py_TYPE(self)->tp_name, Py_TYPE(other)->tp_name); \
    return NULL;                                          \
}

/* Math utils */
#ifndef M_PI
#define M_PI 3.14159265358979323846264338327
#endif
#define radians(d) ((d) * M_PI / 180.0)
#define degrees(d) ((d) * 180.0 / M_PI)
#define almost_eq(a, b) (fabs((a) - (b)) < PLANAR_EPSILON)
#define MIN(a, b) ((a) <= (b) ? (a) : (b))
#define MAX(a, b) ((a) >= (b) ? (a) : (b))

static void 
cos_sin_deg(double deg, double *cosout, double *sinout) 
{
	double rad;
	deg = deg >= 360.0 ? fmod(deg, 360.0) : 
		deg < 0.0 ? deg + trunc(deg * (1.0 / -360.0) + 1) * 360.0 : deg;
	
	/* Match quadrants exactly */
	if (deg == 0.0) {
		*cosout = 1.0;
		*sinout = 0.0;
	} else if (deg == 90.0) {
		*cosout = 0.0;
		*sinout = 1.0;
	} else if (deg == 180.0) {
		*cosout = -1.0;
		*sinout = 0.0;
	} else if (deg == 270.0) {
		*cosout = 0.0;
		*sinout = -1.0;
	} else {
		rad = radians(deg);
		*cosout = cos(rad);
		*sinout = sin(rad);
	}
}

#define VEC_EQ(a, b) (((a)->x == (b)->x) & ((a)->y == (b)->y))
#define VEC_NEQ(a, b) (((a)->x != (b)->x) | ((a)->y != (b)->y))
#define VEC_LT(a, b) (((a)->x < (b)->x) | (((a)->x == (b)->x) \
	& ((a)->y < (b)->y)))

/* Given the line a->b, return negative if c is to the left of the line,
   positive if c is to the right, and 0 if c is colinear.
*/
#define SIDE(a, b, c) (((b)->x - (a)->x)*((c)->y - (a)->y) \
	- ((c)->x - (a)->x)*((b)->y - (a)->y))

/***************************************************************************/

/* Type definitions */

typedef struct {
    double x;
    double y;
} planar_vec2_t;

typedef struct {
    PyObject_HEAD
    union {
        PyObject *next_free;
        struct {double x; double y;};
    };
} PlanarVec2Object;

typedef struct {
    PyObject_VAR_HEAD
    planar_vec2_t *vec;
    /* *vec points to the data[] array, so that it can
       be positioned differently in memory in subtypes */
	union {
		planar_vec2_t data[1]; /* Used for fixed-length types */
		Py_ssize_t allocated; /* Used for variable-length types */
	};
} PlanarSeq2Object;

typedef struct {
    PyObject_HEAD
    union {
        PyObject *next_free;
        double m[6];
        struct {double a, b, c, d, e, f;};
    };
} PlanarAffineObject;

typedef struct {
    PyObject_HEAD
    union {
        PyObject *next_free;
        struct {planar_vec2_t min, max;};
    };
} PlanarBBoxObject;

typedef struct {
	PyObject_VAR_HEAD
    planar_vec2_t *vert;
	unsigned long flags;
	PlanarBBoxObject *bbox;
	planar_vec2_t centroid;
	double max_r2;
	double min_r2;
	planar_vec2_t *lt_y_poly, *rt_y_poly;
	planar_vec2_t data[1];
} PlanarPolygonObject;

#define POLY_CONVEX_KNOWN_FLAG 0x1
#define POLY_CONVEX_FLAG 0x2
#define POLY_SIMPLE_KNOWN_FLAG 0x4
#define POLY_SIMPLE_FLAG 0x8
#define POLY_DEGEN_KNOWN_FLAG 0x10
#define POLY_DEGEN_FLAG 0x20
#define POLY_DUP_VERTS_KNOWN_FLAG 0x40
#define POLY_DUP_VERTS_FLAG 0x80
#define POLY_CENTROID_KNOWN_FLAG 0x100
#define POLY_RADIUS_KNOWN_FLAG 0x200

typedef struct {
    PyObject_HEAD
	planar_vec2_t normal;
	planar_vec2_t anchor;
	planar_vec2_t end;
	union {
		double offset;
		double length;
	};
} PlanarLineObject;

/* Geometry utils */

/* Return 1 if the line segment a->b intersects with line segment c->d */
static int
segments_intersect(const planar_vec2_t *a, const planar_vec2_t *b, 
	const planar_vec2_t *c, const planar_vec2_t *d)
{
	const double dir1 = (b->x - a->x)*(c->y - a->y)-(c->x - a->x)*(b->y - a->y);
	const double dir2 = (b->x - a->x)*(d->y - a->y)-(d->x - a->x)*(b->y - a->y);
	const double dir3 = (d->x - c->x)*(a->y - c->y)-(a->x - c->x)*(d->y - c->y);
	const double dir4 = (d->x - c->x)*(b->y - c->y)-(b->x - c->x)*(d->y - c->y);
	return ((((dir1 > 0.0) != (dir2 > 0.0)) | ((dir1 == 0.0) != (dir2 == 0.0)))
		& (((dir3 > 0.0) != (dir4 > 0.0)) | ((dir3 == 0.0) != (dir4 == 0.0))));
}

/* Comparison function for lexicographical sorting of vectors */
static int
compare_vec_lexi(const void *a, const void *b)
{
	const planar_vec2_t *va = *(planar_vec2_t **)a;
	const planar_vec2_t *vb = *(planar_vec2_t **)b;
	const int result = (va->x > vb->x) - (va->x < vb->x);
	return result ? result : (va->y > vb->y) - (va->y < vb->y);
}

/***************************************************************************/

/* Convert the object to a float, this is designed to
   be faster and more strict than PyNumber_Float
   (it does not allow strings), but will convert
   any type that supports float conversion.

   If the argument provided is NULL, NULL is returned
   and no exception is set. If an error occurs, NULL
   is returned with an exception set. In the former
   case it is assumed that an exception has already
   been set.

   Returns: New reference
*/
static PyObject *
PyObject_ToFloat(PyObject *o) 
{
    PyNumberMethods *m;

    if (o == NULL) {
        return NULL;
    }
    if (PyFloat_Check(o)) {
        Py_INCREF(o);
        return o;
    }
	m = o->ob_type->tp_as_number;
	if (m && m->nb_float) {
        o = m->nb_float(o);
        if (o && !PyFloat_Check(o)) {
            PyErr_Format(PyExc_TypeError,
                "__float__ returned non-float (type %.200s)",
                o->ob_type->tp_name);
			Py_DECREF(o);
			return NULL;
		}
        return o;
    }
    PyErr_Format(PyExc_TypeError,
        "Can't convert %.200s to float", o->ob_type->tp_name);
    return NULL;
}

static long
hash_double(double v)
{
	/* Derived from Python 3.1.2 _Py_HashDouble() */
	long hipart;
	int expo;

	v = frexp(v, &expo);
	v *= 2147483648.0;	/* 2**31 */
	hipart = (long)v;	/* take the top 32 bits */
	v = (v - (double)hipart) * 2147483648.0; /* get the next 32 bits */
	return hipart + (long)v + (expo << 15);
}

#define Py_BOOL(i) (i) ? (Py_INCREF(Py_True), Py_True) \
                       : (Py_INCREF(Py_False), Py_False)

/* Call the method "from_points(points)" on the Python object
   specified. This is the generic API for instantiating 
   a planar object from a sequence of points 
*/
static PyObject *
call_from_points(PyObject *obj, PyObject *points) 
{
	static PyObject *from_points_str = NULL;

	if (from_points_str == NULL) {
		from_points_str = PyUnicode_InternFromString("from_points");
		if (from_points_str == NULL) {
			return NULL;
		}
	}
	return PyObject_CallMethodObjArgs(obj, from_points_str, points, NULL);
}

/***************************************************************************/

extern double PLANAR_EPSILON;
extern double PLANAR_EPSILON2;

extern PyTypeObject PlanarVec2Type;
extern PyTypeObject PlanarSeq2Type;
extern PyTypeObject PlanarVec2ArrayType;
extern PyTypeObject PlanarAffineType;
extern PyTypeObject PlanarLineType;
extern PyTypeObject PlanarRayType;
extern PyTypeObject PlanarSegmentType;
extern PyTypeObject PlanarBBoxType;
extern PyTypeObject PlanarPolygonType;

extern PyObject *PlanarTransformNotInvertibleError;

/* Vec2 utils */

#define PlanarVec2_Check(op) PyObject_TypeCheck(op, &PlanarVec2Type)
#define PlanarVec2_CheckExact(op) (Py_TYPE(op) == &PlanarVec2Type)

static PlanarVec2Object *
PlanarVec2_FromDoubles(double x, double y)
{
    PlanarVec2Object *v;

    v = (PlanarVec2Object *)PlanarVec2Type.tp_alloc(&PlanarVec2Type, 0);
    if (v == NULL) {
        return NULL;
    }
    v->x = x;
    v->y = y;
    return v;
}

static PlanarVec2Object *
PlanarVec2_FromStruct(planar_vec2_t *vs)
{
    PlanarVec2Object *v;

    v = (PlanarVec2Object *)PlanarVec2Type.tp_alloc(&PlanarVec2Type, 0);
    if (v == NULL) {
        return NULL;
    }
    v->x = vs->x;
    v->y = vs->y;
    return v;
}

static int 
PlanarVec2_Parse(PyObject *o, double *x, double *y)
{
    PyObject *x_obj = NULL;
    PyObject *y_obj = NULL;
    PyObject *item;
	static char *type_err_msg = "Expected sequence of 2 numbers";

    if (PlanarVec2_Check(o)) {
        *x = ((PlanarVec2Object *)o)->x;
        *y = ((PlanarVec2Object *)o)->y;
        return 1;
    } else if (PyTuple_Check(o)) {
        /* Use fast tuple access code */
        if (PyTuple_GET_SIZE(o) != 2) {
            PyErr_SetString(PyExc_TypeError, type_err_msg);
            return 0;
        }
        x_obj = PyObject_ToFloat(PyTuple_GET_ITEM(o, 0));
        y_obj = PyObject_ToFloat(PyTuple_GET_ITEM(o, 1));
    } else if (PySequence_Check(o)) {
        /* Fall back to general sequence access */
        PyErr_SetString(PyExc_TypeError, type_err_msg);
        if (PySequence_Size(o) != 2) {
            return 0;
        }
        if ((item = PySequence_GetItem(o, 0))) {
            x_obj = PyObject_ToFloat(item);
            Py_DECREF(item);
        }
        if ((item = PySequence_GetItem(o, 1))) {
            y_obj = PyObject_ToFloat(item);
            Py_DECREF(item);
        }
	}
    if (x_obj == NULL || y_obj == NULL) {
        goto error;
    }
    *x = PyFloat_AS_DOUBLE(x_obj);
    *y = PyFloat_AS_DOUBLE(y_obj);
    Py_DECREF(x_obj);
    Py_DECREF(y_obj);
    PyErr_Clear();
    return 1;
error:
    Py_XDECREF(x_obj);
    Py_XDECREF(y_obj);
    return 0;
}


static PyObject *
Seq2__repr__(PlanarSeq2Object *self, char *class_name, char *extra)
{
	PyObject *repr = NULL;
	PyObject *parts = NULL;
	PyObject *s = NULL;
	PyObject *ex = NULL;
	PyObject *joined = NULL;
	PyObject *sep_str = NULL;
	PyObject *join_str = NULL;
	PyObject *format_str = NULL;
	PyObject *format_args = NULL;
	Py_ssize_t i;
	char buf[256];

	parts = PyList_New(Py_SIZE(self));
	if (parts == NULL) {
		goto done;
	}
	for (i = 0; i < Py_SIZE(self); ++i) {
		PyOS_snprintf(buf, 255, "(%lg, %lg)",
			self->vec[i].x, self->vec[i].y);
		s = PyUnicode_FromString(buf);
		if (s == NULL) {
			goto done;
		}
		PyList_SET_ITEM(parts, i, s);
	}
	s = NULL;
	sep_str = PyUnicode_FromString(", ");
	join_str = PyUnicode_FromString("join");
	if (sep_str == NULL || join_str == NULL) {
		goto done;
	}
	joined = PyObject_CallMethodObjArgs(sep_str, join_str, parts, NULL);
	s = PyUnicode_FromString(class_name);
	if (extra != NULL) {
		ex = PyUnicode_FromString(extra);
	} else {
		ex = PyUnicode_FromString("");
	}
	if (joined == NULL || s == NULL || ex == NULL) {
		goto done;
	}
	format_str = PyUnicode_FromString("%s([%s]%s)");
	format_args = PyTuple_Pack(3, s, joined, ex);
	if (format_str == NULL || format_args == NULL) {
		goto done;
	}
	repr = PyUnicode_Format(format_str, format_args);

done:
	Py_XDECREF(parts);
	Py_XDECREF(s);
	Py_XDECREF(joined);
	Py_XDECREF(ex);
	Py_XDECREF(sep_str);
	Py_XDECREF(join_str);
	Py_XDECREF(format_str);
	Py_XDECREF(format_args);
	return repr;
}

/* Seq2 utils */

#define PlanarSeq2_Check(op) PyObject_TypeCheck(op, &PlanarSeq2Type)
#define PlanarSeq2_CheckExact(op) (Py_TYPE(op) == &PlanarSeq2Type)

static PlanarSeq2Object *
Seq2_New(PyTypeObject *type, Py_ssize_t size)
{
    PlanarSeq2Object *varray = 
		(PlanarSeq2Object *)type->tp_alloc(type, size);
    if (varray == NULL) {
		return NULL;
    }
	Py_SIZE(varray) = size;
	if (type->tp_itemsize == 0) {
		/* We assume this means that the items are
		   externally allocated */
		varray->vec = PyMem_Malloc(size * sizeof(planar_vec2_t));
		if (varray->vec == NULL) {
			Py_DECREF(varray);
			return (PlanarSeq2Object *)PyErr_NoMemory();
		}
		varray->allocated = size;
    } else {
		/* Items allocated inline */
		varray->vec = varray->data;
    }
    return varray;
}

/* Vec2Array utils */

#define PlanarVec2Array_Check(op) PyObject_TypeCheck(op, &PlanarVec2ArrayType)
#define PlanarVec2Array_CheckExact(op) (Py_TYPE(op) == &PlanarVec2ArrayType)

/* Affine utils */

#define PlanarAffine_Check(op) PyObject_TypeCheck(op, &PlanarAffineType)
#define PlanarAffine_CheckExact(op) (Py_TYPE(op) == &PlanarAffineType)

static PlanarAffineObject *
PlanarAffine_FromDoubles(
	double a, double b, double c, double d, double e, double f) 
{
	PlanarAffineObject *t;

	t = (PlanarAffineObject *)PlanarAffineType.tp_alloc(
		&PlanarAffineType, 0);
	if (t != NULL) {
		t->a = a;
		t->b = b;
		t->c = c;
		t->d = d;
		t->e = e;
		t->f = f;
	}
	return t;
}

/* BoundingBox utils */

#define PlanarBBox_Check(op) PyObject_TypeCheck(op, &PlanarBBoxType)
#define PlanarBBox_CheckExact(op) (Py_TYPE(op) == &PlanarBBoxType)

static PlanarBBoxObject *
PlanarBBox_fromSeq2(PlanarSeq2Object *seq)
{
	PlanarBBoxObject *b;
	planar_vec2_t *vec;
	Py_ssize_t i;

	b = (PlanarBBoxObject *)PlanarBBoxType.tp_alloc(
		&PlanarBBoxType, 0);
	if (b != NULL) {
		b->min.x = b->min.y = FLT_MAX;
		b->max.x = b->max.y = -FLT_MAX;
		for (i = 0, vec = seq->vec; i < Py_SIZE(seq); ++i, ++vec) {
			if (vec->x < b->min.x) {
				b->min.x = vec->x;
			} 
			if (vec->x > b->max.x) {
				b->max.x = vec->x;
			}
			if (vec->y < b->min.y) {
				b->min.y = vec->y;
			} 
			if (vec->y > b->max.y) {
				b->max.y = vec->y;
			}
		}
	}
	return b;
}

#define PlanarBBox_contains_point(b, p) \
	(((p)->x >= (b)->min.x) & ((p)->x < (b)->max.x) \
     & ((p)->y > (b)->min.y) && ((p)->y <= (b)->max.y))

/* Polygon utils */

static PlanarPolygonObject *
Poly_new(PyTypeObject *type, Py_ssize_t size)
{
	PlanarPolygonObject *poly;

	if (size < 3) {
		PyErr_Format(PyExc_ValueError,
			"Polygon: minimum of 3 vertices required");
		return NULL;
	}
	/* Allocate space for extra verts to duplicate the first
	 * and last vert at either end to simplify many operations */
	poly = (PlanarPolygonObject *)type->tp_alloc(type, size + 2);
	if (poly != NULL) {
		Py_SIZE(poly) = size;
		poly->vert = poly->data + 1;
	}
	return poly;
}

#define PlanarPolygon_Check(op) PyObject_TypeCheck(op, &PlanarPolygonType)
#define PlanarPolygon_CheckExact(op) (Py_TYPE(op) == &PlanarPolygonType)

/* Line utils */

#define PlanarLine_Check(op) PyObject_TypeCheck(op, &PlanarLineType)
#define PlanarLine_CheckExact(op) (Py_TYPE(op) == &PlanarLineType)
#define PlanarRay_Check(op) PyObject_TypeCheck(op, &PlanarRayType)
#define PlanarRay_CheckExact(op) (Py_TYPE(op) == &PlanarRayType)
#define PlanarSegment_Check(op) PyObject_TypeCheck(op, &PlanarSegmentType)
#define PlanarSegment_CheckExact(op) (Py_TYPE(op) == &PlanarSegmentType)

#endif /* #ifdef PY_PLANAR_H */
