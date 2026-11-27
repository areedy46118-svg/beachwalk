"""THE GARRISON'S WEAPONS FROM A PACK (2026-11-23, the owner: "make these the weapons for the farmers. dont use the sheath model.
put a shield on rare knights backs"). Atakhani's "Stylized Medieval Weapon Pack" (Sketchfab, CC-BY-4.0 — commercial use allowed)
into assets/farm-weapons.glb:

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/weapons_pack.py -- <pack folder> <out.glb>

WHAT IS IN IT. Ten rigid meshes on three 2048 maps (colour, normal, metal/roughness each): three swords, three axes, three
shields and a sheath, every one standing up its own +Z (Blender's up) in metres, handle down, at its own spot on a line.

WHAT COMES OUT. Nine (no sheath), each its own object named as in the pack, laid on the game's convention for a weapon
(`farmWeapon`): the butt (a sword's pommel, an axe's heel) at the origin, the handle up +Z (the GLB's +Y), the handle's own
line on the axis, the edge (a sword's flat's wide axis, an axe's bit) along +X — so `farmArm`, `farmCurlToHandle`,
`farmToolRoll`, `farmCarry` and `farmReachSet` take them exactly as they took the built ones. Each carries extras: `hi` (its
length), `grip` (the middle of where a fist goes: a sword between the pommel and the guard, against the guard; an axe a
hand up from the heel), `guard` (a sword's cross). A shield lies with its face toward +Z (the GLB's −Y… see `face`), its middle at
the origin, its top up +Y — the way it hangs on a man's back is the game's. Meshes over 1300 triangles are thinned (Decimate,
collapse: the silhouette and the UVs kept). The maps: colour only, 512, JPEG (no metalness — METALNESS IS A TRAP — and the
game's men are flat-shaded, so no normal map).

SHIPPED as every asset is (`docs/notes/perf.md`): quantized, then gzipped whole —
    python3 -I tools/glbquant.py out.glb q.glb
    python3 -I -c "import gzip; open('assets/farm-weapons.glb','wb').write(gzip.compress(open('q.glb','rb').read(), 9, mtime=0))"
(1.36 MB → 846 KB → 438 KB.) NAMES: Blender's duplicate suffix `.001` (the empties the import made held the names) comes through
three's loader as `001` — `farmWeaponsLoad` takes the name's `Sword_0n` / `Axe_0n` / `Shield_0n` prefix.
"""
import bpy, bmesh, sys, os, mathutils

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'scene.gltf'))
TRI_MAX = 1300

def world_verts(o):
    M = o.matrix_world
    return [M @ v.co for v in o.data.vertices]

def bake(o):
    """the object's world transform into its mesh, parent cleared, at the origin"""
    M = o.matrix_world.copy()
    o.parent = None
    o.data.transform(M)
    o.matrix_world = mathutils.Matrix.Identity(4)

out = []
for o in list(bpy.data.objects):
    if o.type != 'MESH': continue
    name = o.name.split('_')[0] + '_' + o.name.split('_')[1]      # Sword_01_Swords_Mat_0 -> Sword_01
    if name.startswith('Sheath'):
        bpy.data.objects.remove(o); continue
    bake(o)
    vs = [v.co.copy() for v in o.data.vertices]
    zlo = min(v.z for v in vs); zhi = max(v.z for v in vs); L = zhi - zlo
    kind = 'sword' if name.startswith('Sword') else 'axe' if name.startswith('Axe') else 'shield'
    ext = {'kind': kind}
    if kind == 'shield':
        # its middle at the origin; its thin axis is Y (measured: 0.14-0.16 deep, 0.58-0.81 wide); which side the boss/face is:
        # the side its far-out vertices are on (the face bulges, the back is flat with straps)
        c = mathutils.Vector(((min(v.x for v in vs) + max(v.x for v in vs)) / 2, (min(v.y for v in vs) + max(v.y for v in vs)) / 2, (zlo + zhi) / 2))
        for v in o.data.vertices: v.co -= c
        ys = [v.co.y for v in o.data.vertices]
        ext.update({'w': max(v.co.x for v in o.data.vertices) * 2, 'h': L, 'd': max(ys) - min(ys)})
        # the face: whichever side holds more of the surface far from the middle plane
        far = sorted(ys)
        ext['face'] = 1 if abs(far[-1]) > abs(far[0]) else -1      # +1: the face is toward +Y (Blender) = the GLB's −Z
    else:
        # the handle's line: the middle (x, y) of the lowest 18 % (pommel and grip for a sword, the haft's heel for an axe)
        low = [v for v in vs if v.z < zlo + L * 0.18]
        hx = (min(v.x for v in low) + max(v.x for v in low)) / 2; hy = (min(v.y for v in low) + max(v.y for v in low)) / 2
        for v in o.data.vertices: v.co.x -= hx; v.co.y -= hy; v.co.z -= zlo
        vs = [v.co.copy() for v in o.data.vertices]
        if kind == 'sword':
            # the guard: the widest band in the lower half; the grip a fist up from the pommel, against the guard
            best, gz = 0, 0
            for b in range(40):
                a0, a1 = L * 0.5 * b / 40, L * 0.5 * (b + 1) / 40
                sl = [v for v in vs if a0 <= v.z <= a1]
                if sl:
                    w = max(v.x for v in sl) - min(v.x for v in sl)
                    if w > best: best, gz = w, (a0 + a1) / 2
            ext.update({'guard': gz, 'grip': max(gz * 0.45, gz - 0.06)})
            # the edge is the blade's wide axis: X already (measured 0.03-0.09 wide on X, 0.01 on Y)
        else:
            # the bit: the head is where it widens; the bit's side is +X (the far side from the haft wins)
            head = [v for v in vs if v.z > L * 0.55]
            if head and (sum(v.x for v in head) / len(head)) < 0:
                for v in o.data.vertices: v.co.x = -v.co.x; v.co.y = -v.co.y      # (half a turn about the handle: the bit on +X, still a right hand)
            ext.update({'grip': 0.11})
        ext['hi'] = L
    o.data.update()
    # thinned
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if tris > TRI_MAX:
        m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = TRI_MAX / tris; m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier='dec')
    ext['tris'] = sum(len(p.vertices) - 2 for p in o.data.polygons)
    o.name = name; o.data.name = name
    for k, v in ext.items(): o[k] = round(v, 4) if isinstance(v, float) else v
    out.append((name, ext))

# the maps: colour only, 512 JPEG; no metalness, no normal map
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: continue
    for inp in ('Metallic', 'Roughness', 'Normal'):
        for l in list(bsdf.inputs[inp].links): nt.links.remove(l)
    bsdf.inputs['Metallic'].default_value = 0.0; bsdf.inputs['Roughness'].default_value = 0.8
    base = bsdf.inputs['Base Color'].links[0].from_node if bsdf.inputs['Base Color'].links else None
    if base and base.type == 'TEX_IMAGE' and base.image:
        im = base.image; im.scale(512, 512); im.file_format = 'JPEG'
# the empties of the old tree out
for o in list(bpy.data.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_extras=True, export_image_format='JPEG', export_jpeg_quality=82,
                          export_apply=True, export_yup=True, export_texcoords=True, export_normals=True, export_materials='EXPORT')
for n, e in out: print('PACKED', n, e)
print('WROTE', OUT, os.path.getsize(OUT))
