"""The pliosaur (Animal Animator, CC-BY-4.0) -> assets/pliosaur.glb, keeping its rig, node tree and four clips.
   python3 -I tools/plio_pack.py SRC.gltf DST.glb
 - attributes: POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0 only (the tangents and the three extra UV sets
   only fed the normal / roughness maps, which a near-black sea never shows)
 - colour maps only: body 1024, the rest 256-512, JPEG; normal, roughness and specular maps dropped
 - clearcoat / specular extensions dropped (three would compile the physical material for them)"""
import json, struct, sys, os, io
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
root = os.path.dirname(os.path.abspath(src))
g = json.load(open(src))
binb = open(os.path.join(root, g['buffers'][0]['uri']), 'rb').read()
CT = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
KEEP = ('POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0')
out = bytearray(); views = []; accs = []; amap = {}
def add_view(data, target=None):
    while len(out) % 4: out.append(0)
    v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
    if target: v['target'] = target
    out.extend(data); views.append(v); return len(views) - 1
def copy_acc(ai, target=None):
    if ai in amap: return amap[ai]
    a = dict(g['accessors'][ai]); bv = g['bufferViews'][a['bufferView']]
    es = CT[a['componentType']] * NC[a['type']]
    st = bv.get('byteStride', es); o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    data = b''.join(binb[o + i * st: o + i * st + es] for i in range(a['count'])) if st != es else binb[o: o + es * a['count']]
    a['bufferView'] = add_view(data, target); a.pop('byteOffset', None)
    accs.append(a); amap[ai] = len(accs) - 1; return amap[ai]
def raw_acc(ai):
    a = g['accessors'][ai]; bv = g['bufferViews'][a['bufferView']]
    c = NC[a['type']]; f = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}[a['componentType']]
    es = CT[a['componentType']] * c; st = bv.get('byteStride', es); o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return a, [struct.unpack_from('<' + f * c, binb, o + i * st) for i in range(a['count'])]
def new_acc(src, ctype, fmt, rows, target, normalized=False):
    data = b''.join(struct.pack('<' + fmt, *r) for r in rows)
    while len(data) % 4: data += b'\0'
    a = {k: v for k, v in src.items() if k in ('count', 'type')}
    a['componentType'] = ctype; a['bufferView'] = add_view(data, target)
    if normalized: a['normalized'] = True
    if 'max' in src and not normalized and ctype == 5126: a['max'] = src['max']; a['min'] = src['min']
    accs.append(a); return len(accs) - 1
# smaller numbers: indices as uint16, weights uint8, normals int8 (KHR_mesh_quantization) — the same shape in half the bytes
for m in g['meshes']:
    for p in m['primitives']:
        at = {}
        for k, v in p['attributes'].items():
            if k not in KEEP: continue
            if k == 'WEIGHTS_0':
                a, rows = raw_acc(v)
                q = []
                for r in rows:
                    t = [max(0, min(255, round(x * 255))) for x in r]; t[t.index(max(t))] += 255 - sum(t); q.append(t)
                at[k] = new_acc(a, 5121, 'BBBB', q, 34962, True)
            elif k == 'NORMAL':
                a, rows = raw_acc(v)
                at[k] = new_acc(a, 5120, 'bbbb', [(round(x * 127), round(y * 127), round(z * 127), 0) for x, y, z in rows], 34962, True)
                accs[at[k]]['type'] = 'VEC3'; views[accs[at[k]]['bufferView']]['byteStride'] = 4   # (a vertex attribute is 4-byte aligned)
            elif k == 'JOINTS_0':
                a, rows = raw_acc(v)
                at[k] = new_acc(a, 5121, 'BBBB', rows, 34962) if max(max(r) for r in rows) < 256 else copy_acc(v, 34962)
            else: at[k] = copy_acc(v, 34962)
        p['attributes'] = at
        if 'indices' in p:
            a, rows = raw_acc(p['indices'])
            p['indices'] = new_acc(a, 5123, 'H', rows, 34963) if a['count'] and max(r[0] for r in rows) < 65536 else copy_acc(p['indices'], 34963)
        p.pop('targets', None)
for s in g.get('skins', []):
    if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = copy_acc(s['inverseBindMatrices'])
for a in g.get('animations', []):
    for s in a['samplers']:
        s['input'] = copy_acc(s['input']); s['output'] = copy_acc(s['output'])
SIZE = {'Body': 1024, 'Eye': 256, 'Teeth': 512, 'Tongue': 256}
used = set()
for m in g['materials']:
    m.pop('extensions', None); m.pop('normalTexture', None)
    pbr = m.setdefault('pbrMetallicRoughness', {})
    pbr.pop('metallicRoughnessTexture', None)
    pbr['metallicFactor'] = 0.0; pbr['roughnessFactor'] = 0.6
    if 'baseColorTexture' in pbr: pbr['baseColorTexture'] = {'index': pbr['baseColorTexture']['index']}; used.add(pbr['baseColorTexture']['index'])
g['extensionsUsed'] = ['KHR_mesh_quantization']; g['extensionsRequired'] = ['KHR_mesh_quantization']
# only the colour textures survive: renumber textures and images
tmap = {}; newtex = []; newimg = []; imap = {}
for ti in sorted(used):
    t = dict(g['textures'][ti]); si = t['source']
    if si not in imap:
        im = g['images'][si]; path = os.path.join(root, im['uri'])
        I = Image.open(path).convert('RGB')
        size = next((v for k, v in SIZE.items() if k in im['uri']), 512)
        if I.width > size: I = I.resize((size, max(1, size * I.height // I.width)), Image.LANCZOS)
        buf = io.BytesIO(); I.save(buf, 'JPEG', quality=84)
        newimg.append({'mimeType': 'image/jpeg', 'bufferView': add_view(buf.getvalue())}); imap[si] = len(newimg) - 1
    t['source'] = imap[si]; newtex.append(t); tmap[ti] = len(newtex) - 1
for m in g['materials']:
    pbr = m['pbrMetallicRoughness']
    if 'baseColorTexture' in pbr: pbr['baseColorTexture']['index'] = tmap[pbr['baseColorTexture']['index']]
g['textures'] = newtex; g['images'] = newimg
g['accessors'] = accs; g['bufferViews'] = views
g['buffers'] = [{'byteLength': len(out)}]
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
while len(out) % 4: out.append(0)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
open(dst, 'wb').write(glb)
print('wrote', dst, len(glb) // 1024, 'KB')
