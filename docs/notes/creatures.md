# Creatures, fights, rigs, retargeting and ragdolls

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**A gib's ground is a LOOKUP, not a number it was born with.** Crate boards
carried `rest = crate.y`, so the dock crate's boards held deck height
wherever they flew and the ones that cleared the edge hung in the air beside
the pier. `updateGibs()` asks `dockDeckAt()` every frame and falls back to
the sand, so a board that leaves the boards falls to the beach. It also
rests on HALF ITS OWN THICKNESS and lands FLAT: a board is a thin box up to
0.36 long tumbling on three axes, and resting its centre on the ground
buried a corner every time, which is the plank sunk into the beach.

**Object models.** `models/` holds standalone factories (`makeHorseshoeCrab()`,
`makeSyringe()`, `makeBloodJar()`) plus `viewer.html` (`?model=…`), a
drag-to-rotate dev viewer. Factories `import * as THREE from 'three'`, return a
`Group`, use metres, `+Y` up / `+Z` forward. **Smooth-shaded**, a deliberate
exception to the flat-shaded retro look because they're hero props seen up
close. The syringe and jar carry `userData.setFill(t)` + `userData.parts`.

**Breakable glass is `shatterGlass(prop, mesh, speed, radius)`,** hung off a
`PhysProp`'s `onImpact`. It kills the body, drops the prop out of the scene
AND out of `interactables` (leave it in and you hover "Pick up glass float"
over a cloud of shards), and throws shards as real `gibs` so they bounce and
settle like everything else. The bottle predates it and still has its own
inline version because it also has to leave the note behind.

**AND A DEAD TAIL FALLS BY BEING SWUNG, NOT BY BEING UNWOUND.** The die clip
took the resting arc out with a NEGATIVE curl and tip, and measured in the
game the tip finished a metre HIGHER than it stands in the idle (604.71 alive,
605.82 dead) — so the corpse held the creature's whole signature silhouette up
in the air for the rest of the game. It is the slam's own lesson a third time:
a distributed rotation CURLS a tail in place and only a base-driven `swing`
moves its tip. A positive swing takes the whole thing over, a yaw throws it off
the spine so it does not come to rest lying along the body. Measured after:
tip 4.71 → 1.98, head resting at 600.08 on a floor at 600. **And the collapse
was already as deep as the floor allows** — a pass that slumped it further
(lift -1.16, head 1.02) put the head half a metre THROUGH the stone.

**THE CREATURE IS A QUADRUPED WITH A SCORPION TAIL**, and what it is was
measured off the vertex weights rather than read off the hierarchy: the teeth
settle it, because `teeth top` is bone-parented to Bone.003 and `teeth bottom`
to Bone.027, so those two are the head and the jaw and everything else follows.
Head low and forward at 2.7 m, four legs on the floor, two palps that hang, and
a 22-bone tail arcing over the spine to 6.4 m. That tail is the only silhouette
in this game nothing else has, so it is the signature attack and gets the
longest tell in the fight.

**`skinnedBounds` READS `matrixWorld`, AND A GROUP ADDED THIS FRAME HAS NONE.**
The seating in `dressMutant` subtracts `u.g.position.y` because the bounds are
world space — which is right, and which is exactly wrong when the group's
matrix is still the identity, because then the bounds come back in the model's
OWN space and the correction is applied to a number that never had the group's
height in it. On the beach every creature stands at y = 0 and the two are the
same arithmetic, so it cannot show; the thing in the saucer stands six hundred
metres up and came out 547 m above its own floor. `u.g.updateMatrixWorld(true)`
before the measurement, and any creature whose group is not at y = 0 needs it.

**AND THE BEACH'S WALLS ARE NOT EVERY CREATURE'S WALLS — THE THIRD TIME.**
Five places in the chase clamped a creature to `WADE_X`..`CLIFF_BLOCK_X`, the
surf line and the foot of the cliff. The hall is three thousand metres away, so
on its first step toward the player the boss was teleported out of the room and
onto the sand (measured: x 3000 to 14.7 in one frame). This is the bunker's own
lesson wearing a third coat, after the crabs biting through forty metres of
earth and the blood drops deleted at `y <= 0.02`: A CONSTANT THAT DESCRIBES ONE
PLACE IS WRONG THE DAY THE GAME ACQUIRES ANOTHER. `mutClampX` asks the kind
which world it is in; the Dealer is deliberately untouched, because his room
sits inside the beach's x range and `clampDealer` already owns him.

**A FRESNEL RIM ON A THIN CREATURE IS NOT AN EDGE, IT IS A SHEEN.** The cold
rim is what separates two metres of dark flesh from a dark beach and it must
stay on the pack — but Fresnel is a grazing-angle term, and on a body made of
spindly limbs and a whip tail EVERY surface grazes, so it lit the whole animal
and it rendered as a white cut-out standing in a black room. The tall one found
this first and went out with no rim at all. A kind may now say `rim: null`.

**AND THE MAP WAS FOUR TIMES TOO BRIGHT, WHICH IS A NUMBER YOU CAN LOOK UP.**
Before touching a shader, the albedo's mean was measured against the three
mutants' shipped maps: 157 against 35-37. `dressMutant`'s emissive is tuned for
maps `tools/mutant_tex.py` has already brought down, so the fix belongs at
source and not in a lift — a lift raises the dark parts furthest and flattens
the folds. `tools/monster_anim.py` is two-stage now (PIL under the system
python, then Blender on itself, the way `bunker_pack.py` runs) and grades the
map to a mean of 38. It also took the asset from 5.4 MB to 2.2.

**DARKENING A MAP IS A LEVEL CHANGE AND MUST NOT BE A RANGE CHANGE.** The
monster shipped with its albedo multiplied down to the mutants' mean of 37 and
came back looking UNTEXTURED — the map demonstrably applied, the UVs a clean
0..1, and nothing on it to see. Matching the mean was the wrong target: a flat
multiply scales the CONTRAST by the same factor, and contrast is what the eye
reads as texture. Measured, the shipped map had a p5..p95 spread of 22 against
mutant-dark's 39 and mutant-red's 44. It is remapped to a target mean AND a
target spread now — a shift and a scale about the mean, not a multiply — and it
sits a little above the mutants besides, because they are lit by a quarter moon
and this one stands in a room with three lamps in it.

**A CREATURE MADE OF STICKS NEEDS ITS TOES.** Thirty-two of the monster's
seventy-six bones are digits and the first three builds never touched one, so
the leg swung, the ground arrived, and the foot met it as one rigid paddle —
which is most of what "stiff and amateur" was. They grip on the plant and open
through the swing, the ankle ROLLS over the foot instead of arriving flat, each
of the three is offset from its neighbour, and every left/right pair carries a
small fixed bias, because nothing alive is symmetric. The other half is timing:
the idle runs a breath, a weight shift and a head scan on three periods that
never line up, the tail arrives LATE to all of it, and a strike carries PAST
its contact pose and settles back through it rather than being retracted.

**THREE ASSETS, THREE DIFFERENT STARTING POINTS.** `tools/reptilian_pack.py`
(a mesh with NO skeleton at all), `tools/alienbeast_pack.py` (a rig AND ten
authored clips) and `gltfpack.py` (a rigid saucer). The monster came with a
rig and no clips; between them these four cover every case this game will
meet again.

**A RIG YOU BUILD MUST BE MEASURED, NOT PLACED.** The reptilian download is
150,718 polys, one 2048 BMP, no armature, no vertex groups and no actions — so
the skeleton is built here, and a skeleton placed by eye is one whose knees
are not at the knees, which every clip authored on it then has to fight. What
is measured, and how: the CROTCH is the first height, scanning down from the
waist, at which the x values split into two clusters with air between them;
the SHOULDER is where the body's half-width jumps away from the neck's; the
ARMS are, at each height between them, the vertices outboard of the largest
gap on that side, so their centroid IS the arm's line and the shoulder, elbow
and wrist come off it; the LEGS are the same trick below the crotch; and the
ANKLE is the height at which the leg's forward extent runs away from the
shin's, because that is a foot sticking out of a leg. Its bones are named
`Character1_*` on purpose — that is the mutant rig's own naming, which the
Verlet ragdoll, `mutSever`, `burstHead` and `bakeLimb` all read directly — so
unlike the beast and the warden it comes apart like everything else here.

**AND HEAT WEIGHTS BIND WHATEVER IS NEAR, WHICH IN AN A-POSE IS THE THIGH.**
Measured on the first build: vertices at (0.15, -0.02, 0.59) — a KNEE — came
back weighted 1.0 to `Character1_LeftHand`, so bending an elbow dragged the
thigh across the body and both arms rendered as long flat sheets hanging past
the knees. Three masks were tried and the first two look right and are not.
By straight-line distance against the bones the vertex ALREADY HAD: a vertex
owned outright by the wrong bone has nothing to be compared with, since its
one weight is by definition its own nearest, so it cut nothing. By
straight-line distance against EVERY bone: better, and still hopeless, because
where the hand touches the thigh the two bones really are equally close and no
threshold separates them. By GEODESIC distance over the mesh, which is the
right measure — a knee is four centimetres from the hand through the air and
most of a metre from it around the body — but it failed on its SEEDS, because
each bone was seeded from the vertices it was nearest to, and for the hand
that included the knee.

What settles it was already measured further up the same file: the arm scan
knows WHICH VERTICES ARE THE ARM, because that is how it found the arm. A
hand may drive hand vertices and nothing else; the two bones nearest the body
also get a collar of trunk around their own joint, which is the shoulder and
the hip actually deforming. Heat weights still ship wherever they were sane —
they blend across a joint properly, which no distance falloff does — and a
smoothing pass goes AFTER the mask and would have been actively harmful
before it, since averaging with neighbours is how the hand got onto the leg.

**A CLIP THAT WAS AUTHORED TO BE WATCHED IS NOT AN ATTACK.** The beast's
`Attack_Bite` reaches full extension at frame 24 and then HOLDS it for another
forty, which in a fight is a creature standing with its jaws in you; both its
attacks end with twenty frames of it already back at rest. Every clip is
RESAMPLED out of its source over windows worth keeping — the bite is the lunge
spliced straight to the retraction with the hold cut out — which is also what
makes them safe, because sampling `matrix_basis` per frame and keying it into
a fresh action sidesteps Blender 5's layered-action API entirely and
guarantees EVERY CLIP CARRIES EVERY CHANNEL, the thing this file has already
paid for twice.

**A DODGE LEAVES THE LINE; A STEP BACK IS STILL ON IT.** `reads` is the
Dealer's wind-up answer offered to any kind that declares it, and the
reptilians take it — three of them that all answer a charge is what stops the
hall being opened with a free heavy every time. What makes theirs a dodge
rather than a step is `dodgeClip`: the Dealer goes straight backwards, which
is right for a man with a bar who wants to stay square to you, and a creature
with a hop in its clip goes SIDEWAYS instead, out of the arc rather than away
from it — the one direction a committed swing cannot follow. Measured: 1.82 m
travelled, 1.71 of it across the line and 0.62 along it.

**"NOBODY HAS TEXTURES OR GOOD ANIMATIONS" WAS TWO REAL BUGS, AND NEITHER WAS
WHERE THE STATISTICS SAID TO LOOK.** Both creatures measured fine on paper —
the reptilian's shipped albedo reads mean 47 with a p5..p95 spread of 41
against the warden's 48 and 38, its UVs span a clean 0..1, and its map was
demonstrably bound. It still rendered as flat plastic at arm's length. What
settled it was standing a BEACH MUTANT next to it in the hall, in the same
light, at the same distance, and asking both what maps they carried:

- **the mutants have a NORMAL MAP and a ROUGHNESS MAP and the reptilian had
  neither**, because the download is one BMP and nothing else. That is the
  wreck's lesson on a creature: a seam that is only DARK is a picture of a
  seam, and a picture does not move when the light does. There is no height
  map to differentiate, so one is DERIVED from the albedo's own luminance —
  on a scanned hide the dark parts ARE the creases, so luminance is a fair
  height field, and the scales and belly plates come straight out of it. It
  must be derived from the RAW map and not the graded one: the grade is a
  level change that costs contrast on the way through (53.9 of standard
  deviation down to 16), and contrast is precisely what a height field is
  made of — differentiated after grading, the mean surface tilt came out at
  2.7 degrees, which is nothing. From the raw map it is 8.6.
- **and the grade was copied off the last creature instead of measured.**
  The monster's map arrives at a mean of 157 and has to be hauled down; this
  one arrives at 40, which is already inside the range the three beach
  mutants ship at. Running the same "bring it to the mutants' level" remap
  on it was a RANGE change made for no LEVEL gain. Measured against the maps
  that already work rather than against the last thing built: spread 41
  becomes 57, against the pale mutant's 61.

**AND `matrix_basis` DOES NOT SEE CONSTRAINTS, WHICH ON A GOOD RIG IS MOST OF
THE ANIMATION.** The beast's ten shipped clips were resampled frame by frame
off `pose.bones[i].matrix_basis` — which is a bone's local transform BEFORE
any constraint is evaluated. Counted on the source, that rig carries 82
pose-bone constraints: 36 IK, 27 FLOOR, 9 TRANSFORM, 5 TRACK_TO, 3
COPY_ROTATION and 2 ACTION. So the resample kept what the animator keyed onto
the control bones and threw away everything the IK chains and the foot
planting were doing, and a professionally animated creature came out moving
its hips and dragging four dead legs. Record `pb.matrix` off the EVALUATED
depsgraph instead — the pose in armature space with every constraint applied
— and convert it back to a basis a constraint-free rig reproduces:

    basis[b] = (L[parent]^-1 @ L[b])^-1 @ (M[parent]^-1 @ M[b])

with L the rest matrix and M the evaluated pose, both armature space; a root
bone is L[b]^-1 @ M[b]. It uses only recorded matrices, so it needs no
per-bone depsgraph update. Every clip must be SAMPLED before any constraint is
removed and every constraint REMOVED before any clip is written, or the result
is applied twice. (The exporter's own `export_force_sampling` would have got
this right on the source actions — the mistake was resampling into new actions
first, which destroyed the constrained result before the exporter ever saw
it. If a clip has to be trimmed or spliced, bake the constraints yourself.)

**AND A CREATURE MADE OF STICKS NEEDS ITS TOES — the second time.** The
reptilian's rig has a `ToeBase` on each foot and the authored clips never
drove one, so the leg swung, the ground arrived, and the foot met it as a
rigid paddle. The toe extends as the heel comes up behind and grips as the
foot is planted in front, harder at a run than a walk, with a small fixed
left/right bias because nothing alive is symmetric.

**AND `mutPlay` SAYS SO, IN A WARNING.** It has warned once per missing clip
name since it was written. Three rounds of checking `read_console_messages`
with `onlyErrors: true` never showed it, and a filter that hides warnings is a
filter that hides exactly this class of bug — a name that does not resolve is
almost never an exception, it is a silent no-op. Read the warnings.

**A STILL FROM A HAND-PLACED CAMERA IS NOT A TEST.** Every check of these
creatures until this point was `renderer.render` with the camera put where I
wanted it, and all of them passed while the creature was running through its
own sword-arm. What found it was PLAYING the thing: let the fight run, catch a
unit with `st.atk` in its strike window, and ask what clip is on the mixer.

**AND THE ARTIST'S OWN BAKE CONFIRMED BOTH GUESSES.** The 2.93 "Baked
Animations" build of this asset and its `BakedTexture-Packed.fbx` arrived
after the fact, and the useful thing about them is that they are an
INDEPENDENT ANSWER to the two things this packer had to reconstruct:

- **the constraint bake.** That file ships the same rig with 171 bones and
  ZERO pose constraints — the artist has collapsed them. Traced against the
  2.81a rig with its 82 constraints evaluated, over a run cycle: the head and
  the hip match to 0.000, and the worst bone anywhere differs by 0.033 units
  against bones that TRAVEL 4.3 to 5.0 units in the same cycle. Under one per
  cent, and the residue is a later model revision rather than an error.
  Recording `pb.matrix` off the depsgraph is right.
- **the roughness.** The 2.81a download ships GLOSS and the 2.93 one ships
  `Alien-Animal-Base-Ro.jpg`; inverting the first reproduces the second at
  mean 135.9 against 135.9, standard deviation 29.5 against 29.5, correlation
  0.9999 and a worst pixel of 2 out of 255. Gloss inverted IS the roughness.

The 2.81a zip stays the source, because the baked file carries only six of the
ten clips — no walk and no normal idle.

**AND THE METALLIC MAP IS NOT A METALNESS MAP, WHICH IS MEASURABLE.** The FBX
wires it straight into Principled's Metallic, so the artist did intend it —
but a real metalness mask is BIMODAL, near 0 for dielectric and near 1 for
metal, and this one has a 40 % plateau sitting at 0.4 with only 1.5 % above
0.9. Nothing is forty per cent metal; that is a specular or reflectivity map
from an older workflow. In a game with no environment map, honouring it would
take 40 % of the diffuse off most of the creature and give nothing back. "It
is what the source material says" is not the same as "it is what this renderer
can use" — and the way to tell them apart is a histogram.

**EVERY BLOW IN THE SHIP HAS TO PASS THROUGH YOU NOW.** The reptilians and
the beast landed hits the pack's way — a distance from their feet to yours on
the first active frame, no direction in it — so a claw raked a metre wide
still took a point and a four-metre animal "bit" you with the middle of its
back. They are `aimed` like the Dealer and the SCP, and the machinery had to
grow one thing to take them: `mutLimbs(u)` is EVERY CHAIN A CREATURE STRIKES
WITH, not two arms — the kind's `rig` may list extra `[arm, fore, hand, tip]`
quads (the beast's forepaws; a warden's forelegs and tail) and `blowLands`
sweeps all of them. A swing may say which chains it aims with (`A.limbs`,
indices into that list): the bite aims the HEAD and only the head, a tail
slam aims the tail whatever the head is doing. The beast's head chain is
`Bone006 → Bone008 → Bone011 → Bone024` (the snout, 4 m out along its own
axis — measured in the pane, because the loader strips the dots out of
`Bone.006` and a name copied off the GLB matches nothing), and `aimK` is 0.6
because a neck that long needs a third of a shoulder's correction to move its
end the same distance. **And "a hand's width wide" has to mean a hand's
width**: the Dealer's fallback — facing you, in reach, hand out in front, the
blow lands — was the whole of a bite on the beast, whose "hand" is its head
and is always out in front, so every bite inside reach landed (one measured
with the snout 1.86 m from the chest). `LAND_SLOP`: the striking end nearest
you must finish within a metre of your torso for the benefit of the doubt.
Measured after, standing still: the beast throws 19 swings in 35 s of
contact and lands 9, at 2.6–4.1 m; the reptilians land at 1.2–1.5 m on the
rake and nothing from range.

**THE RAGDOLL HAD THE BEACH'S CLIFF IN IT — THE FOURTH COPY.** "The bodies
disappear" was one line: every particle of every ragdoll was clamped to
`WADE_X - 6 .. CLIFF_BLOCK_X + 0.6` unconditionally, and the hall is at
x = 3000, so on the first step of the fall a reptilian's whole body was
snapped to x = 13.1, three thousand metres from the skeleton it drove. It is
gated on `bf === null` now — `PhysProp`'s own rule: a body that answers to
another room's floor is in another room — and a ragdoll that dies in the
drum (`rag.ring`) is held inside its wall. Measured: hips at rest 0.24 m over
the hall floor, asleep, visible.

**THE WITNESS'S ARMS HANG, AND HE GOES TO HIS KNEES WHEN YOU SEE HIM.** Two
things. The TempMotion's stance frame holds his right arm out a third of a
right angle with the elbow back and the hand turned — a man about to wave,
which is what the clip is — and the six turns that bring both arms in are on
the upper arms and forearms about the body's forward and right, measured on
the hands (right (-0.54, 0.76) → (-0.28, 0.65)). **The bone lookup must match
EXACT names**: `CC_Base_L_Upperarm` is also the start of
`CC_Base_L_UpperarmTwist01`, a helper with nothing hanging off it, and matched
by prefix the traversal ended there — six rotations applied, four hand
positions unchanged to the centimetre. And `ntarWatch`: the first time the
middle of the screen is on him inside 16 m with the player's hands free
(never through the take), he meets your eye for half a second and then his
calves fold back through a right angle (+1.52 about the body's right, measured:
feet at knee height 0.42 m behind the knees) and the model drops the length
of a calf, so the knees arrive on the sand and the feet lie flat behind; he
folds forward over it with the hands on his thighs. `ntarSt` carries it;
`__bw.ntarSpot()` fires it from the harness. The warden's rig in `MUT_KINDS`
carries the same chains but nothing spawns a warden any more.

**THE WITNESS GETS UP SLOWLY — AND HIT HIM, AND HE IS A BOSS.**
After the kneel holds (`NTAR_HOLD`) he rises over `NTAR_RISE` seconds on a
long smoothstep. (He cried while he rose for one build — drops off the eye
bones and a wet line under each eye, run along the FACE's down, not the
world's, because bowed fifty degrees a drop run along world -y finished
under his chin — and the owner asked for it off. If tears ever come back,
that is the one thing to remember about them.)

HE IS A `MUT_KINDS` ENTRY WITH NO FIGHT IN HIS FILE. `ntar` stands hidden
in the witness's shoes from the moment he is placed (`placeNtar`), because
the blade's creature test does not ask whether a creature is visible;
`kind.provoke` (`ntarProvoke`) is what `hurtMutant` calls on the first blow
to a sleeping creature that declares it — the witness is hidden, the
creature stands where he stood facing you, and it opens with the roar. The
blow that woke him is never met by his guard (`woke`). Thirty-two points, a
ten-point poise pool, `block` 0.30, `reacts`, faster than your walk, four
swings that chain three deep. His file carries ONE clip (the TempMotion
demo), so `kind.author` — `authorNtarClips` — writes idle, walk, run, a
strafe, the roar, the flinch, the guard and the four swings IN CODE, on the
stance frame: every clip is keys of (time, per-joint angle about the body's
up/right/forward), sampled at 30 fps and composed onto the stance in each
bone's parent frame, which is exactly what `updateNtar` does live. Every
bone gets a track in every clip, driven or not — a crossfade must never let
a bone fall back to the bind pose, and this rig binds in a T. The sign
conventions are the ones measured on the witness (a thigh's `right` positive
swings the foot BACK, an arm's `right` negative brings it forward, an arm's
`fwd` positive brings the right arm in). The contact pose sits at `hit` of
the clip's length, so `mutClipTime` puts the hands on the frame the damage
lands. `cutout` gives the creature the witness's own alpha treatment.
Measured, standing still at 1.3–1.9 m: 18 swings in 30 s, ten landed in the
first fifteen. **And the harness accessors only work in the ORIGINAL
`window.__bw` literal**: `Object.assign` copies a getter's value, so a setter
added in the later block sets a dead property — `abductDone` had to move.
(Test on the beach with `__bw.abductDone = true`, or his knockback shoves
you past `ABDUCT_Z` and the take fires mid-fight.)

**THE BEAST HAS FOUR SWINGS OUT OF TWO CLIPS.** `bSnap` is the bite over a
shorter clock — `mutClipTime` maps the whole clip onto the timings, so the
same clip run faster IS a different swing — and `bRush` is the run clip as a
charge: `minDist` (a swing that needs room) and a five-metre lunge through
the strike. Two traps: **a charge's `reach` is where it may be thrown from,
not how far it goes** — at 8.0 it became `maxReach`, the orbit rang you at
seven metres after every charge and one bite in nine landed; and a swing
with `minDist` is left out of `maxReach`. **The snap needs room too**: thrown
inside three metres its jaws were already level with you and the lunge
carried them past (a metre wide through the whole strike, measured). `aimK`
went to 0.9. And **count hits against the REAL maximum**: `MAX_HP` is 4 in
the harness, so a tally written as `hp < 3` never saw a one-point bite and
reported the bite as never landing for two whole samples. Measured after:
23 swings in 45 s, bites 7 of 9, slams all.

**THE RED ALIEN IS WILD NOW: HE LEAPS, AND THE CLIP CARRIES THE HEIGHT.**
`nLeap` is the SCP's pounce (`hold`, `LEAP_AIR`) with a jump in it — the
hips' own position track rises a metre and a half at the apex with the knees
tucked and both arms over the head, and comes down into a crouch with both
fists in the sand on the contact frame. The flight is the fight AI's (it
crosses four and a half metres in the last 0.55 s of the startup), the
height is the clip's, and the two agree because the clip is authored with
the take-off key at `wind - LEAP_AIR` and the landing key at `wind`, with
the clip's length equal to the swing's, so clip time IS game time through
the whole swing. Measured: hips 0.52 m in the crouch, 2.47 at the apex.
`nSpin` is a full turn of the trunk with both arms out, and it ends on
`up: 6.2832`, not on `{}` — a last key of zero would have eased him back
round the other way. Forty points, `aggr` 3.0, `press` 0.92, four-deep
chains, and the SCP's shriek for a voice (`sfxScpScream` on the provoke);
a man's voice on a thing that leaps at you read as a man. Measured: 27
swings in 35 s, 31 damage, on a player who stands still.

**THREE REPTILIANS, THREE BUILDS, AND NOT THE MUTANTS'.** `reptilianB` and
`reptilianC` are `Object.assign` copies of the base kind with their own
`h`, `hp`, speed, reach, tint and `bones`; `makeShrineFoes` deals the three
kinds out. A scaled bone scales its subtree, so an upper arm at 1.22 carries
the forearm and hand with it — which is what makes a long limb read. The
runner (long legs, small head, quick), the brute (deep chest, thick arms,
short legs, slow and hard) and the reacher (long arms, big head, short
shins) are deliberately none of the pack's three, and they stay green: the
tints are a breath either side of white. Measured in a row: arms 0.43 /
0.79 / 0.70 m, heights 1.88 / 2.32 / 2.08.

**THE BEAST STOPS AT ITS OWN BODY.** The lunge ran while `dist > 1.3`,
which is a person's width; a four-metre animal drove its origin to within
a metre and a half of yours and its front half was drawn through you. The
lunge stops at `kind.body` now, and the blow still lands because the sweep
is on the head chain out in front. Measured over forty seconds: never
nearer than 2.56 m, through every swing.

**HE STARES; HE DOES NOT LOOK ABOUT.** The standing idle turns the head,
and a thing that is meant to be staring up at your window must not. The
clip is held on its first frame (`kind.sleepStill` → `timeScale` 0 in the
sleep branch), which means the mixer stamps the pose ONCE and never again
— so `scpLookUp` captures the chest, the neck and the head the first frame
the clip is fully in, puts them back on that base at the top of every
frame, and composes on top: the neck and head back so the face is on the
glass, and a breath on the chest (fifteen a minute, a degree either way)
with the neck taking half of it back. The witness's own arrangement.
Measured: the head's direction moves 0.01 across six seconds.

**"SLOW-MO" WAS A SHORT CLIP ON A LONG CLOCK.** His attack clips are 0.42
to 0.75 s and `mutClipTime` mapped the whole wind-up onto a startup twice
as long: measured rates 0.31 to 0.55 of real time on every swing. A swing
marked `real` is played the Dealer's way — the limb drawn back to `cock`
over the first part of the startup, HELD (that is the tell you block on),
and the strike from the cock to the contact at `clipRate` in the last part,
so it still lands on the damage frame; the recovery at no less than real
speed, holding its last frame. The leap runs its jump at 0.42 so the clip's
flight matches `LEAP_AIR`. Measured: 12 swings, 22 damage, in thirty
seconds at reach.

**A RAGDOLL PARTICLE MAY NOT OUTRUN A THROWN BODY.** Twelve passes of
constraints, bend limits and full-strength self-collision can pump a joint
pinned between the floor and its neighbours, a little more each pass, and
a corpse at rest was across the beach — "ragdolls sometimes fly around".
`RAG_VMAX` (14 m/s) caps the displacement a particle carries out of a
substep, with a NaN guard; nothing here throws a body that fast. Measured:
a kill's own throw peaks near it and the body sleeps.

**SOMEBODY ELSE'S MOTION CAPTURE, ON A RIG IT WAS NOT MADE FOR.** Three
Mixamo clips — a capoeira compass kick, a side handspring, and the one
where a man is knocked onto his back — go onto the red alien, who is a
Character Creator rig with different bone names, a different rest pose and
a different bone-axis convention. `tools/ntar_moves.py` dumps, per bone per
frame,

    D = (world rotation this frame) * (world rotation at rest)^-1

the rotation the bone has UNDERGONE — and that is the whole trick, because
D is convention-free: it knows nothing about Mixamo's naming, nothing about
which way Blender lays a bone's local Y, and nothing about either file's
axis convention. `ntarRetarget` applies it to the alien's own bind pose
(`W = D * A * bind`, then down the hierarchy into local space) and the same
motion comes out on a different body. Four things it took:

- **THE MAP WAS ALREADY IN THE FILE.** `kind.rag` is written in the mutant's
  naming (`Character1_Hips`), which is Mixamo's naming with a prefix — so
  the ragdoll's own table is the retarget's table and there is no second
  list to keep in step.
- **A IS NOT T.** D is measured from MIXAMO's rest, which is an A-pose;
  this rig binds in a T, so applied raw every limb sits forty-five degrees
  off for the whole clip. Each bone is first turned by the SMALLEST
  rotation that takes where it points its own child to where Mixamo's rest
  points — the ragdoll's rule for driving one skeleton from another, and
  smallest-rotation rather than look-at for the same reason: neither rig
  runs its bone axes along its bones. The rest HEADS go in the file for it.
- **THE BIND POSE, NOT THE STANCE.** `authorNtarClips` plays the demo clip
  at t = 0 and builds everything on that frame — arms at his sides. Using
  it as the retarget's reference folds his arms-down pose into every frame
  of somebody else's motion. The bind is captured at the top of the
  function, before the mixer has ever stamped anything.
- **AND A MIXAMO CLIP IS A PERFORMANCE, NOT A MOVE.** All three are 250
  frames and none moves for more than about a hundred: the beast's `Die_1`
  again. The tail is measured and cut, and so is the HEAD — the uppercut
  spends its first second ambling into the punch, which he does not do in a
  fight. Measured off the hips and written down as `WINDOW`.

**AND THE ROOT TURN IS ROOT MOTION TOO.** The game turns a creature toward
the player every frame, so a clip that also turns the hips fights it. The
yaw is measured over the window: one that ends where it started keeps its
spin (a capoeira turn IS the move) and one that does not is de-yawed frame
by frame. The knockdown is de-yawed whatever it measures, because the reel
turns him right round and the owner wants him FACING you when it lands —
`mutKnockdown` sets the heading and the clip no longer argues with it.
Measured: he faces the player within 7 degrees.

**ONCE A FIGHT, HE GOES ON HIS BACK.** `knockClip` / `knockP` on the kind,
and it fires only on the blow that BREAKS HIS POISE — already the hardest
thing to land on him — one time in four, never on the blow that wakes him,
and never twice. Three beats on one clock (`NTAR_KNOCK`): the fall, a beat
lying there, and the get-up. While `st.down > 0` he is ahead of the roar,
the stun and the recoil in `updateMutantUnit`, and `hurtMutant` returns
early with the damage and the blood and nothing else — every branch below
it would stand him up on the frame you hit him, which is the one thing a
knockdown must not do.

**THE KICK LANDS WITH A LEG, WHICH HE DID NOT HAVE.** `nSweep`'s contact is
where the clip's own striking toe is moving FASTEST (0.696 — a sweep has no
extreme of position, the reptilian rake's lesson), and `limbs: [2]` is the
right leg, which the rig now carries as its one extra chain so the blow
sweeps the shin and the foot and never a hand. Two thirds of the clip's
travel is in the wind-up, so the lunge is too. Measured at the contact
frame over twenty samples: the toe is within 1.2 m of the chest in
nineteen, median 0.45 — and the one that looked like a miss was sampled
thirty milliseconds BEFORE contact, mid-travel. **Measure a swing on the
frame the game deals the damage, not near it.**

**AND THE HANDSPRING IS HIS DODGE.** `dodgeClip` was the reptilians'; he
takes it now, and his is a macaco — he drops onto his hands and throws
himself sideways over them. It is long for a dodge (a handspring is), so it
costs him the swing he would have had, and `dodgeRate` was added because
his clip is not the reptilians' length. The window was cut twice: the first
guess ended while he was still INVERTED, which the hips' own curve says
plainly (his spine's up reaches -0.99 at frame 52 and he is not upright
again until 80). Measured: three dodges in five seconds of a held charge.

**AND HIS MIXER MUST NOT HANG OFF A PHASE THAT IS OVER.** `updateNtar` was
called from `updateShrineFight`, which returns early on anything but phase 2 —
and by the time he is standing on the sand the phase is 3. It never ticked
once, so he stood in the bind pose, which on this rig is a T. Anything that
outlives a sequence gets updated OUTSIDE it.

**A PER-CHANNEL REMAP IS A COLOUR REMOVER, AND BOTH CREATURES HAD IT.** "Why
does everything look muted and grey — I gave you textures and they are not
being used" was exactly right, and the grade was the reason. Pulling R, G and
B each to their OWN target mean and spread, with gains near one, is the same
target for all three channels, so whatever hue the map had was normalised
away by construction — and then a `SCENE_BLUE` mix went over the top.
Measured, source to shipped:

| | source | shipped (per-channel) | shipped (luminance) |
|---|---|---|---|
| reptilian | 32, 47, 24 (green) | 44, 49, 55 — BLUE | 34, 52, 23 |
| alien animal | 85, 81, 76 (warm) | 44, 44, 44 — NEUTRAL | 49, 42, 36 |

A green reptile came out the colour of the sea and the animal came out
neutral to three significant figures. What actually needed changing was never
the colour, it was the LEVEL: these maps are authored for a studio and this
game has a quarter moon. So the remap is on LUMINANCE ALONE and every pixel
keeps its own distance from its own luminance, which passes hue and
saturation through untouched; darkening costs apparent saturation, so the
chroma is given a little back (`TEX_SAT`). Saturation 0.187 → 0.300 and
0.118 → 0.323, against 0.198 and 0.070 before. **If a grade has one target
per channel, it is a desaturator whatever it was meant to be.**

**A BODY IS AS WIDE AS THE BODY — THREE NUMBERS, NOT ONE.** "The alien animal
is way too big and the hitbox is off, he has to stand on top of you to hit
you and for you to hit him" is one cause with three symptoms, and the cause is
that every distance in this fight is measured to `u.g.position`, which on this
model is MID-BODY. At `h` 6.20 it stood twelve and a half metres long in a
room whose clear head height is 6.65 — it filled the hall rather than fighting
in it — and its head sat most of four metres ahead of the point its reach was
measured from. So:

- **`body`** — the push that stops you walking into a creature was a
  hard-coded 0.9 m, which is a PERSON. On an animal four metres across that
  let you stand with its origin less than a metre away, which is to say
  inside it. Measured: it closed to 1.66 m before, 2.60 after, which is
  exactly the radius it is now given.
- **`hitR`** — the blade's own test is a 0.85 m sphere at the origin, which
  on an eight-metre animal is a spot in the middle of its back that you had
  to walk into to hit. At 2.70 a swing connects anywhere from 2.5 m to 5 m.
- **and the REACHES are measured from the origin out to where its head
  actually is** (5.6 and 6.4, not 4.4 and 5.2), so it swings from where its
  jaws are rather than closing until its jaws are past you.

`h` is 4.30 now: still the biggest thing in the game and no longer the room.

**A DEATH CLIP THAT WAS AUTHORED TO LOOP STANDS BACK UP.** "When you kill it
have it stay in that dead animation" was a real bug and it was in the window,
not in the game: the beast's shipped `Die_1` rears at frame 6, staggers, drops
over frames 33–42, lies perfectly still from 51 to 150 — and then GETS BACK ON
ITS FEET over the last forty-eight frames, because it was made to cycle.
`mutPlay` clamps a death clip on its final frame, so the boss of the ship ended
the fight standing up with its health at zero. Measured out of the exported
GLB, the skeleton's crown goes 19.6 → 11.3 over the collapse and back to 20.7
after it; the window now ends on the collapse and three settled frames
(`[(0, 54, 1)]`), at step 1 rather than 3 so two tonnes take two and a quarter
seconds to arrive instead of three quarters of a second. **Before shipping any
source death clip, plot something's height over the whole of it.**

**AND THE DEATH'S BEATS BELONG TO THE CLIP, SO THEY BELONG TO THE KIND.**
`WARDEN_DEATH`'s 0.55 / 1.05 / 1.72 are fractions of a 56-frame fall measured
on the warden; the beast's is half again as long and its legs give at a
completely different moment, so the two-tonne impact fired at 1.05 s while the
animal was still on its feet. `kind.death` overrides all four and the default
is untouched — and `QUIET`, the beat you get to look at what you killed, is
now 4.60 against a 2.25 s clip, so the collapsed pose is held for well over two
seconds before the hall lets go.

**A PAUSED ACTION STAMPS THE POSE ONCE AND THEN STOPS STAMPING IT.** This is
the trap under "he seems stuck in an animation where he is walking", and it is
general. `PropertyMixer.apply` compares what it has just accumulated against
what it wrote last time and only touches the scene graph when the two DIFFER —
which, for an action frozen on one frame, is never after the first. So
procedural offsets written onto a bone after `mixer.update` are not overwritten
next frame, they are ADDED TO WHAT THEY LEFT: measured on the ntar, his spine
went from 8 degrees off vertical to 75 over three seconds, his head finished
26 cm above his own hips, and every "forward" measured off him was nonsense.
The fight's creatures scrub `action.time` every frame, so their values always
differ and they have never met this. The stance is CAPTURED once
(`ntarBase`) and every driven bone is put back on it at the top of the frame;
the mixer is then not needed again at all.

**AND A CHARACTER CREATOR "TempMotion" IS A DEMO, NOT AN IDLE.** Traced
through the ntar's one clip: he stands for two thirds of a second, walks a
loop 2.3 m long, waves, and comes back to his mark — nine and a half seconds,
looping for ever. So the man who has just watched a saucer come down was
ambling about behind you. The clip is not thrown away, because its FIRST FRAME
is his stance (feet 32 cm apart, spine 8 degrees off vertical, arms down); it
is paused there, which makes it a bind pose that is actually a pose — this rig
binds in a T, so simply not playing it is worse. What is alive on top is
authored: a slow shake of the head IN BURSTS (two and a half turns every
eleven seconds, then a long hold — the same motion on a metronome reads as a
metronome with a head on it), a breath, and his weight moving over his feet.

**THE REPTILIANS WERE STIFF BECAUSE THEIR HANDS AND SHOULDERS NEVER MOVED.**
Rendered as eight-frame strips out of the shipped GLB (`tools/monster_strip.py`
takes any `.glb`), the run reads as one pose being carried along: the legs
cycle and the claws, the wrists and the clavicles hold exactly the guard the
stance was authored in, for every frame of every clip. `sh`, `wrist` and
`claw` were in the pose vocabulary from the first build and nothing had ever
written one. A limb that ends in a frozen hand is a limb with a glove nailed
to it. `arm_drive()` is now the one place a stride's upper body is written —
the arm swings, the elbow folds ONLY ON THE DRIVE (a symmetric `abs(sin)`
elbow closes twice a cycle and reads as a shiver at double the leg rate), the
clavicle rides with it, the wrist trails the forearm and the claw closes as
the hand comes through — and the torso counter-rotates, the hips drop at each
contact and the head holds its line against the chest.

**AND IT CIRCLES YOU MORE THAN IT WALKS AT YOU, ON THE WALK CLIP.** `strafeL`
and `strafeR` were aliased onto `walk` for every creature in this game, so a
reptilian holding its distance strode straight ahead while it travelled
sideways — the feet went one way and the animal went another, which is the
plainest version there is of "the animations are off". It spends more of a
fight doing this than anything else (`circle: 0.55`), so it has a clip of its
own, and the PHASE is what makes it a shuffle: each foot's body-relative
offset along the travel line is `-cos(ph)/2` and it is off the ground exactly
while `sin(ph) > 0` — which is precisely the half in which that offset is
INCREASING. A foot therefore moves outward while it is in the air and inward
while it is planted, and inward-while-planted is the body sliding over it.
Lead foot reaches out and plants, trail foot is drawn in after it, nothing
crosses and nothing skates. Measured in the fight: the two side-steps are on
screen 28 % of unit-frames, against a walk cycle before.

**AND HIS FEET STOPPED SLIDING, WHICH WAS FOUR CLIPS AND ONE SIGN.** The
owner sent a walk, a second walk, a strafe and a side step. What they fix is
the oldest animation bug this file has: `strafeL` and `strafeR` were the WALK,
so a thing holding its distance strode forward while it travelled sideways —
the plainest version there is of the feet going one way and the animal going
another, and the whole of "his feet slide". He has a real sideways stride now
(0.90 m a cycle, measured) and the Mutant Walking for his walk (1.88 m).

- **A SIDE-STEP PLAYED BACKWARDS IS THE OTHER SIDE-STEP.** Mixamo gives one
  direction. `kind.strafeMirror` runs the same clip at a NEGATIVE rate for the
  other, which is the walk-backwards trick one step along and costs nothing.
- **AND THE RATE IS THE STRIDE OVER THE SPEED.** A clip that travels 1.88 m a
  cycle played at the wrong rate is a creature skating; `anim.rate` and
  `strafeK` are set from the clips' own measured travel rather than by eye.

**AND THEN HE HAD TO ACTUALLY FIGHT.** Four things, and the middle two are the
same bug this file has already written down for three other creatures.

- **HE IS NOT IN THE ROOM UNTIL YOU TAKE IT.** Standing him at the back from
  the moment you walk in makes the dojo a room with a man in it — you spend the
  approach watching him instead of looking at the place, and he gives the sword
  away, because the only thing worth guarding is the thing on the rack. He
  arrives BEHIND you the moment you lift it, which is the one direction you are
  not looking, since you are looking at the sword. The spot is the player's own
  heading (six metres back, a little to one side) walked outward to the nearest
  cell the walk grid agrees is floor, so he can never arrive inside a wall.

- **`kind.rig` IS WHAT MAKES A BLOW LAND, AND NOTHING SAYS SO WHEN IT IS
  MISSING.** `u.bones` is only built from that map; with no map `mutLimbs`
  returns an empty list and `aimBar` and `blowLands` both run and do nothing.
  That is a boss whose sword goes past you and whose damage comes from a
  distance test you cannot see — which is exactly what "the hit registration
  doesn't make sense" was. The Dealer has to run `barLen` out along his
  FOREARM because that is where a crowbar lies; this rig carries a real bone at
  the point of the blade, measured off the sword mesh in the packer, so the
  hitbox is swept down the steel itself. Measured after: the tip passes within
  0.12–0.48 m of the chest on all five swings, and he lands 43 hits a minute
  off 42 swings — the Dealer is 48 and 40.

- **AND three's LOADER SANITISES NODE NAMES.** `PropertyBinding.sanitizeNodeName`
  strips the dots a Rigify rig is full of: `DEF-shoulder.R` arrives as
  `DEF-shoulderR` and `DEF-spine.006` as `DEF-spine006`. Written the way
  Blender spells them, four of five lookups matched nothing and `u.bones` came
  back holding only `tip` — the one name with no dot in it. Read the names off
  the LOADED rig, never off the exporter.

- **HIS SWORD WAS CONSTRAINED TO HIS HAND AND THE CONSTRAINTS ARE STRIPPED.**
  `Katana` and `Wakizashi` are root bones the swords are weighted to, held in
  his fists by COPY_TRANSFORMS; every constraint has to go before a clip is
  written, or the recorded pose is applied twice. So in an AUTHORED clip
  nothing drives them at all — measured, the blade tip travelled 0.00 through
  four of five swings while his arms did the whole stroke. They are pinned per
  frame instead, and WHERE is the trap: at rest both swords are SHEATHED AT HIS
  HIP, so an offset taken from the hand's rest transform is "a hip, expressed
  relative to a hand", and carrying that through a swing throws the katana
  across the room — rendered, it left his fist on the third frame and flew. The
  held offset is taken from a frame of the SHIPPED clip, where the constraint's
  own answer is baked in. The wakizashi is the opposite case and wants the
  opposite fix: it stays sheathed, so it is pinned to the pelvis, where its
  rest offset is already right.

- **AND THE CONTACT FRAME IS WHERE THE BLADE MEETS A BODY.** The warden needed
  three different proxies — lowest, furthest forward, fastest — because no one
  of them suits every swing. There is a better question and it is the one the
  fight asks: a man stands in front of him at chest height, and the contact is
  the frame at which the POINT passes nearest him. It suits a chop, a sweep, a
  rising cut and a thrust without being told which is which. It must be
  measured in the RIG'S OWN UNITS — this model is 4.82 units to a 1.86 m man,
  so a chest written as "1.25" is a chest half a metre off the floor.

**AND THEN HE GOT REAL ANIMATION.** The owner's verdict on the authored set
was that he slid about with his hands out and never swung, and he was right:
hand-posed waypoints on a rig this complicated were never going to read. What
arrived next was eight **Mixamo FBX** clips — Great Sword Slash ×2, Sword and
Shield Slash, two Kicks, Blocking, Crouching and a Run — and unlike the Elden
Ring `.hkx`, THESE CAN BE USED, for exactly one reason: a Mixamo rig is a
standard humanoid with named bones and a rest pose, which is the only thing
that makes a retarget possible at all. They replace the idle, the walk, the
run, the block and all five swings; the taunt, the stagger and the death stay
authored, because nothing in the set is either.

What the retarget cost, in the order it bit:

- **THE DELTA MUST BE EXPRESSED IN THE DESTINATION'S FRAME.** Both
  `matrix_local` and `pb.matrix` are ARMATURE space, which is self-consistent
  per rig — and the two rigs do not share one, because the FBX importer turns
  Mixamo's Y-up armature on its side. A rotation meaning "lean forward" over
  there means "roll over" here. Rendered, he cartwheeled: upside down by the
  third frame, flat on his back by the fifth. The delta is taken to WORLD space
  on the source and brought back into armature space on the destination.

- **RIGIFY PUTS TWIST SEGMENTS IN THE MIDDLE OF EVERY LIMB.**
  `DEF-upper_arm.L.001` sits between the arm and the forearm and Mixamo has
  nothing to map to it. They are walked through as IDENTITY rather than
  skipped: miss that and the forearm hangs off a bone nobody posed.

- **AND THE PELVIS HAS TO BE DRIVEN OR HIS SCABBARDS STAY BEHIND.** Both
  scabbards and the sash are weighted to `DEF-pelvis.L`, which hangs off
  `ORG-spine` — a bone Mixamo cannot map. Left as identity it keeps its REST
  orientation while the body turns, so the swords and the sash detached from
  his hip and stood in the air behind him, which rendered as a flat panel over
  his shoulder. The pelvis bones are driven from the hips.

- **A CLIP AUTHORED TO BE WATCHED IS NOT AN ATTACK — the beast's lesson, on a
  second asset.** These arrive as complete performances: the sword-and-shield
  slash is a hundred and six frames and most of every clip is standing in an
  idle at each end. Measured before trimming, TWO OF THE FIVE had their contact
  frame at FRAME ZERO, because the pose a greatsword clip starts in is nearer
  the player than anything the swing does. The strike is found rather than
  declared — the frame at which the striking end is moving fastest — and the
  window is a wind-up before it and a follow-through after. 106 frames becomes
  25.

- **AND THE STRIKING END IS NOT THE SAME THING ON EVERY CLIP: TWO OF THESE ARE
  KICKS.** Asking "what passes nearest the chest" over every end at once picks
  the wrong one — a foot planted on the floor a metre and a half in front is
  1.25 m from a chest, which beat the actual blade on three clips out of five.
  The striking end is written down per clip, and a kick is aimed lower than a
  cut so it gets its own target height. The kicks are the best thing in the
  set: a kick is a mixup no amount of sword-reading prepares you for, and it is
  the one attack of his whose tell is in his legs.

Measured after, hands-off at fighting range: all eight clips on screen, 41
swings and 37 hits a minute. The Dealer is 48 and 40.

**AND A MEASUREMENT TAKEN OFF A DEAD MODULE IS NOISE.** Two runs of the fight
reported one swing a minute and a creature frozen in a single clip. Nothing was
frozen: the player had died between tool calls, `playerDied` had reloaded the
page, and `sam` was a stale reference into a module that no longer existed. The
same trap the SCP fight already records, one layer out — freeze rAF at the top
of any measurement AND heal every frame, not every twentieth.

**AND THEN HE CAME OUT STRETCHED, FLOATING, AND SWINGING AT NOTHING.** The
owner sent a picture: legs twice his own height and thin as wire, the body
pulled out of shape, the face smeared, and the whole man hanging off the edge
of the deck. Three separate faults, and the first one is the one that made the
other two unreadable.

- **SCALE LEAKED THROUGH THE RETARGET.** A Mixamo FBX imports with scale on the
  armature object AND on the bone matrices, and `pb.matrix.to_3x3()` carries
  it — so the deltas were not rotations, they were rotations WITH SCALE IN
  THEM, and the `want[parent]^-1 @ want[child]` chain multiplied that scale
  down every limb. It compounds: a hand is four joints from the hips, so the
  error is the fourth power of it. He floated because `skinnedBounds` then
  measured a body that was no longer a body and `dressMutant` seated it on
  that. Every matrix that crosses the retarget now goes through a quaternion
  and back (`rot3`), which is the only way to be sure. `.normalized()` is NOT
  enough — it fixes the columns and leaves shear.

- **AND THE ORG- CHAIN CARRIES HALF HIS BODY.** In Rigify `DEF-thigh.L` is
  parented to `ORG-spine`, `DEF-pelvis.L` (which carries BOTH scabbards and
  the sash) to `ORG-pelvis.L`, and eight face bones to `ORG-face`. None of
  those is a bone Mixamo has, so left unmapped they keep their REST
  orientation while the body moves: the legs hung off a hip that never turned
  and the face stayed behind the head. That is the "legs up" and the smeared
  face. Every ORG- bone takes its DEF- counterpart's source now, and the
  handful with no counterpart — the face, the breasts, the four palms — are
  named outright.

- **AND NO CLIP MAY DEFORM HIM AGAIN.** A retarget that leaks scale does not
  fail loudly, it ships. The packer now walks every clip, takes the SKINNED
  bounds at four frames of each, and says so if any clip makes him taller or
  wider than a man. All twelve read 0.92–1.12 of his own height.

**AND A LIVING CREATURE'S HEIGHT IS NEVER UPDATED — WHICH NOTHING NOTICED
UNTIL A ROOM HAD A STEP IN IT.** `makeMutant` is handed a y and that y is never
touched again for as long as the thing is alive; only the RAGDOLL asks
`bunkerFloorAt` what is under it. That is correct on a flat beach, a flat
bunker floor and a flat hall, and every room in this game was flat until the
dojo — whose yard is at -0.15 and whose boards are at +0.09. So the samurai,
who arrives OUTSIDE and walks up into the building, kept the yard's height and
stood a quarter of a metre over the deck.

Both of the owner's symptoms are that one fact. "Floating at you" is the lift
itself; "not hitting" is the same lift, because `blowLands` sweeps his limb
against your torso segment and a quarter metre puts the whole swing over your
head. He follows the floor under him now, eased rather than snapped — a step
taken in one frame reads as the body jumping.

**AND WATCHING HIM MOVE FOUND THREE THINGS NO NUMBER DID.** Every check of
this fight until now was a still or a counter — hit rate, swings a minute,
bounding boxes — and all of them said he was fine while the owner was looking
at a man standing there with his arms out and his face smeared. Stepping the
live fight and capturing a RUN of consecutive frames is what found all three.

- **87 FACE BONES PARENTED TO NOTHING THAT SHIPS.** Rigify's face DEF bones
  hang off `MCH-` controls — checked, and not ONE of their parents is a deform
  bone — so `export_def_bones` drops every parent and reparents the lot to
  whatever distant ancestor survives. Their motion then has nothing to do with
  a face, and they drive 1,448 vertices of the body, 1,601 of the helmet, 2,294
  of the helmet band and 448 of the horns: his whole head. He is wearing a
  kabuto and a menpo, so there is no face to animate — the whole face rig is
  merged into `DEF-spine.006` (6,305 weights moved) and stops deforming, which
  makes the head RIGID with the neck and means it cannot smear. 163 joints
  became 77 and the file went from 12.5 MB to 8.6.

- **AND THE ARMS-OUT WAS A SHIELD HE DOES NOT HAVE.** Measured on the exported
  rig, hands apart per clip: `Sword And Shield Slash` holds them 1.07 m apart
  on average and 1.49 at worst, because THE LEFT ARM IS CARRYING A SHIELD.
  Dropped. `Great Sword Crouching` was nearly as wide at 0.91 and it was the
  IDLE, which is the pose you look at longest, so the guard out of `Blocking`
  (0.68) takes that and the crouch becomes the brace. **Read the clip's name:
  a set that mixes weapons has clips whose off hand is holding something.**

- **AND THE SOURCE ACTIONS RODE ALONG IN THE FILE.** Removing the imported FBX
  objects leaves their ACTIONS behind and the exporter ships every action it
  can find: eight `Armature|mixamo.com|Layer0` clips were in the GLB driving
  nothing, and they measure a T-pose because they belong to a skeleton that is
  no longer there. Remove the action with the armature.

One hypothesis this cost, and it is worth writing down because it was
confidently wrong: the splayed arms looked exactly like the aim correction
wrenching his shoulder, and I had raised `aimK` to 2.60 chasing a hit rate.
Measured across `aimK` from 0 to 2.6, the mean distance between his hands
moved from 0.84 to 0.86 — the aim was not touching it at all. **Measure the
thing you are about to blame before you change it.**

**AND THEN THE KNIGHT LEARNED TO PACE HIMSELF.** Seven more of the owner's
clips: a 360 attack, four hit reactions, and a real left and right strafe
walk. What they bought, and what each one cost:

- **THE STRAFES ARE BOTH THEIR OWN CLIP NOW.** The mirror — one clip at a
  negative rate — was the right trick with one and is not needed with two:
  1.79 and 1.82 m a cycle, so sizing you up is a stride in the direction he
  is actually going.
- **AND CIRCLING WAS CANCELLED EVERY FRAME.** `side` is cleared inside 1.4 m,
  which is right (a creature that close should be swinging, not walking round
  you) and which also cancelled the one beat that exists to MAKE distance:
  measured, the strafe clips played for 0 frames in ninety seconds. It holds
  while he is giving ground. After: 7 %.
- **A BEAT THAT IS WHAT IS LEFT OVER NEVER HAPPENS.** The size-up was written
  as the `else` of "does he want to swing", and at `press` 0.94 he wants to
  swing nearly always — it fired ONCE in ninety seconds. It is its own
  decision now, taken BEFORE the swing, gated on having thrown a couple since
  the last one. After: seven times in ninety seconds, and he opens to three
  metres doing it. **If a behaviour is the leftover branch of an aggressive
  creature, it is not a behaviour.**
- **AND EVERY FLINCH HE HAS IS A STAGGER, BECAUSE THAT IS THE ONLY BLOW THAT
  ROCKS HIM.** A light hit SPENDS POISE and returns without moving him — that
  is the design, and it is what makes the pool worth emptying — so a picker
  put where ordinary hits arrive can never run. The rare two are rare WITHIN
  the poise break: measured over 65 breaks, 44 the ordinary stagger and 21 the
  back-of-the-head, which only ever plays when the blade actually came at his
  back. The stagger's recoil is 0.6 s against a base of 0.28: the longest
  opening in the fight, and the one you earned.
- **AND `bwSpan` FOUND A SECOND ONE.** `warmShrineBoss` read `SH.walkR`
  between the hall's group existing and the hall being measured, threw inside
  the warm chain, and ABORTED it — so the boss's programs were never compiled
  and the hall paid for them on the frame it was revealed. One guard.

Measured: 49 swings and 41 damage a minute, all seven attacks used, seven
size-ups, worst step 0.10 m, worst tick 4.2 ms.

**AND `maxReach` IS "COULD I HIT YOU", NOT "WHERE DO I WANT TO STAND".** A
creature carrying one long swing among six short ones counts itself in range
the moment that one could reach, stops closing, and fights the rest of the
exchange from a distance where nothing else it owns will land — measured, the
knight settled at 3.89 m on the strength of a 5.40 m jump while his punch is
2.15. `u.ring` is the use-weighted mean of everything that is not a
gap-closer, and the footwork holds him there.

**AND 1.3 WAS A PERSON'S WIDTH.** The lunge's stopping distance was
`Math.max(1.3, body + 0.15)` — a floor put in so a four-metre animal would
stop at its own body instead of driving its front half through you, and as a
CONSTANT it does the opposite job on anything smaller. Measured at the
contact frame, every swing: the knight's striking hand extends **0.89 m from
his own origin**, so a lunge that refuses to close inside 1.3 leaves his fist
more than half a metre short of your chest on every blow he throws. The
damage still landed — `LAND_SLOP` gives a metre of benefit of the doubt — so
the game said he hit you and the picture said he did not. That is the whole
of "tighten his hits so they actually visibly hit you".

Both ends are wrong, which is why it is a swept number and not a formula: at
his own body radius the blows arrive BELOW THE FRAME (the overhead finished
at ndc y -0.97, the stomp at -2.45, on screen half the time and never).
`kind.lungeStop` is the distance, and `A.stop` overrides it per swing —
because a blow from a LEG lands at thigh height, so the nearer he is the
further under the picture it arrives. Measured after: every hand blow lands
0.36–0.51 m from the chest with **98 % of contacts on screen**, against
0.5–2.4 m and a third of them off-frame.

**AND HIS MOVE SET WAS KEPT; WHAT CHANGED IS EVERYTHING BETWEEN THE MOVES.**
A Mixamo locomotion pack and a reaction reel go on top of the clips he
already had (the owner's word: add to it, do not replace it) — three walks,
two runs, two idles, three sideways strides a side, two quick side steps and
a parry reel, drawn afresh every time he sets off or comes to rest
(`kind.gaits`). Three things it took:

- **THE RATE IS THE STRIDE OVER THE SPEED, AND WITH A DOZEN GAITS IT CANNOT
  BE ONE NUMBER PER KIND.** Each clip's own ground speed is measured at build
  and written into the moves file; the game plays it at whatever rate makes it
  travel as fast as he is actually moving.
- **AND A CLIP THAT DOES NOT TRAVEL IS NOT A GAIT.** Measured: walk 1.76 m/s,
  walkC 1.48, strafeL 1.53, strafeR2 1.70 — against walkB at 0.26 and strafeR
  at 0.56, which are walked ON THE SPOT, and one of those two was the strafe
  he actually used. Played at the speed he was moving they slide a metre a
  second, which is the "his feet slide" this file has now paid for three
  times. They stay in the file and they are out of the pools that travel.
- **AND AN ALIAS OVERWRITES A CLIP OF THE SAME NAME.** `hit: 'hurt'` was
  quietly shadowing the owner's own Head Hit — the clip he sent for exactly
  that job — with the four-key rock written before it arrived. Read the alias
  map before concluding a clip is not playing.

**AND THE BUILD MERGES; IT DOES NOT REWRITE.** `tools/ntar_moves.py` reads
its FBXs out of ~/Downloads, which is the owner's own folder and is cleared
whenever he likes — so a build that insists on every source being present is
one that can only ever be run on the day the clips arrive. It loads the
existing JSON, rebuilds whatever sources are actually there, and leaves the
rest exactly as they were: adding a clip is a one-file drop and a re-run.

Measured at the end, hands-off at fighting range over three minutes: **37.7
swings and 37.7 damage a minute, 98 % of blows on screen, still between
swings 21 % (was ~100), worst step 0.10 m, worst tick 3.7 ms** — and every
one of the new clips on screen.

**A KNOCKDOWN IS TWO CLIPS, AND IT IS EARNED RATHER THAN ROLLED.** The
alien's reverses its own fall because his file has no get-up in it; the
knight has a real `Knocked Out` and a real `Getting Up`, so each runs
forwards on its own beat and the floor is the fall's last frame held — and
the hip clamp that stops the alien standing up by flying two metres into the
air is skipped for anything with a `riseClip`. The beats are the kind's
(`kind.knock`), because they belong to the clips: 1.27 s over, a third of a
second down, 1.33 s up — **2.94 s**, against the alien's three and a half,
because the owner has to be able to keep fighting.

And `knockP` is a die, which is right for a creature you meet once. The
knight's is a COUNT, and he goes over, gets up, and the tally starts again.
You cannot land it by luck and you cannot be denied it by luck. **`u.st.down`
is undefined until the first knockdown and `undefined <= 0` is FALSE**, so
the first build counted to eight and never put him down.

**AND THE FIRST FIX OF THAT MADE IT WORSE, BECAUSE OF WHERE THE TALLY
LIVED.** `hurtMutant`'s poise block RETURNS on a blow he absorbs (`if
(u.st.poise > 0) { ...; return false; }`), and the tally sat below it — so
dropping the `poiseBroke` condition changed nothing, since the line was only
ever reached on a break, and raising the count from three to five turned
twelve heavies into twenty. Measured on the real path: zero knockdowns in
every fight. A count of "blows that land" has to be taken on EVERY exit the
landing blow can leave by. Measured after, katana at a heavy every 1.5 s:
two knockdowns a fight, the first at 23 of his 38; spaced 8.5 s apart, none.

**AND THE GET-UP PUT HIM A METRE ABOVE HIS OWN HEAD.** "The fall animation
isn't working, he just flies around" was one number. `hipY` is an OFFSET from
the creature's stance taken from the clip's FIRST frame — right for every
clip that begins with him standing, and exactly wrong for a get-up, which
begins with him lying on his back. Measured in the game: `getUp` ran his hips
from the standing height to **2.44 m** — a metre above where he stands — and
snapped back the frame the clip ended. `HIP_ZERO_END` measures such a clip
from its LAST frame instead, so the rise starts on the floor (-0.84) and ends
at the stance, which is where the fall left him (-0.86). Measured after:
standing hips 1.34 and head 2.29; he goes over to hips 0.16 and **head 0.19**
on a floor at -0.07; he lies; he rises to 1.31 and 2.28. Exactly the clip.

**AND NOTHING HAD EVER SET A CREATURE'S HEIGHT DOWN THERE.** `restYInWater`
is the beach's; the knight was left at whatever y he was placed at, so the
step up to the dais went through his shins and he fought at the altar with
his boots in the stone. The floor is followed EVERY FRAME rather than inside
a movement branch — he is most often standing still, in a wind-up or a
recovery, at the moment he needs to be on the step — eased, with a floor
speed under it so a 0.6 m riser is crossed in a fifth of a second rather than
a third. Worst foot gap 0.66 m → **0.175**.

**THE KNOCKDOWN SPUN BECAUSE A FALLING BODY HAS NO HEADING.** "His fall down
animations do not look like the animations I sent — he just spins around in
the air" was one line in the packer, and the reasoning behind it was wrong in
a way that is worth keeping. `ntar_moves.py` de-yaws a clip frame by frame —
it holds the hips' own forward axis at a constant azimuth — because the game
turns a creature toward the player every frame and a clip that also turns
fights it. That is right while the creature is STANDING. The moment it goes
over, the pelvis's +Z points at the CEILING, its horizontal part collapses
(measured on `knockOut`: 1.00 to 0.30), and the azimuth read off it is the
body TIPPING rather than the body turning. Correcting a turn that never
happened applies a world-Y rotation to a horizontal body, which is a roll
about its own length: a corpse swinging round like a compass needle.

Measured as the azimuth the body's long axis sweeps over the frames it is
horizontal — which is the thing you actually watch, "which way his head is
pointing":

| | knockOut | getUp |
|---|---|---|
| the source animation | -11 deg | -27 deg |
| de-yawed on the forward axis (shipped) | **+62** | -27 |
| de-yawed on the left-right axis | -38 | -35 |
| kept (now) | -11 | -27 |

Choosing a better AXIS is the obvious fix and it is not enough — the second
row is the pelvis's left-right axis, which does stay horizontal through a
fall (worst 0.73 against the forward axis's 0.30) and still injects 38
degrees. **There is no such thing as the heading of a body that is falling
over**, so `KEEP_YAW` names the clips that leave the vertical and they keep
their own root turn exactly as drawn. The axis choice stayed anyway, because
it is measured per clip and strictly better for everything that does stay
upright.

Three things the game had to learn with it:

- **THE HEADING IS SET ONCE, AT THE BLOW.** It costs nothing, because a
  creature on the ground is not being turned toward the player by anything —
  the `down` branch returns long before `turn()`.
- **AND TWO REELS ARE TWO FILES.** Left alone the rise begins lying in a
  different direction from the one the fall ended in and he snaps round on
  the floor between them. The only thing two prone poses can be matched on is
  the direction the BODY lies in, so the packer measures it at both ends of
  every clip (`az`, with how horizontal it is, since standing up the same
  number means nothing) and `mutKnockdown` turns the rise by the difference.
  Measured: the fall ends lying at -136 deg and the rise starts at +170, so
  the rise carries +54.
- **AND HE GOES WHERE THE REEL TAKES HIM.** `knock.slide` is a hand-set
  distance along the line the blow came in on — a fair guess for a clip whose
  travel nobody has, and wrong for one whose travel is in the file. Measured,
  `knockOut` carries him 1.41 m and mostly ACROSS that line. `slide: null`
  means walk the clip's own root motion, turned by the heading that clip is
  played on. The horizontal travel is still left out of the HIPS, because a
  gait's speed belongs to the game; a knockdown is a scripted beat and the
  reel is the authority.

Measured in the game, hips and head against the floor: he stands at 1.29 /
2.26, goes over to 0.16 / 0.26, lies still for a third of a second, and
rises to 1.30 / 2.28 — and the model's yaw does not move through the fall.
Rendered as a strip it is the Mixamo clip: rocked, off his feet, flat on his
back, rolled onto a knee, up.

**THE RAGDOLL IS A VERLET BODY, NOT A FLOP.** The first version froze the
pose, spun every bone at random and tipped the group over on a timer, and it
read as a mannequin knocked off a table. What is there now is what Source
does, cut down to what a beach at night needs: the JOINTS are particles, the
BONES are distance constraints between them, and the body is simulated —
gravity, Verlet integration, seven constraint iterations over two substeps, a
ground plane with friction and a little restitution. Nothing in it knows what
an arm is. The feet are on the sand when it dies, so they catch and the body
goes over them; the blow's momentum is put in as a per-particle kick weighted
toward the top; a limb hits the ground before the trunk and bounces once; and
it settles into whatever heap those constraints and that blow make, never the
same twice, then SLEEPS when its motion dies. Two things make it read as a
body rather than beads on a string: STIFFENERS across the trunk (hips to
shoulders, shoulder to shoulder, hip to hip) so the torso is a box that
tumbles and not a rope that folds, and BEND LIMITS — a minimum distance
across every three-joint chain, which is the cheapest joint limit there is
and stops the one thing that gives a Verlet ragdoll away: a knee folding flat
the wrong way. The skeleton is then DRIVEN from the particles, parent first,
each bone turned by the SMALLEST rotation that takes where it points its
child to where the child's particle is. Smallest rotation, not look-at:
this rig's bone axes do not run along the bones (the forearm sits diagonally
off the upper arm — measured), so a look-at would twist every limb, and the
minimal turn keeps whatever roll the pose had. It is all in WORLD space, so
the scan's scale and its Z-up root matrix never enter into it, and the
group's own tilt is zeroed — the fall is the particles' now. A severed bone's
whole subtree is left out of the simulation.

**A BONE SCALED TO NOTHING TAKES ITS SUBTREE WITH IT.** A skinned mesh cannot
be cut, but collapsing the arm bone removes the arm from the shoulder down
along a seam the skinning already defines — no geometry surgery, no stretched
triangles (measured: the corpse's bounds stay body-sized). Put a chunk in the
air on the same frame with blood behind it and the eye reads a limb coming
off. A charged cut can take it at the waist. It is a CHANCE, not a rule —
about half of kills take something, because a kill that always dismembers is
a gore setting and one that sometimes does is a thing that happened.

**THE FLOATING ARMS WERE STUMPS, AND THE CUT WAS GROWING BACK.** The owner
sent a picture of two corpses lying flat with an arm each standing straight
up out of them. Two bugs. A severed limb's PARENT segment — the thigh above
a taken knee, the upper arm above a taken forearm — had no particle at its
far end, so nothing drove it and it kept whatever angle the death pose left
it at. The first cut joint in a chain is a particle now (`belowCut`: only
what hangs off it is left out), so the stump falls with the body. And the
clips carry SCALE TRACKS after all: `tools/mutant_anim.py` strips the scale
curves, but Blender's glTF exporter samples every channel on export and
wrote seventy constant-1.0 tracks back into every clip, 1330 in all. Two
consequences: the mixer stamped 1.0 over `kind.bones` every frame, so the
three builds were the same build whenever a clip played (measured: the red
head read 1.00, not 1.20), and `stopAllAction()` — which the ragdoll called
to "die from the pose it was in" — RESTORES every bound property's original
value, which put a cut bone's scale back to 1 and grew the limb back on the
frame the body fell, and snapped the whole skeleton to its bind pose besides,
so the particles were seeded from a T-pose. The scale tracks are dropped at
LOAD in `dressMutant`, and the ragdoll no longer stops the actions: the mixer
is simply never updated again, which is what "the pose it was in" needed all
along.

**THE PIECE IS THE PIECE.** A severed limb used to be a generic lump thrown
off the body: you saw something leave and nothing on the ground that was an
arm. `bakeLimb` takes the limb itself off: every triangle of the skin whose
corners are mostly weighted to the cut bone's subtree is baked, in the pose
it is in at that instant (`applyBoneTransform` then the mesh's world
matrix — the same walk `skinnedBounds` does), into a static mesh with the
creature's own material, turned so its long axis (cut joint to farthest
joint below it) lies along X, centred on its own middle, and thrown as a
gib; `updateGibs` lands gibs flat, so it comes to rest lying down. It has to
be baked BEFORE the bone collapses, or there is nothing to bake. A torso cut
bakes the whole upper body, head and arms and all, and it lies there. Pieces
live 240 s (a forearm is ~1300 triangles). Two of three corners is the seam
rule — it is ragged, as a tear is.

**THE FLANKS ARE SLOTS.** Three of them coming straight at you arrived in a
file, one behind the other, and fought from there: standing still, the three
spanned 47 degrees round you. Each has a slot — the one with the turn is
AHEAD, the others take the side of it they are already on, `MUT_SLOT_ANG`
(60 degrees) out; with no turn given out the slots hang off the pack's
centre by index. `flankDir` bends an approach toward the slot's point at
reach while there is ground to cover (`(dist - ring) / 1.2`), `flankSide`
picks which way to circle so circling spreads them, and — the part that
mattered — the ones WAITING at reach without the turn slide round to their
slot at a walk instead of standing where they arrived. 47 degrees became
79 standing; retreating they still bunch, because a thing chasing you at
your own speed cannot get beside you. Crabs run the same rule with
`CRAB_SLOT_ANG` and came out at 146 degrees, 16 m of sideways travel per
crab per ten seconds.

**THE CRAB LUNGES.** It closed through its startup at a stroll before and a
player holding S was never there when the claw came down — too easy to kill
backing up. It comes in through the whole startup at better than its walk
now, through the strike itself at a dash, the bite is tested on every active
frame rather than only the first (`st.landed`, once per swing), it dashes to
cross a gap far more often (`dt * 3.0`, out to ten metres, at 7.4), and it
circles at 3.2. Twenty seconds of holding S went from nothing to three
bites; standing still it is eight in ten seconds against a player who never
guards.

**HARDER, AND BLOODIER.** The ragdoll kick is half again what it was
(`1.3 + power * 3.0`). `sprayBlood` is the directional spray a cut throws —
most of it along the swing, from the height the blade landed — on every hit
a mutant survives, on the kill, on a severed limb and on a blow into a
corpse, with a stain under it; `bleedMutant` stays the radial burst from the
chest. And the builds are further apart: the red head is 1.48 with the skull
flaps at 1.55, the dark head 0.62 on a long neck with forearms at 1.48 and
shins at 1.36, the pale one long in the forearm and the neck. It is done on
the shared rig at load (`kind.bones`), not as three Blender exports: one
download, and now that the scale tracks are gone it actually shows.

**IT TAKES TWO.** `CRAB_HP` is 2: a light swing is a hit, not a kill, and
only a charge past `CRAB_HEAVY` (0.85) puts one down in one. That is the
whole reason to hold the button — a heavy is not a faster shovel, it is the
difference between two exchanges and none. `hurtCrab(u, dmg, P)` is the one
door: it kills at zero and otherwise breaks the attack, throws it back off
the blade and flashes it white for `CRAB_RECOIL`. The recoil squash goes on
the GROUP, not `ud.rig` — the rig is switched off the moment the model
lands, so nothing posed on it can be seen (the death squash has always had
this problem; the gibs cover it).

**THE BODY REMEMBERS EVERY CUT.** A creature that had taken six slashes
looked exactly like one that had taken none. `woundMutant` counts every blow
it survives (`st.cuts`, a blade counting double) and draws the count on the
MODEL: the per-copy materials `dressMutant` already clones (now kept on
`u.mats`) are pulled toward the colour of opened flesh — the colour
multiplies the map, so it darkens the pale sets and bloodies the red — with
a wet emissive lift, a chip of flesh comes off every other cut, and at the
kill the count feeds the dismemberment odds. Two traps: **`lerp` on a Color
works in LINEAR space**, so a pull that looks strong on paper is gentle on
screen and needs to be pushed further than you think (six cuts takes white to
b7b0b0); and **`flashMats` restores the emissive it read a moment ago**, so a
wound written after the flash was undone the frame the flash ended — if a
flash is live, the wound goes into the flash's restore value instead.

**A GIB LIES ALONG X OR IT STANDS UP WHEN IT LANDS.** `updateGibs` puts
every gib to rest with its rotation zeroed, which lays a limb flat because a
limb is baked along X — and stood every one of the coat stand's cylinders
bolt upright, because a cylinder is built along Y, and the splinters too,
because a box that is tall is tall. That was "it looks fake": a broken coat
stand whose legs, hooks and splinters all landed on their ends like candles.
Every long piece gets its geometry turned onto X before it is thrown, with
the quarter turn put back on the mesh so it leaves from the orientation it
was drawn in. Measured after: 34 pieces, 34 settled, 0 standing.

**HE GOES INTO THE SEA ONCE.** The tall one bolts, goes under and is taken
out of the scene for good — and then a checkpoint load rebuilt the world from
seed and stood him back up on his mark, so the one thing in this game that is
meant to happen to you exactly once happened again every time you died. It is
a flag on the save now (`smileGone`), and it is ALSO inferred from where the
checkpoint puts you, because the pavilion is ninety metres past him: anyone
loading that save has already walked through that stretch. Same rule as the
pack's cutscene — a trigger you have already crossed does not fire again —
and it wants the same treatment for anything else that is meant to be once a
walk. `removeSmile()` is the one door, so the two callers cannot drift.

**A SEALED ROOM HOLDS ITS DEBRIS TOO.** The ragdoll learned this once — a
body thrown across the control room went out through the concrete and settled
in the sand over its roof — and a gib is the same thing smaller: splinters off
the coat stand shot through the end wall and fell down the outside of the
building. `bunkerConfine` is the room box for anything loose, and it returns
WHICH wall was met so only that component of the bounce is turned round.

**EVERY BONE LOOKUP GOES THROUGH THE ALIAS, AND THREE OF THEM DID NOT.**
The severing, the head burst and the limb bake name the mutant's bones
literally — `Character1_LeftForeArm` — and the Dealer's rig answers to
`mixamorigLeftForeArm_NN`. The ragdoll learned this once and routes
everything through `byName`; these three never did, so on him they found
nothing, returned false, and he was the one creature in the game that could
not lose so much as a hand. `ragBone(u, name)` is the one door now. And the
RATES are lower for him than for the pack: a creature you meet three of at
once can come apart half the time and still read as a thing that happened,
but the one man in the game, killed once, cannot. Measured at the first
rates: thirteen of fourteen took something and eleven of those were the head,
which is a gore setting. At 0.28 / 0.30 it is 46 % on the finishing blow and
33 % on an ordinary heavy.

**SCP-096, IN FRONT OF THE LIGHTHOUSE — AND ALMOST NONE OF HIM IS NEW
CODE.** Sealife Fan 3's "SCP-096 Reanimated" (`assets/scp096.glb`), 6.3k
triangles, 68 joints and THIRTY-SEVEN CLIPS — the first asset in this game
that arrived with a whole fight already animated. He is a row in
`MUT_KINDS`, so the tell, the commit, the poise pool, the parry window, the
riposte, the chain, the feint, the token and the aimed blow are all his by
construction. He sits on the lane with his back to you and his face in his
hands, and NOTHING HAPPENS UNTIL YOU LOOK AT HIM (`scpLookedAt`: the middle
of the screen on him, inside thirty metres) — which is the creature's own
rule and also the best trigger this game has, because the fight starts on
something the player DID rather than on a line across the sand.

**THE FLAGS ARE INTENTIONS NOW, NOT `kind.human`.** Ten places asked "is he
a man" to mean ten different things, and the day a second boss arrived that
was not a man the word stopped meaning anything. `lit` is the bunker's
lamps, `aimed` is the correction that puts the blow on your chest, `reacts`
is breaking his own startup to answer a charge, `talks` is having a
conversation to breathe through, `poise` is the pool, `bossDeath` is the
boss's own dismemberment rates. A flag named for what it DOES can be given
to the next thing that needs it.

Six things this cost, and five of them are the same lesson this file has
already learned somewhere else:

- **ROOT MOTION, AGAIN, AND IT LOOKED LIKE A TUNING PROBLEM.** His
  `attackjump` carries THIRTEEN UNITS of forward travel on the armature root
  — twelve metres — so the leap threw his whole skeleton across the ridge,
  the aim dutifully corrected an arm that was already somewhere else, and
  the blow measured 2.31 m from your chest at every range the trial tried
  while the other three landed inside 0.3. `kind.flatten` names the roots
  and holds their sideways and forward curves — and **the hold value is the
  REST POSE, not the clip's first key**: this clip starts thirteen units
  BEHIND himself and arrives at rest, so pinning key zero parked him twelve
  metres back up the lane and measured *worse* than the bug.
- **A WINDOW CUT OUT OF A CLIP MUST KEEP EVERY CHANNEL.** `attack1` is six
  seconds of him mauling something on the floor with two real strikes inside
  it and dead time either side; cut into its two blows it is half his move
  set. three's `AnimationUtils.subclip` drops every track with no key in the
  window — 38 of 122 bones — so the swing came out wearing the walk cycle's
  shoulders. `sliceClip` RESAMPLES every track through its own interpolant
  instead, so all of them survive by construction.
- **THE WHOLE LIMB IS THE HITBOX, NOT THE LAST HAND'S BREADTH OF IT.**
  `blowLands` (was `dealerBarHit`) sampled the weapon alone — grip to tip —
  and that is wrong for exactly the swing it most needs to be right for: the
  aim puts the TIP on your chest, and when he is nearer than his own arm is
  long the tip cannot BE there, so it goes past you and what is actually in
  your body is his forearm. It sweeps shoulder → elbow → wrist → claw now.
  A kind with a `tip` bone carries its reach in the rig; one with a weapon
  carries `barLen`, and `aimTip` is the one place either question is asked,
  which is the only reason the picture and the blow cannot come apart.
- **A REACH SHORTER THAN THE ARM IS A CREATURE THAT NEVER SWINGS.** His
  numbers were written at the Dealer's — 1.75 to 2.40, a man with a 0.85 m
  crowbar — and he stood in front of the player for a whole minute and swung
  thirteen times. The fight AI holds its range at about `reach`
  (`flankDir` rings him at `reach - 0.3`), so a creature whose arms are
  LONGER than the number in the table orbits outside its own swing and
  `near` is never true. Measured, then set to what the aim actually lands:
  2.80–3.30, claw inside 0.3 m of your chest from 1.4 m out to 3.2.
- **THE GROUND IS NOT y = 0, AND `bunkerFloorAt` IS THE QUESTION.** It was
  named for the bunker because the bunker was the first place with a second
  ground; it is the general question, and blood, gibs, thrown props, puffs
  and every particle of the Verlet ragdoll all ask it. Seven metres up a
  headland the beach's own zero is wrong by seven metres — his corpse fell
  through the hill and settled on the sand under it. It answers `headlandAt`
  now, which is 0 everywhere off the ridge, so it only speaks where there is
  something to say.
- **AND THE STAND-OFF IS ABOUT WHERE HE IS, NOT WHAT KIND HE IS.**
  `if (inBunker && !u.kind.solo)` meant "everything except the one who lives
  down there", which was true while the only solo creature WAS him. This one
  is solo too and follows you anywhere: wake him, walk nine hundred metres
  back and go down the hatch, and he would have stood on the sand over the
  roof swinging through forty metres of earth — the crabs' own bug wearing a
  new creature. A body is in the fight if it is in the same PLACE as you.

**AND THEN HE STOOD THERE AND DID NOT FIGHT, AND EVERY MEASUREMENT I HAD
SAID HE DID.** The owner played it and got a boss that walked in circles.
Forty-three swings a minute, measured, three times over — and all three
measurements were worthless for the same reason: each one **force-fed him
state before it counted anything**. They set `cool`, cleared `feint`, reset
`hp`, and above all TELEPORTED HIM TO THREE METRES in front of the player
before every sample. A test that puts the creature where it wants it cannot
find the case where the creature cannot get there itself. The honest test is
hands-off: wake it the way the player does and then touch nothing but the
heal for three minutes. First run of that: **thirty-two seconds without a
swing.**

**AND A TRIGGER THAT CAN BE MISSED IS A BOSS THAT LOOKS BROKEN.** Looking at
him is what wakes him and it is the whole of what he is — but from the
outside, a creature sitting on the lane that has not noticed you is
indistinguishable from one that is not working. `SCP_HEAR` is nine metres:
that close he notices you whatever you are looking at, so the fight always
happens, and the cone is how you choose to start it early and on purpose.

**AND A CHAIN MUST NAME A SWING THE CREATURE OWNS.** `makeMutant` nulls a
chain the kind does not have — but `swingOf` falls back to the SHARED table
when a unit is holding a swing that is not in its own, and the shared entry's
chain was never nulled. `u.atk[A.chain].wind` then threw inside `animate`,
which is the whole game once a frame for as long as the state lasts. It is
the same trap `swingOf` itself was written for, one line further down.

**A GIB MAY BE A GROUP.** `updateGibs` measures half a piece's thickness off
its geometry the first time it sees it, and disposes of that geometry at the
end of its life — the equipment case goes over as one piece and a Group has
none, which threw inside the update loop, which is the whole game. Hand it
`half` up front (the guard is already `=== undefined`) and guard the dispose.

**THE CURL SIGN IS +1, AND THE COMMENT SAYING IT HAD BEEN CHECKED WAS
WRONG.** It shipped as -1 "verified by rendering the hand", and it had not
been: at the loose curl it started with, a hand bending the wrong way looks
merely limp, so nobody caught it. Tightening the fist made it obvious — the
crowbar passing through an open palm with the fingers hooked away from it. A
whole pass in between blamed the rig's MIRRORING and gave the two hands
opposite signs, which fixed the left and left the right exactly as broken as
it had always been, because the mirroring is in the world orientation and
not in the local axis convention these finger bones share. **One sign, both
hands, and the only way to know is four renders** — each hand, each sign,
clay-shaded and close enough to see the fingers. Do not reason about it from
the bone matrices; that is what produced the wrong answer twice.

**A MIRRORED RIG NEEDS TWO CURL SIGNS.** `CURL_SIGN` was one number
"verified by rendering the hand" — the RIGHT hand, the one holding the
crowbar, the only one anybody was looking at. The rig is mirrored, so the
left hand's finger bones have their local X pointing the other way down the
armature's Y (measured: LeftHandIndex1 reads (-0.06, 0.99, -0.14) against the
right's (-0.07, -0.99, 0.14)), and the sign that closed one hand bent every
finger of the other BACKWARDS over the knuckles — on every frame of every
clip, for as long as he has existed. The sign is DERIVED per bone from that
axis now, so a rig that mirrors differently cannot quietly break it again.
And the way you find this is still a render: clay shading, both hands, the
old GLB beside the new one.

**HE HOLDS HIS POST.** He is a `mutants` entry, and everything that walks
that list can nudge a man who is supposed to be standing still waiting for
you. Come back from a checkpoint and he had drifted off his mark and turned
round, so the one line of dialogue in the game was delivered by the back of
his head. `DEALER_POST` writes down where he stands and which way he faces,
and until `dealerFight` he is put back on it every frame. Do not chase which
of a dozen systems moved him: pin the thing that must not move.

**A TELL YOU CANNOT TIME IS A TELL THAT IS TOO FAST, NOT ONE THAT IS TOO
SHORT.** The held overhead hung for half a second and then landed, and the
owner could not block it. Widening the descent window in the clip changed
nothing, because the easing was `t³`: at the halfway point of the fall the
bar had moved an EIGHTH of the way and the whole stroke still happened in
the last few frames. What matters is the fall's length IN SECONDS, and
`mutClipTime` makes that arithmetic exact — the clip's [0, `hit`] maps
linearly onto the startup [0, `wind`], so a fall that occupies a tenth of
the clip lasts `0.10 / hit * wind`. It was 0.15 s against a 0.156 s parry
window. A gentler exponent, a wider window and a longer `wind` make it
0.29 s, nearly twice the window. A second and a half of bar over his head is
a long tell and it should be: it is the slowest thing he throws and the only
one that takes two of your four.

**AND THE CONTACT DETECTOR SCORES SPEED, SO GIVE A CLIP A FOLLOW-THROUGH AND
IT NAMES THE RECOVERY.** The arm coming back UP out of a held swing is
quicker than the arm going down into it, and the build started reporting a
contact frame a fifth of a second after the bar had passed you. A rising
hand is not a hit; the velocity term is discounted when the hand is going
up. The four horizontal swings never noticed — they barely change height.
`dHold`'s `hit` is measured IN THE GAME anyway, at the bottom of the bar's
arc, the way `dSide`'s was.

**AND THE TAKE WAS AIMING AT THE WRONG PLACE THE WHOLE TIME.** The mutant
cutscene sums the three pack creatures' positions and skipped the Dealer,
correctly — and then divided by the length of the WHOLE list, which has four
entries in it. The midpoint of three creatures six hundred metres down the
beach was pulled a quarter of the way back toward the world origin, and the
camera looked at open sand. Measured: the old expression aimed **173.7
degrees** off — very nearly the opposite direction — and the fixed one holds
within 0.4 for the whole take. It was always wrong; a checkpoint load is
simply the only way anybody reaches that stretch often enough to see it.
**An average is over what was actually summed.**

**AND THE HAND HAS TO CLOSE.** The grip was lifted out of the source idle —
but the build strips those clips' finger curves a few lines earlier, so what
was lifted was the BIND pose: a flat open hand with a crowbar passing
through it, on every frame of every clip. The fingers are curled joint by
joint now (`set_fingers`, knuckle 0.62 / middle 0.98 / tip 0.72) and stamped
into every action INCLUDING the four the scan shipped with, which carry no
finger curves at all; `calm` gets a looser hand because he is holding
nothing yet. The bend axis is the bone's own local X and the sign came from
rendering the hand close up, not from reasoning about the rig.

**THE DEALER'S CLIPS ARE BUILT ON THE MIXAMO IDLE, NOT ON THE BIND POSE.**
Second pass, after the owner called the first "horrible": every authored clip
used to be posed up from the rig's T with a hand-guessed stance under it, and
every one of them met the four source clips at a seam — a different arm, a
different shoulder, different hips, and a crossfade that showed all three.
The base of everything authored is now a FRAME OF THE SOURCE IDLE (`BASE`,
`HIP_BASE`, lifted once in `tools/dealer_pack.py`) and the helpers add motion
on top (`setrot` composes the delta onto the base quaternion). A clip that
starts and ends on the idle's own pose blends into it for free, the bar is
held the way Mixamo holds it in every clip, and no arm can find its way back
to the T. What went with it: **root motion is flattened** on the source
clips (the hips' sideways and forward curves held at their first value; the
game moves him, and the two fought — that was the "moving glitched out");
**seating is per frame** on the sole of the shoe mesh through the depsgraph,
lift only, because a constant lift seated the reach of the pickup and left
him standing a third of a metre off the floor for the rest of it; and every
clip is rendered as an EIGHT-FRAME STRIP before it ships, because three
stills of a swing is barely better than none. `pickup` is its own clip — he
turns to the shelf, drops his weight, closes on the bar at 0.46 (the frame
the game moves it from the console to his fist), and comes up already
turning back — and `updateDealer` drives it itself with `holdAnim` set, or
`mutAnim` fades it straight back out for the idle on the next frame.

**HE DIES ON THE RAGDOLL, WITH HIS OWN BONE NAMES.** The death clip was a
canned fall that landed him through whatever he stood against. The Verlet
ragdoll is written to `Character1_*` names and every reference goes through
`byName`, so a `boneAlias` built when he is dressed — `Character1_Hips` →
`mixamorigHips_00` — is all `mutRagdoll` needs; the floor it lands on is the
one under it (`bunkerFloorAt`, not the sand plane) and it does not ask the
sea whether it is wet. **The exporter drops the colon**: the bones arrive as
`mixamorigHips_00`, not `mixamorig:Hips_00`, and a regex that insisted on it
built an alias of zero entries and a ragdoll of zero parts — he froze
upright on the frame he died.

**AND THE FIGHT DID NOT WORK, FOR FOUR SEPARATE REASONS.** The owner called
it unplayable and every word of that was earned. In order of how much they
cost:

- **`MUT_ATTACKS` named his swings and the GLB named them something else.**
  The table calls them dDown/dSide/dHold/dLunge; the clips ship as
  attackDown/attackSide/attackHold/attackLunge. `mutPlay` looked up a key
  that was not there, returned WITHOUT TOUCHING ANYTHING, and left the walk
  cycle running — so he fought the entire fight walking: no wind-up, no bar
  coming down, nothing to read and nothing to time. `mutPlay` now warns on a
  missing clip, because a swing that does not exist should be loud.
- **Every clip must carry every channel.** Exported without baking, the four
  Mixamo clips came out with 22 rotation channels (the exporter drops
  whatever does not change) and the authored ones with 63 — so crossfading
  left forty bones holding their pose from the last clip. `export_bake_
  animation` is why the mutant never had this: 210 channels on every clip,
  no exceptions.
- **The stance heights did not agree.** Mixamo carries the hips a quarter of
  a metre below bind; the authored clips sat at bind, so every switch between
  the two families popped him up and down. The baseline is measured off the
  source idle now.
- **And then the feet went through the floor.** Lowering the hips onto that
  baseline with straighter legs than Mixamo's put the soles 12 to 28 cm
  UNDER the steel, which is what made the professionally animated swings
  look like hovering. Every authored clip is seated by a constant hips lift
  measured per clip — and measured on the SHOE MESH through the depsgraph,
  not on the foot bones: bone heads and tails over-corrected everything by
  five to twelve centimetres, because the sole hangs below the joint. Spread
  across all eleven clips went from 40 cm to 5.

**THE BLUE BLOOD DEALER IS A MUT_KINDS ENTRY.** The first boss, and almost
none of him is new code: he is a kind in the same table the pack uses, so
the tell, the commit, the poise, the parry window, the riposte, the chain,
the feint, the token and the closing dash are all his by construction. What
`kind.human` turns off is everything that is a monster — the roar, the sand
throw, the severing and the Verlet ragdoll (all of which name the mutant's
own bones anyway) — and what it turns on is a death CLIP: a boss goes down
where he stood and you walk up to what you killed. `kind.solo` keeps him out
of the three loops the dock's cutscene runs over every mutant on the beach.
He is placed at `BUNKER_Y` under the hatch and clamped to the room by the
same nav grid the player is, because the fight AI works in world space and
knows nothing about walls. Six things this cost:

- **`skinnedBounds` measures in WORLD space.** Every creature on the beach
  stands on a group at y = 0, so "stand it on its own feet" and "put its
  feet at the group's origin" are the same arithmetic and the difference had
  never shown. Forty metres down it lifted him twenty-six metres into the
  sand over the roof.
- **He stood in a T-POSE through his own dialogue.** `frozen()` returns
  before the animation runs, and `mutPlay` fades a clip in over 0.14 s — so
  a mixer frozen on the first frame holds the skeleton at eight per cent of
  one clip, which IS the bind pose, and this rig binds in a T. The first
  clip is set to full weight at load, and a human keeps his idle through a
  dialogue (only a dialogue; the menu still stops him dead).
- **A model faces where the render says it faces.** The chain from FBX
  through two importers and an exporter flips twice; reasoning about it gave
  the wrong answer twice and a half turn that put his back to the fight.
  Render the thing alone from four sides and look.
- **The rest pose is a T, not a man standing.** Authoring arm angles as if
  0 meant "at his sides" left both arms straight out in every authored clip.
  `ARM_DROP` is the rotation from the T to a hanging arm and everything is
  measured from there.
- **He faces -Y in Blender**, which the rig itself says: the foot bone runs
  ankle to TOE and its tail is at y = -111.
- **A death that only drops is a puppet with the strings cut.** The root has
  to turn as well, or he collapses straight down into a heap on the spot.

**EIGHT SWINGS, AND A BODY THAT WILL NOT KEEP STILL.** The pack has four
attacks and every clip in it was already in the game, so new attacks are
DERIVED: `tools/mutant_anim.py` mirrors each attack across the rig (every
bone's armature-space pose matrix reflected across x = 0 and given to the
opposite bone, the local basis recovered from the reflected parent, parents
first — what "paste flipped" does, headless) into `attackM..attack4M`, with
their sources' timings and contact frames in `MUT_ATTACKS`; a swing you have
learned from the right comes from the left, and a chain can cross hands.
The walk clips were never played — everything that moved ran — and each kind
ran one cycle for ever: `drawGait` picks the walk, the run and the idle (and
the idle's pace) afresh every time a creature sets off or comes to rest, its
own kind's clip favoured, and a slow advance walks now. And while it waits at
reach without the turn it FIDGETS on an irregular count — a bark (the other
rage clip at 1.7x, `flourish`) or a twitch of a side-step — none of which is
a tell; a tell is only ever the swing. The ragdoll kick went up again
(`1.8 + power * 3.6`, weighted to the top of the body and lifted), because
the owner asked twice.

**The crab is a scan with five hand-built clips, and the ATTACK one is
driven by the combat clock.** `assets/crab.glb` is artofmickey's CRAB 001,
rebuilt by `tools/crab_anim.py` (Blender headless): 32.5k tris decimated to
12k, the scan's own albedo/roughness/normal kept, and `idle` / `walk` /
`attack` / `stun` / `die` authored on its own rig. Two things about that rig
had to be fixed before a single frame could be keyed — every limb chain was
an unparented ROOT, so the body could not carry the legs, and there was a
stray bone 7449 units under the world.

The clips are chosen in `crabAnim()`, and the attack and the stun do NOT run
at their own rate: their `action.time` is written straight from
`crabState.atk` and from `CRAB_STUN - crabState.stun`. That is the whole
point. The claw going up IS the parry tell, so it cannot be allowed to drift
out of step with the frame the blow actually lands on — the clip is authored
at 30fps with contact on frame 9, which is `CRAB_WIND` exactly. Move
`CRAB_WIND` and you must move the pose beats in `tools/crab_anim.py` too.

**A CRAB GOES SIDEWAYS.** Standing still at reach shifting its weight was the
one thing this animal should never do. It scuttles ACROSS you instead and
changes its mind about which way often enough that you cannot lead it — 67 m
of lateral travel and fourteen direction changes in thirty seconds of fight,
across three of them, while they hold a metre and a half. The one holding the
turn crowds in as it circles; the others hold the range and wait.

**AND EVERYTHING THE MUTANTS TAUGHT CAME BACK TO THE CRABS.** At 2.35 a crab
was a metre a second slower than your walk, so every fight with one was
optional — you strolled away from it. `CRAB_SPEED` is 3.75, it closes through
its own wind-up at 0.6x, it rejoins at 1.35x past seven metres and it DASHES
at 6.4 to cross a gap you opened. The three of the pack take it in turns
(`crabToken`, handed out to whoever has waited longest and is in reach), they
feint, they push off each other, and a blow on a parried one counts DOUBLE.
Thirty seconds of holding S went from a stroll to ten damage with all three
inside a metre and a half. And they are not one shell in three copies any
more: each carries its own size, tint and lift — bleached and big, small dark
and wet, rusted — and the material is CLONED per unit, because `parse` hands
every copy the same one and tinting it tinted all three.

**THE CRABS ARE A LIST.** There used to be exactly one and every part of it
was a global — the group, the state, the mixer, the clip map. Three of them
come out of the water together before the dock, so all of that moved onto a
UNIT (`makeCrabUnit`) and the loner became `crabs[0]`; `crab` / `crabState`
still name that first one because the shovel, the blood counter and the
harness all reach for them. Anything that can hit *a* crab — the blade
(`digImpact`, `aimLand`), a thrown prop, the knockback — walks `crabs[]` and
picks the nearest one it actually reached, and `killCrab` / `parryCrab` /
`blockCrab` all take the unit so a parry stuns the crab that swung and
nothing else.

**The mutant (`MUT_X` / `MUT_Z`, 130 m past the pavilion).** cgtrader's
"Mutant 01", and the first asset here that ARRIVES WITH ITS ANIMATION — a
70-bone HumanIK rig and seventeen separate clip FBXs authored on it. So
`tools/mutant_anim.py` poses nothing: it joins the base mesh's four pieces
(the animation FBXs carry a copy of the mesh with NO UVs — anything textured
has to be built on `base_mesh.fbx`), keeps only the ARMATURE's action out of
each clip file (each one also brings 83 HumanIK control empties with an
action apiece), drops every finger curve — 32 of the 70 bones, and most of
the animation data, for joints that never move a pixel at this range — and
exports eight clips as glTF actions. Texture set 02 of the three: pale grey
flesh with raw red. Sets 01 and 03 are dark red-brown, which on this beach is
a hole in the dark.

**WHERE THE BLOW LANDS IS MEASURED, NOT GUESSED.** The attack clip's time is
written from the combat clock the way the crab's is — the swing you can see
IS the tell and must not drift out of step with the frame the damage is dealt
— but this clip's contact is 41 % of the way through it and the startup and
recovery it is mapped onto are not the same length, so `mutClipTime()` maps
the two halves SEPARATELY. `MUT_CLIP_HIT` comes out of the build, which plays
the clip on the rig and finds the frame where a hand is furthest forward and
moving fastest. Retune `MUT_WIND` and the hand still arrives on the damage
frame; map it linearly instead and the picture and the hit come apart.

**NO NIGHT LIFT ON THESE EITHER, AND THE OCCLUSION GOES IN THE MAP.** They
shipped at emissive 0.30 off their own map over a 0.74 gamma re-expose and
came out as three bright grey figures pasted on a dark beach — the Military
Shovel's trap: a lift applied to a whole map raises the DARK parts furthest,
so it flattens the folds and sockets that make a body read. But the answer is
not simply to remove it: at 0.085 the maps went entirely and all three were
the same black creature at fighting range, which is worse, because you cannot
tell which one is on you. The fix is in the TEXTURE, not the shader.
`tools/mutant_tex.py` multiplies each set's ambient occlusion into its albedo
— there is one directional light here and it is behind you, so nothing in a
crease is ever shaded by the renderer and the depth has to be baked — and
brings the whole map down at source. The shader then does almost nothing:
emissive 0.20 off the map, gamma 1.0, and the COLD RIM, which is the one
thing that must stay. It is the edge that separates two metres of dark flesh
from a dark beach; without it they do not lurk, they vanish. 4K sources
resized once beat the pack's own 2K maps resized again.

**AND THEY ARE NOT BUILT ALIKE.** One mesh, one skeleton, three sets of
proportions: `kind.bones` scales named bones on each parsed copy BEFORE
`skinnedBounds` measures it, so a bigger head or a longer forearm changes the
silhouette and the creature is still stood on its feet at the right height.
`PETALS` is the twelve flaps of the split-open skull — the fastest way to
make one head not another. This works ONLY because the build strips the scale
channels: the FBX bake keys a scale of 1.0 on all seventy bones of every
clip, 1920 curves carrying nothing, and the mixer was stamping them straight
back over anything set here. The tool prints the worst deviation from 1.0
(0.0000) so that stays honest.

**THE ONE AT THE BACK THROWS SAND.** Three creatures that can only hurt you
inside two and a half metres are three creatures you walk away from. It costs
WIND, not health — a ranged attack that can kill you turns the fight into a
race — and it takes exactly what backing off to breathe is for. It LEADS the
throw and misses if you move, which is the whole fairness of it: a reason to
stop retreating, not a punishment for having. It fires when everyone is far
OR when this one is the straggler (`dist > 13`), so nobody out there is idle,
and it does not need the turn, so somebody can be swinging at you while
somebody else throws.

**The tall one (`SMILE_X` / `SMILE_Z`, past the snorkeler).** Vertex
Mercher's "The smile (Rigged)" — a 165k-triangle rig with no clips — built
by `tools/smile_anim.py` into `assets/smile.glb`: decimated to 24k with its
own maps, and `idle` (a tall thing standing very still) and `run` (a flat
sprint) authored on its 21 bones with the crab pipeline's helpers. It
stands on the dry sand between you and the moon, a black silhouette with a
pale grin (`color` × 0.10 and NO rim on the body — a Fresnel rim was tried
and read as a white sheen over the whole figure; the face keeps its map,
is lifted, and carries enough emissive to show in the dark), turning slowly
to keep its face on you; inside `SMILE_SEE` (9 m — close enough to see the face) it bolts for
the sea at `SMILE_RUN`, wheels to -X, and goes under like a dive the moment
it is past the wading line; it is REMOVED — `scene.remove()` and out of
`farProps` — the frame the top of it is under the drawn sea WHERE IT IS
(`waterSurfaceAt`), not at a distance: the swell out there drops two
metres and the first build left its head standing out of a trough for
seconds. And it has to be removed, not hidden: `visible = false` was undone
the next frame by `updateFarProps()`, which switches every `farProps` entry
on or off by distance, so it stood back up at its last spot with its head at
the surface for the rest of the game. Anything in `farProps` that is meant
to go away for good must leave the list. **THREE THROATS, NOT ONE TRANSPOSED.** `mutTone()` picks an instrument off
`V.throat`: `bellow` is a sawtooth stack with a slow swell and a sub under it
(a thing too big to hurry, and it arrives before it does), `chitter` is a fast
square tremolo through a high formant (teeth, not lungs), `wet` is the
original rasp. Every voiced sound goes through it, so a tell, a laugh and a
hunger call from one creature are recognisably the same creature. It LAUGHS —
five or six bursts on a falling contour — when it lands a blow on you, and
when one of them dies THE OTHERS LAUGH, which is the cheapest thing in the
whole fight and the one that most makes them a pack. And it breathes:
`sfxMutHunger` every few seconds inside sixteen metres, quiet enough never to
become the noise the fight is made of.

**It comes at you HEAD ON.** The model's front is -Z (Blender +Y), so
`crab.rotation.y = atan2(dx, dz) + PI` faces it at you; the old `+ PI/2`
walked it sideways, which is what crabs do and what nobody can read a
claw swing from. The walk is a forward gait (legs striding about Z in an
alternating tripod), the lunge is along +Y, and the lead claw goes from
cocked HIGH over the body to slammed down and forward — a small horizontal
component only, so the arc comes AT the camera rather than across it.

**Before this, the entire telegraph was INVISIBLE.** The loader sets
`crab.userData.rig.visible = false` once the model lands, but every line of
the attack — the rear-up, the twist, the claw sweep, the gaping pincer, the
squash — was applied to that now-hidden procedural rig, and the only thing
actually on screen was one 0.48 s walk loop at a scaled rate. There was
nothing to read and so nothing to time a parry against. The procedural pose
code is still there and still runs, because it is the fallback for when the
.glb does not load; it just is not what you are looking at any more.

**The crab's swing is an ARC now.** It used to rise and lunge straight down
the line at you, which from the front is a shape barely changing size —
nothing to read, nothing to time against. The body cocks away first
(`atkTwist`), one claw draws back across itself (`atkSweep`), and then
everything comes through together and overshoots. Anticipation opposite the
action is the only thing that makes a strike legible early enough to answer,
which a parry window requires.

**The crab's attack is telegraphed — startup / active / recovery.** It used to
land the same frame the crab came into reach, with the lunge pose playing
*after* the damage: nothing to read and nothing to do about it.
`CRAB_WIND` (18f) rears it up with the claws thrown wide and the pincers
gaping, `CRAB_STRIKE` (6f) puts the damage on the first active frame, and
`CRAB_RECOVER` (20f) leaves it wide open. Two details carry it:

- **Reach is re-tested on the active frame**, not when the wind-up began. A
  tell is only fair if getting out of the way is a thing that works — and it
  does; back off during the startup and the snap closes on nothing.
- **It winds DOWN as well as up.** `atkSquash` compresses the body onto its
  legs through the startup and stretches it through the strike. A wind-up that
  moves the same way as the strike reads as no wind-up at all.

`sfxCrabTell()` is a rising rasp over exactly `CRAB_WIND` seconds, so the
sound is the countdown. Keep it unlike `sfxCrabSnip()` — confusing the tell
with the strike is worse than having neither.

**Anything that refreshes `hitstop` must fire ONCE.** `hitConnect()` sets
`hitstop = max(hitstop, 0.03)`, and under hitstop the world runs at 8 %, so
a test that stays true while the world is frozen re-freezes it every frame
for as long as it stays true. The thrown-prop kill did exactly that: the
body sat inside the crab's 0.75 m at 8 % speed for hundreds of frames, each
one calling hitConnect() and building a fresh sfxConnect graph — four
seconds of stall and a few hundred sounds, which is what "throwing at the
crab lags" was. It is gated on `crabState.struck` now, like killCrab().

**The kill is two beats.** `killCrab()` no longer bursts it. It sets
`crabState.struck`, plays `sfxCrabHit()` and starts `CRAB_HIT_STOP` (5 frames)
of frozen time; for exactly those frames the crab is still there, folded up
under the blade in a hard squash and thrown back along the swing, and then
`finishCrab()` brings the gibs. The hold ends on `hitstop` reaching zero and
not on a timer of its own — `hitstop` scales `dt`, so anything measured in
`dt` would stretch to ten times its length. The freeze and the squash are
meant to be the same beat.

**THE KNIGHT'S LIMBS WERE STIFF BECAUSE SIXTEEN OF HIS BONES WERE NEVER
DRIVEN.** An Unreal mannequin runs two TWIST joints down the middle of
every limb — `lowerarm_twist_01_r` and its fifteen relatives — and the skin
along a forearm is weighted to THEM, not to the forearm bone. The retarget
maps what `kind.rag` names, which is the ragdoll's twenty-two joints, so
every twist bone fell through to the fallback and inherited its parent.
What that draws is the candy-wrapper: the whole roll of a joint absorbed by
one ring of vertices at the joint itself with the length of the limb dead.
Measured on his own clips, the roll taken in a single step: **65 degrees at
the wrist on the swipe, 46 at the elbow on the spin, 28 at the ankle**. A
twist bone at fraction f along its limb now takes f of the DISTAL joint's
roll about that limb's own axis (a swing-twist split: project the
quaternion's vector onto the axis and renormalise, so the joint's SWING is
left where it belongs), and the fractions are measured off the rig rather
than assumed — they are clean thirds here, and `01` is the far end on a
forearm and the near end on an upper arm, which is exactly the sort of
thing not to hard-code. Nothing is taken away from the joint, so the pose
is untouched and only the ramp between changes. Every clip's worst step
roughly halves and none is worse; it costs nothing and it is general, so
the red alien's Character Creator twists get it too.

**AND HE WAS NOT HOLDING THE SWORD, WHICH IS ALSO WHY HIS HEAD LOOKED OFF.**
The owner's two reports — "his head is literally off of him" and, watching the
same figure, "hes not even holding the sword XDXD" — are one bug. Rendered
frame by frame, the head is ON: measured in the shipped GLB the helmet spans
y 1.25–1.59 against a chestplate topping out at 1.30 and a neck guard between
them, and over every clip the head bone never drifts more than a centimetre
from the chest. What was actually wrong is that the KATANA hung in the air
beside him with both hands empty, and a figure whose parts do not move
together reads as a figure coming apart.

- **`stick()` CANNOT SEE THE POSE IT IS PINNING TO.** The packer pins the
  sword by reading `pbs[hand].matrix` live and writing the katana onto it —
  and a live read is only the pose you just wrote if nothing has re-evaluated
  the armature since. That holds while a clip is being AUTHORED and is false
  inside `retarget()`, whose every frame begins `sc.frame_set(f)` to advance
  the SOURCE clip, which re-runs the animation system on the destination rig
  too, against the half-written action being keyed. Measured on the shipped
  file: the authored clips held the hilt 0.05 m from his fist on every frame
  and the seven retargeted ones held it 0.14 to 1.22 m away. `pin_all()` is a
  pass of its own — record the host's matrix over a FINISHED clip, then
  rebuild the action writing the sword onto what was recorded. Two passes,
  nothing live, which is the shape `trim` already had. It has to run after the
  trims and BEFORE the contact measurement, which tracks `DEF-katana_tip` — a
  bone parented to `Katana` — and was therefore measuring the flight of a
  sword nobody was holding.
- **AND A ROOT BONE DOES NOT FOLLOW A SHOULDER, SO THE GAME RE-HANGS IT.**
  `aimBar` turns his shoulder by up to `AIM_MAX * 2.60` to put the blow on
  your chest; the katana is a root bone, so measured over six hundred live
  frames the hilt still wandered 0.10 to 0.44 m off his hand — the sword slid
  through his grip on exactly the swings you are meant to be reading. Worse,
  `kind.rig.tip` is a CHILD of that root bone, so the correction was steering
  a hitbox it could not move and the blade it swept was not the blade on
  screen. `pinSamuraiSword()` takes the offset once while he is not swinging
  and puts the bone back on it after `updateMutant` — the room clamp's own
  rule, that whatever moves a thing last is what everything hung off it must
  follow. Measured after: hilt 0.199 and tip 0.62 from the hand, CONSTANT
  across every clip, and the fight unchanged at 47 swings and 51 damage a
  minute.

**"IF YOU STAND STILL HE JUST SITS AND TWEAKS OUT" WAS A RETARGET THAT CARRIES
NO HEIGHT.** The retarget writes ROTATIONS and nothing else, so whatever the
source clip did VERTICALLY is simply lost — and half of this set does something
vertical. `Great Sword Blocking` and `Great Sword Crouching` both SINK: the
body drops into a stance. With the hips pinned the legs have nowhere to put
that, so they fold up underneath and THE FEET COME OFF THE FLOOR. Measured on
the shipped file, over the idle's twelve frames the toes ramp 0.03 → 0.33 and
0.00 → 0.25 and never come back, and over the block's sixteen they ramp to 0.70
and 0.59 — monotonically, a ramp and not a cycle, with the hips reading 0.90 on
every frame of every clip. Looped at half a second that is a man hoisting both
knees and snapping back, for ever. Two things fix it and they are separate:

- **SEAT THE CLIP.** The lowest point of the sandals is measured per frame
  through the depsgraph — on the MESH, never the foot bones, because the sole
  hangs below the joint (the Dealer paid for that one) — and the root bone is
  moved so it rests on the floor it rested on at rest. A crouch then reads as
  the body going down, which is what a crouch is. Measured after: the planted
  toe holds 0.00–0.01 through the whole idle and the hips sink 0.83 → 0.61.
  **A GAIT IS THE EXCEPTION**: a run has a flight phase where both feet are
  legitimately off the ground, so seating it per frame would pin a running man
  to the floor. Those take ONE offset, the clip's own minimum.
- **AND AN IDLE IS A POSE HELD, NOT A CLIP PLAYED.** Seating fixes the feet; it
  cannot fix the fact that the source is a ONE-WAY RAMP — he drops into a guard
  over half a second and the clip ends, so looped he sinks and pops back twice a
  second whatever his feet are doing. The pose you look at longest has to be
  still. `breathe()` takes the FIRST part of the clip — up to where the hips
  have only just begun to settle, found by asking the hips rather than by
  picking a number — and plays it out and back over three seconds on a
  smoothstep. Measured live, five frames across a second: identical.

**AND THE DEATH WENT BACK ON THE RAGDOLL.** `deathClip` sent him down an
authored `die`, and the owner's word for it was that his body and textures
deform — rendered, that is exactly right: from a third of the way in he folds
into a knot, limbs through the torso, and holds it. Every hand-authored pose on
this rig has read badly and that was the last of them. The Verlet body cannot
deform, because it drives each bone by the SMALLEST rotation that takes where
it points its child to where the child's particle is — there is no pose to get
wrong, and bend limits and self-collision hold the rest. `bossDeath` was left
off because the ragdoll answers to `Character1_*` and this rig is Rigify, so it
built a body of ZERO parts — but that was the wrong half of the fix: **the
ragdoll takes a NAME MAP, and `kind.rag` is it**, which the thing on the
headland has used on joints called `Bone_011_037` ever since. Measured after:
22 parts, landed, asleep, the body lying between 12 and 34 cm off the floor.

**A BONE IN EULER MODE IGNORES EVERY QUATERNION YOU WRITE TO IT, AND TWO OF
THEM WERE HIS COLLARBONES.** "The animation I am seeing looks nothing like the
ones I gave you" was one line in `tools/samurai_pack.py`. Nothing in that file
speaks Euler - `rest`, `setrot`, `put`, the retarget, the trims, the seating
and the pin all write `rotation_quaternion` and `key` keyframes that channel -
but a Rigify rig does NOT bind every bone to quaternions: this one ships 82 in
Euler, and `ORG-shoulder.L/R` are two of them. Both `DEF-upper_arm` and
`DEF-shoulder` hang off a clavicle, so the retarget worked out each arm's local
basis RELATIVE TO a collarbone it believed it had rotated, wrote that rotation
into a property the evaluator does not read, and the collarbone stayed at rest.
Every arm in every retargeted clip was off by whatever its own clavicle was
meant to be doing, and a greatsword swing rolls the clavicles hard.

**AND THE MEASUREMENT THAT FOUND IT IS THE ONE THAT SHOULD HAVE BEEN TAKEN
FIRST: THE SHIPPED CLIP AGAINST ITS OWN SOURCE.** Hands apart, as a fraction of
the rig's OWN arm reach - the one normaliser that cannot be thrown off by two
figures having different proportions, and here the two reaches measure 0.562
and 0.563, so the comparison is direct:

| | Mixamo source | shipped before | shipped after |
|---|---|---|---|
| Blocking -> idle | 0.12 / 0.28 | 0.79 / 0.88 | 0.32 / 0.39 |
| Crouching -> block | 0.19 / 0.22 | 1.50 / 2.03 | 0.24 / 0.32 |
| Slash -> sDown | 0.28 / 0.37 | 0.97 / 1.45 | 0.35 / 0.48 |
| Slash-2 -> sSide | 0.27 / 0.33 | 1.36 / 2.08 | 0.39 / 0.49 |
| Kick -> sSpin | 0.27 / 0.29 | 0.96 / 1.51 | 0.42 / 0.49 |
| Kick-2 -> sStab | 0.27 / 0.29 | 1.37 / 1.82 | 0.42 / 0.52 |
| Sword And Shield (dropped) | 1.28 / 2.39 | - | - |

Two of what shipped were WIDER THAN THE SHIELD CLIP that had been thrown out
for being too wide. The round that dropped it measured the shipped clips
against each other and never against the files they were made from; measuring a
build against the last build only tells you it changed. `sSwing` - the artist's
own clip, resampled and never retargeted - reads 0.15 throughout, and that is
the control that says the rig and the export are fine.

The hunt is worth writing down because three plausible causes were eliminated
by measurement and all three were wrong. **A IS NOT T** is the retarget lesson
this file already carries, and it does not apply here: measured, both rigs bind
in a T within two degrees at the shoulder. **THE ORG CHAIN IS DRIVEN AND NOT
KEYED** is real and was fixed (`KEYED` is now every deform bone AND every
ancestor of one, because `DEF-upper_arm.L` hangs off `ORG-shoulder.L` and none
of the 159 ORG bones is a deform bone) and it changed the hands by nothing.
What settled it was reproducing the retarget maths OUTSIDE the packer, where it
came back correct - 0.32-0.51 against the sources' 0.22-0.37 - and the only
difference between the two was one line in the probe:
`pb.rotation_mode = 'QUATERNION'`. **WHEN A FAITHFUL REIMPLEMENTATION OF A
THING GIVES A DIFFERENT ANSWER, THE DIFFERENCE BETWEEN THE TWO IS THE BUG.**

**AND EVERY CLIP HE HAD WAS STANDING IN THE FLOOR.** The seating pass was
written for the retargeted set, on the reasoning that only a retarget loses
height - and an authored stance that bends the knees loses it just as surely.
Measured on the shipped file, `sRise`, `stagger` and `taunt` all stood
0.13-0.14 through the boards on every frame they had. Worse, **THE ONE OFFSET A
GAIT TAKES IS THE ONE THE DEEPEST FRAME NEEDS, NOT THE SHALLOWEST**: `min(drop)`
picks the frame whose foot is already highest - the flight phase - lands THAT on
the boards and leaves every planted foot under them, so the run measured -0.242
and the walk -0.111. `max(drop)`. After: every clip's sole sits at 0.000 and
the gaits' flight phases are the only thing above it.

**AND A CLIP WITH NO ROOT MOTION STILL STATES ITS STRIDE.** `clipSpeed` came
off the ntar-style move sets' own travel curves, so anything packed as a GLB
had none - and the samurai's gaits are retargeted, which writes rotations and
nothing else, so his feet ran at a hand-set number while the fight moved his
body at another and the two agreed only by luck. THE RATE IS THE STRIDE OVER
THE SPEED, and an in-place cycle cannot hide its stride in one place: the
PLANTED FOOT. Whichever toe is lowest is the one on the ground, and how far it
travels backwards through the frames it stays down is the distance the ground
covered; a frame where the plant CHANGES is a step and is not counted, or the
swap reads as a metre of travel. Measured after the scale fit, so it is already
metres: 2.03 m/s walking, 3.50 running.

**HIS SWINGS ARE `real` NOW, WHICH IS THE WHOLE OF THE PACING.** His clips are
about seven tenths of a second and his startups are longer, so mapping a
wind-up linearly onto a startup plays the blade at a fraction of real speed -
SCP-096's "slow-mo" on a second creature. `real` does it the Dealer's way: the
sword is drawn back to the COCK over the first part of the startup, HELD there,
and the cut runs from the cock to the contact at better than the clip's own
speed in the last part, still landing on the frame the table deals damage. A
long readable tell and a blade that arrives fast is what a Japanese sword fight
is, and it is what Sekiro does with every swing. The RECOVERIES came down and
the CHAINS went up rather than the startups coming down, because the startup is
where the fairness lives and this file has paid for shortening one twice.

**WHAT IS NOT DONE:** `sRise`, `stagger` and `taunt` are the last hand-posed
clips on this rig and all three measure wide at the hands, because they are
built up from the bind pose and the bind pose is a T. `sRise` is out of the
fight's draw; the stagger plays on every poise break and the taunt on the wake.
The Dealer's answer - base every authored clip on a frame of the SOURCE idle -
is the fix, and it needs the retarget moved ahead of the authoring so there is
an idle to base them on. He also has no true sideways stride: `strafeL/R` are
aliased to the walk, which is the oldest animation bug in this file, and the
eight Mixamo clips that exist do not include one. And he still stands very
still between swings (96 % of frames under 5 mm) even with `restless` on.

**AND THE HAND HAS TO CLOSE — the Dealer's own bug, on a second rig and for a
second reason.** His fingers were stripped and never re-keyed; this one's are
never DRIVEN. `MIX` maps a spine, two arms and two legs and not one finger, so
every finger bone walks through the retarget as identity, which is the BIND
pose, and this rig binds with the hands flat and open. Rendered CLOSE ON THE
RIGHT FIST at four frames of the side cut, the tsuka floats past a splayed palm
on every one of them. That is "it's not in his hand", and no distance test
could have found it: measured on the MESH, the nearest sword vertex to the fist
is 0.026 on every frame of every clip, because the sword is pinned to the hand
and the hand is simply open. **A DISTANCE FROM A BONE IS NOT A GRIP. Render the
fist.**

**AND THE CURL SIGN IS DERIVED, NOT REASONED ABOUT.** This file has twice
shipped a hand bending backwards over its own knuckles on the strength of an
axis convention read off a rig. The sign is now taken per bone by the one test
with no convention in it: a closed fist brings the fingertip back toward the
WRIST and an open one extends it away, so the sign is whichever shortens that
distance. A mirrored rig gets the right answer on both hands by construction.

**AND "HIS HEAD IS IN HIS BODY" WAS THE COLLARBONE, WHICH IS A IS NOT T.** The
delta transfer says "turn this bone by the rotation the source's bone
underwent", and that is only the same POSE if the two bones start in the same
place. Measured between these two rests in world: the arms agree to 7 degrees,
the shins to 3, the toes to 0 — and the CLAVICLES are 24 apart, because this
artist drew a collarbone pointing up and out (0.84, 0.49, 0.22) where Mixamo's
points nearly straight out (0.98, 0.21, -0.05). Give a bone that starts 24
degrees high the rotation a bone that starts flat underwent and it STAYS 24
degrees high, on every frame, for ever. On a man in a shirt nobody would see
it; on a man in a kabuto with sode the size of dinner plates the shoulder
armour rides up over the neck guard and swallows his head.

Measured as the clavicle's outer end above the top of the chest, over its own
length:

| | source | shipped before | shipped after |
|---|---|---|---|
| idle | +0.01 | +0.18 | +0.01 |
| side cut | +0.01 (max +0.02) | +0.20 (max +0.34) | +0.04 (max +0.21) |
| overhead | +0.01 | +0.23 (max +0.38) | +0.12 (max +0.30) |
| block | +0.01 | +0.23 (max +0.33) | +0.07 (max +0.18) |

Every source clip holds its clavicle dead flat on every frame. The residual on
the swings is a raised arm lifting its own shoulder, which a real body does.

**AND THE ALIGNMENT IS ONLY FOR A TRUE COUNTERPART.** It is applied to the
shoulder, upper arm, forearm, hand, thigh, shin, foot and toe, and NOT to the
pelvis or the spine. `DEF-pelvis.L` is mapped to `Hips` as a STAND-IN — not
because it is a hip — and its rest differs by 47 degrees for exactly that
reason, so aligning it would swing both scabbards and the sash off his waist.
The spine's differences are the curve of a back, which is the artist's and not
an error. **An alignment is a claim that two bones are the same bone.**

**TWO MEN AT THE BAR, AND THEY FIGHT EACH OTHER — WHICH THE FIGHT CODE HAD
NEVER DONE.** Wong the barman (davisthegamelord's, CC-BY-4.0, `assets/wong.glb`
through `gltfpack.py`) stands in the mouth of the barrel rack; the drunk (the
owner's "Monster1_1", `tools/drunk_pack.py`) stands at its front. When the room
has landed both of them, the drink goes across the bar, the drunk takes it,
nearly goes over, raises it and puts it through the floor, and the two go for
each other until one is dead — and the survivor comes for you. What it took:

- **EVERY DISTANCE IN THE FIGHT WAS MEASURED TO THE CAMERA**, because until
  now the player was the only thing anything fought. `u.st.foe` is another
  unit; `mutFoePos(u)` answers its head where the player's eye would be, and
  the chase, the sweep (`blowLands`), the aim (`aimBar`, `aimLimb`), the
  flank and the token all ask it — a creature with a foe of its own takes no
  turn from you, stands at arm's length rather than the pack's polite two
  and a half metres (`mutSeparate`: measured, at 2.6 m they swung at the
  air), and lands its blow through `mutLandBlow`, which is `hurtMutant`
  with a `from`. **And a blow that was not yours carries no feedback for
  your hands**: every `bossHit` and `addTrauma` in `hurtMutant` is gated on
  `mine`, or the lens punched every time the drunk landed one on Wong.
  Whoever YOU hit drops his quarrel and locks on to you (`foe = null`).
- **BOTH RIGS ARE RIGS THIS FILE ALREADY MAPS.** Wong is a Character
  Creator export — the witness's bone naming with this export's own numeric
  suffixes (`_052` where the alien has `_050`: read them off the file, never
  copy a table); the drunk is an Unreal mannequin, the knight's naming to
  the bone with three spine joints instead of five. So `ntarRetarget` puts
  the Male Locomotion Pack on one and the Male Drunk Pack on the other with
  no new machinery (`tools/ntar_moves.py -- wong` / `-- drunk`, every clip
  in each folder, all de-yawed because the game turns them), and because a
  retargeted delta knows nothing about whose skeleton it lands on, the
  knight's and the alien's pulls fit both: the punch, the sweep, the jump,
  the turn, the compass kick, the handspring, the hit reels, the fall and
  the get-up. The two move sets are cut so no swing is shared (`alias`
  maps `wPunch` → `kPunch`, `dSwipe` → `kSwipe` and so on), and one blow
  each is written on the pack's own idle — `poseRig` takes a null clip now,
  because Wong's file carries none at all and the bind pose is the only
  stance there is until his idle has been retargeted.
- **THE DRUNK LAY ON HIS SIDE, TWO METRES LONG AND FOUR TIMES TOO BIG, AND
  IT WAS THE EXPORT.** Three packs before the right one. The FBX parents
  fourteen meshes at scale 10 under an armature at 0.001 (a 3ds Max
  arrangement) and the glTF exporter wrote the joined mesh a tenth the size
  of its bones; the shipped `.blend` has the clean rig, but its armature
  OBJECT carries the importer's quarter turn and the rig a `root` bone
  turned half round, and exported like that the pelvis came out along -z —
  measured on the raw file with `applyBoneTransform`: 0.4 m tall, 1.88 m
  across, which `dressMutant` then scaled up 4.6 times to make "tall" and
  the fight tore into black ribbons across the room. **Apply the armature's
  ROTATION only** (`tools/drunk_pack.py`): applying its scale as well
  collapsed the skin to two centimetres. Measure a packed rig off its
  skinned vertices before anything else looks at it — `Box3.setFromObject`
  on a skinned mesh reads the bind pose through the node chain and says
  nothing, and the first primitive's POSITION range is one belt.
- **A FILE WHOSE FRONT IS NOT +Z IS TURNED ON A PIVOT** (`kind.faceFix`),
  never on the model, whose yaw the aim owns and zeroes every frame. Both
  of these measured +Z off their own toes, so it is zero.
- **THE HALL IS THE ARENA.** The model's grid runs on past the arch into
  rooms nobody walks; measured, the two fought their way fifteen metres out
  of the door in ten seconds. `mutClampX`'s `tav` branch clamps to the hall
  and holds them with the tavern's own site (`pushOutOfKeep`,
  `keepWallPush`), damped the knight's way; `tavSteer` is the Dealer's fan
  on the keep's machinery, a one-point route round whatever shuts the line.
  Measured after, thirty seconds hands-off: 0 frames outside, distance
  0.71–2.74 m, 24 and 20 swings, the drunk dead at the end of it.
- **AND THEY GLITCHED BECAUSE TWO RULES DISAGREED ABOUT A METRE.** Measured
  over twenty seconds of the two of them: 72 and 88 reversals of direction
  and two clip changes a second. The lunge drove each in to `lungeStop`
  0.95 while `mutSeparate` pushed foes back out to 1.25, sixty times a
  second; the shuffle (`restless`) re-armed between every swing; the gait
  was redrawn at every change of mind; and `speedK` 1.28 on the pack's
  4.6 m/s played a man's 3.7 m/s run clip half again too fast. The lunge
  stops where the separation holds them (1.05 / 1.10), the shuffle is off,
  circling and the size-up are rare, a man turns no faster than the knight,
  the pace is a man's (0.92 / 0.82), and `kind.fade` gives them a 0.24 s
  crossfade in `mutPlay`. After: 2 and 10 reversals, no step over 0.19 m.
- **AND THE PLAYER SLIDES ROUND THE FURNITURE.** Keeping one axis of a
  refused move is right against a flat wall and wrong against chairs,
  round tables and barrels; the tavern turns the move a little at a time,
  the church's rule. Measured, walking obliquely into the pedestal table,
  the end wall and a row of chairs: 3.7, 2.2 and 4.2 m in a second where
  the axis rule stopped you.
- **AND A CREATURE THAT IS AWAKE IS AWAKE BETWEEN TOOL CALLS.** The
  survivor turned on the player standing at the spawn and killed him
  while the next call was being written; the page reloaded and the next
  measurement ran against a fresh title card. `setInterval(heal)` in the
  page, not `heal()` in the loop.

**AND A FACING IS A PROPERTY OF THE RIG, NOT OF THE CLIP.** `ntar_moves.py`
measures which way a clip faces off the TOES at frame 0, which is right when
frame 0 is a plain stand and nonsense otherwise: across one pack it ranged from
**-1.3 to -103.2 degrees** — a side step starts with the feet turned out, a
running start with them square to the travel. Applied as that clip's own
convention, each of those turns the whole move by that much, which is exactly
the "we've had problems replicating them before" the owner was pointing at.
Every clip in a pack shares one skeleton and one BIND pose, so the bind is
where the convention is read: all thirty of the orc's clips now come out on
**(0, -1, 0) -> +0.0 deg**, the same heading.

And every swing he has is measured rather than declared — the frame the
striking end is moving FASTEST, which is the reptilian rake's rule and the only
one that suits a two-handed cut (the blade is already out in front in the
stance, so there is no extreme of position): oCut 0.405, oCutC 0.407, oCutD
0.407, oChop 0.350, oSpin 0.533, oLeap 0.449, and the kick on the TOE at 0.367.
Which end it is, is per clip; two of these are legs.

**THE ORC'S SWORD WAS IN HIS FISTS THE WRONG WAY ROUND, AND EVERYTHING ELSE
ABOUT HIM FOLLOWED FROM THAT.** "The sword is facing the wrong way, all his
moves look bad, he stands like a statue" — four faults, all measured in the
pane before anything was touched:

- **AN UNMAPPED BONE INHERITS ITS BIND ANGLE, AND THE BIND HELD THE SWORD
  BACKWARDS.** The blade is weighted to `SWORD_0102` under his right hand,
  `kind.rag` does not name it, so every retargeted frame wrote `pW · bind.q`
  — the sword exactly as the artist parked it in the rest pose. Skinned and
  measured on the retargeted idle: a 2.04 m sword with the hands at 0.09 and
  0.21 along it and the point at -1.43, running DOWN AND BACK through his own
  legs, half a metre of pommel standing up where the blade should be, and
  the left hand nearer the point than the right. He cut with the handle.
  Which end is the blade is a fact about the sword (the far end from the
  hand); which way it leaves a fist is a fact about a FIST — the index side,
  never the pinky side — so `orcFixSword` measures the blade's own points,
  and if the point is on the pinky side (dot -0.94 against the index-to-pinky
  line) turns the sword end for end about the GRIP: a half turn about the
  line from the blade's spine to the hand, so the hand stays exactly where it
  is on the handle. It runs BEFORE `poseRig` captures the bind, so every clip
  inherits it, and it hangs a tip Object3D on the point (`u.bones.tip`) so
  `blowLands` and `aimBar` read the steel rather than a bar run out along the
  forearm — a great sword lies ACROSS the forearm, not along it. After: dot
  +0.94, the point 1.7 m ahead and 2.4 up, the left hand further from the
  blade than the right. And the seat is redone afterwards, because the
  point had been the lowest thing on him.
- **A TWO-HANDED WEAPON IS ONE GRIP, NOT TWO ARMS.** `twoHanded` turned both
  shoulders by their own correction, which is right for two claws and lets
  go of a handle. `kind.grip` corrects the sword arm and puts the other hand
  back where it was on the handle — its offset from the sword hand, turned
  by the correction that hand actually took. Measured: the hands hold 0.29 m
  apart idle and 0.29 through the aimed part of a cut.
- **THE STATUE WAS THE SOURCE CLIP.** Measured on `orc-moves.json`, the
  great-sword idle's biggest swing at any bone over its whole loop is 2.8
  degrees; in the game the head moved a centimetre in two seconds. And the
  idle pool never alternated: `drawGait` only runs when a creature sets off
  or stops, so a thing standing at reach played the one stand it drew for as
  long as it stood. Two things: `mutAnim`'s idle branch may swap idles when
  the loop comes round (a coin, for every kind with a pool), and
  `installLife` puts a layer on top of whatever clip is playing — a breath,
  his weight moving over his feet on two counts that never line up, and his
  head going to whoever he is watching (you, walking in, before the fight;
  his foe in it), off during a swing or a stun so the clip's read is never
  disturbed. It WRAPS THE MIXER: `PropertyMixer` only writes a bone when its
  value changed, so a held cock is stamped once and an offset composed every
  frame would accumulate (the witness's spine, 8 to 75 degrees) — what the
  mixer last wrote is put back before it runs, and the life goes on after.
  Measured asleep at the bar with the player 35 degrees off his front: head
  look 35 degrees, idle and idleB trading places.
- **AND HE FOUGHT FROM INSIDE HIS OWN SWORD.** Hands-off after the flip he
  closed to 1.2-1.4 m and chained from there for a minute, and nothing in
  the fight ever moved him back out — `near` is true inside `maxReach`, the
  chase never runs, and the tavern cast has no footwork between swings. The
  knight's `restless` shuffle (whose radial term walks him to `ring`) and
  every per-swing `stop` at two metres or more; `ease` on his swings so the
  wind-up loads and the strike accelerates into the contact instead of two
  velocity steps. Measured after, hands-off at fighting range with the
  camera tracking him: 43 contacts in 64 s, the sword hand on screen 43 of
  43 and the blade's middle 36 of 43, the steel's nearest point 0.06-0.54 m
  from the chest on every cut, 27 damage a minute, 3 % of frames still,
  fighting at 1.9-2.2 m.

Three harness lessons from the same round. **Freezing rAF kills the loop for
good** — `animate()` re-arms itself from inside the frame, so once a stubbed
rAF returns 0 nothing ever runs again, and `mutants` sat with `cool` frozen
at 0.4 looking exactly like a creature that would not fight; `__bw.animate`
is exposed so `__startLoop` can kick it. **A creature "measured" with the
token held by somebody parked out of the room never swings** — `mutToken`
went to Wong, moved 300 m away and awake, and the orc circled for ever with
`maySwing` false; kill the others (`alive = false`) and take them out of the
scene, do not just move them. **And "on screen" cannot be measured on the
point that reaches the chest**, because the chest IS the camera: project the
HAND and the blade's middle, the knight's way.

**THE CATACOMBS MONSTER, ON THE SAND PAST THE PORTAL.** The owner's "Weird
Creature" — a Rigify-rigged zombie, `Weird-Creature.blend` with the textures
PACKED and `Zombie.fbx` beside it — through `tools/crawler_pack.py` into
`assets/crawler.glb` (4.2 MB), and his crawl is the owner's Mixamo "Running
Crawl" through `tools/ntar_moves.py -- crawler`. He sits on all fours forty-
five metres past the stones (`CRAWL_X/Z`), notices you at seventeen
(`kind.wakeAt`, new: nothing on the beach had ever woken by distance), and is
half again your sprint. What it took:

- **THE FBX IS THE RIG TO SHIP, THE BLEND IS WHERE THE TEXTURES ARE.** The
  FBX carries `rig_deform`, a deform-only export of the blend's 943-bone
  Rigify rig — 175 DEF bones with their parents already resolved, which is
  the work `samurai_pack.py` had to do by hand (Rigify's face DEF bones hang
  off MCH controls the exporter drops) — and six meshes; but its textures
  point at a G: drive. The blend has them packed: unpacked with
  `image.save()` after `filepath_raw`, AO multiplied into the albedo with the
  opacity as its alpha (PIL alone — this machine's python has no numpy),
  1024 / 1024 / 512. The metallic map is 0.0 everywhere and is dropped. The
  albedo's mean is 120 against the mutants' 37, so it is multiplied DOWN
  (`tint` 0x8c8c8c) rather than re-baked, and it keeps its colour; the
  opacity is a cut-out (p5 of 246), so `cutout: true`, or a double-sided
  body blends against itself.
- **A CLIP THAT NEVER STANDS UP IS MEASURED FROM THE REST POSE.** `hipY` is
  the hips' offset from the clip's FIRST frame, right for every clip that
  begins standing and wrong for a crawl that begins on all fours: measured
  from itself its hips read as never having dropped, and the game would have
  played the crawl with the pelvis at standing height and the knees in the
  air. `HIP_FROM_REST` measures it from the rest hips instead (-0.54 to
  -0.48 m below them; the crawl is 20 frames, 0.63 s, 1.51 m of travel), and
  the facing is read off the BIND, since a crawl's toes at frame 0 point
  wherever a crawl's toes point.
- **EVERYTHING ELSE IS AUTHORED ON THE CRAWL'S FIRST FRAME**, which is the
  crouched stance a crawler has and the bind (a standing zombie in an A)
  does not — `poseRig` on the retargeted crawl, the Wong's-jab arrangement:
  two idles that twitch and sniff, a rear-up roar (both hands up, face to
  the sky, back onto the hands), two flinches, a collapse, and five blows —
  a swipe either side cocked high and held, a bite off the whole trunk, a
  lunge with both arms that flies at the lens, and a pounce from range. The
  body-axis sign conventions `poseRig` measures held on a Rigify rig without
  a change, because they are about the BODY's axes and not the rig's.
- **He is a `MUT_KINDS` entry** — restless footwork, the yaw hold, the
  ragdoll through the samurai's own Rigify name map — and the life layer
  the orc got (`installLife`) sits on him too, so he watches you come.

Measured hands-off at three metres: **31 swings a minute begun and 53 contacts
counting chains, 30 damage a minute, still 6 % of frames, 8.5 m/s at the top
of a lunge, zero yaw spikes**; at the contact frame the lunge's claws finish
0.17 m from the chest, the bite's head 0.33 m at a metre off the sand (the
first bite was re-authored — on a horizontal trunk "forward" cannot be
pitched into, it has to be LIFTED and carried, and the first version pitched
the trunk into the sand and finished 1.49 m short), the right swipe 0.48 and
the left 0.86. He dies into the ragdoll, 22 parts, face up with the jaw open.

**THE CRAWLER IS THE ARTIST'S PROMO POSE NOW, HE IS BIGGER, HE RUNS, AND HIS
FACE POINTED AT THE SKY.** The owner's picture — cgtrader's render of the same
zombie on one knee, one hand planted, jaw open — with "make his idle stance
more like this, bigger and more terrifying, give him this run sometimes, fix
his model to move smoother, check his face". Six things, and the first two
were bugs:

- **AN ALIAS OVERWRITES A CLIP OF THE SAME NAME — the knight's lesson, on the
  first day.** `run: 'crawl'` sat in his alias map from the build that had no
  run, so the owner's "Mutant Run" retargeted, landed in `u.clips.run`, and
  was replaced by the crawl on the next line. `runDur` read 0.63 — the
  crawl's — and every head measurement I took "off the run" was the crawl
  again. Read the alias map before measuring a clip.
- **A LEAF INHERITS ITS PARENT'S ALIGNMENT, AND ON A HUNCHED BIND THAT CRANES
  THE HEAD BACK.** The face "looked weird" because it was pointing at the sky
  on every frame of every clip: measured, face (0.12, 0.94, 0.33) with the
  trunk facing forward and down. The retarget's "A is not T" turn is found per
  bone from the direction to its mapped child, and the head has none — it took
  the NECK's. This rig binds like a zombie: the neck bone runs 130 degrees
  down and forward to a head craned back up it to face front (neck axis
  (0, -0.67, 0.74), head (0, 0.99, 0.11)), so turning the neck vertical took
  the head with it. `kind.alignLeaves` aligns a mapped leaf on its OWN axis —
  Blender's bone Y IS the bone, on both rigs — against the Mixamo bone's rest
  quaternion, which `ntar_moves.py` already writes. Opt-in, so nothing tuned
  moved. After: face (-0.2, -0.59, 0.78) in the crawl, forward in the run.
- **THE STANCE WAS FOUND IN THE PANE, NOT REASONED.** `tools/sheet.js` is the
  harness for it: `__pose(angles, hipY)` composes body-axis angles onto the
  crawl's first frame exactly as `poseRig` does and renders the result into a
  strip beside the owner's picture, with no reload per guess; `__sheet` strips
  a clip. The kneel (`CRAWL_STANCE`) is the trunk reared and twisted so the
  planted shoulder leads, the left hand on the sand, the right arm hanging
  bent, the right knee up under the chest with its foot down, the left shin
  back along the ground. **The arm and the leg were GRID-SEARCHED**: 1,512
  renders at four pixels each in 2.4 s, minimising the hand's height off the
  sand with its forward reach bounded — because a body-axis rotation on a
  forearm that happens to lie along X moves the hand in Z and not in Y, and
  no amount of reasoning about "bend the elbow" finds that. Measured: hand
  0.04 m over the sand, foot 0.01. The idles are the stance alive (breath,
  head jerks with holds, the jaw working, the weight rocking); the roar rears
  off the knee and DROPS ONTO ALL FOURS, which is what every blow is built on.
- **THE JAW IS A JOINT LIKE ANY OTHER.** `jaw: 'DEF-jaw_master'` in
  `CRAWL_JOINTS`; the bind is wide open, `right` negative closes it (rendered
  to know, not reasoned). The idles work it.
- **BIGGER IS A NUMBER THAT LEAKS INTO EVERY OTHER NUMBER.** `h` 1.92 -> 2.6
  scaled the model 1.374, and on all fours HIS FACE IS 1.43 m AHEAD OF HIS
  ORIGIN. Every stop and reach in the table is measured from the origin, so
  at stops of 1.9 his teeth were half a metre from the lens, 95 % of his
  contacts landed off the bottom of the frame, and the owner's picture would
  have been his back. The table is written round the FACE now: stops hold the
  origin at 2.7-3.0 (the face at about 1.1-1.5), reaches grew by the same 1.4,
  `hitR` 1.7 so the blade's sphere reaches a face that far forward, `body` 1.2.
  Measured pinned at 4.5 m: contacts 100 % on screen (was 5), median 0.73 m
  from the chest, 34 swings and 37 damage a minute, zero yaw spikes.
- **AND A TOKEN HOLDER SIX HUNDRED METRES AWAY NEVER GAVE IT BACK.** The
  harness's teleport crossed `MUT_Z` and woke the pack, the pack's swing never
  ended because nothing advances a unit that far away, and the release waited
  for the swing to end — so a beach mutant held the turn through a whole
  crawler fight and the crawler circled at two metres for ten seconds at a
  stretch (8.6 swings a minute, measured, and `bw.mutToken` — NOT
  `state().mutToken` — is how you see who has it). Past thirty metres a holder
  gives it back whatever it is doing.

And two harness lessons. **A knockback walks a pinned-nowhere player up the
beach**: forty metres of them put the harness player in the portal ring and
the dojo took him mid-sample (the camera read (2980, 801, 2979) and the
crawler ran to z 410 after him) — the crawler stands sixty metres past the
stones now, and a sampler that must not move pins the camera every tick. And
**`__sheetFor(unit)` before `__sheet`** — the tool is re-evaluated after every
reload and forgets whom it is for.

He runs one set-off in three (`gaits.run: ['crawl', 'crawl', 'run']`), a
hunched two-legged lope at 3.6 m/s clip speed played at the rate he moves,
the run cycle windowed to its eighteen frames because the importer pads it
with a held tail that hitched the loop; `fade` 0.22 on every crossfade; every
swing `ease`d; `chainMax` 2.

**THE CRAWLER IS 3.1 m, HE RUNS AS OFTEN AS HE CRAWLS, AND YOU SEE HIS FACE.**
The owner's three: taller, bigger, scarier and more dangerous; the Mutant Run
sometimes and the crawl sometimes; and "I want you to see the creature's
face". The last one is the one worth writing down: every clip he fights with
is built on the crawl's first frame, and a crawl looks at the sand a stride
ahead, so what the player fought was the top of a skull. `kind.face` is a
constant lift of the neck and the head composed by the life layer through
every clip that is not an idle (the kneel already lifts it), and `face.hold`
keeps the eyes on you through a swing where the look used to drop to nothing
on the frame he committed — the aim yaws the model and the blow is swept on
the limbs, so the head is free to look. The table moved out again with his
height (the face is now 1.7 m ahead of the origin), the lunge takes two of
your four, `speedK` 1.6, `aggr` 3.4, chains three deep, and the run is drawn
one set-off in two.
Measured after, pinned at five metres over seventy seconds: **35.5 swings and
39 damage a minute, 100 % of contacts on screen, median claw 0.89 m from the
chest, his face toward the lens on 71 % of frames, zero yaw spikes** — and
the keep's pier holds the player for 300 frames after the cut where before
it lost him on the first.

**"HE'S PALMING YOU", AND THE CHEST STUCK UP: THE HUNCH IS THE RIG'S OWN
NECK.** The owner sent the artist's renders back
(cgtrader "Stylized Zmobie") with "less awkward, his hits don't look like
clawing, chest less weirdly stuck up, a natural hunch, taller looking down on
you, strong". Two things, and the second corrected the round before it:

- **A HAND NOBODY DRIVES IS FLAT, AND A FLAT HAND SLAPS.** Thirty finger
  bones, never keyed, so every swipe arrived palm first. `kind.claws` curls
  every phalanx about its own X all the time and harder through a blow, and
  THE SIGN IS DERIVED per bone (a curl shortens tip-to-wrist; each bone is
  turned both ways once at install and keeps the one that did) — the
  samurai's fist on a monster, and it needs no rendering to be right.
- **THE REFERENCE IS A HUMP, NOT AN ARCHED BACK.** Read off the renders: the
  shoulders are the highest point, the neck comes forward and DOWN out of the
  hump, and the face looks up from under the shoulder line. The round before
  reared the chest straight up (waist -0.40, chest -0.50), which is a man
  arching — the "weirdly stuck up" chest. `kind.posture` is a joint map now
  (any joint, body-axis angles, plus `lift` for the hips) and the fitted one
  lifts the lower back, curls the chest a shade forward, drops the neck 0.9
  ahead and cranes the head 0.9 back up — very nearly the rig's OWN bind
  pose, which is a zombie's neck and was the thing the retarget straightened
  out. The legs and arms were grid-searched over the crawl cycle for feet and
  the lowest hand on the sand, and the lift was swept: at 0.28 no arm reached
  the ground and hands 0.2 m up read as floating; 0.10 puts the lowest hand
  0.04 m into it with the chest at 1.46 m and the head at 1.20 (was 1.16 and
  0.75). The face lift went to zero with it: the crane does the looking.
Measured after, pinned at five and a half metres over sixty-six seconds: **29
swings and 41 damage a minute, 89 % of contacts on screen, his face toward
you 61 % of frames, head carried at 1.29 m in the crawl (the hump at your eye
line, the face looking up from under it, as the renders have it), zero yaw
spikes.** Frozen at a swipe's contact the forearm rakes across the lens with
the far hand's claws hooked in frame. Standing, he is three metres over you.

**"I NEVER SAW HIM THE PAST 2 TIMES I PLAYED" WAS THREE THINGS, AND THE
FIRST IS THE OLDEST MISTAKE IN THIS FILE.** The owner walked the catacombs
twice and the thing that lives in them never once crossed his path. Measured
with the player standing still in the door room for three minutes: he came
within **1.5 m** and never saw them, and never counted as being in that room
at all. Both readings are the same fact — **a distance with the y left out is
not a distance.** Two rooms stack at the same (x, z) all over this place and
he was ten metres BELOW, which his own senses already refuse (`catSees` will
not see through a storey). His convergence targets are drawn from nodes on
YOUR OWN FLOOR now (within 1.8 m of your feet), and the prowl mostly is too.

- **AND A BEAM OF LIGHT IS NOT A WALL.** "Let me run up to the door, I got
  stuck here": the door's decorative light shaft is a `PlaneGeometry` hung
  3.3 m out from the leaf, and `buildKeepWalls` reads every drawn face — so
  the walk stopped the player exactly one body radius in front of a sheet of
  light. It, the glow and the hit proxy carry `bwGhost` (drawn, never walked
  into), which the tavern's tables already needed. Measured: a 3.56 m gap
  became -0.03.
- **AND A WALL IS SLID ALONG, NOT STOPPED AT** — the player's own rule and
  the church's, which his own clamp never got. A frame whose movement crossed
  drawn stone was reverted WHOLE, and a revert is standing still; with a
  route nothing above ever asks to redraw, that is a creature parked for
  good. Traced with the player in one room: **seventy-five seconds held at
  25.9 m with a live eight-waypoint path in his hands and the revert firing
  on half the frames.** Whichever ONE AXIS of the step is clear is kept.
- **AND A STALK THAT IS NOT GETTING ANYWHERE IS NOT A STALK.** Net progress
  over five seconds; under a metre of it drops the route and asks for another
  corner, and three goes is all he gets before he simply comes. The backstop
  that ended a stalk was 95 s, which is a minute and a half of a boss
  standing still — 45.

Measured after, real time, player standing at the landing and the creature
parked 44.6 m away on another storey: he closes to **5.2 m and charges at
48 s**, against never. And the room the way out is in is one of his — the
nodes within twelve metres of the door, found off the door rather than typed,
and he goes there about a quarter of the times he picks an errand.

Three measurement traps paid for on the way. **Dev mode turns a creature's
swinging off outright**, so a creature standing at its ring doing nothing is
what dev mode looks like and not a bug (`atk: -1`, `cool: 0`, the idle
playing). **A page that has not been reloaded is the old module** — the door
spots read zero for a whole round because the graph in the tab had been built
before the code that fills them existed. And `u.path` on this follower is
**LOCAL x/z with a world f**, against `u.pathO`; printing a waypoint against
the room's origin subtracts it twice and every distance comes out in the
thousands.

**THE GRAB IS OUT, AND WHAT IT TAUGHT IS THAT NOTHING MAY LEAVE A RIG
UNBOUND.** "Take out the grab, it's bad, he T-posed right after it." He did,
and the reason is general enough to be worth the note even though the beat
is deleted: a TAKE owns the mixer while it runs — every other action
stopped, zeroed AND disabled, because `stop()` alone leaves an action
contributing and the crawl and the grab then averaged into one pose — and
what handed the body back was `u.cur = null` plus a fresh draw. **A frame on
which no action carries weight is a frame drawn in the BIND pose**, and this
rig binds standing in an A. `catBound` is the net and it hangs off
`catStand`, which every branch the creature has already calls: if nothing at
all is stamping him, the idle is, on the same frame. Measured by doing to
him exactly what the grab did — every clip stopped, zeroed and disabled —
and stepping one frame: he comes back on the idle and carries on into a
stalk with the crawl playing. The same line went out of the undying rise,
which cleared `u.cur` for no gain: a scripted beat has to blend OUT of its
last pose, which is what the knockdown does and is the shape to copy if a
grab ever comes back.

**THE SAMURAI STOOD THERE BECAUSE A CREATURE'S FEET ARE NOT AN EYE MINUS A
BODY.** "He keeps getting stuck in place" and "he stops attacking even when
you get close" are one line. `pushOutOfDojo(p, r, feet)` is the PLAYER's call
and its `feet` is optional, falling back to `p.y - playerEye()`; `mutClampX`
called it with two arguments, and a mutant's group already sits on the floor
— so the wall band it tested ran from 1.14 m UNDER the boards to 0.05 m over
them and caught the risers of the step he was standing on. Measured: the
chase moved him 0.10 m toward the player and this put him back 0.10 m, on
every frame. He stood 3.04 m away for 38 of 40 seconds and threw NOT ONE
SWING — and every diagnosis that starts "the AI has stopped deciding to
attack" is wrong, because he was never allowed to close. After: 40.5 swings
and 54 damage a minute, median range 1.23 m, worst stall 1.13 s (the Dealer
is 48 and 40). **An optional argument with a player-shaped default is a trap
the day a creature calls it.**

**AND A CORPSE'S GROUND IS A LOOKUP PER PARTICLE — the gibs' rule, on a
ragdoll.** `updateMutRagdoll` took ONE floor, at the spot the creature died,
and gave it to all 22 particles. On a beach, a hall and a bunker floor that
is the same number everywhere and the error cannot show; the courtyard has a
step in it. Measured: killed on the veranda at 800.58 the body slid four
metres onto the yard at 800.20 and came to rest with its lowest joint 0.45 m
in the air. Each joint asks what is under ITSELF now, and off the grid it
keeps the body's own floor so a part thrown past the edge of a room still has
something to land on. Two things came with it: a floor made of cells is not
LEVEL across a two-metre body, so the constraints turn the disagreement into
a permanent millimetre of jitter and at the sand's 1e-7 the corpse was solved
for ever — a room gets the surf's own looser threshold; and at rest the body
now lies ACROSS the step with a 0.56 m spread of floors under it, which is
what a body draped over a step should do. Measured after: 22 parts, worst
constraint 1.012, asleep at 2.15 s, hips 0.28 m over the floor they are
actually over.

**CROUCHING IS SNEAKY.** A crouch carries three metres (was five), a walk
twelve, a sprint twenty-six — and a crouched body is harder to SEE: half
his range, a narrower cone off his line past eight metres, and he has to be
within 3.2 m to hear it whatever he faces. **AND SOMETIMES YOU SEE HIM ABOUT
HIS OWN BUSINESS**: about a quarter of his errands go to a spot you can see
from where you stand — a bone pile in view first — where he eats, sits or
looks about ABSORBED, noticing you only inside four and a half metres or by
a noise. Measured: 3 of 10 errands, 66 s of it in four minutes.

**AND A PILE OF BONES BREAKS.** Running through one has clattered and carried
twenty-six metres since the bones went in; a BLADE through one did nothing at
all, which is the wrong way round — it is the one noise down there you make on
purpose. The pile is triangles inside the room's own merged mesh and cannot be
taken away, so what breaks is what was lying loose on it: `catBoneStrike` is
another door in `digImpact`'s own chain (after the castle, the crate and the
glass), it throws real gibs in the skulls' material down the swing, and the
noise is registered AT THE PILE rather than at you. Measured: a swing at a
pile two metres off throws twelve bones and sets his noise at r = 26.

**A SKELETON MAY BE A FOREST, AND THE RAGDOLL ASSUMED ONE TREE.** "His model
gets stretched out and looks horrible" was one unstated assumption in a
function written years ago: that every joint hangs off the hips, so writing
the HIPS' POSITION and everybody else's ROTATION moves a whole body. Rigify's
`export_def_bones` drops every ORG and MCH parent and reparents what survives
onto the armature, so the samurai arrives as **thirteen separate chains** —
the spine, a shoulder and an upper arm a side, a thigh a side, both pelvis
bones, both breast bones and his two swords, all siblings under `rig`. He is
the only asset in this game like that: scanning every skinned GLB for a skin
with more than one root joint finds four, and on the knight, the beast and the
monster the extra roots are IK helpers with no vertex weighted to them.

Measured on a corpse at rest, bone against the particle driving it: the spine
tracked to the millimetre and **every limb bone was 1.7 to 4.3 metres adrift**.
The torso flew off with the blow and all four limbs stayed standing where he
died, with the skin stretched between them. Put the old rules back on the same
body and it reproduces exactly: worst gap 0.145 m becomes 2.43 and the skinned
diagonal 2.15 m becomes 3.01, and on a real death — a killing blow that throws
him — it went to 5.45 and filled the screen with a sheet of him.

**AND THE CLAVICLES SPUN, WITHOUT LIMIT.** `Character1_*Shoulder` points at
`*Arm`, and on this rig the arm is not the shoulder's child — so rotating the
shoulder never moves the thing the correction is measured against, the same
turn is computed from the same unchanged direction every frame and
premultiplied onto the last one. Measured: 66, 132, 161 degrees off its start
over half a second and still going.

Three questions are asked of every part ONCE, at the build, and the driver does
what the answers say. `rooted` — nothing above this bone is driven, so its
position is nobody else's job and is written from the particle, which is what
the hips always got and what every limb root needed. `turns` — the joint it
points at really is below it, so rotating it moves that joint; if not, rotating
is a spin. `pin` — hang it off its own chain parent on the offset it had at
death instead, because a clavicle rides the chest. A leaf (a head, a hand, a
toe) has nothing to point at and wants none of this. On a single-tree rig every
answer is what the old code did, so nothing else in the game moved.

**AND WHAT THE RAGDOLL HAS NO PARTICLE FOR STILL HAS TO COME WITH THE BODY.**
`DEF-pelvis.L/R` carry both scabbards and the sash, `DEF-breast.L/R` the chest,
and the two swords are root bones too. While the clips are driving them nobody
notices, because a clip writes every bone every frame — the mixer stops on the
frame he dies, so they hold their last transform in the armature's frame and
stand in mid air where the man was while the body falls away underneath.
Anything that is neither a driven joint, nor below one, nor ABOVE one (the
hips' own parent must be left alone, since the hips' position is expressed in
it) is hung off a joint.

**AND WHICH JOINT IS A QUESTION THE ANIMATION ANSWERS. PROXIMITY DOES NOT, AND
IT IS WRONG BOTH WAYS ROUND.** In the standing death pose his left hand hangs
by his left hip, so the WAKIZASHI's nearest joint is the left upper arm at
0.138 m — a sheathed sword that would then swing about with a dead arm. In the
BIND pose both swords sit at the waist and the KATANA's nearest joint is the
spine, when the thing it is actually in is his fist. The question is not where
a bone IS, it is what it MOVES WITH, so the clips are asked: play each one,
sample the orphan's position in every candidate joint's own frame, and take the
joint it varies least in. It is not a judgement call —

    Wakizashi     Hips       0.0016   (next: Spine        0.1815, 113x)
    Katana        RightHand  0.0076   (next: RightForeArm 0.0533,   7x)
    DEF-pelvis.L  Hips       0.0000   (next: Spine        0.0810)
    DEF-breast.L  Spine2     0.0757   (next: Spine1       0.0814)

— a sheath on the hip, a sword in the hand, a sash on the pelvis and a chest
bone on the chest, every one right. A bone BELOW an orphan (the katana's tip)
is left out and rides it. It costs 16 ms on the frame a creature with orphans
dies, under a 260 ms hitstop, and on every other rig in this game the set is
empty and not a line of it runs.

Measured after, frame by frame down a real death: worst bone-to-particle gap
**4.275 m → 0.145 m** (and the 0.145 is the pinned clavicle sitting where a
clavicle sits on a chest, not drift), the skinned diagonal **2.23 to 2.62 m for
the whole fall and at rest** against a man's 2.35 standing, 22 of 22 parts,
asleep at 1.62 s, hips 0.17 m over the floor and the lowest joint 0.05, and the
katana still in his fist.

**AND HIS SET WAS TWO SETS THAT DISAGREED ABOUT HIS LEFT ARM.** Eight
retargeted Mixamo greatsword clips and three written by hand, and only the
first family holds the katana two-handed: the authored stagger, taunt and
rising cut are built up from the rig's own bind pose, which is a T, so the left
hand comes off the handle and hangs dead at his side while the right one waves
the sword about on its own. Measured as the gap between his hands over his OWN
arm reach — the one figure two rigs with different proportions can be compared
on — every good clip in the set reads 0.25 to 0.48 and those three read 0.84,
0.93 and 1.03. He plays the stagger on every poise break and the taunt the
moment he wakes, so they are two of the three clips you see most of him in.

The proper fix is the Dealer's, in the packer: base an authored clip on a frame
of the retargeted idle rather than on the bind pose. **THAT SOURCE IS A .BLEND
ON THE OWNER'S OTHER MACHINE** — `tools/samurai_pack.py` points at
`C:\Users\...\Samurai.blend` and a Windows Blender — so what is done instead is
the same idea on the shipped tracks at load (`kind.armRest`): every arm joint
eased toward the idle's own guard by `w`, which puts both hands back on the
sword and leaves the clip's body, legs and whatever swing it has untouched. At
0.70 the three read 0.51, 0.46 and 0.49 and the whole set is one band. **A
rebase of the clip's BASE alone does not do it** — that was tried first and
moved the stagger only 1.03 to 0.80, because the splay is in the clip's own arm
motion and not only in where it starts from.

**AND HE CLIPPED THROUGH THE DOOR BECAUSE HE WAS PUT THERE.** Nothing ever
walked him through it: every unstick in that file ends `p.set(node)` and
`catNearestMain` answers with the nearest node ON THE MAIN COMPONENT, which,
pressed against a wall or against the barred door, is as often as not the node
on the far side of it. `catNearestOpen` takes the nearest one whose own line
is open from where he stands (`catLineOpen`, the game's own test), so a snap
can only ever land somewhere he could have walked to; the bare nearest stays
as the last resort for a body inside stone with no open line anywhere. The
leaf itself is drawn geometry in the wall index and is solid whatever the
lock says — measured, the player walked hard at it for three seconds and
stopped dead at the door's own x.

**THE BODIES DID NOT FREEZE — THEY WERE CUT IN HALF, AND THE HALF THAT WAS
LEFT STOOD UP.** The owner photographed a mutant locked upright on the sand
and the ragdoll was working perfectly: hips 1.39 to 0.24 in half a second,
asleep at 1.75. What was wrong is that it had ELEVEN parts against a whole
body's twenty — `Character1_Spine1` was in `gone`, so the torso had been
baked off as a gib and thrown, and a stump of a pelvis and two legs is a
STABLE A-FRAME. Two causes, and both are lessons:

- **A REVOLVER ROUND IS NOT A CHARGED CUT.** `magFire` passed `P = 1.0`, and
  `P` is what `finishMutant` reads to decide whether the blow was enough to
  take a creature apart at the waist — so the pistol counted as the heaviest
  thing in the game and bisected on a 42 % roll. At 0.5 it is under
  `MUT_HEAVY`: it still takes a limb, still throws the body, and cannot cut
  one in half. (A headshot keeps its own certain burst.)
- **AND THE KICK IS SHARED OUT OVER THE BODY THAT IS LEFT, NOT THE ONE IT WAS
  BORN WITH.** `h` is a part's height as a fraction of `kind.h`, which puts
  the throw in the chest and leaves the feet planted so a whole body goes
  over them — and on a stump, whose highest particle is at 0.3 of `kind.h`,
  it gave every joint the SMALLEST kick there is. Normalised by the tallest
  part actually simulated, the top of a stump is at h = 1 and takes the whole
  throw. Measured after: a gun kill is twenty parts, lands flat (hips 0.24,
  head 0.20) and sleeps.

**AND "THEY JUST SLIDE AROUND THE GROUND" WAS THE CLIP DISAGREEING WITH THE
MOTION, IN BOTH DIRECTIONS AT ONCE.** `mutAnim` chooses between the idle, the
walk and the run on `moving`, which is what the fight ASKED for — and the body
is then moved by four other things: the separation that holds two fighters
apart, the room's clamp, the wall push and the lunge. Measured in the tavern:
**Wong travelling 2.38 m/s with the IDLE on his mixer** (a man gliding across
the floor in a standing pose) and **the drunk playing `run` at a timeScale of
1.18 with his feet making 0.00 m/s** (a man running on the spot). Counted over
twenty seconds of a real fight, the clip and the ground disagreed on **18 % of
frames for Wong, 23 % for the drunk and 74 % for the orc**. A kind that says
`gaitBySpeed` has the CHOICE as well as the rate taken from `realSp`, which
`mutAnim` already measures: **0 %, 0 % and 0 %** after. It is opt-in only
because every other creature here was measured on the old rule, and it should
spread.

**AND THE STRIDE IS MEASURED ON THE RIG THAT PLAYS IT, NOT READ OFF THE
SOURCE.** `clipSpeed` comes out of the moves file, where it is the travel of
the SOURCE skeleton's root — and a retarget puts rotations on a body with
different legs, so what the feet actually cover is a different number.
Measured in the game against the shipped values: **Wong's run 2.73 against a
stated 3.74 and the drunk's 1.81 against 2.42**, both about a quarter out,
which at "the rate is the stride over the speed" is a quarter of the body's
speed scrubbed along the floor on every run in the room. `measureGaits`
scrubs each gait clip once through a whole cycle and measures the PLANTED
foot's travel in the BODY'S frame — the lower toe, and only over frames where
it is still the lower one, because the frame the plant changes is a stride and
not a slip. Three traps: **an action that is not RUNNING is not evaluated**
(`enabled` and a weight are not enough — the mixer only walks its active list,
so the first build stamped nothing, measured zero for every clip and set its
own "measured" flag on the way out); every action's time, weight, enabled and
paused state is put back and the mixer stamped again, so the pose on screen is
the pose it was; and **a creature in a scripted beat never reaches `mutAnim`**,
so it hangs off the loop where every unit is ticked instead — the two men in
the tavern's opening are driven by the scene, which is to say the two the
owner was looking at were the two it never ran for.

**AND A MAPLESS MATERIAL UNDER A LIFT IS A WHITE CUT-OUT.** `dressMutant`
lifts every material on a creature off its OWN MAP, which is right for skin
and armour and meaningless for a surface that has no map: the orc's blade and
gem ship bare, so `white * 0.22 of white` drew two metres of steel as a
blown-out white bar — the brightest thing in the room, in every frame he is
in. Read the emissive before touching anything else, for the third time. And
**the blade is not a child of the sword BONE**: the steel is a SkinnedMesh
weighted to it, so a traverse of the bone walks a subtree with no geometry in
it and dresses nothing, which is how the first build of this ran, found
nothing, and left the sword white.

**AND THE ESCAPE HAS TO LEAVE HIM IN A STATE THE REST OF THE FILE AGREES
WITH.** The first build of the fix wrote `C.mode = 'roam'` on an AWAKE
creature, which is a contradiction: `st.awake` is what sends him down the
fight's branch and the fight reads `C.mode` for nothing but the stalk and the
flight. He came out of the watchdog awake, in roam, steered by nobody at all —
measured, `pause` pinned at 0.40 for two hundred and forty frames because the
branch that counts it down was never reached, and twelve seconds under the
door being rescued every two and a half. `catLose` is the one door that puts
him down properly, and it has been there all along.

**AND A TELEPORT IS NEVER THE FIRST ANSWER.** Giving up the chase is FREE —
`catLose` moves not one pixel — so an awake creature that cannot get to you
simply stops trying, and the grace that exists so he is not snatched away in
front of you came down from 7.5 s to 4. A SLEEPING one gets a fresh errand
first, which also moves nothing and can therefore happen in plain sight;
without it an investigate or a roam you happened to be watching had no escape
at all (measured: five seconds of a visible creature not moving, twice in
three samples). Only a creature that is already down, has had its errand
redrawn, and still cannot get anywhere is picked up — and only where you are
not looking. **And a snap that lands where he already is is not a snap**:
`catNearestOpen` answers a body standing ON a node with that node, a 0.21 m
move, under the watchdog's own one-metre mark, so it fired again two and a
half seconds later for ever.

Measured after, three 60 s samples with the player at the door: **worst stall
in a moving mode 1.75 / 4.25 / 4.25 s against 39.75, 110-123 m travelled,
closest approach 0.01 m (he gets there), and the 4.25 s is the grace itself.**
The player's own approach is untouched — floor runs unbroken to x = 18.7, the
prompt reads "E Unlock the door" from there, and the return spot inside the
door is where it always was.

**THE HUNTER PARKED UNDER THE BARRED DOOR, AND IT WAS A DISTANCE WITH THE Y
LEFT OUT — the sixth time.** The owner's word was that he must never get stuck
on that door again and must be smart enough to take another route if he is
blocked. Reproduced before anything was touched, with the player standing at
the door and the creature chasing from forty metres: he crossed the complex,
arrived on the GROUND FLOOR DIRECTLY UNDER the player nine metres below, and
held there — **forty-eight seconds with `path` 0, `catGrind` 0.00,
`catRouteFail` 0 and the mode 'chase' on every sample.** Every counter read
zero because every counter was being cleared, every frame, by one line:

```js
if (look <= 0.2 || (clear(look) && Math.abs(pf - feet) < 1.4)) { u.path = null; ... }
```

`look` is `min(plan distance - 0.4, 11)`. Standing under you the plan
separation is a few centimetres, so `look` comes out NEGATIVE, the shortcut
fires as "you are already here", and it throws away his route, his grind and
his refusal count before any of the nets below could count to anything. The
second half of that line already asked the storey; the first half did not.

Four more things, and each was hiding behind the one before it:

- **A GRIND IS NET PROGRESS, NOT A FRAME'S STEP.** `catWander` learned this
  when the knight was shouldering a pier and `catSteer` never got it: a body
  pushed out of a wall and driven back into it by the chase moves a centimetre
  or two EVERY frame while going nowhere, so `moved < 0.008` never reads as
  still and the whole escalation under it — drop the route, go another way,
  search — is unreachable. It is a mark now: how far he actually got in a
  second and a bit.
- **AND WHAT CLEARS THE REFUSAL COUNT IS GROUND COVERED, NOT A ROUTE FOUND.**
  It was cleared on the frame `catRoute` returned true — and a route to you
  nearly always exists, so a creature grinding on the first leg of a perfectly
  good path ran the cycle for ever with the counter pinned at zero: grind, drop
  the path, count one, draw the same path, clear it back to zero. Measured at
  the door, seven seconds of exactly that with an eighteen-waypoint route in
  his hands.
- **AND A CHASE GOES TO WHERE YOU ARE.** The target was `catLastSeen`, which
  is the right question for the STALK and the SEARCH — those modes exist to
  hunt a spot you have left — and the wrong one for a creature already on you:
  he cannot see through a floor, so the moment you climb a stair his last
  sighting is a ground-floor spot, he routes to it, arrives, and stands there.
  `catLose` still ends the chase after five seconds without sight of you at
  over twelve metres, and it hands him to the search, which is where last-seen
  belongs.
- **AND HIS FIRST ANSWER IS ANOTHER WAY, NOT GIVING UP.** The watchdog's only
  move on an awake creature was `catLose`, so four seconds of grinding at the
  foot of a stair lost you and he went back to his day. He gets one `catDetour`
  first — somewhere he demonstrably CAN walk, from where the line to you is a
  different line — and the try is his again the moment he covers ground.

**AND THREE MEASUREMENT TRAPS, ALL PAID FOR IN THIS ROUND.** Pinning the
camera's POSITION does not pin the player: `vy` goes on accumulating and the
frame the pin stops he drops nine metres, so the pin is position AND
`camBaseY` AND `groundY`. A stall metric that counts an ACT reads 29 seconds on
a creature that is eating — the file's own note says which beats are standing
still on purpose and the metric has to know them. And forcing `C.mode='chase'`
on a creature that has never seen the player measures nothing: he loses you in
five seconds because he never had you. Let him see you first.

**AND YOU MAY BLEED A CRAB WHERE IT LIES.** Drawing the haemolymph was a thing
you could only do out of the PACK — take the crab, take the syringe, then use
either on the other — which is two menus for the one gesture anybody tries
first: point the needle at the animal on the sand and press. `onAttack` is the
click's own door on an interactable, asked BEFORE the tool branches, because
the thing in the world knows what is in your hand and a tool does not know what
is in front of it; `alt` is the second verb in the prompt, asked every frame
because it depends on what you are carrying. It goes through the crab's OWN
pickup handler rather than round it, so the save records the crab as taken by
the same id it always had and a checkpoint cannot put it back on the beach, and
the crab is then spent on the spot by the same `startExtraction` the pack's
combine runs. Both crabs have it.

**AND A CORPSE STAYS WHERE IT FELL.** Measured on a killed mutant: 22 parts,
settled and asleep at 5.6 s, and the hips move **0.000 m over the next twenty
seconds** — against the owner's report of bodies drifting and flying about.

**AND WHAT YOU KILLED STAYS KILLED.** `makeMutant` names each creature
`kind@x,z` (`saveKey`; the shrine's summoned waves are null) and the save
lists the dead; `retireUnit` takes them out of the world on restore and at
creation for the ones a room builds on arrival (the knight, the tavern's
three). `dealerWon` and the tavern's fight (`tavFight`) are on the save too.

**THE UMBRA MARAUDER, PAST THE FIVE — THE HARDEST THING ON THE WALK.** DM-913's rig (CC-BY-4.0, `assets/umbra.glb`, `gltfpack.py --tex 2048 --normal-tex 2048 --min-tris 200 --drop-mr`: the min-tris drops the three rig-gizmo meshes, and the attire's PNG stays a PNG because a fifth of it is cut-out alpha). Four arms off one pair of shoulders (a front pair `*1` and a back pair `*2`), three sickles rigid under `Hand1R`, `Hand1L` and `Hand2L`, and a HEAD that is a sibling of the neck (`HeadIK_125` under `ChestIK_135`) — so `alignLeaves` is on, or it inherits the chest's alignment and looks 35-45 degrees up the sky through every retargeted clip. Three's loader strips the dots: `Shoulder1.L_51` is `Shoulder1L_51`. He stands at `UMBRA_Z = LH_Z + 92` (SUPERSEDED `CAT_OUT_Z - 105`: he moved to where the whale's old door in the sand wall was, at the foot of the headland; SUPERSEDED again: he waits in Castle XVII's courtyard, see the end of this file), facing +Z (his front), and wakes at 26 m with his `Pose3` as the roar and a shriek.

- **THE COMBO IS ONE MIXAMO TAKE CUT INTO FIVE AND CHAINED.** The hands' own speed puts the strikes at frames 15 (left), 22 (right), 35 (both), 44 (right) and 52 (both); the windows are cut at the valleys between them (`WINDOW` in `ntar_moves.py`), each with its own measured contact, and each plays at the clip's own speed (`wind` = hit x dur) so the chain IS the take. The take turns a FULL CIRCLE (+50, +125, +213, +10, -33 degrees) and ends square — so its yaw is KEPT, which also keeps the windows continuous where they join. **A chain into a swing a kind does not OWN is dropped by `makeMutant`**, so `uC2`-`uC5` sit in `use` at 0.0001. The last window is `real` with `cock: 1` so its tail plays at its own speed and then HOLDS: that is the opening after a full combo.
- **HIS SECOND PAIR OF ARMS FOLLOWS THE FIRST** — `kind.twin` in `ntarRetarget`: each back-chain bone takes its front-chain bone's Mixamo delta `lag` frames late (3), turned by a fixed offset out of the front pair's way (`spread` 0.32 down, `back` 0.22), with its rest aligned on its OWN child. His native `Pose1-3` (the only animation the file carries) drive all four as the artist drew them; they are rebuilt to key EVERY bone plus the hip's position (`uCalm`, `uStance`, `uGuard`), because a clip that leaves a bone out leaves it wherever the last clip put it.
- **Everything else is the knight's and the alien's packs**: walks, runs, strafes, side steps, flinches, `knockOut`/`getUp`, the macaco dodge, and the stab / sweep / spin / leap / compass kick on his own numbers (`uStab` ... `uKick`, aliased).
- **HE TAKES NOTHING OFF A GUN** (`gunBlock`): `magFire` hands a foe hit to `umbraDeflect` before any damage — 40 world sparks (`worldSparks`, a world-space pool, since `spawnSparks` lives in the view model) where the shot's line passes his nearest blade, a lamp waiting at zero from boot (`deflectLamp`), a clank and a tonal ricochet (`sfxRicochet`), his guard up if he was not swinging, and it WAKES him and brings him on.
- **`comboGrace` (0.45 s)**: a blow of his that lands within that of his last landed blow reaches you (trauma, sound) and takes no health — his 0.13 s follow-ups are under anyone's reaction, so an undefended combo was six points against a bar of four; it costs three now.
- Measured hands-off at fighting range with the player pinned and healed: 78 swings and 48 damage a minute (the most aggressive thing in the game), eight full five-strike combos a minute, blades a median 0.38 m from the chest at contact, his head in frame on every contact (`lungeStop` 1.55 — at 1.2 it was off the top of the screen), three pistol rounds deflected for zero damage, and a death into a 21-part ragdoll lying 0.26 m off the sand with the blades still in his hands.

**A NEARLY DEAD MUTANT SOMETIMES RUNS, AND DIES RUNNING.** The owner's three Mixamo "Injured Run" clips (straight, left, right) go onto the beach pack's own rig through `tools/ntar_moves.py -- mutant` (`assets/mutant-moves.json`, all three de-yawed). **The pack needs no `kind.rag`**: its bones are `Character1_*`, the names every rag table maps FROM, so `ntarRetarget` maps a rig with no table onto itself. `mutInjClips` retargets them in `dressMutant` for any kind with `flee`; the eight `mutant.glb` kinds carry `flee: 0.10` (it was 0.25; the owner asked for it rarer), rolled ONCE per creature (`st.fled`) the first time a surviving blow leaves it at or under a fifth of its health (one point for most). Fleeing (`updateMutFlee`, after the flinch): it PIVOTS its back to you first at 4.2 rad/s (a turn clip comes round at under a radian a second, so half a turn at that pace is three and a half seconds running AT you), then runs away with a wander and turned back along the beach before the surf or the dune; the clip is chosen by how hard it is turning, with hysteresis, and while a turn clip plays the heading comes round at that clip's own measured rate (`u.injTurn`, off the pack's `yaw.swing`/`dur`); a switch carries the stride's phase across (`mutAnim`). The ground goes by at the stride measured on THIS rig (`measureGaits(u, only)` — 2.39 m/s on the pale one against the source's 2.04). It drips blood, gasps, holds no token, and after 3.4-5.6 s `mutBleedOut` drops it into the ragdoll along its run with no hitstop and no shake. Verified by drawing the source's and the retarget's joints side by side as stick figures, front and side, at six phases: pose for pose the same run (the hulk's is the same run on longer arms).

**THE MARAUDER HAS NO KICK AND IS NEVER KNOCKED DOWN, AND HE SHAKES OFF A STUN FASTEST.** `uKick` is out of his `use` (its weight to the stab and sweep) and his `knockClip`/`knockAfter` are gone, which is what gates every knockdown path. `kind.stunK` scales the parry's `MUT_STUN` (and the reel's clock with it): his is 0.50, 1.05 s against everyone else's 2.1, and `recoilK` 0.42 is the shortest stagger in the game.

**THE MARAUDER'S MOVES ARE HIS OWN.** The owner's word: completely different from every other creature, even the walk and the run — and the borrowed run (the knight's pack, retargeted) made him look sideways. `authorUmbraClips` retargets ONLY his combo now (`umbraMoves`, no `tavRetargetAll`), and `authorUmbraOwn` writes the rest on his own `uStance` (Pose3) through `poseRig` with `UMBRA_ALL` (both pairs of arms): `uWalk`/`uWalkB` (a swaying stalk, blades drifting), `uRun`/`uRunB` (pitched nearly flat, head leading, blades folded back), `uStrafeL/R`, `uSideL/R`, `uHit`, `uHitBig`, `uParry` (the stun reel), `uDodge` (a tucked vault), and four blows — `uImpale` (uStab), `uReaper` (uSweep), `uWhirl` (uSpin, ends on a whole turn), `uDescent` (uLeap, the clip is the swing's length so take-off is `wind - LEAP_AIR`). His rig's conventions, measured: thigh +right = leg back, calf +right = fold, chest/waist +right = pitch forward, arm -right = forward/up, `hipY` metres. Measured live: 186 frames running at you, 0 degrees between his heading and his travel. A pane trap from authoring it: `__grid`-style tests must disable EVERY action on the mixer (`u.mixer._actions`), not just `u.clips`, or each test clip stays at weight 1 and they all average into one pose.

**AND HE HAD NO SIDEWAYS STRIDE AT ALL — the oldest animation bug in this
file, and the last creature carrying it.** `strafeL` and `strafeR` were
ALIASED ONTO THE WALK, so the half of a fight the samurai spends holding his
distance was a man striding forward while travelling sideways. The eight
Mixamo clips he was given contain no side-step and the packer's source is a
.blend on the owner's other machine, so it is written on the rig, the way the
witness's and the knight's whole move sets are — and the alias had to come out
of his map, because the alias pass runs AFTER `kind.author` and would have
replaced it on the next line.

**IT DRIVES THE LEGS AND NOTHING ELSE.** Every hand-authored clip on this rig
has read badly and all of them failed the same way — built up from a bind pose
that is a T, so the arms come off the sword. `build` writes every UNDRIVEN
bone from the stance, which here is the retargeted idle's own two-handed
guard, so his upper body is untouched Mixamo and only his feet are authored.

**AND `-cos(ph)/2` IS NOT ACTUALLY A FOOT THAT STAYS PUT.** That is the phase
this file wrote down for the reptilians and it gets the important half right —
the foot moves outward exactly while it is in the air — but its speed under
the body is a SINE, and a planted foot has to travel at exactly the speed the
body does or it scrubs. Measured on the first build: 1.38 m/s of planted drift
against a clip declaring 1.25. The offset is LINEAR while the foot is down and
eased while it is up, which is the only shape that has a foot stand still.

**WONG'S AND THE DRUNK'S RUN WAS EVERY JOINT TURNED, NOT THE BODY.** Their
packs predate "a facing is a property of the rig": the packer read each
clip's facing off that clip's own first-frame toes, and every delta it wrote
is CONJUGATED by that facing — so a clip measured ψ off does not turn the
body, it turns every joint's swing axis by ψ. A run ~90° off swings the legs
sideways under a torso that still faces forward. Each clip stores its rest
under its own facing, so the error is exactly the yaw between its rest hips
and a reference clip's: Wong run -67, strafes -76/+69, flying kick -67; the
drunk's run +116, running turn -48 (the orc, packed after the fix, agrees
everywhere). `kind.facingRef: 'walk'` conjugates every clip back onto the
walk's facing in `ntarRetarget` (and the alignment's rest is read from that
clip too). Measured by the feet's stride axis against the shoulders: the run
went from 96/97 degrees (sideways) to 171/161 (forward, mod 180), and Wong's
strafes now stride sideways as they should. **The knight and the red alien
carry the same fault on some clips** (knight: hit reactions +56..+85, runB
+85, strafeL -84; alien: nSweep +99, dodge +95) and are deliberately NOT
changed yet — their fights were tuned on the clips as they are. Setting
`facingRef` on them is the fix, and wants a look at the fight after.

**THE FIRST HORSESHOE CRAB IS OUT** (never added to the scene; the item and
the wreck's crab are untouched), and **THE DRAW HAS ITS SOUND**: `sfxDraw`
is timed to the 3.4 s extraction — the cap, the needle finding the hinge and
punching through, the rubber plunger's stick-slip and the blood gurgling up
the barrel higher as it fills, three twitches of the crab's legs, and the
wet pull out. The old one was a quiet swell routed round the effects bus.

**THE MARAUDER HAS TWO KICKS, A KNOCKDOWN, AND A MIND.**
- The owner's `Kicking`, `Inside Crescent Kick` and `Death From The Back`
  (`tools/ntar_moves.py -- umbra`). `Kicking` is two kicks in one take, so it
  is cut at the valley (frame 17) into `uKickA` / `uKickA2` and ALWAYS
  chained; `HIP_FROM_TAKE` measures the second half's hips from the take's
  first frame, or the body drops at the hand-over. Every kick runs at its
  clip's own speed with its root turn kept and `noAim` (the aim turns a
  thigh toward you, which on a kick is a different kick). Checked as stick
  figures against the source joints in Blender, frame for frame — the way
  to verify "exactly like the animation" when a Mixamo FBX has no mesh.
- `uFall` is his knockdown: `knockHeavy` 0.17 on any heavy of yours that
  lands, never twice in 16 s, never on the blow that woke him. The blow
  TURNS him over the stagger (`knock.turn`, walked a step at a time on the
  heading of the moment) so he goes down across your line and not onto you;
  his file has no get-up, so the rise is the fall reversed from where he
  LANDED (`riseFrom`, after a `twitch` that rewinds the settle), and he turns
  back to you in the last of it. 4.2 s end to end.
- `umbraMind`: he punishes a drink, a whiffed swing, a held guard (with the
  crescent kick or the whirl) and a heavy wound up out of reach (with the
  leap), each by taking his turn at once; and he stops opening with what you
  have parried (`st.parried`, in the smart draw). Harder numbers throughout.
  Measured against a player standing still: 82 swings and 50 damage a minute.
- **HARNESS TRAP: never stub `Math.random` while a model may still be
  loading.** three's `generateUUID` is `Math.random`, and every
  `AnimationClip` built under the stub got the SAME uuid — the mixer's cache
  is keyed by it, so all thirty of the marauder's clips became one action
  ("Pose2") and he stood still through every swing.

**THE FACING REFERENCE IS THE RIG'S OWN REST, `facingRef: 'mixamo'`.** Every
pack made after the packer fix (orc, marauder, crawler, mutants) stores the
same rest hips to the degree — Mixamo's bind facing, `MIXAMO_REST_CLIP`. A clip
used as the reference is only as right as that clip: measured against it, the
knight's walk was 9 degrees off, the red alien's knockdown -66 (his kick +34,
his handspring +29), Wong's walk +2 and the drunk's -12. All four kinds use it
now. Three things came with it: the alignment's rest positions are brought
back onto the reference by the reference clip's own correction; the packer's
lying angles (`clipAz`) and root travel (`clipTravel`) turn with the clip, by
`FIX_SIGN * yaw` — the sign MEASURED on the knight's knockdown, the lie angles
move against the correction; and the alien's kick contact moved 0.696 → 0.678
with its sweep. Measured on the knight after: every forward gait strides 0-1
degrees off his travel and every strafe and side step 85-94 (runB was 87,
running sideways); on Wong and the drunk the same; on the alien, 42 swings and
50 damage a minute with the kick landing 0.22 m from the chest. The knight's
fall and rise now meet with about 9 degrees left for the rise's turn to take
up (4 before). The way to measure a clip's facing: pose it frame by frame and
take the principal axis of the foot-to-foot vector — along the body's travel
for a gait, across it for a strafe.

**THE THING OUTSIDE THE PAVILION FIGHTS WITH THE KNIGHT'S BLOWS.** His file
has no real attack in it — his "grab" was the start of his run, his charge was
the run cycle, and his two main swings were windows cut out of a clip of him
clawing at the ground — which is the whole of "his animations and hits are
awful". `authorScpClips` retargets the knight's punch, sweep and turning blow
and two real sideways strides onto his rig (`SCP_JOINTS`, `facingRef:
'mixamo'`), RENAMED (`SCP_TAKE`) so the knight's walk, run and hit reel do not
replace his own, which are his; `clipSpeed` is moved to the new names. His
swings are `scPunch` / `scSweep` / `scSpin` in his own section, because he is
built at module load, fifteen thousand lines before the knight's table exists
(`makeMutant` read `.wind` off undefined and the page died). Easier on the
owner's word: hp 28, `windK` 1.15, `aggr` 1.9, `press` 0.72, two-deep chains,
rare feints, a softer second half. Measured hands-off: 40 swings and 44 damage
a minute became 26 and 31, every blow landing 0.05-0.35 m from the chest, no
turn over 4 degrees a frame. **He is invisible until seen from the window**:
a harness that wakes him with `wakeScp` must set `u.g.visible` itself or every
still is of an empty beach.

**THE TRIBE'S FIRE IS WHAT MUTANTS WOULD MAKE.** (SUPERSEDED — see the end of this file.) Nothing built: nine seeded
branches and drift logs thrown in from every side with one end in the coals
(so `emberWood` chars only that end), a bleached log across the edge, a poking
stick, coals spilled to one side, a ring of lumpy stones (icosahedra knocked out
of round — dodecahedra read as dice) with gaps and two kicked off, bones and a
half-buried ribcage in the ash, and a spit of two forked sticks with meat on it.
The flame sheets are off-centre where the wood is.

**THE MARAUDER HAS 62 HEALTH AND 16 POISE** (was 96 and 20), on the owner's
word.

**THE MUTANTS' FIRE HAS NO RING OF STONES AND NOTHING COOKING** (the owner's
word). It is a fire that has burned all night: a star of five heavy dark logs
(r 0.10-0.135, bark at 0x4e443c — at the bark's own brown a log a metre from
the flames glowed like a lamp) pushed in until their ends meet, the fallen
remains of the teepee it was lit with, two split lengths thrown on last, 56
coals heaped in the middle, and an EMBER BED: a low dome with a shader of its
own — crusted char and grey ash with the orange breathing through the cracks
in slow patches the breeze moves across — whose ash thins into the scorch with
no rim (a paler ring read as a disc on the sand). Flames stand where the log
ends meet, with lower tongues licking along each log's burning end.

**THE FIGHT CONTROLS ARE ONE ROW AT THE BOTTOM, FOR THE FIRST CRAB FIGHT
ONLY.** `#fighttip` is four entries — click / hold click / shift + hold click
/ right-click — in a single row 118 px off the bottom, over the stamina strip;
no parry line, nothing lit through the crab's wind-up. It goes after a minute,
when that crab is dead, or in any room. It wraps below 620 px of width.

**THE SAMURAI IS 2.45 m, AND EVERYTHING THAT IS A DISTANCE GREW WITH HIM.**
A third bigger than the man he was: `reachK` 1.36, `body` 0.62, `hitR` 1.10,
`landSlop` 0.68 and `clipSpeed` (measured at 1.86 m) scaled by the same
1.317, or a bigger man swings at the air and his feet skate. `lungeStop` 1.62:
at a man's stopping distance his blows came from over the top of the frame
(he fought at 1.15 m). Harder by health, poise and guard rather than by his
tells: hp 58, poise 13, block 0.56, `recoilK` 0.60, and a second wind at half
health (`rage`, his taunt as `rageClip`) that quickens everything between the
cuts. Darker (`tint` 0xbdb3b0, `emis` 0.10) with a dull red rim, and two
red eyes in the mask (`samuraiEyes`, from `warmMore`: sprites on the head
bone placed by `SAM_EYES` in his facing frame, faded up as he wakes, hot at
his rage). Measured hands-off: 58 swings and 55 damage a minute at 1.87 m.

**BROKEN BONE CRUMBLES (`gib.crumbleAt`).** A skull pile's pieces and every
loose bone (`catScatterBones`, the bones he kicks) fall in on themselves 1.2-3
s after they are thrown — shrinking, sinking, a small puff of dust
(`boneDust`, three of `idolDust`'s sprites) — and are gone: a broken pile is
bare stone by 3.5 s (49 pieces to none, measured). They carry `keep` so the
rubble fold never takes them first.

**TWO PARASITES IN THE BELLY, AND NEITHER HAS A CLIP OF ITS OWN.**
informatica e manutenção's "Parasite L Starkie" (CC-BY-NC-4.0 — NON-
COMMERCIAL, the severed head's situation; `assets/parasite.glb`, `gltfpack.py
--tex 1024 --no-clips --drop-mr` after setting its material OPAQUE, because
its BLEND alpha was 1 % of the atlas and kept the colour a 1.4 MB PNG — 0.88
MB as a JPEG). A Mixamo rig (`Hips_01` … `RightLeg_00`: `PB(name)`), so every
pack in the game retargets onto it through `kind.rag`.
- **A MOVE SET IS A LIST OF `[pack, { name here: name there }]`**
  (`PAR_SRC_A`/`_B`, `authorParasiteClips`): each pick is renamed on the way
  in, because four packs each have an `idle` and a `run`, and built the frame
  the LAST pack has landed (`u.parLate`, polled from `parasiteUnitPre`), since
  the `*MovesLate` slots are single callbacks already taken. THE LEAPER: the
  knight's jab/sweep/360/pounce, the alien's compass kick and handspring,
  Wong's flying kick, the crawler's crawl, the orc's roar. THE DANCER: the
  Marauder's five combo windows and two kicks, the orc's kick/whirl/leap and
  hit reels, the drunk's idles and stagger, Wong's run, strafes and ginga. The
  swings are new `MUT_ATTACKS` keys (`pa*`, `pb*`) copied off the source
  entry — the same clip keeps its measured `hit` — with `limbs` re-indexed
  onto this rig (0 R arm, 1 L arm, 2 R leg, 3 L leg, 4 head).
- **THEY LET THE SEVEN GO FIRST.** `kind.ownTurn`: they never take the pack's
  token (`mutGiveToken` skips them) and swing on `parasiteSwingOK` instead.
  While any demon is awake each HOLDS on an 8-11.5 m ring on the side of you
  the pack is not on (`parasiteHold`), and every 3-9 s one RAIDS (only one at
  a time; at once if hit): it sprints in, throws one to three swings, and
  turns its back and scuttles out before it turns round to watch. With the
  seven dead both hunt, a beat apart. `kind.mindFn`/`mindMap` is the
  Marauder's four reads (drink, whiff, turtle, a heavy wound out of reach)
  onto their own swings. They wake with the pack (`parasiteAlarm`, called
  from `demonAlarm`) or at 13 m, turning round from the flesh with a shriek.
- `kind.clawRe` lets `claws` name a Mixamo rig's finger bones.
Measured hands-off, player standing still in the arena: with the seven up,
7 raids and 15 parasite swings in 45 s on top of the pack's 50; with the seven
dead, 39 and 77 swings a minute and about 80 damage a minute between the two
(the belly's shared half-second hurt gate still applies), fighting at 1.0-1.9 m
with every blow in frame.

**THE DEALER'S PUMP (`buildBleedRig`, from `buildBunkerProps`).** The machine is
the reel-to-reel at the -z end of his console bank (its face measured by
raycast at room-local z -0.44, x -2.93..-1.95, reels from 1.10 m; the reels
already turn on the room's ambient clip). Bolted to it: a shelf and a jar tray
with brackets, built as boxes in the MACHINE'S OWN MATERIAL with every uv
squeezed into a patch of that machine's own face (`BLEED.uv`, u 0.80-0.86 v
0.105-0.16 of the atlas region the raycast found), so the steel is the same
paint and the same light. Two crab scans (`makeCrabRelic`) seated on it by
their measured box, a syringe in each hinge in the extraction's own pose
(`_hinge`, rot (0.95, 0.5, 0), scale 1.4), a translucent line from each barrel
over the shelf's edge into a jar (`makeBloodJar`) on the tray that fills by the
drop (`updateBleedRig`: syringes stroke, crabs jerk against their straps,
drips tick). NO COLLIDERS and nothing out of the walk grid. Two things it
needed: **a crab dressed for the beach is a lamp indoors** — the scan carries a
gamma re-expose and a fifth of its map as emissive for moonlit sand, so these
two wear clones (which drop the `onBeforeCompile` lift) at emissive 0.05; and
**so is the jar** — its blood glows its own blue so it is found on dark sand,
so these wear clones at 0.55 of the colour and a fifth of the glow. The two
jars are pickups (`gives: null`: a number, not a slot) and on the save as
`bleedJars`, a bit each.

**THE TALL ONE AT THE PAVILION (`updateSmileWatch`, `smileWatch` on the save).**
1.1 s after you reach the round room's floor he is put back in the scene —
the same figure his run into the sea removed, so nothing else can switch him
on — at the one of four spots furthest from where you are looking, at the
WATER'S EDGE (`shoreLineJS` + 0.9) 15-23 m along the beach, turning slowly to
keep his face on you. The spots are chosen by contrast: black on dark sand
measured as a handful of pixels, against the surf he is a silhouette; and
further than ~14 m so he shows over the sill from the middle of the floor. The
frame `mushWhere` leaves 'floor' he is removed for good (the stair's walled
shaft can't see out, so he is never seen to vanish). Once a game.

**AND "SLIDING" WAS MEASURED, AND IT WAS NOT THE CLIPS.** Walking a unit at a
fixed speed with `mutAnim` and reading the planted toe: the average drift
ALONG the travel is ~0 at the measured `clipSpeed` (a 0.6 or 1.5 scale gives
-1.5 or +0.7 m/s), so the rates were right. What slid was the body: demons
turned at 8 rad/s on the spot (3.8 now; parasites 3.2), lunges (`lungeK` 0.30
demons, 0.34 parasites), and speeds past what a clip can stretch to —
`velGaitAnim` now caps the frame's step at 1.8x the playing clip's stride
(`capStep`), rates run 0.3-1.8, and walk hands to run at 1.75x walk speed.
`tools/bellyrun.js` (`__bellyRun(frames)`) samples a hands-off fight: blend
weight leaks, clip use, swings, damage, and a planted-foot slip that includes
rolling (so ~0.3-0.5 m/s is its floor, not a slide).

**THE DEALER'S PUMP IS TO SCALE.** The crabs are 0.64 of the scan side by side
with two straps each, the jars 0.62 and ink-dark, the line a visible 7.5 mm
tube over the shelf's lip. **The belly** has a cold moon wash over the whole
gut (`uWhMoon` 1.5, strongest on up-facing flesh), the four cut lamps summed
into the flesh shader so they light it from anywhere, and a lighter, colder
fog. Belly enemies +3 hp each (demons) / 54 and 49 (parasites) with quicker
tells and three pressers while five or more are up; the knight is 44 hp,
block 0.40.

**`hit` IS A FRACTION OF THE CLIP.** The knight's three authored swings
(`kOver`, `kBack`, `kStomp`) are keyed in SECONDS, and their table rows gave
the contact key's own time as `hit` — 0.846 of a 1.95 s clip is 1.65 s — so
the overhead's damage landed as his gauntlets were already rising again, the
better part of a second after the slam. `hit` is the key's time over the
clip's length now, and the overhead's fall is a quarter-second segment of its
own. Measured: arms up by 0.77 s, held to 1.15, down over 0.3 s, damage at
1.47 with the hands at the bottom. Any clip built with `poseRig`'s `build`
is keyed in seconds: divide.

**THE SAMURAI HAS THE ORC'S GREAT-SWORD SET (`samuraiPick`, `SAM_PICK`), AND
`ntarRetarget` LEARNED FORESTS.** His file carries five swings and the source
.blend is on the owner's other machine; the orc's pack is the same Mixamo set
his own clips came from. Two things the retarget could not do on his Rigify
rig, both now options (9th argument):
- **`forest`**: his shoulders, upper arms and thighs are ROOT chains, so a
  retarget that writes rotations left them at their bind positions while the
  chest turned and the hips dropped. Each root names its virtual parent
  (`SAM_FOREST`) and its position is carried by forward kinematics off it every
  frame, in the model's frame; an unmapped root (sash, scabbard) rides it
  rigidly. **Only an unmapped root is rigid** — the first build overwrote the
  mapped arms' rotations too and he fought in a T.
- **`keep`**: an unmapped bone falls back to the BIND, which for fingers is a
  flat hand; `keep` puts them on his idle's own local so the fist stays shut.
Built at `placeInDojo` (45 ms, behind the portal's white). New swings: `gCutC`,
`gCutD`, `gCutE`, `gChop`, `gLeap`, `gSlide`. **Their contact fractions are
measured on HIS rig** (the frame the blade passes nearest a chest 1.5 m in
front), not copied off the pack: the pack's `oCutE` 0.17 is in the wind-up and
`oSpin` 0.533 has the blade behind him (it landed at 1.3 m from the chest — the
spin is out of the draw). `aimK` 3.3 with `yawK` 2.6. Measured hands-off: 62
swing starts and 60 damage a minute, blade 0.27-0.55 m from the chest by median
on every sword swing, the leap opening from range.

**HARDER:** the samurai 96 health, poise 18, guard 0.68, quicker and keener,
five-deep chains and a stronger second wind; the seven demons one more point
each and a shade keener; the parasites 60 and 54.

**ON A FOREST RIG THE SHOULDER DOES NOT FOLLOW THE ARM UNLESS IT IS TOLD TO.**
The samurai's upper arms are ROOTS beside his shoulder bones, so anything that
turns an arm — the throw's solved pose, the aim correction — leaves the
shoulder guard where the clip put it: the "weird shoulder" and the stretched
collar. `kind.shoulderFollow` (`aimShoulderFollow`) gives each arm's shoulder
40 % of every aim turn, and the throw's clip rewrites the shoulder track from
the arm's own turn away from the stance (45 %). Both bones are roots under the
same armature, so the arm's local turn is already in the shoulder's frame.

**HIS LEFT HAND IS A LIMB NOW, SO THE GRIP HOLDS.** `rig.armL/foreL/handL` make
it chain 1 (the kicks moved to `limbs: [2, 3]`), his two-handed cuts are
`twoHanded`, and `kind.grip` corrects the sword arm and puts the left hand back
on the handle — before, the aim dragged the right hand off and left the left
holding air. **And he has the life layer** (`installLife`, `SAM_LIFE_J`):
breath, weight in the chest, his head tracking you — with no hip, because a
pelvis moved on its own parts company with the thighs on this rig.

Harder: 118 health, poise 21, guard 0.74 (0.80 enraged), quicker and keener;
a throw is one star, two a third of the time, three fanned enraged, every
8.5-14.5 s (6-12 enraged). Measured hands-off: 66 swing starts and 73 damage a
minute, four throws a minute.

**TWENTY FARMERS COME OUT OF THE CASTLE'S DOORS BEFORE THE MARAUDER STIRS.**
KIFIR's "Farmers pack Low-Poly" (CC-BY-NC-4.0, **NON-COMMERCIAL**), three men
on one Mixamo rig with no clips: `assets/farmer-woodman.glb` / `-farmman` /
`-workman`, each `gltfpack.py --nodes "^Woodman$"` and then pruned of the
other two skeletons (the file carries all three skins; the pruned GLBs are
~130 nodes against 271). They are `MUT_KINDS.farmer0..19` built off
`FARM_BASE` + one of eight temperaments (`FARM_KINDS`: brawler, hacker,
stabber, smith, maniac, coward, brute, jumper) + a roster line (`FARM_ROSTER`:
file, height, tint, scaled bones, which of hat / bag / hair / beard he kept,
voice pitch, a borrowed tool). What it took:

- **THE THREE STOOD SIDE BY SIDE IN THE SOURCE SCENE,** so two arrive a metre
  and a half off their own origin. `farmPre` (a new `kind.pre` hook, run first
  in `dressMutant`) recentres on the hips; and it REMOVES the parts a man did
  not keep, never hides them — `skinnedBounds` measures every skinned mesh,
  shown or not, and a hidden basket makes him short.
- **ONE UPLOAD PER MAP.** Twenty parses hand out twenty copies of every
  texture; `FARM_TEX` gives every later copy the first copy's maps.
- **EVERY MOVE IS AUTHORED, ON HIS OWN STANCE** (`farmKeyDefs`, `poseRig`):
  they bind in an A, so `FARM_STANCE` is put on the bind by world-axis turns
  (`lifeTurn`) BEFORE `poseRig` reads it, and every clip is a delta from a man
  and not a scarecrow. Clips are cached per FILE (`FARM_CLIPS`) — bone names
  are the file's, so three authoring passes serve twenty men. Four idles,
  two walks, two runs, strafes, three hit reels, three war cries, seventeen
  swings (`fChop`…`fKick`, contact key at `wind / dur`, so `mutClipTime`
  plays them in real time) and five ways out of a door (`bCharge`, `bLeap`,
  `bStumble`, `bKick`, `bSprint`).
- **THE TOOL GOES THROUGH HIS FIST** (`farmArm`): the loose axe / rake /
  hammer meshes are measured once (PCA: the head is the FAT end, the bit is
  the side the head leans), then put on the right hand at the stance — the
  handle along the knuckle line (index→pinky), the head toward the thumb,
  gripped near its end — and `u.bones.tip` is its head, so the aim and the
  sweep use the steel. **A RAKE USED AS A SPEAR LIES ALONG THE ARM**
  (`kind.spear`): across the forearm, the thrust stood the shaft upright and
  lunged with the tines at the sky.
- **THE DOORS ARE LIFTED, AND SO IS WHAT IS BOLTED TO THEM** (`buildFarmDoors`,
  in `loadFort`). `acmat_16` is the plank slabs (186 triangles each), but the
  strap hinges, the lock plate and the ring are four OTHER materials
  (`acmat_10/11/12/14`) in other merged meshes — left behind, they hung in the
  empty doorway. Everything wholly inside a door's own slot goes onto a pivot
  at its hinge; the triangles leave the merged meshes. The leaves stay in the
  wall index where they were drawn shut, so no doorway is ever a way in.
- **OUTSIDE IS WHERE THE COBBLES ARE.** The houses have ROOMS in them,
  floored in boards a hand higher than the paving (0.88 against 0.82 in the
  pack's metres) — so "the side nearer the street's middle" put a tower's door
  opening inward, and `fortCourtAt` (within 0.35 of the paving) called the
  boards street. `farmCobble` is the one test for outside.
- **THE FIGHT IS THE DEMONS' PACK ON ITS OWN LIST** (`updateDemonPack(dt,
  farmUnits)`, `demonHold`, `u.packList`): `pressMax` 3, the rest circling;
  `updateFarmers` (from `tickFort`) opens a door the moment there is room —
  three at you, then four, then five — two together now and then, the doors
  chosen near you, in view, and not just used. `farmFightDone()` gates the
  marauder's wake; `fortFarm` is on the save and `farmRetireAll` restores it;
  leaving the castle mid-fight sends the living back indoors (`farmCalm`).
- **SWARMED IS NOT A DEATH YOU COULD NOT SEE:** farmers share the demons'
  hurt gate at 0.95 s (`demonLastLand`). Measured hands-off with three out:
  **34 damage and 81 swings a minute** (the Dealer is 40 and 48); the whole
  fight, one killed every three seconds: all twenty out and down, five at most
  on you at once, 38 damage a minute.
- **A KILLING BLOW THROWS THEM ACROSS THE STREET** (`ragK` 4.6, `ragVmax` 26,
  `ragEven` — the feet kicked with the chest so the body LEAVES rather than
  folding over its boots — and `ragLift`, new, for air time). Measured: 9-10 m
  of hips travel in open street (other creatures 3-5), lying flat and asleep;
  shorter only where a house wall stopped them. `goreK` 1.7 and `bloodK` 2.0
  (both new hooks, in `finishMutant` / `hurtMutantCore`) double the spray.
- **Dev mode hands over every ring too** (`devGrantWeapons`): as many worn as
  there are slots, the rest in the pack.

Harness traps, all paid for this round (`tools/farmfight.js`,
`tools/farmpose.js`):
- **A FAKE CLOCK MUST BE FULLY FAKE.** `real() + off` advances game time by
  the real cost of each stepped frame as well as the 16.7 ms added — every
  rate came out two or three times too high. `base0 + off`.
- **SETTING `farmFight.done` WAKES THE MARAUDER**, and his blows then count
  as the farmers'. A measurement of the farmers puts him out of it.
- **A TELEPORT INTO THE CASTLE FIRES THE HORDE'S TAKE** a frame later:
  step until `frozen()` has been false for forty frames, not until it is
  false once.
- A test's still from inside a narrow street is a wall: film the doors from
  the cobbles side at a slant, through a 38-degree lens.

**THE FARMERS FIGHT IN MOCAP, AND A BLOW THAT COUNTS IS A BLOW THAT
TOUCHED YOU.** Measured before (`tools/farmhits.js`, `__hitsRun`: the fight
hands-off, the player NOT pinned, looking at the nearest): 25 of 43 landed
blows were scored with the weapon more than 0.35 m off the body (median
0.49), because `limbR` was 0.7, the lunge started ON the contact frame so a
swing thrown from 1.5 m landed with the head of the axe in the air, and the
authored contact poses were beside him. Now:
- **THEIR MOVES ARE RETARGETED** (`FARM_MOCAP`, `farmMocap`, applied late
  through `u.parLate` if a pack has not landed): the knight's walks, runs,
  strafes, side steps, hit reels, punch and swipe; the orc's idles, cuts,
  chop, spin, leap, kick and hit reels; the zombie pack's punches, kicks and
  head-butt. `poseRig` is taken BEFORE `farmStance`, or the stance is folded
  into every retargeted frame.
- **THE SWING TABLE IS MEASURED** (`FM(clip, contact, cock, Z)`: Z is how
  far in front of him the striking end is at the contact); `stop` is a hand
  short of Z, and `FARM_MOVES[tool]` maps each temperament's generic moves
  (cut, chop, thrust, kick...) onto its tool's own rows.
- **THE LUNGE ARRIVES WITH THE BLOW** (`lungeLead` 0.30): it starts that far
  before the contact and, up to the contact, covers exactly what is left to
  `stop`, so a player knocked back a step by the last blow is still reached.
- `limbR` 0.32, `landSlop` 0.30, `bodyLow` 1.5 (the torso segment reaches
  the thighs, where a kick lands), `aimDrop` 0.25.
- **A FLINCH IS A SPRING ON THE SPINE** (`mutFlinch`, from the `hurtMutant`
  wrapper; `lifeApply` turns waist, chest, neck, head and clavicles back
  along the blow and twists, with a hip dip) and a slide off the blade
  (`flinchPush`, clamped by the room).
- **A BLOW INSIDE THE SHARED GATE STILL ARRIVES** (`grazePlayer`: flash,
  sound, the head thrown by `hurtThrow`, no health), so you always see and
  feel being hit. The gate is 1.05 s.
Measured after, three 40 s samples: 55-62 swings a minute, **every blow
landed within 0.32 m of the body, 0-1 scored further**, and 49.5-57 damage a
minute against the 52 it was.

**THE SAMURAI'S "LONG NECK" WAS HIS FOREST ROOTS STAYING BEHIND
(`kind.forestFK`, in `installLife`).** His shoulders, upper arms, thighs and
pelvis are ROOT bones beside the spine, so any clip written on the rig (the
stagger, the taunt, the throw, the side-step) turned the chest and left the
shoulders where the stance put them: measured 1.35-1.52x their own distance
from the chest, which is the collar and neck skin pulled out. Each root is now
carried at its stance offset from `SAM_FOREST`'s parent after the clips and
the life layer, positions only; every clip measures 1.000. And his blows have
to be THERE: `blowLands` sweeps only the chains the swing names (`A.limbs`) —
it swept all four, so his other hand or his knee landed the cut — with
`limbR` 0.42, `landSlop` 0.42, `lungeLead` 0.30, `reachK` 1.14, `aimK` 1.40,
`yawK` 1.60. Measured: hits land at 0.94-1.59 m with the steel 0.11-0.64 m
from you.

**THE SAMURAI'S SWORD RIDES THE CLIP'S OWN OFFSET.** `pinSamuraiSword`
captured hand^-1 x katana off the first calm LIVE frame — after `forestFK`
had moved the hand half a metre from where the clip stamped the katana —
and the sword rode beside him for the whole fight (measured (0.31, 0.47,
-0.07) against the clip's (0.006, 0.116, 0.006)). The offset comes off a raw
stamp of the idle (`mixer.rawUpdate`, every other action off, the state put
back) and is then applied to the live fist. `tools/samstrip.js` captures it
the same way.

**THE KNIGHT'S "HIT TO SIDE OF BODY" AND "HIT ON SIDE OF HEAD" ARE OUT** for
the knight, the farmers and the parasites (aliased to `hitBig` / `hit`).
Measured by scrubbing each reel on a farmer's rig: the side-of-body one
turned the hips 84° and went UPSIDE DOWN (upright -0.91), the side-of-head one
fell nearly flat (0.23) and turned 46° — de-yawed frame by frame, that is a
body spinning. The rest turn 5–10°.

**THE FARMERS' AND PARASITES' MOCAP PLAYS AT ITS OWN SPEED (`kind.natural`,
`naturalSwings`).** The retarget was measured correct (every joint within 1-3
degrees of the source, sampled ON frames — between frames a fast clip reads
as a mismatch). What was wrong was playback: `real`/`cock` holds and eased
wind-ups stretched and squashed a Mixamo swing into the table's startup. A
natural kind's swing is played at the clip's own rate, its startup is the
clip's own time to contact, and its recovery is whatever the clip has left;
`velGaitAnim` keeps a natural kind's gait rate within 0.7-1.25 of the clip's
own and hands walk to run later, so a stride is a stride.


**A BLOW COUNTS WHEN THE WEAPON TOUCHES YOU — MEASURED (`tools/contact.js`).**
`__contact(u, N)` plays a fight on a fake clock and, on every blow that takes
your health during a swing, measures the nearest point of the chains the swing
names (`A.limbs` → `u.limbs`, a bar run on past the fist) to your torso (a
segment 0.15-1.25 m under the eye). `__orcBoot()` and `__roomBoot(room, glb)`
set fights up (devMode off for the throne room: the marauder's mind does not
swing in dev mode). Findings, 2026-10-02:
- **The defaults were a third to half a metre of air**: `limbR` 0.70 and
  `LAND_SLOP` 1.0 for every kind that set none (dealer, scp, warden,
  reptilians, beast, ntar, knight's limb, wong, drunk, marauder, parasites).
  Now `LIMB_R` 0.45 and `LAND_SLOP` 0.5.
- **Two kicks were scored on the wrong chain**: the orc's `oKick` on his LEFT
  ARM (`limbs: [1]`; 0 sword arm, 1 off arm, 2 leg) landed with the boot
  1.6-1.85 m away; the marauder's `uKickA2` on the right leg when it is the
  left again (0.55-0.61 m). **Check a swing's `limbs` index against
  `mutLimbs`'s order (hand, handL, then `rig.limbs`/extra).**
- Results: orc every hit ≤ 0.23 m (median 0.14), samurai median 0.24 / p90
  0.38 (limbR 0.33, landSlop 0.28), crusader 0.32, marauder median 0.19-0.23.

**`mutPlay` FADES FROM THE WEIGHT AN ACTION HAS, NOT FROM 1.** three's
`fadeOut()` is `_scheduleFading(d, 1, 0)` whatever the action's weight, so a
clip change made while earlier fades were still running RESURRECTED every one
of them at full weight; the mixer averages by weight, so the new clip was a
fifth of the pose and arrived all at once as they died (measured on the
samurai: seven locomotion clips at 0.35 under a swing at 0.65, and a fist
jumping a metre). Every creature goes through `mutPlay`, so this changed all
of them — but only during a switch made mid-fade, which is exactly where they
popped. A loop chosen again while it is still fading out picks up where it is.
The crab (`crabPlay`-style loop near the crab mixer) and the tall one
(`smileClips`) still call `fadeOut` directly and have the same bug.


**A SHOTGUN KILL HAS NO IMPACT FRAMES, AND A BODY IN THE AIR HOLDS STILL
THROUGH A HITSTOP (2026-10-09).** Three things, found on the farmers:
- A killed creature stands in its last pose for the whole hitstop (`struck`
  branch) and `finishMutant` runs when it drains. The double stacked 0.14 +
  0.24 s of freeze, so the farmer stood WHOLE for a fifth of a second before
  he came apart — it read as lag. `sgFinish(u)` finishes the kill on the
  shot's frame and `sgKillBeat` holds 0.05–0.085 s, so the freeze holds the
  pieces just as they leave.
- That exposed an old bug: the ragdoll's flight cap is a DISTANCE PER SUBSTEP
  (`vmax × h`), and hitstop scales dt to 8% — so a ragdoll made (or still
  flying) during a freeze had its whole throw clipped away (0.5 m instead of
  5). `updateMutRagdoll` returns while `hitstopFrame || hitstop > 0`.
  **`hitstopFrame`, not `hitstop`**: the frame the freeze drains to zero is
  still a scaled frame (set at both drains, `animate` and `__bw.step`).
- **The flight cap scales the whole velocity**, lift included: a throw of
  25 m/s capped to 11 kept 40% of the lift and the hips never left the paving.
  For a blast (`u.st.killBlast > 0.05`) `mutRagdoll` caps the horizontal kick
  at `(6 + 5.5k)·kw` and keeps the lift whole (`+ k·(1.2 + 2.2h)`), and the
  rag record carries its own `vmax` (10 + 6.5k) and `travel` (6 + 5k), which
  win over the kind's `ragVmax`/`ragTravel`. `mutSever` keeps `pieceK` at
  >= 0.80 + 0.25k for a blast and lifts the piece.

**THE MAN FROM THE WELL (`MUT_KINDS.wellman`, 2026-10-10).** RINONO's
"animation zombie 2" (CC-BY-4.0, `assets/wellman.glb`): 2.8k verts, sixteen
clips of its own, faces +Z (`faceFix` 0), 1.92 m (`h`), 44 hp. Contact
frames measured off the clips with `tools/glbsheet.js` (the hand or head
furthest forward): attack01 0.46 (left hand), attack02 0.50 (right), eat
0.35 (a crouched bite, both hands), on_all_four_A 0.71 (the head, dropping
to all fours — used as a lunging drop, lunge 2.6). `rate` 1.3–1.6 on each.
`caution` is the crouch he freezes in; `damage`/`down` the hits, `death` the
fall. `speedK` 1.75 with `gaitMax` 5 (his run clip is 0.79 s a stride) and a
`st.sprint` 0.95 burst on every charge. The weeping-angel part is
`updateWellMan`: between swings, past 5.5 m, every 2.5–7.5 s he is put to
sleep (`awake` false, `holdAnim`, `caution` at 0.6) for 0.9–2.8 s and woken
with the burst; a blow wakes him too (`provoke` = `wellCharge`). Note
`st.swing` keeps the LAST swing's name for ever — "not swinging" is
`st.atk < 0`. Measured before the speed change: from 9.7 m on you in 3.5 s
at 5.7 m/s; 19 swings in 30 s, all four used, every one landing on a player
standing still.
