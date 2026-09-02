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

**Object models.** `models/` holds standalone factories (`makeHorseshoeCrab()`,
`makeSyringe()`, `makeBloodJar()`) plus `viewer.html` (`?model=…`), a
drag-to-rotate dev viewer. Factories `import * as THREE from 'three'`, return a
`Group`, use metres, `+Y` up / `+Z` forward. **Smooth-shaded**, a deliberate
exception to the flat-shaded retro look because they're hero props seen up
close. The syringe and jar carry `userData.setFill(t)` + `userData.parts`.

**The storm drain.** `models/drain-tunnel.js` → `makeDrainTunnel()`, placed at
`DRAIN_X` (= `CLIFF_BLOCK_X`) / `DRAIN_Z` — behind you when you spawn. It is a
**fixed world object** like the lighthouse, and three things make it work:

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

**Physics.** `PhysProp` class + `physProps[]` — a tiny custom rigid body
(gravity, ground bounce/friction, corridor walls; **no prop-vs-prop
collision**). Grab springs the held prop in front of the camera; click again
throws; `G` drops.

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

## Working in the Claude Code browser preview

The preview browser can't use the real Pointer Lock API and **throttles
`requestAnimationFrame` when its pane isn't focused**, so live movement is
hard to drive from `javascript_tool`. Instead:

- `window.__bw` exposes `scene`, `camera`, `state()`, `music()`, and helpers
  like `startDig`, `spawnPuffs`, `toggleEquip`, `beginGame`, `showEnd`,
  `openInspect`/`closeInspect`, `startExtraction`, `crab`, `syringe`,
  `bloodJar`, `crabItem`, `syringeItem`, `jarItem`.
- Move the camera by hand (`camera.position.set(...)` + `camera.lookAt(...)`
  + `camera.updateMatrixWorld(true)`), then take a screenshot to force one
  render frame.

## Gotchas worth knowing

**Declaration order matters.** `main.js` is one long top-to-bottom module of
`const`s, so anything that *calls* `addInteractable` or pushes to a shared
array must appear **after** that array is declared, or you get a temporal
dead zone error at load. The lighthouse door and the pickup-shine helper both
had to be moved for this reason.

**All one-shot sfx go through `sfxOut()`**, which returns the SFX bus. Never
`connect(ctx.destination)` from an effect — that bypasses both the Effects
volume slider and the master volume, which is how digging ended up deafening.
Music is the deliberate exception.

**The scanned lighthouse dictates every dimension.** `assets/lighthouse.bwmesh`
is a closed, coarse 20-sided tower: 31.9 m tall, base flaring to r4.96 with
its +Z face at r4.57, shaft tapering r3.9 → r2.4, clear bore r2.8 → r2.06,
and above y≈26.5 nothing but a thin mast — no lantern room, no openings.
Anything built to meet it must use those numbers (`LH_*` at the top of
`main.js`), or it will float in mid-air or sit buried in the wall. Openings
are *cut* by dropping triangles whose centroid falls in the hole, and the
mast is cut the same way; see the carve step in the
`loadMesh('assets/lighthouse.bwmesh')` handler. The gallery, lantern room and
roof are built geometry that replaces what the scan lacks.

**The scan's wall face is not flat.** At the doorway it reads r4.24 at the
foot, bulges to r4.57, then steps back to r3.6 above head height — so a flat
door leaf can't sit against it. The entrance has its own projecting stone
surround, which gives the door one clean plane and hides the cut edge.

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
