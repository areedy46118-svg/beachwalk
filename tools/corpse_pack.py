"""Decimate assets/corpse.glb in place — the body bag, and mostly its ropes.

    "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --python tools/corpse_pack.py

11.6 MB and 277,900 triangles, and the file is ALMOST ENTIRELY GEOMETRY: all
six of its maps together are 898 KB. So this is a triangle problem and not a
texture one, and the triangles are not spread evenly — the bag is 43,264 and
the ROPES are 234,636 across five meshes, 84 % of the model.

That asymmetry is the whole design of this packer. The bag carries the
silhouette you read from a hundred metres down the beach and it keeps most of
what it has; the ropes are a detail you only ever read stood over the thing,
they are already far-culled at 45 m, and a scanned rope bundle at 47,000
triangles a piece is detail nothing in this game can show.

`tools/gltfpack.py --decimate` CANNOT do this one, for the reason the severed
head already paid for: its vertex clustering keeps positions and indices only,
and these meshes are a UV atlas over a diffuse and a normal map. Blender's
collapse decimate keeps the UVs.

Nothing else is touched. The maps are not resized or re-encoded, the node
hierarchy and every object transform is left exactly as it was (the game adds
gltf.scene to a group it positions itself), and the three materials keep their
own baseColorFactor and roughnessFactor — the bag's base is a 0.5 grey, not
white, and losing that would brighten it on a beach where it is meant to read
as a dark shape.
"""
import bpy, os, sys, json, struct

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'assets', 'corpse.glb')
OUT = SRC

# how much of each part survives. The bag is the silhouette; the ropes are the
# detail, and they are 84 % of the file.
KEEP_BAG = 0.40
KEEP_ROPE = 0.22

def log(*a):
    print('[corpse]', *a); sys.stdout.flush()

def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
log('imported', len(meshes), 'meshes')

before = after = 0
for ob in meshes:
    n0 = tris(ob)
    before += n0
    mat = ob.data.materials[0].name if ob.data.materials else ''
    keep = KEEP_BAG if 'Bag' in mat else KEEP_ROPE
    d = ob.modifiers.new('dec', 'DECIMATE')
    d.decimate_type = 'COLLAPSE'
    d.use_collapse_triangulate = True      # a ratio is OF TRIANGLES, not of faces
    d.ratio = keep
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier='dec')
    n1 = tris(ob)
    after += n1
    log('%-30s %7d -> %6d  (%s, keep %.2f)' % (ob.name[:30], n0, n1, mat, keep))

log('TOTAL %d -> %d triangles (%.1fx)' % (before, after, before / max(1, after)))

bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    export_image_format='AUTO',   # no roughness maps here, so nothing is synthesised
    export_materials='EXPORT',
    export_normals=True,
    export_texcoords=True,
    export_yup=True,
    export_apply=False,           # transforms are the scene's; do not bake them
    use_selection=False,
)
log('wrote', OUT, '%.2f MB' % (os.path.getsize(OUT) / 1048576))
