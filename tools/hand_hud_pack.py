#!/usr/bin/env python3
"""The owner's hand-drawn HUD (2026-11-17): marker on paper, photographed, cut
into alpha masks the page colours with CSS (`mask-image` + a background colour),
so the ink can be moonlight, red or blood-blue as the HUD needs.

    python3 -I tools/hand_hud_pack.py HEALTH.png STAMINA.png HOTBAR.png DIGITS.png OUTDIR

Each input is the photo converted to PNG at 2400 px wide
(`sips -s format png -Z 2400 IMG_7188.HEIC --out health.png`). The crop boxes
below are in that 2400-wide frame. Pillow only (no numpy on this machine).

Writes, at 2x the size the HUD draws them:
  hp1..hp4-ink.png / -shape.png   168 x 32   (the four health boxes, #health i 84 x 16)
  stam-ink.png / stam-shape.png   840 x 30   (#stamina 420 x 15)
  slot1..slot6-ink.png            144 x 144  (#hotbar .slot 72 x 72)
  d0..d9.png, dx.png              64 tall    (the blood-jar count)
"""
import sys, os, math, random
from PIL import Image, ImageFilter, ImageDraw, ImageChops

HEALTH_BOXES = [(344, 740, 728, 892), (780, 740, 1156, 892), (1208, 732, 1612, 890), (1688, 724, 2022, 870)]
STAM_BOX = (556, 732, 1818, 956)
HOTBAR_BOX = (436, 830, 2070, 1176)
DIGIT_BOX = (200, 390, 2160, 670)


def ink_mask(img, box, pad=6):
    """Soft ink alpha (255 = ink) for a crop, against a local paper estimate."""
    x0, y0, x1, y1 = box
    g = img.convert('L').crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
    w, h = g.size
    sm = g.resize((max(1, w // 8), max(1, h // 8)), Image.BOX)
    bg = sm.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(3)).resize((w, h), Image.BILINEAR)
    gp, bp = g.load(), bg.load()
    out = Image.new('L', (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r = gp[x, y] / max(1, bp[x, y])
            a = (0.60 - r) / 0.18
            op[x, y] = 0 if a <= 0 else 255 if a >= 1 else int(a * 255)
    out = out.filter(ImageFilter.MedianFilter(5))
    # anything touching the pad is not ours
    return out


def keep_largest(m):
    """Drop specks: keep components bigger than a few percent of the largest."""
    b = m.point(lambda v: 255 if v >= 128 else 0)
    w, h = b.size
    px = b.load()
    seen = Image.new('L', (w, h)); sp = seen.load()
    comps = []
    for y in range(h):
        for x in range(w):
            if px[x, y] and not sp[x, y]:
                stack = [(x, y)]; sp[x, y] = 1; pts = []
                while stack:
                    cx, cy = stack.pop(); pts.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not sp[nx, ny]:
                            sp[nx, ny] = 1; stack.append((nx, ny))
                comps.append(pts)
    if not comps:
        return m
    big = max(len(c) for c in comps)
    keep = Image.new('L', (w, h)); kp = keep.load()
    for c in comps:
        if len(c) >= big * 0.04:
            for p in c:
                kp[p] = 255
    keep = keep.filter(ImageFilter.MaxFilter(5))
    return ImageChops.multiply(m, keep)


def row_centroid(m, xa, xb):
    reg = m.crop((xa, 0, xb, m.size[1])).resize((1, m.size[1]), Image.BOX)
    vals = [reg.getpixel((0, y)) for y in range(m.size[1])]
    s = sum(vals)
    return sum(y * v for y, v in enumerate(vals)) / s if s else m.size[1] / 2


def deskew(m):
    """Level a drawing that was drawn on a slope (shear in y)."""
    w, h = m.size
    q = max(4, w // 5)
    ya, yb = row_centroid(m, 0, q), row_centroid(m, w - q, w)
    slope = (yb - ya) / (w - q)
    if abs(slope) < 0.004:
        return m
    grow = int(abs(slope) * w) + 2
    # output (x, y) reads input (x, y + slope x + f)
    return m.transform((w, h + grow), Image.AFFINE,
                       (1, 0, 0, slope, 1, -grow if slope > 0 else 0), resample=Image.BICUBIC)


def tight(m, pad=0):
    bb = m.point(lambda v: 255 if v >= 60 else 0).getbbox()
    x0, y0, x1, y1 = bb
    return m.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))


def stroke_width(m):
    """Mean stroke thickness of an outline drawing: ink area over the midline length."""
    b = m.point(lambda v: 255 if v >= 128 else 0)
    area = sum(1 for v in b.getdata() if v)
    w, h = b.size
    # a closed box: midline ~ perimeter, t ~ area / (2(w + h) - 4t) -> solve
    p = 2 * (w + h)
    return (p - math.sqrt(max(0, p * p - 16 * area))) / 8


def set_stroke(m, target):
    t = stroke_width(m)
    d = int(round((t - target) / 2))
    if d > 0:
        m = m.filter(ImageFilter.MinFilter(2 * d + 1))
    elif d < 0:
        m = m.filter(ImageFilter.MaxFilter(-2 * d + 1))
    return m


def shape_of(ink):
    """The filled silhouette: everything the flood from outside cannot reach."""
    w, h = ink.size
    pad = Image.new('L', (w + 4, h + 4), 0)
    pad.paste(ink.point(lambda v: 255 if v >= 110 else 0), (2, 2))
    ImageDraw.floodfill(pad, (0, 0), 128)
    out = pad.point(lambda v: 0 if v == 128 else 255).crop((2, 2, w + 2, h + 2))
    # soften the outer edge the same way the ink is soft
    return ImageChops.lighter(out.filter(ImageFilter.MinFilter(3)), ink)


def fit3(m, ow, oh, cap=None):
    """Scale to height oh keeping aspect, then stretch only the middle third
    horizontally to width ow, so the ends keep the drawn stroke's weight."""
    w, h = m.size
    sw = max(2, round(w * oh / h))
    s = m.resize((sw, oh), Image.LANCZOS)
    if sw >= ow:
        return s.resize((ow, oh), Image.LANCZOS)
    c = cap or min(sw // 3, oh * 2)
    out = Image.new('L', (ow, oh))
    out.paste(s.crop((0, 0, c, oh)), (0, 0))
    out.paste(s.crop((sw - c, 0, sw, oh)), (ow - c, 0))
    out.paste(s.crop((c, 0, sw - c, oh)).resize((ow - 2 * c, oh), Image.BICUBIC), (c, 0))
    return out


def _clean(prof):
    """Clamp a thickness profile to the usual stroke (jogs and crossings read as fat) and smooth it a little."""
    vals = sorted(v for v in prof if v > 0)
    if not vals:
        return [1.0] * len(prof)
    med = vals[len(vals) // 2]
    p = [min(max(v, med * 0.6), med * 1.3) / med for v in prof]
    out = []
    for i in range(len(p)):
        seg = p[max(0, i - 3):i + 4]
        out.append(sum(seg) / len(seg))
    return out


def profile_rows(m, y0, y1):
    """Per column: how much ink in rows y0..y1 (a horizontal line's thickness)."""
    reg = m.crop((0, y0, m.size[0], y1))
    col = reg.resize((reg.size[0], 1), Image.BOX)
    return _clean([col.getpixel((x, 0)) * (y1 - y0) / 255 for x in range(reg.size[0])])


def profile_cols(m, x0, x1, h):
    """Per row: how much ink in columns x0..x1 (a vertical line's thickness), middle rows only."""
    x0 = max(0, x0); x1 = min(m.size[0], x1)
    reg = m.crop((x0, int(h * 0.18), x1, int(h * 0.82)))
    row = reg.resize((1, reg.size[1]), Image.BOX)
    return _clean([row.getpixel((0, y)) * (x1 - x0) / 255 for y in range(reg.size[1])])


def _resample(p, n):
    return [p[min(len(p) - 1, int(i * len(p) / n))] for i in range(n)]


def draw_box(left, right, top, bottom, ow, oh, t, seed=0):
    """Four straight strokes, each t px thick at the output size times its drawn profile,
    with each edge roughened on its own so the stroke is not a ruled line. Drawn at 4x, then reduced."""
    k = 4
    W, H, T = ow * k, oh * k, t * k
    rnd = random.Random(seed)
    img = Image.new('L', (W, H)); d = ImageDraw.Draw(img)

    def noise(n):
        # a slow wander, a few px at 4x
        out, v = [], 0.0
        for _ in range(n):
            v = v * 0.92 + rnd.uniform(-1, 1) * 0.55
            out.append(v)
        return out

    def stroke(prof, n, along_x, c):
        prof = _resample(prof, n)
        na, nb = noise(n), noise(n)
        tilt = rnd.uniform(-1, 1) * T * 0.3      # a hand's line is never quite square to the page
        for i in range(n):
            half = T * prof[i] / 2
            cc = c + tilt * (i / n - 0.5)
            lo, hi = cc - half + na[i], cc + half + nb[i]
            if along_x:
                d.line((i, lo, i, hi), fill=255)
            else:
                d.line((lo, i, hi, i), fill=255)

    m = T * 0.65 + 2
    stroke(top, W, True, m)
    stroke(bottom, W, True, H - m)
    stroke(left, H, False, m)
    stroke(right, H, False, W - m)
    return img.filter(ImageFilter.GaussianBlur(1.0)).resize((ow, oh), Image.LANCZOS)


def save_alpha(m, path):
    img = Image.new('RGBA', m.size, (255, 255, 255, 0))
    img.putalpha(m)
    img.save(path, optimize=True)


def frame(img, box, ow, oh, target_px, three=True):
    """Cut one outline drawing: ink + filled shape, both ow x oh."""
    m = keep_largest(ink_mask(img, box))
    m = tight(deskew(tight(m, 2)), 0)
    scale = oh / m.size[1]
    # THE FILLED SHAPE COMES FROM THE FULL-WEIGHT LINE (2026-11-17: thinned to 1.8 px, the first health box's outline
    # opened at a thin spot, the flood from outside ran in, and its shape was the line alone — the box drew EMPTY at
    # full health, "i just started with a health missing"). Shape first, then the line thinned on the same canvas, and
    # the shape pulled in by the same amount so their outer edges still meet.
    sh = shape_of(m)
    d = int(round((stroke_width(m) - target_px / scale) / 2))
    m = set_stroke(m, target_px / scale)
    if d > 0:
        sh = sh.filter(ImageFilter.MinFilter(2 * d + 1))
    bb = sh.point(lambda v: 255 if v >= 60 else 0).getbbox()
    m, sh = m.crop(bb), sh.crop(bb)
    if three:
        return fit3(m, ow, oh), fit3(sh, ow, oh)
    return m.resize((ow, oh), Image.LANCZOS), sh.resize((ow, oh), Image.LANCZOS)


def segments(m, gap=10, minw=12):
    """Columns that hold ink, split into runs."""
    w, h = m.size
    col = m.resize((w, 1), Image.BOX)
    on = [col.getpixel((x, 0)) > 2 for x in range(w)]
    runs, x = [], 0
    while x < w:
        if on[x]:
            a = x
            while x < w and on[x]:
                x += 1
            runs.append([a, x])
        x += 1
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < gap:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return [r for r in merged if r[1] - r[0] >= minw]


def main():
    hp_p, st_p, hb_p, dg_p, out = sys.argv[1:6]
    os.makedirs(out, exist_ok=True)

    hp = Image.open(hp_p)
    for i, b in enumerate(HEALTH_BOXES):
        ink, sh = frame(hp, b, 168, 32, 3.6)        # ~1.8 px of ink at 84 x 16 (2.6 until 2026-11-17: "a little thinner and more subtle")
        save_alpha(ink, f'{out}/hp{i + 1}-ink.png'); save_alpha(sh, f'{out}/hp{i + 1}-shape.png')

    st = Image.open(st_p)
    ink, sh = frame(st, STAM_BOX, 840, 30, 3.2)     # ~1.6 px at 420 x 15 (2.2 until 2026-11-17)
    save_alpha(ink, f'{out}/stam-ink.png'); save_alpha(sh, f'{out}/stam-shape.png')

    hb = Image.open(hb_p)
    m = keep_largest(ink_mask(hb, HOTBAR_BOX))
    m = tight(deskew(tight(m, 2)), 0)
    # the cells: the walls are the tall dark columns of the strip
    w, h = m.size
    mid = m.crop((0, int(h * 0.3), w, int(h * 0.7)))
    walls = segments(mid.point(lambda v: 255 if v > 128 else 0), gap=6, minw=8)
    print('hotbar walls', walls)
    # STRAIGHT BOXES (2026-11-17, the owner: "the hotbar looks bad fix the boxes and make them more straight i cant even
    # see the number of the item"): each cell is rebuilt from four dead-straight strokes, and each stroke carries the
    # weight wobble of the matching line on the paper (its thickness, row by row or column by column), so the marker
    # still shows but the kinks and jogs of the drawn dividers do not.
    tline = profile_rows(m, 0, int(h * 0.3))
    bline = profile_rows(m, int(h * 0.7), h)
    for i in range(len(walls) - 1):
        la, lb = walls[i]; ra, rb = walls[i + 1]
        left = profile_cols(m, la - 20, lb + 20, h)
        right = profile_cols(m, ra - 20, rb + 20, h)
        cell = draw_box(left, right, tline[lb:ra], bline[lb:ra], 144, 144, 5.0, seed=i)
        save_alpha(cell, f'{out}/slot{i + 1}-ink.png')

    dg = Image.open(dg_p)
    m = ink_mask(dg, DIGIT_BOX)
    m = tight(m, 4)
    segs = segments(m, gap=14, minw=14)
    if len(segs) == 10:
        # the 1 and 0 of "10" sit close: split the last run where its ink is thinnest
        a, b = segs[-1]
        sub = segments(m.crop((a, 0, b, m.size[1])), gap=1, minw=10)
        if len(sub) >= 2:
            segs = segs[:-1] + [[a + sub[0][0], a + sub[0][1]], [a + sub[-1][0], a + sub[-1][1]]]
        else:
            col = m.crop((a, 0, b, m.size[1])).resize((b - a, 1), Image.BOX)
            lo = min(range(int((b - a) * 0.25), int((b - a) * 0.6)), key=lambda x: col.getpixel((x, 0)))
            segs = segs[:-1] + [[a, a + lo], [a + lo, b]]
    print('digit segments', len(segs), segs)
    names = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '1b', '0']
    H = 64
    s = H / m.size[1]
    stroke = 0
    for name, (a, b) in zip(names, segs):
        if name == '1b':
            continue
        g = m.crop((a - 4, 0, b + 4, m.size[1]))
        if name == '1':
            # the stem's thickness, for the drawn x
            row = g.crop((0, g.size[1] // 2, g.size[0], g.size[1] // 2 + 1))
            stroke = int(sum(1 for v in row.getdata() if v > 128) * 1.5)
        g = g.resize((max(4, round(g.size[0] * s)), H), Image.LANCZOS)
        save_alpha(g, f'{out}/d{name}.png')
    # no x was drawn: one in the same marker, two wobbling strokes with round ends
    rnd = random.Random(7)
    xh = int(m.size[1] * 0.58)
    xw = int(xh * 0.82)
    big = Image.new('L', (xw + stroke * 2, m.size[1]))
    d = ImageDraw.Draw(big)
    top = m.size[1] - xh - int(m.size[1] * 0.06)
    for (p0, p1) in (((stroke, top), (xw + stroke, top + xh)), ((xw + stroke, top + stroke // 2), (stroke * 1.1, top + xh))):
        pts = []
        for k in range(9):
            t = k / 8
            pts.append((p0[0] + (p1[0] - p0[0]) * t + rnd.uniform(-2, 2), p0[1] + (p1[1] - p0[1]) * t + rnd.uniform(-2, 2)))
        r = stroke / 2
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            d.line((ax, ay, bx, by), fill=255, width=int(stroke))
        for (px, py) in pts:
            d.ellipse((px - r, py - r, px + r, py + r), fill=255)
    big = big.filter(ImageFilter.GaussianBlur(1.2))
    big = big.resize((max(4, round(big.size[0] * s)), H), Image.LANCZOS)
    save_alpha(big, f'{out}/dx.png')


if __name__ == '__main__':
    main()
