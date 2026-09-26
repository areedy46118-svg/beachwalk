#!/usr/bin/env python3
"""Pack the owner's Medieval Chest into the sea chest in the wreck.

    python3 tools/chest_pack.py assets/chest.glb

The delivered file is a .blend and a 91 MB folder of 4K maps, and the useful
thing about it is that the artist MODELLED IT IN THREE PIECES — `Bottom`,
`Top` and `Padlock` — so the lid is already its own mesh and can be hung on a
hinge rather than carved out of a solid. What comes out is one small .glb with
a named node per piece and the hinge MEASURED and written into the root's
extras, so the game never carries a number this file could get wrong.

Rules this repo has already paid for, and which apply here:

  * METALNESS IS A TRAP — the tenth time. There is no environment map in this
    game and a metal has no diffuse term, so the metalness map is dropped and
    the factor zeroed; the iron bands read off their own albedo instead.
  * THE AMBIENT OCCLUSION GOES INTO THE ALBEDO. Nothing in this renderer
    consumes an AO map, and the chest stands below decks where the only light
    is each material's own emissive lift — so the occlusion has to be baked in
    or the strapwork has no depth at all.
  * AND THE MAPS COME DOWN AT SOURCE. Colour to --tex, the normal and the
    roughness to half, because relief and gloss are low-frequency and this
    game renders at 0.42 of the screen. 91 MB of PNG becomes about 1 MB of
    JPEG, which is what a prop you stand over is worth.
  * THE RESIZE IS DONE ON DISK. Blender's image datablocks here are UNPACKED
    and point at a folder that is not beside the .blend, and the exporter
    reads `filepath` rather than whatever buffer was last scaled — the same
    trap `sol_pack.py` paid for. So every map is written out small and the
    datablock is repointed at the small file.

It is run through Blender because a .blend is: this script re-launches itself
inside it, the way `undercroft_pack.py` and `head_pack.py` do.
"""
import os
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.expanduser('~/Desktop/FURNITURE')
BLEND = os.path.join(SRC, 'Medieval_Chest.blend')
WORK = os.path.join(HERE, '.chest')
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'

# how wide the chest stands in the game, in metres, across its own lid
WIDTH = 0.92


def stage_textures():
    """Unzip the delivered maps beside this script, once."""
    tex = os.path.join(WORK, 'Textures')
    if not os.path.isdir(tex):
        os.makedirs(WORK, exist_ok=True)
        with zipfile.ZipFile(os.path.join(SRC, 'Textures.zip')) as z:
            z.extractall(WORK)
    return tex


def prep_maps(tex, out, colour=1024, relief=1024, rough=512):
    """Resize on disk, and multiply the occlusion into the albedo."""
    from PIL import Image, ImageChops
    os.makedirs(out, exist_ok=True)
    made = {}

    base = Image.open(os.path.join(tex, 'medieval_chest_basecolor.png')).convert('RGB')
    ao = Image.open(os.path.join(tex, 'medieval_chest_ao.png')).convert('L')
    base = base.resize((colour, colour), Image.LANCZOS)
    ao = ao.resize((colour, colour), Image.LANCZOS)
    # AO is a multiply; nothing downstream reads the map itself
    base = ImageChops.multiply(base, Image.merge('RGB', (ao, ao, ao)))
    p = os.path.join(out, 'chest_basecolor.jpg')
    base.save(p, quality=92)
    made['basecolor'] = p

    n = Image.open(os.path.join(tex, 'medieval_chest_normal.png')).convert('RGB')
    n = n.resize((relief, relief), Image.LANCZOS)
    p = os.path.join(out, 'chest_normal.jpg')
    n.save(p, quality=92)
    made['normal'] = p

    r = Image.open(os.path.join(tex, 'medieval_chest_roughness.png')).convert('L')
    r = r.resize((rough, rough), Image.LANCZOS)
    p = os.path.join(out, 'chest_roughness.jpg')
    r.save(p, quality=90)
    made['roughness'] = p
    return made


def inside(dst, maps):
    import bpy
    from mathutils import Vector

    # ---- the maps: repoint at the small copies, drop the metalness --------
    for img in list(bpy.data.images):
        low = img.name.lower()
        for key, path in maps.items():
            if key in low:
                img.filepath = path
                img.source = 'FILE'
                img.reload()
                break
    for mat in bpy.data.materials:
        if not mat.node_tree:
            continue
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue
        # METALNESS IS A TRAP: unwire it and zero the factor
        if 'Metallic' in bsdf.inputs:
            for link in list(nt.links):
                if link.to_socket == bsdf.inputs['Metallic']:
                    nt.links.remove(link)
            bsdf.inputs['Metallic'].default_value = 0.0
        # and the AO node, whose job has moved into the albedo
        for n in list(nt.nodes):
            if n.type == 'TEX_IMAGE' and n.image and 'ao' in n.image.name.lower():
                nt.nodes.remove(n)

    # ---- measure, then scale so the lid is WIDTH across ------------------
    objs = {o.name: o for o in bpy.data.objects if o.type == 'MESH'}
    body, lid, lock = objs.get('Bottom'), objs.get('Top'), objs.get('Padlock')
    if not body or not lid:
        raise SystemExit('the chest is not the three pieces this expects')

    def bounds(o):
        vs = [o.matrix_world @ v.co for v in o.data.vertices]
        lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
        hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
        return lo, hi

    blo, bhi = bounds(body)
    llo, lhi = bounds(lid)
    lo = Vector((min(blo.x, llo.x), min(blo.y, llo.y), min(blo.z, llo.z)))
    hi = Vector((max(bhi.x, lhi.x), max(bhi.y, lhi.y), max(bhi.z, lhi.z)))
    s = WIDTH / (hi.x - lo.x)

    # centred on itself in plan, feet on the floor — the tripod camera's rule
    cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
    for o in (body, lid, lock):
        if not o:
            continue
        o.name = {'Bottom': 'chest_body', 'Top': 'chest_lid', 'Padlock': 'chest_lock'}[o.name]
        o.matrix_world = o.matrix_world.copy()
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            w = Vector(((w.x - cx) * s, (w.y - cy) * s, (w.z - lo.z) * s))
            v.co = o.matrix_world.inverted() @ w
        o.data.update()

    # ---- the hinge, MEASURED --------------------------------------------
    # In the exported +Y-up frame Blender's +Y becomes -Z, so the padlock
    # (at blender -y) ends up facing +Z: the chest's front is +Z, the hinge
    # is the back-top corner of the body, and the game hangs the lid on it.
    blo, bhi = bounds(body)
    llo, lhi = bounds(lid)
    hinge_y = bhi.z                      # the body's own rim
    hinge_z = -bhi.y                     # blender +y (the back) is gltf -z
    extras = {
        'bw_chest': {
            'hinge': [round(hinge_y, 4), round(hinge_z, 4)],
            'size': [round(bhi.x - blo.x, 4), round(lhi.z - blo.z, 4), round(bhi.y - blo.y, 4)],
            'body': round(bhi.z - blo.z, 4),
            'lock': round(-((llo.y + lhi.y) / 2), 4),
        }
    }

    bpy.ops.object.select_all(action='DESELECT')
    for o in (body, lid, lock):
        if o:
            o.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(
        filepath=dst, export_format='GLB', use_selection=True,
        export_apply=True, export_yup=True, export_image_format='JPEG',
        export_extras=True, export_cameras=False, export_lights=False,
        export_animations=False)

    # write the measurements onto the root node's extras, in the file itself
    patch_extras(dst, extras)
    print('chest:', extras)


def patch_extras(dst, extras):
    """glTF `extras` on the scene's first root node — GLTFLoader hands them
    straight to `userData`, which is how every measured thing in this repo
    (`bw_walk`, `bw_nav`) crosses from a packer into the game."""
    import json
    import struct
    with open(dst, 'rb') as f:
        data = f.read()
    magic, ver, total = struct.unpack('<III', data[:12])
    off, chunks = 12, []
    while off < total:
        clen, ctype = struct.unpack('<II', data[off:off + 8])
        chunks.append((ctype, data[off + 8:off + 8 + clen]))
        off += 8 + clen
    js = json.loads(chunks[0][1].decode('utf-8'))
    root = js['scenes'][js.get('scene', 0)]['nodes'][0]
    node = js['nodes'][root]
    node.setdefault('extras', {}).update(extras)
    raw = json.dumps(js, separators=(',', ':')).encode('utf-8')
    raw += b' ' * ((4 - len(raw) % 4) % 4)
    out = [struct.pack('<II', len(raw), 0x4E4F534A) + raw]
    for ctype, body in chunks[1:]:
        pad = b'\0' * ((4 - len(body) % 4) % 4)
        out.append(struct.pack('<II', len(body) + len(pad), ctype) + body + pad)
    blob = b''.join(out)
    with open(dst, 'wb') as f:
        f.write(struct.pack('<III', magic, ver, 12 + len(blob)) + blob)


if __name__ == '__main__':
    if 'bpy' in sys.modules or os.environ.get('CHEST_IN_BLENDER'):
        import json
        inside(os.environ['CHEST_DST'], json.loads(os.environ['CHEST_MAPS']))
    else:
        dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets/chest.glb')
        dst = os.path.abspath(dst)
        tex = stage_textures()
        maps = prep_maps(tex, os.path.join(WORK, 'small'))
        env = dict(os.environ, CHEST_IN_BLENDER='1', CHEST_DST=dst,
                   CHEST_MAPS=__import__('json').dumps(maps))
        subprocess.check_call([BLENDER, '-b', BLEND, '--python', os.path.abspath(__file__)], env=env)
        print('wrote', dst, os.path.getsize(dst) // 1024, 'KB')
