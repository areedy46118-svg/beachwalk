#!/usr/bin/env python3
"""Build assets/shrine.glb from the "Temple" FBX — the inside of the saucer.

    python3 tools/shrine_pack.py     # preps the textures, then runs Blender on itself

The abduction puts you inside a round colonnaded hall and the boss fight
happens there, so this is a room the player WALKS, and three things follow.

  * IT IS ONE OPEN DISC AND THE WALK IS ANALYTIC. Measured off the geometry:
    a flat floor from the axis out to r = 5.95, a ring of columns at r = 6.0
    with the wall behind them, and a ceiling running 1.42 m clear over the low
    ring at r = 2 out to 2.10 at the rim. A circle needs no rasterised nav
    grid the way the bunker's 416 objects did — the game clamps to a radius.
    What DOES have to come out of here is those numbers, so they ship inside
    the GLB as extras on the root node (`userData.bw_shrine`) rather than
    being copied into main.js by hand and going stale.
  * IT IS EXPORTED AT ITS OWN SIZE. The hall is 12.89 m across and 2.17 m
    tall, which is a doll's house — the player's eye is 1.7 and the monster is
    6.06 — so it has to be scaled up, and the game fits it against a target
    radius the way the head and the katana are fitted. Baking a guess in here
    would make it the one number nobody could tune.
  * THE AMBIENT OCCLUSION IS MULTIPLIED INTO THE ALBEDO, the mutant's lesson
    in a darker room: there is no moon inside a spaceship, the hall is lit off
    its own maps, and a crease that is not painted dark is not dark at all.

Nothing is decimated — 47,857 polys is the brief. The 108 MB of 2K/4K PNGs is
what actually has to go: every set is cut to 1024 (512 for the small centre
pieces nobody stands next to) and re-encoded as JPEG.
"""
import os, sys, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC_DIR = os.environ.get('SHRINE_SRC', os.path.join(
    os.path.expanduser('~'), 'AppData', 'Local', 'Temp', 'claude',
    'C--Users-areed-projects-beachwalk',
    '79655e97-9937-4ce9-b96f-d3067fbb794c', 'scratchpad', 'shrine'))
FBX = os.path.join(SRC_DIR, 'source', 'Temple.fbx')
TEX = os.path.join(SRC_DIR, 'textures')
OUT = os.path.join(ROOT, 'assets', 'shrine.glb')
STAGE = os.path.join(SRC_DIR, 'stage')
BLENDER = os.environ.get(
    'BLENDER', r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe')

# The hall's own axis and floor, measured off the import.
CX, CY, FLOOR_Z = 4.865, 3.215, 0.044

# Which set gets which budget. The big surfaces are the ones you stand on and
# walk past; the centre cluster is a metre of altar nobody puts their face
# against, and the glass is a skylight seen from ten metres below.
BIG = ('column', 'wall', 'ceiling_01', 'ceiling_02', 'main', 'main_floor',
       'floor_02', 'floor_03', 'floor_04')
COL_BIG, COL_SMALL = 1024, 512


def log(*a):
    print('[shrine]', *a)
    sys.stdout.flush()


try:
    import bpy
except ImportError:
    bpy = None

# ----------------------------------------------------------------------
# Stage 1 (system python): the maps
# ----------------------------------------------------------------------
if bpy is None:
    from PIL import Image, ImageChops
    if not os.path.exists(FBX):
        raise SystemExit('no Temple.fbx at ' + FBX)
    os.makedirs(STAGE, exist_ok=True)

    have = {f.lower(): os.path.join(TEX, f) for f in os.listdir(TEX)}

    def find(prefix, suffix):
        return have.get(('%s_%s.png' % (prefix, suffix)).lower())

    prefixes = sorted({f.lower().replace('_base_color.png', '')
                       for f in os.listdir(TEX)
                       if f.lower().endswith('_base_color.png')})
    log(len(prefixes), 'texture sets:', ', '.join(prefixes))

    manifest, total = {}, 0
    for p in prefixes:
        size = COL_BIG if p in BIG else COL_SMALL
        entry = {}
        base, ao = find(p, 'Base_color'), find(p, 'Mixed_AO')
        nrm, rgh, opa = find(p, 'Normal_OpenGL'), find(p, 'Roughness'), find(p, 'Opacity')
        if base:
            im = Image.open(base).convert('RGB').resize((size, size), Image.LANCZOS)
            if ao:
                a = Image.open(ao).convert('L').resize((size, size), Image.LANCZOS)
                # ease the AO before it multiplies: these bakes are contrasty and
                # a hard one turns every recess in the hall to pure black
                a = a.point(lambda v: int(255 * pow(v / 255.0, 0.80)))
                im = ImageChops.multiply(im, Image.merge('RGB', (a, a, a)))
            if opa:
                o = Image.open(opa).convert('L').resize((size, size), Image.LANCZOS)
                im = im.convert('RGBA')
                im.putalpha(o)
                path = os.path.join(STAGE, '%s_c.png' % p)
                im.save(path, optimize=True)
            else:
                path = os.path.join(STAGE, '%s_c.jpg' % p)
                im.save(path, quality=88, optimize=True)
            entry['color'] = os.path.basename(path)
            total += os.path.getsize(path)
        if nrm:
            im = Image.open(nrm).convert('RGB').resize((size, size), Image.LANCZOS)
            path = os.path.join(STAGE, '%s_n.jpg' % p)
            im.save(path, quality=90, optimize=True)
            entry['normal'] = os.path.basename(path)
            total += os.path.getsize(path)
        if rgh:
            # NOT shipped as a map. glTF has no roughness texture of its own —
            # it wants roughness in the G channel of a combined
            # metallicRoughness image, so Blender SYNTHESISES one per material
            # and a synthesised image is written as PNG: 17 of them was 3 MB,
            # a quarter of the file, for a variation this game cannot show
            # under one light with a flat-shaded retro look. Take the map's
            # own mean instead and ship it as the factor.
            im = Image.open(rgh).convert('L').resize((64, 64), Image.LANCZOS)
            px = list(im.getdata())
            entry['rough'] = round(sum(px) / len(px) / 255.0, 3)
        manifest[p] = entry
        log('  %-16s %4d px  %s' % (p, size, ' '.join(sorted(entry))))
    json.dump(manifest, open(os.path.join(STAGE, 'manifest.json'), 'w'), indent=1)
    log('maps staged: %.1f MB' % (total / 1e6))

    log('running blender ...')
    r = subprocess.run([BLENDER, '-b', '--python', os.path.abspath(__file__)],
                       capture_output=True, text=True)
    # the whole thing to a file (a Blender run piped through head dies of
    # SIGPIPE), and only our own lines plus any traceback to the terminal
    blog = os.path.join(STAGE, 'blender.log')
    open(blog, 'w', encoding='utf-8', errors='replace').write(r.stdout + r.stderr)
    keep = False
    for line in (r.stdout + r.stderr).splitlines():
        if line.startswith('[shrine]'):
            print(line)
        if 'Traceback' in line:
            keep = True
        if keep:
            print(line)
    log('blender log ->', blog)
    raise SystemExit(r.returncode)

# ----------------------------------------------------------------------
# Stage 2 (blender): geometry, materials, extras, export
# ----------------------------------------------------------------------
import math
from mathutils import Vector

manifest = json.load(open(os.path.join(STAGE, 'manifest.json')))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=FBX)
objs = [o for o in bpy.data.objects if o.type == 'MESH']
log('imported', len(objs), 'meshes')

# --- THE FLOOR IS THE ARENA, so the middle of it has to be floor ------------
# The temple has an altar cluster standing on the axis — five pieces about a
# metre across and a metre tall. In a shrine that is the point of the room; in
# a boss arena it is a pillar in the middle of the ring that the fight has to
# be steered around, and it is the reason the first build's creature ground
# against the centre instead of coming at you. Anything SMALL, standing ON THE
# FLOOR and near the axis goes; the chandelier and the skylight hang well above
# head height and stay, because they are what the middle of the room looks like
# from underneath.
_gone = []
for o in list(objs):
    ws = [o.matrix_world @ Vector(c) for c in o.bound_box]
    r = max(math.hypot(w.x - CX, w.y - CY) for w in ws)
    z0 = min(w.z for w in ws) - FLOOR_Z
    z1 = max(w.z for w in ws) - FLOOR_Z
    if r < 2.0 and z0 < 1.2 and z1 > 0.15:
        _gone.append('%s (r%.2f z%.2f..%.2f)' % (o.name, r, z0, z1))
        bpy.data.objects.remove(o, do_unlink=True)
        objs.remove(o)
log('centre cleared:', ', '.join(_gone) if _gone else 'nothing matched')

# --- put it on its feet: axis at the origin, floor at z = 0 ---------------
for o in objs:
    o.matrix_world.translation += Vector((-CX, -CY, -FLOOR_Z))
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for o in objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def img(name):
    return bpy.data.images.load(os.path.join(STAGE, name), check_existing=True)


for m in bpy.data.materials:
    ent = manifest.get(m.name.lower())
    if ent is None:
        log('  ! no maps for material', m.name)
        continue
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    if 'color' in ent:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = img(ent['color'])
        nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
        if ent['color'].endswith('.png'):
            nt.links.new(t.outputs['Alpha'], bsdf.inputs['Alpha'])
            m.blend_method = 'BLEND'
    if 'rough' in ent:
        bsdf.inputs['Roughness'].default_value = float(ent['rough'])
    if 'normal' in ent:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = img(ent['normal'])
        t.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(t.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Metallic'].default_value = 0.0
    log('  material %-16s %s' % (m.name, ' '.join(sorted(ent))))

# --- measure the room, for the game ---------------------------------------
# A RAY IS THE WRONG INSTRUMENT FOR A ROOM THAT HAS SOMETHING IN THE MIDDLE.
# Casting down from above to find "the floor" lands on the ALTAR wherever the
# altar is, so the first build reported an 8 cm ceiling and then a hall 30 cm
# across. The vertices already know the answer: bin every one of them by
# radius, and the occupied height band at each radius IS the room's section.
import numpy as np

BODY = 0.10          # a vertex is a point; a body is not. Keep off the columns.
STAND = (0.12, 1.15)  # the band a standing body occupies, floor-relative
BIN = 0.05

rad, zed = [], []
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    co = np.empty(len(o.data.vertices) * 3, dtype=np.float64)
    o.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    m = np.array(o.matrix_world.to_4x4())
    w = co @ m[:3, :3].T + m[:3, 3]
    rad.append(np.hypot(w[:, 0], w[:, 1]))
    zed.append(w[:, 2])
rad = np.concatenate(rad)
zed = np.concatenate(zed)
nb = int(7.5 / BIN) + 1
occupied = np.zeros(nb, dtype=bool)   # something standing in the body band
floored = np.zeros(nb, dtype=bool)    # floor slab present
ceil = np.full(nb, np.inf)
bi = np.clip((rad / BIN).astype(int), 0, nb - 1)
stand = (zed > STAND[0]) & (zed < STAND[1])
flat = np.abs(zed) < 0.12
high = zed >= STAND[1]
np.logical_or.at(occupied, bi[stand], True)
np.logical_or.at(floored, bi[flat], True)
np.minimum.at(ceil, bi[high], zed[high])

# THE WALK IS THE LONGEST CLEAR RUN, and nothing else here is trustworthy.
# `floored` looked like the obvious test and is not: a wide flat annulus is
# made of big quads, so whole radial bins between one paving ring and the next
# hold no vertices at all and read as "no floor" — which is how the first three
# builds got a hall 30 cm across. The STANDING band is dense and honest, so ask
# it instead: the altar ends where things stop standing, the colonnade begins
# where they start again, and the gap between is the arena.
outer_b = int(np.max(np.nonzero(np.bincount(bi, minlength=nb))[0]))
best, run, start = (0, 0, 0), 0, 0
for b in range(outer_b + 1):
    if occupied[b]:
        run = 0
        start = b + 1
    else:
        run += 1
        if run > best[0]:
            best = (run, start, b)
_, ab, wb = best
altar_r = max(ab * BIN - 0.0, 0.0)
walk_r = max((wb + 1) * BIN - BODY, 0.0)
prof, last = [], None
for b in range(ab, wb + 1):
    if np.isfinite(ceil[b]):
        last = float(ceil[b])
    if last is not None:
        prof.append([round(b * BIN, 2), round(last, 3)])
head_min = min(p[1] for p in prof) if prof else 1.4
log('altar to r=%.2f   walk_r %.2f   lowest ceiling %.3f   (%d rings)'
    % (altar_r, walk_r, head_min, len(prof)))

mn, mx = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        for i in range(3):
            mn[i] = min(mn[i], w[i])
            mx[i] = max(mx[i], w[i])
log('bounds min %s max %s' % (tuple(round(v, 3) for v in mn),
                              tuple(round(v, 3) for v in mx)))

# extras ride on the scene so they land on the glTF root node as userData
bpy.context.scene['bw_shrine'] = {
    'walk_r': round(walk_r, 3),            # model units, floor at y = 0
    'altar_r': round(altar_r + BODY, 3),   # the centre mass you circle around
    'head_min': round(head_min, 3),
    'ceil': [v for p in prof for v in p],  # flat [r, ceilingY, r, ceilingY, ...]
    'outer_r': round(max(mx.x, mx.y), 3),
    'top': round(mx.z, 3),
}

tris = 0
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
log('tris', tris)
# The FBX importer goes looking for the model's own textures and finds all 68
# of the 2K/4K source PNGs next to it. They are orphaned the moment the
# materials are rebuilt, but they are still in the file, so drop them by name:
# only the staged maps survive.
staged = {v for e in manifest.values() for v in e.values() if isinstance(v, str)}
for im in list(bpy.data.images):
    if os.path.basename(im.filepath_raw) not in staged:
        bpy.data.images.remove(im)
for im in bpy.data.images:
    # AUTO picks PNG for anything it is not sure about. Only the skylight,
    # which carries the opacity map, needs an alpha channel.
    if not im.filepath_raw.lower().endswith('.png'):
        im.file_format = 'JPEG'
        im.alpha_mode = 'NONE'
    try:
        im.pack()
    except Exception:
        pass
log('images kept', len(bpy.data.images))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True,
                          export_yup=True, export_materials='EXPORT',
                          export_image_format='AUTO', export_animations=False,
                          export_extras=True)
log('DONE %s  %.2f MB' % (OUT, os.path.getsize(OUT) / 1e6))
