"""Build assets/alienbeast.glb — the third phase of the fight in the ship.

    "C:/Users/areed/AppData/Local/Programs/Python/Python312/python.exe" tools/alienbeast_pack.py

THIS ONE ARRIVED FINISHED. The monster came with a rig and no clips and the
reptilian with neither, so both had their whole move set authored; this .blend
carries a 171-bone rig AND ten hand-made actions — two idles, a walk, a run,
two bites, a hit, two deaths and a roll. Nothing here poses a single bone.
What it does is CHOOSE, CUT and MEASURE:

  choose  five meshes ship in the file (two baking cages, a 13k texture-test
          copy, the 53k body and the eyes). Only the body, the eyes and the
          saliva are the animal.
  cut     the two idles run 500 and 1000 frames. A creature's idle wants to be
          long enough not to read as a loop and no longer, so each clip is
          RESAMPLED out of its source over the window that is worth keeping.
  measure the game needs the fraction of each attack at which the blow lands,
          and the file does not say. It is found the way the monster's was —
          the head furthest forward, the claw fastest — and printed.

The resample is also what makes the clips SAFE. Blender 5 moved `Action.fcurves`
behind layers and channelbags, and slicing curves through that API is a fight;
sampling `matrix_basis` per frame and keying it into a fresh action sidesteps
it entirely, and it guarantees the one property this game has already paid for
twice: EVERY CLIP CARRIES EVERY CHANNEL, so a crossfade can never leave a bone
holding its pose from the clip before.

It faces -Y in Blender (the head bones sit at negative y and the hips at
positive), which exports as glTF +Z — the mutants' own convention, so
`atan2(dx, dz)` with NO `+ PI`.
"""
import os, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# WHERE THE DOWNLOAD LIVES, AND IT UNPACKS ITSELF. The first build read an
# extraction that happened to be sitting in a session temp directory, which
# means the day that directory is cleared this asset cannot be rebuilt at all.
# It reads the ZIP now, out of the folder the models were delivered to, and
# unpacks it beside itself once.
HOME = os.path.expanduser('~')
ALIENS = os.environ.get('ALIENS_DIR', os.path.join(HOME, 'OneDrive', 'Desktop', 'aliens'))
ZIP = os.path.join(ALIENS, 'Alien+Animal+Updated+in+Blender-2.81a.zip')
SRC = os.environ.get('BEAST_SRC', os.path.join(
    ALIENS, '_unpacked', 'Alien Animal Updated in Blender-2.81a'))
BLEND = os.path.join(SRC, 'Alien-Animal-Blender_2.81a_Packed.blend')
TEXDIR = os.path.join(SRC, 'textures')
OUT = os.path.join(ROOT, 'assets', 'alienbeast.glb')
STAGE = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Temp', 'claude',
                     'C--Users-areed-projects-beachwalk',
                     '79655e97-9937-4ce9-b96f-d3067fbb794c', 'scratchpad', 'beast_stage')
TEX = 1024
TRIS = 15000
BLENDER = os.environ.get(
    'BLENDER', r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe')


def log(*a):
    print('[beast]', *a)
    sys.stdout.flush()


COLOUT = os.path.join(STAGE, 'beast_color.jpg')
NRMOUT = os.path.join(STAGE, 'beast_nrm.jpg')
RGHOUT = os.path.join(STAGE, 'beast_rgh.jpg')
EYEOUT = os.path.join(STAGE, 'beast_eye.jpg')

# The monster's rule and the reptilian's numbers: DARKENING A MAP IS A LEVEL
# CHANGE AND MUST NOT BE A RANGE CHANGE, so the albedo is remapped to a target
# mean AND spread rather than multiplied down.
# AND IT WAS STILL TOO DARK ON SCREEN. 44 is where the beach's mutants sit and
# they are lit by a quarter moon over open sand; this one stands in a stone
# drum with two dim lamps in it and nothing bouncing, so the same number
# renders as a grey shape. It ships brighter than the pack for the same reason
# the monster does — the room is the difference.
TEX_MEAN = 58.0
TEX_SD = 27.0
TEX_SAT = 1.40                     # a dark map reads flatter than it measures


# ------------------------------------------------------- the grade, honestly
# A PER-CHANNEL REMAP IS A COLOUR REMOVER — the reptilian's own note, and this
# file had the identical bug. Pulling R, G and B each to their own target mean
# and spread, with gains near one, is the same target for all three, so
# whatever hue the map had was normalised away by construction: this creature
# ships a WARM hide (source mean RGB 85, 81, 76, saturation 0.118) and came
# out 44, 44, 44 — neutral to three figures, saturation 0.070. A `SCENE_BLUE`
# mix over the top finished the job.
#
# What needed changing was never the colour, it was the LEVEL: these maps are
# authored for a studio and the hall has two dim lamps. So the remap is on
# LUMINANCE ALONE and every pixel keeps its own distance from its own
# luminance, which passes hue and saturation through untouched. Darkening does
# cost apparent saturation, so the chroma is given a little back.
def grade(im, mean, sd, sat_boost=1.0):
    import numpy as np
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    lum = a[:, :, 0] * 0.299 + a[:, :, 1] * 0.587 + a[:, :, 2] * 0.114
    m0, s0 = float(lum.mean()), float(max(1e-3, lum.std()))
    newlum = (lum - m0) * (sd / s0) + mean
    out = np.empty_like(a)
    for i in range(3):
        out[:, :, i] = newlum + (a[:, :, i] - lum) * sat_boost
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB'), m0, s0
# THE EYES ARE NOT GRADED LIKE THE HIDE. Everything else on this creature is
# pulled down to sit in an unlit hall, and eyes that get the same treatment are
# two more dark patches on a dark animal — they are the one part of it that
# should catch what light there is, so they keep their contrast and are only
# brought down a little. They are also small on screen, so they ship at a
# quarter of the body's map.
EYE_TEX = 512
# ROUGHNESS IS LOW-FREQUENCY AND MUST NOT SHIP AS PNG. Blender's exporter
# writes a generated metallic-roughness pack as PNG under 'AUTO', which put a
# 1024 map into the file at 1000 KB against the 198 KB the albedo costs at the
# same size — on the one asset whose download the abduction's cut waits for.
# Half the size and forced to JPEG: 1000 KB becomes about 60.
RGH_TEX = 512
EYE_MEAN = 76.0
EYE_SD = 46.0
EYE_SAT = 1.45                     # an eye is the one part allowed to be vivid

try:
    import bpy
except ImportError:
    bpy = None

if bpy is None:
    import subprocess
    from PIL import Image, ImageStat
    os.makedirs(STAGE, exist_ok=True)
    if not os.path.isdir(TEXDIR) and os.path.exists(ZIP):
        import zipfile
        log('unpacking %s ...' % os.path.basename(ZIP))
        zipfile.ZipFile(ZIP).extractall(os.path.join(ALIENS, '_unpacked'))
    if not os.path.isdir(TEXDIR):
        raise SystemExit("[beast] cannot find %s — put the download's zip in %s"
                         % (TEXDIR, ALIENS))
    raw = Image.open(os.path.join(TEXDIR, 'Alien-Animal-Base-Color.jpg'))
    raw = raw.convert('RGB').resize((TEX, TEX), Image.LANCZOS)
    col, _m0, _s0 = grade(raw, TEX_MEAN, TEX_SD, TEX_SAT)
    col.save(COLOUT, quality=90, optimize=True)
    st0, st1 = ImageStat.Stat(raw), ImageStat.Stat(col)
    log('albedo %d px  luminance %.0f -> %.0f (sd %.1f -> %.1f)  RGB %s -> %s  (%d KB)'
        % (TEX, _m0, ImageStat.Stat(col.convert('L')).mean[0], _s0,
           ImageStat.Stat(col.convert('L')).stddev[0],
           [round(v) for v in st0.mean], [round(v) for v in st1.mean],
           os.path.getsize(COLOUT) // 1024))
    nrm = Image.open(os.path.join(TEXDIR, 'Alien-Animal-Base-Nor.jpg'))
    nrm.convert('RGB').resize((TEX, TEX), Image.LANCZOS).save(NRMOUT, quality=88, optimize=True)
    log('normal %d px (%d KB)' % (TEX, os.path.getsize(NRMOUT) // 1024))

    # THE DOWNLOAD SHIPPED SEVEN MAPS AND THE FIRST BUILD USED TWO. What was
    # left on the floor: a GLOSS map with real variation in it (mean 119,
    # stddev 28), so the creature went out at one flat roughness over its
    # whole body and nothing on it read as wet; and an EYE map, while the eye
    # mesh was wearing the body's skin. Gloss is the inverse of roughness,
    # which is the whole conversion.
    # VERIFIED AGAINST THE ARTIST'S OWN ROUGHNESS MAP. The 2.93 "Baked
    # Animations" build of this asset ships `Alien-Animal-Base-Ro.jpg` where
    # this one ships gloss, and the inversion below reproduces it: mean 135.9
    # against 135.9, standard deviation 29.5 against 29.5, correlation 0.9999,
    # worst pixel 2 out of 255. Gloss inverted IS the roughness.
    gl = Image.open(os.path.join(TEXDIR, 'Alien-Animal-Base-Gloss.jpg'))
    gl = gl.convert('L').resize((RGH_TEX, RGH_TEX), Image.LANCZOS)
    rgh = gl.point(lambda v: 255 - v)
    st_r = ImageStat.Stat(rgh)
    rgh.convert('RGB').save(RGHOUT, quality=88, optimize=True)
    log('roughness %d px  (gloss inverted) mean %.0f  sd %.1f  (%d KB)'
        % (RGH_TEX, st_r.mean[0], st_r.stddev[0], os.path.getsize(RGHOUT) // 1024))

    eye_raw = Image.open(os.path.join(TEXDIR, 'Alien-Animal_eye.jpg')).convert('RGB')
    eye_raw = eye_raw.resize((EYE_TEX, EYE_TEX), Image.LANCZOS)
    st_e0 = ImageStat.Stat(eye_raw)
    eye, _em, _es = grade(eye_raw, EYE_MEAN, EYE_SD, EYE_SAT)
    eye.save(EYEOUT, quality=92, optimize=True)
    st_e = ImageStat.Stat(eye)
    log('eye %d px  mean %s -> %s  (%d KB)'
        % (EYE_TEX, [round(v) for v in st_e0.mean], [round(v) for v in st_e.mean],
           os.path.getsize(EYEOUT) // 1024))
    log('running blender ...')
    r = subprocess.run([BLENDER, '-b', '--python', os.path.abspath(__file__)] + sys.argv[1:],
                       capture_output=True, text=True)
    blog = os.path.join(STAGE, 'blender.log')
    open(blog, 'w', encoding='utf-8', errors='replace').write(r.stdout + r.stderr)
    keep = False
    for line in (r.stdout + r.stderr).splitlines():
        if line.startswith('[beast]'):
            print(line)
        if 'Traceback' in line:
            keep = True
        if keep:
            print(line)
    log('blender log ->', blog)
    raise SystemExit(r.returncode)

# ----------------------------------------------------------------------
# Stage 2 (blender)
# ----------------------------------------------------------------------
import numpy as np
from mathutils import Vector, Quaternion

bpy.ops.wm.read_factory_settings(use_empty=True)
with bpy.data.libraries.load(BLEND) as (src, dst):
    dst.objects = list(src.objects)
    dst.actions = list(src.actions)
for o in dst.objects:
    if o is not None:
        bpy.context.scene.collection.objects.link(o)
sc = bpy.context.scene

KEEP = ('Alien-Animal_PostProcessing', 'Eyes-Alien-Animal', 'Saliva-Alien-Animal')
arm = None
for o in list(sc.objects):
    if o.type == 'ARMATURE':
        arm = o
        continue
    if o.type != 'MESH' or o.name not in KEEP:
        bpy.data.objects.remove(o, do_unlink=True)
for o in sc.objects:
    o.hide_render = o.hide_viewport = False
    try:
        o.hide_set(False)
    except Exception:
        pass
meshes = [o for o in sc.objects if o.type == 'MESH']
log('kept', [(o.name, len(o.data.polygons)) for o in meshes], 'rig', arm.name,
    len(arm.data.bones), 'bones')

# THE MESH EVALUATES TO NOTHING UNTIL THE RIG IS PUT BACK ON ITS REST POSE.
# A first pass at looking at this model rendered four empty frames: the file
# ships with an action bound, and whatever pose its first frame holds collapses
# the body. Clear it before measuring anything.
if arm.animation_data:
    arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.matrix_basis.identity()
bpy.context.view_layer.update()


def evaluated_bounds():
    dg = bpy.context.evaluated_depsgraph_get()
    mn, mx = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in meshes:
        ev = o.evaluated_get(dg)
        m = ev.to_mesh()
        for v in m.vertices:
            w = o.matrix_world @ v.co
            for i in range(3):
                mn[i] = min(mn[i], w[i]); mx[i] = max(mx[i], w[i])
        ev.to_mesh_clear()
    return mn, mx


mn, mx = evaluated_bounds()
log('rest bounds %s %s  (%.1f long, %.1f tall)'
    % ([round(v, 2) for v in mn], [round(v, 2) for v in mx], mx.y - mn.y, mx.z - mn.z))

# ---------------------------------------------------------------- decimate
# The body ships at 53k polys with a subsurf on top of it. DECIMATE COLLAPSE
# keeps the uv and the vertex groups, which is the whole reason it can be run
# on a skinned mesh at all.
for o in meshes:
    for m in list(o.modifiers):
        if m.type in ('SUBSURF', 'SOLIDIFY', 'DISPLACE'):
            o.modifiers.remove(m)
# AND THE RATIO IS OF TRIANGLES, NOT OF FACES. The body ships as QUADS, so a
# ratio worked out against the face count comes out at twice the budget the
# moment `use_collapse_triangulate` splits them: 15,000 asked for and 30,000
# shipped, on the one asset here that is already the biggest.
body = max(meshes, key=lambda o: len(o.data.polygons))
before = len(body.data.polygons)
tri_before = sum(max(1, len(p.vertices) - 2) for p in body.data.polygons)
bpy.context.view_layer.objects.active = body
dec = body.modifiers.new('dec', 'DECIMATE')
dec.decimate_type = 'COLLAPSE'
dec.ratio = min(1.0, TRIS / max(1, tri_before))
dec.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=dec.name)
log('decimate %d faces (%d tris) -> %d tris' % (before, tri_before, len(body.data.polygons)))

# ---------------------------------------------------------------- materials
# The shipped body material is a node graph of gammas, inverts and a
# bright/contrast that the glTF exporter cannot carry, so it is rebuilt as the
# one thing that exports: a Principled with the graded albedo and the normal.
col_img = bpy.data.images.load(COLOUT)
nrm_img = bpy.data.images.load(NRMOUT)
nrm_img.colorspace_settings.name = 'Non-Color'
rgh_img = bpy.data.images.load(RGHOUT)
rgh_img.colorspace_settings.name = 'Non-Color'
eye_img = bpy.data.images.load(EYEOUT)


def simple_mat(name, img, rough, nrm=None, rgh_map=None, emis=0.0, emis_map=None):
    """A Principled and nothing else, because the shipped body material is a
    node graph of gammas, inverts and a bright/contrast that the glTF exporter
    cannot carry. Wiring an image straight into Roughness is one of the
    patterns the exporter recognises — it takes the green channel and builds
    the metallic-roughness texture off it."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = img
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = 0.0
    if rgh_map is not None:
        tr = nt.nodes.new('ShaderNodeTexImage')
        tr.image = rgh_map
        nt.links.new(tr.outputs['Color'], b.inputs['Roughness'])
    else:
        b.inputs['Roughness'].default_value = rough
    if nrm is not None:
        tn = nt.nodes.new('ShaderNodeTexImage')
        tn.image = nrm
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    if emis:
        if emis_map is not None:
            te = nt.nodes.new('ShaderNodeTexImage')
            te.image = emis_map
            nt.links.new(te.outputs['Color'], b.inputs['Emission Color'])
        else:
            b.inputs['Emission Color'].default_value = (1, 1, 1, 1)
        b.inputs['Emission Strength'].default_value = emis
    return mat


# THE METALLIC MAP IS DELIBERATELY NOT USED. It ships with a mean of 98 and a
# stddev of 59, which is not the near-black a real metalness map for an
# organic creature would be — whatever the artist authored it as, it is not
# metal. And this game has NO ENVIRONMENT MAP, which is the trap named three
# times over in CLAUDE.md: a metal has no diffuse term, so anything metallic
# here renders as a dark shape with a couple of pinpoints on it. The hide
# stays a rough dielectric.
body_mat = simple_mat('Beast', col_img, 0.62, nrm_img, rgh_map=rgh_img)
# ITS EYES ARE ITS OWN MAP, and they were wearing its SKIN. The eye mesh is
# 772 vertices with its own UVs and the download ships a 2048 map for it; the
# first build gave every mesh the body material, so the creature looked out of
# two patches of hide. They also carry a little emissive, because eyes are the
# one part of an animal that should catch a light there is not much of.
eye_mat = simple_mat('BeastEye', eye_img, 0.28, emis=0.55, emis_map=eye_img)
# and the saliva is wet, dark and not made of hide either
saliva_mat = simple_mat('BeastSaliva', eye_img, 0.12)
saliva_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.30, 0.31, 0.28, 1)
for lk in list(saliva_mat.node_tree.links):
    if lk.to_socket.name == 'Base Color':
        saliva_mat.node_tree.links.remove(lk)

PICK = {'Eyes-Alien-Animal': eye_mat, 'Saliva-Alien-Animal': saliva_mat}
for o in meshes:
    o.data.materials.clear()
    o.data.materials.append(PICK.get(o.name, body_mat))
log('materials: ' + ', '.join('%s -> %s' % (o.name, o.data.materials[0].name) for o in meshes))

# --------------------------------------------------------------- the clips
FPS = 30
pbs = arm.pose.bones
for pb in pbs:
    pb.rotation_mode = 'QUATERNION'


def bind(act):
    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = act
    try:
        arm.animation_data.action_slot = (act.slots[0] if act.slots
                                          else act.slots.new(id_type='OBJECT', name='Legacy'))
    except Exception:
        pass


# THE RIG IS DRIVEN BY CONSTRAINTS AND `matrix_basis` DOES NOT SEE THEM.
# Counted on the source: 82 pose-bone constraints — 36 IK, 27 FLOOR, 9
# TRANSFORM, 5 TRACK_TO, 3 COPY_ROTATION and 2 ACTION. `matrix_basis` is a
# bone's local transform BEFORE any of that is evaluated, so sampling it kept
# only what the animator keyed onto the control bones and threw away
# everything the IK chains and the foot planting were doing — which on this
# rig is most of the animation. The creature came out moving its hips and
# dragging four dead legs.
#
# What is recorded instead is `pb.matrix`, the EVALUATED pose in armature
# space with every constraint applied, off the depsgraph. That has to be
# converted back into a basis a constraint-free rig will reproduce, and the
# conversion uses only recorded matrices, so it needs no per-bone depsgraph
# update:
#
#     basis[b] = (L[parent]^-1 @ L[b])^-1 @ (M[parent]^-1 @ M[b])
#
# with L the rest matrix (`bone.matrix_local`) and M the evaluated pose, both
# in armature space; a root bone is just L[b]^-1 @ M[b]. The constraints are
# then REMOVED before anything is written, or they would be applied a second
# time on top of a pose that already contains them.
PARENT = [pb.parent for pb in pbs]
IDX = {pb.name: i for i, pb in enumerate(pbs)}
L = [pb.bone.matrix_local.copy() for pb in pbs]
LINV = [m.inverted() for m in L]
REST_REL = [(LINV[IDX[PARENT[i].name]] @ L[i]) if PARENT[i] else L[i] for i in range(len(pbs))]
REST_REL_INV = [m.inverted() for m in REST_REL]


def sample(src_name, windows):
    """Read the EVALUATED pose off every bone over one or more windows of a
    source action, and return it as constraint-free bases.

    MORE THAN ONE WINDOW, because these clips were authored to be watched and
    not to be fought: the bite reaches full extension at frame 24 and then
    HOLDS it for another forty, which in a fight is a creature standing with
    its jaws in you. Splicing the lunge to the retraction and dropping the
    hold is what turns a piece of animation into an attack."""
    src = bpy.data.actions[src_name]
    bind(src)
    out = []
    for f0, f1, step in windows:
        f = f0
        while f <= f1:
            sc.frame_set(int(round(f)))
            dg = bpy.context.evaluated_depsgraph_get()
            ev = arm.evaluated_get(dg)
            M = [pb.matrix.copy() for pb in ev.pose.bones]
            MINV = {}
            row = []
            for i in range(len(pbs)):
                par = PARENT[i]
                if par is None:
                    row.append(REST_REL_INV[i] @ M[i])
                else:
                    j = IDX[par.name]
                    if j not in MINV:
                        MINV[j] = M[j].inverted()
                    row.append(REST_REL_INV[i] @ (MINV[j] @ M[i]))
            out.append(row)
            f += step
    return out


def all_fcurves(act):
    if hasattr(act, 'fcurves') and len(getattr(act, 'fcurves', [])):
        return list(act.fcurves)
    o = []
    for lay in getattr(act, 'layers', []):
        for st in getattr(lay, 'strips', []):
            for cb in getattr(st, 'channelbags', []):
                o.extend(cb.fcurves)
    return o


CLIPS = {}


def write(name, frames, loop=False):
    """Key the sampled poses into a fresh action. EVERY BONE, EVERY FRAME."""
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    bind(act)
    if loop:                      # a cycle has to close on the pose it opened
        frames = frames + [frames[0]]
    n = len(frames) - 1
    for i, fr in enumerate(frames):
        for pb, m in zip(pbs, fr):
            loc, rot, _ = m.decompose()
            pb.rotation_quaternion = rot
            pb.location = loc
        for pb in pbs:
            pb.keyframe_insert('rotation_quaternion', frame=i)
            pb.keyframe_insert('location', frame=i)
    for fc in all_fcurves(act):
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'
    CLIPS[name] = n
    log('  clip %-9s %3d frames  %5d curves' % (name, n, len(all_fcurves(act))))
    return act


# What each shipped action is worth keeping of. The two idles are far longer
# than an idle needs to be and the second is the aggressive one, which is this
# creature's roar; the deaths are two takes of the same fall and one is enough.
# What each shipped action is worth keeping of, in windows of (first, last,
# step). Every one of them was traced before it was cut — the head's y and z
# per frame — because the names do not say: `Attack_Hit` is a REAR-UP AND SLAM
# (up by frame 6, held to 24, down by 30) and not a flinch, and both attacks
# end with twenty frames of the creature already back at rest.
PLAN = [
    ('idle',   'Idel_Normal',     [(0, 240, 2)], True),
    ('roar',   'Idle_Aggressive', [(0, 140, 2)], False),
    ('walk',   'Walk-Cycle',      [(0, 39, 1)],  True),
    ('run',    'Run-Cycle',       [(0, 31, 1)],  True),
    # the lunge, then the retraction, with the forty-frame hold between them cut
    ('bite',   'Attack_Bite',     [(0, 24, 1), (64, 80, 1)], False),
    # the rear, the hold that is the tell, the slam, and the recovery
    ('swipe',  'Attack_Hit',      [(0, 38, 1)], False),
    ('hurt',   'Action_Rolls',    [(0, 15, 1)], False),
    # AND A DEATH CLIP THAT LOOPS GETS BACK UP. Traced through the shipped
    # `Die_1`: it rears at frame 6, staggers, drops (frames 33-42), lies
    # perfectly still from 51 to 150 -- and then STANDS BACK UP over the last
    # forty-eight frames, because it was authored to loop. The game clamps a
    # death clip on its final frame, so the boss of the ship ended the fight
    # back on its feet with its health at zero, which is exactly what "have it
    # stay in that dead/collapsed animation" was reporting. The window ends on
    # the collapse and three settled frames after it: measured in the export,
    # the skeleton's crown goes 19.6 -> 11.3 and stays there. Step 1 rather
    # than 3 as well, so two tonnes take two and a quarter seconds to arrive
    # rather than three quarters of one.
    ('die',    'Die_1',           [(0, 54, 1)], False),
]
have = {a.name for a in bpy.data.actions}
TAKES = []
for name, srcn, windows, loop in PLAN:
    if srcn not in have:
        log('  MISSING source action', srcn)
        continue
    TAKES.append((name, sample(srcn, windows), loop))

# EVERY CLIP IS SAMPLED BEFORE ANY CONSTRAINT IS REMOVED, and every constraint
# is removed before any clip is written: what was recorded already contains
# their result, so leaving them on would apply it twice.
ncon = 0
for pb in pbs:
    for c in list(pb.constraints):
        pb.constraints.remove(c)
        ncon += 1
log('stripped %d pose-bone constraints (their result is baked into the takes)' % ncon)

for name, frames, loop in TAKES:
    write(name, frames, loop=loop)

# drop the source actions so the exporter cannot ship them as well
for a in list(bpy.data.actions):
    if a.name not in CLIPS:
        bpy.data.actions.remove(a)

# ------------------------------------------- where the blows actually land
# The game needs the FRACTION of each attack at which the damage is dealt, and
# nothing in the file says. The monster's rule: a bite is measured on the HEAD
# and not the jaw (a jaw goes forward when the mouth OPENS), and a swipe has no
# extreme of position at all, so it is measured where it is fastest.
head_bone = 'Animation_Head' if 'Animation_Head' in pbs else pbs[0].name


def track(name, bone):
    act = bpy.data.actions[name]
    bind(act)
    n = CLIPS[name]
    out = []
    for f in range(n + 1):
        sc.frame_set(f)
        d = bpy.context.evaluated_depsgraph_get()
        e = arm.evaluated_get(d)
        out.append((e.matrix_world @ e.pose.bones[bone].head).copy())
    return out


# A LUNGE IS MEASURED WHERE IT IS FURTHEST OUT AND A SLAM WHERE IT IS LOWEST
# AFTER IT WAS HIGHEST. Peak speed — which is the right measure for a rake,
# and what the reptilian's swipe uses — reported frame 3 of the slam, because
# the fastest the head ever moves in that clip is the REAR-UP at the start.
HITS = {}
for nm, how in (('bite', 'forward'), ('swipe', 'slam')):
    if nm not in CLIPS:
        continue
    ps = track(nm, head_bone)
    n = CLIPS[nm]
    if how == 'forward':
        ref = min(range(n + 1), key=lambda i: ps[i].y)     # it faces -Y
    else:
        top = max(range(n + 1), key=lambda i: ps[i].z)
        ref = min(range(top, n + 1), key=lambda i: ps[i].z)
    HITS[nm] = ref / float(n)
    log('  %-6s contact f%d of %d  -> hit %.3f  (%s)' % (nm, ref, n, HITS[nm], how))

# ---------------------------------------------------------------- the export
if arm.animation_data:
    arm.animation_data.action = None
for pb in pbs:
    pb.matrix_basis.identity()
sc.frame_set(0)
bpy.context.view_layer.update()
mn, mx = evaluated_bounds()
log('shipped bounds %s %s' % ([round(v, 2) for v in mn], [round(v, 2) for v in mx]))

bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='ACTIONS',
    export_bake_animation=True, export_force_sampling=True,
    export_frame_range=False, export_optimize_animation_size=False,
    export_yup=True, export_apply=False, export_skins=True,
    export_normals=True, export_tangents=False, export_morph=False,
    export_image_format='JPEG', export_jpeg_quality=90,
    export_def_bones=False)
log('tris %d  bones %d  clips %s' % (sum(len(o.data.polygons) for o in meshes),
                                     len(arm.data.bones), sorted(CLIPS)))
log('hits %s' % {k: round(v, 3) for k, v in HITS.items()})
log('DONE %s  %.2f MB' % (OUT, os.path.getsize(OUT) / 1048576))
