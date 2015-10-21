#############################################################################
# Copyright (c) 2010 by Casey Duncan
# Portions copyright (c) 2009 The Super Effective Team 
#                             (www.supereffective.org)
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# * Redistributions of source code must retain the above copyright notice, 
#   this list of conditions and the following disclaimer.
# * Redistributions in binary form must reproduce the above copyright notice,
#   this list of conditions and the following disclaimer in the documentation
#   and/or other materials provided with the distribution.
# * Neither the name(s) of the copyright holders nor the names of its
#   contributors may be used to endorse or promote products derived from this
#   software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AS IS AND ANY EXPRESS OR
# IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
# MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
# EVENT SHALL THE COPYRIGHT HOLDERS BE LIABLE FOR ANY DIRECT, INDIRECT,
# INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, 
# OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
# LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
# NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
# EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
#############################################################################

from __future__ import division

import math
import planar
from planar.util import cached_property, assert_unorderable, cos_sin_deg


class Vec2(tuple):
    """Two dimensional immutable vector.
    
    :param x: x coordinate.
    :type x: float
    :param y: y coordinate.
    :type y: float
    """

    def __new__(self, x, y):
        return tuple.__new__(Vec2, ((x * 1.0, y * 1.0)))

    @classmethod
    def polar(cls, angle, length=1.0):
        """Create a vector from polar coordinates.

        :param angle: Vector angle in degrees from the positive x-axis.
        :type angle: float
        :param length: The length of the vector.
        :type length: float
        :rtype: Vec2
        """
        x, y = cos_sin_deg(angle)
        vec = tuple.__new__(cls, (x * length, y * length))
        vec.__dict__['length'] = length * 1.0
        return vec

    def __str__(self):
        """Concise string representation."""
        return "Vec2(%.2f, %.2f)" % self

    def __repr__(self):
        """Precise string representation."""
        return "Vec2(%r, %r)" % self

    @property
    def x(self):
        """The horizontal coordinate."""
        return self[0]

    @property
    def y(self):
        """The vertical coordinate."""
        return self[1]

    @cached_property
    def length(self):
        """The length or scalar magnitude of the vector."""
        return self.length2 ** 0.5

    @cached_property
    def length2(self):
        """The square of the length of the vector."""
        x, y = self
        return x*x + y*y

    @cached_property
    def is_null(self):
        """Flag indicating if the vector is effectively zero-length.
        
        :return: True if the vector length < EPSILON.
        """
        return self.length2 < planar.EPSILON2

    def __nonzero__(self):
        """A vector is True if it is not the null vector."""
        return self[0] != 0.0 or self[1] != 0.0

    def almost_equals(self, other):
        """Compare vectors for approximate equality.

        :param other: Vector being compared.
        :type other: Vec2
        :return: True if distance between the vectors < ``EPSILON``.
        """
        ox, oy = other
        dx = self[0] - ox
        dy = self[1] - oy
        return (dx*dx + dy*dy) < planar.EPSILON2

    def normalized(self):
        """Return the vector scaled to unit length. If the vector
        is null, the null vector is returned.
        
        :rtype: Vec2
        """
        L = self.length
        if L > planar.EPSILON:
            v = tuple.__new__(Vec2, (self[0] / L, self[1] / L))
            v.__dict__['length'] = v.__dict__['length2'] = 1.0
            return v
        else:
            return null

    def perpendicular(self):
        """Compute the perpendicular vector.
        
        :rtype: Vec2
        """
        return tuple.__new__(Vec2, (-self[1], self[0]))

    def dot(self, other):
        """Compute the dot product with another vector.

        :param other: The vector with which to compute the dot product.
        :type other: Vec2
        :rtype: float
        """
        ox, oy = other
        return self[0] * ox + self[1] * oy

    def cross(self, other):
        """Compute the cross product with another vector.

        :param other: The vector with which to compute the cross product.
        :type other: Vec2
        :return: The length of the cross-product vector
        :rtype: float
        """
        ox, oy = other
        return self[0] * oy - self[1] * ox

    @cached_property
    def angle(self):
        """The angle the vector makes to the positive x axis in the range
        ``(-180, 180]``.
        """
        return math.degrees(math.atan2(self[1], self[0]))

    def angle_to(self, other):
        """Compute the smallest angle from this vector to another.

        :param other: Vector to compute the angle to.
        :type other: Vec2
        :return: Angle in degrees in the range ``(-180, 180]``.
        :rtype: float
        """
        return other.angle - self.angle

    def distance_to(self, other):
        """Compute the distance to another point vector.

        :param other: The point vector to which to compute the distance.
        :type other: Vec2
        :rtype: float
        """
        ox, oy = other
        return math.hypot(self[0] - ox, self[1] - oy)

    def rotated(self, angle):
        """Compute the vector rotated by an angle.

        :param angle: The angle to rotate by, in degrees.
        :type angle: float
        :rtype: Vec2
        """
        vx, vy = self
        ca, sa = cos_sin_deg(angle)
        return tuple.__new__(Vec2, (vx * ca - vy * sa, vx * sa + vy * ca))

    def scaled_to(self, length):
        """Compute the vector scaled to a given length. If the
        vector is null, the null vector is returned.

        :param length: The length of the vector returned, unless
            the vector is null.
        :type length: float
        :rtype: Vec2
        """
        L = self.length
        if L > planar.EPSILON:
            vx, vy = self
            s = length / L
            v = tuple.__new__(Vec2, (vx * s, vy * s))
            v.__dict__['length'] = length
            return v
        else:
            return null

    def project(self, other):
        """Compute the projection of another vector onto this one.

        :param other: The vector to project.
        :type other: Vec2
        :rtype: Vec2
        """
        L = self.length2
        if L > planar.EPSILON2:
            s = self.dot(other) / L
            return tuple.__new__(Vec2, (self[0] * s, self[1] * s))
        else:
            return null

    def reflect(self, other):
        """Compute the reflection of this vector against another.

        :param other: The vector to reflect against.
        :type other: Vec2
        :rtype: Vec2
        """
        x1, y1 = self
        x2, y2 = other
        L = (x2 * x2 + y2 * y2)
        if L > planar.EPSILON2:
            temp = 2 * (x1 * x2 + y1 * y2) / L
            return tuple.__new__(Vec2, (x2 * temp - x1, y2 * temp - y1))
        else:
            return null

    def clamped(self, min_length=None, max_length=None):
        """Compute a vector in the same direction with a bounded
        length. If ``min_length`` <= ``self.length`` <= ``max_length``
        then the original vector is returned.

        :param min_length: Minimum length of computed vector. Note if 
            the input vector is null, the null vector is always returned.
        :type min_length: float
        :param max_length: Maximum length of computed vector. Must
            be >= ``min_length``.
        :type max_length: float
        :rtype: Vec2
        """
        if (min_length is not None and max_length is not None 
            and min_length > max_length):
            raise ValueError(
                "Vec2.clamped: expected min_length <= max_length")
        L2 = self.length2
        if min_length is not None and L2 < min_length**2:
            return self.scaled_to(min_length)
        if max_length is not None and L2 > max_length**2:
            return self.scaled_to(max_length)
        return self

    def lerp(self, other, bias):
        """Compute a vector by linear interpolation between
        this vector and another.

        :param other: The vector to interpolate to. its value
            is returned when ``bias == 1.0``.
        :type other: Vec2
        :param bias: Interpolation value when in the range [0, 1]. Becomes 
            an extrapolation value outside this range.
        :type bias: float
        :rtype: Vec2
        """
        ox, oy = other
        b1 = 1.0 - bias
        return tuple.__new__(Vec2,
            (self[0] * b1 + ox * bias, self[1] * b1 + oy * bias))

    def __eq__(self, other):
        try:
            return (self[0] == other[0] and self[1] == other[1] 
                and len(other) == 2)
        except (TypeError, IndexError):
            return False

    def __ne__(self, other):
        try:
            return (self[0] != other[0] or self[1] != other[1]
                or len(other) != 2)
        except (TypeError, IndexError):
            return True

    def __gt__(self, other):
        """Compare vector length, longer vectors are "greater than"
        shorter vectors.
        """
        try:
            return self.length2 > other.length2
        except AttributeError:
            return assert_unorderable(self, other)

    def __ge__(self, other):
        """Compare vector length, longer vectors are "greater than"
        shorter vectors.
        """
        try:
            return self.length2 >= other.length2
        except AttributeError:
            return assert_unorderable(self, other)

    def __lt__(self, other):
        """Compare vector length, shorter vectors are "less than"
        longer vectors.
        """
        try:
            return self.length2 < other.length2
        except AttributeError:
            return assert_unorderable(self, other)

    def __le__(self, other):
        """Compare vector length, shorter vectors are "less than"
        longer vectors.
        """
        try:
            return self.length2 <= other.length2
        except AttributeError:
            return assert_unorderable(self, other)

    def __add__(self, other):
        """Add the vectors componentwise.

        :param other: The vector to add.
        :type other: Vec2
        """
        try:
            ox, oy = other
        except Exception:
            return NotImplemented
        return tuple.__new__(Vec2, (self[0] + ox, self[1] + oy))

    __iadd__ = __add__

    def __sub__(self, other):
        """Subtract the vectors componentwise.

        :param other: The vector to substract.
        :type other: Vec2
        """
        try:
            ox, oy = other
        except Exception:
            return NotImplemented
        return tuple.__new__(Vec2, (self[0] - ox, self[1] - oy))

    __isub__ = __sub__

    def __mul__(self, other):
        """Either multiply the vector by a scalar or componentwise
        with another vector.

        :param other: The object to multiply by.
        :type other: Vec2 or float
        """
        try:
            other = float(other)
            return tuple.__new__(Vec2, (self[0] * other, self[1] * other))
        except TypeError:
            try:
                ox, oy = other
            except Exception:
                return NotImplemented
            return tuple.__new__(Vec2, (self[0] * ox, self[1] * oy))
    
    __rmul__ = __imul__ = __mul__

    def __truediv__(self, other):
        """Divide the vector by a scalar or componentwise
        by another vector.

        :param other: The value to divide by.
        :type other: Vec2 or float
        """
        try:
            other = float(other)
            return tuple.__new__(Vec2, (self[0] / other, self[1] / other))
        except TypeError:
            try:
                ox, oy = other
            except Exception:
                return NotImplemented
            return tuple.__new__(Vec2, (self[0] / ox, self[1] / oy))

    __itruediv__ = __truediv__

    def __rtruediv__(self, other):
        """Divide a scalar or vector by this vector componentwise.

        :param other: The value to divide into.
        :type other: Vec2 or float
        """
        try:
            other = float(other)
            return tuple.__new__(Vec2, (other / self[0], other / self[1]))
        except TypeError:
            try:
                ox, oy = other
            except Exception:
                return NotImplemented
            return tuple.__new__(Vec2, (ox / self[0], oy / self[1]))

    def __floordiv__(self, other):
        """Divide the vector by a scalar or componentwise by
        another vector, rounding down.

        :param other: The value to divide by.
        :type other: Vec2 or float
        """
        try:
            other = float(other)
            return tuple.__new__(Vec2, (self[0] // other, self[1] // other))
        except TypeError:
            try:
                ox, oy = other
            except Exception:
                return NotImplemented
            return tuple.__new__(Vec2, (self[0] // ox, self[1] // oy))

    __ifloordiv__ = __floordiv__

    def __rfloordiv__(self, other):
        """Divide a scalar or vector by this vector componentwise,
        rounding down.

        :param other: The value to divide into.
        :type other: Vec2 or float
        """
        try:
            other = float(other)
            return tuple.__new__(Vec2, (other // self[0], other // self[1]))
        except TypeError:
            try:
                ox, oy = other
            except Exception:
                return NotImplemented
            return tuple.__new__(Vec2, (ox // self[0], oy // self[1]))

    def __pos__(self):
        return self

    def __neg__(self):
        """Compute the unary negation of the vector."""
        return tuple.__new__(Vec2, (-self[0], -self[1]))
    
    def __abs__(self):
        """Compute the absolute magnitude of the vector."""
        return self.length

    __hash__ = tuple.__hash__ # hash is not inherited in Py 3


null = Vec2(0, 0)


class Seq2(object):
    """Fixed length 2D point/vector sequence
    
    :param vectors: A sequence of :class:`~planar.Vec2` objects.
    """

    def __init__(self, vectors):
        self._vectors = [Vec2(*v) for v in vectors]

    @classmethod
    def from_points(cls, points):
        """Create a new 2D sequence from an iterable of points"""
        self = cls.__new__(cls)
        self._vectors = list(points)
        return self

    def __len__(self):
        return len(self._vectors)

    def __getitem__(self, index):
        return self._vectors[index]

    def __setitem__(self, index, value):
        self._vectors[index] = Vec2(*value)

    def __iter__(self):
        return iter(self._vectors)

    def __imul__(self, other):
        try:
           other.itransform(self)
           return self
        except AttributeError:
            raise TypeError("Cannot multiply %s with %s"
                % (type(self).__name__, type(other).__name__))

    def almost_equals(self, other):
        """Compare for approximate equality."""
        if self.__class__ is other.__class__ and len(self) == len(other):
            for a, b in zip(self, other):
                if not a.almost_equals(b):
                    return False
            return True
        else:
            return False

    def __eq__(self, other):
        return (self.__class__ is other.__class__ 
            and tuple(self) == tuple(other))

    def __ne__(self, other):
        return (self.__class__ is not other.__class__ 
            or tuple(self) != tuple(other))

    def __copy__(self, memo=None):
        return self.from_points(self._vectors)

    __deepcopy__ = __copy__

    def __nonzero__(self):
        return bool(self._vectors)

    def __hash__(self):
        raise TypeError("unhashable type: %s" % self.__class__.__name__)


class Vec2Array(Seq2):
    """Sequence of 2D vectors for batch operations"""

    def __init__(self, vectors=()):
        super(Vec2Array, self).__init__(vectors)

    def __getitem__(self, index):
        if isinstance(index, slice):
            return self.from_points(self._vectors[index])
        else:
            return self._vectors[index]

    def __setitem__(self, index, value):
        if isinstance(index, slice):
            self._vectors[index] = [Vec2(*i) for i in value]
        else:
            self._vectors[index] = Vec2(*value)

    def append(self, vector):
        """Append a vector to the end of the array.
        
        :param vector: Vector to append.
        :type vector: Vec2 or 2-number sequence.
        """
        self._vectors.append(Vec2(*vector))

    def extend(self, iterable):
        """Append all vectors in iterable to the end of the array.
        
        :param iterable: Iterable object containing vectors.
        """
        self._vectors.extend(Vec2(*vector) for vector in iterable)

    def insert(self, index, vector):
        """Insert a vector at the specified index.
        
        :param index: Position before-which the vector is inserted.
        :type index: int
        :param vector: Vector to insert.
        :type vector: Vec2 or 2-number sequence.
        """
        self._vectors.insert(index, Vec2(*vector))

    def __delitem__(self, index):
        del self._vectors[index]
    
    def longest(self):
        """Return the vector in the array with the maximum length."""
        longest = None
        max_len = 0
        for vector in self._vectors:
            len = vector.length2
            if len > max_len:
                longest = vector
                max_len = len
        return longest
    
    def shortest(self):
        """Return the vector in the array with the minimum length."""
        shortest = None
        if self._vectors:
            shortest = self._vectors[0]
            min_len = shortest.length2
            for vector in self._vectors:
                len = vector.length2
                if len < min_len:
                    shortest = vector
                    min_len = len
        return shortest

    def normalized(self):
        """Create a new array containing normalized vectors calculated
        from this array.

        :rtype: Vec2Array
        """
        return self.from_points(
            vector.normalized() for vector in self._vectors)

    def normalize(self):
        """Normalize the vectors in the array in place."""
        self._vectors = [vector.normalized() for vector in self._vectors]

    def clamped(self, min_length=None, max_length=None):
        """Create a new array of vectors with lengths clamped between
        ``min_length`` and ``max_length``.

        :param min_length: Minimum length of computed vectors.
        :type min_length: float
        :param max_length: Maximum length of computed vectors. Must
            be >= ``min_length``.
        :type max_length: float
        :rtype: Vec2Array
        """
        if min_length is not None and min_length < 0.0:
            raise ValueError(
                "Vec2Array.clamped: expected min_length >= 0")
        return self.from_points(
            vector.clamped(min_length, max_length) 
            for vector in self._vectors)

    def clamp(self, min_length=None, max_length=None):
        """Clamp the length of the vectors in this array in place between
        ``min_length`` and ``max_length``.

        :param min_length: Minimum length of computed vectors.
        :type min_length: float
        :param max_length: Maximum length of computed vectors. Must
            be >= ``min_length``.
        :type max_length: float
        """
        if min_length is not None and min_length < 0.0:
            raise ValueError(
                "Vec2Array.clamp: expected min_length >= 0")
        self._vectors = [vector.clamped(min_length, max_length) 
            for vector in self._vectors]

    def __add__(self, other):
        """Add this array to another vector sequence, or a single vector. When
        a single vector is added to an array, the vector is added to each
        element of the array. When an array is added to a sequence, each
        vector element from self is added to other. The result will have the
        same type as other. Note that self and other must have the same length.
        
        :type other: Seq2 or Vec2
        :rtype: Seq2 (same type as other)
        """
        if isinstance(other, Seq2):
            if len(self) == len(other):
                return other.from_points(
                    a + b for a, b in zip(self, other))
            else:
                raise ValueError("cannot add arrays with different lengths")
        else:
            try:
                b = Vec2(*other)
            except Exception:
                return NotImplemented
            return self.from_points(a + b for a in self)

    __radd__ = __add__

    def __iadd__(self, other):
        """Add a vector or another vector sequence to this vector array
        in place.
        """
        if isinstance(other, Seq2):
            if len(self) == len(other):
                self._vectors = [a + b for a, b in zip(self, other)]
                return self
            else:
                raise ValueError("cannot add arrays with different lengths")
        else:
            try:
                b = Vec2(*other)
            except Exception:
                return NotImplemented
            self._vectors = [a + b for a in self]
            return self

    def __sub__(self, other):
        """Subtract either another array or a vector from this array.
        
        :type other: Vec2Array or Vec2
        :rtype: Vec2Array
        """
        if isinstance(other, Vec2Array):
            if len(self) == len(other):
                return self.from_points(
                    a - b for a, b in zip(self, other))
            else:
                raise ValueError(
                    "cannot subtract arrays with different lengths")
        else:
            try:
                b = Vec2(*other)
            except Exception:
                return NotImplemented
            return self.from_points(a - b for a in self)

    def __rsub__(self, other):
        """Subtract this array from another vector sequence.
        
        :type other: Seq2
        :rtype: same type as other
        """
        if isinstance(other, Seq2):
            if len(self) == len(other):
                return other.from_points(
                    b - a for a, b in zip(self, other))
            else:
                raise ValueError(
                    "cannot subtract arrays with different lengths")
        return NotImplemented

    def __isub__(self, other):
        """Subtract a vector or another vector array from this array
        in place.
        """
        if isinstance(other, Vec2Array):
            if len(self) == len(other):
                self._vectors = [a - b for a, b in zip(self, other)]
                return self
            else:
                raise ValueError(
                    "cannot subtract arrays with different lengths")
        else:
            try:
                b = Vec2(*other)
            except Exception:
                return NotImplemented
            self._vectors = [a - b for a in self]
            return self

    def __mul__(self, other):
        """Multiply this array with another vector sequence, a single vector,
        or a scalar value.  When a scalar, or single vector value is
        multiplied with an array, the value is multiplied with each element of
        the array. When an array is multiplied to a sequence, each vector
        element from self is multiplied by other. The result will have the
        same type as other. Note that self and other must have the same length
        
        :type other: Seq2 or Vec2
        :rtype: same type as other
        """
        if isinstance(other, Seq2):
            if len(self) == len(other):
                return other.from_points(
                    a * b for a, b in zip(self, other))
            else:
                raise ValueError(
                    "cannot multiply arrays with different lengths")
        else:
            try:
                b = float(other)
            except TypeError:
                try:
                    b = Vec2(*other)
                except Exception:
                    return NotImplemented
            return self.from_points(a * b for a in self)

    __rmul__ = __mul__

    def __imul__(self, other):
        """Multiply this vector array in place by another array, a single 
        vector, a scalar value, or a transform.
        """
        if hasattr(other, 'itransform'):
            # Transform in place
            other.itransform(self)
        elif isinstance(other, Vec2Array):
            if len(self) == len(other):
                self._vectors = [a * b for a, b in zip(self, other)]
            else:
                raise ValueError(
                    "cannot multiply arrays with different lengths")
        else:
            try:
                b = float(other)
            except TypeError:
                try:
                    b = Vec2(*other)
                except Exception:
                    raise TypeError("Cannot multiply %s with %s"
                        % (type(self).__name__, type(other).__name__))
            self._vectors = [a * b for a in self]
        return self

    def __truediv__(self, other):
        """Divide this array either by another array, a single vector,
        or a scalar.
        
        :type other: Vec2Array or Vec2
        :rtype: Vec2Array
        """
        if isinstance(other, Vec2Array):
            if len(self) == len(other):
                return self.from_points(
                    a / b for a, b in zip(self, other))
            else:
                raise ValueError(
                    "cannot divide arrays with different lengths")
        else:
            try:
                b = float(other)
            except TypeError:
                try:
                    b = Vec2(*other)
                except Exception:
                    return NotImplemented
            return self.from_points(a / b for a in self)

    def __rtruediv__(self, other):
        """Divide another vector sequence by this vector array.
        
        :type other: Seq2
        :rtype: same type as other
        """
        if isinstance(other, Seq2):
            if len(self) == len(other):
                return other.from_points(
                    b / a for a, b in zip(self, other))
            else:
                raise ValueError("cannot divide arrays with different lengths")
        return NotImplemented

    def __itruediv__(self, other):
        """Divide this array either by another array, a single vector,
        or a scalar in place.
        """
        if isinstance(other, Vec2Array):
            if len(self) == len(other):
                self._vectors = [a / b for a, b in zip(self, other)]
                return self
            else:
                raise ValueError(
                    "cannot divide arrays with different lengths")
        else:
            try:
                b = float(other)
            except TypeError:
                try:
                    b = Vec2(*other)
                except Exception:
                    return NotImplemented
            self._vectors = [a / b for a in self]
            return self

    def __floordiv__(self, other):
        """Divide this array either by another array, a single vector,
        or a scalar, rounding down.
        
        :type other: Vec2Array or Vec2
        :rtype: Vec2Array
        """
        if isinstance(other, Vec2Array):
            if len(self) == len(other):
                return self.from_points(
                    a // b for a, b in zip(self, other))
            else:
                raise ValueError(
                    "cannot divide arrays with different lengths")
        else:
            try:
                b = float(other)
            except TypeError:
                try:
                    b = Vec2(*other)
                except Exception:
                    return NotImplemented
            return self.from_points(a // b for a in self)

    def __rfloordiv__(self, other):
        """Divide another vector sequence by this vector array, 
        rounding down.
        
        :type other: Seq2
        :rtype: same type as other
        """
        if isinstance(other, Seq2):
            if len(self) == len(other):
                return other.from_points(
                    b // a for a, b in zip(self, other))
            else:
                raise ValueError("cannot divide arrays with different lengths")
        return NotImplemented

    def __ifloordiv__(self, other):
        """Divide this vector array by a vector, scalar, or another vector
        sequence in place, rounding down.
        """
        if isinstance(other, Vec2Array):
            if len(self) == len(other):
                self._vectors = [a // b for a, b in zip(self, other)]
                return self
            else:
                raise ValueError(
                    "cannot divide arrays with different lengths")
        else:
            try:
                b = float(other)
            except TypeError:
                try:
                    b = Vec2(*other)
                except Exception:
                    return NotImplemented
            self._vectors = [a // b for a in self]
            return self

    def __pos__(self):
        return self.from_points(self._vectors)

    def __neg__(self):
        """Create an array of the negation of the vectors in this array."""
        return self.from_points(-v for v in self._vectors)

    def __repr__(self):
        return "%s([%s])" % (self.__class__.__name__,
            ', '.join("(%r, %r)" % v for v in self._vectors))

    __str__ = __repr__


# vim: ai ts=4 sts=4 et sw=4 tw=78

