"""Henry (Jungle Jim, CC-BY-4.0) -> assets/henry.glb, keeping the source's own rig and node tree.
   python3 -I repack.py SRC.gltf DST.glb
 - morph targets: only the head's and eyelashes' blinks (16, 17) and one lip part (117); the rest dropped
 - the tearline / eye-occlusion overlays dropped, the clip dropped
 - pbrSpecularGlossiness (three r160 no longer reads it) -> metallic-roughness, metallic 0
 - textures to 512, colour washed and darkened with grime (a prisoner); normals only resized"""
import json, struct, sys, os, io, random
from PIL import Image, ImageFilter, ImageChops
src, dst = sys.argv[1], sys.argv[2]
root = os.path.dirname(os.path.abspath(src))
g = json.load(open(src))
binb = open(os.path.join(root, g['buffers'][0]['uri']), 'rb').read()
CT = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
KEEPT = {16: 'blinkL', 17: 'blinkR', 117: 'lips'}
DROPMAT = ('Std_Tearline_L', 'Std_Tearline_R', 'Std_Eye_Occlusion_L', 'Std_Eye_Occlusion_R')
mats = g['materials']
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
for m in g['meshes']:
    newp = []
    for p in m['primitives']:
        mn = mats[p['material']]['name'] if 'material' in p else ''
        if mn in DROPMAT: continue
        p['attributes'] = {k: copy_acc(v, 34962) for k, v in p['attributes'].items()}
        if 'indices' in p: p['indices'] = copy_acc(p['indices'], 34963)
        tg = p.get('targets', [])
        keep = [i for i in sorted(KEEPT) if len(tg) == 148 and mn in ('Std_Skin_Head', 'Std_Eyelash') and i < len(tg)]
        if keep:
            p['targets'] = [{k: copy_acc(v) for k, v in tg[i].items() if k == 'POSITION'} for i in keep]
            m['extras'] = {'targetNames': [KEEPT[i] for i in keep]}; m['weights'] = [0.0] * len(keep)
        else:
            p.pop('targets', None); m.pop('weights', None)
        newp.append(p)
    m['primitives'] = newp
# meshes with nothing left: unhook from their nodes
for n in g['nodes']:
    if 'mesh' in n and not g['meshes'][n['mesh']]['primitives']:
        n.pop('mesh'); n.pop('skin', None)
for s in g.get('skins', []):
    if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = copy_acc(s['inverseBindMatrices'])
g.pop('animations', None)
# materials: spec-gloss -> metal-rough
for m in mats:
    ext = m.get('extensions', {}).get('KHR_materials_pbrSpecularGlossiness')
    if ext:
        pbr = {'metallicFactor': 0.0, 'roughnessFactor': 0.85}
        if 'diffuseTexture' in ext: pbr['baseColorTexture'] = ext['diffuseTexture']
        if 'diffuseFactor' in ext: pbr['baseColorFactor'] = ext['diffuseFactor']
        m['pbrMetallicRoughness'] = pbr
        m['extensions'].pop('KHR_materials_pbrSpecularGlossiness')
        if not m['extensions']: m.pop('extensions')
    else:
        m.setdefault('pbrMetallicRoughness', {})['metallicFactor'] = 0.0
g.pop('extensionsUsed', None); g.pop('extensionsRequired', None)
# images: 512, washed and grimed (colour maps), embedded
random.seed(91014)
def grime(w, h):
    layers = []
    for cells, k in ((9, 0.55), (33, 0.3), (97, 0.15)):
        n = Image.effect_noise((cells, cells), 64).resize((w, h), Image.BICUBIC)
        layers.append((n, k))
    base = Image.new('L', (w, h), 0)
    for n, k in layers: base = ImageChops.add(base, n.point(lambda v, k=k: int(v * k)))
    return base.point(lambda v: max(0, min(255, int((v / 255 - 0.42) * 2.4 * 255))))
used = set()
for m in mats:
    for key in ('normalTexture', 'occlusionTexture', 'emissiveTexture'):
        if key in m: used.add(('n', m[key]['index']))
    pbr = m.get('pbrMetallicRoughness', {})
    if 'baseColorTexture' in pbr: used.add(('c', pbr['baseColorTexture']['index']))
    if 'metallicRoughnessTexture' in pbr: pbr.pop('metallicRoughnessTexture')
kind = {}
for k, ti in used: kind[g['textures'][ti]['source']] = k
for ii, im in enumerate(g['images']):
    path = os.path.join(root, im['uri'])
    I = Image.open(path); alpha = I.mode in ('RGBA', 'LA') or 'Transparency' in im['uri'] or 'Eyelash' in im['uri']
    I = I.convert('RGBA' if alpha else 'RGB')
    if I.width > 512: I = I.resize((512, max(1, 512 * I.height // I.width)), Image.LANCZOS)
    if kind.get(ii) == 'c' and I.width > 8:
        a = I.getchannel('A') if alpha else None
        rgb = I.convert('RGB'); lum = rgb.convert('L').convert('RGB')
        nm = im['uri'].lower()
        if 'eye' in nm and 'lash' not in nm:
            rgb = ImageChops.multiply(Image.blend(rgb, lum, 0.5), Image.new('RGB', rgb.size, (158, 143, 107)))
        else:
            rgb = Image.blend(rgb, lum, 0.45)
            rgb = ImageChops.multiply(rgb, Image.new('RGB', rgb.size, (219, 204, 178)))
            d = grime(*rgb.size)
            dark = ImageChops.multiply(rgb, Image.new('RGB', rgb.size, (115, 104, 92)))
            rgb = Image.composite(dark, rgb, d)
        I = rgb if not alpha else Image.merge('RGBA', (*rgb.split(), a))
    buf = io.BytesIO()
    if alpha: I.save(buf, 'PNG', optimize=True); mime = 'image/png'
    else: I.save(buf, 'JPEG', quality=82); mime = 'image/jpeg'
    im.pop('uri'); im['mimeType'] = mime; im['bufferView'] = add_view(buf.getvalue())
g['accessors'] = accs; g['bufferViews'] = views
g['buffers'] = [{'byteLength': len(out)}]
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
while len(out) % 4: out.append(0)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
open(dst, 'wb').write(glb)
print('wrote', dst, len(glb) // 1024, 'KB')
