#!/usr/bin/env python3
"""Turn a dense photogrammetry glTF into a small pack of separate props.

    python3 tools/gltfrocks.py incoming/beach_rock/scene.gltf assets/rock-a.json \
        --target 700 --prefix rocka --min-tris 60

Sketchfab scans arrive as one object sliced into 65k-vertex chunks — the
"Object_0..74" you see in the file are not separate rocks, they are pieces of
the same surface. So this merges everything back together first, decimates by
vertex clustering (keeping UVs, which is the whole point: the baked albedo is
what makes a scan look like a scan), and only then splits the result into
connected components, which is where the individual rocks actually fall out.

Writes the same JSON tools/gltfgeo.py does, so main.js loadGeoPack() reads it
with no changes.
"""
import argparse, base64, json, os, struct, sys

CT = {5120: ('b',1), 5121: ('B',1), 5122: ('h',2), 5123: ('H',2), 5125: ('I',4), 5126: ('f',4)}
NC = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}


def read(g, bufs, i):
    a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
    fmt, size = CT[a['componentType']]; n = NC[a['type']]
    stride = bv.get('byteStride') or size * n
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + fmt * n, bufs[bv.get('buffer', 0)], base + k * stride)
            for k in range(a['count'])]


def mat_mul(a, b):
    return [sum(a[k * 4 + r] * b[c * 4 + k] for k in range(4)) for c in range(4) for r in range(4)]


def node_matrix(n):
    if 'matrix' in n:
        return list(n['matrix'])
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    m = [(1-2*(y*y+z*z))*s[0], (2*(x*y+z*w))*s[0], (2*(x*z-y*w))*s[0], 0,
         (2*(x*y-z*w))*s[1], (1-2*(x*x+z*z))*s[1], (2*(y*z+x*w))*s[1], 0,
         (2*(x*z+y*w))*s[2], (2*(y*z-x*w))*s[2], (1-2*(x*x+y*y))*s[2], 0,
         t[0], t[1], t[2], 1]
    return m


def apply(m, p):
    x, y, z = p[0], p[1], p[2]
    return (m[0]*x + m[4]*y + m[8]*z + m[12],
            m[1]*x + m[5]*y + m[9]*z + m[13],
            m[2]*x + m[6]*y + m[10]*z + m[14])


def gather(g, bufs, only_mat=None):
    """every primitive in the scene, in world space"""
    P, U, I = [], [], []
    def walk(ni, parent):
        n = g['nodes'][ni]
        m = mat_mul(parent, node_matrix(n))
        if 'mesh' in n:
            for pr in g['meshes'][n['mesh']]['primitives']:
                # One scan can be baked across several atlases, and the UVs of
                # each only make sense against their own. Merging both would
                # texture half the prop from the wrong image, so take one.
                if only_mat is not None and pr.get('material') != only_mat:
                    continue
                pos = read(g, bufs, pr['attributes']['POSITION'])
                uv = read(g, bufs, pr['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in pr['attributes'] else None
                idx = [v[0] for v in read(g, bufs, pr['indices'])] if 'indices' in pr else list(range(len(pos)))
                off = len(P)
                P.extend(apply(m, p) for p in pos)
                U.extend(uv if uv else [(0.0, 0.0)] * len(pos))
                I.extend(v + off for v in idx)
        for c in n.get('children', []):
            walk(c, m)
    ident = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
    for ni in g['scenes'][g.get('scene', 0)]['nodes']:
        walk(ni, ident)
    return P, U, I


def cluster(P, U, I, cell):
    """snap to a grid, average each cell, drop collapsed triangles"""
    rep, acc = {}, []
    remap = [0] * len(P)
    for vi, p in enumerate(P):
        key = (round(p[0]/cell), round(p[1]/cell), round(p[2]/cell))
        j = rep.get(key)
        if j is None:
            j = rep[key] = len(acc)
            acc.append([0.0, 0.0, 0.0, 0.0, 0.0, 0])
        a = acc[j]
        a[0] += p[0]; a[1] += p[1]; a[2] += p[2]
        a[3] += U[vi][0]; a[4] += U[vi][1]; a[5] += 1
        remap[vi] = j
    pos = [(a[0]/a[5], a[1]/a[5], a[2]/a[5]) for a in acc]
    uv = [(a[3]/a[5], a[4]/a[5]) for a in acc]
    tris, seen = [], set()
    for t in range(0, len(I) - 2, 3):
        a, b, c = remap[I[t]], remap[I[t+1]], remap[I[t+2]]
        if a == b or b == c or a == c:
            continue
        k = tuple(sorted((a, b, c)))
        if k in seen:
            continue
        seen.add(k)
        tris.append((a, b, c))
    return pos, uv, tris


def components(pos, tris):
    """union-find over shared vertices — this is where separate rocks appear"""
    par = list(range(len(pos)))
    def find(a):
        while par[a] != a:
            par[a] = par[par[a]]; a = par[a]
        return a
    def join(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: par[ra] = rb
    for a, b, c in tris:
        join(a, b); join(b, c)
    groups = {}
    for tri in tris:
        groups.setdefault(find(tri[0]), []).append(tri)
    return sorted(groups.values(), key=len, reverse=True)


ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--target', type=int, default=700, help='triangle budget for the whole scan')
ap.add_argument('--prefix', default='rock')
ap.add_argument('--min-tris', type=int, default=60)
ap.add_argument('--crop', type=float, default=0.25, help="how far up each bump to cut its own ground away")
ap.add_argument('--bumps', type=int, default=0, help='extract this many raised features instead of connected components')
ap.add_argument('--bump-radius', type=float, default=0.16, help='bump footprint, as a fraction of the patch width')
ap.add_argument('--max-parts', type=int, default=6)
ap.add_argument('--material', type=int, default=None, help='keep only primitives using this material index')
a = ap.parse_args()

root = os.path.dirname(os.path.abspath(a.src))
g = json.load(open(a.src))
bufs = []
for b in g['buffers']:
    u = b.get('uri', '')
    bufs.append(base64.b64decode(u.split(',', 1)[1]) if u.startswith('data:')
                else open(os.path.join(root, u), 'rb').read())

P, U, I = gather(g, bufs, a.material)
print('merged: %d verts, %d tris' % (len(P), len(I)//3))

ext = max(max(p[k] for p in P) - min(p[k] for p in P) for k in range(3))
lo, hi = ext / 400.0, ext / 3.0
for _ in range(26):                       # bisect the grid onto the budget
    cell = (lo + hi) / 2
    pos, uv, tris = cluster(P, U, I, cell)
    if len(tris) > a.target: lo = cell
    else: hi = cell
pos, uv, tris = cluster(P, U, I, hi)
print('decimated: %d tris at cell %.4f' % (len(tris), hi))

# A photogrammetry "rock" is almost always a patch of ground with rocks
# sitting in it. beach_rock is a 643 x 643 tile only 102 thick; normalising
# that by its largest dimension divides the rock by the width of the sand
# around it and you get a plate, which is exactly how the first pass looked.
#
# So the props are the *bumps*: find the highest point, take the ground around
# it out to a radius, cut away everything below its own local ground level,
# and that is one rock. Repeat away from what's already been claimed for the
# next one.
def extract_bumps(pos, tris, n_bumps, radius_frac):
    """N tight columns around the highest points. Keep every triangle whose
    centroid lands in the column and nothing else — the earlier version cut the
    underside off and then kept only the largest connected piece, and between
    them those two steps were what left the rocks with chunks missing. The scan
    is a heightfield with an open bottom regardless; the game beds it deep so
    its own ring of sand sits under the beach and closes the look."""
    xs = [p[0] for p in pos]; zs = [p[2] for p in pos]
    span = max(max(xs) - min(xs), max(zs) - min(zs))
    R = radius_frac * span
    ys = sorted(p[1] for p in pos)
    ground, peak = ys[len(ys) // 2], ys[-1]
    centers = []
    parts = []
    for _ in range(n_bumps):
        best, besty = -1, -1e30
        for vi, p in enumerate(pos):
            if p[1] <= besty:
                continue
            if any((p[0] - cx) ** 2 + (p[2] - cz) ** 2 < (R * 0.85) ** 2 for cx, cz in centers):
                continue
            best, besty = vi, p[1]
        if best < 0 or besty - ground < 0.15 * (peak - ground):
            break
        px, _, pz = pos[best]
        centers.append((px, pz))
        sub = []
        for t in tris:
            cx = (pos[t[0]][0] + pos[t[1]][0] + pos[t[2]][0]) / 3
            cz = (pos[t[0]][2] + pos[t[1]][2] + pos[t[2]][2]) / 3
            if (cx - px) ** 2 + (cz - pz) ** 2 < R * R:
                sub.append(t)
        if len(sub) >= a.min_tris:
            parts.append(sub)
    return parts

parts = (extract_bumps(pos, tris, a.bumps, a.bump_radius) if a.bumps
         else components(pos, tris)[:a.max_parts])

out = {}
for n, grp in enumerate(parts[:a.max_parts]):
    if len(grp) < a.min_tris:
        continue
    used = sorted({v for tri in grp for v in tri})
    ri = {v: k for k, v in enumerate(used)}
    pts = [pos[v] for v in used]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; zs = [p[2] for p in pts]
    cx = (min(xs)+max(xs))/2; cz = (min(zs)+max(zs))/2; y0 = min(ys)
    h = max(1e-6, max(max(ys)-y0, max(xs)-min(xs), max(zs)-min(zs)))
    out['%s%02d' % (a.prefix, n)] = {
        'p': [round(v, 4) for p in pts for v in ((p[0]-cx)/h, (p[1]-y0)/h, (p[2]-cz)/h)],
        'u': [round(v, 4) for v in (c for vv in used for c in uv[vv])],
        'i': [ri[v] for tri in grp for v in tri],
    }

json.dump(out, open(a.dst, 'w'), separators=(',', ':'))
tot = sum(len(v['i'])//3 for v in out.values())
print('%s: %d parts, %d tris, %d KB' % (a.dst, len(out), tot, os.path.getsize(a.dst)//1024))
for k, v in out.items():
    print('   %-10s %d tris' % (k, len(v['i'])//3))
