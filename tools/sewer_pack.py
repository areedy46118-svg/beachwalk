#!/usr/bin/env python3
"""The sewer under the drain: the owner's five Sketchfab downloads -> five small .glb.

    python3 tools/sewer_pack.py [Sewerrooms dir]      (default incoming/sewerrooms)

Pure Python + PIL, no Blender. For each model it keeps the nodes the game
builds with (the sewer kit is a catalogue of ~170 pieces; the game uses a
dozen), POSITION / NORMAL / TEXCOORD_0 only, and of every material only the
colour and the glow: the normal, roughness, occlusion, specular and
transmission maps are dropped (there is no environment map to show them, and
METALNESS IS A TRAP — metalness goes to 0). Textures are cut to `tex` px and
written as JPEG unless they carry alpha the game needs.

Out: assets/sewer.glb (the kit pieces), sewer-generator.glb, sewer-lever.glb,
sewer-lamp.glb, sewer-box.glb.
"""
import io, json, os, struct, sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'incoming/sewerrooms'
OUT = 'assets'

KIT = [
    # the big red-brick sewer: straight, ladder shaft (+ its ladder), side door, T, dead end, arch rib
    'Serwers_009', 'Serwers_005', 'Cylinder', 'Serwers_007', 'Serwers_001', 'Serwers_011', 'Serwers_010',
    # the small red-brick passage: straight, T, door frame, rib, the two arched grates and the grate door
    'SerwersP', 'SerwersP_003', 'SerwersP_008', 'SerwersP_009', 'SerwersP_011', 'SerwersP_012', 'SerwersP_013',
    # the wider passage's full grate (scaled to close the big tunnel)
    'SerwersP1_010',
    # rubbish
    'Garbage_bag', 'Garbage_bag_001', 'Tire', 'Box_T', 'Box_T_01', 'Box_T_03', 'Bricks', 'Brick', 'TB', 'Trash_M',
    'Pipe_003', 'Pipe_006',
]
SPECS = [
    ('Sewer pipes/scene.gltf', 'sewer.glb', KIT, 256, False),
    ('generator/scene.gltf', 'sewer-generator.glb', None, 512, False),
    ('lever/scene.gltf', 'sewer-lever.glb', None, 256, False),
    ('lightd/scene.gltf', 'sewer-lamp.glb', None, 256, True),
    ('box/scene.gltf', 'sewer-box.glb', None, 256, False),
]
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
CSIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
KEEP_ATTR = ('POSITION', 'NORMAL', 'TEXCOORD_0')


def pack(src, dst, keep, tex, alpha):
    base = os.path.dirname(src)
    g = json.load(open(src, encoding='utf-8'))
    bins = [open(os.path.join(base, b['uri']), 'rb').read() for b in g['buffers']]
    nodes = g['nodes']

    # ---- which nodes: a kept name, everything under it, and the chain above it
    want = set()
    def mark(i, inside):
        n = nodes[i]
        here = inside or keep is None or n.get('name') in keep
        sub = any([mark(c, here) for c in n.get('children', [])])
        if here or sub: want.add(i)
        return here or sub
    roots = g['scenes'][g.get('scene', 0)]['nodes']
    for r in roots: mark(r, False)
    if keep:
        found = {nodes[i].get('name') for i in want}
        miss = [k for k in keep if k not in found]
        if miss: sys.exit(f'{src}: no node named {miss}')

    out = {'asset': {'version': '2.0', 'generator': 'beachwalk sewer_pack.py'}, 'scene': 0,
           'nodes': [], 'meshes': [], 'accessors': [], 'bufferViews': [], 'materials': [],
           'textures': [], 'images': [], 'samplers': []}
    blob = bytearray()
    def put(data):
        while len(blob) % 4: blob.append(0)
        off = len(blob); blob.extend(data)
        return off

    acc_map, mesh_map, mat_map, tex_map, img_map, smp_map = {}, {}, {}, {}, {}, {}

    def accessor(ai):
        if ai in acc_map: return acc_map[ai]
        a = g['accessors'][ai]; bv = g['bufferViews'][a['bufferView']]
        es = NCOMP[a['type']] * CSIZE[a['componentType']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); st = bv.get('byteStride', 0) or es
        raw = bins[bv['buffer']]
        data = raw[off:off + es * a['count']] if st == es else b''.join(raw[off + i * st: off + i * st + es] for i in range(a['count']))
        o = put(data)
        view = {'buffer': 0, 'byteOffset': o, 'byteLength': len(data)}
        if 'target' in bv: view['target'] = bv['target']
        out['bufferViews'].append(view)
        na = {k: v for k, v in a.items() if k not in ('bufferView', 'byteOffset', 'sparse')}
        na['bufferView'] = len(out['bufferViews']) - 1
        out['accessors'].append(na)
        acc_map[ai] = len(out['accessors']) - 1
        return acc_map[ai]

    def image(ii):
        if ii in img_map: return img_map[ii]
        im = g['images'][ii]
        if 'uri' in im: pic = Image.open(os.path.join(base, im['uri']))
        else:
            bv = g['bufferViews'][im['bufferView']]
            pic = Image.open(io.BytesIO(bins[bv['buffer']][bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]))
        pic.load()
        if max(pic.size) > tex:
            k = tex / max(pic.size)
            pic = pic.resize((max(1, round(pic.size[0] * k)), max(1, round(pic.size[1] * k))), Image.LANCZOS)
        buf = io.BytesIO()
        has_a = pic.mode in ('RGBA', 'LA') and pic.getextrema()[-1][0] < 250
        if alpha and has_a:
            pic.convert('RGBA').save(buf, 'PNG', optimize=True); mime = 'image/png'
        else:
            pic.convert('RGB').save(buf, 'JPEG', quality=86, optimize=True); mime = 'image/jpeg'
        o = put(buf.getvalue())
        out['bufferViews'].append({'buffer': 0, 'byteOffset': o, 'byteLength': len(buf.getvalue())})
        out['images'].append({'bufferView': len(out['bufferViews']) - 1, 'mimeType': mime, 'name': im.get('name', '') or os.path.basename(im.get('uri', ''))})
        img_map[ii] = len(out['images']) - 1
        return img_map[ii]

    def texture(ti):
        if ti in tex_map: return tex_map[ti]
        t = g['textures'][ti]; nt = {'source': image(t['source'])}
        if 'sampler' in t:
            si = t['sampler']
            if si not in smp_map:
                out['samplers'].append(g['samplers'][si]); smp_map[si] = len(out['samplers']) - 1
            nt['sampler'] = smp_map[si]
        out['textures'].append(nt)
        tex_map[ti] = len(out['textures']) - 1
        return tex_map[ti]

    def material(mi):
        if mi in mat_map: return mat_map[mi]
        m = g['materials'][mi]; pb = m.get('pbrMetallicRoughness', {})
        nm = {'name': m.get('name', ''), 'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': 0.9}}
        if 'baseColorFactor' in pb: nm['pbrMetallicRoughness']['baseColorFactor'] = pb['baseColorFactor']
        if 'baseColorTexture' in pb: nm['pbrMetallicRoughness']['baseColorTexture'] = {'index': texture(pb['baseColorTexture']['index'])}
        if 'emissiveTexture' in m:
            nm['emissiveTexture'] = {'index': texture(m['emissiveTexture']['index'])}
            nm['emissiveFactor'] = m.get('emissiveFactor', [1, 1, 1])
        if alpha and m.get('alphaMode') in ('BLEND', 'MASK'): nm['alphaMode'] = m['alphaMode']
        if m.get('doubleSided'): nm['doubleSided'] = True
        out['materials'].append(nm)
        mat_map[mi] = len(out['materials']) - 1
        return mat_map[mi]

    def mesh(mi):
        if mi in mesh_map: return mesh_map[mi]
        m = g['meshes'][mi]; prims = []
        for p in m['primitives']:
            np_ = {'attributes': {k: accessor(v) for k, v in p['attributes'].items() if k in KEEP_ATTR}}
            if 'indices' in p: np_['indices'] = accessor(p['indices'])
            if 'material' in p: np_['material'] = material(p['material'])
            if 'mode' in p: np_['mode'] = p['mode']
            prims.append(np_)
        out['meshes'].append({'name': m.get('name', ''), 'primitives': prims})
        mesh_map[mi] = len(out['meshes']) - 1
        return mesh_map[mi]

    node_map = {}
    def node(i):
        n = nodes[i]
        nn = {k: v for k, v in n.items() if k in ('name', 'matrix', 'translation', 'rotation', 'scale')}
        if 'mesh' in n: nn['mesh'] = mesh(n['mesh'])
        out['nodes'].append(nn); node_map[i] = len(out['nodes']) - 1
        kids = [node(c) for c in n.get('children', []) if c in want]
        if kids: nn['children'] = kids
        return node_map[i]
    out['scenes'] = [{'nodes': [node(r) for r in roots if r in want]}]
    for k in ('textures', 'images', 'samplers'):
        if not out[k]: del out[k]

    while len(blob) % 4: blob.append(0)
    out['buffers'] = [{'byteLength': len(blob)}]
    js = json.dumps(out, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    with open(dst, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    print(f'{dst}: {len(out["nodes"])} nodes, {len(out["meshes"])} meshes, {len(out.get("images", []))} images, {os.path.getsize(dst) / 1e6:.2f} MB')


for s, d, k, t, a in SPECS:
    pack(os.path.join(SRC, s), os.path.join(OUT, d), k, t, a)
