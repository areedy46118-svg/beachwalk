#!/usr/bin/env python3
"""Pack the two scans under the beach — Valsev's "Cave 5.0" and Aurélien
Martel's "Old church modeling - Interior Scene" (both Sketchfab, CC-BY-4.0)
— into `assets/cave.glb` and `assets/church.glb`, WITH THE WALK INSIDE THEM.

    python3 tools/undercroft_pack.py cave   ~/Downloads/cave_5/scene.gltf assets/cave.glb
    python3 tools/undercroft_pack.py church ~/Downloads/old_church_modeling_-_interior_scene/scene.gltf assets/church.glb

Pure Python (no Blender, no numpy): the same helpers `gltfpack.py` uses,
plus the four things these two need that it does not do:

  * EVERY NODE IS BAKED INTO WORLD SPACE, so the file that comes out is one
    flat list of meshes in metres, Y up, and the game places the whole thing
    with a translation and nothing else.
  * DECIMATION THAT KEEPS THE UVs. `gltfpack --decimate` merges everything
    into one untextured mesh, which is right for a raw scan and wrong for
    a textured one. Here each node's primitives are merged (the cave is 46
    CHUNKS of one surface — the splitter walks the triangle list, and a
    chunk decimated alone is a scatter of specks, so a chunked node is
    merged before it is clustered) and vertex-clustered to a budget with
    the representative vertex's uv carried across.
  * THE PEWS ARE ONE MESH AND COME OUT AS BENCHES. `Plane.001` is every pew
    in the church in three primitives. It is welded, flooded into islands,
    the islands grouped by footprint, and each group written as its own
    node `bench_N` with its box in the root's extras (`bw_benches`), so the
    game can make each one a breakable prop with the church's own wood.
  * THE WALK. Every triangle is sampled onto a 0.2 m grid and each cell
    works out its FLOOR — the lowest up-facing surface with head-room over
    it — and whether anything stands in the body band above that floor
    (`solid`). A second floor, `floor0`, is the same thing computed WITHOUT
    the benches, which is what a cell reverts to when its bench breaks.
    The door in the church's end wall is cut out of the grid here (and the
    door plane itself dropped), so the cave's grid can meet it. It all
    rides in the root node's extras as `bw_walk`.
"""
import argparse, base64, io, json, math, os, struct, sys

from PIL import Image

CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER = 34962, 34963


OPEN_SKY = False       # a roofless place: a floor needs nothing over it


def log(*a):
    print('[undercroft]', *a); sys.stdout.flush()


def mat_mul(a, b):
    return [sum(a[k * 4 + r] * b[c * 4 + k] for k in range(4)) for c in range(4) for r in range(4)]


def node_matrix(n):
    if 'matrix' in n:
        return list(n['matrix'])
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    return [(1-2*(y*y+z*z))*s[0], (2*(x*y+z*w))*s[0], (2*(x*z-y*w))*s[0], 0,
            (2*(x*y-z*w))*s[1], (1-2*(x*x+z*z))*s[1], (2*(y*z+x*w))*s[1], 0,
            (2*(x*z+y*w))*s[2], (2*(y*z-x*w))*s[2], (1-2*(x*x+y*y))*s[2], 0,
            t[0], t[1], t[2], 1]


def apply_m(m, p):
    x, y, z = p[0], p[1], p[2]
    return (m[0]*x + m[4]*y + m[8]*z + m[12],
            m[1]*x + m[5]*y + m[9]*z + m[13],
            m[2]*x + m[6]*y + m[10]*z + m[14])


def read_accessor(g, bufs, i):
    a = g['accessors'][i]
    fmt, size = CT[a['componentType']]
    n = NC[a['type']]
    if 'bufferView' not in a:
        return [(0,) * n] * a['count']
    bv = g['bufferViews'][a['bufferView']]
    buf = bufs[bv.get('buffer', 0)]
    stride = bv.get('byteStride') or size * n
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + fmt * n, buf, base + k * stride) for k in range(a['count'])]


# ---- decimation that keeps a uv per vertex -------------------------------
#
# A SCAN'S TEXTURE IS AN ATLAS, AND A CLUSTER THAT STRADDLES A SEAM IN IT
# DRAGS ITS TRIANGLES ACROSS THE WHOLE MAP.
#
# The first version snapped vertices to a grid, averaged their positions and
# kept the FIRST vertex's uv for the cell — and "first" is whatever order the
# file happens to list them in. Wherever a cell gathered vertices from two
# different islands of the atlas (which on a scan is every uv seam, and a
# church is covered in them) the survivor took one island's uv and every
# triangle hanging off it was stretched across to it. Measured in the game as
# TEXEL DENSITY — uv units per metre, per triangle — the nave's own columns
# ran from 0.014 to 2.74 on ONE surface, a factor of 192 between neighbouring
# faces. That is the owner's "the church textures look stretched", and no
# amount of resizing the map could have touched it.
#
# So a vertex may only merge with another that is near it in the ATLAS as
# well as in space. Two things make that safe:
#
#   * the POSITION is still averaged over the whole position cell, across
#     every uv bucket in it — so the sub-clusters of one cell sit at exactly
#     the same point and splitting a seam can never open a crack in the mesh;
#   * a triangle still COLLAPSES on position alone, so the decimation is
#     every bit as strong as it was and the budget means the same thing. All
#     that is gained is that the seam keeps its two uvs instead of one.
UV_CELL = 1.0 / 24.0          # ~85 texels of a 2048 atlas: inside an island, not across one


def cluster_uv(P, UV, I, cell):
    """Snap every vertex to a grid of `cell`; average the positions in each
    cell and the uvs within each uv bucket of it; drop the triangles that
    collapse. Returns (positions, uvs, triangles)."""
    pcell, pacc, vcell, vacc = {}, [], {}, []
    remap = [0] * len(P)          # vertex -> emitted vertex (position AND uv)
    pmap = [0] * len(P)           # vertex -> position cell (what decides a collapse)
    for vi, p in enumerate(P):
        u = UV[vi]
        key = (int(math.floor(p[0] / cell)), int(math.floor(p[1] / cell)), int(math.floor(p[2] / cell)))
        pi = pcell.get(key)
        if pi is None:
            pi = pcell[key] = len(pacc); pacc.append([0.0, 0.0, 0.0, 0])
        a = pacc[pi]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3] += 1
        pmap[vi] = pi
        vkey = (pi, int(math.floor(u[0] / UV_CELL)), int(math.floor(u[1] / UV_CELL)))
        j = vcell.get(vkey)
        if j is None:
            j = vcell[vkey] = len(vacc); vacc.append([0.0, 0.0, 0, pi])
        b = vacc[j]; b[0] += u[0]; b[1] += u[1]; b[2] += 1
        remap[vi] = j
    pos = [(pacc[b[3]][0] / pacc[b[3]][3], pacc[b[3]][1] / pacc[b[3]][3], pacc[b[3]][2] / pacc[b[3]][3])
           for b in vacc]
    uvs = [(b[0] / b[2], b[1] / b[2]) for b in vacc]
    tris, seen = [], set()
    for t in range(0, len(I) - 2, 3):
        pa, pb, pc = pmap[I[t]], pmap[I[t + 1]], pmap[I[t + 2]]
        if pa == pb or pb == pc or pa == pc:       # collapsed in SPACE: gone
            continue
        a, b, c = remap[I[t]], remap[I[t + 1]], remap[I[t + 2]]
        k = (a, b, c) if a < b and a < c else (b, c, a) if b < c else (c, a, b)
        if k in seen:
            continue
        seen.add(k); tris.append((a, b, c))
    return pos, uvs, tris


def decimate(P, UV, I, budget):
    """Bisect the cell onto the budget (a few passes; each pass is a full
    clustering, so the search is short and settles for 'within a fifth')."""
    ntri = len(I) // 3
    if ntri <= budget:
        # still weld duplicates so the walk sampler sees one surface
        pos, uvs, tris = cluster_uv(P, UV, I, 1e-4)
        return pos, uvs, tris
    ext = max(max(p[k] for p in P) - min(p[k] for p in P) for k in range(3))
    lo, hi = ext / 2000.0, ext / 4.0
    best = None
    for _ in range(9):
        cell = math.sqrt(lo * hi)
        pos, uvs, tris = cluster_uv(P, UV, I, cell)
        if len(tris) > budget:
            lo = cell
        else:
            hi = cell; best = (pos, uvs, tris)
        if best and len(best[2]) > budget * 0.8:
            break
    if best is None:
        best = cluster_uv(P, UV, I, hi)
    return best


# ---- the walk ------------------------------------------------------------
CELL = 0.20
HEADROOM = 1.25          # the cave squeezes to a metre and a half in places; the game ducks the camera under the roof (`ceil`)
STEP = 0.42              # the game's own ROCK_STEP: under this you step up, over it you walk into
BAND = (0.35, 1.20)      # the body: below it you step over a thing, above it you duck under one (a low roof, a mine frame's beam)
STEP = 0.42


def sample_tris(pos, tris, put):
    """Call put(x, y, z, ny) for points spread over every triangle at about
    half a cell apart, edges and interior alike."""
    for (a, b, c) in tris:
        pa, pb, pc = pos[a], pos[b], pos[c]
        ux, uy, uz = pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]
        vx, vy, vz = pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]
        nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
        L = math.sqrt(nx * nx + ny * ny + nz * nz)
        if L < 1e-12:
            continue
        ny /= L
        span = max(math.sqrt(ux * ux + uy * uy + uz * uz), math.sqrt(vx * vx + vy * vy + vz * vz),
                   math.sqrt((pc[0]-pb[0])**2 + (pc[1]-pb[1])**2 + (pc[2]-pb[2])**2))
        n = int(min(640, max(1, math.ceil(span / (CELL * 0.45)))))   # NO low cap: a 40 m floor plane sampled 48 ways leaves most cells floorless
        for i in range(n + 1):
            for j in range(n + 1 - i):
                s = i / n; t = j / n
                put(pa[0] + ux * s + vx * t, pa[1] + uy * s + vy * t, pa[2] + uz * s + vz * t, ny)


def build_walk(meshes, bench_ids, door_box):
    """meshes: list of (pos, tris, is_bench). Two grids: with and without
    the benches. Returns the walk dict."""
    lo = [1e9] * 3; hi = [-1e9] * 3
    for pos, tris, _ in meshes:
        for p in pos:
            for k in range(3):
                lo[k] = min(lo[k], p[k]); hi[k] = max(hi[k], p[k])
    x0 = lo[0] - CELL; z0 = lo[2] - CELL
    gw = int(math.ceil((hi[0] - lo[0] + 2 * CELL) / CELL)); gh = int(math.ceil((hi[2] - lo[2] + 2 * CELL) / CELL))
    cells = [[] for _ in range(gw * gh)]          # per cell: list of (y, ny, bench)
    log('walk grid %dx%d cells of %.2f m over x %.1f..%.1f z %.1f..%.1f' % (gw, gh, CELL, lo[0], hi[0], lo[2], hi[2]))
    for pos, tris, is_bench in meshes:
        def put(x, y, z, ny, is_bench=is_bench):
            if door_box and door_box[0] <= x <= door_box[3] and door_box[1] <= y <= door_box[4] and door_box[2] <= z <= door_box[5]:
                return
            i = int((x - x0) / CELL); j = int((z - z0) / CELL)
            if 0 <= i < gw and 0 <= j < gh:
                cells[j * gw + i].append((y, ny, is_bench))
        sample_tris(pos, tris, put)

    def solve(samples):
        """The LOWEST up-facing surface with head-room over it, and the first
        surface above that (the roof, for the camera to duck under)."""
        # A SCAN'S WINDING IS NOT TO BE TRUSTED. The cave's chunks face
        # whichever way the scanner left them — the floor up, half the roof
        # up as well — so nothing here reads the sign of a normal. A
        # candidate floor is any near-horizontal surface; what makes it a
        # floor is ORDER: it is under something (the roof — the outside of
        # the rock has nothing over it, and is not a floor), and what is
        # over it is far enough up to stand under.
        ups = sorted(y for (y, ny, b) in samples if abs(ny) > 0.35)
        ys = sorted(y for (y, ny, b) in samples)
        floor = None; ceil = None
        last = None
        if OPEN_SKY:
            # AN OPEN-AIR PLACE HAS ONE FLOOR AND EVERYTHING ELSE IS IN THE
            # WAY. Climbing to the first surface with head-room over it is how
            # you choose a STOREY in a cave, and under the sky it is actively
            # wrong: a wall cell fails the test at the ground (the wall is the
            # thing over it), climbs, and reports the TOP OF THE WALL as the
            # floor. Measured on the dojo: every wall in the place came out
            # walkable and not one cell in the whole arena was solid. The
            # lowest near-horizontal surface is the ground; what stands on it
            # is what `solid` is for.
            if not ups:
                return None, True, None
            # AND THE LOWEST SURFACE IN A CELL IS THE UNDERSIDE OF THE FLOOR.
            # Winding is not read here (it is not read anywhere in this file),
            # so a slab contributes its bottom face as well as its top, and the
            # bottom is lower: the dojo's floor came out at -0.33 against a top
            # at 0.03, which is knee-deep in it. Everything within a STEP of the
            # lowest is the same ground — the game's own `ROCK_STEP` rule, that
            # anything whose crown lands under a step is walked up rather than
            # walked into — so the slab's top wins and the shelf above it does
            # not.
            base = ups[0]
            floor = max(y for y in ups if y <= base + STEP)
            return floor, any(floor + BAND[0] < y < floor + BAND[1] for y in ys), None
        for h in ups:
            if last is not None and h - last < 0.15:
                continue                                  # the same surface, resampled
            last = h
            above = None
            for y in ys:
                if y > h + 0.30:
                    above = y; break
            if above is None:
                # NOTHING OVER IT IS THE TOP OF THE ROCK — OR THE SKY. In a
                # cave a surface with no roof is the outside of the hill and
                # must never be walkable, which is the whole of this test. The
                # dojo is roofless: it burnt down. Under an open sky the same
                # test throws away every floor in the place (measured: 56
                # walkable cells out of 60,099), so there it is the ground.
                if OPEN_SKY:
                    floor = h; ceil = None; break
                break
            if above - h >= HEADROOM:
                floor = h; ceil = above; break
        if floor is None:
            return None, True, None
        solid = any(floor + BAND[0] < y < floor + BAND[1] for y in ys)
        return floor, solid, ceil

    floor, floor0, solid, ceil = [], [], [], []
    nfloor = nsolid = 0
    for j in range(gh):
        frow, f0row, srow, crow = [], [], [], []
        for i in range(gw):
            s = cells[j * gw + i]
            f, sol, c = solve(s)
            f0, _, _ = solve([t for t in s if not t[2]]) if any(t[2] for t in s) else (f, sol, c)
            frow.append(-99.0 if f is None else round(f, 2))
            f0row.append(-99.0 if f0 is None else round(f0, 2))
            srow.append('1' if sol else '0')
            crow.append(99.0 if c is None else round(c, 2))
            if f is not None: nfloor += 1
            if sol: nsolid += 1
        floor.append(frow); floor0.append(f0row); solid.append(''.join(srow)); ceil.append(crow)
    log('walk: %d cells with a floor, %d solid' % (nfloor, nsolid))
    return dict(cell=CELL, gw=gw, gh=gh, x0=round(x0, 4), z0=round(z0, 4), floor=floor, floor0=floor0, solid=solid, ceil=ceil,
                bounds=[[round(v, 3) for v in lo], [round(v, 3) for v in hi]])


# ---- benches: weld, flood, group by footprint ----------------------------
def split_benches(P, UV, I):
    key = {}
    canon = [0] * len(P)
    for vi, p in enumerate(P):
        k = (round(p[0], 3), round(p[1], 3), round(p[2], 3))
        canon[vi] = key.setdefault(k, vi)
    parent = list(range(len(P)))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: parent[ra] = rb
    for t in range(0, len(I) - 2, 3):
        a, b, c = canon[I[t]], canon[I[t + 1]], canon[I[t + 2]]
        union(a, b); union(b, c)
    comps = {}
    for t in range(0, len(I) - 2, 3):
        r = find(canon[I[t]])
        comps.setdefault(r, []).append(t)
    # footprint of each island
    boxes = []
    for r, ts in comps.items():
        lo = [1e9] * 3; hi = [-1e9] * 3
        for t in ts:
            for v in (I[t], I[t + 1], I[t + 2]):
                p = P[v]
                for k in range(3):
                    lo[k] = min(lo[k], p[k]); hi[k] = max(hi[k], p[k])
        boxes.append([lo, hi, ts])
    log('pews: %d islands' % len(boxes))
    # group islands whose XZ footprints overlap (with a little slack)
    groups = []
    for b in sorted(boxes, key=lambda b: -len(b[2])):
        placed = False
        for gr in groups:
            glo, ghi = gr[0], gr[1]
            if (b[0][0] <= ghi[0] + 0.08 and b[1][0] >= glo[0] - 0.08 and
                    b[0][2] <= ghi[2] + 0.08 and b[1][2] >= glo[2] - 0.08):
                for k in range(3):
                    glo[k] = min(glo[k], b[0][k]); ghi[k] = max(ghi[k], b[1][k])
                gr[2].extend(b[2]); placed = True; break
        if not placed:
            groups.append([b[0][:], b[1][:], list(b[2])])
    # merge again, because a late island can bridge two groups
    merged = True
    while merged:
        merged = False
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                a, b = groups[i], groups[j]
                if (a[0][0] <= b[1][0] + 0.08 and a[1][0] >= b[0][0] - 0.08 and
                        a[0][2] <= b[1][2] + 0.08 and a[1][2] >= b[0][2] - 0.08):
                    for k in range(3):
                        a[0][k] = min(a[0][k], b[0][k]); a[1][k] = max(a[1][k], b[1][k])
                    a[2].extend(b[2]); groups.pop(j); merged = True; break
            if merged: break
    log('pews: %d benches' % len(groups))
    out = []
    for lo, hi, ts in sorted(groups, key=lambda gr: (round(gr[0][2], 1), gr[0][0])):
        # rebuild a compact vertex list for the bench
        vmap, p2, u2, i2 = {}, [], [], []
        for t in ts:
            for v in (I[t], I[t + 1], I[t + 2]):
                m = vmap.get(v)
                if m is None:
                    m = vmap[v] = len(p2); p2.append(P[v]); u2.append(UV[v])
                i2.append(m)
        out.append((p2, u2, i2, lo, hi))
    return out


def main():
    global HEADROOM, OPEN_SKY
    ap = argparse.ArgumentParser()
    ap.add_argument('kind', choices=['cave', 'church', 'passage', 'dojo'])
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--tex', type=int, default=1024)
    ap.add_argument('--quality', type=int, default=86)
    ap.add_argument('--budget', type=int, default=0, help='triangle budget for the whole model (0: the kind\'s default)')
    ap.add_argument('--yaw', type=float, default=0.0, help='turn the whole model about +Y by this many degrees before anything is measured')
    ap.add_argument('--scale', type=float, default=1.0, help='and scale it: a game asset in its own units becomes metres here, once')
    ap.add_argument('--sparse', action='store_true', help='write the walk as a list of the cells that have a floor (a long thin tunnel is 95%% empty bounding box)')
    ap.add_argument('--trim', type=float, default=None, help='drop everything whose baked x is below this (halve a tunnel that is too long; the cut end is capped by the game)')
    ap.add_argument('--islands', type=int, default=0, help='drop connected islands smaller than this many triangles — a game tunnel is full of loose decoration slabs floating in the bore')
    ap.add_argument('--open-sky', action='store_true', help='a roofless place: a near-horizontal surface is a floor with nothing over it')
    ap.add_argument('--headroom', type=float, default=HEADROOM, help='the least roof a cell may have over its floor and still be floor (the crouch is 1.03)')
    a = ap.parse_args()
    budget = a.budget or {'cave': 240000, 'church': 260000, 'passage': 60000, 'dojo': 180000}[a.kind]
    HEADROOM = a.headroom
    OPEN_SKY = a.open_sky or a.kind == 'dojo'

    root = os.path.dirname(os.path.abspath(a.src))
    g = json.load(open(a.src))
    bufs = []
    for b in g['buffers']:
        uri = b.get('uri', '')
        bufs.append(base64.b64decode(uri.split(',', 1)[1]) if uri.startswith('data:')
                    else open(os.path.join(root, uri), 'rb').read())
    mats = g.get('materials', [])
    nodes = g['nodes']

    # ---- gather every primitive in world space, merged per (node, material)
    groups = {}          # (node name, material index) -> [P, UV, I]
    order = []
    # AND A LIGHT-SHAFT IS NOT A TUNNEL. local.yany's cave ships a "Particles"
    # tube — an alpha cylinder hanging down the middle of the bore, which is a
    # god-ray for a scene with a sun in it. Forty metres underground there is
    # nothing to shaft, and worse: the corridor fit measures every surface in
    # the model, so a tube in the middle of the bore is measured as the WALL
    # and the walk closes to nothing around it.
    skip_re = {'church': ('Sun', 'Doors_Old_Wooden_1.003'), 'cave': (), 'passage': ('CC Particles',),
               'dojo': ()}[a.kind]
    def walk(ni, parent):
        n = nodes[ni]
        m = mat_mul(parent, node_matrix(n))
        name = n.get('name', '') or ''
        if 'mesh' in n and not any(name.startswith(s) for s in skip_re):
            for pr in g['meshes'][n['mesh']].get('primitives', []):
                if pr.get('mode', 4) != 4:
                    continue
                pos = read_accessor(g, bufs, pr['attributes']['POSITION'])
                uv = read_accessor(g, bufs, pr['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in pr['attributes'] else [(0.0, 0.0)] * len(pos)
                idx = [v[0] for v in read_accessor(g, bufs, pr['indices'])] if 'indices' in pr else list(range(len(pos)))
                key = (name.split('_')[0] if a.kind == 'cave' and name.startswith('Cube_') else name, pr.get('material', 0))
                if key not in groups:
                    groups[key] = [[], [], []]; order.append(key)
                G = groups[key]
                off = len(G[0])
                G[0].extend(apply_m(m, p) for p in pos)
                G[1].extend((u[0], u[1]) for u in uv)
                G[2].extend(v + off for v in idx)
        for c in n.get('children', []):
            walk(c, m)
    # THE MODEL IS TURNED AND SCALED HERE, ONCE. The 3DRT passage is a game
    # asset in its own units with its long axis down -z; the game wants it in
    # metres with its entry at -x and its far end at +x, and the walk grid is
    # axis-aligned, so the turn has to happen before a single cell is sampled.
    # The old cave is turned half round the same way when it becomes the way
    # OUT: its mouth has to face the church's back wall.
    th = math.radians(a.yaw); cs, sn = math.cos(th), math.sin(th); sc = a.scale
    ident = [cs * sc, 0, -sn * sc, 0,  0, sc, 0, 0,  sn * sc, 0, cs * sc, 0,  0, 0, 0, 1]
    for ni in g['scenes'][g.get('scene', 0)]['nodes']:
        walk(ni, ident)
    total = sum(len(G[2]) // 3 for G in groups.values())
    log('%d groups, %d tris' % (len(groups), total))

    # ---- HALF THE TUNNEL. Three hundred and forty metres is a slog; the cut
    # end becomes the new entry and the game's black cap closes it.
    if a.trim is not None:
        for key, G in groups.items():
            P, UV, I = G
            keep = []
            for t in range(0, len(I) - 2, 3):
                cx = (P[I[t]][0] + P[I[t + 1]][0] + P[I[t + 2]][0]) / 3.0
                if cx >= a.trim:
                    keep.extend((I[t], I[t + 1], I[t + 2]))
            G[2] = keep
        n2 = sum(len(G[2]) // 3 for G in groups.values())
        log('trimmed at x >= %.1f: %d -> %d tris' % (a.trim, total, n2))
        total = n2

    # ---- AND THE LOOSE SLABS GO. A game tunnel ships decoration — planks,
    # boards, bits of frame — modelled as islands floating in the bore, and
    # welded into one mesh they read as "weird things floating". Anything
    # that is its own small connected island is not the tunnel.
    if a.islands:
        for key, G in groups.items():
            P, UV, I = G
            if not I:
                continue
            canon = {}
            cmap = [0] * len(P)
            for vi, pp in enumerate(P):
                k = (round(pp[0], 3), round(pp[1], 3), round(pp[2], 3))
                cmap[vi] = canon.setdefault(k, vi)
            parent = list(range(len(P)))
            def find(x):
                while parent[x] != x:
                    parent[x] = parent[parent[x]]; x = parent[x]
                return x
            for t in range(0, len(I) - 2, 3):
                r = [find(cmap[I[t + k]]) for k in range(3)]
                for k in (1, 2):
                    if r[k] != r[0]:
                        parent[r[k]] = r[0]; r[k] = r[0]
            cnt = {}
            for t in range(0, len(I) - 2, 3):
                r = find(cmap[I[t]]); cnt[r] = cnt.get(r, 0) + 1
            keep = []
            dropped = 0
            for t in range(0, len(I) - 2, 3):
                if cnt[find(cmap[I[t]])] >= a.islands:
                    keep.extend((I[t], I[t + 1], I[t + 2]))
                else:
                    dropped += 1
            G[2] = keep
            if dropped:
                log('  %s: dropped %d tris in islands under %d' % (str(key), dropped, a.islands))
        total = sum(len(G[2]) // 3 for G in groups.values())

    # ---- AND THE VERTICES THE CUT ORPHANED HAVE TO GO, or the model's
    # BOUNDS still span the whole untrimmed tunnel and everything measured
    # off them — the walk grid, the black shell, the body-radius region —
    # is sized for geometry that is no longer there.
    if a.trim is not None or a.islands:
        for key, G in groups.items():
            P, UV, I = G
            vmap, p2, u2, i2 = {}, [], [], []
            for v in I:
                m = vmap.get(v)
                if m is None:
                    m = vmap[v] = len(p2); p2.append(P[v]); u2.append(UV[v])
                i2.append(m)
            G[0], G[1], G[2] = p2, u2, i2

    # ---- a group the trim emptied is not a mesh: an accessor with no
    # positions has no min/max and the writer dies on it
    for key in [k for k, G in groups.items() if len(G[2]) < 3]:
        groups.pop(key); order.remove(key)
        log('dropped empty group %s' % str(key))

    # ---- benches out of the pews
    out_meshes = []      # (name, material, P, UV, tris, is_bench)
    bench_boxes = []
    if a.kind == 'church':
        for key in list(order):
            if mats[key[1]].get('name') == 'banc':
                P, UV, I = groups.pop(key); order.remove(key)
                for n, (p2, u2, i2, lo, hi) in enumerate(split_benches(P, UV, I)):
                    out_meshes.append(('bench_%d' % n, key[1], p2, u2, i2, True))
                    bench_boxes.append([round(v, 3) for v in lo] + [round(v, 3) for v in hi])
    for key in order:
        P, UV, I = groups[key]
        out_meshes.append((key[0], key[1], P, UV, I, False))

    # ---- decimate, proportionally, sparing anything already small
    big = [(len(m[4]) // 3) for m in out_meshes]
    heavy = sum(t for t in big if t > 4000)
    spare = sum(t for t in big if t <= 4000)
    ratio = max(0.02, min(1.0, (budget - spare) / max(1, heavy)))
    log('decimating the heavy meshes to %.0f%% (budget %d)' % (ratio * 100, budget))
    packed = []
    for (name, mi, P, UV, I, is_bench) in out_meshes:
        ntri = len(I) // 3
        want = ntri if ntri <= 4000 else max(1500, int(ntri * ratio))
        pos, uvs, tris = decimate(P, UV, I, want)
        log('  %-40s %-18s %7d -> %6d tris' % (name, mats[mi].get('name'), ntri, len(tris)))
        packed.append((name, mi, pos, uvs, tris, is_bench))

    # ---- the walk
    door_box = None
    if a.kind == 'church':
        # the end wall's door: measured off the door plane (x -24.5, y -15.1..-9.3, z ±2)
        door_box = [-25.3, -14.7, -2.05, -23.7, -9.3, 2.05]   # the WALL over the doorway, not the floor under it
    # THE RAIN IS NOT A WALL AND THE GRASS IS NOT A FLOOR. The dojo ships two
    # rain meshes that span the whole scene from the ground to thirty metres
    # up, a sky dome and five grass fields — rasterise those into the walk and
    # the arena is one solid block with a lawn for a ceiling. Weather, sky and
    # ground cover are drawn and never collided; the building, its props and
    # the floor under them are what you can stand on and walk into.
    # `SkyAndGround1` is NOT in this list: it is the sky dome AND the ground
    # under the whole scene in one mesh, so dropping it leaves the yard with
    # nothing to stand on. Its dome rises through the body band out at the
    # horizon, which is exactly the wall that keeps you in the place.
    NO_WALK = ('Rain', 'Grass1', 'Splash248')
    walk_in = [(pos, tris, is_bench) for (name, mi, pos, uvs, tris, is_bench) in packed
               if not (a.kind == 'church' and mats[mi].get('name') == 'ampoule')
               and not (a.kind == 'dojo' and mats[mi].get('name') in NO_WALK)]
    walk = build_walk(walk_in, None, door_box)
    if door_box: walk['door'] = door_box
    if bench_boxes: walk['benches'] = bench_boxes
    # where the floor is at a few named spots, for the notes and the placement
    def floor_at(x, z):
        i = int((x - walk['x0']) / CELL); j = int((z - walk['z0']) / CELL)
        if 0 <= i < walk['gw'] and 0 <= j < walk['gh']:
            return walk['floor'][j][i]
        return None
    if a.kind in ('cave', 'passage'):
        b = walk['bounds']
        for x in (b[0][0] + 1.0, b[0][0] + 3.0, (b[0][0] + b[1][0]) / 2, b[1][0] - 3.0, b[1][0] - 1.0):
            zs = [(z, floor_at(x, z)) for z in [b[0][2] + k * 0.2 for k in range(int((b[1][2] - b[0][2]) / 0.2))]]
            zs = [(z, f) for z, f in zs if f is not None and f > -90]
            if zs:
                mid = zs[len(zs) // 2]
                log('  cave floor at x=%.1f: z %.1f..%.1f, floor %.2f at z %.1f' % (x, zs[0][0], zs[-1][0], mid[1], mid[0]))
    elif a.kind == 'dojo':
        b = walk['bounds']
        cx, cz = (b[0][0] + b[1][0]) / 2, (b[0][2] + b[1][2]) / 2
        log('  dojo bounds %s .. %s' % ([round(v, 2) for v in b[0]], [round(v, 2) for v in b[1]]))
        log('  dojo floor at the middle: %s' % floor_at(cx, cz))
        n = sum(1 for j in range(walk['gh']) for i in range(walk['gw']) if walk['floor'][j][i] > -90)
        log('  dojo walkable cells: %d of %d' % (n, walk['gw'] * walk['gh']))
    else:
        log('  church floor at the door: %s, at the altar: %s' % (floor_at(-23.5, 0), floor_at(3, 0)))

    if a.sparse:
        # A LONG THIN TUNNEL IS NINETY-FIVE PER CENT EMPTY BOUNDING BOX: the
        # passage's dense grid is 1700 by 250 cells and nearly all of them
        # say "no floor" three times over, at four megabytes of JSON. Only
        # the cells WITH a floor are written; the game expands them back.
        cells = []
        for j in range(walk['gh']):
            fr, cr, sr = walk['floor'][j], walk['ceil'][j], walk['solid'][j]
            for i in range(walk['gw']):
                if fr[i] > -90:
                    cells.append([i, j, fr[i], cr[i], 1 if sr[i] == '1' else 0])
        for k in ('floor', 'floor0', 'solid', 'ceil'):
            del walk[k]
        walk['sparse'] = cells
        log('walk: sparse, %d cells written' % len(cells))

    # ---- materials: spec-gloss -> metallic-roughness (gltfpack's own code)
    for m in mats:
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
        pbr = m.setdefault('pbrMetallicRoughness', {})
        pbr.pop('metallicRoughnessTexture', None)
        pbr['metallicFactor'] = 0.0
        pbr.setdefault('roughnessFactor', 1.0)
        for t in (pbr.get('baseColorTexture'), m.get('emissiveTexture'), m.get('normalTexture')):
            if t: t['texCoord'] = 0
    for k in ('extensionsUsed', 'extensionsRequired'):
        g.pop(k, None)

    # ---- rebuild: one flat scene of baked meshes under a root with extras
    blob = bytearray()
    views = []
    def pad4():
        blob.extend(b'\0' * ((4 - len(blob) % 4) % 4))
    def emit(data, target=None):
        pad4()
        off = len(blob); blob.extend(data)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target is not None: v['target'] = target
        views.append(v); return len(views) - 1
    accessors, meshes, out_nodes = [], [], []
    for (name, mi, pos, uvs, tris, is_bench) in packed:
        vb = bytearray(); ub = bytearray()
        for p in pos: vb.extend(struct.pack('<fff', *p))
        for u in uvs: ub.extend(struct.pack('<ff', u[0], u[1]))
        wide = len(pos) > 65535
        ib = bytearray()
        for t in tris: ib.extend(struct.pack('<III' if wide else '<HHH', *t))
        mn = [min(p[k] for p in pos) for k in range(3)]; mx = [max(p[k] for p in pos) for k in range(3)]
        pa = len(accessors); accessors.append({'bufferView': emit(vb, ARRAY_BUFFER), 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': mn, 'max': mx})
        ua = len(accessors); accessors.append({'bufferView': emit(ub, ARRAY_BUFFER), 'componentType': 5126, 'count': len(uvs), 'type': 'VEC2'})
        ia = len(accessors); accessors.append({'bufferView': emit(ib, ELEMENT_ARRAY_BUFFER), 'componentType': 5125 if wide else 5123, 'count': len(tris) * 3, 'type': 'SCALAR'})
        meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': pa, 'TEXCOORD_0': ua}, 'indices': ia, 'material': mi}]})
        out_nodes.append({'name': name, 'mesh': len(meshes) - 1})
    root_node = {'name': ('bw_' if a.kind == 'dojo' else 'undercroft_') + a.kind, 'children': list(range(1, len(out_nodes) + 1)),
                 'extras': {'bw_walk': json.dumps(walk, separators=(',', ':'))}}
    g['nodes'] = [root_node] + out_nodes
    g['meshes'] = meshes
    g['scenes'] = [{'nodes': [0]}]; g['scene'] = 0
    g.pop('animations', None); g.pop('skins', None)
    # materials nothing uses go
    usedm = sorted({m['primitives'][0]['material'] for m in meshes})
    remap = {old: new for new, old in enumerate(usedm)}
    g['materials'] = [mats[i] for i in usedm]
    for m in meshes:
        m['primitives'][0]['material'] = remap[m['primitives'][0]['material']]

    # ---- images: resize, JPEG unless alpha is used, embed
    live = set()
    for m in g['materials']:
        pbr = m.get('pbrMetallicRoughness', {})
        for t in (pbr.get('baseColorTexture'), m.get('emissiveTexture'), m.get('normalTexture')):
            if t: live.add(t['index'])
    cutout = set()
    for m in g['materials']:
        bt = m.get('pbrMetallicRoughness', {}).get('baseColorTexture')
        if bt and m.get('alphaMode', 'OPAQUE') != 'OPAQUE': cutout.add(g['textures'][bt['index']].get('source'))
    keep_img = {}
    for ti in sorted(live):
        si = g['textures'][ti].get('source')
        if si in keep_img: continue
        img = g['images'][si]; uri = img.get('uri', '')
        raw = open(os.path.join(root, uri), 'rb').read()
        im0 = Image.open(io.BytesIO(raw))
        alpha = im0.mode in ('RGBA', 'LA') or (im0.mode == 'P' and 'transparency' in im0.info)
        if alpha:
            im0 = im0.convert('RGBA'); alpha = im0.getchannel('A').getextrema()[0] < 250
        alpha = alpha or si in cutout
        im = im0.convert('RGBA' if alpha else 'RGB')
        if max(im.size) > a.tex:
            k = a.tex / max(im.size)
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        out = io.BytesIO()
        if alpha: im.save(out, 'PNG', optimize=True)
        else: im.save(out, 'JPEG', quality=a.quality, optimize=True)
        enc = out.getvalue()
        log('  %-44s %4dpx %s %6.1f KB' % (os.path.basename(uri), max(im.size), 'png ' if alpha else 'jpeg', len(enc) / 1024))
        keep_img[si] = {'bufferView': emit(enc), 'mimeType': 'image/png' if alpha else 'image/jpeg', 'name': os.path.splitext(os.path.basename(uri))[0]}
    order_i = sorted(keep_img); imap = {si: k for k, si in enumerate(order_i)}
    g['images'] = [keep_img[si] for si in order_i]
    g['textures'] = [{**{k: v for k, v in t.items() if k != 'source'}, 'source': imap[t['source']]} if t.get('source') in imap else t for t in g['textures']]
    g['accessors'] = accessors
    g['bufferViews'] = views
    g['buffers'] = [{'byteLength': len(blob)}]
    g['asset'] = {'version': '2.0', 'generator': 'tools/undercroft_pack.py'}

    js = json.dumps(g, separators=(',', ':')).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    pad4()
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(a.dst, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    log('%s: %.2f MB (json %.0f KB, bin %.2f MB), %d tris' % (a.dst, total / 1e6, len(js) / 1024, len(blob) / 1e6, sum(len(p[4]) for p in packed)))


main()
