#!/usr/bin/env python3
"""Three Mixamo clips, retargeted onto the red alien — as DATA, not as a rig.

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/ntar_moves.py

The red alien (`assets/ntar.glb`) is a Character Creator rig whose file
carries one demo clip, so every clip he has is authored in code
(`authorNtarClips`). These three are motion capture on a MIXAMO skeleton —
a different bone naming, a different rest pose, a different bone-axis
convention — and the only honest way to put one on the other is to
retarget. What makes that safe is choosing a quantity that does not care
about either rig's conventions:

    D = (bone's world rotation this frame) * (bone's world rotation at rest)^-1

D is the rotation the bone has UNDERGONE, in world space. It knows nothing
about which way Blender lays a bone's local Y, nothing about Mixamo's
A-pose or the alien's T-pose, and nothing about either file's axis
convention — so it can be applied to the alien's own rest pose in the game
(`W = D * Rc`, then down the hierarchy into local space) and comes out as
the same motion on a different body. THIS FILE ONLY DUMPS THE MIXAMO SIDE:
the rest rotations and the per-frame rotations, already turned into three's
Y-up frame and yawed so the character faces +Z, which is the alien's front.
`authorNtarClips` does the rest, against the alien's stance as it is
actually loaded — which is the one pose that cannot be got wrong here.

What else it does, and why:

  * THE WINDOW. Every one of these is 250 frames and none of them moves for
    more than about a hundred: Mixamo pads a clip out with its final pose
    held. That is the beast's `Die_1` all over again ("a clip that was
    authored to be watched is not an attack"), so the tail is measured and
    cut — the last frame at which anything actually moves, plus a beat.
  * THE ROOT TURN. `kind.flatten` is this file's rule for root motion and
    it applies to the yaw as much as to the travel: the game turns a
    creature toward the player every frame, so a clip that also turns the
    hips fights it. The yaw is measured; a clip that ends where it started
    keeps its spin (a capoeira turn IS the move), and one that does not is
    de-yawed frame by frame.
  * THE TRAVEL. The horizontal root motion is measured and reported so the
    game can slide him by it, and is NOT baked into the hips — the same
    reason the Dealer's clips are flattened. The VERTICAL is kept: it is
    what puts him in the air and lays him on the ground.
  * THE CONTACT. For the kick, the frame the striking foot is moving
    fastest — a sweep has no extreme of position, which is the lesson
    `tools/monster_anim.py` learned on the reptilian's rake.
  * THE REST POSE ITSELF, as positions. D is measured from Mixamo's rest and
    Mixamo rests in an A-POSE; the alien binds in a T. Apply one to the other
    and every limb sits forty-five degrees off for the whole clip. So the
    rest HEAD of each bone goes out too, and the game aligns the two rests
    bone by bone before it applies a single frame — the smallest rotation
    that takes where the alien's bone points to where Mixamo's points, which
    is the ragdoll's own rule for driving a skeleton from somewhere else.
"""
import bpy, json, math, os, sys
from mathutils import Vector, Quaternion, Matrix

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'ntar-moves.json')
SRC = os.path.expanduser('~/Downloads')
FPS = 30

# What to take off the Mixamo rig: the joints the alien's own ragdoll map
# names, and nothing else. His fingers are not animated by any clip he has
# and twenty-two finger tracks would be most of the file.
KEEP = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
        'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
        'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
        'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
        'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']

CLIPS = [
    # file,                     name,      what it is
    ('Surprise Uppercut',       'knock',   'knocked onto his back'),
    ('Meia Lua De Compasso',    'nSweep',  'the compass kick'),
    ('Macaco Side',             'dodge',   'the side handspring'),
]
# THE BEATS, measured off the hips (see the log's own curve). A Mixamo clip
# is a performance with an approach and a recovery either side of the thing
# you want, and the game needs the thing:
#   knock  f0-30 is him ambling INTO the punch, which he does not do in a
#          fight — he is already on you. It starts on the hit (f30), he is
#          lifted to 1.83 m by f44, lands flat at f60 and has settled by f78.
#   nSweep is all kick; it keeps its whole length.
#   dodge  he leans for twenty frames before he commits, is inverted over
#          his hands f48-60 (measured in the game: the spine's up reaches
#          -0.99), and is back on his feet and upright by f80. What follows
#          is a step out and back that reads as idling.
WINDOW = {'knock': (30, 78), 'nSweep': (0, None), 'dodge': (20, 82)}
# He is knocked down FACING YOU, by the owner's word, so this one is de-yawed
# whatever it measures.
FORCE_FLAT_YAW = {'knock'}


def log(*a):
    print('[ntar-moves]', *a); sys.stdout.flush()


def r4(v):
    return round(v, 4)


def main():
    out = {'fps': FPS, 'clips': {}}
    for fname, name, what in CLIPS:
        path = os.path.join(SRC, fname + '.fbx')
        if not os.path.exists(path):
            sys.exit('missing ' + path)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=path)
        arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
        sc = bpy.context.scene
        f0, f1 = int(sc.frame_start), int(sc.frame_end)
        bones = [b for b in KEEP if b in arm.pose.bones or ('mixamorig:' + b) in arm.pose.bones]
        pref = 'mixamorig:' if ('mixamorig:Hips' in arm.pose.bones) else ''
        MW = arm.matrix_world

        # ---- every frame, once: each kept bone's world rotation, and the hips' world position
        raw, hips = [], []
        for f in range(f0, f1 + 1):
            sc.frame_set(f)
            fr = {}
            for b in bones:
                pb = arm.pose.bones[pref + b]
                fr[b] = (MW @ pb.matrix).to_quaternion()
            raw.append(fr)
            hips.append((MW @ arm.pose.bones[pref + 'Hips'].matrix).to_translation().copy())

        # ---- THE WINDOW. Mixamo holds the last pose for the rest of the take.
        # Movement is the summed angle every kept bone turns between frames,
        # plus the hips' travel; the clip ends where that stops for good.
        def motion(i):
            m = (hips[i] - hips[i - 1]).length * 4.0
            for b in bones:
                m += raw[i][b].rotation_difference(raw[i - 1][b]).angle
            return m
        moves = [0.0] + [motion(i) for i in range(1, len(raw))]
        peak = max(moves)
        last = 0
        for i, m in enumerate(moves):
            if m > peak * 0.02:
                last = i
        auto = min(len(raw) - 1, last + 4)         # a beat of stillness after it
        w0, w1 = WINDOW.get(name, (0, None))
        end = min(auto if w1 is None else w1, len(raw) - 1)
        log('%-22s %-7s frames %d..%d (moving to %d of %d, peak %.3f)'
            % (fname, name, w0, end, auto, len(raw) - 1, peak))
        if w0:
            raw = raw[w0:]; hips = hips[w0:]; end -= w0

        # ---- THE FRAME. Blender is Z-up; three is Y-up. And the character has
        # to end up facing +Z, which is the front of every creature in the
        # game. Measure the forward on the FEET at the first frame — the toes
        # point where a standing body faces — rather than deriving it.
        sc.frame_set(f0)
        fwd = Vector((0, 0, 0))
        for side in ('Left', 'Right'):
            foot = (MW @ arm.pose.bones[pref + side + 'Foot'].matrix).to_translation()
            toe = (MW @ arm.pose.bones[pref + side + 'ToeBase'].matrix).to_translation()
            d = toe - foot; d.z = 0
            if d.length > 1e-4:
                fwd += d.normalized()
        fwd.normalize()
        # Blender Z-up -> three Y-up, then a yaw that puts the measured
        # forward on +Z. Applied to every world rotation and position, so the
        # delta below conjugates with it and nothing has to be reasoned about.
        ZUP = Quaternion((1, 0, 0), -math.pi / 2)
        f3 = ZUP @ fwd                               # the forward, in three's frame
        yaw = math.atan2(f3.x, f3.z)                 # what to turn away to reach +Z
        CONV = Quaternion((0, 1, 0), -yaw) @ ZUP
        log('   forward (blender) %s -> yaw %+.1f deg to +Z' % (tuple(r4(v) for v in fwd), math.degrees(yaw)))

        # ---- the root's own turn over the window
        def hipyaw(i):
            q = CONV @ raw[i]['Hips']
            v = q @ Vector((0, 0, 1))                # the hips' own +Z, in three's frame
            return math.atan2(v.x, v.z)
        y0 = hipyaw(0)
        drift = math.degrees((hipyaw(end) - y0 + math.pi) % (2 * math.pi) - math.pi)
        swing = max(abs(math.degrees((hipyaw(i) - y0 + math.pi) % (2 * math.pi) - math.pi)) for i in range(end + 1))
        flat = name in FORCE_FLAT_YAW or abs(drift) > 40
        log('   root yaw: swings to %.0f deg, ends %+.0f deg  -> %s' % (swing, drift, 'DE-YAWED' if flat else 'kept'))

        # ---- rest, and every frame, in three's frame
        rest, restPos = {}, {}
        for b in bones:
            rb = arm.data.bones[pref + b]
            rest[b] = CONV @ (MW @ rb.matrix_local).to_quaternion()
            restPos[b] = CONV @ (MW @ rb.matrix_local).to_translation()

        tracks = {b: [] for b in bones}
        hipY, travel = [], []
        h0 = CONV @ hips[0]
        for i in range(end + 1):
            # de-yaw about the hips' start, if this clip turns and should not
            undo = Quaternion((0, 1, 0), -(hipyaw(i) - y0)) if flat else Quaternion()
            for b in bones:
                q = undo @ (CONV @ raw[i][b])
                # the DELTA: what this bone has done since its rest pose
                d = q @ rest[b].inverted()
                d.normalize()
                if d.w < 0:                          # the short way round, for the lerp at the far end
                    d = Quaternion((-d.w, -d.x, -d.y, -d.z))
                tracks[b].extend([r4(d.x), r4(d.y), r4(d.z), r4(d.w)])
            hp = undo @ (CONV @ hips[i] - h0)
            hipY.append(r4(hp.y))
            travel.append([r4(hp.x), r4(hp.z)])

        dur = (end) / FPS
        land = r4(hipY.index(min(hipY)) / max(1, end))
        # ---- where the striking foot is fastest (a sweep has no extreme of position)
        contact = None
        if name == 'nSweep':
            best, bi = 0, 0
            toes = []
            for i in range(end + 1):
                sc.frame_set(f0 + w0 + i)
                toes.append(CONV @ (MW @ arm.pose.bones[pref + 'RightToeBase'].matrix).to_translation())
            for i in range(1, end + 1):
                s = (toes[i] - toes[i - 1]).length
                if s > best: best, bi = s, i
            contact = r4(bi / max(1, end))
            log('   contact: right toe fastest at frame %d of %d -> hit %.3f' % (bi, end, contact))

        log('   %-7s %.2f s, %d frames, %d bones, travel %.2f m, hips y %.2f..%.2f, lowest at %.2f'
            % (name, dur, end + 1, len(bones), math.hypot(travel[-1][0], travel[-1][1]),
               min(hipY), max(hipY), land))
        out['clips'][name] = {
            'src': fname, 'what': what, 'dur': r4(dur), 'n': end + 1,
            'rest': {b: [r4(rest[b].x), r4(rest[b].y), r4(rest[b].z), r4(rest[b].w)] for b in bones},
            'restPos': {b: [r4(restPos[b].x), r4(restPos[b].y), r4(restPos[b].z)] for b in bones},
            'd': tracks, 'hipY': hipY, 'travel': travel,
            'yaw': {'flat': flat, 'drift': r4(drift), 'swing': r4(swing)},
            'land': land,
        }
        if contact is not None:
            out['clips'][name]['hit'] = contact

    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    log('wrote %s: %.1f KB' % (os.path.relpath(OUT), os.path.getsize(OUT) / 1024))


main()
