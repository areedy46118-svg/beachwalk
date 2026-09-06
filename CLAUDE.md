# Beachwalk — context for Claude

A first-person low-poly horror walking sim: an eerie infinite night beach.
See `README.md` for the player-facing feature list and every tuning knob.

## Running it

```bash
python3 serve.py 4173      # dependency-free static server
```

Then open <http://localhost:4173>. It needs to be served over HTTP (ES
modules); `file://` won't work. `node`/`npx` are not assumed to be present.

## Stack

- Vanilla JS, no build step. `index.html` + `main.js` + `assets/` + vendored
  three.js r160 in `vendor/three/` (imported via the import map in the HTML).
- The **whole game is `main.js`** (~2000 lines, one file, top-to-bottom).
- `.claude/launch.json` lets the Claude Code browser preview start the server.

## Architecture — the load-bearing ideas

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

**Retro look.** `renderer.setPixelRatio(RETRO_SCALE)` (~0.42) renders at low
res; CSS `image-rendering: pixelated` blows it up. `retroTex()` forces
nearest filtering / no anisotropy. Canvas textures are small (256²) and
colour-quantised. Everything is `flatShading`.

**Pointer lock is hand-rolled** (not `PointerLockControls`, so we get
sensitivity + invert-Y). `requestLock()` + `pointerlockchange` +
one `mousemove` handler. There's a drag-to-look **fallback** for browsers
that can't lock. Key gotcha: browsers enforce a ~1.25 s cooldown before
re-locking after an exit, so re-locking right after closing the note/menu
fails — handled by `everLocked` / `scheduleLockRetry()`; never fall back to
drag-look once we've successfully locked once.

**Interaction.** `updateHover()` raycasts the screen centre against
`interactables[]` each frame. `addInteractable(root, label, kind, data)` —
`kind` is `'physics'` (grab), `'inventory'` (take), or default (`data.onActivate`).
Tiny props carry an invisible `hitProxy` sphere so they're easy to aim at.
`primaryAction()` (click / `E` / `F`) routes grab / throw / take / dig.

**Examine view.** `openInspect(model)` / `closeInspect()` — a "turn the item
over" screen (like the RE inventory). `inspectScene` + `inspectCamera` render
over everything when `inspecting` (animate() early-returns); `inspectFit`
centres+scales the model, `inspectPivot` is spun by dragging `#inspect`.
`frozen()` includes `inspecting`. Used by the crab (`openInspect(crab)`) and
the syringe; reusable for any examinable item.

**The extraction / combine.** Crab + syringe are separate inventory items;
"use" *either* while carrying the other → `startExtraction()`. A scripted
sequence plays in the inspect scene: an `extractRig` holds crab + syringe with
the needle at `_hinge`, and `driveExtraction(t)` (from `updateInspect`, ~3.4 s)
pops the cap, sinks the needle, runs `syringe.userData.setFill(0→1)`, then
lifts out. `finishExtraction()` sets `crabBled`, empties + re-caps the syringe,
adds a **"Jar of blue blood"** item (`makeBloodJar()`), and shows the jar as
the payoff.

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

**And there is no environment map in this game, so METALNESS IS A TRAP.** A
metal has no diffuse term; at `metalness: 0.62` the ring rendered as a few
hundred lit facets on black, because a scan's thousands of small faces
shatter the one directional specular into pinpoints where a built model's
broad faces catch it as sheets. Tarnished metal reads far better here as a
bright rough dielectric with an emissive lift. The body bag hit this first.

**A scan with no UVs gets its texture PROJECTED — see the ring.** The
octopus ring is an STL and cannot carry UVs, so Poly Haven's rust goes on
triplanar in `iron.onBeforeCompile`: sampled along each object-space axis and
blended by the face normal. Two things it depends on: `USE_MAP` still wants a
`uv` attribute on the geometry (a zero one is added), and the blend normal
comes from `dFdx/dFdy` of the object-space position — NOT the `normal`
attribute, because `gltfpack.py --decimate` emits positions and indices only,
so `normal` reads as zero, the weights sum to nothing and the ring renders as
a black cut-out. Flat shading never notices, because three derives its
lighting normal from derivatives too. `uTri` is the tiling.

**The dock is solid from below and edged from above, and `onDock` is
STICKY.** The first `updateDock()` let the boards count as a floor whenever
your feet were within a step of them — but the drift runs on under the deck,
so walking in beneath the pier carried you up the sand until the deck took
you and you popped up through the boards; and stepping off the sea end
dropped `onDock`, brought the `WADE_X` clamp back, and threw you a metre and
a half up the beach. Same bug both times: a floor test that did not know
whether you were on the thing. Now you get on only at the buried land end
at board height, you stay on until you leave by that end, the other three
edges clamp, and off the pier its whole footprint is a wall — pushed out
along the shallowest face, never toward the buried end, and never toward a
face that would land you past `WADE_X`. The shed door is the model's own
Door mesh re-hung on a pivot with `attach()`; its doorway slab is solid
only while `dockDoorOpen` is false.

**`rockColliders` is the game's ONE list of solid things, and it is shared.**
Cylinders `{x,z,r,top}` and boxes `{x0,z0,x1,z1,top}`, each with a `mat`
('rock' or 'wood') that both a thrown prop and the shovel read to pick a
sound and a scar. The player and `PhysProp` run the same `solidDepth()` /
`pushOutOfSolids()` / `rockGroundAt()`. Two things this fixed at a stroke: a
body knew only ONE ground — the sand — so anything set down on the pier fell
through the boards to the beach; and a circle round the five-metre boat left
a metre of open air off each side that you stood on, which is why you
floated beside it. A hull is a BOX.

**Dock colliders come out of the model, in three shapes** (in its loader).
`columnsOf()` buckets vertices on a coarse grid and emits a cylinder per
bucket — the piles are a single mesh whose bounding box is the whole pier.
`slicesOf()` cuts the boat along its length and takes the beam of each
slice, because its bounding box is a rectangle with a metre of open air at
each corner where the hull tapers, and that is the invisible ledge you could
stand on off its side. `boxOf()` does the table, chair, ladder and crate,
which really are boxes. A per-vertex occupancy grid was tried for the boat
and was worse: vertices are sparse inside big flat faces, so its own floor
came out full of holes.

**The pier is an L, and its footprint is SAMPLED, not assumed.** Asking
whether you stood inside the deck's bounding rectangle put boards under you
out over open water — including right over the moored boat, which is the
invisible deck you walked along at plank height with wood knocking
underfoot. `buildDeckGrid()` raycasts down onto the floor mesh over a 0.35 m
grid ONCE at load; `deckHeightAt()` is a lookup after that, because a
raycast per frame per prop would be far too much. `onDock` is no longer
sticky either: you are on it while there are boards under your feet, so you
step off wherever they stop.

**The deck STOPS you; it never moves you.** Pushing out along the nearest
legal face flung you the width of the pier — walk in from seaward and the
sea end was the only face left, so you were shoved five metres sideways. It
reverts the frame's movement instead (`_preMove`), and where there is
nowhere legal to revert TO — at the sea end the `WADE_X` clamp pins you at
x = -2.4, which is inside the footprint — it ducks you instead. A person
under a low beam crouches; `headroomClear()` already refuses to let you back
up until you are out.

**The dock clamp must not get the last word on your position.**
`updateDock()` clamps you to the deck footprint, and running that after the
solid push-out put you straight back inside a pile — which is how you ended
up standing in one. The push-out runs again after it.

**Photo cut-out NPCs share `bakeCutout()`** — low pixel count, posterised,
graded cold, with blink as a fake eyelid (a band of forehead painted down
over the eyes, both frames baked once). Bradly and the Very Old Fisherman
use it. `startDialog(id, npc)` takes `{name, script, sprite}`; omitting it
is still Bradly. Both cut-outs come from `tools/cutout.swift`, which is
macOS Vision person segmentation and needs no dependencies:
`swift tools/cutout.swift assets/x.JPG assets/x.png 900`.

**HIS LEFT LEG IS PAINTED ON.** A photograph ends where it ends, and the
hard cut at his shin was the tell — so that leg comes off below the knee and
a peg goes on it. `paintPegLeg()` runs inside `bakeCutout` via its `paint`
hook, which fires BEFORE the downsample, the posterise and the grade: paint
it after and it sits on top of the picture looking like paint. It is painted
rather than modelled because he is a billboard and a 3-D peg would line up
from exactly one angle. The coordinates come from walking the PNG's alpha,
not from guessing.

**The pack's slots carry no names.** The pane on the right names the
selection; a name under every icon in the grid was clutter.

**The pack has a SELECTION, and the verbs are buttons.** Click a slot and
the item comes up in the pane beside the grid — icon large, name, and
INSPECT and HOLD (or USE) as the biggest things on the screen. The old
pack hid "Inspect" in a corner of the slot until you hovered it, and
nobody found it. A press ARMS a drag and it only becomes one after 6 px of
movement, so a still click selects and the two never fight; double-click
goes straight to the examine screen. The whole HUD — hotbar, rings, pack,
ghost — is the dialogue's language now: black, white, one hairline,
square, monospace, no glow and no colour. The held slot is the one solid
white line.

**The wheel walks the hotbar.** `scrollHotbar(dir)` steps through the
strip's held-able slots, wrapping, and EQUIPS — everything can be held, so
a slot you scroll onto is a thing in your hands. It accumulates `deltaY`
to 40 before stepping so a trackpad flick is one step, and it is gated on
being in the game: the examine screen's wheel is its zoom.

**Inventory icons are RENDERS, and the render target must be sRGB.** A
`WebGLRenderTarget` does not get the canvas's output transform: unless its
texture's `colorSpace` says sRGB the shader writes LINEAR values, and read
back as bytes those are the dark, flat, greyed icons the first version
had — every colour a stop and a half too dark. `samples: 4` gives them
edges. The rim light from behind is most of what reads as "detail" on a
dark object over a dark tile.

**Inventory icons are RENDERS.** `renderItemIcon()` puts the item's own
model through the game's renderer into an offscreen target, reads the
pixels, and composites them onto a dark tile with a shadow under them —
once, at pickup, cached on the item. The model is CLONED first: the
originals are live in the world, and the examine screen re-parents whatever
it is handed. Restore the renderer's target, clear colour and `autoClear`
around it; this runs mid-frame on the game's own renderer.

**The gutting crate is there to hide the cut-out's bottom edge.** A
photograph ends somewhere, and that hard horizontal line at his boots is the
one thing that gives a sprite away — so something has to stand in front of
it. A fish crate a man sitting in a shed would be working over earns its
place twice. It goes on the DOOR side of him, because a billboard is only
occluded by what is genuinely nearer the camera, and the doorway is the only
direction anyone sees him from. `bakeCutout` takes `grain` and `sat` now: he
is the one cut-out you stand close to, so he bakes at 620 px with far less
grain than Bradly, who is read across a beach.

**A billboard and a solid prop at the same spot fight.** The fisherman's
blue tub was directly under him, so the sprite plane cut through the
cylinder and the tub's front half ate his legs and boots. It is set back
0.3 m into the shed instead, behind him from the doorway — which is the
only direction anyone sees him from. And `dialogTarget` takes a `headY`,
because a sprite's origin is its centre and on a seated man that is his
chest, so the push-in framed his jumper.

**A click finishes the typewriter.** `typeLine()` keeps its completer in
`typeFull`; `finishTyping()` runs it, and the dialogue's click handler
tries that FIRST and returns, so the click that puts the line up never
also dismisses. Reading faster than the typewriter is the normal case.

**An interactable's `when()` gates it on the WORLD.** `updateHover()`
raycasts only an interactable's own meshes, so nothing in this game is
occluded by walls — the fisherman was hailable straight through a shut
door. Anything that should only exist under some condition needs `when`.

**`headroomClear()` gates standing up, and it RAYCASTS.** It asked whether
you were inside the pier's plan rectangle first, which is a much bigger
thing than the pier's roof — the boat is moored inside that rectangle with
open sky above it, so standing up beside the boat was refused. A ray up from
your head knows the difference. It also uses a narrower body than the
push-out for the analytic colliders: at the full radius, standing beside one
of the pier's bollards counted as a ceiling. Jumping stands you up first.

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

**A gib's ground is a LOOKUP, not a number it was born with.** Crate boards
carried `rest = crate.y`, so the dock crate's boards held deck height
wherever they flew and the ones that cleared the edge hung in the air beside
the pier. `updateGibs()` asks `dockDeckAt()` every frame and falls back to
the sand, so a board that leaves the boards falls to the beach. It also
rests on HALF ITS OWN THICKNESS and lands FLAT: a board is a thin box up to
0.36 long tumbling on three axes, and resting its centre on the ground
buried a corner every time, which is the plank sunk into the beach.

**A dropped thing goes where you were LOOKING, on top of what is there.**
`dropEquipped()` set the item down at a flat y = 0.04 — the sand plane — a
metre in front of you whatever you were standing on, so on the pier it went
UNDER the boards and on the drift it went inside the mound, and either way
it was gone. `dropPoint()` raycasts the crosshair at the boards, the steps,
the banks and the beach, and `groundUnder()` is the fallback: `driftAt`,
then the deck, then the solids.

**Splashing needs a reason.** Three separate sources each fired without one:
a prop resting near the waterline crossed `submersionAt` every few seconds
as the swash moved and splashed each time (it needs an arrival SPEED); the
crab wading fired `sfxSplash`, which is not positional, from anywhere on the
kilometre (it needs a distance gate); and landing splashed off `inWater`
alone, which is true above the sea as well as in it.

**The examine screen dies if the pack re-locks the pointer.** `closePack()`
re-requests pointer lock asynchronously and it lands a frame later, on top
of the overlay, eating every click, drag and scroll — turning, zooming and
clicking out were all dead. Clear `packReturnLock` FIRST. Same trap the
combine recipes hit.

**The blade's DIRECTION is locked at commit, its ORIGIN is not.** Both used
to be, and at a run you had moved two metres past the point by the time the
blade fell, so the crater opened at your heels.

**Crouch is a toggle (Ctrl), and it is what gets you under the pier.**
`playerEye()` / `playerHeight()` replace the EYE_HEIGHT constant everywhere
"where are my feet" is asked; `updateDock()` only makes the footprint a wall
when `feet + playerHeight() > DOCK_DECK`, so crouching walks you under it —
the piles stay solid because they are real colliders.

**Splashing is for walking THROUGH water, never over it.** `wading` is
gated on `!onDock && !onShip` and on your feet actually being near sea
level; before that the pier's boards splashed underfoot.

**Everything can be held, and examining moved into the pack.** `holdable()`
gives an item a view model cloned LAZILY from the same object the examine
screen shows — lazily because the ring and the key are scans that land over
the network long after the item exists. `use` equips; the pack's per-slot
Inspect button is the only way into `openInspect()`, which now names what
you are holding.

**Crates are a factory now** — `buildCrate(x, y, z, yaw, onBreak)` into
`crates[]`, walked by `crateStrike()`; `crate`/`breakCrate()` still mean the
first. Gibs and puffs take the crate's own `y`, so the deck crate's boards
land on the deck. The key it holds is set down, not thrown: `PhysProp`
knows one ground, the sand, and a body bouncing on a deck two metres up
falls straight through the boards. The key itself is Sousinho's scan
(`assets/key.glb`), loaded async into the `keyModel` Group like the ring.

**The dock house is a fixed world object like the wreck** (`DOCK_*`,
`updateDock()`), sixty metres past it. The model is built at about 1:2.8 —
its door is 65 cm — so it is scaled to a door you can walk through and turned
-90° so the shed end is landward; model x runs down world z and model z back
up world x, and `updateDock()` works in model space. You get onto the boards
by the DRIFT, a `makeApron()` dome of the beach's own sand banked against the
land end, which `driftAt()` also serves as terrain. The boards only count as
a floor when your feet are already within a step of them, so walking under
the pier keeps you on the sand; the shed's walls are five thin slabs with the
doorway left out, pushed out of along the shallowest face and only at deck
height. `onDock` lifts the `WADE_X` clamp because the sea end stands past it.
The two lamp materials are lit and carry a PointLight each; the whole thing
is in `farProps` at 300 m.

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

**Anything flat stuck to the wreck's hull is built from `hullPt()`.** The
plating flares and tumbles home, so a plane hung at one beam floats off the
plate within a metre; `hullQuad()` puts all four corners on the loft. The
porthole streaks and the name on the bows go through it, and they are
`noBake` so `bakeGroup()` leaves their materials alone. `hullQuad()` is a
GRID, not a quad: the hull is convex both ways, and a flat quad between two
points on it is a chord whose middle lies inside the plate — the name was
drawn that way first and only its two ends showed.

**The hold's inner walls are an inner skin on the same loft.** They were
flat slabs 2.8 m off the centreline the whole way down, and below the
porthole line the section tumbles home to ~2.3 m — so along the length of
the hold the inner wall stood PROUD of the plating and, from the beach, the
lower half of her was one black slab with a hard straight top edge. That
was the wreck's "it looks like slop" from the day it was built, and no
amount of texture fixed it. If the lower hull ever reads as a black band
again, raycast into the side: the first hit must be `M.hull`.

**The shells are a scan** (`assets/shell.glb`, blenderboom's, 11 cm at true
size and laid down at 2–3×). The placement and its interactables run in the
loader callback. Holding one to your ear is `listenT` in `updateViewmodel()`:
the arm blends to `EAR_AT` / `EAR_POSE` while `listening`, with the look-lag
mostly off on the way there. `__bw.listen(v)` flips the state without audio
for the preview harness.

**Textured scans come in through `tools/gltfpack.py`.** `gltfslim.py` throws
the maps away (right for the flat-shaded crab); `gltfpack.py` keeps them, and
is what the rocks and the body bag went through. It rebuilds the binary from
scratch so dropped attributes actually leave, downcasts 32-bit indices,
resizes every image and re-encodes it as JPEG (Sketchfab ships 4096² PNGs —
344 MB for six little rocks), and **rewrites
`KHR_materials_pbrSpecularGlossiness` into metallic-roughness**. That last one
is not optional: three r160 dropped the extension, and a spec-gloss model
loads as blank white with no maps at all, which is exactly how the body bag
first looked.

**Object models.** `models/` holds standalone factories (`makeHorseshoeCrab()`,
`makeSyringe()`, `makeBloodJar()`) plus `viewer.html` (`?model=…`), a
drag-to-rotate dev viewer. Factories `import * as THREE from 'three'`, return a
`Group`, use metres, `+Y` up / `+Z` forward. **Smooth-shaded**, a deliberate
exception to the flat-shaded retro look because they're hero props seen up
close. The syringe and jar carry `userData.setFill(t)` + `userData.parts`.

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

**Flicker is always coplanar faces.** The two that bit: the door frame's
back face sat exactly on the wall's front face, and the threshold slab's
top was exactly level with both the bore invert and the room floor.

**The crosshair can thread a grille.** The back-wall outlet needs an
invisible `hitProxy` disc across the bore, or the centre ray passes between
the bars and straight down the open pipe.

**The peek never drops the pointer lock.** `pointerlockchange` treats any
exit it did not cause as "the user hit Esc" and opens the settings menu, and
`peeking` was not in its guard list — so E on the gate opened the menu on top
of the peek. `startPeek()` holds the lock (mouse look is gated by `frozen()`,
which includes peeking) and the guard names `peeking` too. Anything else that
freezes the player should do the same, or be added to that guard.

**The string courses are open-ended cylinders.** `CylinderGeometry` caps by
default, and three capped bands round the outside of the shaft are three
solid discs straight through the bore — floors at 7, 14 and 20.5 m that you
climbed up into. Pass `openEnded = true` on anything ring-shaped that crosses
the shaft.

**The blade lands ON the crosshair.** The poses put the blade at a fixed
spot in the lower right whatever you were aiming at, so a swing at the crab
or a crater four metres out finished with the shovel a hand's width from it
and the hit happening somewhere else. The crosshair is fixed, so anything
the swing meets is at the centre of the screen, and the blade has to be
there too. `aimLand()` finds what the ray will meet when you commit — the
same things `digImpact()` tests, in the same order — and `landBlade()` in
`updateViewmodel()` translates the whole rig each frame so the middle of
the blade's lip sits on that point's screen position (projected by the
main camera, unprojected by `vmCamera` at the lip's own depth, so the two
cameras' FOVs never have to agree). The correction is measured off the
UNCORRECTED pose every frame, so it never feeds back; the weight follows
the strike's own easing in, holds through the impact and the hitstop, and
eases off in the recovery. THE SWING GOES WHERE YOU LOOK: with nothing in
reach the point is on the aim line itself, an arm's length out (`SWING_AIR`),
so the blade passes through the crosshair whatever the pitch — it used to
land at your feet, which dragged every swing made looking up down into the
sand, and the owner looked straight up and still dug. A swing that meets
nothing is a whiff now, not a scuff: no crater, a little jar, and that is
all. The target is clamped to the frame so the blade never leaves it.

**A click is quick.** The light swing is 0.44 s end to end and the blade
is down 200 ms after the press (`DIG_DUR * (0.55 + P)`); a heavy is nearly
three times that. It was 370 ms, which is long enough to feel like the
game thinking about it.

**Sand does not crack.** `sfxCastleBreak()` is a soft low give, one of the
recorded sand impacts pitched down under it, a second of granular crumble
closing down as the pile settles (timed to the slump's 70 ms layers), a
few dull lumps landing, and a fine hiss of dry grains sifting off the heap
at the end. The crate's knock was there first and it was wrong: a castle
is damp sand, not boards.

**The swing lands where you aimed when you committed it.** `startDig()`
captures the camera ray into `_aimO/_aimD`, and `digImpact()`, `crateStrike()`
and `glassStrike()` all use `aimRay()` — never the live camera — because the
blade lands 130–370 ms after the click or the release, and by then you have
looked somewhere else. The crab is a ray-to-body test now (aim line within
0.62 m + 0.25 P of its centre), not "any impact within 1.5 m": at 3.2 m on a
heavy you could kill it looking at the sand beside it. `hitConnect(P, k)` is
the confirm on anything solid — a FOV punch that eases back through
`updateDialogCam()`, trauma, a blade jar, a beat of hitstop, `sfxConnect()` —
and `flashMats()` turns the struck thing white for the frozen frames. Sand
gets none of it; sand is not a hit.

**The stuck gate — "Look inside".** That outlet is now the game's one set
piece of pure looking: `startPeek()` / `updatePeek()` / `endPeek()`, with the
eyes in `makeGateEyes()` / `updateGateEyes()` and the sound in
`startPeekAudio()`. Behind the bars is eight metres of ribbed pipe (built in
`models/drainage-tunnel-home.js`, capped by an `M.void` box so the sky dome —
which is centred on the player — doesn't show through the open end). Four
things carry it and none of them is a jump scare:

- **The lean is a camera move, not a player move.** `update()` starts by
  putting `camera.position` back on `_peekHome` while `peeking`, so every
  clamp below it — cliff, drain walls, floor — sees a position it agrees with;
  `updatePeek()` at the bottom of `update()` writes the leaned camera back for
  the render. Skip that and the clamps get a frame of a body half inside a
  wall and hand it back to you when you stand up. It also clears `_shakePrev`
  each frame, or the trauma shake leaves a stale offset behind on exit.
- **Where you stop is load-bearing.** At 0.4 m the FOV-24 crop threads clean
  between the middle two bars and you are simply *in* the pipe. 0.78 m keeps
  the grille in frame, and looking through something you cannot open is the
  whole point.
- **The eyes must not be there when you arrive.** They fade up 1.5 s after the
  lean settles and are gone 2.4–4 s later, between one frame and the next.
  They are a DRAWING — a pair of eyes in ink on white, knocked out to alpha by
  `tools/knockout.py` into `assets/eyes.png` and put on a plane, tinted down
  with `MeshBasicMaterial.color` so white paper reads as skin in a black
  drain. Two models were tried before it (a canvas pair, then a real eyeball
  glb) and both read as lights or as cartoons at that distance; ink does not.
  And they happen ONCE a game: `eyesSeen` is set the moment the fade passes
  0.35, and every later peek starts with `gone = true`. A second showing
  would make them a feature of the gate; the first made them a thing that
  happened to you.
- **`createMediaElementSource()` can only be called once per element.** The
  whisper graph is built on the first peek and kept; later peeks ramp the gain
  and call `play()` again. Rebuilding it stacks a second chain off the same
  source and the whispers get louder every time you look in.

The **erosion channel** outside can only ever sit *above* y = 0 — the beach
sand is a flat plane recentred on the player, so a trench cut below it would
just be covered over. The depth reads from the berms heaped either side, and
those are squashed icosahedra using **the beach's own `sandMat`** (passed in
via `makeDrainTunnel({ sandMat, wetSandMat })`) — boxes in a bespoke colour
read as pale slabs dropped on the sand, which is exactly what it looked like
first time round.

Ambience is synthesised in `startDrainAudio()` / `sfxDrip()` and ramped by
`drainMix` (how deep you are), which also ducks `waveBusGain` so the surf falls
away behind you; `mouthNear` drives a separate trickle layer at the outfall.
`updateDrainDrips()` drops visible droplets and fires `sfxDrip()` — panned by
where the drop is relative to your view — at the moment one lands. Note
`exponentialRampToValueAtTime` throws on a zero target, so the drip gain is
guarded: `drainMix` can reach 0 while a drop is still falling.

A full **bottle of water** (`models/water-bottle.js`) sits by the bed —
`waterBottleItem`, takeable with `E`, examinable like the crab. It is not
wired to `hp`; making it a consumable would just need `use` to call a heal.

**THE WHEEL, THE STAR, THE HEAD, THE KEY, THE DOOR — one chain, and every
link had a break in it.** `dragWheel` was defined and never called: the look
handler took every mousemove, so the wheel could be grabbed and let go and
never turned. It is routed first now, ahead of `applyLook`, while
`wheelGrab`. The puzzle is a BEARING, not a lock: ONE star (`helmStar`) is in
the sky always, off her port bow, blinking on an irregular count (`bwHashJS`
of the beat, not a sine — a swelling star is a lamp), and holding the wheel
at `HELM_STAR_DETENT` for 0.8 s solves it and `dropShipHead()` lets the hook
go. The head is alexrmartinez's scan (`assets/head.glb`), and it could NOT
go through `gltfpack --decimate`: vertex clustering keeps positions and
indices only, and a face is a UV atlas — it rendered as a flat red blob.
`tools/head_pack.py` decimates in Blender, which keeps the UVs; note the
glTF importer loads images LAZILY (`has_data` false until the pixels are
touched), and the first build shipped the 2K PNGs whole. The built head's
Group is kept and emptied and the scan lands in it, so the hook, the
examine screen and the pack all hold the same object; the scan faces +Z in
its own frame and is turned to face the helm. The key is a SECOND load of
`assets/key.glb` into `boatKey`, a Group that exists synchronously, because
`boatKeyItem` and `holdable()` name it at module time — the old code read
`shipHead.userData.key` and nothing ever set it, so the key never existed
and the door could not be opened. `holdable` clones lazily, so an empty
group is fine.

**THE DECK EDGE IS WHERE THE PLANKING IS.** The deck's geometry takes its x
from `hullPt` — rake included, nearly two metres forward — but the walk was
clamped on the raw station, so at the bow you stood behind an invisible
wall short of planking you could see and the bow flanks looked wider than
you could walk. `deckHalfAt(lx)` inverts the rake now off a table built on
first use (`buildDeckEdge`, needing `rakeAt` and `hullPt` on `SN`), and the
deck's floor and end clamps run in the planking's frame. **AND THE LADDER
WELL HAS A LIP.** Its floor is the ladder, a ramp to the hold, so a step
across its side from the deck put the ladder two metres under your feet —
"falling off" on a deck with an unbroken bulwark. It is solid on three
sides from deck height and open only at its head, and anyone already on
the ladder is below deck height and walks through all of it.

**The wreck.** `models/shipwreck.js` → `makeShipwreck()`, the **Limulus** — an
old horseshoe-crabbing boat, which is why her gear is aboard and why the catch
is still in the hold. She lies across the beach at `SHIP_X` / `SHIP_Z` and
blocks the walk; you get past it by going through it.

The hull is a loft with `beamAt` (fined stem, rounded transom), `flareAt` (bow
flare), `rakeAt` (the stem leans forward as it rises) and **`sheerAt`** (the
deck line lifts to both ends). Sheer is the one that stops a hull reading as a
shoebox — and because the plating follows it, `shipFloorAt()` has to as well
via `deckYAt(lx)`, or you float over the bow and sink at midships. Collision is a **floor lookup**, not a solid: `shipFloorAt(lx, lz,
feet)` returns the highest walkable surface at or just below your feet, so the
hold floor and the deck can sit at the same (x, z) without fighting — the deck
is only selectable once the stair has actually lifted you. Anywhere inside the
hull with no floor is solid and pushes you back out.

Two things that had to be got right, both found by walking it:

- **Which lateral clamp applies is decided by *where* you are, not by how high
  the floor is.** Keying the hold's walls off "below deck level" made them
  apply to the exit ramp too, and they shoved you back up it every time.
- **Holes in the deck must not sit across the route.** The stair well was
  originally on the far side, which left a 0.4 m ledge between it and the
  bulwark — not a path. The stair is now on the side you come in, so climbing
  it leaves you on open deck with a clear run to the ramp.

**Breakable glass is `shatterGlass(prop, mesh, speed, radius)`,** hung off a
`PhysProp`'s `onImpact`. It kills the body, drops the prop out of the scene
AND out of `interactables` (leave it in and you hover "Pick up glass float"
over a cloud of shards), and throws shards as real `gibs` so they bounce and
settle like everything else. The bottle predates it and still has its own
inline version because it also has to leave the note behind.

**The crate and the ring.** The crate under Bradly is the game's one lock:
`crateStrike(P)` raycasts the crosshair at the crate itself — reading the sand
under it lands the ground point a metre past the far side when you aim at the
lid — and only `P >= CRATE_POWER` (0.75, ~two-thirds of a charge) breaks it.
It is a `rockColliders` cylinder while it stands, removed in `breakCrate()`.
The ring (`models/ring.js`) is a takeable that `openInspect()`s with
`equipLabel`/`onEquip`; `E` in the inspect view — not the click, which already
means "put it away" in there — calls `wearRing()`. Worn rings live in
`rings[]`, a separate array from `inventory` so `RING_SLOTS` is a real limit,
rendered by `renderRings()` into `#rings` under the hotbar; both sit in the
`#gear` column so the rings stay under the hotbar however many slots it has.
`#rings` stays hidden until `ringsFound`. `wearRing()` refuses a ring already
in `rings[]` — it duplicated once.

**The body bag.** `CORPSE_X/Z/YAW`, thirty metres short of the wreck — the
whole point of it is the approach, so everything about the placement serves
being seen from a long way down the beach:

- **It has to be clear of the water, and that is a hard number.**
  `shoreLine()` = tide(±3) + swash(±3.6) + wobble(±2), so the waterline can
  reach x = 8.6 and the sand plane discards a further metre seaward of it. Put
  the bag below that and the surf draws over the sand under it and it sits on
  the water like a raft. At `CORPSE_X` = 9.6 the body spans 8.9 to 10.3 and is
  never wet — measured, not guessed: sampling `shoreLineJS(-126, t)` over an
  hour of game time peaks at 8.13.
- It is skewed off the shore line with the head end nearest you, tipped onto
  one side, and settled into a `makeApron()` drift. That drift is kept **low**
  (0.085) — at the height it started at, its own shaded flank drew a dark halo
  round the bag.
- Four cylinders in `rockColliders[]` down its length make it solid. You walk
  round a body; you do not walk through one.
- The crosshair gets an **invisible box proxy**, not the model. The ropes are
  235k triangles and `updateHover()` raycasts every interactable every frame.
  Its label is `bare: true` — there is nothing to do here, which is the point.

**The hull had no UVs until Sep 2026.** `hullGeo()` and the deck plating set
only `position`, so `map: hullMap` sampled one texel and the wreck drew as a
single flat brown — the whole "it looks like slop" complaint was a texture
that had never rendered. Both write `uv` now (u along her length, v keel to
rail), the hull is smooth-shaded (a 44-station loft under flat shading is a
row of slabs), the map repeats ONCE up the hull so the weed line at the sand
appears once, and she is lifted off her own map like everything else on the
beach. If a wreck detail looks flat, check the geometry has `uv` before
touching the material.

**The lantern is built to a photograph of a real one.** A drum lens on a
steel column — a glass cylinder banded with the horizontal prism rings that
bend the light into a sheet, panel astragals, a brass crown — not a glowing
sphere inside three hoops, which read as a light bulb in a greenhouse. Round
it: a rusted sill ring where the glazing beds into the deck (the only warm
colour up there), twelve heavy astragals with foot castings rather than
sixteen thin ones, a cornice, and a black roof with its ribs showing, a
ventilator cowl, a finial and a ball. `lampCore` is still the small burner
inside the drum, because `updateTower()` flashes it.

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

**Everything a mound gives up carries a shine.** The glowstick lights
itself, so it was obvious; everything else was a dark object dropped on a
dark beach at the moment the screen was full of flying sand, and it went
straight past people. `addItemShine()` on the relic, at a good size. The CD
is also STOOD UP in the hole rather than laid flat — face up it is a
hand-sized rectangle seen edge-on from standing height, and it read as a
sliver.

**A buried cache has to look like something you would DIG.** `moundMat` was
`0x74809a` — the beach's own cold blue-grey — so a cache read as one more
grey lump on a grey beach and nobody dug it. Dry sand turned up out of a
hole is warmer than the wet flat it stands on, so the mounds and the spoil
`_sandMat` are tan and matte with a little lift to catch the moon. The
aprons and drifts are NOT this: they are the beach heaped up, they keep
`sandMat`, and a tan pass over them made the pier's bank and the castle's
foot read as painted discs.

**Sink a rim, don't dither it.** The ridge's edge was first dissolved against
a hash keyed to height. The ridge climbs slowly, so even a 0.4 m band of
height is metres of ground, and seen along the slope half the headland turned
to speckle. Dropping the last third of a metre BELOW y = 0 lets the beach
plane — opaque and right there — cover the join, which also ends the
z-fighting the two had while coplanar at the toe.

**A footprint's rim has to be a RING.** `makeFootTexture()` draws heel, ball,
arch and five separate toe pits, and the thing that makes it read as a print
is the pale lip of displaced sand round it. Drawn as radial gradients whose
inner stop sits inside the part, that lip FILLS each part pale — and since a
night beach is nearly black the pale wins and the whole print is a white
ghost, which is exactly what the first build did. It is strokes now, offset
toward the moon and stacked wide-then-narrow for softness, leaving the middle
to the dark pits. Toes must also stay clear of the ball; joined to it they
read as a paw.

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

**Physics.** `PhysProp` class + `physProps[]` — a tiny custom rigid body
(gravity, ground bounce/friction, corridor walls; **no prop-vs-prop
collision**). Grab springs the held prop in front of the camera; click again
throws; `G` drops.

**The Military Shovel is a scan, and there is ONE shovel in hand.**
howittworks' "Survival Shovel" (`assets/military-shovel.glb`, through
`gltfpack.py` at 2048 with its normal and metal-rough maps kept — 1.8 MB
because looking like the photograph is the point). It is a second dig
item: `onDig` plus its own `lip`, and `toggleEquip()` points `toolVM` at
whichever dig tool is equipped and re-hangs `trailTip`/`trailRoot` at that
tool's lip — the dig, trail, overhead roll and hit flash all name `toolVM`
now, never `shovelVM`. `orientMil()` puts the scan (95 cm down model X, in
cm, a Z-up root matrix) into the sand shovel's frame with one rotation
matrix and a 0.25 lift, so every pose holds untouched. **WHICH END IS THE
BLADE:** the wide flat thin part at model -X is the D-HANDLE — a loop of
steel is flat; the blade is the wide part at +X that sits OFFSET in the
thin axis, a dished plate bent off the shaft line. The first build took the
flat end for the blade and the tool hung upside down, striking with the
grip. The matrix's rows are x = -Lz, y = -Lx, z = +Ly: blade down, plate on
the -Z scoop side. **And no night lift on it at all** — olive drab under
any gamma lift read as highlighted; the map is multiplied DOWN (0x8e918a),
roughness 1, metalness 0.12. **The "lit up" look was the GLINT.** `clone(true)`
shares materials, and `addItemShine` lifts the emissive of every material
under the beach copy every frame — so the copy in the hand and the pack
icon glowed a flat blue-grey with it, and no amount of material tuning
touched it. `orientMil()` clones the materials per copy now, and
`addItemShine` takes `lift` (0.25 here) because a dark textured scan is
swamped by the stock lift. If a scan ever reads as a flat grey cut-out,
read its `emissive` before touching anything else. The scoop faces the
dirt in the hand: rows x = +Lz, y = -Lx, z = -Ly. The Military Shovel
plays its steel block on every block AND under the parry ring. Three
groups, because the scan lands over the network: the hand's, the
examine/drop copy, the one on the beach past the drain. Its placement
must not read `DRAIN_X` — declared thousands of lines later. Three
owner-supplied impacts hang off the two tools: a paint can is the sand
shovel's block (`blockSand`), a solid metal hit is the Military Shovel's
block (`blockMil`, both in `blockCrab`) and another is its heavy landing
(`milHeavy`, in `hitConnect` at P ≥ 0.5), and two more are its LIGHT hit
on a crab (`milLight`, in `digImpact`'s crab branch, one of the two at
random); none is redistributable.

**The shovel is built to a photograph of a plastic beach shovel.**
`makeShovel()` is a triangular loop handle with finger scallops along the
grip, a round shaft swelling into a socket, and a scoop that is a real
TROUGH — a parametric sheet (`sheet(u, v)`: rims curling toward the open
-Z face, a back wall at the neck, a shallow bow along the length)
thickened into ONE closed shell — outer face, inner face and a strip round
the edge in a single indexed geometry, so the smoothed normals run over
the rim and it reads as a moulded lip. The first build drew the sheet
twice with a tube glued round the edge and the seam showed at every
angle. The old one before that was five boxes and a torus. Smooth-shaded,
like the other hero props, with a little clearcoat. **The shaft is on the
BACK** (`BK`, +Z): the socket, rib, shaft and handle all sit behind the
back wall, so from the open face you see the trough and not a shaft lying
in the bowl — which is how it first came out, and which is a shovel you
cannot dig with. It keeps the old footprint exactly — shaft
0 → 0.6, grip at 0.66, blade 0.02 → -0.21, ±0.1 wide, scoop facing -Z —
so the view-model pose, the trail markers at the lip and the world
placement all hold. If you change the blade's extent, move `trailTip` /
`trailRoot` with it.

**The cover is a name in plain white capitals over near-black.** Minimal
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

**First-person hand.** Rendered in a **separate overlay scene**
(`vmScene` / `vmCamera`, `renderer.autoClear=false; clearDepth()`).
`armRig` = a bare skin-toned hand/forearm; `toolMount` at the fist centre
holds tool models (the shovel). `layoutViewmodel()` positions the hand from
the view camera's half-extents so it stays framed at any window aspect —
call it on resize. The dig swing is driven by `digT` (0→1 over `DIG_DUR`)
in `updateViewmodel()`; the impact fires at the halfway point.

**Digging.** `crosshairGroundPoint()` raycasts the crosshair onto `sand`.
`digImpact()` stamps `digHoles` (flat crater decal) + `digPits` (sunk 3D
cone) + `digMounds` (spoil), spawns `spawnPuffs()` sand chunks, and plays
`sfxDigImpact()`. Pools recycle after `DIG_POOL` (20).

**Audio** is all synthesised in `startAmbientAudio()` / `sfx*()` (wind, surf,
footsteps, dig, glass). The **one sample** is `assets/backrooms.m4a` — the
opening music, faded in/out via a Web Audio gain chain in `startMusic()`
(`MUSIC_*` consts), started when the intro ends.

**Opening.** Title card is bare "BEACHWALK" + controls. `beginGame()` (on
the overlay click) requests pointer lock *on the gesture*, then runs the
black `#intro` card: the line fades in, holds, fades out, world fades up,
`introDone = true`, music starts. `frozen()` includes `!introDone`.

## Dev mode

`DEFAULT_SETTINGS` are the owner's own (music 30 %, waves 18 %, effects
57 %); "Reset to defaults" in the menu puts them back and saves. Note the
harness exposes `settings` through a getter: the reset REASSIGNS the module
variable, so a captured reference goes stale.

`settings.devMode` is NEVER persisted: it is forced off after the saved
settings load and written out as false, so a game always starts as a game
whatever the last session was doing. It is the last toggle in the settings menu, "Dev mode — no
deaths, no cutscenes", persisted with the rest of `beachwalk.settings`. Two
effects, both at the one door each thing goes through: `damagePlayer()` still
lands the hit (flash, knock, sound) but clamps `hp` to 1, and `playerDied()`
refuses outright, so nothing can finish you; and `updatePack()` skips the
swim-in — the three are put ashore at `PACK_SPOTS`, awake, on the frame you
cross the trigger, so the fight can be tested without the camera being taken.
The crabs never wake in it either (`updateCrabUnit` returns before the wake,
and an awake one never starts a swing), so they sit at their spawns — the
pack stays out at `PACK_START_X`. The peek and the dialogues are
player-initiated and are left alone. Off by default; it is for walking the
beach, not for playing it.

## Working in the Claude Code browser preview

The preview browser can't use the real Pointer Lock API and **throttles
`requestAnimationFrame` when its pane isn't focused**, so live movement is
hard to drive from `javascript_tool`. Instead:

- `window.__bw` exposes `scene`, `camera`, `state()`, `music()`, and helpers
  like `startDig`, `spawnPuffs`, `toggleEquip`, `beginGame`, `showEnd`,
  `openInspect`/`closeInspect`, `startExtraction`, `crab`, `syringe`,
  `bloodJar`, `crabItem`, `syringeItem`, `jarItem`.
- Aim with `__bw.look(yaw, pitch)` or `__bw.lookAt(x, y, z)` — a bare
  `camera.lookAt()` is undone by the loop. For a still, freeze the loop
  (`window.requestAnimationFrame = () => 0`), place the camera, call
  `__bw.renderer.render(__bw.scene, __bw.camera)`, and screenshot in a
  SEPARATE call. A frozen loop never re-runs `updateFarProps()`, so a
  far-culled group (the camp, the dock) you teleport to stays hidden until
  you set its `visible` yourself.

## Gotchas worth knowing

**A new `three/addons/…` import needs adding to TWO import maps.** There is no
build step, so `three/addons/utils/BufferGeometryUtils.js` is a bare specifier —
a nickname the browser will not guess at. It only resolves if it is listed in
the import map, and there are two of them: `index.html` for the game and
`models/viewer.html` for the dev viewer. Miss either and that page dies with
`Failed to resolve module specifier …` before a single line runs — a blank
screen, not a degraded one. Being present in `vendor/three/` is not enough:
`BufferGeometryUtils.js` sat there unreferenced for ages and still had to be
mapped the first time something imported it.

**Declaration order matters.** `main.js` is one long top-to-bottom module of
`const`s, so anything that *calls* `addInteractable` or pushes to a shared
array must appear **after** that array is declared, or you get a temporal
dead zone error at load. The lighthouse door and the pickup-shine helper both
had to be moved for this reason.

**All one-shot sfx go through `sfxOut()`**, which returns the SFX bus. Never
`connect(ctx.destination)` from an effect — that bypasses both the Effects
volume slider and the master volume, which is how digging ended up deafening.
Music is the deliberate exception.

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

**The walk ends when you put your hand on the light.** Not by arriving, and
not by stepping onto the gallery — that fired `showEnd()` off a two-metre
drift and finished a kilometre by accident. The optic carries a `hitProxy`
cylinder sized to the whole lens (the crosshair cannot find a 0.19 m burner
through a glass drum), registered as an interactable far down the file
because `addInteractable` does not exist where the lantern is built. `Enter`
is an alias for `E` everywhere, for the people who reach for it on a prompt.

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

**The tunnel is region-clamped, not collided.** The cliff is one mesh that
snaps back onto the player every `CLIFF_PERIOD`, so a hole cut in it would
repeat down the whole beach. Instead the bore stands proud of the dune toe at
`TUN_BORE_X`, the cliff material discards fragments across the mouth in WORLD
space (same trick as `clipAtShore`), and `updateTunnelBounds()` clamps you to a
box for the corridor and a bigger box for the room. `inTunnelMouth()` is what
lifts `CLIFF_BLOCK_X`, and only down low. The room at the end is a stand-in,
not the reference model.

**The shovel has two swings.** Left click is the plain dig; holding right winds
up (`startWind`/`releaseWind`, `WIND_FULL`) and `digPower` 0-1 then scales the
pose amplitude, the swing duration, the reach, the crab kill radius, the
trauma, the sand thrown and the pitch of the impact sample. `winding` must be
cleared on blur or the shovel stays over your head.

**Why the release used to lag, and why the animation is pose-to-pose now.** A
charged swing went through `startDig()` like any other, and `startDig()` starts
the animation at p = 0 — which is *anticipation*, the segment that hauls the
tool up from rest. Letting go therefore snapped the shovel out of the pose you
had just spent a second winding into, dropped it to rest, and spent another
0.4 s winding it up again before it fell. Two artefacts, one cause.

So the swing is now three lerps between poses — `[pitch, lift, yaw, roll,
push]` arrays, `_poseA` (where the strike starts) → `_poseB` (where it lands)
→ rest — instead of five hand-written curves per segment. `_poseA` is
`haulPose()` for a left click and, for a release, **the pose the last rendered
frame actually left the arm in**, captured off `_pose`. `digT` starts at
`DIG_WINDUP` for a charged swing, so it enters the strike immediately. Release
to blade moving is one frame, and measured off `armRig.rotation.x` the pose
moves 0.007 rad across the release boundary.

**The swing trail.** Follow-through and arc, in `updateTrail()` — a ribbon
strung between two markers at the **ends of the blade's lip**, sampled every
frame through the strike and left to fade. Two things it got wrong first:

- **Strung down the tool instead of across the edge** it is 0.3 local units
  wide, and swept through four radians that is a solid white fan over a
  quarter of the screen. Across the cutting edge it is exactly as wide as the
  blade and draws the path the edge actually took. Ten samples, not eighteen:
  a trail is a smear behind the blade, not a diagram of the whole swing.
- **The quads overlap** where the arc doubles back, and additive blending adds
  every one of them, so a per-quad alpha that looks faint alone stacks into
  white. It has to be set far lower than it seems it should be.

It lives in `vmScene`, deliberately not under the arm — the whole point is
that it stays where the blade was while the blade moves on. Its brightness
scales with `digPower`, which is the clearest read the player has on how hard
they just hit.

Three more things that make a heavy feel like one:

- **Reach.** `DIG_REACH` 4.2 m, `+ digPower * DIG_HEAVY_REACH` 2.4 more. Only
  the raycast's `far` changes, so it shows up as *angles you can only land
  wound up* — at a shallow enough pitch a click scuffs the sand at your feet
  and a heavy craters five metres out. `impactPose()` pushes the arm from
  0.62 m in front of you to 1.06, which is the visible half of the same thing.
- **Hitstop stalls the world, not your hands.** `killCrab()` sets 0.075 s of
  near-frozen time, and running the view model on that scaled `dt` froze the
  shovel mid-arc — which reads as the animation stuttering on the hit rather
  than as the hit landing. `animate()` keeps a `rawDt` and `updateViewmodel()`
  gets real seconds.
- **The jar in your hands has to stay a curve.** `vmImpulse()` on impact used
  to be -1.7 to -3.6, which slams the spring into its own ±0.14 clamp on the
  next frame — a hard step, not an impact. The spring's peak is roughly
  `v0 / sqrt(stiffness)`, so anything under ~1.5 stays inside the clamp.
- **The blade has to be on screen when it lands.** `impactPose`'s `lift` used
  to reach -0.69 at full charge, which is below the bottom of the frame: the
  one pose that most needs to read was the one you could not see. The chop is
  carried by `pitch`, which was doing the work anyway.

`sfxWindFull()` fires the moment the charge tops out, and the tremble that was
already in the wound pose roughly doubles. A charge with no full mark is a
charge you hold too long every time.

**THE RAGDOLL IS A VERLET BODY, NOT A FLOP.** The first version froze the
pose, spun every bone at random and tipped the group over on a timer, and it
read as a mannequin knocked off a table. What is there now is what Source
does, cut down to what a beach at night needs: the JOINTS are particles, the
BONES are distance constraints between them, and the body is simulated —
gravity, Verlet integration, seven constraint iterations over two substeps, a
ground plane with friction and a little restitution. Nothing in it knows what
an arm is. The feet are on the sand when it dies, so they catch and the body
goes over them; the blow's momentum is put in as a per-particle kick weighted
toward the top; a limb hits the ground before the trunk and bounces once; and
it settles into whatever heap those constraints and that blow make, never the
same twice, then SLEEPS when its motion dies. Two things make it read as a
body rather than beads on a string: STIFFENERS across the trunk (hips to
shoulders, shoulder to shoulder, hip to hip) so the torso is a box that
tumbles and not a rope that folds, and BEND LIMITS — a minimum distance
across every three-joint chain, which is the cheapest joint limit there is
and stops the one thing that gives a Verlet ragdoll away: a knee folding flat
the wrong way. The skeleton is then DRIVEN from the particles, parent first,
each bone turned by the SMALLEST rotation that takes where it points its
child to where the child's particle is. Smallest rotation, not look-at:
this rig's bone axes do not run along the bones (the forearm sits diagonally
off the upper arm — measured), so a look-at would twist every limb, and the
minimal turn keeps whatever roll the pose had. It is all in WORLD space, so
the scan's scale and its Z-up root matrix never enter into it, and the
group's own tilt is zeroed — the fall is the particles' now. A severed bone's
whole subtree is left out of the simulation.

**A BONE SCALED TO NOTHING TAKES ITS SUBTREE WITH IT.** A skinned mesh cannot
be cut, but collapsing the arm bone removes the arm from the shoulder down
along a seam the skinning already defines — no geometry surgery, no stretched
triangles (measured: the corpse's bounds stay body-sized). Put a chunk in the
air on the same frame with blood behind it and the eye reads a limb coming
off. A charged cut can take it at the waist. It is a CHANCE, not a rule —
about half of kills take something, because a kill that always dismembers is
a gore setting and one that sometimes does is a thing that happened.

**THE FLOATING ARMS WERE STUMPS, AND THE CUT WAS GROWING BACK.** The owner
sent a picture of two corpses lying flat with an arm each standing straight
up out of them. Two bugs. A severed limb's PARENT segment — the thigh above
a taken knee, the upper arm above a taken forearm — had no particle at its
far end, so nothing drove it and it kept whatever angle the death pose left
it at. The first cut joint in a chain is a particle now (`belowCut`: only
what hangs off it is left out), so the stump falls with the body. And the
clips carry SCALE TRACKS after all: `tools/mutant_anim.py` strips the scale
curves, but Blender's glTF exporter samples every channel on export and
wrote seventy constant-1.0 tracks back into every clip, 1330 in all. Two
consequences: the mixer stamped 1.0 over `kind.bones` every frame, so the
three builds were the same build whenever a clip played (measured: the red
head read 1.00, not 1.20), and `stopAllAction()` — which the ragdoll called
to "die from the pose it was in" — RESTORES every bound property's original
value, which put a cut bone's scale back to 1 and grew the limb back on the
frame the body fell, and snapped the whole skeleton to its bind pose besides,
so the particles were seeded from a T-pose. The scale tracks are dropped at
LOAD in `dressMutant`, and the ragdoll no longer stops the actions: the mixer
is simply never updated again, which is what "the pose it was in" needed all
along.

**OVERKILL TAKES THE HEAD.** A heavy — a charged cut or the overhead — that
lands on a creature with one point left is far more blow than there was
creature, and about half the time (`burstHead`) the skull bone collapses and
a dozen fragments leave at once, pale bone among the meat, with the blood
coming from where the head WAS rather than from the chest, and the neck a
stump the ragdoll simulates like any other. Only then: a head that bursts on
every heavy is a gore setting. What killed it is remembered on the unit
(`killP`, `killOh`, `hpBefore`, set in `hurtMutant` before `killMutant`) and
`finishMutant` reads those, not the live `digPower`. The overhead also throws
the body about half a metre further (2.5 m against a heavy cut's 2.1 and a
light's 1.7, measured off the hips) — a little, so the hit reads harder, not
so far that it flies.

**THE PIECE IS THE PIECE.** A severed limb used to be a generic lump thrown
off the body: you saw something leave and nothing on the ground that was an
arm. `bakeLimb` takes the limb itself off: every triangle of the skin whose
corners are mostly weighted to the cut bone's subtree is baked, in the pose
it is in at that instant (`applyBoneTransform` then the mesh's world
matrix — the same walk `skinnedBounds` does), into a static mesh with the
creature's own material, turned so its long axis (cut joint to farthest
joint below it) lies along X, centred on its own middle, and thrown as a
gib; `updateGibs` lands gibs flat, so it comes to rest lying down. It has to
be baked BEFORE the bone collapses, or there is nothing to bake. A torso cut
bakes the whole upper body, head and arms and all, and it lies there. Pieces
live 240 s (a forearm is ~1300 triangles). Two of three corners is the seam
rule — it is ragged, as a tear is.

**A BODY ON THE SAND TAKES THE BLOW TOO.** The blade passed straight through
a corpse to the sand under it. `digImpact` tests the dead after the living:
the nearest joint on the aim line takes the hit (`ragHit`) — every particle
within three quarters of a metre is kicked along the swing and the ragdoll
wakes, the blow sprays from the point it landed, and a heavy (or a third of
lights) takes the piece it landed on: `limbFor` maps the joint to the limb
(a hand or forearm is the forearm; a shoulder or upper arm the arm; anything
in the leg the leg; head or neck the head; the spine the bisect, heavy
only), `mutSever` bakes and collapses it, and `ragCut` drops every particle
below the cut from the simulation, along with any constraint or bend limit
that named one, keeping the cut joint as the stump.

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

**THE FLANKS ARE SLOTS.** Three of them coming straight at you arrived in a
file, one behind the other, and fought from there: standing still, the three
spanned 47 degrees round you. Each has a slot — the one with the turn is
AHEAD, the others take the side of it they are already on, `MUT_SLOT_ANG`
(60 degrees) out; with no turn given out the slots hang off the pack's
centre by index. `flankDir` bends an approach toward the slot's point at
reach while there is ground to cover (`(dist - ring) / 1.2`), `flankSide`
picks which way to circle so circling spreads them, and — the part that
mattered — the ones WAITING at reach without the turn slide round to their
slot at a walk instead of standing where they arrived. 47 degrees became
79 standing; retreating they still bunch, because a thing chasing you at
your own speed cannot get beside you. Crabs run the same rule with
`CRAB_SLOT_ANG` and came out at 146 degrees, 16 m of sideways travel per
crab per ten seconds.

**THE CRAB LUNGES.** It closed through its startup at a stroll before and a
player holding S was never there when the claw came down — too easy to kill
backing up. It comes in through the whole startup at better than its walk
now, through the strike itself at a dash, the bite is tested on every active
frame rather than only the first (`st.landed`, once per swing), it dashes to
cross a gap far more often (`dt * 3.0`, out to ten metres, at 7.4), and it
circles at 3.2. Twenty seconds of holding S went from nothing to three
bites; standing still it is eight in ten seconds against a player who never
guards.

**THE HEALTH BAR.** Three hairline segments in the bottom left in the HUD's
own language — no frame, no number — dim red while you are whole (0.42) and
brighter the more of you is gone, with a flash on the hit. It is the only
colour on the screen, which is what makes it read. Driven from `updateHurt`,
so it runs under the harness too.

**HARDER, AND BLOODIER.** The ragdoll kick is half again what it was
(`1.3 + power * 3.0`). `sprayBlood` is the directional spray a cut throws —
most of it along the swing, from the height the blade landed — on every hit
a mutant survives, on the kill, on a severed limb and on a blow into a
corpse, with a stain under it; `bleedMutant` stays the radial burst from the
chest. And the builds are further apart: the red head is 1.48 with the skull
flaps at 1.55, the dark head 0.62 on a long neck with forearms at 1.48 and
shins at 1.36, the pale one long in the forearm and the neck. It is done on
the shared rig at load (`kind.bones`), not as three Blender exports: one
download, and now that the scale tracks are gone it actually shows.

**IT TAKES TWO.** `CRAB_HP` is 2: a light swing is a hit, not a kill, and
only a charge past `CRAB_HEAVY` (0.85) puts one down in one. That is the
whole reason to hold the button — a heavy is not a faster shovel, it is the
difference between two exchanges and none. `hurtCrab(u, dmg, P)` is the one
door: it kills at zero and otherwise breaks the attack, throws it back off
the blade and flashes it white for `CRAB_RECOIL`. The recoil squash goes on
the GROUP, not `ud.rig` — the rig is switched off the moment the model
lands, so nothing posed on it can be seen (the death squash has always had
this problem; the gibs cover it).

**THE OVERHEAD, AND WHICH FACE LANDS.** Hold sprint while you wind and the
shovel goes up over your head in both hands and comes down the middle — the
one swing that is a smash rather than a dig. A dig bites with the OPEN face;
a smash lands on the flat BACK of the scoop, blade square to the ground and
the open side up, so it is the TOOL that turns, not just the arm:
`VM_OVERHEAD_ROT` rolls `shovelVM` right over and squares it up, blended in
across the wind so you watch the hands change their grip. Measured at the
strike, the back's normal reaches -0.98 on Y — flat. A charged overhead into
a crab also fires the `smash` bank on top of the shell hit.

It is otherwise a POSE SET, not a second animation system:
`haulPose` and `impactPose` branch on `digOverhead` and the same three lerps
run, so the landing, the trail and the blade-on-the-crosshair correction all
work untouched. The choice is LATCHED during the wind (`windOverhead`), not
sampled at the release — letting go of sprint a frame early turned an
overhead back into a side swing.

**AND THE WIND-UP IS ON THE LEFT BUTTON.** Right click became the guard and
nothing else, so holding LMB past `WIND_TAP` is what charges; the on-screen
prompt still said RMB long after that stopped being true, which is worth
remembering the next time a control moves.

**YOU MEND, AND THE RED STAYS WHILE YOU ARE HURT.** `MAX_HP` is 3 and a hit
used to be forever, so the third exchange of the night was a one-hit death.
`REGEN_DELAY` (12 s) without being hurt and a point comes back, then one
every `REGEN_EVERY` (8 s) — `sinceHurt` / `regenAcc` in `updateHurt()`, reset
by every `damagePlayer()`. And `#hurt` no longer fades to nothing: under the
hit's spike it settles to a faint breathing rim, 0.14 + 0.24 per point down,
so you always know you are hurt without a bar. `updateHurt()` therefore runs
every frame now; it used to return early when the flash was spent.

**THE MILITARY SHOVEL IS A KATANA, AND A CUT IS THREE THINGS AT ONCE.** The
hand is on the HANDLE (`MIL_GRIP_Y`: the hand's copy is slid down its own
length so the D-grip sits on the mount — a sword turns about the hands; the
first cut pivoted at the neck like the spade does and the handle flailed the
other way, a baton twirled), the hands TRAVEL (`side`, the sixth pose
component, a fraction of the frame's half-width so it is the same picture at
any window shape), and the blade ROLLS about them from up on the near side to
down on the far side. Three poses, not two — `slashCock`, `slashMark`,
`slashThrough` — and a fourth beat: the impact still fires at `DIG_STRIKE`,
but the cut goes on through to `SLASH_THROUGH` before the recovery, because a
blade does not stop where it lands. The tip comes in off one edge, arcs over
the upper middle, crosses the crosshair LEVEL with the flat of the blade to
the camera, and goes out low on the other side. THE PLANE OF THE SCREEN IS
THE WHOLE DIFFERENCE BETWEEN A CUT AND A STAB: two versions tilted the blade
toward the camera on the way down, the tip drove along its own length, every
frame foreshortened, and the owner called both a stab. (A true flat
horizontal cut is a YAW sweep and passes through pointing straight at the
target — the same stab; a sword swing that reads is a roll.) Pitch is nearly
still; yaw only cancels the arm's own -0.45 so the blade lies level at the
mark; `VM_SLASH_ROT` equals the rest grip — the cut is all arm. It was laid
out NUMERICALLY — the lip's screen position probed at every quarter of both
lerps — not by eye: with the arm, the mount and the scan's own root matrix
between the pose and the blade, a wrong guess in any one frame looks nearly
right. At rest it is a sword at guard (`VM_MIL_REST_ROT`, scoop straight up
over the fist). The heavy cocks higher and further back over the shoulder
(it is the held pose, and the blade must be on screen to twinkle), finishes
lower, drives further out, and is less slowed by the charge than a chop is
(`swingSecs`). The cock is quicker than a haul and the stroke LONGER than a
chop's: at the chop's timing the tip crossed the frame in two frames and only
the trail (1.55x on a cut) said it had moved. The world still ROLLS with the
cut (`hitRoll`, applied around the scene render and removed), a kill still
lands `sfxKillThud`, and the whoosh is a blade's — shorter, higher, and
delayed to the strike, because on the click it played over the cock-back and
was sixty milliseconds ahead of the picture.

**ONE AUTOSAVE, AT THE PAVILION, AND NO SAVE BUTTON.** The walk to the
mushroom house is an hour of finding things and the three past it can take
you in twenty seconds; losing the first to the second is the one thing that
would stop anyone playing it twice. `SAVE_Z` is `MUSH_Z + 26` and it fires on
your Z alone, the way the pack's trigger does — it does not care whether you
came down the waterline or the cliff — a little short of the house, so you
are saved walking up to it and not after you have climbed it. Once a game
(`checkpointDone`), never in dev mode, and there is deliberately no manual
save: a quicksave key turns a walk into a series of attempts.

**THE CHECKPOINT IS NOT THE WORLD — IT IS WHERE YOU STOOD AND WHAT YOU HAD.**
Every placement in this game runs off seeded noise (`mulberry32`), so a
reload rebuilds the beach identically; the save only has to put you back and
give you back. And it gives you back by RE-RUNNING THE PICKUPS: every
`addInteractable(..., 'inventory', ...)` gets a `save` id (its label plus a
count — the third shell is the third shell every load) and its `onActivate`
is wrapped to record itself in `takenPickups`. The restore fires those same
handlers again, which is the only way to get this right in a file this size:
the handler is what takes the thing off the beach, builds its view model,
names it and puts it in the pack, and every one of the fourteen is different.
Two of them do not exist until something else has happened — the captain's
head is not takeable until the wheel is turned and he has fallen — so the
replay is a pass that runs every frame for eight seconds and stops when it
has found everything. What is saved besides: position and heading, hp, the
dug mounds (re-`revealMoundNear`d), the pack's ORDER (replay lands things in
whatever order they arrive, and the hotbar is muscle memory — 3 was the
shovel all game), the rings, what was in your hand, and the dozen booleans
the walk latches (`castleBroken`, `crabBled`, `eyesSeen`, `snorkMet`, the
blood tally, the star, the boat key).

**AND THE DOCK'S CUTSCENE IS BEHIND YOU.** It fires on Z alone and the
pavilion is three hundred metres past it, so a restore played the whole
swim-in the moment you loaded, at a place with no water and no crabs.
`beginRestore` marks `packPhase = 2` when the checkpoint is past the trigger
and leaves those three asleep where they wait — which is what the beach
behind you actually looks like once you have walked it. Anything else keyed
to a trigger you have already crossed needs the same treatment.

**AND A CHECKPOINT DOES NOT ASK.** Restarting from one used to hand you the
title card and PRESS ANY KEY, which is the game beginning, and this is the
middle of one. A checkpoint load calls `beginGame()` ITSELF at the bottom of
the module — at the bottom on purpose, because the restore names the mounds,
the wreck's star and the pack, all declared thousands of lines below the
title code, and reading them earlier is a dead-zone crash. No card, no menu,
and `instantStart` holds `startMusic()` off: the opening music is the
opening, and starting it three hundred metres down a beach you have already
walked would begin the game over in the one sense that matters. The sea keeps
going; nothing else does. The one thing a page cannot give itself is a
pointer lock, so the look falls back to drag for the instant it takes you to
click and the click takes the lock — which the Safari retry path already did.

**TWO WAYS BACK.** Both go through `reloadInto(mode)`, which writes the mode
into `sessionStorage` and loads the file again — the only honest way to reset
a world this size. "Restart game" clears the checkpoint first and gives you
the first morning; "restart from last checkpoint" keeps it, and the button is
disabled when there is nothing to go back to. A death takes the checkpoint if
there is one and a fresh start if there is not. The badge is `#autosave`, top
right, a hairline ring that fills once as it writes and is gone in two and a
half seconds — re-armed on a TIMER and not a frame, because the frame loop is
not something a save indicator should depend on.

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

**THE KATANA'S MOVE SET IS THE UE4 REEL'S, POSE FOR POSE.** A second
reference arrived — a first-person katana animation set with every clip
LABELLED on screen — and "make it exactly the same" is a much easier brief
than it sounds, because a labelled reel is an index: crop the label strip at
1 fps into a contact sheet and you have the timecode of every animation in
the video (`idle_breathing`, `block_in`, `block_loop`, `block_out`,
`attack_swing_left_01`, `attack_heavy_swing`, and the rest) without watching
a second of it. Then sample only the seconds that matter, at 10–15 fps, and
read the poses off those. Four things came out of it and all four are
different from the Battlefield reference that preceded them:

- **The idle is nearly UPRIGHT.** Fist in the bottom-right corner, tsuba just
  above it, blade running up and leaning slightly right until the point
  leaves the top of the frame. The BFV carry — blade low and across to the
  left — was a different game's sword and had to go.
- **The guard is HORIZONTAL**, fist at the far left, the whole length of the
  blade running out to the right and off the frame. A shovel guards with the
  shaft across you and the blade high on the leading side; this is not that
  shape at all, so the katana carries its own `KAT_BLOCK_AT`, its own
  `KAT_BLOCK_POSE` and its own `KAT_BLOCK_ROT`, and every other tool keeps
  the shovel's.
- **The cut is a CROSS-BODY DRAW.** The fist drops to the low left with the
  point thrown up and back over the far shoulder, then the blade comes round
  through the horizontal and out past the near hip while the hand travels
  left to right. Scaling the shovel's stroke could never produce that: a
  spade's cut keeps the hand on one side. The katana has its own
  `katCock` / `katMark` / `katThrough`, and because the whole turn is in the
  ARM's roll the sword never rotates in the grip — its slash grip is its own
  carry grip, which is what "the cut is all arm" finally means here.
- And the tips were SOLVED, not eyeballed: point at (0.55, 0.72) cocked,
  (-0.95, 0.10) on the mark, (-1.05, -0.72) through, in normalised device
  coordinates read straight off the reel's frames, all three hit exactly.

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

**AND THE OWNER'S OWN RECORDINGS BEAT ANY SYNTHESIS.** Four Sekiro swing
bounces and four block bounces, dropped into `SAMPLES` as `katSwing` and
`katBlock` — `playSample` already picks at random out of a bank, so a swing
and a block are never the same twice running, and the synthesised whoosh and
clash stay behind them as the fallback for the frames before the bank has
come off the network. `playSample` gained a `delay`, because a blade's whoosh
is timed to the strike and not to the click, which the synthesised one had
always known and the bank did not. They are not redistributable, and the
README says so.

**THE KATANA IS BUILT NOW, AND THE SCAN IS GONE.** brandon_grey's "Gothic
Katana Sword" was put in as an exact replica and the owner's verdict was
"it's bad, it's facing the wrong way and it looks horrible" — and measuring
it says why, in three numbers that are all properties of the FILE and none of
which can be fixed from outside it. It was **1.81 m long**, and a sword as
long as the frame is tall reads as a plank. Its blade was a plate of
**constant thickness** — sampled across the width: 4.3, 4.4, 4.5, 4.6, 4.7
mm, with one 3.2 at the very edge — so it had no shinogi, no bevel and
nothing anywhere on it that could ever catch a highlight. And its baked map
was a pale wash that went grey under this moon. `models/katana.js` builds one
instead, the way the lighthouse and the mushroom house are built: 103 cm
overall, a real shinogi-zukuri section, a curve with the edge on the outside
of it, a drawn ito wrap, an iron tsuba and a brass habaki. Same lesson as the
tower — **building it made it exact**, and it is the only way to answer "make
the model look more exciting" at all.

**AND THE SHINE IS GEOMETRY, NOT GLOSS — BUT THE ALBEDO HAS TO GO MUCH
DARKER THAN IT LOOKS ON PAPER.** What makes a blade read as steel with no
environment map is the RIDGE: the shinogi catches the one directional light
as a hard line down the length of the sword and it moves as the blade turns,
which is what a polished edge does. The material only has to stay out of its
way. The trap is that the VIEW-MODEL SCENE CARRIES ITS OWN LIGHTS — an
ambient at 0.9 and two directionals at 1.15 and 0.55, tuned for a skin-toned
hand — so nearly three units of light land on whatever is in your fist. A
0x7d8794 body with a 0xd7dee8 temper line is gunmetal in the abstract and
renders as BONE in the hand; it took 0x2e343d and 0x6a7b90 to get dark steel
with a bright line on it. Read the lights of the scene a thing will actually
be lit by before choosing its colour.

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

**A GRIP CHANGE BELONGS BEFORE THE STROKE, NOT INSIDE IT.** A light click has
no wind-up, so at the old blend rate the sword was still rotating out of its
low carry and into the line of the cut while the arm was already throwing the
stroke — two rotations at once, which is the definition of a flail and is the
whole of "the move set must be fluid". Going in it snaps in about three
frames; coming out it stays soft, because settling back to the carry is a
recovery and should be seen.

**AND A TOOL AUTHORED WITH THE GRIP AT ITS ORIGIN NEEDS NO GRIP SLIDE.** The
scan wanted `KAT_GRIP_Y` to put the fist on the tsuka, and the charged cock
had to be laid out twice because of it. The built one has the hand at
(0, 0, 0), so the sword turns about the hands in every pose without a special
case. A tool hangs from where it pivots; the cheapest way to get that right
is to author it there.

**8 SETS THE SETTING, NOT A SECOND SPEED.** The first pass multiplied
`RUN_SPEED` behind the slider's back, so the menu said 1.4x while you crossed
the beach at eight metres a second and nothing you could see agreed with what
you were doing. It drives the walk-speed slider to its top (14x) and back to
the owner's own 1.4, readout and slider handle with it. It is never saved —
`settings.walkSpeed` is forced back to the default at load, the way dev mode
is — so a game always starts at the pace it is meant to be walked.

**A MAN DOES NOT POWER DOWN.** The pack's death is a sawtooth falling from 78
to 23 Hz over nearly two seconds under a lowpass sweeping down with it, which
on a creature is a throat going out and on the one HUMAN in the game is
unmistakably a machine winding off — the owner heard machine sounds when he
killed the Dealer, and that was them. A continuous downward glide IS the
machine sound, whatever it is made of. He goes down on breath now: the last
of it driven out through the mask's filter drum, a groan that steps down
twice and stops, and the mask emptying after him. No sweep anywhere in it.

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

**THE BOSS FIGHT HAD NO BLOOD IN IT AT ALL, AND THAT IS WHY YOU COULD NOT
READ IT.** "You can't tell what's a successful hit" was not a feedback
problem to be solved with more feedback — it was a bug, and the bug is the
oldest one in this file wearing a new coat: the BEACH'S OWN y = 0 baked into
a system that now runs forty metres under it. A blood drop was deleted at
`y <= 0.02`, an absolute height, so every drop thrown in the bunker was
already below its own ground on the frame it was made and was removed before
it had ever been drawn. `bleedMutant` spawned its burst at a bare
`0.85 + …`, which is chest height on the sand and is forty metres over the
Dealer's head in his own room. And `stampBlood` stamped at 0.035, so what
little survived left its mark on the beach above the roof. The net of it: a
landed cut showed you the sparks off `bossHit` and NOTHING else, which is
exactly what a block looks like — so every swing in that room read as
blocked, which is also the whole of "I keep getting stuck in block when
fighting in the bunker". A drop asks what is under it now (`bunkerFloorAt`,
then the deck, then the sand), the burst comes out of the body's own y, and
a stain takes the height it landed at. THE SAME THREE LINES HAVE NOW BEEN
WRITTEN FOR THE PHYSICS BODIES, THE GIBS AND THE BLOOD: anything that knows
one ground is broken the day the game acquires a second one.

Two things went on top, once it could be seen at all. **Some of the spray
comes BACK at you** — everything else is thrown away down the swing, so at
the wrong angle (him against a dark wall, the blade between) a cut could
still be read as a block, and blood crossing your view is a thing steel never
does. And **the blow that finally breaks his poise bleeds rather than
sparks**: it threw sixteen sparks, the loudest picture in the fight, off the
one blow that had just gone through his guard and into his body.

**A GUARD IS A BUTTON HELD, SO IT MUST BE POLLED AND NOT LATCHED.**
`blocking` was raised on pointerdown and only ever lowered on pointerup, and
a release that never arrives is not rare: the lock goes away to a browser
banner, the tab loses focus, a press that began over the canvas ends
somewhere else. Then the shovel is up across the screen for the rest of the
fight with no way down but pressing and releasing again. `e.buttons` is the
ground truth and it comes free with every pointermove — bit 1 is the right
button — so the guard is now whatever the mouse is actually doing. Losing the
lock drops it, a cutscene drops it, and `pointercancel` drops it.

**AND THE WAY OUT IS THE HATCH, NOT A PATCH OF CEILING NEAR IT.** The exit
proxy was a slab a metre and a half wider than the shaft on every side, which
in a fight is a prompt you catch by looking up and a room you leave by
accident. It is the shaft's own mouth now, with a `when` that asks you to be
standing under it — walk to the spot you came down at, look up at the lid,
press E. Everywhere else in that room there is no way out, which is the point
of the room.

**HE GOES INTO THE SEA ONCE.** The tall one bolts, goes under and is taken
out of the scene for good — and then a checkpoint load rebuilt the world from
seed and stood him back up on his mark, so the one thing in this game that is
meant to happen to you exactly once happened again every time you died. It is
a flag on the save now (`smileGone`), and it is ALSO inferred from where the
checkpoint puts you, because the pavilion is ninety metres past him: anyone
loading that save has already walked through that stretch. Same rule as the
pack's cutscene — a trigger you have already crossed does not fire again —
and it wants the same treatment for anything else that is meant to be once a
walk. `removeSmile()` is the one door, so the two callers cannot drift.

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

**A SEALED ROOM HOLDS ITS DEBRIS TOO.** The ragdoll learned this once — a
body thrown across the control room went out through the concrete and settled
in the sand over its roof — and a gib is the same thing smaller: splinters off
the coat stand shot through the end wall and fell down the outside of the
building. `bunkerConfine` is the room box for anything loose, and it returns
WHICH wall was met so only that component of the bounce is turned round.

**AND THE CORNER IS THE ONE UNDER THE POSTER.** Measured, not guessed: the
corner itself is full of cupboards, so the stand stands at the nearest cell to
it that a body actually fits in — 1.05 m out along the -x wall, under "IT CAN
HAPPEN HERE". The way to find a corner someone has photographed is to raycast
the render at the thing in the picture and read the object's name back, not to
reason about which wall is which.

**8 IS A LATCH, NOT A KEY YOU HOLD.** "Make 8 the max walk speed" was read
as a number the first time — the constant that comes out as eight at the
owner's own slider — and what he meant was the KEY: pressing 8 makes the top
speed your walk and pressing it again gives the ordinary pace back.
`fastWalk` turns the sprint off while it is on rather than stacking with it,
because there is nothing above the top speed to reach for and letting shift
still drain the bar would be charging you for a speed you already have; it
costs no stamina, since it is a gait and not an effort. Digits 1-6 are the
hotbar, so 8 was free. **And a latch with no visible state is a latch you
press twice to find out what it was doing**: the FAST tag beside the stamina
bar is in the HUD's own language — mono, letter-spaced, hairline, no colour —
and it is the whole reason the toggle is usable.

**BEING HIT WAS THE ONE IMPACT IN THIS GAME WITH NO SPRING UNDER IT.** The
guard rings on one, the world rolls on one, an overhead dips the camera on
one — and a crowbar landing on the PLAYER got a red flash, a shove and a
lowpassed puff, which is why losing a quarter of your health read as a
nudge. Four things now, and the one that carries it is DIRECTION:

- **The head is thrown, and thrown the right way.** `hurtShock` is the same
  damped spring, released from its PEAK on the frame the blow arrives (a head
  is thrown in one frame, never eased into it) and ringing back through
  centre in two thirds of a second. `hurtRollK` / `hurtPitchK` are worked out
  from where the thing that hit you is standing, in the camera's own frame:
  struck from your right and your head snaps LEFT, struck from in front and
  it snaps back. **Positive `camera.rotateZ` is your head going left** —
  measured with a render, not reasoned about. It is applied around the scene
  render and taken off again, like `hitRoll` and `slamDip`, so it can never
  leak into the look state. About 5° on a light blow and 7° on a heavy one.
- **`k` is how hard it was, and everything reads off it.** A two-point blow
  is half of you and it used to arrive through the same flash as a nip; and
  the blow that leaves you on your LAST point is the one moment in a fight
  the game should be shouting, so it lands hardest of all (×1.22). Trauma,
  hitstop, the FOV punch, the knee dip, the knockback and the sound all
  scale with it.
- **BLOOD ON THE LENS, AND IT OUTLASTS THE FLASH.** Drawn once onto a canvas
  — big splashes bedded into the corners and edges with their own satellites
  and drips, and a mist over it — and hung on its own layer. Three things it
  needed. It is round the EDGES: the middle of the screen is where you are
  looking and a game that paints over it is a game you cannot play. It is
  BRIGHT red with a dark heart and a lit rim, blurred in CSS, because the
  first pass drew it near-black over a beach that is already nearly black and
  you could not see you had been bled on — a drop on glass is wet, and wet
  catches the moon. And it is a SIBLING of `#hurt`, not a child: a child is
  multiplied by its parent's opacity, and that parent fades to nothing in a
  second, while what lands on the glass should still be there two and a half
  seconds later. Its z ties with the HUD it is declared before, so it sits
  over the dark edge vignette that would swallow it and under the health bar,
  which must stay readable while you are being hit. It is drawn and encoded
  at the END OF THE INTRO, never on the frame you are hit — twenty
  milliseconds of canvas is nothing at a loading screen and a dropped frame
  in the middle of an exchange, the same reason the drain and the bunker are
  warmed.
- **And it sounds like a body, in the order a body feels it.** The crack of
  the thing arriving, the dull weight of it going in, a sub you feel rather
  than hear, and — a beat LATER, because the noise a person makes is never
  simultaneous with the blow — the breath it drives out of you.

**THE KATANA IS A THIRD CUTTING TOOL, AND EVERYTHING IT DOES DIFFERENTLY IS
A FIELD ON THE ITEM.** brandon_grey's "Gothic Katana Sword [Dark]"
(`assets/katana.glb`, the blade only, through `gltfpack.py --nodes Blade` at
2048 with its maps kept — 1.55 MB, because looking like the photograph is
the point). It walks through every door the shovels do: `onDig`, its own
`lip`, the shared cut, the shared guard, the shared overhead. What is its own
is declared on `katanaItem` and read by tiny helpers that DEFAULT to the
shovels' behaviour, so a tool without the field is exactly the tool it was:
`dmgLight` / `dmgHeavy` (2 / 3 — `toolDmg`), `windRate` (1.3: full charge in
0.78 s against 1.0), `gore` (1.4 — `toolGore`, remembered on the unit as
`killGore` at the kill because `finishMutant` runs after the hitstop),
`swingK` (0.9), `blade` (the whoosh, the connect and the block are a
sword's), and `alternate` (a light thrown inside 0.9 s of the last comes
back along the other diagonal — the return stroke that was rightly cut for
the shovel is the katana's whole vocabulary). It spawns beside the Military
Shovel under the cliff.

**A SCAN MAY CARRY ITS OWN 0.01, AND YOUR AXIS FIT MAY BE IN THE WRONG
FRAME.** Two mistakes in one build. The shovel's scan arrives in raw
centimetres and its wrapper scales by 0.01; this one carries the 0.01 INSIDE
its Sketchfab .fbx node, so a second 0.01 on top made an eighteen-millimetre
sword whose world scale printed as zero and whose in-hand bounds collapsed
to a point. And the principal-axis fit was first done "in the wrapper's
frame" by walking up from the mesh to the first ancestor with scale 0.01 —
which found the SCAN'S node, not mine, so the fit ignored the root's
rotation and the quaternion was wrong by that rotation. Find your wrapper as
the parent of the scan's root node, by name. Then: an axis-aligned box says
nothing about a blade lying on a diagonal in its node frame (85 cm "wide");
a principal-axis fit over the vertices gives length, width and thickness;
the thick end (2–4.5 cm across handle and guard against a 5 mm blade) is
the handle; the thinner side across the width is the edge. Rows of the
rotation are the scan-space vectors that become hand x, y, z — `[W; -L;
-T]` here — and the offsets re-centre the blade's own axis on the mount
with the point at -0.21 like every other tool's. It is 1.81 m long because
that is how long the thing is.

**METALNESS IS STILL A TRAP.** The blade ships at 0.94 and rendered as a
black slab with one pinpoint on it. Steel on this beach is a bright rough
dielectric (0.22 / 0.62) with the map multiplied down a touch and a small
COLD emissive, so the dark steel keeps its colour under the moon.

**LIGHT BY HOW IT WAS THROWN, NOT BY WHAT IT TAKES.** `hurtMutant` decided
"light" with `dmg < 2`, which was the same thing while every click did one.
The katana's click does two, so under the old test its every click was a
heavy: three poise a swing, no chance of meeting his bar, a stagger every
third click. `P < MUT_HEAVY && !digOverhead` now, in both places. The
blade's advantage is the damage, not free staggers.

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

**AND TWO THINGS STEERING ONE BODY IS NEITHER OF THEM STEERING.** He was
still catching on the table after the pathfinder went in, because
`updateMutantUnit`'s chase and `followPath`'s route were BOTH moving him
every frame — the chase straight at you and into the table, the route round
it. Whoever is steering, steers: the chase branch is off while he is on a
route. And the gate that let him ask for one was `dist > 2.4`, which is
exactly the range at which a table between you IS the problem; anything past
his own reach counts now. Measured: 17 of 17 with furniture between you.

**A THING BREAKING SHOULD COME APART INTO WHAT IT WAS MADE OF.** The coat
stand's first break deleted it and threw fourteen identical dowels, which is
not a coat stand breaking — it is a coat stand being replaced by dowel. Every
piece it is BUILT from leaves now, from where it actually stood and carrying
the rotation it was drawn with: three feet, four hooks, four tips, the knob,
and the post SPLIT into three lengths at the height it was struck, with the
broken faces slanted, because a cylinder capped square at both ends is a
dowel and not a broken post. Fifteen pieces, and the post reads as snapped.

**EVERY BONE LOOKUP GOES THROUGH THE ALIAS, AND THREE OF THEM DID NOT.**
The severing, the head burst and the limb bake name the mutant's bones
literally — `Character1_LeftForeArm` — and the Dealer's rig answers to
`mixamorigLeftForeArm_NN`. The ragdoll learned this once and routes
everything through `byName`; these three never did, so on him they found
nothing, returned false, and he was the one creature in the game that could
not lose so much as a hand. `ragBone(u, name)` is the one door now. And the
RATES are lower for him than for the pack: a creature you meet three of at
once can come apart half the time and still read as a thing that happened,
but the one man in the game, killed once, cannot. Measured at the first
rates: thirteen of fourteen took something and eleven of those were the head,
which is a gore setting. At 0.28 / 0.30 it is 46 % on the finishing blow and
33 % on an ordinary heavy.

**SPARKS ARE FOR STEEL.** A cut that went into him threw six drops of blood
under `bossHit`'s shower of sixteen sparks, so every landed blow read as the
bar being met rather than the man being opened — the owner saw sparks and
nothing else. `bossHit` takes a `flesh` flag: sparks on a block and a parry,
four off the bar on a stagger, none at all on a cut, and four times the
blood thrown from the height the blade landed with a stain under it.
Measured: 24 drops on a click, 36 on a charge, against 6 before.

**A CONSTANT THAT READS A LATER ONE IS A DEAD ZONE CRASH.** `RUN_SPEED` is
declared at line 26 and the speed setting it wants to divide by at line 167,
and `8.0 / DEFAULT_SETTINGS.walkSpeed` took the whole page down before a
line ran. The number is written out with the arithmetic in the comment. And
the number that matters is the one the OWNER gets: his speed slider sits at
1.4, so "make 8 the max walk speed" means the constant is 5.71.

**A CUTSCENE HANDS YOU BACK A FIGHT, SO IT HANDS YOU BACK A FULL BAR.** You
cannot block, sprint or breathe through a take, and the run TO the trigger is
often what emptied it — so the opening exchange was decided before you had
your hands. `catchBreath()` on the end of every one.

**AND HE ROUTES BEFORE HE IS STUCK, NOT AFTER.** Asking the room for a way
round only once he had ground to a halt meant a second of him working along
the table's edge every time you stood behind it. If the straight line to you
crosses furniture he asks for a route straight away, at most every
`PATH_EVERY`, and drops it the moment the direct line opens — a route is a
way ROUND something, not a way of getting about. Measured: 22 of 22 standing
spots in the room reached, 15 of them by route.

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

**REVERTING THE FRAME IS STANDING STILL, AND STANDING STILL IS THE BUG.** The
player's furniture clamp pushed out, then escaped, then — failing both —
refused the move, which is exactly the state it was meant to prevent. A
blow's knockback can put you a metre inside the console bank in ONE frame,
deeper than `escape` looks, and from in there every move is refused for ever.
`S.mainRegion` is the last word: the largest connected piece of walkable
floor, worked out once. Measured: 72 starts buried in furniture, none still
inside twenty frames later, worst ejection 1.28 m.

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

**AND NOTHING IN HERE ELECTROCUTES YOU.** A broken set is pieces, sparks and
a report. It has never dealt damage and must not start: the sparks are a
picture of something breaking, not a hazard, and a room whose scenery hurts
you is a room you stop moving around in — which is the opposite of the point.

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

**SOME PEOPLE DO NOT LET YOU WALK AWAY.** Escape closes any conversation,
which is right for a man in a shed and wrong for the one standing between you
and the ladder: leaving his line unanswered left `dealerFight` false and him
rooted to his mark for the rest of the game, so the boss of the game had an
exit written into his own dialogue box. An NPC may carry an `onLeave`; his
takes the crowbar off the shelf.

**BREAKING SOMETHING DOES NOT SHAKE THE ROOM.** A monitor coming off a desk
is a noise and a shower of parts, not an event the building feels — and with
eighteen breakables in there, a jolt on each turned a fight through the
console bank into a camera that would not settle. The blow that broke it has
already put trauma through the camera, from `hitConnect` or from the body's
own landing. Measured: six broken at once, trauma stays at zero.

**AND A TOOL HANGS FROM WHERE IT PIVOTS.** Sharing a rest pose is not enough
to make two tools hang alike: the Military Shovel's model is slid down inside
its group by `MIL_GRIP_Y` so the D-handle sits on the mount, and the sand
shovel was never slid, so with both in the same rotation they sat 28 cm
apart. Worse, the charged cock was laid out for a tool that turns about its
GRIP — swing one about its neck through those angles and the blade leaves the
top of the frame, taking the full-charge glint with it. `SAND_GRIP_Y` gives
it the same treatment, and the slide comes back out for the guard and the
overhead, which were both laid out on the neck pivot. Measured: 2.2 cm apart
at rest, and the glint back on screen at full charge.

**THE CURL SIGN IS +1, AND THE COMMENT SAYING IT HAD BEEN CHECKED WAS
WRONG.** It shipped as -1 "verified by rendering the hand", and it had not
been: at the loose curl it started with, a hand bending the wrong way looks
merely limp, so nobody caught it. Tightening the fist made it obvious — the
crowbar passing through an open palm with the fingers hooked away from it. A
whole pass in between blamed the rig's MIRRORING and gave the two hands
opposite signs, which fixed the left and left the right exactly as broken as
it had always been, because the mirroring is in the world orientation and
not in the local axis convention these finger bones share. **One sign, both
hands, and the only way to know is four renders** — each hand, each sign,
clay-shaded and close enough to see the fingers. Do not reason about it from
the bone matrices; that is what produced the wrong answer twice.

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

**THE ROOM IS ELECTRICAL, SO MOST OF WHAT BREAKS SHOULD BE.** Eight props
with two screens between them made a control room you could barely damage.
Eighteen now, eleven of them sets and monitors and gauges, along the console
bank and the desks where a thrown body actually lands — and `ragSmash`
already routes a corpse into the same `onImpact` the shovel and a thrown
bottle use, so all three break them the same way: case in pieces, tube in
shards, sparks off the break.

**AN AUTHORED SWING IS A SWING AT THE AIR.** It lands wherever the arm
happens to put it, and whether that is anywhere near YOU depends on how far
off you were standing, which way he was facing and which of six clips came
up. Measured with him squared up at 1.3 m, his side swing's own contact
frame left the bar 1.78 m from your chest — so half his blows passed a foot
wide, the guard was never met by anything, and the fight felt like it was
happening beside you rather than to you. `aimBar` is the same idea as
`landBlade`, which puts the player's own blade on the crosshair: **the
animation says WHEN and the correction says WHERE.** Two parts, because the
shoulder alone cannot cover most of two metres without becoming a different
swing — a yaw that turns his body into the blow, then the shoulder for what
is left, which is mostly height. Both clamped, both on the same ease, so a
swing thrown from too far out still misses, which is what keeps backing away
worth doing.

| | bar to chest before | after |
|---|---|---|
| the overhand | 0.33 m | 0.15 m |
| the horizontal | 1.78 m | 0.23 m |
| the wind-up | 0.85 m | 0.05 m |
| the lunge | 1.16 m | 0.11 m |

Three things it needs. **The yaw goes on the MODEL, never on `u.g`** — the
group's heading belongs to the AI and to every distance test in the fight,
and a correction written into it accumulates frame on frame. **The bar's own
hitbox reads bone world positions**, so it follows the correction for free
and the picture and the blow cannot come apart. And **the world-to-local
turn must come from `getWorldQuaternion`**, not from inverting `matrixWorld`
and reading the rotation off that: the model is scaled to the creature's
height, `setFromRotationMatrix` on a matrix with scale in it is not a
rotation, and the arm flew far enough that the measurement read 244468
metres.

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

**A LOOSE FIST READS AS AN OPEN HAND.** At 0.62 rad at the knuckle the
fingers curled without ever closing and the bar sat in a cupped palm. And
`stamp_grip` puts ONE finger pose on a whole clip, which is right for a man
already holding something and wrong for the one clip that is about picking it
up: he reached with the fist already made. The pickup keys its fingers per
frame — open on the way out, shut on the frame the game moves the bar into
his hand.

**A SWING THAT IS NOT IN THE TABLE MUST NOT TAKE THE FRAME DOWN.**
`u.atk[u.st.swing] || MUT_ATTACKS[u.st.swing]` returns `undefined` for a unit
whose swing was never set or names a clip its kind does not own, and the next
line reads `A.wind` off it — an uncaught TypeError inside `animate`, which is
the whole game, once per frame for as long as the state lasts. `swingOf`
falls back to one the creature definitely has.

**A MIRRORED RIG NEEDS TWO CURL SIGNS.** `CURL_SIGN` was one number
"verified by rendering the hand" — the RIGHT hand, the one holding the
crowbar, the only one anybody was looking at. The rig is mirrored, so the
left hand's finger bones have their local X pointing the other way down the
armature's Y (measured: LeftHandIndex1 reads (-0.06, 0.99, -0.14) against the
right's (-0.07, -0.99, 0.14)), and the sign that closed one hand bent every
finger of the other BACKWARDS over the knuckles — on every frame of every
clip, for as long as he has existed. The sign is DERIVED per bone from that
axis now, so a rig that mirrors differently cannot quietly break it again.
And the way you find this is still a render: clay shading, both hands, the
old GLB beside the new one.

**A SOLVER ONLY BUYS WHAT YOU CHARGE IT FOR.** The reach for the crowbar was
a coordinate descent whose only cost was distance to the bar, and the
cheapest way to put a hand on a low table is to hinge at the waist — so it
drove `lean` to its limit, 69 degrees, and he went down over the table like
a man being sick, chest and forearm inside the wood. A person bends their
KNEES for something at thigh height. The knees were in the parameters all
along; they were simply never worth using. A quadratic cost past a
comfortable lean and the pose comes back at 29 degrees with his head up.

**AND A HAND REACHING OVER A TABLE TRAVELS IN AN ARC.** A straight line from
his hip to a point on a table top goes through the table. `reach_pose` takes
an `arc` that lifts the hand's PATH — zero at both ends, so the solved peak
pose is untouched, which matters because the game's hand-off from table to
fist happens exactly there. Measured in the game, the fist closes 8 cm from
the bar.

**HE HOLDS HIS POST.** He is a `mutants` entry, and everything that walks
that list can nudge a man who is supposed to be standing still waiting for
you. Come back from a checkpoint and he had drifted off his mark and turned
round, so the one line of dialogue in the game was delivered by the back of
his head. `DEALER_POST` writes down where he stands and which way he faces,
and until `dealerFight` he is put back on it every frame. Do not chase which
of a dozen systems moved him: pin the thing that must not move.

**A TELL YOU CANNOT TIME IS A TELL THAT IS TOO FAST, NOT ONE THAT IS TOO
SHORT.** The held overhead hung for half a second and then landed, and the
owner could not block it. Widening the descent window in the clip changed
nothing, because the easing was `t³`: at the halfway point of the fall the
bar had moved an EIGHTH of the way and the whole stroke still happened in
the last few frames. What matters is the fall's length IN SECONDS, and
`mutClipTime` makes that arithmetic exact — the clip's [0, `hit`] maps
linearly onto the startup [0, `wind`], so a fall that occupies a tenth of
the clip lasts `0.10 / hit * wind`. It was 0.15 s against a 0.156 s parry
window. A gentler exponent, a wider window and a longer `wind` make it
0.29 s, nearly twice the window. A second and a half of bar over his head is
a long tell and it should be: it is the slowest thing he throws and the only
one that takes two of your four.

**AND THE CONTACT DETECTOR SCORES SPEED, SO GIVE A CLIP A FOLLOW-THROUGH AND
IT NAMES THE RECOVERY.** The arm coming back UP out of a held swing is
quicker than the arm going down into it, and the build started reporting a
contact frame a fifth of a second after the bar had passed you. A rising
hand is not a hit; the velocity term is discounted when the hand is going
up. The four horizontal swings never noticed — they barely change height.
`dHold`'s `hit` is measured IN THE GAME anyway, at the bottom of the bar's
arc, the way `dSide`'s was.

**MOTION IS FLUID WHEN IT DOES NOT ALL ARRIVE AT ONCE.** Every joint in an
authored pose ran off one number, so shoulders, elbow, hips and head started
together, crossed together and stopped together — which is the single thing
that makes pose-to-pose animation read as a mannequin being posed. `drag`
shifts the driving time for the arms so the body leads and the hand is last;
`follow` carries a limb past its stop and brings it back, one soft decaying
bounce. It costs nothing but the shift.

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

**POISE IS A POOL, NOT A COUNT.** It was three light swings to rock him and
a charge rocked him outright, so the answer to the first boss was to hold
the button: every heavy was a free stagger. Now every blow SPENDS from one
pool — a heavy spends three, a click spends one — and what is left grows
back (`poiseBack` 1.6/s) once you have left him alone for `poiseWait`. Eight
points is three charges in a row or eight clicks. **The parry is the
exception and always was**: a stunned man is past the whole human branch, so
reading the tell is the one thing that opens him up on demand, which is what
a parry should be worth. Measured: 3 clicks became 8, one charge became 3,
and the stagger itself is 0.23 s instead of 0.32 (`recoilK`) — still the
prize, no longer two free swings. If a poise break lands mid-swing it must
skip the "committed" shrug or the break is wasted on the one blow that
earned it.

**ONE GRIP FOR BOTH SHOVELS.** They already shared the cut, the overhead and
the guard; holding them differently at rest was the last thing that made
the sand shovel a different tool, and it made the hand jump every time you
scrolled between them. `restRot()` is `VM_MIL_REST_ROT` for everything now.
`VM_REST_ROT` is not gone — it is the DIG grip, which is what the guard
turns back into on either tool, and only the scan needs the neck shift for
it because the built shovel already pivots there. Both read
[-3.142, -0.483, 0.483] at rest and [0.70, 0.35, 0.32] on the guard.

**A BLOCK IS SHORT AND VIOLENT, NOT LONG AND HEAVY.** A tenth of a second of
frozen world under a soft spring read as the blow SHOVING you. The freeze is
shorter (0.085) and everything round it is harder: the spring driven half
again, twice the sparks, the knee dipping, and the word off the screen
before you finish reading it. The spring itself went from 3.26 Hz to 4.03 at
the same damping ratio — it still rings three times, it just rings and is
done. Anything you do four times in an exchange wants snap, not weight.

**AND THE TAKE WAS AIMING AT THE WRONG PLACE THE WHOLE TIME.** The mutant
cutscene sums the three pack creatures' positions and skipped the Dealer,
correctly — and then divided by the length of the WHOLE list, which has four
entries in it. The midpoint of three creatures six hundred metres down the
beach was pulled a quarter of the way back toward the world origin, and the
camera looked at open sand. Measured: the old expression aimed **173.7
degrees** off — very nearly the opposite direction — and the fixed one holds
within 0.4 for the whole take. It was always wrong; a checkpoint load is
simply the only way anybody reaches that stretch often enough to see it.
**An average is over what was actually summed.**

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

**BOTH SHOVELS CUT.** The stroke was the Military Shovel's alone. Nothing
about it is the scan's: `VM_SLASH_ROT` is *identical* to that tool's own rest
grip, which is "the cut is all arm" made literal — so `slashing()` widening
to any dig tool moves the poses, the timing, the trail and the whoosh across
whole, and each tool keeps its own grip through `restRot()`. The overhead was
always shared.

**WHAT A BLOW ON A BOSS FEELS LIKE.** Everything else on the beach is
cleared out of the way; he is the fight, and the difference has to be in the
hands. `bossHit(P, broke)` is the confirm on top of the ordinary one — twice
the frozen time, the guard spring driven, sparks off the bar, the lens
punched, `sfxSlam` under it — and the POISE LADDER is what makes it read:
0.085 s on the first light, 0.085 on the second, **0.155 and a knee-dip on
the third**, the one that finally moves him. You can feel the count. A
charge skipped all of it at first, because it never entered the light
branch — the one blow that should land hardest landed softest.

**AND A BOSS NEEDS A BLOW YOU ARE AFRAID OF.** The fair one to make it is
the one you can see coming from furthest away: `dHold`, a second of bar over
his head, takes TWO of your four. Per-swing damage (`A.dmg || kind.dmg`) is
the whole mechanism. With eighteen health, shorter recoveries on the quick
swings and `aggr` 1.45, a passive player takes 39 damage a minute off 30
swings — and the way through is still the parry: five ripostes.

**AN ICON THAT FELL BACK IS NOT THE FINAL ANSWER — AND THE FALLBACK MUST BE
THE RIGHT OBJECT.** `itemIcon` renders the item's own model into a tile the
first time it is asked and caches it, and until the model arrives it shows
the item's DRAWN icon. Two faults, and the checkpoint is what exposed both.
`militaryItem` declared `icon: makeShovelIcon()` — the *sand* shovel's, a
bright red plastic beach spade — so the fallback was a different object
entirely; and nothing ever asked again, so whatever the fallback was became
permanent. On a normal walk you pick the thing up an hour in and the render
has long since replaced it; on a CHECKPOINT LOAD the whole pack is rebuilt
seconds after the page starts, before any network model has landed, so every
scanned item kept its drawing for the rest of the game. The Military Shovel
has its own olive icon now, and `iconsPending` makes the pack ask again on a
TIMER — not a frame, because a pack should not depend on the render loop.

**HE IS NEVER STUCK: STEER FIRST, SLIDE SECOND.** The fight AI walks at you
and knows nothing about the room, so a tripod or a desk corner was a place to
hide. `S.clearAhead` marches the nav grid along a heading; if the next stride
is not clear the same stride is spent on the nearest heading that IS, fanned
±20° to ±115°, nearer first, with a `turnBias` held for 0.7 s so he does not
dither at a corner. Whatever the steering misses, `clampDealer` pushes out
along the resultant (the player's own call) rather than reverting — reverting
is what standing still IS. Measured: he reaches within 1.1–2.0 m of all four
corners of the room, including the ones behind furniture.

**AND HE READS YOUR WIND-UP — WHICH MEANS BREAKING HIS OWN SWING.** A charge
held in his face is answered: he steps out of the arc (the walk clip at a
NEGATIVE rate, so his feet go where he is going, and he keeps facing you) or
the bar comes up. The first version only allowed it while he stood idle and
fired 15 % of the time — and the measurement said why: **he is mid-attack 78 %
of the time**, so the window almost never opened. He can now break out of the
FIRST HALF of his own startup, before the commit, which is the exchange the
fight wanted: charge as he winds and he backs out and answers; charge late and
he is committed, so you trade. The commit is what keeps his tells honest and
is untouched. Measured: 58 % of charges answered, 11 dodges and 3 guards in
24. A block is his TURN, too — he comes off it into a strike (`cool` 0.10)
rather than standing there.

**AND A TEST THAT KILLS THE THING IT IS MEASURING MEASURES NOTHING.** Two
whole rounds of "the read only fires 25 % of the time" were a corpse: the
harness was releasing a real charged swing next to him every iteration and
he was dead by the fourth. `heal()` keeps the PLAYER up and everybody knows
it; the same rule applies to whatever you are pointing at. Top his health up
in the loop, or the numbers are noise.

**AND THE HAND HAS TO CLOSE.** The grip was lifted out of the source idle —
but the build strips those clips' finger curves a few lines earlier, so what
was lifted was the BIND pose: a flat open hand with a crowbar passing
through it, on every frame of every clip. The fingers are curled joint by
joint now (`set_fingers`, knuckle 0.62 / middle 0.98 / tip 0.72) and stamped
into every action INCLUDING the four the scan shipped with, which carry no
finger curves at all; `calm` gets a looser hand because he is holding
nothing yet. The bend axis is the bone's own local X and the sign came from
rendering the hand close up, not from reasoning about the rig.

**THE BLOW IS WHERE THE WEAPON IS, AND HE HAS POISE.** Third pass on the
Dealer, after "stun-locked by light hits", "swings that don't look like
swings then you get hit", "the taunt hitbox is bad". Four things:

- **His strike is tested on the BAR** (`dealerBarHit`): six points from the
  grip out along the forearm's line to the tip, against a segment from your
  hips to your head, over the WHOLE active window, and only inside a cone in
  front of him. The pack lands a hit on a feet-to-feet distance at the first
  active frame with no direction in it — right for a thing with two-metre
  arms whose swing you learn by count, wrong for a man with a crowbar you are
  meant to watch. His `reach` came down with it (1.75–1.95 for the swings; a
  bar reaches two metres, not two and a half) and the lunge and the step in
  the overhand close the rest.
- **The startup is the swing you see.** `mutClipTime` squeezes the clip's
  wind-up into `wind`, and at 0.30 s the side swing's second of clip ran at
  three times speed — a blur, then you were hit. Every startup now runs its
  clip near real time (0.52–1.08 s).
- **Three lights to stagger him, and a guard of his own.** `kind.poise` (3):
  a light swing takes its point and does not move him until the third; only
  a charge or the overhead rocks him at once. `kind.block` (0.36): a light
  swing thrown while he stands ready and facing you meets the bar — steel on
  steel, your tool jars, a beat of freeze, and he holds the `block` clip
  0.46 s before he comes on. The parry is untouched and the riposte still
  doubles: that is the fight. `fidgetK` / `fidgetGap` cut the between-swing
  bark to a fifth — a man does not roar at you.
- **THE BEACH DOES NOT REACH DOWN THE HATCH.** Every distance in the fight
  code is x and z. The three pack crabs followed the player to the lid, stood
  on the sand over the roof, and bit him through forty metres of earth — that
  was most of the "hit boxes are bad": damage landing while the Dealer stood
  idle. Anything that is not `kind.solo` stands off while `inBunker`, and so
  do the crabs. Measured: 27 hits a minute from 15 swings before, 0 hits
  while he was not swinging after.

**AND THE REACH IS SOLVED, WITH THE FEET ON THE FLOOR.** "It just lags into
his hand" was a 30 cm gap between where the pickup put his hand and where
the bar lay. The peak reach pose is a coordinate descent in the pack
(`reach_pose`, `REACH_TARGET` in armature units: his right is -X, forward
is -Y) — and the error term has to include the SOLE, because the first solve
bent him down through the floor, the per-frame seating then lifted the whole
clip 0.43 m, and the hand went up with it. The target is measured in the
game (`d.bones.hand` at the grab frame against `crowbarOnTable`), never
computed from the numbers.

**THE DEALER'S CLIPS ARE BUILT ON THE MIXAMO IDLE, NOT ON THE BIND POSE.**
Second pass, after the owner called the first "horrible": every authored clip
used to be posed up from the rig's T with a hand-guessed stance under it, and
every one of them met the four source clips at a seam — a different arm, a
different shoulder, different hips, and a crossfade that showed all three.
The base of everything authored is now a FRAME OF THE SOURCE IDLE (`BASE`,
`HIP_BASE`, lifted once in `tools/dealer_pack.py`) and the helpers add motion
on top (`setrot` composes the delta onto the base quaternion). A clip that
starts and ends on the idle's own pose blends into it for free, the bar is
held the way Mixamo holds it in every clip, and no arm can find its way back
to the T. What went with it: **root motion is flattened** on the source
clips (the hips' sideways and forward curves held at their first value; the
game moves him, and the two fought — that was the "moving glitched out");
**seating is per frame** on the sole of the shoe mesh through the depsgraph,
lift only, because a constant lift seated the reach of the pickup and left
him standing a third of a metre off the floor for the rest of it; and every
clip is rendered as an EIGHT-FRAME STRIP before it ships, because three
stills of a swing is barely better than none. `pickup` is its own clip — he
turns to the shelf, drops his weight, closes on the bar at 0.46 (the frame
the game moves it from the console to his fist), and comes up already
turning back — and `updateDealer` drives it itself with `holdAnim` set, or
`mutAnim` fades it straight back out for the idle on the next frame.

**HE DIES ON THE RAGDOLL, WITH HIS OWN BONE NAMES.** The death clip was a
canned fall that landed him through whatever he stood against. The Verlet
ragdoll is written to `Character1_*` names and every reference goes through
`byName`, so a `boneAlias` built when he is dressed — `Character1_Hips` →
`mixamorigHips_00` — is all `mutRagdoll` needs; the floor it lands on is the
one under it (`bunkerFloorAt`, not the sand plane) and it does not ask the
sea whether it is wet. **The exporter drops the colon**: the bones arrive as
`mixamorigHips_00`, not `mixamorig:Hips_00`, and a regex that insisted on it
built an alias of zero entries and a ragdoll of zero parts — he froze
upright on the frame he died.

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

**A CHECKPOINT LOAD HAS NO GESTURE.** `beginGame` asks for the pointer lock
with nobody's hand on the mouse, the request fails, and `enterFallback` puts
the look on drag — right for a browser that cannot lock, wrong for one that
simply was not asked by a click. The way out of the fallback required a lock
to have ONCE worked, and on a fresh page it never had: the owner came back
from a checkpoint and dragged the camera round for the rest of the game. A
press on the world is a gesture, so it asks the browser outright even in the
fallback, and a lock that lands clears the fallback in `pointerlockchange`.

**AND THE FIGHT DID NOT WORK, FOR FOUR SEPARATE REASONS.** The owner called
it unplayable and every word of that was earned. In order of how much they
cost:

- **`MUT_ATTACKS` named his swings and the GLB named them something else.**
  The table calls them dDown/dSide/dHold/dLunge; the clips ship as
  attackDown/attackSide/attackHold/attackLunge. `mutPlay` looked up a key
  that was not there, returned WITHOUT TOUCHING ANYTHING, and left the walk
  cycle running — so he fought the entire fight walking: no wind-up, no bar
  coming down, nothing to read and nothing to time. `mutPlay` now warns on a
  missing clip, because a swing that does not exist should be loud.
- **Every clip must carry every channel.** Exported without baking, the four
  Mixamo clips came out with 22 rotation channels (the exporter drops
  whatever does not change) and the authored ones with 63 — so crossfading
  left forty bones holding their pose from the last clip. `export_bake_
  animation` is why the mutant never had this: 210 channels on every clip,
  no exceptions.
- **The stance heights did not agree.** Mixamo carries the hips a quarter of
  a metre below bind; the authored clips sat at bind, so every switch between
  the two families popped him up and down. The baseline is measured off the
  source idle now.
- **And then the feet went through the floor.** Lowering the hips onto that
  baseline with straighter legs than Mixamo's put the soles 12 to 28 cm
  UNDER the steel, which is what made the professionally animated swings
  look like hovering. Every authored clip is seated by a constant hips lift
  measured per clip — and measured on the SHOE MESH through the depsgraph,
  not on the foot bones: bone heads and tails over-corrected everything by
  five to twelve centimetres, because the sole hangs below the joint. Spread
  across all eleven clips went from 40 cm to 5.

**AND A HELD PROP IS HELD ABOVE THE FLOOR UNDER IT.** `PhysProp` clamped the
hold target with `Math.max(_pt.y, this.restH)` — an absolute height, a hand's
width over the SAND. Pick anything up forty metres underground and the target
was set forty metres over your head, and the spring threw it at the ceiling
at 24 m/s: every object in the bunker flew away the instant it was touched.
The beach's cliff clamp was in there too, three hundred metres from any cliff.

**THE BLUE BLOOD DEALER IS A MUT_KINDS ENTRY.** The first boss, and almost
none of him is new code: he is a kind in the same table the pack uses, so
the tell, the commit, the poise, the parry window, the riposte, the chain,
the feint, the token and the closing dash are all his by construction. What
`kind.human` turns off is everything that is a monster — the roar, the sand
throw, the severing and the Verlet ragdoll (all of which name the mutant's
own bones anyway) — and what it turns on is a death CLIP: a boss goes down
where he stood and you walk up to what you killed. `kind.solo` keeps him out
of the three loops the dock's cutscene runs over every mutant on the beach.
He is placed at `BUNKER_Y` under the hatch and clamped to the room by the
same nav grid the player is, because the fight AI works in world space and
knows nothing about walls. Six things this cost:

- **`skinnedBounds` measures in WORLD space.** Every creature on the beach
  stands on a group at y = 0, so "stand it on its own feet" and "put its
  feet at the group's origin" are the same arithmetic and the difference had
  never shown. Forty metres down it lifted him twenty-six metres into the
  sand over the roof.
- **He stood in a T-POSE through his own dialogue.** `frozen()` returns
  before the animation runs, and `mutPlay` fades a clip in over 0.14 s — so
  a mixer frozen on the first frame holds the skeleton at eight per cent of
  one clip, which IS the bind pose, and this rig binds in a T. The first
  clip is set to full weight at load, and a human keeps his idle through a
  dialogue (only a dialogue; the menu still stops him dead).
- **A model faces where the render says it faces.** The chain from FBX
  through two importers and an exporter flips twice; reasoning about it gave
  the wrong answer twice and a half turn that put his back to the fight.
  Render the thing alone from four sides and look.
- **The rest pose is a T, not a man standing.** Authoring arm angles as if
  0 meant "at his sides" left both arms straight out in every authored clip.
  `ARM_DROP` is the rotation from the T to a hanging arm and everything is
  measured from there.
- **He faces -Y in Blender**, which the rig itself says: the foot bone runs
  ankle to TOE and its tail is at y = -111.
- **A death that only drops is a puppet with the strings cut.** The root has
  to turn as well, or he collapses straight down into a heap on the spot.

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

**THE CUT IS A STRAIGHT LINE.** The first cuts rolled the blade over the top,
from pointing up on the near side to pointing down on the far side, and with
the pivot at the grip that is an arc: the tip rose over the upper middle
before it came down. The geometry is the lesson: a roll of Δθ through the
strike bulges the tip off its chord by L(1 − cos(Δθ/2)), and L is the whole
blade, so a straight line needs a SMALL roll — the blade already pointing
down the diagonal at the cock and turning only ~0.7 rad through the cut —
with the hands doing the travelling. The lip is across the tip, so it sweeps
a broad straight band. Both cuts run the same line, the heavy corner to
corner and the light shorter, and the numbers were SOLVED in the pane
(`__solve`: fit `side` and `lift` so the lip's middle lands on a target
screen point, then check the interpolated quarters), not guessed: the heavy
runs (0.86, 0.60) → (0, 0) → (-0.60, -0.76) at 16:9 and its quarters read
(0.54, 0.40), (0.31, 0.23), (0.13, 0.10). The hands are just off the right
edge at the cock, which is the price of a blade as long as the frame is tall.

**EIGHT SWINGS, AND A BODY THAT WILL NOT KEEP STILL.** The pack has four
attacks and every clip in it was already in the game, so new attacks are
DERIVED: `tools/mutant_anim.py` mirrors each attack across the rig (every
bone's armature-space pose matrix reflected across x = 0 and given to the
opposite bone, the local basis recovered from the reflected parent, parents
first — what "paste flipped" does, headless) into `attackM..attack4M`, with
their sources' timings and contact frames in `MUT_ATTACKS`; a swing you have
learned from the right comes from the left, and a chain can cross hands.
The walk clips were never played — everything that moved ran — and each kind
ran one cycle for ever: `drawGait` picks the walk, the run and the idle (and
the idle's pace) afresh every time a creature sets off or comes to rest, its
own kind's clip favoured, and a slow advance walks now. And while it waits at
reach without the turn it FIDGETS on an irregular count — a bark (the other
rage clip at 1.7x, `flourish`) or a twitch of a side-step — none of which is
a tell; a tell is only ever the swing. The ragdoll kick went up again
(`1.8 + power * 3.6`, weighted to the top of the body and lifted), because
the owner asked twice.

**THERE IS NO BACKHAND, AND A LIGHT CUT IS A CLICK.** A backhand on the
second click was built — the forehand mirrored about the middle of the frame
(`mirrorSide`), leaving from the far hip where the first cut finished — and
cut on the owner's word: two cuts in two directions inside half a second read
as flailing, and the light cut is the swing you make most. It is right to
left every time, so you know where the blade is going before you click. The
light cut also ran a third quicker than the sand shovel's click and was
called too fast: it is the same 0.44 s now (`swingSecs`) — with the blade
crossing the whole frame there is more to see than in a chop, and it needs
the time. The heavy stays quick for a heavy (0.69 s against the chop's
1.24), because a katana is not a sledgehammer.

**THE GLINT IS A SPARKLE, AND IT MOVES LIKE ONE.** The first twinkle sat on
the tip and jittered — a lamp with a loose contact. Now the moment the charge
tops out the light RUNS the length of the cutting edge from the root to the
tip (`GLINT_SWEEP`), big and bright, and arrives; then it holds, breathing
slowly and turning slowly, and every half second or so on an irregular count
it POPS — a sharp brightening and a flick of spin, gone in a tenth of a
second — which is what a highlight does when the hand holding the blade
trembles. The texture is the drawn one: a hot core, four long tapering rays
and four short diagonals, as gradient strokes so the rays fade rather than
end, at 96 px so the taper survives the retro downscale.

**THE GUARD IS THE SAND SHOVEL'S, ON EVERY TOOL.** Held scoop-up, the
Military Shovel's block put the bar the wrong way up with the blade on the
wrong side, and the owner asked for the sand shovel's back. As the guard
comes up the tool turns back into the dig grip (a quaternion SLERP — an
Euler lerp across the flip swung it through the floor) and the arm is
shifted so the NECK sits where the sand shovel's does, since that tool
pivots there and this one pivots at the grip. Measured: both bars span the
same stretch of the frame. The overhead keeps the neck pivot too — the slam
was laid out on it and approved — so the model slides down the mount on the
overhead's own grip blend, the lip markers riding with it, as the hands
change to a two-handed hold.

**THE TRAIL'S FIRST SAMPLE FILLS EVERY SLOT.** The strip draws a quad from
slot 0 to slot 1 as soon as there is one sample, and slot 1 still held the
last point of the PREVIOUS swing. On the chop that point was next to the
blade and nobody saw it; on a cut that finishes at the far side of the frame
it was a ribbon the width of the screen on the first frame of the next one.

**THE GUARD BOUNCES, IT DOES NOT RATTLE.** A blow stopped on steel used to be
a decaying sine on `parryGlow` — loudest at the start and quieter after,
which is a rattle. `guardShock` is a real spring (stiff, lightly damped) that
the blow DRIVES: it overshoots, comes back through and settles, three visible
bounces on a parry and half that on a block, and it knocks the tool across
you as well as up. Sparks come with it — eighteen additive points in
`vmScene`, pooled, thrown from `trailTip`, warm because struck steel is — and
a solid hit drives the same spring, so the weight of a landed blow and the
weight of a stopped one are the same language. A parry's freeze went to
0.19 s: a parry that only made a noise reads as a lucky block, and a fifth of
a second of the world stopped with the sparks hanging in it is the game
telling you that you did that on purpose.

**THE OVERHEAD IS A SLAM.** Both hands past vertical and drawn back, a hang
at the top, and then a QUARTIC drop — not the cubic the other swings use —
so it covers the last half of the fall in a fifth of the time. It lands
like it: the longest freeze of any swing, the biggest trauma, the lens
punched, the CAMERA dropped ten centimetres and let back up (`slamDip`, your
knees, not the shovel — applied around the scene render and removed, like
`hitRoll`), the guard spring hammered, sparks, `sfxSlam` (a sub that hits and
a crack over it), and a burst of sand off the landing point whether or not
there was anything there. **AND FULL CHARGE SHOWS ON THE BLADE.**
`tipGlint` is a sprite parked on `trailTip` every frame — so it rides
whichever tool is in hand — that TWINKLES while `windFull`: a smoothed random
flicker in size and brightness, which is what a highlight on an edge does and
a lamp does not. `sfxWindFull` was already the ear's version of this; a charge
with no full mark is a charge you hold too long every time, and now you can
see it as well as hear it.

**A BLOCK COSTS WIND; A PARRY DOES NOT.** Holding a shovel across a blow
that hard takes something out of you, and it comes out of the bar you run
on — so a fight you spend blocking is a fight you cannot back out of, and
timing it instead costs nothing. That is the whole argument for learning the
tell. `BLOCK_COST` is a third of the bar per blow stopped; at empty the guard
drops, `gaspOut()` puts a breath through your teeth, and the right button
refuses to raise it again until a third of the bar is back. The gasp fires
ONCE per emptying — one on every press while the bar is flat is a stutter,
not a body.

**THE GUARD, AND THE PARRY.** Hold right and the shovel comes up across
you; a strike that lands on it does nothing at all. The first `PARRY_WINDOW`
(0.20 s) after the press is a parry instead, which cancels the attack and
puts `crabState.stun` on for 1.7 s. `PARRY_COOLDOWN` (0.55 s) is what makes
that window mean anything: without it the window opens on every press, so
mashing right click parries everything and the timing is worth nothing.
Mashing must never beat reading. Blocking is untouched by the cooldown — the
guard still stops the blow, you just do not get the stun — and landing a
parry clears it at once, so a win lets you act on what you earned. `blockStart` is measured from the PRESS,
not from whether the pose has settled — committing to the timing is the
skill, waiting for an animation is not. The two sounds must never be
confused: a block is a dull wooden knock, a parry is a struck-steel ring,
and that difference is the whole mechanic.

**A view model at -0.22 is behind the near plane.** `vmCamera`'s near is
0.01 and the arm rests at -0.62; pulling the guard in to -0.22 did not read
as "close", it made the shovel vanish. -0.56 and out to the leading side is
the pose that reads.

**The pointer lock never gives up.** `scheduleLockRetry()` used to stop
after six tries and leave the player to click, and Safari makes that a
regular event — its "press Esc to reveal the pointer" banner eats a
keypress, it drops the lock on its own, and its post-exit cooldown outlasts
six retries. It asks every 600 ms for as long as the game wants the lock;
any press on the world takes it back (on `pointerdown`, since the click may
never arrive); focus / visibilitychange ask again; and a drag fallback that
latched after a real lock once worked is undone by the next press.

**Right click is the guard and NOTHING else.** A left button held under
`WIND_TAP` when the right came down left its wind-up latch pending; it fired
`startWind()` under the guard, and letting go of the left button landed a
heavy out of a block. The right-press clears the latch every time,
`startWind()` refuses while `blocking`, and the click handler ignores any
button but the left and any click made under a guard.

**The sandcastle is a scan, and the break is a triangle-grid fracture.**
`assets/sandcastle.glb` (assetfactory) is welded into ONE geometry in metres
with its base on y = 0 at load, because `breakCastle()` cuts it up by
walking its triangles into 0.28 m cells — each occupied cell becomes a chunk
with its own body. Nothing is sliced; a chunk's ragged edge reads as a
break at this triangle count. Cells are stacked, so the keep comes down as
lumps and the base stays a low ring, and higher chunks are thrown further.
The collider is pushed by the loader, not at module time: a `Box3` of an
empty group is size zero. The break is a SLUMP, not a burst: chunks are
sorted into layers by height and let go top-down, 70 ms apart, each barely
lifting and coming to rest part-buried (rest height under its own
half-height) — the first version threw everything up at once, which is an
explosion, and sand does not explode. It stands at x = 10.4 on the dry
beach with a `makeApron()` bank round its foot, tinted to `sandMat`'s own
family; at x = 4.6 it was inside the swash and sat in the sea half the tide.
The crab running into it and the shovel hitting it both break it.

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

**The crab is a scan with five hand-built clips, and the ATTACK one is
driven by the combat clock.** `assets/crab.glb` is artofmickey's CRAB 001,
rebuilt by `tools/crab_anim.py` (Blender headless): 32.5k tris decimated to
12k, the scan's own albedo/roughness/normal kept, and `idle` / `walk` /
`attack` / `stun` / `die` authored on its own rig. Two things about that rig
had to be fixed before a single frame could be keyed — every limb chain was
an unparented ROOT, so the body could not carry the legs, and there was a
stray bone 7449 units under the world.

The clips are chosen in `crabAnim()`, and the attack and the stun do NOT run
at their own rate: their `action.time` is written straight from
`crabState.atk` and from `CRAB_STUN - crabState.stun`. That is the whole
point. The claw going up IS the parry tell, so it cannot be allowed to drift
out of step with the frame the blow actually lands on — the clip is authored
at 30fps with contact on frame 9, which is `CRAB_WIND` exactly. Move
`CRAB_WIND` and you must move the pose beats in `tools/crab_anim.py` too.

**A CRAB GOES SIDEWAYS.** Standing still at reach shifting its weight was the
one thing this animal should never do. It scuttles ACROSS you instead and
changes its mind about which way often enough that you cannot lead it — 67 m
of lateral travel and fourteen direction changes in thirty seconds of fight,
across three of them, while they hold a metre and a half. The one holding the
turn crowds in as it circles; the others hold the range and wait.

**AND EVERYTHING THE MUTANTS TAUGHT CAME BACK TO THE CRABS.** At 2.35 a crab
was a metre a second slower than your walk, so every fight with one was
optional — you strolled away from it. `CRAB_SPEED` is 3.75, it closes through
its own wind-up at 0.6x, it rejoins at 1.35x past seven metres and it DASHES
at 6.4 to cross a gap you opened. The three of the pack take it in turns
(`crabToken`, handed out to whoever has waited longest and is in reach), they
feint, they push off each other, and a blow on a parried one counts DOUBLE.
Thirty seconds of holding S went from a stroll to ten damage with all three
inside a metre and a half. And they are not one shell in three copies any
more: each carries its own size, tint and lift — bleached and big, small dark
and wet, rusted — and the material is CLONED per unit, because `parse` hands
every copy the same one and tinting it tinted all three.

**THE CRABS ARE A LIST.** There used to be exactly one and every part of it
was a global — the group, the state, the mixer, the clip map. Three of them
come out of the water together before the dock, so all of that moved onto a
UNIT (`makeCrabUnit`) and the loner became `crabs[0]`; `crab` / `crabState`
still name that first one because the shovel, the blood counter and the
harness all reach for them. Anything that can hit *a* crab — the blade
(`digImpact`, `aimLand`), a thrown prop, the knockback — walks `crabs[]` and
picks the nearest one it actually reached, and `killCrab` / `parryCrab` /
`blockCrab` all take the unit so a parry stuns the crab that swung and
nothing else.

**A skinned mesh cannot be `clone()`d.** The clone shares the skeleton and
every copy then walks in lockstep, and SkeletonUtils is not vendored here —
so the .glb is fetched ONCE and `GLTFLoader.parse()` is run per crab off the
same buffer. Four parses, one download.

**ONE RULE FOR EVERY TAKEABLE ON THE GROUND.** A syringe is 14 cm and a CD
case is 12; on a dark beach at head height those are a few pixels and you
walk past them. Rather than a hand-tuned scale per item — which is how the
ring got a glint and the syringe did not — `addInteractable` gives anything
with kind `'inventory'` the same treatment: `makeNoticeable()` measures it
and lifts it until its longest side reaches `ITEM_MIN_SIZE` (0.42 m), then
adds the shine. It is a FLOOR, not a multiplier, so the shovel (0.81) and
the horseshoe crab (0.73) are left exactly as they were. Two things it has
to get right: the measurement SKIPS `hitProxy`, which is an invisible sphere
of at least 0.4 m — include it and everything measures the same and nothing
ever scales — and a scan that has not landed yet measures zero, so it retries
for a few seconds rather than blowing an empty group up to the cap.

**No click when the audio starts.** A context created inside a gesture can
still come up SUSPENDED, and while it is suspended `currentTime` does not
move — so the four-second master fade `startAmbientAudio()` schedules is
measured against a stopped clock and is already in the past when the context
runs. The whole bed arrived at full level on the first block of samples.
`fadeInMaster()` re-arms it from the live clock after `resume()` resolves.

**A chunk of castle is a LUMP, not its triangles.** Cutting the mesh by cell
and keeping the raw triangles gave each piece a scatter of long thin slivers
— at this triangle count a cell is a handful of big faces and the leftovers
stuck out like spines. Sand does not break into spikes. The cell still says
where a piece is and how big it is; the piece itself is a rounded icosahedron
knocked out of round. It also needs its OWN material: on `castleMat` a
rounded lump's uv samples wherever it happens to land on the scan's baked
atlas — mostly the dark parts — so the heap came out far darker than the
castle it fell off. `castleChunkMat` is the beach's own grain lifted (the map
multiplies) to the tone the castle actually renders at, so the pile matches
the thing that made it and settles into the sand around it.

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

**The mushroom house (`MUSH_X` / `MUSH_Z`, 90 m past the tall one).** The
Bell Pavilion — La Jolla's "mushroom house" — built to the photographs in
`models/mushroom-house.js`, GENERATED like the lighthouse, not imported: a
round concrete room on a single column, its underside a flaring dish of 28
radial ribs (the gills), a band of 26 steel-framed window bays all the way
round under a low roof with a ribbed ceiling, and below it a bunker on a
raised platform: a low parapet across the front with an iron gate hanging
open in it, and a tall retaining wall round everything else. Inside the
column a spiral stair of cantilevered treads winds round an open well up
into the room, a rail on the well side and a rail round the well above with
a gap where the stair arrives. Abandoned: 42 % of the panes
gone and another fifth broken to a half, glass on the floor under them,
streaked and tie-holed concrete with spray tags on a few wall bays, a dead
pendant lamp. Everything the walk needs is in `MUSH` (radii, `H_ROOM`, the
door's angle and half-width, the stair's rise, treads, turns, `A0` and
`TOP_ANG`); the stair goes UP as the angle DECREASES, the lighthouse's
convention, and `updateMushroom()` is `updateTower()`'s shape: regions and
clamps, the climb by winding, the tread snap.

**WHERE YOU ARE IS REMEMBERED, NOT INFERRED.** `mushWhere` is `'out'` /
`'stair'` / `'floor'` and the transitions are the three real ways through:
the doorway at the bottom, the top tread, and the gap in the well rail.
Before that the room was "feet high enough and far enough out from the
axis" — which is true of the top three treads as well, so ONE STEP DOWN off
the top tread put the room's floor back under you and its rail back in
front of you, and there was no way down again. That was the owner's
"barrier". The two well transitions carry hysteresis — in at the tread line
(`BORE − PLAYER_R·0.55`), out at the well line (`BORE`) — so standing on the
lip cannot flicker between them. Three older traps live in the same
function: **the wall clamp parks you at exactly `COL_R + PLAYER_R`, so an
entry test of "closer than that" was never true** and you could stand in the
doorway pushing forever (the door admits you from 0.3 m further out); at the
top the well's inner clamp has to OPEN or you can never step off onto the
floor ring; and the cliff clamp has to lift inside the house.

**THE COUNT IS NEGATIVE AT THE DOOR.** `A0`, the first tread, is 0.6 rad
round from the doorway, and the floor is flat over that stretch — so a count
clamped at zero from the door credited you with those 0.6 rad: you stood a
third of a metre above every tread you climbed, and at the top the height
said you had arrived a fifth of a turn before the top tread and the gap in
the rail actually were. `MUSH.TURN_MIN` lets it go negative and the treads
and the walk line up exactly (`height = PLAT_TOP + i·STEP` at
`ang = A0 − i·stepA`, both sides). The same rule applies stepping INTO the
well from the room: derive the count from `TOP_ANG` and the angle you came
in at, never a flat `TURNS`.

**THE YARD IS PAST THE CLIFF LINE TOO.** The column's axis is ON it, so with
the cliff clamp running inside the bunker you could walk the seaward third
of the yard and never get round the back of the column. The walls are real
colliders and a closed ring but for the gate, so they hold you instead
(`mushInYard`); the only way out of the ring is seaward, well short of the
clamp, so dropping it can never snap you anywhere.

**THE SHAFT IS WALLED THE WHOLE WAY UP.** It used to stop at `DISH_Y0` and
leave the last two metres of the climb standing in the open inside the flare
of the dish — from the room you looked down on the top third of the stair
hanging in mid-air. It is one tube from the platform to the room floor now;
the door is a gap in the bottom of it and its top edge is the lip of the
well, flush with the floor.

**NOTHING IN THE ROOM IS BROWN.** The window frames were dark wood and the
sill was capped with it, and at eye height in a round room that is one
unbroken tan band all the way round you — the only warm thing on a cold
beach and the first thing you look at. Weathered grey steel, concrete sill,
and the bench went from cream to a cold pale stone for the same reason.

Walk it with `__bw.step`, `__bw.keys.KeyW` and `__bw.look()` steering at the
next point on the spiral: in at the door, up, off onto the floor ring, round
the room, back in at the gap, down and out is 89 / 160 / 44 / … / 164 / 125
ticks and no snap over 9 cm in a tick. That test is what finds all of this.

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

**The mutant (`MUT_X` / `MUT_Z`, 130 m past the pavilion).** cgtrader's
"Mutant 01", and the first asset here that ARRIVES WITH ITS ANIMATION — a
70-bone HumanIK rig and seventeen separate clip FBXs authored on it. So
`tools/mutant_anim.py` poses nothing: it joins the base mesh's four pieces
(the animation FBXs carry a copy of the mesh with NO UVs — anything textured
has to be built on `base_mesh.fbx`), keeps only the ARMATURE's action out of
each clip file (each one also brings 83 HumanIK control empties with an
action apiece), drops every finger curve — 32 of the 70 bones, and most of
the animation data, for joints that never move a pixel at this range — and
exports eight clips as glTF actions. Texture set 02 of the three: pale grey
flesh with raw red. Sets 01 and 03 are dark red-brown, which on this beach is
a hole in the dark.

**WHERE THE BLOW LANDS IS MEASURED, NOT GUESSED.** The attack clip's time is
written from the combat clock the way the crab's is — the swing you can see
IS the tell and must not drift out of step with the frame the damage is dealt
— but this clip's contact is 41 % of the way through it and the startup and
recovery it is mapped onto are not the same length, so `mutClipTime()` maps
the two halves SEPARATELY. `MUT_CLIP_HIT` comes out of the build, which plays
the clip on the rig and finds the frame where a hand is furthest forward and
moving fastest. Retune `MUT_WIND` and the hand still arrives on the damage
frame; map it linearly instead and the picture and the hit come apart.

**FOUR SWINGS, DRAWN, NOT SCHEDULED.** One overhand on one clock was read
in two exchanges: the guard went up on a count. `MUT_ATTACKS` carries four —
the overhand, a fast swipe, THE HELD ONE (a second of hang at the top, so a
guard raised on the first count is a block, not a parry) and a lunge that
covers ground through its strike — each with its own startup, reach and
measured contact frame, and the pick is weighted random after the first
swing of a fight, which is always the overhand. A swipe chains into the
overhand (`chain` / `chainP`), once, with the second startup already under
way, so a parry is not the end of an exchange. Between swings it circles
(`strafeL` / `strafeR`, `MUT_STRAFE`) or steps back into the lunge, on a
cooldown drawn from a range. THE CHAIN IS DECIDED ON THE STRIKE, not at the end of the recovery — by
then the blow's own knockback had you out of range every time and it never
fired once — and the follow-up steps in through its startup. POISE: a plain
click into the last 45 % of a committed startup takes its health and does
not break the blow; a charge, a parry or a throw always does. It commits for the last fifth of every startup
— the turn stops — which is the timing a sidestep should have.

**NO NIGHT LIFT ON THESE EITHER, AND THE OCCLUSION GOES IN THE MAP.** They
shipped at emissive 0.30 off their own map over a 0.74 gamma re-expose and
came out as three bright grey figures pasted on a dark beach — the Military
Shovel's trap: a lift applied to a whole map raises the DARK parts furthest,
so it flattens the folds and sockets that make a body read. But the answer is
not simply to remove it: at 0.085 the maps went entirely and all three were
the same black creature at fighting range, which is worse, because you cannot
tell which one is on you. The fix is in the TEXTURE, not the shader.
`tools/mutant_tex.py` multiplies each set's ambient occlusion into its albedo
— there is one directional light here and it is behind you, so nothing in a
crease is ever shaded by the renderer and the depth has to be baked — and
brings the whole map down at source. The shader then does almost nothing:
emissive 0.20 off the map, gamma 1.0, and the COLD RIM, which is the one
thing that must stay. It is the edge that separates two metres of dark flesh
from a dark beach; without it they do not lurk, they vanish. 4K sources
resized once beat the pack's own 2K maps resized again.

**AND THEY ARE NOT BUILT ALIKE.** One mesh, one skeleton, three sets of
proportions: `kind.bones` scales named bones on each parsed copy BEFORE
`skinnedBounds` measures it, so a bigger head or a longer forearm changes the
silhouette and the creature is still stood on its feet at the right height.
`PETALS` is the twelve flaps of the split-open skull — the fastest way to
make one head not another. This works ONLY because the build strips the scale
channels: the FBX bake keys a scale of 1.0 on all seventy bones of every
clip, 1920 curves carrying nothing, and the mixer was stamping them straight
back over anything set here. The tool prints the worst deviation from 1.0
(0.0000) so that stays honest.

**AND THEY MUST NOT MOVE ALIKE.** The pack has two runs, two idles, two rages
and two deaths, so each kind gets its own in `kind.anim` — but two of them
share a run clip, and the thing that makes those two different animals is not
the clip, it is `rate` and `lean`: the small one plays Run02 at nearly twice
speed bent thirty degrees over its own feet, the big one at four fifths
almost upright. The lean goes on the MODEL group, never the skeleton and
never the heading, and eases in with the running so a standing creature is
never tipped.

**THREE OF THEM, AND ONE SKIN EACH.** The pack ships three texture sets, so
the variations ARE the sets: 02 is baked into the GLB and 01 (flayed red) and
03 (dark green-brown) come out of the build as loose 150 KB colour JPEGs. One
download, `GLTFLoader.parse`d once per unit — a skinned mesh cannot be
`clone()`d — and two of the copies swap `map`. The material must be cloned to
do it: `parse` hands every copy the same one. Only the albedo changes; the
sculpt is shared, so one normal and one roughness serve all three. What makes
them read as different animals is `MUT_KINDS`: height, health, and scalars on
speed, startup and reach, with the swing table SCALED per kind rather than
restated (`windK` moves startup and recovery together, so the big one's reach
is paid for with the punish window), plus which swings it owns and a `voice`
— a pitch and two weights that every sound it makes goes through.

**ONLY ONE OF THEM MAY SWING AT A TIME, AND THE TURN IS HANDED OUT.** Three
tells at once is not three times the fight, it is no fight: nothing to read
and no answer that is not luck. `mutToken` is given, once a frame, to
whichever is in range and has gone longest without a swing (`st.wait`).
Letting them GRAB it instead was measured and was wrong: a cooldown scales
with `windK`, so the small fast one took nearly every turn and the big slow
one swung twice in a minute. Handed out, sixty seconds shares 11/10/7 with
zero frames of two swinging. Anything that cannot use the turn — stunned,
rocked, dead, or wandered out of reach — gives it back. The step back keeps
the turn through it and does not swing without it, which was the one path
that used to slip past. `mutSeparate()` pushes them off each other or the
three converge into one silhouette with six arms.

**AGGRESSION IS THE COOLDOWN, AND THE SPRINT MUST NOT STOP WHEN THE TAKE
DOES.** They stood about between swings; the gap between turns is a fifth of
a second now, scaled by `kind.aggr`, and the ones without the turn circle IN
to just inside their own reach rather than holding a polite ring, so backing
away from one is backing into another. The red one hits for TWO — you have
three — which is fair only because its startups are the longest thing in the
fight and its recovery the most punishable; the dark one chains twice, three
swipes on the end of each other. Thirty-two swings a minute, split 14/10/8,
one tell at a time. And they come through the cutscene at nearly twice speed,
so handing back at their walking chase speed was a visible gear change at the
exact moment that had to look like nothing happened: `st.sprint` carries it
over and decays across the next second and a half.

**"I BACK UP AND NEVER GET HIT" IS FOUR BUGS, NOT ONE.** (1) A startup that
stands still is a startup you outrun by holding S — they walk the wind-up in
now, at two thirds of a run, and stop only for the last fifth, which is the
commit. (2) At 4.1 the big one made 3.5 against a 3.4 walk; base speed is 4.6
and nothing is slower than you. (3) CIRCLING IS NOT CHASING: it closes at a
metre and a half a second while you retreat at three and a half, so a
creature that kept orbiting lost ground every time — it breaks off past reach
+ 1.5. (4) Every swing still costs ground (advance at two thirds, stand
through the recovery), so past eight metres a straggler is not fighting, it
is REJOINING, and it does that at 1.4x. Holding S for forty seconds went from
free to eight damage, eight dashes and most of the wind bar. `MUT_DASH` is
the closing burst at 8 m/s — faster than you can sprint — and it ends in a
swing, so a gap you open by running buys one exchange, not an exit.

**THE ONE AT THE BACK THROWS SAND.** Three creatures that can only hurt you
inside two and a half metres are three creatures you walk away from. It costs
WIND, not health — a ranged attack that can kill you turns the fight into a
race — and it takes exactly what backing off to breathe is for. It LEADS the
throw and misses if you move, which is the whole fairness of it: a reason to
stop retreating, not a punishment for having. It fires when everyone is far
OR when this one is the straggler (`dist > 13`), so nobody out there is idle,
and it does not need the turn, so somebody can be swinging at you while
somebody else throws.

**THE RIPOSTE IS WHAT A PARRY IS FOR.** A blow landed on one you have just
parried counts DOUBLE. Without it a parry only bought time, and time is not a
reward; with it, reading the tell takes half a seven-health creature off in
one swing. FEINTS are the other half: it throws the startup, gets most of the
way through and does not swing. There is no way to read that but to watch the
arm, which is the point — a tell you can answer on a stopwatch is not a tell.

**MEASURING ANY OF THIS NEEDS `heal()` EVERY FRAME.** A sample that lets the
player die schedules `location.reload()`, and the page comes back mid-loop
with everything reset — the run reads as seven swings a minute and the
distances read as six hundred metres, and neither number means anything.

**THE CUTSCENE IS A LENS MOVE, NOT A POSE.** `mutCut` joins `packCut` in
`frozen()` and in the pointerlock guard; the camera is TURNED, never moved,
so every clamp still agrees and the hand-back is exact. Two things it got
wrong first. It threw the field of view WIDE for a beat before punching in,
and at 118 degrees three creatures thirty metres off are specks — half a
second of nothing at the head of a five-second shot. And it then OPENED the
lens as they closed, which made them shrink: the field of view widened faster
than the distance fell, the exact opposite of the shot. It goes straight in
now (settings.fov to 24 in half a second, tight before the first roar lands),
HOLDS there while they grow, and gives back only a little inside fifteen
metres. The rest is `mutCutOut`: four tenths of a second of lens after the
take is dropped, while the player already has their hands — which is what
makes it seamless instead of a one-second zoom-out over the opening of the
fight. During the cutscene `updateMutantCut` drives them itself and returns
true, so `updateMutantUnit` never runs and `frozen()` cannot freeze them.

**FIVE HIT POINTS IS THE DESIGN.** A light swing takes one and a charge takes
two, so it is three heavies at best and five exchanges at worst, and the free
heavy a parry buys is the whole loop — read the tell, take the stun, wind all
the way up, land it. Two would have made the parry a nicety. `MUT_STUN` (2.1)
is longer than a crab's for the same reason: what a parry buys has to be
worth going for. It hits for ONE, not two — `MAX_HP` is 3 and the danger is
meant to be its reach and its pressure, not two-shot deaths.

Everything else is the crab's shape: wake, roar (it does not move through it,
which is the beat that says what the rest of this will be), close, and the
three outcomes on the active frame. Four things particular to it: it faces
+Z after export, so `rotation.y = atan2(dx, dz)` with NO `+ PI` (the crab's
front is -Z); `skinnedBounds()` is the only measurement of it that means
anything; it is REMOVED from no list when it dies — a body goes down and
stays down, and gibbing a humanoid the way the shovel gibs a crab would be a
different game; and `damagePlayer` asks `nearestFoe`, not `nearestCrab`, or
a blow from this one knocks you away from a crab 300 m back up the beach.

**`__bw.step` HAS TO DRAIN HITSTOP.** It is `update()`, and `hitstop` is
counted down in `animate()` — so under the harness a killed crab or mutant
sat in its impact frames for ever, because the frame that finishes it is the
frame hitstop reaches zero. `step` now does what animate does: drain it, and
scale dt by 0.08 while it runs.

**AND THE INTRO IS ON A WALL CLOCK.** `beginGame()`'s card is `setTimeout`s,
so a thousand `__bw.step` calls in one `javascript_tool` call all run while
`introDone` is still false and `update()` does nothing at all. Call
`beginGame()`, let the tool call END, and step in the next one — or set
`sessionStorage['beachwalk.skipIntro'] = '1'` before a reload and it starts in
the walk at once. `__bw.heal()` puts the harness player back to full. Teleporting
down the beach also trips the pack cutscene (`packCut` is in `frozen()`);
step until `__bw.packPhase` reaches 2 before expecting anything to move.

**The tall one (`SMILE_X` / `SMILE_Z`, past the snorkeler).** Vertex
Mercher's "The smile (Rigged)" — a 165k-triangle rig with no clips — built
by `tools/smile_anim.py` into `assets/smile.glb`: decimated to 24k with its
own maps, and `idle` (a tall thing standing very still) and `run` (a flat
sprint) authored on its 21 bones with the crab pipeline's helpers. It
stands on the dry sand between you and the moon, a black silhouette with a
pale grin (`color` × 0.10 and NO rim on the body — a Fresnel rim was tried
and read as a white sheen over the whole figure; the face keeps its map,
is lifted, and carries enough emissive to show in the dark), turning slowly
to keep its face on you; inside `SMILE_SEE` (9 m — close enough to see the face) it bolts for
the sea at `SMILE_RUN`, wheels to -X, and goes under like a dive the moment
it is past the wading line; it is REMOVED — `scene.remove()` and out of
`farProps` — the frame the top of it is under the drawn sea WHERE IT IS
(`waterSurfaceAt`), not at a distance: the swell out there drops two
metres and the first build left its head standing out of a trough for
seconds. And it has to be removed, not hidden: `visible = false` was undone
the next frame by `updateFarProps()`, which switches every `farProps` entry
on or off by distance, so it stood back up at its last spot with its head at
the surface for the rest of the game. Anything in `farProps` that is meant
to go away for good must leave the list. **THREE THROATS, NOT ONE TRANSPOSED.** `mutTone()` picks an instrument off
`V.throat`: `bellow` is a sawtooth stack with a slow swell and a sub under it
(a thing too big to hurry, and it arrives before it does), `chitter` is a fast
square tremolo through a high formant (teeth, not lungs), `wet` is the
original rasp. Every voiced sound goes through it, so a tell, a laugh and a
hunger call from one creature are recognisably the same creature. It LAUGHS —
five or six bursts on a falling contour — when it lands a blow on you, and
when one of them dies THE OTHERS LAUGH, which is the cheapest thing in the
whole fight and the one that most makes them a pack. And it breathes:
`sfxMutHunger` every few seconds inside sixteen metres, quiet enough never to
become the noise the fight is made of.

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

**ONE GAIT FOR EVERY TRAIL.** `FOOT_SIDE` (0.26 m off the line, each foot
on its own side — a clear zigzag, left well left and right well right; at
0.16 the owner still read the trail as a line), `FOOT_STRIDE` (0.66 m) and
`FOOT_TOE` (0.12 rad out), off a photograph of a walk along a beach. The player's own prints (`stampFoot()` and the stride gate),
the trail behind the spawn to the drain (which used to wander on a sine
and stride 0.8), and the campsite trail all use them — a trail with a
different spacing reads as a different animal. The print quad is 0.31 m
across: a foot is wider than it looks.

**A footprint is ONE depression with a shadow INSIDE it.** Built off a
photograph of a bare print in wet sand: the whole sole is a single shallow
floor with a continuous edge, the shadow lies inside along the wall that
faces away from the moon (the floor is darkened under a clip and the
darkening lifted off with `destination-out` through the same shape shifted
toward the light, which leaves a band on the far side), a faint lip sits
outside the lit edge only, and the toes are small deep pits. Two wrong
versions preceded it: pale rings round every part (a cartoon) and then rings
so faint the print was nothing at all. The wall shadow is what sells depth.

**A thing you set down is the SIZE YOU FOUND IT.** `dropEquipped()` built
the world model by cloning the VIEW model, which is scaled and posed for the
hand — the shovel's is 0.48, and everything `holdable()` makes carries
whatever scale it was given — so a shovel you dropped came back half the
shovel you picked up. It clones `inspectModel` now: the object at the size
it was authored, and `inspectSetModel()` guarantees its own transform is
identity (it scales a wrapper, never the model), so it clones clean.

**The three, and the wakes.** `PACK_Z` is `DOCK_Z + 18`, in front of the
shed.
They wait a long way out with `wake: 0`, so they never notice you on their
own; crossing `PACK_TRIGGER` starts the cutscene and what wakes them is its
end. **The trigger is the player's z ALONE** — it does not care whether you
are walking the waterline or the foot of the cliff — and it has to be a long
way past the wreck: at `DOCK_Z + 34` with a 22 m lead it fired at z = -159,
four metres past the wreck at -155, so it went off the moment you were clear
of it instead of on the last stretch to the dock. It fires at -177 now, 22 m
past the wreck and 38 m short of the shed. Two things make it work: `updateCrabUnit` already hides anything with a
submersion over 0.92, so on the way in there is nothing to see BUT the wake —
which is the whole idea — and they have to come ashore at the WATERLINE
(`PACK_SPOTS` at x ≈ 2–4), because arriving out in the deep ended the
cutscene on three ripples and nothing standing in them. The camera is TURNED,
never moved, so every clamp still agrees with where you are standing and you
are exactly there when it lets go. `packCut` is in `frozen()` and in the
pointerlock guard, like `peeking`.

**It comes at you HEAD ON.** The model's front is -Z (Blender +Y), so
`crab.rotation.y = atan2(dx, dz) + PI` faces it at you; the old `+ PI/2`
walked it sideways, which is what crabs do and what nobody can read a
claw swing from. The walk is a forward gait (legs striding about Z in an
alternating tripod), the lunge is along +Y, and the lead claw goes from
cocked HIGH over the body to slammed down and forward — a small horizontal
component only, so the arc comes AT the camera rather than across it.

**The stun is flat on the sand.** It used to hang in the air and wobble.
Now it collapses in six frames — body dropped by a full unit, legs splayed
out level, claws dropped open where they fell — lies there twitching for
most of `CRAB_STUN`, and drags itself back up over the last eleven frames.
The clip is exactly 1.7 s so the getting-up lands as the timer runs out.

**A parry plays `assets/poise-broken.m4a` on top of the ring** (via the
`poise` sample bank) — it is a ripped Elden Ring effect the owner supplied,
so it is NOT redistributable and is credited as such. The block got heavy:
a sub thump under a quarter-second of low body, a mid crack through a
waveshaper, and the dead steel clank kept on top so it never reads as the
parry.

**Before this, the entire telegraph was INVISIBLE.** The loader sets
`crab.userData.rig.visible = false` once the model lands, but every line of
the attack — the rear-up, the twist, the claw sweep, the gaping pincer, the
squash — was applied to that now-hidden procedural rig, and the only thing
actually on screen was one 0.48 s walk loop at a scaled rate. There was
nothing to read and so nothing to time a parry against. The procedural pose
code is still there and still runs, because it is the fallback for when the
.glb does not load; it just is not what you are looking at any more.

**A claw thrown far enough to read will shear.** The first wind-up put the
lead claw through 83 deg at the shoulder on top of a 72 deg swing and a roll,
and the skinning stretched it into a blade. The pose is worth less than the
silhouette: at about two thirds of that amplitude it still reads across a
beach and the shell holds together. And the claw has to ARRIVE on the contact
frame — the first build peaked at f12, three frames after the damage, so the
hit and the picture of the hit were 100 ms apart.

**The crab's swing is an ARC now.** It used to rise and lunge straight down
the line at you, which from the front is a shape barely changing size —
nothing to read, nothing to time against. The body cocks away first
(`atkTwist`), one claw draws back across itself (`atkSweep`), and then
everything comes through together and overshoots. Anticipation opposite the
action is the only thing that makes a strike legible early enough to answer,
which a parry window requires.

**The crab's attack is telegraphed — startup / active / recovery.** It used to
land the same frame the crab came into reach, with the lunge pose playing
*after* the damage: nothing to read and nothing to do about it.
`CRAB_WIND` (18f) rears it up with the claws thrown wide and the pincers
gaping, `CRAB_STRIKE` (6f) puts the damage on the first active frame, and
`CRAB_RECOVER` (20f) leaves it wide open. Two details carry it:

- **Reach is re-tested on the active frame**, not when the wind-up began. A
  tell is only fair if getting out of the way is a thing that works — and it
  does; back off during the startup and the snap closes on nothing.
- **It winds DOWN as well as up.** `atkSquash` compresses the body onto its
  legs through the startup and stretches it through the strike. A wind-up that
  moves the same way as the strike reads as no wind-up at all.

`sfxCrabTell()` is a rising rasp over exactly `CRAB_WIND` seconds, so the
sound is the countdown. Keep it unlike `sfxCrabSnip()` — confusing the tell
with the strike is worse than having neither.

**Anything that refreshes `hitstop` must fire ONCE.** `hitConnect()` sets
`hitstop = max(hitstop, 0.03)`, and under hitstop the world runs at 8 %, so
a test that stays true while the world is frozen re-freezes it every frame
for as long as it stays true. The thrown-prop kill did exactly that: the
body sat inside the crab's 0.75 m at 8 % speed for hundreds of frames, each
one calling hitConnect() and building a fresh sfxConnect graph — four
seconds of stall and a few hundred sounds, which is what "throwing at the
crab lags" was. It is gated on `crabState.struck` now, like killCrab().

**The kill is two beats.** `killCrab()` no longer bursts it. It sets
`crabState.struck`, plays `sfxCrabHit()` and starts `CRAB_HIT_STOP` (5 frames)
of frozen time; for exactly those frames the crab is still there, folded up
under the blade in a hard squash and thrown back along the swing, and then
`finishCrab()` brings the gibs. The hold ends on `hitstop` reaching zero and
not on a timer of its own — `hitstop` scales `dt`, so anything measured in
`dt` would stretch to ten times its length. The freeze and the squash are
meant to be the same beat.

**The headland is dressed from three scan packs** — `assets/stones.glb`
(shtran), `assets/grass-clumps.glb` (3dhdscan, four alpha-card clumps pulled
out of a 78k-tri scene with `gltfpack.py --nodes`), `assets/grass-patch.glb`
(Pasha, one 30k-tri blade patch, `--min-tris` to drop the demo quads). All of
it is placed by `headlandAt()` and kept off the lane by `onPath()`, bedded
into the ridge by a fraction of its own height PLUS half the drop across its
footprint (`slopeAt`), because a rock set at the surface of a slope hangs its
downhill edge in the air. Stone gets a fraction of the lift the beach
formation has — at the formation's emissive the field glowed like lamps.
Boulders (the four big ones) carry `rockColliders`. The dense patch is 30k
triangles an instance: 12 of them is the budget. And `lhGround` is in
`farProps` at 320 m — InstancedMesh is culled by its base geometry's bounds,
so every scatter here runs `frustumCulled = false`, and without the far cull
the whole headland draws from the spawn.

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

**The preview browser is fragile with this scene.** It can't pointer-lock, it
throttles `requestAnimationFrame` when the pane isn't focused, and long
`javascript_tool` calls (especially ones that start the audio) will kill the
pane. Drive tests through `window.__bw`, keep calls short, and force a frame
with a screenshot before reading state.

## Conventions

- Match the existing terse style: one file, grouped by `// ---` banners,
  short helper functions, `_scratch` temp vectors reused across frames.
- Keep it dependency-free and offline (vendored three, synthesised audio,
  procedural textures). New assets go in `assets/` and must be small.
- Everything flat-shaded / low-poly / cold-blue palette; keep the retro look.

## Open ideas

Real note art for the bottle · more items and scripted events along the walk
· prop-vs-prop physics · persistent dig holes · a nicer two-handed dig anim.
