"""The title's bedroom: jimbogies's "Bedroom" (Sketchfab, CC-BY-4.0 — credited in README) taken down to what a retro
title screen draws.  /usr/bin/python3 -E tools/bedroom_pack.py SRC/scene.gltf OUT.glb [maxpx]

 - every TANGENT dropped (no normal maps are kept, so nothing reads them) — a third of the vertex data;
 - every normal map and metallic-roughness map dropped: each material plain diffuse (roughness 1, metal 0) — the game has
   no environment map (CLAUDE.md: METALNESS IS A TRAP);
 - every colour map down to `maxpx` (256) on its long side, JPEG q82;
 - the SketchUp camera nodes dropped.
 - (--photo IMG --photo-crop x0,y0,x1,y1, fractions of the upright image) the picture in the frame on the desk is the
   owner's own (2026-11-19, IMG_7208: "make this the pic in the starting screen where that girl is"): his print, cropped out
   of the hand holding it, turned as the model's own picture was stored (upside down: its UVs turn it back);
Then, as the rings are:  python3 -I tools/glbquant.py OUT.glb tmp.glb  and gzip it whole (`bwGunzip`, `bwDequant`)."""
import json, struct, sys, io, os
from PIL import Image

args = [a for a in sys.argv[1:]]
opt = lambda k: (args[args.index(k) + 1] if k in args else None)
PHOTO, PCROP = opt('--photo'), opt('--photo-crop')
pos = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--'))]
src, dst = pos[0], pos[1]
MAXPX = int(pos[2]) if len(pos) > 2 else 256
base = os.path.dirname(src)
g = json.load(open(src))
binb = open(os.path.join(base, g['buffers'][0]['uri']), 'rb').read()

out = bytearray()
views, accs = [], []


def pad4():
    while len(out) % 4: out.append(0)


def add_view(data, target=None):
    pad4()
    v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
    if target: v['target'] = target
    out.extend(data); views.append(v)
    return len(views) - 1


def copy_acc(i, target):
    a = dict(g['accessors'][i])
    bv = g['bufferViews'][a['bufferView']]
    comp = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}[a['componentType']]
    ncomp = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    stride = bv.get('byteStride', comp * ncomp)
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    size = comp * ncomp
    if stride == size:
        data = binb[off:off + size * a['count']]
    else:
        data = b''.join(binb[off + k * stride: off + k * stride + size] for k in range(a['count']))
    a['bufferView'] = add_view(data, target); a.pop('byteOffset', None)
    accs.append(a)
    return len(accs) - 1


meshes = []
for m in g['meshes']:
    prims = []
    for p in m['primitives']:
        q = {'attributes': {}, 'material': p['material'], 'mode': p.get('mode', 4)}
        for k, ai in p['attributes'].items():
            if k == 'TANGENT': continue
            q['attributes'][k] = copy_acc(ai, 34962)
        if 'indices' in p: q['indices'] = copy_acc(p['indices'], 34963)
        prims.append(q)
    meshes.append({'name': m.get('name', ''), 'primitives': prims})

# images: only the colour maps that a material still uses
used = {}
mats = []
for m in g['materials']:
    pbr = dict(m.get('pbrMetallicRoughness', {}))
    pbr.pop('metallicRoughnessTexture', None)
    pbr['metallicFactor'] = 0.0; pbr['roughnessFactor'] = 1.0
    nm = {'name': m.get('name', ''), 'pbrMetallicRoughness': pbr}
    for k in ('alphaMode', 'alphaCutoff', 'doubleSided', 'emissiveFactor'):
        if k in m: nm[k] = m[k]
    if 'baseColorTexture' in pbr:
        ti = pbr['baseColorTexture']['index']
        if ti not in used: used[ti] = len(used)
        pbr['baseColorTexture'] = {'index': used[ti]}
    mats.append(nm)

images, textures = [], []
for old, new in sorted(used.items(), key=lambda kv: kv[1]):
    t = g['textures'][old]
    uri = g['images'][t['source']]['uri']
    im = Image.open(os.path.join(base, uri)).convert('RGB')
    if PHOTO and uri.endswith('Girl_baseColor.jpeg'):
        from PIL import ImageOps
        ph = ImageOps.exif_transpose(Image.open(PHOTO)).convert('RGB')
        if PCROP:
            x0, y0, x1, y1 = [float(v) for v in PCROP.split(',')]
            ph = ph.crop((round(x0 * ph.width), round(y0 * ph.height), round(x1 * ph.width), round(y1 * ph.height)))
        im = ph.rotate(180).resize(im.size, Image.LANCZOS)
        uri = 'photo.jpeg'
    s = MAXPX / max(im.size)
    if s < 1: im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=82, optimize=True)
    images.append({'bufferView': add_view(b.getvalue()), 'mimeType': 'image/jpeg', 'name': os.path.basename(uri)})
    tex = {'source': len(images) - 1}
    if 'sampler' in t: tex['sampler'] = 0
    textures.append(tex)

keep = []          # nodes: everything but the SketchUp camera
remap = {}
for i, n in enumerate(g['nodes']):
    if n.get('name', '').startswith('skp_camera') or n.get('name') in ('SketchUp', 'ID1'): continue
    remap[i] = len(keep); keep.append(dict(n))
for n in keep:
    if 'children' in n: n['children'] = [remap[c] for c in n['children'] if c in remap]
scene = {'nodes': [remap[i] for i in g['scenes'][0]['nodes'] if i in remap]}

J = {'asset': {'version': '2.0', 'generator': 'beachwalk bedroom_pack.py'}, 'scene': 0, 'scenes': [scene], 'nodes': keep,
     'meshes': meshes, 'materials': mats, 'accessors': accs, 'bufferViews': views,
     'buffers': [{'byteLength': 0}], 'images': images, 'textures': textures}
if 'samplers' in g and textures: J['samplers'] = [g['samplers'][0]]
pad4()
J['buffers'][0]['byteLength'] = len(out)
js = json.dumps(J, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out))
glb += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
open(dst, 'wb').write(glb)
print('wrote', dst, len(glb), 'bytes,', len(images), 'images')
