#!/usr/bin/env python3
"""THE FIJI BOTTLE AS THE BOTTLE OF WATER (2026-11-21, the owner: "use this as the water bottle model make it full of water and will
slosh around when held or drank or inspected. make the fiji label face you when holding"). "Fiji Water Bottle" by Diego T.
Yamaguchi (Sketchfab, CC-BY-4.0 — credited in README). Its nodes' transforms are baked into the vertices, the whole turned so
it stands up +Y with its base at y = 0, 0.205 m tall (the old bottle's height: every place that holds or lays one fits it as
before), its axis on y, and turned about y so the FIJI label faces +Z. The textures smaller (the label 256x512, the back
128x256), the transmission map dropped. Written as one .glb, gzipped as the game's assets are (`bwio`).
    /usr/bin/python3 -E tools/fiji_bottle_pack.py ~/Downloads/fiji_water_bottle assets/fiji-bottle.glb"""
import sys, os, json, struct, io, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bwio

SRC, OUT = sys.argv[1], sys.argv[2]
g = json.load(open(os.path.join(SRC, 'scene.gltf')))
bin0 = open(os.path.join(SRC, g['buffers'][0]['uri']), 'rb').read()
CT = {5126: ('f', 4), 5125: ('I', 4), 5123: ('H', 2), 5121: ('B', 1)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def acc(i):
    a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
    fmt, sz = CT[a['componentType']]; n = NC[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride', sz * n)
    out = np.zeros((a['count'], n), np.float64 if fmt == 'f' else np.int64)
    for k in range(a['count']):
        out[k] = struct.unpack_from('<' + fmt * n, bin0, off + k * stride)
    return out


def node_m(nd):
    if 'matrix' in nd: return np.array(nd['matrix'], np.float64).reshape(4, 4).T
    M = np.eye(4)
    if 'scale' in nd: M = np.diag(list(nd['scale']) + [1]) @ M
    if 'rotation' in nd:
        x, y, z, w = nd['rotation']
        R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        Rm = np.eye(4); Rm[:3, :3] = R; M = Rm @ M
    if 'translation' in nd: T = np.eye(4); T[:3, 3] = nd['translation']; M = T @ M
    return M


parts = []   # (name, material index, pos, nrm, uv, idx)
def walk(ni, P):
    nd = g['nodes'][ni]; M = P @ node_m(nd)
    if 'mesh' in nd:
        for pr in g['meshes'][nd['mesh']]['primitives']:
            pos = acc(pr['attributes']['POSITION']); nrm = acc(pr['attributes']['NORMAL']); uv = acc(pr['attributes']['TEXCOORD_0'])
            idx = acc(pr['indices']).reshape(-1)
            ph = np.c_[pos, np.ones(len(pos))] @ M.T; Nm = np.linalg.inv(M[:3, :3]).T
            nn = nrm @ Nm.T; nn /= np.linalg.norm(nn, axis=1, keepdims=True) + 1e-12
            parts.append([g['meshes'][nd['mesh']]['name'], pr['material'], ph[:, :3], nn, uv, idx])
    for c in nd.get('children', []): walk(c, M)
for r in g['scenes'][g.get('scene', 0)]['nodes']: walk(r, np.eye(4))

allp = np.concatenate([p[2] for p in parts])
lo, hi = allp.min(0), allp.max(0); ext = hi - lo
up = int(np.argmax(ext))                      # the long axis is the bottle's
print('extent', ext.round(3), 'up axis', 'xyz'[up])
# turn the long axis onto +y (the cap end up: the cap's meshes are the far end)
cap = np.concatenate([p[2] for p in parts if 'cap' in p[0]]).mean(0)
mid = (lo + hi) / 2
sgn = 1 if cap[up] > mid[up] else -1
A = np.eye(3)
axes = [0, 1, 2]; others = [a for a in axes if a != up]
R = np.zeros((3, 3)); R[1, up] = sgn; R[0, others[0]] = 1; R[2, others[1]] = sgn * (1 if (others[0], up, others[1]) in [(0, 1, 2), (1, 2, 0), (2, 0, 1)] else -1)
if np.linalg.det(R) < 0: R[2] *= -1
for p in parts: p[2] = p[2] @ R.T; p[3] = p[3] @ R.T
allp = np.concatenate([p[2] for p in parts]); lo, hi = allp.min(0), allp.max(0)
cx, cz = (lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2
k = 0.205 / (hi[1] - lo[1])
for p in parts: p[2] = (p[2] - [cx, lo[1], cz]) * k
# the FIJI label to +z: its centre's bearing about y
lab = np.concatenate([p[2] for p in parts if 'fiji label' in p[0]]).mean(0)
yaw = math.atan2(lab[0], lab[2])              # turn by −yaw about y puts it on +z
c, s = math.cos(-yaw), math.sin(-yaw); Ry = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
for p in parts: p[2] = p[2] @ Ry.T; p[3] = p[3] @ Ry.T
allp = np.concatenate([p[2] for p in parts]); print('size', (allp.max(0) - allp.min(0)).round(4), 'label at', np.concatenate([p[2] for p in parts if 'fiji label' in p[0]]).mean(0).round(4))

# ---- write the GLB: one buffer, the parts as meshes of their own (named: the game finds the shell by name)
blob = bytearray(); views = []; accs = []
def push(arr, target=None, comp=5126):
    while len(blob) % 4: blob.append(0)
    off = len(blob); b = arr.astype('<f4' if comp == 5126 else '<u2').tobytes(); blob.extend(b)
    v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(b)}
    if target: v['target'] = target
    views.append(v); return len(views) - 1
def addacc(arr, typ, comp=5126, target=34962):
    vi = push(arr, target, comp); a = {'bufferView': vi, 'componentType': comp, 'count': len(arr), 'type': typ}
    if typ == 'VEC3': a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    accs.append(a); return len(accs) - 1
images = []
def addimg(path, size, mode):
    im = Image.open(path).convert(mode).resize(size, Image.LANCZOS)
    bio = io.BytesIO(); im.save(bio, 'PNG', optimize=True); data = bio.getvalue()
    while len(blob) % 4: blob.append(0)
    off = len(blob); blob.extend(data); views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data)})
    images.append({'bufferView': len(views) - 1, 'mimeType': 'image/png'}); return len(images) - 1
tex = []
mats = []
for mi, m in enumerate(g['materials']):
    pbr = dict(m.get('pbrMetallicRoughness', {}))
    if 'baseColorTexture' in pbr:
        src_img = g['images'][g['textures'][pbr['baseColorTexture']['index']]['source']]['uri']
        big = 'fiji_label' in src_img
        ii = addimg(os.path.join(SRC, src_img), (256, 512) if big else (128, 256), 'RGBA' if big else 'RGB')
        tex.append({'source': ii}); pbr['baseColorTexture'] = {'index': len(tex) - 1}
    mats.append({'name': m.get('name', 'm%d' % mi), 'pbrMetallicRoughness': pbr, **({'alphaMode': m['alphaMode']} if 'alphaMode' in m else {}), 'doubleSided': bool(m.get('doubleSided', False))})
meshes = []; nodes = []
for name, mat, pos, nrm, uv, idx in parts:
    pa = addacc(pos.astype(np.float32), 'VEC3'); na = addacc(nrm.astype(np.float32), 'VEC3'); ua = addacc(uv.astype(np.float32), 'VEC2')
    ia = addacc(idx.astype(np.uint16), 'SCALAR', 5123, 34963)
    clean = name.replace('fiji water bottle_', '').replace('water bottle cap_', 'cap ').replace('_0', '')
    meshes.append({'name': clean, 'primitives': [{'attributes': {'POSITION': pa, 'NORMAL': na, 'TEXCOORD_0': ua}, 'indices': ia, 'material': mat}]})
    nodes.append({'name': clean, 'mesh': len(meshes) - 1})
while len(blob) % 4: blob.append(0)
gj = {'asset': {'version': '2.0', 'generator': 'beachwalk fiji_bottle_pack.py', 'copyright': 'Fiji Water Bottle by Diego T. Yamaguchi, CC-BY-4.0'},
      'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'meshes': meshes, 'materials': mats,
      'textures': tex, 'images': images, 'samplers': [], 'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(blob)}]}
js = json.dumps(gj, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
bwio.write_bytes(OUT, glb)
print('wrote', OUT, os.path.getsize(OUT), 'bytes (gz), raw', len(glb), '| meshes', [m['name'] for m in meshes])
