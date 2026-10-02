"""Slim assets/bunker.glb in place without changing how the room looks.

    python3 tools/bunker_slim.py IN.glb OUT.glb [--err 0.0012] [--q 92] [--qc 95]

The scan's source (Bohdan Lvov's "Underground Bunker") is no longer on disk,
so this works on the packed GLB itself and keeps everything the game reads
off it: every node, name, transform, the animation, the `bw_nav` extras, the
materials. Three things change, and each was measured against a render:

  - GEOMETRY is simplified per primitive with meshoptimizer's attribute-aware
    simplifier, to an ABSOLUTE error of 2 mm in the room's own metres (the
    node chain's scale is worked out so the tolerance is the same everywhere),
    with normals and uv in the metric and open borders locked so no seam
    between two meshes can open. A collapse lands on an existing vertex, so
    every uv that survives is the scan's own: the atlas measurements the game
    makes (the desk's DESK_UV, the tripod's islands) still hold.
  - TEXTURES: the scan's JPEGs are near-lossless (~1 MB each at 1024); colour
    and emissive maps go out at q95 4:4:4, normal and metal-rough at q92.
    Two maps that are byte-identical (TvScreens' base and emissive,
    LightNTransparency's and TrashCanMat's base colour) are stored once.
  - THE SHADOW DECAL is a 2048 PNG whose colour is pure white everywhere —
    only its alpha says anything. It ships as a grayscale JPEG of that alpha,
    named `Shadows_alpha`, and models/underground-bunker.js moves it from
    `map` to `alphaMap` on load.

Needs numpy, pillow and meshoptimizer (pip, in a venv).
"""
import io, json, struct, sys, argparse
import numpy as np
from PIL import Image
import ctypes
import meshoptimizer as mo
from meshoptimizer._loader import lib as _mo

# the package declares no argtypes for this one, so its size_t arguments go
# across as 32-bit ints and the call silently collapses nothing
_C = ctypes
_mo.meshopt_simplifyWithAttributes.restype = _C.c_size_t
_mo.meshopt_simplifyWithAttributes.argtypes = [
    _C.POINTER(_C.c_uint), _C.POINTER(_C.c_uint), _C.c_size_t,
    _C.POINTER(_C.c_float), _C.c_size_t, _C.c_size_t,
    _C.POINTER(_C.c_float), _C.c_size_t,
    _C.POINTER(_C.c_float), _C.c_size_t,
    _C.POINTER(_C.c_ubyte), _C.c_size_t, _C.c_float, _C.c_uint, _C.POINTER(_C.c_float)]

def simplify_attr(dst, idx, pos, V, w, err, opts):
    P = lambda a, t: a.ctypes.data_as(_C.POINTER(t))
    return int(_mo.meshopt_simplifyWithAttributes(
        P(dst, _C.c_uint), P(idx, _C.c_uint), idx.size,
        P(pos, _C.c_float), pos.shape[0], 12,
        P(V, _C.c_float), V.shape[1] * 4,
        P(w, _C.c_float), w.size,
        _C.POINTER(_C.c_ubyte)(), 3, err, opts, _C.POINTER(_C.c_float)()))

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--err', type=float, default=0.002, help='max geometric error, metres')
ap.add_argument('--q', type=int, default=92, help='JPEG quality for normal / metal-rough maps')
ap.add_argument('--qc', type=int, default=95, help='JPEG quality for colour / emissive maps')
ap.add_argument('--no-geo', action='store_true')
A = ap.parse_args()

raw = open(A.src, 'rb').read()
jl = struct.unpack('<I', raw[12:16])[0]
J = json.loads(raw[20:20 + jl])
b0 = 20 + jl + 8
BIN = raw[b0:]
BV, AC = J['bufferViews'], J['accessors']
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

def view_bytes(i):
    v = BV[i]; o = v.get('byteOffset', 0)
    return BIN[o:o + v['byteLength']]

def read_acc(i):
    a = AC[i]; v = BV[a['bufferView']]
    n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
    stride = v.get('byteStride', 0) or n * dt.itemsize
    base = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    buf = np.frombuffer(BIN, dtype=np.uint8, count=stride * (a['count'] - 1) + n * dt.itemsize, offset=base)
    if stride == n * dt.itemsize:
        out = np.frombuffer(buf.tobytes(), dtype=dt).reshape(a['count'], n).copy()
    else:
        rows = np.lib.stride_tricks.as_strided(buf, shape=(a['count'], n * dt.itemsize), strides=(stride, 1))
        out = np.frombuffer(rows.copy().tobytes(), dtype=dt).reshape(a['count'], n)
    return out

# ---- world scale of each mesh (the tolerance is in metres) -------------
def mat_of(n):
    if 'matrix' in n: return np.array(n['matrix'], float).reshape(4, 4).T
    t = np.array(n.get('translation', [0, 0, 0]), float)
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    s = np.array(n.get('scale', [1, 1, 1]), float)
    R = np.array([[1 - 2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                  [2*(x*y+z*w), 1 - 2*(x*x+z*z), 2*(y*z-x*w)],
                  [2*(x*z-y*w), 2*(y*z+x*w), 1 - 2*(x*x+y*y)]])
    M = np.eye(4); M[:3, :3] = R * s; M[:3, 3] = t
    return M

mesh_scale = {}
def walk(ni, P):
    n = J['nodes'][ni]; W = P @ mat_of(n)
    if 'mesh' in n:
        s = float(np.cbrt(abs(np.linalg.det(W[:3, :3]))))
        mesh_scale[n['mesh']] = min(mesh_scale.get(n['mesh'], 1e9), s)
    for c in n.get('children', []): walk(c, W)
for r in J['scenes'][J.get('scene', 0)]['nodes']: walk(r, np.eye(4))

# ---- the new binary ------------------------------------------------------
out = bytearray()
newBV = []
def add_view(b, target=None, stride=None):
    while len(out) % 4: out.append(0)
    v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(b)}
    if target: v['target'] = target
    if stride: v['byteStride'] = stride
    out.extend(b); newBV.append(v)
    return len(newBV) - 1

# keep every accessor that is not mesh geometry (animation, skins) as it is
geo_acc = set()
for m in J['meshes']:
    for p in m['primitives']:
        geo_acc.update(p['attributes'].values())
        if 'indices' in p: geo_acc.add(p['indices'])
        for t in p.get('targets', []): geo_acc.update(t.values())
newAC = []
remapA = {}
for i, a in enumerate(AC):
    if i in geo_acc: continue
    a2 = dict(a)
    if 'bufferView' in a:
        v = BV[a['bufferView']]
        a2['bufferView'] = add_view(view_bytes(a['bufferView']), v.get('target'), v.get('byteStride'))
    remapA[i] = len(newAC); newAC.append(a2)

def new_acc(arr, ctype, typ, target, normalized=False, minmax=False):
    vi = add_view(arr.tobytes(), target)
    a = {'bufferView': vi, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': typ}
    if normalized: a['normalized'] = True
    if minmax:
        a['min'] = [float(x) for x in arr.min(0)]; a['max'] = [float(x) for x in arr.max(0)]
    newAC.append(a); return len(newAC) - 1

tri0 = tri1 = 0
for mi, m in enumerate(J['meshes']):
    scale = mesh_scale.get(mi, 1.0)
    for p in m['primitives']:
        at = p['attributes']
        pos = read_acc(at['POSITION']).astype(np.float32)
        attrs = {k: read_acc(v) for k, v in at.items() if k in ('NORMAL', 'TEXCOORD_0')}
        if 'indices' in p: idx = read_acc(p['indices']).reshape(-1).astype(np.uint32)
        else: idx = np.arange(pos.shape[0], dtype=np.uint32)
        tri0 += idx.size // 3
        mode = p.get('mode', 4)
        if mode == 4 and not A.no_geo and idx.size >= 3 * 24:
            va = []; w = []
            if 'NORMAL' in attrs: va.append(attrs['NORMAL'].astype(np.float32)); w += [0.6, 0.6, 0.6]
            if 'TEXCOORD_0' in attrs: va.append(attrs['TEXCOORD_0'].astype(np.float32)); w += [2.5, 2.5]
            dst = np.zeros(idx.size, np.uint32)
            err = float(A.err / max(scale, 1e-9))          # metres -> this mesh's units
            if va:
                V = np.ascontiguousarray(np.concatenate(va, 1), np.float32)
                n = simplify_attr(dst, np.ascontiguousarray(idx), np.ascontiguousarray(pos), V,
                    np.array(w, np.float32), err, mo.SIMPLIFY_LOCK_BORDER | mo.SIMPLIFY_ERROR_ABSOLUTE)
            else:
                n = mo.simplify(dst, idx, pos, target_index_count=3, target_error=ctypes.c_float(err),
                    options=mo.SIMPLIFY_LOCK_BORDER | mo.SIMPLIFY_ERROR_ABSOLUTE)
            if n >= 3: idx = dst[:n]
        tri1 += idx.size // 3
        # compact: only the vertices still referenced, in first-use order
        used, inv = np.unique(idx, return_inverse=True)
        idx = inv.astype(np.uint32)
        p2at = {}
        for k, v in at.items():
            arr = read_acc(v)[used]
            a = AC[v]
            p2at[k] = new_acc(np.ascontiguousarray(arr), a['componentType'], a['type'], 34962,
                              a.get('normalized', False), minmax=(k == 'POSITION'))
        p['attributes'] = p2at
        if used.size <= 65535:
            p['indices'] = new_acc(idx.astype(np.uint16), 5123, 'SCALAR', 34963)
        else:
            p['indices'] = new_acc(idx, 5125, 'SCALAR', 34963)

# remap non-geometry accessor references (animation samplers, skins)
for an in J.get('animations', []):
    for s in an['samplers']:
        s['input'] = remapA[s['input']]; s['output'] = remapA[s['output']]
for sk in J.get('skins', []):
    if 'inverseBindMatrices' in sk: sk['inverseBindMatrices'] = remapA[sk['inverseBindMatrices']]

# ---- images --------------------------------------------------------------
shadow_imgs = set()
for mt in J['materials']:
    if mt.get('name') == 'Shadows':
        t = mt.get('pbrMetallicRoughness', {}).get('baseColorTexture')
        if t: shadow_imgs.add(J['textures'][t['index']]['source'])
newImgs, seen, img_remap = [], {}, {}
for i, im in enumerate(J['images']):
    b = view_bytes(im['bufferView'])
    key = hash(b)
    if key in seen:
        img_remap[i] = seen[key]; continue
    name = im.get('name', '')
    I = Image.open(io.BytesIO(b))
    o = io.BytesIO()
    if i in shadow_imgs and I.mode in ('LA', 'RGBA') and I.convert('RGB').getextrema() in (((255, 255),) * 3, ((255, 255),)):
        I.split()[-1].save(o, 'JPEG', quality=A.qc, subsampling=0, optimize=True)
        name, mime = 'Shadows_alpha', 'image/jpeg'
    elif im['mimeType'] == 'image/jpeg':
        q = A.q if ('normal' in name or 'metallic' in name.lower()) else A.qc
        I.convert('RGB').save(o, 'JPEG', quality=q, subsampling=0, optimize=True)
        mime = 'image/jpeg'
        if o.tell() >= len(b): o = io.BytesIO(b)      # never larger than it was
    else:
        o = io.BytesIO(b); mime = im['mimeType']
    img_remap[i] = seen[key] = len(newImgs)
    newImgs.append({'name': name, 'mimeType': mime, 'bufferView': add_view(o.getvalue())})
J['images'] = newImgs
for t in J['textures']: t['source'] = img_remap[t['source']]

J['bufferViews'] = newBV
J['accessors'] = newAC
while len(out) % 4: out.append(0)
J['buffers'] = [{'byteLength': len(out)}]
js = json.dumps(J, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out))
glb += struct.pack('<II', len(js), 0x4E4F534A) + js
glb += struct.pack('<II', len(out), 0x004E4942) + bytes(out)
open(A.dst, 'wb').write(glb)
print(f'triangles {tri0} -> {tri1}  ({100 * tri1 / tri0:.1f}%)')
print(f'size {len(raw) / 1e6:.2f} MB -> {len(glb) / 1e6:.2f} MB')
