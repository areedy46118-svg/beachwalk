"""THE OWNER'S BRAZIER (2026-11-26): "Brazier" by Helley, Sketchfab, CC-BY-4.0 — packed for the game.
Its textures are 2048² (about 19 MB of PNG): the colour goes down to 512 and the glow to 256, both JPEG; the normal map and the
metal/roughness map are dropped (no environment map in the game: METALNESS IS A TRAP), metal 0 and rough 0.85 instead.
Stood on its feet at y 0, centred on its stem, scaled from its centimetres to metres, and a still rendered to look at.
  /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/brazier_pack.py -- <scene.gltf> <out.glb> [still.png]
"""
import bpy, sys, os
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
still = argv[2] if len(argv) > 2 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
assert len(meshes) == 1, meshes
ob = meshes[0]
# bake every parent's transform into it, and drop the empties
bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True); bpy.context.view_layer.objects.active = ob
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.context.scene.objects):
    if o is not ob: bpy.data.objects.remove(o, do_unlink=True)
ws = [ob.matrix_world @ Vector(v.co) for v in ob.data.vertices]
mn = Vector((min(v.x for v in ws), min(v.y for v in ws), min(v.z for v in ws)))
mx = Vector((max(v.x for v in ws), max(v.y for v in ws), max(v.z for v in ws)))
print('BZ raw bbox', tuple(round(c, 3) for c in mn), tuple(round(c, 3) for c in mx))
# (Blender is z-up: the feet at z 0, its middle on the axis)
cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
for v in ob.data.vertices: v.co = Vector((v.co.x - cx, v.co.y - cy, v.co.z - mn.z))
h = mx.z - mn.z
print('BZ height', round(h, 3), 'width', round(mx.x - mn.x, 3), round(mx.y - mn.y, 3))
# the top of the bowl's rim: the highest ring of vertices — reported so the fire is set on it
zs = sorted(v.co.z for v in ob.data.vertices)
print('BZ z quantiles', [round(zs[int(len(zs) * q) - 1], 3) for q in (0.5, 0.75, 0.9, 0.97, 1.0)])
ob.name = 'brazier'
mat = ob.data.materials[0]
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
for inp in ('Normal', 'Metallic', 'Roughness'):
    for l in list(bsdf.inputs[inp].links): nt.links.remove(l)
bsdf.inputs['Metallic'].default_value = 0.0
bsdf.inputs['Roughness'].default_value = 0.85
for n in list(nt.nodes):
    if n.type in ('NORMAL_MAP', 'SEPARATE_COLOR', 'SEPRGB', 'SEPARATE_RGB'): nt.nodes.remove(n)
keep = set()
for n in nt.nodes:
    if n.type == 'TEX_IMAGE' and n.image:
        used = any(l.to_node == bsdf or l.to_node.type in ('MIX', 'MIX_RGB', 'EMISSION') for o in n.outputs for l in o.links)
        if not used: nt.nodes.remove(n); continue
        nm = n.image.name.lower()
        size = 256 if 'emissive' in nm else 512
        n.image.scale(size, size)
        n.image.file_format = 'JPEG'
        keep.add(n.image.name)
        print('BZ tex', n.image.name, size)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=82,
                          export_normals=True, export_tangents=False, export_materials='EXPORT', use_selection=False,
                          export_apply=True, export_yup=True)
print('BZ wrote', out, os.path.getsize(out))
if still:
    sc = bpy.context.scene
    cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
    co.location = (h * 1.1, -h * 1.3, h * 0.95)
    d = Vector((0, 0, h * 0.5)) - co.location
    co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    l = bpy.data.lights.new('s', 'SUN'); l.energy = 3; lo = bpy.data.objects.new('s', l); sc.collection.objects.link(lo); lo.rotation_euler = (0.8, 0.2, 0.6)
    sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.05, 0.05, 0.06)
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x = 420; sc.render.resolution_y = 520; sc.render.filepath = still
    bpy.ops.render.render(write_still=True)
