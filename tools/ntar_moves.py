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
SET = next((a for a in ('knight', 'wong', 'drunk', 'orc', 'crawler', 'umbra', 'mutant', 'demon', 'sword', 'skrim', 'dance', 'king', 'scourge') if a in sys.argv), 'ntar')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', SET + '-moves.json')
SRC = os.path.expanduser(os.environ.get('NTAR_SRC', '~/Downloads'))   # (NTAR_SRC: another folder of the owner's, e.g. '~/Desktop/BEACHWALK ASSETS')
ONLY = set(filter(None, os.environ.get('NTAR_ONLY', '').split(',')))   # (NTAR_ONLY=a,b: build just these clips; the rest kept as they are)
# (the owner keeps the packs on the Desktop now; a set may say so)
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
    # ---- AND THE GARRISON'S BLOWS (2026-11-23, the owner: "use these for the farmers make sure the weapons are held correctly like the
    # screenshot … make the zombie death animation for them but make it rare and they ragdoll after"): three Mixamo one-handed melee
    # combos (a club in the fist in Mixamo's preview — the farmers' cuts were the GREAT SWORD pack's two-handed slashes on one-handed
    # weapons), Ver. 2 twice (a second download), and a zombie's death, loose in ~/Downloads.
    ('Standing Melee Combo Attack Ver. 1',   'mc1',  'a one-handed combo, the first',  ''),
    ('Standing Melee Combo Attack Ver. 2',   'mc2',  'a one-handed combo, the second', ''),
    ('Standing Melee Combo Attack Ver. 2-2', 'mc2b', 'the second again (a second download)', ''),
    ('Standing Melee Combo Attack Ver. 3',   'mc3',  'a one-handed combo, the third',  ''),
    ('Zombie Death',                         'zDie', 'a slow death on the feet, then down', ''),
    # (2026-11-25, the owner: "add this move for the farmers make sure they hold their weapons and swing like the video" — Mesh2Motion's
    # "Sword_Attack" on its human with a Large Battle Axe in the right hand, exported Mixamo-named, skeleton + animation, as a GLB)
    ('exported-model-2',                     'swAtk', 'a big one-handed cut, Mesh2Motion\'s Sword_Attack', ''),
    # (and the same night: "use the idle too on farmers" — Mesh2Motion's "Idle_Sword", the same human, the same export)
    ('exported-model',                       'swIdle', 'standing ready, the weapon held low in front, Mesh2Motion\'s Idle_Sword', ''),
    # (and the same night: "the new swing i added for the farmers is the best yet adjust the other moves accordingly they are horrible" —
    # the rest of the owner's Mesh2Motion sword set, out of exported-model-3.glb by `tools/glb_split.py` into /tmp/scourge_src; built
    # with NTAR_SRC=/tmp/scourge_src NTAR_ONLY=mSwB,mSwC,mSwCombo,mSwDash)
    ('Sword_Regular_B',      'mSwB',     'a quick cut', ''),
    ('Sword_Regular_C_RM',   'mSwC',     'a stepping cut', ''),
    ('Sword_Regular_Combo',  'mSwCombo', 'a string of cuts', ''),
    ('Sword_Dash_RM',        'mSwDash',  'a dash in with a cut', ''),
    ('Flying Kick',           'wFlyC',   'off the ground, both feet', ''),
    # (2026-11-26, the owner: "give the drunk and wong some animations that work better they fight bad and slide around too much".
    # His punch was the knight's Mutant Punch — a monster's haymaker — his kick the alien's sweep and his spin a swordsman's 360.
    # Three unarmed Mixamo takes out of ~/Desktop/BEACHWALK ASSETS (NTAR_SRC) instead: built with
    # NTAR_SRC="$HOME/Desktop/BEACHWALK ASSETS" NTAR_ONLY=wUpper,wCres,wKickF blender -b -P tools/ntar_moves.py -- wong)
    ('Surprise Uppercut',       'wUpper', 'the uppercut, off a dip', ''),
    ('Inside Crescent Kick',    'wCres',  'the half-moon kick, the leg swept round through you', ''),
    ('Kicking',                 'wKickF', 'a front kick into the body', ''),
    # (2026-11-26, the owner: "HERES SOME STAND ANIMATIONS FOR PEOPLE BUT MAKE THEM FLUID AND SEAMLESS IF USED" — four Mixamo get-ups,
    # loose in ~/Downloads: the man kicked over and thrown as a ragdoll gets up by whichever starts nearest how he lies, `kickRagRise`)
    ('Stand Up',              'mStandA',   'up off the floor, one way', ''),
    ('Stand Up-2',            'mStandB',   'up off the floor, another way', ''),
    ('Standing Up',           'mStandC',   'up off the floor, a third way', ''),
    ('Standing Up-2',         'mStandD',   'up off the floor, a fourth way', ''),
    # ---- (2026-11-22, the owner: "give the marionette this look around when he comes out of the washer": he wears this pack,
    # `celMarMocap`, so it rides here)
    ('Nervously Look Around', 'lookAround', 'the marionette out of the washer, looking round him', ''),
    # (and the same day: "give the other puppets this run not the marionette" — the workshop's, `MUT_KINDS.cpup` as `mMRun`)
    ('Mutant Run',            'mutantRun',  'the workshop puppets\' run, hunched and fast', ''),
    # (and: "when you come back from the water section have the marionette laying on the beach and he gets up like this")
    ('Situp To Idle',         'situp',      'the marionette up off the sand when you are back from the deep', ''),
    # ("the puppet laying on the workshop desk should be in this pose")
    ('Sleeping Idle',         'sleep',      'the workshop puppet lying on the workbench', ''),
    # ("make this a marionettes idle stance")
    ('Old Man Idle',          'oldIdle',    'the marionette standing: an old man\'s stoop', ''),
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
    # (2026-11-26: the same request. His spin was a swordsman's 360 with the arm out and his leap a mutant's; a drunk swings wide and
    # low: the haymaker is the knight's Mutant Punch, aliased, and this uppercut is his own.
    # NTAR_SRC="$HOME/Desktop/BEACHWALK ASSETS" NTAR_ONLY=dUpper blender -b -P tools/ntar_moves.py -- drunk)
    ('Surprise Uppercut',         'dUpper',   'the uppercut, off a dip', ''),
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
# ---- AND TWO MEN DANCING IN THE TAVERN (2026-11-17, the owner: "have two farmers each using these dance moves in the
# tavern near the front of the storage room. make these animations exact"). Two Mixamo dances loose in ~/Downloads, each
# a performance to be watched, so NOTHING is cut or turned: the body's own spins are kept as drawn (`KEEP_YAW`), the window
# is only the held tail Mixamo pads a take with, and the travel goes out for the game to put back into the hips.
DANCE_CLIPS = [
    ('Hip Hop Dancing',      'danceA', 'hip hop'),
    ('Snake Hip Hop Dance',  'danceB', 'the snake'),
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
KEEP_YAW = {'knockOut', 'getUp', 'mStandA', 'mStandB', 'mStandC', 'mStandD'}   # (a get-up turns the body over: its own yaw kept)
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
if SET == 'dance':
    CLIPS = DANCE_CLIPS
    KEEP_YAW = {c[1] for c in CLIPS}
    FORCE_FLAT_YAW = set()
    WINDOW = {}
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
    WINDOW = {'wFlyC': (0, 30), 'ginga': (84, 118), 'mc1': (24, 142)}
    # (the four unarmed blows of 2026-11-26: their contact is the frame the striking end moves fastest, either hand or either foot)
    for _c in ('wUpper', 'wCres', 'wKickF', 'dUpper'):
        CONTACT[_c] = ('LeftHand', 'RightHand', 'LeftToeBase', 'RightToeBase')   # (mc1: its first 0.8 s is a settle before the raise — a man standing about before the first blow, 2026-11-23)
    # AND A BODY THAT LEAVES THE VERTICAL KEEPS ITS OWN TURN — `knockOut`'s
    # lesson: the au takes him onto his hands, and a world-Y de-yaw applied
    # to a horizontal body is a roll about its own length.
    KEEP_YAW = {'ginga', 'swAtk', 'mSwB', 'mSwC', 'mSwCombo', 'mSwDash'}   # (swAtk: the hips wind 71 deg into the cut and come back to where they started — the swing's own turn)
    FORCE_FLAT_YAW = {c[1] for c in CLIPS} - KEEP_YAW


# ---- THE PRO SWORD AND SHIELD PACK WHOLE (the owner's ~/Downloads folder of
# that name) -> assets/sword-moves.json, worn by Castle XIII's swordsmen, the
# dark knight and the throne door's knights. (First packed for the flail
# knight, who is gone for good, 2026-11-04.)
_S = 'Pro Sword and Shield Pack'
SWORD_CLIPS = [
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
if SET == 'sword':
    CLIPS = SWORD_CLIPS
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
        CONTACT[_c] = 'RightHand'          # the weapon is in the right fist
    CONTACT['sKick'] = 'RightToeBase'


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
    # (2026-11-19, the owner's Mixamo "Stylish Flip": "have skrim flip off the hook like this if not shot off while hanging
    # after his creatures are killed" — loose in ~/Downloads)
    ('Stylish Flip',                     'flipOff',     'off his hook, turning over, to the floor', ''),
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
                'blockStart', 'blockEnd', 'toCrouch', 'fromCrouch', 'land', 'flipOff'} | set(_SP)   # (the flip's turn is the flip)
    RAMP_YAW = set(_SP)
    FORCE_FLAT_YAW = {c[1] for c in CLIPS} - KEEP_YAW - {'idle2', 'idle4'}
    WINDOW = {}
    # a clip that never stands up is measured from the rest hips (the crawl's
    # rule); one that begins low and ends standing, from its last frame (getUp's)
    HIP_FROM_REST = {'crouchIdle', 'crouchWalk', 'crouchWalkB', 'crouchWalkL', 'crouchWalkR', 'crouchTurnL', 'crouchTurnR'}
    HIP_ZERO_END = {'fromCrouch', 'land'}
    for _c in _SP:
        CONTACT[_c] = ('LeftHand', 'RightHand')     # whichever hand is thrown hardest


# ---- THE ANCIENT KING, THE LAST OF THEM (2026-11-19): the owner's Mixamo "Front Flip" — "make the final god boss sometimes
# flip over your head and land behind you like this". His rig is a Character Creator one (CC_Base_*: `assets/ancient-king.glb`),
# mapped in the game by `KING_RAG`. The turn over is the move (its yaw kept); the travel is measured and left to the game.
KING_CLIPS = [
    ('Front Flip', 'flip', 'over your head', ''),
    # ("have the final god boss sometimes run up the pillar to the very top of the temple and sit up top looking at you like
    # this for 3 seconds then he hovers back down to fight")
    ('Wall Run', 'wallRun', 'up a pillar', ''),
    # ---- AND HIS FIGHT (2026-11-20, the owner: "give him good animations i am adding all of them make sure they look exactly
    # like this and visibly connect so they can be blocked"): the Mixamo Locomotion Pack (its own subfolder of ~/Downloads)
    # for every way he stands and moves, and seven takes loose in ~/Downloads for his blows and his death.
    ('idle',                 'kIdle',   'standing, his fists ready', 'Locomotion Pack'),
    ('walking',              'kWalk',   'walking at you', 'Locomotion Pack'),
    ('running',              'kRun',    'running', 'Locomotion Pack'),
    ('left strafe',          'kStrL',   'circling left, quick', 'Locomotion Pack'),
    ('right strafe',         'kStrR',   'circling right, quick', 'Locomotion Pack'),
    ('left strafe walking',  'kStrWL',  'circling left', 'Locomotion Pack'),
    ('right strafe walking', 'kStrWR',  'circling right', 'Locomotion Pack'),
    ('left turn',            'kTurnL',  'turning on the spot, left', 'Locomotion Pack'),
    ('right turn',           'kTurnR',  'turning on the spot, right', 'Locomotion Pack'),
    ('left turn 90',         'kTurn90L', 'a quarter turn left', 'Locomotion Pack'),
    ('right turn 90',        'kTurn90R', 'a quarter turn right', 'Locomotion Pack'),
    ('jump',                 'kJump',   'a jump', 'Locomotion Pack'),
    ('Fast Run',             'kSprint', 'flat out at you', ''),
    ('Surprise Uppercut',    'kUpper',  'the uppercut', ''),
    ('Flying Bicycle Kick',  'kBike',   'off the floor, both feet', ''),
    ('Flying Knee Punch Combo', 'kKnee', 'the knee, then the fists', ''),
    ('Brutal Assassination', 'kAssn',   'the kill', ''),
    ('Kicking',              'kKick',   'the kicks', ''),
    ('Being Electrocuted',   'kShock',  'his death: the lightning through him', ''),
    # (2026-11-20, the owner: "dont have him float down make him jump down and slam using this mutant jump when he runs up the
    # pillars … have the impact huge when he slams down")
    ('Mutant Jump Attack',   'kSlam',   'off the pillar and down onto you, both fists', ''),
    # (2026-11-21, the owner: "HE DOES THE BYCICLE KICK WAY TOO MUCH THAT SHOULD BE KINDA RARE ADD MORE ANIMATIONS WHERE SOME
    # FALL SHORT"): three more of his own, out of ~/Desktop/BEACHWALK ASSETS (NTAR_SRC) — the flying kick out of his sprint,
    # a crescent kick, and the spinning high blow
    ('Flying Kick',                     'kFlyKick',  'out of the run, one foot through you', ''),
    ('Inside Crescent Kick',            'kCrescent', 'the leg swept round and down through you', ''),
    ('Standing Melee Attack 360 High',  'k360',      'round on his heel, the arm through your head', ''),
]
if SET == 'king':
    CLIPS = KING_CLIPS
    REST_FWD = True
    TAKE_FROM_ACTION = True
    # (his death keeps its own turn — there is no heading of a body falling — and the turns are pivots, de-yawed: the game
    # turns him; the uppercut ends 60 degrees round, which the game would undo with a snap, so it is de-yawed too)
    KEEP_YAW = {'flip', 'wallRun', 'kShock', 'kSlam'}
    FORCE_FLAT_YAW = {'kTurnL', 'kTurnR', 'kTurn90L', 'kTurn90R', 'kUpper'}
    # the electrocution is 10.6 s: the first second is him standing, the last two lying still (the hips, measured: down by
    # f252). The rest is the death.
    WINDOW = {'kShock': (24, 256)}
    CONTACT = {}
    PEAKS = ('LeftHand', 'RightHand', 'LeftLeg', 'RightLeg', 'LeftToeBase', 'RightToeBase')
    for _c in ('kUpper', 'kBike', 'kKnee', 'kAssn', 'kKick', 'kSlam', 'kFlyKick', 'kCrescent', 'k360'):
        CONTACT[_c] = PEAKS

# ---- THE SCOURGER'S MOVES (2026-11-25, the owner, with `~/Downloads/exported-model-3.glb`: "take out all the animations except the
# run up the pillars and smash down plus the death animation … i am going to give new animations now make sure the rig is correct …
# there is also a rare knockback and stand back up animation in there"). Twelve Mesh2Motion clips on its human, Mixamo-named, one
# GLB; `tools/glb_split.py` writes one file a clip, and this set reads them from there:
#   python3 tools/glb_split.py ~/Downloads/exported-model-3.glb /tmp/scourge_src
#   NTAR_SRC=/tmp/scourge_src blender -b -P tools/ntar_moves.py -- scourge      -> assets/scourge-moves.json
# (the GLB path measures D from MIXAMO'S BIND, read off `wong-moves.json`'s mc1 when this file has none of its own)
SCOURGE_CLIPS = [
    ('Dodge_back_RM',       'sDodgeB',   'a hop back out of reach', ''),
    ('Dodge_left_RM',       'sDodgeL',   'a hop to his left', ''),
    ('Dodge_right_RM',      'sDodgeR',   'a hop to his right', ''),
    ('Hit_Knockback_RM',    'sKnock',    'struck hard and thrown back off his feet (rare)', ''),
    ('LayToIdle',           'sRise',     'up off the ground into his stance', ''),
    ('Idle_Sword',          'sIdleW',    'standing ready, the weapon low in front', ''),
    ('Sword_Attack_RM',     'sAtk',      'the big overhead into a lunge', ''),
    ('Sword_Block',         'sBlock',    'the weapon up across him', ''),
    ('Sword_Dash_RM',       'sDash',     'a dash in with a cut', ''),
    ('Sword_Regular_B',     'sCutB',     'a quick cut', ''),
    ('Sword_Regular_C_RM',  'sCutC',     'a stepping cut', ''),
    ('Sword_Regular_Combo', 'sCombo',    'a string of cuts', ''),
    # (2026-11-26, `~/Downloads/exported-model-4.glb`, the owner: "use the walk animation from here too … try this run with his old one
    # too sometimes" — on Mesh2Motion's UNREAL skeleton: `glb_split.py --ue` names it Mixamo's first; NTAR_ONLY=sStalk)
    ('Run_Stealth',         'sStalk',    'a low, stalking run', ''),
]
if SET == 'scourge':
    CLIPS = SCOURGE_CLIPS
    KEEP_YAW = {c[1] for c in SCOURGE_CLIPS}          # (a swing's wind and return, a dodge's own turn: every one his own; the game turns him)
    FORCE_FLAT_YAW = set()
    WINDOW = {}
    CONTACT = {}
    PEAKS = ('LeftHand', 'RightHand', 'LeftToeBase', 'RightToeBase')
    for _c in ('sAtk', 'sDash', 'sCutB', 'sCutC', 'sCombo'):
        CONTACT[_c] = PEAKS
    HIP_ZERO_END = {'getUp', 'sRise'}               # (up off the floor: his stance is at the END of it)

if 'HIP_FROM_TAKE' not in globals(): HIP_FROM_TAKE = set()
if 'TAKE_FROM_ACTION' not in globals(): TAKE_FROM_ACTION = False
if 'RAMP_YAW' not in globals(): RAMP_YAW = set()
# A clip whose hips are measured from its LAST frame, not its first: it
# begins on the floor and ends standing, so the stance is at the END.
if 'HIP_ZERO_END' not in globals(): HIP_ZERO_END = {'getUp'}


def log(*a):
    print('[ntar-moves]', *a); sys.stdout.flush()


# ---- AND A GLB OF BARE JOINTS (2026-11-25, the owner's "Sword_Attack" from Mesh2Motion, exported Mixamo-named, "Skeleton +
# Animations"): no skin, so Blender's glTF importer makes every joint an EMPTY, not a bone, and the rest of this file wants an
# armature. One is built here: a bone per joint with its REST matrix the joint's own rest (the node's TRS as the file stores it, put
# through the importer's Y-up -> Z-up), named `mixamorig:<Joint>`, each pose bone held on its empty by a Copy Transforms. D is the
# rotation a joint has undergone since rest in whatever frame it carries, so a bone that IS the joint's frame gives the same D.
GLB_ROLL = {'Right': -72.0, 'Left': 77.0}   # (degrees about the bind hand's line: see the hands in `main`)


def import_glb_as_armature(path):
    import struct
    d = open(path, 'rb').read()
    J = json.loads(d[20:20 + struct.unpack('<I', d[12:16])[0]])
    bpy.context.scene.render.fps = FPS          # (keys land on this file's frames)
    bpy.ops.import_scene.gltf(filepath=path)
    emp = {o.name: o for o in bpy.data.objects if o.type == 'EMPTY'}
    acts = {n: (o.animation_data.action if o.animation_data else None) for n, o in emp.items()}
    for o in emp.values():
        if o.animation_data: o.animation_data.action = None
        o.rotation_mode = 'QUATERNION'
    for nd in J['nodes']:                        # the rest: the node's own TRS, Y-up -> Z-up as the importer does it
        o = emp.get(nd.get('name'))
        if not o: continue
        t = nd.get('translation', [0, 0, 0]); r = nd.get('rotation', [0, 0, 0, 1]); sc = nd.get('scale', [1, 1, 1])
        o.location = (t[0], -t[2], t[1]); o.rotation_quaternion = (r[3], r[0], -r[2], r[1]); o.scale = (sc[0], sc[2], sc[1])
    bpy.context.view_layer.update()
    joints = [n for n in emp if n.startswith('mixamorig')]
    restM = {n: emp[n].matrix_world.copy() for n in joints}
    ad = bpy.data.armatures.new('glbRig'); arm = bpy.data.objects.new('glbRig', ad)
    bpy.context.scene.collection.objects.link(arm); bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for n in joints:
        eb = ad.edit_bones.new('mixamorig:' + n[len('mixamorig'):])
        M = restM[n].normalized(); eb.head = M.to_translation(); eb.tail = eb.head + Vector((0, 0.05, 0)); eb.matrix = M
    for n in joints:
        p = emp[n].parent
        if p is not None and p.name in restM: ad.edit_bones['mixamorig:' + n[len('mixamorig'):]].parent = ad.edit_bones['mixamorig:' + p.name[len('mixamorig'):]]
    bpy.ops.object.mode_set(mode='OBJECT')
    for n, a in acts.items():
        if a is not None: emp[n].animation_data.action = a
    for n in joints:
        c = arm.pose.bones['mixamorig:' + n[len('mixamorig'):]].constraints.new('COPY_TRANSFORMS'); c.target = emp[n]
    fr = [a.frame_range for a in acts.values() if a is not None]
    sc = bpy.context.scene; sc.frame_start = int(round(min(f[0] for f in fr))); sc.frame_end = int(round(max(f[1] for f in fr)))
    return arm


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
            import gzip as _gz
            _raw = open(OUT, 'rb').read()
            prev = json.loads((_gz.decompress(_raw) if _raw[:2] == b'\x1f\x8b' else _raw).decode('utf-8'))   # (stored gzipped: `tools/gz_assets.py`)
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
        if not os.path.exists(path) and os.path.exists(path[:-4] + '.glb'): path = path[:-4] + '.glb'   # (a Mesh2Motion export: `import_glb_as_armature`)
        if ONLY and name not in ONLY:
            continue
        if not os.path.exists(path):
            if name in out['clips']:
                log('KEEPING', name, '- its source is gone from', os.path.dirname(path) or SRC)
            else:
                log('MISSING', name, '-', path)
                missing.append(name)
            continue
        built.append(name)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        if path.endswith('.glb'): import_glb_as_armature(path)
        else: bpy.ops.import_scene.fbx(filepath=path)
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
        # ---- A GLB'S "REST" IS NOT MIXAMO'S BIND (2026-11-25, the Mesh2Motion "Sword_Attack"). The game lines a rig up ONCE, on one clip's
        # rest (`any` in `retargetMoves`: Mixamo's bind — the same in every FBX of a pack), and every clip's D is applied on top of THAT.
        # A Mesh2Motion export carries no bind; its nodes rest in a fighting stance, so a D measured from it put every bone off by the
        # stance (the left arm stood straight up through the whole cut). D is re-measured from the bind: each bone turned from where it
        # points in the stance to where it points in the bind (`mc1`'s rest, already in this file), the pelvis by its whole frame (up the
        # spine and across the hips); the rest written is the bind's own. And the hips rise and fall about his STANDING height (the legs'
        # length), not the stance's crouch, or the crouch is his stance and his feet go through the floor in the lunge.
        glbS = None
        REF = out['clips'].get('mc1')
        if REF is None and path.endswith('.glb'):
            try:
                import gzip as _gz
                _wr = open(os.path.join(os.path.dirname(OUT), 'wong-moves.json'), 'rb').read()
                REF = json.loads((_gz.decompress(_wr) if _wr[:2] == b'\x1f\x8b' else _wr).decode('utf-8'))['clips']['mc1']
            except Exception as e:
                log('   GLB: no Mixamo bind to measure from (wong-moves.json mc1):', e)
        if path.endswith('.glb') and REF is not None:
            KID = {'Hips': 'Spine', 'Spine': 'Spine1', 'Spine1': 'Spine2', 'Spine2': 'Neck', 'Neck': 'Head',
                   'LeftShoulder': 'LeftArm', 'LeftArm': 'LeftForeArm', 'LeftForeArm': 'LeftHand',
                   'RightShoulder': 'RightArm', 'RightArm': 'RightForeArm', 'RightForeArm': 'RightHand',
                   'LeftUpLeg': 'LeftLeg', 'LeftLeg': 'LeftFoot', 'LeftFoot': 'LeftToeBase',
                   'RightUpLeg': 'RightLeg', 'RightLeg': 'RightFoot', 'RightFoot': 'RightToeBase'}
            PAR = {'Head': 'Neck', 'LeftHand': 'LeftForeArm', 'RightHand': 'RightForeArm', 'LeftToeBase': 'LeftFoot', 'RightToeBase': 'RightFoot'}
            RP = {k: Vector(v) for k, v in REF['restPos'].items()}
            # (the fingers and the crown, for the hands' roll and the head's own line: the armature has them though KEEP does not)
            SP = dict(restPos)
            for xb in arm.data.bones:
                nm = xb.name.replace('mixamorig:', '')
                if nm not in SP: SP[nm] = CONV @ (MW @ xb.matrix_local).to_translation()
            def fr2(al, ac):
                # a frame from a line and a second line across it: X across, Y along, Z = X x Y
                al = al.normalized(); ac = (ac - al * ac.dot(al)).normalized()
                return Matrix((ac, al, ac.cross(al))).transposed().to_quaternion()
            upR = Vector((0, 1, 0))
            FR = (RP['LeftUpLeg'] - RP['RightUpLeg']).cross(upR).normalized()          # the bind's front (it rests yawed in this file)
            shR, shS = RP['LeftArm'] - RP['RightArm'], SP['LeftArm'] - SP['RightArm']    # across the chest
            hipR, hipS = RP['LeftUpLeg'] - RP['RightUpLeg'], SP['LeftUpLeg'] - SP['RightUpLeg']
            def palmAcross(side):   # index knuckle -> little knuckle, in the stance
                return SP[side + 'HandPinky1'] - SP[side + 'HandIndex1']
            FULL = {   # bone: (along in the stance, across in the stance, along in the bind, across in the bind)
                'Hips':   (SP['Spine'] - SP['Hips'], hipS, RP['Spine'] - RP['Hips'], hipR),
                'Spine':  (SP['Spine1'] - SP['Spine'], shS, RP['Spine1'] - RP['Spine'], shR),
                'Spine1': (SP['Spine2'] - SP['Spine1'], shS, RP['Spine2'] - RP['Spine1'], shR),
                'Spine2': (SP['Neck'] - SP['Spine2'], shS, RP['Neck'] - RP['Spine2'], shR),
                'Neck':   (SP['Head'] - SP['Neck'], shS, RP['Head'] - RP['Neck'], shR),
                'Head':   (SP['Head'] - SP['Neck'], shS, RP['Head'] - RP['Neck'], shR),
                # the bind: a T, palms down, thumbs forward — so index -> little knuckle points BACK, the hand along the forearm
                # (and measured against the farmers' own fingers, `tools/swhand.js` beside the GLB's: with thumbs-forward assumed the fist
                # came out rolled +72° (right) and -77° (left) off the video's on every frame of both clips — the bind's palms are not flat:
                # the reference is turned about the hand's line by that, GLB_ROLL)
                'LeftHand':  (SP['LeftHandMiddle1'] - SP['LeftHand'], palmAcross('Left'), RP['LeftHand'] - RP['LeftForeArm'],
                              Quaternion((RP['LeftHand'] - RP['LeftForeArm']).normalized(), math.radians(GLB_ROLL['Left'])) @ -FR),
                'RightHand': (SP['RightHandMiddle1'] - SP['RightHand'], palmAcross('Right'), RP['RightHand'] - RP['RightForeArm'],
                              Quaternion((RP['RightHand'] - RP['RightForeArm']).normalized(), math.radians(GLB_ROLL['Right'])) @ -FR),
            }
            glbS = {}
            for b in bones:
                if b in FULL:
                    a1, c1, a2, c2 = FULL[b]; glbS[b] = fr2(a2, c2) @ fr2(a1, c1).inverted(); continue
                k = KID.get(b)
                if k and k in restPos and k in RP and b in RP:
                    glbS[b] = (restPos[k] - restPos[b]).normalized().rotation_difference((RP[k] - RP[b]).normalized())
            for b in bones:
                if b not in glbS: glbS[b] = glbS.get(PAR.get(b), Quaternion())
            legs = sum((restPos[c] - restPos[p]).length for p, c in (('LeftUpLeg', 'LeftLeg'), ('LeftLeg', 'LeftFoot')))
            stand = legs + min(restPos['LeftFoot'].y, restPos['RightFoot'].y) + (restPos['Hips'].y - restPos['LeftUpLeg'].y)
            log('   GLB: D re-measured from the bind (mc1); standing hips %.2f, the stance\'s %.2f' % (stand, restPos['Hips'].y))
            hy0 = stand
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
                if glbS is not None: d = d @ glbS[b].inverted()     # (from the bind, not the stance: above)
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
            if 'PEAKS' in globals():
                pk = []
                for c in cbs:
                    sp = [0.0] + [(tips[c][i] - tips[c][i - 1]).length for i in range(1, end + 1)]
                    for i in range(2, end - 1):
                        if sp[i] >= best * 0.45 and sp[i] >= max(sp[i - 2:i + 3]):
                            pk.append((i, c, sp[i], tips[c][i]))
                pk.sort()
                for i, c, v, P in pk:
                    log('     peak f%3d %-13s %.3f m/f  at (%.2f, %.2f, %.2f)' % (i, c, v, P.x, P.y, P.z))
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
            if glbS is not None:
                # (a GLB's joint axes are the file's, not Blender's bone axes: its hips' +Y is not up the spine — every Mesh2Motion clip
                # read "flat 1.00". The hips as they would stand on the bind (D · the bind's hips) — whose +Y IS up the spine.)
                hq = (undo @ (CONV @ raw[i]['Hips'])) @ rest['Hips'].inverted() @ glbS['Hips'].inverted() @ Quaternion(REF['rest']['Hips'][3:] + REF['rest']['Hips'][:3])
                v = hq @ Vector((0, 1, 0))
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
            'rest': ({b: REF['rest'][b] for b in bones if b in REF['rest']} if glbS is not None else
                     {b: [r4(rest[b].x), r4(rest[b].y), r4(rest[b].z), r4(rest[b].w)] for b in bones}),
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
    import gzip as _gz
    with open(OUT, 'wb') as f:                                   # (gzipped, as the game stores it and `bwGunzip` reads it)
        f.write(_gz.compress(json.dumps(out, separators=(',', ':')).encode('utf-8'), 9, mtime=0))
    log('built', len(built), 'of', len(CLIPS), '-', ', '.join(built))
    log('wrote %s: %d clips, %.1f KB' % (os.path.relpath(OUT), len(out['clips']), os.path.getsize(OUT) / 1024))


main()
