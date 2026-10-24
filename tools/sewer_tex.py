#!/usr/bin/env python3
"""The sewer kit's own surfaces, out of assets/sewer.glb, for the drain to wear.

    python3 tools/sewer_tex.py

The drain (`models/drainage-tunnel-home.js`) is built at boot, long before the
sewer's glb is wanted, and its walls were painted on canvases. The owner wanted
it in the sewer's own brick and concrete (2026-10-23: "revamp the sewer tunnel
using the modular sewer textures to better match the deeper sewerrooms area"),
so the kit's colour maps are copied out as they were packed (256 px, by
`tools/sewer_pack.py`) into assets/sewer-tex/<material>.jpg. No resampling: the
drain quantises them itself, the way it does its own paint.
"""
import io, json, os, struct
from PIL import Image

SRC = 'assets/sewer.glb'
OUT = 'assets/sewer-tex'
WANT = ['brick_modern_01', 'brick_modern', 'concrete_base', 'concrete_bare_01', 'brick_pavement', 'Metal']

d = open(SRC, 'rb').read()
n = struct.unpack('<I', d[12:16])[0]
g = json.loads(d[20:20 + n])
b0 = 20 + n
B = d[b0 + 8:b0 + 8 + struct.unpack('<I', d[b0:b0 + 4])[0]]
os.makedirs(OUT, exist_ok=True)
for m in g['materials']:
    if m['name'] not in WANT: continue
    im = g['images'][g['textures'][m['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
    v = g['bufferViews'][im['bufferView']]
    o = v.get('byteOffset', 0)
    I = Image.open(io.BytesIO(B[o:o + v['byteLength']])).convert('RGB')
    p = os.path.join(OUT, m['name'] + '.jpg')
    I.save(p, quality=88)
    print(p, I.size, os.path.getsize(p))
