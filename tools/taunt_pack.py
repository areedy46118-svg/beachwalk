#!/usr/bin/env python3
"""THE TAUNT, HIS OWN LEFT ARM (2026-11-21, the owner: IMG_7232 — "trim the hand and arm out of this video and make this a taunt
you can do when you hit "T" with the left arm. make the trims clean like the grab item one").

    W=<work dir>
    ffmpeg -i IMG_7232.MOV -vf "fps=12,scale=640:-2" $W/v/%03d.png          (portrait: 640 x 1138)
    swift tools/scene_cutout.swift labels $W/v $W/lab
    /usr/bin/python3 -E tools/taunt_pack.py $W assets/hud

Frames FIRST..LAST: the arm up from the bottom-left, the finger, held, and down again. The cut is `pipe_hand_pack.py`'s: Vision's
instances that come in from the left or the bottom edge (his trousers and his shoes at the bottom are never an instance that
does — measured, frames 16..45 give the arm alone), the largest piece, holes filled; box-downscaled to `S` with the outline
smoothed a pixel inside, the full-res cut's coverage kept as the alpha (cut at .5 in the shader: the full-res curve at any
size), the colour carried out past the edge so nothing pulls in black. Writes taunt-hand.webp (a sheet) and taunt-hand.json."""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
W, OUT = sys.argv[1], sys.argv[2]
FIRST, LAST = 16, 45
S = 0.6


def load(i):
    im = np.asarray(Image.open(f'{W}/v/{i:03d}.png').convert('RGB')).astype(np.float32) / 255
    p = f'{W}/lab/{i:03d}.png'
    L = np.asarray(Image.open(p).resize((im.shape[1], im.shape[0]), Image.NEAREST)) if os.path.exists(p) else np.zeros(im.shape[:2], np.uint8)
    return im, L


def arm_mask(L, prev=None):
    """(and frame to frame: an instance is his arm only if it overlaps where his arm was a frame ago — on frame 42 Vision gave the
    cabinet behind his hand as the instance that touches the edge, and the cut was the whole cabinet)"""
    h, w = L.shape
    m = np.zeros((h, w), bool)
    near = nd.binary_dilation(prev, iterations=40) if prev is not None and prev.any() else None
    for k in set(np.unique(L).tolist()) - {0}:
        c = L == k; ys, xs = np.nonzero(c)
        if not (xs.min() < 0.03 * w or ys.max() > 0.97 * h): continue
        if near is not None and (c & near).sum() < 0.6 * c.sum(): continue
        m |= c
    m = nd.binary_opening(m, iterations=2)
    lab, n = nd.label(m)
    if n > 1: sz = nd.sum(m, lab, range(1, n + 1)); m = lab == (1 + int(np.argmax(sz)))
    return nd.binary_fill_holes(m)


def retro(rgb, m):
    h, w = m.shape; rw, rh = int(round(w * S)), int(round(h * S))
    c = np.asarray(Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).resize((rw, rh), Image.BOX), np.float32) / 255
    ms = nd.gaussian_filter(nd.binary_erosion(m, iterations=2).astype(np.float32), 3.0) > 0.5
    soft = np.asarray(Image.fromarray((ms * 255).astype(np.uint8)).resize((rw, rh), Image.BOX), np.float32) / 255
    a = nd.binary_opening(soft > 0.5, iterations=1)
    inner = nd.binary_erosion(a, iterations=1)
    if inner.any():
        idx = nd.distance_transform_edt(~inner, return_distances=False, return_indices=True)
        c = c[idx[0], idx[1]]
    keep = nd.binary_dilation(a, iterations=1)
    out = np.zeros((rh, rw, 4), np.uint8); out[..., :3] = (np.clip(c, 0, 1) * 255).astype(np.uint8)
    out[..., 3] = (np.clip(soft, 0, 1) * keep * 255).round().astype(np.uint8)
    return out


prev = None
frames, meta = [], {'S': S, 'first': FIRST, 'last': LAST, 'fps': 12, 'frames': [], 'tip': []}
for i in range(FIRST, LAST + 1):
    im, L = load(i)
    m = arm_mask(L, prev)
    if m.any(): prev = m
    h, w = m.shape
    if not m.any():                       # (a frame Vision lost: the one before it, held)
        frames.append(frames[-1]); meta['frames'].append(list(meta['frames'][-1])); meta['tip'].append(meta['tip'][-1]); continue
    ys, xs = np.nonzero(m)
    edge = (xs < 3) | (ys > h - 4)
    rx, ry = (xs[edge].mean(), ys[edge].mean()) if edge.any() else (0.0, float(h))
    t = int(np.argmax((xs - rx) ** 2 + (ys - ry) ** 2))
    spr = retro(im, m)
    al = spr[..., 3] > 0; yy, xx = np.nonzero(al)
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    frames.append(spr[y0:y1, x0:x1])
    meta['frames'].append([0, 0, int(x1 - x0), int(y1 - y0), int(x0), int(y0)])
    meta['tip'].append([round(float(xs[t]) * S, 1), round(float(ys[t]) * S, 1)])
    print(i, 'px', int(m.sum()), 'tip', meta['tip'][-1])
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
al = sh[..., 3] > 0
idx = nd.distance_transform_edt(~al, return_distances=False, return_indices=True)
sh[..., :3] = sh[idx[0], idx[1], :3]
Image.fromarray(sh).save(f'{OUT}/taunt-hand.webp', quality=86, method=6, alpha_quality=100, exact=False)
meta['W'] = round(w * S); meta['H'] = round(h * S); meta['SW'], meta['SH'] = int(used), int(sheet.shape[0])
json.dump(meta, open(f'{OUT}/taunt-hand.json', 'w'), separators=(',', ':'))
print('wrote', os.path.getsize(f'{OUT}/taunt-hand.webp'), 'bytes,', len(frames), 'frames')
