#############################################################################
#
# Copyright (c) 2010 by Casey Duncan and contributors
# All Rights Reserved.
#
# This software is subject to the provisions of the BSD License
# A copy of the license should accompany this distribution.
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
#
#############################################################################

import math

# Define assert_unorderable() depending on the language 
# implicit ordering rules. This keeps things consistent
# across major Python versions
try:
    3 > ""
except TypeError: # pragma: no cover
    # No implicit ordering (newer Python)
    def assert_unorderable(a, b):
        """Assert that a and b are unorderable"""
        return NotImplemented
else: # pragma: no cover
    # Implicit ordering by default (older Python)
    # We must raise an exception ourselves
    # To prevent nonsensical ordering
    def assert_unorderable(a, b):
        """Assert that a and b are unorderable"""
        raise TypeError("unorderable types: %s and %s"
            % (type(a).__name__, type(b).__name__))

def cached_property(func):
    """Special property decorator that caches the computed 
    property value in the object's instance dict the first 
    time it is accessed.
    """

    def getter(self, name=func.func_name):
        try:
            return self.__dict__[name]
        except KeyError:
            self.__dict__[name] = value = func(self)
            return value
    
    getter.func_name = func.func_name
    return property(getter, doc=func.func_doc)

def cos_sin_deg(deg):
    """Return the cosine and sin for the given angle
    in degrees, with special-case handling of multiples
    of 90 for perfect right angles
    """
    deg = deg % 360.0
    if deg == 90.0:
        return 0.0, 1.0
    elif deg == 180.0:
        return -1.0, 0
    elif deg == 270.0:
        return 0, -1.0
    rad = math.radians(deg)
    return math.cos(rad), math.sin(rad)


# vim: ai ts=4 sts=4 et sw=4 tw=78

