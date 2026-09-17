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
    from mathutils import Vector, Quaternion, Matrix

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

    # ---- HIS FACE RIG IS 87 BONES PARENTED TO NOTHING THAT SHIPS.
    # Rigify's face DEF bones hang off `MCH-` controls — checked, and not ONE
    # of their parents is a deform bone — so `export_def_bones` drops every
    # parent and reparents the lot to whatever distant ancestor is left. Their
    # motion then has nothing to do with a face, and they drive 1,448 vertices
    # of the body, 1,601 of the helmet, 2,294 of the helmet band and 448 of the
    # horns: his whole head. That is the smeared face.
    #
    # HE IS WEARING A KABUTO AND A MENPO. There is no face to animate — so the
    # whole face rig is merged into the head: every face group's weight is
    # added to `DEF-spine.006` and the bones stop deforming, which makes the
    # head RIGID with the neck (correct for a helmeted man) and means it cannot
    # smear. It also takes the skin from 163 joints to about 76.
    FACEWORDS = ('nose', 'lip', 'jaw', 'chin', 'cheek', 'brow', 'lid', 'ear',
                 'temple', 'forehead', 'eye', 'tongue', 'teeth', 'nostril', 'face')

    def is_face(nm):
        t = nm.replace('DEF-', '').replace('ORG-', '').lower()
        return any(t.startswith(w) for w in FACEWORDS)

    HEADB = 'DEF-spine.006'
    face_bones = [b.name for b in arm.data.bones if b.name.startswith('DEF-') and is_face(b.name)]
    moved = 0
    for ob in meshes:
        names = {vg.name for vg in ob.vertex_groups}
        mine = [n for n in face_bones if n in names]
        if not mine:
            continue
        head = ob.vertex_groups.get(HEADB) or ob.vertex_groups.new(name=HEADB)
        idx = {vg.name: vg.index for vg in ob.vertex_groups}
        want = {idx[n] for n in mine}
        for v in ob.data.vertices:
            w = sum(g.weight for g in v.groups if g.group in want)
            if w > 0.0:
                head.add([v.index], w, 'ADD')
                moved += 1
        for n in mine:
            ob.vertex_groups.remove(ob.vertex_groups[n])
    for n in face_bones:
        arm.data.bones[n].use_deform = False
    log('face rig merged into the head: %d bones off, %d vertex weights moved'
        % (len(face_bones), moved))

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

    # ---- AND A BONE IN EULER MODE IGNORES EVERY QUATERNION YOU WRITE TO IT.
    # Nothing in this file speaks Euler - `rest`, `setrot`, `put`, the retarget,
    # the trims, the seating and the pin all write `rotation_quaternion`, and
    # `key` keyframes that channel - but a Rigify rig does NOT bind every bone
    # to quaternions: this one ships 82 in Euler, and TWO OF THEM ARE THE
    # CLAVICLES (`ORG-shoulder.L/R`, mode YXZ). Both `DEF-upper_arm` and
    # `DEF-shoulder` hang off a clavicle, so the retarget worked out each arm's
    # local basis RELATIVE TO a collarbone it believed it had rotated, wrote
    # the rotation into a property the evaluator does not read, and the
    # collarbone stayed at rest. Every arm in every retargeted clip was then
    # off by whatever its own clavicle was meant to be doing - and a greatsword
    # swing rolls the clavicles hard, so the arms came apart.
    #
    # Measured, hands apart as a fraction of his own arm reach: the Mixamo
    # sources hold 0.22-0.37 (a two-handed grip; `Sword And Shield Slash`
    # holds 1.28, which is how it was caught), the same retarget maths with
    # every bone put into quaternion mode first reproduces 0.32-0.51, and what
    # shipped was 0.79-2.08 - wider, on two of them, than the shield clip that
    # was thrown out for being too wide. That is the "arms out" the owner has
    # reported for three rounds, and it was ONE LINE.
    for _pb in arm.pose.bones:
        _pb.rotation_mode = 'QUATERNION'

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

    # ---- AND A BONE A DEFORM BONE HANGS OFF MUST BE KEYED, OR THE POSE THAT
    # WAS COMPUTED IS NOT THE POSE THAT SHIPS. `KEYED` was the deform set and
    # the root, which is the right list for a clip posed by hand and the wrong
    # one the day the retarget started driving the ORG chain - and it has to
    # drive it, because in Rigify `DEF-upper_arm.L` hangs off `ORG-shoulder.L`,
    # `DEF-thigh.L` off `ORG-spine` and `DEF-pelvis.L` (both scabbards and the
    # sash) off `ORG-pelvis.L`, and NONE of the 159 ORG bones is a deform bone.
    # So the retarget worked out each DEF bone`s local basis RELATIVE TO a
    # driven ORG parent and then threw the parent away: played back, or baked
    # by the exporter, those 25 bones fall to rest and every DEF bone under
    # them is off by the inverse of what its parent was meant to be doing.
    #
    # Measured at one frame of `Great Sword Slash-2`, against the source clip
    # bone for bone in world: with every bone posed the transfer is exact - the
    # residual is the two rigs` rest difference and nothing else (7 deg at the
    # upper arm, 24 at the clavicle) - and the hands sit 0.40 of his own arm
    # reach apart against the source`s 0.28. Let the unkeyed bones fall to rest
    # and the hand goes 58 degrees out, the forearm 55, the clavicle 52, and
    # the hands open to 0.74. That is the "arms out" nobody could name from a
    # still, and it was in every retargeted clip from the day they went in.
    #
    # The list is now every deform bone AND EVERY ANCESTOR OF ONE. An ancestor
    # the retarget never drove keys at rest, which is exactly what the chain
    # arithmetic in an authored clip already assumed, so nothing hand-posed
    # moves. The exporter still ships deform bones only.
    KEYED = {}
    for _pb in pbs:
        if not (_pb.bone.use_deform or _pb.name == 'root'):
            continue
        _b = _pb
        while _b is not None and _b.name not in KEYED:
            KEYED[_b.name] = _b
            _b = _b.parent
    KEYED = list(KEYED.values())
    log('keying %d bones (%d deform, %d carried for the chain)'
        % (len(KEYED), sum(1 for b in KEYED if b.bone.use_deform),
           sum(1 for b in KEYED if not b.bone.use_deform)))

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
    # ---- AND THE HAND HAS TO CLOSE. The Dealer's own bug, on a second rig and
    # for a second reason: his fingers were stripped and this one's are never
    # DRIVEN. `MIX` maps a spine, two arms and two legs and no finger at all,
    # so every finger bone walks through the retarget as identity - which is
    # the BIND pose, and this rig binds with the hands flat and open. Rendered
    # close on the right fist at four frames of the side cut, the tsuka floats
    # past a splayed palm on every one of them. That is the owner's "it's not
    # in his hand", and no distance test could have found it: measured on the
    # mesh, the nearest sword vertex to the fist is 0.026 on every frame of
    # every clip, because the sword is pinned to the hand and the hand is
    # simply open.
    #
    # THE CURL SIGN IS NOT REASONED ABOUT. This file has now twice shipped a
    # hand bending backwards over its own knuckles on the strength of an axis
    # convention read off the rig. It is DERIVED, per bone, by the only test
    # that has no convention in it: a closed fist brings the fingertip back
    # toward the WRIST and an open one extends it away, so the sign is
    # whichever one shortens that distance. A mirrored rig gets the right
    # answer on both hands by construction.
    FINGERS = ('f_index', 'f_middle', 'f_ring', 'f_pinky')
    CURL = {'01': 0.78, '02': 1.05, '03': 0.80}
    THUMB = {'01': 0.42, '02': 0.62, '03': 0.48}

    def _curl_sign(pb, wrist):
        best, sg = None, 1.0
        for t in (1.0, -1.0):
            q = Quaternion(Vector((1.0, 0.0, 0.0)), 0.9 * t)
            pb.rotation_quaternion = q
            bpy.context.view_layer.update()
            d = (pb.tail - wrist.head).length
            if best is None or d < best:
                best, sg = d, t
        pb.rotation_quaternion = Quaternion((1, 0, 0, 0))
        return sg

    GRIP = {}

    def build_grip():
        rest()
        bpy.context.view_layer.update()
        for side in ('L', 'R'):
            wrist = by.get('DEF-hand.%s' % side)
            if wrist is None:
                continue
            for fam, tab in ((FINGERS, CURL), (('thumb',), THUMB)):
                for f in fam:
                    for seg, ang in tab.items():
                        nm = 'DEF-%s.%s.%s' % (f, seg, side)
                        pb = by.get(nm)
                        if pb is None:
                            continue
                        sg = _curl_sign(pb, wrist)
                        GRIP[nm] = Quaternion(Vector((1.0, 0.0, 0.0)), ang * sg)
        rest()
        bpy.context.view_layer.update()
        log('grip: %d finger bones curled' % len(GRIP))

    def set_fingers():
        for nm, q in GRIP.items():
            pb = by.get(nm)
            if pb is not None:
                pb.rotation_quaternion = q

    def key(f, sword=True):
        set_fingers()          # every clip, every frame: the fist is round the tsuka
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
        off = pbs[j].matrix.inverted() @ pbs[i].matrix
        # ---- AND THE GRIP GOES IN THE PALM, NOT AT THE WRIST. The offset is
        # the artist's own - taken from a frame of the shipped `Swing`, where
        # the COPY_TRANSFORMS that held the sword is baked in - and it puts the
        # Katana bone's head on `DEF-hand.R`'s head, which is the WRIST JOINT.
        # A fist closes five to eight centimetres further along, so with the
        # fingers finally curling the hand shut the tsuka was landing just
        # behind the palm and the fist closed BESIDE it. Rendered close on the
        # right hand at four frames of the side cut, that is what "it's not in
        # his hand" still looked like after the fingers were fixed.
        #
        # The palm is measured rather than nudged: the midpoint of the wrist
        # and the middle finger's first knuckle is the middle of a closed
        # hand, and the bone head goes there. The ROTATION is untouched -
        # that is the angle the artist held it at and it reads.
        _mid = by.get('DEF-f_middle.01.R')
        if _mid is not None:
            _palmW = (pbs[j].head + _mid.head) * 0.5
            _palmL = pbs[j].matrix.inverted() @ _palmW
            log('  grip moved %.3f from the wrist into the palm'
                % (off.translation - _palmL).length)
            off.translation = _palmL
        STICK.append((i, j, off))
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

    build_grip()

    # ---- HOW FAR APART ARE HIS FISTS? He carries a katana in the right and
    # nothing in the left, and every clip in the set was authored on a
    # two-handed greatsword, so a clip whose hands come apart is a clip that
    # has gone wrong somewhere. It is reported as a fraction of his OWN arm
    # reach, which is the one normaliser that cannot be thrown off by the two
    # figures having different proportions: measured on the Mixamo sources
    # every greatsword clip sits at 0.22-0.37 and `Sword And Shield Slash` at
    # 1.28, because the left arm is carrying a shield. That gap is not close,
    # which is what makes this safe to assert on.
    GRIP_MAX = 0.60

    def grip(name):
        act = bpy.data.actions.get(name)
        if act is None:
            return None
        n = CLIPS[name]['frames'] if name in CLIPS else int(act.frame_range[1])
        bind(act)
        W = arm.matrix_world
        reach = ((W @ arm.data.bones['DEF-upper_arm.R'].head_local)
                 - (W @ arm.data.bones['DEF-hand.R'].head_local)).length
        v = []
        for f in range(n + 1):
            sc.frame_set(f)
            bpy.context.view_layer.update()
            v.append(((W @ by['DEF-hand.L'].head) - (W @ by['DEF-hand.R'].head)).length / reach)
        return sum(v) / len(v), max(v)

    def grips(tag, names):
        out = []
        for nm in names:
            g = grip(nm)
            if g:
                out.append('%s %.2f/%.2f' % (nm, g[0], g[1]))
        log('  hands/reach after %-10s %s' % (tag, '  '.join(out)))

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

        # ---- A IS NOT T, AND ON THIS PAIR OF RIGS IT IS THE COLLARBONE.
        # The delta transfer says "turn this bone by the rotation the source's
        # bone underwent", which is only the same POSE if the two bones start
        # in the same place. Measured between these two rests, in world: the
        # arms agree to 7 degrees, the shins to 3, the toes to 0 - and the
        # CLAVICLES are 24 apart, because this artist drew a collarbone
        # pointing up and out (0.84, 0.49, 0.22) and Mixamo's points nearly
        # straight out (0.98, 0.21, -0.05). Give a bone that starts 24 degrees
        # high the rotation a bone that starts flat underwent and it stays 24
        # degrees high, on every frame, for ever.
        #
        # On a man in a shirt nobody would see it. On a man in a kabuto with
        # sode the size of dinner plates, the shoulder armour rides up over the
        # neck guard and swallows his head, which is the owner's "his head is
        # in his body". Measured as the clavicle's outer end above the top of
        # the chest, over its own length: every SOURCE clip holds +0.01 dead
        # flat, and the shipped ones ran +0.18 in the idle and +0.38 at the top
        # of a swing.
        #
        # So each bone is first turned by the SMALLEST rotation that takes
        # where IT points its own child to where the source's rest points, and
        # the delta goes on top of that. It is applied ONLY where the mapping
        # is a TRUE COUNTERPART: `DEF-pelvis.L` is mapped to `Hips` as a
        # stand-in, not because it is a hip, and its rest differs by 47 degrees
        # for exactly that reason - aligning it would swing both scabbards and
        # the sash off his waist. The spine is left alone too: its differences
        # are the curve of a back, which is the artist's and not an error.
        ALIGN_OK = ('shoulder', 'upper_arm', 'forearm', 'hand',
                    'thigh', 'shin', 'foot', 'toe')
        ALIGN = {}
        for _d, _s in MIX.items():
            _t = _d.replace('DEF-', '').replace('ORG-', '').split('.')[0]
            if _t not in ALIGN_OK:
                continue
            if _d not in arm.data.bones or _s not in src.data.bones:
                continue
            _db, _sb = arm.data.bones[_d], src.data.bones[_s]
            _dd = (DST_W @ (_db.tail_local - _db.head_local)).normalized()
            _sd = (SRC_W @ (_sb.tail_local - _sb.head_local)).normalized()
            ALIGN[_d] = DST_WI @ _dd.rotation_difference(_sd).to_matrix() @ DST_W
        if ALIGN:
            _worst = max(ALIGN.items(), key=lambda kv: kv[1].to_quaternion().angle)
            log('  %-22s aligned %d bones, worst %s %.1f deg'
                % (name, len(ALIGN), _worst[0], math.degrees(_worst[1].to_quaternion().angle)))

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
                    _al = ALIGN.get(nm)
                    w = (DST_WI @ d_world @ DST_W) @ ((_al @ DST_REST[nm]) if _al else DST_REST[nm])
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
        # AND THE SOURCE ACTION GOES WITH THE SOURCE ARMATURE. Removing the
        # imported objects leaves their ACTIONS behind, and the exporter ships
        # every action it can find: eight `Armature|mixamo.com|Layer0` clips
        # rode along in the GLB, driving nothing and measuring a T-pose,
        # because they belong to a skeleton that is no longer there.
        for o in new:
            bpy.data.objects.remove(o, do_unlink=True)
        if sact.users == 0 or sact.name.startswith('Armature|'):
            try:
                bpy.data.actions.remove(sact)
            except Exception:
                pass
        return True

    MOVES = os.path.join(ROOT, 'incoming', 'mixamo', 'samurai one moves')

    def mv(f):
        return os.path.join(MOVES, f + '.fbx')

    # WHICH CLIP BECOMES WHAT. Five swings out of the set, and two of them are
    # KICKS - which is the best thing in it, because a kick is a mixup no
    # amount of sword-reading prepares you for.
    # WHICH CLIP BECOMES WHAT, AND IT IS MEASURED RATHER THAN GUESSED. The
    # first pass took the names at face value and shipped a man with his arms
    # out: measured on the exported rig, `Sword And Shield Slash` holds its
    # hands 1.07 m apart on average and 1.49 at worst, because THE LEFT ARM IS
    # CARRYING A SHIELD — and he has no shield, so it reads as a samurai
    # standing there with his hands out. It is dropped outright. `Great Sword
    # Crouching` is nearly as wide (0.91) and was the IDLE, which is the pose
    # you look at longest, so the guard from `Blocking` (0.68) takes that and
    # the crouch becomes the brace. What is left is two greatsword cuts and
    # two kicks, all of which hold a plausible two-handed grip.
    RETARGET = [
        ('Great Sword Blocking', 'idle', True),
        ('Great Sword Run', 'run', True),
        ('Great Sword Crouching', 'block', False),
        ('Great Sword Slash', 'sDown', False),
        ('Great Sword Slash-2', 'sSide', False),
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
    grips('retarget', ('idle', 'run', 'block', 'sDown', 'sSide', 'sSpin', 'sStab'))

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
        # ---- AND IT IS THE LEGS THAT SHORTEN, NOT THE MAN. Easing EVERY
        # rotation back toward rest shortens the stride and also walks the
        # whole upper body back toward the bind pose - which on this rig is a
        # T, so his guard opened as he slowed down and by the time he was
        # walking his hands were 1.10 of his own reach apart against the run's
        # 0.40. He holds his sword the same way at every speed; only his feet
        # know the difference. The ease is the leg chain and nothing else.
        LEGW = ('thigh', 'shin', 'foot', 'toe')

        def is_leg(nm2):
            t = nm2.replace('DEF-', '').replace('ORG-', '').split('.')[0].lower()
            return any(t.startswith(w) for w in LEGW)

        act = new_action('walk')
        for f in range(n + 1):
            rest()
            for nm, q in rows[f].items():
                pb = by.get(nm)
                if pb is None:
                    continue
                pb.rotation_quaternion = (Quaternion((1, 0, 0, 0)).slerp(q, 0.62)
                                          if is_leg(nm) else q)
            key(f)
        finish(act)
        CLIPS['walk'] = {'frames': n, 'hit': None, 'loop': True}
        log('  walk built off the run, legs at 0.62 of the stride, guard kept')

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

    for _a in ('sDown', 'sSide', 'sStab', 'sSpin'):
        trim(_a)
    grips('trim', ('idle', 'run', 'block', 'sDown', 'sSide', 'sSpin', 'sStab'))

    # ---- AND A RETARGET THAT CARRIES NO HIPS HEIGHT TURNS A CROUCH INTO A
    # LEVITATION. The retarget writes ROTATIONS and nothing else, so whatever
    # the source did vertically is simply lost - and half of this set does
    # something vertical. `Great Sword Blocking` and `Great Sword Crouching`
    # both SINK: the body drops into a stance. With the hips pinned the legs
    # have nowhere to put that, so they fold up underneath and the FEET COME
    # OFF THE FLOOR. Measured on the shipped file, over the idle's twelve
    # frames the toes ramp 0.03 -> 0.33 and 0.00 -> 0.25 and never come back,
    # and over the block's sixteen they ramp to 0.70 and 0.59 - monotonically,
    # a ramp and not a cycle. Looped at half a second that is a man hoisting
    # both knees and snapping back, for ever, which is the owner's "if you
    # stand still he just sits and tweaks out".
    #
    # The body is SEATED instead: the lowest point of the sandals is measured
    # per frame through the depsgraph - on the MESH, never the foot bones,
    # because the sole hangs below the joint (the Dealer paid for that one) -
    # and the root bone is moved so it rests on the floor it rested on at rest.
    # A crouch then reads as the body going down, which is what a crouch is.
    #
    # A GAIT IS THE EXCEPTION: a run has a flight phase where BOTH feet are
    # legitimately off the ground, so seating it per frame would pin a running
    # man to the floor. Those take ONE offset, the clip's own minimum.
    SOLE = [o for o in meshes if o.name in ('Sandals', 'Shinprotection')]
    _up_arm = arm.matrix_world.to_3x3().inverted() @ Vector((0.0, 0.0, 1.0))
    ROOT_UP = (L[IDX['root']].to_3x3().inverted() @ _up_arm) if 'root' in IDX else Vector((0, 0, 1))

    def sole_low():
        """the lowest point of his feet, in world z"""
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        lo = 1e9
        for o in SOLE:
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            for v in me.vertices:
                z = (o.matrix_world @ v.co).z
                if z < lo:
                    lo = z
            ev.to_mesh_clear()
        return lo

    rest()
    FLOOR = sole_low()

    def seat(name, how='frame'):
        act = bpy.data.actions.get(name)
        if act is None:
            return
        # `sSwing` is the artist's own clip and carries no CLIPS entry, because
        # the fight never draws it - it still has feet.
        n = CLIPS[name]['frames'] if name in CLIPS else int(act.frame_range[1])
        bind(act)
        rows, drop = [], []
        for f in range(n + 1):
            sc.frame_set(f)
            bpy.context.view_layer.update()
            rows.append([(pb.rotation_quaternion.copy(), pb.location.copy()) for pb in pbs])
            drop.append(FLOOR - sole_low())
        if how == 'low':
            # THE ONE OFFSET IS THE ONE THE DEEPEST FRAME NEEDS, not the one
            # the shallowest needs. `drop` is how far a frame has to be LIFTED
            # to put its sole on the floor, so `min` picks the frame whose foot
            # is already highest - the flight phase - lands that on the boards
            # and leaves every planted foot under them. Measured on the shipped
            # file: the run`s sole ran -0.242..0.000 and the walk`s -0.111,
            # which is a man striding through the deck up to his ankles.
            drop = [max(drop)] * len(drop)
        elif how == 'first':
            # a clip that leaves the vertical - he goes over, his sandals come
            # off the floor and stay off - can only be seated where it begins.
            drop = [drop[0]] * len(drop)
        keep = dict(CLIPS[name]) if name in CLIPS else None
        bpy.data.actions.remove(act)
        act = new_action(name)
        for fi, row in enumerate(rows):
            rest()
            for pb, (q, loc) in zip(pbs, row):
                pb.rotation_quaternion = q
                pb.location = loc
            by['root'].location = by['root'].location + ROOT_UP * drop[fi]
            key(fi, sword=False)
        finish(act)
        if keep is not None:
            CLIPS[name] = keep
        log('  %-10s seated %+.3f .. %+.3f' % (name, min(drop), max(drop)))

    # AND THE AUTHORED CLIPS WANTED IT TOO. The list was the retargeted set,
    # on the reasoning that only a retarget loses height - and an authored
    # stance that bends the knees loses it just as surely, from its own pose
    # table. Measured on the shipped file, `sRise`, `stagger` and `taunt` all
    # stood 0.13-0.14 through the boards for every frame they had.
    for _a in ('idle', 'block', 'sDown', 'sSide', 'sStab', 'sSpin',
               'sRise', 'sSwing', 'stagger', 'taunt'):
        seat(_a, 'frame')
    for _a in ('walk', 'run'):
        seat(_a, 'low')
    seat('die', 'first')
    grips('seat', ('idle', 'run', 'block', 'sDown', 'sSide', 'sSpin', 'sStab'))

    # ---- AND AN IDLE IS A POSE HELD, NOT A CLIP PLAYED. Seating fixes the
    # feet; it cannot fix the fact that `Great Sword Blocking` is a ONE-WAY
    # RAMP - he drops into a guard over half a second and the clip ends, so
    # looped he sinks and pops back up twice a second for ever. The pose you
    # look at longest has to be still. The idle is the FIRST part of that
    # clip - up to where the body has only just begun to settle, found by
    # asking the hips rather than by picking a number - played out and back
    # over three seconds on a smoothstep: a man standing in a guard, breathing.
    # The witness's own arrangement, one step simpler, because here there is a
    # real stance in the file to hold.
    def breathe(name, secs=3.0, drop=0.06):
        act = bpy.data.actions.get(name)
        if act is None:
            return
        n = CLIPS[name]['frames']
        bind(act)
        hip, rows = [], []
        for f in range(n + 1):
            sc.frame_set(f)
            bpy.context.view_layer.update()
            hip.append((arm.matrix_world @ by['DEF-spine'].matrix).translation.z)
            rows.append([(pb.rotation_quaternion.copy(), pb.location.copy()) for pb in pbs])
        top = hip[0]
        K = 0
        while K + 1 <= n and (top - hip[K + 1]) < drop:
            K += 1
        if K < 1:
            log('  %-10s no still stretch to breathe on' % name)
            return
        M = int(round(secs * 30))
        bpy.data.actions.remove(act)
        act = new_action(name)
        for i in range(M + 1):
            u = i / float(M)
            tri = 1.0 - abs(2.0 * u - 1.0)                 # out and back
            e = tri * tri * (3.0 - 2.0 * tri)              # and eased, so it never jerks
            x = e * K
            a, t = int(x), x - int(x)
            bcap = min(a + 1, K)
            rest()
            for j, pb in enumerate(pbs):
                qa, la = rows[a][j]
                qb, lb = rows[bcap][j]
                pb.rotation_quaternion = qa.slerp(qb, t)
                pb.location = la.lerp(lb, t)
            key(i, sword=False)
        finish(act)
        CLIPS[name] = {'frames': M, 'hit': None, 'loop': True}
        log('  %-10s breathes on frames 0..%d of %d, over %.1f s' % (name, K, n, secs))

    breathe('idle')
    grips('breathe', ('idle', 'run', 'block', 'sDown', 'sSide', 'sSpin', 'sStab'))

    # ---- AND THE PIN IS A PASS OF ITS OWN, BECAUSE `stick()` CANNOT SEE THE
    # POSE IT IS PINNING TO. It reads `pbs[hand].matrix` live, and a live read
    # is only the pose we just wrote if nothing has re-evaluated the armature
    # since - which is true while a clip is being AUTHORED and false inside
    # `retarget()`, whose every frame begins `sc.frame_set(f)` to advance the
    # SOURCE clip and so re-runs the animation system on the destination rig
    # too, against the half-written action being keyed. Measured on the shipped
    # file: the authored clips hold the katana 0.05 from his fist on every
    # frame and the seven retargeted ones hold it 0.14 to 1.22 away - which on
    # screen is a samurai standing in his guard with both hands empty and his
    # sword hanging in the air beside him, and it is the owner's "he's not even
    # holding the sword".
    #
    # So the host's matrix is RECORDED first, over a finished clip, and written
    # second - two passes, nothing live. `trim` already rebuilds an action this
    # way; this is the same shape, for every clip, and it runs after the trims
    # so nothing downstream can undo it. It also has to run BEFORE the contact
    # measurement, which tracks `DEF-katana_tip` - a bone parented to `Katana` -
    # and was therefore measuring the flight of a sword nobody was holding.
    def pin_all():
        if not STICK:
            return
        for name in list(CLIPS.keys()):
            act = bpy.data.actions.get(name)
            if act is None:
                continue
            n = CLIPS[name]['frames']
            bind(act)
            rows = []
            for f in range(n + 1):
                sc.frame_set(f)
                bpy.context.view_layer.update()
                rows.append(([(pb.rotation_quaternion.copy(), pb.location.copy()) for pb in pbs],
                             [pbs[j].matrix.copy() for (_i, j, _o) in STICK]))
            keep = dict(CLIPS[name])
            bpy.data.actions.remove(act)
            act = new_action(name)
            for fi, (row, hosts) in enumerate(rows):
                rest()
                for pb, (q, loc) in zip(pbs, row):
                    pb.rotation_quaternion = q
                    pb.location = loc
                for k, (i, j, off) in enumerate(STICK):
                    # NOTHING BUT A RIGID MOVE MAY CROSS. Anything with scale in
                    # it would be handed straight to the sword.
                    t, q, _s = (hosts[k] @ off).decompose()
                    M = Matrix.Translation(t) @ q.to_matrix().to_4x4()
                    pbs[i].matrix_basis = L[i].inverted() @ M
                key(fi, sword=False)
            finish(act)
            CLIPS[name] = keep
            log('  %-10s swords pinned over %d frames' % (name, n))
    pin_all()
    grips('pin', ('idle', 'run', 'block', 'sDown', 'sSide', 'sSpin', 'sStab'))

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
    for nm in ('sDown', 'sSide', 'sStab', 'sSpin'):
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

    # ---- HOW FAST DOES THE CLIP THINK THE GROUND IS MOVING? The retarget
    # writes rotations and nothing else, so his gaits carry NO root motion at
    # all: the feet cycle at whatever rate the game picks and the body is
    # moved by the fight AI, and the two agree only by luck. That is the
    # slide, and the knight already carries the answer - THE RATE IS THE
    # STRIDE OVER THE SPEED. A clip with no travel still states its stride,
    # in the one place it cannot hide it: the PLANTED FOOT. Whichever toe is
    # lowest is the one on the ground, and how far that toe travels backwards
    # through the frames it stays down IS the distance the ground covered.
    # Summed over the cycle and divided by its length, that is the speed the
    # clip is walking at - in metres, after the scale that fits him to
    # TARGET_H, which is the number the game plays it against.
    def gait_speed(name):
        act = bpy.data.actions.get(name)
        if act is None or name not in CLIPS:
            return None
        n = CLIPS[name]['frames']
        if n < 2:
            return None
        bind(act)
        toes = [t for t in ('DEF-toe.L', 'DEF-toe.R') if t in by]
        if not toes:
            return None
        W = arm.matrix_world
        pos, low = [], []
        for f in range(n + 1):
            sc.frame_set(f)
            bpy.context.view_layer.update()
            p = {t: (W @ by[t].head).copy() for t in toes}
            pos.append(p)
            low.append(min(toes, key=lambda t: p[t].z))
        # the ground passes under whichever foot is planted, over the frames
        # it stays planted; a frame where the plant CHANGES is a step and is
        # not counted, or the swap reads as a metre of travel.
        d = 0.0
        for f in range(1, n + 1):
            if low[f] != low[f - 1]:
                continue
            a, b = pos[f - 1][low[f]], pos[f][low[f]]
            d += math.hypot(a.x - b.x, a.y - b.y)
        return d / (n / 30.0)

    GAIT_M = {}
    for _g in ('walk', 'run'):
        _v = gait_speed(_g)
        if _v:
            # this runs AFTER the scale fit, so the world is already metres
            GAIT_M[_g] = _v
            log('  %-5s strides %.2f m/s at his shipped size' % (_g, _v))
    json.dump(GAIT_M, open(os.path.join(STAGE, 'gaits.json'), 'w'), indent=1)

    # ---- AND THE ARTIST`S OWN ACTION DOES NOT SHIP. `Swing` is adrigon`s
    # clip, on adrigon`s control rig; it is SAMPLED at the top of this file and
    # re-keyed onto the deform bones as `sSwing`, and the source action itself
    # was never removed. The exporter ships every action it can find, so 31
    # frames of it went into the GLB - and rendered as a strip it is a T-POSE
    # with the katana waving about in front of him, because it drives control
    # bones that the export drops. Anything that played it would T-pose the
    # boss. This is the `Armature|mixamo.com|Layer0` trap wearing the source
    # file`s own name: REMOVE THE ACTION WITH THE RIG IT BELONGS TO.
    for _dead in ('Swing',):
        _a = bpy.data.actions.get(_dead)
        if _a is not None:
            _a.use_fake_user = False
            bpy.data.actions.remove(_a)
            CLIPS.pop(_dead, None)
            log('dropped the source action %s' % _dead)

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
