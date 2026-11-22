#!/usr/bin/env python3
"""THE SLIDER'S THUMB, HIS OWN DRAWN DOT (2026-11-21, the owner: IMG_7227 — a black marker dot with a little white eye in it,
"make this the little circle icon but white like how it is now on the settings sliders"). The marker turned white, the paper
showing through it (the eye) the menu's dark, everything outside the dot clear; the edge kept soft (coverage, not a cut).

    /usr/bin/python3 -E tools/pk_thumb_pack.py ~/Downloads/IMG_7227.PNG assets/hud/pk-thumb.png"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
SRC, OUT = sys.argv[1], sys.argv[2]
N = 64                                            # out px (drawn ~17 css px: sharp on a 3x screen)
DARK = np.array([5, 7, 11], np.float32) / 255     # the menu's own dark (#05070b)
im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32) / 255
im = im[1100:1400, 420:720]                       # the dot (the photo's black bars and the dark beyond the sheet left out)
g = im.mean(2)
ink = g < 0.35
lab, n = nd.label(ink); sz = nd.sum(ink, lab, range(1, n + 1)); blob = lab == 1 + int(np.argmax(sz))
ys, xs = np.nonzero(blob); cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
R = int(max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 + 8)
g = g[int(cy) - R:int(cy) + R, int(cx) - R:int(cx) + R]
blob = blob[int(cy) - R:int(cy) + R, int(cx) - R:int(cx) + R]
paper = np.median(g[~nd.binary_dilation(blob, iterations=6)])
inkv = np.median(g[nd.binary_erosion(blob, iterations=6)])
cov = np.clip((paper - g) / (paper - inkv), 0, 1)                 # how much marker each px is
sil = nd.binary_fill_holes(blob)                                    # the dot's whole shape
eye = sil & ~nd.binary_dilation(blob, iterations=1) | (nd.binary_erosion(sil, iterations=4) & (cov < 0.5))
eye = nd.binary_opening(eye, iterations=1)
lab, n = nd.label(eye)                                              # the eye: the paper inside, specks of grain left out
if n: sz = nd.sum(eye, lab, range(1, n + 1)); eye = np.isin(lab, [1 + i for i in range(n) if sz[i] > 60])
# the outer edge: the marker's coverage where it meets the paper, full inside the shape
inner = nd.binary_erosion(sil, iterations=3)
alpha = np.where(inner, 1.0, np.where(nd.binary_dilation(sil, iterations=3), cov, 0.0))
alpha = nd.gaussian_filter(alpha, 1.2); alpha[inner] = 1
eyeS = np.clip(nd.gaussian_filter(eye.astype(np.float32), 1.2), 0, 1)
rgb = (1 - eyeS)[..., None] * np.ones(3) + eyeS[..., None] * DARK
out = np.dstack([rgb, alpha[..., None]])
o = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
# (premultiplied resample, so the white never darkens at the edge)
a = o.getchannel('A'); pm = Image.fromarray((np.asarray(o, np.float32)[..., :3] * (np.asarray(a, np.float32)[..., None] / 255)).astype(np.uint8))
pm = pm.resize((N, N), Image.LANCZOS); a = a.resize((N, N), Image.LANCZOS)
A = np.asarray(a, np.float32)[..., None] / 255; C = np.asarray(pm, np.float32) / np.maximum(A, 1 / 255)
res = np.dstack([np.clip(C, 0, 255), A * 255]).astype(np.uint8)
res[A[..., 0] == 0, :3] = 255
Image.fromarray(res).save(OUT, optimize=True)
print('wrote', OUT, N, 'px; eye px', int(eye.sum()), 'of', int(sil.sum()))
