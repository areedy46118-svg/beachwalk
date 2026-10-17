"""Build assets/connection-ring.glb from the owner's "Gold ring" (Bladeblend, CC-BY-4.0).

    python3 -I tools/connection_ring_pack.py ~/Downloads/gold_ring/scene.gltf

The owner, 2026-10-17: "use the ring model I just provided to make an exact copy ... use the least amount of MB for
the ring but make it look exact". So nothing that draws is changed — every vertex and every triangle of all six
meshes, the node transforms, the two materials as they are — and only the STORAGE is:
  * POSITION and NORMAL as normalized int16 across each primitive's own range, the range in the primitive's extras as
    `bwQ` — the exact format of `tools/glbquant.py`, so `bwDequant` in main.js turns them back into Float32 before any
    game code sees the mesh. A step is 1/65534 of the range (printed below: well under a micrometre at game size);
  * the indices as uint16 (no primitive has 65,536 vertices; the source stores them as uint32);
  * TEXCOORD_0 dropped: there is no texture on this ring, so nothing reads it;
  * the whole file gzipped (`bwGunzip` inflates it).
"""
import gzip, json, math, os, struct, sys

src = os.path.expanduser(sys.argv[1])
here = os.path.dirname(os.path.abspath(__file__))
dst = os.path.join(here, '..', 'assets', 'connection-ring.glb')
g = json.load(open(src))
binb = open(os.path.join(os.path.dirname(src), g['buffers'][0]['uri']), 'rb').read()
CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
bvs, accs = g['bufferViews'], g['accessors']

def read_acc(a):
    f, sz = CT[a['componentType']]; n = NC[a['type']]
    v = bvs[a['bufferView']]; st = v.get('byteStride', sz * n); o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + f * n, binb, o + i * st) for i in range(a['count'])]

out = bytearray(); views = []; new_accs = []
def add_view(data, target):
    while len(out) % 4: out.append(0)
    views.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data), 'target': target})
    out.extend(data); return len(views) - 1

worst = 0.0
for mesh in g['meshes']:
    for p in mesh['primitives']:
        attrs = {}
        Q = {}
        for name, ai in p['attributes'].items():
            if name.startswith('TEXCOORD'):
                continue                                           # no texture on this ring
            a = accs[ai]; vals = read_acc(a); n = NC[a['type']]
            lo = [min(v[c] for v in vals) for c in range(n)]; hi = [max(v[c] for v in vals) for c in range(n)]
            data = bytearray()
            for v in vals:
                for c in range(n):
                    r = hi[c] - lo[c]
                    q = 0 if r == 0 else round(((v[c] - lo[c]) / r) * 65534 - 32767)
                    q = max(-32767, min(32767, q))
                    data += struct.pack('<h', q)
                    back = lo[c] + (q / 32767 + 1) * 0.5 * r
                    if name == 'POSITION': worst = max(worst, abs(back - v[c]) / max(1e-9, max(h - l for h, l in zip(hi, lo))))
            while len(data) % 4: data += b'\0'
            bv = add_view(bytes(data), 34962)
            new_accs.append({'bufferView': bv, 'componentType': 5122, 'normalized': True, 'count': a['count'], 'type': a['type'],
                             'min': [-32767] * n, 'max': [32767] * n})
            attrs[name] = len(new_accs) - 1
            Q[name] = lo + hi
        p['attributes'] = attrs
        p.setdefault('extras', {})['bwQ'] = Q
        if 'indices' in p:
            ia = accs[p['indices']]; iv = [t[0] for t in read_acc(ia)]
            assert max(iv) < 65536
            data = struct.pack('<%dH' % len(iv), *iv)
            bv = add_view(data, 34963)
            new_accs.append({'bufferView': bv, 'componentType': 5123, 'count': len(iv), 'type': 'SCALAR'})
            p['indices'] = len(new_accs) - 1
g['accessors'] = new_accs; g['bufferViews'] = views
g['buffers'] = [{'byteLength': len(out)}]
for k in ('images', 'textures', 'samplers'): g.pop(k, None)
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
while len(out) % 4: out.append(0)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
gz = gzip.compress(glb, 9, mtime=0)
open(dst, 'wb').write(gz)
print('source bin %d bytes -> glb %d -> gzipped %d bytes; worst position error %.2e of the ring\'s size' % (len(binb), len(glb), len(gz), worst))
