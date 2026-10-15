# The deep: the bite at the fisherman's spot, the drag, the pliosaur, the whale (2026-10-15)

The owner: the float in the glowing spot, 14 s, the rod bends, the float goes under, the reel screams, you are dragged
down the sand and out past anywhere you were allowed, under, and down for miles into near-black water; you swim there,
the creature swims by in the murk, then charges out of the dark, a parried bite stuns it; it dies and sinks to the
floor; the unhurt whale comes up and swallows you, spits you onto the sand by the tree; the rod is gone.

## Shape
- One clock: `deep.ph` / `deep.t`, run by `updateDeep(rawDt)` from `animateFrame` (and the harness's `step`) AFTER
  `update`, guarded by `deepLive` — frames run before the module has finished being read, and the section's own
  `let`s are in their dead zone until then (`plioBarEl` took the page the first time).
- Phases: hook (5.4 s) → pull (~8–10 s) → plunge (0.36 s, a sea-dark veil of its own, `deepVeil`, not `blackoutEl`)
  → descent (`DEEP_DESC_T` 10.5) → silence (11 s) → fight → after (5 s once it has settled) → whale → swallow (2.4 s
  black) → spit (`SPIT_T`, 5.6 s) → `endDeep`.
- Flags declared early with `bloodJars` (read by `frozen()`, `inRoom()`, the gates): `inDeep` (the room), `deepLock`
  (the whole sequence: no saves, no drops, no beach clamp, `canMove` off — the deep carries you), `deepNoHands` (no
  switching: hook to descent, and whale to the end), `deepCutOn` (in `frozen()`: swallow and spit), `deepDone` (on the
  save), `deepRodOn` (the deep runs the line; `updateRod` returns), `deepReelSpin` (the crank's speed, negative =
  line running out), `deepBend` (the rod's bow), `deepWorldRef` (exempt from the hall cull — the group sits at the
  ORIGIN with its children in world coords, so the cull measured it 35 km off and hid it).
- The room is at `DEEP` (25000, 2000, 25000): it must be at positive Y, the whale's skin darkens below world y≈3
  (`wbAO`). `inRoom`, `indoors`, the hall cull's `hk` (10), the beach clamp, `clearRoomFlags` and `devLeaveRooms`
  know it.

## The beach half
- `deepHookTick` (from `updateRod`'s 'down' branch): float wet and within 0.85 r of `FISH_GLOW` for `DEEP_HOOK_T`.
  Measured: fires at 14.0 s.
- The rod bends in its vertex shader (`rodBendInject` on every scan material, `rodBendU`/`rodTipU`): z −= 0.42·b·L·u²
  toward the reel's side; `rodTipWorld` moves the line's tip with it. Arm pulled down and shaking (`rodArmPose`).
- The drag: speed 0.12 → ~3.4 m/s over 11 s, S leans back (×0.6), A/D a little sideways, yanks every 0.35–1.5 s,
  the look pulled round to the line. Depth counts from where the pull STARTED (or the waterline, whichever is further
  out): at high tide the waterline is metres up the sand and the eye dropped 0.8 m on the first frame.
  `calmChasers()` every 0.5 s — the five's camp is beside the spot and one waded in after you in the test.
- The plunge holds its own eye height (`deep.plY`): `update` puts the floor back under a body on the beach and
  popped the camera to 1.8 m.

## The deep
- Fog 0x0b2c38 → 0x03111a, density 0.022 → 0.033 down the descent. At 0.048 the swim-by at 40 m was invisible.
- THE BACKDROP MUST BE THE FOG'S COLOUR, NOT TONE-MAPPED: the fogged floor comes out at the fog hex exactly
  (3,17,26), a tone-mapped backdrop at (0,8,17) — and the floor read as a lit plane with a horizon. Colorspace
  include only.
- Particles: one pool (`deepFx`, 1100): bubbles (ring sprite, buoyant, wobble), blood (dark linear red — 0.3 read as
  a pink glow after the colorspace include), silt. Marine snow wrapped round the camera in its shader.
- All sound through `uwLP` (lowpass between `masterGain` and the gate, 20 kHz → 520 Hz), plus a sub-bass bed with a
  rush by speed. Measured 520 in the deep.
- Swimming (`deepSwim`): strokes (a pull then a glide), W/S/A/D along the look, Space up, Ctrl/C down, Shift harder
  for stamina; drag e^-1.7t. Measured: 4.9 m in 2 s, 2.4 m up in 1.5 s, 1.2 m glide. `deepVmPose` swims the held item.

## The pliosaur (`plio`, `assets/pliosaur.glb`, `PLIO_K` 1.6 = 16 m)
- Clips: Attack_Bite (head back 1.0–1.25 s, jaw open 1.6, shut ~2.12 = contact), Idle, Swim_Fast, Swim_Slow. Model
  faces +Z; the group is its middle. Eyes are a fog-free basic material, opacity = how awake (`eyeK`): the readable
  tell is two pale eyes in the black.
- AI: pass (crossing 30 m ahead) → lurk (hidden 3–6.5 s) → tell (36 m off, in front ±63°, or the sides — never
  straight behind — circling, then turning in, growl) → charge (to 15 m/s, homing slower inside 16 m) → bite (from
  12.5 m, speed timed to arrive as the jaws shut) → flee → lurk. Parried → stun 2.2 s; the FIRST blow in a stun is a
  double riposte, the rest plain (every blow doubled let six cuts take 29 of 30). Bloody Blade bleeds it by the
  beach's rule. HP 80: with the blade and perfect parries, four stuns (~1 min).
- Hits: `plioStrike` in `digImpactCore` (spheres on 9 bones, through `sweepDirs` — which FILLS `_mswD` and RETURNS A
  COUNT), `plioRayHit` in `magTrace` (`kind: 'plio'`), the shotgun's pellets summed. Guns ×0.3.
- A bite costs 1 of your 4; a block costs stamina and shoves you; it never swims through you (bone spheres push the
  camera out). Death: thrash 1.8 s, roll belly-up, sink (≤3.4 m/s) to the floor, silt; `statKill({saveKey:'pliosaur'})`.

## The whale
- The lunge whale `hjW` (Henry's, built from `assets/whale.glb`, unhurt), placed by its jaw floor (`hjwJawAt`) on a
  point running from 85 m ahead of you to you. Skin and baleen emissive raised for the dark; NOT the mouth (raised,
  it read as a lit red boat). Its `uExK` is put back after.
- The spit: out of its mouth backwards, on your back under the pine, up, facing the sea; `removeFromInventory(rod)`,
  `deepDone`, autosave. The whale's spray is run out by `hjSprayLeft` (`updateHenryJetty` runs every frame).

## Harness
- `tools/deepshot.js`: `__dpBoot` (creeping clock), `__dpHook`, `__dpTo(ph, t)`, `__dpSheet`. `__bw.testGuard(on)`
  (sets `mouseBtns` too: the guard is dropped every frame the right button is not down), `__bw.setFallbackLook`
  (keys only move you with a look mode), `__bw.uwFreq()`, `deepS`, `plioS`, `deepFlags`.
- `__bw.state().equipped` is the item's NAME, not the item.

## Round two (2026-10-15): murk, the recording, drowning, the needle

- **The creature is never placed where it can be seen** ("i can see him clip in and it looks cheap"). Fog at the
  bottom 0x04161a × 0.042 (visibility ~0.2 at 32 m, 0 past ~55). It is put only beyond the murk's edge (the pass
  starts 62 m off and crosses at 34); between attacks it does not vanish — `lurk` circles you at `lurkR` 30–38 m
  (sometimes 22–26), a shadow, and the `tell` turns in from wherever it is (no teleport), only when it is in front of
  you or to a side (cos > cos 1.75 rad), or after 8 s more. Its eyes (fogless basic material) are faded by hand by
  the same murk (`exp(-(density·d·0.72)²)`). Measured: lurk at 29–32 m, vis 0.16–0.23 — a barely-there shape.
- **The owner's recording** (`assets/deep-ambience.m4a`, 1.8 MB, AAC 64 kbps from their 4-min mp3) loops from the
  plunge to the drowning (`deepAmbSet`), joined AFTER `uwLP` (straight into `gameAudioGate`): it is recorded under
  water already. Plus `sfxDeepFar` every 9–21 s (a far call, or a long settling groan, panned).
- **The lens**: `deepMurk` (a radial vignette div, z 9) and `blur(0.5px) saturate(0.85)` on the canvas while in the
  deep; both cleared in `deepLeave`.
- **No whale any more** ("instead of the whale bringing you back to the beach make it so you start to drown then pass
  out … wash up on the beach and see an empty needle"). `after` (4 s) → `drown` (`DROWN_T` 10: one long exhale, then
  weaker; strokes give out by 4.5 s (`deep.swimK`), you sink, the heart slows and loudens, the black closes in
  (`deepVeil` #000), blur, `uwLP` down to ~160 Hz, the head goes over) → `black` (`WASH_BLACK` 3.2: out of the deep,
  the rod gone, the needle laid, already lying there) → `wash` (`WASH_T` 8.2: on your side in the wash with the sea
  running up, a blink, coughs; sit up over the needle; stand) → `endDeep`.
- **Where the sea leaves you**: z `TREE_SPOT.z + 4`, x = max(2.2, the highest `shoreLineJS` over the next 10 s + 0.9)
  — at high tide the waterline is metres up the sand. The needle (`makeSyringe`, fill 0, cap off, ×2.4 — at ×1.6 it
  was a speck — with a small glint, no beacon, not a pickup) lies 0.6 m up the sand from your face, and its spot is on
  the save (`flags.needle`), put back on a load.
- Harness: `tools/deepshot.js`'s phase order is hook … after, drown, black, wash.

- **The needle is only to look at** (2026-10-15: "DONT MAKE THE SYRINGE … ABLE TO BE PICKED UP"): no interactable, no
  hit proxy, raycast off — and no glint (`addItemShine` is this game's "take me"); its own emissive +0.05 instead.

## Round three (2026-10-15)
- **The recording is quieter and stays in the water**: `DEEP_AMB_LEVEL` 0.26 (0.85). It went on playing up the beach:
  on the frame the drowning ended, `deepAmbSet(false)` ran and then the in-deep restart (`!deepAmb.src && ph !==
  'drown'`) saw 'black' and started it again. The restart now names the phases it belongs to (descent … after), and
  `placeOutOfDeep` / `endDeep` stop it. Measured: on through the drowning, off from the black on.
- **The needle is the end's own** (`buildWakeSet`'s syringe: fill 0.06, cap off, ×1.25, rotation z 0.12, 1.6 cm up,
  the same soft dark under it).
- **It goes back into the dark between attacks and comes straight**: `lurkR` 40–48 (25 %: 30–34), lurk eyes 0.08; the
  tell turns at 2.2 rad/s and goes at < 0.2 rad or 2.4 s; the charge steers at 2.6 rad/s outside 16 m. Measured:
  lurks at 43–63 m, charges from 41–61 m.
- **Its skin sits in the murk**: colour × (0.78, 0.88, 0.9), emissive (0.34, 0.52, 0.56) at 0.3 (teeth 0.4).
