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

