"""Build assets/snorkeler.png from the photo, keeping his body under the water.

The person segmentation (tools/cutout.swift) is only used for what it is good
at -- taking the hills and sky off from around the head, mask and tube. From
the chin down NOTHING is segmented: every pink pixel in the picture (the suit,
seen through the water, and its colour on the water) is kept by a soft colour
matte, so the neck and chest come out of the sea the way they do in the photo,
and the bottom of the frame fades so the picture never ends on a line.

    swift tools/cutout.swift incoming/unused-2026-10-15/snorkeler.jpg /tmp/snorkeler-head.png 900
    python3 tools/snorkeler_body.py [/tmp/snorkeler-head.png]

X0/Y0 is where that head cut-out sits in the photo (found by matching)."""
import sys, colorsys
from PIL import Image, ImageFilter
import numpy as np
head_path = sys.argv[1] if len(sys.argv) > 1 else 'incoming/unused-2026-10-15/snorkeler-head.png'
src = Image.open('incoming/unused-2026-10-15/snorkeler.jpg')   # (the source photos left assets/ on 2026-10-15: the game never loads them).convert('RGB')
head = Image.open(head_path).convert('RGBA')
X0, Y0 = 59, 50
W, H = head.size; sw, sh = src.size
OUT_H = min(479, sh - Y0)
region = src.crop((X0, Y0, X0 + W, Y0 + OUT_H))
rgb = np.array(region).astype(np.float32)
# --- the head, by segmentation (hills and sky have to come off somehow)
head_a = np.zeros((OUT_H, W), np.float32)
head_a[:H, :] = np.array(head)[:, :, 3].astype(np.float32) / 255.0
# --- everything pink, by colour
r, g, b = rgb[:, :, 0] / 255, rgb[:, :, 1] / 255, rgb[:, :, 2] / 255
mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
# pink / magenta: red well above green, blue not far below red
pinkness = np.clip((r - g - 0.10) / 0.22, 0, 1) * np.clip((b - g + 0.02) / 0.16, 0, 1) * np.clip((sat - 0.18) / 0.22, 0, 1) * np.clip((mx - 0.18) / 0.2, 0, 1)
yy, xx = np.mgrid[0:OUT_H, 0:W]
rows = np.where((head_a > 0.5).sum(1) > 0)[0]
chin = int(rows.max()) - 26                      # just above where the segmentation ends at the neck
cx = W * 0.52
window = np.clip(1 - (np.abs(xx - cx) - W * 0.46) / (W * 0.12), 0, 1)   # nearly the full width, soft at the sides
below = np.clip((yy - (chin - 24)) / 30, 0, 1)   # the matte takes over under the chin
body_a = pinkness * window * below
body_a = np.array(Image.fromarray((body_a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2))).astype(np.float32) / 255.0
body_a = np.clip(body_a * 1.6, 0, 1)             # the blur thinned it; fill the suit back in
# --- the suit under the water is the HOOD'S pink, not the red the water made of it.
# Seen through the sea the suit came out dark red, which on a night beach read
# as a body. So: the hood's own colour is measured off the head, the body's
# silhouette is closed up so the water showing through it fills in, and every
# pixel in it is re-coloured to that pink, keeping only the picture's own
# light and shade (its luminance) so the wet folds still read.
head_pink = (pinkness > 0.5) & (head_a > 0.5) & (yy < chin - 40)
hood = rgb[head_pink].mean(0) if head_pink.any() else np.array([214.0, 52.0, 122.0])
sil = Image.fromarray((np.clip(body_a * 2.2, 0, 1) * 255).astype(np.uint8))
sil = sil.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(2))
sil = np.array(sil).astype(np.float32) / 255.0 * below
lum = (0.30 * rgb[:, :, 0] + 0.59 * rgb[:, :, 1] + 0.11 * rgb[:, :, 2])
hood_lum = 0.30 * hood[0] + 0.59 * hood[1] + 0.11 * hood[2]
shade = np.clip(lum / max(hood_lum, 1.0), 0.55, 1.15)[:, :, None]
recol = np.clip(hood[None, None, :] * shade, 0, 255)
k = (sil * 0.92)[:, :, None]                     # how far toward the hood's pink
rgb = rgb * (1 - k) + recol * k
body_a = np.maximum(body_a, sil)
# --- join and fade
alpha = np.maximum(head_a * (1 - below) + head_a * below, body_a)
alpha = np.maximum(alpha, head_a * (yy < chin + 6))
fade = np.clip((OUT_H - 1 - yy) / (OUT_H * 0.16), 0, 1)     # the last sixth fades to nothing
alpha = alpha * fade
alpha = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))).astype(np.float32) / 255.0
Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA').save('assets/snorkeler.png')
print('wrote assets/snorkeler.png', (W, OUT_H), 'chin row', chin)
