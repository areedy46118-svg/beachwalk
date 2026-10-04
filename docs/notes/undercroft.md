# The undercroft: tunnel, church, knight, idol

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**`rockColliders` is the game's ONE list of solid things, and it is shared.**
Cylinders `{x,z,r,top}` and boxes `{x0,z0,x1,z1,top}`, each with a `mat`
('rock' or 'wood') that both a thrown prop and the shovel read to pick a
sound and a scar. The player and `PhysProp` run the same `solidDepth()` /
`pushOutOfSolids()` / `rockGroundAt()`. Two things this fixed at a stroke: a
body knew only ONE ground — the sand — so anything set down on the pier fell
through the boards to the beach; and a circle round the five-metre boat left
a metre of open air off each side that you stood on, which is why you
floated beside it. A hull is a BOX.

**A click finishes the typewriter.** `typeLine()` keeps its completer in
`typeFull`; `finishTyping()` runs it, and the dialogue's click handler
tries that FIRST and returns, so the click that puts the line up never
also dismisses. Reading faster than the typewriter is the normal case.

**The drainage tunnel home.** `models/drainage-tunnel-home.js` →
`makeDrainageTunnelHome()`, placed at
`DRAIN_X` (= `CLIFF_BLOCK_X`) / `DRAIN_Z` — behind you when you spawn. Not to
be confused with the **tunnel in the sand wall** (`tunnel`, `insideTunnel`,
`TUN_*`, `updateTunnelBounds()`), a separate dug corridor further down the
walk; the two are independent and their identifiers do not overlap. This one
is a **fixed world object** like the lighthouse, and three things make it work:

- The cliff is *cut open* at the mouth by a **world-space discard** injected
  into `cliff.material.onBeforeCompile` — world space, because the cliff is
  snapped back onto the player in Z every frame and a local-space window would
  slide with it. Same reasoning as `shoreLine(z,t)`.
- The headwall is a **shell, not a solid** — an open-ended cylinder plus a
  `RingGeometry` face plate with the bore hole in it. A solid block would plug
  the pipe.
- `updateDrain(dt)` runs **after** `updateTower(dt)` so it gets the last word on
  `groundY`, and `insideDrain` lifts the `CLIFF_BLOCK_X` clamp. Gotcha: the
  chamber's back wall must be clamped *inside* the `insideDrain` branch —
  letting the player fall out of that branch drops `insideDrain`, and the cliff
  clamp then teleports them back to the mouth.

Two more traps, both of which bit once already:

- **A wall with a doorway in it is four slabs around the hole.** Adding a
  full-width slab "for the wall" as well plugs the opening — the collision
  still lets you walk through, so it only shows up visually.
- **A group rotated to face a wall has its own +Z.** For the back-wall outlet
  (`F.rotation.y = -PI/2`) local +Z points *into the room*, so anything set
  into the wall needs a **negative** z or the pipe sticks out of it.
- **A fixture on the pipe wall must have +Y pointing radially outward.** For a
  thing at angle `ang` from the crown on side `sg`, that is
  `rotation.x = sg * ang` — nothing else. Get it wrong and the fixture, and
  especially anything long attached to it like a conduit, swings out into the
  middle of the bore and reads as a random pipe crossing the tunnel. The wall
  lamps and the side connection both had this.
- **A wall a doorway sits in has to span the *room*, not the pipe.** The door
  bulkhead was 5 m wide against a 6.8 m room, leaving an open gap at each front
  corner that you could see the sky through.
- **A dark ring on a solid wall is not a hole.** The back wall is built as four
  slabs around a real opening, with a closed dark box behind it, so the outlet
  bore actually recedes into somewhere.

Solid furniture is `userData.nav.props` — local-space `[x0, z0, x1, z1]`
AABBs that `pushOutOfDrainProps()` shoves the player out of along the
shallowest face.

**Sink a rim, don't dither it.** The ridge's edge was first dissolved against
a hash keyed to height. The ridge climbs slowly, so even a 0.4 m band of
height is metres of ground, and seen along the slope half the headland turned
to speckle. Dropping the last third of a metre BELOW y = 0 lets the beach
plane — opaque and right there — cover the join, which also ends the
z-fighting the two had while coplanar at the toe.

**A RING IS THE ONE ARENA WHERE STEERING IS FREE.** There is an altar in the
middle of the hall, so across the room the straight line to the player goes
through it: pinned on the inner circle the boss ground against the altar and
closed seven metres in thirty seconds. The clamp slides it round the way that
shortens the bearing instead, and the obstacle becomes the thing you circle —
which is what an altar in a boss room is for. Measured after: it closes to
1.96 m and throws eight swings in thirty seconds across all three attacks.

**THE UNDERCROFT IS TWO SCANS WITH THE WALK PACKED INSIDE THEM.** Valsev's
"Cave 5.0" and Aurélien Martel's "Old church modeling" (both CC-BY-4.0)
through `tools/undercroft_pack.py`, pure Python: every node baked to world
space, decimated PER NODE with the uv carried on the cluster's first
vertex (the cave is 46 chunks of one surface and is merged before it is
clustered — a chunk decimated alone is specks), spec-gloss to
metal-rough, textures to 1024, and `bw_walk` on the root: a 0.2 m grid of
floor, roof (`ceil`), and a solid flag, with a `floor0` computed without
the pews. `models/undercroft.js` loads both, TRANSLATES THE CHURCH so its
door (a box the packer wrote) sits at the cave's last floor cell, bridges
the half metre between, cuts the end wall over the doorway in its own
shader, hides the void round the join and the entrance behind black
shells, grimes every material (dust by the world normal's y, grained;
desaturated; multiplied down; a COLD lift off its own map), and drifts
motes. The game (`UC_*`) places it at (3000, 400, 2400) — POSITIVE z on
purpose: every trigger on the walk is "z less than a line", and at
z = -2000 the saucer took you the frame you crawled in — hides the sky,
closes the fog, culls the beach (the hall's cull), stands the beach's
clamps down, and turns up three point lights that live in the scene from
boot. The way out is behind the altar, onto the sand past the rock.

**WHAT THE WALK COST, in the order it was found:**
- **A 40 m floor plane sampled 48 ways leaves most cells floorless.** The
  first sampler capped subdivisions; the church's door cell read the roof.
- **THE OUTSIDE OF THE ROOF IS NOT A FLOOR.** It faces up and has sky over
  it, and wherever the tunnel under it was too low the grid took it for
  the floor, two metres up. Normals cannot settle it — half the cave's
  chunks wind the wrong way — so a floor is decided by ORDER: a
  near-horizontal surface with something over it, far enough up to stand.
- **The cave is a squeeze.** Head-room 1.25, body band 0.35–1.20 (a mine
  frame's crossbeam is 1.65 m up), and the game DUCKS the camera under
  `ceil` as the last word before the camera is written — the standing
  snap runs after every clamp, so a clamp before it does nothing.
- **THE FEET ARE ON THE FLOOR, NOT UNDER THE HEAD.** With the eye pressed
  to a low roof, `camBaseY - eye` is under the floor you stand on, so a
  rubble slope read as a wall and the walk pushed you back off it for
  ever. `feet` is the grid's floor under the disc.
- **A pew's seat is 0.45 up and a cave floor is rubble**: the step height
  is per grid (`stepMax` 0.62 cave, 0.40 church).
- **The spots come from the LOW floor of a column**, and a bulb's box is
  measured after `updateMatrixWorld` (the church had just been moved).
- **The section must sit ABOVE `animate()`**, which is kicked
  synchronously at module time and read `ucWarmed` before it existed —
  and above the harness block, which named `UC` the same way.
Measured: the entry to the nave, 6.8 s of stepped walk, no stall; a BFS
over the cave's grid reaches 591 cells and the mouth in 85.

**THE PEWS ARE FORTY BENCHES, AND EVERY ONE BREAKS.** The scan's pews are
one mesh in three primitives; the packer welds, floods islands, groups
them by footprint (40) and writes each as `bench_N` with its box. The
module centres each on itself (the tripod's lesson) and gives it a
`hitProxy` box — a pew is a plank, a back and two ends with AIR between,
and the blade's ray through the middle found the air: four swings,
nothing. Each is a `physProps` entry with `onImpact`, the table's own
door; `breakBench` cuts the mesh by its triangles into half-metre cells,
every chunk centred on itself in the bench's own wood, thrown the way the
blow came, and `clearBench` puts the cells back to `floor0`. Measured:
one swing, fourteen pieces.

**THE UNDERCROFT WAS LIT BY A MOON THREE THOUSAND METRES AWAY.** "Fix the
church textures, they look so bad — they should look exactly like the model"
was three separate faults and not one of them was in the church's maps, all
three of which were doing exactly what the artist authored:

- **THE NIGHT'S OWN LIGHTS REACH FORTY METRES UNDER A BEACH.** The beach
  carries an ambient at 0.95, a hemisphere at 0.7 and three directionals, and
  they are in the scene for ever because a light ENTERING OR LEAVING
  recompiles every material in the game. So a buried cave and a buried church
  were both flooded with an even, directionless 1.65 of sky, which is the
  whole of "washed out": no falloff, no shape, no dark. Intensity is free to
  move, so they are DUCKED to six per cent at the cut, behind the black, and
  restored the same way (`SKY_LIGHTS` / `setSkyDuck`). Nothing else in this
  file touches them, and the recompile is never paid.
- **HALF THE CHURCH SHIPPED UNLIT.** Most of this scan's materials arrive
  with `emissiveMap` ALREADY SET TO THE ALBEDO at `emissiveIntensity` 1 —
  the walls, the arches, the altar, the dais — which means three adds the
  whole map on top of the lighting and the surface renders as its own
  texture at full brightness whatever the light is doing. The grime pass
  only touched a material that had NO emissive map, so it walked straight
  past every one of them. **If a scan looks flat and bright, read its
  `emissive` and `emissiveIntensity` before you touch anything else** — this
  is the Military Shovel's "read its emissive first" on a building.
- **AND THE GRADE WAS A COLOUR REMOVER.** It mixed 55 % of the way to
  luminance and then multiplied the lot by 0.56, which is the reptilian's own
  per-channel remap wearing a different coat: hue gone, contrast gone, one
  flat brown for stone, timber, gilding and glass alike. Dirt is a MULTIPLY
  — the same scalar on all three channels leaves colour and relative
  contrast exactly where the artist put them — so dust settles where a
  surface faces up, damp blotches it, the level comes down, and that is all.
  `UC.setLook('cave', { level: 0.6 })` retunes it live, because the only way
  to settle a look is to look at it.

**AND ONE LAMP IS NOT THREE LAMPS.** Three point lights at 55 apiece: the
tunnel bulb, which you walk within a metre of, blew eighteen metres of rock
out to white, while forty metres of nave thirteen metres under its own lamps
got almost nothing. Five now, each with its own reach and its own dying
colour — two in the tunnel with a dark stretch between them, two in the
vault, one over the altar — and none of them brighter than it has to be,
because what carries the rock and the stone is each map's own emissive lift.
The pavilion's rule: do it in the map, not with a lamp. Measured as mean
screen luminance against an open beach's 7.3: tunnel 19.7, the join 19.1,
the nave 16, the breach seen from the nave 7, the altar 29.

**THE BLACK SCREEN AT THE JOIN WAS A BOX THE PLAYER WAS STANDING INSIDE.**
The church's front doorway is ALREADY an opening in the scan — 4.1 m wide by
5.5 tall — so the discard cut into its end wall was doing nothing at all,
and what hid the void round the ragged tunnel mouth was a BackSide box eight
metres deep whose far interior face stood a metre and a half INSIDE the
nave. Walk out of the tunnel and you walked into it: a black wall, and no
church. The doorway is FILLED instead — one unlit black panel in the plane
of the wall's outer face with the tunnel's own silhouette discarded out of
it, a rough arch standing on the floor and a shade wider than the mouth so
the cave's rock always covers its edge — and it is `FrontSide` with its
normal toward the nave, so from the tunnel it is not drawn at all and there
is never anything between you and the church. **A shell that hides a void is
a wall in some direction: ask which direction the player walks.**

**YOU HIT YOUR HEAD NOW, AND IT STOPS YOU.** The cave squeezes to 1.57 m
against a 1.88 m body and the first build simply DUCKED the camera under the
roof, which is the game playing the crouch for you and reads as your eye
sliding through the rock. Two refusals and no automation: `headroomClear`
answers false under a low roof, so Ctrl will not stand you up in one; and
`updateUndercroft` reverts the frame's movement when the cell ahead has less
headroom than you are tall, with a knock on the timber, a dip and a little
trauma (`ucHeadBump`, once a second at most, or walking into a beam is a
drum). It is gated on where you CAME FROM — if the cell behind you was low
too you may still move — or anyone who found a way to stand under a beam
would be walled in on every side. The camera duck stays as the backstop for
exactly that case. Measured with a flood over the cave's grid: crouched, 607
cells and the mouth reached in 86 steps; standing, 82 cells and the walk
ends at x = -12.55, a metre and a half in. And walked hands-off with a
steering harness: the whole tunnel in 435 frames, no stall.

**THE WALL'S MAP IS AN ATLAS, NOT A TILE.** The tunnel had to come out of a
church WALL, so the doorway's filler wears the end wall's own material —
and tiled over seven metres that map drew a grid of the scan's baked window
bays, because a scan's texture is an atlas of every face it covers. The
panel is ASHLAR instead: half-metre blocks in running bond, each mapped
onto one of the plain-stone cells of the atlas (found by scanning it for
64-px blocks of low variance at the wall's tone — u 0.375–0.5, v 0.31–0.63),
a different cell per block and each turned a random quarter, so it is the
wall's own stone laid as courses with the joints reading as joints. **A
scan's texture cannot be tiled; it can be QUARRIED.** `Material.clone`
drops `onBeforeCompile` and copies `userData`, so the clone's `userData`
is cleared and the grime put back on it before the breach's discard chains
after.

**SIXTEEN RAYS IN FIFTEEN HUNDRED HIT NOTHING.** The church scan has holes
in its vault and its walls, and through them you saw out — forty metres
under a beach, which is wrong twice. A black BackSide box round both scans
closes every one (0 of 1500 after). It is drawn FIRST and WITHOUT WRITING
DEPTH: the hall's shell rendered the whole arena black because it wrote
depth and sorted late, and this one can only ever show where nothing else
is drawn. And the windows had a sky behind them — the scan's `vitrail-fond`
backdrops and its `-ext` outside walls, which lit read as daylight through
the glass. They are earth now: near-black, a fixed emissive `setLook` may
not touch.

**A LAMP INSIDE A WALL IS A WALL AT FULL WHITE.** The altar's point light
stood at distance zero from the end wall and the arches, and every surface
within two metres of it blew out — the white wall the owner photographed.
Box-to-point clearance cannot find a spot in a scan whose biggest meshes
have bounding boxes the size of the building (everything measured zero);
RAYCAST clearance in twenty-six directions can. It hangs 5.2 m clear of
everything over the chancel now, and every view measures 0.00 % of pixels
over 235.

**THE ARCH IS CUT IN THE PANEL'S OWN FRAME.** Two wrong cuts before the
right one: the first compared world-space fragments against group-space
numbers three thousand metres apart and never discarded a pixel (what
looked like an arch was the cave's own mouth poking through the panel);
the second read `transformed.z`, which is zero on every vertex of a plane,
so the whole lower band went. Local `x` runs ACROSS a plane. The test that
found it: turn the cut's half-width to nothing and see whether anything
changes — it did not.

**A JUMP ONTO A PEW IS A FALL OF A FOOT, AND IT BREAKS THE PEW.**
`stompBreakables` on any landing from the air (`vy < -1.6`, far under the
hard landing's -3.5): the nearest `physProps` entry with an `onImpact`
whose box is under your feet takes a blow scaled by the fall — the same
door the blade and a thrown body already use, so every breakable in the
game breaks under you without a third code path. Two traps in testing it:
`onGround` only ever goes false on a JUMP — a walk off a ledge is never
airborne here — so the harness has `__bw.airborne`; and the harness
literal already carried a `camBaseY` setter further down, and A LATER
DUPLICATE KEY WINS, so a new one added beside `crouching` set nothing for
two rounds. Measured: a 2.2 m drop, the pew dead on frame 33.

**THE CHURCH ANSWERS EVERYTHING, AND IT IS QUIET.** One convolver hangs off
the SFX bus from boot (`ucVerbGain`, a parallel send, dry untouched): a
2.8 s impulse with a 15 ms gap, seven early taps and a tail that DARKENS as
it goes (a one-pole lowpass closing down — stone eats the top end first).
0.62 in the nave, 0.16 in the tunnel, 0 on the beach, so a footstep, a
drip, a pew and a sword all get the room while you are in it and nothing
outside ever does. The sea and the wind go to 1.5 and 2.5 % and a drip
lands once in eight seconds, quietly, because the silence between them is
the thing you hear. **A suspended `AudioContext` never advances
`setTargetAtTime`** — the harness's send read 0 for three rounds until a
real click resumed it; and a getter added in the `Object.assign` block is
a snapshot (the `abductDone` lesson, fourth time). The church's floor is
RECORDED: eleven footfalls cut from a walk down a stone corridor
(freesound_community, via Pixabay; 99 % of the energy below a kilohertz),
normalised, faded, one at random per step (`churchStep`), with the sand
step kept for the tunnel's rubble.

**THE CAVES ARE THE OWNER'S MODELS. TWO PASSES TOOK THEM AWAY AND BOTH WERE
WRONG.** The first replaced them with a generated tube; the second put the
models back but re-textured them with the huge rock's granite. His word on
each: "why did you take away my cave models, i just wanted them better not
gone", and then "why are you changing the textures? make it the same 3d models
i gave you but improve crawling through them". **"MAKE THIS BETTER" IS NOT
"REPLACE THIS", AND IT IS NOT "RE-SKIN THIS" EITHER — and the line is the
owner's to draw, not this file's.** A measurement that says an asset is poor
is a reason to work harder on it, never a licence to swap it out.

What the models keep: their geometry, their maps, their grime. The 3DRT
tunnel keeps its TRIPLANAR projection, which is not a different texture —
it is the same 256-pixel map applied in a way that does not smear over a
hundred and seventy metres — and Valsev's cave keeps its three materials,
including the mapless one, which is a LIGHT FITTING and not rock (treating it
as untextured stone is what made it read as black).

What is done to them is three things and every one is about WALKING:

- **THE LINE IS FITTED TO THE ROCK THAT IS DRAWN.** A cell grid over somebody
  else's low-poly tunnel is a minefield, so the grid is used once to find a
  centreline and the game walks a corridor round it — but that corridor's
  radius, roof and floor come off the GEOMETRY, not the grid: every triangle
  sampled BY AREA into a one-metre bin, and each station asking that bin, in
  its own frame, what is under it, over it and how far the floor reaches each
  way. **Sampling by area is the whole of whether it works**: seven points per
  triangle on faces a metre across puts the samples half a metre apart, and a
  march that steps fifteen centimetres then reports a wall inside arm's reach
  down the entire passage.
- **THE TUBE IS CARVED OUT OF THE MODEL.** A scan of a cave has lumps that sit
  where the line has to go and the corridor cannot measure its way round them
  — walking the finished tunnel and asking how near the rock was every tenth
  frame found 137 contacts inside six centimetres, every one of them the scan.
  Every triangle whose middle falls inside the corridor's clear radius,
  between a hand above the floor and a hand under the roof, is dropped from
  the index (the bunker desk's `carveDesk`, on a cave). The floor survives,
  the walls survive: 137 contacts became 30, and the passage lost 151 of its
  3848 triangles.
- **AND THE HOLES IN THE MESH ARE CLOSED FROM BEHIND, IN THE MODEL'S OWN
  MATERIAL.** The 3DRT tunnel has a genuine two-metre hole in it eleven metres
  short of the church and never reaches the door at all. A sleeve over each
  run the probe called open still left black in the frame — "open" is measured
  on the CENTRELINE and this model's holes are as often a metre off to one
  side or a gap in the floor — so it is ONE tube swept down the whole line at
  the measured wall PLUS a hand's breadth: behind the scan everywhere the scan
  is there, and the rock everywhere it is not. It wears a CLONE of the scan's
  own material (`Material.clone` drops `onBeforeCompile` and copies
  `userData`, so the copy's userData is cleared and the grime and the
  projection put back on it), so the seam cannot be found. Measured: 0 of 6048
  rays cast from every station of both tunnels reach the black shell.

Measured at the end, hands-off: the whole 170 m passage walks in 4975 ticks
with **zero stalled frames** and the old cave in 449 with zero; entry to exit
connects crouched; and the tunnel IS a crawl — its own drawn headroom runs
1.15 m to 2.4 — which is what the owner asked for when he asked for something
crawlable, so the head-bump REFUSAL is off inside a corridor and the camera
ducks instead. Refusing every step whose roof is under a standing body would
be refusing most of the tunnel, one stride at a time.

Four traps in the machinery, all of which cost a build:

- **THE BINS MUST BE IN THE GROUP'S FRAME, NOT THE WORLD'S.** The corridor's
  points are local metres and the undercroft stands at (3000, 400, 2400):
  binned in world space every probe came back empty and every station was
  reported as a hole.
- **THE ROOF'S OWN SAMPLES ARE NOT A WALL.** Reading "the nearest rock between
  knee and head height" on a tunnel whose roof is often a metre and a half up
  reads the CEILING passing over the centreline, at eight centimetres. The
  band has to stop below the roof.
- **AND A STATION NARROWER THAN A BODY IS A MEASUREMENT, NOT A TUNNEL.**
  Clamping a bad measurement up to a walkable minimum is precisely what lets a
  body stand inside rock; fill it in from the stations either side instead.
- **THE FIT COMES BEFORE THE RUN INTO THE NAVE.** Laid first, the straight run
  at the church dragged the last real stations off the tunnel's centre when it
  was smoothed into them — and those are the narrowest stations in the model.

**AND THE THINGS THAT WERE STILL IN THE WAY, ONE ROUND LATER.** The owner
played it and listed six; every one is a general lesson.

- **A TRIANGLE'S CENTROID IS NOT THE TRIANGLE.** The carve dropped a face
  whose MIDDLE fell in the walk, and on a model whose faces are a metre and
  more across that leaves the ones lying clean ACROSS the tunnel with their
  centroid in the wall — the big flat sheets hanging in the bore that he
  photographed. Fifty-nine of them, measured. Seven points now: three
  corners, three edge midpoints and the middle, with the corners and edges
  asked only about the inner three quarters (a wall triangle's corners ARE at
  the wall and have to survive). Crossings: 59 → 3.
- **AND THE CARVE IS CAPPED.** At a station the model does not cover, the
  radius is an interpolation across a hole and can be far wider than the
  tunnel really is; carving to it eats real walls, which the sleeve then has
  to stand in for — which is how a repair turns into a replacement one metre
  at a time.
- **A SLEEVE SWEPT OUTSIDE A MODEL MUST NOT BE DISPLACED INWARD.** Signed
  noise on a tube that is only a hand's breadth clear puts a lobe of it
  through the scan's wall, and what that draws is another flat sheet. Sixty
  one of them. `Math.abs` on the displacement, and the sleeve is carved too.
- **A LONE RAISED CELL IN A WALK GRID IS AN INVISIBLE WALL.** The packer's
  floor grid carries whatever it found, and in a church that is the pews,
  which are meant to stop you. It also catches a lamp chain or a boss on the
  vault sampled down onto ONE cell of open nave — a wall in the middle of the
  aisle with nothing there to see, which is exactly what the owner kept
  running into. The grid carries `floor0` (the floor without the furniture),
  so a raised cell can be checked against what is under it: flood the
  connected run and, if it is smaller than a piece of furniture, put it back
  on the bare floor. A bench is forty cells; a speckle is one or two.
  Eighteen cleaned.
- **A WALL IS SLID ALONG, NOT BOUNCED OFF.** "Running against any 3d model
  surface you glitch and shake a lot" is the push-out arguing with the input:
  the push moves you out, the next frame's key moves you back, sixty times a
  second. Two fixes, and one failed attempt worth remembering:
    - underground, keep whichever ONE AXIS of the frame's movement is clear
      before reaching for the push-out at all. Measured pressing into rock for
      three hundred frames: 0 reversals of direction, and the hands-off walk
      is unchanged at 13 stalled frames in 5013.
    - **A CYLINDER CLAMP IS WORSE THAN THE SHAKE.** Projecting the position
      back onto the tube is exact on a straight run and wrong at every corner,
      because the nearest point on a polyline at a bend is the VERTEX and
      projecting radially from a vertex moves you back down the tunnel.
      Measured: the walk went from 5011 ticks to stuck at x = 85 with three
      quarters of its frames stalled.
    - on the beach, `pushOutOfSolids` pushed out of EVERY overlapping collider
      in declaration order, so the last one to speak had the last word. It
      takes the one you are DEEPEST in and asks again — after the first push
      you are usually outside all of them. And the rock shell's cells are
      BOXES MERGED INTO RUNS rather than overlapping discs: a grid of
      cylinders is a scalloped wall and thirty separate boxes are thirty faces
      to catch on, where one twenty-metre box is a wall. Running a shoulder
      along the outcrop: 50 reversals in 300 frames became 15.
- **AND THE APSE NEEDS A BACK.** The church is a single-sided scan, so from
  the tunnel behind it its end wall is not drawn at all and you look straight
  through at the chancel's windows; the cave's own ragged mouth used to cover
  that and the carve took it away. A ring of the cave's own stone in the plane
  of the wall, with the cut's hole through the middle — the front door's
  `breach` panel, at the other end of the church. And **the collar starts PAST
  the wall**: begun inside the apse, the sleeve's own tube stood in the
  chancel as a boulder in the middle of the arch.
- **AND WHAT IS BEHIND AN ARCH IS MEASURED, NOT GUESSED.** Three builds put
  something black behind the rock mouth by eye and all three came out through
  the stone somewhere — a panel over the top of the outcrop, then a box lying
  on the sand beside it. It is INSCRIBED IN THE HOLLOW now: from a point well
  inside the mouth, rays in twenty-six directions say how much room there is,
  and a cube of that half-width fits by construction and can be seen from
  exactly one direction. Two traps: the rock HAS a cave in it, so nothing
  "passes through" and the aperture is where the first hit is DEEP rather than
  where there is no hit; and inward is +x at the entrance and +z at the exit —
  probing the wrong way found no room at all and built nothing. Measured from
  the mouth: 0 of 108 rays reach anything but the rock.

**AND A REPAIR THAT DOES NOT FOLLOW THE THING IT REPAIRS IS THE MESS.** The
owner played it again and the report was that flat rock textures stand in the
way of the crawl and that the rock is full of pointless edges sticking out
like pngs. Rendering the two in two colours settles it in one picture: the
scan in magenta, the skin behind it in grey, and what came back was a smooth
grey pipe with magenta shards of the owner's tunnel poking through it every
couple of metres. THE TWO WERE INTERPENETRATING. The skin was swept at a
number PER STATION — the wall the probe measured, which for most of this
model is the clamp it falls back to when it measures nothing — and a station
is two metres of a cave. So it cut in and out of the drawn rock down the
whole passage, and every crossing drew as a flat sheet with a hard edge.

- **EVERY VERTEX OF THE SKIN ASKS ITS OWN DIRECTION WHERE THE ROCK IS.** A
  ray from the station's axis out through that vertex's own profile point,
  and the vertex goes a hand's breadth BEHIND the first surface it meets:
  inside the model everywhere the model is there, and the model's own wall
  everywhere it is not. `surfaceBins` cannot answer this — it is a cloud of
  samples and a ray through a cloud hits nothing — so the scan goes into a
  triangle grid and is actually cast at.
- **AND THE HOLES ARE RELAXED, NOT GUESSED.** Where no ray comes back there
  is no measurement, and a hundred and twenty passes of averaging the four
  neighbours with the measured cells PINNED is a Laplace solve on the gap:
  a membrane that meets the drawn stone exactly at the rim of the hole and
  has no edge anywhere. Nothing is ever nearer the line than the walk's own
  tube, so the repair can never become the thing in your way.
- **AND THE SKIN IS BUILT AFTER THE CARVE, NOT BEFORE.** Fitted to the
  uncarved scan it sits behind faces the carve then takes away — a hole with
  the repair a hand's breadth in front of where the rock used to be, which is
  to say still in the way.
- **A FACE THAT LIES ACROSS THE BORE IS NOT A WALL, WHATEVER ITS DISTANCE.**
  A tunnel's walls run ALONG it, so their normals are radial; a face whose
  normal is within forty degrees of the tunnel's own tangent is a sheet
  hanging in the crawl. At a walk radius that is often only a body's own
  width the distance test alone never reached them. `corridorAt` carries the
  segment's tangent for it.
- **AND A RAY IS WALKED THROUGH THE GRID, NOT GIVEN THE NEIGHBOURHOOD.**
  Valsev's cave is 191,183 triangles, so taking everything within five metres
  of a station and testing it against twenty-nine rays cost A SECOND on the
  frame the church lands — the one thing this file has said over and over
  about a long block mid-walk. Amanatides & Woo down the ray, with a stamp so
  a triangle is never tested twice: 1013 ms became 74. A fixed step with the
  cell around each sample is NOT the same thing — it skips a cell the ray
  clips at a corner, and a missed hit is the one error that matters here,
  because it puts a patch of skin in front of drawn rock.

Measured after: geometry in the walk 3 → 0 by eye over twenty-four views down
both tunnels, the black shell visible in 0.018 % of the frame against 0.378
before, and the whole 170 m passage walks hands-off in 2329 ticks with ZERO
stalled frames and one reversal (the way out in 241, none of either).

**AND THE APSE CUT WAS CUTTING THE CAVE.** Every material down there goes
through the grime shader, so the cylinder that opens the church's back wall
was punching the same hole through the OWNER'S OWN ROCK and through the skin
behind it — a black window in the side of the exit tunnel a metre past the
threshold, which is most of "the exit is all see through and messed up". The
old cave only got away with it because its rock was clipped short of the
wall. `uUcCutOn` is 1 for a church material and 0 for everything else.

**AND THE CHURCH STOPS AT ITS OWN BACK WALL.** Its floor is ONE plane forty
metres by twenty-three and it runs nearly two metres PAST the apse, so
through the break you looked at a pale grey shelf lying in the mouth of the
cave. `uUcClipHi` ends the building at exitEdge + 0.14 — and that number is
measured, not picked: raycast down the chancel's axis and the first church
surface is at exitEdge + 0.06 (its outer skin and the window backdrop behind
it, in the same plane). Clip any nearer and THE APSE WALL ITSELF goes, and
from the tunnel you look into an open chancel.

**AND THEN THE GLOWSTICK SHOWED THE EDGES.** The owner walked it with the
light-stick in his hand and photographed four hard lines across the frame:
a black wedge the width of the screen, a dark crevasse, a slab with a
polygon edge, a thin black band. Under the tunnels' own even lift none of
them shows; a point light in the hand shades every facet apart. Six rounds,
and the one that mattered was the one measured last:

- **A FACE BETWEEN THE EYE AND THE LIGHT IS LIT FROM BEHIND, AND THAT IS
  BLACK.** The held glow sits half a metre out and to the right, where the
  hand is, and in a tunnel a body's width across a face of rock stands in
  that half metre. `heldGlowTight` pulls it to a quarter of its offsets
  underground. Two of the four photographs were this and nothing else.
- **A LOW-POLY TUNNEL UNDER A LIGHT IN YOUR HAND IS A ROOM OF FACETS.** The
  scans ship no normals, GLTFLoader answers with `flatShading`, and every
  face a metre across takes one shade. `smoothRock`: a vertex normal, which
  the grime and the projection never read (they derive their own).
- **THE SKIN LIES ON THE FACE, IN FRONT OF IT, NOT BEHIND.** Ten centimetres
  behind, then three: at every open edge of the scan the skin dropped away
  behind the face and the face drew its own edge. A centimetre in front
  with the depth buffer told the skin wins, and the scan's edges are inside
  one surface. And **its rim is a fillet**: a jump of more than a hand
  between neighbouring cells is relaxed over three cells, and a measured
  cell may only ever be brought NEARER — pushed away it stands behind the
  face and hands the edge back. (Carrying the face's slope into a hole was
  tried first: it extends every flat face into a flat sheet.)
- **A SWEEP ONLY SEES WHAT CROSSES ITS SECTIONS.** A face lying oblique to
  the tunnel is missed by the ray in the section plane and met by the eye a
  stride later, in front of the skin with its own edge (stations 50 and
  58). Two more rays per cell leaned thirty degrees up and down the tunnel,
  and the nearest of the three: 94 ms became 165, and those two went.
- **AND THE ONE THAT SURVIVED EVERYTHING WAS THE HEAD CLEARANCE.** A build
  gave the head seventy centimetres of carve and held the skin out to match,
  to keep faces out of your face; what it made was a clean pipe a metre and
  a half wide with the owner's rock hung on it wherever the model was
  tighter — which is most of it — and every drawn roof plate inside the
  clearance stood in FRONT of the skin with a hard edge (station 34: a
  ceiling from 0.99 m to 1.83 m, the skin pushed out past it). Hiding the
  scan, hiding the skin, five changes to the fill: nothing moved that line,
  because it was the clamp. `HEAD_CLEAR` is 0. **When five fixes change
  nothing, the thing you are fixing is not the thing.**
- **AND A STRAY-HIT FILTER THROWS AWAY REAL ROCK.** A pass that dropped any
  measured cell much nearer than its neighbours (to kill a spike) dropped
  every face that stands nearer than the wall behind it, and the skin then
  sat behind all of them. Gone; the fillet rounds a spike anyway.

**THE WAY IN IS A ROCK MOUNTAIN, THE TUNNELS ARE BUILT, AND THE CHURCH IS THE
ONE SCAN LEFT.** (What follows is how the three-scan build worked; the two
tunnel scans are gone — see "AND THEN THE TUNNEL WAS BUILT" — but the
packer's kinds, the apse cut and the entrance's unlit grade are all still
live.) `tools/undercroft_pack.py` grew a `passage` kind plus `--yaw`,
`--scale` and `--sparse`:

- **The way in is JJ's "Rock Mountain with cave"** at the foot of the sand
  wall (`assets/rockmouth.glb`, `gltfpack.py`), replacing the hole-in-the-sand.
  A LIT MATERIAL ON THIS SCAN RENDERS BLACK and hours proved it: no moon
  reaches the face (it stands in the cliff), and `emissive * a granite map`
  comes out near-nothing however hard it is driven — a red emissive at 6
  rendered black, while a magenta BASIC override filled the frame from the
  same camera. So the rock is `MeshBasicMaterial` — the granite at its own
  brightness, graded cold and gamma-lifted, DoubleSide because the shell's
  winding faces the hill (FrontSide is invisible head-on). The mouth is a
  dark slab of world space behind the opening. **When a scan won't light,
  stop lighting it: show the map unlit.**
- **The tunnel is Ant leader's "3DRT-uderground"** (`assets/passage.glb`),
  340 m turned and scaled to metres so its long axis runs +x and its far
  end meets the church's front door. It is SPARSE-packed: 1724×251 cells,
  32k with a floor, so only those are written (four megabytes of JSON
  becomes 0.7). **A LONG THIN TUNNEL IS 95 % EMPTY BOUNDING BOX.**
- **THE PASSAGE IS A CRAWL-TUBE, NOT A STAIRCASE.** Three passes of an
  auto-ramp machinery fought the scan's three-metre ledges and lost; the
  honest answer is a big step (3.6) and drop (4.5), so a ledge is something
  you clamber up or slide down and the camera follows the floor. It is
  FLOODED from the entry crouched to prove the mouth is reachable and
  DILATED where a pinch stops it — a tube's floor strip has two-cell holes
  the sampler fell through. **A grid with no floor at a point must ask the
  NEXT grid, not answer "not walkable"** — three grids overlap at the joins
  and the church's box runs over the cave's mouth. The passage-church seam
  is BLANKETED with one wide flat bridge, not a hairline: the two floors
  are the same height but separate grids and the flood would not cross the
  exact seam.
- **The old cave is the WAY OUT, behind the altar** — turned half round by
  the packer so its ragged mouth faces the apse. The apse wall is CUT by a
  world-space cylinder through every church material (shared uniform in the
  grime shader, walls only — a floor or vault inside the radius is kept),
  and the cave's own rock is CLIPPED in world x at the wall so none of it
  stands in the chancel. Two ways out now: back the way you came (a proxy
  at the passage start, to the sand in front of the rock) or the old cave
  (behind the altar, to the beach past the rock).
- **THE SCAN CARRIES NO NORMALS.** The packer writes positions and uvs and
  three flat-shades the rest, so `objectNormal` is zero and the grime's
  world normal — which drives the dust and the apse cut — was nothing. It
  is taken off the world position's derivatives in the fragment instead,
  which is what flat shading does for the lighting anyway.
- **EVERY FLAME HAS A BODY, not just a point sprite** (a lit cone on the
  wick, `MeshBasicMaterial`), and the candle RING stands clear of the
  altar's plinth — at the old radius the walk's disc stopped a body 0.4 m
  short of it, which was "the candles block me at the altar". Nothing has a
  collider; you walk through them. And a broken pew throws no dust — the
  owner's word, the puffs were the "flying particles". The church is 2048
  now, not 1024: the stretched cheap look was a resize too far.

**SOL STANDS ON THE ALTAR, IN A RING OF CANDLES.** The owner's own `SOL.fbx`
— a robed figure in a gold sun mask holding a bleeding heart with eight
daggers through it — through `tools/sol_pack.py`: 205k faces to 42k, 4096
maps to 1024 (roughness 512), every METALLIC map dropped, stood on its own
feet, facing +Z like every factory in `models/`. Four things it cost:

- **`l.to_node is bsdf` IS FALSE IN BLENDER.** Every access to a node socket's
  `to_node` hands back a fresh Python wrapper round the same node, so
  identity never holds — the material loop matched nothing, said nothing, and
  three builds shipped 4096 maps in a 35.8 MB GLB. Compare NAMES; they are
  unique inside one node tree.
- **THE FBX IMPORTER LOADS PIXELS LAZILY** (`head_pack.py`'s lesson again):
  `image.size` comes off the header long before there is a buffer, so
  `image.scale()` + `save()` dies with "does not have any image data". The
  resize is done on DISK with `sips` — it ships with macOS, needs nothing
  installed — and the datablock is pointed at the small file, because the
  exporter reads `filepath` and not the buffer you just scaled.
- **THE ROBE'S TEXTURES POINT AT A FOLDER THAT DOES NOT EXIST** (`.../tex/robe
  lp _robe_BaseColor.jpg` against a delivered `textures/robe_lp__robe_…`), so
  every missing image is re-found by its name with the spaces and underscores
  taken out. The heart's roughness map was never sent; it goes without one.
- **AND METALNESS IS A TRAP, for the fourth time.** Three quarters of this
  asset is metal by material — the mask, the armour, the daggers — and there
  is no environment map in this game. Every metallic map is dropped and the
  factor zeroed; what carries the gold under a candle is the map's own
  emissive lift, which the room's grime pass gives it through a THIRD `LOOK`
  (`altar`: almost no dirt and a WARM tint, because nothing else in that
  building is lit by a flame).

**THE ALTAR IS FOUND, AND A PLATEAU IS NOT A PLATEAU UNTIL IT IS FLOODED.**
The church's own walk grid already knows where the altar is — the chancel
floor is a step up from the nave and the altar is a metre over THAT — so
nothing here is a coordinate typed in. Two wrong versions first, and both
looked reasonable: averaging every cell over the dais mixed the altar with
the reredos ledge behind it and stood the idol a hand above its own altar;
bucketing them by HEIGHT alone gathered every surface in the apse that
happens to stand a metre up — the altar, the ledge, the tops of the stalls,
both sides of the sanctuary — into one blob nineteen metres across. They have
to be FLOOD-FILLED: a plateau is a connected run of cells at one height, and
the altar is the one that is TABLE-SHAPED (a metre or three both ways, where
a ledge is one and a half deep by nearly seven wide) and standing on the
church's own axis. Measured after: (31.44, -0.24, 0.41) against a raycast's
30.75–32.25 by -0.75–1.5, top -0.21.

**THIRTY CANDLES ARE THREE DRAW CALLS.** The wax is two InstancedMeshes (a
tapered cylinder scaled per candle, and a puddle of run wax under it) and
every flame is a point in ONE `Points` batch. The guttering is injected into
three's own points shader, per flame, off an `aSeed` attribute — a flame that
breathes on the same count as every other flame is a string of fairy lights.
Two things: `gl_PointSize` is written by three's own size chunk with the
RESOLUTION scale in it, so the flicker MULTIPLIES what it wrote (a hand-rolled
`300.0 / -mvPosition.z` is right at exactly one canvas height and wrong at
every other); and it is CLAMPED, because a point sprite is a quad that grows
as 1/z and the nearest flame was a hand-sized orange blob lying on the floor.
A candle's ground is a LOOKUP too (`floorAt`), not the height of the thing it
is arranged around: the dais is a step and the ring reaches past its front
edge, so the ones at the bottom of it stood a third of a metre in the air.

**AND THE CHANCEL IS LIT BY THE CANDLES, NOT BY A LAMP IN THE VAULT.** Forty
units at thirty metres over the apse lit it evenly and read as a room with the
light on. The two lamps that are left are a flame's colour, they stand ON the
altar and at its foot, and they reach three or four metres — so the idol is
modelled from below by its own offering and everything behind it goes dark.
The foot one hangs a metre over the ring rather than standing in it: at a
third of a metre off the dais it burned a hard orange disc into the floor a
stride in front of the altar with no candle at the middle of it. Measured as
mean screen luminance against an open beach's 7.3: nave 7.4, altar 11.6 with
0.04 % of pixels over 235.

**AND NOTHING DOWN THERE BURNS STEADILY.** Two counts that never line up, so
the guttering has no period you can hear, and on the tunnel's two bulbs a rare
DROPOUT on top of it. The factor is applied AFTER the lamp's ramp, never to
it — the ramp is a third of a second long and eats every flicker inside it.

**THE CAVE IS HALF WHAT IT WAS.** `LOOK.cave` level 0.62 → 0.46 and emis 0.20
→ 0.14, the two tunnel bulbs 1.5 → 1.1 over a 12 m reach instead of 14.
Measured: tunnel 5.1–6.3 against the open beach's 7.3, where it used to read
13.5 — darker than the sand you came in off, which is what a hole in the
ground should be. It was taken to 3.6 first and that is too far: you cannot
see the timber, and a tunnel you cannot read is annoying rather than
frightening.

**A PEW IS TIMBER, AND `updateGibs` BLEEDS ANYTHING THAT DOES NOT SAY
OTHERWISE.** The flag defaults to on because the system was written for
severed limbs, so every chunk of a broken bench dripped blood and stained the
church floor. Glass, crate boards and hull shards have all had to say
`bleed: false`; so does a bench.

**AND A JUMP INTO A PEW BREAKS THE PEW, LANDED ON OR NOT.** You cannot land on
one: a bench's seat is 0.45 up against the church's 0.40 step, so the walk
grid refuses the cell and the push-out bounces you off the side — which meant
`stompBreakables`, which asks whether your FEET arrived on top of something,
never fired at a pew whatever you did. While you are in the air down there,
any breakable your body is beside takes the blow (`loose`): the footprint with
a hand's slack round it and your own height overlapping its box. It is gated
on the undercroft on purpose — the bunker's fight is fought between a desk and
a work table, and a jump beside either of those is not a player breaking it.

**THE TUNNEL IS local.yany's NOW, AND THE 3DRT ONE IS GONE.** The owner sent a
new cave ("Tunnel", CC-BY-4.0) and asked for it to replace the passage, to
match the game, to go seamlessly to the church and to be walkable.
`assets/tunnel.glb` is it, through `tools/undercroft_pack.py passage --scale
3.8 --yaw 90 --sparse` — 146 m of bore, 52k triangles, 2.4 MB. What it cost:

- **IT IS SPEC-GLOSS, WHICH THREE DROPPED.** `KHR_materials_pbrSpecularGlossiness`
  is in its `extensionsRequired`; the packer already rewrites it to
  metallic-roughness, which is the only reason this asset renders at all.
- **ITS THREE ROCK MESHES ARE CHUNKS, NOT LODs** — 128k, 128k and 5k triangles
  over the SAME bounding box. The packer groups by node name and they all
  carry one, so they merge before the decimation and come out welded rather
  than as a cloud of specks.
- **ITS "PARTICLES" TUBE IS A LIGHT-SHAFT, AND IT HANGS IN THE BORE.** An
  alpha cylinder down the middle of the tunnel is a god-ray for a scene with a
  sun in it; forty metres underground there is nothing to shaft. Worse, the
  corridor fit measures every surface in the model, so a tube in the middle of
  the bore is measured as the WALL. Dropped at pack time.
- **THE WATER IS THE FLOOR, AND IT CAME OUT BLACK.** The model runs a channel
  of standing water the length of itself, and that plane is what you wade
  through. Two rules fell out of it: the CARVE must leave it alone or the
  tunnel comes out dry, and it must be lifted off black BY HAND — the grime
  pass lifts a surface off its own map and the water has no map, so it dressed
  to pure black and read as a hole in the floor the whole way down. It is a
  cold near-black with low roughness now, so the thing that says "water" is
  that it takes the glowstick's highlight.
- **AND ON A SCANNED CAVE THE WALL IS CAST FOR, NOT MARCHED TO.** Marching the
  floor outward through the sampled surface is the right question for the 3DRT
  passage, whose floor is a flat strip; on this one the floor falls away from
  the centre into the channel, so the march leaves the floor's height window
  after two steps and reports a ledge 0.15 m wide — every station collapsed to
  the minimum radius. `rayWall` casts horizontally instead (horizontal on
  purpose: water lies flat and can never be mistaken for a wall), and the roof
  and the floor are cast for too. The rays must stay UNDER THE HAUNCH: in an
  arched bore a ray at head height meets the ceiling curving down a hand's
  width away, which measured the arch and reported a 0.72 m wall in a tunnel
  four metres wide.

**WHAT IS NOT FINISHED: THE WALK GRINDS.** It goes in at the mouth and comes
out in the nave every run, the church sits at the tunnel's end with no seam,
and the worst it is ever stuck is under a second — but about half of all
frames make no forward progress, against ZERO stalls on the old passage. The
cause is named above and only half fixed: the corridor fit is tuned to a
low-poly game tunnel and this is a scan, so `h` still pins at its 1.15 m floor
down most of the length and the walk crouches where it should stand. The next
thing to try is walking it as a GRID, the way the exit cave — also a scan —
has been walked since it went in; adding `pw` to `S.walks` naively makes it
worse (the grid's own roof drives the duck), so it wants the bridge treatment
at the church seam rather than a one-line change.

**THE KNIGHT IN THE CHURCH, AND THE THING ON THE ALTAR.** IronSpear's "Iron
Juggernaut" stands against the wall to the left of the altar, in the dark,
from the moment you walk in. Touch the idol and a second passes in which
nothing happens and you are standing there having done it; then it goes over
about its own foot, lands, and comes apart across the floor, and the wall
stops being a wall. The beat between is the point — a jump scare arrives
before you can understand it, and being given a second to realise what you
have just done is worse.

- **WHERE HE STANDS IS MEASURED, NOT TYPED.** From the altar, step toward the
  wall on your left — walking up the nave (+x), that is -z — until the floor
  runs out, then come back a body's width. Two things it needed: the floor is
  RE-READ at every step (holding the altar's own height stops the scan dead at
  the dais, and the "wall" came back forty centimetres from the altar), and it
  steps over a GAP, because a grid sampled off a scan has lone blocked cells
  in it and there is one at z = 4.5 on exactly that line.
- **AND THE BEACH'S WALLS ARE NOT EVERY CREATURE'S WALLS — THE FOURTH TIME.**
  `mutClampX` would have snapped a knight forty metres under a beach out onto
  the sand. `kind.uc` holds him with the undercroft's own `pushOut` instead.
- **HIS FILE SHIPS SIX CLIPS AND NOT ONE SWING.** Idle, walk, run, walk in
  place, jump, land — all locomotion. So the fight is authored, and the
  machinery the witness needed for exactly this is now shared: `poseRig`
  returns the stance, each driven joint's parent frame expressed in the BODY's
  axes, and a builder that eases a list of keys into an `AnimationClip`.
- **HE IS A `MUT_KINDS` ENTRY, so almost none of the fight is new code** — the
  tell, the commit, the poise pool, the parry window, the riposte, the chain,
  the feint and the token all come with the table. What is his: three and a
  half metres, thirty points, the longest startups in the game (the overhead
  hangs a second and a half before it comes down, which is what makes two
  damage fair), a guard that costs a whole bar, and a shoulder charge for
  when you back off.
- **AND THE MEASUREMENT THAT SAID HE COULD NOT HIT WAS THE MEASUREMENT.**
  Three rounds of "0 damage" were a harness that called `heal()` BEFORE it
  read `hp`, so every landed blow was erased in the same iteration that dealt
  it. Read the health first, heal second. (And `devMode` turns a creature's
  swinging off outright, so a sample taken with it on reads zero swings for a
  different reason again.) Measured properly, standing still at the altar:
  33 swings and 35 damage a minute, all three close swings used evenly,
  closing to 1.1 m — the Dealer is 48 and 40, the SCP 43 and 41.

**AND THE KNIGHT GOT THE OWNER'S OWN MOVES, AND THREE OF MINE.** Six Mixamo
clips — a punch, a sweep, a jump attack, a run and two guards — off the same
rig the red alien's three came off, and `ntarRetarget` did not need a line
changed to put them on an Unreal mannequin instead: what the file carries is
the rotation a bone has UNDERGONE, which knows nothing about either skeleton,
and the map between the namings is `kind.rag`, which every creature that can
fall over already has. `tools/ntar_moves.py` takes a set name now. Mixed in
with them: a two-handed overhead with a second and a half of hang, a backhand
the other way, and a STOMP — the one blow of his that comes from a leg, so the
answer to it is not the answer to the others, and his rig carries the right
leg as an extra chain for it.

- **HE IS IN THE ROOM WHEN YOU WALK IN, DRAWN.** Not `visible = false` — that
  is a thing appearing, and this is a thing you did not see. He stands there
  asleep and dead still in the one part of the room the candles are kept out
  of, and what keeps him dark is the LIGHTING.
- **NINETY-FIVE CANDLES, AND A HOLE IN THEM.** Thirty-one round the altar left
  a forty-metre nave that was black past the dais. There are clusters down it
  now — in GROUPS of three to seven with dark between, because an even scatter
  reads as lighting and a group reads as people — and nothing at all within
  5.6 m of the wall he stands against. The dais ring is subject to it too: with
  it in, the nearest flame to him was 0.72 m.
- **"HE KEEPS LAGGING ALL OVER" WAS A BODY WEDGED IN A WALL.** His body radius
  is 1.15 m and he was stood exactly that off the last walkable cell — which is
  to say touching it, permanently overlapping, so the room's push-out fought
  his chase every frame and he crossed the nave in jumps. Measured before: a
  single frame of 0.317 m, an implied 19 m/s. He is stood clear of it now and
  the spot is CHECKED against the walk, and the room's clamp uses three
  quarters of his body — the Dealer's own lesson, that a disc wide enough for
  the fight is wider than anything can stand in. After: median 6.0 m/s, peak
  9.4, no jumps.
- **AND HE GOES THROUGH THE PEWS.** Every breakable here has one door — a
  `physProps` entry with an `onImpact` — and the blade, a thrown body and a
  landing all use it; a three-and-a-half-metre knight is the fourth. The blow
  is his own speed, so shouldering one aside taps it apart and running one
  down throws it across the nave.
- **AND THE TUNNEL STOPS AT THE CHURCH'S DOOR.** local.yany's cave is 147 m of
  rock and the church is set against the last station the WALK uses, which is
  not the last rock the model DRAWS — so the far end carried on through the
  doorway. Clipped in world x in the same shader the church's own far end is.

Measured, standing at the altar: 49 swings and 46 damage a minute, all five
close moves used (punch 17, sweep 16, backhand 6, overhead 5, stomp 5). The
Dealer is 48 and 40. **And three readings of "0 damage" before it were the
harness calling `heal()` BEFORE it read `hp`**, which erases every landed blow
in the frame that dealt it; a fourth was `devMode`, which turns a creature's
swinging off outright.

**AND THEN THE KNIGHT WAS POLISHED, AND EVERY ITEM WAS A MEASUREMENT.**

- **BEHIND THE POST, LIKE A STATUE.** Not beside the altar in the open: in
  the slot between the pier on your left and the wall. Both are FOUND, by
  walking out from the altar along -z and reading the walk — open floor, then
  a run of blocked cells (the pier), then open floor, then the wall — and he
  stands in the middle of the second band. Measured: pier at z -1.3, wall at
  -5.5, him at -3.4.
- **AND STANDING BEHIND A PIER IS THE WRONG PLACE TO START A FIGHT FROM.**
  The chase is a straight line at the player and the post is in the way, so
  he ground against it for ever and never arrived. The first thing he does
  when the altar goes is come OUT of the alcove — a walk, eased, over the
  1.8 s of the roar, which is exactly the beat to spend on it. Measured:
  z -3.4 to 4.1 as the roar runs out, and he is in the open before the fight
  starts.
- **SHORTER, SO THE BLOW IS IN THE FRAME.** At 3.45 m his shoulders were over
  the top of the screen at fighting range and every swing arrived from
  off-camera. 2.85 is still half again your height.
- **AND THE BLOW HAS TO ARRIVE AT YOU, WHICH IS A NUMBER.** The hand at the
  contact frame, measured against the player's chest: it was 2.0 to 2.1 m —
  the fight was happening BESIDE you. The reaches came in with the height and
  `aimK` went to 1.70, and now the punch finishes 0.52 m off the chest, the
  sweep 0.64 and the overhead 0.77. That is what "the hits connect visibly"
  is: not a hitbox, a hand you can watch arrive.
- **A PUSH-OUT IS A TELEPORT, AND ON A STEERED BODY THAT IS THE GLITCHING.**
  The room's clamp put him wherever he had to be in one frame. It is capped
  at a walking pace now, so a correction is a lean and never a jump: worst
  step 0.317 m before (an implied 19 m/s), 0.10 after.
- **HE NEVER STANDS ON A PEW; HE GOES THROUGH IT.** The crush gate is a
  shuffle rather than a stride and the reach is his whole body and then some,
  so a bench is gone before his feet could be over it. Measured crossing the
  nave: five of them.

Measured after, standing at the altar: 49 swings and 44 damage a minute, all
five close moves used. **And `bwSpan`'s throw-naming earned its keep**: the
whole placement silently vanished one build because `makeMutant` returns a
UNIT, not an `Object3D`, so `knightUnit.userData` is undefined — the span
said "threw inside cave.glb" and named it in one line.

**HE STANDS IN THE ARCADE NOW, NOT AT THE ALTAR.** The owner stood where he
wanted him and sent the picture: well down the nave, beside the columns, with
the altar small and lit in the distance. Eighteen metres back and five to the
left of the line you walk — in shot from the door, dark enough to read as one
more black shape, one stride from the nave when he comes. Walking out to the
WALL instead (tried) put him fourteen metres off the centreline, which is not
hidden-in-the-frame, it is somewhere else. Measured: he crosses the nave in
6.3 s when the altar goes, and takes thirteen pews with him on the way.

**AND A BENCH TAKES ITS CANDLES WITH IT.** Thirty-two of the hundred and
thirty-four stand on the pews, because that is where you put a candle down
when your hands are full — and it is the carve's own lesson (taking a surface
away does not take away what was on it): when the bench comes apart they are
put OUT, taken out of the instanced batch, and thrown off it as their own
gibs in the wax's material.

**THE TUNNEL IS HALF AS LONG, DEAD STRAIGHT, AND THE ALTAR IS AT THE END OF
IT.** The owner walked it and reported clipping through the rock, a turn at
the church, and nothing to walk toward. Three of those are one fault, and it
is in how the church was JOINED:

- **THE MOUTH IS THE BORE, NOT THE CHAMBER IT OPENS INTO.** The church was
  hung off the last floored column of local.yany's cave — and that column is
  not the end of a tunnel, it is the middle of a room the tunnel flares into,
  seven metres wide, whose median z sits FIVE METRES off the line you have
  just walked. Measured hands-off: the walk runs dead straight down z = 0.10
  for a hundred and forty metres and then DEAD-ENDS IN ROCK at x = 71.6,
  because the doorway is off to one side. That is the "turn", that is why the
  altar was never on the line, and the flare is also where every hole in this
  scan is — nine of sixteen rays out of it hit nothing at all, against zero
  anywhere on the straight run, which is the clipping.
- **A WIDTH TEST ALONE CANNOT FIND THE MOUTH.** Past the flare the model
  tapers to a narrow lobe four metres off the line, and that lobe is
  bore-width by the numbers — it is exactly the cell the church was hung off.
  A station is the mouth only if it is bore-width AND ON THE LINE, and the
  line is measured in the MIDDLE of the run, where both ends' wandering
  cannot reach it (the middle sixty per cent, whose column medians never
  leave a cell of each other: 0.10).
- **AND HALF OF IT WAS CORRIDOR NOBODY NEEDED.** You are set down at the
  middle of the straight run now and the half behind you is clipped in world
  x (`uUcClipX`, the exit cave's own low clip) — but a clip on its own leaves
  an OPEN CROSS-SECTION with the black shell behind it, which is the one
  thing this file has been told twice not to ship. A short capped bore is
  swept at the cut in the scan's own material, a shade wider than the tunnel
  so the rock covers its flanks; and THE WALK GRID IS CUT WITH IT, because a
  clip is a shader and the grid knows nothing about it — left alone, the
  floor behind the cap is still walkable and you stroll out of the world
  through your own back wall.

Measured after: 74 m of tunnel with NO station under a metre of wall (worst
was 0.02) and no ray-miss cluster anywhere; and the whole walk, entrance to
altar, is **97.8 m dead straight at z = 0.10 in 1241 ticks with zero stalled
frames and zero reversals**.

**AND THE TUNNEL HAD NO DUST IN IT.** The motes were dealt out to the church,
the old cave and the CORRIDORS — and the corridor has not been the tunnel
since the day the passage went back to being walked as its own floor; it is
the nine metres of church seam left over from that. Seventy metres of the
walk had nothing in the air at all. The passage's own grid takes the biggest
share now.

**A CANDLE THAT LIGHTS NOTHING IS A PICTURE OF A CANDLE.** A hundred and
thirty tapers were drawing themselves while the room's only lamps stood at
the altar, so the clusters down the nave were bright pips in a black aisle.
Three things, and none of them is a bigger lamp: every flame carries a HALO
(a second Points batch at five times the size and a tenth of the brightness,
guttering on the SAME seed, drawn under the flames — what says "this is the
only light in here" is the bloom of air around it); the wax is lit from
inside, because a candle is translucent and the flame is IN it; and four
point lights hang on the biggest clusters the module placed, spread along the
nave rather than bunched. They cost nothing — point lights have been pooled
since the Windows pass and only the twelve nearest are ever in a shader.

**A SCAN CARRIES THE DAYLIGHT IT WAS BAKED IN, AND AN EMISSIVE LIFT TURNS
EVERY BAKED HIGHLIGHT INTO A LAMP.** "The church textures have light coming
through the edges" was not a gap in the geometry and no amount of closing
holes would have touched it: this church's albedo was lit from outside before
anybody photographed it, so the sunlit edge of every pier is already
near-white in the map, and `emissiveMap = map` at a flat intensity hands
those texels straight back as light. `LOOK.knee` rolls the TOP of the
emissive off (`x / (1 + kx)`) and leaves the bottom alone, so the lift still
carries the dark stone — which is the only reason it is there — and stops
carrying the sun.

**AND THE GLASS WAS THE BRIGHTEST THING IN THE BUILDING.** The backdrops
behind the windows were taken down to a memory of daylight years ago and the
GLASS ITSELF was left at `color: 0xffffff`, so its own pale map was lit at
full albedo: a wall of daylight honeycomb forty metres under a beach, which
is the window the owner photographed. Leaded glass at night with candles
behind you is nearly black and takes a cold sheen, and that is all it may be.

**THE KNIGHT STOOD STILL FOR SEVENTY PER CENT OF THE FIGHT, AND IT WAS A
MISSING `else`.** The movement chain is circle / step back / dash / chase /
decide, and `decide` only runs once the cooldown is spent — so a creature
standing inside its own reach with `cool` still running fell out of the
bottom of the whole thing and was moved by nothing at all. Measured over
ninety seconds: 70 % of frames with his position unchanged to four decimal
places. That is not a tuning number.

A `restless` kind keeps its feet going through the recovery — and the first
build of that overcorrected into the opposite failure, 94 % of frames
strafing and 0.7 swings a minute, because the shuffle re-armed itself
whenever it was not already running and the cooldown could never reach zero.
The shuffle is BOUNDED BY THE BREATH HE HAS LEFT (`sideT <= cool - 0.06`) and
does not start on the last of it.

**THE ENTRY TO THE CHURCH WAS A BOULDER IN THE DOORWAY, AND IT WAS THE CLIP.**
The tunnel was cut at `low.x + GAP + 0.55` — "a hand past the mouth" — and the
doorway's filler panel stands at `D[0] + off.x + 0.14`, which measured is
**1.21 m behind that**. So the last metre of the scan's rock came through the
hole and hung in the nave as a rounded brown mass plugging the arch. It is
cut on the PANEL'S OWN PLANE now, a finger past it, so from the nave you see
the church's wall with a hole broken through it and the bore receding into
the dark — and from the tunnel the panel faces away and is not drawn, so
there is still nothing between you and the room. **And a wall that was broken
through leaves its wall on the floor**: a hole with clean flags under it
reads as a hole that was CUT, so there is a spill of broken stone in the
wall's own material coming out of the break and thinning over two metres,
each lump sunk past half its own depth. It is scattered on a FIXED hash, not
`Math.random` — everything here is rebuilt from seed on a checkpoint load,
and rubble that moves when you die is rubble you notice. Thrown further than
about two metres it stops being spoil and becomes scenery you walk through,
and since none of it has a collider it ends up inside your boots.

**THE TUNNEL IS MUCH DARKER, AND IT CAN BE NOW.** `LOOK.cave` goes from level
0.46 / emis 0.14 to 0.30 / 0.085 — because the glowstick comes out of the
crate at the top of the beach rather than a cache halfway down it, so you
have a light in your hand before you ever reach the hole in the sand wall,
and the altar's beacon is at the end of the bore whatever the fog does.
**And the water has to come down with it**: its look is set explicitly AFTER
`dress`, so it does not move when `LOOK.cave` does, and at a third of the old
level the channel was suddenly the brightest thing in the bore — a pale band
at the threshold where the clip cuts it. What has to survive is that it takes
a HIGHLIGHT, which is the only thing that says water; the level under it can
go wherever the stone goes.

**AND YOU CAN HEAR THE CHANNEL NOW.** The tunnel's floor is standing water —
it is what you actually wade along — and it made no sound at all, so the one
stretch of the game where you can SEE you are walking through water was the
one where you could not hear it. A short bright tick of spray over the
footstep and a small slap of water closing back over the boot, at a third of
the sea's level: it rides over the step rather than replacing it, because a
boot going down in a puddle is one sound. Two things it needed:

- **`Box3.setFromObject` READS `matrixWorld`, AND A JUST-LOADED ROOT HAS
  NONE.** The plane was measured inside the passage's own loader, before
  `group.add(root)` — so its world matrix was still its local one and
  `worldToLocal` took the group's offset off a number that never had it.
  Measured, the box came back three thousand metres out. It is measured in
  `composeInner`, after the group is built. This file has now paid for that
  trap four times.
- **AND A BOUNDING BOX IS NOT THE PLANE.** The water's box is fifteen metres
  wide against a four-metre bore and its far end laps seven metres into the
  nave, so a box test alone splashed on the church's flags. `inPassage` is
  the model's own footprint and is the question actually being asked.

**THE WALK GRID IS A PLAN OF THE FLOOR, AND AN ARCHED BORE IS NARROWER AT
HEAD HEIGHT.** "I can still clip through" survived the straightening, and
measuring the AXIS was why it looked fixed: every station down the middle had
a metre of wall, and the player does not walk down the middle. Sweeping all
1104 walkable cells of the passage with rays at eye height, **86 of them
(7.8 %) had drawn rock within 22 cm of the camera and the worst was 0.00** —
the lens inside the stone — and almost every one sat at z = ±1.6, which is
exactly where this bore's wall begins to curve over. A cell whose floor is
clear can have rock over its outer half at head height; your feet are on the
ground and your head is in the haunch.

The fix is the BODY, not the grid. `bodyR` is how far the walk keeps your
centre off a solid cell and it was 0.24 — a shoulder, which is the wrong
measurement for a tunnel you meet with your head. At 0.62 the bad cells go
**86 → 1** and the worst clearance 0.00 → 0.21 m. **And a wide body must not
be carried through the doorway**: the passage's bounding box runs on past its
own mouth and over the church's threshold, so the fat body was being applied
in the breach — which is an arch the width of the tunnel's mouth and no wider
— and the hands-off walk stopped dead at x = 73.3, seven metres short of the
nave, wedged in the hole. `bodyRMaxX` ends it where the tunnel ends.

**AND THE TUNNEL CAN BE ALMOST BLACK NOW, BECAUSE YOU CARRY THE LIGHT.**
`LOOK.cave` goes to level 0.19 / emis 0.055 — a third of what it was two
passes ago. That is only playable because the glowstick comes out of the
CRATE at the top of the beach rather than a cache halfway down it, so you
have a light in your hand before you ever reach the hole in the sand wall;
what the rock gets from its own material is now almost nothing and what you
see is what your own light falls on. (If it ever needs to come back up, that
one number is the dial. Measuring it with `drawImage` off the WebGL canvas
does not work — there is no `preserveDrawingBuffer`, so every reading comes
back 0; judge it from a screenshot.)

**A PEW IS NOT A WALL TO HIM, AND THE GRID ALREADY KNEW IT.** "He should run
straight through the benches — it looks like he avoids them for a second" was
the room's own push-out doing its job: `UC.pushOut` reads the walk, the walk
reads `floor`, and in a church `floor` is the pews. So he was held off every
bench until `knightCrush` caught up, which is the second of shouldering the
owner saw. The packer writes TWO floors — `floor` is what it found and
`floor0` is the bare slab under the furniture — and reading the second is the
whole fix: `cellFloor(w, i, j, bare)`, threaded through `walkable`, `blocked`
and `pushOut`, and a kind that says `crushes` gets it. The walls and the
piers are `solid` and stop everybody.

**A CORPSE IN THE SURF WAS BEING SOLVED FOR EVER ON A FLOOR THAT MOVED.**
"A wet ragdoll never sleeps (the swash moving under it is motion)" was
written so a floating body would ride the swell, and what it actually bought
was a body the solver never stopped working on. The wave is not level across
a two-metre corpse, so every particle is lifted by a different amount, twelve
iterations of distance constraints turn that vertical disagreement into
horizontal motion, and the thing SURFS. Measured: three mutants killed in the
water, and the one that ended up in it travelled **12.9 metres in twenty
seconds at up to 15 m/s** while the two on sand drifted 0.2. That is the
owner's "ragdolls fly around after death", and the `RAG_VMAX` cap could not
see it because the cap is per substep and the pumping is per frame.

Three things: a wet body may SLEEP, at a looser threshold than sand allows;
it is woken by the water CHANGING rather than by being wet (the old test woke
any submerged sleeper, which in a swash is every frame, so it could never
stay asleep); and water is thick — the drag went from 0.10 to 0.34 of the
speed a substep, which is what a body in water actually does. Measured after:
**drift 1.32 m, peak 5.9 m/s**, two of three asleep.

**AND A BENCH'S BOX IS IN THE CHURCH'S OWN FRAME UNTIL THE CHURCH IS MOVED.**
`w.benches[n]` comes out of the packer in the scan's coordinates and the
church is then translated across the world to meet the tunnel, so every
reader of a box was a hundred metres out. The candles paid for it: the pew
loop stands a taper at the middle of a bench's box, which put THIRTY-TWO of
them at x = -6 instead of x = 94 — floating in the tunnel, tagged as
belonging to pews they were nowhere near. They were doused correctly when
their bench broke, which is exactly why it looked like the feature worked;
what you could see standing on the pews were the nave clusters, and those
knew nothing about any bench. Offset ONCE, the moment the church has a
position. **And a candle that ends up on a pew knows which pew** however it
was placed — the clusters stand theirs on `S.floorAt`, which over a bench
returns the BENCH'S TOP — so every spot is checked against every bench's box
at the end, which is the one place a loop added later cannot forget.
Measured: 23 tagged, 23 actually standing on the bench they name, 0 misplaced.

**THE WAY OUT OF THE APSE WAS A ONE-WAY DOOR.** The bridge over that
threshold was FLAT at the church's floor and stopped a stride past it — and
the cave beyond climbs half a metre in the first metre. Off the end of the
shelf that is a 0.86 m step UP against the church's own 0.40 limit, so the
walk let you out and would not let you back in: measured, walking back from
the exit you stop dead at x = 109.4 and stall 3552 frames out of 3600. It is
one RAMP now, from the church's floor to the cave's own, its far end measured
rather than assumed — the last station past the threshold the cave actually
has a floor at.

**AND A WALL IS SLID ALONG, NOT STOPPED AT — WHERE THERE IS ANYWHERE TO
SLIDE.** Keeping whichever ONE AXIS is clear only works where the wall runs
along an axis, and a church's piers are round and its apse is a curve. The
move is turned instead, a little at a time, and the first angle that is clear
is taken at the speed that survives the turn. **And the thing to be clear
about is what "stuck" was**: measured over 408 cases — pressing into every
wall, pier and altar in the nave from eight headings and then trying to leave
in eight more — NOTHING is wedged, and nothing was before. What the owner was
feeling is the grind, and walking square into a wall and not moving is the
one case that is simply correct.

**AND HE COMES STRAIGHT AT YOU NOW.** The step-out walked him from his alcove
to a measured spot clear of the arcade before the fight began — put in
because the chase is a straight line and the pier he stands behind was in the
way of it — and it reads as a boss sliding two metres to his right while the
roar plays, going somewhere rather than coming for you. Nothing had to be
added to delete it: the pews are not walls to him and the pier is, so
`ucSteer` hands him the way round the moment the line is shut. Measured: he
crosses the nave straight at the altar and takes **seventeen pews** with him.

**THE CHURCH TEXTURES WERE STRETCHED BY THE PACKER'S OWN WELD.** `cluster_uv`
snapped vertices to a grid, averaged their positions and kept **the FIRST
vertex's uv** — and "first" is whatever order the file lists them in. This
scan is mapped the way a modelled scene usually is: every face independently,
with its corners SPLIT, into a baked atlas. Weld those and each face's
corners are dragged to a single arbitrary point in the map. Measured as TEXEL
DENSITY (uv units per metre, per triangle), the upper quartile over the lower
on each material:

    banc 24.5   autel 23.1   arche.001 18.2   colonne 16.0   colonne-ext 14.7

against every material whose parameterisation survived — the stained glass,
the altar cloth, the low wall, all flat quads that were never welded —
reading exactly **1.0**. The separation is not close, which is what makes it
safe to test for. On screen it is a barcode of horizontal bands up every
column, which is what the owner photographed.

A vertex may only merge with one that is near it in the ATLAS as well as in
space (`UV_CELL`). Two things make that safe: the POSITION is still averaged
over the whole position cell across every uv bucket in it, so splitting a
seam can never open a crack; and a triangle still COLLAPSES on position
alone, so the decimation is exactly as strong and the budget means the same
thing. After: every damaged material 1.1-1.5, at the cost of 2.3 MB of extra
vertices.

**"STUCK ON SOMETHING I CAN'T SEE" WAS A HOLE IN THE GRID, AND THE TWO
QUESTIONS DISAGREED ABOUT IT.** The sampler writes a cell's floor from the
triangles that land in it, and on a big flat slab it occasionally lands none
— so there are single cells in the middle of the nave with NO floor at all,
surrounded on every side by cells that have one. Nothing is missing from the
picture: you are looking straight at the flags.

What makes that a wall is that `floorAt` falls back to the nearest neighbour
that has a floor and answers -0.07 like everywhere else, while `walkable`
sees `null` and — by a rule that exists for a good reason, since three grids
overlap at the joins and "no floor here" has to mean "ask the next grid" —
passes it on to nobody. So the floor is drawn, the floor is answered for, and
the step is refused.

The hole is filled rather than the rule changed, and the difference between a
hole and the edge of the grid's coverage is MEASURED: flood the run of
floorless cells and fill it only if it is small AND fully enclosed by floor.
The open ground past the apse is thousands of cells and is never touched.
`solid` got the same treatment `floor` already had (`despeckleSolid`) — a
lone solid cell is a hanging chain or a lamp sampled into the body band, and
a chain thin enough to be missed by eight rays is thin enough to walk
through. Measured by sweeping every cell with a floor and raycasting the
DRAWN geometry round each blocked one: **629 holes filled, 152 solid speckles
cleared, invisible blockers 23 -> 4** (and the four left are the true outer
edge of the aisle floor). The walk from the entrance to the altar is
unchanged at zero stalls and zero reversals.

**A BOOT IN WATER IS NOT A BOOT WITH WATER ADDED TO IT.** "The first tunnel
footsteps do not sound like water at all" was a MIX, not a missing sound: the
channel's step played the full dry SAND footstep — thud, packed grains, grit
scattering, the odd shell chip — and laid a short bright tick over the top at
half the level. There is no amount of tick that turns a dry step into a wet
one, because the dry layers are the ones that are wrong: grains do not
scatter under water and nothing crunches. The water IS the footstep there
now, in the four parts a boot going into an inch of water over stone has —
the surface breaking, the column shoved aside (the part that gives it mass,
and the part the old one had none of), the stone UNDER it muffled, and the
water closing back over with a scatter of drops. Measured as what the step
adds over the room tone: 18.5 % below 900 Hz against the game's own
`sfxSplash` at 8.4 %, which is right — a puddle over stone is heavier and
closer than surf. And it carries the step's own level now (0.62), because it
IS the step: at 0.30 it measured 9 dB under the church's recorded one.

**AND THE FLOOR A CREATURE FOLLOWS IS THE BARE ONE.** `walkable`, `blocked`
and `pushOut` have taken `bare` since the knight learned to go straight
through the benches; `floorAt` had not — and the floor is what sets a
creature's HEIGHT. So every pew he ran through lifted him 0.45 m and put him
down again, which is the owner's "he should not be lifting up when running".
Measured across the pew line at z = 3.0, where the floor alternates 0.57-0.63
(bench tops) against -0.07 (bare slab): his y is -0.07 the whole way and
still rises to 0.27 on the dais. A person still stands on a pew.

**A new `three/addons/…` import needs adding to TWO import maps.** There is no
build step, so `three/addons/utils/BufferGeometryUtils.js` is a bare specifier —
a nickname the browser will not guess at. It only resolves if it is listed in
the import map, and there are two of them: `index.html` for the game and
`models/viewer.html` for the dev viewer. Miss either and that page dies with
`Failed to resolve module specifier …` before a single line runs — a blank
screen, not a degraded one. Being present in `vendor/three/` is not enough:
`BufferGeometryUtils.js` sat there unreferenced for ages and still had to be
mapped the first time something imported it.

**The tunnel is region-clamped, not collided.** The cliff is one mesh that
snaps back onto the player every `CLIFF_PERIOD`, so a hole cut in it would
repeat down the whole beach. Instead the bore stands proud of the dune toe at
`TUN_BORE_X`, the cliff material discards fragments across the mouth in WORLD
space (same trick as `clipAtShore`), and `updateTunnelBounds()` clamps you to a
box for the corridor and a bigger box for the room. `inTunnelMouth()` is what
lifts `CLIFF_BLOCK_X`, and only down low. The room at the end is a stand-in,
not the reference model.

**THE SHARP SIDE LEADS, AND THE BACKHAND IS THE WRIST TURNED OVER.** A cut
tilted at the enemy with its flat to the camera is still a bar being carried
across; the owner called it weird and he was right. Each stroke solves its
own grip about the blade's axis so that, measured in view space at the mark,
the edge points the way the blade is travelling. The return needs the
forehand's grip turned half a turn about the blade — the model's edge is on
-X and there is no other way to get it facing the other way — and a solve
seeded from the unturned grip could not find that (cost 12.7); seeded from
the half-turn it found it at once (1.0). Because `slBlend` is already at one
when the return is chained, the grip goes over on the frame the return
begins rather than being Euler-interpolated through the floor.

**AND THE COMBINATION IS TWO STROKES, EACH SOLVED WHOLE.** The forehand runs
right to left and the return runs left to right from where the forehand
finished — both horizontal, both straight, both the same speed, so a chain is
a rhythm you can hold rather than something that accelerates away from you.
Mirroring the first to get the second is the obvious thing and it does not
work (see `mirrorSide`); the return is solved in its own right against its own
line, which is the only way to know both ends of it are on the screen.
Measured: the forehand's point runs 0.87, 0.86, 0.76, 0.30, -0.40, -1.00 and
the return's -0.91, -0.92, -0.77, -0.25, 0.39, 0.98.

**AND IT IS THE INTERPOLATED PATH THAT MUST BE SOLVED, NOT THE KEYFRAMES.**
Putting three poses dead on a line is not the same as putting the SWING on
it: a pose lerp is linear in joint angles and bows in screen space, and the
first solve — every key exactly on target — still arced the point a third of
the way up the frame between the cock and the mark. That arc is what the
owner was watching. The cost samples the tip at every quarter of BOTH lerps
and measures how far off the line it strays; worst deviation went from 0.28
of the frame to 0.016. Two more things the solve has to be told, both learned
by getting them wrong:

- **The cock is a pose you HOLD, so it has to be on screen.** Optimising for
  straightness alone put the cocked fist a whole half-width past the right
  edge with the point out beside it, so a full charge showed an empty screen
  and a stamina bar. Pin the fist inside the frame and pay a little
  straightness for it.
- **The strike has to land MID-SWEEP.** Solving only the two ends let the
  mark drift a fifth of the way along, so nearly all the visible travel
  happened in the follow-through, after the blow had landed — a swing whose
  picture arrives late. Pin the mark to the middle of the line.

**AND A THREE-POSE SOLVE NEEDS CONTINUITY OR IT CHEATS.** Solving the cut's
poses independently against their screen targets hits every target and
produces a flail: the first pass came back with the arm's pitch jumping 2.25
radians between the mark and the follow-through and the hand not travelling
at all, because rotating the wrist is a cheaper way to move a tip than moving
the arm. Penalties on the frame-to-frame change in pitch, lift and reach, a
requirement that the roll march one way, and a floor on how far the hand must
cross the body are what turn three correct poses into one stroke. Over-
constrain it and it stops hitting the targets at all — the useful setting was
to weight the TIP heavily, the grip lightly, and the continuity in between.

**A SHARED POSE SET IS ONLY CORRECT FOR THE LENGTH IT WAS SOLVED AGAINST.**
The cut was laid out against the Military Shovel, whose lip is 0.89 m from
the fist; the katana's is 0.755, so the same arm travel swept a shorter blade
and the cut fell short of the crosshair and finished with the point still
high on the far side. A whole second pose set was solved for it and came back
pinned against its own bounds — a shorter blade simply needs the HAND to
cover more ground to cross the same frame. So the stroke is SCALED rather
than restated (`bladeReach`, `bladeDrop`: a quarter more travel across, and
the hands fall through the follow-through), and every improvement ever made
to that stroke still applies. **And the tool must keep the SHARED grip
through the cut**: giving the katana its own slash grip threw the point off
the top of the screen, because the arm poses are only correct for the blade
angle they were solved against.

**AND A HAND REACHING OVER A TABLE TRAVELS IN AN ARC.** A straight line from
his hip to a point on a table top goes through the table. `reach_pose` takes
an `arc` that lifts the hand's PATH — zero at both ends, so the solved peak
pose is untouched, which matters because the game's hand-off from table to
fist happens exactly there. Measured in the game, the fist closes 8 cm from
the bar.

**AND THEN THE CHAIR STOPPED BEING SOLID AT ALL.** `S.escape` got you out
of the swivel chair, and getting out of a chair is still a second you spent
not fighting. A chair is a thing a person shoulders past. `carveNav` takes a
named set of meshes back out of the walk grid at load — the three `Chair*`
objects, measured in the room's own frame with a cell of margin — and you
walk through them. Nothing else in the room is on that list, and nothing
else should be: 2.31 m² of floor opened, the reachable area grew by exactly
those three spots, and the room's walls were never the grid's job anyway
(the `nav.room` box is what holds them, which is why a carve cannot breach
them). The sweep still reads 308 cases and none stuck.

**AND THE REACH IS SOLVED, WITH THE FEET ON THE FLOOR.** "It just lags into
his hand" was a 30 cm gap between where the pickup put his hand and where
the bar lay. The peak reach pose is a coordinate descent in the pack
(`reach_pose`, `REACH_TARGET` in armature units: his right is -X, forward
is -Y) — and the error term has to include the SOLE, because the first solve
bent him down through the floor, the per-frame seating then lifted the whole
clip 0.43 m, and the hand went up with it. The target is measured in the
game (`d.bones.hand` at the grab frame against `crowbarOnTable`), never
computed from the numbers.

**And a thrown thing must never LAND on it.** A body brought it down by a
proximity guess — within 1.5 m, `abs(p.y) < 1.4`, and moving faster than 3
— but the collider stands `CASTLE_H` (1.65 m) tall, so anything that
arrived over the top was already above that gate: it rested on the
cylinder and hung there in mid-air, which is what "they float" was.
`PhysProp` now asks the two solid helpers WHICH collider they hit, since
both already report it. `rockGroundAt` answers "what would this land on",
which is true of anything merely flying over, so the floor case also tests
that the body has actually reached `top + restH`; `pushOutOfSolids`
already skips anything it is above, so a hit on the flank is contact by
construction. Either way the castle is gone before the line that would
have made it a floor, and the body falls on through to the sand. There is
no speed threshold any more: it is sand, and whatever reaches it brings it
down.

**THE FRONT OF THE BUILDING HAD A THREE AND A HALF METRE HOLE IN IT.** The
parapet's colliders were laid 0.9 m of arc apart at radius 0.45 — beads on
a string, touching and no more — and the gateway skipped every sample
within 0.19 rad of the door, which at that radius threw away THREE of them.
So the gate's 1.4 m opening was collided as a 3.5 m one and you walked
through the front wall beside it. They are laid at half their own diameter
now and the opening is measured in METRES off the gate's own width. The
gate itself had no colliders at all — it was a picture of iron — and the
posts had none either; both are solid, and the leaf had to be swung
further open (1.35 rad) once it was, because where it hung as scenery it
lay across its own doorway.

**AND `floorY` HAS TO SURVIVE THE COPY.** The room's furniture is solid five
metres up and nowhere else: `pushOutOfSolids` reads `floorY` and skips
anything whose bottom is over your head. But the loop that offsets the
house's colliders into world space rebuilt each one field by field and
quietly dropped it — so a sofa on the top floor was a post standing on the
sand, and the way in through the gate was blocked by an armchair nobody
could see. Copy what you are given, or the field may as well not exist.

**THE CHURCH'S FLICKER WAS THE UV FIX, EATING ITS OWN TAIL.**
`cluster_uv` has always dropped a triangle whose three cells it has already
emitted — and that key was built from `remap`, which BEFORE the uv split
was the position cell, so it caught every twin. Splitting vertices by uv
bucket to save the texel density (the round-6 fix for the stretched
columns) quietly broke it: two source triangles landing on the same three
position cells from different corners of the atlas now emit two faces at
exactly the same depth. Measured in the game — render each view twice with
the camera moved six tenths of a millimetre and diff the pixels, then
raycast the pixels that changed — **every flickering pixel in the nave was
one mesh fighting itself**, and counting exact duplicate triangles per mesh
found 34 % of `arche.002`, 17 % of `mur-bas-ext`, 11 % of `arche`. The key
is the POSITION cells now, sorted so a twin with the opposite winding goes
with it. After: zero doubled faces in the church, and zero flickering views
over twenty-six sweeps of the nave, the apse and the tunnel. The walk is
unchanged (entrance to altar 99.8 m, 1318 ticks, zero stalls, zero
reversals). **A z-fight is measurable: move the camera a fraction of a
millimetre and diff.**

**"THINGS FLOAT WHEN I DROP THEM IN THE CHURCH" WAS THE DUST.** The
undercroft drifts motes as a `Points` batch and stands its candle flames in
another, both of them in the air in front of your face — and a `Points`
intersection carries NO `face`. So `dropPoint`'s ray stopped on a speck
0.78 m out, the "is this a wall, or a floor" test below skipped for want of
a normal, and the item was set down at the height of the mote. Measured: a
syringe rested at y 401.30 against a floor at 399.93, a metre and a third in
the air. **Only a mesh triangle is a place to put something down**;
everything else a ray can reach down there is weather. After: 4 cm off the
floor at every pitch.

**AND SHE FLOATS BY HER SOLE, NOT BY HER RAIL.** The moored boat was hung a
measured 0.92 m of freeboard under the pier's boards, which is what a boat
tied up at a low dock looks like FROM THE DOCK and says nothing about where
her floor is: on a shallow open boat the sole is most of that metre down.
Measured, it lay at -1.29 against a sea plane at -1.07, so the water was
drawn inside her and you boarded a swamped boat — the owner's report two
rounds running. Rays down her centreline find the deepest surface a body
could stand on and she is floated until that is clear of the sea. It is a
measurement and not a number because the hull is a scan: repack it and the
freeboard would be wrong again. Measured after: sole -0.91 to -0.97 against
the sea at -1.07, and "E Set Sail" still reads from the boards beside her
and standing on her.

Measured at the end: the walk from the pier still reaches 44,454 cells and
all 36 bearings, still tops out at 4.87 m on foot — and the hoist takes you
from the jetty at 2.50 to 16.15 in seven and a half seconds, called down
from the ground, walked onto, ridden, and walked off at the top onto the
terrace outside the keep's door at 16.11. Rays down all four corners of the
car say the shaft is clear the whole way: nothing but the jetty at 2.26.

**AND A BOOT IN THE TUNNEL IS THE SEA'S OWN RECORDING.** The channel's step
was synthesised — four layers of filtered noise, which is what sand is — and
the owner's word was that it should sound like stepping in ocean water, a
little lower. His own `wade` bank is already in the game for walking through
the surf and it is the same event, so the tunnel plays it at 0.88 of the
rate: a smaller room, and an inch of water rather than a foot. The
synthesised puddle stays as the fallback for the frames before the bank is
off the network, the katana's own arrangement.

**AND COMING OUT OF THE CAVE IS THE SECOND CHECKPOINT.** The pavilion's is
an hour back up the beach and everything past it — the church, the knight,
the idol — is behind a crawl nobody wants to make twice. `caveSaveDone`, at
the moment the black lifts on `ucDir < 0`, the same `saveCheckpoint` so the
badge says it happened, once a game, the pavilion's own rule. Measured:
`hasCheckpoint()` true with the save at (12.4, 1.70, -640.4), which is the
sand a rim's width outside the mouth. **And testing it needs the pane
VISIBLE** — the cut is on the wall clock inside `animate`, so a hidden pane
runs no frames, `updateUndercroftCut` never advances and `leaveUndercroft`
never completes; `ucBusy` stuck true is the tell.

**THE CHURCH AND THE TUNNEL MET ON A LINE, AND THE LINE WAS THE DRESSING.**
"Make this blend better, the shades are off, this part is too light, and you
can see out of the church." Every one of those is the same fault measured
three ways, and it is not geometry: it is that a room's LOOK is a constant
per material. The church is dressed at `level` 0.98 with its emissive at 0.9
and a knee of 2.4; the tunnel is 0.19, 0.055 and no knee — **five times the
diffuse and sixteen times the lift** — which is right for each room on its
own and catastrophic in the one doorway where they touch. What you see
standing at the breach is a pale band of church stone with black cave rock
butted against it.

- **A GRADIENT IS THE ONLY THING THAT CAN LIVE IN A DOORWAY.** `uUcFade` is
  the world-x band to ease over and `uUcFadeTo` the level, knee and emissive
  multiplier to ease TO, and both sides are given the SAME values to arrive
  at — level 0.45, the knee half on, and multipliers that bring 0.9 and
  0.055 to the same place — so at the breach itself the seam has nothing to
  draw. Three and a half metres each way, which reads as what it should be
  anyway: the nave's light falling into the mouth of the bore and dying, and
  the church's threshold standing in the dark under its own arch.
- **AND `patchMat` DRESSED EVERY CLONE AS CAVE ROCK.** It is right for a
  sleeve swept behind the tunnel's own wall and wrong for the spill of
  broken stone that came OUT of the church's wall and is lying on the
  church's floor: measured, the rubble at the threshold shipped at level
  0.19 against the flags' 0.98 and an emissive of 0.055 against 0.9 — a
  black heap on a lit floor, in the exact spot the owner photographed. The
  kind is a parameter now; the default is unchanged.
- **AND THE BLEND IS RE-RUN AFTER EVERYTHING IS BUILT.** The rubble is not
  in `S.mats` when the band is first handed out, and one lump of unfaded
  stone lying in a faded doorway is the same seam one object smaller.
- **AND THE CHANNEL MUST NOT END AT THE DOOR.** The tunnel's water is a flat
  plane at y = 0.019 lying on a bore floor that runs about -0.05, so it
  stands the better part of a hand PROUD of what it lies on. In the middle
  of the tunnel that is standing water; at the threshold the clip cuts it
  off square and the church's own flagstones start at -0.071, so the cut
  edge is a nine-centimetre lip of the one specular surface down there,
  lit by the lamps either side of the doorway and pointing at the camera.
  This file had already named that band ("a pale band at the threshold where
  the clip cuts it") and answered it by taking the LEVEL down, which is the
  one thing that cannot help: **the edge is geometry, not brightness.** The
  channel is clipped a stride and a half back into the bore instead, where
  neither room's lamps reach, and the threshold is dry stone on both sides.

**AND A SHADER DISCARD IS INVISIBLE TO A RAYCAST.** Half an hour of this
round went on a probe that reported the tunnel's rock and the tunnel's water
standing well inside the nave, which is exactly what the clips exist to
prevent — `uUcClipX` and `uUcClipHi` are `discard` in the fragment, so
`intersectObjects` walks straight through them and answers with geometry
nobody can see. Read the material's own `bwClipHi` beside every hit, or
judge it from a screenshot.

**AND A TABLE IS SOLID UNTIL IT BREAKS.** It was made walk-through in the round
that stopped it being a wall AFTER it had broken; the owner's word now is the
other half of that. It is not put back into the face index — a round table read
off the drawn faces is its legs and its pedestal and nothing else, because the
top is a disc five centimetres thick and `KEEP_WALL_MIN` is 0.12, so you would
walk into the overhang and stop at the pillar. `pushOutOfTavTables` is the
table's own DISC, its top's radius, which is the silhouette you are actually
looking at, and it is skipped the moment `t.dead`. Measured: walking into one
stops at 1.25 m from its middle (0.99 + a 0.26 body) from every side it can be
reached from, and after the break the same walks go straight through.

**AND `_selfProp` IS SET AROUND THE PHYSICS' OWN FLOOR QUERY AND NOTHING
ELSE.** The solve asked the same question from the settle, where it is null —
so the board found its OWN published top surface under every sample, read them
all as level, and solved a flat line. A plank dropped over the edge of the bar
lay across it in the air. The guard belongs in the one place both callers pass
through, not at the call sites.

**AND A BOARD AT REST MUST NOT CHANGE ITS MIND.** With the ramp forming, it
then breathed: 0.14 m every ten frames, for ever. A station sitting on the
EDGE of a step reads the floor one frame and the crown the next — two metres
apart — and the two answers want slopes a tenth of a radian apart, so the
board turned hard one way, which moved the station off the step, which turned
it hard back. Four things, and the order matters because each exposed the
next:

- a station is 0.32 m of board, not a point, so it is asked about its own
  whole length and takes the HIGHEST answer (under-sampling a step is the one
  error that lets timber into stone, so the bias is the safe way);
- the slope it turns toward is EASED, so what it follows is the average of an
  argument the sampling cannot settle;
- **a board that has stopped SLIDING is at rest, whatever its height is
  doing** — the settling bob is the solver, not motion, and testing the whole
  velocity woke the turn on every bob;
- and while the pose in PLAN has not moved and it has not fallen a third of a
  metre, the supports it solved stand. Measured: 15 of 16 placements dead
  still to four decimals, and the ramp itself 0.

Measured at the end: the board laid at the step rests spanning 5.34 → 7.44,
and the walk from the gallery up it, into the bore and down to its far end is
**210 ticks with zero stalls and no jumping**; the carpets' 2.49 m gap is
still bridged and still walked (81 ticks, zero stalls); 4 of 80 drops round
the hall end with the board's centreline touching drawn stone, which is what
it was before this round.

**AND THE JARS WERE ON THE GALLERY, NOT IN THE TUNNEL.** Off the gallery's far
end a two-metre bore runs eleven metres into the rock at 7.19 over the flags
and ends blind — and the "far end of the passage" the first pass walked to was
the open landing at 5.30, in FRONT of the arch rather than through it, which
is where the owner photographed them lying on the rug. Both ends of the bore
are found rather than typed: the floor is walked back from the landing until
it runs out, and the bore is then measured ACROSS at that last station so the
pair stands on its centreline whatever the model does. Measured: (-12.7, 7.21,
-24.05), a stride off the back wall, reading "E Take the jar".

**THE REFLECTION ON THE TUNNEL'S WATER IS THE ALTAR'S.** The channel was a
cold near-black that took whatever highlight was going — and the only light in
that bore is the one in your own hand, so the smears lying on the water were a
reflection of the GLOWSTICK and of nothing that is in the room. A reflection
takes the colour of the thing it reflects, and the only thing at the end of
that tunnel worth reflecting is the altar. The water's SPECULAR is tinted to
the candles' own colour (the beacon is 0xffb266 and the two lamps on the altar
0xffa951 / 0xff9a45), which on a metallic surface is what the base colour does
— high metalness is the whole trick, and it is the one case where METALNESS IS
NOT A TRAP, because a mirror has no diffuse term to lose. The level under it is
unchanged: the diffuse is a sixth of that colour and stays as dark as the rock.
Measured on the water under the held light, before and after: **(9.0, 11.5,
15.2) — blue — becomes (12.3, 8.9, 5.9)**, which is the candles' own ratio.
(And a specular change cannot be seen from just anywhere: it only exists where
the camera sits on the MIRROR direction of a light, so the before/after has to
be sampled there. Measured by rendering into a `WebGLRenderTarget` and reading
the pixels back — `drawImage` off the WebGL canvas returns zeros, there being
no `preserveDrawingBuffer`, and a render target has no such problem.)

**"IT IS LIKE I HIT A COLLIDER WALKING STRAIGHT FROM THERE" WAS AN INVISIBLE
CEILING, AND THE DUCK UNDER IT PUT HIS FEET THROUGH THE FLOOR.** Two faults,
and the second is what turned the first into a wall:

- **A ROOF NOTHING IS DRAWN UNDER IS NOT A ROOF.** A storey carries the ceiling
  the packer sampled, and in an open hall that is now and then a table top, a
  beam or a hanging lamp landing in ONE cell. Measured over the whole floor by
  raycasting UP out of every low-roofed storey: **206 of them carried a roof
  under head height with nothing drawn beneath it**, including a metre-wide
  patch at waist height in the middle of the open floor. `pruneTavStoreys` has
  asked what is drawn over a storey since the tables went ghost — it now keeps
  the answer and clears the roof with it, which costs one more probe.
- **AND THE FEET ARE ON THE FLOOR, NOT UNDER THE HEAD** — the undercroft's own
  rule, which this room never got. The camera ducks to `st.c - 0.22`, so with a
  phantom roof at 1.02 the eye went to 0.80 and `camBaseY - playerEye()` to
  **-0.82**: eighty centimetres UNDER the flags he was standing on. The storey
  is then more than a step ABOVE his feet, nothing answers, and the walk
  refuses every move — a man crouched into the flagstones, stuck on nothing.
  While he is on the ground his feet are the floor he was last standing on.

Measured by walking eight directions out of every open cell with the game's own
movement and asking, wherever he did not move, whether anything is DRAWN in the
way: **16 spots stuck on nothing became 8, and all eight of those have real
geometry within reach** (a stall valance, a 0.98 m bench, the bar, a wall he is
six centimetres from). Low-roofed storeys 432 → 130, phantom roofs 206 → 15.

**AND THE TUNNEL'S WATER IS THE LAMP'S OWN HEX.** It shipped at 0x8a5c2e — the
altar lamp's hue at half its level — and on a mirror the base colour IS the
reflected colour, so it is 0xffa951 (the candles' point light) at full with
the metalness up to 0.93 so almost nothing is left over as diffuse.

**AND THE HORDE'S TAKE PLAYED ON EVERY RESTORE FROM THE TUNNEL.** The pack
at the dock has had "a trigger you have already crossed does not fire again"
since the day the checkpoint went in; the three past the pavilion never got
it, and the cave's own save is written THIRTY METRES past them — so loading
it opened with the cutscene, at a stretch of sand whose creatures are
behind you. (Dev mode skips that take on the walk and cannot skip one that
fires on the frame the save is read.) `beginRestore` marks it crossed and
leaves them asleep on their marks. Measured from the cave's spot, dev mode
on and off: `mutPhase` 2, `mutCut` false, the field of view untouched.

**AND A STATION SWEEP MUST NOT CROSS A TRIGGER.** Teleporting down the beach
past `CAVE_Z` puts you in the catacombs (in dev mode, without even a take),
and every station after it reads sixteen draw calls with the world culled
behind you — half an hour of this round was spent on numbers measured from
inside a room. Sweep to -750 and no further, or set `caveDone` first. And a
frame's `renderer.info` belongs to the LAST render call: `autoReset` is on,
so a hide test has to call `renderer.render` itself rather than read what
the loop left behind.

**AND THE LAYOUT OF A CLIMB IS MEASURED BY CLIMBING IT.** A jump lifts the
feet 0.616 m (`JUMP_V` 4.3 against `P_GRAV` 15) and the walk catches a floor
`ROCK_STEP` (0.42) over them, so 1.03 m is the tallest step anywhere in this
game and 0.88 is a real jump with a hand's width to spare. Across, a jump
carries about 1.9 m. Three layouts, each killed by a measurement:

- **three lanes cycling** puts a 2.30 m LEAP on every third step — the climb
  stalled dead at the third ledge for a minute of trying;
- **four lanes cycling** puts a 3.30 m one on every fourth;
- **and a four-step pattern that goes out and back WALLS ITSELF IN.**
  `pushOutOfSolids` grows every box by most of a body radius and skips only
  one you are UNDER (`floorY`), so a shelf 0.88 m over your head is a WALL —
  and a second shelf beside it AT THE SAME DEPTH grows into the very gap you
  have to pass through to reach the first. Traced on the thirteenth ledge:
  boxed in at x 11.76 by the two above it, unable to move a millimetre in any
  useful direction.

What works is TWO LANES and THREE DEPTHS on a four-step cycle: nothing is
ever more than 1.39 m from the next thing, and no two shelves share a lane
AND a depth within 3.52 m, which clears a standing body by a metre and a
half. Measured, hands-off with the game's own movement: **seventeen ledges in
491 frames, both faces of the bay**, then a stride onto the top of the wall
and a fall down the other side. It is mirrored because **a fence you can only
cross in one direction takes the trader, the catacombs and your own
checkpoint away from you the moment you use it.**

**AND "I CLIP THROUGH THE CAVE ROCKS" WAS THE PUSH-OUT, NOT THE COLLIDERS.**
Measured first, over 405 spots round the entrance: 98 standable, and TEN with
drawn rock inside the body, all of them off the mouth corridor's flanks.
Three things were tried and the order is the lesson:

- **Filling the interior made it WORSE** (10 bad spots became 13). Only the
  EDGE cells were solid, on the argument that the inside of a mass nobody can
  reach needs none — and the corridor that makes the mouth walkable is a slot
  cut through that outline, so you walked in at the arch and stepped sideways
  into a hollow. Filling it is right and costs nothing (a solid row merges
  into ONE box where a hollow outline is two: 211 colliders became 212).
- **Rasterising the triangles rather than bucketing the VERTICES** is also
  right — a face a couple of metres across crosses cells that hold none of
  its corners — and it changed the count by one and the bad spots by nothing.
- **AND THE THING IT ACTUALLY WAS: the shallowest face of one box is not the
  way out of a field of them.** Out of the nearest face of the box you are
  deepest in, and straight into its NEIGHBOUR, which pushes you back through
  the face you just came out of. Measured with the real `pushOutOfRocks`:
  0.52 m deep in a box spanning x 13..25, the four passes put the body at
  12.78, back to 13.34, and there it stayed. "Deepest first and ask again"
  converges on a single convex solid and cannot on two that share a face. A
  face is only a way out if it LEAVES you out: the four are tried in order of
  how far they move you and the first that lands clear of every collider
  wins, falling back to the shallowest when none does.

Measured after: the eight spots that used to stand inside the mass are all
ejected (0.34 m to 12 m), standable spots round the entrance 99 -> 68, and
what is left is four places with rock on six or more of twelve bearings —
every one of them in the throat of the arch, which is a doorway and not a
bug. **And a proximity metric cannot tell a doorway from a burial**: count
the bearings.

**AND THE WAY OUT OF THE CHURCH IS THE WAY IN, A SECOND TIME.** The owner's
word on Valsev's cave behind the altar: take the model out, it looks bad.
This file has twice been told the caves are HIS models and that "make this
better" is not "replace this" — and the line there was always his to draw,
which is what he has now done. Asked what should stand in its place he had no
preference, so it is the one answer that takes nothing else away: the exit is
local.yany's tunnel, the SAME bore you walk in through and the one model down
there he has kept, so both ends of the church now read as one place.

Nothing in the composition changed. The exit is a stub — measured, the walk
it was given is **18.4 m** — so it is that tunnel packed a second time and
cut to length with the packer's own `--trim`, which keeps the far end and
leaves a clean cross-section at the cut for the apse ring to plug:

    tools/undercroft_pack.py passage "…/tunnel/scene.gltf" assets/cave.glb \
        --scale 3.8 --yaw 90 --sparse --trim 50

26.4 m of bore, 44,920 triangles, and the file went from **6.2 MB to 1.15**.
It is written to the same path on purpose: `compose` reads the cave by its
walk grid and by `findMat(root, 'MaterialKEInGLANZ') || findMat(root)`, and
that fallback is the whole reason a different model drops in — the ring, the
skin, the carve, the clip and the ramp all followed it without a line.

Measured after, with the game's own movement: the chancel through the break
and 21 m down the bore is **273 ticks with ZERO stalls**, dead straight at
z 0.2; the far exit still reads "To climb out" from 4.5 m, 39 ticks off the
mark; and walking BACK IN from the bore to the church is 292 ticks with 5
stalls, so the ramp still holds and it is not the one-way door it was once.

**AND THE EXIT INHERITED THE ENTRY'S SEAM, WHICH IS WHY IT GLOWED.** The
owner photographed the apse: a tan tube in a grey wall with a hard edge round
it. The join was not the fault — the DRESSING was. `S.doorBlend` eases both
sides of a doorway to the same values over a world-x band, and it picked its
materials by NAME: `/^Rock01/` got `(doorX - 3.6, doorX)`. The moment the way
out behind the altar became a second cut of local.yany's tunnel, its `Rock01`
was handed the band belonging to the doorway at the OTHER END OF THE CHURCH,
thirty-five metres away — and the shader clamps, so every metre past `doorX`
resolved to the seam's own values: level 0.45 against the cave's 0.19, with
its emissive multiplied by 2.3. The whole bore was lit as though all of it
were standing in a doorway. **A band belongs to a PLACE**, so it is keyed on
the root the material came off, and the exit's runs the other way — from
three and a half metres inside the bore down to the apse. Confirmed on the
live uniforms: the exit's four materials read `(3111.0, 3107.4)` over a base
level of 0.19.

**AND A WALL THAT WAS BROKEN THROUGH LEAVES ITS WALL ON THE FLOOR — at both
ends now.** The front door has had its spill since the day it was cut; the
apse had a ring plugging the hole and nothing else, so the break was a clean
ellipse in clean stone, the one edge in the building with nothing lying under
it. Stone out of the break into the chancel in the WALL's material, a bank
inside the mouth in the TUNNEL's, and — the part the owner asked for when he
said to cover it with rocks — fourteen lumps sat ON the cut's own rim, half
in the wall and half in the hole, flattened into it rather than stuck out of
it. **An ellipse stops reading as an ellipse the moment something breaks its
outline.** Same fixed hash as the front door's, for the same reason.

**WHAT WAS MEASURED AND NOT CHANGED, and where the next win is.** The
passage contributes ZERO from the nave — frustum culling already drops all
152 m of it, which is worth knowing before anybody tries to gate it by
distance. The ocean is one draw and 115k triangles and has already been
argued about once. The rock mountain at the cave mouth is 205k triangles in
32 calls, and it is an exact scan by the owner's word. What is left in that
nave view is the CHURCH at 140 draws, and forty of those are the benches,
which are separate meshes because every one of them breaks — merging them
until the first one breaks is the obvious next lever and it is not a small
change, because the break cuts the bench's own geometry by triangles.

**AND "I RELOAD AT THE TUNNEL TO THE CHURCH AND CANNOT SEE ANYTHING" WAS TWO
MORE OF THE SAME FAMILY, AND MY OWN TEST HAD PASSED BOTH.**

- **A `placeIn*` MUST DRAW ITS OWN ROOM.** The undercroft's was the one in the
  game that did not: `enterUndercroft` switched the group on at the top of the
  cut, which is fine for the door and useless to a restore, because a restore
  calls the PLACE and never the cut. Reloading that save stood you in an
  invisible church with the night ducked to six per cent and the sky hidden —
  a black screen with the HUD on it, exactly the picture. Every other room
  already did it in its own `place`; this one does now, with its ambience.
- **AND A ROOM IS NOT READY BECAUSE ITS GROUP EXISTS.** `spawnBunker` makes
  the group at module time and the download fills it minutes later, so
  `ready: () => !!(bunkerHome && bunkerHome.group)` was true from the first
  frame. The restore placed the player inside an empty shell, `updateBunkers`
  found no `nav` and skipped it, `inBunker` stayed null, and the beach's own
  floor lifted them to the sand FORTY METRES above the save — measured, dpos
  40.002 with the room loaded and hidden underneath them. A room is ready when
  the thing the WALK reads is there. The other four rooms set their flags
  inside their loader callbacks and were never at risk; only a proxy can lie.

**AND A RAYCAST CANNOT TELL YOU WHETHER A ROOM IS DRAWN.** `Object3D.visible`
is per object, so every mesh under a hidden group still reads `visible ===
true` — the probe that passed the undercroft found floor 1.62 m below and roof
1.62 above and NOT ONE of those triangles was being rendered. The check is:
walk the parents for real visibility, count what is drawn, render the frame
and read the pixels back out of a target (`drawImage` off the WebGL canvas
returns zeros — there is no `preserveDrawingBuffer`). Undercroft 0 → 141 of
144 drawn; bunker 20 → 576 of 601, at 493 draw calls and a screen that shows
the control room. **VERIFY A ROOM BY RENDERING IT.**

**THE KNIGHT'S RING WAS CANCELLED BY THE JEWELLERY BOX.** His drop was gated
on `ringsFound`, which is the HUD's "you have found A ring" — and the
pavilion's gem ring, which you pass on the way to the church, sets it. So
anyone who opened the box never got the octopus ring. It asks for the octopus
ring itself now (`inventory` or `rings` holding `ringItem`). And a knight a
save remembers as dead is RETIRED on the frame the room lands with
`knightFight` still false, so a ring left on the flags before the save went
with him; a retired knight drops it too.

**THE WAY OUT OF THE CHURCH IS A WAY BACK IN.** The far rock (`mountainExit`)
carries its own "To crawl in" now, the front mouth's twin, and
`enterUndercroft('exit')` sets you down in the exit bore a few strides short of
its end, facing the altar through the broken apse (`ucArrival`). Two things:
**the arrival is on the CHURCH'S AXIS, not off `spots.exit`**, because that spot
is the last floored column, out in the flare at the end five metres to one side,
and four metres in from it there is no floor at all; and the save written on the
way in names which end (`ucIn` / `ucInFar`), so a restore puts you back at the
door you used.

**AND NOTHING FLOATS, BECAUSE HER BOARDS ARE DISHED.** `soleY` runs 0.14 to
0.24 across one room; a rigid table put down at the sole of its own CENTRE
stands a corner five centimetres off it. Every piece takes the LOWEST board
under its own footprint, so a leg is buried rather than hanging — which is
what a hundredweight of oak sitting on a buckled sole for sixty years does.

**AND A GAME-READY OAK ALBEDO IS TWO AND A HALF TIMES HER OWN TIMBER.**
Measured on screen in her crew space, each set on its own against her boards
(20.2) and her lining (16.8): table 49.7, bench 53.1, chair 40.3, barrel 40.5,
bunk 23.3. That is the furniture glowing, and it is not a taste question. ONE
SCALAR PER SET, ON LUMINANCE — a per-channel pull is a colour remover, which
this file has paid for twice — swept to land them all at about 24, a shade over
the floor they stand on. And the response is ACES, not linear: the first
scaling from a single measured point overshot by 16 %, so each number came out
of two measured points and a fitted exponent rather than out of arithmetic.

**A HOLE BROKEN THROUGH MASONRY IS MADE OF MASONRY (`brokenWall`, in
`models/undercroft.js`).** Both church joins were CUTS — a flat panel or a
shader cylinder, the rock ending on it, the nave straight behind — which is
"the connections look bad". A real broken wall has thickness and breaks along
its joints, so each join is now two leaves of ashlar blocks in running bond
(`BREAK_T` 0.78 thick), every block mapped onto one plain-stone cell of the
wall's own atlas (`ashlarBox`), missing, snapped short or knocked askew at the
hole, the tunnel-side leaf broken back further. The front door's face panel
keeps its arch but cut half a metre wider than the core's hole, so what shows
round the hole from the nave is block ends stepping in; the apse's hole is
ROUND (`R`/`cyR`) and inside the skin's own round cut (1.15 about 1.30 against
1.42 about 1.46) — an arch with straight sides stood in the circle's bottom
corners, and a bigger cut exposed a strip of floor lit white. Rubble is
`blockHeap` (broken blocks), not icosahedra: those read as black pebbles with
a blue shine. Four things it needed:
- **A WALL IS SOLID WHERE IT STANDS (`S.gates`).** The grids think the tunnel
  is four metres wide at the church, so you walked through the stone beside the
  hole — "I keep clipping through". A gate is a band of x in which `walkable`
  wants you inside the hole's width. **And a fat body must end a body's width
  short of a gate** (`pw.bodyRMaxX`, `cw.bodyRMinX`), or its ring samples the
  gate's stone and holds you off the hole — measured, stuck at x 109.3 walking
  back into the church.
- **The rock is clipped behind the face (`hiX`), not in front of it**, or the
  bore's rim shows as a tan ring between the face's arch and the blocks; and
  the channel runs to the foot of the wall's back instead of ending on a hard
  line a stride and a half short.
- **The church's flags start a quarter of a metre inside the face**, so a strip
  of the void showed along the foot of the wall as a pale blue line; a
  threshold of flags (`breakSill`) runs from the wall's back to a metre into the
  nave, a finger proud, and also covers the daylight the scan's floor was
  photographed in at the door.
- **Church stone at the seam's values reads black against the tan rock**, so
  the broken walls carry `bwBreak` and their own band (emissive ×0.34 at the
  seam), and `bwNoCut` so the apse's cylinder cut does not punch through them.
And the exit bore wants the passage's body (`cw.bodyR` 0.62): at the sparse
grid's 0.19 the lens went into the haunch at 29 spots down it (4 after), and
its corridor carries `pad` 0.34 for the same reason. Measured: both holes
walked both ways, head-on and at an angle, zero stalls; the passage 40 → 75
and the exit end to end and back, zero stalls.

**THE PASSING THEME, OUT OF THE CHURCH'S FAR END.** The owner's "passing
theme" (`assets/passing-theme.m4a`, lifted 13 dB at encode, 52 s) is fetched
the moment you press "To climb out" behind the altar and started the frame the
black lifts on the sand (`startPassing`, from `updateUndercroftCut`): up out of
nothing over 4 s, held to 13 s, and then gone slowly over the rest of its own
length. FAINT is a number: on the music slider at `PASS_LEVEL` 0.62, which puts
it about 10 dB under the whale sighting. Once a page, only by that door, and it
is stopped if you go underground again.

**"THE CHURCH TUNNEL EXIT LAGS" WAS A GLASS ROBE.** Sol's `robe` came out of
its .blend with `transmission` 0.095, invisible at that level. But any material
with transmission on screen makes three draw every opaque object a second time
into a transmission target, and that target is linear and not tone-mapped, so
every program in view is compiled a second time for it. The way out behind the
altar looks straight back at him. Measured from the exit bore looking at the
church: 3.0 ms a frame became 1.58, and the first look no longer compiles
thirty programs in a 250 ms frame. `noTransmission` in the GLTFLoader wrapper
zeroes it on everything that loads (`userData.keepTransmission` opts out), and
logs it. **How it was found**: a cache-key diff of two programs with the same
material name, which differed only in `outputColorSpace` (`srgb-linear`) and
`toneMapping` (0). Only a render target does that, and the only render target
drawn mid-frame is three's own transmission pass. **When the same material
compiles twice, diff the cache keys.**

**THE IDOL TOPPLES AND BREAKS WHERE IT LANDS (`idolSetup`, `idolPose`,
`idolContact`, `shatterIdol`).** It rocks on the altar with a stone grind,
then goes over about the front edge of its own base toward you (θ'' = 1.5 g
sin θ / h, so slow at the top and fast at the bottom), and breaks on the frame
a sampled point of the figure goes under the floor beneath it — the altar top
or the dais. The pieces are a Voronoi of its own triangles (7 seeds through
the body for big pieces, 20 round the impact for small), each carrying the
fall's ω × r at 0.16 plus a small kick along the ground; its materials are
set DOUBLE-SIDED when it loads so a shell of a piece is never see-through and
the break compiles nothing. Then tetrahedron chips (a quarter in its gilt),
the candles within 1.9 m doused and thrown, a dark dust cloud that hangs
(normal blending, 0x3b3229 — pale or additive dust in a dark room glows), and
`sfxIdolShatter`. Tuned against frame strips: at 0.42 of ω × r the big pieces
flew four metres out to the player's feet.

**ENEMY HEALTH BARS (`updateEnemyBars`, `#ehp`).** One small SOLID red bar per
enemy — never segmented, that is the player's — and ONLY once you have hit it
(`u.hbT`, stamped by `hurtMutant` and `hurtCrab`), for `EHP_HOLD` (14 s) after
the last blow, out to 16 m. It sits 0.24 m (scaled by height) over the head
bone (`kind.rig.head`, the ragdoll alias, or any bone called *head*), 44 by 4
px, translucent and shrinking with distance. It is NEVER seen through a wall
(`ehpBlocked`, every 0.18 s): the line from your eye is walked in one-metre
legs through `keepHitsWall` in the catacombs, the tavern and the keep, through
`dojoHitsWall` in the dojo, and raycast against the room in the undercroft and
the bunker. A pale strip behind the red holds for a beat after each blow and
eases down. The young one (`baby`) counts blows and has none.

**A THROW IS A WHIP, AND THE ELBOW LEADS IT.** Solving the hand alone let the
solver hold the arm straight and swing it from the shoulder like a flag. The
cock asks for the elbow high and out with the hand folded behind the head;
there is a key where the elbow has come forward and the hand is still back;
the wrist cocks back and flicks through (its sign MEASURED at the release off
the fingertip). The release is at 0.68 s of 1.15.

**THE CATACOMBS MONSTER IS SOLID, AND HE CAME THROUGH WALLS BECAUSE HIS
ROUTE DID.** The walk grid is a plan of floor, so it has floor on both sides
of a railing or a prop standing across a passage and nothing that says you
cannot step between them. Measured at the stair head outside the door room:
his route's next leg ran 1.2 m straight through a solid thing the drawn faces
call a wall at his hip AND his back, and every earlier fix only moved where he
clipped — the old watchdog got him "through" by snapping him past it. Three
things now:
- **`catEdgeCut`**: A* asks each link of the drawn faces (at the higher
  floor + 0.6 and + 0.95, so a stair's riser is under it) the first time it
  wants it, and caches the answer in `catG.cut`. Lazy on purpose — the whole
  graph at once is a second of work. With it he routes the real way round and
  reaches the door room in ~20 s where before he stood 8 m off for good.
- **`catSolid(u)`**, the LAST word of every frame (run from `updateMutant`
  after `updateMutantUnit`, because the lunge, knockback, separation and snaps
  all move him after `mutClampX`), against `u.catSolid`, the last place he was
  legal: the frame's movement may not cross stone at his hip and back
  (0.6 / 0.95 — at a standing shoulder's 1.45 the stair head's 1.16 m lintel
  was a wall) or at his flanks (`CAT_FLANK` 0.34; his real half-width is
  0.82 and the doorways are 1.3 m); nothing of him — origin, flanks, head —
  enters `catDoorBody`, the barred door's box a metre deep into the room; and
  his HEAD (the last 0.8 m of neck, at the head bone's own height) is turned
  out of stone rather than backed out of it, because a three-metre body can't
  round a corner in a 1.3 m corridor without swinging its head, and backing it
  off every frame is a creature that never gets round. A graze under 0.22 m is
  allowed, and so is stone at head height with the hip clear (a lintel).
  `setCatSolidOff(mask)`: 1 sweep, 2 door, 4 head, `true` all.
- **His blows** go through `blowWalled` (his origin and his head to your chest
  and hip, walked in legs) and his hitboxes are tight: `limbR` 0.46 (the
  pack's 0.70 is a new per-kind knob), `landSlop` 0.42, `barLen` 0.30.
Measured hands-off, player pinned 1.3 m inside the door (`tools/catsolid.js`):
head in stone 453 frames of 4200 → 0; door box 12 → 0; 50 hits, none with
stone between; 2.5 ms a frame.

**AND THE BEACH'S PUSH-OUT KNOWS AN INSIDE CORNER.** `pushOutOfSolids`
tried the four faces of the box you were deepest in and took the shallowest,
which in the rock heap's merged boxes put you straight into the neighbour
and threw you 2.03 m in a frame when the horde pressed you into it. A face
that lands in another box is paired with that box's nearest face in the
other axis, and the first candidate that is clear within a metre wins
(worst 0.22 m after). `clampPlayerToRoom` now runs the beach push-out too,
so a knockback on the sand is answered by the thing it pushed you into.

**DEV MODE GIVES YOU THE WEAPONS AND NOTHING ELSE.** `devGrantWeapons` used to
hand over every ring and the whale's artifact too, and the knight's drop asked
whether you already had the octopus ring — so in dev mode it never dropped.
Rings and artifacts are found the same way in dev mode as out of it; the
knight's drop only skips (outside dev mode) when you really are carrying it.

**THE PASSING THEME PLAYS EVERY TIME YOU CLIMB OUT BEHIND THE ALTAR.** It was
once a page, so if you went back in (to finish the knight, say) and came out
again, the sand was silent. Being underground re-arms it (`passPlayed = false`
while `inUndercroft`).

