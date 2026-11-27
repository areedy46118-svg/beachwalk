#!/usr/bin/env python3
"""The Scourger, the final boss (2026-11-25, the owner: "the final boss has been pissing me off this whole time take him out and add this
guy … make sure the rig is correct you have it wrong alot") into assets/scourger.glb.

    /usr/bin/python3 tools/scourger_pack.py
    python3 -I tools/glbquant.py /tmp/scourger_pack/scourger.glb /tmp/scourger_pack/scourger.q.glb --webp --only=POSITION,NORMAL,TEXCOORD_0
    python3 -I -c "import gzip; open('assets/scourger.glb','wb').write(gzip.compress(open('/tmp/scourger_pack/scourger.q.glb','rb').read(), 9, mtime=0))"

WHAT THE SOURCE IS (~/Downloads/scourger_rig, a Sketchfab glTF, CC-BY-4.0, DM-913 "Scourger Rig"): a winged, tailed thing on
digitigrade legs, ~65 units tall under Sketchfab's node chain, 81.7k tris over 7 meshes, six materials of 1-2K PNGs (41 MB), and
four clips of its own (Idle 80 f, Walk 66, Plunge Attack 85, Rear Attack 55). ONE skin over 160 joints of a BLENDER CONTROL RIG
baked out: the deforming bones hang off CONTROLS, not off each other —
  Chest      off `Chest IK`        (not the spine: bend the spine and the chest stays where it was — the torso tears)
  Head       off `Head IK`         (not the neck)
  Spine2/3   off `SpineParent2/3`  (siblings of the spine bones, not their children)
  Main Thigh off the IK leg's `Thigh` (the deforming leg chain is `Main Thigh` > `Main Knee` > `Main Lower Leg` > `Main Foot`)
plus poles, IK targets, foot rolls, twist bases and a second leg chain (`Thigh2`, `Lower Leg 2`) that carry no weight.

WHAT IS DONE TO IT:
  * EVERY CLIP IS RECORDED FIRST, as each deforming bone's pose in the world, frame by frame, with the control rig still driving it.
  * THE RIG IS REBUILT FROM THE BONES THAT MOVE THE SKIN (`DEFORM`: every bone with a vertex weight, plus `LegBase`), each under its
    ANATOMICAL parent (`PARENT`, else the nearest kept ancestor): Pelvis > Spine1 > Spine2 > Spine3 > Chest > Neck1 > Neck2 > Head;
    Chest > Shoulder > UpperArm > Elbow > Forearm > Hand; Pelvis > LegBase > Main Thigh > Main Knee > Main Lower Leg > Main Foot > Toe
    Base. Pelvis is the root. Every control bone is gone.
  * THE CLIPS ARE KEYED BACK onto the new chain from the recorded poses (each bone's local = its new parent's pose⁻¹ · its own), so
    they play exactly as recorded with no control rig. Names: idle, walk, plunge, rear.
  * THE BODY BONES TAKE MIXAMO'S HUMANIK NAMES under `Character1_` (the game's retarget and ragdoll map one to one): Hips = Pelvis,
    Spine = Spine1, Spine1 = Spine2, Spine2 = Chest (Spine3 between, unmapped), Neck = Neck1, Head = Head (Neck2 between),
    Shoulder, Arm = UpperArm, ForeArm = Forearm (Elbow between), Hand, UpLeg = Main Thigh, Leg = Main Lower Leg (Main Knee between),
    Foot = Main Foot (his long upright foot), ToeBase = Toe Base. The rest keep their names, '.' and ' ' made '_'.
  * SCALE: the node chain baked in, stood on y = 0, facing +Z (his toes), HEIGHT tall to the top of his head.
  * DECIMATED with the weights kept (`RATIO` by material), welded first. Maps: base colour PNG (alpha cutouts: the feathers, the
    ragged cloth, the fur edges) quantised to 256 colours, 1024 / 512; JPEG where there is no alpha; normals 512 JPEG while small;
    metal 0 everywhere (METALNESS IS A TRAP); the eyes keep their glow (emissive = their own map).
"""
import os, sys, subprocess, json, re, math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.expanduser('~/Downloads/scourger_rig')
WORK = '/tmp/scourger_pack'
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
HEIGHT = 2.6                      # to the crown (the king was 2.6: these are a man's takes against a man)
NORMAL_MAX_KB = 260
MAP = {'Pelvis': 'Hips', 'Spine1': 'Spine', 'Spine2': 'Spine1', 'Chest': 'Spine2', 'Neck1': 'Neck', 'Head': 'Head'}
for s, S in (('L', 'Left'), ('R', 'Right')):
    MAP.update({'Shoulder.' + s: S + 'Shoulder', 'UpperArm.' + s: S + 'Arm', 'Forearm.' + s: S + 'ForeArm', 'Hand.' + s: S + 'Hand',
                'Main Thigh.' + s: S + 'UpLeg', 'Main Lower Leg.' + s: S + 'Leg', 'Main Foot.' + s: S + 'Foot', 'Toe Base.' + s: S + 'ToeBase'})
PARENT = {'Spine1': 'Pelvis', 'Spine2': 'Spine1', 'Spine3': 'Spine2', 'Chest': 'Spine3', 'Neck1': 'Chest', 'Neck2': 'Neck1', 'Head': 'Neck2',
          'TailBase': 'Pelvis'}
for s in ('L', 'R'):
    PARENT.update({'LegBase.' + s: 'Pelvis', 'Main Thigh.' + s: 'LegBase.' + s, 'Main Knee.' + s: 'Main Thigh.' + s,
                   'Main Lower Leg.' + s: 'Main Knee.' + s, 'Main Foot.' + s: 'Main Lower Leg.' + s, 'Toe Base.' + s: 'Main Foot.' + s,
                   'Shoulder.' + s: 'Chest', 'UpperArm.' + s: 'Shoulder.' + s, 'Elbow.' + s: 'UpperArm.' + s,
                   'Forearm.' + s: 'Elbow.' + s, 'Hand.' + s: 'Forearm.' + s})
ALWAYS = {'Pelvis', 'LegBase.L', 'LegBase.R', 'Spine1', 'Spine2', 'Spine3', 'Chest', 'Neck1', 'Neck2', 'Head'}
RATIO = {'Scourger_Material': 0.30, 'Attire': 0.30, 'material': 0.40, 'Feather': 0.65, 'Eye_Material': 1.0, 'material_0': 1.0}
CLIPS = {'Idle': 'idle', 'Walk': 'walk', 'Plunge Attack': 'plunge', 'Rear Attack': 'rear'}


def log(*a):
    print('[scourger]', *a, flush=True)


def build_maps():
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    T = os.path.join(SRC, 'textures')
    out = os.path.join(WORK, 'tex'); os.makedirs(out, exist_ok=True)
    made = {}
    for part, size in (('Scourger_Material', 1024), ('Attire', 1024), ('Feather', 512), ('material', 512), ('Eye_Material', 256)):
        im = Image.open(os.path.join(T, part + '_baseColor.png'))
        if 'A' in im.mode:
            im = im.convert('RGBA').resize((size, size), Image.LANCZOS)
            q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
            p = os.path.join(out, part + '_albedo.png'); q.save(p, optimize=True)
        else:
            p = os.path.join(out, part + '_albedo.jpg'); im.convert('RGB').resize((size, size), Image.LANCZOS).save(p, 'JPEG', quality=85, optimize=True)
        made[part + '_albedo'] = p
        np_ = os.path.join(T, part + '_normal.png')
        if os.path.exists(np_):
            p = os.path.join(out, part + '_normal.jpg')
            Image.open(np_).convert('RGB').resize((512, 512), Image.LANCZOS).save(p, 'JPEG', quality=80, optimize=True)
            if os.path.getsize(p) <= NORMAL_MAX_KB * 1024: made[part + '_normal'] = p
            else: os.remove(p); log('  %s normal dropped (too heavy)' % part)
        for k in ('albedo', 'normal'):
            if part + '_' + k in made: log('  %-26s %.0f KB' % (part + '_' + k, os.path.getsize(made[part + '_' + k]) / 1024))
    return made


# ----------------------------------------------------------------- stage two
def blender_main():
    import bpy, bmesh
    from mathutils import Vector, Matrix, Quaternion
    cfg = json.load(open(os.path.join(WORK, 'cfg.json')))
    maps, dst = cfg['maps'], cfg['dst']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'scene.gltf'))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.find_armature() is arm]
    # HIS AXE: not skinned — a mesh on an `Axe` node under his right hand bone (still in every clip); kept, rehung on the hand
    axe = bpy.data.objects.get('Object_142')
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o not in meshes and o is not axe: bpy.data.objects.remove(o, do_unlink=True)
    base = lambda n: re.sub(r'_\d+$', '', n)
    B = {base(b.name): b.name for b in arm.data.bones}
    # ---- which bones move the skin
    wt = set()
    for o in meshes:
        names = {g.index: g.name for g in o.vertex_groups}
        for v in o.data.vertices:
            wt.update(base(names[g.group]) for g in v.groups if g.weight > 1e-3 and g.group in names)
    keep = (wt | ALWAYS) & set(B)
    log('%d bones, %d move the skin (+ the spine and leg bases kept): %d kept' % (len(B), len(wt), len(keep)))

    # ---- every clip recorded first: each kept bone's pose in the world, frame by frame, the control rig still driving it
    sc = bpy.context.scene
    acts = [a for a in bpy.data.actions]
    rec = {}
    if not arm.animation_data: arm.animation_data_create()
    for a in acts:
        nm = CLIPS.get(a.name)
        if not nm: continue
        arm.animation_data.action = a
        f0, f1 = (int(round(v)) for v in a.frame_range)
        frames = []
        for f in range(f0, f1 + 1):
            sc.frame_set(f)
            frames.append({k: (arm.matrix_world @ arm.pose.bones[B[k]].matrix).copy() for k in keep})
        rec[nm] = frames
        log('  recorded %-14s -> %-7s %d frames' % (a.name, nm, len(frames)))
    restW = {k: (arm.matrix_world @ arm.data.bones[B[k]].matrix_local).copy() for k in keep}
    for o in bpy.data.objects:
        if o.animation_data: o.animation_data_clear()
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    for pb in arm.pose.bones: pb.matrix_basis = Matrix()

    # ---- bake the node chain; stand him on the floor facing +Z, HEIGHT tall
    bpy.context.view_layer.update()
    for o in [arm] + meshes + ([axe] if axe else []):
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    for o in list(bpy.data.objects):
        if o.type == 'EMPTY': bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.update()

    def apply_all():
        bpy.ops.object.select_all(action='DESELECT')
        for o in [arm] + meshes + ([axe] if axe else []): o.select_set(True)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    apply_all()
    Bn = arm.data.bones
    head = Bn[B['Head']]
    crown = (head.tail_local if head.tail_local.z > head.head_local.z else head.head_local).z
    feet = min(min(v.co.z for v in o.data.vertices) for o in meshes)
    fwd = Vector((0, 0, 0))
    for s in ('L', 'R'):
        d = Bn[B['Toe Base.' + s]].tail_local - Bn[B['Main Foot.' + s]].head_local; d.z = 0; fwd += d.normalized()
    ang = math.atan2(fwd.x, -fwd.y)
    # the crown: the head bone ends at the brow — the skull goes on above it; measured off the mesh above the neck
    top = max(max((o.matrix_world @ v.co).z for v in o.data.vertices if abs(v.co.x) < 6) for o in meshes)
    s = HEIGHT / (top - feet)
    pel = Bn[B['Pelvis']].head_local
    log('feet %.2f, head bone %.2f, mesh top %.2f (units); toes %s -> turn %.1f deg; scale %.5f' % (feet, crown, top, tuple(round(v, 2) for v in fwd.normalized()), -math.degrees(ang), s))
    M = Matrix.Rotation(ang, 4, 'Z') @ Matrix.Scale(s, 4) @ Matrix.Translation((-pel.x, -pel.y, -feet))
    for o in [arm] + meshes + ([axe] if axe else []): o.matrix_world = M @ o.matrix_world
    bpy.context.view_layer.update(); apply_all()
    # the recorded poses through the same transform (rotation part made orthonormal: the scale is the bones' lengths, not theirs)
    def xf(W):
        W2 = M @ W; loc = W2.to_translation(); q = W2.to_quaternion().normalized()
        return Matrix.Translation(loc) @ q.to_matrix().to_4x4()
    for nm in rec:
        rec[nm] = [{k: xf(W) for k, W in fr.items()} for fr in rec[nm]]
    # (check: the rest recorded and the rest after the transform agree)
    err = max((xf(restW[k]).to_translation() - arm.data.bones[B[k]].head_local).length for k in keep)
    log('rest recorded vs rebuilt: worst %.4f m' % err)

    # ---- the rig rebuilt from the bones that move the skin, each under its anatomical parent
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm; arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    byb = {base(b.name): b for b in eb}
    newpar = {}
    for k in keep:
        b = byb[k]
        p = PARENT.get(k)
        if not p:
            a = b.parent
            while a is not None and base(a.name) not in keep: a = a.parent
            p = base(a.name) if a is not None else None
        newpar[k] = p
    for k, p in newpar.items():
        byb[k].use_connect = False
        byb[k].parent = byb[p] if p else None
    for b in list(eb):
        if base(b.name) not in keep: eb.remove(b)
    bpy.ops.object.mode_set(mode='OBJECT')
    roots = [k for k, p in newpar.items() if not p]
    log('rebuilt: %d bones, roots %s; chest under %s, head under %s, thigh.L under %s' % (len(arm.data.bones), roots, newpar['Chest'], newpar['Head'], newpar['Main Thigh.L']))
    rename = {}
    for b in arm.data.bones:
        k = base(b.name)
        rename[b.name] = 'Character1_' + MAP[k] if k in MAP else re.sub(r'[.: ]', '_', k)
    if len(set(rename.values())) != len(rename): raise SystemExit('bone names collide')
    for old, new in rename.items(): arm.data.bones[old].name = new
    NB = {base(old): new for old, new in rename.items()}
    for o in meshes:
        for g in list(o.vertex_groups):
            if g.name not in arm.data.bones: o.vertex_groups.remove(g)

    # ---- the clips keyed back onto the new chain from the recorded poses
    order = []
    def walk(b):
        order.append(b)
        for c in b.children: walk(c)
    for b in arm.data.bones:
        if b.parent is None: walk(b)
    inv = {v: k for k, v in NB.items()}
    for nm, frames in rec.items():
        if not arm.animation_data: arm.animation_data_create()
        act = bpy.data.actions.new(nm); arm.animation_data.action = act
        for i, fr in enumerate(frames):
            for b in order:
                k = inv[b.name]; pb = arm.pose.bones[b.name]
                W = fr[k]
                if b.parent:
                    P = fr[inv[b.parent.name]]
                    rest_rel = b.parent.matrix_local.inverted() @ b.matrix_local
                    basis = rest_rel.inverted() @ P.inverted() @ W
                else:
                    basis = b.matrix_local.inverted() @ W
                loc, rq, _ = basis.decompose()
                pb.rotation_mode = 'QUATERNION'; pb.location = loc; pb.rotation_quaternion = rq; pb.scale = (1, 1, 1)
                pb.keyframe_insert('location', frame=i + 1); pb.keyframe_insert('rotation_quaternion', frame=i + 1)
        act.use_fake_user = True
        # (and the check: played back on the new chain, every bone where it was recorded)
        sc.frame_set(1 + len(frames) // 2)
        bad = max((arm.pose.bones[NB[k]].matrix.to_translation() - frames[len(frames) // 2][k].to_translation()).length for k in keep)
        log('  %-7s keyed %d frames; mid-frame worst bone %.4f m off its recording' % (nm, len(frames), bad))
    for nm in rec:
        tr = arm.animation_data.nla_tracks.new(); tr.name = nm
        st = tr.strips.new(nm, 1, bpy.data.actions[nm]); st.name = nm
        tr.mute = True
    arm.animation_data.action = None

    # ---- meshes: one UV, welded, decimated, weights kept
    t0 = t1 = 0
    for o in meshes:
        me = o.data
        while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
        n0 = sum(len(p.vertices) - 2 for p in me.polygons)
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = True
        mat = me.materials[0].name if me.materials else 'material_0'
        r = RATIO.get(re.sub(r'\.\d+$', '', mat), 1.0)
        if r < 1.0:
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
            m = o.modifiers.new('dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = r
            m.use_symmetry = True; m.symmetry_axis = 'X'
            bpy.ops.object.modifier_move_to_index(modifier='dec', index=0)
            bpy.ops.object.modifier_apply(modifier='dec')
        n1 = sum(len(p.vertices) - 2 for p in me.polygons)
        t0 += n0; t1 += n1
        log('  %-10s %-18s %6d tris -> %6d' % (o.name, mat, n0, n1))
    log('  all meshes %d -> %d tris' % (t0, t1))

    # ---- materials
    def mat_for(name, key, alpha, emis):
        m = bpy.data.materials.new(name); m.use_nodes = True; m.use_backface_culling = False
        nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
        bsdf.inputs['Metallic'].default_value = 0.0; bsdf.inputs['Roughness'].default_value = 0.8
        if key + '_albedo' in maps:
            tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(maps[key + '_albedo'])
            nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
            if alpha:
                nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
                m.blend_method = 'CLIP' if hasattr(m, 'blend_method') else None
                try: m.alpha_threshold = 0.5
                except Exception: pass
            if emis:
                nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = 1.0
        if key + '_normal' in maps:
            tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(maps[key + '_normal']); tn.image.colorspace_settings.name = 'Non-Color'
            nm_ = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm_.inputs['Color']); nt.links.new(nm_.outputs['Normal'], bsdf.inputs['Normal'])
        return m
    newm = {}
    for o in meshes:
        old = re.sub(r'\.\d+$', '', o.data.materials[0].name) if o.data.materials else 'material_0'
        if old not in newm:
            newm[old] = mat_for('scourger_' + old.lower(), old, old in ('Attire', 'Feather', 'Scourger_Material'), old == 'Eye_Material')
        o.data.materials.clear(); o.data.materials.append(newm[old])
        o.parent = arm
        for md in o.modifiers:
            if md.type == 'ARMATURE': md.object = arm
    if axe:
        me = axe.data
        while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
        n0 = len(me.polygons)
        bpy.ops.object.select_all(action='DESELECT'); axe.select_set(True); bpy.context.view_layer.objects.active = axe
        m = axe.modifiers.new('dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = RATIO['material']; bpy.ops.object.modifier_apply(modifier='dec')
        if 'material' not in newm: newm['material'] = mat_for('scourger_axe', 'material', False, False)
        me.materials.clear(); me.materials.append(newm['material'])
        axe.name = me.name = 'scourger_axe'
        # rehung on the hand at rest, world kept (bone parenting hangs off the bone's TAIL: the ops path sets the inverse for us)
        # (AT REST: the keying above leaves every pose bone at the last frame it keyed, the action gone or not — parented then, the
        # axe kept its rest place against a hand out in a clip, and in the game it hung 1.22 m off his fist, 2026-11-26)
        for pb in arm.pose.bones: pb.matrix_basis = Matrix()
        bpy.context.view_layer.update()
        bpy.ops.object.select_all(action='DESELECT'); axe.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
        arm.data.bones.active = arm.data.bones['Character1_RightHand']
        bpy.ops.object.mode_set(mode='POSE'); bpy.ops.object.parent_set(type='BONE', keep_transform=True); bpy.ops.object.mode_set(mode='OBJECT')
        log('  the axe: %d faces -> %d, on %s' % (n0, len(me.polygons), axe.parent_bone))
    arm.name = 'Scourger'; arm.data.name = 'Scourger'
    arm['bw_scourger'] = json.dumps({'height': HEIGHT, 'clips': list(rec.keys())})
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS',
                              export_extras=True, export_image_format='AUTO', export_jpeg_quality=85,
                              export_yup=True, export_apply=False, export_def_bones=False, export_force_sampling=True,
                              export_tangents=False, export_morph=False, export_texcoords=True, export_normals=True)
    log('%s: %.2f MB' % (os.path.basename(dst), os.path.getsize(dst) / 1e6))


if __name__ == '__main__':
    if 'bpy' in sys.modules or os.environ.get('SCOURGER_IN_BLENDER'):
        blender_main()
    else:
        os.makedirs(WORK, exist_ok=True)
        log('building maps')
        maps = build_maps()
        json.dump({'maps': maps, 'dst': os.path.join(WORK, 'scourger.glb')}, open(os.path.join(WORK, 'cfg.json'), 'w'))
        log('running blender')
        env = dict(os.environ, SCOURGER_IN_BLENDER='1')
        r = subprocess.run([BLENDER, '-b', '-noaudio', '--python', os.path.abspath(__file__)], env=env, capture_output=True, text=True)
        out = [l for l in r.stdout.split('\n') if l.startswith('[scourger]') or 'Error' in l or 'Traceback' in l or 'line ' in l]
        print('\n'.join(out[-90:]))
        if r.returncode: print(r.stderr[-3000:])
