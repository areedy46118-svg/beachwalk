# Beachwalk — context for Claude

A first-person low-poly horror walking sim: an eerie infinite night beach.
See `README.md` for the player-facing feature list and every tuning knob.

## Keep this file small

This file is loaded into EVERY session, so it is the core only. The long
record of what was learned building each part lives in `docs/notes/*.md`
(about 1.3 MB in all — never load it whole). **Before working on an area,
grep its notes file for the names you are about to touch, and read the
paragraphs that match.** **When you learn something worth keeping, append it
to the right notes file, NOT here.** Only a rule that applies to the whole
game belongs in this file, and this file should stay under ~25 KB.

| area | notes |
|---|---|
| beach: sand, sea, sky, fog, mist, caches, snorkeler, camp, rocks, intro, Elvédor + the house behind the dune + the puppet | `docs/notes/beach.md` |
| the wreck, Billy the fish | `docs/notes/wreck.md` |
| the dock, the fisherman | `docs/notes/dock.md` |
| the pavilion (mushroom house), the dungeon behind its yard, Henry | `docs/notes/pavilion.md` |
| the lighthouse, the headland | `docs/notes/lighthouse.md` |
| the drainage tunnel home, the face in the pipe, the sewer through the pipe (levers, generator, flooded storeroom) | `docs/notes/drain.md` |
| the bunker, the Dealer | `docs/notes/bunker.md` |
| the undercroft: tunnel, church, knight, idol | `docs/notes/undercroft.md` |
| the catacombs, the hunter, Ben Ali | `docs/notes/catacombs.md` |
| the abduction, saucer hall, crash, fence (all REMOVED 2026-10-13; history, and the rock wall that replaced it) | `docs/notes/shrine.md` |
| the portal, the dojo, the samurai | `docs/notes/dojo.md` |
| the sea keep | `docs/notes/keep.md` |
| the tavern | `docs/notes/tavern.md` |
| the whale (sand, belly, farewell) | `docs/notes/whale.md` |
| the deep: the bite at the fishing spot, the drag, swimming, the pliosaur, the whale's swallow | `docs/notes/deep.md` |
| the castles, farmers, flail knight, throne room | `docs/notes/castle.md` |
| creatures in general: rigs, retargeting, clips, ragdolls, fight AI | `docs/notes/creatures.md` |
| weapons, the view model, swings, guard, gun, rod | `docs/notes/weapons.md` |
| items and pickups | `docs/notes/items.md` |
| HUD, pack, hotbar, shop, menus, input, pointer lock | `docs/notes/ui.md` |
| checkpoints, saves, restores | `docs/notes/save.md` |
| audio | `docs/notes/audio.md` |
| performance, loading, warming, draw calls | `docs/notes/perf.md` |
| testing in the preview, harness traps | `docs/notes/harness.md` |
| anything else | `docs/notes/misc.md` |

The split was by keyword, so a lesson can sit in a neighbouring file: if the
expected file has nothing, `grep -rn 'name' docs/notes/`.

## Saving context

- `main.js` is ~82,000 lines / 4.8 MB. **Never Read it whole.** Grep for the
  identifier, then Read a window of 100–300 lines around the hit.
- For a broad "where is everything that does X" sweep, use an Explore
  subagent so only the conclusion comes back.
- A preview still that comes back inline costs ~25k tokens. Pad the base64
  so the result is written to a file and decode it in the shell instead.
- Keep `javascript_tool` results short: return the numbers, not objects.

## Running it

```bash
python3 serve.py 4173      # dependency-free static server
```

Then open <http://localhost:4173>. It needs to be served over HTTP (ES
modules); `file://` won't work. `node`/`npx` are not present on this machine:
to syntax-check, load the page and read the console (or strip the imports and
run it through JavaScriptCore's `new Function` via `osascript -l JavaScript`).

## Stack

- Vanilla JS, no build step. `index.html` + `main.js` + `models/` + `assets/` +
  vendored three.js r160 in `vendor/three/` (imported via the import map).
- The whole game is `main.js`, one module, top to bottom, grouped by `// ---`
  banners. `tools/` holds the asset packers (Python/Blender/Swift) and the
  preview harness scripts (`tools/*.js`).
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

**Retro look.** `renderer.setPixelRatio(RETRO_SCALE)` (0.62) renders at low
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

**Rooms are far-off places, not scenes.** Every interior (bunker, undercroft,
catacombs, dojo, keep, tavern, whale, throne room, the dungeon behind the pavilion) stands
thousands of metres out on the same scene, entered by a cut behind black.
`inRoom()`, `indoors()`, `clearRoomFlags`, `cullWorldInHall`, `bunkerFloorAt`
and the cliff clamp all have to know about every room. Rooms are placed at
POSITIVE z because beach triggers are "z less than a line".

## Rules that keep biting (details in the notes)

- **A constant that describes one place is wrong the day the game acquires
  another.** `WADE_X`, `CLIFF_BLOCK_X`, y = 0 as the ground, the beach's
  shoreline — anything new that moves, falls, bleeds or splashes must ask the
  room it is in (`bunkerFloorAt`, `roomSubmersion`, `inRoom()`).
- **Measure, don't reason.** Signs of rotations, which way a model faces,
  contact frames, light levels: render it or probe it in the pane.
- **METALNESS IS A TRAP** — there is no environment map (except `ringEnv()`
  for rings); read a material's `emissive` before anything else when a scan
  looks wrong.
- **`matrixWorld` is only written by a render** (of something visible).
  Call `updateMatrixWorld(true)` before measuring anything just added.
- **A light entering or leaving the scene recompiles every material.** Point
  lights are pooled (6 real ones — every slot costs every lit pixel, lit or
  not); change intensity, never add/remove.
- **Declaration order matters** — `main.js` is one module of `const`s; a
  constant that reads a later one is a dead-zone crash that takes the page.
- **A `three/addons/…` import must be added to BOTH import maps**
  (`index.html` and `models/viewer.html`).
- **All one-shot sfx go through `sfxOut()`**, never `ctx.destination`.
- **The owner's music must always play** (one exception, his: the opening song is NOT played on a death's respawn, `bootRespawn`; the musictest's `checkpoint` wants silence and `load` the song). A new piece gets its own volume node added to `musicGuard()` and a
  `musicNote()` at its start, and a scenario in `tools/musictest.js`. After ANY change near audio, a trigger, the
  boot or the restore, run `sh tools/musictest.sh` (a headless Chrome of its own, silent, never the owner's pane or
  save) and report the result. `sh tools/loadtime.sh` times a checkpoint load the same way.
- **A trigger you have already crossed must not fire again on a restore** —
  saves carry flags; check `beginRestore` when adding any once-a-game event.
- **Whatever moves the player last must re-run the room's clamp**
  (`clampPlayerToRoom`).
- **Read `mutPlay`'s console warnings** — a missing clip name is a silent
  no-op otherwise. Check `kind.alias` before concluding a clip isn't playing.
- **`git checkout <file>` is not an undo** — it throws away every
  uncommitted edit to that file.

## Dev mode

`DEFAULT_SETTINGS` are the owner's own (FOV 105, sensitivity 1.00,
brightness 0.96, volume 50 %, music 25 %, walk 1.0x, waves 15 %, effects
15 %); "Reset to defaults" in the menu puts them back and saves. **A FRESH
PAGE LOAD ALWAYS STARTS ON THEM**: saved slider values are read only across
a reload the game asked for (`reloadInto`, i.e. `beachwalk.load` is in
sessionStorage — a death or a restart from the menu); a browser refresh or a
new tab writes the defaults back over whatever was stored. Note the
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
player-initiated and are left alone. Every locked door also opens in it
(`devKeys()` is asked beside each key; a key you hold is still used). Off by default; it is for walking the
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
- `__bw.step(dt)` runs `update()` only; `__bw.frame(n)` runs whole frames.
  A hidden pane runs no rAF — check `document.hidden` before trusting a zero.
  More traps in `docs/notes/harness.md`.

## Conventions

- **Never `git commit` or push unless the owner says so in that moment.** Leave
  changes in the working tree and say they are uncommitted.
- Match the existing terse style: one file, grouped by `// ---` banners,
  short helper functions, `_scratch` temp vectors reused across frames.
- Keep it dependency-free and offline (vendored three, procedural textures).
  New assets go in `assets/` and must be small; credit them in README.
- New lessons go in `docs/notes/<area>.md`, not in this file.

## Open ideas

Real note art for the bottle · more items and scripted events along the walk
· prop-vs-prop physics · persistent dig holes · a nicer two-handed dig anim.
