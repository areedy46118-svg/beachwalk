"""Build assets/gull.glb from the gull in the owner's bird collection.

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/gull_pack.py

The collection is one OBJ of 22 figurines (bird+collection.obj) with the
textures in a zip beside it; the gull is the object `gull_Figur`, modelled in
flight with its wings spread, 10.5k quads, a single 1448x420 albedo (white,
with the beak and eye painted on). It is kept as is, decimated to ~1.8k
triangles, scaled to a 1.3 m wingspan, its albedo cut to 256 px, and given
the colours a gull actually has as vertex colours (grey mantle, black wing
tips) since the map is all white. Two shape keys, `up` and `down`, curl the
wings about the shoulders; the game blends between them to flap.
Faces +Z in the GLB (Blender -Y), wings along X, origin at the body.
"""
import bpy, os, sys, math, zipfile, tempfile

SRC = os.path.expanduser('~/Desktop/Shipwreck/bird+collection.obj')
ZIP = os.path.expanduser('~/Desktop/Shipwreck/textures.zip')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'gull.glb')
TRIS, SPAN, SHOULDER = 1800, 1.3, 0.12   # shoulder: half-width of the body, in metres after scaling

def log(*a): print("[gull]", *a); sys.stdout.flush()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name != 'gull_Figur': bpy.data.objects.remove(o, do_unlink=True)
g = bpy.data.objects['gull_Figur']; g.name = 'gull'
bpy.context.view_layer.objects.active = g; g.select_set(True)
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS'); g.location = (0, 0, 0)
s = SPAN / g.dimensions.x; g.scale = (s, s, s)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
tris0 = sum(len(p.vertices) - 2 for p in g.data.polygons)
d = g.modifiers.new('dec', 'DECIMATE'); d.decimate_type = 'COLLAPSE'; d.ratio = min(1, TRIS / tris0)
bpy.ops.object.modifier_apply(modifier='dec')
for p in g.data.polygons: p.use_smooth = False
log('tris', tris0, '->', sum(len(p.vertices) - 2 for p in g.data.polygons), 'dims', tuple(round(v, 3) for v in g.dimensions))

# the map: out of the zip, down to 256 wide, PNG
tmp = tempfile.mkdtemp()
with zipfile.ZipFile(ZIP) as z: z.extract('textures/gull.tif', tmp)
img = bpy.data.images.load(os.path.join(tmp, 'textures', 'gull.tif'))
_ = img.pixels[0]
img.scale(256, 128); img.file_format = 'PNG'; img.name = 'gull'
mat = bpy.data.materials.new('gull'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Closest'
nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 1.0
g.data.materials.clear(); g.data.materials.append(mat)

# vertex colours: black tips past 78 % of the half-span, grey on the upper wing
half = SPAN / 2
col = g.data.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
for p in g.data.polygons:
    up = p.normal.z
    for li in p.loop_indices:
        v = g.data.vertices[g.data.loops[li].vertex_index].co
        t = abs(v.x) / half
        c = 1.0
        if t > 0.30 and up > 0.2: c = 0.70                      # the mantle and upper wing
        if t > 0.78: c = 0.16 + 0.5 * max(0, 0.86 - t) / 0.08   # the black tips, a short fade in
        col.data[li].color = (c, c, c, 1)

# flap: rotate each wing about its shoulder, curling more toward the tip
def flap(name, ang):
    k = g.shape_key_add(name=name, from_mix=False)
    for i, v in enumerate(g.data.vertices):
        x, z = v.co.x, v.co.z
        r = abs(x) - SHOULDER
        if r <= 0: continue
        th = ang * (0.55 + 0.45 * min(1, r / (half - SHOULDER)))
        sx = 1 if x > 0 else -1
        k.data[i].co.x = sx * (SHOULDER + r * math.cos(th))
        k.data[i].co.z = z + r * math.sin(th)
g.shape_key_add(name='Basis', from_mix=False)
flap('up', math.radians(42)); flap('down', math.radians(-34))

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True,
                          export_morph=True, export_morph_normal=False, export_vertex_color='ACTIVE',
                          export_normals=False, export_image_format='AUTO', export_yup=True)
log('wrote', os.path.abspath(OUT), os.path.getsize(OUT), 'bytes')
