#!/usr/bin/env python3
"""Pack a Sketchfab .gltf (+ .bin + loose 4K textures) into one small .glb.

    python3 tools/gltfpack.py in/scene.gltf assets/rocks.glb \
        --tex 1024 --normal-tex 512 --drop-mr

Unlike tools/gltfslim.py this KEEPS the textures — it is for the props whose
whole point is the scanned albedo. What it actually does:

  * rebuilds the binary from scratch, so every attribute we dropped
    (TANGENT and the spare UV sets, ~half the file on these downloads)
    really leaves;
  * downcasts 32-bit indices to 16-bit wherever the vertex count allows;
  * resizes every image and re-encodes it as JPEG — Sketchfab ships 4096²
    PNGs, which is 344 MB for six little rocks;
  * rewrites KHR_materials_pbrSpecularGlossiness into plain metallic-roughness.
    three r160 dropped that extension, so a spec-gloss model loads as blank
    white with no maps at all — which is exactly how the body bag first looked.

Geometry, node names and the node hierarchy come through untouched.
"""
import argparse, base64, io, json, os, struct, sys

from PIL import Image

CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
      5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4,
      'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER = 34962, 34963


def pad4(b):
    b.extend(b'\0' * ((4 - len(b) % 4) % 4))


def read_accessor(g, bufs, i):
    """every element of accessor i as a tuple, de-strided"""
    a = g['accessors'][i]
    fmt, size = CT[a['componentType']]
    n = NC[a['type']]
    if 'bufferView' not in a:                       # all-zero accessor
        return [(0,) * n] * a['count']
    bv = g['bufferViews'][a['bufferView']]
    buf = bufs[bv.get('buffer', 0)]
    stride = bv.get('byteStride') or size * n
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + fmt * n, buf, base + k * stride)
            for k in range(a['count'])]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--tex', type=int, default=1024, help='max size for colour maps')
    ap.add_argument('--normal-tex', type=int, default=0, help='max size for normal maps (default: --tex)')
    ap.add_argument('--quality', type=int, default=88)
    ap.add_argument('--drop', default='TANGENT,TEXCOORD_1,TEXCOORD_2,TEXCOORD_3,COLOR_0',
                    help='vertex attributes to throw away')
    ap.add_argument('--drop-mr', action='store_true',
                    help='drop metallicRoughness maps and use flat factors')
    a = ap.parse_args()
    nrm_max = a.normal_tex or a.tex
    drop = {s for s in a.drop.split(',') if s}

    root = os.path.dirname(os.path.abspath(a.src))
    g = json.load(open(a.src))
    bufs = []
    for b in g['buffers']:
        uri = b.get('uri', '')
        bufs.append(base64.b64decode(uri.split(',', 1)[1]) if uri.startswith('data:')
                    else open(os.path.join(root, uri), 'rb').read())

    # ---- materials: spec-gloss -> metallic-roughness -------------------
    for m in g.get('materials', []):
        sg = (m.get('extensions') or {}).pop('KHR_materials_pbrSpecularGlossiness', None)
        if sg is not None:
            pbr = m.setdefault('pbrMetallicRoughness', {})
            pbr['baseColorFactor'] = sg.get('diffuseFactor', [1, 1, 1, 1])
            if 'diffuseTexture' in sg:
                pbr['baseColorTexture'] = sg['diffuseTexture']
            pbr['metallicFactor'] = 0.0
            pbr['roughnessFactor'] = round(1.0 - sg.get('glossinessFactor', 1.0), 4)
            if not m['extensions']:
                del m['extensions']
        if a.drop_mr:
            pbr = m.setdefault('pbrMetallicRoughness', {})
            pbr.pop('metallicRoughnessTexture', None)
            pbr.setdefault('metallicFactor', 0.0)
            pbr.setdefault('roughnessFactor', 1.0)
    for k in ('extensionsUsed', 'extensionsRequired'):
        if k in g:
            g[k] = [e for e in g[k] if e != 'KHR_materials_pbrSpecularGlossiness']
            if not g[k]:
                del g[k]

    # ---- prune attributes, and note which accessors survive ------------
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            for at in list(pr.get('attributes', {})):
                if at in drop:
                    del pr['attributes'][at]
            pr.pop('targets', None)

    # a texCoord pointing at a set we just dropped would sample garbage
    for m in g.get('materials', []):
        def fix(t):
            if t and t.get('texCoord', 0) > 0 and ('TEXCOORD_%d' % t['texCoord']) in drop:
                t['texCoord'] = 0
        pbr = m.get('pbrMetallicRoughness', {})
        for t in (pbr.get('baseColorTexture'), pbr.get('metallicRoughnessTexture'),
                  m.get('normalTexture'), m.get('occlusionTexture'), m.get('emissiveTexture')):
            fix(t)

    used = set()
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            used.update(pr['attributes'].values())
            if 'indices' in pr:
                used.add(pr['indices'])
    for s in g.get('skins', []):
        if 'inverseBindMatrices' in s:
            used.add(s['inverseBindMatrices'])
    for an in g.get('animations', []):
        for s in an.get('samplers', []):
            used.add(s['input']); used.add(s['output'])

    # ---- rebuild the binary -------------------------------------------
    blob = bytearray()
    views, remap = [], {}

    def emit(data, target=None, stride=None):
        pad4(blob)
        off = len(blob)
        blob.extend(data)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target is not None:
            v['target'] = target
        views.append(v)
        return len(views) - 1

    # indices first so the downcast decision can see the vertex counts
    tighten = {}
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            ai = pr.get('indices')
            if ai is None:
                continue
            nv = g['accessors'][pr['attributes']['POSITION']]['count']
            if g['accessors'][ai]['componentType'] == 5125 and nv <= 65535:
                tighten[ai] = 5123

    for ai in sorted(used):
        acc = g['accessors'][ai]
        elems = read_accessor(g, bufs, ai)
        ct = tighten.get(ai, acc['componentType'])
        fmt, size = CT[ct]
        n = NC[acc['type']]
        data = bytearray()
        for e in elems:
            data.extend(struct.pack('<' + fmt * n, *e))
        is_idx = acc['type'] == 'SCALAR' and ct in (5121, 5123, 5125)
        vi = emit(data, ELEMENT_ARRAY_BUFFER if is_idx else ARRAY_BUFFER)
        new = {'bufferView': vi, 'componentType': ct, 'count': acc['count'],
               'type': acc['type']}
        if 'min' in acc:
            new['min'] = acc['min']; new['max'] = acc['max']
        if acc.get('normalized'):
            new['normalized'] = True
        remap[ai] = len(remap)
        g.setdefault('_new', []).append(new)

    newacc = g.pop('_new', [])
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            pr['attributes'] = {k: remap[v] for k, v in pr['attributes'].items()}
            if 'indices' in pr:
                pr['indices'] = remap[pr['indices']]
    for s in g.get('skins', []):
        if 'inverseBindMatrices' in s:
            s['inverseBindMatrices'] = remap[s['inverseBindMatrices']]
    for an in g.get('animations', []):
        for s in an.get('samplers', []):
            s['input'] = remap[s['input']]; s['output'] = remap[s['output']]
    g['accessors'] = newacc

    # ---- images: resize, re-encode, embed ------------------------------
    normal_imgs = set()
    for m in g.get('materials', []):
        nt = m.get('normalTexture')
        if nt:
            normal_imgs.add(g['textures'][nt['index']].get('source'))
    live = set()
    for m in g.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        for t in (pbr.get('baseColorTexture'), pbr.get('metallicRoughnessTexture'),
                  m.get('normalTexture'), m.get('occlusionTexture'), m.get('emissiveTexture')):
            if t:
                live.add(t['index'])

    keep_img = {}
    for ti in sorted(live):
        si = g['textures'][ti].get('source')
        if si in keep_img:
            continue
        img = g['images'][si]
        uri = img.get('uri', '')
        raw = (base64.b64decode(uri.split(',', 1)[1]) if uri.startswith('data:')
               else open(os.path.join(root, uri), 'rb').read())
        im = Image.open(io.BytesIO(raw)).convert('RGB')
        lim = nrm_max if si in normal_imgs else a.tex
        if max(im.size) > lim:
            k = lim / max(im.size)
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))),
                           Image.LANCZOS)
        out = io.BytesIO()
        im.save(out, 'JPEG', quality=a.quality, optimize=True)
        enc = out.getvalue()
        print('  %-44s %4dpx  %6.1f KB' % (os.path.basename(uri), max(im.size), len(enc) / 1024))
        keep_img[si] = {'bufferView': emit(enc), 'mimeType': 'image/jpeg',
                        'name': os.path.splitext(os.path.basename(uri))[0]}

    order = sorted(keep_img)
    imap = {si: k for k, si in enumerate(order)}
    g['images'] = [keep_img[si] for si in order]
    g['textures'] = [{**{k: v for k, v in t.items() if k != 'source'},
                      'source': imap[t['source']]}
                     if t.get('source') in imap else t
                     for t in g['textures']]

    g['bufferViews'] = views
    g['buffers'] = [{'byteLength': len(blob)}]
    g.pop('_new', None)

    # ---- write the .glb ------------------------------------------------
    js = json.dumps(g, separators=(',', ':')).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    pad4(blob)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(a.dst, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    print('%s: %.2f MB  (json %.0f KB, bin %.2f MB)'
          % (a.dst, total / 1e6, len(js) / 1024, len(blob) / 1e6))


main()
