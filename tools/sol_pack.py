"""Build assets/sol.glb — SOL, the idol on the undercroft's altar — from the
owner's own `SOL.blend`.

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/sol_pack.py

THE .BLEND IS THE SOURCE, NOT THE .FBX, AND THE HANDS ARE WHY. Three builds
were packed out of `SOL.fbx` and every one of them put the bleeding heart and
its eight daggers at the figure's THIGHS — the owner's "the heart and knives
are not in its hands". Measured in both files, relative to the hem of the
robe: in the .blend the heart stands at 1.118–1.313 m and the hands at
0.974–1.233, which is a heart held in two hands at the chest; in the .fbx the
same heart is at 0.762–0.965 and the daggers are squeezed from a 0.42 m span
across to 0.21. The heart carries a GEOMETRY NODES modifier and all eight
daggers are PARENTED TO IT, and none of that survived the FBX export. The
blend also carries every texture PACKED, including the heart's roughness map,
which was never in the delivered `textures/` folder at all.

So: open the blend, CONVERT every mesh (which evaluates the depsgraph — the
armature, the geometry nodes and the subsurf all apply), and from there it is
the old pipeline — drop every metallic map, resize the 4096s, triangulate,
decimate to a per-material budget, stand it on its own feet facing +Z.

Three things it still has to get right:

  * A DECIMATE RATIO IS OF TRIANGLES, NOT OF FACES. Everything is
    triangulated first and the ratio worked out against the triangle count.
  * METALNESS IS A TRAP — this asset is three quarters metal by material
    (the mask, the armour, the daggers) and there is no environment map in
    this game, so a metal has no diffuse term and a scan's small faces
    shatter the one directional specular into pinpoints. Every metallic map
    is dropped and the factor zeroed; what carries the gold under a candle
    is the map's own emissive lift, which the game adds.
  * AND THE SHIFT ONLY WORKS ON AN IDENTITY TRANSFORM. The FBX build moved
    each object by writing `o.location`, and the one object that was neither
    parented nor joined did not move with the rest — a heart half a metre
    below its own body. Every object's transform is APPLIED first, so a
    location is a pure translation of vertices already in world space.
"""
import bpy, os, sys, subprocess
from mathutils import Vector

SRC  = '/Users/ethanreedy/Downloads/SOL.blend'
TEX  = '/Users/ethanreedy/Downloads/textures'
OUT  = '/Users/ethanreedy/Dev/beachwalk/assets/sol.glb'
TMP  = '/private/tmp/bw_sol_tex'

# how many triangles each material's share is worth keeping. The heart and the
# daggers are what he is HOLDING and what the owner asked to be able to see;
# the mask and the face are what you stand and look at.
BUDGET = {'wire_224086086': 14000, 'robe': 14000, 'gold': 9000,
          'dagger': 8000, 'armor': 1200, 'Material.001': 3000,
          'human.body': 2000, 'human.HighPolyEyes': 800}
DROP   = {'Camera', 'Plane', 'Light'}      # the blend is a render scene: its set is not the statue
COLOUR = 1024          # base colour and normal
ROUGH  = 512           # roughness is low-frequency

def log(*a): print('[sol]', *a); sys.stdout.flush()

bpy.ops.wm.open_mainfile(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name in DROP or o.type in ('CAMERA', 'LIGHT'):
        bpy.data.objects.remove(o, do_unlink=True)

# ---- every modifier evaluated: the armature, the geometry nodes, the subsurf
bpy.ops.object.select_all(action='DESELECT')
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.convert(target='MESH')
log('converted', len(meshes), 'meshes')

for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent:
        w = o.matrix_world.copy(); o.parent = None; o.matrix_world = w
for o in list(bpy.data.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)

# ---- the maps: packed, and far too big ------------------------------------
os.makedirs(TMP, exist_ok=True)
done = {}
def shrink(im, px, srgb):
    """Write the packed pixels out, resize them on disk with `sips`, and point
    the datablock at the small file with nothing packed behind it — the
    exporter will reuse a packed 4096 given half a chance."""
    if im.name in done: return done[im.name]
    safe = ''.join(c if c.isalnum() or c in '._-' else '_' for c in im.name)
    full = os.path.join(TMP, 'full_' + safe + '.png')
    out  = os.path.join(TMP, '%s_%d.jpg' % (os.path.splitext(safe)[0], px))
    if not os.path.exists(out):
        if not os.path.exists(full):
            im.filepath_raw = full; im.file_format = 'PNG'; im.save()
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-Z', str(px), full, '--out', out],
                       check=True, capture_output=True)
    im.filepath = out
    if im.packed_file:
        try: im.unpack(method='REMOVE')
        except Exception: im.pack()  # leave it alone rather than lose it
    im.filepath = out; im.reload()
    im.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
    done[im.name] = im
    return im

for m in bpy.data.materials:
    if not m.node_tree: continue
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: continue
    # METALNESS IS A TRAP: drop the map and the factor both.
    # `l.to_node is bsdf` is FALSE in Blender — every access hands back a fresh
    # Python wrapper round the same node, so identity never holds. Compare the
    # NAMES; they are unique inside one node tree.
    for l in [l for l in nt.links if l.to_node.name == bsdf.name and l.to_socket.name == 'Metallic']:
        nt.links.remove(l)
    bsdf.inputs['Metallic'].default_value = 0.0
    for sock, px, srgb in (('Base Color', COLOUR, True), ('Normal', COLOUR, False), ('Roughness', ROUGH, False)):
        for l in nt.links:
            if l.to_node.name != bsdf.name or l.to_socket.name != sock: continue
            n = l.from_node
            if n.type == 'NORMAL_MAP':
                n = next((k.from_node for k in nt.links if k.to_node.name == n.name), None)
            if n is not None and n.type == 'TEX_IMAGE' and n.image:
                shrink(n.image, px, srgb)
    if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0.35

# AND A MAP REACHED THROUGH ANYTHING BUT A BARE LINK IS STILL A MAP. Walking
# the socket from the BSDF found fourteen of sixteen: the robe's base colour
# comes through a mix node and shipped at 4096, two and a third megabytes of
# the asset on its own. Every image left over is sized by its own NAME.
for im in list(bpy.data.images):
    if im.name in done or not im.has_data and not im.packed_file: continue
    if im.name.lower().endswith('.hdr') or im.name == 'Render Result': continue
    n = im.name.lower()
    px = ROUGH if ('rough' in n or 'metal' in n or 'occl' in n) else COLOUR
    shrink(im, px, not ('normal' in n or 'rough' in n or 'metal' in n or 'occl' in n))

# ---- one object per material, triangulated, decimated to its budget --------
by_mat = {}
for o in [x for x in bpy.data.objects if x.type == 'MESH']:
    name = o.data.materials[0].name if o.data.materials else 'none'
    by_mat.setdefault(name, []).append(o)
kept = []
for name, grp in by_mat.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in grp: o.select_set(True)
    bpy.context.view_layer.objects.active = grp[0]
    if len(grp) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = 'sol_' + name.replace('.', '_')
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
bpy.ops.object.select_all(action='DESELECT')
for o in kept: o.select_set(True)
bpy.context.view_layer.objects.active = kept[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)   # every vertex now in world space
lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
for o in kept:
    for v in o.data.vertices:
        for i in range(3):
            lo[i] = min(lo[i], v.co[i]); hi[i] = max(hi[i], v.co[i])
mid = (lo + hi) / 2
for o in kept:
    o.location = (-mid.x, -mid.y, -lo.z)
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
