"""THE MARIONETTE IN THE WASHER, RIGGED (2026-11-21, the owner: "rig it ... rig the model properly"). Pigcraft's "Wooden
Marionette - Haunted Puppet Horror" (CC-BY-4.0, credited in README) is a Tripo export: ONE fused shell of 1.9 M triangles,
no skeleton. Run inside Blender:

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/marionette_rig.py -- incoming/marionette/scene.gltf OUT.glb
    then: /usr/bin/python3 tools/marionette_retro.py OUT.glb assets/marionette.glb

 - RETRO, NOT A SCAN (2026-11-21, the owner: "have the washer puppet look retro i dont want it to seem like a ai model"):
   decimated to ~6 k triangles (collapse, after welding the seams the exporter split) and the game draws him flat-shaded;
   the 4 K colour map leaves at 256 and `tools/marionette_retro.py` cuts it to a small palette with nearest filtering, the
   normal and metal-rough maps dropped (no environment map: METALNESS IS A TRAP). The AI model's soft sculpted detail —
   what made it read as generated — is what goes.
 - THE STRINGS GO. The threads from his head to his hands and knees are part of the shell; anything further from its own
   bone than that piece of wood is thick is cut away (so a puppet that has torn loose has none).
 - THE SKELETON IS MIXAMO'S, named `Character1_*` — the HumanIK naming every moves pack in the game maps FROM, so
   `ntarRetarget` drives him with no table (the beach pack's own trick). Joints placed off orthographic front and side
   renders of the file (`tools/kelleyshot.html?mode=ortho`), in three's frame (+y up, +z his front, +x his left).
 - WEIGHTS ARE WOOD. He is jointed wood: every piece follows one bone. The trunk is cut by height (head / neck dowel /
   chest block / spine dowel / pelvis block); each limb's vertices go to the nearest bone of THAT limb, blended only over
   a few millimetres at the joint balls, so nothing bends like rubber."""
import bpy, bmesh, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
TARGET_TRIS = int(argv[2]) if len(argv) > 2 else 6000

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in bpy.context.scene.objects: o.select_set(False)
for o in ms:
    o.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.context.scene.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o)
body.name = 'marionette'

# three's frame <-> Blender's: B(x, y, z) = (x3, -z3, y3)
T = lambda x, y, z: Vector((x, -z, y))
F = lambda v: (v.x, v.z, -v.y)

# ---- weld, decimate
bm = bmesh.new(); bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002)
bm.to_mesh(body.data); bm.free()
n0 = len(body.data.polygons)
dec = body.modifiers.new('dec', 'DECIMATE'); dec.decimate_type = 'COLLAPSE'; dec.ratio = TARGET_TRIS / max(1, n0); dec.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier='dec')
print('decimated', n0, '->', len(body.data.polygons))
# the strings, by their shape: what is left of a thread after the collapse is a run of long hair-thin slivers — a face over
# 3 cm long and under 3 mm across, anywhere but the head (whose cracks are carved, not strung)
bm = bmesh.new(); bm.from_mesh(body.data); bm.faces.ensure_lookup_table()
thin = []
for f in bm.faces:
    L = max(e.calc_length() for e in f.edges)
    if L > 0.03 and 2 * f.calc_area() / L < 0.003 and f.calc_center_median().z < 0.80 + 0.0:
        thin.append(f)
bmesh.ops.delete(bm, geom=thin, context='FACES_ONLY')
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context='VERTS')
bm.to_mesh(body.data); bm.free()
print('slivers (strings) cut:', len(thin))

# ---- the skeleton (three's frame), Mixamo's chain
J = {
    'Hips': ((0, 0.500, 0), (0, 0.555, 0), None),
    'Spine': ((0, 0.555, 0), (0, 0.600, -0.005), 'Hips'),
    'Spine1': ((0, 0.600, -0.005), (0, 0.670, -0.007), 'Spine'),
    'Spine2': ((0, 0.670, -0.007), (0, 0.752, -0.010), 'Spine1'),
    'Neck': ((0, 0.752, -0.010), (0, 0.785, -0.012), 'Spine2'),
    'Head': ((0, 0.785, -0.012), (0, 0.980, -0.015), 'Neck'),
}
for s, k in (('Left', 1), ('Right', -1)):
    J[s + 'Shoulder'] = ((0.02 * k, 0.715, -0.005), (0.100 * k, 0.715, 0.0), 'Spine2')
    J[s + 'Arm'] = ((0.100 * k, 0.715, 0.0), (0.180 * k, 0.585, 0.008), s + 'Shoulder')
    J[s + 'ForeArm'] = ((0.180 * k, 0.585, 0.008), (0.226 * k, 0.445, 0.012), s + 'Arm')
    J[s + 'Hand'] = ((0.226 * k, 0.445, 0.012), (0.236 * k, 0.350, 0.012), s + 'ForeArm')
    J[s + 'UpLeg'] = ((0.070 * k, 0.470, 0.0), (0.087 * k, 0.330, 0.008), 'Hips')
    J[s + 'Leg'] = ((0.087 * k, 0.330, 0.008), (0.090 * k, 0.125, 0.0), s + 'UpLeg')
    J[s + 'Foot'] = ((0.090 * k, 0.125, 0.0), (0.090 * k, 0.035, 0.050), s + 'Leg')
    J[s + 'ToeBase'] = ((0.090 * k, 0.035, 0.050), (0.090 * k, 0.030, 0.105), s + 'Foot')
order = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'] + [s + p for s in ('Left', 'Right') for p in ('Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase')]

arm_data = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('rig', arm_data)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
for o in bpy.context.scene.objects: o.select_set(False)
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb = {}
for n in order:
    h, t, p = J[n]
    b = arm_data.edit_bones.new('Character1_' + n)
    b.head = T(*h); b.tail = T(*t)
    b.roll = 0
    if p: b.parent = eb[p]; b.use_connect = False
    eb[n] = b
bpy.ops.object.mode_set(mode='OBJECT')


# ---- weights: wood
def seg_d(p, a, b):
    ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / max(1e-12, ab.length_squared)))
    return (p - (a + ab * t)).length

SEG = {n: (Vector(J[n][0]), Vector(J[n][1])) for n in order}
ARM = ['Arm', 'ForeArm', 'Hand']; LEG = ['UpLeg', 'Leg', 'Foot', 'ToeBase']
RAD = {'Arm': 0.038, 'ForeArm': 0.036, 'Hand': 0.060, 'UpLeg': 0.045, 'Leg': 0.040, 'Foot': 0.070, 'ToeBase': 0.070}   # (each piece's half-thickness and a little: measured off the ortho renders)
me = body.data
vg = {n: body.vertex_groups.new(name='Character1_' + n) for n in order}
drop = []
for v in me.vertices:
    x, y, z = F(v.co); p = Vector((x, y, z)); ax = abs(x); side = 'Left' if x >= 0 else 'Right'
    limb = None
    if y > 0.33 and (ax > 0.098 if y > 0.5 else ax > 0.135) and y < 0.76:
        limb = ARM
    elif y <= 0.468:
        limb = LEG
    if limb:
        ds = sorted((seg_d(p, *SEG[side + b]), b) for b in limb)
        if ds[0][0] > RAD[ds[0][1]]: drop.append(v.index); continue      # a string, not wood
        w = [(math.exp(-(d - ds[0][0]) / 0.004), b) for d, b in ds[:2]]
        s = sum(q for q, _ in w)
        for q, b in w:
            if q / s > 0.02: vg[side + b].add([v.index], q / s, 'REPLACE')
        continue
    if y > 0.775:
        if y < 0.85 and ax > 0.078: drop.append(v.index); continue         # (the strings off his head, under the ear pegs)
        vg['Head'].add([v.index], 1.0, 'REPLACE')
    elif y > 0.752:
        if ax > 0.035: drop.append(v.index); continue
        vg['Neck'].add([v.index], 1.0, 'REPLACE')
    elif y > 0.598:
        if ax > 0.084: drop.append(v.index); continue       # (the chest block is ±0.073; strings ran down its sides)
        vg['Spine2'].add([v.index], 1.0, 'REPLACE')
    elif y > 0.547:
        if ax > 0.032: drop.append(v.index); continue
        vg['Spine'].add([v.index], 1.0, 'REPLACE')
    else:
        if ax > 0.078: drop.append(v.index); continue
        vg['Hips'].add([v.index], 1.0, 'REPLACE')
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[i] for i in drop], context='VERTS')
# and the crumbs a cut string leaves: islands of a few faces
bm.verts.ensure_lookup_table()
seen = set(); small = []
for v0 in bm.verts:
    if v0 in seen: continue
    st = [v0]; seen.add(v0); isl = []
    while st:
        a = st.pop(); isl.append(a)
        for e in a.link_edges:
            b = e.other_vert(a)
            if b not in seen: seen.add(b); st.append(b)
    if len(isl) < 60: small.extend(isl)
bmesh.ops.delete(bm, geom=small, context='VERTS')
bm.to_mesh(me); bm.free()
print('strings cut:', len(drop), 'verts; crumbs', len(small), '; left', len(me.polygons), 'tris')

mod = body.modifiers.new('rig', 'ARMATURE'); mod.object = rig
body.parent = rig

# ---- the material: colour only, at 1024
mat = me.materials[0]
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
for inp in ('Normal', 'Metallic', 'Roughness'):
    for l in list(bsdf.inputs[inp].links): nt.links.remove(l)
bsdf.inputs['Metallic'].default_value = 0.0; bsdf.inputs['Roughness'].default_value = 0.9
img = None
for l in bsdf.inputs['Base Color'].links:
    if l.from_node.type == 'TEX_IMAGE': img = l.from_node.image
if img:
    img.scale(256, 256)
for n in list(nt.nodes):
    if n.type == 'TEX_IMAGE' and n.image is not img: nt.nodes.remove(n)

for o in bpy.context.scene.objects: o.select_set(False)
rig.select_set(True); body.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_skins=True, export_animations=False,
                          export_yup=True, export_image_format='JPEG', export_jpeg_quality=86, export_tangents=False,
                          export_texcoords=True, export_normals=True, export_materials='EXPORT')
print('wrote', OUT)
