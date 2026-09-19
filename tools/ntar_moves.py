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
SET = next((a for a in ('knight', 'wong', 'drunk', 'orc') if a in sys.argv), 'ntar')
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

# ---- AND TWO MORE SETS, FOR THE TAVERN. Wong the barman gets the Male
# Locomotion Pack whole — every clip in the folder, exactly as Mixamo drew it —
# and the drunk gets the Male Drunk Pack the same way; their fights are drawn
# from the moves the knight and the alien already carry (the deltas know
# nothing about whose skeleton they land on) plus what the game writes.
WONG_CLIPS = [
    ('idle',                  'idle',    'standing', 'Male Locomotion Pack'),
    ('walking',               'walk',    'the walk', 'Male Locomotion Pack'),
    ('standard run',          'run',     'the run', 'Male Locomotion Pack'),
    ('left strafe walking',   'strafeL', 'sideways, left', 'Male Locomotion Pack'),
    ('right strafe walking',  'strafeR', 'sideways, right', 'Male Locomotion Pack'),
    ('left strafe',           'sideL',   'a short side step, left', 'Male Locomotion Pack'),
    ('right strafe',          'sideR',   'a short side step, right', 'Male Locomotion Pack'),
    ('left turn 90',          'turnL',   'a quarter turn, left', 'Male Locomotion Pack'),
    ('right turn 90',         'turnR',   'a quarter turn, right', 'Male Locomotion Pack'),
    ('jump',                  'jump',    'over the bar', 'Male Locomotion Pack'),
    # ---- AND TWO OF THE OWNER'S OWN, dropped loose in ~/Downloads. A barman
    # who fights capoeira is a barman with an answer nobody in this game has:
    # the ginga rocks him sideways and takes him up onto his hands, which is
    # a dodge that LEAVES THE LINE rather than stepping back down it, and the
    # flying kick is the one blow of his that comes off the ground.
    ('Ginga Sideways To Au',  'ginga',   'the rocking step, sideways, up onto his hands', ''),
    ('Flying Kick',           'wFlyC',   'off the ground, both feet', ''),
]
DRUNK_CLIPS = [
    ('drunk idle',                'idle',     'swaying', 'Male Drunk Pack'),
    ('drunk idle variation',      'idleB',    'swaying, the other way', 'Male Drunk Pack'),
    ('drunk idle variation (2)',  'idleC',    'and nearly going over', 'Male Drunk Pack'),
    ('drunk walk',                'walk',     'the stagger', 'Male Drunk Pack'),
    ('drunk walk backwards',      'back',     'the stagger, backwards', 'Male Drunk Pack'),
    ('drunk run forward',         'run',      'the lurching run', 'Male Drunk Pack'),
    ('drunk run backward',        'runBack',  'and backwards', 'Male Drunk Pack'),
    ('drunk turn',                'turn',     'a turn on the spot', 'Male Drunk Pack'),
    ('drunk walking turn',        'walkTurn', 'a turn in the walk', 'Male Drunk Pack'),
    ('backward walking turn',     'backTurn', 'a turn walking backwards', 'Male Drunk Pack'),
    ('drunk running left turn',   'runTurnL', 'a turn in the run', 'Male Drunk Pack'),
    ('run backward arc right',    'runArcR',  'the run, backwards and round', 'Male Drunk Pack'),
]
# ---- AND THE ORC AT THE BAR CARRIES THE GREAT SWORD PACK WHOLE. Oscar
# Creativo's orc arrives with a two-handed sword weighted to a bone under his
# own right hand and not one clip to swing it with, so every move he has is
# this pack — and the owner's word is that they should look EXACTLY as they do
# on Mixamo, which is what this file's delta already guarantees and what the
# windows below have to be careful not to spoil. A great-sword clip is not one
# of the 250-frame performances the other packs ship: they are tight already,
# so almost nothing is cut.
ORC_CLIPS = [
    ('great sword idle',              'idle',    'standing, the sword down',        'Great Sword Pack'),
    ('great sword idle (2)',          'idleB',   'a second way of standing',        'Great Sword Pack'),
    ('great sword walk',              'walk',    'the walk',                        'Great Sword Pack'),
    ('great sword walk (2)',          'walkB',   'a second walk',                   'Great Sword Pack'),
    ('great sword run',               'run',     'the run',                         'Great Sword Pack'),
    ('great sword run (2)',           'runB',    'a second run',                    'Great Sword Pack'),
    ('great sword strafe',            'strafeL', 'sideways, left',                  'Great Sword Pack'),
    ('great sword strafe (2)',        'strafeR', 'sideways, right',                 'Great Sword Pack'),
    ('great sword strafe (3)',        'sideL',   'a short side step, left',         'Great Sword Pack'),
    ('great sword strafe (4)',        'sideR',   'a short side step, right',        'Great Sword Pack'),
    ('great sword turn',              'turnL',   'a turn on the spot, left',        'Great Sword Pack'),
    ('great sword turn (2)',          'turnR',   'a turn on the spot, right',       'Great Sword Pack'),
    ('great sword crouching',         'brace',   'down behind the blade',           'Great Sword Pack'),
    # the swings
    ('great sword slash',             'oCut',    'a two-handed cut',                'Great Sword Pack'),
    ('great sword slash (2)',         'oCutB',   'the cut back the other way',      'Great Sword Pack'),
    ('great sword slash (3)',         'oCutC',   'a third cut',                     'Great Sword Pack'),
    ('great sword slash (4)',         'oCutD',   'a fourth',                        'Great Sword Pack'),
    ('great sword slash (5)',         'oCutE',   'and a fifth',                     'Great Sword Pack'),
    ('great sword attack',            'oChop',   'the overhead',                    'Great Sword Pack'),
    ('great sword high spin attack',  'oSpin',   'a full turn with the blade out',  'Great Sword Pack'),
    ('great sword jump attack',       'oLeap',   'off the ground and down on you',  'Great Sword Pack'),
    ('great sword slide attack',      'oSlide',  'in low, along the floor',         'Great Sword Pack'),
    ('great sword kick',              'oKick',   'the one blow that is a leg',      'Great Sword Pack'),
    # and what he does when he is not swinging
    ('great sword blocking',          'block',   'the guard',                       'Great Sword Pack'),
    ('great sword impact',            'hit',     'the ordinary flinch',             'Great Sword Pack'),
    ('great sword impact (2)',        'hitB',    'a second flinch',                 'Great Sword Pack'),
    ('great sword impact (3)',        'hitBig',  'the one that rocks him',          'Great Sword Pack'),
    ('two handed sword death',        'die',     'and down',                        'Great Sword Pack'),
    ('draw a great sword 1',          'draw',    'the sword comes off his back',    'Great Sword Pack'),
    ('great sword power up',          'roar',    'both hands up, and a shout',      'Great Sword Pack'),
]
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
if SET == 'wong': CLIPS = WONG_CLIPS
if SET == 'drunk': CLIPS = DRUNK_CLIPS
if SET == 'orc': CLIPS = ORC_CLIPS
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
      'hitHead'}

# ---- AND A CLIP WHOSE BODY LEAVES THE VERTICAL MAY NOT BE DE-YAWED AT ALL.
#
# There is no such thing as the heading of a body that is falling over, and
# every attempt to name one injects a spin. Measured on `knockOut`, as the
# azimuth the body's own long axis sweeps over the frames it is horizontal —
# which is the thing you actually watch, "which way his head is pointing":
#
#     the source animation    -11 deg      (he lands about where he fell)
#     de-yawed on the forward axis  +62     <- the owner's "spins in the air"
#     de-yawed on the left-right axis  -38  <- better measurement, same fault
#
# A per-frame de-yaw is a world-Y rotation, and a world-Y rotation applied to
# a HORIZONTAL body is a roll about its own length: it cannot help but turn a
# tipping body into a turning one. So the fall and the rise keep their own
# root turn exactly as the animator drew it, and the game puts him on the
# heading it wants ONCE, at the blow — which costs nothing, because a
# creature on the ground is not being turned toward the player anyway.
KEEP_YAW = {'knockOut', 'getUp'}
# the two tavern sets are all gaits and stands: the game turns them, so every
# clip is de-yawed, and nothing in either leaves the vertical
# ---- AND EVERY SWING HE HAS IS MEASURED. The other sets take their contact
# fractions from the table they were cut for; this one is a whole move set on
# a creature that has never had one, and the owner's word is that the blows
# should CONNECT. A great-sword cut has no extreme of position — the blade is
# already out in front in the stance — so the frame that matters is the one
# where the striking end is moving FASTEST, which is the reptilian rake's own
# rule. Which end that is, is per clip: two of these are kicks.
CONTACT = {'nSweep': 'RightToeBase'} if SET != 'orc' else {
    'oCut': 'RightHand', 'oCutB': 'RightHand', 'oCutC': 'RightHand',
    'oCutD': 'RightHand', 'oCutE': 'RightHand', 'oChop': 'RightHand',
    'oSpin': 'RightHand', 'oLeap': 'RightHand', 'oSlide': 'RightHand',
    'oKick': 'RightToeBase',
}
REST_FWD = SET == 'orc'
if SET == 'orc':
    # the game turns him at the player every frame, so nothing may turn his
    # hips as well — except the spin, where the turn IS the move, and the
    # death, where there is no such thing as the heading of a falling body
    KEEP_YAW = {'die', 'oSpin'}
    FORCE_FLAT_YAW = {c[1] for c in CLIPS} - KEEP_YAW
    # AND ONE OF THEM IS A PERFORMANCE. `great sword slash (2)` is 111 frames
    # and 3.16 m of travel: he walks in, cuts at frame 22, and walks out of
    # shot. The beast's `Die_1` again — a fight wants the cut.
    WINDOW = {'oCutB': (0, 52)}
if SET in ('wong', 'drunk'):
    # THE TWO LOOSE CLIPS ARE PERFORMANCES, the beast's `Die_1` again, and the
    # hips say where the move is (the log prints the curve). `Flying Kick`
    # leaves the ground at once, peaks at frame 12 and is down by 24; what
    # follows is him walking BACKWARDS out of shot (travel +2.11 -> -1.44).
    # `Ginga Sideways To Au` is four seconds of capoeira that walks three and
    # a half metres forward and back again before it does the one thing a
    # fight wants — the last second, which travels 0.88 m SIDEWAYS and is the
    # au itself. That is a dodge: it leaves the line rather than stepping
    # back down it.
    WINDOW = {'wFlyC': (0, 30), 'ginga': (84, 118)}
    # AND A BODY THAT LEAVES THE VERTICAL KEEPS ITS OWN TURN — `knockOut`'s
    # lesson: the au takes him onto his hands, and a world-Y de-yaw applied
    # to a horizontal body is a roll about its own length.
    KEEP_YAW = {'ginga'}
    FORCE_FLAT_YAW = {c[1] for c in CLIPS} - KEEP_YAW


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
            if REST_FWD:
                # AND A FACING IS A PROPERTY OF THE RIG, NOT OF THE CLIP.
                # Measured on frame 0 the toes are wherever that clip's first
                # pose puts them, and across one pack that ranged from -1 to
                # -103 degrees: a side step starts with the feet turned out, a
                # running start with them square to the direction of travel.
                # Applied as the clip's convention, each of those turns the
                # whole move by that much — a strafe that walks sideways while
                # facing fifty degrees off, which is exactly the thing the
                # owner said had gone wrong before. Every clip in a pack shares
                # one skeleton and one BIND pose, so the bind is where the
                # convention is read, once, and every clip comes out on the
                # same heading.
                foot = (MW @ arm.data.bones[pref + side + 'Foot'].matrix_local).to_translation()
                toe = (MW @ arm.data.bones[pref + side + 'ToeBase'].matrix_local).to_translation()
            else:
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
        #
        # A HEADING READ OFF A BONE'S FORWARD AXIS IS NOT A HEADING ONCE THE
        # BODY HAS LEFT THE VERTICAL, AND THAT IS THE WHOLE OF "HE JUST SPINS
        # AROUND IN THE AIR". The de-yaw held the hips' own +Z at a constant
        # azimuth every frame — which is a real de-yaw while he is standing,
        # and nonsense the moment he goes over, because a pelvis lying on its
        # back points its +Z at the CEILING. Measured on `knockOut`, that
        # vector's horizontal part collapses from 1.00 to 0.30, so most of
        # the -61 deg of "drift" it reported was the body TIPPING and not the
        # body turning — and the correction for a turn that never happened is
        # a world-Y rotation applied to a horizontal body, which is a corpse
        # swinging round like a compass needle.
        #
        # The axis to measure on is the one that stays horizontal, and which
        # that is depends on the clip: a fall forwards or backwards hinges
        # about the pelvis's LEFT-RIGHT axis, so that one survives (worst
        # horizontal 0.73 on `knockOut`, 0.87 on `getUp`) where the forward
        # axis does not. So it is chosen rather than assumed — the axis whose
        # worst horizontal projection over the window is largest, once per
        # clip, so it can never switch mid-clip and put a step in the turn.
        # On a standing clip X and Z are both exactly horizontal and give the
        # same answer, so nothing that already worked moves.
        AXES = (('left-right', Vector((1, 0, 0))),
                ('up the spine', Vector((0, 1, 0))),
                ('forward', Vector((0, 0, 1))))

        def hipax(i, ax):
            return (CONV @ raw[i]['Hips']) @ ax

        def worstH(ax):
            return min(math.hypot(v.x, v.z) for v in (hipax(i, ax) for i in range(end + 1)))
        axName, AX = max(AXES, key=lambda p: worstH(p[1]))
        log('   heading axis: the pelvis\'s %s (worst horizontal %.2f of 1.00)'
            % (axName, worstH(AX)))

        def hipyaw(i):
            # only DIFFERENCES of this are ever used, so which axis it is
            # measured on sets an offset that cancels
            v = hipax(i, AX)
            return math.atan2(v.x, v.z)
        y0 = hipyaw(0)
        drift = math.degrees((hipyaw(end) - y0 + math.pi) % (2 * math.pi) - math.pi)
        swing = max(abs(math.degrees((hipyaw(i) - y0 + math.pi) % (2 * math.pi) - math.pi)) for i in range(end + 1))
        flat = name not in KEEP_YAW and (name in FORCE_FLAT_YAW or abs(drift) > 40)
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
        cb = CONTACT.get(name)
        if cb and (pref + cb) in arm.pose.bones:
            best, bi = 0, 0
            tip = []
            for i in range(end + 1):
                sc.frame_set(f0 + w0 + i)
                tip.append(CONV @ (MW @ arm.pose.bones[pref + cb].matrix).to_translation())
            for i in range(1, end + 1):
                sp = (tip[i] - tip[i - 1]).length
                if sp > best: best, bi = sp, i
            contact = r4(bi / max(1, end))
            log('   contact: %s fastest at frame %d of %d (%.3f m/frame) -> hit %.3f'
                % (cb, bi, end, best, contact))

        # ---- AND WHERE HE IS LYING, SO THE RISE CAN BE JOINED TO THE FALL.
        # With neither clip de-yawed they are each in their own frame — the
        # fall ends lying one way and the rise begins lying another, and
        # played back to back that is a body snapping round on the floor. The
        # only thing that can be matched between two prone poses is the
        # direction the body itself lies in, so that is measured at both ends
        # of every clip: the azimuth of the body's own long axis (hips to
        # spine — which way his head points) and how horizontal it is, since
        # standing up the same number means nothing. The game turns the rise
        # by the difference and the two become one motion.
        def lieAz(i):
            undo = Quaternion((0, 1, 0), -(hipyaw(i) - y0)) if flat else Quaternion()
            v = (undo @ (CONV @ raw[i]['Hips'])) @ Vector((0, 1, 0))
            return r4(math.degrees(math.atan2(v.x, v.z))), r4(math.hypot(v.x, v.z))
        az0, azh0 = lieAz(0)
        az1, azh1 = lieAz(end)
        log('   lying: starts %+.0f deg (flat %.2f), ends %+.0f deg (flat %.2f)'
            % (az0, azh0, az1, azh1))
        log('   %-7s %.2f s, %d frames, %d bones, travel %.2f m, hips y %.2f..%.2f, lowest at %.2f'
            % (name, dur, end + 1, len(bones), math.hypot(travel[-1][0], travel[-1][1]),
               min(hipY), max(hipY), land))
        out['clips'][name] = {
            'src': fname, 'what': what, 'dur': r4(dur), 'n': end + 1,
            'rest': {b: [r4(rest[b].x), r4(rest[b].y), r4(rest[b].z), r4(rest[b].w)] for b in bones},
            'restPos': {b: [r4(restPos[b].x), r4(restPos[b].y), r4(restPos[b].z)] for b in bones},
            'd': tracks, 'hipY': hipY, 'travel': travel,
            'yaw': {'flat': flat, 'drift': r4(drift), 'swing': r4(swing)},
            'az': {'start': az0, 'startH': azh0, 'end': az1, 'endH': azh1},
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
