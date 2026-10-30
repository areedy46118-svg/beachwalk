#!/usr/bin/env python3
"""The crying heads at the back of the whale's gut (2026-10-30, the owner: "make this creature jump like a head crab
through the air"): CommunicationNode's "Crying head" (Sketchfab, CC-BY-SA-4.0) into assets/crying-head.glb.

    python3 -I tools/crying_head_pack.py [srcdir]       (srcdir: a COPY of ~/Downloads/crying_head, in a folder of its own)

A plain glTF rewrite, no Blender: json + struct, the maps through macOS `sips`.

WHAT THE SOURCE IS: scene.gltf + scene.bin (0.7 MB) + nine PNG maps (41 MB). One skinned mesh, 4,881 verts, on 71 joints
(`HeadBase`, `Jaw`, the eyelids and the eye ropes, six long finger-legs a side `H_left.000..019` / `H_right...` in chains
of five, and six IK chains), under Sketchfab's node chain (the mesh is in centimetres under a 100x node). A display disc
(`Floor`) under it. Two clips, both IN PLACE (HeadBase's translation starts and ends on the same key): IDLE (3.58 s) and
MOVE (0.79 s).

WHAT IS DONE TO IT:
  * THE FLOOR GOES: its two nodes, its mesh, its material and its four maps.
  * THE MATERIAL IS PLAIN: KHR_materials_clearcoat and KHR_materials_specular are stripped (three promotes a material to
    MeshPhysicalMaterial for them, and there is no environment map), KHR_texture_transform off the normal map (its scale
    is 1.0000117), metalness 0 (METALNESS IS A TRAP), the metal/rough map dropped for a roughness factor.
  * MAPS: base colour 1024 JPEG; the normal map 1024 JPEG while it is under NORMAL_MAX_KB, else 512.
  * NO TANGENTS (three derives them for the normal map; 78 kB).
  * NAMES: Sketchfab's `_0NN` uniqueness suffix is stripped and '.' made '_' (three's PropertyBinding strips '.').
  * Every accessor kept is copied into a tight buffer view of its own; the node chain is left as it is (the game
    measures the head when it loads and scales it there).
"""
import os, sys, json, struct, re, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/crying_head')
OUT = os.path.join(ROOT, 'assets/crying-head.glb')
NORMAL_MAX_KB = 420
CT = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def log(*a):
    print('[crying-head]', *a, flush=True)


def jpeg(src, size, q):
    fd, dst = tempfile.mkstemp(suffix='.jpg'); os.close(fd)
    subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', str(q), '-z', str(size), str(size), src, '--out', dst],
                   check=True, capture_output=True)
    data = open(dst, 'rb').read(); os.remove(dst)
    return data


def main():
    g = json.load(open(os.path.join(SRC, 'scene.gltf')))
    binr = open(os.path.join(SRC, g['buffers'][0]['uri']), 'rb').read()
    # ---- the floor out: its nodes (and the parent that only holds it), its mesh
    floor_mesh = next(i for i, m in enumerate(g['meshes']) if m['name'].endswith('_Floor_0'))
    drop = {i for i, n in enumerate(g['nodes']) if n.get('mesh') == floor_mesh}
    drop |= {i for i, n in enumerate(g['nodes']) if n.get('children') and set(n['children']) <= drop}
    keep = [i for i in range(len(g['nodes'])) if i not in drop]
    nmap = {o: k for k, o in enumerate(keep)}
    nodes = []
    seen = set()
    for o in keep:
        n = dict(g['nodes'][o])
        if 'children' in n:
            n['children'] = [nmap[c] for c in n['children'] if c in nmap]
            if not n['children']:
                del n['children']
        nm = re.sub(r'_\d+$', '', n.get('name', 'n%d' % o)).replace('.', '_').replace(':', '_')
        if not re.match(r'^[\x20-\x7e]+$', nm):
            nm = 'node%d' % o
        while nm in seen:
            nm += '_'
        seen.add(nm); n['name'] = nm
        nodes.append(n)
    log('nodes %d -> %d (dropped %s)' % (len(g['nodes']), len(nodes), sorted(drop)))
    skins = []
    for s in g['skins']:
        s = dict(s); s['joints'] = [nmap[j] for j in s['joints']]
        if 'skeleton' in s: s['skeleton'] = nmap[s['skeleton']]
        skins.append(s)
    # ---- the accessors in use, each into a tight view of its own
    out = bytearray(); views = []; accs = []; amap = {}

    def put(data, target=None):
        while len(out) % 4: out.append(0)
        v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
        if target: v['target'] = target
        out.extend(data); views.append(v)
        return len(views) - 1

    def acc(i, target=None):
        if i in amap: return amap[i]
        a = dict(g['accessors'][i]); v = g['bufferViews'][a['bufferView']]
        es = CT[a['componentType']] * NC[a['type']]
        st = v.get('byteStride', es); o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        data = b''.join(binr[o + k * st: o + k * st + es] for k in range(a['count'])) if st != es else binr[o: o + es * a['count']]
        a['bufferView'] = put(data, target); a.pop('byteOffset', None)
        accs.append(a); amap[i] = len(accs) - 1
        return amap[i]
    mesh = dict(g['meshes'][[i for i in range(len(g['meshes'])) if i != floor_mesh][0]])
    prims = []
    for p in mesh['primitives']:
        p = dict(p)
        p['attributes'] = {k: acc(v, 34962) for k, v in p['attributes'].items() if k != 'TANGENT'}
        if 'indices' in p: p['indices'] = acc(p['indices'], 34963)
        p['material'] = 0
        prims.append(p)
    mesh['primitives'] = prims; mesh['name'] = 'crying_head'
    for n in nodes:
        if 'mesh' in n: n['mesh'] = 0
        if 'skin' in n: n['skin'] = 0
    for s in skins:
        if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = acc(s['inverseBindMatrices'])
    anims = []
    for an in g['animations']:
        an = dict(an)
        an['samplers'] = [dict(s, input=acc(s['input']), output=acc(s['output'])) for s in an['samplers']]
        an['channels'] = [dict(c, target=dict(c['target'], node=nmap[c['target']['node']])) for c in an['channels'] if c['target']['node'] in nmap]
        anims.append(an)
    log('clips %s' % ', '.join('%s %d ch' % (a['name'], len(a['channels'])) for a in anims))
    # ---- the maps
    T = os.path.join(SRC, 'textures')
    base = jpeg(os.path.join(T, 'CHmaterial_baseColor.png'), 1024, 82)
    for size in (1024, 512):
        nrm = jpeg(os.path.join(T, 'CHmaterial_normal.png'), size, 85)
        if len(nrm) <= NORMAL_MAX_KB * 1024: break
    log('base colour 1024 %.0f kB, normal %d %.0f kB' % (len(base) / 1024, size, len(nrm) / 1024))
    images = [{'bufferView': put(base), 'mimeType': 'image/jpeg', 'name': 'ch_base'},
              {'bufferView': put(nrm), 'mimeType': 'image/jpeg', 'name': 'ch_normal'}]
    m0 = g['materials'][0]
    mat = {'name': 'CHmaterial', 'doubleSided': bool(m0.get('doubleSided', False)),
           'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.0, 'roughnessFactor': 0.55},
           'normalTexture': {'index': 1}}
    while len(out) % 4: out.append(0)
    G = {'asset': {'version': '2.0', 'generator': 'beachwalk tools/crying_head_pack.py',
                   'copyright': '"Crying head" by CommunicationNode (sketchfab.com/Starven38), CC-BY-SA-4.0; modified'},
         'scene': 0, 'scenes': [{'name': 'crying_head', 'nodes': [nmap[n] for n in g['scenes'][0]['nodes']]}],
         'nodes': nodes, 'meshes': [mesh], 'skins': skins, 'animations': anims, 'materials': [mat],
         'textures': [{'sampler': 0, 'source': 0}, {'sampler': 0, 'source': 1}], 'images': images,
         'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
         'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(out)}]}
    js = json.dumps(G, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
    open(OUT, 'wb').write(glb)
    log('%s: %.2f MB (%d verts, %d joints, %d accessors)' % (os.path.relpath(OUT, ROOT), len(glb) / 1e6,
        g['accessors'][g['meshes'][0]['primitives'][0]['attributes']['POSITION']]['count'], len(skins[0]['joints']), len(accs)))


if __name__ == '__main__':
    main()
