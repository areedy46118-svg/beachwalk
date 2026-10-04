# The abduction, the saucer hall and the crash

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**THE ABDUCTION, AND THE THING IN THE SAUCER.** It is BEHIND YOU: the drainage
tunnel home sits at z = +34 and the walk runs -Z, so everything else in this
game is somewhere ahead and this is the one thing that is not — you turn round
and go back past the drain, and out there (`ABDUCT_Z`, on your Z alone like the
pack's trigger, but GREATER than rather than less than) a light comes down and
takes you. You finish a boss fight in a room that is not on this beach and are
put back on the sand a little short of where it took you.

**THERE IS NOTHING IN THE ROOM WHEN YOU ARRIVE.** One light in the middle of an
empty hall, and touching it is what starts the fight. That is a better opening
than being set down next to a boss for the same reason the crab's tell is
better than a hit: the player is GIVEN the moment rather than having it happen
to them, and they take it standing where they chose to stand. The orb is also
what lights the room — a hall lit by the thing you are walking toward explains
its own lighting — and it is the only thing to do in an empty arena, so it is
where you go without being told. It does not go dark when it is spent; it goes
COLD, because a fight in an unlit room is not a fight.

**AND THE FLOOR IS THE ARENA, SO THE MIDDLE OF IT HAS TO BE FLOOR.** The temple
ships an altar cluster standing on the axis. In a shrine that is the point of
the room; in a boss arena it is a pillar in the middle of the ring that the
fight has to be steered around, and it is why the first build's creature ground
against the centre instead of coming at you. `tools/shrine_pack.py` takes out
anything small, standing on the floor and near the axis — the chandelier and
the skylight hang well above head height and stay, because they are what the
middle of the room looks like from underneath. `altar_r` then comes back at
nothing and the whole 28.75 m disc walks.

Three assets, all in `tools/`: `ufo_pack` is just
`gltfpack.py` (Islide's saucer, 30 MB of 4K maps to 686 KB),
`tools/shrine_pack.py` builds the hall out of a Temple FBX (108 MB to 9.3 MB,
96k triangles undecimated because exact is the brief), and
`tools/monster_anim.py` authors nine clips on a 76-bone rig that shipped with
none — the smile's situation and the smile's treatment.

**THE BOSS WAS FREEZING SOLID ON THE FRAME THAT KILLED IT.** Everything else
on this beach dies into the Verlet ragdoll, and the warden cannot: the ragdoll
is written to `Character1_*` and this rig answers to `root`, `thorax`,
`tail07`, `legBL_2`, so `mutRagdoll` built a body of ZERO parts, the mixer was
never updated again, and the boss of the game ended by standing there in
whatever pose the last blow caught it in. The Dealer's own bug, silent for the
same reason, and it gets his fix: `kind.deathClip` sends it down its own death
clip — which `tools/monster_anim.py` had authored and NOTHING WAS PLAYING.
Round that, the death is a sequence rather than a frame (`startWardenDeath` /
`updateWardenDeath`), and its cues run off `st.deadT`, the clip's own clock,
because a wall-clock cue drifts by exactly the length of the kill's hitstop
and the thump then lands with the body already still:

- a third of a second of hitstop on the killing blow — longer than a parry's,
  which is the biggest confirm the fight otherwise has;
- it FLARES and then goes out (`emissiveIntensity`, the one channel neither
  `flashMats` nor `woundMutant` touches). Not to nothing: at zero, in a hall
  whose lamps are also failing, the corpse is a black shape on a black floor,
  and the one thing the beat after a boss fight has to do is let you see what
  you killed;
- the legs buckle, then the BODY lands (a sub, dust knocked off the slabs in a
  ring rather than a puff at its middle, held time), then the TAIL lands, its
  own smaller thump four metres behind the shoulders — that second beat is
  what says the thing had a size;
- and the hall fails UNDER the death rather than after it, so the death and
  the crash are one event. Lamp INTENSITY is free to move; it is a light
  entering or leaving a scene that recompiles every material in the game,
  which is why they live in `shrineLights` and are only ever dimmed.
- `QUIET` is the beat you get to look at it, and at 3.10 s the tail had only
  just come down before the black started climbing. 4.40.

**A ROOM IS FETCHED ON APPROACH, NOT ON THE TRIGGER — AND SO IS WHAT IS IN IT.**
Starting the hall's load at the moment the beam closes means the take either
stalls on a white screen or cuts to an empty room, so it begins 40 m out and
the cut still holds the white if the hall somehow is not up, which is the
honest failure. The CREATURE is the same problem one level down and it is
easier to miss: `makeMutant` starts its download when the creature is made,
which for everything on the beach is at load and is invisible — but this one is
made the instant the player touches the light, so the light went out, the sound
played, and nothing arrived for as long as two megabytes took. `mutGlbWait` is
the shared one-download-per-model cache and warming it alongside the hall is
all it takes. Same family as warming the drain and the bunker behind a screen
that is already covered.

Two smaller ones, both of which cost a run: **`makeApron()` returns a GEOMETRY,
not a mesh** — every other caller wraps it in `sandMat`, and it is the beach
heaped up, so it keeps that material rather than the mounds' tan. And **the
saucer carries its own 0.01**, the katana's trap again, so it is fitted by
measuring its span rather than by a scale factor.

**READ A LOOK CONVENTION OFF THE CODE THAT ALREADY DOES IT.** The take played
facing the sand, and both halves of the camera aim were wrong in the same way:
this game's convention is the one `__bw.lookAt` is written in — yaw is
`atan2(-dx, -dz)` and POSITIVE PITCH IS UP — and the first version used
`atan2(dx, dz)` with a negated pitch, which is a heading half a turn from the
ship and a pitch that drives your eyes into the ground by exactly the angle
the saucer is above you. There are two sign conventions for pitch in common
use and this file only agrees with one; deriving it from first principles got
it wrong twice. The same mistake had `placeInShrine` set you down facing the
wall behind you rather than the light in the middle.

**AND THE SAUCER CARRIES ITS OWN LIGHT.** Seen from underneath at night it was
a ring of lamps with nothing between them — the hull is lit by the moon, which
is somewhere else entirely, so the disc filling the sky above you had no shape
at all. One point light at the emitter reads as the source of the beam, models
the underside, and pools on the sand where the beam lands.

**THE DRONES ORBIT YOU, NOT THE ROOM.** The first pass circled the middle of
the hall, which is right until you move — and forty seconds of being shot at
leaves you against the outer wall twenty-eight metres from the axis, watching
three drones fly round a point you are nowhere near. Measured: not once in
forty seconds did one come inside a blade's reach, so the half of that fight
where you hit back did not exist. A thing hunting you circles YOU; the hall
only says where it may not go. After: a drone is in reach 42 % of the time,
closest approach 1.16 m.

**AND `wantH` IS A HEIGHT ABOVE THE FLOOR, NOT A WORLD Y.** The hall's floor
is six hundred metres up, so mixing the two is not a small error: the aim
branch wrote `wantH = u.g.position.y` to mean "hold where you are" and the
next line added the floor to it again, so the drones climbed six hundred
metres on the frame they first took aim and kept going. The bunker's own
lesson — a constant that describes one place is wrong the day the game
acquires another — wearing a fourth coat.

**A WAVE MAY NOT START BEFORE THERE IS A WAVE.** Everything is built at boot
inside the hall's own loader callback, so in a real game the light cannot be
touched before the units exist — but a wave started any other way (the
harness, a restore, a future skip) found `shrineGuards` empty, revealed
nothing, and left `waveClear` false for ever: a phase that can never end.
`startShrineWave` builds on demand, which costs nothing when they are already
there. All three waves are also WARMED, not just the boss — whatever has not
been submitted has not been compiled, and a wave revealed mid-fight is the
worst possible moment to find that out.

**THE TAKE WAS SLOW IN TWO SEPARATE WAYS AND ONLY ONE OF THEM WAS THE CLOCK.**
The owner's report was that you sit there for ten seconds waiting to get into
the ship. What was actually happening:

- **The abduction's assets were fetched in a CHAIN.** The reptilians, the
  beast and the drone were asked for inside the hall's own load callback,
  which means they could not start until the hall had finished downloading
  AND parsing. Measured off `performance.getEntriesByType('resource')`:
  `shrine.glb` completed at 3530 ms and the other three did not BEGIN until
  4910, finishing at 5980 — nearly three seconds of a warm connection spent
  idle, all of it on the wrong side of the white that `updateAbduct` holds
  until `shrineReady`. Asked for on the same frame they now come down
  together and everything is in by 4.0 s. The creatures are BUILT there too,
  because nothing about a hidden sleeping creature depends on the room it
  will stand in and the parse wants to overlap the hall's, not follow it.
- **And the take itself was 5.30 s of locked camera.** Every beat it has is
  worth having, but the longest single stretch was a second and a half
  between the ship settling and the beam being open, which is the player
  watching a cone brighten. Each beat is given the time it needs and no more:
  4.25 s to the cut becomes 3.15, and 5.30 end to end becomes 3.95. The two
  sounds that ran on their own absolute lengths — the approach roar and the
  beam swell — had to come in with it, or they overrun the pictures they
  belong to.

**THE BEAST IS FASTER EVERYWHERE BUT THE TELL.** It was slower than your walk
(`speedK` 0.78), circled a third of the time, and its bite's recovery was as
long as its wind-up. The startups are kept — that is where the fairness lives
— and everything round them is tightened: speed, `aggr`, `press`, the chain
into the slam, two chains not one, less circling; the slam `hold`s so it
rears on the spot rather than walking its own wind-up in, and takes most of a
guard (`guardK`); and it has the Dealer's `reacts`, so a charge in its face is
backed out of and the free heavy has to be bought.

**ONE THROW, ONE KILL.** `DRONE_THROW_DMG` was two of a three-point hull, so
a wreck hurled into a live drone bounced off a thing that kept flying. It is
`DRONE_HP` now: the throw is the whole reason a downed drone is worth picking
up, and it pays every time. (Testing it from the harness: place the wreck
INSIDE the drum's confine, or it bounces off the wall before it arrives.)

**THE BEAST HAS A SECOND WIND, AND IT IS GENERAL.** `kind.rage` is the set
of fields that change at half health; `updateMutantUnit` swaps `u.kind` for
a copy with them in it, once, and the creature stops and screams — you keep
your hands. Every number in the fight reads off `u.kind`, so the copy is
the whole mechanism. Sixteen health, and the charge takes two.

**THE FENCE.** `FENCE_*`, built right after the SCP (it asks `headlandAt`
for every post, and `headlandAt` reads `pathBend`). It stood nine metres
from the door on the headland for one build and opened when the SCP died;
the owner wants it ON THE BEACH and SHUT: it stands 92 m from the door,
where the ridge has finished coming down, across the whole beach from the
sea to the cliff, the gate centred on the sand, and nothing opens it —
`openFenceGate` is kept and nothing calls it. The tower and the thing on
its lane are seen through the bars. Fourteen-metre posts on
a 3.6 m pitch, rails and chain-link
between them, arms leaning out at the walk with three barbed strands
(barbs an InstancedMesh, two crossed boxes each), a razor coil along the
top and a meaner one along the foot (a `Curve` subclass whose axis runs
down the fence, `TubeGeometry` on it), and a gate on the lane: a beam with
five caged red lamps, KEEP OUT over it, DANGER and NO ENTRY beside it, two
leaves of heavy frame and mesh with spikes, and a chain with a padlock as
tall as you are. Two `rockColliders` boxes either side of the opening and a
third for the gate, `mat: 'metal'`, `top` thirty metres over the crest so
nothing steps onto it. **The wire is live**: inside 0.75 m of the line
(`updateFence`) it takes a point, cracks, flashes, and knocks you off it,
every two seconds — so backing into it during the fight is a thing you do
once. The `Locked` label is a `bare` interactable on a hit proxy across the
lock. (The gate does not open, by the owner's word: the walk's last
hundred metres are a thing you look at through it.) **Chain-link needs THICK
wire**: at five pixels of sixty-four on a 0.45 m cell the strand was four
centimetres, under a pixel at the retro scale from anywhere you can stand,
and the panels rendered as nothing between the posts. Eleven pixels on a
0.6 m cell, linear mips and a low alpha test, so it hazes out rather than
vanishing.

**THE HALL WAS DRAWING THE BEACH THROUGH ITS OWN WALLS.** "It lags in the
ufo before pressing the light" was 440k triangles a frame in a room of 96k:
the camera's far plane is five kilometres and the hall is three away, so
everything on the beach that is not in `farProps` sat inside the frustum —
the crabs and every other skinned mesh (`frustumCulled = false`, because a
skinned bounding box is the bind pose), the ocean plane (115k triangles,
left on the beach because the recentring does not run in the hall), the
horseshoe crabs, the wreck, the captain's head, the tower's lantern — and
was rasterised behind the colonnade every frame. `cullWorldInHall`: while
`inShrine`, every top-level scene child further than a kilometre and a half
from the camera is switched off and remembered, restored on the first
beach frame; the instanced pools and the lights are left alone. It is
called from `updateShrineFight`, because `update()` returns before
`updateFarProps` in the hall. The crabs write their own `visible` every
frame off the tide, so they carry a distance gate of their own
(`nearEnoughZ`). Measured in the hall: 360k triangles and 1064 draw calls
became 74k and 24. **And the pane's live loop was not running at all** —
`bw.lag()` read empty and `hallHid` stayed null until the function was
called by hand; the per-frame path was checked in the source instead.

**THE FENCE IS BARE, AND THE SAUCER IS HOW YOU GET PAST IT.** The signs,
the chain, the padlock and the live wire all came off on the owner's word:
it is fourteen metres of shut gate and nothing else (`fenceChain` stays
null, `fenceZap` is never set, the label is `Shut`). And the abduction
moved from behind the spawn to RIGHT BEFORE IT: `UFO_Z` is `FENCE_Z + 6`,
`ABDUCT_Z` four metres short of that, and the trigger reads the walk's own
way round again (`z <= ABDUCT_Z`; the restore's inference flipped with it).
The beam takes you ten metres short of the wire — never through it — and
`placeBackOnBeach` hands you back on the FAR side, on the toe of the ridge
(`groundY` off `headlandAt`), facing back at the ship still hanging over
the sand beyond the fence. It then falls twenty metres down the walk and
goes in at `FENCE_Z - 14`: a rim's width past the posts, between you and
the gate, so the way back is shut twice and the way on is the tower. The
witness stands off the same numbers and asks `headlandAt` for his feet.
The hall's assets went to the back of `ASSET_REACH` with it. Measured:
the take fires at -1098, the ship lies at (7.2, 3.4, -1122), you stand at
-1140 with 0.47 m of ridge under you.

**AND THE SAUCER COMES DOWN THROUGH THE GATE.** `CRASH_X` is the gate's
own x and `CRASH_Z` three metres past the fence line, so the fence runs
through the middle of the disc. `smashFence` (from `placeCrashSite`, so a
restore gets the same wreck) takes everything within `FENCE_SMASH_R` of
the gate: the posts, rails, arms, wires and barbs are instances and are
scaled to nothing, the panels and coils and beam and lamps and leaves are
hidden — the coils had to become ONE TUBE PER SPAN for that, a tube the
whole width cannot lose its middle — and when it happens live the posts,
the beam, the leaves' frames and plates and a few sheets of mesh leave as
gibs thrown down the walk and out to the sides. A post gib is built along
X and stood up with `rotation.z`, so it leaves standing and lands flat.
The gate's collider goes; the hull's spans the beach. `fenceParts` is the
handle the build block leaves behind for it.

**THE FENCE GOES DOWN AS A WAVE, AND THE CRASH HAS WEIGHT NOW.** Posts
thrown as gibs from mid-air were "fake": each post under the hull is stood
back on a pivot at its own foot (`fenceFalling`) and TOPPLED down the walk
on a delay that runs out from the impact, eased in, with a bounce, and the
pivot stays as wreckage. Sparks and a wall of dust run the width of the
line; `sfxFenceSmash` is a saw tear through a band under grit with seven
inharmonic clanks over the second the wave takes. The impact itself: a
second white frame, `K.ring` run out across the SAND from under the hull
(the boom's ring is gated off `crashCue.hit` so the two cannot fight),
fifty-six shards and forty embers off the rim, a dust curtain twice the
size and three seconds of it settling, and the hull ROCKS on the sand for
two seconds (`crashCue.still` parks it exactly on `placeCrashSite`'s pose
after). `sfxUfoImpact` is the crack, the sub, four crunches through bands,
six inharmonic plate partials, the sand, a four-second rumble and
twenty-six pieces of debris landing over three seconds — it was a thump
with sand on it.

**THE FENCE IS TAKEN A PIECE AT A TIME, BY TWO THINGS.** `takePost`,
`takeSpan`, `takeBeam`, `takeLeaf` are the only takers, and `smashFence`
is all of them within the footprint. The LEAVES are `physProps` entries —
the Dealer's table's own door — so the blade (`glassStrike`) and a thrown
body (`ragSmash`) break them: three blows each, a charge counting two,
into uprights, rails, bars and sheets of mesh thrown away from whoever hit
it; both gone and the gate's collider goes. And the HULL takes the fence
ON THE WAY DOWN (`fenceContact`, every frame of the fall and the settle):
its underside is a tilted plane, and a post whose top is under it goes
over now in half a second with sparks at the height it was struck, a span
loses its rails, mesh and coil at that height, the beam and the leaves the
same. The disc is tilted, so its low edge arrives first and the fence goes
down in the order the hull reaches it. Measured: the first post goes at
t 5.70 of the take, three are down by 5.90, the hull lands at 6.55 (the
fall was given half a second more so the contact can be watched). Before
this it clipped through and the wreckage appeared on the landing frame.
`fenceGate` had to be declared ABOVE the fence build — the build registers
the leaves at module time.

**AND SOMEBODY ELSE SAW IT.** A twenty-six metre saucer comes down on the sand
and until now the only witness was you. He is standing BEHIND you when the
black lifts, watching the same wreck — `assets/ntar.glb`, a Character Creator
alien through `gltfpack.py` (85 MB of textures to 7), placed off the same two
numbers `placeBackOnBeach` uses so the spot is never written down twice, and
turned to face the WRECK rather than you, because he is looking at the thing
you are. Four metres back and a metre and a half across: close enough to talk
to, far enough that turning round is a moment rather than a jump scare.

He is fetched WHEN THE FIRST WAVE IS SUMMONED, not at boot. Seven megabytes
for somebody you meet at the end of a boss fight has no business on the walk
to the tunnel, and the fight is minutes long, so the download has all of it to
arrive in; nothing waits on him, and if he lands after the hull does he is
placed the moment he arrives. The restore path needs the same treatment the
wreck needed — a save past the crash never fought the fight, so nothing has
asked for him yet and `placeCrashSite` starts the load itself.

**AND WHAT HANDS YOU A ROOM DECIDES WHERE YOU ARE LOOKING WHEN YOU ARRIVE.**
`placeInShrine` sets you down at the rim aimed at the light — measured, 0.72
degrees off it on the frame of the cut — and then the take's own look driver
went on turning your head toward the saucer's BEACH coordinates, which from
inside the hall is three thousand metres across the room: twelve frames later
the light was 12.9 degrees off centre and still drifting. The lift got its
`!inShrine` guard when this was first found; the AIM did not, and it is the
same bug wearing the other half of the same coat. Measured after: 0.00 at the
cut, 0.09 at twelve frames, 0.09 at seventy-two.

**AND A DOWNED DRONE IS THE ONLY LOOSE OBJECT IN THE ROOM, SO IT IS THE
ANSWER TO THE ROOM.** The second wave used to end with three wrecks lying
there being scenery. They are table-sized, the fight is one you spend dodging,
and they are the only thing in the hall that reaches something six metres up
— so a wrecked saucer is a SHIELD you hold between yourself and the next bolt
and a MISSILE that knocks the next one out of the air. Almost none of it is
new code: `makeProp` already gives a mesh the grab, the carry, the throw and
the hover label, and the hall already chains its floor into `bunkerFloorAt`.
What is new is the two things a wreck does that a bottle does not — it hurts
what it is thrown into (on its own SPEED rather than on contact, because a
two-and-a-half metre disc tumbling through the air does not need to be precise
to have obviously hit, with a cooldown so one throw cannot chew through all
three), and it stops a bolt, tested BEFORE the body so a bolt can never pass
through the thing you are holding up and hit you anyway. A wreck held at the
cut is left behind: it belongs to the hall, not to the walk home.

**AND THE LAST WAVE IS BOTH AT ONCE.** Five drones are built, not three — the
first three are the second wave and the last two come in WITH the beast, a
beat after its roar, so the final phase is not simply the biggest thing in
the room walking at you. You answer a slow enormous animal on the floor and
two things shooting at you from the air at the same time, which is the only
phase that asks for both. `WAVE2_DRONES` is what keeps `waveClear` honest;
without it phase two would wait for creatures that have not been revealed.

**AND A KILLING THROW TAKES THEM BOTH.** Two saucers meeting hard enough to
end one of them do not politely separate. If the blow was fatal the thrown
wreck goes up in the same blast — one white frame, one curtain of grit, its
own lights out (0.20 → 0.05) and both of them thrown — rather than the target
exploding while the thing that killed it clatters to the floor intact.

**A THING THAT CRASHES MUST LAND ON THE HEADING IT IS PARKED AT.** The
saucer's descent spun it (`rotation.y += dt * 2.4`) from wherever it had got
to, and `placeCrashSite` then stamped a fixed yaw on the frame it touched
down — so a disc tilted 34 degrees snapped through up to half a turn between
one frame and the next and changed which edge was buried in the sand. That is
the whole of "it crashes one way then is put in as a prop another way, it
looks as if it teleports into place". `CRASH_YAW` is written down ONCE and the
fall's yaw is an ARC onto it: the free spin is still integrated, and the drawn
yaw is blended off it onto `CRASH_YAW + 2π·n` — n chosen at the top of the
fall so the end of the arc is the nearest turn to where the spin would have
finished — over a smoothstep of the whole descent. Measured: worst yaw step
0.066 rad a frame through the fall, and the landing pose is the parked pose.
**And taking a FRACTION OF THE REMAINDER each frame is the trap that looks
right**: wrapped forward, a remainder of nothing is a remainder of a whole
turn, and the thing spun up to two turns a frame over the last stretch
(measured: 12.6 rad in one 16 ms step).

**NINETY-FOUR MEGABYTES, ALL ASKED FOR ON THE SAME FRAME.** Every `.load()` in
this file fired as the module evaluated, so the browser was handed seventy-five
requests at once against six connections per host — and what that does is not
"everything a bit slower", it is a QUEUE IN THE WRONG ORDER. Measured cold:
`shrine.glb`, which the abduction's white screen waits on, took 6.1 s for a
file that fetches in 83 ms on its own; `rust-rough.jpg`, twenty kilobytes,
took 3.7 s because it was behind forty-eight megabytes of boat, corpse and
bunker for places the player cannot reach for ten minutes. The same 101 MB
fetched THREE AT A TIME takes 1.27 s; all at once 2.24; one at a time 2.23. So
the fix is not fewer bytes, it is fewer bytes IN FLIGHT and a sane order —
`bwGlb` / `bwFetch` / `ASSET_REACH`, three heavy downloads at a time, nearest
first, which also leaves the browser's other sockets free for the little
textures and the sound bank instead of starving them. Three things it took:

- **The number is HOW FAR YOU HAVE TO WALK BEFORE IT MATTERS**, in metres from
  the spawn, because that is a fact about the game rather than an invented
  tier and anything added later has an obvious value. The abduction is 58 m
  BEHIND you, which is why the hall and its three waves sit near the front:
  it is the second place a player can get to and the only load a cutscene
  ever waits on. `bwSoon(url)` moves one to the head when the game turns out
  to want it now — the witness when the first wave is summoned, the hall and
  the saucer once you are within forty metres of the trigger.
- **A queue can only sort what is in it.** Leaving each `bwGlb` to enqueue
  itself handed the first three slots to whatever was DECLARED first (the
  lighthouse's grass at line 1900, the bunker at 20800) and the hall did not
  start for 5.6 s. Waiting for the module to finish instead was worse:
  BUILDING THIS WORLD IS TWO SECONDS OF SYNCHRONOUS WORK, and that is two
  seconds of completely idle network. The table is the whole list and it is
  known before a line of the world is built, so the queue is filled from it
  at the top of the file and the downloads run DURING the build.
- **And the other modules have loaders too.** `models/underground-bunker.js`
  had its own `GLTFLoader` and put twenty-two megabytes for a room behind a
  hatch ahead of everything; it takes `opts.load` now, and defaults to its own
  so `models/viewer.html` still works.

**AND A THROW INSIDE A NAMED SPAN SHOULD SAY WHICH SPAN.** An exception in
`animate` reports the line of the `bwSpan` call and nothing else, which is a
one-line stack for a crash that can be anywhere in the game; `bwSpan` names it
now. (The one it caught was the harness's own: teleporting the player past
`ABDUCT_Z` before the hall has loaded runs `placeInShrine` with `SH` still
null. Walking there cannot do it, but a test that teleports can.)

**A CONSTANT THAT READS A LATER ONE IS A DEAD ZONE CRASH.** `RUN_SPEED` is
declared at line 26 and the speed setting it wants to divide by at line 167,
and `8.0 / DEFAULT_SETTINGS.walkSpeed` took the whole page down before a
line ran. The number is written out with the arithmetic in the comment. And
the number that matters is the one the OWNER gets: his speed slider sits at
1.4, so "make 8 the max walk speed" means the constant is 5.71.

**AND ONE JUMP BROKE EVERY TABLE IN THE ROOM.** `Box3.setFromObject` reads
the geometry's bounds, and a piece lifted out of a scan by index SHARES the
whole model's position attribute — so every table measured as a box the size
of the hall. In `stompBreakables`'s loose branch (which runs every airborne
frame in the tavern and the undercroft) that put the player "beside" all five
of them at once, and one jump anywhere in the room took the lot, one a frame.
A breakable may carry its own `box`; measured after, ninety airborne frames
at the far end of the hall break nothing.

**AND A BOTTLE THROWN AT A MAN HITS THE MAN.** Every prop in the hall stops
at the drawn stone already; nothing knew about the two fighting in the
middle of it, so a bottle hurled at the drunk went through him and broke on
the wall behind. A body in flight that reaches a live one is a blow — the
bottle goes, a point of whoever it landed on goes, and he drops his quarrel
and turns on you for it, which is what a bottle thrown into a bar fight is
for.

**AND THE ARENA WAS SMALLER THAN THE ROOM.** Its box was the hall's own walls,
hand-set at z -5.9..6.9 — and the floor you can actually reach from the door,
flooded with a body's clearance, runs z -12.4..8.3: six and a half metres of
room SOUTH of the hall, behind the hanging carpets, that the player could
walk into and no creature could follow into. THAT is the spot in the owner's
screenshot. The box is the flood's box now (nothing reachable leaks west of
the door, measured), so the largest connected region is the whole floor.

**THE FENCE IS OUT AND THE SAUCER IS BACK BY THE DRAIN.** Both by the owner's
word. `FENCE_ON` is false: the fence is still BUILT — the crash site,
`smashFence` and `fenceContact` all name its parts — but nothing of it enters
the scene, holds a collider or answers the crosshair. The abduction went back
to where it first was, the one thing in the game behind you: `UFO_Z` is 58,
twenty-four metres behind the drainage tunnel home, the trigger is your Z
alone and GREATER than again (`ABDUCT_Z` = `UFO_Z` - 4, the restore's
inference flipped with it), the crash lands at `UFO_Z` - 9 and you are set
down eighteen metres short of it facing back up the walk, the witness four
metres behind you off `UFO_X` (there is no lane behind the spawn to stand him
on). Every downstream number was already written off `UFO_Z`, so the move was
the constants and the two comparisons; and the hall's assets went to the
front of `ASSET_REACH` again, because this is once more the second place a
player can get to.

**THE SEA KEEP PUT YOU IN THE WATER, AND IT WAS THE ABDUCTION.** "I'm not
spawning on the dock when going to the sea keep, it's putting me here" — forty
metres off the pier at sea level, looking at the island. Traced with a setter
on `camera.position.x` that records a stack on any jump over five metres: on
the first frame after the cut `updateShrine` wrote x = 2973 (the hall's rim
clamp) and `updateKeep`'s own rim clamp then dragged the body back to the
island's edge. The hall was clamping because THE ABDUCTION HAD FIRED: moving
the saucer back behind the spawn put its trigger back to `z >= ABDUCT_Z`, and
every room this game has stands at POSITIVE z on purpose — the keep at 6000,
the tavern at 12000, the undercroft at 2400, the dojo at 6000 — because every
trigger on the walk was "z less than a line". The first turn on the pier the
beam took you. The trigger asks `!inRoom()` now and wants the beach's own x,
and the notes about "your Z alone" mean your Z on the beach. **When a fix to
one thing moves a comparison, walk the list of places that only ever agreed
with the old direction.**

**AND THE WHOLE PICTURE TAKES THE LIGHT.** The saucer's own lesson: the eye
reads the FRAME, not the object, so a muzzle flash drawn as a blob in the
corner is a blob in the corner however bright it is. `magGlare` is a warm
screen-blended card at 0.30 that is gone in 110 ms — measured frame by frame
— under a flash that decays slower (10.5/s), a lamp at 150 rather than 88
and a sprite half again the size, with the trauma, the FOV punch and the
hitstop all up with them.

**THE GATE IS BACK, PAST THE FIVE, AND THE WAY OVER IT IS A CLIMB.** It is
still shut and nothing opens it (`openFenceGate` is still called by nobody);
what gets you past is the fence's own failure — one bay has RIPPED, and the
torn steel has curled out into ledges. Two things had to change in the fence
itself: its z is written off the same chain the mutants are (spelled out,
because `CAT_OUT_Z` is declared twenty thousand lines below it and a constant
that reads a later one is a dead-zone crash), and **the wall collider's top
is the top of the steel now** rather than thirty metres over it, so once you
are above 14.5 m the fence line is a walkway and the far side is a drop.

**TWO JARS IN THE HALLWAYS, AND A HALLWAY IS MEASURED.** Not in a room and
not on the way to anything — the point of them is that they are down a
passage you did not have to go down. So the spot is a NODE whose free floor
runs a long way one way and stops within a body and a half the other, at
least fourteen metres from the landing and clear of the key and the door,
and the two chosen are well apart from each other. **AND A WALL TOP PASSES
THAT TEST PERFECTLY**: the packer keeps any near-horizontal surface with
something over it, so the crown of a partition is a storey, and it is a
metre wide and twenty long. The first pair came out perched on one — measured,
the floor two metres away was 0.8 m HIGHER than the jar. A corridor's floor
has nothing under it; a ledge has a storey below, and that is the test.

**AND THE GATE IS OUT AGAIN, WHICH IS ONE LINE.** `FENCE_ON` is the one
switch precisely so this can be a line rather than a deletion: the posts,
the gate, the ripped panel, the seventeen ledges, the collider and the walk
over the top all read it.

**AND THE FENCES WERE PUT RIGHT ON THE OWNER'S WORD: they end AT the rock,
the stretch to the water is gone, and the rails run straight.** Three things:
- **An end is measured once, not found at load.** Casting along each fence
  from its middle to find the faces was fooled four ways in a row — grass
  cards, a stick lying across the path, a ledge over the sand that made the
  whole fence's "ground" 0.84 m, and a boulder with a low apron at its foot.
  `KEEP_FENCES[i].a/b` are the posts, placed a hand short of what a scan along
  the line met at every rail height; `.walk` is the walked line, and THAT is
  what `KEEP_BLOCKS` refuses, so the refusal reaches into the stone and there
  is no slot at an end.
- **The rails ride one straight line** fitted through the posts' ground (slope
  capped at ~6°), and a post whose sand is lower reaches down into it; each
  post taking its own ground reared the last span up the rock like a ramp.
  The end spans stop at the end posts; only the middle ones overhang.
- **Ground is read from the fence's own level** (`y`, off the aim readout).
Measured: 48 walks from both sides with jumps, 0 crossings.

**THE HALL CULL IS TAKEN AGAIN WHEN YOU GO STRAIGHT FROM ROOM TO ROOM, AND
NEVER FROM WHERE A WARM STOOD.** `cullWorldInHall` switches off everything
over 1.5 km away once per room and put it back on the first beach frame —
so the keep's door into the tavern (no beach frame between) left whatever of
the tavern the keep had switched off, off (`hallKey` now restores and retakes
it on any change of room). And `warmAtZ` moves the camera's z for a warm and
runs `updateFarProps`, which in a room built the hide list AT THE WARM'S Z:
the dojo's own lanterns (`dojoLights`, a top-level group) were switched off
for the whole fight, every fight. A list made during a warm is undone.

