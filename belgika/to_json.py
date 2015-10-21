#!/usr/bin/env python
"""
This script aims to convert a font in
fontforge readable file format containing
open contours into a font that's suitable
for our application.
"""

import sys
import fontforge
import json
from planar import Affine, Vec2


BZ_T = 4
LN_T = 2

FONT_ASCENT = None

def get_input_path():
    return sys.argv[1]

def get_ouput_path():
    return sys.argv[2]

def get_format_string():
    if len(sys.argv) > 3:
        return sys.argv[3]
    return '{}'

def make_point(ff_point, transform):
    pts = [Vec2(ff_point.x, ff_point.y)]
    transform.itransform(pts)
    return dict(x = pts[0].x, y = FONT_ASCENT - pts[0].y)


def process_line(contour, idx, transform):
    # print "process_line {} {}".format(len(contour), idx)
    ret = dict()
    start_point = contour[idx]
    end_point = contour[idx + 1]

    ret['start'] = make_point(start_point, transform)
    ret['end'] = make_point(end_point, transform)
    return (dict(type = 'L', points = ret), LN_T)

def process_bezier(contour, idx, transform):
    # print "process_bezier {} {}".format(len(contour), idx)
    ret = dict()
    start_point = contour[idx]
    c1_point = contour[idx + 1]
    c2_point = contour[idx + 2]
    try:
        end_point = contour[idx + 3]
    except Exception:
        end_point = contour[0]

    ret['start'] = make_point(start_point, transform)
    ret['control1'] = make_point(c1_point, transform)
    ret['control2'] = make_point(c2_point, transform)
    ret['end'] = make_point(end_point, transform)
    return (dict(type = 'C', points = ret), BZ_T)

def process_points(contour, idx, transform):
    next_point = contour[idx + 1]

    if next_point.on_curve:
        return process_line(contour, idx, transform)
    else:
        return process_bezier(contour, idx, transform)

def process_contour(contour, transform, c_index):
    d_pts = []
    d_starts = []
    for p in contour:
        if p.on_curve:
            d_pts.append('ON')
        else:
            d_pts.append('OFF')
    start = 0
    end = len(contour) - 1
    points = []
    if len(contour) < 2:
        return points


    while start < end:
        d_starts.append(str(start));
        try:
            processed = process_points(contour, start, transform)
            start += processed[1] - 1
            points.append(processed[0])
        except Exception, e:
            print "> i[{}] s[{}] e[{}]".format(c_index, start, end)
            print "> {}".format(' '.join(d_pts))
            print "> {}".format(' '.join(d_starts))
            raise e
    print "> {}".format(' '.join(d_pts))
    print "> {}".format(' '.join(d_starts))
    return points


def process_glyph(font, glyph, transform = Affine.identity()):

    points = []
    lyr = glyph.foreground
    c_index = 0
    for contour in lyr:
        points = points + process_contour(contour, transform, c_index)
        c_index += 1

    for ref in glyph.references:
        rg = font[ref[0]]
        mat = ref[1]
        t = Affine.abcdef(*mat)
        points = points + process_glyph(font, rg, transform * t)

    return points

def process_font(font):
    out = dict()
    font_info = dict()
    glyphs = dict()

    font_info['unitsPerEm'] = font.em
    font_info['ascent'] = font.ascent
    font_info['descent'] = font.descent
    font_info['fontName'] = font.fullname

    for glyph in font.glyphs():

        code_key = '{}'.format(glyph.unicode)
        points = process_glyph(font, glyph)

        if len(points):
            print u"** {} {} **".format(glyph.unicode, len(points))
            gp = dict(glyph = points)
            gp['width'] = glyph.width
            gp['leftBearing'] = glyph.left_side_bearing
            gp['rightBearing'] = glyph.right_side_bearing
            glyphs[code_key] = gp

    out['fontInfo'] = font_info
    out['glyphs'] = glyphs
    return out


def main():
    global FONT_ASCENT
    font = fontforge.open(get_input_path())
    FONT_ASCENT = font.ascent
    processed = process_font(font)
    out = json.dumps(processed, sort_keys=True, indent=4)
    with open(get_ouput_path(), 'w') as json_f:
        json_f.write(get_format_string().format(out))
    print "Looks like everything went fine :)"


if __name__ == "__main__":
    main()
