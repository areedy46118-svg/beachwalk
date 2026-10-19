"""Castle XIII arch door: the mask of the WOOD in the door texture (acmat_1), so only the door swings and its painted stone
surround stays in the wall (2026-10-19, the owner: "trim this door better it should just be the door that opens not
concrete textures too"). Writes assets/c13-door-mask.png (and the frame mask is its inverse). /usr/bin/python3 tools/c13_door_mask.py"""
import json, struct, io, gzip, sys
import numpy as np
from PIL import Image, ImageDraw
d = open('/Users/ethanreedy/Dev/beachwalk/assets/castle13.glb', 'rb').read()
if d[:2] == b'\x1f\x8b': d = gzip.decompress(d)
jl = struct.unpack_from('<I', d, 12)[0]; g = json.loads(d[20:20 + jl]); bo = 20 + jl + 8
m = [m for m in g['materials'] if m['name'] == 'acmat_1'][0]
im = g['images'][g['textures'][m['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
v = g['bufferViews'][im['bufferView']]
N = 512
img = Image.open(io.BytesIO(d[bo + v['byteOffset']:bo + v['byteOffset'] + v['byteLength']])).convert('RGB').resize((N, N), Image.LANCZOS)
a = np.asarray(img).astype(np.float32); r, gg, b = a[..., 0], a[..., 1], a[..., 2]
wood = (r > 55) & (r > gg * 1.18) & (r > b * 1.45)
# the straight sides: per row the wood's 5th/95th percentile columns, rows in the upper half
L, R, T = [], [], None
for y in range(N):
    xs = np.where(wood[y])[0]
    if len(xs) > N * 0.3:
        if T is None: T = y
        if y < N * 0.45: L.append(np.percentile(xs, 3)); R.append(np.percentile(xs, 97))
l, rr = np.median(L) / N, np.median(R) / N
# the bottom of the arch: the lowest row with a fair run of wood in the middle
mid = int((l + rr) / 2 * N); col = wood[:, mid - 8:mid + 8].sum(1)
bot = max(y for y in range(N) if col[y] > 6) / N
top = T / N
print('left %.3f right %.3f top %.3f bottom %.3f' % (l, rr, top, bot))
# straight to where the arch begins (a half-ellipse as wide as the door, as deep as half its width)
cx, rx = (l + rr) / 2, (rr - l) / 2; ry = min(rx * 1.0, bot - top - 0.05); ys = bot - ry
M = Image.new('L', (N, N), 0); D = ImageDraw.Draw(M)
D.rectangle([l * N, top * N, rr * N, ys * N], fill=255)
D.ellipse([l * N, (ys - ry) * N, rr * N, (ys + ry) * N], fill=255)
M = M.resize((256, 256), Image.LANCZOS)
M.save('/Users/ethanreedy/Dev/beachwalk/assets/c13-door-mask.png', optimize=True)
ov = img.copy().resize((256, 256)); ovp = ov.load(); mp = M.load()
for y in range(256):
    for x in range(256):
        if mp[x, y] < 128: c = ovp[x, y]; ovp[x, y] = (c[0] // 3, c[1] // 3, c[2] // 3)
prev = Image.new('RGB', (512, 256)); prev.paste(img.resize((256, 256)), (0, 0)); prev.paste(ov, (256, 0)); prev.save('mask.jpg')
