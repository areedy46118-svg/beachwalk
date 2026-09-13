"""Build assets/sol.glb — SOL, the idol on the undercroft's altar — from the
owner's own `SOL.fbx` and its texture folder.

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/sol_pack.py

What arrives: a 1.77 m robed figure in a gold sun mask holding a bleeding
heart with eight daggers in it, on a 47-bone rig it does not need (it is a
statue on an altar, not a creature), 205k faces, and 4096 maps — 49 MB of
them. What ships is the same figure at about a fifth of the triangles with
1024 colour and normal maps and no metalness at all.

Four things this had to get right:

  * THE ROBE'S TEXTURES POINT AT A FOLDER THAT DOES NOT EXIST. The FBX names
    `/Users/ethanreedy/Downloads/tex/robe lp _robe_BaseColor.jpg`; what the
    owner sent is `textures/robe_lp__robe_BaseColor.jpg`. Every missing image
    is re-found in the texture folder by its name with the spaces and the
    underscores taken out, so a rename cannot break it again. (The heart's
    roughness map was never sent; it goes without one.)
  * METALNESS IS A TRAP — the file's fourth rule, and this asset is three
    quarters metal by material: the mask, the armour and the daggers all
    ship a metallic map. There is no environment map in this game, so a
    metal has no diffuse term and a scan's small faces shatter the one
    directional specular into pinpoints. Every metallic map is dropped and
    the metalness zeroed; what carries the gold under a candle is the map's
    own emissive lift, which the game adds.
  * A DECIMATE RATIO IS OF TRIANGLES, NOT OF FACES. Everything is
    triangulated first and the ratio worked out against the triangle count.
    The wire heart is 135k faces of wire wrapped round something the size of
    a fist and takes nearly all of the cut; the mask and the face take none,
    because they are what you walk up to look at.
  * AND IT IS STOOD ON ITS OWN FEET. The rig is deleted (the pose IS the
    rest pose, so the modifier can simply go), the whole thing is dropped so
    the hem of the robe sits at y = 0 and centred on its own footprint, and
    it faces +Z in the export the way every other factory in `models/` does.
"""
import bpy, os, sys, math, subprocess
from mathutils import Vector

SRC  = '/Users/ethanreedy/Downloads/SOL.fbx'
TEX  = '/Users/ethanreedy/Downloads/textures'
OUT  = '/Users/ethanreedy/Dev/beachwalk/assets/sol.glb'
TMP  = '/private/tmp/bw_sol_tex'

# how many triangles each material's share is worth keeping. The heart is
# wire round a fist; the mask and the face are what you stand and look at.
BUDGET = {'wire_224086086': 9000, 'robe': 14000, 'gold': 9000,
          'dagger': 4000, 'armor': 1200, 'Material.001': 3000,
          'human.body': 2000, 'human.HighPolyEyes': 800}
COLOUR = 1024          # base colour and normal
ROUGH  = 512           # roughness is low-frequency

def log(*a): print('[sol]', *a); sys.stdout.flush()

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.fbx(filepath=SRC)

# ---- the textures the file could not find ---------------------------------
have = {f.lower(): f for f in os.listdir(TEX)}
for im in bpy.data.images:
    if im.size[0] or not im.filepath: continue
    b = os.path.basename(im.filepath).lower()
    hit = have.get(b) or have.get(b.replace(' ', '_'))
    if not hit:
        k = b.replace(' ', '').replace('_', '')
        hit = next((v for kk, v in have.items() if kk.replace('_', '') == k), None)
    if hit:
        im.filepath = os.path.join(TEX, hit); im.reload(); log('re-found', b, '->', hit)
    else:
        log('MISSING', b)

# ---- no metalness, and the maps come down to size -------------------------
os.makedirs(TMP, exist_ok=True)
done = {}
def shrink(im, px, srgb):
    """Resize a map on DISK with `sips` and point the datablock at it.

    Blender's own `image.scale()` + `save()` cannot be used here: the FBX
    importer loads pixels lazily, `size` comes off the header long before
    there is a buffer, and the save fails with "does not have any image
    data". `sips` ships with macOS, needs nothing installed, and the
    exporter reads `filepath` anyway."""
    if im.name in done: return done[im.name]
    src = bpy.path.abspath(im.filepath)
    if not os.path.exists(src): return None
    out = os.path.join(TMP, '%s_%d.jpg' % (os.path.splitext(os.path.basename(src))[0], px))
    if not os.path.exists(out):
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-Z', str(px), src, '--out', out],
                       check=True, capture_output=True)
    im.filepath = out; im.reload()
    im.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
    done[im.name] = im
    return im

for m in bpy.data.materials:
    if not m.node_tree: continue
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: continue
    # METALNESS IS A TRAP: drop the map and the factor both
    # `l.to_node is bsdf` is FALSE in Blender: every access hands back a fresh
    # Python wrapper round the same node, so identity never holds. Compare the
    # names — they are unique inside one node tree. Three passes of this packer
    # shipped 4096 maps because the loop below matched nothing and said nothing.
    li = [l for l in nt.links if l.to_node.name == bsdf.name and l.to_socket.name == 'Metallic']
    for l in li: nt.links.remove(l)
    bsdf.inputs['Metallic'].default_value = 0.0
    for sock, px, srgb in (('Base Color', COLOUR, True), ('Normal', COLOUR, False), ('Roughness', ROUGH, False)):
        for l in nt.links:
            if l.to_node.name == bsdf.name and l.to_socket.name == sock:
                n = l.from_node
                if n.type == 'NORMAL_MAP':
                    n = next((k.from_node for k in nt.links if k.to_node.name == n.name), None)
                if n is not None and n.type == 'TEX_IMAGE' and n.image:
                    shrink(n.image, px, srgb)
    # a scan lit for a studio: keep the roughness honest, nothing shiny
    if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0.35

# ---- one object per material, triangulated, decimated to its budget --------
bpy.ops.object.select_all(action='DESELECT')
arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes:
    # the pose IS the rest pose: the modifier has nothing to say
    for mod in list(o.modifiers):
        if mod.type == 'ARMATURE': o.modifiers.remove(mod)
    if o.parent:
        w = o.matrix_world.copy(); o.parent = None; o.matrix_world = w
if arm: bpy.data.objects.remove(arm, do_unlink=True)

# join by material so the game gets one mesh per material
by_mat = {}
for o in [x for x in bpy.data.objects if x.type == 'MESH']:
    name = o.data.materials[0].name if o.data.materials else 'none'
    by_mat.setdefault(name, []).append(o)
kept = []
for name, group in by_mat.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in group: o.select_set(True)
    bpy.context.view_layer.objects.active = group[0]
    if len(group) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = 'sol_' + name.replace('.', '_')
    # triangulate, then measure, then decimate — a ratio is of TRIANGLES
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.context.view_layer.objects.active = o
    md = o.modifiers.new('tri', 'TRIANGULATE'); md.quad_method = 'SHORTEST_DIAGONAL'
    bpy.ops.object.modifier_apply(modifier=md.name)
    tris = len(o.data.polygons)
    want = BUDGET.get(name, 2000)
    if tris > want:
        d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = want / tris
        bpy.ops.object.modifier_apply(modifier=d.name)
    log(name, tris, '->', len(o.data.polygons))
    kept.append(o)

# ---- stood on its own feet, centred on its own footprint ------------------
lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
for o in kept:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        for i in range(3):
            lo[i] = min(lo[i], w[i]); hi[i] = max(hi[i], w[i])
mid = (lo + hi) / 2
for o in kept:
    o.location.x -= mid.x; o.location.y -= mid.y; o.location.z -= lo.z
log('size', [round(hi[i] - lo[i], 3) for i in range(3)], 'height', round(hi.z - lo.z, 3))

bpy.ops.object.select_all(action='DESELECT')
for o in kept: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=True,
                          export_image_format='JPEG', export_jpeg_quality=88,
                          export_animations=False, export_skins=False,
                          export_morph=False, export_tangents=False)
for n, im in done.items(): log('map', n, im.size[:])
log('wrote', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB',
    'tris', sum(len(o.data.polygons) for o in kept))
