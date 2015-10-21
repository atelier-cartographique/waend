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
#include "planar.h"

double PLANAR_EPSILON = 1e-5;
double PLANAR_EPSILON2 = 1e-5 * 1e-5;

static PyObject *
_set_epsilon_func(PyObject *self, PyObject *epsilon)
{
    epsilon = PyObject_ToFloat(epsilon);
    if (epsilon == NULL) {
        return NULL;
    }

    PLANAR_EPSILON = PyFloat_AS_DOUBLE(epsilon);
    PLANAR_EPSILON2 = PLANAR_EPSILON * PLANAR_EPSILON;
    Py_DECREF(epsilon);
    Py_INCREF(Py_None);
    return Py_None;
}

PyObject *PlanarTransformNotInvertibleError;

static PyMethodDef module_functions[] = {
    {"_set_epsilon", (PyCFunction) _set_epsilon_func, METH_O,
     "PRIVATE: Set epsilon value used by C extension"},
    {NULL}
};

PyDoc_STRVAR(module_doc, "Planar native code classes");

#define INIT_TYPE(type, name) {                                         \
    if ((type).tp_new == 0) {                                           \
		(type).tp_new = PyType_GenericNew;                              \
    }                                                                   \
    if (PyType_Ready(&(type)) < 0) {                                    \
        goto fail;                                                      \
    }                                                                   \
    if (PyModule_AddObject(module, (name), (PyObject *)&(type)) < 0) {  \
        goto fail;                                                      \
    }                                                                   \
}

#if PY_MAJOR_VERSION >= 3

static struct PyModuleDef moduledef = {
        PyModuleDef_HEAD_INIT,
        "cvector",
        module_doc,
        -1,                 /* m_size */
        module_functions,   /* m_methods */
        NULL,               /* m_reload (unused) */
        NULL,               /* m_traverse */
        NULL,               /* m_clear */
        NULL                /* m_free */
};

#define INITERROR return NULL

PyObject *
PyInit_c(void)

#else
#define INITERROR return

void
initc(void)
#endif
{
#if PY_MAJOR_VERSION >= 3
    PyObject *module = PyModule_Create(&moduledef);
#else
    PyObject *module = Py_InitModule3("c", module_functions, module_doc);
#endif
    Py_INCREF((PyObject *)&PlanarVec2Type);
    Py_INCREF((PyObject *)&PlanarSeq2Type);
    Py_INCREF((PyObject *)&PlanarVec2ArrayType);
    Py_INCREF((PyObject *)&PlanarAffineType);
    Py_INCREF((PyObject *)&PlanarBBoxType);
    Py_INCREF((PyObject *)&PlanarLineType);
    Py_INCREF((PyObject *)&PlanarRayType);
    Py_INCREF((PyObject *)&PlanarSegmentType);
    Py_INCREF((PyObject *)&PlanarPolygonType);

    INIT_TYPE(PlanarVec2Type, "Vec2");
    INIT_TYPE(PlanarSeq2Type, "Seq2");
    INIT_TYPE(PlanarVec2ArrayType, "Vec2Array");
	/* Override inheritance of tp_itemsize, ugly */
	PlanarVec2ArrayType.tp_itemsize = 0;
    INIT_TYPE(PlanarAffineType, "Affine");
    INIT_TYPE(PlanarBBoxType, "BoundingBox");
    INIT_TYPE(PlanarLineType, "Line");
    INIT_TYPE(PlanarRayType, "Ray");
    INIT_TYPE(PlanarSegmentType, "LineSegment");
    INIT_TYPE(PlanarPolygonType, "Polygon");

	PlanarTransformNotInvertibleError = PyErr_NewException(
		"planar.TransformNotInvertibleError", NULL, NULL);
	if (PlanarTransformNotInvertibleError == NULL) {
		goto fail;
	}
    if (PyModule_AddObject(
        module, "TransformNotInvertibleError", 
		PlanarTransformNotInvertibleError) < 0) {
        Py_DECREF(PlanarTransformNotInvertibleError);
        goto fail;
    }
#if PY_MAJOR_VERSION >= 3
    return module;
#else
    return;
#endif
fail:
    Py_DECREF((PyObject *)&PlanarVec2Type);
    Py_DECREF((PyObject *)&PlanarSeq2Type);
    Py_DECREF((PyObject *)&PlanarVec2ArrayType);
    Py_DECREF((PyObject *)&PlanarAffineType);
    Py_DECREF((PyObject *)&PlanarBBoxType);
    Py_DECREF((PyObject *)&PlanarLineType);
    Py_DECREF((PyObject *)&PlanarRayType);
    Py_DECREF((PyObject *)&PlanarSegmentType);
    Py_DECREF((PyObject *)&PlanarPolygonType);
    Py_DECREF(module);
    INITERROR;
}

