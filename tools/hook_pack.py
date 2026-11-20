#!/usr/bin/env python3
"""SKRIM'S HOOK ON ITS OWN, FOR YOUR HAND (2026-11-19, the owner: "i want to make 'Skrims hook' a weapon").

    /usr/bin/python3 -E tools/hook_pack.py assets/skrim.glb assets/skrim-hook.glb

`skrim_hook` out of his model in its bind pose — unskinned, put on the end of its handle (the end in his fist) pointing
along +Z, as `skcInit` puts the chain's hooks — with only its own patch of his cloth albedo, cropped to its UVs and the UVs
remapped. So the weapon is on the beach without his 2 MB model, and it is the same iron he swings."""
import sys, json, struct, io, numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
b = open(SRC, 'rb').read()
L = struct.unpack('<I', b[12:16])[0]; J = json.loads(b[20:20 + L])
BIN = b[20 + L + 8:]
CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def acc(i):
    a = J['accessors'][i]; v = J['bufferViews'][a['bufferView']]
    dt = np.dtype(CT[a['componentType']]); n = NC[a['type']]
    off = v.get('byteOffset', 0) + a.get('byteOffset', 0); st = v.get('byteStride', dt.itemsize * n)
    raw = np.frombuffer(BIN, np.uint8, count=st * (a['count'] - 1) + dt.itemsize * n, offset=off)
    out = np.lib.stride_tricks.as_strided(raw, (a['count'], dt.itemsize * n), (st, 1)).copy().view(dt).reshape(a['count'], n)
    if a.get('normalized') and dt != np.float32: out = out.astype(np.float32) / np.iinfo(dt).max
    return out


mesh = next(m for m in J['meshes'] if m['name'] == 'skrim_hook'); p = mesh['primitives'][0]
P = acc(p['attributes']['POSITION']).astype(np.float32); N = acc(p['attributes']['NORMAL']).astype(np.float32)
UV = acc(p['attributes']['TEXCOORD_0']).astype(np.float32); I = acc(p['indices']).reshape(-1).astype(np.uint32)
# on the end of the handle (the lowest 8% in z, its middle), +Z out along it
z0, z1 = P[:, 2].min(), P[:, 2].max(); h = P[:, 2] <= z0 + (z1 - z0) * 0.08
P = P - np.array([P[h, 0].mean(), P[h, 1].mean(), z0], np.float32)
print('verts', len(P), 'tris', len(I) // 3, 'size', (P.max(0) - P.min(0)).round(3))
# its patch of the cloth albedo
mat = J['materials'][p['material']]
def image_of(ti):
    img = J['images'][J['textures'][ti]['source']]; v = J['bufferViews'][img['bufferView']]
    return Image.open(io.BytesIO(BIN[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])).convert('RGB')
im = image_of(mat['pbrMetallicRoughness']['baseColorTexture']['index'])
nm = image_of(mat['normalTexture']['index']) if 'normalTexture' in mat else None
W, H = im.size; pad = 4
u0, v0 = max(0, int(UV[:, 0].min() * W) - pad), max(0, int(UV[:, 1].min() * H) - pad)
u1, v1 = min(W, int(np.ceil(UV[:, 0].max() * W)) + pad), min(H, int(np.ceil(UV[:, 1].max() * H)) + pad)
# (512, and its normal map with it — 2026-11-19, later, the owner: "make the hook textures look better": at 256 and flat-lit
# the iron was a smear; at 512 with its own relief the hammered steel and the wrapped handle read)
crop = im.crop((u0, v0, u1, v1)); k = 512 / max(crop.size)
crop = crop.resize((max(8, round(crop.width * k)), max(8, round(crop.height * k))), Image.LANCZOS)
ncrop = nm.crop((u0, v0, u1, v1)).resize(crop.size, Image.LANCZOS) if nm is not None else None
print('albedo', im.size, '-> crop', crop.size)
UV = np.stack([(UV[:, 0] * W - u0) / (u1 - u0), (UV[:, 1] * H - v0) / (v1 - v0)], 1).astype(np.float32)
jb = io.BytesIO(); crop.save(jb, 'JPEG', quality=88); jpg = jb.getvalue()
njpg = None
if ncrop is not None: nb = io.BytesIO(); ncrop.save(nb, 'JPEG', quality=90); njpg = nb.getvalue()
# one buffer: positions, normals, uvs, indices, the image
parts, views, accs = [], [], []
def add(data, target=None):
    off = sum(len(x) for x in parts); pad_ = (-off) % 4
    if pad_: parts.append(b'\0' * pad_); off += pad_
    parts.append(data); bv = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
    if target: bv['target'] = target
    views.append(bv); return len(views) - 1
def addacc(arr, ctype, typ, target, mm=False):
    bv = add(arr.tobytes(), target); a = {'bufferView': bv, 'componentType': ctype, 'count': len(arr), 'type': typ}
    if mm: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    accs.append(a); return len(accs) - 1
aP = addacc(P, 5126, 'VEC3', 34962, True); aN = addacc(N, 5126, 'VEC3', 34962); aU = addacc(UV, 5126, 'VEC2', 34962)
aI = addacc(I, 5125, 'SCALAR', 34963); bvI = add(jpg); bvN = add(njpg) if njpg else None
G = {'asset': {'version': '2.0', 'generator': 'tools/hook_pack.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}],
     'nodes': [{'name': 'skrim_hook', 'mesh': 0}],
     'meshes': [{'name': 'skrim_hook', 'primitives': [{'attributes': {'POSITION': aP, 'NORMAL': aN, 'TEXCOORD_0': aU}, 'indices': aI, 'material': 0}]}],
     'materials': [dict({'name': 'skrim_hook', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 0.6}},
                        **({'normalTexture': {'index': 1}} if bvN is not None else {}))],
     'textures': [{'source': 0, 'sampler': 0}] + ([{'source': 1, 'sampler': 0}] if bvN is not None else []), 'samplers': [{}],
     'images': [{'bufferView': bvI, 'mimeType': 'image/jpeg'}] + ([{'bufferView': bvN, 'mimeType': 'image/jpeg'}] if bvN is not None else []),
     'accessors': accs, 'bufferViews': views}
binb = b''.join(parts); binb += b'\0' * ((-len(binb)) % 4)
G['buffers'] = [{'byteLength': len(binb)}]
js = json.dumps(G, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
out = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(binb)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(binb)) + b'BIN\0' + binb
open(OUT, 'wb').write(out); print('wrote', OUT, len(out), 'bytes')
