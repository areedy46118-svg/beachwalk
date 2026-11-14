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

## 2026-11-13 — a checkpoint at the snap
The owner: "add checkpoint when the fishing rod snaps in the water too". Every save is refused from the bite to the sand
(`autosaveNow`: `deepLock`), so a death to the pliosaur went back up the beach before the bite. Now:
- **The save** (`deepSnapSave`, at the snap in 'descent'): `saveCheckpoint('deepSnap')`, bypassing `deepLock` — the one
  save written down there. `saveRoom()` says 'deep' while `inDeep` (last in its list).
- **The load** (`ROOM_BACK.deep` → `deepRestore`): ready when `plio.ready && deep.world` (`bwSoon('assets/pliosaur.glb')`,
  `plioLoad`, `deepAmbLoad`); `placeInDeep`, then the camera at `deep.descE` looking down the pull's last tangent, fog
  `DEEP_BOT_FOG` 0.064, `deepBack` uK 0.4, `deep.ph = 'silence'` t 0 (the pliosaur's first pass 11 s later), `snapped`,
  `hint` (already seen), `deepLock` on and the hands free; the rod taken out of the pack (it is at the bottom of the sea,
  as 'black' does later in a live game). `deep.reMuffle`: the low-pass goes on in `updateDeep` once the audio exists
  (the restore runs before it). `BW_FROM` ranks `pliosaur.glb` first for a 'deep' save (ROOM_Z 814, ROOM_FILES).
- **No far rest in it**: `bwHoldHere` includes `inDeep` (`BW_DEEP_FILES` pliosaur | whale come through) and no warm step
  runs while `bgLoadMode && inDeep` — a death in the fight loads into the fight.
- A death in the deep → the card → the deep; the opening song is not played on that respawn (`bootRespawn`), and is
  on a load from the menu (musictest `loadDeep`).
- Measured (`tools/loadall.sh 1 <out> deep`, which drives the real snap: hook, plunge, the descent's last 2 s): written
  room 'deep' spot 'deepSnap'; loaded playable 4.8 s (6.5 before the pliosaur was ranked first), black 0, in the deep,
  'silence' → 'fight' and the pass begun by +10 s, no frame over 45 ms in the 14 s after.

## 2026-11-13 — the bite 3 s sooner
`DEEP_HOOK_T` 14 → 11 ("make the bite at the fishing spot happen 3 seconds earlier"). Nothing else is timed off it
(`deep.spotT` is only counted against it).

## 2026-11-14 — the dead in the water
The owner: "make there be dead mutant bodies floating in the water with blood in the water realistic on the sea monster
fight make them gracefully floating and ripped to bits random limbs too make it cinematic they should have water phyics
too with the monster swimming by pushing them". All of it is `dead` / `deadStep` / `deadPush` / `deadBlood*`, beside
`updateDeepFx`; `updateDead(dt)` runs after `updatePlio` while `inDeep`.
- **The bodies** (`DEAD_SET`, offsets from `deep.descE`): eight of the beach's `mutant.glb` (pale, red, dark skins; each
  kind's own `bones` build, scaled to its `h` off the bind pose), `cryClone`d skinned copies posed from 62–99 % of `die`
  or `die2` (scale tracks dropped, as `dressMutant` does), hips on the group's origin. Two of them sit by the descent's
  last three seconds (the path runs ~(2, 6, −22) → (0.6, 2, −8) from `descE`); the rest are in front of where you
  arrive, the nearest 4.7 m off (you drift into it on the arrival's 1.5 m/s).
- **Torn**: each cut bone is baked off by `bakeLimb` (the beach's own), drifted 0.6–2.2 m from the body, then scaled to
  0.0001 on the body. Every stump, on the body (a child of the cut bone's PARENT, scaled by 1/its world scale) and on the
  piece (at its cut end in the piece's frame), is `deadCapGeo`: torn meat lumps, a splintered bone shaft and 2–4
  strands, one merged mesh in vertex colours. Plus 2–3 loose gibs a body. 8 bodies, 47 pieces, 48 bleeding points.
- **Seen by their own light** (nothing lights the deep): the skin's map as `emissiveMap`, (0.62, 0.72, 0.74) at 1.7 pale /
  2.4 red / 2.7 dark (the pale map is brighter); DoubleSide so a cut shows its inside. The caps glow by their vertex
  colour (`onBeforeCompile`: `emissive * vColor`, 0.25). At 0.3 like the pliosaur's they were black shapes.
- **Water physics**: each piece relaxes toward `deadFlow` (a slow wandering current, ≤ 0.2 m/s) with a drag that grows
  with speed, a weak leash home past 3 m, the floor and `deepRockPush`; spin damped, a slow noise torque, and a body
  rights itself toward the up it was built with (overshooting: it rocks). Pieces push each other apart. The limbs sway
  off the joints (`DEAD_SWAY`, two sines per bone on a random axis), and `flail` (from any shove) throws them about.
- **The pliosaur moves the water** (`deadPush`): its nine `PLIO_SPHERES`, each with its own velocity from last frame
  (so the tail swipe pushes too); within skin + 2.4–3 m (+0.8 r) a piece is dragged along at 0.85 of the sphere's
  velocity and thrown off its flank at 0.75 of its speed, falloff squared, plus a shear spin; inside the skin it is
  carried out. A hard shove: a muffled `fleshHit`, a burst of blood. Measured, 40 s of the fight held at `descE`:
  bodies up to 24 m/s, flail 1.57, moved up to 12 m, none under the floor.
- **The blood** (`deadBloodBuild`): one InstancedBufferGeometry of 440 camera-facing quads, a tiled fbm canvas sampled
  twice and drifting, radial falloff, near-black red in LINEAR (0.10 → 0.028), faded by the fog like `deepFx`. The first
  72 are standing clouds (round each body and stump, and a thin haze 3.5–7.5 m wide); the rest a ring of puffs from
  every stump (0.7–1.5 s apart, slower over minutes, faster when moved) that open ×3.5–6.5 and go in 7–13 s. Moved by
  the same current and, lighter, by the pliosaur's water.
- **Two traps.** (1) A BIG QUAD NEAR THE EYE IS CUT BY THE NEAR PLANE and its straight edge shows: the haze read as
  pale V-shaped walls. Each cloud thins with distance relative to its OWN size (`smoothstep(size·0.3, size·0.85+0.6)`).
  (2) **A SCRATCH VECTOR READ AFTER A CALL THAT USES IT**: the body's cap scale was `1 / _dzA.x` after `deadCap` had
  written a direction into `_dzA` — one cap a hundred metres across, a pale wall over the whole view.
- **Loading**: `bwSoon('assets/mutant.glb')` (or naming it in `BW_DEEP_FILES` / the deep's `ROOM_FILES`) marks the
  WHOLE URL near, and every beach mutant parses its own copy: they were all parsed and dressed in the fight (a 70 ms
  frame). `deadLoad(parse)` fetches on its own (shared with the queue if it has it) and parses its own copy, asked at the
  hook only to fetch, parsed under the plunge's veil (`plunge` T > 0.2) and built at `descent` 0.02 (veil still full).
  The checkpoint's `ready` waits for it and both skins (`deadSkinsIn`); `deadBuild` uploads the maps
  (`renderer.initTexture`). Measured: the deep loads playable in 3.85 s, worst frame 27–32 ms (the same as without
  them); per frame `deadStep` ≤ 0.9 ms (`dead.ms`, `dead.msMax`).
- A restore puts every piece back at home (`deadPlace`) and re-seeds the standing blood.
- Probes: `deadShots` (`&quick=1`: stills only), `deadFrames`, `deadLive` (the real bite → descent), `deadWho`.

## 2026-11-14 (later) — one still alive, the ambush, the rods, the light
The owner: "have one of the bodies in the water be moving in your line of vision have it sit for a sec struggling then
have the sea monster abruptly and fast swim through biting mutant floating make this be scary like a jump scare then have
him start attacking after that have floating fishing rods around too … have this instead of part where he swims by in
the start", then "no strings on the rods" and "make the light shine through the water make it cool looking".
- **The one still alive** (`dead.live`, `deadBuildLive`, `deadLiveStep`): a pale one, forearm gone and bleeding, at
  `DEAD_LIVE_AT` (0.2, −0.6, 5.0) off `descE` — dead ahead where you arrive. Its `run` clip with the scale tracks AND
  `Character1_Hips.position` dropped (it goes nowhere), body tipped back and wrenched on two slow sines, a thrash
  multiplied onto nine joints after the mixer each frame, bubbles off the head, `mutVox('hurt'|'tell')` placed by `sfxAt`
  every 1.1–2.5 s. It panics (faster kick, harder thrash) once the ambush starts. The corpse that hung at (−1.7, −0.4,
  4.4) moved to (−4.2, 1.2, 6.8) to clear the stage.
- **The trigger** (`updateDeep` 'silence'): once it has been in front of you (`deadLiveSeen`: inside 0.5 rad of the
  look, under 22 m) after 3.5 s, or at 10 s regardless → `plioAmbush()`. No live one (the dead never loaded) → the old
  `plioStartPass` at 11.
- **The ambush** (`plio.st === 'ambush'`, `plio.amb` 'in' → 'carry'): MEASURE THE LENS FIRST — FOV 105 is wide.
  Head-on from 34 m with the mutant at 9.5 m it was a small dark shape; side-on at 11 m it read as far off. Now the line
  is ACROSS your view (right × 0.97 + forward × 0.18), the head put 34 m back along it, `Attack_Bite` from
  `PLIO_BITE_FROM`, speed each frame (dist − 4.2) / (time to `PLIO_BITE_AT`) clamped 8–40 (the bite state's own rule):
  ~30 m/s, in the picture about a third of a second before the jaws shut 5.6 m in front of you. Warning: a surge only
  inside 17 m. At the shut, `deadLiveBite`: the right leg baked off and left tumbling (its own piece, cap and bleeds),
  14 big blood clouds and its last air, the roar 1.7, `mutVox('die')`, the sever, two `fleshHit`s, thud, surge,
  trauma 0.8, fov 9, hitstop 0.14. Carry: 13 → 18 m/s, steered on along its line and away (1.2 rad/s), the body rolled
  ±0.45 at 19 rad/s (the shake) fading over 1.6 s, the mutant held across the jaws, thrashing (×1.6), pouring blood,
  gone at 2.6 s or 30 m. At 2.8 s `plioLurk()` with `lurkT` 0.5: measured, a tell at 4.35 and a bite at you.
  Measured: head nearest you 5.9 m, the body 7.2. `plioHurt` never snaps out of 'ambush'.
- **The rods** (`deadBuildRods`, `DEAD_RODS`): five clones of `fishingRod` (the scan), materials cloned (which drops
  the bend's `onBeforeCompile`, as wanted) and lit by their maps at 0.7, as drifting pieces (`kind 'rod'`). Built when
  the scan is in (`deadRodsStep` asks each frame until it is); the deep's `ROOM_FILES` names `fishing-rod.glb` so a load
  straight into the deep has it (only the rod uses that file). No lines: the owner's word.
- **The light** (`deepRays`, `DEEP_RAY_N` 26): one instanced draw of tall quads turned about a slanted axis
  (0.32, 1, 0.18) to face you, wrapped round the camera on a 72 m tile, ADDITIVE, depth-tested (bodies cut them).
  Streaks drift inside each, a ripple runs down them, brightest toward the surface (so the long pull goes from bright
  water into dark — at 1.6 the top of the descent was solid cyan bars, 0.7 now), thinned by distance at 0.42 of the fog.
  Built with the deep (`buildDeep`), faded out through the drowning.
- Measured (`loadall deep`): playable 3.9 s, worst frame 30–31 ms through the ambush. Probes `deadAmbush` (a sheet of the
  run-in), `deadLive` (now to fight 6 s).

## 2026-11-14 (third round) — real-looking wounds, the grab in one pass, the murk and the light
The owner (with a still from his game: the stumps were pale bars): "make the severed parts of the models look better
this looks unrealistic. i dont like the bones poking out that much. make the mutant that gets ate be much farther away.
the monster shouldnt even stop to bite him just straight swim through fast and grab him all one motion. make it look more
cinematic down here too the light peaking through the water could look better. make it more mysterious and eerie murky".
- **Stumps** (`deadCapGeo`): a ragged rim of torn skin (7–9 round lumps, detail 1), wet dark meat and black clots in
  the middle, a bloody bone end on about half and only 0.2–0.4 of a radius clear, a short strand or two. Loose meat
  `0x3a0e0a` (at `0x5c1610` / emissive `0x320907` a chunk was a flat red block).
- **The one taken is 13.5 m off** (`DEAD_LIVE_AT` (0.6, −0.5, 13.5)) and **taken in one pass**: 31 m/s on a line set
  while it is far (steering stops inside 10 m), the BITE CLIP's speed (not the animal's) set each frame so the jaws shut
  as the mouth arrives; grabbed inside 2.6 m of the mouth or once past it, eased onto the jaws over a few frames, and on
  at 25 m/s into the black; no hit stop (trauma 0.5, fov 4). Measured: grabbed 1.07 s after it sets off, 13.1 m from
  you; a tell at 4.1, a bite at you after.
  **TRAP: `plioMouthPos(out)` writes `_pM` inside** (`_pM.copy(plio.dir)`), so `plioMouthPos(_pM)` returns
  dir × 2.44 — the mouth was never near anything and the grab never came. The ambush has its own `_pAm`.
- **The murk** (`deepMurkC`, 40): great slow clouds 7–17 m, one a shade paler than the water, the next darker
  (`cloudMat`, the blood's shader with its two colours as uniforms), drifting on `deadFlow`, swirled by the pliosaur
  (`deadPush`'s `vel`), kept round you (past 44 m they come back on the far side, in the fog).
- **The light**: 20 shafts that each come and go on their own slow count and lie in patches down their length (light
  finding its way through, not columns), visible at the fight's depth now (×0.5 floor); and straight up, the surface
  itself (`deepBack`): a slow shimmer of bands near the zenith (`uT`), where the shafts converge.
  **TRAP: `patch` IS A RESERVED WORD IN GLSL ES 3** — the rays' program did not link, and with
  `renderer.debug.checkShaderErrors = false` (line ~1219) the only sign is `useProgram: program not valid` in the
  console and a mesh that is simply not there. Grep the console for it after any shader edit.
- Measured: the deep loads playable in 4.1–4.5 s, worst frame 26 ms.

## 2026-11-14 (fourth round) — less of it in your face; the paddle; the swoop
The owner: "make the seamonster clip into me less while fighting. make the mutant in the water swim animation look better
its kind of weird and lags. the seamonster should swoop and eat him faster too."
- **Through the lens**: the body push was nine spheres with 0.7 m round each — nothing between them, ahead of the head
  or on the flippers. Now a capsule between each two of `PLIO_SPHERES` (radius interpolated), the snout
  (`plioMouthPos`, 0.55·K) and the four flipper bones (`plio.fins`: forearm/hand L/R, 0.32·K), all + 1.25 m. And a
  bite's charge stops its head at `PLIO_STAND` 5.0 (4.2), the contact reaching 3.9 (3.4). Measured (`plioClip`: 60 s of
  its fight, you held; every 2nd frame the nearest of every 5th skinned vertex to your eye): skin inside 0.3 m of the
  eye 100 frames of 1800 before → 49 at 0.9 m room → 30 at 1.25; inside 0.6 m 151 → 99; bites still land (4 → 4 hurts).
- **The paddle** (`DEAD_LIVE_CFG` run 0.6×, pitch +0.75, thrash ×0.3; `deadLiveClip` switches clips, `dead.liveCfg` lets
  the harness try others): picked off `liveSwim`'s rendered rows — upright at 0.85 with the full thrash it ran on air and
  juddered; tipped forward and slowed it paddles head-first at you.
- **The swoop**: from 30 m off and 10 m DOWN, heading level at 42 m/s, steered at 2.8 rad/s until the last 8 m — an arc
  up out of the deep onto him; carried on at 30. Grabbed 0.60 s after it sets off (1.07). `deadAmbush`'s sheet: the arc,
  the grab, gone into the murk.
