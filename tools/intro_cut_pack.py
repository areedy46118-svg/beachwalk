"""The opening cutscene's hands (2026-11-19, the owner: "use the hands in this like we did for the inventory … use the
videos exactly like we did for the pack and cut it out retro style the hands and sketchbook"): two of his clips cut
out, held still on the table, graded and packed into sprite sheets for `IC` in main.js.

  IMG_7209.MOV  the RIGHT hand: the phone picked up off the table and held to his ear      → layer R (ref frame 10)
  IMG_7214.MOV  the LEFT hand: the pen (drawn over as the syringe) picked up, held, put down, then the sketchbook's
                pages flipped to BEACH WALK                                                 → layer L (ref frame 121)

Work dir W (outside the repo), made by:
  ffmpeg -i IMG_7209.MOV -vf "fps=12,scale=540:-2" W/v2/%03d.png      (and IMG_7214 → W/v3)
  ffmpeg -i IMG_7209.MOV -vf "fps=12" W/v2h/%03d.png                   (and → W/v3h: the colour at full size, 1080 wide)
  (the clips: ~/Desktop/BEACHWALK ASSETS/IMG_7209.MOV, IMG_7214.MOV)
  swift tools/scene_cutout.swift labels W/v2 W/v2lab                  (and v3 → v3lab)
then  /usr/bin/python3 -E tools/intro_cut_pack.py W assets/intro      (OpenCV, SciPy, PIL; ~2 min)

 - every frame is warped by a homography of the TABLE PLANE onto its clip's reference frame (SIFT on the wood, the arm
   masked out), so the book and the phone stay put on the desk while his hands move; the arm's mask and colour are
   edge-replicated past the frame's border, so a sleeve leaving the shot carries on off the screen instead of ending;
 - kept: Vision's instances that reach the bottom (the arm, and whatever it holds), the sketchbook by colour (white,
   unsaturated, the component under the book's middle: the table's glare is as pale but apart from it), and on the
   right the phone lying alone (dark and neutral, near where it lies);
 - the pen is the syringe: its ends are marked by hand at keyframes (PEN, in the reference frame), its black pixels
   in a band along it taken out, and main.js draws the syringe there (under the hand while it lies on the table);
 - the phone's screen: the lying phone's four corners are found (its dark glass, a min-area rectangle) so main.js
   can light it (the voicemail, the call); the frames where it is lifted and faces him have the call's screen baked in;
 - graded as the pack's hands were: drained a little, a hard alpha, a one-pixel dark line round the silhouette, at the
   composite's own scale (one sprite pixel to one pixel of the room's render target)."""
import sys, os, json, numpy as np, cv2
from PIL import Image, ImageDraw
from scipy import ndimage as nd

W, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
FW, FH = 540, 960
sift = cv2.SIFT_create(4000)


def load(clip, i):
    im = cv2.cvtColor(cv2.imread(f'{W}/{clip}/{i:03d}.png'), cv2.COLOR_BGR2RGB)
    L = np.asarray(Image.open(f'{W}/{clip}lab/{i:03d}.png').resize((FW, FH), Image.NEAREST))
    return im, L


HS, KL, KR = 2, 1.6, 1.5      # the colour from the clip at full size (1080 wide, HS x the masks'); the sheets at KL / KR sprite px per view px
_SH = np.diag([HS, HS, 1.0]); _SHI = np.linalg.inv(_SH)


def loadH(clip, i):
    return cv2.cvtColor(cv2.imread(f'{W}/{clip}h/{i:03d}.png'), cv2.COLOR_BGR2RGB)


def warpH(img, M, size, off, interp=cv2.INTER_LINEAR, border=cv2.BORDER_REPLICATE):
    """the full-size frame warped as `warp` warps the small one: the same homography, at HS x"""
    return warp(img, _SH @ M @ _SHI, (size[0] * HS, size[1] * HS), (off[0] * HS, off[1] * HS), interp, border)


def up(m):
    """a mask made at the small size, at the colour's: smooth, not stair-stepped"""
    m = m.astype(np.float32)
    return cv2.resize(m, (m.shape[1] * HS, m.shape[0] * HS), interpolation=cv2.INTER_LINEAR)


def table_feats(im, L):
    arm = np.zeros(L.shape, bool)
    for k in set(L.flatten().tolist()) - {0}:
        if np.nonzero(L == k)[0].max() > FH * 0.95: arm |= L == k
    hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV)
    wood = nd.binary_closing((hsv[..., 0] > 5) & (hsv[..., 0] < 30) & (hsv[..., 1] > 60), iterations=5)
    m = wood & ~nd.binary_dilation(arm, iterations=20)
    return sift.detectAndCompute(cv2.cvtColor(im, cv2.COLOR_RGB2GRAY), (m * 255).astype(np.uint8))


def homographies(clip, ids, ref, cache):
    if os.path.exists(cache): return {int(k): np.array(v) for k, v in json.load(open(cache)).items()}
    kr, dr = table_feats(*load(clip, ref)); bf = cv2.BFMatcher(); out = {}
    for i in ids:
        k, d = table_feats(*load(clip, i))
        good = [a for a, b in bf.knnMatch(d, dr, k=2) if a.distance < 0.72 * b.distance]
        Hm, inl = cv2.findHomography(np.float32([k[a.queryIdx].pt for a in good]), np.float32([kr[a.trainIdx].pt for a in good]), cv2.RANSAC, 3.0)
        out[i] = (Hm, int(inl.sum()))
    json.dump({i: v[0].tolist() for i, v in out.items()}, open(cache, 'w'))
    json.dump({i: v[1] for i, v in out.items()}, open(cache + '.inl', 'w'))
    return {i: v[0] for i, v in out.items()}


def instances(L):
    arm = np.zeros(L.shape, np.uint8); oth = np.zeros(L.shape, np.uint8); right = np.zeros(L.shape, np.uint8)
    for k in set(L.flatten().tolist()) - {0}:
        ys, xs = np.nonzero(L == k)
        if ys.max() > FH * 0.95: arm[L == k] = 255
        else: oth[L == k] = 255
        if ys.max() > FH * 0.95 and (xs < 0.55 * FW).mean() < 0.06: right[L == k] = 255
    return arm, oth, right


def warp(img, M, size, off, interp=cv2.INTER_LINEAR, border=cv2.BORDER_REPLICATE):
    T = np.array([[1, 0, off[0]], [0, 1, off[1]], [0, 0, 1]], float) @ M
    return cv2.warpPerspective(img, T, size, flags=interp, borderMode=border)


def grade(rgb, a, s, fade=None):
    """rgb at the colour's size + its mask (bool or 0-1, the same size) → the sprite at scale s. CLEAN EDGES (2026-11-19,
    the owner: "clean up all the traces you did cutting these images out"): the mask a little inside his outline (the
    clip's table and rug ride on its last pixels), the colour of that edge band taken from just inside it (no fringe of
    what was behind him), a soft one-pixel falloff, and no dark rim."""
    a = cv2.GaussianBlur(a.astype(np.float32), (0, 0), 1.1)
    a = np.clip((a - 0.62) / 0.3, 0, 1)                                   # (a pixel or so inside the cut)
    if fade is not None: a = a * fade                                     # (and his sleeve fading out past the clip's edge, `edge_fade`)
    h, w = a.shape
    sw, sh = max(1, round(w * s)), max(1, round(h * s))
    f = rgb.astype(np.float32) / 255
    lum = f @ np.array([0.299, 0.587, 0.114], np.float32)
    f = lum[..., None] + (f - lum[..., None]) * 0.86                       # drained, a little
    f = np.clip((f - 0.5) * 1.1 + 0.5, 0, 1)
    inner = nd.binary_erosion(a > 0.98, iterations=3)
    if inner.any():
        idx = nd.distance_transform_edt(~inner, return_distances=False, return_indices=True)
        band = (a > 0) & ~inner
        f[band] = f[idx[0][band], idx[1][band]]
    pm = np.dstack([f * a[..., None], a])
    small = cv2.resize(pm, (sw, sh), interpolation=cv2.INTER_AREA)
    al = small[..., 3]; col = small[..., :3] / np.maximum(al[..., None], 1e-4)
    bl = cv2.GaussianBlur(col, (0, 0), 1.0); col = np.clip(col + (col - bl) * 0.35, 0, 1)   # crisp inside
    A = np.clip((al - 0.03) / 0.94, 0, 1)
    out = np.zeros((sh, sw, 4), np.uint8)
    out[..., :3] = np.clip(col * 255 + 0.5, 0, 255).astype(np.uint8); out[..., 3] = np.clip(A * 255 + 0.5, 0, 255).astype(np.uint8)
    return out


def ink_up(rgb, page):
    """his sketches, readable: the paper flattened to its own shading and every pencil line darkened (they were a
    faint grey that the room's drained dark took away entirely)"""
    f = rgb.astype(np.float32) / 255; lum = f.mean(2)
    bg = cv2.medianBlur((lum * 255).astype(np.uint8), 41)   # (the colour at full size: 21 at 540 wide)
    bg = bg.astype(np.float32) / 255
    bg = np.maximum(bg, 0.25)
    ink = np.clip(((bg - lum) / bg - 0.035) * 3.4, 0, 1) ** 0.85            # (a soft knee, not a cut: a line at the threshold came and went frame to frame)
    ink = np.maximum(ink, cv2.dilate(ink, np.ones((3, 3), np.uint8)) * 0.35)   # (a little bolder; drawn sharp now, not at the room's 400 px)
    shade = np.clip(bg / max(np.percentile(bg[page], 90) if page.any() else 1, 0.3), 0, 1.1)[..., None]
    paper = np.array([0.93, 0.91, 0.86], np.float32) * shade
    out = paper * (1 - 0.92 * ink[..., None]) + np.array([0.09, 0.09, 0.11], np.float32) * 0.92 * ink[..., None]
    return np.where(page[..., None], np.clip(out * 255, 0, 255), rgb).astype(np.uint8)


def past_edge(rgb, valid):
    """where the clip's frame ended and the sleeve is only its edge carried on: into the shadow, not a flat smear"""
    d = nd.distance_transform_edt(~valid)
    k = (0.3 + 0.7 * np.exp(-d / 22.0))[..., None]
    return (rgb.astype(np.float32) * k).astype(np.uint8)


def edge_fade(valid):
    """past the clip's own edge his sleeve fades out (~45 view px) instead of running on as a replicated slab: a screen
    wider or taller than 16:9 shows that far past it (2026-11-19)"""
    d = nd.distance_transform_edt(~valid)
    return np.clip(1 - d / (65.0 * HS), 0, 1) ** 1.5


def white_book(f, valid, seed):
    mx, mn = f.max(2), f.min(2); lum = f.mean(2); sat = (mx - mn) / (mx + 1e-4)
    # paper is white, unsaturated AND SMOOTH: the rug beyond the table is as pale but patterned, the table's glare warmer
    sd = np.sqrt(np.maximum(nd.uniform_filter(lum * lum, 7) - nd.uniform_filter(lum, 7) ** 2, 0))
    white = (lum > 0.5) & (sat < 0.15) & (sd < 0.06) & valid
    white = nd.binary_opening(white, iterations=3)
    lab, n = nd.label(white)
    if not n: return white
    k = lab[seed[1], seed[0]] or 1 + int(np.argmax(nd.sum(white, lab, range(1, n + 1))))
    b = lab == k
    # (and the pages turned over above the rings — the rings' dark parts them from it: "the pages that are flipped should
    # stay above the sketchbook they keep dissapearing", 2026-11-19 — any big white piece beside it)
    sz = nd.sum(white, lab, range(1, n + 1)); near = nd.binary_dilation(b, iterations=24)
    for j in range(1, n + 1):
        if j != k and sz[j - 1] > 0.08 * sz[k - 1] and (near & (lab == j)).any(): b |= lab == j
    return nd.binary_fill_holes(nd.binary_closing(b, iterations=6))


# ---------------------------------------------------------------- the left hand and the book (IMG_7214)
L_REF, L_OFF, L_SIZE, L_S = 121, (220, -40), (760, 1080), 0.70           # canvas = ref x -220..540, y 40..1120 (a page lifted reaches high; and his sleeve carried on past the clip's left and bottom edges, for a screen wider or taller than 16:9 — 2026-11-19)
L_IDS = [1] + list(range(2, 53)) + list(range(82, 96)) + list(range(119, 246))   # (96-118, the hand waiting on the
# book's corner after the syringe, gone: "i hate how he was stuck almost flipping the page … make his hand go back to idle")
# the pen's two ends, hand-marked in the reference frame (the upper end first: the needle's end)
PEN = {1: (107, 508, 113, 610), 20: (107, 508, 113, 610), 22: (106, 470, 110, 560), 24: (106, 420, 102, 480), 25: (107, 400, 100, 465),
       28: (108, 365, 134, 435), 31: (105, 360, 200, 515), 34: (110, 350, 203, 505), 37: (120, 345, 205, 500),
       40: (130, 360, 228, 505), 43: (140, 350, 235, 515), 46: (135, 350, 230, 500), 49: (130, 350, 225, 500),
       52: (130, 340, 230, 505), 82: (150, 345, 250, 510), 85: (90, 450, 178, 555), 88: (95, 495, 135, 560),
       92: (120, 510, 160, 600), 96: (140, 522, 172, 618), 245: (140, 522, 172, 618)}
PEN_HELD = (22, 87)                                                       # in his hand (drawn over it) from, to


def pen_at(i):
    ks = sorted(PEN)
    if i <= ks[0]: return PEN[ks[0]]
    for a, b in zip(ks, ks[1:]):
        if a <= i <= b:
            if (a <= 52 < b): return PEN[a] if i <= 52 else PEN[b]       # (the cut from 52 to 82)
            t = (i - a) / (b - a); return tuple(PEN[a][j] * (1 - t) + PEN[b][j] * t for j in range(4))
    return PEN[ks[-1]]


def keep_biggest(m, near=60, frac=0.08):
    """his arm, and only what belongs to it: the biggest piece, and any piece a fair size close to it"""
    lab, n = nd.label(m)
    if n <= 1: return m
    sz = nd.sum(m, lab, range(1, n + 1)); big = 1 + int(np.argmax(sz))
    reach = nd.binary_dilation(lab == big, iterations=near)
    ks = [big] + [k + 1 for k in range(n) if k + 1 != big and sz[k] > frac * sz[big - 1] and (reach & (lab == k + 1)).any()]
    return np.isin(lab, ks)


def left():
    H = homographies('v3', range(1, 273), L_REF, f'{W}/hL.json')
    frames, pens, fronts, fills = {}, {}, {}, {}
    seed = (330 + L_OFF[0], 560 + L_OFF[1])
    # THE BOOK STANDS STILL while he takes the syringe (2026-11-19, the owner: "clean up the cuts i saw things i shouldnt
    # especially the needle just have his hand and the needle shown i see other things popping in from the video"): the
    # book was cut again in every frame and its edge, its rings and the paper's corner came and went. The book is cut once
    # (frame 1, 'b1', drawn under them) and the frames up to 95 are his ARM ALONE — the book's paper, the pen's black, and
    # anything not joined to his arm (the cap of something on his table that rode with his hand, 37-46) out.
    bkS = None
    for i in L_IDS + [119]:
        im, Lb = load('v3', i)
        arm, oth, _ = instances(Lb)
        wim = warp(im, H[i], L_SIZE, L_OFF)
        warm = warp(arm, H[i], L_SIZE, L_OFF) > 127
        woth = warp(oth, H[i], L_SIZE, L_OFF, cv2.INTER_NEAREST, cv2.BORDER_CONSTANT) > 127
        valid = warp(np.full((FH, FW), 255, np.uint8), H[i], L_SIZE, L_OFF, cv2.INTER_NEAREST, cv2.BORDER_CONSTANT) > 127
        f = wim.astype(np.float32) / 255
        lum = f.mean(2); sat = (f.max(2) - f.min(2)) / (f.max(2) + 1e-4)
        v2 = valid.copy(); v2[:110 + L_OFF[1]] = False
        bk = white_book(f, v2, seed)
        bk |= woth & nd.binary_dilation(bk, iterations=6)
        bk = nd.binary_fill_holes(nd.binary_closing(bk, iterations=3))
        bk = nd.binary_opening(bk, iterations=4) | (bk & nd.binary_erosion(bk, iterations=6))
        armonly = i <= 95 and i != 1
        hand119 = i == 119 and 'h119' not in frames and armonly is False and len(frames) > 0 and '119' in frames
        if i == 1:
            keep = keep_biggest(bk, near=30, frac=0.06)
            bkS = nd.binary_dilation(keep, iterations=3)
        elif armonly or hand119:
            keep = warm.copy()
            paperlike = (lum > 0.45) & (sat < 0.2) & ~skin_of(f)
            keep &= ~(bkS & paperlike)                                     # (the book's paper Vision gave the arm)
            keep &= ~(bkS & (lum < 0.3) & ~nd.binary_dilation(skin_of(f), iterations=3) & (np.arange(keep.shape[0])[:, None] < np.nonzero(bkS)[0].min() + 30))   # (its rings)
            # (and the book's own dark edge — its cover's thickness, by his fingers as he reaches past it (2-10): inside the
            # book only his skin, and his sleeve where it runs on from outside it)
            sleeve_out = keep & ~nd.binary_dilation(bkS, iterations=10) & ~skin_of(f)
            near_sleeve = nd.binary_dilation(sleeve_out, iterations=25)
            keep &= ~(nd.binary_dilation(bkS, iterations=10) & ~nd.binary_dilation(skin_of(f), iterations=1) & ~near_sleeve)
        else:
            keep = bk | warm
            sd = np.sqrt(np.maximum(nd.uniform_filter(lum * lum, 9) - nd.uniform_filter(lum, 9) ** 2, 0))
            paper = nd.binary_opening((sd < 0.011) & (lum > 0.55) & bk, iterations=3)
            paper = nd.binary_dilation(paper, iterations=4) & bk
            upper = (np.arange(keep.shape[0]) - L_OFF[1] < 455)[:, None]
            keep &= ~(upper & ~(paper | warm))
            keep = nd.binary_opening(keep, iterations=1) | (keep & nd.binary_erosion(keep, iterations=3))
            lab, n = nd.label(keep)
            if n > 1: keep = keep_biggest(keep, near=30, frac=0.06)   # (the turned stack is often under a quarter of the book: it went)
            if i == 245: keep = keep_biggest(bk, near=30, frac=0.06)
        p = pen_at(i)
        held = PEN_HELD[0] <= i <= PEN_HELD[1]
        a = np.array([p[0] + L_OFF[0], p[1] + L_OFF[1]]); b = np.array([p[2] + L_OFF[0], p[3] + L_OFF[1]])
        # the colour, from the clip at full size (and for the pages, each pixel the middle of it and its neighbours': the
        # sketches steady, 2026-11-19, "make sure the sketchbook texts and drawing arent flickering in and out")
        validH = up(valid) > 0.5
        wH = past_edge(cachedH(i, H), validH)
        if i >= 119 and not hand119:
            pg = nd.binary_erosion(up(bk & ~nd.binary_dilation(warm | skin_of(f), iterations=8)) > 0.5, iterations=2)
            if pg.any():
                st = np.stack([cachedH(j, H) for j in (i - 1, i, i + 1)]); med = np.median(st, axis=0).astype(np.uint8)
                wH = np.where(pg[..., None], med, wH)
        fH = wH.astype(np.float32) / 255
        pw = 0
        if i <= 95:                                                        # THE PEN, FOUND (2026-11-19, "make the syringe a cleaner cut")
            a, b, pw = track_pen(fH, a * HS, b * HS, validH)
            a, b, pw = a / HS, b / HS, pw / HS
        yy, xx = np.mgrid[0:keep.shape[0], 0:keep.shape[1]]
        if (i <= 95 and i != 1) or hand119:                               # the pen's black out, held or lying under his hand
            band = np.zeros(keep.shape, np.uint8)
            cv2.line(band, (int(a[0]), int(a[1])), (int(b[0]), int(b[1])), 255, 18)
            pen = (band > 0) & (lum < 0.36) & ((f[..., 2] - f[..., 0]) < 0.03)
            keep &= ~nd.binary_dilation(pen, iterations=1)
            if held:                                                      # (the pen's END, seen head-on as he turns it to him — a dark ring, 37: all but his skin along it)
                band2 = np.zeros(keep.shape, np.uint8)
                cv2.line(band2, (int(a[0]), int(a[1])), (int(b[0]), int(b[1])), 255, 34)
                warmS = (f[..., 0] - f[..., 1]) / (f[..., 0] + 1e-4); yel = (f[..., 1] - f[..., 2]) / (f[..., 1] + 1e-4) > 0.3
                skinS = skin_of(f) & (warmS > 0.105) & ~yel                     # (along the pen, skin that is plainly skin: the pen's silver passes skin_of at ~0.08 warm)
                keep &= ~((band2 > 0) & ~nd.binary_dilation(skinS, iterations=1) & ((lum < 0.55) | ((sat < 0.2) & (lum > 0.45)) | yel))   # (and the pen's pale grey parts too: slivers past his fingertips, 34-52)
                keep &= ~((np.hypot(xx - a[0], yy - a[1]) < 55) & ~nd.binary_dilation(skin_of(f), iterations=1))   # (the marked end is off by ~30 px in 37)
            keep &= ~((lum > 0.45) & (sat < 0.2) & ~skin_of(f))              # (paper in his fingers: the page's edge, 6 and 119 — his arm alone has none)
            # (and along the pen's UPPER half, within 12 px of its line, only plainly warm skin: the pen's silver between his
            # fingertips is 2-4 px across and ~0.08 warm, his fingers there 0.11-0.14 — a colour rule over the whole hand
            # took his cooler-lit hand off entirely in some frames)
            if held:
                Lp = max(np.linalg.norm(a - b), 1); vp = (a - b) / Lp
                dlp = np.abs((xx - b[0]) * vp[1] - (yy - b[1]) * vp[0]); tlp = ((xx - b[0]) * vp[0] + (yy - b[1]) * vp[1]) / Lp
                wP = (f[..., 0] - f[..., 1]) / (f[..., 0] + 1e-4)
                keep &= ~((dlp < 12) & (tlp > 0.45) & (tlp < 1.35) & (wP < 0.105))
                # (and they were the pen's own edges, two thin beige strips along its line between his index fingertip and
                # his thumb — warm enough to pass — so ALONG THE LINE the cut is opened by 3: a strip 2-4 px across goes,
                # a finger crossing the line, 10+, stays. Measured on 46's mask, `tools` debug dump.)
                bandP = (dlp < 13) & (tlp > 0.05) & (tlp < 1.3)
                keep = (keep & ~bandP) | (nd.binary_opening(keep, iterations=3) & bandP)
            if held:                                                      # and nothing past its upper end (the grinder)
                u = (a - b) / max(np.linalg.norm(a - b), 1)
                past = ((xx - a[0]) * u[0] + (yy - a[1]) * u[1] > -12) & (np.hypot(xx - a[0], yy - a[1]) < 200)
                keep &= ~(past & ~skin_of(f))                             # (and the dark cap that sat on his fingertip in 37)
            keep = nd.binary_fill_holes(keep_biggest(nd.binary_opening(keep, iterations=2 if hand119 else 1)))   # (and no pin-holes in his sleeve)   # (119: a sliver of page edge in his fingers)
            # (and what is not his skin is his SLEEVE — anything dark and not skin up at his hand that does not run down
            # into it out: a ring off the pen's end stayed on his fingertip in 37 beside the line)
            ns = keep & ~nd.binary_dilation(skin_of(f), iterations=2)
            lab, n = nd.label(ns)
            if n:
                ys = np.nonzero(keep)[0]; low = ys.min() + 0.55 * (ys.max() - ys.min())
                for j in range(1, n + 1):
                    c = lab == j
                    if np.nonzero(c)[0].max() < low and c.sum() < 0.25 * ns.sum(): keep &= ~c
            # HIS HAND WHOLE OVER THE SYRINGE (2026-11-19, the owner: "its shown through the hand i hate it … the hand should be
            # the layer over the syringe always"): where the pen was cut out of his fingers it left holes the syringe showed
            # through. Inside his hand's outline (closed over the gaps) near the pen's line, the hand is filled back, its
            # colour painted in from the skin round it (`fills`, cv2.inpaint at full size); past his fingers the pen's place
            # stays open — that is where the syringe shows.
            L_ = max(np.linalg.norm(a - b), 1); v = (a - b) / L_
            dl = np.abs((xx - b[0]) * v[1] - (yy - b[1]) * v[0]); tl = ((xx - b[0]) * v[0] + (yy - b[1]) * v[1]) / L_
            hc = nd.binary_fill_holes(nd.binary_closing(keep, iterations=5))   # (7 bridged past his fingertips: grey slivers, 34-52)
            fm = hc & ~keep & (dl < 24) & (tl > -0.2) & (tl < 1.2) & nd.binary_dilation(pen, iterations=2)   # (the pen's own pixels only: the ring cut off his fingertip in 37 came back as a blob of skin)
            # (a hole is his only where his skin is on BOTH sides of the pen within 7 px — between his fingertips, with skin on
            # one side, the pen's silver came back as grey slivers, 34-52)
            if fm.any():
                sk = skin_of(f); nx, ny = v[1], -v[0]; dx, dy = int(round(nx * 7)), int(round(ny * 7))
                both = np.roll(sk, (dy, dx), (0, 1)) & np.roll(sk, (-dy, -dx), (0, 1))
                fm &= nd.binary_dilation(both, iterations=2)
            if fm.any(): keep |= fm; fills[i] = fm
            # NOTHING BUT HIS ARM (2026-11-19, the owner: "clean up all the weird little spots showing up around the hand when
            # he picks it up should be perfectly cut nothing but the hand and syringe"): dark bits that are not skin up at
            # his hand go however close to it they sit (90's speck at the fingertips), the gaps in the outline close, and
            # only the one piece he is stays
            ys2 = np.nonzero(keep)[0]
            if ys2.size:
                low2 = ys2.min() + 0.55 * (ys2.max() - ys2.min())
                dk = keep & (lum < 0.3) & ~skin_of(f)
                dl2, dn2 = nd.label(dk)
                for j in range(1, dn2 + 1):
                    c = dl2 == j
                    if np.nonzero(c)[0].max() < low2 and c.sum() < 260: keep &= ~c   # (a SMALL dark piece that does not run down into his sleeve — the sleeve's folds split it into big pieces, which stay)
            keep = nd.binary_fill_holes(keep_biggest(nd.binary_closing(keep, iterations=2) & valid, near=1, frac=1.01))
        key = 'b1' if i == 1 else ('b245' if i == 245 else ('h119' if hand119 else str(i)))
        badH = None
        if i in fills:
            fmH = (cv2.dilate((up(fills[i]) > 0.3).astype(np.uint8), np.ones((5, 5), np.uint8)) * 255)
            wH = cv2.inpaint(np.ascontiguousarray(wH), fmH, 7, cv2.INPAINT_TELEA)
            fH = wH.astype(np.float32) / 255
            # (and a fill that came out not skin — it reached the table's colour — is not his hand: clear)
            wH_ = (fH[..., 0] - fH[..., 1]) / (fH[..., 0] + 1e-4)
            badH = (up(fills[i]) > 0.3) & ~(skin_of(fH) & (wH_ > 0.105))   # (painted, it has to come out plainly skin)
        lumH = fH.mean(2); satH = (fH.max(2) - fH.min(2)) / (fH.max(2) + 1e-4)
        pageH = ((up(bk | warm) > 0.5) & (lumH > 0.5) & (satH < 0.16) & ~skin_of(fH)) if not armonly else np.zeros(lumH.shape, bool)
        if not armonly: pageH |= (up(bk) > 0.5) & ~skin_of(fH)
        wH = ink_up(wH, pageH)
        sL = L_S * KL / HS
        ef = edge_fade(validH)
        mk = up(keep)
        if badH is not None: mk = mk * ~badH
        frames[key] = grade(wH, mk, sL, ef)
        if i in fronts and fronts[i].any() and key == str(i): frames['f' + key] = grade(wH, up(fronts[i]), sL)
        if i == 245: frames['245'] = grade(wH, up(bk | warm), sL, ef)
        if key == str(i) or key in ('b1', 'b245'):
            pens[key] = [round(a[0] * L_S, 1), round(a[1] * L_S, 1), round(b[0] * L_S, 1), round(b[1] * L_S, 1), 1 if held else 0, round(max(pw, 4) * L_S, 1)]
        print('L', key, int(keep.sum()), 'pen', [round(v, 1) for v in (*a, *b, pw)] if i <= 95 else '', flush=True)
    # the pen's track smoothed: each end the middle of it and its neighbours' (a frame's find wobbles a few px), in runs
    for run in (range(2, 53), range(82, 96)):
        ks = [str(i) for i in run if str(i) in pens]
        raw = {k: pens[k][:] for k in ks}
        for j, k in enumerate(ks):
            nb = [raw[ks[q]] for q in range(max(0, j - 1), min(len(ks), j + 2))]
            for c in (0, 1, 2, 3, 5): pens[k][c] = round(float(np.median([v[c] for v in nb])), 1)
    return frames, pens


_HC = {}
def cachedH(i, H):
    """frame i at full size warped onto the reference (kept: the pages' median reads each three times)"""
    if i not in _HC:
        if len(_HC) > 6: _HC.pop(min(_HC))
        _HC[i] = warpH(loadH('v3', i), H[i], L_SIZE, L_OFF)
    return _HC[i]


def track_pen(f, a0, b0, valid):
    """the pen in a frame at full size, from its own pixels: dark, grey, not skin, near where it was marked; a line through
    them (refitted without the strays), its ends their 1st and 99th places along it, its width from their spread. The
    marked ends are hand-placed keyframes ~30 px off in places (37); the syringe drawn over it has to sit where it is."""
    L = np.linalg.norm(a0 - b0)
    if L < 4: return a0, b0, 8.0
    u = (a0 - b0) / L
    x0, x1 = int(max(0, min(a0[0], b0[0]) - 0.45 * L - 60)), int(min(f.shape[1], max(a0[0], b0[0]) + 0.45 * L + 60))
    y0, y1 = int(max(0, min(a0[1], b0[1]) - 0.45 * L - 60)), int(min(f.shape[0], max(a0[1], b0[1]) + 0.45 * L + 60))
    c = f[y0:y1, x0:x1]; lum = c.mean(2); sat = (c.max(2) - c.min(2)) / (c.max(2) + 1e-4)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    t = (xx - b0[0]) * u[0] + (yy - b0[1]) * u[1]; d = np.abs((xx - b0[0]) * u[1] - (yy - b0[1]) * u[0])
    cand = (lum < 0.3) & (sat < 0.3) & ~skin_of(c) & valid[y0:y1, x0:x1] & (d < 34 * HS) & (t > -0.3 * L) & (t < 1.3 * L)
    cand = nd.binary_opening(cand, iterations=1)
    lab, n = nd.label(cand)
    if n:                                                                  # (the pen's pieces: those along the marked line)
        keepl = [j for j in range(1, n + 1) if (d[lab == j] < 18 * HS).mean() > 0.5]
        cand = np.isin(lab, keepl)
    P = np.stack([xx[cand], yy[cand]], 1).astype(np.float64)
    if len(P) < 120: return a0, b0, 8.0 * HS
    for _ in range(2):
        m = P.mean(0); w, V = np.linalg.eigh(np.cov((P - m).T)); v = V[:, 1]
        r = np.abs((P - m) @ np.array([-v[1], v[0]]))
        P = P[r < max(5.0 * HS, 2.5 * np.median(r) + 2)]
        if len(P) < 120: return a0, b0, 8.0 * HS
    m = P.mean(0); w, V = np.linalg.eigh(np.cov((P - m).T)); v = V[:, 1]
    s = (P - m) @ v; r = (P - m) @ np.array([-v[1], v[0]])
    e1, e2 = m + v * np.percentile(s, 1), m + v * np.percentile(s, 99)
    if np.linalg.norm(e1 - a0) + np.linalg.norm(e2 - b0) > np.linalg.norm(e2 - a0) + np.linalg.norm(e1 - b0): e1, e2 = e2, e1
    return e1, e2, float(np.std(r) * 3.2)


# ---------------------------------------------------------------- the right hand and the phone (IMG_7209)
R_REF, R_OFF, R_SIZE, R_S = 10, (0, 0), (800, 1180), 0.667               # canvas = ref x 0..800, y 0..1180 (his sleeve on past the clip's right and bottom: any screen's shape)
R_IDS = list(range(17, 48)) + list(range(50, 56)) + [73, 74] + list(range(90, 100))


def phone_alone(im):
    f = im.astype(np.float32) / 255; lum = f.mean(2); mx, mn = f.max(2), f.min(2)
    d = (lum < 0.24) & ((mx - mn) < 0.12)
    win = np.zeros(d.shape, bool); win[360:560, 300:520] = True
    d &= win
    d = nd.binary_closing(d, iterations=3)
    lab, n = nd.label(d)
    k = 1 + int(np.argmax(nd.sum(d, lab, range(1, n + 1))))
    m = nd.binary_fill_holes(lab == k)
    return nd.binary_dilation(m, iterations=1)


def screen_quad(mask):
    ys, xs = np.nonzero(nd.binary_erosion(mask, iterations=3))
    r = cv2.minAreaRect(np.float32(np.stack([xs, ys], 1)))
    q = cv2.boxPoints(r)
    # the top end (where the caller's name goes) is the end farther up the screen; order: top-left, top-right, bottom-right, bottom-left
    c = q.mean(0); ax = q[1] - q[0] if np.linalg.norm(q[1] - q[0]) > np.linalg.norm(q[2] - q[1]) else q[2] - q[1]
    ax = ax / np.linalg.norm(ax)
    if ax[1] > 0: ax = -ax                                                # pointing up the screen
    side = np.array([-ax[1], ax[0]])
    t = (q - c) @ ax; u = (q - c) @ side
    tl = q[np.argmax(t - u)]; tr = q[np.argmax(t + u)]; br = q[np.argmax(-t + u)]; bl = q[np.argmax(-t - u)]
    return np.float32([tl, tr, br, bl])


_IOS = None


def ios_call():
    """an iPhone ringing, as iOS draws it (the same as main.js's `iosScreen('incoming')`): the wallpaper dimmed, the
    caller's name, Remind Me / Message, and slide to answer — 180 x 390, an iPhone's 19.5:9"""
    global _IOS
    if _IOS is not None: return _IOS
    from PIL import ImageFont, ImageFilter
    W, H = 180, 390
    yy = np.linspace(0, 1, H)[:, None]
    top, mid, bot = np.array([38, 48, 74]), np.array([20, 26, 42]), np.array([7, 9, 15])
    g = np.where((yy < 0.55)[..., None], top + (mid - top) * (yy / 0.55)[..., None], mid + (bot - mid) * ((yy - 0.55) / 0.45)[..., None])
    im = Image.fromarray(np.repeat(g, W, 1).astype(np.uint8))
    d = ImageDraw.Draw(im, 'RGBA')
    def font(sz, bold=False):
        for f in ('/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc'):
            try: return ImageFont.truetype(f, sz)
            except Exception: pass
        return ImageFont.load_default()
    d.rounded_rectangle([62, 9, 118, 25], 8, fill=(0, 0, 0))
    d.text((90, 96), 'Matthew', font=font(30), fill=(255, 255, 255), anchor='ms')
    d.text((90, 117), 'mobile', font=font(14), fill=(200, 200, 210), anchor='ms')
    for cx, lab in ((52, 'Remind Me'), (128, 'Message')):
        d.ellipse([cx - 15, 267, cx + 15, 297], fill=(255, 255, 255, 52)); d.text((cx, 312), lab, font=font(10), fill=(255, 255, 255), anchor='ms')
    d.rounded_rectangle([16, 330, 164, 370], 20, fill=(255, 255, 255, 40))
    d.ellipse([19, 333, 53, 367], fill=(52, 199, 89))
    d.arc([28, 345, 44, 361], 210, 330, fill=(255, 255, 255), width=4)
    d.text((104, 355), 'slide to answer', font=font(15), fill=(235, 235, 240), anchor='ms')
    d.rounded_rectangle([62, 380, 118, 384], 2, fill=(255, 255, 255, 215))
    _IOS = im
    return im


def bake_call(rgb, mask):
    """the lifted phone, facing him, ringing: its glass lit with the call (baked: it moves with his hand)."""
    f = rgb.astype(np.float32) / 255; lum = f.mean(2); mx, mn = f.max(2), f.min(2)
    glass = mask & (lum < 0.22) & ((mx - mn) < 0.14)
    glass[int(FH * 0.68):] = False
    glass = nd.binary_opening(glass, iterations=2)
    lab, n = nd.label(glass)
    if not n: return rgb
    k = 1 + int(np.argmax(nd.sum(glass, lab, range(1, n + 1))))
    g = nd.binary_fill_holes(lab == k)
    if g.sum() < 600: return rgb
    q = screen_quad(g)
    tl, tr, br, bl = q
    ui = ios_call()
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [180, 0], [180, 390], [0, 390]]), q)
    w = cv2.warpPerspective(np.asarray(ui), M, (rgb.shape[1], rgb.shape[0]), flags=cv2.INTER_LINEAR)
    o = rgb.copy(); o[g] = w[g]
    return o


def skin_of(f):
    r, g = f[..., 0], f[..., 1]
    return ((r - g) / (r + 1e-4) > 0.08) & ((r - g) / (r + 1e-4) < 0.33) & (f.mean(2) > 0.47)   # (the wood is as warm, but darker)


def clean_right(im, m, i):
    """his knee (black, at the bottom) out; the phone's glass, where it shows the table through it (held at his ear,
    blurred: the wood came with it), made the phone's own dark."""
    f = im.astype(np.float32) / 255; lum = f.mean(2)
    lap = (lum < 0.22) & ((f[..., 2] - f[..., 0]) < 0.02); lap[:int(FH * 0.72)] = False
    m = m & ~nd.binary_dilation(lap, iterations=2)
    if 19 <= i <= 47:                                                     # the phone in his fingers, where Vision left it on
        mx, mn = f.max(2), f.min(2)                                       # the table: the dark glass touching his hand
        d = (lum < 0.26) & ((mx - mn) < 0.14); d[int(FH * 0.68):] = False
        d = nd.binary_closing(d, iterations=2)
        near = nd.binary_dilation(m, iterations=14)
        lab, n = nd.label(d)
        for k in range(1, n + 1):
            c = lab == k; z = c.sum()
            if 400 < z < 25000 and (c & near).any(): m |= nd.binary_fill_holes(c)
    lab, n = nd.label(m)
    if n > 1:                                                             # the arm, and the phone it holds (not always joined
        sz = nd.sum(m, lab, range(1, n + 1)); cy = nd.center_of_mass(m, lab, range(1, n + 1))   # to it): bits of knee out
        big = int(np.argmax(sz)) + 1
        m = np.isin(lab, [k + 1 for k in range(n) if k + 1 == big or (sz[k] > 300 and cy[k][0] < FH * 0.8)])
    if i >= 46:
        glass = m & ~skin_of(f) & ~((f[..., 2] - f[..., 0]) > 0.04)
        glass = nd.binary_opening(glass, iterations=1)
        k = (lum * 0.32 + 0.035)[..., None] * np.array([0.92, 0.97, 1.06], np.float32)
        f = np.where(glass[..., None], k, f)
        im = np.clip(f * 255, 0, 255).astype(np.uint8)
    return im, m


def right():
    ids = list(range(1, 139))
    H = homographies('v2', ids, R_REF, f'{W}/hR.json')
    frames, extra = {}, {}
    im, Lb = load('v2', R_REF)
    ph = phone_alone(im)
    wim = warp(im, H[R_REF], R_SIZE, R_OFF, border=cv2.BORDER_CONSTANT)
    pm = warp(ph.astype(np.uint8) * 255, H[R_REF], R_SIZE, R_OFF, cv2.INTER_NEAREST, cv2.BORDER_CONSTANT) > 127
    sR = R_S * KR / HS
    frames['p'] = grade(warpH(loadH('v2', R_REF), H[R_REF], R_SIZE, R_OFF, border=cv2.BORDER_CONSTANT), up(pm), sR)
    q = screen_quad(pm)
    extra['screen'] = (q * R_S).round(1).tolist()
    # HIS HAND WITHOUT THE PHONE (2026-11-19, the owner: "take the phone out of his hand before he picks it up it looks
    # bad"): 16-18, his fingers coming down on it, cut with the clip's phone taken out (where it lies — it is still on the
    # table plane — grown for its edge and bezel, all but his skin): the taps and the reach before he lifts it, over the
    # real phone lying there
    phz = nd.binary_dilation(pm, iterations=7)
    for i in R_IDS + [17, 18]:
        hand = i <= 18 and (('h%d' % i) not in frames) and str(i) in frames
        im, Lb = load('v2', i)
        _, _, rt = instances(Lb)
        im2, mm = clean_right(im, rt > 0, i)
        M = np.eye(3) if i >= 56 else H[i]                               # (at his ear the table is a blur: held as shot)
        imH = loadH('v2', i)
        if i >= 46:                                                       # (the at-ear glass made the phone's own dark, as clean_right did)
            fH = imH.astype(np.float32) / 255; lumH = fH.mean(2)
            mH = cv2.resize(mm.astype(np.uint8), (imH.shape[1], imH.shape[0]), interpolation=cv2.INTER_NEAREST) > 0
            glass = mH & ~skin_of(fH) & ~((fH[..., 2] - fH[..., 0]) > 0.04)
            glass = nd.binary_opening(glass, iterations=2)
            k = (lumH * 0.32 + 0.035)[..., None] * np.array([0.92, 0.97, 1.06], np.float32)
            imH = np.clip(np.where(glass[..., None], k, fH) * 255, 0, 255).astype(np.uint8)
        if 19 <= i <= 43:
            mH = cv2.resize(mm.astype(np.uint8), (imH.shape[1], imH.shape[0]), interpolation=cv2.INTER_NEAREST) > 0
            imH = bake_call_h(imH, mH)
        m = warp(mm.astype(np.uint8) * 255, M, R_SIZE, R_OFF) > 127
        if hand:
            f = warp(im, M, R_SIZE, R_OFF).astype(np.float32) / 255
            warmf = ((f[..., 0] - f[..., 1]) / (f[..., 0] + 1e-4) > 0.06) & (f.mean(2) > 0.24)   # (and not dark: the glass catches the table's warm and stayed as a black lump between his fingers)   # (his fingers over it in its shade are still warm; the phone is grey-black — skin_of wants them lit, and cut their shaded halves off)
            m &= ~(phz & ~warmf)
        # (his cuff's ragged foot — bits of knee and shadow hanging off it, "clean up all the traces", 2026-11-19 — out)
        m = nd.binary_fill_holes(keep_biggest(nd.binary_opening(m, iterations=3 if i >= 44 else 2), near=25, frac=0.15))
        wH = warpH(imH, M, R_SIZE, R_OFF)
        vH = up(warp(np.full((FH, FW), 255, np.uint8), M, R_SIZE, R_OFF, cv2.INTER_NEAREST, cv2.BORDER_CONSTANT) > 127) > 0.5
        wH = past_edge(wH, vH)
        frames[('h%d' % i) if hand else str(i)] = grade(wH, up(m), sR, edge_fade(vH))
        print('R', ('h%d' % i) if hand else i, int(m.sum()), flush=True)
    return frames, extra


def bake_call_h(rgb, mask):
    """bake_call at the clip's full size: the call's screen onto the lifted phone's glass"""
    f = rgb.astype(np.float32) / 255; lum = f.mean(2); mx, mn = f.max(2), f.min(2)
    glass = mask & (lum < 0.22) & ((mx - mn) < 0.14)
    glass[int(rgb.shape[0] * 0.68):] = False
    glass = nd.binary_opening(glass, iterations=3)
    lab, n = nd.label(glass)
    if not n: return rgb
    k = 1 + int(np.argmax(nd.sum(glass, lab, range(1, n + 1))))
    g = nd.binary_fill_holes(lab == k)
    if g.sum() < 600 * HS * HS: return rgb
    q = screen_quad(g)
    ui = ios_call().resize((360, 780), Image.LANCZOS)
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [360, 0], [360, 780], [0, 780]]), q)
    w = cv2.warpPerspective(np.asarray(ui), M, (rgb.shape[1], rgb.shape[0]), flags=cv2.INTER_LINEAR)
    o = rgb.copy(); o[g] = w[g]
    return o


def lgroup(k):
    """which part of the call a left frame is drawn in: 'T' the book alone (the title on), 'S' the syringe (39-48 s), 'F'
    the flips and the end in four parts ('F0'-'F3', 57-75 s) — each its own sheets, so main.js decodes a part only for its time"""
    if k == 'b1': return 'T'
    kk = k[1:] if k[:1] in ('f', 'h') and k[1:].isdigit() else k
    if kk.isdigit() and int(kk) <= 95: return 'S'
    n = int(kk) if kk.isdigit() else 245                              # (the flips in four parts of ~32 frames: 'F0'..'F3')
    return 'F%d' % min(3, max(0, (n - 119) // 32))


def pack(frames, name, group=lambda k: 'A'):
    """shelf-packed sheets (each at most 4096 square: a WebP stops at 16383, and a sheet is decoded whole) of every frame
    cropped to what it shows; [x, y, w, h, dx, dy, sheet] each (dx, dy: where the crop sits on the layer's canvas)."""
    rects, items = {}, []
    for k, fr in frames.items():
        a = fr[..., 3] > 0
        if not a.any(): rects[k] = None; continue
        ys, xs = np.nonzero(a); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        items.append((k, fr[y0:y1, x0:x1], int(x0), int(y0)))
    items.sort(key=lambda t: (group(t[0]), -t[1].shape[0]))
    SW = SH = 2048; sheets = [[]]; x = y = rowh = 0; groups = [items[0][0] and group(items[0][0])] if items else ['A']   # (2048: a sheet's first draw uploads it whole to the GPU — 64 MB at 4096 held a frame 70-100 ms, 2026-11-19)
    for k, c, dx, dy in items:
        h, w = c.shape[:2]
        if group(k) != groups[-1]: sheets.append([]); groups.append(group(k)); x = y = rowh = 0
        if x + w > SW: x = 0; y += rowh + 1; rowh = 0
        if y + h > SH: sheets.append([]); groups.append(group(k)); x = y = rowh = 0
        sheets[-1].append((k, c, x, y, dx, dy)); x += w + 1; rowh = max(rowh, h)
    for f in os.listdir(OUT):
        if f.startswith(name) and f.endswith('.webp'): os.remove(os.path.join(OUT, f))
    for n, place in enumerate(sheets):
        H = max(y + c.shape[0] for k, c, x, y, dx, dy in place)
        sheet = np.zeros((H, SW, 4), np.uint8)
        for k, c, x, y, dx, dy in place:
            sheet[y:y + c.shape[0], x:x + c.shape[1]] = c
            rects[k] = [x, y, c.shape[1], c.shape[0], dx, dy, n]
        Image.fromarray(sheet).save(f'{OUT}/{name}-{n}.webp', 'WEBP', quality=82, method=6, alpha_quality=90)
        print(name, n, SW, 'x', H, os.path.getsize(f'{OUT}/{name}-{n}.webp'), 'bytes,', len(place), 'frames')
    return rects, len(sheets), groups


Lf, Lp = left()
Rf, Rx = right()
meta = {
    # anchor: the canvas point that goes on the screen's bottom-left corner (L) / bottom-right (R): past it every frame's
    # own border (where the sleeve is only replicated) is off the screen
    'L': {'s': L_S, 'k': KL, 'canvas': [round(L_SIZE[0] * L_S), round(L_SIZE[1] * L_S)], 'anchor': [round((36 + L_OFF[0]) * L_S, 1), round((894 + L_OFF[1]) * L_S, 1)], 'frames': (pL := pack(Lf, 'left', lgroup))[0], 'sheets': pL[1], 'groups': pL[2], 'pen': Lp},
    'R': {'s': R_S, 'k': KR, 'canvas': [round(R_SIZE[0] * R_S), round(R_SIZE[1] * R_S)], 'anchor': [round((538 + R_OFF[0]) * R_S, 1), round((958 + R_OFF[1]) * R_S, 1)], 'frames': (pR := pack(Rf, 'right'))[0], 'sheets': pR[1], 'groups': pR[2], **Rx},
}
json.dump(meta, open(f'{OUT}/cut.json', 'w'), separators=(',', ':'))
print('wrote', f'{OUT}/cut.json')
