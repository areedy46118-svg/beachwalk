# The sea keep

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**A DEAD MAN'S JOINTS STILL ONLY GO WHERE JOINTS GO.** The bend limits
let a knee close to a third of its reach and an elbow to less, and nothing
at all stopped the thighs folding up onto the chest — so a corpse arrived
on the floor as a parcel, the owner's "they fold up too much, it looks
fake". `RAG_BEND` holds the knee at about ninety degrees (0.72 of the
chain), the elbow a little past (0.62), the neck barely (0.86), and two new
chains keep the TRUNK off the shins (`Spine2–Hips–Leg`, 0.66) and the
forearm off the chest (`Spine2–Arm–ForeArm`, 0.50). Self-collision runs at
0.92 of the summed radii. And it LANDS: a quarter of the fall coming back
up as bounce and half the slide surviving every contact read as something
light — `RAG_BOUNCE` 0.10, `RAG_FRICTION` 0.74, `RAG_G` 17.5, and less lift
in the kick, so it goes over and down rather than up first. Measured at
rest: knees 92–153°, elbows 147–159°, hips 83–107°, asleep in under four
seconds, thrown 4.5 m.

**HE DIGS IN AT HALF HEALTH, AND THE MASK STAYS ON.** A boss with one move
set is solved once. Halfway through his health he stops, roars through the
mask and comes back harder — `aggr` 2.85, more feints, longer chains — so
the fight you have learned turns out to have been the first half of it. It is
an OPENING, not a cutscene: he is stopped and his guard is down for a second
and a half and you keep your hands the whole time, which makes it the prize
for getting him to half rather than the game stopping the fight to show you
something. His STARTUPS are untouched: the tells are what keep him fair and
this file has already paid once for making them readable.

**THE FISHERMAN'S BOAT SAILS, AND WHERE IT GOES IS JESSEL'S SEA KEEP.**
Stand on the boat tied up at the sea end of his pier and the crosshair says
`E Set Sail`; the screen goes black to a mooring line creaking and the water
taking her, and you are standing at the end of a long timber pier under
"Fantasy Sea Keep" (CC-BY-4.0, `assets/keep.glb`), with the same boat moored
alongside — look at it from the pier and E brings you home. The owner's
word was a PERFECT REPLICA, so `tools/undercroft_pack.py keep` is the first
EXACT kind: nothing decimated, the NORMALS carried through the bake (a
smooth stylised build under a normal map is not a scan, and flat-shading it
is a different object), a reflection in the node chain caught by the
determinant and the winding flipped back, every material extension left in
the file for three to honour, and the one liberty the 4096 normal maps
resized to 2048. 168,477 triangles in seven draws; 15.6 MB, of which 2.3 is
the walk. It stands eight kilometres off like the dojo (`KEEP_X/Y/Z`), the
beach's sand and sea and sky stay put while you are there (the undercroft's
arrangement), and the night's five lights, the fog and the sky dome are
SWAPPED for a sunset at the cut and back at the return — colour and
intensity are free; a light entering or leaving is not.

- **THE PINK SKY WAS NEVER IN THE FILE.** The sphere ships as transmissive
  clearcoat glass with a strip of blue clouds in its emissive map, and what
  Sketchfab shows THROUGH it is its own HDR environment. Painted here on the
  sphere's own geometry, by height over the sea (pink at the waterline,
  violet overhead, teal under the line) with the file's cloud strip laid over
  as luminance; its normals point INWARD, so it is FrontSide from where you
  stand. The sea is the one material rewritten — a transmission plane whose
  whole look is what a refracting renderer puts through it — as translucent
  turquoise over the file's own caustic seabed; the seabed shipped with a
  violet emissive at strength ten, which was the one thing in the file that
  could not have been meant. Every material ships as BLEND (the bunker's
  lamp housings again): opaque with a cutout for the rock and the timber.
- **THE WALK IS STOREYED.** A keep has a ground floor, a hall over it and a
  roof walk over that, and its pier stands over open water — one floor per
  cell cannot say any of it. Every cell carries EVERY floor it has, as
  `[floor, solid, roof]` triples, and `keepStandAt` answers the floor
  nearest under your feet: no more than a step above (0.62, the cave's own),
  no more than a drop below (1.3). A cell with no floor at your level is a
  wall or the pier's edge — the move keeps whichever axis is clear or
  reverts — so nothing here can drop you into the sea. The island has an
  UNDERSIDE, so `--floor-min` throws away every sample under the sea before
  a floor is chosen; and a stair that turns back under itself has the flight
  above for a roof, so the roof rides in the triple and the camera ducks
  under it the way the tunnel's does.
- **THE MODEL'S WAY UP IS STAIRS AND LADDERS, AND A LADDER IS A VERB.**
  Measured at the east stair: the lower flight ends at 2.0 m, the landing
  above is at 4.4, and between them the only geometry is a face at eighty
  degrees. The tower's levels are joined the same way, by two, four and five
  and a half metres at a time — a minimax over the grid put the cheapest
  route to the plateau at a 5.98 m rise, so no step allowance and no jump
  reaches it. Face a free storey within `KEEP_CLIMB` above you (or a drop
  beyond `KEEP_DROP`) and the crosshair says `E Climb`; the camera rides the
  height at a climber's pace with a rung underfoot every half second and
  goes over onto the ledge last. It is offered at the rock's ledges too,
  because the island is a thing you climb about on as much as walk.
- **AND THE BODY IS THE BUNKER'S.** At the beach's 0.40 a flood over the
  grid reached 9,604 cells and 10.8 m — a stylised stair is a body's width
  between its walls; at `KEEP_BODY` 0.26 it reaches 41,864 and the plateau.
  Measured hands-off with the game's own movement: the pier's end to the
  crow's nest at 31.8 m in 5,048 ticks, ZERO stalls, 46 climbs.
- The moored boat is a CLONE of the dock's Boat mesh, so it is the same boat
  by construction — with its own material, because the beach copy's night
  lift rendered white under a sunset. `Material.clone` drops the lift, which
  is exactly what was wanted.
- The pack: `tools/undercroft_pack.py keep "$HOME/Desktop/BEACHWALK ASSETS/fantasy_sea_keep/scene.gltf"
  assets/keep.glb --tex 2048 --scale 0.1 --floor-min -1.75 --headroom 0.95`
  (PIL in a venv, as for the church). 0.1 is measured off the model: a
  45-unit pier, stair rises of one to two and a half units, a 377-unit tower
  — 4.5 m, 10–25 cm and 38 m.

**AND THEN THE CLIMB VERB CAME OFF AND THE ISLAND HAD TO BE WALKED.** The
owner's six: Set Sail from the DOCK when you are near the boat, no `E Climb`
at all — things you jump onto and ledges you walk off — the moored boat not
awash, night at the keep, a lever under the timber hoist that drops the
counterweight and takes you to the second level, and the whole island walked
round with ease.

- **THE STEP ALLOWANCE DEPENDS ON WHERE YOU ARE, AND THAT IS THE WHOLE
  VOCABULARY.** With the climb gone there are three numbers and no verbs:
  `KEEP_STEP` 0.62 is a lip you walk up, `KEEP_AIR` 0.35 is what your feet
  catch in the air — so a jump gets you onto about a metre, which is what
  "jumped on if high enough" means as a measurement — and `KEEP_OUT` 2.4 is
  what you climb out of the sea, because the shelf is 1.95 under the beach
  and at a walking step a wade could never be ended. A drop is simply a
  drop: you walk off a ledge and fall to whatever is under you.
- **A HOLE IN A WALK GRID READS AS A WALL, AND THAT IS AN INVISIBLE FENCE.**
  The packer writes a cell's floor from the triangles that land in it, and on
  a big low-poly shore it now and then lands none at ground level — the cell
  keeps only its high storeys, and "no floor at or under my feet" is the
  game's own definition of a wall. Measured: a flood from the pier reached
  9,808 of 56,714 cells. `repairKeepGround()` runs at load over the cells'
  own bounding box — three passes, a cheap four-neighbour median as a
  pre-test and then a 5×5 median — and **A REPAIR MAY ONLY EVER ADD A FLOOR
  UNDERNEATH**: added above a cell's own lowest storey it hangs a shelf
  inside a cliff, and `if (med4 > fl[0] - 0.3) continue;` is the whole
  guard. A "local gap under 2.5 m" guard was tried first and regressed the
  flood, because it rejected exactly the case that matters (a cell whose own
  floor is 4.89 over neighbours at 0.07). Patched 1,909 cells, added 1,778,
  68 ms.
- **AND `--floor-min` THROWS SAMPLES AWAY.** At -0.9 the shore's own dips (to
  -1.1) were discarded at pack time, so a two-metre band of the beach came
  out with only its 2.0 and 8.0 storeys — a wall you could see the sand
  through. Repacked at -1.75.
- **AND THE WALK AND THE PUSH-OUT HAVE TO ASK THE SAME QUESTION.** The pier's
  own lesson on an island, and the last invisible fence. `keepFloorAt`
  answers "what is the ground here" and answers with a floor even where the
  packer marked the BODY BAND over it as full; `pushOutOfKeep` calls exactly
  those cells solid. So a cell with the band set was one the walk let you
  stand on and the push-out shoved you off, on the same frame, for ever:
  measured on the east shore, a two-frame limit cycle six centimetres wide
  that pinned the body on ground with nothing drawn on it. `keepStandable`
  is the one question the walk asks now. It costs 2,380 of 46,687 reachable
  cells — the ones your shoulders were inside anyway — and every one of the
  36 bearings round the island is still walked.
- **A COUNTERWEIGHT WAS THE MECHANISM, AND IT WAS BUILT AND THEN DELETED** —
  four posts, a drum, a hanging weight and a gangway. See the round below:
  the model already has a hoist and the owner's word was to use it.
- **A BOX FLOOR IS READ BY THE SAME LOOKUP AS THE MODEL'S OWN GRID.** The
  boat, the lift platform and the gangway are planks the game laid after the
  pack, so the walk grid knows nothing about them; `keepBoatBox`,
  `keepLiftBox` and `keepGangBox` win inside the floor lookup when they are
  higher and in range.
- **THE MOORED BOAT WAS HUNG OFF THE PIER DECK, NOT OFF THE SEA.** It sat at
  deck height less its own height, which on a hull deeper than the pier is
  high stands it under the water. It floats on `KEEP_SEA` now.
- **AND THE PROMPT COMES OFF THE HULL'S OWN BOX.** `boatHail` is a reach
  measured from the boat's bounding box rather than from a point, so "E Set
  Sail" reads standing ON her and standing on the dock BESIDE her — measured
  at 2.6 m and at 4.4.
- **AND THE SKY IS PAINTED, SO NIGHT IS PAINTED.** The sphere ships as glass
  and what Sketchfab shows through it is its own HDR environment, so there
  was never a sunset in the file to turn off: the fragment is rewritten to a
  deep blue by height over the sea with a moon disc and a halo at
  `normalize(vec3(-0.62, 0.36, 0.70))`, hash stars thinning at the horizon,
  and the file's own cloud strip laid over at low weight. The five lights,
  the fog, the sea and the windows come down with it — colour and intensity
  are free, a light entering or leaving is not.

Measured at the end: 44,307 cells reachable from the pier spawn with a full
body disc and the game's own standability test, **all 36 bearings round the
island** at radii 16–40 m, and every one of twelve ring stations routes to
the next. Hands-off with the real movement code, the 454 m loop from the
pier, round the island and back walks in **7,128 ticks (114 s) with 9 % of
frames stalled and fifteen jumps** — and the two places it needs help are
both two-storey shelves where the harness's own route carries no storey, not
walls: standing on the terrace instead of the shelf under it, the same
ground walks straight through. **A ROUTE OVER A GRID OF STOREYS MUST CARRY
THE STOREY**; an (x, z) waypoint is not a place on an island with an
overhang on it.

**AND THE HOIST WAS ALREADY IN THE MODEL — TAKE OUT THE ONE YOU BUILT.** The
owner's word on the timber lift of the round before: take it out and make
the one that is already there work, use the assets in the model, and — the
part that says what it is FOR — *I need to reach that height*. He is right,
and it is the undercroft's rule a second time: MAKE THIS BETTER IS NOT BUILD
YOUR OWN. JesseL drew a cargo hoist against the cliff — a planked car with
rails and a crate on it, two guide frames eight metres tall, a head beam
with pulley blocks at 21.8, and a timber jetty under it at the shore — and
beside a real one anything hand-built is a stack of boxes.

- **AND THE HEIGHT IS THE POINT, WHICH IS A MEASUREMENT.** Flooded with the
  body disc and the game's own standability test, the walk from the pier
  reaches **4.87 m and no higher**; the hoist's car as drawn sits at 14.10
  and its jetty at 2.3. So the one thing on this island a body cannot do is
  exactly the thing the hoist is for, and nothing had to be invented to find
  that out. **AND ZERO IS WHERE THE MODEL DRAWS THE CAR, NOT WHERE IT
  STOPS.** Parked at its own drawn height the car lands on a 13.8 shelf two
  metres under the only floor up there worth having: the terrace outside the
  keep's DOOR reads 16.1 all the way from the well to the threshold. The
  travel runs either side of the drawn position — down to a hand over the
  jetty and UP PAST ITS OWN HOME to 16.15 — and the car's deck arrives flush
  with the flagstones. Measured: ride up, walk off, and you are at the door
  at 16.11 without a step in between.
- **THE PACKER BAKES EVERY NODE INTO WORLD SPACE, SO THE CAR IS NOT AN
  OBJECT.** It is triangles inside three 44,000-triangle meshes, and the
  source `scene.gltf` is no help — twenty-five nodes, not one of them named
  for a part. It comes out the way the bunker's tripod camera came out of
  its merged mesh: WELD BY POSITION, FLOOD THE ISLANDS, AND SORT THEM. A box
  test on triangles alone tears the bottom metre off both guide frames,
  which stand ON the car's deck and pass through its plan. A piece SHARES
  its source's attributes and carries only its own index — no vertices are
  copied, the uv is the scan's own, and nothing that moves can come out a
  different colour from the frame it hangs in. 152 ms at load, on the beach,
  long before you sail.
- **AND THERE ARE THREE KINDS OF ISLAND IN THERE, NOT ONE.** The DECK is
  every island inside the car's box that is THIN IN SOME AXIS, because each
  piece of it is a plank, a bearer, a stanchion or a rail. The CARGO is the
  islands inside that box that are thick in every axis — the model stands a
  CANNON and its crates on the deck, and the owner's word is that the hoist
  should be the platform and nothing else, so they come out of the model
  rather than ride up and down on it. The smallest side of the box is the
  whole discriminator: a plank is 0.2 through, a cannon is 1.0.
- **AND THE ROPES STRETCH; THEY DO NOT TRAVEL.** Four falls leave the deck
  at 14.03 and run up to the head beam at 22, and left in the fixed mesh
  they hang in the air pointing at a car that is no longer there. They are
  their own pieces, each in a group pivoted at its own top and scaled in y
  so the bottom sits on the deck at any height. Each is CUT a hand under its
  own top — the island carries the hanging fall AND the run along the head
  beam, and scaling that run with it sags the whole thing by a third of a
  metre — and the pivot is exactly the cut, so there is no seam anywhere.
  What they are is worth knowing: the island has vertices at y 14.03 and at
  y 21.9 and NOTHING in between, which is what a rope drawn as one long
  section looks like and is why scaling it reads as rope paying out.
- **`matrixWorld` IS ONLY WRITTEN BY A RENDER** — this file's oldest trap,
  and it bit again: run in the loader, every mesh measures in its own space,
  nothing intersects the car's box and the whole thing silently finds
  nothing. And **a proxy hung under the keep's own group is in the keep's
  frame**: the island stands at (-6000, 800, 6000), so a world position
  written straight into `position` lands twice as far out and the crosshair
  finds nothing at all.
- **TAKING A SURFACE AWAY DOES NOT TAKE AWAY WHAT THE GRID REMEMBERS OF IT.**
  The desk's own lesson: the car's storeys come out of the cells under its
  plan, or the walk goes on offering a floor at 14.44 where there is now
  nothing. Three ways to get that wrong, all measured: written as a loop over
  METRES it runs a cell wide on every side and takes the KEEP'S OWN TERRACE
  with it — a half-metre moat round the car at the top; written to the car's
  own timber, the half of each cleared CELL that sticks out past the timber
  is a 20 cm slot you fall fourteen metres through; and the model draws the
  car inside a well with a finger's clearance all round that never had a
  floor in it either. The plan is the cells the car took ground from, the
  car's own measured box, and a hand's width over.
- **AND WHERE DOWN IS, IS MEASURED ON THE FLOOR THE FEET USE.** The jetty is
  a RAMP — its walk runs 2.70 at the landward end to 1.94 at the seaward one,
  and a corner of the car's plan clips the rock the hoist is bolted to at
  3.42. Parked over the highest of those the car is a metre in the air;
  parked a step over the middle of the ramp it is a 0.68 m climb from the far
  end, over the 0.62 the walk allows — measured, you stroll straight past it
  and off the other side instead of stepping aboard. It rests a hand over the
  MEDIAN of the floors under its own plan, so it is a quarter of a step up
  from one end and a third of one down from the other, and a drop is free.
- **AND THE CONTROL IS THE HOIST, NOT A LEVER SOMEBODY ADDED.** Two invisible
  proxies — the file's own way of giving a crosshair something to find — one
  standing on the jetty under it so you can call it down, and one riding the
  car so you can send yourself up once you are aboard. `E Lower the hoist` /
  `E Raise the hoist`, under the crosshair.

**THE DRAWN WALLS ARE THE WALLS NOW, AND A STOREY YOU CAN SEE IS A STOREY
YOU STAND ON.** "I should not be clipping through anything that's visible in
the sea keep" and "make the textures actually act as they are seen" are one
job with two halves, and the walk grid can only ever answer half of it: it
is a plan of FLOORS, so a wall between two cells both of which have a floor
is not in it at all — you walked through the keep's own studded door.

- **A WALL IS A BOUNDARY, NOT A PLACE.** The obvious repair is to rasterise
  every steep face into the grid and call those cells solid, and it is
  wrong by construction: a cell containing a wall is also the cell you are
  STANDING on, on one side of it or the other. Measured, band-marking
  collapsed the island's flood from 44,454 cells to 14,126 and its 36
  bearings to 21 — most of the shore became unreachable — and it still let
  you through the door, because the door's own cell was the one you were
  standing in. Abandoned.
- **THE SEGMENT IS THE TEST, AND ITS HEIGHT IS THE FILTER.** `keepHitsWall`
  is Möller–Trumbore of the frame's own movement, swept at CHEST height
  (feet + 0.95), against a one-metre grid of the drawn triangles
  (`buildKeepWalls`: 135,457 faces, 60,900 of them steep). A kerb you are
  meant to step over is under the segment and is never met; a wall is.
  `updateKeep` tries the full move, then each axis alone, then reverts —
  the undercroft's own slide.
- **AND THE FACE-HEIGHT FILTER THREW AWAY THE DOOR.** `KEEP_WALL_MIN` was
  0.70 on the reasoning that anything shorter is a lip; a stylised model
  draws a studded door as a course of small quads and not one of them is
  0.70 tall, so the one wall the owner photographed was the one wall left
  out. 0.12, and the chest-height segment is what keeps the kerbs walkable.
  The sea and the sky (`material`, `material_5`) are skipped, and so is any
  triangle spanning more than 400 cells — the island's own base is one face
  the size of the model and it would otherwise be in every bucket.
- **A HOLE IN AN UPPER STOREY IS A FLOOR YOU FALL THROUGH**, which is
  `repairKeepGround`'s invisible fence wearing the other coat: the packer
  writes a cell's storeys from the triangles that land in it, and on a
  stylised interior it lands none often enough that a doorway threshold has
  no floor at hall level and drops you to the ground floor. Two topological
  rules were tried and both failed on that threshold — a ≥6-of-8 majority
  (the gap is a two-cell slot, so its cells have three neighbours at that
  level) and a flood-and-enclose (574 ms, and the slot opens into the
  interior so it is never enclosed). **ASK THE GEOMETRY.** A level carried
  by three of the eight neighbours is proposed, and `keepDrawnFloor` — a
  barycentric plan test against the non-steep faces in that cell — says
  whether anything is actually drawn there to stand on. 28,618 storeys put
  back of 51,155 asked, in 95 ms.

Measured after: walls crossed on 5 of 56 hands-off walks (four of them from
one interior start) against a baseline where the door could be walked
straight through; the island's flood ROSE to 51,956 cells with all 36
bearings; the 401 m ring loop still completes hands-off in 8,455 ticks; the
keep's loader frame went 152 → 266 ms.

**A CROSSING TEST HAS NO THICKNESS, AND THE BODY BAND IS HALF A METRE WIDE —
THE TWO FAULTS THAT MADE THE KEEP UNPLAYABLE.** The round before put the
drawn faces in the walk as a swept segment and measured 5 of 56 hands-off
walks still crossing one; the owner played it and walked through rocks,
walls and brick. Both halves were wrong and they are opposite mistakes.

- **A SEGMENT ONLY EVER ASKED WHETHER THE FRAME'S OWN MOVEMENT CROSSED A
  FACE, AND A FRAME'S MOVEMENT IS TEN CENTIMETRES.** Creep at a wall, be
  nudged into it by the grid's own push-out, or arrive on a frame that
  hitched, and you finish a few centimetres PAST the face — and from in
  there every later segment is on the far side and crosses nothing at all,
  so the wall is behind you for good. A body has a WIDTH. `keepWallNear` is
  the nearest steep triangle's own footprint in PLAN (a wall is vertical,
  so the plan distance is the distance), and `keepWallPush` ejects the body
  out of the DEEPEST one and asks again — never the sum, because a wall is
  thirty coplanar triangles all pushing the same way and summing those
  throws a body across the island. The sweep stays as the safety net for a
  frame long enough to jump the band, at THREE heights: at the chest alone
  a handrail is a bar that passes clean over the segment with its posts to
  either side, which is the whole of "I walk through the railings".
- **AND THE Y BAND IS WHAT KEEPS A STEP A STEP.** It starts a lip's height
  over your feet (`KEEP_STEP + 0.04`) and ends at the crown, so a riser you
  are meant to walk up is under the body entirely and only what stands
  between your knee and your head is a wall. A floor slab's own edge — a
  steep face two metres deep — is below the band of anyone standing on it.
- **AND A FACE IS A FLOOR OR A WALL, NOTHING BETWEEN.** `KEEP_WALL_NY` was
  0.35, about seventy degrees, so a rounded boulder's flank at sixty was
  neither: not a floor you could stand on and not a wall that stopped you.
  0.55 is the same number `isFloor` uses, so the two partition every face
  the grid keeps.
- **AND THE PACKER'S BODY BAND IS HALF A METRE WIDE.** It marks a cell full
  if ANY triangle stands in it, so a handrail post ten centimetres thick
  refuses the whole cell — and a row of them, a pier, a doorway's jamb, is
  a scatter of half-metre squares across a floor you are looking straight
  at. Measured on the terrace outside the keep's door: **nineteen cells of
  it**, every one drawn, every one a hole you walk into and fall sixteen
  metres down. That is the whole of "I should be able to walk around the
  second floor". The walk no longer reads the band at all — what is in the
  way is asked of the drawn faces, a quarter of a metre from a real
  triangle rather than a whole cell from the middle of one — so the grid is
  left to answer the one question it is good at: WHERE IS THERE GROUND.
  `keepStandable` is `keepFloorAt` now, and `pushOutOfKeep` ejects only
  from cells with no floor at your level at all.
- **AND A LONE HOLE IN A FLOOR IS A SAMPLING GAP, NOT AN OPENING.** The
  geometry probe answers a doorway's threshold; what it cannot answer is a
  cell in the middle of a terrace where the packer landed no triangle and
  nothing is drawn at the probe points either. The undercroft's own rule:
  fill it only if it is ENCLOSED, which here is six of its eight neighbours
  carrying the level. The hoist's shaft is twenty cells across, so no cell
  in it ever has six and a hole you are MEANT to fall down stays. 1,348
  filled. **And the centre of a cell is not the cell** — a threshold is a
  slot narrower than the grid, so the drawn-floor probe takes five points
  over the cell rather than one down its middle.

Measured after. Thirty-six hands-off walks straight at the keep from three
rings, 14,400 frames: **8 frames with the body touching a drawn wall at all
(0.06 %) and a worst overlap of 0.187 m against a 0.26 m body — never
inside one**, against a baseline where the keep's own studded door could be
walked straight through. The terrace outside that door has **no floorless
cell anywhere** over an 11 × 9 m sweep at 25 cm (nineteen before), and
walked from a spot clear of the hoist's shaft, 9 of 12 headings stay on it
at 16.1 and the three that do not go down the shaft itself, with 1 grazing
frame in 1,560. The island still floods to 81,043 cells with **all 36
bearings**, and it now TERMINATES — before the walls it leaked through the
rock and out over the sea and never closed. The tick is 0.365 ms (worst
4.0) and the keep's storey repair 97 → 209 ms at load.

**WHAT IS NOT VERIFIED:** the full ring loop round the island. A harness
that follows a route over the walk grid stalls on the shore under the
overhangs, and at every spot it stalls the measurement says the way is
clear — floor in all eight directions, no face crossed at any of the three
heights, nothing within the body — so it is the steering and not the new
collision. It was not chased further this round.

**AND THE ISLAND IS BUILT AT THE CUT, BEHIND THE BLACK.** The sea keep's walk
faces, its two grid repairs, its hoist and its moored boat are half a second
of blocking between them (147,541 faces 200 ms, the storeys 188, the ground
81) and they ran in the keep's own LOADER CALLBACK — which fires the moment
you come within loading distance of the DOCK. One six-hundred-millisecond
frame in the middle of a walk, for a place you may not sail to for another
minute, or ever. `startSail` already blacks the screen and already waits on
`keepReady`, and behind a black card half a second costs nothing: the crash
kit's own argument, and the drain's, and the bunker's. `buildKeepIsland` is
called there and from `placeInKeep`, so a restore or the harness cannot
arrive on an island with no walls. Measured: nothing at load, 381 ms at the
cut, and the clip walk after it is unchanged at 0 frames of 3,600 with the
body in a wall.

**THE TAVERN IS BEHIND THE KEEP'S DOOR, AND IT IS THE KEEP'S OWN MACHINERY ON
A SECOND SITE.** Katydid's "Medieval Tavern" (CC-BY-4.0, `assets/tavern.glb`,
`tools/undercroft_pack.py tavern … --scale 0.8`): a SketchUp hall, baked and
UNLIT — every material ships `KHR_materials_unlit`, three honours that as
`MeshBasicMaterial`, so the room draws exactly what the file draws whatever
the lamps do, and it is `toneMapped = false` because ACES over an already-lit
texture is a second exposure. E on the studded door at the top of the hoist
(`KEEP_DOOR`, measured off the car's own axis: its face is at keep-local z 8.3
straight down it), black, and you are standing in Katydid's own thumbnail
(`TAV_SPAWN`, matched in the pane: bottle rack and barrel front-left, hex
crate front-centre, pedestal table front-right, the arch right of centre).
What it cost:

- **THE FILE STANDS ITSELF UP.** Its root node carries the Z-up turn, the
  0.01 and an offset, so a `--pitch` (added for the next SketchUp export
  that does not) applied on top folded the hall onto its side and the scale
  came out a hundred times too small. Read the node matrices before
  correcting a file's frame. And its `BackSide_0` — 16,594 triangles — wears
  a 32×16 texture that is entirely alpha zero: SketchUp draws every face
  twice and the back copy is invisible, so the packer drops it.
- **EVERY WALK FUNCTION THE KEEP HAD TAKES A SITE NOW.** `buildKeepWalls`,
  `keepWallNear`, `keepWallPush`, `keepHitsWall`, `keepDrawnFloor`,
  `pushOutOfKeep`, `keepFloorAt` and the two repairs read `KEEP_SITE` by
  default and `TAV_SITE` when handed it — the same drawn-face index, the
  same body push, the same three-height sweep, the same storeyed grid — so
  every wall, cabinet, rail and crate in the hall is solid by construction
  and a crate top is a storey you jump onto. A site says which materials are
  drawn and never walked, which floors were laid after the pack, and what a
  cell that was never written MEANS: the sea at the keep, a wall indoors.
- **AND IT IS AT POSITIVE Z, LIKE EVERY OTHER ROOM.** Every trigger on the
  walk is "z less than a line"; parked at z = -6000 the abduction took you
  the frame you walked in and set you down by the shrine — the undercroft's
  own lesson, learned again at twelve kilometres. `TAV_Z` is 12000.
- **A TABLE IS LIFTED OUT OF THE MESH THE WALLS ARE READ FROM.** The packer
  bakes every node into one mesh per material and the file has no names, so
  a table is found, not named: a top is a thin disc in the table-top material,
  the discs at one spot are one table, and every island whose whole box
  stands inside that table's plan between the flags and the top is that
  table (the hoist's own weld-flood-and-box). **AND ONE MESH IS SPLIT ONCE,
  FOR EVERY TABLE TOGETHER**: the islands are read off a mesh's index and the
  index SHRINKS when a table's triangles are lifted out, so a second table
  read off the same island table took the wrong triangles and the first
  table stayed drawn in place. Decide every island's owner first, rewrite
  the index once. The pieces share the source's attributes and carry only
  their own index, so a piece cannot come out a different colour from the
  hall it came off; `Box3.setFromObject` on one measures the whole room,
  which is the price of that. An iron leg is an ANGLE — thin one way, 0.6 m
  the other, a metre tall — so it is a leg by its thinnest side, not its
  widest.
- **AND IT BREAKS THROUGH THE ONE DOOR.** Each table is a `physProps` entry
  with an `onImpact` — the desk's own — so the blade, a thrown body and a
  landing all find it; a round top comes apart in quarters about its own
  axis, the legs turn onto X so they lie down, legs first and the top a beat
  after. Its storeys come out of the grid and the drawn-face index is
  rebuilt on the next frame (`tavWallsDirty`; 16k triangles is nothing).
- **THE CHAIRS ARE BUILT, in the tables' own timber**, three to a table,
  stood only where the walk has flags and the drawn faces leave a body's
  room, each turned in at its table; they are in the wall index like
  everything else and come apart into seat, legs, posts and slats. **The
  seat sits OVER the step band**: at 0.46 a seat sat exactly on the band's
  lower edge (feet + `TAV_STEP` + 0.04) and a chair was a thing you walked
  into up to its back. 0.50.
- **THE WAY UP TO THE TUNNEL IS CRATES, AND THEY ARE THE FILE'S OWN CRATE.**
  Over the covered stall at the back runs a vaulted passage with its floor
  5.3 m over the flags, and the file's own crate stack stands INSIDE the
  stall under its roof. Measured: a jump lifts the feet 0.62 and the walk
  catches a floor `TAV_AIR` (0.50) over that, so one crate (1.06) is one
  jump; stacks of three, two and one run out from the stall's front along
  the one strip of clear floor beside it (x -9.5..-8.4, measured by
  raycasting the strip with the game's own crates hidden: a stool stands at
  x -10.6..-10.2, a valance hangs under the roof's edge out to x -9.4, and
  the file's own small crate at x -9.5..-8.8 ends up wholly INSIDE the last
  stack's bottom crate), two three-high
  stacks run to the roof's edge — the roof begins half a metre behind the
  last of them (the cells between carry nothing but the flags, measured
  after a first stair stopped one stack short), so the last step is a short
  jump, half a metre across and 0.39 up — and one more crate on the open
  part of that roof puts the tunnel a jump away. Each is a COPY of
  the file's crate — same triangles, same map — written into the grid as a
  storey and into the wall index like anything drawn — **and a copy made
  the gib way has no index, which the wall index reads and nothing else**:
  the first stacks were floors on top and open air from the side, and the
  face count said so (12,782 with ten crates and without).
- **A PROMPT CANNOT BE READ FROM THE HARNESS WITHOUT A LOOK IN CHARGE.**
  `updateHover` returns nothing unless the pointer is locked or the drag
  fallback is on; `__bw.fallbackLook = true` first, or every door reads
  `null`. And a hidden pane paints nothing: a screenshot after a change that
  demonstrably happened showed the old frame until the tab was fronted.

**THE HOIST'S ROPES CONNECT, AND ITS PLATFORM IS EMPTY.** Two faults, both
in how the falls were told apart from everything else round them.

- **A ROPE IS KNOWN BY ITS FOOT.** The old test asked for a tall thin island
  whose bottom sat within 0.35 m of the deck and whose x lay in a band — and
  never asked about z at all. Measured, that took the two falls that hang at
  z 9.9, a metre and a half in FRONT of the car over open rock, and dragged
  them up and down after a car they are not attached to; and it MISSED all
  four real falls, whose feet are at 14.56–14.69 against a 14.10 deck. Those
  four hung from the head beam and ended in mid-air the moment the car left
  home. Every island's foot is averaged now (the vertices within a hand of
  its own lowest) and a fall is one whose foot is over the car's own plan.
- **AND A ROPE IS TAKEN WHOLE.** It used to be cut a hand under its top so a
  run along the head beam would not sag — and this model draws a rope as ONE
  LONG SECTION, vertices at the deck and at the beam and nothing between, so
  a triangle spanning the cut failed the all-three-below test, stayed in the
  static mesh, and left a collar riding the car with seven metres of rope
  standing still above it. Pivoted at its own top the whole island scales:
  the head never moves and the foot is on the deck at every height. The
  price is a little dip in a run lying along the beam at the bottom of the
  travel, and a rope that ALWAYS reaches is worth more than one that never
  dips. Measured at three heights: every fall's bottom is 0.07 m under the
  car's deck at 16.15, 8.81 and 2.34.
- **AND A ROPE THAT IS NOT THE CAR'S STILL HAS TO REACH SOMETHING.** The two
  at z 9.9 stop dead at 14.37 with three metres of air and then rock under
  them, because the model drew them for a car parked at home. They are paid
  out ONCE at build, down to whatever `keepDrawnFloor` says is beneath their
  own foot.
- **AND CARGO IS WHAT STANDS ON THE PLANKS.** The old test kept anything
  thin in some axis, and a coil is a flat disc and a crate is a box — so the
  car went up and down with crates, coils, two posts and a small ladder on
  it. What separates cargo from structure is that the DECK BEGINS BELOW THE
  PLANK TOP (that is what holding a deck up means) and cargo's own bottom is
  AT it, with a footprint one man could have put there. Plus the carve's own
  lesson upward: whatever stands on a piece of cargo is cargo, or taking the
  post away leaves the rings on it hanging in the air.

**AND THE WALL YOU ARRIVE THROUGH IS THE DOOR YOU CAME IN BY.** The spawn
faces down the hall with a flat stone wall at your back and the keep's
terrace on the other side of it, so what is drawn there is the keep's OWN
studded door, lifted out of that model triangle for triangle with its
voussoir arch and stood in the tavern's wall (measured: the wall's face is at
x = -20.4). Two things it takes. **A UV IS ONLY GOOD ON ITS OWN MAP** — the
first lift took every triangle in the box whatever mesh it came off and gave
the lot the masonry's texture, so the cliff's faces sampled the masonry atlas
with the cliff's uvs and came out as ragged black spikes round the arch; the
doorway is the keep's `Fortress` material and nothing else. And the material
has to be REMADE: the keep is lit and this room is a baked picture with no
lights in it at all, so the keep's own standard material renders as a black
hole in the wall. The map goes on unlit, graded — swept in the pane, at
0xc9ced6 the oak of the leaves came out pale enough to read as more stone,
and 0x9aa0a9 is the level where timber is still timber.

**THE DOOR IS BUILT, NOT LIFTED.** The first version cut the keep's own
doorway out of that model triangle by triangle — and a box through a scan
cuts its stones in half, so what came over was the door and a ring of ragged
black shards where the jambs had been sawn through. The lighthouse's rule on
a door: building it is the only way to make it exact. Two leaves of studded
oak under a round-arched voussoir surround, all boxes and two canvases,
unlit like the rest of the room. **The arch comes free from the planks**: a
plank's own height is the springing plus the height of the circle over its
middle, so the tops describe the arc by construction rather than being cut
out of a sheet. Both greys are swept rather than chosen — at 0xc9ced6 the
oak read as more stone.

**AND A CHECKPOINT AT THE TOP OF THE HOIST, WHICH IS A SAVE IN A ROOM.**
Everything past it — the terrace, the keep's door, the tavern, the two men
in it — is behind a sail, a walk round an island and a ride, and none of it
is worth doing twice. It is written the moment the car arrives with you ON
it (inside `keepLiftBox` and standing at its deck), once a game.

**"I KEEP LAGGING ACROSS THE ROOM IN THE TAVERN" WAS THREE PUSHES AND NONE OF
THEM WAS THE FRAME RATE.** Measured first, before anything was touched: 219
draw calls, 431k triangles, `update()` 0.49 ms and the render call 1.43 ms —
the room is not slow. What it was is the oldest failure in this file wearing a
third coat: a correction that argues with the input. Measured over 240 walks,
four directions from every part of the floor, **19.7 % stalled frames, 2603
reversals of direction and a worst single step of 0.667 m**. Four things:

- **A PUSH MAY STOP YOU; IT MAY NOT SEND YOU BACKWARDS.** Traced frame by
  frame at the south wall: the input moved the body 0.02 m, a push moved it
  0.02 back, and the next frame did it again — sixty times a second, growing
  to 0.09 as the two disagreed harder. The church's rule one step further: if
  what the frame's corrections leave is motion OPPOSITE to the motion the
  frame asked for, the frame is worth nothing and the body stays where it
  was. Walking square into a wall and not moving is simply correct.
- **AND A CORRECTION IS A LEAN, NEVER A JUMP** — the knight's own cap, which
  the player never had in here. From a standing start beside the furniture
  the three pushes between them moved the body **1.074 m on one frame**,
  which is sixty-five metres a second. `TAV_FIX` clamps the frame's whole
  correction to 0.09 m and the rest is paid next frame, so being ejected from
  a barrel is eight frames of being shouldered aside. It is skipped after a
  frame that was itself a teleport, where a big correction is the honest
  answer.
- **AND `pushOutOfKeep` TOOK THE SUM.** `keepWallPush` has known since the
  island went in that a wall is thirty coplanar triangles all pushing the same
  way and that summing those throws a body across the island; this one is the
  same wall drawn as CELLS and kept taking the resultant. At a 0.2 m cell a
  0.26 m body overlaps nine of them, so a straight edge of floorless ground
  pushed six times harder than it had to. Deepest first, ask again, four
  passes.
- **AND `tavEscape` IS A LAST RESORT, WHICH MEANS IT WAITS.** At a depth of
  0.20 on a 0.26 m body it fired whenever a shoulder was NEAR a wall — which,
  walking along one, is every frame — and walked you 0.14 m sideways each
  time. A body genuinely inside something is inside it by most of its own
  width and stays that way for a third of a second; a shoulder brushing a
  chair does not.

Measured after, the same 308 walks: **worst step 1.082 → 0.146 m (the cap plus
a stride), and of 72 reversals in 13,860 frames 68 are under 2 cm** — a
walking stride is 5.7 — against 2603 before. Standing still on 248 clear
spots the mean drift is 0.0066 m and the worst 0.10; the two spots that drift
further are the harness dropping the body inside a table, and it is walked
out. Both bodies dropped inside geometry still get out. The catacombs walk is
unchanged (zero stalls, worst step 0.079).

**AND THE SEA AT THE KEEP IS NOT A PLACE.** `updateKeep`'s `legal` refuses any
step onto a floor under the water (the shelf, or `S.sea()` where the grid was
never written), so the waterline is where the walk ends, the pier's edge is a
wall, and a jump off it lands back on the boards. Only a body already in the
water may move through it, so it can always climb out. Measured: west, east and
seaward off the pier all stop at the edge; boarding the boat still works; the
jetty under the hoist is still reached dry.

**AND THE HOIST WAITS AT THE BOTTOM.** It is built down, and arriving by sail
(and a restore at the pier, `keepIn`) parks it down; only the tavern's spots
and the keep's door park it at the top, because you came up it.

**THE KEEP'S FENCES ARE WHERE THE OWNER POINTED, AND THE P OVERLAY IS HOW.**
Two screenshots with no crosshair in them cost an hour of matching renders
and never found the second spot; one screenshot each with dev mode's P
readout (`feet`, `look`, `aim`) found both exactly — rebuild the camera from
`feet + playerEye()`, the look yaw and a pitch at `aim`, and the centre ray
lands on the aim to the centimetre. `KEEP_FENCES` is data in the island's own
frame: rock to hay bales, the bales to the waterline, rock to the hoist.
Their ends were found by walking out from the aim with the walk's own rules;
the hoist end stops a hand OUTSIDE the car's plan (a post inside it stands in
the shaft). They wear the island's own `Fortress` material with every uv laid
into the strip a pier plank samples (read off a raycast into the deck), posts
sunk 0.34 m with a lean and a heap of the beach's sand at each foot, and they
are built in `buildKeepIsland` BEFORE the wall index, so the rails are walls.
Two things that were not enough on their own: **a fence that ends at hay bales
0.74 m tall is a fence you walk round** — the walk steps onto the bales, and
standing on them your wall band is over the top rail — so the fence carries on
to the water and `KEEP_BLOCKS` refuses every fence line, and the line across
the bales, as a LINE in `updateKeep`'s `legal`, whatever height you are at;
and **an end post must take its height from the walk's floor**, not a ray from
above, or it stands on the top of the rock it meets and drags its rails up at
forty-five degrees. Measured: 56 walks from both sides of every line, jumping
every half second, 0 crossings; the hoist landing is still reached.

**THE SEA KEEP HAS AN INTRO.** The owner's `sea keep intro.wav` (8.2 s) is `assets/keep-intro.m4a` (`afconvert -f m4af -d aac -b 192000`), fetched and DECODED when you set sail (`loadKeepIntro`) and started on the frame the cut sets you on the pier (`playKeepIntro`, in `updateSailCut`) — a buffer rather than an `<audio>` element, because an element has to buffer before it can play and this starts under the black. It is on the music slider at `KEEP_INTRO_LEVEL` (2.0: the file is mastered about 11 dB under the other tracks) and sailing home fades it. Its `let`s live beside `lhEl` at the top: `applySettings` runs at module load and reads them — declared by the function, they were a dead-zone crash that took the page.

**THE KEEP BY NIGHT (`buildKeepLights`, at the end of `buildKeepIsland`).**
The moon key is silver and stronger, the rose rim sits BEHIND the tower as
seen from the pier (it lit faces you never see from where you land). The lit
WINDOWS are found by sampling the Fortress emissive map at every face and
clustering the bright ones: a halo and a warm pooled lamp each. LANTERNS on
posts step down the pier from the spawn toward the rock at alternating edges
(the walk grid's own boards), two more flank the keep's door (placed by a
wall ray, or they end up inside the recess). Soft MOONBEAM cones slant down
onto the tower, the terrace and the water; a moonlit MIST ring lies on the
swell round the island; and every lamp and window is REFLECTED in the sea —
the light mirrored across the sea plane and a shimmering streak drawn where
the eye's line to that reflection meets the surface, depth-tested so land
hides it. All additive, all `bwGhost`, nothing enters or leaves the scene.

**THE HOIST SHOVED YOU BECAUSE ITS CAR WAS STILL A WALL WHERE THE MODEL DRAWS
IT.** `buildKeepWalls` runs before `buildKeepLift` has lifted the car out of
the merged mesh, so the planks, bearers and rails (and the cargo taken off
it) stayed in the wall index at their drawn height, 13.5-15.2 m. Riding up,
the body band met that ghost as the car passed y 12 and the push threw you a
quarter of a metre sideways in one frame — "laggy while riding up". The car
and the falls are `bwGhost` now and the index is taken again after the lift
is built. Two more things came with it: a RIDER GOES WITH THE CAR
(`updateKeepLift` moves the camera by exactly what the deck moved, so the way
down is no longer a string of little falls — it trailed the deck by 14 cm),
and while riding any wall push is capped at 1.5 cm a frame, because the
static guide posts slide past a body standing at the car's corner. Measured
at nine spots on the car, up and down: worst sideways step 0.015 m (was
0.24), eye to deck 1.700 ± 0.005 the whole way. **And never put
`performance.now` back to the real clock after running a fake one ahead of
it**: time runs backwards on the next frame, and a NaN reaches the camera and
the audio params — that was every "NaN camera" in this round's harness.

**THE KEEP'S GULLS GO ROUND IT.** Every wheel there is centred ON the island
at 52-85 m (`KEEP_BIRD_R`), the flush off the pier goes out over the water,
and a flushed gull joins a wheel round the island through where it is.
Measured over ninety seconds: none nearer the island's centre than 52 m once
the flush is done. And the fisherman answers the chest key: "Looks like an
old chest key." The wedding ring is 4% a jar (was 6).

**THE HOIST'S CAR RESTS ON ITS LANDING, NOT IN IT.** The model draws a timber
landing under the shaft, sloped 2.5 → 1.9 m and the car's own size, and the
car was parked with its plank top a hand over the median of that slope — so
its framing, which hangs 0.53 m under the planks, stood down through the
landing on a diagonal. The car's underside is measured off its own triangles,
the landing's highest plank under its plan by raycast, and it stops level a
finger over the high end. Three things came with it: the car box carries
`stepUp` 0.82 (the step from the landing's high end is 0.74, over the walk's
0.62) and `keepFloorAt` honours it; the car is SOLID to a body under its deck
(`underCar` in `updateKeep`'s `legal`); and a step over a fifth of a metre at
the keep is eased over a few frames instead of snapping the eye up. A car
coming down on somebody standing on the landing lifts them onto the deck.
Measured: boarded from the high end, ridden to 16.15, eye glued to the deck.

**THE CRATE ON THE KEEP'S PIER** is the model's own, lifted out of the merged
`Fortress` mesh (`extractKeepCrate`, before the wall index is taken) and hung on
the breakables' door. Four things it cost, all general:
- **Read a piece's world matrix BEFORE you take it off its parent.** The first
  break removed the piece and then threw its sides from `matrixWorld`, which
  without a parent is the island's LOCAL frame: every board landed six km away.
- **A triangle belongs to the side of the box it is NEAREST, not the way it
  faces.** A slat's inner face points the same way as the opposite side's outer
  face; grouped by normal, each "side" was the size of the whole crate.
- **A side built standing lands standing** — the gib rule — so each is laid flat
  in its own geometry with the quarter turn put back on the mesh; and the boards
  are one-sided cut-outs, so the pieces get a DOUBLE-SIDED clone of the material
  (with `onBeforeCompile` copied: a clone drops it).
- **The deck under it is measured, not looked up.** The crate stands sunk a third
  of a metre into the planking, so the grid under it carries the crate's own
  bottom as a floor: the spliff went under the pier. A ray onto the drawn boards
  is the deck, the crate's storeys above it come out of the grid, and the deck is
  written back into its footprint (`deckKeepStoreys`) so there is no hole.
`keepCrate` / `keepSpliff` on the save. The keep already answers `bunkerFloorAt`
(`keepGroundAt`, while `inKeep`); **a harness's copy of `bunkerFloorAt` is a
snapshot of the first no-op** and always reads null.


**A FLOOR THAT IS DRAWN IS A FLOOR; NOTHING UP THERE IS A DROP BUT THE SHAFT (2026-10-14).** The owner fell
through "next to the entry door" (his screenshot: the terrace at the top of the hoist). Mapped at 16.1, 0.1 m
cells round `KEEP_DOOR` (drawn non-steep face within a step of the feet vs the grid's floor): a strip of planking
beside the door and slivers on the terrace's far edge were DRAWN at 15.7–16.1 over a grid floor ten metres down
(271 such cells) — `repairKeepStoreys` only puts back a level its neighbours carry. Two rules:
- `keepFloorAt` asks `keepDrawnFloor` whenever the grid's answer is more than 0.6 m under the feet (or absent),
  and a drawn face within a step wins. Every caller (the walk's `legal`, the push-out, gibs) sees the same floor.
  After: 1 such cell; 16 hands-off walks from the door, 4 s each, never lower than 15.96. The tavern shares it
  (`TAV_SITE`); 16 walks from its spawn by the entry door never dropped at all.
- `updateKeep`'s `dropBad`: on the ground and above `KEEP_Y + 12`, a move onto a floor more than a metre under
  the feet is refused unless it is the hoist's shaft (`keepLiftBox` ± 0.5), and a wall push that ends over one
  is undone (to the post-move spot, else `_preMove`). The island's rocks below drop you as before.
- The audit is in this session's harness only: `keepDrawnFloor(x, z, feet - 0.6, feet + 0.35)` against
  `keepFloorAt(x, z, feet + 0.05, 0.35)` over a grid; note the walls only exist after `buildKeepIsland`, which
  needs `keepWalk` — call `placeInKeep()` again once `keepState().walk`.

**`trustDrawn` — the drawn-floor rule is the keep's and the tavern's ONLY.** `keepFloorAt` is also the island's, the
castles', the catacombs', the throne room's and the dungeon's floor, and the rule went into all of them; it is now
behind `S.trustDrawn`, set on `KEEP_SITE` and `TAV_SITE`.
