"""THE DRIFTWOOD, step 1 of 2 (2026-10-15): cut the wood out of jonathan.imaginaire's "Branche beach photogrametry"
(CC-BY-4.0, incoming/branche_beach_photogrametry, 7.0M triangles of a bleached root standing in a patch of sand).
    Blender --background --factory-startup --python tools/driftwood_seg.py -- SRC/scene.gltf OUT.blend 0.5 0.35
A tenth by decimation; the 75 chunks welded at their seams; each face's brightness off its own texture, blurred three
rings; faces darker than 0.5 AND within 0.35 of the ground under them (10th-percentile height per cell) are sand, and
only their big connected regions go (cracks in the wood stay); specks under 2 % of the main piece go. Left: one piece."""
import bpy, bmesh, sys, json, numpy as np, mathutils, time
args = sys.argv[sys.argv.index('--') + 1:]
src, out, thr, HMAX = args[0], args[1], float(args[2]), float(args[3])
t0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in ms: o.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# first a tenth: the classification is per face, and 700k is plenty
dm = ob.modifiers.new('d', 'DECIMATE'); dm.ratio = 0.1; bpy.ops.object.modifier_apply(modifier='d')
me = ob.data
_b = bmesh.new(); _b.from_mesh(me); bmesh.ops.remove_doubles(_b, verts=_b.verts, dist=0.004); _b.to_mesh(me); _b.free()   # weld the chunks' seams
imgs = {}
def img_arr(mat):
    if mat.name in imgs: return imgs[mat.name]
    tex = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)
    im = tex.image.copy(); im.scale(2048, 2048)
    a = np.array(im.pixels[:], dtype=np.float32).reshape(2048, 2048, 4); imgs[mat.name] = a; return a
n = len(me.polygons)
uvs = np.zeros(len(me.loops) * 2, dtype=np.float32); me.uv_layers.active.data.foreach_get('uv', uvs); uvs = uvs.reshape(-1, 2)
ls = np.zeros(n, dtype=np.int64); me.polygons.foreach_get('loop_start', ls)
lt = np.zeros(n, dtype=np.int64); me.polygons.foreach_get('loop_total', lt)
mi = np.zeros(n, dtype=np.int64); me.polygons.foreach_get('material_index', mi)
lum = np.zeros(n, dtype=np.float32)
for k in set(mi.tolist()):
    A = img_arr(me.materials[k]); sel = np.where(mi == k)[0]
    acc = np.zeros(sel.size, dtype=np.float32)
    for j in range(3):
        u = uvs[ls[sel] + np.minimum(j, lt[sel] - 1)]
        x = np.clip((u[:, 0] * 2047).astype(int), 0, 2047); y = np.clip((u[:, 1] * 2047).astype(int), 0, 2047)
        acc += A[y, x, :3] @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    lum[sel] = acc / 3
dark = lum < thr
bm = bmesh.new(); bm.from_mesh(me)
# the scan's 75 chunks meet edge to edge without sharing a vertex: weld them, or no region crosses a seam
bm.faces.ensure_lookup_table()
assert len(bm.faces) == n
# each face's brightness blurred over its neighbours, three rings: one dark grain of wood or bright grain of sand does not decide
nb = [[g.index for e in f.edges for g in e.link_faces if g.index != f.index] for f in bm.faces]
for _ in range(3):
    lum = np.array([(lum[i] + sum(lum[j] for j in nb[i])) / (1 + len(nb[i])) for i in range(n)], dtype=np.float32)
# and the sand is the GROUND: a face standing more than a little over the ground under it is wood, whatever its colour
cz = np.zeros(n, dtype=np.float32); cxy = np.zeros((n, 2), dtype=np.float32)
for f in bm.faces:
    c = f.calc_center_median(); cz[f.index] = c.z; cxy[f.index] = (c.x, c.y)
G = 48; x0, y0 = cxy.min(0); x1, y1 = cxy.max(0)
gi = np.clip(((cxy[:, 0] - x0) / (x1 - x0) * G).astype(int), 0, G - 1); gj = np.clip(((cxy[:, 1] - y0) / (y1 - y0) * G).astype(int), 0, G - 1)
ground = np.full((G, G), np.nan, dtype=np.float32)
for a_ in range(G):
    for b_ in range(G):
        sel = (gi == a_) & (gj == b_)
        if sel.sum() > 8: ground[a_, b_] = np.percentile(cz[sel], 10)
# holes in the grid: the nearest filled cell's
filled = np.argwhere(~np.isnan(ground))
for a_ in range(G):
    for b_ in range(G):
        if np.isnan(ground[a_, b_]):
            k = np.argmin(((filled - [a_, b_]) ** 2).sum(1)); ground[a_, b_] = ground[tuple(filled[k])]
height = cz - ground[gi, gj]
dark = (lum < thr) & (height < HMAX)
# connected dark regions; only the big ones are sand
seen = np.zeros(n, dtype=bool); kill = []
for f0 in range(n):
    if not dark[f0] or seen[f0]: continue
    comp = [f0]; seen[f0] = True; st = [f0]
    while st:
        f = bm.faces[st.pop()]
        for e in f.edges:
            for g in e.link_faces:
                i = g.index
                if dark[i] and not seen[i]: seen[i] = True; st.append(i); comp.append(i)
    if len(comp) > 400: kill.extend(comp)
bmesh.ops.delete(bm, geom=[bm.faces[i] for i in kill], context='FACES')
# and specks of wood left on the sand
bm.faces.ensure_lookup_table(); m2 = len(bm.faces); seen = set(); comps = []
for f0 in bm.faces:
    if f0.index in seen: continue
    comp = [f0]; seen.add(f0.index); st = [f0]
    while st:
        f = st.pop()
        for e in f.edges:
            for g in e.link_faces:
                if g.index not in seen: seen.add(g.index); st.append(g); comp.append(g)
    comps.append(comp)
comps.sort(key=len, reverse=True)
keep = set(id(f) for c in comps if len(c) > 0.02 * len(comps[0]) for f in c)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if id(f) not in keep], context='FACES')
bm.to_mesh(me); bm.free()
print('RESULT', json.dumps({'faces_before': n, 'dark': int(dark.sum()), 'killed': len(kill), 'left': len(me.polygons), 'parts': len([c for c in comps if len(c) > 0.02 * len(comps[0])]), 'sec': round(time.time() - t0)}))
bpy.ops.wm.save_as_mainfile(filepath=out)
