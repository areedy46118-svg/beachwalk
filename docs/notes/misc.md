# Miscellaneous

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**AND A `git checkout` ON A FILE YOU HAVE NOT COMMITTED THROWS THE WORK
AWAY.** Reached for to undo one bad edit mid-session; it reverted `main.js`
to the last commit and took six unrelated fixes with it. They were all in the
transcript and were redone in two passes, but the rule is worth writing down:
in a session that edits one enormous file over hours, `git checkout <file>`
is not an undo, it is a discard of everything since the last commit.

**AND HE ROUTES BEFORE HE IS STUCK, NOT AFTER.** Asking the room for a way
round only once he had ground to a halt meant a second of him working along
the table's edge every time you stood behind it. If the straight line to you
crosses furniture he asks for a route straight away, at most every
`PATH_EVERY`, and drops it the moment the direct line opens — a route is a
way ROUND something, not a way of getting about. Measured: 22 of 22 standing
spots in the room reached, 15 of them by route.

**A RAYCASTER READS `matrixWorld`, AND A JUST-ADDED OBJECT HAS NONE.** The
table is built and then the prop spots are dropped onto it by raycast in the
next few lines; without `updateMatrixWorld(true)` the table is still at the
identity and everything meant to stand on it fell through to where the scan's
floor used to be.

**AND NOTHING IN HERE ELECTROCUTES YOU.** A broken set is pieces, sparks and
a report. It has never dealt damage and must not start: the sparks are a
picture of something breaking, not a hazard, and a room whose scenery hurts
you is a room you stop moving around in — which is the opposite of the point.

**A SPHERE WITH A WEDGE OUT OF IT OPENS ON -X, NOT -Z.** Three's `phiStart`
runs from the -X axis, so the gap a `phiLength` short of a full turn leaves
is centred there — and a globe chair turned as if its mouth were on -Z
faces ninety degrees away from whatever you pointed it at. Both of them
did, which is the whole of "the circle chairs are facing different
directions". Local -X reaches world angle `face` at `face + PI/2`. And a
chair should face the thing the room is FOR: the pair flank the table
across the rug from the sofa, both turned in at it, and the angle is
DERIVED from where the chair stands and where the table is rather than
chosen.

**AND THE CHAIRS HAD THEIR BACKS TO THE TABLES.** A chair is built with its
posts and slats at local -z, so its front is +z, and `-a + PI/2` points that
front straight out at the room. A group's local +Z lands on (sin, cos) of its
yaw and the table is at -(cos a, sin a) from the chair, so the yaw is
atan2(-cos a, -sin a) = **-a - PI/2**. Measured: the chair at (-2.26, 3.83)
faces (-0.921, -0.390), which is its table at (-3.46, 3.32) to three decimal
places.

**AND THE GRID HAS TO AGREE WITH WHAT IS DRAWN, BOTH WAYS.** `fillTavHoles`
puts a storey back where the neighbours agree on a level, something is DRAWN
at it, nothing is drawn in the body band over it (that would be a barrel, and
standing inside one is the bug this would otherwise create) and a body fits.
And the prune now drops a RAISED storey with nothing drawn under it at all:
measured, 218 of 2,636 raised storeys were a step onto air.

- **AND "IS ANYTHING DRAWN HERE" IS A QUESTION ABOUT THE CELL, NOT ITS
  MIDDLE.** The first build of that rule probed the prune's own five points,
  which all sit within six centimetres of the cell centre — and deleted the
  BARREL RACK'S TOP, the rung the whole climb stands on. A 3 by 3 over the
  cell's own width answers it properly: 218 → 103, with every rung of the
  climb intact (0.22 → 1.99 → 2.48 → 3.56 → 4.59 → 5.31 → 6.36 → 7.42).

**AND THE SHEET FELL AT A CONSTANT SPEED, WHICH IS THE ONE THING WATER NEVER
DOES.** `tex.offset.y` walks the pattern down at a fixed rate and a cylinder's
v is linear in height, so every streak covered the same distance per second
from the lip to the basin — while the drops beside it have obeyed gravity
since the day they went in. It cannot be fixed in the update, which has one
offset for the whole mesh: a body falling from the lip reaches depth s at t
proportional to sqrt(s), so the V IS REMAPPED TO THE TIME rather than the
distance and one uniform scroll becomes real acceleration. Streaks are short
and crowded at the lip and stretch as they go.

**A POOLED LAMP FADES; IT DOES NOT SNAP.** The twelve real point lights are
handed to whichever lamps reach you, and a lamp that lost its slot went dark
on one frame and the next one lit on the same frame — a hard flicker every
time the ranking changed. Each lamp carries `userData.lpW`, eased toward 1 or
0 over a quarter second; a lamp already lit scores a third higher so two
equal lamps do not trade places every frame; and a hidden or detached lamp
(`lampReach` returns -1) leaves the pool at once.


**A DOOR OR A LOAD GIVES YOU YOUR BREATH BACK.** `update()` calls
`catchBreath()` while the blackout is over 0.85 or a restore is pending, and
`finishRestore` calls it after the rings are back on (a ring can raise
`stamMax()` after the bar was filled). Every cut goes through the black, so
no room's own cut has to remember it.

**DEV: "Teleport to castle merchant"** (`#m-shop2`, `devTeleportShop(2)`) sets
you down 2.3 m seaward of the second trader (`TRADER2_X/Z`, 16 m short of the
first castle's gate), facing him, and marks the walk's once-only events
before it as passed (the pack, the horde, both autosaves, the smiling one,
the cave's fall, the whale sighting) the way a restore past them does.

## 2026-10-13 — Bradley Beach has more to say, then leaves

- `BRADLY_SCRIPT`: after the water line, three more exchanges (the owner's
  lines; the player's replies are the choices): `needle` ("Why are you even
  here?"), `blood` ("What are you talking about?"), `rumours` ("What else do
  they say about this beach?"). The last node's `say` arms `bradlyScurry`;
  `endDialog` starts it however the box is closed (click, timeout at 7 s,
  Escape), so reaching the last line is what decides it.
- `updateBradlyScurry`: 1.9 s — 6.5 m +x over the cliff top (and 1.2 −z),
  bobbing |sin 15t| × 0.14 with the sprite rocking ±0.09 rad, dropping 2.6 m
  behind the lip over the second half — then `bradlyVanish` (hidden, off the
  interactables). Saved as `bradlyGone`; a restore vanishes him.
- Walked in the pane: every line in order, each reply a choice; after the
  last he goes 15.6 → 22.1 and is hidden, not hoverable.

**BRADLEY GOES WHEN YOU CLICK AWAY, NOT ON A TIMER (2026-10-13).** The last
node (`rumours`) had `end: 7000`, so the box closed itself and he ran off while
you were still reading. A last-word node may say `end: false` now and
`showDialogNode` sets no `dialogEndTimer` for it; its hint reads "click to
leave", and the click (or Esc) is `endDialog`, which starts `bradlyScurry`.

**THE WELL'S CLIMB: SHORTER, THE ROPE, AND HIS HAND (2026-10-13).** Crank 7.5
→ 6.0 s, wait 1.6 → 1.0, grab 2.2 → 1.6, the climb 11–14 → 8–9.5 s: about 17 s
from "let him up" to the black instead of 24. `wellRopeStart` loops the owner's
rope recording (`assets/well-rope.m4a` — the source peaks at −42 dBFS, so the
13.8 s cut was normalised +40 dB) through `wellSend`; `wellRopeTick(prog)` takes
its gain 0.22 → 1.7 and its lowpass 1.1 → 6.3 kHz on prog², and it is stopped
under the sting. The sting (`wellRise`) 0.95 → 1.9; his lines through
`wellVoice` 2.8/0.9 → 2.0/0.7. **The hand** (`makeWellHand`): capsules — a
flattened palm on the rope's lens side, four fingers wrapped round it in three
segments each with black nails, a thumb the other way, the forearm and upper
arm going down and out into the shaft — in his own skin map through
`wellMurkPatch(0.8)`, built during the crank and parked 14 m down so its
programs compile in the murk. `WELL_HAND_T` (1.9 s) before the black it comes
up from 2.7 m to 1.5 m on the rope's own line (the rope sways), turned back-of-
hand to the lens, and the climb's jolt fires as it grips. **Measured: with only
the bore's lamps it read 0 — nothing lights that shaft — so it carries its map
through the emissive at 0.3**, which is a pale shape the dark half gives up.

**THE WELL'S CLIMB: THE CRANK, AND NO HAND (2026-10-14).** "The crank keeps
blocking my face": the scan's `Well_crank` node is pivoted 0.3 (local) UNDER
its axle — the drum's vertices run at local y 0.295, z 0 — so turning it
swung the whole axle and handle round a circle down through the lens over the
rim (measured: the crank's box went from y 1.42–1.97 to 1.04–1.50 mid-turn).
The load re-pivots it (children moved onto the axle, node up by as much,
found from the middle 60 % of the axle's length so the handle does not skew
it): it stands where it did and turns in place; a 20-frame sheet of the crank
and climb has nothing in front of the lens. His hand coming up onto the rope
(`makeWellHand`, `wellHandTick`, `WELL_HAND_T`) is DELETED — "take seeing his
hand out of the well it looks bad". The climb is the rope and its sound.

## Dev mode opens every door (2026-10-15)

The owner: "make every door unlock while dev mode is on". `devKeys()` (next to `DEV_JARS`) is asked beside the key at
each lock: the wheelhouse door (`holdDoor`), the ship's chest (`chestKeyIn`), the pavilion gate (`gateKeyIn`), the
catacombs' skull door (`catKeyIn`) and its door in the dune (`startCatReturn` without `catDoorOpen`), the tavern
storeroom (`buildTavStore`), Henry's cell, and the throne room door that `crusaderAlive()` bars. The label reads
"Unlock …"/"Enter …", the lock still makes its sound, and a key you DO carry is still used and taken (`keyUsed` plays
`sfxLockOpen` itself, so the no-key branch calls `sfxLockOpen()` directly; the cell already played it unconditionally).
Left alone: the "barred from inside" door (one-way by design, no action), the Dealer's locked case (a crate, opened by
winning his game), the C13 arch and `fortBackBarred` (already open / already dev-aware). Measured in the pane: with dev
on and no keys, the hold door opened (850 ms timer), chest and gate unlocked, `henryFreeS()` went to 1/'wait'.
Note `statHad(boatKeyItem)` falls back to `holdDoorOpen`, so a dev-opened door counts that key in the end stats — dev
mode only.

## A push-out never carries you through a wall (2026-10-16)

"I should never clip through a wall." The storeyed walks (catacombs, tavern, keep) tested the STEP for crossing a face
(`hits`, at 0.8/1.25/1.68 over the feet) and never the pushes after it (`pushOutOfKeep`, `keepWallPush`), and against a
thin wall the nearest face can be the far one. A push that crosses is undone — but a body put INSIDE something (a
restore, a teleport) can only get out by crossing, so after 0.35 s held the push is let through (`pushHeld`, per walk).
`shovePlayer` (a creature's body shoving you) also refuses a shove that crosses drawn stone in those three rooms.

## 2026-11-26 — Bradley's injecting line out; "myles went invisible" not reproduced
- `BRADLY_SCRIPT.blood` ("Injecting the horseshoe blood …") and the question into it are gone (the owner: "TAKE OUT BRADELYS WHOLE
  INJECTING HORESHOE CRAB BLOOD LINE"); `needle` is his last word and carries what `blood` did (arms `bradlyScurry`, waits for a click).
- **Myles invisible — NOT reproduced.** `tools/minoseen.js` (XIII: hidden while he waits, 6 meshes drawn as your ally) and
  `tools/minofort.js` (the first castle's farmer fight, 60 s, the camera kept on him: drawn at every check, hips within 0.2 m of his
  group). PROBE TRAP: `cullUnitModels` hides `u.model` of anything outside the view — a probe that is not looking at him reads him
  "hidden". By design he is not drawn while `MINO.stage === 'with'` and you are on the beach or in a room (`updateMinotaur`). Ask
  the owner where it happened (which castle, after a checkpoint load, after a kick?).
- The owner: "First castle". Still NOT reproduced there, five ways: the farmers' fight 60 s with the camera on him
  (`tools/minofort.js`, which also traps any write hiding his model and logs its stack); a checkpoint saved at his side and the
  game reloaded as a checkpoint load (`tools/minoload.js`); through the gate mid-fade (`tools/minogate.js` — `minoJoin` already
  calls `minoWhole`); culled while on screen (`tools/minoedge.js`: 188 culls in 360 frames of a full turn, none with a joint of his
  in the picture); dying (he cannot: your blows skip an ally, `hurtMutantCore`; the castle's men stop at `MINO_FLOOR`).
  Next, from the owner: what had just happened (a kick near him? the fight's end? the gate?), and whether a reload brought him back.

## 2026-11-26 — momentum: the air keeps your speed, the slide, the hook's carry, the slide kick; a crouch no longer eats a jump
The owner: "keep momentum like half life with the hooks boost so its fun to move around and slide into jump kicks", then "keep momentum
for jumps too". `tools/momentum.js` (open beach, on the clock, real key events): a running jump with the keys let go, the slide and a
jump out of it, a kick in a slide, the hook thrown in the air at the sand. PROBE TRAP: C is a TOGGLE — a "stand up" tap after a jump
that already stood you up crouches you again (`state().crouching` now says which).
- **The air keeps your speed** (`AIR_CTRL` 0.2, `BHOP_T` 0.12, `groundT`): the walk's velocity was eased to your keys at the ground's
  grip in the air too — a jump kept nothing. Now airborne (past the coyote's 0.12 s, so a slope that drops a frame under you is still
  ground) no keys hold all of it, and keys bend it at a fifth of the grip without braking a speed over theirs. On landing the grip
  comes back over 0.12 s: a hop inside it keeps the speed. Measured: run 5.7, in the air 6.1 held, hop on landing 5.9 held.
- **The slide** (`SLIDE`, `slideStart`, C while running on the ground at over 1.15× the walk): 1.18× your speed (never under 6.6
  m/s) along the way you were going, easing to 0.45 of it over 0.75 s, steered a little (1.6/s); 0.08 of the stamina bar, 0.55 s
  before the next. It owns the velocity as the step does; standing up, leaving the ground or a take ends it. Measured: 6.8 -> 5.1
  m/s, 3.2 m in 0.5 s.
- **A JUMP OUT OF A CROUCH WAS EATEN** (every one, long before the slide): the jump stands you up, the eye's height grows as `crouchT`
  eases, and the feet are the eye less that height — the next frame they were under the sand and the ground took the jump back (vy
  4.2 -> 0). In the air the eye's change now moves `camBaseY` with it (the feet stay). The slide's jump: 4.4 m/s held through the air.
- **The hook's carry** (`HOOK_ZIP.carry` 0.6, `airFade` 0.35, `HK.zipPk`): it was 0.55 of the pull's speed AT THE END — where it
  eases in, half its peak — fading 1.6/s in the air and 9 on the ground. Now 0.6 of the pull's FASTEST across the ground, fading
  0.35/s in the air and on the ground only once the hop's window is past. Measured: a 17.9 m/s pull carried on at 8-10 m/s through
  the air and a hop, 16.5 m in all (11.6 before).
- **The slide kick, your speed behind a kick** (`KICK.air` in a slide; `KICK.mom`): a kick in a slide lands as a jump kick (85 %
  down); a kick at more than a run throws the man further — ×1 at the run to ×1.6 at 9 m/s, the hook's carry counted. Only the
  throw (`kickRagStart`'s `far`, `killFling`): what it hurts and how often it downs are the kick's own. Bosses unchanged.

## 2026-11-27 — movement feel: the jump's shape, the landing, air braking, landed speed, the slide's cap, the kick and your momentum
The owner: "do one more pass just to improve movement smoothness and feel. the jump and momentum. see what good physics based games and
doing. make the kick feel good in relation to this." Measured with `tools/movefeel.js` (open beach, on the clock, real keys; nine
tests). PROBE TRAP: speed read off the camera's position carries the SHAKE (trauma moves `camera.position`) and reads as a stutter
that is not there — the probe reads the walk's own velocity (`__bw.velS()`); `__bw.landS()` is the landing spring.
What the genre does that we now do too: a hang at the top and a harder fall (most platformers; not Quake/Source, whose jump is a
plain parabola), air control that can brake (Quake/Source), speed kept through a landing (Titanfall/Apex slide-hops) with a cap on
what chaining gains, a kick that takes your speed and gives it to the man (Dark Messiah, Dying Light's dropkick).
- **Jump height is FIXED on purpose** (tap = hold, 0.789 m sampled): every ledge is laid out to it, and first-person games keep the
  impulse fixed. No variable-height jump.
- **The jump's shape** (`GRAV_HANG` 0.6 while falling slower than `GRAV_HANG_V` 1.0 m/s, then `GRAV_FALL` 1.38; the rise untouched):
  same top, same 0.60 s in the air for a level jump (so gaps are unchanged: a running jump still lands 3.78 m on), but the top hangs
  (height every 4 frames 0.79 0.78 0.72 0.57 0.33; before 0.79 0.77 0.68 0.51 0.26) and you land at 5.1 m/s, not 4.7. A long fall
  is faster (4.5 m: 0.78 -> 0.72 s). There is no fall damage. Off while the hook pulls (`HK.st === 'zip'`: its `vy` pre-adds
  `P_GRAV * dt`, so the two must stay the same number) and in the deep.
- **The landing is a spring** (`landDip`/`landV`, `LAND_K` 200, `LAND_D` 17.5; struck with 0.54 of the landing speed, max 3.6): the
  lens used to jump 0.108 m down in the one landing frame and ease back. Now it sinks to 0.075 m over 4 frames and comes back with
  0.004 m of rebound. Any landing over 1.2 m/s, not only hard ones. The old instant `landDip = Math.max(...)` setters (the stomp, the
  slam) still work: the spring brings them home.
- **Air braking**: the air branch put your speed back whatever the keys said, so S held in the air did nothing (5.7 m/s to the
  landing). Now the more the keys oppose your motion the less is put back: S held from take-off leaves 2.5 m/s after 0.3 s. A turn
  across your way still keeps all of it.
- **Landed speed bleeds, it is not snatched** (`momKeep`, `MOM_BLEED` 2.0/s): set by a landing only; while you keep pressing within
  60° of your motion, speed over what your keys ask decays by half in ~0.35 s instead of at the ground's grip (half in 0.1 s). Cleared
  by letting go, turning away, a slide or a dodge step — so a step or a blow's shove is not stretched.
- **The slide's boost runs out** (`SLIDE.top` 1.75 runs): it was 1.18× of whatever you had, so slide → jump → slide on landing grew
  without limit (6.7 7.5 8.2 9.1 10.0 11.2 m/s, camera-measured, and on up). The gain now fades to nothing at 1.75× the run:
  5.7 6.3 6.8 7.2 7.6 7.8 8.0, levelling off. A speed already over that (the hook's) is kept, not boosted.
- **Speed opens the lens** (`speedFov`, `SPEED_FOV` 5°): nothing at a run, 5° at twice it, eased at 4/s.
- **A kick at nothing no longer stops the clock at a run**: a whiff meets the sand a stride on (by design) and took the blade's
  hitstop plus `kickFeel`'s hold and its 0.9 m/s step back — three frozen frames mid-run. At over a walk, or in the air, the scuff
  holds nothing and steps you nowhere (`KICK.scuff`); the puff and the sound stay. Measured: speed flat at 5.7 through the kick.
- **The kick spends your speed into the man** (`KICK.along`, `KICK_GIVE` 0.75, `KICK_SPEND` 0.62): his shove is 4.6 + 0.75 × your
  speed along the kick (at a run he went 2.55 m, was 1.80), and 62 % of that speed leaves you on the frame it lands (5.5 -> 0.9
  m/s, back to a run in ~0.5 s) — before, you ran into him a third of a second later. In the air you come off him at ~1.9 m/s
  forward while the pogo lifts you. Bosses' shove unchanged (1.1). Damage, stun and knockdown odds are untouched.
- **You go with the kick** (`KICK_LUNGE` 1.6): thrown in the air it carries you at what you look at, up to 1.6 m/s more and never
  past 1.1 runs; on your feet, stood or walking (under 2.2 m/s), 1.2 m/s forward that the grip takes back in a hand's width.
  The air chain (`tools/gatefarm.js &fight=1&air=1`): 5 kicks, 3 bounces (was 2), feet to 2.95 m (was 1.97).
- Unchanged, checked: `tools/momentum.js` (jump 6.1 held, slide 6.8 -> 5.1, the hook's carry 10.4 -> 8.1), start/stop (0.33 s each
  way), the 17 music scenarios.
