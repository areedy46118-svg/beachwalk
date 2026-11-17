"""THE DARK KNIGHT'S NEW BODY (2026-11-16, the owner: "make this the dark knights model … his size should be the same
scale as him"). DJMaesen's "Paladin" (Sketchfab, CC-BY-4.0 — commercial use allowed) into assets/paladin-knight.glb:

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/paladin_pack.py -- <paladin folder> <out.glb>

WHAT IS IN IT. A 65-bone FBX rig in CENTIMETRES, stood in an A-pose with the hands hanging open; two skinned meshes
(the man, 14.8k triangles; his cloth tabard, 590); and four rigid weapons hung off bones — a bastard sword standing
upright beside him (not in his hand), its scabbard on his back, a short sword in a scabbard at his hip. No animations.

THE RIG TAKES THE DARK KNIGHT'S NAMES (`b_MF_*`), so every line of his — `DK_JOINTS`, `DK_RAG` (the Sword and Shield
pack's retarget), `gaitToes`, `rig`, `dkSeat` — finds its joints on this body with nothing changed. The paladin's own
`spine_012` is the Infinity Blade rig's Spine_01 and `chest_013` its Spine_03; there is no Spine_02 (the retarget
carries world turns, so a missing middle bone is simply not written).

THE HANDS ARE CLOSED IN THE REST POSE. Nothing the game plays on him turns a finger (the retarget's map has none), so a
fist posed here, and made the rest, is the hand he fights with: each finger joint turned toward the palm about the axis
square to the finger and the palm's normal (the palm faces his thigh in the A-pose: the hand's side toward his
middle), the mesh baked into it, the pose applied as the rest.

THE SWORD GOES IN HIS RIGHT FIST, ON A BONE. The dark knight's `dkSeat` finds the blade off vertices skinned to
`b_MF_Weapon_R`: the bastard sword is measured off its own vertices (its long axis; the hilt is the end whose
cross-guard is widest, the grip the stretch between that guard and the pommel; the edge the blade's wide axis), put
with its grip in the middle of the closed fingers, the blade out past the thumb along the knuckle line and the edge
along the fingers, and skinned whole to a new `b_MF_Weapon_R` under the hand.

METRES, SMALL MAPS, NO METALNESS. A root node scales the whole file 0.01; every map comes down to 1024 (the man) or 512
(the tabard, the weapons) and is written JPEG; the metallic channel is cut (there is no environment here to reflect —
METALNESS IS A TRAP), the roughness kept.
"""
import bpy, sys, os, math
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'scene.gltf'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')

NAMES = {'hips_01': 'Pelvis', 'spine_012': 'Spine_01', 'chest_013': 'Spine_03', 'neck_061': 'Neck', 'head_062': 'Head'}
for s in ('L', 'R'):
    NAMES.update({f'{s}_shoulder_0{n}': f'Clavicle_{s}' for n in ('14', '38')})
SIDE = {'L': {'shoulder': '014', 'arm': '015', 'elbow': '016', 'wrist': '017', 'leg': '07', 'knee': '08', 'ankle': '09', 'foot': '010', 'toes': '011'},
        'R': {'shoulder': '038', 'arm': '039', 'elbow': '040', 'wrist': '041', 'leg': '02', 'knee': '03', 'ankle': '04', 'foot': '05', 'toes': '06'}}
TO = {'shoulder': 'Clavicle', 'arm': 'UpperArm', 'elbow': 'Forearm', 'wrist': 'Hand', 'leg': 'Thigh', 'knee': 'Calf', 'ankle': 'Foot', 'foot': 'Ball', 'toes': 'Toe'}
ren = {k: 'b_MF_' + v for k, v in NAMES.items() if not k.startswith(('L_shoulder', 'R_shoulder'))}
for s, d in SIDE.items():
    for part, num in d.items():
        ren[f'{s}_{part}_{num}'] = f'b_MF_{TO[part]}_{s}'
for b in arm.data.bones:
    if b.name in ren: b.name = ren[b.name]
missing = [v for v in ren.values() if v not in arm.data.bones]
print('RENAMED', len(ren), 'missing', missing)

# ---- the fists
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
# THE FILE'S POSE IS NOT ITS REST: in the scene he stands arms crossed with the sword across his chest, and his skin is
# bound in an A-pose. Everything the game plays is retargeted off the REST, so the pose is cleared to it first and only
# the fingers are turned (the first pack applied the crossed arms as the rest along with the fists).
bpy.ops.pose.select_all(action='SELECT')
bpy.ops.pose.transforms_clear()
bpy.context.view_layer.update()
P = arm.pose.bones
mw = arm.matrix_world
def wpos(name): return mw @ P[name].head
for s in ('L', 'R'):
    hand = 'b_MF_Hand_' + s
    k = (wpos(f'{s}_pink1_0' + ('34' if s == 'L' else '57')) - wpos(f'{s}_point1_0' + ('22' if s == 'L' else '45'))).normalized()
    mid1 = next(n for n in P.keys() if n.startswith(f'{s}_middle1'))
    d = (wpos(mid1) - wpos(hand)).normalized()
    n = k.cross(d).normalized()
    toward_body = Vector((1 if s == 'R' else -1, 0, 0))
    if n.dot(toward_body) < 0: n = -n                              # the palm faces his thigh
    print('PALM', s, tuple(round(x, 2) for x in n))
    chains = [[f'{s}_{f}{j}' for j in (1, 2, 3)] for f in ('point', 'middle', 'ring', 'pink')]
    ang = [math.radians(a) for a in (72, 95, 65)]
    for ch in chains:
        names = [next(x for x in P.keys() if x.startswith(c + '_')) for c in ch]
        for j, nm in enumerate(names):
            pb = P[nm]
            bpy.context.view_layer.update()
            head = mw @ pb.head
            kid = names[j + 1] if j + 1 < len(names) else None
            tipw = (mw @ P[kid].head) if kid else (mw @ pb.tail)
            dirw = (tipw - head).normalized()
            axis = dirw.cross(n).normalized()
            R = Matrix.Translation(head) @ Matrix.Rotation(ang[j], 4, axis) @ Matrix.Translation(-head)
            pb.matrix = mw.inverted() @ R @ mw @ pb.matrix
    # the thumb across the fingers, gently
    th = [next(x for x in P.keys() if x.startswith(f'{s}_thumb{j}_')) for j in (1, 2, 3)]
    for j, nm in enumerate(th):
        pb = P[nm]; bpy.context.view_layer.update()
        head = mw @ pb.head; dirw = ((mw @ P[th[j + 1]].head) if j < 2 else (mw @ pb.tail)) - head
        axis = dirw.normalized().cross(n).normalized()
        R = Matrix.Translation(head) @ Matrix.Rotation(math.radians((25, 35, 30)[j]), 4, axis) @ Matrix.Translation(-head)
        pb.matrix = mw.inverted() @ R @ mw @ pb.matrix
bpy.context.view_layer.update()
bpy.ops.object.mode_set(mode='OBJECT')
# bake the fists into the meshes, and make them the rest
skinned = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
for o in skinned:
    mod = next(m for m in o.modifiers if m.type == 'ARMATURE')
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.select_all(action='SELECT')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
for o in skinned:
    m = o.modifiers.new('Armature', 'ARMATURE'); m.object = arm

# ---- the sword in the right fist
sw = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('bastardsword'))
W = sw.matrix_world.copy(); sw.parent = None; sw.matrix_world = W
bpy.context.view_layer.objects.active = sw; bpy.ops.object.select_all(action='DESELECT'); sw.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
V = [v.co.copy() for v in sw.data.vertices]
c = sum(V, Vector()) / len(V)
# the long axis (power iteration on the covariance)
cov = [[sum((v[i] - c[i]) * (v[j] - c[j]) for v in V) for j in range(3)] for i in range(3)]
ax = Vector((0.3, 0.4, 0.9)).normalized()
for _ in range(60): ax = Vector([sum(cov[i][j] * ax[j] for j in range(3)) for i in range(3)]).normalized()
ts = [(v - c).dot(ax) for v in V]; lo, hi = min(ts), max(ts); L = hi - lo
def band(a, b):
    pts = [v - c - ax * ((v - c).dot(ax)) for v, t in zip(V, ts) if a <= t <= b]
    return pts
def spread(a, b):
    pts = band(a, b); return max((p.length for p in pts), default=0)
# the guard is the widest cross-section; the hilt is the end it is nearer
nb = 40; widths = [(spread(lo + L * i / nb, lo + L * (i + 1) / nb), i) for i in range(nb)]
gw, gi = max(widths)
hilt_lo = gi < nb / 2
if not hilt_lo: ax = -ax; ts = [-t for t in ts]; lo, hi = -hi, -lo; gi = nb - 1 - gi
guard_t = lo + L * (gi + 0.5) / nb
grip_t = (lo + guard_t) / 2                                       # between the pommel and the guard
grip = c + ax * grip_t
# the edge: the blade's wide axis, out past the guard
bp = band(guard_t + L * 0.1, hi - L * 0.1)
cov2 = [[sum(p[i] * p[j] for p in bp) for j in range(3)] for i in range(3)]
edge = Vector((1, 0, 0)) if abs(ax.x) < 0.9 else Vector((0, 1, 0))
for _ in range(60):
    edge = Vector([sum(cov2[i][j] * edge[j] for j in range(3)) for i in range(3)])
    edge -= ax * edge.dot(ax); edge.normalize()
print('SWORD length', round(L, 1), 'guard at', round((guard_t - lo) / L, 3), 'grip at', round((grip_t - lo) / L, 3), 'guard width', round(gw, 1))
# A GREAT-SWORD'S REACH (2026-11-16, measured `tools/dkwalk.js`): the dark knight's whole fight — every stand-off his
# blows are thrown from, how far a step may stretch — was tuned on a blade 2.0 m from the hand at his 2.7 m; the
# paladin's is 1.64, and his blows came down 0.35 m short of you from where the fight put him. The blade alone, past the
# guard, is drawn out 1.26x along its own axis (the hilt and the fist untouched): a great-sword in a 2.7 m knight's hands.
BLADE_K = 1.26
for v in sw.data.vertices:
    t = (v.co - c).dot(ax)
    if t > guard_t: v.co = v.co + ax * ((t - guard_t) * (BLADE_K - 1))
sw.data.update()
hi = guard_t + (hi - guard_t) * BLADE_K; L = hi - lo
print('BLADE drawn out', BLADE_K, 'length now', round(L, 1))
# the fist, at the new rest
bpy.context.view_layer.update()
B = arm.data.bones
def bh(n): return mw @ B[n].head_local
fing = [bh(n) for n in B.keys() if any(n.startswith(f'R_{f}{j}_') for f in ('point', 'middle', 'ring', 'pink') for j in (1, 2, 3))]
hole = sum(fing, Vector()) / len(fing)
k_to_thumb = (bh(next(n for n in B.keys() if n.startswith('R_point1_'))) - bh(next(n for n in B.keys() if n.startswith('R_pink1_')))).normalized()
dfin = (bh(next(n for n in B.keys() if n.startswith('R_middle1_'))) - bh('b_MF_Hand_R')).normalized()
dfin = (dfin - k_to_thumb * dfin.dot(k_to_thumb)).normalized()
# the sword's frame (blade, edge, their cross) onto the fist's (knuckle line toward the thumb, the fingers, their cross)
src = Matrix((ax, edge, ax.cross(edge))).transposed()
dst = Matrix((k_to_thumb, dfin, k_to_thumb.cross(dfin))).transposed()
Rm = (dst @ src.inverted()).to_4x4()
M = Matrix.Translation(hole) @ Rm @ Matrix.Translation(-grip)
sw.data.transform(M); sw.data.update()
print('FIST hole', tuple(round(x, 2) for x in hole), 'blade toward', tuple(round(x, 2) for x in k_to_thumb))
# a bone for it under the hand, and the sword skinned whole to it
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
wb = eb.new('b_MF_Weapon_R'); wb.head = mw.inverted() @ hole; wb.tail = mw.inverted() @ (hole + k_to_thumb * 20); wb.parent = eb['b_MF_Hand_R']
bpy.ops.object.mode_set(mode='OBJECT')
vg = sw.vertex_groups.new(name='b_MF_Weapon_R'); vg.add(list(range(len(sw.data.vertices))), 1.0, 'REPLACE')
sw.parent = arm; sw.matrix_parent_inverse = arm.matrix_world.inverted()
m = sw.modifiers.new('Armature', 'ARMATURE'); m.object = arm
sw.name = 'bastardsword'

# ---- the maps and the metal
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: continue
    for l in list(bsdf.inputs['Metallic'].links): nt.links.remove(l)
    bsdf.inputs['Metallic'].default_value = 0.0
    size = 1024 if 'paladin' in mat.name else 512
    for n in nt.nodes:
        if n.type == 'TEX_IMAGE' and n.image and n.image.size[0] > size:
            n.image.scale(size, size); n.image.pack()
# ---- metres, and out
root = bpy.data.objects.new('PaladinRoot', None); bpy.context.scene.collection.objects.link(root)
tops = [o for o in bpy.data.objects if o.parent is None and o is not root and not o.name.startswith('Icosphere')]
for o in tops: o.parent = root
root.scale = (0.01, 0.01, 0.01)
bpy.context.view_layer.update()
lo_z = min((o.matrix_world @ Vector(cn)).z for o in bpy.data.objects if o.type == 'MESH' for cn in o.bound_box)
hi_z = max((o.matrix_world @ Vector(cn)).z for o in skinned for cn in o.bound_box)
print('HEIGHT', round(hi_z - lo_z, 3))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, export_animations=False, export_yup=True, export_image_format='JPEG')
print('WROTE', OUT, os.path.getsize(OUT))
