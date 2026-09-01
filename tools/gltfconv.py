#!/usr/bin/env python3
"""Bake a .gltf (+ .bin) into the game's compact mesh blob.

    python3 tools/gltfconv.py scene.gltf out.bwmesh --meshes 0-9 --cell 0.9 --height 2.4

Written for photogrammetry scans, which arrive far too dense for this game —
so it also decimates by vertex clustering: snap every vertex to a grid cell,
keep one representative per cell, drop the triangles that collapse. Crude
next to a proper edge-collapse, but it is fast, needs nothing installed, and
holds the silhouette, which is all a background prop needs.

Writes the same BWMESH01 format tools/objconv.py does, so main.js loadMesh()
reads it unchanged.
"""
import argparse, base64, json, os, struct, sys

CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
      5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read_accessor(g, buffers, i):
    a = g['accessors'][i]
    bv = g['bufferViews'][a['bufferView']]
    buf = buffers[bv.get('buffer', 0)]
    fmt, size = CT[a['componentType']]
    n = NC[a['type']]
    stride = bv.get('byteStride') or size * n
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    out = []
    for k in range(a['count']):
        off = base + k * stride
        out.append(struct.unpack_from('<' + fmt * n, buf, off))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--meshes', default='', help='e.g. 0-9 or 0,3,7 (default: all)')
    ap.add_argument('--cell', type=float, default=0.0, help='decimation grid, in source units')
    ap.add_argument('--height', type=float, default=0.0, help='scale so the result is this tall (Y)')
    ap.add_argument('--yup', action='store_true', help='source is Z-up')
    args = ap.parse_args()

    g = json.load(open(args.src))
    root = os.path.dirname(os.path.abspath(args.src))
    buffers = []
    for b in g['buffers']:
        uri = b.get('uri', '')
        if uri.startswith('data:'):
            buffers.append(base64.b64decode(uri.split(',', 1)[1]))
        else:
            buffers.append(open(os.path.join(root, uri), 'rb').read())

    want = None
    if args.meshes:
        want = set()
        for part in args.meshes.split(','):
            if '-' in part:
                a, b = part.split('-'); want.update(range(int(a), int(b) + 1))
            else:
                want.add(int(part))

    verts, tris = [], []
    for mi, m in enumerate(g['meshes']):
        if want is not None and mi not in want:
            continue
        for pr in m['primitives']:
            pi = pr['attributes'].get('POSITION')
            if pi is None:
                continue
            base = len(verts)
            verts.extend([tuple(v) for v in read_accessor(g, buffers, pi)])
            if 'indices' in pr:
                idx = [v[0] for v in read_accessor(g, buffers, pr['indices'])]
                for k in range(0, len(idx) - 2, 3):
                    tris.append((base + idx[k], base + idx[k + 1], base + idx[k + 2]))
            else:
                for k in range(base, len(verts) - 2, 3):
                    tris.append((k, k + 1, k + 2))
    if not verts:
        sys.exit('no geometry selected')
    print(f'read {len(verts)} verts, {len(tris)} tris')

    # --- decimate by vertex clustering -------------------------------
    if args.cell > 0:
        cell = args.cell
        rep, remap = {}, [0] * len(verts)
        newv = []
        for i, p in enumerate(verts):
            key = (round(p[0] / cell), round(p[1] / cell), round(p[2] / cell))
            j = rep.get(key)
            if j is None:
                j = len(newv); rep[key] = j; newv.append([p[0], p[1], p[2], 1])
            else:
                c = newv[j]
                c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; c[3] += 1
            remap[i] = j
        verts = [(c[0] / c[3], c[1] / c[3], c[2] / c[3]) for c in newv]
        seen = set(); newt = []
        for a, b, c in tris:
            a, b, c = remap[a], remap[b], remap[c]
            if a == b or b == c or a == c:
                continue                      # collapsed to a sliver
            k = tuple(sorted((a, b, c)))
            if k in seen:
                continue                      # duplicate face
            seen.add(k); newt.append((a, b, c))
        tris = newt
        print(f'decimated to {len(verts)} verts, {len(tris)} tris')

    # --- orient, centre, scale ---------------------------------------
    pts = []
    for x, y, z in verts:
        pts.append((x, z, -y) if args.yup else (x, y, z))
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; zs = [p[2] for p in pts]
    cx = (min(xs) + max(xs)) / 2; cz = (min(zs) + max(zs)) / 2; ymin = min(ys)
    scale = args.height / max(1e-6, (max(ys) - ymin)) if args.height > 0 else 1.0
    pts = [((p[0] - cx) * scale, (p[1] - ymin) * scale, (p[2] - cz) * scale) for p in pts]

    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; zs = [p[2] for p in pts]
    bmin = (min(xs), min(ys), min(zs)); bmax = (max(xs), max(ys), max(zs))
    ext = [max(1e-6, bmax[i] - bmin[i]) for i in range(3)]
    qs = [ext[i] / 65534.0 for i in range(3)]

    wide = len(pts) > 65535
    with open(args.dst, 'wb') as f:
        f.write(b'BWMESH01')
        f.write(struct.pack('<II', len(pts), len(tris)))
        f.write(struct.pack('<3f', *qs))
        f.write(struct.pack('<3f', *bmin))
        buf = bytearray()
        for p in pts:
            for i in range(3):
                q = int(round((p[i] - bmin[i]) / qs[i])) - 32767
                buf += struct.pack('<h', max(-32768, min(32767, q)))
        f.write(buf)
        fmt = '<I' if wide else '<H'
        buf = bytearray()
        for t in tris:
            for i in t:
                buf += struct.pack(fmt, i)
        f.write(buf)
    print(f'{args.dst}: {len(pts)} verts, {len(tris)} tris, {"u32" if wide else "u16"} indices')
    print(f'  bounds x {bmin[0]:.2f}..{bmax[0]:.2f}  y {bmin[1]:.2f}..{bmax[1]:.2f}  z {bmin[2]:.2f}..{bmax[2]:.2f}')


if __name__ == '__main__':
    main()
