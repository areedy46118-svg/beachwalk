"""THE CATACOMBS MONSTER — the owner's "Weird Creature" (Zombie.fbx + its blend), packed for Beachwalk.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/crawler_pack.py -- <folder> <textures-dir>

The FBX carries `rig_deform`, a deform-only export of the blend's Rigify rig
(175 DEF bones, parents already resolved — the samurai's packer had to merge
Rigify's face into the head because its DEF bones hang off MCH controls the
exporter drops; here that work is already done), and six meshes: the body,
two eyes, three sets of teeth and the trousers. Its textures point at a G:
drive; the blend has them PACKED, and `<textures-dir>` is where they were
unpacked to and pre-processed (AO multiplied into the albedo, the opacity as
its alpha, 1024; the normal at 1024; the roughness at 512 — see the notes in
CLAUDE.md). Metallic is dropped: measured, the map is 0.0 everywhere, and
METALNESS IS A TRAP here anyway.

No clip is authored here. The crawl is the owner's Mixamo clip through
`ntar_moves.py -- crawler`, retargeted in the game, and everything else the
creature does is written in the game on that crawl's own stance.
"""
import bpy, os, sys

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = args[0] if args else os.path.expanduser('~/Desktop/BEACHWALK ASSETS/catacombs monster')   # the owner keeps the sources on the Desktop; ~/Downloads is cleared
TEX = args[1] if len(args) > 1 else os.path.join(SRC, 'out')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'crawler.glb')

def log(*a):
    print('[crawler]', *a); sys.stdout.flush()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, 'Zombie.fbx'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
log('armature', arm.name, len(arm.data.bones), 'bones;', len(meshes), 'meshes:', [(m.name, len(m.data.polygons)) for m in meshes])

# ---- ONE MATERIAL, WITH THE MAPS THE BLEND ACTUALLY CARRIES.
mat = bpy.data.materials.new('Body')
mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes): nt.nodes.remove(n)
out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
def tex(fname, colorspace='sRGB'):
    im = bpy.data.images.load(os.path.join(TEX, fname))
    im.colorspace_settings.name = colorspace
    n = nt.nodes.new('ShaderNodeTexImage'); n.image = im
    return n
base = tex('base.png')
nt.links.new(base.outputs['Color'], bsdf.inputs['Base Color'])
nt.links.new(base.outputs['Alpha'], bsdf.inputs['Alpha'])
rough = tex('rough.jpg', 'Non-Color')
nt.links.new(rough.outputs['Color'], bsdf.inputs['Roughness'])
nrm = tex('normal.png', 'Non-Color')
nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(nrm.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Metallic'].default_value = 0.0
# a CUT-OUT, not a blend: the opacity map is white to a p5 of 246 and blend on a double-sided body sorts against itself
mat.blend_method = 'CLIP'
if hasattr(mat, 'surface_render_method'): mat.surface_render_method = 'DITHERED'
mat.alpha_threshold = 0.5
for m in meshes:
    m.data.materials.clear(); m.data.materials.append(mat)

# ---- the rest pose, measured, for the game's notes
import mathutils
lo = mathutils.Vector((1e9, 1e9, 1e9)); hi = -lo
for m in meshes:
    for c in m.bound_box:
        w = m.matrix_world @ mathutils.Vector(c)
        lo = mathutils.Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z))); hi = mathutils.Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
log('bind box x %.2f..%.2f  y %.2f..%.2f  z %.2f..%.2f (blender: z up, faces -y)' % (lo.x, hi.x, lo.y, hi.y, lo.z, hi.z))
hips = arm.data.bones['DEF-spine']; log('hips at z %.3f' % (arm.matrix_world @ hips.head_local).z)

# ---- export: the deform rig and every mesh, Y up, no animation (there is none)
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True,
                          export_animations=False, export_skins=True, export_apply=False,
                          export_image_format='AUTO', export_texcoords=True, export_normals=True,
                          export_materials='EXPORT')
log('wrote', os.path.relpath(OUT), '%.1f MB' % (os.path.getsize(OUT) / 1e6))
