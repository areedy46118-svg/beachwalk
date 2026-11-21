#!/usr/bin/env python3
"""The owner's hand-drawn alphabet as a web font (2026-11-18, the owner: "use this alphabet for all the letters in the
game except the settings ... flip over the M for the W").

    /usr/bin/python3 -E tools/hand_font_pack.py ALPHABET.png OUT.woff [PREVIEW.png]   (the native one: Pillow, numpy and fontTools)

ALPHABET.png is the photo at 2400 px wide (`sips -s format png -Z 2400 IMG_7204.HEIC --out abc.png`): marker capitals on
sketchbook paper in four rows, A-H / I-O / P-V / X-Z, no W. Each letter is cut by ink projection (rows, then the gaps
between letters), the paper levelled out, the ink thresholded and cleaned of specks, its stroke set to one weight, then
TRACED (pixel-edge loops, simplified, smoothed) into TrueType outlines at one cap height. W is the M turned over.
Lowercase is the same letters as small capitals; 0-9 come from the HUD's own drawn digits (`assets/hud/d0..d9.png`).
Everything else (punctuation) is not in the font and falls back to the page's next family.
"""
import sys, os, math
import numpy as np
from PIL import Image, ImageFilter
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

SRC, OUT = sys.argv[1], sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None
HERE = os.path.dirname(os.path.abspath(__file__))
UPM, CAP, SC = 1000, 700, 0.80          # em, cap height, small-cap scale for lowercase
SIDE = 78                               # side bearing (units)
GH = 220                                # traced glyph height in pixels (the work resolution)
STROKE = 0.135                          # the marker's weight as a share of the cap height (normalised per letter)
ROWS = ['ABCDEFGH', 'IJKLMNO', 'PQRSTUV', 'XYZ']
PAGE = (232, 180, 2240, 1720)           # the lettering on the page in the 2400 frame (off the rings, the thumb and the page's edge)


def ink_of(img):
    g = np.asarray(img.convert('L'), dtype=np.float32)
    paper = np.asarray(img.convert('L').filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(40)), dtype=np.float32)
    r = np.clip(g / np.maximum(paper, 1), 0, 1)           # 1 paper, ~0.2 ink
    return np.clip((0.62 - r) / 0.25, 0, 1)               # 0 paper .. 1 ink


def runs(prof, thr, gap):
    on = prof > thr
    out, i, n = [], 0, len(prof)
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]:
                j += 1
            out.append([i, j]); i = j
        else:
            i += 1
    merged = []
    for a, b in out:                                      # join runs split by a thin gap (a letter's own break)
        if merged and a - merged[-1][1] < gap:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    return merged


def components(mask):
    """4-connected labelling (iterative), for speck removal."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32); n = 0; sizes = [0]
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n; c = 0
                while st:
                    cy, cx = st.pop(); c += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = cy + dy, cx + dx
                        if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = n; st.append((yy, xx))
                sizes.append(c)
    return lab, sizes


def set_weight(a, want_px):
    """Bring the marker to `want_px` wide: measure the median stroke (ink area / skeleton-ish length) and erode/dilate."""
    img = Image.fromarray((a * 255).astype(np.uint8))
    m = a > 0.5
    area = m.sum()
    # stroke ≈ 2·area / perimeter
    per = (m[1:, :] != m[:-1, :]).sum() + (m[:, 1:] != m[:, :-1]).sum()
    w = 2.0 * area / max(1, per)
    d = int(round((want_px - w) / 2))
    for _ in range(abs(d)):
        img = img.filter(ImageFilter.MaxFilter(3) if d > 0 else ImageFilter.MinFilter(3))
    return np.asarray(img, dtype=np.float32) / 255, w


def trace(mask):
    """Closed loops along pixel edges with the ink on the LEFT (image coords, y down)."""
    h, w = mask.shape
    m = np.zeros((h + 2, w + 2), bool); m[1:-1, 1:-1] = mask
    nxt = {}
    for y in range(h + 2):
        for x in range(w + 2):
            if not m[y, x]:
                continue
            # pixel (x,y) occupies [x,x+1]x[y,y+1]; edges where the neighbour is empty, ink on the left going round CCW-on-screen
            if not m[y - 1, x]: nxt.setdefault((x + 1, y), []).append((x, y))          # top edge, going left
            if not m[y + 1, x]: nxt.setdefault((x, y + 1), []).append((x + 1, y + 1))  # bottom edge, going right
            if not m[y, x - 1]: nxt.setdefault((x, y), []).append((x, y + 1))          # left edge, going down
            if not m[y, x + 1]: nxt.setdefault((x + 1, y + 1), []).append((x + 1, y))  # right edge, going up
    loops = []
    while nxt:
        start = next(iter(nxt)); p = start; loop = [p]; prev = None
        while True:
            outs = nxt.get(p)
            if not outs:
                break
            if len(outs) > 1 and prev is not None:          # a pinch: turn the same way every time (keeps loops simple)
                dx0, dy0 = p[0] - prev[0], p[1] - prev[1]
                outs.sort(key=lambda q: (dx0 * (q[1] - p[1]) - dy0 * (q[0] - p[0])))
            q = outs.pop(0)
            if not outs:
                del nxt[p]
            prev, p = p, q
            if p == start:
                break
            loop.append(p)
        if len(loop) > 8:
            loops.append(loop)
    return loops


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    ab = b - a; L = np.hypot(*ab) or 1e-9
    d = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / L for p in pts[1:-1]]
    i = int(np.argmax(d)) + 1
    if d[i - 1] > eps:
        return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]


def smooth_loop(loop):
    # split the closed loop at its two farthest points, simplify each half, then one Chaikin pass
    pts = loop
    n = len(pts); k = n // 2
    s = rdp(pts[:k + 1], 1.1)[:-1] + rdp(pts[k:] + [pts[0]], 1.1)[:-1]
    out = []
    for i in range(len(s)):
        p, q = np.array(s[i], float), np.array(s[(i + 1) % len(s)], float)
        out.append(tuple(0.75 * p + 0.25 * q)); out.append(tuple(0.25 * p + 0.75 * q))
    return out


def glyph_from(a, scale_to=CAP, flip_v=False):
    """a: float ink alpha, tight crop. Returns (contours in font units, advance)."""
    img = Image.fromarray((a * 255).astype(np.uint8))
    hh = GH; ww = max(1, int(round(img.width * GH / img.height)))
    img = img.resize((ww, hh), Image.LANCZOS)
    a2 = np.asarray(img, dtype=np.float32) / 255
    a2, _ = set_weight(a2, STROKE * GH)
    if flip_v:
        a2 = a2[::-1, :]
    m = a2 > 0.5
    k = scale_to / GH
    cons = []
    for loop in trace(m):
        pts = smooth_loop(loop)
        cons.append([(x * k + SIDE, (GH - y) * k) for x, y in pts])   # y up, baseline 0
    return cons, int(round(ww * k + 2 * SIDE))


def draw_glyph(cons):
    pen = TTGlyphPen(None)
    for c in cons:
        c = [(int(round(x)), int(round(y))) for x, y in c]
        dd = [c[0]] + [p for i, p in enumerate(c[1:], 1) if p != c[i - 1]]
        if len(dd) < 3:
            continue
        pen.moveTo(dd[0])
        for p in dd[1:]:
            pen.lineTo(p)
        pen.closePath()
    return pen.glyph()


def main():
    photo = Image.open(SRC)
    page = photo.crop(PAGE)
    ink = ink_of(page)
    H, W = ink.shape
    if PREVIEW: Image.fromarray(((1 - ink) * 255).astype(np.uint8)).save(PREVIEW.replace('.png', '-ink.png'))
    # BY CONNECTED INK, not by row bands: the X-Z row's tops dip into the P-V row's feet. Every letter on this page is
    # one unbroken blob (measured: exactly 25 over 60 px at half resolution, the smallest 3,582); specks dropped, then
    # read in order: sorted by height into rows of 8, 7, 7 and 3, each row left to right.
    half = ink[::2, ::2] > 0.5
    lab, sizes = components(half)
    big = max(sizes[1:])
    boxes = []
    for i, sz in enumerate(sizes[1:], 1):
        if sz < big * 0.04:
            continue
        ys, xs = np.where(lab == i)
        boxes.append([xs.min(), ys.min(), xs.max(), ys.max(), {i}])
    print('letters found', len(boxes))
    assert len(boxes) == 25, 'expected 25 letters, found %d' % len(boxes)
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    glyphs = {}
    at = 0
    for letters in ROWS:
        row = sorted(boxes[at:at + len(letters)], key=lambda b: b[0]); at += len(letters)
        for b, ch in zip(row, letters):
            keep = np.isin(lab, list(b[4]))
            keep = np.repeat(np.repeat(keep, 2, 0), 2, 1)[:H, :W]
            x0, y0, x1, y1 = b[0] * 2, b[1] * 2, b[2] * 2 + 2, b[3] * 2 + 2
            a = (ink * keep)[y0:y1, x0:x1]
            ys, xs = np.where(a > 0.5)
            glyphs[ch] = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    print('cut', ''.join(sorted(glyphs)))
    glyphs['W'] = glyphs['M']                                         # turned over below
    fb = FontBuilder(UPM, isTTF=True)
    order = ['.notdef', 'space']
    cmap = {32: 'space'}
    outl, adv = {}, {'.notdef': (500, 0), 'space': (340, 0)}
    outl['.notdef'] = []; outl['space'] = []
    for ch in sorted(glyphs):
        for lower in (False, True):
            name = ch + ('.sc' if lower else '')
            cons, w = glyph_from(glyphs[ch], CAP * (SC if lower else 1), flip_v=(ch == 'W'))
            outl[name] = cons; adv[name] = (w, SIDE); order.append(name)
            cmap[ord(ch.lower() if lower else ch)] = name
    for d in range(10):                                               # the HUD's drawn digits, same height as the capitals
        im = Image.open(os.path.join(HERE, '..', 'assets', 'hud', 'd%d.png' % d)).convert('RGBA').split()[-1]
        a = np.asarray(im, dtype=np.float32) / 255
        ys, xs = np.where(a > 0.5); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        cons, w = glyph_from(a, CAP)
        name = 'd%d' % d; outl[name] = cons; adv[name] = (w, SIDE); order.append(name); cmap[48 + d] = name
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf({n: draw_glyph(outl[n]) for n in order})
    fb.setupHorizontalMetrics({n: adv[n] for n in order})
    fb.setupHorizontalHeader(ascent=900, descent=-200)
    fb.setupNameTable({'familyName': 'Beachwalk Hand', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=900, sTypoDescender=-200, usWinAscent=950, usWinDescent=250, sCapHeight=CAP, sxHeight=int(CAP * SC))
    fb.setupPost()
    fb.font.flavor = 'woff'
    fb.save(OUT)
    print('wrote', OUT, os.path.getsize(OUT), 'bytes,', len(order), 'glyphs')
    if PREVIEW:
        # a sheet of the cut letters as they came off the paper (before tracing), for checking the cut
        cells = [Image.fromarray(((1 - glyphs[c]) * 255).astype(np.uint8)).resize((90, 110)) for c in sorted(glyphs)]
        sheet = Image.new('L', (90 * 9, 110 * 3), 255)
        for i, c in enumerate(cells):
            sheet.paste(c, ((i % 9) * 90, (i // 9) * 110))
        sheet.save(PREVIEW)


main()
