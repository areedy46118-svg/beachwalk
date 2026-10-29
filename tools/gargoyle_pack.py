#!/usr/bin/env python3
"""The gargoyles on the walls of Castle XIII's east court (2026-10-28, the owner: "i want 4 of these to be grey statue
textures as if they are gargoyles make it look hyper realistic") into assets/gargoyle.glb.

    /usr/bin/python3 tools/gargoyle_pack.py

  ~/Downloads/flint_maw  "Flint Maw" by Spinnee (CC-BY-4.0)  -> assets/gargoyle.glb
      A bat-winged thing, 7.5k vertices on an 85-bone rig (hip, three spine, neck, head, jaw, a tongue; the arms ARE the
      wings, three fingers each; three-toed legs; an eight-bone tail), one 8.4 s clip `Take 001` -> `gFly`: wrapped in its
      wings (the perch), unfurling, a wingbeat, and folding again. Sliced in the game.

ITS COLOUR IS MADE, NOT KEPT. The source is red-orange flesh. A statue is weathered limestone, and the stone has to carry
the carving: the colour is built out of the sculpt's own NORMAL MAP (the iron knight's way) — flat stone a cool grey, every
recess darker and grimed, the raised edges and ridges worn pale, the scales and folds the flesh map painted kept as faint
tone in the stone, a mottle of weathering over it, lichen in a few low patches and dark rain-streaks. The normal map
itself goes at 1024 (the carving is the realism); the metal/roughness map goes (METALNESS IS A TRAP); the emissive map
(its eyes) is kept for the game to light when it wakes."""
import os, io, json, struct, re
import numpy as np
from PIL import Image, ImageFilter

HOME = os.path.expanduser('~')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HOME, 'Downloads/flint_maw/scene.gltf')
OUT = os.path.join(ROOT, 'assets/gargoyle.glb')
CT = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
N = 1024


def noise(n, scale, seed):
    rng = np.random.default_rng(seed)
    small = Image.fromarray((rng.random((max(2, n // scale), max(2, n // scale))) * 255).astype(np.uint8))
    return np.asarray(small.resize((n, n), Image.BICUBIC).filter(ImageFilter.GaussianBlur(n / scale / 3))).astype(np.float32) / 255.0


def blur(a, r):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0


def stone(base_img, normal_img):
    nm = np.asarray(normal_img.convert('RGB').resize((N, N), Image.LANCZOS)).astype(np.float32) / 127.5 - 1.0
    z = np.clip(nm[..., 2], 0, 1)
    # curvature from the normal map: convex (ridges, edges) above their surroundings, concave (recesses) below
    zb = blur(z, 6)
    fine = z - zb
    coarse = blur(z, 3) - blur(z, 18)
    # (a normal map holds SLOPE, not depth: a tilted texel is the side of a bump as often as a fold. Only curvature —
    # the blurred flatness against its surroundings — says concave or convex; the first cut darkened every slope and
    # the stone came out zebra-striped)
    cav = np.clip(-coarse * 3.2, 0, 1) ** 0.8                     # how deep in a fold
    edge = np.clip(fine * 3.5 + coarse * 2.0, 0, 1)                 # worn ridges
    # the flesh map's own painted detail, as faint tone
    b = np.asarray(base_img.convert('RGB').resize((N, N), Image.LANCZOS)).astype(np.float32) / 255.0
    L = 0.299 * b[..., 0] + 0.587 * b[..., 1] + 0.114 * b[..., 2]
    Ld = (L - blur(L, 24)) * 0.35
    grey = np.array([0.46, 0.46, 0.445])                             # limestone, cool
    a = grey[None, None, :] * (1.0 + Ld[..., None])
    a = a * (1 - 0.45 * cav[..., None])                              # the folds dark
    a = a + (np.array([0.74, 0.73, 0.70]) - a) * (edge[..., None] * 0.40)   # the ridges pale
    # weathering: big soft mottle, finer pitting, and grime in the deepest recesses
    mot = 0.80 + 0.30 * noise(N, 5, 41) + 0.10 * noise(N, 30, 42)
    pit = noise(N, 160, 43); pit = np.clip((pit - 0.62) * 4, 0, 1)
    a = a * mot[..., None] * (1 - 0.25 * pit[..., None])
    grime = np.clip(cav * 1.3 - 0.45, 0, 1) * (0.6 + 0.4 * noise(N, 12, 44))
    a = a * (1 - 0.45 * grime[..., None]) + np.array([0.06, 0.055, 0.05]) * 0.45 * grime[..., None]
    # rain streaks and old soot: long thin dark runs (the islands lie every way, so they read as stains, not runs)
    st = noise(N, 3, 45) * 0.6 + noise(N, 90, 46) * 0.4
    st = np.clip((st - 0.58) * 3.0, 0, 1) * np.clip(blur(cav, 8) * 2, 0, 1)
    a = a * (1 - 0.30 * st[..., None])
    # lichen: a few low patches, grey-green and ochre, mostly in the recesses
    li = np.clip((noise(N, 7, 47) - 0.66) * 5, 0, 1) * np.clip(cav * 1.6 + 0.2, 0, 1)
    li2 = np.clip((noise(N, 9, 48) - 0.72) * 6, 0, 1) * (1 - cav)
    a = a * (1 - 0.35 * li[..., None]) + np.array([0.36, 0.40, 0.27]) * 0.35 * li[..., None]
    a = a * (1 - 0.30 * li2[..., None]) + np.array([0.55, 0.47, 0.30]) * 0.30 * li2[..., None]
    return Image.fromarray((np.clip(a, 0, 1) ** 1.05 * 255).astype(np.uint8))


def eyes_only(img):
    """the eyes and nothing else: the source's emissive is a dark brown wash with the eyes bright in it, and lit at the
    game's waking strength the wash glowed the whole stone body flesh-brown (measured in the court). Only what is well
    over the wash is kept, the rest is black."""
    a = np.asarray(img.convert('RGB').resize((512, 512), Image.LANCZOS)).astype(np.float32) / 255.0
    L = a.max(axis=2)
    k = np.clip((L - 0.30) / 0.35, 0, 1)[..., None]
    return Image.fromarray((np.clip(a * k, 0, 1) * 255).astype(np.uint8))


def log(*a):
    print('[gargoyle]', *a, flush=True)


def pack():
    base = os.path.dirname(SRC)
    g = json.load(open(SRC))
    raw = open(os.path.join(base, g['buffers'][0]['uri']), 'rb').read()
    for a in g.get('animations', []): a['name'] = 'gFly'
    for n in g['nodes']: n['name'] = re.sub(r'_\d+$', '', n.get('name', ''))
    m = g['materials'][0]; p = m['pbrMetallicRoughness']
    tex_of = {'base': p['baseColorTexture']['index'], 'normal': m['normalTexture']['index'], 'emis': m['emissiveTexture']['index']}
    p.pop('metallicRoughnessTexture', None); p['metallicFactor'] = 0.0; p['roughnessFactor'] = 0.92
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
        a['channels'] = [c for c in a['channels'] if c['target']['path'] != 'scale']
        keep = sorted({c['sampler'] for c in a['channels']}); remap = {o: i for i, o in enumerate(keep)}
        a['samplers'] = [a['samplers'][i] for i in keep]
        for c in a['channels']: c['sampler'] = remap[c['sampler']]
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
    img = lambda k: Image.open(os.path.join(base, g['images'][g['textures'][tex_of[k]]['source']]['uri']))
    nimg = img('normal')
    out_imgs = [('stone', stone(img('base'), nimg)), ('normal', nimg.convert('RGB').resize((N, N), Image.LANCZOS)),
                ('emis', eyes_only(img('emis')))]
    images = []; textures = []; idx = {}
    for k, im in out_imgs:
        b = io.BytesIO(); im.save(b, 'JPEG', quality=88 if k != 'emis' else 80, optimize=True)
        images.append({'bufferView': put(b.getvalue()), 'mimeType': 'image/jpeg', 'name': 'gargoyle_' + k})
        textures.append({'source': len(images) - 1, 'sampler': 0}); idx[k] = len(textures) - 1
    p['baseColorTexture'] = {'index': idx['stone']}
    m['normalTexture'] = {'index': idx['normal'], 'scale': 1.0}
    m['emissiveTexture'] = {'index': idx['emis']}
    g['samplers'] = g.get('samplers') or [{}]
    g['accessors'] = accs; g['bufferViews'] = views; g['textures'] = textures; g['images'] = images
    g['buffers'] = [{'byteLength': len(blob)}]
    g.setdefault('asset', {})['generator'] = 'beachwalk tools/gargoyle_pack.py'
    if os.environ.get('GARG_PREVIEW'): out_imgs[0][1].save(os.environ['GARG_PREVIEW'], quality=85)   # (to look at the stone)
    js = json.dumps(g, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    while len(blob) % 4: blob.append(0)
    with open(OUT, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    log(OUT, '%.2f MB' % (os.path.getsize(OUT) / 1e6))


pack()
