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
FIRST, GRAB, CLOSE = 16, 66, 70          # the reach; his fingers on it; closed
# (16, not 14, 2026-11-21, the owner: "clean up the hand cut when grabbing the screwdriver make sure its just hand and arm in the
#  trims": the clip's first two frames are his hand at rest round the thing he was holding, and the cut kept what showed in the
#  gap between his thumb and fingers — a white scrap and a gold-brown thing off the table. From 16 the gap is open.)
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


# ---- THE FINER CUT (2026-11-26, the owner: "trim the hand better when grabbing from the sewer screw driver"). The instance labels
# above are 512 x 512 for a 640 x 1138 frame, squashed and nearest-upscaled, and the outline was then eroded two pixels and
# blurred: the fingers came out fused into a mitten, the tips chewed short where they met the lighter, and a scrap of the table
# stayed in the crook of the thumb. When `<W>/pm` holds Vision's soft PERSON matte at the full 1080 x 1920 frame
# (`swift tools/person_matte.swift <W>/vf <W>/pm 16 70`, `vf` the clip at fps=12 unscaled) the arm is cut from that instead:
# its own soft edge is the alpha (no erosion, no blur), at full resolution until the one box-downscale to the sprite.
PM = os.path.isdir(f'{W}/pm')


def arm_matte(i, h, w):
    """the arm's soft coverage at full resolution, and its hard mask at the 640 frame's size"""
    P = np.asarray(Image.open(f'{W}/pm/{i:03d}.png'), np.float32) / 255
    im = np.asarray(Image.open(f'{W}/vf/{i:03d}.png').convert('RGB'), np.float32) / 255
    H, Wd = P.shape; k = Wd / w
    r, g, b = im[..., 0], im[..., 1], im[..., 2]; mx = im.max(2)
    # (the lighter is a LIGHT blue: at mx > 0.35 the sleeve's navy cuff counted too, and its dilation cut diamond holes through the
    # wrist — "u sometimes see through it", 2026-11-26)
    blue = (b > r + 0.08) & (b > g + 0.02) & (mx > 0.55)
    white = (mx > 0.8) & (r - b < 0.11)
    m = P > 0.5
    # (the matte already leaves the paper out; a wide margin round white ate the fingertips lying on it — one pixel round white, the
    # blue thing's three: his fingers close on it and the game's screwdriver is drawn there)
    m &= ~nd.binary_dilation(white, iterations=1) & ~nd.binary_dilation(blue, iterations=int(round(3 * k)))
    # (2026-11-26, the owner: "a huge thing appears above it that should be cut": the lighter's grey metal top, which the person
    # matte took for a fingertip (frame 61). Round the blue thing — within 60 px of it — what is neither skin (warm: r-b >= 0.08)
    # nor the sleeve (dark) goes.)
    # (THE LIGHTER, not any light-blue speck: a lit spot on the sleeve counted, and the grey round it was cut in a diamond out of his
    # wrist. Its biggest blue piece, and only bright grey round it — the metal top — not the sleeve's mid-grey.)
    bl, bn = nd.label(blue)
    if bn:
        bs = nd.sum(blue, bl, range(1, bn + 1)); big = int(np.argmax(bs)) + 1
        if bs[big - 1] > 400 * k * k:
            nearB = nd.binary_dilation(bl == big, iterations=int(round(36 * k)))
            m &= ~(nearB & (mx > 0.45) & ((r - b) < 0.08))
    yc = int(round(YCUT * k)); m[yc:] = False
    # (and the matte's wisps off: a flag of paper or the pen's tip left hanging off a fingertip — an opening 4 px across at full
    # res, a finger is 40)
    m = nd.binary_opening(m, structure=nd.generate_binary_structure(2, 1), iterations=4)
    # (and what the matte joined to him by a thread goes: the candle jar on the table came in attached to his fingertips (frame 61,
    # "a huge thing appears above it"). His CORE is the mask opened 10 px — an arm and four fingers survive that, a wisp does not
    # — the core's piece that is his (from the left edge or the knee line), and the mask kept only within 14 px of it.)
    core = nd.binary_opening(m, iterations=10)
    cl, cn = nd.label(core); keepc = np.zeros_like(core)
    yc0 = int(round(YCUT * k))
    for c in range(1, cn + 1):
        ys, xs = np.nonzero(cl == c)
        if xs.min() < 0.03 * Wd or ys.max() >= yc0 - 12: keepc |= cl == c
    # (the opening also eats in from the frame's left border and the knee line, where the arm is cut off and not ending — the sleeve
    # came out bitten at its top edge there; so the core is grown back to the border, and near it the mask is kept as it was)
    if keepc.any():
        H0 = m.shape[0]; yy, xx = np.mgrid[0:H0, 0:Wd]
        band = (xx < int(48 * k)) | (yy > yc0 - int(48 * k))
        m &= nd.binary_dilation(keepc, iterations=14) | band
    lab, n = nd.label(m)
    best, bs = 0, 0
    for c in range(1, n + 1):
        ys, xs = np.nonzero(lab == c)
        if not (xs.min() < 0.03 * Wd or ys.max() >= yc - 2): continue      # comes in from the left, or up from the knee line
        if len(xs) > bs: best, bs = c, len(xs)
    m = lab == best if best else np.zeros_like(m)
    # (holes: only the small ones — a pinhole in the matte. The crook of a thumb that touches a finger is a hole too, and it is
    # the table: filled, the old cut kept it)
    # (holes: what is enclosed and small is the matte's own dropout — a knuckle crease, a highlight — and is filled; the crook of a
    # thumb that touches a finger is enclosed too and it is the table, so only holes that are NOT the room's colour are filled
    # whatever their size: measured 2026-11-26, holes of 3-68 sprite px in 11 frames, "u sometimes see through it")
    hole = nd.binary_fill_holes(m) & ~m
    hl, hn = nd.label(hole)
    if hn:
        hs = nd.sum(hole, hl, range(1, hn + 1))
        warm = (r - b) >= 0.08
        dark = mx < 0.32
        for c in range(1, hn + 1):
            cc = hl == c
            armish = (warm[cc] | dark[cc]).mean()
            if hs[c - 1] < 1500 or armish > 0.6: m |= cc
    cover = np.where(nd.binary_dilation(m, iterations=2), P, 0.0)
    cover[yc:] = 0
    # (inside the arm it is solid: the matte's soft dips there were what showed through. The edge keeps its own soft curve.)
    inner = nd.binary_erosion(m, iterations=3)
    cover[inner] = 1.0
    cover[m] = np.maximum(cover[m], 0.62)                                 # (what is kept is clear of the shader's .5 after the box-down)
    cover[~nd.binary_dilation(m, iterations=2)] = 0
    c640 = np.asarray(Image.fromarray((cover * 255).astype(np.uint8)).resize((w, h), Image.BOX), np.float32) / 255
    return cover, c640 > 0.5


def pad(im, m):
    """the frame carried on past its left and bottom borders: edge pixels replicated, falling into shadow"""
    imP = np.pad(im, ((0, PAD), (PAD, 0), (0, 0)), mode='edge')
    mP = np.pad(m, ((0, PAD), (PAD, 0)), mode='edge')
    h, w = m.shape
    yy, xx = np.mgrid[0:h + PAD, 0:w + PAD]
    d = np.maximum(np.maximum(PAD - xx, 0), np.maximum(yy - (h - 1), 0)).astype(np.float32)
    k = (0.35 + 0.65 * np.exp(-d / 40.0))[..., None]
    return imP * k, mP


def retro_pm(i, cover, m):
    """THE FINER CUT's sprite: the colour of the full-res frame box-downscaled, the alpha the full-res soft cover box-downscaled
    (so the shader's linear sample cut at .5 is the matte's own curve), the colour carried on out past the edge"""
    h, w = m.shape; rw, rh = int(round(w * S)), int(round(h * S))
    im = Image.open(f'{W}/vf/{i:03d}.png').convert('RGB')
    c = np.asarray(im.resize((rw, rh), Image.BOX), np.float32) / 255
    soft = np.asarray(Image.fromarray((cover * 255).astype(np.uint8)).resize((rw, rh), Image.BOX), np.float32) / 255
    # (a pinhole the box-down leaves — a sprite pixel or two under the cut inside the arm — sealed: the shader cuts at .5)
    ph = nd.binary_fill_holes(soft > 0.5) & ~(soft > 0.5); pl, pn = nd.label(ph)
    if pn:
        psz = np.atleast_1d(nd.sum(ph, pl, list(range(1, pn + 1))))
        for j in range(1, pn + 1):
            if psz[j - 1] <= 40: soft[pl == j] = 1.0
    a = soft > 0.5
    inner = nd.binary_erosion(a, iterations=1)
    if inner.any():
        idx = nd.distance_transform_edt(~inner, return_distances=False, return_indices=True)
        c = c[idx[0], idx[1]]
    keep = nd.binary_dilation(a, iterations=1)
    out = np.zeros((rh, rw, 4), np.uint8); out[..., :3] = (np.clip(c, 0, 1) * 255).astype(np.uint8)
    out[..., 3] = (np.clip(soft, 0, 1) * keep * 255).round().astype(np.uint8)
    return out


def retro(rgb, m):
    """box-downscaled; the outline smoothed (Vision's ragged knuckles rounded) and a pixel inside; the colour carried on out
    past the edge (filtered, the edge never pulls in black)"""
    h, w = m.shape; rw, rh = int(round(w * S)), int(round(h * S))
    c = np.asarray(Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).resize((rw, rh), Image.BOX), np.float32) / 255
    ms = nd.gaussian_filter(nd.binary_erosion(m, iterations=2).astype(np.float32), 3.0) > 0.5
    soft = np.asarray(Image.fromarray((ms * 255).astype(np.uint8)).resize((rw, rh), Image.BOX), np.float32) / 255
    a = nd.binary_opening(soft > 0.5, iterations=1)
    inner = nd.binary_erosion(a, iterations=1)
    if inner.any():
        idx = nd.distance_transform_edt(~inner, return_distances=False, return_indices=True)
        c = c[idx[0], idx[1]]
    # (THE OUTLINE KEPT SOFT, 2026-11-21, the owner: "make sure the cuts are clean like the outline of the hand is flawless":
    #  a hard 0/255 alpha at sprite px is a staircase of whole sprite px wherever the hand is drawn bigger than that — the
    #  grab lays it at the thing's distance, often two or three screen px a sprite px. The box-downscaled coverage of the
    #  full-res smoothed mask is kept instead, so the shader's linear sample cut at .5 is the full-res curve at any size;
    #  whatever the opening threw away stays thrown away.)
    keep = nd.binary_dilation(a, iterations=1)
    out = np.zeros((rh, rw, 4), np.uint8); out[..., :3] = (np.clip(c, 0, 1) * 255).astype(np.uint8)
    out[..., 3] = (np.clip(soft, 0, 1) * keep * 255).round().astype(np.uint8)
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
    if PM: cover, m = arm_matte(i, *L.shape)
    else: m = arm_mask(im, L)
    ys, xs = np.nonzero(m)
    h, w = m.shape
    # the root: where he comes in (the mask on the left / bottom border); the tip: the arm's pixel farthest from it
    edge = (xs < 3) | (ys > h - 4)
    rx, ry = (xs[edge].mean(), ys[edge].mean()) if edge.any() else (0.0, float(h))
    dd = (xs - rx) ** 2 + (ys - ry) ** 2; t = int(np.argmax(dd))
    if PM: spr = retro_pm(i, cover, m)
    else: imP, mP = pad(im, m); spr = retro(imP, mP)
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
