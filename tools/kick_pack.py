#!/usr/bin/env python3
"""THE KICK, HIS OWN RIGHT LEG (2026-11-25, the owner: IMG_7253 — "add this kick like the hands retro for when you hit q … a kick like in
other games like dark messiah that knocks people over").

    W=<work dir>
    ffmpeg -i IMG_7253.MOV -vf "fps=12,scale=640:-2" $W/v/%03d.png          (portrait: 640 x 1138)
    /usr/bin/python3 -E tools/kick_pack.py $W assets/hud

Frames FIRST..LAST: the leg up from the bottom, the sole out at the middle of the picture, held, and down. Vision's foreground model
(`scene_cutout.swift`, the taunt's) found the leg on 2 of the 7 frames — the motion blur — so the cut is by colour: his trousers are
navy against pale tiles (dark, bluer than red), joined to the bottom edge, left of the black cabinet (x < CAB of the width); his sock
is the white blob at the trousers' far end. Then the taunt's retro (`taunt_pack.py`): box-down to S, the outline smoothed a pixel in,
the full-res coverage as alpha, colour carried past the edge. Writes kick-leg.webp (a sheet) and kick-leg.json (frames, and per frame
the SOLE — the sock's middle — which the game lays the kick by)."""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
W, OUT = sys.argv[1], sys.argv[2]
FIRST, LAST = 37, 40          # (41-43, the leg coming down, cut ragged — their light: the game plays these back down instead)
S = 0.6
CAB = 0.62


def leg_mask(rgb):
    h, w, _ = rgb.shape
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1)
    pants = (mx < 0.42) & (B > R + 0.012) & (B >= G)   # (navy: measured (59,59,65)…(91,88,100); the cabinet (39,38,41), the floor (58,54,45))
    pants[:, int(CAB * w):] = False
    pants = nd.binary_opening(pants, iterations=2)
    lab, n = nd.label(pants)
    keep = np.zeros_like(pants)
    for k in range(1, n + 1):
        c = lab == k; ys, xs = np.nonzero(c)
        if ys.max() > 0.97 * h and c.sum() > 800: keep |= c            # (joined to the bottom edge: the leg, not the coat on the sofa)
    if not keep.any(): return keep, None
    keep = nd.binary_closing(keep, iterations=6)
    ys, xs = np.nonzero(keep)
    top = ys.min(); tx = xs[ys < top + 12].mean()
    # the sock: white, at the trousers' top end
    white = (rgb.min(-1) > 0.70)
    yy, xx = np.mgrid[0:h, 0:w]
    near = ((yy - top) ** 2 + (xx - tx) ** 2) < (0.11 * h) ** 2
    sock = nd.binary_opening(white & near, iterations=1)
    lab2, n2 = nd.label(sock)
    best = None
    for k in range(1, n2 + 1):
        c = lab2 == k
        if c.sum() < 60: continue
        if (nd.binary_dilation(c, iterations=10) & keep).any() and (best is None or c.sum() > best.sum()): best = c
    m = keep | (best if best is not None else False)
    m = nd.binary_fill_holes(nd.binary_closing(m, iterations=4))
    sole = (float(np.nonzero(best)[1].mean()), float(np.nonzero(best)[0].mean())) if best is not None else (float(tx), float(top))
    return m, sole


# ---- THE FINER CUT (2026-11-26, the owner: "make the trim on the leg way better too"). The colour threshold above bit ragged holes
# out of the motion-blurred trousers and left the sock as a separate blob off the leg's end; Vision's person matte
# (`person_matte.swift`) finds little of a leg blurred this much. So the threshold's mask is only the SEED of a GrabCut on the
# full 1080 x 1920 frame (`<W>/vf`, the clip at fps=12 unscaled): its eroded middle sure, itself and a band round it probable,
# the cabinet's side and everything well away sure background. GrabCut's colour models of leg and room follow the blur's
# real edge; then the one piece joined to the bottom edge, holes filled, a 1.5 px blur for the anti-aliased edge.
GC = os.path.isdir(f'{W}/vf')


def leg_grabcut(i, m640):
    import cv2
    im = cv2.imread(f'{W}/vf/{i:03d}.png')
    H, Wd = im.shape[:2]; k = Wd / m640.shape[1]
    m0 = cv2.resize(m640.astype(np.uint8), (Wd, H), interpolation=cv2.INTER_NEAREST).astype(bool)
    g = np.full((H, Wd), cv2.GC_BGD, np.uint8)
    g[nd.binary_dilation(m0, iterations=int(28 * k / 1.7))] = cv2.GC_PR_BGD
    g[m0] = cv2.GC_PR_FGD
    g[nd.binary_erosion(m0, iterations=int(14 * k / 1.7))] = cv2.GC_FGD
    g[:, int(CAB * Wd):] = cv2.GC_BGD
    # (at half size: GrabCut on 2 M pixels is slow and the blur's edge is wider than a half-size pixel)
    hs = 0.5; ims = cv2.resize(im, None, fx=hs, fy=hs, interpolation=cv2.INTER_AREA); gs = cv2.resize(g, (ims.shape[1], ims.shape[0]), interpolation=cv2.INTER_NEAREST)
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(ims, gs, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
    f = ((gs == cv2.GC_FGD) | (gs == cv2.GC_PR_FGD)).astype(np.float32)
    f = cv2.resize(f, (Wd, H), interpolation=cv2.INTER_LINEAR) > 0.5
    f = nd.binary_opening(f, iterations=3)
    # (the piece joined to the bottom edge, and any piece the seed was mostly — the sock, which the blur can part from the trousers
    # in the first frame; then closed 10 px, which shuts the notches the blur's streaks leave in the trousers' side)
    lab, n = nd.label(f); keep = np.zeros_like(f)
    seed = nd.binary_dilation(m0, iterations=4)
    for c in range(1, n + 1):
        cc = lab == c; ys, xs = np.nonzero(cc)
        if ys.max() > 0.97 * H or (len(ys) > 400 and (cc & seed).sum() > 0.6 * len(ys)): keep |= cc
    f = nd.binary_fill_holes(nd.binary_closing(keep, iterations=10))
    # (2026-11-26, the owner, a still mid-kick: "clean up here on the trim make the cuts more clean too". A white strip — the
    # doorframe's edge behind the sock — came in joined to the sock and was drawn as a bar beside his foot, and the sock's end was
    # ragged. His CORE is the mask opened 16 px (a leg and a sock survive it, a strip does not); its pieces on the bottom edge or
    # mostly the seed, and the mask kept only within 10 px of them; then the outline smoothed (a 4 px Gaussian, cut at a half).)
    core = nd.binary_opening(f, iterations=16)
    cl, cn = nd.label(core); kc = np.zeros_like(core)
    for c in range(1, cn + 1):
        cc = cl == c; ys, xs = np.nonzero(cc)
        if ys.max() > 0.95 * H or (cc & seed).sum() > 0.6 * len(ys): kc |= cc
    if kc.any():
        band = np.zeros_like(f); band[int(0.95 * H):] = True
        f &= nd.binary_dilation(kc, iterations=10) | band
    # (and the white: of what is pale in the cut, only the SOCK — the biggest pale piece at the trousers' top end — clipped to its
    # own ellipse (its second moments, 2.1 sigma): the doorframe's edge and the tile's corner that the blur welded to it stand off
    # that ellipse and go. The trousers are the dark piece on the bottom edge.)
    rgbF = im[..., ::-1].astype(np.float32) / 255
    pale = f & (rgbF.min(-1) > 0.50)
    darkp = f & ~pale
    dl, dn = nd.label(nd.binary_opening(darkp, iterations=3)); trous = np.zeros_like(f)
    for c in range(1, dn + 1):
        cc = dl == c
        if np.nonzero(cc)[0].max() > 0.95 * H and cc.sum() > 3000: trous |= cc
    if trous.any():
        ty = np.nonzero(trous)[0].min()
        pl, pn = nd.label(pale); best, bsz = 0, 0
        for c in range(1, pn + 1):
            cc = pl == c; ys, xs = np.nonzero(cc)
            if len(ys) > bsz and ys.min() < ty + 0.15 * H and nd.binary_dilation(cc, iterations=int(0.04 * H)).__and__(trous).any() | (abs(ys.mean() - ty) < 0.12 * H): best, bsz = c, len(ys)
        sock = np.zeros_like(f)
        if best:
            cc = pl == best; ys, xs = np.nonzero(cc)
            mu = np.array([xs.mean(), ys.mean()]); X = np.stack([xs - mu[0], ys - mu[1]])
            Ci = np.linalg.inv(np.cov(X) + np.eye(2) * 4.0)
            yy, xx = np.mgrid[0:H, 0:Wd]; dx_, dy_ = xx - mu[0], yy - mu[1]
            d2 = Ci[0, 0] * dx_ * dx_ + 2 * Ci[0, 1] * dx_ * dy_ + Ci[1, 1] * dy_ * dy_
            sock = cc & (d2 < 1.8 ** 2)
            # (the pale slab that rides beside the sock in 38-40 — the doorframe's edge, behind him — is always to the RIGHT of the
            # trousers' line: nothing pale past the trousers' right edge, measured over their top tenth, and a hair)
            tys, txs = np.nonzero(trous); top = tys < tys.min() + 0.10 * (tys.max() - tys.min())
            if top.any(): sock &= xx <= txs[top].max() + 0.012 * Wd
            sl2, sn2 = nd.label(sock)
            if sn2 > 1: sz2 = nd.sum(sock, sl2, list(range(1, sn2 + 1))); sock = sl2 == (int(np.argmax(sz2)) + 1)
        f = trous | sock
        # (a sock parted from the trousers by the blur — the first frame — is joined to them: the hull of the sock's lower half and
        # the trousers' top end, so no piece of him floats)
        if sock.any():
            jl, jn = nd.label(nd.binary_dilation(f, iterations=2))
            if jn > 1:
                sys_, sxs = np.nonzero(sock); tys, txs = np.nonzero(trous)
                sm = sys_ > np.percentile(sys_, 50); tm = tys < tys.min() + 0.08 * H
                pts = np.concatenate([np.stack([sxs[sm], sys_[sm]], 1), np.stack([txs[tm], tys[tm]], 1)]).astype(np.int32)
                hull = cv2.convexHull(pts); hm = np.zeros((H, Wd), np.uint8); cv2.fillConvexPoly(hm, hull, 1)
                # (only the neck between them: the hull narrowed to the sock's and the trousers' own width there)
                f |= hm.astype(bool) & nd.binary_dilation(sock | trous, iterations=int(0.05 * H))
        f = nd.binary_closing(f, iterations=int(0.012 * H))
    f = nd.gaussian_filter(f.astype(np.float32), 4.0) > 0.5
    f = nd.binary_fill_holes(f)
    lab2, n2 = nd.label(f)
    if n2 > 1:
        sz = nd.sum(f, lab2, list(range(1, n2 + 1))); bigk = int(np.argmax(sz)) + 1
        f = np.isin(lab2, [j + 1 for j in range(n2) if sz[j] > 0.04 * sz[bigk - 1]])
    cover = nd.gaussian_filter(f.astype(np.float32), 1.5)
    rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    return rgb, cover


def retro_gc(rgb, cover, w640, h640):
    """the colour and the soft cover box-downscaled from full res to the sprite; the colour carried on past the edge"""
    rw, rh = int(round(w640 * S)), int(round(h640 * S))
    c = np.asarray(Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).resize((rw, rh), Image.BOX), np.float32) / 255
    soft = np.asarray(Image.fromarray((np.clip(cover, 0, 1) * 255).astype(np.uint8)).resize((rw, rh), Image.BOX), np.float32) / 255
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


frames, meta = [], {'S': S, 'first': FIRST, 'last': LAST, 'fps': 12, 'frames': [], 'sole': []}
for i in range(FIRST, LAST + 1):
    im = np.asarray(Image.open(f'{W}/v/{i:03d}.png').convert('RGB')).astype(np.float32) / 255
    m, sole = leg_mask(im)
    h, w = m.shape
    if not m.any():
        frames.append(frames[-1]); meta['frames'].append(list(meta['frames'][-1])); meta['sole'].append(meta['sole'][-1]); print(i, 'held'); continue
    Image.fromarray((m * 255).astype(np.uint8)).save(f'{W}/mask{i:03d}.png')
    if GC:
        rgbF, cover = leg_grabcut(i, m)
        Image.fromarray((cover * 255).astype(np.uint8)).save(f'{W}/gc{i:03d}.png')
        spr = retro_gc(rgbF, cover, w, h)
    else: spr = retro(im, m)
    al = spr[..., 3] > 0; yy, xx = np.nonzero(al)
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    frames.append(spr[y0:y1, x0:x1])
    meta['frames'].append([0, 0, int(x1 - x0), int(y1 - y0), int(x0), int(y0)])
    meta['sole'].append([round(sole[0] * S, 1), round(sole[1] * S, 1)])
    print(i, 'px', int(m.sum()), 'sole', meta['sole'][-1])
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
Image.fromarray(sh).save(f'{OUT}/kick-leg.webp', quality=86, method=6, alpha_quality=100, exact=False)
meta['W'] = round(w * S); meta['H'] = round(h * S); meta['SW'], meta['SH'] = int(used), int(sheet.shape[0])
json.dump(meta, open(f'{OUT}/kick-leg.json', 'w'), separators=(',', ':'))
print('wrote', os.path.getsize(f'{OUT}/kick-leg.webp'), 'bytes,', len(frames), 'frames')
