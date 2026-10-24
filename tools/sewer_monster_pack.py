"""THE THING IN THE SEWER'S WATER — the owner's "monster" (monster.fbx + its maps), packed for Beachwalk.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/sewer_monster_pack.py -- [folder]

`folder` defaults to ~/Desktop/Tunnel Rooms/monster (the owner keeps the sources on the Desktop; ~/Downloads is
cleared). The FBX is one skinned mesh (19,106 tris) on a 63-bone rig (`DeformationSystem`: Root_M, a spine of three,
a neck of four up to Head_M, arms joint37 -> joint5 -> joint6 -> joint7 -> fingers, legs joint8 -> joint9), 2.50 m
tall, hunched, facing -y in Blender (+z in the game). It carries no clip: everything it does is posed in the game.

Its maps arrive as 4096 / 2048 PNGs (base, normal, roughness, metallic, emission). Kept: the base colour at 1024 (it
fills the screen when it reaches you) and the normal at 512. Dropped: the metallic (METALNESS IS A TRAP), the
roughness (one value does: it is wet), and the emission, which measured is a speckle of 30 texels over the whole body
(max 0.25) — no eyes in it. The eyes the game gives it are its own, set under the brow ridge where the head renders
put them (measured off orthographic renders at 1 mm a pixel: x +-0.05, 2.17 up, 0.47 forward of the spine).
"""
import bpy, os, sys, tempfile

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = args[0] if args else os.path.expanduser('~/Desktop/Tunnel Rooms/monster')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'sewer-monster.glb')

def log(*a):
    print('[sewmon]', *a); sys.stdout.flush()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, 'monster.fbx'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
log('armature', arm.name, len(arm.data.bones), 'bones; mesh', mesh.name, len(mesh.data.polygons), 'polys')

# ---- the maps, cut down (Blender's own scaler; no PIL inside Blender)
tmp = tempfile.mkdtemp()
def cut(fname, size, out, colorspace):
    im = bpy.data.images.load(os.path.join(SRC, fname))
    im.scale(size, size)
    im.filepath_raw = os.path.join(tmp, out); im.file_format = 'JPEG' if out.endswith('.jpg') else 'PNG'
    sc = bpy.context.scene; sc.render.image_settings.quality = 88
    im.save()
    im2 = bpy.data.images.load(os.path.join(tmp, out)); im2.colorspace_settings.name = colorspace
    return im2
base = cut('base.png', 1024, 'monster_base.jpg', 'sRGB')
nrm = cut('normal.png', 512, 'monster_normal.jpg', 'Non-Color')

mat = bpy.data.materials.new('Monster')
mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes): nt.nodes.remove(n)
out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
tb = nt.nodes.new('ShaderNodeTexImage'); tb.image = base; nt.links.new(tb.outputs['Color'], bsdf.inputs['Base Color'])
tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nrm
nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Metallic'].default_value = 0.0
bsdf.inputs['Roughness'].default_value = 0.45
mesh.data.materials.clear(); mesh.data.materials.append(mat)

for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True,
                          export_animations=False, export_skins=True, export_apply=False,
                          export_image_format='AUTO', export_texcoords=True, export_normals=True,
                          export_materials='EXPORT')
log('wrote', os.path.relpath(OUT), '%.2f MB' % (os.path.getsize(OUT) / 1e6))
