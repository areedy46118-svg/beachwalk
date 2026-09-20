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

**A KEY POINTED AT YOU IS A STICK.** The wheelhouse key was set in the
captain's mouth turned to run OUT through his teeth along +Z, and end-on a
key is fully foreshortened: no bow, no bit, nothing on it that says key, and
what you actually saw was a black rod hanging out of a dead man's mouth. Its
length is its own local X and its flat is its local Z (measured off the
scan: 15 cm by 5 by 1.5), so the IDENTITY rotation lays it across the mouth
with the flat toward you and the whole silhouette showing — clenched in the
teeth, the way anyone carries something in them. A few degrees off level,
because nothing in a dead man's mouth is straight. And it was black for the
usual reason: roughness 1 and a dark map on a surface facing away from the
only light on the beach. METALNESS IS A TRAP — tarnished brass reads as a
bright rough dielectric with a warm lift.

**`use` ON A HOLDABLE ITEM IS THE HOTBAR'S VERB, SO NOTHING THE PACK NEEDS
MAY LIVE THERE.** Pulling the key lived in `headItem.use`, and the head is
`holdable` — so the pack's second button says "Hold" and calls exactly that,
its Inspect button opened a generic examine screen with no way to take
anything, and the only place in the game the key could be pulled from was
the hand. `inspectOpts` is the door the ring already uses: whatever opens
the examine screen, from the pack or from the hand, carries the option with
it. If an item has a verb, ask which button the player will actually press.

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

**HER GEAR WAS THE WALL, AND THE WAIST IS ONLY 1.70 m WIDE.** The route
through her is breach → hold → stair → deck → wheelhouse → back down → shell
door, and the only way from the stair head to the wheelhouse door is down one
side of the house. The wheelhouse is 2.35 m off the centreline and the rail
is at 4.31, so a waist is 1.70 m of walkable deck — and a stowed basket stack
is 0.8 m, which with a body's radius round it is 1.32 of that. So gear in a
waist is not clutter, it is a 0.38 m slot at the rail: measured, walking +x
from every station across her, NOTHING got past the wheelhouse's forward
corner, and the wheelhouse — the wheel, the star, the head, the key, the way
off her — could not be reached at all. Three separate things were doing it
and each looked like scenery:

- a basket stack and a barrel in the starboard waist, which is the route;
- **her own hatch boards**, four 6 cm planks laid flat beside the coaming and
  given a full-height collider. 26 cm of stacked timber is a thing you step
  over, and as a wall it closed the port waist a hand's breadth from the
  coaming. The beach's rocks have carried this rule since they went in:
  anything whose crown lands under a step gets no collider at all;
- **the davit**, whose king post stood `HATCH_HZ + 0.75` off the centreline —
  0.75 m from the coaming, less than a body with the coaming's own margin
  either side. Out at the rail (`+ 1.75`) it leaves 0.92 m inboard and 1.03
  outboard, and a davit swings a load over the SIDE anyway; the boom is
  parametric, so it simply gets longer.

Gear goes forward of the stair and aft of the house now, which is where a
working boat would stow it. Measured after: the whole deck walks — stair head
to the door in one leg, and round her bow, both waists and the afterdeck
without a single leg stalling.

**A DOOR YOU OPENED STAYS OPEN.** The shell door EATS the key — it goes into
the lock and stays there — and `holdDoorOpen` was not in the save, so a
checkpoint made on the far side of her came back with the wreck locked again
and `boatKey` still true, which handed you back a key you had already spent.
It is a flag now, and it is restored BEFORE the key's own gate so the two
cannot both fire. Same rule as the smiling one and the pack's cutscene: a
thing you have already done does not un-happen when you load.

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

**AND SHE WAS DRAWN AND NOBODY COULD SEE IT.** Everything below was on her
already — eighteen strakes, frames, fastenings, rust running out of every
one of them — and from the sand she was a smooth brown wall. Four faults,
and only the last is about the drawing:

- **`map` AND `emissiveMap` WERE SEPARATE CALLS.** `hullTex()` draws with
  `Math.random`, so `map: hullTex(...), emissiveMap: hullTex(...)` is TWO
  DIFFERENT HULLS — the lift never landed on the marks it was lifting, and
  half of what was drawn was cancelled by a highlight somewhere else. They
  are cached and shared now (`hullSet`), which is also two fewer 512s.
- **ANISOTROPY 1 ON A 28-METRE HULL.** `retroTex`'s nearest-and-no-aniso is
  right for a 256 canvas on a flat prop and catastrophic on something you
  walk the length of: at a glancing angle three picks the mip level off the
  worst derivative and averages the whole map away. Sixteen, and linear
  mips, on anything long.
- **AND NO NORMAL MAP AT ALL.** She is lit by one low moon, so a seam that
  is only DARK is a picture of a seam and a picture does not move when the
  light does. Every hull surface now draws its colour and its HEIGHT in the
  same pass — so the seam that is dark and the seam that is deep are the
  same seam — and `heightToNormal` differentiates it. This is the wreck's
  version of the lesson the Dealer's head taught: relief is what separates
  a surface from a picture of a surface.
- **THIRTY STRAKES OVER FIVE METRES IS UNDER A PIXEL.** 17 cm a plank down a
  28 m hull is gone at any distance; eighteen strakes at 28 cm is a real
  plank on a boat this size and survives being looked at from the sand. The
  pavilion's rule about patterns, on a bigger object.

**AND SHE WAS THE DARKEST PLACE IN THE GAME.** Measured as mean screen
luminance: the open beach reads 19, her hold read 12.5 and HER DECK READ
10.7. You climb aboard a wreck and find the darkest ground on the walk, and
the hold — which is where the captain's head, the catch and the way through
all are — was a black box you felt your way across. **One global multiplier
cannot fix it**: at the factor that brings the hold up the deck is still
dark, and at the factor that brings the deck up the hold goes flat. The
lifts are per material — the interior most, her deck next, her side least,
because her side was the one surface already catching the moon. Hold 12.5 →
17.4, deck 10.7 → 14.

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

**AND THEN IT COMES DOWN, IN FRONT OF YOU.** The take used to end with a
black card and the player back on the sand — you killed the thing in the ship
and the ship simply stopped being part of the story. The hall lets go, you are
set down on the beach UNDERNEATH the saucer still hovering where it took you,
and it comes apart over your head and goes into the sand twenty metres away.
Four beats on one clock (`CRASH`), each cue fired once, the camera TURNED and
never moved so every clamp still agrees and the hand-back is exact. What it
cost:

- **YOU MUST NOT BE STANDING WHERE IT IS GOING TO LAND.** `placeBackOnBeach`
  put you ten metres short of the saucer, which is inside the crash site's own
  collider — so the hull came down on top of you and the push-out then
  squeezed you across the beach and left you jammed against `CLIFF_BLOCK_X`
  for good. Twenty-seven metres back is where the whole of a twenty-six metre
  disc is in frame with seven metres of sand still in front of it.
- **`spawnPuffs` PICKS THE BIG CLODS OFF `i % 3`,** so a call with n = 1 is
  always i = 0 and always the FINE grain. The impact threw ninety separate
  single puffs and not one clod, and from twenty metres the sand curtain was
  invisible. Thirty calls of three.
- **A BALL AND A RING OVER A BLACK SKY READ AS TWO GREY SMOKE RINGS,** at any
  opacity, because additive pale-blue over nothing IS grey. What says
  "explosion" is the FRAME going white for a moment — the eye reads the whole
  picture, not the object — so the boom drives `flashEl`, the abduction's own
  card, and the fireball is small, briefly white and cooling to orange rather
  than big and pale.
- **The kit is built AT THE CUT, behind the black.** A fireball, a shockwave
  and forty shards of hull is a few milliseconds of geometry and the one
  moment in this take when a few milliseconds cost nothing is the one where
  the screen is already covered. The drain, the bunker and the pavilion are
  all warmed on exactly that argument.
- **The wreck STAYS.** A ship that blows up in front of you and is not on the
  sand afterwards is a video, not a thing that happened: the hull is parked
  driven in edge first, bedded into a `makeApron` drift in the beach's OWN
  `sandMat`, its lights out and one warm ember lamp in it, its meshes given
  their frustum culling back (they carried `frustumCulled = false` for the
  take), and one 10.4 m collider under it. A 26 m disc across a 16.6 m beach
  is a WALL — which is fine, because the abduction site is the dead end behind
  spawn and there is nothing past it. Getting inside it is a separate job and
  is deliberately not here.
- **And a downed ship stays down.** `crashDone` is on the save and is also
  inferred from `shrineWon`, the shell door's own rule — and because the model
  lands over the network long after the save is read, it is the LOADER that
  puts the hull on the sand when the flag is already set. Park it in the sky
  only if it is still up there.

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

**AND A DEAD TAIL FALLS BY BEING SWUNG, NOT BY BEING UNWOUND.** The die clip
took the resting arc out with a NEGATIVE curl and tip, and measured in the
game the tip finished a metre HIGHER than it stands in the idle (604.71 alive,
605.82 dead) — so the corpse held the creature's whole signature silhouette up
in the air for the rest of the game. It is the slam's own lesson a third time:
a distributed rotation CURLS a tail in place and only a base-driven `swing`
moves its tip. A positive swing takes the whole thing over, a yaw throws it off
the spine so it does not come to rest lying along the body. Measured after:
tip 4.71 → 1.98, head resting at 600.08 on a floor at 600. **And the collapse
was already as deep as the floor allows** — a pass that slumped it further
(lift -1.16, head 1.02) put the head half a metre THROUGH the stone.

**THE CREATURE IS A QUADRUPED WITH A SCORPION TAIL**, and what it is was
measured off the vertex weights rather than read off the hierarchy: the teeth
settle it, because `teeth top` is bone-parented to Bone.003 and `teeth bottom`
to Bone.027, so those two are the head and the jaw and everything else follows.
Head low and forward at 2.7 m, four legs on the floor, two palps that hang, and
a 22-bone tail arcing over the spine to 6.4 m. That tail is the only silhouette
in this game nothing else has, so it is the signature attack and gets the
longest tell in the fight.

**AND A DISTRIBUTED ROTATION CURLS A TAIL; IT DOES NOT SWING IT.** Three builds
of the slam went wrong on this one idea. Per-segment angles came first — 22
bones at 0.6 rad each is nearly two full turns, so the tail wound into a
spiral and then UNWOUND, which on screen is the tail extending backwards away
from the thing it is meant to hit. Normalising the parameters to total radians
fixed the spiral and not the slam: measured, the tip fell one metre and never
came near the front, because rotation spread along a chain bends it in place.
A whip is swung from the BASE. `tail()` now takes `swing` (weighted to the
first third), `curl` (even) and `tip` (weighted to the end) as three different
motions, and the tip travels seven metres instead of one.

**A SWING'S CONTACT IS NOT THE END OF ITS WIND-UP.** The first attacks put
`hit` where the cock finished, so the game's startup ended with the limb drawn
all the way BACK and the damage landed on the frame the creature was least
extended. Every attack is three keyposes and three lerps now — the shovel
swing's own shape — with `hit` the fraction at which the contact pose is
reached. The build then CHECKS it (the striking part should be near its own
extreme within a couple of frames) and prints `<-- CHECK` when a pose has been
edited and the declared contact no longer matches. That check earned its place
three times over: it caught the swipe raking backwards, it caught the bite
measured on the jaw (which goes forward when the mouth OPENS, so track the
head), and it caught `surge` being written as +Y when the creature faces -Y —
the bite drew its head back on the strike and lunged on the wind-up, and the
report was simply "furthest forward at frame 1".

**`skinnedBounds` READS `matrixWorld`, AND A GROUP ADDED THIS FRAME HAS NONE.**
The seating in `dressMutant` subtracts `u.g.position.y` because the bounds are
world space — which is right, and which is exactly wrong when the group's
matrix is still the identity, because then the bounds come back in the model's
OWN space and the correction is applied to a number that never had the group's
height in it. On the beach every creature stands at y = 0 and the two are the
same arithmetic, so it cannot show; the thing in the saucer stands six hundred
metres up and came out 547 m above its own floor. `u.g.updateMatrixWorld(true)`
before the measurement, and any creature whose group is not at y = 0 needs it.

**AND THE BEACH'S WALLS ARE NOT EVERY CREATURE'S WALLS — THE THIRD TIME.**
Five places in the chase clamped a creature to `WADE_X`..`CLIFF_BLOCK_X`, the
surf line and the foot of the cliff. The hall is three thousand metres away, so
on its first step toward the player the boss was teleported out of the room and
onto the sand (measured: x 3000 to 14.7 in one frame). This is the bunker's own
lesson wearing a third coat, after the crabs biting through forty metres of
earth and the blood drops deleted at `y <= 0.02`: A CONSTANT THAT DESCRIBES ONE
PLACE IS WRONG THE DAY THE GAME ACQUIRES ANOTHER. `mutClampX` asks the kind
which world it is in; the Dealer is deliberately untouched, because his room
sits inside the beach's x range and `clampDealer` already owns him.

**A RING IS THE ONE ARENA WHERE STEERING IS FREE.** There is an altar in the
middle of the hall, so across the room the straight line to the player goes
through it: pinned on the inner circle the boss ground against the altar and
closed seven metres in thirty seconds. The clamp slides it round the way that
shortens the bearing instead, and the obstacle becomes the thing you circle —
which is what an altar in a boss room is for. Measured after: it closes to
1.96 m and throws eight swings in thirty seconds across all three attacks.

**A FRESNEL RIM ON A THIN CREATURE IS NOT AN EDGE, IT IS A SHEEN.** The cold
rim is what separates two metres of dark flesh from a dark beach and it must
stay on the pack — but Fresnel is a grazing-angle term, and on a body made of
spindly limbs and a whip tail EVERY surface grazes, so it lit the whole animal
and it rendered as a white cut-out standing in a black room. The tall one found
this first and went out with no rim at all. A kind may now say `rim: null`.

**AND THE MAP WAS FOUR TIMES TOO BRIGHT, WHICH IS A NUMBER YOU CAN LOOK UP.**
Before touching a shader, the albedo's mean was measured against the three
mutants' shipped maps: 157 against 35-37. `dressMutant`'s emissive is tuned for
maps `tools/mutant_tex.py` has already brought down, so the fix belongs at
source and not in a lift — a lift raises the dark parts furthest and flattens
the folds. `tools/monster_anim.py` is two-stage now (PIL under the system
python, then Blender on itself, the way `bunker_pack.py` runs) and grades the
map to a mean of 38. It also took the asset from 5.4 MB to 2.2.

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

**`farProps` IS FOR LANDMARKS, AND A CUTSCENE PROP IS NOT ONE.** Moving the
saucer's load to boot put it in `farProps`, which sets `visible` from your
distance down the walk every frame — right for the wreck and the dock, which
are always there, and exactly wrong for a thing that must be seen ONCE and
never otherwise. At the spawn the ship is 72 m away, comfortably inside the
320 m cull, so the list switched it on at the start of the game: a twenty-six
metre saucer standing on the sand in front of the player before they had taken
a step, AND at the world ORIGIN, because a group nobody has positioned yet
sits at (0, 0, 0). Two rules out of one bug — visibility for a cutscene prop
belongs to the cutscene, and anything loaded early must be PARKED where it
belongs at load rather than left at the origin waiting for its first update.

**AND ONE LOOK IS NOT ENOUGH TO WARM A ROUND ROOM.** A drum has a far wall, a
near wall, a floor and a dome, and what has not been SUBMITTED has not been
compiled however hard frustum culling is switched off — a single 60-degree
view from the middle left fifty programs for the reveal. Six views cover it.
What is left on entering the hall is the BEACH's own far-culled lamps going
out as you teleport three thousand metres away, which is inherent to being
somewhere else and lands behind the beam and the flash.

**AN ABDUCTION IS FOUR EVENTS, NOT A SLIDE.** The first take was a ship
descending on a smooth curve, a cone, and one steady hum switched on at the
trigger — nothing else in the frame moved, so it read as a picture with a
drone behind it. What it is now: the ship DECELERATES (a cubed ease, so two
hundred and sixty metres come down fast and the last thirty barely arrive) and
then never quite holds still, on a decaying wobble, because a thing that stops
dead has no mass; the beam PULSES and has grit turning over inside it, seeded
across the whole cone rather than emitted from the bottom, which is what makes
a shape into a force; the beach answers with sand off the ground and a lens
that shakes harder the closer it gets; and the sound is four one-shots on four
beats — something enormous coming down, the moment it stops, the beam taking
hold, and the moment it has you — every one of them low, because at the ear
any broadband hiss is a radio.

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

**THE SEA DOES NOT REACH THE SHIP.** The drain and the bunker are holes in this
beach and still belong to it, so they duck the surf and leave a little; the
hall is not on this planet and `shrineMix` takes the wave bus and the wind to
NOTHING. But silence is an absence, not an ambience, so the hall has a bed and
three things that happen on it — a hull groan on inharmonic partials (a bolted
shell is not a string), a distant knock with the room answering it, and the
orb's own two-sine beat, which swells as you close on it so the light is
audible before it is reachable. NOTHING ABOVE 240 Hz LIVES IN ANY OF IT: the
bunker paid for that when a CRT whine turned out to be tinnitus.

**AND A TAKE THAT HAS HANDED YOU OVER HAS FINISHED.** The lift runs from the
beam to the flash and the CUT happens partway through that window, so without a
`!inShrine` guard the take went on hauling the player toward the saucer's beach
coordinates after they had been set down in the hall — three thousand metres
away, so it dragged them clean across the floor while the white was still up.

**DARKENING A MAP IS A LEVEL CHANGE AND MUST NOT BE A RANGE CHANGE.** The
monster shipped with its albedo multiplied down to the mutants' mean of 37 and
came back looking UNTEXTURED — the map demonstrably applied, the UVs a clean
0..1, and nothing on it to see. Matching the mean was the wrong target: a flat
multiply scales the CONTRAST by the same factor, and contrast is what the eye
reads as texture. Measured, the shipped map had a p5..p95 spread of 22 against
mutant-dark's 39 and mutant-red's 44. It is remapped to a target mean AND a
target spread now — a shift and a scale about the mean, not a multiply — and it
sits a little above the mutants besides, because they are lit by a quarter moon
and this one stands in a room with three lamps in it.

**A CREATURE MADE OF STICKS NEEDS ITS TOES.** Thirty-two of the monster's
seventy-six bones are digits and the first three builds never touched one, so
the leg swung, the ground arrived, and the foot met it as one rigid paddle —
which is most of what "stiff and amateur" was. They grip on the plant and open
through the swing, the ankle ROLLS over the foot instead of arriving flat, each
of the three is offset from its neighbour, and every left/right pair carries a
small fixed bias, because nothing alive is symmetric. The other half is timing:
the idle runs a breath, a weight shift and a head scan on three periods that
never line up, the tail arrives LATE to all of it, and a strike carries PAST
its contact pose and settles back through it rather than being retracted.

**THE FIGHT IN THE SHIP IS THREE FIGHTS.** One boss in an empty room is one
fight learned once. Touching the light now runs three waves, and the reason
they are three DIFFERENT things rather than more of one is that each takes a
different answer out of the same four inputs: three REPTILIANS who are a
crowd, flank, and DODGE a charge, so the heavy has to be bought; three DRONES
who are in the air and cannot be reached at all until they come down, so the
fight is a shot you sidestep and a swing you save; and the BEAST, ten points,
two enormous slow attacks, no way through but the parry. The first and third
are `MUT_KINDS` entries and are therefore almost nothing — the tell, the
commit, the poise, the parry, the riposte, the chain, the feint and the token
all come with the table. The drones are the only new behaviour, because
nothing else in this game flies.

**THREE ASSETS, THREE DIFFERENT STARTING POINTS.** `tools/reptilian_pack.py`
(a mesh with NO skeleton at all), `tools/alienbeast_pack.py` (a rig AND ten
authored clips) and `gltfpack.py` (a rigid saucer). The monster came with a
rig and no clips; between them these four cover every case this game will
meet again.

**A RIG YOU BUILD MUST BE MEASURED, NOT PLACED.** The reptilian download is
150,718 polys, one 2048 BMP, no armature, no vertex groups and no actions — so
the skeleton is built here, and a skeleton placed by eye is one whose knees
are not at the knees, which every clip authored on it then has to fight. What
is measured, and how: the CROTCH is the first height, scanning down from the
waist, at which the x values split into two clusters with air between them;
the SHOULDER is where the body's half-width jumps away from the neck's; the
ARMS are, at each height between them, the vertices outboard of the largest
gap on that side, so their centroid IS the arm's line and the shoulder, elbow
and wrist come off it; the LEGS are the same trick below the crotch; and the
ANKLE is the height at which the leg's forward extent runs away from the
shin's, because that is a foot sticking out of a leg. Its bones are named
`Character1_*` on purpose — that is the mutant rig's own naming, which the
Verlet ragdoll, `mutSever`, `burstHead` and `bakeLimb` all read directly — so
unlike the beast and the warden it comes apart like everything else here.

**AND HEAT WEIGHTS BIND WHATEVER IS NEAR, WHICH IN AN A-POSE IS THE THIGH.**
Measured on the first build: vertices at (0.15, -0.02, 0.59) — a KNEE — came
back weighted 1.0 to `Character1_LeftHand`, so bending an elbow dragged the
thigh across the body and both arms rendered as long flat sheets hanging past
the knees. Three masks were tried and the first two look right and are not.
By straight-line distance against the bones the vertex ALREADY HAD: a vertex
owned outright by the wrong bone has nothing to be compared with, since its
one weight is by definition its own nearest, so it cut nothing. By
straight-line distance against EVERY bone: better, and still hopeless, because
where the hand touches the thigh the two bones really are equally close and no
threshold separates them. By GEODESIC distance over the mesh, which is the
right measure — a knee is four centimetres from the hand through the air and
most of a metre from it around the body — but it failed on its SEEDS, because
each bone was seeded from the vertices it was nearest to, and for the hand
that included the knee.

What settles it was already measured further up the same file: the arm scan
knows WHICH VERTICES ARE THE ARM, because that is how it found the arm. A
hand may drive hand vertices and nothing else; the two bones nearest the body
also get a collar of trunk around their own joint, which is the shoulder and
the hip actually deforming. Heat weights still ship wherever they were sane —
they blend across a joint properly, which no distance falloff does — and a
smoothing pass goes AFTER the mask and would have been actively harmful
before it, since averaging with neighbours is how the hand got onto the leg.

**A CLIP THAT WAS AUTHORED TO BE WATCHED IS NOT AN ATTACK.** The beast's
`Attack_Bite` reaches full extension at frame 24 and then HOLDS it for another
forty, which in a fight is a creature standing with its jaws in you; both its
attacks end with twenty frames of it already back at rest. Every clip is
RESAMPLED out of its source over windows worth keeping — the bite is the lunge
spliced straight to the retraction with the hold cut out — which is also what
makes them safe, because sampling `matrix_basis` per frame and keying it into
a fresh action sidesteps Blender 5's layered-action API entirely and
guarantees EVERY CLIP CARRIES EVERY CHANNEL, the thing this file has already
paid for twice.

**AND THE CONTACT METRIC HAS TO SUIT THE SWING.** Three different answers,
all in the same two files: a LUNGE is measured where the head is furthest
forward; a SLAM where it is lowest AFTER it was highest (peak speed reported
frame 3 of the beast's slam, because the fastest the head ever moves in that
clip is the rear-up); and a RAKE where it is fastest, because a horizontal
sweep has no extreme of position at all. "Furthest forward" was tried on the
reptilian's rake and reported frame 3 of a swing that lands at 14 — the
crouched stance already carries both claws out in front, so the frame at which
the striking hand is furthest along -Y is the REST pose.

**A DECIMATE RATIO IS OF TRIANGLES, NOT OF FACES.** The beast's body ships as
QUADS, so a ratio worked out against the face count comes out at twice the
budget the moment `use_collapse_triangulate` splits them: 15,000 asked for and
30,000 shipped, on the biggest asset here.

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

**A DODGE LEAVES THE LINE; A STEP BACK IS STILL ON IT.** `reads` is the
Dealer's wind-up answer offered to any kind that declares it, and the
reptilians take it — three of them that all answer a charge is what stops the
hall being opened with a free heavy every time. What makes theirs a dodge
rather than a step is `dodgeClip`: the Dealer goes straight backwards, which
is right for a man with a bar who wants to stay square to you, and a creature
with a hop in its clip goes SIDEWAYS instead, out of the arc rather than away
from it — the one direction a committed swing cannot follow. Measured: 1.82 m
travelled, 1.71 of it across the line and 0.62 along it.

**`kind.rim` IS A COLOUR, NOT A STRENGTH.** The pack's default is
[0.070, 0.088, 0.125] and `reexpose` writes it straight into the shader as a
vec3, so a scalar there is a TypeError inside `onBeforeCompile` — which is to
say on the first frame the thing is ever drawn. And WHICH creatures get one is
a question about SHAPE, not about darkness: the warden goes out with
`rim: null` because Fresnel is a grazing-angle term and on a body of spindly
limbs and a whip tail every surface grazes, so it lit the whole animal; the
beast is the opposite shape, one heavy solid mass, and without a rim it
rendered at twelve metres as a black hole in a black hall with nothing on it
to read.

**A WAVE MAY NOT START BEFORE THERE IS A WAVE.** Everything is built at boot
inside the hall's own loader callback, so in a real game the light cannot be
touched before the units exist — but a wave started any other way (the
harness, a restore, a future skip) found `shrineGuards` empty, revealed
nothing, and left `waveClear` false for ever: a phase that can never end.
`startShrineWave` builds on demand, which costs nothing when they are already
there. All three waves are also WARMED, not just the boss — whatever has not
been submitted has not been compiled, and a wave revealed mid-fight is the
worst possible moment to find that out.

**AND `skipIntro` IS CONSUMED AT MODULE LOAD.** Setting
`sessionStorage['beachwalk.skipIntro']` and calling `beginGame()` in the SAME
tool call does nothing: the flag is read and removed while the module
evaluates, so a flag set afterwards is read by nobody, `beginGame` runs the
real card, and `introDone` never becomes true because the card is on the wall
clock and the pane's rAF is dead. Every measurement then reads zero — three
separate runs of this fight measured "the creatures never close" when what was
actually true was `frozen()`. Set the flag, RELOAD, and call `beginGame()` in
the next call.

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

**READ EVERY MAP IN THE FOLDER BEFORE DECIDING WHICH ONES THE MODEL NEEDS.**
The alien animal shipped SEVEN and the first build used two. Measured, the
three that were left on the floor were not all worth having and the way to
tell was to look at their statistics:

- **the GLOSS map** (mean 119, stddev 28) is real surface variation, and
  without it the creature went out at one flat roughness over its whole body
  with nothing on it reading as wet. Gloss is the inverse of roughness, which
  is the whole conversion. It is the map that made its mouth and teeth read.
- **the EYE map**, while the 772-vertex eye mesh — which has its own UVs —
  was wearing the BODY's skin. Giving every mesh one material is the kind of
  mistake that survives a look at the silhouette and not a look at the face.
- **the METALLIC map** is deliberately not used. It ships at mean 98 stddev
  59, which is not the near-black a real metalness map for an organic
  creature would be; and METALNESS IS A TRAP here, for the third time — a
  metal has no diffuse term and this game has no environment map, so any of
  it renders as a dark shape with a couple of pinpoints on it.
- the 8K normal is the sculpt's source, baked down into the 4K one the body
  actually uses; and `Base-Diffuse` is a darker, lower-contrast twin of
  `Base-Color`, which is the albedo.

**AND BLENDER SHIPS A GENERATED METALLIC-ROUGHNESS PACK AS PNG.** Under
`export_image_format='AUTO'` the 1024 roughness map went into the GLB at
1000 KB against the albedo's 198 KB at the same size — a megabyte, on the one
asset whose download the cut waits for. Roughness is low-frequency: 512 and
`'JPEG'` makes it 46 KB.


**"NOBODY HAS TEXTURES OR GOOD ANIMATIONS" WAS TWO REAL BUGS, AND NEITHER WAS
WHERE THE STATISTICS SAID TO LOOK.** Both creatures measured fine on paper —
the reptilian's shipped albedo reads mean 47 with a p5..p95 spread of 41
against the warden's 48 and 38, its UVs span a clean 0..1, and its map was
demonstrably bound. It still rendered as flat plastic at arm's length. What
settled it was standing a BEACH MUTANT next to it in the hall, in the same
light, at the same distance, and asking both what maps they carried:

- **the mutants have a NORMAL MAP and a ROUGHNESS MAP and the reptilian had
  neither**, because the download is one BMP and nothing else. That is the
  wreck's lesson on a creature: a seam that is only DARK is a picture of a
  seam, and a picture does not move when the light does. There is no height
  map to differentiate, so one is DERIVED from the albedo's own luminance —
  on a scanned hide the dark parts ARE the creases, so luminance is a fair
  height field, and the scales and belly plates come straight out of it. It
  must be derived from the RAW map and not the graded one: the grade is a
  level change that costs contrast on the way through (53.9 of standard
  deviation down to 16), and contrast is precisely what a height field is
  made of — differentiated after grading, the mean surface tilt came out at
  2.7 degrees, which is nothing. From the raw map it is 8.6.
- **and the grade was copied off the last creature instead of measured.**
  The monster's map arrives at a mean of 157 and has to be hauled down; this
  one arrives at 40, which is already inside the range the three beach
  mutants ship at. Running the same "bring it to the mutants' level" remap
  on it was a RANGE change made for no LEVEL gain. Measured against the maps
  that already work rather than against the last thing built: spread 41
  becomes 57, against the pale mutant's 61.

**AND `matrix_basis` DOES NOT SEE CONSTRAINTS, WHICH ON A GOOD RIG IS MOST OF
THE ANIMATION.** The beast's ten shipped clips were resampled frame by frame
off `pose.bones[i].matrix_basis` — which is a bone's local transform BEFORE
any constraint is evaluated. Counted on the source, that rig carries 82
pose-bone constraints: 36 IK, 27 FLOOR, 9 TRANSFORM, 5 TRACK_TO, 3
COPY_ROTATION and 2 ACTION. So the resample kept what the animator keyed onto
the control bones and threw away everything the IK chains and the foot
planting were doing, and a professionally animated creature came out moving
its hips and dragging four dead legs. Record `pb.matrix` off the EVALUATED
depsgraph instead — the pose in armature space with every constraint applied
— and convert it back to a basis a constraint-free rig reproduces:

    basis[b] = (L[parent]^-1 @ L[b])^-1 @ (M[parent]^-1 @ M[b])

with L the rest matrix and M the evaluated pose, both armature space; a root
bone is L[b]^-1 @ M[b]. It uses only recorded matrices, so it needs no
per-bone depsgraph update. Every clip must be SAMPLED before any constraint is
removed and every constraint REMOVED before any clip is written, or the result
is applied twice. (The exporter's own `export_force_sampling` would have got
this right on the source actions — the mistake was resampling into new actions
first, which destroyed the constrained result before the exporter ever saw
it. If a clip has to be trimmed or spliced, bake the constraints yourself.)

**AND A CREATURE MADE OF STICKS NEEDS ITS TOES — the second time.** The
reptilian's rig has a `ToeBase` on each foot and the authored clips never
drove one, so the leg swung, the ground arrived, and the foot met it as a
rigid paddle. The toe extends as the heel comes up behind and grips as the
foot is planted in front, harder at a run than a walk, with a small fixed
left/right bias because nothing alive is symmetric.


**AND THEN THE SWINGS WERE NOT PLAYING AT ALL.** "The hit animations look
stiff" was not a quality problem, it was an absence: `mutAnim` starts an
attack with `mutPlay(u, u.st.swing)` — the ATTACK KEY out of `MUT_ATTACKS`,
not a clip name — so a kind whose swings are called `rLight` and `rHeavy`
while its clips are called `light` and `heavy` resolves nothing, `mutPlay`
returns undefined, and the creature GOES ON PLAYING WHATEVER IT WAS. Measured
in the game: `swing: rLight`, `atk: 0.32`, `clip: run`. All three reptilians
sprinted at the player through every wind-up and every strike, with no
telegraph and nothing to read, and the damage still landed on the frame the
table said. `kind.alias` is where the mapping goes and all three creatures
were missing it — **the warden has had this bug since the day it went in**,
which is most of why its attacks never read either.

**AND `mutPlay` SAYS SO, IN A WARNING.** It has warned once per missing clip
name since it was written. Three rounds of checking `read_console_messages`
with `onlyErrors: true` never showed it, and a filter that hides warnings is a
filter that hides exactly this class of bug — a name that does not resolve is
almost never an exception, it is a silent no-op. Read the warnings.

**A STILL FROM A HAND-PLACED CAMERA IS NOT A TEST.** Every check of these
creatures until this point was `renderer.render` with the camera put where I
wanted it, and all of them passed while the creature was running through its
own sword-arm. What found it was PLAYING the thing: let the fight run, catch a
unit with `st.atk` in its strike window, and ask what clip is on the mixer.

**AND A JOINT THAT MOVES ON THE SAME CLOCK AS EVERY OTHER JOINT IS A DOLL.**
With the clips finally playing, the reptilian's own swings were stiff for the
reason the Dealer's packer already names: one number drove the hips, the
chest, the shoulder, the elbow and the head, so they started together, crossed
together and stopped together. The body is brought FORWARD instead of the arm
being dragged back (`lead`, not `drag`) — because the contact fraction of
these attacks is measured on the striking hand and the build checks it, so
lagging the hand would move the blow off the frame the game deals damage on.
Hips first, chest next, hand last, and the claw carries past its stop and
settles back through it. The swings also gained the thing that makes a blow
read as having weight at all: FOOTWORK. The light loads onto the back foot,
turns the hips through and drives onto the front one; the heavy rises onto its
toes at the top and lands with the knees taking it.


**AND THE ARTIST'S OWN BAKE CONFIRMED BOTH GUESSES.** The 2.93 "Baked
Animations" build of this asset and its `BakedTexture-Packed.fbx` arrived
after the fact, and the useful thing about them is that they are an
INDEPENDENT ANSWER to the two things this packer had to reconstruct:

- **the constraint bake.** That file ships the same rig with 171 bones and
  ZERO pose constraints — the artist has collapsed them. Traced against the
  2.81a rig with its 82 constraints evaluated, over a run cycle: the head and
  the hip match to 0.000, and the worst bone anywhere differs by 0.033 units
  against bones that TRAVEL 4.3 to 5.0 units in the same cycle. Under one per
  cent, and the residue is a later model revision rather than an error.
  Recording `pb.matrix` off the depsgraph is right.
- **the roughness.** The 2.81a download ships GLOSS and the 2.93 one ships
  `Alien-Animal-Base-Ro.jpg`; inverting the first reproduces the second at
  mean 135.9 against 135.9, standard deviation 29.5 against 29.5, correlation
  0.9999 and a worst pixel of 2 out of 255. Gloss inverted IS the roughness.

The 2.81a zip stays the source, because the baked file carries only six of the
ten clips — no walk and no normal idle.

**AND THE METALLIC MAP IS NOT A METALNESS MAP, WHICH IS MEASURABLE.** The FBX
wires it straight into Principled's Metallic, so the artist did intend it —
but a real metalness mask is BIMODAL, near 0 for dielectric and near 1 for
metal, and this one has a 40 % plateau sitting at 0.4 with only 1.5 % above
0.9. Nothing is forty per cent metal; that is a specular or reflectivity map
from an older workflow. In a game with no environment map, honouring it would
take 40 % of the diffuse off most of the creature and give nothing back. "It
is what the source material says" is not the same as "it is what this renderer
can use" — and the way to tell them apart is a histogram.

**A BUILD THAT READS A TEMP DIRECTORY IS NOT A BUILD.** This packer read an
extraction that happened to be sitting in a session scratchpad, so the day
that was cleared the asset could not be rebuilt at all. It reads the delivered
ZIP now, out of the folder the models arrive in, and unpacks it beside itself
once.


**EVERY BLOW IN THE SHIP HAS TO PASS THROUGH YOU NOW.** The reptilians and
the beast landed hits the pack's way — a distance from their feet to yours on
the first active frame, no direction in it — so a claw raked a metre wide
still took a point and a four-metre animal "bit" you with the middle of its
back. They are `aimed` like the Dealer and the SCP, and the machinery had to
grow one thing to take them: `mutLimbs(u)` is EVERY CHAIN A CREATURE STRIKES
WITH, not two arms — the kind's `rig` may list extra `[arm, fore, hand, tip]`
quads (the beast's forepaws; a warden's forelegs and tail) and `blowLands`
sweeps all of them. A swing may say which chains it aims with (`A.limbs`,
indices into that list): the bite aims the HEAD and only the head, a tail
slam aims the tail whatever the head is doing. The beast's head chain is
`Bone006 → Bone008 → Bone011 → Bone024` (the snout, 4 m out along its own
axis — measured in the pane, because the loader strips the dots out of
`Bone.006` and a name copied off the GLB matches nothing), and `aimK` is 0.6
because a neck that long needs a third of a shoulder's correction to move its
end the same distance. **And "a hand's width wide" has to mean a hand's
width**: the Dealer's fallback — facing you, in reach, hand out in front, the
blow lands — was the whole of a bite on the beast, whose "hand" is its head
and is always out in front, so every bite inside reach landed (one measured
with the snout 1.86 m from the chest). `LAND_SLOP`: the striking end nearest
you must finish within a metre of your torso for the benefit of the doubt.
Measured after, standing still: the beast throws 19 swings in 35 s of
contact and lands 9, at 2.6–4.1 m; the reptilians land at 1.2–1.5 m on the
rake and nothing from range.

**THE BEAST IS FASTER EVERYWHERE BUT THE TELL.** It was slower than your walk
(`speedK` 0.78), circled a third of the time, and its bite's recovery was as
long as its wind-up. The startups are kept — that is where the fairness lives
— and everything round them is tightened: speed, `aggr`, `press`, the chain
into the slam, two chains not one, less circling; the slam `hold`s so it
rears on the spot rather than walking its own wind-up in, and takes most of a
guard (`guardK`); and it has the Dealer's `reacts`, so a charge in its face is
backed out of and the free heavy has to be bought.

**THE RAGDOLL HAD THE BEACH'S CLIFF IN IT — THE FOURTH COPY.** "The bodies
disappear" was one line: every particle of every ragdoll was clamped to
`WADE_X - 6 .. CLIFF_BLOCK_X + 0.6` unconditionally, and the hall is at
x = 3000, so on the first step of the fall a reptilian's whole body was
snapped to x = 13.1, three thousand metres from the skeleton it drove. It is
gated on `bf === null` now — `PhysProp`'s own rule: a body that answers to
another room's floor is in another room — and a ragdoll that dies in the
drum (`rag.ring`) is held inside its wall. Measured: hips at rest 0.24 m over
the hall floor, asleep, visible.

**A BOLT IS A SWING FROM FURTHER OFF, AND THE GUARD ANSWERS IT.** Held, a
drone's bolt is STOPPED on the guard at a cost to the bar (`blockBolt`);
raised on the beat it is PARRIED (`parryBolt`) and goes back — steered onto
the drone that fired it (a saucer moves a metre in the time the bolt takes to
cross the room, and a riposte that misses is not one), for two of its three
points, and the drone is knocked out of the air into a swoop, which is the
stun a parry buys off everything else here in the one form a flying thing
can be stunned. The guard only covers what it faces: the bolt's line has to
be coming at the camera's forward. Same fifth-of-a-second window, from the
press. A returned bolt is stopped by nothing — not a wreck, not the player —
and the bolt carries `src`, the drone that fired it. Measured: parried at
1.6 m, drone 3 → 1 and swooping; held early, absorbed at 0.29 of the bar.

**ONE THROW, ONE KILL.** `DRONE_THROW_DMG` was two of a three-point hull, so
a wreck hurled into a live drone bounced off a thing that kept flying. It is
`DRONE_HP` now: the throw is the whole reason a downed drone is worth picking
up, and it pays every time. (Testing it from the harness: place the wreck
INSIDE the drum's confine, or it bounces off the wall before it arrives.)

**THE WITNESS'S ARMS HANG, AND HE GOES TO HIS KNEES WHEN YOU SEE HIM.** Two
things. The TempMotion's stance frame holds his right arm out a third of a
right angle with the elbow back and the hand turned — a man about to wave,
which is what the clip is — and the six turns that bring both arms in are on
the upper arms and forearms about the body's forward and right, measured on
the hands (right (-0.54, 0.76) → (-0.28, 0.65)). **The bone lookup must match
EXACT names**: `CC_Base_L_Upperarm` is also the start of
`CC_Base_L_UpperarmTwist01`, a helper with nothing hanging off it, and matched
by prefix the traversal ended there — six rotations applied, four hand
positions unchanged to the centimetre. And `ntarWatch`: the first time the
middle of the screen is on him inside 16 m with the player's hands free
(never through the take), he meets your eye for half a second and then his
calves fold back through a right angle (+1.52 about the body's right, measured:
feet at knee height 0.42 m behind the knees) and the model drops the length
of a calf, so the knees arrive on the sand and the feet lie flat behind; he
folds forward over it with the hands on his thighs. `ntarSt` carries it;
`__bw.ntarSpot()` fires it from the harness. The warden's rig in `MUT_KINDS`
carries the same chains but nothing spawns a warden any more.

**THE WITNESS GETS UP SLOWLY — AND HIT HIM, AND HE IS A BOSS.**
After the kneel holds (`NTAR_HOLD`) he rises over `NTAR_RISE` seconds on a
long smoothstep. (He cried while he rose for one build — drops off the eye
bones and a wet line under each eye, run along the FACE's down, not the
world's, because bowed fifty degrees a drop run along world -y finished
under his chin — and the owner asked for it off. If tears ever come back,
that is the one thing to remember about them.)

HE IS A `MUT_KINDS` ENTRY WITH NO FIGHT IN HIS FILE. `ntar` stands hidden
in the witness's shoes from the moment he is placed (`placeNtar`), because
the blade's creature test does not ask whether a creature is visible;
`kind.provoke` (`ntarProvoke`) is what `hurtMutant` calls on the first blow
to a sleeping creature that declares it — the witness is hidden, the
creature stands where he stood facing you, and it opens with the roar. The
blow that woke him is never met by his guard (`woke`). Thirty-two points, a
ten-point poise pool, `block` 0.30, `reacts`, faster than your walk, four
swings that chain three deep. His file carries ONE clip (the TempMotion
demo), so `kind.author` — `authorNtarClips` — writes idle, walk, run, a
strafe, the roar, the flinch, the guard and the four swings IN CODE, on the
stance frame: every clip is keys of (time, per-joint angle about the body's
up/right/forward), sampled at 30 fps and composed onto the stance in each
bone's parent frame, which is exactly what `updateNtar` does live. Every
bone gets a track in every clip, driven or not — a crossfade must never let
a bone fall back to the bind pose, and this rig binds in a T. The sign
conventions are the ones measured on the witness (a thigh's `right` positive
swings the foot BACK, an arm's `right` negative brings it forward, an arm's
`fwd` positive brings the right arm in). The contact pose sits at `hit` of
the clip's length, so `mutClipTime` puts the hands on the frame the damage
lands. `cutout` gives the creature the witness's own alpha treatment.
Measured, standing still at 1.3–1.9 m: 18 swings in 30 s, ten landed in the
first fifteen. **And the harness accessors only work in the ORIGINAL
`window.__bw` literal**: `Object.assign` copies a getter's value, so a setter
added in the later block sets a dead property — `abductDone` had to move.
(Test on the beach with `__bw.abductDone = true`, or his knockback shoves
you past `ABDUCT_Z` and the take fires mid-fight.)

**THE BEAST HAS FOUR SWINGS OUT OF TWO CLIPS.** `bSnap` is the bite over a
shorter clock — `mutClipTime` maps the whole clip onto the timings, so the
same clip run faster IS a different swing — and `bRush` is the run clip as a
charge: `minDist` (a swing that needs room) and a five-metre lunge through
the strike. Two traps: **a charge's `reach` is where it may be thrown from,
not how far it goes** — at 8.0 it became `maxReach`, the orbit rang you at
seven metres after every charge and one bite in nine landed; and a swing
with `minDist` is left out of `maxReach`. **The snap needs room too**: thrown
inside three metres its jaws were already level with you and the lunge
carried them past (a metre wide through the whole strike, measured). `aimK`
went to 0.9. And **count hits against the REAL maximum**: `MAX_HP` is 4 in
the harness, so a tally written as `hp < 3` never saw a one-point bite and
reported the bite as never landing for two whole samples. Measured after:
23 swings in 45 s, bites 7 of 9, slams all.

**THE RED ALIEN IS WILD NOW: HE LEAPS, AND THE CLIP CARRIES THE HEIGHT.**
`nLeap` is the SCP's pounce (`hold`, `LEAP_AIR`) with a jump in it — the
hips' own position track rises a metre and a half at the apex with the knees
tucked and both arms over the head, and comes down into a crouch with both
fists in the sand on the contact frame. The flight is the fight AI's (it
crosses four and a half metres in the last 0.55 s of the startup), the
height is the clip's, and the two agree because the clip is authored with
the take-off key at `wind - LEAP_AIR` and the landing key at `wind`, with
the clip's length equal to the swing's, so clip time IS game time through
the whole swing. Measured: hips 0.52 m in the crouch, 2.47 at the apex.
`nSpin` is a full turn of the trunk with both arms out, and it ends on
`up: 6.2832`, not on `{}` — a last key of zero would have eased him back
round the other way. Forty points, `aggr` 3.0, `press` 0.92, four-deep
chains, and the SCP's shriek for a voice (`sfxScpScream` on the provoke);
a man's voice on a thing that leaps at you read as a man. Measured: 27
swings in 35 s, 31 damage, on a player who stands still.

**THREE REPTILIANS, THREE BUILDS, AND NOT THE MUTANTS'.** `reptilianB` and
`reptilianC` are `Object.assign` copies of the base kind with their own
`h`, `hp`, speed, reach, tint and `bones`; `makeShrineFoes` deals the three
kinds out. A scaled bone scales its subtree, so an upper arm at 1.22 carries
the forearm and hand with it — which is what makes a long limb read. The
runner (long legs, small head, quick), the brute (deep chest, thick arms,
short legs, slow and hard) and the reacher (long arms, big head, short
shins) are deliberately none of the pack's three, and they stay green: the
tints are a breath either side of white. Measured in a row: arms 0.43 /
0.79 / 0.70 m, heights 1.88 / 2.32 / 2.08.

**AND THE PREVIEW PANE DIES ON ONE LONG CALL.** A single `javascript_tool`
call that awaits a page reload, then six seconds of loads, then two thousand
steps, kills the pane outright ("Preview not found"), twice in a row. Reload
in one call, `computer.wait` for the load, and keep each stepping call to a
few thousand steps with no `await` in it.

**THE BOTTLE IS A DRINK, AND IT HEALS.** A click with it in your hand
(`onDrink`, the shell's own `onListen` door in `primaryAction` and
`attackAction`) brings it up under the lens and tips it back —
`MOUTH_AT` / `MOUTH_POSE`, blended into the arm the way the ear pose is,
with a small tremor at the lips — three gulps, and `hp` is full on the
second. Four sips in it (`waterSips`); each drains the model AND the copy in
your hand, which is found BY NAME (`water`, set in `models/water-bottle.js`)
and given the original's scale and position, because `holdable` clones and
`setFill` closes over the original's mesh. Empty, it taps hollow and does
nothing. Measured: hp 1 → 4 at 0.62 s, water column 0.176 → 0.124.

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

**A CHARGE IS A BUTTON HELD, AND A REFUSED WIND RETRIES.** "My weapon gets
stuck charging a heavy" was two things. `startWind` REFUSES while a swing
is in the air, and the latch gave up on the first no — so a button held
through a light cut charged nothing until it was let go and pressed again.
The latch tries again every 45 ms for as long as `windHeld`. And a
pointer-up that never arrives (the lock going to a banner, a press ending
off the canvas) left the haul pose up; the guard learned this first, and
the wind now reads `e.buttons` bit 1 off every move and is released when
the button is not there. Measured: a button held through a swing lands a
full heavy on release; a wind at 0.87 s with no button under it is
released into a swing on the next move.

**THE BEAST STOPS AT ITS OWN BODY.** The lunge ran while `dist > 1.3`,
which is a person's width; a four-metre animal drove its origin to within
a metre and a half of yours and its front half was drawn through you. The
lunge stops at `kind.body` now, and the blow still lands because the sweep
is on the head chain out in front. Measured over forty seconds: never
nearer than 2.56 m, through every swing.

**A TWO-HANDED BLOW AIMS BOTH HANDS.** `aimBar` corrected one chain — the
nearer claw — which on the red alien's lunge left the aimed arm 5 degrees
off the line to your chest and the other 43, one arm at you and one at the
sea. `A.twoHanded` runs the same shoulder turn on both. His tells are a
fifth longer, every contact pose has the arm straight with the shoulder
rolled forward, and `barLen` / the reaches grew to match; the three
reptilians are 1.72 / 2.58 / 2.14 m tall now.

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

**AND THE SHARDS WEAR THE HULL.** Forty planks in a grey box material under
a brown lift did not match the blue-grey saucer they came off — "the
pieces are brown". `makeCrashKit` clones the ship's own material (map,
normal, metal-rough) and `shedHull` gives each shard a hand-sized window
onto the atlas rather than the whole map per face; the glow is
`SHARD_HOT` in the air and cools to `SHARD_DEAD` at 0.48, which are the
numbers `placeCrashSite` writes onto the dead hull, so what lies on the
sand is one wreck. The clone carries `bwDead` so the site's own grade
leaves it alone.

**THE SCP IS IN FRONT OF THE PAVILION, AND THE HOUSE IS THE TRIGGER.** He
sat on the lane below the tower; he stands on the dry sand under the round
room's windows now (`SCP_X` 10.6, `SCP_Z` MUSH_Z - 15), facing the house,
in the standing `idle` with the neck and head turned back about the body's
right (`scpLookUp`, composed AFTER the mixer's stamp, which is why
`updateScp` runs after `updateMutant`). Three phases (`scpPhase`): HIDDEN
— `visible` false and NOT in `farProps`, because a far-prop entry writes
`visible` every frame; REVEALED the frame `mushWhere` leaves 'out', so
from the glass you look down and he is looking up; AWAKE when you come
out of the gate — `mushInYard` true, then false, read only while
`mushWhere` is 'out' so the climb cannot count as leaving. The look cone
and the hearing are off until then (`scpLookedAt` returns false below
phase 2). And a trigger that can be missed is a boss that looks broken:
walk straight past the house and he is revealed and awake thirty metres
on. Measured on a clean load: hidden on the approach, visible from the
stair, asleep in the yard, roaring on the sand outside the gate.

**HE STARES; HE DOES NOT LOOK ABOUT.** The standing idle turns the head,
and a thing that is meant to be staring up at your window must not. The
clip is held on its first frame (`kind.sleepStill` → `timeScale` 0 in the
sleep branch), which means the mixer stamps the pose ONCE and never again
— so `scpLookUp` captures the chest, the neck and the head the first frame
the clip is fully in, puts them back on that base at the top of every
frame, and composes on top: the neck and head back so the face is on the
glass, and a breath on the chest (fifteen a minute, a degree either way)
with the neck taking half of it back. The witness's own arrangement.
Measured: the head's direction moves 0.01 across six seconds.

**AND HE IS QUICK NOW, WITH A CHARGE.** "His animations are way too slow":
gaits at 1.5x, `windK` 0.80 (every startup and recovery a fifth shorter —
the shortest tell is 0.26 s against a 0.20 s parry window), `speedK` 1.62,
`aggr` 3.7, four-deep chains, more feints, and `sRush`: the `rush` clip as
the beast's own charge, a `minDist` swing that crosses five and a half
metres through the strike and chains into the swipe, so backing off buys
a charge and not a breather. Measured: 17 swings and 16 damage in thirty
seconds on a player standing at reach; from range the charge comes.

**THE GATE HUNG ITS LEAVES THE WRONG WAY, AND THAT WAS "WIDE OPEN".**
`leaf.position.x = side * leafW / 2` put each leaf OUTWARD from its post,
over the panel beside it, and the gateway itself was empty: two frames
either side of a hole with the tower in it. `-side`, so they meet in the
middle — and they are steel PLATE now with ribs and bars over it, because
chain-link on a leaf is drawn faint by design and a gate you can see
through does not read as shut.

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

**THE CARD IS BLACK, THE BOTTLE IS ONE DRINK, AND THE FISH TALKS ON THE
WALL CLOCK.** The intro's two lines came off on the owner's word: 2.6 s of
black under the heartbeat and the beach fades up (`INTRO_LINES` kept,
unused). `waterSips` is 1 and the empty is `removeFromInventory`'d as the
drink ends; and the drink's pitch was NEGATIVE — cap tipped up and away,
the base at the lips, "backwards" — so `MOUTH_POSE` is +1.95 with a little
lift, tuned live off `__bw.MOUTH_POSE`. `updateBilly` ran from `updateShip`
inside `update()`, which returns while a dialogue is open, so the one time
the fish had lines his mouth was never driven; it runs beside
`updateBradlyBlink` now.

**SEEN THROUGH THE WINDOW, AND ONLY THAT.** Entering the column revealed
the SCP for one build and a fallback woke him on anyone who walked past —
the owner was killed coming back from the checkpoint. `scpInView`: the
middle of the screen on his spot from the round room's floor (`mushWhere`
'floor'), inside 45 m and 37 degrees, and there is no other trigger. The
`scpPhase` getter had to move into the ORIGINAL `__bw` literal, the
`abductDone` lesson again.

**"SLOW-MO" WAS A SHORT CLIP ON A LONG CLOCK.** His attack clips are 0.42
to 0.75 s and `mutClipTime` mapped the whole wind-up onto a startup twice
as long: measured rates 0.31 to 0.55 of real time on every swing. A swing
marked `real` is played the Dealer's way — the limb drawn back to `cock`
over the first part of the startup, HELD (that is the tell you block on),
and the strike from the cock to the contact at `clipRate` in the last part,
so it still lands on the damage frame; the recovery at no less than real
speed, holding its last frame. The leap runs its jump at 0.42 so the clip's
flight matches `LEAP_AIR`. Measured: 12 swings, 22 damage, in thirty
seconds at reach.

**THE LEAVES ARE MESH AGAIN, BARRED.** Plate hid the lighthouse; the owner
wants the gate fence like the rest of it and the tower seen through it, so
chain-link with three ribs and a bar every three quarters of a metre, and
they meet in the middle (the `-side` fix).

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

**AND THE STEEL IS DRAWN.** Flat colours on fourteen metres of post read as
plastic. `grimeTex`: a cold base, speckle, rust running DOWN out of every
joint, a band of grime toward the foot, scuffs, quantised and nearest-
filtered like the game's own canvases, and every fence material is lifted
off its own map. The witness stands ON THE LANE now (`LH_X + pathBend`) so
he is in line with the door when you look back at the tower, and the
creature he becomes asks `headlandAt` for his feet every frame in
`updateNtar` — he walked the ridge at his spawn height before.

**THE FISH SWITCHES ONCE.** Strobing between the two photographs at five
and a half a second was "moves too much, flashing": while he talks the
head comes round once and stays, and what moves is the plaque — a small
bob and a scale wobble at a mouth's rate. One switch in, one out.

**A RAGDOLL PARTICLE MAY NOT OUTRUN A THROWN BODY.** Twelve passes of
constraints, bend limits and full-strength self-collision can pump a joint
pinned between the floor and its neighbours, a little more each pass, and
a corpse at rest was across the beach — "ragdolls sometimes fly around".
`RAG_VMAX` (14 m/s) caps the displacement a particle carries out of a
substep, with a NaN guard; nothing here throws a body that fast. Measured:
a kill's own throw peaks near it and the body sleeps.

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

**SOMEBODY ELSE'S MOTION CAPTURE, ON A RIG IT WAS NOT MADE FOR.** Three
Mixamo clips — a capoeira compass kick, a side handspring, and the one
where a man is knocked onto his back — go onto the red alien, who is a
Character Creator rig with different bone names, a different rest pose and
a different bone-axis convention. `tools/ntar_moves.py` dumps, per bone per
frame,

    D = (world rotation this frame) * (world rotation at rest)^-1

the rotation the bone has UNDERGONE — and that is the whole trick, because
D is convention-free: it knows nothing about Mixamo's naming, nothing about
which way Blender lays a bone's local Y, and nothing about either file's
axis convention. `ntarRetarget` applies it to the alien's own bind pose
(`W = D * A * bind`, then down the hierarchy into local space) and the same
motion comes out on a different body. Four things it took:

- **THE MAP WAS ALREADY IN THE FILE.** `kind.rag` is written in the mutant's
  naming (`Character1_Hips`), which is Mixamo's naming with a prefix — so
  the ragdoll's own table is the retarget's table and there is no second
  list to keep in step.
- **A IS NOT T.** D is measured from MIXAMO's rest, which is an A-pose;
  this rig binds in a T, so applied raw every limb sits forty-five degrees
  off for the whole clip. Each bone is first turned by the SMALLEST
  rotation that takes where it points its own child to where Mixamo's rest
  points — the ragdoll's rule for driving one skeleton from another, and
  smallest-rotation rather than look-at for the same reason: neither rig
  runs its bone axes along its bones. The rest HEADS go in the file for it.
- **THE BIND POSE, NOT THE STANCE.** `authorNtarClips` plays the demo clip
  at t = 0 and builds everything on that frame — arms at his sides. Using
  it as the retarget's reference folds his arms-down pose into every frame
  of somebody else's motion. The bind is captured at the top of the
  function, before the mixer has ever stamped anything.
- **AND A MIXAMO CLIP IS A PERFORMANCE, NOT A MOVE.** All three are 250
  frames and none moves for more than about a hundred: the beast's `Die_1`
  again. The tail is measured and cut, and so is the HEAD — the uppercut
  spends its first second ambling into the punch, which he does not do in a
  fight. Measured off the hips and written down as `WINDOW`.

**AND THE ROOT TURN IS ROOT MOTION TOO.** The game turns a creature toward
the player every frame, so a clip that also turns the hips fights it. The
yaw is measured over the window: one that ends where it started keeps its
spin (a capoeira turn IS the move) and one that does not is de-yawed frame
by frame. The knockdown is de-yawed whatever it measures, because the reel
turns him right round and the owner wants him FACING you when it lands —
`mutKnockdown` sets the heading and the clip no longer argues with it.
Measured: he faces the player within 7 degrees.

**ONCE A FIGHT, HE GOES ON HIS BACK.** `knockClip` / `knockP` on the kind,
and it fires only on the blow that BREAKS HIS POISE — already the hardest
thing to land on him — one time in four, never on the blow that wakes him,
and never twice. Three beats on one clock (`NTAR_KNOCK`): the fall, a beat
lying there, and the get-up. While `st.down > 0` he is ahead of the roar,
the stun and the recoil in `updateMutantUnit`, and `hurtMutant` returns
early with the damage and the blood and nothing else — every branch below
it would stand him up on the frame you hit him, which is the one thing a
knockdown must not do.

**AND A FALL REVERSED IS A GET-UP, EXCEPT FOR THE HIPS.** There is no
get-up in the file — the source lies still for the rest of its 250 frames —
so the rise is the same reel run BACKWARDS, which is the right shape and is
the walk-played-backwards trick one move along. What it also does is un-do
the punch: measured, his hips came back up to 1.74 m on the way to
standing, so he got to his feet by flying two metres into the air. The hips
are clamped to the straight line from where he lies to where he stands and
what is left is his own tumble at ground level, which reads as a body
rocking back over its shoulders and onto its feet. Measured after: the
hips never pass 0.91 against a standing 0.94.

**THE KICK LANDS WITH A LEG, WHICH HE DID NOT HAVE.** `nSweep`'s contact is
where the clip's own striking toe is moving FASTEST (0.696 — a sweep has no
extreme of position, the reptilian rake's lesson), and `limbs: [2]` is the
right leg, which the rig now carries as its one extra chain so the blow
sweeps the shin and the foot and never a hand. Two thirds of the clip's
travel is in the wind-up, so the lunge is too. Measured at the contact
frame over twenty samples: the toe is within 1.2 m of the chest in
nineteen, median 0.45 — and the one that looked like a miss was sampled
thirty milliseconds BEFORE contact, mid-travel. **Measure a swing on the
frame the game deals the damage, not near it.**

**AND THE HANDSPRING IS HIS DODGE.** `dodgeClip` was the reptilians'; he
takes it now, and his is a macaco — he drops onto his hands and throws
himself sideways over them. It is long for a dodge (a handspring is), so it
costs him the swing he would have had, and `dodgeRate` was added because
his clip is not the reptilians' length. The window was cut twice: the first
guess ended while he was still INVERTED, which the hips' own curve says
plainly (his spine's up reaches -0.99 at frame 52 and he is not upright
again until 80). Measured: three dodges in five seconds of a held charge.

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

**AND THE WINDOWS HAD A SKY BEHIND THEM.** The scan hangs a lit backdrop
behind every window (`vitrail-fond*`) so the glass reads against daylight,
and forty metres underground that backdrop is six slabs of white burning
through the sanctuary wall — the blown-out patches round the apse. It is
dropped to almost nothing with a cold cast: a memory of a sky. The exterior
walls (`*-ext`), seen through the openings, are in the ground and go dark
with them.

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

**A HOLE THAT SITS ON THE GROUND IS A DRAIN.** The way in was a circle cut
into the TALUS with its bottom edge on the beach and a heap of spoil in
front of it, and the owner's word for it was horrible. It is a hole IN THE
WALL now — its floor most of a metre clear of the sand, its middle at eye
height, so you look straight into it from where you stand — and three things
make it a hole rather than a disc of black: the edge is RAGGED (three sine
terms on the angle, because sand does not break in a circle); the wall
darkens into it over the last THIRTY centimetres, which is the shadow a
recess throws on its own lip and is most of what says depth — at the half
metre it was first drawn at, the lip read as a blurred smudge on the dune;
and behind it is nothing at all, pure black, unfogged and unlit, in a box
wholly behind the face. The spoil heap is gone: it made a found thing into a
dug one.

**A HOLE IS A PLACE, NOT A PICTURE.** The ragged black disc on the sand
wall moved with you like a decal, and the owner said so: he wanted the
drain's outfall, in sand. So it is a BORE now — an open-ended tube of the
beach's own grain driven three metres into the dune behind the cut, its
walls knocked out of round in the geometry the way a thing dug by hand is,
its diffuse AND its emissive taken to black by the second metre in the
shader (take only the diffuse and the far end glows), and a black box
across the end so there is no end to see. Walk past it and the inside
parallaxes; that is the whole difference.

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

**AND THE RING IS BEHIND THE WALL, WITH THE BREAK'S OWN RIM.** It stood at
exitEdge + 0.06, which is the plane the wall is in, so from the nave a disc
of cave stone eighteen metres across hung in front of the apse and fought it
for the depth buffer. It is behind the wall now, and its inner rim is built
to the SAME wobble the shader cuts with, a finger's width inside it, so it
plugs the cut exactly instead of leaving a crescent of open wall wherever a
round hole and a ragged one disagree.

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

**A SCREENSHOT INSIDE `browser_batch` IS THE PREVIOUS FRAME.** Three rounds
of this were judged on stale pictures — a render and a screenshot in one
batch returned the sheet from the call before, identically, and every
change read as "no effect". Render in one call, screenshot in the next;
this file has said so before and it cost an hour anyway.

Measured after: the passage walks in 2329 ticks with zero stalls, the shell
shows in 0.005 % of the frame, and the twelve stations photographed under
the glowstick read as one bore.

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

**AND THE .BLEND IS THE SOURCE, NOT THE .FBX, AND THE HANDS ARE WHY.** Three
builds of SOL put the bleeding heart and its eight daggers at the figure's
THIGHS — "the heart and knives are not in its hands". Measured in both files
against the hem of the robe: in the .blend the heart stands at 1.118–1.313 m
and the hands at 0.974–1.233, which is a heart held in two hands at the
chest; in the .fbx the same heart is at 0.762–0.965 and the daggers are
squeezed from a 0.42 m span across to 0.21. The heart carries a GEOMETRY
NODES modifier and all eight daggers are PARENTED TO IT, and none of that
survives an FBX export. The blend also carries every texture PACKED,
including the heart's roughness map, which was never in the delivered
`textures/` folder at all. Two smaller ones from the same build: **a map
reached through anything but a bare link is still a map** (walking the socket
from the BSDF found fourteen of sixteen, and the robe's base colour came
through a mix node and shipped at 4096 — two and a third megabytes of the
asset on its own), and **a shift only works on an identity transform** —
writing `o.location` moved every object but the one that was neither parented
nor joined, which is a heart half a metre below its own body.

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

**AND THE PROMPT THAT TAKES YOU SOMEWHERE SITS IN THE MIDDLE.** A prompt down
beside the stamina bar is right for picking a shell up and wrong for the mouth
of a cave — the owner walked into it and never saw it. An interactable with
`mid` puts its prompt under the crosshair in white. It lives BESIDE THE
CROSSHAIR and not in the HUD strip: an ancestor with a `transform` contains
`position: fixed`, so inside the strip it rendered at the bottom of the screen
anyway.

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

**AND THE GLOWSTICK IS A CRACKED LIGHT-STICK, NOT A LAMP.** At 17 over eleven
metres it washed a room out, which never showed on an open beach and showed
badly in the tunnel, where the owner was carrying it: the one place in the
game that is meant to be dark was the one place it was brightest. Eight over
seven metres.

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

**AND HIS MIXER MUST NOT HANG OFF A PHASE THAT IS OVER.** `updateNtar` was
called from `updateShrineFight`, which returns early on anything but phase 2 —
and by the time he is standing on the sand the phase is 3. It never ticked
once, so he stood in the bind pose, which on this rig is a T. Anything that
outlives a sequence gets updated OUTSIDE it.

**THE TAKE IS 2.05 s TO THE CUT NOW.** Three passes: 5.30 end to end, then
3.95, now 2.55. Every beat is still there and in order — the ship decelerates
onto its mark, wobbles rather than stopping dead, the beam opens with grit
turning in it, you are lifted, it whites out — each given the time it needs
and no more. **And the park height came down with the clock**: two hundred and
sixty metres brought down in three quarters of a second is 350 m/s, which does
not read as a descent, it reads as a cut. `UFO_PARK` is 105.

**AND WHAT HANDS YOU A ROOM DECIDES WHERE YOU ARE LOOKING WHEN YOU ARRIVE.**
`placeInShrine` sets you down at the rim aimed at the light — measured, 0.72
degrees off it on the frame of the cut — and then the take's own look driver
went on turning your head toward the saucer's BEACH coordinates, which from
inside the hall is three thousand metres across the room: twelve frames later
the light was 12.9 degrees off centre and still drifting. The lift got its
`!inShrine` guard when this was first found; the AIM did not, and it is the
same bug wearing the other half of the same coat. Measured after: 0.00 at the
cut, 0.09 at twelve frames, 0.09 at seventy-two.

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


**A PER-CHANNEL REMAP IS A COLOUR REMOVER, AND BOTH CREATURES HAD IT.** "Why
does everything look muted and grey — I gave you textures and they are not
being used" was exactly right, and the grade was the reason. Pulling R, G and
B each to their OWN target mean and spread, with gains near one, is the same
target for all three channels, so whatever hue the map had was normalised
away by construction — and then a `SCENE_BLUE` mix went over the top.
Measured, source to shipped:

| | source | shipped (per-channel) | shipped (luminance) |
|---|---|---|---|
| reptilian | 32, 47, 24 (green) | 44, 49, 55 — BLUE | 34, 52, 23 |
| alien animal | 85, 81, 76 (warm) | 44, 44, 44 — NEUTRAL | 49, 42, 36 |

A green reptile came out the colour of the sea and the animal came out
neutral to three significant figures. What actually needed changing was never
the colour, it was the LEVEL: these maps are authored for a studio and this
game has a quarter moon. So the remap is on LUMINANCE ALONE and every pixel
keeps its own distance from its own luminance, which passes hue and
saturation through untouched; darkening costs apparent saturation, so the
chroma is given a little back (`TEX_SAT`). Saturation 0.187 → 0.300 and
0.118 → 0.323, against 0.198 and 0.070 before. **If a grade has one target
per channel, it is a desaturator whatever it was meant to be.**

**A ROUND ROOM IS NOT A BOX, AND A DOME IS NOT A FLAT LID.** `PhysProp.confine`
was written for the bunker, which is rectangular, so the hall had nothing at
all: the drones flew through the dome and the chandelier and a thrown wreck
went straight out through the ceiling. `confine` now takes `r` (a radial wall
about a centre) and `ceil` (a FUNCTION of radius), because the one number a
drum offers — `headMin`, the ceiling's lowest point out at the colonnade —
is the wrong number everywhere else: capping a wreck at 6.25 m while the
drones cruise between 6.4 and 7.7 meant a thrown one could never reach a
flying one at all, and the throw simply passed underneath. Asked at the
radius the body is actually at, both hold: a wreck hurled straight up stops
at 5.6 m near the rim, hurled sideways at r = 26.4 inside a 28.75 m room.
And the drones spawn just UNDER the lid rather than dropping in from above
it, which was the same clipping wearing an entrance.

**A BODY IS AS WIDE AS THE BODY — THREE NUMBERS, NOT ONE.** "The alien animal
is way too big and the hitbox is off, he has to stand on top of you to hit
you and for you to hit him" is one cause with three symptoms, and the cause is
that every distance in this fight is measured to `u.g.position`, which on this
model is MID-BODY. At `h` 6.20 it stood twelve and a half metres long in a
room whose clear head height is 6.65 — it filled the hall rather than fighting
in it — and its head sat most of four metres ahead of the point its reach was
measured from. So:

- **`body`** — the push that stops you walking into a creature was a
  hard-coded 0.9 m, which is a PERSON. On an animal four metres across that
  let you stand with its origin less than a metre away, which is to say
  inside it. Measured: it closed to 1.66 m before, 2.60 after, which is
  exactly the radius it is now given.
- **`hitR`** — the blade's own test is a 0.85 m sphere at the origin, which
  on an eight-metre animal is a spot in the middle of its back that you had
  to walk into to hit. At 2.70 a swing connects anywhere from 2.5 m to 5 m.
- **and the REACHES are measured from the origin out to where its head
  actually is** (5.6 and 6.4, not 4.4 and 5.2), so it swings from where its
  jaws are rather than closing until its jaws are past you.

`h` is 4.30 now: still the biggest thing in the game and no longer the room.

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


**A DEATH CLIP THAT WAS AUTHORED TO LOOP STANDS BACK UP.** "When you kill it
have it stay in that dead animation" was a real bug and it was in the window,
not in the game: the beast's shipped `Die_1` rears at frame 6, staggers, drops
over frames 33–42, lies perfectly still from 51 to 150 — and then GETS BACK ON
ITS FEET over the last forty-eight frames, because it was made to cycle.
`mutPlay` clamps a death clip on its final frame, so the boss of the ship ended
the fight standing up with its health at zero. Measured out of the exported
GLB, the skeleton's crown goes 19.6 → 11.3 over the collapse and back to 20.7
after it; the window now ends on the collapse and three settled frames
(`[(0, 54, 1)]`), at step 1 rather than 3 so two tonnes take two and a quarter
seconds to arrive instead of three quarters of a second. **Before shipping any
source death clip, plot something's height over the whole of it.**

**AND THE DEATH'S BEATS BELONG TO THE CLIP, SO THEY BELONG TO THE KIND.**
`WARDEN_DEATH`'s 0.55 / 1.05 / 1.72 are fractions of a 56-frame fall measured
on the warden; the beast's is half again as long and its legs give at a
completely different moment, so the two-tonne impact fired at 1.05 s while the
animal was still on its feet. `kind.death` overrides all four and the default
is untouched — and `QUIET`, the beat you get to look at what you killed, is
now 4.60 against a 2.25 s clip, so the collapsed pose is held for well over two
seconds before the hall lets go.

**A PAUSED ACTION STAMPS THE POSE ONCE AND THEN STOPS STAMPING IT.** This is
the trap under "he seems stuck in an animation where he is walking", and it is
general. `PropertyMixer.apply` compares what it has just accumulated against
what it wrote last time and only touches the scene graph when the two DIFFER —
which, for an action frozen on one frame, is never after the first. So
procedural offsets written onto a bone after `mixer.update` are not overwritten
next frame, they are ADDED TO WHAT THEY LEFT: measured on the ntar, his spine
went from 8 degrees off vertical to 75 over three seconds, his head finished
26 cm above his own hips, and every "forward" measured off him was nonsense.
The fight's creatures scrub `action.time` every frame, so their values always
differ and they have never met this. The stance is CAPTURED once
(`ntarBase`) and every driven bone is put back on it at the top of the frame;
the mixer is then not needed again at all.

**AND A CHARACTER CREATOR "TempMotion" IS A DEMO, NOT AN IDLE.** Traced
through the ntar's one clip: he stands for two thirds of a second, walks a
loop 2.3 m long, waves, and comes back to his mark — nine and a half seconds,
looping for ever. So the man who has just watched a saucer come down was
ambling about behind you. The clip is not thrown away, because its FIRST FRAME
is his stance (feet 32 cm apart, spine 8 degrees off vertical, arms down); it
is paused there, which makes it a bind pose that is actually a pose — this rig
binds in a T, so simply not playing it is worse. What is alive on top is
authored: a slow shake of the head IN BURSTS (two and a half turns every
eleven seconds, then a long hold — the same motion on a metronome reads as a
metronome with a head on it), a breath, and his weight moving over his feet.

**AND THE ONLY TRUSTWORTHY FORWARD ON A HUMANOID IS THE EYES.** A forward
built as `(rightJoint − leftJoint) × up` comes out BACKWARD on this rig and
disagrees with itself between the hips, the shoulders and the eyes — and the
clavicles are worse than useless, because their heads sit a few centimetres
apart at the sternum so the vector between them is mostly noise (it reported a
twist no neck could survive). What is unambiguous is the vector from the HEAD
bone to the midpoint of the two EYE bones, and the way to be sure is to put
the camera on that line and render: it comes back a face, every time. Measure
it on the pose READ OUT OF THE GLB, not in the game, or a bug in the game's
own posing is measured instead — which is exactly what happened here, twice.

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

**THE REPTILIANS WERE STIFF BECAUSE THEIR HANDS AND SHOULDERS NEVER MOVED.**
Rendered as eight-frame strips out of the shipped GLB (`tools/monster_strip.py`
takes any `.glb`), the run reads as one pose being carried along: the legs
cycle and the claws, the wrists and the clavicles hold exactly the guard the
stance was authored in, for every frame of every clip. `sh`, `wrist` and
`claw` were in the pose vocabulary from the first build and nothing had ever
written one. A limb that ends in a frozen hand is a limb with a glove nailed
to it. `arm_drive()` is now the one place a stride's upper body is written —
the arm swings, the elbow folds ONLY ON THE DRIVE (a symmetric `abs(sin)`
elbow closes twice a cycle and reads as a shiver at double the leg rate), the
clavicle rides with it, the wrist trails the forearm and the claw closes as
the hand comes through — and the torso counter-rotates, the hips drop at each
contact and the head holds its line against the chest.

**AND IT CIRCLES YOU MORE THAN IT WALKS AT YOU, ON THE WALK CLIP.** `strafeL`
and `strafeR` were aliased onto `walk` for every creature in this game, so a
reptilian holding its distance strode straight ahead while it travelled
sideways — the feet went one way and the animal went another, which is the
plainest version there is of "the animations are off". It spends more of a
fight doing this than anything else (`circle: 0.55`), so it has a clip of its
own, and the PHASE is what makes it a shuffle: each foot's body-relative
offset along the travel line is `-cos(ph)/2` and it is off the ground exactly
while `sin(ph) > 0` — which is precisely the half in which that offset is
INCREASING. A foot therefore moves outward while it is in the air and inward
while it is planted, and inward-while-planted is the body sliding over it.
Lead foot reaches out and plants, trail foot is drawn in after it, nothing
crosses and nothing skates. Measured in the fight: the two side-steps are on
screen 28 % of unit-frames, against a walk cycle before.

**AND A THING BACKING OFF PLAYS ITS WALK BACKWARDS.** The Dealer has done this
since he learned to read a charge — a NEGATIVE `timeScale`, so his feet go
where he is going — and every other creature in the game was stepping back
through a forward stride. One sign, in `mutAnim`.

**A LOOP VARIABLE MAY NOT SHARE A NAME WITH A MODULE-LEVEL HELPER.** The
strafe's `lead = side * d > 0` bound a bool over `def lead(t, d)`, the staging
helper `staged()` calls — so the build died on the LIGHT clip, three clips
later, with `'bool' object is not callable`. Python has no block scope; in a
packer that is one long script of helpers and loops, the loop variable is the
one that has to move.

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

**AND `no-store` MEANS EVERY RELOAD REFETCHES NINETY-FOUR MEGABYTES.** That is
most of what "the loading takes too long" is when you are playing the game on
the machine you are building it on. `serve.py` keeps `no-store` for the code —
main.js is edited every few minutes and a stale copy is a terrible way to find
out your last three commits were never loaded — and gives the ASSETS
`no-cache`, whose name is nothing like its meaning: it still revalidates on
every request, so a rebuilt .glb is picked up the moment its mtime moves, and
it answers 304 with no body when it has not. 94 MB became 55. The four that
remain (bunker 22.7, boat 13.8, corpse 11.6, shrine 7.2) are simply too big
for Chrome's disk cache to keep — and their bytes are GEOMETRY, not maps:
462,206 triangles in the moored tug and 277,900 in the body bag against about
two megabytes of texture each. Decimating those two is the next real lever on
load time and on the walk's frame rate, and neither was ever asked to be exact.

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

**AND THE DOCK'S TWO LAMPS WERE IN `farProps`.** This is the last copy of the
oldest performance bug in this file and it was hiding in the one list that
looks harmless: `farProps.push` on a LIGHT. Measured across the abduction, 29
point lights while you are in the hall and 31 the instant the crash puts you
back on the sand — those two — so the cut paid for thirty fresh shader
programs and, once, a frame of nearly eleven seconds. Left switched on they
cost nothing: an 11 W lamp with a 14 m falloff at `DOCK_Z` lights nothing else
on a kilometre of beach, which is exactly why the hall's lamps and the
saucer's already live in a group that is never hidden. **Far-cull the boards,
never the lamp.** With the count pinned at 31 the walk has no light transition
anywhere in it (measured every 20 m from z = 60 to -420: one value).

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

**AND A THROW INSIDE A NAMED SPAN SHOULD SAY WHICH SPAN.** An exception in
`animate` reports the line of the `bwSpan` call and nothing else, which is a
one-line stack for a crash that can be anywhere in the game; `bwSpan` names it
now. (The one it caught was the harness's own: teleporting the player past
`ABDUCT_Z` before the hall has loaded runs `placeInShrine` with `SH` still
null. Walking there cannot do it, but a test that teleports can.)

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

**AND HIS FEET STOPPED SLIDING, WHICH WAS FOUR CLIPS AND ONE SIGN.** The
owner sent a walk, a second walk, a strafe and a side step. What they fix is
the oldest animation bug this file has: `strafeL` and `strafeR` were the WALK,
so a thing holding its distance strode forward while it travelled sideways —
the plainest version there is of the feet going one way and the animal going
another, and the whole of "his feet slide". He has a real sideways stride now
(0.90 m a cycle, measured) and the Mutant Walking for his walk (1.88 m).

- **A SIDE-STEP PLAYED BACKWARDS IS THE OTHER SIDE-STEP.** Mixamo gives one
  direction. `kind.strafeMirror` runs the same clip at a NEGATIVE rate for the
  other, which is the walk-backwards trick one step along and costs nothing.
- **AND THE RATE IS THE STRIDE OVER THE SPEED.** A clip that travels 1.88 m a
  cycle played at the wrong rate is a creature skating; `anim.rate` and
  `strafeK` are set from the clips' own measured travel rather than by eye.

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

**THE PORTAL, AND THE DOJO THROUGH IT.** A stone circle on the dry sand a
hundred metres past the cave mouth (`PORTAL_X` / `PORTAL_Z` = `HOLE_Z - 100`),
and the scorched dojo on the other side of it (`DOJO_X/Y/Z`, six thousand
metres out, the hall's own arrangement). Stand in the middle of the ring for
`PORTAL_HOLD` and it takes you; take the katana off its stand and the man it
belongs to says so and comes for you; kill him and it puts you back beside the
stones. Three downloads — DJMaesen's portal, matiasmgru's dojo, adrigon's
samurai — and the traps they set, in the order they bit:

- **`Box3.setFromObject` READS `matrixWorld`, AND A JUST-ADDED OBJECT HAS
  NONE.** The raycaster's own trap wearing a different tool. The portal is
  added and measured on the same frame, so without an `updateMatrixWorld(true)`
  the box comes back in the SCAN'S units: measured, the base read a top of
  69.19 and a radius of 686.93, which went into `rockColliders` as a
  687-metre cylinder and threw the player the length of the beach the moment
  they came near it. Anything measured at load measures the identity.
- **THE GLOW HAS TO SIT ON THE BASE, AND THE BASE HAS TO BE MEASURED.** The
  first build put the vortex at y = 0.05 — the sand — and the model's own
  stone platform tops out at 0.381, so the whole light was a third of a metre
  INSIDE the rock and invisible from everywhere. The base mesh is found by
  name, boxed, and the disc is built to its radius and stood on its top. It
  also gets a collider at that height, which is under `ROCK_STEP`, so the
  beach's own rule applies with no special case: you step onto it rather than
  wading through it.
- **A CAVE'S FLOOR RULE IS NOT AN OPEN-AIR FLOOR RULE.** `build_walk` calls a
  surface a floor only if something is ABOVE it, which is what stops the
  outside of the cave's hill being walkable — and the dojo is roofless,
  because it burnt down. Run as-is it found 56 walkable cells out of 60,099.
  Under `--open-sky` the lowest near-horizontal surface is the ground, and
  everything standing on it is what `solid` is for. Then the LOWEST surface
  turned out to be the UNDERSIDE of the floor slab (winding is not read
  anywhere in that file), which put the floor 0.36 m under the boards;
  everything within a `STEP` of the lowest is the same ground, so the slab's
  top wins and the shelf above it does not.
- **THE PACKER DROPS ANIMATIONS, SO THE RAIN IS THE GAME'S JOB.** The dojo's
  `Take 001` drives the rain, and a clip that targets nodes cannot survive a
  bake that flattens every node into world space. Both rain shells scroll
  their own map (at different rates, so the far one does not march in step
  with the near one) and the fifty-five ground splashes flicker on their own
  offsets — one phase for all of them reads as the lights failing, not as
  rain.
- **A RIGIFY RIG IS 678 POSE CONSTRAINTS, AND `matrix_basis` SEES NONE OF
  THEM.** The alien beast's lesson at four times the scale: record `pb.matrix`
  off the evaluated depsgraph, convert back to a constraint-free basis, and
  remove the constraints only after every clip has been sampled.
- **AN ARM IN A T-POSE LIES ALONG X, SO A ROTATION ABOUT X IS A TWIST.** The
  first pose set lifted the arms about X and measured 2.33 rad on the upper
  arm — and rendered eight frames of a man standing in a T turning his wrists
  over. Nothing about a pose can be checked by reasoning; every sign in
  `tools/samurai_pack.py` was settled by looking at a strip.
- **AND `Plane` WAS HIS HAKAMA.** Two meshes were dropped as "helper
  geometry" on the strength of their datablock names. The render came back
  with a samurai whose legs stopped at the armour skirt and started again at
  the boots. A mesh that is weighted to the rig and carries a material is part
  of the man, whatever Blender called it.
- **A PER-PART REMAP IS A FLATTENER**, one level up from the per-channel
  remap's own mistake: pulling every texture part to the same mean made the
  trousers (13.8) and the eye (138.5) both mid grey. What is wrong with these
  maps is the LEVEL, shared by all of them, so the shift and the scale are
  worked out once over every part together.
- **`bossDeath` IS CHECKED BEFORE `deathClip`, AND IT RAGDOLLS.** It works on
  the Dealer only because every bone lookup there goes through a `boneAlias`
  onto `Character1_*`; this rig answers to `DEF-spine`, so the body came out
  with ZERO parts and the boss finished the fight frozen upright in whatever
  frame killed him — measured, `rag` built and the mixer stuck on `sStab`. He
  goes down his own authored `die` instead, and the beats are `kind.death`
  because they belong to the clip.
- **AND `drawGait` DRAWS FROM A PAIR.** `mutPlay` was handed `run2`, resolved
  nothing and RETURNED WITHOUT TOUCHING ANYTHING, so he crossed thirteen
  metres and threw a swing with his TAUNT still on the mixer. The warning has
  been in `mutPlay` since it was written and says exactly this — READ THE
  WARNINGS. `kind.alias` needs `walk2`, `run2` and `idle2` as well as the
  strafes.
- **AND THE BEACH'S CLAMPS ARE NOT THE DOJO'S — the fourth and fifth coats.**
  `mutClampX` would have teleported the samurai onto the sand on his first
  step (he is held by the room's own grid instead), and the player's own
  `CLIFF_BLOCK_X` clamp yanked them back to x = 14.2 the moment they arrived
  six thousand metres away. `inDojo` joins the list that lifts it.
- **AND THE RETURN SPOT WAS ON THE CLAMP.** `PORTAL_X + 2.6` is 14.2 and
  `CLIFF_BLOCK_X` is 14.2 — measured — so the first version handed you back
  jammed against the foot of the cliff. It steps back along Z instead.

The portal carries NO light: the glow is two additive shader meshes, because a
PointLight in a far-culling group changes `NUM_POINT_LIGHTS` and recompiles
every material in the game as you walk up to it, which is the pavilion's whole
scar. The dojo carries none either — the moon is directional and reaches
everywhere, and the rest is each material's own map through its emissive.

Measuring any of this in the preview has two traps of its own. The pane cannot
pointer-lock, so `canMove` is false and `keys.KeyW` moves nobody — nudge the
body and let the clamps answer instead. And teleporting to the portal crosses
the MUTANT trigger on the way, so `updateMutantCut` returns true, the whole
creature loop is skipped and the samurai stands there dead-looking with
`struck` set and `hitstop` at zero; the tell is a field of view of 24. Step it
out before measuring anything.

**AND THEN HE HAD TO ACTUALLY FIGHT.** Four things, and the middle two are the
same bug this file has already written down for three other creatures.

- **HE IS NOT IN THE ROOM UNTIL YOU TAKE IT.** Standing him at the back from
  the moment you walk in makes the dojo a room with a man in it — you spend the
  approach watching him instead of looking at the place, and he gives the sword
  away, because the only thing worth guarding is the thing on the rack. He
  arrives BEHIND you the moment you lift it, which is the one direction you are
  not looking, since you are looking at the sword. The spot is the player's own
  heading (six metres back, a little to one side) walked outward to the nearest
  cell the walk grid agrees is floor, so he can never arrive inside a wall.

- **`kind.rig` IS WHAT MAKES A BLOW LAND, AND NOTHING SAYS SO WHEN IT IS
  MISSING.** `u.bones` is only built from that map; with no map `mutLimbs`
  returns an empty list and `aimBar` and `blowLands` both run and do nothing.
  That is a boss whose sword goes past you and whose damage comes from a
  distance test you cannot see — which is exactly what "the hit registration
  doesn't make sense" was. The Dealer has to run `barLen` out along his
  FOREARM because that is where a crowbar lies; this rig carries a real bone at
  the point of the blade, measured off the sword mesh in the packer, so the
  hitbox is swept down the steel itself. Measured after: the tip passes within
  0.12–0.48 m of the chest on all five swings, and he lands 43 hits a minute
  off 42 swings — the Dealer is 48 and 40.

- **AND three's LOADER SANITISES NODE NAMES.** `PropertyBinding.sanitizeNodeName`
  strips the dots a Rigify rig is full of: `DEF-shoulder.R` arrives as
  `DEF-shoulderR` and `DEF-spine.006` as `DEF-spine006`. Written the way
  Blender spells them, four of five lookups matched nothing and `u.bones` came
  back holding only `tip` — the one name with no dot in it. Read the names off
  the LOADED rig, never off the exporter.

- **HIS SWORD WAS CONSTRAINED TO HIS HAND AND THE CONSTRAINTS ARE STRIPPED.**
  `Katana` and `Wakizashi` are root bones the swords are weighted to, held in
  his fists by COPY_TRANSFORMS; every constraint has to go before a clip is
  written, or the recorded pose is applied twice. So in an AUTHORED clip
  nothing drives them at all — measured, the blade tip travelled 0.00 through
  four of five swings while his arms did the whole stroke. They are pinned per
  frame instead, and WHERE is the trap: at rest both swords are SHEATHED AT HIS
  HIP, so an offset taken from the hand's rest transform is "a hip, expressed
  relative to a hand", and carrying that through a swing throws the katana
  across the room — rendered, it left his fist on the third frame and flew. The
  held offset is taken from a frame of the SHIPPED clip, where the constraint's
  own answer is baked in. The wakizashi is the opposite case and wants the
  opposite fix: it stays sheathed, so it is pinned to the pelvis, where its
  rest offset is already right.

- **AND THE CONTACT FRAME IS WHERE THE BLADE MEETS A BODY.** The warden needed
  three different proxies — lowest, furthest forward, fastest — because no one
  of them suits every swing. There is a better question and it is the one the
  fight asks: a man stands in front of him at chest height, and the contact is
  the frame at which the POINT passes nearest him. It suits a chop, a sweep, a
  rising cut and a thrust without being told which is which. It must be
  measured in the RIG'S OWN UNITS — this model is 4.82 units to a 1.86 m man,
  so a chest written as "1.25" is a chest half a metre off the floor.

**THE ELDEN RING KATANA SET CANNOT BE USED, AND ITS TIMINGS CAN.** The owner
supplied an MCO/SCAR Skyrim mod — 168 `.hkx`, Havok 2010 packfiles holding
`hkaSplineCompressedAnimation`. Two things kill the pose data and the second is
fatal on its own: it is spline-compressed (a decompressor is days of
bit-unpacking), and THE ARCHIVE SHIPS NO SKELETON, so the tracks are bare
indices into Skyrim's bone list with nothing to map them to — and even decoded
they would need retargeting onto Rigify. What IS readable is the ANNOTATION
TRACK, in plain text: `preHitFrame`, `weaponSwing`, `HitFrame`, `MCO_WinOpen`.
Across its light attacks contact lands at 0.37–0.50 s, the early cancel at
0.17–0.25 and the combo window near 0.6, and every startup in `MUT_ATTACKS.s*`
sits in that band. **A reference you cannot decode may still be a measuring
instrument.**

His move set is five swings now, not three — a flat side cut, a rising kesa, a
turning cut, a thrust and the overhead — each built from waypoints with EVERY
JOINT GROUP ON ITS OWN CLOCK (the body leads, the chest follows, the sword arm
is last and carries past its stop), and footwork under all of them, because a
blow reads as having weight when the body went with it. They chain into each
other rather than into one answer, so no two exchanges are the same shape.

**THE DOJO'S SKY IS THE ONE THING IN THERE THAT MUST NOT BE LIT.** It ships as
a painted dome and came out the brightest surface in the place — a pale lid
over a night scene with a hard line where it met the fog, which is the whole of
"you can see the skybox". Three things together: it goes UNLIT
(`MeshBasicMaterial` takes no light and so cannot be brightened by the moon),
it is graded to the beach's own night level, and it FADES WITH HEIGHT into the
scene's fog colour so the top of the dome and the distance are the same colour
and there is no edge left to see. Fog does not reach a basic material's far
distance the way it does a lit one, so the fade is written into the shader.

**AND THE KATANA IN YOUR HAND HAS A SHINE ON IT.** The blade is deliberately
dark and the shinogi ridge catching the one directional light is what says
"sword" — but held still, the ridge has nothing to catch and it reads as a
black bar. A slow breath on the emissive, opened up by how fast the sword is
actually moving, so it lives on the swing. IT IS THE HELD COPY ONLY: the
material is cloned for the view model, because `katModel`'s materials are
shared with the one on the sand, the examine screen and the pack icon — the
Military Shovel's own scar, where a lift on a shared material made a dark scan
glow flat grey everywhere at once. And slight means slight: the first pass ran
nearly three times the material's own emissive and the sword came out a pale
bar.

**AND THEN HE GOT REAL ANIMATION.** The owner's verdict on the authored set
was that he slid about with his hands out and never swung, and he was right:
hand-posed waypoints on a rig this complicated were never going to read. What
arrived next was eight **Mixamo FBX** clips — Great Sword Slash ×2, Sword and
Shield Slash, two Kicks, Blocking, Crouching and a Run — and unlike the Elden
Ring `.hkx`, THESE CAN BE USED, for exactly one reason: a Mixamo rig is a
standard humanoid with named bones and a rest pose, which is the only thing
that makes a retarget possible at all. They replace the idle, the walk, the
run, the block and all five swings; the taunt, the stagger and the death stay
authored, because nothing in the set is either.

What the retarget cost, in the order it bit:

- **THE DELTA MUST BE EXPRESSED IN THE DESTINATION'S FRAME.** Both
  `matrix_local` and `pb.matrix` are ARMATURE space, which is self-consistent
  per rig — and the two rigs do not share one, because the FBX importer turns
  Mixamo's Y-up armature on its side. A rotation meaning "lean forward" over
  there means "roll over" here. Rendered, he cartwheeled: upside down by the
  third frame, flat on his back by the fifth. The delta is taken to WORLD space
  on the source and brought back into armature space on the destination.

- **RIGIFY PUTS TWIST SEGMENTS IN THE MIDDLE OF EVERY LIMB.**
  `DEF-upper_arm.L.001` sits between the arm and the forearm and Mixamo has
  nothing to map to it. They are walked through as IDENTITY rather than
  skipped: miss that and the forearm hangs off a bone nobody posed.

- **AND THE PELVIS HAS TO BE DRIVEN OR HIS SCABBARDS STAY BEHIND.** Both
  scabbards and the sash are weighted to `DEF-pelvis.L`, which hangs off
  `ORG-spine` — a bone Mixamo cannot map. Left as identity it keeps its REST
  orientation while the body turns, so the swords and the sash detached from
  his hip and stood in the air behind him, which rendered as a flat panel over
  his shoulder. The pelvis bones are driven from the hips.

- **A CLIP AUTHORED TO BE WATCHED IS NOT AN ATTACK — the beast's lesson, on a
  second asset.** These arrive as complete performances: the sword-and-shield
  slash is a hundred and six frames and most of every clip is standing in an
  idle at each end. Measured before trimming, TWO OF THE FIVE had their contact
  frame at FRAME ZERO, because the pose a greatsword clip starts in is nearer
  the player than anything the swing does. The strike is found rather than
  declared — the frame at which the striking end is moving fastest — and the
  window is a wind-up before it and a follow-through after. 106 frames becomes
  25.

- **AND THE STRIKING END IS NOT THE SAME THING ON EVERY CLIP: TWO OF THESE ARE
  KICKS.** Asking "what passes nearest the chest" over every end at once picks
  the wrong one — a foot planted on the floor a metre and a half in front is
  1.25 m from a chest, which beat the actual blade on three clips out of five.
  The striking end is written down per clip, and a kick is aimed lower than a
  cut so it gets its own target height. The kicks are the best thing in the
  set: a kick is a mixup no amount of sword-reading prepares you for, and it is
  the one attack of his whose tell is in his legs.

Measured after, hands-off at fighting range: all eight clips on screen, 41
swings and 37 hits a minute. The Dealer is 48 and 40.

**AND THE PACKER'S WORLD BAKE PUTS EVERY NODE AT THE ORIGIN.**
`undercroft_pack.py` bakes geometry into world space and leaves the node
transforms at identity, so `getWorldPosition` returns (0, 0, 0) for every mesh
in the dojo and "the sword nearest the picture" came back as whichever one was
walked first. The geometry is the only thing that knows where anything is:
measure a `Box3`. Measured that way the picture sits at (0.71, 0.90, -2.57),
`HeroSword2` is 0.88 m from it on the wall at 1.47 m with its sheath beside
it, and `HeroSword1` is 1.5 m away down at 0.45 m — so the one by the picture
is the one on the stand, and that is the one you take. Note also that
`HeroSwordHolder` is the RACK and matches any looser prefix than
`/^HeroSword\d/`, which is how the first build offered you the furniture.

**THE PORTAL'S DISTANCE FROM THE WATER IS NOT A TASTE QUESTION.** It sat at
x = 11.6, tucked under the cliff, and wanted to be further out — but
`shoreLine()` reaches 8.6 and the sand plane discards a metre further seaward,
so anything whose FOOT crosses that is drawn standing on the water (the body
bag's own arithmetic). The base course is 1.57 m across, so the middle may come
to 10.2 and no closer: the platform and the light on it stay dry and only the
seaward stones take the swash, which is what a stone circle on a beach should
look like anyway.

**AND HE MAY NOT ARRIVE IN YOUR FACE, OR INDOORS BY DEFAULT.** The spawn is the
nearest cell behind you that the walk grid calls floor AND has room around it —
the free cells within a body's radius are counted, so a cramped interior corner
loses to the open ground through the doorway and the fight can start in the
yard, which is the better arena of the two. Scoring on clearance alone walked
him back off the open ground and into the room (measured: 1.2 m behind the
player, which is not "at your back", it is on top of you), so anything nearer
than `MIN_BACK` is refused outright.

**AND A MEASUREMENT TAKEN OFF A DEAD MODULE IS NOISE.** Two runs of the fight
reported one swing a minute and a creature frozen in a single clip. Nothing was
frozen: the player had died between tool calls, `playerDied` had reloaded the
page, and `sam` was a stale reference into a module that no longer existed. The
same trap the SCP fight already records, one layer out — freeze rAF at the top
of any measurement AND heal every frame, not every twentieth.

**AND THEN HE CAME OUT STRETCHED, FLOATING, AND SWINGING AT NOTHING.** The
owner sent a picture: legs twice his own height and thin as wire, the body
pulled out of shape, the face smeared, and the whole man hanging off the edge
of the deck. Three separate faults, and the first one is the one that made the
other two unreadable.

- **SCALE LEAKED THROUGH THE RETARGET.** A Mixamo FBX imports with scale on the
  armature object AND on the bone matrices, and `pb.matrix.to_3x3()` carries
  it — so the deltas were not rotations, they were rotations WITH SCALE IN
  THEM, and the `want[parent]^-1 @ want[child]` chain multiplied that scale
  down every limb. It compounds: a hand is four joints from the hips, so the
  error is the fourth power of it. He floated because `skinnedBounds` then
  measured a body that was no longer a body and `dressMutant` seated it on
  that. Every matrix that crosses the retarget now goes through a quaternion
  and back (`rot3`), which is the only way to be sure. `.normalized()` is NOT
  enough — it fixes the columns and leaves shear.

- **AND THE ORG- CHAIN CARRIES HALF HIS BODY.** In Rigify `DEF-thigh.L` is
  parented to `ORG-spine`, `DEF-pelvis.L` (which carries BOTH scabbards and
  the sash) to `ORG-pelvis.L`, and eight face bones to `ORG-face`. None of
  those is a bone Mixamo has, so left unmapped they keep their REST
  orientation while the body moves: the legs hung off a hip that never turned
  and the face stayed behind the head. That is the "legs up" and the smeared
  face. Every ORG- bone takes its DEF- counterpart's source now, and the
  handful with no counterpart — the face, the breasts, the four palms — are
  named outright.

- **AND NO CLIP MAY DEFORM HIM AGAIN.** A retarget that leaks scale does not
  fail loudly, it ships. The packer now walks every clip, takes the SKINNED
  bounds at four frames of each, and says so if any clip makes him taller or
  wider than a man. All twelve read 0.92–1.12 of his own height.

**A SWING THAT NEVER CONNECTS IS WORSE THAN NOT HAVING IT.** With the model
fixed, four of his five attacks landed and the OVERHEAD landed nothing at all —
twenty-seven throws over four minutes, zero hits, while the other four ran at
83–86 %. It is not a tuning problem: `Great Sword Slash` is a two-handed chop
whose blade comes down in FRONT of him at a range this fight never uses.
Traced, its limb DOES pass inside the 0.70 m hit radius — at `atk` 0.00, before
the window opens, because at a metre his own shoulder is already that close —
and no placing of the window catches the blade itself. Moving the window,
widening the window and raising the aim all failed in turn. The clip stays in
the file; the fight draws the four that land, and the RISING cut carries the
two-damage heavy instead. **Measure which of a creature's swings actually
connect before tuning how often it throws them.**

Two smaller things came out of the same pass:

- **THE KICKS NEEDED A LEG.** `blowLands` sweeps the chains `mutLimbs` builds,
  and with only the sword arm declared a kick was tested on the BLADE — which
  on a kick is behind him doing nothing. Measured: the two kicks passed 1.10 m
  from the chest on the steel while the foot went through the player. Both
  legs are listed in `kind.rig.limbs` now.
- **AND THE AIM HAD TO BE ABLE TO CLOSE A METRE.** These are real Mixamo arcs,
  not poses solved against a target, so they pass wider than the hand-authored
  ones did — the rising cut went by 1.15 m at `aimK` 1.15. At 2.60 it is still
  clamped, so a swing thrown from too far out still misses and backing away
  still works.

Measured at the end, hands-off at fighting range over two minutes: every clip
on screen, **46 swings and 51 damage a minute at 89 % connect**, with all four
swings landing. The Dealer is 48 and 40.

**AND THE PORTAL IS SUNK SO IT CAN STAND FURTHER OUT.** How far out it may go
is a measured number: sampling `shoreLineJS(PORTAL_Z, t)` over an hour of game
time the swash peaks at **8.12** — the corpse's own 8.13, one place further
down the beach — and the sand plane discards seaward of it, so anything
standing proud out there is drawn hanging over open water. At its shipped
height the stone base stood 0.38 m off the sand, which is the body bag's raft
again. Bedded nearly flush (`PORTAL_SINK`, base top 0.10) there is no gap for
the sea to show through, so the swash runs OVER the base instead of under it —
and that buys the two metres: at x = 8.6 the seaward stones and the seaward
third of the base take the surf, which is as far out as it can go and still be
standing on the beach rather than in it.

**AND A LIVING CREATURE'S HEIGHT IS NEVER UPDATED — WHICH NOTHING NOTICED
UNTIL A ROOM HAD A STEP IN IT.** `makeMutant` is handed a y and that y is never
touched again for as long as the thing is alive; only the RAGDOLL asks
`bunkerFloorAt` what is under it. That is correct on a flat beach, a flat
bunker floor and a flat hall, and every room in this game was flat until the
dojo — whose yard is at -0.15 and whose boards are at +0.09. So the samurai,
who arrives OUTSIDE and walks up into the building, kept the yard's height and
stood a quarter of a metre over the deck.

Both of the owner's symptoms are that one fact. "Floating at you" is the lift
itself; "not hitting" is the same lift, because `blowLands` sweeps his limb
against your torso segment and a quarter metre puts the whole swing over your
head. He follows the floor under him now, eased rather than snapped — a step
taken in one frame reads as the body jumping.

**AND IT DID NOT SHOW UP IN THE HARNESS, WHICH IS THE REAL LESSON.** Every
measurement of this fight walked the player straight in along one line and the
creature spawned near the same spot, so both were on the SAME side of the step
and the gap was zero. It took standing deep inside the building — which puts
his spawn out in the yard and makes him cross the step to reach you — to
reproduce it at all. A test that always starts the fight in the same place
cannot find a bug that is about crossing between two places.

**AND WATCHING HIM MOVE FOUND THREE THINGS NO NUMBER DID.** Every check of
this fight until now was a still or a counter — hit rate, swings a minute,
bounding boxes — and all of them said he was fine while the owner was looking
at a man standing there with his arms out and his face smeared. Stepping the
live fight and capturing a RUN of consecutive frames is what found all three.

- **87 FACE BONES PARENTED TO NOTHING THAT SHIPS.** Rigify's face DEF bones
  hang off `MCH-` controls — checked, and not ONE of their parents is a deform
  bone — so `export_def_bones` drops every parent and reparents the lot to
  whatever distant ancestor survives. Their motion then has nothing to do with
  a face, and they drive 1,448 vertices of the body, 1,601 of the helmet, 2,294
  of the helmet band and 448 of the horns: his whole head. He is wearing a
  kabuto and a menpo, so there is no face to animate — the whole face rig is
  merged into `DEF-spine.006` (6,305 weights moved) and stops deforming, which
  makes the head RIGID with the neck and means it cannot smear. 163 joints
  became 77 and the file went from 12.5 MB to 8.6.

- **AND THE ARMS-OUT WAS A SHIELD HE DOES NOT HAVE.** Measured on the exported
  rig, hands apart per clip: `Sword And Shield Slash` holds them 1.07 m apart
  on average and 1.49 at worst, because THE LEFT ARM IS CARRYING A SHIELD.
  Dropped. `Great Sword Crouching` was nearly as wide at 0.91 and it was the
  IDLE, which is the pose you look at longest, so the guard out of `Blocking`
  (0.68) takes that and the crouch becomes the brace. **Read the clip's name:
  a set that mixes weapons has clips whose off hand is holding something.**

- **AND THE SOURCE ACTIONS RODE ALONG IN THE FILE.** Removing the imported FBX
  objects leaves their ACTIONS behind and the exporter ships every action it
  can find: eight `Armature|mixamo.com|Layer0` clips were in the GLB driving
  nothing, and they measure a T-pose because they belong to a skeleton that is
  no longer there. Remove the action with the armature.

One hypothesis this cost, and it is worth writing down because it was
confidently wrong: the splayed arms looked exactly like the aim correction
wrenching his shoulder, and I had raised `aimK` to 2.60 chasing a hit rate.
Measured across `aimK` from 0 to 2.6, the mean distance between his hands
moved from 0.84 to 0.86 — the aim was not touching it at all. **Measure the
thing you are about to blame before you change it.**

**AND THEN THE KNIGHT LEARNED TO PACE HIMSELF.** Seven more of the owner's
clips: a 360 attack, four hit reactions, and a real left and right strafe
walk. What they bought, and what each one cost:

- **THE STRAFES ARE BOTH THEIR OWN CLIP NOW.** The mirror — one clip at a
  negative rate — was the right trick with one and is not needed with two:
  1.79 and 1.82 m a cycle, so sizing you up is a stride in the direction he
  is actually going.
- **AND CIRCLING WAS CANCELLED EVERY FRAME.** `side` is cleared inside 1.4 m,
  which is right (a creature that close should be swinging, not walking round
  you) and which also cancelled the one beat that exists to MAKE distance:
  measured, the strafe clips played for 0 frames in ninety seconds. It holds
  while he is giving ground. After: 7 %.
- **A BEAT THAT IS WHAT IS LEFT OVER NEVER HAPPENS.** The size-up was written
  as the `else` of "does he want to swing", and at `press` 0.94 he wants to
  swing nearly always — it fired ONCE in ninety seconds. It is its own
  decision now, taken BEFORE the swing, gated on having thrown a couple since
  the last one. After: seven times in ninety seconds, and he opens to three
  metres doing it. **If a behaviour is the leftover branch of an aggressive
  creature, it is not a behaviour.**
- **AND EVERY FLINCH HE HAS IS A STAGGER, BECAUSE THAT IS THE ONLY BLOW THAT
  ROCKS HIM.** A light hit SPENDS POISE and returns without moving him — that
  is the design, and it is what makes the pool worth emptying — so a picker
  put where ordinary hits arrive can never run. The rare two are rare WITHIN
  the poise break: measured over 65 breaks, 44 the ordinary stagger and 21 the
  back-of-the-head, which only ever plays when the blade actually came at his
  back. The stagger's recoil is 0.6 s against a base of 0.28: the longest
  opening in the fight, and the one you earned.
- **AND `bwSpan` FOUND A SECOND ONE.** `warmShrineBoss` read `SH.walkR`
  between the hall's group existing and the hall being measured, threw inside
  the warm chain, and ABORTED it — so the boss's programs were never compiled
  and the hall paid for them on the frame it was revealed. One guard.

Measured: 49 swings and 41 damage a minute, all seven attacks used, seven
size-ups, worst step 0.10 m, worst tick 4.2 ms.

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

**AND `maxReach` IS "COULD I HIT YOU", NOT "WHERE DO I WANT TO STAND".** A
creature carrying one long swing among six short ones counts itself in range
the moment that one could reach, stops closing, and fights the rest of the
exchange from a distance where nothing else it owns will land — measured, the
knight settled at 3.89 m on the strength of a 5.40 m jump while his punch is
2.15. `u.ring` is the use-weighted mean of everything that is not a
gap-closer, and the footwork holds him there.

**AND 1.3 WAS A PERSON'S WIDTH.** The lunge's stopping distance was
`Math.max(1.3, body + 0.15)` — a floor put in so a four-metre animal would
stop at its own body instead of driving its front half through you, and as a
CONSTANT it does the opposite job on anything smaller. Measured at the
contact frame, every swing: the knight's striking hand extends **0.89 m from
his own origin**, so a lunge that refuses to close inside 1.3 leaves his fist
more than half a metre short of your chest on every blow he throws. The
damage still landed — `LAND_SLOP` gives a metre of benefit of the doubt — so
the game said he hit you and the picture said he did not. That is the whole
of "tighten his hits so they actually visibly hit you".

Both ends are wrong, which is why it is a swept number and not a formula: at
his own body radius the blows arrive BELOW THE FRAME (the overhead finished
at ndc y -0.97, the stomp at -2.45, on screen half the time and never).
`kind.lungeStop` is the distance, and `A.stop` overrides it per swing —
because a blow from a LEG lands at thigh height, so the nearer he is the
further under the picture it arrives. Measured after: every hand blow lands
0.36–0.51 m from the chest with **98 % of contacts on screen**, against
0.5–2.4 m and a third of them off-frame.

**AND HIS MOVE SET WAS KEPT; WHAT CHANGED IS EVERYTHING BETWEEN THE MOVES.**
A Mixamo locomotion pack and a reaction reel go on top of the clips he
already had (the owner's word: add to it, do not replace it) — three walks,
two runs, two idles, three sideways strides a side, two quick side steps and
a parry reel, drawn afresh every time he sets off or comes to rest
(`kind.gaits`). Three things it took:

- **THE RATE IS THE STRIDE OVER THE SPEED, AND WITH A DOZEN GAITS IT CANNOT
  BE ONE NUMBER PER KIND.** Each clip's own ground speed is measured at build
  and written into the moves file; the game plays it at whatever rate makes it
  travel as fast as he is actually moving.
- **AND A CLIP THAT DOES NOT TRAVEL IS NOT A GAIT.** Measured: walk 1.76 m/s,
  walkC 1.48, strafeL 1.53, strafeR2 1.70 — against walkB at 0.26 and strafeR
  at 0.56, which are walked ON THE SPOT, and one of those two was the strafe
  he actually used. Played at the speed he was moving they slide a metre a
  second, which is the "his feet slide" this file has now paid for three
  times. They stay in the file and they are out of the pools that travel.
- **AND AN ALIAS OVERWRITES A CLIP OF THE SAME NAME.** `hit: 'hurt'` was
  quietly shadowing the owner's own Head Hit — the clip he sent for exactly
  that job — with the four-key rock written before it arrived. Read the alias
  map before concluding a clip is not playing.

**AND THE BUILD MERGES; IT DOES NOT REWRITE.** `tools/ntar_moves.py` reads
its FBXs out of ~/Downloads, which is the owner's own folder and is cleared
whenever he likes — so a build that insists on every source being present is
one that can only ever be run on the day the clips arrive. It loads the
existing JSON, rebuilds whatever sources are actually there, and leaves the
rest exactly as they were: adding a clip is a one-file drop and a re-run.

Measured at the end, hands-off at fighting range over three minutes: **37.7
swings and 37.7 damage a minute, 98 % of blows on screen, still between
swings 21 % (was ~100), worst step 0.10 m, worst tick 3.7 ms** — and every
one of the new clips on screen.

**THE LIGHT IS IN THE CRATE AND THE RING IS IN THE FIRST CACHE.** They were
the other way round, and the owner swapped them. It reads better this way
round anyway: the shovel's first use turns up the smallest and strangest
object in the game, and the box you have to break open gives you the thing
that lets you see — a crate comes apart in the dark and something inside it
is glowing, so there is no shine to add and nothing to miss, because the
thing IS the light. `dropRing` takes a spot now (a thing lifted out of a hole
is not flung across a beach, so the toss is a parameter too) and
`revealMoundNear`'s first branch simply hands over to it.

**AND ANY HIT OPENS A CRATE.** It was the game's one lock — `CRATE_POWER`,
about two thirds of a charge — and the one place that asked for the heavy
swing by name; a click thudded off the boards and did nothing, which is a
thing you can do three times before you work out the game wants something
else from you. The charge is still worth holding everywhere it was (two
points against one, more reach, poise) and it still SHOWS here: how hard it
came apart is how hard it was hit, so a tap drops the boards at your feet and
a full swing throws them.

**AND THE SAME THING CANNOT BE HAD TWICE.** `addToInventory` refuses an item
already in the pack. Every takeable that can be picked up more than once —
the shells, the note — builds a FRESH item object, so identity is a safe
test, and it is needed the moment anything hands out an item whose world copy
is still lying on the sand waiting to be taken.

**BRADLY WAITS TO BE SPOKEN TO.** Walking within seven and a half metres of
him opened the exchange by itself, on the theory that you must not be able to
miss him — and what that actually does is take the player's hands away for a
conversation they did not ask for, on a beach whose whole subject is choosing
where to walk. He is a `Talk to him` interactable like everybody else; the
prompt is what stops you missing him.

**AND DEV MODE HANDS YOU THE TOOLS, FOR GOOD.** It is for walking the beach
and testing the fights, and both need something in your hands — the two
shovels are an hour apart and the katana is past the drain, so testing the
knight meant playing most of the game first. Turning it on gives you every
dig tool you do not have; turning it OFF does not take them back, which is
the only behaviour that makes sense: an inventory is a thing you have, not a
mode you are in. They are the SAME item objects the world hands out, so the
view model, the icon, the pack and the save's own replay all behave as if you
had picked each one up.

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

**AND THE KNIGHT FIGHTS LIKE SOMEBODY WITH A PLAN.** Three things, and each
is something the player can learn and use:

- **HE PICKS A SIDE AND WORKS IT.** `flankSide` exists to spread a PACK round
  you, and for a creature fighting alone `slotAngle` has nothing to say — so
  it fell through to a coin toss, fresh on every shuffle, and what that draws
  is a two-tonne knight wobbling left-right-left between swings. That is the
  opposite of calculated: it is a thing with no plan. `steadySide` keeps the
  side he is already working. Measured: **3.7 direction changes a minute**
  against one per shuffle.
- **HE DOES NOT THROW THE SAME BLOW TWICE RUNNING.** A draw with no memory
  rolls its favourite swing twice in a row often enough to look stuck, and
  the one thing a boss must never look is stuck. Measured: **6 %** repeats.
  (A CHAIN is the exception and is chosen elsewhere — a deliberate repeat is
  a combination.)
- **AND HE ANSWERS A RAISED GUARD WITH THE THING THAT BREAKS ONE.** Every
  swing already carried `guardK`, how much of your bar it takes — 0.95 for
  the punch against 1.75 for the overhead — and nothing had ever read it as
  an intention. Hold the guard and he both circles more and reaches for the
  overhead, the stomp and the spin. Measured with the size-up held out of the
  comparison so only the draw is under test: guard-breakers **40 % → 49 %**,
  and with it back in he throws **48 swings a minute against 34**, because
  waiting you out is the other half of the same idea. **And measuring this
  needs the harness to hold the guard**: the preview cannot pointer-lock, so
  a dispatched pointerdown does nothing — `__bw.blocking` has a setter, and
  the size-up has to be switched off or it masks the draw in a small sample.

His run is the mutant one and nothing else: the locomotion pack's run is a
man's jog and reads wrong on two tonnes of plate. Everything else he has two
or three of, which is where the variety was wanted anyway — you see him
walk and stand and circle far more than you see him run.

Measured after, hands-off at fighting range over three minutes: **39 swings
and 40.7 damage a minute, 97 % of contacts on screen at 0.30-0.44 m from the
chest, still between swings 19 %, worst step 0.157 m, worst tick 3.9 ms**;
and the walk from the entrance to the altar is unchanged at 97.8 m with zero
stalls and zero reversals.

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

**AND THE RESTORE CAN ONLY REPLAY A PICKUP WHOSE HANDLER EXISTS.** The
checkpoint remembers which pickups you took and fires those same handlers
again, which is the right design — the handler is what builds the view model,
names the thing and puts it in the pack. What it cannot do is find a handler
that has not been registered, and there are real ways for that: an item
registered by something ELSE breaking (the crate's glowstick), a scan that
has not landed inside the eight-second window, an interactable behind a gate
the restore has not opened. When that happens the item is gone for the rest
of the game with no error anywhere — and the owner lost his WEAPONS to it.

The replay stays the mechanism; `finishRestore` is the floor under it.
Anything the save says you were carrying that is still not in the pack when
the window closes is granted outright from a name lookup. It is a last resort
by construction — if the replay worked it finds nothing — and it can only
hand back something you are recorded as having had. **And a box you broke
stays broken**: `crates` is on the save now, restored quietly (no bang, no
boards in the air), which is both how the beach comes back right and how the
crate's own pickup gets registered at all.

**A KNOCKDOWN IS TWO CLIPS, AND IT IS EARNED RATHER THAN ROLLED.** The
alien's reverses its own fall because his file has no get-up in it; the
knight has a real `Knocked Out` and a real `Getting Up`, so each runs
forwards on its own beat and the floor is the fall's last frame held — and
the hip clamp that stops the alien standing up by flying two metres into the
air is skipped for anything with a `riseClip`. The beats are the kind's
(`kind.knock`), because they belong to the clips: 1.27 s over, a third of a
second down, 1.33 s up — **2.94 s**, against the alien's three and a half,
because the owner has to be able to keep fighting.

And `knockP` is a die, which is right for a creature you meet once. The
knight's is a COUNT, and he goes over, gets up, and the tally starts again.
You cannot land it by luck and you cannot be denied it by luck. **`u.st.down`
is undefined until the first knockdown and `undefined <= 0` is FALSE**, so
the first build counted to eight and never put him down.

**AND THE COUNT WAS OF THE WRONG THING, WHICH MADE IT UNREACHABLE.** It was
written as three blows both heavy AND through his poise — "the hardest thing
in the fight to do once, let alone three times", which was the point and was
also the fault. Modelled and then measured against the real `hurtMutant`:
with an eleven-point pool refilling at 1.7 a second, a break lands on a heavy
only when every heavy lands and none is blocked, the third break arrives on
the TWELFTH heavy, and the katana at three a blow has him dead on the
thirteenth. One knockdown a fight, on the frame before the kill, in a fight
played perfectly; in a real one, none. The owner's "the animations where he
falls over are not working at all" was a fall that could not be earned, and
nothing was wrong with the fall. It counts what he asked for — heavies that
LAND, five of them inside one stretch of pressure (`knockLapse`, on the same
idle clock the poise refills on) — and a fight that keeps the pressure on
sees him go over once or twice. **When a mechanic gated on a rare event
never appears, count how often the event can happen before the fight ends.**

**AND THE FIRST FIX OF THAT MADE IT WORSE, BECAUSE OF WHERE THE TALLY
LIVED.** `hurtMutant`'s poise block RETURNS on a blow he absorbs (`if
(u.st.poise > 0) { ...; return false; }`), and the tally sat below it — so
dropping the `poiseBroke` condition changed nothing, since the line was only
ever reached on a break, and raising the count from three to five turned
twelve heavies into twenty. Measured on the real path: zero knockdowns in
every fight. A count of "blows that land" has to be taken on EVERY exit the
landing blow can leave by. Measured after, katana at a heavy every 1.5 s:
two knockdowns a fight, the first at 23 of his 38; spaced 8.5 s apart, none.

**AND A REEL THAT MOVES HIM STILL OBEYS THE ROOM.** `mutClampX` is called
from every movement branch and the knockdown is not one — it rebuilds his
position from `hitFrom` plus the clip's own travel and returns — so a fall's
metre and a half could carry him through a pier and stand him up inside it,
where the chase's own clamp then shoved him out a hand a frame. The down
branch clamps too now, and the correction is folded back into `hitFrom`,
because a position that is rebuilt from a stored point every frame forgets
any clamp it is not told about and re-fights it every frame.

**AND THE BENEFIT OF THE DOUBT WENT TO WHICHEVER LIMB HAPPENED TO BE NEAR
YOU.** `blowLands` falls back to "he is facing you, you are in reach, his
hand is out in front" — and `best` was the minimum over EVERY chain the
creature owns, so a right-hand punch could be scored on the LEFT hand simply
because it was hanging within a metre. What the player sees is a blow landing
while the fist that threw it is nowhere near them: the owner's "there is a
right swing that hits you when it's not even close". A swing already declares
which chains it strikes with (`A.limbs`, the same indices the aim uses) and
the fallback asks those and nothing else. `LAND_SLOP` is a kind's own number
too — a metre was set for a man with a crowbar whose bar finishes inside a
quarter of a metre, and on a creature measured landing 0.30-0.45 m from the
chest it is most of an arm's worth of charity.

**THE SPLASH POOL WAS PINNED TO THE SAND PLANE.** Every drop in it was born
at y = 0.02 and died there — which is the sea, and is the wrong height the
moment anything else in this game has water in it. The tunnel's channel is
four hundred metres up. `spawnSplash` takes the water it came out of, and
`updateSplashes` kills a drop at its own base rather than at the beach's.
The gibs learned this once: A GIB'S GROUND IS A LOOKUP, NOT A NUMBER IT WAS
BORN WITH.

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

**AND HE STEPS ROUND A PIER RATHER THAN SHOULDERING IT.** The chase is a
straight line at you and a nave's piers are a metre of stone with open floor
either side, so he met one, the push-out held him off it, and he worked along
its face — which on a thing this size reads as stupid rather than as strong.
The Dealer has had the answer since the bunker's table and nothing else in
this game had it: `S.clearAhead` marches a heading and says whether a body of
a given radius can walk it, `S.route` is a breadth-first search over the free
cells thinned to its CORNERS, and the route is dropped the moment the direct
line opens — a route is a way ROUND something, not a way of getting about.
Both take `bare`, so the only things he ever routes around are the walls and
the columns. Measured with a pier between them: he is on a seven-waypoint
route within half a second, past it in one, and closing straight after.

**AND THE GET-UP PUT HIM A METRE ABOVE HIS OWN HEAD.** "The fall animation
isn't working, he just flies around" was one number. `hipY` is an OFFSET from
the creature's stance taken from the clip's FIRST frame — right for every
clip that begins with him standing, and exactly wrong for a get-up, which
begins with him lying on his back. Measured in the game: `getUp` ran his hips
from the standing height to **2.44 m** — a metre above where he stands — and
snapped back the frame the clip ended. `HIP_ZERO_END` measures such a clip
from its LAST frame instead, so the rise starts on the floor (-0.84) and ends
at the stance, which is where the fall left him (-0.86). Measured after:
standing hips 1.34 and head 2.29; he goes over to hips 0.16 and **head 0.19**
on a floor at -0.07; he lies; he rises to 1.31 and 2.28. Exactly the clip.

**AND A HEADING IS A TURN, NOT A SNAP.** The other half of "he flies around",
and it came in with the routing: `S.route` starts from the nearest cell a
body FITS in, which when he is pressed against a pier is a cell back the way
he came — so the route's first waypoint could be BEHIND him and he spun to
face it. Measured: **48 degrees of heading in one frame**. Two fixes, and
both are about mass: the route skips any leading waypoint inside a stride,
because anything that close is already behind him; and `kind.turnMax` is
radians a second, a cap on how fast the thing can physically come round.
Measured after, over a three-minute fight: **5.0 degrees a frame, worst** —
and he still routes past the pier every time. A corner is rounded too rather
than turned, the aim blending toward the waypoint AFTER this one as he closes
on it, so a route reads as something with momentum walking a curve.

Measured at the end, hands-off at fighting range over three minutes: **39
swings and 40 damage a minute at 97 % connect, 98 % of contacts on screen at
0.31-0.55 m from the chest, still between swings 15 %, worst step 0.128 m,
worst turn 5 degrees a frame, worst tick 4.3 ms** — and crossing the nave
from his alcove he takes **eleven pews** with him and arrives in four
seconds.

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

**AND NOTHING HAD EVER SET A CREATURE'S HEIGHT DOWN THERE.** `restYInWater`
is the beach's; the knight was left at whatever y he was placed at, so the
step up to the dais went through his shins and he fought at the altar with
his boots in the stone. The floor is followed EVERY FRAME rather than inside
a movement branch — he is most often standing still, in a wind-up or a
recovery, at the moment he needs to be on the step — eased, with a floor
speed under it so a 0.6 m riser is crossed in a fifth of a second rather than
a third. Worst foot gap 0.66 m → **0.175**.

**AND THE CHAIN IS THE AGGRESSION.** `aggr` divides the between-swing
cooldown and at 3.7 that is already 0.02-0.10 s — saturated, and not what
limits his rate. What limits it is the swings' own lengths, and those are his
TELLS: this file has paid for shortening them before. A CHAINED swing has no
cooldown at all, so a deeper chain and a raised `chainP` on every attack is
the one lever that presses harder without making him less readable.
Measured: **41.2 swings and 43.2 damage a minute at 100 % connect**, against
37.6 and 38 before, with 98 % of contacts still on screen and the startups
untouched.

**AND A `git checkout` ON A FILE YOU HAVE NOT COMMITTED THROWS THE WORK
AWAY.** Reached for to undo one bad edit mid-session; it reverted `main.js`
to the last commit and took six unrelated fixes with it. They were all in the
transcript and were redone in two passes, but the rule is worth writing down:
in a session that edits one enormous file over hours, `git checkout <file>`
is not an undo, it is a discard of everything since the last commit.

**THE KNOCKDOWN SPUN BECAUSE A FALLING BODY HAS NO HEADING.** "His fall down
animations do not look like the animations I sent — he just spins around in
the air" was one line in the packer, and the reasoning behind it was wrong in
a way that is worth keeping. `ntar_moves.py` de-yaws a clip frame by frame —
it holds the hips' own forward axis at a constant azimuth — because the game
turns a creature toward the player every frame and a clip that also turns
fights it. That is right while the creature is STANDING. The moment it goes
over, the pelvis's +Z points at the CEILING, its horizontal part collapses
(measured on `knockOut`: 1.00 to 0.30), and the azimuth read off it is the
body TIPPING rather than the body turning. Correcting a turn that never
happened applies a world-Y rotation to a horizontal body, which is a roll
about its own length: a corpse swinging round like a compass needle.

Measured as the azimuth the body's long axis sweeps over the frames it is
horizontal — which is the thing you actually watch, "which way his head is
pointing":

| | knockOut | getUp |
|---|---|---|
| the source animation | -11 deg | -27 deg |
| de-yawed on the forward axis (shipped) | **+62** | -27 |
| de-yawed on the left-right axis | -38 | -35 |
| kept (now) | -11 | -27 |

Choosing a better AXIS is the obvious fix and it is not enough — the second
row is the pelvis's left-right axis, which does stay horizontal through a
fall (worst 0.73 against the forward axis's 0.30) and still injects 38
degrees. **There is no such thing as the heading of a body that is falling
over**, so `KEEP_YAW` names the clips that leave the vertical and they keep
their own root turn exactly as drawn. The axis choice stayed anyway, because
it is measured per clip and strictly better for everything that does stay
upright.

Three things the game had to learn with it:

- **THE HEADING IS SET ONCE, AT THE BLOW.** It costs nothing, because a
  creature on the ground is not being turned toward the player by anything —
  the `down` branch returns long before `turn()`.
- **AND TWO REELS ARE TWO FILES.** Left alone the rise begins lying in a
  different direction from the one the fall ended in and he snaps round on
  the floor between them. The only thing two prone poses can be matched on is
  the direction the BODY lies in, so the packer measures it at both ends of
  every clip (`az`, with how horizontal it is, since standing up the same
  number means nothing) and `mutKnockdown` turns the rise by the difference.
  Measured: the fall ends lying at -136 deg and the rise starts at +170, so
  the rise carries +54.
- **AND HE GOES WHERE THE REEL TAKES HIM.** `knock.slide` is a hand-set
  distance along the line the blow came in on — a fair guess for a clip whose
  travel nobody has, and wrong for one whose travel is in the file. Measured,
  `knockOut` carries him 1.41 m and mostly ACROSS that line. `slide: null`
  means walk the clip's own root motion, turned by the heading that clip is
  played on. The horizontal travel is still left out of the HIPS, because a
  gait's speed belongs to the game; a knockdown is a scripted beat and the
  reel is the authority.

Measured in the game, hips and head against the floor: he stands at 1.29 /
2.26, goes over to 0.16 / 0.26, lies still for a third of a second, and
rises to 1.30 / 2.28 — and the model's yaw does not move through the fall.
Rendered as a strip it is the Mixamo clip: rocked, off his feet, flat on his
back, rolled onto a knee, up.

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

**AND A PROJECTION IS NOT THE ANSWER WHEN THE MAP IS AN ATLAS.** The obvious
repair for a destroyed uv is the octopus ring's — sample the map triplanar
and blend by the normal — and it was built, measured and deleted. It works
only for a TILE. Drawing this church's own maps to a canvas settles it in one
look: `mur-bas_diffuse` is a grid of rounded panels with black gutters
between them, `colonne_diffuse` is a row of tall unwrapped strips. Projected
at the density the geometry implies the surface is nearly a flat colour
(1 tile per 47 m); projected at anything you can see, it draws the gutters as
bright and dark stripes. **Look at the map before deciding a projection can
stand in for a uv.**

**AND THE SOURCE SCANS ARE ON THE DESKTOP, NOT IN ~/Downloads.**
`~/Desktop/BEACHWALK ASSETS/` is where the owner keeps them; ~/Downloads is
cleared. And **the flags matter**: the cave repacked without `--yaw 180` came
out mirrored (x -1.41..16.45 became -16.45..1.41) and the way out of the apse
moved seven metres. The church is `--tex 2048` — 1024 is the resize too far
this file has already paid for once. `sips` is not enough for this packer;
PIL goes in a venv.

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

**AND `use` ON A HOLDABLE ITEM IS THE HOTBAR'S VERB — the captain's head's
own lesson, broken again one item along.** The wheelhouse key is `holdable`,
so the pack's second button says HOLD and the hotbar's digit means hold; both
call `use`, and `use` opened the examine screen. The one thing you could not
do with the key you had just pulled out of a dead man's mouth was hold it.

**AND THE KEY COMES OUT OF THE HEAD IN YOUR HAND.** The examine screen was
the only door, which is a door you have to know about: you are standing there
holding a head with a key in its teeth and the obvious thing to do is reach
for it. `onPull` is the shell's own `onListen` door — a click, or E — and it
is a GETTER, so once the key is out the head is just a head. **And what you
hold is a CLONE**, so a change to the world object does not reach it and the
key stayed in the teeth of the head in your fist: `holdable` keeps its
builder (`vm.userData.make`) and clears the group first, so anything that
changes an object under a held copy can ask for it again.

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

**`SWING_GAP` IS WALL-CLOCK TIME, AND THE HARNESS STEPS FASTER THAN THE
CLOCK.** A hundred `__bw.step` calls run in a couple of milliseconds, so a
gap of 140 ms between swings is hundreds of stepped frames — a test that
clicks, steps fifty frames and clicks again finds the second click queued and
never fired, and reads as "swings stopped working". They had not: the gap
had not elapsed in REAL time. Any test of anything gated on
`performance.now()` has to `await` the gap between its beats.

**NOTHING FIRES FROM THE MIDDLE OF A SWING.** The first queue was
responsive and it was an exploit: a click in the recovery started the return
from wherever the blade happened to be, so mashing the button produced a
flurry of half-swings that never left the right side of the screen, each one
landing for full damage. A press now does one of two things and nothing
else — it queues the RETURN, which fires only at the forehand's
follow-through while the blade is still on the left (before 0.80 of the
swing), or it queues a fresh FOREHAND, which fires only once the current
swing has ended and `SWING_GAP` has passed. Every swing runs its full width,
and the fastest rhythm the button can produce is one whole swing per swing.
The swing itself was the last exploit: at `swingK` 0.9 a light cut was
0.2 s long, so even one-whole-swing-per-swing was thirteen swings in two and
a half seconds.

**THE CADENCE IS THE RECOVERY, NOT A CLOCK.** The first answer slowed the
cut itself (`swingK` 1.55) and put a wall-clock gap after it, and the owner
called the sword slow — because it was: a click in the gap did nothing for
up to half a second, which is the one thing a click must never do. The cut
is back at 0.2 s. What limits the rate now is `recoverK`: a blade's
RECOVERY runs at five times the length it would otherwise take (the
return's nine), so the blade FINISHES the cut — `REC_HOLD`, a third of the
recovery in which it drifts a few per cent — and then eases home, and the
next forehand leaves the frame it arrives. Every click is answered, at once
from rest or the moment the blade is home; the rhythm is set by a motion you
can watch rather than a timer you cannot. Measured: eight swings in 3.3 s
under a mashed button, in pairs. **And the held beat is the return's
window**: a click anywhere up to `RETURN_LATEST` (0.82, about a sixth of
the way home) throws the return from where the blade is, so a double click
does not have to be a fast one.

**THE LAST STRETCH OF A RECOVERY IS THE NEXT SWING'S WIND-UP.** A click
while the blade was drifting home waited for it to arrive, and the owner
felt the wait. A forehand asked for past `FORE_EARLY` (0.94 — the last
sixth of the recovery) leaves from where the blade IS: the haul mixes from
the live pose (`_poseF`), not from rest, which from rest is exactly the
same haul it always was. The cadence does not change (nine swings in
3.3 s under a mashed button, in pairs); the dead frames at the end of a
combination are gone.

**A HEAVY IS QUICK WHERE IT IS SEEN AND LONG WHERE IT IS FELT.** Stretching
the whole charged swing (`heavyK`, 1.75x) made it heavy by making it SLOW,
which is not the same thing — the owner watched the blade wallow across the
frame. A sword's weight is in the hold you spent charging it and in what
happens after the edge lands, never in the edge's own travel, which on a
real cut is the fastest part of the move. `bladeRate` runs the charge at
nearly the light cut's pace through the strike (a quarter longer at full,
just enough to read), carries a third again through the follow-through, and
comes home FASTER than a light because it has already paid up front. 34
frames became 22, with the cut landing six frames after the release. The
light's own recovery came down with `recoverK` 5.0 to 4.0: 30 frames to 25.

**A HIGHLIGHT ON AN EDGE IS AN EDGE, NOT A STAR.** The glint was a
symmetrical eight-pointed sparkle pinned to the blade, and a symmetrical
thing on a sword reads as a decal stuck on it: the shape says nothing about
what is catching the light. It is anamorphic now — a hot core, a long thin
streak either side of it and a much shorter pair across — and the sprite is
TURNED to the edge's screen direction every frame, so the long axis lies on
the blade's outline at any angle the swing holds it. It is also sized off
the edge's own length rather than a constant. And it RUNS THE TOOL'S OWN
EDGE: it used to run between `trailTip` and `trailRoot`, which are the two
ends of the trail's ribbon — the width of a shovel's lip, and on the katana
the last hand's breadth of the blade — so on a sword the light travelled
four inches and sat there. A tool may declare `glintSpan`, how far back up
its blade the edge runs from the point.

**A CLICK IS NEVER BANKED.** Three clicks were three swings: the third
fired on its own after the recovery, from a press made half a second
earlier, and a sword that swings when you did not just ask it to is one you
cannot trust. The forehand queue is gone. A press from rest swings; inside
the first cut's window it chains the return; with the blade most of the way
home (`FORE_EARLY`) it swings at once from where the blade is; anything
else is DROPPED. Measured: three clicks, two swings.

**THE BLADE FACES THE ENEMY THROUGH THE STRIKE.** The solved cuts carried
the blade pointing mostly UP (view-space direction y 0.85, z -0.5) and swept
it across — a pole carried past a man. `katFace` pitches the blade forward
about the camera's own axis (`KAT_FACE`, 24°) and takes HALF of the
point's drift back by moving the arm (`KAT_FACE_K`): all of it back put
the hand two frame-heights off the bottom-left corner, because the hand is
nearer the lens than the point. And it is pitched only from the cock to just
past the mark (`katFaceW`) — where the steel is going through something —
and brought back up by the wrist over the follow-through. `landBlade` runs
AFTER the grip and the tilt now, so the lip goes on the aim with the tilt in
it. Measured at the mark: z -0.82 against -0.53, point on the same line.

**AND THE FOLLOW-THROUGH POSES PARKED THE SWORD OFF THE SCREEN.** Every
check of the cut had measured the POINT, and the point was at the left edge;
nobody had measured the hand, which sat at (-1.07, -2.75) — two and a half
frame-heights below the picture — so for the held beat at the end of every
cut the sword was a sliver in the corner, and for the return it was off the
right the same way. Swept in the pane (roll, lift, push, side of the third
pose of each table): the hand comes UP and the arm goes BACK (`push` -0.32,
which is what shrinks a hand that is close to the lens), and the roll is
turned so the blade leans out to the tip. Forehand through: point
(-0.84, -0.03), hand (-0.32, -0.77). Return: (0.89, -0.02) / (0.74, -0.81).
The heavy's through the same way. MEASURE THE HAND AS WELL AS THE POINT.

**A SWORD'S HEAVY HAS WEIGHT.** `DIG_DUR` is 0.4 (the "0.44 s" in older
notes is stale), so at the cut's own timing a full charge went from release
to landing in 0.13 s and was home in a third of a second — a flinch, and
quicker than the light cut it outclasses. `heavyK` stretches a blade's
charge by its power (1.75x at full): 34 frames now against 19, the hang at
the top visible, and it comes home quicker than a light (`recoverK` scaled
by 1 - 0.65 P) because it has already paid up front.

**THE CASE SAYS SO WHEN IT UNLOCKS.** A locked case on a desk you walked
past is furniture; the moment he is down it has to become a thing to go
to. A lamp on the front goes from dim red to a green blink, a glint
breathes over the lid, the latches are heard a second after he falls, and
"Open the case" is on it. **And an interactable's mesh list is taken ONCE,
at registration**: the case was registered after the scan had been put
inside it, so `updateHover` raycast the shovel's hundred thousand triangles
every frame near the desk — "the shovel box is lagging". Register the case
before the tool goes in.

**A BLADE SETTLES; IT DOES NOT BOUNCE.** Two things were the "flinch"
coming back to guard. `easeOutBack`'s overshoot threw the point two
frame-widths off the right edge and back on every recovery — a blade eases
in and out instead. And the GRIP was blended between poses as EULER ANGLES:
the return's grip is the forehand's turned half a turn about the blade, and
an Euler lerp from that back to the carry swung the whole sword through the
camera on its way home (the point measured 8.6 frame-widths out). The grips
are slerped now, and a blade's grip starts back to the carry over the last
stretch of the recovery (`SL_GRIP_HOME`) so it lands with the arm rather
than twitching after the arm has stopped.

**AND A SWING CAN BE LEFT.** The guard takes over from a cut at any point
(`cancelSwing`: a defence, and a cut abandoned before it lands is a cut you
did not make); the charge takes over from one that has LANDED
(`swingLanded`), so holding the button through a recovery goes straight to
the heavy instead of waiting for the blade to drift home — and not from one
that has not, so the button cannot feint a free cancel out of every strike.
The haul-back blends in from wherever the hand was (`_windFrom`, `WIND_IN`)
rather than snapping to the cock pose, which it had always done, from rest
as well.
And a click is ALWAYS the forehand: the 950 ms timing window that let a
click after the blade had come home fire a backhand from the right is gone;
the return is reached by chaining and nowhere else.

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

**A THRUST IS EXACT, AND IT DOES NOT REACH THE GROUND.** `landBlade` is
turned down to a third for a blade so a sweep is not thrown about by it, and
that third left the stab's point short and beside what you were looking at;
a stab is a point going to a point and gets the full correction. And
`aimLand` counts the SAND: aimed a little down, the aim ray meets the beach
three metres out and the point was being put there — the stab into the
ground the owner saw. Past the thrust's own reach (`STAB_REACH`) there is
nothing to meet and the point goes to the end of the arm.

**THE SECOND CLICK IS KEPT, NOT DROPPED.** `startDig` refuses while a swing
is running, so a double click was one cut and a wasted press, and the return
stroke only came if you clicked again in the dead time after the recovery —
which is why the combination felt like it needed luck. `queuedSwing`
remembers a click that lands while the forehand is in the air and
`chainSwing` fires the return the instant the forehand reaches its
follow-through, FROM WHEREVER THE BLADE IS (the live `_pose`, the way a
charged release leaves from the pose you wound into), straight into its own
strike; a click that lands in the recovery fires at once. One click, one
cut. Two, both. Measured: the point runs out to -1.58 on the forehand and
comes straight back through -0.44, 0.96, 1.30 on the return, and a single
click goes forehand → carry with nothing after it.

**THE BODY REMEMBERS EVERY CUT.** A creature that had taken six slashes
looked exactly like one that had taken none. `woundMutant` counts every blow
it survives (`st.cuts`, a blade counting double) and draws the count on the
MODEL: the per-copy materials `dressMutant` already clones (now kept on
`u.mats`) are pulled toward the colour of opened flesh — the colour
multiplies the map, so it darkens the pale sets and bloodies the red — with
a wet emissive lift, a chip of flesh comes off every other cut, and at the
kill the count feeds the dismemberment odds. Two traps: **`lerp` on a Color
works in LINEAR space**, so a pull that looks strong on paper is gentle on
screen and needs to be pushed further than you think (six cuts takes white to
b7b0b0); and **`flashMats` restores the emissive it read a moment ago**, so a
wound written after the flash was undone the frame the flash ended — if a
flash is live, the wound goes into the flash's restore value instead.

**A GIB LIES ALONG X OR IT STANDS UP WHEN IT LANDS.** `updateGibs` puts
every gib to rest with its rotation zeroed, which lays a limb flat because a
limb is baked along X — and stood every one of the coat stand's cylinders
bolt upright, because a cylinder is built along Y, and the splinters too,
because a box that is tall is tall. That was "it looks fake": a broken coat
stand whose legs, hooks and splinters all landed on their ends like candles.
Every long piece gets its geometry turned onto X before it is thrown, with
the quarter turn put back on the mesh so it leaves from the orientation it
was drawn in. Measured after: 34 pieces, 34 settled, 0 standing.

**A THRUST'S WIND-UP HAS TO BE BIG ON SCREEN.** Hauling the hand back "past
the hip" by the numbers put it off the bottom-right corner, and what was
left in the picture was a sliver of blade — a powerful wind-up that nobody
could see. The tsuka is kept large in the lower right of the frame, the blade
level from there toward the centre with the point parked just right of the
crosshair, and the drive does the rest: 0.6 m of travel, the lens punched and
the knees giving when it lands.

**A CUT LIES IN THE SCREEN PLANE; A CUT THAT HITS SOMEBODY DOES NOT.** The
rule this file has carried since the Military Shovel learned to cut is that
tilting the blade toward the camera turns a cut into a stab, and it is still
true — but held perfectly flat the point never goes anywhere near the thing
you are swinging at, and the owner's word for that was that it does not look
like it is slashing anyone. The blade is angled about a third of a right
angle INTO the screen through the whole stroke now (view-space direction z of
-0.52, measured every frame): still sweeping across, still side-on enough to
read as an edge, with the point out where the enemy is rather than level with
your own nose. It gets its own grip for the cut, solved with the stroke.

**AND THE COMBINATION IS TWO STROKES, EACH SOLVED WHOLE.** The forehand runs
right to left and the return runs left to right from where the forehand
finished — both horizontal, both straight, both the same speed, so a chain is
a rhythm you can hold rather than something that accelerates away from you.
Mirroring the first to get the second is the obvious thing and it does not
work (see `mirrorSide`); the return is solved in its own right against its own
line, which is the only way to know both ends of it are on the screen.
Measured: the forehand's point runs 0.87, 0.86, 0.76, 0.30, -0.40, -1.00 and
the return's -0.91, -0.92, -0.77, -0.25, 0.39, 0.98.

**THE SWORD'S HEAVY IS A THRUST, NOT A SLAM.** Holding sprint into a charge
turns a shovel into an overhead; on a katana the owner asked for the point
driven straight at what you are looking at with the tsuka coming back toward
your own face. It takes the overhead's slot in the pose system and shares
nothing else with it: its own grip, its own draw, its own drive, and it is
held through the WIND as well, because you have to be able to see what you
are charging. **And it has to be solved so you can SEE it**: pointed dead down
the view axis a thrust is a dot, and the first solve put the blade within
fifteen degrees of the camera's own line and the sword all but vanished on
the frame it landed — the same complaint as the overhead it replaced. The
draw holds it 48° off the axis and it turns to 32° and drives 32 cm forward
as it lands, the point finishing on the crosshair. The tsuka is kept half a
metre out, because a handle that comes at your face is not a wind-up, it is a
camera clip.

**AND THE AUTOSAVE FIRES IN DEV MODE.** Dev mode is "no deaths, no cutscenes";
it was never meant to be "no autosave", and skipping it meant the one piece of
feedback that says the walk has been remembered never appeared for the person
who spends the most time walking it. A save you did not ask for is only any
use if you are told it happened.

**AND THEN THE REEL'S OWN MOVE SET TURNED OUT TO BE UNREADABLE IN A GAME.**
Copying the animation faithfully produced a cross-body draw whose point left
the frame at the cock and came back somewhere else, and the owner's verdict
was "the blade moves all over the place ... I need a clean swing across the
screen". What a swing has to do FIRST is be legible, and legibility is one
property: THE POINT TRAVELS IN A STRAIGHT LINE. The shovel's cut has run
corner to corner through the crosshair since it was laid out and nobody has
ever complained about it. So the katana's point runs (0.86, 0.40) →
(-0.10, -0.02) → (-1.08, -0.42), right to left, the width of the picture,
and a charge runs the same line from (0.82, 0.94) — cocked up toward the top
right out of the idle, so a held heavy reads as a sword about to be swung
rather than as a guard. Faithful to a reference beats invented; legible beats
faithful.

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

**A MIRRORED STROKE IS NOT A MIRRORED PICTURE.** The obvious way to build the
reel's combination is to flip the second hit, and `mirrorSide` exists to do
it — but it reflects the HAND about the middle of the frame, which is a true
mirror only if the arm is symmetric about that line, and it is not: the
shoulder is fixed off to the right. Measured, the mirrored follow-through put
the point at x = -3.26, three frame-widths off the left edge. So the
combination lives in the LINE instead: three hits, all sweeping the same way,
the first through the middle, the second rising through the upper body, the
third lower, longer and quicker. Three visibly different swings and not one
of them can surprise you.

**AND `landBlade` HAS TO BE TURNED DOWN FOR A SWORD.** It exists so a dig
lands where you aimed, and it does that by TRANSLATING THE WHOLE ARM until
the lip sits on the point — right for a spade, whose stroke is short and
whose line nobody reads, and wrong for a blade whose whole appeal is the
sweep. At full weight it was dragging the authored line apart mid-swing. A
third of the correction, on a short leash, keeps the blade honest about where
you were looking without letting it throw the swing around.

**A CHECKPOINT BELONGS TO THE GAME THAT MADE IT.** It lives in localStorage so
a death can reload the page and still find it, and localStorage outlives the
tab — so refreshing the browser left "restart from last checkpoint" lit up
with a save from a game the player had already walked away from. The only
arrival that legitimately carries one is the one the game asked for
(`reloadInto('checkpoint')`, off a death or off the menu); every other way in
is a new game and the old save goes with the old game. One line at load, next
to where `loadMode` is read.

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
the shovel is the katana's whole vocabulary). It spawns under the cliff
past the drain, where the Military Shovel used to lie.

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

**THE RIPOSTE IS A MULTIPLIER, AND THE BEAT WAS TAKEN BACK OUT.** A version
of this file argued the opposite — that a parry buying double damage was
"a number", and that what Sekiro and Lies of P have is a moment the game
throws for you — so the blow on a stunned man was followed, without a
press, by an automatic drive of the blade into him. The owner's verdict on
playing it: take it out, and he feels easier now, which he should not.
Both halves were true. A follow-up that plays itself takes the hands in
the middle of an exchange, which is the one thing a fight must not do; and
three free points off his bar every parry is a straight difficulty cut on
the one fight in the game. What a parry buys is a swing YOU throw, worth
two. `riposteT` and its gates in `attackAction`, `startWind` and
`katStabbing` are gone; `hurtMutant` keeps the doubling and the prompt.

**AND A PUNISH WINDOW IS A RATIO, NOT A LENGTH.** The same pass separated
his recoveries by a factor of five — 0.26 s on the quick side swing against
1.10 on the held overhead and 1.30 on the lunge — and the read that buys
(which swing to answer) is worth having and is kept. But it bought it by
making the two slow ones very long, and a recovery is DEAD TIME: a second
and a third of him standing there after every held overhead is two free
swings, so the fight got slower and easier at the same time as it got more
legible. They are pulled back in (0.22 / 0.50 / 0.82 / 0.95) and `aggr`
goes to 2.20; the ratio, which is the part you play against, is nearly
untouched. Measured over a minute at fighting range against a passive
healed player: 44 swings and 34 damage before, 48 and 40 after — and three
fewer points off him on every parry. **If a change makes something more
readable and less dangerous at once, price the second half.**
And `guardTick`: every block already took a third of the
bar and nothing said so until the guard dropped; the bar flashes white on
the blow now (`#stamina.hit`, re-triggered by removing and re-adding the
class with a reflow between), so the third that went is a thing you watched
go.

**A FOUND THING ON A DARK FLOOR NEEDS A POOL OF LIGHT — AND A LIFT IS NOT A
SPOTLIGHT.** When the case spills, the shovel's glint is moved over its
middle, its `shinies` entry is given the scan's materials to lift (they
were not there when the shine was added — the scan lands over the network,
so `mats` was empty and the lift had nothing to lift), and an additive halo
disc is laid on the floor under it, removed when it is taken. The first
pass then drove the lift itself at strength 3.4 and lift 1.6, whose product
is 5.4 — over one on every emissive channel — and the tool came out of the
case as a flat WHITE cut-out lying among the planks, which is the exact
failure this file already warns about twice for a dark textured scan. The
big glint and the halo are what say "found thing"; the metal only has to be
lifted enough to read as olive drab rather than as a hole. 2.6 and 0.30.

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

**HE DIGS IN AT HALF HEALTH, AND THE MASK STAYS ON.** A boss with one move
set is solved once. Halfway through his health he stops, roars through the
mask and comes back harder — `aggr` 2.85, more feints, longer chains — so
the fight you have learned turns out to have been the first half of it. It is
an OPENING, not a cutscene: he is stopped and his guard is down for a second
and a half and you keep your hands the whole time, which makes it the prize
for getting him to half rather than the game stopping the fight to show you
something. His STARTUPS are untouched: the tells are what keep him fair and
this file has already paid once for making them readable.

**AND A WHOLE HEAD UNDER THAT MASK WAS BUILT AND CUT. DO NOT PUT ONE BACK.**
For several passes the mask came off at half health and what was under it was
tales' photoscanned bust, fitted to his skeleton in Blender against the eye
positions measured off both models' EYEBALL MESHES, its neck morphed onto the
single ring where his own was carved out of the index, skinned by
nearest-neighbour transfer from the head it replaced, its skin rebuilt from
the statistics of his own chest (his 88/12 against the bust's 120/40 — a
third too bright with three times the contrast of a game skin), and the
shading lifted out of its albedo and turned into a normal map so his creases
were lit rather than painted. Every step of that worked and every one was
measured on screen — his neck rendered (95, 66, 51) against his chest's
(98, 67, 56). It is all deleted. **A face grafted onto somebody else's body
reads as a face grafted onto somebody else's body**, and no amount of
matching statistics changes that; the owner said so of three different
versions, and the last word was to take it off and keep the mask on at all
times. THE MAN IN THE GAS MASK IS THE CHARACTER — a boss whose face you never
see is not a boss missing a face, and the mask is the better design because
it is the one this character already was. Same lesson as the scanned
lighthouse and the scanned katana, in a place nobody expected it.

Two things learned in there are general and worth keeping:

- **A NORMAL MAP WITHOUT TANGENTS SPLITS A FACE IN HALF.** three falls back
  to screen-space derivatives when a mesh carries no TANGENT attribute, and
  across a uv seam — which on a head runs straight down the middle of the
  face — the derived tangent flips sign: one cheek lit, the other not, on a
  hard vertical line. Export tangents; the exporter is the only place that
  still has the uv layout and the smoothing together.
- **DO NOT SMOOTH GEOMETRY TO FIX A TEXTURE PROBLEM.** A pass that relaxed a
  low poly to take the "leather" out of it took the brow, the nose and the
  cheekbones with it and the head came back a mannequin. The sculpt is the
  face; what needed removing was what was painted on top of it.

**SCP-096, IN FRONT OF THE LIGHTHOUSE — AND ALMOST NONE OF HIM IS NEW
CODE.** Sealife Fan 3's "SCP-096 Reanimated" (`assets/scp096.glb`), 6.3k
triangles, 68 joints and THIRTY-SEVEN CLIPS — the first asset in this game
that arrived with a whole fight already animated. He is a row in
`MUT_KINDS`, so the tell, the commit, the poise pool, the parry window, the
riposte, the chain, the feint, the token and the aimed blow are all his by
construction. He sits on the lane with his back to you and his face in his
hands, and NOTHING HAPPENS UNTIL YOU LOOK AT HIM (`scpLookedAt`: the middle
of the screen on him, inside thirty metres) — which is the creature's own
rule and also the best trigger this game has, because the fight starts on
something the player DID rather than on a line across the sand.

**THE FLAGS ARE INTENTIONS NOW, NOT `kind.human`.** Ten places asked "is he
a man" to mean ten different things, and the day a second boss arrived that
was not a man the word stopped meaning anything. `lit` is the bunker's
lamps, `aimed` is the correction that puts the blow on your chest, `reacts`
is breaking his own startup to answer a charge, `talks` is having a
conversation to breathe through, `poise` is the pool, `bossDeath` is the
boss's own dismemberment rates. A flag named for what it DOES can be given
to the next thing that needs it.

Six things this cost, and five of them are the same lesson this file has
already learned somewhere else:

- **ROOT MOTION, AGAIN, AND IT LOOKED LIKE A TUNING PROBLEM.** His
  `attackjump` carries THIRTEEN UNITS of forward travel on the armature root
  — twelve metres — so the leap threw his whole skeleton across the ridge,
  the aim dutifully corrected an arm that was already somewhere else, and
  the blow measured 2.31 m from your chest at every range the trial tried
  while the other three landed inside 0.3. `kind.flatten` names the roots
  and holds their sideways and forward curves — and **the hold value is the
  REST POSE, not the clip's first key**: this clip starts thirteen units
  BEHIND himself and arrives at rest, so pinning key zero parked him twelve
  metres back up the lane and measured *worse* than the bug.
- **A WINDOW CUT OUT OF A CLIP MUST KEEP EVERY CHANNEL.** `attack1` is six
  seconds of him mauling something on the floor with two real strikes inside
  it and dead time either side; cut into its two blows it is half his move
  set. three's `AnimationUtils.subclip` drops every track with no key in the
  window — 38 of 122 bones — so the swing came out wearing the walk cycle's
  shoulders. `sliceClip` RESAMPLES every track through its own interpolant
  instead, so all of them survive by construction.
- **THE WHOLE LIMB IS THE HITBOX, NOT THE LAST HAND'S BREADTH OF IT.**
  `blowLands` (was `dealerBarHit`) sampled the weapon alone — grip to tip —
  and that is wrong for exactly the swing it most needs to be right for: the
  aim puts the TIP on your chest, and when he is nearer than his own arm is
  long the tip cannot BE there, so it goes past you and what is actually in
  your body is his forearm. It sweeps shoulder → elbow → wrist → claw now.
  A kind with a `tip` bone carries its reach in the rig; one with a weapon
  carries `barLen`, and `aimTip` is the one place either question is asked,
  which is the only reason the picture and the blow cannot come apart.
- **A REACH SHORTER THAN THE ARM IS A CREATURE THAT NEVER SWINGS.** His
  numbers were written at the Dealer's — 1.75 to 2.40, a man with a 0.85 m
  crowbar — and he stood in front of the player for a whole minute and swung
  thirteen times. The fight AI holds its range at about `reach`
  (`flankDir` rings him at `reach - 0.3`), so a creature whose arms are
  LONGER than the number in the table orbits outside its own swing and
  `near` is never true. Measured, then set to what the aim actually lands:
  2.80–3.30, claw inside 0.3 m of your chest from 1.4 m out to 3.2.
- **THE GROUND IS NOT y = 0, AND `bunkerFloorAt` IS THE QUESTION.** It was
  named for the bunker because the bunker was the first place with a second
  ground; it is the general question, and blood, gibs, thrown props, puffs
  and every particle of the Verlet ragdoll all ask it. Seven metres up a
  headland the beach's own zero is wrong by seven metres — his corpse fell
  through the hill and settled on the sand under it. It answers `headlandAt`
  now, which is 0 everywhere off the ridge, so it only speaks where there is
  something to say.
- **AND THE STAND-OFF IS ABOUT WHERE HE IS, NOT WHAT KIND HE IS.**
  `if (inBunker && !u.kind.solo)` meant "everything except the one who lives
  down there", which was true while the only solo creature WAS him. This one
  is solo too and follows you anywhere: wake him, walk nine hundred metres
  back and go down the hatch, and he would have stood on the sand over the
  roof swinging through forty metres of earth — the crabs' own bug wearing a
  new creature. A body is in the fight if it is in the same PLACE as you.

**AND A THING THAT FOLLOWS YOU IS CULLED BY WHERE IT IS.** Every `farProps`
entry is scenery keyed to the Z it was built at, which is right for a pier
and catastrophic for a creature that chases: run two hundred metres and he
was switched off at his spawn's distance and kept coming, invisible. `live`
reads the object instead.

**AND THERE IS NO ARENA.** The first version penned him thirty metres from
his mark and forty seconds of holding S walked away from the last boss in
the game — measured: 226 m, one swing thrown, four damage taken. He is
faster than a sprint (`speedK` 1.42 on 4.6 against your 5.71) and he does
not stop. Measured after: standing still, 26 swings and 29 damage a minute;
walking backwards for forty seconds, 11 damage; sprinting away, he holds
6 m and never loses you. **A boss you can walk away from is scenery.**

**AND A PALE CREATURE IS NOT A DARK ONE.** The pack's material — a gamma
lift, a fifth of emissive and a cold rim — is for two metres of dark flesh
that renders as a hole without help. His albedo is chalk to begin with and
the same treatment made him a white cut-out on a black ridge, which is the
Military Shovel's failure in a new place. `tint` multiplies the map down,
`emis` is the lift, `rim` the Fresnel, and the pack's values are the
defaults so nothing on the beach moved. Measured on the screen: his lit side
reads 72 against the lane's 62 — a body lighter than the ground it stands
on, which is what lurking looks like.

**AND THEN HE HAD TO BECOME A SOULS BOSS.** The first build fought
correctly and read as a creature swinging near you; the owner asked for
swings you can see coming, hands that actually connect, and something much
harder and crazier. Five things, and the first one is the one that made the
other four possible:

- **A TELL IS MEASURED IN SECONDS OF VISIBLE APPROACH, NOT IN `wind`.** The
  honest number is how long the claw is travelling in at you before it
  arrives, and it is what a player actually reads. Measured: 0.47 / 0.32 /
  1.05 / **0.23** against a 0.20 s parry window — the grab was a coin toss.
  Every startup is longer now and the shortest is 0.33; the pounce is 1.15.
  **He is made harder somewhere else entirely**, which is the Dealer's own
  rage note said plainly: the startups are what keep a boss fair, and
  aggression, chains and a gap-closer are where difficulty is supposed to
  come from.
- **A COMBO YOU CANNOT HOLD IS A COMBO YOU CANNOT BLOCK.** `blockMutant`
  takes `BLOCK_COST * 1.35 * reachK` — 0.46 of the bar per blow, which is
  TWO AND A FIFTH BLOWS to an empty bar. A boss who throws four-hit strings
  is then a boss whose strings break your guard in the middle and you eat
  the rest, which is the whole of "not smooth to block". `kind.blockCost`
  and per-swing `guardK` are the two knobs: an ordinary claw is 0.26 of the
  bar and the pounce is 0.55, so you hold a string and then you have to do
  something else. Measured over a minute of holding the guard: phase one 21
  blocked and 8 through, phase two 10 blocked and 20 through.
- **A POUNCE THAT WALKS ITS OWN WIND-UP IN IS NOT A JUMP.** The fight AI
  closes through every startup at two thirds of a run — the pack's own
  answer to "I back up and never get hit" — so he arrived at the edge of his
  reach before he had left the ground and then "jumped" the last metre.
  `hold` keeps him where he is for the whole startup: he stops, rears, and
  crosses the ground all at once. **And the travel has to be FINISHED by the
  contact frame**, not started at it: run from the strike onward he was
  still 3.07 m away when the claws came down and missed by 1.48. `LEAP_AIR`
  is the flight, in the last of the coil. **And its `reach` must be inside
  what it can actually cross** — at 4.20 against a 3.6 m leap he threw it
  from ranges he could not close and his signature move whiffed.
- **THE ARM THAT IS SWINGING IS THE ARM THAT GETS AIMED.** A man with a
  crowbar has one and there is nothing to choose; a thing that mauls with
  both has two, and correcting the right shoulder on a swing the left claw
  is leading puts the wrong hand on your chest. `aimLimb` takes whichever
  claw is nearer. With that and `kind.aimK` (a shoulder on a two-metre arm
  may reach further round than a man turning into a bar swing) every swing
  now lands inside 0.15 m of the chest at every range from 1.6 to 3.4 m.
- **HALF HIS HEALTH, AND HE IS NOT THE SAME THING AFTERWARDS.** The single
  most useful thing a boss can have: it turns one fight you solve once into
  two and it tells you, with a noise you cannot miss, that you are winning
  and that it is about to get worse. It is an OPENING and not a cutscene —
  he is stopped and wide open for two seconds and you keep your hands. What
  changes is everything between the swings and nothing about the tells.
  **And turning the busy-ness dials bought almost nothing on their own**:
  aggression up and cooldowns down took him from 22 swings a minute to 13,
  because the moves he now favoured were his two slowest and each threw him
  past you and cost him the ground back. What makes a boss relentless is
  that a swing leads STRAIGHT into another swing, so the CHAIN
  probabilities go up and the pounce — which chained into nothing in the
  first half — comes down and keeps going.

Measured at the end, against a passive player at fighting range: phase one
43 swings and 40 damage a minute, phase two 47 and 41. The Dealer is 48 and
40, and this one also has a move that takes two of your four.

**AND THEN HE STOOD THERE AND DID NOT FIGHT, AND EVERY MEASUREMENT I HAD
SAID HE DID.** The owner played it and got a boss that walked in circles.
Forty-three swings a minute, measured, three times over — and all three
measurements were worthless for the same reason: each one **force-fed him
state before it counted anything**. They set `cool`, cleared `feint`, reset
`hp`, and above all TELEPORTED HIM TO THREE METRES in front of the player
before every sample. A test that puts the creature where it wants it cannot
find the case where the creature cannot get there itself. The honest test is
hands-off: wake it the way the player does and then touch nothing but the
heal for three minutes. First run of that: **thirty-two seconds without a
swing.**

**`near` WAS ABOUT THE LAST SWING, AND THE ORBIT IS ABOUT THE LAST SWING
TOO.** That is the whole bug, and it is a feedback loop rather than a number
being wrong. `near = dist <= A.reach` uses whatever swing it happens to be
holding; `flankDir` rings it at `A.reach - 0.3` off the SAME swing; and the
separation and the circling put the equilibrium orbit a little outside that.
So a creature whose last swing was its SHORTEST settles into a circle just
beyond its own reach, is never `near`, never enters the branch that picks a
swing, and therefore never gets a different reach to be measured against.
Traced: orbiting between 2.80 and 3.03 m holding a 2.80 m swing, walking
sideways, for half a minute at a time.

Two fixes, and they belong to every creature and not just to him:

- **Being in range is a question about the CREATURE, not about the last
  thing it threw.** `u.maxReach` is the longest swing it owns, worked out
  once at build, and `near` and the token hand-out both ask that.
- **And the draw is over the swings that can actually reach you.** Anything
  whose reach falls short of the current distance is out of the hat, so it
  cannot roll its shortest swing at three metres, throw it at the air and
  fall back into the same orbit. If nothing can reach it takes the longest
  and closes the last of the ground with that swing's own lunge.

Measured after, hands-off, five minutes, nothing touched: **207 swings (41 a
minute), 189 damage (38 a minute), worst gap 3.9 s.** Before: 36 swings and
a 32-second stall. The pack and the Dealer both still fight — 27 swings a
minute between the three of them, and the Dealer's four all still land.

**RAISING THE REACHES MOVED THIS STALL ONCE ALREADY AND I CALLED IT FIXED.**
The first time he would not swing, the answer was that his reaches were the
Dealer's and shorter than his own arms — true, and raising them made him
attack. It did not remove the loop, it just moved the orbit to a distance
where the numbers happened to line up, and the next change to his timings put
it back. **If a fix makes a symptom go away without naming the mechanism,
expect it back.**

**AND A TRIGGER THAT CAN BE MISSED IS A BOSS THAT LOOKS BROKEN.** Looking at
him is what wakes him and it is the whole of what he is — but from the
outside, a creature sitting on the lane that has not noticed you is
indistinguishable from one that is not working. `SCP_HEAR` is nine metres:
that close he notices you whatever you are looking at, so the fight always
happens, and the cone is how you choose to start it early and on purpose.

**AND THE PREVIEW RUNS WHILE YOU ARE TYPING.** Every one of these tests ended
with a live fight and no healing, and the twenty seconds it takes to compose
the next tool call is twenty seconds of the boss hitting a player who cannot
be healed — so the player died, `playerDied` reloaded the page, and the next
call measured a module that had been rebuilt from scratch with the creature
asleep. That is what "he went back to sleep between calls" was, and it wasted
three rounds of debugging. Freeze rAF at the top of any measurement, not just
for stills.

**AND `press` IS HOW OFTEN IT SWINGS WHEN IT COULD.** 0.62 is the pack's and
it is right for three creatures taking turns — two of them should be circling
at any moment or there is nothing to read. A boss fighting you alone has
nobody to take turns with, and at the pack's number he spent two fifths of
every opening walking sideways: twelve swings in forty-five seconds while the
arithmetic of his own timings allowed thirty-six.

**AND A CHAIN MUST NAME A SWING THE CREATURE OWNS.** `makeMutant` nulls a
chain the kind does not have — but `swingOf` falls back to the SHARED table
when a unit is holding a swing that is not in its own, and the shared entry's
chain was never nulled. `u.atk[A.chain].wind` then threw inside `animate`,
which is the whole game once a frame for as long as the state lasts. It is
the same trap `swingOf` itself was written for, one line further down.

**AND A SHRIEK IS NOT A ROAR AN OCTAVE UP.** A bellow is a big animal moving
a lot of air and it is carried by the SUB; transposing it up produced a
small angry cow. The `shriek` throat is two detuned sawtooths a fifth apart
(nothing that screams is in tune), a 38 Hz ragged tremolo, a formant
bandpass at 1.5 kHz where a human scream lives, and a band-limited tear over
the top — no broad hiss anywhere, because the shell already paid for that.
`sfxScpScream` is three of those a beat apart so it seems to be getting
worse rather than being loud at the start. Measured on the SFX bus: the
first build was 88 % below 300 Hz and peaked at 47, which is the sub being
the sound instead of the floor; it is 46 % in the 1–3 kHz formant now.

**A DIRECTIONAL STEP, ON SPACE.** Before it the whole answer to a swing was
block, parry or walk backwards — three things, all of them facing him, and
the walk backwards is not really one, so every exchange had a single correct
input. The step is what turns that into "read the tell AND choose where to
be": his lunge is stepped and his side swing is parried, and neither is the
other's answer any more.

- **It takes jump's place while a fight is live, and only then.** Space is
  the only key the left thumb can reach with four fingers locked on WASD and
  the pinky on shift, and in a fight every one of those is committed; and
  jump is worthless in the one room where the step matters, which is a flat
  steel box. `inCombat()` is deliberately narrow — a woken thing inside ten
  metres — or a shovel in your hand would cost you jump for a kilometre of
  walking.
- **No input is a BACKSTEP.** A man with nothing pressed who hits the button
  wants to be somewhere that is not here, and back is the only direction
  that is true of whatever is coming.
- **The step owns the velocity while it runs**, so nothing held on WASD can
  steer it half way through — a step you can turn mid-flight is a sprint. It
  is fast at the front and eases out at the back, and it goes through every
  clamp exactly like a walk, so a step into a wall stops at the wall.
  Measured: 2.0 m in 0.30 s against 1.0 m in 0.5 s of walking.
- **The near miss is the feedback.** I-frames alone are silence — the blow
  simply does not arrive and the player cannot tell a dodge from a miss — so
  a blow that goes through you inside the window is HEARD going past, low
  and panned off to one side, with a beat of hitstop and a pull on the lens.
  Measured: the window is 0.185 s and a blow at 0.200 lands.
- **It comes out of the same bar as a block and a sprint**, so a fight you
  spend rolling out of is a fight you cannot then back out of; and there is
  a cooldown, because a step you can mash is a step that never has to be
  timed. That is the parry's own argument.

**THE THREE BREAKS ARE RECORDINGS, AND A RECORDING IS THE WHOLE EVENT.** The
desk, the tripod camera and the coat stand play the owner's own bounces
(`table-break` / `camera-break` / `coat-break`), and the synthesised stacks
they replaced stay behind them as the fallback for the frames before the bank
is off the network — the katana's own arrangement. Two things: the layered
clatter must NOT still play underneath (the coat stand was a clatter plus a
snap because neither alone was a coat stand going over; the bounce is already
one mixed event and putting the clatter under it only muddies it), so
`sfxWoodSnap` and `sfxTableBreak` return whether the bank played and the
caller only reaches for the synth if it did not. And **AAC overshoots on
decode**: the camera bounce peaked at 1.18 in the decoded buffer and clipped,
so all three are encoded with 3 dB of headroom and the play gains carry the
level back.

**A GLINT YOU CANNOT SEE IS NOT A GLINT.** Every shine in this game is
depth-tested, which is right for a shell on an open beach and wrong for the
one moment a shine exists FOR: the Military Shovel lying among a dozen planks
and four table legs on a steel floor, where the thing hiding it is the
wreckage that revealed it. `addItemShine` takes `through`: a SECOND sprite
that ignores depth, bigger, much fainter, drawn last, breathing on its own
slower count — so a plank across the tool dims the mark instead of deleting
it, and with a clear line of sight the two read as one brighter glint. Two
sprites rather than one depth-ignoring sprite, because a shine that never
occludes at all reads as a decal pasted on the lens. It is opt-in and set in
exactly one place: a glint showing through a cliff would be the wrong thing
everywhere else.

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

**AND WHAT WAS STANDING ON IT FALLS, BUT IS NOT SMASHED THERE.** Each prop
holds a `floorAt` that answers with the table's top; the break drops that and
hands them back to the physics, so they arrive on the steel a beat later and
their own `onImpact` finishes them. Bursting them in the same frame reads as
the table exploding, and this is a collapse.

**A GIB MAY BE A GROUP.** `updateGibs` measures half a piece's thickness off
its geometry the first time it sees it, and disposes of that geometry at the
end of its life — the equipment case goes over as one piece and a Group has
none, which threw inside the update loop, which is the whole game. Hand it
`half` up front (the guard is already `=== undefined`) and guard the dispose.

**AND THE LEGS STOOD UP LIKE CANDLES.** Same as the coat stand, in a new
place: `updateGibs` rests every gib with its rotation zeroed, which lays the
planks and rails flat because they are built along X and Z, and stands
anything built along Y bolt upright on the floor. A leg gets its geometry
turned onto X with the quarter turn put back on the mesh.

**AND IT MUST LAND IN THE ROOM.** The equipment case stands 0.89 m from the
+x wall and the spill threw the Military Shovel 0.9 to 1.4 m down a fan of
headings: measured over four hundred spills, **more than a quarter of them
put the prize outside the room** — through forty centimetres of concrete, out
on the sand over the roof, gone for the rest of the game — and a third of the
rest put it inside the furniture. The heading the break threw it is still
what is asked for first; it is simply no longer the last word. `spillSpot`
walks out from that heading, alternating sides and then closing in, and takes
the first place that is inside the walls and on floor a body could stand on —
the room's own walk grid already knows what is furniture and the room box
already knows where the walls are, so this only has to ask them in the right
order. Measured after: 0 of 500 outside, 0 of 500 in furniture.

**AND THE PRIZE MUST NOT BE LOST IN THE WRECKAGE.** A dark olive scan lying
among a dozen planks on a steel floor is invisible. When the case spills, the
shovel's glint is moved over the middle of it and its `shinies` entry is
driven far harder than the one it wore in the case (strength 2.6, lift 1.1).

**A RAYCASTER READS `matrixWorld`, AND A JUST-ADDED OBJECT HAS NONE.** The
table is built and then the prop spots are dropped onto it by raycast in the
next few lines; without `updateMatrixWorld(true)` the table is still at the
identity and everything meant to stand on it fell through to where the scan's
floor used to be.

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

**AND NOTHING GROWS UPSTAIRS.** Grass had seeded along the room's sill five
metres up. Sand and glass get in up there; grass does not. Ground level
only, and less of it — a crack in a slab holds a tuft, not a border.

**A GLOBE CHAIR LYING DOWN IS A BALL.** One of the two was over on its side
on the rug, which sounded like good set dressing and reads as a beach ball
somebody left: the mouth is in the floor and what you see from anywhere in
the room is a smooth orange sphere. Both are upright and turned in at the
table now. If a shape only reads from one angle, it does not read.

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

**A SYNTHETIC HIT CARRIES ITS OWN WORLD NORMAL.** `stampScar` reads
`hit.face.normal` and turns it by the struck object's matrix, which a hit
marched against a collider has neither of. It takes `hit.n` in world space
when there is one.

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

**A SPHERE WITH A WEDGE OUT OF IT OPENS ON -X, NOT -Z.** Three's `phiStart`
runs from the -X axis, so the gap a `phiLength` short of a full turn leaves
is centred there — and a globe chair turned as if its mouth were on -Z
faces ninety degrees away from whatever you pointed it at. Both of them
did, which is the whole of "the circle chairs are facing different
directions". Local -X reaches world angle `face` at `face + PI/2`. And a
chair should face the thing the room is FOR: the pair flank the table
across the rug from the sofa, both turned in at it, and the angle is
DERIVED from where the chair stands and where the table is rather than
chosen.

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

**AND THE GATE HAS TO BE HANDED THE COPIES.** The loop that offsets the
house's colliders into world space builds a NEW object per collider — it
has to, it is adding the offset — so the leaf's discs that `models/` kept a
list of are not the discs the game collides against. Swinging the gate
moved five objects nobody reads: the pivot turned, the iron visibly swung,
and the doorway stayed shut. Measured: shut stops you at 5.52, open lets
you to 0.5. This is the only place in the game that moves a `rockColliders`
entry, so it is the only place that trap exists.

**AND A COLLIDER MUST NOT REACH PAST THE CLAMP IT SHARES A WALL WITH.** The
sofa's discs were run out past the room's own outer clamp to close the
pocket behind it, and that is the same trap wearing the other hat: the
push-out shoves you to 5.24, the clamp pulls you back to 5.15, and the two
fight over you every frame. They stop a hand's breadth short of it.

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

**AND `mushWhere` REACHED ACROSS THE BEACH.** On the stair the walk clamps
you to the shaft's bore FROM WHEREVER YOU ARE. The state is sticky on
purpose — it is what stops one step off the top tread putting the room's
floor back under you — so a state left set by any exit the three
transitions do not name (a knockback out of the door, a teleport, a test
harness) dragged the player back across the sand and posted them inside the
column, over and over. Anything past `R_ROOM + 2.5`, or below the sand, is
not in the building.

**AND `floorY` HAS TO SURVIVE THE COPY.** The room's furniture is solid five
metres up and nowhere else: `pushOutOfSolids` reads `floorY` and skips
anything whose bottom is over your head. But the loop that offsets the
house's colliders into world space rebuilt each one field by field and
quietly dropped it — so a sofa on the top floor was a post standing on the
sand, and the way in through the gate was blocked by an armchair nobody
could see. Copy what you are given, or the field may as well not exist.

**A ROOM WITH NO LIGHT IN IT IS NOT A ROOM.** The whole seventies interior
was built and could not be seen: one directional moon outside a band of
glass leaves an interior that renders as a black drum, and no amount of
colour on a sofa survives that. Four cold lamps under the ceiling and one
warm one over the credenza — they are the moon through the missing panes
bouncing off a pale dish, which is what it would actually do. **Three, not
ten**: every light in a scene is a shader define, and a far-culled group
that switches ten of them on as you walk up to it recompiles every material
in the game at the worst moment.

**A PATTERN HAS TO BE TOLD HOW BIG IT IS.** Hung with the stock 0..1 uv, the
wallpaper's four bullseyes stretched over fifteen metres of wall and came
out as an orange smear — the drawing was there and none of it could be
seen. Every map in the room carries a `repeat` worked out from the real
size of the thing it is on. And the RETRO DOWNSCALE eats any pattern finer
than a hand's breadth, so the patterns are big on purpose.

**CONTRAST IS WHAT MAKES CONCRETE READ AS CONCRETE**, and a map that carries
none cannot be given any by a material. Board-formed concrete is a RECORD of
how it was poured: a dark seam per board with a pale lip under it where the
lift bled, tie holes in a grid with rust running out of each one, damp
running down and drying pale, and spalled patches with the aggregate
showing. Drawn at 512 and pushed apart around mid grey before the quantise.
The building is BACKLIT from every approach — you walk toward the moon — so
the emissive off its own map is the only thing carrying it, the same lesson
the scanned rocks taught.

**AND THE FLOOR OF A ROOM IS NOT THE SLAB IT WAS POURED ON.** The room read
as a black ring round a lit rug because the only thing under the furniture
was the same structural concrete as the outside. Terrazzo — a pale ground
with big chips in it — is what a dim room needs: something that catches
what light there is. A round rug in a round room with a hole in the middle
of it is a SECTOR of a ring, not a disc; a disc big enough to matter lay
straight over the open well you climb up through.

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

**THE JARS ARE COUNTED, AND THE MILLILITRES MOVED ONTO THE GLASS.** The
corner of the screen read "120 mL" out of a tank that filled up; what you
actually carry is JARS, so it counts them ("1 jar", "5 jars", the unit its
own span so the singular is right). `bloodAmount`, `BLOOD_PER_CRAB` and
`BLOOD_JAR_CAP` are gone and `gainJar(n)` is the one door — the tally, the
icon, the pulse and the sound in one place, so a jar handed over by an
extraction and a jar lifted out of a hole cannot drift apart. 120 mL is a
fact about one crab and it is PRINTED ON THE LABEL now, where a number that
never changes belongs. The first dig mound gives up a jar instead of the
ring (`dropJar`), and the ring comes off the knight.

**AND THE JAR ITSELF WAS A SHAPE, NOT A BOTTLE.** What makes a prop read as
old is the record of how it was MADE and what has HAPPENED to it since, and
the first build had neither: one clean lathe, a cap turned on the same
lathe, and a label that was four black boxes. It now carries the two MOULD
SEAMS it was blown in, a heel ring it stands on, a crimped foil cap whose
segments are pushed in and out so the highlight breaks up round it (a lathe
is a perfect surface of revolution, which is exactly what foil pressed down
by hand is not), a run of dried haemolymph from under the seal, sediment,
bubbles clinging up one side, and a drawn label — foxed, ink run, a ring
where something wet stood on it, a batch number in a different hand, and
torn away at both ends through an alpha map, because a label peels from its
ends first. Two things measured on screen: **the meniscus is a RING, not a
lid** (at full opacity the little dome on top of the blood is a flat pale
disc the width of the jar and it reads as milk), and **a mould seam may not
run under the label** — both the geometry and the label arc are in three's
(sin, cos) convention where theta 0 is +Z, so seams at 0 and PI put one of
them straight down the middle of the printing.

**AND THE GLINT'S LIFT SWAMPED THE ONE THING THE PROP IS FOR.**
`addItemShine` raises the emissive of every material under it, which is
right for a dark scan and wrong for a jar whose whole point is that it is
BLUE: at the stock lift the glass, the blood and the label came up together
and what stood in the sand was a pale bottle. `lift: 0.3`. The sprite is
what finds it in the dark; the lift only has to keep it off black.

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

**THE KNIGHT'S LIMBS WERE STIFF BECAUSE SIXTEEN OF HIS BONES WERE NEVER
DRIVEN.** An Unreal mannequin runs two TWIST joints down the middle of
every limb — `lowerarm_twist_01_r` and its fifteen relatives — and the skin
along a forearm is weighted to THEM, not to the forearm bone. The retarget
maps what `kind.rag` names, which is the ragdoll's twenty-two joints, so
every twist bone fell through to the fallback and inherited its parent.
What that draws is the candy-wrapper: the whole roll of a joint absorbed by
one ring of vertices at the joint itself with the length of the limb dead.
Measured on his own clips, the roll taken in a single step: **65 degrees at
the wrist on the swipe, 46 at the elbow on the spin, 28 at the ankle**. A
twist bone at fraction f along its limb now takes f of the DISTAL joint's
roll about that limb's own axis (a swing-twist split: project the
quaternion's vector onto the axis and renormalise, so the joint's SWING is
left where it belongs), and the fractions are measured off the rig rather
than assumed — they are clean thirds here, and `01` is the far end on a
forearm and the near end on an upper arm, which is exactly the sort of
thing not to hard-code. Nothing is taken away from the joint, so the pose
is untouched and only the ramp between changes. Every clip's worst step
roughly halves and none is worse; it costs nothing and it is general, so
the red alien's Character Creator twists get it too.

**AND THE OCTOPUS RING HAD NEVER ACTUALLY BEEN SEEN.** Its level was set
years of passes ago on a surface that was two per cent of a scan rendering
as speckle — near-white base, orange rust map, orange emissive over the
top. With the whole 45,000-triangle octopus finally on the screen it
measured (168, 114, 65) under the examine lamps: bright orange batter, not
metal out of the sea. At (85, 59, 36) it is corroded bronze with the rust
still reading in the pits, and the pits are the whole point of decimating
rather than chunking. The tiling was already right (`uTri` 0.062 on a
31-unit span is 1.9 repeats round it) — **check the level before the
tiling, and check both only once there is something to look at.**

**AND THE RING SAYS WHAT IT DOES.** `desc` on an item is drawn under its
name on the examine screen and in the pack's detail pane; the octopus ring
reads "10% Stamina Increase" and, worn, that is exactly what it does —
`stamMax()` is a forward hook filled in beside `ringItem`, the regen, the
breath and the bar all read it, and the STRIP ITSELF grows by the tenth
(150 px to 165) rather than drawing a bigger reserve inside the same width,
which would be a ring that changes a number you cannot see.

**AND PRESSING E LOOKS THE SAME WHEREVER THE PROMPT SITS.** There have
always been two of these — `#prompt` beside the stamina bar for picking a
shell up, and `#promptmid` under the crosshair for the mouth of a cave and
for the idol on the altar — and they were styled in two separate blocks, so
the strip one had drifted to 0.78rem of dim blue-grey with a small dark key
badge while the altar's read white at 1.02rem with a white-bordered one. E
is ONE verb; only the POSITION is per-prompt. The type, the tracking, the
colour, the shadow and the key badge are declared once against both
selectors, so anything added later inherits it by construction rather than
by somebody remembering. Measured: every computed property identical on
both, badge included. The strip is wider for it (564 px at the longest
label, "Take the Military Shovel") and still centred inside any real
window; only a pane under about 570 px reaches the edges.

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

**A STACK IS ONE ITEM WITH A COUNT, AND `iconHTML` IS WHERE IT SHOWS.** The
one object in this game you collect more than one of was the one object you
could not find in your own pack: a jar was a model at the end of an
extraction and a number in the corner, and `jarItem` was literally `null`.
It is an item now, and because it is the SAME item object every time,
`count` is the whole of stacking — `addToInventory` has refused a duplicate
by identity since the day a ring appeared twice, so a second jar lands on
the first instead of taking a slot. The badge goes on `iconHTML`, which is
the one door the hotbar, the pack grid and the ring row all draw through, so
all three show it by construction. `gainJar` writes the count BEFORE the
add, because the render reads it.

**AND THE CORNER NAMES WHAT IT COUNTS, IN THE GAME'S OWN HAND.** It read a
monospace number and a small dim "jars" — a different voice from every other
piece of text on the screen, and the thing it counted was never named. "1
BLOOD JAR" in the prompt's Georgia, letter-spaced, uppercase and white.

**"G DROP" WAS NOT A PROMPT.** A prompt says what the thing you are LOOKING
AT will do. This said what a key does, on every frame you had anything in
your hand, which is most of the game — the one piece of text on the screen
that never changed and never needed reading. G still drops; the controls
sheet still says so.

**AND THE BAR YOU SPEND IS AT THE BOTTOM, ON ITS OWN CENTRE.** Two things.
It was four pixels of ten-per-cent white at a quarter opacity — a scratch,
for the meter the block, the sprint and the step all come out of; it is
eight pixels with a visible track and a hairline, and never below half. And
the PROMPT has left the strip: a flex row centred as a whole is re-centred
by whatever is widest in it, so every label that came up shoved the bar
sideways, which is the one element that has to be in the same place every
time. It sits above the strip on its own centre — and it can be
`position: fixed` out there and could not in there, because an ancestor with
a `transform` contains a fixed child, the same trap `#promptmid` already
carries a comment about.

**WHAT A THING DOES IS NOT A FOOTNOTE.** "10% Stamina Increase" was 0.62rem
and half-transparent under a name twice its size — the one line on the
screen carrying a mechanic and the easiest to miss on it. Body size, white,
and ruled off above and below so the eye stops on it; the examine screen's
copy went the same way. The katana reads "A Holy Blade".

**AND A RING IN YOUR HAND GOES ON YOUR HAND.** Putting one on was only ever
reachable from the examine screen, on the argument that that is where you
can see what you are wearing — true, and it also meant the gesture everybody
tries first, holding the thing up and pressing the button, did nothing.
`canWearHeld` is the shell's own `onListen` door and is asked of the ITEM,
so the next ring inherits it. The pack shows the ring slots too, drawn by
the same `renderRings` into both hosts so they cannot drift.

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

**A SHINE IS A MARK IN THE AIR, NOT A DECORATION BOLTED ON.** The glint was
a sprite parented to the item at a local +Y, which is the same as world up
for everything that stands still — and is not for the one item in this game
that TUMBLES. The ring comes off the knight as a `PhysProp` and rests at
whatever angle it fell, so its own up can point at the floor. Measured where
it landed in the nave: ring at y 399.942 on a floor at 399.930, glint at
**398.573** — a metre and a third UNDERNEATH the flags, which is the owner's
"the aura is beneath the floor". The offset is rebuilt in world up every
frame now: take the root's own rotation out of it and divide by its SCALE,
because `makeNoticeable` blows a 20 mm ring up by 3.2 and a local offset is
in the root's units. Nothing static moves by a pixel; after, both sprites sit
0.512 m over the floor whatever angle the ring came to rest at.

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

**A COUNT BESIDE A PICTURE OF A JAR DOES NOT NEED THE WORD "JAR".** The
corner reads "2x" in the blood's own blue — the icon says what it is, and a
label naming its own drawing is the caption on a photograph of a caption.

**AND THE PACK TAKES THE SCREEN IT IS ON.** 880 px was a band across the
middle of a wide display with most of the picture left over, on the one
screen that is nothing but the thing you are reading: 1280, wider gaps, and
a detail pane that grows with it. The RINGS row went from a 40 px footnote
to its own section — its own heading, its own rule, 84 px slots — because
what you are wearing is half of what you are carrying.

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

**AND A BOOT IN THE TUNNEL IS THE SEA'S OWN RECORDING.** The channel's step
was synthesised — four layers of filtered noise, which is what sand is — and
the owner's word was that it should sound like stepping in ocean water, a
little lower. His own `wade` bank is already in the game for walking through
the surf and it is the same event, so the tunnel plays it at 0.88 of the
rate: a smaller room, and an inch of water rather than a foot. The
synthesised puddle stays as the fallback for the frames before the bank is
off the network, the katana's own arrangement.

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

**THE BIGGEST THING ON THE BEACH WAS DRAWN FOR THE WHOLE WALK, AND THE RULE
THAT SHOULD HAVE CAUGHT IT WAS WRITTEN TO LEAVE HER ALONE.** Profiled by
hiding each top-level scene child in turn and reading `renderer.info.calls`
back, at sixteen stations from the spawn to the fence: **the shipwreck was
162 draw calls at EVERY ONE OF THEM** — at the pavilion a third of the frame,
at the tower half of it, and at the fence she is nine hundred and eighty-five
metres behind you. She was in no `farProps` entry (her DRIFT was, at 220; she
was not), and `cullBeyondFog` deliberately exempts anything bigger than
`SKYLINE_R`, because culling a landform does not remove a dim object, it
opens a hole in the fog. So the one rule that covers everything nobody
remembered to register is the one rule that could not cover her.

- **`farProps` at 240 m.** `FogExp2` 0.014 leaves 0.007 % of her there; the
  list's own numbers are 260–340 for the same reason.
- **AND `bakeStatic` HAD NEVER BEEN RUN ON HER.** It is for BUILDINGS and she
  is the biggest one in the game: 158 meshes, 85 of them unnamed, childless
  and unflagged, merged by material into 17. Her hull quads already carry
  `noBake` (they are lifted off their own maps and must keep them) and every
  part this file holds — the wheel, the gaff, the head, the lantern, the hold
  door, the barricade — is named or flagged, so all six survive the merge and
  were checked to still be in the scene afterwards. It runs on a `warmStep`,
  which is after the module has finished hanging things on her.
- **And the drainage tunnel home was the same bug, smaller**: 29 draws a
  frame for a building that stands at the dead end BEHIND the spawn and is
  never looked at again after the first hundred metres.

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

**AND HE WAS NOT HOLDING THE SWORD, WHICH IS ALSO WHY HIS HEAD LOOKED OFF.**
The owner's two reports — "his head is literally off of him" and, watching the
same figure, "hes not even holding the sword XDXD" — are one bug. Rendered
frame by frame, the head is ON: measured in the shipped GLB the helmet spans
y 1.25–1.59 against a chestplate topping out at 1.30 and a neck guard between
them, and over every clip the head bone never drifts more than a centimetre
from the chest. What was actually wrong is that the KATANA hung in the air
beside him with both hands empty, and a figure whose parts do not move
together reads as a figure coming apart.

- **`stick()` CANNOT SEE THE POSE IT IS PINNING TO.** The packer pins the
  sword by reading `pbs[hand].matrix` live and writing the katana onto it —
  and a live read is only the pose you just wrote if nothing has re-evaluated
  the armature since. That holds while a clip is being AUTHORED and is false
  inside `retarget()`, whose every frame begins `sc.frame_set(f)` to advance
  the SOURCE clip, which re-runs the animation system on the destination rig
  too, against the half-written action being keyed. Measured on the shipped
  file: the authored clips held the hilt 0.05 m from his fist on every frame
  and the seven retargeted ones held it 0.14 to 1.22 m away. `pin_all()` is a
  pass of its own — record the host's matrix over a FINISHED clip, then
  rebuild the action writing the sword onto what was recorded. Two passes,
  nothing live, which is the shape `trim` already had. It has to run after the
  trims and BEFORE the contact measurement, which tracks `DEF-katana_tip` — a
  bone parented to `Katana` — and was therefore measuring the flight of a
  sword nobody was holding.
- **AND A ROOT BONE DOES NOT FOLLOW A SHOULDER, SO THE GAME RE-HANGS IT.**
  `aimBar` turns his shoulder by up to `AIM_MAX * 2.60` to put the blow on
  your chest; the katana is a root bone, so measured over six hundred live
  frames the hilt still wandered 0.10 to 0.44 m off his hand — the sword slid
  through his grip on exactly the swings you are meant to be reading. Worse,
  `kind.rig.tip` is a CHILD of that root bone, so the correction was steering
  a hitbox it could not move and the blade it swept was not the blade on
  screen. `pinSamuraiSword()` takes the offset once while he is not swinging
  and puts the bone back on it after `updateMutant` — the room clamp's own
  rule, that whatever moves a thing last is what everything hung off it must
  follow. Measured after: hilt 0.199 and tip 0.62 from the hand, CONSTANT
  across every clip, and the fight unchanged at 47 swings and 51 damage a
  minute.

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

**"IF YOU STAND STILL HE JUST SITS AND TWEAKS OUT" WAS A RETARGET THAT CARRIES
NO HEIGHT.** The retarget writes ROTATIONS and nothing else, so whatever the
source clip did VERTICALLY is simply lost — and half of this set does something
vertical. `Great Sword Blocking` and `Great Sword Crouching` both SINK: the
body drops into a stance. With the hips pinned the legs have nowhere to put
that, so they fold up underneath and THE FEET COME OFF THE FLOOR. Measured on
the shipped file, over the idle's twelve frames the toes ramp 0.03 → 0.33 and
0.00 → 0.25 and never come back, and over the block's sixteen they ramp to 0.70
and 0.59 — monotonically, a ramp and not a cycle, with the hips reading 0.90 on
every frame of every clip. Looped at half a second that is a man hoisting both
knees and snapping back, for ever. Two things fix it and they are separate:

- **SEAT THE CLIP.** The lowest point of the sandals is measured per frame
  through the depsgraph — on the MESH, never the foot bones, because the sole
  hangs below the joint (the Dealer paid for that one) — and the root bone is
  moved so it rests on the floor it rested on at rest. A crouch then reads as
  the body going down, which is what a crouch is. Measured after: the planted
  toe holds 0.00–0.01 through the whole idle and the hips sink 0.83 → 0.61.
  **A GAIT IS THE EXCEPTION**: a run has a flight phase where both feet are
  legitimately off the ground, so seating it per frame would pin a running man
  to the floor. Those take ONE offset, the clip's own minimum.
- **AND AN IDLE IS A POSE HELD, NOT A CLIP PLAYED.** Seating fixes the feet; it
  cannot fix the fact that the source is a ONE-WAY RAMP — he drops into a guard
  over half a second and the clip ends, so looped he sinks and pops back twice a
  second whatever his feet are doing. The pose you look at longest has to be
  still. `breathe()` takes the FIRST part of the clip — up to where the hips
  have only just begun to settle, found by asking the hips rather than by
  picking a number — and plays it out and back over three seconds on a
  smoothstep. Measured live, five frames across a second: identical.

**AND THE DEATH WENT BACK ON THE RAGDOLL.** `deathClip` sent him down an
authored `die`, and the owner's word for it was that his body and textures
deform — rendered, that is exactly right: from a third of the way in he folds
into a knot, limbs through the torso, and holds it. Every hand-authored pose on
this rig has read badly and that was the last of them. The Verlet body cannot
deform, because it drives each bone by the SMALLEST rotation that takes where
it points its child to where the child's particle is — there is no pose to get
wrong, and bend limits and self-collision hold the rest. `bossDeath` was left
off because the ragdoll answers to `Character1_*` and this rig is Rigify, so it
built a body of ZERO parts — but that was the wrong half of the fix: **the
ragdoll takes a NAME MAP, and `kind.rag` is it**, which the thing on the
headland has used on joints called `Bone_011_037` ever since. Measured after:
22 parts, landed, asleep, the body lying between 12 and 34 cm off the floor.

**AND SMALL FAST RAIN IS WORSE THAN BIG SLOW RAIN AT 222 PIXELS.** Tiling the
rain to a realistic drop and scrolling it at a realistic nine metres a second
made the flashing WORSE, not better, and the reason is the retro scale: a
streak a tenth of a metre wide is one pixel at ten metres and moves three
pixels a frame, so it samples in and out of itself and sparkles. The pictures
have to be BIG and SLOW for the same reason the pavilion's patterns are big —
anything finer than the downscale is noise. Measured by diffing consecutive
live frames of an empty dojo:

| | bright jumps | rain pixels on screen |
|---|---|---|
| 10×8 at 1.0 tiles/s | 22483 | 3033 |
| 6×5 at 0.62 | 7 | 1905 |
| 5×4 at 0.75 | 0 | 1907 |

**And the second column is the point of the table**: "pixels that jump" is a
metric you win by deleting the rain, so it is never read on its own — the
presence measure is what stops a fix that is really a removal. Both readings
then have to be checked against the picture, because a streak's leading edge
lighting new pixels IS a bright jump and a moving streak can never score zero.

**A BONE IN EULER MODE IGNORES EVERY QUATERNION YOU WRITE TO IT, AND TWO OF
THEM WERE HIS COLLARBONES.** "The animation I am seeing looks nothing like the
ones I gave you" was one line in `tools/samurai_pack.py`. Nothing in that file
speaks Euler - `rest`, `setrot`, `put`, the retarget, the trims, the seating
and the pin all write `rotation_quaternion` and `key` keyframes that channel -
but a Rigify rig does NOT bind every bone to quaternions: this one ships 82 in
Euler, and `ORG-shoulder.L/R` are two of them. Both `DEF-upper_arm` and
`DEF-shoulder` hang off a clavicle, so the retarget worked out each arm's local
basis RELATIVE TO a collarbone it believed it had rotated, wrote that rotation
into a property the evaluator does not read, and the collarbone stayed at rest.
Every arm in every retargeted clip was off by whatever its own clavicle was
meant to be doing, and a greatsword swing rolls the clavicles hard.

**AND THE MEASUREMENT THAT FOUND IT IS THE ONE THAT SHOULD HAVE BEEN TAKEN
FIRST: THE SHIPPED CLIP AGAINST ITS OWN SOURCE.** Hands apart, as a fraction of
the rig's OWN arm reach - the one normaliser that cannot be thrown off by two
figures having different proportions, and here the two reaches measure 0.562
and 0.563, so the comparison is direct:

| | Mixamo source | shipped before | shipped after |
|---|---|---|---|
| Blocking -> idle | 0.12 / 0.28 | 0.79 / 0.88 | 0.32 / 0.39 |
| Crouching -> block | 0.19 / 0.22 | 1.50 / 2.03 | 0.24 / 0.32 |
| Slash -> sDown | 0.28 / 0.37 | 0.97 / 1.45 | 0.35 / 0.48 |
| Slash-2 -> sSide | 0.27 / 0.33 | 1.36 / 2.08 | 0.39 / 0.49 |
| Kick -> sSpin | 0.27 / 0.29 | 0.96 / 1.51 | 0.42 / 0.49 |
| Kick-2 -> sStab | 0.27 / 0.29 | 1.37 / 1.82 | 0.42 / 0.52 |
| Sword And Shield (dropped) | 1.28 / 2.39 | - | - |

Two of what shipped were WIDER THAN THE SHIELD CLIP that had been thrown out
for being too wide. The round that dropped it measured the shipped clips
against each other and never against the files they were made from; measuring a
build against the last build only tells you it changed. `sSwing` - the artist's
own clip, resampled and never retargeted - reads 0.15 throughout, and that is
the control that says the rig and the export are fine.

The hunt is worth writing down because three plausible causes were eliminated
by measurement and all three were wrong. **A IS NOT T** is the retarget lesson
this file already carries, and it does not apply here: measured, both rigs bind
in a T within two degrees at the shoulder. **THE ORG CHAIN IS DRIVEN AND NOT
KEYED** is real and was fixed (`KEYED` is now every deform bone AND every
ancestor of one, because `DEF-upper_arm.L` hangs off `ORG-shoulder.L` and none
of the 159 ORG bones is a deform bone) and it changed the hands by nothing.
What settled it was reproducing the retarget maths OUTSIDE the packer, where it
came back correct - 0.32-0.51 against the sources' 0.22-0.37 - and the only
difference between the two was one line in the probe:
`pb.rotation_mode = 'QUATERNION'`. **WHEN A FAITHFUL REIMPLEMENTATION OF A
THING GIVES A DIFFERENT ANSWER, THE DIFFERENCE BETWEEN THE TWO IS THE BUG.**

**AND THE ARTIST'S OWN ACTION WAS SHIPPING AS A T-POSE.** `Swing` is adrigon's
clip on adrigon's control rig; it is sampled at the top of the packer and
re-keyed onto the deform bones as `sSwing`, and the source action itself was
never removed. The exporter ships every action it can find, so 31 frames of it
went into the GLB - and rendered as a strip it is a man standing in a T with
the katana waving about in front of him, because it drives control bones the
export drops. Anything that played it would T-pose the boss. This is the
`Armature|mixamo.com|Layer0` trap wearing the source file's own name.

**AND EVERY CLIP HE HAD WAS STANDING IN THE FLOOR.** The seating pass was
written for the retargeted set, on the reasoning that only a retarget loses
height - and an authored stance that bends the knees loses it just as surely.
Measured on the shipped file, `sRise`, `stagger` and `taunt` all stood
0.13-0.14 through the boards on every frame they had. Worse, **THE ONE OFFSET A
GAIT TAKES IS THE ONE THE DEEPEST FRAME NEEDS, NOT THE SHALLOWEST**: `min(drop)`
picks the frame whose foot is already highest - the flight phase - lands THAT on
the boards and leaves every planted foot under them, so the run measured -0.242
and the walk -0.111. `max(drop)`. After: every clip's sole sits at 0.000 and
the gaits' flight phases are the only thing above it.

**AND THE WALK WAS EASING HIM BACK INTO THE BIND POSE.** It is built off the
run by slerping every rotation toward rest at 0.62 - which shortens the stride
and also walks the whole upper body back toward a T, so his guard opened as he
slowed down and by the time he was walking his hands were 1.10 of his own reach
apart against the run's 0.40. He holds his sword the same way at every speed;
only his feet know the difference. The ease is the leg chain and nothing else.

**AND A CLIP WITH NO ROOT MOTION STILL STATES ITS STRIDE.** `clipSpeed` came
off the ntar-style move sets' own travel curves, so anything packed as a GLB
had none - and the samurai's gaits are retargeted, which writes rotations and
nothing else, so his feet ran at a hand-set number while the fight moved his
body at another and the two agreed only by luck. THE RATE IS THE STRIDE OVER
THE SPEED, and an in-place cycle cannot hide its stride in one place: the
PLANTED FOOT. Whichever toe is lowest is the one on the ground, and how far it
travels backwards through the frames it stays down is the distance the ground
covered; a frame where the plant CHANGES is a step and is not counted, or the
swap reads as a metre of travel. Measured after the scale fit, so it is already
metres: 2.03 m/s walking, 3.50 running.

**HIS SWINGS ARE `real` NOW, WHICH IS THE WHOLE OF THE PACING.** His clips are
about seven tenths of a second and his startups are longer, so mapping a
wind-up linearly onto a startup plays the blade at a fraction of real speed -
SCP-096's "slow-mo" on a second creature. `real` does it the Dealer's way: the
sword is drawn back to the COCK over the first part of the startup, HELD there,
and the cut runs from the cock to the contact at better than the clip's own
speed in the last part, still landing on the frame the table deals damage. A
long readable tell and a blade that arrives fast is what a Japanese sword fight
is, and it is what Sekiro does with every swing. The RECOVERIES came down and
the CHAINS went up rather than the startups coming down, because the startup is
where the fairness lives and this file has paid for shortening one twice.

**AND THE OVERHEAD LANDS NOW, BECAUSE THE REASON IT MISSED WAS THE ARMS.** It
was thrown twenty-seven times over four minutes and landed not once, and the
conclusion drawn was that `Great Sword Slash` is a chop this fight has no range
for. It is not: with the clavicles fixed it lands 12 of 17. The rising cut it
was replaced by is the last hand-authored swing in the set, reads worst of the
five, and is now the one that stays in the file and out of the draw. **A SWING
THAT NEVER CONNECTS IS EVIDENCE ABOUT THE RIG BEFORE IT IS EVIDENCE ABOUT THE
SWING.**

**AND HE KNOWS WHAT IS IN THE ROOM.** His whole answer to the courtyard was
`pushOutOfDojo` - a shove out of whatever he was already inside, undamped, with
no steering above it, which is a creature that walks into the wall between it
and you and grinds there. He gets what the Dealer and the knight already have:
a nav grid built once off the DRAWN FACES (not the packer's body band - the
keep's lesson, that a band marks a whole half-metre cell full for one lantern
post), `dojoClearAhead` marched in strides so the body's WIDTH is asked at
every step and not only the line between them, `dojoRoute` as a breadth-first
search thinned to its corners, and a push-out capped at a walking pace so a
correction is a lean and never a jump.

**AND TWO WAYS OUT OF THE WORLD, BOTH FOUND BY PLAYING IT RATHER THAN LOOKING
AT IT.** `groundY` in the courtyard was the LARGER of whatever it held and the
room's floor, and where the grid had nothing to say it was left alone - which
eight hundred metres over the sand means the beach's own zero. Measured in a
live fight: knocked onto a cell the packer sampled no floor into, the camera
went from 801.84 to 1.70 and `dojoFloorAt`'s own sixty-metre guard then refused
to answer ever again, so there was no way back. The room owns the floor while
you are in it, it remembers the last good one, and a body below it is put back
on it. And **WHATEVER MOVES THE PLAYER LAST MUST RE-RUN THE ROOM'S CLAMP** -
the bunker's own lesson, which this room never got: `updateDojo` reverts a step
that leaves the walk, and the samurai's KNOCKBACK is applied from
`updateMutant`, which runs after it, so each shove moved the body a little
further out with nothing to answer. Measured over eighty seconds of being hit
thirty-one times, the player was walked twenty-five metres clear of the
courtyard with the boss following him out. `clampPlayerToRoom` speaks for the
dojo now, which is the one door every knockback already goes through; and HE is
walked back onto the grid when he is off it, because outside the model there
are no faces to push off and no floor to stand on.

Measured at the end, hands-off at fighting range over eighty-three seconds:
**76 swings and 73 damage (55 and 53 a minute) at 61 % connect, all four swings
landing - side 14/25, stab 13/18, overhead 12/17, spin 7/16 - worst step
0.141 m, and neither the player nor the boss ever left the courtyard or fell
out of it.** The Dealer is 48 and 40.

**WHAT IS NOT DONE:** `sRise`, `stagger` and `taunt` are the last hand-posed
clips on this rig and all three measure wide at the hands, because they are
built up from the bind pose and the bind pose is a T. `sRise` is out of the
fight's draw; the stagger plays on every poise break and the taunt on the wake.
The Dealer's answer - base every authored clip on a frame of the SOURCE idle -
is the fix, and it needs the retarget moved ahead of the authoring so there is
an idle to base them on. He also has no true sideways stride: `strafeL/R` are
aliased to the walk, which is the oldest animation bug in this file, and the
eight Mixamo clips that exist do not include one. And he still stands very
still between swings (96 % of frames under 5 mm) even with `restless` on.

**AND THE HAND HAS TO CLOSE — the Dealer's own bug, on a second rig and for a
second reason.** His fingers were stripped and never re-keyed; this one's are
never DRIVEN. `MIX` maps a spine, two arms and two legs and not one finger, so
every finger bone walks through the retarget as identity, which is the BIND
pose, and this rig binds with the hands flat and open. Rendered CLOSE ON THE
RIGHT FIST at four frames of the side cut, the tsuka floats past a splayed palm
on every one of them. That is "it's not in his hand", and no distance test
could have found it: measured on the MESH, the nearest sword vertex to the fist
is 0.026 on every frame of every clip, because the sword is pinned to the hand
and the hand is simply open. **A DISTANCE FROM A BONE IS NOT A GRIP. Render the
fist.**

**AND THE CURL SIGN IS DERIVED, NOT REASONED ABOUT.** This file has twice
shipped a hand bending backwards over its own knuckles on the strength of an
axis convention read off a rig. The sign is now taken per bone by the one test
with no convention in it: a closed fist brings the fingertip back toward the
WRIST and an open one extends it away, so the sign is whichever shortens that
distance. A mirrored rig gets the right answer on both hands by construction.

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

**AND "HIS HEAD IS IN HIS BODY" WAS THE COLLARBONE, WHICH IS A IS NOT T.** The
delta transfer says "turn this bone by the rotation the source's bone
underwent", and that is only the same POSE if the two bones start in the same
place. Measured between these two rests in world: the arms agree to 7 degrees,
the shins to 3, the toes to 0 — and the CLAVICLES are 24 apart, because this
artist drew a collarbone pointing up and out (0.84, 0.49, 0.22) where Mixamo's
points nearly straight out (0.98, 0.21, -0.05). Give a bone that starts 24
degrees high the rotation a bone that starts flat underwent and it STAYS 24
degrees high, on every frame, for ever. On a man in a shirt nobody would see
it; on a man in a kabuto with sode the size of dinner plates the shoulder
armour rides up over the neck guard and swallows his head.

Measured as the clavicle's outer end above the top of the chest, over its own
length:

| | source | shipped before | shipped after |
|---|---|---|---|
| idle | +0.01 | +0.18 | +0.01 |
| side cut | +0.01 (max +0.02) | +0.20 (max +0.34) | +0.04 (max +0.21) |
| overhead | +0.01 | +0.23 (max +0.38) | +0.12 (max +0.30) |
| block | +0.01 | +0.23 (max +0.33) | +0.07 (max +0.18) |

Every source clip holds its clavicle dead flat on every frame. The residual on
the swings is a raised arm lifting its own shoulder, which a real body does.

**AND THE ALIGNMENT IS ONLY FOR A TRUE COUNTERPART.** It is applied to the
shoulder, upper arm, forearm, hand, thigh, shin, foot and toe, and NOT to the
pelvis or the spine. `DEF-pelvis.L` is mapped to `Hips` as a STAND-IN — not
because it is a hip — and its rest differs by 47 degrees for exactly that
reason, so aligning it would swing both scabbards and the sash off his waist.
The spine's differences are the curve of a back, which is the artist's and not
an error. **An alignment is a claim that two bones are the same bone.**

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

**TWO MEN AT THE BAR, AND THEY FIGHT EACH OTHER — WHICH THE FIGHT CODE HAD
NEVER DONE.** Wong the barman (davisthegamelord's, CC-BY-4.0, `assets/wong.glb`
through `gltfpack.py`) stands in the mouth of the barrel rack; the drunk (the
owner's "Monster1_1", `tools/drunk_pack.py`) stands at its front. When the room
has landed both of them, the drink goes across the bar, the drunk takes it,
nearly goes over, raises it and puts it through the floor, and the two go for
each other until one is dead — and the survivor comes for you. What it took:

- **EVERY DISTANCE IN THE FIGHT WAS MEASURED TO THE CAMERA**, because until
  now the player was the only thing anything fought. `u.st.foe` is another
  unit; `mutFoePos(u)` answers its head where the player's eye would be, and
  the chase, the sweep (`blowLands`), the aim (`aimBar`, `aimLimb`), the
  flank and the token all ask it — a creature with a foe of its own takes no
  turn from you, stands at arm's length rather than the pack's polite two
  and a half metres (`mutSeparate`: measured, at 2.6 m they swung at the
  air), and lands its blow through `mutLandBlow`, which is `hurtMutant`
  with a `from`. **And a blow that was not yours carries no feedback for
  your hands**: every `bossHit` and `addTrauma` in `hurtMutant` is gated on
  `mine`, or the lens punched every time the drunk landed one on Wong.
  Whoever YOU hit drops his quarrel and locks on to you (`foe = null`).
- **BOTH RIGS ARE RIGS THIS FILE ALREADY MAPS.** Wong is a Character
  Creator export — the witness's bone naming with this export's own numeric
  suffixes (`_052` where the alien has `_050`: read them off the file, never
  copy a table); the drunk is an Unreal mannequin, the knight's naming to
  the bone with three spine joints instead of five. So `ntarRetarget` puts
  the Male Locomotion Pack on one and the Male Drunk Pack on the other with
  no new machinery (`tools/ntar_moves.py -- wong` / `-- drunk`, every clip
  in each folder, all de-yawed because the game turns them), and because a
  retargeted delta knows nothing about whose skeleton it lands on, the
  knight's and the alien's pulls fit both: the punch, the sweep, the jump,
  the turn, the compass kick, the handspring, the hit reels, the fall and
  the get-up. The two move sets are cut so no swing is shared (`alias`
  maps `wPunch` → `kPunch`, `dSwipe` → `kSwipe` and so on), and one blow
  each is written on the pack's own idle — `poseRig` takes a null clip now,
  because Wong's file carries none at all and the bind pose is the only
  stance there is until his idle has been retargeted.
- **THE DRUNK LAY ON HIS SIDE, TWO METRES LONG AND FOUR TIMES TOO BIG, AND
  IT WAS THE EXPORT.** Three packs before the right one. The FBX parents
  fourteen meshes at scale 10 under an armature at 0.001 (a 3ds Max
  arrangement) and the glTF exporter wrote the joined mesh a tenth the size
  of its bones; the shipped `.blend` has the clean rig, but its armature
  OBJECT carries the importer's quarter turn and the rig a `root` bone
  turned half round, and exported like that the pelvis came out along -z —
  measured on the raw file with `applyBoneTransform`: 0.4 m tall, 1.88 m
  across, which `dressMutant` then scaled up 4.6 times to make "tall" and
  the fight tore into black ribbons across the room. **Apply the armature's
  ROTATION only** (`tools/drunk_pack.py`): applying its scale as well
  collapsed the skin to two centimetres. Measure a packed rig off its
  skinned vertices before anything else looks at it — `Box3.setFromObject`
  on a skinned mesh reads the bind pose through the node chain and says
  nothing, and the first primitive's POSITION range is one belt.
- **A FILE WHOSE FRONT IS NOT +Z IS TURNED ON A PIVOT** (`kind.faceFix`),
  never on the model, whose yaw the aim owns and zeroes every frame. Both
  of these measured +Z off their own toes, so it is zero.
- **THE HALL IS THE ARENA.** The model's grid runs on past the arch into
  rooms nobody walks; measured, the two fought their way fifteen metres out
  of the door in ten seconds. `mutClampX`'s `tav` branch clamps to the hall
  and holds them with the tavern's own site (`pushOutOfKeep`,
  `keepWallPush`), damped the knight's way; `tavSteer` is the Dealer's fan
  on the keep's machinery, a one-point route round whatever shuts the line.
  Measured after, thirty seconds hands-off: 0 frames outside, distance
  0.71–2.74 m, 24 and 20 swings, the drunk dead at the end of it.
- **AND THEY GLITCHED BECAUSE TWO RULES DISAGREED ABOUT A METRE.** Measured
  over twenty seconds of the two of them: 72 and 88 reversals of direction
  and two clip changes a second. The lunge drove each in to `lungeStop`
  0.95 while `mutSeparate` pushed foes back out to 1.25, sixty times a
  second; the shuffle (`restless`) re-armed between every swing; the gait
  was redrawn at every change of mind; and `speedK` 1.28 on the pack's
  4.6 m/s played a man's 3.7 m/s run clip half again too fast. The lunge
  stops where the separation holds them (1.05 / 1.10), the shuffle is off,
  circling and the size-up are rare, a man turns no faster than the knight,
  the pace is a man's (0.92 / 0.82), and `kind.fade` gives them a 0.24 s
  crossfade in `mutPlay`. After: 2 and 10 reversals, no step over 0.19 m.
- **AND THE PLAYER SLIDES ROUND THE FURNITURE.** Keeping one axis of a
  refused move is right against a flat wall and wrong against chairs,
  round tables and barrels; the tavern turns the move a little at a time,
  the church's rule. Measured, walking obliquely into the pedestal table,
  the end wall and a row of chairs: 3.7, 2.2 and 4.2 m in a second where
  the axis rule stopped you.
- **AND A CREATURE THAT IS AWAKE IS AWAKE BETWEEN TOOL CALLS.** The
  survivor turned on the player standing at the spawn and killed him
  while the next call was being written; the page reloaded and the next
  measurement ran against a fresh title card. `setInterval(heal)` in the
  page, not `heal()` in the loop.

**"STUCK IN THE GROUND" WAS A FLOOR NOBODY COULD STAND UNDER.** The storey
repair puts back a level a cell's neighbours agree on, with the roof the
NEIGHBOURS see — so under every table, the bar and the rack's shelves it
wrote flags with a roof twelve metres up while the table's underside is
eighty centimetres over them. The walk then offered those cells, the camera
duck read the drawn roof and put the eye at knee height. `pruneTavStoreys`
asks every storey what is drawn over it (`keepDrawnFloor`, five points, up
to 1.30 m) and drops it: 2,894 gone, and every one of them was a place you
could walk into and not stand up in.

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

**THE BAR FIGHT MOVED TO THE BAR, AND THE POCKET BEHIND ONE IS A DEAD END.**
"Make the sea-keep script event be by the bar with the meat — they are in the
wrong spot." They were: the two stood in the middle of the floor on the rug.
There is exactly one bar in this hall and it was never typed in, it was PROBED
— a downward raycast on a half-metre grid over the whole floor, asking what
surfaces stand between 0.7 and 1.45 m. One answer is seven metres long: a top
at 0.99 running x -1.5..-0.75 by z -6..+1.5 against the east wall, with the
kegs behind it and, let into the wall at z = -2, the shelf of cuts that is the
"meat". Wong stands in the barman's pocket, the drunk at the rail, and the meat
is the backdrop to the whole beat.

- **AND THE POCKET IS 0.65 m BY 3, SHUT ON EVERY SIDE.** Measured with the
  walk's own standability test: the counter one way, the kegs at one end, its
  own return at the other. A creature put there could never reach the fight —
  which would have been the owner's "they keep getting stuck" made worse, not
  better. He does not walk out of it: he VAULTS, which is what a barman does
  and what his own file already had a clip for. It is a scripted beat and owns
  his position and his mixer for its length (the knockdown's arrangement), so
  nothing else can argue with it.
- **AND IT WAITS FOR YOU.** The bar is seventeen metres from the door, so on
  the old clock the drink went across, the glass went down and the fight was
  under way before the player had taken ten steps. Nothing starts until you
  are within `TAV_SCENE_NEAR` of the drunk.

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

**AND A LEDGE WITH A BREAK IN IT IS A PLANK.** "Put a barrel to get to the
first concrete tunnel, then a piece of wood plank to walk to the other side —
make the plank have physics and you have to lift it and lay it down." Where
the break is was measured rather than invented: out of the gallery at 5.3 m a
stone ledge runs east along the south wall, 4.53 where you drop onto it easing
to 4.14 at x = -4.5 — and then NOTHING from -4.25 to -2.25, with the flags four
metres below, and 4.36 again at -2.0 running on to the east wall. Two and a
quarter metres of air.

- **THE PLANK IS A REAL BODY** (`makeProp`), so it falls, you pick it up with
  E, you carry it up the crates and you can throw it off and go back down for
  it. LAYING it is its own verb at the break, under the crosshair, because a
  2.7 m board dropped by hand onto a 0.4 m ledge is a board in the hall.
- **AND IT IS A FLOOR THE KEEP'S OWN WAY.** `S.extra()` is the hook the moored
  boat and the hoist's car already use; the plank joins it and every question
  the walk asks answers with it, with no second code path.
- **AND A HEIGHT IN THIS ROOM IS OVER THE FLAGS, NOT OVER `TAV_Y`.** Written
  as `TAV_Y + top` the board's floor sat three metres under the hall and the
  walk never saw it, while the drawn plank was somewhere else again. Every
  height in here is `TAV_Y + TAV_FLOOR + …`. Measured after: the walk along
  the ledge stops dead at x = -4.44 without it and reaches -1.44 with it.
- **AND A RUNG IS ONLY A RUNG IF SOMETHING IS ABOVE IT.** The barrel's spot is
  searched for, not typed: the nearest place to the stack's foot that is the
  FLAGS, has a body's room round it, nothing drawn overhead — and something
  0.95-1.60 m up within a stride, or it is a barrel standing in the open
  rather than the first step of a climb.

**AND EVERY CLOSE SWING IN THE TAVERN IS `real` NOW.** Their clips are about a
second and the startups they were mapped onto are longer, so the whole wind-up
played at a fraction of real speed — SCP-096's "slow-mo" on a third creature,
and most of what "the animations look weird" was.

**AND THE BLOW HAS TO ARRIVE AT YOU, WHICH IS A DISTANCE YOU MEASURE.** Caught
on the frame the game deals the damage, over a fight played hands-off at the
bar, the striking chain's nearest joint against the player's chest:

| | before | after |
|---|---|---|
| wPunch | 1.34 m | 0.87 |
| wJab | 0.72 | 0.47 |
| dButt | 0.76 | 0.29 |
| dSwipe | 0.92 | 1.10 |

`lungeStop` was 1.10 against a 0.45 m body — 0.65 m of daylight outside his own
shoulders, with `landSlop` giving him the benefit of the doubt anyway, so the
game said he hit you and the picture said he did not. 0.84 and 0.55, `aimK`
1.40 to 2.90 (these are real Mixamo arcs, not poses solved against a target, so
they pass wider than an authored swing — the samurai needed 2.60 for the same
reason), and a per-swing `stop` on the straight punch, which was the worst of
them. The drunk's sweep is still wide and is the one left to fix. Measured
after: 46 damage a minute against the Dealer's 40, and 11 % of frames still.
Health came down with it — Wong 28 to 15, the drunk 34 to 18 — so the bar
fight is over in twenty seconds and whoever wins can be finished.

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

**AND ONE JUMP BROKE EVERY TABLE IN THE ROOM.** `Box3.setFromObject` reads
the geometry's bounds, and a piece lifted out of a scan by index SHARES the
whole model's position attribute — so every table measured as a box the size
of the hall. In `stompBreakables`'s loose branch (which runs every airborne
frame in the tavern and the undercroft) that put the player "beside" all five
of them at once, and one jump anywhere in the room took the lot, one a frame.
A breakable may carry its own `box`; measured after, ninety airborne frames
at the far end of the hall break nothing.

**AND A ROUTE OVER A GRID OF POINTS IS NOT A ROUTE A BODY CAN WALK.** The
tavern's routing grid asked `keepWallNear` at 0.34 m while a fighter's own
clamp uses 0.675, so the route threaded gaps the body is too wide for.
Measured hands-off from the spawn: the drunk won the bar fight, set off after
the player, and ground to a halt **7.1 m short of him** on a cell the route
called clear and his own body was inside — and a path that exists and cannot
be walked is worse than none, because the progress test only re-issues it.
Asked at the body's width (`TAV_G.body`) the arena is 1,279 cells of 1,486
and every one of them can be stood in. Measured after: the survivor crosses
the whole hall and closes to **0.60 m** at the spawn, and lands.

**AND NOBODY FIGHTS FROM A POCKET.** Flooded from Wong's own spot behind the
counter, 17 of the hall's walkable cells were reachable: the barman's pocket
is 0.65 m by 3 and shut on every side, so whoever stands in it can route
nowhere and the fight simply stops. The Dealer's `mainRegion` on a bigger
room — the largest connected piece of floor is the arena, and anything off it
is walked back on at a stride a frame. It costs nothing anywhere else,
because on the arena it never runs.

**THE PLANK IS A FLOOR WHEREVER IT LIES, AND A RAMP WHERE YOU LEAN IT.** It
used to be a floor only once it had been laid across the break — so the board
you carried about was a thing you could not stand on, which is the one thing
a plank is for. Its top surface is sampled along its length into a chain of
little boxes the walk reads like any other floor: flat where it lies flat,
and a STAIR where it is propped, which is what makes a ramp walkable without
the walk having to learn about slopes. Measured on the hex-crate stack: it
props from the flags at 7.42 to a lip at 8.70 and climbs in 11 cm steps, 7.65
→ 8.80, walkable end to end. The prompt cannot live at a fixed spot — the
ledge is wherever you are looking — so its proxy is MOVED to whatever lip is
in front of you each frame, between a big step and a body's height and near
enough for the plank to span.

Three things it took, and the first is general:

- **A BODY MAY NOT STAND ON ITSELF.** The plank publishes its own top as a
  floor, and the floor lookup a body does for ITSELF then finds it, rests on
  it, and climbs a tenth of a metre a frame for ever: measured, it went up
  eight metres before the first frame was drawn. `_selfProp` is set round the
  floor queries in `PhysProp.step` and the plank's own boxes are withheld
  from it.
- **PINNED, NOT DEAD.** A body laid down as a floor is masonry while it lies
  there and a body again the moment you pick it up — `dead` cannot be picked
  up, and the one thing a thing you put down has to let you do is take it
  back.
- **AND A ROOM OF DRAWN STONE IS NOT A BOX.** `confine` is four planes and a
  lid, which is the bunker; a tavern is arches, a counter, a rack and a
  stair. A body may carry its own `wall` — the same drawn-face push the walk
  is held by. Measured: hurled at 26 m/s down the hall the plank stops at
  x = -19.77 against a wall at -20.4 and rests 0.09 m over the flags, where
  it used to go through both.
- **AND THE ROUTING GRID IS NOT THE PLANK'S FLOOR.** The floor cache is
  cheap and is redone whenever the plank moves; `TAV_G` is 2,242 cells of
  `keepStandAt` and `keepWallNear` and may only be rebuilt when the plank
  comes to REST somewhere that matters.

**LIQUOR ON THE BAR AND ON THE TABLES.** Glass has broken in this game since
the beach floats went in, so a bottle is almost nothing: a lathe, a label,
and the same `makeProp` that gives every prop its pick-up and its throw. What
is its own is the SHELF — a body knows one ground and a bar top is not it —
so each carries a `floorAt` that answers for its own perch and stops
answering the moment it is knocked off it, which is exactly when it should
fall. Break the table under one and it lands on the flags and goes there.
Twenty of them, every spot asked of the DRAWN floor rather than typed.

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

**A BAR FIGHT DOES NOT STAY AT THE BAR.** A pair of fighters hold their own
distance and nothing ever moves the PAIR, so the two of them circled each
other on the spot they started on for the whole fight. The pair has a
wandering anchor now — a cell of the arena picked every five to ten seconds,
at least five metres from the last — and while they are each other's problem
they both lean toward it. Measured: the fight ranges over 9 m of x and 6.6 m
of z instead of 2. **AND NEVER THROUGH A SWING**: the first roam moved both
of them on every frame including the strike, and a blow measured against a
body that is being slid sideways lands on nothing — forty seconds of
fighting and not one point of damage between them.

**AND A JITTER ON BOTH IS NOT THE SAME AS A DIFFERENT WINNER.** Rolling each
one's health and aggression independently left Wong winning anyway, because
his move set out-damages the drunk's whatever the health. The roll that
matters is WHICH OF THEM has the night: one is favoured heavily (+25 %
health, +40 % aggression, +30 % guard and a 45 % chance of a two-point
blow) and the other is not, with a jitter over the top so no two fights run
the same length.

**AND A BOTTLE THROWN AT A MAN HITS THE MAN.** Every prop in the hall stops
at the drawn stone already; nothing knew about the two fighting in the
middle of it, so a bottle hurled at the drunk went through him and broke on
the wall behind. A body in flight that reaches a live one is a blow — the
bottle goes, a point of whoever it landed on goes, and he drops his quarrel
and turns on you for it, which is what a bottle thrown into a bar fight is
for.

**AND A MAN HOLDING HIS DISTANCE MUST NOT STRIDE STRAIGHT AHEAD — the oldest
animation bug in this file, found in the drunk.** His `strafeL`/`strafeR`
were both the WALK, so the half of a fight he spends circling was a man
walking forwards while travelling sideways. The Male Drunk Pack ships no
sideways stride at all, so what he circles on is the nearest true thing it
does have: a walk on a CURVE one way and a backward one on a curve the
other, which on a man this far gone reads better than a side-step would
anyway. Both rates come off the clips' own measured travel, as everything
else here does.

**AND PUTTING THE PLANK DOWN IN FRONT OF A LEDGE IS PROPPING IT.** The verb
under the crosshair stays, but nobody should have to find a prompt to do the
obvious thing with a plank and a step. The reach grew to 3.3 m and the rise
to 2.35, which is the most the stepped floor boxes can carry at the plank's
own length. Measured on the stall roof: it props from 11.00 to the vaulted
passage's lip at 12.82 — a 1.82 m rise over a 2.04 m run — and you walk up
it and in.

**AND A SHELF ON THE STOREROOM WALL.** Measured, the roof of the stall reads
3.56 over the flags and the passage's floor 5.30 — a 1.74 m step, where a
jump lifts the feet 0.62 and the walk catches a floor 0.72 over them, so
1.34 is the most anybody can get up without the plank. A bracketed board
halfway up that face is 0.87 either side of it, which is a jump twice; and a
shelf by the mouth of a store is what would be there anyway, which is the
whole of making it look like the room rather than like a step. Both floors
it stands between are asked of the DRAWN geometry, so it cannot be built
where there is no step. Measured: roof 11.08 → shelf 11.99 → passage 12.82,
each one inside a jump.

**THE DOOR IS CUT TO THE ARCH, AND THE ARCH IS MEASURED.** "Make this line up
perfectly with the stone arch, don't add any stone yourself" is one job, and
the reason the first door needed a surround of its own is that it was built to
numbers somebody typed: 2.62 m wide, springing at 2.20, radius 1.31, against an
opening that is actually **3.84 m wide, 4.05 m to the crown**. Three quarters of
the width, off-centre by half a metre, and a ring of invented voussoirs round
it to hide the difference.

Nothing about it is written down now. Rays go at the wall from a hand in front
of its moulding: the recess behind the arch is at x = -20.40, the wall's face at
-20.11 and the moulding at -19.82, so a hit past -20.31 is INSIDE the opening
and anything nearer is outside it, and bisection between the two gives the
jambs and then the head over every plank's own middle. The leaves are built to
that profile and to nothing else, set a finger back into the reveal so the
model's arch frames them. **And a semicircle fitted through the crown and the
springing is not good enough**: this is a SketchUp polygon, and the circle
through its own crown (11.599) and half-width (1.919) stands up to five
centimetres proud of the real head all the way round — which is exactly the
sliver of daylight a shut door is judged by. Measure the profile, do not fit it.
The two meshes it cuts through are found once with a handful of rays and asked
directly after that, or the bisection is a hundred thousand bounding spheres.

**AND THE LEDGE ALONG THE SOUTH WALL IS NOT A LEDGE, IT IS A CARPET.** Four and
a half metres up, hung over a beam: two of them, `TextureMaterial_4`, x -7.64 to
-4.57 and -2.08 to 0.99, and the only thing up there to stand on is the rolled
top of the cloth. The packer samples what is DRAWN, so the walkable strip came
out **0.40 m wide against a body 0.52 across** — measured, a floor at 4.5 from
z -6.62 to -6.22 and nothing either side, so the push-out took you off it every
time. That is "I keep clipping through". `openTavCurtains` widens it to the
carpet's own plan and a hand's breadth beyond, at the height the cloth is
actually drawn at, cell by cell, REPLACING the packer's narrow storeys rather
than adding to them (a duplicate storey a centimetre away is a coin toss over
which one `keepFloorAt` returns, and the packer's carries a roof). Measured
after: 0.8 m of catwalk, walked hands-off from the passage to the break with no
stall. The gap between the two is 2.49 m and the jump clears it — 0.78 s of
flight against a 3.4 m/s walk — with the jump pressed anywhere in a 0.13 s
window, and comfortably at a run.

**AND THE PLANK IS A HALF-LIFE PUZZLE, NOT A PROMPT.** "Lay the plank across"
at the break and "prop the plank as a ramp" at whatever lip you were looking at
were both built and both deleted: what the owner asked for is to put it there
himself. So there are no verbs and no snapping, and what took their place is
the one thing the body had never had — **a LENGTH**.

Every other prop in this game is a point and a radius, which is right for a
bottle and is exactly why a three-metre board lay half inside the masonry in
every screenshot. It is sampled along its axis instead, and all three questions
are the same question asked eleven times:

- **what holds it up** — `floorAt` is asked at the middle and answers for the
  whole board: the support under each sample less that sample's own height
  above the middle, and the highest of those. Across the gap that is the two
  carpets; against a step it is the step.
- **which way it lies** — the end with nothing under it FALLS, an accelerating
  turn about the end that is bearing. Nothing is told what a ramp is: drop it
  against a step and it becomes one, drop it across the gap and it lies flat.
- **what stops it** — the drawn stone at every sample. **THE BAND IS OVER THE
  BOARD, NOT ROUND IT**: read at the plank's own middle it takes in the last few
  centimetres of whatever the plank is RESTING on, and the two carpets it is
  meant to bridge are cloth hanging as vertical as a wall, so the board was
  shoved off the very thing it had just landed on and fell into the gap. And it
  is the **deepest sample, asked again — never the sum**: a plank lying across
  two posts is pushed one way at one end and the other way at the other, and
  the resultant of those is nothing at all (the Dealer's chair, in timber).
- **ELEVEN SAMPLES, NOT FIVE.** At five they are 0.8 m apart and a pier between
  two of them is a pier the board lies straight through. Measured over 104 drops
  round the hall, with five samples and a summed push 26 came to rest with drawn
  stone inside the timber; with eleven and the deepest-first push, **6**, and
  every one of those is a board wedged between two posts.

Held, it points where you look and rides level, so you aim at the gap and the
board is already across it. Measured end to end on the real path — stand at the
west lip, look across, carry, let go — it lands at 4.38 spanning the break and
the walk east over it runs from x -5.4 to +0.7 without a fall. It costs 0.01 ms
a frame.

**AND A BODY IN A ROOM YOU HAVE LEFT DOES NOTHING.** Nothing gates `physProps`
by distance, so the moment you sail home every bottle on the tavern's bar and
the plank on its ledge lost the floor that was answering for them and fell six
kilometres to the beach's own zero. `opts.room` is a body's own "am I in the
room", checked first in `step`.

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

**AND THE SHELF MOVED TO THE END OF THE WALL YOU ACTUALLY WALK TO.** It stood at
x = -11.0, a stride from the crate that already climbs the same 1.74 m step from
the stall roof to the vaulted passage — two ways up in the same place and none
at the end the owner was standing at, which is why he was propping the plank
there. At x = -9.4 it splits that face too: 3.56 → 4.47 → 5.30, each one inside
a 1.34 m jump, measured by jumping it.

**WHERE A BOARD COMES TO REST IS A LINE OVER ITS SUPPORTS, AND THAT IS AN LP.**
The first physics plank asked its two ENDS what they were standing on and turned
about whichever was bearing. That is right for a board lying across a gap and
wrong for every other way one can land — a lump under its middle with both ends
free, a step under a third of it, half of it on a crate — and what it drew was a
board hanging level in mid-air with one end in the stone, which is what the
owner photographed.

Write each sample's support as a point (u, h) in the plank's own frame. The
board is the line y = c + m·u, it may not pass through any support, so
c + m·u_i >= h_i for every one of them, and gravity picks the lowest middle:
minimise c. Two variables, c(m) convex and piecewise-linear, so the minimum is
at a breakpoint — a line touching two supports — or at the steepest slope a
plank may lie at (0.97; past that it slides rather than standing on end).
Fifty-five pairs over eleven samples is nothing, and it is exact: the board
rests on the UPPER CONVEX HULL of what is under it. `floorAt` is the same line
EVALUATED at the slope it is lying at now rather than solved, so the centre
follows the turn instead of snapping. Nothing is told what a ramp is: measured
over 104 drops round the hall, 15 come to rest as a slope, and the one over the
bar's edge runs 0.09 → 1.45 and walks end to end.

**AND `_selfProp` IS SET AROUND THE PHYSICS' OWN FLOOR QUERY AND NOTHING
ELSE.** The solve asked the same question from the settle, where it is null —
so the board found its OWN published top surface under every sample, read them
all as level, and solved a flat line. A plank dropped over the edge of the bar
lay across it in the air. The guard belongs in the one place both callers pass
through, not at the call sites.

**AND A CARRIED BOARD IS PULLED IN BY WHAT IS IN FRONT OF IT.** This is the
whole of how it ended up lying inside the masonry, and no amount of push-out
could have fixed it: three metres of plank pointing where you look, carried up
to a wall, reaches a metre and a half INTO it — and `keepWallNear` only looks a
quarter of a metre round a sample, so once the board is half a metre deep in the
stone there is no face near enough to push it back out, and letting go there
leaves it in the wall for good. Half-Life's own answer is that the thing you are
holding comes back toward you: a segment from the camera along the board's axis,
bisected for the first face, and the hold pulled in so the far end stops short
of it. Measured facing five walls: released, 0 of 5 leave any part of the board
inside drawn stone. **And it may not pass through a wall between frames either**
— a hard throw moves it a third of a metre a step, so the move is tested as a
segment and reverted if it crossed a face, the player's own rule.

**AND THE CHAIRS HAD THEIR BACKS TO THE TABLES.** A chair is built with its
posts and slats at local -z, so its front is +z, and `-a + PI/2` points that
front straight out at the room. A group's local +Z lands on (sin, cos) of its
yaw and the table is at -(cos a, sin a) from the chair, so the yaw is
atan2(-cos a, -sin a) = **-a - PI/2**. Measured: the chair at (-2.26, 3.83)
faces (-0.921, -0.390), which is its table at (-3.46, 3.32) to three decimal
places.

**AND THE SHELF IS GONE.** It was built to split the 1.74 m step from the stall
roof to the vaulted passage into two jumps, then moved along that wall, and the
owner's word the second time was to take it out. The file's own crate on the
roof climbs the same step, and the plank climbs it from anywhere, which is the
point of carrying a plank.

**A LIP IS NOT A WALL, AND THAT IS A QUESTION ABOUT THE FACE'S OWN CROWN.**
The plank would not lay as a ramp up to the vaulted passage, and the reason is
the one every push-out in this file eventually meets: the thing a board leans
ON is, in plan, a face right beside it. Traced station by station, the riser of
the 1.74 m step into the passage tops out FOUR CENTIMETRES above the station
resting against it — so a band starting a finger over the timber read it as a
wall, pushed the board sideways a quarter of a metre a frame, and walked the
ramp off the stall roof and into the hall.

Raising the band until it cleared that riser works and is the wrong fix: it
lets the board through everything else as well (0 of 104 drops came to rest in
stone at the tight band, **12** at the raised one). The band is opened DOWNWARD
instead and the face is judged by its TOP — `keepWallNear` returns `yhi` of the
triangle it picked, which it has had all along — so anything whose crown is
under a hand's breadth over the timber is a lip the timber lies across, and
anything taller is a wall. Measured after: the ramp stands (3.61 → 6.10 over
the passage lip, walked from the stall roof into the tunnel and on to its far
end), the bar's edge still gives a ramp (0.09 → 1.45), the gap is still
bridged, and **0 of 104 drops** leave any part of the board inside drawn stone.

Two smaller things came out of the same pass. **A station is a cross-section,
not a disc**: the timber is half a metre wide ACROSS its axis and nothing at
all along it, so an interior station is pushed across by however much the face
really is inside the width, and only the two ENDS keep the whole push — an end
driven into masonry is the one case where along IS the overlap. And **a
teleport is not a frame's motion**: the between-frames segment test reverts a
move that crossed a face, which on a body picked up and put down somewhere else
entirely (a restore, the harness) reverted it to wherever it had last been
lying. It is skipped past a metre.

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

**AND TWO JARS OF BLUE BLOOD AT THE END OF THE PASSAGE.** It runs six metres
back over the stall and stops at a blind wall, so there has never been anything
down there to have gone for. The far end is FOUND — the last station the walk
still has a floor at — and the jars are the beach's own `dropJar`, which now
takes a height, so the count in the corner and the stack in the pack cannot get
out of step with what the first cache hands out.

**THE CLIMB STOPPED ON ONE CRATE, AND THE PLANK WOULD NOT LIE AS A RAMP.**
Three reports, and the first two are one arithmetic each.

- **A RUNG AT THE LIMIT OF A JUMP IS A RUNG THAT DOES NOT WORK.** A jump lifts
  the feet 0.62 and the walk catches a floor `TAV_AIR` (0.72) under them, so
  1.34 m is the tallest step there is — and the barrel rack's top is 3.53
  against a crate whose top was 2.21. **That is 1.35.** One centimetre, and
  the route to the gallery ended on that crate, which is where the owner was
  stuck. Nor is 1.34 any better: the window in which a ledge is both catchable
  and not a wall is then the last centimetre of the arc and there is no time
  inside it to travel. The crate is the rung, so the crate is what changes —
  a taller box, top 2.49, which splits 1.44 → 3.53 into two jumps of 1.05 and
  1.04 with a third of a metre of arc to spare on each. Measured after: every
  rung of the climb reached, the rack from the crate on 8 of 9 approaches.
- **AND THE PUSH-OUT AND THE STEP-UP MUST USE THE SAME TOLERANCE — the beach's
  own rule (`ROCK_STEP`), which the keep's walk never got.** `up` is a stride
  on the ground and a JUMP in the air, and `keepWallPush` always read the
  standing step: airborne, anything more than a stride over your feet was
  still a wall pushing you off it. Measured, that capped what anyone could
  climb onto at 1.08 m against the 1.34 the jump reaches. It takes `up` now,
  and the island gets it too — where it also means a bank you are wading out
  of stops shoving you back into the sea.
- **AND THE CROWN WAS WRITTEN INTO THE WRONG FUNCTION.** "A lip is not a wall,
  which is a question about the face's own crown" was added to `dojoWallNear`
  and never to `keepWallNear`, so every reader here got `undefined` — and
  `undefined < anything` is false, which made every kerb, step and stall lip
  in the tavern a full wall to the plank. **The one rule that lets a board lie
  ACROSS a step had never once run**, and with it off the ramp cannot form at
  all (measured: pitch 0, the board flat on the floor, from every stand-off).
  And a hand's breadth of slack — the number this file used to claim — is
  0.08 m of stone through the top edge of the timber: a lip is something the
  board lies ON, so the crown may stand no higher than the board's own middle.
- **A STATION IS A BOX, AND A BODY COMES OUT OF A BOX THE SHORT WAY.** The
  cross-section rule answered a face DEAD AHEAD of a station — which is what
  the riser of a step is to the station leaning on it — with the FULL
  half-width sideways, and five iterations of that walked the ramp a metre and
  a quarter off the ledge in a single frame. That is the board "flying away"
  the moment it is put down. Each station is 0.32 m of board by 0.46 across,
  and it is ejected along whichever overlap is smaller. **And the plan axis has
  to be a UNIT vector**: `a` is the axis in SPACE, so its horizontal part is
  only cos(pitch) long, and every distance measured against it came out a
  fifth short on a ramp — the along-tolerance GREW exactly as the board
  steepened, which is precisely when it must not.
- **AND WHICH WAY OUT IS A MEASUREMENT, NOT A DERIVATION.** Three readings of
  the same code, over eighty drops round the hall and sixteen carry-and-drops
  at the step: skipping the shallow-along case ships ramps and 8 of 80 boards
  with their centreline in stone; the old across-only push ships 3 of 80 and
  only 3 ramps in 16, sliding half a metre sideways in 6 of them; pushing
  ALONG when along is shallower ships **4 of 80 (the same as before this
  round), 6 ramps in 16 and not one board that slides**. The obvious variant
  was the wrong one and only the sweep said so.

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

**AND THE TAVERN IS THE THIRD ROOM TO NEED `clampPlayerToRoom`.** The bunker's
lesson, then the dojo's, now this: `updateTavern` reverts a step that leaves the
walk, and a creature's knockback is applied from `updateMutant`, which runs
AFTER it. Measured over three minutes of being hit by the orc, the player was
walked **thirteen metres out of the hall** — and then the fight simply stopped,
because a tavern creature is clamped to the arena and cannot follow, so the two
of them stood six metres apart doing nothing for the rest of the sample. A
measurement that ends with the fighters becalmed is measuring the room, not the
fight.

**THE ORC AT THE DRUNK'S SHOULDER, AND THE GREAT SWORD PACK ON HIM.** Oscar
Creativo's orc (CC-BY, `assets/orc.glb`) stands behind the drunk through the
whole of the drink, and the moment the glass goes through the floor he is in
it: two against one, they put the barman down, and then they both turn round.

- **HE IS SHIPPED EXACT, AND THAT IS NOT LAZINESS — IT IS THE ONLY WAY HE
  SURVIVES.** 305,522 triangles over 29 meshes at 17.2 MB. The decimation this
  repo uses for a rigged character is a Blender round trip, and this rip will
  not take one: **its inverse-bind matrices are IDENTITY and its rest pose is
  carried entirely by the NODE TRANSFORMS**, so Blender's importer rebuilds a
  different skeleton and writes that back. Measured on the round-tripped file,
  the right upper arm came out with a 175 cm offset from its own clavicle, the
  bind collapsed onto the origin (every bone at (0, 0.01, 0) — Wong's, for
  comparison, has its head at 1.59 and its hand at (0.36, 1.2, -0.56)), and
  every clip retargeted onto that exploded: arms out sideways, the sword two
  metres in front of his chest. `bone_heuristic='BLENDER'` does not save it.
  **If a rig's bind measures as nothing, stop packing and look at the file.**
- **AND HALF THE FILE WAS A TURNTABLE.** 32.3 MB, of which the shipped `Motion`
  clip was **14.9** against 11.7 of geometry and 5.4 of texture. He needs none
  of it — his bind is sane, and every clip he fights with is retargeted — so it
  goes, and with the metallic maps (METALNESS IS A TRAP, the sixth time) 450 MB
  of source becomes 17.2.
- **AND A CHANNEL THAT DRIVES SOMETHING THE PACKER HAS DROPPED IS A BROKEN
  CHANNEL.** The morph targets go with the attribute rebuild and the tracks
  that drove their weights stayed, so Blender's importer walked into
  `obj.data.shape_keys.id_type` on a mesh with no shape keys and died before a
  triangle arrived. `gltfpack.py` drops those channels now, and `--no-clips`
  drops the lot.

**AND A FACING IS A PROPERTY OF THE RIG, NOT OF THE CLIP.** `ntar_moves.py`
measures which way a clip faces off the TOES at frame 0, which is right when
frame 0 is a plain stand and nonsense otherwise: across one pack it ranged from
**-1.3 to -103.2 degrees** — a side step starts with the feet turned out, a
running start with them square to the travel. Applied as that clip's own
convention, each of those turns the whole move by that much, which is exactly
the "we've had problems replicating them before" the owner was pointing at.
Every clip in a pack shares one skeleton and one BIND pose, so the bind is
where the convention is read: all thirty of the orc's clips now come out on
**(0, -1, 0) -> +0.0 deg**, the same heading.

And every swing he has is measured rather than declared — the frame the
striking end is moving FASTEST, which is the reptilian rake's rule and the only
one that suits a two-handed cut (the blade is already out in front in the
stance, so there is no extreme of position): oCut 0.405, oCutC 0.407, oCutD
0.407, oChop 0.350, oSpin 0.533, oLeap 0.449, and the kick on the TOE at 0.367.
Which end it is, is per clip; two of these are legs.

**AND THE QUARREL IS A SIDE NOW, NOT A PAIRING.** `u.st.foe` made another
creature the thing every distance and aim is measured to, and with three in the
room it is re-read every frame: the pair both want Wong while he is alive, Wong
wants whichever of them is nearer, and the moment he goes down **neither of
them has a foe left** — which is `mutFoePos`'s own rule for turning on the
player. Nothing had to be written to make the last beat happen. A blow of YOURS
still takes its man out of the quarrel and gives him to you, and that is a flag
now (`st.mine`), because a room that re-reads its sides every frame would
otherwise hand him straight back.

**AND THE MAN THEY ARE BOTH ON KEEPS HIS OWN NUMBERS.** The nightly roll is
between the PAIR — which of them carries the fight — and Wong was getting the
loser's 0.70 every time simply because he could never be the favourite:
measured, he went down **a second and a half** after the glass broke and the
beat went past before you could read it. Two against one is what decides it
now. Measured: the fight opens at 5.3 s, Wong is down **14.9 s** later, and
both survivors lose their foe on that same frame.

**AND A BIG MAN WITH A LONG BLADE FIGHTS FURTHER OUT.** At the tavern's own
`body` (0.45, a man) and `lungeStop` 1.45 he held 1.16 m and **107 of 122
contacts landed off screen** — a two-metre orc standing on your toes puts every
blow under the picture, which is the knight's own lesson wearing armour. At
0.72 and 2.10 it is 69 of 129 on screen. Measured over three minutes against a
player who stands still: **43 swings and 43.3 damage a minute**, all six of his
swings used, the sword hand finishing a median 0.76 m from the chest. The
Dealer is 48 and 40.

**THE ORC'S SWORD WAS IN HIS FISTS THE WRONG WAY ROUND, AND EVERYTHING ELSE
ABOUT HIM FOLLOWED FROM THAT.** "The sword is facing the wrong way, all his
moves look bad, he stands like a statue" — four faults, all measured in the
pane before anything was touched:

- **AN UNMAPPED BONE INHERITS ITS BIND ANGLE, AND THE BIND HELD THE SWORD
  BACKWARDS.** The blade is weighted to `SWORD_0102` under his right hand,
  `kind.rag` does not name it, so every retargeted frame wrote `pW · bind.q`
  — the sword exactly as the artist parked it in the rest pose. Skinned and
  measured on the retargeted idle: a 2.04 m sword with the hands at 0.09 and
  0.21 along it and the point at -1.43, running DOWN AND BACK through his own
  legs, half a metre of pommel standing up where the blade should be, and
  the left hand nearer the point than the right. He cut with the handle.
  Which end is the blade is a fact about the sword (the far end from the
  hand); which way it leaves a fist is a fact about a FIST — the index side,
  never the pinky side — so `orcFixSword` measures the blade's own points,
  and if the point is on the pinky side (dot -0.94 against the index-to-pinky
  line) turns the sword end for end about the GRIP: a half turn about the
  line from the blade's spine to the hand, so the hand stays exactly where it
  is on the handle. It runs BEFORE `poseRig` captures the bind, so every clip
  inherits it, and it hangs a tip Object3D on the point (`u.bones.tip`) so
  `blowLands` and `aimBar` read the steel rather than a bar run out along the
  forearm — a great sword lies ACROSS the forearm, not along it. After: dot
  +0.94, the point 1.7 m ahead and 2.4 up, the left hand further from the
  blade than the right. And the seat is redone afterwards, because the
  point had been the lowest thing on him.
- **A TWO-HANDED WEAPON IS ONE GRIP, NOT TWO ARMS.** `twoHanded` turned both
  shoulders by their own correction, which is right for two claws and lets
  go of a handle. `kind.grip` corrects the sword arm and puts the other hand
  back where it was on the handle — its offset from the sword hand, turned
  by the correction that hand actually took. Measured: the hands hold 0.29 m
  apart idle and 0.29 through the aimed part of a cut.
- **THE STATUE WAS THE SOURCE CLIP.** Measured on `orc-moves.json`, the
  great-sword idle's biggest swing at any bone over its whole loop is 2.8
  degrees; in the game the head moved a centimetre in two seconds. And the
  idle pool never alternated: `drawGait` only runs when a creature sets off
  or stops, so a thing standing at reach played the one stand it drew for as
  long as it stood. Two things: `mutAnim`'s idle branch may swap idles when
  the loop comes round (a coin, for every kind with a pool), and
  `installLife` puts a layer on top of whatever clip is playing — a breath,
  his weight moving over his feet on two counts that never line up, and his
  head going to whoever he is watching (you, walking in, before the fight;
  his foe in it), off during a swing or a stun so the clip's read is never
  disturbed. It WRAPS THE MIXER: `PropertyMixer` only writes a bone when its
  value changed, so a held cock is stamped once and an offset composed every
  frame would accumulate (the witness's spine, 8 to 75 degrees) — what the
  mixer last wrote is put back before it runs, and the life goes on after.
  Measured asleep at the bar with the player 35 degrees off his front: head
  look 35 degrees, idle and idleB trading places.
- **AND HE FOUGHT FROM INSIDE HIS OWN SWORD.** Hands-off after the flip he
  closed to 1.2-1.4 m and chained from there for a minute, and nothing in
  the fight ever moved him back out — `near` is true inside `maxReach`, the
  chase never runs, and the tavern cast has no footwork between swings. The
  knight's `restless` shuffle (whose radial term walks him to `ring`) and
  every per-swing `stop` at two metres or more; `ease` on his swings so the
  wind-up loads and the strike accelerates into the contact instead of two
  velocity steps. Measured after, hands-off at fighting range with the
  camera tracking him: 43 contacts in 64 s, the sword hand on screen 43 of
  43 and the blade's middle 36 of 43, the steel's nearest point 0.06-0.54 m
  from the chest on every cut, 27 damage a minute, 3 % of frames still,
  fighting at 1.9-2.2 m.

Three harness lessons from the same round. **Freezing rAF kills the loop for
good** — `animate()` re-arms itself from inside the frame, so once a stubbed
rAF returns 0 nothing ever runs again, and `mutants` sat with `cool` frozen
at 0.4 looking exactly like a creature that would not fight; `__bw.animate`
is exposed so `__startLoop` can kick it. **A creature "measured" with the
token held by somebody parked out of the room never swings** — `mutToken`
went to Wong, moved 300 m away and awake, and the orc circled for ever with
`maySwing` false; kill the others (`alive = false`) and take them out of the
scene, do not just move them. **And "on screen" cannot be measured on the
point that reaches the chest**, because the chest IS the camera: project the
HAND and the blade's middle, the knight's way.

**AND THE TUNNEL'S WATER IS THE LAMP'S OWN HEX.** It shipped at 0x8a5c2e — the
altar lamp's hue at half its level — and on a mirror the base colour IS the
reflected colour, so it is 0xffa951 (the candles' point light) at full with
the metalness up to 0.93 so almost nothing is left over as diffuse.

**THE ORC SPUN AFTER HIS SWINGS, AND IT WAS THE AIM'S BODY YAW.** `aimBar`
turns the MODEL into a blow by the bearing of the striking end — right for a
crowbar, and measured on a two-metre sword: the moment the blade sweeps
THROUGH you the angle from his origin to the tip flips sign, so the model went
from -103 to +104 degrees between one frame and the next (153 and 168 degrees
of yaw in single frames, on every cut), and then unwound at the fade rate. At
`aimK` 2.60 the yaw had 104 degrees of authority to do it with. Three things:

- **A BODY TURNED INTO A BLOW STAYS TURNED.** The yaw tracks you only until
  the commit (four fifths of the wind, where `turn()` also stops), is HELD
  through the strike and the recovery, and when the swing is over — or the
  next one begins — it is ADDED to the heading and the model zeroed in the
  same frame, which nobody can see; `turn()` then brings him round at
  `turnMax`, which is a turn and not a snap.
- **AND THE TRACKING IS A TURN TOO.** The cock draws the blade across his
  body, so the tip's bearing crosses yours partway through the wind-up and the
  correction flips sign: -14 to +24 degrees between two frames. It may change
  no faster than `turnMax` a second now.
- **`yawK` IS ITS OWN NUMBER.** The shoulder may need 2.60 to close a metre
  on a real Mixamo arc; the body does not need to turn 104 degrees to help
  it. 0.75 on the orc (28 degrees), and his `turnMax` is 3.4 — the tavern's
  5.2 rad/s on two hundred kilos read as a man on a swivel.

Measured hands-off over fifty seconds: mean yaw per frame 8.8 degrees became
1.55, frames turning more than 20 degrees 108 became 21 (all of them the
spin's own root turn or the wind-up's crossing), swings and damage unchanged.

**THE TAVERN DREW THE OCEAN, AND ITS CHAIRS WERE A HUNDRED AND FIFTY DRAW
CALLS.** Profiled by hiding each scene child in turn, standing in the hall:
466 draw calls and 530k triangles, of which 115,200 were the OCEAN twelve
kilometres away (bigger than `SKYLINE_R`, in no far-prop list, so nothing
ever culled it), 325k the orc (shipped exact, and staying so), and 150 the
chairs — ten boxes each over fifteen chairs, for furniture, in a hall whose
own stone is a hundred and forty. `cullWorldInHall` runs for the tavern and
the keep as well and every frame from `animate`, so the restore on the way
out cannot be missed; a chair is ONE merged mesh until it breaks, with its
parts kept as data so the break builds each piece where it stood. 466 → 322
calls, 530k → 356k triangles.

**AND A TAVERN CREATURE NEVER LEAVES THE ARENA; A STEP OFF IT IS REFUSED.**
"They teleport back after running past the curtains and get stuck" was the
walk-back: a body off the main region was slid toward it at five centimetres
a frame, which is three metres a second of a creature moving without its
feet, and where the chase kept pushing it off — a 0.58 m bench it can step
onto that the grid excludes, the player standing somewhere it may not go —
the two argued for ever. The last place it stood ON the arena is remembered
and a frame that leaves it is put back there, a frame's step; the slide
stays only for a body with no such place yet. And `tavRoute` searches the
ARENA, not every free cell, so a pocket off it is never a destination.

**AND THE ARENA WAS SMALLER THAN THE ROOM.** Its box was the hall's own walls,
hand-set at z -5.9..6.9 — and the floor you can actually reach from the door,
flooded with a body's clearance, runs z -12.4..8.3: six and a half metres of
room SOUTH of the hall, behind the hanging carpets, that the player could
walk into and no creature could follow into. THAT is the spot in the owner's
screenshot. The box is the flood's box now (nothing reachable leaks west of
the door, measured), so the largest connected region is the whole floor.

**AND A CHECKPOINT AFTER THE THREE CRABS.** `updatePackSave`: the moment the
last of `packCrabs` is down, once a game, the same `saveCheckpoint`. A restore
from it puts the three back asleep out at sea, which is what that stretch
looks like once you have walked it. Measured in the pane: the trigger crossed
in dev mode, the three marked dead, `hasCheckpoint()` true at z = -217.

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

**THE CATACOMBS MONSTER, ON THE SAND PAST THE PORTAL.** The owner's "Weird
Creature" — a Rigify-rigged zombie, `Weird-Creature.blend` with the textures
PACKED and `Zombie.fbx` beside it — through `tools/crawler_pack.py` into
`assets/crawler.glb` (4.2 MB), and his crawl is the owner's Mixamo "Running
Crawl" through `tools/ntar_moves.py -- crawler`. He sits on all fours forty-
five metres past the stones (`CRAWL_X/Z`), notices you at seventeen
(`kind.wakeAt`, new: nothing on the beach had ever woken by distance), and is
half again your sprint. What it took:

- **THE FBX IS THE RIG TO SHIP, THE BLEND IS WHERE THE TEXTURES ARE.** The
  FBX carries `rig_deform`, a deform-only export of the blend's 943-bone
  Rigify rig — 175 DEF bones with their parents already resolved, which is
  the work `samurai_pack.py` had to do by hand (Rigify's face DEF bones hang
  off MCH controls the exporter drops) — and six meshes; but its textures
  point at a G: drive. The blend has them packed: unpacked with
  `image.save()` after `filepath_raw`, AO multiplied into the albedo with the
  opacity as its alpha (PIL alone — this machine's python has no numpy),
  1024 / 1024 / 512. The metallic map is 0.0 everywhere and is dropped. The
  albedo's mean is 120 against the mutants' 37, so it is multiplied DOWN
  (`tint` 0x8c8c8c) rather than re-baked, and it keeps its colour; the
  opacity is a cut-out (p5 of 246), so `cutout: true`, or a double-sided
  body blends against itself.
- **A CLIP THAT NEVER STANDS UP IS MEASURED FROM THE REST POSE.** `hipY` is
  the hips' offset from the clip's FIRST frame, right for every clip that
  begins standing and wrong for a crawl that begins on all fours: measured
  from itself its hips read as never having dropped, and the game would have
  played the crawl with the pelvis at standing height and the knees in the
  air. `HIP_FROM_REST` measures it from the rest hips instead (-0.54 to
  -0.48 m below them; the crawl is 20 frames, 0.63 s, 1.51 m of travel), and
  the facing is read off the BIND, since a crawl's toes at frame 0 point
  wherever a crawl's toes point.
- **EVERYTHING ELSE IS AUTHORED ON THE CRAWL'S FIRST FRAME**, which is the
  crouched stance a crawler has and the bind (a standing zombie in an A)
  does not — `poseRig` on the retargeted crawl, the Wong's-jab arrangement:
  two idles that twitch and sniff, a rear-up roar (both hands up, face to
  the sky, back onto the hands), two flinches, a collapse, and five blows —
  a swipe either side cocked high and held, a bite off the whole trunk, a
  lunge with both arms that flies at the lens, and a pounce from range. The
  body-axis sign conventions `poseRig` measures held on a Rigify rig without
  a change, because they are about the BODY's axes and not the rig's.
- **He is a `MUT_KINDS` entry** — restless footwork, the yaw hold, the
  ragdoll through the samurai's own Rigify name map — and the life layer
  the orc got (`installLife`) sits on him too, so he watches you come.

Measured hands-off at three metres: **31 swings a minute begun and 53 contacts
counting chains, 30 damage a minute, still 6 % of frames, 8.5 m/s at the top
of a lunge, zero yaw spikes**; at the contact frame the lunge's claws finish
0.17 m from the chest, the bite's head 0.33 m at a metre off the sand (the
first bite was re-authored — on a horizontal trunk "forward" cannot be
pitched into, it has to be LIFTED and carried, and the first version pitched
the trunk into the sand and finished 1.49 m short), the right swipe 0.48 and
the left 0.86. He dies into the ragdoll, 22 parts, face up with the jaw open.

**THE CRAWLER IS THE ARTIST'S PROMO POSE NOW, HE IS BIGGER, HE RUNS, AND HIS
FACE POINTED AT THE SKY.** The owner's picture — cgtrader's render of the same
zombie on one knee, one hand planted, jaw open — with "make his idle stance
more like this, bigger and more terrifying, give him this run sometimes, fix
his model to move smoother, check his face". Six things, and the first two
were bugs:

- **AN ALIAS OVERWRITES A CLIP OF THE SAME NAME — the knight's lesson, on the
  first day.** `run: 'crawl'` sat in his alias map from the build that had no
  run, so the owner's "Mutant Run" retargeted, landed in `u.clips.run`, and
  was replaced by the crawl on the next line. `runDur` read 0.63 — the
  crawl's — and every head measurement I took "off the run" was the crawl
  again. Read the alias map before measuring a clip.
- **A LEAF INHERITS ITS PARENT'S ALIGNMENT, AND ON A HUNCHED BIND THAT CRANES
  THE HEAD BACK.** The face "looked weird" because it was pointing at the sky
  on every frame of every clip: measured, face (0.12, 0.94, 0.33) with the
  trunk facing forward and down. The retarget's "A is not T" turn is found per
  bone from the direction to its mapped child, and the head has none — it took
  the NECK's. This rig binds like a zombie: the neck bone runs 130 degrees
  down and forward to a head craned back up it to face front (neck axis
  (0, -0.67, 0.74), head (0, 0.99, 0.11)), so turning the neck vertical took
  the head with it. `kind.alignLeaves` aligns a mapped leaf on its OWN axis —
  Blender's bone Y IS the bone, on both rigs — against the Mixamo bone's rest
  quaternion, which `ntar_moves.py` already writes. Opt-in, so nothing tuned
  moved. After: face (-0.2, -0.59, 0.78) in the crawl, forward in the run.
- **THE STANCE WAS FOUND IN THE PANE, NOT REASONED.** `tools/sheet.js` is the
  harness for it: `__pose(angles, hipY)` composes body-axis angles onto the
  crawl's first frame exactly as `poseRig` does and renders the result into a
  strip beside the owner's picture, with no reload per guess; `__sheet` strips
  a clip. The kneel (`CRAWL_STANCE`) is the trunk reared and twisted so the
  planted shoulder leads, the left hand on the sand, the right arm hanging
  bent, the right knee up under the chest with its foot down, the left shin
  back along the ground. **The arm and the leg were GRID-SEARCHED**: 1,512
  renders at four pixels each in 2.4 s, minimising the hand's height off the
  sand with its forward reach bounded — because a body-axis rotation on a
  forearm that happens to lie along X moves the hand in Z and not in Y, and
  no amount of reasoning about "bend the elbow" finds that. Measured: hand
  0.04 m over the sand, foot 0.01. The idles are the stance alive (breath,
  head jerks with holds, the jaw working, the weight rocking); the roar rears
  off the knee and DROPS ONTO ALL FOURS, which is what every blow is built on.
- **THE JAW IS A JOINT LIKE ANY OTHER.** `jaw: 'DEF-jaw_master'` in
  `CRAWL_JOINTS`; the bind is wide open, `right` negative closes it (rendered
  to know, not reasoned). The idles work it.
- **BIGGER IS A NUMBER THAT LEAKS INTO EVERY OTHER NUMBER.** `h` 1.92 -> 2.6
  scaled the model 1.374, and on all fours HIS FACE IS 1.43 m AHEAD OF HIS
  ORIGIN. Every stop and reach in the table is measured from the origin, so
  at stops of 1.9 his teeth were half a metre from the lens, 95 % of his
  contacts landed off the bottom of the frame, and the owner's picture would
  have been his back. The table is written round the FACE now: stops hold the
  origin at 2.7-3.0 (the face at about 1.1-1.5), reaches grew by the same 1.4,
  `hitR` 1.7 so the blade's sphere reaches a face that far forward, `body` 1.2.
  Measured pinned at 4.5 m: contacts 100 % on screen (was 5), median 0.73 m
  from the chest, 34 swings and 37 damage a minute, zero yaw spikes.
- **AND A TOKEN HOLDER SIX HUNDRED METRES AWAY NEVER GAVE IT BACK.** The
  harness's teleport crossed `MUT_Z` and woke the pack, the pack's swing never
  ended because nothing advances a unit that far away, and the release waited
  for the swing to end — so a beach mutant held the turn through a whole
  crawler fight and the crawler circled at two metres for ten seconds at a
  stretch (8.6 swings a minute, measured, and `bw.mutToken` — NOT
  `state().mutToken` — is how you see who has it). Past thirty metres a holder
  gives it back whatever it is doing.

And two harness lessons. **A knockback walks a pinned-nowhere player up the
beach**: forty metres of them put the harness player in the portal ring and
the dojo took him mid-sample (the camera read (2980, 801, 2979) and the
crawler ran to z 410 after him) — the crawler stands sixty metres past the
stones now, and a sampler that must not move pins the camera every tick. And
**`__sheetFor(unit)` before `__sheet`** — the tool is re-evaluated after every
reload and forgets whom it is for.

He runs one set-off in three (`gaits.run: ['crawl', 'crawl', 'run']`), a
hunched two-legged lope at 3.6 m/s clip speed played at the rate he moves,
the run cycle windowed to its eighteen frames because the importer pads it
with a held tail that hitched the loop; `fade` 0.22 on every crossfade; every
swing `ease`d; `chainMax` 2.

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

**THE CRAWLER IS 3.1 m, HE RUNS AS OFTEN AS HE CRAWLS, AND YOU SEE HIS FACE.**
The owner's three: taller, bigger, scarier and more dangerous; the Mutant Run
sometimes and the crawl sometimes; and "I want you to see the creature's
face". The last one is the one worth writing down: every clip he fights with
is built on the crawl's first frame, and a crawl looks at the sand a stride
ahead, so what the player fought was the top of a skull. `kind.face` is a
constant lift of the neck and the head composed by the life layer through
every clip that is not an idle (the kneel already lifts it), and `face.hold`
keeps the eyes on you through a swing where the look used to drop to nothing
on the frame he committed — the aim yaws the model and the blow is swept on
the limbs, so the head is free to look. The table moved out again with his
height (the face is now 1.7 m ahead of the origin), the lunge takes two of
your four, `speedK` 1.6, `aggr` 3.4, chains three deep, and the run is drawn
one set-off in two.
Measured after, pinned at five metres over seventy seconds: **35.5 swings and
39 damage a minute, 100 % of contacts on screen, median claw 0.89 m from the
chest, his face toward the lens on 71 % of frames, zero yaw spikes** — and
the keep's pier holds the player for 300 frames after the cut where before
it lost him on the first.

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

**"HE'S PALMING YOU", AND THE CHEST STUCK UP: THE HUNCH IS THE RIG'S OWN
NECK.** The owner sent the artist's renders back
(cgtrader "Stylized Zmobie") with "less awkward, his hits don't look like
clawing, chest less weirdly stuck up, a natural hunch, taller looking down on
you, strong". Two things, and the second corrected the round before it:

- **A HAND NOBODY DRIVES IS FLAT, AND A FLAT HAND SLAPS.** Thirty finger
  bones, never keyed, so every swipe arrived palm first. `kind.claws` curls
  every phalanx about its own X all the time and harder through a blow, and
  THE SIGN IS DERIVED per bone (a curl shortens tip-to-wrist; each bone is
  turned both ways once at install and keeps the one that did) — the
  samurai's fist on a monster, and it needs no rendering to be right.
- **THE REFERENCE IS A HUMP, NOT AN ARCHED BACK.** Read off the renders: the
  shoulders are the highest point, the neck comes forward and DOWN out of the
  hump, and the face looks up from under the shoulder line. The round before
  reared the chest straight up (waist -0.40, chest -0.50), which is a man
  arching — the "weirdly stuck up" chest. `kind.posture` is a joint map now
  (any joint, body-axis angles, plus `lift` for the hips) and the fitted one
  lifts the lower back, curls the chest a shade forward, drops the neck 0.9
  ahead and cranes the head 0.9 back up — very nearly the rig's OWN bind
  pose, which is a zombie's neck and was the thing the retarget straightened
  out. The legs and arms were grid-searched over the crawl cycle for feet and
  the lowest hand on the sand, and the lift was swept: at 0.28 no arm reached
  the ground and hands 0.2 m up read as floating; 0.10 puts the lowest hand
  0.04 m into it with the chest at 1.46 m and the head at 1.20 (was 1.16 and
  0.75). The face lift went to zero with it: the crane does the looking.
Measured after, pinned at five and a half metres over sixty-six seconds: **29
swings and 41 damage a minute, 89 % of contacts on screen, his face toward
you 61 % of frames, head carried at 1.29 m in the crawl (the hump at your eye
line, the face looking up from under it, as the renders have it), zero yaw
spikes.** Frozen at a swipe's contact the forearm rakes across the lens with
the far hand's claws hooked in frame. Standing, he is three metres over you.

**THE CATACOMBS: THE SAND GIVES PAST THE STONES, AND THE MONSTER HUNTS YOU
UNDER IT.** The owner's brief in one message: a little after the portal the
ground caves in dramatically and you fall into wiz's "Catacombs Map"
(CC-BY-4.0, `assets/catacombs.glb`, `tools/undercroft_pack.py tavern` — exact,
142k triangles, 9.1 MB, NO `--scale`: the file already carries its own
centimetre root and a 0.01 on top made a 27 cm walk grid), landing in the crypt
room of the first screenshot; dark; the monster wandering the whole place
looking for you, his feet and claws heard scraping when he is near; attacking
only when he has you in sight; hard to kill; the way out the barred door of
the second screenshot with light through its window, onto the beach from a
door in the sand wall. `CAT_*`, the tavern's machinery on a third site.
What it cost, in the order it bit:

- **A ROOM IS FOUND, NOT NAMED.** The file has 744 nodes called `Object_N`.
  The rooms came out of the WALK GRID: flood the storeys by height into
  connected pieces, render each from inside (`tools/sheet.js` has
  `__loadGlb` / `__view` for it), and match the pictures. The crypt room is
  floor 0.34 at (5.6, -11.6); the barred door is the +x wall of the upper room
  at (8.84, 4.33, -14.4), flanked by torches at z -15.3 and -13.5 with skulls
  at its foot — the second screenshot exactly.
- **AND "YOUR Z ALONE" FIRES IN A ROOM AT POSITIVE Z — the keep's own lesson,
  the day after.** Not this time: the trigger is a BAND (`CAVE_Z` .. -7) on
  the beach with `!inRoom()`, and `caveDone` is on the save and inferred past
  it. The take is four beats on the wall clock (`updateCaveIn`): the shake and
  sand off the ground, the give (a crack and the camera falling under its
  own gravity with the black closing over it), the cut, the landing.
- **THE CLIFF CLAMP WAS STILL ON IN THE ROOM.** Every frame `update()` pulled
  `camera.position.x` to `CLIFF_BLOCK_X` — nine kilometres — and the hall cull
  then measured the room from the beach and HID it, and the room's walk put x
  back before anything drew, so the camera read as inside a room that had
  been switched off. Traced with a setter on `visible`: `cullWorldInHall`,
  under `update()`. `!inCat` joins the one list of places that are not this
  beach. (And a `bwSpan` frame that says "cannot access 'right' before
  initialization" is the life layer's TDZ from the round before, on the frame
  a page hidden to rAF finally drew him.)
- **THE HUNTER'S GRAPH IS THE STOREYED WALK AS NODES**, (cell, storey) with a
  hop over one missing cell (`catBuildGraph` / `catRoute`, breadth-first).
  Three filters were wrong before one was right: headroom 1.6 threw away the
  crypt room (this model's rooms are 1.5 m under the next slab — a catacomb;
  0.9, he crawls); a wall clearance of 0.28 m cut the graph into 229 pieces
  because its stairs and doorways are narrower than that (none — his body,
  not the graph, keeps him off walls); and "no roof" is the OUTSIDE of the
  model only when nothing stands over it in the same cell. Measured: 14,512
  nodes, one piece of 9,962 that reaches six of the seven rooms (the flooded
  level is the seventh).
- **A TARGET HE CAN REACH.** A random node anywhere was outside his piece often
  enough that, once down a stair into the water, every route failed and he
  stood there for good. `catFlood` from his own node, cached, and targets come
  from that.
- **AND THREE THINGS UNDID EVERY STRIDE.** The wall push at a cap of 0.06 a
  frame cancelled the follower's 4 cm step (a millimetre moved, a live route in
  hand); on a route he ignores the drawn faces and trusts the floor cells. The
  snap back to the last standable spot refused the one-cell gap the route
  hops; on a route he crosses it. And a stuck test on per-frame deltas never
  read as still while a clamp argued with the follower; it is NET progress
  over a second and a half now.
- **HE SEES YOU ON TWO EYE-LINES, ON YOUR STOREY.** `catSees`: inside thirty
  metres, a 72-degree cone (hearing inside six, and inside three whatever he
  faces), no drawn wall between his eye and yours at EITHER eye height (a
  tomb at chest height between you hides neither), and never a storey apart —
  at 2.6 m of slack he heard you through a floor and roared at the ceiling,
  and the fight AI, which is planar, then had him "in reach" of a player a
  storey up (`near` is false across a floor now). Lose him for six seconds
  from ten metres and he goes back to searching from where he last had you.
- **HIS FEET ARE CLAWS ON STONE.** `voice.scrape` routes his step through
  `sfxClawScrape`: a rasp swept down through a band, a click, a knock under
  it, panned by his bearing (`panTo`) and gone by twenty-six metres.
- **THE PANE HIDDEN TO rAF RUNS NO FRAMES**, and a hidden pane looked
  displayed to `tabs_context`: a reference tab opened beside it was enough.
  `bw.animate()` by hand drives a frame each; `document.hidden` is the truth.
  And a dev checkpoint left 14 m from him reloaded the page every nineteen
  seconds — `playerDied` — for a whole round of "nothing works".

Measured: he wanders 50 m in 22 s across three storeys, walks into the crypt
room, sees you and roars; in the room 9 swings and 12 damage in 14 s at 2.6 m
with his face on you 98 % of frames; the door puts you on the sand at
(12.6, -800) with the wall door 1.9 m to your right and the checkpoint written.
Health 80, poise 12, a guard of 0.28.

Two smaller ones from the last look. **You land where the picture was taken
from**, not in the middle of the room: `CAT_LAND` is (7.0, -12.5) facing the
green tomb, because the first spot put the sarcophagus at your back and the
first thing you saw of the crypt was a wall. And **a door swung -0.72 about Y
opens OUT over the beach**: a leaf built along +z swings to (sin, 0, cos) of
its yaw, and -x is seaward here, so the door in the sand wall stood across
the frame with the beach behind it; +0.72 puts it into the recess, where the
comment always said it was. Read a swing's sign off where the leaf ENDS UP.

**AND THEN THE CATACOMBS WERE TWICE THE SIZE, PITCH DARK, AND THE THING IN
THEM LIVED THERE.** The owner played it: everything too small to walk
through, he could not fit in the doors, the monster glitched through the
ground and was lit up like a lamp, and the room lagged all over. Seven
things, and the two that mattered most are both about a graph.

- **A ROOM IS SCALED AT THE PACKER, NOT IN THE GAME.** `tools/undercroft_pack.py
  tavern … --scale 2.2`. Measured on the first pack: rooms 1.5 m from floor
  to slab against a 1.88 m body, and corridors 0.6 m wide — that is a
  catacomb you crawl through sideways and it is exactly what "I couldn't fit
  in the doors" is. At 2.2 the rooms are 3.3 m and the doorways 1.3 to 2.
  Every number the game holds about the place is written `× CAT_SCALE`, so a
  spot measured in the old file is the same spot in the new one.
- **VERY DARK, WHICH IS A LEVEL AND A REACH.** The stone carries 0.03 of its
  own map (it was 0.085), the fog is 0.040 and near-black, and a torch is
  1.7 over 8.5 m rather than 2.6 over 11 — so a torch is a pool with dark
  either side of it and not a room light. What carries the place is the
  flames, the door's cold glow and what you are holding.
- **AND HE WAS LIT FOR A BEACH.** `emis` 0.10 with a cold Fresnel rim is the
  pack's night lift — a creature on open sand under a quarter moon is a hole
  in the dark without it — and in a room whose stone reads 3 it made him a
  pale animal visible across the whole hall. Measured by rendering him and
  then hiding him and diffing the frame: at 3 m he covers 6.3 % of it at a
  mean of 9.8 against the room's 3.2, which is a dark shape you can just
  make out. `emis` 0.022, the rim a third of what it was.
- **A FLOOR LOOKUP SEARCHES DOWNWARD, WHICH IS HOW HE WENT THROUGH THE
  GROUND.** Standing over a stair well or a hole in a vault, `keepFloorAt`
  answers with the storey BELOW — and the follow eased him into it at three
  metres a second. `catStand` is the one door now: a floor more than a
  stride under him is not his floor, he holds the last one he stood on, and
  if he holds it for most of a second he is put back on the nearest node at
  that height and his route dropped. Measured over ninety seconds of
  roaming: never more than 0.27 m under a floor, and 1 % of frames with
  nothing under him at all.
- **"I LAGGED ALL OVER THIS ROOM" WAS THE ROUTE, AND IT WAS THREE FAULTS IN
  ONE SEARCH.** Measured: 9.6 ms a route with the chase asking for one every
  0.4 s. (1) It was a BREADTH-FIRST search over 53,145 nodes, which visits
  every one of them before it gives up — A* with the straight-line distance
  finds a path in a tenth of a millisecond. (2) The reachable set was an
  ARRAY and `Array.includes` over 35,324 ids was asked every time he chose
  somewhere to go; it is a mask. (3) A node every 0.2 m is nine times the
  graph a crawling animal needs — at 0.6 m it is 5,887 nodes and the build
  is 112 ms rather than 275.
- **AND A WEIGHTED HEURISTIC IS INCONSISTENT, SO A* MUST CLOSE WHAT IT HAS
  EXPANDED.** This is the one that took the longest to see, because the
  symptom lies: routes to nodes his OWN FLOOD had just proved reachable came
  back refused, eleven in twenty, at seven milliseconds each. Every one of
  them had popped 14,001 entries — the cap — on a graph of 5,887 nodes,
  because a node whose cost improves after it has been popped gets expanded
  again, and with a 1.3 weight that cascades. A closed stamp ends it: 30 of
  30 routes, median 0.9 ms, worst 2.1. **If a search fails on something you
  can prove is reachable, count its expansions before you touch anything
  else.**
- **AND A SPOT RESOLVES TO A NODE ON THE STOREY YOU MEANT.** Two rooms stack
  at the same (x, z) all over this place, so `catNodeAt` can answer with the
  floor above or below the one a target was taken from — and the route was
  then refused as unreachable by the very flood that produced it. It takes
  the reach mask and prefers a node inside it.

**AND HIS MIND IS AMNESIA'S NOW: HE LIVES HERE, AND YOU ARE IN THE WAY.**
Six modes. ROAM — he picks a bone pile to eat at (found by bucketing the
skull mesh's own vertices, not typed), a room to stand in, or somewhere
near where you happen to be, and goes there crawling, one leg in three up
on his hind legs. ACT — he eats, sits back on his haunches, stands and
looks about where the roof allows, or crouches and listens, five to fifteen
seconds, facing one way, which is how you get past him. INVESTIGATE — your
sprint carries 24 m, your walk 11, a crouch 5, and a landing, a swing and a
blade on stone say so where they happen (`catNoiseAt`); he comes and
searches. STALK — the owner's own brief: from across a room he does NOT
charge, he goes to a corner that can see you and puts his face round it
(`catPeekSpot`: a node 9 to 22 m off that can see your eye AND where a step
to one side of it cannot, which is what a corner IS, measured rather than
authored), and holds there. What turns that into a fight is YOU looking at
him — the middle of your screen, not the edge of it. FLEE — under a third
of his health, once a fight, he breaks off, runs for somewhere at least 22 m
from you, mends about a point a second, and comes back; `blooded` is set, so
the second time he does not peek, he simply comes. CHASE — the fight.

- **AND A MODE IS NOT RE-ENTERED BY THE THING THAT STARTED IT.** The sight
  check runs six times a second and set the mode to `stalk` again on every
  one of them, which reset the clock that ends a stalk and threw away the
  spot he was walking to: traced, he stood fourteen metres off doing nothing
  for ten seconds. A sight that arrives while he is already stalking only
  refreshes where he thinks you are.
- **AND "IS THE LINE OPEN" IS THE WHOLE LINE, NOT THE NEXT TWO METRES.** The
  chase dropped its route whenever the nearest 2.2 m looked clear, then walked
  into a wall three metres on, where the new segment clamp held him — a route
  made and thrown away four times a second at twelve metres. It asks as far
  as he can see now, and he closed 16 m to 5.2.
- **AND HE MAY NOT PASS THROUGH A WALL BETWEEN FRAMES** — the player's own
  rule, and the whole of "he clipped through the map running": the chase
  drove him at drawn stone at seven metres a second against a push that
  corrected 1.5 cm a frame. The frame's movement is a segment at his hip and
  his shoulder, and a frame that crossed a face is reverted.
- **AND A CORNER HE WATCHES FROM IS FURTHER OFF THAN THE RANGE AT WHICH HE
  COMES.** At five metres the peek spot was already inside the distance that
  turns a stalk into a charge, so he arrived and charged on the same frame
  and there was no peek at all.
- **AND A THING THAT REARS UP NEEDS A ROOF TO REAR UNDER.** His two standing
  blows put his hands 3.8 m up; a catacomb's rooms are 3.3. They are out of
  the draw wherever the storey he is on has less than 4.3 m over it.

Measured at the end. **The player's own walk floods 12,404 cells from the
landing with a standing body and reaches the barred door to within 0.1 m.**
Routes: 30 of 30, median 0.9 ms. **Fourteen seconds of live fighting with
NO frame over 16 ms** (before: 9.6 ms of routing several times a second).
The fight is 30 swings and 39 damage a minute at 2.5 m, against the Dealer's
48 and 40. He roams 140 m in ninety seconds. Hurt to 18 of 80 he breaks off,
mends to 40 and comes back. And the dev-mode trap caught a whole round of
measurement again: **`devMode` turns a creature's swinging off outright**, so
a fight sampled with it on reads zero swings and a creature standing still.

**AND THEN HE GOT A HOME, A GRAB, AND NO DEATH.** Seven things on the
owner's list, and the useful ones are the three that change what the
encounter IS rather than how it looks.

- **DEV MODE SURVIVES A RELOAD THE GAME ITSELF ASKED FOR.** "No deaths, no
  cutscenes" is what you are testing WITH, and every death and every
  restart-from-checkpoint reloads the page — so it came back off and the
  takes you had just skipped played again. It rides in `sessionStorage`,
  written by `reloadInto` and consumed at boot, which a new tab does not
  have: a game still always starts as a game. And the cave-in is a take, so
  in dev mode it does not play one — it still puts you in the room.
  Measured: `caveBusy` never goes true and you are in the catacombs.
- **HE DOES NOT DIE, HE GOES DOWN.** A catacomb with a corpse in it is a
  catacomb you have finished, and the whole of the fear down there is that
  it is his and you are in it. `kind.undying` intercepts `killMutant`: the
  blow still lands, still throws him, still reads as a kill — and he lies
  where he fell with the death clip held on its last frame for forty to
  sixty seconds, then the same clip runs BACKWARDS, which is a body rocking
  back onto its hands, and he is up with two thirds of his health and a
  roar. Measured: down 43 s, up at 53 of 80, straight into a stalk.
- **AND HE TAKES YOU IF YOU ARE NOT LOOKING.** `catCanGrab` wants him inside
  2.9 m, on your storey, and your eyes off him for a second and a half
  (`catSeenAt`, stamped six times a second the same way his own sight is) —
  and then it is not a swing, it is a TAKE: up off your feet with his face
  in yours, screaming, a point gone, and thrown back down on the spot you
  were standing. It costs your footing and the thing you were about to do
  and it leaves you playing, which is worth more than a death screen. It
  runs on the wall clock beside the cave-in and the door, the camera is
  turned and never moved, and `catGrabT >= 0` is in `frozen()`.
- **AND A TAKE SETS THE POSE; IT DOES NOT ASK FOR IT.** `mutPlay` crossfades,
  which is right for a fight and wrong for a scripted beat: measured
  mid-grab, the grab clip sat at weight 0 with the crawl still at 1 and what
  played was the crawl. Setting the weight explicitly was not enough either
  — BOTH then read 1, because an action the mixer has already bound goes on
  contributing until something zeroes it. Every other action is stopped,
  zeroed AND disabled. (`stopAllAction` is the one thing that must not be
  used here: it restores every bound property, which is the bind pose — the
  severed limb's own bug.) And the take OWNS him: the fight's own `mutAnim`
  was picking a gait over the top of it.
- **HE MOVES LIKE HE KNOWS THE PLACE, WHICH IS A STRING-PULL.** A route over
  a grid is a staircase of little turns — cell, cell, cell — and what that
  reads as is a thing feeling its way along a wall. `catSmooth` drops any
  waypoint whose neighbours can see each other (`catLineOpen`: the drawn
  faces at his hip and his shoulder, the floor under every stride, and the
  headroom), so what is left is the long runs a thing that lives here would
  take and the turns are only where the walls actually turn. Measured: legs
  went from 0.6 m to 3.0–4.3, a 74 m route from about 120 waypoints to 26.
- **AND HE STALKS A GREAT DEAL MORE.** He goes to a corner from eight metres
  out rather than eleven; a stalk is THREE corners, each nearer than the
  last, rather than a clock; a peek is held five to eleven seconds; losing
  you in a fight sends him back to watching half the time rather than always
  searching; and `blooded` — which is what makes him charge instead of peek
  — lapses after forty seconds, so the second half of a long visit is not
  all fighting.
- **AND THE BONES ARE THE THING THAT TELLS YOU ABOUT NOISE.** His hearing has
  been in the game since he went in — a sprint carries 24 m, a walk 11, a
  crouch 5 — and nothing ever told the player so. The floor of a catacomb is
  bones: run through a pile of them (the piles the game already finds by
  bucketing the skull mesh's own vertices) and it is a dry clatter with no
  body under it, a puff of dust, and a noise that carries twenty-six metres.
  It is the one thing down there that makes where you walk a decision.
- **AND SOMETHING IN THE AIR.** Two `Points` batches and one draw each: motes
  that are POSITIONS rather than particles — a slow wander round a fixed
  offset from wherever you are standing, so the air is always full and
  nothing is ever born or dies — and dust, a pool that recycles, thrown
  where something happened: his feet on the stone within sixteen metres, a
  pile of bones kicked through.

**"I NEVER SAW HIM THE PAST 2 TIMES I PLAYED" WAS THREE THINGS, AND THE
FIRST IS THE OLDEST MISTAKE IN THIS FILE.** The owner walked the catacombs
twice and the thing that lives in them never once crossed his path. Measured
with the player standing still in the door room for three minutes: he came
within **1.5 m** and never saw them, and never counted as being in that room
at all. Both readings are the same fact — **a distance with the y left out is
not a distance.** Two rooms stack at the same (x, z) all over this place and
he was ten metres BELOW, which his own senses already refuse (`catSees` will
not see through a storey). His convergence targets are drawn from nodes on
YOUR OWN FLOOR now (within 1.8 m of your feet), and the prowl mostly is too.

- **AND A BEAM OF LIGHT IS NOT A WALL.** "Let me run up to the door, I got
  stuck here": the door's decorative light shaft is a `PlaneGeometry` hung
  3.3 m out from the leaf, and `buildKeepWalls` reads every drawn face — so
  the walk stopped the player exactly one body radius in front of a sheet of
  light. It, the glow and the hit proxy carry `bwGhost` (drawn, never walked
  into), which the tavern's tables already needed. Measured: a 3.56 m gap
  became -0.03.
- **AND A WALL IS SLID ALONG, NOT STOPPED AT** — the player's own rule and
  the church's, which his own clamp never got. A frame whose movement crossed
  drawn stone was reverted WHOLE, and a revert is standing still; with a
  route nothing above ever asks to redraw, that is a creature parked for
  good. Traced with the player in one room: **seventy-five seconds held at
  25.9 m with a live eight-waypoint path in his hands and the revert firing
  on half the frames.** Whichever ONE AXIS of the step is clear is kept.
- **AND A STALK THAT IS NOT GETTING ANYWHERE IS NOT A STALK.** Net progress
  over five seconds; under a metre of it drops the route and asks for another
  corner, and three goes is all he gets before he simply comes. The backstop
  that ended a stalk was 95 s, which is a minute and a half of a boss
  standing still — 45.

Measured after, real time, player standing at the landing and the creature
parked 44.6 m away on another storey: he closes to **5.2 m and charges at
48 s**, against never. And the room the way out is in is one of his — the
nodes within twelve metres of the door, found off the door rather than typed,
and he goes there about a quarter of the times he picks an errand.

Three measurement traps paid for on the way. **Dev mode turns a creature's
swinging off outright**, so a creature standing at its ring doing nothing is
what dev mode looks like and not a bug (`atk: -1`, `cool: 0`, the idle
playing). **A page that has not been reloaded is the old module** — the door
spots read zero for a whole round because the graph in the tab had been built
before the code that fills them existed. And `u.path` on this follower is
**LOCAL x/z with a world f**, against `u.pathO`; printing a waypoint against
the room's origin subtracts it twice and every distance comes out in the
thousands.
