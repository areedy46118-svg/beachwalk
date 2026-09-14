"""Eight frames of a clip out of assets/samurai.glb, framed on the MESHES.

    blender -b --python tools/samurai_strip.py -- OUTDIR [clip ...]

`monster_strip.py` frames on everything it imported, and this rig's `root`
bone is two units long before the node scale is applied, so the man came out a
speck in the middle of eleven units of empty. Nothing about a pose can be
checked by reasoning - every sign in the pose tables here was settled by
looking at one of these.
"""
import bpy
import os
import sys
import math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(os.path.dirname(HERE), 'assets', 'samurai.glb')
OUT = os.path.abspath(argv[0]) if argv else os.path.abspath('.')
WANT = [a.lower() for a in argv[1:]]
COLS, W, H = 8, 300, 420


def log(*a):
    print('[strip]', *a)
    sys.stdout.flush()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
sc = bpy.context.scene

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)

dg = bpy.context.evaluated_depsgraph_get()
lo = Vector((1e9,) * 3)
hi = Vector((-1e9,) * 3)
for o in meshes:
    e = o.evaluated_get(dg)
    me = e.to_mesh()
    for v in me.vertices:
        w = o.matrix_world @ v.co
        for i in range(3):
            lo[i] = min(lo[i], w[i])
            hi[i] = max(hi[i], w[i])
    e.to_mesh_clear()
mid = (lo + hi) * 0.5
size = max((hi - lo).x, (hi - lo).z)
log('mesh bounds %s %s  (%.2f tall)' % ([round(v, 2) for v in lo], [round(v, 2) for v in hi], (hi - lo).z))

# a three-quarter view from his front-left: he faces -Y
cam_d = size * 2.0
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam)
sc.camera = cam
ang = math.radians(35)
cam.location = (mid.x + math.sin(ang) * cam_d, mid.y - math.cos(ang) * cam_d, mid.z + size * 0.30)
# AIM IT WITH A CONSTRAINT. Building the rotation from a rotation_difference
# leaves the ROLL free - it came out with the man lying at forty-five degrees
# and it took a render to notice, because a tilted samurai still looks like a
# samurai. TRACK_TO keeps +Z up by construction.
tgt = bpy.data.objects.new('aim', None)
sc.collection.objects.link(tgt)
tgt.location = mid
tc = cam.constraints.new('TRACK_TO')
tc.target = tgt
tc.track_axis = 'TRACK_NEGATIVE_Z'
tc.up_axis = 'UP_Y'
cam.data.lens = 52
sc.world = bpy.data.worlds.new('w')
sc.world.use_nodes = False
sc.world.color = (0.16, 0.17, 0.20)

sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sc.collection.objects.link(sun)
sun.data.energy = 4.0
sun.rotation_euler = (math.radians(58), 0, math.radians(38))
sun2 = bpy.data.objects.new('sun2', bpy.data.lights.new('sun2', 'SUN'))
sc.collection.objects.link(sun2)
sun2.data.energy = 1.6
sun2.rotation_euler = (math.radians(64), 0, math.radians(210))

sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.film_transparent = False
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'TEXTURE'
try:
    sc.display.shading.show_shadows = True
except Exception:
    pass

acts = [a for a in bpy.data.actions if not WANT or a.name.lower() in WANT]
log('clips: %s' % ', '.join(a.name for a in acts))

if not arm.animation_data:
    arm.animation_data_create()
os.makedirs(OUT, exist_ok=True)
for act in acts:
    arm.animation_data.action = act
    # BINDING IS NOT ASSIGNING. Under Blender 5 an action drives nothing until
    # a SLOT is bound to it, and `act.slots[0]` on an action with no slots
    # raises - swallow that and the strip renders the bind pose eight times
    # over, which is exactly what it did: a T-posed samurai in every frame of
    # a clip the GLB demonstrably contained.
    try:
        arm.animation_data.action_slot = (act.slots[0] if act.slots
                                          else act.slots.new(id_type='OBJECT', name='Legacy'))
    except Exception as e:
        log('  could not bind %s: %s' % (act.name, e))
    f0, f1 = [int(v) for v in act.frame_range]
    frames = [f0 + round((f1 - f0) * i / (COLS - 1.0)) for i in range(COLS)]
    tiles = []
    for i, f in enumerate(frames):
        sc.frame_set(f)
        p = os.path.join(OUT, '_t%02d.png' % i)
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        tiles.append(p)
    # stitch with Blender's own image API - there is no PIL in here
    sheet = bpy.data.images.new('sheet', W * COLS, H)
    px = [0.0] * (W * COLS * H * 4)
    for i, p in enumerate(tiles):
        im = bpy.data.images.load(p)
        src = list(im.pixels)
        for y in range(H):
            ro = (y * W * COLS + i * W) * 4
            so = y * W * 4
            px[ro:ro + W * 4] = src[so:so + W * 4]
        bpy.data.images.remove(im)
    sheet.pixels = px
    sheet.filepath_raw = os.path.join(OUT, 'strip_%s.png' % act.name)
    sheet.file_format = 'PNG'
    sheet.save()
    bpy.data.images.remove(sheet)
    for p in tiles:
        if os.path.exists(p):
            os.remove(p)
    log('wrote strip_%s.png  frames %s' % (act.name, frames))
