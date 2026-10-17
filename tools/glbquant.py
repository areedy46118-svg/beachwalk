"""Make a GLB smaller WITHOUT changing what it draws.  python3 -I tools/glbquant.py IN.glb OUT.glb [--webp]

 - every float POSITION / NORMAL / TEXCOORD_n is stored as normalized int16 across its own range (per primitive and
   attribute), the range written in the primitive's extras as `bwQ: {ATTR: [min..., max...]}`. A step is
   1/65534 of the range: on a ring a few centimetres across, well under a micrometre. `bwDequant` in main.js turns
   them back into Float32 right after the parse, before any game code sees the mesh, so everything that reads the
   vertices (bounds, `ringCavity`, the worn-gold shader's model-space noise) reads floats exactly as before.
 - (--webp) every PNG image becomes LOSSLESS WebP (EXT_texture_webp, exact: the colour under zero alpha is kept too):
   the same pixels, decoded.
 - everything else — nodes, materials, JPEGs, indices, animations, skins — is copied byte for byte.
Written 2026-10-15 for the owner's "shrink the rings and skull key without changing how they look".
MEASURED, and why POSITION is left alone on the rings: quantizing positions too moved vertices by under a micrometre,
but the octopus ring's wear (`ringCavity`) is a difference of neighbouring vertices scaled by nine, so ~100 pixels a
view tipped a glint (max 218/255). With --only=NORMAL (and TEXCOORD_0 on the skull key) the renders differ by at most
1/255 on a few hundred pixels; the gem ring (--webp --only=NONE) is bit-identical. The shipped files are those, then
gzipped whole (`bwGunzip` inflates them):
    python3 -I tools/glbquant.py SRC/octopus-ring.glb tmp.glb --only=NORMAL
    python3 -I tools/glbquant.py SRC/skull-key.glb   tmp.glb --only=NORMAL,TEXCOORD_0
    python3 -I tools/glbquant.py SRC/gem-ring.glb    tmp.glb --webp --only=NONE
    python3 -I -c "import gzip; open('assets/X.glb','wb').write(gzip.compress(open('tmp.glb','rb').read(), 9, mtime=0))"
The originals are in incoming/originals-2026-10-15/."""
import json, struct, sys, io
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
WEBP = '--webp' in sys.argv
ONLY = next((a.split('=', 1)[1].split(',') for a in sys.argv if a.startswith('--only=')), None)   # e.g. --only=NORMAL: leave the rest exact
d = open(src, 'rb').read()
jl = struct.unpack_from('<I', d, 12)[0]
g = json.loads(d[20:20 + jl])
b0 = 20 + jl + 8
binb = d[b0:b0 + struct.unpack_from('<I', d, 20 + jl)[0]]
CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
bvs, accs = g['bufferViews'], g['accessors']

out = bytearray(); views = []; vmap = {}
def add_view(data, src_view=None, stride=None, target=None):
    while len(out) % 4: out.append(0)
    v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
    if src_view is not None:
        for k in ('byteStride', 'target', 'name', 'extras'):
            if k in src_view: v[k] = src_view[k]
    if stride: v['byteStride'] = stride
    if target: v['target'] = target
    out.extend(data); views.append(v); return len(views) - 1
def view_bytes(i):
    v = bvs[i]; o = v.get('byteOffset', 0); return binb[o:o + v['byteLength']]
def copy_view(i):
    if i not in vmap: vmap[i] = add_view(view_bytes(i), bvs[i])
    return vmap[i]
def read_acc(a):
    f, sz = CT[a['componentType']]; n = NC[a['type']]
    v = bvs[a['bufferView']]; st = v.get('byteStride', sz * n); o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + f * n, binb, o + i * st) for i in range(a['count'])]

new_accs = []; amap = {}
def keep_acc(i):
    if i in amap: return amap[i]
    a = dict(accs[i])
    if 'bufferView' in a: a['bufferView'] = copy_view(a['bufferView'])
    new_accs.append(a); amap[i] = len(new_accs) - 1; return amap[i]
def quant_acc(i):
    a = accs[i]; rows = read_acc(a); n = NC[a['type']]
    lo = [min(r[c] for r in rows) for c in range(n)]; hi = [max(r[c] for r in rows) for c in range(n)]
    pad = n == 3                                          # a vertex attribute is 4-byte aligned: VEC3 int16 rides in 8
    buf = bytearray()
    for r in rows:
        q = [round(((r[c] - lo[c]) / (hi[c] - lo[c]) * 2 - 1) * 32767) if hi[c] > lo[c] else 0 for c in range(n)]
        buf += struct.pack('<' + 'h' * n, *q) + (b'\0\0' if pad else b'')
    na = {'bufferView': add_view(bytes(buf), stride=8 if pad else None, target=34962), 'componentType': 5122,
          'normalized': True, 'count': a['count'], 'type': a['type']}
    qs = [[round(((r[c] - lo[c]) / (hi[c] - lo[c]) * 2 - 1) * 32767) if hi[c] > lo[c] else 0 for c in range(n)] for r in (lo, hi)]
    na['min'] = [x / 32767 for x in qs[0]]; na['max'] = [x / 32767 for x in qs[1]]
    new_accs.append(na); return len(new_accs) - 1, lo + hi

saved_q = 0
for m in g['meshes']:
    for p in m['primitives']:
        q = {}
        for k, i in list(p['attributes'].items()):
            if (k in ('POSITION', 'NORMAL') or k.startswith('TEXCOORD_')) and accs[i]['componentType'] == 5126 and (ONLY is None or k in ONLY):
                p['attributes'][k], q[k] = quant_acc(i)
            else:
                p['attributes'][k] = keep_acc(i)
        if 'indices' in p: p['indices'] = keep_acc(p['indices'])
        if 'targets' in p: p['targets'] = [{k: keep_acc(i) for k, i in t.items()} for t in p['targets']]
        if q: p.setdefault('extras', {})['bwQ'] = q
for s in g.get('skins', []):
    if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = keep_acc(s['inverseBindMatrices'])
for an in g.get('animations', []):
    for s in an['samplers']: s['input'] = keep_acc(s['input']); s['output'] = keep_acc(s['output'])

anyq = any('bwQ' in p.get('extras', {}) for m in g['meshes'] for p in m['primitives'])
ext = set(g.get('extensionsUsed', [])) | ({'KHR_mesh_quantization'} if anyq else set())
req = set(g.get('extensionsRequired', [])) | ({'KHR_mesh_quantization'} if anyq else set())
imgs = g.get('images', [])
for ii, im in enumerate(imgs):
    if 'bufferView' not in im: continue
    data = view_bytes(im['bufferView'])
    if WEBP and im.get('mimeType') == 'image/png':
        I = Image.open(io.BytesIO(data)); I.load()
        mode = 'RGBA' if ('A' in I.getbands() or 'transparency' in I.info) else 'RGB'
        J = I.convert(mode)
        bio = io.BytesIO(); J.save(bio, 'WEBP', lossless=True, quality=100, method=6, exact=True)
        w = bio.getvalue()
        back = Image.open(io.BytesIO(w)).convert(mode)
        assert back.tobytes() == J.tobytes(), 'webp not lossless for image %d' % ii
        if len(w) < len(data):
            im['bufferView'] = add_view(w); im['mimeType'] = 'image/webp'
            for t in g.get('textures', []):
                if t.get('source') == ii:
                    t.setdefault('extensions', {})['EXT_texture_webp'] = {'source': ii}; del t['source']
            ext.add('EXT_texture_webp'); req.add('EXT_texture_webp')
            print('  image %d %s: png %d KB -> webp %d KB (lossless, verified)' % (ii, im.get('name'), len(data) // 1024, len(w) // 1024))
            continue
    im['bufferView'] = copy_view(im['bufferView'])
g['extensionsUsed'] = sorted(ext); g['extensionsRequired'] = sorted(req)
g['accessors'] = new_accs; g['bufferViews'] = views; g['buffers'] = [{'byteLength': len(out)}]
while len(out) % 4: out.append(0)
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
open(dst, 'wb').write(glb)
print('%s: %d KB -> %d KB' % (dst, len(d) // 1024, len(glb) // 1024))
