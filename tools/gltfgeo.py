#!/usr/bin/env python3
"""Pull named meshes out of a glTF as positions + UVs + indices.

    python3 tools/gltfgeo.py scene.gltf out.json rock01 rock06

Writes a small JSON the game reads directly into BufferGeometry. Used for the
rock and grass packs, where the meshes are already only a few hundred
triangles and the value is in the silhouettes and the UVs, not in a rig.
"""
import json, os, struct, sys, base64

CT = {5120: ('b',1), 5121: ('B',1), 5122: ('h',2), 5123: ('H',2), 5125: ('I',4), 5126: ('f',4)}
NC = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}

def read(g, bufs, i):
    a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
    fmt, size = CT[a['componentType']]; n = NC[a['type']]
    stride = bv.get('byteStride') or size*n
    base = bv.get('byteOffset',0) + a.get('byteOffset',0)
    return [struct.unpack_from('<'+fmt*n, bufs[bv.get('buffer',0)], base+k*stride) for k in range(a['count'])]

src, dst, want = sys.argv[1], sys.argv[2], [w.lower() for w in sys.argv[3:]]
root = os.path.dirname(os.path.abspath(src))
g = json.load(open(src))
bufs = []
for b in g['buffers']:
    u = b.get('uri','')
    bufs.append(base64.b64decode(u.split(',',1)[1]) if u.startswith('data:') else open(os.path.join(root,u),'rb').read())

out = {}
for m in g['meshes']:
    nm = (m.get('name') or '').lower()
    if want and not any(w in nm for w in want):
        continue
    pr = m['primitives'][0]
    pos = read(g, bufs, pr['attributes']['POSITION'])
    uv = read(g, bufs, pr['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in pr['attributes'] else None
    idx = [v[0] for v in read(g, bufs, pr['indices'])] if 'indices' in pr else list(range(len(pos)))
    # normalise: sit on y=0, centred in x/z, unit height
    ys = [p[1] for p in pos]; xs = [p[0] for p in pos]; zs = [p[2] for p in pos]
    cx = (min(xs)+max(xs))/2; cz = (min(zs)+max(zs))/2; y0 = min(ys)
    h = max(1e-6, max(ys)-y0)
    key = m.get('name').split('_')[0]
    out[key] = {
        'p': [round(v, 4) for p in pos for v in ((p[0]-cx)/h, (p[1]-y0)/h, (p[2]-cz)/h)],
        'i': idx,
    }
    if uv: out[key]['u'] = [round(v, 4) for t in uv for v in (t[0], t[1])]
json.dump(out, open(dst,'w'), separators=(',',':'))
tot = sum(len(v['i'])//3 for v in out.values())
print(f'{dst}: {len(out)} meshes, {tot} tris, {os.path.getsize(dst)//1024} KB')
print(' ', ', '.join(out.keys()))
