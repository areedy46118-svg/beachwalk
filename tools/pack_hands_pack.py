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
    # (and its deep red a little further right, in the snap's blurred frames — dark and redder than any skin: 2026-11-21)
    jar |= (U < 0.45) & (V > 0.30) & (V < 0.76) & (warm > 0.5) & (lum < 0.25)
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
    # THE LEFT WRIST AS FILMED (2026-11-21, the owner: "MAKE THE LEFT HAND WHEN OPENING THE INVENTORY MATCH THE ORIGINAL VIDEO
    # BETTER"). The 2026-11-19 passes — a disk-16 opening, then the heel-to-cuff line cut — pared the "knob" off his inner
    # wrist and with it the hand's real width. Measured against the frames: the knob was never extra skin. The jar test above
    # takes the shaded skin of the wrist crease (warm, under 0.30) for the jar and bites a NOTCH out of the hand's lower
    # edge just above the wrist; what stood below the notch was the hand's true edge, left as a spur. In the video that edge
    # is one smooth diagonal from the heel of the palm to the cuff. So the notch is filled back: the arm alone (skin and
    # sleeve, never the paper, so it does not bridge to the sheet) closed by a disk of 14 in the wrist's zone, and a filled
    # pixel takes the colour of the nearest skin (what is behind the crease in the frame is the jar).
    rgbw = a[..., :3]
    warmw = (rgbw[..., 0] - rgbw[..., 1]) / (rgbw[..., 0] + 1e-6)
    _, _, lumw = hsv_bits(rgbw)
    navy = (rgbw[..., 2] > rgbw[..., 0] + 0.008) & (lumw < 0.32) & (V > 0.6)
    arm = keep & (U < 0.33) & (V > 0.30) & ((warmw > 0.17) | navy)
    yy, xx = np.ogrid[-14:15, -14:15]
    fill = zone & nd.binary_closing(arm, structure=(xx * xx + yy * yy) <= 196, iterations=1) & ~keep
    if fill.any():
        skin = arm & ~navy & (lumw > 0.30)
        _, (iy, ix) = nd.distance_transform_edt(~skin, return_indices=True)
        a[fill, :3] = a[iy[fill], ix[fill], :3]     # (every filled pixel: the jar's lit rim is red, not dark, and showed)
        a[fill, 3] = 1
        keep = keep | fill
    # (and the spur's last tip, a few pixels proud of the filled edge: a disk of 9 rounds it — the arm is far wider)
    yy, xx = np.ogrid[-9:10, -9:10]
    keep &= ~(zone & ~nd.binary_opening(keep, structure=(xx * xx + yy * yy) <= 81))
    # THE GAP BY THE RIGHT THUMB (2026-11-21, the owner, his cursor on it: "FIX SEEING THROUGH THE PAPER WHERE MY CURSOR IS …
    # BY THE RIGHT THUMB"): where the sheet runs in under his right thumb the cut left a sliver of the table between the paper's
    # edge and the hand (sprite x ~467-478, y ~157-192 in the held frames; shut in some, open to the outside in others) — the
    # game's black through it. The right hand's stretch is closed (a disk of 10: the sliver is ~16 px wide) and what is filled
    # takes the colour of the nearest of the sheet or the skin beside it.
    zr = (U > 0.64) & (U < 0.88) & (V > 0.30) & (V < 0.82)
    yy, xx = np.ogrid[-10:11, -10:11]
    gap = zr & nd.binary_closing(keep, structure=(xx * xx + yy * yy) <= 100, iterations=1) & ~keep
    if gap.any():
        _, (gy, gx) = nd.distance_transform_edt(~keep, return_indices=True)
        a[gap, :3] = a[gy[gap], gx[gap], :3]; a[gap, 3] = 1
        keep = keep | gap
    # THE WRIST'S INNER EDGE SMOOTHED INTO ITSELF (2026-11-21, the owner, his cursor on it: "THIS LITTLE SKIN POKING OUT HAS TO
    # BE FLATTENED AND BLEND IN WITH THE WRIST"). Past the fill a small knob still stood out of the inner wrist (V ~0.77) with
    # a dip over it. Row by row the arm's inner edge (its right-most pixel) is smoothed along its own run — a median over 41
    # rows, then a gaussian of 8 — so it keeps the wrist's curve (a ruled line looked unnatural, 2026-11-19) and loses the
    # knob and the dip: what stands past it is cut, what falls short is filled with the skin beside it, eased in and out over
    # the stretch's ends so nothing steps.
    if n >= 13:
        armk = keep & (U < 0.33) & ((warmw > 0.17) | navy)
        lab2, k2 = nd.label(armk)
        if k2:
            big2 = 1 + int(np.argmax(nd.sum(armk, lab2, range(1, k2 + 1))))
            armk = lab2 == big2
            y0, y1 = int(0.60 * H0), int(0.93 * H0)
            rows = np.arange(y0, y1)
            xin = np.array([np.nonzero(armk[y])[0].max() if armk[y].any() else -1 for y in rows], np.float32)
            ok = xin >= 0
            if ok.sum() > 40:
                xs = np.interp(rows, rows[ok], xin[ok])
                sm = nd.gaussian_filter1d(nd.median_filter(xs, size=41, mode='nearest'), 8, mode='nearest')
                ramp = np.clip(np.minimum(rows - y0, y1 - 1 - rows) / 18.0, 0, 1)
                tgt = xs + (sm - xs) * ramp
                skin2 = armk & (lumw > 0.30) & (warmw > 0.17)
                _, (iy2, ix2) = nd.distance_transform_edt(~skin2, return_indices=True)
                cols = np.arange(W0)
                for j, y in enumerate(rows):
                    if not ok[j]: continue
                    t = int(round(tgt[j])); x = int(xin[j])
                    if x > t:                                   # standing out: cut back to the edge
                        keep[y] &= ~((cols > t) & (cols <= x) & armk[y])
                    elif x < t:                                 # falling short: filled with the skin beside it
                        f = (cols > x) & (cols <= t) & ~keep[y]
                        if f.any():
                            a[y, f, :3] = a[iy2[y, f], ix2[y, f], :3]; a[y, f, 3] = 1; keep[y] |= f
    return keep


def paper_centroid(a, keep):
    _, sat, lum = hsv_bits(a[..., :3])
    p = keep & (sat < 0.16) & (lum > 0.42)
    ys, xs = np.nonzero(p)
    return xs.mean(), ys.mean(), p


def shade(a, keep, n):
    rgb = a[..., :3]
    mx, sat, lum = hsv_bits(rgb)
    # (the sleeve: dark, OR the navy of it — 2026-11-21, the owner: "KEEP THE BLUE SLEEVE IN TOO LIKE THE RIGHT HAND". Under
    # 0.2 alone took only its shadowed folds; the lit cloth, 0.2-0.32 and blue over red, was painted as skin or as paper,
    # and the sleeve came out a grey-brown on both arms. Skin is never bluer than red, and the paper is pale.)
    dark = keep & (lum < 0.2) & (V > 0.5)
    navy = keep & (V > 0.5) & (rgb[..., 2] > rgb[..., 0] + 0.008) & (lum < 0.32)
    # (only the cloth that runs off the bottom of the frame — the cuffs come in from there; the jar's lit rim is as blue)
    nl, nk = nd.label(nd.binary_opening(navy | dark, iterations=1))
    sleeve = dark
    if nk:
        low = np.unique(nl[-3:][nl[-3:] > 0])
        sleeve = dark | (navy & np.isin(nl, low))
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
    # (and as BLUE as filmed: the moon's fall-off below darkens the bottom corners by a third, which put the navy at black —
    # the cloth is lifted back by it and its blue a little stronger, so it reads as the sleeve it is through the dither)
    # (the blue cloth only — a dark bit that is not blue, a crease's shadow, the jar's red, stays as it was: rgb × 0.85)
    blue = sleeve & (rgb[..., 2] > rgb[..., 0] + 0.004)
    sl = rgb * 0.85
    sb = rgb * 1.05
    sl = np.where(blue[..., None], sb + (sb.mean(-1, keepdims=True) - sb) * -0.6, sl)
    out = pap * paperw[..., None] + skin * skinw[..., None] + sl * sleeve[..., None]
    # the moon: high on the left; a cool cast over everything, the far corner falling away
    moon = np.clip(1.08 - 0.42 * np.hypot(U - 0.18, (V + 0.25) * 0.8), 0.55, 1.05)
    out = out * (moon + (1 - moon) * 0.6 * blue)[..., None] * np.array([0.93, 0.96, 1.03], np.float32)
    return out, pm, blue


BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16 - 0.5
LEVELS = 9


def retro(rgb, keep, rh, sleeve=None):
    rw = int(round(rh * 16 / 9 * STRETCH))
    im = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).resize((rw, rh), Image.BOX)
    al = Image.fromarray((keep * 255).astype(np.uint8)).resize((rw, rh), Image.BOX)
    c = np.asarray(im, np.float32) / 255
    a = np.asarray(al, np.float32) / 255 > 0.5
    a = nd.binary_opening(a, iterations=1) | (nd.binary_erosion(a, iterations=1))
    # ordered dither down to a few levels a channel
    th = np.tile(BAYER, (rh // 4 + 1, rw // 4 + 1))[:rh, :rw][..., None]
    # (the sleeves at finer steps — 2026-11-21: the navy is so dark that at 9 levels a channel every pixel of it came out
    # black or the one grey above it, on both arms; at 25 it keeps its blue and its folds, dithered the same way)
    lv = np.full((rh, rw, 1), LEVELS - 1, np.float32)
    if sleeve is not None:
        sm = np.asarray(Image.fromarray((sleeve * 255).astype(np.uint8)).resize((rw, rh), Image.BOX), np.float32) / 255 > 0.5
        lv[sm] = 24
    c = np.clip(np.floor(c * lv + 0.5 + th * 0.9) / lv, 0, 1)
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
    rgb, pm, slv = shade(a, keep, n)
    spr, rw = retro(rgb, keep, RH, slv)
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
