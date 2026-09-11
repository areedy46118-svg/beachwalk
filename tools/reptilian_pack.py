"""Build assets/reptilian.glb — the first phase of the fight in the ship.

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --python tools/reptilian_pack.py
    ... --shots       also render the rig in every clip's contact pose

THE DOWNLOAD HAS NO SKELETON AT ALL. The monster arrived with a rig and no
clips (the smile's situation); this one has neither — 150,718 polys, one 2048
BMP, no armature, no vertex groups, no actions. So the rig is BUILT here, and
the only honest way to build one is to MEASURE the mesh for it: a skeleton
placed by eye is a skeleton whose knees are not at the knees, and every clip
authored on it then has to fight it.

What is measured, and how:

  the crotch   scanning DOWN from the waist, the first height at which the
               x values split into two clusters with a gap between them
  the shoulder scanning down from the head, the height at which the body's
               half-width jumps away from the neck's
  the arms     at each height between them, the vertices outboard of the
               largest gap on that side ARE the arm, so their centroid is
               where the arm is; shoulder, elbow and wrist come off that
  the legs     the same trick below the crotch, split on the sign of x
  the ankle    the height at which the leg's y extent grows, because that is
               a foot sticking forward out of a shin

It faces -Y in Blender, which exports as glTF +Z, so in the game its front is
+Z and it is aimed the mutant's way (`atan2(dx, dz)` with NO `+ PI`).

AND THE BONES ARE NAMED `Character1_*` ON PURPOSE. That is the mutant rig's
own naming, which the Verlet ragdoll, `mutSever`, `burstHead` and `bakeLimb`
all read directly — so naming them this way is the difference between a
creature that comes apart like everything else on this beach and one that
freezes upright when it dies. The warden paid for that lesson last week.
"""
import os, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.environ.get('REPT_SRC', os.path.join(
    os.path.expanduser('~'), 'OneDrive', 'Desktop', 'aliens'))
FBX = os.path.join(SRC, 'Reptilian.FBX')
TEXSRC = os.path.join(SRC, 'Reptilian.BMP')
OUT = os.path.join(ROOT, 'assets', 'reptilian.glb')
STAGE = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Temp', 'claude',
                     'C--Users-areed-projects-beachwalk',
                     '79655e97-9937-4ce9-b96f-d3067fbb794c', 'scratchpad', 'rept_stage')
SHOTS = '--shots' in sys.argv
FPS = 30
TEX = 1024
TRIS = 13000
HEIGHT = 1.90                 # Blender units it is normalised to, so poses read as metres
BLENDER = os.environ.get(
    'BLENDER', r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe')


def log(*a):
    print('[rept]', *a)
    sys.stdout.flush()


TEXOUT = os.path.join(STAGE, 'reptilian.jpg')
NRMOUT = os.path.join(STAGE, 'reptilian_nrm.jpg')
RGHOUT = os.path.join(STAGE, 'reptilian_rgh.jpg')
# HOW HARD THE DERIVED RELIEF IS PUSHED. Measured on screen rather than
# chosen: at 1.0 the scales read at arm's length and the silhouette is
# unchanged, which is the whole point — a normal map may not alter the shape.
NRM_STRENGTH = 9.0
NRM_TEX = 1024
RGH_TEX = 512

# ----------------------------------------------------------------------
# Stage 1 (system python): the map
# ----------------------------------------------------------------------
# The monster's rule, and its numbers: DARKENING A MAP IS A LEVEL CHANGE AND
# MUST NOT BE A RANGE CHANGE. A flat multiply scales the contrast by the same
# factor and contrast is what the eye reads as texture, so the map is remapped
# to a target mean AND a target spread — a shift and a scale about the mean.
# These three stand in the same lit hall the warden does, so they sit where it
# sits rather than where the beach's mutants do.
# AND THE LEVEL BARELY NEEDED CHANGING AT ALL. This download is not the
# monster's: its map already arrives at a luminance of about 40, which is
# inside the range the three beach mutants ship at, so the whole job is a
# small lift and nothing else. It is also GREEN — mean RGB 32, 47, 24 — and
# keeping it that way is the entire point of the grade below.
TEX_MEAN = 44.0
TEX_SD = 25.0
TEX_SAT = 1.30                     # a dark map reads flatter than it measures

# ------------------------------------------------------- the grade, honestly
# A PER-CHANNEL REMAP IS A COLOUR REMOVER. The first version of this pulled R,
# G and B each to their own target mean and spread, which — with gains near
# one — is the same target for all three, so whatever hue the map had was
# normalised away by construction: the reptilian ships a GREEN hide (source
# mean RGB 32, 47, 24) and came out blue-grey at 44, 49, 55, and the alien
# animal came out 44, 44, 44, which is neutral to three figures. Then a
# `SCENE_BLUE` mix was laid over the top, which is how a green reptile ended
# up the colour of the sea.
#
# What actually needed changing was never the colour, it was the LEVEL: these
# maps are authored for a studio and this beach has a quarter moon. So the
# remap is on LUMINANCE ALONE, and every pixel keeps its own distance from its
# own luminance — hue and saturation come through untouched. Darkening does
# cost apparent saturation, so the chroma is given a little back.
def grade(im, mean, sd, sat_boost=1.0):
    import numpy as np
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    lum = a[:, :, 0] * 0.299 + a[:, :, 1] * 0.587 + a[:, :, 2] * 0.114
    m0, s0 = float(lum.mean()), float(max(1e-3, lum.std()))
    k = sd / s0
    newlum = (lum - m0) * k + mean
    out = np.empty_like(a)
    for i in range(3):
        out[:, :, i] = newlum + (a[:, :, i] - lum) * sat_boost
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB'), m0, s0

try:
    import bpy
except ImportError:
    bpy = None

if bpy is None:
    import subprocess
    from PIL import Image, ImageStat
    os.makedirs(STAGE, exist_ok=True)
    raw = Image.open(TEXSRC).convert('RGB').resize((TEX, TEX), Image.LANCZOS)
    col, _m0, _s0 = grade(raw, TEX_MEAN, TEX_SD, TEX_SAT)
    col.save(TEXOUT, quality=90, optimize=True)

    # ------------------------------------------------------- the relief
    # THE DOWNLOAD IS A COLOUR MAP AND NOTHING ELSE, WHICH IS NOT A SURFACE.
    # Measured in the game beside a beach mutant in the same light: the
    # mutants carry a normal map AND a roughness map and read as skin; this
    # one had neither and read as flat plastic at arm's length, which is
    # exactly the owner's report. Its albedo is not the problem — shipped it
    # measures mean 47, p5..p95 spread 41, against the warden's 48 and 38 —
    # the problem is that COLOUR ALONE DOES NOT MOVE WHEN THE LIGHT DOES.
    # That is the wreck's lesson: a seam that is only dark is a picture of a
    # seam.
    #
    # There is no height map to differentiate, so one is DERIVED from the
    # albedo's own luminance. That is an approximation and it is the right
    # one here: on a scanned hide the dark parts are the creases, so the
    # luminance IS the height, and the scales, the belly plates and the
    # sockets all come out of it. It is blurred first, because a JPEG's
    # ringing differentiates into noise.
    import numpy as np
    from PIL import ImageFilter
    # AND IT IS DERIVED FROM THE RAW MAP, NOT THE GRADED ONE. The grade is a
    # LEVEL change for this game's lighting and it costs contrast on the way
    # through — 53.9 of standard deviation down to 16.3 — and contrast is
    # precisely what a height field is made of. Differentiating the graded
    # copy threw away two thirds of the relief before it was measured: mean
    # tilt 2.7 degrees, which is nothing.
    h = raw.convert('L').resize((NRM_TEX, NRM_TEX), Image.LANCZOS)
    h = h.filter(ImageFilter.GaussianBlur(0.8))
    a = np.asarray(h).astype(np.float32) / 255.0
    dx = (np.roll(a, -1, 1) - np.roll(a, 1, 1)) * NRM_STRENGTH
    dy = (np.roll(a, -1, 0) - np.roll(a, 1, 0)) * NRM_STRENGTH
    nz = np.ones_like(a)
    ln = np.sqrt(dx * dx + dy * dy + nz * nz)
    nrm = np.stack([(-dx / ln), (dy / ln), (nz / ln)], axis=-1)   # +Y up, OpenGL
    nrm = ((nrm * 0.5 + 0.5) * 255.0).clip(0, 255).astype(np.uint8)
    Image.fromarray(nrm, 'RGB').save(NRMOUT, quality=90, optimize=True)
    tilt = float(np.degrees(np.arccos((nrm[:, :, 2].astype(float) / 255.0 * 2 - 1).clip(-1, 1))).mean())
    log('normal %d px derived from luminance, mean tilt %.1f deg (%d KB)'
        % (NRM_TEX, tilt, os.path.getsize(NRMOUT) // 1024))

    # and a roughness off the same luminance: the raised, lighter scales are
    # drier than the dark creases between them, which is true of anything
    # that has been rained on.
    r = raw.convert('L').resize((RGH_TEX, RGH_TEX), Image.LANCZOS)
    rm = ImageStat.Stat(r).mean[0]
    r = r.point(lambda v, rm=rm: int(max(0, min(255, 210 - (v - rm) * 0.55))))
    r.convert('RGB').save(RGHOUT, quality=88, optimize=True)
    st_r = ImageStat.Stat(r)
    log('roughness %d px  mean %.0f  sd %.1f  (%d KB)'
        % (RGH_TEX, st_r.mean[0], st_r.stddev[0], os.path.getsize(RGHOUT) // 1024))
    st1 = ImageStat.Stat(col.convert('L'))
    r0 = ImageStat.Stat(raw); r1 = ImageStat.Stat(col)
    log('map %d px  luminance %.0f -> %.0f  sd %.1f -> %.1f  RGB %s -> %s  (%d KB)'
        % (TEX, _m0, st1.mean[0], _s0, st1.stddev[0],
           [round(v) for v in r0.mean], [round(v) for v in r1.mean],
           os.path.getsize(TEXOUT) // 1024))
    log('running blender ...')
    r = subprocess.run([BLENDER, '-b', '--python', os.path.abspath(__file__)] + sys.argv[1:],
                       capture_output=True, text=True)
    blog = os.path.join(STAGE, 'blender.log')
    open(blog, 'w', encoding='utf-8', errors='replace').write(r.stdout + r.stderr)
    keep = False
    for line in (r.stdout + r.stderr).splitlines():
        if line.startswith('[rept]'):
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
bpy.ops.import_scene.fbx(filepath=FBX)

meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
log('imported', [(o.name, len(o.data.polygons)) for o in meshes])

# join into one, apply the transform so every measurement below is in one frame
for o in bpy.context.scene.objects:
    o.select_set(o.type == 'MESH')
big = max(meshes, key=lambda o: len(o.data.polygons))
bpy.context.view_layer.objects.active = big
if len(meshes) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---------------------------------------------------------------- decimate
# 150k polys is ten times what anything else in this game costs, and the
# skinning below is O(verts x bones), so it comes down FIRST.
before = len(obj.data.polygons)
dec = obj.modifiers.new('dec', 'DECIMATE')
dec.decimate_type = 'COLLAPSE'
dec.ratio = min(1.0, TRIS / max(1, before))
dec.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=dec.name)
log('decimate %d -> %d polys' % (before, len(obj.data.polygons)))

# --------------------------------------------------------------- normalise
me = obj.data
co = np.empty(len(me.vertices) * 3, dtype=np.float64)
me.vertices.foreach_get('co', co)
co = co.reshape(-1, 3)
lo, hi = co.min(axis=0), co.max(axis=0)
scale = HEIGHT / (hi[2] - lo[2])
off = np.array([(lo[0] + hi[0]) * 0.5, (lo[1] + hi[1]) * 0.5, lo[2]])
co = (co - off) * scale
me.vertices.foreach_set('co', co.reshape(-1))
me.update()
H = HEIGHT
log('normalised to %.2f  x %.2f..%.2f  y %.2f..%.2f'
    % (H, co[:, 0].min(), co[:, 0].max(), co[:, 1].min(), co[:, 1].max()))

# ------------------------------------------------------------ the measuring
X, Y, Z = co[:, 0], co[:, 1], co[:, 2]


def band(z0, z1):
    m = (Z >= z0) & (Z < z1)
    return co[m]


def half_width(z0, z1):
    b = band(z0, z1)
    return float(np.abs(b[:, 0]).max()) if len(b) else 0.0


def split_gap(vals, need):
    """The largest gap in a sorted 1-D set, if it is wider than `need`."""
    if len(vals) < 8:
        return None
    v = np.sort(vals)
    d = np.diff(v)
    i = int(np.argmax(d))
    return (v[i], v[i + 1]) if d[i] > need else None


# THE CROTCH: scanning down from the waist, the first height at which the x
# values split in two with real air between them. Above it the torso is one
# solid and there is no gap to find.
step = H * 0.005
crotch = H * 0.50
z = H * 0.60
while z > H * 0.30:
    b = band(z - step, z + step)
    if len(b) > 12:
        g = split_gap(b[:, 0], H * 0.012)
        if g is not None and abs(g[0] + g[1]) * 0.5 < H * 0.06:
            crotch = z
            break
    z -= step
log('crotch  %.3f  (%.0f%% of height)' % (crotch, crotch / H * 100))

# THE SHOULDER: the neck is narrow and the shoulders are not, so the jump in
# half-width scanning down from the head is where they start.
neck_w = half_width(H * 0.86, H * 0.90)
shoulder = H * 0.82
z = H * 0.92
while z > H * 0.60:
    if half_width(z - step, z + step) > max(neck_w * 1.75, H * 0.075):
        shoulder = z
        break
    z -= step
log('shoulder %.3f  neck half-width %.3f' % (shoulder, neck_w))


def limb_indices(z, sign, gap):
    """WHICH VERTICES ARE THE ARM at this height. Everything outboard of the
    biggest gap on this side of the body is the arm — and keeping the INDICES
    rather than just the centroid is what makes the skinning work at all, so
    this is the one measurement the whole file turns on."""
    m = (Z >= z - step * 1.4) & (Z < z + step * 1.4) & (X * sign > 0)
    idx = np.nonzero(m)[0]
    if len(idx) < 6:
        return None, None
    xs = X[idx] * sign
    o = np.argsort(xs)
    v = xs[o]
    d = np.diff(v)
    if len(d) == 0:
        return None, None
    i = int(np.argmax(d))
    if d[i] <= gap:
        return None, None
    out = idx[o[i + 1:]]
    if len(out) < 4:
        return None, None
    return out, co[out].mean(axis=0)


# THE ARMS. Walk down from just under the shoulder to wherever the outboard
# cluster stops existing; that bottom is the hand.
arm_zs, arm_l, arm_r = [], [], []
arm_set = {1: set(), -1: set()}
z = shoulder - step
while z > H * 0.30:
    ia, ca = limb_indices(z, +1, H * 0.010)
    ib, cb = limb_indices(z, -1, H * 0.010)
    if ia is not None and ib is not None:
        arm_zs.append(z); arm_l.append(ca); arm_r.append(cb)
        arm_set[1].update(int(i) for i in ia)
        arm_set[-1].update(int(i) for i in ib)
    z -= step
if len(arm_zs) < 4:
    raise SystemExit('[rept] could not find the arms')
arm_l = np.array(arm_l); arm_r = np.array(arm_r)
hand_z = arm_zs[-1]
log('arms %.3f -> %.3f  (%d bands)  verts L%d R%d'
    % (arm_zs[0], hand_z, len(arm_zs), len(arm_set[1]), len(arm_set[-1])))


def at_arm(frac, side):
    a = arm_l if side > 0 else arm_r
    i = min(len(a) - 1, max(0, int(round(frac * (len(a) - 1)))))
    return a[i]


# THE LEGS. The same split on the sign of x below the crotch — WITH THE ARM
# VERTICES TAKEN OUT FIRST. They hang down past the hip in an A-pose, so
# averaging them into the leg put the first build's hip joint at x = 0.27,
# which is outside the body: the femur slanted inward from thin air.
armall = arm_set[1] | arm_set[-1]
leg_set = {1: set(), -1: set()}
leg_zs, leg_l, leg_r = [], [], []
z = crotch - step
while z > H * 0.01:
    m = (Z >= z - step * 1.4) & (Z < z + step * 1.4)
    idx = [int(i) for i in np.nonzero(m)[0] if int(i) not in armall]
    if len(idx) > 10:
        Lx = [i for i in idx if X[i] > 0]
        Rx = [i for i in idx if X[i] < 0]
        if len(Lx) > 4 and len(Rx) > 4:
            leg_zs.append(z)
            leg_l.append(co[Lx].mean(axis=0)); leg_r.append(co[Rx].mean(axis=0))
            leg_set[1].update(Lx); leg_set[-1].update(Rx)
    z -= step
leg_l = np.array(leg_l); leg_r = np.array(leg_r)
log('legs %.3f -> %.3f  (%d bands)  verts L%d R%d'
    % (leg_zs[0], leg_zs[-1], len(leg_zs), len(leg_set[1]), len(leg_set[-1])))

# THE ANKLE: a foot sticks forward out of a shin, so it is the height at which
# the leg's forward extent runs away from the shin's — and it is the HIGHEST
# such height, not the lowest, because `leg_zs` runs downward.
shin_y = min(band(H * 0.12, H * 0.20)[:, 1])
ankle = H * 0.06
for z in leg_zs:
    if z > H * 0.25:
        continue
    b = band(z - step, z + step)
    if len(b) and b[:, 1].min() < shin_y - H * 0.02:
        ankle = z
        break
log('ankle %.3f  shin y %.3f  toe y %.3f' % (ankle, shin_y, float(co[:, 1].min())))


def at_leg(frac, side):
    a = leg_l if side > 0 else leg_r
    i = min(len(a) - 1, max(0, int(round(frac * (len(a) - 1)))))
    return a[i]


# ------------------------------------------------------------------ the rig
# Named for the mutant rig, because every piece of this game's dismemberment
# and ragdoll code reads these strings.
arm_obj = bpy.data.objects.new('Rig', bpy.data.armatures.new('Rig'))
bpy.context.scene.collection.objects.link(arm_obj)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_obj.data.edit_bones

hip_z = crotch + (shoulder - crotch) * 0.06
trunk_y = float(np.mean(band(crotch, shoulder)[:, 1]))
head_top = H
neck_z = shoulder + (head_top - shoulder) * 0.18
head_z = shoulder + (head_top - shoulder) * 0.42


def bone(name, head, tail, parent=None, connect=False):
    b = eb.new(name)
    b.head = Vector(head)
    b.tail = Vector(tail)
    if parent is not None:
        b.parent = eb[parent]
        b.use_connect = connect
    return b


C = 'Character1_'
bone(C + 'Hips', (0, trunk_y, hip_z), (0, trunk_y, hip_z + (shoulder - hip_z) * 0.22))
sp = [hip_z + (shoulder - hip_z) * f for f in (0.22, 0.46, 0.70, 1.0)]
bone(C + 'Spine', (0, trunk_y, sp[0]), (0, trunk_y, sp[1]), C + 'Hips', True)
bone(C + 'Spine1', (0, trunk_y, sp[1]), (0, trunk_y, sp[2]), C + 'Spine', True)
bone(C + 'Spine2', (0, trunk_y, sp[2]), (0, trunk_y, sp[3]), C + 'Spine1', True)
bone(C + 'Neck', (0, trunk_y, sp[3]), (0, trunk_y, neck_z), C + 'Spine2', True)
bone(C + 'Head', (0, trunk_y, neck_z), (0, trunk_y, head_z), C + 'Neck', True)

for side, tag in ((+1, 'Left'), (-1, 'Right')):
    s0 = at_arm(0.00, side)
    s1 = at_arm(0.10, side)
    el = at_arm(0.48, side)
    wr = at_arm(0.92, side)
    hd = at_arm(1.00, side)
    bone(C + tag + 'Shoulder', (side * neck_w * 0.55, trunk_y, sp[3] * 0.995),
         (s1[0], s1[1], arm_zs[1] if len(arm_zs) > 1 else s1[2]), C + 'Spine2')
    bone(C + tag + 'Arm', (s1[0], s1[1], arm_zs[1]), (el[0], el[1], el[2]),
         C + tag + 'Shoulder', True)
    bone(C + tag + 'ForeArm', (el[0], el[1], el[2]), (wr[0], wr[1], wr[2]),
         C + tag + 'Arm', True)
    bone(C + tag + 'Hand', (wr[0], wr[1], wr[2]),
         (hd[0], hd[1], hd[2] - H * 0.035), C + tag + 'ForeArm', True)

    h0 = at_leg(0.02, side)
    kn = at_leg(0.50, side)
    an = at_leg(0.96, side)
    bone(C + tag + 'UpLeg', (h0[0], trunk_y, crotch), (kn[0], kn[1], kn[2]), C + 'Hips')
    bone(C + tag + 'Leg', (kn[0], kn[1], kn[2]), (an[0], an[1], ankle), C + tag + 'UpLeg', True)
    bone(C + tag + 'Foot', (an[0], an[1], ankle),
         (an[0], float(co[:, 1].min()) * 0.75, ankle * 0.35), C + tag + 'Leg', True)
    bone(C + tag + 'ToeBase', (an[0], float(co[:, 1].min()) * 0.75, ankle * 0.35),
         (an[0], float(co[:, 1].min()), ankle * 0.18), C + tag + 'Foot', True)

# a root under everything, so `key()` can move the whole body
root = eb.new('root')
root.head = (0, 0, 0)
root.tail = (0, 0, H * 0.12)
for b in list(eb):
    if b.parent is None and b.name != 'root':
        b.parent = root
bpy.ops.object.mode_set(mode='OBJECT')
log('rig %d bones' % len(arm_obj.data.bones))

# ------------------------------------------------------------- the skinning
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
try:
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    log('skinned with automatic (heat) weights')
except Exception as e:
    log('heat weighting failed (%s) — falling back to envelopes' % e)
    bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')
log('vertex groups %d' % len(obj.vertex_groups))

# ------------------------------------------------- and CLEAN it BY SEGMENTATION
# HEAT WEIGHTING BINDS WHATEVER IS NEAR, AND IN AN A-POSE THE HANDS REST
# AGAINST THE THIGHS. Measured on the first build, vertices at (0.15, -0.02,
# 0.59) — a KNEE — came back weighted 1.0 to `Character1_LeftHand`, so bending
# an elbow dragged the thigh across the body and both arms rendered as long
# flat sheets hanging past the knees.
#
# Three masks were tried before this one and the first two are worth writing
# down because they look right and are not:
#
#   by STRAIGHT-LINE distance, against the bones the vertex already had. A
#   vertex owned outright by the wrong bone has nothing to be compared with —
#   its one weight is by definition its own nearest — so it cut nothing.
#
#   by straight-line distance against EVERY bone. Better, and still hopeless
#   where it matters: at the point the hand touches the thigh the two bones
#   really are equally close, and no threshold can separate them.
#
#   by GEODESIC distance over the mesh, which is the right measure — a knee is
#   four centimetres from the hand through the air and most of a metre from it
#   around the body. It failed on its SEEDS: each bone was seeded from the
#   vertices it was nearest to, which for the hand included the knee, so the
#   knee was zero geodesic units from the hand by construction.
#
# What actually settles it is already measured further up this file. The arm
# scan knows WHICH VERTICES ARE THE ARM, because that is how it found the arm
# at all; the leg scan knows which are the leg. So a hand may drive hand
# vertices and nothing else, a shin may drive shin vertices and nothing else,
# and the two bones nearest the body — the upper arm and the thigh — are also
# allowed a collar of trunk around their own joint, which is the shoulder and
# the hip actually deforming. Heat weights still ship wherever they were sane;
# this only takes away the influences that could not physically be there.
TRUNK, ARM_L, ARM_R, LEG_L, LEG_R = 0, 1, 2, 3, 4
bones = [b for b in arm_obj.data.bones if b.name != 'root']
nb = len(bones)
gi = {b.name: i for i, b in enumerate(bones)}
A = np.array([list(b.head_local) for b in bones])
Bt = np.array([list(b.tail_local) for b in bones])
AB = Bt - A
den = np.einsum('ij,ij->i', AB, AB)
den[den == 0] = 1e-9

V = np.empty(len(me.vertices) * 3, dtype=np.float64)
me.vertices.foreach_get('co', V)
V = V.reshape(-1, 3)
nv = len(V)
D = np.empty((nv, nb))
for i in range(nb):
    t = np.clip((V - A[i]) @ AB[i] / den[i], 0.0, 1.0)
    D[:, i] = np.linalg.norm(A[i] + np.outer(t, AB[i]) - V, axis=1)

region = np.zeros(nv, dtype=np.int8)
for vi in arm_set[1]:
    region[vi] = ARM_L
for vi in arm_set[-1]:
    region[vi] = ARM_R
for vi in leg_set[1]:
    if region[vi] == TRUNK:
        region[vi] = LEG_L
for vi in leg_set[-1]:
    if region[vi] == TRUNK:
        region[vi] = LEG_R
log('segments: trunk %d  armL %d armR %d  legL %d legR %d'
    % tuple(int((region == r).sum()) for r in (TRUNK, ARM_L, ARM_R, LEG_L, LEG_R)))

COLLAR = H * 0.17          # how much trunk a shoulder and a hip may still move
allow = np.ones((nv, nb), dtype=bool)
for side, tag, arm_r, leg_r in ((1, 'Left', ARM_L, LEG_L), (-1, 'Right', ARM_R, LEG_R)):
    sh = np.array(list(arm_obj.data.bones[C + tag + 'Arm'].head_local))
    hp = np.array(list(arm_obj.data.bones[C + tag + 'UpLeg'].head_local))
    near_sh = np.linalg.norm(V - sh, axis=1) < COLLAR
    near_hp = np.linalg.norm(V - hp, axis=1) < COLLAR
    mine_a = region == arm_r
    mine_l = region == leg_r
    for nm in ('Hand', 'ForeArm'):
        allow[:, gi[C + tag + nm]] = mine_a
    for nm in ('Arm', 'Shoulder'):
        allow[:, gi[C + tag + nm]] = mine_a | near_sh
    for nm in ('Leg', 'Foot', 'ToeBase'):
        allow[:, gi[C + tag + nm]] = mine_l
    allow[:, gi[C + tag + 'UpLeg']] = mine_l | near_hp

W = np.zeros((nv, nb))
for v in me.vertices:
    for g in v.groups:
        n = obj.vertex_groups[g.group].name
        if n in gi:
            W[v.index, gi[n]] = g.weight
cut = int(((W > 0) & ~allow).sum())
W = W * allow
orphan = np.where(W.sum(axis=1) < 1e-6)[0]
for vi in orphan:                       # nothing legal survived: nearest two that are
    d = np.where(allow[vi], D[vi], np.inf)
    order = np.argsort(d)[:2]
    W[vi, order[0]] = 1.0
    if np.isfinite(d[order[1]]) and d[order[1]] < d[order[0]] * 1.5:
        W[vi, order[1]] = 0.5
tot = W.sum(axis=1)
tot[tot == 0] = 1.0
W /= tot[:, None]
for vi in range(nv):                     # at most four, as every rig here ships
    row = W[vi]
    nz = np.nonzero(row)[0]
    if len(nz) > 4:
        row[nz[np.argsort(row[nz])][:len(nz) - 4]] = 0.0
        row /= row.sum()

for n, i in gi.items():
    g = obj.vertex_groups[n]
    g.remove(list(range(nv)))
    for vi in np.nonzero(W[:, i])[0]:
        g.add([int(vi)], float(W[vi, i]), 'REPLACE')
log('segment clean: %d influences cut, %d vertices reassigned' % (cut, len(orphan)))

# a smoothing pass to put the gradient back across the seams the mask opened.
# It is safe AFTER a segmentation and was not before one: smoothing averages
# with neighbours, and neighbours across a touching hand and thigh is exactly
# how the hand got onto the leg in the first place.
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
try:
    bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.4, repeat=2)
    log('weights smoothed')
except Exception as e:
    log('smooth failed:', e)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)

# ---------------------------------------------------------------- materials
me = obj.data
for m in list(me.materials):
    pass
me.materials.clear()
mat = bpy.data.materials.new('Reptilian')
mat.use_nodes = True
nt = mat.node_tree
bsdf = nt.nodes['Principled BSDF']
img = bpy.data.images.load(TEXOUT)
tex = nt.nodes.new('ShaderNodeTexImage')
tex.image = img
nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Metallic'].default_value = 0.0
# the derived relief and the derived roughness — see the note in stage 1
nrm_img = bpy.data.images.load(NRMOUT)
nrm_img.colorspace_settings.name = 'Non-Color'
tn = nt.nodes.new('ShaderNodeTexImage')
tn.image = nrm_img
nmap = nt.nodes.new('ShaderNodeNormalMap')
nt.links.new(tn.outputs['Color'], nmap.inputs['Color'])
nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
rgh_img = bpy.data.images.load(RGHOUT)
rgh_img.colorspace_settings.name = 'Non-Color'
tr = nt.nodes.new('ShaderNodeTexImage')
tr.image = rgh_img
nt.links.new(tr.outputs['Color'], bsdf.inputs['Roughness'])
me.materials.append(mat)

# ------------------------------------------------------------- pose helpers
AX, AY, AZ = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
arm_obj.rotation_mode = 'QUATERNION'
pbs = arm_obj.pose.bones
for pb in pbs:
    pb.rotation_mode = 'QUATERNION'


def basis(pb):
    return pb.bone.matrix_local.to_3x3().inverted()


def setrot(name, *pairs):
    pb = pbs[name]
    m = basis(pb)
    q = Quaternion((1, 0, 0, 0))
    for ax, ang in pairs:
        if ang:
            q = q @ Quaternion((m @ ax).normalized(), ang)
    pb.rotation_quaternion = q


def setloc(name, v):
    pbs[name].location = basis(pbs[name]) @ Vector(v)


def rest():
    for pb in pbs:
        pb.rotation_quaternion = Quaternion((1, 0, 0, 0))
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)


def key(f):
    for pb in pbs:
        pb.keyframe_insert('rotation_quaternion', frame=f)
    pbs['root'].keyframe_insert('location', frame=f)


def new_action(name):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    arm_obj.animation_data.action = act
    try:
        arm_obj.animation_data.action_slot = (act.slots[0] if act.slots
                                              else act.slots.new(id_type='OBJECT', name='Legacy'))
    except Exception:
        pass
    return act


def all_fcurves(act):
    if hasattr(act, 'fcurves') and len(getattr(act, 'fcurves', [])):
        return list(act.fcurves)
    out = []
    for lay in getattr(act, 'layers', []):
        for st in getattr(lay, 'strips', []):
            for cb in getattr(st, 'channelbags', []):
                out.extend(cb.fcurves)
    return out


CLIPS = {}


def finish(act, n, hit=None):
    fcs = all_fcurves(act)
    for fc in fcs:
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'
    CLIPS[act.name] = (n, hit)
    log('  action %-9s frames %3d  curves %d%s'
        % (act.name, n, len(fcs), '  hit %.3f' % hit if hit else ''))


def ease(t):
    return t * t * (3 - 2 * t)


def lerp(a, b, k):
    return {x: a.get(x, 0.0) + (b.get(x, 0.0) - a.get(x, 0.0)) * k for x in set(a) | set(b)}


# ---------------------------------------------- what stops it reading as a doll
# MOTION IS FLUID WHEN IT DOES NOT ALL ARRIVE AT ONCE. Every joint in these
# clips ran off ONE number, so the hips, the chest, the shoulder, the elbow
# and the head all started together, crossed together and stopped together —
# which is the single thing that makes pose-to-pose animation read as a
# mannequin being posed rather than an animal moving. It is the Dealer's own
# lesson and his own two helpers, and it costs nothing but a shifted clock.
#
# The shift goes the other way round here. `drag` makes a joint arrive LATE,
# which is what the Dealer does to his arms — but the contact fraction of
# these attacks is MEASURED ON THE STRIKING HAND and the build checks it, so
# lagging the hand would move the blow off the frame the game deals damage on.
# The hand keeps the authored clock and the BODY IS BROUGHT FORWARD instead:
# same relative order, hips first and hand last, with `hit` still true.
def lead(t, d):
    return min(1.0, t / (1.0 - d))


def follow(t, a, amp=0.12, n=1.6):
    """And a limb does not simply stop. Past `a` it carries on a little and
    comes back — one soft decaying bounce, which is the follow-through a blow
    that LANDED has and a blow that was placed does not."""
    if t <= a:
        return 0.0
    x = (t - a) / max(1e-6, 1.0 - a)
    return amp * math.sin(math.pi * n * x) * (1 - x) ** 2


# which joints belong to which part of the body, for the staging above
CORE_K = {'sway', 'surge', 'lift', 'pitch', 'roll', 'yaw',
          'lhip', 'lknee', 'lankle', 'ltoe', 'lsplay',
          'rhip', 'rknee', 'rankle', 'rtoe', 'rsplay'}
TORSO_K = {'spitch', 'syaw', 'sroll'}
HEAD_K = {'hpitch', 'hyaw', 'hroll'}


def staged(P0, P1, P2, t, cock, hit, snap=None, lags=(0.13, 0.07, 0.045)):
    """The same three-keypose swing, with the body ahead of the arm.
    `lags` is (legs and root, chest, head); the arms run on `t` itself."""
    core = blend(P0, P1, P2, lead(t, lags[0]), cock, hit, snap)
    torso = blend(P0, P1, P2, lead(t, lags[1]), cock, hit, snap)
    head = blend(P0, P1, P2, lead(t, lags[2]), cock, hit, snap)
    arms = blend(P0, P1, P2, t, cock, hit, snap)
    out = {}
    for k in set(core) | set(torso) | set(head) | set(arms):
        src = core if k in CORE_K else torso if k in TORSO_K else head if k in HEAD_K else arms
        out[k] = src.get(k, 0.0)
    return out


def blend(P0, P1, P2, t, cock, hit, snap=None):
    """Three keyposes and three lerps — the shovel swing's own shape, and the
    reason `hit` is the fraction at which the CONTACT pose is reached rather
    than the end of the wind-up. An attack whose damage lands on the frame the
    limb is drawn furthest BACK is the bug this shape exists to prevent."""
    if t <= cock:
        return lerp(P0, P1, ease(t / cock))
    if t <= hit:
        u = (t - cock) / (hit - cock)
        return lerp(P1, P2, (snap or ease)(u))
    u = (t - hit) / (1.0 - hit)
    over = math.exp(-u * 3.4) * math.sin(u * 7.6) * 0.26      # it carries past and settles back
    return lerp(P2, P0, ease(u) - over)


L, R = 'Left', 'Right'


def apply(p):
    def g(k):
        return p.get(k, 0.0)
    setloc('root', (g('sway'), g('surge'), g('lift')))
    setrot(C + 'Hips', (AX, g('pitch')), (AY, g('roll')), (AZ, g('yaw')))
    for i, nm in enumerate(('Spine', 'Spine1', 'Spine2')):
        w = (0.5, 0.8, 1.0)[i]
        setrot(C + nm, (AX, g('spitch') * w * 0.34), (AZ, g('syaw') * w * 0.34),
               (AY, g('sroll') * w * 0.34))
    setrot(C + 'Neck', (AX, g('hpitch') * 0.4), (AZ, g('hyaw') * 0.4))
    setrot(C + 'Head', (AX, g('hpitch') * 0.6), (AZ, g('hyaw') * 0.6), (AY, g('hroll')))
    for side, tag in ((1, L), (-1, R)):
        k = 'l' if side > 0 else 'r'
        setrot(C + tag + 'Shoulder', (AY, g(k + 'sh') * side))
        setrot(C + tag + 'Arm', (AX, g(k + 'arm')), (AY, g(k + 'out') * side),
               (AZ, g(k + 'twist') * side))
        setrot(C + tag + 'ForeArm', (AX, g(k + 'elbow')), (AZ, g(k + 'ftw') * side))
        setrot(C + tag + 'Hand', (AX, g(k + 'wrist')), (AZ, g(k + 'claw') * side))
        setrot(C + tag + 'UpLeg', (AX, g(k + 'hip')), (AY, g(k + 'splay') * side))
        setrot(C + tag + 'Leg', (AX, g(k + 'knee')))
        setrot(C + tag + 'Foot', (AX, g(k + 'ankle')))
        setrot(C + tag + 'ToeBase', (AX, g(k + 'toe')))


def crouched(k=1.0):
    """The stance everything is authored on top of. It does NOT stand to
    attention: a thing that is coming for you carries its weight forward with
    its knees soft and its claws up, and straight limbs read as sticks."""
    return dict(pitch=0.10 * k, lift=-0.055 * k, spitch=0.06 * k,
                hpitch=-0.10 * k,
                larm=-0.30 * k, lelbow=-0.85 * k, lout=0.22 * k, lwrist=-0.25 * k,
                rarm=-0.30 * k, relbow=-0.85 * k, rout=0.22 * k, rwrist=-0.25 * k,
                lhip=-0.16 * k, lknee=0.34 * k, lankle=-0.18 * k, lsplay=0.07 * k,
                ltoe=0.16 * k, rtoe=0.14 * k,     # nothing alive is symmetric
                rhip=-0.16 * k, rknee=0.34 * k, rankle=-0.18 * k, rsplay=0.07 * k)


def add(base, **kw):
    d = dict(base)
    for x, v in kw.items():
        d[x] = d.get(x, 0.0) + v
    return d


BASE = crouched()

# ------------------------------------------- what was still stiff, and why
# THE HANDS AND THE SHOULDERS NEVER MOVED AT ALL. Rendered as eight-frame
# strips out of the shipped GLB, the run reads as one pose being carried
# along: the legs cycle, and the claws, the wrists and the clavicles hold
# exactly the guard the stance was authored in for every frame of every clip.
# `sh`, `wrist` and `claw` were in the vocabulary from the first build and
# nothing had ever written one. A limb that ends in a frozen hand is a limb
# with a glove nailed to it, and that is most of what "stiff" means on
# something you fight at two metres.
#
# And the arm SWING was a pendulum with a symmetric elbow (abs(sin)), which
# closes the elbow twice a cycle -- once on the drive and once on the
# recovery -- so the arms read as a shiver at double the leg rate rather than
# as a drive. An elbow closes as the hand comes FORWARD and opens behind.
def arm_drive(p, k, sw, carry, swing, fold, wide=0.0):
    """Everything above the waist that answers a stride, in one place: the
    upper arm swings, the elbow folds only on the drive, the clavicle rides
    with it, the wrist trails a beat behind the forearm and the fingers
    close as the hand comes through."""
    p[k + 'arm'] = carry + sw * swing
    p[k + 'elbow'] = -0.85 - max(0.0, sw) * fold - max(0.0, -sw) * fold * 0.18
    p[k + 'sh'] = 0.04 + sw * 0.10
    p[k + 'out'] = 0.22 + wide - sw * 0.06
    p[k + 'wrist'] = -0.25 - sw * 0.26          # the hand is dragged by the forearm
    p[k + 'claw'] = 0.06 + max(0.0, sw) * 0.26  # and the claw closes on the drive


# ===================================================================== IDLE
# Three periods that never line up -- a breath, a weight shift and a head
# scan -- because anything on one clock reads as a machine. A fourth one now,
# much slower than any of them, on the hands: nothing alive holds a hand
# still, and a claw that never opens is the clearest tell there is that what
# you are looking at is a model rather than an animal.
act = new_action('idle')
N = 150
for f in range(N + 1):
    rest()
    t = f / N
    br = math.sin(t * math.pi * 2 * 3)          # breath
    sh = math.sin(t * math.pi * 2 * 2 + 0.9)    # weight
    sc_ = math.sin(t * math.pi * 2 * 1 + 2.1)   # the head looking about
    fg = math.sin(t * math.pi * 2 * 0.5 + 1.4)  # and the hands, slowest of all
    p = add(BASE, spitch=0.030 * br, lift=0.012 * br, sway=0.020 * sh, roll=0.030 * sh,
            hyaw=0.26 * sc_, hpitch=0.05 * br, syaw=0.05 * sh, sroll=0.020 * sh,
            larm=0.05 * br, rarm=0.05 * br, lelbow=-0.06 * br, relbow=-0.06 * br,
            lsh=0.05 * br, rsh=0.045 * br,
            lwrist=-0.10 * br + 0.07 * fg, rwrist=-0.08 * br - 0.06 * fg,
            lclaw=0.16 + 0.14 * fg, rclaw=0.13 - 0.12 * fg,
            lknee=0.03 * sh, rknee=-0.03 * sh)
    apply(p)
    key(f)
finish(act, N)

# ===================================================================== WALK
act = new_action('walk')
N = 34
for f in range(N + 1):
    rest()
    t = f / N
    a = t * math.pi * 2
    p = dict(BASE)
    for side, k in ((1, 'l'), (-1, 'r')):
        ph = a + (0 if side > 0 else math.pi)
        bias = 1.0 if side > 0 else 0.94      # nothing alive is symmetric
        p[k + 'hip'] = -0.16 + math.sin(ph) * 0.52 * bias
        p[k + 'knee'] = 0.34 + max(0.0, -math.cos(ph)) * 0.72
        p[k + 'ankle'] = -0.18 - math.sin(ph) * 0.16
        # THE FOOT ROLLS OVER THE TOE. A leg that swings, meets the ground and
        # holds the foot rigid through the whole stance is the paddle this
        # file already named once on the monster: the toe extends as the heel
        # comes up behind, and grips as the foot is planted in front.
        p[k + 'toe'] = 0.10 + max(0.0, math.sin(ph + 0.9)) * 0.62
        arm_drive(p, k, -math.sin(ph), -0.30, 0.40, 0.34)
    p['lift'] = -0.055 + abs(math.sin(a)) * 0.030 - max(0.0, -math.cos(a)) * 0.016
    p['roll'] = math.sin(a) * 0.055
    p['sway'] = math.sin(a) * 0.020
    p['syaw'] = -math.sin(a) * 0.15
    p['sroll'] = math.sin(a) * 0.05           # the chest twists against the hips
    p['spitch'] = 0.06 + abs(math.sin(a)) * 0.030
    p['hyaw'] = math.sin(a) * 0.10            # and the head holds its line against it
    p['hpitch'] = -0.10 + abs(math.cos(a)) * 0.030
    apply(p)
    key(f)
finish(act, N)

# ====================================================================== RUN
# A run is not a fast walk: the body is lower and further forward, the knees
# fold much harder, and the arms drive instead of swinging. The torso pitches
# and the hips drop at each contact -- twice a cycle, which is the rhythm
# that says a body is taking its own weight rather than being carried along.
act = new_action('run')
N = 22
for f in range(N + 1):
    rest()
    t = f / N
    a = t * math.pi * 2
    p = crouched(1.35)
    for side, k in ((1, 'l'), (-1, 'r')):
        ph = a + (0 if side > 0 else math.pi)
        bias = 1.0 if side > 0 else 0.95
        p[k + 'hip'] = -0.22 + math.sin(ph) * 0.86 * bias
        p[k + 'knee'] = 0.42 + max(0.0, -math.cos(ph)) * 1.28
        p[k + 'ankle'] = -0.20 - math.sin(ph) * 0.24
        p[k + 'toe'] = 0.14 + max(0.0, math.sin(ph + 0.85)) * 0.95   # harder at a run
        arm_drive(p, k, -math.sin(ph), -0.40, 0.82, 0.60, wide=-0.04)
    p['pitch'] = 0.26 - math.cos(a * 2) * 0.045
    p['lift'] = -0.085 + abs(math.sin(a)) * 0.070 - max(0.0, -math.cos(a)) * 0.028
    p['roll'] = math.sin(a) * 0.085
    p['sway'] = math.sin(a) * 0.030
    p['yaw'] = math.sin(a) * 0.045
    p['syaw'] = -math.sin(a) * 0.24
    p['sroll'] = math.sin(a) * 0.070
    p['spitch'] = 0.10 + math.cos(a * 2) * 0.045
    p['hyaw'] = math.sin(a) * 0.15
    p['hpitch'] = -0.16 + math.cos(a * 2) * 0.045
    apply(p)
    key(f)
finish(act, N)

# =================================================================== STRAFE
# IT CIRCLES YOU MORE THAN IT WALKS AT YOU, AND IT WAS DOING IT ON THE WALK
# CLIP. `strafeL` and `strafeR` were aliases onto `walk` for every creature in
# this game, so a reptilian holding its distance strode straight ahead while
# it travelled sideways -- the feet went one way and the animal went another,
# which is the plainest possible version of "the animations are off". It
# spends more of a fight doing this than anything else (`circle: 0.55`), so
# it is worth a clip of its own.
#
# The cycle is a SHUFFLE and the phase is what makes it one. Each foot's
# body-relative offset along the travel line is -cos(ph)/2 and it is off the
# ground exactly while sin(ph) > 0 -- which is precisely the half in which
# that offset is INCREASING. So a foot moves outward while it is in the air
# and inward while it is planted, and inward-while-planted is the body
# sliding over it. Lead foot reaches out and plants; trail foot is drawn in
# after it; nothing ever crosses and nothing ever skates.
for tag, d in (('strafeL', 1), ('strafeR', -1)):
    act = new_action(tag)
    N = 26
    for f in range(N + 1):
        rest()
        t = f / N
        a = t * math.pi * 2
        p = crouched(1.20)                       # lower than a walk: it is fighting
        for side, k in ((1, 'l'), (-1, 'r')):
            # NOT `lead`: that is the staging helper `staged()` calls, and binding
            # a bool over it took the LIGHT clip down with 'bool object is not callable'
            ahead = side * d > 0                 # the foot on the side it is going
            ph = a if ahead else a + math.pi
            rel = -0.5 * math.cos(ph)            # where it is along the travel line
            off = max(0.0, math.sin(ph))         # and whether it is off the ground
            p[k + 'splay'] = 0.08 + rel * (side * d) * 0.88
            p[k + 'hip'] = -0.20 - off * 0.16 + rel * 0.10
            p[k + 'knee'] = 0.40 + off * 0.62
            p[k + 'ankle'] = -0.20 + off * 0.14
            p[k + 'toe'] = 0.12 + off * 0.42
            # the arms counterbalance ACROSS the step, and the lead one opens out
            sw = (0.34 if ahead else -0.26) * math.sin(a) * d * side
            arm_drive(p, k, sw, -0.34, 0.30, 0.26, wide=0.10 if ahead else -0.04)
        p['sway'] = -0.045 * d * math.cos(a)
        p['lift'] = -0.075 + abs(math.sin(a)) * 0.026
        p['roll'] = 0.07 * d * math.sin(a)
        p['yaw'] = 0.05 * d * math.cos(a)
        p['syaw'] = -0.11 * d * math.sin(a)
        p['sroll'] = 0.05 * d * math.sin(a)
        p['spitch'] = 0.08 + abs(math.sin(a)) * 0.025
        # AND IT KEEPS ITS EYES ON YOU. It is going sideways; it is not
        # looking sideways, which is the whole reason it is going sideways.
        p['hyaw'] = -0.10 * d
        p['hpitch'] = -0.12 + abs(math.cos(a)) * 0.03
        apply(p)
        key(f)
    finish(act, N)

# ==================================================================== LIGHT
# A CLAW RAKED ACROSS YOU, AND IT IS THROWN FROM THE FEET. The first version
# had the shape right and read as a doll doing it, because the only thing that
# moved was the arm: the hips did not turn, the weight did not shift, and
# every joint started and stopped on the same frame. What carries a swing is
# the body under it — the far foot drives, the hips rotate through, the chest
# follows the hips and the claw is last and overshoots. It comes from OUTSIDE
# the body and crosses, so the anticipation is opposite the action and the
# whole thing is legible from across the room; contact is at 0.55, part way
# through the sweep and not at its end.
act = new_action('light')
N, COCK, HIT = 30, 0.36, 0.55
P0 = dict(BASE)
P1 = add(BASE, pitch=0.02, yaw=-0.40, syaw=-0.42, sroll=-0.10, hyaw=-0.16, hpitch=-0.04,
         # the weight goes onto the back foot and the knee loads
         sway=-0.16, lift=-0.09, rhip=0.10, rknee=0.62, rankle=-0.30, rsplay=0.12,
         lhip=-0.34, lknee=0.18, ltoe=0.34,
         rarm=-1.15, relbow=-1.45, rout=-0.62, rtwist=0.60, rwrist=-0.55, rclaw=-0.30,
         rsh=-0.16, lsh=0.10,
         larm=-0.05, lelbow=-0.55, lout=-0.10)
P2 = add(BASE, pitch=0.14, yaw=0.34, syaw=0.52, sroll=0.12, hyaw=0.20, hpitch=0.06,
         # and off it, onto the front foot, which is what makes it a blow
         sway=0.20, surge=0.20, lift=-0.05, rhip=-0.46, rknee=0.30, rtoe=0.55,
         lhip=0.10, lknee=0.52, lankle=-0.26,
         rarm=-0.48, relbow=-0.28, rout=1.05, rtwist=-0.70, rwrist=0.40, rclaw=0.25,
         rsh=0.20, lsh=-0.12,
         larm=-0.55, lelbow=-1.20, lout=0.45)
for f in range(N + 1):
    rest()
    t = f / N
    p = staged(P0, P1, P2, t, COCK, HIT)
    # the claw carries past its own stop and settles back through it
    fo = follow(t, HIT, 0.30, 1.5)
    p['rarm'] = p.get('rarm', 0.0) - fo
    p['rout'] = p.get('rout', 0.0) + fo * 0.7
    p['syaw'] = p.get('syaw', 0.0) + fo * 0.5
    apply(p)
    key(f)
finish(act, N, HIT)

# ==================================================================== HEAVY
# BOTH CLAWS UP OVER THE HEAD AND BROUGHT STRAIGHT DOWN THE MIDDLE — the one
# swing that is a smash. It RISES onto its toes at the top, hangs there (the
# quartic drop covers the last half of the fall in a fifth of the time, so the
# hang is most of the clip and the hang is the whole tell), and lands with the
# knees taking it. The shovel's own overhead, on a different animal.
act = new_action('heavy')
N, COCK, HIT = 48, 0.54, 0.72
P0 = dict(BASE)
P1 = add(BASE, pitch=-0.36, lift=0.16, spitch=-0.34, hpitch=0.42, surge=-0.10,
         # up onto the toes, legs straightening, everything gathered
         lhip=-0.10, rhip=-0.10, lknee=0.06, rknee=0.06, lankle=0.26, rankle=0.26,
         ltoe=0.52, rtoe=0.52,
         larm=-2.45, lelbow=-0.40, lout=0.30, lwrist=-0.70, lclaw=-0.35, lsh=-0.14,
         rarm=-2.45, relbow=-0.40, rout=0.30, rwrist=-0.70, rclaw=-0.35, rsh=-0.14)
# NOT AS FAR AS IT WILL GO. At pitch 0.72 over spitch 0.60 the body folded
# through seventy-five degrees and the head finished near the floor, which is
# a creature smashing its own feet — and this blow is tested on a horizontal
# reach of 2.55 m, so it has to land OUT in front of it.
P2 = add(BASE, pitch=0.50, lift=-0.28, spitch=0.40, hpitch=-0.30, surge=0.30,
         # and down through it, the knees taking the whole blow
         lhip=-0.58, rhip=-0.58, lknee=1.05, rknee=1.05, lankle=-0.42, rankle=-0.42,
         ltoe=0.16, rtoe=0.16, lsplay=0.16, rsplay=0.16,
         larm=0.46, lelbow=-0.22, lout=0.10, lwrist=0.55, lclaw=0.30, lsh=0.18,
         rarm=0.46, relbow=-0.22, rout=0.10, rwrist=0.55, rclaw=0.30, rsh=0.18)
for f in range(N + 1):
    rest()
    t = f / N
    p = staged(P0, P1, P2, t, COCK, HIT, snap=lambda u: u ** 4, lags=(0.10, 0.055, 0.03))
    # a smash rebounds off what it hit
    fo = follow(t, HIT, 0.26, 1.3)
    for k in ('larm', 'rarm'):
        p[k] = p.get(k, 0.0) - fo
    p['pitch'] = p.get('pitch', 0.0) - fo * 0.5
    p['lknee'] = p.get('lknee', 0.0) - fo * 0.4
    p['rknee'] = p.get('rknee', 0.0) - fo * 0.4
    apply(p)
    key(f)
finish(act, N, HIT)

# ==================================================================== DODGE
# IT GETS OUT OF THE WAY, AND IT GOES SIDEWAYS. A dodge that goes backwards is
# a step back, which is a thing it already does; what makes this readable is
# that it LEAVES the line you are swinging along. It crouches, drives off the
# far foot, is briefly off the ground, and lands low on the near one.
act = new_action('dodge')
N = 24
for f in range(N + 1):
    rest()
    t = f / N
    push = ease(min(1.0, t / 0.30))
    fly = math.sin(min(1.0, max(0.0, (t - 0.18) / 0.62)) * math.pi)
    land = ease(max(0.0, (t - 0.62) / 0.38))
    p = crouched(1.0 + 0.5 * push - 0.3 * land)
    p['sway'] = 0.62 * ease(min(1.0, t / 0.80))
    p['lift'] = -0.055 - 0.10 * push + 0.16 * fly - 0.12 * land
    p['roll'] = -0.42 * fly
    p['yaw'] = 0.20 * fly
    p['syaw'] = 0.24 * fly
    p['hyaw'] = -0.34 * fly          # it keeps its eyes on you all the way through
    p['lhip'] = -0.16 - 1.05 * fly
    p['lknee'] = 0.34 + 1.35 * fly
    p['rhip'] = -0.16 + 0.55 * fly - 0.35 * land
    p['rknee'] = 0.34 + 0.30 * fly + 0.55 * land
    p['larm'] = -0.30 - 0.75 * fly
    p['lout'] = 0.22 + 0.55 * fly
    p['rarm'] = -0.30 - 0.30 * fly
    p['rout'] = 0.22 + 0.85 * fly
    p['lelbow'] = -0.85 - 0.40 * fly
    p['relbow'] = -0.85 - 0.25 * fly
    apply(p)
    key(f)
finish(act, N)

# ===================================================================== HURT
# A FLINCH IS NOT A WOBBLE. The first one ran every joint off one sine and
# read as the whole animal shivering; what a body actually does when it is
# opened is give at the point it was hit and CATCH ITSELF — the head snaps
# first because it is light, the chest folds over the wound, the legs take the
# weight late, and the whole thing rings out rather than easing out.
act = new_action('hurt')
N = 16
for f in range(N + 1):
    rest()
    t = f / N
    hit_ = math.sin(min(1.0, t * 2.4) * math.pi) ** 0.5          # the give
    catch = follow(t, 0.30, 0.55, 1.2)                            # and the recovery
    ring = math.exp(-t * 3.6) * math.sin(t * 27)
    p = add(BASE,
            # the head is thrown first and furthest: it is the lightest thing on it
            hpitch=0.52 * hit_ + 0.10 * ring, hyaw=-0.34 * hit_, hroll=0.20 * hit_,
            spitch=0.34 * hit_ - 0.12 * catch, syaw=-0.24 * hit_, sroll=0.16 * hit_,
            pitch=0.26 * hit_ + 0.05 * ring, roll=0.18 * hit_, yaw=-0.14 * hit_,
            surge=-0.16 * hit_, lift=-0.10 * hit_,
            # the arms come IN, over the wound
            larm=-0.46 * hit_, lelbow=-0.60 * hit_, lout=-0.26 * hit_,
            rarm=-0.30 * hit_, relbow=-0.44 * hit_, rout=-0.18 * hit_,
            # and the legs take it late, which is what stops it being a wobble
            lknee=0.34 * hit_ - 0.14 * catch, rknee=0.26 * hit_ - 0.10 * catch,
            lankle=-0.12 * hit_, rankle=-0.10 * hit_, ltoe=0.20 * hit_)
    apply(p)
    key(f)
finish(act, N)

# ===================================================================== ROAR
act = new_action('roar')
N = 46
for f in range(N + 1):
    rest()
    t = f / N
    up = ease(min(1.0, t / 0.26))
    hold = math.exp(-max(0.0, t - 0.30) * 2.2)
    out = ease(max(0.0, (t - 0.66) / 0.34))
    k = (up - out)
    sh = math.sin(t * 44) * 0.030 * hold * k
    p = add(crouched(1.0 + 0.35 * k), pitch=-0.24 * k, spitch=-0.30 * k,
            hpitch=0.62 * k + sh, hroll=sh,
            larm=-0.55 * k, lout=0.85 * k, lelbow=-0.55 * k, lwrist=-0.5 * k,
            rarm=-0.55 * k, rout=0.85 * k, relbow=-0.55 * k, rwrist=-0.5 * k,
            lhip=-0.12 * k, rhip=-0.12 * k, lknee=0.26 * k, rknee=0.26 * k,
            lift=-0.05 * k)
    apply(p)
    key(f)
finish(act, N)

# ====================================================================== DIE
# It goes over, and it goes over ITS OWN FEET: the knees give first, the body
# folds forward, and it puts a hand down before it goes. It is left face down
# with one arm under it, which is where a thing that fell forward ends up.
act = new_action('die')
N = 58
for f in range(N + 1):
    rest()
    t = f / N
    a = ease(min(1.0, t / 0.30))                        # the knees give
    b = ease(max(0.0, min(1.0, (t - 0.20) / 0.52)))     # it goes down
    c = ease(max(0.0, (t - 0.60) / 0.40))               # and settles
    tw = math.exp(-max(0.0, t - 0.34) * 5.0) * math.sin(t * 26) * (1 - c)
    p = dict(BASE)
    p['pitch'] = 0.10 + 1.15 * b + 0.04 * tw
    p['roll'] = 0.22 * b + 0.05 * tw
    p['yaw'] = -0.16 * b
    p['lift'] = -0.055 - 0.60 * a - 0.34 * b
    p['surge'] = 0.10 * a + 0.34 * b
    p['spitch'] = -0.20 * a + 0.42 * b
    p['sroll'] = 0.20 * b
    p['hpitch'] = 0.30 * a - 0.55 * b + 0.08 * tw
    p['hyaw'] = 0.24 * b
    p['larm'] = -0.30 - 1.15 * a + 0.55 * b
    p['lelbow'] = -0.85 - 0.70 * b
    p['lout'] = 0.22 + 0.45 * b
    p['rarm'] = -0.30 - 0.45 * a - 0.35 * b
    p['relbow'] = -0.85 - 0.30 * b
    p['rout'] = 0.22 + 0.85 * b
    p['lhip'] = -0.16 - 0.75 * a - 0.30 * b
    p['lknee'] = 0.34 + 1.45 * a + 0.30 * b
    p['rhip'] = -0.16 - 0.55 * a - 0.55 * b
    p['rknee'] = 0.34 + 1.25 * a + 0.55 * b
    p['lankle'] = -0.18 + 0.40 * a
    p['rankle'] = -0.18 + 0.35 * a
    apply(p)
    key(f)
finish(act, N)

# ------------------------------------------------- measure the contact frames
# The declared `hit` is checked rather than trusted: the striking hand should
# be near its own extreme within a couple of frames of it, and a pose edited
# after the fact silently moves that. The monster's build has caught this three
# times, so it is the same check.
dg = bpy.context.evaluated_depsgraph_get()
sc = bpy.context.scene


def track(action, bone, n):
    arm_obj.animation_data.action = action
    try:
        arm_obj.animation_data.action_slot = action.slots[0]
    except Exception:
        pass
    out = []
    for f in range(n + 1):
        sc.frame_set(f)
        dg.update()
        e = arm_obj.evaluated_get(dg)
        out.append((e.matrix_world @ e.pose.bones[bone].head).copy())
    return out


# AND "FURTHEST FORWARD" IS THE WRONG QUESTION TO ASK OF A RAKE. The crouched
# stance already carries both claws out in front, so the frame at which the
# striking hand is furthest along -Y is the REST pose — the check reported
# frame 3 of a swing that lands at 14 and looked like a bug in the clip. A
# smash is measured by where it is LOWEST, which is the thing an overhead
# does; a horizontal rake has no extreme of position at all and is measured
# by where it is FASTEST, which is what a contact is.
for nm, bn, how in (('light', C + 'RightHand', 'speed'),
                    ('heavy', C + 'LeftHand', 'lowest')):
    act = bpy.data.actions[nm]
    n, hit = CLIPS[nm]
    ps = track(act, bn, n)
    if how == 'speed':
        ref = max(range(1, n), key=lambda i: (ps[i + 1] - ps[i - 1]).length)
    else:
        ref = min(range(n + 1), key=lambda i: ps[i].z)
    want = int(round(hit * n))
    log('  %-6s hit f%-3d declared %.3f   %s at f%d %s'
        % (nm, want, hit, how, ref, '' if abs(ref - want) <= 3 else '<-- CHECK'))

# ---------------------------------------------------------------- the export
sc.frame_set(0)
rest()
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='ACTIONS',
    export_bake_animation=True, export_force_sampling=True,
    export_frame_range=False, export_optimize_animation_size=False,
    export_yup=True, export_apply=False, export_skins=True,
    export_normals=True, export_tangents=False, export_morph=False,
    export_image_format='JPEG', export_jpeg_quality=90,
    export_def_bones=False, export_hierarchy_full_collections=False)
log('bounds', [round(v, 2) for v in co.min(axis=0)], [round(v, 2) for v in co.max(axis=0)])
log('tris %d  bones %d  clips %s' % (len(obj.data.polygons), len(arm_obj.data.bones),
                                     sorted(CLIPS)))
log('DONE %s  %.2f MB' % (OUT, os.path.getsize(OUT) / 1048576))
