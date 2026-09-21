#!/usr/bin/env python3
"""Pack the owner's wooden-furniture set into one small .glb.

    python3 tools/furniture_pack.py assets/furniture.glb

Eighteen pieces — three tables, five chairs, five benches, five barrels —
delivered as an OBJ and a 590 MB folder of 4K PBR maps. What comes out is
one file with a NAMED NODE PER PIECE, so the wreck can ask for `bench_2` by
name and stand it where it wants it.

Four things it does, and each is a rule this repo has already paid for:

  * IT READS THE DELIVERED ARCHIVES, not an extraction somebody left in a
    scratchpad — `undercroft_pack.py` could not be re-run for a whole
    session because of that. The rars are unpacked beside this script once
    and reused after.
  * EVERY PIECE IS CENTRED ON ITSELF with its feet at y = 0. The bunker's
    tripod camera paid for this: a piece measured about the SET's origin
    draws correctly while it is a child of the group it came from and is
    wrong the instant anything moves it, because a mesh is turned and
    dropped about its own position.
  * THE DIRTY SET, NOT THE CLEAN ONE. These ship Clean / Dirt / (for the
    barrel) Dirt_and_Rast variants. Nothing on that boat has been clean
    since 1963.
  * AND THE MAPS COME DOWN AT SOURCE. 2K, resized here: colour to --tex,
    the normal and the roughness to half that, because relief and gloss are
    low-frequency and this game renders at 0.42 of the screen. A metallic
    map is DROPPED — METALNESS IS A TRAP here for the ninth time, there is
    no environment map in this game and a metal has no diffuse term.
"""
import argparse, io, json, os, struct, subprocess

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# material in the OBJ -> (piece prefix, texture folder, variant)
SETS = {
    'bunk_bed':     ('bunk',   None,     None),
    'Clean_wood':   ('chair',  'Chair',  'Dirt'),
    'Material.003': ('barrel', 'Barrel', 'Dirt_and_Rast'),
    'Material.005': ('bench',  'Bench',  'Dirt'),
    'Material.006': ('table',  'Table',  'Dirt'),
}


def unpack(src, work):
    """bsdtar reads RAR v5 and ships with macOS; nothing else here does."""
    obj = os.path.join(work, 'Wooden_assets.obj')
    if not os.path.exists(obj):
        os.makedirs(work, exist_ok=True)
        subprocess.check_call(['bsdtar', '-xf', os.path.join(src, 'OBJ_Wooden_assets.rar')], cwd=work)
    if not os.path.isdir(os.path.join(work, 'Table')):
        subprocess.check_call(['bsdtar', '-xf', os.path.join(src, 'Textures_wooden_asset.rar')], cwd=work)
    bunk_dir = os.path.join(work, 'bunk_bed')
    bunk = os.path.join(bunk_dir, 'scene.gltf')
    if not os.path.exists(bunk):
        os.makedirs(bunk_dir, exist_ok=True)
        subprocess.check_call(['bsdtar', '-xf', os.path.join(src, 'bunk_bed.zip')], cwd=bunk_dir)
    return obj, bunk


CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
      5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def mat_mul(a, b):
    return [sum(a[k * 4 + r] * b[c * 4 + k] for k in range(4)) for c in range(4) for r in range(4)]


def node_matrix(n):
    if 'matrix' in n:
        return list(n['matrix'])
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); sc = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    return [(1-2*(y*y+z*z))*sc[0], (2*(x*y+z*w))*sc[0], (2*(x*z-y*w))*sc[0], 0,
            (2*(x*y-z*w))*sc[1], (1-2*(x*x+z*z))*sc[1], (2*(y*z+x*w))*sc[1], 0,
            (2*(x*z+y*w))*sc[2], (2*(y*z-x*w))*sc[2], (1-2*(x*x+y*y))*sc[2], 0,
            t[0], t[1], t[2], 1]


def load_gltf_piece(path, name):
    """The bunk bed arrives as its own Sketchfab .gltf, and it belongs in
    the same file as the rest of the set: one asset for one room, not two
    downloads for one cabin. Read as ONE piece, in the same shape `load_obj`
    hands back, with the node chain baked — a Sketchfab root carries the
    Y-up turn as a matrix and a mesh read without it lies on its side."""
    g = json.load(open(path))
    bin_path = os.path.join(os.path.dirname(path), g['buffers'][0]['uri'])
    buf = open(bin_path, 'rb').read()

    def acc(i):
        a = g['accessors'][i]
        fmt, size = CT[a['componentType']]; n = NC[a['type']]
        bv = g['bufferViews'][a['bufferView']]
        stride = bv.get('byteStride') or size * n
        base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        return [struct.unpack_from('<' + fmt * n, buf, base + k * stride) for k in range(a['count'])]

    out = {'name': name, 'mat': name, 'verts': [], 'tris': []}
    ident = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

    def walk(ni, parent):
        n = g['nodes'][ni]
        m = mat_mul(parent, node_matrix(n))
        if 'mesh' in n:
            for pr in g['meshes'][n['mesh']]['primitives']:
                P = acc(pr['attributes']['POSITION'])
                N = acc(pr['attributes']['NORMAL']) if 'NORMAL' in pr['attributes'] else [(0., 1., 0.)] * len(P)
                T = acc(pr['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in pr['attributes'] else [(0., 0.)] * len(P)
                off = len(out['verts'])
                for k in range(len(P)):
                    x, y, z = P[k]
                    out['verts'].append((
                        (m[0]*x + m[4]*y + m[8]*z + m[12], m[1]*x + m[5]*y + m[9]*z + m[13],
                         m[2]*x + m[6]*y + m[10]*z + m[14]),
                        (m[0]*N[k][0] + m[4]*N[k][1] + m[8]*N[k][2],
                         m[1]*N[k][0] + m[5]*N[k][1] + m[9]*N[k][2],
                         m[2]*N[k][0] + m[6]*N[k][1] + m[10]*N[k][2]),
                        # glTF v is already top-down; load_obj flips, so pre-flip
                        (T[k][0], 1.0 - T[k][1])))
                idx = [v[0] for v in acc(pr['indices'])]
                for t in range(0, len(idx) - 2, 3):
                    out['tris'].append((idx[t] + off, idx[t + 1] + off, idx[t + 2] + off))
        for c in n.get('children', []):
            walk(c, m)
    for ni in g['scenes'][g.get('scene', 0)]['nodes']:
        walk(ni, ident)
    return out


def load_obj(path):
    """-> [(name, material, [(p, n, uv), ...] verts, [tri, ...])]"""
    V, N, T = [], [], []
    objs, cur = [], None
    for line in open(path, 'r', errors='ignore'):
        k, _, rest = line.partition(' ')
        if k == 'v':
            V.append(tuple(float(x) for x in rest.split()[:3]))
        elif k == 'vn':
            N.append(tuple(float(x) for x in rest.split()[:3]))
        elif k == 'vt':
            T.append(tuple(float(x) for x in rest.split()[:2]))
        elif k == 'o':
            cur = {'name': rest.strip(), 'mat': None, 'vmap': {}, 'verts': [], 'tris': []}
            objs.append(cur)
        elif k == 'usemtl':
            if cur is not None:
                cur['mat'] = rest.strip()
        elif k == 'f' and cur is not None:
            idx = []
            for tok in rest.split():
                key = tok
                j = cur['vmap'].get(key)
                if j is None:
                    a = (tok.split('/') + ['', ''])[:3]
                    vi = int(a[0]); vi = vi - 1 if vi > 0 else len(V) + vi
                    ti = int(a[1]) - 1 if a[1] else -1
                    ni = int(a[2]) - 1 if a[2] else -1
                    j = cur['vmap'][key] = len(cur['verts'])
                    cur['verts'].append((V[vi],
                                         N[ni] if 0 <= ni < len(N) else (0.0, 1.0, 0.0),
                                         T[ti] if 0 <= ti < len(T) else (0.0, 0.0)))
                idx.append(j)
            for m in range(1, len(idx) - 1):       # fan-triangulate the quads
                cur['tris'].append((idx[0], idx[m], idx[m + 1]))
    return objs


def tex_bytes(path, size, quality, grey=False):
    im = Image.open(path)
    im = im.convert('L' if grey else 'RGB')
    if max(im.size) > size:
        im = im.resize((size, size), Image.LANCZOS)
    b = io.BytesIO()
    im.convert('RGB').save(b, 'JPEG', quality=quality, optimize=True)
    return b.getvalue()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dst', nargs='?', default=os.path.join(ROOT, 'assets/furniture.glb'))
    ap.add_argument('--src', default=os.path.expanduser('~/Desktop/FURNITURE'))
    ap.add_argument('--work', default=os.path.join(HERE, '.furniture'))
    ap.add_argument('--tex', type=int, default=1024)
    ap.add_argument('--quality', type=int, default=86)
    a = ap.parse_args()

    obj_path, bunk_path = unpack(a.src, a.work)
    objs = load_obj(obj_path)
    objs.append(load_gltf_piece(bunk_path, 'bunk_bed'))
    print('read %d pieces' % len(objs))

    # ---- one material per set, and one image per map --------------------
    images, samplers, textures, materials, mat_index = [], [{}], [], [], {}
    blobs = []
    for mat, (prefix, folder, variant) in SETS.items():
        if folder is None:                       # the bunk bed, loose beside its gltf
            d = os.path.join(a.work, 'bunk_bed', 'textures')
        else:
            d = os.path.join(a.work, folder, 'Textures', '2K', variant)
        files = {f.lower(): os.path.join(d, f) for f in os.listdir(d)}
        pick = lambda key: next((p for k, p in files.items() if key in k), None)
        pbr = {'metallicFactor': 0.0, 'roughnessFactor': 1.0}
        m = {'name': prefix, 'pbrMetallicRoughness': pbr}

        def add_image(path, size, grey=False):
            blobs.append(tex_bytes(path, size, a.quality, grey))
            images.append({'bufferView': -1 - len(blobs), 'mimeType': 'image/jpeg'})
            textures.append({'sampler': 0, 'source': len(images) - 1})
            print('  %-8s %-10s %4dpx  %6.1f KB' % (prefix, os.path.basename(path).split('_')[-1],
                                                    size, len(blobs[-1]) / 1024))
            return len(textures) - 1

        alb = pick('albedo') or pick('basecolor')
        if alb: pbr['baseColorTexture'] = {'index': add_image(alb, a.tex)}
        nrm = pick('normal')
        if nrm: m['normalTexture'] = {'index': add_image(nrm, a.tex // 2)}
        # glTF wants roughness in G. The source is a single-channel map, so
        # it goes in as grey and G reads the same value the artist painted.
        rgh = pick('roughness')
        if rgh: pbr['metallicRoughnessTexture'] = {'index': add_image(rgh, a.tex // 2, True)}
        mat_index[mat] = len(materials)
        materials.append(m)

    # ---- geometry: one mesh per piece, centred on itself -----------------
    bin_parts, views, accs, meshes, nodes = [], [], [], [], []

    def view(data, target=None):
        while len(data) % 4: data += b'\0'
        off = sum(len(p) for p in bin_parts)
        bin_parts.append(data)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target: v['target'] = target
        views.append(v)
        return len(views) - 1

    for o in objs:
        if not o['tris']:
            continue
        P = [v[0] for v in o['verts']]
        # ITS OWN FRAME: centred in plan, feet on y = 0
        cx = (min(p[0] for p in P) + max(p[0] for p in P)) / 2
        cz = (min(p[2] for p in P) + max(p[2] for p in P)) / 2
        y0 = min(p[1] for p in P)
        P = [(p[0] - cx, p[1] - y0, p[2] - cz) for p in P]
        N = [v[1] for v in o['verts']]
        T = [v[2] for v in o['verts']]

        pv = view(b''.join(struct.pack('<fff', *p) for p in P), 34962)
        nv = view(b''.join(struct.pack('<fff', *n) for n in N), 34962)
        # OBJ v is bottom-up, glTF is top-down
        tv = view(b''.join(struct.pack('<ff', t[0], 1.0 - t[1]) for t in T), 34962)
        wide = len(P) > 65535
        iv = view(b''.join(struct.pack('<III' if wide else '<HHH', *t) for t in o['tris']), 34963)

        base = len(accs)
        accs.append({'bufferView': pv, 'componentType': 5126, 'count': len(P), 'type': 'VEC3',
                     'min': [min(p[k] for p in P) for k in range(3)],
                     'max': [max(p[k] for p in P) for k in range(3)]})
        accs.append({'bufferView': nv, 'componentType': 5126, 'count': len(N), 'type': 'VEC3'})
        accs.append({'bufferView': tv, 'componentType': 5126, 'count': len(T), 'type': 'VEC2'})
        accs.append({'bufferView': iv, 'componentType': 5125 if wide else 5123,
                     'count': len(o['tris']) * 3, 'type': 'SCALAR'})
        # "table_3_Plane.016" -> "table_3", "bench_5.001_Plane.011" -> "bench_5"
        name = '_'.join(o['name'].split('_')[:2]).split('.')[0]
        meshes.append({'name': name, 'primitives': [{
            'attributes': {'POSITION': base, 'NORMAL': base + 1, 'TEXCOORD_0': base + 2},
            'indices': base + 3, 'material': mat_index[o['mat']]}]})
        nodes.append({'name': name, 'mesh': len(meshes) - 1})
        print('  %-9s %5d tris  %s' % (name, len(o['tris']),
                                       ' x '.join('%.3f' % (max(p[k] for p in P) - min(p[k] for p in P))
                                                  for k in range(3))))

    # images last, so their bufferViews come after the geometry
    for i, im in enumerate(images):
        im['bufferView'] = view(blobs[i])

    g = {'asset': {'version': '2.0', 'generator': 'furniture_pack.py'},
         'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}],
         'nodes': nodes, 'meshes': meshes, 'accessors': accs, 'bufferViews': views,
         'materials': materials, 'textures': textures, 'images': images,
         'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
         'buffers': [{'byteLength': sum(len(p) for p in bin_parts)}]}

    blob = b''.join(bin_parts)
    js = json.dumps(g, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    out = (struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob))
           + struct.pack('<II', len(js), 0x4E4F534A) + js
           + struct.pack('<II', len(blob), 0x004E4942) + blob)
    open(a.dst, 'wb').write(out)
    print('%s: %.2f MB  (json %d KB, bin %.2f MB)'
          % (a.dst, len(out) / 1e6, len(js) / 1024, len(blob) / 1e6))


if __name__ == '__main__':
    main()
