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
#include <string.h>
#include "planar.h"

#define BBOX_FREE_MAX 200
static PyObject *bbox_free_list = NULL;
static int bbox_free_size = 0;

static int
BBox_init_from_points(PlanarBBoxObject *self, PyObject *points) 
{
    planar_vec2_t *vec;
    Py_ssize_t size;
    int i;
    double x, y;

    if (PlanarSeq2_Check(points)) {
        /* Optimized code path for Seq2 objects */
        if (Py_SIZE(points) < 1) {
            goto tooShort;
        }
        vec = ((PlanarSeq2Object *)points)->vec;
        self->max.x = self->min.x = vec->x;
        self->max.y = self->min.y = vec->y;
        for (i = 1; i < Py_SIZE(points); ++i) {
            ++vec;
            if (vec->x > self->max.x) {
                self->max.x = vec->x;
            } else if (vec->x < self->min.x) {
                self->min.x = vec->x;
            }
            if (vec->y > self->max.y) {
                self->max.y = vec->y;
            } else if (vec->y < self->min.y) {
                self->min.y = vec->y;
            }
        }
    } else {
        points = PySequence_Fast(points, "expected iterable of Vec2 objects");
		if (points == NULL) {
			return -1;
		}
		size = PySequence_Fast_GET_SIZE(points);
        if (Py_SIZE(points) < 1) {
            Py_DECREF(points);
            goto tooShort;
        }
        if (!PlanarVec2_Parse(PySequence_Fast_GET_ITEM(points, 0), &x, &y)) {
            Py_DECREF(points);
            goto wrongType;
        }
        self->max.x = self->min.x = x;
        self->max.y = self->min.y = y;
        for (i = 1; i < size; ++i) {
			if (!PlanarVec2_Parse(PySequence_Fast_GET_ITEM(points, i), 
				&x, &y)) {
                Py_DECREF(points);
                goto wrongType;
			}
            if (x > self->max.x) {
                self->max.x = x;
            } else if (x < self->min.x) {
                self->min.x = x;
            }
            if (y > self->max.y) {
                self->max.y = y;
            } else if (y < self->min.y) {
                self->min.y = y;
            }
		}
		Py_DECREF(points);
    }
    return 0;

wrongType:
    PyErr_SetString(PyExc_TypeError, "expected iterable of Vec2 objects");
    return -1;
tooShort:
    PyErr_SetString(PyExc_ValueError,
        "Cannot construct a BoundingBox without at least one point");
    return -1;
}

static int
BBox_init(PlanarBBoxObject *self, PyObject *args)
{
    assert(PlanarBBox_Check(self));
    if (PyTuple_GET_SIZE(args) != 1) {
        PyErr_SetString(PyExc_TypeError, 
            "BoundingBox: wrong number of arguments");
        return -1;
    }
    return BBox_init_from_points(self, PyTuple_GET_ITEM(args, 0));
}

static PyObject *
BBox_alloc(PyTypeObject *type, Py_ssize_t nitems)
{
    PlanarBBoxObject *box;

    assert(PyType_IsSubtype(type, &PlanarBBoxType));
    if (bbox_free_list != NULL) {
        box = (PlanarBBoxObject *)bbox_free_list;
        Py_INCREF(box);
        bbox_free_list = box->next_free;
        --bbox_free_size;
		return (PyObject *)box;
    } else {
        return PyType_GenericAlloc(type, nitems);
    }
}

static void
BBox_dealloc(PlanarBBoxObject *self)
{
    if (PlanarBBox_CheckExact(self) && bbox_free_size < BBOX_FREE_MAX) {
        self->next_free = bbox_free_list;
        bbox_free_list = (PyObject *)self;
        ++bbox_free_size;
    } else {
        Py_TYPE(self)->tp_free((PyObject *)self);
    }
}


static PyObject *
BBox_repr(PlanarBBoxObject *self)
{
    char buf[255];
    buf[0] = 0; /* paranoid */
    PyOS_snprintf(buf, 255, "BoundingBox([(%lg, %lg), (%lg, %lg)])",
		self->min.x, self->min.y, self->max.x, self->max.y);
    return PyUnicode_FromString(buf);
}


/* Property descriptors */

static PlanarVec2Object *
BBox_get_max_point(PlanarBBoxObject *self) {
    return PlanarVec2_FromStruct(&self->max);
}

static PlanarVec2Object *
BBox_get_min_point(PlanarBBoxObject *self) {
    return PlanarVec2_FromStruct(&self->min);
}

static PlanarVec2Object *
BBox_get_center(PlanarBBoxObject *self) {
    return PlanarVec2_FromDoubles(
        (self->min.x + self->max.x) * 0.5,
        (self->min.y + self->max.y) * 0.5);
}

static PyObject *
BBox_get_width(PlanarBBoxObject *self) {
    return PyFloat_FromDouble(self->max.x - self->min.x);    
}

static PyObject *
BBox_get_height(PlanarBBoxObject *self) {
    return PyFloat_FromDouble(self->max.y - self->min.y);    
}

static PyObject *
BBox_get_is_empty(PlanarBBoxObject *self) {
    PyObject *r;

    if (self->max.x == self->min.x || self->max.y == self->min.y) {
        r = Py_True;
    } else {
        r = Py_False;
    }
    Py_INCREF(r);
    return r;
}

static PlanarBBoxObject *
BBox_get_bounding_box(PlanarBBoxObject *self) {
    Py_INCREF(self);
    return self;
}

static PyGetSetDef BBox_getset[] = {
    {"max_point", (getter)BBox_get_max_point, NULL, 
        "The maximum corner point for the shape. "
        "This is the corner with the largest x and y value.", NULL},
    {"min_point", (getter)BBox_get_min_point, NULL, 
        "The minimum corner point for the shape. "
        "This is the corner with the smallest x and y value.", NULL},
    {"center", (getter)BBox_get_center, NULL, 
        "The center point of the box.", NULL},
    {"width", (getter)BBox_get_width, NULL, 
        "The width of the box.", NULL},
    {"height", (getter)BBox_get_height, NULL, 
        "The height of the box.", NULL},
    {"is_empty", (getter)BBox_get_is_empty, NULL, 
        "True if the box has zero area.", NULL},
    {"bounding_box", (getter)BBox_get_bounding_box, NULL, 
        "The bounding box for this shape. "
        "For a BoundingBox instance, this is always itself.", NULL},
    {NULL}
};

/* Methods */

static PlanarBBoxObject *
BBox_new_from_points(PyTypeObject *type, PyObject *points) 
{
    PlanarBBoxObject *box;

    assert(PyType_IsSubtype(type, &PlanarBBoxType));
    box = (PlanarBBoxObject *)type->tp_alloc(type, 0);
    if (box != NULL && BBox_init_from_points(box, points) == 0) {
        return box;
    } else {
        return NULL;
    }
}

static PyObject *
BBox_compare(PyObject *a, PyObject *b, int op)
{
    PlanarBBoxObject *box1, *box2;

	if (PlanarBBox_Check(a) && PlanarBBox_Check(b)) {
        box1 = (PlanarBBoxObject *)a;
        box2 = (PlanarBBoxObject *)b;
		switch (op) {
			case Py_EQ:
                return Py_BOOL(
                    box1->min.x == box2->min.x &&
                    box1->min.y == box2->min.y &&
                    box1->max.x == box2->max.x &&
                    box1->max.y == box2->max.y);
            case Py_NE:
                return Py_BOOL(
                    box1->min.x != box2->min.x ||
                    box1->min.y != box2->min.y ||
                    box1->max.x != box2->max.x ||
                    box1->max.y != box2->max.y);
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
BBox_almost_equals(PlanarBBoxObject *self, PlanarBBoxObject *other)
{
	return Py_BOOL(
		PlanarBBox_Check(self) && PlanarBBox_Check(other) &&
		almost_eq(self->min.x, other->min.x) &&
		almost_eq(self->min.y, other->min.y) &&
		almost_eq(self->max.x, other->max.x) &&
		almost_eq(self->max.y, other->max.y));
}


static PlanarBBoxObject *
get_bounding_box(PyObject *shape)
{
    PlanarBBoxObject *bbox;

    static PyObject *bounding_box_str = NULL;
    if (bounding_box_str == NULL) {
        bounding_box_str = PyUnicode_InternFromString("bounding_box");
		if (bounding_box_str == NULL) {
			return NULL;
		}
	}
    bbox = (PlanarBBoxObject *)PyObject_GetAttr(shape, bounding_box_str);
    if (bbox != NULL && !PlanarBBox_Check(bbox)) {
        PyErr_SetString(PyExc_TypeError,
            "Shape returned incompatible object "
            "for attribute bounding_box.");
        Py_CLEAR(bbox);
    }
    return bbox;
}

static PlanarBBoxObject *
BBox_new_from_shapes(PyTypeObject *type, PyObject *shapes) 
{
    PlanarBBoxObject *result, *bbox = NULL;
    Py_ssize_t size;
    PyObject **item;

    assert(PyType_IsSubtype(type, &PlanarBBoxType));
    result = (PlanarBBoxObject *)type->tp_alloc(type, 0);
    shapes = PySequence_Fast(shapes, "expected iterable of bounded shapes");
    if (result == NULL || shapes == NULL) {
        goto error;
    }
    size = PySequence_Fast_GET_SIZE(shapes);
    if (size < 1) {
        PyErr_SetString(PyExc_ValueError,
            "Cannot construct a BoundingBox without at least one shape");
        goto error;
    }
    result->min.x = result->min.y = DBL_MAX;
    result->max.x = result->max.y = -DBL_MAX;
    item = PySequence_Fast_ITEMS(shapes);
    while (size--) {
        bbox = get_bounding_box(*(item++));
        if (bbox == NULL) {
            goto error;
        }
        if (bbox->min.x < result->min.x) {
            result->min.x = bbox->min.x;
        }
        if (bbox->min.y < result->min.y) {
            result->min.y = bbox->min.y;
        }
        if (bbox->max.x > result->max.x) {
            result->max.x = bbox->max.x;
        }
        if (bbox->max.y > result->max.y) {
            result->max.y = bbox->max.y;
        }
        Py_CLEAR(bbox);
    }
    Py_DECREF(shapes);
    return result;
    
error:
    Py_XDECREF(bbox);
    Py_XDECREF(result);
    Py_XDECREF(shapes);
    return NULL;
}

static PlanarBBoxObject *
BBox_new_from_center(PyTypeObject *type, PyObject *args, PyObject *kwargs) 
{
    PlanarBBoxObject *bbox;
    PyObject *center_arg;
    double width, height, cx, cy;
    static char *kwlist[] = {"center", "width", "height", NULL};

    assert(PyType_IsSubtype(type, &PlanarBBoxType));
    if (!PyArg_ParseTupleAndKeywords(args, kwargs, 
        "Odd:BoundingBox.from_center", kwlist, 
        &center_arg, &width, &height)) {
        return NULL;
    }
    if (!PlanarVec2_Parse(center_arg, &cx, &cy)) {
        PyErr_SetString(PyExc_TypeError,
            "expected Vec2 for argument center");
        return NULL;
    }
    width = fabs(width) * 0.5;
    height = fabs(height) * 0.5;
    bbox = (PlanarBBoxObject *)type->tp_alloc(type, 0);
    if (bbox == NULL) {
        return NULL;
    }
    bbox->min.x = cx - width;
    bbox->min.y = cy - height;
    bbox->max.x = cx + width;
    bbox->max.y = cy + height;
    return bbox;
}

static PlanarBBoxObject *
BBox_inflate(PlanarBBoxObject *self, PyObject *amount)
{
    PlanarBBoxObject *bbox;
    double ix, iy;

    assert(PlanarBBox_Check(self));
    if (!PlanarVec2_Parse(amount, &ix, &iy)) {
        amount = PyObject_ToFloat(amount);
        if (amount == NULL) {
            PyErr_SetString(PyExc_TypeError,
                "expected number or Vec2 for argument amount");
            return NULL;
        }
        ix = iy = PyFloat_AS_DOUBLE(amount);
        Py_DECREF(amount);
        PyErr_Clear();
    }
    ix *= 0.5;
    iy *= 0.5;
    bbox = (PlanarBBoxObject *)PlanarBBoxType.tp_alloc(&PlanarBBoxType, 0);
    if (bbox == NULL) {
        return NULL;
    }
    bbox->min.x = self->min.x - ix;
    bbox->min.y = self->min.y - iy;
    bbox->max.x = self->max.x + ix;
    bbox->max.y = self->max.y + iy;
    return bbox;
}

static PyObject *
BBox_contains_point(PlanarBBoxObject *self, PyObject *other)
{
    double px, py;
    int contains;
    PyObject *r = NULL;

    assert(PlanarBBox_Check(self));
    if (PlanarVec2_Parse(other, &px, &py)) {
        contains = (px >= self->min.x && px < self->max.x
            && py > self->min.y && py <= self->max.y);
		r = contains ? Py_True : Py_False;
		Py_INCREF(r);
	}
    return r;
}

static PyObject *
BBox_fit(PlanarBBoxObject *self, PyObject *shape)
{
    double w_ratio, h_ratio, scale, half_width, half_height;
    double ox, oy, cx, cy;
    PlanarBBoxObject *bbox;
    PlanarAffineObject *xform;

    assert(PlanarBBox_Check(self));
    cx = (self->max.x + self->min.x) * 0.5;
    cy = (self->max.y + self->min.y) * 0.5;
    if (PlanarBBox_Check(shape)) {
        bbox = (PlanarBBoxObject *)shape;
        w_ratio = (self->max.x - self->min.x) / (bbox->max.x - bbox->min.x);
        h_ratio = (self->max.y - self->min.y) / (bbox->max.y - bbox->min.y);
        scale = (w_ratio < h_ratio ? w_ratio : h_ratio) * 0.5;
        half_width = (bbox->max.x - bbox->min.x) * scale;
        half_height = (bbox->max.y - bbox->min.y) * scale;
        bbox = (PlanarBBoxObject *)PlanarBBoxType.tp_alloc(
            &PlanarBBoxType, 0);
        if (bbox != NULL) {
            bbox->min.x = cx - half_width;
            bbox->max.x = cx + half_width;
            bbox->min.y = cy - half_height;
            bbox->max.y = cy + half_height;
        }
        return (PyObject *)bbox;
    } else {
        bbox = get_bounding_box(shape);
        if (bbox == NULL) {
            return NULL;
        }
        ox = cx - (bbox->max.x + bbox->min.x) * 0.5;
        oy = cy - (bbox->max.y + bbox->min.y) * 0.5;
        w_ratio = (self->max.x - self->min.x) / (bbox->max.x - bbox->min.x);
        h_ratio = (self->max.y - self->min.y) / (bbox->max.y - bbox->min.y);
        scale = w_ratio < h_ratio ? w_ratio : h_ratio;
        Py_DECREF(bbox);
        xform = PlanarAffine_FromDoubles(
            scale,   0.0,  ox, 
              0.0, scale,  oy);
        if (xform == NULL) {
            return NULL;
        }
        shape = PyNumber_Multiply(shape, (PyObject *)xform);
        Py_DECREF(xform);
        return shape;
    }
}

static PlanarPolygonObject *
BBox_to_polygon(PlanarBBoxObject *self)
{
	PlanarPolygonObject *poly;

    assert(PlanarBBox_Check(self));
	poly = Poly_new(&PlanarPolygonType, 4);
	if (poly != NULL) {
		poly->vert[0].x = self->min.x;
		poly->vert[0].y = self->min.y;
		poly->vert[1].x = self->min.x;
		poly->vert[1].y = self->max.y;
		poly->vert[2].x = self->max.x;
		poly->vert[2].y = self->max.y;
		poly->vert[3].x = self->max.x;
		poly->vert[3].y = self->min.y;
		poly->flags = POLY_SIMPLE_KNOWN_FLAG | POLY_SIMPLE_FLAG	
			| POLY_CONVEX_KNOWN_FLAG | POLY_CONVEX_FLAG;
	}
	return poly;
}

static PyMethodDef BBox_methods[] = {
    {"from_points", (PyCFunction)BBox_new_from_points, METH_CLASS | METH_O, 
        "Create a bounding box that encloses all of the specified points."},
    {"from_shapes", (PyCFunction)BBox_new_from_shapes, METH_CLASS | METH_O, 
        "Creating a bounding box that completely encloses all of the "
        "shapes provided."},
    {"from_center", (PyCFunction)BBox_new_from_center, 
        METH_CLASS | METH_VARARGS | METH_KEYWORDS, 
        "Create a bounding box centered at a particular point."},
    {"inflate", (PyCFunction)BBox_inflate, METH_O, 
		"Return a new box resized from this one. The new "
        "box has its size changed by the specified amount, "
        "but remains centered on the same point."},
    {"contains_point", (PyCFunction)BBox_contains_point, METH_O, 
        "Return True if the box contains the specified point."},
    {"fit", (PyCFunction)BBox_fit, METH_O, 
        "Create a new shape by translating and scaling shape so that "
        "it fits in this bounding box. The shape is scaled evenly so that "
        "it retains the same aspect ratio."},
    {"to_polygon", (PyCFunction)BBox_to_polygon, METH_NOARGS, 
		"Return a rectangular Polygon object with the same "
        "vertices as the bounding box."},
    {"almost_equals", (PyCFunction)BBox_almost_equals, METH_O,
        "Return True if this bounding box is approximately equal to "
        "another box, within precision limits."},
    {NULL, NULL}
};

/* Arithmetic Operations */

static PyObject *
BBox__mul__(PyObject *a, PyObject *b)
{
    PlanarBBoxObject *box;
    PlanarAffineObject *t;
	PyObject *p, *p_xform;
	int rectilinear;
    double ta, tb, tc, td, te, tf;
	planar_vec2_t p0, p1;

    if (PlanarBBox_Check(a) && PlanarAffine_Check(b)) {
		box = (PlanarBBoxObject *)a;
		t = (PlanarAffineObject *)b;
    } else if (PlanarBBox_Check(b) && PlanarAffine_Check(a)) {
		box = (PlanarBBoxObject *)b;
		t = (PlanarAffineObject *)a;
    } else {
		/* We support only transform operations */
		Py_INCREF(Py_NotImplemented);
		return Py_NotImplemented;
    }
    ta = t->a;
    tb = t->b;
    tc = t->c;
    td = t->d;
    te = t->e;
    tf = t->f;

	rectilinear = ((almost_eq(ta, 0.0) && almost_eq(te, 0.0))
        || (almost_eq(td, 0.0) && almost_eq(tb, 0.0)));
	if (rectilinear) {
		p0.x = box->min.x*ta + box->min.y*td + tc;
		p0.y = box->min.x*tb + box->min.y*te + tf;
		p1.x = box->max.x*ta + box->max.y*td + tc;
		p1.y = box->max.x*tb + box->max.y*te + tf;
		box = (PlanarBBoxObject *)BBox_alloc(Py_TYPE(box), 0);
		if (box != NULL) {
			box->min.x = MIN(p0.x, p1.x);
			box->min.y = MIN(p0.y, p1.y);
			box->max.x = MAX(p0.x, p1.x);
			box->max.y = MAX(p0.y, p1.y);
		}
		return (PyObject *)box;
	} else {
		p = (PyObject *)BBox_to_polygon(box);
		if (p == NULL) {
			return NULL;
		}
		p_xform = PyNumber_InPlaceMultiply(p, (PyObject *)t);
		Py_DECREF(p);
		return p_xform;
	}
}

static PyNumberMethods BBox_as_number = {
    0,       /* binaryfunc nb_add */
    0,       /* binaryfunc nb_subtract */
    (binaryfunc)BBox__mul__,       /* binaryfunc nb_multiply */
};

PyDoc_STRVAR(BBox_doc, 
    "An axis-aligned immutable rectangular shape.\n\n"
    "BoundingBox(points)"
);

PyTypeObject PlanarBBoxType = {
    PyVarObject_HEAD_INIT(NULL, 0)
    "planar.BoundingBox",     /* tp_name */
    sizeof(PlanarBBoxObject), /* tp_basicsize */
    0,                    /* tp_itemsize */
    (destructor)BBox_dealloc, /* tp_dealloc */
    0,                    /* tp_print */
    0,                    /* tp_getattr */
    0,                    /* tp_setattr */
    0,                    /* reserved */
    (reprfunc)BBox_repr,  /* tp_repr */
    &BBox_as_number,      /* tp_as_number */
    0,                    /* tp_as_sequence */
    0,                    /* tp_as_mapping */
    0,                    /* tp_hash */
    0,                    /* tp_call */
    (reprfunc)BBox_repr,  /* tp_str */
    0,                    /* tp_getattro */
    0,                    /* tp_setattro */
    0,                    /* tp_as_buffer */
    Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_CHECKTYPES,   /* tp_flags */
    BBox_doc,             /* tp_doc */
    0,                    /* tp_traverse */
    0,                    /* tp_clear */
    BBox_compare,         /* tp_richcompare */
    0,                    /* tp_weaklistoffset */
    0,                    /* tp_iter */
    0,                    /* tp_iternext */
    BBox_methods,         /* tp_methods */
    0,                    /* tp_members */
    BBox_getset,          /* tp_getset */
    0,                    /* tp_base */
    0,                    /* tp_dict */
    0,                    /* tp_descr_get */
    0,                    /* tp_descr_set */
    0,                    /* tp_dictoffset */
    (initproc)BBox_init,  /* tp_init */
    BBox_alloc,           /* tp_alloc */
    0,                    /* tp_new */
    0,                    /* tp_free */
};

