"""THE CASTLE'S GARRISON, in place of the farmers (2026-11-16, the owner: "replace all the farmers with these").
tt-3D's "Low Poly Medieval Europe Starter Pack" (Fab, Standard License) into five files, one man each:

    /Applications/Blender.app/Contents/MacOS/Blender -b <pack.blend> --python tools/garrison_pack.py -- <outdir> <old farmer glbs dir>

WHAT IS IN THE FILE IS NOT WHAT THE LISTING SAYS. The page names a knight, a soldier, a villager, a king and a queen; the
.blend holds `Knight`, `Knight_axe`, `assasin` (a hooded man), `demonking` (an old bearded man in a surcoat) and
`Knight_Woman` — each 770-950 triangles on one 256 px map, every one on the same 34-bone rig, side by side two metres
apart along x.

THE RIG IS RENAMED INTO THE FARMERS' MIXAMO NAMING, `mixamorig<Name>_<file>`, so everything the farmers are built from —
`FJ`, `farmJoints`, `farmRag`, the retarget of every motion-capture clip they play — finds its joints with one more line
in `FARM_SFX` and nothing else. Its `spine` is Mixamo's Spine and its `chest` Spine2: there is no Spine1, which the
retarget does not need (it carries world rotations, so a bone with no counterpart is simply not written).

AND IT IS GIVEN WHAT IT LACKS, AS BONES THAT MOVE NOTHING. Each hand has a thumb and ONE finger chain (the four fingers
are one mitten weighted to it), and the tool seat (`farmArm`) reads the line across the knuckles off the index and
little finger: `Index1`, `Ring1` and `Pinky1` are added beside `Middle1`, across the hand on the thumb's side and away
from it, carrying no weights. And `HeadTop_End` over the head, which the headbutt's chain ends on.

THE TOOLS NO LONGER COME WITH THEM (2026-11-16, later: "give them all new weapons"). The first pack lifted the old
farmers' axe, rake and hammer into every file (`lift_tools`, kept below and unused); the weapons are built in the game
now (`farmWeapon` in main.js). And the bodies are OPAQUE: see the material loop.

Transforms are applied (the five armatures are scaled 0.94-1.06): each man stands at the origin, feet on y = 0, facing
+z after the glTF axis change, positions in metres.
"""
import bpy, sys, os
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:]
OUT, OLD = args[0], args[1]
SRC = bpy.data.filepath
CHARS = [('Knight', 'kn', 'farmer-knight'), ('Knight_axe', 'ka', 'farmer-axeknight'), ('assasin', 'hd', 'farmer-hood'),
         ('demonking', 'ol', 'farmer-elder'), ('Knight_Woman', 'kw', 'farmer-woman')]
BASE = {'root': 'Root', 'hips': 'Hips', 'spine': 'Spine', 'chest': 'Spine2', 'neck': 'Neck', 'head': 'Head'}
SIDE = {'shoulder': 'Shoulder', 'upper_arm': 'Arm', 'lower_arm': 'ForeArm', 'hand': 'Hand',
        'thumb_proximal': 'HandThumb1', 'thumb_intermediate': 'HandThumb2', 'thumb_distal': 'HandThumb3',
        'middle_proximal': 'HandMiddle1', 'middle_intermediate': 'HandMiddle2', 'middle_distal': 'HandMiddle3',
        'upper_leg': 'UpLeg', 'lower_leg': 'Leg', 'foot': 'Foot', 'toes': 'ToeBase'}
TOOLS = [('farmer-woodman.glb', 'AXE', 'AXE_tool', 'tool_axe'), ('farmer-farmman.glb', 'Rake', 'Rake_tool', 'tool_rake'),
         ('farmer-workman.glb', 'Object004', 'Object004_hammer', 'tool_hammer')]


def mx_name(n, sfx):
    if n in BASE: return 'mixamorig' + BASE[n] + '_' + sfx
    stem, side = n.rsplit('.', 1)
    return 'mixamorig' + ('Left' if side == 'L' else 'Right') + SIDE[stem] + '_' + sfx


def lift_tools():
    """the three tools out of the old farmers, baked to world metres, maps at 256, plain dielectrics"""
    got = []
    for fn, pat, name, matname in TOOLS:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(OLD, fn))
        new = [o for o in bpy.data.objects if o not in before]
        tool = next(o for o in new if o.type == 'MESH' and pat in o.name and not o.modifiers)
        mw = tool.matrix_world.copy()
        tool.data = tool.data.copy()
        tool.data.transform(Matrix.Scale(0.01, 4) @ mw)      # the old farmers are centimetres, with no scale node over them
        tool.parent = None
        tool.matrix_world.identity()
        tool.name = name
        for o in new:
            if o is not tool: bpy.data.objects.remove(o, do_unlink=True)
        mat = tool.data.materials[0].copy(); mat.name = matname; tool.data.materials[0] = mat
        nt = mat.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        for inp in ('Normal', 'Metallic', 'Roughness'):
            for l in list(bsdf.inputs[inp].links): nt.links.remove(l)
        bsdf.inputs['Metallic'].default_value = 0.0      # METALNESS IS A TRAP: no environment to reflect
        bsdf.inputs['Roughness'].default_value = 0.8
        for n in list(nt.nodes):
            if n.type == 'TEX_IMAGE':
                linked_base = any(l.to_socket == bsdf.inputs['Base Color'] for l in n.outputs['Color'].links)
                if not linked_base: nt.nodes.remove(n); continue
                im = n.image.copy(); im.name = matname + '_map'; im.scale(256, 256); im.pack(); n.image = im
        dims = tool.dimensions
        print('TOOL', name, 'size', tuple(round(d, 3) for d in dims), 'tris', sum(len(p.vertices) - 2 for p in tool.data.polygons))
        got.append(tool)
    return got


def add_bone(eb, name, parent, head, tail):
    b = eb.new(name); b.head = head; b.tail = tail; b.parent = eb[parent]; b.use_deform = False
    return b


for mesh_name, sfx, out_name in CHARS:
    bpy.ops.wm.open_mainfile(filepath=SRC)
    mesh = bpy.data.objects[mesh_name]
    arm = next(m.object for m in mesh.modifiers if m.type == 'ARMATURE')
    for o in list(bpy.data.objects):
        if o not in (mesh, arm): bpy.data.objects.remove(o, do_unlink=True)
    off = arm.matrix_world.translation.copy(); off.z = 0
    mw = mesh.matrix_world.copy()
    mesh.parent = None; mesh.matrix_world = mw
    arm.location -= off; mesh.location -= off
    bpy.ops.object.select_all(action='DESELECT')
    for o in (arm, mesh): o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # the bones into Mixamo's names (Blender renames the vertex groups of everything this armature deforms)
    for b in list(arm.data.bones): b.name = mx_name(b.name, sfx)
    missing = [g.name for g in mesh.vertex_groups if g.name not in arm.data.bones]
    if missing: print('UNMATCHED VGROUPS', missing)
    # the bones it lacks, deforming nothing
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    hd = eb['mixamorigHead_' + sfx]
    add_bone(eb, 'mixamorigHeadTop_End_' + sfx, hd.name, hd.tail.copy(), hd.tail + Vector((0, 0, 0.10)))
    for side in ('Left', 'Right'):
        hand = eb['mixamorig%sHand_%s' % (side, sfx)]
        mid = eb['mixamorig%sHandMiddle1_%s' % (side, sfx)]
        th = eb['mixamorig%sHandThumb1_%s' % (side, sfx)]
        fing = (mid.tail - mid.head).normalized()
        across = th.head - hand.head
        across -= fing * across.dot(fing)
        across.normalize()                                   # toward the thumb, square to the finger
        L = (mid.tail - mid.head).length
        for nm, k in (('Index1', 0.021), ('Ring1', -0.018), ('Pinky1', -0.034)):
            h = mid.head + across * k
            add_bone(eb, 'mixamorig%sHand%s_%s' % (side, nm, sfx), hand.name, h, h + fing * L)
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.parent = arm
    mesh.matrix_parent_inverse.identity()
    arm.name = 'Armature_' + sfx
    mesh.name = 'Body_' + sfx
    for m in mesh.data.materials:
        if not m: continue
        m.name = 'garrison_' + sfx
        # OPAQUE. Every material has its map's alpha wired into the shader's Alpha — and the maps are 1.0 everywhere — so
        # the exporter wrote alphaMode BLEND and the game drew each man as glass: depth-sorted, no depth write, his far
        # side through his near side (the owner: "the textures for the new farmers is see through").
        bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            for l in list(bsdf.inputs['Alpha'].links): m.node_tree.links.remove(l)
            bsdf.inputs['Alpha'].default_value = 1.0
        if hasattr(m, 'surface_render_method'): m.surface_render_method = 'DITHERED'
    for img in bpy.data.images:
        if img.users and img.name != 'Render Result': img.name = 'garrison_' + sfx + '_map'
    tools = []                                           # (the weapons are built in the game now: `farmWeapon`)
    for o in list(bpy.data.objects):                      # (the old files' 2 m icosphere rode along)
        if o not in [arm, mesh] + tools: bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in [arm, mesh] + tools: o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    lo = min((arm.matrix_world @ Vector(c)).z for c in mesh.bound_box); hi = max((mesh.matrix_world @ Vector(c)).z for c in mesh.bound_box)
    print('MAN', out_name, 'height', round(hi - lo, 3), 'feet', round(lo, 3), 'tris', sum(len(p.vertices) - 2 for p in mesh.data.polygons), 'bones', len(arm.data.bones))
    path = os.path.join(OUT, out_name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_animations=False,
                              export_yup=True, export_apply=False, export_morph=False, export_image_format='JPEG')
    print('WROTE', path, os.path.getsize(path))
