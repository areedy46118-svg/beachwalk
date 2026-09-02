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

**The lighthouse is generated, not imported.** Two profile functions at the
top of `main.js` define it and everything else is hung off them: `lhOuterAt(y)`
is the outer face (a splayed base course, then a concave taper r4.35 → r2.45
at `LH_TOP`) and `lhBoreAt(y)` is the clear inside (r2.55 → r1.90). The shaft
is two `LatheGeometry` revolutions of those profiles; the gallery, lantern
room and roof sit on top of them. If you move a wall, move the profile — do
not hand-place a radius, or the deck and the stair will drift off it again.

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

**Beach rocks are world objects, not debris.** `makeErodedRock()` builds them
(lobes for the silhouette, hard-cut solution pits for the surface, a shear
plane for the wave-cut face, flattened base) and they're placed as *formations*
— 4-7 masses round a shared centre, 90-170 m apart. They deliberately sit
outside the recentring `debris` tile and outside `clipAtShore()`: they're
landmarks you can climb, and a real rock stays visible when the tide runs over
it. `rockColliders[]` gives each mass a cylinder — `rockGroundAt()` to stand on
it, `pushOutOfRocks()` to keep you out of it — applied in `update()` after
`updateTower()`, so a rock beats the sand.

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
pose amplitude, the swing duration, the crab kill radius, the trauma, the sand
thrown and the pitch of the impact sample. `winding` must be cleared on blur or
the shovel stays over your head.

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
