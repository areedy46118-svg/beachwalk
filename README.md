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
| `Ctrl` | Crouch (toggle) — crawl under the pier |
| `G` | Drop the held object gently |
| `1`–`6` / click a slot | Hold an inventory item — everything can be carried |
| `Tab` → `Inspect` | Examine an item. The pack is the only way in |
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
- **The heavy swing** — hold the **right button** and the shovel hauls back
  and keeps straining; let go and it drops from exactly where your hands were,
  with no re-wind and nothing to snap through. Release to blade moving is one
  frame, and the drop is about 130 ms of accelerating arc against the 370 ms
  a left click takes from rest. A heavy also reaches **6.6 m to a click's
  4.2 m**, so there are angles you can only land wound up, and it throws more
  sand, shakes the camera harder and kills the crab from further out. The
  shaft creaks when the charge tops out, and the blade leaves a **trail** —
  a thin streak off the cutting edge that brightens with how hard you swung.
- **Glass floats break** — three of them along the walk, and a hard throw
  shatters one into shards that bounce and settle. A drop from your hand does
  not; breaking one is always something you chose.
- **The dock house** — sixty metres past the wreck, a pier on piles standing
  out from the cliff foot into the surf, with a shed on the boards, a lamp lit
  on the post at the sea end, and a boat tied up under it. The beach has
  drifted up against its land end; walk up the sand and onto the boards. The
  pier is solid — you cannot walk in under it. Its sea end and the last
  stretch of its sides hold you out of the surf; over the beach the sides are
  open, so step off onto the sand and carry on. Boards knock underfoot. The
  shed door opens with `E`. The crate
  by the lamp post breaks the way the one under Bradly does, and holds
  **A Rusted Key** — a scanned medieval key — that, for now, opens nothing.
- **The shells** are scans now. Take one and it goes straight into your hand;
  click to hold it to your ear, and the hand rises to the side of your head
  while you listen — the sea, and nothing else. Put the shell down and it
  goes silent at once.
- **Throw anything at anything.** A thrown prop splashes going into the sea,
  lands on the pier's boards instead of dropping through them, bounces off
  rock and timber with a sound that matches what it hit, and will kill the
  crab outright.
- **Crouch (`Ctrl`) to get under the pier.** Nothing solid can be walked
  through: the piles, the light post and the boat are all real, and you can
  stand on the boat and step off it.
- **Walk speed always starts at 1.4×.** The slider in the menu is for the
  session you are in; it is not remembered.
- **The crate below Bradly** — washed up at the cliff foot, and the first lock
  in the game. A left click thuds off the boards. Only a wound-up heavy (about
  two-thirds of a full charge) puts the blade through the lid.
- **The Octopus Ring** — in the crate: a scanned ring, an octopus with its
  arms curled round to make the band, gone to rust — the metal is a real rust
  texture projected onto the scan. Take it, examine it, and press `E` to put it on — it leaves
  the pack for a new **Rings** section, two slots under the hotbar that appear
  the first time a ring is in your hands. Click a worn ring to take it off.
- **The crab telegraphs** — it no longer nips the instant it reaches you. It
  rears with its claws thrown wide and its pincers gaping for 18 frames while
  a rasp climbs under it, strikes for 6, and is then wide open for 20. The
  reach is re-checked on the frame the claw closes, so backing off during the
  wind-up actually works, and the recovery is your opening to swing back.
- **The kill lands in two beats** — the blade connects, time stops for five
  frames with the crab still there, folded up under the shovel and thrown
  back, and *then* it comes apart.
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
- **The lighthouse** — a whitewashed conical tower with a black lantern, the
  brightest thing on the headland. Inside, a round brick shaft with a slim
  red cast-iron spiral stair wound round a central steel pole, standing free
  of the wall: thin diamond-plate treads, one continuous red handrail on the
  outside, oil lamps on the brick every half turn, moonlight standing in the
  windows and washing down from the lantern glass. Climb it, and put your hand on the light to end the walk.
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
- **The rock formation** — six real scanned granite boulders
  (`assets/rocks.glb`) in one heap on the sand below Bradly, and only there: a
  dominant mass with smaller ones leaning into it, two riding up on the pile,
  a skirt of half-buried chunks, and sand banked against the lot so they sit
  *in* the beach rather than on it. Solid — you're pushed out of them and can
  climb them. The scans were baked in daylight, so `reexpose()` gamma-lifts
  the albedo for the moonlight.
- **The body bag** — a corpse roped at the head and the feet
  (`assets/corpse.glb`), on the high-water line thirty metres short of the
  wreck, tipped on its side and settled into the sand, clear of the tide at
  every state of it. You read it as a black bar long before you can tell what
  it is. Solid; looking at it says one line and offers you nothing to do.
  `CORPSE_X` / `CORPSE_Z`.
- **The stuck gate** — the barred outlet in the back wall of the drainage
  tunnel home now says **Look inside**. Press `E` and you lean the last half
  metre onto the bars while the FOV squeezes to 24°, which is the zoom and is
  also what crops the lit room out of frame. Eight metres of ribbed pipe run
  back into the hill. Nothing is down there — and then, a second and a half
  later, a pair of drawn eyes fades up out of the black — a drawing of
  Ethan's, knocked out to alpha — blinks at its own pace, drifts, creeps
  closer, and is gone again within a few seconds. Cave drone, far-off drips
  and the whisper track pushed down a delay so it reads as somebody muttering
  to himself round a bend. `E` again backs you out.
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

**Grass pack (lowpoly, game-ready)** — the grass on the headland.
["Grass pack (lowpoly, game-ready)"](https://sketchfab.com/3d-models/grass-pack-lowpoly-game-ready)
by [LOLIPOP](https://sketchfab.com/lolipop_1707), [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**(FREE) Realistic Rocks - Asset LowPoly** — the rock formations on the beach.

["(FREE) Realistic Rocks - Asset LowPoly"](https://sketchfab.com/3d-models/free-realistic-rocks-asset-lowpoly-6e02ec577b4a473fb173c54fd6eef62d)
by [Domenico Bianco - Pizza&Games](https://sketchfab.com/pizzaandgames),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Sea shell** — the shells on the wrack line, and the one you hold to your ear.

["Sea shell"](https://sketchfab.com/3d-models/sea-shell-742a5f4a7bc84abe8d0c645cdb411cc8)
by [blenderboom](https://sketchfab.com/blenderboom),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Dock House - Stylized Wooden Pier** — the pier past the wreck.

["Dock House - Stylized Wooden Pier"](https://sketchfab.com/3d-models/dock-house-stylized-wooden-pier-4f0df975625a432c91f2685963d12500)
by [voyoo](https://sketchfab.com/voyoo),
[Sketchfab Standard](https://sketchfab.com/licenses) licence.


**Medieval key (copper version)** — the key in the dock's crate.

["Medieval key (copper version)"](https://sketchfab.com/3d-models/medieval-key-copper-version-21595543c33a4150bc65d04e025aa84c)
by [Sousinho](https://sketchfab.com/sousinho),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Rusty Metal 02** — the rust on the ring.

[Rusty Metal 02](https://polyhaven.com/a/rusty_metal_02) by Poly Haven, CC0.


**Octopus Ring** — the ring in the crate.

["Octopus Ring"](https://sketchfab.com/3d-models/octopus-ring)
by [Thunk3D scanner](https://sketchfab.com/Diana123456),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Corpse in a black body bag with ropes** — the body on the beach before the
wreck.

["Corpse in a black body bag with ropes"](https://sketchfab.com/3d-models/corpse-in-a-black-body-bag-with-ropes-fb2fe10ba9b14982b5785d73d7155daa)
by [Dennis Hafemann](https://sketchfab.com/dennis.hafemann),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Procedural Eyes For Ray II** — the eyes down the pipe behind the drain gate.

["Procedural Eyes For Ray II"](https://sketchfab.com/3d-models/procedural-eyes-for-ray-ii)
by [ChamberSu1996](https://sketchfab.com/chambersu1996),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Rocks and stones pack** — the stone on the headland round the lighthouse.

["Rocks and stones pack"](https://sketchfab.com/3d-models/rocks-and-stones-pack)
by [shtran](https://sketchfab.com/shtran),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Simple grass chunks** — the grass clumps on the headland.

["Simple grass chunks"](https://sketchfab.com/3d-models/simple-grass-chunks)
by [3dhdscan](https://sketchfab.com/3dhdscan),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Realistic grass** — the dense grass along the lane to the door.

["Realistic grass"](https://sketchfab.com/3d-models/realistic-grass)
by [Pasha](https://sketchfab.com/Pasha.), under the
[Sketchfab Standard licence](https://sketchfab.com/licenses).


**Animated Crab rigged FREE** — the enemy crab.

["Animated Crab rigged FREE"](https://sketchfab.com/3d-models/animated-crab-rigged-free-ca331da937b04b0f94b9245d5f2ac778)
by [TwilightFox](https://sketchfab.com/twilightfox), under the
[Sketchfab Standard licence](https://sketchfab.com/licenses) — commercial use
and derivative works allowed.
