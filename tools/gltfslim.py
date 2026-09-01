#!/usr/bin/env python3
"""Strip a rigged glTF down to what this game actually draws.

    python3 tools/gltfslim.py in/scene.gltf assets/crab.glb

Keeps POSITION, NORMAL, JOINTS_0, WEIGHTS_0, the skin and the animation, and
throws away tangents, every UV set, and all the image/texture/material data —
the world is flat shaded and untextured, so a 31 MB PBR set buys nothing. The
result is written as a single self-contained .glb.
"""
import json, os, struct, sys, base64

DROP_ATTRS = {'TANGENT', 'TEXCOORD_0', 'TEXCOORD_1', 'TEXCOORD_2',
              'TEXCOORD_3', 'COLOR_0', 'JOINTS_1', 'WEIGHTS_1',
              'NORMAL'}          # flat shading derives these in the shader

def main():
    src, dst = sys.argv[1], sys.argv[2]
    root = os.path.dirname(os.path.abspath(src))
    g = json.load(open(src))
    buffers = []
    for b in g['buffers']:
        uri = b.get('uri', '')
        buffers.append(base64.b64decode(uri.split(',', 1)[1]) if uri.startswith('data:')
                       else open(os.path.join(root, uri), 'rb').read())

    # drop the attributes we never sample
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            for a in list(pr.get('attributes', {})):
                if a in DROP_ATTRS:
                    del pr['attributes'][a]
            pr.pop('material', None)

    # one flat material, coloured in main.js
    g['materials'] = [{'name': 'flat', 'pbrMetallicRoughness': {
        'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 1}}]
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            pr['material'] = 0
    for k in ('images', 'textures', 'samplers'):
        g.pop(k, None)
    if 'extensionsUsed' in g:
        g['extensionsUsed'] = [e for e in g['extensionsUsed'] if 'texture' not in e.lower()]

    # ---- downcast indices where the vertex count allows ---------------
    CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
          5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
    extra = bytearray()          # new bufferViews appended after the kept ones
    newviews = []
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            if 'indices' not in pr:
                continue
            ai = pr['indices']; a = g['accessors'][ai]
            if a['componentType'] != 5125:
                continue
            pi = pr['attributes'].get('POSITION')
            if pi is None or g['accessors'][pi]['count'] > 65535:
                continue
            bv = g['bufferViews'][a['bufferView']]
            base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
            buf = buffers[bv.get('buffer', 0)]
            idx = struct.unpack_from('<' + 'I' * a['count'], buf, base)
            packed = struct.pack('<' + 'H' * len(idx), *idx)
            while len(extra) % 4: extra.append(0)
            newviews.append({'off': len(extra), 'len': len(packed), 'acc': ai})
            extra.extend(packed)
            a['componentType'] = 5123
            a['byteOffset'] = 0
            a['_newview'] = len(newviews) - 1

    # ---- keep only the views something still reaches -------------------
    reach = set()
    accUsed = set()
    def touch(ai):
        if ai is None: return
        accUsed.add(ai)
        a = g['accessors'][ai]
        if '_newview' in a: return                # served from `extra`
        if 'bufferView' in a: reach.add(a['bufferView'])
        if 'sparse' in a:
            reach.add(a['sparse']['indices']['bufferView'])
            reach.add(a['sparse']['values']['bufferView'])
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            for ai in pr.get('attributes', {}).values(): touch(ai)
            touch(pr.get('indices'))
            for t in pr.get('targets', []) or []:
                for ai in t.values(): touch(ai)
    for an in g.get('animations', []):
        for smp in an['samplers']:
            touch(smp['input']); touch(smp['output'])
    for sk in g.get('skins', []):
        touch(sk.get('inverseBindMatrices'))
    keep = sorted(reach)
    remap = {old: i for i, old in enumerate(keep)}
    blob = bytearray()
    views = []
    for old in keep:
        bv = g['bufferViews'][old]
        data = buffers[bv.get('buffer', 0)][bv.get('byteOffset', 0):
                                           bv.get('byteOffset', 0) + bv['byteLength']]
        while len(blob) % 4:
            blob.append(0)
        nv = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)}
        if 'byteStride' in bv: nv['byteStride'] = bv['byteStride']
        if 'target' in bv: nv['target'] = bv['target']
        views.append(nv)
        blob.extend(data)
    # append the re-packed index buffers
    base_extra = len(blob)
    while len(blob) % 4: blob.append(0)
    base_extra = len(blob)
    blob.extend(extra)
    for nv in newviews:
        views.append({'buffer': 0, 'byteOffset': base_extra + nv['off'],
                      'byteLength': nv['len'], 'target': 34963})
    # drop accessors nothing reaches, and renumber every reference to them
    accKeep = sorted(accUsed)
    accMap = {old: i for i, old in enumerate(accKeep)}
    g['accessors'] = [g['accessors'][i] for i in accKeep]
    for m in g.get('meshes', []):
        for pr in m.get('primitives', []):
            pr['attributes'] = {k: accMap[v] for k, v in pr['attributes'].items()}
            if 'indices' in pr: pr['indices'] = accMap[pr['indices']]
            if pr.get('targets'):
                pr['targets'] = [{k: accMap[v] for k, v in t.items()} for t in pr['targets']]
    for an in g.get('animations', []):
        for smp in an['samplers']:
            smp['input'] = accMap[smp['input']]; smp['output'] = accMap[smp['output']]
    for sk in g.get('skins', []):
        if 'inverseBindMatrices' in sk:
            sk['inverseBindMatrices'] = accMap[sk['inverseBindMatrices']]

    g['bufferViews'] = views
    for a in g.get('accessors', []):
        if '_newview' in a:
            a['bufferView'] = len(keep) + a.pop('_newview')
            continue
        if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
        if 'sparse' in a:
            a['sparse']['indices']['bufferView'] = remap[a['sparse']['indices']['bufferView']]
            a['sparse']['values']['bufferView'] = remap[a['sparse']['values']['bufferView']]
    g['buffers'] = [{'byteLength': len(blob)}]

    # pack as .glb
    js = json.dumps(g, separators=(',', ':')).encode('utf-8')
    while len(js) % 4: js += b' '
    while len(blob) % 4: blob.append(0)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob))
    out += struct.pack('<II', len(js), 0x4E4F534A) + js
    out += struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
    open(dst, 'wb').write(out)
    print(f'{dst}: {len(out)/1024:.0f} KB  (json {len(js)/1024:.0f} KB, bin {len(blob)/1024:.0f} KB)')
    print(f'  animations={len(g.get("animations",[]))} skins={len(g.get("skins",[]))} nodes={len(g.get("nodes",[]))}')

main()
