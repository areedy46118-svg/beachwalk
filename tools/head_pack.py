"""Build assets/head.glb from alexrmartinez's "Severed head" scan.

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/head_pack.py

327k triangles in seven chunks (the Sketchfab splitter's chunks, not LODs)
with a 2K albedo, normal and metal-rough set. `tools/gltfpack.py --decimate`
cannot do this one: its vertex clustering keeps positions and indices ONLY,
and a face is a UV atlas — with the UVs gone the head rendered as a flat red
blob. Blender's collapse decimate keeps the UVs, so the seven chunks are
joined here, decimated to ~20k, the three maps cut to 1024 / 512 / 512 and
re-encoded as JPEG, and the lot exported as one GLB. The scan comes out at
whatever scale it was captured at; the game measures it and scales it to a
head when it loads. Nothing else is touched: the whole point of the thing is
that it looks exactly like the photographs.
"""
import bpy, os, sys

SRC = '/Users/ethanreedy/Downloads/severed_head/scene.gltf'
OUT = '/Users/ethanreedy/Dev/beachwalk/assets/head.glb'
SP = '/private/tmp/claude-501/-Users-ethanreedy-Dev-beachwalk/86ac18b9-ad0c-4a6c-974a-c4c4d6a8f782/scratchpad/headtex'
BUDGET = 20000

def log(*a): print("[head]", *a); sys.stdout.flush()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
log("imported", len(meshes), "pieces")
bpy.ops.object.select_all(action='DESELECT')
for m in meshes: m.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
head = bpy.context.view_layer.objects.active
head.name = 'severed_head'
# bake the node transforms so the geometry is what you see
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
tris0 = sum(len(p.vertices) - 2 for p in head.data.polygons)
d = head.modifiers.new("dec", 'DECIMATE'); d.decimate_type = 'COLLAPSE'
d.ratio = min(1.0, BUDGET / max(1, tris0))
bpy.ops.object.modifier_apply(modifier="dec")
tris1 = sum(len(p.vertices) - 2 for p in head.data.polygons)
for p in head.data.polygons: p.use_smooth = True
log("decimated", tris0, "->", tris1, "tris; uv layers", len(head.data.uv_layers))

# the maps: down to game size, and JPEG
os.makedirs(SP, exist_ok=True)
for img in bpy.data.images:
    # the glTF importer loads images LAZILY: has_data is False for all three
    # until something touches the pixels, and the first build skipped every
    # map and shipped the 2K PNGs whole — 10 MB
    try: _ = img.pixels[0]
    except Exception: pass
    if not img.size[0]: continue
    name = img.name.lower()
    size = 512 if ('normal' in name or 'metallic' in name or 'rough' in name) else 1024
    if max(img.size) > size: img.scale(size, size)
    img.file_format = 'JPEG'
    path = os.path.join(SP, os.path.splitext(img.name)[0] + '.jpg')
    bpy.context.scene.render.image_settings.file_format = 'JPEG'
    bpy.context.scene.render.image_settings.quality = 86
    img.save_render(path)
    img.filepath = path; img.source = 'FILE'; img.reload()
    log("  map", img.name, "->", size, "px jpeg", os.path.getsize(path) // 1024, "KB")
for img in bpy.data.images:
    try: img.pack()
    except Exception: pass

xs = [v.co.x for v in head.data.vertices]; ys = [v.co.y for v in head.data.vertices]; zs = [v.co.z for v in head.data.vertices]
log("bounds x %.3f..%.3f  y %.3f..%.3f  z %.3f..%.3f" % (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True,
                          export_materials='EXPORT', export_image_format='AUTO', export_animations=False)
log("DONE", os.path.getsize(OUT), "bytes")
