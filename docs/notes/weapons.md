# Weapons, the view model and swings

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**The blade's DIRECTION is locked at commit, its ORIGIN is not.** Both used
to be, and at a run you had moved two metres past the point by the time the
blade fell, so the crater opened at your heels.

**The blade lands ON the crosshair.** The poses put the blade at a fixed
spot in the lower right whatever you were aiming at, so a swing at the crab
or a crater four metres out finished with the shovel a hand's width from it
and the hit happening somewhere else. The crosshair is fixed, so anything
the swing meets is at the centre of the screen, and the blade has to be
there too. `aimLand()` finds what the ray will meet when you commit — the
same things `digImpact()` tests, in the same order — and `landBlade()` in
`updateViewmodel()` translates the whole rig each frame so the middle of
the blade's lip sits on that point's screen position (projected by the
main camera, unprojected by `vmCamera` at the lip's own depth, so the two
cameras' FOVs never have to agree). The correction is measured off the
UNCORRECTED pose every frame, so it never feeds back; the weight follows
the strike's own easing in, holds through the impact and the hitstop, and
eases off in the recovery. THE SWING GOES WHERE YOU LOOK: with nothing in
reach the point is on the aim line itself, an arm's length out (`SWING_AIR`),
so the blade passes through the crosshair whatever the pitch — it used to
land at your feet, which dragged every swing made looking up down into the
sand, and the owner looked straight up and still dug. A swing that meets
nothing is a whiff now, not a scuff: no crater, a little jar, and that is
all. The target is clamped to the frame so the blade never leaves it.

**A click is quick.** The light swing is 0.44 s end to end and the blade
is down 200 ms after the press (`DIG_DUR * (0.55 + P)`); a heavy is nearly
three times that. It was 370 ms, which is long enough to feel like the
game thinking about it.

**The swing lands where you aimed when you committed it.** `startDig()`
captures the camera ray into `_aimO/_aimD`, and `digImpact()`, `crateStrike()`
and `glassStrike()` all use `aimRay()` — never the live camera — because the
blade lands 130–370 ms after the click or the release, and by then you have
looked somewhere else. The crab is a ray-to-body test now (aim line within
0.62 m + 0.25 P of its centre), not "any impact within 1.5 m": at 3.2 m on a
heavy you could kill it looking at the sand beside it. `hitConnect(P, k)` is
the confirm on anything solid — a FOV punch that eases back through
`updateDialogCam()`, trauma, a blade jar, a beat of hitstop, `sfxConnect()` —
and `flashMats()` turns the struck thing white for the frozen frames. Sand
gets none of it; sand is not a hit.

**The Military Shovel is a scan, and there is ONE shovel in hand.**
howittworks' "Survival Shovel" (`assets/military-shovel.glb`, through
`gltfpack.py` at 2048 with its normal and metal-rough maps kept — 1.8 MB
because looking like the photograph is the point). It is a second dig
item: `onDig` plus its own `lip`, and `toggleEquip()` points `toolVM` at
whichever dig tool is equipped and re-hangs `trailTip`/`trailRoot` at that
tool's lip — the dig, trail, overhead roll and hit flash all name `toolVM`
now, never `shovelVM`. `orientMil()` puts the scan (95 cm down model X, in
cm, a Z-up root matrix) into the sand shovel's frame with one rotation
matrix and a 0.25 lift, so every pose holds untouched. **WHICH END IS THE
BLADE:** the wide flat thin part at model -X is the D-HANDLE — a loop of
steel is flat; the blade is the wide part at +X that sits OFFSET in the
thin axis, a dished plate bent off the shaft line. The first build took the
flat end for the blade and the tool hung upside down, striking with the
grip. The matrix's rows are x = -Lz, y = -Lx, z = +Ly: blade down, plate on
the -Z scoop side. **And no night lift on it at all** — olive drab under
any gamma lift read as highlighted; the map is multiplied DOWN (0x8e918a),
roughness 1, metalness 0.12. **The "lit up" look was the GLINT.** `clone(true)`
shares materials, and `addItemShine` lifts the emissive of every material
under the beach copy every frame — so the copy in the hand and the pack
icon glowed a flat blue-grey with it, and no amount of material tuning
touched it. `orientMil()` clones the materials per copy now, and
`addItemShine` takes `lift` (0.25 here) because a dark textured scan is
swamped by the stock lift. If a scan ever reads as a flat grey cut-out,
read its `emissive` before touching anything else. The scoop faces the
dirt in the hand: rows x = +Lz, y = -Lx, z = -Ly. The Military Shovel
plays its steel block on every block AND under the parry ring. Three
groups, because the scan lands over the network: the hand's, the
examine/drop copy, the one on the beach past the drain. Its placement
must not read `DRAIN_X` — declared thousands of lines later. Three
owner-supplied impacts hang off the two tools: a paint can is the sand
shovel's block (`blockSand`), a solid metal hit is the Military Shovel's
block (`blockMil`, both in `blockCrab`) and another is its heavy landing
(`milHeavy`, in `hitConnect` at P ≥ 0.5), and two more are its LIGHT hit
on a crab (`milLight`, in `digImpact`'s crab branch, one of the two at
random); none is redistributable.

**The shovel is built to a photograph of a plastic beach shovel.**
`makeShovel()` is a triangular loop handle with finger scallops along the
grip, a round shaft swelling into a socket, and a scoop that is a real
TROUGH — a parametric sheet (`sheet(u, v)`: rims curling toward the open
-Z face, a back wall at the neck, a shallow bow along the length)
thickened into ONE closed shell — outer face, inner face and a strip round
the edge in a single indexed geometry, so the smoothed normals run over
the rim and it reads as a moulded lip. The first build drew the sheet
twice with a tube glued round the edge and the seam showed at every
angle. The old one before that was five boxes and a torus. Smooth-shaded,
like the other hero props, with a little clearcoat. **The shaft is on the
BACK** (`BK`, +Z): the socket, rib, shaft and handle all sit behind the
back wall, so from the open face you see the trough and not a shaft lying
in the bowl — which is how it first came out, and which is a shovel you
cannot dig with. It keeps the old footprint exactly — shaft
0 → 0.6, grip at 0.66, blade 0.02 → -0.21, ±0.1 wide, scoop facing -Z —
so the view-model pose, the trail markers at the lip and the world
placement all hold. If you change the blade's extent, move `trailTip` /
`trailRoot` with it.

**AND A DISTRIBUTED ROTATION CURLS A TAIL; IT DOES NOT SWING IT.** Three builds
of the slam went wrong on this one idea. Per-segment angles came first — 22
bones at 0.6 rad each is nearly two full turns, so the tail wound into a
spiral and then UNWOUND, which on screen is the tail extending backwards away
from the thing it is meant to hit. Normalising the parameters to total radians
fixed the spiral and not the slam: measured, the tip fell one metre and never
came near the front, because rotation spread along a chain bends it in place.
A whip is swung from the BASE. `tail()` now takes `swing` (weighted to the
first third), `curl` (even) and `tip` (weighted to the end) as three different
motions, and the tip travels seven metres instead of one.

**A SWING'S CONTACT IS NOT THE END OF ITS WIND-UP.** The first attacks put
`hit` where the cock finished, so the game's startup ended with the limb drawn
all the way BACK and the damage landed on the frame the creature was least
extended. Every attack is three keyposes and three lerps now — the shovel
swing's own shape — with `hit` the fraction at which the contact pose is
reached. The build then CHECKS it (the striking part should be near its own
extreme within a couple of frames) and prints `<-- CHECK` when a pose has been
edited and the declared contact no longer matches. That check earned its place
three times over: it caught the swipe raking backwards, it caught the bite
measured on the jaw (which goes forward when the mouth OPENS, so track the
head), and it caught `surge` being written as +Y when the creature faces -Y —
the bite drew its head back on the strike and lunged on the wind-up, and the
report was simply "furthest forward at frame 1".

**AND THE CONTACT METRIC HAS TO SUIT THE SWING.** Three different answers,
all in the same two files: a LUNGE is measured where the head is furthest
forward; a SLAM where it is lowest AFTER it was highest (peak speed reported
frame 3 of the beast's slam, because the fastest the head ever moves in that
clip is the rear-up); and a RAKE where it is fastest, because a horizontal
sweep has no extreme of position at all. "Furthest forward" was tried on the
reptilian's rake and reported frame 3 of a swing that lands at 14 — the
crouched stance already carries both claws out in front, so the frame at which
the striking hand is furthest along -Y is the REST pose.

**AND THEN THE SWINGS WERE NOT PLAYING AT ALL.** "The hit animations look
stiff" was not a quality problem, it was an absence: `mutAnim` starts an
attack with `mutPlay(u, u.st.swing)` — the ATTACK KEY out of `MUT_ATTACKS`,
not a clip name — so a kind whose swings are called `rLight` and `rHeavy`
while its clips are called `light` and `heavy` resolves nothing, `mutPlay`
returns undefined, and the creature GOES ON PLAYING WHATEVER IT WAS. Measured
in the game: `swing: rLight`, `atk: 0.32`, `clip: run`. All three reptilians
sprinted at the player through every wind-up and every strike, with no
telegraph and nothing to read, and the damage still landed on the frame the
table said. `kind.alias` is where the mapping goes and all three creatures
were missing it — **the warden has had this bug since the day it went in**,
which is most of why its attacks never read either.

**AND A JOINT THAT MOVES ON THE SAME CLOCK AS EVERY OTHER JOINT IS A DOLL.**
With the clips finally playing, the reptilian's own swings were stiff for the
reason the Dealer's packer already names: one number drove the hips, the
chest, the shoulder, the elbow and the head, so they started together, crossed
together and stopped together. The body is brought FORWARD instead of the arm
being dragged back (`lead`, not `drag`) — because the contact fraction of
these attacks is measured on the striking hand and the build checks it, so
lagging the hand would move the blow off the frame the game deals damage on.
Hips first, chest next, hand last, and the claw carries past its stop and
settles back through it. The swings also gained the thing that makes a blow
read as having weight at all: FOOTWORK. The light loads onto the back foot,
turns the hips through and drives onto the front one; the heavy rises onto its
toes at the top and lands with the knees taking it.

**A BOLT IS A SWING FROM FURTHER OFF, AND THE GUARD ANSWERS IT.** Held, a
drone's bolt is STOPPED on the guard at a cost to the bar (`blockBolt`);
raised on the beat it is PARRIED (`parryBolt`) and goes back — steered onto
the drone that fired it (a saucer moves a metre in the time the bolt takes to
cross the room, and a riposte that misses is not one), for two of its three
points, and the drone is knocked out of the air into a swoop, which is the
stun a parry buys off everything else here in the one form a flying thing
can be stunned. The guard only covers what it faces: the bolt's line has to
be coming at the camera's forward. Same fifth-of-a-second window, from the
press. A returned bolt is stopped by nothing — not a wreck, not the player —
and the bolt carries `src`, the drone that fired it. Measured: parried at
1.6 m, drone 3 → 1 and swooping; held early, absorbed at 0.29 of the bar.

**A CHARGE IS A BUTTON HELD, AND A REFUSED WIND RETRIES.** "My weapon gets
stuck charging a heavy" was two things. `startWind` REFUSES while a swing
is in the air, and the latch gave up on the first no — so a button held
through a light cut charged nothing until it was let go and pressed again.
The latch tries again every 45 ms for as long as `windHeld`. And a
pointer-up that never arrives (the lock going to a banner, a press ending
off the canvas) left the haul pose up; the guard learned this first, and
the wind now reads `e.buttons` bit 1 off every move and is released when
the button is not there. Measured: a button held through a swing lands a
full heavy on release; a wind at 0.87 s with no button under it is
released into a swing on the next move.

**AND HE IS QUICK NOW, WITH A CHARGE.** "His animations are way too slow":
gaits at 1.5x, `windK` 0.80 (every startup and recovery a fifth shorter —
the shortest tell is 0.26 s against a 0.20 s parry window), `speedK` 1.62,
`aggr` 3.7, four-deep chains, more feints, and `sRush`: the `rush` clip as
the beast's own charge, a `minDist` swing that crosses five and a half
metres through the strike and chains into the swipe, so backing off buys
a charge and not a breather. Measured: 17 swings and 16 damage in thirty
seconds on a player standing at reach; from range the charge comes.

**THE ELDEN RING KATANA SET CANNOT BE USED, AND ITS TIMINGS CAN.** The owner
supplied an MCO/SCAR Skyrim mod — 168 `.hkx`, Havok 2010 packfiles holding
`hkaSplineCompressedAnimation`. Two things kill the pose data and the second is
fatal on its own: it is spline-compressed (a decompressor is days of
bit-unpacking), and THE ARCHIVE SHIPS NO SKELETON, so the tracks are bare
indices into Skyrim's bone list with nothing to map them to — and even decoded
they would need retargeting onto Rigify. What IS readable is the ANNOTATION
TRACK, in plain text: `preHitFrame`, `weaponSwing`, `HitFrame`, `MCO_WinOpen`.
Across its light attacks contact lands at 0.37–0.50 s, the early cancel at
0.17–0.25 and the combo window near 0.6, and every startup in `MUT_ATTACKS.s*`
sits in that band. **A reference you cannot decode may still be a measuring
instrument.**

His move set is five swings now, not three — a flat side cut, a rising kesa, a
turning cut, a thrust and the overhead — each built from waypoints with EVERY
JOINT GROUP ON ITS OWN CLOCK (the body leads, the chest follows, the sword arm
is last and carries past its stop), and footwork under all of them, because a
blow reads as having weight when the body went with it. They chain into each
other rather than into one answer, so no two exchanges are the same shape.

**AND THE KATANA IN YOUR HAND HAS A SHINE ON IT.** The blade is deliberately
dark and the shinogi ridge catching the one directional light is what says
"sword" — but held still, the ridge has nothing to catch and it reads as a
black bar. A slow breath on the emissive, opened up by how fast the sword is
actually moving, so it lives on the swing. IT IS THE HELD COPY ONLY: the
material is cloned for the view model, because `katModel`'s materials are
shared with the one on the sand, the examine screen and the pack icon — the
Military Shovel's own scar, where a lift on a shared material made a dark scan
glow flat grey everywhere at once. And slight means slight: the first pass ran
nearly three times the material's own emissive and the sword came out a pale
bar.

**A SWING THAT NEVER CONNECTS IS WORSE THAN NOT HAVING IT.** With the model
fixed, four of his five attacks landed and the OVERHEAD landed nothing at all —
twenty-seven throws over four minutes, zero hits, while the other four ran at
83–86 %. It is not a tuning problem: `Great Sword Slash` is a two-handed chop
whose blade comes down in FRONT of him at a range this fight never uses.
Traced, its limb DOES pass inside the 0.70 m hit radius — at `atk` 0.00, before
the window opens, because at a metre his own shoulder is already that close —
and no placing of the window catches the blade itself. Moving the window,
widening the window and raising the aim all failed in turn. The clip stays in
the file; the fight draws the four that land, and the RISING cut carries the
two-damage heavy instead. **Measure which of a creature's swings actually
connect before tuning how often it throws them.**

Two smaller things came out of the same pass:

- **THE KICKS NEEDED A LEG.** `blowLands` sweeps the chains `mutLimbs` builds,
  and with only the sword arm declared a kick was tested on the BLADE — which
  on a kick is behind him doing nothing. Measured: the two kicks passed 1.10 m
  from the chest on the steel while the foot went through the player. Both
  legs are listed in `kind.rig.limbs` now.
- **AND THE AIM HAD TO BE ABLE TO CLOSE A METRE.** These are real Mixamo arcs,
  not poses solved against a target, so they pass wider than the hand-authored
  ones did — the rising cut went by 1.15 m at `aimK` 1.15. At 2.60 it is still
  clamped, so a swing thrown from too far out still misses and backing away
  still works.

Measured at the end, hands-off at fighting range over two minutes: every clip
on screen, **46 swings and 51 damage a minute at 89 % connect**, with all four
swings landing. The Dealer is 48 and 40.

**AND ANY HIT OPENS A CRATE.** It was the game's one lock — `CRATE_POWER`,
about two thirds of a charge — and the one place that asked for the heavy
swing by name; a click thudded off the boards and did nothing, which is a
thing you can do three times before you work out the game wants something
else from you. The charge is still worth holding everywhere it was (two
points against one, more reach, poise) and it still SHOWS here: how hard it
came apart is how hard it was hit, so a tap drops the boards at your feet and
a full swing throws them.

**AND THE KNIGHT FIGHTS LIKE SOMEBODY WITH A PLAN.** Three things, and each
is something the player can learn and use:

- **HE PICKS A SIDE AND WORKS IT.** `flankSide` exists to spread a PACK round
  you, and for a creature fighting alone `slotAngle` has nothing to say — so
  it fell through to a coin toss, fresh on every shuffle, and what that draws
  is a two-tonne knight wobbling left-right-left between swings. That is the
  opposite of calculated: it is a thing with no plan. `steadySide` keeps the
  side he is already working. Measured: **3.7 direction changes a minute**
  against one per shuffle.
- **HE DOES NOT THROW THE SAME BLOW TWICE RUNNING.** A draw with no memory
  rolls its favourite swing twice in a row often enough to look stuck, and
  the one thing a boss must never look is stuck. Measured: **6 %** repeats.
  (A CHAIN is the exception and is chosen elsewhere — a deliberate repeat is
  a combination.)
- **AND HE ANSWERS A RAISED GUARD WITH THE THING THAT BREAKS ONE.** Every
  swing already carried `guardK`, how much of your bar it takes — 0.95 for
  the punch against 1.75 for the overhead — and nothing had ever read it as
  an intention. Hold the guard and he both circles more and reaches for the
  overhead, the stomp and the spin. Measured with the size-up held out of the
  comparison so only the draw is under test: guard-breakers **40 % → 49 %**,
  and with it back in he throws **48 swings a minute against 34**, because
  waiting you out is the other half of the same idea. **And measuring this
  needs the harness to hold the guard**: the preview cannot pointer-lock, so
  a dispatched pointerdown does nothing — `__bw.blocking` has a setter, and
  the size-up has to be switched off or it masks the draw in a small sample.

His run is the mutant one and nothing else: the locomotion pack's run is a
man's jog and reads wrong on two tonnes of plate. Everything else he has two
or three of, which is where the variety was wanted anyway — you see him
walk and stand and circle far more than you see him run.

Measured after, hands-off at fighting range over three minutes: **39 swings
and 40.7 damage a minute, 97 % of contacts on screen at 0.30-0.44 m from the
chest, still between swings 19 %, worst step 0.157 m, worst tick 3.9 ms**;
and the walk from the entrance to the altar is unchanged at 97.8 m with zero
stalls and zero reversals.

**AND THE COUNT WAS OF THE WRONG THING, WHICH MADE IT UNREACHABLE.** It was
written as three blows both heavy AND through his poise — "the hardest thing
in the fight to do once, let alone three times", which was the point and was
also the fault. Modelled and then measured against the real `hurtMutant`:
with an eleven-point pool refilling at 1.7 a second, a break lands on a heavy
only when every heavy lands and none is blocked, the third break arrives on
the TWELFTH heavy, and the katana at three a blow has him dead on the
thirteenth. One knockdown a fight, on the frame before the kill, in a fight
played perfectly; in a real one, none. The owner's "the animations where he
falls over are not working at all" was a fall that could not be earned, and
nothing was wrong with the fall. It counts what he asked for — heavies that
LAND, five of them inside one stretch of pressure (`knockLapse`, on the same
idle clock the poise refills on) — and a fight that keeps the pressure on
sees him go over once or twice. **When a mechanic gated on a rare event
never appears, count how often the event can happen before the fight ends.**

**AND THE CHAIN IS THE AGGRESSION.** `aggr` divides the between-swing
cooldown and at 3.7 that is already 0.02-0.10 s — saturated, and not what
limits his rate. What limits it is the swings' own lengths, and those are his
TELLS: this file has paid for shortening them before. A CHAINED swing has no
cooldown at all, so a deeper chain and a raised `chainP` on every attack is
the one lever that presses harder without making him less readable.
Measured: **41.2 swings and 43.2 damage a minute at 100 % connect**, against
37.6 and 38 before, with 98 % of contacts still on screen and the startups
untouched.

**The shovel has two swings.** Left click is the plain dig; holding right winds
up (`startWind`/`releaseWind`, `WIND_FULL`) and `digPower` 0-1 then scales the
pose amplitude, the swing duration, the reach, the crab kill radius, the
trauma, the sand thrown and the pitch of the impact sample. `winding` must be
cleared on blur or the shovel stays over your head.

**Why the release used to lag, and why the animation is pose-to-pose now.** A
charged swing went through `startDig()` like any other, and `startDig()` starts
the animation at p = 0 — which is *anticipation*, the segment that hauls the
tool up from rest. Letting go therefore snapped the shovel out of the pose you
had just spent a second winding into, dropped it to rest, and spent another
0.4 s winding it up again before it fell. Two artefacts, one cause.

So the swing is now three lerps between poses — `[pitch, lift, yaw, roll,
push]` arrays, `_poseA` (where the strike starts) → `_poseB` (where it lands)
→ rest — instead of five hand-written curves per segment. `_poseA` is
`haulPose()` for a left click and, for a release, **the pose the last rendered
frame actually left the arm in**, captured off `_pose`. `digT` starts at
`DIG_WINDUP` for a charged swing, so it enters the strike immediately. Release
to blade moving is one frame, and measured off `armRig.rotation.x` the pose
moves 0.007 rad across the release boundary.

**The swing trail.** Follow-through and arc, in `updateTrail()` — a ribbon
strung between two markers at the **ends of the blade's lip**, sampled every
frame through the strike and left to fade. Two things it got wrong first:

- **Strung down the tool instead of across the edge** it is 0.3 local units
  wide, and swept through four radians that is a solid white fan over a
  quarter of the screen. Across the cutting edge it is exactly as wide as the
  blade and draws the path the edge actually took. Ten samples, not eighteen:
  a trail is a smear behind the blade, not a diagram of the whole swing.
- **The quads overlap** where the arc doubles back, and additive blending adds
  every one of them, so a per-quad alpha that looks faint alone stacks into
  white. It has to be set far lower than it seems it should be.

It lives in `vmScene`, deliberately not under the arm — the whole point is
that it stays where the blade was while the blade moves on. Its brightness
scales with `digPower`, which is the clearest read the player has on how hard
they just hit.

Three more things that make a heavy feel like one:

- **Reach.** `DIG_REACH` 4.2 m, `+ digPower * DIG_HEAVY_REACH` 2.4 more. Only
  the raycast's `far` changes, so it shows up as *angles you can only land
  wound up* — at a shallow enough pitch a click scuffs the sand at your feet
  and a heavy craters five metres out. `impactPose()` pushes the arm from
  0.62 m in front of you to 1.06, which is the visible half of the same thing.
- **Hitstop stalls the world, not your hands.** `killCrab()` sets 0.075 s of
  near-frozen time, and running the view model on that scaled `dt` froze the
  shovel mid-arc — which reads as the animation stuttering on the hit rather
  than as the hit landing. `animate()` keeps a `rawDt` and `updateViewmodel()`
  gets real seconds.
- **The jar in your hands has to stay a curve.** `vmImpulse()` on impact used
  to be -1.7 to -3.6, which slams the spring into its own ±0.14 clamp on the
  next frame — a hard step, not an impact. The spring's peak is roughly
  `v0 / sqrt(stiffness)`, so anything under ~1.5 stays inside the clamp.
- **The blade has to be on screen when it lands.** `impactPose`'s `lift` used
  to reach -0.69 at full charge, which is below the bottom of the frame: the
  one pose that most needs to read was the one you could not see. The chop is
  carried by `pitch`, which was doing the work anyway.

`sfxWindFull()` fires the moment the charge tops out, and the tremble that was
already in the wound pose roughly doubles. A charge with no full mark is a
charge you hold too long every time.

**OVERKILL TAKES THE HEAD.** A heavy — a charged cut or the overhead — that
lands on a creature with one point left is far more blow than there was
creature, and about half the time (`burstHead`) the skull bone collapses and
a dozen fragments leave at once, pale bone among the meat, with the blood
coming from where the head WAS rather than from the chest, and the neck a
stump the ragdoll simulates like any other. Only then: a head that bursts on
every heavy is a gore setting. What killed it is remembered on the unit
(`killP`, `killOh`, `hpBefore`, set in `hurtMutant` before `killMutant`) and
`finishMutant` reads those, not the live `digPower`. The overhead also throws
the body about half a metre further (2.5 m against a heavy cut's 2.1 and a
light's 1.7, measured off the hips) — a little, so the hit reads harder, not
so far that it flies.

**A BODY ON THE SAND TAKES THE BLOW TOO.** The blade passed straight through
a corpse to the sand under it. `digImpact` tests the dead after the living:
the nearest joint on the aim line takes the hit (`ragHit`) — every particle
within three quarters of a metre is kicked along the swing and the ragdoll
wakes, the blow sprays from the point it landed, and a heavy (or a third of
lights) takes the piece it landed on: `limbFor` maps the joint to the limb
(a hand or forearm is the forearm; a shoulder or upper arm the arm; anything
in the leg the leg; head or neck the head; the spine the bisect, heavy
only), `mutSever` bakes and collapses it, and `ragCut` drops every particle
below the cut from the simulation, along with any constraint or bend limit
that named one, keeping the cut joint as the stump.

**THE OVERHEAD, AND WHICH FACE LANDS.** Hold sprint while you wind and the
shovel goes up over your head in both hands and comes down the middle — the
one swing that is a smash rather than a dig. A dig bites with the OPEN face;
a smash lands on the flat BACK of the scoop, blade square to the ground and
the open side up, so it is the TOOL that turns, not just the arm:
`VM_OVERHEAD_ROT` rolls `shovelVM` right over and squares it up, blended in
across the wind so you watch the hands change their grip. Measured at the
strike, the back's normal reaches -0.98 on Y — flat. A charged overhead into
a crab also fires the `smash` bank on top of the shell hit.

It is otherwise a POSE SET, not a second animation system:
`haulPose` and `impactPose` branch on `digOverhead` and the same three lerps
run, so the landing, the trail and the blade-on-the-crosshair correction all
work untouched. The choice is LATCHED during the wind (`windOverhead`), not
sampled at the release — letting go of sprint a frame early turned an
overhead back into a side swing.

**AND THE WIND-UP IS ON THE LEFT BUTTON.** Right click became the guard and
nothing else, so holding LMB past `WIND_TAP` is what charges; the on-screen
prompt still said RMB long after that stopped being true, which is worth
remembering the next time a control moves.

**THE MILITARY SHOVEL IS A KATANA, AND A CUT IS THREE THINGS AT ONCE.** The
hand is on the HANDLE (`MIL_GRIP_Y`: the hand's copy is slid down its own
length so the D-grip sits on the mount — a sword turns about the hands; the
first cut pivoted at the neck like the spade does and the handle flailed the
other way, a baton twirled), the hands TRAVEL (`side`, the sixth pose
component, a fraction of the frame's half-width so it is the same picture at
any window shape), and the blade ROLLS about them from up on the near side to
down on the far side. Three poses, not two — `slashCock`, `slashMark`,
`slashThrough` — and a fourth beat: the impact still fires at `DIG_STRIKE`,
but the cut goes on through to `SLASH_THROUGH` before the recovery, because a
blade does not stop where it lands. The tip comes in off one edge, arcs over
the upper middle, crosses the crosshair LEVEL with the flat of the blade to
the camera, and goes out low on the other side. THE PLANE OF THE SCREEN IS
THE WHOLE DIFFERENCE BETWEEN A CUT AND A STAB: two versions tilted the blade
toward the camera on the way down, the tip drove along its own length, every
frame foreshortened, and the owner called both a stab. (A true flat
horizontal cut is a YAW sweep and passes through pointing straight at the
target — the same stab; a sword swing that reads is a roll.) Pitch is nearly
still; yaw only cancels the arm's own -0.45 so the blade lies level at the
mark; `VM_SLASH_ROT` equals the rest grip — the cut is all arm. It was laid
out NUMERICALLY — the lip's screen position probed at every quarter of both
lerps — not by eye: with the arm, the mount and the scan's own root matrix
between the pose and the blade, a wrong guess in any one frame looks nearly
right. At rest it is a sword at guard (`VM_MIL_REST_ROT`, scoop straight up
over the fist). The heavy cocks higher and further back over the shoulder
(it is the held pose, and the blade must be on screen to twinkle), finishes
lower, drives further out, and is less slowed by the charge than a chop is
(`swingSecs`). The cock is quicker than a haul and the stroke LONGER than a
chop's: at the chop's timing the tip crossed the frame in two frames and only
the trail (1.55x on a cut) said it had moved. The world still ROLLS with the
cut (`hitRoll`, applied around the scene render and removed), a kill still
lands `sfxKillThud`, and the whoosh is a blade's — shorter, higher, and
delayed to the strike, because on the click it played over the cock-back and
was sixty milliseconds ahead of the picture.

**NOTHING FIRES FROM THE MIDDLE OF A SWING.** The first queue was
responsive and it was an exploit: a click in the recovery started the return
from wherever the blade happened to be, so mashing the button produced a
flurry of half-swings that never left the right side of the screen, each one
landing for full damage. A press now does one of two things and nothing
else — it queues the RETURN, which fires only at the forehand's
follow-through while the blade is still on the left (before 0.80 of the
swing), or it queues a fresh FOREHAND, which fires only once the current
swing has ended and `SWING_GAP` has passed. Every swing runs its full width,
and the fastest rhythm the button can produce is one whole swing per swing.
The swing itself was the last exploit: at `swingK` 0.9 a light cut was
0.2 s long, so even one-whole-swing-per-swing was thirteen swings in two and
a half seconds.

**THE CADENCE IS THE RECOVERY, NOT A CLOCK.** The first answer slowed the
cut itself (`swingK` 1.55) and put a wall-clock gap after it, and the owner
called the sword slow — because it was: a click in the gap did nothing for
up to half a second, which is the one thing a click must never do. The cut
is back at 0.2 s. What limits the rate now is `recoverK`: a blade's
RECOVERY runs at five times the length it would otherwise take (the
return's nine), so the blade FINISHES the cut — `REC_HOLD`, a third of the
recovery in which it drifts a few per cent — and then eases home, and the
next forehand leaves the frame it arrives. Every click is answered, at once
from rest or the moment the blade is home; the rhythm is set by a motion you
can watch rather than a timer you cannot. Measured: eight swings in 3.3 s
under a mashed button, in pairs. **And the held beat is the return's
window**: a click anywhere up to `RETURN_LATEST` (0.82, about a sixth of
the way home) throws the return from where the blade is, so a double click
does not have to be a fast one.

**THE LAST STRETCH OF A RECOVERY IS THE NEXT SWING'S WIND-UP.** A click
while the blade was drifting home waited for it to arrive, and the owner
felt the wait. A forehand asked for past `FORE_EARLY` (0.94 — the last
sixth of the recovery) leaves from where the blade IS: the haul mixes from
the live pose (`_poseF`), not from rest, which from rest is exactly the
same haul it always was. The cadence does not change (nine swings in
3.3 s under a mashed button, in pairs); the dead frames at the end of a
combination are gone.

**A HEAVY IS QUICK WHERE IT IS SEEN AND LONG WHERE IT IS FELT.** Stretching
the whole charged swing (`heavyK`, 1.75x) made it heavy by making it SLOW,
which is not the same thing — the owner watched the blade wallow across the
frame. A sword's weight is in the hold you spent charging it and in what
happens after the edge lands, never in the edge's own travel, which on a
real cut is the fastest part of the move. `bladeRate` runs the charge at
nearly the light cut's pace through the strike (a quarter longer at full,
just enough to read), carries a third again through the follow-through, and
comes home FASTER than a light because it has already paid up front. 34
frames became 22, with the cut landing six frames after the release. The
light's own recovery came down with `recoverK` 5.0 to 4.0: 30 frames to 25.

**A HIGHLIGHT ON AN EDGE IS AN EDGE, NOT A STAR.** The glint was a
symmetrical eight-pointed sparkle pinned to the blade, and a symmetrical
thing on a sword reads as a decal stuck on it: the shape says nothing about
what is catching the light. It is anamorphic now — a hot core, a long thin
streak either side of it and a much shorter pair across — and the sprite is
TURNED to the edge's screen direction every frame, so the long axis lies on
the blade's outline at any angle the swing holds it. It is also sized off
the edge's own length rather than a constant. And it RUNS THE TOOL'S OWN
EDGE: it used to run between `trailTip` and `trailRoot`, which are the two
ends of the trail's ribbon — the width of a shovel's lip, and on the katana
the last hand's breadth of the blade — so on a sword the light travelled
four inches and sat there. A tool may declare `glintSpan`, how far back up
its blade the edge runs from the point.

**A CLICK IS NEVER BANKED.** Three clicks were three swings: the third
fired on its own after the recovery, from a press made half a second
earlier, and a sword that swings when you did not just ask it to is one you
cannot trust. The forehand queue is gone. A press from rest swings; inside
the first cut's window it chains the return; with the blade most of the way
home (`FORE_EARLY`) it swings at once from where the blade is; anything
else is DROPPED. Measured: three clicks, two swings.

**THE BLADE FACES THE ENEMY THROUGH THE STRIKE.** The solved cuts carried
the blade pointing mostly UP (view-space direction y 0.85, z -0.5) and swept
it across — a pole carried past a man. `katFace` pitches the blade forward
about the camera's own axis (`KAT_FACE`, 24°) and takes HALF of the
point's drift back by moving the arm (`KAT_FACE_K`): all of it back put
the hand two frame-heights off the bottom-left corner, because the hand is
nearer the lens than the point. And it is pitched only from the cock to just
past the mark (`katFaceW`) — where the steel is going through something —
and brought back up by the wrist over the follow-through. `landBlade` runs
AFTER the grip and the tilt now, so the lip goes on the aim with the tilt in
it. Measured at the mark: z -0.82 against -0.53, point on the same line.

**AND THE FOLLOW-THROUGH POSES PARKED THE SWORD OFF THE SCREEN.** Every
check of the cut had measured the POINT, and the point was at the left edge;
nobody had measured the hand, which sat at (-1.07, -2.75) — two and a half
frame-heights below the picture — so for the held beat at the end of every
cut the sword was a sliver in the corner, and for the return it was off the
right the same way. Swept in the pane (roll, lift, push, side of the third
pose of each table): the hand comes UP and the arm goes BACK (`push` -0.32,
which is what shrinks a hand that is close to the lens), and the roll is
turned so the blade leans out to the tip. Forehand through: point
(-0.84, -0.03), hand (-0.32, -0.77). Return: (0.89, -0.02) / (0.74, -0.81).
The heavy's through the same way. MEASURE THE HAND AS WELL AS THE POINT.

**A SWORD'S HEAVY HAS WEIGHT.** `DIG_DUR` is 0.4 (the "0.44 s" in older
notes is stale), so at the cut's own timing a full charge went from release
to landing in 0.13 s and was home in a third of a second — a flinch, and
quicker than the light cut it outclasses. `heavyK` stretches a blade's
charge by its power (1.75x at full): 34 frames now against 19, the hang at
the top visible, and it comes home quicker than a light (`recoverK` scaled
by 1 - 0.65 P) because it has already paid up front.

**A BLADE SETTLES; IT DOES NOT BOUNCE.** Two things were the "flinch"
coming back to guard. `easeOutBack`'s overshoot threw the point two
frame-widths off the right edge and back on every recovery — a blade eases
in and out instead. And the GRIP was blended between poses as EULER ANGLES:
the return's grip is the forehand's turned half a turn about the blade, and
an Euler lerp from that back to the carry swung the whole sword through the
camera on its way home (the point measured 8.6 frame-widths out). The grips
are slerped now, and a blade's grip starts back to the carry over the last
stretch of the recovery (`SL_GRIP_HOME`) so it lands with the arm rather
than twitching after the arm has stopped.

**AND A SWING CAN BE LEFT.** The guard takes over from a cut at any point
(`cancelSwing`: a defence, and a cut abandoned before it lands is a cut you
did not make); the charge takes over from one that has LANDED
(`swingLanded`), so holding the button through a recovery goes straight to
the heavy instead of waiting for the blade to drift home — and not from one
that has not, so the button cannot feint a free cancel out of every strike.
The haul-back blends in from wherever the hand was (`_windFrom`, `WIND_IN`)
rather than snapping to the cock pose, which it had always done, from rest
as well.
And a click is ALWAYS the forehand: the 950 ms timing window that let a
click after the blade had come home fire a backhand from the right is gone;
the return is reached by chaining and nowhere else.

**A THRUST IS EXACT, AND IT DOES NOT REACH THE GROUND.** `landBlade` is
turned down to a third for a blade so a sweep is not thrown about by it, and
that third left the stab's point short and beside what you were looking at;
a stab is a point going to a point and gets the full correction. And
`aimLand` counts the SAND: aimed a little down, the aim ray meets the beach
three metres out and the point was being put there — the stab into the
ground the owner saw. Past the thrust's own reach (`STAB_REACH`) there is
nothing to meet and the point goes to the end of the arm.

**THE SECOND CLICK IS KEPT, NOT DROPPED.** `startDig` refuses while a swing
is running, so a double click was one cut and a wasted press, and the return
stroke only came if you clicked again in the dead time after the recovery —
which is why the combination felt like it needed luck. `queuedSwing`
remembers a click that lands while the forehand is in the air and
`chainSwing` fires the return the instant the forehand reaches its
follow-through, FROM WHEREVER THE BLADE IS (the live `_pose`, the way a
charged release leaves from the pose you wound into), straight into its own
strike; a click that lands in the recovery fires at once. One click, one
cut. Two, both. Measured: the point runs out to -1.58 on the forehand and
comes straight back through -0.44, 0.96, 1.30 on the return, and a single
click goes forehand → carry with nothing after it.

**A THRUST'S WIND-UP HAS TO BE BIG ON SCREEN.** Hauling the hand back "past
the hip" by the numbers put it off the bottom-right corner, and what was
left in the picture was a sliver of blade — a powerful wind-up that nobody
could see. The tsuka is kept large in the lower right of the frame, the blade
level from there toward the centre with the point parked just right of the
crosshair, and the drive does the rest: 0.6 m of travel, the lens punched and
the knees giving when it lands.

**A CUT LIES IN THE SCREEN PLANE; A CUT THAT HITS SOMEBODY DOES NOT.** The
rule this file has carried since the Military Shovel learned to cut is that
tilting the blade toward the camera turns a cut into a stab, and it is still
true — but held perfectly flat the point never goes anywhere near the thing
you are swinging at, and the owner's word for that was that it does not look
like it is slashing anyone. The blade is angled about a third of a right
angle INTO the screen through the whole stroke now (view-space direction z of
-0.52, measured every frame): still sweeping across, still side-on enough to
read as an edge, with the point out where the enemy is rather than level with
your own nose. It gets its own grip for the cut, solved with the stroke.

**THE SWORD'S HEAVY IS A THRUST, NOT A SLAM.** Holding sprint into a charge
turns a shovel into an overhead; on a katana the owner asked for the point
driven straight at what you are looking at with the tsuka coming back toward
your own face. It takes the overhead's slot in the pose system and shares
nothing else with it: its own grip, its own draw, its own drive, and it is
held through the WIND as well, because you have to be able to see what you
are charging. **And it has to be solved so you can SEE it**: pointed dead down
the view axis a thrust is a dot, and the first solve put the blade within
fifteen degrees of the camera's own line and the sword all but vanished on
the frame it landed — the same complaint as the overhead it replaced. The
draw holds it 48° off the axis and it turns to 32° and drives 32 cm forward
as it lands, the point finishing on the crosshair. The tsuka is kept half a
metre out, because a handle that comes at your face is not a wind-up, it is a
camera clip.

**AND THEN THE REEL'S OWN MOVE SET TURNED OUT TO BE UNREADABLE IN A GAME.**
Copying the animation faithfully produced a cross-body draw whose point left
the frame at the cock and came back somewhere else, and the owner's verdict
was "the blade moves all over the place ... I need a clean swing across the
screen". What a swing has to do FIRST is be legible, and legibility is one
property: THE POINT TRAVELS IN A STRAIGHT LINE. The shovel's cut has run
corner to corner through the crosshair since it was laid out and nobody has
ever complained about it. So the katana's point runs (0.86, 0.40) →
(-0.10, -0.02) → (-1.08, -0.42), right to left, the width of the picture,
and a charge runs the same line from (0.82, 0.94) — cocked up toward the top
right out of the idle, so a held heavy reads as a sword about to be swung
rather than as a guard. Faithful to a reference beats invented; legible beats
faithful.

**A MIRRORED STROKE IS NOT A MIRRORED PICTURE.** The obvious way to build the
reel's combination is to flip the second hit, and `mirrorSide` exists to do
it — but it reflects the HAND about the middle of the frame, which is a true
mirror only if the arm is symmetric about that line, and it is not: the
shoulder is fixed off to the right. Measured, the mirrored follow-through put
the point at x = -3.26, three frame-widths off the left edge. So the
combination lives in the LINE instead: three hits, all sweeping the same way,
the first through the middle, the second rising through the upper body, the
third lower, longer and quicker. Three visibly different swings and not one
of them can surprise you.

**AND `landBlade` HAS TO BE TURNED DOWN FOR A SWORD.** It exists so a dig
lands where you aimed, and it does that by TRANSLATING THE WHOLE ARM until
the lip sits on the point — right for a spade, whose stroke is short and
whose line nobody reads, and wrong for a blade whose whole appeal is the
sweep. At full weight it was dragging the authored line apart mid-swing. A
third of the correction, on a short leash, keeps the blade honest about where
you were looking without letting it throw the swing around.

**THE KATANA'S MOVE SET IS THE UE4 REEL'S, POSE FOR POSE.** A second
reference arrived — a first-person katana animation set with every clip
LABELLED on screen — and "make it exactly the same" is a much easier brief
than it sounds, because a labelled reel is an index: crop the label strip at
1 fps into a contact sheet and you have the timecode of every animation in
the video (`idle_breathing`, `block_in`, `block_loop`, `block_out`,
`attack_swing_left_01`, `attack_heavy_swing`, and the rest) without watching
a second of it. Then sample only the seconds that matter, at 10–15 fps, and
read the poses off those. Four things came out of it and all four are
different from the Battlefield reference that preceded them:

- **The idle is nearly UPRIGHT.** Fist in the bottom-right corner, tsuba just
  above it, blade running up and leaning slightly right until the point
  leaves the top of the frame. The BFV carry — blade low and across to the
  left — was a different game's sword and had to go.
- **The guard is HORIZONTAL**, fist at the far left, the whole length of the
  blade running out to the right and off the frame. A shovel guards with the
  shaft across you and the blade high on the leading side; this is not that
  shape at all, so the katana carries its own `KAT_BLOCK_AT`, its own
  `KAT_BLOCK_POSE` and its own `KAT_BLOCK_ROT`, and every other tool keeps
  the shovel's.
- **The cut is a CROSS-BODY DRAW.** The fist drops to the low left with the
  point thrown up and back over the far shoulder, then the blade comes round
  through the horizontal and out past the near hip while the hand travels
  left to right. Scaling the shovel's stroke could never produce that: a
  spade's cut keeps the hand on one side. The katana has its own
  `katCock` / `katMark` / `katThrough`, and because the whole turn is in the
  ARM's roll the sword never rotates in the grip — its slash grip is its own
  carry grip, which is what "the cut is all arm" finally means here.
- And the tips were SOLVED, not eyeballed: point at (0.55, 0.72) cocked,
  (-0.95, 0.10) on the mark, (-1.05, -0.72) through, in normalised device
  coordinates read straight off the reel's frames, all three hit exactly.

**THE KATANA IS BUILT NOW, AND THE SCAN IS GONE.** brandon_grey's "Gothic
Katana Sword" was put in as an exact replica and the owner's verdict was
"it's bad, it's facing the wrong way and it looks horrible" — and measuring
it says why, in three numbers that are all properties of the FILE and none of
which can be fixed from outside it. It was **1.81 m long**, and a sword as
long as the frame is tall reads as a plank. Its blade was a plate of
**constant thickness** — sampled across the width: 4.3, 4.4, 4.5, 4.6, 4.7
mm, with one 3.2 at the very edge — so it had no shinogi, no bevel and
nothing anywhere on it that could ever catch a highlight. And its baked map
was a pale wash that went grey under this moon. `models/katana.js` builds one
instead, the way the lighthouse and the mushroom house are built: 103 cm
overall, a real shinogi-zukuri section, a curve with the edge on the outside
of it, a drawn ito wrap, an iron tsuba and a brass habaki. Same lesson as the
tower — **building it made it exact**, and it is the only way to answer "make
the model look more exciting" at all.

**AND THE SHINE IS GEOMETRY, NOT GLOSS — BUT THE ALBEDO HAS TO GO MUCH
DARKER THAN IT LOOKS ON PAPER.** What makes a blade read as steel with no
environment map is the RIDGE: the shinogi catches the one directional light
as a hard line down the length of the sword and it moves as the blade turns,
which is what a polished edge does. The material only has to stay out of its
way. The trap is that the VIEW-MODEL SCENE CARRIES ITS OWN LIGHTS — an
ambient at 0.9 and two directionals at 1.15 and 0.55, tuned for a skin-toned
hand — so nearly three units of light land on whatever is in your fist. A
0x7d8794 body with a 0xd7dee8 temper line is gunmetal in the abstract and
renders as BONE in the hand; it took 0x2e343d and 0x6a7b90 to get dark steel
with a bright line on it. Read the lights of the scene a thing will actually
be lit by before choosing its colour.

**AND A TOOL AUTHORED WITH THE GRIP AT ITS ORIGIN NEEDS NO GRIP SLIDE.** The
scan wanted `KAT_GRIP_Y` to put the fist on the tsuka, and the charged cock
had to be laid out twice because of it. The built one has the hand at
(0, 0, 0), so the sword turns about the hands in every pose without a special
case. A tool hangs from where it pivots; the cheapest way to get that right
is to author it there.

**THE BOSS FIGHT HAD NO BLOOD IN IT AT ALL, AND THAT IS WHY YOU COULD NOT
READ IT.** "You can't tell what's a successful hit" was not a feedback
problem to be solved with more feedback — it was a bug, and the bug is the
oldest one in this file wearing a new coat: the BEACH'S OWN y = 0 baked into
a system that now runs forty metres under it. A blood drop was deleted at
`y <= 0.02`, an absolute height, so every drop thrown in the bunker was
already below its own ground on the frame it was made and was removed before
it had ever been drawn. `bleedMutant` spawned its burst at a bare
`0.85 + …`, which is chest height on the sand and is forty metres over the
Dealer's head in his own room. And `stampBlood` stamped at 0.035, so what
little survived left its mark on the beach above the roof. The net of it: a
landed cut showed you the sparks off `bossHit` and NOTHING else, which is
exactly what a block looks like — so every swing in that room read as
blocked, which is also the whole of "I keep getting stuck in block when
fighting in the bunker". A drop asks what is under it now (`bunkerFloorAt`,
then the deck, then the sand), the burst comes out of the body's own y, and
a stain takes the height it landed at. THE SAME THREE LINES HAVE NOW BEEN
WRITTEN FOR THE PHYSICS BODIES, THE GIBS AND THE BLOOD: anything that knows
one ground is broken the day the game acquires a second one.

Two things went on top, once it could be seen at all. **Some of the spray
comes BACK at you** — everything else is thrown away down the swing, so at
the wrong angle (him against a dark wall, the blade between) a cut could
still be read as a block, and blood crossing your view is a thing steel never
does. And **the blow that finally breaks his poise bleeds rather than
sparks**: it threw sixteen sparks, the loudest picture in the fight, off the
one blow that had just gone through his guard and into his body.

**A GUARD IS A BUTTON HELD, SO IT MUST BE POLLED AND NOT LATCHED.**
`blocking` was raised on pointerdown and only ever lowered on pointerup, and
a release that never arrives is not rare: the lock goes away to a browser
banner, the tab loses focus, a press that began over the canvas ends
somewhere else. Then the shovel is up across the screen for the rest of the
fight with no way down but pressing and releasing again. `e.buttons` is the
ground truth and it comes free with every pointermove — bit 1 is the right
button — so the guard is now whatever the mouse is actually doing. Losing the
lock drops it, a cutscene drops it, and `pointercancel` drops it.

**THE KATANA IS A THIRD CUTTING TOOL, AND EVERYTHING IT DOES DIFFERENTLY IS
A FIELD ON THE ITEM.** brandon_grey's "Gothic Katana Sword [Dark]"
(`assets/katana.glb`, the blade only, through `gltfpack.py --nodes Blade` at
2048 with its maps kept — 1.55 MB, because looking like the photograph is
the point). It walks through every door the shovels do: `onDig`, its own
`lip`, the shared cut, the shared guard, the shared overhead. What is its own
is declared on `katanaItem` and read by tiny helpers that DEFAULT to the
shovels' behaviour, so a tool without the field is exactly the tool it was:
`dmgLight` / `dmgHeavy` (2 / 3 — `toolDmg`), `windRate` (1.3: full charge in
0.78 s against 1.0), `gore` (1.4 — `toolGore`, remembered on the unit as
`killGore` at the kill because `finishMutant` runs after the hitstop),
`swingK` (0.9), `blade` (the whoosh, the connect and the block are a
sword's), and `alternate` (a light thrown inside 0.9 s of the last comes
back along the other diagonal — the return stroke that was rightly cut for
the shovel is the katana's whole vocabulary). It spawns under the cliff
past the drain, where the Military Shovel used to lie. (That spawn is GONE now — see
"THE KATANA BY THE DRAIN IS GONE" below; the dojo's stand is the only one.)

**A SCAN MAY CARRY ITS OWN 0.01, AND YOUR AXIS FIT MAY BE IN THE WRONG
FRAME.** Two mistakes in one build. The shovel's scan arrives in raw
centimetres and its wrapper scales by 0.01; this one carries the 0.01 INSIDE
its Sketchfab .fbx node, so a second 0.01 on top made an eighteen-millimetre
sword whose world scale printed as zero and whose in-hand bounds collapsed
to a point. And the principal-axis fit was first done "in the wrapper's
frame" by walking up from the mesh to the first ancestor with scale 0.01 —
which found the SCAN'S node, not mine, so the fit ignored the root's
rotation and the quaternion was wrong by that rotation. Find your wrapper as
the parent of the scan's root node, by name. Then: an axis-aligned box says
nothing about a blade lying on a diagonal in its node frame (85 cm "wide");
a principal-axis fit over the vertices gives length, width and thickness;
the thick end (2–4.5 cm across handle and guard against a 5 mm blade) is
the handle; the thinner side across the width is the edge. Rows of the
rotation are the scan-space vectors that become hand x, y, z — `[W; -L;
-T]` here — and the offsets re-centre the blade's own axis on the mount
with the point at -0.21 like every other tool's. It is 1.81 m long because
that is how long the thing is.

**LIGHT BY HOW IT WAS THROWN, NOT BY WHAT IT TAKES.** `hurtMutant` decided
"light" with `dmg < 2`, which was the same thing while every click did one.
The katana's click does two, so under the old test its every click was a
heavy: three poise a swing, no chance of meeting his bar, a stagger every
third click. `P < MUT_HEAVY && !digOverhead` now, in both places. The
blade's advantage is the damage, not free staggers.

**SPARKS ARE FOR STEEL.** A cut that went into him threw six drops of blood
under `bossHit`'s shower of sixteen sparks, so every landed blow read as the
bar being met rather than the man being opened — the owner saw sparks and
nothing else. `bossHit` takes a `flesh` flag: sparks on a block and a parry,
four off the bar on a stagger, none at all on a cut, and four times the
blood thrown from the height the blade landed with a stain under it.
Measured: 24 drops on a click, 36 on a charge, against 6 before.

**THE RIPOSTE IS A MULTIPLIER, AND THE BEAT WAS TAKEN BACK OUT.** A version
of this file argued the opposite — that a parry buying double damage was
"a number", and that what Sekiro and Lies of P have is a moment the game
throws for you — so the blow on a stunned man was followed, without a
press, by an automatic drive of the blade into him. The owner's verdict on
playing it: take it out, and he feels easier now, which he should not.
Both halves were true. A follow-up that plays itself takes the hands in
the middle of an exchange, which is the one thing a fight must not do; and
three free points off his bar every parry is a straight difficulty cut on
the one fight in the game. What a parry buys is a swing YOU throw, worth
two. `riposteT` and its gates in `attackAction`, `startWind` and
`katStabbing` are gone; `hurtMutant` keeps the doubling and the prompt.

**AND A PUNISH WINDOW IS A RATIO, NOT A LENGTH.** The same pass separated
his recoveries by a factor of five — 0.26 s on the quick side swing against
1.10 on the held overhead and 1.30 on the lunge — and the read that buys
(which swing to answer) is worth having and is kept. But it bought it by
making the two slow ones very long, and a recovery is DEAD TIME: a second
and a third of him standing there after every held overhead is two free
swings, so the fight got slower and easier at the same time as it got more
legible. They are pulled back in (0.22 / 0.50 / 0.82 / 0.95) and `aggr`
goes to 2.20; the ratio, which is the part you play against, is nearly
untouched. Measured over a minute at fighting range against a passive
healed player: 44 swings and 34 damage before, 48 and 40 after — and three
fewer points off him on every parry. **If a change makes something more
readable and less dangerous at once, price the second half.**
And `guardTick`: every block already took a third of the
bar and nothing said so until the guard dropped; the bar flashes white on
the blow now (`#stamina.hit`, re-triggered by removing and re-adding the
class with a reflow between), so the third that went is a thing you watched
go.

**A FOUND THING ON A DARK FLOOR NEEDS A POOL OF LIGHT — AND A LIFT IS NOT A
SPOTLIGHT.** When the case spills, the shovel's glint is moved over its
middle, its `shinies` entry is given the scan's materials to lift (they
were not there when the shine was added — the scan lands over the network,
so `mats` was empty and the lift had nothing to lift), and an additive halo
disc is laid on the floor under it, removed when it is taken. The first
pass then drove the lift itself at strength 3.4 and lift 1.6, whose product
is 5.4 — over one on every emissive channel — and the tool came out of the
case as a flat WHITE cut-out lying among the planks, which is the exact
failure this file already warns about twice for a dark textured scan. The
big glint and the halo are what say "found thing"; the metal only has to be
lifted enough to read as olive drab rather than as a hole. 2.6 and 0.30.

**AND THERE IS NO ARENA.** The first version penned him thirty metres from
his mark and forty seconds of holding S walked away from the last boss in
the game — measured: 226 m, one swing thrown, four damage taken. He is
faster than a sprint (`speedK` 1.42 on 4.6 against your 5.71) and he does
not stop. Measured after: standing still, 26 swings and 29 damage a minute;
walking backwards for forty seconds, 11 damage; sprinting away, he holds
6 m and never loses you. **A boss you can walk away from is scenery.**

**AND THEN HE HAD TO BECOME A SOULS BOSS.** The first build fought
correctly and read as a creature swinging near you; the owner asked for
swings you can see coming, hands that actually connect, and something much
harder and crazier. Five things, and the first one is the one that made the
other four possible:

- **A TELL IS MEASURED IN SECONDS OF VISIBLE APPROACH, NOT IN `wind`.** The
  honest number is how long the claw is travelling in at you before it
  arrives, and it is what a player actually reads. Measured: 0.47 / 0.32 /
  1.05 / **0.23** against a 0.20 s parry window — the grab was a coin toss.
  Every startup is longer now and the shortest is 0.33; the pounce is 1.15.
  **He is made harder somewhere else entirely**, which is the Dealer's own
  rage note said plainly: the startups are what keep a boss fair, and
  aggression, chains and a gap-closer are where difficulty is supposed to
  come from.
- **A COMBO YOU CANNOT HOLD IS A COMBO YOU CANNOT BLOCK.** `blockMutant`
  takes `BLOCK_COST * 1.35 * reachK` — 0.46 of the bar per blow, which is
  TWO AND A FIFTH BLOWS to an empty bar. A boss who throws four-hit strings
  is then a boss whose strings break your guard in the middle and you eat
  the rest, which is the whole of "not smooth to block". `kind.blockCost`
  and per-swing `guardK` are the two knobs: an ordinary claw is 0.26 of the
  bar and the pounce is 0.55, so you hold a string and then you have to do
  something else. Measured over a minute of holding the guard: phase one 21
  blocked and 8 through, phase two 10 blocked and 20 through.
- **A POUNCE THAT WALKS ITS OWN WIND-UP IN IS NOT A JUMP.** The fight AI
  closes through every startup at two thirds of a run — the pack's own
  answer to "I back up and never get hit" — so he arrived at the edge of his
  reach before he had left the ground and then "jumped" the last metre.
  `hold` keeps him where he is for the whole startup: he stops, rears, and
  crosses the ground all at once. **And the travel has to be FINISHED by the
  contact frame**, not started at it: run from the strike onward he was
  still 3.07 m away when the claws came down and missed by 1.48. `LEAP_AIR`
  is the flight, in the last of the coil. **And its `reach` must be inside
  what it can actually cross** — at 4.20 against a 3.6 m leap he threw it
  from ranges he could not close and his signature move whiffed.
- **THE ARM THAT IS SWINGING IS THE ARM THAT GETS AIMED.** A man with a
  crowbar has one and there is nothing to choose; a thing that mauls with
  both has two, and correcting the right shoulder on a swing the left claw
  is leading puts the wrong hand on your chest. `aimLimb` takes whichever
  claw is nearer. With that and `kind.aimK` (a shoulder on a two-metre arm
  may reach further round than a man turning into a bar swing) every swing
  now lands inside 0.15 m of the chest at every range from 1.6 to 3.4 m.
- **HALF HIS HEALTH, AND HE IS NOT THE SAME THING AFTERWARDS.** The single
  most useful thing a boss can have: it turns one fight you solve once into
  two and it tells you, with a noise you cannot miss, that you are winning
  and that it is about to get worse. It is an OPENING and not a cutscene —
  he is stopped and wide open for two seconds and you keep your hands. What
  changes is everything between the swings and nothing about the tells.
  **And turning the busy-ness dials bought almost nothing on their own**:
  aggression up and cooldowns down took him from 22 swings a minute to 13,
  because the moves he now favoured were his two slowest and each threw him
  past you and cost him the ground back. What makes a boss relentless is
  that a swing leads STRAIGHT into another swing, so the CHAIN
  probabilities go up and the pounce — which chained into nothing in the
  first half — comes down and keeps going.

Measured at the end, against a passive player at fighting range: phase one
43 swings and 40 damage a minute, phase two 47 and 41. The Dealer is 48 and
40, and this one also has a move that takes two of your four.

**`near` WAS ABOUT THE LAST SWING, AND THE ORBIT IS ABOUT THE LAST SWING
TOO.** That is the whole bug, and it is a feedback loop rather than a number
being wrong. `near = dist <= A.reach` uses whatever swing it happens to be
holding; `flankDir` rings it at `A.reach - 0.3` off the SAME swing; and the
separation and the circling put the equilibrium orbit a little outside that.
So a creature whose last swing was its SHORTEST settles into a circle just
beyond its own reach, is never `near`, never enters the branch that picks a
swing, and therefore never gets a different reach to be measured against.
Traced: orbiting between 2.80 and 3.03 m holding a 2.80 m swing, walking
sideways, for half a minute at a time.

Two fixes, and they belong to every creature and not just to him:

- **Being in range is a question about the CREATURE, not about the last
  thing it threw.** `u.maxReach` is the longest swing it owns, worked out
  once at build, and `near` and the token hand-out both ask that.
- **And the draw is over the swings that can actually reach you.** Anything
  whose reach falls short of the current distance is out of the hat, so it
  cannot roll its shortest swing at three metres, throw it at the air and
  fall back into the same orbit. If nothing can reach it takes the longest
  and closes the last of the ground with that swing's own lunge.

Measured after, hands-off, five minutes, nothing touched: **207 swings (41 a
minute), 189 damage (38 a minute), worst gap 3.9 s.** Before: 36 swings and
a 32-second stall. The pack and the Dealer both still fight — 27 swings a
minute between the three of them, and the Dealer's four all still land.

**A DIRECTIONAL STEP, ON SPACE.** Before it the whole answer to a swing was
block, parry or walk backwards — three things, all of them facing him, and
the walk backwards is not really one, so every exchange had a single correct
input. The step is what turns that into "read the tell AND choose where to
be": his lunge is stepped and his side swing is parried, and neither is the
other's answer any more.

- **It takes jump's place while a fight is live, and only then.** Space is
  the only key the left thumb can reach with four fingers locked on WASD and
  the pinky on shift, and in a fight every one of those is committed; and
  jump is worthless in the one room where the step matters, which is a flat
  steel box. `inCombat()` is deliberately narrow — a woken thing inside ten
  metres — or a shovel in your hand would cost you jump for a kilometre of
  walking.
- **No input is a BACKSTEP.** A man with nothing pressed who hits the button
  wants to be somewhere that is not here, and back is the only direction
  that is true of whatever is coming.
- **The step owns the velocity while it runs**, so nothing held on WASD can
  steer it half way through — a step you can turn mid-flight is a sprint. It
  is fast at the front and eases out at the back, and it goes through every
  clamp exactly like a walk, so a step into a wall stops at the wall.
  Measured: 2.0 m in 0.30 s against 1.0 m in 0.5 s of walking.
- **The near miss is the feedback.** I-frames alone are silence — the blow
  simply does not arrive and the player cannot tell a dodge from a miss — so
  a blow that goes through you inside the window is HEARD going past, low
  and panned off to one side, with a beat of hitstop and a pull on the lens.
  Measured: the window is 0.185 s and a blow at 0.200 lands.
- **It comes out of the same bar as a block and a sprint**, so a fight you
  spend rolling out of is a fight you cannot then back out of; and there is
  a cooldown, because a step you can mash is a step that never has to be
  timed. That is the parry's own argument.

**A GLINT YOU CANNOT SEE IS NOT A GLINT.** Every shine in this game is
depth-tested, which is right for a shell on an open beach and wrong for the
one moment a shine exists FOR: the Military Shovel lying among a dozen planks
and four table legs on a steel floor, where the thing hiding it is the
wreckage that revealed it. `addItemShine` takes `through`: a SECOND sprite
that ignores depth, bigger, much fainter, drawn last, breathing on its own
slower count — so a plank across the tool dims the mark instead of deleting
it, and with a clear line of sight the two read as one brighter glint. Two
sprites rather than one depth-ignoring sprite, because a shine that never
occludes at all reads as a decal pasted on the lens. It is opt-in and set in
exactly one place: a glint showing through a cliff would be the wrong thing
everywhere else.

**AND IT MUST LAND IN THE ROOM.** The equipment case stands 0.89 m from the
+x wall and the spill threw the Military Shovel 0.9 to 1.4 m down a fan of
headings: measured over four hundred spills, **more than a quarter of them
put the prize outside the room** — through forty centimetres of concrete, out
on the sand over the roof, gone for the rest of the game — and a third of the
rest put it inside the furniture. The heading the break threw it is still
what is asked for first; it is simply no longer the last word. `spillSpot`
walks out from that heading, alternating sides and then closing in, and takes
the first place that is inside the walls and on floor a body could stand on —
the room's own walk grid already knows what is furniture and the room box
already knows where the walls are, so this only has to ask them in the right
order. Measured after: 0 of 500 outside, 0 of 500 in furniture.

**AND A TOOL HANGS FROM WHERE IT PIVOTS.** Sharing a rest pose is not enough
to make two tools hang alike: the Military Shovel's model is slid down inside
its group by `MIL_GRIP_Y` so the D-handle sits on the mount, and the sand
shovel was never slid, so with both in the same rotation they sat 28 cm
apart. Worse, the charged cock was laid out for a tool that turns about its
GRIP — swing one about its neck through those angles and the blade leaves the
top of the frame, taking the full-charge glint with it. `SAND_GRIP_Y` gives
it the same treatment, and the slide comes back out for the guard and the
overhead, which were both laid out on the neck pivot. Measured: 2.2 cm apart
at rest, and the glint back on screen at full charge.

**AN AUTHORED SWING IS A SWING AT THE AIR.** It lands wherever the arm
happens to put it, and whether that is anywhere near YOU depends on how far
off you were standing, which way he was facing and which of six clips came
up. Measured with him squared up at 1.3 m, his side swing's own contact
frame left the bar 1.78 m from your chest — so half his blows passed a foot
wide, the guard was never met by anything, and the fight felt like it was
happening beside you rather than to you. `aimBar` is the same idea as
`landBlade`, which puts the player's own blade on the crosshair: **the
animation says WHEN and the correction says WHERE.** Two parts, because the
shoulder alone cannot cover most of two metres without becoming a different
swing — a yaw that turns his body into the blow, then the shoulder for what
is left, which is mostly height. Both clamped, both on the same ease, so a
swing thrown from too far out still misses, which is what keeps backing away
worth doing.

| | bar to chest before | after |
|---|---|---|
| the overhand | 0.33 m | 0.15 m |
| the horizontal | 1.78 m | 0.23 m |
| the wind-up | 0.85 m | 0.05 m |
| the lunge | 1.16 m | 0.11 m |

Three things it needs. **The yaw goes on the MODEL, never on `u.g`** — the
group's heading belongs to the AI and to every distance test in the fight,
and a correction written into it accumulates frame on frame. **The bar's own
hitbox reads bone world positions**, so it follows the correction for free
and the picture and the blow cannot come apart. And **the world-to-local
turn must come from `getWorldQuaternion`**, not from inverting `matrixWorld`
and reading the rotation off that: the model is scaled to the creature's
height, `setFromRotationMatrix` on a matrix with scale in it is not a
rotation, and the arm flew far enough that the measurement read 244468
metres.

**A SWING THAT IS NOT IN THE TABLE MUST NOT TAKE THE FRAME DOWN.**
`u.atk[u.st.swing] || MUT_ATTACKS[u.st.swing]` returns `undefined` for a unit
whose swing was never set or names a clip its kind does not own, and the next
line reads `A.wind` off it — an uncaught TypeError inside `animate`, which is
the whole game, once per frame for as long as the state lasts. `swingOf`
falls back to one the creature definitely has.

**POISE IS A POOL, NOT A COUNT.** It was three light swings to rock him and
a charge rocked him outright, so the answer to the first boss was to hold
the button: every heavy was a free stagger. Now every blow SPENDS from one
pool — a heavy spends three, a click spends one — and what is left grows
back (`poiseBack` 1.6/s) once you have left him alone for `poiseWait`. Eight
points is three charges in a row or eight clicks. **The parry is the
exception and always was**: a stunned man is past the whole human branch, so
reading the tell is the one thing that opens him up on demand, which is what
a parry should be worth. Measured: 3 clicks became 8, one charge became 3,
and the stagger itself is 0.23 s instead of 0.32 (`recoilK`) — still the
prize, no longer two free swings. If a poise break lands mid-swing it must
skip the "committed" shrug or the break is wasted on the one blow that
earned it.

**ONE GRIP FOR BOTH SHOVELS.** They already shared the cut, the overhead and
the guard; holding them differently at rest was the last thing that made
the sand shovel a different tool, and it made the hand jump every time you
scrolled between them. `restRot()` is `VM_MIL_REST_ROT` for everything now.
`VM_REST_ROT` is not gone — it is the DIG grip, which is what the guard
turns back into on either tool, and only the scan needs the neck shift for
it because the built shovel already pivots there. Both read
[-3.142, -0.483, 0.483] at rest and [0.70, 0.35, 0.32] on the guard.

**A BLOCK IS SHORT AND VIOLENT, NOT LONG AND HEAVY.** A tenth of a second of
frozen world under a soft spring read as the blow SHOVING you. The freeze is
shorter (0.085) and everything round it is harder: the spring driven half
again, twice the sparks, the knee dipping, and the word off the screen
before you finish reading it. The spring itself went from 3.26 Hz to 4.03 at
the same damping ratio — it still rings three times, it just rings and is
done. Anything you do four times in an exchange wants snap, not weight.

**BOTH SHOVELS CUT.** The stroke was the Military Shovel's alone. Nothing
about it is the scan's: `VM_SLASH_ROT` is *identical* to that tool's own rest
grip, which is "the cut is all arm" made literal — so `slashing()` widening
to any dig tool moves the poses, the timing, the trail and the whoosh across
whole, and each tool keeps its own grip through `restRot()`. The overhead was
always shared.

**WHAT A BLOW ON A BOSS FEELS LIKE.** Everything else on the beach is
cleared out of the way; he is the fight, and the difference has to be in the
hands. `bossHit(P, broke)` is the confirm on top of the ordinary one — twice
the frozen time, the guard spring driven, sparks off the bar, the lens
punched, `sfxSlam` under it — and the POISE LADDER is what makes it read:
0.085 s on the first light, 0.085 on the second, **0.155 and a knee-dip on
the third**, the one that finally moves him. You can feel the count. A
charge skipped all of it at first, because it never entered the light
branch — the one blow that should land hardest landed softest.

**AND A BOSS NEEDS A BLOW YOU ARE AFRAID OF.** The fair one to make it is
the one you can see coming from furthest away: `dHold`, a second of bar over
his head, takes TWO of your four. Per-swing damage (`A.dmg || kind.dmg`) is
the whole mechanism. With eighteen health, shorter recoveries on the quick
swings and `aggr` 1.45, a passive player takes 39 damage a minute off 30
swings — and the way through is still the parry: five ripostes.

**AND HE READS YOUR WIND-UP — WHICH MEANS BREAKING HIS OWN SWING.** A charge
held in his face is answered: he steps out of the arc (the walk clip at a
NEGATIVE rate, so his feet go where he is going, and he keeps facing you) or
the bar comes up. The first version only allowed it while he stood idle and
fired 15 % of the time — and the measurement said why: **he is mid-attack 78 %
of the time**, so the window almost never opened. He can now break out of the
FIRST HALF of his own startup, before the commit, which is the exchange the
fight wanted: charge as he winds and he backs out and answers; charge late and
he is committed, so you trade. The commit is what keeps his tells honest and
is untouched. Measured: 58 % of charges answered, 11 dodges and 3 guards in
24. A block is his TURN, too — he comes off it into a strike (`cool` 0.10)
rather than standing there.

**THE BLOW IS WHERE THE WEAPON IS, AND HE HAS POISE.** Third pass on the
Dealer, after "stun-locked by light hits", "swings that don't look like
swings then you get hit", "the taunt hitbox is bad". Four things:

- **His strike is tested on the BAR** (`dealerBarHit`): six points from the
  grip out along the forearm's line to the tip, against a segment from your
  hips to your head, over the WHOLE active window, and only inside a cone in
  front of him. The pack lands a hit on a feet-to-feet distance at the first
  active frame with no direction in it — right for a thing with two-metre
  arms whose swing you learn by count, wrong for a man with a crowbar you are
  meant to watch. His `reach` came down with it (1.75–1.95 for the swings; a
  bar reaches two metres, not two and a half) and the lunge and the step in
  the overhand close the rest.
- **The startup is the swing you see.** `mutClipTime` squeezes the clip's
  wind-up into `wind`, and at 0.30 s the side swing's second of clip ran at
  three times speed — a blur, then you were hit. Every startup now runs its
  clip near real time (0.52–1.08 s).
- **Three lights to stagger him, and a guard of his own.** `kind.poise` (3):
  a light swing takes its point and does not move him until the third; only
  a charge or the overhead rocks him at once. `kind.block` (0.36): a light
  swing thrown while he stands ready and facing you meets the bar — steel on
  steel, your tool jars, a beat of freeze, and he holds the `block` clip
  0.46 s before he comes on. The parry is untouched and the riposte still
  doubles: that is the fight. `fidgetK` / `fidgetGap` cut the between-swing
  bark to a fifth — a man does not roar at you.
- **THE BEACH DOES NOT REACH DOWN THE HATCH.** Every distance in the fight
  code is x and z. The three pack crabs followed the player to the lid, stood
  on the sand over the roof, and bit him through forty metres of earth — that
  was most of the "hit boxes are bad": damage landing while the Dealer stood
  idle. Anything that is not `kind.solo` stands off while `inBunker`, and so
  do the crabs. Measured: 27 hits a minute from 15 swings before, 0 hits
  while he was not swinging after.

**THE CUT IS A STRAIGHT LINE.** The first cuts rolled the blade over the top,
from pointing up on the near side to pointing down on the far side, and with
the pivot at the grip that is an arc: the tip rose over the upper middle
before it came down. The geometry is the lesson: a roll of Δθ through the
strike bulges the tip off its chord by L(1 − cos(Δθ/2)), and L is the whole
blade, so a straight line needs a SMALL roll — the blade already pointing
down the diagonal at the cock and turning only ~0.7 rad through the cut —
with the hands doing the travelling. The lip is across the tip, so it sweeps
a broad straight band. Both cuts run the same line, the heavy corner to
corner and the light shorter, and the numbers were SOLVED in the pane
(`__solve`: fit `side` and `lift` so the lip's middle lands on a target
screen point, then check the interpolated quarters), not guessed: the heavy
runs (0.86, 0.60) → (0, 0) → (-0.60, -0.76) at 16:9 and its quarters read
(0.54, 0.40), (0.31, 0.23), (0.13, 0.10). The hands are just off the right
edge at the cock, which is the price of a blade as long as the frame is tall.

**THERE IS NO BACKHAND, AND A LIGHT CUT IS A CLICK.** A backhand on the
second click was built — the forehand mirrored about the middle of the frame
(`mirrorSide`), leaving from the far hip where the first cut finished — and
cut on the owner's word: two cuts in two directions inside half a second read
as flailing, and the light cut is the swing you make most. It is right to
left every time, so you know where the blade is going before you click. The
light cut also ran a third quicker than the sand shovel's click and was
called too fast: it is the same 0.44 s now (`swingSecs`) — with the blade
crossing the whole frame there is more to see than in a chop, and it needs
the time. The heavy stays quick for a heavy (0.69 s against the chop's
1.24), because a katana is not a sledgehammer.

**THE GLINT IS A SPARKLE, AND IT MOVES LIKE ONE.** The first twinkle sat on
the tip and jittered — a lamp with a loose contact. Now the moment the charge
tops out the light RUNS the length of the cutting edge from the root to the
tip (`GLINT_SWEEP`), big and bright, and arrives; then it holds, breathing
slowly and turning slowly, and every half second or so on an irregular count
it POPS — a sharp brightening and a flick of spin, gone in a tenth of a
second — which is what a highlight does when the hand holding the blade
trembles. The texture is the drawn one: a hot core, four long tapering rays
and four short diagonals, as gradient strokes so the rays fade rather than
end, at 96 px so the taper survives the retro downscale.

**THE GUARD IS THE SAND SHOVEL'S, ON EVERY TOOL.** Held scoop-up, the
Military Shovel's block put the bar the wrong way up with the blade on the
wrong side, and the owner asked for the sand shovel's back. As the guard
comes up the tool turns back into the dig grip (a quaternion SLERP — an
Euler lerp across the flip swung it through the floor) and the arm is
shifted so the NECK sits where the sand shovel's does, since that tool
pivots there and this one pivots at the grip. Measured: both bars span the
same stretch of the frame. The overhead keeps the neck pivot too — the slam
was laid out on it and approved — so the model slides down the mount on the
overhead's own grip blend, the lip markers riding with it, as the hands
change to a two-handed hold.

**THE TRAIL'S FIRST SAMPLE FILLS EVERY SLOT.** The strip draws a quad from
slot 0 to slot 1 as soon as there is one sample, and slot 1 still held the
last point of the PREVIOUS swing. On the chop that point was next to the
blade and nobody saw it; on a cut that finishes at the far side of the frame
it was a ribbon the width of the screen on the first frame of the next one.

**THE GUARD BOUNCES, IT DOES NOT RATTLE.** A blow stopped on steel used to be
a decaying sine on `parryGlow` — loudest at the start and quieter after,
which is a rattle. `guardShock` is a real spring (stiff, lightly damped) that
the blow DRIVES: it overshoots, comes back through and settles, three visible
bounces on a parry and half that on a block, and it knocks the tool across
you as well as up. Sparks come with it — eighteen additive points in
`vmScene`, pooled, thrown from `trailTip`, warm because struck steel is — and
a solid hit drives the same spring, so the weight of a landed blow and the
weight of a stopped one are the same language. A parry's freeze went to
0.19 s: a parry that only made a noise reads as a lucky block, and a fifth of
a second of the world stopped with the sparks hanging in it is the game
telling you that you did that on purpose.

**THE OVERHEAD IS A SLAM.** Both hands past vertical and drawn back, a hang
at the top, and then a QUARTIC drop — not the cubic the other swings use —
so it covers the last half of the fall in a fifth of the time. It lands
like it: the longest freeze of any swing, the biggest trauma, the lens
punched, the CAMERA dropped ten centimetres and let back up (`slamDip`, your
knees, not the shovel — applied around the scene render and removed, like
`hitRoll`), the guard spring hammered, sparks, `sfxSlam` (a sub that hits and
a crack over it), and a burst of sand off the landing point whether or not
there was anything there. **AND FULL CHARGE SHOWS ON THE BLADE.**
`tipGlint` is a sprite parked on `trailTip` every frame — so it rides
whichever tool is in hand — that TWINKLES while `windFull`: a smoothed random
flicker in size and brightness, which is what a highlight on an edge does and
a lamp does not. `sfxWindFull` was already the ear's version of this; a charge
with no full mark is a charge you hold too long every time, and now you can
see it as well as hear it.

**A BLOCK COSTS WIND; A PARRY DOES NOT.** Holding a shovel across a blow
that hard takes something out of you, and it comes out of the bar you run
on — so a fight you spend blocking is a fight you cannot back out of, and
timing it instead costs nothing. That is the whole argument for learning the
tell. `BLOCK_COST` is a third of the bar per blow stopped; at empty the guard
drops, `gaspOut()` puts a breath through your teeth, and the right button
refuses to raise it again until a third of the bar is back. The gasp fires
ONCE per emptying — one on every press while the bar is flat is a stutter,
not a body.

**THE GUARD, AND THE PARRY.** Hold right and the shovel comes up across
you; a strike that lands on it does nothing at all. The first `PARRY_WINDOW`
(0.20 s) after the press is a parry instead, which cancels the attack and
puts `crabState.stun` on for 1.7 s. `PARRY_COOLDOWN` (0.55 s) is what makes
that window mean anything: without it the window opens on every press, so
mashing right click parries everything and the timing is worth nothing.
Mashing must never beat reading. Blocking is untouched by the cooldown — the
guard still stops the blow, you just do not get the stun — and landing a
parry clears it at once, so a win lets you act on what you earned. `blockStart` is measured from the PRESS,
not from whether the pose has settled — committing to the timing is the
skill, waiting for an animation is not. The two sounds must never be
confused: a block is a dull wooden knock, a parry is a struck-steel ring,
and that difference is the whole mechanic.

**A view model at -0.22 is behind the near plane.** `vmCamera`'s near is
0.01 and the arm rests at -0.62; pulling the guard in to -0.22 did not read
as "close", it made the shovel vanish. -0.56 and out to the leading side is
the pose that reads.

**Right click is the guard and NOTHING else.** A left button held under
`WIND_TAP` when the right came down left its wind-up latch pending; it fired
`startWind()` under the guard, and letting go of the left button landed a
heavy out of a block. The right-press clears the latch every time,
`startWind()` refuses while `blocking`, and the click handler ignores any
button but the left and any click made under a guard.

**FOUR SWINGS, DRAWN, NOT SCHEDULED.** One overhand on one clock was read
in two exchanges: the guard went up on a count. `MUT_ATTACKS` carries four —
the overhand, a fast swipe, THE HELD ONE (a second of hang at the top, so a
guard raised on the first count is a block, not a parry) and a lunge that
covers ground through its strike — each with its own startup, reach and
measured contact frame, and the pick is weighted random after the first
swing of a fight, which is always the overhand. A swipe chains into the
overhand (`chain` / `chainP`), once, with the second startup already under
way, so a parry is not the end of an exchange. Between swings it circles
(`strafeL` / `strafeR`, `MUT_STRAFE`) or steps back into the lunge, on a
cooldown drawn from a range. THE CHAIN IS DECIDED ON THE STRIKE, not at the end of the recovery — by
then the blow's own knockback had you out of range every time and it never
fired once — and the follow-up steps in through its startup. POISE: a plain
click into the last 45 % of a committed startup takes its health and does
not break the blow; a charge, a parry or a throw always does. It commits for the last fifth of every startup
— the turn stops — which is the timing a sidestep should have.

**ONLY ONE OF THEM MAY SWING AT A TIME, AND THE TURN IS HANDED OUT.** Three
tells at once is not three times the fight, it is no fight: nothing to read
and no answer that is not luck. `mutToken` is given, once a frame, to
whichever is in range and has gone longest without a swing (`st.wait`).
Letting them GRAB it instead was measured and was wrong: a cooldown scales
with `windK`, so the small fast one took nearly every turn and the big slow
one swung twice in a minute. Handed out, sixty seconds shares 11/10/7 with
zero frames of two swinging. Anything that cannot use the turn — stunned,
rocked, dead, or wandered out of reach — gives it back. The step back keeps
the turn through it and does not swing without it, which was the one path
that used to slip past. `mutSeparate()` pushes them off each other or the
three converge into one silhouette with six arms.

**AGGRESSION IS THE COOLDOWN, AND THE SPRINT MUST NOT STOP WHEN THE TAKE
DOES.** They stood about between swings; the gap between turns is a fifth of
a second now, scaled by `kind.aggr`, and the ones without the turn circle IN
to just inside their own reach rather than holding a polite ring, so backing
away from one is backing into another. The red one hits for TWO — you have
three — which is fair only because its startups are the longest thing in the
fight and its recovery the most punishable; the dark one chains twice, three
swipes on the end of each other. Thirty-two swings a minute, split 14/10/8,
one tell at a time. And they come through the cutscene at nearly twice speed,
so handing back at their walking chase speed was a visible gear change at the
exact moment that had to look like nothing happened: `st.sprint` carries it
over and decays across the next second and a half.

**"I BACK UP AND NEVER GET HIT" IS FOUR BUGS, NOT ONE.** (1) A startup that
stands still is a startup you outrun by holding S — they walk the wind-up in
now, at two thirds of a run, and stop only for the last fifth, which is the
commit. (2) At 4.1 the big one made 3.5 against a 3.4 walk; base speed is 4.6
and nothing is slower than you. (3) CIRCLING IS NOT CHASING: it closes at a
metre and a half a second while you retreat at three and a half, so a
creature that kept orbiting lost ground every time — it breaks off past reach
+ 1.5. (4) Every swing still costs ground (advance at two thirds, stand
through the recovery), so past eight metres a straggler is not fighting, it
is REJOINING, and it does that at 1.4x. Holding S for forty seconds went from
free to eight damage, eight dashes and most of the wind bar. `MUT_DASH` is
the closing burst at 8 m/s — faster than you can sprint — and it ends in a
swing, so a gap you open by running buys one exchange, not an exit.

**THE RIPOSTE IS WHAT A PARRY IS FOR.** A blow landed on one you have just
parried counts DOUBLE. Without it a parry only bought time, and time is not a
reward; with it, reading the tell takes half a seven-health creature off in
one swing. FEINTS are the other half: it throws the startup, gets most of the
way through and does not swing. There is no way to read that but to watch the
arm, which is the point — a tell you can answer on a stopwatch is not a tell.

**FIVE HIT POINTS IS THE DESIGN.** A light swing takes one and a charge takes
two, so it is three heavies at best and five exchanges at worst, and the free
heavy a parry buys is the whole loop — read the tell, take the stun, wind all
the way up, land it. Two would have made the parry a nicety. `MUT_STUN` (2.1)
is longer than a crab's for the same reason: what a parry buys has to be
worth going for. It hits for ONE, not two — `MAX_HP` is 3 and the danger is
meant to be its reach and its pressure, not two-shot deaths.

Everything else is the crab's shape: wake, roar (it does not move through it,
which is the beat that says what the rest of this will be), close, and the
three outcomes on the active frame. Four things particular to it: it faces
+Z after export, so `rotation.y = atan2(dx, dz)` with NO `+ PI` (the crab's
front is -Z); `skinnedBounds()` is the only measurement of it that means
anything; it is REMOVED from no list when it dies — a body goes down and
stays down, and gibbing a humanoid the way the shovel gibs a crab would be a
different game; and `damagePlayer` asks `nearestFoe`, not `nearestCrab`, or
a blow from this one knocks you away from a crab 300 m back up the beach.

**ONE GAIT FOR EVERY TRAIL.** `FOOT_SIDE` (0.26 m off the line, each foot
on its own side — a clear zigzag, left well left and right well right; at
0.16 the owner still read the trail as a line), `FOOT_STRIDE` (0.66 m) and
`FOOT_TOE` (0.12 rad out), off a photograph of a walk along a beach. The player's own prints (`stampFoot()` and the stride gate),
the trail behind the spawn to the drain (which used to wander on a sine
and stride 0.8), and the campsite trail all use them — a trail with a
different spacing reads as a different animal. The print quad is 0.31 m
across: a foot is wider than it looks.

**A thing you set down is the SIZE YOU FOUND IT.** `dropEquipped()` built
the world model by cloning the VIEW model, which is scaled and posed for the
hand — the shovel's is 0.48, and everything `holdable()` makes carries
whatever scale it was given — so a shovel you dropped came back half the
shovel you picked up. It clones `inspectModel` now: the object at the size
it was authored, and `inspectSetModel()` guarantees its own transform is
identity (it scales a wrapper, never the model), so it clones clean.

**A parry plays `assets/poise-broken.m4a` on top of the ring** (via the
`poise` sample bank) — it is a ripped Elden Ring effect the owner supplied,
so it is NOT redistributable and is credited as such. The block got heavy:
a sub thump under a quarter-second of low body, a mid crack through a
waveshaper, and the dead steel clank kept on top so it never reads as the
parry.

**A claw thrown far enough to read will shear.** The first wind-up put the
lead claw through 83 deg at the shoulder on top of a 72 deg swing and a roll,
and the skinning stretched it into a blade. The pose is worth less than the
silhouette: at about two thirds of that amplitude it still reads across a
beach and the shell holds together. And the claw has to ARRIVE on the contact
frame — the first build peaked at f12, three frames after the damage, so the
hit and the picture of the hit were 100 ms apart.

**AND THE GLINT'S LIFT SWAMPED THE ONE THING THE PROP IS FOR.**
`addItemShine` raises the emissive of every material under it, which is
right for a dark scan and wrong for a jar whose whole point is that it is
BLUE: at the stock lift the glass, the blood and the label came up together
and what stood in the sand was a pale bottle. `lift: 0.3`. The sprite is
what finds it in the dark; the lift only has to keep it off black.

**WHAT A THING DOES IS NOT A FOOTNOTE.** "10% Stamina Increase" was 0.62rem
and half-transparent under a name twice its size — the one line on the
screen carrying a mechanic and the easiest to miss on it. Body size, white,
and ruled off above and below so the eye stops on it; the examine screen's
copy went the same way. The katana reads "A Holy Blade".

**A SHINE IS A MARK IN THE AIR, NOT A DECORATION BOLTED ON.** The glint was
a sprite parented to the item at a local +Y, which is the same as world up
for everything that stands still — and is not for the one item in this game
that TUMBLES. The ring comes off the knight as a `PhysProp` and rests at
whatever angle it fell, so its own up can point at the floor. Measured where
it landed in the nave: ring at y 399.942 on a floor at 399.930, glint at
**398.573** — a metre and a third UNDERNEATH the flags, which is the owner's
"the aura is beneath the floor". The offset is rebuilt in world up every
frame now: take the root's own rotation out of it and divide by its SCALE,
because `makeNoticeable` blows a 20 mm ring up by 3.2 and a local offset is
in the root's units. Nothing static moves by a pixel; after, both sprites sit
0.512 m over the floor whatever angle the ring came to rest at.

**AND THE OVERHEAD LANDS NOW, BECAUSE THE REASON IT MISSED WAS THE ARMS.** It
was thrown twenty-seven times over four minutes and landed not once, and the
conclusion drawn was that `Great Sword Slash` is a chop this fight has no range
for. It is not: with the clavicles fixed it lands 12 of 17. The rising cut it
was replaced by is the last hand-authored swing in the set, reads worst of the
five, and is now the one that stays in the file and out of the draw. **A SWING
THAT NEVER CONNECTS IS EVIDENCE ABOUT THE RIG BEFORE IT IS EVIDENCE ABOUT THE
SWING.**

**AND HIS MIND IS AMNESIA'S NOW: HE LIVES HERE, AND YOU ARE IN THE WAY.**
Six modes. ROAM — he picks a bone pile to eat at (found by bucketing the
skull mesh's own vertices, not typed), a room to stand in, or somewhere
near where you happen to be, and goes there crawling, one leg in three up
on his hind legs. ACT — he eats, sits back on his haunches, stands and
looks about where the roof allows, or crouches and listens, five to fifteen
seconds, facing one way, which is how you get past him. INVESTIGATE — your
sprint carries 24 m, your walk 11, a crouch 5, and a landing, a swing and a
blade on stone say so where they happen (`catNoiseAt`); he comes and
searches. STALK — the owner's own brief: from across a room he does NOT
charge, he goes to a corner that can see you and puts his face round it
(`catPeekSpot`: a node 9 to 22 m off that can see your eye AND where a step
to one side of it cannot, which is what a corner IS, measured rather than
authored), and holds there. What turns that into a fight is YOU looking at
him — the middle of your screen, not the edge of it. FLEE — under a third
of his health, once a fight, he breaks off, runs for somewhere at least 22 m
from you, mends about a point a second, and comes back; `blooded` is set, so
the second time he does not peek, he simply comes. CHASE — the fight.

- **AND A MODE IS NOT RE-ENTERED BY THE THING THAT STARTED IT.** The sight
  check runs six times a second and set the mode to `stalk` again on every
  one of them, which reset the clock that ends a stalk and threw away the
  spot he was walking to: traced, he stood fourteen metres off doing nothing
  for ten seconds. A sight that arrives while he is already stalking only
  refreshes where he thinks you are.
- **AND "IS THE LINE OPEN" IS THE WHOLE LINE, NOT THE NEXT TWO METRES.** The
  chase dropped its route whenever the nearest 2.2 m looked clear, then walked
  into a wall three metres on, where the new segment clamp held him — a route
  made and thrown away four times a second at twelve metres. It asks as far
  as he can see now, and he closed 16 m to 5.2.
- **AND HE MAY NOT PASS THROUGH A WALL BETWEEN FRAMES** — the player's own
  rule, and the whole of "he clipped through the map running": the chase
  drove him at drawn stone at seven metres a second against a push that
  corrected 1.5 cm a frame. The frame's movement is a segment at his hip and
  his shoulder, and a frame that crossed a face is reverted.
- **AND A CORNER HE WATCHES FROM IS FURTHER OFF THAN THE RANGE AT WHICH HE
  COMES.** At five metres the peek spot was already inside the distance that
  turns a stalk into a charge, so he arrived and charged on the same frame
  and there was no peek at all.
- **AND A THING THAT REARS UP NEEDS A ROOF TO REAR UNDER.** His two standing
  blows put his hands 3.8 m up; a catacomb's rooms are 3.3. They are out of
  the draw wherever the storey he is on has less than 4.3 m over it.

Measured at the end. **The player's own walk floods 12,404 cells from the
landing with a standing body and reaches the barred door to within 0.1 m.**
Routes: 30 of 30, median 0.9 ms. **Fourteen seconds of live fighting with
NO frame over 16 ms** (before: 9.6 ms of routing several times a second).
The fight is 30 swings and 39 damage a minute at 2.5 m, against the Dealer's
48 and 40. He roams 140 m in ninety seconds. Hurt to 18 of 80 he breaks off,
mends to 40 and comes back. And the dev-mode trap caught a whole round of
measurement again: **`devMode` turns a creature's swinging off outright**, so
a fight sampled with it on reads zero swings and a creature standing still.

**AND UNDER ALL OF IT, A WATCHDOG.** Every stall this place has produced has
had its own cause and its own fix — a route begun across a wall, a pocket of
the graph nothing joins to, a lid taken for a step — and the next one will
have a cause nobody has thought of yet. `catWatch` is the floor under them:
a metre of ground in six seconds or whatever he is doing is not working. He
gets a fresh route first; a body that really cannot leave is put back on the
graph, and ONLY where you are not looking at it, because a creature that
teleports in front of you is worse than one that is stuck. An act is
standing still on purpose and a fight is fought at arm's length, so neither
counts.

**THE .44 MAGNUM, AND THE FIRST GUN IN THIS GAME.** Mozberg_log's
"Pistol-Magnum" (CC-BY-4.0, `assets/magnum.glb`, shipped exact — 6,372
triangles, one material, one 2048 map) on the trader's table for five blood
jars with three in the cylinder; six more rounds are two jars. Right click
aims, left click fires, `R` reloads, six to a cylinder. Its aim, reload and
recoil are posed against JUST's "Animated Magnum" (CC-BY-4.0) as REFERENCE —
nothing of that file ships. The shot is the owner's own recording and is not
redistributable.

- **DOWN THE SIGHTS IS THE POSE THAT CANCELS THE CARRY.** The view model's
  six numbers are offsets from `ARM_ROT_X`, `-0.45`, `0.10` and
  `ARM_SIDE * vmHalfW`, so aiming is not a number somebody chose: it is
  `[-ARM_ROT_X, …, -ARM_SIDE]`, the arm brought to the centre of the frame
  and levelled, and then `magSights()` does the last of it with
  `landBlade`'s own machinery — the REAR SIGHT projected by the main camera
  and unprojected by `vmCamera` at its own depth, so the sight line lands on
  the crosshair at any aspect and any field of view. Everything else about
  aiming falls out of that one pose: `MAG_ZOOM` off `wantFov`, the look
  sensitivity scaled by `(1 - magAim * 0.42)` and the spread closing from
  `MAG_SPREAD` to `MAG_SPREAD_ADS`.
- **A SPLIT-BY-INDEX MESH SHARES ITS SOURCE'S POSITION ATTRIBUTE, SO
  `Box3.setFromObject` MEASURES THE WHOLE MODEL.** The hoist's rule, on a
  prop: the gun and its six loose rounds are one mesh, so the body measured
  12,000 units instead of 4,360 and was fitted at a third of its size with
  the grip in front of the trigger guard. `part()` writes each split
  geometry's OWN `boundingBox` and `boundingSphere` from its own index list
  — and it has to, because the pack's icon and the examine screen are both
  framed against exactly that.
- **AND A PIVOT PARKED IN EMPTY AIR IS IN THE BOUNDING BOX TOO.** The
  speedloader was first left where the file drew the rounds (half a metre
  behind the grip, which in the hand is behind your head), then aimed at the
  cylinder's centre line, where it sat inside 4 cm of gun. It is parked AT
  the cylinder, offset onto the flank the hold turns toward the camera
  (model `+Z * span * 0.085`), and it travels in from `userData.drop`.
  `bwKeepHidden` is what stops `holdable`'s builder and `renderItemIcon`
  switching it back on — both force every child visible, which is right for
  everything else and would otherwise frame the icon against a loader
  standing in mid-air.
- **A HITBOX MUST BE ABLE TO CONTAIN A HEAD.** The first one was a sphere at
  half the creature's height with r = 0.72, which on a 2.4 m body tops out at
  2.09 m against a head that starts at 2.14 — headshots were not merely rare,
  they were unreachable, and a shot aimed at one flew 45 m past to the cliff.
  `magBody` is a proper capsule, solved as the closest approach between the
  shot and the body's own vertical axis (0.12h to 0.94h), with the head above
  0.74h. Measured after: 14 to the body, 31 to the head.
- **RECOIL IS A LENS SPRING AND A REAL AIM NUDGE, AND ONLY THE SECOND ONE
  COSTS YOU ANYTHING.** A spring alone is a picture of recoil that returns
  exactly where it started, so the second shot is free; `gunNudge(up, side)`
  turns the actual look, in radians, bypassing the sensitivity slider — so
  climb is a thing you fight. The spring is what makes it READ; the nudge is
  what makes it a weapon you have to hold down.
- **A MUZZLE FLASH IS A BLOB, NOT A STAR.** Four straight strokes is a decal
  stuck on the lens — the glint's own lesson. It is a nine-point irregular
  polygon over a hot radial core, and it PEAKS BIG AND SHRINKS
  (`0.16 + magFlash * 0.30`) rather than growing as it fades, because what
  the eye reads is the first frame. `spawnSparks` is no use to a gun: it
  throws from `trailTip`, which is parented to whichever DIG tool was last
  equipped. And its lamp is added to the scene AT BOOT at zero intensity, the
  pavilion's rule — a light entering the scene recompiles every material in
  the game, and since the Windows pass `lampReach` returns 0 at intensity 0
  so a dark lamp never takes one of the twelve slots.
- **AND THE PRESS FIRES, SO THE CLICK MUST NOT.** `attackAction` runs on the
  click that follows a pointerdown and would have put a second round out of a
  six-round cylinder every time; it returns early on `magHeld()`. The same
  goes the other way for the guard: RMB aims with the gun and still guards
  with the katana, and every path that drops the guard (pointerup, blur,
  `pointercancel`, visibilitychange, a pointermove with no button under it)
  drops `magAiming` with it.

**AND THE TRIGGER IS A BUTTON HELD, WHICH IS WHY IT WOULD NOT FIRE WHILE
AIMED.** The gun fired on the `pointerdown` and on nothing else, so any press
that did not arrive as its own event — one that lands inside the cylinder's
own half-second, one the browser swallows on its way past a button that is
already down — simply did not exist. `magTrigger` is the state: set on the
press, cleared by a `pointermove` with no bit 1 under it, by pointerup, blur,
`pointercancel` and visibilitychange, and read every frame in `updateGun`, so
a held trigger keeps putting rounds out at the cylinder's own pace and
nothing can leave it latched. The guard, the charge and the walk have each had
to learn this separately: **`e.buttons` is the ground truth and an event is
only ever a hint.** Measured with the trigger held down the sights: aim 1.00,
four rounds out in 1.7 s, the trigger clear on release.

**AND THE ROUND WAS LEAVING ALONG THE BARREL THE KICK HAD ALREADY THROWN
UP.** `magFire` applied `gunNudge` — up to two and a half degrees of real
look — and THEN read `camera.getWorldDirection` for the shot. So every
bullet went out along where the gun had just been kicked to, which at twenty
metres is the better part of a metre high, aimed or not, on every shot. A
bullet leaves before the gun kicks; the kick is what happens to the NEXT
one. Measured after, sixteen shots down the sights: **0.0000 degrees off the
crosshair**, with the lens kicking 1.64 degrees after each one.

**AND MOST OF THE CLIMB COMES BACK, OR IT IS A CATAPULT AND NOT A RECOIL.**
A PERMANENT nudge is the right idea — it is the difference between a gun
with recoil and a gun with a shake — and at two and a half degrees a shot
the whole cylinder walks you twenty degrees into the sky, which takes the
fight off you rather than giving you one. `magClimb` remembers two thirds
of every kick and `updateGun` gives it back at 0.55 rad/s once the shot's
own beat has passed. Measured, a held trigger through a full cylinder:
**4.1 degrees of net climb down the sights and 6.2 from the hip**, with each
individual shot still throwing the muzzle 2.2 degrees and settling.

**AND THE .44 IS BIGGER IN THE HAND THAN IT IS ON THE GROUND.** "Make the
magnum look bigger" is not a change to the gun: `MAG_LEN` is what the thing
MEASURES — what it is lying on the sand, on the examine screen and in the
pack's icon — and a .44 is 42 cm whatever anybody wants. `holdable` scales
only the CLONE, so `MAG_VM` (1.42) is one number and the world's copy never
moves. A gun is the one item here meant to dominate the lower right of the
frame; at 1.0 it read as a prop somebody was carrying. Two things came free
with it: the sights still land on the crosshair, because `magSights`
MEASURES the rear sight rather than assuming where it is — projected down
the sights at full aim it reads (0.0001, -0.005) in NDC, and the 0.40 cap on
the correction is nowhere near binding — and the muzzle flash is scaled by
the same number, because a flash is the MUZZLE'S and a bigger gun with the
old flash is a gun with a spark on the end of it.

**AND MORE RECOIL IS FOUR NUMBERS, AND ONLY ONE OF THEM COSTS YOU
ANYTHING.** The lens spring (19.4 from 13.6) is what you WATCH; the yaw
(12.4) is what stops two shots looking alike; the FOV punch, the trauma, the
view-model impulse and the held time (0.095 s) are the weight. The one that
is a WEAPON is `gunNudge` — 0.064 + up to 0.022 of real look, per round,
which is a thing you have to pull back down — and `magClimb` still gives
seven tenths of it back at 0.68 rad/s, or a cylinder walks you into the sky
and the fight is taken off you. Measured: each shot throws the muzzle
**3.7-4.9 degrees from the hip and 2.2-3.4 down the sights** (was 2.2-3.2
and less), and a full cylinder held down nets **6.6 aimed from the hip and
4.6 down the sights** — barely more than before, because what grew is the
throw and not the debt. Accuracy is untouched: 0.0000 degrees off the
crosshair down the sights.

**AND DOWN THE SIGHTS THE GUN CANNOT KICK OUT OF THE FRAME, BY
CONSTRUCTION.** `magSights` pins the rear sight to the crosshair every
frame, so at full aim the recoil is the MUZZLE pivoting about that pin —
measured, the sight holds (0, 0) for the whole shot while the muzzle flips
to +0.19 NDC and settles. The lens spring, the FOV punch and the real aim
nudge are what carry an aimed shot; the gun itself is held where you are
looking, which is what a sight picture is.

**A ROUND THROUGH THE HEAD IS NOT A BLOW YOU SHRUG OFF.** Everything else in
this game goes through `hurtMutant`, which is right — the poise pool, the
guard, the riposte, the committed-swing shrug and the wound all live there,
and every one of them is an argument about a thing ARRIVING at a body that
can take it. A .44 through a skull is not that. `magHeadshot` kills outside
that door — health to nothing and `killMutant` called directly — and
`gunHead` makes the burst CERTAIN in `finishMutant` rather than a roll: this
is the one blow in the game whose whole point is what it does to the head,
and an overkill die that comes up short half the time is a headshot that did
not look like one. `headPop` is opt-in, so the three on the beach and the
five past the door have it and the bosses do not — a revolver that ends a
boss on one lucky shot is a revolver that ends the fight rather than joining
it. Measured: a head hit bursts the skull and ragdolls the body on the frame
it lands; a body shot at the same creature kills it with the head still on.

**AND A MAGNUM KICKS LIKE A MAGNUM.** The spring's frequency is sqrt(K), so
dropping K lengthens the throw and the settle together — 235 against 330 is a
kick that goes up hard, hangs, and comes down over a beat you can watch.
Measured: the muzzle is thrown **6.2-7.3 degrees from the hip and 4.2-5.4
down the sights** (was 3.7-4.9 and 2.2-3.4), and a full cylinder nets 8.4 and
5.7. **And a kick that big has to LIFT as well as pitch**: the arm's pivot is
behind the fist, so pitching swings the muzzle up and the grip DOWN, and at
these numbers the gun left the bottom of the frame for a tenth of a second
(the rear sight to -1.05 in NDC, where -1 is the edge). The hands come up
with it: worst grip -0.90, on screen throughout.

**THE SHARPEN GRADES NOTHING, WHICH IS WHY IT SURVIVED WHERE THE POST CHAIN
DID NOT.** `sharpenFrame()` runs last in `animateFrame` (and after the examine
screen): the finished canvas is COPIED into a `FramebufferTexture`
(`copyFramebufferToTexture`) and one quad draws it back through AMD's
contrast-adaptive sharpen — a `ShaderMaterial` with no tone-mapping or
colour-space chunks, so bytes in are bytes out and the grade, the five
hand-tuned ShaderMaterials and the view model are untouched. It runs at the
RETRO resolution, before CSS upscales, so it sharpens the chunky pixels and not
the block edges of the upscale; CAS scales itself by local contrast, so flat sky
gets nothing and there are no halos round dark silhouettes. `SHARPEN` is fixed
at 0.5 with no slider, by the owner's word. Measured on the beach:
frame mean 20.60 → 20.57 (the level does not move), neighbour contrast 2.6 →
5.0, no GL error.

**THE INJURED RUN SLID IN A T-POSE BECAUSE A MEASURE STOPPED THE SWING.**
`updateMutFlee` scrubbed the three limp clips (`measureGaits`) on the frame the
creature broke off, and `measureGaits` stops every action and restarts only
what `isRunning()` — which is false for a PAUSED action, and a creature's
swing is exactly that: the combat clock holds it. So the swing vanished, the
run faded in over an empty mixer, and the body slid across the sand in its
bind pose. Three fixes: the limp clips are measured when they are BUILT
(`mutInjClips`), the measure restores anything that was active, and
`mutAnim` ends with the catacombs' own net — if the current clip is not
active it is put back, and if what is active adds up to less than a body the
current clip takes the whole weight. Measured on three mutants breaking off
mid-swing: every frame of the flee carries a full weight of 1.00 (it reached
0 before).

**THE SPARE PEG: A THRUST IS THE ONE SHAPE OF ATTACK THIS GAME DID NOT HAVE.**
Both shovels chop and the katana cuts; the katana's charged stab was one move
inside a sword, and a whole weapon built on it plays differently from the
first press — you stop sweeping the frame and start measuring a distance. It
is the fisherman's spare leg, out of the sea chest, and it is BUILT
(`models/spare-peg.js`). Almost none of it is new machinery: `thrust: true`
routes every swing through the stab's own slot in the pose system, and the
rest is per-tool numbers.

- **`slashing()` HAD TO LEARN THAT A THRUST IS NOT A CUT.** It means "this
  tool sweeps the frame", which every dig tool did until one of them went
  straight forward — left in, the peg blended into the cut's grip on the frame
  it wound up.
- **AND IT IS CARRIED AND GRIPPED THE WAY THE SWORD IS, WHICH IS THE
  GEOMETRY AND NOT LAZINESS.** Both are authored to the katana's convention —
  the fist on (0, 0, 0), the length running down -Y — so the carry that was
  SOLVED against the reference reel is already correct for a stick of the same
  length in the same hand. Guessed from scratch first, and what that rendered
  was the shaft coming end-on at the lens: a cream pipe filling the right half
  of the screen. **Measure what a pose already does before inventing one.**
- **AND THE VIEW-MODEL SCENE'S OWN LIGHTS ARE THREE UNITS, for the second
  time.** Ash at its honest colour renders as BONE in the fist, exactly as the
  katana's gunmetal did. Read the lights of the scene a thing will be lit BY
  before choosing its colour.
- **AND IT IS THINNER THAN A PEG LEG WANTS TO BE.** At the shaft's real 9 cm
  it filled the right third of the frame, because a thing in your fist is a
  hand's breadth from the lens and a katana's blade is 3 cm of that.
- **AND HOW LONG IT IS WAS DECIDED BY THE BOX IT COMES OUT OF.** Measured in
  the game, the chest's interior is 0.88 by 0.61, so a peg laid flat across it
  on the diagonal may be 0.82 including the socket's girth and no longer. Two
  tries at 0.97 both poked through the back corner or the crown of the lid. It
  costs the weapon nothing: how far a thrust REACHES is a number about the
  fight (`reach`, `reachK`), not about the model.
- **AND A "LONG" WEAPON HAS TO ACTUALLY REACH FURTHER.** Every tool shared one
  `digRay.far`, which was right while all of them were thrown from the same
  place. `reachK` is the tool's own multiplier and defaults to what it always
  was.

**AND THE STILL WAS RIGHT; I WAS READING THE WRONG THING OFF IT.** Having
measured that the peg is no nearer the lens than the Military Shovel, I told
the owner the two bad frames of the finisher were a club seen end-on for a
sixteenth of a second and left them. His answer was "fix it", and he was
right: the distance was never the complaint, the complaint was that the
weapon was not THERE. Two things about how it was found are general.

- **THE CONTACT SHEET'S OWN BRIGHTENING WAS MINE, AND IT WAS THE DISGUISE.**
  Every sheet in this round was drawn at `brightness(2.4)` so a night beach
  reads on a page — which turns a dark object into a pale mass and a small
  dark object into a pale blob. Judged unbrightened, AS THE PLAYER SEES IT,
  the defect is somewhere else entirely: through the hang the peg is a stub
  in the top corner and the wind-up has nothing in it at all.
- **AND "IS IT ON SCREEN" IS NOT A COUNT OF POINTS INSIDE THE FRAME.**
  Sampling twenty-one points down the shaft and counting the ones that
  project inside NDC said 86 % — while the picture showed a lump. Perspective
  is why: with the shaft pointing away from the lens most of its length
  projects into a few pixels near the near end, so the count is high and the
  SILHOUETTE is nothing. The honest measure is the screen-space SPAN between
  the two ends, and the way to be certain which of foreshortening and
  darkness you are looking at is to blaze the emissive for one run and look:
  blazed, it was still a stub, so it was never the light.

**AND ONE GRIP CANNOT SERVE A WHOLE OVERHEAD.** The arm turns most of a half
circle between the hang and the contact, so a grip is a different camera-space
direction at each end — solved at the contact alone (which is where it has to
be right, because that is the frame the blow lands on), the same grip pointed
the shaft straight AWAY from the lens at the top of the swing: camera-space z
-0.97, and 0.81 m of peg foreshortened into a stub. So the finisher carries
TWO grips, each solved in its own frame by the same method — read the parent's
world frame ON that frame, ask for a chosen camera-space direction, invert —
and slerped from one to the other over the drop (`PEG_OH_TURN`). The haul
HANGS the shaft down out of the off-screen fist and into the picture, which is
what a shovel's blade does for free and a club has to be told to do. Measured,
the peg's on-screen span through the hang: **0.75 → 1.91-2.31** NDC against a
frame two units tall, with the solved contact unmoved (hand (-0.11, 0.46),
point (0.06, -0.30)). **THE POSE YOU HOLD AND THE POSE THAT LANDS ARE TWO
SOLVES, NOT ONE** — the katana's own lesson, which said a cock is a pose you
hold so it has to be on screen, on a tool with no blade to read.

**AND THE PEG LEFT THE FRAME FOR MOST OF EVERY THRUST, WHICH `push` DID.**
The owner asked for the peg's hits to move the way another game's do, and
before any of that could be judged the weapon had to be IN the picture:
measured over the wind-up and strike frames of the three-hit string, both ends
of the peg were inside the frame on **18 %** of them, with the grip solved out
to NDC (1.64, -1.99) at the cock — most of a frame past the corner. The cause
is the one parameter of this pose set that is not an angle. `push` hauls the
fist toward the NEAR PLANE, and a point near the lens is magnified: the same
hand offset that reads as a comfortable low-right carry at arm's length is off
the screen a hand's breadth from it. The cock was re-solved with that in mind
and nothing else changed. **18 % → 100 %**, 37 of 37 live frames, no frame
with either end outside, string 0.99 s.

**A GRIP THAT IS ALREADY BLENDED IN CANNOT BLEND.** The finisher's own grip
is slerped over its drop (`PEG_OH_TURN`), which is right — and `ohBlend` is
already 1 by the time the third hit is thrown, so on the frame the finisher
started the TARGET grip changed under a blend that had nothing left to run:
measured, the peg's screen span collapsed 0.63 → 0.26 between two frames.
`PEG_OH_IN` carries the thrust's grip IN over the first fifth of the swing, so
the weapon turns out of the stroke it was in rather than appearing in a new
one. The general shape is the guard's and the cut's: whatever a pose is
blended FROM has to be the pose that was actually on screen.

**AND A THRUST HAD NO FOLLOW-THROUGH, NO RECOIL AND NO CONFIRM.** Three
separate omissions, all of them things the cut had and the stab did not,
because `slashing()` was the only predicate any of them asked:

- **the point stopped where it landed.** `STAB_THROUGH` and `stabThrough()`
  drive it on through — further out, the hand settling under it — the way
  `slashThrough` does for a blade. A spear that stops at the contact frame is
  a spear being POSED at something.
- **it came home on the cut's own easing.** `easeOutBack` overshoots, which
  reads as a blade settling and on a club reads as a bounce; a thrust eases
  out. And `bladeRate` IS A DIVISOR — it STRETCHES a swing, it does not speed
  one up — so `recoverK` 5.0 was five times the recovery, 0.65 s of the peg
  drifting home with the button dead. 2.4, and a tap may leave early through
  the blade's own `FORE_EARLY` door. The jab went 900 ms → 617.
- **and nothing said it had hit.** Every other weapon in this game confirms on
  contact (`hitConnect`, the guard spring, the lens); a landed thrust did
  nothing at all. It gets its own hitstop, trauma and FOV punch, scaled by the
  charge, plus a deeper `vmImpulse` — and they are a SEPARATE branch from the
  cut's, because a thrust's confirm is short and hard where a cut's is a roll.

**YOU GIVE THE LEG BACK, AND HE GIVES YOU A ROD.** The Spare Peg comes out of
the wreck's chest and it is the FISHERMAN'S, so the last thing to do with it
is hand it over: a `★I found your leg` choice on three of his nodes, gated on
carrying it, and he answers "I've been looking everywhere for this!" and takes
it. `models/fishing-rod.js` is the reward. Four things it took, and three of
them are rules this file already had:

- **A THING YOU HAVE GIVEN AWAY MUST NOT COME BACK.** The checkpoint restore
  REPLAYS pickup handlers and does not consult their `when`, so `pegReturned`
  is a save flag applied BEFORE the replay and the pickup's own handler
  returns early on it — the shell door's rule, and the smiling one's. Measured
  across a real save and load: pack `[syringe, Fishing rod]` both sides, the
  chest's peg no longer offerable.
- **AND `packByName` IS THE FLOOR UNDER THE REPLAY**, so the rod is in its
  list: an item granted inside a dialogue has no interactable to replay at all.
- **A TOOL HANGS FROM WHERE IT PIVOTS**, the katana's rule. Built from the
  butt, the rod's origin is 34 cm below the hand and it swung about a point in
  mid-air; everything is shifted down by `ROD_GRIP` so y = 0 is the grip.
  Measured with that done and `pos` at zero, the fist lands at NDC (0.58,
  -0.66) — where every other tool's does — against a first framing whose BUTT,
  REEL, GRIP AND SEAT were all under the bottom edge (y -1.46 to -0.97) and
  whose only visible part was bare blank.
- **AND THE ROLL ABOUT A ROD'S OWN AXIS IS THE WHOLE OF WHETHER THE REEL
  READS.** It hangs on local -Z with the guides, so the roll decides whether
  you see the spool's FACE or its rim: swept at -0.9, -0.5, -0.1 and +0.5,
  three of the four draw it as a pale wedge lying along the blank and only
  -0.9 turns the flange, the line pack and the handle toward the lens.

**AND A MEASUREMENT OF A VIEW MODEL HAS TO WAIT FOR THE ARM.** Two runs of the
same three-hit table came back 0.74 NDC apart, which made every comparison
noise. The look-lag and the landing spring are still ringing for a third of a
second after a `look()`, so the harness settles 22 frames before it presses.
And **`beachwalk.load` IS THE RESTORE KEY, NOT `beachwalk.loadMode`** — a
wrong key does not merely fail, it loads as `fresh`, and a fresh load DELETES
the save (`loadMode !== 'checkpoint'` at line 652), so the checkpoint you were
about to test is gone before you can read it.

**A BLOCK THAT STOPPED SOMEBODY ELSE'S BLOW IS NOT YOURS.** `dealerBlock`
jarred the tool in your hand, rang the guard spring, threw view-model sparks
and froze the frame — and the tavern's three block EACH OTHER, so every blow
turned aside in their brawl jarred your weapon from across the room. It takes
`mine`; a creature's block of a creature's blow is sparks and a clank where
it happened. The same pass found `hurtMutant` reading `digOverhead` and the
held tool for blows one creature landed on another (`OH = mine &&
digOverhead`), and the riposte prompt, the flinch direction and the
knockdown's lens kick all firing for blows that were not yours.

**THE BLOODY BLADE IS THE KATANA TO EVERY POSE.** ArtDan's "Espada
Ensanguentada / Bloody Sword" (CC-BY-4.0, `assets/bloody-blade.glb`, all three
maps kept, METALNESS kept and given `ringEnv()`). `fitBloodBlade` measures the
scan when it lands — the crossguard is the widest slice of the hilt, the grip's
axis the middle of the handle under it, the tip the far end of the blade — and
turns, scales and slides it into the katana's frame (grip at the origin, blade
down -Y to `KAT_TIP`, edge on -X), so every solved pose holds. `katLike()`
replaced every `equipped === katanaItem` in the move set; `bloodItem` is a `let`
declared ABOVE `restRot`, because a `const` read before its line is a dead zone.
Its passive is `desc` ("Amplified Gore 30%", `BLOOD_GORE`, which the label reads), and it earns it:
`gore` 1.61; `killBloody` is remembered at the kill like `killGore`; a killing
blow from it can take the HEAD without an overkill (half again the odds on a
heavy); every hit bleeds three to four times what the katana's does; and
`addSpurt` pumps blood on a heartbeat out of any stump, neck or fresh cut it
opens (`updateSpurts`, ordinary drops, so they land and stain).

**THE BLOODY BLADE'S EDGE IS TWISTED ONTO THE ENEMY, BECAUSE EVERY KATANA GRIP
PUTS IT SOMEWHERE ELSE.** Measured in view space off the katana's own solved
grips: the heavy THRUST carries the edge pointing at the sky (0.90 up) and the
carry has it turned back toward your own face (z +0.45). On a katana the edge is
a hairline and nobody could see it; this blade is a falchion with a wide curved
belly on the edge side, so the same grips held it upside down on every shift
heavy. `bloodFaceEdge` turns the blade about its OWN length inside the hand each
frame (`bloodModel.rotation.y` — the fit puts the blade on Y and the edge on -X,
so a turn of φ sends the edge to (-cos φ, 0, sin φ) and φ is one atan2) until
the edge points at a target in view space: down and a little forward through the
thrust, forward and away at rest, and not at all through a cut, whose grips were
solved to lead with the edge already. Two things it needed: **a half turn can go
either way round**, and one way swings the edge past your face — the way round is
chosen when the stab begins so the edge passes AWAY from the camera halfway there,
and kept until the stab has blended out; and **a stab is blended out of in its own
grip** — `katStabbing()` goes false the frame the swing ends while `ohBlend` is
still most of the way in, and the target grip then switched to the SHOVEL'S
overhead, rolling the sword half over between two frames of the recovery
(`ohWasStab`, which the katana gets too). Measured through two thrusts and a cut:
the edge never faces the camera by more than a cut's own sideways lead.

**AND THE BLOODY BLADE IS BRUTAL.** `BLOOD_GORE` is 0.30 (and the label says
so), the drop pool is `BLOOD_MAX` 1536, a hit bleeds five to five and a half
times what the katana's does, every cut takes a chip, a kill with it takes an
extra limb and throws more sprays and stains, the stumps pump on a heavier
beat (`addSpurt`, up to 40 at once), and a close kill spatters the lens
(`bladeLensSpatter`).

**THE CASE ON IT IS LIT FROM THE MOMENT YOU COME DOWN.** Its lock lamp was on
the +z side — the hinge side, facing the concrete — so nobody ever saw it;
the front is -z. Now: a bigger lamp with a halo, a pooled point light over
it, a pool of colour on the desk, a thin additive BackSide rim a few cm
bigger than the case (what reads across a dim room is a silhouette; a glint
at the retro scale barely moves the pixels — measured, a glowTex sprite at
full opacity raised a 40 px patch from 33 to 41), and the case's own
emissive pulsing. Red and breathing while he lives, green and strong once he
is down (with a depth-ignoring glint), all off when it opens or spills.

**THE MARAUDER IS HARDER, AND AT HALF HEALTH HIS BLADES CATCH FIRE.** 62
health, poise 16 (it was 96 and 20, and the owner found that a slog), a stronger guard, shorter recoveries, the spin takes two,
and more of a combo counts (`comboGrace` 0.28). His tells are untouched.
The rage now quickens everything, his swings included — which needed the
rage branch to RESCALE `u.atk`, because `windK` is applied once when the
unit is built — and calls `kind.onRage`: `umbraIgnite` samples each sickle
off his skinned mesh in its hand bone's own frame (the vertices whose
dominant bone is the hand, clear of the hand), and `updateUmbraFire` burns
one Points batch of flame tongues and embers along them in the world, so a
moving blade trails fire. A pooled orange lamp rides the blades, a catching
roar announces it, a low crackle follows him, and it all dies out after him.

**THE MARAUDER LIGHTS HIS OWN BLADES, AND THE FIRE IS ON THE STEEL.** The old
fire was 360 big soft tongues rising a metre off every blade — a cloud he
fought from inside, which blurred your vision and hid the one thing you read.
His three sickles are rigid meshes (`AttireMetallic`) under `Blade*` nodes —
NOT bones, so `o.isBone` never finds them — so the steel itself is sampled,
each vertex with how far along the blade it is (local y 4.12..25.55 of a 0.0347
scale, 0.74 m). The steel GLOWS (`umbraHeatSteel`: a clone of its material,
dull red at the spine to white-orange at the edge, crawling); the licks are
small and live a sixth of a second, emitted between last frame's blade and this
one's so a swing leaves one clean ARC; a lick nearer the lens than ~1.2 m fades
out and no sprite may be bigger than a thumb on screen; thin dark smoke comes
off the steel. `uIgnite` is his second wind (`kind.rageClip`/`rageDur`, which
the rage branch now honours for any kind): arms thrown wide, the two front
blades crossed in front of his face at 0.58 and drawn apart edge on edge to
their tips at 0.86 — sparks at the measured closest approach of the two edges,
`sfxBladeScrape` — the fire catches where they crossed and runs both ways along
the blades, one burning flourish, and the scream at 1.9 in a low crouch with
all four blades out. The two crossing poses were SOLVED on his rig (coordinate
descent on the arm angles against the Blade/BladeTip nodes); two traps doing
it: the mixer does not restamp an unchanged pose, so each trial must put every
bone back on the stance itself, and the solver must compose each joint's turns
in `poseRig`'s own order (up, right, fwd) or the pose it finds is not the pose
the clip plays. His fire's three programs are compiled when he loads
(`kind.warmMore` → `umbraWarmFire`, from `dressMutant`), not on the frame he
lights it. Measured: zero new programs and no frame over 20 ms through the
ignition.

**ICONS POINT UP.** The sand shovel and the katana carry `iconRot.flip`
beside the Bloody Blade, so all three lie hilt/handle lower-left, blade
upper-right; the Military Shovel already did and does not flip.
`ICON_CACHE_V` is 'v3'.

**THE HEAVY SURVIVES A LOCK LANDING MID-PRESS.** After a checkpoint load the
press that takes the pointer lock back is often the press you meant as a
heavy. The pointermove "no button under a charge" release (for a lost
pointerup) runs only while the pointer is FREE and not in the first 120 ms of
a press; a lock that goes away releases the charge instead; and an unlocked
press is `setPointerCapture`d so a free-pointer drag that leaves the canvas
still delivers its release. (Not reproduced in the pane, which cannot lock:
the path was made robust.)

**THE GUARD IS POLLED EVERY FRAME, BECAUSE A CHORD HAS NO POINTERUP.** The
Pointer Events spec fires pointerdown only for the FIRST button to go down and
pointerup only for the LAST to come up; everything in between is a
`pointermove` with a new `e.buttons`. So hold the guard (right), click to
swing (left), let go of the right first — and the guard's `pointerup` never
comes. The move-based check was gated on `!locked`, so under the real lock the
sand shovel stayed up across the screen until you pressed right again. `update`
now drops `blocking` whenever `mouseBtns` (the window's capture listener) has
no bit 2, the gun's own arrangement. The harness's `blocking` setter sets and
clears that bit with it, or the poll undoes it on the next step.

**THE BLOODY BLADE BLEEDS (`bleedBuild`, `bleedProc`, `updateBleed`).**
`hurtMutant` is now a wrapper round `hurtMutantCore`: if the blow was yours,
with the Bloody Blade, did not kill, and actually took health (a block or a
guard takes none and builds none), `st.bleed` goes up 1 (1.7 for a heavy or
an overhead). At `bleedMax(u)` — `(3.2 + min(2.8, hpMax / 28)) * kind.bleedRes
* (1 + 0.33 * procs)` — it bursts: `BLEED_PCT` (12 %) of max health, never
under 2, a burst of blood out of the whole body and `sfxBleedBurst`, and the
meter starts again. Held `BLEED_WAIT` (2.2 s) untouched it drains over
`BLEED_DRAIN` (3 s of a full meter). Measured: a pack mutant dies before it
matters; the knight bursts every 5-7 blows for 5, the marauder (`bleedRes`
1.35) after nine for 10 and then twelve; the parasites (1.4) and demons (1.25)
resist too. There is NO meter on screen (a teardrop by the bar was built and
taken out on the owner's word). The burst is `bloodCloud`, matched to the
owner's Bloodborne clip (frames pulled with ffmpeg): 1,400 fine crimson specks
(`bcSpeckPts`, round with a hot middle so they read as droplets catching the
light) blown up and out with heavy air drag, and 48 torn puffs of dark red
mist (`bcMistPts`, the spliff's `smokeTex`) that billow to 2-4 m and hang —
two draw calls, pooled. A sweeping blood-crescent version was built first and
the owner called it corny: what he wanted is an EXPLOSION of fine blood, not
a shape. It neither freezes, flashes nor flinches him.

**A WHIFF IS A SWING THROUGH THE AIR.** `digImpact` wraps `digImpactCore`,
which returns whether the blade met anything; the thrust's lunge, the
view-model jar, the sparks and the overhead's slam (sound, sand, freeze) all
wait on it — the slam used to throw sand at `landPoint()` "whether or not
there was anything there". And a stab tests the sand and the solids only out
to `stabReach() + P * 0.5 + 0.35`: at the full swing reach a stab made looking
a little down found the beach four metres out and played a hit. To see a sleeping horde mutant in the pane at all
you have to pin its `visible` (`Object.defineProperty`), because the horde is
hidden until its take.

**A CHORD HAS NO POINTERDOWN, AND THAT WAS "IT WON'T LET ME BLOCK".** The
spec fires pointerdown only for the FIRST button down, so right pressed while
left is held (mid-click, a charge) was a pointermove and the guard never came
up; a right press over a HUD element never reached the canvas either.
`raiseGuard()` is the guard's one door, called from the canvas's pointerdown
and from the window capture listener on the rising edge of `e.buttons & 2`.
And a brushed wheel in a fight put a fang or the CD in your hand — the guard
needs a weapon, and a click with a `clickInspect` item opened the examine
screen and dropped the lock ("the game clicks off"): in `inCombat()` the wheel
walks only `onDig`/`gun` slots and a click never examines. The eight `mutant.glb` kinds get +1 hp, x1.12
`aggr`, x1.04 `speedK` and +0.05 `press` in one loop after `MUT_KINDS`; the
marauder is 80 hp, the parasites 43/39, the demons +1 each.

**THE BLEED IS JETS** (`bloodJets`/`updateBloodJets`): 5-7 streams per burst
emitting ordinary blood drops every frame along a whipping direction at 8-15
m/s pulsing on a beat, and every blood drop is now drawn stretched along its
velocity (the render loop in the blood update), so a stream is a stream. The
fine specks are 320 and dark; `BLOOD_MAT` is a wetter 0x520908 with a 0x280404
lift, `BLOOD_MAX` 2304. **And the shift heavy whooshes** (`sfxHeavySwing`,
from `startDig` on `digOverhead || katStabbing()`): the blade's recorded swing
pitched down, or a deep rush of air.

**A SWING FINDS THE BODY (`meleeT`).** Every creature was a 0.85 m sphere at
half its height, so a cut at a tall thing's head or legs missed and a cut a
hand beside it landed. It is the gun's capsule now: the aim line against the
creature's axis from 0.06 to 0.96 of its height, radius 0.6 (or 0.85 of the
kind's `hitR`), and `meleeBlocked` refuses a blow through a wall
(`ehpBlocked` in rooms, the dock/rocks/wreck on the beach). The shift thrust
reaches `stabReach() + 1.4 + P` to a body rather than the full swing reach
(it found things 6.6 m away), and `DIG_HEAVY_REACH` is 1.9 (was 2.4).
Measured on a demon from 2.2 m: head, chest and shin all land, 1.1 m beside
misses.

**AND HE THROWS STARS (`samThrowStep`, `updateShuriken`).** Every 8-17 s (7-14
enraged) he takes the first gap in his own pressure: a 1.45 m step back on his
walk played backwards, then `sThrow` — a clip whose left arm is SOLVED, not
posed (coordinate descent onto hand targets measured off his shoulders: belt,
cocked by the right ear, out in front, through), fitted within 3-10 cm. The
star is in his hand from the belt, glints and rings at the cock (the tell), and
leaves at `SAM_THROW_AT`; enraged he sends two. It is the bolts' rule: held
guard stops it for more of the bar than a cut; the parry window sends it back
into him for 5; taken, it is 2. It does not home. The beat owns his feet and
clip (`holdAnim`) and anything that rocks him ends it. **A random chance a
second never fired** — he is almost never free between cuts — so the cooldown
is what keeps it rare. `tools/samstrip.js` has the strip, fight and contact
harnesses (`__samSetup`, `__samStrip`, `__samFightSetup`, `__samFight`,
`__samContact`).

**THE THROW IS A WHIP.** Up behind his head and held (the star glinting there
is the tell), then a short snap out and a follow-through across his body, with
the whole MODEL's yaw turning into it and past square (`SAM_THROW_YAW`) —
twisting his spine would leave his root-chain shoulders behind. No hip dip:
on this rig a lowered pelvis separates from the thighs.

**AND THE SHIFT HEAVY THREW GREY.** The overhead's slam scattered sand clods
off the landing point on every connect, a body included. It does not now;
`hitFlesh` also keeps the slam's sparks off flesh. The sand you dig still
throws its own.

**THE .44 STUNS HIM** (`gunStun`, `kind.gunStun` 1.7): a round stops the
swing, the chain and the charge and he reels for 1.7 s, then 1.8 s in which a
round hurts but doesn't stun, so a cylinder isn't a lock. Not the young one.

**THE MARAUDER CAN BE SHOT; HE TURNS SOME** (`gunBlocks`). A round lands
unless he deflects it: 45 % when he is awake, facing you and not swinging, a
third of that mid-swing, never with his back to you, asleep, stunned or down.
`kind.gunBlock` may be a number to set a kind's own odds (`true` is 0.45).
Measured over 2000 draws each: 0.46 facing, 0.15 swinging, 0 from behind.

**THE .44 RELOADS THE WAY A REVOLVER DOES IN CALL OF DUTY.** The cylinder is
its own part now. The loader measures it (the vertices fat off the frame's
centre line, between a fifth and three fifths of the gun's length) and cuts it
out of the body into a pivot, `magCrane`, hung under it on the barrel's axis.
The pivot's `userData.cyl` holds the cylinder's rear x, its centre and its
radius, in the model's units. The reload is keys (`MAG_REL_KEYS`, eased,
`magRelPose`), with a jolt on each beat:
- roll the gun over and swing the crane out (`MAG_OUT` 0.15);
- muzzle up, slap the ejector, and the fired cases fall out of the frame
  (`MAG_EJECT` 0.33: `magEjectBrass` in the view-model scene, `sfxMagEject`);
- muzzle down, and the speedloader comes up behind the swung-out cylinder,
  goes home and is twisted (`MAG_FEED` 0.64);
- a flick of the wrist snaps it shut (`MAG_SHUT` 0.79, `magCraneAngle`).
The speedloader's path is worked out from the crane's own angle every frame.
2.7 s end to end. Only the castle's trader sells rounds, and only once
(`TRADER_STOCK.ammo` 1, `AMMO_V` 3). The whale thanks you as it backs into the
sea, not while you are inside it, and more quietly.

**THE SPARE PEG IS A RAPIER, AND ITS MOVES ARE ITS OWN TRACK (`pegTrack`,
`PEG_KEYS`, `PEG_GUARD`).** The owner's word was that the thrusts read weak
and like every other weapon. It is held EN GARDE (fist low right, point just
under the crosshair) and every attack is keyframes of the six arm numbers plus
a grip, with the contact at `DIG_STRIKE`: JAB (a small draw, the arm
straightening down the line, `in` easing so the contact is the fastest frame),
DISENGAGE (the point dips under and comes up the other side, so the second
hit is a different line), LUNGE (coiled at the shoulder, and `pegLungeTick`
owns the velocity like the dodge step: 1.35 m forward with the camera
dropping). No slash any more: `thrusting()` is every stage, `pegFinish()`
never answers. The string is TAPPED (`pegQueued`) and chains at `PEG_LINK`.
And it has the other weapons' three kinds of hit: a click is the string; a
HOLD charges (the latch arms for it like every tool) into stage 4, the
CHARGED LUNGE — coiled back past the shoulder (`PEG_COIL`), released into a
lunge whose step is 1.2 + 1.0 x the charge; SHIFT + hold is stage 5, the
IMBROCCATA — raised by the temple (`PEG_HIGH`) and driven down onto the
target, no step. `pegWindPose` blends guard -> coil/high on `pegHighK`;
`releaseWind` picks the stage; stages 4 and 5 start at `DIG_WINDUP` from the
held pose (`pegT0`). `pegLunging()` is 3 and 4, `pegHeavyBlow()` is 3-5. Damage 1 a thrust, 2 every heavy; `reachK` 1.34 (a lunge
x1.15 more, and the charge adds 0.8 m, NOT the heavy's 2.4 — stacked, a full
lunge landed at 9.5 m): jab ~6.4 m, imbroccata ~7.5, charged lunge ~8.9
including its 2.2 m step, against the katana's 5 and 7.5. **A thrust
that pushes the fist far from the lens looks weak** — at 1.36 m out the peg is
a stub in the middle of the picture; the hit keeps the fist 0.86 m out with
the shaft 37 degrees off the view axis. The poses were SOLVED against screen
targets with `tools/rapier.js` (`__rp.solve`, `__rp.sheet`), which measures
through the game's own `updateViewmodel(0)` with the guard set to the trial
pose — so a swing left half-run makes every measurement read the swing.

**THE ROD CASTS (`rod`, `updateRod`, `rodArmPose`).** Click: back over the
shoulder, whip forward, the float launched from the tip on the fastest frame,
lofted so it always goes up and out (~20 m), into the surf (`waterSurfaceAt`,
it rides the swell, sits in its own rings, nibbles now and then) or onto the
sand; click again reels it in with the ratchet. **For a rod carried tip-up,
POSITIVE arm pitch stands it up and back** — the first build had it the other
way and cast by standing the rod bolt upright. The line is in the world and
the rod in the view-model scene: `rodTipWorld` carries the tip over by its
screen position (projected by `vmCamera`, unprojected by `camera` at the same
depth). **A slack line is a short drop and then the water**: sagged by a
fraction of its span it hung metres under the sea and never met the float;
the sag is capped and every point is held on whatever is under it. Put the
rod away or change rooms and the line comes in (`rodHome`).

**THE RAPIER'S LIFE, AND ITS RIPOSTE HASTE.** Keys alone put the point on
the same line every time; `pegOverlay` lays `pegVar` (drawn per swing in
`startDig`) over the track — a wandering line peaking at the contact, the
wrist turning over (pronation) as the arm straightens, a small circle as the
point comes off the target, a twitch of anticipation before the draw — and
the guard rides the walk. The string has a real window (`PEG_COMBO_WINDOW`,
550 ms after a beat ends), because a click only counted during the
extension before and a normal clicking pace never got past the jab; the
`FORE_EARLY` re-click door carries the stage on too. A PARRY with the peg in
hand (`pegParryHaste`, called from `parryMutant`, `parryCrab`, `parryBolt`)
gives `PEG_HASTE_T` 5 s of `PEG_HASTE_K` 1.35x swings and charge, shown by
the full-charge glint on the point; it is in the item's `desc`.

**THE RAPIER'S STRING WAS RE-SOLVED FOR TRAVEL AND ANGLE.** A thrust that
lands where it started reads as a twitch: the point has to cross the screen
(0.18 -> 0.45 NDC), the draw is OFF the line with the shaft pointing up its
own line, never within 38 degrees of the view axis, fist at least 0.66 m
out. The peg scan also carries the rocks' rim (`reexpose`, cold) so it is a
shape against a black sky, the trail is fainter on it (0.55), and the first
crab of the pack shows the fight controls. `updateViewmodel` clamps its dt
to 0.05: the guard spring (K 640) explodes on the harness's big steps and
every pose measured under it was nonsense.

**A SWING IS TESTED ALONG ITS ARC (`sweepDirs`).** One ray down the committed aim missed
anything a hand to one side that the blade visibly passed through, and anything that moved in
the 150-200 ms before contact. The crab and creature tests now try the committed line, then
where you are looking at contact, then a fan across the cut (yaw for a cut, pitch for an
overhead, none for a thrust), nearest the middle first; the body radius went 0.60 → 0.66.

**THE HEALTH RING FILLS YOU UP (`hpCharge`)** from wherever you are to the new full, 0.85 of a
point a second with a tick per point and the bar glowing; a blow stops it where it is.

**ARTIFACTS: SET INTO A WEAPON, NOT HELD OR WORN (the section just above
`animate();`).** `whaleArtItem` (`artifact: true`) leaves the pack and rides
the weapon (`weapon.artifact`); attach from the pack's pane ("Set in · X"),
by dragging it onto the weapon (`findRecipe`), or with Use while holding one.
A weapon leaving the pack gives it back (`artOnWeaponLeaving`, not on a load).
The Artifact of the Whale rises out of the belly's floor in a gold shaft once
the seven and the two are dead (`artState` 1), and the farewell waits until
it is taken (`artState` 2); save flags `whaleArt` / `artOn`, and a save past
the farewell from before this is handed one. THREE LANDED BLOWS IN A ROW
(`artCount`, from the `hurtMutant` wrapper; a whiff breaks it via
`artAfterSwing`, 3.4 s gap breaks it) IMMOBILIZE what you hit, Wukong-style:
`st.immob` pauses the mixer (`timeScale` 0), `updateMutantUnit` returns into
`artHold`, `artPin` holds the position after everything else has moved it,
and three shells on the creature's own geometry and skeleton (`artOutline`: a
clip-space gold line, a glow, a rim sheen) hold with it. Blows on it skip
every reaction (`artHitFrozen`, ×1.35; a heavy ×1.7 and shatters it). 3.2 s
(2.3 on bosses), `ART_CD` 10 s, three pips by the health bar. **Two traps:**
`renderHotbar` runs at module time, so anything it calls must be a function
declaration, not a const arrow below it; and `window.__bw` is created AFTER
this section, so its handles are assigned in a microtask.

**A .44 ROUND IS BUILT (`makeCartridge`)**: a rimmed case with its extractor
groove, a sunk primer and a copper semi-wadcutter. Six stand in a ring on a
built loader (`makeSpeedloader`, the cylinder's own chamber radius) in place
of the scan's loose rounds; the ejected brass is the spent case; the shop's
icon is rendered from six of them like every other item's.


**THE DOJO'S KATANA IS TAKEN LIKE ANY ITEM.** A full pack says "Inventory
Full" and the sword stays on the statue (`needsSlot` on the interactable,
which `packFullFor` now asks for things that are not `'inventory'` kind).
With room, it takes the hotbar slot of whatever you are holding, and that
thing moves to the first free slot past the hotbar (else any free slot).

**ONE PRESS IS BUFFERED (`swingBuf`, `SWING_BUF` 0.32 s).** A click after the
blow has landed (`digImpacted`) that no branch of `attackAction` takes is held
and fires on the first frame the swing may be left (a blade at `FORE_EARLY`,
anything at the end of its swing). Only one, and only after the contact, so
clicks during a wind-up are still dropped and nothing swings on its own
later. Measured: a click at digT 0.6 chains a swing; three clicks at 0.15 do
nothing.

**FULL BLADE DETECTION (`bladeSweep`, `bladeHitMutant`, `blade`).** Every
frame of the strike (the trail's own window), points along the weapon from
the grip to its edge (`BLADE_F` 0.6/0.8/1.0 of grip→edge middle, plus both
trail markers) are projected through `vmCamera` to the screen, and each — and
its path since last frame, in three steps — is a ray from your eye out to the
swing's reach (`meleeReach`). A creature that ray passes within its BODY width
(`kind.body`, else 0.6 × `hitR`, ×0.95 + 0.08; `meleeT`'s 4th argument —
`hitR × 0.88` was sized for the old single ray and was a metre round the
samurai) is struck: the first fires the whole impact on the next frame
(`digImpact` takes `blade.first`), every other body the cut crosses is cleaved
once (a lighter confirm). The fan of rays no longer finds creatures for a
swept weapon; crabs, drones and corpses keep it. The rapier is excluded.
Measured (katana, cut right to left, 2 m): dead ahead hit at digT 0.47, 15-30°
right at 0.26-0.43, 30-45° left at 0.52, 65° and 6 m nothing; one cut through
a body at 25° right and another at 20° left hits both, at 0.26 and 0.47.
**Trap:** temp names — `_bsV` already existed (a `const` at module scope in
the creature code) and redeclaring it killed the page; these are `_bld*`.
**Harness:** in a HIDDEN pane nothing loads unless frames are pumped
(`__bw.frame` in the wait loop) and `beginGame` refuses until `startGate().startReady`.
