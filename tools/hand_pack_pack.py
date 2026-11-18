#!/usr/bin/env python3
"""The pack in the owner's hand (2026-11-18, "do 1 and 4 make it good"): every frame, line and mark of the inventory
drawn with the marker of his hotbar strip, as white alpha masks the page colours with CSS — the HUD's own method
(`tools/hand_hud_pack.py`, whose cutting and stroke-building this imports).

    arch -x86_64 python3 -E tools/hand_pack_pack.py HOTBAR.png OUTDIR

HOTBAR.png is IMG_7190 (the six-cell strip) at 2400 px wide: `sips -s format png -Z 2400 IMG_7190.HEIC --out hotbar.png`.
Pillow only. Every stroke carries the THICKNESS PROFILE of a line on the paper (the strip's top, bottom and walls), each
edge roughened on its own, so the weight wobbles the way his pen did; the shapes themselves are laid straight (the drawn
dividers kinked — see ui.md, "The hotbar's boxes are REBUILT").

Writes, at 2x the size the pack draws them:
  pk-slot1..6.png   288 x 288   the grid's cells (cycled by :nth-child, ~140 px at 1440 wide)
  pk-dash.png       288 x 288   a dashed cell: where the thing in your hand can go
  pk-sel.png        320 x 320   the selection: a loop circled round the cell, ends overlapping
  pk-big.png        400 x 400   the selection's picture in the pane
  pk-btn1..3.png    640 x 96    the pane's verbs (Inspect / Hold / Drop ...)
  pk-leave.png      240 x 88    Leave
  pk-ring1..2.png   168 x 168   the ring slots, round
  pk-kc.png         580 x 480   the keychain's box
  pk-rule1..2.png   2600 x 20   the panel's top and bottom lines, and the rings' rule
  pk-vrule.png      20 x 1300   the line between the grid and the pane
  pk-short1..2.png  640 x 16    the short lines: the name's underline, the rules round what a thing does
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import hand_hud_pack as H

K = 4   # drawn at 4x, reduced


def profiles(path):
    img = Image.open(path)
    m = H.keep_largest(H.ink_mask(img, H.HOTBAR_BOX))
    m = H.tight(H.deskew(H.tight(m, 2)), 0)
    w, h = m.size
    mid = m.crop((0, int(h * 0.3), w, int(h * 0.7)))
    walls = H.segments(mid.point(lambda v: 255 if v > 128 else 0), gap=6, minw=8)
    top = H.profile_rows(m, 0, int(h * 0.3))
    bot = H.profile_rows(m, int(h * 0.7), h)
    sides = [H.profile_cols(m, a - 20, b + 20, h) for a, b in walls]
    # one long horizontal profile: the strip's top and bottom lines end to end, and one long vertical: every wall
    return top, bot, sides, top + bot[::-1], [v for s in sides for v in s]


def noise(rnd, n, amp=0.55, keep=0.92):
    out, v = [], 0.0
    for _ in range(n):
        v = v * keep + rnd.uniform(-1, 1) * amp
        out.append(v)
    return out


def finish(img, ow, oh, blur=1.0):
    return img.filter(ImageFilter.GaussianBlur(blur)).resize((ow, oh), Image.LANCZOS)


def box(ow, oh, t, P, seed, inset=None):
    """A cell or a button: H.draw_box with the strip's lines, picked by seed so no two cells share a wall."""
    top, bot, sides, _, _ = P
    rnd = random.Random(seed)
    i = rnd.randrange(len(sides)); j = (i + 1 + rnd.randrange(len(sides) - 1)) % len(sides)
    a = rnd.randrange(max(1, len(top) // 2)); b = rnd.randrange(max(1, len(bot) // 2))
    return H.draw_box(sides[i], sides[j], top[a:] + top[:a], bot[b:] + bot[:b], ow, oh, t, seed=seed)


def rule(ow, oh, t, prof, seed, vertical=False):
    """One straight stroke the length of the canvas, its weight the drawn profile, its ends lifted like a pen's."""
    rnd = random.Random(seed)
    L, T = (oh if vertical else ow) * K, t * K
    C = (ow if vertical else oh) * K / 2
    img = Image.new('L', (ow * K, oh * K)); d = ImageDraw.Draw(img)
    p = H._resample(prof[rnd.randrange(len(prof) // 3):] + prof, L)
    na, nb = noise(rnd, L), noise(rnd, L)
    tilt = rnd.uniform(-1, 1) * T * 0.6
    for i in range(L):
        u = i / L
        end = min(1.0, u / 0.012, (1 - u) / 0.02) ** 0.5          # the start comes down fast, the end lifts off
        half = T * p[i] / 2 * end
        c = C + tilt * (u - 0.5)
        lo, hi = c - half + na[i], c + half + nb[i]
        if vertical: d.line((lo, i, hi, i), fill=255)
        else: d.line((i, lo, i, hi), fill=255)
    return finish(img, ow, oh)


def loop(ow, oh, t, prof, seed, sq=4.0, margin=0.1, over=0.32, wob=0.012, turn=0.03):
    """A closed loop drawn the way a hand circles something: a superellipse (|x|^sq + |y|^sq = 1; 2 is a circle, 4 hugs
    a square), its radius wandering a little, its weight the drawn profile, and it does not quite meet itself — the pen
    runs on past the start by `over` radians and lifts, a little outside the line it began."""
    rnd = random.Random(seed)
    W, Hh, T = ow * K, oh * K, t * K
    img = Image.new('L', (W, Hh)); d = ImageDraw.Draw(img)
    cx, cy = W / 2 + rnd.uniform(-1, 1) * W * 0.004, Hh / 2 + rnd.uniform(-1, 1) * Hh * 0.004
    rx, ry = W / 2 * (1 - margin) - T, Hh / 2 * (1 - margin) - T
    start = rnd.uniform(0, 2 * math.pi)
    span = 2 * math.pi + over
    n = int(2 * math.pi * max(rx, ry) * 1.6 * span / (2 * math.pi))
    p = H._resample(prof, n)
    ph = [rnd.uniform(0, 2 * math.pi) for _ in range(3)]
    jr = noise(rnd, n)                                     # the edge's own roughness, in px at 4x, as the boxes'
    rot = rnd.choice((-1, 1)) * turn * rnd.uniform(0.6, 1)
    for i in range(n):
        u = i / n
        a = start + span * u
        c, s = math.cos(a), math.sin(a)
        r = 1 / ((abs(c) ** sq + abs(s) ** sq) ** (1 / sq))
        # a slow wander (two, three and five bumps round the loop), and the overrun rides a little outside the start
        drift = 1 + wob * (math.sin(2 * a + ph[0]) * 0.6 + math.sin(3 * a + ph[1]) * 0.3 + math.sin(5 * a + ph[2]) * 0.15) + 0.03 * u
        x, y = c * (r * rx * drift + jr[i]), s * (r * ry * drift + jr[i])
        x, y = x * math.cos(rot) - y * math.sin(rot), x * math.sin(rot) + y * math.cos(rot)
        end = min(1.0, u / 0.015, (1 - u) / 0.05) ** 0.6
        rr = T * p[i] / 2 * end
        if rr > 0.3: d.ellipse((cx + x - rr, cy + y - rr, cx + x + rr, cy + y + rr), fill=255)
    return finish(img, ow, oh)


def dashed(m, period):
    """Cut a box's ink into dashes along each side (a band by the nearest edge decides which way runs along)."""
    w, h = m.size
    out = Image.new('L', (w, h)); op, mp = out.load(), m.load()
    for y in range(h):
        for x in range(w):
            v = mp[x, y]
            if not v: continue
            dx, dy = min(x, w - 1 - x), min(y, h - 1 - y)
            along = x if dy < dx else y
            ph = (along / period) % 1.0
            op[x, y] = v if ph < 0.58 else 0
    return out


def main():
    src, out = sys.argv[1:3]
    os.makedirs(out, exist_ok=True)
    P = profiles(src)
    top, bot, sides, longh, longv = P
    save = lambda m, n: H.save_alpha(m, os.path.join(out, n))
    for i in range(6):
        save(box(288, 288, 5.0, P, 40 + i), 'pk-slot%d.png' % (i + 1))
    save(dashed(box(288, 288, 5.0, P, 61), 288 / 9), 'pk-dash.png')
    save(loop(320, 320, 6.0, longh, 7, sq=3.6, margin=0.04, over=0.75, wob=0.03, turn=0.05), 'pk-sel.png')
    save(box(400, 400, 5.4, P, 70), 'pk-big.png')
    for i in range(3):
        save(box(640, 96, 4.6, P, 80 + i), 'pk-btn%d.png' % (i + 1))
    save(box(240, 88, 4.4, P, 90), 'pk-leave.png')
    for i in range(2):
        save(loop(168, 168, 4.6, longh, 100 + i, sq=2.0, margin=0.03, over=0.28, wob=0.02), 'pk-ring%d.png' % (i + 1))
    save(box(580, 480, 5.0, P, 110), 'pk-kc.png')
    for i in range(2):
        save(rule(2600, 20, 3.6, longh, 120 + i), 'pk-rule%d.png' % (i + 1))
    save(rule(20, 1300, 3.4, longv, 130, vertical=True), 'pk-vrule.png')
    for i in range(2):
        save(rule(640, 16, 3.4, longh, 140 + i), 'pk-short%d.png' % (i + 1))
    print('wrote', sorted(f for f in os.listdir(out) if f.startswith('pk-')))


if __name__ == '__main__':
    main()
