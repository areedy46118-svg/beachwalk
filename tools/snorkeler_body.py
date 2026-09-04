"""Rebuild assets/snorkeler.png from the photo with the body under the water kept.

The person segmentation (tools/cutout.swift) ends at the neck, and a neck
ending in a line at the surface is a head on a plate. This keeps the
segmentation's alpha for the head and, below the neck, the photograph's own
pixels -- the suit seen through the water -- under a soft shoulder-shaped
mask that fades to nothing toward the bottom, blurred through the join.

    swift tools/cutout.swift assets/snorkeler.jpg assets/snorkeler.png 900
    python3 tools/snorkeler_body.py

X0/Y0 is where the cut-out sits in the photo (found by matching)."""
from PIL import Image, ImageFilter
import numpy as np
src = Image.open('assets/snorkeler.jpg').convert('RGB')
cut = Image.open('assets/snorkeler.png').convert('RGBA')
X0, Y0 = 59, 50
W, H = cut.size; sw, sh = src.size
OUT_H = min(479, sh - Y0)
rgb = np.array(src.crop((X0, Y0, X0 + W, Y0 + OUT_H))).astype(np.float32)
alpha = np.zeros((OUT_H, W), np.float32)
alpha[:H, :] = np.array(cut)[:, :, 3].astype(np.float32) / 255.0
neck_row = H - 14
cx = W * 0.52
yy, xx = np.mgrid[0:OUT_H, 0:W]
t = np.clip((yy - neck_row) / (OUT_H - neck_row), 0, 1)
half = W * 0.18 + (W * 0.50 - W * 0.18) * np.clip(t * 3.2, 0, 1)
lat = np.clip(1 - ((np.abs(xx - cx) - half * 0.72) / (half * 0.34)), 0, 1)
vert = np.clip(1 - (t - 0.30) / 0.62, 0, 1)
body = (yy >= neck_row - 6) * lat * vert
body = np.array(Image.fromarray((body * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(np.float32) / 255.0
alpha = np.maximum(alpha, body)
band = (yy > neck_row - 12) & (yy < neck_row + 22)
a_blur = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255.0
alpha = np.where(band, np.maximum(alpha, a_blur), alpha)
Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA').save('assets/snorkeler.png')
print('wrote assets/snorkeler.png', (W, OUT_H))
