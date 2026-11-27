#!/usr/bin/env python3
"""A GLB's dangling textures and its transmission, cleaned (2026-11-25, the medieval props): `gltfpack.py --drop-mr` drops the
metal/roughness IMAGES but left four textures naming them, and the transmission extension's textures too — three.js's GLTFLoader
dies on the first ("Cannot read properties of undefined (reading 'uri')"). Those textures and every slot naming them are dropped,
KHR_materials_transmission with them (no glass water here), the rest renumbered; then gzipped (the game's `bwGunzip`).
    python3 tools/glb_fixtex.py in.glb assets/out.glb"""
import gzip, json, struct, sys
src, dst = sys.argv[1], sys.argv[2]
d = open(src, 'rb').read()
L = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + L]); rest = d[20 + L:]
ni = len(j.get('images', [])); bad = {i for i, t in enumerate(j.get('textures', [])) if t.get('source') is None or t['source'] >= ni}
for m in j.get('materials', []):
    ex = m.get('extensions', {}); ex.pop('KHR_materials_transmission', None)
    if not ex: m.pop('extensions', None)
    pb = m.get('pbrMetallicRoughness', {})
    for slot in list(pb.keys()):
        if slot.endswith('Texture') and pb[slot]['index'] in bad: pb.pop(slot)
    for slot in ('normalTexture', 'emissiveTexture', 'occlusionTexture'):
        if slot in m and m[slot]['index'] in bad: m.pop(slot)
eu = [e for e in j.get('extensionsUsed', []) if e != 'KHR_materials_transmission']
if eu: j['extensionsUsed'] = eu
else: j.pop('extensionsUsed', None)
keep = [i for i in range(len(j.get('textures', []))) if i not in bad]; remap = {o: n for n, o in enumerate(keep)}
j['textures'] = [j['textures'][i] for i in keep]
def fix(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k.endswith('Texture') and isinstance(v, dict) and 'index' in v: v['index'] = remap[v['index']]
            else: fix(v)
    elif isinstance(o, list):
        for v in o: fix(v)
fix(j.get('materials', []))
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
body = struct.pack('<II', len(js), 0x4E4F534A) + js + rest
out = struct.pack('<III', 0x46546C67, 2, 12 + len(body)) + body
open(dst, 'wb').write(gzip.compress(out, 9, mtime=0))
print('dropped textures', sorted(bad), '->', dst, len(out), 'bytes before gzip')
