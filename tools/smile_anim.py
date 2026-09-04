"""Build assets/smile.glb from Vertex Mercher's "The smile (Rigged)" scan.

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/smile_anim.py

The download is a rig with no clips: 165k triangles, 21 bones, two tiny
flat-colour maps. This decimates it to ~22k, keeps the maps, and authors two
clips on its own bones -- `idle` (a tall thing standing very still, barely
breathing) and `run` (a flat-out sprint, arms and legs pumping, leaning into
it) -- and exports them as actions the way tools/crab_anim.py does.

Armature space is Blender's: Z up, the figure FACES +Y (the head juts out
that way). Blender +Y exports as glTF -Z, so in the game its front is -Z.
Bone map (from the heads/tails printed at import):
  _rootJoint  root       Bone_00     torso+neck+head, one bone, tip at the head
  Bone.001_01 hips       Bone.008_08 leg root
  L arm .002 .003 .004   R arm .005 .006 .007   (L is +X when facing +Y)
  R leg .009 .010 .011   L leg .012 .013 .014
"""
import bpy, os, sys, math
from mathutils import Vector, Quaternion
SRC = '/Users/ethanreedy/Downloads/the_smile__rigged/scene.gltf'
OUT = '/Users/ethanreedy/Dev/beachwalk/assets/smile.glb'
def log(*a): print("[smile]", *a); sys.stdout.flush()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.data.objects if o.type == 'MESH' and len(o.data.polygons) > 100]
for o in bpy.data.objects:
    if o.type == 'MESH' and o not in meshes: bpy.data.objects.remove(o)   # the stray icosphere

# ------------------------------------------------------------- decimate
budget = 22000.0
tot = sum(sum(len(p.vertices) - 2 for p in m.data.polygons) for m in meshes)
for m in meshes:
    bpy.context.view_layer.objects.active = m
    tris0 = sum(len(p.vertices) - 2 for p in m.data.polygons)
    if tris0 > 3000:
        d = m.modifiers.new("dec", 'DECIMATE'); d.decimate_type = 'COLLAPSE'
        d.ratio = min(1.0, budget / max(1, tot))
        am = next((x for x in m.modifiers if x.type == 'ARMATURE'), None)
        if am: m.modifiers.move(list(m.modifiers).index(am), len(m.modifiers) - 1)
        bpy.ops.object.modifier_apply(modifier="dec")
    for p in m.data.polygons: p.use_smooth = True
    log("mesh", m.name, tris0, "->", sum(len(p.vertices) - 2 for p in m.data.polygons))

# ------------------------------------------------------------- pose helpers
AX, AY, AZ = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
pbs = arm.pose.bones
for pb in pbs: pb.rotation_mode = 'QUATERNION'
def basis(pb): return pb.bone.matrix_local.to_3x3().inverted()
def setrot(name, *pairs):
    pb = pbs[name]; m = basis(pb); q = Quaternion((1, 0, 0, 0))
    for ax, ang in pairs:
        if ang: q = q @ Quaternion((m @ ax).normalized(), ang)
    pb.rotation_quaternion = q
def setloc(name, v): pbs[name].location = basis(pbs[name]) @ Vector(v)
def rest():
    for pb in pbs:
        pb.rotation_quaternion = Quaternion((1, 0, 0, 0)); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
def key(f):
    for pb in pbs:
        pb.keyframe_insert('rotation_quaternion', frame=f)
        if pb.name == '_rootJoint': pb.keyframe_insert('location', frame=f)
def new_action(name):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    if not arm.animation_data: arm.animation_data_create()
    arm.animation_data.action = act
    try: arm.animation_data.action_slot = act.slots[0] if act.slots else act.slots.new(id_type='OBJECT', name="Legacy")
    except Exception: pass
    return act
def all_fcurves(act):
    if hasattr(act, 'fcurves'): return list(act.fcurves)
    out = []
    for lay in getattr(act, 'layers', []):
        for st in getattr(lay, 'strips', []):
            for cb in getattr(st, 'channelbags', []): out.extend(cb.fcurves)
    return out
def finish(act):
    fcs = all_fcurves(act)
    for fc in fcs:
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
    log("  action", act.name, "frames", tuple(act.frame_range), "curves", len(fcs))

L_ARM = ('Bone.002_02', 'Bone.003_03', 'Bone.004_04')
R_ARM = ('Bone.005_05', 'Bone.006_06', 'Bone.007_07')
R_LEG = ('Bone.009_09', 'Bone.010_010', 'Bone.011_011')
L_LEG = ('Bone.012_012', 'Bone.013_013', 'Bone.014_014')
# a limb hangs down -Z, so +angle about the armature X axis swings its tip toward +Y: forward
def arm_pose(A, swing=0.0, elbow=0.0, out=0.0, side=1):
    setrot(A[0], (AX, swing), (AY, out * side))
    setrot(A[1], (AX, elbow))           # the forearm folds FORWARD, the way an arm bends (minus was the arms flying up behind it)
    setrot(A[2], (AX, elbow * 0.2))
def leg_pose(Lg, swing=0.0, knee=0.0, foot=0.0):
    setrot(Lg[0], (AX, swing))
    setrot(Lg[1], (AX, -knee))          # the shin folds back
    setrot(Lg[2], (AX, foot))
def torso(lean=0.0, roll=0.0, twist=0.0, bob=0.0):
    setrot('Bone_00', (AX, -lean), (AY, roll), (AZ, twist))   # it points up: -X leans it forward
    setloc('_rootJoint', (0, 0, bob))

# ------------------------------------------------------------------ IDLE
# Dead still. The arms hang, nothing breathes. Over eight seconds the whole
# upper body tilts to one side by a few degrees, holds there, and comes
# back -- the way something looks at a thing it does not understand -- with
# a slight lean toward you. Nothing else moves at all. 240 frames, loops.
act = new_action('idle'); N = 240
def ease(t): return t * t * (3 - 2 * t)
for f in range(0, N + 1):
    rest()
    t = f / N
    # tilt: out over the first 30%, hold to 60%, back by 85%, still to the end
    if t < 0.30: k = ease(t / 0.30)
    elif t < 0.60: k = 1.0
    elif t < 0.85: k = 1.0 - ease((t - 0.60) / 0.25)
    else: k = 0.0
    torso(lean=0.05 + 0.02 * k, roll=0.16 * k, twist=0.04 * k, bob=0.0)
    arm_pose(L_ARM, swing=0.0, elbow=0.03, out=0.0, side=1)
    arm_pose(R_ARM, swing=0.0, elbow=0.03, out=0.0, side=-1)
    key(f)
finish(act)

# ------------------------------------------------------------------- RUN
# Fast and SMOOTH, not flailing: the legs work in a short, quick stride
# with the shin folding cleanly, the arms stay down and close to the body
# with only a small counter-swing, the torso leans into it and stays
# level. Played at 2x in the game it is an inhuman scurry, not a sprint
# cartoon. 20 frames a cycle.
act = new_action('run'); N = 20
for f in range(0, N + 1):
    rest()
    s = f / N * 2 * math.pi
    lsw = math.sin(s); rsw = math.sin(s + math.pi)
    def kn(sw): return max(0.0, -sw) * 0.7 + 0.16
    leg_pose(L_LEG, swing=0.42 * lsw, knee=kn(lsw), foot=0.15 * max(0.0, lsw))
    leg_pose(R_LEG, swing=0.42 * rsw, knee=kn(rsw), foot=0.15 * max(0.0, rsw))
    arm_pose(L_ARM, swing=0.08 * rsw - 0.12, elbow=1.4, out=-0.06, side=1)
    arm_pose(R_ARM, swing=0.08 * lsw - 0.12, elbow=1.4, out=-0.06, side=-1)
    torso(lean=0.18, roll=0.0, twist=0.02 * math.sin(s), bob=0.25 * abs(math.sin(s)) - 0.08)
    key(f)
finish(act)

# ------------------------------------------------- stash them all for export
ad = arm.animation_data
for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
for a in bpy.data.actions:
    tr = ad.nla_tracks.new(); tr.name = a.name
    tr.strips.new(a.name, int(a.frame_range[0]), a)
ad.action = None
rest()
for img in bpy.data.images:
    try: img.pack()
    except Exception: pass
log("exporting", OUT)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_apply=False,
    export_animations=True, export_animation_mode='ACTIONS',
    export_bake_animation=True, export_optimize_animation_size=True,
    export_yup=True, export_skins=True, export_materials='EXPORT',
    export_image_format='AUTO',
)
log("DONE", os.path.getsize(OUT))
