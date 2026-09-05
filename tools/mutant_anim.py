"""Build assets/mutant.glb from the cgtrader "Mutant 01" pack.

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/mutant_anim.py

Unlike the crab and the tall one, this asset ARRIVES WITH ITS ANIMATION: a
70-bone HumanIK skeleton and seventeen separate FBXs, one clip each, all on
the same rig. So nothing is authored here — the job is to put the clips onto
the one mesh and get them out as glTF actions.

Four things it has to do:

  * The mesh comes from `base_mesh.fbx` — the animation FBXs carry a copy of
    it with NO UVs, so anything textured has to be built on the base mesh.
    Its four pieces (body, brain, two retopo groups) share one material and
    one UV set, so they join into a single skinned mesh.
  * Each clip is imported on its own copy of the rig, and only the ARMATURE's
    action is kept: the FBX also brings 83 HumanIK control empties, each with
    an action of its own, and all of that is dropped.
  * The FINGERS are dropped from every clip. Thirty-two of the seventy bones
    are finger joints that never move a pixel at the range this thing is seen
    at, and their baked curves are most of the animation data in the file.
  * The LOCOMOTION clips travel. Walk and run are authored moving forward, so
    the linear drift comes off the hips and they play on the spot; the game
    moves the body. Everything else keeps its motion, because a lunge that
    goes nowhere is not a lunge and a death has to fall.

THREE OF THEM COME AT YOU, and the pack ships three texture sets, so the
variations are the sets. `tools/mutant_tex.py` prepares all three (run it
first): it multiplies each set's ambient occlusion into its albedo — there is
one directional light in this game and nothing in a crease is ever shaded by
it, so the depth has to be in the map — and brings the whole thing down at
source rather than letting a shader lift it, which is the Military Shovel's
lesson. Set 02 is baked into the GLB; 01 and 03 ride beside it as JPEGs and
the game parses the one GLB three times and swaps the map.

AND THEY DO NOT MOVE ALIKE. The pack has two runs, two idles, two rages and
two deaths, so each variation gets its own: they are told apart at fifty
metres by their gait before you can see what colour they are. Sixteen clips
go out; `walk` is not among them, because nothing in this fight walks.
"""
import bpy, os, sys, math

SP = '/private/tmp/claude-501/-Users-ethanreedy-Dev-beachwalk/86ac18b9-ad0c-4a6c-974a-c4c4d6a8f782/scratchpad'
SRC = SP + '/mutant'
TEX = SP + '/tex'
OUT = '/Users/ethanreedy/Dev/beachwalk/assets/mutant.glb'

# clip name in the game  ->  the FBX it comes out of
CLIPS = [
    ('idle',   'Animation_fbx/mutant01@idle01.fbx'),
    ('idle2',  'Animation_fbx/mutant01@idle02.fbx'),
    ('run',    'Animation_fbx/mutant01@Run01.fbx'),
    ('run2',   'Animation_fbx/mutant01@Run02.fbx'),
    ('attack', 'Animation_fbx/mutant01@attack01.fbx'),
    ('attack2', 'Animation_fbx/mutant01@attack02.fbx'),
    ('attack3', 'Animation_fbx/mutant01@attack03.fbx'),
    ('attack4', 'Animation_fbx/mutant01@attack04.fbx'),
    ('strafeL', 'Animation_fbx/mutant01@strafe_left.fbx'),
    ('strafeR', 'Animation_fbx/mutant01@strafe_right.fbx'),
    ('back',   'Animation_fbx/mutant01@walk_back01.fbx'),
    ('back2',  'Animation_fbx/mutant01@walk_back02.fbx'),
    ('walk',   'Animation_fbx/mutant01@walk.fbx'),
    ('walk2',  'Animation_fbx/mutant01@walk02.fbx'),
    ('hit',    'Animation_fbx/mutant01@gethit.fbx'),
    ('die',    'Animation_fbx/mutant01@death01.fbx'),
    ('die2',   'Animation_fbx/mutant01@death02.fbx'),
    ('roar',   'update_animation/mutant01@Rage_01.fbx'),
    ('roar2',  'update_animation/mutant01@Rage_02.fbx'),
]
STRIP_DRIFT = {'run', 'run2', 'strafeL', 'strafeR', 'back', 'back2', 'walk', 'walk2'}          # authored travelling; the game moves the body
FINGERS = ('Thumb', 'Index', 'Middle', 'Ring', 'fingers')

def log(*a): print("[mutant]", *a); sys.stdout.flush()

def fcurves(act):
    if hasattr(act, 'fcurves') and len(act.fcurves): return list(act.fcurves)
    out = []
    for lay in getattr(act, 'layers', []):
        for st in getattr(lay, 'strips', []):
            for cb in getattr(st, 'channelbags', []): out.extend(cb.fcurves)
    return out

def drop_fcurve(act, fc):
    if hasattr(act, 'fcurves') and len(act.fcurves):
        act.fcurves.remove(fc); return
    for lay in getattr(act, 'layers', []):
        for st in getattr(lay, 'strips', []):
            for cb in getattr(st, 'channelbags', []):
                if fc in list(cb.fcurves): cb.fcurves.remove(fc); return

# ------------------------------------------------------------------ the mesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=SRC + '/base_mesh.fbx')
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
arm.name = 'mutant_rig'
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
log("imported", len(meshes), "mesh pieces,", len(arm.data.bones), "bones, arm scale", tuple(arm.scale))

bpy.ops.object.select_all(action='DESELECT')
for m in meshes: m.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
body.name = 'mutant'
tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
for p in body.data.polygons: p.use_smooth = True
log("joined ->", tris, "tris,", len(body.data.vertices), "verts, uv", len(body.data.uv_layers))

# the base mesh's action is the rest take; the clips come in below
for a in list(bpy.data.actions): bpy.data.actions.remove(a)

# ------------------------------------------------------------- the material
mat = bpy.data.materials.new('mutant')
mat.use_nodes = True
nt = mat.node_tree
bsdf = nt.nodes['Principled BSDF']
def tex_node(path, x, y, non_color=False):
    n = nt.nodes.new('ShaderNodeTexImage')
    n.image = bpy.data.images.load(path)
    if non_color: n.image.colorspace_settings.name = 'Non-Color'
    n.location = (x, y)
    return n
col = tex_node(TEX + '/mutant_pale_color.jpg', -700, 300)
rgh = tex_node(TEX + '/mutant_rough.jpg', -700, 0, True)
nrm = tex_node(TEX + '/mutant_normal.jpg', -700, -300, True)
nmap = nt.nodes.new('ShaderNodeNormalMap'); nmap.location = (-400, -300)
nt.links.new(col.outputs['Color'], bsdf.inputs['Base Color'])
nt.links.new(rgh.outputs['Color'], bsdf.inputs['Roughness'])
nt.links.new(nrm.outputs['Color'], nmap.inputs['Color'])
nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Metallic'].default_value = 0.0
body.data.materials.clear(); body.data.materials.append(mat)

# ------------------------------------------------------------------ the clips
kept = []
scaled = 0
worstScale = [0.0]
for name, rel in CLIPS:
    before = set(bpy.data.objects)
    try:
        bpy.ops.import_scene.fbx(filepath=SRC + '/' + rel)
    except Exception as e:
        log("SKIP", name, e); continue
    fresh = [o for o in bpy.data.objects if o not in before]
    src_arm = next((o for o in fresh if o.type == 'ARMATURE'), None)
    act = src_arm.animation_data.action if src_arm and src_arm.animation_data else None
    if act is None:
        log("SKIP", name, "no armature action")
        for o in fresh: bpy.data.objects.remove(o, do_unlink=True)
        continue
    src_arm.animation_data.action = None
    act.name = name
    act.use_fake_user = True

    # the fingers never read; their baked curves are most of the file
    dropped = 0
    for fc in fcurves(act):
        if fc.data_path.startswith('pose.bones["'):
            b = fc.data_path.split('"')[1]
            if any(f in b for f in FINGERS): drop_fcurve(act, fc); dropped += 1

    # THE SCALE CHANNELS COME OFF. The FBX bake keys location, rotation AND
    # scale on all seventy bones, and the scale is 1.0 everywhere -- a third
    # of the curves in the file carrying nothing. Worse: it means the mixer
    # WRITES a scale of 1 to every bone every frame, so the game cannot give
    # one variation a bigger head and another longer forearms by scaling its
    # bones. The animation stamps it back out. The worst deviation from 1.0 is
    # printed so this stays honest -- if a clip ever really does squash, that
    # number will say so and this has to come back.
    for fc in list(fcurves(act)):
        if fc.data_path.endswith('.scale'):
            for kp in fc.keyframe_points: worstScale[0] = max(worstScale[0], abs(kp.co[1] - 1.0))
            drop_fcurve(act, fc); scaled += 1

    # the hips: measure the travel, and take the linear part off a locomotion clip
    hips = [fc for fc in fcurves(act) if fc.data_path == 'pose.bones["Character1_Hips"].location']
    f0, f1 = act.frame_range
    travel = []
    for fc in sorted(hips, key=lambda c: c.array_index):
        a0, a1 = fc.evaluate(f0), fc.evaluate(f1)
        travel.append(round(a1 - a0, 1))
        if name in STRIP_DRIFT and abs(a1 - a0) > 1.0:
            for kp in fc.keyframe_points:
                t = (kp.co[0] - f0) / max(1e-6, f1 - f0)
                d = (a1 - a0) * t
                kp.co[1] -= d
                kp.handle_left[1] -= d; kp.handle_right[1] -= d
            fc.update()
    # WHERE THE BLOW LANDS. The game drives the attack clip's time from its own
    # combat clock, so the frame the damage is dealt on has to be the frame the
    # hand actually arrives — otherwise the tell and the hit are two different
    # events. Play the clip on the rig and find the frame where a hand is
    # furthest forward (Blender -Y is this rig's front) and moving fastest.
    if name.startswith('attack'):
        arm.animation_data.action = act
        try: arm.animation_data.action_slot = act.slots[0]
        except Exception: pass
        best, bestf, prev, fastf, fastv = 1e9, 0, None, 0, 0.0
        for f in range(int(f0), int(f1) + 1):
            bpy.context.scene.frame_set(f)
            bpy.context.view_layer.update()
            hands = [arm.matrix_world @ arm.pose.bones[b].head
                     for b in ('Character1_RightHand', 'Character1_LeftHand')]
            y = min(h.y for h in hands)
            if y < best: best, bestf = y, f
            if prev is not None:
                v = max((h - p).length for h, p in zip(hands, prev))
                if v > fastv: fastv, fastf = v, f
            prev = hands
        arm.animation_data.action = None
        log("   %s: hand furthest forward at f%d, fastest at f%d, of %d  ->  contact %.3f of the clip"
            % (name, bestf, fastf, int(f1), (bestf - f0) / max(1.0, f1 - f0)))
    for o in fresh: bpy.data.objects.remove(o, do_unlink=True)
    kept.append(name)
    log("clip %-8s frames %3d-%-3d  curves %4d (dropped %3d finger)  hips travel %s"
        % (name, f0, f1, len(fcurves(act)), dropped, travel))

# every other action the FBXs dragged in (83 HumanIK controls apiece)
for a in list(bpy.data.actions):
    if a.name not in kept: bpy.data.actions.remove(a)
log("actions kept:", [a.name for a in bpy.data.actions])
log("scale curves dropped:", scaled, "- worst deviation from 1.0 was %.4f" % worstScale[0])

# --------------------------------------------------------------- measurements
# what the game needs to know: how tall it is, and which way it faces
dg = bpy.context.evaluated_depsgraph_get()
bpy.context.view_layer.update()
zs = [(body.matrix_world @ v.co).z for v in body.data.vertices]
ys = [(body.matrix_world @ v.co).y for v in body.data.vertices]
xs = [(body.matrix_world @ v.co).x for v in body.data.vertices]
log("bounds  x %.2f..%.2f  y %.2f..%.2f  z %.2f..%.2f" % (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)))
def bone_head(n):
    b = arm.data.bones[n]; return arm.matrix_world @ b.head_local
heel, toe = bone_head('Character1_LeftFoot'), bone_head('Character1_LeftToeBase')
fwd = (toe - heel); fwd.z = 0
log("foot->toe (forward) = (%.2f, %.2f)  ie Blender %s" %
    (fwd.x, fwd.y, '+Y' if fwd.y > abs(fwd.x) else ('-Y' if fwd.y < -abs(fwd.x) else ('+X' if fwd.x > 0 else '-X'))))
log("height %.3f m (glTF: Blender Z becomes Y, Blender +Y becomes -Z)" % (max(zs) - min(zs)))

# --------------------------------------------------------- stash and export
ad = arm.animation_data or arm.animation_data_create()
for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
for a in bpy.data.actions:
    tr = ad.nla_tracks.new(); tr.name = a.name
    tr.strips.new(a.name, int(a.frame_range[0]), a)
ad.action = None
for img in bpy.data.images:
    try: img.pack()
    except Exception: pass
# ---------------------------------------------------- the other two skins
# Same sculpt, same UVs: only the albedo changes, so these ride alongside the
# GLB as plain JPEGs and the game swaps `map` on the copies it parses. They
# come out of tools/mutant_tex.py already occluded and already brought down.
import shutil
for tag in ('red', 'dark'):
    src = TEX + '/mutant_%s_color.jpg' % tag
    if not os.path.exists(src): log("SKIP skin", tag, "- run tools/mutant_tex.py first"); continue
    dst = '/Users/ethanreedy/Dev/beachwalk/assets/mutant-%s.jpg' % tag
    shutil.copyfile(src, dst)
    log("skin", tag, "->", os.path.getsize(dst) // 1024, "KB")

log("exporting", OUT)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_apply=False,
    export_animations=True, export_animation_mode='ACTIONS',
    export_bake_animation=True, export_optimize_animation_size=True,
    export_yup=True, export_skins=True, export_materials='EXPORT',
    export_image_format='AUTO',
)
log("DONE", os.path.getsize(OUT), "bytes")
