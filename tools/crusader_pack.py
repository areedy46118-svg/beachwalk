#!/usr/bin/env python3
"""The flail knight for Castle XIII: the "Crusader tank" into assets/crusader.glb.

Two stages, the way `tools/knight_pack.py` runs: the maps are built under the
system python because that is the one with PIL, then Blender is run on this
same file to assemble the model and his own fourteen clips.

    /usr/bin/python3 tools/crusader_pack.py

WHAT THE SOURCE IS (the owner's ~/Downloads/flail knight, four .rar files that
bsdtar opens): a HumanIK rig (`Crusader_tank_Hips`, `..._LeftUpLeg` — Mixamo's
naming with a prefix, so the game's ragdoll and retarget tables map it one to
one), 18 body meshes and 7 weapon meshes (a flail on a twelve-link chain in the
right hand, a heater shield on the left forearm), 4096 maps, and fourteen clips
in their own FBXs, each of which also carries the whole mesh and the HumanIK
control rig again.

THE CLIPS ARE PLAYED FAST IN HIS OWN UNITY SCENE. Its Animator Controller runs
the attacks, the run and the death at 3x and the walk, the side step, the hit
reel and the shield bash at 2x; only `idle1` is 1x. The raw takes are slow on
purpose (24 fps, 80 frames for a swing). The rates go into the file
(`bw_crusader.rate`) and the game plays them at that speed: that IS the
animation as its author shows it.

THE TAKES ARE PADDED. The armature's action runs to frame 341 or 201 while the
take itself (every other object's action) ends at 61 or 81; the take's end is
read off those and the clip is cut there.

ONLY SOME CLIPS DRIVE THE CHAIN. Measured: the three attacks and the shield
bash key the twelve links and the ball; the idles, the walk and the run do not,
so in those the flail hangs at its bind angle off the haft — straight on along
it, which is wrong whenever the haft is not hanging down. The list goes into
the file (`chain`) and the game swings the chain itself (a Verlet rope) for any
clip that does not.

METALNESS IS A TRAP (the eleventh time): dropped. The Unity metallic map's alpha
is SMOOTHNESS and goes in as roughness (times the body material's own
GlossMapScale 0.484); the occlusion is multiplied into the albedo; the
"emission" map is only the gutter fill between islands and is dropped.
"""
import os, sys, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.expanduser('~/Downloads/flail knight')
WORK = '/tmp/crusader_pack'
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
CLIPS = {
    # name in the game: (file, Unity speed)
    'idle': ('idle1', 1.0), 'idleB': ('idle2', 2.0), 'idleC': ('idle3', 2.0),
    'guard': ('battle poze', 2.0), 'walk': ('walk', 2.0), 'run': ('run', 3.0),
    'side': ('side step', 2.0), 'jump': ('jump', 2.0), 'hit': ('gethit', 2.0),
    'die': ('death', 3.0), 'cA1': ('atack1', 3.0), 'cA2': ('atack2', 3.0),
    'cA3': ('atack3', 3.0), 'cBash': ('atack shield', 2.0),
}


def log(*a):
    print('[crusader]', *a, flush=True)


def unrar():
    for n in ('Base+mesh', 'animation', 'texture'):
        d = os.path.join(WORK, n)
        if not os.path.isdir(d):
            os.makedirs(d, exist_ok=True)
            subprocess.run(['bsdtar', '-xf', os.path.join(SRC, n + '.rar'), '-C', d], check=True)


def build_maps():
    from PIL import Image, ImageChops
    Image.MAX_IMAGE_PIXELS = None
    T = os.path.join(WORK, 'texture', 'texture final')
    out = os.path.join(WORK, 'tex'); os.makedirs(out, exist_ok=True)
    made = {}
    for part, size, gloss in (('body', 2048, 0.484), ('weapon', 1024, 1.0)):
        alb = Image.open(os.path.join(T, '1_%s_Albedo.tga' % part)).convert('RGB')
        ao = Image.open(os.path.join(T, '1_%s_Occlusion.tga' % part)).convert('L').resize(alb.size, Image.LANCZOS)
        # the occlusion's gutter is black; under the islands it is the real thing
        ao = Image.eval(ao, lambda v: int(70 + v * (255 - 70) / 255))
        alb = Image.merge('RGB', [ImageChops.multiply(c, ao) for c in alb.split()]).resize((size, size), Image.LANCZOS)
        p = os.path.join(out, part + '_albedo.jpg'); alb.save(p, 'JPEG', quality=90, optimize=True); made[part + '_albedo'] = p
        nm = Image.open(os.path.join(T, '1_%s_Normal.tga' % part)).convert('RGB').resize((size, size), Image.LANCZOS)
        p = os.path.join(out, part + '_normal.jpg'); nm.save(p, 'JPEG', quality=90, optimize=True); made[part + '_normal'] = p
        sm = Image.open(os.path.join(T, '1_%s_Metallic.tga' % part)).split()[3].resize((size // 2, size // 2), Image.LANCZOS)
        rough = Image.eval(sm, lambda v: int(255 - v * gloss))
        p = os.path.join(out, part + '_rough.jpg'); rough.convert('RGB').save(p, 'JPEG', quality=88, optimize=True); made[part + '_rough'] = p
        for k in ('albedo', 'normal', 'rough'):
            log('  %-18s %.0f KB' % (part + '_' + k, os.path.getsize(made[part + '_' + k]) / 1024))
    return made


# ----------------------------------------------------------------- stage two
def blender_main():
    import bpy
    cfg = json.load(open(os.path.join(WORK, 'cfg.json')))
    maps, dst = cfg['maps'], cfg['dst']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=cfg['mesh'])
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    for o in list(bpy.data.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    log('rig %d bones, %d meshes' % (len(arm.data.bones), len(meshes)))

    def mat_for(name, key, two):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        m.use_backface_culling = not two
        nt = m.node_tree
        bsdf = nt.nodes['Principled BSDF']
        bsdf.inputs['Metallic'].default_value = 0.0
        for slot, sock, cs in (('albedo', 'Base Color', 'sRGB'), ('rough', 'Roughness', 'Non-Color'), ('normal', None, 'Non-Color')):
            tex = nt.nodes.new('ShaderNodeTexImage')
            tex.image = bpy.data.images.load(maps[key + '_' + slot])
            tex.image.colorspace_settings.name = cs
            if slot == 'normal':
                nmn = nt.nodes.new('ShaderNodeNormalMap')
                nt.links.new(tex.outputs['Color'], nmn.inputs['Color'])
                nt.links.new(nmn.outputs['Normal'], bsdf.inputs['Normal'])
            else:
                nt.links.new(tex.outputs['Color'], bsdf.inputs[sock])
        return m
    body = mat_for('crusader_body', 'body', True)       # the surcoat's skirts are single sheets
    weap = mat_for('crusader_weapon', 'weapon', False)
    groups = {'body': [], 'weapon': []}
    for o in meshes:
        k = 'weapon' if o.name.startswith('weapon') else 'body'
        o.data.materials.clear(); o.data.materials.append(body if k == 'body' else weap)
        for p in o.data.polygons:
            p.material_index = 0
        groups[k].append(o)
    for k, objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        j = bpy.context.view_layer.objects.active
        j.name = 'crusader_' + k
        log('  %-16s %d tris' % (j.name, sum(len(p.vertices) - 2 for p in j.data.polygons)))

    def fcurves(a):
        try:
            return list(a.fcurves)
        except Exception:
            return [fc for l in a.layers for s in l.strips for cb in s.channelbags for fc in cb.fcurves]

    keep = set(bpy.data.objects)
    info = {'rate': {}, 'chain': [], 'frames': {}}
    arm.animation_data_create()
    for key, (fname, rate) in cfg['clips'].items():
        before = set(bpy.data.actions)
        bpy.ops.import_scene.fbx(filepath=os.path.join(cfg['anim'], 'crusadershield@%s.fbx' % fname))
        new = [a for a in bpy.data.actions if a not in before]
        armA = next((a for a in new if a.name.startswith('Crusader_tank_Reference')), None)
        take = max((a.frame_range[1] for a in new if a is not armA), default=None)
        for o in list(bpy.data.objects):
            if o not in keep:
                bpy.data.objects.remove(o, do_unlink=True)
        for a in new:
            if a is not armA:
                bpy.data.actions.remove(a)
        if not armA:
            log('  clip %-6s MISSING'); continue
        armA.name = key
        armA.use_fake_user = True
        f0 = int(round(armA.frame_range[0]))
        f1 = int(round(min(take or armA.frame_range[1], armA.frame_range[1])))
        armA.use_frame_range = True
        armA.frame_start, armA.frame_end = f0, f1
        names = set()
        for fc in fcurves(armA):
            if '"' in fc.data_path:
                names.add(fc.data_path.split('"')[1])
        chained = any(n.startswith('chain') or n.startswith('ball_on') for n in names)
        if chained:
            info['chain'].append(key)
        info['rate'][key] = rate
        info['frames'][key] = [f0, f1]
        tr = arm.animation_data.nla_tracks.new(); tr.name = key
        st = tr.strips.new(key, f0, armA)
        try:
            st.action_slot = armA.slots[0]
        except Exception:
            pass
        log('  clip %-6s %-12s frames %d..%d at %.0fx  -> %.2f s%s' % (key, fname, f0, f1, rate, (f1 - f0) / 24 / rate, '  (chain keyed)' if chained else ''))
    arm['bw_crusader'] = json.dumps(info)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_animations=True,
                              export_animation_mode='ACTIONS', export_force_sampling=True,
                              export_extras=True, export_image_format='JPEG', export_jpeg_quality=90,
                              export_yup=True, export_apply=False, export_def_bones=False)
    log('%s: %.2f MB' % (os.path.basename(dst), os.path.getsize(dst) / 1e6))


if __name__ == '__main__':
    if 'bpy' in sys.modules or os.environ.get('CRUSADER_IN_BLENDER'):
        blender_main()
    else:
        os.makedirs(WORK, exist_ok=True)
        unrar()
        log('building maps')
        maps = build_maps()
        json.dump({'maps': maps, 'clips': CLIPS,
                   'mesh': os.path.join(WORK, 'Base+mesh', 'Base mesh', 'Base mesh fbx.fbx'),
                   'anim': os.path.join(WORK, 'animation', 'animation fbx'),
                   'dst': os.path.join(ROOT, 'assets/crusader.glb')},
                  open(os.path.join(WORK, 'cfg.json'), 'w'))
        log('running blender')
        env = dict(os.environ, CRUSADER_IN_BLENDER='1')
        r = subprocess.run([BLENDER, '-b', '-noaudio', '--python', os.path.abspath(__file__)],
                           env=env, capture_output=True, text=True)
        out = [l for l in r.stdout.split('\n') if l.startswith('[crusader]') or 'Error' in l or 'Traceback' in l]
        print('\n'.join(out[-60:]))
        if r.returncode:
            print(r.stderr[-3000:])
