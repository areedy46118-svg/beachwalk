# Beach Walk

A first-person horror walking sim: an eerie shoreline at night that runs
until you reach the lighthouse at the end.

## Run it

ES modules need HTTP (opening `index.html` as `file://` won't work).

```bash
python3 serve.py 4173
```

Then open <http://localhost:4173> and click to begin. Any static server works
(`npx serve`, VS Code Live Server, …) — `serve.py` is just dependency-free.

## Controls

| Input | Action |
|-------|--------|
| `W` `A` `S` `D` | Walk |
| `Shift` | Run (≈5 s of stamina, only a little faster) |
| `Space` | Jump |
| Mouse | Look (pointer lock; drag-to-look fallback if it's blocked) |
| Click / `E` / `F` | Grab a physics object · take an item · dig (with the shovel) |
| Click (while carrying) | Throw the held object — it's a toggle, no hold |
| `G` | Drop the held object gently |
| `1`–`6` / click a slot | Use / equip an inventory item (the crab → examine it) |
| Hold right-click (examine view) | Turn the item over |
| Left-click / scroll (examine view) | Put it away / zoom in |
| `Q` | Holster the equipped tool · close the examine view |
| `Esc` | Pause / settings menu (and close the note / examine view) |

## World layout

You walk **down the beach along -Z toward the low moon**. The **ocean is to
your left** (-X); the **dry beach (+X)** ends in an eroded **sand cliff** you
can't climb — and beyond it the faint lights and rooftops of a **city just
out of reach**. Far down the shore a **lighthouse** turns; reaching it ends
the game.

The sand, ocean, wrack line, cliff and city are large tiling fields that
recentre on the player each frame (snapped to their period), so the walk is
endless; the lighthouse is a fixed landmark at `LH_Z` (≈ 1.2 km away).

## What's in it

- **Title & opening** — the title card is just **BEACHWALK** + the controls.
  Clicking begin cuts *straight* to black (no glimpse of the world), the
  opening line fades in and out, then the world fades up. `INTRO_LINE` /
  the timings in `beginGame()`.
- **Opening music** — `assets/backrooms.m4a` swells in over ~7 s once the
  world appears, holds, then fades back out (~30 s total). Routed through a
  Web Audio gain chain so the volume slider still works. `MUSIC_*` consts.
- **PS1 / low-poly-horror presentation** — the scene renders at
  `RETRO_SCALE` (~42 %) of the window and is blown back up with
  `image-rendering: pixelated`, so you get chunky pixels and crawling
  edges. Textures are 256², nearest-filtered with no anisotropy and
  quantised to a coarse palette; everything is flat-shaded.
- **Settings menu** (`Esc`) — FOV (60–120), mouse sensitivity, brightness,
  volume, invert-Y. Persisted to `localStorage`.
- **Run + stamina** — hold `Shift` to sprint; `RUN_SECONDS` (≈5 s) of stamina
  drains, then you're winded until it recovers. A thin bar shows near the
  crosshair. `RUN_SPEED` is only ~40 % above the walk.
- **Jump** — `Space`, a short hop with real vertical physics.
- **Physics objects** — driftwood, a pail, a glass float, a stone, a can.
  Click to grab & carry (HL2 / Amnesia style), click again to throw, `G` to
  drop. A tiny custom rigid-body sim (gravity, ground bounce/friction, walls).
- **Inventory + equipping** — a vertical hotbar on the **left** that appears
  once you pick something up. Items either **use** (the bottle → reads the
  note, `NOTE_TEXT`; the crab → examine view; the syringe → examine, or draw
  blood if you also carry the crab) or **equip** (the shovel).
- **The horseshoe crab** — a detailed smooth-shaded *Limulus* stranded in the
  wrack line (`models/horseshoe-crab.js`): a broad rounded head shield with the
  cardiac + ophthalmic ridges and raised margin sculpted in, a wavy hinge,
  movable spines, a triangular telson, and a complete underside — six leg
  pairs, chelicerae, operculum, book gills. Take it, then **use** it to open
  the **examine view**: the object floats in the dark, **drag to turn it over**
  and look underneath, scroll to zoom, `Esc`/`Q` to put it away. The view is
  its own scene rendered over everything (`openInspect()` / `inspectScene`).
- **The bleeding syringe** — a glass hypodermic further down the beach
  (`models/syringe.js`): barrel with graduations, a slim plunger, luer hub,
  needle, orange cap, blue haemolymph column. Carry it **and** the crab, then
  **use** either one: the needle goes into the hinge, the plunger draws back
  and the barrel fills (`startExtraction()`). The **crab is spent and leaves
  your pack**; the blood is never an item either — it runs straight into the
  **tally in the top-left corner** (the jar model from `models/blood-jar.js`,
  turning on the spot beside a mL count).
- **The children's sand shovel** — the first item down the beach, stuck in a
  **sand castle**: bucket-molded stacked towers with crenellations, a curtain
  wall with a collapsed section and rubble, drip-castle blobs, shells pressed
  into the walls, a scratched moat and the spoil pile from digging it. Take
  the shovel and it auto-equips: a first-person **bare hand and forearm**,
  fist closed around the shaft (aspect-aware so it stays framed at any window
  shape), and **click digs wherever the crosshair is pointing** — a layered
  synth *shff → crunch → grain-spray* sound, a detailed crater (irregular
  pit, dark undercut bowl, shovel gouges, scattered clods) with a real 3D
  sunk cone + spoil mound, and a burst of tumbling low-poly sand chunks.
- **Footprints** — pre-stamped trail behind spawn, new prints as you go
  (toe pointing the right way), footstep sound; oldest recycle.
- **The sand cliff** — a lofted eroded escarpment, scalloped lip, vertical
  runnels, talus at its foot; periodic erosion so it tiles seamlessly.
- **The wrack line** — kelp clumps and ribbons, scallop and spiral shells,
  water-worn pebbles, planks and gnarled branches, bleached plastic scraps —
  all confined to the high-tide band and tiled down the beach.
- **The city** — pushed far back and heavily fogged so you can only just make
  out rooflines and a scattering of lit windows, under a faint sodium
  light-pollution wash that lifts over the cliff ridge.
- **The lighthouse** — fixed tower far down the beach; the lamp + beam are
  fog-exempt so you see it turning from the start, the tower emerges from fog
  as you close in. A **trodden path** runs up to it through the boulders and
  marram grass, ending at a lit **timber door** in a projecting stone
  surround, which you have to open before the wall will let you in. Every
  built part is dimensioned off the scan (see `CLAUDE.md`): the doorway and
  four shaft **windows** are cut clean through it, the mast above y≈26.5 is
  cut away and replaced with a **gallery, railing, glazed lantern room and
  roof**, and inside a helical stair winds up a central newel past oil lamps
  and the windows to a hatch in the lantern floor — which is the ending.
- **Detailed low-poly ground** — procedural sand (mottling, ripples, grit,
  pebbles, shell flecks) with a self-illuminating emissive map.
- **Livelier ocean** — layered swell/chop/ripples, animated micro-normals,
  scrolling whitecaps, and a breaking swash band that fizzes and slides in
  and out with a tide + wave-set shoreline (`shoreLine()` in GLSL).
- **Night mood** — haloed moon + reflection, stars, fog, synthesised
  wind/surf that swells in sets.
- **Pickup shine** — takeable things (the crab, the shovel) carry a soft
  additive glint and a gentle lift in their own emissive, so they separate
  from very dark sand without turning into waypoint markers.
  `addItemShine()`.
- **The enemy crab** — a bigger animal on a proper rig: eight two-bone legs
  walking an alternating-tripod gait, articulated claws that weave as it
  closes, gape when it rears and snap shut on the strike, eye stalks that
  lean toward you, and a death that rolls it onto its back with the legs
  curling in.
- **Audio mix** — every one-shot effect routes through an **SFX bus**
  (`sfxBusGain`) under the master volume, with its own *Effects volume*
  slider. Previously they went straight to the speakers, which is why
  digging was so loud.

## Layout

| File | Purpose |
|------|---------|
| `index.html` | Page shell, HUD, title, intro card, settings menu, hotbar, examine view, end screen |
| `main.js` | The whole game |
| `models/` | Standalone object models + a dev viewer (`horseshoe-crab.js`, `viewer.html`) |
| `assets/backrooms.m4a` | Opening music (mono AAC, converted from the source WAV) |
| `vendor/three/` | three.js r160 (vendored, offline-safe) |
| `serve.py` | Tiny static server |

## Tuning knobs (top of `main.js`)

- `RETRO_SCALE` — internal render resolution (lower = chunkier pixels)
- `WALK_SPEED` / `RUN_SPEED` / `RUN_SECONDS` / `STAM_REGEN` / `JUMP_V`
- `MOON_DIR`, `EYE_HEIGHT`, `DIG_DUR`
- `WADE_X` / `CLIFF_BLOCK_X` — the two invisible walls
- `CLIFF_X` / `CLIFF_H` / `CLIFF_PERIOD`
- `LH_Z` — how far the lighthouse (the ending) is; `END_Z` is the trigger
- `CITY_TILE` and the `towers` block — city distance / height / density
- `CASTLE_Z` — where the shovel-in-a-castle sits; `crabWorld.position` — the crab
- `inspectDist` / the `k` fit factor in `inspectSetModel()` — examine-view framing
- `layoutViewmodel()` / `shovelVM` transforms — the first-person hand pose
- `INTRO_LINE` + the setTimeout offsets in `beginGame()` — opening pacing
- `MUSIC_TARGET` / `MUSIC_FADE_IN` / `MUSIC_HOLD` / `MUSIC_FADE_OUT`
- `PATH_LEN` / `PATH_HALF` / `pathBend()` — the lighthouse path's shape
- `CRAB_SPEED` / `CRAB_REACH` / `CRAB_WAKE` / `crab.scale` — the enemy crab
- `DEFAULT_SETTINGS.sfxVolume` — how loud one-shot effects sit
- `FOOT_POOL`, `REACH`, `NOTE_TEXT`, `scene.fog` density
- `DEFAULT_SETTINGS` — starting FOV etc.

`window.__bw` is a dev hook (scene, camera, physProps, inventory, lighthouse,
castle, crab, `startDig`, `toggleEquip`, `openMenu`, `openInspect`, `showEnd`,
…) for the console.

## Next steps

- Real note art; more items and scripted events along the walk (the examine
  view is ready for more examinable objects — add a model in `models/`)
- Object–object physics collisions (currently ground + walls only)
- Two-handed / nicer dig animation
- Persistent dig holes (pool currently recycles after 20)

## Credits

**Lowpoly Rocks - 3** — the rocks along the beach and the headland.
["Lowpoly Rocks - 3"](https://sketchfab.com/3d-models/lowpoly-rocks-3)
by [Loïc Norgeot](https://sketchfab.com/norgeotloic), [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).

**Grass pack (lowpoly, game-ready)** — the grass on the headland.
["Grass pack (lowpoly, game-ready)"](https://sketchfab.com/3d-models/grass-pack-lowpoly-game-ready)
by [LOLIPOP](https://sketchfab.com/lolipop_1707), [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Animated Crab rigged FREE** — the enemy crab.

["Animated Crab rigged FREE"](https://sketchfab.com/3d-models/animated-crab-rigged-free-ca331da937b04b0f94b9245d5f2ac778)
by [TwilightFox](https://sketchfab.com/twilightfox), under the
[Sketchfab Standard licence](https://sketchfab.com/licenses) — commercial use
and derivative works allowed.


**Beach Rock** — the large scanned boulders along the tideline.

This work is based on
["Beach Rock"](https://sketchfab.com/3d-models/beach-rock-a4998ae7cb764287a03c70a544bd0d3d)
by [SmallpolyArt](https://sketchfab.com/SmallpolyArt)
licensed under [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).
Commercial use is allowed; the credit has to stay.


**Beach Rocks 001** — the lower rocky patches.

["Beach Rocks 001"](https://sketchfab.com/3d-models/beach-rocks-001-89d1260414cc4ecf88a736bfa01a4127)
by [DEEP C](https://sketchfab.com/deepc326), under the
[Sketchfab Standard licence](https://sketchfab.com/licenses) — commercial use
and derivative works allowed.

Both are photogrammetry of a patch of ground rather than of a rock, so
`tools/gltfrocks.py` merges the chunks, decimates by vertex clustering, then
pulls the individual rocks out as raised features and drops the sand they were
sitting in. The baked albedo is kept and downscaled to 256px; the UVs are the
reason these keep theirs where the older packs don't.


**Seaweed Patch** — the wrack along the tideline.

This work is based on
["Seaweed Patch"](https://sketchfab.com/3d-models/seaweed-patch-ed57fa7a769f439ba0ac90e400b2e5af)
by [emcderm](https://sketchfab.com/emcderm)
licensed under [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).
Commercial use is allowed; the credit has to stay.


**Eroded sand edge on Rügen beach / RealityScan** — the face of the sand cliff.

This work is based on
["Eroded sand edge on Rügen beach / RealityScan"](https://sketchfab.com/3d-models/eroded-sand-edge-on-rugen-beach-realityscan-f2653102a2bc440e925970c3d6b2ca83)
by [hhdev](https://sketchfab.com/hhdev)
licensed under [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).
Commercial use is allowed; the credit has to stay.

Only its albedo is used. A scan atlas doesn't tile, so the cliff takes the
most even 1536px patch of it — picked by scoring crops for darkness and
variance — mirrored into a 2x2 so the edges match, then reduced to 256px. The
cliff's own bump map is kept on top, because a flat crop has no runnels.

