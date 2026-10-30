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
SET = next((a for a in ('knight', 'wong', 'drunk', 'orc', 'crawler', 'umbra', 'mutant', 'demon', 'crusader', 'paladin', 'skrim') if a in sys.argv), 'ntar')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', SET + '-moves.json')
SRC = os.path.expanduser('~/Downloads')
# (the owner keeps the packs on the Desktop now; a set may say so)
if SET == 'paladin': SRC = os.path.expanduser('~/Desktop/BEACHWALK ASSETS')
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
# ---- AND THE CATACOMBS MONSTER'S CRAWL. The owner's own "Running Crawl",
# dropped loose in ~/Downloads: a Mixamo clip of a body going flat out on
# all fours. Everything else the creature does is authored in the game on
# THIS clip's first frame, which is the crouched stance a crawler has and
# the bind pose (a standing zombie in an A) does not.
CRAWLER_CLIPS = [
    ('Running Crawl', 'crawl', 'flat out on all fours', ''),
    # AND THE OWNER'S "Mutant Run": eighteen frames of a hunched two-legged
    # lope, 1.95 m a cycle, hips 0.1-0.2 m under the rest hips and the head
    # a third of a metre under. He comes up off his hands for it sometimes.
    ('Mutant Run', 'run', 'a hunched lope on two legs', ''),
]
if SET == 'crawler': CLIPS = CRAWLER_CLIPS
# ---- AND THE UMBRA MARAUDER'S COMBO. The owner's "Dual Weapon Combo" is one
# Mixamo take of five strikes — measured off the hands' own speed: the LEFT
# blade at frame 15, the right at 22, both crossing at 35, the right at 44,
# and both sweeping at 52 — stepping 2.4 m forward, and then the last pose
# held for 180 frames. A fight has one hit per swing, so the take is cut into
# five windows at the valleys between the strikes and the game CHAINS them,
# which plays the whole of it back unbroken with every blade its own blow.
UMBRA_CLIPS = [
    ('Dual Weapon Combo', 'uC1', 'the left blade, opening', ''),
    ('Dual Weapon Combo', 'uC2', 'the right blade, back across', ''),
    ('Dual Weapon Combo', 'uC3', 'both blades, crossing', ''),
    ('Dual Weapon Combo', 'uC4', 'the right again, short', ''),
    ('Dual Weapon Combo', 'uC5', 'both blades, the sweep that ends it', ''),
    # AND THREE OF THE OWNER'S OWN, loose in ~/Downloads: two kicks he throws
    # exactly as Mixamo drew them, and a fall that is his knockdown.
    # `Kicking` is TWO kicks in one take — the left foot to the body at frame
    # 15, the right to the head at 22 — so it is cut at the valley between
    # them (frame 17) and chained, the combo's own arrangement: two blows,
    # each on its own measured frame, played back as the one take.
    ('Kicking',              'uKickA', 'the left foot, driven into the body', ''),
    ('Kicking',              'uKickA2', 'and the right, up at the head', ''),
    ('Inside Crescent Kick', 'uKickB', 'the leg swung up and across, inside out', ''),
    ('Death From The Back',  'uFall',  'thrown forward onto his face', ''),
]
if SET == 'umbra': CLIPS = UMBRA_CLIPS
# ---- AND THE PACK'S FLIGHT. The owner's three "Injured Run" clips: a body
# holding its side and limping away flat out, straight and turning each way.
# A mutant near death sometimes breaks off and runs with these, and they go
# onto the beach pack's own HumanIK rig (`Character1_*`, which is Mixamo's
# naming with a prefix). All three are de-yawed: the GAME steers him, and
# the turn clips' own measured drift is what it turns him at while they play.
MUTANT_CLIPS = [
    ('Injured Run',            'injRun', 'limping away, holding his side', ''),
    ('Injured Run Left Turn',  'injL',   'and bending away to the left', ''),
    ('Injured Run Right Turn', 'injR',   'and to the right', ''),
]
if SET == 'mutant': CLIPS = MUTANT_CLIPS
# ---- AND THE DEMONS IN THE WHALE. The owner's "Scary Zombie Pack" (and the
# "Not So Scary" folder inside it), every clip of it, onto PolyGoreStudio's
# Cursed Rune Demon. The demon is itself a Mixamo rig, so this is the
# cleanest retarget in the game: the same skeleton on both sides.
_Z, _N = 'Scary Zombie Pack', 'Scary Zombie Pack/Not So Scary Zombie Pack'
DEMON_CLIPS = [
    ('zombie idle',          'idle',     'swaying where it stands', _Z),
    ('zombie walk',          'walk',     'a lurching walk', _Z),
    ('zombie run',           'run',      'flat out, arms flung', _Z),
    ('running crawl',        'crawlRun', 'on all fours, fast', _Z),
    ('zombie crawl',         'crawl',    'dragging itself', _Z),
    ('zombie attack',        'zAtk',     'both arms raking down', _Z),
    ('zombie biting',        'zBite',    'lunging in to bite', _Z),
    ('zombie biting (2)',    'zBite2',   'a second bite', _Z),
    ('zombie biting',        'feed',     'crouched over something, gnawing', _Z),
    ('zombie neck bite',     'zNeck',    'grabbing for the neck', _Z),
    ('zombie scream',        'roar',     'screaming', _Z),
    ('zombie death',         'die',      'falling dead', _Z),
    ('zombie dying',         'die2',     'dying slowly', _Z),
    ('zombie attack',        'zAtkB',    'a second rake', _N),
    ('zombie punching',      'zPunch',   'swinging a fist', _N),
    ('zombie punching (2)',  'zPunch2',  'a flurry of fists', _N),
    ('zombie kicking',       'zKick',    'a kick', _N),
    ('zombie kicking (2)',   'zKick2',   'a second kick', _N),
    ('zombie headbutt',      'zButt',    'the head driven in', _N),
    ('zombie reaction hit',  'hit',      'rocked', _N),
    ('zombie reaction hit (2)', 'hitBig', 'rocked hard', _N),
    ('zombie running',       'runB',     'a second run', _N),
    ('walking',              'walkB',    'a second walk', _N),
    ('walking (2)',          'walkC',    'a third walk', _N),
    ('zombie idle (2)',      'idleB',    'twitching', _N),
    ('zombie idle (3)',      'idleC',    'hunched', _N),
    ('zombie idle (4)',      'idleD',    'swaying', _N),
    ('zombie scratch idle',  'idleS',    'scratching at itself', _N),
    ('zombie stumbling',     'stumble',  'stumbling', _N),
    ('zombie agonizing',     'agon',     'writhing', _N),
    ('zombie stand up',      'getUp',    'getting up', _N),
    ('zombie turn',          'turn',     'turning', _N),
]
if SET == 'demon': CLIPS = DEMON_CLIPS
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
CONTACT = {'uC1': 'LeftHand', 'uC2': 'RightHand', 'uC3': 'RightHand', 'uC4': 'RightHand', 'uC5': 'RightHand'} if SET == 'umbra' else {'nSweep': 'RightToeBase'} if SET != 'orc' else {
    'oCut': 'RightHand', 'oCutB': 'RightHand', 'oCutC': 'RightHand',
    'oCutD': 'RightHand', 'oCutE': 'RightHand', 'oChop': 'RightHand',
    'oSpin': 'RightHand', 'oLeap': 'RightHand', 'oSlide': 'RightHand',
    'oKick': 'RightToeBase',
}
REST_FWD = SET in ('orc', 'crawler', 'umbra', 'mutant', 'demon')
# ---- AND A CLIP THAT NEVER STANDS UP IS MEASURED FROM THE REST POSE.
# `hipY` is the hips' offset from the clip's FIRST frame, which is right for
# every clip that begins with a body standing — and the crawl begins on all
# fours, so measured from itself its hips read as never having dropped, and
# the game would play the crawl with the pelvis at standing height and the
# knees in the air. These are measured from the REST hips instead, the way
# `getUp` is measured from its last frame: the number the game wants is how
# far below where this rig binds its hips the clip actually carries them.
HIP_FROM_REST = {'crawl', 'run'} if SET == 'crawler' else set()   # the run is hunched: its hips sit under the rest hips too
if SET == 'crawler':
    KEEP_YAW = set()
    FORCE_FLAT_YAW = {c[1] for c in CLIPS}
    # the run is an eighteen-frame cycle; the importer pads it with a held
    # tail (frames 18..21 still), and a held tail in a loop is a hitch
    WINDOW = {'run': (0, 17)}
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
if SET == 'umbra':
    # THE COMBO TURNS A FULL CIRCLE — measured: +50, +125, +213, +10 and -33
    # degrees across the five windows, 365 in all, ending square to you. That
    # spin IS the move, so it is KEPT; and because the five windows are one
    # take, keeping their turn is also what keeps them continuous where they
    # are chained. A per-window de-yaw would have reset the body to facing
    # you at the start of every cut and snapped it through half a turn.
    KEEP_YAW = {c[1] for c in CLIPS}
    FORCE_FLAT_YAW = set()
    # the valleys between the strikes, as indices from the take's first frame
    WINDOW = {'uC1': (0, 17), 'uC2': (17, 27), 'uC3': (27, 39), 'uC4': (39, 46), 'uC5': (46, 65),
              'uKickA': (0, 17), 'uKickA2': (17, 43), 'uKickB': (0, 67), 'uFall': (0, 58)}
    CONTACT.update({'uKickA': 'LeftToeBase', 'uKickA2': 'RightToeBase', 'uKickB': 'RightToeBase'})
    # A WINDOW CUT OUT OF ONE TAKE IS MEASURED FROM THE TAKE. `hipY` is an
    # offset from the clip's own first frame, so the second half of a take
    # cut in two started its hips at zero wherever the first half had left
    # them — the body dropped by the difference on the frame the chain
    # handed over. These are measured from the take's first frame instead.
    HIP_FROM_TAKE = {'uKickA2'}
if SET == 'mutant':
    KEEP_YAW = set()
    FORCE_FLAT_YAW = {c[1] for c in CLIPS}
if SET == 'demon':
    KEEP_YAW = {'die', 'die2', 'getUp', 'agon'}
    FORCE_FLAT_YAW = {c[1] for c in CLIPS} - KEEP_YAW
    HIP_FROM_REST = {'crawl', 'crawlRun', 'feed'}
    HIP_ZERO_END = {'getUp'}
    # every blow is measured: whichever of these moves FASTEST is the striking end
    for _c in ('zAtk', 'zAtkB', 'zBite', 'zBite2', 'zNeck', 'zPunch', 'zPunch2', 'zKick', 'zKick2', 'zButt'):
        CONTACT[_c] = ('LeftHand', 'RightHand', 'Head', 'LeftToeBase', 'RightToeBase')
    CONTACT.update({'zBite2': 'Head', 'zButt': 'Head', 'zNeck': ('LeftHand', 'RightHand', 'Head'), 'zKick': ('LeftToeBase', 'RightToeBase'), 'zKick2': ('LeftToeBase', 'RightToeBase')})
    # A ZOMBIE PACK IS A SET OF PERFORMANCES: the bite lunges at frame 24 and then
    # gnaws on the floor for six seconds, the neck bite grabs and then shakes for
    # three. A fight wants the blow, read off the hands' own speed curves.
    WINDOW = {'feed': (52, 200), 'zAtk': (6, 50), 'zBite': (6, 44), 'zBite2': (0, 50), 'zNeck': (6, 58), 'zAtkB': (8, 56),
              'zPunch': (0, 35), 'zPunch2': (6, 70), 'zKick': (4, 45), 'zKick2': (10, 60), 'zButt': (4, 50)}
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


# ---- AND THE FLAIL KNIGHT IN CASTLE XIII CARRIES THE PRO SWORD AND SHIELD
# PACK WHOLE (the owner's ~/Downloads folder of that name). He is a HumanIK rig
# with Mixamo's naming under a prefix, so this is the retarget at its easiest;
# his own fourteen clips ride in assets/crusader.glb beside it.
_S = 'Pro Sword and Shield Pack'
CRUSADER_CLIPS = [
    ('sword and shield idle',          'sIdle',   'standing, shield up', _S),
    ('sword and shield idle (2)',      'sIdleB',  'a second way of standing', _S),
    ('sword and shield idle (3)',      'sIdleC',  'a third', _S),
    ('sword and shield idle (4)',      'sIdleD',  'a fourth', _S),
    ('sword and shield walk',          'sWalk',   'the walk', _S),
    ('sword and shield walk (2)',      'sWalkB',  'walking backwards', _S),
    ('sword and shield run',           'sRun',    'the run', _S),
    ('sword and shield run (2)',       'sRunB',   'a second run', _S),
    ('sword and shield strafe',        'sStr1',   'sideways', _S),
    ('sword and shield strafe (2)',    'sStr2',   'sideways', _S),
    ('sword and shield strafe (3)',    'sStr3',   'sideways', _S),
    ('sword and shield strafe (4)',    'sStr4',   'sideways', _S),
    ('sword and shield turn',          'sTurn',   'a turn on the spot', _S),
    ('sword and shield turn (2)',      'sTurnB',  'a turn the other way', _S),
    ('sword and shield 180 turn',      'sTurn180','about face', _S),
    ('sword and shield slash',         'sSlash',  'a cut', _S),
    ('sword and shield slash (2)',     'sSlashB', 'a second cut', _S),
    ('sword and shield slash (3)',     'sSlashC', 'a third', _S),
    ('sword and shield slash (4)',     'sSlashD', 'a fourth', _S),
    ('sword and shield slash (5)',     'sSlashE', 'a fifth', _S),
    ('sword and shield attack',        'sAtk',    'an attack', _S),
    ('sword and shield attack (2)',    'sAtkB',   'a second', _S),
    ('sword and shield attack (3)',    'sAtkC',   'a third', _S),
    ('sword and shield attack (4)',    'sAtkD',   'a fourth', _S),
    ('sword and shield kick',          'sKick',   'the kick', _S),
    ('sword and shield block',         'sBlock',  'the shield comes up', _S),
    ('sword and shield block idle',    'sBlockI', 'holding the guard', _S),
    ('sword and shield crouch block',  'sCBlock', 'down behind the shield', _S),
    ('sword and shield impact',        'sHit',    'the flinch', _S),
    ('sword and shield impact (2)',    'sHitB',   'a second flinch', _S),
    ('sword and shield impact (3)',    'sHitC',   'the one that rocks him', _S),
    ('sword and shield death',         'sDie',    'and down', _S),
    ('sword and shield death (2)',     'sDieB',   'and down, the other way', _S),
    ('sword and shield power up',      'sRoar',   'the war cry', _S),
    ('sword and shield casting',       'sCast',   'raising the weapon', _S),
    ('draw sword 1',                   'sDraw',   'drawing', _S),
    ('sword and shield jump',          'sJump',   'a jump', _S),
]
if SET == 'crusader':
    CLIPS = CRUSADER_CLIPS
    REST_FWD = True
    # A SPINNING CUT IS THE MOVE: his swings keep their root turn, and one
    # that ends turned away is unwound over the back half of the clip
    # (`RAMP_YAW`) rather than snapped back square on the next.
    _SW = ('sSlash', 'sSlashB', 'sSlashC', 'sSlashD', 'sSlashE', 'sAtk', 'sAtkB', 'sAtkC', 'sAtkD', 'sKick')
    KEEP_YAW = {'sDie', 'sDieB', 'sTurn', 'sTurnB', 'sTurn180'} | set(_SW)
    RAMP_YAW = set(_SW)
    FORCE_FLAT_YAW = {c[1] for c in CLIPS} - KEEP_YAW
    WINDOW = {}
    for _c in _SW:
        CONTACT[_c] = 'RightHand'          # the flail is in his right fist
    CONTACT['sKick'] = 'RightToeBase'


# ---- THE PALADIN (2026-10-17, the owner: "a brand new smooth moveset … unique swings"). His blows are
# Mixamo's standing melee set, which nothing else in the game swings: the owner's `paladin moves` folder.
# How he carries himself between them is the Great Sword Pack's — only the clips the orc does not use, so
# even his standing and his flinches are his own.
_P, _G = 'paladin moves', 'Great Sword Pack'
_TC = os.path.expanduser('~/Downloads/TC_Sword_Free_Pack/FBX_Pack/Animation')
_EJ = os.path.expanduser('~/paladin moves/converted')     # (absolute: `os.path.join` lets it win over SRC)
PALADIN_CLIPS = [
    # ---- THE OWNER'S EEJANAI "Free Sword Animation" PACK (2026-10-17, "use these instead"): nine slashes and three
    # stances, re-laid on a plain Mixamo skeleton by `tools/eej_convert.py` (its hips are the armature object).
    ('battle stance',                       'pStance', 'his guard', _EJ),
    ('deffensive stance',                   'pGuard',  'the guard, braced', _EJ),
    ('damaged (tired) stance',              'pTired',  'hurt, breathing, still holding the blade up', _EJ),
    ('slash1',                              'pS1',     'a slash', _EJ),
    ('slash2',                              'pS2',     'a slash', _EJ),
    ('slash3',                              'pS3',     'a slash', _EJ),
    ('slash4',                              'pS4',     'a slash', _EJ),
    ('slash5',                              'pS5',     'a slash', _EJ),
    ('slash6',                              'pS6',     'a slash', _EJ),
    ('slash7',                              'pS7',     'a slash', _EJ),
    ('slash8',                              'pS8',     'a quick one', _EJ),
    ('slash9',                              'pS9',     'a slash', _EJ),
    # ---- THE OWNER'S MOCAPONLINE "TC Sword" FREE PACK (2026-10-17): a real swordsman's capture — one ready stance,
    # a walk, a run, and ONE combination of four blows, which is cut here into its blows (`WINDOW`) so the game can
    # throw each on its own and CHAIN them back into the whole string: each piece ends on the frame the next begins.
    ('KBS_Sword_ATK_Combo_01_001',          'pCut1',   'the first cut, one hand, down across', _TC),
    ('KBS_Sword_ATK_Combo_01_001',          'pCut2',   'the second, both hands, back across', _TC),
    ('KBS_Sword_ATK_Combo_01_001',          'pCut3',   'the third, both hands, low', _TC),
    ('KBS_Sword_ATK_Combo_01_001',          'pSlam',   'the blade raised high and brought down into the stones', _TC),
    ('KBS_Ready_Idle_001',                  'pReady',  'his guard, the blade out', _TC),
    ('KBS_Walk_F_001',                      'pWalkT',  'the walk, blade in hand', _TC),
    ('KBS_Run_F_001',                       'pRunT',   'the run', _TC),
    ('Standing Melee Attack Downward',      'pDown',   'the overhead cleave', _P),
    ('Standing Melee Attack Horizontal',    'pWide',   'the wide sweep', _P),
    ('Standing Melee Attack Backhand',      'pBack',   'the return sweep', _P),
    ('Standing Melee Combo Attack Ver. 1',  'pCombo1', 'a string', _P),
    ('Standing Melee Combo Attack Ver. 2',  'pCombo2', 'a second string', _P),
    ('Standing Melee Combo Attack Ver. 3',  'pCombo3', 'a third', _P),
    ('Standing Melee Attack 360 Low',       'pSpin',   'the low turning sweep', _P),
    ('Standing Melee Run Jump Attack',      'pLeap',   'the run and the leap down on you', _P),
    ('Standing Taunt Battlecry',            'pRoar',   'the war cry', _P),
    ('Falling Back Death',                  'pDie',    'and down on his back', _P),
    ('great sword idle (3)',                'pIdle',   'standing, the blade down', _G),
    ('great sword idle (4)',                'pIdleB',  'a second way of standing', _G),
    ('great sword idle (5)',                'pIdleC',  'a third', _G),
    ('great sword walk',                    'pWalk',   'the walk', _G),
    ('great sword run',                     'pRun',    'the run', _G),
    ('great sword strafe',                  'pStrL',   'sideways, left', _G),
    ('great sword strafe (2)',              'pStrR',   'sideways, right', _G),
    ('great sword 180 turn',                'pTurn',   'about face', _G),
    ('great sword impact (4)',              'pHit',    'the flinch', _G),
    ('great sword impact (5)',              'pHitB',   'a second flinch', _G),
    ('great sword impact (3)',              'pHitBig', 'the one that rocks him', _G),
    ('great sword blocking (2)',            'pBlock',  'the guard', _G),
    ('great sword casting',                 'pCast',   'the blade raised over his head', _G),
    ('two handed sword death (2)',          'pDieB',   'and down, the other way', _G),
]
if SET == 'paladin':
    # (2026-10-17, round 4: his moves are baked onto his own skeleton by `tools/paladin_bake.py`, which writes
    # assets/paladin-moves.json in ITS format; this set would overwrite it with the old one)
    print('[ntar-moves] the paladin is baked by tools/paladin_bake.py now; nothing written'); sys.exit(0)
    CLIPS = PALADIN_CLIPS
    REST_FWD = True
    _SW = ('pDown', 'pWide', 'pBack', 'pCombo1', 'pCombo2', 'pCombo3', 'pSpin', 'pLeap', 'pCut1', 'pCut2', 'pCut3', 'pSlam') + tuple('pS%d' % i for i in range(1, 10))
    KEEP_YAW = {'pDie', 'pDieB', 'pTurn', 'pSpin'} | set(_SW)
    RAMP_YAW = set(_SW) - {'pSpin', 'pCut1', 'pCut2', 'pCut3', 'pSlam'}     # (an EEJANAI slash that turns him unwinds over its back half)     # (the cut-up string keeps its turns: unwinding each piece would break the joins)
    FORCE_FLAT_YAW = {c[1] for c in CLIPS} - KEEP_YAW
    # the string's blows, at the frames the hands are slowest between them (measured: the point's speed falls to
    # 3 m/s at 37, 2.8 at 63, 1.5 at 91; the slam is in the stones at 124 and settled by 152)
    WINDOW = {'pCut1': (0, 36), 'pCut2': (36, 62), 'pCut3': (62, 90), 'pSlam': (90, 151)}
    for _c in _SW:
        CONTACT[_c] = 'RightHand'          # the sword is in his right fist (the left rides the grip)


# ---- SKRIM, THE THING DIGGING IN THE WHALE'S BELLY (2026-10-29), carries the
# owner's PRO MAGIC PACK whole (~/Downloads/Pro Magic Pack): every clip in the
# folder. His rig (`assets/skrim.glb`, from `tools/skrim_pack.py`) is an Auto-Rig
# Pro skeleton renamed to HumanIK under `Character1_`, so the delta lands one to
# one. The blows are SPELLS: the frame that matters is the one the casting hand
# is thrown hardest, which is the reptilian rake's rule again (fastest, not
# furthest), read off whichever hand moves fastest.
_M = 'Pro Magic Pack'
SKRIM_CLIPS = [
    ('standing idle',                    'idle',        'standing', _M),
    ('standing idle 02',                 'idle2',       'a second way of standing', _M),
    ('Standing Idle 03',                 'idle3',       'a third, long', _M),
    ('Standing Idle 04',                 'idle4',       'a fourth', _M),
    ('Standing Walk Forward',            'walk',        'the walk', _M),
    ('Standing Walk Back',               'walkB',       'walking backwards', _M),
    ('Standing Walk Left',               'walkL',       'sideways, left', _M),
    ('Standing Walk Right',              'walkR',       'sideways, right', _M),
    ('Standing Run Forward',             'run',         'the run', _M),
    ('Standing Run Back',                'runB',        'running backwards', _M),
    ('Standing Run Left',                'runL',        'running sideways, left', _M),
    ('Standing Run Right',               'runR',        'running sideways, right', _M),
    ('Standing Sprint Forward',          'sprint',      'flat out', _M),
    ('Crouch Idle',                      'crouchIdle',  'down low', _M),
    ('Crouch Walk Forward',              'crouchWalk',  'creeping forward', _M),
    ('Crouch Walk Back',                 'crouchWalkB', 'creeping back', _M),
    ('Crouch Walk Left',                 'crouchWalkL', 'creeping left', _M),
    ('Crouch Walk Right',                'crouchWalkR', 'creeping right', _M),
    ('Standing Idle To Crouch',          'toCrouch',    'going down', _M),
    ('Crouch To Standing Idle',          'fromCrouch',  'and up again', _M),
    ('Crouch Turn Left 90',              'crouchTurnL', 'a quarter turn down low, left', _M),
    ('Crouch Turn Right 90',             'crouchTurnR', 'a quarter turn down low, right', _M),
    ('Standing Turn Left 90',            'turnL',       'a quarter turn, left', _M),
    ('Standing Turn Right 90',           'turnR',       'a quarter turn, right', _M),
    ('Standing 1H Magic Attack 01',      'm1A1',        'one hand thrown out', _M),
    ('Standing 1H Magic Attack 02',      'm1A2',        'a second', _M),
    ('Standing 1H Magic Attack 03',      'm1A3',        'a third', _M),
    ('Standing 2H Magic Attack 01',      'm2A1',        'both hands', _M),
    ('Standing 2H Magic Attack 02',      'm2A2',        'both hands, a second', _M),
    ('Standing 2H Magic Attack 03',      'm2A3',        'a third', _M),
    ('Standing 2H Magic Attack 04',      'm2A4',        'a fourth', _M),
    ('Standing 2H Magic Attack 05',      'm2A5',        'a fifth', _M),
    ('Standing 2H Magic Area Attack 01', 'area1',       'all round him', _M),
    ('Standing 2H Magic Area Attack 02', 'area2',       'all round him, a second', _M),
    ('standing 1H cast spell 01',        'cast1',       'a spell, one hand', _M),
    ('Standing 2H Cast Spell 01',        'cast2',       'a spell, both hands', _M),
    ('Standing Block Start',             'blockStart',  'the guard comes up', _M),
    ('Standing Block Idle',              'blockIdle',   'holding it', _M),
    ('Standing Block End',               'blockEnd',    'and down', _M),
    ('Standing Block React Large',       'blockHit',    'the guard is struck', _M),
    ('Standing React Small From Front',  'hitSF',       'a flinch, from in front', _M),
    ('Standing React Small From Back',   'hitSB',       'from behind', _M),
    ('Standing React Small From Left',   'hitSL',       'from his left', _M),
    ('Standing React Small From Right',  'hitSR',       'from his right', _M),
    ('Standing React Large From Front',  'hitLF',       'rocked, from in front', _M),
    ('Standing React Large From Back',   'hitLB',       'from behind', _M),
    ('Standing React Large From Left',   'hitLL',       'from his left', _M),
    ('Standing React Large From Right',  'hitLR',       'from his right', _M),
    ('Standing React Death Backward',    'dieB',        'and down on his back', _M),
    ('Standing React Death Forward',     'dieF',        'and down on his face', _M),
    ('Standing React Death Left',        'dieL',        'and down to his left', _M),
    ('Standing React Death Right',       'dieR',        'and down to his right', _M),
    ('Standing Jump',                    'jump',        'a jump on the spot', _M),
    ('Standing Jump Running',            'jumpRun',     'a running jump', _M),
    ('Standing Jump Running Landing',    'jumpLand',    'a running jump, and the landing', _M),
    ('Standing Land To Standing Idle',   'land',        'landing, and standing', _M),
]
if SET == 'skrim':
    CLIPS = SKRIM_CLIPS
    REST_FWD = True
    # THE PACK'S TAKES ARE ALL 250 FRAMES ON THE SCENE AND NONE OF THEM IS:
    # measured, the armature's own action runs 16 to 343 frames (`Standing Idle
    # 03` is 343 and the scene range CUT it at 250). The take is the action.
    TAKE_FROM_ACTION = True
    # the game turns him at the player every frame, so nothing turns his hips as
    # well — except a body falling over (`knockOut`'s lesson) and the quarter
    # turns, where the turn IS the move (the crusader's rule; `drift` says how far).
    # MEASURED, the spells TWIST HIM: the hips swing 56-122 deg through a cast and
    # come back square (drift 0-2 deg), so the twist is the throw and is kept, and
    # any end drift unwound over the back half (`RAMP_YAW`, the crusader's swings).
    # The TRANSITIONS are kept too: the guard is side-on (blockStart ends +50,
    # blockEnd -50), the crouch is turned (toCrouch +30, fromCrouch -30) and the
    # landing starts turned (-37); de-yawed, each would end square and the clip
    # after it would snap through the difference. The two idles that look round
    # (idle2 43 deg, idle4 76 deg, both ending 0) are left to the default rule.
    _SP = ('m1A1', 'm1A2', 'm1A3', 'm2A1', 'm2A2', 'm2A3', 'm2A4', 'm2A5', 'area1', 'area2', 'cast1', 'cast2')
    KEEP_YAW = {'dieB', 'dieF', 'dieL', 'dieR', 'turnL', 'turnR', 'crouchTurnL', 'crouchTurnR',
                'blockStart', 'blockEnd', 'toCrouch', 'fromCrouch', 'land'} | set(_SP)
    RAMP_YAW = set(_SP)
    FORCE_FLAT_YAW = {c[1] for c in CLIPS} - KEEP_YAW - {'idle2', 'idle4'}
    WINDOW = {}
    # a clip that never stands up is measured from the rest hips (the crawl's
    # rule); one that begins low and ends standing, from its last frame (getUp's)
    HIP_FROM_REST = {'crouchIdle', 'crouchWalk', 'crouchWalkB', 'crouchWalkL', 'crouchWalkR', 'crouchTurnL', 'crouchTurnR'}
    HIP_ZERO_END = {'fromCrouch', 'land'}
    for _c in _SP:
        CONTACT[_c] = ('LeftHand', 'RightHand')     # whichever hand is thrown hardest


if 'HIP_FROM_TAKE' not in globals(): HIP_FROM_TAKE = set()
if 'TAKE_FROM_ACTION' not in globals(): TAKE_FROM_ACTION = False
if 'RAMP_YAW' not in globals(): RAMP_YAW = set()
# A clip whose hips are measured from its LAST frame, not its first: it
# begins on the floor and ends standing, so the stance is at the END.
if 'HIP_ZERO_END' not in globals(): HIP_ZERO_END = {'getUp'}


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
        if TAKE_FROM_ACTION and arm.animation_data and arm.animation_data.action:
            f0, f1 = (int(round(v)) for v in arm.animation_data.action.frame_range)
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
        takeHip = hips[0].copy()
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
        hy0 = restPos['Hips'].y if name in HIP_FROM_REST else h0.y   # see HIP_FROM_REST
        if name in HIP_FROM_TAKE: hy0 = (CONV @ takeHip).y
        endTurn = (hipyaw(end) - y0 + math.pi) % (2 * math.pi) - math.pi

        def ramp(i):
            t = max(0.0, min(1.0, (i / max(1, end) - 0.5) / 0.5))
            return t * t * (3 - 2 * t)
        for i in range(end + 1):
            # de-yaw about the hips' start, if this clip turns and should not
            undo = Quaternion((0, 1, 0), -(hipyaw(i) - y0)) if flat else Quaternion()
            if not flat and name in RAMP_YAW:
                undo = Quaternion((0, 1, 0), -endTurn * ramp(i))
            for b in bones:
                q = undo @ (CONV @ raw[i][b])
                # the DELTA: what this bone has done since its rest pose
                d = q @ rest[b].inverted()
                d.normalize()
                if d.w < 0:                          # the short way round, for the lerp at the far end
                    d = Quaternion((-d.w, -d.x, -d.y, -d.z))
                tracks[b].extend([r4(d.x), r4(d.y), r4(d.z), r4(d.w)])
            hp = undo @ (CONV @ hips[i] - h0)
            hipY.append(r4((CONV @ hips[i]).y - hy0))
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
        cbs = CONTACT.get(name)
        if isinstance(cbs, str): cbs = (cbs,)
        cbs = [c for c in (cbs or ()) if (pref + c) in arm.pose.bones]
        if cbs:
            best, bi, bcb = 0, 0, cbs[0]
            tips = {c: [] for c in cbs}
            for i in range(end + 1):
                sc.frame_set(f0 + w0 + i)
                for c in cbs: tips[c].append(CONV @ (MW @ arm.pose.bones[pref + c].matrix).to_translation())
            for c in cbs:
                tip = tips[c]
                for i in range(1, end + 1):
                    sp = (tip[i] - tip[i - 1]).length
                    if sp > best: best, bi, bcb = sp, i, c
            contact = r4(bi / max(1, end))
            cb = bcb
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
            out['clips'][name]['by'] = cb

    if missing and '--partial' not in sys.argv:          # (`--partial` writes what there is: a set whose clips are still on their way)
        sys.exit('no source and nothing already built for: ' + ', '.join(missing))
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    log('built', len(built), 'of', len(CLIPS), '-', ', '.join(built))
    log('wrote %s: %d clips, %.1f KB' % (os.path.relpath(OUT), len(out['clips']), os.path.getsize(OUT) / 1024))


main()
