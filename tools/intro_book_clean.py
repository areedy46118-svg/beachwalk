#!/usr/bin/env python3
"""THE SKETCHBOOK'S PAGE TURNS, CLEANED (2026-11-20, the owner: "CLEAN UP THE TEXTBOOK EDITS AND TRIMS YOU DID … CLEAN UP THE
CUTSCENE AS MUCH AS YOU CAN"). `intro_cut_fix.py` mended the shipped left sheets by cutting: the stray white over the book
went, and so did the warm corner of the turning page in 132/133 — the page came out torn. This goes over every flip frame
(119-245 and the held ones) and cleans by shape and colour, in the sprite, alpha and colour both:
  * 132 and 133 from their sheets BEFORE the cut (`&OLD`, git bb45533): the page whole, its warm end given the paper's own
    colour instead of cut away;
  * the table's tan on the paper: where it is the page's outer edge, out; where it is inside the page, the paper's colour;
  * the paper's outline (light, unsaturated) opened by a small disk: the spurs and specks of white off its corners go; his
    hand and sleeve are not the paper and are not touched; then what is left apart from the book and him, under 0.4% of it.
    /usr/bin/python3 -E tools/intro_book_clean.py OLD_DIR [frames]     (frames: preview only, into OLD_DIR/clean.jpg)"""
import sys, json, numpy as np, cv2
from PIL import Image
from scipy import ndimage as nd

OLD = sys.argv[1]; ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
M = json.load(open('assets/intro/cut.json')); F = M['L']['frames']
MO = json.load(open(f'{OLD}/cut.json'))['L']['frames']
sheets, olds, dirty = {}, {}, set()
def sheet(i):
    if i not in sheets: sheets[i] = np.asarray(Image.open(f'assets/intro/left-{i}.webp').convert('RGBA')).copy()
    return sheets[i]
def old(k):
    r = MO[k]
    if r[6] not in olds: olds[r[6]] = np.asarray(Image.open(f'{OLD}/left-{r[6]}.webp').convert('RGBA'))
    return olds[r[6]][r[1]:r[1] + r[3], r[0]:r[0] + r[2]].copy()
disk = lambda r: (np.add.outer(np.arange(-r, r + 1) ** 2, np.arange(-r, r + 1) ** 2) <= r * r)


def clean(fr, k):
    """only what is plainly not the book or him: a chip of the table's tan standing off the paper's outer edge, nowhere near
    his hand (his hand is as warm as the wood in places: tan touching skin is left), and specks standing apart. Nothing
    inside the page is repainted; the outline is not smoothed (an opening of 'the paper' ate his fingers)."""
    rgb, a = fr[..., :3].copy(), fr[..., 3].copy()
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV); h, s, v = [hsv[..., i].astype(int) for i in range(3)]
    on = a > 30
    hand = on & ((h <= 12) | (h >= 168)) & (s >= 18) & (v > 60)
    lb, n = nd.label(hand)
    if n: sz = nd.sum(hand, lb, range(1, n + 1)); hand = np.isin(lb, [i + 1 for i in range(n) if sz[i] > 400])
    nearhand = nd.binary_dilation(hand, iterations=6)
    tan = on & (h >= 13) & (h <= 30) & (s > 60) & (v > 90)
    edge = on & ~nd.binary_erosion(on, iterations=8)
    lb, n = nd.label(tan)
    for i in range(1, n + 1):
        c = lb == i
        if (c & edge).any() and not (c & nearhand).any(): a[nd.binary_dilation(c, iterations=1) & on] = 0
    on = a > 30
    lb, n = nd.label(on)
    if n > 1:
        sz = nd.sum(on, lb, range(1, n + 1)); big = sz.max()
        a[np.isin(lb, [i + 1 for i in range(n) if sz[i] < 0.004 * big])] = 0      # (specks standing apart)
    return np.dstack([rgb, a])


keys = ONLY or [k for k in F if F[k] and ((k.isdigit() and 119 <= int(k) <= 245) or k.startswith('b') or (k[:1] in 'fh' and k[1:].isdigit() and 119 <= int(k[1:]) <= 245))]
prev = []
for k in keys:
    r = F[k]
    if not r: continue
    x, y, w, hh, dx, dy, sh = r
    cur = sheet(sh)[y:y + hh, x:x + w]
    src = cur.copy()
    new = clean(src, k)
    if ONLY: prev.append((cur, new)); continue
    sheet(sh)[y:y + hh, x:x + w] = new; dirty.add(sh)
if ONLY:
    tiles = []
    for cur, new in prev:
        t = []
        for im in (cur, new):
            bg = np.zeros(im.shape[:2] + (3,), np.float32); bg[:] = (40, 44, 60); al = im[..., 3:4] / 255
            t.append((bg * (1 - al) + im[..., :3] * al).astype(np.uint8))
        tiles.append(np.concatenate(t, 0))
    hmax = max(t.shape[0] for t in tiles); tiles = [np.pad(t, ((0, hmax - t.shape[0]), (0, 4), (0, 0))) for t in tiles]
    Image.fromarray(np.concatenate(tiles, 1)).save(f'{OLD}/clean.jpg', quality=85); print('preview', f'{OLD}/clean.jpg'); sys.exit(0)
for i in sorted(dirty):
    Image.fromarray(sheets[i]).save(f'assets/intro/left-{i}.webp', 'WEBP', quality=84, method=6, alpha_quality=90)   # (the packer's own settings, near enough: the game is at its size line)
    print('left', i, 'resaved')
