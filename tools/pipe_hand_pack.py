#!/usr/bin/env python3
"""THE REACH THROUGH THE GRATE, HIS OWN ARM (2026-11-19, the owner: IMG_8446 — "trim this hand out again and make it the
grab for the sewer screwdriver instead of the model you have. make it just like we have been with the retro style and same
time as the sewer grab is now make sure its clean cut").

    W=<work dir>
    ffmpeg -i IMG_8446.MOV -vf "fps=12,scale=640:-2" $W/v/%03d.png          (the clip is portrait: 640 x 1138)
    swift tools/scene_cutout.swift labels $W/v $W/lab
    /usr/bin/python3 -E tools/pipe_hand_pack.py $W assets/hud

Frames FIRST..GRAB (the reach out to the blue thing on the table, his fingers closing on it). The pull-back the clip films
is a motion-blurred smear the cut loses, so main.js plays the reach backward for it. The
knee (black trousers) Vision lumps in with the arm is cut off below `YCUT`, a line main.js keeps under the screen. Per frame: Vision's instances that
come in from the left or bottom edge and are not the table's wood (a table instance reaches the left edge in the early
frames); the blue thing out (the game's screwdriver is in his fingers instead); one piece, holes filled, the edge a
pixel inside. main.js lays the frame with the clip's left border and
`YCUT` off the screen, so neither is ever seen. Then box-downscaled to `S` (about the game's own
pixel: its low-res frame is the retro look), the outline smoothed, no dark ring (the clean cut the owner asked for).
Writes pipe-hand.webp (a sheet) and pipe-hand.json: each frame's rect and offset, and the fingertip and the arm's root
in the padded frame's sprite px (main.js maps tip -> the screwdriver on screen, root -> off the screen's bottom-left)."""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as nd

W, OUT = sys.argv[1], sys.argv[2]
FIRST, GRAB, CLOSE = 14, 66, 70          # the reach; his fingers on it; closed
PAD = 0                                  # (the frame lands with its left and bottom borders off the screen)
S = 0.6                                  # sprite px per frame px (about the game's own pixel on screen: it draws at 0.62)
LEVELS = 9                               # (unused: the game's own low-res frame pixelates it — a dither of its own aliased into moire)
YCUT = 850                               # his knee (black trousers) is in the frame below ~870: cut here, main.js lays this line under the screen
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16 - 0.5


def load(i):
    im = np.asarray(Image.open(f'{W}/v/{i:03d}.png').convert('RGB')).astype(np.float32) / 255
    L = np.asarray(Image.open(f'{W}/lab/{i:03d}.png').resize((im.shape[1], im.shape[0]), Image.NEAREST))
    return im, L


def arm_mask(im, L):
    h, w = L.shape
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    mx, mn = im.max(2), im.min(2); sat = (mx - mn) / (mx + 1e-4)
    hue_wood = (r > g) & (g > b) & (sat > 0.32) & (mx > 0.35)
    m = np.zeros((h, w), bool)
    for k in set(np.unique(L).tolist()) - {0}:
        c = L == k
        ys, xs = np.nonzero(c)
        if not (xs.min() < 0.03 * w or ys.max() > 0.97 * h): continue      # comes in from the left or the bottom
        if hue_wood[c].mean() > 0.35: continue                              # the table
        m |= c
    blue = (b > r + 0.08) & (b > g + 0.02) & (mx > 0.35)
    white = (mx > 0.8) & (r - b < 0.11)          # the blue thing's white cap, the candle and the book behind his hand (his skin, however bright, is warm: r-b >= 0.16)
    m &= ~nd.binary_dilation(blue | white, iterations=3)
    m[YCUT:] = False
    m = nd.binary_opening(m, iterations=2)
    lab, n = nd.label(m)
    if n > 1:
        sz = nd.sum(m, lab, range(1, n + 1)); m = lab == (1 + int(np.argmax(sz)))
    return nd.binary_fill_holes(m)


def pad(im, m):
    """the frame carried on past its left and bottom borders: edge pixels replicated, falling into shadow"""
    imP = np.pad(im, ((0, PAD), (PAD, 0), (0, 0)), mode='edge')
    mP = np.pad(m, ((0, PAD), (PAD, 0)), mode='edge')
    h, w = m.shape
    yy, xx = np.mgrid[0:h + PAD, 0:w + PAD]
    d = np.maximum(np.maximum(PAD - xx, 0), np.maximum(yy - (h - 1), 0)).astype(np.float32)
    k = (0.35 + 0.65 * np.exp(-d / 40.0))[..., None]
    return imP * k, mP


def retro(rgb, m):
    """box-downscaled; the outline smoothed (Vision's ragged knuckles rounded) and a pixel inside; the colour carried on out
    past the edge (filtered, the edge never pulls in black)"""
    h, w = m.shape; rw, rh = int(round(w * S)), int(round(h * S))
    c = np.asarray(Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).resize((rw, rh), Image.BOX), np.float32) / 255
    ms = nd.gaussian_filter(nd.binary_erosion(m, iterations=2).astype(np.float32), 3.0) > 0.5
    a = np.asarray(Image.fromarray((ms * 255).astype(np.uint8)).resize((rw, rh), Image.BOX), np.float32) / 255 > 0.5
    a = nd.binary_opening(a, iterations=1)
    inner = nd.binary_erosion(a, iterations=1)
    if inner.any():
        idx = nd.distance_transform_edt(~inner, return_distances=False, return_indices=True)
        c = c[idx[0], idx[1]]
    out = np.zeros((rh, rw, 4), np.uint8); out[..., :3] = (np.clip(c, 0, 1) * 255).astype(np.uint8); out[..., 3] = a * 255
    return out


def grip():
    """where the blue thing sits as his fingers close on it: the screwdriver goes there"""
    im, L = load(GRAB)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    blue = (b > r + 0.08) & (b > g + 0.02) & (im.max(2) > 0.35)
    lab, n = nd.label(blue); sz = nd.sum(blue, lab, range(1, n + 1)); bl = lab == (1 + int(np.argmax(sz)))
    ys, xs = np.nonzero(bl)
    return [round(float(xs.mean() + PAD) * S, 1), round(float(ys.mean()) * S, 1)]


frames, meta = [], {'S': S, 'pad': PAD, 'ycut': YCUT * S, 'grip': grip(), 'first': FIRST, 'grab': GRAB, 'close': CLOSE, 'frames': [], 'tip': [], 'root': []}
for i in range(FIRST, CLOSE + 1):
    im, L = load(i)
    m = arm_mask(im, L)
    ys, xs = np.nonzero(m)
    h, w = m.shape
    # the root: where he comes in (the mask on the left / bottom border); the tip: the arm's pixel farthest from it
    edge = (xs < 3) | (ys > h - 4)
    rx, ry = (xs[edge].mean(), ys[edge].mean()) if edge.any() else (0.0, float(h))
    dd = (xs - rx) ** 2 + (ys - ry) ** 2; t = int(np.argmax(dd))
    imP, mP = pad(im, m)
    spr = retro(imP, mP)
    al = spr[..., 3] > 0; yy, xx = np.nonzero(al)
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    frames.append(spr[y0:y1, x0:x1])
    meta['frames'].append([0, 0, int(x1 - x0), int(y1 - y0), int(x0), int(y0)])
    meta['tip'].append([round((xs[t] + PAD) * S, 1), round(ys[t] * S, 1)])
    meta['root'].append([round((rx + PAD) * S, 1), round(ry * S, 1)])
    print(i, 'px', int(m.sum()), 'tip', meta['tip'][-1], 'root', meta['root'][-1])
# one row of a sheet per frame, side by side, wrapped at 4096
x = y = rowh = 0; SW = 4096; place = []
for k, f in enumerate(frames):
    hh, ww = f.shape[:2]
    if x + ww > SW: x = 0; y += rowh + 1; rowh = 0
    place.append((x, y)); meta['frames'][k][0], meta['frames'][k][1] = x, y
    x += ww + 1; rowh = max(rowh, hh)
sheet = np.zeros((y + rowh, SW, 4), np.uint8)
for (px, py), f in zip(place, frames): sheet[py:py + f.shape[0], px:px + f.shape[1]] = f
used = max(px + f.shape[1] for (px, py), f in zip(place, frames))
sh = sheet[:, :used]
# the gaps between frames: the colour carried on out there too (WebP's blocks, and the filter, see no black)
al = sh[..., 3] > 0
idx = nd.distance_transform_edt(~al, return_distances=False, return_indices=True)
sh[..., :3] = sh[idx[0], idx[1], :3]
Image.fromarray(sh).save(f'{OUT}/pipe-hand.webp', quality=86, method=6, alpha_quality=100, exact=False)
meta['W'] = round((w + PAD) * S); meta['H'] = round((h + PAD) * S)
meta['SW'], meta['SH'] = int(used), int(sheet.shape[0])
json.dump(meta, open(f'{OUT}/pipe-hand.json', 'w'), separators=(',', ':'))
print('wrote', os.path.getsize(f'{OUT}/pipe-hand.webp'), 'bytes,', len(frames), 'frames')
