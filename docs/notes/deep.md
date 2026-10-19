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

## Stone is stone; a faster, harder animal in thicker water (2026-10-15)

The owner: "i should not clip through the rocks in the depths neither should the sea monster. make underwater beast
faster and harder make the water more murky too he needs to be scary."
- **Rocks**: `buildDeep` keeps each of the 26 stones as an ellipsoid on its own axes (`deep.rocks`: centre, rotation,
  semi-axes = the dodecahedron's r × 0.95 × its scale — between the faces' 0.79 and the corners' 1). `deepRockPush(p,
  rad)` puts a point back out along the line from the middle, in the stone's own frame.
- **You**: `deepClampBody()` (from `deepSwim`, and again after the pliosaur's body shoves you — whatever moves you last
  clamps you) keeps the eye (0.55) and the chest a metre under it (0.45) out of the stones and over the floor, and
  takes the velocity into the stone off. `deepFloorBump` now has all three of the floor mesh's swells (the third,
  ±0.35 m, was missing).
- **It**: `plioSolid()` (every frame, all states) runs each body sphere (`PLIO_SPHERES`, r × 0.8) out of the stones
  and over the floor; the deepest one moves the whole animal, twice. Sinking dead onto a stone, it settles there.
  `plioAvoid(dt)` looks a second ahead (three points, a body's width round them) and lifts the nose over a stone or a
  swell — in lurk, tell, flee and the charge until the last 9 m.
- Measured: you swimming flat out at six stones from three sides — 0.000 m into any; a minute of fight parked low
  beside a stone — no sphere of it ever inside a stone or the floor.
- **Faster, harder**: lurk 3.2–7.2 s (was 6–12), speed 7.5, and once its time is up and it is behind you it RACES round
  to your front at 14 (`plio.raced`, the shorter way by angle) instead of idling — attacks went from every ~22 s to
  every 11–15 in the harness with a fixed camera. Tell: turns at 3.2, charges after 0.6 s aimed (1.7 s at most).
  Charge to 21 m/s at 19 a second (was 15 at 13), the bite from 14 m. After a bite it wheels straight back in 45 % of
  the time (`plio.again`). Flee 8–15 m/s, at most 3.6 s. `PLIO_HP` 100 (was 80), stun 1.7 s (2.2), parry window
  `PARRY_WINDOW` × 1.3 (1.5). A bite is still one heart.
- **Murk**: the descent's fog ends at 0.056 (was 0.042): half-seen at 15 m, gone by 30. The vignette 0.88. The first
  pass is at 24 m (at 34 the new murk hid it whole). Rendered: a faint shape at 28 m, a silhouette with its eyes at
  19, on you at 13.

## The tail, the wheel, the weave; the snap; the glow goes (2026-10-15)

The owner: "make some of his moves faster and more erratic you can tell when hes leaving too easy he should sometimes turn
around faster rather than disappear … give him a move where he swings his tail at you too but make this readable as
well to block … the flashing circles around the sea monsters body when he dies can go … make the water slightly more
murky … give the fishing line snap the sound effect at 3 seconds in this clip … make the glow in the water disappear
after the sea monster fight."
- **Tail swipe** (`plio.atk === 'tail'`, a third of the runs once it has bitten): the charge aims 3 m to a side
  (`plio.side`), at 8.5 m it goes to `swipe`: it GLIDES PAST at 7 m/s until you are behind its hip (`plioHipPos`,
  tail_01), then winds up 0.6 s — the tail curls AWAY from you (−0.95 rad), bubbles stream off the tip, a growl and a
  surge — and sweeps 0.3 s through you (+1.15), its hindquarters drifting in 1.8 m/s through the wind-up. Contact:
  tip or mid-tail within 2.9 m during the sweep → `plioTailContact`: parry window (PARRY_WINDOW × 1.3, facing) stuns
  it, a block costs stamina and knocks you 9 m/s, else a heart and 14 m/s across the water. Measured: unguarded from
  four directions 4/4 hit; guard raised at t 0.45 of the wind-up 2/2 parried.
- **The tail pose** (`plioTailTurn`, `plioTailPose`): after the mixer, each of tail_01..06 turned about the animal's
  own up (weights 0.10…0.20), conjugated through its parent's world rotation; the pre-turn quaternions restored before
  the next mixer update (a bone the clip does not drive must not accumulate). Which way + throws the tip is MEASURED
  once (`plio.tailSign`, +1 on this rig).
- **Erratic**: the charge weaves ±5.5 m across its line (`plio.wph`), gone by the last 10 m. **The wheel**:
  `plioOff(p)` after a bite (0.55), a stun (0.4) or a swipe (0.55): `again` turns it at 0.7–1.4 s into the flee, from
  12 m out (was 26), at 6 rad/s and 9 m/s, charging after 0.25 s aimed — it comes round in sight.
- **Death**: no bubbles off its body (thrash or sink) — blood and silt only.
- **Murk**: the descent ends at 0.064 (was 0.056).
- **The snap**: `assets/line-snap.m4a` (the owner's "Climbing Rope Snap", 2.84–3.40 s, 10 KB), straight into
  `gameAudioGate` past the deep's 520 Hz low-pass (it parts as you go under), scaled by `masterGain` × `sfxBusGain`.
- **The glow** (`updateFishSpot`): `k = 0` once `deepDone` — the haze and the sea's own glow both.

## The pliosaur, round three (2026-10-16)

- **"Flashing red and white circles around him when he dies."** The bubbles came off the thrash on 10-15, but the
  deep's one particle pool (`deepFx`) draws blood and silt as screen-facing discs that fade in and out, and the death
  threw sixty at the mouth (`plioDie`), a stream through the thrash and the sink, and seventy of silt where it settled
  (twice: the 'die' case and `plioSolid`). All four are gone, and `plio.flash` is zeroed at the kill.
- **The tail is a whip** (`plioTailPose(dt)`): each of the six tail bones is a spring on `tailAng` (K 520 at the root
  to 140 at the tip, damping 0.62→0.40 of critical), so the curl rolls down the tail and the tip overshoots (measured:
  target 1.3, tip 1.75) and settles. The swipe is `PLIO_TAIL_WT` 0.85 (coil over two thirds of it, then a cocked
  tremble) + `PLIO_TAIL_ST` 0.34 (ease-out cubic), the body banks into the coil and rolls back through the sweep. The
  hit test sweeps the tip's whole path each frame (`plio.tipPrev`), so a fast frame cannot step over you. Measured in
  the harness (`b.step` by hand: the hidden pane gives the deep four frames in three seconds): a camera put on the
  tip's path is hit at t 0.85.
- **The wash-up was in the sand**: `washPose` set the eye 0.16 over y = 0 with a 1.2 rad roll, and at FOV 105 the near
  plane's low corner is ~0.27 under the eye. Now 0.38 over `groundUnder` (mounds, berm); `endDeep` stands you on it too.
- **The line snap sounds under water** (`sfxLineSnap`): when `uwLP` is down, its own 1.1 kHz low-pass and a 0.13 s
  murky slap-back (feedback 0.38 through 520 Hz), not the deep's 520 Hz, which made it a thump.

## 2026-10-16: the body falls straight down, faster, and lands

`plioDie`'s sink: the thrash moves it 0.5 m/s (was 2) and it is already sinking; horizontal speed bleeds at e^−4t; the
fall reaches 5.2 m/s (was 3.4). On the floor: thud 0.14, surge 0.85 / 2.2 s, a heart thud, trauma 0.6 — all scaled by
how near you are — and a rebound (`plio.bounce`, two smaller bounces over 2.2 s). Not seen in the harness.

**DONE (2026-10-17, rebuilt — see weapons.md): the Artifact of The Sea behind the wash-up's syringe.** The owner wants "the water artifact my
partner made" lying behind the empty needle when you wash up. That artifact (`seaArtItem`, the parry wave — see
weapons.md, 2026-10-15) was deleted whole by the partner's e7e7e6a (the Ring of Connection replaced it) and was never
committed: no copy in git, origin, the stash or this machine's transcripts. The owner chose to wait for the partner to
push it. When it lands: spawn it in `needlePlace` (the needle is at `x, 0.016, z`, the body lies at `deep.washX`, so
"behind" is on the far side of the needle from the wash pose), with `addItemShine`, as a once-a-game pickup keyed in
the save so a restore does not lay a second one.
- **It lies at `deep.washX + SEA_WASH.dx (1.45)`, `z + SEA_WASH.dz (-0.25)`**, laid by `seaLay` in 'black' beside
  `needlePlace`, stood 0.7 rad up in the sand (flat it was a sliver from the 0.38 m eye; tilted it faces you 0.79) —
  dead centre of the view as your eyes open, under the crosshair standing. `seaRelic` (0/1/2), `seaRelicAt`,
  `seaRelicOn` in the save; a save from before it that has `deepDone` lays it by the saved needle. Testing the wash in
  the harness needs `startDeepHook()` first (it sets `deepLock`; `updateDeep` returns without it), and `__bw.frame`,
  not `step` (the deep runs per frame).

**THE PLIOSAUR, FASTER AND NEARER (2026-10-18, the owner: "MORE AGGRESSIVE … SWIMS AWAY TOO MUCH AND TOO FAR … IMPROVE
THE TAIL SWING HIT").** Lurk 22-28 m (16-20 a quarter of the time; was 40-48 — out of sight at the fog's 0.064), 1.2-2.8
s (was 3.2-7.2), 10/18 m/s, steer 1.4, forced tell at −2. Tell 6 m/s, turn 4.5, 0.35-1.0 s. Charge from 10 (14 a wheel),
28 m/s², cap 24, gives up at 4 s. Flee 35 m and +2 (was 70, +6), 10-18 m/s, wheels at 8 m after 0.35-0.7 s, 75 % after
a bite/swipe (60 % a stun), lurks again past 24 m or 2 s. Tail 45 % of attacks (any time). The swipe winds up beside
you (level with its middle, glide ≤ 1.2 s at 10), `PLIO_TAIL_WT/ST` 0.6/0.22, coil 1.4 with a bank 0.45 and an eye flare;
the hit only in the sweep, the tip's swept path ≤ 1.5 m or mid-tail ≤ 1.9, the tip moving toward you; the knock along
the tip's travel (16 + 2.5 up, only if it landed), thud 0.18, surge, trauma 1.0, fov 9, hitstop 0.14. Not played.

## 2026-10-18 (second round) — no free hits, a tail that reaches

The owner: "he sometimes just swims beside me so i can get free hits he should be attacking and biting i dont think the
tail swing is working well now". Measured with `sh tools/probe.sh plioTest` (you held still in the deep; 12 forced tail
swings, then 8 cuts made with it alongside 4 m off).
- **A cut it did not earn is answered**: `plioHurt` (melee, not stunned off a parry, not already biting/telling/charging,
  not mid-sweep) → `plioSnap`: the bite clip from `PLIO_BITE_FROM + 0.25` at 1.1x, a roar, the body whipped round at
  6 rad/s, and its HEAD driven (≤ 16 m/s) to the bite's own 4.2 m stand-off so the clip's 3.5 m lunge ends at your face.
  Driving the MOUTH to 1.5 m instead overshot — the lunge then carried the jaws past you (0 of 8). With the head at 4.2:
  5 of 8 snaps reached a player who did nothing (a guard/parry takes them as any bite).
- **The tail reaches**: the curled tail only reaches BEHIND the hips, and it wound up with you level with its middle —
  in front of anything it could touch. Through the wind-up the hips are now carried (≤ 7 m/s, so the tell can be swum
  from) to where the arc passes through you: you 0.72 of a tail (`plio.tailLen`, hip→tip, measured once with the
  tail sign) behind them and 0.36 out to the side, at their height. And the hit window runs on 0.3 s past the sweep:
  the tip is a spring a beat behind its target, so most of its real travel came after the old window shut.
  Glide before the wind-up capped at 0.5 s (was 1.2). Result: 8 of 9 sweeps land on a still player (was most missing).
- Tail chosen 30 % of runs (45 % for a day): mostly it bites.
- Counters on `plio`: `nTail`, `nSwipe`, `nSnap`, `nBite`, `lastBiteD` (harness only).
