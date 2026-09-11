"""Render an 8-frame contact sheet per clip out of assets/monster.glb.

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --python tools/monster_strip.py -- OUTDIR [clip ...]

Three stills of a swing is barely better than none, and NOTHING about an
arthropod rig can be checked by reasoning: the femur points up and out and the
tibia comes down off it, so "+ angle about X" does not mean forward at the
foot the way it does on a leg that hangs. Every sign in the pose tables was
settled by looking at one of these. It renders from the GLB rather than the
blend so the strip is of the file that actually ships.
"""
import bpy, os, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
# IT TAKES ANY GLB NOW. It was written for the monster and every rigged
# creature since has wanted the same eight frames — pass a .glb first and it
# reads that one, otherwise it is still the monster's.
GLB = os.path.join(os.path.dirname(HERE), 'assets', 'monster.glb')
if argv and argv[0].lower().endswith('.glb'):
    GLB = argv.pop(0)
OUT = argv[0] if argv else '.'
WANT = [a.lower() for a in argv[1:]]
COLS, W, H = 8, 260, 230


def log(*a):
    print('[strip]', *a)
    sys.stdout.flush()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'SINGLE'
sc.display.shading.single_color = (0.58, 0.57, 0.60)
sc.display.shading.show_cavity = True
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.film_transparent = False
sc.world = bpy.data.worlds.new('w')
sc.world.color = (0.05, 0.05, 0.07)

# the model is glTF Y-up now, and it faces +Z
# AND `bound_box` IS A UNIT CUBE UNTIL THE DEPSGRAPH HAS RUN. Straight after
# an import it reads (-1..1) on every axis whatever the mesh is, which on the
# monster is close enough to be invisible and on a 1.9 m biped frames the shot
# a metre off. Read the VERTICES.
# AND THE FRAME COMES OFF THE BONES. `bound_box` is a unit cube until the
# depsgraph has run, and the RAW vertices of a skinned export are in whatever
# space the exporter wrote them in — the reptilian's read +-0.95 against a
# bind pose of +-0.36, and the inverse bind matrices are what put them right.
# Chasing the evaluated mesh through the depsgraph is a fight; the POSE BONES
# are already in world space and always correct, and a skeleton's extent is
# what you want to frame anyway.
bpy.context.view_layer.update()
mn, mx = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for pb in arm.pose.bones:
    for p in (arm.matrix_world @ pb.head, arm.matrix_world @ pb.tail):
        for i in range(3):
            mn[i] = min(mn[i], p[i])
            mx[i] = max(mx[i], p[i])
pad = max(mx - mn) * 0.16          # a skeleton is smaller than the skin on it
mn -= Vector((pad,) * 3)
mx += Vector((pad,) * 3)
ctr = (mn + mx) / 2
rad = max(mx - mn) / 2
log('bounds', tuple(round(v, 2) for v in mn), tuple(round(v, 2) for v in mx))

cd = bpy.data.cameras.new('c')
cam = bpy.data.objects.new('c', cd)
sc.collection.objects.link(cam)
sc.camera = cam
cd.lens = 46
# three-quarter front: it faces +Z, so stand off +Z and +X and look back at it
a = math.radians(34)
d = rad * 3.1
cam.location = ctr + Vector((math.sin(a) * d, rad * 0.55, math.cos(a) * d))
cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()

acts = [a for a in bpy.data.actions if not WANT or a.name.lower() in WANT]
if not arm.animation_data:
    arm.animation_data_create()
os.makedirs(OUT, exist_ok=True)
for act in acts:
    arm.animation_data.action = act
    try:
        arm.animation_data.action_slot = act.slots[0]
    except Exception:
        pass
    f0, f1 = [int(v) for v in act.frame_range]
    frames = [f0 + round((f1 - f0) * i / (COLS - 1.0)) for i in range(COLS)]
    tiles = []
    for i, f in enumerate(frames):
        sc.frame_set(f)
        p = os.path.join(OUT, '_t%02d.png' % i)
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        tiles.append(p)
    # stitch with Blender's own image API — no PIL in here
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
        os.remove(p)
    log('wrote strip_%s.png  frames %s' % (act.name, frames))
