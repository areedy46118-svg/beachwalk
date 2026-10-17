"""THE DRIFTWOOD, step 2 of 2: from the cut-out wood to assets/driftwood.glb — TWO pieces in one atlas.
    Blender --background OUT.blend --python tools/driftwood_bake.py -- driftwood.glb 22000 2048 1024 0.02
    python3 -I tools/glbquant.py driftwood.glb tmp.glb  &&  gzip it whole into assets/driftwood.glb
`rootwad`: the whole root, cleaned, solidified (the scan is an open shell), voxel-remeshed at 0.02, decimated to 22k.
`log`: the trunk alone — along the long axis from the narrow end to where the 90th-percentile spread passes 1.7x the
median (the root fan), bisected there and the hole closed. Both share new uvs; the source's colour baked through its
unlit EMISSION shader (a DIFFUSE bake of it is black) at 2048, the relief as a tangent normal map at 1024. Each is
then laid in the pose it would LIE in — the convex-hull face it is stable on (its middle over the face), the
lowest-sitting of those — and turned so its length is along X."""
import bpy, bmesh, sys, json, mathutils, math, time
import numpy as np
args = sys.argv[sys.argv.index('--') + 1:]
out_glb, TRIS, TEX, NTEX, VOX = args[0], int(args[1]), int(args[2]), int(args[3]), float(args[4])
hi = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]; hi.name = 'hi'
hi.data.validate(clean_customdata=False)
b = bmesh.new(); b.from_mesh(hi.data); bmesh.ops.dissolve_degenerate(b, edges=b.edges, dist=1e-5)
bmesh.ops.delete(b, geom=[v for v in b.verts if not v.link_faces], context='VERTS'); b.to_mesh(hi.data); b.free()
for m in hi.data.materials:
    nt = m.node_tree; em = next(n for n in nt.nodes if n.type == 'EMISSION'); mo = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    nt.links.new(em.outputs['Emission'], mo.inputs['Surface']); em.inputs['Strength'].default_value = 1.0
def sel_only(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
def apply(o, mod):
    sel_only(o); bpy.ops.object.modifier_apply(modifier=mod.name)
# the whole root, watertight and decimated
wad = hi.copy(); wad.data = hi.data.copy(); wad.name = 'rootwad'; bpy.context.scene.collection.objects.link(wad)
so = wad.modifiers.new('s', 'SOLIDIFY'); so.thickness = VOX * 2.5; so.offset = 0.0; apply(wad, so)
rm = wad.modifiers.new('r', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = VOX; apply(wad, rm)
nt0 = len(wad.data.polygons) * 2
dm = wad.modifiers.new('d', 'DECIMATE'); dm.ratio = min(1, TRIS / nt0); apply(wad, dm)
# the TRUNK alone: along the long axis, from the narrow end to where the roots begin, cut and closed
V = np.array([tuple(v.co) for v in wad.data.vertices]); c = V.mean(0); W, E = np.linalg.eigh((V - c).T @ (V - c)); ax = E[:, np.argmax(W)]
t = (V - c) @ ax; rad = np.linalg.norm((V - c) - np.outer(t, ax), axis=1)
bins = np.linspace(t.min(), t.max(), 41); spread = []
for i in range(40):
    s_ = (t >= bins[i]) & (t < bins[i + 1]); spread.append(np.percentile(rad[s_], 90) if s_.sum() > 10 else 0)
spread = np.array(spread); med = np.median(spread[spread > 0])
narrow_first = spread[:10].mean() < spread[-10:].mean()
order = range(40) if narrow_first else range(39, -1, -1)
cut = None
for i in order:
    if spread[i] > med * 1.7: cut = bins[i] if narrow_first else bins[i + 1]; break
log = wad.copy(); log.data = wad.data.copy(); log.name = 'log'; bpy.context.scene.collection.objects.link(log)
b = bmesh.new(); b.from_mesh(log.data)
co = mathutils.Vector(tuple(c + ax * cut)); no = mathutils.Vector(tuple(ax if narrow_first else -ax))
res = bmesh.ops.bisect_plane(b, geom=b.verts[:] + b.edges[:] + b.faces[:], plane_co=co, plane_no=no, clear_outer=True)
edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
bmesh.ops.holes_fill(b, edges=b.edges, sides=0)
bmesh.ops.triangulate(b, faces=b.faces)
b.to_mesh(log.data); b.free()
print('STAGE split', len(wad.data.polygons), len(log.data.polygons), 'cut at', round(float((cut - t.min()) / (t.max() - t.min())), 2))
# one atlas for both: joined for the uvs and the bake, parted again after
for o, g in ((wad, 'W'), (log, 'L')):
    vg = o.vertex_groups.new(name=g); vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    while len(o.data.uv_layers): o.data.uv_layers.remove(o.data.uv_layers[0])
    o.data.materials.clear()
bpy.ops.object.select_all(action='DESELECT'); wad.select_set(True); log.select_set(True); bpy.context.view_layer.objects.active = wad
bpy.ops.object.join(); lo = wad
lo.data.uv_layers.new(name='UVMap')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004); bpy.ops.uv.pack_islands(margin=0.003)
bpy.ops.object.mode_set(mode='OBJECT')
mat = bpy.data.materials.new('driftwood'); mat.use_nodes = True; lo.data.materials.append(mat)
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
col = bpy.data.images.new('driftwood_col', TEX, TEX); nor = bpy.data.images.new('driftwood_nor', NTEX, NTEX); nor.colorspace_settings.name = 'Non-Color'
tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = col; tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nor
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 4
sc.render.bake.use_selected_to_active = True; sc.render.bake.cage_extrusion = 0.06; sc.render.bake.max_ray_distance = 0.3; sc.render.bake.margin = 8
bpy.ops.object.select_all(action='DESELECT'); hi.select_set(True); lo.select_set(True); bpy.context.view_layer.objects.active = lo
nt.nodes.active = tc; bpy.ops.object.bake(type='EMIT')
nt.nodes.active = tn; bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Roughness'].default_value = 0.88
bpy.data.objects.remove(hi, do_unlink=True)
# parted again, by the groups
sel_only(lo); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT')
lo.vertex_groups.active_index = lo.vertex_groups['L'].index; bpy.ops.object.vertex_group_select(); bpy.ops.mesh.separate(type='SELECTED')
bpy.ops.object.mode_set(mode='OBJECT')
parts = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in parts: o.name = 'log' if len(o.data.polygons) < max(len(p.data.polygons) for p in parts) else 'rootwad'
# each in the pose it would LIE in: the hull face it is stable on, lowest-sitting; then its length along X
def rest(o):
    vs = np.array([tuple(v.co) for v in o.data.vertices]); com = vs.mean(0)
    hb = bmesh.new()
    for v in vs: hb.verts.new(v)
    hull = bmesh.ops.convex_hull(hb, input=hb.verts); best = None
    for f in [g for g in hull['geom'] if isinstance(g, bmesh.types.BMFace)]:
        n = f.normal.copy(); a0 = np.array(f.verts[0].co); h = float(np.dot(com - a0, -np.array(n)))
        proj = mathutils.Vector(tuple(com)) - n * float(np.dot(com - a0, np.array(n))); pv = [v.co for v in f.verts]; inside = True
        for i in range(len(pv)):
            if (pv[(i + 1) % len(pv)] - pv[i]).cross(proj - pv[i]).dot(n) < -1e-6: inside = False; break
        if inside and h > 0 and (best is None or h < best[0]): best = (h, n.copy())
    hb.free()
    n = best[1] if best else mathutils.Vector((0, 0, -1))
    o.data.transform(mathutils.Matrix.Translation(-mathutils.Vector(tuple(com))))
    o.data.transform(n.rotation_difference(mathutils.Vector((0, 0, -1))).to_matrix().to_4x4())
    Q = np.array([tuple(v.co) for v in o.data.vertices])[:, :2]; Q = Q - Q.mean(0); w2, V2 = np.linalg.eigh(Q.T @ Q); a2 = V2[:, np.argmax(w2)]
    o.data.transform(mathutils.Matrix.Rotation(-math.atan2(a2[1], a2[0]), 4, 'Z'))
    o.matrix_world = mathutils.Matrix.Identity(4)
    vv = np.array([tuple(v.co) for v in o.data.vertices]); return [round(float(x), 2) for x in vv.max(0) - vv.min(0)]
dims = {o.name: rest(o) for o in parts}
for o in parts:
    for vg in list(o.vertex_groups): o.vertex_groups.remove(vg)
bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=88, export_apply=True, export_materials='EXPORT')
print('RESULT', json.dumps({o.name: [len(o.data.polygons), dims[o.name]] for o in parts}))
