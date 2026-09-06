"""Build assets/dealer.glb — the Blue Blood Dealer — from Yury Misiyuk's
"Character with animation" (Sketchfab, CC-BY-4.0).

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/dealer_pack.py

What arrives: a 32k-triangle Mixamo-rigged man in a gas mask with a crowbar
as a separate mesh, 66 bones, and four clips — an idle, a run, and two melee
swings. What the fight needs is a creature with the mutant's whole grammar:
a walk, a taunt, swings from BOTH hands, a held one you can read, a lunge, a
recoil and a death. So:

  * the two swings are MIRRORED across the rig (the mutant's trick, headless:
    every bone's armature-space matrix reflected across x = 0 and handed to
    the opposite bone, parents first) — so a swing learned from the right
    comes from the left, and the crowbar changes hands with it;
  * seven more are AUTHORED on the rig — walk, calm (before he picks it up),
    ready, taunt, overhead-with-a-hang, lunge, hit, death;
  * the contact frame of every swing is MEASURED off the crowbar hand rather
    than guessed, and printed for `DEALER_ATTACKS` to name.

Three things about the source that have to be fixed here or the game gets
them wrong. The body material carries KHR_materials_transmission at 1.0 —
in three that is a sheet of glass where a man should be, and it forces a
whole extra render pass, so it is zeroed. The base colour is 2048 RGBA with
a real alpha (the mask and the lashes are cut out of it), so it stays PNG
where the others go to JPEG. And there is a Union Jack tattooed across his
stomach, which the owner asked to lose: the box is filled from its own
border and given back the grain of the skin beside it.
"""
import os, sys, math, json, subprocess

SRC = '/Users/ethanreedy/Downloads/character_with_animation/scene.gltf'
OUT = '/Users/ethanreedy/Dev/beachwalk/assets/dealer.glb'
SP = '/private/tmp/claude-501/-Users-ethanreedy-Dev-beachwalk/86ac18b9-ad0c-4a6c-974a-c4c4d6a8f782/scratchpad/dealer'
FLAG = (203, 1118, 500, 1332)          # the Union Jack, in the 2048 atlas
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'

def log(*a): print('[dealer]', *a); sys.stdout.flush()

# ----------------------------------------------------------------------
# Stage 1, under the system python: the pixels. Blender ships numpy but not
# PIL, and the flag wants a real image library — so the maps are prepared
# here, written to the scratchpad, and Blender is only ever pointed at them.
# ----------------------------------------------------------------------
try:
    import bpy
except ImportError:
    bpy = None
if bpy is None:
    from PIL import Image, ImageFilter
    import numpy as np
    os.makedirs(SP, exist_ok=True)
    SRCDIR = os.path.join(os.path.dirname(SRC), 'textures')

    def unflag(path, out):
        """The Union Jack, filled from the colour of its own border and given
        back the skin grain from a clean patch beside it. A body texture read
        at two metres in a dark room does not need a real inpaint; it needs no
        rectangle and no flag."""
        im = Image.open(path)
        a = np.asarray(im.convert('RGB')).astype(np.float32)
        X0, Y0, X1, Y1 = FLAG
        W, H, M = X1 - X0, Y1 - Y0, 6
        left = a[Y0:Y1, X0-M:X0].mean(1)[:, None, :]; right = a[Y0:Y1, X1:X1+M].mean(1)[:, None, :]
        top = a[Y0-M:Y0, X0:X1].mean(0)[None, :, :];  bot = a[Y1:Y1+M, X0:X1].mean(0)[None, :, :]
        u = np.linspace(0, 1, W)[None, :, None]; v = np.linspace(0, 1, H)[:, None, None]
        fill = (left*(1-u) + right*u)*0.5 + (top*(1-v) + bot*v)*0.5
        tile = a[1150:1300, 70:200]
        big = np.concatenate([tile, tile[:, ::-1]], 1); big = np.concatenate([big, big[::-1]], 0)
        tiled = np.tile(big, (int(np.ceil(H/big.shape[0]))+1, int(np.ceil(W/big.shape[1]))+1, 1))[:H, :W]
        tb = np.asarray(Image.fromarray(tiled.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
        m8 = np.zeros(a.shape[:2], np.uint8); m8[Y0:Y1, X0:X1] = 255
        mask = np.asarray(Image.fromarray(m8).filter(ImageFilter.GaussianBlur(9))).astype(np.float32)/255.
        full = a.copy(); full[Y0:Y1, X0:X1] = fill + (tiled - tb)*0.95
        res = np.clip(a*(1-mask[..., None]) + full*mask[..., None], 0, 255).astype(np.uint8)
        o = Image.fromarray(res)
        if im.mode == 'RGBA': o = Image.merge('RGBA', (*o.split(), im.split()[3]))
        o.save(out)
        return out

    def grime(im):
        """He has been down there a long time. The scan ships him clean and
        pink, which under the bunker's lamps read as somebody's holiday
        photograph — so: the whole map comes down and loses some of its
        blood, and then soot goes on in two grains, a broad blotchy one that
        pools where dirt pools and a fine one over everything. Multiplied,
        never painted over, so the tattoos and the folds still carry."""
        rgb = np.asarray(im.convert('RGB')).astype(np.float32)
        H, W, _ = rgb.shape
        rng = np.random.default_rng(7)
        def blob(cells, blur):
            n = rng.random((cells, cells)).astype(np.float32)
            up = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
                            .filter(ImageFilter.GaussianBlur(blur))).astype(np.float32) / 255.
            return (up - up.min()) / max(1e-3, up.max() - up.min())
        broad = blob(14, 12)          # where the dirt collects
        fine = blob(120, 2)           # and the grain over all of it
        # 1.0 clean .. 0.55 filthy, weighted to the broad pattern
        dirt = 1.0 - (0.44 * (broad ** 1.3) + 0.18 * fine)
        out = rgb * dirt[..., None]
        # soot is cold and takes the blood out of skin
        grey = out.mean(2, keepdims=True)
        out = out * 0.80 + grey * 0.20
        out[..., 2] *= 1.03           # ...and leaves it faintly blue-grey
        out = np.clip(out * 0.80, 0, 255).astype(np.uint8)
        o = Image.fromarray(out)
        if im.mode == 'RGBA': o = Image.merge('RGBA', (*o.split(), im.split()[3]))
        return o

    for name in sorted(os.listdir(SRCDIR)):
        base, ext = os.path.splitext(name)
        if 'transmission' in base: continue            # zeroed in the material; the map is dead weight
        src = os.path.join(SRCDIR, name)
        if base == 'PackedMaterial0_baseColor':
            src = unflag(src, os.path.join(SP, 'noflag.png'))
        pil = Image.open(src)
        if base == 'PackedMaterial0_baseColor':
            pil = grime(pil)
        # the body's albedo carries the mask and the lashes in its alpha, so it
        # stays PNG; everything else is opaque or data and goes to JPEG
        keep_alpha = pil.mode == 'RGBA' and 'baseColor' in base
        size = 1024 if 'baseColor' in base else 512
        if max(pil.size) > size: pil = pil.resize((size, size), Image.LANCZOS)
        if keep_alpha:
            outp = os.path.join(SP, base + '.png'); pil.save(outp, optimize=True)
        else:
            outp = os.path.join(SP, base + '.jpg'); pil.convert('RGB').save(outp, quality=88)
        log('map %-42s -> %4d px  %5d KB' % (name, size, os.path.getsize(outp)//1024))
    r = subprocess.run([BLENDER, '-b', '--python', os.path.abspath(__file__)])
    if r.returncode: sys.exit(r.returncode)

    # ---- stage 3: give the GLB back the maps we actually made.
    # Blender re-encodes every image on export with its own writer and no
    # quality knob worth the name — the 1.3 MB albedo came back out at
    # 4.5 MB and the crowbar's JPEGs at double. The bytes are simply put
    # back: every bufferView is copied in order into a fresh buffer, the
    # image ones swapped for the prepared files, and the offsets rewritten.
    import struct
    def rebuild(path):
        raw = open(path, 'rb').read()
        assert raw[:4] == b'glTF'
        off, chunks = 12, []
        while off < len(raw):
            ln, ty = struct.unpack_from('<II', raw, off)
            chunks.append((ty, raw[off+8:off+8+ln])); off += 8 + ln
        js = json.loads(chunks[0][1].decode('utf-8'))
        bin0 = chunks[1][1]
        want = {}
        for im in js.get('images', []):
            base = os.path.splitext(os.path.basename(im.get('name', '') or ''))[0]
            for ext, mime in (('.png', 'image/png'), ('.jpg', 'image/jpeg')):
                cand = os.path.join(SP, base + ext)
                if os.path.exists(cand): want[id(im)] = (cand, mime); break
        newbin = bytearray(); before = len(bin0)
        for i, bv in enumerate(js['bufferViews']):
            src = None
            for im in js.get('images', []):
                if im.get('bufferView') == i and id(im) in want: src = want[id(im)]
            if src:
                data = open(src[0], 'rb').read()
                for im in js['images']:
                    if im.get('bufferView') == i: im['mimeType'] = src[1]
            else:
                o = bv.get('byteOffset', 0); data = bin0[o:o + bv['byteLength']]
            while len(newbin) % 4: newbin.append(0)
            bv['byteOffset'] = len(newbin); bv['byteLength'] = len(data)
            newbin += data
        while len(newbin) % 4: newbin.append(0)
        js['buffers'] = [{'byteLength': len(newbin)}]
        jb = json.dumps(js, separators=(',', ':')).encode('utf-8')
        while len(jb) % 4: jb += b' '
        out = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(jb) + 8 + len(newbin))
        out += struct.pack('<I', len(jb)) + b'JSON' + jb
        out += struct.pack('<I', len(newbin)) + b'BIN\x00' + bytes(newbin)
        open(path, 'wb').write(out)
        log('repacked images  bin %d -> %d KB   file %d KB' % (before//1024, len(newbin)//1024, len(out)//1024))
    import json
    rebuild(OUT)
    sys.exit(0)

# ----------------------------------------------------------------------
# Stage 2, under Blender: the rig, the clips and the export
# ----------------------------------------------------------------------
from mathutils import Vector, Quaternion, Matrix
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent is arm]
for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.parent is not arm]:
    bpy.data.objects.remove(o, do_unlink=True)          # the exporter's stray icosphere
log('armature', arm.name, 'meshes', len(meshes), 'bones', len(arm.pose.bones))

# the crowbar is its own object so the game can hand it to him when the fight starts
crowbar = None
for m in meshes:
    mat = m.material_slots[0].material.name if m.material_slots and m.material_slots[0].material else ''
    if mat == 'Crowbar': crowbar = m; m.name = 'Crowbar'
    else: m.name = 'DealerBody' if len(m.data.vertices) > 4000 and m.name != 'Crowbar' else m.name
log('crowbar object', crowbar and crowbar.name, crowbar and len(crowbar.data.vertices))

# ------------------------------------------------------------- the material
# transmission 1.0 makes a man into a window, and costs a render pass besides
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            for slot in ('Transmission', 'Transmission Weight'):
                if slot in n.inputs:
                    for lk in list(n.inputs[slot].links): mat.node_tree.links.remove(lk)
                    n.inputs[slot].default_value = 0.0
                    log('transmission zeroed on', mat.name)
    mat.blend_method = 'CLIP' if hasattr(mat, 'blend_method') else mat.blend_method

# ------------------------------------------------------------- the textures
# stage 1 has already written them; point every image at what it made
for img in list(bpy.data.images):
    name = os.path.basename(img.filepath_from_user() or img.name)
    base = os.path.splitext(name)[0]
    if 'transmission' in base:
        bpy.data.images.remove(img); continue
    for ext in ('.png', '.jpg'):
        cand = os.path.join(SP, base + ext)
        if os.path.exists(cand):
            img.filepath = cand; img.source = 'FILE'; img.reload()
            log('  map %-42s <- %s %d KB' % (name, os.path.basename(cand), os.path.getsize(cand)//1024))
            break
    else:
        log('  map %-42s NOT PREPARED (shipping as-is)' % name)
for img in bpy.data.images:
    try: img.pack()
    except Exception: pass

# ------------------------------------------------------------ pose helpers
# HE FACES -Y. Not +Y, which is what the first pass assumed and what put his
# lean, his knees and both arms behind him. The rig itself says so: the foot
# bone runs from the ankle to the TOE and its tail is at y = -111, so the
# toes point -Y. armature space: +X is his LEFT, -Y is FORWARD, +Z is UP.
AX, AY, AZ = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
pbs = arm.pose.bones
for pb in pbs: pb.rotation_mode = 'QUATERNION'
B = {}
for pb in pbs:
    n = pb.name
    if n.startswith('mixamorig:'): B[n.split(':', 1)[1].rsplit('_', 1)[0]] = n
    else: B[n] = n
log('named bones', len(B))
ROOT = B.get('Hips')
FINGERS = [pb.name for pb in pbs if any(k in pb.name for k in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'))]
SKIP_KEY = set(FINGERS) | {pb.name for pb in pbs if '_End' in pb.name}
KEYED = [pb for pb in pbs if pb.name not in SKIP_KEY]
log('keyed bones', len(KEYED), 'of', len(pbs))

# ---- the source clips, renamed first so everything below can name them
RENAME = {'Standing Idle': 'idleSrc', 'Standing Run Forward': 'run',
          'Standing Melee Attack Downward': 'attackDown',
          'Standing Melee Attack Horizontal': 'attackSide'}
for old, new in RENAME.items():
    a = bpy.data.actions.get(old)
    if a: a.name = new; a.use_fake_user = True

def fcurves(act):
    if hasattr(act, 'fcurves'): return list(act.fcurves)
    out = []
    for lay in getattr(act, 'layers', []):
        for st in getattr(lay, 'strips', []):
            for cb in getattr(st, 'channelbags', []): out.extend(cb.fcurves)
    return out
def use_action(act):
    if not arm.animation_data: arm.animation_data_create()
    arm.animation_data.action = act
    try: arm.animation_data.action_slot = act.slots[0]
    except Exception: pass

# ---- NO ROOT MOTION. Mixamo's swings carry the hips a quarter of a metre
# across the floor and the run carries them forward; the game moves him
# itself, so the two fought and he slid and stuttered through every swing.
# The hips' sideways and forward curves are flattened to their first value
# (the bone's local Y is the rig's UP and is left alone: the bob stays).
for nm in ('idleSrc', 'run', 'attackDown', 'attackSide'):
    a = bpy.data.actions.get(nm)
    if not a: continue
    for fc in fcurves(a):
        if fc.data_path.endswith('.location') and ROOT in fc.data_path and fc.array_index in (0, 2):
            v0 = fc.keyframe_points[0].co[1] if len(fc.keyframe_points) else 0.0
            for kp in fc.keyframe_points: kp.co[1] = v0; kp.handle_left[1] = v0; kp.handle_right[1] = v0
    # and the fingers are keyed on every frame for joints that never read at this range
    n0 = len(fcurves(a))
    for fc in list(fcurves(a)):
        if any(k in fc.data_path for k in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')) or fc.data_path.endswith('scale'):
            try: fc.id_data.fcurves.remove(fc)
            except Exception:
                for lay in getattr(a, 'layers', []):
                    for st in getattr(lay, 'strips', []):
                        for cb in getattr(st, 'channelbags', []):
                            if fc in list(cb.fcurves): cb.fcurves.remove(fc)
    log('  source %-12s root motion flattened, %d -> %d curves' % (nm, n0, len(fcurves(a))))

# ---- THE BASE IS THE MIXAMO IDLE. Every authored clip used to be built up
# from the bind pose — a T — with a hand-guessed stance under it, and every
# one of them met the source clips at a seam: different arm, different
# shoulder, different hips, and a crossfade that showed all three. Now the
# base of everything authored is a frame of the source idle itself — the bar
# held the way Mixamo holds it — and the helpers add MOTION to that. A clip
# that starts and ends on the idle's own pose blends into it for free.
BASE = {}
HIP_BASE = Vector((0, 0, 0))
_idle = bpy.data.actions.get('idleSrc')
use_action(_idle)
bpy.context.scene.frame_set(int(_idle.frame_range[0]) + 4); bpy.context.view_layer.update()
for pb in pbs:
    BASE[pb.name] = pb.rotation_quaternion.copy()
    if pb.name == ROOT: HIP_BASE = pb.location.copy()
arm.animation_data.action = None
log('base pose lifted from the source idle; hips at', tuple(round(v, 1) for v in HIP_BASE))
# ---- THE HAND ACTUALLY CLOSES ON THE BAR.
# The grip used to be lifted straight out of the idle — but the source clips
# have their finger curves stripped a few lines above, so what was lifted was
# the BIND pose: a flat, open hand with a crowbar passing through it, on every
# frame of every clip. The fingers are curled here instead, joint by joint,
# and stamped into every action including the four the scan shipped with.
# The bend axis is the bone's OWN local X (Blender puts +Y down a bone), and
# the sign is the one the render showed — a hand is not something to reason
# about from the numbers.
import re as _re
FINGER_SEG = {}
for _pb in pbs:
    _m = _re.search(r'(Thumb|Index|Middle|Ring|Pinky)(\d)', _pb.name)
    if _m: FINGER_SEG[_pb.name] = (_m.group(1), int(_m.group(2)))
# AND THE TWO HANDS CURL OPPOSITE WAYS. One `CURL_SIGN` was verified by
# rendering — the RIGHT hand, the one holding the crowbar, which is the only
# one anybody was looking at. The rig is mirrored, so the left hand's finger
# bones have their local X pointing the other way down the armature's Y: the
# same sign that closes the right hand opens the left one BACKWARDS, every
# finger bent over the back of the hand, on every frame of every clip.
# Measured, not assumed — LeftHandIndex1's local X reads (-0.06, 0.99, -0.14)
# in armature space against the right's (-0.07, -0.99, 0.14) — and the sign
# is DERIVED from that axis per bone rather than named twice, so a rig whose
# mirroring differs cannot quietly break it again.
def _curl_sign(pb):
    ax = pb.bone.matrix_local.to_3x3() @ Vector((1.0, 0.0, 0.0))
    return -1.0 if ax.y < 0 else 1.0
CURL_SIGN = {pb.name: _curl_sign(pb) for pb in pbs if pb.name in FINGER_SEG}
log('curl signs: %d right-handed, %d left-handed'
    % (sum(1 for v in CURL_SIGN.values() if v < 0), sum(1 for v in CURL_SIGN.values() if v > 0)))
def set_fingers(k=1.0, thumb=1.0):
    """k = 0 open, 1 closed round a bar about 3 cm across."""
    for n, (which, seg) in FINGER_SEG.items():
        pb = pbs[n]
        sg = CURL_SIGN[n]
        if which == 'Thumb':
            # the thumb lies ACROSS the others rather than curling under
            ang = (0.45, 0.55, 0.40, 0.15)[min(seg, 4) - 1] * thumb * k
            pb.rotation_quaternion = Quaternion((1, 0, 0), sg * ang * 0.75) @ Quaternion((0, 0, 1), sg * 0.35 * thumb * k)
        else:
            # knuckle, middle, tip, and the last joint barely moves
            ang = (0.62, 0.98, 0.72, 0.22)[min(seg, 4) - 1] * k
            pb.rotation_quaternion = Quaternion((1, 0, 0), sg * ang)
def capture_fingers():
    return {n: pbs[n].rotation_quaternion.copy() for n in FINGER_SEG}
rest_all = {pb.name: pb.rotation_quaternion.copy() for pb in pbs}
set_fingers(1.0)
GRIP = capture_fingers()
set_fingers(0.34, thumb=0.5)          # empty hands: loose, not a fist
GRIP_OPEN = capture_fingers()
for pb in pbs: pb.rotation_quaternion = rest_all[pb.name].copy()
log('grip built on', len(GRIP), 'finger bones')

def basis(pb): return pb.bone.matrix_local.to_3x3().inverted()
def setrot(key, *pairs):
    name = B.get(key, key)
    if name not in pbs: return
    pb = pbs[name]; m = basis(pb); q = Quaternion((1, 0, 0, 0))
    for ax, ang in pairs:
        if ang: q = q @ Quaternion((m @ ax).normalized(), ang)
    pb.rotation_quaternion = q @ BASE[name]          # the delta, on top of the idle's pose
def rest():
    for pb in pbs:
        pb.rotation_quaternion = BASE[pb.name].copy(); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    if ROOT in pbs: pbs[ROOT].location = HIP_BASE.copy()
def key(f):
    for pb in KEYED:
        pb.keyframe_insert('rotation_quaternion', frame=f)
        if pb.name in (ROOT, '_rootJoint'): pb.keyframe_insert('location', frame=f)
def new_action(name):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    use_action(act)
    return act
def finish(act):
    for fc in fcurves(act):
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
    log('  authored %-12s frames %-14s curves %d' % (act.name, tuple(round(v) for v in act.frame_range), len(fcurves(act))))
def stamp_grip(f=0, pose=None):
    for n, q in (pose or GRIP).items():
        pbs[n].rotation_quaternion = q
        pbs[n].keyframe_insert('rotation_quaternion', frame=f)

# deltas from the idle. `fwd` swings an arm about X toward -Y (forward),
# `up` lifts it about Y, `elbow` bends the forearm (negative = the way an
# elbow bends), `twist` about the arm's own line. Legs: `swing` forward,
# `knee` folds back. All of it is ADDED to the idle's pose.
def arm_pose(side, fwd=0.0, up=0.0, elbow=0.0, twist=0.0, wrist=0.0, out=0.0):
    s = 1 if side == 'Left' else -1
    setrot(side + 'Shoulder', (AX, -fwd * 0.18), (AY, s * (-up * 0.18 - out * 0.25)))
    setrot(side + 'Arm', (AX, -fwd), (AY, s * (-up - out)), (AZ, twist * s))
    setrot(side + 'ForeArm', (AX, elbow))
    setrot(side + 'Hand', (AX, wrist))
def leg_pose(side, swing=0.0, knee=0.0, foot=0.0, out=0.0):
    s = 1 if side == 'Left' else -1
    setrot(side + 'UpLeg', (AX, -swing), (AY, out * s))
    setrot(side + 'Leg', (AX, knee))
    setrot(side + 'Foot', (AX, -foot))
def torso(lean=0.0, roll=0.0, twist=0.0, bob=0.0, drop=0.0):
    setrot('Spine', (AX, lean * 0.34), (AY, roll * 0.34), (AZ, twist * 0.34))
    setrot('Spine1', (AX, lean * 0.33), (AY, roll * 0.33), (AZ, twist * 0.33))
    setrot('Spine2', (AX, lean * 0.33), (AY, roll * 0.33), (AZ, twist * 0.33))
    pbs[ROOT].location = HIP_BASE + basis(pbs[ROOT]) @ Vector((0, 0, (bob - drop) * 580))
def head(pitch=0.0, yaw=0.0, roll=0.0):
    setrot('Neck', (AX, pitch * 0.4), (AZ, yaw * 0.4), (AY, roll * 0.4))
    setrot('Head', (AX, pitch * 0.6), (AZ, yaw * 0.6), (AY, roll * 0.6))
def ease(t): return t * t * (3 - 2 * t)
def easeout(t): return 1 - (1 - t) ** 3
def easein(t): return t ** 3
def lerp(a, b, t): return a + (b - a) * t
def drag(t, d):
    """THE ARM ARRIVES AFTER THE BODY. Every joint in an authored pose runs
    off one number, so the shoulders, the elbow, the hips and the head all
    start together, cross together and stop together — which is the single
    thing that makes pose-to-pose animation read as a mannequin being posed
    rather than a man moving. Real weight travels outward: the hips lead, the
    chest follows, the hand is last and overshoots. `drag` is that lag, as a
    shift of the driving time — the body reads `t`, the arms `drag(t, 0.05)`,
    the head a little more — and it costs nothing but the shift."""
    return max(0.0, min(1.0, (t - d) / (1.0 - d)))
def follow(t, a, amp=0.12, n=1.6):
    """And it does not simply stop. Past `a` the limb carries on a little and
    comes back — one soft bounce, decaying — which is the follow-through a
    blow that landed has and a blow that was placed does not."""
    if t <= a: return 0.0
    x = (t - a) / max(1e-6, 1.0 - a)
    return amp * math.sin(math.pi * n * x) * (1 - x) ** 2
def bump(t, a, b):
    """0 → 1 → 0 across [a, b], smooth"""
    if t <= a or t >= b: return 0.0
    return math.sin(math.pi * (t - a) / (b - a))

# ------------------------------------------------------------------ CALM
# Before he knows you are a problem. The idle's own stance with the hands let
# go — he has no bar yet — and three counts running at once, none a multiple
# of another: the breath, weight rolling foot to foot, the head coming round.
act = new_action('calm'); N = 240
for f in range(0, N + 1, 3):
    rest(); t = f / N
    br = math.sin(t * math.pi * 5.0) * 0.010
    sway = math.sin(t * math.pi * 2.0)
    turn = max(0.0, math.sin(t * math.pi * 2.0 - 1.7)) ** 1.5
    torso(lean=0.02 * sway, roll=0.05 * sway, twist=0.08 * turn, bob=br - 0.010 * abs(sway))
    arm_pose('Right', fwd=0.10 + 0.04 * sway, up=-0.10, elbow=0.35, twist=0.10)     # the bar hand opens and drops
    arm_pose('Left', fwd=0.06 - 0.04 * sway, up=-0.06, elbow=0.25, twist=-0.06)
    leg_pose('Left', swing=0.04 * sway, knee=-0.06 * sway, out=0.02)
    leg_pose('Right', swing=-0.04 * sway, knee=0.08 * sway, out=0.02)
    head(pitch=0.06 - 0.05 * turn, yaw=0.28 * turn, roll=0.04 * sway)
    key(f)
stamp_grip(pose=GRIP_OPEN); finish(act)          # nothing in his hands yet

# ------------------------------------------------------------------ WALK
# The idle carrying itself forward. Legs cycle under the stance, the hips
# bob and roll with them, the shoulders counter the hips, the free hand
# swings a little and the bar hand hardly at all — a man walking at you
# with a weapon keeps the weapon still.
act = new_action('walk'); N = 32
for f in range(N + 1):
    rest(); ph = f / N * 2 * math.pi
    for side, p in (('Left', ph), ('Right', ph + math.pi)):
        sw = 0.46 * math.sin(p)
        kn = 0.62 * max(0.0, math.sin(p + 1.35)) - 0.06
        ft = 0.14 * max(0.0, math.sin(p)) - 0.18 * max(0.0, math.sin(p + math.pi))
        leg_pose(side, swing=sw, knee=kn, foot=ft, out=0.02)
    torso(lean=0.06, roll=0.05 * math.sin(ph), twist=0.08 * math.sin(ph), bob=0.028 * abs(math.sin(ph)) - 0.010)
    arm_pose('Left', fwd=0.22 * math.sin(ph + math.pi), elbow=-0.10 * math.sin(ph + math.pi))
    arm_pose('Right', fwd=0.06 * math.sin(ph), up=0.02)
    head(pitch=0.04, yaw=-0.04 * math.sin(ph))
    key(f)
stamp_grip(); finish(act)

# ---------------------------------------------------------------- PICKUP
# The bar is on the console at his right hand, at hip height, a little ahead
# of him. THE REACH IS SOLVED, NOT GUESSED: the hand has to arrive where the
# bar actually lies, or the game's swap from shelf to fist is a pop — which
# is what "it just lags into his hand" was. The target is the bar's spot in
# armature units (his right is -X, forward is -Y, up is +Z), and a small
# coordinate descent over the peak pose's parameters puts the hand there.
REACH_TARGET = Vector((-882.0, -265.0, 765.0))
rp = dict(lean=0.55, twist=-0.65, roll=-0.22, drop=0.30, fwd=0.30, up=0.15, elbow=-0.25, out=0.70, atw=-0.30)
def reach_pose(P, r=1.0, arc=0.0):
    """`arc` lifts the hand's PATH without moving either end of it. The bar
    lies on a table, and a hand that travels in a straight line from his hip
    to a point on a table top goes through the table on the way — his forearm
    and his elbow inside the wood, which is what "he clips through the table"
    is. Reaching over something is an ARC: the hand rises, crosses the edge
    and comes down onto the bar. It has to be zero at BOTH ends or it would
    move the solved peak pose, and the whole reason that pose is solved is
    that the game's hand-off from table to fist happens exactly there."""
    torso(lean=P['lean'] * r - 0.16 * arc, twist=P['twist'] * r, roll=P['roll'] * r, drop=P['drop'] * r - 0.10 * arc)
    arm_pose('Right', fwd=0.10 + P['fwd'] * r - 0.10 * arc, up=-0.10 + P['up'] * r + 0.62 * arc, elbow=0.35 + P['elbow'] * r - 0.34 * arc,
             twist=0.10 + P['atw'] * r, out=P['out'] * r + 0.18 * arc)
    arm_pose('Left', fwd=0.06 - 0.20 * r, up=-0.06 + 0.10 * r, elbow=0.25 - 0.15 * r)
    leg_pose('Left', swing=0.10 * r, knee=0.55 * r * max(0.0, P['drop']) / 0.30, foot=-0.05 * r, out=0.02 + 0.05 * r)
    leg_pose('Right', swing=-0.20 * r, knee=0.70 * r * max(0.0, P['drop']) / 0.30, foot=0.10 * r, out=0.02 + 0.10 * r)
# the sole must stay on the floor THROUGH the reach: the first solve dropped
# the hips through it, the seating pass then lifted the whole clip 0.43 m,
# and the hand went up with it — 29 cm above the bar in the game
_SHOE = None
for _o in meshes:
    if 'shoe' in (_o.data.name + _o.name).lower(): _SHOE = _o; break
_ARMS = arm.matrix_world.to_scale().z or 1.0
def _sole_units():
    dgp = bpy.context.evaluated_depsgraph_get(); ev = _SHOE.evaluated_get(dgp); mw = _SHOE.matrix_world
    return min((mw @ v.co).z for v in ev.data.vertices) / _ARMS
rest(); bpy.context.view_layer.update(); _SOLE_REF = _sole_units()
def reach_err(P):
    rest(); reach_pose(P, 1.0); bpy.context.view_layer.update()
    e = (pbs[B['RightHand']].tail - REACH_TARGET).length
    sink = max(0.0, _SOLE_REF - _sole_units())          # how far the sole is through the floor, rig units
    # AND A COST FOR FOLDING IN HALF. Distance to the bar was the only thing
    # the solve was paying for, and the cheapest way to put a hand on a low
    # table is to hinge at the waist — so it drove `lean` to its limit, 69
    # degrees, and he went down over the table like a man being sick, his
    # chest and his forearm inside the wood. A person bends their KNEES for
    # something at thigh height and keeps their back somewhere near straight.
    # The knees are already in the parameters (`drop`); they were just never
    # worth using. Past a comfortable lean each radian costs more than a
    # centimetre of reach does, so the squat takes the work — and the sole
    # term keeps that squat standing on the floor.
    fold = max(0.0, P['lean'] - 0.42)
    return e + 3.0 * sink + 900.0 * fold * fold
lim = dict(lean=(0.0, 1.2), twist=(-1.3, 0.3), roll=(-0.7, 0.4), drop=(0.0, 0.55), fwd=(-0.6, 1.6), up=(-0.6, 1.2), elbow=(-1.4, 0.6), out=(0.0, 1.4), atw=(-1.2, 1.2))
err = reach_err(rp); step = 0.30
for it in range(60):
    improved = False
    for k in list(rp):
        for sgn in (1, -1):
            trial = dict(rp); trial[k] = min(lim[k][1], max(lim[k][0], rp[k] + sgn * step))
            e = reach_err(trial)
            if e < err - 1e-3: rp, err, improved = trial, e, True
    if not improved: step *= 0.5
    if step < 0.01 or err < 4.0: break
log('reach solved: hand %.0f units off the bar (%.3f m); pose %s' % (err, err * ARM_S if 'ARM_S' in dir() else err * 0.0017, {k: round(v, 2) for k, v in rp.items()}))
act = new_action('pickup'); N = 44
for f in range(N + 1):
    rest(); t = f / N
    # HE SNATCHES IT. The first version reached over half a second and held
    # the bottom of the reach with his chin on his chest — the owner's "his
    # head is down" and "it needs to be fast". The hand goes out on an
    # ease-OUT (quick away, settling in), the fist closes at 0.42, and the
    # rise is immediate; the glance down is a GLANCE, a third of the old
    # pitch, and his eyes are back up before his body is.
    look = ease(min(1.0, t / 0.12))
    reach = easeout(max(0.0, min(1.0, (t - 0.04) / 0.34)))
    settle = ease(max(0.0, (t - 0.44) / 0.56))
    r = reach * (1 - settle)
    # over the table on the way out; straight up with the bar on the way back
    reach_pose(rp, r, arc=math.sin(math.pi * reach) * (1 - settle))
    # HIS HEAD STAYS ON YOU. The head is a child of the spine, so a reach
    # that pitches the chest 1.2 rad forward carries the face down with it
    # whatever the head is keyed to — and a man who looks at the floor while
    # he picks up a weapon has stopped being a threat. The head counters the
    # torso instead: the spine's own lean, twist and roll subtracted back out
    # (the three spine joints sum to `lean`, and neck + head sum to `pitch`),
    # so the mask holds level and pointed at you through the whole reach.
    head(pitch=-rp['lean'] * r * 0.94, yaw=-rp['twist'] * r * 0.75, roll=-rp['roll'] * r * 0.85)
    key(f)
stamp_grip(); finish(act)

# ----------------------------------------------------------------- TAUNT
# The fight starts here: he brings the bar up across his chest, squares his
# shoulders, tips his head at you, and drops back into the idle.
act = new_action('taunt'); N = 54
for f in range(N + 1):
    rest(); t = f / N
    up = bump(t, 0.05, 0.80) ** 0.8
    upA = bump(drag(t, 0.06), 0.05, 0.80) ** 0.8      # the bar follows the shoulders
    torso(lean=-0.12 * up, twist=0.20 * up, roll=0.04 * up, bob=0.02 * up)
    arm_pose('Right', fwd=0.95 * upA, up=0.35 * upA, elbow=-0.85 * upA, twist=0.40 * upA)
    arm_pose('Left', fwd=0.25 * upA, up=0.15 * upA, elbow=-0.30 * upA)
    leg_pose('Left', swing=0.06 * up, knee=0.06 * up)
    leg_pose('Right', swing=-0.06 * up, knee=0.08 * up)
    head(pitch=-0.18 * up, yaw=0.10 * up, roll=0.26 * up)
    key(f)
stamp_grip(); finish(act)

# ------------------------------------------------------- ATTACK: THE HELD
# Over the head with both hands' weight behind it, and it HANGS — the swing
# that teaches you not to answer a tell on a count. Cock to 0.30, hang to
# 0.62 with the tremble of a thing held too long, down by 0.74, recover.
act = new_action('attackHold'); N = 64
for f in range(N + 1):
    rest(); t = f / N
    # AND THE FALL IS THE HALF YOU CAN SEE. It used to hang for a third of
    # the clip and then drop in a twelfth of it — mapped onto a 1.08 s
    # startup that is half a second of a man standing still followed by a
    # blur, and a guard raised off a blur is a guess. The hang is shorter
    # and the descent is nearly twice as long, so the bar is visibly
    # FALLING for a third of a second before it lands: long enough to time
    # a block against, still the slowest thing he throws, and it still
    # takes two of your four if you read it wrong. The tremble at the top
    # grows as the hang runs out, so the moment before the release is the
    # loudest part of the tell rather than the quietest.
    if t < 0.24: u = ease(t / 0.24); hang = 0.0; down = 0.0
    elif t < 0.38: u = 1.0; hang = (t - 0.24) / 0.14; down = 0.0
    # AND THE FALL IS NOT A CUBE. Widening the window did nothing on its own,
    # because `easein` is t³: at the halfway point of the descent the bar had
    # moved an EIGHTH of the way and the whole stroke still happened in the
    # last few frames. Measured on the hand, the visible drop was 0.147 s
    # against a parry window of 0.156 — you were not reading it, you were
    # guessing. A gentler exponent starts the bar moving as soon as the hang
    # ends and still accelerates into the floor, so the fall is something you
    # WATCH. It is still the slowest thing he throws and it still takes two.
    elif t < 0.68: u = 1.0; hang = 1.0; down = ((t - 0.38) / 0.30) ** 1.25
    else: u = 1.0; hang = 1.0; down = 1.0 - easeout((t - 0.68) / 0.32) * 0.30
    tremble = 0.030 * math.sin(hang * math.pi * 7) * (0.35 + 0.65 * hang) * (1 - down)
    cock = u * (1 - down)
    # the arms are a beat behind the body, and they carry past the stop
    downA = down if down <= 0 else min(1.0, down * 1.06)
    lagU = ease(drag(t / 0.26, 0.10)) if t < 0.26 else u
    cockA = lagU * (1 - downA)
    over = follow(t, 0.68, 0.10, 1.4)
    torso(lean=-0.30 * cock + 0.85 * down + 0.10 * over, twist=0.22 * cock - 0.30 * down, roll=-0.08 * cock, bob=0.05 * cock - 0.09 * down)
    # DOWN THROUGH THE TARGET. The first down-stroke stopped with the arm
    # still raised a third of the way, so the bar never came within a metre
    # and a half of a man standing in front of him: measured, every held
    # swing whiffed. It finishes with the arm forward and below level now,
    # the bar at hip height in front of him, and the body bent over it.
    arm_pose('Right', fwd=1.30 * cockA - 1.55 * downA + tremble - 0.22 * over, up=1.45 * cockA - 1.60 * downA - 0.18 * over, elbow=-1.15 * cockA + 0.90 * downA + 0.20 * over, twist=0.30 * cockA)
    arm_pose('Left', fwd=1.05 * cockA - 1.25 * downA - 0.18 * over, up=1.10 * cockA - 1.25 * downA - 0.14 * over, elbow=-0.95 * cockA + 0.75 * downA + 0.16 * over)
    leg_pose('Left', swing=-0.16 * cock + 0.36 * down, knee=0.12 * cock + 0.22 * down)
    leg_pose('Right', swing=-0.08 * cock - 0.26 * down, knee=0.16 * cock + 0.32 * down)
    head(pitch=-0.26 * cock + 0.48 * down, yaw=0.04)
    key(f)
stamp_grip(); finish(act)

# ------------------------------------------------------ ATTACK: THE LUNGE
# A step in behind a straight thrust of the bar's point — the swing that
# covers ground, so backing away is not an answer to it.
act = new_action('attackLunge'); N = 46
for f in range(N + 1):
    rest(); t = f / N
    if t < 0.34: back = ease(t / 0.34); push = 0.0
    elif t < 0.50: back = 1.0; push = easein((t - 0.34) / 0.16)
    else: back = 1.0 - easeout((t - 0.50) / 0.50) * 0.85; push = 1.0 - easeout((t - 0.50) / 0.50) * 0.75
    ov = follow(t, 0.50, 0.14, 1.5)
    pushA = min(1.0, push * 1.05)
    torso(lean=-0.14 * back + 0.55 * push, twist=-0.22 * back + 0.50 * push, bob=-0.02 * back - 0.05 * push, drop=0.10 * push)
    arm_pose('Right', fwd=-0.35 * back + 1.55 * pushA + 0.20 * ov, up=0.10 * back + 0.10 * push, elbow=-0.55 * back + 0.75 * push - 0.18 * ov, twist=0.20 * back + 0.40 * push)
    arm_pose('Left', fwd=0.20 * back - 0.45 * push - 0.14 * ov, elbow=-0.25 * back + 0.30 * push)
    leg_pose('Left', swing=-0.26 * back + 0.90 * push, knee=0.26 * back - 0.05 * push, foot=-0.08 * push)
    leg_pose('Right', swing=-0.16 * back - 0.50 * push, knee=0.18 * back + 0.34 * push)
    head(pitch=-0.10 * back + 0.24 * push, yaw=-0.10 * push)
    key(f)
stamp_grip(); finish(act)

# ----------------------------------------------------------------- BLOCK
# Your light swing met the bar. It comes up fast across his chest, both
# hands on it, and holds; the game scrubs it over 0.46 s and lets it fall
# back into the idle. Fast up, because a guard that arrives late is a hit.
act = new_action('block'); N = 24
for f in range(N + 1):
    rest(); t = f / N
    k = easeout(min(1.0, t / 0.40))
    torso(lean=-0.05 * k, twist=0.16 * k, roll=0.05 * k, drop=0.04 * k)
    # the bar ACROSS him, horizontal at the chest: the arm barely rises, the
    # elbow folds hard and the wrist turns the bar flat. A guard held high
    # overhead read as another wind-up.
    arm_pose('Right', fwd=0.70 * k, up=0.15 * k, elbow=-1.60 * k, twist=0.95 * k, wrist=0.35 * k)
    arm_pose('Left', fwd=0.85 * k, up=0.10 * k, elbow=-1.35 * k, out=-0.25 * k, twist=-0.40 * k)
    leg_pose('Left', knee=0.12 * k, out=0.02); leg_pose('Right', knee=0.14 * k, out=0.02)
    head(pitch=0.12 * k, roll=0.05 * k)
    key(f)
stamp_grip(); finish(act)

# ------------------------------------------------------------------- HIT
# Rocked: the head goes first, the bar drops off line, and he gathers.
act = new_action('hit'); N = 24
for f in range(N + 1):
    rest(); t = f / N
    k = math.sin(math.pi * min(1.0, t * 1.2)) ** 0.7
    torso(lean=-0.32 * k, twist=0.30 * k, roll=0.20 * k, bob=-0.04 * k)
    arm_pose('Right', fwd=-0.35 * k, up=-0.25 * k, elbow=0.30 * k)
    arm_pose('Left', fwd=-0.30 * k, up=-0.15 * k, elbow=0.25 * k)
    leg_pose('Left', swing=-0.22 * k, knee=0.22 * k)
    leg_pose('Right', swing=-0.16 * k, knee=0.20 * k)
    head(pitch=-0.55 * k, yaw=0.28 * k, roll=0.32 * k)
    key(f)
stamp_grip(); finish(act)

# ----------------------------------------------------------------- DEATH
# A fallback only: in the game he falls on the ragdoll. Kept for the harness
# and for anything that asks for a death clip by name.
act = new_action('death'); N = 62
for f in range(N + 1):
    rest(); t = f / N
    a = ease(min(1.0, t / 0.20)); b2 = ease(max(0.0, min(1.0, (t - 0.16) / 0.42))); c = ease(max(0.0, (t - 0.50) / 0.50))
    setrot('Hips', (AX, -1.45 * c - 0.25 * b2), (AY, 0.55 * c), (AZ, 0.30 * c))
    torso(lean=-0.55 * a + 0.50 * b2 + 0.30 * c, twist=0.30 * a - 0.35 * c, roll=0.22 * a + 0.30 * c, drop=0.62 * b2 + 0.30 * c)
    arm_pose('Right', fwd=-0.65 * a + 0.90 * b2 + 0.35 * c, up=-0.50 * a - 0.20 * b2, elbow=0.85 * b2 + 0.20 * c, out=0.30 * c)
    arm_pose('Left', fwd=-0.85 * a + 0.35 * b2, up=-0.35 * a, elbow=0.65 * b2, out=0.45 * c)
    leg_pose('Left', swing=0.20 * a + 0.75 * b2 + 0.35 * c, knee=1.30 * b2 - 0.35 * c, foot=0.30 * b2, out=0.30 * c)
    leg_pose('Right', swing=0.10 * a + 0.95 * b2 + 0.30 * c, knee=1.05 * b2 - 0.25 * c, foot=0.25 * b2, out=0.42 * c)
    head(pitch=-0.70 * a + 0.55 * b2 + 0.35 * c, yaw=0.30 * a, roll=0.35 * a + 0.40 * c)
    key(f)
stamp_grip(); finish(act)

# ---------------------------------------------------------- MIRRORED SWINGS
# The two swings become four: every bone's armature-space matrix reflected
# across x = 0 and handed to the opposite bone, parents first, so the basis
# is recovered from a parent that has already been set. The crowbar is
# skinned to the right hand, so a mirrored swing puts it in his left.
def flip_name(n):
    if 'Left' in n: return n.replace('Left', 'Right')
    if 'Right' in n: return n.replace('Right', 'Left')
    return n
S = Matrix.Scale(-1.0, 4, Vector((1.0, 0.0, 0.0)))
def depth(pb):
    d = 0
    while pb.parent: pb = pb.parent; d += 1
    return d
ordered = sorted(arm.pose.bones, key=depth)
for src_name, dst_name in (('attackDown', 'attackDownM'), ('attackSide', 'attackSideM')):
    src = bpy.data.actions.get(src_name)
    if src is None: continue
    arm.animation_data.action = src
    try: arm.animation_data.action_slot = src.slots[0]
    except Exception: pass
    f0, f1 = int(src.frame_range[0]), int(src.frame_range[1])
    frames = []
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
        frames.append({pb.name: pb.matrix.copy() for pb in arm.pose.bones})
    arm.animation_data.action = None
    dst = new_action(dst_name)
    for i, f in enumerate(range(f0, f1 + 1)):
        for pb in ordered:
            if pb.name in SKIP_KEY: continue
            m = frames[i].get(flip_name(pb.name))
            if m is None: continue
            pb.matrix = S @ m @ S
            bpy.context.view_layer.update()
        key(f)
    stamp_grip(f0)
    finish(dst)

# ------------------------------------------------------- PLANT THE FEET
# Every authored clip is seated so its lowest foot rests where the source
# clips' feet rest. Lowering the hips onto Mixamo's stance height (above)
# fixed the popping between clip families and introduced this: the authored
# poses keep straighter legs than Mixamo's do, so a quarter of a metre of
# hip drop went straight through the floor — the feet ended up 12 to 28 cm
# UNDER it, which is why the professionally animated swings then looked like
# he was hovering. The offset is measured per clip, not guessed, and it only
# ever LIFTS: the reference is the source idle's own lowest foot.
# ...and the thing that has to rest on the floor is the SOLE, not a bone.
# Measuring the foot bones' heads and tails over-corrected every clip by five
# to twelve centimetres, because the shoe geometry hangs below the joint and
# the joint the eye judges is not the one the rig names. The shoe mesh's own
# lowest vertex is the only honest answer, and it is measured through the
# depsgraph so the armature is actually deforming it.
SHOE = None
for o in meshes:
    if 'shoe' in (o.data.name + o.name).lower(): SHOE = o; break
if SHOE is None: SHOE = max(meshes, key=lambda o: len(o.data.vertices))
log('sole measured on', SHOE.name, '(' + SHOE.data.name + ')', len(SHOE.data.vertices), 'verts')
ARM_S = arm.matrix_world.to_scale().z or 1.0
def sole_z():
    dgp = bpy.context.evaluated_depsgraph_get()
    ev = SHOE.evaluated_get(dgp)
    mw = SHOE.matrix_world
    return min((mw @ v.co).z for v in ev.data.vertices)
def clip_low(act, step=2):
    arm.animation_data.action = act
    try: arm.animation_data.action_slot = act.slots[0]
    except Exception: pass
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    lo = 1e9
    for f in range(f0, f1 + 1, step):
        bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
        lo = min(lo, sole_z())
    arm.animation_data.action = None
    return lo
REF_LOW = clip_low(bpy.data.actions['idleSrc'])
log('reference sole height from the source idle %.4f m' % REF_LOW)
for nm in ('calm', 'walk', 'taunt', 'attackHold', 'attackLunge', 'hit', 'pickup', 'block'):
    act = bpy.data.actions.get(nm)
    if not act: continue
    # PER FRAME, and only ever up. A constant lift seated the reach of the
    # pickup and left him standing a third of a metre off the floor for the
    # rest of the clip; a frame whose sole is through the floor is lifted by
    # exactly what it needs and a frame that is not is left alone.
    use_action(act)
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    lifts = []
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
        lifts.append((f, max(0.0, REF_LOW - sole_z()), pbs[ROOT].location.copy()))
    mx = max(l for _, l, _ in lifts)
    if mx < 0.003:
        arm.animation_data.action = None
        log('  %-12s already seated' % nm); continue
    for f, lift_m, loc in lifts:
        if lift_m <= 0: continue
        up = basis(pbs[ROOT]) @ Vector((0, 0, lift_m / ARM_S))
        pbs[ROOT].location = loc + up
        pbs[ROOT].keyframe_insert('location', frame=f)
    arm.animation_data.action = None
    log('  %-12s seated per frame, max lift %.3f m' % (nm, mx))

# ---- and the four the scan shipped with carry no finger curves at all, so
# they were played with an open bind-pose hand. One key holds for the clip.
for _nm in ('idleSrc', 'run', 'attackDown', 'attackSide'):
    _a = bpy.data.actions.get(_nm)
    if not _a: continue
    use_action(_a)
    stamp_grip(int(_a.frame_range[0]))
    arm.animation_data.action = None
log('grip stamped into the source clips')

# --------------------------------------------------- where each blow lands
# Measured, never guessed: the frame the swinging hand is furthest out and
# moving fastest is the frame the bar arrives, and the game maps its clock
# onto that. Printed for DEALER_ATTACKS to carry.
def contact(name, bone):
    a = bpy.data.actions.get(name)
    if not a: return None
    arm.animation_data.action = a
    try: arm.animation_data.action_slot = a.slots[0]
    except Exception: pass
    f0, f1 = int(a.frame_range[0]), int(a.frame_range[1])
    pos, best, bf = [], -1e9, f0
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
        pos.append(pbs[B[bone]].matrix.translation.copy())
    for i in range(1, len(pos)):
        v = (pos[i] - pos[i-1]).length
        # A BLOW LANDS ON THE WAY DOWN. Raw speed was the whole velocity term,
        # and the fastest thing in a clip is not always the strike: give the
        # held swing a real follow-through and the arm coming back UP out of
        # it is quicker than the arm going down into it, so the detector
        # named the recovery as the contact frame and the game dealt its
        # damage a fifth of a second after the bar had already passed you.
        # A rising hand is not a hit. The four horizontal swings are
        # untouched by this — they barely change height at all.
        rising = (pos[i].z - pos[i-1].z) > 0
        score = pos[i].y * 0.6 + v * 40 * (0.2 if rising else 1.0) - pos[i].z * 0.15
        if score > best: best, bf = score, f0 + i
    arm.animation_data.action = None
    dur = (f1 - f0) / 24.0
    log('  contact %-14s frame %3d of %3d   (%.3f of %.2fs)' % (name, bf, f1, (bf - f0) / max(1, f1 - f0), dur))
    return bf
for nm, bone in (('attackDown', 'RightHand'), ('attackSide', 'RightHand'),
                 ('attackDownM', 'LeftHand'), ('attackSideM', 'LeftHand'),
                 ('attackHold', 'RightHand'), ('attackLunge', 'RightHand')):
    contact(nm, bone)

# ----------------------------------------------------------------- measure
arm.animation_data.action = bpy.data.actions.get('ready')
try: arm.animation_data.action_slot = arm.animation_data.action.slots[0]
except Exception: pass
bpy.context.scene.frame_set(0); bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
lo = Vector((1e9, 1e9, 1e9)); hi = -lo
for m in meshes:
    ev = m.evaluated_get(dg)
    for v in ev.data.vertices:
        w = m.matrix_world @ v.co
        lo = Vector((min(lo[i], w[i]) for i in range(3))); hi = Vector((max(hi[i], w[i]) for i in range(3)))
log('posed bounds (blender m)  x %.2f..%.2f  y %.2f..%.2f  z %.2f..%.2f   HEIGHT %.3f' %
    (lo.x, hi.x, lo.y, hi.y, lo.z, hi.z, hi.z - lo.z))
arm.animation_data.action = None

# ------------------------------------------------------- look at the motion
# Authoring a rig you cannot see is guessing, and three stills of a clip is
# barely better than none: eight frames of every clip from in front and a
# little to his left, so an arc reads as an arc and a pop reads as a pop.
if os.environ.get('BW_RENDER'):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    try: sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'SINGLE'
    except Exception: pass
    sc.render.resolution_x = 220; sc.render.resolution_y = 330; sc.render.resolution_percentage = 100
    cam_d = bpy.data.cameras.new('c'); cam_d.lens = 50
    cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (1.8, -5.0, 1.75)
    cam.rotation_euler = (math.radians(84), 0, math.radians(20))
    NF = 8
    # the hand, close enough to judge a grip
    hand_cam = bpy.data.objects.new('handcam', bpy.data.cameras.new('hc'))
    hand_cam.data.lens = 85; sc.collection.objects.link(hand_cam)
    for nm in ('idleSrc', 'attackDown', 'calm'):
        a = bpy.data.actions.get(nm)
        if not a: continue
        use_action(a); sc.frame_set(int(a.frame_range[0]) + 6)
        bpy.context.view_layer.update()
        hp = arm.matrix_world @ pbs[B['RightHand']].head
        sc.camera = hand_cam
        hand_cam.location = (hp.x + 0.42, hp.y - 0.62, hp.z + 0.16)
        # a camera looks down its own -Z: the track quat wants the vector
        # FROM the subject TO the lens, and nothing else aims it correctly
        hand_cam.rotation_euler = (Vector(hand_cam.location) - hp).to_track_quat('Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(SP, 'hand_%s.png' % nm)
        bpy.ops.render.render(write_still=True)
    sc.camera = cam
    log('  rendered hands')
    for nm in ('calm', 'walk', 'pickup', 'taunt', 'attackHold', 'attackLunge', 'hit', 'block', 'attackDown', 'attackSide', 'idleSrc', 'run'):
        a = bpy.data.actions.get(nm)
        if not a: continue
        use_action(a)
        f0, f1 = int(a.frame_range[0]), int(a.frame_range[1])
        for i in range(NF):
            sc.frame_set(int(round(f0 + (f1 - f0) * i / (NF - 1))))
            sc.render.filepath = os.path.join(SP, 'strip_%s_%d.png' % (nm, i))
            bpy.ops.render.render(write_still=True)
        log('  rendered', nm)
    arm.animation_data.action = None

# ------------------------------------------------------------------ export
for a in bpy.data.actions: a.use_fake_user = True
log('actions out:', sorted(a.name for a in bpy.data.actions))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
# EVERY CLIP CARRIES EVERY CHANNEL, or the mixer leaves bones where the last
# clip put them. Exported without baking, the four Mixamo clips came out with
# 22 rotation channels (the exporter drops whatever does not change) and the
# authored ones with 63 — so crossfading from a swing to the idle left forty
# bones holding their pose from the swing, and back again left the swing
# playing on top of the idle's arms. That is the "animations are glitched
# out". The mutant's build bakes, which is why it never had this: 210
# channels on every clip, 70 bones by three paths, no exceptions.
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=False, export_yup=True,
                          export_materials='EXPORT', export_image_format='AUTO',
                          export_animations=True, export_animation_mode='ACTIONS',
                          export_frame_range=False, export_force_sampling=True,
                          export_bake_animation=True, export_optimize_animation_size=False,
                          export_skins=True)
log('DONE', os.path.getsize(OUT), 'bytes')
