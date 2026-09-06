"""Build assets/bunker.glb from Bohdan Lvov's "Underground Bunker" (Sketchfab, CC-BY-4.0).

    python3 tools/bunker_pack.py            # preps the textures, then runs Blender on itself
    python3 tools/bunker_pack.py --exterior # keep the hill, the grass and the tree above it

An EXACT replica of the room is the brief, so nothing in here is decimated and
no map is resized: every interior mesh ships at the scan's own triangle count
(~170k) and every texture at its own size. The one liberty is the metal-rough
maps, which arrive as 1-2 MB PNGs each (14 MB of the 24) and go out as q92
JPEGs — a roughness map has no alpha and the difference does not survive a
render. Anything with alpha stays PNG.

What Blender is FOR here: the scan is one 400-frame action ("HatchOpening")
driving 120 objects — the hatch and its cogs, the reels, the rotors, the
vent handles and every screen and panel light in the room — so the clip has
to come out of a real exporter with the hierarchy intact; the room is put on
its feet (floor at z = 0, centred on the origin) so the game can place it
with one transform; and the WALK is measured off the geometry itself: every
triangle between knee and head height is rasterised onto a 0.1 m grid, which
is what makes the desks, the safes, the ladder and the lockers solid without
a hand-placed box for each. The grid, the lamps (found by sampling the
emissive map at every face of the lamp mesh), the room's box and the doors go
into the GLB itself as extras on the root node — `userData.bw_nav` when
three loads it — so the model and its walkability are one file.

The exterior (a hilltop of 264k grass cards, a tree, a bird) is dropped by
default: the room is what was asked for, and where it goes is not decided.
"""
import json, os, sys, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC_DIR = '/Users/ethanreedy/Downloads/underground_bunker'
SRC = os.path.join(SRC_DIR, 'scene.gltf')
OUT = os.path.join(ROOT, 'assets', 'bunker.glb')
SP = '/private/tmp/claude-501/-Users-ethanreedy-Dev-beachwalk/86ac18b9-ad0c-4a6c-974a-c4c4d6a8f782/scratchpad/bunker'
STAGE = os.path.join(SP, 'stage')
KEEP_EXTERIOR = '--exterior' in sys.argv
EXTERIOR_MATS = ('GrassTransp', 'FloorGrass', 'TreeMat')
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'

def log(*a): print('[bunker]', *a); sys.stdout.flush()

try:
    import bpy
except ImportError:
    bpy = None

# ----------------------------------------------------------------------
# Stage 1 (system python): the textures, and a copy of the glTF that names them
# ----------------------------------------------------------------------
if bpy is None:
    from PIL import Image
    os.makedirs(os.path.join(STAGE, 'textures'), exist_ok=True)
    g = json.load(open(SRC))
    for im in g['images']:
        uri = im['uri']
        src = os.path.join(SRC_DIR, uri)
        name = os.path.basename(uri)
        if name.endswith('.png') and 'metallicRoughness' in name:
            # roughness/metal data, no alpha: JPEG at q92 is not a change you can render
            out = os.path.splitext(name)[0] + '.jpg'
            Image.open(src).convert('RGB').save(os.path.join(STAGE, 'textures', out), quality=92, subsampling=0)
            im['uri'] = 'textures/' + out
            im['mimeType'] = 'image/jpeg'
        else:
            out = name
            dst = os.path.join(STAGE, 'textures', out)
            if not os.path.exists(dst) or os.path.getsize(dst) != os.path.getsize(src):
                with open(src, 'rb') as a, open(dst, 'wb') as b: b.write(a.read())
        log('tex', uri, '->', im['uri'], os.path.getsize(os.path.join(STAGE, im['uri'])) // 1024, 'KB')
    # the binary buffer stays where it is
    for b in g['buffers']:
        if 'uri' in b and not b['uri'].startswith('data:'): b['uri'] = os.path.join(SRC_DIR, b['uri'])
    staged = os.path.join(STAGE, 'scene.gltf')
    json.dump(g, open(staged, 'w'))
    total = sum(os.path.getsize(os.path.join(STAGE, im['uri'])) for im in g['images']
                if not any(k in im['uri'] for k in EXTERIOR_MATS))
    log('interior textures', total // 1024, 'KB')
    r = subprocess.run([BLENDER, '-b', '--python', os.path.abspath(__file__), '--'] + sys.argv[1:])
    if r.returncode: sys.exit(r.returncode)
    # what came out
    with open(OUT, 'rb') as f:
        f.read(12); ln = int.from_bytes(f.read(4), 'little'); f.read(4); j = json.loads(f.read(ln))
    tris = 0
    for m in j['meshes']:
        for p in m['primitives']:
            tris += j['accessors'][p['indices']]['count'] // 3 if 'indices' in p else j['accessors'][p['attributes']['POSITION']]['count'] // 3
    log('glb', os.path.getsize(OUT) // 1024, 'KB;', len(j['nodes']), 'nodes', len(j['meshes']), 'meshes', tris, 'tris',
        len(j.get('images', [])), 'images', len(j.get('animations', [])), 'animations',
        [(a['name'], len(a['channels'])) for a in j.get('animations', [])])
    ex = j['nodes'][j['scenes'][0]['nodes'][0]].get('extras', {})
    log('root extras', list(ex.keys()), 'nav bytes', len(ex.get('bw_nav', '')))
    sys.exit(0)

# ----------------------------------------------------------------------
# Stage 2 (Blender)
# ----------------------------------------------------------------------
import math
import numpy as np
from mathutils import Vector, Matrix

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(STAGE, 'scene.gltf'))
sc = bpy.context.scene
objs = list(bpy.data.objects)
log('imported', len(objs), 'objects')

def mat_of(o):
    return o.material_slots[0].material.name if o.type == 'MESH' and o.material_slots and o.material_slots[0].material else ''

# ---- the exterior goes, and the armature that swayed its grass
if not KEEP_EXTERIOR:
    gone = [o for o in objs if o.type == 'MESH' and mat_of(o) in EXTERIOR_MATS]
    for o in gone: bpy.data.objects.remove(o, do_unlink=True)
    # The armature that swayed the grass is the PARENT OF THE WHOLE SCENE
    # (Object_4 sits between the Sketchfab root and every room part), so
    # removing it outright orphans the room and drops the root's 0.1 scale
    # with it — the first build came out ten times life size. Its children
    # are handed to its parent, each keeping the transform it had.
    for arm in [o for o in bpy.data.objects if o.type == 'ARMATURE']:
        log('armature', arm.name, 'local identity:', arm.matrix_local == Matrix.Identity(4), 'children', len(arm.children))
        for c in list(arm.children):
            mw = c.matrix_world.copy()
            c.parent = arm.parent; c.matrix_parent_inverse = Matrix.Identity(4)
            c.matrix_world = mw
        bpy.data.objects.remove(arm, do_unlink=True)
    log('dropped', len(gone), 'exterior meshes')
    # empties left with nothing under them and nothing animated
    changed = True
    while changed:
        changed = False
        for o in list(bpy.data.objects):
            if o.type == 'EMPTY' and not o.children and not (o.animation_data and o.animation_data.action):
                bpy.data.objects.remove(o, do_unlink=True); changed = True
    for m in list(bpy.data.materials):
        if m.users == 0: bpy.data.materials.remove(m)
    for im in list(bpy.data.images):
        if im.users == 0: bpy.data.images.remove(im)
bpy.context.view_layer.update()

# ---- world-space bounds per object (metres, Blender z-up)
def wbounds(o):
    M = o.matrix_world
    pts = [M @ v.co for v in o.data.vertices]
    xs = [p.x for p in pts]; ys = [p.y for p in pts]; zs = [p.z for p in pts]
    return (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
floor = next(o for o in meshes if mat_of(o) == 'MetalFloor')
fb = wbounds(floor)
cx, cy, fz = (fb[0] + fb[3]) / 2, (fb[1] + fb[4]) / 2, fb[5]
log('floor top z %.3f centre (%.3f, %.3f)' % (fz, cx, cy))

# ---- on its feet: everything under one root, floor at z = 0, room centred
root = bpy.data.objects.new('BunkerRoot', None)
sc.collection.objects.link(root)
for o in list(bpy.data.objects):
    if o is root or o.parent is not None: continue
    o.parent = root
    o.matrix_parent_inverse = Matrix.Identity(4)
root.location = (-cx, -cy, -fz)
bpy.context.view_layer.update()

fb = wbounds(floor); wall = next(o for o in meshes if mat_of(o) == 'Wall'); wb = wbounds(wall)
room = dict(x0=round(wb[0], 3), y0=round(wb[1], 3), x1=round(wb[3], 3), y1=round(wb[4], 3), z1=round(wb[5], 3))
log('room (blender x, y; z up):', room, 'floor', [round(v, 3) for v in fb])

# ---- what the animation moves: the hatch and its gear
def descendants(o):
    for c in o.children:
        yield c
        yield from descendants(c)
for nm in ('HatchControl', 'GateCOg01', 'GateCOg02'):
    o = bpy.data.objects.get(nm)
    if not o: continue
    kids = [d for d in descendants(o) if d.type == 'MESH']
    bb = [wbounds(k) for k in kids]
    if bb:
        log('anim', nm, 'meshes', len(kids), 'bounds x %.2f..%.2f y %.2f..%.2f z %.2f..%.2f' % (
            min(b[0] for b in bb), max(b[3] for b in bb), min(b[1] for b in bb), max(b[4] for b in bb), min(b[2] for b in bb), max(b[5] for b in bb)))
ladder = bpy.data.objects.get('Ladder_DoorsVents_0')
lb = wbounds(ladder) if ladder else None
doors = []
for nm in ('Door_DoorsVents_0', 'Door1_DoorsVents_0'):
    o = bpy.data.objects.get(nm)
    if o: doors.append([round(v, 3) for v in wbounds(o)])
log('ladder', lb and [round(v, 2) for v in lb], 'doors', doors)

# ---- the lamps: sample the emissive map at every face of the lamp material
lamps = []
em_img = bpy.data.images.get('LightNTransparency_emissive') or next((i for i in bpy.data.images if 'LightNTransparency_emissive' in i.name), None)
if em_img is not None:
    W, H = em_img.size
    px = np.array(em_img.pixels[:], dtype=np.float32).reshape(H, W, 4)
    lum = px[..., :3].max(axis=2)
    pts = []
    for o in meshes:
        if mat_of(o) != 'LightNTransparency' or not o.data.uv_layers: continue
        uv = o.data.uv_layers.active.data
        M = o.matrix_world
        for p in o.data.polygons:
            u = sum(uv[l].uv.x for l in p.loop_indices) / len(p.loop_indices)
            v = sum(uv[l].uv.y for l in p.loop_indices) / len(p.loop_indices)
            i = min(W - 1, max(0, int((u % 1.0) * W))); j = min(H - 1, max(0, int((v % 1.0) * H)))
            if lum[j, i] > 0.45:
                c = M @ p.center
                pts.append((c.x, c.y, c.z, p.area))
    # cluster by proximity
    clusters = []
    for x, y, z, a in pts:
        for c in clusters:
            if math.hypot(x - c['x'] / c['w'], y - c['y'] / c['w'], z - c['z'] / c['w']) < 0.55:
                c['x'] += x * a; c['y'] += y * a; c['z'] += z * a; c['w'] += a; c['n'] += 1; break
        else:
            clusters.append(dict(x=x * a, y=y * a, z=z * a, w=a, n=1))
    for c in clusters:
        if c['n'] < 3 or c['w'] < 0.002: continue
        lamps.append([round(c['x'] / c['w'], 3), round(c['y'] / c['w'], 3), round(c['z'] / c['w'], 3), round(c['w'], 4)])
    lamps.sort(key=lambda l: -l[3])
    log('emissive faces', len(pts), 'lamp clusters', len(lamps))
    for l in lamps: log('  lamp at x %.2f y %.2f z %.2f  area %.4f' % tuple(l))

# ---- the walk: every triangle between knee and head height, on a 0.1 m grid
CELL = 0.1
BAND = (0.30, 1.95)          # above the floor: below this you step over it, above it is over your head
SKIP = ('Wall', 'MetalFloor', 'Roof', 'Shadows', 'LightReflectd')
gx0, gy0 = room['x0'], room['y0']
GW = int(math.ceil((room['x1'] - gx0) / CELL)); GH = int(math.ceil((room['y1'] - gy0) / CELL))
grid = np.zeros((GH, GW), dtype=np.uint8)
def mark_tri(a, b, c):
    """Mark the cells this triangle actually OCCUPIES between knee and head
    height. The first version marked every cell in the triangle's 2-D
    bounding box as long as ANY corner of it was in the band — so a cable
    hanging from the ceiling to the floor, or a roof beam sloping down,
    laid its whole footprint on the floor as a wall, and the room came out
    with invisible barriers across it. The height has to be interpolated at
    the cell, not taken from the triangle as a whole: sample the surface on
    a lattice fine enough that no cell is missed, and mark a cell only where
    the surface passing over it is in the band."""
    xs = (a.x, b.x, c.x); ys = (a.y, b.y, c.y)
    if max(xs) < gx0 or min(xs) > gx0 + GW * CELL: return
    if max(ys) < gy0 or min(ys) > gy0 + GH * CELL: return
    # a lattice step of half a cell never skips a cell, and never more than 64 a side
    span = max(max(xs) - min(xs), max(ys) - min(ys))
    n = int(min(64, max(2, math.ceil(span / (CELL * 0.5)))))
    for i in range(n + 1):
        u = i / n
        for j in range(n - i + 1):
            v = j / n
            w = 1.0 - u - v
            z = a.z * w + b.z * u + c.z * v
            if z < BAND[0] or z > BAND[1]: continue
            x = a.x * w + b.x * u + c.x * v
            y = a.y * w + b.y * u + c.y * v
            gi = int((x - gx0) / CELL); gj = int((y - gy0) / CELL)
            if 0 <= gi < GW and 0 <= gj < GH: grid[gj, gi] = 1
ntri = 0
# `BW_DEBUG_CELL=x,y` names one spot (blender metres) and logs every triangle that marks it
DBG = os.environ.get('BW_DEBUG_CELL')
if DBG:
    _dx, _dy = [float(v) for v in DBG.split(',')]
    _di, _dj = int((_dx - gx0) / CELL), int((_dy - gy0) / CELL)
    _mark = mark_tri
    def mark_tri(a, b, c):
        before = grid[_dj, _di]
        _mark(a, b, c)
        if not before and grid[_dj, _di]:
            log('DEBUG cell marked by', _cur.name, 'tri x %.2f..%.2f y %.2f..%.2f z %.2f..%.2f' % (
                min(a.x, b.x, c.x), max(a.x, b.x, c.x), min(a.y, b.y, c.y), max(a.y, b.y, c.y), min(a.z, b.z, c.z), max(a.z, b.z, c.z)))
            grid[_dj, _di] = 0
for o in meshes:
    if mat_of(o) in SKIP: continue
    # a bare 1 m icosphere sits at the room's centre with no material — a
    # placeholder the exporter drops, and the first grid had a two-metre
    # disc of nothing in the middle of the floor you could not walk through
    if not mat_of(o) or o.hide_render or o.hide_get(): log('grid skips', o.name, repr(mat_of(o))); continue
    _cur = o
    M = o.matrix_world
    me = o.data
    co = [M @ v.co for v in me.vertices]
    me.calc_loop_triangles()
    for t in me.loop_triangles:
        a, b, c = co[t.vertices[0]], co[t.vertices[1]], co[t.vertices[2]]
        lo = min(a.z, b.z, c.z); hi = max(a.z, b.z, c.z)
        if hi < BAND[0] or lo > BAND[1]: continue
        mark_tri(a, b, c); ntri += 1
blocked = int(grid.sum())
log('grid %dx%d cells of %.2f m; %d tris in band; %d blocked (%.0f%%)' % (GW, GH, CELL, ntri, blocked, 100 * blocked / grid.size))
for j in range(GH - 1, -1, -1):
    log('  ' + ''.join('#' if v else '.' for v in grid[j]))
rows = [''.join('1' if v else '0' for v in grid[j]) for j in range(GH)]

nav = dict(cell=CELL, gw=GW, gh=GH, x0=gx0, y0=gy0, room=room, band=list(BAND), grid=rows, lamps=lamps,
           doors=doors, ladder=[round(v, 3) for v in lb] if lb else None,
           note='blender axes: x, y on the floor, z up; floor top at z=0; three: (x, z, -y)')
root['bw_nav'] = json.dumps(nav, separators=(',', ':'))

# ---- out. The clip is one action on 120 objects; ACTIONS mode with the
# action-name merge writes it as ONE glTF animation.
sc.frame_start = 0; sc.frame_end = 400
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True,
                          export_materials='EXPORT', export_image_format='AUTO', export_extras=True,
                          export_animations=True, export_animation_mode='ACTIONS', export_merge_animation='ACTION',
                          export_frame_range=False, export_force_sampling=True, export_optimize_animation_size=True,
                          export_skins=KEEP_EXTERIOR)
log('DONE', os.path.getsize(OUT), 'bytes')
