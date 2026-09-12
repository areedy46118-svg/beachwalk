#!/usr/bin/env python3
"""Cut a wall-mounted object out of a photograph, background to alpha.

    python3 tools/plaque_cutout.py raw.jpg assets/billy-idle.png

`tools/cutout.swift` is macOS Vision PERSON segmentation — it is what Bradly
and the fisherman went through and it finds nothing at all in a photograph of
a fish on a plank. `tools/knockout.py` keys on BRIGHTNESS, which works for a
drawing on white paper and fails the moment the wall behind the thing is grey
or brick.

So this keys on CONNECTEDNESS instead, which is what actually separates a
mounted object from the room behind it: flood from the four borders of the
frame and take everything the flood reaches as background. The plaque never
touches the edge, so it is never reached. Tolerance is per-pixel against the
colour of the border region the flood came from, so a wall that shades from
light to dark across the frame still goes, and the dark moulded edge of the
plaque stops it.

  --luma   how bright a pixel must be to count as wall (default 118)
  --sat    and how grey — max(rgb)-min(rgb) (default 46). Lower the
           saturation cap if the flood eats into the plaque's oak; lower
           luma if a dark wall is being left behind.
  --feather  pixels of alpha softening on the cut edge (default 1)
  --pad    transparent margin kept around the trimmed result
  --max    longest side of the output
"""
import argparse
from collections import deque
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--luma', type=float, default=118, help='background is at least this bright')
ap.add_argument('--sat', type=int, default=46, help='...and no more saturated than this')
ap.add_argument('--lumamax', type=float, default=255, help='and no brighter than this')
ap.add_argument('--feather', type=int, default=1)
ap.add_argument('--pad', type=int, default=4)
ap.add_argument('--inset', type=float, default=0.05, help='fraction trimmed off each side first')
ap.add_argument('--no-fill', dest='fill', action='store_false',
                help='skip the per-row span repair (see below)')
ap.add_argument('--max', type=int, default=768)
a = ap.parse_args()

im = Image.open(a.src).convert('RGB')
W, H = im.size
px = im.load()

# AND THE FRAME IS VIGNETTED, SO THE BORDER IS NOT THE WALL. These come
# off a video still: measured down the right-hand column the edge runs
# L 43 to L 90 and along the bottom L 22 to L 62, against a wall that is
# L 154 to L 207. A flood seeded at the frame's edge therefore starts
# inside a dark ring, never gets out of it, and the "largest object" ends
# up being the plaque WELDED to the whole right-hand side of the picture —
# which is exactly what the first clean-looking cut did.
#
# Trimming a few per cent off every side throws the ring away and leaves
# honest wall for the flood to start in. A proportion, not a number of
# pixels, so it does the same thing to a 300 px thumbnail and a 1280 px
# frame. (Finding the board by saturation was tried first and cropped to
# the FISH — the oak does not always connect to it — which is a tighter
# box than the plaque and cut its own edges off.)
if a.inset > 0:
    m = int(min(W, H) * a.inset)
    if m > 0:
        im = im.crop((m, m, W - m, H - m))
        W, H = im.size; px = im.load()

# A PURE FLOOD CANNOT DO IT, AND THE SWEEP SAYS SO. Stepping on the
# difference to the NEIGHBOUR, a photograph is a continuous surface: at
# tol <= 8 the flood will not cross the wall's own shading (99% of the
# frame survives) and at tol >= 12 it walks straight through the plaque
# and out the other side (1% survives). There is no value in between —
# the wall's gradient is larger than the plaque's softest edge.
#
# So the background is decided by COLOUR and the flood is used only for
# CONNECTIVITY. A wall, in every one of these photographs, is light and
# almost grey; the plaque is saturated oak inside a near-black moulding
# and the fish is green. That separates them in one test. Connectivity
# then matters for one reason: the fish's white BELLY is light and
# desaturated too, so on colour alone it would be cut out — but it is
# enclosed by the fish and the plaque, so a flood that starts at the
# frame's edge can never reach it.
def bglike(c):
    r, g, b = c
    mx, mn = max(r, g, b), min(r, g, b)
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    # A CEILING AS WELL AS A FLOOR. On the small thumbnail the fish's white
    # BELLY reads L 193 against a wall of L 122 to 168 — the animal is
    # brighter than the room behind it — so a floor alone cuts the belly out
    # and no amount of connectivity saves it, because it touches the pale
    # nameplate and walks out to the edge. Bracketing the wall's own range
    # separates them cleanly.
    return a.luma <= luma <= a.lumamax and (mx - mn) <= a.sat

bg = bytearray(W * H)
q = deque()

def push(x, y):
    if 0 <= x < W and 0 <= y < H and not bg[y * W + x] and bglike(px[x, y]):
        bg[y * W + x] = 1
        q.append((x, y))

for x in range(W):
    push(x, 0); push(x, H - 1)
for y in range(H):
    push(0, y); push(W - 1, y)

while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        push(x + dx, y + dy)

# ONE PLAQUE, NOT EVERY SPECK. A photograph has grain and a compressed
# one has blocks, so the colour test always leaves a scatter of stray
# pixels out in the wall — and the row repair below spans from the first
# surviving pixel to the last, so a single speck at the frame's edge made
# the span the whole row and the cut came back 100% opaque. Keep only the
# largest connected run of object and throw the specks away first.
lab = bytearray(W * H)
best, bestn = None, 0
for sy in range(H):
    for sx in range(W):
        i0 = sy * W + sx
        if bg[i0] or lab[i0]:
            continue
        comp, dq, n = [], deque([(sx, sy)]), 0
        lab[i0] = 1
        while dq:
            x, y = dq.popleft()
            comp.append(y * W + x); n += 1
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H:
                    j = ny * W + nx
                    if not bg[j] and not lab[j]:
                        lab[j] = 1; dq.append((nx, ny))
        if n > bestn:
            bestn, best = n, comp
keep = bytearray(W * H)
for i in (best or []):
    keep[i] = 1
for i in range(W * H):
    if not keep[i]:
        bg[i] = 1

# AND THE FISH'S BELLY IS THE COLOUR OF THE WALL. Every one of these
# photographs has a white-bellied fish on a pale wall, so on colour alone
# the belly and the big pale lower jaw are classified as background — and
# connectivity does not save them, because the JAW STICKS OUT past the
# plaque's edge and is a bridge the flood walks in along. Measured: the
# first clean cut lost the whole underside of the animal.
#
# The repair uses the one thing that is true of a mounted plaque: on any
# given row it is a single contiguous run. So each row is filled between
# its first and last surviving pixel. The scalloped corners stay cut,
# because they lie outside that run; the belly, the jaw and the shadow
# under the fish are all inside it and come back.
if a.fill:
    for y in range(H):
        row = y * W
        lo, hi = -1, -1
        for x in range(W):
            if not bg[row + x]:
                if lo < 0:
                    lo = x
                hi = x
        if lo >= 0:
            for x in range(lo, hi + 1):
                bg[row + x] = 0

out = im.convert('RGBA')
op = out.load()
for y in range(H):
    row = y * W
    for x in range(W):
        if bg[row + x]:
            r, g, b, _ = op[x, y]
            op[x, y] = (r, g, b, 0)

# soften the cut so it does not stair-step under nearest filtering
for _ in range(max(0, a.feather)):
    prev = out.copy(); pp = prev.load()
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if pp[x, y][3] != 0:
                continue
            n = [pp[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            if max(n) == 255:
                r, g, b, _ = pp[x, y]
                op[x, y] = (r, g, b, 110)

bb = out.getbbox()
if bb:
    x0, y0, x1, y1 = bb
    x0 = max(0, x0 - a.pad); y0 = max(0, y0 - a.pad)
    x1 = min(W, x1 + a.pad); y1 = min(H, y1 + a.pad)
    out = out.crop((x0, y0, x1, y1))

if max(out.size) > a.max:
    k = a.max / max(out.size)
    out = out.resize((max(1, int(out.width * k)), max(1, int(out.height * k))), Image.LANCZOS)

out.save(a.dst)
op2 = out.load()
solid = sum(1 for y in range(out.height) for x in range(out.width) if op2[x, y][3] > 200)
print(f'{a.dst}  {out.width}x{out.height}  {100*solid/(out.width*out.height):.0f}% opaque')
