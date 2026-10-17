#!/usr/bin/env python3
"""The paladin: the owner's "paintpoly humanoid paladin knight" into assets/paladin.glb.

Two stages, the way `tools/crusader_pack.py` runs: the maps are built under the system
python (the one with PIL and numpy), then Blender is run on this same file to rebuild
the rig and export.

    /usr/bin/python3 tools/paladin_pack.py

WHAT THE SOURCE IS (~/Downloads/paladin): one FBX — nine meshes on one material, 26k
triangles, a two-metre greatsword parented to `DEF-hand.R` — on a Blender RIGIFY rig of
567 bones, of which only the `DEF-` ones deform. No clips: this writes the rigged, painted
man to /tmp/paladin_pack/rest.blend, and `tools/paladin_bake.py` bakes every move onto him
and writes assets/paladin.glb (PALADIN_STATIC=1 exports him here, clipless, as before).

THE RIG IS REBUILT, NOT RENAMED. Rigify's deform chain is broken up by its ORG/MCH
bones (`DEF-thigh.L`'s parent is `ORG-spine`, the arms hang off `ORG-shoulder`), and
it has twist halves (`DEF-upper_arm.L.001` …) and palm bones Mixamo does not. A new
armature is built with MIXAMO'S names and Mixamo's hierarchy, each bone laid where its
DEF bone lies (a twist pair becomes one bone, head of the first to tail of the second),
and the skin's groups are merged onto it the same way — so the game's retarget,
ragdoll and fist tables map him one to one, like the orc and the farmers.

THE SWORD IS PART OF THE SKIN: weighted wholly to its own `Sword` bone (a child of the
right hand, at the grip), one mesh, one draw. Two empties ride it where the blade's ends are — `paladin_hilt` and `paladin_tip` —
for the hit sweep, the trail and the cut in his entrance.

THE PAINT IS MADE GRIM. The source is a hand-painted lilac plate, a violet tabard and
tan leather: a storybook knight. Here the plate goes to blackened gunmetal (its own
painted light kept as the wear), the cloth to a dried-blood black-red, the leather to
old dark hide, with grime in the low frequencies. METALNESS IS A TRAP: none.
"""
import os, sys, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.expanduser('~/Downloads/paladin')
WORK = '/tmp/paladin_pack'
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
TEX = 't_paintpoly_paladin_knight_%s.png'


def log(*a):
    print('[paladin]', *a, flush=True)


# ------------------------------------------------------------------ stage one: maps
def build_maps():
    import numpy as np
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    out = os.path.join(WORK, 'tex'); os.makedirs(out, exist_ok=True)
    made = {}
    alb = Image.open(os.path.join(SRC, 'textures', TEX % 'albedo')).convert('RGB').resize((2048, 2048), Image.LANCZOS)
    a = np.asarray(alb).astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    # what each texel is: violet cloth (blue and red over green, saturated), brown leather (red over blue), else plate
    cloth = ((b > g + 0.05) & (r > g) & (sat > 0.22)).astype(np.float32)
    leather = ((r > b + 0.06) & (r > g)).astype(np.float32)
    plate = np.clip(1.0 - cloth - leather, 0, 1)
    # grime: a few octaves of smooth value noise in texture space
    rng = np.random.default_rng(7)
    def octave(n):
        im = Image.fromarray((rng.random((n, n)) * 255).astype(np.uint8)).resize((2048, 2048), Image.BICUBIC)
        return np.asarray(im).astype(np.float32) / 255.0
    grime = 0.5 * octave(16) + 0.3 * octave(48) + 0.2 * octave(160)
    grime = np.clip((grime - 0.35) * 1.6, 0, 1)
    # the plate: blackened steel, its painted light kept as wear (contrast up round the middle)
    wear = np.clip((L - 0.6) * 2.5 + 0.5, 0, 1.2)
    steel = np.stack([0.22 + 0.0 * L, 0.23 + 0.0 * L, 0.25 + 0.0 * L], -1) * (0.35 + 0.9 * wear)[..., None]
    steel *= (1.0 - 0.26 * grime)[..., None]
    rust = np.stack([0.24, 0.12, 0.07]) * np.ones_like(a)
    rk = np.clip((grime - 0.7) * 2.2, 0, 0.5)[..., None]
    steel = steel * (1 - rk) + rust * rk * (0.5 + 0.6 * wear[..., None])
    # the tabard: black-red, the folds its own light
    cl = np.clip(L * 1.5, 0, 1)
    tab = np.stack([0.20 * cl + 0.03, 0.045 * cl + 0.012, 0.05 * cl + 0.015], -1) * (1.0 - 0.25 * grime)[..., None]
    # the leather: old dark hide
    hide = a * np.array([0.42, 0.36, 0.33]) * (1.0 - 0.3 * grime)[..., None]
    o = steel * plate[..., None] + tab * cloth[..., None] + hide * leather[..., None]
    o = np.clip(o, 0, 1) ** (1 / 1.05)
    p = os.path.join(out, 'albedo.jpg'); Image.fromarray((o * 255).astype(np.uint8)).save(p, 'JPEG', quality=90, optimize=True); made['albedo'] = p
    nm = Image.open(os.path.join(SRC, 'textures', TEX % 'normal_tngt')).convert('RGB').resize((2048, 2048), Image.LANCZOS)
    p = os.path.join(out, 'normal.jpg'); nm.save(p, 'JPEG', quality=90, optimize=True); made['normal'] = p
    ro = np.asarray(Image.open(os.path.join(SRC, 'textures', TEX % 'roughness')).convert('L').resize((1024, 1024), Image.LANCZOS)).astype(np.float32) / 255
    gr = np.asarray(Image.fromarray((grime * 255).astype(np.uint8)).resize((1024, 1024))).astype(np.float32) / 255
    ro = np.clip(ro * 0.85 + 0.12 + 0.18 * gr, 0.35, 1.0)            # nothing on him shines like new
    p = os.path.join(out, 'rough.jpg'); Image.fromarray((ro * 255).astype(np.uint8)).convert('RGB').save(p, 'JPEG', quality=88, optimize=True); made['rough'] = p
    for k, v in made.items():
        log('  %-7s %.0f KB' % (k, os.path.getsize(v) / 1024))
    log('  cloth %.1f%%  leather %.1f%%  plate %.1f%%' % (cloth.mean() * 100, leather.mean() * 100, plate.mean() * 100))
    return made


# ------------------------------------------------------------------ stage two: Blender
# Mixamo name: (DEF bones merged into it, the first one's head to the last one's tail)
SIDE = {}
for s, S in (('L', 'Left'), ('R', 'Right')):
    SIDE.update({
        S + 'Shoulder': ['DEF-shoulder.' + s],
        S + 'Arm': ['DEF-upper_arm.' + s, 'DEF-upper_arm.%s.001' % s],
        S + 'ForeArm': ['DEF-forearm.' + s, 'DEF-forearm.%s.001' % s],
        S + 'Hand': ['DEF-hand.' + s] + ['DEF-palm.0%d.%s' % (i, s) for i in (1, 2, 3, 4)],
        S + 'UpLeg': ['DEF-thigh.' + s, 'DEF-thigh.%s.001' % s],
        S + 'Leg': ['DEF-shin.' + s, 'DEF-shin.%s.001' % s],
        S + 'Foot': ['DEF-foot.' + s],
        S + 'ToeBase': ['DEF-toe.' + s],
    })
    for mf, rf in (('Thumb', 'thumb'), ('Index', 'f_index'), ('Middle', 'f_middle'), ('Ring', 'f_ring'), ('Pinky', 'f_pinky')):
        for i in (1, 2, 3):
            SIDE['%sHand%s%d' % (S, mf, i)] = ['DEF-%s.0%d.%s' % (rf, i, s)]
MAP = {'Hips': ['DEF-spine', 'DEF-pelvis.L', 'DEF-pelvis.R'], 'Spine': ['DEF-spine.001'], 'Spine1': ['DEF-spine.002'],
       'Spine2': ['DEF-spine.003', 'DEF-breast.L', 'DEF-breast.R'], 'Neck': ['DEF-spine.004', 'DEF-spine.005'],
       'Head': ['DEF-spine.006'], **SIDE}
# the bone's own geometry comes from the chain, not the extras (pelvis, breast, palm are weights only)
CHAIN = {k: [n for n in v if not any(t in n for t in ('pelvis', 'breast', 'palm'))] for k, v in MAP.items()}
PARENT = {'Hips': None, 'Spine': 'Hips', 'Spine1': 'Spine', 'Spine2': 'Spine1', 'Neck': 'Spine2', 'Head': 'Neck'}
for S in ('Left', 'Right'):
    PARENT.update({S + 'Shoulder': 'Spine2', S + 'Arm': S + 'Shoulder', S + 'ForeArm': S + 'Arm', S + 'Hand': S + 'ForeArm',
                   S + 'UpLeg': 'Hips', S + 'Leg': S + 'UpLeg', S + 'Foot': S + 'Leg', S + 'ToeBase': S + 'Foot'})
    for mf in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
        PARENT['%sHand%s1' % (S, mf)] = S + 'Hand'
        PARENT['%sHand%s2' % (S, mf)] = '%sHand%s1' % (S, mf)
        PARENT['%sHand%s3' % (S, mf)] = '%sHand%s2' % (S, mf)


def blender_main():
    import bpy
    from mathutils import Vector
    cfg = json.load(open(os.path.join(WORK, 'cfg.json')))
    from mathutils import Matrix
    # the captured swordsman's grip, read off his own rest by `tools/eej_convert.py` (the EEJANAI pack: his moves now)
    # (the EEJANAI grip.json is no longer read: the bake seats his hand on the captured blade, frame by frame)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=cfg['mesh'])
    src = bpy.data.objects['rig']
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    # the DEF bones as they lie at rest (armature space; the rig's own transform is the identity)
    bpy.context.view_layer.objects.active = src
    bpy.ops.object.mode_set(mode='EDIT')
    E = {b.name: (b.head.copy(), b.tail.copy(), b.roll) for b in src.data.edit_bones if b.name.startswith('DEF-')}
    bpy.ops.object.mode_set(mode='OBJECT')
    # the new armature
    ad = bpy.data.armatures.new('paladin_rig')
    rig = bpy.data.objects.new('paladin_rig', ad)
    bpy.context.scene.collection.objects.link(rig)
    rig.matrix_world = src.matrix_world.copy()
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for name, chain in CHAIN.items():
        h, _, roll = E[chain[0]]; t = E[chain[-1]][1]
        eb = ad.edit_bones.new(name); eb.head, eb.tail, eb.roll = h, t, roll
    for name, par in PARENT.items():
        if par:
            ad.edit_bones[name].parent = ad.edit_bones[par]
    bpy.ops.object.mode_set(mode='OBJECT')
    log('rig: %d bones (from %d)' % (len(ad.bones), len(src.data.bones)))
    # the skin's groups onto it
    inv = {d: k for k, v in MAP.items() for d in v}
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    sword = bpy.data.objects['model_sword']
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None; o.matrix_world = mw
        for m in list(o.modifiers):
            if m.type == 'ARMATURE':
                o.modifiers.remove(m)
        if o is sword:
            for v in list(o.vertex_groups):
                o.vertex_groups.remove(v)
            g = o.vertex_groups.new(name='Sword'); g.add(range(len(o.data.vertices)), 1.0, 'REPLACE')
            continue
        idx = {g.index: g.name for g in o.vertex_groups}
        acc = {}
        lost = set()
        for v in o.data.vertices:
            for ge in v.groups:
                n = idx[ge.group]; k = inv.get(n)
                if k is None:
                    lost.add(n); continue
                acc.setdefault(k, {}); acc[k][v.index] = acc[k].get(v.index, 0) + ge.weight
        for g in list(o.vertex_groups):
            o.vertex_groups.remove(g)
        for k, ws in acc.items():
            g = o.vertex_groups.new(name=k)
            for vi, w in ws.items():
                g.add([vi], min(1.0, w), 'REPLACE')
        if lost:
            log('  %s: unmapped groups %s' % (o.name, sorted(lost)))
    # THE GRIP IS SEATED IN HIS FIST (2026-10-17, round 4). The maker parented the blade to the hand for a POSED
    # hand: at rest it floats across his chest, nowhere near the palm (rendered) — so no rest-relative seat is a grip.
    # It is laid here the way a hand holds a sword: the grip across the palm along the knuckles (pinky to index, tipped
    # a little up the hand), just in front of the palm, its flat parallel to the palm, the hand closed right under the
    # guard. `tools/paladin_bake.py` then curls the fingers round it and turns the hand onto the captured blade.
    import numpy as np
    P3 = np.array([tuple(sword.matrix_world @ v.co) for v in sword.data.vertices])
    c0 = P3.mean(0); _, _, Vt = np.linalg.svd(P3 - c0, full_matrices=False)
    ax, fl = Vector(Vt[0]), Vector(Vt[2])
    tt = (P3 - c0) @ Vt[0]; rr = np.linalg.norm((P3 - c0) - np.outer(tt, Vt[0]), axis=1)
    K0 = 0.78                                                # (the blade is scaled by this, below)
    lo, hi = tt.min(), tt.max(); nb = 60; edges = np.linspace(lo, hi, nb + 1)
    wid = np.array([rr[(tt >= edges[b]) & (tt <= edges[b + 1])].max() if ((tt >= edges[b]) & (tt <= edges[b + 1])).any() else 0 for b in range(nb)])
    gb = int(wid.argmax())                                   # the guard: the widest section
    if gb > nb / 2: ax, fl, tt, lo, hi, edges, wid = -ax, fl, -tt, -hi, -lo, -edges[::-1], wid[::-1]; gb = nb - 1 - gb
    # (now the pommel is at `lo` and the point at `hi`; the guard at bin gb)
    guard = Vector(c0) + ax * float((edges[gb] + edges[gb + 1]) / 2)
    nz = [w for w in wid[2:max(3, gb - 1)] if w > 0]           # (a low-poly grip has vertices only at its rings)
    gripW = float(np.median(nz)) * K0 if nz else 0.025
    hH, iH, pH5, mH = E['DEF-hand.R'][0], E['DEF-f_index.01.R'][0], E['DEF-f_pinky.01.R'][0], E['DEF-f_middle.01.R'][0]
    hd = (mH - hH).normalized(); kn = (iH - pH5).normalized()
    palmN = kn.cross(hd).normalized()                        # (the right hand's palm side: checked on the render)
    want = (kn + hd * 0.30).normalized()                     # the blade's way out of the fist: by the thumb, a little up the hand
    G = (iH + pH5) / 2 * 0.80 + hH * 0.20 + palmN * (gripW + 0.016)
    half = (iH - pH5).length * 0.5 + 0.012                   # under the guard by half a hand
    # (round 5, the owner: "hes holding too high on the handle" — the fist had closed against the guard; 7 cm further
    # down the grip, 5.5 in the game's scale, still leaves room for the left hand above the pommel)
    gripAt = guard - ax * (half + 0.082)
    fN = (palmN - want * palmN.dot(want)).normalized()
    def fr(x, y):
        x = x.normalized(); y = (y - x * y.dot(x)).normalized(); return Matrix((x, y, x.cross(y))).transposed()
    R = (fr(want, fN) @ fr(ax, fl).transposed()).to_4x4()
    K = 0.78
    sword.matrix_world = Matrix.Translation(G) @ R @ Matrix.Scale(K, 4) @ Matrix.Translation(-gripAt) @ sword.matrix_world
    log('profile (pommel->point): ' + ' '.join('%.0f' % (w * 1000) for w in wid) + ' guard bin %d' % gb)
    log('sword seated: grip r %.3f, under the guard at %s, out by the thumb %s' % (gripW, tuple(round(c, 3) for c in G), tuple(round(c, 2) for c in want)))
    # where the blade's ends are: the sword's two farthest-apart extremes along its long axis
    ws = [sword.matrix_world @ v.co for v in sword.data.vertices]
    hand = E['DEF-hand.R'][0]
    tip = max(ws, key=lambda p: (p - hand).length)
    far = max(ws, key=lambda p: (p - tip).length)                      # the pommel end
    axis = (tip - far).normalized()
    hilt = G                                                            # the grip: where his fist closes
    log('sword: %.2f m, tip %s, pommel %s' % ((tip - far).length, tuple(round(c, 2) for c in tip), tuple(round(c, 2) for c in far)))
    # THE SWORD HAS ITS OWN BONE, a child of the hand at the grip, pointing up the blade: the bake keys nothing on it
    # (it rides the fist), and the blade's ends ride it
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    eb = ad.edit_bones.new('Sword'); eb.head = hilt; eb.tail = hilt + axis * 0.3
    eb.align_roll(rig.matrix_world.to_3x3().inverted() @ (sword.matrix_world.to_3x3() @ Vector((1, 0, 0))))
    eb.parent = ad.edit_bones['RightHand']
    bpy.ops.object.mode_set(mode='OBJECT')
    # one mesh, one material
    m = bpy.data.materials.new('paladin')
    m.use_nodes = True; m.use_backface_culling = True
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']; bsdf.inputs['Metallic'].default_value = 0.0
    for slot, sock, cs in (('albedo', 'Base Color', 'sRGB'), ('rough', 'Roughness', 'Non-Color'), ('normal', None, 'Non-Color')):
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(cfg['maps'][slot]); tex.image.colorspace_settings.name = cs
        if slot == 'normal':
            nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tex.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
        else:
            nt.links.new(tex.outputs['Color'], bsdf.inputs[sock])
    for o in meshes:
        o.data.materials.clear(); o.data.materials.append(m)
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active; body.name = 'paladin_body'
    body.parent = rig
    mod = body.modifiers.new('rig', 'ARMATURE'); mod.object = rig
    log('body: %d tris' % sum(len(p.vertices) - 2 for p in body.data.polygons))
    bpy.data.objects.remove(src, do_unlink=True)
    for o in list(bpy.data.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o, do_unlink=True)
    # the blade's ends, riding the hand
    hb = rig.data.bones['RightHand']
    for name, at in (('paladin_tip', tip), ('paladin_hilt', hilt), ('paladin_pommel', far)):
        e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e)
        e.parent = rig; e.parent_type = 'BONE'; e.parent_bone = 'Sword'
        e.matrix_world = rig.matrix_world @ __import__('mathutils').Matrix.Translation(at)
    rig['bw_grip'] = gripW
    rig['bw_paladin'] = json.dumps({'sword': round((tip - far).length, 3), 'h': round(max(p.z for p in (E['DEF-spine.006'][1],)), 3)})
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'rest.blend'))      # (what `tools/paladin_bake.py` opens)
    log('rest scene saved; run tools/paladin_bake.py for his moves')
    if os.environ.get('PALADIN_STATIC') != '1':
        return
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=cfg['dst'], export_format='GLB', export_animations=False,
                              export_extras=True, export_image_format='JPEG', export_jpeg_quality=90,
                              export_yup=True, export_apply=False, export_def_bones=False)
    log('%s: %.2f MB' % (os.path.basename(cfg['dst']), os.path.getsize(cfg['dst']) / 1e6))


if __name__ == '__main__':
    if 'bpy' in sys.modules or os.environ.get('PALADIN_IN_BLENDER'):
        blender_main()
    else:
        os.makedirs(WORK, exist_ok=True)
        T = os.path.join(WORK, 'tex')
        maps = {k: os.path.join(T, k + '.jpg') for k in ('albedo', 'normal', 'rough')}
        if not all(os.path.exists(v) for v in maps.values()):
            log('building maps')
            maps = build_maps()
        json.dump({'maps': maps, 'mesh': os.path.join(SRC, 'fbx', 'paintpoly_humanoid_paladin_knight.fbx'),
                   'grip': os.path.expanduser('~/paladin moves/converted/grip.json'),
                   'dst': os.path.join(ROOT, 'assets/paladin.glb')}, open(os.path.join(WORK, 'cfg.json'), 'w'))
        log('running blender')
        env = dict(os.environ, PALADIN_IN_BLENDER='1')
        r = subprocess.run([BLENDER, '-b', '-noaudio', '--python', os.path.abspath(__file__)], env=env, capture_output=True, text=True)
        out = [l for l in r.stdout.split('\n') if l.startswith('[paladin]') or 'Error' in l or 'Traceback' in l]
        print('\n'.join(out[-60:]))
        if r.returncode:
            print(r.stderr[-3000:])
