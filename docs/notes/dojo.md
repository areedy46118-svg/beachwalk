# The portal, the dojo and the samurai

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**THE PORTAL, AND THE DOJO THROUGH IT.** A stone circle on the dry sand a
hundred metres past the cave mouth (`PORTAL_X` / `PORTAL_Z` = `HOLE_Z - 100`),
and the scorched dojo on the other side of it (`DOJO_X/Y/Z`, six thousand
metres out, the hall's own arrangement). Stand in the middle of the ring for
`PORTAL_HOLD` and it takes you; take the katana off its stand and the man it
belongs to says so and comes for you; kill him and it puts you back beside the
stones. Three downloads — DJMaesen's portal, matiasmgru's dojo, adrigon's
samurai — and the traps they set, in the order they bit:

- **`Box3.setFromObject` READS `matrixWorld`, AND A JUST-ADDED OBJECT HAS
  NONE.** The raycaster's own trap wearing a different tool. The portal is
  added and measured on the same frame, so without an `updateMatrixWorld(true)`
  the box comes back in the SCAN'S units: measured, the base read a top of
  69.19 and a radius of 686.93, which went into `rockColliders` as a
  687-metre cylinder and threw the player the length of the beach the moment
  they came near it. Anything measured at load measures the identity.
- **THE GLOW HAS TO SIT ON THE BASE, AND THE BASE HAS TO BE MEASURED.** The
  first build put the vortex at y = 0.05 — the sand — and the model's own
  stone platform tops out at 0.381, so the whole light was a third of a metre
  INSIDE the rock and invisible from everywhere. The base mesh is found by
  name, boxed, and the disc is built to its radius and stood on its top. It
  also gets a collider at that height, which is under `ROCK_STEP`, so the
  beach's own rule applies with no special case: you step onto it rather than
  wading through it.
- **A CAVE'S FLOOR RULE IS NOT AN OPEN-AIR FLOOR RULE.** `build_walk` calls a
  surface a floor only if something is ABOVE it, which is what stops the
  outside of the cave's hill being walkable — and the dojo is roofless,
  because it burnt down. Run as-is it found 56 walkable cells out of 60,099.
  Under `--open-sky` the lowest near-horizontal surface is the ground, and
  everything standing on it is what `solid` is for. Then the LOWEST surface
  turned out to be the UNDERSIDE of the floor slab (winding is not read
  anywhere in that file), which put the floor 0.36 m under the boards;
  everything within a `STEP` of the lowest is the same ground, so the slab's
  top wins and the shelf above it does not.
- **THE PACKER DROPS ANIMATIONS, SO THE RAIN IS THE GAME'S JOB.** The dojo's
  `Take 001` drives the rain, and a clip that targets nodes cannot survive a
  bake that flattens every node into world space. Both rain shells scroll
  their own map (at different rates, so the far one does not march in step
  with the near one) and the fifty-five ground splashes flicker on their own
  offsets — one phase for all of them reads as the lights failing, not as
  rain.
- **A RIGIFY RIG IS 678 POSE CONSTRAINTS, AND `matrix_basis` SEES NONE OF
  THEM.** The alien beast's lesson at four times the scale: record `pb.matrix`
  off the evaluated depsgraph, convert back to a constraint-free basis, and
  remove the constraints only after every clip has been sampled.
- **AN ARM IN A T-POSE LIES ALONG X, SO A ROTATION ABOUT X IS A TWIST.** The
  first pose set lifted the arms about X and measured 2.33 rad on the upper
  arm — and rendered eight frames of a man standing in a T turning his wrists
  over. Nothing about a pose can be checked by reasoning; every sign in
  `tools/samurai_pack.py` was settled by looking at a strip.
- **AND `Plane` WAS HIS HAKAMA.** Two meshes were dropped as "helper
  geometry" on the strength of their datablock names. The render came back
  with a samurai whose legs stopped at the armour skirt and started again at
  the boots. A mesh that is weighted to the rig and carries a material is part
  of the man, whatever Blender called it.
- **A PER-PART REMAP IS A FLATTENER**, one level up from the per-channel
  remap's own mistake: pulling every texture part to the same mean made the
  trousers (13.8) and the eye (138.5) both mid grey. What is wrong with these
  maps is the LEVEL, shared by all of them, so the shift and the scale are
  worked out once over every part together.
- **`bossDeath` IS CHECKED BEFORE `deathClip`, AND IT RAGDOLLS.** It works on
  the Dealer only because every bone lookup there goes through a `boneAlias`
  onto `Character1_*`; this rig answers to `DEF-spine`, so the body came out
  with ZERO parts and the boss finished the fight frozen upright in whatever
  frame killed him — measured, `rag` built and the mixer stuck on `sStab`. He
  goes down his own authored `die` instead, and the beats are `kind.death`
  because they belong to the clip.
- **AND `drawGait` DRAWS FROM A PAIR.** `mutPlay` was handed `run2`, resolved
  nothing and RETURNED WITHOUT TOUCHING ANYTHING, so he crossed thirteen
  metres and threw a swing with his TAUNT still on the mixer. The warning has
  been in `mutPlay` since it was written and says exactly this — READ THE
  WARNINGS. `kind.alias` needs `walk2`, `run2` and `idle2` as well as the
  strafes.
- **AND THE BEACH'S CLAMPS ARE NOT THE DOJO'S — the fourth and fifth coats.**
  `mutClampX` would have teleported the samurai onto the sand on his first
  step (he is held by the room's own grid instead), and the player's own
  `CLIFF_BLOCK_X` clamp yanked them back to x = 14.2 the moment they arrived
  six thousand metres away. `inDojo` joins the list that lifts it.
- **AND THE RETURN SPOT WAS ON THE CLAMP.** `PORTAL_X + 2.6` is 14.2 and
  `CLIFF_BLOCK_X` is 14.2 — measured — so the first version handed you back
  jammed against the foot of the cliff. It steps back along Z instead.

The portal carries NO light: the glow is two additive shader meshes, because a
PointLight in a far-culling group changes `NUM_POINT_LIGHTS` and recompiles
every material in the game as you walk up to it, which is the pavilion's whole
scar. The dojo carries none either — the moon is directional and reaches
everywhere, and the rest is each material's own map through its emissive.

Measuring any of this in the preview has two traps of its own. The pane cannot
pointer-lock, so `canMove` is false and `keys.KeyW` moves nobody — nudge the
body and let the clamps answer instead. And teleporting to the portal crosses
the MUTANT trigger on the way, so `updateMutantCut` returns true, the whole
creature loop is skipped and the samurai stands there dead-looking with
`struck` set and `hitstop` at zero; the tell is a field of view of 24. Step it
out before measuring anything.

**THE PORTAL'S DISTANCE FROM THE WATER IS NOT A TASTE QUESTION.** It sat at
x = 11.6, tucked under the cliff, and wanted to be further out — but
`shoreLine()` reaches 8.6 and the sand plane discards a metre further seaward,
so anything whose FOOT crosses that is drawn standing on the water (the body
bag's own arithmetic). The base course is 1.57 m across, so the middle may come
to 10.2 and no closer: the platform and the light on it stay dry and only the
seaward stones take the swash, which is what a stone circle on a beach should
look like anyway.

**AND THE PORTAL IS SUNK SO IT CAN STAND FURTHER OUT.** How far out it may go
is a measured number: sampling `shoreLineJS(PORTAL_Z, t)` over an hour of game
time the swash peaks at **8.12** — the corpse's own 8.13, one place further
down the beach — and the sand plane discards seaward of it, so anything
standing proud out there is drawn hanging over open water. At its shipped
height the stone base stood 0.38 m off the sand, which is the body bag's raft
again. Bedded nearly flush (`PORTAL_SINK`, base top 0.10) there is no gap for
the sea to show through, so the swash runs OVER the base instead of under it —
and that buys the two metres: at x = 8.6 the seaward stones and the seaward
third of the base take the surf, which is as far out as it can go and still be
standing on the beach rather than in it.

**AND HE KNOWS WHAT IS IN THE ROOM.** His whole answer to the courtyard was
`pushOutOfDojo` - a shove out of whatever he was already inside, undamped, with
no steering above it, which is a creature that walks into the wall between it
and you and grinds there. He gets what the Dealer and the knight already have:
a nav grid built once off the DRAWN FACES (not the packer's body band - the
keep's lesson, that a band marks a whole half-metre cell full for one lantern
post), `dojoClearAhead` marched in strides so the body's WIDTH is asked at
every step and not only the line between them, `dojoRoute` as a breadth-first
search thinned to its corners, and a push-out capped at a walking pace so a
correction is a lean and never a jump.

**AND TWO WAYS OUT OF THE WORLD, BOTH FOUND BY PLAYING IT RATHER THAN LOOKING
AT IT.** `groundY` in the courtyard was the LARGER of whatever it held and the
room's floor, and where the grid had nothing to say it was left alone - which
eight hundred metres over the sand means the beach's own zero. Measured in a
live fight: knocked onto a cell the packer sampled no floor into, the camera
went from 801.84 to 1.70 and `dojoFloorAt`'s own sixty-metre guard then refused
to answer ever again, so there was no way back. The room owns the floor while
you are in it, it remembers the last good one, and a body below it is put back
on it. And **WHATEVER MOVES THE PLAYER LAST MUST RE-RUN THE ROOM'S CLAMP** -
the bunker's own lesson, which this room never got: `updateDojo` reverts a step
that leaves the walk, and the samurai's KNOCKBACK is applied from
`updateMutant`, which runs after it, so each shove moved the body a little
further out with nothing to answer. Measured over eighty seconds of being hit
thirty-one times, the player was walked twenty-five metres clear of the
courtyard with the boss following him out. `clampPlayerToRoom` speaks for the
dojo now, which is the one door every knockback already goes through; and HE is
walked back onto the grid when he is off it, because outside the model there
are no faces to push off and no floor to stand on.

Measured at the end, hands-off at fighting range over eighty-three seconds:
**76 swings and 73 damage (55 and 53 a minute) at 61 % connect, all four swings
landing - side 14/25, stab 13/18, overhead 12/17, spin 7/16 - worst step
0.141 m, and neither the player nor the boss ever left the courtyard or fell
out of it.** The Dealer is 48 and 40.

**AND THE ROOM'S MEMORY IS SEEDED BY THE THING THAT PUTS YOU IN IT.** The
catch that stops the player falling out of the courtyard reads
`dojoLastFloor`, and nothing set that until a frame had already come back
with a floor. The very first frame in the room is always a bad one —
`placeInDojo` calls `warmDojo()` three lines up, which renders the whole
courtyard several times, so the frame after it is most of a second long and
one step of gravity at that dt puts the feet ten metres under the boards.
Measured: the camera went 801.9 → 301 → 171 and kept going at 130 m/s.
`placeInDojo` knows where it is standing you; it says so.

**AND A DROP THAT ALWAYS POINTS DOWN DOES NOT NEED A RAYCASTER.**
`buildDojoBlocks` cast `Raycaster.intersectObject(dojoWorld, true)` straight
down once per column and once per stone, and three has no spatial index:
measured with a counter, **470 rays at 1.93 ms each — 909 ms of a 978 ms
`dojo blocks` span, inside a 1292 ms `courtyard.glb` freeze** on the frame
the room lands, which is the hitch on the walk up to the portal. The room's
43,571 triangles go into a one-metre (x, z) grid ONCE and a drop is then a
point-in-triangle over the handful in one cell: **978 → 73 ms, and
`courtyard.glb` 1292 → 154.** Two things it has to keep or the rubble
reseats itself — the material's SIDE (three culls back faces, so a downward
ray never meets the underside of a roof) and the old filter's rejects — and
the way to prove it is to run both against each other: **3200 of 3200 sample
points agree, 1280 of them real hits, zero disagreements.** The first guess
was that the build was quadratic because the ray also tested the stones it
was adding; that was real, and worth 23 ms of 1204. **Count the rays before
blaming their targets.**

**THE FOUNTAIN'S POOL WAS A HOLE IN THE FLAGSTONES, AND ITS WATER WAS A LADDER
OF PILLS.** Rendered at last — four angles, in game, at the retro scale — and
both halves of it were wrong in ways that are already written down here:

- **METALNESS IS A TRAP, THE FIFTH TIME, AND THIS TIME ON WATER.** The pool
  shipped at `roughness 0.08, metalness 0.30`, which is a polished near-metal:
  no diffuse term, no environment map in this game, so it can only show what a
  light reflects straight back at the eye. It rendered as a flat BLACK DISC
  with a hard rim and not one of the caustics drawn for it was visible
  anywhere on it. Dark is not black — water at night is a DIELECTRIC that
  keeps its diffuse, takes a broad soft sheen off the moon rather than a
  pinpoint, and lets the caustics and the basin floor under it do the rest.
  `metalness 0, roughness 0.42`, and the opacity comes down with it, because
  the one thing that separates water from a lid is seeing the stone through
  it. (The tunnel's channel is the deliberate exception and says so: a MIRROR
  of a specific light has no diffuse to lose.)
- **AND A VEIL THAT STOPS AT A HAND'S WIDTH LEAVES THE DROPS TO DO THE
  FALLING.** Each tier's sheet was capped at 0.30 m against a bottom tier
  that falls a full metre, so sixty-eight little boxes carried the rest —
  which at 16 mm across is eight pixels on screen, a white BAR, and
  sixty-eight of them is a ladder standing round the fountain. The sheet
  falls the whole way now and the drops are a third as many at half the
  width: they are the sparkle coming off it, not the thing itself.
- **AND WHAT MADE A FULL-HEIGHT TUBE A DRUM WAS NEVER ITS LENGTH, IT IS ITS
  TWO HARD CIRCULAR EDGES** — so the answer is the alpha, not the geometry.
  The first pass faded in at the top and out at the bottom, which puts the
  strongest part of the sheet halfway down and holds it at FULL alpha across
  the whole middle: a milky drum with the carving invisible behind it, the
  same drum wearing the opposite coat. Water leaves a brim as a skin and then
  ACCELERATES, and a sheet that accelerates gets thinner — it peaks just
  under the lip and tapers all the way down, so the pedestal reads through
  the bottom half.
- **AND A DISC OF WATER HAS NO SCALE.** Nine lily pads float in the ring
  outside the bottom tier's overhang, which is the only part of the pool
  anyone sees from standing height. A pad is a circle with a WEDGE out of it
  (`CircleGeometry`'s `thetaLength`) — the notch is the whole silhouette, and
  without it they are coins — one InstancedMesh with a tone per pad
  (`setColorAt`), because a dozen identical greens read as one printed
  pattern. They drift, because a pool fed from the middle turns.

**AND THE LILY PADS WERE NOT THE THING THAT WAS FLOATING.** "The lily pads are
floating above the water" — measured, a pad sits **3.4 mm** over the pool disc,
which is exactly where a pad should be. What was floating was THE WATER.
`FOUNT_POOL_Y` was typed as 0.26; the courtyard scan's own basin has its floor
at **0.127 and its rim topping out at 0.205**, so the disc hung five
centimetres ABOVE THE RIM of the thing it is supposed to be inside — a plate of
water over the whole basin. It is dark and two thirds transparent, so what the
eye took for the bottom was the stone thirteen centimetres below it, and the
pads read as hovering that thirteen centimetres.

The fountain's stone is the SCAN'S, so the only honest source for a water line
is the model. `buildFountain` reads it now: `dojoDropY` (already a one-metre
triangle grid, so this is a few dozen lookups and not one raycast) takes the
floor out in the ring past the bottom tier's overhang, walks outward until the
stone lifts to find the inner face of the rim, and the water goes a few
centimetres over the floor and safely under the rim — 0.143, a 1.65 cm depth,
with the disc's radius cut to 0.73 so its edge dies behind the rim instead of
crossing it. The bottom tier's `to` is resolved against it as well, or the
fall ends in the air above the water. Repack the courtyard and all of it still
lands in the basin. **A height typed for a hand-built prop is a guess the day
that prop is standing in somebody else's mesh.**

**THE FOUNTAIN IS A RECORDING NOW, AND THE RINGS WERE THE SHEET BEING A TUBE.**
Four things in one pass, and the ring is the one worth reading twice.

**"WEIRD RINGS ON THE WATER" IS A COMPLAINT THIS FOUNTAIN HAS DRAWN THREE
TIMES, AND THE FIRST TWO ANSWERS WERE BOTH SOMEWHERE ELSE.** First the drops
were a ladder of white bars and were made small and few; then the sheet's
alpha peaked mid-fall and made a milky drum, and it was re-tapered to peak
under the lip. Rendered with the falls hidden and then with everything BUT the
falls hidden — which is the test neither earlier pass ran — what is left is
still a ring, and it is the one thing both passes took for granted: **THE
SHEET IS A CLOSED TUBE.** A cylinder has two circular edges however its alpha
is tapered, and at eye height a horizontal circle is a LINE drawn across the
fountain. Worse, a continuous curtain of water a metre high and a metre across
is not what a tiered fountain does at all: a worn stone lip spills in a
HANDFUL OF PLACES and is dry between them.

So the sheet keeps its geometry and loses its closed-ness. `fountSpill(ang)` is
the spill weight round the lip — zero over most of it, one down the middle of
each ribbon, with a second harmonic so the ribbons are neither identical nor
evenly spaced — and the vertex alpha is multiplied by it. There is no circular
edge left anywhere, which is the ring gone BY CONSTRUCTION rather than by
tuning. The gaps close a little toward the basin, because a stream leaving a
lip is narrow and is a metre wide by the time it arrives, so it does not read
as a row of pillars either. 26 segments round a lip with gaps in it leaves a
ribbon four facets wide, which is a plank of water; 64.

**AND A ROUND POOL DOES NOT SLIDE, IT TURNS.** Two caustic maps scrolled in x
and y is a straight-line drift, and on a disc fed from a column in the middle
that reads as a conveyor running under the fountain. They are rotated about
the middle at different rates and opposite ways, with a little scroll left on
top so it is not a turntable either — and `center` has to be set to (0.5, 0.5)
first, because a texture rotates about its ORIGIN and the origin of a uv is a
corner.

**AND IT IS DRIVEN FROM `updateDojoAudio`, NOT FROM `updateFountain`.**
`updateFountain` returns on its first line while you are not in the dojo, so
hanging the water's gain off it meant the last thing ever written to that gain
was whatever it held on the frame you left — it only ever went quiet because
`placeBackAtPortal` remembered to ask it to, and any other way out of the room
(a win, a restore, the harness) left a fountain running on the beach.
`updateDojoAudio` is on `animateFrame` and runs whether you are in the room or
not, which is the whole reason the wave bus and the wind are ducked from
there. Measured over the round trip: 0.139 at the rim, and after leaving
0.0086 / 0 / 0 / 0 at 0.5, 1.5, 3 and 6 s, with the nature bed at 0.00006 and
the sea and the wind fully back.

**AND THE DOJO'S ROCKS FLOATED BECAUSE THE FIT IS CAPPED AFTER THE SEAT IS
CHOSEN.** Every height in the heap — the bed the ray found, the course
spacing, the crown, the line the coping cuts at — is written against `r * sy`,
the half-height the old generated blob had, and the mossy pack's rocks are
fitted to exactly that. But the line under it CAPS the scale so a slab lying
flat cannot be blown up into a table, and a capped stone is SHORTER than the
height its seat was worked out for: its centre stays where the plan put it and
its bottom rises by the difference — on a wide flat one, most of half a metre
of daylight under a boulder. **A seat is the BOTTOM, not the middle**: the
stone is lowered by whatever the fit lost, so a shape the cap has shrunk beds
into the pile instead of hanging over it. The bottom course is bedded by its
OWN size too, rather than by a flat 0.26 over the ground, which buries a
half-metre stone to its waist and left a hand of air under a small one.
Measured over the courtyard's 794 stones, each against the drawn ground AND
against every other stone: **0 floating**.

**AND THE FOUNTAIN'S RECORDING COULD BE LOCKED OUT BY ITS OWN FALLBACK.**
`startFountainAudio` is called the first frame the water is loud enough to be
worth building, and if the m4a has not come off the network by then it falls
through to the synthesised bed and sets `fountAudio` — which nothing ever
looked at again. So whether you heard the owner's own fountain or a bandpassed
noise bed for the rest of that session was decided by whether one small
download had landed at the moment you first walked within sixteen metres of
it, and a cut into the room from the portal is exactly the case where it has
not. `upgradeFountainRec` swaps it the moment the buffer is there. **A
fallback is for a few frames, not for a playthrough.**

**AND THE COURTYARD HAD THREE AMBIENCES COMPETING TO BE THE SOUND OF A ROOM
THAT HAS ONE.** The beach's surf and wind were already ducked to nothing from
`updateDojoAudio`; what was still playing over the recording was the room's
OWN bed — a nature layer at 0.16, a bird every few seconds and an insect trill
every ten. The bed is kept at a whisper (silence is an absence, not an
ambience — the hall paid for that) and the birds and crickets are gone.
Measured standing at the fountain: wave 0, wind 0, nature 0.020, fountain
0.114 with `fountRec` true.

**THE DOJO WEARS THE BEACH'S SKY.** `DOJO_MOON`, the beach sky dome moved to
the camera in the courtyard (and excluded from the hall cull), clouds, the
shafts (`dojoRays`: the moon cold, the nearest lantern warm through
`uRay2Col`/`uRay2T`), ground mist at the courtyard's height, lightning,
drifting petals (`buildDojoPetals`), and the lanterns at `DOJO_LAMP_I` 22 over
17 m with a core, a sprite and a halo each and `lpAlways` 30 so they keep a
pool slot from anywhere in the yard. The dome drawn with the model discards
above its own ground band.

**THE DOJO HAS ITS OWN NIGHT** (`makeDojoSky`, `updateDojoSky` from
`animateFrame`, which hides the beach's sky there): ink zenith → plum →
crimson horizon, a 3° ivory moon at `DOJO_MOON` with a thin red corona, and
clouds as stepped bands (fbm projected `d.xz / (el + 0.30)` stretched 1.1 x
3.0 — near the zenith a flatter projection samples one noise cell and the
whole top of the sky came out empty) with a lit line where each tone meets
the next, and the courtyard's fog takes 55 % of 0x2a0c14 while you are there.

**ONE CLOCK DRIVES THE MOON (`dojoPeek`, `DOJO_SKY_U.uPeek`).** Two slow sines
that do not divide say how far the cloud has opened off the moon; the sky
thins its cloud there, `dojoLightsTick` brightens the moon directional
(re-aimed at `DOJO_MOON`, ambient and hemisphere up, all restored on the way
out), the shafts through the mist (four cones in `dojoAtmos`, fading with
`uPeek`) come up, and the screen-space rays with them — the moon coming out is
one event. The atmosphere (`buildDojoAtmos`/`updateDojoAtmos`): 44 torn smoke
sheets of low mist (normal blending, warm near a lantern, thinned near the
eye), 70 red maple leaves riding gusts (drawn as five soft lobes — sharp
lobes read as red stars in the sky), 180 moonlit petals, ground mist 0.50
(was 0.20), lanterns 34 over 21 m. **The fountain's white rectangles** were
its fall sheets: unlit white at full alpha under the lip, a ring of flat
facets — they are a faint cold grey now, fading in over the top 30 %.

**THE SAMURAI'S KICKS WERE HALF A METRE SHORT.** `sStab` and `sSpin` are kicks
(limbs 1 and 2 are legs), and a leg is not aim-corrected, so at his 1.3-1.4 m
stopping distance the toe finished 0.50-0.67 m from your body on the frame the
damage landed. Per-swing `stop` (1.0 for the kicks, 1.36 for the overhead)
puts them on you: measured, kicks 0.02-0.06 m, cuts 0.04-0.19 m. Harder: 70
hp, poise 15, guard 0.62, quicker and keener, a harder second wind — 71 swings
and 83 damage a minute against 64 and 60. His glowing eyes are out.

**THE FOUNTAIN'S WHITE RECTANGLES WERE THE FALL SHEETS, AND ONLY A RUNNING FRAME
SHOWS THEM.** Three rounds tuned the sheets (dimmer, fainter, ribbons, a fade in
at the lip) against stills rendered with `renderer.render` alone, and in those
stills they were faint. Captured with the loop running (`__cap`, which calls
`__bw.frame`), the top of every sheet drew as a ring of bright white-blue
rectangles round each lip; hiding the three meshes removed them. The sheets and
the drops (5 cm boxes, the same complaint at arm's length) are built and never
added. The basin keeps its water, pads and caustics; the recording carries the
fall. **Judge anything that animates from a running frame.**

**A HIT YOU CANNOT SEE IS A HIT THAT DID NOT LOOK LIKE ONE.** The samurai's
cuts measured 0.2-0.5 m from the chest at the contact frame and the owner
said they did not look like they hit him — both true. `aimBar` aims at your
chest, 0.45 m under your eye, and from the eye a blade at chest height a
stride away is under the bottom of the frame: captured from the player's own
view (`__samPOV` in `tools/samstrip.js`), the blade at contact was at his waist
and out of the picture. `kind.aimDrop` (0.18 for him) aims a kind higher, so a
man half a metre taller than you cuts across the lower middle of the screen.
**Judge a creature's blows from the player's eye, not from a side camera.**
And `aimK` went back down to 2.2 from 3.3: it turns his upper arm, which on
this Rigify forest is a root apart from the shoulder guard, and at that much
turn the collar and neck stretched on the wide cuts. The deep squat
(`gCutE`) and the floor slide (`gSlide`) are out of his draw as goofy; his own
four are `ease`d, crossfades are 0.34 s, and the cuts chain third slash →
fourth → side cut → third, so an exchange is a flow and not a list.

**THE BEACH'S SKY CAME BACK BLACK FROM THE DOJO.** `updateDojoSky` hid it on
the way in and nothing put it back; every other room saves and restores it.

**THE SAMURAI'S FIGHT HAS NO MUSIC.** A looped "8 bit samurai fight" track was built and removed on the owner's word, asset and all. Do not put it back.

**THE DOJO POURS, AND ITS STONE IS WET** (`dojoDownpour`, `dojoSplashFx`,
`dojoWet`, after `updateDojoRain`). 5,200 one-pixel streaks wrapped round the
camera (the squall's arrangement), a few thousand splashes a second on
`dojoFloorAt`, a rain bed on the SFX bus (`dojoRainSound`, under 1.5 kHz), and
`dojoWetMat` chained onto every lit material under `dojoWorld` (not the sword):
up-facing surfaces darker and smoother, puddles from noise that are near
mirrors, rain rings in the normal, a sky fresnel and a moon glint
(`DOJO_WET_U`). The normal is from `dFdx/dFdy` because the packed courtyard
has none.

**THE SAMURAI HOLDS THE SWORD IN BOTH HANDS** (`samTwoHand`, after
`pinSamuraiSword`). A two-bone IK (`samIK2`) puts his left wrist
`SAM_GRIP_GAP` down the tsuka from the right every frame except the star
throw; between swings (`st.atk < 0`, no reel, roar or hold) his right fist is
also put a forearm in front of his navel with the point turned onto your
throat (chudan), eased in and out so each cut leaves from it. The targets are
absolute, so a frame the mixer did not restamp cannot accumulate.


**THE SAMURAI DOES NOT POP (`samSmoothPose`, `SAM_SMOOTH_T`).** Measured over
thirty seconds of fighting, his head moved up to 0.87 m relative to his own
body in one frame (99th percentile 0.23) — against 0.023 for any of his clips
played straight. Not the clips, not the aim (aim off changed nothing): the
MIXER. A swing chained into the SAME swing restarts the one action at time 0
and weight 0, so the pose he was in (the cut's end, 0.89 of him) vanished in a
frame and the idle and the bind pose filled the gap; a swing out of a stride
dropped the run the same way. A crossfade cannot fade an action into itself.
His body is now inertialized after every other layer (after `samTwoHand`):
on a clip, swing or swing-clock change, or a hip/spine/thigh turn over 0.5 rad
in a frame (raw pose against raw pose — arms are left out, a cut turns them
0.3-0.7 rad a frame by design), each bone's offset from what was drawn last
frame is taken and decays over 0.2 s; the sword is re-pinned after. Measured:
head 99th 0.079 / max 0.107, hand speed intact (95th 10.7 m/s), 2.6 triggers
a second. **Trap:** testing the jump against the SHOWN pose retriggers every
frame (31 a second) and damps his swings to 1.5 m/s.

**HIS LUNGES EASE (`kind.smoothMove`).** The lunge, the step back and the
chained step-in switch on and off at full speed (0 → 6.2 m/s in a frame); a
kind with `smoothMove` filters that motion (~70 ms) and resets it per swing.

**AND A STRING LEAVES AN OPENING (`kind.opening`, 0.85 s; 0.6 in his rage).**
When a string ends without chaining he starts no swing and does not guard for
that long (`st.openT`): his string, your answer. 46 swings and 46 damage a
minute hands-off (56 before).

**THE SAMURAI'S SWORD WAS IN HIS CHEST AT A RUN (`samTwoHand`, `samClear`,
`samKeepClear`, `aimCone`).** His run leans him 45 degrees, and the chudan
guard was placed LEVEL in front of his navel, so the chest came down over it:
fists 0.15-0.21 m off the line hips → neck (in the armour) and the blade
through him. And the run clip carries the katana ONE-handed (right fist at
the breast, blade up past the shoulder), so the left hand IK'd onto that grip
went straight-armed across his chest. Now: at a run (`u.clips.run`/`run2`)
the guard and the left grip ease off and the clip has both arms; the guard is
placed in his own frame (square to the torso, `SAM_GUARD_OUT` 0.46) with the
elbows given a pole (down along him, a little out — `samIK2(…, pole, w)`).
**Trap: the pole was first passed in `_skV`, which `samIK2` uses as scratch —
the elbow went wherever the solve's last vector pointed (a locked-straight
arm).** No fist comes nearer his core than `SAM_CLEAR` 0.30: pushed out of
his FRONT, not radially (radially, a clip carrying a fist across his middle
flipped it to his other side — a 0.98 m one-frame jump); the blade is turned
out about the grip if any of it is within `SAM_BLADE_CLEAR` 0.24 (radially —
steel down his back must stay behind him). `samKeepClear` runs AFTER
`samSmoothPose` (the smoother's blends carried fists back through his belly)
and writes the cleared pose into the smoother's `lastQ/lastP`.
The chop (`gChop`) threw his hands behind his back for six frames at the
strike and laid the blade through his chest: `aimBar` was turning his
shoulder 64 degrees toward you while the blade pointed 100-135 degrees AWAY
(two near-opposite directions — the turn's axis is arbitrary). `aimCone`
[1.20, 1.75] on that swing fades the correction outside 69-100 degrees,
eased (`u.aimConeK`, rate 8; stepped, it made flicks). Measured, 2 min of
fight: fists >= 0.26 m, blade >= 0.23 m off his core everywhere; contacts
median 0.23-0.31 m / max 0.45-0.55; damage 30 a minute (29 before);
one-frame flicks 0.7-3.3 a minute against 4.7 with the two-hand layer off.
**Tried and dropped: the cone on every swing** (gCutC needs the whole
correction — it scored with the steel a metre off) **and a release after the
contact** (flicks 5.0 a minute against 2.0). **The chop never landed**: at its
contact window the blade was still 1.1-1.4 m off you and only came down
after it — 0 of 47, with or without the cone. It was the timing AND the
reach: the contact is clip 0.82 now (where the blade comes down in front of
him; at 0.40 it is still up behind his shoulder), the cock the same pose
(clip 0.192, so `cock` 0.234) with the longer strike at `clipRate` 1.7 —
a 0.26 s draw, then the raise over his shoulder accelerating into the cut,
the whole wind-up still 0.76 s — and `stop` 1.05, because at the contact
his arm-to-tip is about a metre and from 1.45 the tip stopped 0.7 m short
at any timing (hit 0.78 at stop 1.45: 0 of 20; stop 1.25: 0 of 18; 1.05:
16 of 16). Measured, chops forced and pinned: steel 0.24 m median, 0.43 max.
Harness: `tools/samrun.js` (`__samRunBoot`, `__samRun` stills from beside
him with `__samSolo`/`__samGain`, `__samSwing`, `__samClear`, `__samFlicks`,
`__samRaw` the clip alone, `__samContact`).

**THE SAMURAI'S POPS WERE FIVE BUGS, AND THE BIGGEST WAS IN `mutPlay`.**
Measured hands-off with `tools/samsmooth.js` (`__samLayers`: every one-frame
jump of a fist or the head relative to his hips, with how far each post-mixer
layer had carried it — `mut` / `two` / `smooth` / `clear`, via the
`window.__samDbg` hooks in `update()`): 85 jumps over 0.45 m in 6000 frames
before, fists up to 1.07 m in a frame and the head 0.30. After: 5, the worst
fist frame is the strike's own speed (99.9th percentile 0.34-0.39 m), the head
0.22, and 33 hits / 41 damage a minute against 33 / 34 before (the overhead
lands now). In the order they were found:

- **The swing clock had velocity steps** (`kind.fluid` → `A.fluid`, a branch
  in `mutClipTime`). The draw left the guard at 2-3x the clip's speed, the
  strike hit 1.55x its average at contact, and the great-sword cuts then played
  1.2 s of follow-through in 0.45 s (2.4-2.7x) and stopped dead. Fluid: the draw
  is a smoothstep, the strike `pow(sw, 1.35)` out of the hold, and the
  follow-through LEAVES the contact at the strike's speed and decelerates to
  rest (cubic ease-out), playing as much of the clip as that carries.
- **`fadeOut()` restarts at weight 1** — see `creatures.md`. Seven locomotion
  clips at 0.35 each under a swing at 0.65.
- **A three-way crossfade flips a quaternion.** Slerp-accumulating idle + new
  swing + fading last swing turned his upper arm 157 degrees in ONE frame. His
  `fade` is 0.001 now: the mixer cuts, and `samSmoothPose` (0.28 s, every bone
  watched, arms at 1.1 rad) blends every switch from the pose actually drawn,
  carrying last frame's motion on one frame (capped 0.12 rad a bone — a chain
  compounds it) so a switch does not freeze him for a frame. **The cut must be
  inside one frame**: at 0.06 s the rest of the switch was drawn raw.
- **The smoother's offset outlived its frame.** `PropertyMixer.apply` skips a
  bone whose blended value has not changed since its last write, so a bone the
  clip did not move (a scrubbed swing; a channel with no track — his side-steps
  key only the hips' position) started the next frame holding what was DRAWN,
  and the offset was added again: a left hand went six metres. The mixer is
  wrapped (outermost, on the smoother's first frame, so the life layer's own
  restore still runs inside it) to put every bone back on the pre-smoother pose
  first. **Forcing the mixer to rewrite EVERY bone was tried and is wrong**: the
  layers under the smoother (the aim, the grip) rely on that carry-over, and
  his great-sword cut went from 10 of 10 landing to 0 of 10.
- **The fist push flipped him through himself.** `samClear` pushed a fist out
  of his FRONT, so one entering from behind (the smoother carrying it to the
  run's arm swing) crossed his body in a frame. With `mem` it goes out the side
  it came in, following the fist round a little a frame. The push runs before
  AND after the smoother on poses that disagree, so each pass has its own
  memory (`memR0`/`memL0` in `samTwoHand`, `memR`/`memL` in `samKeepClear`) —
  one shared memory was pulled both ways every frame. And `samKeepClear`
  re-grips the left hand EVERY frame it is gripping; "only when the right one
  moved" toggled it 0.21 → 0.54 m.

Also: blows are tested on the pose DRAWN last frame (`drawnPos` /
`recordDrawn`, in his own frame so a lunge does not leave it behind), because
the grip, the smoother and the push all move his arms after the test. And the
overhead (`sDown`) fell 0.42 m SHORT from its 1.36 m stop on every throw —
0 of 14, in the shipped build too (`__samOnly('sDown', N, stop)` reports
fwd / side / up of the nearest approach). At 1.05 it lands 13 of 13. gCutD's
stop was tried at 1.15 and put back: at that range the aim fought the cut and
the fists flicked out and back on the contact frame, 10.8 a minute.
**Measure every change to his limbs against hits as well as smoothness** — the
first clean version was smooth and landed half as often.

**HE MOVES LIKE THE CAPTURE NOW (2026-10-13; "his body and arms … look very weird
and unnatural but the fight is good").** Patched after `MUT_KINDS.samurai`: the
mocap cuts (`gCutC`, `gCutD`, `sDown`, `sSide`) at `clipRate` 1.08 (were
1.25–1.40, ~1.45x overall with four fifths of each follow-through dropped) with
+0.25 s recovery so the follow-through plays; `gChop` 1.25 (+0.2); the kicks
`noAim` (the aim could turn his STANDING thigh) at 1.05; `aimK` 1.4 → 0.8,
`yawK` 1.6 → 0.6 (the whole model yawed up to 64° — feet swivelling), `aimFrom`
0.72; `stagger` as `hit`/`hitBig`/`stunClip` (he had none, so a parry froze his
swing for the whole stun); `anim.lean` 0. Wind-ups untouched. **Measured with
`tools/contact.js` (`__contact`, 40 s standing still): 22 blows landed, the
blade 0.25 m median / 0.44 max from you** — the hits still connect.

**HE STANDS UP IN HIS GUARD (2026-10-14, the owner: "his arms fold in and his
neck stretches weird … dont change the fight only looks").** Filmed from
beside him with `tools/samrun.js` (frames picked where `samIK.g` > 0.8):
mid-cut he stands well; in the guard (idle, strafes, walk) the stance clips
stoop him ~30° with the head out in front, and the guard held both fists at
the belly, elbows in. `kind.postClip(u, saved)` — a new hook in
`installLife`'s mixer wrap, after `lifeApply` and BEFORE the `forestFK` roots
are carried (so shoulders and arms follow and the collar does not stretch) —
runs `samUpright`: weighted by `samIK.g` (which eases out as a cut starts),
`SAM_UPRIGHT` 0.55 of the hips→spine004 lean taken out at `DEF-spine001`,
`SAM_HEAD_UP` 0.6 of the head's lean at `DEF-spine005`; pushed on `saved` so
the next clip pass starts clean. Guard: `SAM_GUARD_OUT` 0.46 → 0.60, the fist
0.62 of the way navel → chest (was 0.35), elbow poles ±0.85 out (were 0.5).
Fight measured hands-off after: 22.5 swings and 40.5 damage a minute, every
swing type thrown.

## THE SAMURAI "FOLDING IN" WAS HIS FOREST ROOTS CARRIED AT THE BIND POSE (2026-10-14, round 3)
"His neck and arms are still moving all weird … it looks even worse now." Measured over 1,200 fight
frames (`tools/samform.js`, `__samMeasure`): the upper arm came to 0.09 m from the base of his neck and
the elbow to 0.04 m off his spine line; the clips alone (`mixer.rawUpdate`, `window.__samRaw = true`
turns the post-mixer layers off) keep them 0.21+ and 0.23+. Cause: `installLife` read the `forestFK`
offsets at install, before any clip had stamped the rig — the BIND pose — and every one of his own clips
has the upper arm (0.07, 0.50, -0.07) off its shoulder where the bind has (-0.28, 0.38, -0.20); shoulders
and breast plates 0.14 m back. Carried there every frame, the arms were dragged into his chest. The
offsets are now re-read once off a raw stamp of the idle (`fkIdle`, the same save/stamp/restore as
`pinSamuraiSword`'s grip). After: shoulders 0.28-0.37 m from the neck base, elbows 0.41-0.71 m off the
spine, no elbow under 40°; the fight unchanged (23 swings, 44 damage a minute). Round H's `samUpright`
(straightening the stoop) and its guard changes (fists out 0.60, lerp 0.62, poles ±0.85) are reverted: the
straightening turned his spine under roots that kept the clip's turn, and was worse.

## His arms between the cuts (2026-10-14, "his arms look too stiff sometimes")
Measured per frame: in every swing both elbows move, but the walk clip holds them at one angle for the whole
stride (L 108°, R 78°, 44-frame runs) — the take carries the sword in a fixed hold. `samArmLife` (the kind's
`postClip`, in the clip pass so the forest roots carry it): between swings only (weight eases to 0 the moment
`st.atk >= 0`), the upper arms swing about his right in time with the gait clip (two strokes a clip) and the
forearms after them, smaller when he stands (a breath). After: no held-elbow runs in 1,500 frames; walk L
92–135°, R 78–86°. The fight sample: 18 swings / 49 damage a minute (sampling noise against 23 / 44: nothing
here touches the AI or the blows).

**Three jars come off the samurai (2026-10-16):** `samuraiJars()` on the frame `dojoWon` goes true — round where he
fell, each on `bunkerFloorAt` (his feet's height if none), and the octopus ring's sting. `dojoWon` is on the save, so
a restore never drops them again. Measured: three jars at 800.22 with him at 800.20.

**THE SAMURAI'S FIGHT HAS A SCORE AGAIN (2026-10-17).** The owner, with "5450 score.mp3": "add this to the samurai fight
make it start as soon as it says 'thats my sword'". (The note above is about the old 8-bit loop; this is a different
track, asked for by name.) `assets/samurai-score.m4a` (afconvert AAC 160 kbps, 2.65 MB, 149.8 s, sound from its first
sample). `startSamScore()` in `wakeSamurai` beside the line (not on a replay or restore); `updateSamScore()` from the top
of `updateDojo`: fetched the moment you are in the dojo (`lazyBuf`), started late if it was still on its way, looped
with each pass crossfaded 1.5 s into the next (the file ends on a full bar), faded out over 5 s when he falls, 1.2 s
when you do, 1.5 s when you leave. On the music slider through its own gain (`samScoreVol`, in `applySettings`) at
`SAM_SCORE_LEVEL` 0.26 (then 0.55, the owner: "turn up the samurai music", about 6.5 dB up) — the file is mastered at −9.1 dBFS RMS against the wreck theme's −16.4 and the passing theme's
−20.5, so 0.26 puts it about 3 dB over them. Harness: `__bw.samScoreS()`.

**THE SCORE SWAPPED FOR THE "5450 FIX" MIX (2026-10-17).** The owner: "switch the samurai fight music with this" ("5450 FIX.mp3", 320 kbps). Same file name (`assets/samurai-score.m4a`, afconvert AAC 160 kbps, 3.06 MB, 149.8 s, the same length and so the same loop point). This mix is 3.5 dB quieter than the first (ffmpeg volumedetect mean −15.5 dB against −12.0), so `SAM_SCORE_LEVEL` went 0.55 → 0.82 to keep the loudness the owner had asked for.
Then "make the samurai fight audio louder": `SAM_SCORE_LEVEL` 0.82 → 1.64 (+6 dB). `samScoreVol` goes straight to `ctx.destination` (no limiter) and the file peaks at −2 dBFS, so the gain is capped at `SAM_SCORE_MAX` 1.2 — it only bites when volume × music is above ~0.73 (the owner's defaults, 0.5 × 0.25, give 0.205).
**THE PORTAL WAITS FOR HIS JARS (2026-10-18, "WAIT UNTIL THE JARS ARE GRABBED").** `samuraiJars` keeps its three
(`samJars`); the `DOJO_QUIET` count starts when the last is picked up.

## 2026-10-18 — the rain louder
`dojoRainSound`: 0.30 → 0.42 of the dojo mix (+3 dB), the owner: "MAKE THE RAIN A LITTLE LOUDER IN SAMURAI FIGHT".
