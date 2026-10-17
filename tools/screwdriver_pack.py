"""Build assets/screwdriver.glb from the owner's CC0 screwdriver.

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/screwdriver_pack.py

"CC0 - Screwdriver" (Sketchfab, CC0), delivered as
~/Desktop/Shipwreck/Screwdriver/cc0_-_screwdriver_1k.glb: one mesh, 9.5 units
long down its Z, three 1024 PNG maps and two UV channels nothing reads. The
furniture packer's rules:
  * the transforms baked, the tool laid along +X (tip toward +X) and centred
    on itself, at a real flathead's length (SIZE);
  * the maps come down at source: colour and normal to 512 JPEG, the
    metallic-roughness/occlusion map dropped (METALNESS IS A TRAP: there is
    no environment map in this game, and a metal has no diffuse term);
  * one UV channel, no tangents.
"""
import bpy, os, sys

SRC = os.path.expanduser('~/Desktop/Shipwreck/Screwdriver/cc0_-_screwdriver_1k.glb')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'screwdriver.glb')
SIZE = 0.21          # metres, end to end
TEX = 512

def log(*a): print('[screwdriver]', *a); sys.stdout.flush()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
assert len(meshes) == 1, meshes
o = meshes[0]
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for x in [x for x in bpy.data.objects if x.type != 'MESH']: bpy.data.objects.remove(x, do_unlink=True)

# THE LONG AXIS IS A DIAGONAL. The tool lies tilted in its own box (its two
# ends sit 7 cm apart across it), so the box's longest side is not its
# length. The principal axis of the vertices is, and that goes onto +X.
import mathutils
me = o.data
vs = [v.co.copy() for v in me.vertices]
c = sum(vs, mathutils.Vector()) / len(vs)
C = mathutils.Matrix(((0, 0, 0), (0, 0, 0), (0, 0, 0)))
for v in vs:
    d = v - c
    for i in range(3):
        for j in range(3): C[i][j] += d[i] * d[j]
ax = mathutils.Vector((1, 1, 1)).normalized()
for _ in range(60): ax = (C @ ax).normalized()
log('principal axis', [round(x, 3) for x in ax])
R = ax.rotation_difference(mathutils.Vector((1, 0, 0))).to_matrix()
for v in me.vertices: v.co = R @ (v.co - c)
me.update()
vs = [v.co for v in me.vertices]
lo = [min(v[i] for v in vs) for i in range(3)]; hi = [max(v[i] for v in vs) for i in range(3)]
mid = [(lo[i] + hi[i]) / 2 for i in range(3)]
k = SIZE / (hi[0] - lo[0])
for v in me.vertices:
    v.co = mathutils.Vector(((v.co.x - mid[0]) * k, (v.co.y - mid[1]) * k, (v.co.z - mid[2]) * k))
me.update()
# the blade is the thin end: put it at +X (the handle is the fat end)
vs = [v.co for v in me.vertices]
def girth(sign):
    sel = [v for v in vs if (v.x * sign) > SIZE * 0.30]
    return max((v.y * v.y + v.z * v.z) ** 0.5 for v in sel) if sel else 0
if girth(+1) > girth(-1):
    for v in me.vertices: v.co.x = -v.co.x; v.co.y = -v.co.y
    me.update()
log('girth +X (tip)', round(girth(+1), 4), ' -X (handle)', round(girth(-1), 4))
for i in range(10):
    a0 = -SIZE / 2 + SIZE * i / 10; a1 = a0 + SIZE / 10
    sel = [v for v in me.vertices if a0 <= v.co.x <= a1]
    if sel: log('  x %+.3f..%+.3f  r %.4f  n %d' % (a0, a1, max((v.co.y ** 2 + v.co.z ** 2) ** 0.5 for v in sel), len(sel)))

# one UV channel
while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])

# the maps: colour and normal kept and shrunk, everything else dropped
mat = o.active_material
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
def src_image(socket):
    for l in socket.links:
        n = l.from_node
        if n.type == 'TEX_IMAGE': return n
        for s in n.inputs:
            r = src_image(s)
            if r: return r
    return None
for name in ('Metallic', 'Roughness'):
    for l in list(bsdf.inputs[name].links): nt.links.remove(l)
bsdf.inputs['Metallic'].default_value = 0.0
bsdf.inputs['Roughness'].default_value = 0.55
for n in [n for n in nt.nodes if n.type == 'TEX_IMAGE']:
    used = any(l.to_node == bsdf or l.to_node.type == 'NORMAL_MAP' for l in n.outputs['Color'].links)
    if not used:
        nt.nodes.remove(n); continue
    im = n.image
    im.scale(TEX, TEX)
    im.file_format = 'JPEG'
    log('kept', im.name, im.size[:])
for g in [n for n in nt.nodes if n.type == 'GROUP']:   # the glTF occlusion group, if the importer made one
    nt.nodes.remove(g)
o.name = 'screwdriver'; me.name = 'screwdriver'; mat.name = 'screwdriver'

bpy.ops.export_scene.gltf(filepath=os.path.normpath(OUT), export_format='GLB', use_selection=False,
                          export_tangents=False, export_image_format='JPEG', export_jpeg_quality=82,
                          export_apply=True, export_yup=True)
log('wrote', os.path.normpath(OUT), os.path.getsize(os.path.normpath(OUT)), 'bytes')
