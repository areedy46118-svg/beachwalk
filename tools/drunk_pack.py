#!/usr/bin/env python3
"""The drunk in the tavern: the owner's "Monster1_1" into assets/drunk.glb.

Two stages, the knight's way: the maps are built under the system python
(the one with PIL), then Blender is run on this same file to assemble it.

    /opt/homebrew/bin/python3 tools/drunk_pack.py

WHAT THE SOURCE IS. A game character on an UNREAL MANNEQUIN RIG (pelvis /
spine_01..03 / clavicle_l / upperarm_l / hand_l, with twist bones), fourteen
skinned meshes, eight material families each with colour / ao / normal /
rough / metalness at 2048, and seven demo clips in their own FBXs. The rig is
the knight's naming, so the knight's ragdoll map — and therefore every Mixamo
clip this project has ever retargeted — fits him without a line of difference.

AND THE METALLIC MAPS ARE DROPPED, for the fifth time: no environment map, so
metal is a black cut-out. The occlusion is multiplied into the colour, because
one directional light never shades a crease. The head's emission map is kept:
it is his eyes.
"""
import os, sys, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = '/Users/ethanreedy/Downloads/drunk model'
WORK = '/tmp/drunk_pack'
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
# material slot name in the FBX -> texture family
FAM = {'Head_1': ('Body', 'Head1'), 'Hands_1': ('Body', 'Hands1'), 'Torso_1': ('Body', 'Torso1'),
       'Legs_1': ('Body', 'Legs1'), 'LegArmor_1': ('Equipment', 'LegsArmor1'),
       'Equip_1': ('Equipment', 'Equipment1'), 'Equip_2': ('Equipment', 'Equip2'), 'Equip_3': ('Equipment', 'Equip3')}


def log(*a):
    print('[drunk]', *a, flush=True)


def build_maps(size):
    from PIL import Image, ImageChops
    out = os.path.join(WORK, 'tex')
    os.makedirs(out, exist_ok=True)
    maps = {}
    for slot, (folder, fam) in FAM.items():
        base = os.path.join(SRC, 'Textures', folder, 'T_Monster_%s_' % fam)
        col = Image.open(base + 'color_skin1.png').convert('RGB').resize((size, size), Image.LANCZOS)
        ao = Image.open(base + 'ao.png').convert('L').resize((size, size), Image.LANCZOS)
        col = ImageChops.multiply(col, Image.merge('RGB', (ao, ao, ao)))
        p = os.path.join(out, slot + '_albedo.jpg'); col.save(p, 'JPEG', quality=88, optimize=True); maps[slot + '_albedo'] = p
        nm = Image.open(base + 'nmap.png').convert('RGB').resize((size, size), Image.LANCZOS)
        p = os.path.join(out, slot + '_normal.jpg'); nm.save(p, 'JPEG', quality=88, optimize=True); maps[slot + '_normal'] = p
        rg = Image.open(base + 'rough.png').convert('L').resize((size // 2, size // 2), Image.LANCZOS)
        p = os.path.join(out, slot + '_rough.jpg'); rg.save(p, 'JPEG', quality=86, optimize=True); maps[slot + '_rough'] = p
        em = base + 'emission_skin1.png'
        if os.path.exists(em):
            e = Image.open(em).convert('RGB').resize((size // 2, size // 2), Image.LANCZOS)
            p = os.path.join(out, slot + '_emis.jpg'); e.save(p, 'JPEG', quality=86, optimize=True); maps[slot + '_emis'] = p
        log('  %-10s ok' % slot)
    return maps


def blender_main():
    import bpy
    cfg = json.load(open(os.path.join(WORK, 'cfg.json')))
    maps, clips, dst = cfg['maps'], cfg['clips'], cfg['dst']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=cfg['mesh'])
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    log('imported %d meshes, rig %d bones' % (len(meshes), len(arm.data.bones)))

    def mat_for(slot):
        m = bpy.data.materials.new('drunk_' + slot)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes['Principled BSDF']
        bsdf.inputs['Metallic'].default_value = 0.0          # METALNESS IS A TRAP
        for kind, sock, cs in (('albedo', 'Base Color', 'sRGB'), ('rough', 'Roughness', 'Non-Color'),
                               ('normal', None, 'Non-Color'), ('emis', 'Emission Color', 'sRGB')):
            p = maps.get('%s_%s' % (slot, kind))
            if not p:
                continue
            tex = nt.nodes.new('ShaderNodeTexImage')
            tex.image = bpy.data.images.load(p)
            tex.image.colorspace_settings.name = cs
            if kind == 'normal':
                nm = nt.nodes.new('ShaderNodeNormalMap')
                nt.links.new(tex.outputs['Color'], nm.inputs['Color'])
                nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
            else:
                nt.links.new(tex.outputs['Color'], bsdf.inputs[sock])
                if kind == 'emis':
                    bsdf.inputs['Emission Strength'].default_value = 1.0
        return m

    mats = {slot: mat_for(slot) for slot in FAM}
    for o in meshes:
        me = o.data
        for i, m in enumerate(me.materials):
            if m and m.name in mats:
                me.materials[i] = mats[m.name]
            else:
                log('  unknown material', m and m.name, 'on', o.name)
    # one object, its material slots kept: fourteen nodes become one
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = 'drunk'
    log('  joined: %d tris, %d material slots' % (sum(len(p.vertices) - 2 for p in body.data.polygons), len(body.data.materials)))

    # the demo clips, off their own FBXs onto this rig
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
        log('  clip %-8s %s' % (key, 'ok' if new else 'MISSING'))
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
    if 'bpy' in sys.modules or os.environ.get('DRUNK_IN_BLENDER'):
        blender_main()
    else:
        os.makedirs(WORK, exist_ok=True)
        log('building maps')
        maps = build_maps(1024)
        A = os.path.join(SRC, 'Basic+Demo+Animations')
        clips = {'idle': 'Idle.fbx', 'walk': 'Walk.FBX', 'run': 'Run.FBX', 'die': 'Death.fbx', 'talk': 'Talk.FBX'}
        clips = {k: os.path.join(A, v) for k, v in clips.items()}
        json.dump({'maps': maps, 'clips': clips, 'mesh': os.path.join(SRC, 'Monster1_1.fbx'),
                   'dst': os.path.join(ROOT, 'assets/drunk.glb')}, open(os.path.join(WORK, 'cfg.json'), 'w'))
        log('running blender')
        env = dict(os.environ, DRUNK_IN_BLENDER='1')
        r = subprocess.run([BLENDER, '-b', '-noaudio', '--python', os.path.abspath(__file__)], env=env, capture_output=True, text=True)
        out = [l for l in r.stdout.split('\n') if l.startswith('[drunk]') or 'Error' in l or 'Traceback' in l]
        print('\n'.join(out[-30:]))
        if r.returncode:
            print(r.stderr[-2000:])
