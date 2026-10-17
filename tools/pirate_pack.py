"""Build assets/pirate-props.glb from the owner's "Pirate Ship Assets" pack.

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/pirate_pack.py

"Pirate Ship Assets" by Liaval (Sketchfab, CC-BY-4.0), delivered as
~/Desktop/Shipwreck/pirate_ship_assets.zip: one glTF whose eighteen props are
merged into five meshes by material and laid out side by side. This splits
them back into props (loose parts, grouped where their boxes touch), keeps
the ones that belong on a wrecked working boat — no cannon, no cutlass, no
treasure chest, and the owner's own chest and wheel stay — and writes ONE
NAMED NODE PER PIECE, the furniture packer's rules:
  * each piece centred on itself with its base at y = 0 (a piece measured
    about the set's origin is wrong the instant anything moves it);
  * the maps come down at source: colour and normal to 512 JPEG, the
    metallic-roughness maps dropped (METALNESS IS A TRAP: no environment map
    in this game, and a metal has no diffuse term);
  * the barrel's lid, a separate piece in the pack, is put back on it.
"""
import bpy, os, sys, zipfile, tempfile, mathutils

ZIP = os.path.expanduser('~/Desktop/Shipwreck/pirate_ship_assets.zip')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'pirate-props.glb')
TEX = 512

def log(*a): print('[pirate]', *a); sys.stdout.flush()

tmp = tempfile.mkdtemp()
with zipfile.ZipFile(ZIP) as z: z.extractall(tmp)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(tmp, 'scene.gltf'))

# bake every node's transform, then split each merged mesh into its loose parts
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
for o in [o for o in bpy.data.objects if o.type != 'MESH']: bpy.data.objects.remove(o, do_unlink=True)

def bb(o):
    ws = [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]
    return [min(v[i] for v in ws) for i in range(3)], [max(v[i] for v in ws) for i in range(3)]
parts = [o for o in bpy.data.objects if o.type == 'MESH']
B = [bb(o) for o in parts]
par = list(range(len(parts)))
def find(i):
    while par[i] != i: par[i] = par[par[i]]; i = par[i]
    return i
M = 0.015
for i in range(len(parts)):
    for j in range(i + 1, len(parts)):
        a, b = B[i], B[j]
        if all(a[0][k] - M <= b[1][k] and b[0][k] - M <= a[1][k] for k in range(3)): par[find(i)] = find(j)
groups = {}
for i in range(len(parts)): groups.setdefault(find(i), []).append(parts[i])
props = []
for objs in sorted(groups.values(), key=lambda os_: min(bb(o)[0][1] for o in os_)):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    props.append(bpy.context.view_layer.objects.active)
log(len(props), 'props in the pack')

# which is which, in the pack's own layout order (measured: see the contact sheet in the notes)
# (a crab boat, by the owner's word: the stocked anchor, the cannon, the shot,
# the cutlass and the treasure chest are left in the pack)
NAMES = {3: 'barrel_lantern', 5: 'barrel', 6: '_lid', 8: 'crate_lid', 9: 'crate_open',
         10: 'crate', 12: 'sacks', 13: 'crate_small', 14: 'plank', 15: 'sack', 17: 'pallet'}
keep = {}
for i, o in enumerate(props):
    if i in NAMES: o.name = NAMES[i]; keep[o.name] = o
    else: bpy.data.objects.remove(o, do_unlink=True)

# the lid back on the open barrel, as a closed barrel; the open one stays too
barrel, lid = keep['barrel'], keep['_lid']
bl, bh = bb(barrel); ll, lh = bb(lid)
open_b = barrel.copy(); open_b.data = barrel.data.copy(); bpy.context.collection.objects.link(open_b); open_b.name = 'barrel_open'
lid.location += mathutils.Vector(((bl[0] + bh[0]) / 2 - (ll[0] + lh[0]) / 2, (bl[1] + bh[1]) / 2 - (ll[1] + lh[1]) / 2, bh[2] - 0.03 - ll[2]))
bpy.ops.object.select_all(action='DESELECT'); lid.select_set(True); barrel.select_set(True); bpy.context.view_layer.objects.active = barrel
bpy.ops.object.join(); barrel.name = 'barrel'

# each piece on its own origin: centred in plan, base at 0
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    lo, hi = bb(o)
    off = mathutils.Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]))
    o.data.transform(mathutils.Matrix.Translation(-off)); o.location = (0, 0, 0)
    for p in o.data.polygons: p.use_smooth = False
    lo, hi = bb(o)
    log(o.name, 'size', [round(hi[i] - lo[i], 3) for i in range(3)], 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))

# materials: no metal, no gloss, the maps down to TEX
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    nt = mat.node_tree; bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: continue
    for k in ('Metallic', 'Roughness'):
        for l in list(bsdf.inputs[k].links): nt.links.remove(l)
    bsdf.inputs['Metallic'].default_value = 0.0; bsdf.inputs['Roughness'].default_value = 1.0
    for n in list(nt.nodes):
        if n.type == 'TEX_IMAGE' and not n.outputs['Color'].links and not n.outputs['Alpha'].links: nt.nodes.remove(n)
for img in bpy.data.images:
    try: _ = img.pixels[0]
    except Exception: pass
    if img.size[0] > TEX: img.scale(TEX, max(1, int(img.size[1] * TEX / img.size[0])))

bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o.type == 'MESH': o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True,
                          export_image_format='JPEG', export_jpeg_quality=82, export_normals=True)
log('wrote', os.path.abspath(OUT), os.path.getsize(OUT), 'bytes')
