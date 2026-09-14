#!/usr/bin/env python3
"""The Iron Juggernaut, for the church: IronSpear's knight into assets/knight.glb.

Two stages, the way `tools/monster_anim.py` runs: the maps are built under the
system python because that is the one with PIL, then Blender is run on this
same file to assemble the model.

    /usr/bin/python3 tools/knight_pack.py

WHAT THE SOURCE IS. A Unity package: a 41-object mesh, an 88-bone Unreal
mannequin rig (pelvis / spine_01..05 / clavicle_l / upperarm_l / hand_l), and
seven locomotion clips in their own FBXs — idle, walk, run, jump, land, fall.
NO ATTACKS: the fight is authored in the game the way the witness's is.

THE MAPS ARE UDIM, WHICH glTF CANNOT DO. Every map ships as two tiles (.1001
and .1002) and the mesh's u runs 0..2 across them, so a naive import samples
one tile over the whole body. They are packed side by side into ONE atlas and
every u is halved — which also means ONE material for the armour and one for
the cloth instead of four, and four draw calls for the whole knight.

AND THE METALLIC MAP IS DROPPED, for the fourth time in this project: a metal
has no diffuse term and this game has no environment map, so an armoured
figure honouring its metalness renders as a black cut-out with a few pinpoints
on it. SOL stands on the altar this knight stands beside and went the same
way. What carries steel under a candle is the roughness and the map's own
emissive lift, which `dressMutant` gives it.

AND THE OCCLUSION IS MULTIPLIED INTO THE ALBEDO, because one directional light
that is somewhere else entirely never shades a crease: if the depth is not
baked into the colour it is not there. The mutants' own lesson.
"""
import os, sys, subprocess, json, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = '/Users/ethanreedy/Downloads/church knight'
PKG = os.path.join(SRC, 'Iron_Juggernaut_Unity.unitypackage')
WORK = '/tmp/knight_pack'
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'


def log(*a):
    print('[knight]', *a, flush=True)


# ----------------------------------------------------------------- stage one
def unpack():
    """Explode the unitypackage and index it by its real asset paths."""
    ex = os.path.join(WORK, 'pkg')
    if not os.path.isdir(ex):
        os.makedirs(ex, exist_ok=True)
        subprocess.run(['bsdtar', '-xzf', PKG, '-C', ex], check=True)
    index = {}
    for d in os.listdir(ex):
        pn = os.path.join(ex, d, 'pathname')
        at = os.path.join(ex, d, 'asset')
        if os.path.isfile(pn) and os.path.isfile(at):
            index[open(pn).read().split('\n')[0].strip()] = at
    return index


def build_maps(index, size):
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    out = os.path.join(WORK, 'tex')
    os.makedirs(out, exist_ok=True)
    base = 'Assets/IronSpear Content/Iron_Juggernaut/Textures/'

    def tile(fam, kind, n):
        for k, v in index.items():
            if k.startswith(base + 'T_%s_%s' % (fam, kind)) and ('.%d.png' % n) in k:
                return Image.open(v)
        raise SystemExit('missing %s %s .%d' % (fam, kind, n))

    made = {}
    for fam in ('Armor', 'Cloth'):
        # ---- albedo x ao, the two tiles side by side
        for name, kind, mode in (('albedo', 'AlbedoTransparency', 'RGB'),
                                 ('normal', 'Normal', 'RGB'),
                                 ('rough', 'MetallicSmoothness', 'L')):
            w = size if name != 'rough' else size // 2
            h = w // 2
            atlas = Image.new(mode, (w, h))
            for i, n in enumerate((1001, 1002)):
                im = tile(fam, kind, n)
                if name == 'albedo':
                    from PIL import ImageChops
                    im = im.convert('RGB')
                    ao = tile(fam, 'AO', n).convert('L').resize(im.size, Image.LANCZOS)
                    im = Image.merge('RGB', [ImageChops.multiply(c, ao) for c in im.split()])
                elif name == 'normal':
                    im = im.convert('RGB')
                else:
                    # Unity packs metallic in R and SMOOTHNESS in A; glTF wants
                    # roughness. No alpha in these PNGs means smoothness is in
                    # the alpha of an RGBA png — fall back to the blue channel.
                    im = im.convert('RGBA')
                    sm = im.split()[3]
                    if sm.getextrema() == (255, 255):
                        sm = im.convert('RGB').split()[2]
                    im = Image.eval(sm, lambda v: 255 - v)
                im = im.resize((w // 2, h), Image.LANCZOS)
                atlas.paste(im, (i * (w // 2), 0))
            p = os.path.join(out, '%s_%s.jpg' % (fam.lower(), name))
            atlas.convert('RGB').save(p, 'JPEG', quality=88, optimize=True)
            made['%s_%s' % (fam.lower(), name)] = p
            log('  %-16s %dx%d  %.0f KB' % (os.path.basename(p), w, h, os.path.getsize(p) / 1024))
    return made


# ----------------------------------------------------------------- stage two
def blender_main():
    import bpy, mathutils, math
    cfg = json.load(open(os.path.join(WORK, 'cfg.json')))
    maps, clips, dst, budget = cfg['maps'], cfg['clips'], cfg['dst'], cfg['budget']

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=cfg['mesh'])
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    log('imported %d meshes, rig %d bones' % (len(meshes), len(arm.data.bones)))

    # ---- THE UDIM TILES BECOME ONE ATLAS: halve every u.
    for o in meshes:
        me = o.data
        if not me.uv_layers:
            continue
        for l in me.uv_layers[0].data:
            l.uv[0] *= 0.5

    # ---- one material per family, wearing the atlas
    def mat_for(name, key):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes['Principled BSDF']
        bsdf.inputs['Metallic'].default_value = 0.0          # METALNESS IS A TRAP
        for slot, sock, cs in (('albedo', 'Base Color', 'sRGB'),
                               ('rough', 'Roughness', 'Non-Color'),
                               ('normal', None, 'Non-Color')):
            p = maps.get('%s_%s' % (key, slot))
            if not p:
                continue
            tex = nt.nodes.new('ShaderNodeTexImage')
            tex.image = bpy.data.images.load(p)
            tex.image.colorspace_settings.name = cs
            if slot == 'normal':
                nm = nt.nodes.new('ShaderNodeNormalMap')
                nt.links.new(tex.outputs['Color'], nm.inputs['Color'])
                nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
            else:
                nt.links.new(tex.outputs['Color'], bsdf.inputs[sock])
        return m

    armor = mat_for('knight_armor', 'armor')
    cloth = mat_for('knight_cloth', 'cloth')
    dark = bpy.data.materials.new('knight_dark')
    dark.use_nodes = True
    dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.02, 0.02, 0.025, 1)
    dark.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0.0

    for o in meshes:
        me = o.data
        names = [m.name if m else '' for m in me.materials]
        pick = armor
        if any(n.startswith('M_Cloth') for n in names):
            pick = cloth
        if any(n == 'M_Dark' for n in names):
            pick = dark
        me.materials.clear()
        me.materials.append(pick)
        for p in me.polygons:
            p.material_index = 0

    # ---- join into one mesh per material
    bpy.ops.object.select_all(action='DESELECT')
    groups = {}
    for o in meshes:
        groups.setdefault(o.data.materials[0].name, []).append(o)
    joined = []
    for name, objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        j = bpy.context.view_layer.objects.active
        j.name = name
        joined.append(j)
        log('  %-14s %d tris' % (name, sum(len(p.vertices) - 2 for p in j.data.polygons)))

    # ---- decimate to a budget, keeping the skinning
    tot = sum(sum(len(p.vertices) - 2 for p in j.data.polygons) for j in joined)
    if budget and tot > budget:
        ratio = budget / tot
        for j in joined:
            bpy.context.view_layer.objects.active = j
            m = j.modifiers.new('dec', 'DECIMATE')
            m.ratio = ratio
            m.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier='dec')
        log('decimated %d -> %d tris' % (tot, sum(sum(len(p.vertices) - 2 for p in j.data.polygons) for j in joined)))

    # ---- the clips, off their own FBXs onto this rig
    keep = set(bpy.data.objects)
    for key, path in clips.items():
        before = set(bpy.data.actions)
        bpy.ops.import_scene.fbx(filepath=path)
        new = [a for a in bpy.data.actions if a not in before]
        if new:
            new[0].name = key
            new[0].use_fake_user = True
        for o in list(bpy.data.objects):
            if o not in keep:
                bpy.data.objects.remove(o, do_unlink=True)
        log('  clip %-10s %s' % (key, 'ok' if new else 'MISSING'))

    # every clip is exported by pushing it onto the rig's NLA
    arm.animation_data_create()
    for a in bpy.data.actions:
        if a.name in clips:
            tr = arm.animation_data.nla_tracks.new()
            tr.name = a.name
            tr.strips.new(a.name, int(a.frame_range[0]), a)

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB',
                              export_animations=True, export_force_sampling=True,
                              export_image_format='JPEG', export_jpeg_quality=88,
                              export_yup=True, export_apply=False)
    log('%s: %.2f MB' % (os.path.basename(dst), os.path.getsize(dst) / 1e6))


if __name__ == '__main__':
    if 'bpy' in sys.modules or os.environ.get('KNIGHT_IN_BLENDER'):
        blender_main()
    else:
        os.makedirs(WORK, exist_ok=True)
        log('unpacking')
        index = unpack()
        log('building maps')
        maps = build_maps(index, 2048)
        base = 'Assets/IronSpear Content/Iron_Juggernaut/Animations/'
        want = {'idle': 'MM_Idle', 'walk': 'MM_Walk_Fwd', 'run': 'MM_Run_Fwd',
                'walkip': 'MM_Walk_InPlace', 'jump': 'MM_Jump', 'land': 'MM_Land'}
        clips = {}
        for k, v in want.items():
            for p, a in index.items():
                if p == base + v + '.FBX':
                    d = os.path.join(WORK, v + '.fbx')
                    shutil.copy(a, d)
                    clips[k] = d
        json.dump({'maps': maps, 'clips': clips, 'mesh': os.path.join(SRC, 'LowPoly.fbx'),
                   'dst': os.path.join(ROOT, 'assets/knight.glb'), 'budget': 26000},
                  open(os.path.join(WORK, 'cfg.json'), 'w'))
        log('running blender')
        env = dict(os.environ, KNIGHT_IN_BLENDER='1')
        r = subprocess.run([BLENDER, '-b', '-noaudio', '--python', os.path.abspath(__file__)],
                           env=env, capture_output=True, text=True)
        out = [l for l in r.stdout.split('\n') if l.startswith('[knight]') or 'Error' in l or 'Traceback' in l]
        print('\n'.join(out[-40:]))
        if r.returncode:
            print(r.stderr[-2000:])
