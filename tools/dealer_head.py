"""Build assets/dealer-head.glb — what is under the Blue Blood Dealer's mask —
from tales' "Bust Model" (Sketchfab, CC-BY-4.0).

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/dealer_head.py

The scan under the gas mask is a plain bald man, which is the least
frightening thing that could be there. What arrives instead is a 26k-triangle
photoscanned bust — bald, heavy-browed, scowling, with real eyes — and the
whole job is making a sculpture of somebody else's head sit on this
character's neck so that nothing about the join can be seen.

Everything here is MEASURED off the two models rather than eyeballed, and the
measurements are in the character's own bind space (the Mixamo rig's units,
y up, +z forward), printed by the game's harness:

  * the character's eyes are at (+-0.0532, 2.8448, 0.1539) — the centroid of
    each half of its eyeball mesh, which is a fact and not an estimate;
  * the bust's are at (+-0.0619, -0.0352, 0.1186);
  * the character's neck runs y 2.58 -> 2.73, half-width 0.173 -> 0.105,
    and above 2.74 it is all head.

Four things this file does, and the order matters:

  1. THE FIT IS ANCHORED ON THE EYES. A head swap is right when the face is
     where the face was, so the transform is the uniform scale that matches
     the eye separation (0.8587) and the translation that puts the eyes on
     the character's own. Everything else — the crown landing 4 cm low in rig
     units, the jaw being wider — is this head being a different head, which
     is the point.

  2. THE NECK IS MORPHED ONTO THE BODY'S. Anchored on the eyes the bust's
     neck comes out about a centimetre thinner than the character's, so the
     join would be a visible ledge. Every vertex in the neck band is pushed
     onto the CHARACTER's own measured cross-section — its centre and its
     half-width at that height — with the correction eased out to nothing by
     the jaw, so the face is untouched and the two necks are the same neck
     where they meet.

  3. THE HOLES ARE CLOSED. The scan is a shell, open down the back of the
     skull and the neck and behind both ears. In a bust on a plinth you
     never see that; on a man you walk round it is a hole through his head.

  4. AND IT IS CUT WHERE THE GAME CUTS. The game drops every triangle of the
     character above y = 2.60, so the bust keeps everything down to 2.545 —
     a spare half-centimetre of overlap inside the shoulders — and nothing
     below, which would poke out through his collar.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.expanduser('~/Downloads/bust_model/scene.gltf')
OUT = os.path.join(HERE, 'assets', 'dealer-head.glb')

# ---- what was measured, in the character's bind space -----------------------
CHAR_EYE = (0.0532, 2.8448, 0.1539)      # half-separation, height, depth
BUST_EYE = (0.0619, -0.0352, 0.1186)
CUT_Y = 2.60                              # where the game carves the character
KEEP_Y = 2.545                            # so the bust keeps a little below it
JAW_Y = 2.760                             # above this the face is not touched
# THE CHARACTER'S NECK AT THE CUT, MEASURED AS A RING. Matching the two necks
# all the way up was tried and is the wrong problem: above the cut the
# character is carved away, so nothing of its neck is visible there and the
# bust's own neck is free to be its own shape. The ONLY place the two
# surfaces must agree is the one ring where they meet. This is that ring —
# 24 radii round the neck axis at y = 2.60, taken off the character's own
# vertices, with the axis it is measured about.
CUT_C = (0.0, -0.0426)
CUT_R = [0.1225, 0.1193, 0.1080, 0.1135, 0.1133, 0.1213, 0.1427, 0.1603,
         0.1585, 0.1143, 0.1118, 0.1105, 0.1066, 0.1105, 0.1118, 0.1143,
         0.1585, 0.1603, 0.1427, 0.1213, 0.1134, 0.1136, 0.1080, 0.1193]
BLEND_TOP = 2.74          # by here the bust's neck is entirely its own again
TUCK = 0.92               # below the cut it sits INSIDE the character, never on it

def log(*a): print("[head]", *a); sys.stdout.flush()

# three-space (y up, +z forward) <-> Blender (z up). A Blender vertex at
# (X, Y, Z) is exported to glTF as (X, Z, -Y), so this is the pair of maps.
def to_three(v): return Vector((v.x, v.z, -v.y))
def to_blender(p): return Vector((p.x, -p.z, p.y))

NB = len(CUT_R)

def ring_at(ang):
    """The character's radius at this angle round the neck, interpolated."""
    f = (ang / (2 * math.pi)) * NB
    i = int(math.floor(f)) % NB
    k = f - math.floor(f)
    return CUT_R[i] * (1 - k) + CUT_R[(i + 1) % NB] * k

def rebuild_material(ob):
    """THE SCAN SHIPS AN UNLIT MATERIAL. Sketchfab exports it shadeless — an
    Emission and a Transparent through a Mix Shader, with no Principled BSDF
    anywhere in it — so there is nothing for the glTF exporter to hang a
    normal map on, and the first bake wrote a perfectly good map that went
    nowhere. The material is rebuilt as a proper Principled one carrying the
    scan's own albedo and, if it was baked, the normal; the game overwrites
    the albedo at load anyway, but the exporter needs a real one to attach
    the rest to."""
    mat = ob.data.materials[0]
    old_img = None
    if mat.use_nodes:
        for n in mat.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and 'Normal' not in n.image.name:
                old_img = n.image; break
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    bsdf.inputs['Roughness'].default_value = 0.94
    bsdf.inputs['Metallic'].default_value = 0.0
    if old_img:
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = old_img
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    log("rebuilt", mat.name, "albedo" if old_img else "no albedo")


def main():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    head = bpy.data.objects['Object_2']
    eyes = bpy.data.objects['Object_3']

    # ---- 1. the fit, anchored on the eyes ---------------------------------
    s = CHAR_EYE[0] / BUST_EYE[0]
    ty = CHAR_EYE[1] - s * BUST_EYE[1]
    tz = CHAR_EYE[2] - s * BUST_EYE[2]
    log(f"fit: scale {s:.4f}  ty {ty:.4f}  tz {tz:.4f}")

    # THE PARENT IS PART OF THE TRANSFORM. The scan hangs off two Sketchfab
    # empties carrying a 0.2624 scale, and assigning `matrix_world` on a
    # parented object does not remove it — the exporter put it back and the
    # head came out 3.81x too big and eleven metres up. Unparent keeping the
    # transform, then APPLY it, so a vertex co IS a world coordinate; only
    # then is it safe to write coordinates in.
    bpy.ops.object.select_all(action='DESELECT')
    for ob in (head, eyes): ob.select_set(True)
    bpy.context.view_layer.objects.active = head
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for e in [o for o in bpy.data.objects if o.type == 'EMPTY']:
        bpy.data.objects.remove(e, do_unlink=True)
    for ob in (head, eyes):
        assert (ob.matrix_world.to_scale() - Vector((1, 1, 1))).length < 1e-5, ob.name
        me = ob.data
        for v in me.vertices:
            p = to_three(v.co)
            v.co = to_blender(Vector((p.x * s, p.y * s + ty, p.z * s + tz)))
        me.update()

    def three_of(ob, v): return to_three(v.co)

    # ---- 2. the neck onto the character's own ring at the cut --------------
    # The bust's own neck, ring by ring, measured the same way the
    # character's was — its centre and its radius in 24 directions per
    # height — so the morph is a correction between two rings and not a
    # guess at a half-width.
    rings = {}
    for v in head.data.vertices:
        p = to_three(v.co)
        if p.y > BLEND_TOP + 0.03 or p.y < KEEP_Y - 0.03: continue
        k = round(p.y * 100)
        rings.setdefault(k, [])
        rings[k].append(p)
    ring_c, ring_r = {}, {}
    for k, pts in rings.items():
        cx = sum(q.x for q in pts) / len(pts); cz = sum(q.z for q in pts) / len(pts)
        r = [0.0] * NB
        for q in pts:
            a2 = math.atan2(q.x - cx, q.z - cz)
            b2 = int(round((a2 / (2 * math.pi)) * NB)) % NB
            r[b2] = max(r[b2], math.hypot(q.x - cx, q.z - cz))
        # a direction with nothing in it takes its neighbours'
        for i in range(NB):
            if r[i] > 1e-6: continue
            for d2 in range(1, NB):
                lo, hi = r[(i - d2) % NB], r[(i + d2) % NB]
                if lo > 1e-6 and hi > 1e-6: r[i] = (lo + hi) / 2; break
                if lo > 1e-6: r[i] = lo; break
                if hi > 1e-6: r[i] = hi; break
        ring_c[k] = (cx, cz); ring_r[k] = r

    moved = 0
    for v in head.data.vertices:
        p = to_three(v.co)
        if p.y >= BLEND_TOP or p.y < KEEP_Y - 0.03: continue
        k = round(p.y * 100)
        if k not in ring_c: continue
        # 1 at the cut and below it, eased to nothing by the jaw
        w = min(1.0, max(0.0, (BLEND_TOP - p.y) / (BLEND_TOP - CUT_Y)))
        w = w * w * (3 - 2 * w)
        cx, cz = ring_c[k]
        dx, dz = p.x - cx, p.z - cz
        rb = math.hypot(dx, dz)
        if rb < 1e-5: continue
        a2 = math.atan2(dx, dz)
        rc = ring_at(a2 if a2 >= 0 else a2 + 2 * math.pi)
        # BELOW the cut it tucks INSIDE the body rather than sitting on it:
        # two coincident surfaces is z-fighting, and a millimetre in is
        # simply hidden by the character's own neck.
        if p.y < CUT_Y:
            t = (p.y - (KEEP_Y - 0.03)) / max(1e-6, CUT_Y - (KEEP_Y - 0.03))
            rc *= TUCK + (1 - TUCK) * max(0.0, min(1.0, t))
        f = 1 + (rc / rb - 1) * w
        ncx = cx + (CUT_C[0] - cx) * w
        ncz = cz + (CUT_C[1] - cz) * w
        v.co = to_blender(Vector((ncx + dx * f, p.y, ncz + dz * f)))
        moved += 1
    head.data.update()
    log("neck vertices morphed onto the character's ring:", moved)

    # ---- and cut off what the character keeps ------------------------------
    bm = bmesh.new(); bm.from_mesh(head.data)
    kill = [f for f in bm.faces
            if sum((to_three(v.co).y for v in f.verts)) / len(f.verts) < KEEP_Y]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    log("faces below the keep line dropped:", len(kill))

    # ---- 3. close the shell ------------------------------------------------
    bnd = [e for e in bm.edges if len(e.link_faces) == 1]
    log("open boundary edges:", len(bnd))
    if bnd:
        bmesh.ops.holes_fill(bm, edges=bnd, sides=0)
        # an n-gon across the back of a skull is flat; give it faces to shade
        new = [f for f in bm.faces if len(f.verts) > 4]
        if new:
            bmesh.ops.triangulate(bm, faces=new)
    bnd2 = [e for e in bm.edges if len(e.link_faces) == 1]
    log("boundary edges after fill:", len(bnd2))
    bm.to_mesh(head.data); bm.free()
    head.data.update()

    # ---- 4. down to a budget ----------------------------------------------
    # A NORMAL MAP WAS BAKED HERE AND IT WAS WRONG. High-to-low in Cycles
    # came back as saturated facets rather than a skin map — the bust is a
    # SHELL, and `holes_fill` closes the back of the skull and the neck with
    # flat n-gons that the cage rays hit from inside, so most of the atlas
    # baked the inside of the head. The head's surface detail comes off the
    # albedo in the game instead (`bustNormalMap`), which is the same
    # information, cannot be confused by a hole, and is the exact detail the
    # skin match is taking OUT of the albedo — so it moves from being a
    # picture of shading to being shading.
    for ob, target in ((head, 7000), (eyes, 700)):
        tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        if tris > target:
            m = ob.modifiers.new('dec', 'DECIMATE')
            m.ratio = target / tris
            bpy.context.view_layer.objects.active = ob
            bpy.ops.object.modifier_apply(modifier=m.name)
        log(ob.name, "triangles", sum(len(p.vertices) - 2 for p in ob.data.polygons))

    # AND THE GEOMETRY IS NOT SMOOTHED. A pass that relaxed the low poly to
    # take the "leather" out took the BROW, THE NOSE AND THE CHEEKBONES with
    # it and he came back a mannequin — the sculpt IS the face, and the only
    # thing that ever needed removing was the shading PAINTED on top of it.
    # Shade-smooth only, so the 7k mesh reads as a head and not as facets.
    for p2 in head.data.polygons: p2.use_smooth = True
    for p2 in eyes.data.polygons: p2.use_smooth = True
    rebuild_material(head)
    rebuild_material(eyes)

    # what the game needs to know, printed so the constants can be copied
    ws = [to_three(v.co) for v in head.data.vertices]
    log("final bounds  x %.4f %.4f  y %.4f %.4f  z %.4f %.4f" % (
        min(p.x for p in ws), max(p.x for p in ws),
        min(p.y for p in ws), max(p.y for p in ws),
        min(p.z for p in ws), max(p.z for p in ws)))

    for ob in bpy.data.objects: ob.select_set(True)
    # A NORMAL MAP WITHOUT TANGENTS SPLITS THE FACE IN HALF. three falls back
    # to screen-space derivatives when a mesh carries no TANGENT attribute,
    # and across this atlas's uv seam — which runs straight down the middle
    # of the face — the derived tangent flips sign: the first bake put a hard
    # vertical line down his nose with one cheek lit and the other not. The
    # exporter will compute them, and it is the only place that can, because
    # it is the only place that still has the uv layout and the smoothing
    # together.
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB',
                              use_selection=False, export_apply=True,
                              export_yup=True, export_texcoords=True,
                              export_normals=True, export_tangents=True,
                              export_materials='EXPORT',
                              export_image_format='JPEG')
    log("wrote", OUT, os.path.getsize(OUT), "bytes")

main()
