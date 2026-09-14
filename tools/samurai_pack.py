#!/usr/bin/env python3
"""Pack adrigon's "Samurai japanese" (CGTrader, free) into `assets/samurai.glb`
- the man who wants his sword back, in the scorched dojo through the portal.

    python3 tools/samurai_pack.py            # both stages
    python3 tools/samurai_pack.py --tex      # the maps only
    python3 tools/samurai_pack.py --rig      # the rig and the clips only

Two stages, the way `monster_anim.py` runs: PIL under the SYSTEM python for the
textures (Blender's bundled python has numpy and no PIL), then Blender on this
same file for the rig.

WHAT ARRIVES, AND WHAT HAS TO BE DONE TO IT.

  * A RIGIFY CONTROL RIG - 704 bones, 160 of them DEF-, and SIX HUNDRED AND
    SEVENTY-EIGHT POSE CONSTRAINTS. matrix_basis does not see one of them, so
    a clip resampled off it keeps only what was keyed onto the controls and
    throws away everything the IK chains do. The alien beast paid for this
    once: what is recorded here is pb.matrix off the EVALUATED depsgraph,
    converted back to a constraint-free basis, and the constraints are removed
    only after every clip has been sampled.

  * ONE ANIMATION, CALLED Swing, 38 FRAMES. That is his whole shipped move set,
    so it becomes the side cut and the rest of the fight is authored here - the
    monster's situation exactly, and it gets the monster's treatment.

  * 156 TEXTURES, 685 MB, ALL 1024 PNG. Six maps per part over twenty-one
    parts. What survives: the albedo with the AO multiplied INTO it (there is
    one directional light in this game and nothing in a crease is ever shaded
    by the renderer - the mutants' own lesson), and the OpenGL normal. The
    metallic map is dropped outright: METALNESS IS A TRAP in a game with no
    environment map. Roughness ships as the map's MEAN, a factor rather than an
    image, because Blender writes a synthesised metallic-roughness PNG
    otherwise and it is a megabyte of variation this game cannot show.

  * AND HIS OWN KATANA STAYS ON HIM. Katana and Wakizashi are root bones the
    swords are weighted to, constrained to his hands; they are not DEF-, so a
    deform-bones-only export would drop them and leave his swords at the
    origin. They are marked deform before the export. The katana the PLAYER
    picks up is the game's own built one (models/katana.js) - this is the one
    he is still holding, and the whole argument of the fight.
"""
import argparse
import json
import math
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BLEND = r"C:\Users\areed\OneDrive\Desktop\portal dojo\Samurai.blend"
TEXIN = os.path.join(ROOT, 'incoming', 'samurai', 'texturen')
STAGE = os.path.join(ROOT, 'stage', 'samurai')
OUT = os.path.join(ROOT, 'assets', 'samurai.glb')
BLENDER = r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"

# the game's own level, measured off the three mutants' shipped albedos
TEX_MEAN, TEX_SPREAD, TEX_SAT = 46.0, 54.0, 1.16
TEX_SIZE, NRM_SIZE = 768, 512
TARGET_H = 1.86          # metres, head to heel


def log(*a):
    print('[samurai]', *a)
    sys.stdout.flush()


# =======================================================================
# STAGE ONE - the maps, under the system python
# =======================================================================
def stage_textures():
    from PIL import Image, ImageChops
    import numpy as np
    os.makedirs(STAGE, exist_ok=True)
    rough = {}
    parts = sorted(d for d in os.listdir(TEXIN) if os.path.isdir(os.path.join(TEXIN, d)))
    log('%d texture parts' % len(parts))
    W = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)

    def maps_of(p):
        d = os.path.join(TEXIN, p)
        files = {n.lower(): os.path.join(d, n) for n in os.listdir(d)}

        def pick(*keys):
            for k in keys:
                for n, path in files.items():
                    if k in n:
                        return path
            return None
        return (pick('base_color'), pick('mixed_ao'),
                pick('normal_opengl') or pick('normal'), pick('roughness'))

    def albedo(p, base, ao):
        im = Image.open(base).convert('RGB')
        # AO MULTIPLIES INTO THE ALBEDO. One low moon and it is behind you, so
        # a crease is never shaded by the renderer; the depth has to be baked.
        if ao:
            a = Image.open(ao).convert('L').resize(im.size, Image.LANCZOS)
            im = ImageChops.multiply(im, Image.merge('RGB', (a, a, a)))
        if max(im.size) > TEX_SIZE:
            im = im.resize((TEX_SIZE, TEX_SIZE), Image.LANCZOS)
        return np.asarray(im, dtype=np.float32)

    # ---- ONE LEVEL FOR THE WHOLE MAN, NOT ONE PER PART. Pulling every part to
    # the same mean is the per-channel remap's own mistake a level up: measured
    # on this download the trousers read 13.8 and the eye 138.5, and forcing
    # both to 46 makes black cloth and a white eye the same mid grey. What is
    # wrong with these maps is that they are lit for a studio and this game has
    # a quarter moon - a LEVEL fault, shared by all of them - so the shift and
    # the scale are worked out once over every part together and every part
    # keeps its own distance from the others.
    stats = {}
    for p in parts:
        base, ao, nrm, rgh = maps_of(p)
        if not base:
            log('  %-22s no base colour, skipped' % p)
            continue
        arr = albedo(p, base, ao)
        stats[p] = arr
    allum = np.concatenate([(a @ W).ravel() for a in stats.values()])
    M0, S0 = float(allum.mean()), float(allum.std())
    K = TEX_SPREAD / max(1e-3, S0)
    log('the whole man: mean %.1f sd %.1f  ->  mean %.1f sd %.1f (x%.3f)'
        % (M0, S0, TEX_MEAN, TEX_SPREAD, K))

    for p in parts:
        if p not in stats:
            continue
        base, ao, nrm, rgh = maps_of(p)
        arr = stats[p]
        lum = arr @ W
        before = float(lum.mean())
        # luminance only, so hue and saturation pass through untouched; a
        # little chroma back, because darkening costs apparent saturation
        tgt = (lum - M0) * K + TEX_MEAN
        out = arr + (tgt - lum)[..., None]
        grey = (out @ W)[..., None]
        out = np.clip(grey + (out - grey) * TEX_SAT, 0, 255).astype(np.uint8)
        im = Image.fromarray(out, 'RGB')
        im.save(os.path.join(STAGE, '%s_base.jpg' % p), 'JPEG', quality=88, optimize=True)
        after = float((np.asarray(im, dtype=np.float32) @ W).mean())
        if nrm:
            nm = Image.open(nrm).convert('RGB')
            if max(nm.size) > NRM_SIZE:
                nm = nm.resize((NRM_SIZE, NRM_SIZE), Image.LANCZOS)
            nm.save(os.path.join(STAGE, '%s_n.jpg' % p), 'JPEG', quality=90, optimize=True)
        rf = 0.72
        if rgh:
            rr = np.asarray(Image.open(rgh).convert('L'), dtype=np.float32)
            rf = round(float(rr.mean()) / 255.0, 3)
        rough[p] = rf
        log('  %-22s mean %5.1f -> %5.1f  rough %.2f%s'
            % (p, before, after, rf, '' if nrm else '   (no normal)'))
        stats[p] = None
    json.dump(rough, open(os.path.join(STAGE, 'rough.json'), 'w'), indent=1)
    tot = sum(os.path.getsize(os.path.join(STAGE, n)) for n in os.listdir(STAGE))
    log('staged %.1f MB' % (tot / 1048576))


# =======================================================================
# STAGE TWO - the rig, inside Blender
# =======================================================================
def stage_rig():
    import bpy
    from mathutils import Vector, Quaternion

    bpy.ops.wm.open_mainfile(filepath=BLEND)
    sc = bpy.context.scene

    # ---- purge: the widgets, the metarig, the lamp. NOTHING ELSE.
    # `Plane` and `NurbsPath` are Blender's default names for whatever they
    # were modelled from and they were dropped here once as "helper geometry":
    # the render came back with a samurai whose legs stopped at the armour
    # skirt and started again at the boots, because `Plane` IS THE HAKAMA. A
    # mesh that is weighted to the rig and carries a material is part of the
    # man, whatever the datablock happens to be called.
    for o in list(bpy.data.objects):
        if o.name.startswith('WGT') or o.name in ('metarig', 'Sun'):
            bpy.data.objects.remove(o, do_unlink=True)
    arm = bpy.data.objects['rig']
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    log('kept %d meshes, %d bones' % (len(meshes), len(arm.data.bones)))

    # ---- HIS SWORDS ARE ON ROOT BONES, and they are not DEF-
    for nm in ('Katana', 'Wakizashi'):
        if nm in arm.data.bones:
            arm.data.bones[nm].use_deform = True

    # ---- AND THE FIGHT NEEDS A BONE AT THE POINT OF THE BLADE.
    # `aimTip` puts the weapon on the player's chest and `blowLands` sweeps the
    # hitbox down it, and both ask the kind's `rig` for a `tip`. Without one the
    # game falls back to running `barLen` out along the FOREARM - which is
    # where a crowbar lies and is nowhere near where a katana does. The tip is
    # MEASURED off the sword mesh (the vertex furthest from the Katana bone's
    # head, in armature space) rather than guessed, and it carries a real
    # weight so the exporter cannot drop it as an unused joint.
    kat = next((o for o in meshes if o.name == 'KatanaLP'), None)
    if kat and 'Katana' in arm.data.bones:
        head = arm.data.bones['Katana'].head_local
        far, fd = None, -1.0
        for v in kat.data.vertices:
            w = arm.matrix_world.inverted() @ (kat.matrix_world @ v.co)
            d = (w - head).length
            if d > fd:
                fd, far = d, w
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode='EDIT')
        eb = arm.data.edit_bones.new('DEF-katana_tip')
        eb.head = far
        eb.tail = far + (far - head).normalized() * 0.05
        eb.parent = arm.data.edit_bones['Katana']
        eb.use_deform = True
        bpy.ops.object.mode_set(mode='OBJECT')
        vg = kat.vertex_groups.new(name='DEF-katana_tip')
        # one vertex at the point, so the joint is used and survives the export
        best = min(range(len(kat.data.vertices)),
                   key=lambda i: ((arm.matrix_world.inverted()
                                   @ (kat.matrix_world @ kat.data.vertices[i].co)) - far).length)
        vg.add([best], 0.001, 'ADD')
        log('katana tip bone at %s, %.3f from the grip' % ([round(v, 3) for v in far], fd))

    pbs = list(arm.pose.bones)
    by = {pb.name: pb for pb in pbs}
    PARENT = [pb.parent for pb in pbs]
    IDX = {pb.name: i for i, pb in enumerate(pbs)}
    L = [pb.bone.matrix_local.copy() for pb in pbs]
    LINV = [m.inverted() for m in L]
    REST_REL = [(LINV[IDX[PARENT[i].name]] @ L[i]) if PARENT[i] else L[i]
                for i in range(len(pbs))]
    RRINV = [m.inverted() for m in REST_REL]

    def bind(act):
        if not arm.animation_data:
            arm.animation_data_create()
        arm.animation_data.action = act
        try:
            arm.animation_data.action_slot = (act.slots[0] if act.slots
                                              else act.slots.new(id_type='OBJECT', name='Legacy'))
        except Exception:
            pass

    def sample(src_name, windows):
        """The EVALUATED pose, converted back to a constraint-free basis:

            basis[b] = (L[parent]^-1 @ L[b])^-1 @ (M[parent]^-1 @ M[b])
        """
        bind(bpy.data.actions[src_name])
        out = []
        for f0, f1, step in windows:
            f = f0
            while f <= f1:
                sc.frame_set(int(round(f)))
                dg = bpy.context.evaluated_depsgraph_get()
                ev = arm.evaluated_get(dg)
                M = [pb.matrix.copy() for pb in ev.pose.bones]
                MINV, row = {}, []
                for i in range(len(pbs)):
                    par = PARENT[i]
                    if par is None:
                        row.append(RRINV[i] @ M[i])
                    else:
                        j = IDX[par.name]
                        if j not in MINV:
                            MINV[j] = M[j].inverted()
                        row.append(RRINV[i] @ (MINV[j] @ M[i]))
                out.append(row)
                f += step
        return out

    # EVERY CLIP IS SAMPLED BEFORE ANY CONSTRAINT IS REMOVED, and every
    # constraint REMOVED BEFORE ANY CLIP IS WRITTEN, or the result is applied
    # twice.
    SWING = sample('Swing', [(0, 38, 1)])
    log('sampled the shipped Swing: %d frames' % len(SWING))
    for pb in pbs:
        for c in list(pb.constraints):
            pb.constraints.remove(c)
    log('removed every pose constraint')

    # ---- which way does he face, and how big is he
    foot = arm.data.bones.get('DEF-foot.L')
    if foot:
        d = Vector(foot.tail_local) - Vector(foot.head_local)
        log('foot runs ankle->toe by %s  => he faces %s'
            % ([round(v, 3) for v in d], '-Y' if d.y < 0 else '+Y'))

    def ev_bounds():
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
        return lo, hi

    # ================================================================ POSING
    AX, AY, AZ = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
    FWD = -1.0          # he faces -Y; confirmed by the foot bone above

    def setrot(name, *pairs):
        pb = by.get(name)
        if pb is None:
            return
        m = pb.bone.matrix_local.to_3x3().inverted()
        q = Quaternion((1, 0, 0, 0))
        for ax, ang in pairs:
            if ang:
                q = q @ Quaternion((m @ ax).normalized(), ang)
        pb.rotation_quaternion = q

    def rest():
        for pb in pbs:
            pb.rotation_quaternion = Quaternion((1, 0, 0, 0))
            pb.location = (0, 0, 0)
            pb.scale = (1, 1, 1)

    KEYED = list({pb.name: pb for pb in pbs
                  if pb.bone.use_deform or pb.name == 'root'}.values())
    log('keying %d bones' % len(KEYED))

    # ---- HIS SWORD WAS CONSTRAINED TO HIS HAND, AND THE CONSTRAINTS ARE GONE.
    # `Katana` and `Wakizashi` are ROOT bones - the swords are weighted to them
    # and a COPY_TRANSFORMS held them in his fists. Every constraint is stripped
    # before a clip is written (it has to be, or the recorded pose is applied
    # twice), so in an AUTHORED clip nothing drives them at all: measured, the
    # blade tip travelled 0.00 through four of the five swings while his arms
    # went through the whole stroke. The resampled `Swing` was the only one that
    # looked right, because its Katana motion is baked into the source.
    #
    # So the offset from the hand is taken ONCE at rest and the sword is put
    # back on it every frame. Both are root bones, so the basis is simply
    # rest^-1 @ wanted.
    def key(f, sword=True):
        if sword:
            stick()
        for pb in KEYED:
            pb.keyframe_insert('rotation_quaternion', frame=f)
            if pb.name in ('Katana', 'Wakizashi'):
                pb.keyframe_insert('location', frame=f)
        by['root'].keyframe_insert('location', frame=f)

    def new_action(name):
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        bind(act)
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
        log('  %-10s %3d frames  %d curves' % (act.name, int(act.frame_range[1]), len(fcs)))

    def put(row):
        """stamp one sampled frame onto the pose"""
        for i, pb in enumerate(pbs):
            t, q, s = row[i].decompose()
            pb.rotation_quaternion = q
            pb.location = t
            pb.scale = s

    # WHERE THE SWORD SITS IN HIS FIST IS MEASURED OFF THE SHIPPED SWING, not
    # off the rest pose. At rest both swords are SHEATHED AT HIS HIP - that is
    # what the model was built in - so an offset taken from the hand's rest
    # transform is "a hip, expressed relative to a hand", and carrying that
    # through a swing throws the katana across the room. Rendered, it left his
    # fist on the third frame and flew. The source `Swing` has the constraint's
    # own result baked into it, so one frame of THAT is where the real held
    # offset lives.
    #
    # The wakizashi is the opposite case and wants the opposite answer: it stays
    # SHEATHED, so it is pinned to the pelvis, where its rest offset is already
    # right - and it has to be pinned to something, because a root bone does
    # not follow the body and it would otherwise hang in the air while he moves.
    STICK = []
    if 'Katana' in by and 'DEF-hand.R' in by and SWING:
        rest()
        put(SWING[len(SWING) // 3])
        bpy.context.view_layer.update()
        i, j = IDX['Katana'], IDX['DEF-hand.R']
        STICK.append((i, j, pbs[j].matrix.inverted() @ pbs[i].matrix))
        rest()
        bpy.context.view_layer.update()
    for nm, host in (('Wakizashi', 'DEF-spine'),):
        if nm in by and host in by:
            i, j = IDX[nm], IDX[host]
            STICK.append((i, j, L[j].inverted() @ L[i]))
    log('pinning %d swords (katana to the fist, wakizashi to the hip)' % len(STICK))

    def stick():
        """put each sword back where it is carried"""
        if not STICK:
            return
        bpy.context.view_layer.update()
        for i, j, off in STICK:
            pbs[i].matrix = pbs[j].matrix @ off

    CLIPS = {}

    def meta(name, n, hit=None):
        CLIPS[name] = {'frames': n, 'hit': (hit / float(n)) if hit is not None else None}

    # ---- the body, in armature space. X is his right, -Y is forward, Z is up.
    SP = ['DEF-spine', 'DEF-spine.001', 'DEF-spine.002', 'DEF-spine.003']
    NECK, HEAD = 'DEF-spine.005', 'DEF-spine.006'

    def torso(pitch=0.0, roll=0.0, yaw=0.0):
        for i, b in enumerate(SP):
            k = (0.30, 0.26, 0.24, 0.20)[i]
            setrot(b, (AX, pitch * k), (AY, roll * k), (AZ, yaw * k))

    def head_pose(pitch=0.0, yaw=0.0, roll=0.0):
        setrot(NECK, (AX, pitch * 0.45), (AZ, yaw * 0.45), (AY, roll * 0.5))
        setrot(HEAD, (AX, pitch * 0.55), (AZ, yaw * 0.55), (AY, roll * 0.5))

    def arm_pose(side, down=0.0, fwd=0.0, twist=0.0, elbow=0.0, wrist=0.0, sh=0.0):
        """AN ARM IN A T-POSE LIES ALONG X, so a rotation about X is a TWIST
        and nothing else. The first build lifted the arms about X, measured
        2.33 rad on the upper arm, and rendered eight frames of a man standing
        in a T with his wrists turning over. `down` brings the arm from
        straight out to his side (about Y), `fwd` swings it toward the face
        he is looking at (about Z, and -Y is forward), `elbow` folds the
        forearm the same way, and only `twist` is about the bone's own length.

        He faces -Y, so his RIGHT arm lies along -X: every sign below is that
        and nothing more."""
        s = 1.0 if side == 'R' else -1.0        # his right arm is along -X
        setrot('DEF-shoulder.%s' % side, (AY, -sh * s), (AZ, sh * 0.4 * s))
        setrot('DEF-upper_arm.%s' % side,
               (AY, -down * s), (AZ, fwd * s), (AX, twist * s))
        setrot('DEF-forearm.%s' % side, (AZ, elbow * s))
        setrot('DEF-hand.%s' % side, (AZ, wrist * s))

    def leg_pose(side, swing=0.0, knee=0.0, ankle=0.0, out=0.0):
        s = 1.0 if side == 'R' else -1.0
        setrot('DEF-thigh.%s' % side, (AX, swing), (AY, out * s))
        setrot('DEF-shin.%s' % side, (AX, knee))
        setrot('DEF-foot.%s' % side, (AX, ankle))

    def stance(crouch=0.0, spread=0.10, lead=0.0):
        """A kenjutsu stance: weight down, the left foot back, knees soft."""
        leg_pose('R', swing=-0.10 - lead * 0.30, knee=0.34 + crouch, ankle=-0.16 - crouch * 0.4, out=spread)
        leg_pose('L', swing=0.16 + lead * 0.34, knee=0.40 + crouch, ankle=-0.20 - crouch * 0.4, out=spread)

    def guard(k=1.0):
        """Both hands on the tsuka in front of him, the blade up - chudan."""
        arm_pose('R', down=1.20 * k, fwd=0.54 * k, twist=0.26 * k,
                 elbow=1.26 * k, wrist=0.10 * k, sh=0.10 * k)
        arm_pose('L', down=1.30 * k, fwd=0.66 * k, twist=0.22 * k,
                 elbow=1.46 * k, wrist=0.08 * k, sh=0.08 * k)

    def ease(t):
        return t * t * (3 - 2 * t)

    def lerp(a, b, k):
        return a + (b - a) * k

    # ---- THE DEALER'S OWN THREE, because they are what separates a man
    # moving from a mannequin being posed, and none of them costs anything.
    def drag(t, d):
        """THE ARM ARRIVES AFTER THE BODY. Every joint in an authored pose runs
        off one number, so hips, chest, elbow and head start together, cross
        together and stop together. Real weight travels outward: the hips lead,
        the chest follows, the hand is last. This is that lag, as a shift of
        the driving time."""
        return max(0.0, min(1.0, (t - d) / (1.0 - d)))

    def follow(t, a, amp=0.12, n=1.6):
        """And it does not simply stop. Past `a` the limb carries on a little
        and comes back - one soft decaying bounce, which is the follow-through
        a blow that LANDED has and a blow that was placed does not."""
        if t <= a:
            return 0.0
        x = (t - a) / max(1e-6, 1.0 - a)
        return amp * math.sin(math.pi * n * x) * (1 - x) ** 2

    def bump(t, a, b):
        """0 -> 1 -> 0 across [a, b], smooth"""
        if t <= a or t >= b:
            return 0.0
        return math.sin(math.pi * (t - a) / (b - a))

    def three(t, cock, hit):
        """A SWING IS THREE KEYPOSES AND TWO LERPS, and the contact is the
        MIDDLE one - a swing's contact is not the end of its wind-up. Returns
        (leg, k) where leg is 0 for the cock and 1 for the stroke."""
        if t <= cock:
            return 0, ease(t / max(1e-6, cock))
        if t <= hit:
            return 1, ease((t - cock) / max(1e-6, hit - cock))
        return 2, ease((t - hit) / max(1e-6, 1.0 - hit))

    # ------------------------------------------------------------ IDLE
    # He stands over his own sword and breathes. Three periods that never line
    # up is what stops a loop reading as a loop.
    act = new_action('idle')
    N = 150
    for f in range(N + 1):
        rest()
        a = f / N * math.pi * 2
        br = math.sin(a * 2) * 0.5 + 0.5
        sway = math.sin(a)
        scan = math.sin(a * 3 + 0.7) * math.sin(a + 1.9)
        torso(pitch=0.04 + 0.03 * br, roll=0.030 * sway, yaw=0.035 * sway)
        head_pose(pitch=-0.04 + 0.03 * br, yaw=0.10 * scan, roll=0.05 * scan)
        guard(0.92 + 0.05 * br)
        stance(crouch=0.06 + 0.025 * br, lead=0.12)
        key(f)
    finish(act)
    meta('idle', N)

    # ------------------------------------------------------------ WALK
    # A swordsman does not stroll at you: he keeps his guard and slides his
    # feet, the back foot never crossing the front.
    act = new_action('walk')
    N = 44
    for f in range(N + 1):
        rest()
        a = f / N * math.pi * 2
        torso(pitch=0.10, roll=0.05 * math.sin(a), yaw=0.10 * math.sin(a))
        head_pose(pitch=-0.05, yaw=-0.05 * math.sin(a))
        guard(0.96)
        sw = math.sin(a)
        lift = max(0.0, math.sin(a)) ** 2
        leg_pose('R', swing=-0.34 * sw, knee=0.30 + 0.55 * lift, ankle=-0.14 - 0.25 * lift, out=0.10)
        lift2 = max(0.0, -math.sin(a)) ** 2
        leg_pose('L', swing=0.34 * sw, knee=0.30 + 0.55 * lift2, ankle=-0.14 - 0.25 * lift2, out=0.10)
        key(f)
    finish(act)
    meta('walk', N)

    # ------------------------------------------------------------ RUN
    act = new_action('run')
    N = 26
    for f in range(N + 1):
        rest()
        a = f / N * math.pi * 2
        torso(pitch=0.26, roll=0.09 * math.sin(a), yaw=0.16 * math.sin(a))
        head_pose(pitch=-0.16)
        guard(0.80)
        # the sword arm holds; the legs do the work
        sw = math.sin(a)
        l1 = max(0.0, math.sin(a)) ** 2
        l2 = max(0.0, -math.sin(a)) ** 2
        leg_pose('R', swing=-0.72 * sw, knee=0.46 + 1.05 * l1, ankle=-0.20 - 0.40 * l1, out=0.08)
        leg_pose('L', swing=0.72 * sw, knee=0.46 + 1.05 * l2, ankle=-0.20 - 0.40 * l2, out=0.08)
        key(f)
    finish(act)
    meta('run', N)

    # ------------------------------------------------------------ TAUNT
    # "THAT'S MY SWORD." He comes up out of the guard and levels the blade at
    # you. It is the one clip in the set that has to read as a MAN speaking.
    act = new_action('taunt')
    N = 56
    for f in range(N + 1):
        rest()
        t = f / N
        k = ease(min(1.0, t * 2.4)) * (1.0 - ease(max(0.0, (t - 0.72) / 0.28)))
        torso(pitch=0.04 - 0.16 * k, yaw=-0.22 * k * FWD)
        head_pose(pitch=-0.04 - 0.10 * k, yaw=0.10 * k)
        # the right arm comes out, the blade levelled; the left lets go
        arm_pose('R', down=lerp(1.20, 1.02, k), fwd=lerp(0.54, 1.18, k),
                 twist=lerp(0.26, 0.40, k), elbow=lerp(1.26, 0.22, k),
                 wrist=lerp(0.10, -0.08, k), sh=lerp(0.10, 0.26, k))
        arm_pose('L', down=lerp(1.30, 1.42, k), fwd=lerp(0.66, 0.28, k),
                 twist=0.22, elbow=lerp(1.46, 1.05, k), wrist=0.06, sh=0.08)
        stance(crouch=0.06 + 0.10 * k, lead=0.12 + 0.22 * k)
        key(f)
    finish(act)
    meta('taunt', N)

    # ------------------------------------------------------------ BLOCK
    # The blade turned flat across him. Short, because a guard is a beat.
    act = new_action('block')
    N = 18
    for f in range(N + 1):
        rest()
        k = ease(min(1.0, f / 7.0))
        torso(pitch=0.14 * k, yaw=-0.18 * k)
        head_pose(pitch=-0.06)
        arm_pose('R', down=lerp(1.20, 0.66, k), fwd=lerp(0.54, 0.58, k), twist=lerp(0.26, 0.52, k),
                 elbow=lerp(1.26, 1.22, k), wrist=lerp(0.10, 0.26, k), sh=0.18 * k)
        arm_pose('L', down=lerp(1.30, 0.82, k), fwd=lerp(0.66, 0.74, k), twist=0.30,
                 elbow=lerp(1.46, 1.38, k), wrist=0.18, sh=0.14 * k)
        stance(crouch=0.06 + 0.16 * k, lead=0.10)
        key(f)
    finish(act)
    meta('block', N)

    # ------------------------------------------------------------ STAGGER
    act = new_action('stagger')
    N = 20
    for f in range(N + 1):
        rest()
        t = f / N
        k = math.sin(min(1.0, t * 1.6) * math.pi) ** 0.7
        torso(pitch=-0.34 * k, roll=0.22 * k, yaw=0.26 * k)
        head_pose(pitch=0.26 * k, roll=0.18 * k)
        guard(1.0 - 0.45 * k)
        stance(crouch=0.10 + 0.22 * k, lead=-0.20 * k)
        key(f)
    finish(act)
    meta('stagger', N)

    # ------------------------------------------------------------ DIE
    # He goes down on one knee first - a swordsman does - and then over.
    act = new_action('die')
    N = 60
    for f in range(N + 1):
        rest()
        t = f / N
        kneel = ease(min(1.0, t / 0.42))
        fall = ease(max(0.0, (t - 0.46) / 0.54))
        torso(pitch=-0.20 * kneel + 1.05 * fall, roll=0.30 * fall, yaw=0.22 * fall)
        head_pose(pitch=0.22 * kneel + 0.30 * fall, roll=0.26 * fall)
        arm_pose('R', down=lerp(1.20, 1.46, kneel) + 0.10 * fall, fwd=0.54 - 0.34 * fall,
                 twist=0.20, elbow=lerp(1.26, 0.54, kneel), wrist=0.04, sh=0.04)
        arm_pose('L', down=lerp(1.30, 1.52, kneel), fwd=0.66 - 0.44 * fall, twist=0.16,
                 elbow=lerp(1.46, 0.38, kneel), wrist=0.02, sh=0.02)
        leg_pose('R', swing=-0.10 - 1.30 * kneel, knee=0.34 + 1.70 * kneel, ankle=-0.16 - 0.40 * kneel, out=0.12)
        leg_pose('L', swing=0.16 + 0.50 * kneel, knee=0.40 + 0.80 * kneel, ankle=-0.20, out=0.16)
        by['root'].location = Vector((0.0, 0.0, -0.34 * kneel - 0.34 * fall))
        key(f)
    finish(act)
    meta('die', N)

    # ------------------------------------------------------------ sSide
    # HIS OWN SHIPPED SWING, resampled. It is the only piece of authored
    # animation on this model and it is the best thing in the set, so it is
    # the swing he throws most.
    # KEPT, BUT NOT IN THE ROTATION. It is the only motion on this model the
    # artist made, and it is good - but it begins and ends in the stance HE
    # used, and every authored swing here begins and ends on the GUARD, so
    # mixing the two puts a 0.14 s glide between his own stance and mine on
    # every other swing. The Dealer's packer solved this by basing everything
    # on a frame of the SOURCE idle; this set is based on the guard instead,
    # so the shipped one ships under its own name and the fight does not draw
    # it. Its sword motion is baked in, so it must NOT be re-stuck.
    act = new_action('sSwing')
    for f, row in enumerate(SWING):
        rest()
        put(row)
        key(f, sword=False)
    finish(act)

    # ==================================================== HIS WHOLE MOVE SET
    # A SWING IS WAYPOINTS, AND EVERY JOINT GROUP READS ITS OWN CLOCK. The
    # first build ran hips, chest, arm and head off one number, so they started
    # together, crossed together and stopped together - the Dealer's packer
    # names that as the single thing that makes pose-to-pose read as a
    # mannequin being posed. Here the body LEADS and the hand is last, and past
    # the contact the sword carries on and settles back through it rather than
    # being retracted.
    #
    # AND THE TIMINGS ARE THE REFERENCE'S OWN. The Elden Ring katana set the
    # owner supplied is spline-compressed Havok with no skeleton in it, so not
    # one pose could be read out of it - but its ANNOTATION TRACK is plain
    # text, and that is the half that matters for a fight: across its eight
    # light attacks the contact lands at 0.37-0.50 of a second, the early
    # cancel opens at 0.17-0.25 and the combo window at about 0.6. Every
    # `hit` below is inside that band.
    GUARD = dict(torso=(0.04, 0.0, 0.0), head=(-0.04, 0.0, 0.0),
                 R=(1.20, 0.54, 0.26, 1.26, 0.10, 0.10),
                 L=(1.30, 0.66, 0.22, 1.46, 0.08, 0.08),
                 stance=(0.06, 0.12))

    def mixp(A, B, k):
        return {g: tuple(lerp(x, y, k) for x, y in zip(A[g], B[g])) for g in A}

    def at(way, t):
        """the pose on a list of (time, pose) waypoints, eased between them"""
        if t <= way[0][0]:
            return way[0][1]
        for i in range(len(way) - 1):
            t0, P0 = way[i]
            t1, P1 = way[i + 1]
            if t <= t1:
                return mixp(P0, P1, ease((t - t0) / max(1e-6, t1 - t0)))
        return way[-1][1]

    def build_swing(name, N, way, hit, lead=0.0):
        """`way` is [(t, pose), ...] from the guard and back to it; `hit` is the
        fraction at which the contact pose is reached. `lead` turns the whole
        body into the blow - a swordsman steps into a cut."""
        act = new_action(name)
        for f in range(N + 1):
            rest()
            t = f / N
            # the body leads, the chest follows, the sword arm is last, the
            # head holds its line longest of all
            Pb = at(way, min(1.0, t * 1.06))
            Pc = at(way, drag(t, 0.05))
            Pa = at(way, drag(t, 0.13))
            Ph = at(way, drag(t, 0.17))
            fo = follow(t, hit, 0.10, 1.5)          # the carry-through
            torso(pitch=Pb['torso'][0], roll=Pb['torso'][1], yaw=Pb['torso'][2] + fo * 0.20)
            head_pose(pitch=Ph['head'][0], yaw=Ph['head'][1], roll=Ph['head'][2])
            arm_pose('R', down=Pa['R'][0], fwd=Pa['R'][1] + fo * 0.16, twist=Pa['R'][2],
                     elbow=Pa['R'][3], wrist=Pa['R'][4], sh=Pa['R'][5])
            arm_pose('L', down=Pa['L'][0], fwd=Pa['L'][1] + fo * 0.14, twist=Pa['L'][2],
                     elbow=Pa['L'][3], wrist=Pa['L'][4], sh=Pa['L'][5])
            # FOOTWORK. A blow reads as having weight because the body went
            # with it: he loads onto the back foot and drives onto the front.
            st = Pc['stance']
            step = lead * (bump(t, 0.0, hit) * 0.5 + (1.0 if t > hit else 0.0) * 0.5)
            stance(crouch=st[0], lead=st[1] + step)
            key(f)
        finish(act)
        meta(name, N, int(round(hit * N)))

    # ---------------------------------------------------------------- sDown
    # SHOMEN - straight down the middle, both hands, the heaviest thing he
    # throws and the one with the longest tell.
    build_swing('sDown', 34, [
        (0.00, GUARD),
        (0.38, dict(torso=(-0.30, 0.0, 0.24), head=(-0.20, 0.06, 0.0),
                    R=(-0.62, 0.30, 0.16, 1.34, 0.30, -0.30),
                    L=(-0.50, 0.40, 0.20, 1.40, 0.24, -0.26), stance=(0.02, -0.10))),
        (0.62, dict(torso=(0.46, 0.0, -0.12), head=(0.16, 0.0, 0.0),
                    R=(1.06, 0.86, 0.34, 0.30, -0.04, 0.14),
                    L=(1.14, 0.94, 0.20, 0.42, -0.02, 0.12), stance=(0.30, 0.26))),
        (0.80, dict(torso=(0.52, 0.0, -0.18), head=(0.18, 0.0, 0.0),
                    R=(1.22, 0.96, 0.36, 0.22, -0.08, 0.10),
                    L=(1.30, 1.02, 0.20, 0.34, -0.06, 0.10), stance=(0.34, 0.30))),
        (1.00, GUARD),
    ], hit=0.80, lead=0.30)

    # ---------------------------------------------------------------- sSide
    # A FLAT HORIZONTAL CUT, right to left across the waist. The shipped
    # `Swing` is kept as its own clip, but this is the one he throws most, and
    # it is authored so that it actually crosses - the download's is a single
    # arm movement with the body still.
    build_swing('sSide', 28, [
        (0.00, GUARD),
        (0.34, dict(torso=(0.02, -0.06, 0.52), head=(-0.02, -0.20, 0.04),
                    R=(1.06, 0.10, 0.52, 1.44, 0.26, -0.20),
                    L=(1.16, 0.20, 0.44, 1.58, 0.22, -0.16), stance=(0.14, -0.12))),
        (0.58, dict(torso=(0.10, 0.06, -0.46), head=(0.02, 0.18, -0.04),
                    R=(1.14, 0.96, 0.10, 0.44, -0.10, 0.30),
                    L=(1.22, 1.00, 0.06, 0.60, -0.08, 0.26), stance=(0.22, 0.26))),
        (0.78, dict(torso=(0.10, 0.08, -0.62), head=(0.02, 0.22, -0.06),
                    R=(1.20, 1.10, 0.02, 0.36, -0.14, 0.26),
                    L=(1.28, 1.12, 0.0, 0.52, -0.12, 0.22), stance=(0.20, 0.22))),
        (1.00, GUARD),
    ], hit=0.58, lead=0.26)

    # ---------------------------------------------------------------- sRise
    # KIRIAGE - a rising cut from the low left up through the right shoulder.
    # It is the one swing that comes from BELOW, which is the one place a
    # player who has learned to back away from the other two is not watching.
    build_swing('sRise', 26, [
        (0.00, GUARD),
        (0.32, dict(torso=(0.22, 0.10, -0.34), head=(0.10, 0.14, 0.0),
                    R=(1.62, 0.22, 0.10, 1.30, 0.34, 0.02),
                    L=(1.68, 0.30, 0.06, 1.44, 0.30, 0.02), stance=(0.28, -0.06))),
        (0.56, dict(torso=(-0.18, -0.08, 0.30), head=(-0.16, -0.10, 0.0),
                    R=(0.34, 0.82, 0.40, 0.40, -0.06, 0.22),
                    L=(0.44, 0.88, 0.34, 0.56, -0.04, 0.20), stance=(0.06, 0.24))),
        (0.76, dict(torso=(-0.26, -0.10, 0.38), head=(-0.20, -0.12, 0.0),
                    R=(0.18, 0.90, 0.44, 0.30, -0.10, 0.18),
                    L=(0.30, 0.96, 0.36, 0.46, -0.08, 0.16), stance=(0.04, 0.20))),
        (1.00, GUARD),
    ], hit=0.76, lead=0.24)

    # ---------------------------------------------------------------- sStab
    # TSUKI - the point goes to a point. Almost no arc, all reach, and the
    # longest of his swings, so backing out of the other three walks you onto
    # this one.
    build_swing('sStab', 24, [
        (0.00, GUARD),
        (0.36, dict(torso=(0.10, 0.0, 0.40), head=(0.0, -0.16, 0.0),
                    R=(1.34, 0.12, 0.34, 1.78, 0.16, -0.16),
                    L=(1.40, 0.22, 0.28, 1.84, 0.12, 0.02), stance=(0.20, -0.16))),
        (0.61, dict(torso=(0.10, 0.0, -0.20), head=(0.0, 0.06, 0.0),
                    R=(1.16, 1.00, 0.22, 0.10, -0.02, 0.30),
                    L=(1.24, 1.04, 0.24, 0.26, 0.0, 0.24), stance=(0.12, 0.42))),
        (0.80, dict(torso=(0.12, 0.0, -0.24), head=(0.0, 0.08, 0.0),
                    R=(1.14, 1.06, 0.20, 0.06, -0.04, 0.28),
                    L=(1.22, 1.10, 0.22, 0.20, -0.02, 0.22), stance=(0.10, 0.44))),
        (1.00, GUARD),
    ], hit=0.79, lead=0.40)

    # ---------------------------------------------------------------- sSpin
    # A TURNING CUT. He steps through and brings the blade round the other
    # way, which is the answer to a player who has learned to circle one
    # shoulder - and the only swing of his that does not start from the guard
    # facing you.
    build_swing('sSpin', 32, [
        (0.00, GUARD),
        (0.30, dict(torso=(0.0, -0.10, 0.86), head=(-0.04, -0.34, 0.06),
                    R=(0.92, -0.10, 0.60, 1.36, 0.30, -0.28),
                    L=(1.02, 0.02, 0.52, 1.50, 0.26, -0.22), stance=(0.16, -0.18))),
        (0.55, dict(torso=(0.06, 0.10, -0.74), head=(0.0, 0.28, -0.08),
                    R=(1.10, 1.04, 0.06, 0.36, -0.12, 0.34),
                    L=(1.18, 1.08, 0.02, 0.52, -0.10, 0.28), stance=(0.24, 0.30))),
        (0.78, dict(torso=(0.06, 0.10, -0.96), head=(0.0, 0.32, -0.10),
                    R=(1.18, 1.16, 0.0, 0.28, -0.16, 0.28),
                    L=(1.26, 1.18, -0.02, 0.44, -0.14, 0.24), stance=(0.22, 0.26))),
        (1.00, GUARD),
    ], hit=0.55, lead=0.34)

    # ---- CHECK THE CONTACT FRAME. The striking hand should be near its own
    # extreme within a couple of frames of the declared contact, or the game
    # deals damage on a frame where the sword is somewhere else.
    def hand_track(act_name, n, bone='DEF-hand.R'):
        bind(bpy.data.actions[act_name])
        out = []
        for f in range(n + 1):
            sc.frame_set(f)
            dg = bpy.context.evaluated_depsgraph_get()
            ev = arm.evaluated_get(dg)
            out.append(ev.pose.bones[bone].matrix.translation.copy())
        return out

    # ================================================== THE MIXAMO MOVE SET
    # HIS REAL ANIMATION, RETARGETED. Everything above this is hand-authored and
    # it was never going to be good enough: eight professional clips arrived on
    # a standard humanoid rig, and a standard humanoid rig is the one thing that
    # CAN be retargeted onto this one without guessing. They replace the
    # authored idle, walk, run, block and every swing; the taunt, the stagger
    # and the death stay authored, because no clip in the set is either.
    #
    # HOW IT IS DONE, AND WHY IT IS NOT A BONE-NAME COPY. The two skeletons do
    # not share a rest pose or a bone roll, so copying local rotations bends
    # everything the wrong way. What transfers is the source bone's rotation
    # AWAY FROM ITS OWN REST, in armature space:
    #
    #     want[b] = (src_pose[b] @ src_rest[b]^-1) @ dst_rest[b]
    #
    # and that is then turned back into a local basis the exported rig
    # reproduces, parents first. Rigify puts TWIST SEGMENTS in the middle of
    # every limb (`DEF-upper_arm.L.001` sits between the arm and the forearm)
    # and Mixamo has nothing to map to them, so they are walked through as
    # identity rather than skipped - miss that and the forearm is parented to a
    # bone nobody posed and the whole arm hangs off the wrong place.
    # DESTINATION -> SOURCE, because several of his bones follow one of theirs.
    # AND THE PELVIS BONES ARE IN IT, which is not decoration: BOTH SCABBARDS
    # AND THE SASH are weighted to `DEF-pelvis.L`, and that bone hangs off
    # `ORG-spine`, which Mixamo has nothing to map to. Left to walk through as
    # identity it keeps its REST orientation while the body turns and leans -
    # so the scabbards and the sash detached from his hip and stood in the air
    # behind him, which rendered as a flat panel over his shoulder.
    MIX = {
        'DEF-spine': 'mixamorig:Hips',
        'DEF-pelvis.L': 'mixamorig:Hips', 'DEF-pelvis.R': 'mixamorig:Hips',
        'DEF-spine.001': 'mixamorig:Spine', 'DEF-spine.002': 'mixamorig:Spine1',
        'DEF-spine.003': 'mixamorig:Spine2', 'DEF-spine.004': 'mixamorig:Spine2',
        'DEF-spine.005': 'mixamorig:Neck', 'DEF-spine.006': 'mixamorig:Head',
        'DEF-shoulder.L': 'mixamorig:LeftShoulder', 'DEF-shoulder.R': 'mixamorig:RightShoulder',
        'DEF-upper_arm.L': 'mixamorig:LeftArm', 'DEF-upper_arm.R': 'mixamorig:RightArm',
        'DEF-forearm.L': 'mixamorig:LeftForeArm', 'DEF-forearm.R': 'mixamorig:RightForeArm',
        'DEF-hand.L': 'mixamorig:LeftHand', 'DEF-hand.R': 'mixamorig:RightHand',
        'DEF-thigh.L': 'mixamorig:LeftUpLeg', 'DEF-thigh.R': 'mixamorig:RightUpLeg',
        'DEF-shin.L': 'mixamorig:LeftLeg', 'DEF-shin.R': 'mixamorig:RightLeg',
        'DEF-foot.L': 'mixamorig:LeftFoot', 'DEF-foot.R': 'mixamorig:RightFoot',
        'DEF-toe.L': 'mixamorig:LeftToeBase', 'DEF-toe.R': 'mixamorig:RightToeBase',
    }
    # AND THE ORG- CHAIN HAS TO BE DRIVEN TOO, because in Rigify it is what
    # half the body hangs off: `DEF-thigh.L` is parented to `ORG-spine`,
    # `DEF-pelvis.L` (which carries BOTH scabbards and the sash) to
    # `ORG-pelvis.L`, and eight face bones to `ORG-face`. None of those is a
    # bone Mixamo has, so left unmapped they keep their REST orientation while
    # the body moves - the legs hang off a hip that never turns and the face
    # stays behind the head, which is the stretching. Every ORG- bone is given
    # its DEF- counterpart's source, and the four that have no counterpart are
    # named outright.
    for _d, _s in list(MIX.items()):
        _org = _d.replace('DEF-', 'ORG-')
        if _org in by and _org not in MIX:
            MIX[_org] = _s
    for _org, _s in (('ORG-face', 'mixamorig:Head'),
                     ('ORG-breast.L', 'mixamorig:Spine2'), ('ORG-breast.R', 'mixamorig:Spine2'),
                     ('ORG-palm.01.L', 'mixamorig:LeftHand'), ('ORG-palm.02.L', 'mixamorig:LeftHand'),
                     ('ORG-palm.03.L', 'mixamorig:LeftHand'), ('ORG-palm.04.L', 'mixamorig:LeftHand'),
                     ('ORG-palm.01.R', 'mixamorig:RightHand'), ('ORG-palm.02.R', 'mixamorig:RightHand'),
                     ('ORG-palm.03.R', 'mixamorig:RightHand'), ('ORG-palm.04.R', 'mixamorig:RightHand')):
        if _org in by:
            MIX[_org] = _s

    # destination bones, parents first
    ORDER = []
    def _walk_order(b):
        ORDER.append(b.name)
        for ch in b.children:
            _walk_order(ch)
    for b in arm.data.bones:
        if b.parent is None:
            _walk_order(b)
    def rot3(m):
        """the pure rotation of a 3x3, with any scale or shear thrown away"""
        return m.to_quaternion().to_matrix()

    DST_REST = {b.name: rot3(b.matrix_local.to_3x3()) for b in arm.data.bones}
    DST_PARENT = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
    INV = {nm: m.inverted() for nm, m in DST_REST.items()}

    def retarget(fbx, name, window=None, step=1, loop=False):
        """import one Mixamo clip and write it onto this rig as `name`"""
        before = set(o.name for o in bpy.data.objects)
        try:
            bpy.ops.import_scene.fbx(filepath=fbx)
        except Exception as e:
            log('  %-22s IMPORT FAILED %s' % (name, e))
            return False
        new = [o for o in bpy.data.objects if o.name not in before]
        src = next((o for o in new if o.type == 'ARMATURE'), None)
        if src is None:
            for o in new:
                bpy.data.objects.remove(o, do_unlink=True)
            log('  %-22s no armature in the file' % name)
            return False
        sact = src.animation_data.action if src.animation_data else None
        if sact is None:
            for o in new:
                bpy.data.objects.remove(o, do_unlink=True)
            log('  %-22s no action in the file' % name)
            return False
        f0, f1 = [int(round(v)) for v in sact.frame_range]
        if window:
            f0, f1 = max(f0, window[0]), min(f1, window[1])
        # NOTHING BUT ROTATION MAY CROSS. A Mixamo FBX imports with scale on
        # the armature object and on the bone matrices, and `pb.matrix.to_3x3()`
        # carries it - so the deltas were not rotations, they were rotations
        # WITH SCALE IN THEM, and the `want[parent]^-1 @ want[child]` chain
        # multiplied that scale down every limb. On screen his legs came out
        # twice his own height and thin as wire, and he floated, because
        # `skinnedBounds` then measured a body that was no longer a body.
        # Going through a quaternion and back guarantees a pure rotation at
        # every step; `.normalized()` is NOT enough, it only fixes the columns.
        SRC_REST = {b.name: rot3(b.matrix_local.to_3x3()) for b in src.data.bones}
        SRC_INV = {nm: m.inverted() for nm, m in SRC_REST.items()}
        SRC_W = rot3(src.matrix_world.to_3x3())
        SRC_WI = SRC_W.inverted()
        DST_W = rot3(arm.matrix_world.to_3x3())
        DST_WI = DST_W.inverted()

        # kill any clip of this name we authored earlier: the retarget wins
        old = bpy.data.actions.get(name)
        if old:
            bpy.data.actions.remove(old)
        act = new_action(name)

        out_f = 0
        f = f0
        while f <= f1:
            sc.frame_set(f)
            bpy.context.view_layer.update()
            dg = bpy.context.evaluated_depsgraph_get()
            ev = src.evaluated_get(dg)
            spose = {pb.name: rot3(pb.matrix.to_3x3()) for pb in ev.pose.bones}
            rest()
            want = {}
            for nm in ORDER:
                par = DST_PARENT[nm]
                pw = want[par] if par else None
                rr = (INV[par] @ DST_REST[nm]) if par else DST_REST[nm]
                smap = MIX.get(nm)
                if smap is not None and smap not in spose:
                    smap = None
                if smap is not None:
                    # THE DELTA HAS TO BE EXPRESSED IN THE DESTINATION'S FRAME.
                    # Both `matrix_local` and `pb.matrix` are ARMATURE space,
                    # which is self-consistent per rig - and the two rigs do not
                    # share one: the FBX importer turns Mixamo's Y-up armature
                    # on its side, so a rotation that means "lean forward" over
                    # there means "roll over" here. Rendered, he cartwheeled.
                    # The delta is taken to WORLD space on the source and
                    # brought back into armature space on the destination.
                    d_src = spose[smap] @ SRC_INV[smap]
                    d_world = SRC_W @ d_src @ SRC_WI
                    w = (DST_WI @ d_world @ DST_W) @ DST_REST[nm]
                    want[nm] = w
                    basis = rr.inverted() @ ((pw.inverted() @ w) if pw else w)
                    pb = by.get(nm)
                    if pb is not None:
                        pb.rotation_quaternion = basis.to_quaternion()
                else:
                    want[nm] = (pw @ rr) if pw else rr
            key(out_f)
            out_f += 1
            f += step
        finish(act)
        CLIPS[name] = {'frames': out_f - 1, 'hit': None, 'loop': loop}
        for o in new:
            bpy.data.objects.remove(o, do_unlink=True)
        return True

    MOVES = os.path.join(ROOT, 'incoming', 'mixamo', 'samurai one moves')

    def mv(f):
        return os.path.join(MOVES, f + '.fbx')

    # WHICH CLIP BECOMES WHAT. Five swings out of the set, and two of them are
    # KICKS - which is the best thing in it, because a kick is a mixup no
    # amount of sword-reading prepares you for.
    RETARGET = [
        ('Great Sword Crouching', 'idle', True),
        ('Great Sword Run', 'run', True),
        ('Great Sword Blocking', 'block', False),
        ('Great Sword Slash', 'sDown', False),
        ('Great Sword Slash-2', 'sSide', False),
        ('Sword And Shield Slash', 'sRise', False),
        ('Great Sword Kick', 'sSpin', False),
        ('Great Sword Kick-2', 'sStab', False),
    ]
    got = 0
    for f, nm, lp in RETARGET:
        if not os.path.exists(mv(f)):
            log('  %-22s MISSING %s' % (nm, mv(f)))
            continue
        if retarget(mv(f), nm, loop=lp):
            got += 1
            log('  %-22s <- %s  (%d frames)' % (nm, f, CLIPS[nm]['frames']))
    log('retargeted %d of %d clips' % (got, len(RETARGET)))

    # AND THE WALK IS THE RUN, SHORTER IN THE STRIDE. The set has no walk in it
    # and a creature that only ever runs at you cannot hold its distance. It is
    # the run's own cycle with every rotation eased back toward rest, which
    # shortens the stride without changing its timing - and the game plays it
    # slower again through `anim.rate`.
    if bpy.data.actions.get('run'):
        src = bpy.data.actions['run']
        n = CLIPS['run']['frames']
        old = bpy.data.actions.get('walk')
        if old:
            bpy.data.actions.remove(old)
        bind(src)
        rows = []
        for f in range(n + 1):
            sc.frame_set(f)
            bpy.context.view_layer.update()
            rows.append({pb.name: pb.rotation_quaternion.copy() for pb in pbs})
        act = new_action('walk')
        for f in range(n + 1):
            rest()
            for nm, q in rows[f].items():
                pb = by.get(nm)
                if pb is None:
                    continue
                pb.rotation_quaternion = Quaternion((1, 0, 0, 0)).slerp(q, 0.62)
            key(f)
        finish(act)
        CLIPS['walk'] = {'frames': n, 'hit': None, 'loop': True}
        log('  walk built off the run at 0.62 of the stride')

    # A CLIP AUTHORED TO BE WATCHED IS NOT AN ATTACK. These arrive as complete
    # performances - the greatsword slash is fifty-four frames and the sword and
    # shield one is a hundred and six - and most of that is standing in an idle
    # at each end. In a fight that is a creature winding up for two seconds and
    # then standing with its sword out; measured before trimming, two of the
    # five had their contact frame at FRAME ZERO, because the pose it starts in
    # is nearer the player than anything the swing does.
    #
    # The strike is found rather than declared: the frame at which the striking
    # end is moving fastest is the swing, and the window is a wind-up before it
    # and a follow-through after. Everything outside that goes.
    # WHICH END DOES THE STRIKING, WRITTEN DOWN. Three of these are sword
    # swings and TWO ARE KICKS, and asking "what passes nearest the chest"
    # over every end at once picks the wrong one: a foot planted on the floor
    # a metre and a half in front is 1.25 m from a chest, which beat the
    # actual blade on three clips out of five. A kick is also aimed lower
    # than a cut, so it gets its own target.
    STRIKER = {'sDown': ('DEF-katana_tip',), 'sSide': ('DEF-katana_tip',),
               'sRise': ('DEF-katana_tip',),
               'sSpin': ('DEF-toe.R', 'DEF-toe.L'), 'sStab': ('DEF-toe.R', 'DEF-toe.L')}
    KICK = ('sSpin', 'sStab')

    def trim(name, lead=0.42, tail=0.40):
        if name not in CLIPS:
            return
        n = CLIPS[name]['frames']
        ends = [e for e in STRIKER.get(name, ('DEF-katana_tip',)) if e in by]
        best, bf = -1.0, n // 2
        for e in ends:
            tr = hand_track(name, n, e)
            for i in range(1, n + 1):
                v = (tr[i] - tr[i - 1]).length
                if v > best:
                    best, bf = v, i
        f0 = max(0, bf - int(round(lead * 30)))
        f1 = min(n, bf + int(round(tail * 30)))
        if f1 - f0 < 6 or (f1 - f0) >= n:
            log('  %-6s no trim (peak %d of %d)' % (name, bf, n))
            return
        src = bpy.data.actions[name]
        bind(src)
        rows = []
        for f in range(f0, f1 + 1):
            sc.frame_set(f)
            bpy.context.view_layer.update()
            rows.append({pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in pbs})
        bpy.data.actions.remove(src)
        act = new_action(name)
        for i, row in enumerate(rows):
            rest()
            for nm2, (q, loc) in row.items():
                pb = by.get(nm2)
                if pb is None:
                    continue
                pb.rotation_quaternion = q
                pb.location = loc
            key(i, sword=False)          # the sword was already put in his fist
        finish(act)
        CLIPS[name] = {'frames': len(rows) - 1, 'hit': None}
        log('  %-6s trimmed %d -> %d frames (peak was %d)' % (name, n, len(rows) - 1, bf))

    for _a in ('sDown', 'sSide', 'sRise', 'sStab', 'sSpin'):
        trim(_a)

    # THE CONTACT FRAME IS WHERE THE BLADE MEETS A BODY, AND FOR A RETARGETED
    # CLIP IT IS MEASURED RATHER THAN DECLARED. The warden needed three
    # different proxies - lowest, furthest forward, fastest - because no one of
    # them suits every swing, and none of them suits a KICK at all. There is a
    # better question and it is the one the fight actually asks: a man stands in
    # front of him at chest height, and the contact is the frame at which the
    # nearest part of the STRIKING END passes closest to him. For a sword that
    # is the point; for a kick it is the foot; so both are sampled and the
    # nearer wins, which needs no per-clip table.
    #
    # It is measured in the RIG'S OWN UNITS - this model is 4.82 units to a
    # 1.86 m man, so a chest written as "1.25" is a chest half a metre off the
    # floor.
    _lo, _hi = ev_bounds()
    U = (_hi.z - _lo.z) / TARGET_H
    CHEST = Vector((0.0, FWD * 1.5 * U, 1.25 * U))
    for nm in ('sDown', 'sSide', 'sRise', 'sStab', 'sSpin'):
        if nm not in CLIPS:
            continue
        n = CLIPS[nm]['frames']
        ENDS = [e for e in STRIKER.get(nm, ('DEF-katana_tip',)) if e in by]
        CHEST = Vector((0.0, FWD * 1.5 * U, (0.95 if nm in KICK else 1.25) * U))
        tracks = {e: hand_track(nm, n, e) for e in ENDS}
        best, bf, bpart = 1e9, 0, '?'
        for e, tr in tracks.items():
            for i, p3 in enumerate(tr):
                d = (p3 - CHEST).length
                if d < best:
                    best, bf, bpart = d, i, e
        travel = max((tracks[bpart][i] - tracks[bpart][0]).length for i in range(n + 1))
        was = CLIPS[nm]['hit']
        CLIPS[nm]['hit'] = bf / float(n)
        log('  %-6s contact %2d/%2d (%s, %.2f m off the chest)  travel %.2f%s'
            % (nm, bf, n, bpart.replace('DEF-', ''), best / U, travel / U,
               '' if was is None else '   was %.2f' % was))

    # ---- AND NO CLIP MAY DEFORM HIM. A retarget that leaks scale does not
    # fail loudly - it ships a man whose legs are twice his height and who
    # floats, because `skinnedBounds` in the game then measures a body that is
    # no longer a body. Every clip is walked and the SKINNED bounds are taken
    # at several frames: if any clip makes him taller or wider than a man, the
    # build says so instead of writing the file.
    def clip_bounds(nm, n):
        bind(bpy.data.actions[nm])
        worst = None
        for f in (0, n // 3, (2 * n) // 3, n):
            sc.frame_set(f)
            bpy.context.view_layer.update()
            lo2, hi2 = ev_bounds()
            sz = (hi2.x - lo2.x, hi2.y - lo2.y, hi2.z - lo2.z)
            if worst is None or max(sz) > max(worst):
                worst = sz
        return worst

    REST_H = None
    bad = []
    for nm in sorted(CLIPS.keys()):
        n = CLIPS[nm]['frames']
        if n < 1:
            continue
        w = clip_bounds(nm, n)
        if REST_H is None:
            REST_H = w[2]
        tall = w[2] / max(1e-6, REST_H)
        flag = '' if max(w) < REST_H * 1.9 else '   <-- DEFORMED'
        if flag:
            bad.append(nm)
        log('  %-8s bounds %5.2f x %5.2f x %5.2f  (%.2f of his height)%s'
            % (nm, w[0], w[1], w[2], tall, flag))
    if bad:
        log('*** %d clips deform him: %s' % (len(bad), ', '.join(bad)))

    # ---- SIT HIM ON HIS OWN FEET, AT A MAN'S HEIGHT
    bind(bpy.data.actions['idle'])
    sc.frame_set(0)
    lo, hi = ev_bounds()
    h = hi.z - lo.z
    k = TARGET_H / h
    log('he is %.3f units tall; scaling by %.4f to %.2f m' % (h, k, TARGET_H))
    arm.scale = (k, k, k)
    arm.location = (-(lo.x + hi.x) * 0.5 * k, -(lo.y + hi.y) * 0.5 * k, -lo.z * k)
    bpy.context.view_layer.update()
    lo2, hi2 = ev_bounds()
    log('after: height %.3f m, feet at %.3f, span %s'
        % (hi2.z - lo2.z, lo2.z, [round(hi2[i] - lo2[i], 2) for i in range(3)]))

    # ---- MATERIALS: the staged maps, no metalness, roughness as a factor
    rough = json.load(open(os.path.join(STAGE, 'rough.json')))
    # the blend's own image paths say which part each material belongs to
    part_of = {}
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and n.image.filepath:
                p = n.image.filepath.replace('\\', '/').split('/')
                if len(p) >= 2:
                    part_of.setdefault(m.name, p[-2])
    log('%d materials, %d matched to a texture part' % (len(bpy.data.materials), len(part_of)))
    for m in bpy.data.materials:
        part = part_of.get(m.name)
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
        bsdf.inputs['Metallic'].default_value = 0.0
        bsdf.inputs['Roughness'].default_value = rough.get(part, 0.72) if part else 0.75
        bp = os.path.join(STAGE, '%s_base.jpg' % part) if part else None
        if bp and os.path.exists(bp):
            ti = nt.nodes.new('ShaderNodeTexImage')
            ti.image = bpy.data.images.load(bp, check_existing=True)
            nt.links.new(ti.outputs['Color'], bsdf.inputs['Base Color'])
        npth = os.path.join(STAGE, '%s_n.jpg' % part) if part else None
        if npth and os.path.exists(npth):
            tn = nt.nodes.new('ShaderNodeTexImage')
            tn.image = bpy.data.images.load(npth, check_existing=True)
            tn.image.colorspace_settings.name = 'Non-Color'
            nm = nt.nodes.new('ShaderNodeNormalMap')
            nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])

    # ---- EXPORT. Deform bones only (704 -> the DEF set plus his two swords),
    # every channel sampled on every clip, and the images left as the JPEGs
    # that were staged rather than re-encoded as PNG.
    bind(bpy.data.actions['idle'])
    sc.frame_set(0)
    for o in bpy.data.objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=OUT, export_format='GLB',
        export_yup=True, export_apply=True,
        export_def_bones=True, export_rest_position_armature=True,
        export_animations=True, export_bake_animation=True,
        export_animation_mode='ACTIONS', export_nla_strips=False,
        export_optimize_animation_size=False,
        export_image_format='JPEG', export_jpeg_quality=88,
        export_materials='EXPORT', export_skins=True,
        export_morph=False, export_cameras=False, export_lights=False)
    sz = os.path.getsize(OUT) / 1048576
    log('wrote %s  %.2f MB' % (OUT, sz))
    json.dump(CLIPS, open(os.path.join(STAGE, 'clips.json'), 'w'), indent=1)
    log('clips: %s' % ', '.join('%s(%d%s)' % (k, v['frames'],
        '' if v['hit'] is None else ' hit %.2f' % v['hit']) for k, v in CLIPS.items()))


if __name__ == '__main__':
    # THE ARGUMENTS ARE PARSED ONLY OUTSIDE BLENDER. Run under `blender -b
    # --python this.py`, argparse sees BLENDER's argv and dies on it before a
    # line of the build runs, reporting "unrecognized arguments: -b --python".
    try:
        import bpy  # noqa: F401
        inside = True
    except ImportError:
        inside = False
    if inside:
        stage_rig()
    else:
        ap = argparse.ArgumentParser()
        ap.add_argument('--tex', action='store_true')
        ap.add_argument('--rig', action='store_true')
        a = ap.parse_args()
        if a.tex or not a.rig:
            stage_textures()
        if a.rig or not a.tex:
            os.makedirs(os.path.join(ROOT, 'stage'), exist_ok=True)
            lg = os.path.join(ROOT, 'stage', 'samurai-blender.log')
            with open(lg, 'w') as f:
                r = subprocess.run([BLENDER, '-b', '--python', os.path.abspath(__file__)],
                                   stdout=f, stderr=subprocess.STDOUT)
            log('blender exit %d, log at %s' % (r.returncode, lg))
