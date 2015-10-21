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
"""2d planar geometry library for Python"""

__all__ = ('TransformNotInvertibleError', 'set_epsilon', 
    'Vec2', 'Point', 'Vec2Array', 'Seq2', 
    'Line', 'Ray', 'LineSegment',
    'Affine', 'BoundingBox', 'Polygon')

__versioninfo__ = (0, 4, 0)
__version__ = '.'.join(str(n) for n in __versioninfo__)

try: # pragma: no cover
    # Default to C implementation
    from planar.c import _set_epsilon, Vec2, Vec2Array, Seq2, Affine, \
        BoundingBox, Polygon, TransformNotInvertibleError

    __implementation__ = 'C'
except ImportError: # pragma: no cover
    # Fall-back to Python implementation
    from planar.vector import Vec2, Vec2Array, Seq2
    from planar.transform import Affine
    from planar.line import Line, Ray, LineSegment
    from planar.box import BoundingBox
    from planar.polygon import Polygon

    class TransformNotInvertibleError(Exception):
        """The transform could not be inverted"""

    def _set_epsilon(e): pass

    __implementation__ = 'Python'

Point = Vec2
"""``Point`` is an alias for ``Vec2``. 
Use ``Point`` where desired for clarity in your code.
"""

def set_epsilon(epsilon):
    """Set the global absolute error value and rounding limit for approximate
    floating point comparison operations. This value is accessible via the
    :attr:`planar.EPSILON` global variable.

    The default value of ``0.00001`` is suitable for values
    that are in the "countable range". You may need a larger
    epsilon when using large absolute values, and a smaller value
    for very small values close to zero. Otherwise approximate
    comparison operations will not behave as expected.
    """
    global EPSILON, EPSILON2
    EPSILON = float(epsilon)
    EPSILON2 = EPSILON**2
    _set_epsilon(EPSILON)

set_epsilon(1e-5)


# vim: ai ts=4 sts=4 et sw=4 tw=78

