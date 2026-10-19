"""Blender stage of tools/swordknights_pack.py: the man-at-arms' larger meshes collapsed to a third (118k faces -> 40k,
2026-10-19: "the castle lags very badly" — he was the heaviest thing drawn in Castle XIII), the skin carried through (the
decimate applied BEFORE the armature). Run by the packer:
    Blender -b --factory-startup -P tools/swordknights_decimate.py -- <src.gltf> <out.gltf> <ratio>"""
import bpy, sys
args = sys.argv[sys.argv.index('--')+1:]
src, out, ratio = args[0], args[1], float(args[2])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
tot0 = tot1 = 0
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    n0 = len(o.data.polygons); tot0 += n0
    if n0 > 1200:
        bpy.context.view_layer.objects.active = o
        for s in bpy.context.selected_objects: s.select_set(False)
        o.select_set(True)
        m = o.modifiers.new('dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = ratio; m.use_collapse_triangulate = True
        # the decimate must sit BEFORE the armature, or it is applied to a posed copy
        while o.modifiers.find('dec') > 0: bpy.ops.object.modifier_move_up(modifier='dec')
        bpy.ops.object.modifier_apply(modifier='dec')
    tot1 += len(o.data.polygons)
print('FACES', tot0, '->', tot1)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLTF_SEPARATE', export_animations=False, export_skins=True, export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT', export_image_format='AUTO', export_yup=True)
