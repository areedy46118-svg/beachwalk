"""The owner's EEJANAI "Free Sword Animation" pack, made readable by `tools/ntar_moves.py`.

    /Applications/Blender.app/Contents/MacOS/Blender -b -noaudio --python tools/eej_convert.py

WHY. Its FBXs are Mixamo-shaped except where it matters: the HIPS is not a bone but the armature OBJECT
(`EEJANAIBot:Hips`, under an `Armature` empty, at a hundredth scale), its three root bones are the two thighs and
the spine, and every bone carries an `EEJANAIBot:` prefix. `ntar_moves` reads Mixamo's layout. So each clip is
re-laid on a plain Mixamo skeleton — a real `Hips` bone at the object's origin, every other bone where it was,
prefix dropped — driven frame by frame through Child Of constraints whose inverses are set in the rest pose (so each
bone follows its source's MOTION from rest, not its axes), baked, and written to `converted/` beside the source.

AND IT READS HIS GRIP. The sword is an empty on the RightHand bone; its blade direction, flat and grip point are
read in that bone's own frame and written, with the rest pose's forearm and hand, to `converted/grip.json` — which
is how `tools/paladin_pack.py` seats the paladin's blade the way this swordsman holds his.
"""
import bpy, os, json, glob
from mathutils import Vector, Matrix

SRC = os.path.expanduser('~/paladin moves/Assets/EEJANAI_Team/FreeSwordAnimations/FBX')
OUT = os.path.expanduser('~/paladin moves/converted')
P = 'EEJANAIBot:'


def log(*a):
    print('[eej]', *a, flush=True)


def convert(path, grip=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    A = bpy.data.objects[P + 'Hips']
    act = A.animation_data.action if A.animation_data else None
    sc = bpy.context.scene
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    # the rest: the source's animation off, every pose bone cleared
    held = {}
    for o in bpy.data.objects:
        if o.animation_data and o.animation_data.action:
            held[o] = o.animation_data.action; o.animation_data.action = None
    for pb in A.pose.bones:
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    AW = A.matrix_world.copy()
    # the new skeleton, in world space at the source's rest
    ad = bpy.data.armatures.new('mx'); N = bpy.data.objects.new('mx', ad); sc.collection.objects.link(N)
    bpy.context.view_layer.objects.active = N
    bpy.ops.object.mode_set(mode='EDIT')
    hip = ad.edit_bones.new('Hips')
    hip.head = AW.to_translation()
    sp = A.data.bones[P + 'Spine']
    hip.tail = AW @ sp.head_local
    if (hip.tail - hip.head).length < 1e-4: hip.tail = hip.head + Vector((0, 0, 0.1))
    for b in A.data.bones:
        e = ad.edit_bones.new(b.name[len(P):])
        e.head = AW @ b.head_local; e.tail = AW @ b.tail_local
        z = (AW.to_3x3() @ b.matrix_local.to_3x3()) @ Vector((0, 0, 1))
        e.align_roll(z)
    for b in A.data.bones:
        e = ad.edit_bones[b.name[len(P):]]
        e.parent = ad.edit_bones[b.parent.name[len(P):]] if b.parent else hip
    bpy.ops.object.mode_set(mode='POSE')
    # each bone takes its source's world ROTATION (they share their rest axes: the head, the tail and the roll are
    # the source's), and the hips — which have no source bone — follow the source OBJECT's motion from rest through a
    # Child Of whose inverse is set here. (A Child Of on every bone counted each parent's motion twice: the forearm
    # ended a metre off the source's.)
    for pb in N.pose.bones:
        if pb.name == 'Hips':
            c = pb.constraints.new('CHILD_OF'); c.target = A
            N.data.bones.active = N.data.bones[pb.name]
            ov = {'object': N, 'active_object': N, 'pose_bone': pb, 'constraint': c}
            with bpy.context.temp_override(**ov):
                bpy.ops.constraint.childof_set_inverse(constraint=c.name, owner='BONE')
        else:
            c = pb.constraints.new('COPY_ROTATION'); c.target = A; c.subtarget = P + pb.name
            c.target_space = 'WORLD'; c.owner_space = 'WORLD'
    # the clip back on, baked onto the new skeleton
    for o, a in held.items():
        o.animation_data.action = a
    # THE GRIP, read where he holds it — on a frame of the clip, in the hand's own frame (with the sword's own
    # animation off at rest it sat a quarter-turn wrong; measured, in the hand's frame it does not move by a hundredth
    # through a whole slash) — and carried back onto the rest hand, which is what the paladin's blade is seated against
    if grip is not None:
        sw = bpy.data.objects.get('Sword'); m = next((o for o in bpy.data.objects if o.parent is sw and o.type == 'MESH'), None)
        if m:
            sc.frame_set(f0); bpy.context.view_layer.update()
            Ht = A.matrix_world @ A.pose.bones[P + 'RightHand'].matrix
            Rt = Ht.to_3x3().normalized(); ht = Ht.to_translation()
            pts = [m.matrix_world @ v.co for v in m.data.vertices]
            c0 = sum(pts, Vector()) / len(pts)
            e1 = max(pts, key=lambda q: (q - c0).length); e2 = max(pts, key=lambda q: (q - e1).length)
            tip, pom = (e1, e2) if (e1 - ht).length > (e2 - ht).length else (e2, e1)
            ax = (tip - pom).normalized()
            dims = list(m.dimensions); thin = min(range(3), key=lambda a: dims[a])
            nrm = (m.matrix_world.to_3x3() @ Vector([1.0 if a == thin else 0.0 for a in range(3)])).normalized()
            g = pom + ax * (ht - pom).dot(ax)
            Ri = Rt.inverted()
            lA, lN, lG = Ri @ ax, Ri @ nrm, Ri @ (g - ht)
            HR = AW @ A.data.bones[P + 'RightHand'].matrix_local
            R0 = HR.to_3x3().normalized(); h0 = HR.to_translation()
            fa = AW @ A.data.bones[P + 'RightForeArm'].head_local
            # and turned to face -Y, the paladin's front in Blender: this bot faces +Y (his slashes travel that way), and
            # read as he lies the grip came out turned half round. His facing is his feet's, at rest.
            fwd = Vector((0, 0, 0))
            for sd in ('Left', 'Right'):
                d = (AW @ A.data.bones[P + sd + 'ToeBase'].head_local) - (AW @ A.data.bones[P + sd + 'Foot'].head_local); d.z = 0
                if d.length > 1e-6: fwd += d.normalized()
            import math
            from mathutils import Matrix as _M
            yawZ = math.atan2(-1, 0) - math.atan2(fwd.y, fwd.x)
            Rz = _M.Rotation(yawZ, 3, 'Z')
            grip.update({'FA': list(Rz @ fa), 'H': list(Rz @ h0), 'A': list(Rz @ (R0 @ lA).normalized()), 'N': list(Rz @ (R0 @ lN).normalized()),
                         'G': list(Rz @ (h0 + R0 @ lG)), 'len': (tip - pom).length, 'turned': math.degrees(yawZ)})
            log('grip: blade %.2f m, in the hand %s, at rest %s' % ((tip - pom).length, tuple(round(v, 2) for v in lA), tuple(round(v, 2) for v in (R0 @ lA))))
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT'); N.select_set(True); bpy.context.view_layer.objects.active = N
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.select_all(action='SELECT')
    sc.frame_set(f0); bpy.context.view_layer.update()
    bpy.ops.nla.bake(frame_start=f0, frame_end=f1, only_selected=True, visual_keying=True, clear_constraints=True, bake_types={'POSE'})
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in list(bpy.data.objects):
        if o is not N: bpy.data.objects.remove(o, do_unlink=True)
    sc.frame_start, sc.frame_end = f0, f1
    name = os.path.splitext(os.path.basename(path))[0]
    dst = os.path.join(OUT, name + '.fbx')
    bpy.ops.export_scene.fbx(filepath=dst, object_types={'ARMATURE'}, bake_anim=True, add_leaf_bones=False,
                             bake_anim_use_all_actions=False, bake_anim_use_nla_strips=False, use_armature_deform_only=False)
    log('%-26s frames %d..%d -> %s' % (name, f0, f1, os.path.relpath(dst, os.path.dirname(OUT))))


os.makedirs(OUT, exist_ok=True)
grip = {}
for i, f in enumerate(sorted(glob.glob(os.path.join(SRC, '*.fbx')))):
    convert(f, grip if os.path.basename(f) == 'slash3.fbx' else None)      # (a slash: the stances' files are a near T pose with the sword hung anyhow)
json.dump(grip, open(os.path.join(OUT, 'grip.json'), 'w'), indent=1)
log('grip.json written')
