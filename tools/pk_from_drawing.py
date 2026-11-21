#!/usr/bin/env python3
"""THE PACK'S BOX AND LINES IN THE OWNER'S OWN MARKER (2026-11-21, the owner, a photo of a sheet with a square and a line drawn
in black marker, ~/Downloads/IMG_7224.HEIC: "make this the square around the keys and use this drawn black line to improve the
inventories hand drawn feel"). The ink is read off the photo against the paper's OWN local brightness (a wide max-filter,
blurred: the shadow over the bottom of the sheet and its tone drop out), each mark cropped to itself, and written as the
alpha masks the pack's CSS already lays its strokes with (`--mk`):
    pk-rule1/2     2600x20   the line (2: mirrored), the sheet's long rules, its ink across rows ~6-13 as before
    pk-vrule       20x1300   the line stood up: the rule between the grid and the pane
    pk-short1/2    640x16    the line, short: the underlines under a name and a description
    sips -s format png ~/Downloads/IMG_7224.HEIC --out /tmp/draw.png
    /usr/bin/python3 -E tools/pk_from_drawing.py /tmp/draw.png
(native python: numpy, scipy, Pillow)."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32) / 255
H, W = src.shape[:2]
lum = src @ np.array([0.299, 0.587, 0.114], np.float32)
# the paper's own level at each point: the brightest round it, smoothed
small = Image.fromarray((lum * 255).astype(np.uint8)).resize((W // 8, H // 8), Image.BOX)
pm = nd.maximum_filter(np.asarray(small, np.float32) / 255, size=25)
pm = nd.gaussian_filter(pm, 6)
paper = np.asarray(Image.fromarray((pm * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR), np.float32) / 255
ink = np.clip((paper - lum) / np.maximum(0.2, paper * 0.62), 0, 1)
ink = np.clip((ink - 0.12) / 0.7, 0, 1) ** 0.9                         # (the paper's grain is not ink; the marker's own streaks are kept)
# only below the torn top (the spiral's holes are dark, and are not ink)
ink[: int(H * 0.2)] = 0
lab, n = nd.label(ink > 0.35)
sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
big = [i + 1 for i in np.argsort(-sizes)[:6] if sizes[i] > 2000]
objs = []
for i in big:
    sl = nd.find_objects(lab == i)[0]; y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
    objs.append((x0, y0, x1, y1, (x1 - x0) / max(1, y1 - y0)))
sq = max((o for o in objs if 0.6 < o[4] < 1.6), key=lambda o: (o[2] - o[0]) * (o[3] - o[1]))
ln = max((o for o in objs if o[4] > 8), key=lambda o: o[2] - o[0])
print('square', sq[:4], 'line', ln[:4])


def crop(o, pad):
    x0, y0, x1, y1 = o[:4]
    return ink[max(0, y0 - pad): y1 + pad, max(0, x0 - pad): x1 + pad]


def save(a, path):
    im = np.zeros(a.shape + (4,), np.uint8); im[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(im, 'RGBA').save(path, optimize=True); print('wrote', path, a.shape[::-1])


def fit(a, w, h):
    return np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS), np.float32) / 255


# the square: its strokes reach every edge of the mask, as the old one's did
# (the key box is NOT written here any more — the owner, after his square and then his line round it: "just go back to the old
# one": `pk-kc.png` is the one in git again)
L = crop(ln, 6)


def band(a, w, h, top, th):
    out = np.zeros((h, w), np.float32); out[top: top + th] = fit(a, w, th); return out


save(band(L, 2600, 20, 5, 10), 'assets/hud/pk-rule1.png')
save(band(L[:, ::-1], 2600, 20, 5, 10), 'assets/hud/pk-rule2.png')
save(band(L, 1300, 20, 5, 10).T.copy(), 'assets/hud/pk-vrule.png')
save(band(L, 640, 16, 3, 9), 'assets/hud/pk-short1.png')
save(band(L[:, ::-1], 640, 16, 3, 9), 'assets/hud/pk-short2.png')
