#!/usr/bin/env python3
"""THE DESERT TEMPLES' STONE (2026-11-21, the owner, with a render of a dry-stacked stone wall on a sphere: "can you do a new
texture for the temples in the desert like this"). A seamless tile of it, made here (no source maps came with the render):
flat dressed stones laid dry in courses of different heights — long and short, the joints between them half full of sand —
each stone's edges worn round and chipped, its face gritty, and the weather on it in dark blotches over the tan, as the
reference has; then a soft relief lit from above baked in (the game's stone is flat-shaded, with no normal map to carry it).
The game lays it on the temples in their own world space from three sides (`tmpStoneMat`), the courses level on every
pillar, ring and step, and keeps a little of the model's own baked carving under it.

    /usr/bin/python3 tools/temple_stone.py [size=768] [metres=3.0]   -> assets/temple-stone.webp
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd

N = int(sys.argv[1]) if len(sys.argv) > 1 else 768
M = float(sys.argv[2]) if len(sys.argv) > 2 else 3.0          # the tile's size in metres (the game's `uTS`)
PX = N / M
rng = np.random.default_rng(20261121)


def tnoise(n, cells, seed):
    """seamless value noise: a random grid of `cells`, wrapped, smoothly interpolated"""
    r = np.random.default_rng(seed).random((cells, cells))
    x = np.arange(n) / n * cells
    i0 = np.floor(x).astype(int); f = x - i0; f = f * f * (3 - 2 * f); i1 = (i0 + 1) % cells; i0 %= cells
    a = r[np.ix_(i0, i0)]; b = r[np.ix_(i0, i1)]; c = r[np.ix_(i1, i0)]; d = r[np.ix_(i1, i1)]
    fy, fx = f[:, None], f[None, :]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(n, base, octs, seed, g=0.5):
    out, w, tot = np.zeros((n, n)), 1.0, 0.0
    for o in range(octs):
        out += w * tnoise(n, base * 2 ** o, seed + o * 17); tot += w; w *= g
    return out / tot


# ---- THE COURSES: heights 0.10-0.22 m, the stones in them 0.22-0.95 m long, every joint a few px wide
ids = -np.ones((N, N), int)
y, k, stones = 0, 0, []
rows = []
while y < N:
    h = int(round(rng.uniform(0.10, 0.22) * PX))
    if N - y - h < int(0.09 * PX): h = N - y                   # (the last course takes the rest: the tile wraps)
    rows.append((y, h)); y += h
for (y0, h) in rows:
    x = int(rng.integers(0, N))                                # (each course starts anywhere: it wraps round)
    start = x
    while True:
        L = int(round((rng.uniform(0.12, 0.34) if rng.random() < 0.4 else rng.uniform(0.34, 0.95)) * PX))   # (short squarish ones among the long)
        if (x - start) + L > N - int(0.15 * PX): L = N - (x - start)
        for xx in range(x, x + L):
            ids[y0:y0 + h, xx % N] = k
        stones.append((x, y0, L, h)); k += 1; x += L
        if x - start >= N: break
# distance into each stone from its own edge (wrapped: the tile is padded with itself while it is measured)
pad = N // 4
idp = np.pad(ids, pad, mode='wrap')
edge = np.zeros_like(idp, bool)
edge[:-1, :] |= idp[:-1, :] != idp[1:, :]; edge[1:, :] |= idp[1:, :] != idp[:-1, :]
edge[:, :-1] |= idp[:, :-1] != idp[:, 1:]; edge[:, 1:] |= idp[:, 1:] != idp[:, :-1]
dist = nd.distance_transform_edt(~edge)[pad:-pad, pad:-pad]
# the joint: a gap 2-4 px wide, ragged; the edges worn round over ~0.035 m, and chipped
rough = fbm(N, 6, 4, 3)
chip = fbm(N, 24, 3, 9)
# ANCIENT (2026-11-21, the owner: "THE TEXTURES OF THE TEMPLE NEED TO LOOK MORE REALISTIC AND WORN THEY ARE SUPPOSED TO BE
# ANCIENT"): the edges eaten back irregularly (the stone's own edge wanders), chips bigger and far more of them, the
# rounding twice as deep, the faces pitted and cracked, sand packed into most joints, bleached stones and darkened ones
wob = (fbm(N, 18, 3, 13) - 0.5) * 7.0
gap = 1.3 + 1.8 * rough + np.clip(chip - 0.6, 0, 1) * 26 + np.clip(wob, 0, None)
wear = 0.065 * PX
inside = np.clip((dist - gap) / wear, 0, 1)
face = 1 - (1 - inside) ** 2                                  # (rounded: the height falls off toward the joint)
# each stone its own: a tilt, a bulge, a tone, a weather
tone = np.zeros((N, N)); weather = np.zeros((N, N)); tiltx = np.zeros((N, N)); tilty = np.zeros((N, N))
per = rng.random((k, 5))
tone = per[ids, 0]; dark = per[ids, 1]; tiltx = (per[ids, 2] - 0.5); tilty = (per[ids, 3] - 0.5)
# ---- HEIGHT: the faces proud of the joints, each a little tilted and lumpy, gritty
grit = fbm(N, 96, 3, 21)
lump = fbm(N, 14, 4, 33)
gy, gx = np.mgrid[0:N, 0:N] / N
height = face * (0.75 + 0.35 * lump + 0.06 * (tiltx * np.sin(gx * 40) + tilty * np.cos(gy * 40))) + 0.16 * grit * face
# pitting: the softer grains gone out of the face
pits = nd.gaussian_filter(np.clip((fbm(N, 90, 2, 91) - 0.7) * 5, 0, 1), 0.7) * face
height = height - 0.16 * pits
# cracks through about one stone in five: a jagged line across it, dark and sunk
from PIL import ImageDraw
crk = Image.new('L', (N, N), 0); dr = ImageDraw.Draw(crk)
for (sx, sy, L, h) in stones:
    if rng.random() > 0.2 or L < 0.25 * PX: continue
    x0 = sx + rng.uniform(0.1, 0.35) * L; x1 = sx + rng.uniform(0.6, 0.9) * L
    pts = []; nseg = 14; yy = sy + h * rng.uniform(0.3, 0.7)          # (a wandering hairline, not a zigzag)
    for i2 in range(nseg + 1):
        xx = x0 + (x1 - x0) * i2 / nseg; yy = min(sy + h * 0.9, max(sy + h * 0.1, yy + rng.normal(0, h * 0.06)))
        pts.append((xx % N, yy % N))
    for a2, b2 in zip(pts, pts[1:]):
        if abs(a2[0] - b2[0]) < N / 2: dr.line([a2, b2], fill=int(rng.uniform(120, 230)), width=1)
crack = nd.gaussian_filter(np.asarray(crk, float) / 255, 0.45) * face
height = height - 0.22 * crack
# ---- COLOUR: tan stone; the weather in dark blotches (bigger where the stone is darker); sand in the joints
tan = np.array([181, 160, 128]) / 255.0
tan2 = np.array([150, 130, 104]) / 255.0
grey = np.array([70, 68, 66]) / 255.0
sandc = np.array([196, 176, 140]) / 255.0
blot = fbm(N, 10, 5, 51)
blot2 = fbm(N, 28, 3, 57)
wmask = np.clip((blot * 0.75 + blot2 * 0.35 - (0.72 - 0.5 * dark)) * 3.2, 0, 1)        # (dark weather, patchy)
bleach = np.array([205, 192, 165]) / 255.0
base = tan[None, None, :] * (1 - tone[..., None]) * 0.6 + tan2[None, None, :] * (0.4 + tone[..., None] * 0.6)
bl = np.clip((per[ids, 4] - 0.7) * 3.3, 0, 1)                                            # (some stones sun-bleached pale)
base = base * (1 - bl[..., None] * 0.6) + bleach[None, None, :] * bl[..., None] * 0.6
base = base * (0.9 + 0.2 * lump[..., None])
col = base * (1 - wmask[..., None]) + grey[None, None, :] * (0.85 + 0.3 * grit[..., None]) * wmask[..., None]
col = col * (0.82 + 0.3 * grit[..., None])                                              # (the grit's speckle)
crust = np.clip((fbm(N, 22, 4, 101) - 0.62) * 3.5, 0, 1) * face                           # (pale salt crust in patches)
col = col * (1 - 0.35 * crust[..., None]) + bleach[None, None, :] * 0.35 * crust[..., None]
col = col * (1 - 0.22 * pits[..., None]) * (1 - 0.38 * crack[..., None])
# the joints: deep and dark between the stones — a little sand lodged in them here and there
joint = 1 - np.clip((dist - gap) / 1.4, 0, 1)                  # (the gap itself dark; the worn edge is the relief's, below)
sandy = np.clip((fbm(N, 40, 2, 77) - 0.42) * 3, 0, 1)            # (most joints packed with blown sand now)
jc = np.array([38, 34, 30]) / 255.0 * (1 - sandy[..., None]) + sandc[None, None, :] * 0.6 * sandy[..., None]
col = col * (1 - joint[..., None]) + jc * joint[..., None]
# ---- THE RELIEF, lit from above and a little to the left (the temple's light is overhead); and the joints' own shadow
dy = np.roll(height, -1, 0) - np.roll(height, 1, 0); dx = np.roll(height, -1, 1) - np.roll(height, 1, 1)
lit = 1 + 2.5 * (-dy * 0.9 - dx * 0.25)
ao = np.clip(0.55 + 0.45 * nd.uniform_filter(height, 9, mode='wrap') / max(1e-3, height.max()), 0, 1)
col = col * np.clip(lit, 0.55, 1.35)[..., None] * (0.7 + 0.3 * ao[..., None])
img = (np.clip(col, 0, 1) ** (1 / 1.0) * 255).astype(np.uint8)
Image.fromarray(img).save('assets/temple-stone.webp', 'WEBP', quality=80, method=6)
Image.fromarray(np.concatenate([np.concatenate([img, img], 1)] * 2, 0)).resize((N, N)).save('/tmp/temple-stone-2x2.jpg', quality=85)
import os
print('assets/temple-stone.webp', N, 'px over', M, 'm:', k, 'stones in', len(rows), 'courses,', os.path.getsize('assets/temple-stone.webp'), 'bytes')
