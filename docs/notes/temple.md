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

## 2026-11-19 — the Ancient King comes down (`KING`, `kingTick`, `kingCut`, `kingDown`)
"make him hover down when you get in the temple at the end" / "he hovers already on skecthfab" / "make a bright light and
dramatic when he is shown this is the final boss it should look insane" / "make it look less ai please".
- **The model**: Kaan Tezcan's "Free Character - Ancient King" (CC-BY-4.0, credited in README): a Character Creator rig
  (CC_Base_*, 102 bones, `*_scaleCompensation` nodes between them), 38.6k verts, 11 materials of 4K PNGs (~250 MB), 3.2 m
  tall, A-pose, facing +Z. `tools/gltfpack.py --tex 512 --normal-tex 128 --quality 82 --drop-mr --clips
  '1703142081216_TempMotion=hover'` then `glbquant.py --only=POSITION,NORMAL,TEXCOORD_0`, gzipped → `assets/ancient-king.glb`
  2.59 MB (the clip +0.25). His one clip, which looks like a placeholder by its name, IS his Sketchfab hover (4 s, every bone
  and his face's blend shapes): `KING.mixer` loops it. (A hand-made levitation pose came first — axes in his frame carried
  into each bone through its bind pose — and went when the owner pointed at the clip.) `tools/kingshot.html` looks at the
  file on its own (inflate + the game's dequantize).
- **The descent**: in `tmpWorld` (the room frame); stepping inside `KING_TRIGGER` (0.9 of the podium's radius) of the
  middle starts it — down from `KING_FROM` 62 m through the rotunda's open ring (sky over the middle: a ray up meets nothing),
  ease-out over `KING_DESC` 7.5 s, turning to you, to `KING_HOVER` 0.85 m. `kingCut` is in `frozen()` (declared at the top of
  the module with `tmpFlown`: `frozen()` reads it), the eye is taken with `cineHold` + `dialogHead` (his head bone) and
  `dialogFov` 50 → 24 as he comes. `kingDown` saved in the flags (restore: already there; `KING.placed` reset).
  `kingTick` never runs during `tmpCut` (the flight drives the room's light itself).
- **The showing, in light** (`KFX`, `kingLight`): ambient/hemi drawn down, the temple sky's `uK` to storm (1 − 0.62 d), the
  fog darker, the sun swung to straight overhead and up 2.4 — all off `templeEnter`'s own values each frame, `templeLeave`
  restores the night. A faint dust shaft (additive open cylinder, FRONT faces only — both faces made a white wall he was lost
  in — 3D value noise, peak 0.26), a warm pooled lamp on him (`lpAlways`). Landing: `airGust` (the temple's own sand), trauma,
  fovKick, the owner's `maceHeavy`. The first version (glow disc, motes, striped shaft, floor ring, white DOM flash, puffs that
  came out as black shards) was "AI"-looking: removed.
- Probe `tools/kingtemple.js` (PB_PORT 4265): on the podium at r 26, the descent from your eye, down at 8.67 s, hover 0.85,
  let go; close stills. Size after: 447.5 MB.
- **His moves once he is down** (`kingAct`, `KING.mode`; "make the final god boss sometimes flip over your head and land
  behind you like this" — Mixamo Front Flip; "sometimes run up the pillar to the very top of the temple and sit up top
  looking at you like this for 3 seconds then he hovers back down to fight" — Mixamo Wall Run; "give him the same float down
  like how he does when u first see him just that animation not the effects"). `tools/ntar_moves.py -- king` →
  `assets/king-moves.json` (flip 1.67 s / 6.5 m travel / hips up 1.3; wallRun 1.63 s / hips up 2.3), retargeted in the game
  by `ntarRetarget` with a stand-in unit (`kind.rag` = `kingRag()`, Wong's Mixamo→CC_Base map on his numbering;
  `facingRef: 'mixamo'`; it writes `clipSpeed`, `clipTravel` AND `clipAz` per clip — all three must exist) onto the bind
  `poseRig` read before his hover played. Modes: hover → flip (you 3.5–11 m off, landing 4.5 m behind you inside the podium;
  an arc of 3.2 m over the clip's own rise) / glide → climb (wall run ×0.55 up the nearest pillar's inner face) → perch (3 s
  on the ring's LIP, your eye taken with `kingLook` at fov 18) → drop (his first descent's ease-out for the height,
  turning at its 0.55, the lens 18 → 48, no light). No blow lands on you yet.
- **The pillars and the ring** (`KING_PILLARS`, `tools/kingpillars.js` + `tools/kinglip.js`, rays: the solids grid has no
  tall cells): 11, from 21° every 32.7°, inner face 23.0 m out, ~3 m wide. The ring on them is 6 m thick (underside 36.8)
  and STEPPED: inner lip at 22.0 m, 43.1 high; 46+ past 24.5. Perched on the high flat he was hidden by the ring's own
  bulk from the podium; on the lip, crouched, toes at 43.1, he shows against the sky.
- **TRAP: `setEffectiveWeight(0)` is for good.** `kingFeetAt` (where the wall run's feet are at its end, to land them on
  the lip) zeroed every other action with it, and three's fades multiply `weight`: the hover's fade-in after the perch
  multiplied nothing and he came down in his bind pose. Each action's `.weight` is saved and put back now.
- Probe `tools/kingmoves.js` (PB_PORT 4269): 54 s with you 8 m off — flips at 3.8, 12.7, 34.2, 48.1 s, climb 20.8 → perch
  24.6 → drop 27.5 → down 31.9.
- **No "E – End game"** ("take out e to end game at the end end when the boss dies"): the prompt and its action are gone;
  `kingDied()` is the door — his look let go, `showEnd()` 2.5 s on. Nothing calls it until his fight is built.

## 2026-11-20 — the Ancient King as a real fight
- **He is a creature now** (`MUT_KINDS.king`, KN_BASE): `natural` swings off his own takes, contacts measured by
  `tools/ntar_moves.py -- king` (it now logs every local maximum of the hands', knees' and toes' speed: `PEAKS`), several
  per take through `A.more` (natHold must be 0 for `more` to be timed — `naturalSwings` skips `moreT` when it holds). His
  own moves run through a new door, `kind.drive` (`kingDrive`, ahead of the AI in `updateMutantUnit`; true holds the AI off),
  `st.puppet` makes him untouchable (`hurtMutantCore`), `kind.onDeath` takes his death (`finishMutant`), `kind.kingBody` his
  clamp (`mutClampX`).
- **Three traps, each of which made him look broken:**
  1. `dressMutant` never ran `bwDequant` — his glbquant'd mesh came in as raw −1..1 under the skin: spikes. Now every
     creature's file is dequantized on dress (a no-op for files that are not quantized).
  2. `skinnedBounds` measured him 2 cm tall through his scale-compensation nodes and scaled him 170×: `kind.fixScale`.
  3. **Every joint of his hangs off a scale-compensation NODE, not a bone**, so `ntarRetarget` took each for a root and solved
     it against its parent's BIND world while that parent turned — rotations compounded down every chain ("hes flying
     around", his idle lying 40° over). `kind.boneGaps` solves such a joint against the nearest bone above it as it is that
     frame, through the gap's fixed turn. Check any new Character Creator / Sketchfab rig for non-bone parents.
- `calmChasers` (every save) put him back to sleep after his descent's autosave: exempt (`kingBody`), and the drive keeps him awake.
- Probes: `tools/kingfight.js` (the whole fight end to end: descent stills, 20 s stood in front of him, a forced flip, climb,
  death, credits), `tools/kingclips.js` (each clip at five moments, side on, nothing else running), `tools/kingdress.js`,
  `tools/kingroot.js`, `tools/kingbind.js`. Measured standing still in front of him: 11-15 swings and 6-10 hits in 20-24 s.
- His death (the owner): the Being Electrocuted take's FALL only, no lightning, the light gathering in him, then a bright
  soft burst (a sprite, additive, no depth test) and the screen white, pieces thrown (`KING_PIECES`, limbs in two each), then
  `kingCredits` (#credits, 48 s, Enter/Space/Esc/click) into `showEnd`; the end song starts with the credits.
- The final fight's air (`KA`, `kingAtmos`): black and white is a CSS filter on the game canvas (the probe's stills must draw
  it in: `g.filter = src.style.filter`), ground mist sheets, colossal columns 170-460 m out, ash, three faint shafts,
  `body.king-cine` letterbox bars. `kingAtmosOff` in `templeLeave`.
- Dev: "Teleport to desert temple (dev)" in the menu (`devTeleportTemple`), the king reset to not-yet-come.

## 2026-11-20 later — the king fought for real (`tools/kingduel.js`), the pillar slam, the end
- **"He never hit me" was three things, measured by fighting him** (`kingduel.js`: you kept 1.4-3.4 m off him with the
  katana, cutting when he is not mid-blow, `&guard=1` raising the guard through his contact windows; per blow, the nearest
  his striking limbs came to your body capsule, its height against your eye, its place on screen):
  1. at 3.4 m tall these man-against-man takes struck 2.6-3.5 m up, over your head — he is 2.6 m now (`fixScale` 0.8125);
  2. the blows land a metre out to his SIDE (the uppercut's fist 67° off his nose) and only 0.9-1.1 m in front of him, while
     he stood 2.0-2.3 m off — `kingMeasureBlows` poses each blow at its contact once his clips are in and sets its turn
     (`A.faceOff`, applied after `dkRootMotion`, which zeroes `u.faceOff`) and its stand-off (`stop` = reach + 0.42);
  3. `dkRootMotion` was rewritten to need `A.rmStop` tables, so `rm` blows stood where their wind-up began: his blows close
     with a plain `lunge` now. (The probe's own trap: posing an action that is not scheduled poses nothing — `play()` it.)
  After: unguarded, 37 health lost in 40 s; guarded, 10, with blocks registering. The knee combo is out of his rotation (its
  blows come down 2.5 m up whatever he does); the uppercut's jab is not a contact (thrown before he has stepped in).
- **The pillar**, at half of him only, no cutscene: sprint, wall run, then he steps up onto the lip (its top found by a ray
  down onto the temple — 43.6 m, r 22.85; the old perch 21.75 m out stood him on air), stands in his idle 2.6 s, and
  `kSlam` (Mixamo "Mutant Jump Attack", `ntar_moves.py -- king`): the gather to f18 at its own speed, the airborne frames
  stretched over a 1.9 s fall on a hopped arc to 1.6 m short of where you stood, the slam on f47 (`kingSlamImpact`: the
  mace's heavy impact twice, rings of sand, 2 health inside 4 m unless guarded, a shove), and its recovery as an opening.
- The death: the white comes up whole at the burst and holds; `showEnd` fades the stats in over it, the owner's hand-drawn
  BEACHWALK (`#end-title`, the title's own letter images) above them. No credits. No towers.
- The crow after the drop flies on over the temple at a crow's pace into the haze (`tmpCrowAway`, 25 s, past the cut's end —
  `tmpFinish` no longer hides it); your landing has the mace's heavy impact under it.
- The crow's drop (round two, the owner: "put a checkpoint when the crow drops you and have the crow fly above the pillar like
  it was but he dissapears by flying further even after the cutscene"): its first climb back (16 m/s, rising over the
  pillars), on past the cut until 16 s (~770 m out, 470 up); and a checkpoint written AS YOU HIT THE SAND (`saveCheckpoint`
  refuses inside the cut, so the cut is let go for the write; room 'tmp'). `tools/crowdrop.js`.

## 2026-11-20 round 3 — the king studied frame by frame (`tools/kingstudy.js`): every blow connects, the hunt, the bicycle flown
The owner: "THE FINAL BOSS FIGHT IS NOT GOOD MAKE ALL HIS HITS ACTUALLY CONNECT … STUDY HIS MOVEMENTS AND HIT BOXES WITH GREAT
DETAIL … HE SHOULD GET YOU ANYWHERE IN THE DESERT … FIX THE BICYCLE KICK … HE SHOULD FLY AND KICK A FEW TIMES".
- `kingstudy.js` records every swing every frame: his distance, the striking ends in the CAMERA's frame, the nearest any
  striking segment comes to the point 0.25 m ahead of the lens, the game's hit test, health taken; then per blow and where
  his time goes. Options in its header (`walk`, `flee`, `guard`, `only`, `shots`, `strip`).
- **From his stand-off every blow already went through your face** (kick 0.10 m, bicycle 0.06, uppercut 0.14). Every miss was:
  1. **thrown from too far**: `lungeLead` 0.18 at `lungeMax` 2.6 closed nothing — he arrived 0.5 m short. Now 0.55 / 7.5,
     and a blow's `reach` is stop + 0.45 (was + 0.7): he throws from where the closing can make it;
  2. **held to a 20.6 m circle while you could walk 420**: back to a pillar, or outside the ring, he stood 2.2 m off swinging
     at air for five blows running. `kingClampUnit` now lets him roam `TMP_WALK_R`, kept out of stone by `tmpPushOut`;
  3. **aim set at 0.8 of the wind-up**: a sidestep put the fist 0.3-0.5 m past your ear. `trackT` 0.05 / `trackRate` 10;
  4. **the chain cut the bicycle's second kick** (`chainAt` at the first's recovery): for `kingBody`, after its last `moreT`.
- `kingLands` (`kind.landFn`): `blowLands`, or any striking segment within 0.38 m of the point ahead of the lens, in front of
  it and on screen (landed blows pass 0.05-0.28 m off it, misses 0.6+).
- **His time**: a third of the fight went on flips and their slow turn round. Flips every 13-19 s, the turn at 1.9x, and out
  of it straight into a blow (`kingBackToFight(u, true)`: `forceSwing`, cool 0). No feints (they read as misses).
- **The hunt** (`KING_HUNT`): past 4.6 m he sprints at 7.8 m/s (you sprint 5.71), at 2.1 m into `kgRun` — the flown bicycle
  with `air` 0.33, its leap leading you by `u.st.recede` (your speed away from him, measured in `kingDrive`), and
  `smoothMove` NOT zeroing his run's speed at the swing's start (it did: he braked to 0 at take-off and fell 1 m short). A blow
  you outrun before its contact is dropped and he hunts again. `noDash` (the generic dash threw the first `use` key — the
  uppercut — from 6 m). Sprinting away nonstop: caught by the flying kick 6 of 7.
- **The bicycle**: Mixamo's take is ONE CYCLE made to loop (17 frames, f17 = f1, hips level: measured off
  `~/Desktop/BEACHWALK ASSETS/Flying Bicycle Kick.fbx`). `tools/king_bike_loop.py` writes `kBikeAir` (three cycles, six
  kicks at idx 7,15,…,47 of 48) into king-moves.json; played at 0.7 — 2.3 s off the floor, a kick each 0.38 s, lifted 0.3 m
  (`kingAirBike`, the model inside his group; more and the kicks pass over your eye) and driving at you between kicks.
  `comboGrace` 0.85 so six kicks are ~2 health, the rest land as grazes; `guardK` 0.5 a kick.
- **The guard**: `blockCost` 0.8 x `guardK` 1.8-2.0 was two thirds of the bar a block — broken by the 2nd blow of every
  string. Now 0.55 and `guardK` 1.0-1.4 (bike 0.5): a string can be held; the parry is still free and still stuns him.
- **Measured after**: standing, 17 of 18 swings land at contact (6-19 cm off your eye); strafing at 2.5 m/s, 14 of 15;
  guarding, 18 blocks and 10 health in 40 s; fighting back unguarded, 28 health in 40 s; visible turn max 4.5 rad/s
  (`kingduel.js` now measures group + model yaw — the aim's fold into the heading is a group jump nobody sees).
- **Played by a bot that knows how** (`tools/kingbot.js`: katana, 1.6-2.4 m off, each contact parried on the beat with
  `&skill=`, blocked otherwise, `&miss=` of them not answered, cuts in his openings; your health topped up at 2, a "death" =
  4 health taken): skill 0.6 / miss 0.1 — dead in 122-145 s for 7-10 health (~2 deaths); skill 0.25 / miss 0.2 — dead in
  207 s for 44 (~11 deaths). (Bot traps: deciding per swing NAME reused one roll for every later kick — key it per swing; a
  2-point blow at 2 health is the death screen, which looks exactly like a frozen king.)
- **Round the pillars**: his slam put a pillar between you and his straight-line hunt pressed into it for its whole 25 s, four
  times running. `kingSteer` feels 2.2 m ahead on the solid grid and bears off to one side (kept while blocked) at the first
  clear bearing; a blocked line hunts even inside 4.6 m (`kingLineBlocked`), the hunt keeps running while the line is
  blocked, ends at 12 s. `tools/kingpillar.js`: reached you round a pillar in 1.8-2.7 s (never, before).
- **The stats' song starts at his burst** (the owner: "have the final boss explosion start the beachwalk stats music"):
  `kingDeath` asks for `END_SONG` (`lazyBuf`), `kingExplode` calls `startEndSong()`; `showEnd` finds it playing. musictest
  `kingEnd` (the king killed in the temple, the burst, the song at the speakers).

## 2026-11-21 — the king torn off the pillar, the bicycle rare, three new blows, the entrance rebuilt, his sand, the new stone
The owner: "MAKE IT SO YOU CAN GRAB THE FINAL BOSS OFF THE WALL WHEN HES RUNNNING UP IT WITH THE HOOK AND HELL STOP. ALL THE
PARTICLE EFFECTS AND EFFECTS NEED TO BE IMPROVED NOW. HE SHOULD FLOAT DOWN MORE THEATRICAL. HE DOES THE BYCICLE KICK WAY TOO
MUCH THAT SHOULD BE KINDA RARE ADD MORE ANIMATIONS WHERE SOME FALL SHORT JUST MAKE THEM GOOD. HE SHOULD EMERGE FROM THE FOG IN
THE START BETTER TOO IT LOOKS HORRIBLE IT HAS TO MATCH THE GAME WITH THE BEAUTY OF SEEING THE WALL OR LIGHTHOUSE. MAKE IT
MAJESTIC AND NOT AI SLOP"; then, with a render of a dry-stacked stone sphere, "can you do a new texture for the temples".
- **Torn off the pillar** (`kingTornStart` / `kingTornStep`, mode `'torn'`): `hookThrow` asks `kingOnRay` (his body's axis
  against the throw's line, 34 m, r 1.25 climbing) while he runs to or climbs a pillar and his feet are under 30 m — past
  the throw's own 14 m and past the pillar face behind him. The iron flies at 2.2× after him while he climbs (he goes up at
  ~14 m/s: at 1× it reached him at 40 m, INSIDE the ring's 6 m of stone — he fell hidden). The bite: he goes over backwards
  (`knockOut`'s fall stretched over the drop, g 16), a push toward you, the crash (`kingDust` 1.15, maceHeavy, trauma 0.75),
  the clip's lie + 0.5 s as an opening (puppet off), `getUp` at 1.15, and back into a blow. `KING.climbs` spent:
  he never goes up again (so no slam that fight). Run to the pillar and hooked: just stopped (`kingBackToFight`).
  `tools/kinghookwall.js` (`&at=`, `&d=`, `&none=1`): hooked 12.7 m up → torn at 21.5, down 1.7 s later, up and fighting
  at +3.5 s, 1.5 damage.
- **The bicycle rare**: `use.kgBike` 0.24 → 0.06 and 0 for 20 s after any (`kingBikeOK`, `KING.bikeAt` set by
  `kingAirBike`), the kick's chain into it (0.6) now into the 360 (0.45), and the hunt's arrival the new flying kick (`kgFly`)
  with the flown bicycle (`kgRun`) only a quarter of the time, 20 s apart.
- **Three new blows** (`ntar_moves.py -- king`, now `NTAR_SRC='~/Desktop/BEACHWALK ASSETS' NTAR_ONLY=a,b` to build just
  those from another folder; king-moves.json +115 KB): `kFlyKick` → `kgFly` (hit f8/45, the hunt's arrival, `air` 0.3),
  `kCrescent` → `kgCres` (f30/63), `k360` → `kg360` (f20/52). `kingbot.js` (skill 0.6) now counts his blows: of 55 — kick 17,
  uppercut 12, 360 9, crescent 8, assassination 6, bicycle 2, flying kick 1; dead in 129 s for 13 health (122-145 before).
- **The entrance** (`kingDescendStep`): a CLOUD CEILING over the ring (`KFX.cloud`, a 42 m disc 50 m up, two scales of
  fbm, dense and storm-grey, brighter only where thin; `uOpen` tears a ragged hole; inside it the light itself, not the grey
  sky — that drew a dark hole ringed in bright cloud) lit from behind by `KFX.glowS` (additive) which gathers over 2.4 s
  (`KING_MIST_IN`); him from 53 m through the hole on smootherstep over `KING_DESC` 10 s, dark against it (his lamp moved
  over and behind him, `KFX.rim`, until he is down); the cloud coming away off him (`kingWisp`, 34 pooled sprites); a hang
  of 0.9 s a hand over the floor (`KING_HANG`), the floor stirring under him from 7 m (`kingDust` small, flat), and the
  settle; the landing a slow billow (`slow`) and the ground mist BLOWN BACK in a widening ring (`kaMistMat`'s `uPush`, 2 →
  17 m over 2.6 s, back in 10). The lens 60° on the cloud, in to 24° as he comes through it, 27-30° down. The shaft only from
  tIn + 3 s (from below its walls drew rings). `tools/kingentry.js` (`&at=`, `&from=`): 16 stills.
- **His sand** (`kingDust`, `KD`, `kdTick` from `kingTick`): a flat billow rolling out along the floor (up to 80 soft
  sprites, flattened 0.6, eased in over 0.24 s — all of it starting together read as a bright clump; tinted by the room's
  light `1 − 0.4·KFX.dark` — unlit pale sprites glowed in his dark), grit on arcs under gravity that bounces once and
  stops, a faint shock ring on the floor for k ≥ 0.55. Used for the landing (1.4 slow), the slam (1.3 + a fast low 0.6),
  the flip's landing (0.6), the torn crash (1.15), his sprint's strides (0.16). The beach's `spawnPuffs` (spinning clods)
  are out of his fight. `tools/kingdust.js` shows sizes alone.
- **The stone** (`TMP_STONE`, `tmpStoneMat`, `assets/temple-stone.webp` 768² 52 KB from `tools/temple_stone.py`):
  courses 0.10-0.22 m, stones 0.12-0.95 m (four in ten short), thin dark joints with a little sand, worn round edges,
  chips, grit, dark weathering blotches, a top-lit relief baked in. Laid triplanar in the ROOM's frame (`uTO` subtracted in
  the vertex shader: world coords are thousands out) — the model's UVs are a baked atlas — over every textured material
  of the temple and the far colonnades, 3 m a tile, ×0.95, with 0.32 of the model's own map kept as shading normalised to
  its mean (×7.5) so the carved bands read through. Nearest up close, mipmapped off (or the courses crawl). The black disc
  is cloned off with its `onBeforeCompile` cleared. `tools/templestone.js`: stills far, near, of the colonnade.

## 2026-11-21 later — his stride at his pace, the reveal through the cloud, the carved floor uncovered, his look and aim
The owner: "SOMETIMES THE final boss run animation looks realy fast but he doesnt run that fast make him match the animation.
make the entrance more of a reaveal with the fog when he floats down its like he just clips out it should blend and be
impressive looking. add the old center part of the temple fight in the temple but have the new texture … THERE WAS AN OLD
CENTER PEICE IN THE MODEL … JUST THE GROUND"; then "GIVE THE FINAL BOSS WALK ANIMATIONS THAT DONT LOOK SO FREE ASSET LIKE …
SOME SUBTLE DIFFERENCES … PERSONALITY. MAKE THE HIT CONNECTIONS BETTER TOO HE SHOULD NOT MISS ALOT".
- **The stride** (`kingStride`): the sprint's rate was set once at the hunt's start for flat out; his feet pounded at full
  pace while he gathered speed, eased into his last stride, turned or pressed into stone. Now every frame from the ground he
  actually covered (after the clamp), eased over 0.1 s, against `clipSpeed.kSprint` (5.33 m/s in the take, ~7.7 at his
  size); the run to the pillar too. `tools/kingwalk.js`: sprinting 7.5-7.7 m/s, the clip at ~1.0.
- **The reveal**: one cloud sheet cut him across as he passed it. Now four sheets 1.6 m apart (densities 1 / .72 / .48 /
  .26, their holes a little wider each lower), each thinned in a soft ragged hollow round him while he is in its plane
  (`uHim`), and his body DISSOLVED in over the cloud's depth (`KFX.fade`): a screen-space interleaved-gradient dither in all
  his materials (`kingFadeSetup`, compiled at his making while hidden; at 1 it discards nothing). The cloud off him is added
  light now (additive, `0xfff4e4`, 0.32): tone-mapped, a "white" normal sprite still greyed the light it crossed — a smear
  trailing him. `tools/kingentry.js`: a shadow forming in the light 4.3-5.3 s, solid at 5.8.
- **THE CARVED FLOOR WAS NEVER SEEN.** The model's middle is a BOWL: stepped rings down to a carved floor at 0.48 (room m)
  — a ring of hexagonal medallions, a ring of bright stones (`Object_10`), the altar ring, the black disc at 0.93 — while
  the walk is flat at the podium's top, `TMP_FLOOR` 1.944, and the desert sand was laid over the bowl at 1.58
  (`tools/templeheights.js`; `tools/templefloor.js` draws each piece alone and the room without its sand). Now the bowl's
  pieces (`TMP_BOWL_Z`: Object_8/6/9/7/10/21/31) have every vertex inside `TMP_BOWL_R` 20.75 laid flat AT the walk's height,
  stacked 2 mm apart in their top-down order (their own geometry clones), and the drawn sand inside the rim is put a metre
  under (the walk is `tmpSandRaw`/`tmpFloorAt`'s, untouched). They wear the new stone in `carved` mode (below). The walk,
  the fight and every clamp unchanged.
- **The carved pieces** (`TMP_CARVED`: the podium `temple001_1`, the altar ring `temple004_4`, the column-base ring
  `Object_14`) on their own material copies (`onBeforeCompile` cleared first — a clone carries the hook and the stone would
  go in twice): the model's carving as the pattern (keep 0.9, normalised to that map's OWN mean, `tmpMapMean`) and the stone
  flattened to its mean colour (`uTF` 0.75, `textureLod(…, 12)`), so the bands read in the new stone's colour.
- **His look and bearing** (`kingPersona`, `kind.postClip`, after the mixer): chest up and back 0.06, chin down 0.09, a
  breath in the chest, his head on you with a lag (rate 4.5, ±0.95 yaw, the neck 35 %), the walk's arm swing eased 35 %
  toward each upper arm's running mean. All but the look ease out through any blow, stagger or knockdown (`KP.w`), the look
  at a third — a blow is the measured one. Not until `kingMeasureBlows` has run.
- **His aim leads you** (`mutFoePos`, `kingBody`): through his wind-up he turns and closes on you + your step's velocity
  over the time left to contact (≤ 0.5 s). `kingstudy.js &walk=1`, 60 s: blows that took health 25/28 → 30/30; in their
  window the uppercut 2/6 → 5/6, the assassination 4/6 → 4/4.
- (round two, the owner: "FIX THE TEXTURES IN THE CENTER DONT MAKE IT GLOW LIKE THAT AND THE CENTER ISNT EVEN TEXTURED. MAKE ME
  WALK LIKE THE OLD FLOOR I FEELL LIKE THE MOVEMENT WAS WORSE. BLEND THE TEMPLE TEXURES FLAWLESSY"):
  - the carving laid at `TMP_BOWL_Y` = TMP_FLOOR − 0.36 (1.584: where the sand floor was SEEN), not at the walk's 1.944 — that
    put the ground you see 0.36 m nearer your eye, and walking felt different. The walk is as it always was; you are over the
    bowl's floor as you were over the sand.
  - the ring of stones (`Object_10`, `TMP_PLAIN`) is plain stone with no emissive: normalised to its dark mean in `carved`
    mode, its light stones went to white. Carved lights now clamp at 1.22 (1.5 before), keep 0.8.
  - the black disc wears the stone: its own material, colour 0.66/`TMP_STONE.norm` (the carved floor's tone round it), the
    courses half-flattened (`tmpStoneMat(m, false, 0.45)` — `flat` is a new third argument). The old code that blackened it
    after (`'tmpDisc'`) is gone.
  - the flat stack held apart by `polygonOffset` (factor −rank, units −2·rank, the disc −8/−16) as well as its 2 mm steps.

## 2026-11-21 latest — his run at the take's pace, the bicycle cut to four kicks, his blows retimed, pillars struck, the stone aged
The owner: "HIS RUN ANIMATIONS SHOULDNT SLOW DOWN HE SHOULD RUN FAST LIKE THE ANIMATION WAS. MAKE THE BICYLCE KICK BETTER ITS
TOO LONG AND HARD TO READ AS AN ATTACK. MAKE THE CLAW HIT THE PILLARS TOO. MAKE HIS ANIMATIONS MORE UNIQUE … NOT STOCK MIXAMO";
then "THE TEXTURES OF THE TEMPLE NEED TO LOOK MORE REALISTIC AND WORN THEY ARE SUPPOSED TO BE ANCIENT".
- **The run**: `kingStride` (the clip slowed to his speed) is GONE — it matched the wrong way. The sprint plays at
  `KING_HUNT.sp / clipSpeed` from the first stride, and he runs at that pace too: no gathering ramp, no easing into the mark
  (`s = min(sp·dt, d − to + 0.3)`).
- **The bicycle**: `king_bike_loop.py 2` (a cycles argument now) — two cycles, four kicks (idx 7, 15, 23, 31 of 32), at 0.8:
  ~1.3 s off the floor (2.3 before); a readable hop into it (`kingAirBike`: +0.35 m on a half-sine over the first 0.3 s).
- **Retimed blows** (`natHold`, `mutClipTime`'s fluid curve: an eased draw, a held cock — the tell — the strike accelerating
  into the contact frame, the follow-through leaving it at that speed and settling): `kgUpper` 0.10/cock 0.62, `kgCres`
  0.09/0.7, `kg360` 0.10/0.58 (`kgKick` had it). Strings with `more` contacts can't take it (it drops `moreT`). Into the
  sprint his chest leans 0.11 from the waist (`kingPersona`, hunt).
- `kingstudy.js` after: standing 32/32 blows took health, strafing 31/31; the bicycle's four kicks in window. musictest kingEnd PASS.
- **Pillars**: `nearestSolidHit` marches the temple's solids grid along the blade's line (as `hookWallHit`), a `'rock'` hit
  with a world normal (`n`) for the scar. `tools/pillarcut.js`: hook, light and heavy into a pillar from 1.1 m — struck
  (hitstop 0.05 / 0.105) and scarred; at open air, nothing.
- **The stone, ancient** (`tools/temple_stone.py`): edges eaten back irregularly (`wob`), chips bigger and more, the rounding
  0.065 m (0.035), fine pitting, hairline cracks through one stone in five (wandering, soft), sand packed into most joints,
  sun-bleached stones and pale salt crust; relief gain 2.5. In the shader (`tmpStoneMat`, room space): a macro variation
  metres across (×0.82-1.16) so no tile repeats; sand banked up the foot of every face to ~1.1 m over the seen floor (`uTB`)
  and in patches on the floors; grime above it to ~5 m; faint vertical streaks down the faces. 60 KB.

## 2026-11-21 — the desert alive: the low sun, cloud shadows, sand off the crests, the air still at the ring; the sky's rays out
The owner chose four of the options ("DO THOSE"), then: "TAKE THOSE RAYS OF LIGHT OUT FROM THE SKY".
- **The sun** (`TMP_SUN`, 9° up, ahead and right of the crow's landing): in `tmpSky` a warm wide glow (pow 10), a tighter
  one (pow 90) and a disc, both veiled where the sky's own cloud crosses (`veil`). The key light from its side but higher
  (`TMP_SUN_L`, 42°) at 1.6, warm 0xf0dcc2 — `templeEnter` and `kingLight` (which re-lights every frame). At 32°/1.35 the
  flat sand lost a third of its light (measured off the stills); 42°/1.6 matches the old overcast key (1.25 at ~55°).
- **Cloud shadows** (`TMP_CS_GLSL`, `tmpCloudShade`, clock `TMP_CS`): two-scale noise ~200 m across moving downwind at 8 m/s,
  up to 30 % darker; in the sand's shader (its own `onBeforeCompile`, cache key `tmpSandCS`) and the stone's (not on the
  far colonnades hung up in the haze, `vTP.y < 200`).
- **Sand off the crests** (`tmpCrestTick`, `TMP_CREST_N` 90 ribbons, one draw): the ridges found once off `tmpSandRaw` —
  higher than 16 m up and down the wind by 0.5 m (`tools/dunecrest.js`: the dunes are broad swells; at 6 m none qualify) —
  104 of them; born 25-200 m off you, mostly ahead (`fw`), never within 55 m of the middle; running downwind, rising,
  lengthening ×3.2 and spreading ×3.5. They were there at α 0.2 and not seen (pale on a pale sky, faint on dark dunes):
  α 0.28-0.45, (0.6, 0.53, 0.42).
- **The air goes still** (`TMP_ATM.still`: 1 past 60 m from the middle, eased to 0 by 22): the gust ×(0.12 + 0.88·still) —
  the ground's sand, the dust, the walls — and the wind's sound ×(0.22 + 0.78·still) in `windBedK`. The crests' own wind
  is the unstilled gust (they are out on the dunes).
- **The fight's three slanted shafts are gone** (`KA.shafts` held hidden). The descent's beam down the ring stays.
- `tools/desertatm.js` (`&full=1` the plumes at full α): five views on the real loop; worst frame ~20-28 ms headless as before.
  `KING.probeHold` (a probe's) keeps him from coming while a probe stands in the ring.
- **The flight's rays down through the gap (`tmpRays`) are out too** (held at 0): "TAKE THOSE RAYS OF LIGHT OUT FROM THE SKY".

## 2026-11-21 — the crow's flight longer (`TMP_STRETCH`, `tmpCutRate`)
The owner: "MAKE THE CROWS FLIGHT LONGER AND SEEM MORE SIGNIFICANT". The cut keys everything off its own clock, so the clock is
slowed where the flight should breathe: out over the night sea and up into the cloud ×0.62 (grab+0.4 → climb−0.5), across the
cloud sea in the low sun ×0.45 (deck+0.5 → part), the first of the way down ×0.8 (part → down−3), each eased over 0.5 s. The
wings, the wind and the sounds run on real time. Over the cloud sea, once, the crow's cry far ahead (`tmpScreech(0.32)` at
deck+2.6). `templeFlight` (fixed again: `TC.g` is gone, it reads `TC.crow`): 38.6 s of real time from the scream to standing
(29 before), lands at −129.6, stands at 7.7, the lens back after; the low sun over the parted deck.
- **The dev teleport lands at the temple's edge** (2026-11-21, the owner: "I SPAWNED FAR AWAY FROM THE TEMPLE WHEN TELEPORTING"
  → "Temple's edge"): `placeInTemple(true)` — on the sand 4 m off the podium (r 35.4, outside `KING_TRIGGER` 28.3) on the
  crow's line in, facing the middle, pitch 0.06. The crow's landing, a restore and `devTemple` keep the screenshot's dune
  (`TMP_VIEW`, −129.6). `tools/tmpspawn.js`.

## 2026-11-21 — "he teleported": the push-out off the pillars, capped; the temple checkpoint timed
- The owner: "THE FINAL BOSS JUST LAGGED FIX THAT IT WAS LIKE HE TELEPORTED". `tools/kinghitch.js &fight=60` (the real loop,
  walking off every 8 s so he hunts; his speed per frame by mode, frames over 25 ms): no stall in the fight, but the HUNT
  reached 19.8 m/s against a 7.8 sprint — `tmpPushOut` (in `kingClampUnit`) putting him clear of a pillar his steering had
  brushed in one frame. Now `KING_PUSH_MAX` 0.16 m a frame caps the push-out's correction (a body in stone eases out over a
  few frames), and `kingHuntStep` never steps into stone: the whole step, or along it on one axis, or none (`kingSolidAt`).
  After: hunt top 11.5 m/s (the sprint and frame noise), the flown bicycle's leap 12.7 (its lead, as built), fighting 3.6.
- The owner: "LOADING SCREEN IS WAY TOO LONG FOR THE TEMPLE CHECKPOINT". `tools/loadall.sh N <out> tmp,tmpKing` (new: `tmp`,
  and `tmpKing` — the king's landing autosave, the one every death in his fight loads): playable at 4.09-4.43 s and
  4.28-4.35 s, no frame over 50 ms after — the same as the beach's checkpoints. Not reproduced headless on this build.

## 2026-11-21 — the desert grey all the time; its steps
- "it should always be black and white at the desert too": `tmpFilter()` (called from `updateTemple` after `kingTick`,
  so in the room and over it on the crow's flight once it has cut to the desert) writes `grayscale(1)` on the canvas, plus
  the fight's contrast/brightness from `KA.k`; `kingAtmos` no longer writes the filter. `kingAtmosOff` (on leaving) clears
  it. `tools/desertgrey.js`: beach none → arrived grey → he comes / fights grey + deeper → left none.
- "while walking on the temple ground use the church footsteps but have the ambience match … on the sand … sand":
  `sfxStepTemple` — stone (the podium, or `groundY` standing > 0.08 proud of `tmpSandRaw`: a block's top) plays the
  church's step with its nave tail gated off (whole for 70 ms, gone by 0.2 s, no room added: open air), sand plays the
  beach's `sandStep`. `tools/tmpsteps.js` (counts which bank's buffer played at spots on/off the podium). Beware in a
  probe: after setting the camera the walk's step-down guard keeps `camBaseY` up — ask `groundY`, not the feet.

## 2026-11-21 (later) — the king: held in the gold; his footfalls; the quieter burst
- **IMMOBILIZE** ("IMMOBILIZE JUST BROKE THE FINAL BOSS WHERE HIS ANIMATION IS MESSED UP AND SPINNING AROUND"): the generic
  creature update ran a kind's own `drive` BEFORE its `st.immob` check, so `kingDrive` went on turning, stepping and playing
  him under the hold while `artPin` put him back each frame. A kind with `drive` now takes `artHold` first. `tools/kingimmob.js`:
  2.3 s held, max moved 0.010 m / turned 0.005 rad (the strain), then the same blow on from its frame.
- **HIS STEPS** ("GIVE THE FINAL BOSS THE SAME FOOTSTEP SOUNDS THE PLAYER HAS IN THIS AREA MAKE THEM MATCH HIS STEPS"):
  `kingSteps` (from `kingTick`): each toe's height over the floor under it; a step when one lifted > 0.09 over its rest and
  comes back < 0.035, ≥ 0.16 s apart, through `sfxAt` from the foot — `kingStepSnd`: the church step gated as the player's on
  stone (podium, or a block's top), the sand step on sand. Not while held, descending, dying. `tools/kingsteps.js`: 26 in 12 s
  (sprint 0.12-0.18 s apart, fighting ~0.28).
- **THE BURST QUIETER** ("SO YOU CAN HEAR THE START OF THE STATS SONG"): `kingExplode`'s thunder `loud` 1 → 0.35 (`loud` is
  absolute, past the sliders), maceHeavy 1 → 0.55, smash 0.8 → 0.45. musictest kingEnd 0.0163 → 0.0543.

## 2026-11-21: the king harder, two more blows, quieter thunder, out of the cloud slowly

- Harder and more aggressive (the owner): hp 230 (180), aggr 6.4 (5.4), press 1.35, chainMax 6, opening 0.24, restless 0.5,
  regroup 0.06 for 0.35–0.65 s, fidgetGap 4, gapRate 1.25; angry: aggr 8, speedK 2.15, press 1.5, chainMax 8, windK 0.82.
- Two more blows ("give him some other animations too when fighting"): `kgPunch` (the knight pack's `kPunch`, contact 0.56)
  and `kgSwipe` (`kSwipe`, 0.60) — he carried them under his own takes (`tavRetargetAll`) and never threw them; stand-offs
  1.8 / 1.9, `use` 0.14 / 0.13.
- The thunder under every slam 0.8 → 0.3 of the ceiling (past the sliders), the rage's 0.6 → 0.3.
- The descent's dissolve over 14 m of his fall (5.6: about a second), so he comes slowly out of the cloud; a skipped descent
  (Enter) raises him out of a swirl of mist on the spot over 1.8 s (`KING.emerge`, in `kingFxShow`) rather than dropping him in.
- (2026-11-25) "STOP MAKING THE FINAL BOSS HIT FOR 2": every king blow that did 2 (`kgUpper`, `kgKick`, `kgAssn`, `kgFly`, `kg360`,
  `kgSwipe`, `KING_SLAM`) does 1.

## 2026-11-25 — the Scourger replaces the Ancient King
The owner: "the final boss has been pissing me off this whole time take him out and add this guy take out all the animations except
the run up the pillars and smash down plus the death animation. use the animations that come with this character as well for walking
and the plunge attack … make sure the rig is correct you have it wrong alot … there is also a rare knockback and stand back up
animation in there". The king's MACHINERY stays (`MUT_KINDS.king`, `KING`, the descent, the hunt, the pillar, the torn-off hook, the
death and the burst, all under the king's names); his body and moves are swapped.
- **The body**: DM-913's "Scourger Rig" (CC-BY-4.0, README), `tools/scourger_pack.py` → `assets/scourger.glb` 1.9 MB (see creatures.md
  for the rig). Winged, tailed, bird-legged, an axe in his right fist; 2.6 m to the crown; `fixScale: 1` (the file is in metres).
  `KING_RAG`/`KING_JOINTS` are `Character1_*` (the packer renamed his body bones to the HumanIK names: the map is the identity).
- **The moves**: his own `idle`, `walk`, `plunge`, `rear` (in his file); of the king's, only `KING_KEEP` = kSprint, wallRun, kSlam,
  kShock (`king-moves.json`); the owner's twelve Mesh2Motion clips (`assets/scourge-moves.json`: sDodgeB/L/R, sKnock, sRise, sIdleW,
  sAtk, sBlock, sDash, sCutB, sCutC, sCombo). `kingTick` waits for both moves files; `ROOM_FILES.tmp` names them (the king's .glb is
  no longer fetched; the file is still in `assets/`). The king's clip names the rest of his code asks for (`kIdle`, `hover`, `kJump`,
  `knockOut`, `getUp`, `kTurn*` …) are ALIASES onto the new clips: the descent floats down in his idle, wings out.
- **His blows** (`SCOURGE_HIT`, `tools/scourgeclips.js &prof=`): kgPlunge (his own, 0.63), kgRear (his TAIL — "Rear Attack" is a tail
  whip round behind him, 32 m/s at 0.52, `&end=Tail`; limb 4, `rearStrike`: he turns his BACK to throw it, −167°; and when you are
  close behind him he throws it at once, `kingChoose`, 4 s apart), kgAtk (the big overhead, 0.325), kgCutB (0.431), kgCutC (0.405, a
  low cut across the body), kgCombo (0.094 + more), kgDash (the hunt's arrival, 0.20, in place of the flying kick). No flip (gone from
  `kingChoose`); `kingBackToFight` forces the plunge or the overhead. The rare knockdown: knockClip sKnock, riseClip sRise,
  `knockAfter` 9 inside `knockLapse` 12 s.
- **The axe is his striking end** (`kingAxeTip`: a marker at the axe mesh's point farthest from his hand → `u.bones.tip`, read by
  `mutLimbs`/`kingLands`; `kingMeasureBlows` takes the axe arm by its HEAD alone — at the quick cut's contact his fist is out at his
  side and farther from his middle than the head it swings across in front of him: by the farthest point he was turned 69° to bring
  his FIST to you). `KING_AXE_K` 0.72: shortened about his grip (the axe is ~1.6 m from fist to head where the clips swing a sword;
  the cuts that end point-down dug its head 10-33 cm into the floor).
- **Measured** (`tools/kingstudy.js`, 40 s): standing, 15 of 17 swings took health (18 health), strafing 13 of 17; every blow 0.06-0.25
  m off your face when it lands. `tools/kingfight.js` end to end (the flip section is now the forced knockdown): the descent, 10 swings
  in 20 s, knockdown rise at 1.15 s / up at 2.5 s, the pillar (run 4 s, up to 43.6, perch, leap, slam, fighting at 12.7 s), the death
  into the burst and the stats — 0 errors. `tools/kinghookwall.js`: torn off at the hook, sKnock → sRise → the overhead.
- `kingMeasureBlows` now takes everything but the blow's own action OUT of the mix while it poses (`enabled = false`): it was
  harmless here, but a fade still running keeps its weight whatever `.weight` says.

## 2026-11-26 — the Scourger: the axe in his fist, bigger, his wings, his own slam, a stalking run, back and forth
The owner, with `~/Downloads/exported-model-4.glb`: "the final boss needs to be bigger and actually hold his weapon it floats beside
him … use his wings flapping in the sketchfab animations so he can float down … he should fly down then land on entry … make him more
visible in the black and white setting … use the walk animation from here too. he should do his slam down from the sketchfab
animation too. try this run with his old one too sometimes … i want this to feel like a sekiro fight back and fourth".
- **THE AXE FLOATED 1.22 m OFF HIS FIST, in every clip** (`tools/scourgelook.js`: nearest axe point to the palm). The packer parented
  it to the hand "at rest" while the pose bones still held the LAST FRAME IT HAD KEYED (setting `animation_data.action = None` leaves
  every pose bone's loc/rot where the keying put it). Fixed in `tools/scourger_pack.py` (pose bones to identity before the
  parent_set); repacked (its docstring now carries the glbquant + gzip steps). 0.04 m now. **Every head path, contact and stand-off
  measured before this was the floating axe's** — `KING_AXE_K` (0.72) is kept on the true length: 1.68 m from palm to head at full
  size, which puts the head 19 cm into the floor in his own idle.
- **TWO HOLDS** (`kingAxeHold`, `KING_OWN_HOLD`, `tools/scourgegrip.js`): his own clips hold it like an ice pick — the head out of
  the little-finger side (haft · index→little knuckle 0.99) — which is right for his plunge (head-first into the floor). A man's sword
  leaves the fist on the THUMB side; through the owner's sword clips the ice-pick head trailed behind and under him. The other hold is
  the axe turned half round about his palm's normal through the grip; eased between by the weights of the actions IN THE MIX
  (`a.isScheduled()` — every action of his reads `enabled` at weight 1 while stopped: counted that way, his idle came out 57%
  turned). On a change between his clips and a man's he turns it over in his hand. `kingMeasureBlows` sets the hold per blow.
- **`kingMeasureBlows` NOW POSES ON THE CLIP ALONE** (`u.mixer.rawUpdate`): `u.mixer.update` is wrapped by `installLife` (the life
  layer, then `postClip`), and through it the overhead's head measured a metre lower than the clip puts it.
- `SCOURGE_HIT` re-picked where the head crosses in front of him (`tools/scourgeclips.js &prof=`): the overhead 0.313 (2.1 m up, 3.1
  out), the quick cut 0.404, the stepping cut 0.412, the dash 0.195, the string 0.087 / 0.42 / 0.54, the plunge 0.585. Stand-offs 1.5-3.9
  m, every turn 0-24° (were up to 89°). `KING_HUNT.to` 2.1 → 3.4 (the dash out of the run landed 1.6 m inside its stand-off), his
  `stepBack` 2.2 and `lungeMax` 3.4 (his stride is 1.3 of a man's). `kingAxeFloor`: where the head would go under the floor his wrist
  turns it up onto it (four of the sword clips put it 21-26 cm under).
- **BIGGER**: `fixScale` 1.3 (it IS the model's scale for a fixScale kind), `h` 3.4, body/hitR/limbR up with him. `KING_SLAM.R` 4.8.
- **SEEN**: `gamma` 0.75, `emis` 0.3 (his own map), `rim` 0.28 — graded as the fight grades it he was one black shape on the floor.
- **HIS WINGS** (`kingOwnClips`): of his four clips only the plunge flies (sprung at f20, airborne f24-f58, two wing-beats, down f62,
  the axe in the floor f67). `sFly` = one beat f40-f56 looped, its last 6 frames eased into the 6 before f40 (no two airborne frames
  match closer than 24°); `sLand` = f54 to the end (`sliceClip` — three's subclip drops constant tracks); `kSlam` = the whole plunge
  (the king's slam is out of `KING_KEEP`; `KING_SLAM` off f20, land f64). The descent glides his FEET's mark to the floor while the
  flight holds his body 3 m up on his wings, hangs, and drops in `sLand` (`KING_LAND0` 8/30 before the touch).
- **THE STALKING RUN** (`sStalk`, Mesh2Motion "Run_Stealth"): on Mesh2Motion's UNREAL skeleton and skinned — `tools/glb_split.py --ue`
  renames the joints to Mixamo's and drops the mesh. The packer read its forward 119° off (`tools/scourgeface.js`: his hips faced
  46-76 against his walk's ±3); `KING_STALK_YAW` turns the whole run back on its hips track. His run is `kingRunClip`: the stalk two
  times in three, the king's sprint the third (the hunt, the pillar run, the run gait).
- **BACK AND FORTH**: strings 4 deep (6 angry), each ending in a 0.6 s opening (0.45 angry); outside it he turns half your blows
  (`block` 0.5) and comes straight off the block; your parry window the pack's own (`parryK` 1).
- Measured: `kingstudy.js` 40 s standing 14 of 18 swings took health, strafing 16 of 17; `kingfight.js` end to end 0 errors (descent,
  11 swings in 24 s, knockdown, pillar run/climb/leap/slam, death, stats); `kingentry.js` stills of the fly-down and landing.

## 2026-11-26 (later) — the Scourger again: the axe the right way round, in his fist; smoother; readable; his rig used
The owner: "the final boss animations need to feel smoother he should[n't] be stuttering like that when flying down either. his
weapon is the wrong way hes holding the blade side look at the sketchfab and make it exact please. make his moves more readable. fix
his walk animations too they look weird. fix the rig an dutilize it to its fullest potential" — and "make sure the axe is in his hand".
- **WHAT I HAD AS ITS HEAD WAS ITS BUTT** (the notes above about an "ice-pick hold" and a half turn are WRONG). Rendered beside the
  source: a polearm, 2.45 m along the haft in his file's metres — a ball and a crescent blade at one end, 0.77 from his fist out of
  its THUMB side; 1.68 of bare haft out of the back. `kingAxeTip` now: full size (`KING_AXE_K` 1), the striking end = the middle of
  the last sixth of it from the butt (`u.kAxeTip`), its far edge too (`u.kAxeFar`, for `kingAxeFloor`).
- **TWO HOLDS, a slide not a turn** (`kingAxeHold`, `kingHaftAt`, `KING_BUTT` 0.5): the file's own; and the long grip — the haft slid
  through his fist ALONG ITS OWN CENTRELINE (it is curved) to half a metre from the butt, turned so it runs through the fist as it
  did. By what he is doing (`KING_OWN_HOLD`: wait / ready / descend keep the file's; everything else the long grip), eased at 2.2/s:
  one slide as he rises from his landing. `tools/scourgeinhand.js`: palm to the axe 4.6-5.7 cm in every clip, both holds, mid-slide.
- `SCOURGE_HIT` off the blade, long grip: plunge 0.612, sAtk 0.319, sDash 0.20, sCutB 0.415, sCutC 0.425, sCombo 0.087/0.41/0.537.
  Stand-offs 2.8-5 m (a polearm). `stepBack` is OFF again (it slid him backwards through wind-ups).
- **The fly-down's stutter**: the flap was one beat with its last 6 frames eased onto 6 others 24° away — a hitch a beat.
  `kingPingClip`: half a beat (f40 the bottom of the stroke, f50 the top), there and back on a cosine — no seam.
- **Readable**: `natHold` 0.22 (overhead) / 0.16-0.18 (cuts), the string at 0.9; `kingRigLife` (in `kingPersona`): his WINGS rise
  through each wind-up (higher for a longer one) and are thrown down as it lands, half up in the hunt, flared in a stagger; his JAW
  opens with them; his TAIL swings against his turns, three joints each later than the last. Poses of his own (`KING_POSE`, from
  the plunge: wings f48, jaw f36). Not through his own winged clips.
- **His walk**: his own walk covers 1.14 m/s and was stretched to 1.8× before a run took over at 0.3× (`velGaitAnim`). `gaitLo` 0.7 /
  `gaitHi` 1.3 (new kind knob); backing up is his walk reversed (was the dodge's hop looped); the hunt runs each clip a little over
  its own stride (`KING.huntSp`: the king's sprint 6.3 m/s, the stalk 8.6) — the sprint had been played at 1.4×.
  NOT measured: `tools/scourgewalk.js` never caught him on his walk (at 4.5 m he swings in place, at 7 m he hunts).
- Measured after: `kingstudy.js` 15 of 16 swings took health; `kingfight.js` and `kingentry.js` 0 errors.

## 2026-11-26 (night) — you could walk into the pillars; his runs on his own legs; the entrance still; one look; 320
The owner: "AS FOR THE FINAL BOSS I SHOULD NOT CLIP THROUGH THE PILLARS EVER. ALSO FIX THIS LEGS WHEN HE RUNS ITS BAD IMPROVE HIS
ANIMATIONS TO MATCH HIS RIG BETTER. HIS ENTRANCE HES TWITCHING ALOT IT SHOULD BE SMOOTH WITH JUST HIS WINGS FLAPPING. ALSO HIS
HEAD KEEPS SPINNING AROUND WEIRD … MAKE IT YOU CAN KICK THE FINAL BOSS WHEN HES DOWN TOO. GIVE FINAL BOSS MORE HEALTH TOO."
- **THE PILLARS WERE 2.4 m TALL TO THE GRID** (`tmpBuildSolids`): stone over head height was dropped as "not in the way", and a
  shaft stands on its stepped base, so its own cells had NO stone between knee and head — solid only as the base's inside, at
  the base's 2.3 m. Up the base's steps (each under `ROCK_STEP`) and from 2 m the shaft was air. Now: stone over the head is
  kept per cell in half-metre bands (`over`); after the fill, a solid cell's top is carried up through the bands that follow on;
  a shaft cell the base does not enclose is solid from where its stone begins (under 4 m, the pillars' ring only); what a tall
  shell encloses is raised; and the tall cells in the ring are CLOSED (grown and shrunk 1.25 m — three shafts' shells were
  sparse on a 0.25 m grid). Tops 16-36 m. `tools/tmppillar.js`: 198 walks at the 11 pillars, feet 0-8 m up, never in or within
  0.15 m of the stone. The same grid answers the hook, the ball and his own clamp: `kingfight.js` still runs, climb / perch at
  43.6 / leap / slam. PROBE TRAP: a walker pushed out of a round thing slides ROUND it — "ended past it" is not "went through".
- **HIS RUNS ON HIS OWN LEGS** (`kingRunLikeWalk`, `KING_GAIT`, `tools/scourgestrip.js`): sStalk and kSprint keep their rhythm,
  arms and spine; hips' lean and height half way, and thighs/shins/feet/toes 0.65 of the way, to his own walk's — its one cycle
  (41 frames; the clip is two) laid over the run's, lined up on which leg is forward (thigh-against-thigh, best offset); his
  middle knees, leg bases and toes take the walk's whole (no man has them: they stood in their bind). The weapon arm is held
  0.75 to its mean through the cycle (the sprint's pump put the blade through the floor twice a stride).
- **The entrance**: `kingPingClip(…, only)` — only `Wing*`/`Feathers*` beat; everything else holds the middle frame's pose.
- **His head**: `kingPersona`'s own look is OUT — it stacked on `lifeApply`'s (0.95 + 0.72 rad on the same neck and head, and it
  held its limit behind him where the life layer lets go: side to side as you circled).
- **Kicked when down**: the kick itself now takes a man who is down (the ragdoll session's change); for a boss already down it
  hurts and shoves and may NOT knock him down again over the first (`kickMan`). **hp 320** (230).
- Not re-measured after these: `kingstudy.js` hit rates (the runs and the look do not touch a blow's contact).

## 2026-11-26 (evening) — the Scourger filmed: his wings carried, the swoop, a wind-up that is not frozen
The owner: "final boss walk and all animations are still bad improve these". `tools/scourgefilm.js` films the REAL fight from the
side on the clock (you backing away, then circling), a frame every few ticks, each tile labelled with his clip. Use it before any
strip of a single clip: it shows what the layers do together.
- **What the film showed.** Backing away from 6 m he never walks: 203 of 260 frames were `sDash`, the rest a 0.4 s hunt and the
  weapon idle. His wings were three different things from one second to the next: high in his own walk, hanging in `sStalk`,
  flat along his spine through a dash.
- **Why.** His wing bones (`Wing1_L/R`, `WingBase_L`, `Wingbase_R`) hang off `Character1_Spine2`. His own clips hold that chest
  forward like a raptor's; a man's clips hold it upright and throw it about, and the wings (his idle's LOCAL tracks, laid into
  every retargeted clip by `kingLayerIdle`) went wherever the chest went.
- **`kingWingCarry`** (in `kingRigLife`): through a man's clip the four wing roots are held where his own idle carries them in
  his BODY's frame (the idle's chest chain evaluated on the same clock, so its slow sway stays), turned with him by the chest's
  twist about his up axis only, and raised toward the plunge's f48 pose by the wind-up weight `KRL.w`. Weight 0.8, eased at 5/s;
  off through his own clips (`idle`, `walk`, `plunge`, `rear`, `sFly`, `sSwoop`, `sLand`, `kSlam`) and while he is down.
- **The swoop** (`sSwoop`, `KING_SWOOP`): a hunt that starts from more than 9 m is flown. It is the entrance's wing beat
  (`kingPingClip` f40-f50, wings only) with the hips' track premultiplied by a 0.48 rad pitch about X (0.6 dived him nose-down) and their height set to
  2.0× his idle's with a small bob. In the hunt it beats `sfxWingBeat` and blows dust, in place of footfalls. Shorter hunts keep
  the owner's two runs (`kingRunClip`). Its pace is the hunt's own (8.6 m/s), so nothing about the fight's timing moved.
- **A held wind-up is not a frozen one**: the dash's draw was one identical frame for over half a second (`natHold` stops the
  clip). Through a draw his two spine joints wind up to 0.07 rad against the blow and shake with it (41 and 27 Hz, growing with
  the square of the draw), gone at 26/s when it is loosed. The blow's path and `SCOURGE_HIT` are untouched.
- Measured after: `kingfight.js` end to end, 0 errors (entrance, knockdown and rise, climb, death, credits). `kingstudy.js &secs=60`:
  24 swings, 22 took health (kgDash 1 of 2, kgCutB 5 of 6, the rest all), 0 errors — the tremble does not move a contact.
- NOT done: the weapon idle (`sIdleW`) and the dash's deep lunge are still a man's poses on his legs; he still never uses his
  own walk when you back away (the hunt takes over at 5.6 m). The swoop's last pitch (0.48) was not re-filmed.
