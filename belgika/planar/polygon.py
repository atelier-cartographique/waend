#############################################################################
# Copyright (c) 2010 by Casey Duncan
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

import sys
import math
import itertools
import bisect
import planar
from planar.util import cached_property, assert_unorderable, cos_sin_deg

class Polygon(planar.Seq2):
    """Arbitrary polygon represented as a list of vertices. 

    The individual vertices of a polygon are mutable, but the number
    of vertices is fixed at construction.

    :param vertices: Iterable containing three or more :class:`~planar.Vec2` 
        objects.
    :param is_convex: Optionally allows the polygon to be declared convex
        or non-convex at construction time, thus saving additional time spent
        checking the vertices to calculate this property later. Only specify
        this value if you are certain of the convexity of the vertices
        provided, as no additional checking will be performed. The results are
        undefined if a non-convex polygon is declared convex or vice-versa.
        Note that triangles are always considered convex, regardless of this
        value.
    :type is_convex: bool
    :param is_simple: Optionally allows the polygon to be declared simple
        (i.e., not self-intersecting) or non-simple at construction time,
        which can save time calculating this property later. As with
        ``is_convex`` above, only specify this value if you are certain of
        this value for the vertices provided, or the results are undefined.
        Note that convex polygons are always considered simple, regardless of
        this value.
    :type is_simple: bool

    .. note::
        Several operations on polygons, such as checking for containment, or
        intersection, rely on knowing the convexity to select the appropriate
        algorithm. So, it may be beneficial to specify these values in the
        constructor, even if your application does not access the ``is_convex``,
        or ``is_simple`` properties itself later. However, be cautious when 
        specifying these values here, as incorrect values will likely
        result in incorrect results when operating on the polygon.

    .. note::
        If the polygon is mutated, the cached values of ``is_convex`` and 
        ``is_simple`` will be invalidated.
    """

    def __init__(self, vertices, is_convex=None, is_simple=None):
        #super(Polygon, self).__init__(vertices)
        if len(self) < 3:
            raise ValueError("Polygon(): minimum of 3 vertices required")
        self._clear_cached_properties()
        if is_convex is not None and self._convex is _unknown:
            self._convex = bool(is_convex)
            self._simple = self._convex or _unknown
            if self._convex and len(self) > 3:
                self._split_y_polylines()
        if is_simple is not None and self._simple is _unknown:
            self._simple = bool(is_simple)

    @classmethod
    def regular(cls, vertex_count, radius, center=(0, 0), angle=0):
        """Create a regular polygon with the specified number of vertices
        radius distance from the center point. Regular polygons are
        always convex.

        :param vertex_count: The number of vertices in the polygon.
            Must be >= 3.
        :type vertex_count: int
        :param radius: distance from vertices to center point.
        :type radius: float
        :param center: The center point of the polygon. If omitted,
            the polygon will be centered on the origin.
        :type center: Vec2
        :param angle: The starting angle for the vertices, in degrees.
        :type angle: float
        """
        cx, cy = center
        angle_step = 360.0 / vertex_count
        verts = []
        for i in range(vertex_count):
            x, y = cos_sin_deg(angle)
            verts.append((x * radius + cx, y * radius + cy))
            angle += angle_step
        poly = cls(verts, is_convex=True)
        poly._centroid = planar.Vec2(*center)
        poly._max_r = radius
        poly._max_r2 = radius * radius
        poly._min_r = min_r = ((poly[0] + poly[1]) * 0.5 - center).length
        poly._min_r2 = min_r * min_r
        poly._dupe_verts = False
        return poly

    @classmethod
    def star(cls, peak_count, radius1, radius2, center=(0, 0), angle=0):
        """Create a radial pointed star polygon with the specified number
        of peaks.

        :param peak_count: The number of peaks. The resulting polygon will
            have twice this number of vertices. Must be >= 2.
        :type peak_count: int
        :param radius1: The peak or valley vertex radius. A vertex
            is aligned on ``angle`` with this radius.
        :type radius1: float
        :param radius2: The alternating vertex radius.
        :type radius2: float
        :param center: The center point of the polygon. If omitted,
            the polygon will be centered on the origin.
        :type center: Vec2
        :param angle: The starting angle for the vertices, in degrees.
        :type angle: float
        """
        if peak_count < 2:
            raise ValueError(
                "star polygon must have a minimum of 2 peaks")
        cx, cy = center
        angle_step = 180.0 / peak_count
        verts = []
        for i in range(peak_count):
            x, y = cos_sin_deg(angle)
            verts.append((x * radius1 + cx, y * radius1 + cy))
            angle += angle_step
            x, y = cos_sin_deg(angle)
            verts.append((x * radius2 + cx, y * radius2 + cy))
            angle += angle_step
        is_simple = (radius1 > 0.0) == (radius2 > 0.0)
        poly = cls(verts, is_convex=(radius1 == radius2), 
            is_simple=is_simple or None)
        if is_simple:
            poly._centroid = planar.Vec2(*center)
        poly._max_r = max_r = max(abs(radius1), abs(radius2))
        poly._max_r2 = max_r * max_r
        if (radius1 >= 0.0) == (radius2 >= 0.0):
            if not poly.is_convex:
                poly._min_r = min_r = min(abs(radius1), abs(radius2))
                poly._min_r2 = min_r * min_r
            else:
                poly._min_r = min_r = (
                    (poly[0] + poly[1]) * 0.5 - center).length
                poly._min_r2 = min_r * min_r
        if radius1 > 0.0 and radius2 > 0.0:
            poly._dupe_verts = False
        return poly

    @classmethod
    def from_points(cls, points):
        """Create a polygon from a sequence of points"""
        poly = super(Polygon, cls).from_points(points)
        poly._clear_cached_properties()
        return poly

    def _clear_cached_properties(self):
        if len(self) > 3:
            self._convex = _unknown
            self._simple = _unknown
        else:
            self._convex = True
            self._simple = True
            if '_pnp_triangle_test' in self.__dict__:
                # clear cached closure
                del self.__dict__['_pnp_triangle_test']
        self._y_polylines = None
        self._dupe_verts = _unknown
        self._degenerate = _unknown
        self._bbox = None
        self._centroid = _unknown
        self._max_r = self._max_r2 = None
        self._min_r = self._min_r2 = None

    @property
    def bounding_box(self):
        """The bounding box of the polygon"""
        if self._bbox is None:
            self._bbox = planar.BoundingBox(self)
        return self._bbox

    @property
    def is_convex(self):
        """True if the polygon is convex.

        If this is unknown then it is calculated from the vertices
        of the polygon and cached. Runtime complexity: O(n)
        """
        if self._convex is _unknown:
            self._classify()
        return self._convex

    @property
    def is_convex_known(self):
        """True if the polygon is already known to be convex or not.

        If this value is True, then the value of ``is_convex`` is 
        cached and does not require additional calculation to access.
        Mutating the polygon will invalidate the cached value.
        """
        return self._convex is not _unknown

    def _iter_edge_vectors(self):
        """Iterate the edges of the polygon as vectors
        """
        for i in range(len(self)):
            yield self[i] - self[i - 1]

    def _classify(self):
        """Calculate the polygon convexity, winding direction,
        detecting and handling degenerate cases.

        Algorithm derived from Graphics Gems IV.
        """
        dir_changes = 0
        angle_sign = 0
        count = 0
        self._convex = True
        self._winding = 0
        last_delta = self[-1] - self[-2]
        last_dir = (
            (last_delta.x > 0) * -1 or
            (last_delta.x < 0) * 1 or
            (last_delta.y > 0) * -1 or
            (last_delta.y < 0) * 1) or 0
        for delta in itertools.ifilter(
            lambda v: v, self._iter_edge_vectors()):
            count += 1
            this_dir = (
                (delta.x > 0) * -1 or
                (delta.x < 0) * 1 or
                (delta.y > 0) * -1 or
                (delta.y < 0) * 1) or 0
            dir_changes += (this_dir == -last_dir)
            last_dir = this_dir
            cross = last_delta.cross(delta)
            if cross > 0.0: # XXX Should this be cross > planar.EPSILON?
                if angle_sign == -1:
                    self._convex = False
                    break
                angle_sign = 1
            elif cross < 0.0:
                if angle_sign == 1:
                    self._convex = False
                    break
                angle_sign = -1
            last_delta = delta
        if dir_changes <= 2:
            self._winding = angle_sign
        else:
            self._convex = False
        self._simple = self._convex or _unknown
        self._degenerate = not count or not angle_sign
        if self._convex and not self._degenerate:
            self._dupe_verts = (count < len(self))
            self._split_y_polylines()
    
    def _split_y_polylines(self):
        """Split the polygon into left and right y-monotone polylines.
        This optimizes operations on y-monotone polygons.
        """
        min_y = max_y = self[0].y
        min_x = max_x = self[0].x
        min_i = max_i = left_i = right_i = 0
        for i, vert in enumerate(self):
            if vert.y < min_y:
                min_y = vert.y
                min_i = i
            if vert.y > max_y:
                max_y = vert.y
                max_i = i
            if vert.x < min_x:
                min_x = vert.x
                left_i = i
            if vert.x > max_x:
                max_x = vert.x
                right_i = i

        verts_yx = [(y, x) for x, y in self]
        if min_i < max_i:
            pl1 = verts_yx[min_i:max_i+1]
            pl2 = verts_yx[max_i:] + verts_yx[:min_i+1]
            if min_i <= left_i < max_i or right_i < min_i or right_i > max_i:
                self._y_polylines = pl1, pl2
            else:
                self._y_polylines = pl2, pl1
        else:
            pl1 = verts_yx[max_i:min_i+1]
            pl2 = verts_yx[min_i:] + verts_yx[:max_i+1]
            if min_i >= left_i > max_i or right_i > min_i or right_i < max_i:
                self._y_polylines = pl1, pl2
            else:
                self._y_polylines = pl2, pl1
        if pl1[0][0] > pl1[-1][0]:
            pl1.reverse()
        if pl2[0][0] > pl2[-1][0]:
            pl2.reverse()

    @property
    def is_simple(self):
        """True if the polygon is simple, i.e., it has no self-intersections.

        If this is unknown then it is calculated from the vertices
        of the polygon and cached. 
        Runtime complexity: O(n) convex,
        O(n log n) expected for most non-convex cases, 
        O(n^2) worst case non-convex
        """
        if self._simple is _unknown:
            if self._convex is _unknown:
                self._classify()
            if self._simple is _unknown:
                self._check_is_simple()
        return self._simple
    
    @property
    def is_simple_known(self):
        """True if the polygon is already known to be simple or not.

        If this value is True, then the value of ``is_simple`` is 
        cached and does not require additional calculation to access.
        Mutating the polygon will invalidate the cached value.
        """
        return self._simple is not _unknown

    def _segments_intersect(self, a, b, c, d):
        """Return True if the line segment a->b intersects with
        line segment c->d
        """
        dir1 = (b[0] - a[0])*(c[1] - a[1]) - (c[0] - a[0])*(b[1] - a[1])
        dir2 = (b[0] - a[0])*(d[1] - a[1]) - (d[0] - a[0])*(b[1] - a[1])
        if (dir1 > 0.0) != (dir2 > 0.0) or (not dir1) != (not dir2): 
            dir1 = (d[0] - c[0])*(a[1] - c[1]) - (a[0] - c[0])*(d[1] - c[1])
            dir2 = (d[0] - c[0])*(b[1] - c[1]) - (b[0] - c[0])*(d[1] - c[1])
            return ((dir1 > 0.0) != (dir2 > 0.0) 
                or (not dir1) != (not dir2))
        return False

    def _check_is_simple(self):
        """Check the polygon for self-intersection and cache the result

        We use a simplified plane sweep algorithm. Worst case, it still takes
        O(n^2) time like a brute force intersection test, but it will typically
        be O(n log n) for common simple non-convex polygons. It should
        also quickly identify self-intersecting polygons in most cases,
        although it is slower for severely self-intersecting cases due to
        its startup cost.
        """
        intersects = self._segments_intersect
        last_index = len(self) - 1
        indices = range(len(self))
        points = ([(tuple(self[i - 1]), tuple(self[i]), i) for i in indices] 
            + [(tuple(self[i]), tuple(self[i - 1]), i) for i in indices])
        points.sort() # lexicographical sort
        open_segments = {}

        for point in points:
            seg_start, seg_end, index = point
            if index not in open_segments:
                # Segment start point
                for open_start, open_end, open_index in open_segments.values():
                    # ignore adjacent edges
                    if (last_index > abs(index - open_index) > 1
                        and intersects(seg_start, seg_end, open_start, open_end)):
                        self._simple = False
                        return False
                open_segments[index] = point
            else:
                # Segment end point
                del open_segments[index]
        self._simple = True
        return True

    @property
    def centroid(self):
        """The geometric center point of the polygon. This point only exists 
        for simple polygons. For non-simple polygons it is ``None``. Note
        in concave polygons, this point may lie outside of the polygon itself.

        If the centroid is unknown, it is calculated from the vertices and
        cached. If the polygon is known to be simple, this takes O(n) time. If
        not, then the simple polygon check is also performed, which has an
        expected complexity of O(n log n).
        """
        if self._centroid is _unknown:
            if self.is_simple:
                # Compute the centroid using by summing the centroids
                # of triangles made from each edge with vertex[0] weighted
                # (positively or negatively) by each triangle's area
                a = self[0]
                b = self[1]
                total_area = 0.0
                centroid = planar.Vec2(0, 0)
                for i in range(2, len(self)):
                    c = self[i]
                    area = ((b[0] - a[0]) * (c[1] - a[1]) 
                        - (c[0] - a[0]) * (b[1] - a[1]))
                    centroid += (a + b + c) * area
                    total_area += area
                    b = c
                self._centroid = centroid / (3.0 * total_area)
            else:
                self._centroid = None
        return self._centroid

    @property
    def is_centroid_known(self):
        """True if the polygon's centroid has been pre-calculated and cached.

        Mutating the polygon will invalidate the cached value.
        """
        return self._centroid is not _unknown

    def __setitem__(self, index, vert):
        super(Polygon, self).__setitem__(index, vert)
        self._clear_cached_properties()

    def __eq__(self, other):
        """Return True if other is the same shape as self, irrespective
        of initial vertex and winding direction. Note if the polygons
        have duplicate vertices, then these must also match for the
        polygons to be considered equal.
        """
        if not isinstance(other, Polygon) or len(self) != len(other):
            return False
        if self is other:
            return True

        # Test for identical verts
        indices = range(len(self))
        for i in indices:
            if self[i] != other[i]:
                break
        else:
            return True

        # Test for identical edges
        self_edges = set()
        add_self_edge = self_edges.add
        for i in indices:
            tgram = (self[i-2], self[i-1], self[i], 0)
            while tgram in self_edges:
                a, b, c, i = tgram
                tgram = (a, b, c, i+1)
            add_self_edge(tgram)

        other_edges = set()
        add_other_edge = other_edges.add
        for i in indices:
            tgram = (other[i-2], other[i-1], other[i], 0)
            while tgram in other_edges:
                a, b, c, i = tgram
                tgram = (a, b, c, i+1)
            if tgram in self_edges:
                add_other_edge(tgram)
            else:
                # Sets can't possibly match
                break
        else:
            if self_edges == other_edges:
                return True

        # Try reverse winding
        other_edges.clear()
        for i in indices:
            tgram = (other[i], other[i-1], other[i-2], 0)
            while tgram in other_edges:
                a, b, c, i = tgram
                tgram = (a, b, c, i+1)
            if tgram in self_edges:
                add_other_edge(tgram)
            else:
                # Sets can't possibly match
                return False
        return self_edges == other_edges

    def __ne__(self, other):
        return not self.__eq__(other)

    def __repr__(self):
        kwargs = ""
        if self.is_convex_known:
            kwargs += ", is_convex=%r" % self.is_convex
            if not self.is_convex and self.is_simple_known:
                kwargs += ", is_simple=%r" % self.is_simple
        return "%s([%s]%s)" % (self.__class__.__name__,
            ', '.join(repr(tuple(v)) for v in self),
            kwargs)

    __str__ = __repr__

    def __imul__(self, other):
        try:
           other.itransform(self)
           self._clear_cached_properties()
           return self
        except AttributeError:
            raise TypeError("Cannot multiply %s with %s"
                % (type(self).__name__, type(other).__name__))

    def __copy__(self):
        copy = self.from_points(self)
        copy._convex = self._convex
        copy._simple = self._simple
        copy._y_polylines = self._y_polylines
        copy._dupe_verts = self._dupe_verts
        copy._degenerate = self._degenerate
        copy._bbox = self._bbox
        copy._centroid = self._centroid
        copy._max_r = self._max_r
        copy._max_r2 = self._max_r2
        copy._min_r = self._min_r
        copy._min_r2 = self._min_r2
        return copy

    def __deepcopy__(self, memo):
        copy = self.__copy__()
        copy._y_polylines = None
        copy._bbox = None
        return copy

    ## Point in poly methods ##

    def _pnp_winding_test(self, point):
        """Return True if the point is in the polygon using a fast winding
        number test. This is a general point-in-poly test and will work
        correctly with all polygons.

        Note this test returns different results from the crossing test for
        non-simple polygons. In this test, self-overlapping sections of the
        polygon are still considered "inside", whereas the crossing test
        considers these regions "outside".

        Algorithm derived from:
        http://www.softsurfer.com/Archive/algorithm_0103/algorithm_0103.htm

        Complexity: O(n)
        """
        px, py = point
        winding_no = 0
        v0_x, v0_y = self[-1]
        v0_above = (v0_y >= py)
        for v1_x, v1_y in self:
            v1_above = (v1_y >= py)
            if v0_above != v1_above:
                if v1_above: # upward crossing
                    if ((v1_x - v0_x) * (py - v0_y)
                        - (px - v0_x) * (v1_y - v0_y) <= 0):
                        # point is right of edge, valid up intersect
                        winding_no += 1
                else:
                    if ((v1_x - v0_x) * (py - v0_y)
                        - (px - v0_x) * (v1_y - v0_y) >= 0):
                        # point is left of edge, valid down intersect
                        winding_no -= 1
            v0_above = v1_above
            v0_x = v1_x
            v0_y = v1_y
        return winding_no != 0
    
    def _pnp_y_monotone_test(self, point):
        """Return True if the point is in the polygon using a
        binary search of the polygon's 2 y-monotone edge polylines.
        This algorithm works only with convex or simple y-montone
        polygons.

        Complexity: O(log n)
        """
        px, py = point
        pt_y_tuple = (py,)
        lpline, rpline = self._y_polylines
        i = bisect.bisect_right(lpline, pt_y_tuple)
        if i == 0 or i == len(lpline):
            return False # Point above or below
        v0_y, v0_x = lpline[i-1]
        v1_y, v1_x = lpline[i]
        if ((v1_x - v0_x) * (py - v0_y)
            - (px - v0_x) * (v1_y - v0_y) > 0):
            return False # Point too far left
        i = bisect.bisect_right(rpline, pt_y_tuple)
        v0_y, v0_x = rpline[i-1]
        v1_y, v1_x = rpline[i]
        return ((v1_x - v0_x) * (py - v0_y)
            - (px - v0_x) * (v1_y - v0_y) > 0)

    def _pnp_triangle_test(self, point):
        """Return True if the point is in the triangle polygon using
        barycentric coordinates. This only works with triangles,
        of course.

        More info here:
        http://www.blackpawn.com/texts/pointinpoly/default.html

        Complexity: O(1)
        """
        lo, mid, hi = sorted(self, key=lambda xy: (xy[1], xy[0]))
        v0 = lo - mid
        v1 = hi - mid
        if v0.is_null or v1.is_null:
            return False
        dot01 = v0.dot(v1)
        dot00 = v0.length2
        dot11 = v1.length2
        denom = (dot00 * dot11 - dot01 * dot01)
        if not denom:
            return False # degenerate triangle
        inv_denom = 1.0 / denom
        # The above vars are cached in the closure defined below

        if ((hi[0] - lo[0])*(mid[1] - lo[1]) 
            - (mid[0] - lo[0])*(hi[1] - lo[1]) > 0.0):
            # Triangle has 2 inclusive leading edges
            def _pnp_triangle_test(point):
                v2 = point - mid
                dot02 = v0.dot(v2)
                dot12 = v1.dot(v2)
                u = (dot11 * dot02 - dot01 * dot12) * inv_denom
                v = (dot00 * dot12 - dot01 * dot02) * inv_denom
                return u >= 0.0 and v >= 0.0 and u + v < 1.0
        else:
            # Triangle has 1 inclusive leading edge
            def _pnp_triangle_test(point):
                v2 = point - mid
                dot02 = v0.dot(v2)
                dot12 = v1.dot(v2)
                u = (dot11 * dot02 - dot01 * dot12) * inv_denom
                v = (dot00 * dot12 - dot01 * dot02) * inv_denom
                return u > 0.0 and v > 0.0 and u + v <= 1.0

        # Store the closure in the instance as a method override
        # which will intercept future calls
        self._pnp_triangle_test = _pnp_triangle_test
        return _pnp_triangle_test(point)
    
    def contains_point(self, point):
        """Return True if the specified point is inside the polygon.

        This test can use various strategies depending on the
        classification of the polygon, i.e., triangular, radial, 
        y-monotone, convex, or other. 

        The runtime complexity will depend on the polygon:

        Triangle or best-case radial: O(1)
        y-monotone, convex: O(log n)
        other: O(n)

        :param point: A point vector.
        :type point: :class:`~planar.Vec2`
        :rtype: bool
        """
        sides = len(self)
        if sides == 3:
            return self._pnp_triangle_test(point)
        if self._centroid is not _unknown and sides > 4:
            d2 = (self._centroid - point).length2
            if self._min_r2 is not None and d2 < self._min_r2:
                return True
            if self._max_r2 is not None and d2 > self._max_r2:
                return False
        if self._y_polylines is not None:
            return self._pnp_y_monotone_test(point)
        if sides == 4 or self.bounding_box.contains_point(point):
            return self._pnp_winding_test(point)
        return False

    ## Tangent methods ##
    # See: http://softsurfer.com/Archive/algorithm_0201/algorithm_0201.htm

    def _pt_tangents(self, point):
        """Return the pair of tangent points for the given exterior point.
        This general algorithm works for all polygons in O(n) time.
        """
        px, py = point
        left_tan = right_tan = self[0]
        verts = iter(self)
        v0_x, v0_y = self[-2]
        v1_x, v1_y = self[-1]
        prev_turn = (v1_x - v0_x)*(py - v0_y) - (px - v0_x)*(v1_y - v0_y)
        v0_x = v1_x
        v0_y = v1_y
        for v1_x, v1_y in self:
            next_turn = (v1_x - v0_x)*(py - v0_y) - (px - v0_x)*(v1_y - v0_y)
            if prev_turn <= 0.0 and next_turn > 0.0:
                if ((v0_x - px)*(right_tan.y - py)
                    - (right_tan.x - px)*(v0_y - py) >= 0.0):
                    right_tan = planar.Vec2(v0_x, v0_y)
            elif prev_turn > 0.0 and next_turn <= 0.0:
                if ((v0_x - px)*(left_tan.y - py)
                    - (left_tan.x - px)*(v0_y - py) <= 0.0):
                    left_tan = planar.Vec2(v0_x, v0_y)
            v0_x = v1_x
            v0_y = v1_y
            prev_turn = next_turn
        return left_tan, right_tan

    @staticmethod
    def _pt_above(p, a, b):
        """Return True if a is above b relative to fixed point p"""
        return ((a[0] - p[0])*(b[1] - p[1]) 
            - (b[0] - p[0])*(a[1] - p[1]) > 0.0)

    @staticmethod
    def _pt_below(p, a, b):
        """Return True if a is below b relative to fixed point p"""
        return ((a[0] - p[0])*(b[1] - p[1]) 
            - (b[0] - p[0])*(a[1] - p[1]) < 0.0)

    def _left_tan_i_convex(self, point):
        """Return the left tangent index to the given exterior point for a 
        convex polygon using a binary search.
        """
        below = self._pt_below
        above = self._pt_above
        
        # See if vertex[-1] is the tangent point
        if (not below(point, self[0], self[-1]) 
            and above(point, self[-2], self[-1])):
            return -1

        a = -1
        b = len(self) - 1
        limit = len(self)
        while limit:
            c = (a + b) // 2
            down_c = below(point, self[c+1], self[c])
            if not down_c and above(point, self[c-1], self[c]):
                # We have our man
                return c
            if below(point, self[a+1], self[a]):
                if not down_c or below(point, self[a], self[c]):
                    b = c
                else:
                    a = c
            else:
                if down_c or not above(point, self[a], self[c]):
                    a = c
                else:
                    b = c
            limit -= 1
        return a # Interior point

    def _right_tan_i_convex(self, point):
        """Return the right tangent index to the given exterior point for a 
        convex polygon using a binary search.
        """
        below = self._pt_below
        above = self._pt_above
        
        # See if vertex[-1] is the tangent point
        if (below(point, self[0], self[-1]) 
            and not above(point, self[-2], self[-1])):
            return -1

        a = -1
        b = len(self) - 1
        limit = len(self)
        while limit:
            c = (a + b) // 2
            down_c = below(point, self[c+1], self[c])
            if down_c and not above(point, self[c-1], self[c]):
                # We have our man
                return c
            if above(point, self[a+1], self[a]):
                if down_c or above(point, self[a], self[c]):
                    b = c
                else:
                    a = c
            else:
                if not down_c or not below(point, self[a], self[c]):
                    a = c
                else:
                    b = c
            limit -= 1
        return a # Interior point

    def tangents_to_point(self, point):
        """Given a point **exterior** to the polygon, return the pair of
        vertex points from the polygon that define the tangent lines with the
        specified point.

        Runtime Complexity: O(log n) convex, O(n) other

        :param point: A point outside the polygon. If the point specified is
            inside, the result is undefined.
        :type point: :class:`~planar.Vec2`
        :return: A tuple containing the left and right tangent points.
        :rtype: tuple of :class:`~planar.Vec2`
        """
        if len(self) > 20 and self.is_convex and not self._dupe_verts:
            return (self[self._left_tan_i_convex(point)], 
                self[self._right_tan_i_convex(point)])
        else:
            return self._pt_tangents(point)

    ## Convex Hull ##

    @classmethod
    def convex_hull(cls, points):
        """Return a new polygon that is the convex hull of the supplied
        sequence of points. 

        If points is a polygon known to be convex, a copy of the 
        polygon is returned.

        The hull is computed using an adaptive quick-hull algorithm.  The
        expected runtime complexity of this algorithm is O(n log h) (where h
        is the size of the hull), the worst case is O(n log n) when the
        supplied points are already nearly convex. This algorithm is
        especially fast when many of the supplied points are inside the
        resulting hull.

        :param points: A sequence of points.
        :rtype: Polygon
        """
        if isinstance(points, Polygon):
            if points.is_convex_known and points.is_convex:
                return points.__copy__()
        return cls(_adaptive_quick_hull(points), is_convex=True)


def _adaptive_quick_hull(points):
    """Compute the convex hull from an arbitrary collection of points
    using an adaptive quick hull algorithm. Return the points of the hull
    as a list in radial sequence.

    The adaptive algorithm paritions the points as in quick-hull unless
    the paritioning fails to cull enough points to remain efficient.
    If this occurs then the algorithm changes to a monotone chain
    (A simplified variant of Graham's scan) for the partition to avoid
    the worst-case quick-hull behavior.
    """
    leftmost = rightmost = points[0]
    for p in points:
        if p[0] < leftmost[0]:
            leftmost = p
        elif p[0] > rightmost[0]:
            rightmost = p
    upper_points = set()
    lower_points = set()
    add_upper = upper_points.add
    add_lower = lower_points.add
    lx, ly = leftmost
    line_w = rightmost[0] - leftmost[0]
    line_h = rightmost[1] - leftmost[1]
    for p in points:
        if line_w * (p[1] - ly) - (p[0] - lx) * line_h > 0.0:
            add_upper(p)
        else:
            add_lower(p)
    upper_points.discard(leftmost)
    upper_points.discard(rightmost)
    lower_points.discard(leftmost)
    lower_points.discard(rightmost)
    hull = []
    if upper_points:
        _ahull_partition_points(hull, upper_points, leftmost, rightmost)
    else:
        hull.append(leftmost)
    if lower_points:
        _ahull_partition_points(hull, lower_points, rightmost, leftmost)
    else:
        hull.append(rightmost)
    return hull

def _ahull_partition_points(hull, points, p0, p1):
    """Partition the points 'above' p0->p1 to compute the sub-hull"""

    # Find point furthest from line p0->p1 as partition point
    furthest = -1.0
    p0_x, p0_y = p0
    pline_dx = p1[0] - p0[0]
    pline_dy = p1[1] - p0[1]
    for p in points:
        dist = pline_dx * (p[1] - p0_y) - (p[0] - p0_x) * pline_dy
        if dist > furthest:
            furthest = dist
            partition_point = p
    partition_point = planar.Vec2(*partition_point)
    
    # Compute the triangle partition_point->p0->p1
    # in barycentric coordinates
    # All points inside this triangle are not in the hull
    # divide the remaining points into left and right sets
    left_points = []
    right_points = []
    add_left = left_points.append
    add_right = right_points.append
    v0 = p0 - partition_point
    v1 = p1 - partition_point
    dot00 = v0.length2
    dot01 = v0.dot(v1)
    dot11 = v1.length2
    denom = (dot00 * dot11 - dot01 * dot01)
    # If denom is zero, the triangle has no area and
    # all points lie on the partition line 
    # and thus can be culled
    if denom:
        inv_denom = 1.0 / denom
        for p in points:
            v2 = p - partition_point
            dot02 = v0.dot(v2)
            dot12 = v1.dot(v2)
            u = (dot11 * dot02 - dot01 * dot12) * inv_denom
            v = (dot00 * dot12 - dot01 * dot02) * inv_denom
            # Since the partition point is the furthest from p0->p1
            # u and v cannot both be negative
            # Note the partition point is discarded here
            if v < 0.0:
                add_left(p)
            elif u < 0.0:
                add_right(p)

    left_count = len(left_points)
    right_count = len(right_points)
    # Heuristic to determine if we should continue to partition
    # recursively, or complete the sub-hull via a sorted scan.
    # The more points culled by this partition, the greater
    # the chance we will partition further. If paritioning
    # culled few points, it is likely that a sorted scan
    # will be the more efficient algorithm. Note the scaling
    # factor here is not particularly sensitive.
    max_partition = (len(points) - left_count - right_count) * 4

    if left_count <= 1:
        # Trivial partition
        hull.append(p0)
        hull.extend(left_points)
    elif left_count <= max_partition:
        _ahull_partition_points(hull, left_points, p0, partition_point)
    else:
        _ahull_sort_points(hull, left_points, p0, partition_point)

    if right_count <= 1:
        # Trivial partition
        hull.append(partition_point)
        hull.extend(right_points)
    elif right_count <= max_partition:
        _ahull_partition_points(hull, right_points, partition_point, p1)
    else:
        _ahull_sort_points(hull, right_points, partition_point, p1)

def _ahull_sort_points(hull, points, p0, p1):
    """Compute the sub-hull using a sorted chain-hull algorithm"""
    dx, dy = p1 - p0
    p0_x, p0_y = p0
    def line_order(pt):
        return dx * (pt[0] - p0_x) + dy * (pt[1] - p0_y)
    points.sort(key=line_order)
    points.append(p1)
    stack = [p0]
    push = stack.append
    pop = stack.pop
    for p in points:
        while len(stack) >= 2:
            v0 = stack[-2]
            v1 = stack[-1]
            if ((v1[0] - v0[0])*(p[1] - v0[1]) 
                - (p[0] - v0[0])*(v1[1] - v0[1]) >= 0.0):
                pop()
            else:
                break
        push(p)
    pop()
    hull.extend(stack)


_unknown = object()


# vim: ai ts=4 sts=4 et sw=4 tw=78
