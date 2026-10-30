#!/usr/bin/env python3
"""Skrim, the thing digging in the whale's belly: "Dagon's sectarian" into assets/skrim.glb.

Two stages, the way `tools/crusader_pack.py` runs: the maps are built under the
system python because that is the one with PIL, then Blender is run on this
same file to assemble the model.

    /usr/bin/python3 tools/skrim_pack.py

WHAT THE SOURCE IS (the owner's ~/Downloads/dagon_s_sectarian, a Sketchfab glTF:
scene.gltf + scene.bin + nine 4096 PNGs, 115 MB; CC-BY-4.0, David Glynch): one
skin over 155 joints of an AUTO-RIG PRO rig (`root.x`, `spine_01.x` ..
`spine_05.x`, `arm_stretch.l`, `forearm_stretch.l`, `thigh_stretch.l` ..., the
stretch bones each carrying twist children, and ~70 `c_*` face bones), 11
meshes, ~30k verts (the teeth alone 6751), three materials, and one demo clip.
It is authored ~9.9 units tall under a Sketchfab 0.01 / axis-swap node chain.

WHAT IS DONE TO IT:

  * THE BODY BONES ARE RENAMED TO MIXAMO'S HUMANIK NAMES under `Character1_`
    (the beach pack's own prefix), so the game's ragdoll and retarget tables
    map him one to one: Hips = root.x, Spine = spine_01, Spine1 = spine_03,
    Spine2 = spine_05, Neck, Head, Shoulder, Arm = arm_stretch, ForeArm =
    forearm_stretch, Hand, UpLeg = thigh_stretch, Leg = leg_stretch, Foot,
    ToeBase = toes_01. EVERY OTHER BONE STAYS (spine_02, spine_04, the subneck,
    every twist bone, the fingers and the face all carry weights) under a name
    with no '.' or ':' — three's PropertyBinding strips those — and without
    Sketchfab's `_0NN` uniqueness suffix. The twist bones are children of the
    stretch bones, so they ride along with whatever drives the mapped ones.
  * FOUR BONES CARRY NOTHING AND ARE DROPPED: Sketchfab's `_rootJoint` and the
    three `c_eye_target` controls under it. Hips is the root, as on Mixamo.
  * THE DEMO CLIP IS DROPPED; the file carries no animation (his moves are
    data, `assets/skrim-moves.json`, from `tools/ntar_moves.py -- skrim`).
  * SCALE: the node chain is baked into the rig and he is scaled to 1.85 m
    standing, feet on y = 0, facing +Z.
  * DECIMATED (Blender's Decimate modifier, which keeps the skin weights, moved
    to the top of the stack and applied): each mesh is first welded at its
    UV-seam splits, then cut by its own ratio — the teeth hardest, the body
    with X symmetry. ~30k verts down to the budget in the log.
  * MAPS: base colour 1024 JPEG. Normals 1024 JPEG, kept only while each is
    small (NORMAL_MAX_KB), else 512, else dropped. The metallicRoughness maps
    are reduced to their roughness (G) alone at 512.
  * METALNESS IS A TRAP (there is no environment map; metal renders black): the
    cloth material had metallicFactor 1 with metal in the map's B channel. Every
    material is written with metalness 0. The cloth's alphaMode MASK (cutoff
    1.0) is dropped: its base colour has no alpha channel.
  * Joined by material, except the hook, which stays its own mesh so the game
    can show or hide it. It sits in his LEFT fist; its `hook` bone hung off
    spine_04 (a constraint carried it in the source rig, and constraints do
    not survive glTF), so it is reparented to Character1_LeftHand, rest kept.

WHAT COMES OUT (2026-10-29): 1.98 MB; 16,693 verts as exported (body 9138,
cloth 4492, eyes+teeth 2560, hook 503); 151 bones, root Character1_Hips (hips
0.805 m up — he is long in the body and short in the leg); 1.85 m; faces +Z,
his left at +X. Binds in a steep A (upper arms ~64 deg below horizontal; the
Mixamo packs bind in a T). Measured in Blender: the baked Sketchfab chain left
him standing along +Y, so he is stood up by +90 deg about X before the scale.
"""
import os, sys, subprocess, json, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.expanduser('~/Downloads/dagon_s_sectarian')
WORK = '/tmp/skrim_pack'
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
HEIGHT = 1.85
NORMAL_MAX_KB = 300
# Auto-Rig Pro name (Sketchfab's suffix stripped) -> the HumanIK name
MAP = {
    'root.x': 'Hips', 'spine_01.x': 'Spine', 'spine_03.x': 'Spine1', 'spine_05.x': 'Spine2',
    'neck.x': 'Neck', 'head.x': 'Head',
}
for s, S in (('l', 'Left'), ('r', 'Right')):
    MAP.update({'shoulder.' + s: S + 'Shoulder', 'arm_stretch.' + s: S + 'Arm',
                'forearm_stretch.' + s: S + 'ForeArm', 'hand.' + s: S + 'Hand',
                'thigh_stretch.' + s: S + 'UpLeg', 'leg_stretch.' + s: S + 'Leg',
                'foot.' + s: S + 'Foot', 'toes_01.' + s: S + 'ToeBase'})
DROP_BONES = ('_rootJoint', 'c_eye_target.x', 'c_eye_target.l', 'c_eye_target.r')
# Decimate ratio per source mesh (by the glTF mesh-node name); 1.0 = untouched
RATIO = {'teeth_low': 0.13, 'skin_low': 0.62, 'pants_low': 0.6, 'Hook_low': 0.55,
         'ring_low': 0.7, 'pants_part_01_low': 0.75, 'belt_low': 0.8, 'cloth_low': 0.85}


def log(*a):
    print('[skrim]', *a, flush=True)


def build_maps():
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    T = os.path.join(SRC, 'textures')
    out = os.path.join(WORK, 'tex'); os.makedirs(out, exist_ok=True)
    made = {}
    for part in ('skin', 'cloth_other', 'eye_teeth'):
        alb = Image.open(os.path.join(T, part + '_baseColor.png')).convert('RGB').resize((1024, 1024), Image.LANCZOS)
        p = os.path.join(out, part + '_albedo.jpg'); alb.save(p, 'JPEG', quality=85, optimize=True); made[part + '_albedo'] = p
        nm = Image.open(os.path.join(T, part + '_normal.png')).convert('RGB')
        for size in (1024, 512):
            p = os.path.join(out, part + '_normal.jpg')
            nm.resize((size, size), Image.LANCZOS).save(p, 'JPEG', quality=85, optimize=True)
            if os.path.getsize(p) <= NORMAL_MAX_KB * 1024:
                made[part + '_normal'] = p
                break
        else:
            os.remove(p)
            log('  %s normal dropped (too heavy)' % part)
        # roughness is glTF's G; metal (B) is thrown away
        g = Image.open(os.path.join(T, part + '_metallicRoughness.png')).convert('RGB').split()[1].resize((512, 512), Image.LANCZOS)
        p = os.path.join(out, part + '_rough.jpg'); g.convert('RGB').save(p, 'JPEG', quality=85, optimize=True); made[part + '_rough'] = p
        for k in ('albedo', 'normal', 'rough'):
            if part + '_' + k in made:
                log('  %-20s %.0f KB' % (part + '_' + k, os.path.getsize(made[part + '_' + k]) / 1024))
    return made


# ----------------------------------------------------------------- stage two
def blender_main():
    import bpy, bmesh
    from mathutils import Vector, Matrix
    cfg = json.load(open(os.path.join(WORK, 'cfg.json')))
    maps, dst = cfg['maps'], cfg['dst']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'scene.gltf'))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.find_armature() is arm]
    # the importer's bone-shape icosphere, and anything else not skinned
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o not in meshes:
            bpy.data.objects.remove(o, do_unlink=True)
    # the source name of each mesh: its glTF mesh name less the material suffix
    src_name = {o: re.sub(r'_(skin|cloth_other|eye_teeth)_0$', '', o.data.name) for o in meshes}
    # ---- no clip
    for o in bpy.data.objects:
        if o.animation_data:
            o.animation_data_clear()
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    for pb in arm.pose.bones:
        pb.matrix_basis = Matrix()
    # ---- bake the Sketchfab node chain: everything unparented, transforms applied
    bpy.context.view_layer.update()
    for o in [arm] + meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    for o in list(bpy.data.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.update()

    def apply_all():
        bpy.ops.object.select_all(action='DESELECT')
        for o in [arm] + meshes:
            o.select_set(True)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    apply_all()
    import math

    def bbox0():
        mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
        for o in meshes:
            for v in o.data.vertices:
                mn = Vector(map(min, mn, v.co)); mx = Vector(map(max, mx, v.co))
        return mn, mx
    # MEASURED: with the chain baked he stands along Blender +Y (feet at y=0,
    # 10 units up) and faces +Z, so he is stood up by +90 deg about X
    mn, mx = bbox0()
    if mx.y - mn.y > 1.5 * (mx.z - mn.z):
        log('baked chain stands him along +Y (%.2f tall): turning +90 about X' % (mx.y - mn.y))
        for o in [arm] + meshes:
            o.matrix_world = Matrix.Rotation(math.pi / 2, 4, 'X') @ o.matrix_world
        bpy.context.view_layer.update()
        apply_all()

    def bbox():
        mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
        for o in meshes:
            for v in o.data.vertices:
                p = o.matrix_world @ v.co
                mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
        return mn, mx
    mn, mx = bbox()
    log('source rest bbox %s .. %s (%.3f tall, z up?)' % (tuple(round(v, 3) for v in mn), tuple(round(v, 3) for v in mx), mx.z - mn.z))
    # ---- facing: the toes point where a standing body faces; Blender -Y is glTF +Z
    B = arm.data.bones
    fwd = Vector((0, 0, 0))
    for s in ('l', 'r'):
        f = next(b for b in B if b.name.startswith('foot.' + s))
        t = next(b for b in B if b.name.startswith('toes_01.' + s))
        d = t.head_local - f.head_local; d.z = 0; fwd += d.normalized()
    ang = math.atan2(fwd.x, -fwd.y)                 # angle from -Y
    log('toes point %s in Blender -> turning %.1f deg to face -Y (glTF +Z)' % (tuple(round(v, 3) for v in fwd.normalized()), -math.degrees(ang)))
    s = HEIGHT / (mx.z - mn.z)
    cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
    hips = next(b for b in B if b.name.startswith('root.x')).head_local
    M = Matrix.Rotation(ang, 4, 'Z') @ Matrix.Scale(s, 4) @ Matrix.Translation((-hips.x, -hips.y, -mn.z))
    for o in [arm] + meshes:
        o.matrix_world = M @ o.matrix_world
    bpy.context.view_layer.update()
    apply_all()
    mn, mx = bbox()
    log('scaled x%.4f: bbox %s .. %s, %.3f m tall' % (s, tuple(round(v, 3) for v in mn), tuple(round(v, 3) for v in mx), mx.z - mn.z))

    # ---- bones: drop the empty roots, rename
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones

    def base(n):
        return re.sub(r'_\d+$', '', n)
    for b in list(eb):
        if base(b.name) in DROP_BONES:
            for c in b.children:
                c.parent = b.parent if b.parent and base(b.parent.name) not in DROP_BONES else None
    for b in list(eb):
        if base(b.name) in DROP_BONES:
            eb.remove(b)
    # THE HOOK IS IN HIS LEFT FIST but its bone hangs off spine_04 (in the
    # source rig a constraint carried it; constraints do not survive glTF), so
    # it is reparented to the hand, rest kept: it follows the arm now
    hook = next(b for b in eb if base(b.name) == 'hook')
    hook.parent = next(b for b in eb if base(b.name) == 'hand.l')
    bpy.ops.object.mode_set(mode='OBJECT')
    rename = {}
    for b in arm.data.bones:
        k = base(b.name)
        rename[b.name] = 'Character1_' + MAP[k] if k in MAP else k.replace('.', '_').replace(':', '_')
    if len(set(rename.values())) != len(rename):
        raise SystemExit('bone names collide after sanitizing')
    for old, new in rename.items():
        arm.data.bones[old].name = new           # (renames the vertex groups on the skinned meshes too)
    for o in meshes:
        for g in list(o.vertex_groups):
            if g.name not in arm.data.bones:
                o.vertex_groups.remove(g)
    log('%d bones, %d mapped: %s' % (len(arm.data.bones), len(MAP), ' '.join(sorted(n for n in rename.values() if n.startswith('Character1_')))))

    # ---- meshes: one UV, welded, decimated, weights kept
    total0 = total1 = 0
    for o in meshes:
        me = o.data
        while len(me.uv_layers) > 1:
            me.uv_layers.remove(me.uv_layers[-1])
        n0 = len(me.vertices)
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bm.to_mesh(me); bm.free()
        try:
            bpy.context.view_layer.objects.active = o
            bpy.ops.mesh.customdata_custom_splitnormals_clear()
        except Exception:
            pass
        for p in me.polygons:
            p.use_smooth = True
        n1 = len(me.vertices)
        r = RATIO.get(src_name[o], 1.0)
        if r < 1.0:
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True); bpy.context.view_layer.objects.active = o
            m = o.modifiers.new('dec', 'DECIMATE')
            m.decimate_type = 'COLLAPSE'; m.ratio = r
            if src_name[o] == 'skin_low':
                m.use_symmetry = True; m.symmetry_axis = 'X'
            bpy.ops.object.modifier_move_to_index(modifier='dec', index=0)
            bpy.ops.object.modifier_apply(modifier='dec')
        total0 += n0; total1 += len(me.vertices)
        log('  %-18s %5d verts -> welded %5d -> %5d' % (src_name[o], n0, n1, len(me.vertices)))
    log('  all meshes %d -> %d verts (Blender count; the export splits at seams again)' % (total0, total1))

    # ---- materials
    def mat_for(name, key, two):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        m.use_backface_culling = not two
        nt = m.node_tree
        bsdf = nt.nodes['Principled BSDF']
        bsdf.inputs['Metallic'].default_value = 0.0
        for slot, sock, cs in (('albedo', 'Base Color', 'sRGB'), ('rough', 'Roughness', 'Non-Color'), ('normal', None, 'Non-Color')):
            if key + '_' + slot not in maps:
                continue
            tex = nt.nodes.new('ShaderNodeTexImage')
            tex.image = bpy.data.images.load(maps[key + '_' + slot])
            tex.image.colorspace_settings.name = cs
            if slot == 'normal':
                nmn = nt.nodes.new('ShaderNodeNormalMap')
                nt.links.new(tex.outputs['Color'], nmn.inputs['Color'])
                nt.links.new(nmn.outputs['Normal'], bsdf.inputs['Normal'])
            else:
                nt.links.new(tex.outputs['Color'], bsdf.inputs[sock])
        return m
    mats = {'skin': mat_for('skrim_skin', 'skin', True),
            'cloth_other': mat_for('skrim_cloth', 'cloth_other', True),
            'eye_teeth': mat_for('skrim_eyes', 'eye_teeth', True)}
    groups = {}
    for o in meshes:
        old = o.data.materials[0].name if o.data.materials else 'skin'
        k = 'hook' if src_name[o] == 'Hook_low' else old
        o.data.materials.clear(); o.data.materials.append(mats['cloth_other' if k == 'hook' else old])
        for p in o.data.polygons:
            p.material_index = 0
        groups.setdefault(k, []).append(o)
    out_name = {'skin': 'skrim_body', 'cloth_other': 'skrim_cloth', 'eye_teeth': 'skrim_eyes', 'hook': 'skrim_hook'}
    for k, objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        j = bpy.context.view_layer.objects.active
        j.name = j.data.name = out_name[k]
        j.parent = arm
        j.modifiers[0].object = arm
        log('  %-12s %5d verts %5d tris' % (j.name, len(j.data.vertices), sum(len(p.vertices) - 2 for p in j.data.polygons)))
    arm.name = 'Skrim'; arm.data.name = 'Skrim'
    # the bones no vertex hangs on (measured after the decimate): parents kept for the hierarchy
    wt = set()
    for o in bpy.data.objects:
        if o.type == 'MESH':
            names = {g.index: g.name for g in o.vertex_groups}
            for v in o.data.vertices:
                wt.update(names[g.group] for g in v.groups if g.weight > 1e-4)
    unw = sorted(b.name for b in arm.data.bones if b.name not in wt)
    log('unweighted bones: %s' % ' '.join(unw))
    arm['bw_skrim'] = json.dumps({'height': HEIGHT, 'unweighted': unw})
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_animations=False,
                              export_extras=True, export_image_format='JPEG', export_jpeg_quality=85,
                              export_yup=True, export_apply=False, export_def_bones=False,
                              export_tangents=False, export_morph=False, export_texcoords=True,
                              export_normals=True)
    log('%s: %.2f MB' % (os.path.basename(dst), os.path.getsize(dst) / 1e6))


if __name__ == '__main__':
    if 'bpy' in sys.modules or os.environ.get('SKRIM_IN_BLENDER'):
        blender_main()
    else:
        os.makedirs(WORK, exist_ok=True)
        log('building maps')
        maps = build_maps()
        json.dump({'maps': maps, 'dst': os.path.join(ROOT, 'assets/skrim.glb')},
                  open(os.path.join(WORK, 'cfg.json'), 'w'))
        log('running blender')
        env = dict(os.environ, SKRIM_IN_BLENDER='1')
        r = subprocess.run([BLENDER, '-b', '-noaudio', '--python', os.path.abspath(__file__)],
                           env=env, capture_output=True, text=True)
        out = [l for l in r.stdout.split('\n') if l.startswith('[skrim]') or 'Error' in l or 'Traceback' in l]
        print('\n'.join(out[-80:]))
        if r.returncode:
            print(r.stderr[-3000:])
