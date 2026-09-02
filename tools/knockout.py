#!/usr/bin/env python3
"""Knock a white background out to alpha and trim, for a decal texture.

    python3 tools/knockout.py in.png assets/eyes.png --thresh 235 --soft 40 --pad 8

A pasted picture of something on white becomes a texture you can put on a
plane: pixels at or above --thresh in every channel go fully transparent,
pixels within --soft of it fade, everything else keeps its colour with alpha
1. Then the image is trimmed to the opaque bounds plus --pad. Written for the
eyes behind the drain gate, which arrived as a black-and-white drawing on a
white square.
"""
import argparse
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--thresh', type=int, default=235)
ap.add_argument('--soft', type=int, default=40)
ap.add_argument('--pad', type=int, default=8)
ap.add_argument('--max', type=int, default=512, help='longest side after trim')
a = ap.parse_args()

im = Image.open(a.src).convert('RGBA')
px = im.load()
W, H = im.size
lo = a.thresh - a.soft
for y in range(H):
    for x in range(W):
        r, g, b, _ = px[x, y]
        m = min(r, g, b)                       # whiteness = the darkest channel
        if m >= a.thresh: al = 0
        elif m <= lo: al = 255
        else: al = int(255 * (a.thresh - m) / a.soft)
        px[x, y] = (r, g, b, al)
bbox = im.getchannel('A').getbbox()
if bbox:
    x0, y0, x1, y1 = bbox
    im = im.crop((max(0, x0 - a.pad), max(0, y0 - a.pad), min(W, x1 + a.pad), min(H, y1 + a.pad)))
if max(im.size) > a.max:
    k = a.max / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
im.save(a.dst, 'PNG', optimize=True)
print('%s: %dx%d' % (a.dst, im.width, im.height))
