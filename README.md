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
| `1`–`6` / click a slot | Use / equip an inventory item |
| `Q` | Holster the equipped tool |
| `Esc` | Pause / settings menu (and close the note) |

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
  Clicking begin drops to black, the opening line fades in for a few
  seconds, then the world fades up. `INTRO_LINE` / the timings in
  `beginGame()`.
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
  note, `NOTE_TEXT`) or **equip** (the shovel).
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
  as you close in. Walking past it shows the end screen.
- **Detailed low-poly ground** — procedural sand (mottling, ripples, grit,
  pebbles, shell flecks) with a self-illuminating emissive map.
- **Livelier ocean** — layered swell/chop/ripples, animated micro-normals,
  scrolling whitecaps, and a breaking swash band that fizzes and slides in
  and out with a tide + wave-set shoreline (`shoreLine()` in GLSL).
- **Night mood** — haloed moon + reflection, stars, fog, synthesised
  wind/surf that swells in sets.

## Layout

| File | Purpose |
|------|---------|
| `index.html` | Page shell, HUD, title, intro card, settings menu, hotbar, end screen |
| `main.js` | The whole game |
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
- `CASTLE_Z` — where the shovel-in-a-castle sits
- `layoutViewmodel()` / `shovelVM` transforms — the first-person hand pose
- `INTRO_LINE` + the setTimeout offsets in `beginGame()` — opening pacing
- `MUSIC_TARGET` / `MUSIC_FADE_IN` / `MUSIC_HOLD` / `MUSIC_FADE_OUT`
- `FOOT_POOL`, `REACH`, `NOTE_TEXT`, `scene.fog` density
- `DEFAULT_SETTINGS` — starting FOV etc.

`window.__bw` is a dev hook (scene, camera, physProps, inventory, lighthouse,
castle, `startDig`, `toggleEquip`, `openMenu`, `showEnd`, …) for the console.

## Next steps

- Real note art; more items and scripted events along the walk
- Object–object physics collisions (currently ground + walls only)
- Two-handed / nicer dig animation
- Persistent dig holes (pool currently recycles after 20)
