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
`digImpact()` stamps `digHoles` (a lit height-field decal) + `digMounds`
(a crescent of spoil) — see "THE MARK A STRIKE LEAVES" below; the sunk cone
is gone — spawns `spawnPuffs()` sand, and plays `sfxDigImpact()`. Pools
recycle after `DIG_POOL` (32).

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

**THE FIRST MOUND SAYS IT CAN BE DUG (2026-10-13; the owner: "show the controls
to dig mound when you see the first one").** "Dig up the mound" only ever came
up with a dig tool out, so a player walking past the first cache bare-handed
never learned what a mound was. Two things: `updateDigTip` puts one line in
`#digtip` (the fight tip's own CSS) the first time an untaken mound is within
10 m and near the middle of the view (dot > 0.82) — "Mound in the sand ·
something is buried · Shovel out + click / Find a shovel" — for 8 s or until a
mound is dug; once a game, `digTipDone` on the save (inferred past z −60 like
`fightTipDone`). And `updateHover` names a mound under the crosshair without a
dig tool out ("Something is buried here · take out a shovel to dig" / "you need
a shovel to dig"); `moundUnderCrosshair` only casts at the sand when a mound is
within reach + 2 m, because `crosshairGroundPoint` raycasts the whole plane.

**THE BEACH IS SHUT BEHIND YOU BY A SECOND WALL (2026-10-13).** The saucer was
the only thing that stopped a walk back past the drainage tunnel home; with it
gone, THE WALL's recipe is built again at `BACK_ROCK_Z` (60) in the rocks
loader — its own seed (20261013), the three carrying masses the other way
round (largest against the cliff) and staggered on a slant, two riding on top,
everything shed and the aprons down its −Z face, the side you walk up to. Its
colliders overlap from beyond `WADE_X` to beyond `CLIFF_BLOCK_X`. `moodKeys`
had `UFO_Z` as a key; it is the literal 58 now.

**THE CAMP, REDONE (2026-10-13; the owner: "make the cd player not shine like
an item also make the towel and everything there with the cd player look more
real it looks like ai").** What read as generated: colour-quantised clip-art
maps, every loose thing at 1.6–2.3× life (a 32 cm Discman) and item glints on
things that are not items. Now: near life size (Discman 1.15×, cans 1.15×,
goggles 1.2×), lit materials with drawn maps and a little of their own map as
emissive, no glints on any of it. The towel is a 512×288 terry map (a loop per
cell, pile noise, a sun-fade, four uneven navy/cream/coral stripes, sand ground
in at the ends and edges, a damp patch where wet feet stood, a hem, and the
fringe CUT OUT with `alphaTest`), a normal map off the same loops, and a
displaced 84×44 sheet bedded into the sand at its edges with a kicked-up
corner. `towelY(x, z)` is its height in its own frame, and `onTowel` puts a
thing on it — the Discman's cable is laid along it point by point. **A folded
end was tried and taken out**: the turned-back flap's hem read as a rung across
the towel. The tote is a box pushed halfway to its ellipsoid and slumped,
plain-weave canvas, straps flopped down the side, a rolled towel in its mouth.
Flip-flops are an extruded sole outline with the heel and ball worn darker.
The Discman is a lathe body with a brushed lid map printed "DIGITAL MEGA BASS /
ESP", five rubber keys, a dead LCD and a jack; foam headphones on a steel band.
`artCanvas` is a CONST declared sixty thousand lines below the camp, so the
camp builds its canvases itself (`cv`); `artNoise2`/`artFbm`/`artNormalFrom`
are function declarations and hoist.

**THE SNORKELER LAUGHS THE FIRST TIME YOU STEP ON HIS TOWEL (2026-10-13).**
`snorkFirstLaughed` (on the save, inferred 40 m past the camp): the first frame
the camera is over the towel (|dx| < 1.2, |dz| < 0.75 of `CAMP_X/Z`) sets the
visit going with `L.next` ≈ 0, so the laugh is now; after it the visit's own
15–32 s clock runs as before.

**THE PACK IS A LITTLE HARDER (2026-10-13; "now that you can hit them all at
once").** After the kinds are defined, the eight `mutant.glb` kinds get hp × 1.4
(rounded), aggr × 1.15 and windK × 0.94 — one blade arc hurts everything in it,
so a pack went down in half the blows it was tuned for.

## 2026-10-14 — the bottle out, the towel's sand, Bradley's line

- **THE MESSAGE IN A BOTTLE IS OUT** (the owner: "take out the bottle on the
  beach with the note in it"). The prop, its break and the note it dropped are
  deleted; `bottleProp` (null) and `bottleBroken` stay as names for the
  harness, and `__bw.bottle` is null. `openNote` is still there, unused.
- **SAND SHOWED THROUGH THE TOWEL** — z-fighting, not the map: the cloth lay
  3–13 mm over a beach at y = 0 and `towelY` bedded its edges BELOW it, so at
  any distance the depth buffer could not separate the two and the sand ate
  a corner. It rides 3 cm up now (edges still dip, to about 1.8 cm), with a
  polygon offset (−2, −4). Everything on it asks `towelY`, so it rose with
  it. The sand grains drawn into the terry were thinned too (threshold 0.86,
  blend 0.18–0.40): a heavy speckle reads as beach through the cloth.
- Bradley's rumour line says "a giant horseshoe crab", not "great".

**SURF ON THE ROCKS (2026-10-14, the owner: "make the waves interact more
real with the rocks this looks bad like ai slop").** The sea's 9 m facets cut
straight across a boulder. Every formation stone (`surfRocks`, filled by
`placeMass`; 35 of them with x in −30 … 10.5) gets a ring of foam in ONE mesh
(`buildRockSurf`, called at the end of the rocks loader): it lies on the
FACET the ocean draws — the same grid (2200/240, origin `uOffset` − 1100),
the same diagonal (a,b,d)/(b,c,d), `oceanWave` at the corners, interpolated —
so it neither floats nor sinks; thickest at the stone, broken by two noises,
running out and back on a per-stone phase, discarded landward of `shoreLine`.
`updateRockSurf` throws spray (`spawnPuffs`, pale) as a wash peaks against a
stone within 40 m. **The rings are wound facing down: DoubleSide**, or nothing
draws (a forced red fragment found it). The sea's clock can be set for a test
through the ocean material's `uTime` (high tide at t ≈ 34.9 + 139.6 n).

**THE WAVES CLIMB THE ROCKS AND GO OVER THEM (2026-11-16, the owner: "make sure the waves actually splash up and
go over the rocks … right now it just phases through and looks like little pebbles").** Three things, one wave:
- `rockWashGLSL` / `rkPhaseJS` / `rkStrengthJS` (by `waveGLSL`): each stone is struck by one wave per 5 s (`RK_F`),
  its phase `fract(-x·0.11 + z·0.021)` of the stone's ORIGIN, so a front runs up the beach at ~1.8 m/s and the stones
  go white seaward first. `rkClimb` is 0 → 1 in 0.3 s, then drains (exp) over ~2 s. No hash in the phase: a
  `fract(sin(n)·43758)` of a world coordinate does not agree between float32 GLSL and JS doubles.
- `rockWash(mat)` patches THE ROCKS' OWN MATERIAL (shared with `dressStone`'s throwables; gated to an origin inside
  the beach's box so a stone in a room never sees the sea). Per fragment, wherever the water reaches
  (`shoreLine − x + 0.9`): white foam under `wl + run·climb·face` (wl = the ocean's FACET height, `facetGLSL`, shared
  with the rings now; face = more on the −x side; tongues of water new each wave), thinning toward the top and
  streaking as it drains; a foam lap riding the waterline; and the band the waves keep wet darkened only to ~0.85
  with a fresnel sky sheen. Darkening it hard (0.62) made the skirt stones black holes in the bright shallows —
  that IS the "little pebbles" look. A stone lower than the climb is covered at the peak: the wave goes over it.
- `buildRockSurf` takes every stone now (it skipped r < 0.3 or top < 0.12, which is all of the skirt) with rings
  sized to the stone, driven by the same `rkClimb`. `updateRockSurf` throws water drops (`spawnSplash`, ripple off:
  the ocean has 8 ripple slots and they belong to the player's wading) off the struck face once per wave, more and
  higher off big masses, and over the top of a low one. The pale `spawnPuffs` spray was dropped: lit from behind it
  read as dark shards in the air. `SPLASH_POOL` 110 → 170.
- Probe: `sh tools/probe.sh "rockWash&t=295.6&cam=4.2,1.6,12.2,2.2,-0.2,8.6&every=15&frames=300" out` (camera
  x,y,dz,lookX,lookY,lookDz from a wall; `wall=1` for THE WALL at `ROCK_Z`, else the one at z 60).

**THE FIRST DIG CALLS THE FIRST CRAB (2026-10-14).** `revealMoundNear`: on the
first find (not on a replay, not in dev mode, within 45 m) the loner
(`crabUnit`, out at (−7.5, −20)) gets `called`, which lets it past its wake
radius: measured, it woke and came from 21 m to 6 m in three seconds.

## The wall behind the drain: rock gaps filled, and a crab on its ledge (2026-10-14)
- "I shouldn't clip through the far right side of the big rock near the sewer drain." Each mass has ONE
  cylinder of its half-width, and a turned, squashed scan is not round: mapped on a half-metre grid, the
  front of the big rock's sea-side flank (x -2.5 … 1, z 56-57.5) and the wall's seaward end (x ≈ -6) were
  stone with no collider. `fillRockGaps()` (end of the rocks loader) samples every rock from above and,
  wherever its stone stands > 0.5 m over the sand round it (aprons included) and no collider covers it,
  adds a small one (r 0.42, `fill: true`) at that height. 117 on the beach; 811 rock cells, 0 uncovered.
  Walked into that corner: stopped at z 55.24, sliding along it.
- Still true and NOT fixed: a mass's cylinder has a flat top at its crown, so on the wall you walk on an
  invisible floor over the real stone (7.72 m over a groove whose floor is 3.1 m). The owner stood on it
  at feet 8.32 for the screenshot.
- "Put a horseshoe crab right here": `placeRockCrab()`, `ROCK_CRAB_AT` (7.5, 59.0) — the ledge between the
  two big masses his crosshair was on, ~7.1 m up; laid along the averaged normal of the stone under it
  (one facet at the lip was 75° and stood it on its side), takeable (`far` 4.2) like a mound's crab, saved
  as `rockCrab`. An earlier try in the narrow groove (3.05, 59.3) buried it in the groove's walls.
- (2026-10-14, round 2) "On the sand right where my cursor was, not on the rocks": the screenshot's blue floor
  was SAND between the masses. His look, steeply down (pitch ≈ −1.3) from (9.77, eye 10.02, 54.64), lands on the
  apron sand at (8.0, 0.42, 56.7), a stride short of the rock's foot — `ROCK_CRAB_AT` (8.2, 56.4), seated on
  whatever is uppermost there (apron or `beachGroundAt`), ordinary reach. Rendered from beside it, the frame
  is his screenshot: the big rock left, the mossy one right, the crab on the sand between.

## The black before the morning (2026-10-14)

`CRAB_T.card` 37 (was 33): nine seconds of black after the Great Crab Call's cut before `startWakeCut`.

## The fishing tree is before the fire now (2026-10-15)

`TREE_SPOT.z = TRIBE_Z + 22` (−814; it was 10.5 m PAST the fire), `FISH_SPOT.z = TRIBE_Z + 22.5`, `FISH_GLOW` and the
chart's X follow. 12 m short of the camp's lookout (`TRIBE_Z + 10`), 54 m short of the whale's music (`WS_Z0`).
The tree's and the pliosaur's reach are 814. The deep's spit lands you under it (`TREE_SPOT`), unchanged in code.

## The body bag is gone (2026-10-15)

"take out the wrapped up body before the shipwreck to save space". Removed: `assets/corpse.glb` (5.3 MB → incoming/
unused-2026-10-15/), its load/grade/far-cull/warm block, the sand drift (`regMound`) it had settled into, its four
`rockColliders` (step 0.10), its `ASSET_REACH` and `WARM_REACH` entries, `__bw.corpse`, and its README feature line and
credit (Dennis Hafemann, CC-BY-4.0). KEPT: `CORPSE_X/CORPSE_Z` — the mood still closes in on that stretch
(`MOOD_PLACES`, `moodKeys`' `CORPSE_Z + 20`) and `moundKeepOuts` still keeps the mounds off the spot, so no mound and
no colour on the walk moves. Measured: walked x 9.6 from z -118 through -126, eye 1.655–1.745 (the bob only), nothing in
the way; the whole beach and every room toured with no failed request and no console error.

## Driftwood and the stones you throw, scanned; glass breaks to a throw (2026-10-15)

The owner: "driftwood should not clip through the ground when thrown. glass should break when other things are thrown
at it too. give the rocks and driftwood on the beach more detail hyperrealistic" — "the throwable rocks i mean" —
then "the big piece of drift wood is floating and you can see too many of the same ones down the beach" and
"driftwood should float on the water too not get covered".
- **The wood** is jonathan.imaginaire's photogrammetry of a bleached root standing in sand (CC-BY, 7.0 M triangles,
  two 8K maps, incoming/). `tools/driftwood_seg.py` (Blender, headless): a tenth by decimation, the 75 chunks WELDED
  (unwelded, no region crosses a seam and the sand never forms one region), each face's brightness off its texture
  blurred three rings, and a face is sand if darker than 0.5 AND within 0.35 of the ground under it (the ground =
  10th-percentile height per cell; brightness alone ate the trunk's dark bark); only BIG dark regions go.
  `tools/driftwood_bake.py`: solidified (the scan is an open shell — a voxel remesh of a shell is confetti), voxel
  remesh 0.02, decimate to 22k; the trunk cut off where the 90th-percentile spread passes 1.7x the median and closed
  (`log`, 13k); one atlas; colour baked as EMIT (the source is UNLIT — a DIFFUSE bake of it is black), normals 1024;
  each laid in its REST POSE: the convex-hull face it is stable on (centre over the face), lowest-sitting. (Laid by
  "thinnest axis up" the root stood on a root tip, trunk in the air — "floating".) glbquant + gzip: 2.0 MB.
- **On the beach** (`driftKind`, in the driftwood loader): no longer the 46 m wrack tile (one log a tile = one log in
  one pose the whole walk). World pieces from a fixed seed, every 45–120 m to z -1120, x 9.4–12.4 (dry), off rock,
  uneven ground (>0.25 m across it) and set pieces (`avoid()` + `moundKeepOuts`); 70 % logs bedded 2–6 cm, 30 % roots
  bedded 20–30 % of their height; length, yaw and handedness (negative z scale) each their own; `farProps` 140 m.
- **The pickup** is the log at 1.3 m, `floats` (in the sea it rides with 30 % of its depth under the surface — measured
  6 cm under, 16 over), and knows its shape.
- **`PhysProp.setShape(root)`**: the hull's extreme points along 98 directions; every frame `restH` = how far the lowest
  hangs under the middle at the current pose (+4 mm), re-lifted after the frame's turn; on the ground and slow it eases
  its flattest axis to vertical (`shapeSettle`). Measured, random tumbling throws: at rest 3–4 mm over the floor and
  within 0.6° of flat; on dry sand never more than 6 mm under it for a frame (the surf moves its own floor).
- **The stones** (three, `dressStone`): each takes one of rocks.glb's six scanned LittleRocks (kinds 0, 2, 4; the
  formation's own grade), shrunk to the old size — no new bytes — with `setShape`.
- **`PhysProp.hitProps(speed)`** (any body over 3 m/s): what it passes through that has `onImpact` (floats, bottles,
  jars) gets the blow at its speed, and a breakable thrower breaks too. Measured: a stone and the log at 9 m/s break a
  float; a stone rolled into one at 2 m/s does not. (`ragSmash`'s comment claimed thrown props already did; they did not.)

## MORE BEACH BETWEEN THE BUNKER AND THE THREE: `BEACH_EXT` (2026-10-15)

"from the 3 mutant charge cutscene to the bunker … have more beach in between, I want to fit another scene. I do not want
anything to change otherwise at all." 100 m, the owner's pick. Everything at or before the bunker's hatch (z −542) is
exactly where it was; everything from the three (`MUT_Z`, now −710) on is `BEACH_EXT` further along −Z. The new stretch
runs from the hatch to the three's trigger line (−680, `MUT_Z + MUT_TRIGGER`), and nothing is laid in −560…−660.
How it is done, so the next length change is one number (`BEACH_EXT`, top of main.js):
- **The chain.** Almost everything past the bunker is placed off the place before it — `MUT_Z` → `ROCK_Z`/`HOLE_Z` →
  `PORTAL_Z` → `CAVE_Z`/`CAT_OUT_Z` → `TRIBE_Z`/`TREE_SPOT`/`WB_Z`, `TRADER_Z` — so `MUT_Z` carries `- BEACH_EXT`.
- **The world numbers.** The far end was measured in world z: the lighthouse (`LH_Z`, and `END_Z` off it), both castles
  (`FORT_Z`, `C13_Z`, `FORT_NOTCH`, `CASTLE_LINK`), the second trader, the island and every table of it (`ISLE_*`, the
  jetty box, the stair noses), Henry's jetty spot, the vista (`VISTA_Z`, its hamlet and boats), the map sheet's head
  (`MAP_Z1` — so the drawn map is a little more compressed), and the fetch thresholds (`p.z < -700` for the island, -800
  for the jetty Henry, the dev teleport's -1090). Each wears `ez(…)`: the number as measured, moved.
- **The walk's own distances**: `ASSET_REACH` (every entry ≥ 600, 37 files), `WARM_REACH` (lh, undercroft,
  catacombs) and `BW_FROM`'s `ROOM_Z` carry `+ BEACH_EXT`.
- **The seeded walkers** (the driftwood, the mounds) lay the same sequence and step over the gap once, at `BEACH_CUT_Z`
  (−560 in the old layout) — extending their end instead would have laid NEW pieces past the cut and left the old ones
  where they were relative to moved places; and a save keeps mounds by INDEX.
- **Saves**: `ext` is written; `migrateSave` moves an older save's beach z's past the cut, and the keys built off
  positions (`kind@x,z`, `label@x,y,z`).
**Proved, A/B against the build before it** (`zz-*` throwaway pages, deleted): every drawn thing's (signature, world
position) incl. instances — 5066 unchanged, 853 moved exactly 100 m, and the ~330 left over are the SAME kinds that
two loads of the unchanged old build disagree on (randomised scatters: 6246 vs 6176 objects between two old loads);
all 479 colliders (409 discs, 70 boxes: 17 unchanged + 53 moved), all 10 mounds, all 99 interactables. Nothing in the gap.
Harness note: the cave-in is now at z −851…−858 (was −751…−758); walk probes skip that.

## The well's checkpoint is the stare (2026-10-15)

"make the save when the well man stares at you actually, not before it like i said last." The save the tall one's going
wrote (`smileSavePending`, 2026-10-13) is gone; `wellReveal` writes it, the moment you are set down in front of him with
the lens on his face, and the save carries `wellStare` (he has not come yet). Loading it puts that moment back:
`wellRestore` calls `wellReveal(true)` (the restore's call, which does not save) — you at the stand spot, him staring,
`cineHold` on his head — and the stare (`wellStalk.stare`) does not run down until the load's black is half gone
(`bootHold < 0.5`, and not while `restore`/`applyingSave`), so all of it is seen. Measured: held at 6.05 s for the 17 s
of a checkpoint load, then 6 s in the open, then the charge.
**A restore runs as the files come in**: his model was not dressed yet on one load (`u.mixer` null), and the stare's
`u.mixer.update` threw every frame — the frame loop died and the boot sat at 46 forever. Now `wellStagePending` holds
him (hidden, `holdAnim`, `updateWellMan` skipped) and `updateWell` stages the moment the frame he is dressed, still
behind the black; both mixer updates in `updateWellMan` are guarded. Harness: `__bw.wellReveal()`, `__bw.wellStalkS()`.

## 2026-10-15/16 — crabs leashed, the pack's tip, driftwood props, the tree on the map

- **Crabs give up** (`CRAB_LEASH` 90 m from `u.home`, their spawn): an awake crab past the leash turns (`u.st.goHome`),
  runs the ordinary chase code with home as its target (`homing` makes it "closing", so it can never start a swing),
  and at home sleeps with `called` false and `wake` = CRAB_WAKE, so it wakes again only if you go back to it. Coming
  within its wake range and back inside the leash turns it on you again. The pack's home is PACK_START_X (in the sea):
  they give up about 80 m past the dock, around the camp.
- **"PRESS TAB TO OPEN INVENTORY"** (`#packtip`, the dig tip's style): `addToInventory` → `startPackTip` on the first
  item (not `applyingSave`/`replaying`/`restore`, and only after `introDone` — the starting syringe goes in at MODULE
  TIME, which is also why `packTipDone`/`packTip`/`packTipEl` are declared up by `let restore`: a `let` below
  `addToInventory(syringeItem)` was a dead-zone crash that froze the owner's game on load). Up until the pack opens or
  14 s; waits behind the fight/dig tips; `packTipDone` on the save.
- **Every driftwood piece is a prop** (`makeProp(m, 'driftwood', { sleeps: true })`, `floats`, `setShape(m)`), culled by
  its live position (`farProps` `live: true`).
- **The map draws the tree** at `TREE_SPOT`, unlabelled, under the red X (`drawBeachMap`).
- **A log to throw by the snorkeler** (2026-10-16): a driftwood prop at (9.6, CAMP_Z − 9.5), the beach's own log mesh
  scaled to 1.25 m once `withDriftwood` has it (a box until then); `floats`. And the lost key's drop plays the octopus
  ring's sting (`lostKeyLie`, not when quiet / `applyingSave` / `replaying`).

## Elvédor Basquiant, the ravine, the house, the puppet (2026-10-16)

**Where.** Elvédor stands at `ELV` (9.3, −598.5), in the `BEACH_EXT` gap before the mutants. The break in the cliff
is `ELV_PATH` (a polyline from the beach at x 9.5 to the yard at x 41, half-width `ELV_PATH_HW`), the yard is
`ELV_YARD`, the house sits at `HOUSE_X/Y/Z` (64.4, 3.34, −611), front and porch facing −x (toward the sea).
The whole section is one block before `window.__bw = {`; its state lets (`elvReady`, `elvStage`, `elvLand`,
`elvAirK`, `elvCarrying`…) live at the VERY TOP of `main.js` beside `BEACH_EXT` — the frame loop runs before the
module finishes, so `updateMood`, the beach clamp and the strike hooks read them early. Every early hook is gated on
`elvReady` (set as the section's last line). Moving those lets lower is the TDZ crash again.

**Stages.** `elvStage` 0 unmet → 1 asked (dialog "Yes") → 2 carrying → 3 handed back (jar paid, killable) → 4 dead.
Saved as `elvStage`, `elvJar`, `elvGreeted`. The auto-greet fires within 6.5 m the first time; if you walk up
carrying the puppet, that same greet hands it over and opens the "back" node (that is what `elvTalk` does when
carrying). `setElvStage(1)` in the harness skips the greet flag, so walking up after it greets.

**The cliff break.** The cliff material's `onBeforeCompile` is CHAINED (not replaced) with a world-space discard:
GLSL polyline distance over a `vec2[]` of `ELV_PATH`, plus the yard box. `elvCliffCut(x,z)` is the same test in JS
(for the dressing). The floor is its own heightfield (`buildElvField`, step 0.5, sand material + vertex colours);
`elvPathFloor` rises from −0.04 at the mouth to `ELV_YARD_Y`. `noiseGLSL` is 1-D only — `ELV_N2` is a 2-D value
noise for the ground fog planes. A vertex shader `#include` must start its own line (a mid-line one fails compile).

**The walk.** `elvLand` is the flag that hands the walk from the beach clamp to the ravine's own floor/walls.
It must not drop on a sideways step in the mouth (it did, and threw you back to x 14.2): `if (was) elvLand = inside
|| p.x > CLIFF_BLOCK_X − 0.6; else elvLand = inside`. HARNESS: a teleport straight into the ravine is clamped to
14.2 by the beach — step through the mouth (14, −606) first and wait ~300 ms (`__elvTo` does).
Walls are the keep/tavern site machinery (`HOUSE_SITE`, `fortWallsStep` built in steps, `bwGhost` on doors and
panes so they are not baked into the walls). `bunkerFloorAt` is overridden for the land and the house.

**Download order.** The three GLBs were queued behind everything and never arrived in a test: they need
`ASSET_REACH` entries (585/590/592 + `BEACH_EXT*0.4`).

**The house** (`puppet-house.glb`, `undercroft_pack.py tavern --scale 1.27 --yaw -90`): bounds x ±5.42, z ±7.7,
ground floor ≈1.05 local, upper ≈4.91. Materials darkened, metalness 0, emissive 0.10×colour, `houseGrime(m)`
(chained onBeforeCompile + `customProgramCacheKey`). Doors: `name22*`/`name56006` leaves regrouped on hinge pivots
(`buildHouseDoors`, 7 doors, `elvDoorShut` slab test blocks a closed one). Panes: `Glass_Ray_glass_3` (14),
`elvBreakPane` → shards as gibs + `sfxGlassBreak`; `houseGlassStrike` in `digImpactCore`, `hglass` in `magTrace`,
a `Set` of panes in `sgFire`. Clutter becomes `makeProp`. Four dim moon point lights (bedroom 0.16) — from the pool.
The bed's box top is the HEADBOARD: the mattress top is found by a ray down (`ELV_BED.x` 2.52 house-local).

**The puppet rig** (`puppet.glb`, rigid-parented, faces +x, 1.64 file units, `PUP_K` 0.55). MEASURED, not as named:
`Bone003_03` is the HEAD, `Bone004_04` the JAW (the lower teeth hang off it) — with them swapped, head-at turned the
jaw and reopened the mouth. `Bone005` is his right arm. The eye and lid NODES have origins far from the eyes:
turning one swings it off the face. So an eye is turned about its own centre (`E.eyes[i].C`, front `frontL` in the
parent's frame, `pupEyesAt`), and the blink is a cap of eyelid paint squashed along his up (`pupLids`).
`pupMouthShut` searches the jaw angle so the lower teeth sit 0.042 under the upper (the file has it hanging open).
The file's pupils are WHITE over a pale iris map; with the 0.06 emissive they read white at night — they are
tinted 0.07 grey, no emissive, roughness 0.25 (the owner: "his pupils should look darker").

**The carry** lives in `vmScene` (never clips a wall). `vmScene` used to render only when `viewmodel.visible` —
it now also renders while `elvCarrying`. Carrying holsters the weapon and blocks `useSlot`/`toggleEquip`/
`scrollHotbar` ("Your hands are full"). `pupCarryPose`: held by the knees and the head, head to your right, legs
left, arms along his sides, placed by his HIPS at `ELV_CARRY` (−0.11, −0.2, −0.48 — the owner: "closer", "low").
The head-at must run AFTER the holder is at `ELV_CARRY` and the hips placed — aimed with the holder at the origin
the camera was inside him and the face looked past you. `pupHeadAt`'s "forward" is the averaged pupil gaze, not the
root's +x (after the neck is aimed the root's front is not the face's; it turned the back of his head to you).
He looks at (0, −0.2, 0) — just under your eyes, head let down a little (the owner) — plus a −0.28 roll toward
you. Rest gaze measured ~22° under the camera; the glance (`ELV_GLANCE_AT` 34 m, in 1.6 s, holds to 4.4, out by
6.6) brings the pupils to exactly 1.0 on the camera. The blink is once at `ELV_BLINK_AT` 7 m, 0.22 s, silent.
To measure the eye's real turn use the PUPIL mesh centre minus the EYE mesh centre — `frontL` through the parent's
matrix ignores the eye's own rotation.

**Handed back:** a fresh instance on his left forearm (`pupSit`, scale `PUP_K*0.92`), both heads at you.
Dialog 2's `reward` node `say`s `elvGiveJar` (once, `elvJarGiven`). Killing (`ELV_HP` 4; light 1, heavy 2;
immune before stage 3): 5 `dropJar` + `ringDrop`, `pupRunBegin` puts the puppet in the sand, a 0.6 s beat, then
it runs into the ravine and is removed after 9 s or past x 24.

Harness: `tools/elvtest.js` — `await __elvBoot(); await __elvTo('beach'|'yard'|'bed'|'carry')`. The dialog only
advances on a REAL click (`computer left_click` on the box); synthetic key/mouse events don't reach it, though
`button.click()` works on a choice.

## Elvédor, round 2: the house moved past the mutants, the gully, the mist, the fire, the fight (2026-10-16)

**Moved (twice).** Elvédor still stands at `ELV` (−598.5). The gully's mouth is a little SHORT of where the three
mutants stand (they are at −710…−713 and charge from `MUT_Z + MUT_TRIGGER` −680), so their fight is in your way to it
— the owner: "you should have to fight the 3 mutant group to go to the house" (I first put it past them, at −786: wrong).
Mouth `ELV_GAP_Z` −702.4, house `HOUSE_X/Z` (34.6, −716.4), fire `ELV_CAMP` (8.2, −697) — ON the cliff's plateau (the plateau runs from the
face at x≈16 to x 46.5; a ridge mesh behind the lot, `elvRidgeRise`, hides its end). `HOUSE_Y` is computed from the cliff.

**The gully is carved INTO the cliff, not laid next to it** (the first pass was a separate flat-shaded field in a hole
cut by a shape that was not its edge — "ai slop, floors don't connect"). `elvCliffCol`/`elvCliffAt` rebuild the cliff's
surface EXACTLY as `makeCliff` lofts it: columns every 2 m of z (the strip snaps by 40, its own period, so a column is
the same column everywhere; cached by z mod 40), 23 rows, the same two triangles per quad (`PlaneGeometry` quad
a(z0,hi) b(z0,lo) c(z1,lo) d(z1,hi), tris abd, bcd). `elvGround = min(elvCarve, elvSurf − 0.02)`; the carve rises fast
outside `ELV_PATH_HW`, so at `ELV_CUT` it is metres over the cliff and the cliff is dropped (chained discard, polyline
distance only) exactly where the carve already equals the cliff. The carve's mesh wears the cliff's OWN material:
`CLIFF_BASE_MAT.clone()` with `onBeforeCompile = CLIFF_BASE_OBC` (captured right after `makeCliff`, before any cut is
chained — a clone carries the chained hook, which would discard the carve too) and an `aU` attribute = the cliff's own
loft u where uncut (so toe/face shading match), 0.18 on the trodden floor, ≥0.78 on the banks. THE FLOOR IS COMPUTED (`elvFloorS(s)`): the cliff's runnels repeat every 40 m, so
where the face crosses the line moves with the gully; `ELV_S_FACE` (found at load) is where it starts, the floor eases
to 0.45 (under the talus top, 0.55) by then and climbs to the plateau's height at the head. Hand-typed floors were a
step the moment the gully moved. Measured: at most 0.10 m rise per 0.25 m.
Walk: `elvLandFloorAt` (carve in the gully, `driftAt` at its mouth, plateau in the lot, `houseFloorAt` in the house);
a step that climbs more than ~1.15× its run is refused outside the house (no walking up banks).

**The lot**: `ELV_YARD` x0 21.8 (where the gully comes up level). Its fence must skip anything within
`ELV_PATH_HW + 0.5` of the gully line and the gate is where the line crosses x0 (at x0 18.8 the fence stood across
the gully). Static dressing merged per material (`mergeGeometries`): gnarled trees (`elvTreeGeo`, tapered tubes),
sleeper steps, a rope rail, roots, stones, stepping stones, posts/rails; pickets and grass are InstancedMeshes; the
swing and the marionette crosses move (`updateElvDressing`). A name board ("BASQUIANT", canvas, `retroTex`).

**The mist** (`buildElvMist`, "a different new type of misty artistic fog"): camera-facing veils, one instanced draw
each set — 164 over the lot and down the gully, 150 along the beach from Elvédor to the gully (`elvBeachMist`, shown
while `elvSecK`). Eroded by domain-warped fbm, drifting on their own loops, faded at the ground (`vY` vs the instance's
ground `aS.y`) and as you walk into them. THE FOG COLOUR IS NEARLY BLACK (#0b1626): veils in the fog's own colour were
invisible; they are fog × 2.6 + (0.035, 0.045, 0.06) and 0.42 alpha. Fog: `ELV_SEC_D` 0.052 over the beach stretch
(`elvSecK`, from 25 m before Elvédor to 60 m past the house), `ELV_FOG_D` 0.095 behind the dune (`elvAirK`).

**The fire** at `ELV_CAMP`: `buildTribeFire(cx, cz, cy, seed)` now takes a spot (the tribe's call is
unchanged); updated in `updateElvCamp` (it advances `KEEP_GLOW_U` only when the tribe's fire is not up). A quiet
`startFireCrackle`. **The lantern** on its log ("Take the lantern", flag `elvLantern`, saved): a pooled PointLight at
your left hand while behind the dune (`updateElvLamp`, 6.0, 12 m) — there is NO player light anywhere else in the game.

**Loading**: Elvédor and the puppet when z < ELV.z + 110; the gully/dressing/mist/fire when z < ELV.z + 40; the house
when z < ELV.z − 30 (and walls in 3 ms steps within 170 m). The old 160 m house radius reached the pavilion checkpoint
(157 m): a respawn there loaded the house, and its clutter props dropped off the shelves with full-volume knocks
(`sfxPropHit` has no falloff) — the owner's "bunch of sound and lag". Measured now: walking −450 → −805, two long
tasks (65, 71 ms); a pavilion respawn loads none of it and plays 2 sounds.

## Elvédor, round 3: the puppet on the fire, the taps, the darker house (2026-10-16)

**The fire** (`elvFireTick`, `buildElvFireThrow`): "Throw it in" on a proxy over `ELV_CAMP` while carrying (stage 2).
Hovered (and only then: `hovered.root === elvFireHit`) he says the owner's six pleas in order (`SAMPLES.pupPlead`,
cut at the file's silences), stopping mid-word when you look away (the line is said again if cut before 70 %). Thrown
(`elvThrowPuppet`): `elvStage` 5 + `elvBurned` (saved), an arc onto the NEAR side of the fire, across your view, the
last scream (`sfxPupScream`: the clip through a tanh shaper plus a copy at 0.74 rate, and a low whoomph), struggle
(`pupBurnPose`, aims in the lying root's frame: +x his front = the sky), char to black (`pupChar` on his own cloned
materials), flames off his bones into `flameWorld`, smoke sprites, sizzles. At `ELV_BURN_T − ELV_MAN_RUN` Elvédor is
put 24 m up the beach behind you and runs in (`M.run`/`elvManRun`, `mHRun`, `holdAnim`), stands (`M.stand`) and opens
`burn` → `burnAlive`/`burnBiz` → `burnEnd`; leaving it any way calls `elvBurnFight` (provoke). A load at stage 5: he
provokes on sight within 11 m; the black remains (`elvAsh`) lie on the fire. **Traps, all measured:** in the fire's
middle the additive sheets were drawn over him and he vanished — he lands 0.42 m toward you; a quarter-turn wrong
yaw (`toCam + π/2`) laid him END-ON to you, feet in the flames, a fist-sized blob; an ember emissive of 0.55 made him
as bright as the fire (now 0.10); at 0.9 m he read as a log (`ELV_BURN_K` 1.2).

**His mouth on the words** (`pupEnv`/`pupEnvAt`/`pupClipT`/`pupMouthAt`): a loudness envelope computed ONCE from the
decoded buffer (60 per second, against the clip's own peak), looked up by `ctx.currentTime − outputLatency − t0` (the
wall clock when the context is suspended), fast open/slower close. No analyser. `pupJawOpen(I, k)` slerps the jaw
from `pupMouthShut`'s shut quaternion to the file's own hang. A suspended context never fires `onended`: lines also
end on the clock. Eyes: `pupEyesAt(C, elvPleaLook)` while hovered.

**THE FINGERS WENT BLACK** (the owner): ~30 finger/knuckle meshes share ONE material, and a per-mesh
`multiplyScalar(0.84)` in the load's traverse ran on it thirty times. Darken a material once (`seenM`), and clone
per material, not per mesh. The carried copy is tinted `_pupCarryTint` (the vm scene's own lights are bright).

**Just the fire** (the owner): the camp's log, blanket and kettle gone; the tribe fire's stick, bones and ribs are
tagged `campClutter` in `buildTribeFire` and removed for this fire only; the lantern on the sand.

**The walk up**: sleepers, rope rail, roots, gully stones, BASQUIANT board, mailbox, stepping stones are built by
`skip` (they still draw from `rnd`, so the fence/trees/grass are where they were). Yard fence and gate kept.
**Wisps**: 130 thin veils (aspect 0.22–0.42) round the house, 0.6–4.6 m up, in `elvMist`.

**The taps and shower** (`HOUSE_WATER_DEF`, house-local, measured by rays): kitchen spout (4.60, 2.01, 0.80) basin floor
1.726; vanity spouts (4.47, 6.40, −0.96 / 0.49) bowls 6.19; shower rose (4.58, 7.19, 2.26) over the tub (floor 5.185),
turned at the tub's handle (4.50, 5.72, 1.70). Stream = open cylinder with a scrolling streak alphaMap; shower = 260
instanced drops; spatter Points; a pool that fills; `startWaterRun` noise loop per fixture (a floor between halves
it). Not while carrying. **The house**: paint ×0.40 (was 0.55), emissive 0.016, moon lights 0.14/0.10, decals 7
(was 26), strings 6 (22); `updateHouseDread` every 11–24 s inside: steps on the other floor, a creak, three knocks
or a whisper. Harness: `tools/burntest.js` (`__clockOn`, `__atFire`, `__pov`, `__povStrip`), `tools/still.js`.

## Elvédor, round 4: alive, on you, the jars thrown, the carry slower (2026-10-16)

**HE LOOKED PAST YOU — two bugs.** `const eye = _emB.copy(camera.position)` was passed to `elvLookBone`, which writes
`_emB` (`to = _emB.subVectors(target, …)`): after the neck the "target" was a unit vector, so the head aimed at a point
by the world's origin. And each bone was turned by the angle from the BODY's front to you, whatever the clip had done
with the head, so neck and head each took the whole turn. Now `elvGaze`: the face's real front every frame
(`elvFaceFwd`: cross of HeadEnd−Head and RightEye−LeftEye, signed to the body's side), the neck 45 % of what is left
(≤ 0.55 rad), the head the rest (≤ 0.75), then each eye bone onto your eye (≤ 0.4) with saccades every 0.6–2.4 s;
weight 1 talking, else fading out past 10–16 m. Measured: face 0.1–1.5° off you from 0°, ±40°, 1.8–6 m.
**`elvBreathe`** (before the gaze, only on frames the mixer ran): Spine2/Spine1 pitch on a 4.2 s breath, the shoulders
up on the in-breath; standing, a slow roll and yaw at the waist with the neck countering. Blinks 1.8–6 s, 0.11–0.17 s,
a double one in five, lids down a touch when he looks down (`M.lidDrop`).

**The jars fly** (`dropJar(…, fly)`): a `PhysProp` with the hull off its own glass (`setShape`, the DROP_SHINE beacon —
a 2.6 m mesh on the jar — taken off while it is read), thrown up and out from his chest, knocks on landing, `ringDrop`
at 1.15. Spawned INSIDE his body they landed on top of it 0.15 m out: they start 0.42 m out. Measured: 1.7–3 m out,
resting with their lowest point at y ≈ 0.

**Carry**: walk ×0.78 while `elvCarrying` (at the speed line in the move code). The stair blink: the first change of
floor with him in your arms (`elvFloorWas`/`elvStairBlink`), 0.1 s; measured lids 0.51 → 1.0 → 0 in six frames.

## Elvédor, round 5 (2026-10-16): the lip, the room, the door, the gate, the run, the hand, the swim

- **"I can't walk in this room"** (the ground floor's back bedroom): `keepWallNear` tests a wall triangle by its whole
  outline from above and its whole height range, and the wall round that door is a few tall triangles whose outlines run
  across the opening — the open door was a wall at (0.23, −2.97). `HOUSE_SITE.slice` makes it clip each face to the
  asked band first (`wallSlice`, Sutherland–Hodgman against y = lo and y = hi). Only the house says `slice`. Measured:
  every room on both floors reached through its door.
- **"A lip in the sand right before the house"**: no lip on the gully's centreline; the one refused step in the whole
  front yard was the bank where the gully's head comes up into the yard (0.65 m over 0.9, at (−12, 9.2) house-local).
  Inside the lot (`elvYardD < 0`) the no-banks bar is 2.3 × run, not 1.15. (A 0.3 m averaged floor was tried: it does
  not flatten a bank that size, and it was reverted — the ground is exactly as it was.)
- The gate's posts and leaf are `skip`ped (they floated); the lantern is not built (`buildElvLantern` no longer called).
- **The front door's glass** is linked to its door (`D.pane`, found by walking up from the pane to the pivot); its box
  is taken again where it is each ray (it swings); broken, the shut door does not stop you.
- **He slid**: `holdAnim` keeps `mutAnim` off, and that is also what steps his mixer — `elvManRun` steps it, `mHRun`
  at a timeScale off his pace. **His hand**: `LeftHand` scaled to 0.001 AFTER the puppet is placed off it (its child
  `LeftHandMiddle1` places the puppet). hp 6 → 9. **The draw sound on the hand-over**: `equipQuiet` (top of the file)
  silences `katDraw` for the re-equip in `elvCarryEnd`.
- **The puppet's escape** (`updatePupRun`): sit, run −x, leap at the surf, swim. The sea is `waterSurfaceAt` (OCEAN_Y
  −0.34 + swell), not 0: at y −0.66 he stood on it to his knees. Swimming he is tipped 1.15 rad forward with his feet
  0.3 under it.
- **The lip at the gully's mouth, again** (the owner at (14.87, 0.20, −705.40), 2026-10-16): not in the yard this time
  but at the foot of the face, on the gully's SOUTH half only. The floor was `elvFloorS(s)` of the distance up the
  centre line; the face runs along z and the line crosses it at a slant (~31°), so a point 1.4 m south of the line is
  ~0.85 m further "up" it at the same x and its floor was already 0.5 m over the talus under it — a slope of 10 over
  5 cm. Two changes: below the face (`s < ELV_S_FACE + 2.5`, eased out by +6) the floor is the centre line's at the same
  x (`elvSAtX`, inside `elvPathNear`); and the floor at the face is `ELV_F_FACE` 0.30, not 0.45 (the talus's toe at the
  face on the south half is 0.40 — a floor above it there is a kerb). Worst slope across the whole width: 0.5.
  The cliff is dropped inside the cut, so lowering the carve shows no seam.
- **The swing**: the limb grows out of the big tree's own trunk now. `elvTreeGeo` hands back `geos.trunk` (its first,
  random-walked curve) and `geos.trunkR`; the limb starts inside the bark where the trunk is at the limb's height,
  runs toward the old swing spot, and the ropes are tied where the limb really is (`getPointAt` at 2.1 and 2.76 m
  along it, two rope wraps each); the seat group is yawed to the limb so its `rotation.z` swing is across it.
- **The front door's glass was never a pane**: `buildHouseDoors` moves each leaf's parts onto a pivot under
  `houseWorld`, out of the model's tree, and `buildHousePanes` only walked the model root. It walks the pivots too now
  (15 panes, `name56006_1` linked to its door). Measured with real W-key walking: shut and whole, stopped at the
  door; glass broken, through; open, through. A window is refused by `elvPaneShut` until broken, then not.
- **`elvPaneShut` blocked the stairs** (the owner, 2026-10-16, "I can't walk up the stairs"): the stair rail's glass
  (`Stair_2`) is one mesh whose box is the whole flight, 3.6 × 4.2 m, and a pane rule built on boxes made it a slab
  across the staircase. Only a flat pane (its box under 0.5 m in its thin direction) is a window now. Measured: 0 of
  2,184 moves through the stair box refused; a window still refused until broken. A rule written for "the glass" must
  ask what shape each piece of glass is.
- **The invisible wall south of the mouth** (the owner at (15.36, 0.28, −705.80), 2026-10-16): the land was the gully's
  floor strip (1.45 m off its line) and the beach stopped at `CLIFF_BLOCK_X`; the talus's toe between them, open sand
  below the face, was neither. `elvInLand` now takes the toe too, within `ELV_CUT + 2` of the line and out to an edge
  that slants back to `CLIFF_BLOCK_X` (3 m out beside the gully, 0 at 6.65 m off it), so walking along it slides you back
  onto the beach. A step off the land is legal only onto the beach's side of its clamp (`x <= CLIFF_BLOCK_X + 0.02`),
  and the flag drops there, so the beach's clamp never throws you. Measured with real W walking: out of the mouth to the
  south, the north and south-west onto the beach, along the beach past the mouth, from the beach up the toe into the
  gully and down again — all through, no step over a stride. (A comment appended after a statement on a one-line
  arrow function swallowed the rest of its body — the page did not load. Check the console after every edit.)
- **Bradly's last exchange is out** (2026-10-17, the owner): "What else do they say about this beach?" and the rumours
  reply (castles, monsters, the giant horseshoe crab, the burpees) are gone; `blood` is his last word and carries the
  `say` that arms `bradlyScurry`, the 'click to leave' hint and `end: false`.

**The puppet outlives the man (2026-10-18, the owner: "when you kill the puppeteer before going into the house the
puppet is then gone but the puppet should still be there and be able to still be thrown into the fire or sold at the
shop if you bring him that far for 10 jars").** He has no immunity, so he can die at any stage, and every death set
`elvStage` 4 — which took the bed's "Pick it up" away (it asks for stage 1) and, in your arms, made the puppet jump
down and run (`elvPupFromArms`, deleted). `elvStageOnDeath()` is the one rule now, used by `elvDie`, the retired-unit
path in `updateElvManPose` and the load path: 3 → 4 (on his hand: it runs, as before); 0 → 1 (killed before he
asked: the puppet is on the bed for the taking); 1, 2, 5, 6 unchanged. So **`elvStage` is the puppet's story and
`elvMan.dead` is the man's** — read the right one. The load path's `elvStage >= 4` became `=== 4`: it was retiring a
LIVING man on any stage-5 load (the provoke-on-sight after the fire could never run). The talk interaction is
`elvStage < 5`. **Stage 6 is sold**: `SELL_ROWS` 'puppet' (10 jars, only while `elvCarrying && elvStage === 2`),
`traderSell` ends the carry; its tile is `pupShopItem()` (a fresh instance in the bed's `pupSitEdge` pose, `iconRot` 0.3 / −2.3: from dead ahead the thighs run at the lens and he reads as stood up straight).

**ELVÉDOR SPUN (2026-10-18, "spinning around when you go back to him").** His late motion capture (`parLate`, left by
`elvAuthor` when the packs were not in) was never called — only the farmers', tavern's, demons' and parasites' ticks
call theirs — so he could have no clip at all, and the breath and gaze (RELATIVE turns, `lifeTurn`/`elvTurnWorld`)
piled up on bones nothing rewrote. Now `updateElvManPose` calls it, and the layered bones start each frame from the
pose under them (`elvLayerIn/Out`: a bone found exactly as last frame left it is put back to last frame's base) — a
held clip frame does the same, since three's PropertyMixer skips unchanged values. Not seen in the pane.
**THE WELL'S "LOOK INSIDE" IS GONE ONCE THE WELL MAN IS DEAD** (`wellEmptyLookIt`'s `when`, with `deadUnitKeys`).
**THE PUPPET BLINKS ONCE ON HIS HAND (2026-10-18, the owner, not for the first time: "make the puppet blink once while
on the beach past the fire ... his animation should have one single blink as well").** The handed-back puppet on the
man's arm never blinked (only the carried one did). `M.pupBlink` in `updateElvManPose`'s `M.pup` block: 1.5 s after
you come within 8 m, one silent 0.22 s blink (`pupLids`), re-armed only after you walk off past 30 m. Not seen in the
pane (the owner was playing in it).
**THE FIRE A METRE NEARER THE WALL (2026-10-18, the owner: "a little closer to the sand wall just barely so its easier
to accidentally stumble upon it with the puppet in hand").** `ELV_CAMP.x` 8.2 → 9.2 (the face is at x≈16, the walk
stops at `CLIFF_BLOCK_X` 14.2). The lantern, the "Throw it in" proxy and the burn's landing are all off `ELV_CAMP`.

**THE HOUSE: TOILET LID, FRIDGE, TV (2026-10-18).** `buildHouseProps` (after `buildHousePanes`), `updateHouseProps`
(beside `updateHouseDoors`). The toilet `name0001` is spared the small-things cull and given a lid on a hinge at the back
("Open the lid"). The fridge's two doors are cut out of the kitchen's `name38` meshes by triangle centroid (`hpCut`) onto
hinges at z −2.39/−1.38, its front face cut away, a lit liner/shelves/lamp and a bottle (`elvFridgeTaken`, saved as
`flags.elvFridge`; a 'default' interactable, not a replayed pickup — the house loads after the restore's window).
The TV `name54`: a plane over its screen plays `assets/elvedor-tv.mp4` (the owner's clip — NOT IN THE REPO YET) with its
sound from the set (sfx bus, by distance); without the file, static and a hiss; it goes off when you leave.
**The puppet can be picked up from stage 0** (before Elvédor asks). Stills: probes `house`, `toilet`.

**ROUND OF 2026-10-18 (evening).** Elvédor's mark `ELV.z` −598.5 → −640 ("a little up the beach closer to the house";
the house still loads at −628.5, where it always did). **The TV's show** (`tvShow*`, "Elvédor on stage doing his puppet
set in front of a full crowd"): no clip exists, so it is a scene of its own drawn into a 200×102 target every other frame
while the set is on — a stage, a folded red curtain under two spots, a second copy of his model (parsed on first switch-on,
emissive off, colour ×0.55) with the puppet on his left hand (`pupAim`/`pupHang`/`pupJawOpen`), and 150 silhouettes
(instanced) that bob and throw their hands up on a laugh; its sound from the set (a murmur, laughs, applause — noise
shaped, on the sfx bus by distance). A file at `assets/elvedor-tv.mp4` would play instead. Render-target pixels read
back in probes `tvshow`. **The doorway flicker**: under every door the floor, the wall's bottom face (`material_30`) and a
sill (`material_9`, or the outside's `base`) were coplanar; `houseDoorSill` cuts the level wall faces out of each
doorway's footprint and `base`/`material_9` are drawn with a small polygon offset behind the floor. **The carried
puppet's blink** now comes 2.5 s after you step onto the sand with him (it was 7 m from the pickup — inside the house),
0.34 s long. **The lighthouse gulls** are the wreck's `gull.glb`, built on each diorama bird (`isleGullBuild`, in the
scene root: the island's static meshes have frozen matrices, so bones under them never moved), wings tucked by bone
scale, heads turning (`isleGullsTick`).
**THE TV SHOW, ROUND 2 (2026-10-18: "MORE HYPER REALISTIC USE THE ACTUAL MODELS … STILL LOOK LIKE ITS ON A TV").** His
copy wears his own dressing — each mesh's material from the beach Elvédor copied into a PLAIN `MeshStandardMaterial`
(sharing them hid him: the game's per-unit shader hooks) — and his pose is the live man's, bone for bone, with the
puppet arm and the gestures laid on. The crowd are lathed busts (shoulders, neck, the back of a head), rim-lit from the
stage; faint beams in the haze and footlights. The picture is 384×196 drawn through `TV_CRT_FS` on the screen: bowed
glass, scanlines, an aperture mask, colour fringe at the edges, a slow roll, snow and a vignette (`1 - smoothstep(...)`:
the reversed-edge smoothstep left the screen black). Probes `tvscreen` (stand the camera IN the house first, or the set
switches itself off) and `tvshow`.
**THE BLINK THAT DID NOT SHOW.** It ran (traced frame by frame: the lids closed and opened 2.5 s onto the sand) but the
pupils stand proud of the eyeball and looked out through the shut lid — rendered red, the lid covered the white and the
black sat on top. The lid is 1.32 of the eye (was 1.12) and `pupLids` puts the pupils away while it is over half down.
Stills: probes `pupBlink`.

## 2026-10-18 — the run in, the one blink, the TV set, the land opened to the pack

- **Elvédor cannot be hurt while he runs in after the burn** (`elvRunImmune(u)`: `elvMan.run` set and `u === elvMan.u`).
  Gated at `hurtMutantCore`, `bladeHitMutant` (the blade passes through: no hitConnect, no flesh) and `magHeadshot`. The
  owner: ONLY while he runs — once `elvManRun` ends (`M.run = null`) he is as killable as ever. The wake-by-distance never
  fires during the run anyway (`holdAnim`). Probe: `sh tools/probe.sh elvRunHit`.
- **The carried puppet blinks exactly once**, at `ELV_BLINK_Z` = midway from the gully mouth (`ELV_GAP_Z`) to the man
  (`ELV.z`), −671.2, with him in your arms, off the land, not in a room. Gone: the stair blink (`elvStairBlink`), the
  2.5 s-onto-the-sand blink (`elvBeachT`) and the blink on the man's hand (`M.pupBlink`). Probe `pupBlink` walks
  −703 → −638 and counts lid-closings: 1, at −671.15.
- **The TV show**: the puppet's `rotation.y` must be `man.rotation.y - PI/2` (its front is the file's +x) — it was
  `+PI/2`, facing backwards. The hold is the beach's own (`updateElvManPose`): arm aims (0.22,-0.82,0.3) /
  (-0.12,0.62,0.78) / (-0.05,0.95,0.2), the puppet's spine on the hand↔LeftHandMiddle1 midpoint −0.04, the hand scaled
  to 0.001 AFTER it is measured (scaling it first collapses LeftHandMiddle1 onto it). `pupAim` with the gltf scene as
  root uses the same frame as `elvAimMan` (+z his front, +x his left) — measured, the copy faces the camera at
  rotation 0.
- **His moves on the set** (`tvShowRig` / `tvShowMove`): an `AnimationMixer` on the copy playing `ELV_MOCAP_SET`'s
  mHIdle / mHWalk (tracks are bone-NAME based, so the beach's retargeted clips bind to a fresh parse of the same glb),
  hip x/z flattened to the first key (the set moves him). Every frame the bones go back to the bind BEFORE the mixer —
  anything the clips leave alone (and the aims on top) would otherwise pile up frame on frame. Blocking: hold 4–9 s,
  cross to a new mark (x ±1.3, ≥0.7 away) side-on at 0.85 m/s, turn back to the house; never starts a cross mid-laugh;
  a bow from Spine1 on a laugh; the right hand gestures only standing on his line; head yaw by world rotation
  (`tvHeadAt`), frame-safe; the TV camera pans after him a beat behind. Probe `tvmove`.
- **The pack follows you up to the house.** Before, `mutClampX`'s last line held every beach creature at
  `CLIFF_BLOCK_X + 0.5`, so the gully was a door none of them could use. Now `elvUnitClamp` (called just before that
  line) holds a creature behind the dune by the player's own land rules — `elvLandFloorAt` at ITS feet (never the
  top storey: pass the y), no bank climbed (rise vs run, ×2.3 in the yard), `keepHitsWall` on `HOUSE_SITE`,
  `elvDoorShut`, `elvPaneShut`, slide offsets then revert — keeping its last good spot in `u.elvLp` (reset when it is
  more than 3 m off: a spawn or a restore). Its height comes from the land's floor too (the beach height block).
  `elvSteer` gives it a route along `ELV_PATH` (via `ucFollowPath`, `pathO` 0,0) whenever the straight way is not
  walkable (`elvLineClear`), re-drawn every 0.4 s. A swing's own travel can carry a body off the land into a bank
  without a clamp: the height block runs `elvUnitClamp` on anything past the clamp line and outside the land, before its
  feet sink. Probe `landChase`: all three reach you in the gully and on the lot, every frame on the floor.

## 2026-10-18 (second round) — a real lid, and the ring's sting for the jar

- **The puppet's lid** (`pupRig`/`pupLids`): it was a sphere squashed along his up and stretched back — a blob swelling.
  Now a hemisphere shell (radius 1.22 of the eye, the eyelid paint, double-sided) on a `hinge` at the eye centre whose
  frame is built from his up and the eye's own front (`frontL`, orthogonalised): `PUP_LID_OPEN` −1.45 (rolled up and back
  under the brow, hidden) to `PUP_LID_SHUT` 1.62 (down over the front, rim at the bottom). The blink's shape is
  `pupBlinkK(t)`: close in the first 32 % (ease-in), shut to 46 %, open over the rest (smoothstep) — 0.42 s in all.
  `PUP_LID_*` sit above `pupRig` (declaration order). Stills: `sh tools/probe.sh lidShots` (0, .35, .7, 1).
- **Elvédor's jar** (`elvGiveJar`) plays `ringDrop`, the octopus ring's sting, like every other thing given to you
  (not on a restore or a replay).

## 2026-11-13 — the well man's cut; a held lens lets go when you walk away
- **The reveal cuts** ("make it not fade in make it go black then immediately show him keep the same timing"): the
  `reveal` phase holds the black 0.3 s (as long as before its fade began) and then sets it to 0 in one frame — no 1.6 s
  fade up. Probe `nov13`: opacities 1 then 0, nothing between.
- **`cineWalkAway()`** (with `cineHold`): a scene that opts in remembers where you stood (`cineAt`); 0.7 m from there,
  outside a dialogue, the camera's lens function drops the hold (`cineHold`, `dialogTarget`, `dialogHead`, `dialogFov`)
  and the FOV eases home at 3.5. The scene goes on. Opted in: `wellReveal` (his stare) and `startDealerPickup` (the
  Dealer's reach — after the portrait, "*Kill him*" or walking out). Probe: walked back 0.8 m → released, FOV 105, the
  stare still running down; the Dealer's released the same.

## 2026-11-14 — the well's bucket on its rope; a float cast on the snorkeler; sea shells sell
- **The bucket** ("fix this bucket it isnt even on the rope right", a screenshot): raised `WELL_BUCKET_LIFT` 0.44 it was
  jammed into the windlass — its handle 0.17 over the drum's underside — and the authored rope, made for a bucket in the
  mouth, hung out under it. Measured in the model's frame (`wellBucket`): the coil on the drum to 0.356, the handle's
  top 0.082 as authored. Now LIFT 0.12: the handle hangs ~10 cm under the drum (`WELL_DRUM_Y` 0.30, `WELL_HANDLE_TOP`),
  OUR rope runs between them from the start (`wellSetBucket(0)` at build, and it pays out from `WELL_DRUM_Y` as before),
  and the authored rope keeps its coil but loses every triangle under the drum (its index cut once). The cost: the
  bucket hangs at the lean's eye height (1.16–1.53 m against an eye at 1.40, 0.49 m off the middle) — beside the look
  down the bore, at the top of the frame, not across it (`wellLean`); it was raised that high only because the drum is
  too low to hang it under and above the eye at once.
- **A float on the snorkeler** ("make throwing the fishing line at the snorkeler prompt the dialog too"): `landFloat`,
  wet and inside 3.2 m of him — not met: the thrown thing's hail (up, a splash, his talk at 0.7 s); met: his talk again
  at 0.45 s. Probe `nov14b`: up, and the dialog open 1.5 s later.
- **Sea shells sell for a jar** ("make shells sell for 1 jar"): `SELL_ROWS` 'seashell' — each shell is its own item
  (`id: 'shell'`), so the count is how many are in the pack and a sale takes the first (`SELL_SHELL`); the row's icon is
  a stub with `SHELL_ICON` while you have none. (Shotgun shells are ammo you buy: not these.) `nov14b`: 2 → 0, jars 0 → 2.
- The Lucky Ring reads "Gives random chance of an enemy hit doing no damage."
- **The well's reveal fades in again** (2026-11-14, "bring the old cutscene of the well guy back it should be exactly how
  it was unless you start to walk away then it unzooms"): `1 - (t - 0.3) / 1.6`, as before 2026-11-13; `cineWalkAway`
  stays.
- **Elvédor's fridge is empty** ("make elvedors fridge empty"): `ELV_FRIDGE_FULL` false — no bottle; `elvFridge` still
  saved and read.

## 2026-11-15 — his mailbox at the gully's mouth
The owner, a screenshot from the beach at (12.44, −706.55) looking −1.22 rad into the gully: "put a realistic mailbox
right here i dont want people to miss the house." (The two boxes that stood at the GATE were taken out 2026-10-16 with
the rest of the walk up; they are still `skip`ped.) `buildElvMailbox` (called from `buildElvField` after the dressing, so
it is in `elvField`: built at boot, warmed with the gully, shown from z −600 with it): at `ELV_MAILBOX` (15.6, −707.6) —
where his crosshair met the bank, 3.4 m off the path's line — yaw −1.35, the door to the sea, the name side up the
beach. Grounded by a ray down onto `elvFieldMesh` (else `beachGroundAt`): y 0.35. A grey 4x4 post sunk 0.14 and leaning,
a board and a brace under the box; the box an extruded half-round-top profile (0.17 wide, 0.47 long, three pressed ribs,
a door a little proud with a latch) in a canvas enamel gone dark green-black with rust blooms, streaks and scratches
(its map as emissive at 0.42 — at 0.22 it was a black shape at night); the red flag UP on its pivot (emissive 0.8); an
amber reflector on the post (emissive 0.9) — country-road real, and what catches the eye; BASQUIANT hand-painted on the
side (as on the gate's board). The post is a collider (r 0.12). Probe `mailbox` (`his`, `walk12`, `close`, `side`):
from his spot it stands in the middle of the view at the mouth; from the beach 15 m short the cliff's toe hides it —
you see it as you come level with the gully, as his screenshot did.
- **Not slop** (same day: "dont make the mailbox look ai slop"). Looked at close, 1280 wide (probe `mailboxClose`), the
  first pass gave itself away: rust as even orange dots tiled over it, a black block for a latch that read as a hole,
  a flat saturated red card of a flag, a serif typeface, a glowing yellow coin. Now: enamel with a lighter wear at the
  top and dull patches, rust only along the bottom edge (where water sits), in two seams and at a knock or two, each a
  cluster of irregular ellipses with a run under it, the map repeated 2.2 (was 4.5); a pull tab at the top of the door
  and a hinge rod at its foot; the flag a bent steel strap and a plate with one corner rounded, faded brick (0x8e2f22,
  emissive 0.45); BASQUIANT in hardware-store stick-on letters, gold vinyl on black squares, each set by hand (jittered
  rotation and baseline), the I peeled off and its glue ghost left; the reflector smaller (r 0.024) in a steel rim with
  its screw; the post grey pine with open grain and splits.
- **"MAKE THE MAILBOX LOOK WAY BETTER AND I CLIP THROUGH THE SAND RIGHT HERE"** (same day, at (15.68, 0.41, −708.36),
  a metre from it). **The clip:** the walk's floor in the gully was the carve's FORMULA, sheer from the floor to the bank
  (0.41 → 3.3 m in under half a metre there); what is drawn is that formula sampled on the 0.25 m grid, whose triangles
  make the step a slope overhanging its foot — the drawn sand was at 2.38 where the feet were at 0.41 (probe
  `mouthClip`). `elvLandFloorAt` now reads the floor off the mesh's own triangles where the mesh is (`elvFieldY`, off
  `elvFieldGrid` kept at build; the index's split, a b c / b d c; null on cells the mesh leaves out), so you stand on
  what is drawn and the steep-step rule refuses the bank. (The probe's ray also hits the CLIFF's mesh above it, 3.19 —
  invisible there: its shader discards inside `ELV_CUT`, which a CPU ray cannot know.) Probe `gullyWalk`: the path's
  line still walks, steepest step 0.42 rise/run (the refusal is 1.15). The mutants' floor (`elvLandFloorAt` too) follows.
  **The mailbox:** smooth-shaded (the round top was faceted), 18 curve segments, the door bevelled and the box's open end
  rolled into a bead it shuts against, two rusted nails through the board. A bump map off the paint was tried and taken
  out — off a nearest-filtered map its slopes are huge at any scale. **Trap:** an edit appended a comment to the line
  holding the paint gradient's `addColorStop`s and commented them out — the canvas had no base, the box came out
  camouflage. Three "fixes" did nothing before the code was read; read the line before tuning the material.

## 2026-11-15 — "Burn the puppet." is a rare achievement
The owner: "make burning the puppet be an achievment 'Burn the puppet.'" In `elvFireTick`, once he has landed on the fire
and 4.8 s on (his thrashing died into twitches, still burning in front of you): `showAchievement('Rare achievement
unlocked', '50 - Burn the puppet.')`, the crow's and the gulls' toast and chime, once (`R.ach`; the throw only happens
live, and `elvBurned` is saved, so a load never burns him again; not while `replaying`/`applyingSave`). `RARE_ACHIEVEMENTS`
counts `elvBurned` for the end stats. Probe `pupBurnAch` (at his fire, the puppet in hand via `elvCarryBegin`, thrown on
the fake clock): toast 4.95 s after the throw. `elvCarryBegin`, `elvBurnedS`, `pupReadyS` are on `__bw`.

**THE PUPPET IS ON HIS BED (2026-11-17, the owner: "MAKE SURE THE PUPPET IS ALWAYS ON THE BED").** A fresh game, measured
(`tools/pupbed2.js`): culled far off (`cullBeyondFog`, which hides and restores him with the rest), on his bed and drawn
from 560 m in and in the room. The hole was a LOAD: a save made while you carried him (`elvStage` 2) put him back in
your arms only once his model loaded — which happens at the house — so a load anywhere else had him in nobody's arms and
off the bed; and one that had run (4) had nowhere to be. A load now turns 2 and 4 into 1: on the bed for the taking.
(`tools/pupbed3.js` reloads such a save; in the probe's reloaded page the boot's parse queue crawls and the house never
loads in 30 s — a harness limit, the stage itself came back 1 both ways.)

## 2026-11-18 — the loose rocks out, the crab's pocket, the sea's skin
- **No loose chunks round the formations** (the owner: "get rid of these rocks because they look horrible in the water"): the
  skirt and shed calls of the first formation, THE WALL and the wall behind the drain go through `noChunk`, which draws
  nothing but eats the same four `rnd()` numbers `placeMass` would — so every heap's masses and aprons are exactly where they
  were. (They were half-buried dark caps in the bright wash.)
- **The crab at the foot of the back wall** (`ROCK_CRAB_AT`, "an invisible wall … doesnt let the player walk up to the rock
  face and get the crab"): the big mass's one circle (6.4, 60.6, r 6.1) reached 1.53 m past the crab on open sand.
  `clearCrabPocket()` (before `fillRockGaps`) pulls any circle r ≥ 2 back to 1.25 m off the crab; the gap filler then puts its
  r 0.42 colliders back wherever real stone stands in the band given up. Measured: you can stand 0.1 m from it; a flood fill
  from the beach (x −2.4…14.2, cells 0.2, player r 0.3) still stops at z 57.2 — no way through the wall.
- **The sea's skin** ("flat blue plastic … the ripples … squiggly lines"): the vertex waves (and `waveHeightJS`) are
  untouched; the fragment shader adds `seaGrad` — seven short travelling waves (9 m → 0.75 m), each at its deep-water speed
  (ω = √(g k)), each dropped before it is finer than its pixel (`fw = length(fwidth(xz))`, aa = 1 − fw·k·0.55) — onto the
  facet normal (×0.7, the low-poly shape kept). Real Schlick fresnel to a sky gradient, a 0.25 band on the facets (was 0.6),
  green light in the risen water, wind slicks (long lanes where the chop dies), white torn off the tallest crests, a moon road
  that sparkles off the skin (pow 300 ×2 + pow 60 ×0.07; a broad 46 lobe made white blotches near the camera), and through the
  shallows the sand with light wandering on it. `rippleField` returns its SLOPE too (d wave / d distance, radial) and a ring is
  shown by the light on it, not drawn as a line. The foam threads (one noise iso-line: the "squiggly lines") are the walls of
  drifting cells (`seaCells`, F2 − F1) — WARPED (an even Voronoi net read as pool tiles) and torn by a noise mask. Cost
  measured headless 793×446: ~1.7–2.8 ms old, 2.9–3.5 ms new on the same view.
- `tools/probes.js view` (any camera on the beach, `&pick=` raycasts, `&nomist=1`, `&perf=1`) did all of the above.
- **(later, 2026-11-18) No cells on the water.** The `seaCells` Voronoi walls — the shallows' light, the shore froth and the foam
  lace — read as a honeycomb net laid over the sea (the owner: "stop texturing things with just circles"). All three are layered
  `skN` noise now (soft drifting light patches; blotchy torn froth). `seaCells` is left defined and unused.
- **THE BLACK "ROCKS" IN THE WATER WERE THE DRAIN'S GRAVEL** (found 2026-11-18 after four asks; the owner: "its right out front of
  the sewer opening. it only happens when the tide comes in … stop being impatient and wait for the waves to come up"). The drain
  model's outflow run (`models/drainage-tunnel-home.js`, the ER group) laid 40 + 22 `DodecahedronGeometry` cobbles sunk to a
  third of their height in the sand toward the sea. At high tide the sand there is DISCARDED (seaward of `shoreLine`) and every
  buried lump stood over the water as a black chunk. Both loops are gone. Lessons: (1) anything half-buried in the beach sand
  is a floating lump when the tide covers it — clip it at the shore or keep it above the high-water line (~x 8.6); (2) the
  beach's tide peaks at uTime ≈ 34.9 + 139.6 n — render a shoreline complaint AT HIGH TIDE (`view&t=34.9`), never at a random
  clock; (3) scenery can live in a room's own model file, not only in main.js's rock code — grep the models too. The wrong
  guesses on the way (formation chunks, splashes, gibs, footprints, the under-surface school) were each ruled out by test.

- **The black "rocks" on the water near the spawn are NOT the formations' chunks** (those are gone, and a fresh boot shows none
  there, headless or in the pane). In the owner's screenshot they are solid black low-poly shapes FLOATING at several heights over
  the water and the sand — a burst of something mid-flight, not scenery. Ruled out by test: splash drops (pale at every scale,
  against the moon too), footprints (never stamped in water), the throwables (three in the game), castle props (none near the
  beach), the wreck/headland/dojo rocks (far), the syringe (extraction only). Still to find: ask what he did just before.

## The bedroom behind START GAME (2026-11-19, the owner: "render this room for the starting screen that says START GAME have it thunder and raining outside the window and make it dark and depressing in the room … that exact screenshot … sitting in a chair at a desk … a full blue syringe … an iphone on the desk … retro", then IMG_7208 "make this the pic … where that girl is", and "start game should be shown overtop of the scene in the room while you hear and see the rain and thunder out the window i will ad a cutscene here after so be ready")
- **The model**: jimbogies's "Bedroom" (Sketchfab, CC-BY-4.0, README). Source kept in `incoming/bedroom-2026-11-19/`
  (gitignored) with the owner's photo. `/usr/bin/python3 -E tools/bedroom_pack.py SRC/scene.gltf tmp1.glb 256 --photo
  SRC/IMG_7208.jpg --photo-crop 0.267,0.275,0.756,0.813`, then `tools/glbquant.py tmp1.glb tmp2.glb` and gzip whole →
  `assets/bedroom.glb` 1.76 MB (70 MB raw: tangents, normal and metal-roughness maps dropped, colour maps to 256).
  **It is in INCHES** (SketchUp: the ceiling at 96): `room.scale = 0.0254`. The frame's picture ("Girl") is stored
  UPSIDE DOWN (its UVs turn it back): the owner's print is cropped out of his hand and turned 180° the same way;
  checked in a render (hair up, the sleeve and the "Prestige" signature bottom right).
- **`TB`** (main.js, after `const overlay`): its OWN WebGLRenderer on `canvas#title-room` inside `#overlay` (the world's
  boot under the cover untouched), drawn 300 px tall into a render target, then a pass that lifts (×1.7), drains
  (saturation .38, less in a flash), cools, crushes the blacks, vignettes and Bayer-dithers to 14 levels; CSS blows it up
  pixelated. Started by `setTimeout(tbStart, 0)` — after the module ran, so a checkpoint load (`instantStart`, set at
  the module's foot) and `skipIntro` never build it. Torn down by `tbStop` from `leaveTitle` (rain faded, everything
  disposed 4 s later, after the cover's fade). Probes: `titleRoom` (`PB_Q='&title=1'`: what it found, the view, `&cams=`
  candidates in room metres, `&fl=1` a flash), `titleStart` (START pressed: torn down, no errors).
  `tools/probe.html &title=1` keeps the title (no `skipIntro`); `tools/probe.sh` passes `$PB_Q`.
- **Found from the model, not typed in**: the window (material `window`; its thinnest axis is its normal, out is away
  from the room's middle), the desk (the photo `Girl` leans on it; the leaf `Pattern` is all over the room, so only its
  vertices within 0.6 m of the photo: the plate and the cup).
- **The camera is SOLVED**: four marks in his screenshot (photo, cup, plate, window sill) against their room positions,
  least squares (scipy) for position, yaw, pitch and lens. His shot is STANDING (1.84 m, 34°, two metres back); held to
  a seated 1.15 m it fits nearly as well — eye (1.83, 1.15, 1.69), look (2.185, 0.788, 2.549), 54.5° — 0.45 m from the
  desk's edge: "sitting in a chair at a desk". Guessing cameras (six rounds) never got the window and the desk both in.
- **The storm**: a sky sheet 5.5 m out (noise clouds, a low town glow, the flash); 2,600 rain streaks (LineSegments, CPU,
  a little wind) between it and the glass; a wet-glass sheet just inside the pane (beads and runs, shader); one
  shadow-casting SpotLight from high outside (BasicShadowMap: the panes drawn hard on the bed) — base 2.2, a strike adds
  16 in 3-4 pulses; thunder is the beach's `sfxThunder` 0.25-1.8 s after; strikes every 6-16 s. The rain is heard as
  filtered noise on the sea's bus (`tbRainAudio`; the title surf is not started under the room) — synthesized: there is
  no rain recording in the game.
- **The desk**: `makeSyringe()` full (`setFill(1)`), 0.19 m, its clear barrel frosted (the clear glass vanished at this
  size and left a speck of blue), its plastic darkened ×0.55 (lost on the white cloth), its fluid glowing, a soft contact
  shadow (no light reaches the desk to throw one); a phone (box + a lock-screen canvas: 3:12, "Missed call (4)") with a
  faint glow light.
- **For the cutscene to come**: everything is on `TB` (`TB.sc`, `TB.cam`, `TB.r`, `TB.camBase`/`TB.look`, `tbRender`);
  START currently runs `runIntro`, whose `leaveTitle` calls `tbStop`. A cutscene in this room means NOT calling `tbStop`
  there but after it, and driving `TB.cam` from its own clock.

## The call: the opening at the desk (2026-11-19, the owner: "after clicking start this audio should play. it should show the desk with a full needle the sketchbook … and the phone use the hands in this like we did for the inventory … at 28 seconds … the phone is up to his ear … at 41 seconds he should pick up the needle and squirt it … 'i have like a thousand sketches' … flipping the pages … 'i think i have an idea' the last page should flip showing the beachwalk sketch … after this audio ends the waves of the beachwalk intro scene can be shown"; then "you can take those plates off the table for room", "just make the table bigger")
- **The beats are the recording's**, measured, not guessed: macOS 26's on-device `SpeechTranscriber` (SpeechAnalyzer) gives
  word times WITHOUT a privacy prompt (the old `SFSpeechRecognizer` from a CLI dies in TCC: no usage string); the
  ringtone is two flat −30 dB stretches in a 0.1 s RMS print (21.4-23.0, 24.7-26.5). The transcriber's first word of
  each phrase swallows the silence before it ("Hello?" 27.06-28.62: really 27.3). The scratch script is gone; rebuild
  it from `SpeechTranscriber(locale:, transcriptionOptions: [], reportingOptions: [], attributeOptions: [.audioTimeRange])`
  + `AssetInventory.assetInstallationRequest` + `SpeechAnalyzer.analyzeSequence(from: AVAudioFile)`.
- **Audio**: his mp3 (−24 LUFS, peak −6.9) +6 dB through a limiter → `assets/intro/call.m4a` (AAC 128k, −18 LUFS, peak
  −1.2). Decoded early (`icDecode` in `tbLoop` once there is a context), straight to `ctx.destination` at the intro song's
  level (`icGain`: master ×2, capped) — `IC.vol` is in `musicGuard`, `musicNote('call')`, musictest scenario `call`.
- **TRAP, found here: everything under the title was SILENT.** The bedroom's rain (`waveBusGain`) and thunder
  (`sfxOut`) ran into the master, and the master runs through `gameAudioGate`, which is 0 until `introDone`. The
  "rain sound true" check of the first pass only saw the node exist. The room now has its own path (`tbBus`: `TB.bus` →
  destination at the master's level, `TB.sfx` at the effects slider, `TB.rainBus` at the waves', both ×`TB_STORM_LIFT`);
  the thunder is steered there by `tbScope` inside `sfxOutBase`. musictest `call` measures it ("the storm under the
  title 0.0041"). Anything new heard before the beach must not go through the master.
- **The hands** (`tools/intro_cut_pack.py`, its docstring has the commands): each clip at 12 fps is warped frame by frame
  onto a reference frame by a homography of the TABLE PLANE (SIFT on the wood, arm masked; 150-680 inliers; the
  blurred at-ear frames 56+ held as shot) — so the book and the phone stay put while the camera wandered (the book drifts
  ~130 px down and 20 % bigger over IMG_7214 otherwise). Kept: Vision instances reaching the bottom (the arm); the book by
  colour (white, unsaturated AND smooth — the table's glare is as pale but warmer, the rug as pale but patterned); the
  phone where Vision dropped it (dark, neutral, touching his fingers); his knee out. Vision is NOT consistent frame to
  frame (the book in some frames, merged with the arm in others): never pick instances by id. The arm runs past the
  clip's border by edge replication, darkened with distance (`past_edge`) — each layer is pinned to its screen corner
  by its `anchor` so the clip's own border is off screen; shifting a layer inward showed the cut (the at-ear hand
  smeared into a bar). The at-ear phone showed the table through its glass (blur): non-skin there painted dark.
- **The pen is the syringe**: its ends hand-marked on keyframes in the reference frame (`PEN`; auto-tracking took the
  sleeve's edge), its black pixels taken out along a band, and the grinder behind its top end (it came with the hand
  mask). main.js draws the syringe (`icSyringe`: rod, thumb rest, flange, barrel, the blue on the glow canvas, hub,
  needle) under the hand while it lies, over it while held; the squirt is a jet and drops on the glow canvas.
- **In the room** (`IC`, after `tbStop`): two canvases the size of `TB.rt` — one lit by the room (`light` 0.2 + the
  lightning + the phone), one by its own light (the phone's screen, the blue, the squirt) — composited over the room
  INSIDE the render target, so the post pass drains and dithers them with it. The lying phone's screen is drawn through
  the four corners the packer found (voicemail wave and progress 0-19.6, off, the call pulsing 21.35+, the phone
  buzzing on the table during the rings); the lifted phone's call screen is baked into its frames. `TB.phoneL` moves
  under the 2D phone (unprojected onto the desk) and glows with it.
- **The desk**: the plate and cup removed (`tbClearDesk`: every vertex standing on the table's top but the photo, then
  the WHOLE connected piece each belongs to — half a cup left a fan of spikes); the model's table is a DRAPED cloth —
  stretched, its folds smeared into strips — so it is hidden and a plain box at its height stands in (`TB_DESK`,
  1.54 × 1.0 m, the linen map tiled, darkened ×0.62, receiveShadow off: the storm light's hard shadow stepped across it).
  Camera `IC_CAM` (eye 1.62, 1.2, 1.92 → 1.6, 0.46, 2.6, 46°) found with the probe's `&cams=`.
- **Flow**: `beginGame` → `runCall` when `icCanRun()` (room built, sheets and json in, a context, the bytes) else
  `runIntro` as before. `introQuiet` is set (the world under the cover is not drawn) and `introHoldNow` holds the boot's
  parses 2.2 s before each beat (`IC_BEATS`). At 71.5 s, or Enter, `icFinish` → `runIntro` (its black fades over the
  room, then `leaveTitle` → `tbStop` → `icStop`).
- Probes: `callShots` (&title=1, `&ts=` seeked on the recording's clock, `&cams=ex,ey,ez,lx,ly,lz,fov;…`, `&shift=`),
  `callRun` (real time: START to the waves, `&skip=s` presses Enter), `titleStart` (now skips with Enter);
  `titleRoom &box=` lists meshes in a box, `&amb=` lifts the room's ambient to see it.

## The call, round two (2026-11-19, the owner: the mirror and the wall right of the window "flickering" on the title; "the phone and syringe are off"; "use an actual syringe model from the game. it shows through his hand"; "glance out the window and at his bed while on the phone"; "the sketches need to be seen way better"; "use the page flip sounds from the audio of the video"; "make the hands and items look better this is all cheap looking"; "no loading screen it should seamlessly look down towards the table … from the position of the start game"; "make his hand go back to idle"; then "a dramatic zoom into the last beachwalk page … then it goes to black then open up to the waves video make the waves video look better too i see it lag sometimes"; "make it look like a real iphone screen and someones calling too")
- **Painted on the table, not on the screen.** Everything of the LEFT clip (book, hand) is drawn on a canvas in the DESK
  CAMERA's view (`IC.deskCam`, `IC_CAM`), and that canvas is projected onto a 14 m plane at the table's height
  (`IC.paint`: each fragment projected by `deskVP` into the desk view, depthTest off, after the room). A flat book is then
  on the table from ANY viewpoint (the title shows it; the glide down from the title needs no cut, and the push-in on
  BEACH WALK is a real camera move over a flat page), and a hand drawn there stays exact for any camera that only ROTATES
  about the desk eye (the glances, `IC_GLANCE`: `icHead` slerps the desk pose toward the window / the bed). The RIGHT
  clip stays a screen overlay (`IC.ear`): at his ear it turns with his head.
- **The syringe is the game's model** (`TB.syrPose` +Z = needle, the cap hidden): lying, its pen's two ends onto the table
  plane (held a pen's 0.13 m apart: the clip's pen is foreshortened); held, the two rays out to the depth that puts them
  0.13 m apart (`icPoseSyringe`). Lying it is on layer 0 in the room pass (under the painted hand); held it goes to layer 1
  and a pass of its own after the hands, depth cleared — the lights carry layer 1 too. **TRAP: a second `render` of a
  scene with a `background` repaints it even with `autoClear` off** — the held pass blacked the frame until the
  background was nulled around it. The squirt is drawn in the desk view from the model's tip (`parts.tipZ`).
- **The phone is a 3D iPhone** placed on the four corners the packer found for the lying phone in the clip (so his hand
  picks it up from exactly there, hidden from frame 19), its screen `iosScreen` at 180×390: 'incoming' (Matthew, mobile,
  Remind Me / Message, slide to answer with the shine), 'vm' (the Phone app's Voicemail, his message playing: scrubber,
  speaker on, pause), 'lock' (3:12, three missed calls). Under the title it RINGS — the screen, a buzz on the table every
  1.7 s (`tbBuzz`, a 150 Hz rattle on the room's effects path) and the phone jittering. Anything scheduled on a
  SUSPENDED AudioContext lands all at once when it resumes: the buzz and the thunder only fire while it is 'running'. The
  clip's lifted phone has the same call screen baked in (`ios_call` in the packer).
- **The title view** turned a little right and widened (64°, look 1.9, 0.72, 2.6) so the ringing phone is in it.
- **Flicker**: the room's maps were nearest-only (`retroTex`) — they crawled as the camera breathed; mipmapped now
  (magnified still nearest), the near plane 0.03 → 0.06, the mirror's glass polygon-offset in front of its frame, the
  spot's shadow bias −0.004 / normalBias 0.02. The props sat 9 mm INSIDE the new table (the old top, 0.481, from the
  plate): `TB.desk.top` is the new table's.
- **The left hand's timeline** (`IC_LSEG`): in and up (2-52), the syringe down (82-95, `pendown` sound), then the reach-in
  frames BACKWARD (15→2) — his hand goes down out of shot, idle — the book alone, and at 57.45 frame 119 slides up from
  below (`IC_LIN`) and the flips play straight through at 9.7 fps so the last turn lands on "I think I got one in mind"
  (no more hand parked on the corner). The packer dropped 96-118.
- **Sounds off his clip** (`assets/intro/flip1-3.m4a`, `pendown.m4a`: IMG_7214's audio at 10.72, 14.02, 18.22, 7.5 s;
  highpass 200, afftdn, +24 dB, a gate, a limiter — the room's hiss is 20 dB under a page) scheduled on the recording's
  clock where their frames play (`IC_SFX`).
- **The look of the hands** (`grade`): the edge soft (blurred alpha before the downscale) instead of the hard cut and
  black line ("a sticker"), crisp inside, 0.56 / 0.533 of the clips (the room renders 400 tall now, `TB.H`), a soft
  shadow under each frame on the table (canvas `filter: blur() brightness(0)`, farther and fainter when held up). The
  sketches: `ink_up` flattens the paper to its own shading and darkens every pencil line over 6 % below it.
- **The end**: BEACH WALK, his hand gone, then `IC_ZOOM` (70.95-72.75): the eye pushed to 0.11 m from the page,
  accelerating (^2.4), the lens 46 → 30°, a strike; black on the frame it fills the view; `runIntro`. The waves video is
  started playing at the push-in (`IC.vidWarm`, not re-seeked by `runIntro`) and the boot is HELD through the whole song
  after a call (`introHoldNow`: `IC.handed`) — it had the call's 70 s.
- **The waves' lag was the LOOP**: `callRun` measures every presented frame (requestVideoFrameCallback): no drops, but
  67-83 ms holds at mediaTime 0.10, every wrap. Now Media Source Extensions append the 8.6 s clip again and again at
  k·8.6 − 1/15 (`introWavesSeamless`; the asset re-muxed fragmented, frames unchanged): 540 frames, 0 gaps. Graded a
  little colder and deeper and vignetted (`#intro video` filter, `#intro::after`).

## The call, round three (2026-11-19, the owner: the "weird sound that wasnt rain" under START GAME; "make the cuts cleaner i see some stuff … phasing in and out while he flips pages" (185, 189, 225: "things coming through above the sketchbook paper"); "i need to tell what the pictures are"; "position everything on the table better it can be more centered and the picture frame out of the way a little"; "the second time he looks towards the bed have him look at the poster above his bed"; "the syringe should be in his hand not shown through it"; "have him glance at the syringe … inspect it then squirt it a little longer"; "have each beep of the phone during the voicemails he uses his hand to press a button to skip each message"; "make end zoom better and less corny"; "the textures on the walls still flicker")
- **The weird sound was `tbBuzz`** (a synthesized 150 Hz rattle for the phone shaking): gone. The phone still shakes, silently.
- **The rug in the raised pages**: the book's colour mask (pale, unsaturated) joined the raised page to the rug behind it.
  Measured: the page's local spread (9 px window) 0.001-0.004, the rug's 0.02-0.06. Above the binding (ref y < 455) only
  smooth paper or Vision's arm is kept; the whole cut is then one connected piece (plus anything a quarter its size).
- **The sketches readable**: the book at 0.70 of the clip (was 0.56; the right clip 0.667), `ink_up` thresholded at 5 %
  with every line dilated a pixel at 0.7 — and applied where Vision's arm swallowed the page too. The sheets are split
  at 4096 square (`left-0..2.webp`, a 7th number in each rect): a WebP stops at 16383.
- **In his hand, for real**: along the pen the packer reads where its black shows (in front of his hand) and where skin
  covers the line (a finger over it); those fingers near the line are cut as their own frames ('f31' …). Drawn: shadows →
  his hand → the syringe (layer 1, depth cleared) → those fingers → the right hand. Drawn UNDER the hand instead, the
  syringe vanished behind the palm (the barrel is twice the pen's width); drawn over all of it, it "showed through".
- **The inspect**: frames 31-43 back and forth at 7 fps while he holds it up (`IC_LSEG` 'pp' with its own rate), the head
  turned 0.8 of the way to where he holds it (`IC.syrLook`, posed once from pen frame 37 — following the syringe frame to
  frame made the head jitter at 12 fps), the squirt 43.25-44.4.
- **The taps**: the voicemail's four beeps (1.2 kHz, 0.15 s: 5.13, 9.14, 13.29, 17.89) each get his right hand up from
  below (frame 17), a finger on the phone (frame 18) as it beeps, and down again; the phone dips a mm; the Phone app's
  voicemail moves on a message (`iosScreen` 'vm' takes `{ m, p, len }`).
- **Glances** now window (30.4-36.2), syringe (41.25-45.7), the POSTER over the bed (`TB.poster`, the 'Poster' material's
  middle; 48.7-53.7).
- **Centred**: the desk camera to x 1.48 at 50°, the table out to x 0.42; his photo moved −0.42, +0.1 m (`tbMovePhoto`:
  only pieces WHOLLY inside its box move, so the wall it stands near stays).
- **The end, calmer**: no lightning, no lens warp; a beat on the page, then one even push (`icEase`) from 71.2 to 75.4 to
  0.38 of the way to the page, the lens 50 → 40°, the room fading from 73.9; black; the intro.
- **The flicker, measured** (probe `flicker`: the room drawn 30 times along its breathing, every pixel's frame-to-frame
  change summed into a heat map): not the walls' textures or z-fighting but thin bright EDGES (the mirror's gilt frame,
  the window's) crawling a pixel as the camera breathed at 400 px. The room is drawn at 2× into `TB.rt` and averaged
  down by the pass (`TB.vw/vh` is the view's own size, what the clips are placed in), and the camera no longer breathes
  under the title or at the desk.

## The call, round four (2026-11-19, the owner: "the hand doesnt even reach the phone the stuff isnt on the table right its laggy as shit … the syringe part lookd horrible … the old phone pickup was better. space out the 'oh yeah' reply a little later"; then "the phone held to the ear should look like the last version before this. his phone shouldnt already be in his hand when clicking off the voicemails and his hand should actually touch the phone on the table")
- **The desk camera back** to round two's (eye 1.62, 1.2, 1.92 → 1.6, 0.46, 2.6, 46°). Round three's centring (1.48 / 50°)
  moved the painted LEFT clip with the desk camera, but the RIGHT clip is a SCREEN overlay pinned to the corner: its hand
  reached where the phone was in screen space while the 3D phone now stood elsewhere (stills: the hand at the frame's
  edge, the phone cut off at the top right). Back: the hand comes down on the lying phone at 25.0 s and lifts it at 25.4.
  **A camera change at the desk breaks the right clip's registration — the right clip has no 3D to follow it.**
- **The taps** borrowed clip frames 17/18, which carry the clip's own phone: a second phone in his hand over the Voicemail.
  `icTapFrame(key)`: a copy of each with the dark, unskinned pixels inside `R.screen` (grown 1.25 about its middle) made
  clear — a fingertip on the real phone. Stills at 4.95/5.13/9.14: one phone.
- **At his ear**: the frames from 44 on drawn at 0.8 (`icBlit`'s new `k, kx, ky`, about the bottom-right corner): round
  three's sheet is at 0.667 of the clip, round two drew 0.533. The source clips are not in the repo and the packer's work
  dir is gone, so the old frames cannot be re-made; it stays a dark shape (the phone's back, close to the lens).
- **The syringe readable**: glass opacity 0.5 → 0.32 (0xe6eef4), the blue's emissive 1.4 → 3.0 (0x2a6bff: it survives the
  pass's drain), the plastic ×0.55 → ×0.85, held at scale 1 (was 0.85). It reads as a syringe, the blue down the barrel.
- **The lag, measured** (`tools/calljank.js`: every rAF from START to the call's end, held frames and long callbacks with
  the recording's time): 24 frames held 50-217 ms, 22 of them in 0-5.6 s (the boot's first parses after START), plus
  100 ms at 39.4 and 59.5 (the left sheets' first draws: an Image is decoded on first draw). The 2x target was NOT it
  (`tools/callperf.js`: the room 0.4 ms a frame at 1x, 0.6 at 2x headless) — it is back to 1x anyway (`tbSize`), the
  camera no longer breathing at the desk. Each sheet is now an ImageBitmap as soon as it loads (`icLoad`; `icImgOk` and
  `icTapFrame` take either): 39.4 and 59.5 gone. `icHoldNow` holds the boot the call's first 8 s: the glide is clean;
  the boot's parses then land at 9.9-14.1 s (18 held, worst 233 ms — the voicemail, the phone lying still). Open: they
  have to land somewhere in the call (after it the song holds them too, and the end black is capped at 20 s).
- **"Oh, yeah?" half a second later**: word times by `SpeechTranscriber` (the Swift is in the notes' round one; this
  round's: `AssetInventory.assetInstallationRequest` then `SpeechAnalyzer.analyzeSequence`, each run's
  `audioTimeRange`); by silencedetect the reply is 56.02-56.62, then 1.0 s before "Dude, I have like a thousand sketches"
  (57.64). `call.m4a` re-cut: 0.5 s of the pause before it (55.60-56.10, room tone, not digital silence) inserted at
  56.10, the same 0.5 s taken out of the pause after (57.10-57.57; three 10 ms crossfades allowed for): the reply at
  56.51, and everything from 57.64 to the end where it was — no beat after it moves. The original is not kept in the repo.

## The call, round five (2026-11-19, the owner: "the zoom in on the book should be faster and zoom so close it turns to black like a movie trailer. clean up the cuts i saw things i shouldnt especially the needle just have his hand and the needle shown … clean up all the traces … take the phone out of his hand before he picks it up … make the stektchbook not retro so the pictures are seen better. the phone is clipping into the wall move everything closer on the table to the player")
- **The source clips are on the Desktop** (`~/Desktop/BEACHWALK ASSETS/IMG_7209.MOV`, `IMG_7214.MOV`; round four thought them
  gone). The packer's work dir is rebuilt in a few minutes (its docstring): frames at 540 for Vision and the homographies,
  and now ALSO at full size (`v2h`, `v3h`) — every mask is made at 540 as before and the colour is warped from the
  1080-wide frame by the same homography at 2x (`warpH`), the mask upsampled linearly (`up`). Sheets at `KL` 1.6 / `KR` 1.5
  sprite px a view px (`meta.L.k`, `meta.R.k`; main.js divides every rect by it). 2.9 MB as before (WebP q82); ~0.4 GB
  decoded as ImageBitmaps during the call, closed in `icStop`.
- **Sharp, not retro**: the room renders at its 400 px into `TB.rt` (nearest now); his clips — the paint, the shadow, the
  held syringe, the fingers, the right hand — into `TB.rtHi` at the screen's size (`TB.Q` = up to 1080 tall / 400,
  HalfFloat, premultiplied), and the post pass lays rtHi over the room BEFORE the grade, dithering only the room's own
  pixels (`bayer(lp)`, `mix(quantised, smooth, o.a)`). The IC canvases are `TB.Q` times the view and drawn in view units
  through `setTransform`, smoothed (`icCanvasSize`). Each redraw is a big upload, so the paint and the ear canvas redraw
  only when their frame/offset changes (`IC.paintSig`, `IC.earSig`). Measured (`calljank.js`): 4288 frames / 73 s, the
  held ones still only the boot's at 9.7-13.1 s.
- **Nothing popping in at the syringe**: the book is cut ONCE (`b1`) and drawn under the frames up to 95, which are his
  ARM ALONE — the book's paper (inside its static mask) and its dark edge (2-10), all paper-white anywhere (a page edge in
  his fingers in 6 and 119), the pen's black, everything not skin along the pen (its end seen head-on — the "cap" in 37 —
  and 55 px round its marked tip: the hand-marked `PEN` is ~30 px off there), anything not joined to the arm
  (`keep_biggest`), pin-holes filled. `h119` is the same for the hand sliding back in at 57.45 (the old slide moved the
  whole frame, book and all). A small dark nub stays on his fingertip in 37, under the syringe.
- **The phone out of his hand**: `h17`/`h18` — the reach frames with the clip's phone (where it lies, grown 7 px, all but
  skin) cut out — for the taps (`h17` alone; frame 16 has no Vision instance) and the reach before he lifts it at 24.95.
  `icTapFrame` (the JS clean-up) is gone.
- **Clean edges** (`grade`): the mask taken ~a pixel inside his outline, the edge band's colour taken from just inside it
  (nearest-interior fill: no fringe of table or rug), a soft one-pixel falloff, NO dark rim (it read as an outline); the
  right hand's cuff opened (3 at the ear) and kept to its biggest piece.
- **Off the wall**: the phone his clip gives is 0.27 x 0.41 m on this table (the clip was shot far closer than the desk
  eye), its far end 5 cm into the wall (z 3.09, wall 3.04, `tools/callgeo.js`). `IC_CAM` moved 0.25 m back (eye z 1.67,
  look z 2.35): everything placed through it — phone, book, syringe, both hands — comes with it, the right hand still on
  the phone. `TB_DESK.z0` 1.98 → 1.58 so its near edge stays out of the shot. The table's top is 3 mm over the old one's
  (`tbGrowDesk`): the old table's front strip, flush with it at z 2.17, z-fought it in a dark line across the desk.
- **The end, a trailer's** (`IC_ZOOM` 70.95-72.25): a whip onto the word (the turn done by 1/3), then the distance
  shrinks by a growing RATIO (`D * (end/D)^(z^2)`, to 4 mm) — the page grows faster and faster — aimed at the MIDDLE OF THE
  THICKEST STROKE (`icInkAt`: the b245 sprite's ink, a two-pass chamfer distance map, its deepest point a little toward
  the page's right); from ~0.77 the stroke is wider than the view and it is black ink, the post's fade finishes it from
  0.94. The near plane follows the distance down. Aimed at the darkest 6x6 patch instead it landed between letters on
  grey paper. His phone hand drops out of the shot as the push starts.

## The title, square and the same on every screen (2026-11-19, the owner, an ultra-wide START screen: "the phone looks huge the syringe isnt even on the table … just center the stuff on the table for the start please it should look good as a start screen. it should look symetrical and it looks different for different screens make it all the same"; "you can change the camera angle a little … but still see some of the window"; "make his hand switching the messages faster")
- **Why it looked wrong**: where his clips put things is right only from the chair. Seen from anywhere else the clip's phone
  is 0.27 x 0.41 m and the book half a metre; and the syringe, placed through the desk camera, lay past the table's edge
  from the title's side-on view. The title's 64° VERTICAL lens showed far more room on a wide screen.
- **The title's own layout** (`icTitleLayout`, `icPropsAt(k)`): on the MIRROR's axis (`TB.mirrorX`, the MirrorGlass box,
  1.67): the sketchbook in the middle at 0.30 m, square (its sides from the smallest box round its pixels' places on the
  table, turned a degree at a time; which side is its top from where the sprite's top lands — a spread fit came out on
  the slant, and the box alone turned it 90° on a 16:9 screen, the clip's book having another shape on the table there),
  the phone at its real size to its right and the syringe to its left, `IC_TITLE_GAP` 0.27 out, at `TB_TITLE_Z` 2.2; his
  photo moved onto the axis, leaning at the mirror's foot. The book is a mesh of its own until the paint takes over: its
  sprite on a 16 x 16 grid, each point lerped from its title place to where the paint lays it (`icRay` of the sprite
  point) — identical at the end. START's look-down (`IC_GLIDE`) carries every prop from the title's place to the clip's
  with the camera (`icPropsAt(k)` with the glide's eased k): they grow as it comes down; no jump at the hand-over.
- **The lens** (`tbTitleFov`): the horizontal angle held (`TB_TITLE_HFOV` 78) up to 16:9; wider than that 16:9's VERTICAL
  angle is held instead — an ultra-wide sees more at the sides (more window), never less of the desk (holding the width
  there cut the book's front off at 2.39:1). Camera `TB_TITLE_CAM` (eye y 1.12, z 1.38; look y 0.45, z 2.8, on the axis):
  the window's lower part in the top left at every shape. Checked at 1280x720, 2000x837, 1024x768 (`probe.html` takes
  `&fw=&fh=` now, `probe.sh` `PB_WIN`).
- **The taps quicker** (`IC_TAP`, `icTapUp`): up in 0.18 s, on 0.12, gone in 0.2 (was 0.42 / 0.32 / 0.41).

## Under START GAME: the rain down again, the phone dark, the cabinet's glass (2026-11-19, the owner: "THE RAIN IS WAY TOO LOUD AND THE PHONE IS GLITCHING WHILE IN THE START GAME MENU. ALSO FIX THE FLASHING TEXTURES ON THE WALLS! WHEN HE GLANCES AT THE POSTER YOU CAN SEE A CABINET TO THE RIGHT OF THE WINDOW AND THE TEXTURES ARE FLASHING CRAZY"; "DONT HAVE THE PHONE RINGING IN THE START GAME PART JUST HAVE IT BLACK")
- **Rain** `TB_RAIN` 0.5 → 0.18, `TB_RAIN_CALL` 0.24 → 0.09: −47.6 dBFS RMS at the speakers at the default sliders
  (`tools/titlerain.js`; −33.5 this morning, −38.6 after the first cut).
- **The phone under the title is off**: `icPhoneScreen(t, true)` draws it black once (`'off'`) and lights nothing; no
  buzz-shake (`icTitleFrame`); the screen starts black at its making. From START the voicemail is on it at once (it showed
  'incoming' for the first 0.6 s). Checked untouched with `tools/titlecheck.html` (the probe page itself presses START:
  run it as `PB_PAGE=titlecheck.html sh tools/probe.sh x <out>`): screen off, moved 0, light 0.
- **The cabinet right of the window flashed** (`tools/glanceflicker.js`: the call stepped at 60 fps through a glance,
  every pixel's change summed into a heat map; raycast through the hot panel): its `GlassDoors` and its pale front panel
  ('material') lie in ONE plane, z 2.828, and z-fought for every pixel as his head drifted — 14450 flashing pixels at the
  poster's hold. The glass is now polygon-offset in front (as `MirrorGlass` is): 225. Then the drift during a glance
  (`icHead`, ±0.015/0.03 rad) taken out — it walked the mirror's gilt edge a pixel to and fro at the room's 400 px: the
  window's hold 7623 → 0, the poster's → 85, the syringe's 243 (the squirt itself).

## The call, round six (2026-11-19, the owner: "I HATE HOW ALL THE STUFF SLIDES TO DIFFERENT POSITIONS FROM THE START GAME POINT … THE SYRINGE IS STILL OFF THE TABLE … HAVE THE PHONE BE ON THE VOICEMAILS IN THE START … DONT HAVE IT VIBRATING … I SEE THE RAIN THROUGH THE MIRROR ABOVE THE TABLE … MAKE THE SYNRGE A CLEANE CUT … FIX THE RIGHT FINGER WHEN PRESSING THE VOICEMAIL. MAKE THE IPHONE PICKUP LOOK BETTER … THE PAGES THAT ARE FLIPPED SHOULD STAY ABOVE THE SKETCHBOOK … SKETCHBOOK TEXTS AND DRAWING ARENT FLICKERING"; "MAKE THE SYRINGE BE THE LAYER UNDER THE LEFT HAND")
- **One layout, no slide**: the title's own layout (`icTitleLayout`, `icPropsAt`) is gone. His clips make the props as big as
  the desk eye's height over the table makes them, so the eye is LOWER: `IC_CAM` eye (1.66, 0.97, 1.67) → look (1.64,
  0.23, 2.35), 0.48 m over the desk (was 0.71): the phone ~0.18 x 0.28 m, the book ~0.34, on the mirror's axis. The
  title's camera frames that same layout.
- **The same on every screen**: his clips are placed in one 16:9 frame in the middle of the view (`icClipFrame`), not on
  the screen's corners; the desk lens holds that frame (`icDeskFov`: the vertical angle at ≥16:9, wider below), so the
  props lie in one place whatever the window. Past the frame (a wider or taller screen) the post pass darkens softly to
  the edge at the desk (`frame`/`pillar` uniforms, coming in with the glide), and his sleeves fade out past the clips'
  edges (packer `edge_fade`, the canvases reach 220 / 260 px past them: `L_OFF`, `L_SIZE`, `R_SIZE`). Checked 1280x720,
  2000x837, 1024x768 (`probe.html &fw=&fh=`, `PB_WIN`; `tools/titlecheck.html` for the untouched title: `PB_PAGE`).
- **The title phone**: the Phone app's voicemail drawn once (`icPhoneScreen(t, true)`: 'vm', message 1 at its start),
  still. The flicker over the table was the RAIN in the window, 2600 one-pixel lines sparkling at 400 px — each drop is a
  soft streak now (a 14 mm quad, bright head, fading tail, opacity 0.3; `tools/mirrorlook.html` heat 2015 → 823). The
  mirror itself is opaque and never changed frame to frame.
- **The syringe is DRAWN along the pen** (`icSyringe2D`), UNDER his hand (the pen was cut out of it, so it shows where
  the pen did): the packer FINDS the pen in each frame (`track_pen`: its dark grey non-skin pixels near the marked line,
  a line refitted without strays, ends at the 1st/99th percentiles, width from the spread; median over neighbours) —
  `pens[k] = [ax, ay, bx, by, held, width]`. The game's model is hidden. The squirt starts at the drawn needle's end.
  Anything not skin up at his hand that does not run down into his sleeve is cut (the ring off the pen's end in 37).
- **The taps**: `h17`/`h18` cut the clip's phone by COLOUR (neutral and dark), not by skin_of (it wants lit skin and took
  his shaded fingers off over the phone). No clip frame has a pointing finger (14-16 are blurred reaches).
- **To his ear**: the clip's 50-55 and 74 (a black slab, the phone a hand's width from the lens) are gone: frame 43 goes up
  and out to the right (`IC_TOEAR` 27.2-27.75), the at-ear frames come up into the corner after it.
- **The turned pages stay**: `white_book` keeps any big white piece beside the book (the rings part the turned stack from
  it), and the frames' and 245/b245's piece filters keep pieces down to 6 % (`keep_biggest(.., near=30, frac=0.06)`).
- **The sketches steady**: each page pixel is the median of it and its neighbours' frames (`cachedH`, away from his hand),
  and `ink_up` has a soft knee (−3.5 %, ×3.4, ^0.85) instead of a cut at 5 % — lines at the cut came and went.
- **Memory**: the sheets are 2048 square (a first draw uploads a sheet whole: 64 MB at 4096 held frames 70-100 ms) and
  GROUPED by when they are drawn (`lgroup`: 'T' the book alone, 'S' the syringe, 'F0'-'F3' the flips in quarters;
  `m.L.groups`): `icSheetsFor(t)` decodes a group ahead of its time and lets it go after (`icSheetTimes`), and each new
  bitmap is drawn a pixel of on a frame of its own to upload it ahead of need (`IC.warmQ`).

## The well man's zoom, back (2026-11-19, "give the well guy his old zoom in when he is reavealed")
- `wellReveal` holds the lens on his face (34°) and opts into `cineWalkAway`; it took where you stood at once, and the
  next frame's clamp moved the camera 0.8 m (x 15 → 14.2): counted as walking away, the zoom let go on the first frame.
  `cineWalkAway` now takes the spot over the next 4 frames (`cineAtWait`). `tools/wellzoom.js`: 105 → 34.2, held.
- **And off the main thread**: a bitmap made from an `<img>` decoded ON the main thread — each part's decode held a frame
  80-100 ms (33, 55, 59, 62 s) even at 2048 sheets. Each sheet is fetched as a Blob (`icLoad`), the Image made from its
  object URL, and `createImageBitmap(blob)` decodes off-thread: `calljank.js` then holds only the boot's 10-14 s frames.

## The call, the syringe: the game's model, under his whole hand (2026-11-19, the owner: "THE SYRINGE IN THE START CUTSCENE IS SO BAD … ITS SHOWN THROUGH THE HAND … USE THE REAL 3D MODEL … THE HAND SHOULD BE THE LAYER OVE THE SYRINGE ALWAYS")
- **Why it showed through**: the pen was cut OUT of his hand, leaving holes the syringe was seen through. The packer now fills
  them: inside his hand's outline (closed by 7) near the tracked line, on the pen's own pixels (dilated 2; the ring off his
  fingertip in 37 came back as skin when it was not limited), the hand is put back and its colour painted from the skin
  round it (`fills`, `cv2.inpaint`, TELEA r7, at full size). The front-fingers layer is gone.
- **The model** (`icPoseSyringe`): `TB.syrPose` along the tracked pen; its length = the lying pen's length on the table in
  this view (`IC.penLen`, scale `Ls / 0.19`); lying, both ends on the cloth; held, its middle 0.8 of the way down the
  middle ray to the table and the ends out along their own rays the length apart (a quadratic in the split, the smaller
  root, ±0.6 of the depth) — a pen turned toward him comes out turned toward him.
- **The layers** (`tbRender`, into `TB.rtHi`): shadows → the book lying still (`IC.front`/`IC.fcx`, from the syringe
  frames on and under the title) → the syringe (layer 1, depth cleared) → his hand and the turning book (`IC.paint`).
  The squirt comes off the model's tip, projected.

## The call of the crow (2026-11-19, the owner: "MAKE THE HORN CALLED 'The call of the crow' take out the end beach cutscene and take out the great horshoe crab coming up from the water scene. take out the tree stump with the crow as well. when the horn is blown on top of the light house is where the crow should grab you and take you to the desert use the same music there for now but have it fade when u land at the desert. put another merchant right in front of the lighthouse door … while in the desert make it say 'e to end game'")
- `hornItem.name` 'The call of the crow' (id 'crabCall', `was: ['The Great Crab Call']` for saves; the model table has both
  names). All three ways the horn was blown up top (`blowCrabCall`, E anywhere on top, the lamp) call `crowCallFromTop()`:
  the horn, then `startTempleFlight(true)`. `startCrabCut` / `updateCrabCut` / `startWakeCut` stay in the file, reached
  from nowhere.
- **From the top** (`tmpCut.fromTop`): no stump phase; the crow comes in out of the sky over the sea (keys from 46 m out and
  26 m up, round to 26/15, down onto your shoulders at `TMP_T.grab`), then the same climb, cloud and desert. The
  lighthouse's music (`lhGain`) fades over ~3 s as you are dropped.
- **No stump**: `tmpStumpSetup` builds no stump, collider or "Approach the crow"; the crow is loaded and kept hidden
  (`updateStumpCrow` hides it outside the flight).
- **A merchant at the lighthouse's door**: a third bake of the trader (`bakeTraderInto`, `trader3World`, `trader3Try`), on
  the deck 2.1 m out from the door and 1.35 m to its side, turned up the deck, in `isleWorld`; `openShop(3)` — the beach
  man's stock. Not part of the hit-him temper (one man, two places, there).
- **The desert, for now**: `updateHover` shows "E — End game" there (outside the flight); `primaryAction` → `showEnd()`.
  `tools/crowcall.js`: on the isle, the horn, the flight (crow in sight), inTemple, the prompt, E → the end card.

## 2026-11-19 (last): the syringe off the book, nothing but his arm, the crow's scream, the puppet down
- **Further from the book** ("syringe is too close to the book"): `IC_SYR_OFF` [-18, 3] view px — the syringe, and his hand
  in the frames up to 95 (he takes it from where it lies), to the left; the book where it was. `IC.syrLook` the same.
- **Nothing but his arm in the pick-up frames** ("clean up all the weird little spots … nothing but the hand and syringe"):
  the fill's closing 7 → 5 (it bridged past his fingertips); a fill that came out not skin is cleared (`badH`); small dark
  pieces (< 260 px) up at his hand that do not run down into his sleeve go (a size limit: the sleeve's light folds split
  it into big dark pieces, and without one the rule cut holes in it); the outline closed and holes filled, ONE piece kept;
  along the pen a stricter skin (warm > 0.105, not yellow: the pen's silver passes `skin_of` at ~0.08), and pale grey and
  yellow there cleared (slivers past his fingertips in 34-52; the yellow at the needle end in 37).
- **The crow's own scream when it drops you** ("not the claude sound"): `tmpScreech` never falls back to the synthesized
  shriek — it waits up to 2 s for his recording (asked for at the flight's start) — and at 0.8 (was 0.35).
- **The puppet can be put down** (`elvDropPuppet`, G while carrying him): laid on his back where you look (`dropPoint`),
  "Pick him up" (E) carries him again, the same stage. Not saved. `tools/pupdrop.js`.
- **And what the slivers were** (measured on frame 46's mask, dumped by running `left()` on [1, 46] only): the pen's own
  pale EDGES, two thin beige strips along its line between his index fingertip and his thumb — warm enough (~0.08-0.11)
  to pass every colour test, so no colour rule takes them (one over the whole hand took his cooler-lit hand off entirely
  in some frames, reverted). They are thin: along the pen's line (within 13 px, t 0.05-1.3) the cut is OPENED by 3 —
  2-4 px strips go, a finger crossing the line stays. A hole is filled only with his skin on both sides of the pen within
  7 px, and a painted fill must come out plainly skin (warm > 0.105). A few px of nub can remain at the fingertip in
  34/37/52, where the syringe is.

## 2026-11-19 (late) — the call: the stray white, the phone at the ear on a wide screen, the reveal's sound, the syringe
- **The white above the book** (the owner's 21:9 screenshot of the first turn): ragged white off the table, joined to the
  book at its spiral, standing over its top edge for frames 119-130 (58.3-59.3 s), and corner bits off the raised page in
  134/136, the table's tan on the turning page in 132/133. The packer's work folder is gone, so `tools/intro_cut_fix.py`
  mends the shipped sheets (alpha only; re-saved q92): flat frames — nothing over the book's own top edge, read off clean
  frames 121/123/125/126 in canvas px, only in the book's columns (his arm's left alone; 131 excluded: his fingers really
  rise there); the raised page — what a 12 px opening strips from the top 80 px; the tan — sat > 0.3, r−b > 0.22, in the
  page's box. The general "drop separate pieces" pass found nothing (it is all one piece) and an opening alone would have
  cost frame 234 58k px.
- **The phone at his ear, on a wide screen** ("fix the phone to the right too it should look like hes actually on the
  phone"): the at-ear frames' right and bottom are the video's edge, pinned to the 16:9 clip frame's corner — on 21:9 that
  stood in the middle of the right half, cut off straight. Carried to the SCREEN's corner as the hand goes up (`earK`, the
  scale's pivot with it), and the post pass's soft pillar no longer darkens his layer right of the frame
  (`mix(pf, 1, o.a · step past the frame's right)`) — pinned there it was a grey ghost. His left sleeve still fades on the left.
- **The reveal** (`assets/intro/reveal.m4a`, the owner's "page flip title reveal sound", 7.4 s, steady ~−19 dB for 3.7 s):
  cut to 4 s with a 1.1 s fade from 2.9, in `IC_SFX` at 69.6 (his last words end at 69.5) — through the push into the black,
  gone as the waves come up. On the call's clock and envelope: a skip before it never sounds it.
- **The syringe** ("make the syringe animation better too"): held, it eases to each pose (`IC_SYR_EASE` 16/s — the clip's
  tracked pen stepped at 12 fps and jittered), a quarter longer than the pen he filmed (`IC_SYR_HELD`); the squirt a soft
  blue glow round a bright thread (4.2 + 1.8 px) and bigger drops. `icPoseSyringe` takes `dt` now.
- **Probes**: `callShots` with `PB_WIN=1760,780 PB_Q='&title=1&fw=1720&fh=720&ts=…'` is the owner's 21:9.

## 2026-11-20 — the call: three voicemails, the reveal to the waves, the phone at his ear, one picture on every screen
- The last beep (17.89) was a fourth, silent message in the Phone app ("4 new messages", "4 of 4", Mom): three messages now,
  the last beep closes the voicemail to the lock screen.
- **The reveal was cut by the recording's end**: it went through `IC.env`, which `src.onended` disconnects at 70.57 s, a
  second after the reveal began. Its own path now (`IC.rev` → `vol`), the owner's whole 7.4 s take, full for 3.9 s and out
  over 3.5 — 69.6 to 77.0, as his waves come up; a skip takes it down with the voice.
- The phone at his ear: the at-ear frames hold almost no phone (the video's edge cuts it). The hand is drawn `IC_EAR_IN` in
  from the corner and the phone's back is DRAWN on from the clip's cut edge past the screen's (`icEarPhone`: a dark slab,
  its rim, the camera block), over the edge so his fingertips tuck behind its rim.
- His left arm: painted on the table (the 3D pass), so the overlay's exemption never covered it, and the left pillar faded it
  to black on a wide screen. The pillar darkens only right and top now.
- One picture on every screen (the owner: "objects are changing size and place when changing screen size"): from START the
  view eases into a centred 16:9 box (`TB.boxK` off the time since START, `tbSize` styles `#title-room`), black round it.
- (and the desk's props — the syringe, the phone — were placed ONCE, under the title, through the title's shape of view: when
  the view eased into its 16:9 frame they stayed where the old shape put them, and on a 4:3 screen the book came out bigger and
  lower with his hands nowhere. `icFrame` places them again whenever the view's size changes — a resize mid-call included.
  Measured: 21:9, 16:9 and 4:3 all 711×400 at fov 46 now, the same picture.)
- (later the same day, the owner: "make it always be full screen … but fit to all monitors": the 16:9 picture COVERS the
  screen — a wide one loses a strip off the top (three quarters of it, the far wall) and the bottom; a tall one off each side.
  `#overlay { overflow: hidden }`.)
- The desk's mess (`tbClutter`): cans, pens, a highlighter, balled paper, two emptied copies of the syringe — placed where the
  desk view sees the table and his hands, the book and the phone are not (`tools/deskmap.js` maps the view onto the table:
  z 1.85-2.7, x 2.37-0.89 along the top). Built after the syringe (it clones it).
- (the mess kept off the phone: the highlighter lay across it — the phone is placed by `icPlaceProps` after the mess, so that
  slides anything inside its footprint plus 7 cm off it, away from its middle)
- (the phone at his ear, round three, the owner: "the phone fix you did is awful just take whats already there … it keep
  flashing in and out": the drawn phone and the inward shift are gone. The flash was the lift: frame 43 carried up and OUT of
  the picture left the right side EMPTY 27.45-27.75 s, then a smaller hand popped in under it — measured, `callLive &cov=1`,
  the right layer's pixels to 0. Now frame 43 crossfades into at-ear frame 90 in place over `IC_TOEAR`.)
- **The intro song begins on the BEACH WALK page** (`IC_SONG_AT` 69.6, scheduled on the call's audio clock by
  `startIntroSong(0, at)`); the reveal sound is gone (and its file). `icFinish` hands the playing song to `runIntro(early)`,
  which holds the black and brings the waves and the name in TOGETHER, at once, on its drop (7.39). Measured
  (`tools/callsong.js`): waves and title on at ctx 77.0-77.5 against a drop due at 77.44. An Enter skip lets the early song
  go (0.6 s) and the intro starts its own as before.

## 2026-11-20 later — the call: the phone to his ear as the video has it; the sketchbook's trims cleaned
The owner: "FIX WHEN HE IS ON THE PHONE IN THE START CUTSCENE JUST MAKE IT LOOK EXACTLY LIKE THE VIDEOS ALSO CLEAN UP THE
TEXTBOOK EDITS AND TRIMS YOU DID … CLEAN UP THE CUTSCENE AS MUCH AS YOU CAN".
- **IMG_7209 at the ear** (frames 56-110 at 12 fps): the phone a hand's width from the lens — a dark tinted glass slab with
  a crisp black bezel down the right of the picture, his thumb over its top edge, fingers in front, the palm under it. The
  packer's Vision cut had kept the fingers and a sliver (the glass is blurred and shows the table through it): a hand with
  nothing in it. `tools/intro_ear_recut.py` re-cuts 56-99: the glass from a HAND-MARKED quad per keyframe (`PHONE`, 56 62
  70 80 90 99, full-size clip px, in between by the frame — Hough on the bezel latched onto the frame's own edge, and a
  difference against the empty table pulled in the floor and chair: the camera swings), filled with the clip's own pixels
  darkened (bezel and lights kept); his hand by skin HUE (0-11, the wood is 12-20 — a looser (r-g)/r test took the table),
  the pale palm grown only under the glass. Then graded, carried past the clip's edge and packed as the packer does; the
  right sheets repacked whole (79 frames, 4 sheets, 0.6 MB).
- **The lift**: the old crossfade 43 → 90 is gone; the clip's own lift plays — 43, 50-54 (Vision's, their wrist blots
  inpainted, 50's chair over the phone cut), 56-80 once at 14 fps, 80-99 rocking at 8 (`IC_RSEG`). 44-46 dropped: the
  table and the chair cut in with him, and colour tests on the GRADED sprite cannot tell his pale skin from paper or grey.
  The at-ear 0.8 size eases in over the lift (`1 - 0.2·earK`) so 43 → 50 does not jump.
- **The sketchbook** (`tools/intro_book_clean.py OLD_DIR`, OLD_DIR = the left sheets and cut.json from git bb45533): the
  trims of `intro_cut_fix.py` stand (they took the stray white); what they tore — 132's turning page — is not shown (132
  aliased to 133 in cut.json). Every flip frame: tan chips of the table on the paper's OUTER edge and nowhere near his hand
  out, specks apart out. NOT the paper's outline smoothed (an opening ate his fingers: his hand is as pale as the page in the
  grade) and nothing inside the page repainted (his hand is as warm as the wood in places). Re-saved q84/alpha 90 (q92/100
  added 0.4 MB with the game at 449).
- Probe trap: `callShots` seeks by running 7 frames at each time, so the squirt's drops (life ~1.5 s) survive from 43.6 to
  the flips and sit over his arm as blue dots — not in real playback.
- **His left arm in the syringe glance** (the owner: "this left arm is cut off way too much in this shot it should be his
  full arm shown", a still at 43.6): what is painted on the table is a projective texture from the desk view (`deskVP`), and
  its shader discarded everything outside that view's frame — as his head turns up and left to the syringe the frame's
  bottom-left comes into the picture and his arm ended on it, a thin strip. The table's canvases (`IC.cv/gcv/scv/fcv`) are
  now `IC_PM` 0.45 of the view wider on the left and taller below (the shaders map `uv` into them, the transform offsets the
  drawing, every clear covers the margin; the screen-space `IC.ecv` is unchanged), and `icSleeveOut` carries his sleeve on
  into that margin after each left frame: its two outlines where they leave the frame (bottom, left, or one each round the
  corner — read off the paint 1.5 px inside, the colour with them) as ONE band along the arm's own run (middle on the edge
  against middle 25 px in), darkening toward his shoulder, blurred 1.2 px, clipped to the margin. A block off each edge plus
  the corner filled read as a grey wedge. Rest frames are unchanged (the margin is off screen).

## The sea's foam, one stuff; the squares gone; surf on everything in the water (2026-11-21)

The owner: "get rid of these pixels that show up just square in the particles in the water … revamp the water to be more
detailed and real looking espcecially the particles of the white caps and suds", then "update these effects to over on the
big rock near the sewer tunnell and do it for the rocks on the boat. and any other thing the waves should technically be
spalshing on".
- **THE SQUARES WERE HASHED GRIDS.** The plankton sparks in the ocean (`floor(xz * vec2(6, 4))`, 17 x 25 cm cells blinking
  at 6 Hz), the wet sand's moon glints (`floor(xz * vec2(9, 3))`, 11 x 33 cm) and its grain flecks (5 cm). At the game's
  low resolution a hashed cell IS a visible rectangle. All three are noise peaks now. Never `step(hash(floor(p)))` for a
  sparkle on a surface you can walk up to.
- **`foamGLSL(N)` → `bwFoamT(p, t, fw, cover, out thick)`**, beside the sky noise. One pattern for the bore, the backwash
  lines, the whitecaps, the suds on the sand, the rings round stones and the white on a stone's face: a warped five-octave
  fbm cut at a level set by `cover` (rafts with holes), plus short strands of lace fraying off a raft's edge (one ridged
  octave, only just outside a raft — long low-frequency ridges read as the "squiggly lines" the owner hates). Octaves are
  dropped by `fw` (metres a pixel). `N` is the shader's own noise (`skN` texture in the sea and sand, `sn2`/`rkN2` hash in
  the small ones).
- **THE WATER'S EDGE YOU SEE IS THE SAND.** The sand is drawn over the sea's last metre or two (the pale "thin sheet",
  `under`/`lip` in the sand's tonemapping block), so foam in the OCEAN within ~1.5 m of `shoreLine` is never seen. The bore
  is drawn on the sheet in the sand shader (`edgeB`/`sCov`).
- **SUDS AS A SUM OVER OLD WATERLINES, NOT THE BAND A POINT FALLS IN.** Picking "the first k whose line is above me" and
  drawing foam by k gave hard straight cuts across the suds wherever one band met the next. Now each of the last four
  waterlines lays a ribbon (thick just under it, fraying down the beach) and the max is taken.
- Suds on dark wet sand must be MIXED toward a foam colour (`bwFoamC`), not multiplied: x1.55 of near-black is black.
- **Everything the sea breaks on** goes through `addSurfSpots([{x, z, r, top}])` (rebuilds the `rockSurf` ring mesh when a
  batch lands): the wreck's stones (from their own loader), her bow's planking at the waterline (both sides of her forward
  half + the stem, after the sea punch), the dock's piles (measured off `Object_43`'s posts below y −0.1: rows at
  z −213.26 / −216.65, x −3.56 … 3.8, and down the side at x 3.8). Rings are cut inside her hull by `bwInShip` (the
  same `uShipHW` punch). The wreck's stones are merged, so `rockWash(mat, true)` reads each stone's origin from an
  `aRkO` vertex attribute (stone geos cloned before the bake) — the mesh origin would strike them all with one wave.
- **SPRAY** (`spawnSpray`, `sprayPts`, 240 pooled points, one draw): torn noise puffs speckled with drops, rising, swelling,
  drifting landward; lit by the moon BEHIND them (you walk toward it), which is why the old solid-shaded puffs read as dark
  shards. The drops are 0.04 (was 0.055: a pale blue lump at a rock).
- Probe: `rockWash&wz=Z&cam=x,y,dz,lx,ly,ldz` (any stone, camera z = Z + dz; logs the most spray at once). Water views:
  the shoreline at z −22 is x 5.66 at t 33 and 2.54 at t 36 (high water about t 33, drawing back after) — aim the camera
  2–3 m landward of it, or the shot shows only sand. Shore view measured 4.0 ms a frame headless 793 x 446.

## 2026-11-21 — black between the BEACH WALK page and the waves
The owner: "i keep seeing the game after the sketch of beachwalk i need it to be black then the waves i see the hotbar too".
The push into the ink ends the call on black (`TB.post` fade 0) and `icFinish(false)` → `runIntro(early)` hid the call's
cover (`#overlay.hidden`, `leaveTitle`) on that frame, while `#intro`'s black only began its 1.5 s CSS fade up from 0:
the beach and the hotbar (z 6, under `#intro`'s 20) showed through it. (The Enter-skip path was always right: its cover
waits out `INTRO_CUE.black` before it goes.) Now the early branch puts `#intro.show` on with `transition: none` first.
Measured, `tools/callblack.js` (the call in real time from START, every frame from 72 s until the waves are on: the cover,
the intro's computed opacity): played out, the intro black 1.00 from the frame the call ends, 0 frames with the world
showing, the waves at +4.9 s; `&skip=1` (Enter at 30 s), 0 frames as before.

## 2026-11-21 — the shovel's glow on the sandcastle; a float thrown at a crab breaks
- "THE ITEM GLOW IS ODD HERE ON THE TIP OF THE CASTLE": `addItemShine(shovelWorld, …)` hung its glint 0.5 m up the shaft — over
  the keep's tower with the shovel's lean — showed a second sprite THROUGH the castle (`through`), and lifted the red toy's own
  surfaces ×2.6 of a blue-white (pink). Now height 0.26 (on the shaft just out of the sand), size 1.2, no `through`, `lift` 0.3.
- "THROWING A GLASS FLOAT AT A CRAB SHOULD BREAK AND KILL IT": `PhysProp`'s crab/mutant hit (incoming > 5) took 70 % of the body's
  speed and it fell to the sand under the breaking speed — it bounced on, hit again (2 hp), and lay whole. The thing's own
  `onImpact` now runs at the speed it hit with BEFORE the slow-down; if that broke it (`this.dead`) the crab takes `CRAB_HP`.
  A landing-sound `onImpact` (keys, rings, the horn) breaks nothing and is 1 as before. `tools/floatcrab.js`: hp 2 → 0, broken.

## 2026-11-21 — the call on a narrow screen: nothing cut, nothing resized
The owner, a 3:2 window: "the syringe on a smaller screen is cut off i need the cutscene to look the same on all screens but still
be full screen the objects shouldnt be changing size either". Covering a screen narrower than 16:9 cut the picture's SIDES —
where the syringe and the phone are. `tbSize` now gives a narrow screen the whole width, the view drawn TALLER than the screen
(2·SH − SW/(16:9)) and pinned to the top: its 16:9 frame (centred in the view, `icClipFrame`; the desk camera widened keeping
the 16:9 width, `icDeskFov`) ends exactly at the screen's foot; the rest is room above the desk. The render is sized so the
FRAME is `TB.H` tall (his clips are in those pixels: with the view at `TB.H` they grew the narrower the screen).
- **Two old bugs found doing it**: `Object.assign(TB.el.style, {…, inset: 'auto'})` with `inset` LAST put `top`/`left` back to
  auto — the view was placed by the overlay's centring all along (the wide case's "three quarters off the top" was a half).
  `inset` first now. And `#overlay { overflow: clip }` (hidden lets focus scroll it).
- `tools/callfit.js` (PB_Q='&title=1'): 16:9, 3:2, 4:3, 21:9 at one width — the desk the same size in each, nothing cut.

## 2026-11-21 (later): the entrance rock's colliders; the puppet put down in the house; Elvédor's last line

- **"i keep getting stuck right here"** (10.53, -734.66, the entrance rock's beach side): `rockShellColliders` marked every
  2 m cell of each face's xz BOX — solid up to 1.5 m out from the drawn stone, a wall across the strip between it and the sea.
  Now 0.5 m cells, a face marks only where its surface is at a body's height (`ROCK_BAND` −0.3..2.1, points over the face a
  quarter cell apart), and what the outline closes in is filled by a flood from outside (the mouth shut for the flood, left
  open after). `tools/rockstuck.js`: walks 24 ways from the spot through `pushOutOfSolids`, an ascii map, a still with the
  colliders drawn. Forward-left along the rock's foot now goes the full 3 m (the old boxes stood at x 9 there).
- **The puppet dropped upstairs vanished**: `dropPoint` cast only at the beach (sand, rocks) and clamped x to
  `WADE_X`..`CLIFF_BLOCK_X` — the house is past the cliff, so he was put down on the beach. `dropTargets` has his house and
  land when `elvLand`, no clamp there, and `groundUnder` asks `elvLandFloorAt` (every storey). "G to drop" flashes on the
  pickup. `tools/pupfloor.js`.
- The bed's copy: `elvPlaceBed` updates the house's matrices before its rays (a house never drawn has them stale); a restore
  shows the bed's copy again (a pickup hid it and nothing re-showed it) and takes up one put down.
- Elvédor's light-bill line is cut: "YES! THATS AWESOME!" ends it (`end` 2600).
- **The well's rope** (`tools/wellrope.js`, close stills from either side and the parts measured in the model's own frame): the
  axle is at y 0.290, z 0, r 0.037; the coil round it out to ~0.063. The load cut the authored rope at the drum's middle
  height, so the coil's lower half went and an arch floated over the axle ("the rope wrap around cut off"); now what is kept is
  within `WELL_COIL_R` 0.068 of the axle. Our rope came out of the drum's MIDDLE (z −0.02); it leaves its side now
  (`WELL_ROPE_Z` −0.052, where the authored one hung) and runs onto the handle's top (x −0.092, z −0.036, measured) — a slant
  while wound up, plumb once paid out (`wellSetBucket`, `wellBucketDown`).

## 2026-11-21 (night): the call on a very wide screen, its at-ear trims

- "now the phone is off the screen on the intro cutscene ... when its on the table" (a 2.39:1 window): the 16:9 picture covers a
  wide screen's width and loses height; 72 % of the loss came off the TOP, where the phone lies (132 of 184 px at 1280×536).
  `IC_WIDE_TOP` 0.12 now — the spare comes off the bottom (the pens' far ends); the phone on the desk and in his hand is whole
  at 12 s and 27 s (`tools/callfit.js &sizes=1280x536&at=`).
- "improve how its picked up too with better trims": the at-ear frames (56–99) re-cut (`tools/intro_ear_recut.py`, from
  `~/Desktop/BEACHWALK ASSETS/IMG_7209.MOV`, ffmpeg 12 fps to v2/ 540 wide and v2h/ full): a finger touching the glass joined
  to it, the outline smoothed at full size, loose bits under a fingertip's size dropped. The shipped sheets before it are in
  the session's scratchpad `intro_bak/`. Still what the clip shows: fingers over a dark slab a hand's width from the lens.
  `tools/callpick.js` (the right third of the picture each half second through the pickup).

## 2026-11-21 (night): the cellar under Elvédor's house (`CEL_*`, `tools/kelley_pack.py`, `tools/cellar.js`)
The owner: an outdoor cellar door behind the house leading into pixelbutterfly's "813 Kelley Road" basement, spawning
where his first screenshot stood (the top of the cellar stairs, looking down them); the body's table, the creature, the
trash bags and "the wood pillars in the way" out; concrete steps; the kitchen door to the left of the spawn shut; looking
back, as if you had just come through the cellar door; dark; the puppet lying on the workbench, painted as someone else.
- **The file.** 13.7k tris, `KHR_materials_unlit`, its own 32–256 px maps (already retro). The stairs run down −x (tread
  100 units, rise 80, top at y 0, cellar floor −900); the stairwell is x −370..1200, z −1110..−540, its landing x 730..1200
  at the ground floor; the cellar is two halves split at x −690 (the laundry side −x, with the posts; the shelves, the
  body's table and the workbench +x). The posts are islands of `Cube.229` (joists and posts in one mesh); the body is
  `Plane.007` (sheet) over `clock.001` (the table); the creature is `Object_273`, the file's one skinned mesh.
- **The packer** keeps y < −40 OR the stairwell box, CLIPPING triangles across either edge (the landing floor and the
  stairwell walls are big triangles of meshes that run on across the house — centroid tests lose them). It drops the
  landing's end wall (x 1200) so the bulkhead can be built there. Doors: `turn_leaf` turns a leaf about its hinge until its
  free end points −x — the kitchen door (`Cube.211`) lands shut in the wall's line, the blue door at the stairs' foot
  (`Cube.217`) lands flat against the laundry side's wall. The blue one HAD to move: half-open (55°) it narrowed its
  doorway so the walk got you in by sliding and caught you coming back.
- **SCALE IS THE DOORS'.** 0.003 m/unit (ceiling 2.4) looked right and was wrong: the header over the stairs' foot was 1.62
  over the tread under it and the walk's head probe (feet + 1.68) refused the flight — stuck halfway down. 0.0034 makes
  a door 2.1 m, the workbench 0.82, the ceiling 2.72, joists 2.38, a step 0.27 × 0.34, the landing 3.06.
- **A PACKER PIPED INTO `head` NEVER WRITES ITS FILE.** `kelley_pack.py … 2>&1 | head -4` closed the pipe; the next log
  line raised BrokenPipe and the .glb was the previous one. The blue door "did not turn" for a whole round because of it.
- **The room** is the dungeon's pattern (`CEL_SITE` on the keep walk; `updateCellar` / `celClampPlayer` /
  `updateCellarCut`; `ROOM_BACK.cel`, `saveRoom` 'cel', hall-hide key 13, `inRoom`, `indoors`, `dropTargets`,
  `activeHitSites`, `bunkerFloorAt`, the beach clamp, both footstep lists (`sfxStepBunker`: concrete), `frozen`,
  `devShopBusy`, `cutNow`, both `clearRoomFlags`). `CEL_X/Y/Z` 19000/650/19000. **`celLive`**: the loop runs frames
  before the module reaches the house's constants — `updateCellar` read `HOUSE_Z` in its TDZ and threw every boot frame
  until the guard (set at the end of the section).
- **The bulkhead** (`buildCelBulkhead`): three steps of the stairs' material up from the landing's end, the stairwell's
  walls carried on, and the same cellar-door model overhead (its floor and back dropped, `celDoorPart`), high at the house
  and down to the far end; a thin moonlit line along the seam between the two leaves and at the low edge — without it the
  slope read as a ceiling. The step boxes are `CEL_SITE.extra` floors; `CEL_XMAX` lets you onto the first step only (the
  doors are over your head past it). "Leave" on the doors.
- **Outside** the doors stand against the back wall's brick at x 39.68 (`tools/celhouse.js`: rays in from the yard), centre
  z on the house, 1.6 wide, 0.9 high, 1.3 out; `celOutBlocks` in the lot's `legal` makes them solid. Their paint is dark
  grey: colour ×1.7 and an emissive off the map, or under the moon they were a black wedge.
- **The dark** took two rounds: lamps at 0.55–2.6 left every frame but the tube's black (the maps are dark and nothing
  else lifts them). Now the tube 9 (failing: a stutter of 0.1–0.6 s every 2.5–8.5 s), the workbench bulb 4, the
  bulkhead's moon 3.8, a bulb at the stairs' foot 2.6, `CEL_GLOW` 0.4 of each map as emissive, fog 0.1.
- **The other puppet** (`loadCelPuppet`, `CEL_PUP_PAINT` by material name): bone-white wood, black hair, oxblood nose,
  bottle-green sleeves and shoulders, a mustard shirt, oxblood trousers; on his back along the bench (`pupLieQ`), head to
  −x, clear of the cans at its +x end. No interaction yet — the owner will say.
- Measured (`tools/cellar.js`): doors refuse a walk at x 41.20; in → top step; down, through the blue door, the laundry
  side, across to the bench, back, up, onto the first bulkhead step (x 4.25), out → the yard at x 41.83. A checkpoint in
  it (`tools/cellarload.js`) loads back onto the landing with the puppet there. Musictest 17/17.
- **His pose, round 2** (the owner: "make the puppet lay more natural his arms are too tucked make him seem like a laying
  object"): arms fallen out from his sides onto the wood, the legs open with one knee crooked, the head rolled toward the
  room, the chin a little down, the whole of him tipped 0.14 rad onto one side. Three things measured on the way
  (`lieDbg` on his root, `tools/cellar.js` stills `in_pup*`): **the rig's `L` bones lie at −z of his own frame** (the
  `pupAim` comment's "+z his left" does not hold for this rig's arms) — aimed +z the arms crossed his chest and the hands
  lay folded on his belly; **a hand below his back held all of him off the bench** (seated by the whole box), so the limbs
  are aimed level and he is seated by the box of his shirt, trousers and hair; **a hand bent at the wrist cannot lie flat
  by a roll alone** — each hand is searched over a roll about the forearm AND a bend about the level line across it for
  the pose where it stands least tall (the far hand had stood up off the wood like a wave).

## 2026-11-21 (night, later): the one in the cellar's washer (`celWash`, `tools/marionette_rig.py`, `tools/washer.js`)
The owner: a puppet "locked in the washer" — near the workbench's puppet the washer "start[s] being loud and jump[s] around
like hes trying to get out"; hit the lock off; he "jumps out looks at you then runs up the stairs and leaves"; "rig the model
properly"; then "have the washer puppet look retro i dont want it to seem like a ai model" and "make sure the puppets run
animation isnt sideways".
- **The washer** is the RIGHT machine of `Cube.209` (x > −1740 in the file), chained with `chain.009/010` and padlocked
  (`Cylinder.009`). `kelley_pack.py` keys triangles by (material, part) and writes `washer_laundry`, `washerDoor_laundry`
  (the raised panel, x −1700..−1430, y −848..−676, z ≥ −810), `washerLock_accessories`, `washerChains_accessories`; their
  loose pieces stay out of the walk. **THE FRONT HAS THE DOOR PAINTED ON IT**: with the raised door down the hole still
  looked shut, so the body's front face (z −810) is clipped round the opening; a BackSide box behind it is the drum.
- In game (`buildCelWasher`): one group stood at the machine's middle (`CEL_WASH`) that hops (≤ 7.5 cm, only off the floor —
  a blow in the air relaunched it to 25 cm and it read as a toy) and rocks; the door on a pivot at its bottom edge, straining
  a few degrees at the chains; the lock and the chains RE-CENTRED on themselves (the packer bakes every vertex in room
  space, so a mesh's origin is the room's: spun as it was, the padlock orbited the washer).
- `celWash` 0 → 1 within 1.9 m of the bench puppet (fits of 1–5 blows: `metalHeavy`/`metalHit`/`danteChain` at the machine
  and a synthesized drum boom, `sfxWasherThump`, through `sfxOut`), → 2 once he is out (saved; a load lays the lock and
  chains on the floor and the door down and never loads him). The lock: `celLockStrike` in `digImpactCore`'s list (after
  `ucIdolStrike`; it reads `_aimD`, which the swing sets — a probe must set it, `celLockStrikeS`), and the hook flying into
  it; "A padlock" when pulled at only rattles ("It won't give. Hit it off.").
- **The escape** (`updateCelEscape`): snap (lock flies and bounces twice, chains drop and settle flat) → kick (0.55 s:
  the door slammed open from inside, falls under its weight and bounces on its hinge) → leap (the Wong's `jump` from 0.42 s,
  its crouch, at 1.15×: carried out of the drum across its own airborne window 0.72–1.32 s, from low in the drum so he comes
  out of the opening) → stare (`idle`, the body turned onto you at 2.6 rad/s and the head aimed at the camera, `celMarLook`)
  → run (`run` ×1.12 along `CEL_MAR_PATH`: round the blue door, up the flight, onto the bulkhead's step; the floor off the
  walk grid; a knock per stride) → the cellar doors bang (`doorClose` + `metalHeavy`) and he is gone. Measured: lock to gone
  6.2 s.
- **The rig** (`tools/marionette_rig.py`, Blender 5.2 background): the Tripo export is ONE fused shell (943 k verts welded);
  joints read off `kelleyshot.html?mode=ortho` (front and side, a 5 cm grid) in three's frame; Mixamo's chain named
  `Character1_*` so `ntarRetarget` maps it with no table (`kind: { facingRef: 'mixamo' }`). Weights by RULE, not bone heat:
  the trunk cut by height (head / neck dowel / chest block / spine dowel / pelvis block), each limb to its nearest bone of
  that limb with a 4 mm blend — wood, not rubber. Strings cut three ways: vertices further from their bone than that piece
  is thick (RAD per bone, and the trunk's measured half-widths), hair-thin slivers after the collapse (> 3 cm long, < 3 mm
  across, below the head), and crumbs under 60 verts. **Retro**: collapse to 6 k (3.9 k left), flat-shaded in game, the map
  256 px cut to 24 colours (`marionette_retro.py`, median cut, no dither) and nearest-filtered. 251 KB on disk.
- **THE RUN WAS SIDEWAYS** without `facingRef 'mixamo'`: the Wong's run travels (−2.95, 1.33) in its own frame — 66° off
  his facing. With it the run's travel is +z, and `M.runYaw` (the retargeted clip's own travel angle) turns him down the
  path whatever is left. Measured, `tools/washer.js`: shoulders' facing vs travel 14.7° mean (the run's own sway), 42° max at
  the corners. `skinLocal` on his mesh (19 km out).

## 2026-11-21 (latest): the puppet workshop — eight of Elvédor's puppet, a fight, then the washer (`MUT_KINDS.cpup`, `tools/pupfight.js`)
The owner: seven more of Elvédor's puppet in other colours, "strung up on the walls and hangin from the ceiling all different
unique poses … a puppet workshop"; inject the one on the workbench with a jar of blue blood, the syringe visibly in him, "his
eyes light up blue and he jumps up to fight"; easy to kill, ragdolls flying across the room, "it should feel like hitting
puppets"; the first one killed brings the rest down from where they hang, all at you, chaotic; the washer after.
- **A creature kind**, `cpup` = Elvédor's (`MUT_KINDS.elvedor`: FARM_BASE + the brawler, his mocap set) with the puppet file.
  `CP_RAG`: the puppet has no shoulders and its arms hang off `Bone001` (its whole back), so the back is Mixamo's `Spine2`,
  `Bone002` the neck, `Bone003` the head; no Spine/Spine1/toes. **The file faces +x**: `cpPre` moves the scene's children
  under a group turned −90° (the model's own yaw is the aim's, zeroed every frame). Paint per unit through `matMore`
  (`cpMat`, `CP_PAINTS[u.cpPal]` by material name — every copy is its own parse, so its own materials). Clips built ONCE
  (`cpMocap`, like `ELV_MOCAP_SET`) plus the Wong's `jump` (`mJumpUp`).
- **The ragdoll's links**: `RAG_CHAIN` ties each joint to its listed parent, and a rig missing that parent left the joint
  loose — the puppet's arms and back would have fallen off the body. Now a missing parent falls back up the chain
  (`RAG_PARENT_OF`) to the nearest joint that is built (no change on a rig that has them all).
- **Wood** (`kind.wood`, `voice.wood`): every blood path that skipped stone skips wood (`(kind.stone || kind.wood)`, 11
  lines; the hook's pull is left alone so a hook still drags one); `sfxMutHit` a knock + a little `tableBreak`, `sfxMutDie`
  wood going to pieces.
- **The room**: `celBody` — drawn only while the cellar is, the cellar's walk for a floor, `celClampUnit` (wall push, the
  cellar's x range, and a move that crosses a wall at knee or chest height from the last legal spot is put back: a punch's
  lunge carried the first one through the stairwell wall onto the landing behind it), `CEL_SITE` in `mutRagdoll` so a body
  thrown at a wall stops at it. The blows count from the shins up (`bodyLow` 1.55, `bodyLowArm` 1.35: 0.9 m tall, and the
  man's from-your-chest-up rule let none land).
- **Hung** (`CP_HANG`, `CP_POSES`): asleep, `holdAnim`, posed once with `pupAim` in the turned group's frame (+x his front,
  −z his left — the `pupAim` comment's "+z left" is wrong for this rig); strings are thin cylinders from the head/hands/shins
  (by pose) to the ceiling or a nail, a control bar over the ceiling ones; the ceiling ones turn a little on their strings.
- **The injection** (`cpInject`/`cpInjectTick`): "Inject him with blue blood" (syringe + a jar; else a hint) — a jar spent, a
  `makeSyringe` (the title's blue-glowing fill) driven into his chest along a slant from the room's side, the fill pushed
  out, his eyes blue (`cpEyes`: whites and pupils emissive, not tone-mapped) with a small blue light at his head, a twitch,
  then the static bench puppet is hidden and his fighter comes off the bench on the jump (`cpBenchJump`) and lands toward you.
- **The rest**: `celPupFight` 0 → 1 (injected) → 2 when the first dies (or any is struck): each hung one twitches, its strings
  go slack, it falls under gravity (`cpFallStep`), lands with a knock and comes → 3 all dead; 3 s later the washer
  (`celWash` 1). Saved: 3 only; a load mid-fight is the fight not begun. They spawn when the cellar is built (their eight
  parses out in the yard), not on the frame you walk in.

- **What it took to make them fight** (`tools/pupfight.js`, all measured): (1) `fixScale: PUP_K` — the file's own scale node
  made `skinnedBounds` read him a millimetre tall: scaled 920×, every bone NaN, punches thrown backwards; (2) `mutSeparate`
  skips the hung/falling/held ones — at the man's 3 m spacing the seven on their strings held the first one off, walking
  backwards from you; `sep` 0.75; (3) `celClampUnit` re-run after every unit's update and after the separation push (a punch's
  lunge carried one through the stairwell wall); (4) **IN DEV MODE NOTHING EVER STARTS A SWING** (`!settings.devMode` in the
  decision) — a probe must turn it off and keep your health up itself; (5) their blows are scored by `landFn` (within 1.25 m,
  facing you, height ok) with the arm still aimed (`aimArm`): the man's aimed test asks his fist to pass through your body and a
  0.9 m puppet's never reaches; (6) a probe that teleports the camera every frame leaves the walk reading your feet off the
  ceiling's storey (2.72: the cellar's ceiling plane counts as a floor in the storeyed grid — unreachable in play) and every blow
  is "too high": place once, then only turn (`setCelLast`). Then: 10/10 of the first one's blows land; seven on you landed 20
  in 3 s, so `hitK` 0.12, `aggr` 1.8, `press` 0.7. A kill (`onDeath: cpDie`) is the ragdoll thrown along the blow (2.3 m),
  dust, no blood, no gore (`bloodK`/`goreK` 0 too).
- **The syringe**: a `makeSyringe` at 0.27 m, its glass frosted, the fill glowing. Two traps: giving a MeshBasicMaterial an
  `emissive` throws in three's `refreshUniformsCommon` on EVERY frame (it has no such uniform), and changing the fill's
  `toneMapped` recompiles it off an `onBeforeCompile` whose uniforms a clone does not carry.

## 2026-11-21 (later) — the workshop's puppets made physical; the marionette on the swing and at your side

The owner: hung puppets with real string physics you can shove, two upside down, personalities/proportions/colours, crazier
and harder fighters that fly when smacked, breaking into pieces, no Dante sounds, darker cellar, the washer starting on its
own; then "after the one in the washer runs away … hes on the swing out front facing you … the screen [like] skrim … 'You
okay?' or 'What are you?' … hop off the swing and follow you like myles … break into peices" and "the washer one should
always run to the swing if let out".
- **HUNG = A PENDULUM** (`cpHang`, `cpSwingStep`, `cpSwingApply`): the whole unit, its bar and its strings rotate rigidly
  about the hook (`S.piv`, ceiling y 2.6) or the wall nail; state is the bob's horizontal offset per metre `S.s`/`S.v`
  (small-angle), twist `S.tw` for ceiling ones; a wall one is kept off the wall (`S.n`, reflect at 1.35 with a knock).
  Loose limbs (not in a strung chain, `CP_CHAIN`) lag on springs driven by the bob's acceleration/9.8, applied as a world
  turn premultiplied into the bone's local (`P⁻¹·D·P·q0`). Shove: your capsule against his middle (`S.C0` turned), pen
  resolved into `s`, his speed raised to 1.15× yours along the normal. Measured: walking through the Host moved him 1.33 m.
- **A BLOW ON A HUNG ONE** never hurts it: `kind.struckHung` in `hurtMutantCore` (before `hbT`) and `cpHungStrike` in
  `digImpactCore`'s list (the fight's own test looks at `u.g` + h, and one hung by the ankles has his body BELOW his origin).
  Before the injection it swings; after, it drops them all.
- **FLIPPED** (`flip`): `q0 = yaw · rot(z, π)` (z is his front after `cpPre`); `y` is then his soles at the TOP. Drop:
  `cpFallStep` falls his middle ballistically and slerps to upright over 0.42 s, standing on the floor if it gets there first.
- **BUILDS** (`cpBuild`): bone scales (head, chest, upper arm, thigh — each scales its subtree) and `cpInner.scale`; the soles
  put back on the origin by the foot bones' drop measured before/after. The retargeted clips have no scale tracks.
- **CULLING TRAP FOR STILLS**: `cullUnitModels` hides `u.model` against the LAST frame's camera — a probe that moves the camera
  and shoots must set every `model.visible = true` first (the Clown came out "missing").
- **THE FIGHT** (`cpDrive`, from the `celBody` block): pounce (`cpLeap`: the Wong's jump 0.42→0.75 crouch, arc 0.55 + d·0.12
  m, a third flip about the middle — `u.model` turned and offset by hc), skitter (`cpDash`, the strafe at 2.4×), and every
  non-fatal blow throws it (`kind.onStruck` → `cpStruck` → `cpAir`: centre-based ballistic, tumble about the side axis,
  walls via `keepHitsWall` x/z split reflect ×0.5 — over 5.5 m/s costs a point and can kill — into others (they fly too),
  floor bounces, lies 0.55 s, yanked upright with a hop). `celClampUnit` skips `cpAir`/`cpLeap` (its floor test refused a
  body in the air and teleported it home); the flight keeps `celHome` current itself. hp 3, hitK 0.17.
- **BREAKING** (`cpShatter`): each mesh to the first bone of its line in `CP_PIECES`; each piece a group whose +x lies along
  its bone (so the gibs' "rest FLAT" lays it along the floor), `half` measured in the group's frame, `cpGibConfine` (walls
  and the cellar ceiling), `onLand` knocks; splinters + pegs (`cpSplinters`). The blue burst borrows the injection's light
  (`cpBurst`) — never add a light. Measured: 11 pieces + 14 splinters (splinters sleep into the rubble).
- **SOUNDS** (no Dante): `sfxCpSnap` (string), `sfxCpCrack` (break), `sfxCpKnock` (churchStep sample + wood), `sfxCelChain`
  (the owner's metalHit, many small fast clicks) — the washer's chains use it too now.
- **DARKER**: tube 6.2, bench 3.0, moon 2.6, stairs 1.5, washer 1.25; `CEL_GLOW` 0.26; fog 0.15. `celAmbience`: dust
  (points lit by distance to the tube, flickering with it), creaks of the hung strings, drips, the house settling.
- **THE WASHER** starts 2.2 s after the last puppet (`celWashKnown`: a prompt), fits of 4, hops to 11 cm and walks
  (`W.dx/dz/dyaw`, small — the lock's hit test uses its build-time centre).
- **THE MARIONETTE** (`MAR`, declared by the cellar's early lets — a restore can run before its section): 'none' → 'swing'
  (set when the escape ends, and on any load with `celWash` 2 — the save already writes 2 once the lock is broken) → 'hop' →
  'with' → 'dead'; saved as `marSt`. `MUT_KINDS.cmar` from `marionette.glb` (`fixScale` 1, Mixamo names → `MAR_J`, identity
  `MAR_RAG`, Elvédor's capture + the Wong's jump via `ntarRetarget`, `facingRef 'mixamo'`), hp 18, dmg 2. On your side by
  `u.cpAlly` in `minoAlly`. `kind.drive` = `marDrive` (true holds the fight; returns false while `st.struck` so
  `finishMutant` runs — it did not, and he never died).
- **ON THE SWING**: posed from `updateElvDressing` right after the seat's rotation (no frame lag): from the bind each frame,
  `marAimW` chain (lean back on the forward swing, legs out; tucked on the back swing), hands by a two-bone reach to the rope
  0.47 m over the seat, the hips set onto the seat, head on you (`marLook`). `elvSwing.amp` eases to 0.46 rad with a rider.
  Facing (±x of the seat group) is chosen while you are > 24 m off. Skrim's walk-up: `marMood` (bars, a drone of its own).
- **ENEMIES ON HIM**: a man's aimed test never touched a 1 m body (340 frames, 0 hits): `marOn`/`marLandsOn` in the fight's
  land test (both lines). Measured after: one of Elvédor's kind took him 18 → 14 while he killed it (14 → 0).
- **HIS DEATH** (`marShatter`): the skinned mesh baked per triangle by its first vertex's heaviest bone (`MAR_PIECE`) into
  meshes attached to holders under the bones, then `cpShatter` (confine null, `restAt` the land/beach floor). 25 gibs.
- Probes: `tools/pupfight.js`, `tools/pupcast.js` (the seven's portraits), `tools/marswing.js`.
- **HANGING WEIGHT** (the owner: "give them hanging weight … natural like tension on the strings … swinging physics when you
  walk by"): `cpSettle` in `cpHang`, before the strings are tied — each limb no string holds (`CP_CHAIN`) turned most of the
  way to straight down (roots 0.62–0.7, lower halves 0.8; the drawn line kept a little), a strung one a little toward its
  string (0.25; 0.12 on a nail), a head no string holds lolled 0.35 down. Uses `marAimW` (world-direction aim; defined in the
  marionette's section — runtime only). The loose springs: drive ×1.5, damping 2.6 → 1.7. Walking past within 1.3 m stirs
  them (your velocity as a draught), besides the shove. hitK 0.17 → 0.22 (19 landed blows in 3 s were all banked away).
- **THE MARIONETTE AND ELVÉDOR** (`marElv`): with you, Elvédor within 14 m, a clear line (`elvLineClear`) — `MAR.elvOn`: he is
  provoked (`kind.provoke`), his foe the marionette, and `marPickFoe` holds the marionette on him till one is down. If the
  man dies with `st.hitBy` the marionette and the puppet is yours (`elvCarrying || elvDropped`) → `MAR.pupAsk`: "Talk to him"
  opens `MAR_NPC.script.pup` ("What should I do with the puppet?" → "Throw it in the fire", `end: false`, a click closes it).
  Measured (`tools/marelv.js`): he went for him at 4.7 s; the man died to him; the marionette came out of it at 4 of 18.
  Probe trap: the harness clock (`__adv`) never lets a model load land — wait with `b.frame` + `sleep` first.
- **THE SEA FROM ELVÉDOR'S LAND** (`elvSeaK`, `elvSeaLP`, in `updateBeachBed` on the wave bus only — the forest bed is
  untouched): `ELV_DUNE` 0.7 × falloff past 12 m from the waterline (/9 m) × `ELV_HOUSE_WALLS` 0.4 inside (`houseInside`);
  lowpass 9 kHz falling with distance (min 1.2 kHz), 700 Hz inside. Measured: gully mouth 0.68, the lot 0.26, the house 0.08.
- **THE DRINK, AGAIN** (the owner: "make this the water drinking sound last time you didnt"): the first cut peaked at −25 dB
  (mean −49) — inaudible under the effects slider. "New Recording 6" trimmed to its sip and gulp (1.2–2.8 s), faded,
  normalised to −1 dB peak (mean −21): `assets/water-drink.m4a`, 14 KB. MEASURE A RECORDING'S LEVEL (`volumedetect`) before
  shipping it.

## 2026-11-22 — strings that are really tied, dimmer paint, the sad swing, companions through every door, the puppet's revenge

- **EVERY STRING WAS NOTHING LONG AT THE CELLAR'S ORIGIN** until today: `cpStringSet(m, a, b)` was handed the shared `_pzV2`
  as `a` and wrote `b − a` into `_pzV2` first (b − b = 0). Own scratch now (`_cpSD`). What looked like strings in earlier
  stills was the bars' cords. NEVER pass a function a scratch vector it also writes. Measured after: the Host's head string
  starts at its tie point to the millimetre, 1.04 m long.
- **TIED ON THE SURFACE** (`cpTiePoint`): the furthest vertex, toward the hook, of the meshes whose first bone ancestor is the
  tied bone — the crown, the fingertips, a heel — kept in the bone's frame (`S.att`). Strings are Lambert now (unlit, they
  glowed white).
- **PAINT IS LINEAR**: `color.setHex` converts sRGB → linear, so `CP_DIM` 0.55 was ~−5 dB as seen. 0.3 (≈ 0.58 as seen),
  12 % toward a grime grey, no emissive, roughness ≥ 0.85, rim 0.008; the bench puppet the same (`loadCelPuppet`).
- **HARDER / SPREAD**: hp 5; `sep` 1.25; `cpDrive` walks each toward its own eighth of a circle round you (by `cpPal`)
  while 1.3–7 m off. Measured: seven at −118…140° round the player (a wall behind him).
- **THE CELLAR DOOR** 2.6 × 1.4 × 2.15.
- **THE SWING IS A PENDULUM** (`updateElvDressing`): angle + speed under g on L + 0.25, damped 0.16, the wind pushed near
  its own period (empty: 0.1–0.25 rad as before), walking into the seat shoves it, a little twist on the ropes (`S.tw`,
  `S.yaw0`), the hop off kicks it back (0.37 rad after). With him on it a pump holds `MAR_SWING_AMP` 0.07 (measured 0.056).
- **HIM ON IT, SAD** (`marSwingStep`): facing whichever way along the swing is −x (the sea), slumped, a breath in it, head
  down toward a point 30 m out and 9 m down (onto you only during the talk, `MAR.lookK`), hands loose low on the ropes
  (`marReach` `low`), shins lagging the swing. TWO TRAPS: the seat's quaternion was read from `_mrQ` AFTER `marAimW` (which
  writes it) — he sat beside and under the plank; and `u.mixer.update(0)` at the end re-sampled the idle he was made with
  over the pose — he stood on the plank. The lift off the plank is measured every 1.5 s from the skin in the seat's frame,
  ONLY vertices bound mostly to hips/spine/up-legs (his shins hang inside the plank's footprint: counting them lifted him
  25 cm).
- **COMPANIONS "TELEPORTING CLOSER"**: Myles's and the marionette's stuck test was "closing on you slower than 0.3 m/s" —
  true whenever you simply out-walk them — and the rejoin put them at your shoulder the moment you looked away. Stuck is now
  the companion's OWN displacement < ¼ of its intended move, for 2.5 s; and lost (> 28–30 m) or stuck only.
- **THE MARIONETTE WALKS YOUR TRAIL** (`MAR.trail`, a point per 0.4 m with your feet's height): round the house, down the
  gully, through rooms; every cut is a jump in the trail and he joins behind you on a floor near your feet
  (`marFloorAt`: `bunkerFloorAt` in rooms, the courts in the castles); he goes everywhere but the deep. If he must be put
  somewhere it is 8–12 m back along your trail, out of sight (`marBackAlong`). Stops at 1.7 m, sets off past 2.8, runs and
  gains past 6. `marPost` keeps a fighting move on a room's floor. TRAP: an unwoken creature > 250 m off is never run
  (`updateMutantUnit`'s far skip) — and something on the land put him back to sleep, so in the cellar he was frozen 27 km
  away. He is kept awake while with you and the far skip passes `cpAlly`.
- **HIS HEALTH**: `MAR.hp` mirrors him each frame, saved as `marHp`, applied when he is remade; his bar (green) shows once
  he is hurt (`hbT` kept fresh; `updateEnemyBars` lets `cpAlly` through when hurt).
- **THE PUPPET WHEN ELVÉDOR DIES** (`epupWatch`, `MUT_KINDS.epup` made on first use — `cpup` is declared further down and
  read early it was undefined: "Cannot convert undefined or null to object" from `Object.keys(kind.use)`): yours (arms or
  dropped) and within 13 m with the land clear → `sfxPupScream`, out of your arms / up off the floor as a fighter in his
  own paint, at the marionette if his was the blow (`lastHitMine === false && st.hitBy`), else at you. `elvStage` 5 +
  `elvBurned` (gone for good). The "What should I do with the puppet?" line only if he did NOT come alive (`epupWatch`
  first in `marElv`: the marionette's frame can see the death before `updateMarionette` does). Measured: alive, on the
  marionette 3.3 s, landed 4, broken by him.
- **THE DROP** (`pupLayClear`): across your look, then turned ±¼/⅛, walked back toward you 15 cm at a time, until neither
  head nor feet crosses a wall from his middle (`pupDropWall`: the house's, the cellar's); on the highest floor under the
  three. `tools/pupdrop.js`: four walls of the ground floor, none crossed, 1 cm over the floor.
- **THE CELLAR'S SOUND**: the owner's "Basement Storage Room Lights, Creaking, Wind" cut 3:20–4:36 into a 72 s loop on its
  own equal-power crossfade (`assets/cellar-ambience.m4a`, 520 KB, −20.7 dB mean), `CEL_AMB_LEVEL` 0.45 on the effects bus
  (≈ 4 dB under the drain's bed), lowpassed 6.5 kHz; `celVerbGain` (a 1.3 s dark concrete IR) 0.34 on the effects bus while
  in; footsteps across the floor overhead (`sfxCelOverhead`) among the creaks and drips; the bench bulb turns a slow circle.
- Probes: `tools/marsad.js`, `tools/marroom.js`, `tools/marelv.js` (Elvédor, the puppet, the sea), `tools/pupdrop.js`.
- **THE BED PUPPET ON THE FLOOR** (the owner, twice): `elvPlaceBed` rayed down onto the mattress through `o.visible` meshes
  only — out of sight from outside the house, the bedroom's are switched off, the ray found the floor (4.91, house-local)
  and he sat on the boards in front of the bed. Every opaque mesh now. Measured after: the mattress (5.43) under him, his
  feet over its edge. `tools/pupbed.js`.
- **THE DROPPED PUPPET SHINES** faintly (`addItemShine` size 1.1, strength 1.1, lift 0.45), taken off on every way he leaves
  the floor (`dropShine` before each `scene.remove(elvDropped.I.root)`).
- **CELLAR COLLISIONS** (the owner: "the puppets cant clip through the walls or anything in the basement … their peices
  should react … the physics and colliders have to be good"): `cpWallHit` — the move extended by the body's reach, at its
  middle ±0.22, NEVER LOWER THAN A KNEE (the walk records its walls from about there up: low pieces slid under every wall),
  and, `strict` for what flies and breaks, a move must END over the cellar's floor (`cpInRoom`: the room's corners by the
  bulkhead have no wall in the grid, only no floor — pieces out at z 7–12). The room's two x ends bound pieces too. A piece
  born through a wall (a limb against it as he broke) is pulled in toward his middle. Hung ones swung into a wall or the
  shelves stop and come back (from their rest centre); falling ones too. Pieces are kicked by your feet and by bodies thrown
  across them (`cpPiecesTick`, `cpBodyStirs`), and a body flying past a hung one sets it swinging. `tools/pupfight.js` now
  throws all seven hard every way: 0 of ~715 airborne frames off the floor over three runs; pieces off the floor 0 / 0 / a
  corner pile 5 cm into a wall strip.
- **HEALTH** (the owner, twice): the workshop's puppets 7, Elvédor's puppet 6, the marionette 26.
- **THE MARIONETTE ON CRABS** (`marCrabFight`): the crabs (the pack, Skrim's, any) are not the fight's creatures; one awake
  within 12 m of you he goes for and hits with his own capture's blows (`hurtCrab`), `marKill` marking a crab his blow
  finished. Measured: a woken crab dead in 3.4 s.

## The Enemy Log (2026-11-22)
"add a section in the pack that says ENEMY LOG … models … idle stance … spin around and inspect … ??? for now. only enemies
you or your companion kill. do not give them a description either. characters i named with dialog can be named."
- `#invpanel h2` holds two `.pk-tab` buttons; `#invpanel.log` hides `.body`, `.rings`, `.tip` and shows `#elog`.
- `ELOG` (declared at the top of the module — a restore can run early): kinds → counts, order of first kill, `snap`
  (the likeness), `pend` (stand-ins). Saved as `enemyLog` [[kind, n]…]. Keys: `kindName` (the workshop's `cpup`, the
  revenge puppet `epup`…), `crab` for every crab. Names: `ELOG_NAMES` (Elvédor, Skrim, Myles, the Dealer), else "???".
- `elogKill` from `finishMutant` (before `onDeath` — the puppets shatter and the copy must be whole) and `killCrab`:
  yours (`lastHitMine !== false`) or a companion's (`st.hitBy` with `cpAlly` / `minoAlly`; a crab's `marKill`).
- `elogSnap`: `cryClone` (the skinned copy rebound to its own bones), each material cloned with any hit-flash undone, and its
  idle clip (`kind.anim.idle`, `idle`, `mHIdle`, `mIdle`, `kind.idles`, or any clip named idle). After a load:
  `elogEnsure` makes a stand-in of the kind 40 km off (asleep: the far skip keeps the fight off it), runs its `parLate`,
  takes the copy, retires it and takes it out of `mutants` (a crab out of `crabs`).
- `elogView`: its own renderer (as `pvBuild`), at `PV_RES`, pixelated; a turn group, auto-spin 0.35, drag with the fling,
  the wheel 0.45–1.6; fitted by `Box3.setFromObject(root, true)` (skinned, precise) after one mixer step; a shadow pool.
- **THE ENEMY LOG'S BOX**: sized from `getBoundingClientRect`, which is the paper's scaled rect — the canvas came out smaller
  than its box and sat in its corner. Its layout size (`clientWidth/Height`) and 100 %; fitted to the model's turning diagonal,
  the camera level with its middle. Measured: centres at 0.50/0.51 and 0.52/0.48 of the box. (`pvFrame` was already right.)
- **THE MARIONETTE, HARDER** ("he just stands there alot", "isnt attack enough", "make him jump like the other puppets
  sometimes"): his kind line had been cut in half by a `//` an earlier edit put in its middle — `limbR … press` were a comment
  and he ran on Elvédor's. Now aggr 3.2, press 1, speedK 1.9, lunge 1.35, chain 4; his `cool` held ≤ 0.12 and no circling
  (`step/side/back` 0) while he has a foe; on crabs 0.12–0.32 s between blows at 1.5×. `marLeapMaybe`/`marLeapStep`: the
  workshop's pounce at what he fights from 2–5.2 m, at most every 6–11 s and half the time; landing is 3 on a creature, a point
  on a crab. Measured: an Elvédor-kind dead in 8.6 s with him idle 13 % of it; a crab with the pounce forced: 3 pounces.
  CHECK AN EDITED LINE'S TAIL: a comment appended mid-line eats everything after it, silently.
- **EVERY CRAB THAT CIRCLED YOU BROKE THE FRAME** (since 2026-11-21): `mutFoePos` (the king's aim-ahead) read `u.kind.kingBody`
  and crabs call it from `flankDir` with no `kind` — "Cannot read properties of undefined (reading 'kingBody')" every frame,
  the rest of that frame's update cut off. `u.kind &&`. `bwFrameErr` now prints the first lines of the stack.
- **NOTHING OVER YOUR HEAD** (the owner: "i jumped out of the map at the church using the hook to fly up … i shouldnt clip
  through any wall ever"): `playerHeadClamp`, after `camBaseY += vy * dt` whenever rising — a ray from 0.45 m over your feet to
  0.24 over your eye (+0.05) against `dropTargets()`; a hit stops you under it (`vy` 0) and lets go of the hook's pull. NEEDS
  `raycaster.camera` (the church's candle flames are sprites: without it the ray threw). `tools/hookchurch.js &direct=1`:
  hauled straight up at a point past the vault, at the rock over the entry and under the nave's dome — the head stops 0.13 and
  0.10 under it, still in the church.

## 2026-11-22 (later) — the gargoyles' break, the puppet in the game's grain, an eerier cellar, vicious puppets; the merge
- **THE MERGE** (the owner: "pull and merge first"): origin/main had three commits (the sea's foam, echo steps by floor
  `placeStep`, the sewer door). The uncommitted work was backed up, stashed, main fast-forwarded to e3b27d8, the stash popped.
  Seven conflicts in `main.js`: upstream's `sfxStepDrain` and `placeStep` kept (the cellar added to `placeStep`: the bunker's
  step); upstream's two-way `pipeHandPlace` kept with ours' `HG_SINK` on a pickup's grip; upstream's screwdriver depth (0.2)
  kept with ours' scale-by-nearness; the harness list both. The notes' two: both. The stash is kept (`git stash list`).
- **THE GARGOYLES' BREAK** (`sfxPupBreak`): a random `stoneBreak` recording, whole, at 1.08–1.22×, lowpassed and quieter with
  distance, panned; under it the wood crack at 0.45. For every puppet's death and the Marionette's.
- **IN THE GAME'S GRAIN** (`pupRetro`): every copy of the puppet flat-shaded, paint stepped to 9 levels a channel as seen
  (`PUP_STEPS`, through sRGB); the source in `loadElvPuppet` (the bed, the arms, the bench — clones carry it), the workshop's
  parse in `cpPre`/`cpMat` (after the paint and the dim), the revenge puppet's `matMore`.
- **EERIER** (`celAudioTick`): a bed under the recording (43.6 / 44.3 Hz triangles beating, 65.4, lowpassed 320 Hz, a 1864 Hz
  whine swelling on a 22 s LFO) at `CEL_EERIE` 0.07; a whisper (the shell's recordings, 0.82–0.94×, band-passed 280–1700 Hz)
  from one of the room's corners every 35–75 s. THE CLOWN WATCHES YOU (`cpWatch`): his loose head turns to follow you at
  0.55 rad/s, up to 1.15 rad, only while your look is more than ~37° off him; look at him and it stops where it is.
- **VICIOUS** ("jump on you way more and be faster and scarier they just walk regular"): the run is their only gait (`gaits`
  walk → `mHRun`), speedK 2.5, runMax 5.6, aggr 3, lunge 1.4, hitK 0.4; a decision every 0.35–1.1 s: a pounce from 1.5–6.5 m
  80 % (aimed where you will be, `velocity` × the flight), from beside you 50 % (a hop up and onto you, arc ≥ 0.9 m), no more
  than three in the air; the dart sideways AND in. THE TOKEN HELD THEM BACK: the beach gives one creature at a time the right
  to swing at you (`mutToken`), and the pack's out-of-turn rule (`demonFrenzyOK`) needs the pack's roles — six of seven circled.
  `kind.swarm` (`cpSwarmOK`, in the swing decision's `maySwing`): up to three swinging at once, each a fifth of a second after the
  last committed. `CPD` counts `cpDrive`'s gates for the probe. Measured, the seven on you for 3 s: 3 pounces, swinging
  768 frames of the fight; 0 airborne frames off the floor.
- **THE OWNER'S "do 1 2 6 7"** (from my list of what would make the scene):
  1. `celBlackout(s)`: every lamp but the moon (`lamp(...).moon`) at 0 through `celDarkK`, the tube back on a stutter. 2.6 s
     from `cpAllDown` (the six drop in it and are on their feet as it returns — measured: tube 0 through the drop, 5.98 and all
     seven standing at 2.5 s), 0.5 s as the first comes up off the bench. Their eyes are the only light in it.
  2. `cpTwitchTick`: before the fight, every 6–15 s one hung puppet jerks on its strings (the swing, the twist, a loose limb
     kicked) with `sfxCpClicks` (the church step at 2.3–3.1×, a few, from where he hangs). Measured: two in 20 s. And
     `sfxCelOverhead(true, 0.5)` with the drop: something small running the room's length over you (11–15 steps 0.15 s apart).
  6. `celHush`: from his eyes lighting (t 1.3) to his landing off the bench, the recording and the drone taken out in a tenth of
     a second and the room's noises and whispers held; back with the landing (measured: 0 at t 2.3, rising by 3.9).
  7. `cpEyesLinger` in `cpDie`: his eye materials lit full, then held at 0.45 with a flicker for 2.5 s, out by 5.5 (`cpEyeFade`,
     ticked from `cpBurstTick`). The pieces carry the same materials, so the glow is in them.
- **SEWER JARS** at the jar's own size (×3.04, `BLEED.jarS`; they were ×1.55), set further apart, their aim sphere and shine
  scaled back to the size they had (both are in the jar's frame).
- **THE GRAB HAND'S HOLES**: since the merge a pickup's hand was depth-tested at the thing's own depth round the grip
  (`useDepth` 1, main's for the grate's bars) — grass, a floor's lip, the thing's own nearer faces came through his fingers.
  `useDepth` 0 for a pickup; the grate's reach keeps 1. (The sheet itself has no holes: measured, every frame's clear flood-
  fills from its border.) The grab a little quicker: `HG_T` 0.55 s → 0.475.
- **NOTHING YOU PUT DOWN IS LOST** (`dropOnFloor`, from `dropPoint`): straight down on the place's own meshes, a floor facing up
  within 0.33 m under your feet (not the sewer's channel) and under your head, with nothing between your chest and it; pulled
  back toward you 15 cm at a time off a wall; else at your feet. `tools/sewdrop.js`: the bottle at the wall went INTO the wall
  (the sewer's floor formula is one height), and over the channel it hung in the air; now on the ledge and the walk.
- **LAG**: the injection's 52 ms frame was three things in turn — the blue light ADDED to the scene (now made with the lamps:
  `celInjL`), the eyes' unlit-glow material compiled as they lit (`cpEyes(model, 0)` at each one's setup and the bench's load),
  and the syringe compiled on its first frame (built with the cellar, `cpSyrBuild`, and shown for `placeInCellar`'s compile).
  The head clamp's ray through the church was 2.5 ms a rising frame: the ceiling kept per half-metre and floor (`_phCeil`).
  Measured clean: breaking puppets (≤ 27 ms with six at once), leaving the cellar, the church, the sewer (`tools/spikes.js`,
  `tools/exits.js`).
- **THE CAMERA WATCHDOG** (`cameraWatchdog`, after every frame): place, turn, look, eye height, fall, lens — anything not a number
  is put back to the last place you stood on the ground (every 0.25 s), any held camera let go, and the console says what. For the
  owner's screen of nothing but fog after the pack in the well man's fight (not reproduced: `tools/wellpack.js` — his hold, the
  pack open and shut — kept the camera sound). `_camGood` is a `var` made on first use (the loop runs before the module is read).
- **THE WELL'S "Look inside"** never once he is up (`wellEmptyLookIt` takes it away at `wellPhase` ≥ 2; the first prompt has
  `when: wellPhase === 0`). `tools/wellfight.js`: his checkpoint staged as a load stages it, he swings and hits (6–10 in 20 s).
- **THE MACE CRUSHES** (`maceMark` at the killing blow in all three of `hurtMutantCore`'s kill sites — `killHitK`, where your
  aim met him as a share of his height; `maceKillPower`, `sfxMaceCrunch`): a head blow bursts the head; every part of the throw
  kicked by its nearness to the contact; a body blow lifted more, a low one sweeps the legs; an overhead drives him down. Its
  own first-flight caps (vmax 18, travel 16; a slam 9 / 6) — the common cap had clipped the bigger throw to the same 3.6 m.
  `tools/macefling.js`: hips thrown 5.1–5.3 m (the toy shovel 1.7–1.9), the head gone on the head blow. Damage untouched.
- **THE BUNKER'S LADDER** plays the item sound (`pickup`) as you take it. **DIALOGUE TEXT** about an eighth bigger
  (`#dialog` font-size clamp 18–29 px).
- **STUCK IN THE WALLS, LOCKED OUT** (the owner: "puppet models are getting stuck in the walls and locking me out of
  progression"): the wall-hung ones came down off their nails into the strip along the wall where the walk has no floor, and
  the clamp had no home for them to go back to. `cpLegal` (the cellar's own floor, the clamp's rule — not a bench top, not the
  stairs), `cpRescue` (rings out from where it is, five-point footprint legal), `cpNearYou`; asked on landing off the strings,
  off a pounce, a dart, a throw, and every frame of the fight (`cpStuckTick`: 0.5 s off the floor → rescued; 20 s never within
  3 m of you → put near you). The clamp only takes a legal spot as a home. `tools/pupfight.js`: three runs, none off the floor,
  every fight finished.
- **DARKER BY THEM**: tube 4.3, bench bulb 2.1, `CEL_GLOW` 0.2.
- **THE OWNER'S PUPPET FOOTSTEPS** ("Puppet Footsteps 2"): ten steps cut at their onsets (`assets/puppet-step1..10.m4a`, 49 KB),
  bank `pupStep`, played by `sfxMutStep` for a voice with `pupStep` (the gait's own cadence) and every 0.09 s of a dart.
- **NO LITTLE SCREAM**: their voice is `mute` (`sfxMutTell/Roar/Laugh/Hunger` return for it) — the borrowed throat at `f` 1.4 was
  a small shriek; and the string snap is a dry snap and a low thrum, not a falling twang.
- **NO BLACKOUTS** (the owner: "take out the lights turning off"): both `celBlackout` calls gone (the function stays).
- **SUBTLE EYES** ("corny right now it should be horror"): the whites keep their own colour with a breath of cold (0.06), the
  pupils a small pale point (0.75, darkened); the injection's spill 0.45 (was 2.4), a break's 0.8 (was 3.5), the eyes in the
  pieces 0.35 and out by 4.5 s.

## 2026-11-22 (late) — the puppets' moves, the cellar door again, the prints, the swing, the marionette's waits and his fights
- **FLUID PUPPETS** ("theyre legs are stuck up near theyre heads the animations are bad make them fluid and good"): the pounce
  was the Wong's `mJumpUp` (a tuck, knees to the chest) with a somersault on 30 % — legs over heads all fight. Now `cpLeapStart`
  plays their own `mHRun` through the air (a 0.12 s dip first, the stride slowed to 0.75 in the hang, the body pitched forward
  up to 0.42 rad about its middle and upright again to land), no flip, and the run plays on into the fight's gait (no fade to
  nothing at the landing). `cpClip` crossfades (0.16 s, `crossFadeTo`) instead of fade-out/fade-in; the dart's strafe at 1.55×
  (was 2.4). Hung by the ankles (`cpSettle`, `H.flip`), a free thigh/shin lerps toward ITS up by 0.55 (it had settled "down",
  i.e. at his head). The marionette's pounce the same. `tools/puprig.js`: leaps read as a run in the air, legs down.
- **THE WASHER'S PADLOCK RINGS** ("a metal hit … like the metal shovel no matter the weapon"): `celLockBreak` plays `milHeavy`
  unless the military shovel's own heavy just did (`rang`).
- **CELLAR DOOR** 2.85 × 1.52 × 2.35 (`CEL_OUT`). The fence is ~1.5 m past its low edge; the exit spot (d + 0.85) still inside.
- **FOOTPRINTS TO IT** ("from the side of the house", then "around the swings side"): `celOutPrints`, 35 of the beach's prints
  (`foot.material`) on a Catmull-Rom from by the swing (−z side), along that wall 1 m off it, round the back corner, the last
  pair facing the doors. Each tilted to the ground (`elvLandFloorAt` from `elvSurf + 0.3` up — from above, the eaves were the
  floor). `tools/celprints.js`.
- **THE SWING AND HIM** ("make the swing physics and colliders react to the marionette too"): in `updateElvDressing` he shoves
  the seat as you do (`shove`), and off it the seat is a box to him (its width along the arc, its span + ropes across), pushed
  out by the shallow side — a seat swinging into him pushes him and is pushed back.
- **HIS HEALTH ACROSS A CHECKPOINT**: was right (`tools/marsave.js`, beach/tavern/cellar). Fixed the gap: a save while he was
  being made after a load (`marPend`) wrote the stand-in's full bar; and he is made with the saved hp from the first frame.
  A save with him at 0 hp writes 'dead'.
- **HE WAITS ON THE SAND** ("not get pulled into the water … sitting on the beach waiting … only if you do the cast with him
  there"): `rod.marThere` at the throw (`marWithYou(30)`), `marWaitBegin` at the bite: a spot of CLEAR sand near him
  (`marSandClear`: a ray down from 3.5 m hits nothing but the sand — the fishing tree's trunk is right there and the first
  went in it; prints and glows, `depthWrite` off, and his own body skipped), dry (shore + 3.2). `marSitStep`: knees up, hands
  under them (`marReach`), head at the water; set on the SAND MESH's height read by ray (`groundUnder` said 0.5 there, a mound
  the eye does not see). Up the frame `deepLock` lets go (`marWaitEnd`). Saved as `marWait` only while `deepLock`.
  `tools/marwait.js`.
- **THEY FIGHT HIM BACK** ("enemies should attack the marionette if hes hitting them … balanced … keep our difficulty the
  same"): `marAggro` from `hurtMutantCore` when he is `from`: 55 %, not one you hurt in the last 2.5 s, never a boss or a sided
  fight (`marAggroOK`), and only while there is room — a third of what is awake within 30 m of you, one at least
  (`marAggroRoom`; `marDraws` now asks the same and only takes ones he is hitting). `marAggroTick` (from the unit's frame) sends
  it back after 4-7 s if you are nearer by half or he has not hit it in 3 s; your blow takes it at once. `tools/maraggro.js`:
  four runts, one on him at a time, he took 2 hits, the rest on you.
- **THE CELLAR CHECKPOINT, FAST**: ranked by the beach's distance from the house it held its black for the church, tunnel,
  knight, cave, rock mouth and Elvédor (all within 100 m of z 716). `bwFetch`: for room 'cel' only its own files
  (+ `marionette.glb`, which ranked FAR and came late) and the pack's are near; `WARM_ROOM_OWN.cel`; and down there the far
  rest waits (`BW_CEL_FILES`, `bwHoldHere`). `loadall.sh cel`: playable 4.6-4.8 → 3.84 s, the 8 s after: max frame 20 ms
  (was 145, the driftwood's parse).

## 2026-11-22 (night) — the call's at-ear fingers, the loud line; the crow's zoom; the crabs' cut and the gulls; the hung puppets balanced
- **THE FINGERS AT HIS EAR** ("fix the fingers on the phone in the start cutscene they are all messed up and the trims are
  bad"): `tools/intro_ear_recut.py` frames 56-99 — the skin-hue cut tore them (holes, loose bits, a ragged lump over the glass).
  `gc_refine`: GrabCut at half size seeded by the hue cut (sure-hand where it is solid, sure-not far off and on the left third,
  the glass sure-his), smoothed back up, one piece with the glass. The glass: the clip's light drained flat (`lum` blurred ×0.13
  + 0.035) — no more table/red book through it; what shows THROUGH it (the finger behind) darkened and drained (`thru`).
  Vision's foreground instances were tried first: they merge his hand with the paper under it in most of these frames.
  Source re-extracted from `~/Desktop/BEACHWALK ASSETS/IMG_7209.MOV` (ffmpeg 12 fps v2/ and v2h/); the right sheets are 5 now.
- **"DUDE I HAVE A THOUSAND SKETCHES RIGHT HERE"**: 44.0-51.0 s of `assets/intro/call.m4a` −4.5 dB (0.15 s ramps; ffmpeg
  `volume` with `eval=frame`, AAC 128k): his three lines there −19…−21 → −23…−26 dB active, beside the caller's −26/−27 either
  side. Sample-aligned with the old file (cross-correlation 0 ms at 1 s and 60 s). The original is in git (bb45533).
- **THE CROW'S ZOOM** ("make the zoom in on the crow scare less long"): `CROW_ZOOM_HOLD` 1.2 s from the scream's first breath
  (it was the whole 3.6 s + its echo); the hold on your look eases with it. The scream, beak and shake unchanged.
- **THE GULLS THROUGH THE CRABS' CUT** ("dont make the seagulls freez … just have them fly and not attack"): the pack's swim-in
  (`packCut`) is `frozen()`, and `updateGulls` returned on it — the wreck's three hung in the air. Now `calm`: they run, no
  wake, no hunt, and one in its tell or stoop is put into 'pass'.
- **THE HUNG PUPPETS UNDER THEIR STRINGS** ("it doesnt look like hed hang like this from where the string is"): in `cpHang`, a
  ceiling-hung body is turned whole about its strings' centroid until its centre of mass (bone-weighted) is inside 0.45 of
  their spread, and the hook/bar/cord moved over that — the butcher (chest + head) hung bent forward a hand in front of both;
  plumb now. The flipped ones and the host (five strings) were already balanced; the wall ones lean on the wall. `tools/pupstrings.js`.
- **THE ENEMY LOG DOES NOT LAG** (asked): `tools/elogcost.js` — the first kill of a kind (when its likeness is copied) and the
  second have the same worst frame (5-15 ms: the death's ragdoll and gore); its viewer and stand-ins run only with the page open.

## 2026-11-22 (late night) — the marionette looks round; the workshop puppets run on their own clip, feet planted
- **"give the marionette this look around when he comes out of the washer"** (Mixamo "Nervously Look Around"): packed into the
  Wong's set (`tools/ntar_moves.py -- wong`, `NTAR_ONLY=lookAround`; 5.7 s, 172 frames, travel 0.02 m), retargeted in
  `celMarMocap` as `mLook`. `updateCelEscape`: leap → 'look' (the whole clip where he landed, head override off) → 'stare'
  (1.9 s, turned to you) → run. `tools/washer.js` stills `esc_look1-4`.
- **"the puppets feet slide give them animations keep marionette the same"** + **"give the other puppets this run not the
  marionette"** (Mixamo "Mutant Run": 0.70 s loop, 2.06 m, `mutantRun` → `mMRun` in `ELV_MOCAP`, so every Elvédor-built kind
  HAS it; only `cpup` uses it). Measured (`tools/pupslide.js`, the seven on you 10 s): the run (`mHRun`) played at feet 2.70
  m/s while their bodies went 1.15 (453 of 565 frames sliding over 1 m/s), the backing walk's feet the wrong way, 958 frames
  sliding in the idle (the "spread round you" drift moved them under it). Now `cpup` has `velGait` (the clip off the body's
  own velocity in its frame, at the rate its foot keeps pace, the body capped to the stride), `gaitBands` + `gaitLo` 0.55
  (the Mutant Run only when really going, the walk under it), `axisLock` 0.7 (the sideways drift mostly cut while it strides).
  After: frames sliding over 1 m/s — run 25/135, walk 5/922, strafes 0-5, idle 16/1407. The pounce (`cpLeapStart`) plays
  `mMRun` through the air. The DART is a hop now (0.13 m arc for its 0.2-0.3 s: 6.6 m/s is no strafe's stride).
  `tools/pupfight.js`: blows land 15/17, pounces, spread round you, throws and breaks as before. The marionette (`cmar`) is
  untouched: still `mHRun`.
- `assets/wong-moves.json` 111.6 → 145.1 KB (gzipped).

## 2026-11-22 (late night, later) — the marionette lies and sits up; the bench sleeps; his stance; the puppets' gait settled; Elvédor waits; the cellar
- **"have the marionette laying on the beach and he gets up like this"** (Mixamo "Situp To Idle", 4.3 s, flat → standing; Wong set
  `situp`, `ELV_MOCAP` `mSitup`): while the deep has you `marLieStep` holds its first frame where he waited, his feet to the
  water; `deepLock` off → `marWaitEnd` starts `MAR.rise`, `marRiseStep` plays it through, then `marWaitDone(u, true)` (no snap
  of his yaw or height: he turns to you following). The knees-up sit is the fallback. `tools/marwait.js` stills `rise_*`.
- **The bench puppet asleep** (Mixamo "Sleeping Idle", `sleep` → `mSleep`): `celPupSleep` reads the hidden bench fighter's
  pose a third in and copies it onto the still copy `celPup`, bone by bone RELATIVE TO THE HIPS' PARENT, the whole body turned
  as the fighter's `Sketchfab_model` stands in his group (the fighter has a `cpTurn` node the copy has not), then along the
  bench (head to −x) and seated by his back. TRAP: the fighter already had a clip playing — sampled with it, the sleep came out
  a 50/50 blend, propped on an elbow: `stopAllAction` first. `tools/pupsleep.js`.
- **His stance** (Mixamo "Old Man Idle", 8.3 s, `oldIdle` → `mOldIdle`): `MUT_KINDS.cmar` gaits/anim idle, `marIdleClip` at the
  three places he stands, and the washer one's stare (`mOld` in `celMarMocap`). `tools/maridle.js`.
- **"LOOK HOW THEY MOVE THEIR RIGS ARE OFF"**: measured — the drawn bones are the clips' to ≤2° (`tools/pupdiff.js`: nothing
  procedural bends them) and the Mutant Run retargets true (`tools/pupangles.js`: knee bends and thigh swings equal the Mixamo
  source's at the same frame; the source's stick figures from Blender, `fbxsticks.py` in the scratchpad). What was off: velGait
  switched each puppet's gait 2.2 times a second (run/strafe L/strafe R/back), so they were always mid-blend. `kind.vgHold`
  (0.45 s, idle half): a wanted gait must hold that long before it is taken — 0.76 switches a second. `tools/pupframes.js`
  (your view of the fight, labelled), `tools/pupclips.js` (a clip on the rig, side and front).
- **The padlock** says only "It won't give." (no "Hit it off").
- **The kitchen door open again, and the ground floor back** ("make the door i said to close in the cellar open", then "build
  the kitchen again"): `tools/kelley_pack.py` no longer turns `Cube.211` (its own part `kitchenDoor`, kept whole), and `WELL`
  is the house's whole ground floor (x -2300..1200.5, z -1140..770, to the ceiling at 815): the living room behind the door,
  the kitchen and its table, the bathroom; walkable. `kelley.glb` 0.58 → 0.96 MB; cellar checkpoint 3.84 → 3.91 s playable.
  `tools/celkitchen.js`.
- **Elvédor waits for the marionette's blow** ("elvedor shouldnt automatically attack me the marionette should hit him first"):
  `marElv` no longer provokes him on sight — and `marAggroTick` (11-22's aggro) handed him to YOU at once, no blow of the
  marionette's having landed. Now he is woken by the marionette's first blow (`provoke` in `hurtMutantCore`) and stays on him
  (`marAggroTick` leaves him) unless you hit him. `tools/marelv.js`: wakes at frame 520 hit by him; on you 0 frames.
- **The cellar's checkpoints** ("make a checkpoint leaving or entering the cellar"): already written both ways
  (`updateCellarCut` → `autosaveNow`): in, room 'cel'; out, by the doors (`tools/celsave.js`). The game has no on-screen
  checkpoint notice.
- **The bench puppet stays dead** ("after killing the puppet that jumps off the table … his model shouldnt be there when coming
  back"): `celBenchDead` (set in `cpDie`, saved as `celBench`); the copy hidden whenever it or the fight's end is true (it was hidden
  only while the fighters were in memory); loaded after his death, no bench unit is made and the rest come down (`cpAllDown`).
  A save mid-fight took the whole fight as not begun. `tools/benchdead.js`.
- **The puppet in the fire** ("the puppets body should not be in the fire if not put in there"): `epup` (the puppet alive when it
  sees Elvédor die) set `elvBurned` to take it off the stage — and `elvBurned` is what lays the black body on the logs on every
  load after, and what the "Burn the puppet" achievement counts. Now only `elvStage` 5; the load-time provoke asks `elvBurned`.
  A save already written with it set still shows the body.
- **Weapons after a checkpoint** ("my weapons sometimes dont show up in my hand when loading a checkpoint"): Skrim's Hook and the
  water bottle were not in `PACK_FILES` — fetched as far rest, and in a room that holds the far rest (whale, deep, cellar) not at
  all while you stood there. Added (and the sea shell); and `bwHoldHere` never holds a file of `BW_FROM.first`. `tools/vmroom.js`
  (`&item=&room=`): the hook in the cellar and the military shovel in the whale drawn from 0.5 s.
- 2026-11-22: "turn up basement ambience a lil in the cellar" — `CEL_AMB_LEVEL` 0.45 → 0.6 (+2.5 dB).

## 2026-11-22 (late) — the trail up to his door; the house over the cellar
- **The way up** ("lighten the sand like a path up to elvedors front door so his house is missed less"): `buildElvTrail` (with the
  yard, `updateElvLand`, as a `warmStep`) lays a strip of paler scuffed sand from the dry beach at the gully's mouth (x 7.2),
  up `ELV_PATH`, through the gate and over the stepping stones to the porch steps (`HOUSE_X - 6`, `HOUSE_Z + 3.8`). TRAPS: wound
  the wrong way it was culled from above (and lit from below) — `idx` (a, b, c)/(b, d, c) faces up; and laid on the walk's sum
  (`elvLandFloorAt`) it sank under the DRAWN gully nearly everywhere — a ray down per step of the line onto
  `[elvFieldMesh, sand, cliff]`, the hit NEAREST the walk's floor (the cliff's surface over the gully is still there to a
  ray, metres up, cut only in its shader), lifts each cross-section. `tools/elvtrail.js` (`&red=1` paints it, `&nodepth=1`),
  `tools/elvtrailray.js` (every mesh under the line). Material: `color 0xb4c0d6, emissive 0x48546e` off its own canvas.
- **The armchair is gone** (`Cube.277-280` and the three things on it, `Cube.356-358`, dropped in `tools/kelley_pack.py`).
- **The fridge** (`buildCelFridge`): the hoses (`BezierCurve.001/.004/.006`) and the glass tank (`Cube.057`) dropped; its lower door
  swung shut in the packer (`turn_leaf`, 11.6°); the body and both doors are parts (`fridgeBody/Top/Low`), the doors hung on
  the +x edge of its front (it faces −z) and opened together to −1.48 rad; inside, a BackSide liner, two shelves, a water
  (`gainWater`) and four jars at `JAR_S` 3.04 (`gainJar`), saved as `flags.celFridge` (bit 0 water, bits 1-4 jars). Tinted
  ×(0.70, 0.60, 0.47) to sit in the brown room.
- **Solid low furniture**: the walk read a 34 cm coffee table as a step up onto it. `SOLID_PARTS` (coffee table, TV stand, TV,
  fridge) are sampled as walls, never floors, filling the body band (`(y, 0) and (y + 0.4, 0)`).
- **The bathroom** is seen, never entered: `NO_FLOOR` drops its floor cells from the walk to x −3.95 (the threshold is yours).
  In its tub, lying back to the chin, the Dancer's colours: `buildCelBath` (`CEL_BATH`, head at (−7.10, 3.66, −2.15), arms and
  legs aimed down under the water, a faint cold emissive of his own), and a cold bulb over the tub with the cellar's lamps
  (a light added later recompiles everything). Visibility by rays with EVERY face counted (`side = 2` for the test): with
  front faces only, the sink and the tub's rim read as see-through and the far end of the tub "was visible" — it is not.
- **The head through the ceiling**: `playerHeadClamp` ran only while rising (`vy > 0`); a step up the stairs lifts the eye with
  no speed, under the headers. In the cellar it runs every frame.
- **The TV** (`buildCelTv`, `celTape`, `TAPE_FS`): dark until E; a tape of five clips (the bench injection, the cellar from a
  corner camera with him watching, one walking at the lens, three of them in the shallows by day, a face — then snow that
  stays) drawn live into a 320 x 240 target at 15 fps through a VHS tube (curve, chroma bleed, tracking band, scanlines,
  grain, the deck's PLAY and a date). The puppets play `cpMocap`'s clips on their own mixers (travel stripped), Elvédor
  `ELV_MOCAP_SET`'s idle with his right arm aimed into the injection (`pupAim`). Its hiss and snow from the set. Built on the
  first switch-on (a parse of `elvedor.glb` and a compile). `tools/celtv.js` reads the tape's own target out as stills.
- `tools/celroom.js`: stills of every corner of it, the fridge open, the bath from the threshold, and a jump under the ceiling.
- **Sand thrown up, rebuilt** ("the sand particles have to look way more realistic they are awful"): `spawnPuffs` keeps its
  signature; what it makes is three layers — `sandGrains` (points, 1-2 px, a thrown SHEET: staggered over 0.06 s, every grain on
  near the same arc, a crown out of a landing; gravity, drag on the fine; gone into the ground, `groundUnder` per burst), `sandDust`
  (a few faint torn puffs that swell, drift +x on the wind and thin over 1.4-2.8 s, back-lit by the moon) and the old `puff` pool
  as 1-3 cm rounded clods that break into grains where they land. A hex tint is read (it was NaN: grey chips came out black);
  a red one (blood) throws no dust. Grains `SAND_NIGHT` (0.15, 0.18, 0.26) as drawn — at 0.07 and quarter alpha they were not
  there. `tools/sandfx.js` (fixed clock: `__adv`, or the stills show nothing moved).
- **The marionette out of the washer, sooner** ("he stands there for too long … still do the nervous look cut it short"):
  `CEL_MAR_LOOK` 2.2 s of the look, `CEL_MAR_STARE` 0.7 s turned on you, then he runs (was the whole 5.7 s and 1.9).

## 2026-11-22 (night) — the trail on the beach's sand, the dead trees' bark and trunks, the house over the cellar again, the tape
- **The trail wears the beach's own photograph** ("make the trail to elvedors look better have it blend well with the sand texture
  i added"): `buildElvTrail`'s map is a clone of `sandTex` (the JPG's Source, so the swap reaches it) at repeat 1 with uv
  `(x+800)/SAND_TILE, (800-z)/SAND_TILE` — the beach's own texel grid, so at the beach end every grain lines up. Colour/emissive are
  the beach's `0x6d7d99 / 0x27324a` ×1.42. A mask canvas of its own (128×1024 over 12 m, `aTrail` = across/along): R coverage,
  G footprints (four walkers, toe ridge), B where a turned-over sample of the sand shows (churned). The edge breaks along the grain
  (`trRel`, the texel over its mip-4 mean). Half-width 0.80 (0.62 read as a stripe). `tools/elvtrailclose.js`.
- **The bark** ("retexture the trees … with more real detail"): `makeDeadBarkTextures` (256×512, periodic noise, a stretched warped
  Voronoi whose edges are the fissures, stringy grain, cross-checks, peeled plates, lichen) + a height map as the bump.
  `elvTaperTube` keeps uv: whole wraps round (`ELV_BARK_ROUND` 0.55 m), metres along (`ELV_BARK_ALONG` 1.6). The merge keeps uv for
  'bark' only. AT NIGHT A DARK TRUNK IS A SILHOUETTE: emissive 0x646464 through the map is what makes the bark show (0x2a2826 showed
  nothing) — `tools/elvbark.js &em=&co=` tries values.
- **The trees are solid** ("im walking through all elvedors trees"): `elvTreeSolid` holds each trunk's curve (12 points) and radii;
  `elvTreeBlocks(x, z, feet)` (body 0.28 m, segments within feet−0.2..feet+1.9) is in `updateElvLand`'s `legal` — a step INTO a
  trunk is refused, a step out of one is not. `tools/elvtree.js`: four trees walked at for 2 s, each stopped ~0.58 m off the axis.
- **The bathroom** ("i juts jumped in"): in the air the walk takes any floor within `FORT_AIR` — the tub's rim — so `NO_FLOOR` was
  not enough. `celNoGo` (room-local x < −4.07, z −3.8..−1.72, feet over CEL_Y+2.4) in the cellar's `legal` and `celClampPlayer`.
- **The kitchen's bulb** (`celKitchenL`, 0xffcf8a 5.2 over the table, its own brown-outs every 5–14 s). Before it the kitchen had
  no lamp at all — only `CEL_GLOW`.
- **The fridge's doors** ("the door is completely off"): not ajar in yaw or pitch (a turn search found 0) — the lower door's mesh is
  0.37 m deep with its inner racks, so shut it stood off the cabinet as a slab. `flat()` bakes each door into the room's space and
  presses it to `CEL_FRIDGE_DOOR` 0.075 m against the cabinet's front. Hinged on the cabinet's −x edge (the RIGHT as you face it,
  "the hinges should be on the right and it opens from the left handle side"), opening +1.48.
- **The kitchen door** ("make it so the doors open more i hit the couch"): `Cube.211` was 55° into the TV room, its leaf turning you
  into the sofa's end; `turn_to` in the packer stands it square to its wall and 18° past (hinge found as the leaf's end on the
  doorway line, file x 1048 = the east jamb).
- **The TV room's window is gone** ("its supposed to be an underground place"): the curtains and rod dropped (`Cylinder.010/.042/.043`),
  the pane and reveal behind x 1200 cut (`in_window`), the hole walled in the wallpaper's own uv (u along z 0.2564/m, v up y
  0.5236/m, both linear there). TRAP: the raw file order of a reference triangle is NOT the written winding — first try faced out.
  `tools/celwin.js`, `tools/celplan.js`.

## The tape, second round (2026-11-22, "the tv should be from the actual screen on the tv model … make the beach one more realistic and have elevedor in the beach chair relaxing shirtless … use the model of the beach outside just make it day time … some are also too dark")
- **On the set's own glass**: the tube is 16 triangles of `tvSet_` sampling the atlas's glass patch (`CEL_TV_GLASS`); cut out of the
  set into `celTvGlass` (a child of the set), uv laid across it from the patch's corners (u 0.044→0.464 is the viewer's left→right,
  v 0.325→0.641 bottom→top; OSD reads the right way round). Off: Lambert dark glass (a Standard one picked out one flat facet white).
  `V.glow` (0xa8bce0, 4.2 m) throws the picture on the room, `TAPE_GLOW` per clip. `tools/celtvfaces.js` dumps the set's faces.
- **Levels**: `TAPE_GAIN` per clip and a lift of the night clips' middles (`pow(col, 0.72)`); the cellar set's bulb 24→38, ambient
  1.7→2.6 + a key light; the face's under-light 9→14. Scanlines 240→110: at 240 they beat with the frame's pixels into rings.
- **The day beach** (`buildTapeDay`, `tapeDayTick`): sand = the beach's photograph re-toned to noon (`tapeDaySand`), wet near the
  sea by vertex colour, rising into a 4.4 m cliff with dune grass; a sea shader (`TAPE_SEA_FS`: swash, breaking crests, foam, glints);
  a sky dome with sun and cloud; HIS HOUSE on top — `houseWorld`'s own meshes drawn again (non-skinned, opaque, within the house's
  footprint); a striped deck chair, umbrella, towel and cool box; the three in the shallows round a beach ball with spray.
- **Him shirtless** (`tapeShirtless`, `tapeManLook` swaps the map for clip 4): HIS ATLAS IS NOT WHERE IT LOOKS — rectangles guessed
  off the picture missed a trouser leg. The mask is drawn from the model: each body triangle filled in its own uv by its dominant
  bone (hips/thighs → trunks, anything below the head → skin); then only cloth pixels (saturation < 0.2) take it. Posed by `pupAim`
  in `tapeDayPose`: reclined spine, legs out, hands behind the head, head after the ball; hips set onto the chair's seat.
  `tools/celtv2.js` (`&quick=1`, `&glass=1`), `tools/elvuv.js` (uv occupancy per bone).
- **His head on the swing, smooth** (2026-11-22, "MAKE THE MARRIONETTE HEAD TURN WHILE ON THE SWING MORE SMOOTH WHEN YOU TALK TO
  HIM"): `marSwingStep` used to SWITCH the look target from the water to you when `MAR.lookK` crossed 0.5 — the whole ~50° turn
  in one frame. Now `lookK` runs at a steady rate (`MAR_LOOK_TURN` 1.1 s), the water's and your DIRECTIONS are blended by its
  smootherstep, and the head follows that direction on a critically damped spring (`MAR.lookD`/`lookV`, `MAR_LOOK_W` 5).
  `tools/marlook.js`: on talk 53° over ~2 s, at most 1.0°/frame, a bell (0.1 → 1.0 → 0.1); the same back when the talk ends.
- **His dialog, the owner's** (2026-11-22, "make this the dialog to the marionette if you dont say ill take you there he doesnt
  follow you"): `MAR_NPC.script` — start "..." → "You okay?" (okay: "I've never been okay…" → "What are you?") or "What are you?"
  → miracle ("Dad used to say I was a miracle.") → "Why were you locked in the washer?" → light ("I wanted to see the tall
  light…") → "I'll take you there." (go: "REALLY? LET'S GO") or "Leave". Only `go` sets `MAR.go`; `MAR_NPC.onLeave` hops him
  off on ANY close if it is set (so a click or the timeout after "LET'S GO" both work), and resets it; `marTalk` clears it.
  Leave or Escape leaves him on the swing, askable again. The old `off` node (either answer → hop) is gone.
  `tools/martalk.js`: Leave → swing, Escape at the light → swing, take → hop.
- **The path to the porch steps, square** ("the trail should then line up with the stairs"): the steps measured off the walk
  (`tools/elvporch.js`): z −712.2..−709.8, foot at x 29.6 (the front door's middle −711.05). `ELV_STEPS`; the last stretch turns
  onto that line 2.6 m out and runs to the bottom step, narrower there.
- **The TV plays only the beach** ("just put the beach one on the tv take out the other scenes"): `ci` 3 always, `TAPE_DAY_LOOP` 12 s;
  the camera goes to him and back to the water each loop; the cellar clips and the face are built but not shown.
- **The marionette on the swing** ("facing the wrong way swinging too high make it back what it was last"): the head's target is
  the original again (the water, or you past `lookK` 0.5); the smoothing is on the head bone (`MAR.headQ` slerped at
  `MAR_LOOK_RATE` 2.4/s) — blending the two DIRECTIONS turned his head the wrong way round when you stood behind him. With him on
  it the swing is damped back if shoved past 1.6 × `MAR_SWING_AMP`.
- **His head out of the washer** ("make sure the marionettes head doesnt clip through when getting out of the washer"): in the
  leap, while the head is behind the door's line + 0.26 it is held under `CEL_WASH_TOP` (0.762, the opening's top) − 0.19.
  `tools/washer.js` logs the highest head over the drum: 0.65 → 0.60.

## The Enemy Log, every kind (2026-11-23)
"some enemies dont show up make it so they all do then. also make the ones you found a different shade." / "they should appear
immediately in it after the kill no bugs". `tools/elogall.js` makes every kind, kills it, reads the log the frame of the blow,
draws each likeness in the box (pixel count + a contact sheet), then drops them all and makes them again as after a load.
- **HALF THE KINDS DREW NOTHING BUT THEIR SHADOW** (hulk, spindle, runt, bloat, the Dealer, the headland's thing, samurai, the
  hunter, Wong, the orc, knMan, the paladin, Skrim, Elvédor, the puppets, the king, half the farmers): the likeness is a copy of
  `u.model` as it is, and the game's culling had its ROOT (the GLB's `Scene`) hidden at that moment — `visible` is copied, so
  the box's renderer drew the 2-triangle shadow and nothing else (`tools/elogwhy2.js`: calls 1, tris 2). `elogShowAll` shows
  every container (not a mesh: a cut limb or a proxy keeps its own) at mount and whenever the root is found hidden again.
- **ON THE BLOW, NOT AT THE END OF THE DEATH**: `elogKill` is called from `killMutant` (before the flash, the body whole), once a
  body (`u.elogDone`); `finishMutant` keeps its call as the fallback for a death that skipped the blow. Also from `mutBleedOut`
  (a bleed-out was never logged), and `catPutDown` is reached after it (the catacombs' hunter, `undying`, never reached
  `finishMutant`). The crawler's young was excluded as `kind.baby` — it is killed (`babyHurt` → `killMutant`): counted.
- **THE OTHER FOUR** (`ELOG_OTHER`): the wreck's gulls (`killGull`), the pliosaur (`plioDie`), the sewer's thing
  (`sewElectrocute`), Skrim's crying heads (`cryKill`, `crySummonDie`) — none are `mutants`. `elogOther(k)`: counted, and the
  likeness from the live model (`live()`: gull bones to rest, the sewer thing's to `sewMon.bind`, the pliosaur's and the heads'
  idle clips) or, after a load before that place is built, from its own file (`bwGlb(url)`, parsed for the log alone).
- **THE FARMERS' COPIES** (`gargRaidN`, `tavDrinkerN`, `tavDancerN`) log as the farmer they were made from (`elogKey`).
- **THE WHOLE ROSTER, FOUND IN ITS OWN SHADE**: `elogRoster()` — crab, gull, every `MUT_KINDS` enemy in the order they are made
  (not `friendly`/`ally`, not the farmers' copies, not `whaleBody`: the gut's demons and parasites were taken out with their files
  2026-10-29), `epup`, then pliosaur, sewer thing, heads; numbered, "N of M found" over it. Found: warm (`.elog-row.found`, amber
  bar, ×count, can be picked); not yet: dim "???", no count, disabled.
- **AFTER A LOAD** every likeness is made again from a stand-in: the picked one first, then the rest one at a time while the log
  is open (`elogFrame`), each stand-in's file moved to the front of the queue (`bwFetchSoon` AFTER `makeMutant` queues it — before,
  it moves nothing): Myles's file, ranked by his place down the walk, had waited past the 30 s and his box said "…" for good. A
  likeness that failed is tried again each time the log is opened.
- **ONE LINE A BODY** ("same models with different weapons can go only one each"): the castle's twenty are five bodies
  (`FARM_ROSTER` files ka, hd, ol, kn, kw) — logged as `farm_<file>` (`elogKindKey`), with the raid's and the tavern's copies.
  A save's old `farmerN` lines are summed into their body by `elogNorm` at first use — NOT in `elogLoad`, which a restore can
  run before the module has read `FARM_ROSTER`/`MUT_KINDS` (a const read there is a dead-zone crash that takes the page). A
  body's stand-in after a load is its first farmer (`elogMakeKind`); `epup`'s kind is made on first use (`epupKind`). 41 on the
  roster now. A kill selects its line (the log opens on what you killed last).
- **NOT YET KILLED: A FLAT BLACK SILHOUETTE** ("a black silhouette that isnt 3d … once they are killed it shows their model you
  can spin around"): `assets/elog-shadows.png` (75 KB, 41 cells) + `.json` (cells by key), drawn off the game by
  `sh tools/elogshadows.sh` — each kind's stand-in in its idle 0.5 s in, black (`overrideMaterial`), alpha made hard, cropped,
  at the narrowest of six turns (a spear across a man made him a third the height: `farm_hd`, `farm_kw`). RE-RUN IT when a kind
  is added or a model changes. In the box (`elogSilShow`): a 2D canvas over it, the 3D canvas and its hint hidden; every row
  can be picked, the unfound ones show their outline and "???". `tools/elogsil.js` checks both (stills).
- **OFF THE LOG** (2026-11-23: "take this guy out hes not in game anyone not in game can go from the log and delete their model",
  "take out companions from the enemy log too"): `elogOut(k)` — `ELOG_COMPANIONS` (Myles `minotaur`, the marionette `cmar`) and any
  kind marked `gone` — never logged, never on the roster, a save's old lines dropped (`elogNorm`). The headland's thing (`scp`,
  `SCP_ON` false since long ago) was still MADE at every boot (its 1.1 MB file fetched and parsed) to be retired the next line:
  `assets/scp096.glb` deleted, `scp096` a stand-in with the fields his code reads, his ASSET_REACH line and README credit gone; to
  bring him back, git and `SCP_ON`. Every other kind on the roster checked as made somewhere and not retired. 38 on the log now;
  silhouettes redrawn (`tools/elogshadows.sh`) with the farmers' new weapons.

## The moon's real face (2026-11-23)
"use this for the moon model make it blend well with the game fit it in the style keep everything looking the same just improve the
moon with this keep lighting the same" (RenderX's "moon", CC-BY-4.0: a sphere under one 8192 × 4096 map).
- The sky shader already draws the moon (a screen-space disc, `uMoonNdc`/`uMoonR`, its normal `n`, a terminator `L`, limb, earthshine,
  halo, clouds over it); only its SURFACE was invented (noise maria, seven craters). Now `uMoonMap` (`assets/moon-map.jpg`, 512 × 256
  grey, autocontrast 0.5 %, 59 KB) is read at the disc's longitude and latitude (`atan(n.x, n.z)`, `asin(n.y)`: the near side to you,
  north up, east to your right) and its brightness laid between the moon's own maria and highland colours — every light term after it
  untouched. `uMoonMapK` is 0 until the map is in (the drawn face). The model's 20 MB of geometry and texture are not used.
- `tools/moonmap.js`: the moon cropped with the map and without, and the whole view.

**THE MARK A STRIKE LEAVES (2026-11-23, the owner: "improve the marks in the ground when hitting the sand").** `stampDigHole`
(every swing that lands on sand — `digImpactCore`, the hook) laid a painted crater decal, an open cone sunk under it and a grey
cone of spoil. **The beach is an OPAQUE PLANE at y = 0, so nothing below it is ever drawn**: the sunk cone showed only as its
rim — a heptagon ring standing out of the sand round a black hole — which is the "random shapes" the owner saw. Now:
`digHoles` is a `ShaderMaterial` decal (1.8 m, per-instance `aDig` = born, length, half-width, seed) that shades a height field
(the gouge, a lip heaved up round it and piled at the front, a fan of clods) from the moon's side in the mark's own frame, on
a 2 cm grid, with a short shadow march for the lip and the floor darkened (damp, out of the light). Its blending is
`One, SrcAlpha`: **out = rgb + beach x alpha** — alpha darkens what is there (so it keeps the beach's grain, wet tint, moon
road), rgb ADDS moonlight in the lit sand's colour. A pure 2x multiply was tried first and could not lift dark navy sand far
enough to read as a rim catching the moon. **Everything is linear here**: a 0.5x darkening only reads as ~0.7x on screen, so
the contrasts (`AMB` 0.26, floor x0.15–0.3, rim add x4.6) look loud in the code and quiet in the frame. `digMounds` is a faceted
crescent of spoil (`digSpoilGeo`) in the beach's own `sandShader`, patched for instancing (`vWorldPos` with `instanceMatrix`)
and with its map/bump/emissive uv in world space at the beach's density. A blade (`opts.blade`, `isBlade()`) cuts a long
narrow slot sprayed both ways and heaps nothing; `opts.P` makes a harder swing longer and deeper. **The blade's ray is cast at
the plane, and a bank stands over it**: drifts, berms and the sand round rocks are above y = 0, and a mark laid at 0.03
there was buried (the first probe spot, x 8 z -40, sits on one). The stamp asks `beachGroundAt` and tilts to its slope.
Marks soften from 150 s to 420 s and fade beyond 20–42 m; pool 32. `tools/sandmarks.js` (via `evalFile`) finds a bank-free
stretch itself and takes stills at the game's FOV and through a 32° lens (`-g` = brightened 2.4x, to see the forms).

## Driftwood takes a swing and hits a crab (2026-11-23)
The owner: "make it so you can hit or throw these pieces of driftwood too or throw at an enemy" — "all driftwood". Every
piece was already a prop you can grab and throw; what was missing: a blade went THROUGH the wood and dug the sand under it,
and a thrown thing never hurt a crab (`thrownHits` walked `mutants` only; crabs are their own list).
- `makeProp(…, 'driftwood')` tags `prop.drift` — all three sources (the seeded wrack logs and roots, the spawn's log, the
  snorkeler's).
- `digImpactCore` asks `driftSwingHit()` (a raycast at the pieces within reach) before the solids: nearer than the sand
  and any solid, `driftStruck(h, P)` plays wood (`sfxPropHit('wood')`, `hitWood`, the blade's own sample), throws pale chips
  (`spawnPuffs` tint 0.5) and knocks the piece along the swing by `k = clamp(0.42 / radius, 0.3, 1.2)` (a 1.3 m log is
  radius 0.36, a big root 0.6-0.8), waking it (`asleep = false`); over 3.2 m/s across the ground it counts as a throw.
- `thrownHits`: a driftwood piece's reach is `min(0.5, radius / 2)` wider (a two-metre root hits past its middle); then the
  crabs — the same blow through `hurtCrab` (1, or 2 over 9 m/s), and a sleeping one is woken the ordinary way (`called`).
  NOTE: `CRAB_HP` is 2 and an ordinary throw leaves the hand at 16 m/s, so a thrown log kills a crab outright.
- `tools/driftwood.js` (devMode, the real swing via `startDig(0.6)` with the toy shovel): a root of radius 0.62 hit at
  1.4 m — peak 4.5 m/s, moved 1.10 m, 0 marks dug; the same swing at bare sand dug 1; a piece thrown at the loner 3 m off
  at 12 m/s — hp 2 → 0 on frame 10; 1.5 m to the side — no hit. No console errors.

## 2026-11-23 — the three come up out of the sea (the pack's swim-in)
"improve the 3 crabs coming out of the water cutscene". Measured first (`tools/packcut.js`, dev mode off, the real trigger,
a still every 0.4 s at the game's lens and at 30°): every crab's clip time stayed 0.00 through the whole cut — `packCut`
is `frozen()` and `updateCrabUnit` returns at `if (frozen()) return;` before `crabAnim`, so they slid in as rigid poses;
all three were hidden (`submersionAt` < 0.92 is only the last 1.5 m of surf) until ~3.4 s, so the camera spent three
seconds on empty water; and the rear-up only ran after the camera let go. Now, in `updatePack`, looks only (same 3.4 s +
0.75 s, same spots, same wake-up after):
- **Drawn the whole way; the opaque sea hides what is under it.** Each sinks LESS as it comes (`sink` 1.6 → 1.15 → 0.6 by
  progress, through `beachRestY`), so its back breaks the surface a little past halfway (~2.2 s) and it walks up out of the
  surf. The moment its shell top passes `waterSurfaceAt`: `sfxPackSurface` (moved from the old pop-in) + a sheet
  (`spawnSplash` x30), then drips every ~0.15 s while it still wades.
- **Animated** with `u.mixer` driven here: the walk clip at 0.9-2.5x by its speed; from 95 % of the swim the attack clip
  is held at `PACK_REAR_T` (0.42 of its length, claws up — the tell) rising through the hold, so the rear is ON camera.
  At release the AI's own `crabAnim` cross-fades from there.
- **Each its own line**: a sine weave of 0.55 m in z and a yaw wobble, both gone by arrival; in the last beat each turns
  to face you (forward is local −z: yaw = atan2(−dx, −dz)).
- **The lens leans in**: `packFov` (`PACK_FOV` 52, never wider than the setting) in `updateDialogCam`'s `wantFov` chain at
  rate 1.6, cleared at release so the frame's own ease takes it home. A `var`: the lens code is read by the loop, which
  can run before the module reaches the declaration. Aim lowered to y 0.25.

## The sketchbook after the drowning, and what you drew on the island's pier (2026-11-23)
The owner: after the snorkeler's rescue and before the wash, back in the intro room — the syringe empty, hazy, coming to,
a slight zoom on his blank sketchbook (his photo, `assets/sketchbook.jpg`, from `~/Downloads/IMG_7239.HEIC`, EXIF-turned
upright), a floating retro pen for a cursor, "DRAW A CHARACTER FOR YOUR BOOK", E to confirm, "NAME CHARACTER", Enter, then
drowsy, head on the table with a thud, black, the wash. At the lighthouse pier the drawing as a sprite of its own lines;
talk ("Hello!" / "What the hell are you?" → its name → "Kill me."), hit it → flinch → fade → "Existence is pain."
- **Where it runs**: the deep's black (`deep.ph` 'black' → at `WASH_BLACK`, once a game unless `skDone`) becomes
  `'sketch'` (`skStart`); `skTick(rawDt)` from that case drives it; on its end the deep goes back to 'black' at
  `WASH_BLACK − 1.4` and on to the wash as before. **A probe of it must `b.setDeepLockS(true)`**: the hook sets `deepLock`
  on the way in, and without it `updateDeep` returns as soon as `inDeep` goes false at the black — stuck there for ever.
- **The room again**: `tbStart(true)` — the title's own builder, re-run mid-game: TB state reset (`gone`, `ready`,
  `rainAudio`, `bolt`), drawn into `#sk-room` (z 10, under `#blackout` 11 and the lids 12, so the black and `eyeLids` work
  over it), no `icLoad`, `TB.reprise` (no call, no title frame, `skRoomCam` drives the lens: a sinking, swaying push toward
  the desk), the syringe `setFill(0)`. `tbStop` as ever (and it hides `#sk-room`).
- **The page**: `#sk` (z 10, after the room), a `.stage` the photo's 600:800 shape at 100vh scaled ×1.5 about the book, an
  ink canvas over it. Strokes are kept in the PHOTO'S PIXELS (`skToPhoto` through `getBoundingClientRect`, so the slow zoom
  and the sway cost nothing), clipped to `SK_PAGE` (the paper's quad, measured off the photo's white). E needs
  `SK_MIN_INK` (160 px of line). The pointer is let go (`exitPointerLock`; the pointerlockchange → menu branch knows
  `SK.on`), the scene owns the keys (`skKey` on window CAPTURE; the name box's own handlers stop its keys short of the
  game), and Enter on the name re-asks the lock (a keydown is a gesture). No page-flip or body-fall SAMPLES exist —
  `sfxHeadDesk` is synthesized (a 92 → 38 Hz body blow, low-passed knock, and `sfxThud`).
- **Load order (bit twice)**: the frame loop and a restore both run before the module is read that far — `skDone/skDead/
  skName/skInk` and `SK`, `SK_FIG`, `SK_NPC` are declared up by `packTipDone`; the restore builds the figure in a microtask.
- **The figure** (`skFigBuild`, `skFigTex`): the strokes redrawn on a canvas cut to their bounds, lines 4.5 % of the
  drawing's size, **WHITE** on the pier (owner: "draw in black but it shows up white when u see it there") though black on the
  page; a plane stood on its feet, 1.75 m, turned to you each frame (`skFigTick`), `MeshBasicMaterial`, toneMapped off.
  `SK_SPOT` (-17.55, 15.65, -1249.52): from his screenshot's readout (feet -14.39, 15.65, -1249.33, look 1.19 — the readout
  is world x, feet y, z and `lookEuler.y`); the boards end 4.2 m along that look, so 3 m out and a metre left — in front of
  the lamp post, black on black, it vanished. `groundUnder` gives the boards when the island is up, else the measured y.
- **Talk / hit**: `addInteractable(…, 'npc', { far: 4.5 })`, label "Talk to <name>"; `SK_NPC` script. `skStrike` in
  `digImpactCore` (after the crow): flinch 0.5 s (shake, squash), fade 2.2 s rising, gone; `skDead` → the toast
  ('Rare achievement unlocked', '50 - Existence is pain.') and `RARE_ACHIEVEMENTS`. Saved: `skDone, skDead, skName, skInk`.
- `tools/sketchtest.js`: the whole path (drown → room → a stick figure by pointer events → E → "Gerald" → slam → wash →
  island → talk label → strike → achievement), with stills of the room, the page and the pier.

### The sketchbook, round two (2026-11-23, the owner: "the textbook scenes after the seamonster just froze the game" / "its stuck like this" / "i couldnt even esc and reload checkpoint which i always should. there should also be a checkpoint at the start of this cutscene" / "the textbook should be show on the table like the intro too. make sure no syringes and other props are colliding on the table here too")
- **The freeze was a hidden page.** `#sk` (the book, the words, the pen) and `#sk-room` (the room) were both z-index 10, and
  `#sk-room` is made by `tbStart` AFTER `#sk` exists, so it painted over it: the scene was waiting in 'draw' for ink on a page
  nobody could see. The headless test drew blind and passed. `#sk-room` is 9 now. **A still composed in the probe is not
  the screen**: the old `pageShot` drew the photo and the ink itself, so the layering was never looked at.
- **Escape is the menu in the scene.** `skKey` toggles `openMenu`/`closeMenu` (the deep's update returns while the menu
  is open, so the scene holds); `closeMenu` does not take the mouse back while `SK.on`. Trap: a window keydown listener
  hears a key BEFORE a later-registered CAPTURE listener on the window (it is the target: registration order), so the
  game's main key handler ran first — in the drag fallback it opened the menu and `skKey` shut it again. The main
  handler now returns while `SK.on` (`SK` moved up beside `menuOpen` so it can be asked there).
- **A checkpoint at its start** (`skCheckpoint`, as the room comes up): `saveCheckpoint` then the save patched — standing
  where the sea left you, room null, `flags.skAt = [washX]`, `deepDone` still false. Loaded: `skOwed`, and the frame loop
  (beside `handGrabTick`, once `deepLive`) runs `skResume` — deepLock on, the needle laid, `deep.ph = 'sketch'`, `skStart`.
  The wash's own save (`endDeep`) writes over it. `tools/sketchload.js` tests the menu and the reload.
- **The book is on the desk** (`skDeskBuild` from `tbBuild` when `TB.reprise`): the photo squared up (`skRectify`,
  bilinear from `SK_BOOK_Q`, the whole book to the wire) onto a 0.40 x 0.30 m page on a dark board at the call's book spot
  (x 1.955, z 2.19), layer 2, drawn sharp in its own pass over the retro room (`tbRender`) like the call's syringe; a
  touch of emissive (`SK_BOOK_GLOW`) so it reads. Drawing is a ray through `TB.cam` onto the page (`skToBook`, layer 2);
  strokes are in page units (`SK_BOOK_W` x `SK_BOOK_H`; the canvas is twice that); `skBookToScreen` is the harness's way
  back. The camera (`skRoomCam`) goes from the title view to over the book, leans in slowly, and the slump goes down into it.
- **Nothing on anything** (`skDeskTidy`, the second time only — the call's desk is as he approved it): the phone where the
  call's clip lays it, the empty syringe beside the book, then every desk thing as a plan capsule (PCA of its vertices:
  axis, half-length, half-width; `skCapsule`) pushed off the book's box, the phone and each other (`skSegDist`) and kept on
  the desk. The default phone spot (1.6, 2.56) is under one of the dropped syringes — the call never shows that because
  `icPlaceProps` moves the phone; the reprise skipped it, which was the owner's "colliding".
- `tbStop`'s teardown threw on the cans (a material LIST: `o.material.map` is Array's `map`), so the room's renderer and
  canvas were never let go — after the intro too. Fixed.
- (later the same day, the owner: "enter to confirm instead" / "after you enter the drawing your cursor is seen all over again
  its dissapearing on the textbook" / "i saw a glimpse of the textbook when coming back to the beach"): the name box sits
  under NAME CHARACTER, above the book; the bottom hint is `Enter Confirm` there (lit once something is typed; E is a letter
  of a name); the pen stays shown while naming; a click while naming puts the focus back in the box, and Enter with the box
  let go of still names it. `skEnd` hides `#sk-room` and the room's canvas at once — `tbStop`'s own hide waits on its 4 s
  teardown, and the wash lifts the black 1.4 s after the slam.

## The pier figure at the pen's width (2026-11-23)
The owner: "make the drawing same thickness when you see them at the lighthouse just have it white how it is". `skFigTex`
drew the strokes at ~4.5% of the drawing's size (about four times the pen) to read from the pier's foot; now `lw = 3.1`
page units, the same as `skInkStyle`, white still, on a 1024 canvas so the thin line keeps a few texels (measured: a 120-unit
figure → 468 x 1024, the line ~11 texels). Reads fine from 3 m on the pier (`tools/devarts.js`'s still).
- (2026-11-23, "it should say enter to confirm when drawing your character") Enter confirms the drawing too, and the hint
  reads "Enter Confirm" from the start (`skBuild`, `skStart`): one key for both steps; E does nothing in the scene now. The
  probes (`sketchreal`, `sketchload`, `sketchtest`) send Enter. `sketchload` after: drawn, Enter, "Pat", Enter → the wash.

## 2026-11-23 (night) — the workshop puppets' voices
The owner, five bounces from "well guy audio/Bounced Files" ("puppet attacking sound", "puppet taking damage sound", "puppet
getting injected sound", "puppet rare phrase", and "puppet audio" — the October file the fire puppet's six pleas and scream
were already cut from, left as it is): "use these for the puppet sounds they are labeled".
- Cut by `tools/farmer_voice_pack.py "<Bounced Files>" "puppet attacking sound=pup-attack" "puppet taking damage sound=pup-hurt"
  "puppet getting injected sound=pup-inject" "puppet rare phrase=pup-phrase"` → 17 / 18 / 1 (2.9 s) / 2 takes, 516 KB.
- `MUT_KINDS.cpup.voice` is `farm: true, vox: PUP_VOX` now (still `mute`: that keeps the synth's tell/roar/laugh off; the
  farm path is `sfxMutHit`'s and the swing's, neither asks `mute`). ONE voice object for the eight, so one mouth: a cry cuts a
  grunt; seven at you are not seven voices. `swing` p 0.8 at the wind's end; `hurt` every landed blow; `shout` (the rare
  phrase) off `cpPhraseTick` (fight 1–2, a puppet up and fighting, 6–12 s for the first, then 16–32 s, p 0.6, gap 16).
  `pupInject` at the needle's stab in `cpInjectTick` (t 0.45), from the bench, into the room's hush.
- The marionette (`cmar`) is untouched: his voice is the synth throat still.
- Probe `tools/pupvox.js` (wraps `AudioBufferSourceNode.start` and names each buffer by its bank, `__bw.sampleBanksS`): the
  injection at 0.5 s, grunts on his swings, a cry on struck blows, the phrase at 10 s. Trap: `__adv` runs game time faster
  than the audio context's real clock, so `own`/`gap` (seconds of `currentTime`) eat blows a probe lands 2.5 game-seconds
  apart — 2 of 3 cried there; in play each one can.
