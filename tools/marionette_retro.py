#!/usr/bin/env python3
"""The marionette's colour map, made the game's: its one image cut to a 24-colour palette (median cut, no dither: flat
patches of paint, like every canvas texture here) and stored PNG; the sampler set to nearest; written gzipped (`bwio`).
    /usr/bin/python3 tools/marionette_retro.py IN.glb assets/marionette.glb   (after tools/marionette_rig.py)"""
import io, json, struct, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bwio
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
d = open(src, 'rb').read()
jl = struct.unpack_from('<I', d, 12)[0]; g = json.loads(d[20:20 + jl]); bl = bytearray(d[20 + jl + 8:])
views = g['bufferViews']; blob = bytearray()
newv = []
for vi, v in enumerate(views):
    o, n = v.get('byteOffset', 0), v['byteLength']
    data = bytes(bl[o:o + n])
    for im in g.get('images', []):
        if im.get('bufferView') == vi:
            img = Image.open(io.BytesIO(data)).convert('RGB')
            img = img.quantize(colors=24, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
            b = io.BytesIO(); img.save(b, 'PNG', optimize=True); data = b.getvalue(); im['mimeType'] = 'image/png'
    blob.extend(b'\0' * ((4 - len(blob) % 4) % 4)); nv = dict(v); nv['byteOffset'] = len(blob); nv['byteLength'] = len(data); blob.extend(data); newv.append(nv)
g['bufferViews'] = newv
blob.extend(b'\0' * ((4 - len(blob) % 4) % 4))
g['buffers'] = [{'byteLength': len(blob)}]
for s in g.get('samplers', []) or []: s['magFilter'] = 9728; s['minFilter'] = 9728
if not g.get('samplers'): g['samplers'] = [{'magFilter': 9728, 'minFilter': 9728}]
for t in g.get('textures', []): t['sampler'] = 0
js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
bwio.write_bytes(dst, glb)
print('%s: %.0f KB raw, %.0f KB on disk' % (dst, len(glb) / 1024, os.path.getsize(dst) / 1024))
