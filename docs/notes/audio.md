# Audio

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**Interaction.** `updateHover()` raycasts the screen centre against
`interactables[]` each frame. `addInteractable(root, label, kind, data)` —
`kind` is `'physics'` (grab), `'inventory'` (take), or default (`data.onActivate`).
Tiny props carry an invisible `hitProxy` sphere so they're easy to aim at.
`primaryAction()` (click / `E` / `F`) routes grab / throw / take / dig.

**Physics.** `PhysProp` class + `physProps[]` — a tiny custom rigid body
(gravity, ground bounce/friction, corridor walls; **no prop-vs-prop
collision**). Grab springs the held prop in front of the camera; click again
throws; `G` drops.

**Audio** is all synthesised in `startAmbientAudio()` / `sfx*()` (wind, surf,
footsteps, dig, glass). The **one sample** is `assets/backrooms.m4a` — the
opening music, faded in/out via a Web Audio gain chain in `startMusic()`
(`MUSIC_*` consts), started when the intro ends.

**AND A FALL REVERSED IS A GET-UP, EXCEPT FOR THE HIPS.** There is no
get-up in the file — the source lies still for the rest of its 250 frames —
so the rise is the same reel run BACKWARDS, which is the right shape and is
the walk-played-backwards trick one move along. What it also does is un-do
the punch: measured, his hips came back up to 1.74 m on the way to
standing, so he got to his feet by flying two metres into the air. The hips
are clamped to the straight line from where he lies to where he stands and
what is left is his own tumble at ground level, which reads as a body
rocking back over its shoulders and onto its feet. Measured after: the
hips never pass 0.91 against a standing 0.94.

**A LOOP VARIABLE MAY NOT SHARE A NAME WITH A MODULE-LEVEL HELPER.** The
strafe's `lead = side * d > 0` bound a bool over `def lead(t, d)`, the staging
helper `staged()` calls — so the build died on the LIGHT clip, three clips
later, with `'bool' object is not callable`. Python has no block scope; in a
packer that is one long script of helpers and loops, the loop variable is the
one that has to move.

**All one-shot sfx go through `sfxOut()`**, which returns the SFX bus. Never
`connect(ctx.destination)` from an effect — that bypasses both the Effects
volume slider and the master volume, which is how digging ended up deafening.
Music is the deliberate exception.

**AND THE OWNER'S OWN RECORDINGS BEAT ANY SYNTHESIS.** Four Sekiro swing
bounces and four block bounces, dropped into `SAMPLES` as `katSwing` and
`katBlock` — `playSample` already picks at random out of a bank, so a swing
and a block are never the same twice running, and the synthesised whoosh and
clash stay behind them as the fallback for the frames before the bank has
come off the network. `playSample` gained a `delay`, because a blade's whoosh
is timed to the strike and not to the click, which the synthesised one had
always known and the bank did not. They are not redistributable, and the
README says so.

**A REFERENCE VIDEO IS A MEASURING INSTRUMENT.** The pose and the sound both
came out of Battlefield V's own katana reel rather than out of taste:

- **The carry is a low diagonal**, hand at the lower right, blade running
  down and across to the left, edge down, flat to the camera. Ours held the
  Military Shovel's guard — a 1.8 m blade bolt upright at the right edge with
  the hand off the bottom of the screen, which is exactly "facing the wrong
  way". Solved numerically against the reference frame (point at (-0.62,
  -0.82), grip at (0.42, -0.30) in NDC) and hit exactly. The grip had to come
  UP the frame as well as turn — BFV carries the tsuka near the vertical
  centre and ours sat on the bottom edge, which flattened the whole diagonal
  to five degrees.
- **A SWORD THROUGH AIR IS LOW, NOT HIGH.** The whoosh was a band from 1.6 to
  5.6 kHz with a pure sine at 3.8–5.2 kHz riding it, on the theory that a
  thin edge sings. Pulling the reel apart band by band: the three loudest
  swings in it put 78 %, 77 % and 89 % of their energy BELOW 1.25 kHz and
  essentially nothing above 2.5 kHz — one is 78 % inside 160–315 Hz on its
  own. What you hear is a column of air being moved and a column of air is a
  low sound. The envelope was measured too: 70 ms up, 150–200 ms down. It is
  a whump with a tail, not a hiss.

**HIS BODY WAS WIDER THAN YOURS, AND THAT IS A PLACE HE CANNOT FOLLOW YOU
TO.** "Make him able to walk through the two red chairs by the table" was
reported as a chair problem and was not one: the chairs have been out of the
walk grid since the ladder went, and he walks through them. Two other things
were stopping him, and both were about SIZE.

- His wall margin was 0.42 against the player's 0.195, so a strip more than a
  foot wide round the whole room — every corner, and the far side of those
  chairs — was floor you could stand on and he could not.
- His disc was 0.32 against your 0.22, and flooding the free cells at each
  radius shows the strip behind the table cut off from the rest of the room,
  for him, by a SINGLE blocked column at x = 0.7. Not a hole in the steering:
  a body that did not fit through the gap.

0.24 and 0.30 fix both, and the furniture grid still keeps him out of the
furniture. **And `mainRegion` has to be worked out PER RADIUS** — it was
hard-coded at 0.32, so once he was thin enough to walk behind the table the
"largest connected piece of floor" he was sent back to was still the fat
body's, and he would get there, be told it was not the main region, and be
dragged back out. Measured after: 11 of 11 spots — both chairs, all four
corners, both long walls — reached to within 1.18 m, well inside his reach.

**AND A WHOLE HEAD UNDER THAT MASK WAS BUILT AND CUT. DO NOT PUT ONE BACK.**
For several passes the mask came off at half health and what was under it was
tales' photoscanned bust, fitted to his skeleton in Blender against the eye
positions measured off both models' EYEBALL MESHES, its neck morphed onto the
single ring where his own was carved out of the index, skinned by
nearest-neighbour transfer from the head it replaced, its skin rebuilt from
the statistics of his own chest (his 88/12 against the bust's 120/40 — a
third too bright with three times the contrast of a game skin), and the
shading lifted out of its albedo and turned into a normal map so his creases
were lit rather than painted. Every step of that worked and every one was
measured on screen — his neck rendered (95, 66, 51) against his chest's
(98, 67, 56). It is all deleted. **A face grafted onto somebody else's body
reads as a face grafted onto somebody else's body**, and no amount of
matching statistics changes that; the owner said so of three different
versions, and the last word was to take it off and keep the mask on at all
times. THE MAN IN THE GAS MASK IS THE CHARACTER — a boss whose face you never
see is not a boss missing a face, and the mask is the better design because
it is the one this character already was. Same lesson as the scanned
lighthouse and the scanned katana, in a place nobody expected it.

Two things learned in there are general and worth keeping:

- **A NORMAL MAP WITHOUT TANGENTS SPLITS A FACE IN HALF.** three falls back
  to screen-space derivatives when a mesh carries no TANGENT attribute, and
  across a uv seam — which on a head runs straight down the middle of the
  face — the derived tangent flips sign: one cheek lit, the other not, on a
  hard vertical line. Export tangents; the exporter is the only place that
  still has the uv layout and the smoothing together.
- **DO NOT SMOOTH GEOMETRY TO FIX A TEXTURE PROBLEM.** A pass that relaxed a
  low poly to take the "leather" out of it took the brow, the nose and the
  cheekbones with it and the head came back a mannequin. The sculpt is the
  face; what needed removing was what was painted on top of it.

**AND A SHRIEK IS NOT A ROAR AN OCTAVE UP.** A bellow is a big animal moving
a lot of air and it is carried by the SUB; transposing it up produced a
small angry cow. The `shriek` throat is two detuned sawtooths a fifth apart
(nothing that screams is in tune), a 38 Hz ragged tremolo, a formant
bandpass at 1.5 kHz where a human scream lives, and a band-limited tear over
the top — no broad hiss anywhere, because the shell already paid for that.
`sfxScpScream` is three of those a beat apart so it seems to be getting
worse rather than being loud at the start. Measured on the SFX bus: the
first build was 88 % below 300 Hz and peaked at 47, which is the sub being
the sound instead of the floor; it is 46 % in the 1–3 kHz formant now.

**THE THREE BREAKS ARE RECORDINGS, AND A RECORDING IS THE WHOLE EVENT.** The
desk, the tripod camera and the coat stand play the owner's own bounces
(`table-break` / `camera-break` / `coat-break`), and the synthesised stacks
they replaced stay behind them as the fallback for the frames before the bank
is off the network — the katana's own arrangement. Two things: the layered
clatter must NOT still play underneath (the coat stand was a clatter plus a
snap because neither alone was a coat stand going over; the bounce is already
one mixed event and putting the clatter under it only muddies it), so
`sfxWoodSnap` and `sfxTableBreak` return whether the bank played and the
caller only reaches for the synth if it did not. And **AAC overshoots on
decode**: the camera bounce peaked at 1.18 in the decoded buffer and clipped,
so all three are encoded with 3 dB of headroom and the play gains carry the
level back.

**A BODY FALLS HARDER THAN IT FLIES, AND THE TWO ARE SEPARATE KNOBS.** Under
the world's own 9.8 a corpse thrown hard enough to travel FLOATED down — a
long soft parabola that reads as weightless however far it goes, which is the
opposite of what a killing blow should look like. Gravity under a ragdoll is
`RAG_G`, half again the world's, and the kick is nearly doubled: a full
charge throws a body 9.6 m and a plain click 6.0 m, both landing about a
second later. The LANDING is its own beat — the first heavy contact only,
gated on `r.landed` so it never fires again on the settling bounces: a thud
pitched by how hard it came down with a slap of band-limited noise over it
(meat is not a drum), trauma, a beat of hitstop, and a puff of whatever it
landed in. And a body is a hammer: `ragSmash` gives anything with an
`onImpact` inside a particle's reach the blow, so a corpse flung across the
bunker takes the bottles with it instead of passing through them.

**THE FURNITURE PUSHES YOU OUT ALONG THE RESULTANT.** The room's walk undid
a blocked move an axis at a time, and against anything that was not a flat
wall both axes read blocked and the whole move was thrown away — you stood
against the trash can unable to step round it. `S.pushOut` is a disc against
the grid's cells: every overlapping cell pushes along the line from its
nearest point by the depth of the overlap, and the push applied is the SUM.
That last word is the fix: the grid is square cells, so a round bin is a
small square with a flat face, and a nearest-face push from it is exactly
against your motion — you stop dead. Summed, a small object's cells fan out
round you and shove you to whichever side you are already on, while a desk
front, whose cells all push the same way, is still a wall. Measured brushing
the can: 0.86 m and stopped, against 4.75 m and past it. The disc is 0.22
in here, not the beach's 0.26 — the aisles are tight.

**No click when the audio starts.** A context created inside a gesture can
still come up SUSPENDED, and while it is suspended `currentTime` does not
move — so the four-second master fade `startAmbientAudio()` schedules is
measured against a stopped clock and is already in the past when the context
runs. The whole bed arrived at full level on the first block of samples.
`fadeInMaster()` re-arms it from the live clock after `resume()` resolves.

**A GLOBE CHAIR LYING DOWN IS A BALL.** One of the two was over on its side
on the rug, which sounded like good set dressing and reads as a beach ball
somebody left: the mouth is in the floor and what you see from anywhere in
the room is a smooth orange sphere. Both are upright and turned in at the
table now. If a shape only reads from one angle, it does not read.

**A SYNTHETIC HIT CARRIES ITS OWN WORLD NORMAL.** `stampScar` reads
`hit.face.normal` and turns it by the struck object's matrix, which a hit
marched against a collider has neither of. It takes `hit.n` in world space
when there is one.

**AND THE GATE HAS TO BE HANDED THE COPIES.** The loop that offsets the
house's colliders into world space builds a NEW object per collider — it
has to, it is adding the offset — so the leaf's discs that `models/` kept a
list of are not the discs the game collides against. Swinging the gate
moved five objects nobody reads: the pivot turned, the iron visibly swung,
and the doorway stayed shut. Measured: shut stops you at 5.52, open lets
you to 0.5. This is the only place in the game that moves a `rockColliders`
entry, so it is the only place that trap exists.

**No stinger.** A musical shriek was tried on
the bolt and cut: it tells you the game is scaring you. Its FEET are the
sound — `sfxSmileStep()` every `SMILE_STEP`, falling off with distance,
until the water takes it, then the splash. It stands 120 m past the
snorkeler so neither can be seen from the other. **The animation is
restraint.** A flailing sprint (0.95 rad legs, pumping arms, a rolling
torso) read as a cartoon; the run is a real cycle, fast but ARTICULATED: the
knee folds hard as the leg swings through under the body and straightens as
the foot reaches forward, the elbows are bent and open and close as the arms
pump, held close (elbows folded FORWARD — the first sign had the forearms
flying up behind it, which was most of "the arms are flying around"),
played at 2x; the idle stance keeps a little bend in every knee and elbow,
because straight limbs read as sticks, and the idle is DEAD STILL but for the
whole upper body tilting a few degrees to one side over eight seconds,
holding, and coming back — the way something looks at a thing it does not
understand. Three things it took: **Blender
exports this rig LYING ALONG -Z** (its root joint comes out -90° about X;
the FBX chain under it is not something `export_yup` untangles), so the
loader wraps it in a group turned +90° about X, which puts the head up and
the face toward -Z, and `atan2(dx, dz) + PI` faces it at you like the crab.
**`Box3.setFromObject()` knows nothing about skinning** — it boxed the raw
geometry through the node chain and answered 7.9 tall by 11.7 wide for a
figure 32 tall, and the first build scaled it off the wrong axis;
`skinnedBounds()` runs the vertices through the bones and is the only
measurement of a skinned mesh that means anything. And the first sprint
threw the trailing leg horizontal — a 0.95 rad swing on legs that long — so
it runs at 0.78. It is one skinned mesh: ONE of it, no clone().

**And the second column is the point of the table**: "pixels that jump" is a
metric you win by deleting the rain, so it is never read on its own — the
presence measure is what stops a fix that is really a removal. Both readings
then have to be checked against the picture, because a streak's leading edge
lighting new pixels IS a bright jump and a moving streak can never score zero.

**AND THE WALK WAS EASING HIM BACK INTO THE BIND POSE.** It is built off the
run by slerping every rotation toward rest at 0.62 - which shortens the stride
and also walks the whole upper body back toward a T, so his guard opened as he
slowed down and by the time he was walking his hands were 1.10 of his own reach
apart against the run's 0.40. He holds his sword the same way at every speed;
only his feet know the difference. The ease is the leg chain and nothing else.

**HIS VOICE IS THE OWNER'S RECORDING, AND IT KNOWS WHERE HE IS.** Three
files cut into 48 cues along their own silences (ffmpeg's silencedetect at
-40 dB / 0.35 s; the steps at -38 / 0.14), sorted by length and RMS and
centroid since nobody can listen from here: the five LOUD close cues are
the roar, the six short bright ones the tell, three the hurt, seven mid
growls, four long quiet ones his breathing at a corner, the one seven-second
gutteral his feeding; twelve far growls; ten footfalls. `playSampleAt` is
the positional player — pan by bearing, level by distance, and a LOWPASS
closing with distance, which says "far" more than the level does — and
`catCue` is the one door for his voice: one cue at a time, a roar cuts
whatever is playing. The far growls come every nine to twenty-five seconds
while he is off doing his own thing beyond fourteen metres; his feet are
heard inside fifteen and nowhere else; the breath is the peek; a noise that
reaches him is always answered (growl near, far growl far). Encoded mono at
-3 dB peak, a megabyte in all. Not redistributable.

**"HE GOT STUCK ON THE TOMBS" WAS THREE THINGS, AND ONLY THE FIRST WAS A
TOMB.** The owner played the catacombs again: the monster stuck, on the
sarcophagi, and his sounds heard from too far off. Measured by chasing the
player into the crypt room six times from 14–34 m and reading his height
against the player's floor at the end of each:

- **THE LID WAS A STEP.** `catStand` takes any storey up to 1.05 m over him
  and a sarcophagus is a metre tall, so pressed against one in a fight he
  was lifted onto its lid — 0.49 and 0.86 m over your floor at the end of
  two chases in six — and stood there 2.5 m from you, "in reach", swinging
  at the stone between. Two rules: a rise over half a metre is climbed only
  where his ROUTE goes up (a stair's riser is on the route; a lid never is),
  and a too-high storey is a HOLD, not a hole — nulling it sent him down the
  "nothing under me" branch, which sinks, snaps to a node and DROPS THE
  ROUTE, and that was a fresh stall wherever a lookup happened to return a
  lid. And a route in hand means the straight line is shut, so "in reach"
  with a route is not in reach: he walks it round the tomb rather than
  standing at it. After: never more than 0.31 m over your floor in twelve
  chases.
- **THE ROUTE BEGAN ACROSS THE WALL BESIDE HIM.** Nodes are 0.6 m apart and a
  wall is 0.2 m of stone with 0.4 m of clearance either side, so the nearest
  node to a body a hand from a wall is as likely as not on the far side of
  it — and the route's first leg then runs through the stone: traced, a
  stalk with a ten-waypoint route whose first waypoint was 6.6 m away through
  the wall he faced, the step ahead crossing at hip, shoulder and both
  sides, held there until the progress check drew the same route again.
  `catStartNode` takes the nearest node within a metre and a half that HIS
  OWN LINE reaches; the "drop the first waypoint underfoot" shift asks the
  same question; and a route he has been held against stone on for half a
  second (`catBlockT`) is dropped for one drawn from where he actually is.
- **AND A THIRD OF THE GRAPH WAS POCKETS.** 5,910 nodes in EIGHTY-EIGHT
  components, the largest 4,021: every floored ledge the packer sampled that
  nothing joins to is a component of a few dozen nodes, and a body in one
  can route nowhere. Traced: a pocket of NINETEEN nodes thirteen metres from
  the player, him seeing them the whole time, every route refused, stalk,
  chase and search taking turns at failing for twenty-five seconds. The
  largest component is the graph now — `catNodeAt` answers nothing else, so
  a snap, a target and a corner to watch from are all on it — the straight
  chase may DROP a ledge toward you (a floor up to 1.2 m below his feet is
  a fall, not a wall), and a body found in a pocket is put back on the main
  floor the moment you are not looking at it (`catUnpocket`). Started on
  that very ledge three times, he closes to 1.4–2.5 m in all three.

Measured at the end, hands-off: **six chases of six close to 1.9–2.5 m with
7–13 swings a half minute and zero stalls; three from the stranding ledge
close too; five roams of five with zero route-in-hand stalls at 1.1–2.9 m/s;
and he never rises above 0.31 m over your floor.**

**AND HIS SOUNDS ARE CLOSE-RANGE ONLY.** The owner's word: only when he is
near. Every cue caps at `CAT_HEAR_FAR` (26 m; the roar six more): the
"far" growls are the ones for the next room over, twelve to twenty-six
metres, dull through the stone, and past that he is silent — so hearing
anything of him at all means he is near.

**AND WHAT MAKES A GUNSHOT HUGE IS NOT THE CRACK, IT IS WHAT THE CRACK IS
STANDING ON.** The owner's recording is a foot from a revolver and carries
the report and nothing else. `sfxMagBlast` puts the two things under it that
a close mic cannot have: a SUB (78 → 31 Hz in a quarter of a second) and the
REPORT COMING BACK — two slaps and a low roll, each later, quieter and
DARKER, because distance takes the top off a sound long before it takes the
level. It is the only thing in the sound that says how big the place you
fired it in is, so it is read off `inRoom()`: hard, near and bright in a
catacomb, soft and late over a kilometre of water. Measured on the SFX bus:
**44 % of the energy below 120 Hz and 63 % below 400**, peak 0.689 — loud,
low and not clipping. And the recoil went with it: the lens spring 5.6 → 9.4,
the aim's own nudge half again, trauma 0.34 → 0.62, the FOV punch 4.2 → 7.5,
and 45 ms of hitstop, because every other confirm in this game buys its
weight with held time and a gun with no beat under it reads as a pop whatever
the sound does.

**AND THE BLAST IS LOUDER, LOWER AND LIMITED.** Two subs rather than one
(92 → 26 Hz over the first, 46 → 19 under it), a 35 ms band-limited CRACK on
top so it reads sharp as well as big, a fuller body, a fourth slap in a room
and a third outdoors, and the recording itself up a fifth. **A waveshaper
clamps its input to [-1, 1]**, so a tanh curve on its own is a hard clip on
exactly the sums it is there to catch: the layers are brought down 0.35 into
the knee and the makeup taken back after it, and THE RECORDING GOES THROUGH
IT TOO — a limiter with the loudest layer routed around it is not a ceiling.
Measured on the SFX bus: a single shot peaks at **0.751** (the old build was
0.689) with **57 % of the energy below 120 Hz and 73 % below 400** (was 44
and 63), and a six-round burst whose sub tails overlap peaks at **0.875**
rather than the 1.45 it clipped at before the limiter.

**THE SWIM-IN HAS A SOUND, THE DEFAULTS ARE THE OWNER'S, AND THERE IS GRASS.** `updatePack` now plays `sfxPackSurge` (brown noise + a 34–46 Hz sub, the sea heaving) at the trigger, a churning `slosh` behind each crab, `sfxPackSurface` (splash + draining shell) the frame each one becomes visible, `sfxPackClatter` (dry chitin ticks) once they are ashore and `sfxPackClack` per crab as they rear — all positional through `packOut`, all on the effects bus. `DEFAULT_SETTINGS` = fov 105, sens 1, brightness 0.98, volume 0.5, music 0.30, waves 0.01, effects 0.45, walk 1.1. Moths are 4. Beach grass (LOLIPOP, CC-BY-4.0, `assets/beachgrass.glb`, 15 variants as InstancedMeshes): planted a 40 m stretch at a time as you come within reach (`grassTick`, per-stretch seed so a checkpoint grows the same beach), only at x 10.6–13.3 (dry sand, well above the swash), refused near colliders, caches, the headland and a `KEEP_OUT` list of set pieces, and by five rays down onto every mesh within reach — **but not landforms (radius > 30)**: raycasting the ocean's 115k triangles five times a tuft made each stretch a 50–250 ms hitch; without them it is 1–7 ms.

**THE CATACOMBS LANDING IS THE OWNER'S RECORDING.** `catacombs fall.wav` (7.9 s: a hit at the front and a long decay) is `assets/catacombs-fall.m4a` in the `catFall` bank, played at 1.4 on the cave-in's `land` cue — the frame the black lifts onto the stone — in place of `sfxCaveLand`, which stays as the fallback before the bank has loaded. Measured by hooking `AudioBufferSourceNode.start`: it fires once, 0.55 s after the cut places you, which is the landing beat.

**THE FAR SOUNDS** (`updateFarSounds`): a BELL BUOY 70 m out, one moored every
360 m (`buoyAt`), ringing uneven clusters of one to three strokes on cast-bell
partials with a red lamp blinking on it; the LIGHTHOUSE FOGHORN once a minute
or so, a two-note diaphone from `LH_X/LH_Z`, near nothing at the spawn and
louder as you close on the tower; and GULLS calling from where the birds are,
QUIET whenever a mutant or a crab is awake within 45 m. All filtered by
distance, all off in rooms. And RARE, by the owner's word: the bell rings
every 45-105 s, a beach gull every 50-120 s and a keep gull every 35-80 s.
A far sound that comes every few seconds is a loop you can hear.

**THE SOUND IS THE OWNER'S OWN RECORDING, AND ITS DISTANCE MODEL IS THREE
THINGS.** `assets/fountain.m4a` is his mp3 cut to a 22 s seamless loop: the
steadiest stretch, its slow level drift taken out so the loop does not pump,
equal-power crossfaded end to head (seam RMS within 5 %), normalised to
-3 dBFS because AAC overshoots on decode, mono at 32 kHz — which costs nothing,
because measured there is no energy in it above 14 kHz. 157 KB. The
synthesised bed stays behind it as the fallback, and the synth's PLINKS are
switched off when the recording is playing: a recording is already one mixed
event and a synthesised layer under it only muddies it, which is the three
breaks' own rule.

`1 - d / 15` was a straight line, and a straight line is the one falloff real
sound never has. It is an inverse law now (`FOUNT_REF` 2.2 m is where it has
halved), plus the two things that make it a PLACE rather than a level: the
TONE opens from 700 Hz across the yard to 6.5 kHz at the rim, because duller
is further and says so more than the level does; and the PAN is weighted away
with closeness, because hard-panning a thing you are standing in is the tell
that it is a point source and a fountain is not one. Measured: 0.144 at 1.2 m,
0.082 at 4, 0.044 at 9, 0.020 at 12, with the lowpass 2886 → 848 Hz.

**AND A REEL IS READ BY ITS BANDING, NOT BY ITS OUTLINE.** The first one was a
single barrel lathe in one material and measured 62 px by 48 — big enough to
see and completely unreadable, because a uniform pale capsule is a blob at any
size. What says "reel" is the section a centrepin has: a bright FLANGE, a dark
pack of LINE, a bright flange again, with a pillar and a handle breaking the
circle. Measured after, it reads 28.6 mean luminance against a frame of 16.3
with nothing over 200 — the brightest thing on the rod, which a polished reel
under a moon should be, and not blown. **A part too small to have internal
contrast is a part with no internal contrast: give it bands, not detail.**

**THE INTRO IS THE OWNER'S WAVES AND HIS WHOLE SONG, AND THE WORLD LOADS UNDER
IT.** `runIntro` on START GAME (a checkpoint load skips it). START GAME fades
to black (1.5 s) and only then does anything come in: `assets/beachwalk-intro.m4a` — his `beachwalk intro.wav`, the
WHOLE 31.7 s, lifted 4 dB (peak -1.9 dBFS), AAC 256k — fades up out of silence
over 4.5 s while the waves fade up out of the black with it, and every beat after is keyed to the SONG'S clock (`INTRO_CUE`), so a slow decode
cannot put the picture out of step: the waves (`assets/intro-waves.mp4`, his
clip at full 1080p, crf 27, cut into a seamless 9.4 s loop with `xfade`, 17 MB)
rise out of the black over 4.5 s and drift in 9 % over the song; BEACHWALK is
simply THERE on the drop at 7.39 s (measured: the low band jumps 56 → 72 dB in
one 10 ms window) — no flash, no letters flying in, by the owner's word; the name goes at 19.6 s over 3.6 s; the waves sink into the black
from 22.3 s over 7 s, riding the song's OWN fade-out (it falls from 72 to 34 dB
between 22 and 26 s and ends in silence at 31.5); the black holds 1.2 s after
the last of the song; and the beach comes up over 4.5 s — and only once
`bootReady`, because BEGIN NO LONGER WAITS ON A LOADING COUNT: thirty seconds of
song is thirty seconds of boot nobody sees. **`updateBootGate` used to run only
while `!introStarted`**, so once BEGIN could be pressed early it froze and the
reveal waited for ever; it runs until ready now. The song rides the MASTER
volume, not the music slider (whose default is 30 %: "loud and clear"), and the
sea and wind are ducked to 15 % under it (`duckForIntro`) and brought back with
the beach. Enter SKIPS it: the song and the waves go out in a second and the beach comes
up over 2 s (still only once `bootReady`); not on a key repeat, not within
0.3 s of the press. The opening music
(`startMusic`) starts at the reveal. **The preview's screenshot tool counts as
an input**, and in the narrow pane the name needs `white-space: nowrap`.

**NOTHING OF THE GAME IS HEARD BEFORE THE GAME.** The audio context is built
at PAGE LOAD (`primeAmbience`), so the sea, the wind, the title swell and any
one-shot fired by the START GAME click (dev mode equips the shovel, which
plays) all ran under the black screen and the intro. `gameAudioGate` is a gain
AFTER `masterGain`, 0 until the beach is revealed and opened by
`openGameAudio` at the reveal (or on a checkpoint's instant start). It is its
own node because a dozen things write `masterGain` — the slider, the tab
coming back, the first press's resume, the intro's duck — and any of them
would reopen it. The intro song, the opening music, the lighthouse track and
the keep intro go straight to the output and are not behind it.
`__bw.audioGate()` reads it: 0 through the black and the intro, 1 two seconds
after the reveal. A scripted `.click()` is not a gesture, so the context stays
suspended and no ramp advances; test with a real click.

**A GAIN IS HELD BEFORE IT IS MOVED (`holdParam`).** `cancelScheduledValues`
in the middle of a ramp drops the param back to the last event before it —
often zero — and that one-quantum step is a click; the START GAME press did
exactly that to the master bus (the menu audio's `setValueAtTime(0.0001)` and
the intro's duck), under the sea that was already playing. `holdParam` uses
`cancelAndHoldAtTime` where it exists. To MEASURE clicks: a temporary head
script that overrides `BaseAudioContext.prototype.destination` with a tap
into a ScriptProcessor (and a zero gain to the real output, so it is silent)
records per-block peak, largest sample step and clipping; the song itself
steps up to ~0.03 at unity, so a click is anything well past that.

**A ROOM'S WATER IS ITS OWN.** `submersionAt` measured every point against
the BEACH's waterline, and every room stands thousands of metres "seaward"
of it along x — so a bottle thrown on the sea keep's pier (or anywhere in a
room) landed "in the sea" and splashed. `roomSubmersion` answers the beach
the old way and a room with its own water: the keep is wet where its walk
has no ground above its own sea, every other room is dry. `inWater` is off
in rooms. A room's floor also names its own surface now (the keep timber,
the tavern and the catacombs stone) instead of the bunker's steel.

**SAND UNDERFOOT IS THE OWNER'S RECORDING** — twelve steps cut at their own
onsets (`assets/sand-step1..12.m4a`, 0.42 s each), one at random per beach
footfall at 0.30 (`sfxStepSand`, falling back to `sfxStep`).

**A FOREST, OVER THE DUNE.** The owner's forest walk is `assets/forest.m4a`: a
94 s loop cut from its first 100 s with a 6 s equal-power crossfade, RMS
normalised, and PADDED a second at each end with its own wrap so
`loopStart`/`loopEnd` (1.0 / 95.0) sit inside real audio — AAC's priming
silence would otherwise click at the seam. It plays from a random offset
through a highpass and a lowpass (pushed back over the dune) INTO THE WAVE
BUS at `FOREST_LEVEL` 0.09 — so the waves slider and every room's duck carry
it, it is on the beach and at the keep and silent in every room
(`updateForestBed`, from `updateBeachBed`). On the master at 0.2 it measured
34 dB OVER the surf at the owner's own waves setting (RMS 0.010 against
0.0002), and the owner heard it as way too loud; it is about 12 dB UNDER the
surf now, a thing you notice when the sea draws back. `__bw.audioDbg()` reads the forest, the breath and the
banks.

**THE LOAD SHOWS ITS PROGRESS AGAIN, AND IS FASTER.** The START button reads
"Loading n%" (forward-only, eased) until the game is ready. Before the press
the warm chain takes 55 ms a frame and the uploader 34, and the world behind
the opaque cover is drawn one frame in eight (`coverFrameN`) — nobody can see
it, and the GPU is better spent compiling. Ready at about 6.3-6.8 s locally.

**HE BREATHES WHAT YOU HEAR, AND LOOKS UP AT YOU WHEN HE SPEAKS.** The chest
is driven by the recording itself (`benBreathEnv` / `benBreathNow`): its
loudness in 20 ms windows, filled quick and emptied slow, normalised over the
loop and read at the loop's own playhead (`benBr.t0`), so each ragged breath
you hear heaves his chest back and rides his shoulders up (measured -right
lifts the chest, +fwd raises the left shoulder and -fwd the right). With his
dialogue open, `benLook` turns the neck (0.45) and then the head onto the
camera, from where his face points in his OWN BIND POSE (`B.faceL`, the root's
+Z read through the head at the bind) carried through the pose he is in —
measured 46° off to 0.2° in two seconds — capped at sixty degrees and eased
out as he dies. A world rotation goes onto a bone as `Qp⁻¹ R Qp q`.

**FOOTSTEPS HAVE THEIR OWN FADER (`STEP_VOL` 0.72, `stepSnd`).** Every
footfall and landing runs with `stepScope` set, and `sfxOut()` then hands back
a gain into the effects bus instead of the bus itself, so one number turns
every surface's step down, recorded or synthesised. The forest bed is at
`FOREST_LEVEL` 0.012 (was 0.09, then 0.028), about twenty-seven dB under the
surf. The sand step's recording plays at 0.19 (was 0.30), under the fader.

**THE BLEED IS A QUICK BURST.** Short specks (0.35-0.8 s), a small haze,
four to six squirts of 0.14-0.26 s with no heartbeat, no lingering spurt, and
the owner's `bleed-burst.m4a` (`bleedBurst` bank). A blade hit's spurt is
0.6 s, the Bloody Blade's per-hit spray x3.2 (was x5.6), and every blood drop
has air drag and a capped stretch so a spray arcs instead of flying on rails.

**SOUNDS:** `SFX_TRIM` (0.8) under the effects slider; the parry and its
poise sample about 40 % quieter. The lock (`sfxLockOpen`) is grains of the
owner's own metal recordings (`blockMil`, `milLight`) pitched up for pins and
the cam, stick-slip friction for the turn, and the bolt still at 0.64 s.

**HE LAUGHS OVER YOUR BODY.** Three short laughs cut from the owner's
recording (`assets/samurai-laugh1-3.m4a`, faded out, about two seconds each, the
`samLaugh` bank at 0.55), a beat after he kills you; the reload waits 2.9 s
instead of 1.6 so it is not cut off.

**A BLEED BURST IS FELT**: 17 % of max health (min 3), a beat of hitstop, a lens punch, a
flinch, a white flash on the body and a low thump (`sfxBleedThump`).

**THE CATACOMBS' LANDING PLAYS BOTH**: the fall music and the owner's first impact recording
(`catFallHit`, `assets/catacombs-fall.m4a`) under it.

**THE MUSIC PLAYS WHATEVER WAY YOU CAME IN.** A checkpoint load held the
opening music off; it plays on every start (a little lower from a load),
and `startMusic` only ever starts its source on a RUNNING context, retrying
every second, and fetches the bytes again if they were lost.

**A DOOR IS KNOCKED ON, AND SHUT BEHIND HIM.** `farmSendOut` waits 0.55–1.1 s
with the door rattling (`D.rat`, a small spring on the closed leaf), two thumps
and a roar behind it, then bursts; `D.busy` keeps a second man off it. When the
burst ends `D.closeAt` is set 0.9–2.3 s on and `updateFarmDoors` drags it shut
and slams it (sound, dust, a little trauma). Muffled shouts and rattles come
from shut doors through the fight while men are still inside (`farmCrowdTick`),
and a bell in the tower tolls eight times as the fight starts
(`sfxCastleBell`).


**THE FARMER FIGHT'S AUDIO CUT OUT (2026-10-08): one death made the whole map
laugh.** `killMutant`'s "and the others laugh" looped over EVERY living mutant
in the game — twenty farmers (most still behind their doors), the whale's
seven, the catacombs, the castles — and each synthesised laugh is ~30 nodes
whose gain (`1 / (1 + d/14)`) never reaches zero, so nothing was culled by
distance. Measured with `tools/audiowatch.js` (the context sent to a null
sink with `setSinkId({type:'none'})`, an analyser on `masterGain`, node
creation counted by caller): ~1,070 nodes/s through the fight, and 1,500 in
the 0.7 s after each kill — more than the audio thread renders in time, and
when it falls behind EVERYTHING drops out. Now only the two nearest that are
awake, drawn, out of their doors and within 28 m laugh (~240 nodes/s), and
`mutVoiceOK()` caps synthesised roars/laughs/tells at eight per 0.6 s as a
net under any future broadcast. No NaN params and no thrown param calls were
found — it was load, not poison. **When adding "everyone reacts", filter by
awake + near + in this room first.** The watcher must be imported once per
load (a second import used to replace its state object, and the patched
prototypes kept counting into the old one).

**The catacombs propagate his sounds** (`catHear`, see catacombs.md): open /
round the corridors (panned to the opening) / through the stone. Anything new
he says should go through `catCue` or `catPlayAt`, never `playSampleAt`.

**A NOISE BUFFER IS MADE ONCE (2026-10-09).** `sfxMutSever` wrote 0.34 s of
shaped noise per call (2.3 ms), `sfxSgGore` 0.5 s, `sfxSgBlast` a body, a
crack, five slaps and a 1.8 s roll, `sgThump` one per call — and a charge that
took four farmers apart severed ~20 limbs on one frame: ~100 ms of the shot's
frame went on `Math.random()` into buffers. `cachedNoise(key, s, env,
variants, raw)` builds a few variants once and picks between them; `NOISE` is
the one table of lengths and shapes that the sounds AND the warm-up read
(`noise(key)`, `thumpNoise(len)`); `sgWarmAudio()` builds them one per 16 ms
task from the draw. `sfxMutSever` plays at most three per 50 ms and
`sfxSgGore` one per shot. A 4-kill shot: 97–120 ms → ~30 ms.
