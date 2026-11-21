"""The pack's backdrop: the owner's own hands snapping a sheet of paper open (IMG_7207), cut out, the paper aged into a
worn, stained sheet, the whole thing lit by the moon and taken down to a dithered retro sprite.

    ffmpeg -ss 1.80 -t 2.45 -i ~/Downloads/IMG_7207.MOV -vf "fps=30,scale=960:-1" frames/%03d.png
    swift tools/hands_cutout.swift frames cut
    /usr/bin/python3 -E tools/pack_hands_pack.py cut assets/hud/pack-hands.png

(native python: numpy, scipy and Pillow load there; `-I` hides numpy.) Prints the JSON the game's `PH` constant is
written from: each frame's cell in the sheet and the paper's rectangles in sprite pixels. Seeded: the same input gives
the same sheet byte for byte.

The frames (30 fps from 1.80 s): 7 the folded strip in both hands, 8-14 the snap open, 18 and 22 the sheet settling,
then 25-45 held — registered on the paper so the sheet stays put under the writing while the hands breathe."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC, OUT = sys.argv[1], sys.argv[2]
OPEN = [7, 8, 9, 10, 13, 14, 18, 22]
IDLE = [25, 29, 33, 37, 41, 45]
RH = 330                       # sprite height in pixels (the retro resolution)
STRETCH = 1.14                 # the sheet a little wider than it was: the pack is a wide page
W0, H0 = 960, 540
rng = np.random.default_rng(7207)


def load(n):
    return np.asarray(Image.open(f'{SRC}/{n:03d}.png').convert('RGBA')).astype(np.float32) / 255


def hsv_bits(rgb):
    mx = rgb.max(-1); mn = rgb.min(-1)
    return mx, (mx - mn) / (mx + 1e-6), rgb @ np.array([0.299, 0.587, 0.114], np.float32)


def fnoise(h, w, scale, oct=4, seed=0):
    """value noise, summed octaves, 0..1 — the same field every frame (it is the paper's, not the frame's)"""
    r = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32); amp = 1; tot = 0
    for o in range(oct):
        s = max(2, int(scale * 2 ** o))
        g = r.random((s * h // w + 2, s + 2)).astype(np.float32)
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        out += amp * np.asarray(im, np.float32) / 255; tot += amp; amp *= 0.5
    return out / tot


Y, X = np.mgrid[0:H0, 0:W0].astype(np.float32)
U, V = X / W0, Y / H0
# the paper's own fields, fixed in the frame (the held frames are registered, so fixed on the sheet)
N_STAIN = fnoise(H0, W0, 3, 4, 1)
N_RING = fnoise(H0, W0, 5, 3, 2)
N_GRIME = fnoise(H0, W0, 14, 3, 3)
N_FINE = fnoise(H0, W0, 60, 2, 4)
N_EDGE = fnoise(H0, W0, 9, 3, 5)
SPECK = (rng.random((H0, W0)) > 0.99965).astype(np.float32) * rng.uniform(0.4, 1.0, (H0, W0))   # foxing, few and uneven
SPECK = np.clip(nd.gaussian_filter(SPECK, 1.4) * 10 * (N_GRIME > 0.45), 0, 1)


def clean(a, n):
    """the table's things the cut kept: the candle glass and the tissue over the torn top, the notebook and the jar to the
    left. Hands never reach the top band, and nothing but paper is pale and grey up there."""
    rgb, al = a[..., :3], a[..., 3]
    mx, sat, lum = hsv_bits(rgb)
    keep = al > 0.5
    warm = (rgb[..., 0] - rgb[..., 1]) / (rgb[..., 0] + 1e-6)
    keep &= ~((V < 0.30) & ((sat > 0.24) | (warm > 0.2)))               # glass, amber wax (no hand reaches up there)
    keep &= ~((V < 0.13) & (lum < 0.40))                                # the dark through the torn spiral holes
    # the notebook and the tissue: pale and grey, up to the left — and NOT skin (a box cut here took the top off his hand)
    keep &= ~((U < 0.18) & (V < 0.47) & (warm < 0.2) & (n >= 11))
    # the jar by his left hand (its lid over the thumb, its body between the palm and the sheet): dark red-black, its rim
    # lit purple. Skin is never darker than ~0.36 here and never bluer than it is green.
    jar = (U < 0.25) & (V > 0.30) & (V < 0.76) & (warm > 0.2) & ((lum < 0.30) | (rgb[..., 2] > rgb[..., 1] + 0.01))
    # only the dark that reaches the outside: the crease between his thumb and finger is as dark, but the hand closes round it
    jl, jk = nd.label(nd.binary_dilation(jar, iterations=2))
    if jk:
        out = nd.binary_dilation(~(al > 0.5), iterations=3)
        touch = np.unique(jl[out & (jl > 0)])
        keep &= ~np.isin(jl, touch) | ((lum > 0.36) & (rgb[..., 2] < rgb[..., 1]))
    keep = nd.binary_opening(keep, iterations=1)
    lab, k = nd.label(keep)
    if k:
        sizes = nd.sum(keep, lab, range(1, k + 1))
        big = np.isin(lab, 1 + np.nonzero(sizes > keep.sum() * 0.012)[0])
        keep = big
    keep = nd.binary_closing(keep, iterations=2) & (al > 0.2)
    # small holes only: a big one is the gap where the jar stood between the palm and the sheet
    holes, k = nd.label(nd.binary_fill_holes(keep) & ~keep)
    if k:
        sz = nd.sum(np.ones_like(holes), holes, range(1, k + 1))
        keep |= np.isin(holes, 1 + np.nonzero(sz < 120)[0])
    # and the barb the jar's edge left under his left wrist: thin spurs there are pared off
    # (a diamond of 4 took the tip and left the wedge: the inner edge of the arm there is rounded by a disk of 8 instead —
    # the forearm is far wider than that, a spur is not; 2026-11-19, "fix the skin spiking out on the other left arm")
    zone = (U < 0.26) & (V > 0.45) & (V < 0.88)
    # (and a disk of 16: a knob of skin still stood out of the inner wrist under his palm through the held frames —
    # 2026-11-19, "the left hand of the inventorys skin pokes out right near his wrist")
    yy, xx = np.ogrid[-16:17, -16:17]
    keep &= ~(zone & ~nd.binary_opening(keep, structure=(xx * xx + yy * yy) <= 256))
    # (and his left wrist FLAT, as his right is — 2026-11-19, the owner: "the bump of skin on the left wrist needs to go look at
    # how flat the right side wrist is and do that": the right's inner edge runs in one straight line from the heel of the
    # palm into the cuff; the left's dipped in under the palm and bulged out above the cuff. Held frames (13 on): from the
    # heel — the inner edge's farthest point out, 0.18-0.36 of the frame above the cuff — to the cuff's inner corner, the
    # edge IS the straight line: past it cut, short of it filled with the skin at its edge.)
    sl = keep & (lum < 0.2) & (warm < 0.1) & (V > 0.5) & (U < 0.30)          # (the sleeve: dark AND grey — his shaded forearm is as dark, but warm)
    sl = nd.binary_opening(sl, iterations=2)
    arm = keep & (U < 0.33) & (V > 0.40) & ((warm > 0.17) | sl)
    if n >= 13 and sl.any() and arm.any():
        al_, ak_ = nd.label(arm)
        ids = np.unique(al_[sl & arm]); ids = ids[ids > 0]
        if len(ids): arm = np.isin(al_, ids)
        ys, xs = np.nonzero(sl); right = xs > np.percentile(xs, 55)
        yC = int(ys[right].min()) if right.any() else int(ys.min())
        xin = np.full(arm.shape[0], -1)
        for y in np.nonzero(arm.any(1))[0]: xin[y] = np.nonzero(arm[y])[0].max()
        cand = [y for y in range(max(0, yC - int(0.36 * H0)), yC - int(0.18 * H0)) if xin[y] >= 0]
        if cand and xin[yC] >= 0:
            yH = max(cand, key=lambda y: xin[y]); xH, xC = xin[yH], xin[yC]
            # (NOT ruled straight — 2026-11-19, later, the owner: "make his left hand less straight it looks unatural in the
            # inventory i just wanted that patch of skin fixed better": the line from the heel to the cuff is bowed IN a little
            # through its middle, the way a wrist narrows under the palm, and only what stands out PAST it — the knob of skin —
            # is cut; the natural dip under the palm is left as it is, no longer filled out to the line)
            for y in range(yH + 1, yC):
                u = (y - yH) / max(1, yC - yH)
                lim = xH + (xC - xH) * u - 0.022 * W0 * np.sin(np.pi * u)
                if xin[y] < 0: continue
                if xin[y] > lim + 0.5:
                    cut = np.arange(arm.shape[1]) > lim
                    keep[y] &= ~(cut & arm[y])
    return keep


def paper_centroid(a, keep):
    _, sat, lum = hsv_bits(a[..., :3])
    p = keep & (sat < 0.16) & (lum > 0.42)
    ys, xs = np.nonzero(p)
    return xs.mean(), ys.mean(), p


def shade(a, keep, n):
    rgb = a[..., :3]
    mx, sat, lum = hsv_bits(rgb)
    sleeve = keep & (lum < 0.2) & (V > 0.5)
    warm = (rgb[..., 0] - rgb[..., 1]) / (rgb[..., 0] + 1e-6)          # skin runs red over green; the paper barely
    skinw = np.clip((warm - 0.19) / 0.07, 0, 1) * keep * (~sleeve)
    paperw = (1 - skinw) * keep * (~sleeve)
    pm = keep & (paperw > 0.5)
    # crease shading relative to this frame's paper (the camera's exposure wandered)
    ref = np.median(lum[pm]) if pm.any() else 0.7
    s = np.clip(lum / ref, 0.25, 1.5)
    base = np.array([0.86, 0.77, 0.58], np.float32)                     # old paper
    pap = base[None, None] * (s ** 1.25)[..., None]
    # tea stains: blotches a little darker and browner, a darker tide line round each
    st = np.clip((N_STAIN - 0.60) / 0.10, 0, 1)
    tide = np.exp(-((N_STAIN - 0.60) / 0.008) ** 2) * 0.6
    ring = np.exp(-((N_RING - 0.70) / 0.007) ** 2) * (N_STAIN > 0.52) * 0.45
    stain = np.array([0.80, 0.62, 0.40], np.float32)
    pap = pap * (1 - 0.16 * st[..., None]) + (pap * stain - pap) * (0.40 * st)[..., None]
    pap *= (1 - 0.16 * np.clip(tide + ring, 0, 1))[..., None]
    # the edges: browned and dirtied, a ragged width
    dist = nd.distance_transform_edt(pm)
    edge = np.clip(1 - dist / (6 + 16 * N_EDGE), 0, 1) ** 1.6
    pap = pap * (1 - 0.55 * edge[..., None]) + np.array([0.30, 0.19, 0.09], np.float32) * (0.40 * edge)[..., None]
    # where the thumbs hold it: greyed by handling
    near = nd.distance_transform_edt(~(skinw > 0.5))
    thumb = np.clip(1 - near / 34, 0, 1) * (N_GRIME * 1.3)
    pap *= (1 - 0.30 * np.clip(thumb, 0, 1))[..., None]
    # grime, foxing, a fine tooth
    pap *= (0.93 + 0.10 * N_FINE)[..., None]
    pap *= (1 - 0.12 * np.clip((N_GRIME - 0.55) * 4, 0, 1))[..., None]
    pap = pap * (1 - 0.55 * SPECK[..., None]) + np.array([0.33, 0.20, 0.10]) * (0.45 * SPECK)[..., None]
    # the hands: night skin, a little drained; the sleeves near black
    skin = rgb * np.array([0.92, 0.88, 0.86], np.float32)
    skin = skin * 0.85 + skin.mean(-1, keepdims=True) * 0.15
    # the sleeves their own colour, as filmed (2026-11-19, the owner: "make the sleeves their original color in the
    # inventory" — the same day's bare-forearm repaint, "make that blue sleeve on the right arm be skin color", undone)
    sl = rgb * 0.85
    out = pap * paperw[..., None] + skin * skinw[..., None] + sl * sleeve[..., None]
    # the moon: high on the left; a cool cast over everything, the far corner falling away
    moon = np.clip(1.08 - 0.42 * np.hypot(U - 0.18, (V + 0.25) * 0.8), 0.55, 1.05)
    out = out * moon[..., None] * np.array([0.93, 0.96, 1.03], np.float32)
    return out, pm


BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16 - 0.5
LEVELS = 9


def retro(rgb, keep, rh):
    rw = int(round(rh * 16 / 9 * STRETCH))
    im = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).resize((rw, rh), Image.BOX)
    al = Image.fromarray((keep * 255).astype(np.uint8)).resize((rw, rh), Image.BOX)
    c = np.asarray(im, np.float32) / 255
    a = np.asarray(al, np.float32) / 255 > 0.5
    a = nd.binary_opening(a, iterations=1) | (nd.binary_erosion(a, iterations=1))
    # ordered dither down to a few levels a channel
    th = np.tile(BAYER, (rh // 4 + 1, rw // 4 + 1))[:rh, :rw][..., None]
    c = np.clip(np.floor(c * (LEVELS - 1) + 0.5 + th * 0.9) / (LEVELS - 1), 0, 1)
    # a one-pixel dark line round the whole silhouette
    ring = nd.binary_dilation(a, iterations=1) & ~a
    rgba = np.zeros((rh, rw, 4), np.float32)
    rgba[..., :3] = c; rgba[..., 3] = a
    rgba[ring] = [0.05, 0.04, 0.05, 1]
    return rgba, rw


frames, rects = [], []
base_c = None
for n in OPEN + IDLE:
    a = load(n)
    keep = clean(a, n)
    cx, cy, _ = paper_centroid(a, keep)
    if n in IDLE:
        if base_c is None: base_c = (cx, cy)
        dx, dy = int(round(base_c[0] - cx)), int(round(base_c[1] - cy))
        a = np.roll(a, (dy, dx), (0, 1)); keep = np.roll(keep, (dy, dx), (0, 1))
        if dx > 0: keep[:, :dx] = keep[:, dx:dx + 1]          # the forearm runs on off the edge it was rolled away from
        if dx < 0: keep[:, dx:] = keep[:, dx - 1:dx]
        if dy < 0: keep[dy:, :] = keep[dy - 1:dy, :]
        if dy < 0: a[dy:, :] = a[dy - 1:dy, :]
        if dx > 0: a[:, :dx] = a[:, dx:dx + 1]
        if dx < 0: a[:, dx:] = a[:, dx - 1:dx]
    rgb, pm = shade(a, keep, n)
    spr, rw = retro(rgb, keep, RH)
    frames.append(spr)
    if n == IDLE[0]:
        ys, xs = np.nonzero(pm)
        sx, sy = rw / W0, RH / H0
        held = dict(x0=float(np.percentile(xs, 0.5) * sx), x1=float(np.percentile(xs, 99.5) * sx),
                    y0=float(np.percentile(ys, 0.5) * sy), y1=float(np.percentile(ys, 99.5) * sy))
        # the writing: rows where the sheet runs clear from thumb to thumb, the torn top left out
        rowfull = pm.mean(1)
        held_mask = pm

COLS = 4
rows = (len(frames) + COLS - 1) // COLS
sheet = np.zeros((rows * RH, COLS * rw, 4), np.float32)
for i, f in enumerate(frames):
    r, c = divmod(i, COLS)
    sheet[r * RH:(r + 1) * RH, c * rw:(c + 1) * rw] = f
img = Image.fromarray((sheet * 255).astype(np.uint8), 'RGBA')
# one palette for the lot (the dither already chose the colours; this only packs them)
q = img.quantize(colors=96, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
q.save(OUT, optimize=True)

# the writable rectangle, in sprite pixels: read off the held frame by eye — the sheet clear of both thumbs and of the
# torn top (a search for the biggest box inside the mask kept catching on the ragged bottom edge)
l, t, r, b = 160, 42, 465, 270
meta = dict(src='assets/hud/pack-hands.png', fw=rw, fh=RH, cols=COLS, open=len(OPEN), idle=len(IDLE),
            paper=[round(held['x0'], 1), round(held['y0'], 1), round(held['x1'], 1), round(held['y1'], 1)],
            write=[l, t, r, b])
print(json.dumps(meta))
