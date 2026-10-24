"""THE FLASHLIGHT BY THE GENERATOR — the owner's "FlashlightFBX" pack, its Fulton (the green angle-head tube), for Beachwalk.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/flashlight_pack.py -- <FlashlightFBX folder>

The pack is five FBXs (Box, Cutesy, Fulton, Normal, Outdoor) with flat-colour materials and no textures; the owner
asked for "the small green tube flashlight", which is Fulton: an olive tube with the head bent over at the top, the
lens (its near-white material, `Material.002`) looking out sideways off the bend. It comes in 1.36 units tall and
19,176 faces; it leaves at FLASH_H metres, decimated to about DECIMATE of that, stood on its foot (origin at the
middle of its base), the lens's centre and facing logged for the game (`FLASH` in main.js).
"""
import bpy, bmesh, mathutils, os, sys

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = args[0] if args else os.path.expanduser('~/Downloads/FlashlightFBX')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'flashlight.glb')
FLASH_H, DECIMATE = 0.19, 0.16

def log(*a):
    print('[flash]', *a); sys.stdout.flush()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, 'Fulton.fbx'))
ob = next(o for o in bpy.data.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data
# the lens: the faces on the near-white material, their area-weighted centre and normal (before anything moves)
li = next(i for i, m in enumerate(me.materials) if m and m.name == 'Material.002')
c = mathutils.Vector(); n = mathutils.Vector(); A = 0
for p in me.polygons:
    if p.material_index == li: c += p.center * p.area; n += p.normal * p.area; A += p.area
c /= A; n.normalize()
lo = mathutils.Vector((min(v.co.x for v in me.vertices), min(v.co.y for v in me.vertices), min(v.co.z for v in me.vertices)))
hi = mathutils.Vector((max(v.co.x for v in me.vertices), max(v.co.y for v in me.vertices), max(v.co.z for v in me.vertices)))
k = FLASH_H / (hi.z - lo.z)
foot = mathutils.Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
for v in me.vertices: v.co = (v.co - foot) * k
lens = (c - foot) * k
# Blender z-up -> glTF y-up: (x, y, z) -> (x, z, -y)
log('lens centre (game frame) %.4f %.4f %.4f, facing %.3f %.3f %.3f' % (lens.x, lens.z, -lens.y, n.x, n.z, -n.y))
log('size (game frame) %.3f x %.3f x %.3f' % ((hi.x - lo.x) * k, (hi.z - lo.z) * k, (hi.y - lo.y) * k))
mod = ob.modifiers.new('dec', 'DECIMATE'); mod.ratio = DECIMATE
bpy.ops.object.modifier_apply(modifier=mod.name)
log('faces', len(me.polygons))
for m in me.materials:
    if m and m.use_nodes:
        b = next((x for x in m.node_tree.nodes if x.type == 'BSDF_PRINCIPLED'), None)
        if b: b.inputs['Metallic'].default_value = 0.0        # METALNESS IS A TRAP
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True, export_animations=False,
                          export_texcoords=False, export_normals=True, export_materials='EXPORT')
log('wrote', os.path.relpath(OUT), '%d KB' % (os.path.getsize(OUT) / 1024))
