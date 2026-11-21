#!/usr/bin/env python3
"""THE CALL'S PAGE TURN, ITS STRAY WHITE CUT OUT OF THE SHIPPED SHEETS (2026-11-19, the owner, with a screenshot of the first
turn: "take out that glitchy white above the cursor please").

    /usr/bin/python3 -E tools/intro_cut_fix.py            (edits assets/intro/left-*.webp in place; run it once)

`tools/intro_cut_pack.py` cut his left hand and the turning book out of the clip; on the frames where his hand starts the first
turn, ragged white from the table behind (the light on it, read as paper) stayed joined to the book at its spiral and stood up
above its top edge — a pale shape with holes, the size of his fist, over the book for ~1.3 s. Its work folder is gone, so
this mends the packed sheets directly, the ALPHA only (the colour under it is kept; the sheets are lossy colour with lossless
alpha, re-saved at quality 92, over what they were packed at, so a second generation does not show):
  * frames 119-130 (the book flat, the hand on it): nothing may stand above the book's own top edge, read off four clean
    frames of the same stretch (121/123/125/126) in canvas px, only where that edge IS the book (his arm's columns left
    alone). 131 is left out: there his fingers really do rise over the edge, lifting the page.
  * 134 and 136 (the page up): white bits off the raised page's top corners — what a 12 px opening strips from the top 80 px.
  * 132 and 133: the table's tan leaking onto the turning page's end (saturation > 0.3 and red over blue > 0.22, inside the
    page's box; his skin is at most 0.24 / 0.2).
Measured before it wrote: 119-130 lose 0-4.5k px each, all of it the white; 134 1.6k + 0.3k; 136 1.4k."""
import json, numpy as np
from PIL import Image
from scipy import ndimage as nd

M = json.load(open('assets/intro/cut.json')); F = M['L']['frames']
sheets, dirty = {}, set()
def sheet(i):
    if i not in sheets: sheets[i] = np.asarray(Image.open(f'assets/intro/left-{i}.webp').convert('RGBA')).copy()
    return sheets[i]
def view(k):
    r = F[k]; return sheet(r[6])[r[1]:r[1] + r[3], r[0]:r[0] + r[2]], r
disk = lambda r: (np.add.outer(np.arange(-r, r + 1) ** 2, np.arange(-r, r + 1) ** 2) <= r * r)

# the book's top edge, in canvas px, off the clean flat frames
T = {}
for k in ('121', '123', '125', '126'):
    im, r = view(k); a = im[..., 3] > 40
    for x in range(a.shape[1]):
        ys = np.nonzero(a[:, x])[0]
        if len(ys): T[x + r[4]] = max(T.get(x + r[4], -1), ys[0] + r[5])
y0 = min(T.values()); book = {x: y for x, y in T.items() if y <= y0 + 150}
for k in [str(i) for i in range(119, 131)]:
    im, r = view(k); a = im[..., 3] > 40; cut = np.zeros_like(a)
    for x in range(a.shape[1]):
        lim = book.get(x + r[4])
        if lim is None: continue
        yl = lim - r[5] - 3
        if yl > 0: cut[:yl, x] = a[:yl, x]
    if cut.any(): im[..., 3][cut] = 0; dirty.add(r[6]); print(k, 'above the book edge', int(cut.sum()))
# the corners of the raised page
for k in ('134', '136'):
    im, r = view(k); a = im[..., 3] > 40
    ao = nd.binary_opening(a, structure=disk(12)); lab, n = nd.label(ao); sz = nd.sum(ao, lab, range(1, n + 1)); main = lab == (1 + int(np.argmax(sz)))
    res = a & ~nd.binary_dilation(main, structure=disk(12)); res[80:] = False
    lab2, n2 = nd.label(res); cut = np.zeros_like(a)
    for i in range(1, n2 + 1):
        c = lab2 == i
        if c.sum() >= 200: cut |= nd.binary_dilation(c, iterations=2) & a
    if cut.any(): im[..., 3][cut] = 0; dirty.add(r[6]); print(k, 'corner bits', int(cut.sum()))
# the table's tan on the turning page
for k, (x0, y0_, x1, y1) in (('132', (470, 20, 645, 200)), ('133', (300, 0, 420, 70))):
    im, r = view(k); a = im[..., 3] > 40; c = im[..., :3].astype(np.float32) / 255
    mx = c.max(2); sat = (mx - c.min(2)) / (mx + 1e-4)
    tan = a & (sat > 0.3) & (c[..., 0] - c[..., 2] > 0.22) & (c[..., 0] > c[..., 1]) & (c[..., 1] > c[..., 2])
    box = np.zeros_like(a); box[y0_:y1, x0:x1] = True; tan &= box
    tan = nd.binary_dilation(tan, iterations=2) & a & box
    if tan.any(): im[..., 3][tan] = 0; dirty.add(r[6]); print(k, 'tan', int(tan.sum()))
for i in sorted(dirty):
    Image.fromarray(sheets[i]).save(f'assets/intro/left-{i}.webp', quality=92, method=6, alpha_quality=100)
    print('wrote left-%d.webp' % i)
