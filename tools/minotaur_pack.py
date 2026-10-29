#!/usr/bin/env python3
"""The minotaur at the first castle's gate (2026-10-28, the owner: "add this minotaur to the left of the very first castle
door … make his textures match the game") into assets/minotaur.glb.

    /usr/bin/python3 tools/minotaur_pack.py

  ~/Downloads/minotaur_low-poly  "Minotaur Low-Poly" by Toni García Vilche (CC-BY-4.0)  -> assets/minotaur.glb
      3.6k vertices on a 94-bone rig (an FBX's: `Position` is the root, `Spine1` the hips, the legs DIGITIGRADE —
      thigh, shin, a long rear foot and the hoof — the hands are the forearms with fingers off them). His two swords are
      skinned to `Obj.R` / `Obj.L`, which hang off the ROOT and were driven in the source by IK, not off the hands: the game
      seats them in the fists (`minoSeat`). Two clips, kept whole: `Idle` (2.7 s) as `mIdle`, and `Walk/Attack` (11.5 s: a
      walk, the double overhead slam, a turn into a side stance, then six seconds of nothing) as `mWalkAtk`, sliced in the
      game (`kind.slice`). The bones lose the FBX's numeric suffix (`Spine1_04` -> `Spine1`).

His maps come painted for a bright studio: the skin an orange tan, the armour and blades clean pale grey. In the castle
under torches everything that fights is worn, dark and dirty, so the skin is taken darker and browner, the steel to an old
grey with grime in it; the metal/roughness maps go (METALNESS IS A TRAP), the hair stays cut out (MASK)."""
import os, io, json, struct, re
import numpy as np
from PIL import Image, ImageFilter

HOME = os.path.expanduser('~')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HOME, 'Downloads/minotaur_low-poly/scene.gltf')
OUT = os.path.join(ROOT, 'assets/minotaur.glb')
CT = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def noise(n, scale, seed):
    rng = np.random.default_rng(seed)
    small = Image.fromarray((rng.random((max(2, n // scale), max(2, n // scale))) * 255).astype(np.uint8))
    return np.asarray(small.resize((n, n), Image.BICUBIC).filter(ImageFilter.GaussianBlur(n / scale / 3))).astype(np.float32) / 255.0


def grade(img, part):
    """the skin a third less orange and darker, a hide not a tan; the steel an old grey, darker, grimed"""
    a = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0
    L = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])[..., None]
    n = a.shape[0]
    if part == 'Base':
        a = L + (a - L) * 0.62
        a = a * np.array([1.0, 0.94, 0.88]) * 0.74
        g = 0.82 + 0.20 * noise(n, 8, 11) + 0.06 * noise(n, 48, 12)
    elif part == 'Extras':
        a = L + (a - L) * 0.55
        a = a * np.array([0.98, 0.97, 0.95]) * 0.60
        g = 0.74 + 0.30 * noise(n, 10, 21) + 0.08 * noise(n, 56, 22)
    else:
        g = np.ones((n, n), np.float32)
    a = a * g[..., None]
    out = Image.fromarray((np.clip(a, 0, 1) ** 1.04 * 255).astype(np.uint8))
    if img.mode == 'RGBA': out.putalpha(img.getchannel('A'))
    return out


# His eyeballs: each one two hemispheres (upper and lower, 74 vertices each, off the Head bone, both eyes sharing one UV
# layout mirrored) at the bottom left of the Base map — painted in the source a bull's: dark brown all over. (The cupped
# 32-vertex shells around them are the sockets, not the eyes: measured by painting test colours on the map in the pane.)
# The map is painted from the eye's own geometry: each texel's normal is rasterised from the hemispheres' triangles in UV
# space, and coloured by its angle to where he looks.
EYE_C = np.array([0.052, 1.8815, 0.098])   # the +x eyeball's centre, radius 0.042
EYE_GAZE = np.array([0.55, -0.06, 0.83]); EYE_GAZE = EYE_GAZE / np.linalg.norm(EYE_GAZE)   # (the +x eye; the -x one mirrors)


def acc_of(g, raw, i):
    dt = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
    a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]; c = NC[a['type']]; d = np.dtype(dt[a['componentType']])
    o = bv.get('byteOffset', 0) + a.get('byteOffset', 0); st = bv.get('byteStride', c * d.itemsize)
    return np.array(np.ndarray((a['count'], c), d, raw, o, (st, d.itemsize)))


def eye_normals(g, raw, n):
    """(n, n, 3) normals of the +x eye's two hemispheres in UV space, and the mask of texels they cover"""
    pr = next(m for m in g['meshes'] if 'Base' in m.get('name', ''))['primitives'][0]
    P = acc_of(g, raw, pr['attributes']['POSITION']); N = acc_of(g, raw, pr['attributes']['NORMAL'])
    U = acc_of(g, raw, pr['attributes']['TEXCOORD_0']); T = acc_of(g, raw, pr['indices']).reshape(-1, 3)
    out = np.zeros((n, n, 3), np.float32); mask = np.zeros((n, n), bool)
    for t in T:
        c = P[t].mean(0)
        if c[0] < 0.004 or np.linalg.norm(c - EYE_C) > 0.047: continue   # the +x eyeball only
        uv = U[t] * n
        x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
        yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1] + 0.5
        (ax, ay), (bx, by), (cx, cy) = uv
        den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(den) < 1e-9: continue
        w0 = ((by - cy) * (xx - cx) + (cx - bx) * (yy - cy)) / den
        w1 = ((cy - ay) * (xx - cx) + (ax - cx) * (yy - cy)) / den
        w2 = 1 - w0 - w1
        ins = (w0 > -0.02) & (w1 > -0.02) & (w2 > -0.02)
        nn = w0[..., None] * N[t[0]] + w1[..., None] * N[t[1]] + w2[..., None] * N[t[2]]
        ys, xs = (yy[ins] - 0.5).astype(int), (xx[ins] - 0.5).astype(int)
        ok = (ys >= 0) & (ys < n) & (xs >= 0) & (xs < n)
        out[ys[ok], xs[ok]] = nn[ins][ok]; mask[ys[ok], xs[ok]] = True
    out /= np.maximum(np.linalg.norm(out, axis=2, keepdims=True), 1e-6)
    return out, mask


def paint_eyes(img, eye, nrm=False):
    """eyes you can meet: a wet off-white sclera (a few veins, shaded toward the lids), a hazel-amber iris with fibres and
    a dark limbal ring, a black pupil and a catchlight — the room's light has no specular to give a 0.85-rough eye, so the
    glint is painted. On the normal map the eye goes flat (it is smooth)."""
    nmap, mask = eye
    a = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0
    n = a.shape[0]
    if nmap.shape[0] != n:
        nmap = np.asarray(Image.fromarray(((nmap * 0.5 + 0.5) * 255).astype(np.uint8)).resize((n, n), Image.NEAREST)).astype(np.float32) / 127.5 - 1
        mask = np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).resize((n, n), Image.NEAREST)) > 127
    mask = np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 127   # (over the seams)
    if nrm:
        a[mask] = np.array([0.5, 0.5, 1.0]); return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    th = np.degrees(np.arccos(np.clip((nmap * EYE_GAZE).sum(-1), -1, 1)))         # degrees off the gaze
    up = np.cross(EYE_GAZE, [1.0, 0, 0]); up /= np.linalg.norm(up)
    side = np.cross(up, EYE_GAZE)
    ang = np.arctan2((nmap * up).sum(-1), (nmap * side).sum(-1))                             # around the gaze
    sc = np.array([0.74, 0.68, 0.60])[None, None, :] * (1 - 0.6 * np.clip((th - 42) / 38, 0, 1))[..., None]
    rng = np.random.default_rng(7); vein = np.zeros_like(th)
    for v0 in rng.uniform(-np.pi, np.pi, 6):
        dd = np.angle(np.exp(1j * (ang - v0 - 0.3 * np.sin(th / 9 + v0 * 3))))
        vein = np.maximum(vein, np.exp(-(dd * th / 2.5) ** 2) * np.clip((th - 40) / 30, 0, 1))
    sc = sc * (1 - 0.22 * vein[..., None]) + np.array([0.55, 0.14, 0.12]) * 0.22 * vein[..., None]
    fib = 0.82 + 0.18 * np.sin(ang * 23) * np.sin(ang * 7 + 1.3)
    lo, hi = np.array([0.40, 0.26, 0.11]), np.array([0.64, 0.47, 0.20])
    ir = (lo + (hi - lo) * np.clip(th / 32, 0, 1)[..., None]) * fib[..., None]
    ir = ir * (1 - 0.6 * np.clip((th - 28) / 6, 0, 1))[..., None]         # the limbal ring
    e = sc
    t = np.clip((35 - th) / 2.5, 0, 1)[..., None]; e = e + (ir - e) * t   # iris over the white
    t = np.clip((14 - th) / 2, 0, 1)[..., None]; e = e + (np.array([0.03, 0.025, 0.02]) - e) * t   # pupil
    gdir = EYE_GAZE + up * 0.16 - side * 0.12; gdir /= np.linalg.norm(gdir)
    gl = np.clip(1 - np.degrees(np.arccos(np.clip((nmap * gdir).sum(-1), -1, 1))) / 5.5, 0, 1)   # the catchlight
    e = e + (np.array([1.0, 0.98, 0.94]) - e) * gl[..., None]
    a[mask] = e[mask]
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def log(*a):
    print('[minotaur]', *a, flush=True)


def pack():
    base = os.path.dirname(SRC)
    g = json.load(open(SRC))
    raw = open(os.path.join(base, g['buffers'][0]['uri']), 'rb').read()
    eye = eye_normals(g, raw, 2048)   # (before the accessors are renumbered)
    for a in g.get('animations', []):
        a['name'] = {'Idle': 'mIdle', 'Walk/Attack': 'mWalkAtk'}.get(a['name'], a['name'])
    for n in g['nodes']:
        n['name'] = re.sub(r'_\d+$', '', n.get('name', ''))
    keep_tex = set(); part_of = {}
    for m in g['materials']:
        p = m.setdefault('pbrMetallicRoughness', {})
        p.pop('metallicRoughnessTexture', None); p['metallicFactor'] = 0.0; p['roughnessFactor'] = 0.85
        m.pop('extensions', None); m.pop('occlusionTexture', None); m.pop('emissiveTexture', None)
        if m.get('alphaMode') == 'BLEND' or m.get('name') == 'Minotaur_Hair':
            m['alphaMode'] = 'MASK'; m['alphaCutoff'] = 0.5
        if 'baseColorTexture' in p:
            keep_tex.add(p['baseColorTexture']['index']); part_of[p['baseColorTexture']['index']] = m['name'].split('_')[-1]
        if 'normalTexture' in m: keep_tex.add(m['normalTexture']['index'])
    g.pop('extensionsUsed', None); g.pop('extensionsRequired', None)
    used_acc = set()
    for me in g['meshes']:
        for pr in me['primitives']:
            pr['attributes'].pop('TANGENT', None)
            for k in [k for k in pr['attributes'] if k.startswith('TEXCOORD_') and k != 'TEXCOORD_0']: pr['attributes'].pop(k)
            used_acc.update(pr['attributes'].values())
            if 'indices' in pr: used_acc.add(pr['indices'])
    for s in g.get('skins', []):
        if 'inverseBindMatrices' in s: used_acc.add(s['inverseBindMatrices'])
    for a in g.get('animations', []):
        for sm in a['samplers']: used_acc.add(sm['input']); used_acc.add(sm['output'])
    blob = bytearray(); views = []

    def put(data, target=None):
        while len(blob) % 4: blob.append(0)
        off = len(blob); blob.extend(data)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target: v['target'] = target
        views.append(v); return len(views) - 1

    acc_map = {}; accs = []
    for i, a in enumerate(g['accessors']):
        if i not in used_acc: continue
        bv = g['bufferViews'][a['bufferView']]
        n, c, sz = a['count'], NC[a['type']], CT[a['componentType']]
        stride = bv.get('byteStride', c * sz)
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        if stride == c * sz: data = raw[o:o + n * c * sz]
        else: data = b''.join(raw[o + k * stride:o + k * stride + c * sz] for k in range(n))
        na = dict(a); na['bufferView'] = put(data, bv.get('target')); na.pop('byteOffset', None)
        acc_map[i] = len(accs); accs.append(na)
    for me in g['meshes']:
        for pr in me['primitives']:
            pr['attributes'] = {k: acc_map[v] for k, v in pr['attributes'].items()}
            if 'indices' in pr: pr['indices'] = acc_map[pr['indices']]
    for s in g.get('skins', []):
        if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = acc_map[s['inverseBindMatrices']]
    for a in g.get('animations', []):
        for sm in a['samplers']: sm['input'] = acc_map[sm['input']]; sm['output'] = acc_map[sm['output']]
    tex_map = {}; textures = []; images = []
    normal_of = {m['normalTexture']['index'] for m in g['materials'] if 'normalTexture' in m}
    for ti in sorted(keep_tex):
        t = g['textures'][ti]; im = g['images'][t['source']]
        img = Image.open(os.path.join(base, im['uri']))
        isn = ti in normal_of
        if not isn: img = grade(img, part_of.get(ti, ''))
        if part_of.get(ti) == 'Base': img = paint_eyes(img, eye)
        elif isn and 'Base' in im['uri']: img = paint_eyes(img, eye, nrm=True)
        size = 512 if isn else 1024
        alpha = img.mode in ('RGBA', 'LA') and not isn and img.getextrema()[-1][0] < 250
        img = img.convert('RGBA' if alpha else 'RGB')
        if max(img.size) > size: img = img.resize((size, size), Image.LANCZOS)
        b = io.BytesIO()
        if alpha: img.save(b, 'PNG', optimize=True); mime = 'image/png'
        else: img.save(b, 'JPEG', quality=86, optimize=True); mime = 'image/jpeg'
        images.append({'bufferView': put(b.getvalue()), 'mimeType': mime, 'name': os.path.basename(im['uri'])})
        nt = {'source': len(images) - 1}
        if 'sampler' in t: nt['sampler'] = t['sampler']
        textures.append(nt); tex_map[ti] = len(textures) - 1
    for m in g['materials']:
        p = m['pbrMetallicRoughness']
        if 'baseColorTexture' in p: p['baseColorTexture'] = {'index': tex_map[p['baseColorTexture']['index']]}
        if 'normalTexture' in m: m['normalTexture'] = {'index': tex_map[m['normalTexture']['index']], 'scale': m['normalTexture'].get('scale', 1)}
    g['accessors'] = accs; g['bufferViews'] = views; g['textures'] = textures; g['images'] = images
    g['buffers'] = [{'byteLength': len(blob)}]
    g.setdefault('asset', {})['generator'] = 'beachwalk tools/minotaur_pack.py'
    js = json.dumps(g, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    while len(blob) % 4: blob.append(0)
    with open(OUT, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    log(OUT, '%.2f MB' % (os.path.getsize(OUT) / 1e6), len(images), 'maps')


pack()
