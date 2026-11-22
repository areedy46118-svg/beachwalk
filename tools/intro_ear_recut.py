"""THE PHONE TO HIS EAR, AS THE VIDEO HAS IT (2026-11-20, the owner: "FIX WHEN HE IS ON THE PHONE IN THE START CUTSCENE JUST MAKE
IT LOOK EXACTLY LIKE THE VIDEOS … CLEAN UP THE CUTSCENE AS MUCH AS YOU CAN"). The right hand's frames 44-99 of IMG_7209
re-cut and the right sheets re-packed (every other right frame kept as it is in the shipped sheets):

  44-55  the lift: the phone up off the table, face on, tipped and turned to his ear;
  56-99  at his ear: the phone a hand's width from the lens, its glass a dark slab down the right of the picture with his
         fingers over its top.

Vision's cut (`intro_cut_pack.py`) lost most of the phone at the ear (blurred, the table through its glass) and kept his
fingers and a sliver: a hand with nothing in it. This cuts by DIFFERENCE instead: each frame against the empty table — frame 10
(and 130, where the phone lay at 10), each lined up on the frame by a homography of the static left of the picture — what is
not the table is him and the phone; the part of it on the right, joined to the right or bottom edge, closed over the glass's
gaps. Then as the packer does: the at-ear glass made the phone's own dark, the colour graded, the sleeve carried past the
clip's edge and faded, packed at the same scale and place (one sprite px per px of the 540-wide clip; at his ear held as shot).

  W: a folder with v2/ and v2h/ (ffmpeg -i IMG_7209.MOV -vf "fps=12,scale=540:-2" W/v2/%03d.png; -vf fps=12 W/v2h/%03d.png)
  /usr/bin/python3 -E tools/intro_ear_recut.py W assets/intro [frames]       (frames: a comma list to preview into W/ear/)"""
import sys, os, json, numpy as np, cv2
from scipy import ndimage as nd
from PIL import Image

W, OUT = sys.argv[1], sys.argv[2]
ONLY = [int(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else None
# the packer's own helpers (grade, warp, warpH, up, past_edge, edge_fade, skin_of, pack …): its text up to where it runs
src = open(os.path.join(os.path.dirname(__file__), 'intro_cut_pack.py')).read()
src = src[:src.index('\nLf, Lp = left()')]
sys.argv = [sys.argv[0], W, OUT if not ONLY else os.path.join(W, 'ear')]
exec(compile(src, 'intro_cut_pack.py', 'exec'))

IDS = list(range(56, 100))
FWH, FHH = FW * HS, FH * HS
# THE PHONE'S GLASS, marked by hand on the clip at full size (its bezel is a crisp black line; the glass between is the table
# seen through it, which no colour test can tell from the table): [top-left by his thumb, top edge at the clip's right,
# the clip's right where the glass ends, the bottom-left corner] at keyframes, in between by the frame
PHONE = {56: [(700, 995), (1080, 860), (1080, 1560), (880, 1490)], 62: [(660, 1100), (1080, 990), (1080, 1700), (850, 1640)],
         70: [(690, 1120), (1080, 1080), (1080, 1750), (850, 1690)], 80: [(800, 1100), (1080, 1080), (1080, 1800), (985, 1760)],
         90: [(884, 1100), (1080, 1080), (1080, 1700), (1025, 1650)], 99: [(964, 1110), (1080, 1096), (1080, 1600), (1060, 1500)]}


def phone_at(i):
    ks = sorted(PHONE); i = min(max(i, ks[0]), ks[-1])
    for a, b in zip(ks, ks[1:]):
        if a <= i <= b:
            t = (i - a) / (b - a); return np.float32(PHONE[a]) * (1 - t) + np.float32(PHONE[b]) * t
    return np.float32(PHONE[ks[-1]])


def gc_refine(im, hand, gl):
    """THE FINGERS BY EACH FRAME'S OWN COLOURS (2026-11-22, the owner: "fix the fingers on the phone in the start cutscene they
    are all messed up and the trims are bad"). The skin-hue cut above tore his fingers (the wood is as warm, the blurred edge
    as pale as the paper): holes, loose bits, a ragged lump over the glass. GrabCut, seeded by it, learns this frame's skin, wood,
    paper and rug and draws the line between them: sure-hand where the hue cut is solid, sure-not-hand far from him and on the
    left of the picture, the rest for it to decide. Run at half size, the answer smoothed back up."""
    H, Wd = hand.shape; s = 0.5
    sm = cv2.resize(im, (int(Wd * s), int(H * s)), interpolation=cv2.INTER_AREA)
    hs = cv2.resize(hand.astype(np.uint8), sm.shape[1::-1], interpolation=cv2.INTER_NEAREST) > 0
    gs = cv2.resize(gl.astype(np.uint8), sm.shape[1::-1], interpolation=cv2.INTER_NEAREST) > 0
    m = np.full(hs.shape, cv2.GC_BGD, np.uint8)
    near = nd.binary_dilation(hs | gs, iterations=45)
    m[near] = cv2.GC_PR_BGD
    m[nd.binary_dilation(hs, iterations=4)] = cv2.GC_PR_FGD
    m[nd.binary_erosion(hs, iterations=7)] = cv2.GC_FGD
    m[nd.binary_erosion(gs, iterations=12)] = cv2.GC_FGD                 # (the glass: his, whatever shows through it)
    m[:, :int(m.shape[1] * 0.3)] = cv2.GC_BGD
    if not (m == cv2.GC_FGD).any(): return hand
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(cv2.cvtColor(sm, cv2.COLOR_RGB2BGR), m, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
    out = (m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)
    out = cv2.GaussianBlur(cv2.resize(out.astype(np.float32), (Wd, H), interpolation=cv2.INTER_LINEAR), (0, 0), 2.5) > 0.5
    out = nd.binary_fill_holes(out | gl) & ~gl | (out & gl & nd.binary_dilation(hand, iterations=6))
    lb, n = nd.label(out | gl)
    if n > 1:
        sz = nd.sum(out | gl, lb, range(1, n + 1)); big = 1 + int(np.argmax(sz))
        out &= lb == big                                                  # (one piece: him and the phone; nothing loose)
    return out


def cut(i):
    """frame i at full size: the glass (hand-marked, filled dark from the clip's own pixels — his bezel and the reflections
    stay), and his hand over it and under it (skin, joined to the glass or to the clip's edge)"""
    im = loadH('v2', i); f = im.astype(np.float32) / 255; lum = f.mean(2)
    poly = np.zeros((FHH, FWH), np.uint8)
    q = phone_at(i).copy(); q[q[:, 0] >= FWH - 1, 0] = FWH + 40                # (past the clip's right edge: it goes on off it)
    cv2.fillPoly(poly, [q.round().astype(np.int32)], 255, cv2.LINE_AA)
    glassA = poly.astype(np.float32) / 255
    r, g, bl = f[..., 0], f[..., 1], f[..., 2]
    hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV); hh, ss, vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # (skin, not the table: the wood is as warm, but yellower and more saturated — hue 12-20 against skin's 0-11)
    sk = ((hh <= 11) | (hh >= 172)) & (ss >= 30) & (ss <= 165) & (vv > 85) & (r > bl + 0.05)
    sk[:, :int(FWH * 0.38)] = False
    sk = nd.binary_opening(sk, iterations=2)
    lb, n = nd.label(sk); hand = np.zeros_like(sk); near = nd.binary_dilation(glassA > 0.5, iterations=30)
    for k in range(1, n + 1):
        c = lb == k; z = c.sum()
        if z < 3000: continue
        ys, xs = np.nonzero(c)
        if (c & near).any() or ((xs.max() > FWH - 30 or ys.max() > FHH - 30) and xs.mean() > FWH * 0.5): hand |= c
    # (his palm under the glass, lit pale: a looser skin joined to what is already his hand, closed into one shape)
    pale = ((hh <= 14) | (hh >= 170)) & (ss >= 10) & (vv > 120) & (r >= g) & (g >= bl - 0.02)
    pale[:, :int(max(0, q[:, 0].min() - 140))] = False; pale[:int(q[3][1]) - 220] = False   # (only his palm, under the glass: paper between his thumb and its top edge is not him)
    lb2, n2 = nd.label(pale | hand); grow = np.zeros_like(hand)
    for k in range(1, n2 + 1):
        c = lb2 == k
        if (c & hand).any(): grow |= c
    grow = nd.binary_closing(grow, iterations=18); grow[:int(q[3][1]) - 220] = hand[:int(q[3][1]) - 220]   # (the closing only where the palm is)
    hand = nd.binary_fill_holes(grow)
    hand = nd.binary_opening(hand, iterations=3)
    # (CLEAN TRIMS — 2026-11-21, the owner: "improve how its picked up too with better trims": his fingers over the glass's top came
    #  out as loose pink blobs with the room showing between them and the phone, and ragged. A finger touching the glass is
    #  joined to it — the gap closed only where both sides are his hand or the glass, never out into the room — the outline is
    #  smoothed at full size (a blur cut at half), and what is left lying loose (under a fingertip's size) goes.)
    gl = glassA > 0.5
    hand = gc_refine(im, hand, gl)
    bridge = nd.binary_closing(hand | gl, iterations=9) & ~gl & nd.binary_dilation(hand, iterations=9)
    hand = hand | bridge
    hand = cv2.GaussianBlur(hand.astype(np.float32), (0, 0), 3.0) > 0.5
    lb3, n3 = nd.label(hand | gl)
    if n3 > 1:
        sz3 = nd.sum(hand | gl, lb3, range(1, n3 + 1))
        keep = np.isin(lb3, [1 + j for j in range(n3) if sz3[j] >= 2500])
        hand &= keep
    handA = cv2.GaussianBlur(hand.astype(np.float32), (0, 0), 1.5)
    # the glass: the clip's own light through it, drained of every colour and pressed flat — the table behind it (the paper,
    # the red book) read through as orange chips and white blocks (2026-11-22, the owner: "the trims are bad"); a soft dark
    # slab with only the faint shapes left, and his finger behind it where the cut above says he is
    lb_ = cv2.GaussianBlur(lum, (0, 0), 6)
    neu = (lb_ * 0.13 + 0.035)[..., None] * np.array([0.92, 0.97, 1.06], np.float32)
    dark = neu
    # (what is seen THROUGH the glass — the finger behind it, and the red book behind that on the first frames — is the glass's:
    # darker and drained, as the real tint makes it; only his hand outside it keeps the clip's own colour)
    thru = (cv2.GaussianBlur(glassA, (0, 0), 2) * (1 - cv2.GaussianBlur((hand & ~gl).astype(np.float32), (0, 0), 2)))[..., None]
    fg_ = f * (1 - thru) + (lum[..., None] * 0.6 + f * 0.4) * 0.6 * thru
    col = fg_ * handA[..., None] + dark * (1 - handA[..., None])
    a = np.maximum(glassA, handA)
    return a, np.clip(col * 255, 0, 255).astype(np.uint8)


def clean_lift(fr, k):
    """the old lift frames, mended: a chunk of the table on his hand (44-46) out; the black blots on his wrist (50-54) — the
    knee and the shadow Vision left in him — painted over from the skin round them"""
    rgb = fr[..., :3].copy(); al = fr[..., 3].copy()
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    if k in (44, 45, 46):
        hh, ss, vv = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
        f = rgb.astype(np.float32) / 255; r, g, b = f[..., 0], f[..., 1], f[..., 2]
        skin = ((hh <= 11) | (hh >= 172)) & (ss >= 30) & (vv > 85)
        wood = (hh >= 12) & (hh <= 28) & (ss > 50) & (vv > 90)                        # the table
        paper = (vv > 200) & (ss < 30)                                                # the form on it
        grey = (vv > 80) & (vv < 200) & (ss < 28) & ~(b > r + 0.04)                     # the chair behind (the sleeve is navy)
        lum = f.mean(2)
        # (what is HIM, kept — the rest goes: his skin, reddish however pale the grade left it; the phone, near black; his
        # navy sleeve. Taking the table, the paper and the chair out by their own colours ate holes in his pale skin.)
        him = ((((hh <= 11) | (hh >= 172)) & (r > b + 0.03)) | (lum < 0.2) | ((lum < 0.36) & (b >= r - 0.03))) & ~wood & (al > 0)
        him = nd.binary_fill_holes(nd.binary_closing(nd.binary_opening(him, iterations=1), iterations=3))
        lb, n = nd.label(him)
        if n: sz = nd.sum(him, lb, range(1, n + 1)); him = lb == 1 + int(np.argmax(sz))
        al[~nd.binary_dilation(him, iterations=1)] = 0
    if k in (50, 51, 52, 53, 54):
        lum = rgb.astype(np.float32).mean(2) / 255
        f = rgb.astype(np.float32) / 255; r, g = f[..., 0], f[..., 1]
        skin = ((r - g) / (r + 1e-4) > 0.06) & (lum > 0.35) & (al > 200)
        dk = (lum < 0.16) & (al > 0)
        lb, n = nd.label(dk); blot = np.zeros_like(dk)
        for j in range(1, n + 1):
            c = lb == j; z = c.sum()
            if z > 9000: continue                                           # (the phone and the sleeve: not blots)
            ring = nd.binary_dilation(c, iterations=4) & ~c
            if ring.sum() and (skin & ring).sum() / ring.sum() > 0.45: blot |= c
        if k == 50:                                                         # (the chair behind, over the phone's top end: nothing above the phone)
            ph = (lum < 0.1) & (al > 200); lb, n = nd.label(ph)
            if n:
                big = lb == 1 + int(np.argmax(nd.sum(ph, lb, range(1, n + 1)))); ys, xs = np.nonzero(big)
                al[:ys.min() + 6] = 0
        if blot.any(): rgb = cv2.inpaint(rgb, nd.binary_dilation(blot, iterations=2).astype(np.uint8) * 255, 6, cv2.INPAINT_TELEA)
    return np.dstack([rgb, al])


new = {}
for i in [x for x in (ONLY or IDS) if x >= 56]:
    aH, imH = cut(i)
    M = np.eye(3)                                                        # (at his ear: held as shot, as the packer held 56+)
    a = warpH((aH * 255).astype(np.uint8), M, R_SIZE, R_OFF).astype(np.float32) / 255
    wH = warpH(imH, M, R_SIZE, R_OFF)
    vH = up(warp(np.full((FH, FW), 255, np.uint8), M, R_SIZE, R_OFF, cv2.INTER_NEAREST, cv2.BORDER_CONSTANT) > 127) > 0.5
    wH = past_edge(wH, vH)
    new[str(i)] = grade(wH, a, R_S * KR / HS, edge_fade(vH))
    print('R', i, int((a > 0.5).sum()), flush=True)

# the lift's own frames, from the shipped sheets, mended
meta = json.load(open(os.path.join(sys.argv[2] if ONLY else OUT, 'cut.json') if not ONLY else 'assets/intro/cut.json')); R = meta['R']
_sheets = {}
def shipped(k):
    r = R['frames'].get(k)
    if not r: return None
    x, y, w, h, dx, dy, sh = r
    if sh not in _sheets: _sheets[sh] = np.asarray(Image.open(f'assets/intro/right-{sh}.webp').convert('RGBA'))
    cw, ch = round(R['canvas'][0] * KR), round(R['canvas'][1] * KR)
    c = np.zeros((ch, cw, 4), np.uint8); c[dy:dy + h, dx:dx + w] = _sheets[sh][y:y + h, x:x + w][:ch - dy, :cw - dx]; return c
for k in (50, 51, 52, 53, 54):
    if ONLY and k not in ONLY: continue
    fr = shipped(str(k))
    if fr is not None: new[str(k)] = clean_lift(fr, k)

if ONLY:
    os.makedirs(f'{W}/ear', exist_ok=True)
    tiles = []
    for k, fr in new.items():
        bg = np.zeros(fr.shape[:2] + (3,), np.float32); bg[:] = (40, 44, 60)
        a = fr[..., 3:4] / 255; tiles.append((bg * (1 - a) + fr[..., :3] * a).astype(np.uint8))
    h = max(t.shape[0] for t in tiles); tiles = [np.pad(t, ((0, h - t.shape[0]), (0, 0), (0, 0))) for t in tiles]
    Image.fromarray(np.concatenate(tiles, 1)).save(f'{W}/ear/recut.jpg', quality=85)
    print('wrote', f'{W}/ear/recut.jpg'); sys.exit(0)

# ---- every other right frame as it is shipped, back off its sheets onto the canvas, and the whole right side packed again
sheets = [np.asarray(Image.open(f'{OUT}/right-{n}.webp').convert('RGBA')) for n in range(R['sheets'])]
DROP = {'44', '45', '46', '47', '55', '73', '74'}                        # (the lift's first frames — the table and the chair cut in with him — broken 47, torn 55, and the old at-ear 73-74: not played)
cw, ch = round(R['canvas'][0] * KR), round(R['canvas'][1] * KR)
frames = {}
for k, r in R['frames'].items():
    if k in new or k in DROP: continue
    canvas = np.zeros((max(ch, 1), max(cw, 1), 4), np.uint8)
    if r:
        x, y, w, h, dx, dy, sh = r; c = sheets[sh][y:y + h, x:x + w]
        hh, ww = min(h, canvas.shape[0] - dy), min(w, canvas.shape[1] - dx)
        canvas[dy:dy + hh, dx:dx + ww] = c[:hh, :ww]
    frames[k] = canvas
for k, fr in new.items():
    canvas = np.zeros((max(ch, fr.shape[0]), max(cw, fr.shape[1]), 4), np.uint8); canvas[:fr.shape[0], :fr.shape[1]] = fr; frames[k] = canvas
rects, n, groups = pack(frames, 'right')
R['frames'] = rects; R['sheets'] = n; R['groups'] = groups
json.dump(meta, open(f'{OUT}/cut.json', 'w'), separators=(',', ':'))
print('wrote', f'{OUT}/cut.json', 'right sheets', n)
