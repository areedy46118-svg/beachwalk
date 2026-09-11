"""Build assets/monster.glb from the "alien monster" blend — the UFO's boss.

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --python tools/monster_anim.py
    ... --strips        also render an 8-frame contact sheet per clip

The download is a rig with NO CLIPS — 76 bones, 11,907 polys, one 4K map —
which is the smile's situation and gets the smile's treatment: the clips are
authored here on its own bones. What it is, measured off the vertex weights
rather than guessed from the hierarchy (the teeth settle it: `teeth top` is
bone-parented to Bone.003 and `teeth bottom` to Bone.027, so those two are the
head and the jaw):

    A QUADRUPED WITH A SCORPION TAIL. Head low and forward at 2.7 m, four legs
    that reach the floor, two small palps that hang at 1.1 m, and a 22-bone
    tail that arcs back, up and over the spine to 6.4 m. That tail is the
    creature's whole silhouette, so it is the signature attack: everything
    else it does, something else in this game already does.

Armature space is Blender's — Z up — and the creature FACES -Y, so its right
is -X. Blender -Y exports as glTF +Z, which means in the game its front is +Z
and it is aimed the mutant's way (`atan2(dx, dz)` with NO `+ PI`; the crab's
front is -Z and needs one).

Bones are renamed to what they are, because `Bone.047` twelve times in a pose
table is unreadable and the game reads several of them by name.
"""
import os, sys, math, json
# bpy and mathutils only exist in stage 2; stage 1 runs under the system
# python, where PIL does the grading (Blender bundles numpy but not PIL)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.environ.get('MONSTER_SRC', os.path.join(
    os.path.expanduser('~'), 'AppData', 'Local', 'Temp', 'claude',
    'C--Users-areed-projects-beachwalk',
    '79655e97-9937-4ce9-b96f-d3067fbb794c', 'scratchpad', 'monster', 'monster 3d'))
BLEND = os.path.join(SRC, 'alien+monster.blend')
TEXSRC = os.path.join(SRC, 'alien texture.png')
OUT = os.path.join(ROOT, 'assets', 'monster.glb')
STAGE = os.path.join(SRC, 'stage')
STRIPS = '--strips' in sys.argv
FPS = 30
TEX = 2048
BLENDER = os.environ.get(
    'BLENDER', r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe')


def log(*a):
    print('[monster]', *a)
    sys.stdout.flush()


TEXOUT = os.path.join(STAGE, 'alien_color.jpg')

# ----------------------------------------------------------------------
# Stage 1 (system python): the map, DARKENED AT SOURCE
# ----------------------------------------------------------------------
# MEASURED, NOT GUESSED — AND THE MEAN WAS THE WRONG THING TO MEASURE. The
# download's albedo has a mean of 168 where the three mutants ship at 35-37,
# and a flat multiply brings the mean to 37 exactly. It also brings the
# CONTRAST down by the same factor, and that is what the eye reads as texture:
# shipped that way the map had a p5..p95 spread of 22 against the mutants' 39
# and 44, and the creature came back as an untextured grey shape with the map
# demonstrably applied and nothing on it to see. Darkening is a LEVEL change
# and it must not be a RANGE change, so the map is remapped to a target mean
# AND a target spread — which is a shift and a scale about the mean, not a
# multiply — and only then graded cold so it sits in this light.
# AND IT LIVES IN A LIT ROOM, which the mutants do not. Their 36/12 is tuned
# for a beach whose only light is a quarter moon behind you; the hall has three
# lamps in it, so this one is carried further by its own map and can afford to
# sit above them without becoming the white cut-out it started as.
TEX_MEAN = 46.0
TEX_SD = 17.0
TEX_GAIN = (0.94, 0.99, 1.08)      # cool: it is lit by a moon and a dead ship
SCENE_BLUE, BLUE_MIX = (0.28, 0.34, 0.46), 0.08

try:
    import bpy
except ImportError:
    bpy = None

if bpy is None:
    import subprocess
    from PIL import Image, ImageStat
    os.makedirs(STAGE, exist_ok=True)
    col = Image.open(TEXSRC).convert('RGB').resize((TEX, TEX), Image.LANCZOS)
    st0 = ImageStat.Stat(col)
    ch = list(col.split())
    for i in range(3):
        m, sd = st0.mean[i], max(1e-3, st0.stddev[i])
        k = (TEX_SD / sd) * TEX_GAIN[i]          # the SPREAD is set, not scaled away
        c = TEX_MEAN * TEX_GAIN[i]
        blu = SCENE_BLUE[i] * 255 * BLUE_MIX
        ch[i] = ch[i].point(lambda v, k=k, c=c, m=m, blu=blu:
                            int(max(0, min(255, (c + (v - m) * k) * (1 - BLUE_MIX) + blu))))
    col = Image.merge('RGB', ch)
    col.save(TEXOUT, quality=92, optimize=True)
    st1 = ImageStat.Stat(col.convert('L'))
    g0 = ImageStat.Stat(Image.open(TEXSRC).convert('L').resize((512, 512), Image.LANCZOS))
    log('map %d px  mean %.0f -> %.0f   stddev %.1f -> %.1f   (%d KB)'
        % (TEX, g0.mean[0], st1.mean[0], g0.stddev[0], st1.stddev[0],
           os.path.getsize(TEXOUT) // 1024))
    log('running blender ...')
    r = subprocess.run([BLENDER, '-b', '--python', os.path.abspath(__file__)] + sys.argv[1:],
                       capture_output=True, text=True)
    blog = os.path.join(STAGE, 'blender.log')
    open(blog, 'w', encoding='utf-8', errors='replace').write(r.stdout + r.stderr)
    keep = False
    for line in (r.stdout + r.stderr).splitlines():
        if line.startswith('[monster]'):
            print(line)
        if 'Traceback' in line:
            keep = True
        if keep:
            print(line)
    log('blender log ->', blog)
    raise SystemExit(r.returncode)

# ----------------------------------------------------------------------
# Stage 2 (blender): the rig, the clips, the export
# ----------------------------------------------------------------------
from mathutils import Vector, Quaternion

bpy.ops.wm.open_mainfile(filepath=BLEND)
KEEP = {'final alien monster', 'teeth top', 'teeth bottom', 'Alien Armature'}
for o in list(bpy.data.objects):
    if o.name not in KEEP:
        bpy.data.objects.remove(o, do_unlink=True)
arm = bpy.data.objects['Alien Armature']
body = bpy.data.objects['final alien monster']
log('kept', [o.name for o in bpy.data.objects])

# ---------------------------------------------------------------- bone names
# Walk the chains rather than listing 76 names: a chain is "follow the only
# child until it forks", which is exactly what a limb is.
def chain(start, n=None):
    out, b = [], arm.data.bones[start]
    while True:
        out.append(b.name)
        if n and len(out) >= n:
            break
        kids = list(b.children)
        if len(kids) != 1:
            break
        b = kids[0]
    return out


TAIL = chain('Bone.005')
RENAME = {'Bone': 'root', 'Bone.004': 'thorax', 'Bone.001': 'neck',
          'Bone.002': 'head_base', 'Bone.003': 'head', 'Bone.027': 'jaw'}
for i, n in enumerate(TAIL):
    RENAME[n] = 'tail%02d' % (i + 1)
# +X is the creature's LEFT (it faces -Y with Z up, so right is -X)
LIMBS = {'legFL': 'Bone.038', 'legFR': 'Bone.057',
         'legBL': 'Bone.028', 'legBR': 'Bone.047',
         'palpL': 'Bone.070', 'palpR': 'Bone.073'}
for tag, start in LIMBS.items():
    for i, n in enumerate(chain(start)):
        RENAME[n] = '%s_%d' % (tag, i + 1)
# whatever is left is a toe or a fang: name it after its parent so nothing
# in the file is still called Bone.061
for b in arm.data.bones:
    if b.name in RENAME:
        continue
    p = b.parent
    stem = RENAME.get(p.name if p else '', 'tip') if p else 'tip'
    k = 1
    while '%s_t%d' % (stem, k) in RENAME.values():
        k += 1
    RENAME[b.name] = '%s_t%d' % (stem, k)

for old, new in RENAME.items():
    if old in arm.data.bones:
        arm.data.bones[old].name = new
        if old in body.vertex_groups:
            body.vertex_groups[old].name = new
for o in bpy.data.objects:
    if o.parent_type == 'BONE' and o.parent_bone in RENAME:
        o.parent_bone = RENAME[o.parent_bone]
log('tail is %d bones; limbs %s' % (len(TAIL), {k: len(chain(v)) for k, v in []}))
log('renamed %d bones' % len(RENAME))

FL = ['legFL_%d' % i for i in range(1, 4)]
FR = ['legFR_%d' % i for i in range(1, 4)]
BL = ['legBL_%d' % i for i in range(1, 5)]
BR = ['legBR_%d' % i for i in range(1, 5)]
PL = ['palpL_%d' % i for i in range(1, 4)]
PR = ['palpR_%d' % i for i in range(1, 4)]
TL = ['tail%02d' % i for i in range(1, len(TAIL) + 1)]

# ---------------------------------------------------------------- the texture
os.makedirs(STAGE, exist_ok=True)
img = None
for im in bpy.data.images:
    if 'alien' in im.name.lower():
        img = im
if img is not None:
    # the graded map from stage 1 — Blender has numpy but no PIL, and the
    # grade wants to happen in sRGB bytes where the numbers mean something
    img.filepath = TEXOUT
    img.source = 'FILE'
    img.reload()
    img.file_format = 'JPEG'
    img.alpha_mode = 'NONE'
    img.pack()
    log('texture %dpx  %d KB' % (TEX, os.path.getsize(TEXOUT) // 1024))
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    for p in o.data.polygons:
        p.use_smooth = True

# ---------------------------------------------------------------- pose helpers
AX, AY, AZ = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
pbs = arm.pose.bones
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


def addrot(name, *pairs):
    pb = pbs[name]
    m = basis(pb)
    q = pb.rotation_quaternion.copy()
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
    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = act
    try:
        arm.animation_data.action_slot = (act.slots[0] if act.slots
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


def finish(act):
    fcs = all_fcurves(act)
    for fc in fcs:
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'
    log('  action %-8s frames %s  curves %d' %
        (act.name, tuple(int(v) for v in act.frame_range), len(fcs)))


def ease(t):
    return t * t * (3 - 2 * t)


def lerp(a, b, k):
    return a + (b - a) * k


def blend(P0, P1, P2, t, cock, hit, snap=None):
    """Three keyposes and three lerps, the shovel swing's own shape.

    A SWING'S CONTACT IS NOT THE END OF ITS WIND-UP. The first build put `hit`
    where the cock finished, so the game's startup ended with the limb drawn
    all the way BACK and the damage landed on the frame the creature was least
    extended — the measured contact came out seven frames later than the
    authored one on all three attacks, which is what gave it away. `hit` is
    now the fraction at which the striking pose P2 is reached, so the tell is
    [0, hit] and everything after it is follow-through.
    """
    if t <= cock:
        k, A, B = ease(t / cock), P0, P1
    elif t <= hit:
        u = (t - cock) / (hit - cock)
        k, A, B = (snap(u) if snap else ease(u)), P1, P2
    else:
        # A BLOW DOES NOT STOP WHERE IT LANDS. Easing straight from the contact
        # pose back to rest is a limb being retracted, which is most of what
        # "stiff" was: the strike carries PAST P2 and settles back through it,
        # one damped bounce, so the weight of the thing is in the recovery
        # rather than only in the swing.
        u = (t - hit) / (1.0 - hit)
        over = math.exp(-u * 3.4) * math.sin(u * 7.6) * 0.30
        k, A, B = ease(u) - over, P2, P0
    return {n: lerp(A.get(n, 0.0), B.get(n, 0.0), k) for n in set(A) | set(B)}


def apply(p):
    """One pose dict -> the whole skeleton."""
    torso(pitch=p.get('pitch', 0), roll=p.get('roll', 0), yaw=p.get('yaw', 0),
          lift=p.get('lift', 0), surge=p.get('surge', 0))
    spine(pitch=p.get('spitch', 0), yaw=p.get('syaw', 0))
    head_pose(pitch=p.get('hpitch', 0), yaw=p.get('hyaw', 0),
              roll=p.get('hroll', 0), gape=p.get('gape', 0))
    stance(crouch=p.get('crouch', 0), spread=p.get('spread', 0),
           toe=p.get('toe', 0.30), t=p.get('phase', 0))
    if 'fl_swing' in p:
        leg(FL, swing=p['fl_swing'], knee=p.get('fl_knee', 0.3),
            ankle=p.get('fl_ankle', 0.1), out=p.get('fl_out', 0),
            toe=p.get('fl_toe', 0.30), splay=p.get('fl_splay', 0.10))
    tail(curl=p.get('curl', 0), yaw=p.get('tyaw', 0), tip=p.get('tip', 0),
         swing=p.get('swing', 0),
         wave=p.get('wave', 0.04), phase=p.get('phase', 0))


# --- body -----------------------------------------------------------------
# A limb hangs DOWN, and +angle about the armature X axis swings its tip toward
# +Y — which on this creature is BACKWARD, because it faces -Y. So a forward
# reach is negative.
def torso(pitch=0.0, roll=0.0, yaw=0.0, lift=0.0, surge=0.0):
    # + surge is FORWARD, which is -Y: the creature faces -Y. Written the
    # other way round the bite drew its head back on the strike and lunged on
    # the wind-up, and the contact check caught it as "furthest forward at
    # frame 1" — the head never got past where it started.
    setrot('root', (AX, pitch), (AY, roll), (AZ, yaw))
    setloc('root', (0, -surge, lift))


def spine(pitch=0.0, yaw=0.0):
    setrot('thorax', (AX, pitch * 0.5), (AZ, yaw * 0.5))
    setrot('neck', (AX, pitch), (AZ, yaw))


def head_pose(pitch=0.0, yaw=0.0, roll=0.0, gape=0.0):
    setrot('head_base', (AX, pitch * 0.4), (AZ, yaw * 0.4))
    setrot('head', (AX, pitch * 0.6), (AZ, yaw * 0.6), (AY, roll))
    setrot('jaw', (AX, gape))


def digits(tag, last, curl=0.0, splay=0.0):
    """THE TOES, which nothing touched for three builds. Thirty-two of the
    seventy-six bones are digits, and a foot whose toes never move is the
    single clearest tell that what you are looking at is a puppet: the leg
    swings, the ground arrives, and the foot meets it as one rigid paddle.
    They grip on the plant and open through the swing, and each of the three
    is offset a little from its neighbour so the foot is never symmetric."""
    for i in (1, 2, 3):
        b = '%s_%d_t%d' % (tag, last, i)
        if b not in pbs:
            continue
        k = curl * (1.0 + (i - 2) * 0.16)
        setrot(b, (AX, k), (AZ, (i - 2) * splay))
        t = b + '_t1'
        if t in pbs:
            setrot(t, (AX, k * 1.45))


def leg(names, swing=0.0, knee=0.0, ankle=0.0, out=0.0, toe=0.0, splay=0.0, roll=0.0):
    """swing: + is backward. knee folds the second segment back.

    `roll` is the ankle rolling over the foot as the weight passes across it —
    a plant that is only a stop reads as a stamp, and this is most of what the
    difference costs."""
    setrot(names[0], (AX, swing), (AY, out))
    setrot(names[1], (AX, -knee))
    setrot(names[2], (AX, ankle), (AY, roll))
    if len(names) > 3:
        setrot(names[3], (AX, ankle * 0.4), (AY, roll * 0.5))
    tag = names[0].rsplit('_', 1)[0]
    digits(tag, len(names), curl=toe, splay=splay)


_N = len(TL)
_WB = [max(0.0, 1.0 - (i / (_N - 1.0)) * 2.6) for i in range(_N)]   # base-heavy
_WT = [(i / (_N - 1.0)) ** 2 for i in range(_N)]                    # tip-heavy
_SB, _ST = sum(_WB) or 1.0, sum(_WT) or 1.0


def tail(curl=0.0, yaw=0.0, tip=0.0, swing=0.0, wave=0.0, phase=0.0):
    """All four are TOTAL radians over the WHOLE tail, and WHERE the rotation
    sits along the chain is the whole difference between two motions:

      swing — concentrated at the BASE, so the tail sweeps as one piece and
              the TIP TRAVELS. This is what a slam is.
      curl  — spread evenly, which bends the tail into an arc.
      tip   — weighted to the far end, which coils the last third.

    Getting this wrong cost the signature attack twice. Per-segment values
    made 22 bones x 0.6 rad into nearly two full turns and wound the tail into
    a spiral; normalising fixed the spiral but kept the rotation spread along
    the chain, and a distributed rotation CURLS a tail without moving its tip —
    measured, the slam's tip fell one metre and never came near the front. The
    strike is base-driven now and the tip travels seven.
    """
    for i, b in enumerate(TL):
        t = i / (_N - 1.0)
        w = math.sin(phase + t * 3.4) * wave * 6.0 / _N
        seg = curl / _N + tip * _WT[i] / _ST + swing * _WB[i] / _SB
        setrot(b, (AX, seg), (AZ, yaw * (0.4 + t) / (_N * 0.9) + w))


"""NOTHING ALIVE IS SYMMETRIC. The first stance gave the left and right of
each pair identical numbers, and a four-legged thing standing with its legs in
perfect mirror is a model on a turntable — it is the same fault as a walk with
no drag in it, read across the body instead of along a limb. Every pair here
carries a small fixed bias, and it is deliberately not a round number."""
ASYM = {'FL': 1.00, 'FR': 0.93, 'BL': 0.96, 'BR': 1.05}


def stance(crouch=0.0, spread=0.0, toe=0.30, t=0.0):
    """The four legs planted, which every clip starts from."""
    b = 1.0 + 0.035 * math.sin(t * 1.7)          # it never quite holds still
    leg(FL, swing=(-0.18 + crouch * 0.10) * ASYM['FL'], knee=(0.30 + crouch * 0.55) * b,
        ankle=0.16, out=spread, toe=toe, splay=0.07)
    leg(FR, swing=(-0.18 + crouch * 0.10) * ASYM['FR'], knee=(0.30 + crouch * 0.55) / b,
        ankle=0.16, out=-spread, toe=toe * 0.92, splay=-0.07)
    leg(BL, swing=(0.20 - crouch * 0.06) * ASYM['BL'], knee=(0.42 + crouch * 0.50) / b,
        ankle=0.20, out=spread * 0.7, toe=toe * 0.85, splay=0.05)
    leg(BR, swing=(0.20 - crouch * 0.06) * ASYM['BR'], knee=(0.42 + crouch * 0.50) * b,
        ankle=0.20, out=-spread * 0.7, toe=toe * 0.96, splay=-0.05)
    # the palps: small, fast and always going, which is what says the thing is
    # awake even when the rest of it is holding a pose
    for i, bn in enumerate(PL):
        setrot(bn, (AX, -0.25 - 0.2 * i + 0.10 * math.sin(t * 2.9 + i * 0.7)),
               (AZ, 0.06 * math.sin(t * 2.1 + i)))
    for i, bn in enumerate(PR):
        setrot(bn, (AX, -0.25 - 0.2 * i + 0.10 * math.sin(t * 3.3 + i * 0.7 + 1.9)),
               (AZ, -0.06 * math.sin(t * 2.4 + i)))
    # and the fangs round the mouth work a little on their own
    for i in (1, 2, 3, 4):
        bn = 'head_t%d' % i
        if bn in pbs:
            setrot(bn, (AX, 0.10 * math.sin(t * 3.1 + i * 1.3)),
                   (AZ, 0.08 * math.sin(t * 2.3 + i)))


# ---------------------------------------------------------------- the clips
CLIPS = {}


def clipmeta(name, n, hit=None):
    CLIPS[name] = {'frames': n, 'hit': (hit / float(n)) if hit is not None else None}


# ------------------------------------------------------------------- IDLE
# It stands and breathes. The tail is the only thing with any travel in it:
# a slow sway over four seconds, which is what makes a still creature read as
# alive rather than as a statue somebody placed.
# IDLE, AND EVERYTHING ABOVE IS FOR THIS ONE. A creature that stands still is
# the pose the player looks at longest, so it carries the most: a breath on one
# count, a weight shift on a much slower one, the head scanning on a third that
# is not a multiple of either, and the tail arriving LATE to all of it. Three
# periods that never line up is what stops a loop reading as a loop.
act = new_action('idle')
N = 180
for f in range(N + 1):
    rest()
    t = f / N
    a = t * math.pi * 2
    br = math.sin(a * 2) * 0.5 + 0.5                     # breathing, twice a loop
    sway = math.sin(a)                                   # weight, once
    scan = math.sin(a * 3 + 0.7) * math.sin(a + 1.9)     # the head, on its own count
    # THE TAIL LAGS THE BODY. Reading the same phase into every joint is what
    # made it look driven by one dial; a quarter turn of lag and the tail is
    # answering the body instead of moving with it.
    lag = a - 0.9
    torso(pitch=0.02 * br, roll=0.035 * sway, yaw=0.03 * sway, lift=0.05 * br)
    spine(pitch=-0.05 + 0.04 * br, yaw=0.09 * math.sin(a + 0.5))
    head_pose(pitch=0.11 - 0.07 * br + 0.05 * scan, yaw=0.26 * scan,
              roll=0.09 * scan, gape=0.03 + 0.035 * br)
    stance(crouch=0.10 + 0.03 * br, toe=0.28 + 0.10 * br, t=t * 6.0)
    tail(curl=0.28 + 0.10 * math.sin(lag), yaw=0.62 * math.sin(lag + 0.6),
         tip=0.18 * math.sin(lag * 0.5), wave=0.07, phase=lag)
    key(f)
finish(act)
clipmeta('idle', N)

# ------------------------------------------------------------------- WALK
# A quadruped walks on DIAGONAL pairs, and getting that wrong is the one thing
# everybody notices: front-left with back-right, half a cycle apart.
# A quadruped walks on DIAGONAL pairs — front-left with back-right, half a
# cycle apart — and getting that wrong is the one thing everybody notices.
# What makes it read as WEIGHT rather than as four legs cycling: the foot
# ROLLS over the plant instead of arriving flat, the toes grip as it takes
# the load and open through the swing, the body drops onto each footfall
# (twice a cycle, so `abs`), and the head and tail both arrive late.
def gait(a, names, ph, base, kn, amp, kamp, asym):
    s = math.sin(a + ph)
    lift = max(0.0, math.sin(a + ph))          # only the swing half leaves the floor
    plant = max(0.0, -math.sin(a + ph))        # and only the stance half carries
    leg(names, swing=(base + s * amp) * asym, knee=kn + lift * kamp,
        ankle=0.16 + lift * 0.20 - plant * 0.10,
        toe=0.22 + plant * 0.42 - lift * 0.16,           # grip on the plant
        splay=0.06 + lift * 0.10,
        roll=math.cos(a + ph) * 0.16)                    # over the foot, not onto it


act = new_action('walk')
N = 40
for f in range(N + 1):
    rest()
    t = f / N
    a = t * math.pi * 2
    torso(pitch=0.03 * math.sin(a * 2 + 0.4), roll=0.06 * math.sin(a),
          yaw=0.06 * math.sin(a), lift=0.05 * abs(math.sin(a * 2)))
    spine(pitch=-0.05 + 0.03 * math.sin(a * 2), yaw=0.10 * math.sin(a + 0.4))
    head_pose(pitch=0.12 + 0.05 * math.sin(a * 2 - 0.6), yaw=0.12 * math.sin(a + 0.9),
              roll=0.07 * math.sin(a + 0.3), gape=0.03)
    gait(a, FL, 0.0, -0.18, 0.30, 0.42, 0.55, ASYM['FL'])
    gait(a, BR, 0.0, 0.20, 0.42, 0.40, 0.52, ASYM['BR'])
    gait(a, FR, math.pi, -0.18, 0.30, 0.42, 0.55, ASYM['FR'])
    gait(a, BL, math.pi, 0.20, 0.42, 0.40, 0.52, ASYM['BL'])
    for i, b in enumerate(PL):
        setrot(b, (AX, -0.25 - 0.2 * i + 0.12 * math.sin(a - i * 0.5)))
    for i, b in enumerate(PR):
        setrot(b, (AX, -0.25 - 0.2 * i + 0.12 * math.sin(a + math.pi - i * 0.5)))
    tail(curl=0.25, yaw=0.90 * math.sin(a - 0.8), tip=0.15 * math.sin(a * 2 - 1.1),
         wave=0.075, phase=a - 0.8)
    key(f)
finish(act)
clipmeta('walk', N)

# -------------------------------------------------------------------- RUN
# Lower, longer, and the body drives: the spine pitches down and the whole
# thing surges on every stride instead of the legs moving under a still box.
# Lower, longer, and the BODY drives it: the spine flexes and extends on the
# gallop's own count so the thing is throwing itself forward rather than
# cycling four legs under a rigid box. The tail streams out behind and lags
# further at speed, which is what it is for.
act = new_action('run')
N = 24
for f in range(N + 1):
    rest()
    t = f / N
    a = t * math.pi * 2
    flex = math.sin(a * 2 - 0.5)                  # the spine gathers and extends
    torso(pitch=-0.10 + 0.09 * flex, roll=0.10 * math.sin(a),
          lift=0.14 * abs(math.sin(a * 2)), surge=0.12 * math.sin(a * 2))
    spine(pitch=-0.16 + 0.11 * flex, yaw=0.13 * math.sin(a + 0.4))
    head_pose(pitch=0.20 - 0.08 * flex, yaw=0.09 * math.sin(a + 0.9),
              roll=0.10 * math.sin(a + 0.2), gape=0.16 + 0.10 * max(0.0, flex))
    gait(a, FL, 0.0, -0.26, 0.34, 0.72, 0.95, ASYM['FL'])
    gait(a, BR, 0.0, 0.26, 0.46, 0.70, 0.92, ASYM['BR'])
    gait(a, FR, math.pi, -0.26, 0.34, 0.72, 0.95, ASYM['FR'])
    gait(a, BL, math.pi, 0.26, 0.46, 0.70, 0.92, ASYM['BL'])
    for i, b in enumerate(PL):
        setrot(b, (AX, -0.34 - 0.15 * i + 0.09 * math.sin(a * 2 - i * 0.6)))
    for i, b in enumerate(PR):
        setrot(b, (AX, -0.34 - 0.15 * i + 0.09 * math.sin(a * 2 + 1.4 - i * 0.6)))
    tail(curl=0.55, yaw=0.62 * math.sin(a - 1.1), tip=-0.45 + 0.18 * math.sin(a * 2 - 1.4),
         wave=0.10, phase=a - 1.1)
    key(f)
finish(act)
clipmeta('run', N)

# ------------------------------------------------------------------- ROAR
# The wake. It rears, the jaw opens wide, the tail flares up behind — one
# shape, held, so you know what the rest of this is going to be. It does not
# travel: the crab's lesson, that the beat before a fight is a beat.
act = new_action('roar')
N = 60
for f in range(N + 1):
    rest()
    t = f / N
    k = ease(min(1.0, t / 0.30)) if t < 0.55 else 1.0 - ease(min(1.0, (t - 0.55) / 0.45))
    # the shudder RUNS the body: the head first, the ribs a beat behind and the
    # tail last, all off the same tremor. One number on every joint at once is
    # a vibrating statue, which is what the first one was.
    tr = math.sin(t * math.pi * 22)
    shake = tr * 0.035 * k
    torso(pitch=-0.34 * k, lift=0.30 * k, roll=0.05 * k * math.sin(t * math.pi * 9))
    spine(pitch=-0.42 * k + 0.03 * k * math.sin(t * math.pi * 22 - 0.8))
    head_pose(pitch=-0.50 * k + shake, gape=(0.86 + 0.10 * tr) * k,
              roll=shake, yaw=0.06 * k * math.sin(t * math.pi * 7))
    stance(crouch=0.55 * k, spread=0.10 * k, toe=0.30 + 0.45 * k, t=t * 14)
    tail(curl=0.45 * k, tip=0.95 * k, yaw=0.30 * k * math.sin(t * math.pi * 6 - 1.4),
         wave=0.05 + 0.09 * k, phase=t * math.pi * 4 - 1.2)
    key(f)
finish(act)
clipmeta('roar', N)

# ------------------------------------------------------------------ SWIPE
# The quick one: the front-left leg comes off the floor, cocks back across the
# body and sweeps out through the front. Three poses — planted, cocked,
# swept — with contact where the limb is actually out in front of it.
act = new_action('swipe')
N, COCK, HITF = 34, 0.44, 0.66
P0 = dict(crouch=0.10, fl_swing=-0.18, fl_knee=0.30, fl_ankle=0.16, curl=0.25, wave=0.05)
# cocked: the limb is drawn BACK and folded up, out to the side of the body
P1 = dict(pitch=-0.06, yaw=0.18, roll=-0.11, syaw=0.22, spitch=-0.10,
          hyaw=0.26, hpitch=0.08, gape=0.34, crouch=0.34,
          fl_swing=0.55, fl_knee=1.15, fl_ankle=0.06, fl_out=0.65,
          curl=0.35, tyaw=-0.70, wave=0.05)
# struck: thrown forward and swept across the front
P2 = dict(pitch=0.05, yaw=-0.30, roll=0.14, syaw=-0.34, spitch=0.05,
          hyaw=-0.24, hpitch=0.12, gape=0.85, crouch=0.16,
          fl_swing=-0.85, fl_knee=0.14, fl_ankle=0.22, fl_out=-0.55,
          curl=0.20, tyaw=0.95, wave=0.06)
for f in range(N + 1):
    rest()
    t = f / N
    p = blend(P0, P1, P2, t, COCK, HITF, snap=lambda u: u * u * (3 - 2 * u) ** 1.0)
    p['phase'] = t * 6
    apply(p)
    key(f)
finish(act)
clipmeta('swipe', N, int(round(HITF * N)))

# ------------------------------------------------------------------- BITE
# Head and neck draw back off the shoulders, then drive forward and down; the
# jaw is wide at the cock and shut on the frame the blow lands.
act = new_action('bite')
N, COCK, HITF = 30, 0.46, 0.68
P0 = dict(crouch=0.10, spitch=-0.04, hpitch=0.10, gape=0.05, curl=0.25, wave=0.05)
# + pitch on the neck puts the head DOWN, so the draw is negative and the
# strike positive: it rears back, then drives forward and down onto you
P1 = dict(pitch=0.12, surge=-0.30, spitch=-0.40, hpitch=-0.34, gape=0.95,
          crouch=0.50, curl=0.40, tip=0.35, wave=0.05)
P2 = dict(pitch=-0.10, surge=0.62, spitch=0.16, hpitch=0.20, gape=0.04,
          crouch=0.22, curl=0.15, tip=-0.30, wave=0.06)
for f in range(N + 1):
    rest()
    t = f / N
    p = blend(P0, P1, P2, t, COCK, HITF)
    p['phase'] = t * 5
    apply(p)
    key(f)
finish(act)
clipmeta('bite', N, int(round(HITF * N)))

# ------------------------------------------------------------------- TAIL
# THE SIGNATURE. The tail is the only thing this creature has that nothing else
# in the game has, so it gets the longest tell in the fight: it rears back and
# hangs, then comes over the head and slams the floor in front of it. QUARTIC
# on the way down — the overhead's own trick, so it covers the last half of the
# fall in a fifth of the time and reads as a slam rather than a sweep.
act = new_action('tailslam')
N, COCK, HITF = 48, 0.50, 0.72
P0 = dict(crouch=0.10, curl=0.25, wave=0.05)
# THE TAIL MUST COME OVER, NOT UNWIND. Cocked is the tail hauled BACK off its
# resting arc (negative), struck is 2.4 radians of it swung forward over the
# spine and down in front of the head — where the player is.
P1 = dict(pitch=-0.26, lift=0.20, spitch=-0.28, hpitch=-0.32, gape=0.55,
          crouch=0.34, swing=-0.55, curl=0.15, tip=-0.35, wave=0.05)
P2 = dict(pitch=0.26, lift=-0.14, spitch=0.34, hpitch=0.46, gape=0.30,
          crouch=0.52, swing=3.35, curl=0.45, tip=0.45, wave=0.03)
for f in range(N + 1):
    rest()
    t = f / N
    p = blend(P0, P1, P2, t, COCK, HITF, snap=lambda u: u ** 4)
    p['phase'] = t * 4
    apply(p)
    key(f)
finish(act)
clipmeta('tailslam', N, int(round(HITF * N)))

# ------------------------------------------------------------------- HURT
act = new_action('hurt')
N = 16
for f in range(N + 1):
    rest()
    t = f / N
    # a hit lands in ONE frame and is paid off over the rest: a hard spike and
    # then one damped bounce back through centre. The old shape was a bump.
    k = math.sin(min(1.0, t * 1.7) * math.pi) ** 0.55
    ring = math.exp(-t * 4.0) * math.sin(t * 26)
    torso(pitch=0.16 * k + 0.05 * ring, roll=0.16 * k + 0.06 * ring, lift=-0.13 * k)
    spine(pitch=0.24 * k + 0.05 * ring, yaw=0.18 * k)
    head_pose(pitch=0.26 * k, yaw=0.22 * k, roll=0.14 * k + 0.08 * ring, gape=0.60 * k)
    stance(crouch=0.45 * k, spread=0.08 * k, toe=0.30 + 0.50 * k, t=t * 16)
    tail(curl=-0.35 * k, tip=0.60 * k, yaw=0.45 * ring, wave=0.14, phase=t * 12)
    key(f)
finish(act)
clipmeta('hurt', N)

# -------------------------------------------------------------------- DIE
# It goes down on its legs rather than falling over: they splay, the body
# drops, the head goes last and the tail comes down after everything else,
# which is the only part of it the player is still watching by then.
#
# AND THE TAIL FALLS BY BEING SWUNG, NOT BY BEING UNWOUND. The first version
# took the resting arc out with a NEGATIVE curl and tip, and measured in the
# game the tip finished a metre HIGHER than it stands in the idle (604.7 alive,
# 605.8 dead) — so the corpse held the creature's whole signature silhouette up
# in the air for the rest of the game. It is the slam's own lesson one more
# time: a distributed rotation CURLS a tail in place and only a base-driven
# swing MOVES its tip. A positive swing takes the whole thing over, a yaw
# throws it off the spine so it does not come to rest lying along the body,
# and the twitch runs out through it after everything else has stopped.
act = new_action('die')
N = 56
for f in range(N + 1):
    rest()
    t = f / N
    a = ease(min(1.0, t / 0.35))              # the buckle
    b = ease(max(0.0, min(1.0, (t - 0.22) / 0.55)))  # the settle
    c = ease(max(0.0, min(1.0, (t - 0.45) / 0.55)))  # the tail, last
    # it dies in beats: the legs go, the body drops, and then it is STILL —
    # with a last twitch running out through the toes and the jaw, which is
    # the part that says it was alive rather than switched off.
    tw = math.exp(-max(0.0, t - 0.30) * 5.0) * math.sin(t * 30) * (1 - c)
    # AND THE COLLAPSE IS ALREADY AS DEEP AS THE FLOOR ALLOWS. A pass that
    # slumped it further (lift -1.16, head 1.02) put the head half a metre
    # THROUGH the stone — measured in the game, 599.53 on a floor at 600 —
    # because at these numbers the skull is already resting on it (600.08).
    torso(pitch=-0.20 * a + 0.30 * b, roll=0.34 * b + 0.03 * tw, lift=-0.95 * b, yaw=0.20 * b)
    spine(pitch=-0.30 * a + 0.55 * b, yaw=0.26 * b + 0.04 * tw)
    head_pose(pitch=-0.40 * a + 0.85 * b, yaw=0.30 * b, roll=0.18 * b + 0.06 * tw,
              gape=max(0.0, 0.85 * a - 0.55 * b) + 0.10 * abs(tw))
    leg(FL, swing=-0.55 * a + 0.30 * b, knee=1.30 * b, ankle=0.20, out=0.85 * b,
        toe=0.70 * a + 0.30 * abs(tw), splay=0.22 * b)
    leg(FR, swing=-0.35 * a + 0.20 * b, knee=1.15 * b, ankle=0.20, out=-0.70 * b,
        toe=0.62 * a + 0.30 * abs(tw), splay=-0.20 * b)
    leg(BL, swing=0.30 * a - 0.20 * b, knee=1.35 * b, ankle=0.20, out=0.75 * b,
        toe=0.55 * a + 0.25 * abs(tw), splay=0.18 * b)
    leg(BR, swing=0.40 * a - 0.25 * b, knee=1.20 * b, ankle=0.20, out=-0.60 * b,
        toe=0.60 * a + 0.25 * abs(tw), splay=-0.16 * b)
    for i, bn in enumerate(PL + PR):
        setrot(bn, (AX, -0.25 - 0.2 * (i % 3) + 0.55 * b + 0.10 * tw))
    tail(swing=1.60 * c, curl=0.55 * a - 0.12 * c, tip=0.30 * a - 0.70 * c,
         yaw=-1.30 * c + 0.22 * tw, wave=0.05 * (1 - c), phase=t * 5)
    key(f)
finish(act)
clipmeta('die', N)

# ------------------------------------------------- measure the contact frames
# The hit frame is where the striking part is furthest out and moving fastest,
# and it is MEASURED off the rig the way the mutant's is, because the game maps
# the clip's [0, hit] onto its own startup and a hand-guessed number puts the
# picture and the blow a tenth of a second apart.
dg = bpy.context.evaluated_depsgraph_get()
sc = bpy.context.scene


def track(action, bone, n):
    arm.animation_data.action = action
    try:
        arm.animation_data.action_slot = action.slots[0]
    except Exception:
        pass
    pts = []
    for f in range(n + 1):
        sc.frame_set(f)
        dg.update()
        pts.append((arm.matrix_world @ arm.pose.bones[bone].tail).copy())
    return pts


# A BLOW IS SPEED IN THE DIRECTION IT IS THROWN, not speed. Scoring plain
# velocity names the RECOVERY, because a limb comes back off a swing faster
# than it goes out — the dealer's "a rising hand is not a hit" — so each
# attack is scored only on the component that is actually the strike: forward
# (the creature faces -Y) for the swipe and the bite, downward for the slam.
MEASURE = {'swipe': ('legFL_3', Vector((0, -1, 0))),
           'bite': ('head', Vector((0, -1, 0))),
           'tailslam': (TL[-1], Vector((0, 0, -1)))}
# and the AUTHORED frame is the one that ships. These clips are not Mixamo's —
# the contact pose P2 is placed here, so where the blow lands is a decision,
# not a discovery, and the measurement's job is to CHECK it: the striking part
# should be near its own extreme within a couple of frames of `hit`. A warning
# here means a pose was edited and the declared contact no longer matches it.
for name, (bone, want) in MEASURE.items():
    act = bpy.data.actions[name]
    n = CLIPS[name]['frames']
    pts = track(act, bone, n)
    vbest, vf = -1e9, 0
    xbest, xf = -1e9, 0
    for f in range(1, n):
        s = ((pts[f + 1] - pts[f - 1]) * 0.5).dot(want)
        if s > vbest:
            vbest, vf = s, f
        e = pts[f].dot(want)
        if e > xbest:
            xbest, xf = e, f
    auth = CLIPS[name]['hit']
    af = int(round(auth * n))
    flag = '' if abs(xf - af) <= max(2, n * 0.10) else '   <-- CHECK'
    log('  %-9s hit f%d (%.3f)  peak speed f%d  furthest out f%d%s'
        % (name, af, auth, vf, xf, flag))
    CLIPS[name]['hit_frame'] = af

sc.frame_set(0)
bpy.context.scene['bw_monster'] = {
    'fps': FPS,
    'clips': {k: {'frames': v['frames'], 'hit': v['hit']} for k, v in CLIPS.items()},
}

# ------------------------------------------------------------------- export
mn, mx = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for v in body.data.vertices:
    w = body.matrix_world @ v.co
    for i in range(3):
        mn[i] = min(mn[i], w[i])
        mx[i] = max(mx[i], w[i])
log('bounds min %s max %s' % (tuple(round(v, 2) for v in mn), tuple(round(v, 2) for v in mx)))
tris = 0
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
log('tris', tris)

if STRIPS:
    import subprocess
    log('strips requested — see tools/monster_strip.py')

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=False,
                          export_yup=True, export_materials='EXPORT',
                          export_image_format='AUTO', export_animations=True,
                          export_animation_mode='ACTIONS', export_bake_animation=False,
                          export_extras=True)
log('DONE %s  %.2f MB' % (OUT, os.path.getsize(OUT) / 1e6))
