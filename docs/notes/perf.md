# Performance, loading, warming and draw calls

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**Turning round used to hitch for a quarter second.** The structure is
frustum-culled until it first enters the view, and that frame pays for
compiling every shader program *and* uploading ~400 geometries.
`renderer.compile()` only does the programs, so `warmDrain()` renders the
whole thing into an 8×8 offscreen target on the first animate frame, while
the title card still covers the screen; and `bakeScatter()` merges the
decorative scatter by material (`BufferGeometryUtils.mergeGeometries`,
now in the import map). 263 ms → ~36 ms. `bakeScatter` has to normalise
first — polyhedra come out non-indexed, boxes indexed, and the hand-built
channel strips carry no uv, and the merge refuses a mixed batch.

**THE LAG SPIKE WALKING TO THE TUNNEL WAS A LIGHT ENTERING THE SCENE.** Three
separate costs were all being paid on the stretch of beach the player walks:
the hall's seven-megabyte parse, the creature's 2.7 MB parse, and — the one
that actually hurt — `warmShrine` showing the hall, rendering it and hiding it
again, which toggled three point lights in and out and so RECOMPILED EVERY
MATERIAL IN THE GAME, twice, mid-stride. The pavilion has the same scar and
its answer was to have no lights at all; the answer here is that the lights
live in a group that is NEVER HIDDEN, three thousand metres away with a 95 m
falloff, so `NUM_POINT_LIGHTS` is fixed for the life of the page and hiding
the hall's meshes is free. The saucer's own lamp had the identical problem
through `farProps`. Everything else moved to boot: the fetch, the parse, the
warm (on the chain in `animate()` behind the title card) and the creature,
which is BUILT hidden and asleep and only revealed on the touch. Measured over
680 frames of that stretch, cold: median 6 ms, p95 7.6, and not one frame over
40. Before, the same walk had eight frames over 50 ms.

**AND ONE LOOK IS NOT ENOUGH TO WARM A ROUND ROOM.** A drum has a far wall, a
near wall, a floor and a dome, and what has not been SUBMITTED has not been
compiled however hard frustum culling is switched off — a single 60-degree
view from the middle left fifty programs for the reveal. Six views cover it.
What is left on entering the hall is the BEACH's own far-culled lamps going
out as you teleport three thousand metres away, which is inherent to being
somewhere else and lands behind the beam and the flash.

**"IT LAGS" IS A BLOCKED MAIN THREAD, AND NEITHER OBVIOUS INSTRUMENT WORKS
HERE.** rAF deltas measure whatever the host pane feels like throttling to —
this file has read 5682 ms "frames" off a game that was fine — and
`PerformanceObserver({entryTypes:['longtask']})`, which is the right answer in
a real tab, reports NOTHING inside the preview's iframe: long tasks are
delivered only to the top-level document. Verified by burning 220 ms in a loop
and getting zero entries back. So the work times ITSELF: `bwSpan(tag, fn)` is
wrapped round the two places where every long block in this game happens — a
FRAME and an ASSET'S LOADER CALLBACK, the latter by wrapping
`GLTFLoader.prototype.load` and `.parse` once so a load added later is measured
without anybody remembering to — and `__bw.lag()` reads them back worst first.
Every number below came out of it. **And measure with the pane VISIBLE**: a
hidden one does not run rAF at all (so no warm ever completes, and
`warmMush` reads `warmed: false` for ever) and Chrome deprioritises its
network besides, which inflates every load time by seconds.

**AND THE PARSES TAKE A FRAME EACH.** `GLTFLoader.parse` is one blocking call
— the bunker's is 127 ms and the hall's 278 — so two landing on the same frame
is a third of a second of nothing. There is ONE chain now (the creatures' own
queue and the crab's were separate, and two queues that each politely yield a
frame will still put a creature and a building on the same frame as each
other) with a turn of the event loop between each. **And `setTimeout` is not a
turn**: a background tab clamps timers to a second, so a fallback written as
`setTimeout(go, 50)` turned twenty-three parses into twenty-three SECONDS the
moment the window lost focus. A `MessageChannel` message is a task and is not
clamped, so whichever of it and the frame arrives first wins — the frame in a
visible tab, which is what puts one parse on each frame, and the message in a
hidden one, which simply gets on with it because there are no frames.

**A WARM IS SEVERAL FULL RENDERS OF A ROOM AND IT MUST NOT BE ONE FRAME.**
Measured per step: the hall's was 780 ms in a single block, the drain's 409,
the pavilion's 293 — and THE BUNKER'S WAS 2329, four hundred meshes and
seventeen megabytes compiled, decoded and uploaded on the one frame it is
first drawn. That is the right idea in the wrong shape: the whole point of a
warm is to move a cost off the frame the player would otherwise feel it on,
and a cost is not moved by being put somewhere else ALL AT ONCE. Three
changes, and the order they were found in is the lesson:

- **Steps.** `warmStep` / `warmRunStep`: one view a frame, drained by
  `animateFrame` before it considers starting the next room, so the chain
  cannot run two rooms at once either. And `loadShrine` was calling
  `warmShrine()` inline, which put six full renders on the same frame as the
  parse and the dressing — the longest single block in the whole load.
  `animateFrame` had asked for it since the day it was written.
- **Slices.** A view may be a `[k, n]` slice that shows every n-th mesh, so
  the bunker uploads a sixteenth of itself at a time.
- **But slicing only helps where the cost is the UPLOAD.** Sixteen slices took
  the bunker's worst frame from 2329 ms to 1206 and no further, because the
  cost is the shader COMPILE and whichever slice first reaches a material pays
  for it whole. `renderer.compileAsync` hands that to the driver
  (KHR_parallel_shader_compile) and the slices that follow are uploads only:
  2329 → 383. It is fired and forgotten — `compile` collects the materials
  synchronously, so the room may go straight back to being hidden — and where
  the extension is missing it is exactly the `compile` that was always there.

**AND A ROOM WANTS WARMING IN THE LIGHTING STATE IT WILL BE ENTERED IN —
WHICH IS A TRAP EVERYWHERE BUT ONE PLACE.** The frame you arrive in the hall
cost 402 ms and compiled fifty-five programs even though the hall had been
warmed at boot, because `updateFarProps` switches every landmark off by your Z
the moment you are three thousand metres away and a warm taken standing on the
beach compiled them all for the wrong light count. `warmAtZ` moves the
player's Z for the length of the warm draw and fixes it: 402 ms → 47. Then it
was given to the drain, the pavilion, the bunker and the saucer as well, and
the boot produced TWO FRAMES OF TWELVE AND A HALF SECONDS — because moving the
Z changes which far props are visible, a far prop with a lamp in it changes
NUM_POINT_LIGHTS, and that recompiles every material in the game, forty times
over, each time with more of the world visible to recompile. The hall is the
one place it pays, and the reason is that the hall's Z is three thousand
metres from everything: every far prop is OFF, which is the cheapest scene
there is to compile, and it is the exact configuration the take hands you.

**AND THE TWO THINGS A CUTSCENE REVEALS WERE THE TWO THAT WERE NEVER WARMED.**
Every room in this game is warmed and the saucer and the witness — which exist
only to be seen in a take — were not. The saucer compiled fifty-eight programs
on the frame the black lifts; the Character Creator alien is ten materials
(skin, eyelashes, two tearlines, a tongue, teeth, two eyes) and twelve of the
crash's thirty programs were his face. Both are warmed now, the saucer in four
slices from underneath and the witness once from in front while he stands
hidden on the sand through a fight that lasts minutes. **And the order of the
warm chain matters**: `warmShrineBoss` WAITS — it wants the whole cast dressed
and the drones built, and until it has them it returns without setting its
flag — so anything behind it waits with it, which is how the saucer ended up
never warmed at all. Anything conditional goes last.

Measured end to end, with the pane visible and the real loop running: boot is
3.8 s of blocking spread over 39 frames behind the title card (worst 434 ms,
four frames over 250) and every asset is in by 8.3 s; the abduction take has
NO frame over 24 ms; and the death, the crash and the hand-back have one, at
338 ms, with two new programs where there were thirty.

**"IT LAGS, ESPECIALLY ON WINDOWS" WAS THREE COSTS, AND NONE OF THEM WAS THE
TRIANGLES.** Measured standing still at the spawn, doing nothing: **1123 draw
calls, 506k triangles, 497 shader programs and 46 point lights in every
shader.** A Mac absorbs all of that — Metal will take a thousand draws a frame
and say nothing, which is why every one of these had been walked past. Windows
runs WebGL through ANGLE onto D3D11, where a draw call is a validated API call
costing several times what it costs on Metal, and where every shader program
must first be TRANSLATED to HLSL and compiled by the D3D compiler. So the three
things that were nearly free here are the three things that are not there.

- **SIX HUNDRED AND SIXTY DRAWS WERE SPENT PAST THE FOG.** `FogExp2` at 0.014
  leaves under one per cent of a surface at 153 m; the camera's far plane is
  five thousand. 821 of the 1123 draws, carrying 230k triangles, were beyond
  that line — the lighthouse's masonry from a kilometre and a quarter, the
  bunker forty metres underground, every cache down the whole walk.
  `farProps` is the hand-kept version of this idea and it works; what it
  cannot do is cover what nobody remembered to register, and by the time the
  walk was a kilometre long that was most of the world. `cullBeyondFog` takes
  it by the SCENE instead of by the list: the highest subtree with nothing
  un-cullable in it is a unit, measured once for its own radius and culled
  against `DRAW_FAR`. The list's own distances — 260, 300, 320, 340, every one
  of them at least ninety metres past the point where there is nothing left to
  see — are clamped to the same number.
- **AND FOG HIDES A THING BUT IT DOES NOT HIDE A HOLE IN THE SKY.** That is
  the one place the reasoning above is wrong and it took a pixel diff to find:
  rendering with and without the cull, everything that still showed a
  difference at 920 m was 27 to 93 metres across. Fully fogged, a landform is
  not gone — it is a shape of fog colour standing in front of a brighter
  horizon and in front of the moon, and culling it does not remove a dim
  object, it opens a hole. Anything bigger than `SKYLINE_R` keeps whatever
  `farProps` already said about it: 43 units out of 595, which costs nothing,
  because the draw calls were never in the big things (the median culled unit
  is 0.7 m across). What is left is 2 to 9 pixels of moon where a speck at
  700–1000 m used to cross it.
- **FORTY-SIX POINT LIGHTS WERE IN EVERY SHADER AND NONE OF THEM REACHED
  YOU.** `NUM_POINT_LIGHTS` is a #define, so a fragment of sand on an empty
  beach ran the point-light loop forty-six times and every draw bound
  forty-six lights' worth of uniforms. They are all in the scene for ever
  because this file learned early that a light ENTERING OR LEAVING recompiles
  every material in the game — true, and the price of obeying it had quietly
  become the whole problem. So the lights are VIRTUALISED: twelve real
  `PointLight`s are added at boot and are the only ones the camera ever sees,
  and every other point light in the game stays exactly where it is, keeps its
  name and its parent and its intensity, goes on being animated by whatever
  owns it, and is moved to a layer the camera does not watch (three gathers a
  light only if `layers.test(camera.layers)` passes, and unlike `visible` that
  is not something anything else in this file reads). Each frame the twelve are
  pointed at the twelve that actually reach you. **Twelve is measured**:
  sampling every light's own position and the whole walk, the most that are
  ever within 1 % of the brightest at one spot is NINE, under the lighthouse's
  lantern. Verified by rendering the same frame both ways at sixteen light
  clusters — pixel-identical. Programs went 497 → 114, which is the load-time
  bill on Windows cut by four fifths. **And the side effect is worth as much as
  the saving: hiding a lamp is FREE now**, so `farProps` may cull a group with
  lights in it and the hall's lamps need no longer be kept alive in a group
  that is never hidden.
- **A BUILDING MADE OF SIX HUNDRED LITTLE MESHES IS SIX HUNDRED DRAW CALLS,
  AND THE TRIANGLES ARE NOT THE POINT.** The pavilion is 583 objects — every
  astragal, every pane, every rib of the gills — and together they are under
  ten thousand triangles: twenty-two triangles a draw. This file has already
  argued once that the pavilion's six hundred meshes were not its cost, and on
  a Mac that was true. `bakeStatic` is `bakeScatter` with the nesting handled
  (a pavilion is a tree, a scatter is a flat list): merged by material, in the
  root's frame, skipping anything that moves on its own, carries children, is
  instanced or skinned, or is NAMED — a name means somebody holds it. The gate
  is kept out by hand because it swings. Pavilion 563 → 41, drain 122 → 27,
  and the two decorative horseshoe crabs — 86 meshes and 49,000 triangles each
  for a prop the size of a dinner plate — 172 → 18, the beach copy merged from
  a CLONE so the one in your hand and on the examine screen stays whole.
  Merging gives up per-mesh frustum culling, which is the right trade for a
  building and the wrong one for things scattered over a kilometre, so this is
  called on BUILDINGS.
- **AND THE INVISIBLE RAYCAST PROXIES WERE BEING DRAWN.** All 34 `hitProxy`
  spheres are transparent at opacity 0, and every one was a draw call and a
  place in the depth-sorted transparent pass. `Raycaster` tests `layers` and
  never `.visible` (`intersectObject` in three r160 is two lines and there is
  no visibility check in either of them), so a proxy can be `visible = false`
  and stay hoverable. Everything that reads them already excluded them by
  name.
- **AND THIRTY THOUSAND TRIANGLES AN INSTANCE IS A DISTANCE, NOT A BUDGET.**
  The headland's dense grass is twelve instances of Pasha's blade patch —
  368,640 triangles, more than half of everything in the frame at the fence,
  for blades a quarter of a metre high rendered at 0.42 of the screen, where
  every one of them is a fraction of a pixel. It is the body bag's ropes
  again. It lines the last twenty metres of the lane, so it gets thirty
  metres and nothing further.

Measured over the walk after, at fifteen stations from the spawn to the
lighthouse: **draws 1123 → 336 at the spawn and 235 on average, worst 663 at
the fence** (which stays in pieces because it is destructible), **programs
497 → 114, point lights 46 → 12, and the render call 2.69 ms → 1.00 ms.** The
place that gained most is the pavilion, 1100 draws and 4.48 ms → 157 and
0.70. Nothing in the walk changed by more than 0.014 % of the frame.

**AND A THING THAT FOLLOWS YOU IS CULLED BY WHERE IT IS.** Every `farProps`
entry is scenery keyed to the Z it was built at, which is right for a pier
and catastrophic for a creature that chases: run two hundred metres and he
was switched off at his spawn's distance and kept coming, invisible. `live`
reads the object instead.

**A DISTANCE CONSTRAINT HOLDS A SKELETON'S LENGTHS AND NOTHING HOLDS ITS
VOLUME.** Arms folded through the chest, thighs through the belly, and a
corpse settled into a puddle with a man's proportions only on paper — the
owner's "deflated balloons", and half of it was self-inflicted, because
doubling the kick and raising gravity gave a solver that was already only
just converging much more to do. Three things, and they are the difference
between a ragdoll and a bag: every pair among the six trunk joints braced at
FULL stiffness (a box with only its edges is a hinge — the DIAGONALS are what
make it a truss); twelve iterations over three substeps instead of seven over
two, because an unconverged distance constraint IS a stretched limb; and
SELF-COLLISION, every pair of parts that is not joined pushing apart at the
sum of their radii, worked out once per body and pruned of any pair already
inside itself at rest, because a collision that fights the skeleton shakes
the body apart. Measured from the frame of death to rest, every segment now
holds within 1.2 %.

**AND A TELL WANTS A DIRECTION, NOT A MOMENT.** Both arms lifted straight
over the mask was one shape with nothing in it to read but timing, and it
came down the middle so there was nowhere to move. What a man with a crowbar
does when he means it is COIL — bar back over the shoulder like a bat, back
half turned, then through horizontally with the hips leading and the bar
last. It is legible in silhouette from across the room, it has a side you can
move away from, and it crosses the frame instead of arriving at a point. The
head has to counter the coil or he spends the whole tell looking at the wall,
and a man not looking at you is not about to hit you.

**MOTION IS FLUID WHEN IT DOES NOT ALL ARRIVE AT ONCE.** Every joint in an
authored pose ran off one number, so shoulders, elbow, hips and head started
together, crossed together and stopped together — which is the single thing
that makes pose-to-pose animation read as a mannequin being posed. `drag`
shifts the driving time for the arms so the body leads and the hand is last;
`follow` carries a limb past its stop and brings it back, one soft decaying
bounce. It costs nothing but the shift.

**A skinned mesh cannot be `clone()`d.** The clone shares the skeleton and
every copy then walks in lockstep, and SkeletonUtils is not vendored here —
so the .glb is fetched ONCE and `GLTFLoader.parse()` is run per crab off the
same buffer. Four parses, one download.

**AND THE PAVILION'S LAMPS WERE THE LAG.** Five point lights in the room,
and the owner's word for the result was "lagging horribly". Measured, once
warm, the room renders in 4.1 ms and the lamps account for 0.14 of it — so
it was never the drawing, and it was never the six hundred meshes either.
EVERY LIGHT IN A SCENE IS A SHADER DEFINE. Five point lights entering
changes `NUM_POINT_LIGHTS` for every material in the game and three
recompiles all of them: 193 ms in the room, 312 on the beach, and again on
the way back out — at 320 m, in the middle of a walk, which is exactly what
"random" lag is. Warming only moves the bill; it does not cancel it, and it
cannot cover the reverse transition at all.

The answer is the one the rocks and the creatures and the tall one already
use, and that this file says twice about textures: DO IT IN THE MAP, NOT
WITH A LAMP. Every material in the room carries its own emissive off its
own map, hard enough to read under a quarter moon, and the pavilion adds no
lights at all. First draw went from 214 ms and 33 new programs to 60 ms and
7 — its own materials, nothing else's — and a walk straight through the
far-cull line has no frame over 7.9 ms. **Before adding a light to anything
that far-culls, price the recompile, not the render.**

**A DRUM OF WINDOWS DOES NOT WANT A BACK.** Six bays on the cliff side were
papered over from the inside — bullseye paper, big and warm, with the
furniture that wants a wall standing against it — and it was the wrong idea
in a building whose whole argument is a band of glass on a column. The
owner asked for it off, and he was right: a round room with a horizon in
every direction wants everything in it kept BELOW THE SILL, so the glass
runs unbroken over the top of the furniture and the sea is visible from
anywhere you stand. Nothing in there is over 0.75 m now but the lamp, the
palm and what hangs from the ceiling.

**BOXES ON A CURVE INTERPENETRATE.** The sofa was five boxes turned to the
tangent and laid round the arc, and adjacent boxes rotated 22 degrees apart
bury each other's corners — every joint had one unit inside the next and
the shading tore along the seam. That is what "the couch textures are
lagging into each other" was, and it is not a texture problem at all. A
round room takes a curved sofa: arcs of the drum, the same `arcBand` and
`ringArc` the building itself is made of, with the modules read as gaps
between the cushions. **And a sofa is a box with a BACK**: the first
curved one was a plinth with flat plates on it and read as a red shelf.
The back stands half a metre over the seat and there are arms, which is
most of what tells the eye how big a piece of furniture is.

**THE RANDOM LAG WAS THE LIGHT COUNT, AND IT IS MEASURABLE.** Showing the
pavilion for the first time cost 214 ms and compiled 33 new shader
programs; showing it again cost 6. It is not the geometry — three point
lights entering the scene changes `NUM_POINT_LIGHTS` for every material in
the game, and three recompiles all of them. `warmMush()` pays it on an
early frame under the title card, the way the drain and the bunker are
warmed, and the bunker's rule holds: THROUGH THE CANVAS with a four-pixel
scissor, never into a render target, because a target has its own output
colour space and three compiles a different program for every material.
First show: 214 ms became 7.8, with zero new programs. **And the warm chain
runs one per frame, so it never fires in the preview pane** — rAF there
ticks 0 in 600 ms, which is why `warmMush` read `warmed: false` for a long
time and looked broken. Call it off `__bw` to test it.

**A ROOM WITH NO LIGHT IN IT IS NOT A ROOM.** The whole seventies interior
was built and could not be seen: one directional moon outside a band of
glass leaves an interior that renders as a black drum, and no amount of
colour on a sofa survives that. Four cold lamps under the ceiling and one
warm one over the credenza — they are the moon through the missing panes
bouncing off a pale dish, which is what it would actually do. **Three, not
ten**: every light in a scene is a shader define, and a far-culled group
that switches ten of them on as you walk up to it recompiles every material
in the game at the worst moment.

**THE OCTOPUS RING IS THE SKETCHFAB FILE, UNTOUCHED.** Every earlier build
took this model apart: first ONE of its seven chunks as if the split were an
LOD chain (7,165 of 400,540 triangles, a cloud of specks), then
`--decimate 45000`, which welds rather than shreds and is still not the
model — vertex clustering keeps positions and indices, so it threw the
NORMALS away, and with no normals and no uv the metal had to be invented:
Poly Haven's rust on a triplanar projection, with a level nobody could judge
because there had never been a surface to judge it on. The owner's word was
to scrap all of it. So it ships whole — 400,540 triangles across its own
seven meshes, its own per-vertex normals, and its own material. **There was
never anything to project onto**: measured on the source, no images, no
textures, no TEXCOORD and no COLOR_0, one material at metallic 0 roughness
0.6. The rust was a liberty taken to fill a gap the decimation had made.
12.3 MB, at the back of `ASSET_REACH`. **And it is cheap to draw**: with the
whole octopus filling the screen at 25 cm the frame carries 430,496
triangles against 29,956 and the render call goes 0.69 ms to 0.95 — a
quarter of a millisecond, in seven draws. Triangles were never this game's
problem; draw calls and shader programs were.

**AND "THE RIGHT TEXTURE, LIKE THE SKETCHFAB MODEL" WAS THE MATERIAL.**
Checked twice, in two copies of the download (the zip in ~/Downloads and the
`octopus_ring.glb` on the Desktop): no images, no textures, no TEXCOORD, no
COLOR_0, one material at metallic 0 and roughness 0.6, and the base colour
left at white. So the viewer is showing a plain white PBR material on a scan
of a pale resin print, and matching it means matching THAT — near-white, not
the 0x6f6a63 under an orange lift the previous pass graded it to, which came
out as tan batter. The Poly Haven rust beside it in that folder is what an
earlier build reached for when the decimation left the model with no uv; it
was never part of the asset.

**AND A WARM IS ONLY MOVED IF IT IS SPREAD — the bunker's lesson, unlearnt
twice.** `warmView` has taken a `[k, n]` SLICE since the bunker's 2329 ms
frame, and two rooms built after it never used one: the undercroft's first
view was **397 ms in a single frame** (a church, a cave and a hundred and
forty metres of bore uploaded together) and the drain's inner view 117. Six
slices and eight. Measured: the worst frame of the whole boot went 412 → 161
ms. What is left is `cave.glb` at 465 ms, which is the undercroft module's
own build — the skin fit, the carve and the ray walk — and is not a warm.

**AND THE OCEAN'S GRADED GRID WAS BUILT, MEASURED AND REVERTED.** It is
115,200 triangles, a quarter of the frame, at one uniform 9.2 m facet whether
it is under your boots or eleven hundred metres out; and the plane snaps onto
the player in 8 m steps, so warping the rows toward the middle gives finer
water close up out of a third of the vertices. It rendered identically on the
clock and it cost the HORIZON: the sea's far edge stands against the sky as a
line whatever the fog does, the rim rows are what draw it, and at 2 m facets
in the middle the rim goes to 47 m and that line becomes a staircase you can
count. The number that settles it was measured first and ignored anyway —
hiding EVERY mesh over 8,000 triangles in the frame is worth 0.35 ms of 1.23.
**TRIANGLES WERE NEVER THIS GAME'S PROBLEM. Draw calls and shader programs
were**, and a saving that does not show on the clock is not worth a pixel of
the sea.

Measured over sixteen stations, spawn to fence: **draw calls 310 → 188 on
average and 489 → 330 at the worst, the render call 1.13 → 0.82 ms, and the
worst frame of the boot 412 → 161 ms.** The way to find any of this again is
the one used here: freeze rAF, put the camera at a station, `step` it a few
frames so the far-cull runs, then hide each scene child in turn and read the
draw count back.

**AND THE GRIP GOES IN THE PALM, NOT AT THE WRIST.** The pin offset is the
artist's own, taken from a frame of the shipped `Swing` where the
COPY_TRANSFORMS is baked in — and it puts the Katana bone's head on
`DEF-hand.R`'s head, which is the WRIST JOINT. A fist closes five to eight
centimetres further along, so once the fingers finally curled shut the tsuka
was landing behind the palm and the hand closed BESIDE it. The palm is measured
rather than nudged — the midpoint of the wrist and the middle finger's first
knuckle — and the bone head goes there; the ROTATION is untouched, because that
is the angle the artist held it at and it reads. 0.057 units, and the fist
closes round the handle.

**AND A THING THAT BREAKS WHEN YOU TOUCH IT MUST NOT ALSO BE A WALL.** The
coat stand has said so since it went in; the tavern's tables and chairs were
in the wall index anyway. `bwGhost` on a mesh means drawn and never walked
into, and `buildKeepWalls` skips it. The tables' tops come out of the packed
grid at build as well — because the storey repair reads a table top as a
ROOF over the flags and deletes THOSE, so when the table broke the cell it
stood in had no floor at all and the walk called it a wall. Measured across
the table at (-17, 3.15) after breaking it: nine cells of open flagstones
reading `null`. That is the whole of "I still run into their colliders after
breaking". Now the flags read 7.55 straight across, before and after, with
no wall either way, and the hall's own arena grew from 1,272 walkable cells
to 1,465.

**AND NOTHING YOU CAN WALK THROUGH MAY HAVE A CEILING.** Taking the tables
out of the wall index and out of the grid's floors was only two thirds of
it: the packer also wrote a table's UNDERSIDE as the ROOF over the flags it
stands on, and the walk ducks the camera under whatever roof a cell carries.
Measured across the table at (-0.37, 6.01) — floor 7.55 the whole way,
correctly, and roof **8.51**, which is 0.99 m over the flags. So walking at
a table put the eye at knee height and wedged you there, which is the whole
of "the tables made me crouch and get stuck". `clearTavGhostRoofs` runs
AFTER the storey repair, because the repair hands a rebuilt cell whatever
roof its neighbours have and half of those are under the table.

**AND THE BARREL PILE AND THE FLAT CRATES ARE OUT, FOR GOOD.** The owner's
word, on a pile of barrels lying in rows and a low chamfered crate: remove both
and any replicas of them in the tavern. There is one barrel pile in the file —
it had been lifted out and moved to the flags to clear the climb, and cloned
once more as the first rung of it — and three of the crate. All of them go,
TRIANGLES AND STOREYS BOTH, because a thing that is not drawn and is still in
the walk grid is an invisible wall: measured at all five spots afterwards, the
walk answers the flags. They are found by SHAPE, since this file has no names,
and the triangles are dropped out of the source index the way a table's are.
The climb to the gallery starts on the file's own stool again.

**LONGER ARMS, A TRUNK CARRIED HIGH, AND HE GETS UP ON HIS HIND LEGS.** The
owner's three, in one message: front arms longer with the upper back and
neck up, "more human-like but still crawling"; a few standing attacks where
he rears and swings; and taller while crawling. What each cost:

- **A BONE SCALED CARRIES ITS SUBTREE, and a clip that carries no scale track
  lets it stand.** `bones: { 'DEF-upper_armL/R': 1.28 }` on the kind — the
  mutants' own trick — and every clip he plays is a retarget or an authored
  quaternion set, so nothing stamps a 1.0 back over it.
- **THE POSTURE IS COMPOSED, NOT RE-AUTHORED.** Every clip he fights with is
  built on the crawl's first frame, so raising the trunk is one offset in
  one place: `kind.posture` (waist, chest reared; the arms turned back down
  by nearly the same so the hands stay planted on their longer reach) goes
  through the life layer on the same gate as the face lift — every clip but
  the kneel, and not a swing marked `stand`. The numbers were GRID-SEARCHED
  in the pane: six crawl frames, the lowest hand held to 0.05 m in the sand,
  the highest shoulder preferred — 108 combinations, and the answer was the
  most reared trunk with the arms brought most under it (waist -0.40, chest
  -0.50, arms 0.70; shoulders 1.47 m over hips at 1.0). At the first guess
  (-0.20 / -0.30 / 0.50) the hands were 0.25 m under the sand.
- **AND THE FACE LIFT CAME DOWN WITH IT.** 0.62 rad on a level trunk was a
  face on you; on a reared one it was a face on the sky. 0.25.
- **THE STAND IS THE CRAWL'S FRAME STOOD UP** (`CRAWL_STAND`): hips lifted
  0.55, trunk 1.25 rad back, the legs grid-searched so the feet land under
  the hips — the right to 0.01 m, the left no nearer than 0.19, because the
  crawl folds it about an axis these keys do not turn — the head brought back
  down. Crown at 3.03 m, hands at 3.8 thrown up. `zRear` rises INTO the tell
  (the rise is the wind-up, the hang at the top is what you read) and slams
  both arms down; `zStandSwipe` rises with one arm cocked high and takes it
  across at chest height — MEASURED, because the first version crossed at
  2.7 m, over your head, and the fix was the arm's absolute angle at the
  contact key (-0.35 -> +0.55: on a trunk reared 1.25 rad an arm at zero
  already points up). Both take two of your four and both are slow enough to
  step. `stand` on the table entry is what keeps the posture off them.
- **AND `right` HAS TO EXIST BEFORE IT IS USED.** The posture block was first
  pasted above the line that derives the body's right axis and took the page
  down with a TDZ error on the first frame the life layer ran. Read the
  function's own order before inserting into it.
Measured after, pinned at five and a half metres over a minute: **26 swings
and 45 damage a minute** (slower and heavier than the crawl-only fight — the
standing blows are long and two of them take two of your four), every swing in
the draw used, contact medians 0.35–0.98 m with the bite back to 0.89 from
1.82 once `flat` dropped the posture for it, zero yaw spikes. A frozen frame of
the rear: fully upright over the lens, both claws coming down, jaws open.

**AND THEN THE WHOLE GAME WAS PROFILED AGAIN, ROOM BY ROOM.** The owner's
word: a lot has been added, make it run smooth, only improve. The method is
the one this file already carries — put the camera at a station, let the
far-cull run, then hide each top-level scene child in turn and read
`renderer.info.render.calls` back — and the instrument that keeps it honest
is the PIXEL DIFF: render the frame twice, once with the cull and once with
everything it hid put back, and count the pixels that differ. Every cut
below measures **0.00 % of the frame**.

- **FIVE HUNDRED AND NINETY-ONE MESHES WERE DRAWN INSIDE A SEALED ROOM FORTY
  METRES UNDER THE SAND.** The hatch's home is hidden while you are not in
  it and has been since it went in — but everything it was FURNISHED with
  was added to the scene beside it rather than under it: the props, the
  bottles, the desk, the camera, the case, the Dealer. Measured standing on
  the beach at z = -180: twenty-six top-level groups, every one of them
  visible, a third of the frame's draw calls. `bunkerTenantry` is the hall's
  own hide inverted, and who lives in the room is a question about WHERE A
  THING IS — the room's own box, asked when you leave — so nothing has to be
  registered at the twenty places these are made. Measured: **-149 draw
  calls at z = -240, and a pixel diff of zero standing on the hatch looking
  straight down at it.**
- **AND THE BEACH WAS DRAWN FROM INSIDE IT.** The same rule the other way,
  which every room three thousand metres out has had since the saucer went
  in and the one forty metres down never got, because the hall's test is a
  DISTANCE and this room is close. Measured on the control room's floor:
  **272 draw calls and 287k triangles became 128 and 67k.**
- **A PACKED SCAN IS ALL NAMES, SO `bakeStatic` HAD NEVER LOOKED AT ONE.**
  `Object_413` is not somebody holding a mesh, it is the exporter counting.
  The catacombs are 747 meshes in a handful of materials: measured standing
  in the crypt, **257 draw calls of which the room was 243** — the most
  expensive thing in the game. Merged by material in world space (so the
  grime shader, the wall index and every floor probe see the same
  triangles): **27**. The walk is unchanged — flooded from the landing it
  reaches 16,881 cells and comes within 0.78 m of the barred door.
- **AND THE TAVERN HALL WAS TWO HUNDRED AND TWENTY OF THEM.** 221 meshes,
  nineteen materials, twenty thousand triangles — ninety triangles a draw.
  It is the DEFAULT bake, so the eighteen meshes the module holds by name
  and the sixty-three `bwGhost` tables and chairs are left exactly where
  they are, and it runs LAST, after the tables have been lifted out of the
  mesh, the chairs built, the crates copied and the door cut. **354 → 216**,
  and the hall still floods to its own walls.
- **AND A UNIT BIGGER THAN THE SKYLINE WAS EXEMPTED WHEN IT SHOULD HAVE BEEN
  SPLIT.** `cullBeyondFog` measures a unit's reach from its own ORIGIN, and
  for a catch-all group parked at (0, 0, 0) that is the distance to the far
  side of the beach: measured, a group of fifty-one meshes whose children run
  from z = -35 to z = -640 reported a reach of 652 and was therefore never
  culled, anywhere, for the whole walk. A group is not a landform because its
  contents are spread out — it is asked about its CHILDREN instead, and only
  a single drawn mesh genuinely bigger than `SKYLINE_R` keeps the exemption.
  Measured as an A/B in one page, the same frame with the cull and with
  everything it hid restored:

| z | with | without | saved |
|---|---|---|---|
| 0 | 83 | 102 | 19 |
| -180 | 264 | 321 | 57 |
| -240 | 269 | 404 | 135 |
| -420 | 148 | 359 | 211 |
| -700 | 98 | 393 | 295 |

  and 100–290k triangles with it. Thirteen stations, forward and backward,
  pixel diff **0.000–0.003 %**.

**AND WHAT WAS MEASURED AND LEFT ALONE IS WORTH WRITING DOWN TOO.** The
undercroft draws eleven calls from anywhere inside it and the sea keep
twenty-four: both were merged by their packer and there is nothing there to
win. The wreck is ninety meshes and twenty-four materials, and the biggest
mergeable run of twenty-two sits under a `noBake` group somebody set on
purpose — 93 draw calls is what the game's biggest set piece costs inside
the fog's own 170 m, and that is the design. And the walk is not CPU-bound
at all: `update()` is **0.41 ms** a frame and the render call 0.64–1.10 ms,
measured at four stations. What these cuts buy is the Windows frame, where
a draw call is a validated D3D11 call — which is the whole reason this file
counts draws and not triangles.

**THE BAKE THAT SAVED 230 DRAW CALLS TOOK EVERY WALL OUT OF TWO ROOMS, AND
THE PIXEL DIFF COULD NOT SEE IT.** `bakeStatic` takes every geometry to
non-indexed before it merges, and `buildKeepWalls` skipped any mesh with no
`index` — so the round that baked the catacombs and the tavern hall for
their draw calls left both with `S.walls.steep.length === 0`: `keepHitsWall`
never hit, `keepWallNear` answered null, the hunter's segment revert never
fired and his wall pushes pushed nothing, and the graph's 0.40 m clearance
threw nothing away. That is most of "make the creature clip through walls
less" — the walls were not there to clip. A triangle is three positions
whether or not an index names them; the index reads both now (92,777 faces
in the catacombs). **A pixel diff approves a picture; a walk approves a
room. Bake nothing without flooding the walk after it.**

**THE WAY OUT IS LIT THROUGH THE BARS.** The door has a barred window and
the glow, the lamp and the shaft all hung above the LINTEL. Where the
window is was measured by raycasting the leaf from inside on a 10 cm grid:
the gaps between the bars run 1.7–2.2 m over the sill and from a hand left
of the door's centre to half a metre right of it. A bright unlit plate a
hand BEHIND the leaf draws the bars black against the light (drawn only
where the leaf is not, which the depth buffer does for free), a glow sits
in the opening, the lamp just inside it, and the shaft is a trapezoid from
the opening down to a pool on the flags. **A gradient down a shaft alone
is a paper cut-out** — it needs to die across as well as down, and an
edge-on quad for the side view drew as a hard line down the middle.

**THE FOG CULL'S STAMP SURVIVED THE WARM, AND THAT PUT THE HALL'S CAST IN
THE MIDDLE OF THE ROOM.** "The ufo enemies are seen in the middle upon being
abducted" — the three guards and the beast, standing at their build spot at
the centre of the hall before any wave had been summoned. Traced with a
setter on `visible`: every one of them was switched on by `cullBeyondFog`,
whose restore branch reads `bwCulled` — "I hid this, so I may show it". The
stamp was put there by the WARM: `warmView` and `warmCompile` switch the
groups they are warming on, `warmAtZ` then runs `updateFarProps` for the
pass, and from the beach a creature parked three thousand metres away is
beyond the fog — so the cull hid it and stamped it, the warm restored
`visible = false`, and the stamp stayed. Arrive in the hall, the unit is in
range, the cull "restores" it. `snapCullStamp` / `restoreCullStamp` carry
`bwCulled` through both warms beside the visibility. **Anything a warm
toggles, it has to put back in FULL — the cull's own bookkeeping included.**
Measured after: the abduction lands with all nine hidden and no stamps; the
summon still reveals the three across the room.

**THE SLOPES SHOOK BECAUSE THE GRID IS TREADS.** "A slight lag and camera
shake walking up slanted corridors in the catacombs": the walk grid is a
plan of 0.2 m cells each carrying ONE floor height, so a slanted corridor is
a staircase of twenty-centimetre treads however smooth the stone drawn over
it, and the camera followed the treads — snapped up a riser every fifth of a
metre going up, dropped one under gravity coming down. Measured on a
hands-off walk from the landing to the door: 87 ticks with the camera moving
more than 4.5 cm in a tick and 19 over 9 cm, worst 24 cm. `catFloorSmooth`
blends the cell under the player toward its neighbours by where inside the
cell the player stands — a linear ramp through the cell centres — and only
toward a neighbour whose floor is within a step, so a real ledge stays a
ledge; the roof rides the same blend, or the duck under it stair-steps up a
ramp. It is the floor the CAMERA follows; every legality test still reads
the raw cell. After: 0 ticks over 9 cm, worst 8 cm, and the rate itself
changes by more than 3 cm on 8 ticks in 3000.

**A ROOF UNDER YOUR OWN FEET IS NOT A ROOF, AND IT WAS THROWING YOU OFF THE
CARPETS.** "When I walk on top of the curtains to jump across them, when I get
near the edge I lag off" is one line at the bottom of `update()`. Every
storeyed room ducks the camera under a low ceiling, and every one of them asks
for that ceiling at `groundY` — the floor you are STANDING on, or the one you
are FALLING TO. The frame the body leaves the catwalk, `groundY` stops being
the carpet and becomes the hall floor four and a half metres down, whose roof
is the carpet you were just standing on; the duck then reads that as a low
ceiling and slams the camera **2.08 m down through it in a single frame**
(measured: feet 4.446 → 2.37 between two ticks, with `vy` nowhere near it).
That is the "lag off" — and it also ate every jump ACROSS the 2.4 m gap,
because the duck fires in the air as well: traced, the arc was cut dead the
instant the body passed the carpet's end. A roof has to be over your head to
be one, so all four rooms now ask it of the FEET with a body's slack
(`duckOver`), never of the floor. Measured after: the gait clears the carpet's
end and the arc runs on over the gap.

**FIVE MORE OF THEM, PAST THE DOOR, AND NOT ONE NEW ASSET.** One mesh, one
skeleton, one download, and five silhouettes you can tell apart across a dark
beach: `bones` scales named bones on each parsed copy BEFORE it is measured,
so the game still stands each one on its feet at the right height. The hulk
(three metres, arms and chest a third again, a head three quarters the size),
the spindle (shins and forearms half again as long on a body that is barely
there), the runt (half your height, wider than it is tall, a head a third too
big), the crooked one (the left arm half again as long as the right, so the
side you circle to decides how far its swing reaches) and the bloated one
(a skull twice the size with every flap of it thrown wide). `solo` keeps them
out of the horde's take — that is a cutscene about three creatures nine
hundred metres up the beach — and `wakeAt` is what they get instead, because
nothing on this beach ever woke on its own. Measured: they wake a few at a
time as you come down the walk, and they swing at exactly the rate the
shipped pack does under the same harness.

**AND NOTICEABLE IS A DIFFERENT NUMBER UNDERGROUND.** The stock takeable
shine is tuned for a beach under a quarter moon and this stone reads at
0.03: twice the sprite, a stronger lift, and its own small cold lamp on the
flags, which costs nothing because since the Windows pass every point light
in this game is virtual and only the twelve nearest are ever in a shader.
**And no `through` ghost down there** — it is what finds a thing behind a
pier, and in a corridor there is nothing in front of it, so what it draws
against a wall a metre away is a soft grey RECTANGLE.

**AND THE THING THAT MAKES A PROP EXPENSIVE IS HOW MANY MESHES IT IS, NOT
HOW BIG IT IS.** Profiled the way this file always does it — put the camera
at a station, let the far-cull run, then hide each scene child in turn and
read the draw count back — and the three worst offenders on the walk were
all hand props built out of little boxes, every one of which is taken apart
by NOBODY:

- **A CRATE IS TWENTY-FIVE SLATS AND TWENTY-FIVE DRAW CALLS.** Sixteen
  boards, four lid planks, four battens and a strap, on a thing the size of
  a footstool — and `breakCrate` removes the GROUP and throws eighteen fresh
  splinters, so not one of those meshes is ever moved, hidden or thrown on
  its own. Merged by material it is two.
- **A MOUND IS SIXTEEN LUMPS.** Two domes and fourteen clods, and
  `revealMoundNear` removes the whole group. Three. Measured mid-walk, three
  mounds in view at once for forty-eight draws.
- **A BOTTLE OF WATER IS TWENTY-SIX MESHES.** Five. `bakeStatic` keeps
  anything NAMED, which is exactly the `water` mesh `setFill` drives and the
  hit proxy the crosshair reads, and the copy in your hand is its own
  `makeWaterBottle()` and is untouched.

The bake has to come BEFORE `addItemShine`, which lifts every material it
finds. Measured over ten stations from the spawn to the fence line: **draw
calls 192 on average and 303 at the worst became 143 and 250**, programs
116, `update()` 0.53 ms and the render call 1.19 ms at the wreck. Nothing
about any of the three changed on screen — the crate is still slatted, the
mound is still clods.

**THE RENDER TARGET'S ALPHA IS THE SILHOUETTE, AND IT IS EXACT.** The target
is cleared to alpha 0, so the pixels that came back with any alpha in them
ARE the object. `measure()` walks the buffer for the bbox, the second moments
and the elongation; the fit then corrects the scale and the offset from that.
It runs TWICE, because the lens is a perspective one — scaling about the
object's own origin and translating changes its foreshortening, so the
correction is a linear guess at a mildly non-linear thing and one pass leaves
a few per cent behind (worst 0.043 of the tile, and 0.006 after the second).
Measured over the fifteen named items: **worst miss 0.111 of the tile → 0.006
on both axes, and the fill 0.324-0.656 → 0.777-0.801.** The tile's own lift
and shadow follow the silhouette too — a pool of shadow at a fixed point is a
shadow the object is standing beside.

**AND `bw.lag()` IS A TOP-N LIST, NOT A LOG.** Half an hour went on "only
three of forty-three GLBs have parsed" — it keeps the WORST spans and nothing
else, so an absence from it means fast, not missing. And **`startCaveIn` in
dev mode sets `caveDone` on its first call whether or not the room is ready**,
so a harness that teleports into the band before `catReady` burns the trigger
and nothing ever puts you in the catacombs; call `placeInCatacombs()` yourself
once `catWalk` is up.

**AND A HEAP OF RUBBLE IS ONE DRAW CALL PER MATERIAL, NOT ONE PER LUMP.** The
front door's spill went in as thirty-five separate meshes and the apse's would
have been forty-eight more — eighty-three draws, in a room whose whole church
is a hundred and forty, for stones the size of a fist. They are all the same
icosahedron under the same material with a matrix each, which is what an
`InstancedMesh` is for. **83 meshes -> 3 draws.**

**AND THE PAVILION'S WARM WAS 1313 ms IN ONE FRAME.** `warmView` has taken a
`[k, n]` SLICE since the bunker's 2329 ms; the drain takes sixteen, the hall
six, the saucer four, the lighthouse's stair six — and the pavilion, which is
five hundred and eighty-three objects, took NONE. Six hundred meshes compiled,
decoded and uploaded on the single frame it was first drawn. Measured at boot
it was the worst block left in the whole load and three times the next thing.
Twelve slices a view. **1315 ms -> the pavilion is off the list entirely, and
the worst frame in the boot is 176 ms.** The undercroft's own six slices then
became the worst named block at 169 ms — *a slice is only as good as the frame
it leaves behind* — so it takes sixteen.

Measured over the walk after all of it, at five stations from the spawn to the
cave mouth: **draw calls 107-235, the render call 0.69-0.94 ms, `update()`
0.40-0.42 ms**, and the worst named block anywhere in the boot is `cave.glb`
at 209 ms, which is the undercroft module's own build — down from 465 ms,
because the exit is now a tenth of the model it was. The heaviest VIEW in the
game is the nave looking at the apse: 196 draws, 640k triangles, 1.69 ms.

**THE LAG LOADING FROM A CHECKPOINT WAS THE BOOT, WITH NOTHING OVER IT.** The
warm chain is about two seconds of compiling and uploading spread a step to a
frame, and on a normal start every bit of it happens behind the title card,
which is the whole argument for having one. A checkpoint load deliberately
skips that card — "a checkpoint does not ask" — so the same work lands on a
player who is standing on the beach looking at it. Measured at the pavilion:
a **681 ms frame two seconds in** (the lighthouse stair's first upload
slice), 196 ms of the undercroft's own build, and a dozen more over 50.

`bootHold` holds the black until the chain has drained: a load screen, at the
one moment a player expects one, rather than a hitch a second after they have
their hands. Measured after: everything over 130 ms is inside the hold and
the worst frame once the black lifts is 99 ms. Two things it needed:

- **THE DEADLINE IS THE WALL CLOCK, NOT ACCUMULATED FRAME TIME.** The chain
  drains a step a FRAME, so a tab that is not being drawn drains it at one
  step a second — and a cap counted in `dt` then waits eighty real seconds
  for its four. Measured in the pane: the black never lifted. A load screen's
  cap is four seconds of somebody's life.
- **AND IT IS CAPPED AT ALL BECAUSE A LATE DOWNLOAD REFILLS THE CHAIN.** The
  undercroft's warm arrives at thirteen seconds; the hold must never wait for
  one.

**AND A SLICE IS NOT A CURE FOR A COMPILE.** The stair's first slice is
499 ms and SIX NEW PROGRAMS — measured by counting `renderer.info.programs`
across each warm step — and slicing it four times finer changed that number
by nothing at all, because whichever slice first reaches a material pays for
it whole. `compileAsync` is meant to be the answer and it is fired and
forgotten, so the chain ran its first upload slice on the very next frame
while the driver was still linking; `warmHoldFor` now holds the chain on that
promise. Six programs at eighty-odd milliseconds each is what is left, and it
is behind a card either way. **Count the programs before slicing further: a
slice is only as good as the frame it leaves behind, and it can only ever
divide the UPLOADS.**

**THE FOG CULL NEVER RAN UNDER THE TITLE CARD, AND THE FIRST SECONDS OF EVERY
GAME COST TWO AND A HALF TIMES WHAT THEY SHOULD.** `cullBeyondFog` measures a
unit's reach with `setFromObject`, which walks every geometry in the subtree,
so it is budgeted to six a frame — and with about six hundred units that is a
hundred frames before the beach is culled at all. Worse, `updateFarProps` sits
deep inside `update`, PAST its own early return, so before `introDone` it
never ran once. Measured from the frame the game hands over: **683 draw calls,
settling to 271 only by frame 120.** And the budget is counted in FRAMES, so
the slower the machine the longer the wait — the game is heaviest exactly where
it is least able to afford it, which is exactly backwards.

The title card shows the LIVE beach, so `animateFrame` runs the cull behind it
now with a budget of 64, and the backlog drains in about a dozen frames long
before anybody presses a key. Measured after: **271 draw calls on frame zero**,
already settled. And a radius taken before a model landed is TOO SMALL, which
over-culls — so `cullReach` records the child count it measured at and
`cullBeyondFog` throws the measurement away if the subtree has grown since,
which also un-sticks a group that measured EMPTY and cached -1 meaning "never
cull this" for the rest of the game. Verified by restoring every culled object
at twelve stations and diffing the frame: **at most ONE pixel anywhere.**

Measured over the walk, before and after everything above: draw calls **151 →
140 on average and 298 → 266 at worst**, the render call **0.99 → 1.00 ms**,
`update()` 0.46 ms, and 0.07 % of pixels blown anywhere on the beach.

**THE PACK'S SWIM-IN HITCHED BECAUSE EVERY CRAB UPLOADED ITS OWN COPY OF THE
SAME FOUR TEXTURES.** A skinned mesh cannot be cloned, so each crab is its own
`GLTFLoader.parse` of `crab.glb`, and each parse makes its own Texture objects
from the same images — which the GPU took as four fresh uploads on the first
frame that crab was drawn. Measured on the take: 171, 139 and 139 ms render
frames, each exactly one crab surfacing (`renderer.info.memory.textures` +4,
no new programs). `dressCrab` keeps the first crab's maps per material name,
uploads them at once with `renderer.initTexture` (on the boot parse chain,
behind the title), and gives every later crab the same objects — the tint is
the material's colour, not its map. Worst render frame through the whole take
after: 2.2 ms. The way to find this class of hitch: hook `onBeforeRender` on
every mesh, render the take, and name whatever draws for the first time on
the slow frame.

**THE OPENING MUSIC IS A DECODED BUFFER**, fetched at module load and decoded when the audio starts (`musicBuffer`): the `<audio>` element underran while forty downloads and the warm chain fought it. **A checkpoint calms whatever is chasing you** (`calmChasers`, and `chaseGraceUntil`: 25 s after a save or a load nothing wakes on distance beyond 5 m). **A ragdoll's travel is capped** at `RAG_TRAVEL` (11 m) from where it died, and the tip-over nudge stops at 3.4 s (it used to push a propped body across the beach for fourteen). **The held glowstick is 4.6** and its casing dimmer; **the catacombs torches** breathe a few per cent and gutter once a minute or so, not every few seconds. **The view models' programs are compiled at boot** (`warmStep('view models')`): taking the glowstick compiled four on the frame it came into your hand. **A worn ring in the pack is a selection** (`packRingSel`): its details on the right, and Take off is a button there.

**NO TEXTURE WAITS FOR ITS FIRST DRAW.** The lag past Bradly was the dock
house coming into range — 72 textures uploaded on the one frame it was first
drawn (40 ms) — and the one before the tall man the same thing (59 ms). A
far-culled landmark is never drawn early, so `updateTexUpload` walks the scene
every 1.8 s for any texture not yet on the card and puts it there with
`renderer.initTexture`, three a frame, skipping anything already uploaded.
**And the rooms past the stones parse at BOOT** (`bootRoomsAsked`): the dojo
used to be asked for within 45 m of the portal and its build (79 ms) landed
mid-walk. Measured over the whole walk from the spawn to the portal, 1667
frames: 2 over 16.7 ms, both at cutscene triggers (was repeated 40–60 ms
spikes). Profile a walk with an ASYNC loop — a MessageChannel tick between
frames, so the parse chain can land — and time each `b.frame(1)`; a
synchronous loop never lets a download finish and finds nothing.

**SHE HAS NO NAME ON HER, THE SET IN HER IS A REAL SET, AND `bakeStatic` HAD
EATEN THE DOOR.** Four things the owner asked for on the wreck, and the one
that matters most is the one he did not ask for.

**THE TEXTURE UPLOADER HAS A MILLISECOND BUDGET, NOT A COUNT.** Three a frame
was three 2048 maps now and then: 5-14 ms a frame for half a second after
arriving in the tavern. One always goes; more only under 1.5 ms.

**BEGIN WAITS FOR THE BOOT.** It reads "Loading n%" until the download queue,
the parses and the warm steps are all empty for a second (or 30 s): a player
who presses it early used to walk into the last of the compiles. The total is
everything ever queued, not the biggest queue — a room's warm is only queued
once its parse lands, and against its own peak the bar went 99 % then 12 %.

**AND IT WAITS FOR THE FIRST STRETCH, NOT THE WHOLE GAME.** Waiting for
everything was 7.6 s on a warm local cache and most of the 282 MB on a real
connection. Only what is within `BOOT_NEAR` (100 m) of the spawn counts now
— 28 MB — and the rest downloads, parses and warms while you walk to it,
nearest first (`warmRunStep` picks the lowest reach). A job's reach is its
`ASSET_REACH`; a warm step's is `WARM_REACH` by the first word of its name,
because most rooms queue their warm OUTSIDE the parse callback, where the
parse's own reach (`bwCurReach`) cannot reach it — measured, the undercroft's
161 steps, the bunker's and the lighthouse stair's all counted as "near"
until they were named. Ready at about 6 s locally; what is left is the hall
and the saucer, which are the take behind the spawn and so are near.

**PERFORMANCE PASS.** Measured by instrumenting every call in `animateFrame`
and `update` in a throwaway copy of main.js (`prof.html` importing
`prof_main.js` with each `updateX(...)` wrapped in a timer), then GPU with
`EXT_disjoint_timer_query_webgl2` — take the MIN over twenty renders, because
the pane shares the GPU with the compositor and a median swings ±1 ms.
- the castle break was a 15 ms frame: it walked the scan's triangles into
  cells and built a fresh lump per cell on the hit. The cells are worked out
  once at load (`castleCells`) and the pieces are eight shared lumps
  (`castleLump`, `geometry.userData.shared` so a gib does not dispose them).
- every sleeping creature ticked its mixer every frame wherever it was —
  0.5 ms once the rooms had loaded. An unwoken one more than 250 m off is
  skipped (nothing wakes from past ~75 m and no room is 100 m across).
- `cullBeyondFog` read `getWorldPosition` (a parent-chain refresh) on 600
  units a frame; it reads last frame's `matrixWorld` now. 0.2 → 0.05 ms.
- THE CATACOMBS' STONE ASKED ALL 107 TORCHES PER PIXEL. `buildCatTorchGrid`
  cuts the room into 4 m cells once, each listing the torches whose reach
  touches it (a float texture, `texelFetch`); a pixel loops over its own
  cell's list — 4.5 on average, 39 at worst, cap 48 (`CAT_CELL_K`). Exact.
  A per-camera "nearest 24" was tried first and dropped: 47 torches
  typically qualify, so any cap there takes real light away.
Non-render CPU on the beach went from ~0.55 ms a frame to ~0.15, and a walk
from the spawn to -740 has no frame over 10 ms.

**"IT ALWAYS LAGS AROUND HERE" (THE CRATE BY BRADLY) WAS DRAW CALLS AND
SAFARI.** Measured in Chrome the spot was fine (CPU 3 ms, GPU 2 ms), so the
lag is what Safari pays that Chrome does not. Three things:
- **THE WRECK WAS 112 DRAWS FROM 115 M AWAY.** What the merge cannot take is
  everything somebody holds, and most of it is bolts, spokes and fittings under
  half a metre. `collectDetail` (run with the wreck merge) takes every UNNAMED
  mesh under 0.6 m and 400 triangles and `updateDetail` draws it only inside
  70 x its radius + 10 m of the camera. Measured at the crate: 279 → 135 draws.
- **A BROKEN CRATE WAS NINETY-THREE MESHES FOR FORTY-FIVE SECONDS.** A settled
  gib that cannot move again (not meat, not a bone, dry or in a room) is folded
  into THE RUBBLE (`sleepGib` / `updateRubble`): one merged mesh per material
  per 48 m patch, rebuilt at most four times a second, as a NEW mesh each time
  because the fog cull caches a unit's reach by the object. After a crate:
  285 → 151.
- **SAFARI DECODES AN IMAGE ON THE FRAME IT IS UPLOADED.** Its GLTFLoader path
  hands three an `HTMLImageElement` (no ImageBitmap), so every one of the four
  hundred textures `updateTexUpload` puts on the card was a main-thread JPEG
  decode, one a frame, for the first minute of the walk — which is exactly the
  stretch from the spawn to Bradly. It calls `img.decode()` first and uploads
  when that resolves.

**THE INTRO IS NEVER LAGGED BY THE BOOT (this reverses "BEGIN NO LONGER
WAITS").** Thirty seconds of song was meant to hide the boot, and instead
the boot showed through it: parses of 100-400 ms, the mound relics' warm,
the cave's build and four hundred texture uploads all landed on the first
seconds of the waves. So:
- **START GAME waits for ALL of it** (`updateStartGate`, `startLeft`): every
  download, parse, warm step and texture upload queued, idle for a second,
  capped at forty seconds. (SUPERSEDED: there is no "Loading n%" — the button
  is hidden until ready and a hairline shows the load; see the end of this file.) It read "Loading n%" (`.start.loading`) until
  then, and `beginGame` refuses a real start before it. Measured: ready at
  about 8 s after load.
- **and while the intro plays, anything left is HELD** (`introQuiet`, on from
  the press to `finish`): the parse chain waits in `bwTurn`, the warm chain
  and the texture uploads are skipped, and the world — which nothing can see
  behind the intro — is not drawn, which leaves the GPU to the video. What
  was held runs in the black at the end, which the reveal already waits on.
Measured through the whole intro and the reveal: worst frame 19.6 ms, no
dropped video frames, and every long block in the log is before the press.
A harness that starts the real intro has to wait for the button too.

**A FIRE IS NOT A SHAPE (the tribe's bonfire).** One teardrop sprite on five
sticks over a black disc is clip-art. `buildTribeFire` is now what a fire is
made of: flames that are NOISE (`fireSheetMaterial` — fbm scrolled up through a
body wide at the base and torn into tongues that break off, a temperature ramp
from dark red to a near-white heart, three sheets at different depths turning
about the vertical to face you), logs with bark (`makeBarkTexture`) that are
charred where the fire is and glow in thin VEINS (`emberWood`: ridged noise in
the fire's own frame, strongest low and inside), a bed of crusted coals (one
InstancedMesh), a soft ashy scorch (`makeScorchTexture`) instead of a disc, thin
smoke lit warm from under and leaning with `airGust`, and sparks that zig-zag
up. `FIRE_NOISE_GLSL` is shared. Noise inputs are taken RELATIVE to the fire
(`fd`), never world metres: `sin` of a number in the tens of thousands is noise
of a different kind on a GPU. It is built and its programs compiled behind the
boot warm chain (`warmStep('catacombs fire')`), so walking up to it compiles
nothing.

**THE LOAD WAS COUNTED TWICE, SO IT IS NOT COUNTED ON SCREEN.** "Loading n%"
was `1 - left / total` with `total` growing as the texture uploads and room
warms join the queue, so it ran to the nineties, fell back to forty and ran up
again. The START button is invisible (`.start.loading`, opacity 0) until the
game is ready, and `#bootbar` — one hairline along the foot of the black —
shows the load, eased and forward-only, and fades when it is done. And the
load itself is faster: before `introStarted` nobody is playing, so the warm
chain runs flat out (26 ms of steps a frame), the uploader takes 14 ms a frame
and rescans every 350 ms. Measured: ready at 6.3 s (was about 8), the bar never
moving backwards.

**A DISCARD ANYWHERE IN A SHADER IS PAID FOR EVERYWHERE IT DRAWS
(`splitDiscards`, models/undercroft.js).** Every material down there went
through `grime`, and `grime` carries three discards: the low clip, the high clip
and the apse's cut. A program that may discard loses the GPU's early rejection
(Apple's tile deferral, everyone's early-Z), so the rock, the skin behind it and
the water were all fully shaded. At the end of the build each mesh is split
once:
- triangles wholly past a clip are dropped (27,457 of them; they never drew);
- triangles that cross a clip line or the apse cut keep the discarding
  material;
- the rest go to a clone flagged `bwNoDisc`, whose program has no discard at
  all.

A material no clip can touch is simply flagged. The clone's `userData` is a
SHALLOW copy, so the fade vectors stay shared, and it is added to `S.mats` and
`S.exitMats`. `grime`'s `onBeforeCompile` reads `this`, not the closure's
`mat`, because a clone runs the same function. Measured, the exit view went
1.31 → 1.16 ms on this Mac. Rendered against the unsplit build, the four views
across both breaks match to under one level of brightness on average. **Do not
re-run `doorBlend` after it**: the skin sleeves are built after the last blend
and have never had a band, and a re-run lights the exit bore's skin at the
doorway's level.

**A CHECKPOINT IN A ROOM HOLDS THE BLACK UNTIL THE ROOM IS WARM.** The save at
the church's tunnel exit came back with the black lifting at the boot hold's
1.6 s cap. Three things then landed in front of the player, as frames of 80,
80 and 267 ms:
- the room's own first compile;
- the boot's big room warms (the drain, the pavilion, the bunker, the hall,
  the saucer, the church, the boss);
- the knight's first draw.

The fixes, in order:
- `startRoomWarm` renders the room from where you stand in six directions,
  one a frame, then puts its textures on the card. It renders rather than
  compiles, because `renderer.compileAsync(group, …)` builds programs for a
  state the real frame does not have.
- `updateBootHold` waits for that, and for `warmOwed()` (the chain and the big
  warms), to `BOOT_HOLD_WARM_MAX` (6.5 s). The chain runs flat out while the
  black is up (`animateFrame`'s 55 ms loop takes `bootHold > 0` as well as
  `!introStarted`).
- `dressMutant` now `compileAsync`s the skinned body itself, not just the
  severed-limb variant, so a creature dressed while you stand in its room does
  not compile on its first draw.

Measured: the black lifts at about 5.1 s instead of 3.9. Nothing after it goes
over 80 ms, and those frames are single background loads (a parse, the saucer
hall's warm step). On a warm page the climb-out itself never went over 24 ms.
It measured the same before and after, and the owner's lag was the church
behind him.

**`renderer.info.programs` IS THE ORDER THINGS COMPILED IN**, and the program
names are the material names. When a hitch compiles something, a hook on
`renderer.render` that logs `programs.slice(p0)` names the culprit in one line.

**THE OPTIMISATION PASS: WHAT THE GPU WAS DOING, AND A RESOLUTION THAT
FOLLOWS THE MACHINE.** Measured with `tools/perf.js` (GPU timer queries, the
JS self-profiler, frame-gap walks). On this Mac, warmed, the CPU is 1.2-1.4 ms
a frame on the beach and the GPU the rest — and the GPU is what a Windows
laptop's integrated graphics has five to ten times less of. Four things:

- **THE GROUND MIST WAS HALF THE SCENE.** `bwGroundMist` marched six steps of
  eight hashed noises each — about two hundred `sin` hashes on every fogged
  fragment, overdraw included: 3.36 ms of scene at z -600, 1.47 without it.
  It reads `fogNoise` now (`FOG_NOISE`, one 256² R8 field shared through
  `UniformsLib.fog`, `bwGN` = one fetch, smoothed the same way), and a step
  more than 2.4 m over the sand skips its noise. The keep's mist is untouched.
- **THE SKY AND THE CLOUD SHADOWS RAN FIFTY AND TWENTY-FOUR NOISES A PIXEL.**
  `SKY_CLOUDS` / `CLOUD_SHADE_GLSL` stay as they were (hashed); `_T` variants
  (`SK_NOISE_TEX`) read the same texture and are used by the four shaders with
  the most pixels — the sky, the sand (so the berm and the wreck's bed), the
  dune and the sea. A shader using `_T` must be handed `bwSkyTex`
  (`BW_NOISE_U`). **NOT `bwNoise`**: that is already a noise FUNCTION in the
  sand and sea shaders, and the first build failed to compile four programs on
  the redefinition — which ALSO made those surfaces cheap, so check
  `renderer.info.programs[i].diagnostics.runnable` before believing a speed-up.
  Result: scene GPU at z -600 3.36 → 1.2 ms, at z -200 1.71 → 0.77; the whole
  frame (view model and post included) ~2.4-2.5 → 1.45-1.76 ms at 1080p
  over four stations. The clouds keep their character.
- **DYNAMIC RESOLUTION (`drs`, `drsTick`, from `animate`).** Every 1.5 s of
  play the delivered frame intervals are read; if the 75th percentile is over
  `DRS_BUDGET` (19.5 ms) while our own CPU work is under 55 % of it — GPU-bound
  — the pixel ratio steps down ×0.9 toward `DRS_MIN` (0.38); three windows of
  a solid 60 step it up ×1.06, never above `RETRO_SCALE`, and never back to a
  level that just failed for 30 s. Not while loading, frozen, in a cut or in
  hitstop. Remembered in `localStorage['beachwalk.drs']`. The stars' point size
  reads `PIXEL_RATIO_U`, which follows it. **A slow display is not a slow GPU
  and a slow frame is not a slow display**: the first build learnt the refresh
  rate off the delivered intervals, so sustained slowness became "a 30 Hz
  screen" and it stepped back UP — the budget is a fixed sixty now.
- **HITCHES ON THE WALK, FOUND BY WALKING IT.**
  - the headland grass compiled on the frame it came into range (23 ms near
    the pavilion): `warmBeachAll` compiles every hidden beach group once, the
    moment the last model has parsed, behind the loading screen (36 ms);
  - `fitCatSandDoor` cast 77 rays at the whole cliff loft (66 ms at the
    stones): `raySlice(root, z0, z1)` copies the triangles in a z band into
    small proxies with the source's matrix, same answers;
  - the sea keep's 2048 maps were uploaded mid-walk past the wreck (8-22 ms
    each) because it downloads on the approach to the dock: once the game has
    begun, `updateTexUpload` leaves any hidden group thousands of metres off
    (or forty down) to its own warm, which runs under the sail's black.
  After: spawn to lighthouse with no frame over 20 ms once loaded, apart from
  the keep's 22 ms parse near the dock and the cut-covered cave-in.

What was measured and left alone: the 12-lamp point-light pool (removing it
entirely changed nothing, 1.05 vs 1.07 ms); the post passes (~0.4 ms); the
rooms (0.4-1.4 ms GPU, 48-85 draws); draw calls on the beach (100-280).
**`serve.py` sends `Document-Policy: js-profiling`** so `new Profiler()` works
in the dev page; it is what named every hitch above. And **never leave
`performance.now` stubbed** — a frozen clock makes every frame dt 0 and the
GPU read several times too high, which cost an hour here.

**AND THE DYNAMIC RESOLUTION NEEDS A WITNESS.** It stepped down on "long frame
intervals while our CPU work is small", which is also a parse between frames,
a GC, a compile or a browser pacing at 30 — and on this Mac the tavern is
1.5 ms of GPU and the keep 1.4, so any drop there was a false one, and it was
REMEMBERED. Now: where `EXT_disjoint_timer_query_webgl2` exists (desktop
Chrome and Edge, i.e. Windows) a timer is wrapped round every fourth frame and
it steps down only on the GPU's own time (`DRS_GPU_HI` 13.5 ms, and up under
`DRS_GPU_OK` 9); without it the old reading must hold three windows running
with no stall over 60 ms. Floor 0.5, and the old `beachwalk.drs` value is
deleted (`beachwalk.drs2` now).

**NOTHING COMPILES ON THE FRAME IT COMES INTO YOUR HAND (`updateHeldWarm`).**
A held copy is built lazily (`userData.build`) with materials of its own, so
the first scroll onto each weapon compiled and uploaded mid-frame — measured
10 ms (Military Shovel), 15 (Bloody Blade), 13 (peg), 29 (syringe). Anything
in the pack whose model has landed is built, `compileAsync`ed in the view-
model scene with only it showing, then rendered once into four pixels for the
uploads, one a pass, every 400 ms. After: 0 programs on every first equip. And
`toggleEquip` no longer rebuilds the SHUT pack on every notch of the wheel.

**A HIDDEN TOP-LEVEL GROUP IS NOT WALKED EVERY FRAME (`scene.updateMatrixWorld`,
right after `new THREE.Scene()`).** three recomputes the world matrix of every
object before each render, hidden or not, and 5,800 of the game's 7,000
objects are in rooms you are not in: 0.67 ms a frame against 0.08 for what is
visible. A hidden top-level child keeps only its OWN matrix (a `worldToLocal`
on a room, a `Box3.setFromObject` down from it and the fog cull all read it);
its subtree is brought up to date the frame it is shown, before it is drawn.
`updateMatrixWorld(true)` still does everything. The fog cull reads a
top-level unit's `position`, not its stale `matrixWorld`. **If anything ever
reads a descendant's `matrixWorld` inside a HIDDEN room, call
`updateMatrixWorld(true)` on that room first** — the file's old lesson that
"only a render writes `matrixWorld`" is now "only a render of something
visible does".

**THE KNIGHT'S "DEATH-BLOW LAG" WAS THE RING HE DROPS.** The octopus ring is
400,540 triangles. Its first draw cost 165 ms on the frame it came off him,
and then `updateHover` raycast every one of its triangles every frame you
looked at it: 33 ms a frame. `addInteractable` now drops any mesh over 20k
triangles from the list when a `hitProxy` is there to stand in for it, and
`warmRing` uploads the ring behind the black of the cut into the church (and
again at the idol, in case it had not downloaded yet). After: 3 ms and 2.5.


**PERF TOUR, 2026-10-02 (`tools/perftour.js`, one area per reload, 1920x1080,
GPU synced each frame, a full turn while timing).** Median / p95 / max ms:
beach 4.6/6.1/33, tavern 6.6/10/28, fort 8.2/10.5/17 (482 draws, the most),
C13 8.9/14.6/40, throne 6.1/9/27, dojo 5.9/7.6/13, whale 5.3/7.6/26,
catacombs 11.9/14.2/28, keep 5.1/7.1/26, undercroft 4.2/5.3/19, bunker
4.8/7/28. The farmer fight with gore: 13/19/37. `ROOM_BACK` and
`clearRoomFlags` are on `__bw` for it. Canvases that are read back
(`getImageData`) are made `willReadFrequently`.

**THE SHOT THAT KILLS FOUR (2026-10-09).** Profiled by exporting the inner
functions on a temporary `window.__sgProf`: one blast kill was ~25 ms, of
which `sfxMutSever` ×6 was ~14 (noise buffers, audio.md), `bakeLimb` ×7 ~7.6,
`sfxSgGore` 4. Gib meshes now share one unit `GIB_ICO` (scaled; flagged
`shared` so `updateGibs`/`sleepGib` never dispose it) instead of 40–60 new
geometries and GPU buffers a body. 4 kills: ~30 ms in `sgFire` once warm, the
render after it 16 ms; the very first blast kill of a session ~65 ms (JIT).

## 2026-10-13 — a checkpoint comes back only when the world is built

The owner: "the lag between loading checkpoints needs to be smoother. i
shouldnt be playing if it needs to load things … i keep seeing things
generate and lag before my eyes when loading back in".

- `updateBootHold` lifted the black at 1.6 s (6.5 s for the rooms' warms)
  whatever was still queued, and never asked about downloads, parses or the
  texture uploads at all. Now it holds until: `startLeft()` (the whole boot
  queue START waits for on a first load) and `roomRestore`, `restore`,
  `warmBlock` have been empty for 0.5 s; `warmOwed()` is false; `roomWarm`
  is done; then once, `updateFarProps()` and `startLookWarm()` (six looks
  round from where you stand drawn under the black, and every texture within
  260 m put on the card); then thirty frames in a row under 34 ms. Capped at
  `BOOT_HOLD_ALL_MAX` 30 s of wall clock (a warning names what was left).
- While it holds: a hairline progress bar on the black (forward-only),
  `canMove` is false, and `chaseGraceUntil` is pushed on so the creatures'
  grace starts when you can see. `BOOT_FADE` 0.6 (was 0.3): the world comes
  up out of the black.

## 2026-10-14 — nothing is built on the walk ("i see the light house island spawn in when walking to the first merchant and it lags")
- **The island was asked for at z -700** (`updateIsle`), 430 m off and on the skyline at the trader's stretch: its
  9.4 MB parsed (410 ms span) and built on a frame of the walk and it appeared in front of you. Now it, `loadKeep`,
  `loadTavern`, `loadDungeon`, `loadThrone` and `loadJettyHenry` (Henry's jetty copy and the eagle; hidden until he
  is out) are asked for in the `bootRoomsAsked` block with the dojo and the catacombs. `startLeft` counts the whole
  queue, so START — and a checkpoint's black — waits for them. The old distance triggers stay as fallbacks.
- **The castle's torches were an 85 ms frame at z -837**, found with the JS sampling profiler (below): the wall index
  is sliced a frame at a time as you approach, and the frame it completed `buildFortTorches` → `fortWallAlong`
  walked each torch's wall in 5 cm steps of `keepWallNear`. `loadFort` queues `warmStep('castle walls', …)`: the
  whole index, then the torches and the dressing, behind the loading screen.
- Measured after, frames driven by hand (the pane was hidden): START ready at 12.7–15 s with the queue empty; the walk
  spawn → z -1088 in 2 m steps, NO frame over 35 ms (it was 91 ms at -837 and once 152 at -320); the castle's
  courtyard and the island, a full turn each: none over 35 ms.
- **Profiling a one-off spike in the pane:** `new Profiler({ sampleInterval: 1, maxBufferSize: 400000 })` round the
  loop (serve.py sends the policy header), keep each slow frame's start and length, then count the trace's samples
  inside that window by every frame name up their stack — the top of the list (after `update`/`animateFrame`/
  `frame`) is the culprit. `__bw.bootLeft()` says what START is still waiting on (queue, parses, warm steps, uploads).

## THE HIDDEN-ROOM SKIP NEVER RAN (2026-10-15)

"reduce lag everywhere too without changing the game." Profiled (`new Profiler`, 400 frames, GPU synced): the biggest
CPU item everywhere was `updateMatrixWorld` — `scene.updateMatrixWorld` measured **1.57 ms a frame** over 11,300
objects, 9,100 of them under hidden top-level groups. The custom `scene.updateMatrixWorld` (by `const scene`) was meant
to skip those, but the scene's own `matrixAutoUpdate` recomposed its matrix every frame, which marks it changed, which
set `force`, which walked every hidden room anyway. `scene.matrixAutoUpdate = false` (the scene never moves): **0.06
ms**. Frame medians (`tools/perftour.js`, 1080p, synced): beach -150 7.0 → 4.5, -450 6.9 → 4.3, -850 (the tree) 10.0
→ 7.8, -1000 8.2 → 5.8; fort 8.6 → 7.0, c13 8.1 → 6.5, dungeon 6.0 → 2.8, tavern 5.8 → 3.1, keep 6.2 → 3.1.
CONSEQUENCE, now real: a hidden top-level group's DESCENDANTS keep last frame's matrixWorld until it is shown. Anything
that reads matrixWorld/localToWorld/worldToLocal/raycasts inside a hidden room must `updateMatrixWorld(true)` first
(the CLAUDE.md rule; `fortWallsStep` does). Left alone: the farmers' animation at 120 m and the tree's 770k
triangles (changing either changes the game); `siteMainStep` is a one-off budgeted flood-fill.
Audited the same day (every matrixWorld/raycast/localToWorld read that could hit a hidden room): nothing broken —
builders refresh first, readers are gated on the room or read a top-level group's own matrix (the skip keeps that
current). Fragile spots noted: `cullBeyondFog`/`cullReach` read nested units' matrixWorld (worst case one frame of
pop-in, or a too-big cached reach = less culling); the C13 jobs and `fortWallsStep` slice static meshes over frames;
the bunker's props raycast its hidden model — now an unconditional `g.updateMatrixWorld(true)` in its onLoad.

## Eleven files the game never loaded, out (2026-10-15)

"is there anything we can take out to make space but not change the game at all". Every git-tracked file under
assets/ was matched against main.js, index.html and models/ — by name, and by numbered stem built in code
(`cat-breath${i}`, `'snork-laugh' +`). Eleven matched nothing: dojo.glb 10.7 MB (the Scorched Dojo, replaced by
courtyard.glb on 2026-09-17), tex/grass.png + grass-tall.png + grass.json, fisherman.JPG (the game uses .png),
eyes.glb (it uses eyes.png), rust-diff.jpg, and the cut-out tools' source photos (snorkeler.jpg, snorkeler-head.png,
raw-billy-idle.png, raw-billy-talk.webp). Moved to `incoming/unused-2026-10-15/` (gitignored; `tools/snorkeler_body.py`
and `tools/billy_frames.py` read them from there now). 441.1 → 429.2 MB. Verified on a fresh load without them: the
beach at seven stations and all eleven rooms toured, 278 asset requests, no status ≥ 400, none of the eleven asked
for, no console errors.
Lossless squeezing inside the GLBs was measured and is not worth it: jpegtran-optimised JPEGs (pixels and markers
kept) 0.4 MB, duplicate images 0.5 MB, uint32 indices that fit uint16 0 MB, unreferenced accessors 0.03 MB, UV sets
no texture reads 0.4 MB. 194 MB of the 362 MB of GLB is geometry; the rest would need visible changes.
The README's dojo credit went with dojo.glb; courtyard.glb's source/licence is NOT recorded anywhere (README flags it).

## The rings and the skull key, smaller and the same (2026-10-15)

"shrink the rings and skull key without changing how they look". octopus-ring 12.0 → 7.6 MB, skull-key 8.5 → 6.0,
gem-ring 6.8 → 4.8 (−9.0 MB; the game 429.2 → 420.9). `tools/glbquant.py`: normals (and the skull key's uvs) as
normalized int16 across their own range (`extras.bwQ`), POSITIONS LEFT FLOAT, the gem ring's two 2048² PNG colour maps
as lossless WebP (`EXT_texture_webp`, `exact`, verified pixel for pixel in the tool), then the whole file gzipped.
In the game: `bwFetch` → `bwGunzip` (sniffs 1f 8b, the browser's `DecompressionStream`), `bwGlb` → `bwDequant` (back to
Float32 before any onLoad, so bounds / `ringCavity` / the gold's model-space noise read floats as before). The model
viewer does the same. A plain .glb passes through both untouched.
Proof: the three rendered with the game's own materials (envMap, worn gold) from four angles in a fixed light, before
and after, pixel-compared: gem ring identical; octopus ring 298 of 589,824 pixels differ, by 1/255; skull key 1,730,
by 1/255. (Quantizing POSITION as well saved 1.9 MB more and tipped ~100 glints a view on the octopus ring, up to
218/255 — `ringCavity` divides neighbour differences by the edge length and multiplies by nine. Not shipped.)
Originals: incoming/originals-2026-10-15/.

## The intro video: only its unseen tail could go (2026-10-15)

"make it smaller with no quality loss". `assets/intro-waves.mp4` is 1080p H.264 High, 31 s, 11.6 Mbit/s, no audio,
shown full screen (`object-fit: cover`, scale 1.09). Re-encoding cannot be lossless: x264 veryslow at CRF 17/19/21
came out 98/83/71 MB (BIGGER — the waves are all fine detail), and two-pass at 9/7.5/6 Mbit/s scored VMAF 83/75/67
against it (33/28/22 MB) — the water's sparkle is what goes. What CAN go is what is never shown: the intro starts the
video with the song, fades it out from song 22.3 s over 7 s (`INTRO_CUE.wavesOut`), black by ~29.3 s. Cut at the
keyframe at 30.067 s by stream copy (`-c copy -frames:v 902 -movflags +faststart`): every one of the 902 kept frames
is bit-identical (framemd5 of both files compared), 42.8 → 41.6 MB, and the index is at the front now. Keyframes near
the end: 28.10, 29.07, 30.07 — 29.07 would have been inside the last breath of the fade. Original in
incoming/originals-2026-10-15/.
**And then shorter (same day): THE VIDEO WAS ALREADY A LOOP.** "is there a way to shorten the video file but loop it
sooner…". Frames 258 apart (8.60 s) differ by 2.4 grey levels on average (max 2.9 — compression noise), against ~10
between neighbouring frames, and a period one frame either way jumps to 9–13: the 31 s file is one 8.6 s clip of waves
repeated three and a half times. So the file is now ONE cycle, stream-copied from the keyframe at 8.23 s: frames
247–504, every one bit-identical to the original's (framemd5), 12.4 MB (from 41.6). It loops with the element's own
`loop` (it already had it); the seam 504 → 247 is a change of 9.9, smaller than the natural step there (10.6). New: the
browser now actually LOOPS it, three times in the visible 29 s — a browser that hitches a frame at a loop would show it.
(Playback could not be timed in the pane: the app window was not drawing video. If a hitch shows, two cycles — 17.2 s,
~25 MB — loop once.)

## The lag before the whale: Castle XIII loading in, and the well (2026-10-15)

"there is a lag right before the whale … as the castle loads in. optimize what we have so far but do not change
anything about the game." Measured on the real clock (`tools/perf.js` `__probe`, a fresh tab): frames of 92, 59, 86,
53, 41 and 48 ms from z −900 on, all Castle XIII getting ready while you walk past it. Every fix below moves WHEN work
happens, never what it makes:
 - **One background allowance a frame** (`BG_MS` 5, `bgLeft`/`bgRun`/`bgHas`): the first castle's and Castle XIII's
   walls and flood fills, XIII's dressing and its showing, and the isle's walls each had their own budget and from
   −900 all ran at once. Out on the walk they share 5 ms; standing in the place, its own budget as before. A step that
   cannot stop part way (a dressing job's slice) waits for a frame with ≥ 1 ms left (`bgHas`).
 - **`repairKeepStoreys(S, budget)` is resumable** (`S._rk`, an iterator over its cells); `fortWallsStep` and the
   isle's loops keep calling while `S._rk` is set.
 - **The dressing is built hidden and shown warm** (`c13ShowDressing`): `renderer.compile` a few objects a frame,
   then `compileAsync`, then `initTexture` one a frame, then visible. Its canvas textures are painted a step each
   (banners, the flag, the crest and runner memoized as `C13_SHIELD_T`/`C13_RUNNER_T`, `c13MarketMatsSteps`), and the
   cloths' wear is a job of its own (`c13ClothWear`, yielding every 8 rows past 2 ms).
 - **The flail knight (crusader.glb)** is parsed at boot behind the loading screen (`mutPreParse`, its maps uploaded
   there), his `kind.pre` runs on its own turn, his fourteen clips are authored one a turn (`u.clipsPending`; the
   mixer, natural swings and start pose wait for the last), and he is only made visible once his textures are up and
   `compileAsync` has answered. Spans: dress 227 → < 16 ms.
 - **The dressing's generator slices** (found by tagging every `yield` with its line number in a throwaway copy and
   logging each `next()`): `c13Features` 7.6 ms (now `c13FeaturesSteps`, published only when whole), the torches'
   bake 8.7 (`bakeStaticSteps`: `bakeStatic` is that generator run without a yield, the subtree touched only at the
   end in the same order; its scratch matrices are locals now because two paused bakes must not share them), the
   windows' vertex walk and clustering 4.4 + 9.8, the flower boxes 16.2 (four windows a slice, each scanning every
   frame vertex twice), the chimneys 5.5 — all now yield after ~2 ms.
   PROOF THE DRESSING IS THE SAME: a fingerprint of every mesh under it (vertex count, weighted position sum,
   instance matrices, material) old build vs new: 46 of 50 identical; the four that differ are the fountain's drops
   (they move) and the lanterns (a `Math.random()` phase each).
 - **The well (z −318, a 20 ms update in `updateWell`)**: `wellA()` drew the reverb's 4.6 s stereo tail in JS
   (8–12 ms) and set it on a ConvolverNode, which readies it synchronously (7–10 ms), on the frame the drone first
   sounded; the drone's own 8 s of noise is 2–3 ms more. Now `wellPrepStep` draws the same tail (`wellIRSteps`, a
   yield every 16k samples) out of the background allowance as soon as there is an audio context, and makes the node
   on a frame of its own; `wellA` asked first still does it all at once.
Result, the walk −30 → −1150 (the cave-in skipped): the worst update near the castle 8–12 ms, against 28–51 before.
The castle's own walls are still 4–5 ms a frame for ~30 frames (budgeted, by design).

- **`tools/gltfpack.py --decimate-each` on a skinned file (2026-10-16):** it dropped the inverse-bind-matrix and
  animation accessors (the puppet's bones collapsed). Fixed (`carry(ai)`), and `--decimate-for REGEX=N` gives a
  per-mesh triangle budget (the face 5000, fingers 160…). Blender's own export of the puppet also collapsed its
  bones — pack the original gltf instead.

**THE START GATE HUNG ON `img.decode()` (2026-10-14).** In the preview pane
six images' `decode()` never settled, so `texUp.wait` never drained and Start
always waited out its 40 s cap. Each decode now has a 1.5 s timeout behind it
(`updateTexUpload`); the gate opened at 32.8 s with nothing left. And a
zero-size pane (`camera.aspect` null) fakes everything: NaN rays made
`updateHover` cost 19 ms and renders read as 1-2 s stalls — resize the pane
and check `aspect` before measuring anything. With a real viewport the walk
measured avg 8.3 ms, p95 9.5, p99 11.4.

**THE START-OF-WALK HITCHES WERE FIRST DRAWS, NOT FIRST COMPILES
(2026-10-14).** Measured from the spawn after the intro, 1280x760, a copy of
main.js with every call in `update`/`animateFrame` timed and every GL call
wrapped (scratch only, never the repo): 73 ms on frame 0, 112 on frame 3,
116 at z -5, 193 at z -26, 219 at z -45. Every render hitch was ONE call,
`getProgramInfoLog`, 37 to 170 ms — three's `onFirstUse` of a program that
`compileAsync` had built and nothing had ever drawn with (the driver finishes
it there, and the first draw builds its pipeline). `notReady` was 0 each
time: "compiled" and "ready to draw" are not the same thing on this driver.
- z -5 was the GULLS, drawn the moment the wreck is inside `GULL.FAR`; z -45
  the well (bucket, rope, wheel, roof), the moment it came into range. The
  texture pre-uploader (`texUp`) does not cover meshes or programs.
- `warmBeachAll` only ever saw TOP-LEVEL hidden groups; a landmark the fog
  cull had switched off inside a visible group was never compiled at all.
  Now `warmBeachDrawCompile` + `warmBeachDraw` (`BEACH_DRAW_SLICES` = 8)
  switch on every subtree of everything on the beach that is not a room
  (`beachShown`, culling off), compile it off-thread, then DRAW it into the
  four-pixel scissor a slice at a time. A light that was hidden under a
  hidden group is held OFF while its group is shown (a light entering the
  scene recompiles every material). ~1.5 s, behind START GAME, after the
  last parse — so Start opens ~1.5 s later (35-36 s measured).
- Frames 0 and 3 were `updateHeldWarm`, which only started at `introDone` and
  only for what was in the pack: the starting syringe was built on frame 0
  (+18 MB) and drawn on frame 3. It now runs from the title on, Start waits
  for it (`heldWarmLeft`), and it takes every view model on `toolMount`; one
  not carried is built for the warm and keeps its builder, so equipping it
  later still takes a fresh copy (`vm.userData.item` lets it check the model
  has landed).
- The gulls also have their own draw warm ('gulls draw', after 'gulls').
After, clean build: intro no frame over 40 ms; spawn to z -84 avg 8.8 ms,
p95 9.9, p99 13.3, max 26.

**THE PLAYTHROUGH'S OWN FINDINGS (2026-10-14), each measured in the pane.**
- `updateLightning` took 60 ms on the frame a thunderclap arrived: five to
  nine seconds of rumble written sample by sample at the context's rate.
  Now `thunderData` is made in the warm chain at `RUMBLE_SR` (11025 — it is
  all under 260 Hz) with the 48 kHz integrator's corner and spread matched
  (`RUMBLE_P`, `RUMBLE_STEP`), four distances, the nearest picked and pitched
  ±8 %. The crab pack's surge (`sfxPackSurge`) the same way.
- "Restart game" (and a death with no checkpoint) reloads with `skipIntro`,
  and `beginGame` let `skipIntro` past the loading gate: Start took you onto
  the beach with the whole boot still to run, 600-800 ms frames in the first
  minute. Only `instantStart` (a checkpoint load, whose black hold pays for
  what is left) skips the gate now.
- `heldWarmList` taking every view model was right behind the loading screen
  and wrong in play: a model landing after Start was built and drawn on the
  walk every 400 ms (120-490 ms frames, measured climbing her ladder). In
  play it is what you carry, as it was. A view model with nothing in it is
  marked warmed, or `heldWarmLeft` would hold Start to its cap.
- The beach draw waited for the LAST parse and, on a slow load, ran into the
  40 s cap; it is two passes now (`beachDrawn`): at 25 s or all-parsed, then
  whatever landed after.
- Still open: the walk allocates 35-55 MB/s of short-lived garbage (minor
  GCs every ~18 frames). The per-call `usedJSHeapSize` deltas are too coarse
  to attribute it (they land on whichever call is running when the counter
  ticks — `vcSync`, which allocates nothing, "allocated" 4 MB/s); it needs a
  real allocation profile, not this pane.

**THE LOAD, REBUILT AROUND THE INTRO (2026-10-15).** The owner: "long time
to load and freezing at start of game when loading world". Measured by
driving the real boot -> Start -> intro -> play at 60 fps and logging every
wall-clock gap over 100 ms (scratch `__bootm.js`, labelled from `__bw.lag()`
and the timed copy): Start at 33-38 s, the title frozen 13-17 s of it (65-105
freezes, worst 0.9 s), the intro HOLDING all loading for 30 s, a 285-554 ms
freeze as the walk began. Three causes, three changes:
- **The creatures and crabs blocked the parse chain.** They joined the ONE
  chain when built and waited in it for their own downloads, which go out
  nearest-first — so the castle's farmers, the whale's demons and every
  mutant held it, and the opening's models queued behind them. Now a parse
  joins only when its download has landed (`bwParseLater`), on one of two
  chains: the first `BOOT_NEAR` metres', and the rest, which waits for the
  opening to be in (`bwNearClear`). Far warm steps and the rooms' whole warms
  wait for it too (`warmRunStep`, `bwNearPending`). The beach draw, the
  gulls, the thunder and the pack surge have `WARM_REACH` past the opening.
- **Start waited for the whole game.** Now `startGateLeft` is the opening
  (`bootLeft`) — a restart with no intro still waits for everything — and
  the parse chain, warm chain, uploads and held-item warms keep running UNDER
  the intro (nothing of the world is drawn there; the song is on the audio
  thread, the waves a video on the compositor), held only in a quiet window
  from 2.2 s before to 0.3 s after each cue (`introHoldNow`: the drop, the
  name going, the waves going) — a far model's parse runs to 2.2 s (a castle
  farmer), so a narrower window let one start just before a cue. The intro's last black waits for everything
  (`loadOwed`, capped at `REVEAL_WAIT_MAX` 20 s). Measured: the title lands
  7.43 s after the waves come up (7.39 wanted), the name goes at 19.65 (19.6).
- **`dressCrab` uploaded its maps with `initTexture`** on an undecoded image:
  420-484 ms on the title. The uploader decodes off the thread; now 91 ms.
After: Start at 13.3-13.6 s from the page (8.2 s after the world is built),
the title frozen 4.2 s of that (28 freezes, worst 334 ms — the crab model
parsed once per copy, ~330 ms each, because SkeletonUtils is not vendored),
the intro ends on time with everything loaded, and the first 10 s of the walk
has no frame over 100 ms. The module itself still takes ~5 s to build the
world before anything can run (`BUILDING THIS WORLD`), which is the next thing.

**THE GULL FIGHT, RE-MEASURED (2026-10-15).** GPU by timer query over a
2,040-frame deck fight at 634×476: median 12.7 ms, p95 17, none over 25.
CPU frame (update + render submit) avg 8-11 ms. No live gull was inside
solid geometry on any frame (`gullSolidAt` checked after every frame). The
remaining long frames were all inside `renderer.render` with nothing
compiled or uploaded, and in a hidden pane — see harness.md before chasing
them. The live JS heap is about 1 GB, which makes any major GC long; the
game allocates 60-100 KB a frame (most of it in render), not the 35-55 MB/s
the spin-yield harness suggested.
- **OPEN LEAD, the first stun.** First-draw hooks on every world and view-model
  mesh (re-hooked each frame for meshes made mid-fight) through a first deck
  fight: the 277 ms frame at the FIRST STUN was the frame four unnamed
  `MeshBasicMaterial` meshes were drawn for the first time — almost
  certainly `gullFeathers`' burst, which neither 'gulls' nor 'gulls draw'
  warms (they draw only the birds and their shadows). Next step: show a
  feather burst in the 'gulls draw' warm, rerun a first fight, and confirm the
  stun frame goes. The other first-fight spikes had no first draw on them.

**FIGHTS RE-MEASURED AFTER THE DRAIN AND WRECK PASS (2026-10-16).** A walk
from the start to the wreck: 1,558 frames, avg 9.7 ms, p95 11.8, the only
long frames the intro's background warm (and one 265 ms frame at z -63 that a
profiled rerun did not reproduce). A whole deck fight with the peg, walked up
to (three gulls killed), under the JS self-profiler: no frame over 45 ms;
frames avg 9-11 ms. **A teleport into the hold and back up onto the deck
gave a 1.4 s frame on the first frame of a fight** — a harness artefact; a
player never arrives that way. The first-stun lead above did not show.

## A checkpoint load, measured (2026-10-18, "the load times are too long")
Silent iframe (tools/silentframe.js), beach checkpoint, focused pane: the card's Restart lit at 12.7-13.3 s — 2.3 s
building the world, ~8 s of parses (one per turn), ~2 s of texture uploads. `bwLag`: 7.98 s blocked, of which "frame"
4.95 s — 67 frames of 40-500 ms drawing the whole world under an opaque black; `rocks.glb`'s onLoad 1.05 s; `warm
mound relics` 0.30. Tried: three parse chains side by side under the black — no change (13.3/12.9 s): the parses are
CPU, not waiting. Kept: under a checkpoint's black the world is drawn one frame in eight (the title cover's rule)
until `startLookWarm` begins, and never while the save is being put back (that reads matrices only a render writes);
`updateTexUpload` gets the cover's 34 ms budget there (the full draws were uploading textures by the way). NOT
measured after: the pane was throttled to 1-3 rAF a second (unfocused/occluded) for the rest of the session — re-time
it with the pane in front. Next levers: `rocks.glb`'s 1 s onLoad; the far rooms' warms owed on every load.

## A checkpoint load, 13.3 s → 6.9 s (2026-10-18, the owner: "I NEED THE LOADING SCREEN TIMES AS FAST AS POSSIBLE")
**Measure it with `sh tools/loadtime.sh [runs]`**: a headless Chrome of its own (its own profile and save, Metal GPU,
"ANGLE Metal Renderer: Apple M4 Pro") against a throwaway server on 4211 — never the owner's pane. It starts the game,
saves on the beach, reloads into it the way a death does (card up, Restart clicked at once) and prints `[LT]` lines.
- Before: playable at 13.3 s (module 2.4 s; near part in at ~6 s; everything at ~11.6; then the tails).
- **The hold waits for the near part only on a checkpoint load** (`fastLoad` = `instantStart && BW_FROM`): `bootLeft()`
  (reach from the SAVE), the restore, `roomWarm`, `warmBlock`, the look warm; 150 ms idle (was 500) and 12 settled frames
  (was 30). → 6.8-7.0 s.
- **The far rest is paced from the moment the near part is in** (`bgLoadMode`, `bgLoadOk`, `bwBgGate` on the far parse
  chain and the warm driver): one step at least 150 ms after the last, none while anything awake is within 30 m.
  Started only at the reveal it ran flat out under the black and the settled frames never came. Measured after the
  reveal: all of it in 44.8 s, 65 spans over 16 ms, the worst 54 ms.
- Two starvation bugs on the way: the warm driver stamped `bgLoadLast` every frame a held compile said "alive"
  (`warmRan` now says when a step really ran), and `warmBunker` — asked every frame until the bunker's model is in —
  stamped it too, holding the gate shut on the very parse it waited for. Stamp only what happened.
- Tried and dropped: three parse chains side by side (no change: the parses are CPU), drawing 1 in 8 under the black
  (kept, but the frames are mostly the warms' own 4x4 scene draws, not the world's).
- A first load is unchanged: START and the intro's black wait for everything.

## The load, profiled (2026-10-18, the owner: "FULLY OPTIMIZE ... DO NOT CHANGE ANYTHING ABOUT THE GAME ... THINK OF WORSE
SYSTEMS ... AND WINDOWS")
**How**: a CPU profile of a whole headless run — Chrome's own startup trace, JSON:
`--trace-startup=disabled-by-default-v8.cpu_profiler,v8.execute --trace-startup-format=json --trace-startup-duration=40
--trace-startup-file=…` on `tools/loadtime.html`, then the ProfileChunk samples summed, each charged to the nearest
game function up its stack (the scratch `agg2.py`; ~25 lines). It names what no span can: the cost inside three.
Found and fixed, each measured equal before/after where it computes anything:
- **The warm chain SPUN.** Under a black, `animateFrame` ran warm steps flat out for 55 ms a frame — and a step held on
  its async compile (`warmBlock`) answers "alive" without running anything, so the loop spun on it: 1.35 s of
  `warmRunStep` self time + 0.33 s of `performance.now`. The loop stops while `warmBlock` is set.
- **`fillRockGaps` cast ~5,500 rays at every load**, each testing every triangle of its rock (1.0 s). `vRayTop` asks a
  per-mesh grid of upward faces (0.5 m cells): the same highest FrontSide hit within the same reach. Checked point by
  point against the Raycaster (probes `rockRays`): 0 mismatches of 5,471, |dy| ≤ 1e-12; 117 fills, as before.
- **The pavilion's clutter placement** did a full ray test of every room mesh per rim point per try (0.3 s): `onFloor`
  uses `vRayTop` too (probes `mushRays`: 0 mismatches of 3,000).
- **`normalFrom`** (mushroom-house.js): wrap indices per row/column and `Math.sqrt` for `Math.hypot` — 0.37 → ~0.2 s.
- **`renderer.debug.checkShaderErrors = false`**: three's first-use status/info-log reads are a sync wait per program
  (0.53 s here; ANGLE on Windows pays far more) and only ever logged.
Measured (loadtime.sh): Start ready on a first load 16.4 → 11.1 s; module 2.4 → 1.8 s; a checkpoint 6.9 → 5.3 s.
What is left is mostly the uploads themselves (`texSubImage2D` ~1.7 s per load) — the textures, which are the game.
Frame times (probes `tour`, 1080p synced, this Mac): 3.4–7.9 ms medians everywhere; the busiest draw lists are the
tavern (~470: its breakable furniture, kept apart on purpose — the bake notes above) and the fort (~450).
