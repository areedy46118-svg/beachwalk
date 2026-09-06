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

    for name in sorted(os.listdir(SRCDIR)):
        base, ext = os.path.splitext(name)
        if 'transmission' in base: continue            # zeroed in the material; the map is dead weight
        src = os.path.join(SRCDIR, name)
        if base == 'PackedMaterial0_baseColor':
            src = unflag(src, os.path.join(SP, 'noflag.png'))
        pil = Image.open(src)
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
# toes point -Y. (The chain that gets it there: he faces +Z in the glTF, the
# importer turns that into Blender -Y, and the exporter turns it back.) So
# `forward` is -Y here and every helper below carries the sign — the call
# sites all read "positive is the natural direction".
# armature space: +X is his LEFT, -Y is FORWARD, +Z is UP
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
# a leaf bone moves no vertex the eye can find and costs a curve like any other
SKIP_KEY = set(FINGERS) | {pb.name for pb in pbs if '_End' in pb.name}
KEYED = [pb for pb in pbs if pb.name not in SKIP_KEY]
log('keyed bones', len(KEYED), 'of', len(pbs))

def basis(pb): return pb.bone.matrix_local.to_3x3().inverted()
def setrot(key, *pairs):
    name = B.get(key, key)
    if name not in pbs: return
    pb = pbs[name]; m = basis(pb); q = Quaternion((1, 0, 0, 0))
    for ax, ang in pairs:
        if ang: q = q @ Quaternion((m @ ax).normalized(), ang)
    pb.rotation_quaternion = q
def setloc(key, v):
    name = B.get(key, key)
    if name in pbs: pbs[name].location = basis(pbs[name]) @ Vector(v)
def rest():
    for pb in pbs:
        pb.rotation_quaternion = Quaternion((1, 0, 0, 0)); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
def key(f):
    for pb in KEYED:
        pb.keyframe_insert('rotation_quaternion', frame=f)
        if pb.name in (ROOT, '_rootJoint'): pb.keyframe_insert('location', frame=f)
def new_action(name):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    if not arm.animation_data: arm.animation_data_create()
    arm.animation_data.action = act
    try: arm.animation_data.action_slot = act.slots[0] if act.slots else act.slots.new(id_type='OBJECT', name='Legacy')
    except Exception: pass
    return act
def fcurves(act):
    if hasattr(act, 'fcurves'): return list(act.fcurves)
    out = []
    for lay in getattr(act, 'layers', []):
        for st in getattr(lay, 'strips', []):
            for cb in getattr(st, 'channelbags', []): out.extend(cb.fcurves)
    return out
def finish(act):
    for fc in fcurves(act):
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
    log('  authored %-12s frames %-14s curves %d' % (act.name, tuple(round(v) for v in act.frame_range), len(fcurves(act))))

# an arm lies along +X (his left) / -X (his right) in the rest pose, so
# `fwd` swings it about Z toward +Y and `up` lifts it about Y
# AND THE REST POSE IS A T. Mixamo binds with the arms straight out along
# ±X, not hanging — so the first pass's arm angles, which were written as if
# 0 meant "at his sides", never took them out of the T at all and he stood
# there like a scarecrow through every clip. `ARM_DROP` is the rotation from
# the T to a hanging arm, and it is subtracted from `up`: up = 0 is an arm
# at his side, up = 1.4 is an arm straight out. The order in `setrot` is
# right-to-left — the drop happens first, and the swing acts on the dropped
# arm — and once the arm points down, forward is a turn about X for BOTH
# sides, which is why only the drop carries the left/right sign.
ARM_DROP = 1.42
def arm_pose(side, fwd=0.0, up=0.0, elbow=0.0, twist=0.0, wrist=0.0, out=0.0):
    s = 1 if side == 'Left' else -1
    setrot(side + 'Shoulder', (AX, -fwd * 0.16), (AY, s * (up * 0.14 + out * 0.22)))
    setrot(side + 'Arm', (AX, -fwd), (AY, s * (ARM_DROP - up - out)), (AZ, twist * s))
    setrot(side + 'ForeArm', (AX, elbow))       # negative bends it the way an elbow bends
    setrot(side + 'Hand', (AX, wrist))
def leg_pose(side, swing=0.0, knee=0.0, foot=0.0, out=0.0):
    s = 1 if side == 'Left' else -1
    setrot(side + 'UpLeg', (AX, -swing), (AY, out * s))
    setrot(side + 'Leg', (AX, knee))            # the shin folds BACK, behind him
    setrot(side + 'Foot', (AX, -foot))
def torso(lean=0.0, roll=0.0, twist=0.0, bob=0.0, drop=0.0):
    setrot('Spine', (AX, lean * 0.34), (AY, roll * 0.34), (AZ, twist * 0.34))
    setrot('Spine1', (AX, lean * 0.33), (AY, roll * 0.33), (AZ, twist * 0.33))
    setrot('Spine2', (AX, lean * 0.33), (AY, roll * 0.33), (AZ, twist * 0.33))
    setloc('Hips', (0, 0, (bob - drop) * 580))   # the rig runs ~590 units to the metre
def head(pitch=0.0, yaw=0.0, roll=0.0):
    setrot('Neck', (AX, pitch * 0.4), (AZ, yaw * 0.4), (AY, roll * 0.4))
    setrot('Head', (AX, pitch * 0.6), (AZ, yaw * 0.6), (AY, roll * 0.6))
def ease(t): return t * t * (3 - 2 * t)
def lerp(a, b, t): return a + (b - a) * t

# the stance he fights from: crowbar back in the right hand, left hand out,
# weight low. Everything authored blends out of and back into this.
def guard(k=1.0, breathe=0.0):
    torso(lean=0.16 * k, twist=-0.30 * k, roll=0.03 * k, bob=breathe)
    arm_pose('Right', fwd=-0.62 * k, up=0.34 * k, elbow=-1.05 * k, twist=0.25 * k)
    arm_pose('Left', fwd=0.50 * k, up=0.12 * k, elbow=-0.85 * k)
    leg_pose('Left', swing=0.26 * k, knee=0.30 * k, foot=-0.10 * k, out=0.10 * k)
    leg_pose('Right', swing=-0.24 * k, knee=0.34 * k, foot=0.06 * k, out=0.14 * k)
    head(pitch=0.10 * k, yaw=0.16 * k)

# The fingers close on the bar in the source clips and are keyed nowhere in
# the authored ones, so they would spring open between clips. The grip is
# lifted off the source swing once and stamped at frame 0 of everything
# authored — one key a curve, which holds for the clip.
GRIP = {}
src_attack = bpy.data.actions.get('Standing Melee Attack Downward')
if src_attack:
    arm.animation_data.action = src_attack
    try: arm.animation_data.action_slot = src_attack.slots[0]
    except Exception: pass
    bpy.context.scene.frame_set(20); bpy.context.view_layer.update()
    for n in FINGERS: GRIP[n] = pbs[n].rotation_quaternion.copy()
    arm.animation_data.action = None
log('grip captured on', len(GRIP), 'finger bones')
def stamp_grip(f=0):
    for n, q in GRIP.items():
        pbs[n].rotation_quaternion = q
        pbs[n].keyframe_insert('rotation_quaternion', frame=f)

# ------------------------------------------------------------------ CALM
# Before he knows you are a problem: standing in the dark with his hands
# empty, weight on one leg, breathing. He does not pace and he does not
# fidget — he was already down here, and the stillness is the menace.
act = new_action('calm'); N = 220
for f in range(0, N + 1, 4):
    rest(); t = f / N
    br = math.sin(t * math.pi * 4) * 0.012
    k = ease(min(1.0, abs(math.sin(t * math.pi * 1.0)) * 1.2))
    torso(lean=0.05, roll=0.05 + 0.03 * k, twist=0.05 * k, bob=br)
    arm_pose('Right', fwd=0.02, up=-0.04, elbow=-0.30 - 0.05 * k)
    arm_pose('Left', fwd=0.02, up=-0.04, elbow=-0.26 - 0.04 * k)
    leg_pose('Left', swing=0.04, knee=0.10, out=0.06)
    leg_pose('Right', swing=-0.03, knee=0.20, out=0.10)
    head(pitch=0.06 - 0.05 * k, yaw=0.10 * k, roll=0.04 * k)
    key(f)
stamp_grip(); finish(act)

# ----------------------------------------------------------------- READY
# The fighting stance, breathing. Weight rolls foot to foot on a count you
# cannot use: a stance that ticks is a stance you can time a swing against.
act = new_action('ready'); N = 96
for f in range(0, N + 1, 3):
    rest(); t = f / N
    s = math.sin(t * math.pi * 2); s2 = math.sin(t * math.pi * 4 + 0.7)
    guard(1.0, breathe=0.012 * s2)
    torso(lean=0.16 + 0.02 * s, twist=-0.30 + 0.05 * s, roll=0.03 + 0.04 * s, bob=0.012 * s2)
    arm_pose('Right', fwd=-0.62 + 0.05 * s, up=0.34 + 0.04 * s2, elbow=-1.05 - 0.05 * s, twist=0.25)
    arm_pose('Left', fwd=0.50 + 0.06 * s, up=0.12 + 0.03 * s2, elbow=-0.85 - 0.06 * s)
    head(pitch=0.10, yaw=0.16 + 0.05 * s)
    key(f)
stamp_grip(); finish(act)

# ------------------------------------------------------------------ WALK
# Coming at you in the stance — he never drops the guard to travel.
act = new_action('walk'); N = 34
for f in range(N + 1):
    rest(); ph = f / N * 2 * math.pi
    guard(1.0)
    for side, p in (('Left', ph), ('Right', ph + math.pi)):
        sw = 0.42 * math.sin(p)
        kn = 0.22 + 0.55 * max(0.0, math.sin(p + 1.5))
        ft = 0.12 * max(0.0, math.sin(p)) - 0.18 * max(0.0, math.sin(p + math.pi))
        leg_pose(side, swing=sw + (0.02 if side == 'Left' else -0.02), knee=kn, foot=ft,
                 out=(0.10 if side == 'Left' else 0.14))
    torso(lean=0.18, twist=-0.30 + 0.06 * math.sin(ph), roll=0.03 + 0.05 * math.sin(ph), bob=0.03 * abs(math.sin(ph)) - 0.012)
    arm_pose('Right', fwd=-0.62 + 0.07 * math.sin(ph), up=0.34, elbow=-1.05, twist=0.25)
    arm_pose('Left', fwd=0.50 - 0.10 * math.sin(ph), up=0.12, elbow=-0.85)
    head(pitch=0.12, yaw=0.16)
    key(f)
stamp_grip(); finish(act)

# ----------------------------------------------------------------- TAUNT
# The fight starts here: he rolls the bar up off his shoulder, squares up,
# and tips his head at you. No weapon before this — the game shows the
# crowbar on the frame this begins.
act = new_action('taunt'); N = 54
for f in range(N + 1):
    rest(); t = f / N
    a = ease(min(1.0, t / 0.34))                       # out of calm, into guard
    b = ease(max(0.0, min(1.0, (t - 0.40) / 0.28)))    # the bar comes up and points
    c = ease(max(0.0, (t - 0.74) / 0.26))              # and settles back to ready
    lift = b * (1 - c)
    torso(lean=lerp(0.05, 0.16, a) - 0.10 * lift, twist=lerp(0.05, -0.30, a) + 0.22 * lift,
          roll=0.03, bob=0.03 * lift)
    arm_pose('Right', fwd=lerp(0.02, -0.62, a) + 1.05 * lift, up=lerp(-0.04, 0.34, a) + 0.30 * lift,
             elbow=lerp(-0.30, -1.05, a) + 0.72 * lift, twist=0.25 * a)
    arm_pose('Left', fwd=lerp(0.02, 0.50, a) + 0.18 * lift, up=lerp(-0.04, 0.12, a),
             elbow=lerp(-0.26, -0.85, a))
    leg_pose('Left', swing=0.26 * a, knee=0.10 + 0.20 * a, foot=-0.10 * a, out=0.06 + 0.04 * a)
    leg_pose('Right', swing=-0.24 * a, knee=0.20 + 0.14 * a, foot=0.06 * a, out=0.10 + 0.04 * a)
    head(pitch=0.06 + 0.10 * a - 0.16 * lift, yaw=0.10 + 0.06 * a, roll=0.04 + 0.20 * lift)
    key(f)
stamp_grip(); finish(act)

# ------------------------------------------------------- ATTACK: THE HELD
# Over the head, and it HANGS there. The mutant's held swing is the one that
# teaches you not to answer a tell on a count — a guard raised on the first
# beat is a block, not a parry. Cock 0..0.30, hang 0.30..0.62, down by 0.74.
act = new_action('attackHold'); N = 64
for f in range(N + 1):
    rest(); t = f / N
    if t < 0.30: u = ease(t / 0.30); hang = 0.0; down = 0.0
    elif t < 0.62: u = 1.0; hang = (t - 0.30) / 0.32; down = 0.0
    elif t < 0.76: u = 1.0; hang = 1.0; down = ease((t - 0.62) / 0.14)
    else: u = 1.0; hang = 1.0; down = 1.0 - ease((t - 0.76) / 0.24) * 0.30
    tremble = 0.02 * math.sin(hang * math.pi * 7) * (1 - down)
    cock = u * (1 - down)
    torso(lean=0.16 - 0.34 * cock + 0.70 * down, twist=-0.30 + 0.24 * cock - 0.30 * down,
          roll=0.03 - 0.10 * cock, bob=0.05 * cock - 0.06 * down)
    arm_pose('Right', fwd=-0.62 + 1.95 * cock - 2.30 * down + tremble, up=0.34 + 1.25 * cock - 1.30 * down,
             elbow=-1.05 + 0.55 * cock - 0.75 * down, twist=0.25)
    arm_pose('Left', fwd=0.50 + 0.85 * cock - 1.20 * down, up=0.12 + 0.70 * cock - 0.80 * down,
             elbow=-0.85 + 0.30 * cock - 0.45 * down)
    leg_pose('Left', swing=0.26 - 0.18 * cock + 0.40 * down, knee=0.30 + 0.10 * cock + 0.16 * down, out=0.10)
    leg_pose('Right', swing=-0.24 - 0.10 * cock - 0.30 * down, knee=0.34 + 0.16 * cock + 0.30 * down, out=0.14)
    head(pitch=0.10 - 0.24 * cock + 0.52 * down, yaw=0.16)
    key(f)
stamp_grip(); finish(act)

# ------------------------------------------------------ ATTACK: THE LUNGE
# A step in behind a straight thrust of the bar's point — the swing that
# covers ground, so backing away does not answer it.
act = new_action('attackLunge'); N = 46
for f in range(N + 1):
    rest(); t = f / N
    if t < 0.34: back = ease(t / 0.34); push = 0.0
    elif t < 0.52: back = 1.0; push = ease((t - 0.34) / 0.18)
    else: back = 1.0 - ease((t - 0.52) / 0.48) * 0.8; push = 1.0 - ease((t - 0.52) / 0.48) * 0.65
    torso(lean=0.16 - 0.16 * back + 0.62 * push, twist=-0.30 - 0.22 * back + 0.56 * push,
          roll=0.03, bob=-0.02 * back - 0.05 * push, drop=0.10 * push)
    arm_pose('Right', fwd=-0.62 - 0.42 * back + 2.05 * push, up=0.34 + 0.10 * back - 0.22 * push,
             elbow=-1.05 - 0.30 * back + 1.50 * push, twist=0.25 + 0.35 * push)
    arm_pose('Left', fwd=0.50 + 0.20 * back - 0.55 * push, up=0.12, elbow=-0.85 - 0.20 * back + 0.40 * push)
    leg_pose('Left', swing=0.26 - 0.30 * back + 1.05 * push, knee=0.30 + 0.30 * back - 0.10 * push,
             foot=-0.10, out=0.10)
    leg_pose('Right', swing=-0.24 - 0.20 * back - 0.55 * push, knee=0.34 + 0.20 * back + 0.36 * push, out=0.14)
    head(pitch=0.10 - 0.10 * back + 0.26 * push, yaw=0.16 - 0.10 * push)
    key(f)
stamp_grip(); finish(act)

# ------------------------------------------------------------------- HIT
# Rocked: the head goes first, the bar drops off line, and he gathers.
act = new_action('hit'); N = 24
for f in range(N + 1):
    rest(); t = f / N
    k = math.sin(math.pi * min(1.0, t * 1.25)) ** 0.7
    guard(1.0)
    torso(lean=0.16 - 0.34 * k, twist=-0.30 + 0.34 * k, roll=0.03 + 0.24 * k, bob=-0.05 * k)
    arm_pose('Right', fwd=-0.62 - 0.40 * k, up=0.34 - 0.34 * k, elbow=-1.05 + 0.35 * k, twist=0.25)
    arm_pose('Left', fwd=0.50 - 0.30 * k, up=0.12 - 0.20 * k, elbow=-0.85 + 0.30 * k)
    leg_pose('Left', swing=0.26 - 0.24 * k, knee=0.30 + 0.24 * k, out=0.10)
    leg_pose('Right', swing=-0.24 - 0.18 * k, knee=0.34 + 0.20 * k, out=0.14)
    head(pitch=0.10 - 0.55 * k, yaw=0.16 + 0.30 * k, roll=0.35 * k)
    key(f)
stamp_grip(); finish(act)

# ----------------------------------------------------------------- DEATH
# The legs go first and the rest follows it down, onto his side, and the
# bar goes with him. He is not gibbed and he is not a ragdoll: a boss goes
# down where he stood and stays there.
act = new_action('death'); N = 62
for f in range(N + 1):
    rest(); t = f / N
    a = ease(min(1.0, t / 0.20))                       # rocked, on the back foot
    b2 = ease(max(0.0, min(1.0, (t - 0.16) / 0.42)))   # the knees give
    c = ease(max(0.0, (t - 0.50) / 0.50))              # and he goes over
    # THE WHOLE BODY GOES OVER, not just down. The first version dropped the
    # hips and folded the knees and he collapsed into a heap on the spot,
    # like a puppet with the strings cut straight down. The root turns too:
    # a body that has been hit falls AWAY from the blow, so he goes over
    # backwards and onto one shoulder, and the legs follow him.
    setrot('Hips', (AX, -1.45 * c - 0.25 * b2), (AY, 0.55 * c), (AZ, 0.30 * c))
    torso(lean=0.16 - 0.55 * a + 0.50 * b2 + 0.30 * c, twist=-0.30 + 0.30 * a - 0.35 * c,
          roll=0.03 + 0.22 * a + 0.30 * c, drop=0.62 * b2 + 0.30 * c)
    arm_pose('Right', fwd=-0.62 - 0.65 * a + 0.90 * b2 + 0.35 * c, up=0.34 - 0.60 * a - 0.20 * b2,
             elbow=-1.05 + 0.85 * b2 + 0.20 * c, out=0.30 * c)
    arm_pose('Left', fwd=0.50 - 0.85 * a + 0.35 * b2, up=0.12 - 0.35 * a,
             elbow=-0.85 + 0.65 * b2, out=0.45 * c)
    leg_pose('Left', swing=0.26 + 0.20 * a + 0.75 * b2 + 0.35 * c, knee=0.30 + 1.30 * b2 - 0.35 * c,
             foot=-0.10 + 0.30 * b2, out=0.10 + 0.30 * c)
    leg_pose('Right', swing=-0.24 + 0.10 * a + 0.95 * b2 + 0.30 * c, knee=0.34 + 1.05 * b2 - 0.25 * c,
             foot=0.06 + 0.25 * b2, out=0.14 + 0.42 * c)
    head(pitch=0.10 - 0.70 * a + 0.55 * b2 + 0.35 * c, yaw=0.16 + 0.30 * a, roll=0.35 * a + 0.40 * c)
    key(f)
stamp_grip(); finish(act)

# ------------------------------------------------- the source clips, renamed
RENAME = {'Standing Idle': 'idleSrc', 'Standing Run Forward': 'run',
          'Standing Melee Attack Downward': 'attackDown',
          'Standing Melee Attack Horizontal': 'attackSide'}
for old, new in RENAME.items():
    a = bpy.data.actions.get(old)
    if a: a.name = new; a.use_fake_user = True
# the fingers are keyed on every frame of the source clips for joints that
# never read at this range — the same cut the mutant's build makes
for nm in ('idleSrc', 'run', 'attackDown', 'attackSide'):
    a = bpy.data.actions.get(nm)
    if not a: continue
    n0 = len(fcurves(a))
    for fc in list(fcurves(a)):
        if any(k in fc.data_path for k in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')) or fc.data_path.endswith('scale'):
            try: fc.id_data.fcurves.remove(fc)
            except Exception:
                for lay in getattr(a, 'layers', []):
                    for st in getattr(lay, 'strips', []):
                        for cb in getattr(st, 'channelbags', []):
                            if fc in list(cb.fcurves): cb.fcurves.remove(fc)
    log('  stripped %-12s %d -> %d curves' % (nm, n0, len(fcurves(a))))

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
        score = pos[i].y * 0.6 + v * 40 - pos[i].z * 0.15
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

# ------------------------------------------------------- look at the poses
# Authoring a rig you cannot see is guessing. Three frames of every clip,
# from in front and a little to the side, written where they can be opened.
if os.environ.get('BW_RENDER'):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    try: sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'SINGLE'
    except Exception: pass
    sc.render.resolution_x = 300; sc.render.resolution_y = 420; sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    cam_d = bpy.data.cameras.new('c'); cam_d.lens = 52
    cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    # he faces -Y, so the camera stands out at -Y and a little to his left
    cam.location = (2.0, -5.2, 1.7)
    cam.rotation_euler = (math.radians(84), 0, math.radians(20))
    for nm in ('calm', 'ready', 'walk', 'taunt', 'attackHold', 'attackLunge', 'hit', 'death',
               'attackDown', 'attackSide', 'run'):
        a = bpy.data.actions.get(nm)
        if not a: continue
        arm.animation_data.action = a
        try: arm.animation_data.action_slot = a.slots[0]
        except Exception: pass
        f0, f1 = int(a.frame_range[0]), int(a.frame_range[1])
        for i, fr in enumerate((0.15, 0.5, 0.85)):
            sc.frame_set(int(f0 + (f1 - f0) * fr))
            sc.render.filepath = os.path.join(SP, 'pose_%s_%d.png' % (nm, i))
            bpy.ops.render.render(write_still=True)
        log('  rendered', nm)
    arm.animation_data.action = None

# ------------------------------------------------------------------ export
for a in bpy.data.actions: a.use_fake_user = True
log('actions out:', sorted(a.name for a in bpy.data.actions))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=False, export_yup=True,
                          export_materials='EXPORT', export_image_format='AUTO',
                          export_animations=True, export_animation_mode='ACTIONS',
                          export_frame_range=False, export_force_sampling=False,
                          export_optimize_animation_size=True, export_skins=True)
log('DONE', os.path.getsize(OUT), 'bytes')
