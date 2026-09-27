#!/usr/bin/env python3
"""Pack Poly Haven's "sand_03" (CC0) into the beach's two maps.

    python3 tools/sand_pack.py ~/Downloads/sand_03_4k/textures

The photo's own colour map is nearly flat (sd ~12 of 255) and warm; the
detail is in the DISPLACEMENT, which is trodden sand — heel dents, ridges,
grains. At night the moon is 4 % of the light on the beach, so a bump map
alone barely shows; the relief is therefore also baked into the albedo as
cavity shading, and the albedo is re-toned to the old canvas's own mean
colour and spread (66.9, 75.0, 91.5 / sd ~18.5) so the beach keeps its
tone and only gains detail. Quantised in steps of 8 for the retro look.
"""
import sys, os, math
from PIL import Image, ImageFilter, ImageStat

Image.MAX_IMAGE_PIXELS = None
SRC = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Downloads/sand_03_4k/textures')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
N = 512
# LIFTED A FIFTH AND SOFTENED: the owner's word was that the beach read very
# dark and did not blend. At a 0.55 swing the dents went to a quarter of the
# mean at the tails and the eye sees the darks, not the mean; the level was
# the old canvas's, which under the cloud shade on top read as navy.
MEAN = (66.9 * 1.22, 75.0 * 1.22, 91.5 * 1.20)
SPREAD = 0.30          # how far detail swings the level, in log units (e^0.30 = 1.35x a sigma)
STEP = 4

diff = Image.open(os.path.join(SRC, 'sand_03_diff_4k.jpg')).convert('L').resize((N, N), Image.LANCZOS)
disp = Image.open(os.path.join(SRC, 'sand_03_disp_4k.png'))
if disp.mode.startswith('I'):
    disp = disp.point(lambda v: v / 256).convert('L')
disp = disp.convert('L').resize((N, N), Image.LANCZOS)

def zmap(im):
    s = ImageStat.Stat(im)
    m, sd = s.mean[0], max(s.stddev[0], 1e-3)
    return [(v - m) / sd for v in list(im.getdata())]

zd, zh = zmap(diff), zmap(disp)
# broad cavity: a blurred copy says where the dents are, sharp copy the grain
zb = zmap(disp.filter(ImageFilter.GaussianBlur(3)))
t = [0.60 * a + 0.55 * b + 0.15 * c for a, b, c in zip(zd, zh, zb)]
sd = (sum(v * v for v in t) / len(t)) ** 0.5
out = Image.new('RGB', (N, N))
px = []
# multiplicative, not additive: the map is read as LINEAR and the frame is
# sRGB-encoded and tone-mapped after, which squashes an additive swing of
# +-60 % into a few levels you cannot see at night. A log-space swing keeps
# the dents dark and the ridges bright on screen; the mean is put back after.
ks = [math.exp(SPREAD * max(-2.4, min(2.4, v / sd))) for v in t]
km = sum(ks) / len(ks)
for k in ks:
    k /= km
    px.append(tuple(max(0, min(255, int(round(m * k / STEP)) * STEP)) for m in MEAN))
out.putdata(px)
out.save(os.path.join(OUT, 'sand-diff.jpg'), quality=92)

# the bump: full range, a touch of blur so single texels do not sparkle
lo, hi = disp.getextrema()
bump = disp.point(lambda v: int((v - lo) * 255 / max(1, hi - lo)))
bump.save(os.path.join(OUT, 'sand-bump.jpg'), quality=92)
print('wrote', N, 'px maps; albedo mean', [round(x, 1) for x in ImageStat.Stat(out).mean])
