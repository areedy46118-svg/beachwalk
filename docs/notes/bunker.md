# The bunker and the Dealer

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**AND A THING BACKING OFF PLAYS ITS WALK BACKWARDS.** The Dealer has done this
since he learned to read a charge — a NEGATIVE `timeScale`, so his feet go
where he is going — and every other creature in the game was stepping back
through a forward stride. One sign, in `mutAnim`.

**AND THE SOURCE SCANS ARE ON THE DESKTOP, NOT IN ~/Downloads.**
`~/Desktop/BEACHWALK ASSETS/` is where the owner keeps them; ~/Downloads is
cleared. And **the flags matter**: the cave repacked without `--yaw 180` came
out mirrored (x -1.41..16.45 became -16.45..1.41) and the way out of the apse
moved seven metres. The church is `--tex 2048` — 1024 is the resize too far
this file has already paid for once. `sips` is not enough for this packer;
PIL goes in a venv.

**THE MILITARY SHOVEL IS THE PRIZE FOR THE FIRST BOSS.** It used to lie on
the sand past the drain on the first morning. It is in an equipment case
on the Dealer's desk now (`makeMilCrate` / `buildMilCrate`, built with the
bunker props, placed by raycast onto the desk with the two red chairs at
the +x wall, the lid hinged on the wall side so open it stands against the
concrete), and the case reads LOCKED until `dealerWon` and opens on E
after. `militaryWorld` is never in the scene until the bunker has loaded —
if it were, the first minute of the game would have the shovel on the beach
again — and it is laid in the case by ONE rotation (model Y down the case's
X, the scoop face turned up). The pickup keeps its save id, so a checkpoint
that carried the shovel gives it back through the same handler, which opens
the case itself; a case built after a restore that already took the shovel
is built open and empty. **A decorative band round a box is four strips,
not a slab**: the first band was a solid box the full size of the case at
mid-height, and it hid the tool completely — a magenta debug material on
the lining floor changed nothing, which is how you find a thing inside
another thing. And a stencil lying on a lid wants its `up` pointing AWAY
from the reader (`makeBasis`, not a bare `rotation.x`), or it reads
upside-down from the room.

**THE BUNKER IS PACKED, NOT PLACED — AND ITS WALK IS IN THE FILE.** Bohdan
Lvov's "Underground Bunker" (`assets/bunker.glb` out of `tools/bunker_pack.py`,
`models/underground-bunker.js`) is a control room the owner wants as an exact
replica and has not yet said where; `spawnBunker(x, y, z, yaw)` is the one
call that will place it, and only the harness makes it for now. Exact means
NOTHING is decimated and no map is resized — 165k triangles and 17 MB of the
scan's own textures, the only liberty the metal-rough PNGs going out as q92
JPEG — so it is 23 MB, the biggest asset here by a distance, and that is the
brief. The scan is in metres at human scale (doors 2.38, ceiling 3.29) and is
put on its feet in Blender: floor at z = 0, room centred, so the game places
it with position and a heading and does the walk in the room's OWN frame
(`b.inv`), which is why it can stand at any angle. Five things it took:

- **The armature is the parent of the whole scene.** It only swayed the grass
  outside, but Object_4 sits between the Sketchfab root (scale 0.1) and every
  part of the room, so `bpy.data.objects.remove` on it orphaned the room and
  the first build came out ten times life size. Hand its children to its
  parent with their world matrices kept, THEN remove it.
- **The walk is rasterised, not boxed.** 416 mesh objects with merged names
  (`TableNAblem` spans the room) cannot be a hand-placed AABB each. Every
  triangle between knee and head height (0.15–1.95 m) goes onto a 0.1 m grid
  at pack time, and `blocked(lx, lz, r)` is a disc test against it. The grid
  rides INSIDE the GLB as extras on the root node (`userData.bw_nav`), along
  with the room box, the doors, the ladder and the lamps — one file, no
  numbers copied by hand. **And the grid must skip what the exporter drops:**
  a bare material-less `Icosphere` at the room's centre put a two-metre disc
  of nothing in the middle of the floor you could not cross.
- **The lamps are found by the emissive map.** The lamp mesh is one object
  with the roof details; sampling the emissive texture at every face's uv
  centroid and clustering the bright ones gives the six ceiling lamps, the
  console's light board and the siren. A PointLight goes on each — invisible
  when the group is far-culled, so they cost nothing until you are there.
- **Blend materials get their depth write back.** GLTFLoader turns it off
  for alpha BLEND, and the 94 lamp housings, boots and cable runs that share
  the "LightNTransparency" map are opaque over nearly all of it; without the
  write they sorted against each other. `alphaTest` 0.02 keeps the glass.
- **One clip is two things.** The 400-frame "HatchOpening" drives 120
  objects: the screens, panel lights, reels and rotors that should run for
  ever, and the hatch, which should open once and STAY open — the scan swings
  it shut again over the last seven seconds. Split by target name into an
  ambient loop and a hatch clip, and the hatch clip cut at its peak (frame
  236, found by scanning the quaternion track) into `openHatch()` and
  `closeHatch()`.

And in the walk: a frame that BEGINS inside furniture — a bite's shove, a
teleport, the wall clamp landing you against a desk — must be ejected to the
nearest clear cell, not let through; letting it through let you stroll about
inside the console bank. Blender 5's `Action.fcurves` is gone (layers →
strips → channelbags), and a Blender run piped through `head` dies of SIGPIPE
before it renders anything: write the log to a file.

**THE CASE SAYS SO WHEN IT UNLOCKS.** A locked case on a desk you walked
past is furniture; the moment he is down it has to become a thing to go
to. A lamp on the front goes from dim red to a green blink, a glint
breathes over the lid, the latches are heard a second after he falls, and
"Open the case" is on it. **And an interactable's mesh list is taken ONCE,
at registration**: the case was registered after the scan had been put
inside it, so `updateHover` raycast the shovel's hundred thousand triangles
every frame near the desk — "the shovel box is lagging". Register the case
before the tool goes in.

**A FOOTSTEP IS TWO EVENTS AND A ROOM.** The bunker's step was a bandpassed
tick, three sine partials and a lowpassed body all arriving on the same
instant, which is a small bell and not a person. A boot on steel plate is the
HEEL and then, three or four hundredths later, the sole rolling down onto it;
the plate rings at inharmonic partials because it is a bolted sheet and not a
string; there is grit between the rubber and the steel because nobody sweeps
a bunker; and the room answers a beat afterwards. That last one does most of
the work — a short convolution reverb built per step out of a decaying noise
burst with a few discrete early reflections in it. Without the tail the step
happens in a padded cell rather than forty metres down inside concrete.

**AND THE WAY OUT IS THE HATCH, NOT A PATCH OF CEILING NEAR IT.** The exit
proxy was a slab a metre and a half wider than the shaft on every side, which
in a fight is a prompt you catch by looking up and a room you leave by
accident. It is the shaft's own mouth now, with a `when` that asks you to be
standing under it — walk to the spot you came down at, look up at the lid,
press E. Everywhere else in that room there is no way out, which is the point
of the room.

**A THING COMES APART THE WAY IT WAS HIT, AND IT FALLS RATHER THAN FLIES.**
The coat stand's second break threw every piece RADIALLY, out from the post
and upward — you walked into it and it jumped away from you on all sides at
once, which is a thing bursting, not a thing being knocked over. Four
changes, and they are the general rules for breaking anything in here:

- **The blow has a direction and the pieces take it.** A body's direction is
  its Verlet particle's own velocity (where it is now less where it was last
  frame); yours is the line from you to the thing.
- **How high a piece stood is how far it travels**, because the top of a
  falling post is the end that is moving, and the vertical kick is a quarter
  of what it was: it topples, it does not launch.
- **A long piece turns about its FALL, not about itself.** Random spin on
  three axes is a stick being juggled; a post knocked over rotates about the
  axis across the blow.
- **It comes apart in beats, top-down** (`gib.wait`), the sandcastle's own
  lesson — everything leaving on one frame is an explosion. And the post
  lengths leave UPRIGHT: they used to be given a random tumble on the frame
  they appeared, so the post was already lying at an angle before it had
  fallen, on the one frame that has to look like the thing you just hit.
- And a break throws SPLINTERS from the break itself, so the eye is given
  something at the height the blow landed.

**WHATEVER MOVES THE PLAYER LAST MUST RE-RUN THE ROOM'S CLAMP.**
`updateBunkers` sits at line 17507 and `updateMutant` at 17658 — a hundred
and fifty lines LATER — so the creature's own "you do not walk through two
hundred kilos of it" push moved the camera after every wall and furniture
clamp in the frame, and nothing corrected it until the next one. That is the
whole of "I keep getting stuck in a block in combat", reported three times:
he presses you into a desk, the push puts you inside it, the clamp takes you
out, he presses again, and between the two you do not move at all. It was
never a hole in the clamp, which is why three passes of strengthening the
clamp did nothing. `clampPlayerToRoom()` is callable on its own and both the
body push and the knockback call it; better, `shovePlayer` REFUSES a push the
room had to correct, so a man backed against a desk stays where he is and the
creature comes round instead. Measured, with him pressing: 13 spots backed
into furniture, none stuck in any of eight directions.

**A THING BREAKING SHOULD COME APART INTO WHAT IT WAS MADE OF.** The coat
stand's first break deleted it and threw fourteen identical dowels, which is
not a coat stand breaking — it is a coat stand being replaced by dowel. Every
piece it is BUILT from leaves now, from where it actually stood and carrying
the rotation it was drawn with: three feet, four hooks, four tips, the knob,
and the post SPLIT into three lengths at the height it was struck, with the
broken faces slanted, because a cylinder capped square at both ends is a
dowel and not a broken post. Fifteen pieces, and the post reads as snapped.

**IT IS THE DESK, NOT ANOTHER TABLE.** The first breakable table stood
across the room from the desk the fight is fought over and left that desk in
place, and the owner saw two tables. The scan's desk is part of ONE merged
mesh with everything else made of wood in the room (`TableNAblem_WoodNPaper_0`,
570 triangles spanning the whole floor), so it cannot be hidden — it is
CARVED: `carveDesk` walks the index, drops every triangle whose centroid
falls in the desk's box in the room's frame (150 of them), and `setIndex`es
the rest. The rebuilt desk stands where they were, to the millimetre the
raycast measured (top 0.835, 0.73..2.83 by 3.24..4.58), so the crowbar's own
raycast finds it at the same height and the pickup clip's hand lands on the
bar exactly as before. **And it wears the scan's own material**, which is
half the job; the other half is that it wears the scan's own GRAIN. The
first rebuild pinned every face to ONE texel of the desk's wood — exactly
the right colour under exactly the right light, and no wood at all: the
owner's words were that it did not look like real wood, it looked like
brown shapes. A single texel cannot be anything but a flat fill. `DESK_UV`
is the two RECTANGLES the desk's own triangles occupy in the scan's atlas
(top u 0.060–0.663 v 0.557–0.961, legs u 0.259–0.486 v 0.675–0.781),
measured off a FRESH `GLTFLoader.parse` of the GLB in the pane, because
`carveDesk` has already dropped those triangles out of the live index and
there is nothing left in the running game to measure. `woodUV` then
PROJECTS into them — the five top planks through a plan projection of the
desk's own footprint, so laid side by side they reassemble the original top
texel for texel and the seams are still invisible until they come apart;
the legs and rails along their own length, so the grain runs down the
timber and not across it. Which way round the rectangle goes is settled by
the ASPECT and not by guessing: the top's rectangle is 1.49 wide against a
desk 1.57 wide, so u runs along the length. And the projection is done by
POSITION rather than through the box's own uv, because a `BoxGeometry`'s
six faces each carry their own 0..1 and their own idea of which way is
up — one plank's band coming out mirrored would break the join with the
plank beside it.
The walk grid already knew this desk from pack time, so no collider is
added for it — and **the floor has to be OPENED when it breaks**
(`openDeskFloor`), or the wreckage is a two-metre patch of invisible
furniture nobody can cross for the rest of the fight. Clear `S._main` with
it: the largest-region cache was computed with the desk in.

**AND THE MUG WAS FLOATING.** There is an enamel mug on that desk —
`Cup6_PultNPeripherals_0`, its OWN 320-triangle mesh and not part of the
merged wood, bottom at 0.856 on a top at 0.835 — and the break carved the
top out from under it and left it hanging in mid-air for the rest of the
fight. The lesson is the carve's, not the mug's: **taking a surface away
does not take away what was standing on it.** `carveDesk` now MEASURES what
is up there — every mesh of the scan whose whole bounding box stands inside
the desk's footprint above the knee — rather than naming the one it knows
about, so a second thing on that desk cannot be missed the same way. On the
break each is taken out of the scan, re-parented into the world with its
own decomposed world transform, and thrown as a gib on the first beat,
because a cup does not wait for the legs to go. It is handed `half`
explicitly: its geometry is in the scan's own units and `updateGibs` would
measure it there.

**AND THE CAMERA COMES APART INTO WHAT IT ALREADY WAS.** The desk had to be
rebuilt out of boxes to break — 150 triangles of one merged wood mesh, and a
replica only as far as boxes go. The tripod camera did not: it is NINE
CONNECTED ISLANDS inside `polySurface425_ComputerNCam_0` — body, lens barrel,
film magazine, head plate, collar, a fitting and three legs — and those are
exactly the pieces a camera on a tripod comes apart into. So every one of
them is lifted out of the merged mesh vertex for vertex with its own
positions, normals and uv on the scan's own map, and the scan's triangles are
then dropped from the index. It is not a replica of the camera; it is the
camera, moved. Three things it took:

- **Weld by POSITION before you flood.** The scan splits vertices at every uv
  seam, so an index-only flood finds this camera in seventeen pieces.
  `islandsOf` rounds each vertex to the millimetre and floods on that.
- **A piece is centred on ITSELF, not on the thing it came off.** The first
  lift re-centred every island on the tripod's floor origin, which draws
  perfectly while they are children of one group at that origin and is wrong
  the instant they are thrown, because a gib is moved and spun about its
  mesh's POSITION: the camera body's vertices stood 1.7 m above its own
  pivot, so `updateGibs` laid the pivot on the floor and the camera went on
  standing exactly where it had been, in mid-air over its own wreckage.
- **A tripod is not a wall.** This is the one place the desk's rule is
  wrong: a desk is cover you put between you and him and it SHOULD stop a
  body, but three aluminium legs are a thing a person shoulders through.
  Its cells come out of the walk grid at build (`openNavBox`, which is
  `openDeskFloor` with the box handed in — the chairs' own treatment) and
  walking into it brings it down, the coat stand's rule. The blade still
  finds it, because `glassStrike` raycasts the prop's own meshes and never
  asks the grid.

**RAISING THE REACHES MOVED THIS STALL ONCE ALREADY AND I CALLED IT FIXED.**
The first time he would not swing, the answer was that his reaches were the
Dealer's and shorter than his own arms — true, and raising them made him
attack. It did not remove the loop, it just moved the orbit to a distance
where the numbers happened to line up, and the next change to his timings put
it back. **If a fix makes a symptom go away without naming the mechanism,
expect it back.**

**A ROOM YOU CAN WRECK IS A ROOM YOU ARE IN.** The bunker had eighteen
breakables and a coat stand, and all of them were small: you could scatter
the scenery but you could not change the SHAPE of the fight. The work table
is the piece that does that — heavy timber in the middle of the floor, cover
you can put between you and him, the thing a thrown body lands on, and where
the equipment case sits, so bringing it down is also how the shovel gets out
of the case whether you meant it or not.

It breaks into WHAT IT IS MADE OF, the coat stand's rule: five planks off the
top, four legs, the apron rails, the shelf boards, the corner brackets. And
it collapses rather than bursting — `gib.wait` staggers it, legs first, the
top a beat later, the shelf last, which is the sandcastle's own trick. Both
doors in are the ones every other breakable here already uses: it is
registered in `physProps` with a no-op `step` and an `onImpact`, so
`glassStrike` (the blade) and `ragSmash` (a corpse or a thrown jar) find it
without a third code path. Measured: broken by a swing, and broken by the
Dealer's body thrown into it.

**AND THE LEGS STOOD UP LIKE CANDLES.** Same as the coat stand, in a new
place: `updateGibs` rests every gib with its rotation zeroed, which lays the
planks and rails flat because they are built along X and Z, and stands
anything built along Y bolt upright on the floor. A leg gets its geometry
turned onto X with the quarter turn put back on the mesh.

**AND ONE THING IN THE ROOM IS PART OF THE FIGHT.** The coat stand is not in
the nav grid on purpose: a thing that breaks when you touch it must not also
be a wall, or a body would stop at it and never knock it over. Anyone walking
into it brings it down — you, him, or a ragdoll sliding through — and it goes
to dowel rather than to case and tube and sparks, because it is wood. Its
spot is checked against the walk grid rather than guessed; the first one
stood inside a desk.

**THE CAMERA IS THE PLAYER'S.** It should move for what he does and for what
is done to him, and not for anything else — a body landing across the room, a
monitor coming off a desk, a bottle going. In a steel box with eighteen
breakables and corpses being thrown into the walls, a jolt on each of those
read as the building shifting, and the owner asked twice for it to stop. The
killing blow still shakes it (that is the player's own hit, and it decays to
nothing in half a second); the landing that follows adds exactly zero.
Measured: trauma 0.598 on the blow, 0.000 through the body's arrival at
0.88 s. A ragdoll gets sound, pieces and whatever it breaks — never the lens.

**AND HE CAN BE STUCK MID-SWING.** `unstickDealer` gave up the moment
`st.atk` went positive, which is most of a fight — attacking, chaining or
recovering — so a body wedged into the console bank between two swings never
once asked for a way out. The grind is slower to trigger while he is swinging
now rather than switched off entirely.

**THE LADDER IS GONE AND THE WAY OUT IS THE HATCH.** It stood in the middle
of the only clear run in the room and was the thing you were forever walking
round, and it was the wrong thing to aim at anyway: the way out is the steel
lid you came in through, directly overhead. The mesh is hidden, its cells go
out of the walk grid with the chairs', and the exit proxy is a 2.3 m slab
just under the CEILING — not at the ladder's own top, which stood 43 cm
through the roof and so put the thing you aim at outside the room. It reads
from 34 degrees of up-pitch to straight overhead.

**FINDING A HEADING IS NOT THE SAME AS GETTING ANYWHERE, AND THAT IS WHAT
HAD HIM ON THE TABLE.** `steerDealer` is a fan of headings and a fan is a
GREEDY walk: in a pocket between the furniture and the wall the nearest clear
heading points further into the pocket, he takes it, the push-out cancels the
step, and next frame the same heading is nearest again. Traced: the same
140-degree turn chosen for four seconds while his position changed by two
centimetres. He was never blocked and never stuck — every frame he "found a
way" — he simply never moved, and widening the fan from ±115° to a full half
turn (worth doing, and done) fixes none of it.

So the test is PROGRESS. If he has barely moved for most of a second while
trying to close, the fan's opinion is worthless and the ROOM is asked
instead: `S.route` is a breadth-first search over the free cells, thinned to
corners, 0.39 ms a call on a 59-by-113 grid, run only when he grinds. Two
things it has to do beyond the obvious. **Both endpoints may be inside
something** — you standing against a desk, him mid-shove — so each walks
outward to the nearest cell a body actually fits in. And **when there is no
way all the way there is still a way closer**: it returns the reachable cell
nearest you rather than null, because null drops him back on the fan that got
him stuck.

**AND THE FLOOR IS NOT ALL ONE PIECE.** Flooding the free cells finds THREE
regions — the room, and two pockets of about two square metres behind
furniture that nothing his size can walk out of. They are not a bug in the
grid, they are real gaps between a desk and a wall, but a body shoved into
one is a boss who has left the fight. `S.mainRegion` is the largest region,
computed once, and it is never more than 2.07 m away from anywhere.

**BREAKING SOMETHING DOES NOT SHAKE THE ROOM.** A monitor coming off a desk
is a noise and a shower of parts, not an event the building feels — and with
eighteen breakables in there, a jolt on each turned a fight through the
console bank into a camera that would not settle. The blow that broke it has
already put trauma through the camera, from `hitConnect` or from the body's
own landing. Measured: six broken at once, trauma stays at zero.

**THE ROOM IS ELECTRICAL, SO MOST OF WHAT BREAKS SHOULD BE.** Eight props
with two screens between them made a control room you could barely damage.
Eighteen now, eleven of them sets and monitors and gauges, along the console
bank and the desks where a thrown body actually lands — and `ragSmash`
already routes a corpse into the same `onImpact` the shovel and a thrown
bottle use, so all three break them the same way: case in pieces, tube in
shards, sparks off the break.

**AND TWO THINGS THAT MAKE THE FIGHT UNMEASURABLE.** `updateDealer` runs
inside `updateHatch`, which is on the WALL CLOCK beside `update()` — so a
thousand `__bw.step` calls never tick him, and `st.cool` sitting frozen at
one value is the tell. And **dev mode turns his swinging off outright**: the
"at reach with its breath back" branch is gated on `!settings.devMode`, so
switching dev mode on to stop a death reloading the page is switching off
the thing you came to measure. Heal unconditionally every frame instead.
Real-time, healed, at fighting range: 38 swings a minute.

**A RESULTANT CANCELS INSIDE THINGS, AND THAT IS WHAT A CHAIR IS.**
`pushOut` sums the push from every cell the body overlaps, which is right
against a bin and right along a desk front — and exactly wrong between the
legs of the swivel chair, where every cell has an opposite number and the sum
is nothing. The body does not move, the caller reverts the frame, and you
hold W against a chair for ever. `S.escape` is the last word: rings of
candidate spots at widening radius, nearest clear one wins, and it runs for
the player and for the Dealer after the push fails. Only if even that finds
nowhere is a move refused, and there is nowhere in this room where it does.
The test that proves it is the one worth keeping: 364 cases — a grid of
starts, walked hard into everything in four directions, then asked to leave
in any of eight — and zero that could not. **And a movement test with the
dialogue still open measures nothing**: `frozen()` stops the player dead, so
the first run of that sweep reported all 160 cases stuck, including the
middle of an empty floor.

**HE IS NEVER STUCK: STEER FIRST, SLIDE SECOND.** The fight AI walks at you
and knows nothing about the room, so a tripod or a desk corner was a place to
hide. `S.clearAhead` marches the nav grid along a heading; if the next stride
is not clear the same stride is spent on the nearest heading that IS, fanned
±20° to ±115°, nearer first, with a `turnBias` held for 0.7 s so he does not
dither at a corner. Whatever the steering misses, `clampDealer` pushes out
along the resultant (the player's own call) rather than reverting — reverting
is what standing still IS. Measured: he reaches within 1.1–2.0 m of all four
corners of the room, including the ones behind furniture.

**AND THE ROOM IS FULL OF THINGS TO BREAK.** Eight `PhysProp` bodies —
bottles, jars, valves, a set, a monitor — picked up with E, thrown, and
broken on the wall, the floor or on him; `glassStrike` already walks every
prop with an `onImpact`, so the shovel breaks them for free. Three things the
physics needed, none of which the beach had ever asked for. **A body needs a
FLOOR forty metres down**, and it cannot join the "highest surface wins"
test the others use — the highest surface under a bottle in the bunker is
the beach over its head — so `bunkerFloorAt` replaces rather than competes,
and it is a forward hook because the room is declared thousands of lines
below the physics. **A desk top is not a ground**: props placed by raycast
onto the room's own meshes fell straight through the desk they were set on
and smashed on the floor the moment they existed, so a body may carry its
own `floorAt`, which answers for its perch and stops answering a hand's
width off it — which is exactly when it should fall. And **a sealed room
needs walls**: nothing in the physics knew about them, so a hard throw went
out through the concrete and left its shards lying on the sand, which is
what `confine` is — a world-space box the body bounces off.

**THE HATCH IS A CUT, AND THE ROOM IS UNDER THE BEACH.** The bunker's only
door is a steel lid in the sand at `HATCH_X / HATCH_Z` (halfway from the
snorkeler to the tall one); the room stands at `BUNKER_Y` = -40 directly
under it, sealed, `hidden` — drawn only while you are in it or on the way
(`updateBunkers` toggles `visible`, and the loader's PointLights go with the
group, so they cost nothing until then). Entering and leaving are the same
shape (`updateHatch`, on the WALL clock beside `update()`, so hitstop cannot
stretch it): the lid seen to swing for 0.44 s while the screen goes black,
the cut at 0.48 — teleport, `camBaseY`, `vy`, `groundY`, `inBunker` and the
look all set in one place — black held to 0.76, in by 1.25, with the slam
heard behind you at black. `hatchBusy` is in `frozen()`. Three things it
needed: **the room's floor is THE floor** — `updateBunkers` used to raise
`groundY` to the room's y only if that was higher, which forty metres under
a beach at y = 0 it never is, and you would have fallen out of the room to
the sand above; **you come out where you went in** (`hatchReturn`), not at
a fixed spot, so the collar you were standing on is under you again; and
**the scan's hatch clip spends its first 8.5 s on the cogs**, so to see the
cover move before the black it is started at 7.9 s and run at 3.2x, then
`stop()`ped at the cut so it is shut again next time. AND NOTHING ABOVE 240 Hz LIVES IN THE ROOM'S AIR: a CRT's
flyback at 7840 Hz was in the bed and read as tinnitus, because a pure high
sine has no envelope and nowhere to hide and the ear locks onto it. **AND IT
IS WARMED THROUGH THE CANVAS.** Four hundred meshes and seventeen megabytes
compile and upload on the first frame they are drawn, which froze the game
at the press that had to be seamless — and warming into an 8x8 render
target, the way the drain is warmed, bought nothing: a target has its own
output colour space, so three compiles a DIFFERENT program for every
material and the canvas pays the whole bill again. Measured: warmed into a
target the first real frame still cost 116 ms; warmed through the canvas
with a four-pixel scissor it is 27, and that one lands while the screen is
black. **AND THE COLLIDER GRID INTERPOLATES.** It marked every cell in a
triangle's bounding box if ANY corner of it was between knee and head
height, so a cable hanging from the ceiling and a roof beam sloping down
laid their whole footprint on the floor as a wall; the height is sampled at
the cell now. The room's air is
`bunkerMix`: the surf and the wind (`windDuck`, a stage added to the wind
chain for this) pulled to a tenth, a mains hum, a breathing fan and a thread
of CRT whine, and steel underfoot (`sfxStepMetal`, no print).

**THE BUNKER IS A STEEL BOX AND YOU SHOULD BE ABLE TO HIT IT.** Every wall
in the game answered a blade except the ones you spend the boss fight
standing between: down there a swing that met concrete was a whiff, and a
sword that passes through a wall is a sword that is not really in your
hands. It cannot be a raycast — the room is 165k triangles and a swing
would hitch every time — so the ray is MARCHED against the same two things
the walk itself is clamped by, the room's own box and the 0.1 m furniture
grid. Fifty samples, no geometry touched, and it catches the desks and the
console bank as well as the walls. `nearestSolidHit` also reaches the
pavilion and the drain now, both guarded by distance, because a raycast
against either from the far end of the beach is a swing's worth of work for
nothing. Steel gets its own sound — a hard tick and then three INHARMONIC
partials ringing for the best part of a second, because a bolted sheet is
not a string — and a blade on steel throws sparks.

**AND WHAT IT MET IS WHAT YOU HEAR.** Every one of those surfaces answered
'metal', because "everything down there is" — and it is not: a blade laid
into forty centimetres of poured concrete rang like a bolted steel plate
and threw sparks off it. The owner's words were that swinging onto a
material should match the material's sound, even the bunker walls. The
march already knows exactly which face it stopped on, so it says so: the
walls and the ceiling are CONCRETE, the floor is the steel deck plate you
can hear yourself walking on, and the desk — the one timber thing in the
room, and the thing you are most likely to swing at — answers wood while it
is standing, through a `deskWoodAt` hook the desk section sets thousands of
lines later. The rest of the grid is the console bank and the steel
cupboards and stays metal. Concrete is its own branch of `sfxPropHit` and
the point of it is that it is DEAD: a flat crack with a short low body
under it for the mass of the wall and a hiss of grit off the face, and no
ring at all. Stone rings because a boulder is one lump; a wall bedded into
the earth cannot, and anything that does read as metal. It throws four
sparks off the aggregate rather than a steel plate's shower, and its chips
are pale dust rather than blue stone. `__bw.probeSolid()` reports what a
swing from where you stand would meet and what it would sound like — the
bug was invisible without it, because the picture was right and only the
sound was wrong. Note the grid is a PLAN: a desk is one solid column from
the knee to the head, so the whole of that column answers wood, not just
the slab under the top.

**AND THE DEALER'S TABLE HAS A DRINK ON IT.** The bottle is a takeable like
any other and where it stands is SCORED, not typed: a grid over the table
top inset 0.22, ranked by distance from the crowbar's spot, the Dealer's own
post, the equipment case and everything already perched there, with a
raycast down for the exact height. It landed at the far +x corner, clear of
the cutscene. `refillBottle()` is the one door — `waterSips`, the model's
own `setFill` and the copy in your hand, which is found BY NAME, because
`holdable` clones and `setFill` closes over the original's mesh. And when
the work table goes it is SET ON THE FLOOR along the blow rather than
thrown: it is a takeable, not a physics body.

**AND FINDING A HEADING IS NOT THE SAME AS GETTING ANYWHERE — the Dealer's
lesson, which the tavern's own steering never learned.** `tavSteer` was a fan
of headings, and a fan is GREEDY: in the pocket between a table and a wall the
nearest clear heading points further into the pocket, the body takes it, the
push-out cancels the step, and next frame the same heading is nearest again.
The room is asked instead — `tavGrid` rasterises the hall once (2,400 cells,
rebuilt when the furniture breaks) and `tavRoute` is a breadth-first search
over it thinned to its corners, with the fan kept only as the last resort.
Both ends may be inside something, so each walks out to the nearest cell a
body fits in; and a PROGRESS TEST above it (the line is shut and he still has
not moved for 0.7 s) throws the current opinion away.

**THE DEALER'S DESK BREAKS IF YOU JUMP OR STEP INTO IT.** `stompWorkTable`:
airborne or mid-dodge (in the fight Space IS the step), moving over 1.2 m/s,
your middle within 0.4 m of the desk's box and moving into it — and it comes
apart along the way you were going (`smashWorkTable`, which also spills the
case). Walking into it still just stops you. The loose stomp stays off in the
bunker for everything else.

**THE DEALER SPEAKS HOWEVER YOU ARRIVED.** His opening line — which starts the
pickup, which starts the fight — was fired only from the end of the hatch's
cut, and a checkpoint (`bunkerIn`) puts you in the room without one: nothing
asked the question, `dealerFight` never went true, and he stood on
`DEALER_POST` for good. `updateDealer` now asks it on the first frame you are
in the room with your hands free and the black gone (`dealerMet` is not on the
save, so a load always gets it). Measured from a real `bunkerIn` reload: the
line at 3.6 s, and after it he closed 6.4 m → 1.1 m with seven swings in 8 s.

**THE IMMOBILIZE THROWS GOLD LEAF, NOT GLOWING DOTS.** `ART_MOTE_N` 160 flakes
in one `ShaderMaterial` batch (`aSeed` per flake): a cut-out flake shape that
tumbles and catches the light on its face, falling under gravity and drag with
a flutter and settling on the floor under it (`bunkerFloorAt`). Additive round
sprites read as a cheap particle effect, which is what the owner called them.

**THE BUNKER IS SLIMMED, AND IT LOOKS THE SAME (`tools/bunker_slim.py`).**
The scan's source is gone, so the packed GLB is slimmed in place: meshes
simplified per primitive by meshoptimizer's attribute-aware simplifier to an
ABSOLUTE 2 mm in the room's metres (normals and uv in the metric, open
borders locked; a collapse lands on an existing vertex, so every surviving uv
is the scan's own), the near-lossless JPEGs re-encoded (colour/emissive q95,
normal/metal-rough q92, 4:4:4), two byte-identical maps stored once, and the
shadow decal — a 2048 PNG that is pure white with only an alpha — shipped as
a grayscale JPEG named `Shadows_alpha`, which `models/underground-bunker.js`
moves from `map` to `alphaMap`. 23.8 MB → 17.2, 165k triangles → 115k. The
tripod's 39 islands, the desk's and the mug's bounds are unchanged.
Measured over 26 views rendered at 960x540 with no retro scale: mean
difference 0.54 of 255, 0.2 % of pixels over 12, and an unchanged copy diffs
at exactly 0. Nearly all of that is the texture re-encode, not the geometry.
**The pip `meshoptimizer` binding declares no argtypes for
`meshopt_simplifyWithAttributes`**: its size_t arguments go across as
32-bit ints and the call silently collapses nothing. The script declares
them itself. Run it on `git show HEAD:assets/bunker.glb`, never on its own
output.


**THE BUNKER IS PAST THE PAVILION NOW (2026-10-13; the owner: "move the bunker
after the pavillon but before the mutant fight").** `HATCH_Z = MUSH_Z - 62`
(−542): past the pavilion's mood band (`MUSH_Z − 40`) and `SCP_Z` (−15 from the
house), 38 m short of where the mutants wake (`MUT_Z + MUT_TRIGGER`, −580). It
was `SNORK_Z − 58`, between the snorkeler and the tall one. Everything about the
room, the Dealer, the crowbar, the return spot, the map and the restore's
`roomBeachZ` is written off `HATCH_X/Z`, so the move is the one line.

**THE BLEEDING BENCH (2026-10-14, the owner: "move the dealers horseshoe
dissecting machine right here and make it look better have 3 horseshoes on it
with 3 jars to grab … pale like they have been sucked dry").** The shelf under
the reel-to-reel is gone; `buildBleedRig(g)` builds a bench of its own at
room-local x −0.40 against the +z wall (face measured at z 5.62 = world
−533.08; the AC unit overhangs from 1.79 m up within 0.4 m of the wall, so
nothing is taller than 1.47). Its own frame, `R.rotation.y = π` (+z out of
the wall). `BLEED` holds the numbers. Stainless lab table (lip, apron, legs,
shelf) with a painted pump cabinet on its back edge: three peristaltic heads
(`rotors`, turning), a gauge (`needle`), a blinking red `lamp`, a switch,
vents, mains cable; three tilted trays, a crab in each (`makeCrabRelic` at
0.60) with the syringe in its hinge (same `_hinge`/`sRot` as before), a line
up into the pump and out, down and along the tray into a jar on the front
edge. Canvas maps (`bleedMaterials`), uv in metres (`bleedBox`).
- **Pale**: `bleedPale(m)` — a clone of the scan's material with the map
  desaturated and lifted toward chalk in `map_fragment`; swapped in by
  `updateBleedRig` once the scan has meshes (`B.pale`).
- **Straps** are laid then too: rays down the TRAY's own −y (it is tilted
  0.30 — world-down rays landed 15 cm off and the straps went under the
  shell) across two lines, a tube through the hits.
- **Jars**: `bleedJarsTaken` is three bits now. `keepSize: true` on their
  `addInteractable` — without it a pickup is blown up 3× for the sand, and
  the jars came out wider than the crabs.
- **Solid**: `closeNavBox(g, B)` (the counterpart of `openNavBox`) writes
  '1' into the walk grid over its footprint. The floor monitor at (−0.35,
  4.45) in `BUNKER_PROP_SPOTS` is gone (it stood where the bench is).
- The Dealer's hp 24 → 36 ("give the dealer more health").

**THE BENCH AT THE GAME'S JAR SIZE, AND THE VALVE (2026-10-14, later).** "Make
the jars … actual size … stop making them smaller. scale up the machine to
match … make one of the jars empty with a regular colored crab which you have
to turn the valve … until it turns and fades white … take out the jars on the
bottom". The jar the player knows is the one on the sand, which
`makeNoticeable` lifts to `ITEM_MIN_SIZE` — ×3.04 for this model — so
`BLEED.jarS` 3.04 and the bench grew: W 2.9, D 1.45, top 0.90 (a lab table's
height, not scaled), cabinet 0.74 tall (top 1.67, under the AC's 1.79),
heads r 0.12, trays 0.84 × 0.56 for crabs at the scan's size (`CK` 1.0),
straps across x ±0.25. The shelf is bare. `bleedPale(m, U)`: one shader, the
dimmed own colour at `U.value` 0 and chalk at 1. Crab `BLEED_DRAIN_K` (2)
starts at 0 with an empty jar (`jarEmpty`, locked); "Turn the valve" (a red
handwheel beside its head) runs `B.drain` over `BLEED_DRAIN_T` 7 s: the wheel
2.5 turns, the head flat out, the jar to 0.72, `U` to 1, then
`bleedJarTakeable`. Saved as bit 3 (`BLEED_DRAINED`, 8) of `bleedJarsTaken`.
Measured: U 0.05 → 0.37 → 0.77 → 1.0 over the run, take-jar interactables 3 → 4.

## The bleeding bench made smaller and measured into the room (2026-10-14, round 2)
At 2.9 m its right end stood 12 cm into the slatted rack (`polySurface425`), and its front reached his
chair (`Chair2_TVsNshit_0`) and the desk. Clear wall, by rays in the rig's own frame (+x along the wall,
which is room −x): −1.15 … +1.33 m about the OLD centre (room x −0.40), free out to 1.05 m from the wall;
the AC's underside is 1.83 up, the control panel overhangs only past −1.4. Now `BLEED` x −0.35, W 2.3,
D 1.0, CK 0.75, `SLOT` 0.74: each slot is tray (offset −0.13) + jar (+0.23, still ×3.04 — a jar is 0.26
across at that size, which is what sets the slot), the pump head over the slot, the valve to the head's
LEFT (over crab 2, clear of the gauge). Cabinet 0.62, dish on the cabinet, power lead down the left end
stopping short of the chair's leg. Checked by casting across the bench's box in x, y and z: no hit.

## The Dealer flies on the kill again (2026-10-14)
"Make the dealer fly far like he used to when hit for the kill." He stopped when `RAG_VMAX` came down
14 → 6.5 m/s (the corpse-glitch fix): the cap scales the WHOLE velocity, so his ~9 m/s death throw and
its lift were cut — measured, his hips went 1.95 m along the floor, 0.09 m up. His kind now has a first
flight of its own, as the demons do: `ragK 2.0, ragVmax 16, ragTravel 12, ragLift 1.9` (`ragVmax` holds
only until he lands; the glitch cap and leash are back after). Measured in the bunker's open middle
(7.5 m of floor behind him, `tools/dealerfly.js`): P 0.6 → 4.9 m and 0.73 m up; P 1.0 → 5.3 m, 0.55 m
up, heels over head, down short of the wall.

## The Dealer: 50 health, and he carries Henry's cell key (2026-10-14)
`hp` 36 → 50. `dealerDropsCellKey()` runs where `dealerWon` is first set by a live kill (a restore sets it from
the save first, so never there): `cellKeyLie` tosses the key off his hips (`PhysProp`, `tossDrop`) to the
octopus ring's `ringDrop` sting, with the big glint (`size 2, strength 4.2, through 0.7`) and the new `beacon`
column (`addItemShine`). Saved as `cellKey` 0/1/2 and `cellKeyAt` (world, y included); a save that has
`dealerWon` and no key state lays it where he is. `cellKeyItem` is in `packByName`'s list.

**TWO RUNGS UNDER THE HATCH (2026-10-14, "two steps of a ladder to show the way
out… above your head").** In the `bunkerHome` onLoad after `bunkerLadderProxy`:
two rails from 2.3 m to the roof and rungs at 2.5 and 2.85, at the shaft's
`L.z1` edge. They are added after the walk grid is read from the file, so they
are not in it, and their meshes have `raycast = () => {}`, so nothing aims at,
drops onto or is stopped by them. Dirty iron (0x2e2a25, emissive 0x070605): at
0x5e5a52 they read as clean plastic under the cage lamps.

**THE LADDER HANGS FROM THE HATCH NOW (2026-10-14, round 2: "the ladder is floating and looks bad put it where my
cursor is make it hyper realistic and blend into the scene").** His screenshot (feet 11.00, -40.00, -540.76, look 0.73,
looking steeply up) was rebuilt in the pane — pitch ≈ 0.8 at his 105° lens matches — and the ray from the centre hits
the model's own hatch: `ExitpolySurface429` is the hatch frame (local x -1.54..-0.56, z -4.12..-2.99, at the roof
3.94), 428 a bar on it and 430 a thin piece at its corner; the curved grey thing under the hatch is a DUCT, not a rail.
The first two rungs stood off the hatch's far edge in front of that duct, held by nothing. `bunkerLadder(roofY)` is
placed off 429's own box (`HB.min.x + 0.12`, its z middle): flat-bar rails 65×14 mm 0.43 apart, round rungs every
0.3 m from 2.45, two angle brackets and bolt heads to the frame, the rails on 0.7 m up the shaft. Its canvas maps
(`bunkerLadderTex`): olive paint, chips to steel with rust run down from each, rust at the cut foot, the rungs bare
steel across the middle. Material colour 0x5c5d57 — the map at white read as cream plastic under the cage lamps.

**HIS QUESTION HAS TWO ANSWERS NOW (2026-10-14).** `DEALER_SCRIPT.start`: "*Kill him*" → `startDealerPickup()` at once
(the old "…"); "Give me the key or else" → `threat`, "You think a plastic shovel scares me? I’ll make this quick."
(`end: false`), and the click off it is `DEALER_NPC.onLeave` → the bar. Measured: both choices shown, the line, the
bar in his hand after the click.
