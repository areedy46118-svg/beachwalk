# The lighthouse and the headland

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**The lantern is built to a photograph of a real one.** A drum lens on a
steel column — a glass cylinder banded with the horizontal prism rings that
bend the light into a sheet, panel astragals, a brass crown — not a glowing
sphere inside three hoops, which read as a light bulb in a greenhouse. Round
it: a rusted sill ring where the glazing beds into the deck (the only warm
colour up there), twelve heavy astragals with foot castings rather than
sixteen thin ones, a cornice, and a black roof with its ribs showing, a
ventilator cowl, a finial and a ball. `lampCore` is still the small burner
inside the drum, because `updateTower()` flashes it.

**The lighthouse openings are cut on vertex lines.** `buildShaft()` samples
the shaft as a grid whose angle list includes every opening's edge angles on
that surface (as `ringYs` includes its top and bottom), so quads inside an
opening drop along vertex lines and the cut is square by construction. The
old `carve()` dropped whole lathe triangles by centroid, and at 30 segments a
triangle is 12° — nearly a metre on the outer face — which put a sawtooth of
half-triangles round the door: the "spikes". Openings are parallel-sided in
world space, so an edge is at a different angle on the bore than on the outer
face (`edgeAng()`); the reveals are generated from those same angles, inner
and outer edges on the arcs, so they meet the wall exactly. There is no
corbel under the deck any more: a second ring read as another floor.

The **ship's wheel** (`shipWheel`) has three detents; `shipWheel.position` is
−1 / 0 / +1 and the hover label carries the state. Nothing reads it yet — it's
there for a puzzle.

**THE GATE HUNG ITS LEAVES THE WRONG WAY, AND THAT WAS "WIDE OPEN".**
`leaf.position.x = side * leafW / 2` put each leaf OUTWARD from its post,
over the panel beside it, and the gateway itself was empty: two frames
either side of a hole with the tower in it. `-side`, so they meet in the
middle — and they are steel PLATE now with ribs and bars over it, because
chain-link on a leaf is drawn faint by design and a gate you can see
through does not read as shut.

**THE LEAVES ARE MESH AGAIN, BARRED.** Plate hid the lighthouse; the owner
wants the gate fence like the rest of it and the tower seen through it, so
chain-link with three ribs and a bar every three quarters of a metre, and
they meet in the middle (the `-side` fix).

**AND THE STEEL IS DRAWN.** Flat colours on fourteen metres of post read as
plastic. `grimeTex`: a cold base, speckle, rust running DOWN out of every
joint, a band of grime toward the foot, scuffs, quantised and nearest-
filtered like the game's own canvases, and every fence material is lifted
off its own map. The witness stands ON THE LANE now (`LH_X + pathBend`) so
he is in line with the door when you look back at the tower, and the
creature he becomes asks `headlandAt` for his feet every frame in
`updateNtar` — he walked the ridge at his spawn height before.

**Declaration order matters.** `main.js` is one long top-to-bottom module of
`const`s, so anything that *calls* `addInteractable` or pushes to a shared
array must appear **after** that array is declared, or you get a temporal
dead zone error at load. The lighthouse door and the pickup-shine helper both
had to be moved for this reason.

**The lighthouse is generated, not imported.** Two profile functions at the
top of `main.js` define it and everything else is hung off them: `lhOuterAt(y)`
is the outer face (a splayed base course, then a concave taper r4.35 → r2.45
at `LH_TOP`) and `lhBoreAt(y)` is the clear inside (r2.55 → r1.90). The shaft
is two `LatheGeometry` revolutions of those profiles; the gallery, lantern
room and roof sit on top of them. If you move a wall, move the profile — do
not hand-place a radius, or the deck and the stair will drift off it again.

**Inside it is built to a photograph, not to a scan.** The interior is a
BRICK shaft (`makeBrickTexture()`, on the bore lathe via `texture.repeat` —
LatheGeometry hands out u round and v up) with a slim red cast-iron stair
wound round a central STEEL POLE (`LH_POLE_R`), standing free of the wall
with air between: thin wedge treads (`ExtrudeGeometry` of a sector, one
shared geometry, rotated per tread, top at the stepped height) from the pole
out to `LH_TREAD_R`, a deeper red nose under each leading edge, a baluster on
every tread, and one continuous red `TubeGeometry` handrail on the OUTSIDE at
`LH_RAIL_R`. `updateTower()` clamps on both sides while you are on the stair:
the pole inward (`LH_POLE_R + PLAYER_R * 0.7`), and outward the smaller of
the bore and `LH_RAIL_R + 0.25` — your centre may pass the rail line a
little, which reads as leaning on it. Outside it is whitewashed render
(`shaftOutMat`) with a black lantern — the brightest thing on the headland.

**`LH_RAIL_R` must be INSIDE `LH_TREAD_R`.** At 1.50 against a 1.42 tread the
balusters stood eight centimetres off the end of every step and the whole
handrail floated in the air beside the stair. 1.36 puts them on the tread.

**Nothing may stand within 7 m of the tower's axis.** The footing skirt runs
out to 6.6 m, so anything inside that is growing through masonry or standing
on it — which is how grass ended up in the doorway and a fence post ended up
on the stair. `onRidge()` in the dressing and `rockSpotClear()` both carry
the keep-out; so does the fence loop, at `LH_OUTER + 1.1`.

**Walk it after touching any of this.** The test that matters is the one in
the preview harness: open the door, enter, spiral the camera at r ≈ 1.05 for
seven turns, and check `groundY` reaches `HL_CREST + LH_TOP`. A wall-to-well
version with an inner "well" clamp shipped for an hour and could not be
climbed — the walkable band at the top was 27 cm wide.

Two things learned building it: warm lamps on red iron in a brick tube go
monochrome red, so the brick's tint is COOL (`0x8892a4`) and the lamps are
nearer white than amber; and treads that reach the wall read as a spiral of
red paddles the width of the room — the reference stair is small and the
brick shows all round it.

A Hirtshals interior scan (Daniel Olaizola's, CC-BY-SA) was tried in Sep 2026
and dropped: it is an inside-out photogrammetry shell — whitewash, gaps where
the windows were, 338k noisy triangles, treads fused into wedges — nothing a
player could climb and not the red-iron-and-brick the references show. Same
lesson as below: don't reintroduce a scan for the tower.

A scanned tower (jonnysniper41's) used to stand here and was dropped in
Sep 2026. It was a closed 20-sided post with no lantern and no openings, so
every added part had to be guessed against a shape we didn't control, and the
door, the corbel and the lantern floor each ended up slightly wrong. Building
it made all three exact. Don't reintroduce a scan for the tower.

**Openings are cut, not modelled.** `OPENINGS` lists the door and the four
stair windows in the *game's* angle convention (`atan2(x, z)`, measured from
+Z — the same one `updateTower()` measures the player in), and `carve()` drops
the triangles whose centroid falls inside one. Note the lathe rings are seeded
on every opening edge so the cuts come out square. Window angles are stored in
the cos/sin convention on `lhWindows`, hence the `Math.PI / 2 - w.ang` when
they cross over; get that backwards and the holes appear on the wrong side.

**The wall is thick.** 1.9 m at the foot, 0.55 m under the lantern, so every
hole needs a lined reveal (jambs, soffit, sill) or you see straight through
the cut edge. The door additionally has a projecting stone surround outside.

**AND NOTHING GROWS UPSTAIRS.** Grass had seeded along the room's sill five
metres up. Sand and glass get in up there; grass does not. Ground level
only, and less of it — a crack in a slab holds a tuft, not a border.

**THE SHAFT IS WALLED THE WHOLE WAY UP.** It used to stop at `DISH_Y0` and
leave the last two metres of the climb standing in the open inside the flare
of the dish — from the room you looked down on the top third of the stair
hanging in mid-air. It is one tube from the platform to the room floor now;
the door is a gap in the bottom of it and its top edge is the lip of the
well, flush with the floor.

**THE HEADLAND'S SCANNED ROCKS AND GRASS ARE OUT** (`stones.glb`,
`grass-patch.glb`, and the headland's planting of `grass-clumps.glb`), on the
owner's word, for the download: 3.9 MB. The ridge, the lane, its fence and
its slabs are all built and stay. `grass-clumps.glb` stays for the
pavilion's cracks. Do not put the headland dressing back.

**The tower is bedded into the headland by a footing.** `lhOuterAt(0)` is
4.62 and `headlandAt()` has already dropped about 1.2 m at that radius, so
the base course hung in the air on every downhill side and you could see
under the building. A skirt swept round the tower from its own face out to
6.6 m, every outer vertex dropped to the ground there and a little under it,
beds it in whichever way the ridge falls. It has to be built in the headland
section, NOT up with the masonry: `headlandAt()` reads `pathBend`, which is
declared much further down, and calling it during module evaluation is a
temporal dead zone crash that takes the whole page. It caught this on the
first try.

**Nothing on the lane may stand inside the tower.** The path starts at the
threshold, so the fence's first shoulder posts were landing inside the
tower's own footprint — one stood on the stair. The loop skips any post
within `LH_OUTER + 1.1` of the axis and breaks the wire run there too.

**The headland scatter respects `onPath()`.** Rocks and grass re-roll their
position until they're clear of the lane to the door; if you add more props
out there, ask `onPath()` first or they'll grow through the path.

**AND THE STAIR IS TWO CRATES, ON THE PILE ALREADY THERE.** Nine were built
and the owner's word was one or two; what makes two enough is that the file
already stacks hex crates in front of the barrel rack's left end (tops at
1.15, 1.44 and 1.72, measured) and the rack's own top is a standable storey a
crate short of the tunnel. One crate on the big hex crate's END (its two
little boxes end up inside it, so its other end and the 1.44 box beside it
stay clear), one on the rack — and the way onto the pile is the STOOL beside
it (0.58), because a 1.15 m box cannot be jumped onto from the flags: the
sweep runs from `TAV_STEP` + 0.04 over the feet, and at the apex of a
0.62 m jump that is 1.08, seven centimetres under the box's own top face.
Measured, every step by the walk's own questions: flags, the stool 0.58, the
1.44 box, the crate at 2.21, the rack's top 3.53, the crate at 4.59, the
tunnel 5.27 — the tallest jump 1.32 against a catch of `TAV_AIR` 0.72 — and
the lying barrel that crossed the crate row goes to the flags by the rack's
other end (`moveTavBarrel`, a piece lifted the way a table is). A crate must
not overhang the box you climb it from: the prune takes away the 1.15 top
under it, correctly, and the route is gone.

**AND THE RIPS ARE CUT ON VERTEX LINES** — the lighthouse's own rule.
Subdivide the panel and drop the quads whose middle falls inside a hole, so
the edge is square by construction and nothing has to be sliced. Only the
climb's bay has them, and the coils are left off it, so the route reads from
the sand before you have taken a step: the fence is broken HERE.

**THE STAIR IN THE PAVILION CUT YOUR LEGS, AND IT WAS `Math.floor`.**
`models/` lays tread i CENTRED on angle `A0 - i*stepA`, its wedge spanning
half a step either side and its top face at `PLAT_TOP + i*STEP`; the walk
turned the same angle into a continuous tread index and took the FLOOR of it.
Over the first half of every wedge those agree and over the second half they
do not — you are standing on tread i+1 and the floor under you is still tread
i's, a whole STEP (sixteen centimetres) below your feet. That is the stair
cutting your legs and the low view walking down, and it was true of every
tread in both directions.

`Math.round` — the tread you are on is the NEAREST one — and the height is
the tread's own top face rather than that plus a fudge. The ease came up with
it: a step is a footfall, and at a fifty-millisecond time constant a
continuous descent never catches up and rides half a step under the stair the
whole way. Measured by raycasting the drawn tread under the player at every
station from the room down to the platform: the feet land on the timber
**0.00 off, all thirty treads**.

**AND THE CREDENZA STOOD THROUGH THE GLASS, WHICH IS THE OTHER HALF OF A RULE
THIS FILE ALREADY HAD.** For a wedge whose centreline is its local +X — a
stair tread — `rotation.y = a - PI/2` is what sends that centreline radially
outward, and there is a note here saying so, written when the pavilion's
stair came out mirrored. **A CREDENZA IS THE OTHER SHAPE.** It is 1.90 along
its X and 0.46 through its Z and it has to stand ALONG a wall, so what must
point radially is its DEPTH: `rotation.y = a` sends local +Z to (sin a,
cos a), which is the game's own radial direction, and leaves +X on the
tangent. Turned the tread's way instead, the metre-ninety ran radially —
measured, from 4.30 out to **5.75 against a glass line at 5.60**, so fifteen
centimetres of it stood outside the building with the sea behind it. After:
4.30 to 5.15, clear by 45 cm. Ask which of a box's own axes is meant to point
at the wall before reaching for either rotation.

**AND A BOX NOBODY LOOKS IN IS A BOX NOBODY FINDS.** The first jewellery case
was 26 cm of dark rosewood with a dark lining, standing on dark teak, in a
room with no lamps in it — four dark browns at one level, and the one thing
in the pavilion worth crossing the floor for was the least visible thing in
it. It is 36 cm now, the lid stands nearly UPRIGHT so the open box is a
silhouette rather than a slab, there is a brass rim and a satin cushion, and
what actually carries it from the head of the stair is **the inside of the
lid**: the one surface in that room the moon cannot reach, angled back at
you, and the only one allowed to be bright. Measured from the stair head at
5.2 m it is the only warm thing on that side of the room.

**MOOD IS WHERE YOU ARE, AND THE SKY CLEARS AT THE TOWER.** `MOOD_PLACES`
(the wreck, the body bag, the dock, the tall one, the pavilion, the mutants,
the portal, the catacombs' door, the marauder) pull the fog's tint and
density toward their own within about 80 m of each; near the lighthouse
`clear` thins the fog and takes the clouds and the veil out of the sky
(`uSqB.w`), so reaching it is the one clear night on the walk.

**THE INTRO HAS NO LIGHTHOUSE BEAM.** One was built (a screen-blended CSS shaft
reading `beamPivot`) and taken out on the owner's word: the intro is his waves,
his song and the name, and nothing else. Do not put it back.

**THE MOON AND THE LIGHTHOUSE HAVE RAYS ON THE BEACH.** The keep's
screen-space march was refactored into `shafts(p, R, T, N)` in the sharpen
pass with a second source (`uRay2`); `beachRays` drives both on the beach:
the moon (cold, `BEACH_RAY_MOON` 0.9, radius a third of the screen) and the
lantern (warm, `BEACH_RAY_LAMP` 1.3, brightening when the beam sweeps toward
you). Off in rooms and before the intro. They are drawn only where there is a
bright source on screen, so they cost nothing looking the other way.

**THE LIGHTHOUSE THROWS ONE BEAM.** Two back to back read as two rays crossing
the sky whenever the lamp was seen side-on. The second is gone, the beam turns
at 0.55 rad/s (past you every 11.4 s), its flash on the lantern is one-sided
(`max(0, dot)`), and `beachRays`' sweep reads the beam's own -Z direction.

**WHAT IS LEFT FOR NEXT TIME:** the lighthouse's spiral stair is 397 separate
meshes drawn whenever the tower is in view (about 400 of the ~770 draw calls in
Castle XIII's east court) — flagged as its own task.


## THE TOWER AND THE HEADLAND, REDONE (2026-10-09; the owner: "everything about the lighthouse looks like AI slop … make it the best moment in the game")

**What was wrong**, rendered from the castle's back door: a smooth untextured
cone (flat colour + vertex weathering) on a smooth sand lump, eighty metres
from two photoscanned castles. Nothing on it was drawn.

**The skin** (`lhWallMaps`, 1024×1536, u round / v up, made behind the title
card by `warmStep('lhskin maps')` — the name is OFF the reach table so it runs
first; ~2 M pixels of noise is not for module time): coursed rubble under
lime render that has flaked off low down, under the sills and under the
gallery drains; rust run from the twelve astragals, grey-green under the
windows, algae and damp round the foot, salt-bleach up top, lichen, cracks,
and the bitumen band round the base. Colour + height→normal + roughness.
Lessons: the courses showing through the render at 0.2 of the stone relief
read as painted bricks — 0.06 is "faintly"; bare stone drawn at 118 grey
read as holes at night — 152 and fewer patches; `artCanvas` is a const
declared at the end of the module, so the texture code has its own
`lhCanvas`; `vertexColors` weathering kept but softened (0.74–1.0).
**Dressings** (`lhdress` section, all `ashlar`, box UVs scaled to the box via
`boxUV`/`boxUVi`): window sills, jambs, lintels and iron bars; a date stone;
two steps; 22 corbels and a moulding under the gallery; the string courses
and the footing in ashlar. The door's OWN surround (jambs, lintel, hood,
further down the file near `lhDoor`) was the dark navy frame in every shot —
it is ashlar now too; my duplicate jambs were inside it and are gone.
**The headland** (`headlandAt`): a level top (|x| ≤ 5.5 sea / 8.5 land), a
SCARP on the sea side (0.85 power over 6 m), a gentler land fall (10.5 m), the
back slope the lane climbs (z 14–50), the point broken off beyond the tower
(z −9 to −30), knuckles of rock in the height on the scarps. `headlandSlope`
(gradient) is a vertex attribute `aS`; the ridge shader picks sand (toe) /
heath / rock by height and slope, sampling `hlGrassMaps` and `hlRockMaps` in
WORLD metres (1×1 DataTextures until the warm lands). The rock's cellular
pattern at 2.3 m read as a honeycomb — 1.25 m, 9 points, cracks broken by
noise, and rock only past slope 0.46. Heath under moonlight wants to be dark
and cool (tint 0.68/0.76/0.90), not lawn green.
**Dressing** (in `lhDress`, far-culled at 320 m): 64 mossy rocks (the
wreck's, already shipped — `onMossyRocks` via `queueMicrotask`, the `let` is
declared later) sunk into the scarps, the point and the toe; ~800 grass
clumps (`grass-clumps.glb`, a second `bwGlb` — the fetch is cached) with a
much higher emissive than the pavilion's: a card in the open at night is a
black spike otherwise. The lane: 29 stone treads on the steep stretch (one
wherever the ground has dropped a riser), flags on the top, iron stanchions
and a sagging chain down both shoulders; the path runs on across the sand to
the castle's back door (`PATH_LEN` 76, `pathBend` swings 10.4 m toward it).
**The keeper's cottage** (`hl_cottage`): stone, slate, chimney, quoins, a
plank door and ONE lit window, facing the lane (−x of its own frame — the
first build faced the castle). Walls carried down on a plinth to the ground
at every corner. In `lhDress`; solid by three cylinders in `rockColliders`
(pushed from a microtask: declared later).
**The arrival** (`lhBeamFind` / `lhBeamStep`): coming out of the castle's
back door (`placeOutOfFort('back')`) the beam comes round at 1 rad/s, holds
on you for 3.8 s brighter, and goes on turning from there. Measured: on you
at 2.0 s, released at 6.2 s.
**Harness**: `tools/lhshot.js` — `__lhSetup()`, `__lhSheet([[x, y|null, z,
lookX, lookY, lookZ, fov, label]…])`; y null = eye height over `headlandAt`.
A camera BELOW the ground is inside the grass, and the grass fills the lens
as "floating black shapes" — three of the first sheet's faults were that.


## THE LIGHTHOUSE IS AN ISLAND NOW (2026-10-12; the owner: "use this model to replace the lighthouse completely … dont treat this like a diorama")

Jake.Hatt's "Lighthouse Diorama" (`assets/lighthouse-isle.glb`, 9.4 MB) is the
lighthouse; the generated tower, its headland, lane and cottage are retired.
Section "The lighthouse island" (near the well's). Harness: `tools/isleshot.js`
(`__isle.boot()`, `__isle.sheet(views)`, `__isle.goto(x, z, secs)`), and
`__bw.isleS()`, `isleReset()`, `placeOnIsle()`, `isleStartCut('up'|'down')`.
- **Placement**: the model at 0.15, turned half round (`isleW(mx, my, mz)` =
  (ISLE_X − mx, ISLE_Y + my, ISLE_Z − mz)), ISLE (−1, 22, −1164): terrace toward
  the first castle, stair and jetty to the sea, jetty deck 1 m over the swell,
  terrace ~19.5, top deck ~26.9, gallery 41.0. Castle XIII's walls are east of
  it (x ≥ 14). Left out: water, ring, fish, flying birds, and ONE tree
  (`OptimizedTree__12_`) that stood between every good terrace spot and the tower.
- **The old tower's light is kept and moved** (`isleMoveLight`): the burner,
  glow, halo, lamp, beam pivot and the "put your hand on the light" proxy stay
  in the `lighthouse` group, which is moved so they sit in this lantern; every
  other child is REMOVED (hidden ones came back: the fog cull splits the group
  into units and shows a unit in range), `lhLights` removed, its far-props
  dropped, and every interactable under the group but the proxy taken off.
  `lhBeamStep` aims from `lighthouse.position`. `headlandAt` returns 0;
  `updateTower` is not called — `updateIsle` replaces it and MUST reset
  `groundY = 0` first (the old walk did, every frame, and everything after only
  raises it).
- **The tower's profile was measured about the LANTERN's axis**, not the
  shaft's vertex centroid (a window's extra vertices drag that 0.36 m off; the
  first profile read 1.98 and the brick stood OUTSIDE the skin): foot 2.58 →
  2.02, a ledge, 1.61 up to the cap, inner face 1.33. Bore = outer − 0.30, so
  1.31 up the shaft: tread 1.22, rail 1.14, pole 0.07, and the body inside is
  `ISLE_BODY_R` 0.25 (the beach's 0.4 left 55 cm to climb in).
- **The doorway is cut by subdivision** (`isleCutGeo`): every triangle near
  the opening split on its longest edge to 10 cm, then those with middles
  inside dropped; the model's inner shell is stripped (r < outer − 0.15). A
  stone frame and a plank door over it; the door's leaf is `bwGhost` (the wall
  index is built with it shut — it was a permanent wall).
- **The floor is the deck, not the flare**: the boards round the tower are at
  model 4.88; the flare's foot is 0.9 m lower under them.
- **Inside**: lathe of the bore (left open at the door), COOL brick 0x8f98a8
  and near-white lamps (warm went one red, as the old notes said), instanced
  treads and balusters, one tube rail, a ladder from the top tread (2.15 m
  under the ceiling) to a lit hatch. "Climb up to the light" / "Climb back
  down" are cuts (`isleStartCut`): the model's lantern is a metre across and
  full of lamp. The gallery is the model's disc widened by a grating ring to
  2.6 m with an iron rail, clamped r 1.37–2.28.
- **The walk is a SITE** (`ISLE_SITE`) like the castles': floors rasterised
  from upward faces at load (`isleBuildCells`, 20 cm, rock cells written empty
  = walls), walls from drawn faces (`fortWallsStep`). Traps found:
  - a crack between planks is a row of floorless cells = an invisible wall; a
    hole whose opposite neighbours have floors is filled, and the boardwalk
    has a hidden walk slab;
  - the model's cliff stair has 1 m risers at this scale: its footprint is a
    RAMP in the plan (`ISLE_RAMPS`) and every triangle OVERLAPPING it (not
    centroid — a beam across the flight had its middle outside) is cut from the
    walls (`cutTri`); the island's step is 0.62;
  - the cut down the ladder sets the walk's last spot on the stair: leaving by
    the door resets it to the doorstep, or the walk snapped you back inside.
- **(The boardwalk from the sand is gone — 2026-10-13, see below.)**
- **Arrival** (2026-10-12): `placeOnIsle()` at `ISLE_SPAWN` (model −5, −9.5),
  found by raycasting the terrace for: the lamp at the stair head clear, canopy
  overhead, the tower clear over the shoulder. Superseded on 10-13: the
  throne room's lattice door puts you on the drawbridge (`ISLE_ARRIVE`).
- **Saves**: a position on the island restores through `isleRestoreAt` (the
  stair and the gallery too); before the model lands it is held (`isleHold`).
- The music cues within 7 m of the door at deck height (`doorHeard`).
- Rock: its map is pale; with the scans' lift it read as ice from the sea —
  colour 0.62 and no lift.


## 2026-10-13 — one road, the drawbridge, and a walk made for a hill

The owner: "i left the second half of the castle to go back to the first and
ended up at the light house … it should go the first castle with the farmer
fight, then to the x111 part of the castle, to the throne room, then to the
lighthouse this should never change … the same in reverse order … the
lighthouse sections is insanely laggy i fall through the floor and when
changing elevations i stutter like the catacombs did … the stone stairs …
very laggy … dont make the water cover that pier section … remove the
lantern from the well".

- **WHY XIII LED TO THE ISLAND.** XIII's way out was `startFort(-1, 'back')`
  → `placeOutOfFort('back')`, the first castle's back-door EXIT — and on
  10-12 that exit was given to the island. One placement shared by two doors
  changed both. **Every door now names its own destination**:
  fort gate ↔ beach; fort back door → `startFort(1, 'c13')` only (c13Ready);
  XIII "Back to the first castle" → `startFort(1, 'fromC13')` →
  `placeInFort(fortBackInside())`; XIII's arch → throne; throne near door →
  XIII court (`placeOutOfThrone`, its !c13Ready fallback is the fort's back
  door now); throne lattice door → `startThrone(-1, 'lh')` →
  `placeOutOfThroneToLighthouse()` → `placeOnIsle()` (the black HOLDS while
  `!isleReady`, re-pinning `thrT`); island postern → `startThrone(1, 'isle')`
  → `placeInThrone(true)` at `THR_EXIT` − 1.7 m, facing down the hall.
  `placeOutOfFort('back')` has no caller; the postern outside the fort's back
  wall is "The door is barred from inside." (`bare`), so nothing on the
  beach goes round the castles.
- **THE DRAWBRIDGE** (`ISLE_BR`, `isleBridge`): the boardwalk from the sand is
  gone; the island's only link is a deck from the terrace lip (x 6.7, the
  rock there 20.0–20.4) to XIII's west tower face — measured by raycasting
  XIII from the island: a flat face x 18.3–19.0 across z −1155.5 … −1151.3,
  4 → 26 m high — at y 20.05, z −1153.4. Planks, stringers, posts and two
  rails; raking struts to the rock's lip (x 10.55, y 17.1); braces into the
  wall; two chains from eyes 4.7 m up the tower to the fourth posts; a stone
  postern (frame `rotation.y` −π/2, local +Z → −x) with a plank door and a
  caged lantern (point light 5.5 / 9 m + glow sprite). The walk reads only
  its hidden slab (`BR.slab`); the rails and the closed door are walls; past
  the slab's end there is no floor, so the tower face needs no collider.
- **THE FALL THROUGH THE FLOOR was two things.** (1) The walk allowed any
  drop under 2.6 m (`ledge`), and a cell in a crack between boards over the
  rock was NOT empty — the rock was in it — so the old fill (empty cells only)
  never touched it and the walk read the rock a metre or two down as a step
  you may take. Now a stride may only go `ISLE_FALL` (1.1 m) below the LAST
  floor stood on (`isleLastFloor`, not the feet — mid-jump the feet are high),
  and the fill tests the TOP floor: a cell lower by > 0.25 than both of its
  neighbours across it (1 or 2 cells away, agreeing within 0.35) gets their
  floor, three passes. (2) The wall index was built 5 ms a frame AFTER you
  arrived, and until it existed the walk held your floor and let you walk
  anywhere — off the rock into the air. `placeOnIsle` and `isleRestoreAt`
  finish it behind the black (`while (!fortWallsStep(1e9, ISLE_SITE))`).
  The beach exit (`toBeach`) and the beach-side step-on are gone too.
- **THE STUTTER** was the catacombs' (`docs/notes/perf.md`, "THE SLOPES SHOOK
  BECAUSE THE GRID IS TREADS"): `isleFloorSmooth` blends the cell toward its
  x, z AND diagonal neighbours (true bilinear, so a slope across the grid is a
  plane), only toward one within a step; legality reads the raw cell. In
  `update()`, `onIsle` joins the whale and the keep: on the ground going down
  ≤ 0.7 m the eye is EASED down (snap under 8 cm, else 16/s with a 2.4 m/s
  floor), and a step up over 8 cm is eased at 16/s. The cliff stair (a 51°
  ramp, 15 m over 12) is walked at `1.12/√(1+g²)` of the stride (≥ 0.55) when
  the blended rise over the stride is > 0.5.
  Measured on the fake clock (`__isle.track`): bridge → terrace → walkway →
  tower door: frame-to-frame change in the eye's vertical speed max 4.9 cm,
  0 over 7; down the stair to the jetty: two over 7 cm, both the 0.7 m step
  off the stair's side onto the jetty. 36 random walks, 9,927 frames: no
  fall over 0.9 m, never off the island, 13 frames over 7 cm (all eased
  ledges, worst 19 cm).
- **"LAGGY" WAS NOT THE FRAME.** Measured with `Date.now` (the harness fakes
  `performance.now` — 16.7 ms a `__cadv` whatever happens): the walk ≤ 0.9 ms
  a frame; the render 6.7 ms in the pane with 588k triangles / 226 calls, of
  which the island 2.6 ms and the two castles behind it 3.4. It was the walk.
- **A TREE IS ITS TRUNK** (`isleFindTrunks`, `isleTrunkPush`): `Bark` is
  skipped by the wall index. The terrace's big tree spread body-height boughs
  2 m round it, and its leaning, half-cut trunk was a ring with gaps — the
  test walker went INSIDE it and could not leave. Trunks are discs: bark
  triangles whose lowest point is within 0.5 m of the floor and which reach
  0.9 over it, their vertices under 1.1 m clustered at 0.9 m, the radius
  holding 80 % (0.12–0.55). 11 found; the big tree is two discs.
- **THE JETTY STAYS DRY** (`ISLE_LEE`, read by `waveHeightJS` and spliced
  into `waveGLSL` as numbers — it is declared at line ~2900, long before the
  island's constants): the swell × 0.10 within 22 m of (−15, −1150), all of
  it by 52. Over 200 s of swell the water at five jetty points peaked at
  −0.07 against boards at 0.41–0.73; out at sea 1.8–1.9.
- **THE ROOMS' FLOOR IN A CUT.** `updateIsle` zeroed `groundY` every frame,
  and the throne room's walk skips the frames its door's black comes down
  (`thrBusy && !thrCutDone`), so the eye sank 2 m through the hall floor as
  the screen went dark. The zero is only applied out on the beach now
  (`!inRoom() && !inFort && !inC13`): measured 0.004 after.
- `loadIsle` now logs a load failure: `bwGlb` swallows a throw in its
  callback unless it is given an `onError`, and the island simply never
  became ready.

## 2026-10-13 (later) — the lift, the passage, the stair as a corridor

- **"USE LIFT".** The throne room's way out is both lattice doors either side
  of the dais (x ±6.45, z −2), labelled "Use Lift"; the island's postern says
  it too. The cut is longer for the lift (`thrTo` 'lh' / 'isle': HOLD 1.9 s,
  197 frames in all) under `sfxLift(up)` — the gate dragged, the cage's
  lurch, chain over a sheave with the drum's grind rising or falling, the
  clunk, the gate. Back from the island you come out of the marauder's
  RIGHT-hand door (x −4.5) — unless the beast still stands chained on that
  side (`danteAlive()`), then the other. NOTE for tests: arriving with the
  beast alive starts his chain cut (`thrCut`), and `startThrone` refuses while
  it plays (`frozen()`) — 225 frames; that is the scene, not a bug.
- **THE STAIR IS A CORRIDOR.** The owner's two screenshots were taken from
  BESIDE the flight: the rock either side climbs at 40° (0.8 slope) on the
  jetty side, under the step of 0.62 a cell, so you walked up next to the
  stair and looked at its side or into it. Three things:
  - `isleBuildCells`: within 3 m of the flight, ground more than 0.8 m below
    the stair at the same z (and over 1.2, so the jetty stays) is written as
    rock, not floor;
  - `flank(x, z)` in the walk: on the ramp you stay 0.25 inside its edges, off
    it you cannot come onto it over a side — only at its foot (z1 − 0.35) and
    head (z0 + 0.35); checked after the push-out too;
  - `ISLE_MAX_SLOPE` 1.15 (~49°), measured over the 0.8 m ahead, up or down,
    the ramp exempt: the step alone let you up 70° faces. The rock path from
    the terrace to the stair head runs at up to 0.75 and still walks.
  Measured: bridge → terrace → stair head → down → jetty; "beside L" stops
  on the jetty; stepping off the flight's sides is held at x −15.35/−17.85;
  up again; max frame-to-frame change in the eye's vertical speed 3.6 cm.
- **`placeOnIsle` hung the page** when called before the island had loaded:
  `fortWallsStep` returns false for ever on a site that is not `ready`, and
  the wall loop spun. Both loops are guarded by `ISLE_SITE.ready`.

## 2026-10-13 (third pass) — the stair's own treads, solid trees, the drawbridge on stone

The owner: "you ruined the steps to the jetty very badly i just want them
functional and not be able to clip through them … i got stuck on them. i
should[n't] clip through the trees on the lighthouse section either … make
the drawbridge look better too the bridge support doesn't even connect to the
land its floating."

- **THE STAIR RAMP WAS A GUESS, AND WRONG AT THE TOP.** Raycast straight down
  the flight (x −16.6): fifteen treads of 1.01 m over 0.70–0.80 m, tops 0.80,
  1.81 … 14.94, the landing 15.65 with its nose at z −1148.05; the flight is
  x −18.0 … −15.2. The old ramp ran 0.75 → 15.65 over z −1137.3 … −1149.3,
  so at the landing's nose it was 1.86 m UNDER the landing (the eye in its
  stone) and carried on 1.25 m beneath it, where the step up was three times
  a step: the walker was stuck at the head. `ISLE_STAIR_NOSE` holds the
  measured noses; `ISLE_STAIR_PROF` runs through each tread's middle 0.3 over
  its top (`isleRampY`), so the feet are at most ~0.23 under the next tread at
  its nose and never in it.
- **ON THE FLIGHT YOU ARE SLID, NOT STOPPED** (`rampHold`): the old `flank`
  refused any stride ending within 0.25 of an edge, so a body that came on at
  the foot near a side could not move at all. Now on the ramp x is clamped to
  0.32 inside its edges; `flank` only stops you coming ON over a side. The
  slope pace floor is 0.72 (0.55 was a crawl).
  Measured: up and down the middle, both edges, pushes sideways held at
  −15.52/−17.68; max frame change in eye speed 5.1 cm, 0 over 7.
- **BARK IS ITS OWN GRID** (`isleFindBark`, `isleBarkPush`). The trunk discs
  covered 11 trunks; 105 cells of bark between knee and head height had no
  collider (a fallen trunk, low boughs, leaning trunks). Every bark face is
  sampled every 12 cm and a 20 cm cell is marked where a sample is 0.3–1.85
  over `ISLE_M.floorAt` (≥ 2 samples, the stair and the drawbridge left
  clear): 588 cells. A body is pushed out from the NEAREST marked cell's centre
  to r + 0.1, three passes — round, so it slides along a row and never
  catches (the wall index still skips Bark: its twigs trapped the walker).
  Walked into eight trees: held 0.34–0.36 off; bridge → terrace → stair head
  → jetty and → the tower door still walk; 10 random walks, none trapped.
- **THE DRAWBRIDGE'S SUPPORT** (`ISLE_BR_PIER`): the struts ran to
  (10.55, 17.1) and the island's east face is a near-sheer wall at x 9.3–11.5
  from the deck down to 9 m (further out to the north; horizontal raycasts at
  dz −1.6 … +1.6) — 0.75 m of air. Now a buttress of XIII's brick
  (`acmat_4` at XIII's own scale) is extruded under the rock end: top 19.63
  under the cross beams, back x 7.6 buried in the rock, front 11.3 battered
  back to a knee (11.0, 17.6) and on to its foot (9.0, 10.5), inside the
  face. The struts land on its face (`strutTo(y)`, a hair inside it) on iron
  shoes; the tower end sits on a two-step stone corbel. The frame (stringers,
  cross beams, posts, rails, struts) is older timber, half the boards'
  colour, heavier rails; the chains are links (a torus every 7.8 cm,
  alternate ones turned, a slight sag), not rods.

## 2026-10-13 (fourth pass) — the end of the road, lit; the crate; the posts

The owner: "make the lighthouse scene way more breathtaking its the end of the
game so it should look magical the view from the top should be a spectacle …
take out the crate on the jetty steps and make sure the light posts aren't
floating either."

- **`updateIsleMagic`** (called first thing in `updateIsle`) eases
  `isleMagicK` to 1 over ~4 s while `onIsle` (or high over the rock), and
  `isleTopK` on the gallery (0.25 in the tower). Both are declared up by
  `moodTint` because the mood reads them: `clearW` takes `isleMagicK` (the
  cloud goes), the fog × (1 − 0.62 k − 0.28 top), the tone a little brighter
  and colder (kept small — at +26 % blue the rock read as ice), the beam's
  `uI` × (1 + 0.55 k).
- **`isleMagicG`** (one group, compiled with the boot chain by a top-level
  `warmStep('isle magic')`, all additive, no lights, `fog: false`):
  - a dome r 3000 on the camera, `renderOrder` −1: horizon airglow; the
    Milky Way (a great circle, normal (0.42, 0.40, 0.81), clumps and dust
    lanes off `imF`, a warm core); fine stars (a hash per cell of d × 380,
    denser in the band, each twinkling); the aurora — three `curtain`
    layers over the sea (masked ±1.85 rad round west, az = −π/2), feet at
    sin-elevation 0.05–0.20 wandering by ±0.08, folds, soft rays, green at
    the foot to violet up, thinning unevenly going up, and the sky under it
    lit green. FIRST PASS LESSONS: a narrow foot (0.016) and full-contrast
    rays read as a hard line with bars; the violet at 0.55/0.16/0.85 was a
    wall of purple.
  - a halo sprite (glowTex, 1400) on the moon's direction.
  - Points (`isleMagicPoints`, size in metres off `projectionMatrix[1][1]`):
    150 fireflies anchored on `isleTrunks` and every ninth bark cell, 520
    sparks on the water 14–164 m round the axis (`waterSurfaceAt` each frame,
    dropped where `ISLE_M.floorAt` or `!inWater` — east of the rock is the
    beach), 210 lanterns over the sea to the west (45 % within 26–156 m,
    rising 0.9–2.2 m/s from the water, gone by 420 m, respawned). Lanterns at
    first were 1.1 m and a 1.5 px floor: five dim pixels; now 3.0 m, 5 px
    floor, a bright paper body.
  - a falling star (a two-point Line, every 5–14 s, faster from the top).
  - the wind at the top: looped brown noise through a wandering band-pass,
    gain 0.55 × top × gusts, on `sfxOut()`.
- **The sea goes glass** (`oceanUniforms.uCalm` = k): crests × 0.15, the
  steep facets × 0.3 (from forty metres up they were blots once the fog
  thinned), the water × 0.72, and at a grazing angle it holds the aurora's
  green to the west.
- **`isleTidyPlan`** runs on the model's pieces before the merge: drops the
  crate on the stair-head landing (−17.0, −1150.0; it stood 0.23 off the
  stone) and the one buried in the flight's side (−18.2, −1139.5), and sets
  every lamp post (a `props` piece over 3 m tall and under 0.45 across) with
  its foot and its glass down onto the floor raycast under it (0.24 m at the
  stair head, 0.59 on the terrace path, 0.09 by the house) — never up.

## 2026-10-13 (fifth pass) — the postern is the throne room's door, on the real wall

The owner: "fix the door to the drawbridge make it match the throne room exit
door please and its clipped through the wall fix it."

- **XIII's west tower face is 9.4° off the bridge** (horizontal raycasts at
  seven heights: x 18.36 at z −1151.2 → 19.09 at −1155.6). The postern, the
  chain eyes, the corbel and the tower braces were all square to the bridge,
  so the frame stood inside the stone on one side and off it on the other.
  `ISLE_WALL`, `isleWallX(z)`, `ISLE_WALL_N` (out of the face) and
  `ISLE_WALL_YAW` place them on the face; the deck now ends at x 18.15
  (`ISLE_BR.x1`), the postern's step.
- **`isleFitThroneDoor`**: the throne model's `Doors.001` triangles of its
  +x lattice door (centroids x 5.6–7.0, y 2.4–6.4, z −3.4 … −0.5 of the hall;
  the door itself x 6.10–6.51, y 2.68–6.05, z −2.99 … −0.96), baked through
  `matrixWorld`, moved to its back/foot/middle (6.51, 2.68, −1.975),
  rotated +90° about y (the hall's −x → the postern's +Z) and 4 cm into the
  stone, on the hall's own material. The bridge's stone surround
  (`BR.surround`) is hidden then; the lantern, its light and its glow sprite
  move out 0.2 and up 0.6 past the door's post.
- `loadIsle` now calls `loadThrone()` so the door is in before you can see it
  (and a checkpoint's black waits for it). TRAP: `isleWorld.userData` is
  REASSIGNED a few lines after the bridge is built — anything stored on it
  before that is lost; `BR` is in the object literal.
- Walked: the deck stops you at x 18.20, "Use Lift" in reach.

## 2026-10-13 (sixth pass) — mist and rays at the lighthouse

The owner: "make the lighting more misty and gorgeous with rays of light at
the lighthouse it should be incredible."

- **Sea mist: the keep's own layer** (`FOG_KEEP`/`FOG_KEEP2`,
  `bwMistDepth`/`bwMistCol` in the fog chunk) laid on the sea at the island:
  `FOG_KEEP.w = isleMagicK × ISLE_MIST.on`, the moon's direction, the sea's
  height, scale height `ISLE_MIST.h` 4.2 m, density `ISLE_MIST.d` 0.020
  (breathing ±25 %). The keep's branch now sets `FOG_KEEP2.z/w` back to its
  own 2.9/0.13 — the island writes them. The keep's lit-fog glow toward its
  moon was on at full whenever `w > 0`; it is × `min(w, 1)` now (the keep is
  1, unchanged), or it popped in on the first frame of the island's fade.
  First try (5.5 m, 0.032) with the rays at full blew the look up the stair
  toward the moon to white.
- **Haze back in the air**: the island's fog factor is
  1 − 0.30 k − 0.12 top (was 0.62 / 0.28 — the owner wanted it misty).
- **The screen's own shafts** (`beachRays` in the sharpen pass: the moon and
  the lantern): at the island the moon's × (1 + 1.3 k), radius + 0.06 H,
  threshold −0.02, silver; the lantern's × (1 + 0.8 k), radius + 0.04 H,
  threshold −0.08, warm. (2.4 / 0.22 H washed the frame.)
- **The beam**: `uI` × (1 + 1.25 k); the beam's shader takes `uT`/`uPow` and
  a slow drifting "dust" along it; a second cone, `beamPivot.userData.haze`
  (r 1.2 → 190, `uPow` 1.1, cool white, `uI` 0.055 k), so it stands in a sheet
  of lit air.
- **Lamp halos**: a 5.5 m glow sprite on every island lamp
  (`isleLampHalos`), 0.20 k.
- **Moonbeams** (`isleBeams`, 10): open cones r 7 → 15, 190 m, leaning 24–37°
  toward the moon, standing on the sea 70–450 m round the rock (mostly west
  and the moon's side); soft at their silhouettes (|N·V|^1.7), fading into
  the sky above and the mist below, dust in them, faded out within 45 m of
  you; each breathes in and out over 22–48 s and stands somewhere else.
  Strength 0.09–0.17: at 0.02–0.04 they did not show at all.
- `tools/isleshot2.js` → `__isle.sheetPost`: the sheet with `sharpenFrame()`
  run after each view — the rays are in that pass, a bare render has none.
