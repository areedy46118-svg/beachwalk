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

# AND IT DOES TWO CREATURES NOW. The red alien's three moves and the
# knight's six come off the same Mixamo rig and go onto two different
# skeletons, and neither of them cares which — the quantity this writes is
# the rotation a bone has UNDERGONE, which knows nothing about either rig.
#   blender -b -P tools/ntar_moves.py -- knight
SET = 'knight' if 'knight' in sys.argv else 'ntar'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', SET + '-moves.json')
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
] if SET == 'ntar' else [
    ('Mutant Walking',          'walk',    'the walk — heavy, and his'),
    ('Left Strafe Walking',     'strafeL', 'sizing you up, to his left'),
    ('Right Strafe Walk',       'strafeR2','sizing you up, to his right'),
    ('Standing Melee Attack 360 High', 'k360', 'a full turn with the arm out high'),
    ('Head Hit',                'hit',     'the ordinary flinch'),
    ('Big Hit To Head',         'hitBig',  'the one that rocks him — the poise break'),
    ('Hit To Side Of Body',     'hitSide', 'rare: caught in the ribs'),
    ('Hit On Back Of Head',     'hitBack', 'rare: caught from behind'),
    ('Walking',                 'walkB',    'a second walk, so the gait is drawn'),
    ('Walk Strafe Right',       'strafeR', 'a stride sideways, feet crossing'),
    ('Medium Right Side Step',  'sideR',   'a short side step'),
    ('Mutant Punch',            'kPunch',  'a straight punch'),
    ('Mutant Swiping',          'kSwipe',  'a sweep across with the arm'),
    ('Mutant Jump Attack',      'kJump',   'off the ground and down on you'),
    ('Mutant Run',              'run',     'the run'),
    ('Block',                   'block',   'the guard'),
    ('Center Block',            'blockC',  'the guard, square on'),
    # and the parry has a reel of its own
    ('Zombie Reaction Hit',     'parry',   'the reel when his guard is broken by a parry'),
    # ---- THE LOCOMOTION PACK. Everything above is a move; this is how he
    # CARRIES himself between them, which is most of what a fight looks like.
    # He keeps every clip he already had — these are drawn against them, so
    # the same creature stands, strides and circles differently from one
    # exchange to the next instead of running one cycle for ever.
    ('idle',                    'idleB',   'a second way of standing',            'Locomotion Pack'),
    ('walking',                 'walkC',   'a third walk',                        'Locomotion Pack'),
    ('running',                 'runB',    'a second run',                        'Locomotion Pack'),
    ('left strafe walking',     'strafeL2','a second sideways stride, to his left',  'Locomotion Pack'),
    ('right strafe walking',    'strafeR3','a second sideways stride, to his right', 'Locomotion Pack'),
    ('left strafe',             'sideL',   'a short side step, left',             'Locomotion Pack'),
    ('right strafe',            'sideR2',  'a short side step, right',            'Locomotion Pack'),
    ('left turn 90',            'turnL',   'a quarter turn on the spot, left',    'Locomotion Pack'),
    ('right turn 90',           'turnR',   'a quarter turn on the spot, right',   'Locomotion Pack'),
    # ---- AND HE CAN BE PUT ON HIS BACK. Two clips, not one played backwards:
    # the alien's knockdown reverses its own fall because his file has no
    # get-up in it, and a reversed fall is a shape that reads right and a
    # motion that does not. These are a real fall and a real rise.
    ('Knocked Out',             'knockOut','enough heavies to the head and he goes over'),
    ('Getting Up',              'getUp',   'and back onto his feet'),
    ('Hit On Side Of Head',     'hitHead', 'rare: caught on the side of the head'),
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
WINDOW = ({'knock': (30, 78), 'nSweep': (0, None), 'dodge': (20, 82)} if SET == 'ntar'
          # THE RARE TWO ARE A PERFORMANCE, NOT A REACTION. Both run three and
          # a half seconds and travel FOUR METRES — they are a man reeling
          # away, finding his feet and walking back. What a fight wants is the
          # rock and the first of the recovery; the rest is him idling, and at
          # three seconds it is an interruption rather than a hit.
          # AND THE KNOCKDOWN IS THE FALL, NOT THE PERFORMANCE ROUND IT.
          # Read off the hips (the log prints the curve): `knockOut` stands
          # still for 28 frames, goes over between 28 and 56 (hips 0 ->
          # -0.79) and then lies there for twenty more — and the game holds
          # him on the floor itself, so those twenty are dead time in the one
          # beat that has to be short enough to fight through. `getUp` rises
          # over frames 6-36 and settles; `hitHead` is a man reeling SIX
          # METRES and finding his feet, of which a flinch wants the first
          # rock and nothing else.
          else {'hitSide': (0, 46), 'hitBack': (0, 50),
                'knockOut': (20, 58), 'getUp': (0, 40), 'hitHead': (0, 24)})
# He is knocked down FACING YOU, by the owner's word, so this one is de-yawed
# whatever it measures.
FORCE_FLAT_YAW = {'knock'} if SET == 'ntar' else {'kPunch', 'kSwipe', 'kJump', 'block', 'blockC', 'strafeR', 'sideR', 'k360', 'hit', 'hitBig', 'hitSide', 'hitBack',
      # the locomotion pack and the parry reel: the GAME turns him at you
      # every frame, so nothing here may turn his hips as well — a quarter
      # turn de-yawed is a pivot step, which is what it is wanted for
      'parry', 'idleB', 'walkC', 'runB', 'strafeL2', 'strafeR3', 'sideL', 'sideR2', 'turnL', 'turnR',
      'knockOut', 'getUp', 'hitHead'}


# A clip whose hips are measured from its LAST frame, not its first: it
# begins on the floor and ends standing, so the stance is at the END.
HIP_ZERO_END = {'getUp'}


def log(*a):
    print('[ntar-moves]', *a); sys.stdout.flush()


def r4(v):
    return round(v, 4)


def main():
    # ---- IT MERGES; IT DOES NOT REWRITE.
    #
    # The sources live in ~/Downloads, which is the owner's own folder and is
    # cleared whenever he likes — so a build that insists on every FBX being
    # present is a build that can only be run on the day the clips arrive.
    # (This file already knows the shape of that mistake: "a build that reads
    # a temp directory is not a build".) What is already in the JSON is a
    # successful build of a clip whose source has since gone; a source that IS
    # here is rebuilt over it, and a source that is not is left exactly as it
    # was. Adding a clip is then a one-file drop and a re-run.
    out = {'fps': FPS, 'clips': {}}
    if os.path.exists(OUT):
        try:
            with open(OUT) as fh:
                prev = json.load(fh)
            out['clips'] = prev.get('clips', {})
            log('merging into', len(out['clips']), 'clips already built')
        except Exception as e:
            log('could not read the existing', OUT, '-', e)
    missing, built = [], []
    for entry in CLIPS:
        fname, name, what = entry[0], entry[1], entry[2]
        # a clip may name a subfolder of ~/Downloads it was delivered in
        sub = entry[3] if len(entry) > 3 else ''
        path = os.path.join(SRC, sub, fname + '.fbx')
        if not os.path.exists(path):
            if name in out['clips']:
                log('KEEPING', name, '- its source is gone from', os.path.dirname(path) or SRC)
            else:
                log('MISSING', name, '-', path)
                missing.append(name)
            continue
        built.append(name)
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

        # ---- AND A CLIP THAT STARTS ON THE FLOOR IS MEASURED FROM ITS END.
        #
        # `hipY` is an OFFSET from the creature's own stance, taken from the
        # clip's FIRST frame — which is right for every clip that begins with
        # him standing up, and exactly wrong for the get-up, which begins with
        # him lying on his back. Measured in the game: `getUp` ran its hips
        # from the standing height to A METRE ABOVE IT and then snapped back
        # the frame the clip ended. That is the owner's "he just flies
        # around". Zeroing it at the LAST frame instead puts the start of the
        # rise on the floor (-0.85) and its end at the stance, which is where
        # the fall left him (-0.86) and where he has to finish.
        if name in HIP_ZERO_END and hipY:
            off = hipY[-1]
            hipY = [r4(v - off) for v in hipY]
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

    if missing:
        sys.exit('no source and nothing already built for: ' + ', '.join(missing))
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    log('built', len(built), 'of', len(CLIPS), '-', ', '.join(built))
    log('wrote %s: %d clips, %.1f KB' % (os.path.relpath(OUT), len(out['clips']), os.path.getsize(OUT) / 1024))


main()
