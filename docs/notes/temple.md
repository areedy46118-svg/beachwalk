# The desert temple, and the crow on the stump that takes you there (2026-11-18)

The owner: "add the crow again on a tree stump before the castle but after the whale. when interacted with have it grab
you and fly you far over the ocean very high up until you cant see anything but clouds have the clouds open up in a
dramatic theatrical way to this temple where you are then dropped and stand up to look exactly where this screenshot
is ... make the floors blend ... a huge desert ... colliders good ... fog to hide flaws ... the near temple cleared of
sand to be an area to fight in ... i dont wanna fall through the map or clip through any visible walls or floors."
Code: the section "THE DESERT TEMPLE" at the end of `main.js` (state flags `inTemple`, `tmpCut`, `tmpFlown`,
`tmpModuleIn` near the top, beside `crowGone`: a frame can run before the module is read).

## The asset
- Sketchfab "Temple USD Workflow Test 3", re1monsen, CC-BY-4.0 (README credits). Source in `incoming/temple/`
  (gitignored): the download, `bake.html` (the ground bake) and `look.html`/`shot.sh` (a per-mesh contact sheet and
  views, `?mode=sheet|grid|view`).
- `python3 -I tools/temple_pack.py incoming/temple assets/temple.glb --dune -54,0,1.5,14,30` → 2.46 MB. Keeps nodes
  `temple.001`–`.010` (podium, columns, roof rings, altar ring, the black centre disc, the fallen block and three fallen
  columns) and `.025`/`.026` (the two far colonnades). Drops the camels (`.019`–`.024`), the cloaked figures (`.016`–
  `.018`), the two lines of little people (`.029`, `.030`), the sand heaps on the floor (`.015`, `.028`), the pebbles
  (`.012`), `.011`, `.027`, and the three terrains (`temple_0`, `.013`, `.014`).
- **three sanitises node names: `temple.013_13` is `temple013_13` once loaded** (the dots go). Look them up that way.
- Scale: the model's own frame × 0.06 (Sketchfab root) × **11** = metres. The temple is 20.5 m to its roof ring, its
  podium 26 m across, its floor `TMP_FLOOR` 0.81 over the room's zero, edge `TMP_POD_R` 13.1. The figures in the file
  are not to the temple's scale (the camels 2 units, the people 0.5); the temple was scaled to read as a temple.

## The ground: one surface
- The model's terrains were three meshes at three resolutions over each other — near (±53 m, 123k tris), mid (±1 km),
  far (±15 km, offset 6.5 km) — and where the near one ended there was a ten-metre cliff down to the mid one. That is
  the "floors look bad".
- `bake.html` RASTERISES every terrain triangle onto a non-uniform grid (0.75 m cells to ±45 m, +8 %/cell to ±1 km,
  +16 %/cell to ±10 km: 281²). A raycast per cell never finished (60k rays into 123k triangles with no BVH). It logs
  the JSON in `[BKJ]` console chunks (`--dump-dom` with a virtual time budget returned before the module ran).
- The packer: base (mid+far) lifted by the mean near−base difference at r 40–50 (2.57 m), the lift let down over
  48..260 m; near and base cross-faded over 36..52 m; the sand round the podium let down to 0.45 (a 0.36 m step onto
  its 0.81 floor, under `ROCK_STEP`); under it ≤ 0.6; and `--dune` bells (x, z, top, σx, σz).
- **The mesh and the walk are the same triangles**: `tmpSandRaw` splits each grid quad on the b–c diagonal exactly as
  the index buffer does, so where the sand is drawn is where your feet are.

## The far world drawn nearer
- The far colonnades are 4.4 and 8.6 km off and 700 m up in the model's frame; the camera's far plane is 5 km. Past
  `TMP_CMP.R0` (560 m) from the VIEWPOINT every sand vertex and the two colonnades are pulled in along the line from the
  viewpoint's eye (`tmpPull`, factor `R0 + (r−R0)·Q`, height scaled about the eye): from the screenshot's spot they keep
  exactly their bearing and their size on screen. Nothing walkable is inside R0's reach of change.

## The air
- `FOG_CAP` (new, in the shared fog chunk AND added to every `ShaderLib` uniforms block — **the game copies its fog
  uniforms into ShaderLib in a loop; a uniform only in `UniformsLib.fog` never reaches MeshStandardMaterial**, and the
  cap silently did nothing until it was in that loop): `fogFactor = min(fogFactor, 1 − x)`. 0 everywhere but the
  desert (default 0 on purpose: a shader that missed the uniform reads 0 = no change). In the desert x = 1 − 0.32:
  the far dunes and colonnades keep two thirds of their own dark, as in the screenshot.
- The sky is its own dome (`tmpSky`, a ShaderMaterial): **a ShaderMaterial without `#include <tonemapping_fragment>`
  and `<colorspace_fragment>` writes linear values straight out** — the first sky came out far darker than its colours.
- The storm at the edge: past `TMP_STORM_R` (88 m) fog density rises ×6.5 and the cap opens; `TMP_WALK_R` (140 m) is
  the edge. The wind bed is ×1.5 in the desert (`windBedK`), the surf bed off (`beachBedK`).
- Blowing grains (800 points round you) and fourteen dust banks rolling round 30–140 m off: `tmpAirTick`.
- Lights: the five night lights are re-dressed as an overcast day on the way in and put back exactly on the way out
  (`templeEnter`/`templeLeave`, the dojo's pattern). Nothing added or removed (no recompile).

## Solids
- `tmpBuildSolids`: the columns (`temple002_2`), the fallen block (`.006`) and the fallen columns (`.007`–`.009`)
  sampled at 0.1 m over every triangle; a sample between 0.3 and 2.4 m over the ground under it marks its 0.25 m cell
  with its height (empty = −1e9: **a solid's top can be under the room's zero** — the first version used −1 as empty
  and counted 222,664 "solids" in a 147,456-cell grid). Runs of free cells closed in on all four sides within 3.2 m are
  filled (a column's shell is a ring: nothing can be set down inside it).
- `tmpWalk`: the frame's step from `_preMove` taken in 0.15 m legs, each pushed out of every cell over a step above the
  feet (3 passes), and a step that would END with the body's middle in a cell is refused. `tmpClampPlayer` is the
  room's word in `clampPlayerToRoom`. A low top under you within a step is floor.
- Measured, probe `templeWalk` (`PB_PORT=4218 sh tools/probe.sh templeWalk`): a 26-leg route round, through and out to
  the edge, at 4.5 and 40 m/s: 49,544 + 69,038 frames, 0 with the feet under the floor, 0 with the body in a solid,
  0 past the edge. Walking out from the middle: 6 of 8 rays pass between the columns, 2 stop at a column's face.

## The viewpoint (`TMP_VIEW`) — measured against the owner's screenshot
- Bearings: the angle between the two far colonnades (21°) over the third of the screen they span gives the
  screenshot's lens, ~40° vertical. Solved for where the temple sits at 0.66 across with A at 0.12 and B at 0.45:
  west of the temple, turned 0.17 rad left of it.
- Height: A's base sits 1.3° over the frame's middle and it is 9° up from any spot near the temple, so the camera was
  looking ~8° UP, and then the temple's base/top (0.77/0.13 of the frame) put the eye ~2.4 m over the floor, ~50 m out.
  A first guess (eye 9 m up a sculpted dune) had the framing and the far dunes all wrong. Now: (−54, 0), a 1.5 m rise
  there (`--dune -54,0,1.5,14,30`), pitch 0.135, lens 40 (the cut ends on it; `wantFov` lets it out to the setting).
- Compare: `templeFlight`/`temple` probes write `arrive.jpg`; the screenshot crop is 436..1324 × 110..608 of the
  2000×837 capture.

## The flight (`tmpCut`, `TMP_T`)
- Beach: the crow screams (the owner's scream file, quieter, `tmpScreech`) and goes up off the stump (it grows to
  `TC_CARRY` as it goes — above you, unseen); a beat; it takes you (trauma, scream, gasp, wind bed), and you are carried
  up and out over the sea (`TMP_BEACH_KEYS`, Hermite): you look down, then UP at it against the night cloud (its belly,
  its wings), then out over the moonlit sea. The beach's fog thins as you rise (the sea opens under you) and two dark
  moonlit cloud sheets hang 150 and 172 m up across the path; you go into the lower one, and the screen is the dark
  cloud's grey (`#tmp-white`, a DOM cover at z 9).
  - **Tinting the night fog toward a cloud grey made the sea a flat pale plane with a hard edge on the stars.** The fog
    is left the night's; only its density moves.
  - Sprites seen from above are flat discs facing you: the deck and the ceiling are layered SHEETS of drifting fbm
    (`tmpCloudSheet`), lit crowns and grey hollows, with a hole whose edge a coarser noise tears into lobes.
- The cut behind the cover: `tmpToRoom` (`clearRoomFlags`, the room up, `templeEnter`). The cover goes from the dark
  cloud's grey to the lit cloud's and lifts on a sea of cloud from 318 m; you look up at the crow black on the bright
  overcast, then down; the deck tears open from the middle outward (`part`), a swell under it (`tmpSwell`), soft light
  down through the gap (`tmpRays`, additive cones bright where you look into them), and it carries you down through
  the hole onto the rise; the deck fades before the end (a sheet 230 m up crossed the far colonnades from the ground).
- Let go ~3.4 m up: you fall, thud (`sfxThud`, `sfxBodySlam`, trauma, sand puffed), a blink, lying with the eye 35 cm
  up and the view rolled; then up, onto the screenshot, the lens at 40; `tmpFinish` stands you there (`placeInTemple`),
  saves (`autosaveNow`), `tmpFlown`. The crow flies on over the temple into the haze.
- While it runs: `frozen()` includes `tmpCut`; `body.tmp-cine` hides the HUD (the wake's list); the held item is not
  drawn; `saveCheckpoint` refuses (a beach checkpoint line crossed in the air would have saved you over the sea); the
  menu pauses it.
- Probe `templeFlight` (fake clock): stills at every phase into /tmp/bw-fl; ends with the fov back at the setting.

## Saves
- `saveRoom` 'tmp', `ROOM_BACK.tmp` (seat/place), `ROOM_FILES.tmp`, the flag `tmpFlown` in the flags (restore calls
  `tmpReset`: the crow back on its stump or gone, no cut resumed). Probe `templeSave`: the flight to its end, the page
  reloaded into the checkpoint the menu's way: in the desert on the rise at (−54, 0), on the floor, the crow gone, a
  second flight refused.

## The stump
- `TMP_STUMP` = (10.5, `WB_Z − 35`): the whale lies across the beach at `WB_Z` (`WB_DIR` is +x: snout at the dune),
  the castle's front starts ~`WB_Z − 55` (`fortMaskAt` grid, probe `stumpGrid`), and `CLIFF_BLOCK_X` is 14.2. At
  `WB_Z − 52` it stood against the castle's corner tower.
- Built in code (a sawn trunk, four roots, a ring-faced top, flat-shaded), a `rockColliders` cylinder (`mat: 'wood'`).
  Its base is asked of the beach's ground when you come within 220 m (`wbBermAt`/`sandMoundAt`: neither exists at
  module time).
- The crow: its own parse of `crow.glb` dressed as the dock's, stood 0.95 m tall on the stump, turning its head to you;
  `HJ_BIRD_CUTS`/`hjClipCut` for its flight. "Approach the crow".

## Not done / for later
- There is no way back to the beach from the desert yet (the owner asked for the arrival and an arena; the way out and
  the fight are his to decide).

## 2026-11-18 (night): the pick-up in sight, the scream only at the drop, an endless sea, a grand desert, real sand in the air
The owner: "have the 2nd crow only do the crow sound effects when close to him and flying with you. actually make it
look like he picks you up he disappears for a second. the flight should look over an endless sea i can see the end
where the world cuts off … use fog to make it look like a never ending horizon. make particle effects in the desert
more realistic. i want that area way bigger too it should feel grand. even if you have to take out those broken
pillars …" and then "only do the crow scream when he drops you".
- **The pick-up** (`updateTempleCut`, before `TMP_T.grab`): it was HIDDEN from `TMP_T.up` (2.3 s) to the grab, a wingbeat
  sounding from nowhere at `beat`. Now a Hermite path built at the first frame (`T.ck`, from the stump top and where you
  stand): up and back over the stump, a turn at the top of the climb to one side, down at you out of the sky, onto
  your shoulders at `grab` (where `tmpCrowCarry` takes it: P0 + 1.25 up). Faced along its own velocity, tipped back
  talons-first in the last 0.35 s, growing 1 → `TC_CARRY` as it comes; the lens on it, quicker in the last 0.7 s. The
  carry's look starts from that look up (`T.pitchG`, blended over 0.55 s) instead of snapping to the sand.
- **Sounds**: no scream at the stump or the grab — only `tmpScreech(0.35)` at the drop. The stump's rustle and the
  lift-off's wings are `sfxAt` the stump; the dive's wings `sfxAt` the bird, once, inside 8 m; in the carry the wings
  per beat (it is on you). Probe stills `f01_stump … f03c_taken`.
- **The endless sea**: 150 m up the 2.2 km tile's edge and bare sky under the horizon were in view. `oceanFar` (the
  4.7 km ring + its skirt) is shown in the flight (`updateIsleMagic`), the skirt raised to 180 m; the night's cloud
  sheets are 4.7 km wide and FOG into the game's LIT fog colour with distance, going solid there (`uFogD`, `uFogC` +
  `fogMoon`/`fogTint` shared from `UniformsLib.fog`).
  - **The seam was the fog colour, not the geometry**: the shared fog chunk LIFTS the base colour toward the moonlit
    horizon (`fogMoon.w`), so the fogged sea went to ~rgb(15,31,66) while a sheet fogged to `scene.fog.color` went
    darker. Probe `horizonDbg` draws one frame with each layer taken away and reads the pixels.
  - The sheets' haze is gentler than the scene's (`min(density, 0.0028) × 0.55`): at the scene's own the moonlit cloud
    over you was fog before it was cloud.
- **Grand**: `TMP_WALK_R` 140 → 420, `TMP_STORM_R` 88 → 300 (still inside `TMP_CMP.R0` from the viewpoint). Probe
  `templeWalk` now goes out to the edge and past it: 89,059 + 121,832 frames, 0 under, 0 in a solid, 0 past.
- **The three fallen columns are out** (`.007`–`.009`): `temple_pack.py`'s node regex keeps `.001`–`.006`, `.010`, `.025`,
  `.026`; the solids list is the columns and the fallen block only. temple.glb 2.44 MB.
- **The air, rebuilt** (`tmpAirBuild`/`tmpAirTick`): it was 800 grey specks and quantised puff sprites circling you.
  Now one gusting wind (`tmpGust`, layered slow sines, also into `airGust` for the wind bed) and three layers:
  saltation ribbons (260 quads in one buffer, each turned about the wind's axis to face you, a hand to a knee over the
  ground, living a second or two; never within 3 m — near the lens they were white slashes, RAIN; the sand's colour,
  not white), fine dust (1,400 points, 0.016, none within 1.6 m — near the lens a point is a square), and far walls
  of blown dust (16 sprites of smooth noise with a ragged top, sliding downwind across the dunes 60–320 m off).
  Probe `templeAir` (three stills). `tmpPuffTex`/`_tmpPuff` are gone.

## The walkable temple 2.4× bigger, for a fight (2026-11-18, "i wanted the temple way bigger theres going to be a fight there" / "the one temple you can walk to")
- **`TMP_SCALE = 2.4`** (main.js) scales the NEAR rotunda only: `tmpBuild`'s root is `K * TMP_SCALE` (and its centring
  offset with it). Everything measured off the model at 1× is written times it: `TMP_FLOOR = 0.81 S`, `TMP_POD_R =
  13.1 S`, `TMP_GRID_R = 48 S` (the solids' grid half-width), the column shells' fill reach `3.2 S / TMP_CELL`.
- **The two far colonnades stay their size and place**: they hang under the same root, so each gets `unS =
  makeScale(1/S)` on its box and on `objInRoom` — without it they grew 2.4× and walked 2.4× further out.
- **The viewpoint goes back as far as the temple grew**: `TMP_VIEW.x = −54 S` (−129.6), so the owner's screenshot
  framing (turn 0.17, pitch 0.135, fov 40) is the same picture. The crow's drop lands there.
- **The sand is repacked to match** (`tools/temple_pack.py --scale`): the floor 0.81 S, the podium's edge 13.1 S, the
  skirt that flattens the sand round it `4.0 S + 20 (S−1)/S` (3.9 at 1×), and the landing dune moved to the new view:
  `python3 -I tools/temple_pack.py incoming/temple assets/temple.glb --scale 2.4 --dune -129.6,0,6.0,34,72` (2.44 MB).
  The walkable ring (`TMP_WALK_R` 420, storm 300) did not change: it is still inside `tmpPull`'s R0 = 560.
- **Tests** (headless, own ports): `temple` floor 5.97, eye 7.67, 3,738 solid cells; `templeWalk` 157,587 fast frames:
  0 under the sand, 0 in a column, 0 past the edge, 0 drops (walked outward from the middle it is stopped at r 42.6, or
  21-22 where a column is in the way); `templeSave` restores at −129.6, 7.67 with the flight done and no second
  flight; `templeFlight` lands at −129.6 and stands at 7.7, the rotunda filling the 40° lens as before. `tmpS().flown`
  reads false on the probe's last line only because `tmpFinish` runs after it (the save reads it true).
