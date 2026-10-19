#!/usr/bin/env python3
"""The two sword knights of Castle XIII's west court (2026-10-19, the owner: "take out the mace knight in the second
section of the castle and add both of these guys") into assets/knight-man.glb and assets/knight-iron.glb.

    /usr/bin/python3 tools/swordknights_pack.py

  ~/Downloads/knight-2  "knight" by sanyaork (CC-BY-4.0)  -> assets/knight-man.glb
      A man-at-arms in a bascinet and a padded gambeson, 73k vertices on an Unreal mannequin (pelvis, spine_01-05,
      clavicle/upperarm/lowerarm/hand, thigh/calf/foot/ball, twist bones, a face rig). His sword is skinned to hand_r
      and lies in his closed fist in the bind. The bones lose sketchfab's numeric suffix (`pelvis_143` -> `pelvis`) so
      the undercroft knight's Mixamo map (`MUT_KINDS.knight.rag`) is his too. 44 maps (330 MB) become 14 base colours
      (1024 for the plate and the body, 512 the rest) and 14 normal maps at 512; the metal/roughness and specular maps
      go (METALNESS IS A TRAP) and the chainmail and the eyes are cut out (MASK) instead of blended.
  ~/Downloads/knight    "KNIGHT" by PONCHIK (CC-BY-4.0)   -> assets/knight-iron.glb
      A heavy, stylised plate knight on a 20-bone rig (no fingers: his gauntlets are rigid fists). The bones are
      given Mixamo's names under `Character1_` (his one spine bone is the CHEST, Spine2, so the whole turn of the
      torso goes onto it), and his sword — a loose object in the source that only sits in his right fist in the bind
      — is left where it is for the game to put in that fist (`kn2Seat`). His materials are all but black (0.013) with
      only normal maps: here the plate is dark gunmetal, the gauntlets black leather, the blade steel, the grip dark.

Both lose the source's own one-pose animation, the stray `Icosphere`, tangents, and every byte nothing draws."""
import os, io, json, struct, re
import numpy as np
from PIL import Image, ImageFilter

HOME = os.path.expanduser('~')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CT = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

IRON_BONES = {
    'Bone_Armature': 'Hips', 'Bone.002_Armature': 'Spine2', 'Bone.001_Armature': 'Head',
    'Bone.003_Armature': 'LeftShoulder', 'Bone.004_Armature': 'LeftArm', 'Bone.005_Armature': 'LeftForeArm', 'Bone.006_Armature': 'LeftHand',
    'Bone.007_Armature': 'RightShoulder', 'Bone.008_Armature': 'RightArm', 'Bone.009_Armature': 'RightForeArm', 'Bone.010_Armature': 'RightHand',
    'Bone.011_Armature': 'LeftUpLeg', 'Bone.012_Armature': 'LeftLeg', 'Bone.013_Armature': 'LeftFoot', 'Bone.014_Armature': 'LeftToeBase',
    'Bone.015_Armature': 'RightUpLeg', 'Bone.016_Armature': 'RightLeg', 'Bone.017_Armature': 'RightFoot', 'Bone.018_Armature': 'RightToeBase',
}
IRON_COLOR = {   # linear base colours
    'KNIGHT': [0.055, 0.058, 0.066, 1], '3_SkinHand': [0.022, 0.019, 0.017, 1], 'material': [0.03, 0.03, 0.032, 1],
    'SWORD': [0.30, 0.31, 0.33, 1], 'Material.001': [0.035, 0.026, 0.02, 1],
}
BIG = {'ARMOR', 'body', 'MI_Character'}
IRON_MAP = {   # sRGB-ish 0..1: the flat plate, and its worn edges
    'KNIGHT': ([0.20, 0.205, 0.22], [0.50, 0.50, 0.50]),
    'SWORD': ([0.42, 0.43, 0.45], [0.74, 0.74, 0.75]),
}


# ---- MADE TO BELONG IN THE COURT (2026-10-19, the owner: "make sure their textures blend in with the game as well").
# The castle is old stone under torches and a night sky; everything that fights in it — the paladin, the flail knight,
# the farmers — is worn, dark and a little dirty. The man's maps came clean and bright (a showroom's polished steel and
# cream cloth), the iron knight's with no colour at all.
def noise(n, scale, seed):
    rng = np.random.default_rng(seed)
    small = Image.fromarray((rng.random((max(2, n // scale), max(2, n // scale))) * 255).astype(np.uint8))
    return np.asarray(small.resize((n, n), Image.BICUBIC).filter(ImageFilter.GaussianBlur(n / scale / 3))).astype(np.float32) / 255.0


def grade_man(img, name):
    """the man's: darker, a third less colour, a breath warmer (torchlight on it), and grime in the low frequencies"""
    if re.search(r'eyes|sclera', name, re.I): return img
    a = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0
    L = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])[..., None]
    a = L + (a - L) * 0.66
    a = a * np.array([1.03, 1.0, 0.92]) * (0.70 if re.search(r'ARMOR|helmet|sword', name) else 0.78)
    n = a.shape[0]; g = 0.80 + 0.22 * noise(n, 8, len(name)) + 0.06 * noise(n, 48, len(name) + 7)
    a = a * g[..., None] if a.shape[0] == a.shape[1] else a * (0.86 + 0.0 * a)
    out = Image.fromarray((np.clip(a, 0, 1) ** 1.05 * 255).astype(np.uint8))
    if img.mode == 'RGBA': out.putalpha(img.getchannel('A'))
    return out


def iron_albedo(normal_img, base, edge, seed):
    """the iron knight's colour, out of his own normal map: plate where it is flat, darker in every recess, the
    raised edges and rivets worn bright, and grime mottled over it all"""
    nm = np.asarray(normal_img.convert('RGB').resize((1024, 1024), Image.LANCZOS)).astype(np.float32) / 127.5 - 1.0
    z = np.clip(nm[..., 2], 0, 1)
    zi = Image.fromarray((z * 255).astype(np.uint8))
    zb = np.asarray(zi.filter(ImageFilter.GaussianBlur(10))).astype(np.float32) / 255.0
    det = (z - zb)                                   # convex edges above their surroundings > 0, recesses < 0
    bend = 1.0 - z                                   # how far from flat
    k = np.clip(0.5 + det * 4.0, 0, 1)[..., None]
    a = np.array(base) * (1.0 - 0.45 * np.clip(bend * 2.2, 0, 1)[..., None])
    a = a + (np.array(edge) - np.array(base)) * np.clip((k - 0.5) * 2, 0, 1) * 0.9
    g = 0.78 + 0.26 * noise(1024, 6, seed) + 0.08 * noise(1024, 40, seed + 1)
    a = a * g[..., None] * np.array([1.02, 1.0, 0.96])
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS)


def grade_dark(img):
    """the dark knight's: his black plate kept black but not a hole — the darks lifted a little, the colour taken down a
    third (his source is a glossy game render's), a breath of the torches' warmth, and grime in the low frequencies"""
    a = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0
    L = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])[..., None]
    a = L + (a - L) * 0.68
    a = np.clip(a * 1.25, 0, 1) ** 0.72 * np.array([1.03, 1.0, 0.95])   # (measured in the court: at ** 0.9 his chest read 1 against paving 17 — a hole)
    n = a.shape[0]; g = 0.84 + 0.18 * noise(n, 8, 31) + 0.05 * noise(n, 48, 32)
    if a.shape[0] == a.shape[1]: a = a * g[..., None]
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def log(*a):
    print('[swordknights]', *a, flush=True)


def pack(src, out, kind):
    base = os.path.dirname(src)
    g = json.load(open(src))
    raw = open(os.path.join(base, g['buffers'][0]['uri']), 'rb').read()
    # ---- the stray sphere, and the source's own pose
    for n in g['nodes']:
        if n.get('name', '').startswith('Icosphere'):
            n.pop('mesh', None)
    if kind == 'dark':
        # HIS OWN EIGHT, KEPT: Infinity Blade's attack strings, named by their order in the file (`dkC0`…`dkC7`)
        for i, a in enumerate(g.get('animations', [])): a['name'] = 'dkC%d' % i
    else:
        g.pop('animations', None)
    # ---- the bones' names
    for n in g['nodes']:
        nm = n.get('name', '')
        if kind in ('man', 'dark'):
            n['name'] = re.sub(r'_\d+$', '', nm)
        elif nm in IRON_BONES:
            n['name'] = 'Character1_' + IRON_BONES[nm]
    # ---- the materials
    keep_tex = set()
    for m in g['materials']:
        p = m.setdefault('pbrMetallicRoughness', {})
        p.pop('metallicRoughnessTexture', None); p['metallicFactor'] = 0.0; p['roughnessFactor'] = 0.85
        m.pop('extensions', None); m.pop('occlusionTexture', None); m.pop('emissiveTexture', None)   # (the occlusion is the metal/roughness map's red: gone with it)
        if m.get('alphaMode') == 'BLEND':
            m['alphaMode'] = 'MASK'; m['alphaCutoff'] = 0.5
        if kind == 'iron' and m.get('name') in IRON_COLOR:
            p['baseColorFactor'] = IRON_COLOR[m['name']]
            p['roughnessFactor'] = 0.55 if m['name'] == 'SWORD' else 0.8
            if m['name'] in IRON_MAP and 'normalTexture' in m:
                p['baseColorTexture'] = {'index': ('iron', m['name'], m['normalTexture']['index'])}
                p['baseColorFactor'] = [1, 1, 1, 1]
        if 'baseColorTexture' in p and not isinstance(p['baseColorTexture']['index'], tuple): keep_tex.add(p['baseColorTexture']['index'])
        if 'normalTexture' in m: keep_tex.add(m['normalTexture']['index'])
    g.pop('extensionsUsed', None); g.pop('extensionsRequired', None)
    # ---- what is drawn: accessors the meshes and the skin use
    used_acc = set()
    for me in g['meshes']:
        for pr in me['primitives']:
            pr['attributes'].pop('TANGENT', None)
            for k in [k for k in pr['attributes'] if k.startswith('TEXCOORD_') and k != 'TEXCOORD_0']: pr['attributes'].pop(k)
            used_acc.update(pr['attributes'].values())
            if 'indices' in pr: used_acc.add(pr['indices'])
            for t in pr.get('targets', []): used_acc.update(t.values())
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
            if 'targets' in pr: pr['targets'] = [{k: acc_map[v] for k, v in t.items()} for t in pr['targets']]
    for s in g.get('skins', []):
        if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = acc_map[s['inverseBindMatrices']]
    for a in g.get('animations', []):
        for sm in a['samplers']: sm['input'] = acc_map[sm['input']]; sm['output'] = acc_map[sm['output']]
    # ---- the maps: the ones still asked for, made small
    tex_map = {}; textures = []; images = []
    normal_of = {m['normalTexture']['index'] for m in g['materials'] if 'normalTexture' in m}
    owner = {}
    for m in g['materials']:
        p = m['pbrMetallicRoughness']
        if 'baseColorTexture' in p: owner[p['baseColorTexture']['index']] = m.get('name', '')
    made = [m['pbrMetallicRoughness']['baseColorTexture']['index'] for m in g['materials'] if isinstance(m['pbrMetallicRoughness'].get('baseColorTexture', {}).get('index'), tuple)]
    for key in made:
        _, mname, ni = key
        nimg = Image.open(os.path.join(base, g['images'][g['textures'][ni]['source']]['uri']))
        b = io.BytesIO(); iron_albedo(nimg, *IRON_MAP[mname], len(mname)).save(b, 'JPEG', quality=86, optimize=True)
        images.append({'bufferView': put(b.getvalue()), 'mimeType': 'image/jpeg', 'name': mname + '_albedo'})
        textures.append({'source': len(images) - 1, 'sampler': 0} if g.get('samplers') else {'source': len(images) - 1}); tex_map[key] = len(textures) - 1
    for ti in sorted(keep_tex):
        t = g['textures'][ti]; im = g['images'][t['source']]
        img = Image.open(os.path.join(base, im['uri']))
        if kind == 'man' and ti not in normal_of: img = grade_man(img, owner.get(ti, '') + ' ' + im['uri'])
        if kind == 'dark' and ti not in normal_of: img = grade_dark(img)
        isn = ti in normal_of
        size = 512 if (isn or owner.get(ti) not in BIG) else 1024
        alpha = img.mode in ('RGBA', 'LA') and not isn and img.getextrema()[-1][0] < 250
        img = img.convert('RGBA' if alpha else 'RGB')
        if max(img.size) > size: img = img.resize((size, size) if img.size[0] == img.size[1] else (size, int(size * img.size[1] / img.size[0])), Image.LANCZOS)
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
    if not textures: g.pop('samplers', None)
    g.setdefault('asset', {})['generator'] = 'beachwalk tools/swordknights_pack.py'
    js = json.dumps(g, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    while len(blob) % 4: blob.append(0)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    log(out, '%.2f MB' % (os.path.getsize(out) / 1e6), len(images), 'maps')


import sys
WHO = sys.argv[1:] or ['man', 'iron', 'dark']
if 'man' in WHO:
    # (decimated first, in Blender: 118k faces -> 40k — `tools/swordknights_decimate.py`)
    import subprocess
    dec = '/tmp/swordknights/knight-2-dec'; os.makedirs(dec, exist_ok=True)
    subprocess.run(['/Applications/Blender.app/Contents/MacOS/Blender', '-b', '--factory-startup', '-P', os.path.join(ROOT, 'tools/swordknights_decimate.py'), '--',
                    os.path.join(HOME, 'Downloads/knight-2/scene.gltf'), os.path.join(dec, 'scene.gltf'), '0.33'], check=True, capture_output=True)
    pack(os.path.join(dec, 'scene.gltf'), os.path.join(ROOT, 'assets/knight-man.glb'), 'man')
if 'iron' in WHO: pack(os.path.join(HOME, 'Downloads/knight/scene.gltf'), os.path.join(ROOT, 'assets/knight-iron.glb'), 'iron')
# the paladin's place (2026-10-19): Catholomew's "The Dark Knight - Infinity Blade" (CC-BY-NC-4.0: NOT for a sale)
if 'dark' in WHO: pack(os.path.join(HOME, 'Downloads/the_dark_knight_-_infinity_blade/scene.gltf'), os.path.join(ROOT, 'assets/dark-knight.glb'), 'dark')
