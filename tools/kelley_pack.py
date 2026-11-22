#!/usr/bin/env python3
"""THE BASEMENT UNDER ELVÉDOR'S HOUSE: pixelbutterfly's "813 Kelley Road" (Sketchfab, CC-BY-NC-SA-4.0 — credited in README),
cut down to its stairwell and its cellar (2026-11-21, the owner: "make it lead into this kelley road model exactly where i put
this screenshot. in the basement remove the table with the body on it and the monster creature. take out the trash bags in the
basement and the wood pillars in the way … close that door to the left of the spawn i dont need the upstairs part right now").

    /usr/bin/python3 -I tools/kelley_pack.py incoming/kelley/scene.gltf assets/kelley.glb

 - KEPT: everything under the ground floor (y < -40 in the file's units, the cellar's ceiling is at -100), and the stairwell
   up to the ground floor's landing and its ceiling (x -380..1215, z -1125..-525, y < 815). A triangle across either edge is
   CLIPPED to it (Sutherland–Hodgman, uv carried), not kept or dropped whole by its middle: the landing's floor and the
   stairwell's walls are single big triangles of meshes that run on across the house.
 - DROPPED: the creature (`Object_273`, the file's one skinned mesh, and its skin and clip), the body's sheet (`Plane.007`)
   and the table under it (`clock.001`), every `trashbag_*`, and the six wooden posts (`Cube.229`'s islands that are tall
   and thin: three down the middle of the laundry side, three along its open edge to the shelves' side). The joists they
   held stay.
 - THE LANDING'S END WALL OPEN (x 1200, the stairwell's width): the game builds the bulkhead there — three concrete steps
   up under the slanted cellar doors you came in by.
 - THE KITCHEN DOOR, OPEN (shut 2026-11-21, open again 2026-11-22): `Cube.211`, the leaf standing open into the kitchen to the
   left at the top of the stairs as the file has it, kept whole (its own part, `kitchenDoor`). And the blue door at the stairs' foot
   (`Cube.217`) the same turn the other way round: open flat against the laundry side's wall, out of its doorway.
 - METRES: x·S, (y + 900)·S, z·S with S = 0.0034 — set by the doors, 620 of the file's units to 2.1 m: the cellar floor at 0,
   a step 0.27 high and 0.34 deep, the workbench 0.82, the cellar 2.72 to its ceiling and 2.38 to the joists, the landing at
   the top 3.06. (At 0.003 the header over the stairs' foot was 1.62 m over the step under it and the walk refused the
   flight there: a head does not fit.)
 - MATERIALS: the file is `KHR_materials_unlit` — its look is painted into the maps. Here each is a plain lit diffuse
   (metal 0, roughness 1), so the room is as dark as its lamps make it; the game lifts each by a little of its own map.
   The maps are the file's own (32–256 px PNGs), nearest-filtered.
 - THE WALK: the storeyed grid of `undercroft_pack.py` (`build_walk_multi`, 0.2 m cells, every floor a cell has with its
   roof and whether the body band over it is blocked), in the root's extras as `bw_walk`.
Written gzipped (`tools/bwio.py`)."""
import json, math, os, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bwio

SRC, DST = sys.argv[1], sys.argv[2]
S = 0.0034
Y0 = -900.0
CUT_Y = -40.0
WELL = (-2300.0, 1200.5, -1140.0, 770.0, 815.0)          # x0 x1 z0 z1 ytop: the stairwell — and the whole ground floor round it
# (THE GROUND FLOOR BACK — 2026-11-22, the owner: "build the kitchen again my bad", after the kitchen door was opened again: the
# box was the stairwell alone (x -380..1200, z -1125..-525) and the door opened on nothing. Now the house's whole ground floor up
# to its ceiling: the living room behind the door, the kitchen and its table past it, the bathroom; the upper floor stays cut.)
DROP = ('Object_273', 'Plane.007', 'clock.001', 'trashbag', 'Cube.276', 'Cube.281')
CELL = 0.20
HEADROOM = 1.25
BAND = (0.35, 1.20)

g = json.load(open(SRC)); base = os.path.dirname(os.path.abspath(SRC))
bufs = [open(os.path.join(base, bb['uri']), 'rb').read() for bb in g['buffers']]
log = lambda *a: print(*a, file=sys.stderr)


def mat_mul(a, b):
    return [sum(a[r + 4 * k] * b[k + 4 * c] for k in range(4)) for c in range(4) for r in range(4)]


def node_matrix(n):
    if 'matrix' in n: return list(n['matrix'])
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    R = [1 - 2*(y*y+z*z), 2*(x*y+z*w), 2*(x*z-y*w), 2*(x*y-z*w), 1 - 2*(x*x+z*z), 2*(y*z+x*w), 2*(x*z+y*w), 2*(y*z-x*w), 1 - 2*(x*x+y*y)]
    return [R[0]*s[0], R[1]*s[0], R[2]*s[0], 0, R[3]*s[1], R[4]*s[1], R[5]*s[1], 0, R[6]*s[2], R[7]*s[2], R[8]*s[2], 0, t[0], t[1], t[2], 1]


NC = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4), 5121: ('B', 1)}
NT = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def acc(i):
    a = g['accessors'][i]; v = g['bufferViews'][a['bufferView']]
    fmt, sz = NC[a['componentType']]; n = NT[a['type']]
    st = v.get('byteStride', sz * n); o = v.get('byteOffset', 0) + a.get('byteOffset', 0); bb = bufs[v['buffer']]
    return [struct.unpack_from('<' + fmt * n, bb, o + k * st) for k in range(a['count'])]


# ---- every triangle in the file's world units, by material: [(p, uv) x3]
tris = {}           # (material index, part) -> list of tris
def walk(ni, parent):
    n = g['nodes'][ni]; m = mat_mul(parent, node_matrix(n)); name = n.get('name', '') or ''
    if 'mesh' in n and 'skin' not in n and not any(name.startswith(d) for d in DROP):
        for pr in g['meshes'][n['mesh']]['primitives']:
            P = [(m[0]*p[0] + m[4]*p[1] + m[8]*p[2] + m[12], m[1]*p[0] + m[5]*p[1] + m[9]*p[2] + m[13], m[2]*p[0] + m[6]*p[1] + m[10]*p[2] + m[14]) for p in acc(pr['attributes']['POSITION'])]
            UV = acc(pr['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in pr['attributes'] else [(0.0, 0.0)] * len(P)
            I = [v[0] for v in acc(pr['indices'])] if 'indices' in pr else list(range(len(P)))
            det = m[0]*(m[5]*m[10]-m[9]*m[6]) - m[4]*(m[1]*m[10]-m[9]*m[2]) + m[8]*(m[1]*m[6]-m[5]*m[2])
            T = [(I[t], I[t + 2], I[t + 1]) if det < 0 else (I[t], I[t + 1], I[t + 2]) for t in range(0, len(I) - 2, 3)]
            if name.startswith('Cube.229'):
                T = drop_posts(P, T)
            # (OPEN AGAIN — 2026-11-22, the owner: "make the door i said to close in the cellar open i might do something up there":
            # the kitchen door stands as the file has it, 55° into the kitchen, kept whole though it reaches past the stairwell's box)
            if name.startswith('Cube.217'):
                P = turn_leaf(P, (-722.0, -954.5), (-871.0, -741.5), 'the blue door, open flat')
            mi = pr.get('material', 0)
            for (a, b, c) in T:
                pt = part_of(name, P[a], P[b], P[c])
                tris.setdefault((mi, pt), []).append([(P[a], UV[a]), (P[b], UV[b]), (P[c], UV[c])])
    for c in n.get('children', []): walk(c, m)


def part_of(name, a, b, c):
    """THE WASHER'S PIECES, each its own node (2026-11-21, the owner: a puppet "locked in the washer ... the washer start being
    loud and jump around ... hit the lock off the washer and he jumps out"): the chained machine (the right of the pair in
    `Cube.209`, x > -1740), its drop-down door (the panel standing proud of its front, x -1700..-1430, y -848..-676, z ≥ -810),
    the padlock (`Cylinder.009`) and the two chains (`chain.009`, `chain.010`). Everything else is the room."""
    if name.startswith('Cylinder.009'): return 'washerLock'
    if name.startswith('Cube.211'): return 'kitchenDoor'
    if name.startswith('chain.009') or name.startswith('chain.010'): return 'washerChains'
    if name.startswith('Cube.209'):
        if all(v[0] > -1741 for v in (a, b, c)):
            if all(-1701 <= v[0] <= -1429 and -849 <= v[1] <= -675 and v[2] >= -810.5 for v in (a, b, c)): return 'washerDoor'
            return 'washer'
    return ''


def drop_posts(P, T):
    """the posts: islands of the joist mesh that stand from the floor and are thin across"""
    canon = {}; cm = [canon.setdefault((round(p[0], 2), round(p[1], 2), round(p[2], 2)), i) for i, p in enumerate(P)]
    par = list(range(len(P)))
    def f(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for t in T:
        r0 = f(cm[t[0]])
        for k in (1, 2):
            r = f(cm[t[k]])
            if r != r0: par[r] = r0
    comp = {}
    for t in T: comp.setdefault(f(cm[t[0]]), []).append(t)
    out, n = [], 0
    for ts in comp.values():
        vs = [P[i] for t in ts for i in t]
        dx = max(v[0] for v in vs) - min(v[0] for v in vs); dz = max(v[2] for v in vs) - min(v[2] for v in vs)
        dy = max(v[1] for v in vs) - min(v[1] for v in vs)
        if dy > 500 and dx < 90 and dz < 90 and min(v[1] for v in vs) < -880: n += 1; continue
        out.extend(ts)
    log('posts dropped:', n)
    return out


def turn_leaf(P, hinge, free, what):
    """a door's leaf turned about its hinge (the middle of its end at the frame) until its free end points down -x: for the
    kitchen door that is shut in the wall's line, for the blue door at the stairs' foot it is open flat against the cellar's
    wall, out of the doorway it half blocked (2026-11-21: walking back to the stairs you caught on its edge)"""
    hx, hz = hinge; fx, fz = free
    ph = math.atan2(0.0, -1.0) - math.atan2(fz - hz, fx - hx)
    c, s = math.cos(ph), math.sin(ph)
    out = []
    for (x, y, z) in P:
        u, v = x - hx, z - hz
        out.append((hx + u * c - v * s, y, hz + u * s + v * c))
    log('%s: turned %.1f deg' % (what, math.degrees(ph)))
    return out


walk_roots = g['scenes'][g.get('scene', 0)]['nodes']
for ni in walk_roots: walk(ni, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
log('tris in:', sum(len(v) for v in tris.values()))


# ---- the cut: under the cellar's ceiling, or in the stairwell
def lerp(a, b, t):
    return ((a[0][0] + (b[0][0] - a[0][0]) * t, a[0][1] + (b[0][1] - a[0][1]) * t, a[0][2] + (b[0][2] - a[0][2]) * t),
            (a[1][0] + (b[1][0] - a[1][0]) * t, a[1][1] + (b[1][1] - a[1][1]) * t))


def clip(poly, d):
    """keep where d(p) <= 0"""
    out = []
    for i in range(len(poly)):
        A, B = poly[i], poly[(i + 1) % len(poly)]
        da, db = d(A[0]), d(B[0])
        if da <= 0: out.append(A)
        if (da < 0) != (db < 0) and da != db:
            out.append(lerp(A, B, da / (da - db)))
    return out


def fan(poly):
    return [[poly[0], poly[i], poly[i + 1]] for i in range(1, len(poly) - 1)]


x0, x1, z0, z1, ytop = WELL
in_well = lambda p: x0 <= p[0] <= x1 and z0 <= p[2] <= z1 and p[1] <= ytop
kept = {}
for mi, L in tris.items():
    K = kept.setdefault(mi, [])
    for t in L:
        if all(abs(v[0][0] - 1200) < 1 and -1111 <= v[0][2] <= -539 and v[0][1] > -60 for v in t): continue   # the landing's end wall: the bulkhead opens there
        if mi[1] == 'washer' and all(abs(v[0][2] + 810) < 0.6 for v in t):
            # THE MACHINE'S FRONT HAS THE DOOR PAINTED ON IT behind the raised door: with the door down, the hole has to be a
            # hole, or the drum looks shut (2026-11-21). The face is cut round the door's opening (x -1699..-1431, y -847..-677).
            for d in ((lambda q: q[0] + 1699,), (lambda q: -1431 - q[0],),
                      (lambda q: -1699 - q[0], lambda q: q[0] + 1431, lambda q: q[1] + 847),
                      (lambda q: -1699 - q[0], lambda q: q[0] + 1431, lambda q: -677 - q[1])):
                pc = list(t)
                for f in d:
                    pc = clip(pc, f)
                    if len(pc) < 3: break
                if len(pc) >= 3: K.extend(fan(pc))
            continue
        if mi[1] == 'kitchenDoor' or all(v[0][1] <= CUT_Y for v in t) or all(in_well(v[0]) for v in t): K.append(t); continue
        lo = clip(list(t), lambda p: p[1] - CUT_Y)                   # the part under the ceiling
        if len(lo) >= 3: K.extend(fan(lo))
        hi = list(t)                                                 # and the part over it that is in the stairwell
        for d in (lambda p: CUT_Y - p[1], lambda p: x0 - p[0], lambda p: p[0] - x1, lambda p: z0 - p[2], lambda p: p[2] - z1, lambda p: p[1] - ytop):
            hi = clip(hi, d)
            if len(hi) < 3: break
        if len(hi) >= 3: K.extend(fan(hi))


def area(t):
    a, b, c = t[0][0], t[1][0], t[2][0]
    u = (b[0] - a[0], b[1] - a[1], b[2] - a[2]); v = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
    return math.sqrt((u[1]*v[2]-u[2]*v[1])**2 + (u[2]*v[0]-u[0]*v[2])**2 + (u[0]*v[1]-u[1]*v[0])**2) / 2


for mi in list(kept):
    kept[mi] = [t for t in kept[mi] if area(t) > 1e-3]
    if not kept[mi]: del kept[mi]
log('tris kept:', sum(len(v) for v in kept.values()))

# ---- metres
M = lambda p: (round(p[0] * S, 5), round((p[1] - Y0) * S, 5), round(p[2] * S, 5))
meshes_m = {mi: [[(M(v[0]), v[1]) for v in t] for t in L] for mi, L in kept.items()}


# ---- the walk (undercroft_pack.py's storeyed grid)
def sample(a, b, c, put):
    ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]; vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
    L = math.sqrt(nx * nx + ny * ny + nz * nz)
    if L < 1e-12: return
    ny /= L
    span = max(math.sqrt(ux*ux + uy*uy + uz*uz), math.sqrt(vx*vx + vy*vy + vz*vz), math.sqrt((c[0]-b[0])**2 + (c[1]-b[1])**2 + (c[2]-b[2])**2))
    n = int(min(640, max(1, math.ceil(span / (CELL * 0.45)))))
    for i in range(n + 1):
        for j in range(n + 1 - i):
            s = i / n; t = j / n
            put(a[0] + ux * s + vx * t, a[1] + uy * s + vy * t, a[2] + uz * s + vz * t, ny)


NO_WALK = {'leaks', 'handprints'}                      # stains on the wall: drawn, never walked into
allp = [v[0] for L in meshes_m.values() for t in L for v in t]
lo = [min(p[k] for p in allp) for k in range(3)]; hi = [max(p[k] for p in allp) for k in range(3)]
wx0 = lo[0] - CELL; wz0 = lo[2] - CELL
gw = int(math.ceil((hi[0] - lo[0] + 2 * CELL) / CELL)); gh = int(math.ceil((hi[2] - lo[2] + 2 * CELL) / CELL))
cells = {}
for mi, L in meshes_m.items():
    if g['materials'][mi[0]]['name'] in NO_WALK or mi[1] in ('washerLock', 'washerChains', 'washerDoor'): continue   # (the washer's loose pieces move: its body is the wall)
    def put(x, y, z, ny):
        i = int((x - wx0) / CELL); j = int((z - wz0) / CELL)
        if 0 <= i < gw and 0 <= j < gh: cells.setdefault(j * gw + i, []).append((y, ny))
    for t in L: sample(t[0][0], t[1][0], t[2][0], put)
out = []
for key in sorted(cells):
    s = cells[key]
    ups = sorted(y for (y, ny) in s if abs(ny) > 0.35)
    if not ups: continue
    ys = sorted(y for (y, ny) in s)
    surfaces = []; run = [ups[0]]
    for y in ups[1:]:
        if y - run[-1] < 0.15: run.append(y)
        else: surfaces.append(run[-1]); run = [y]
    surfaces.append(run[-1])
    fl = []
    for h in surfaces:
        above = next((y for y in ys if y > h + 0.30), None)
        if above is not None and above - h < HEADROOM: continue
        solid = any(h + BAND[0] < y < h + BAND[1] for y in ys)
        fl += [round(h, 2), 1 if solid else 0, 99.0 if above is None else round(above, 2)]
    if fl: out.append([key % gw, key // gw, fl])
walkd = dict(cell=CELL, gw=gw, gh=gh, x0=round(wx0, 4), z0=round(wz0, 4), cells=out, storeyed=True,
             bounds=[[round(v, 3) for v in lo], [round(v, 3) for v in hi]])
log('walk %dx%d, %d cells with a floor; bounds %s .. %s' % (gw, gh, len(out), walkd['bounds'][0], walkd['bounds'][1]))

# ---- write: one mesh per material, welded by exact (position, uv)
blob = bytearray(); views = []; accessors = []; meshes = []; nodes = []
def emit(data, target):
    blob.extend(b'\0' * ((4 - len(blob) % 4) % 4)); off = len(blob); blob.extend(data)
    views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data), 'target': target}); return len(views) - 1
used = sorted(meshes_m)
mat_ids = sorted(set(k[0] for k in used)); mat_of = {mi: i for i, mi in enumerate(mat_ids)}
for k, mi in enumerate(used):
    vmap = {}; pos = []; uvs = []; idx = []
    for t in meshes_m[mi]:
        for (p, uv) in t:
            key = (p, (round(uv[0], 5), round(uv[1], 5)))
            q = vmap.get(key)
            if q is None: q = vmap[key] = len(pos); pos.append(p); uvs.append(key[1])
            idx.append(q)
    wide = len(pos) > 65535
    pa = len(accessors); accessors.append({'bufferView': emit(b''.join(struct.pack('<fff', *p) for p in pos), 34962), 'componentType': 5126, 'count': len(pos), 'type': 'VEC3',
                                           'min': [min(p[i] for p in pos) for i in range(3)], 'max': [max(p[i] for p in pos) for i in range(3)]})
    ua = len(accessors); accessors.append({'bufferView': emit(b''.join(struct.pack('<ff', *u) for u in uvs), 34962), 'componentType': 5126, 'count': len(uvs), 'type': 'VEC2'})
    ia = len(accessors); accessors.append({'bufferView': emit(b''.join(struct.pack('<I' if wide else '<H', i) for i in idx), 34963), 'componentType': 5125 if wide else 5123, 'count': len(idx), 'type': 'SCALAR'})
    name = (mi[1] + '_' if mi[1] else '') + g['materials'][mi[0]]['name']
    meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': pa, 'TEXCOORD_0': ua}, 'indices': ia, 'material': mat_of[mi[0]]}]})
    nodes.append({'name': name, 'mesh': k})
mats, texs, imgs = [], [], []
for mi in mat_ids:
    m = g['materials'][mi]
    pbr = m.get('pbrMetallicRoughness', {})
    nm = {'name': m['name'], 'pbrMetallicRoughness': {'metallicFactor': 0.0, 'roughnessFactor': 1.0, 'baseColorFactor': pbr.get('baseColorFactor', [1, 1, 1, 1])}}
    if m.get('doubleSided'): nm['doubleSided'] = True
    if m.get('alphaMode') and m['alphaMode'] != 'OPAQUE': nm['alphaMode'] = m['alphaMode']; nm['alphaCutoff'] = m.get('alphaCutoff', 0.5)
    bt = pbr.get('baseColorTexture')
    if bt:
        src = g['textures'][bt['index']]['source']; uri = g['images'][src]['uri']
        data = open(os.path.join(base, uri), 'rb').read()
        bv = len(views); blob.extend(b'\0' * ((4 - len(blob) % 4) % 4)); off = len(blob); blob.extend(data)
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data)})
        imgs.append({'bufferView': bv, 'mimeType': 'image/png' if uri.endswith('.png') else 'image/jpeg'})
        texs.append({'source': len(imgs) - 1, 'sampler': 0})
        nm['pbrMetallicRoughness']['baseColorTexture'] = {'index': len(texs) - 1}
    mats.append(nm)
blob.extend(b'\0' * ((4 - len(blob) % 4) % 4))
root = {'name': 'bw_kelley', 'children': list(range(1, len(nodes) + 1)), 'extras': {'bw_walk': json.dumps(walkd, separators=(',', ':'))}}
G = {'asset': {'version': '2.0', 'generator': 'beachwalk kelley_pack.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}],
     'nodes': [root] + nodes, 'meshes': meshes, 'materials': mats, 'textures': texs, 'images': imgs,
     'samplers': [{'magFilter': 9728, 'minFilter': 9728, 'wrapS': 10497, 'wrapT': 10497}],
     'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': len(blob)}]}
js = json.dumps(G, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
bwio.write_bytes(DST, glb)
log('%s: %.2f MB raw, %.2f MB on disk, %d meshes, %d tris' % (DST, len(glb) / 1e6, os.path.getsize(DST) / 1e6, len(meshes), sum(len(v) for v in meshes_m.values())))
