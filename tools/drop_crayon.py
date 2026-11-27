#!/usr/bin/env python3
"""The water ball's drop, in crayon (2026-11-23, the owner sent a stock picture of a blue oil-pastel water drop: "use this as the
icon but make it a little lighter blue to stand out"). The picture is a stock site's, behind its licence, so this DRAWS one in
that manner instead of lifting it: a teardrop scribbled full of short pastel strokes, darker at its rim and lighter in a pool
low in its belly, the paper's tooth showing through as pale specks and its edge left fibrous. Lighter than the picture's blue.

    python3 -I tools/drop_crayon.py assets/hud

Writes `drop-crayon.png`, 72 x 90 (2x the 36 x 45 the HUD draws it). Pillow only; seeded, so it comes out the same every time.
"""
import sys, os, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops

W, H, SS = 72, 90, 4
BW, BH = W * SS, H * SS
random.seed(7)

# lighter than the picture's royal blue: a sky-to-sea blue, with near-white lights
DARK = [(38, 112, 214), (46, 126, 226), (32, 98, 196)]
MID = [(66, 150, 238), (78, 162, 244), (58, 140, 232), (90, 172, 248)]
LIGHT = [(130, 196, 255), (152, 210, 255), (112, 184, 252)]
SPECK = (214, 234, 255)


def drop_pt(t, R, cx, cy, jit=0.0):
    x = 1.02 * R * math.sin(t) * abs(math.sin(t / 2)) ** 1.75
    y = -R * math.cos(t)
    s = 1 + jit
    return cx + x * s, cy + y * s


def main(out):
    cx, cy, R = BW / 2, BH / 2 + 8, BH * 0.455
    # the shape, its outline jittered finely (a pastel's edge is never a line)
    n = 720
    jit = [0.0] * n
    for k in range(n):
        jit[k] = random.uniform(-0.028, 0.028)
    for _ in range(2):   # a little smoothing, so it is ragged, not noisy
        jit = [(jit[k - 1] + 2 * jit[k] + jit[(k + 1) % n]) / 4 for k in range(n)]
    pts = [drop_pt(2 * math.pi * k / n, R, cx, cy, jit[k]) for k in range(n)]
    shape = Image.new('L', (BW, BH), 0)
    ImageDraw.Draw(shape).polygon(pts, fill=255)
    inside = shape.load()

    col = Image.new('RGB', (BW, BH), MID[0])
    d = ImageDraw.Draw(col)
    # the light pool: low and a little left of centre, like light through the water
    lx, ly, lr = cx - R * 0.08, cy + R * 0.28, R * 0.42

    def pick(x, y):
        # distance to the rim, roughly: how far in from the outline, via the shape's own coverage around the point
        dl = math.hypot(x - lx, y - ly) / lr
        u = random.random()
        if dl < 1 and u < 0.75 * (1 - dl) + 0.12:
            return random.choice(LIGHT)
        rim = abs(x - cx) / (R * 0.8) + max(0, (cy + R * 0.6 - y)) / (R * 2.2) * 0.3
        if u < 0.18 + 0.4 * max(0, rim - 0.55):
            return random.choice(DARK)
        return random.choice(MID)

    # the scribble: thousands of short strokes, mostly one hatch direction, some following the round of the drop
    for i in range(5200):
        while True:
            x, y = random.uniform(0, BW), random.uniform(0, BH)
            if inside[int(x), int(y)]:
                break
        if random.random() < 0.65:
            a = math.radians(-58 + random.gauss(0, 18))
        else:
            a = math.atan2(y - cy, x - cx) + math.pi / 2 + random.gauss(0, 0.3)
        L = random.uniform(6, 26)
        w = random.choice((2, 3, 3, 4, 5))
        d.line((x - math.cos(a) * L / 2, y - math.sin(a) * L / 2, x + math.cos(a) * L / 2, y + math.sin(a) * L / 2), fill=pick(x, y), width=w)

    # the paper's tooth: pale specks where the pastel skipped
    tooth = Image.effect_noise((BW // 2, BH // 2), 90).resize((BW, BH), Image.NEAREST).filter(ImageFilter.GaussianBlur(1.2))
    specks = tooth.point(lambda v: 255 if v > 192 else 0).filter(ImageFilter.GaussianBlur(0.8))
    col = Image.composite(Image.new('RGB', (BW, BH), SPECK), col, specks.point(lambda v: int(v * 0.55)))

    # the edge: soft, and fibrous where the strokes ran over it
    edge = shape.filter(ImageFilter.GaussianBlur(3.5))
    fib = Image.effect_noise((BW, BH), 120).filter(ImageFilter.GaussianBlur(1.0))
    rough = ImageChops.multiply(edge.point(lambda v: min(255, int(v * 1.6))), fib.point(lambda v: min(255, int(v * 1.9))))
    alpha = ImageChops.lighter(shape.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(1.5)), rough)
    alpha = ImageChops.multiply(alpha, shape.filter(ImageFilter.MaxFilter(13)))   # nothing far outside it

    img = col.convert('RGBA')
    img.putalpha(alpha)
    img = img.resize((W, H), Image.LANCZOS)
    img.save(os.path.join(out, 'drop-crayon.png'), optimize=True)
    print('drop-crayon.png', img.size)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'assets/hud')
