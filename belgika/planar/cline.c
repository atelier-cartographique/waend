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
#include <structmember.h>
#include <float.h>
#include <string.h>
#include "planar.h"

/* Property descriptors */

static PlanarVec2Object *
Line_get_direction(PlanarLineObject *self) {
    return PlanarVec2_FromDoubles(-self->normal.y, self->normal.x);
}

static int
Line_set_direction(PlanarLineObject *self, PyObject *value, void *closure)
{
    double dx, dy, L;

    if (value == NULL) {
        PyErr_SetString(PyExc_TypeError, "Cannot delete direction attribute");
        return -1;
    }
    if (!PlanarVec2_Parse(value, &dx, &dy)) {
        PyErr_SetString(PyExc_TypeError, "Expected Vec2 for direction");
        return -1;
    }
    L = sqrt(dx*dx + dy*dy);
    if (L < PLANAR_EPSILON) {
        PyErr_SetString(PyExc_ValueError, "Direction vector must not be null");
        return -1;
    }
    self->normal.x = dy / L;
    self->normal.y = -dx / L;
    return 0;
}

static PlanarVec2Object *
Line_get_normal(PlanarLineObject *self) {
    return PlanarVec2_FromStruct(&self->normal);
}

static int
Line_set_normal(PlanarLineObject *self, PyObject *value, void *closure)
{
    double nx, ny, L;

    if (value == NULL) {
        PyErr_SetString(PyExc_TypeError, "Cannot delete normal attribute");
        return -1;
    }
    if (!PlanarVec2_Parse(value, &nx, &ny)) {
        PyErr_SetString(PyExc_TypeError, "Expected Vec2 for normal");
        return -1;
    }
    L = sqrt(nx*nx + ny*ny);
    if (L < PLANAR_EPSILON) {
        PyErr_SetString(PyExc_ValueError, "Normal vector must not be null");
        return -1;
    }
    self->normal.x = nx / L;
    self->normal.y = ny / L;
    return 0;
}

static PlanarSeq2Object *
Line_get_points(PlanarLineObject *self) {
    PlanarSeq2Object *seq;
    double sx, sy;

    seq = Seq2_New(&PlanarSeq2Type, 2);
    if (seq != NULL) {
        seq->vec[0].x = sx = self->normal.x * self->offset;
        seq->vec[0].y = sy = self->normal.y * self->offset;
        seq->vec[1].x = sx + self->normal.y;
        seq->vec[1].y = sy + -self->normal.x;
    }
    return seq;
}

static int
Line_set_offset(PlanarLineObject *self, PyObject *value)
{
    value = PyObject_ToFloat(value);
    if (value == NULL) {
        return -1;
    }
    self->offset = PyFloat_AS_DOUBLE(value);
    Py_DECREF(value);
    return 0;
}

static PyMemberDef Line_members[] = {
    {"offset", T_DOUBLE, offsetof(PlanarLineObject, offset), 0,
        "Direction from the origin to the line."},
    {NULL}
};

static PyGetSetDef Line_getset[] = {
    {"direction", (getter)Line_get_direction, (setter)Line_set_direction, 
        "Direction of the line as a unit vector.", NULL},
    {"normal", (getter)Line_get_normal, (setter)Line_set_normal, 
        "Normal unit vector perpendicular to the line.", NULL},
    {"points", (getter)Line_get_points, NULL, 
        "Two distinct points along the line.", NULL},
    {NULL}
};

/* Methods */

static int
Line_init(PlanarLineObject *self, PyObject *args)
{
    assert(PlanarLine_Check(self) || PlanarRay_Check(self));
    if (PyTuple_GET_SIZE(args) != 2) {
        PyErr_SetString(PyExc_TypeError, "Line: wrong number of arguments");
        return -1;
    }
    if (!PlanarVec2_Parse(PyTuple_GET_ITEM(args, 0), 
        &self->anchor.x, &self->anchor.y)) {
        return -1;
    }
    if (Line_set_direction(self, PyTuple_GET_ITEM(args, 1), NULL) == -1) {
        return -1;
    }
    self->offset = self->anchor.x * self->normal.x 
        + self->anchor.y * self->normal.y;
    return 0;
}

static PyObject *
Line_repr(PlanarLineObject *self)
{
    char buf[255];

    buf[0] = 0; /* paranoid */
    PyOS_snprintf(buf, 255, "Line((%g, %g), (%g, %g))", 
        self->normal.x * self->offset, self->normal.y * self->offset, 
        -self->normal.y, self->normal.x);
    return PyUnicode_FromString(buf);
}

static PyObject *
Line_compare(PyObject *a, PyObject *b, int op)
{
    PlanarLineObject *line1, *line2;

	if (PlanarLine_Check(a) && PlanarLine_Check(b)) {
        line1 = (PlanarLineObject *)a;
        line2 = (PlanarLineObject *)b;
		switch (op) {
			case Py_EQ:
                return Py_BOOL(
                    line1->normal.x == line2->normal.x &&
                    line1->normal.y == line2->normal.y &&
                    line1->offset == line2->offset);
            case Py_NE:
                return Py_BOOL(
                    line1->normal.x != line2->normal.x ||
                    line1->normal.y != line2->normal.y ||
                    line1->offset != line2->offset);
			default:
				/* Only == and != are defined */
                RETURN_NOT_IMPLEMENTED;
		}
	} else {
		switch (op) {
			case Py_EQ:
				Py_RETURN_FALSE;
			case Py_NE:
				Py_RETURN_TRUE;
			default:
				/* Only == and != are defined */
				RETURN_NOT_IMPLEMENTED;
		}
	}
}

static PyObject *
Line_almost_equals(PlanarLineObject *self, PlanarLineObject *other)
{
    return Py_BOOL(
		PlanarLine_Check(self) && PlanarLine_Check(other) &&
        almost_eq(self->normal.x, other->normal.x) &&
        almost_eq(self->normal.y, other->normal.y) &&
        almost_eq(self->offset, other->offset));
}

static PlanarLineObject *
Line_new_from_points(PyTypeObject *type, PyObject *points) 
{
    PlanarLineObject *line;
    planar_vec2_t *vec;
    Py_ssize_t size;
    int i;
    double x, y, dx, dy, px, py, d;
    double L = 0.0;

    assert(PyType_IsSubtype(type, &PlanarLineType)
        || PyType_IsSubtype(type, &PlanarRayType));
    line = (PlanarLineObject *)type->tp_alloc(type, 0);
    if (line == NULL) {
        return NULL;
    }

    if (PlanarSeq2_Check(points)) {
        /* Optimized code path for Seq2 objects */
        if (Py_SIZE(points) < 2) {
            goto tooShort;
        }
        vec = ((PlanarSeq2Object *)points)->vec;
        x = vec[0].x;
        y = vec[0].y;
        for (i = 1; i < Py_SIZE(points); ++i) {
            dx = vec[i].x - x;
            dy = vec[i].y - y;
            L = dx*dx + dy*dy;
            if (L > PLANAR_EPSILON2) break;
        }
        if (L < PLANAR_EPSILON2) goto tooShort;
        while (++i < Py_SIZE(points)) {
            d = (vec[i].x - x) * dy + (vec[i].y - y) * -dx;
            if (!almost_eq(d, 0.0)) {
                goto notCollinear;
            }
        }
    } else {
        points = PySequence_Fast(points, "expected iterable of Vec2 objects");
        if (points == NULL) {
            return NULL;
        }
        size = PySequence_Fast_GET_SIZE(points);
        if (Py_SIZE(points) < 2) {
            Py_DECREF(points);
            goto tooShort;
        }
        if (!PlanarVec2_Parse(PySequence_Fast_GET_ITEM(points, 0), &x, &y)) {
            Py_DECREF(points);
            goto wrongType;
        }
        for (i = 1; i < size; ++i) {
            if (!PlanarVec2_Parse(
                PySequence_Fast_GET_ITEM(points, i), &dx, &dy)) {
                Py_DECREF(points);
                goto wrongType;
            }
            dx -= x;
            dy -= y;
            L = dx*dx + dy*dy;
            if (L > PLANAR_EPSILON2) break;
        }
        if (L < PLANAR_EPSILON2) {
            Py_DECREF(points);
            goto tooShort;
        }
        while (++i < size) {
            if (!PlanarVec2_Parse(
                PySequence_Fast_GET_ITEM(points, i), &px, &py)) {
                Py_DECREF(points);
                goto wrongType;
            }
            d = (px - x) * dy + (py - y) * -dx;
            if (!almost_eq(d, 0.0)) {
                Py_DECREF(points);
                goto notCollinear;
            }
        }
        Py_DECREF(points);
    }
    L = sqrt(L);
    line->anchor.x = x;
    line->anchor.y = y;
    line->normal.x = dy / L;
    line->normal.y = -dx / L;
    line->offset = line->normal.x * x + line->normal.y * y;
    return line;

wrongType:
    PyErr_SetString(PyExc_TypeError, "expected iterable of Vec2 objects");
    Py_DECREF(line);
    return NULL;
tooShort:
    PyErr_SetString(PyExc_ValueError,
        "Expected iterable of 2 or more distinct points");
    Py_DECREF(line);
    return NULL;
notCollinear:
    PyErr_SetString(PyExc_ValueError, "All points provided must be collinear");
    Py_DECREF(line);
    return NULL;
}

static PlanarLineObject *
Line_new_from_normal(PyTypeObject *type, PyObject *args)
{
    PlanarLineObject *line;

    assert(PyType_IsSubtype(type, &PlanarLineType));
    if (PyTuple_GET_SIZE(args) != 2) {
        PyErr_SetString(PyExc_TypeError, 
            "Line.from_normal: wrong number of arguments");
        return NULL;
    }
    line = (PlanarLineObject *)type->tp_alloc(type, 0);
    if (line != NULL) {
        if (Line_set_normal(line, PyTuple_GET_ITEM(args, 0), NULL) == -1) {
            return NULL;
        }
        if (Line_set_offset(line, PyTuple_GET_ITEM(args, 1)) == -1) {
            return NULL;
        }
    }
    return line;
}

static PyObject *
Line_distance_to(PlanarLineObject *self, PyObject *pt)
{
    double px, py;

    assert(PlanarLine_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    return PyFloat_FromDouble(
        self->normal.x * px + self->normal.y * py - self->offset);
}

static PyObject *
Line_point_left(PlanarLineObject *self, PyObject *pt)
{
    double px, py, d;

    assert(PlanarLine_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    d = self->normal.x * px + self->normal.y * py - self->offset;
    return Py_BOOL(d <= -PLANAR_EPSILON);
}

static PyObject *
Line_point_right(PlanarLineObject *self, PyObject *pt)
{
    double px, py, d;

    assert(PlanarLine_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    d = self->normal.x * px + self->normal.y * py - self->offset;
    return Py_BOOL(d >= PLANAR_EPSILON);
}

static PyObject *
Line_contains_point(PlanarLineObject *self, PyObject *pt)
{
    double px, py, d;

    assert(PlanarLine_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    d = self->normal.x * px + self->normal.y * py - self->offset;
    return Py_BOOL((d < PLANAR_EPSILON) & (d > -PLANAR_EPSILON));
}

static PlanarVec2Object *
Line_project(PlanarLineObject *self, PyObject *pt)
{
    double px, py, s;

    assert(PlanarLine_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    s = -self->normal.y * px + self->normal.x * py;
    return PlanarVec2_FromDoubles(
        -self->normal.y * s + self->normal.x * self->offset,
        self->normal.x * s + self->normal.y * self->offset);
}

static PlanarVec2Object *
Line_reflect(PlanarLineObject *self, PyObject *pt)
{
    double px, py, d;

    assert(PlanarLine_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    d = (self->normal.x * px + self->normal.y * py - self->offset) * 2.0;
    return PlanarVec2_FromDoubles(
        px - self->normal.x * d, py - self->normal.y * d);
}

static PlanarLineObject *
Line_parallel(PlanarLineObject *self, PyObject *pt)
{
    double px, py;
    PlanarLineObject *line;

    assert(PlanarLine_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    line = (PlanarLineObject *)PlanarLineType.tp_alloc(&PlanarLineType, 0);
    if (line != NULL) {
        line->normal.x = self->normal.x;
        line->normal.y = self->normal.y;
        line->offset = px * self->normal.x + py * self->normal.y;
    }
    return line;
}

static PlanarLineObject *
Line_perpendicular(PlanarLineObject *self, PyObject *pt)
{
    double px, py;
    PlanarLineObject *line;

    assert(PlanarLine_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    line = (PlanarLineObject *)PlanarLineType.tp_alloc(&PlanarLineType, 0);
    if (line != NULL) {
        line->normal.x = -self->normal.y;
        line->normal.y = self->normal.x;
        line->offset = px * line->normal.x + py * line->normal.y;
    }
    return line;
}

static PyMethodDef Line_methods[] = {
    {"from_points", (PyCFunction)Line_new_from_points, METH_CLASS | METH_O, 
        "Create a line from two or more collinear points."},
    {"from_normal", (PyCFunction)Line_new_from_normal, 
        METH_CLASS | METH_VARARGS, 
        "Create a line given a normal vector perpendicular to it, at the "
        "specified distance from the origin."},
    {"distance_to", (PyCFunction)Line_distance_to, METH_O,
        "Return the signed distance from the line to the specified point."},
    {"point_left", (PyCFunction)Line_point_left, METH_O,
        "Return True if the specified point is in the half plane "
        "to the left of the line."},
    {"point_right", (PyCFunction)Line_point_right, METH_O,
        "Return True if the specified point is in the half plane "
        "to the right of the line."},
    {"contains_point", (PyCFunction)Line_contains_point, METH_O,
        "Return True if the specified point is on the line."},
    {"project", (PyCFunction)Line_project, METH_O,
        "Compute the projection of a point onto the line. This "
        "is the closest point on the line to the specified point."},
    {"reflect", (PyCFunction)Line_reflect, METH_O,
        "Reflect a point across the line."},
    {"perpendicular", (PyCFunction)Line_perpendicular, METH_O,
        "Return a line perpendicular to this one that passes through the "
        "given point."},
    {"parallel", (PyCFunction)Line_parallel, METH_O,
        "Return a line parallel to this one that passes through the "
        "given point."},
    {"almost_equals", (PyCFunction)Line_almost_equals, METH_O,
        "Return True if this line is approximately equal to "
        "another line, within precision limits."},
    {NULL, NULL}
};

/* Arithmetic Operations */

static void
Line_transform(PlanarLineObject *src_line, 
    PlanarLineObject *dst_line, PlanarAffineObject *t)
{
    planar_vec2_t p1, p2, t1, t2;
    double ta, tb, tc, td, te, tf, dx, dy, L;
    ta = t->a;
    tb = t->b;
    tc = t->c;
    td = t->d;
    te = t->e;
    tf = t->f;

    p1.x = src_line->normal.x * src_line->offset;
    p1.y = src_line->normal.y * src_line->offset;
    p2.x = p1.x + src_line->normal.y;
    p2.y = p1.y + -src_line->normal.x;
    t1.x = p1.x*ta + p1.y*td + tc;
    t1.y = p1.x*tb + p1.y*te + tf;
    t2.x = p2.x*ta + p2.y*td + tc;
    t2.y = p2.x*tb + p2.y*te + tf;
    dx = t2.x - t1.x;
    dy = t2.y - t1.y;
    L = sqrt(dx*dx + dy*dy);
    if (L < PLANAR_EPSILON) {
        PyErr_SetString(PyExc_ValueError, 
            "Line direction vector must not be null");
    }
    dst_line->normal.x = -dy / L;
    dst_line->normal.y = dx / L;
    dst_line->offset = dst_line->normal.x * t1.x + dst_line->normal.y * t1.y;
}

static PyObject *
Line__imul__(PyObject *a, PyObject *b)
{
    PlanarLineObject *line;
    PlanarAffineObject *t;

    if (PlanarLine_Check(a) && PlanarAffine_Check(b)) {
		line = (PlanarLineObject *)a;
		t = (PlanarAffineObject *)b;
    } else if (PlanarLine_Check(b) && PlanarAffine_Check(a)) {
		line = (PlanarLineObject *)b;
		t = (PlanarAffineObject *)a;
    } else {
		/* We support only transform operations */
		RETURN_NOT_IMPLEMENTED;
    }

    Line_transform(line, line, t);
    Py_INCREF(line);
    return (PyObject *)line;
}

static PyObject *
Line__mul__(PyObject *a, PyObject *b)
{
    PlanarLineObject *src_line, *dst_line;
    PlanarAffineObject *t;

    if (PlanarLine_Check(a) && PlanarAffine_Check(b)) {
		src_line = (PlanarLineObject *)a;
		t = (PlanarAffineObject *)b;
    } else if (PlanarLine_Check(b) && PlanarAffine_Check(a)) {
		src_line = (PlanarLineObject *)b;
		t = (PlanarAffineObject *)a;
    } else {
		/* We support only transform operations */
		RETURN_NOT_IMPLEMENTED;
    }

    dst_line = (PlanarLineObject *)Py_TYPE(src_line)->tp_alloc(
        Py_TYPE(src_line), 0);
    if (dst_line != NULL) {
        Line_transform(src_line, dst_line, t);
    }
    return (PyObject *)dst_line;
}

static PyNumberMethods Line_as_number = {
    0,       /* binaryfunc nb_add */
    0,       /* binaryfunc nb_subtract */
    (binaryfunc)Line__mul__,       /* binaryfunc nb_multiply */
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
    0,       /* unaryfunc nb_invert */
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
    (binaryfunc)Line__imul__,       /* binaryfunc nb_inplace_multiply */
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

PyDoc_STRVAR(Line_doc, 
    "Infinite directed line.\n\n"
    "Line(point, direction)"
);

PyTypeObject PlanarLineType = {
    PyVarObject_HEAD_INIT(NULL, 0)
    "planar.Line",     /* tp_name */
    sizeof(PlanarLineObject), /* tp_basicsize */
    0,                    /* tp_itemsize */
    0,                       /* tp_dealloc */
    0,                    /* tp_print */
    0,                    /* tp_getattr */
    0,                    /* tp_setattr */
    0,                    /* reserved */
    (reprfunc)Line_repr,  /* tp_repr */
    &Line_as_number,      /* tp_as_number */
    0,                    /* tp_as_sequence */
    0,                    /* tp_as_mapping */
    0,                    /* tp_hash */
    0,                    /* tp_call */
    (reprfunc)Line_repr,  /* tp_str */
    0,                    /* tp_getattro */
    0,                    /* tp_setattro */
    0,                    /* tp_as_buffer */
    Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_CHECKTYPES,   /* tp_flags */
    Line_doc,             /* tp_doc */
    0,                    /* tp_traverse */
    0,                    /* tp_clear */
    Line_compare,         /* tp_richcompare */
    0,                    /* tp_weaklistoffset */
    0,                    /* tp_iter */
    0,                    /* tp_iternext */
    Line_methods,         /* tp_methods */
    Line_members,         /* tp_members */
    Line_getset,          /* tp_getset */
    0,                    /* tp_base */
    0,                    /* tp_dict */
    0,                    /* tp_descr_get */
    0,                    /* tp_descr_set */
    0,                    /* tp_dictoffset */
    (initproc)Line_init,  /* tp_init */
    0,                    /* tp_alloc */
    0,                    /* tp_new */
    0,                    /* tp_free */
};

/***************************************************************************/

static PyObject *
Ray_repr(PlanarLineObject *self)
{
    char buf[255];

    buf[0] = 0; /* paranoid */
    PyOS_snprintf(buf, 255, "Ray((%g, %g), (%g, %g))", 
        self->anchor.x, self->anchor.y, -self->normal.y, self->normal.x);
    return PyUnicode_FromString(buf);
}

static PyObject *
Ray_compare(PyObject *a, PyObject *b, int op)
{
    PlanarLineObject *ray1, *ray2;

	if (PlanarRay_Check(a) && PlanarRay_Check(b)) {
        ray1 = (PlanarLineObject *)a;
        ray2 = (PlanarLineObject *)b;
		switch (op) {
			case Py_EQ:
                return Py_BOOL(
                    ray1->normal.x == ray2->normal.x &&
                    ray1->normal.y == ray2->normal.y &&
                    ray1->anchor.x == ray2->anchor.x &&
                    ray1->anchor.y == ray2->anchor.y);
            case Py_NE:
                return Py_BOOL(
                    ray1->normal.x != ray2->normal.x ||
                    ray1->normal.y != ray2->normal.y ||
                    ray1->anchor.x != ray2->anchor.x ||
                    ray1->anchor.y != ray2->anchor.y);
			default:
				/* Only == and != are defined */
                RETURN_NOT_IMPLEMENTED;
		}
	} else {
		switch (op) {
			case Py_EQ:
				Py_RETURN_FALSE;
			case Py_NE:
				Py_RETURN_TRUE;
			default:
				/* Only == and != are defined */
				RETURN_NOT_IMPLEMENTED;
		}
	}
}

static PyObject *
Ray_almost_equals(PlanarLineObject *self, PlanarLineObject *other)
{
    return Py_BOOL(
        PlanarRay_Check(self) && PlanarRay_Check(other) &&
        almost_eq(self->normal.x, other->normal.x) &&
        almost_eq(self->normal.y, other->normal.y) &&
        almost_eq(self->anchor.x, other->anchor.x) &&
        almost_eq(self->anchor.y, other->anchor.y));
}

static PlanarVec2Object *
Ray_get_anchor(PlanarLineObject *self) {
    return PlanarVec2_FromStruct(&self->anchor);
}

static int
Ray_set_anchor(PlanarLineObject *self, PyObject *value, void *closure)
{
    if (value == NULL) {
        PyErr_SetString(PyExc_TypeError, "Cannot delete anchor attribute");
        return -1;
    }
    if (!PlanarVec2_Parse(value, &self->anchor.x, &self->anchor.y)) {
        PyErr_SetString(PyExc_TypeError, "Expected Vec2 for anchor");
        return -1;
    }
    self->offset = self->normal.x * self->anchor.x 
        + self->normal.y * self->anchor.y;
    return 0;
}

static PlanarSeq2Object *
Ray_get_points(PlanarLineObject *self) {
    PlanarSeq2Object *seq;

    seq = Seq2_New(&PlanarSeq2Type, 2);
    if (seq != NULL) {
        seq->vec[0].x = self->anchor.x;
        seq->vec[0].y = self->anchor.y;
        seq->vec[1].x = self->anchor.x + -self->normal.y;
        seq->vec[1].y = self->anchor.y + self->normal.x;
    }
    return seq;
}

static PlanarLineObject *
Ray_get_line(PlanarLineObject *self) {
    PlanarLineObject *line;

    line = (PlanarLineObject *)PlanarLineType.tp_alloc(&PlanarLineType, 0);
    if (line != NULL) {
        line->normal.x = self->normal.x;
        line->normal.y = self->normal.y;
        line->anchor.x = self->anchor.x;
        line->anchor.y = self->anchor.y;
        line->offset = self->normal.x * self->anchor.x 
            + self->normal.y * self->anchor.y;
    }
    return line;
}

static PyGetSetDef Ray_getset[] = {
    {"direction", (getter)Line_get_direction, (setter)Line_set_direction, 
        "Direction of the ray as a unit vector.", NULL},
    {"normal", (getter)Line_get_normal, (setter)Line_set_normal, 
        "Normal unit vector perpendicular to the ray.", NULL},
    {"anchor", (getter)Ray_get_anchor, (setter)Ray_set_anchor, 
        "The anchor, or starting point of the ray.", NULL},
    {"points", (getter)Ray_get_points, NULL, 
        "Two distinct points along the ray.", NULL},
    {"line", (getter)Ray_get_line, NULL, 
        "Return a line collinear with this ray.", NULL},
    {NULL}
};

static PyObject *
Ray_distance_to(PlanarLineObject *self, PyObject *pt)
{
    double px, py;

    assert(PlanarRay_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    if (px * -self->normal.y + py * self->normal.x >= 0.0) {
        /* point beside ray */
        return PyFloat_FromDouble(
            fabs(px * self->normal.x + py * self->normal.y));
    } else {
        /* point behind ray */
        return PyFloat_FromDouble(sqrt(px*px + py*py));
    }
}

static PyObject *
Ray_point_behind(PlanarLineObject *self, PyObject *pt)
{
    double px, py, d;

    assert(PlanarRay_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    d = px * -self->normal.y + py * self->normal.x;
    return Py_BOOL(d <= -PLANAR_EPSILON);
}

static PyObject *
Ray_point_left(PlanarLineObject *self, PyObject *pt)
{
    double px, py, b, d;

    assert(PlanarRay_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    b = px * -self->normal.y + py * self->normal.x;
    d = self->normal.x * px + self->normal.y * py;
    return Py_BOOL((b > -PLANAR_EPSILON) & (d <= -PLANAR_EPSILON));
}

static PyObject *
Ray_point_right(PlanarLineObject *self, PyObject *pt)
{
    double px, py, b, d;

    assert(PlanarRay_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    b = px * -self->normal.y + py * self->normal.x;
    d = self->normal.x * px + self->normal.y * py;
    return Py_BOOL((b > -PLANAR_EPSILON) & (d >= PLANAR_EPSILON));
}

static PyObject *
Ray_contains_point(PlanarLineObject *self, PyObject *pt)
{
    double px, py, d;

    assert(PlanarRay_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    if (px * -self->normal.y + py * self->normal.x >= 0.0) {
        d = self->normal.x * px + self->normal.y * py;
    } else {
        d = sqrt(px*px + py*py);
    }
    return Py_BOOL((d < PLANAR_EPSILON) & (d > -PLANAR_EPSILON));

}

static PlanarVec2Object *
Ray_project(PlanarLineObject *self, PyObject *pt)
{
    double px, py, s;

    assert(PlanarRay_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    s = -self->normal.y * px + self->normal.x * py;
    s = s > 0.0 ? s : 0.0;
    return PlanarVec2_FromDoubles(
        -self->normal.y * s + self->anchor.x,
        self->normal.x * s + self->anchor.y);
}

static PyMethodDef Ray_methods[] = {
    {"from_points", (PyCFunction)Line_new_from_points, METH_CLASS | METH_O, 
        "Create a ray from two or more collinear points."},
    {"distance_to", (PyCFunction)Ray_distance_to, METH_O,
        "Return the signed distance from the line to the specified point."},
    {"point_behind", (PyCFunction)Ray_point_behind, METH_O,
        "Return True if the specified point is behind the anchor point with "
        "respect to the direction of the ray."},
    {"point_left", (PyCFunction)Ray_point_left, METH_O,
        "Return True if the specified point is in the space "
        "to the left of, but not behind the ray."},
    {"point_right", (PyCFunction)Ray_point_right, METH_O,
        "Return True if the specified point is in the space "
        "to the right of, but not behind the ray."},
    {"contains_point", (PyCFunction)Ray_contains_point, METH_O,
        "Return True if the specified point is on the ray."},
    {"project", (PyCFunction)Ray_project, METH_O,
        "Compute the projection of a point onto the ray. This "
        "is the closest point on the ray to the specified point."},
    {"almost_equals", (PyCFunction)Ray_almost_equals, METH_O,
        "Return True if this ray is approximately equal to "
        "another ray, within precision limits."},
    {NULL, NULL}
};

/* Arithmetic Operations */

static void
Ray_transform(PlanarLineObject *src_ray, 
    PlanarLineObject *dst_ray, PlanarAffineObject *t)
{
    planar_vec2_t p1, p2, t1, t2;
    double ta, tb, tc, td, te, tf, dx, dy, L;
    ta = t->a;
    tb = t->b;
    tc = t->c;
    td = t->d;
    te = t->e;
    tf = t->f;

    p1.x = src_ray->anchor.x;
    p1.y = src_ray->anchor.y;
    p2.x = p1.x + src_ray->normal.y;
    p2.y = p1.y + -src_ray->normal.x;
    t1.x = p1.x*ta + p1.y*td + tc;
    t1.y = p1.x*tb + p1.y*te + tf;
    t2.x = p2.x*ta + p2.y*td + tc;
    t2.y = p2.x*tb + p2.y*te + tf;
    dx = t2.x - t1.x;
    dy = t2.y - t1.y;
    L = sqrt(dx*dx + dy*dy);
    if (L < PLANAR_EPSILON) {
        PyErr_SetString(PyExc_ValueError, 
            "Ray direction vector must not be null");
    }
    dst_ray->normal.x = -dy / L;
    dst_ray->normal.y = dx / L;
    dst_ray->anchor.x = t1.x;
    dst_ray->anchor.y = t1.y;
}

static PyObject *
Ray__imul__(PyObject *a, PyObject *b)
{
    PlanarLineObject *ray;
    PlanarAffineObject *t;

    if (PlanarRay_Check(a) && PlanarAffine_Check(b)) {
		ray = (PlanarLineObject *)a;
		t = (PlanarAffineObject *)b;
    } else if (PlanarRay_Check(b) && PlanarAffine_Check(a)) {
		ray = (PlanarLineObject *)b;
		t = (PlanarAffineObject *)a;
    } else {
		/* We support only transform operations */
		RETURN_NOT_IMPLEMENTED;
    }

    Ray_transform(ray, ray, t);
    Py_INCREF(ray);
    return (PyObject *)ray;
}

static PyObject *
Ray__mul__(PyObject *a, PyObject *b)
{
    PlanarLineObject *src_ray, *dst_ray;
    PlanarAffineObject *t;

    if (PlanarRay_Check(a) && PlanarAffine_Check(b)) {
		src_ray = (PlanarLineObject *)a;
		t = (PlanarAffineObject *)b;
    } else if (PlanarRay_Check(b) && PlanarAffine_Check(a)) {
		src_ray = (PlanarLineObject *)b;
		t = (PlanarAffineObject *)a;
    } else {
		/* We support only transform operations */
		RETURN_NOT_IMPLEMENTED;
    }

    dst_ray = (PlanarLineObject *)Py_TYPE(src_ray)->tp_alloc(
        Py_TYPE(src_ray), 0);
    if (dst_ray != NULL) {
        Ray_transform(src_ray, dst_ray, t);
    }
    return (PyObject *)dst_ray;
}

static PyNumberMethods Ray_as_number = {
    0,       /* binaryfunc nb_add */
    0,       /* binaryfunc nb_subtract */
    (binaryfunc)Ray__mul__,       /* binaryfunc nb_multiply */
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
    0,       /* unaryfunc nb_invert */
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
    (binaryfunc)Ray__imul__,       /* binaryfunc nb_inplace_multiply */
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

PyDoc_STRVAR(Ray_doc, 
    "Directed ray anchored by a single point.\n\n"
    "Ray(anchor, direction)"
);

PyTypeObject PlanarRayType = {
    PyVarObject_HEAD_INIT(NULL, 0)
    "planar.Ray",     /* tp_name */
    sizeof(PlanarLineObject), /* tp_basicsize */
    0,                    /* tp_itemsize */
    0,                    /* tp_dealloc */
    0,                    /* tp_print */
    0,                    /* tp_getattr */
    0,                    /* tp_setattr */
    0,                    /* reserved */
    (reprfunc)Ray_repr,   /* tp_repr */
    &Ray_as_number,       /* tp_as_number */
    0,                    /* tp_as_sequence */
    0,                    /* tp_as_mapping */
    0,                    /* tp_hash */
    0,                    /* tp_call */
    (reprfunc)Ray_repr,   /* tp_str */
    0,                    /* tp_getattro */
    0,                    /* tp_setattro */
    0,                    /* tp_as_buffer */
    Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_CHECKTYPES,   /* tp_flags */
    Ray_doc,              /* tp_doc */
    0,                    /* tp_traverse */
    0,                    /* tp_clear */
    Ray_compare,          /* tp_richcompare */
    0,                    /* tp_weaklistoffset */
    0,                    /* tp_iter */
    0,                    /* tp_iternext */
    Ray_methods,          /* tp_methods */
    0,                    /* tp_members */
    Ray_getset,           /* tp_getset */
    0,                    /* tp_base */
    0,                    /* tp_dict */
    0,                    /* tp_descr_get */
    0,                    /* tp_descr_set */
    0,                    /* tp_dictoffset */
    (initproc)Line_init,  /* tp_init */
    0,                    /* tp_alloc */
    0,                    /* tp_new */
    0,                    /* tp_free */
};

/***************************************************************************/

static PlanarVec2Object *
Segment_get_vector(PlanarLineObject *self) {
    return PlanarVec2_FromDoubles(
        -self->normal.y * self->length, self->normal.x * self->length);
}

static int
Segment_set_vector(PlanarLineObject *self, PyObject *value, void *closure)
{
    double dx, dy;

    if (value == NULL) {
        PyErr_SetString(PyExc_TypeError, "Cannot delete vector attribute");
        return -1;
    }
    if (!PlanarVec2_Parse(value, &dx, &dy)) {
        PyErr_SetString(PyExc_TypeError, "Expected Vec2 for vector");
        return -1;
    }
    self->length = sqrt(dx*dx + dy*dy);
    if (self->length == 0.0) {
        self->normal.x = 0.0;
        self->normal.y = -1.0;
    } else {
        self->normal.x = dy / self->length;
        self->normal.y = -dx / self->length;
    }
    return 0;
}

static PlanarVec2Object *
Segment_get_anchor(PlanarLineObject *self) {
    return PlanarVec2_FromStruct(&self->anchor);
}

static int
Segment_set_anchor(PlanarLineObject *self, PyObject *value, void *closure)
{
    if (value == NULL) {
        PyErr_SetString(PyExc_TypeError, "Cannot delete anchor attribute");
        return -1;
    }
    if (!PlanarVec2_Parse(value, &self->anchor.x, &self->anchor.y)) {
        PyErr_SetString(PyExc_TypeError, "Expected Vec2 for anchor");
        return -1;
    }
    return 0;
}

static PlanarVec2Object *
Segment_get_end(PlanarLineObject *self) {
    return PlanarVec2_FromDoubles(
        self->anchor.x + -self->normal.y * self->length, 
        self->anchor.y + self->normal.x * self->length);
}

static int
Segment_set_end(PlanarLineObject *self, PyObject *value, void *closure)
{
    double ex, ey, dx, dy;

    if (value == NULL) {
        PyErr_SetString(PyExc_TypeError, "Cannot delete end attribute");
        return -1;
    }
    if (!PlanarVec2_Parse(value, &ex, &ey)) {
        PyErr_SetString(PyExc_TypeError, "Expected Vec2 for end");
        return -1;
    }
    dx = ex - self->anchor.x;
    dy = ey - self->anchor.y;
    self->length = sqrt(dx*dx + dy*dy);
    if (self->length == 0.0) {
        self->normal.x = 0.0;
        self->normal.y = -1.0;
    } else {
        self->normal.x = dy / self->length;
        self->normal.y = -dx / self->length;
    }
    return 0;
}

static PlanarVec2Object *
Segment_get_mid(PlanarLineObject *self) {
    return PlanarVec2_FromDoubles(
        self->anchor.x + -self->normal.y * self->length * 0.5, 
        self->anchor.y + self->normal.x * self->length * 0.5);
}

static int
Segment_init(PlanarLineObject *self, PyObject *args)
{
    assert(PlanarSegment_Check(self));
    if (PyTuple_GET_SIZE(args) != 2) {
        PyErr_SetString(PyExc_TypeError, 
            "LineSegment: wrong number of arguments");
        return -1;
    }
    if (!PlanarVec2_Parse(PyTuple_GET_ITEM(args, 0), 
        &self->anchor.x, &self->anchor.y)) {
        return -1;
    }
    if (Segment_set_vector(self, PyTuple_GET_ITEM(args, 1), NULL) == -1) {
        return -1;
    }
    return 0;
}

static PyObject *
Segment_repr(PlanarLineObject *self)
{
    char buf[255];

    buf[0] = 0; /* paranoid */
    PyOS_snprintf(buf, 255, "LineSegment((%g, %g), (%g, %g))", 
        self->anchor.x, self->anchor.y, 
        -self->normal.y * self->length,
        self->normal.x * self->length);
    return PyUnicode_FromString(buf);
}

static PyObject *
Segment_compare(PyObject *a, PyObject *b, int op)
{
    PlanarLineObject *seg1, *seg2;

	if (PlanarSegment_Check(a) && PlanarSegment_Check(b)) {
        seg1 = (PlanarLineObject *)a;
        seg2 = (PlanarLineObject *)b;
		switch (op) {
			case Py_EQ:
                return Py_BOOL(
                    seg1->length == seg2->length &&
                    seg1->normal.x == seg2->normal.x &&
                    seg1->normal.y == seg2->normal.y &&
                    seg1->anchor.x == seg2->anchor.x &&
                    seg1->anchor.y == seg2->anchor.y);
            case Py_NE:
                return Py_BOOL(
                    seg1->length != seg2->length ||
                    seg1->normal.x != seg2->normal.x ||
                    seg1->normal.y != seg2->normal.y ||
                    seg1->anchor.x != seg2->anchor.x ||
                    seg1->anchor.y != seg2->anchor.y);
			default:
				/* Only == and != are defined */
                RETURN_NOT_IMPLEMENTED;
		}
	} else {
		switch (op) {
			case Py_EQ:
				Py_RETURN_FALSE;
			case Py_NE:
				Py_RETURN_TRUE;
			default:
				/* Only == and != are defined */
				RETURN_NOT_IMPLEMENTED;
		}
	}
}

static PyObject *
Segment_almost_equals(PlanarLineObject *self, PlanarLineObject *other)
{
    return Py_BOOL(
        PlanarSegment_Check(self) && PlanarSegment_Check(other) &&
        almost_eq(self->length, other->length) &&
        almost_eq(self->normal.x, other->normal.x) &&
        almost_eq(self->normal.y, other->normal.y) &&
        almost_eq(self->anchor.x, other->anchor.x) &&
        almost_eq(self->anchor.y, other->anchor.y));
}

static PlanarSeq2Object *
Segment_get_points(PlanarLineObject *self) {
    PlanarSeq2Object *seq;

    seq = Seq2_New(&PlanarSeq2Type, 2);
    if (seq != NULL) {
        seq->vec[0].x = self->anchor.x;
        seq->vec[0].y = self->anchor.y;
        seq->vec[1].x = self->anchor.x + -self->normal.y * self->length;
        seq->vec[1].y = self->anchor.y + self->normal.x * self->length;
    }
    return seq;
}

static PyGetSetDef Segment_getset[] = {
    {"direction", (getter)Line_get_direction, (setter)Line_set_direction, 
        "Direction of the line segment as a unit vector.", NULL},
    {"normal", (getter)Line_get_normal, (setter)Line_set_normal, 
        "Normal unit vector perpendicular to the line segment.", NULL},
    {"anchor", (getter)Segment_get_anchor, (setter)Segment_set_anchor, 
        "The anchor, or starting point of the line segment.", NULL},
    {"start", (getter)Segment_get_anchor, (setter)Segment_set_anchor, 
        "The starting point of the line segment. Alias for anchor.", NULL},
    {"mid", (getter)Segment_get_mid, NULL,
        "The midpoint of the line segment (read-only).", NULL},
    {"end", (getter)Segment_get_end, (setter)Segment_set_end, 
        "The end point of the line sequence.", NULL},
    {"vector", (getter)Segment_get_vector, (setter)Segment_set_vector, 
        "The vector that comprises the length and direction of the "
        "line segment from its anchor point.", NULL},
    {"points", (getter)Segment_get_points, NULL, 
        "Two distinct points along the line segment.", NULL},
    {"line", (getter)Ray_get_line, NULL, 
        "Return a line collinear with this line segment.", NULL},
    {NULL}
};

static PyMemberDef Segment_members[] = {
    {"length", T_DOUBLE, offsetof(PlanarLineObject, length), 0,
        "The distance between the line segments endpoints."},
    {NULL}
};

/* Methods */

static PlanarLineObject *
Segment_new_from_normal(PyTypeObject *type, PyObject *args)
{
    PlanarLineObject *line;
    PyObject *normal_arg;
    double offset, start_dist, end_dist;

    assert(PyType_IsSubtype(type, &PlanarSegmentType));
    if (!PyArg_ParseTuple(args, "Oddd:LineSegment.from_normal", 
        &normal_arg, &offset, &start_dist, &end_dist)) {
        return NULL;
    }
    line = (PlanarLineObject *)type->tp_alloc(type, 0);
    if (line == NULL) {
        return NULL;
    }
    if (Line_set_normal(line, normal_arg, NULL) == -1) {
        Py_DECREF(line);
        return NULL;
    }
    line->anchor.x = line->normal.x * offset + start_dist * -line->normal.y;
    line->anchor.y = line->normal.y * offset + start_dist * line->normal.x;
    line->length = end_dist - start_dist;
    return line;
}

static PlanarLineObject *
Segment_new_from_points(PyTypeObject *type, PyObject *points) 
{
    PlanarLineObject *line;
    planar_vec2_t *vec;
    Py_ssize_t size;
    int i;
    double furthest = 0.0;
    double x, y, L;
    double dx = 0.0;
    double dy = 0.0;
    double sx = 0.0;
    double sy = 0.0;

    assert(PyType_IsSubtype(type, &PlanarSegmentType));
    line = (PlanarLineObject *)type->tp_alloc(type, 0);
    if (line == NULL) {
        return NULL;
    }

    if (PlanarSeq2_Check(points)) {
        /* Optimized code path for Seq2 objects */
        if (Py_SIZE(points) == 0) {
            goto tooShort;
        }
        vec = ((PlanarSeq2Object *)points)->vec;
        x = vec[0].x;
        y = vec[0].y;
        for (i = 1; i < Py_SIZE(points); ++i) {
            dx = vec[i].x - x;
            dy = vec[i].y - y;
            if (!almost_eq(dx*sx + dy*sy, 0.0)) {
                goto notCollinear;
            }
            L = dx*dx + dy*dy;
            if (L > furthest) {
                furthest = L;
                sx = dy;
                sy = -dx;
            }
        }
    } else {
        points = PySequence_Fast(points, "expected iterable of Vec2 objects");
        if (points == NULL) {
            return NULL;
        }
        size = PySequence_Fast_GET_SIZE(points);
        if (Py_SIZE(points) == 0) {
            Py_DECREF(points);
            goto tooShort;
        }
        if (!PlanarVec2_Parse(PySequence_Fast_GET_ITEM(points, 0), &x, &y)) {
            Py_DECREF(points);
            goto wrongType;
        }
        for (i = 1; i < size; ++i) {
            if (!PlanarVec2_Parse(
                PySequence_Fast_GET_ITEM(points, i), &dx, &dy)) {
                Py_DECREF(points);
                goto wrongType;
            }
            dx -= x;
            dy -= y;
            if (!almost_eq(dx*sx + dy*sy, 0.0)) {
                Py_DECREF(points);
                goto notCollinear;
            }
            L = dx*dx + dy*dy;
            if (L > furthest) {
                furthest = L;
                sx = dy;
                sy = -dx;
            }
        }
        Py_DECREF(points);
    }
    line->anchor.x = x;
    line->anchor.y = y;
    L = sqrt(furthest);
    line->length = L;
    if (L > 0.0) {
        line->normal.x = sx / L;
        line->normal.y = sy / L;
    } else {
        line->normal.x = 0.0;
        line->normal.y = -1.0;
    }
    return line;

wrongType:
    PyErr_SetString(PyExc_TypeError, "expected iterable of Vec2 objects");
    Py_DECREF(line);
    return NULL;
tooShort:
    PyErr_SetString(PyExc_ValueError,
        "Expected iterable of 1 or more points");
    Py_DECREF(line);
    return NULL;
notCollinear:
    PyErr_SetString(PyExc_ValueError, "All points provided must be collinear");
    Py_DECREF(line);
    return NULL;
}

static PyObject *
Segment_distance_to(PlanarLineObject *self, PyObject *pt)
{
    double px, py, dx, dy, along;

    assert(PlanarSegment_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    dx = px - self->anchor.x;
    dy = py - self->anchor.y;
    along = dx * -self->normal.y + dy * self->normal.x;
    if (along < 0.0) {
        /* point behind */
        return PyFloat_FromDouble(sqrt(dx*dx + dy*dy));
    } else if (along > self->length) {
        /* point ahead */
        dx = px - (self->anchor.x + -self->normal.y * self->length); 
        dy = py - (self->anchor.y + self->normal.x * self->length);
        return PyFloat_FromDouble(sqrt(dx*dx + dy*dy));
    } else {
        /* point beside */
        return PyFloat_FromDouble(
            fabs(dx * self->normal.x + dy * self->normal.y));
    }
}

static PyObject *
Segment_point_ahead(PlanarLineObject *self, PyObject *pt)
{
    double px, py, d;

    assert(PlanarSegment_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    d = px * -self->normal.y + py * self->normal.x;
    return Py_BOOL(d >= self->length + PLANAR_EPSILON);
}

static PyObject *
Segment_point_behind(PlanarLineObject *self, PyObject *pt)
{
    double px, py, d;

    assert(PlanarSegment_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    d = px * -self->normal.y + py * self->normal.x;
    return Py_BOOL(d <= -PLANAR_EPSILON);
}

static PyObject *
Segment_point_left(PlanarLineObject *self, PyObject *pt)
{
    double px, py, b, d;

    assert(PlanarSegment_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    b = px * -self->normal.y + py * self->normal.x;
    d = self->normal.x * px + self->normal.y * py;
    return Py_BOOL((b > -PLANAR_EPSILON) & (b < self->length + PLANAR_EPSILON)
        & (d <= -PLANAR_EPSILON));
}

static PyObject *
Segment_point_right(PlanarLineObject *self, PyObject *pt)
{
    double px, py, b, d;

    assert(PlanarSegment_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    b = px * -self->normal.y + py * self->normal.x;
    d = self->normal.x * px + self->normal.y * py;
    return Py_BOOL((b > -PLANAR_EPSILON) & (b < self->length + PLANAR_EPSILON) 
        & (d >= PLANAR_EPSILON));
}

static PyObject *
Segment_contains_point(PlanarLineObject *self, PyObject *pt)
{
    double px, py, d;

    assert(PlanarSegment_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    if (px * -self->normal.y + py * self->normal.x >= 0.0) {
        d = self->normal.x * px + self->normal.y * py;
    } else {
        d = sqrt(px*px + py*py);
    }
    return Py_BOOL((d < PLANAR_EPSILON) & (d > -PLANAR_EPSILON));

}

static PlanarVec2Object *
Segment_project(PlanarLineObject *self, PyObject *pt)
{
    double px, py, along;

    assert(PlanarSegment_Check(self));
    if (!PlanarVec2_Parse(pt, &px, &py)) {
        return NULL;
    }
    px -= self->anchor.x;
    py -= self->anchor.y;
    along = px * -self->normal.y + py * self->normal.x;
    if (along < 0.0) {
        /* point behind */
        return PlanarVec2_FromStruct(&self->anchor);
    } else if (along > self->length) {
        /* point ahead */
        return PlanarVec2_FromDoubles(
            self->anchor.x + -self->normal.y * self->length,
            self->anchor.y + self->normal.x * self->length);
    } else {
        /* point beside */
        return PlanarVec2_FromDoubles(
            self->anchor.x + -self->normal.y * along,
            self->anchor.y + self->normal.x * along);
    }
}

static PyMethodDef Segment_methods[] = {
    {"from_normal", (PyCFunction)Segment_new_from_normal, 
        METH_CLASS | METH_VARARGS, 
        "Create a line segment from a normal vector perpendicular to the "
        "line containing the segment, the offset distance from that line to "
        "origin, and the signed distances along that line from the projection "
        "of the origin to the start and end points of the segment "
        "respectively."},
    {"from_points", (PyCFunction)Segment_new_from_points, METH_CLASS | METH_O, 
        "Create a line segment from one or more collinear points.  The first "
        "point is assumed to be the anchor. The furthest point from the "
        "anchor is the end point."},
    {"distance_to", (PyCFunction)Segment_distance_to, METH_O,
        "Return the distance from the line segment to the specified point."},
    {"point_behind", (PyCFunction)Segment_point_behind, METH_O,
        "Return True if the specified point is behind the anchor point with "
        "respect to the direction of the line segment."},
    {"point_ahead", (PyCFunction)Segment_point_ahead, METH_O,
        "Return True if the specified point is ahead of the endpoint "
        "of the line segment with respect to its direction."},
    {"point_left", (PyCFunction)Segment_point_left, METH_O,
        "Return True if the specified point is in the space "
        "to the left of, but not behind the line segment."},
    {"point_right", (PyCFunction)Segment_point_right, METH_O,
        "Return True if the specified point is in the space "
        "to the right of, but not behind the line segment."},
    {"contains_point", (PyCFunction)Segment_contains_point, METH_O,
        "Return True if the specified point is on the line segment."},
    {"project", (PyCFunction)Segment_project, METH_O,
        "Compute the projection of a point onto the line segment. This "
        "is the closest point on the line segment to the specified point."},
    {"almost_equals", (PyCFunction)Segment_almost_equals, METH_O,
        "Return True if this line segment is approximately equal to "
        "another, within precision limits."},
    {NULL, NULL}
};

/* Arithmetic Operations */

static void
Segment_transform(PlanarLineObject *src_line, 
    PlanarLineObject *dst_line, PlanarAffineObject *t)
{
    planar_vec2_t p1, p2, t1, t2;
    double ta, tb, tc, td, te, tf, dx, dy, L;
    ta = t->a;
    tb = t->b;
    tc = t->c;
    td = t->d;
    te = t->e;
    tf = t->f;

    p1.x = src_line->anchor.x;
    p1.y = src_line->anchor.y;
    p2.x = p1.x + src_line->normal.y * src_line->length;
    p2.y = p1.y + -src_line->normal.x * src_line->length;
    t1.x = p1.x*ta + p1.y*td + tc;
    t1.y = p1.x*tb + p1.y*te + tf;
    t2.x = p2.x*ta + p2.y*td + tc;
    t2.y = p2.x*tb + p2.y*te + tf;
    dx = t2.x - t1.x;
    dy = t2.y - t1.y;
    L = sqrt(dx*dx + dy*dy);
    if (L < PLANAR_EPSILON) {
        PyErr_SetString(PyExc_ValueError, 
            "Segment direction vector must not be null");
    }
    dst_line->normal.x = -dy / L;
    dst_line->normal.y = dx / L;
    dst_line->anchor.x = t1.x;
    dst_line->anchor.y = t1.y;
    dst_line->end.x = t2.x;
    dst_line->end.y = t2.y;
    dst_line->length = L;
}

static PyObject *
Segment__imul__(PyObject *a, PyObject *b)
{
    PlanarLineObject *line;
    PlanarAffineObject *t;

    if (PlanarSegment_Check(a) && PlanarAffine_Check(b)) {
		line = (PlanarLineObject *)a;
		t = (PlanarAffineObject *)b;
    } else if (PlanarSegment_Check(b) && PlanarAffine_Check(a)) {
		line = (PlanarLineObject *)b;
		t = (PlanarAffineObject *)a;
    } else {
		/* We support only transform operations */
		RETURN_NOT_IMPLEMENTED;
    }

    Segment_transform(line, line, t);
    Py_INCREF(line);
    return (PyObject *)line;
}

static PyObject *
Segment__mul__(PyObject *a, PyObject *b)
{
    PlanarLineObject *src_line, *dst_line;
    PlanarAffineObject *t;

    if (PlanarSegment_Check(a) && PlanarAffine_Check(b)) {
		src_line = (PlanarLineObject *)a;
		t = (PlanarAffineObject *)b;
    } else if (PlanarSegment_Check(b) && PlanarAffine_Check(a)) {
		src_line = (PlanarLineObject *)b;
		t = (PlanarAffineObject *)a;
    } else {
		/* We support only transform operations */
		RETURN_NOT_IMPLEMENTED;
    }

    dst_line = (PlanarLineObject *)Py_TYPE(src_line)->tp_alloc(
        Py_TYPE(src_line), 0);
    if (dst_line != NULL) {
        Segment_transform(src_line, dst_line, t);
    }
    return (PyObject *)dst_line;
}

static PyNumberMethods Segment_as_number = {
    0,       /* binaryfunc nb_add */
    0,       /* binaryfunc nb_subtract */
    (binaryfunc)Segment__mul__,       /* binaryfunc nb_multiply */
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
    0,       /* unaryfunc nb_invert */
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
    (binaryfunc)Segment__imul__,       /* binaryfunc nb_inplace_multiply */
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

PyDoc_STRVAR(Segment_doc, 
    "Directed line segment between two points.\n\n"
    "LineSegment(anchor, vector)"
);

PyTypeObject PlanarSegmentType = {
    PyVarObject_HEAD_INIT(NULL, 0)
    "planar.LineSegment",     /* tp_name */
    sizeof(PlanarLineObject), /* tp_basicsize */
    0,                    /* tp_itemsize */
    0,                    /* tp_dealloc */
    0,                    /* tp_print */
    0,                    /* tp_getattr */
    0,                    /* tp_setattr */
    0,                    /* reserved */
    (reprfunc)Segment_repr, /* tp_repr */
    &Segment_as_number,  /* tp_as_number */
    0,                    /* tp_as_sequence */
    0,                    /* tp_as_mapping */
    0,                    /* tp_hash */
    0,                    /* tp_call */
    (reprfunc)Segment_repr,   /* tp_str */
    0,                    /* tp_getattro */
    0,                    /* tp_setattro */
    0,                    /* tp_as_buffer */
    Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_CHECKTYPES,   /* tp_flags */
    Segment_doc,          /* tp_doc */
    0,                    /* tp_traverse */
    0,                    /* tp_clear */
    Segment_compare,      /* tp_richcompare */
    0,                    /* tp_weaklistoffset */
    0,                    /* tp_iter */
    0,                    /* tp_iternext */
    Segment_methods,      /* tp_methods */
    Segment_members,      /* tp_members */
    Segment_getset,       /* tp_getset */
    0,                    /* tp_base */
    0,                    /* tp_dict */
    0,                    /* tp_descr_get */
    0,                    /* tp_descr_set */
    0,                    /* tp_dictoffset */
    (initproc)Segment_init,  /* tp_init */
    0,                    /* tp_alloc */
    0,                    /* tp_new */
    0,                    /* tp_free */
};

