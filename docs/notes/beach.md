# The beach: sand, sea, sky, fog, caches, set pieces

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.


**World axes.** You walk **down the beach along -Z** toward the low moon
(`MOON_DIR`). The **ocean is toward -X** (your left); the dry beach is +X and
ends in a **sand cliff**. The player is a bare camera clamped between two
invisible walls: `WADE_X` (into the surf) and `CLIFF_BLOCK_X` (foot of the
cliff) — both are clamps on `camera.position.x`.

**"Infinite" = recentring tiles.** `sand`, `ocean`, the `debris` group and
`cliff` are large meshes snapped back onto the player every frame (sand/ocean
in X+Z, debris/cliff in Z only, to `DEBRIS_TILE` / `CLIFF_PERIOD`). Nothing
actually scrolls. All water/shoreline motion is computed in **world space**
in the shaders (`shoreLine(z,t)` in `shoreGLSL`), so recentring is invisible.
The `lighthouse` and the `castle` are the exceptions — fixed world objects.

**Shaders.** `noiseGLSL` / `shoreGLSL` / `waveGLSL` are string fragments
shared between the ocean `ShaderMaterial` and the sand material's
`onBeforeCompile`. The sand shader discards fragments seaward of `shoreLine`
so it never overlaps the water; the ocean discards fragments landward of it.

**A Sketchfab scan split into "Object_0..N" is CHUNKS, not LODs.** They all
carry nearly the same bounding box and the triangle counts fall away like an
LOD chain, which is exactly what it looks like — but the splitter walks the
triangle LIST, not the surface, so each chunk is a scatter of triangles over
the whole model. The octopus ring arrives as seven chunks of one
400k-triangle mesh; taking the smallest as if it were an LOD renders as a
cloud of specks (15 % of the surface), and taking the next one up renders as
a denser cloud of specks. `gltfpack.py --decimate N` is the answer: it merges
every primitive in world space and vertex-clusters the result down to a
budget, which welds instead of dropping. If a packed scan renders as speckle,
check `verts` — 65532 is the tell.

**The deck STOPS you; it never moves you.** Pushing out along the nearest
legal face flung you the width of the pier — walk in from seaward and the
sea end was the only face left, so you were shoved five metres sideways. It
reverts the frame's movement instead (`_preMove`), and where there is
nowhere legal to revert TO — at the sea end the `WADE_X` clamp pins you at
x = -2.4, which is inside the footprint — it ducks you instead. A person
under a low beam crouches; `headroomClear()` already refuses to let you back
up until you are out.

**The push-out and the step-up must use the SAME tolerance.** `rockGroundAt`
lifts you onto anything within `ROCK_STEP` (0.42) of your feet, so
`pushOutOfSolids` has to stop treating those as walls — at 0.06 a stair
tread you were meant to walk up shoved you back off it, and the pier's steps
were unclimbable.

**The sea hides what it covers, and the seabed is ABOVE the sea.** Gibs,
blood and puffs went on drawing under the water — bright specks lying on the
bottom with a wave running over them. `coveredByWater(x, y, z)` is the one
test they all ask, and the thing that makes it work is a margin: the seabed
is the sand plane at y = 0, but the drawn ocean sits at -0.34 with waves
around it, so a clod at rest on the bottom is really a third of a metre
ABOVE the surface you can see. Comparing its y straight to the wave height
hid nothing at all. Blood also stops staining once it lands in water, and
puffs are an InstancedMesh so a drowned one is scaled to zero rather than
hidden.

**A dropped thing goes where you were LOOKING, on top of what is there.**
`dropEquipped()` set the item down at a flat y = 0.04 — the sand plane — a
metre in front of you whatever you were standing on, so on the pier it went
UNDER the boards and on the drift it went inside the mound, and either way
it was gone. `dropPoint()` raycasts the crosshair at the boards, the steps,
the banks and the beach, and `groundUnder()` is the fallback: `driftAt`,
then the deck, then the solids.

**A shell you cannot hear is not a shell, and static is not the sea.** The
first pass put the cavity through two bandpasses at Q 7.5 and the whisper
bed at 0.055 — a filter that narrow throws nearly all the energy away, so
holding it to your ear got you silence. The second was four wide layers of
resonant noise, and the third was "waves" of filtered noise with a crash
and a hiss; the owner heard static in both, and he was right: AT THE EAR,
ANY BROADBAND HISS IS A RADIO, however it is shaped. So `listenToShell()`
has no white noise in it at all. The sea is BROWN noise under a 140 Hz
lowpass — a rumble with nothing above it to hiss — heaving slowly; the
shell is a hollow note, two soft sines a fifth apart with a slow waver;
under both a 47 Hz sub that breathes; and twice, far off, a low triangle
call that slides down and is gone. The whispers sit under it (gain 1.6
now that everything else came down). `SHELL_LEVEL` is 0.40. Measured on
the SFX bus with an analyser: what the shell adds is 96 % below 300 Hz and
the 4 % above 1.5 kHz is the whisper track itself.

**Three shells, not seven.** A shell is a find, not litter; they are at
z = -12, -163 and -319, the same stretch seven used to cover.

**Whatever leaves your hand goes quiet.** `toggleEquip()` calls
`stopListening()`, which kills the roar source, the whisper element and the
timer on the same frame; the shell used to run its nine seconds out whatever
you did. Under the roar is the whisper bed, filtered to almost-words at 0.055
gain. A spoken word ("lighthouse", via `speechSynthesis`) was tried there in
Sep 2026 and cut: a voice saying something specific is a different thing from
a voice you are not sure you heard, and the shell wants the second.

**The shells are a scan** (`assets/shell.glb`, blenderboom's, 11 cm at true
size and laid down at 2–3×). The placement and its interactables run in the
loader callback. Holding one to your ear is `listenT` in `updateViewmodel()`:
the arm blends to `EAR_AT` / `EAR_POSE` while `listening`, with the look-lag
mostly off on the way there. `__bw.listen(v)` flips the state without audio
for the preview harness.

**Ground surfaces have to match in FOUR things, not one.** The headland ridge
read as a pale oval sitting on the beach, and matching its base colour to
`sandMat`'s fixed almost none of it. What the beach actually does near the
water is: darken (`wetMask` tint), *and* drop `roughnessFactor` to 0.30, *and*
raise `metalnessFactor` to 0.22 — smooth and slightly metallic under one
directional light at night is most of why wet sand reads dark at all. The
ridge now runs the same four steps, weighted by `(1 - grass)` so the dry crown
is untouched. Its uv is baked in WORLD space at the beach's own density —
`(wx + 800) / SAND_TILE` — because the sand plane recentres by whole multiples
of `SAND_TILE`, so the phase is preserved and the grain lines up across the
join. The cliff toe gets the same treatment through `aU` (0 at the toe, 1 at
the top). **The toe IS the beach** (Sep 2026): over the bottom band the cliff's
shader converges on `sandMat` exactly — colour and emissive scaled by the
ratio of the two materials' own constants (uniforms, not a guessed tint),
the map and emissive map sampled in WORLD space at the beach's density and
phase `(w + 800) / SAND_TILE` so the grain runs straight across the join,
the beach's wet treatment off `shoreLine`, and the bump eased toward
`nonPerturbedNormal` — and the loft's first row is sunk 12 cm under the sand
plane, so there is no edge to dither and the hash dissolve is gone. Matching
the material was not enough on its own: with a 3 m apron the surface turned
from flat to wall fast enough that the LIGHTING change read as a line. The
toe is a 5.5 m TALUS now (t³ — under 12 cm where you can still walk, rising
only in the last stretch), the beach's shading runs to `aU` 0.48, well up
the face, and the beach grain is projected flat where the surface is flat
and stood up (z, y) where it turns into the wall — one projection down a
vertical face streaks. Before this the join was a line you could see from
the spawn.

**A cache is a MOLEHILL, not a bump.** It was a smooth half-sphere in one
flat colour, and tan on a blue beach it read as painted-on plastic. Real
turned earth is loose CLODS: `lumpyDome()` displaces the dome per vertex
(the rim left alone so it still meets the sand), two overlapping lobes make
a pile rather than a bump, and fourteen dodecahedron clods lie round the
foot thinning outward so the heap crumbles into the beach instead of ending
on a line. Flat-shaded, because every facet catching the moon differently is
most of what reads as loose. It also wears **the beach's own grain** —
`sandTex` cloned so it can carry its own repeat (the beach's tiles over
eight hundred metres, which on a one-metre heap is a smear); flat colour on
a lumpy dome read as moulded plastic however the tint was chosen. And the
map MULTIPLIES, so the body has to be lifted well past the tan you actually
want or it comes out olive — dark brown reads as something a dog left.

**"New Cd" is in the SECOND mound** (`mounds[1]`, not the second one you
happen to dig — the same rule the glowstick's `mounds[0]` uses).
`models/cd-case.js` builds a jewel case to the real 142 x 125 x 10 mm shape:
clear lid and shell, black tray, the disc, hinge teeth down the spine, and
the inserts front and back. **The sleeve is the OWNER'S OWN ARTWORK** —
photographed, then rectified out of the three reference shots by a
four-point perspective transform. **A CD case STANDS UP** — 125 mm across
by 142 mm tall — and having those the other way round laid the whole thing
on its side and turned both faces of artwork through ninety degrees; both
inserts are upright, at the aspect measured off the photographs. The
photographs are also shot THROUGH the case's own lid, so each carries a
broad sheen: dividing by a heavily blurred copy of itself takes the
low-frequency lighting out and leaves the ink, and without that step the
sleeve is a washed-out smear rather than the drawing. Two more things
matter. **The front booklet is SQUARE** — 120 x 120 mm — and the tray card
behind it is taller than wide; forcing both to the case's own portrait shape
stretched the cover by a twelfth, which is exactly enough to see. And the
inserts take **`MeshBasicMaterial`**,
because a photograph already carries the light it was shot in and lighting
it twice left the sleeve muddy at night and chalk under the examine lamps;
and the lid sits at opacity 0.11, because at 0.30 with full clearcoat the
polystyrene threw a sheen over the whole front and the artwork — the point
of the object — came out white.

**A buried cache has to look like something you would DIG.** `moundMat` was
`0x74809a` — the beach's own cold blue-grey — so a cache read as one more
grey lump on a grey beach and nobody dug it. Dry sand turned up out of a
hole is warmer than the wet flat it stands on, so the mounds and the spoil
`_sandMat` are tan and matte with a little lift to catch the moon. The
aprons and drifts are NOT this: they are the beach heaped up, they keep
`sandMat`, and a tan pass over them made the pier's bank and the castle's
foot read as painted discs.

**The cover is a name in plain white capitals over near-black.** (SUPERSEDED:
the cover is now a black screen with START GAME — see the end of this file.) Minimal
on purpose: a system sans, letter-spaced, edges eaten a little by a noise
mask so it reads printed rather than typed, three letters a hair off, and
nothing else on the screen but PRESS ANY KEY — then BEGIN / CONTROLS under
it. Behind it the LIVE beach, `titleCam()` drifting it slowly toward the
moon (safe because `update()` returns before `introDone`; the head-height
code still owns `camera.position.y`), turned almost all the way down by
`canvas.title-grade` so the moon's track on the water barely surfaces
through drifting smoke (a low-frequency noise sheet, screen-blended) and two
sheets of rising dust. **An SVG noise tile is only seamless if the filter
region IS the rect**: `feTurbulence stitchTiles` makes the noise periodic at
the filter region, and a `<filter>` defaults to 120 % of the rect at a -10 %
offset, so the period never matched the tile edge and a hard vertical join
stood in the fog right beside the W. Every noise filter here carries
`x='0' y='0' width='100%' height='100%'`. Two faces were tried first and cut — a horror
display face read as corny, and an olive Amnesia-style grade read as a
poster. The first press of anything is the gesture that lets the sea come
up; nothing begins until BEGIN. **And the press that reveals the menu must
not also press the menu**: pointerdown shows the list, the list is clickable
at once, and the click from that same press lands on whatever button is
now under the cursor — near the centre that was CONTROLS, so the sheet
opened on the first click. `menuArmedAt` holds the buttons off for 500 ms.

**The sea under the title is its own layer.** The walk's surf is a bed you
stop hearing; the menu wants waves you cannot not hear. `titleSurfGain` in
`startAmbientAudio()` is a lower, slower swell (bandpass 170 + a 95 Hz
rumble, an LFO rolling it in and back every ~13 s) into `waveBusGain`, ramped
up only while `!introStarted` and pulled down by `leaveTitle()`.

**The intro is one beat and a heartbeat.** All of it lands together at
0.9 s, is gone at 5.4 s and the world is up at 7.3 s. It used to arrive in
two beats nearly four seconds apart, which made the card outstay the line —
the second half is a closing thought, not a reveal, and `startIntroAudio()` runs a 41 Hz drone with a slow
tremolo under a heartbeat at ~51 bpm — a little too slow, and quiet enough
to be felt rather than heard — that `endIntroAudio()` kills as the beach
comes up. A line about "the thing that walks it with you" and a wave crash
on the cut were both tried and cut: naming the thing is less frightening
than the tide keeping its counsel, and the splash read as a bug.

**Digging.** `crosshairGroundPoint()` raycasts the crosshair onto `sand`.
`digImpact()` stamps `digHoles` (flat crater decal) + `digPits` (sunk 3D
cone) + `digMounds` (spoil), spawns `spawnPuffs()` sand chunks, and plays
`sfxDigImpact()`. Pools recycle after `DIG_POOL` (20).

**Opening.** Title card is bare "BEACHWALK" + controls. `beginGame()` (on
the overlay click) requests pointer lock *on the gesture*, then runs the
black `#intro` card: the line fades in, holds, fades out, world fades up,
`introDone = true`, music starts. `frozen()` includes `!introDone`.

**A BACKDROP YOU DO NOT NEED CAN ONLY COST YOU.** A dark BackSide shell was
built round the hall on the assumption that the gaps between the columns would
show the sky dome, which is centred on the player and therefore always there.
Standing in the middle and looking out at every bay says they do not — the
`wall` mesh closes the colonnade. The shell was also actively wrong: three
sorts opaque draws by distance to the object's CENTRE, and the centre of a
shell you are standing inside is a few metres away, so it went down before the
hall did and took the depth buffer with it. The whole arena rendered black with
a few floor lines showing through, and neither `renderOrder` nor
`depthTest: false` saved it. Deleted.

**AND `skipIntro` IS CONSUMED AT MODULE LOAD.** Setting
`sessionStorage['beachwalk.skipIntro']` and calling `beginGame()` in the SAME
tool call does nothing: the flag is read and removed while the module
evaluates, so a flag set afterwards is read by nobody, `beginGame` runs the
real card, and `introDone` never becomes true because the card is on the wall
clock and the pane's rAF is dead. Every measurement then reads zero — three
separate runs of this fight measured "the creatures never close" when what was
actually true was `frozen()`. Set the flag, RELOAD, and call `beginGame()` in
the next call.

**THE BEACH ENDS PAST THE MUTANTS, AND THE WAY ON IS UNDER IT.** `ROCK_Z`
(42 m past `MUT_Z`) is a heap of the first formation's own granite at four
times the scale — three masses whose colliders overlap the whole width,
two riding on top, chunks shed down the walk's side, the beach heaped
against it — built in the same `rocks.glb` callback with the same
`placeMass`. Thirty metres short of it (`HOLE_Z`) a round hole is cut into
the talus at the foot of the sand wall (a fourth chained discard on the
cliff's material; a black BackSide box WHOLLY behind the face, because
half a metre of it proud of the wall drew as black slabs), with a
`hitProxy` and "Crawl in". Through it is THE UNDERCROFT.

**AND THE WINDOWS HAD A SKY BEHIND THEM.** The scan hangs a lit backdrop
behind every window (`vitrail-fond*`) so the glass reads against daylight,
and forty metres underground that backdrop is six slabs of white burning
through the sanctuary wall — the blown-out patches round the apse. It is
dropped to almost nothing with a cold cast: a memory of a sky. The exterior
walls (`*-ext`), seen through the openings, are in the ground and go dark
with them.

**A HOLE IS A PLACE, NOT A PICTURE.** The ragged black disc on the sand
wall moved with you like a decal, and the owner said so: he wanted the
drain's outfall, in sand. So it is a BORE now — an open-ended tube of the
beach's own grain driven three metres into the dune behind the cut, its
walls knocked out of round in the geometry the way a thing dug by hand is,
its diffuse AND its emissive taken to black by the second metre in the
shader (take only the diffuse and the far end glows), and a black box
across the end so there is no end to see. Walk past it and the inside
parallaxes; that is the whole difference.

**AND WHAT YOU SEE THROUGH THE ARCH IS THE SAND WALL, NOT THE HOLLOW.** The
black behind the entrance was a cube inscribed deep in the rock's own cave —
measured, fitted, and completely useless, because the thing you actually see
through the mouth stands in FRONT of that cave: the cliff. Cast down the
mouth's own axis and the first surface is the dune at x = 16.08 against a
plug at 20.4, four metres behind it. So the owner put his face to a cave and
looked at a moonlit beach. The black goes BETWEEN the arch and the dune, and
how big it may be is a question about the STONE and not about the hollow:
swept live with the rock rendered near/deep by world depth and the box
rendered in and out, the largest box that never covers NEAR rock from twelve
approaches. Entrance 0.017 % of the frame, exit 0.002 %. It is written down
rather than measured at load, because that scan is eighty-five thousand
triangles and this is a dozen thousand rays.

**AND THE MOUTH'S DARKENING IS AN ELLIPSE, NOT A SLAB.** "I should not see
black png peeking out the top of the rocks" was not a png at all: the
rockmouth's shader blacked out the inside of the arch with two `step()` calls
— a band in z and a ceiling in y — which is a RECTANGLE of world space, and
where that rectangle crossed stone it drew a hard black-edged patch on the
outcrop's own face. Centred on the opening and faded out with a smoothstep
there is no edge anywhere for it to draw. (A PANEL across the aperture was
tried twice before and is the same mistake in geometry: a flat rectangle big
enough to cover an opening is bigger than the stone round it wherever that
stone is narrow. What is behind the arch now is a box deep in the rock's own
hollow, which the rock encloses.) Measured from four approaches: under 0.1 %
of the frame is anything but rock and night.

**THE ROCK IS SOLID BECAUSE THE COLLIDERS COME OUT OF THE SCAN.** "I clip
through the entrance rock" was a footprint thirty metres across answered by a
six-metre disc and two three-metre ones. `rockShellColliders` is the pier's
own `columnsOf` on a bigger object: every vertex under head height bucketed
onto a two-metre grid, and a cylinder on each occupied cell that has an empty
one beside it — the OUTLINE, because the inside of a mass nobody can reach
needs no collider and the list has to stay short. The one thing left out is
the corridor of the mouth, and **that corridor has to start on the open
beach**: the shell's own skirt stands five metres in FRONT of the arch, and
leaving it in stopped a body seven metres short of the thing it is meant to
crawl into.

**A LIT MATERIAL ON THE ENTRANCE SCAN RENDERS BLACK, AND AN UNLIT ONE IS
MEASURED AGAINST THE SAND.** No moon reaches the face (it stands in the
cliff) and `emissive * a granite map` is nothing however hard it is driven —
a red emissive at 6 rendered black while a magenta BASIC override filled the
frame. So it is `MeshBasicMaterial`, DoubleSide (the shell's winding faces the
hill: FrontSide is invisible head-on). Its grade is not chosen but SWEPT: the
first read 12 against an open beach's 7 ("the textures dont match at all...
too bright"), the correction overshot to 3.6, and 0x9aabc6 puts it at 7.3,
which is the beach's own value.

**AND THE SCAN IS AN ARCH, SO LOOKING IN SHOWED THE SAND WALL.** Rays go clean
through it. The black has to go BETWEEN the arch and the cliff — a plug behind
the cliff is drawn behind it and the dune still shows — and it has to be
SMALL: every box or panel big enough to feel safe put a black rectangle out
over the rock's own outline, because its corners stand where the rock is
narrow. A black copy of the rock pushed deeper does not work either: offset
along the view axis its own arch lines up with the front one. A 5.2 by 6.2
panel a metre inside the mouth covers the aperture and stays within the stone
— measured from four approaches, under 0.7 % of the frame is anything but rock
and night.

**A HOLE THAT STANDS PROUD OF THE WALL IS A BLACK LUMP.** The bore's mouth was
at x = 15.4 and the dune's face at that height is at 16.07 — measured by
raycast across the hole's whole footprint, 15.98 to 16.17 — so two thirds of a
metre of an open-ended BackSide tube stood in FRONT of the wall, and what a
BackSide tube shows you from outside is its own far interior wall, which its
shader takes to black. That is the whole of "the hole looks terrible": not a
hole, a black polygonal blob pasted on a smooth dune with the end box's
straight edge showing beside it. This file's own note warned about exactly
this ("half a metre of it standing proud drew as black slabs") and the bore
was built in front of it anyway. Three things fix it:

- it starts BEHIND the deepest point of the face (`BORE_X0`), and its mouth is
  flared wider than the ragged cut so every ray through the hole lands on the
  inside of the tube;
- **the first half metre of it is FULLY LIT.** A fade that starts at the mouth
  means the only thing you can ever see through a hole is deep bore, which is
  black by construction. The wall you are LOOKING AT when you put your face to
  it is the near ring of sand a step inside; at `emissiveIntensity` 0.75 it
  measured black against a black end, and 1.7 is the level at which it reads
  as the wall's own THICKNESS. Walk up and the inside opens; stand back and it
  is black, which is what a hole in a dune does;
- **and the gap round the mouth is closed with a black plate** — a disc with
  the bore's mouth punched out of it, unlit and unfogged, behind the face, so
  a look from off to one side cannot see out of the cut and into the night.
  It has to be SMALL: raycast round the hole and the face holds within 16.20
  out to a radius of 1.6 and then it is GONE — over about y = 3.2 there is no
  cliff at all, you are past the crest — so a plate any bigger stands in the
  open air above the dune as a black rectangle, which is what the first one
  did. The lip is not the same all the way round either: an OVERHANG throws
  the deepest shadow just inside the upper edge and a lit SILL stands at the
  bottom, both narrow, because it is an edge and not a fade.

**THE BEACH'S CLIFF IS A WALL TO A BODY ON THE BEACH — THE THIRD TIME, AND
THIS IS THE COPY THAT WAS MISSED.** `PhysProp`'s HELD branch has skipped the
`CLIFF_BLOCK_X` clamp since the bunker went in; the FREE body kept it, and got
away with it for one reason only: the bunker sits inside the beach's own x
range, so clamping there changes nothing. The hall does not — it is at
x = 3000, so the first physics step on a wrecked drone snapped it from 3000 to
13.1, two thousand nine hundred metres sideways, which put it outside the
hall's floor disc so nothing answered underneath it and it fell for ever. The
clamp is now gated on `bf === null`: if a body answers to another room's
floor, it is in another room.

**THE DOJO'S SKY IS THE ONE THING IN THERE THAT MUST NOT BE LIT.** It ships as
a painted dome and came out the brightest surface in the place — a pale lid
over a night scene with a hard line where it met the fog, which is the whole of
"you can see the skybox". Three things together: it goes UNLIT
(`MeshBasicMaterial` takes no light and so cannot be brightened by the moon),
it is graded to the beach's own night level, and it FADES WITH HEIGHT into the
scene's fog colour so the top of the dome and the distance are the same colour
and there is no edge left to see. Fog does not reach a basic material's far
distance the way it does a lit one, so the fade is written into the shader.

**AND FOG WILL NOT CARRY A LIGHT A HUNDRED METRES, SO THE BEACON IS
UNFOGGED.** The point of a straight bore is that the thing you are walking
toward is at the end of it, and at `FogExp2` 0.030 a surface a hundred metres
off is gone — while dropping the density far enough to show the chancel would
take the close dark with it, which is the only thing the undercroft has. A
bright source does not obey a haze the way a surface does: the altar carries
a `fog: false` sprite whose size and opacity are read off your distance — a
warm smudge the size of a doorway at seventy metres, gone by the time the
tapers themselves read. It is depth-tested like anything else, so a shoulder
of rock hides it and walking off the line puts it behind the stone, which is
the whole reason the line is worth walking.

**THE LIGHT IS IN THE CRATE AND THE RING IS IN THE FIRST CACHE.** They were
the other way round, and the owner swapped them. It reads better this way
round anyway: the shovel's first use turns up the smallest and strangest
object in the game, and the box you have to break open gives you the thing
that lets you see — a crate comes apart in the dark and something inside it
is glowing, so there is no shine to add and nothing to miss, because the
thing IS the light. `dropRing` takes a spot now (a thing lifted out of a hole
is not flung across a beach, so the toss is a parameter too) and
`revealMoundNear`'s first branch simply hands over to it.

**A DROPPED THING WAS DROPPED ON THE BEACH, WHEREVER YOU WERE STANDING.**
Every line of `dropPoint` was the beach's: it raycast the sand, the pier and
the banks; where nothing was hit it put the item at **y = 0**, the sand
plane; and then it CLAMPED x between `WADE_X` and `CLIFF_BLOCK_X`, the surf
and the foot of the cliff. Drop a sword in the church — three thousand metres
away and four hundred up — and all three fired at once: snapped to x = 14.2,
dropped to y = 0, gone. The ray is cast at whatever room you are in, the
floor comes from `bunkerFloorAt` (which every room answers and which
REPLACES rather than competing), and the beach's two walls only apply on the
beach. A CONSTANT THAT DESCRIBES ONE PLACE IS WRONG THE DAY THE GAME ACQUIRES
ANOTHER — this is the sixth coat.

**AND YOU CAN SET A THING DOWN ON A FLOOR, NOT ON A WALL.** The hit point is
kept as a height so a thing put on the pier's boards stays on the boards —
right for a deck, and on a near-vertical face it hangs the item on the rock
at eye level, which in a tunnel is most of what the crosshair meets
(measured: a shovel dropped at y = 1.71 against a floor at -0.03). If the
surface is not something you could stand on, the point's POSITION is kept and
the floor under it decides the height.

**THE SPLASH POOL WAS PINNED TO THE SAND PLANE.** Every drop in it was born
at y = 0.02 and died there — which is the sea, and is the wrong height the
moment anything else in this game has water in it. The tunnel's channel is
four hundred metres up. `spawnSplash` takes the water it came out of, and
`updateSplashes` kills a drop at its own base rather than at the beach's.
The gibs learned this once: A GIB'S GROUND IS A LOOKUP, NOT A NUMBER IT WAS
BORN WITH.

**THE SHELL DOOR'S FLOOR AND ITS CLAMP WERE MEASURED DIFFERENTLY.** The ramp
out through it laid floor across the full `DOOR_W`; the hold's lateral clamp
only let you past a player's radius short of that. In the ten-centimetre band
between the two there was floor out at lz -5.19 that the clamp would not let
you stand on, so walking along her side and turning in at the door snapped
you back to the hold's own wall at -3.30 — **a metre and a half, through her
plating, at exactly the spot you walk to**. `doorPass()` is asked in one
place now. This is the pier's lesson on a boat: the push-out and the thing it
pushes you off have to be measured the same way. Measured over 35 approaches:
one jump of 1.59 m became a worst correction of 0.23.

**Beach rocks are world objects, not debris.** Six scanned boulders out of
`assets/rocks.glb`, loaded with `GLTFLoader` and laid down as ONE formation,
on the sand below Bradly: a dominant mass, a huddle leaning in against it (two
of them lifted so the pile stacks), a few shed off the side, and a skirt of
half-buried chunks. It sits outside the recentring `debris` tile and outside
`clipAtShore()`: it's a landmark you can climb, and a real rock stays visible
when the tide runs over it. `rockColliders[]` gives each mass a cylinder —
`rockGroundAt()` to stand on it, `pushOutOfRocks()` to keep you out of it —
applied in `update()` after `updateTower()`, so a rock beats the sand.
Anything whose crown lands under 0.42 m gets no collider at all: a chunk you
should be stepping over must not become a wall.

**There is deliberately no scatter.** Formations down the length of the walk
and loose stones between them were both built and both removed: the beach read
as a quarry. One pile is a landmark; twelve are scenery. Don't put them back.

Two things about the formation that were each got wrong first time:

- **The masses have to interpenetrate.** Every distance is a fraction of
  `big`, the dominant mass, and the huddle sits *inside* its radius. Spaced
  politely apart you get five boulders standing about on a beach; overlapping
  you get one rock with faces.
- **The aprons are what make it flush.** A plane bent into a low dome and then
  let fall away past its own rim, so the edge is buried under the beach
  instead of drawing a circle across it, in the beach's own `sandMat`. There
  are *two*: a broad shallow one taking the beach up to the pile, and a
  tighter, taller one banked against the masses. The inner bank is the one
  that does the blending — a rock meeting flat sand along a hard line reads as
  dropped on the beach however deep it is bedded. The uv is baked per apron
  because `sandTex` repeats every `SAND_TILE` metres: a plane's stock 0..1
  would put 177 tiles inside six metres and mip to mud.

**Scans lit for daylight go black at night — `reexpose()`.** The rock albedo
averages 0.05 linear and the body bag's 0.002, and under a quarter moon both
render as holes in the beach. `reexpose(mat, gamma, rim)` gamma-lifts the
albedo in `onBeforeCompile` before the lighting sees it, and optionally adds a
cold Fresnel edge (rocks 0.54 and no rim; bag 0.55 plus a rim). Two reasons it
is done in the shader and not in the .png: the files on disk stay the textures
that shipped with the models, and the rim needs `normal` *after*
`<normal_fragment_maps>` so it follows the creases in the normal map.

The rocks also carry a strong `emissive` with `emissiveMap = map`. You walk
INTO the moon, so every rock ahead of you is backlit and the directional light
contributes nothing to the face you are looking at; the emissive is the only
thing carrying the stone until you have walked past it.

**`updateFarProps()`.** The camera's far plane is 5000 and the walk is a
kilometre, so frustum culling alone submits things the fog has already eaten.
It switches `visible` off past `ROCK_DRAW` (210 m, well beyond where `FogExp2`
has finished), and `farProps` does the same for anything too heavy to draw
where it cannot be seen: the body bag past 150 m, and its 235k-triangle ropes
past 45 m. That last one is the one that matters — the ropes alone are most of
a frame's triangles whenever they are on screen.

**IT FLOATS.** The seabed is the sand plane and the drawn sea sits BELOW it,
so a body that came to rest in the surf lay on top of the water like a raft.
In the water each joint's floor is the wave surface, a hand under it,
blended in over the first stretch past the waterline the way everything else
wades in; the surface moves, so the body rides the swell, and a wet ragdoll
never sleeps (the swash moving under it is motion). A corpse asleep on the
beach is WOKEN when the tide reaches its hips. Gibs float too — a third of
their thickness under, lying flat — instead of being hidden the moment the
sea covered them, which for a limb thrown into the surf was a limb that
vanished. Measured: hips at -0.16 on a surface at -0.25, riding it.

**A RAGDOLL KNOWS ONLY THE WALLS YOU GIVE IT.** The beach's cliff was the
only one, three hundred metres from the bunker, so a body thrown across the
control room went out through the concrete and settled in the sand over its
roof. Every particle is held to the room box AND pushed out of the same 0.1 m
furniture grid the player walks, so a corpse flung at the console bank piles
against it instead of sliding through the desks. Measured: three bodies
thrown the length of the room, zero parts outside it. **And the noise is ONE
noise**: the loudest contact of the frame, played at the end of it, not one
per particle per substep — thirty of those at once is a burst of static, not
an impact. It is panned by where it happened, so a body thrown past you into
the far wall is heard over there.

**AND A HELD PROP IS HELD ABOVE THE FLOOR UNDER IT.** `PhysProp` clamped the
hold target with `Math.max(_pt.y, this.restH)` — an absolute height, a hand's
width over the SAND. Pick anything up forty metres underground and the target
was set forty metres over your head, and the spring threw it at the ceiling
at 24 m/s: every object in the bunker flew away the instant it was touched.
The beach's cliff clamp was in there too, three hundred metres from any cliff.

**The campsite (`CAMP_X` / `CAMP_Z`, 55 m past the dock).** A towel laid
facing the water with a Discman, a drink, goggles, a bag and sandals on and
around it, and a line of BARE footprints from its seaward end straight into
the sea with nothing coming back; the float and the stone sit by the last
print. The loose things are `makeProp()` bodies laid at 1.6–1.8x with the
glint, for the same reason the shells are laid at 2–3x. The trail is its
OWN `InstancedMesh` on `foot.material` — the player's prints live in a pool
that recycles, and a trail meant to still be there when you come back cannot
share it; the shared material is already clipped at the shore, so the prints
in the swash come and go with the water. `CAMP_X` obeys the body bag's hard
number: the waterline reaches x = 8.6, the towel's seaward end is at 10.7.
Two things that bit building it: `Object3D.position` is a getter, so
`Object.assign(mesh, { position })` throws and takes the page with it; and a
glint Sprite under any raycast wants `Raycaster.camera`, so `addItemShine`
gives it a no-op `raycast`.

**CONTRAST IS WHAT MAKES CONCRETE READ AS CONCRETE**, and a map that carries
none cannot be given any by a material. Board-formed concrete is a RECORD of
how it was poured: a dark seam per board with a pale lip under it where the
lift bled, tie holes in a grid with rust running out of each one, damp
running down and drying pale, and spalled patches with the aggregate
showing. Drawn at 512 and pushed apart around mid grey before the quantise.
The building is BACKLIT from every approach — you walk toward the moon — so
the emissive off its own map is the only thing carrying it, the same lesson
the scanned rocks taught.

**THE YARD IS PAST THE CLIFF LINE TOO.** The column's axis is ON it, so with
the cliff clamp running inside the bunker you could walk the seaward third
of the yard and never get round the back of the column. The walls are real
colliders and a closed ring but for the gate, so they hold you instead
(`mushInYard`); the only way out of the ring is seaward, well short of the
clamp, so dropping it can never snap you anywhere.

**THE CUT LIVES INSIDE THE RETAINING WALL.** The cliff is cut away inside
the footprint so the bluff does not run through the yard, and a cut through
a one-sided bluff is a window onto the void behind it — so the cut has to be
smaller than the thing standing in front of it, in BOTH dimensions
(r < 5.62 against a wall whose faces are 5.55 and 5.95; y < 3.85 against a
wall 4.15 high and a bluff that reaches 3.60 anywhere inside that radius),
and the wall has to cover EVERY angle at which the bluff stands. At 5.9 m
and a 218-degree parapet the cut reached past both, and on the +Z flank —
the side you walk in from — you saw straight through the gap between the
sand wall and the house. The parapet is the front 128 degrees only, where
there is nothing but flat talus behind it; the retaining wall takes the rest
and the bluff is drawn right up to the back of it and hidden inside its
thickness. The column's axis sits ON the cliff
line (`MUSH_X` 16) so half of it is in the wall and the front steps are at
x = 9, above the highest swash. The cap is ONE lathe — floor top, fascia,
underside — so there is no seam; the glass and the rails are arcs of the
drum, not chords; the treads are extruded wedges. **`rotation.y = π/2 − a`
MIRRORS an angle.** three's rotation about Y sends local +X to
(cos θ, 0, −sin θ), so π/2 − a lands it at angle π − a, not a: the treads
wound the opposite way from the walk and from the rail (which used sin/cos
directly), and the owner climbed invisible steps beside the visible ones.
`a − π/2` is the rotation that puts a centreline on (sin a, 0, cos a) —
and it is what a RADIAL box wants too, so the door's jambs fill the wall's
thickness instead of standing across the opening and the walls' end returns
bridge the parapet to the retaining wall instead of lying along it.
**And `RingGeometry` LIES ABOUT ITS ANGLE.** Its theta runs (cos, sin) in XY
while `CylinderGeometry`'s runs (sin, cos) in XZ — the game's own convention
— so a ring laid flat with the same `thetaStart` as the arc it is meant to
cap comes out A QUARTER TURN ROUND, and laid face-down it comes out mirrored
as well. Every capped arc in here was built that way and none of them was
on its wall: the bench's seat hovered 90° from its own front, a pale slab
over nothing in the middle of the room (with a second one a centimetre off
the floor, z-fighting the concrete, which is what read as "laggy"), and the
two walls' copings floated out over the yard and over the gate with nothing
under them. `ringArc(r0, r1, a0, a1, mat, y, down)` is the only way to lay
one down. A full circle is immune, which is why nothing looked wrong until
an arc was capped. **The wall over a door is WALL,** not a box laid across
it: a chord through an arc stands 15 cm proud of the face at each end, and
lit on top that is a grey bar hanging in the air over the gate. The door is
a gap in the bottom `DOOR_H` of the tube and the concrete above it is the
tube's own, with a `ringArc` soffit closing the reveal.
**The harness's rAF can be dead outright**, ticks 0 in 800 ms even with a
setTimeout pump installed (animate() is parked in the real queue); `__bw.step(dt)`
runs one whole game tick, so a walk can be driven deterministically —
`keys.KeyW` plus `look()` steering at the next point on the spiral, 512
ticks to the top. The walls are `rockColliders` cylinders 1 m apart
(AABB boxes cannot turn), the platform a 0.4 m cylinder you step up, and
the cliff is cut open round it in world space, the drain's trick. Its
group is in `farProps`, so in a frozen preview still you must set it
visible yourself.

**AND THE INTRO IS ON A WALL CLOCK.** `beginGame()`'s card is `setTimeout`s,
so a thousand `__bw.step` calls in one `javascript_tool` call all run while
`introDone` is still false and `update()` does nothing at all. Call
`beginGame()`, let the tool call END, and step in the next one — or set
`sessionStorage['beachwalk.skipIntro'] = '1'` before a reload and it starts in
the walk at once. `__bw.heal()` puts the harness player back to full. Teleporting
down the beach also trips the pack cutscene (`packCut` is in `frozen()`);
step until `__bw.packPhase` reaches 2 before expecting anything to move.

**The snorkeler (`SNORK_X` / `SNORK_Z`, off the campsite).** A third photo
cut-out, `assets/snorkeler.png` out of `assets/snorkeler.jpg` via
`tools/cutout.swift`, cropped to its opaque rows so `SNORK_H` means tube tip
to waterline. He is a Sprite whose lower part is simply BELOW the drawn sea,
so the water hides him: `SNORK_PEEK` of the tube shows, riding
`waterSurfaceAt()` every frame (offshore the swell is ±2 m, so never assume
-0.34 out there). He was first put at x = -21 with 9 cm of tube showing and
could not be seen at all: at the retro scale that is a pixel, and a raycast
from the eye to the tube hit the sea two metres short of him — a crest in
between. At x = -11 with the whole tube up he is a fleck, which is the brief,
and `snorkGlint` — a faint warm point on the tube's valve, only while he is
down — is the one thing out there that is not a star. **He is not a floating
head.** The person segmentation ends at his neck, and a painted-on suit
(tried first) still read as a head on a plate; so did a shoulder-shaped
mask over the photo. `tools/snorkeler_body.py` uses the segmentation for
the one thing it is good at — taking the hills and sky off around the head,
mask and tube — and from the chin down segments NOTHING: every pink pixel
in the picture (the suit seen through the water, and its colour on the
water) is kept by a soft colour matte, so the neck and chest come out of
the sea as they do in the photograph, and the last sixth of the frame fades
so the picture never ends on a line. The bake keeps his colours (`sat`
1.0, twelve levels): the pink and the cyan are the point of him. **And the
suit under the water is the HOOD'S pink.** Seen through the sea it came out
dark red, which on a night beach read as a body: the tool measures the
hood's colour off the head, closes the body's silhouette so the water
showing through it fills in, and re-colours every pixel in it to that pink
keeping only the picture's own luminance, so the wet folds still read. `SNORK_WL` is
the photo's waterline as a fraction of the cut-out; he rises until that line
sits `SNORK_SINK` relative to the drawn sea (negative: a hand above it, so
the wet shoulders show and the fade meets the water). The sprite is placed
by its TIP, since its height is no longer the photo's. **He answers to a
THROW, once.** Any body lying near him re-roused him every time he went
under — the stone that woke him lay by his head — and the dialogue spammed.
`throwHeld()` sets `thrown` on the body, cleared when it comes to rest; the
trigger wants it; and `snorkMet` ends the trigger for good: he stays up and
is an interactable hailed with E, with its own `far` (30 m) since `REACH`
is 3.2 and he is eleven metres out. `updateHover()` sets `raycaster.far`
per interactable and restores it after. A `physProps` body coming to rest within 3.2 m of him is
the trigger — not a hit; a stone in the water beside a man is what makes him
surface — and `updateSnorkeler()` eases him up, splashes, and opens
`startDialog('start', SNORK_NPC)` 0.7 s later. He goes back under five
seconds after the dialogue closes and can be roused again. `SNORK_EYES` is
the blink band across both lenses of the mask. Dialogue choices can now
carry `act`, a callback run when picked — "Give New CD" is gated by `when`
on `cdItem` and `act` takes it out of the pack. His lines after the opener
are placeholders written to fit; the opener is the owner's.

**A throw is not stopped by the sea.** `PhysProp` had a wall at `WADE_X`
as well as at the cliff — for a FREE body and for a HELD one — so nothing
could ever be thrown into the water: a thing held at the waterline sat
pinned at your chest and the throw began behind glass. Only the cliff is a
wall now, either way, and `throwHeld()` gives 16 m/s with more lift (was
12), about fifteen metres out: past the snorkeler, not past the horizon.

**The stun is flat on the sand.** It used to hang in the air and wobble.
Now it collapses in six frames — body dropped by a full unit, legs splayed
out level, claws dropped open where they fell — lies there twitching for
most of `CRAB_STUN`, and drags itself back up over the last eleven frames.
The clip is exactly 1.7 s so the getting-up lands as the timer runs out.

**THE DOJO'S GROUND WAS THE SKY, AND THE SKY FIX FLATTENED IT.**
`SkyAndGround` is ONE mesh — a dome, and in the same eighteen triangles at its
foot the disc you walk on. Making the whole thing an unlit `MeshBasicMaterial`
graded to (0.30, 0.34, 0.44) is right for a dome and, measured, left the yard
reading 181 as mean screen luminance: a near-white slab, which is the owner's
"untextured and grey ... it really dampens it down". Three things, and two of
them are traps this file already knew:

- **the atlas is no use under your feet either.** The disc's own uv wanders
  over most of the sheet (u 0.18–0.97 by v 0.15–0.94) while the painted green
  field is one corner of it (u < 0.55, v < 0.52) — so what the ground was
  sampling is the BLUE OF THE SKY. Not a missing texture: the wrong one. A
  drawn grass is the map now, PROJECTED in world space (`vMapUv`,
  `vEmissiveMapUv` and `vBumpMapUv` all written from the world position), with
  a second sample nine times larger multiplied over it so a 2.4 m tile does
  not read as a 2.4 m tile.
- **`flatShading` IS NOT A LOOK HERE, IT IS THE ONLY WAY IT DRAWS.**
  `undercroft_pack.py` writes positions and uvs and NO NORMALS; GLTFLoader
  answers that by flat-shading the materials IT makes, and a material written
  by hand gets the missing attribute as (0, 0, 0), whose `normalize` is NaN,
  and the whole fragment comes out NaN — which renders BLACK, emissive and
  all. A pure magenta emissive at full strength measured 0 while the same mesh
  under a `MeshBasicMaterial` measured 92.
- **and a level is read from EYE HEIGHT.** A flat plane seen along itself is a
  quarter of what it is seen from above: the same material measured 15.5
  looking down at it and 3.9 standing on it, and two rounds of tuning fought
  each other until both readings came from where the player is. The open beach
  reads 7.3 and the dojo's own boards 13.5, so the field sits with the
  building at 12.9.

**AND THE RAIN WAS A FEW ENORMOUS WHITE LINES.** Both shells hang the map at
ONE TILE over seventy-three metres and its streaks are drawn ten pixels by a
hundred and fifty on a 1024 — a metre and a half across and TWENTY-TWO METRES
LONG. That is "flashing white lines that show up randomly", and no opacity
fixes it: a streak that size is a line whatever it is drawn at. Three things:
it is tiled to a real drop (16 by 12, so 9 cm by 1.8 m); `Rain1`, which hung
from thirty metres UP to a hundred and four over a building five metres tall,
is dropped onto the play area so the two shells are the near and far layers of
one weather; and **a shell seen edge-on is not rain, it is a smear** — where
you look ALONG one of these cylinders its texture is stretched over the width
of the screen, which no amount of tiling fixes because it is a projection and
not a size. The fade is on the uv's own SCREEN DERIVATIVE (`fwidth(vMapUv)`):
where a pixel covers a large stretch of the map there is nothing left to draw,
so it goes. It cannot be done on the normal — this model has none.

**AND A MARKER-BASED EDIT MUST ASSERT ITS ANCHOR IS UNIQUE.** `main.js` is
thirty-two thousand lines of one module, so `mat.onBeforeCompile = (sh) => {`
appears in it many times: an edit script that took `s.index(...)` for the
start of a block and `s.index(..., i)` for its end found the CLIFF's material
and the DOJO's closing line and deleted the 29,543 lines between them. Every
anchor in a patch against this file is asserted to match exactly once.

**THE DOOR IN THE SAND WALL WAS FITTED TO A HILLSIDE EIGHT HUNDRED METRES
AWAY.** The owner photographed it: a stone doorway standing in open sand with
the beach behind it, its arch level with the skyline and stars showing over
the top. One line did all of it. **THE CLIFF IS ONE MESH SNAPPED BACK ONTO
THE PLAYER IN Z EVERY FRAME**, so the raycast that set the door's x ran in
the catacombs' own loader callback — which fires wherever you happened to be
standing when the room came down — and asked about a piece of hill that was
nowhere near `CAT_OUT_Z`. Measured: the cast found NOTHING, the `if (face)`
guard skipped in silence, and the door kept the default it was declared with.
A GUARD THAT SKIPS A MEASUREMENT IS A GUARD THAT SHIPS A GUESS; the fit is
LAZY now, run on the first frame the cliff has actually been recentred within
a period and a half of the door's own z, and it refuses to run on fewer than
eight hits.

Three things then fell out of measuring the dune that is drawn there:

- **A DOORWAY AS TALL AS THE DUNE IS NOT A DOORWAY IN A DUNE.** The crown at
  that z measures 3.37 m and the door shipped at 3.25, so there was nothing
  over the arch and the eye read a frame standing on a beach. `crest` is how
  much sand must stand over the head (0.85); the height is `crown - crest`,
  which comes out at 2.52.
- **THE FACE LEANS AND IT WANDERS.** Measured across the door's own width:
  16.0 at knee height, 15.87 at three metres, and ±0.2 with the runnels
  either side. The leaf clears the NEAREST of them by 7 cm, so there is
  nowhere the dune draws over the stone and nowhere the stone stands out.
- **AND WHAT MAKES IT A HOLE IN A HILL IS THE SAND HEAPED AGAINST IT.** The
  rocks' own inner bank, and their own mistake first: two aprons centred out
  on the beach at nearly a metre tall read as a pair of grey domes with a
  door between them. Set BEHIND the face, only their seaward skirt is drawn,
  which is a bank; and the drift across the threshold is low, because its
  whole job is to bury the sill.

**THE DOOR IN THE DUNE WAS HALF IN THE GROUND, AND THE DUNE IS NOT A SLOPE.**
Casting down across the door's own width: the ground runs 0.16 at x = 14.6 to
0.53 at 15.8 and then JUMPS to 3.28 at 16.0. It is a TALUS and then a WALL,
and the two meet almost vertically — so a door fitted to the face and stood
on the beach plane has its bottom half-metre under the ramp that leads up to
it. Three numbers now, all cast: WALL is the nearest horizontal hit over the
door's own height band, SILL is the ground at the foot of it (the door stands
THERE, not at y = 0), and CROWN is how much hill there is to put over the
head. And **`proud` is half the doorway's own depth, not a hair**: the frame
is 0.6 m deep and the LEAF is its outermost face, so a leaf set flush puts
the jambs and the arch inside the hill and draws a sliver of plank.

**AND "IT LOOKS LIKE AI SLOP" WAS TWO SURFACES, BOTH OF THEM LEVEL.** The
pavilion has no lamps by design — the recompile cost is its oldest scar — so
every material carries its own emissive, and every one of them had been
driven hard enough to read under a quarter moon. A surface whose emissive is
nearly as bright as its own colour CANNOT BE SHADED BY ANYTHING: the moon's
rake, the facets and the fall-off all vanish and fabric reads as plastic. The
two loudest carried the frame:

- **the terrazzo was confetti.** Its chips ran from near-white to near-black
  on a mid-grey ground, the contrast was then pushed a further fifth and
  quantised to fourteen levels, and at the retro downscale the floor of the
  one room you stand still in was salt-and-pepper noise. A chip is a stone a
  shade off the cement it is set in — that RANGE is what makes it read as a
  floor rather than as a pattern.
- **and the rug had not aged.** Pure saturated orange and a near-yellow at
  the room's own emissive is the brightest thing in it. Same wave, same band
  order, sun-bleached: every band pulled a third of the way to the dust it
  has been collecting for forty years.

Everything else is lifted enough to be visible and no further. Nothing was
moved, removed or added: it is the same room at a level it can be lit at.

**A DIRECTIONAL SHADOW MAP CANNOT WORK IN THIS GAME, AND THE REASON IS THE
MOON'S OWN ANGLE.** One was built — `BasicShadowMap` for hard aliased edges,
a 34 m box snapped to its own texel grid and followed the player, casters
curated off `farProps` — and every part of it worked. It was deleted anyway,
because it is invisible by construction:

- **THE MOON IS 6.6 DEGREES ABOVE THE HORIZON.** Measured off `MOON_DIR`:
  (-0.268, 0.115, -0.957), so on flat ground `N·L` is 0.115 and the moon
  delivers 0.62 × 0.115 = **0.071** of light against the ambient and
  hemisphere's **1.65**. The key light is FOUR PER CENT of what the beach
  floor receives, and a shadow can only ever remove the light that casts it.
- **MEASURED, NOT REASONED.** An 8 × 8 m slab seventeen centimetres above open
  sand, drawn twice with only `castShadow` toggled between the two renders, so
  the geometry and everything else is identical: **zero pixels darkened, worst
  drop 0 of 765.**
- **AND AT THAT ELEVATION A SHADOW IS NOT A CONTACT SHADOW ANYWAY.** The
  offset is `height / tan(6.6°)` — eight to twenty-five metres down-beach.
  What grounds a thing is a dark patch UNDER it, and a 6.6-degree projection
  puts it in the next postcode.

So the thing that grounds an object here is OCCLUSION OF THE AMBIENT, because
on this beach the ambient IS the light. That is what the post chain is for.
If shadows are ever wanted, the moon has to be raised first, and that is an
art-direction decision about the whole game and not a rendering one.

**A POST CHAIN WAS BUILT AND TAKEN BACK OUT, AND THE MEASUREMENT THAT SAID IT
WAS CHEAP WAS MEASURING THE WRONG THING.** Occlusion from the depth buffer, a
bloom, an ordered dither and a vignette — four `ShaderMaterial` quads, no
`EffectComposer` (this file has no build step, so every `three/addons` import
must be listed in TWO import maps). The owner's verdict on playing it was that
the occlusion looked bad, the whole thing looked worse, and it lagged. All of
it is deleted. Four things are worth keeping:

- **`performance.now()` AROUND `renderer.render` MEASURES CPU SUBMISSION, NOT
  THE FRAME.** A post chain's cost is almost entirely GPU FILL, which that
  method cannot see at all, so it reports a number that is both precise and
  meaningless. It was reported here as "0.05 ms" — and it was measured in the
  Claude Code preview pane, whose drawing buffer is **214 x 312**. Forced to
  real sizes the same chain measured 0.10 ms at 1280x720 and 0.33 at 4K, which
  is 9 % to 31 % ON TOP of the render call, still CPU-side only. MEASURE FILL
  AT THE RESOLUTION IT WILL RUN AT, and do not quote a pane's numbers as the
  game's.
- **AND THE GRADE CANNOT BE MOVED IN THIS GAME.** three applies tone mapping
  ONLY when the render target is the canvas, so the natural build is: scene
  into a linear target, bloom in light, composite owns ACES. Built that way
  and measured against three's own output on an identical frame, the bottom
  half of the picture was PIXEL-EXACT — (17, 29, 57) against (17, 29, 57) —
  and the sky was FOUR TIMES too bright. Five materials here are
  `ShaderMaterial`s (the sky dome, the ocean and three effects); a custom
  shader writes straight to `gl_FragColor`, never included
  `<tonemapping_fragment>`, and was therefore authored and tuned BY EYE IN
  DISPLAY SPACE. Move the grade and every one of them is graded twice.
  `isXRRenderTarget` is three's own escape hatch — read in exactly the two
  places that decide tone mapping and `outputColorSpace` — so a target with it
  set, and an sRGB texture colour space, is graded exactly like the canvas.
  That is the trick to reach for if anything ever needs the frame in a
  texture; it is also still useful for MEASURING, since it gives a readable
  copy of the real frame when the window is minimised and `readPixels` on the
  default framebuffer returns zeros.
- **AND AN ORDERED DITHER MUST BE AGAINST THE OUTPUT'S OWN LEAST SIGNIFICANT
  BIT.** It shipped at 42 levels for a chunky era-correct banding. A night
  beach lives in the bottom twenty-five values of 255, so a 42-level grid is a
  step of six and the ENTIRE picture occupies three of them: measured,
  rounding to it took the frame's mean from 18.85 to 37.78 — every near-black
  pixel rounded UP a whole step, the frame came out twice as bright and the
  sky a coarse stipple. IF A LOOK EVER NEEDS COARSER LEVELS, IT HAS TO BE DONE
  IN A SPACE THE PICTURE ACTUALLY OCCUPIES, not uniformly across a range it
  uses a tenth of.
- **AND A SHARPNESS METRIC CANNOT TELL DETAIL FROM ALIASING.** The one real
  clarity lever left is the sand's own filtering: it is a 256-pixel texture
  repeated **178 times** across the beach at `anisotropy: 1` with
  `NearestMipmapNearest`, viewed at a grazing angle for the whole game — which
  is the wreck's own "ANISOTROPY 1 ON A 28-METRE HULL" on a bigger surface.
  Trying it (anisotropy 8, trilinear minification, `magFilter` left NEAREST so
  close-up pixels stay chunky) measured MORE neighbour-difference near and
  LESS in the distance, because `NearestMipmapNearest` produces aliasing and
  the metric counts aliasing as detail. It is not shipped: it is a LOOK change
  and it wants an eye on it, not a number. If it is ever tried, change the
  sand's and the cliff's own textures and NOT `retroTex`, which is right for a
  256-pixel canvas on a prop you stand next to.

**AND THE SEA AND THE WIND HAD FIVE OWNERS.** "I shouldn't hear the beat in
other loaded rooms" was the beach's own bed playing in the tavern at FULL, with
its swell rolling every eleven seconds, which in a quiet room indoors twelve
kilometres away is a beat you cannot not hear. `waveBusGain` and `windDuck`
were written from FIVE places, each inside one room's updater and each with a
different and incomplete set of terms — the drain's had no undercroft, the
bunker's had no shrine, the undercroft's and the dojo's had nothing but
themselves, and the VOLUME SLIDER'S had no room terms at all, so moving it
un-ducked the sea until the next frame put it back. They all run every frame
and all write the same node, so the level was whichever updater happened to run
last. The tavern was in none of them.

`updateBeachBed` is the one owner now, called from `animateFrame` after every
room has had its say, and a room added later has exactly one place to declare
itself. The sea keep is deliberately NOT ducked: it is a pier on an island in
the sea. Measured, as the multiplier on the bed: beach 1.00 (unchanged), tavern
1.00 -> 0.02, undercroft 0.015 and the catacombs with it (`ucMix` covers both),
which is what the file already said they should be.

**THE KEEP'S SEA IS THE BEACH'S SEA, AND IT KNOWS WHERE THE ISLAND IS.** The
file's flat transmission disc is hidden and `makeKeepWater` puts the beach's
own ocean in its place: the same eight swell terms and chop, flat-shaded
facets, crest tint, moon glitter road, on one shared `uTime`. What the beach
does with x (easing the swell to nothing at the waterline) an island has to do
all the way round, so `buildKeepField` reads the walk grid ONCE into a 1 m
distance field — metres to LAND and metres to a SHORE (ground at the water's
own level with sea beside it; the pier's deck is land but not shore, so the
water under it is calm and not foam) — blurred, because a chamfer's gradient
is quantised to eight directions and the swell scaled by it drew white spokes
out of the rock. The swell is 0.13 of the beach's in the lee (where the boat
lies) and 0.7 in open water, fading to flat at the sky's rim. `keepWaveJS` is
the JS mirror reading the SAME bytes, and the moored boat rides it
(`updateKeepWater`): height at her middle, pitch and roll off the slope, a
little lag; her floor box rides with her, so you do too. Measured: about
±0.2 m and 3°. Three things it needed: the seabed's `Sand` caustic sheet sits a
hand under the old flat sea and showed in every trough, so it is hidden (the
new sea is opaque, like the beach's); the void disc went from 1.5 to 4 m under
the sea so no trough can dip below it; and FOAM IS A LINE, NOT AN AREA — marked
over the whole shallow margin, the beach's 2 m fizz pattern aliased into
streaks across metres of water, so shore texels are land-at-sea-level with sea
beside them, and foam fades out past 60 m. The mesh's material is NAMED
`'material'`, the file's own sea name, because every walk and wall index skips
that name and a flat plane at sea level would otherwise be read as a floor.

**THE FOG IS LIT, AND IT IS DONE IN THREE'S OWN FOG CHUNKS.** `FOG_MOON`
(right after `scene.fog`) patches `fog_pars_vertex`, `fog_vertex`,
`fog_pars_fragment` and `fog_fragment` once at boot, so every material that
fogs — the ocean included — gets it and nothing is graded twice. Toward the
horizon the fog colour is lifted toward the sky's own (the stock fog is a
third of the horizon's value, which is what made every distant thing a black
cut-out), the moon's direction adds a glow on top, and the density rises up
to 30 % below eye level so the sand and surf go into mist before the crown
of the dune does. Two traps: **the uniform is a PLAIN `{x,y,z,w}` on
purpose** — `UniformsUtils.clone` copies anything that is not a Vector or a
Colour BY REFERENCE, so every material shares the one object and `w` is a
single write (`animateFrame` sets it 0 in any room, which is the stock fog to
the last bit); and **ACES swallows small linear lifts whole** — the first
values changed the frame's mean by 0.05, so the constants were swept at 1x,
2x and 4x in the pane and shipped at about 3x. Extra density only ever ADDS
fog, so nothing `cullBeyondFog` hides can be uncovered by it.

**THE RETRO IS IN THE PALETTE NOW, NOT THE BLUR (the Cultic look).** `RETRO_SCALE` 0.42 → 0.62 for clarity (GPU 0.90 → 1.15 ms at 1080p), and the sharpen pass also quantises to `PALETTE_LEVELS` (16) per channel in sqrt space with a 4x4 Bayer dither — unbiased, frame mean 22.60 → 22.72. The sky dome has fbm clouds lit from the moon's side (`SKY_CLOUDS`, shared with the stars so clouds hide them) and a ten-degree moon with maria, craters and a terminator. **A first draw is a hitch**: each mound's contents are pre-built and warmed at boot (`moundRelicHold`; the CD's dig was 349 ms, now 2), and every named item's icon is pre-rendered on the warm chain (a pickup was 11–60 ms).

**THE MOON IS DRAWN IN SCREEN SPACE.** A disc of fixed angle on the dome is stretched by the lens at the edge of a wide FOV (the owner saw a saucer out of the corner of his eye). `sky.onBeforeRender` projects `MOON_DIR` into `uMoonNdc` and sizes it as `MOON_ANG_R` would be at the middle of the view, so it is round and the same size anywhere and still zooms with a scope. The sea keep's sky, fog, lights and water are pink/violet (`makeKeepSky`, `KEEP_FOG`, `keepEnter`, `makeKeepWater`) so sailing there reads as arriving somewhere else.

**THE SAND WALL IS SAMPLED IN WORLD SPACE, ALL OF IT.** It is snapped onto the player every `CLIFF_PERIOD` (40 m) and its own uv tiled every `SAND_TILE` (9), so the texture jumped at every snap; and its bump was still on the local uv while its colour was on the world one, which drew the line at the toe. The vertex shader now writes `vMapUv`/`vBumpMapUv`/`vEmissiveMapUv` = `((x + max(y,0) + 800), (800 - z)) / SAND_TILE` — the beach's own uv at y = 0 — and the beach's colour/emissive run up to `aU` 0.95 so there is no colour step low on the face. Sand and wall textures minify trilinear + aniso 8 (magnify stays nearest). Measured across a snap: frame diff equal to plain noise.

**THE SEA KEEP'S SKY IS AT INFINITY.** `makeKeepSky` colours by direction FROM THE CAMERA, its horizon is `KEEP_FOG.color` in linear space through three's own tone map, and a flat ring of the same water runs from the disc out to 3 km (`uFar`), so the sea goes into fog instead of stopping at an 84 m dome. Stars are points in 3-D cells (a projected-plane hash draws dashes).

**THE BEACH IS POLY HAVEN'S SAND 03, AND `SAND_TILE` IS 4 (was 9).** `tools/sand_pack.py` bakes the displacement into the albedo as cavity shading and re-tones it to the old canvas's mean (66.9, 75.0, 91.5), so the level is unchanged; the canvas stays as the fallback and the JPGs are swapped into `sandTex.source`, which every clone shares. 4 divides 800 and 1600, so every recentre and every `(w + 800) / SAND_TILE` uv keeps its phase. **The keep's swell runs to the horizon**: `keepWave`'s edge fades at 500–1400 m, not at the disc's rim, and the far sea is a graded ring (2 m rings at the island, growing 6 % a ring).
The first build of it looked "exactly the same" to the owner: the map is read LINEAR and the frame is sRGB-encoded and tone-mapped after, so an additive ±60 % swing arrived as a few invisible levels. The pack now swings in LOG space (`exp(0.55 z)`, mean put back). And the wall wears `sandMat`'s own colour, emissive, roughness and bump scale — its old greyer constants were the colour mismatch.

**THE CITY OVER THE WALL HAS A REAL SKYLINE** (99.Miles, CC-BY-4.0, `assets/skyline.glb` via `gltfpack.py --drop-mr`, then its `KHR_materials_clearcoat` stripped from the GLB JSON — the pack dropped the texture the extension pointed at and GLTFLoader threw on `uri`). `SKYLINE`: one InstancedMesh copy per `CITY_TILE` under `city` (identical copies, or the city's snap would change a building under you), x 300 at 0.72 so it pokes over the crest like the box towers, fully fogged like them; the windows are its own emissive map added back AFTER `fog_fragment` (`SKYLINE.win`) and attenuated by `fogFactor`, so they read as lit windows through haze.

**THE LIGHTHOUSE THROWS TWO BEAMS AND THE STORM IS OUT AT SEA.** (SUPERSEDED: it throws ONE now — see the end of this file.) The beam was a flat 5 % cone 260 m long, invisible from the spawn; it is now two back-to-back shader shafts (`beamPivot`, 1500 m, 0.5 → 70 m wide, tilted 2.4° up) lit by how squarely you see the surface (`|N·V|³`, so the edges dissolve) and fading along their length, unfogged because they ARE lit fog, faded out within 60 m of the camera. Measured from the spawn, a pale shaft sweeps across the sky every nine seconds. Lightning (`updateLightning`, wall clock, off in rooms and before the intro): every 38–93 s a strike over the sea half of the horizon — two to four strobes in half a second, a jagged bolt drawn in the sky shader (`uBoltLine`), the clouds lit from inside (`uBolt`), the fog lifted toward it (`FOG_BOLT`, a second plain-object uniform in the fog chunk, beside `FOG_MOON`), and the beach washed cold by `boltLight` + `boltAmb`, both in the scene from boot at zero so the flash recompiles nothing. `sfxThunder` follows 1.6–7 s later: brown noise rolling under a closing lowpass, a sub, and a low crack for near ones — nothing up in the hiss.

**THE MOON ON THE WET SAND, FILM GRAIN, AND AIR THAT MOVES.** Three things, all cheap. (1) The sand shader adds a reflection road before tone mapping: the view ray mirrored about up, measured against `MOON_DIR` in azimuth (tight) and elevation (loose, since ripples tilt the film toward and away from you), times a band 9 m in from the waterline, broken into flickering glints — the sea's own road carried onto the wet sand. (2) `FILM_GRAIN` (0.03) is added in the palette pass, in sqrt space just before the quantise, triangular and zero-mean with a fresh seed each frame, so the level of the frame never moves. (3) `updateAir` (from `animateFrame`, off in rooms, on the headland and before the intro): 60 soft mist sprites lifting off `shoreLineJS` and drifting landward, and 320 square grains that only blow during a GUST (every 7–18 s, 2–5 s long) in lanes on the DRY sand between the wet and `CLIFF_BLOCK_X` — wet sand does not blow — while `airGust` lifts the wind bed through `windBedK`. Both are one draw each; the whole frame measured 2.9 ms median with them running.

**EVERY STRETCH OF BEACH HAS ITS OWN AIR, THE TORCHES FLICKER, AND THE HEAD SHAKE IS QUICK.** `updateMood` (from `animateFrame`, off in rooms) eases between keyframes set off the landmarks' own constants — home, the wreck's green-grey sea mist, the dock, the tall one's deep dark blue, the pavilion's violet, the mutants' sickly olive, the stones' bruised red, the tower's clear cold blue — and drives a TINT and a density. Tinting only the fog colour did nothing you could see: the lit-fog term swamps it, and the sea, sky and sand are most of the frame. So the tint multiplies the whole lit fog (`FOG_TINT`, a third plain-object uniform in the fog chunk, ignored when `fogMoon.w` is 0) and the sky's horizon, the ambient and hemisphere colours, the sea's deep and shallow colours (0.7) and the moon's colour (0.5), each from a base captured on first use. The SAND is deliberately left alone: the cliff clones `sandMat`'s colour at build, and tinting one would open a seam at the toe. Density only ever rises over 0.014 (`cullBeyondFog`). In the catacombs each torch, under its steady gutter, waits 6–24 s and then stutters — stepped hard dips, sometimes nearly out, for a fifth of a second to most of one (`catGutter`) — and every 14–36 s a draught dips every torch within 14 m together with a low rush of air (`sfxCatDraught`). Measured over 20 s: every torch flickered once or twice, down to 8–37 % of its level. The cave-in's closing head shake is 0.8 s and two and a half turns (was 1.35 s, 2.1).

**THE SEA KEEP IS ALLOWED TO BE BEAUTIFUL, AND IT IS ALIVE.** `makeKeepSky` was rewritten: a rose band on the sea's rim, a MILKY WAY across the sky with a dust lane (coordinates on the band's own plane — an `atan` azimuth would draw a seam), stars that twinkle on their own counts and crowd the band, AURORA curtains on the side away from the moon drawing slowly along, a 22° ice halo round a moon with maria on it, a domain-warped cloud deck drifting three times the beach's pace with silver linings where it thins near the moon plus a quicker streak deck, and SHOOTING STARS — one every 6.5 s by a hash of the clock (60 % of periods), and one put in front of you as you land (`keepSkyU.uStarAt`). `updateKeepLife` (from `animateFrame`, only while `inKeep`): 18 instanced CLOUD BANKS standing on the sea 70–340 m round the island, billboarded in the vertex shader, unfogged (the fog closes at 100 m) and sunk into the rose haze with distance, lit from the moon's side with a silver lining when backlit; 56 additive WISPS drifting round you, pushed by the gusts; and a gull calling now and then from wherever one is (`sfxGull`, tonal, panned). The gulls (`critters`) wheel round the keep while you are there — `spawnBird` has a keep branch, and a change of world respawns them — and the gust clock (`airGustTick`, the beach's) runs there for the wind bed. `keepArrive` (on the sail's cut, beside `playKeepIntro`) flushes eight gulls off the pier with three calls, spirals the wisps up round you, starts a gust and drops the star. **It has to set `critters.inKeep` itself**, or the world-change reset in `updateCritters` wipes the flock on the next frame. Measured: 2.1 ms a frame at 1080p with everything running.

**EVERY BODY LANDS, AND THREE THINGS HAD IT FLOATING.** (1) The LEASH was 3-D: a body whose home was written while it was still on its feet could never fall more than 1.5 m from standing, so its head was held in the air for good — it is across the ground only now, and a body may always go down. (2) A body was put to sleep when it stopped MOVING, and bend limits, a stiff trunk and friction at the feet can hold one up hunched or propped slowly enough to read as still — it may only sleep, be leashed or be finished when it is LYING (the highest joint over the floor under it is under 0.42 of its height at death, `r.h0`), and after 0.9 s a body still up has its upper joints nudged along the blow (`r.kickX/Z`) until it goes over; a 14 s backstop ends everything. (3) The SEA FLOOR MOVED: in the surf each joint's floor was the wave's surface, so the swash lifted a corpse, it slept up there, and the water drew back from under it. The floor is a fixed function of x now (`gy - 0.42 * clamp((6 - x) / 6)`): a body in the surf sinks into it. Measured: killed on dry sand, in the swash and in the sea, all three lie flat (top joint 0.30–0.45 m over the floor) touching it and asleep. Gibs still float on purpose.

**THE TAVERN'S MOONLIGHT** is three skylights in the crown of the vault (`buildTavMoon`, after the bake and the walls): each placed where a ray from its pool up the moon's line (`TAV_MOON_DIR`) meets the vault, a RAYMARCHED shaft (a BackSide box in the beam's frame, 22 steps, the skylight's leading traced back up the beam so the bars are streaks in it), a pool on the flags with the leading in it, a halo on the vault, dust motes that glint only in the light, and a cloud that crosses the moon now and then (`uCloud`). All additive, `bwGhost`, un-raycastable. `uStrength` 0.32 was chosen by eye in the pane (0.052 was invisible).

**THE TAVERN'S SKYLIGHTS ARE CUT INTO THE VAULT, NOT HUNG UNDER IT.** They
were flat squares turned to face the moon, and the moon comes nearly straight
down while the vault slopes, so half of each was buried in the ceiling and
flickered, and what showed was an additive white square with a grid on it.
Each is now a 12×12 mesh CAST UP THE BEAM onto the drawn vault through the
wall index (`tavRayAny`, any direction — a raycaster against the merged hall
is fifty milliseconds a ray) and set a finger in front of it, so it follows
the curve exactly. It is opaque and what it draws is a HOLE: the view ray is
carried on past the surface up a shaft whose sides run along the beam
(interior mapping, in the beam's own frame via `uInv`), so the opening has a
lit stone reveal and parallax, and at the top is leaded glass — dark night
sky, the moon's glow, each quarry its own tint and ripple. The glazing is
`mlattice`, now DIAMOND QUARRIES either side of a mullion, and because the
shaft and the pool on the flags trace the same function they show the same
leading. The halo round the opening is laid on the vault the same way.

**THE BEACH'S CLOUDS MOVE, AND THEY ARE PAINTED.** At 0.0045 units a second a
cloud took four minutes to cross the sky — indistinguishable from still.
`skCloud` drifts in off the sea at 0.030 (a cloud crosses overhead in about
forty seconds and crawls near the horizon), and the shapes are domain-warped
by a slower field so they curl and change as they go. On top: a thin high
veil of streaks on its own slower heading (two decks at two speeds is what
reads as depth), the light on the clouds laid in three soft bands with a
brush grain along the wind, a hard silver line where a thin edge faces the
moon, and a cold underbelly. The stars use the same `skCloud`, so they are
still hidden behind whatever cloud is over them.

**CLOUD SHADOWS, AND THE SURF GLOWS.** `CLOUD_SHADE_GLSL` (`bwCloudShade`)
multiplies the FINISHED colour of the sand, the dune and the sea — the moon's
key light is four per cent of what lights this beach, so shading only the
direct term is invisible — by the same moving `skCloud` field the sky draws,
laid flat at about 50 m a patch and sliding in with the wind at a few metres
a second (0.52 on the sand and the dune, 0.42 on the sea). It rides the sky's
clock (`skyUniforms.uTime`, the wall clock), shared into `oceanUniforms` after
the merge because `UniformsUtils.merge` clones. The BIOLUMINESCENCE
(`BIO_COL`, a cold blue-green) is three things, all added after the shade
because it is its own light: in the sea, drifting patches and hard sparks in
the four metres where the waves break, brightest on the UPRUSH (the
waterline climbing — `shoreLine` a third of a second ahead); on the sand,
round specks flickering in the last couple of metres the water drew back
from; and a FOOTPRINT on wet sand (`footGlow`, a second instanced batch on
the prints' own slots, masked by the print's pits, washed away by the swash
like them) glows for a breath and fades over a few seconds, brighter the
wetter the sand. **And a harness that winds `performance.now` backward
breaks the lightning**: the flash's envelope goes negative and the beach
renders white — compare frames a real ten seconds apart instead.

**THE GLOW IS ON THE WATER ONLY, AND ONLY A HINT.** The owner's word after
seeing it: no specks on the sand, no glowing footprints, and the surf's glow
more subtle — it is a third of what it was, a tint in the breaking water.

**ONE WIND, AND THINGS IT CARRIES.** `WIND` (down the beach and a little out
to sea, the way the clouds drift) is the prevailing direction; a gust varies
it by a few degrees, never by half the compass. The sand grains, the moths
(a breath always, a push in a gust) and the gulls' wheel all go with it.
(Tumbling clumps of dry wrack went in with this and came out on the owner's
word — they read as grey blobs. Do not put them back.)

**THE SEA REMEMBERS ITS FOAM, AND THINGS PASS UNDER IT.** Two of the water
ideas, both in the beach ocean's fragment shader:
- FOAM THAT REMEMBERS: five past waterlines (`shoreLine` at t - 1.1 k),
  each carried seaward 0.55 m a beat on the backwash, drawn as ribbons that
  spread and thin with age and are broken into froth and threads by `skN`.
  Only within 70 m of you and 14 m of the shore. Measured by drawing the mask
  alone: two or three parallel lines lie seaward of the break at any moment.
- UNDER THE SURFACE (`underMask`, driven by `updateUnderSea` through
  `oceanUniforms.uSh`/`uSh2`): every 22-62 s one of a school of fish (a
  breathing blob of small bodies each wagging on its own count), a raft of
  kelp drifting with `WIND`, or rarely something 14-19 m long that swims
  along and away, 11-34 m out, fading in and out over four seconds. It only
  darkens, and it goes in AFTER the glints so the reflection does not bury
  it — at 1.7 m eye height a dark shape on a dark sea is subtle by nature, and
  it reads best from the pier, the wreck's deck and the headland.

**THE HEAPS IN THE DOJO AND THE STONE UNDER THE WRECK ARE THE OWNER'S OWN
ROCK NOW.** Bl4ckGh0st's "Stylised Rocks Asset Pack" (CC-BY-4.0), the MOSSY
set of its four, through `tools/gltfpack.py` into `assets/rocks-mossy.glb`:
thirty-two separate rocks, 6,378 triangles, 0.58 MB. It replaces two
inventions — the courtyard's heaps of knocked-out-of-round icosahedra with
the rampart's coursed masonry projected triplanar onto them, and the nothing
at all that was holding a twenty-eight metre boat down on flat sand.

- **`--decimate` MERGES THE WHOLE FILE INTO ONE MESH, WHICH DESTROYS A PACK
  OF PROPS.** That is right for a scan split into 65k-vertex chunks and
  exactly wrong here. `--decimate-each` is the same weld against a
  per-primitive budget: 13,636 triangles become 6,378 and the thirty-two are
  still thirty-two, with the node names still naming them.
- **AND READ EVERY MAP BEFORE DECIDING WHICH THE MODEL NEEDS** — the alien
  animal's rule, and here it SUBTRACTS. The metallic-roughness map is 2048
  of pure white and says nothing at all, so it goes (`--drop-mr`); so does
  `KHR_materials_specular` (`--drop-ext`, new), because three honours that
  by promoting the material to MeshPhysicalMaterial and hanging another
  megabyte off it; and so does the NORMAL attribute, because these are
  faceted rocks and three flat-shades a primitive that carries none, which
  IS the look and is half a megabyte.
- **A DAYLIGHT ROCK ALBEDO GLOWS UNDER A QUARTER MOON, AND THE NUMBER TO
  MATCH IS ALREADY WRITTEN DOWN.** Its mean luminance is 87 of 255;
  measured on screen at the foot of the east steps it read 36.5 against the
  masonry beside it at 24 and the yard at 20, which is a heap that glows.
  The old rubble's own note says what it should be — it read 19 and let the
  moon do the separating — so the multiply is SWEPT against that rather
  than picked (0.72 reads 26, 0.55 reads 20.7, 0.42 reads 15.2). At 0.55 it
  measures 19.8 at the east steps and 17.1 on the long flight. **And the
  scene has to have SETTLED before any of that means anything**: read on
  the frame after `placeInDojo` the same heap measures 19 against a yard of
  37, because the room's own grading is still ramping in.
- **EIGHT HUNDRED ROCKS ARE SIXTEEN DRAWS.** Merging them the way the rest
  of that room is merged is 158k triangles copied into one buffer for
  sixteen shapes used fifty times each; an InstancedMesh per shape is the
  same picture out of the half megabyte the pack already ships, and
  `bakeStatic` leaves an instanced mesh alone by its own rule, so the bake
  that runs a line later cannot touch it. The per-stone tone that stops a
  mass five hundred deep reading as one surface rides as an INSTANCE
  COLOUR, which three multiplies into the diffuse for free. And it draws
  from EVERY OTHER rock rather than from all thirty-two: measured, the whole
  pack takes the courtyard from 19 draws to 51, which is the count nearly
  trebled in a small room for rubble. Sixteen is +16, and is sixteen more
  shapes than the heap it replaces, which had exactly one.
- **THE HEAP'S OWN ARITHMETIC IS UNTOUCHED, AND IT HAS TO BE.** Everything
  that decides where a boulder goes, how big it is and how the crown sits
  under the coping is what SHUTS A STAIR, and the clamp that actually stops
  you is built out of the same numbers — so `buildDojoBlocks` still runs the
  instant the room is up and QUEUES the stones, with every roll a stone
  needs taken there off the heap's own seed, and the meshes are made when
  the pack has landed. A checkpoint therefore rebuilds the same pile
  whenever the download arrives.
- **AND A ROCK IS FITTED BY ITS HEIGHT, NOT BY ITS WIDTH.** Every test in
  that function is written on `r * sy`, the half-height the old blob had, so
  that is the number a real rock has to match — under its own free rotation,
  which is the ROTATED half-extent and not the authored one (`rockExtent`).
  What it measures across then falls out of its own proportions, which is a
  rock rather than a ball, and is capped so a slab lying flat cannot be
  blown up into a table.

Measured after: **1,300 eye-level sight lines from four standing spots, 0 of
them through either heap**; six hands-off walks up the two flights all stop
with the stone 0.06–0.60 m in front of the eye (five of six on a rock, the
sixth on the model's own parapet, which is that lane's real end); the
courtyard 20 draws → 36, 24k triangles → 182k, and the render call 2.5 ms →
2.6.

**A THING INSIDE ANOTHER THING'S TARGET WINS WHEN YOU LOOK AT IT.** The sea
chest's crosshair target is an invisible box round the whole chest, and the
spare peg lies INSIDE that box — so the ray met the box first every time and
"Take the Spare Peg" never came up. An interactable may say `inside: true`:
if the ray reaches it at all, it beats whatever it is inside.

**RAIN SQUALLS COME IN OFF THE SEA.** `squall` spawns one every four to eight
minutes 260-320 m out and drives it in with the wind. It is drawn four ways,
all off one state: a cloud mass in the sky shader (`skSquall`, fbm-edged so
it billows rather than being a dark disc, and it hides the stars behind it),
a curtain of rain (`sqCurtain`, an open cylinder fading at its top, its foot
and its edges), dimpled dull water under it (`uSqO`), and — when it is over
you — 900 streaks wrapped round the camera (`sqRain`), a gust, thicker fog
and a noise bed (`squallAudio`). Off in every room. The streaks' wind is a
literal: `WIND` is declared below them and is a dead-zone crash.

**THE KILL WAS A SLOW SKIN BAKE AND A THOUSAND BLOOD MESHES.** Measured in
the tavern, a kill cost 158-187 ms. `bakeLimb` walked every vertex of the
skin through `applyBoneTransform` for every limb it took; it now skins each
kept vertex ONCE from `skeleton.boneMatrices`, off a per-vertex dominant bone
cached at dress time (`skinDom`). Blood was one mesh per drop; it is one
`InstancedMesh` of 768 (`bloodInst`, `bloodDropObj`). And `dressMutant`
compiles the non-skinned variant of every creature's materials at load, which
is what a baked limb is drawn with. After: 9 ms for the worst finish.

**AND THE BEACH NEVER SHOWED ITS SAND.** three allocates storage ONCE PER
SOURCE (`texStorage2D` is immutable), and the Poly Haven JPGs (512 px) were
written into the Source the 256 px canvas had already gone up in — the upload
failed with "offset overflows texture dimensions" and the beach went on
drawing the canvas, depending on which landed first. The fallback canvas is
drawn at `SAND_PX` from the start. **A GL warning in the console is a bug**;
the way to find its owner is a `WebGL2RenderingContext.prototype` hook in a
temporary `<script>` in the head, which is in place before the renderer.

**THE BEACH WAS DARK BECAUSE OF TWO THINGS STACKED.** The sand's baked relief
swung ±0.55 in log units, so the dents went to a quarter of the mean at the tails
and the eye reads the darks, not the mean; and the cloud shadows took the sand
and the dune toe to 0.48. `tools/sand_pack.py` now swings 0.30 and lifts the mean
a fifth, and the cloud shade on the sand and the toe is 0.34 (the sea keeps 0.42).
Measured as an A/B on one frame with only the texture swapped: 23.6 → 29.3 blue.

**THE COVER IS BLACK AND SAYS START GAME, AND NOTHING ELSE.** The live-beach
title card, PRESS ANY KEY and BEGIN / CONTROLS are gone, by the owner's word
(the controls live in the settings menu's own page). `#overlay` is opaque
black with one white button; a click, Enter or Space is the gesture that starts
the audio and asks for the lock, and runs the intro at once. **The cover may
not go while the intro's black is still coming down over it** (`hideCover`):
the lock, or its failure, lands a fraction of a second after the press, and
the cover fading out then showed the beach through the gap. The intro takes it
away itself at `INTRO_CUE.black`, under full black.

**THE INTRO'S WAVES ARE BUILT BY `tools/intro_waves.py`, AND A DISSOLVE WAS
THE HITCH.** The owner's clip is a camera travelling over moonlit water: the
ripples scroll left (faster toward the bottom of the frame) while the moon's
road stays put and drifts about 90 px over the clip's 10.9 s. Every earlier
build cut the end back into the start, and two things showed at every seam,
every six seconds: the road HOPPED SIDEWAYS, and a plain dissolve between two
unrelated ripple fields averages the glitter away, so the texture's contrast
fell from 20 to 13 in the middle of the blend and came back, which reads as the
footage lagging. And `minterpolate`'s block matching softened every in-between
frame, a shimmer five times a second. The script measures the road per band,
smooths it, and shifts every row so it stands still (zoomed 6 % so the shifted
edges never show); interpolates to 30 fps itself by per-row motion from
sub-pixel phase correlation; and blends everything, the seam and the
in-betweens both, with the broad light crossfaded and the high frequencies
mixed at EQUAL POWER (divided by sqrt(a^2 + b^2)), so a blend of two frames is
as crisp as either. Measured: the glitter's contrast never drops below 17.4,
the road holds, and the in-between frames are within 4 % of the real ones'
sharpness (15 % before). 31 s, longer than the intro shows it, so the browser
never wraps. Rebuild with
`python tools/intro_waves.py ~/Downloads/16719990_1920_1080_25fps.mp4 assets/intro-waves.mp4`
(numpy in a venv; about 10 minutes).

**THE FIVE ARE A TRIBE ROUND A FIRE, AND THEY SEE YOU FROM A LONG WAY OFF.**
The owner's word: they looked stupid. They share a camp now (`TRIBE_X/Z`,
`CAT_OUT_Z - 36`): a bonfire built the first time you come within 160 m
(`buildTribeFire`, the keep's own `keepFirePoints` plus a pooled lamp; it
advances `KEEP_GLOW_U` itself while you are not at the keep), the sitter at
it keeping a DRUM (`tribeDrum`, `TRIBE_RHYTHM`), the digger beside it, a
walker looping round it and stopping to look OUT, the wader below it, and a
LOOKOUT (`'watch'`) at the up-beach edge sweeping the sea and the dune. Sight
is 44 m (36 heads-down, 58 the lookout) in front, all the way round while
glancing (every 3-7 s); out to 1.3x that a half-glimpse is SUSPICION — it
stops, turns and stares, the others glance up and the drum stops — and after
1.6 s it is sure. Heard at 11 m, 22 running, 5 crouched. The one that sees
you roars and the WHOLE camp answers, staggered by distance from the caller.
Measured walking in: the lookout from 70 m, and from behind it the walker and
the wader at 52; all five up within a second of the first. **The door's save
calms chasers for 25 s, which made the camp blind** exactly when you step out
36 m from the lookout: the tribe honours only the first 6 s of it.
**Harness: walking the beach past the portal drops you into the catacombs**
(and saves there, which is a calm); teleport past the band, and `__bw.step`
does not run `animateFrame`, so the fire and the drum need `__bw.frame`.

**THE SEA KEEP IS ARRIVED AT THROUGH MIST, WITH THE MOON IN FRONT OF YOU.**
- **THE MOON MOVED.** `KEEP_MOON` stood over your shoulder, which lit the
  tower's face and left nothing in the air in front. It hangs just left of the
  tower's spiked crown in the view you land on now; `rakeLight` comes from it
  (a silver rim), the key light stays where it was, and the SEA'S glitter keeps
  the old direction — a moon that high in front lays its road under the pier,
  and between the planks it read as white holes. The sky's cloud is lit only
  right round the moon (`pow(md, 22)`), or the whole deck in front washed out.
- **THE MIST IS AN INTEGRAL IN THE FOG CHUNK** (`FOG_KEEP`, `FOG_KEEP2`,
  `KEEP_MIST_GLSL`: two more plain-object uniforms beside `FOG_MOON`, on only
  while `inKeep`). An exponential layer on the water has a closed-form optical
  depth along the view ray, so a ray skimming the sea gathers metres of it and
  one up at the lantern none; three drifting noise fields read at the near, mid
  and far range make it banks, and its colour is the moon's, strongest looking
  toward it. The keep's sky runs the same function so the horizon has no seam.
- **AND BANKS YOU CAN SEE THE EDGE OF** (`KEEP_MIST_BANKS`, in `buildKeepLife`):
  low wide billboards standing IN the sea, only where `keepFieldAt` says there
  is open water, half of them in the corridor between the pier and the rock.
  Placed round the island by angle they all landed to the right of the pier or
  behind you — the rocks on the left fail the open-water test — so the front
  ones are sampled in that box directly.
- **MOONLIGHT THROUGH THE MIST is a march in the sharpen pass** (`keepRays`,
  `uRay`): toward the moon's place on the screen, gathering bright pixels near
  it, so the tower, the tree and the clouds' edges leave shadows in the beams.
  Only what is near the moon is a source, and the result falls off with
  distance from it — without that it lifted the whole frame to milk. 36 texel
  fetches a pixel at the retro scale, only there; the keep's whole frame
  measured 1.2 ms of GPU at 1512x780.

**THE CACHES ARE SEEDED, SAND-COLOURED, AND CHECKED.** They were
`Math.random` — different places and a different NUMBER of them on every
load, which the save (by index) could not survive. `mulberry32(20260927)`
now. The look was the owner's "pile of poop": two lumpy brown domes and
dark clods. It is one broad slumped heap of pale dry sand textured from
above at the beach's own grain (`sandHeap`, 0.64 m across and 0.26 tall)
and a few crumbs. A driftwood marker stick was tried and taken out. `moundRole` decides what each holds
— the first, and the first one past the snorkeler, are jars; the second the
CD; the third the spliff (the fourth if the third is the one past the
snorkeler). `settleMounds` runs every second and moves any mound that is in
a solid, on a drift or the headland, inside the wreck's or the dock's box,
or within a keep-out (camp, tribe, portal, trader, the catacombs door, the
castle, the corpse, a crate) to the nearest clear spot — only while you are
forty metres off, so you never see one move.

**THE TAVERN TAKES THE KEEP'S NIGHT INDOORS.** No mist, no stars — the
palette and the warmth: the relight's shadow is lilac (`uAmb`), its moonlight
silver-lilac (`uMoonC`, and the shafts, the skylights' glass and the motes in
the beams with it), its fire the keep's rose-amber (`uTorchC`) in tighter
pools (falloff 1.7) with the dark between them. The far end of the hall goes
into a warm violet dusk (`TAV_FOG`), and pipe smoke hangs under the vault
(`tavHaze` in the relight: an exponential layer, the keep's own integral
inverted, drifting, lit by the fires under it — keep it THIN: at 0.09 the
whole vault vanished into flat fog and the skylights hung in it as black
squares; 0.026 at 8.5 m over the flags). And the room is alive
(`buildTavAtmos` / `updateTavAtmos`): two or three candles on every table
that light their tabletop (`uCandle`) and go out when the table is smashed,
dust drifting through the whole hall gold by the fires and silver in the
moonbeams, the fires crackling as you pass them, old timber creaking now and
then, and the sea a muffled swell through the stone.

**THE TITLE'S GLOW IS ITS OWN LAYER.** The letters carry a noise mask so they
read printed, and a mask takes a text-shadow with it — the old glow was
speckle. `.t-glow` is an unmasked, blurred copy behind them in a cold moonlit
blue, breathing slowly. It must be built of inline-block SPANS like the h1:
each span inherits the indent, and that IS the letter spacing — as plain text
the copy was a quarter narrower than the word it sits behind.

**THE MOUND BY THE PORTAL HOLDS A JAR** (`moundRole`: the one nearest the
stones, after the jar, CD and spliff roles have had their pick).

**THE MOUND NEAREST THE PAVILION HOLDS A HORSESHOE CRAB** (`moundRole` →
'crab', mounds[4] on the seeded layout): a clone of the scan out of `hcrab`,
tipped out of the hole, `gainCrab()` on take, and the syringe's draw works on
it where it lies. **Seat a scan by its own box**: the scan is centred on its
own middle, so placed at the sand's height half of it was under the beach
(lowest point −0.25 m); `placeMoundCrab` lifts it until its box's bottom is a
finger into the heap, and retries until the scan has landed.

**THE LIT CITY IS OUT.** A lit megacity was built behind the skyline (171
instanced towers with speckled windows, spire lights, searchlights, a glow
plane and a sodium underside on the clouds) and the owner's word on it was
that it looks bad: the city is the SKYLINE scan and the box towers again,
fogged as they were, and the sky's horizon wash is back at 0.13 / 0.06. Do not
put it back.

**THE CITY GLOWS OVER THE WALL.** In the sky shader: a warm band clinging to
the +X horizon (`cg`: exp falloff over about fifteen degrees, patchy along the
azimuth where the towers bunch, drifting very slowly), a wider faint breath
under it, and the clouds low over the city lit warm from beneath. Most of the
band is behind the dune, so it reads as a haze the skyline stands against —
the one warm thing in the sky. The sky material is raw display-space colour
and the palette pass quantises it, so a lift under ~0.05 simply vanishes:
0.42 at the band, 0.12 for the breath, 1.1 on the cloud undersides.

**THE BEACH, FOUR ARTISTIC PASSES.**
- **Ground mist** (`FOG_GROUND`, `bwGroundMist` in the shared fog chunk):
  MARCHED, not integrated — the keep's closed form is one smooth sheet and
  looked like haze on a lens. Six steps along the view ray, each asking its
  height over the sand and how much BANK is there (two drifting noise fields
  thresholded into patches with clear air between, wisps at the edges, the
  bank's top rising where it is thick), creeping in off the water at about
  half a metre a second; a flat allowance past 40 m for a low ray. Density
  `GROUND_MIST` 0.13, scale height 0.55, moonlit toward the moon and a cold
  grey away from it. Off in rooms. **Two noise fields thresholded read as
  BLOBS** (the owner's word): the banks are stretched along the shore (x
  0.075, z 0.026), DOMAIN-WARPED by a third field so no edge is round, broken
  by a ridged streak field into long drifting tongues, and each bank's top
  rises where it is thick, so what you see is irregular sheets and ragged
  strands with clear gaps, never a spot pattern.
- **Mist pouring over the dune** (`air.pour`, `updatePour`, `cliffLipX`): 44
  soft sprites in a few wandering streams that creep to the lip, fall down the
  face a little off it like a curtain, lie down on the talus and spread over
  the sand. `cliffLipX` repeats the loft's runnels (periodic in
  `CLIFF_PERIOD`, so world z reads the recentred mesh). Kept clear of the
  drain, the pavilion, the catacombs door, the whale door, the hole, the rock
  and the headland.
- **What the tide leaves** (sand shader). The first pass was a continuous
  dark band the length of the beach and read as a TRAIL, and bold foam
  threads read as paint. Now: WRACK only over about a fifth of the beach (a
  slow mask along z), in loose soft clumps that darken the sand by a third at
  most, a rare shell, all gone by 26 m; FOAM as a thin uneven film of bubbles
  with finer threads where the wave turned, its age read SMOOTHLY between the
  past waterlines, sinking in over about a second and a half, gone past 24 m;
  and a glassy sheen on sand the water has just left (`bwFresh`). **This sand
  is lit mostly by its own emissive map, which never sees `diffuseColor`**, so
  all of it is applied to the FINISHED colour — and the foam LIGHTENS what is
  under it (the grain shows through) rather than being mixed toward a colour.
- **Ink-edged cloud shadows** (`bwCloudShade`, now off `skCloudRaw`): a soft
  body, an edge feathered into tendrils by a smaller field dragged along with
  it, and a darker rim where the ink pools, like a drying watercolour wash.
- **Each stretch grades its own shadows, barely** (`uTone` in the palette pass,
  set from `updateMood` at `MOOD_TONE` 0.30, zero in rooms): the mood's hue
  laid into the darks only, normalised to their luminance, so the level of the
  frame does not move.

**THE WATER'S EDGE IS A SHEET, NOT A DARK LINE (`SAND_EDGE_K`).** The sand is
drawn a metre past the sea's own edge and ABOVE the sea plane, so where the
foam stopped there was a band of wet dark sand between the white and the
water — the owner's "dark sand line". In the sand's own tonemapping chunk,
past the waterline the sand is mixed toward what the sea shows beside its
edge (measured on screen: about (45, 75, 110), `thin = vec3(0.030, 0.072,
0.160) * uEdgeK` at 1.8), a bubbled lip rides the line itself, and a glassy
margin runs a metre and a half up the wet — so the white meets the water with
no dark between.

**THE BANKS ARE GROUND FOR EVERYTHING THAT WALKS (`sandMoundAt`,
`beachGroundAt`).** Every heap built out of `makeApron` was a picture: the
player, the mutants and the crabs all walked the flat y = 0 under it, so a
creature crossing the rock wall's bank or the whale's berm waded through it.
`regMound(mesh)` registers an apron that is a real heap, and `sandMoundAt`
evaluates `makeApron`'s own dome profile through that mesh's world matrix (read
once, lazily). `beachGroundAt` is that plus `wbBermAt`, `driftAt` and
`headlandAt`. A beach creature's height is set from it every frame in
`updateMutantUnit`, which nothing did before: a beach mutant stood at the y it
was spawned at for its whole life. The rise keeps pace with a run and the fall
settles. Crabs use `beachRestY` (the sea's rest height where wet, the heap where
dry); `groundUnder` and the player's `groundY` include the mounds too.
Measured: a mutant chased over the rock wall's bank is never more than 7 mm
below the sand; over the whale's berm, never more than 9 cm, for a frame at
the ridge.

**THE WHALE'S BERM STANDS IN THE SURF; THE SEA RUNS ROUND IT.** It wore
`sandMat`, which discards seaward of `shoreLine` — so as the swash came up the
heap vanished and the whale sat over a gap onto the sea plane a third of a
metre down, and what survived just past the line was tinted as the sea's thin
sheet (the pale blue patch). `sandShader` takes a fourth argument, `lift` (a
GLSL expression in metres, subtracted from the shoreline under that fragment;
the beach passes nothing), and the berm's material (`bermMat`, key
'whaleBerm') uses it with `keep`:
- it is KEPT wherever it stands above `WB_BERM_WL` (-0.28, the water against
  it; the sea plane is -0.34), with that line wandering by a few centimetres of
  noise so it is not a contour line;
- above the water its distance from the sea is its HEIGHT alone once the swash
  has passed its foot (`WB_BERM_LIFT` 6 m per metre), so it reads wet sand and
  never the sea's sheet — except its bottom `WB_BERM_SHEET` (0.14 m), which
  wears the sheet and the lip so the edge meets the water with no shelf;
- every rim sinks well under the sea (-0.55), and past the break (x -3 to -13,
  the mean waterline here is about 0) the berm itself eases down under the
  water (`bermSink`), because a heap standing in the open swell is a sand bar;
- the mesh is denser (rows 0.16 local apart, `NJ` 40): at the old density the
  water line was a regular sawtooth of the outer triangles.
The overlay (`whaleBermTone`) discards under the water and fades by the same
height-based distance. `wbBermAt` clamps at zero, so the sunk rim never pulls
the ground down. Measured across the tide (shore x 8, 6, 4, 1): the heap holds
against the flank as wet sand at every height.

**THE DUNE'S MIST IS OUT OF STEP (`stepPour`).** It was born all at once on
the first frame with one set of speeds and one round sprite, so the whole
curtain came over the lip together — "each blob looks and moves the exact
same". Every blob has its own creep, weight, fall speed, spread, bob, life and
opacity; on its first birth it is aged to a random point in its life in
0.1 s steps; the streams are loose rather than lanes; and `makeAirPoints`
takes `shaped`, a per-point seed (`aR`) that turns, stretches and lobes each
blob so no two share a silhouette. Measured on the first frame: 10 on the
crest, 7 falling, 22 spreading, at ages spread over their whole lives.

**THE SNORKELER LAUGHS TO HIMSELF (`updateSnorkLaugh`).** Five laughs cut at
their own silences from the owner's recording (`snorkLaugh`, -3 dBFS each).
Within `SNORK_LAUGH_NEAR` (16 m) of his towel: the first 3.5-7.5 s after you
arrive, then every 22-48 s, two or three a visit, never the same one twice
running; played from where he is through `playSampleAt` (new `pick` option)
at `SNORK_LAUGH_GAIN` 0.95, which arrives at about a quarter from the towel
twenty metres off, dulled toward 1.3 kHz. While he laughs his head lifts a
hand out of the water (`snorkLaugh.lift`, fed into `snorkUp`) and small
splashes go up round him with a quiet `wade`.

**Also this round:** the first shell lies at (7.36, -16.66), the owner's spot;
the crosshair fades out as the .44 comes up to the sights (`crossAimK`,
opacity only — five other things own its display); and the belly's plankton,
spores and mist drift at about a third of their old pace (the twinkle is
unchanged).

**THE SHELL COMES DOWN ON A CLICK.** While it is at your ear the primary action
takes it down (`stopListening(true)`: the sea goes out of it over a breath, not
on a click), and the prompt says so.

**THE KEEP'S SKY WAS DEAD SINCE THE OPTIMISATION PASS, AND IT WAS A SHARED
STRING.** `bwGN` (the ground mist's one-fetch noise) went into
`KEEP_MIST_GLSL`, and that string is also pasted, on its own, into the keep's
sky (`makeKeepSky`) and its cloud banks (`buildKeepLife`) — which do not have
the fog chunk's `uniform sampler2D fogNoise`. Both failed to compile, so the
sky over the island drew nothing: the owner's "you changed the tavern's sky
and fog" (to him the tavern is the island it stands on). The ground mist is
`GROUND_MIST_GLSL` now and only the fog chunk gets it. The round-19 check of
"0 bad programs" was taken before the keep had ever been drawn: **a program
count is only as good as the scenes rendered before it; check it in every
room**, and `read_console_messages` keeps errors from before a reload, so read
`renderer.info.programs[i].diagnostics` instead.

**THE NOISE TEXTURE HOLDS THE OLD HASHES, NOT RANDOM BYTES.** The owner saw
it at once: after the optimisation pass the moonlight on the beach looked
worse. The first `FOG_NOISE` was 256² of random bytes, and the old `skH` is
not plain random on a lattice — it has a streaky structure of its own, and
that structure was the clouds, the lit rims round the moon and the cloud
shadows on the sand. `FOG_NOISE` is now 512² RG half-float with the old
hashes BAKED into it in JS float32 (`skH` in red, the mist's sin hash in
green) over lattice cells -256..255, read with one filtered fetch at
`(i + u + 256.5) / 512`. Measured side by side at a fixed clock: the same
clouds in the same places as the hashed maths (mean pixel difference 1.5-2.2
against 2.2-3.7 for the byte texture), at 1.7-1.9 ms of GPU at 1080p against
the hash's 2.2-2.6 and the bytes' 1.5-1.8. Four `texelFetch`es per noise
(exact bilinear in the shader) looked identical and cost as much as the hash:
one hardware-filtered fetch is the whole saving. Bake: 12 ms at load.
`tools/moonshot.js` renders the four moonlit stills used for the A/B.

**A THING LANDING ON SAND IS A FOOTSTEP (`sfxSandDrop`).** The fang's landing
was a quiet synthesised puff and the snorkeler's key made no sound at all: both
play the owner's recorded sand steps now, from where they land
(`playSampleAt`, gain ~0.95 over 5 m, heard to 45 m), with a softer second step
a beat later for the hop.

**A GLOWSTICK IN THE CACHE BEFORE THE CAVE.** `moundRole` 'glow' is the last
mound short of `HOLE_Z` that no other role took (mound 5, z -605, 35 m before
the mouth); it comes out lit through `dropGlowstick`. There are two glowsticks
now, so both pickups go through `gainGlowstick` and a second one STACKS
(`count`, saved as `glows`) — `addToInventory` refuses a duplicate by identity
and would have taken the find off the floor for nothing.

**THE COURTYARD WAS NEVER TILTED; ITS SKY WAS.** Fitting a plane to the walk
grid and to the drawn ground both gave under 0.2 degrees, and the camera had
no roll. What leaned was the sky: its clouds were stepped contour bands
stretched three to one along one axis, so every cloud in the frame slanted
the same way and the ground under them read as tilted. `makeDojoSky` is soft
domain-warped cloud on a level deck now, lit grey-violet so it can be seen at
night, with a flat glowing band of mist along the horizon all the way round.

**THE SAND HEAPED UP HER SIDES WAS THIRTY-FOUR ICOSAHEDRA ON `sandMat`.**
Twenty-faced gems two to three metres across read as faceted slabs with a
white facet on each, and because `sandMat` discards seaward of `shoreLine`,
every one standing in the surf was deleted by the tide — the same "the wave
meets her and it turns invisible". They are a heap now (a dome that falls
away past its own rim, knocked out of round), they wear the bed's material,
and `bedMat` takes the whale berm's `lift` so a heap out of the swash is wet
sand with the sea's thin sheet only at its foot. **And the bed's uv was
four hundred times too dense**: `sandTex` carries the beach's repeat itself,
so a world uv is `(x + 800) / (SAND_TILE * repeat.x)`, `(800 - z) / ...`
(the whale's `SAND_UV`), not metres over `SAND_TILE`.

**A COLLIDER MAY CARRY ITS OWN `step`.** The body bag's four cylinders top
out at 0.28, under `ROCK_STEP`, so the walk climbed straight onto the corpse
its own comment says you walk round (a 0.25 m lift of the eye, found by
walking the lane past it). `rockGroundAt`, `pushOutOfSolids` and the inside-
corner test read `c.step ?? ROCK_STEP`; the bag's is 0.10 — a wall on foot,
still a thing you can jump onto. Measured: stopped 0.6 m from its middle from
four sides, and a jump lands on it at 0.28.

**THE DOJO'S KATANA IS FOUND BY THE MOON**: a column of moonlight on the statue's belly, a pool
of it on the stone, a cold pooled lamp on the hilt (`lpAlways`), a sheen running down the steel
(its materials are cloned first), and a stronger glint.


**THE LAST TWO CACHES HOLD WATER.** `moundRole`'s leftover role — whatever is
not a jar, the CD, a spliff, the crab or the glowstick, which on the seeded
layout is the two last mounds down the walk (12.6, -987.7) and (10.1,
-1054.1) — is `'water'` now, not the placeholder `makeBuriedObject`.
`placeMoundWater` stands a `makeWaterBottle()` in the hole under the mound's
own shine, taken through `gainWater` so it stacks; `moundRelicHold` pre-builds
it like the others.

**THE WELL AND THE MAN IN IT (2026-10-10).** `assets/well.glb` (Adam Glachan,
CC-BY-4.0) at `WELL_X` 10.6 / `WELL_Z` = SMILE_Z + 0.6, the tall one moved to
`SMILE_X` 9.3 and turned to look INTO it (his phase-0 facing is the well, not
you; the bolt at `SMILE_SEE` is unchanged). The scene, in order
(`wellLook.phase`): `in` (1.15 s lean over the rim, with a 22 cm rise so the
camera goes over the ring and not through it) → `hold` (a dialog with no
speaker, `WELL_NPC`, choices LET HIM UP / DO NOTHING, the lens held down the
bore by `dialogTarget` on `wellMark` 2.4 m down) → `crank` (7.5 s, the bucket
on our own rope `wellParts.myRope` to 6.5 m, the pawl every 0.19 s) → `wait`
→ `grab` (the rope jerks, `sfxWellGrab`) → `climb` (11–14 s of strides,
`sfxWellStride(prog)` louder and brighter, the rope swaying with each, a
little trauma) → `black` → `reveal` (`wellReveal`: you are put 3.9 m up the
sand facing the sea with him 1.6 m from the well between you, `cineHold` +
`dialogFov` 34 on his head bone, idle01 at 0.22) → he stares 3.6–7 s
(`wellStalk.stare`) → `wellCharge`. `wellPhase` 0/1/2 is saved as `well`; a
save with 1 loads as 2 (he is up), with him standing by the well, `wakeAt` 16.
- **The shaft** is a BackSide cylinder with vertex colours and `fog: false`
  (the fog LIFTS a dark thing): r 0.225 to fit the base's 0.24 bore, top at
  0.68, black by three metres. An unlit colour is what it glows under the
  night's tone curve: 0.30 read as a LIT GREY CONE filling the mouth
  (measured); 0.06 at the lip is a hair over the sand. The base's own floor
  disc (72 verts, r < 0.36 at its y −1) is cut from the index at load.
- **The bucket hung IN THE MOUTH as authored** (y 0.74–0.86 at the rim): raised
  `WELL_BUCKET_LIFT` 0.44 to the axle, and the lean's eye at 1.02 m goes UNDER
  it, so the look is past it into the dark and it comes down past you.
- **Night on the maps**: colour × 0.42 (mechanism) / 0.62 (roof) / 0.72
  (stone), roughness 1, metalness 0; a breath of emissive on the mechanism so
  the bucket can be watched going down. No `reexpose` lift.
- **The air**: `wellMistK` (smoothstep inside 34 m, × (1 + 0.9 `wellDread`)
  while he is being brought up or stared at) darkens the mood tint, thickens
  the fog (× 1 + 1.25 k) and piles the ground mist (× 1 + 2.6 k).
- **The dialog camera is the lens the whole way**: `cineHold` kept through
  `endDialog` (it clears `dialogTarget` otherwise) and re-targeted on his head
  at the reveal; released at the charge.
- Sounds, all synthesised: `sfxWellAir` (a bandpassed loop with drips, while
  you look), `sfxWellCrank`, `sfxWellGrab`, `sfxWellStride`, `sfxWellWind`
  (nine seconds of gusts at the reveal), `sfxWellBreath`.
- **HE TALKS (2026-10-10).** The owner's script, word for word, and his own
  recording cut at its silences (`assets/well-guy1..6.m4a`, bank `wellGuy`):
  start "Hey, I fell" → "In the well? How?" → the tavern line → "They let you
  walk out without paying?" → the bartender → "What's his name?" → Stanley →
  "Stealing? Don't you deserve it?" → "Nobody deserves this" → "Why should I
  trust you?" → "You shouldn't". LET HIM UP (`WELL_UP`) is on every node;
  doing nothing is the dialog's own leave. Each of his lines plays from down
  the shaft as its node is shown — `showDialogNode` now runs a node's `say`
  — through `playSampleAt` with a dull low-pass and a second copy 85 ms
  behind at a fifth (the stone's slap); the first line goes the moment you
  choose to look, before the words. THE TAKE IS "Hey, [1.1 s] I fell coming
  back from the tavern…": "Hey, I fell" is not a separate line in it, so clip
  1 is "Hey" + the "I fell" off the front of the tavern line with a quarter
  second between (ffmpeg concat), and clip 2 keeps its "I fell". Found by
  20 ms RMS profiles, not by ear — the pane is muted.
- **THE STING ON THE BLACK (2026-10-10).** The owner's "well zombie" (3 s,
  `assets/well-rise.m4a`, bank `wellRise`) plays through `playSample` the
  frame the climb gives way to black, under the fade and into the reveal.

**THE WELL REDONE (2026-10-10, the owner: "looks horrible, textures off, too
small, needs to look deep and dark, insane fog, a scene change, take away the
crawl").**
- **Size**: `WELL_S` 1.5 on `wellG`, the model's y −1 (foot of the base) on the
  sand via `wellY(yl)`; rim `WELL_RIM_Y` 0.96, roof 2.8, outer r 0.945. A
  `rockColliders` disc (r 0.63·S) so you walk round it. `WELL_STAND` is now
  man 2.0 / you 4.4; the tall one moved to `SMILE_X` 8.7 (he stood in the roof).
- **Textures were crushed, not wrong**: the maps' mean albedo is 52/47/30 and
  the first pass multiplied them by 0.42–0.72 — a black cut-out with a lit grey
  cup in its mouth. Now `reexpose` like the rocks (0.62 + cold rim; mechanism
  0.78). The dark goes INSIDE: the base gets vertex colours, inward faces at r
  < 0.40 shaded `0.04 + 0.96·exp(−3.6·depth under the rim)`.
- **The bore was a lid of sand.** The ring's bore is r 0.245 model (every
  inward face measured there). The beach is one opaque sheet at y 0, and the
  SAND WALL'S TOE runs on under the beach at y −0.12 all the way to x 10.6 (it
  was the second floor down the bore — found by a ray down the axis listing
  every triangle hit). Both discard inside `WELL_HOLE_U` (x, z, r = bore + 1.2
  cm: any less left a sand lip inside the ring): `sandShader` and a wrapper on
  `cliff.material.onBeforeCompile` (via `vDrainW`). The scuff decal's middle
  is cleared too — a FOGGED transparent decal over a hole is a grey disc.
- **The shaft lining begins at the ring's foot** (`wellY(-1)`), r = bore ×
  0.99, colour 0.016·exp(−0.9·depth). Starting at the rim at r 0.225 it stood
  INSIDE the ring and covered its stones with a pale tube (0.06 read grey).
- **The air**: `wellAirK` = smoothstep(72 − d, 0, 46). Fog density is LERPED
  to `WELL_FOG_D` 0.11 (not multiplied); `scene.fog.color` eased to
  `WELL_FOG_COL` (cold ash) in `updateWellAir` and put back on leaving (not in
  a room — rooms set their own). A dark fog read as nothing but more night; a
  pale one reads as fog with the well dark in it. Tint: blue cut by half, and
  `wellDread` darkens EVENLY (as a hue shift with the dread multiplier on it
  the reveal went olive). Ground mist × (1 + 3.2 k).
- **`wellFog`**: the sky is fog-free, so no density hides the moon. A BackSide
  sphere r 44 round the eye, black `MeshBasicMaterial` with `fog: true`,
  transparent, renderOrder 50 — it comes out as exactly the fog at that
  distance and walls off the sky with no seam.
- **`wellBanks`**: 30 instanced cards round the well, turned to the eye about
  the upright, fbm crowns, wheeling at 0.01–0.03 rad/s; faded inside 1.8–6.5 m
  of the eye (the shaft look and his face stay clear) and past 24–36 m (none
  outside the wall); renderOrder 51, coloured from the fog's base + lift ×
  `FOG_TINT` × 2.
- **Sound**: `beachBedK` × (1 − 0.72 k), `windBedK` × (1 − 0.45 k), and
  `sfxWellDrone(k)` (wandering band-passed wind + a 55/55.7/82.6 Hz hum).
- **The crawl is gone**: `wA4` (`on_all_four_A`) deleted with its alias; 40 s
  of fight logged 26 swings, wA1/wA2/wA3 only. NOTE dev mode stops every
  mutant swinging (`!settings.devMode` on the swing branch) — test a fight
  with it off and `heal(99)` each frame. And calling `wellLetUp()` directly
  leaves the dialog open (frozen) — `endDialog()` after.
- Harness: `tools/wellview.js` (`__wv.sheet` of views offset from the well).

**THE WELL, THIRD PASS (2026-10-12).**
- **Scale is non-uniform**: `WELL_S` 1.9 across, `WELL_SY` 1.55 up — the ring
  2.4 m over, bore 93 cm, roof 3.1 m, and the rim still 1.0 m (uniform 1.9
  put it at the chest). `wellY` uses `WELL_SY`; bore, collider, lean use `WELL_S`.
- **Maps at `reexpose` 0.50** (mechanism 0.62): at the rocks' 0.62 it was still
  a near-black block in the grey.
- **The shaft is a textured stone lining from the rim down** (`wellStoneTex`,
  drawn: squared, chamfered blocks in courses — an ELLIPSE per stone left the
  joints as wide as the stones and read as pale pebbles), r 0.99 of the bore,
  tapering to 0.92, a tile per 1.5 m, unlit, vertex light 0.30·e^(−0.6d) +
  0.08·e^(−0.2d). Matches the owner's photograph: lit courses closing to black.
- **The lantern** (`wellLantern`, `updateWellLantern`): tin cage, glass, a
  flame, an additive halo sprite that grows with distance (it is the fog
  that is lit), a pooled point light 1.35 at 7.5 m. On the rim's dune side
  (`WELL_LANTERN_A` 1.75) — under the lean it flooded the near rim orange.
  It dies over the last 1.4 s of the climb, is out in the black, stays out
  at `wellPhase` 2.
- **The tall one** stands at `SMILE_STAND` (WELL + 1.8, −1.2), facing across
  the mouth toward its near side, head bowed (`smileBow`: Bone003 rotX −0.22,
  Bone004 rotY −0.45 / rotZ −0.12 after the mixer — axes found by rotating
  each bone and watching the head end move). `SMILE_X/Z` are the STRETCH'S
  ANCHOR (the pavilion is `SMILE_Z − 90`, the mood keys off it) and must not
  move. Anywhere behind the roof's width (±1.15 m) the roof hid him from the
  approach. `SMILE_SEE` 6.5: the fog only gives him up at ~12 m.
- **The look**: `in` → `peer` (5.6 s of shaft only, the lean easing 7 cm
  further; the voice at 4.2) → `hold` (the dialog). The first line is no
  longer played at `wellLookStart`.
- Harness: choices only exist once the node's text is up — wait for
  `button.choice` with `offsetParent` before clicking.
- **THE LANTERN MOVED TO THE SAND (2026-10-12, "not floating or hanging").**
  On the rim it read as hung off the post. Now at the ring's foot
  (`WELL_LANTERN_A` 0.62, r = ring + 0.20), `beachGroundAt` − 1.5 cm, tilted,
  ×1.3: a hurricane lantern built from lathes (dented fount, burner, globe,
  sooted hood), tube guard wires and rings, the two side air tubes, a fallen
  bail. The globe's map is a soot gradient used as its own `emissiveMap`, so
  the clean band glows and the crown stays black. Flame = additive teardrop +
  core + an inner glow sprite; the halo sprite is centred 0.34 up (at 0.16
  half of it was depth-tested into the sand). The pooled lamp peaks at 7.5,
  decay 1.6, 8 m — **intensities here are physical: the other lamps are 9–14
  and 2 was invisible**. Gutters (`dip`, sometimes with `sfxLanternSpit`) and
  stutters (`spit`). Harness: `__bw.wellLantern.userData` (zero `dip`/`spit`
  for a steady still).

**THE WELL, FOURTH PASS (2026-10-12).**
- **The shaft is the PARAPET'S width.** The base has two inward faces: the
  stone parapet at r 0.43 and a narrow tube at 0.245 inside it. The lining
  followed the tube and read as a pipe standing up inside the parapet (the
  owner's "doesn't match up"). The tube and everything with all three
  vertices inside r 0.40 are cut from the base's index at load; `WELL_BORE_L`
  0.425; the sand/cliff hole follows it.
- **Its stone is the well's own**: the grey cobble panel of the base atlas
  (u 0.745–0.902, v 0.345–0.640 — between that column's dark bands), cropped
  from the loaded map, mirrored-repeat both ways, at the model's density
  (0.219 of the map per model metre, scaled by WELL_S / WELL_SY). The mixed
  UVs on the parapet's own face (two atlas columns) are not reused.
- **The murk** (`wellMurkPatch`): lining, rope (`myRope`) and the mechanism
  material (bucket, handle) are mixed toward `WELL_MURK` by depth under
  `WELL_MURK_U` (the rim) AFTER `fog_fragment` (the game's fog is pale here
  and would light the deep); k 0.36, lining 0.22. Each patched material gets
  its own `customProgramCacheKey` (uuid) — what ran before it differs.
- **Checkpoint** moved: `removeSmile` sets `smileSavePending` (live only);
  `updateWell` writes it the first frame you are free with `wellPhase` 0.
  The saves at LET HIM UP and at the reveal are gone; one more is written
  1.5 s after his key drops.
- **The tall one** bolts at `SMILE_SEE` 11 (was 6.5). The bow was REMOVED:
  rotations added after the mixer to bones the idle does not animate
  accumulate every frame — his arm swung round.
- "Hey" / "I fell" in `well-guy1.m4a`: the gap widened from 0.38 to 1.0 s
  (ffmpeg concat with 0.62 s of silence at 0.70 s); the dialog opens at 6.0 s
  of the peer (1.8 s after the voice) so the words do not run ahead of it.


## 2026-10-13 — the well's lantern removed

The owner: "remove the lantern from the well as well." `wellLantern`,
`WELL_LANTERN_A`, `updateWellLantern`, `sfxLanternSpit` and the `__bw` export
are gone; the shaft lining's comment no longer counts it as a light at the lip.
The paragraphs above about it are history.

## 2026-10-13 — the well: the man kept out of it, the speck, the portrait

- **HE WALKED THROUGH THE WELL** — nothing on the beach is solid to a unit,
  and the chase steers straight at you. `wellManClear(dt)` runs after
  `updateMutant(dt)`: he is held at `WELL_MAN_CLEAR` 1.72 m from the axis (the
  parapet is 1.25 m out, the crank's handle 1.43, measured off the drawn
  faces, and his body a little over 0.4), and when you are behind the well
  from him he is walked round it the nearer way at up to 4.5 m/s. Measured:
  started on the far side, he went round, never nearer than 1.72, and was on
  you in 1.9 s.
- **THE SPECK WAS THREE THINGS, ONE BEHIND ANOTHER** (found by hiding
  every mesh in turn and reading a 7×7 block of pixels, then bisecting the
  index with `setDrawRange` to the one triangle):
  1. the base's floor cut read the index captured BEFORE the tube cut and
     wrote it back whole — the inner tube had never been cut at all, its foot
     a metre down inside the bore, moonlit. It reads `g.index` now, and the
     tube cut goes by each triangle's MIDDLE (< `WELL_BORE_L` − 0.012), not
     "all three corners inside", which kept every face straddling the line;
  2. with the tube gone the parapet's own inner face (r 0.42–0.44) showed,
     lit at full: the depth shading stopped at r 0.40. It runs to 0.47;
  3. the shaft's black cap at 40 m was turned face DOWN (rotation +π/2), so
     from the lip it was culled, the shaft's foot was open, and the fog's
     44 m shell round your eye showed through it dead in the middle. −π/2,
     double-sided.
- **THE PORTRAIT** (`assets/well-portrait.jpg`, 512×690, 44 KB, made by
  `tools/wellportrait.js`): his own scan, shot in a studio of its own
  (`__wp.studio(600, 800, __wp.SIT)`) in a smooth clay skin, the jaw shut on
  its hinge — the jaw bone's LOCAL Y, −0.55 (x and z only slew it) — then
  painted over in 2D: the mouth's slit and torn corners diffused shut
  (`_inpaint`, Jacobi from the edges), the sockets and cheek hollows eased,
  the lower face softened into one surface with its grain put back, ears, a
  cropped fringe, brows, lids/irises/catchlights over the scan's own
  eyeballs, crow's feet, a parted smile on the upper teeth, a nose, a wing
  collar, tie, waistcoat, watch chain and black coat; then toned silver,
  soft, grained, vignetted, foxed, scratched, creased, on a buff card
  ("J. Abernethy & Son · Portraits") with worn corners. The bald egg of a
  skull, the wide-set deep eyes and the wide mouth are what make it him.

## 2026-10-13 (later) — the empty well, the portrait remade

- **"Look inside" once he is out** (`wellEmptyLookIt`, `wellLookStart(true)`):
  the same lean over the rim and down the bore, no voice and no dialog; held
  in 'peer' until a key or a click AFTER the press that started it has been
  let go (`armed`), then 'out'. The prompt "E Step back" is put up by
  `updateHover` while it holds. Offered from the reveal on (and on a load
  past it), not while he is awake within 12 m of you.
- **THE PORTRAIT, AGAIN** (the owner: "the clothing … looks horribly fake …
  hyper realistic"): `__wp.sit2` shoots his head on the BARMAN'S BODY — Wong
  (`assets/wong.glb`) is a Character Creator scan in a white shirt, grey
  waistcoat and patterned tie, with a separate head (Std_Skin_Head, eyes,
  teeth, brows, cap: hidden). Wong's arms come down off the T-pose
  (`CC_Base_L/R_Upperarm` about local z, ∓1.25); the well man is scaled so
  head-to-neck matches Wong's ×1.35, his neck bone stood on Wong's
  (`CC_Base_NeckTwist01`), his `shoulder_L/R` and thighs scaled to nothing
  and his chest narrowed (×0.6 in x/z, the neck given it back) so nothing of
  him shows through the cloth; his face wears a tile of real skin (`skinTile`:
  a patch of Wong's forehead map, mirrored, ×5) over white. Wong has no
  morphs and no lip bones — his face cannot smile, and would have been the
  barman's face anyway. The 2D face painting is the first version's, carried
  onto the new shot by `compose(raw, { map: [1.333, 50, −25.6], body: true,
  crop: [90, 120, 720, 960], lift: 0.28 })`.

- (then: "make his shirt all white no tie") `sit2(…, { shirtOnly: true })`
  hides `FS_Tie` and `FS_waistcoat` too; Wong's shirt is whole under them
  (no culled faces), so it is just the white shirt, buttoned, collar open.

## 2026-10-13 (last) — the well's inside put back, the tall one put back

- **"You ruined the textures looking into the well."** The tube cut (by
  triangle middle) took out the inner tube the lining's texture was matched
  to — the cut had never actually run before (the floor cut rebuilt the
  index from the copy taken before it), so the well the lining was fitted to
  always had its tube. The tube is kept; the inward-face darkening is back to
  r < 0.40; only the tube's last course (y < −0.8, r < 0.31 — lit by its
  map's glow whatever the vertex shade says) goes with the floor disc. The
  speck that mattered was the shaft's open foot (its cap, flipped face up).
- **The tall one** is back at `SMILE_X, SMILE_Z` — the sea side of the well,
  a stride off the rim, turned INTO it (`atan2(WELL_X − x, WELL_Z − z) + π`),
  as he stood in 7f2b1b0. `SMILE_RUN` 12.5 (was 8.5; measured 12.8 m/s),
  `SMILE_STEP` 0.12, the run clip's rate scaled with it.

## 2026-10-13 (night) — the shaft carries the tube on down; his photograph on the table

- **THE LINING IS THE TUBE, EXTRUDED** (`wellBoreLining`). Measured off the
  Well_base mesh: the bore tube is a CIRCLE of r 0.3405 about (−0.0945, 0) of
  the model — not about its origin, which is why "r from the origin" read it
  as an oval and a filter on that radius found only the near half (a C-shaped
  lining, and the fog showing through the gap). Its wall carries one strip of
  the atlas: u 0.737 at its foot (y −0.873) → 0.905 at y −0.374 (0.337 a unit),
  v round it, with the strip's seam at about −104°. The lining is that foot
  ring's 33 vertices carried straight down 26 model units (40 m), each column
  keeping its v, u mirrored on down at the same rate; a black cap at its foot
  (centred on the tube, not the origin). The old wider cylinder is hidden.
  - LIT, it went pale: the model's material picks up its grazing rim down a
    long tube. It is a `MeshBasicMaterial` on the model's own map, vertex
    shade `WELL_LINE_K0` falling away (0.7·e^−0.9t + 0.3·e^−0.25t), murked
    (`wellMurkPatch` 0.22), tinted `WELL_LINE_TINT` (0.099, 0.165, 0.308) —
    measured so the lining's top matches the tube just above the join in a
    render (tube 12.0/14.8/18.6, lining 15.1/16.7/19.6). The factors are
    LINEAR: a tint of 0.35 moved the screen value only to 0.62 of itself.
  - the tube itself (the base's material) gets `wellBorePatch`: inside the
    bore (within 0.36·WELL_S of the TUBE's centre, below the rim) the well's
    grey fog is replaced by the murk mixed from the pre-fog colour, so the
    tube does not go to a grey bowl; and its far wall is shaded by depth
    about the tube's own centre too.
- **His photograph** (`wellPortrait`, main.js after `makeMushroomHouse`):
  `MUSH.TABLE` (exported by the model: the table top's x, y, z, r) + (0.06,
  0.27), turned to the stair head (`TOP_ANG`, r 2.4), 0.19 × 0.256 in a dark
  frame leaning back 0.2 on a strut that stays BEHIND its back (the first
  strut stood through his face), the card's map emissive at 0.22. Added
  before `bakeStatic`, so it is baked with the room.
- **Teleport to lighthouse (dev)** (settings menu, `m-isle`,
  `devTeleportIsle`): every room left (`devLeaveRooms`, shared with the shop
  teleports), the walk's once-only events marked passed, then held in the
  black (`devIsleWait`, in `updateIsle`) until the island has loaded, and put
  where the lift puts you (`placeOnIsle`): the drawbridge, (16.9, 20.05,
  −1153.4). Measured: on the island in 4 frames when it was loaded.

## 2026-10-13 — the well, darker, and the bucket into the dark

The owner: "make the well look darker when looking in … blend them a little
better and make the rope/bucket slowly disappear into the darkness it just
clips out of sight right now."

- THE MURK WAS LIGHTER THAN THE DEEP WALLS. `WELL_MURK` (mixed in AFTER the
  colour-space conversion, so it is a screen value) was (0.014, 0.016, 0.020)
  and the lining's own shade fifteen metres down is darker than that, so a
  thing going down tended toward a grey shape on black — until
  `wellSetBucket` switched it off at 5.2 model units. Now (0.005, 0.006,
  0.008); the mechanism and the rope murk at 0.5 a metre (was 0.36), gone by
  ~7 m, and the bucket is hidden only at 6.0 units (9.3 m, exp(−4.65)).
  Rendered down the bore: plain at 1.6 m, faint at 2.8, gone by 4–5.
- The tube's bore patch (`wellBorePatch`) is 0.9 a metre from 5 cm under the
  rim (was 0.30 from 30 cm), and the lining's murk 0.45 (was 0.22), so the
  stone goes down into the dark on one gradient and the join at the tube's
  foot has nothing to show.
