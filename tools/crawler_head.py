"""THE HEAD IN THE DRAIN — the catacombs monster's head, on its own, for the peek.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/crawler_head.py

Writes assets/crawler-head.glb: his head and nothing else, baked out of the
shipped `crawler.glb` as a static mesh with its own maps, so the outfall pipe
can hang the REAL model down it rather than a picture of one.

WHY NOT THE WHOLE CREATURE. `crawler.glb` is 4.2 MB at the very back of
`ASSET_REACH` because it belongs to a room most of a kilometre down the walk,
and the drain is thirty-four metres BEHIND the spawn — fetching it, parsing
it, building a rig and dressing a creature for a few seconds of a thing you
are meant to barely see would be the most expensive object in the first
minute of the game. What the peek needs is a head, and a head is a few
thousand triangles and one material.

WHAT COUNTS AS THE HEAD IS THE RIG'S OWN ANSWER. `DEF-spine.006` and its
hundred and two descendants — every brow, lid, lip, nose, ear, temple and the
jaw — are the head's bones, so a vertex belongs to the head when more than
half its weight is on that set. Nothing is boxed, sliced or guessed; move the
model and it still comes out at the neck.

AND THE EYES AND THE TEETH ARE THEIR OWN MESHES, which is the trap the still
walked into first: six meshes name the head's bone group and the eye mesh has
not one vertex weighted above a half to it. They are kept whole.
"""
import bpy, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', 'assets', 'crawler.glb'))
OUT = os.path.normpath(os.path.join(HERE, '..', 'assets', 'crawler-head.glb'))
TEX = {'base': 512, 'normal': 512, 'rough': 256}

def log(*a):
    print('[head]', *a); sys.stdout.flush()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
if arm is None:
    raise SystemExit('no armature in ' + SRC)

head_bone = None
for n in ('DEF-spine.006', 'DEF-spine006'):
    if n in arm.data.bones:
        head_bone = arm.data.bones[n]
        break
if head_bone is None:
    raise SystemExit('no head bone')
HEAD = {head_bone.name} | {b.name for b in head_bone.children_recursive}
log('head bones:', len(HEAD))

# AND THE MOUTH COMES SHUT. This rig BINDS with the jaw wide open — which is
# right for a creature that roars at you and is the opposite of what a face
# looking up a drain wants: open, it reads as a scream, and the brief is
# subtle. The jaw is closed most of the way and left barely parted.
#
# WHICH WAY IT CLOSES IS MEASURED, not read off the rig's axis convention:
# the jaw's tail hangs DOWN when the mouth is open, so the sign that closes it
# is the one that RAISES it. Same rule this file uses for a curl sign.
# AND THE MOUTH IS NOT OPEN — THE LIPS ARE DRAWN BACK. Three builds tried to
# close it: two posed `DEF-jaw_master` and both swung the chin BACKWARD
# rather than up (measured, the head got five centimetres deeper and two
# shorter), and the third turned the jaw's own vertices about world X and
# found there was nothing to turn — the lower teeth's biting edge sits at
# 1.617 against an upper-teeth floor of 1.612. The jaw is SHUT in the bind.
# What reads as a gaping mouth is the sculpt: he is snarling, with his lips
# pulled off his teeth, and that is his face rather than a pose. Left alone.
#
# (The measurement that settled it is worth keeping: the thing that has to
# meet the upper teeth is the LOWER TEETH, not the highest point of the whole
# jaw — which is its hinge, up by the ears, and already well above them.)

# the trousers and the exporter's material-less helper are not a head
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    if o.name.lower().startswith(('icosphere', 'pants')):
        log('dropping', o.name)
        bpy.data.objects.remove(o, do_unlink=True)

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
keep = []
for o in meshes:
    gi = {g.index for g in o.vertex_groups if g.name in HEAD}
    if not gi:
        continue
    n = 0
    for v in o.data.vertices:
        w = sum(g.weight for g in v.groups if g.group in gi)
        t = sum(g.weight for g in v.groups) or 1.0
        if w / t > 0.5:
            n += 1
    frac = n / max(1, len(o.data.vertices))
    log('%s: %d of %d on the head (%.0f%%)' % (o.name, n, len(o.data.vertices), frac * 100))
    if frac > 0.9:
        keep.append(o)                       # an eye, a jawful of teeth: all head
    elif n:
        keep.append((o, gi))                 # the body: cut it at the neck

parts = []
for k in keep:
    if not isinstance(k, tuple):
        parts.append(k)
        continue
    o, gi = k
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for v in o.data.vertices:
        w = sum(g.weight for g in v.groups if g.group in gi)
        t = sum(g.weight for g in v.groups) or 1.0
        v.select = (w / t) > 0.5
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    cut = [x for x in bpy.context.selected_objects if x is not o]
    if not cut:
        raise SystemExit('the cut at the neck separated nothing')
    parts.append(cut[0])
    bpy.data.objects.remove(o, do_unlink=True)

log('parts:', ', '.join(p.name for p in parts))
bpy.ops.object.select_all(action='DESELECT')
for p in parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
if len(parts) > 1:
    bpy.ops.object.join()
head = bpy.context.view_layer.objects.active
head.name = 'crawlerHead'

# off the rig: the bind pose is the pose, so nothing has to be baked
for m in list(head.modifiers):
    head.modifiers.remove(m)
bpy.ops.object.select_all(action='DESELECT')
head.select_set(True)
bpy.context.view_layer.objects.active = head
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
for o in [o for o in bpy.data.objects if o.type != 'MESH']:
    bpy.data.objects.remove(o, do_unlink=True)

# AND ITS ORIGIN IS THE MIDDLE OF IT, so the game places a head by putting a
# point somewhere rather than by working out where a model's feet used to be
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
head.location = (0, 0, 0)
bpy.context.view_layer.update()
lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
for c in head.bound_box:
    w = head.matrix_world @ Vector(c)
    lo = Vector([min(lo[i], w[i]) for i in range(3)])
    hi = Vector([max(hi[i], w[i]) for i in range(3)])
log('head %d verts, %.3f wide by %.3f deep by %.3f tall'
    % (len(head.data.vertices), hi.x - lo.x, hi.y - lo.y, hi.z - lo.z))

# AND IT IS DECIMATED, because a head drawn at sixty pixels down a pipe does
# not want twelve thousand vertices — seven thousand of which are the two
# jawfuls of teeth behind the open mouth.
dec = head.modifiers.new('dec', 'DECIMATE')
dec.ratio = 0.30
bpy.ops.object.modifier_apply(modifier=dec.name)
log('decimated to %d verts' % len(head.data.vertices))

# the maps come down: at the size this is ever drawn, 1024 is four times what
# anybody can see, and this file is fetched in the first minute of the game
for im in bpy.data.images:
    for k, px in TEX.items():
        if k in im.name.lower() and im.size[0] > px:
            log('resize %s %d -> %d' % (im.name, im.size[0], px))
            im.scale(px, px)

# AND THE MAPS SHIP AS JPEG. The albedo carries an alpha channel it does not
# use on a head — the packer put the source's opacity there for the body — so
# a 32-bit PNG is being paid for nothing: measured, PNG 1.67 MB against JPEG
# 0.35 for the same three maps at the same sizes.
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB',
                          export_apply=True, export_animations=False,
                          export_skins=False, export_morph=False,
                          export_image_format='JPEG', export_jpeg_quality=88,
                          export_yup=True)
log('wrote', OUT, os.path.getsize(OUT), 'bytes')
