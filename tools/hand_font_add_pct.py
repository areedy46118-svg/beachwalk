#!/usr/bin/env python3
"""A % IN THE OWNER'S HAND (2026-11-21, the owner, of "Loading n%" under the title: "use some of my stuff to make the % look
handdrawn too"). His alphabet's font (`hand_font_pack.py`) has the letters and the HUD's drawn digits and no %, so the
browser drew one from the next family. This adds the glyph to the font as it is, made of his own marks: his drawn 0
(`assets/hud/d0.png`) twice, small, up left and down right, and between them a stroke of the line he drew in marker
(`assets/hud/pk-rule1.png`, from IMG_7224) laid on the slant — traced the font's way (`glyph_from`: one stroke weight,
pixel-edge loops simplified and smoothed), at the capitals' height.
    /usr/bin/python3 -E tools/hand_font_add_pct.py assets/hand-font.woff"""
import sys, os
import numpy as np
from PIL import Image
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = sys.argv[1]
src = open(os.path.join(HERE, 'hand_font_pack.py')).read().split('\ndef main():')[0]
sys.argv = ['x', 'unused', 'unused']
G = {'__file__': os.path.join(HERE, 'hand_font_pack.py')}; exec(src, G)
glyph_from, draw_glyph, CAP, SIDE = G['glyph_from'], G['draw_glyph'], G['CAP'], G['SIDE']


def alpha(path):
    a = np.asarray(Image.open(path).convert('RGBA').split()[-1], np.float32) / 255
    ys, xs = np.where(a > 0.4); return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


W, H = 520, 700
can = np.zeros((H, W), np.float32)
z = alpha(os.path.join(HERE, '..', 'assets', 'hud', 'd0.png'))
zh = 250; zw = int(round(z.shape[1] * zh / z.shape[0]))
zi = np.asarray(Image.fromarray((z * 255).astype(np.uint8)).resize((zw, zh), Image.LANCZOS), np.float32) / 255
can[10:10 + zh, 20:20 + zw] = np.maximum(can[10:10 + zh, 20:20 + zw], zi)
can[H - 10 - zh:H - 10, W - 20 - zw:W - 20] = np.maximum(can[H - 10 - zh:H - 10, W - 20 - zw:W - 20], zi[::-1, ::-1])
ln = alpha(os.path.join(HERE, '..', 'assets', 'hud', 'pk-rule1.png'))
L = int(np.hypot(W - 80, H - 20))
li = Image.fromarray((ln * 255).astype(np.uint8)).resize((L, 42), Image.LANCZOS)
ang = np.degrees(np.arctan2(H - 20, W - 80))
li = li.rotate(ang, expand=True, resample=Image.BICUBIC)
la = np.asarray(li, np.float32) / 255
y0 = (H - la.shape[0]) // 2; x0 = (W - la.shape[1]) // 2
ys0, ys1 = max(0, y0), min(H, y0 + la.shape[0]); xs0, xs1 = max(0, x0), min(W, x0 + la.shape[1])
can[ys0:ys1, xs0:xs1] = np.maximum(can[ys0:ys1, xs0:xs1], la[ys0 - y0:ys1 - y0, xs0 - x0:xs1 - x0])
if os.environ.get('PCT_PREVIEW'): Image.fromarray(((1 - can) * 255).astype(np.uint8)).save(os.environ['PCT_PREVIEW'])   # (the marks laid out, before tracing)
cons, adv = glyph_from(can, CAP)

f = TTFont(FONT)
name = 'percent'
order = f.getGlyphOrder()
if name not in order: f.setGlyphOrder(order + [name])
f['glyf'].glyphs[name] = draw_glyph(cons)
f['glyf'][name].recalcBounds(f['glyf'])
f['hmtx'].metrics[name] = (adv, SIDE)
for t in f['cmap'].tables:
    if t.isUnicode(): t.cmap[ord('%')] = name
f['maxp'].numGlyphs = len(f.getGlyphOrder())
f.flavor = 'woff'
f.save(FONT)
print('wrote', FONT, os.path.getsize(FONT), 'bytes; % advance', adv)
