# The tavern

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**THE DECK EDGE IS WHERE THE PLANKING IS.** The deck's geometry takes its x
from `hullPt` — rake included, nearly two metres forward — but the walk was
clamped on the raw station, so at the bow you stood behind an invisible
wall short of planking you could see and the bow flanks looked wider than
you could walk. `deckHalfAt(lx)` inverts the rake now off a table built on
first use (`buildDeckEdge`, needing `rakeAt` and `hullPt` on `SN`), and the
deck's floor and end clamps run in the planking's frame. **AND THE LADDER
WELL HAS A LIP.** Its floor is the ladder, a ramp to the hold, so a step
across its side from the deck put the ladder two metres under your feet —
"falling off" on a deck with an unbroken bulwark. It is solid on three
sides from deck height and open only at its head, and anyone already on
the ladder is below deck height and walks through all of it.

**A TWO-HANDED BLOW AIMS BOTH HANDS.** `aimBar` corrected one chain — the
nearer claw — which on the red alien's lunge left the aimed arm 5 degrees
off the line to your chest and the other 43, one arm at you and one at the
sea. `A.twoHanded` runs the same shoulder turn on both. His tells are a
fifth longer, every contact pose has the arm straight with the shoulder
rolled forward, and `barLen` / the reaches grew to match; the three
reptilians are 1.72 / 2.58 / 2.14 m tall now.

**AND THE BENEFIT OF THE DOUBT WENT TO WHICHEVER LIMB HAPPENED TO BE NEAR
YOU.** `blowLands` falls back to "he is facing you, you are in reach, his
hand is out in front" — and `best` was the minimum over EVERY chain the
creature owns, so a right-hand punch could be scored on the LEFT hand simply
because it was hanging within a metre. What the player sees is a blow landing
while the fist that threw it is nowhere near them: the owner's "there is a
right swing that hits you when it's not even close". A swing already declares
which chains it strikes with (`A.limbs`, the same indices the aim uses) and
the fallback asks those and nothing else. `LAND_SLOP` is a kind's own number
too — a metre was set for a man with a crowbar whose bar finishes inside a
quarter of a metre, and on a creature measured landing 0.30-0.45 m from the
chest it is most of an arm's worth of charity.

**THE HEALTH BAR.** Three hairline segments in the bottom left in the HUD's
own language — no frame, no number — dim red while you are whole (0.42) and
brighter the more of you is gone, with a flash on the hit. It is the only
colour on the screen, which is what makes it read. Driven from `updateHurt`,
so it runs under the harness too.

**YOU MEND, AND THE RED STAYS WHILE YOU ARE HURT.** `MAX_HP` is 3 and a hit
used to be forever, so the third exchange of the night was a one-hit death.
`REGEN_DELAY` (12 s) without being hurt and a point comes back, then one
every `REGEN_EVERY` (8 s) — `sinceHurt` / `regenAcc` in `updateHurt()`, reset
by every `damagePlayer()`. And `#hurt` no longer fades to nothing: under the
hit's spike it settles to a faint breathing rim, 0.14 + 0.24 per point down,
so you always know you are hurt without a bar. `updateHurt()` therefore runs
every frame now; it used to return early when the flash was spent.

**A CUTSCENE HANDS YOU BACK A FIGHT, SO IT HANDS YOU BACK A FULL BAR.** You
cannot block, sprint or breathe through a take, and the run TO the trigger is
often what emptied it — so the opening exchange was decided before you had
your hands. `catchBreath()` on the end of every one.

**A LOOSE FIST READS AS AN OPEN HAND.** At 0.62 rad at the knuckle the
fingers curled without ever closing and the bar sat in a cupped palm. And
`stamp_grip` puts ONE finger pose on a whole clip, which is right for a man
already holding something and wrong for the one clip that is about picking it
up: he reached with the fist already made. The pickup keys its fingers per
frame — open on the way out, shut on the frame the game moves the bar into
his hand.

**A SOLVER ONLY BUYS WHAT YOU CHARGE IT FOR.** The reach for the crowbar was
a coordinate descent whose only cost was distance to the bar, and the
cheapest way to put a hand on a low table is to hinge at the waist — so it
drove `lean` to its limit, 69 degrees, and he went down over the table like
a man being sick, chest and forearm inside the wood. A person bends their
KNEES for something at thigh height. The knees were in the parameters all
along; they were simply never worth using. A quadratic cost past a
comfortable lean and the pose comes back at 29 degrees with his head up.

**AND THE BAR YOU SPEND IS AT THE BOTTOM, ON ITS OWN CENTRE.** Two things.
It was four pixels of ten-per-cent white at a quarter opacity — a scratch,
for the meter the block, the sprint and the step all come out of; it is
eight pixels with a visible track and a hairline, and never below half. And
the PROMPT has left the strip: a flex row centred as a whole is re-centred
by whatever is widest in it, so every label that came up shoved the bar
sideways, which is the one element that has to be in the same place every
time. It sits above the strip on its own centre — and it can be
`position: fixed` out there and could not in there, because an ancestor with
a `transform` contains a fixed child, the same trap `#promptmid` already
carries a comment about.

**"STUCK IN THE GROUND" WAS A FLOOR NOBODY COULD STAND UNDER.** The storey
repair puts back a level a cell's neighbours agree on, with the roof the
NEIGHBOURS see — so under every table, the bar and the rack's shelves it
wrote flags with a roof twelve metres up while the table's underside is
eighty centimetres over them. The walk then offered those cells, the camera
duck read the drawn roof and put the eye at knee height. `pruneTavStoreys`
asks every storey what is drawn over it (`keepDrawnFloor`, five points, up
to 1.30 m) and drops it: 2,894 gone, and every one of them was a place you
could walk into and not stand up in.

**THE BAR FIGHT MOVED TO THE BAR, AND THE POCKET BEHIND ONE IS A DEAD END.**
"Make the sea-keep script event be by the bar with the meat — they are in the
wrong spot." They were: the two stood in the middle of the floor on the rug.
There is exactly one bar in this hall and it was never typed in, it was PROBED
— a downward raycast on a half-metre grid over the whole floor, asking what
surfaces stand between 0.7 and 1.45 m. One answer is seven metres long: a top
at 0.99 running x -1.5..-0.75 by z -6..+1.5 against the east wall, with the
kegs behind it and, let into the wall at z = -2, the shelf of cuts that is the
"meat". Wong stands in the barman's pocket, the drunk at the rail, and the meat
is the backdrop to the whole beat.

- **AND THE POCKET IS 0.65 m BY 3, SHUT ON EVERY SIDE.** Measured with the
  walk's own standability test: the counter one way, the kegs at one end, its
  own return at the other. A creature put there could never reach the fight —
  which would have been the owner's "they keep getting stuck" made worse, not
  better. He does not walk out of it: he VAULTS, which is what a barman does
  and what his own file already had a clip for. It is a scripted beat and owns
  his position and his mixer for its length (the knockdown's arrangement), so
  nothing else can argue with it.
- **AND IT WAITS FOR YOU.** The bar is seventeen metres from the door, so on
  the old clock the drink went across, the glass went down and the fight was
  under way before the player had taken ten steps. Nothing starts until you
  are within `TAV_SCENE_NEAR` of the drunk.

**AND A LEDGE WITH A BREAK IN IT IS A PLANK.** "Put a barrel to get to the
first concrete tunnel, then a piece of wood plank to walk to the other side —
make the plank have physics and you have to lift it and lay it down." Where
the break is was measured rather than invented: out of the gallery at 5.3 m a
stone ledge runs east along the south wall, 4.53 where you drop onto it easing
to 4.14 at x = -4.5 — and then NOTHING from -4.25 to -2.25, with the flags four
metres below, and 4.36 again at -2.0 running on to the east wall. Two and a
quarter metres of air.

- **THE PLANK IS A REAL BODY** (`makeProp`), so it falls, you pick it up with
  E, you carry it up the crates and you can throw it off and go back down for
  it. LAYING it is its own verb at the break, under the crosshair, because a
  2.7 m board dropped by hand onto a 0.4 m ledge is a board in the hall.
- **AND IT IS A FLOOR THE KEEP'S OWN WAY.** `S.extra()` is the hook the moored
  boat and the hoist's car already use; the plank joins it and every question
  the walk asks answers with it, with no second code path.
- **AND A HEIGHT IN THIS ROOM IS OVER THE FLAGS, NOT OVER `TAV_Y`.** Written
  as `TAV_Y + top` the board's floor sat three metres under the hall and the
  walk never saw it, while the drawn plank was somewhere else again. Every
  height in here is `TAV_Y + TAV_FLOOR + …`. Measured after: the walk along
  the ledge stops dead at x = -4.44 without it and reaches -1.44 with it.
- **AND A RUNG IS ONLY A RUNG IF SOMETHING IS ABOVE IT.** The barrel's spot is
  searched for, not typed: the nearest place to the stack's foot that is the
  FLAGS, has a body's room round it, nothing drawn overhead — and something
  0.95-1.60 m up within a stride, or it is a barrel standing in the open
  rather than the first step of a climb.

**AND EVERY CLOSE SWING IN THE TAVERN IS `real` NOW.** Their clips are about a
second and the startups they were mapped onto are longer, so the whole wind-up
played at a fraction of real speed — SCP-096's "slow-mo" on a third creature,
and most of what "the animations look weird" was.

**AND THE BLOW HAS TO ARRIVE AT YOU, WHICH IS A DISTANCE YOU MEASURE.** Caught
on the frame the game deals the damage, over a fight played hands-off at the
bar, the striking chain's nearest joint against the player's chest:

| | before | after |
|---|---|---|
| wPunch | 1.34 m | 0.87 |
| wJab | 0.72 | 0.47 |
| dButt | 0.76 | 0.29 |
| dSwipe | 0.92 | 1.10 |

`lungeStop` was 1.10 against a 0.45 m body — 0.65 m of daylight outside his own
shoulders, with `landSlop` giving him the benefit of the doubt anyway, so the
game said he hit you and the picture said he did not. 0.84 and 0.55, `aimK`
1.40 to 2.90 (these are real Mixamo arcs, not poses solved against a target, so
they pass wider than an authored swing — the samurai needed 2.60 for the same
reason), and a per-swing `stop` on the straight punch, which was the worst of
them. The drunk's sweep is still wide and is the one left to fix. Measured
after: 46 damage a minute against the Dealer's 40, and 11 % of frames still.
Health came down with it — Wong 28 to 15, the drunk 34 to 18 — so the bar
fight is over in twenty seconds and whoever wins can be finished.

**AND A ROUTE OVER A GRID OF POINTS IS NOT A ROUTE A BODY CAN WALK.** The
tavern's routing grid asked `keepWallNear` at 0.34 m while a fighter's own
clamp uses 0.675, so the route threaded gaps the body is too wide for.
Measured hands-off from the spawn: the drunk won the bar fight, set off after
the player, and ground to a halt **7.1 m short of him** on a cell the route
called clear and his own body was inside — and a path that exists and cannot
be walked is worse than none, because the progress test only re-issues it.
Asked at the body's width (`TAV_G.body`) the arena is 1,279 cells of 1,486
and every one of them can be stood in. Measured after: the survivor crosses
the whole hall and closes to **0.60 m** at the spawn, and lands.

**AND NOBODY FIGHTS FROM A POCKET.** Flooded from Wong's own spot behind the
counter, 17 of the hall's walkable cells were reachable: the barman's pocket
is 0.65 m by 3 and shut on every side, so whoever stands in it can route
nowhere and the fight simply stops. The Dealer's `mainRegion` on a bigger
room — the largest connected piece of floor is the arena, and anything off it
is walked back on at a stride a frame. It costs nothing anywhere else,
because on the arena it never runs.

**THE PLANK IS A FLOOR WHEREVER IT LIES, AND A RAMP WHERE YOU LEAN IT.** It
used to be a floor only once it had been laid across the break — so the board
you carried about was a thing you could not stand on, which is the one thing
a plank is for. Its top surface is sampled along its length into a chain of
little boxes the walk reads like any other floor: flat where it lies flat,
and a STAIR where it is propped, which is what makes a ramp walkable without
the walk having to learn about slopes. Measured on the hex-crate stack: it
props from the flags at 7.42 to a lip at 8.70 and climbs in 11 cm steps, 7.65
→ 8.80, walkable end to end. The prompt cannot live at a fixed spot — the
ledge is wherever you are looking — so its proxy is MOVED to whatever lip is
in front of you each frame, between a big step and a body's height and near
enough for the plank to span.

Three things it took, and the first is general:

- **A BODY MAY NOT STAND ON ITSELF.** The plank publishes its own top as a
  floor, and the floor lookup a body does for ITSELF then finds it, rests on
  it, and climbs a tenth of a metre a frame for ever: measured, it went up
  eight metres before the first frame was drawn. `_selfProp` is set round the
  floor queries in `PhysProp.step` and the plank's own boxes are withheld
  from it.
- **PINNED, NOT DEAD.** A body laid down as a floor is masonry while it lies
  there and a body again the moment you pick it up — `dead` cannot be picked
  up, and the one thing a thing you put down has to let you do is take it
  back.
- **AND A ROOM OF DRAWN STONE IS NOT A BOX.** `confine` is four planes and a
  lid, which is the bunker; a tavern is arches, a counter, a rack and a
  stair. A body may carry its own `wall` — the same drawn-face push the walk
  is held by. Measured: hurled at 26 m/s down the hall the plank stops at
  x = -19.77 against a wall at -20.4 and rests 0.09 m over the flags, where
  it used to go through both.
- **AND THE ROUTING GRID IS NOT THE PLANK'S FLOOR.** The floor cache is
  cheap and is redone whenever the plank moves; `TAV_G` is 2,242 cells of
  `keepStandAt` and `keepWallNear` and may only be rebuilt when the plank
  comes to REST somewhere that matters.

**LIQUOR ON THE BAR AND ON THE TABLES.** Glass has broken in this game since
the beach floats went in, so a bottle is almost nothing: a lathe, a label,
and the same `makeProp` that gives every prop its pick-up and its throw. What
is its own is the SHELF — a body knows one ground and a bar top is not it —
so each carries a `floorAt` that answers for its own perch and stops
answering the moment it is knocked off it, which is exactly when it should
fall. Break the table under one and it lands on the flags and goes there.
Twenty of them, every spot asked of the DRAWN floor rather than typed.

**A BAR FIGHT DOES NOT STAY AT THE BAR.** A pair of fighters hold their own
distance and nothing ever moves the PAIR, so the two of them circled each
other on the spot they started on for the whole fight. The pair has a
wandering anchor now — a cell of the arena picked every five to ten seconds,
at least five metres from the last — and while they are each other's problem
they both lean toward it. Measured: the fight ranges over 9 m of x and 6.6 m
of z instead of 2. **AND NEVER THROUGH A SWING**: the first roam moved both
of them on every frame including the strike, and a blow measured against a
body that is being slid sideways lands on nothing — forty seconds of
fighting and not one point of damage between them.

**AND A JITTER ON BOTH IS NOT THE SAME AS A DIFFERENT WINNER.** Rolling each
one's health and aggression independently left Wong winning anyway, because
his move set out-damages the drunk's whatever the health. The roll that
matters is WHICH OF THEM has the night: one is favoured heavily (+25 %
health, +40 % aggression, +30 % guard and a 45 % chance of a two-point
blow) and the other is not, with a jitter over the top so no two fights run
the same length.

**AND A MAN HOLDING HIS DISTANCE MUST NOT STRIDE STRAIGHT AHEAD — the oldest
animation bug in this file, found in the drunk.** His `strafeL`/`strafeR`
were both the WALK, so the half of a fight he spends circling was a man
walking forwards while travelling sideways. The Male Drunk Pack ships no
sideways stride at all, so what he circles on is the nearest true thing it
does have: a walk on a CURVE one way and a backward one on a curve the
other, which on a man this far gone reads better than a side-step would
anyway. Both rates come off the clips' own measured travel, as everything
else here does.

**AND PUTTING THE PLANK DOWN IN FRONT OF A LEDGE IS PROPPING IT.** The verb
under the crosshair stays, but nobody should have to find a prompt to do the
obvious thing with a plank and a step. The reach grew to 3.3 m and the rise
to 2.35, which is the most the stepped floor boxes can carry at the plank's
own length. Measured on the stall roof: it props from 11.00 to the vaulted
passage's lip at 12.82 — a 1.82 m rise over a 2.04 m run — and you walk up
it and in.

**AND A SHELF ON THE STOREROOM WALL.** Measured, the roof of the stall reads
3.56 over the flags and the passage's floor 5.30 — a 1.74 m step, where a
jump lifts the feet 0.62 and the walk catches a floor 0.72 over them, so
1.34 is the most anybody can get up without the plank. A bracketed board
halfway up that face is 0.87 either side of it, which is a jump twice; and a
shelf by the mouth of a store is what would be there anyway, which is the
whole of making it look like the room rather than like a step. Both floors
it stands between are asked of the DRAWN geometry, so it cannot be built
where there is no step. Measured: roof 11.08 → shelf 11.99 → passage 12.82,
each one inside a jump.

**AND THE PLANK IS A HALF-LIFE PUZZLE, NOT A PROMPT.** "Lay the plank across"
at the break and "prop the plank as a ramp" at whatever lip you were looking at
were both built and both deleted: what the owner asked for is to put it there
himself. So there are no verbs and no snapping, and what took their place is
the one thing the body had never had — **a LENGTH**.

Every other prop in this game is a point and a radius, which is right for a
bottle and is exactly why a three-metre board lay half inside the masonry in
every screenshot. It is sampled along its axis instead, and all three questions
are the same question asked eleven times:

- **what holds it up** — `floorAt` is asked at the middle and answers for the
  whole board: the support under each sample less that sample's own height
  above the middle, and the highest of those. Across the gap that is the two
  carpets; against a step it is the step.
- **which way it lies** — the end with nothing under it FALLS, an accelerating
  turn about the end that is bearing. Nothing is told what a ramp is: drop it
  against a step and it becomes one, drop it across the gap and it lies flat.
- **what stops it** — the drawn stone at every sample. **THE BAND IS OVER THE
  BOARD, NOT ROUND IT**: read at the plank's own middle it takes in the last few
  centimetres of whatever the plank is RESTING on, and the two carpets it is
  meant to bridge are cloth hanging as vertical as a wall, so the board was
  shoved off the very thing it had just landed on and fell into the gap. And it
  is the **deepest sample, asked again — never the sum**: a plank lying across
  two posts is pushed one way at one end and the other way at the other, and
  the resultant of those is nothing at all (the Dealer's chair, in timber).
- **ELEVEN SAMPLES, NOT FIVE.** At five they are 0.8 m apart and a pier between
  two of them is a pier the board lies straight through. Measured over 104 drops
  round the hall, with five samples and a summed push 26 came to rest with drawn
  stone inside the timber; with eleven and the deepest-first push, **6**, and
  every one of those is a board wedged between two posts.

Held, it points where you look and rides level, so you aim at the gap and the
board is already across it. Measured end to end on the real path — stand at the
west lip, look across, carry, let go — it lands at 4.38 spanning the break and
the walk east over it runs from x -5.4 to +0.7 without a fall. It costs 0.01 ms
a frame.

**AND A BODY IN A ROOM YOU HAVE LEFT DOES NOTHING.** Nothing gates `physProps`
by distance, so the moment you sail home every bottle on the tavern's bar and
the plank on its ledge lost the floor that was answering for them and fell six
kilometres to the beach's own zero. `opts.room` is a body's own "am I in the
room", checked first in `step`.

**AND THE SHELF MOVED TO THE END OF THE WALL YOU ACTUALLY WALK TO.** It stood at
x = -11.0, a stride from the crate that already climbs the same 1.74 m step from
the stall roof to the vaulted passage — two ways up in the same place and none
at the end the owner was standing at, which is why he was propping the plank
there. At x = -9.4 it splits that face too: 3.56 → 4.47 → 5.30, each one inside
a 1.34 m jump, measured by jumping it.

**WHERE A BOARD COMES TO REST IS A LINE OVER ITS SUPPORTS, AND THAT IS AN LP.**
The first physics plank asked its two ENDS what they were standing on and turned
about whichever was bearing. That is right for a board lying across a gap and
wrong for every other way one can land — a lump under its middle with both ends
free, a step under a third of it, half of it on a crate — and what it drew was a
board hanging level in mid-air with one end in the stone, which is what the
owner photographed.

Write each sample's support as a point (u, h) in the plank's own frame. The
board is the line y = c + m·u, it may not pass through any support, so
c + m·u_i >= h_i for every one of them, and gravity picks the lowest middle:
minimise c. Two variables, c(m) convex and piecewise-linear, so the minimum is
at a breakpoint — a line touching two supports — or at the steepest slope a
plank may lie at (0.97; past that it slides rather than standing on end).
Fifty-five pairs over eleven samples is nothing, and it is exact: the board
rests on the UPPER CONVEX HULL of what is under it. `floorAt` is the same line
EVALUATED at the slope it is lying at now rather than solved, so the centre
follows the turn instead of snapping. Nothing is told what a ramp is: measured
over 104 drops round the hall, 15 come to rest as a slope, and the one over the
bar's edge runs 0.09 → 1.45 and walks end to end.

**AND THE SHELF IS GONE.** It was built to split the 1.74 m step from the stall
roof to the vaulted passage into two jumps, then moved along that wall, and the
owner's word the second time was to take it out. The file's own crate on the
roof climbs the same step, and the plank climbs it from anywhere, which is the
point of carrying a plank.

**THE CLIMB STOPPED ON ONE CRATE, AND THE PLANK WOULD NOT LIE AS A RAMP.**
Three reports, and the first two are one arithmetic each.

- **A RUNG AT THE LIMIT OF A JUMP IS A RUNG THAT DOES NOT WORK.** A jump lifts
  the feet 0.62 and the walk catches a floor `TAV_AIR` (0.72) under them, so
  1.34 m is the tallest step there is — and the barrel rack's top is 3.53
  against a crate whose top was 2.21. **That is 1.35.** One centimetre, and
  the route to the gallery ended on that crate, which is where the owner was
  stuck. Nor is 1.34 any better: the window in which a ledge is both catchable
  and not a wall is then the last centimetre of the arc and there is no time
  inside it to travel. The crate is the rung, so the crate is what changes —
  a taller box, top 2.49, which splits 1.44 → 3.53 into two jumps of 1.05 and
  1.04 with a third of a metre of arc to spare on each. Measured after: every
  rung of the climb reached, the rack from the crate on 8 of 9 approaches.
- **AND THE PUSH-OUT AND THE STEP-UP MUST USE THE SAME TOLERANCE — the beach's
  own rule (`ROCK_STEP`), which the keep's walk never got.** `up` is a stride
  on the ground and a JUMP in the air, and `keepWallPush` always read the
  standing step: airborne, anything more than a stride over your feet was
  still a wall pushing you off it. Measured, that capped what anyone could
  climb onto at 1.08 m against the 1.34 the jump reaches. It takes `up` now,
  and the island gets it too — where it also means a bank you are wading out
  of stops shoving you back into the sea.
- **AND THE CROWN WAS WRITTEN INTO THE WRONG FUNCTION.** "A lip is not a wall,
  which is a question about the face's own crown" was added to `dojoWallNear`
  and never to `keepWallNear`, so every reader here got `undefined` — and
  `undefined < anything` is false, which made every kerb, step and stall lip
  in the tavern a full wall to the plank. **The one rule that lets a board lie
  ACROSS a step had never once run**, and with it off the ramp cannot form at
  all (measured: pitch 0, the board flat on the floor, from every stand-off).
  And a hand's breadth of slack — the number this file used to claim — is
  0.08 m of stone through the top edge of the timber: a lip is something the
  board lies ON, so the crown may stand no higher than the board's own middle.
- **A STATION IS A BOX, AND A BODY COMES OUT OF A BOX THE SHORT WAY.** The
  cross-section rule answered a face DEAD AHEAD of a station — which is what
  the riser of a step is to the station leaning on it — with the FULL
  half-width sideways, and five iterations of that walked the ramp a metre and
  a quarter off the ledge in a single frame. That is the board "flying away"
  the moment it is put down. Each station is 0.32 m of board by 0.46 across,
  and it is ejected along whichever overlap is smaller. **And the plan axis has
  to be a UNIT vector**: `a` is the axis in SPACE, so its horizontal part is
  only cos(pitch) long, and every distance measured against it came out a
  fifth short on a ramp — the along-tolerance GREW exactly as the board
  steepened, which is precisely when it must not.
- **AND WHICH WAY OUT IS A MEASUREMENT, NOT A DERIVATION.** Three readings of
  the same code, over eighty drops round the hall and sixteen carry-and-drops
  at the step: skipping the shallow-along case ships ramps and 8 of 80 boards
  with their centreline in stone; the old across-only push ships 3 of 80 and
  only 3 ramps in 16, sliding half a metre sideways in 6 of them; pushing
  ALONG when along is shallower ships **4 of 80 (the same as before this
  round), 6 ramps in 16 and not one board that slides**. The obvious variant
  was the wrong one and only the sweep said so.

**AND THE TAVERN IS THE THIRD ROOM TO NEED `clampPlayerToRoom`.** The bunker's
lesson, then the dojo's, now this: `updateTavern` reverts a step that leaves the
walk, and a creature's knockback is applied from `updateMutant`, which runs
AFTER it. Measured over three minutes of being hit by the orc, the player was
walked **thirteen metres out of the hall** — and then the fight simply stopped,
because a tavern creature is clamped to the arena and cannot follow, so the two
of them stood six metres apart doing nothing for the rest of the sample. A
measurement that ends with the fighters becalmed is measuring the room, not the
fight.

**THE ORC AT THE DRUNK'S SHOULDER, AND THE GREAT SWORD PACK ON HIM.** Oscar
Creativo's orc (CC-BY, `assets/orc.glb`) stands behind the drunk through the
whole of the drink, and the moment the glass goes through the floor he is in
it: two against one, they put the barman down, and then they both turn round.

- **HE IS SHIPPED EXACT, AND THAT IS NOT LAZINESS — IT IS THE ONLY WAY HE
  SURVIVES.** 305,522 triangles over 29 meshes at 17.2 MB. The decimation this
  repo uses for a rigged character is a Blender round trip, and this rip will
  not take one: **its inverse-bind matrices are IDENTITY and its rest pose is
  carried entirely by the NODE TRANSFORMS**, so Blender's importer rebuilds a
  different skeleton and writes that back. Measured on the round-tripped file,
  the right upper arm came out with a 175 cm offset from its own clavicle, the
  bind collapsed onto the origin (every bone at (0, 0.01, 0) — Wong's, for
  comparison, has its head at 1.59 and its hand at (0.36, 1.2, -0.56)), and
  every clip retargeted onto that exploded: arms out sideways, the sword two
  metres in front of his chest. `bone_heuristic='BLENDER'` does not save it.
  **If a rig's bind measures as nothing, stop packing and look at the file.**
- **AND HALF THE FILE WAS A TURNTABLE.** 32.3 MB, of which the shipped `Motion`
  clip was **14.9** against 11.7 of geometry and 5.4 of texture. He needs none
  of it — his bind is sane, and every clip he fights with is retargeted — so it
  goes, and with the metallic maps (METALNESS IS A TRAP, the sixth time) 450 MB
  of source becomes 17.2.
- **AND A CHANNEL THAT DRIVES SOMETHING THE PACKER HAS DROPPED IS A BROKEN
  CHANNEL.** The morph targets go with the attribute rebuild and the tracks
  that drove their weights stayed, so Blender's importer walked into
  `obj.data.shape_keys.id_type` on a mesh with no shape keys and died before a
  triangle arrived. `gltfpack.py` drops those channels now, and `--no-clips`
  drops the lot.

**AND THE MAN THEY ARE BOTH ON KEEPS HIS OWN NUMBERS.** The nightly roll is
between the PAIR — which of them carries the fight — and Wong was getting the
loser's 0.70 every time simply because he could never be the favourite:
measured, he went down **a second and a half** after the glass broke and the
beat went past before you could read it. Two against one is what decides it
now. Measured: the fight opens at 5.3 s, Wong is down **14.9 s** later, and
both survivors lose their foe on that same frame.

**AND A BIG MAN WITH A LONG BLADE FIGHTS FURTHER OUT.** At the tavern's own
`body` (0.45, a man) and `lungeStop` 1.45 he held 1.16 m and **107 of 122
contacts landed off screen** — a two-metre orc standing on your toes puts every
blow under the picture, which is the knight's own lesson wearing armour. At
0.72 and 2.10 it is 69 of 129 on screen. Measured over three minutes against a
player who stands still: **43 swings and 43.3 damage a minute**, all six of his
swings used, the sword hand finishing a median 0.76 m from the chest. The
Dealer is 48 and 40.

**THE ORC SPUN AFTER HIS SWINGS, AND IT WAS THE AIM'S BODY YAW.** `aimBar`
turns the MODEL into a blow by the bearing of the striking end — right for a
crowbar, and measured on a two-metre sword: the moment the blade sweeps
THROUGH you the angle from his origin to the tip flips sign, so the model went
from -103 to +104 degrees between one frame and the next (153 and 168 degrees
of yaw in single frames, on every cut), and then unwound at the fade rate. At
`aimK` 2.60 the yaw had 104 degrees of authority to do it with. Three things:

- **A BODY TURNED INTO A BLOW STAYS TURNED.** The yaw tracks you only until
  the commit (four fifths of the wind, where `turn()` also stops), is HELD
  through the strike and the recovery, and when the swing is over — or the
  next one begins — it is ADDED to the heading and the model zeroed in the
  same frame, which nobody can see; `turn()` then brings him round at
  `turnMax`, which is a turn and not a snap.
- **AND THE TRACKING IS A TURN TOO.** The cock draws the blade across his
  body, so the tip's bearing crosses yours partway through the wind-up and the
  correction flips sign: -14 to +24 degrees between two frames. It may change
  no faster than `turnMax` a second now.
- **`yawK` IS ITS OWN NUMBER.** The shoulder may need 2.60 to close a metre
  on a real Mixamo arc; the body does not need to turn 104 degrees to help
  it. 0.75 on the orc (28 degrees), and his `turnMax` is 3.4 — the tavern's
  5.2 rad/s on two hundred kilos read as a man on a swivel.

Measured hands-off over fifty seconds: mean yaw per frame 8.8 degrees became
1.55, frames turning more than 20 degrees 108 became 21 (all of them the
spin's own root turn or the wind-up's crossing), swings and damage unchanged.

**THE TAVERN DREW THE OCEAN, AND ITS CHAIRS WERE A HUNDRED AND FIFTY DRAW
CALLS.** Profiled by hiding each scene child in turn, standing in the hall:
466 draw calls and 530k triangles, of which 115,200 were the OCEAN twelve
kilometres away (bigger than `SKYLINE_R`, in no far-prop list, so nothing
ever culled it), 325k the orc (shipped exact, and staying so), and 150 the
chairs — ten boxes each over fifteen chairs, for furniture, in a hall whose
own stone is a hundred and forty. `cullWorldInHall` runs for the tavern and
the keep as well and every frame from `animate`, so the restore on the way
out cannot be missed; a chair is ONE merged mesh until it breaks, with its
parts kept as data so the break builds each piece where it stood. 466 → 322
calls, 530k → 356k triangles.

**AND A TAVERN CREATURE NEVER LEAVES THE ARENA; A STEP OFF IT IS REFUSED.**
"They teleport back after running past the curtains and get stuck" was the
walk-back: a body off the main region was slid toward it at five centimetres
a frame, which is three metres a second of a creature moving without its
feet, and where the chase kept pushing it off — a 0.58 m bench it can step
onto that the grid excludes, the player standing somewhere it may not go —
the two argued for ever. The last place it stood ON the arena is remembered
and a frame that leaves it is put back there, a frame's step; the slide
stays only for a body with no such place yet. And `tavRoute` searches the
ARENA, not every free cell, so a pocket off it is never a destination.

**AND THE SHELF IS BACK, ON THE ONE STEP NOTHING CAN CLIMB.** A bracketed
board hung between the stall's roof and the vaulted passage once and was taken
out on the owner's word, because the file's own crate climbs that step. This
is a different wall: the back of the gallery, where the floor reads 5.30 over
the flags and the landing in front of the bore 7.42. A jump lifts the feet
0.62 and the walk catches a floor `TAV_AIR` (0.72) over them, so 1.34 is the
tallest step in that building and this one is **2.12** — the plank was the
only way in. Halfway up it splits into two jumps of 1.06, which is the rung
the crates already prove.

- **NOTHING ABOUT IT IS TYPED.** The line is walked until the floor stops
  answering, the landing is asked how far it runs each way, and the face it
  hangs on is a ray. And it is walked OUT OF THE BORE, not down the hall:
  started from the gallery the first step the line meets is the one the last
  crate already climbs, and the first build hung the shelf on that one
  (measured, at (-11.50, 4.44)) — which is the wall the owner had already had
  it taken off.
- **AND SOLID IS A THICKNESS.** `KEEP_WALL_MIN` is 0.12, under which a face is
  a sliver the wall index drops, so a 55 mm board is a floor on top and open
  air from the side and you stand inside your own shelf. The apron under its
  front edge is what a shelf has anyway and is 0.13 deep, so the front stops a
  body the way a crate does — and the two rules then agree, which is what
  makes a rung work: standing, the wall band starts a step over your feet and
  the apron is in it; at the apex of a jump it starts `TAV_AIR` over them and
  the board's crown is under it, so the walk catches the floor instead of
  pushing you off the wall.
- **AND `tavCellTop` IS A RECTANGLE NOW.** A disc round a board 1.15 by 0.52
  either loses its ends or hands out floor a third of a metre in front of it,
  which is a step onto nothing.

Measured with the game's own movement, cast asleep: walk into the wall, jump,
and the feet go 5.30 → 6.36; jump again and they go 6.36 → 7.42 and walk on
into the bore. **And `inCombat()` TAKES THE JUMP AWAY** — Space is the dodge
step while anything woken is within ten metres, so the first three runs of
that test measured a player who could not jump at all, with the drunk and the
orc 6.4 m away at the bar.

**THE TAVERN CAN ALWAYS LET GO OF YOU.** "I got stuck in these spots" was the
stall, and every line of the walk above it is a REFUSAL — the move is turned,
or reverted, or pushed out of — which is the Dealer's own lesson that
reverting the frame IS the stuck. Measured over the whole hall: 4,351
standable spots, 16 of them with drawn stone across all eight directions and
797 with stone a full body-radius inside the body. `tavEscape` runs LAST in
`updateTavern` and only when the body really is inside something (a wall
within 0.20 of the centre) or has nothing under it: it walks out to the
nearest spot with a floor within reach and room for a body, at 0.14 m a frame
so it reads as being shouldered aside. Measured: dropped into three different
barrels, the room puts you out and you walk away; standing normally at 280
spots round the hall the mean drift is 0.067 m.

**AND THE DRUNK DID NOT BLEND IN BECAUSE HE HAD BEEN DARKENED FOR A SHIRT HE
IS NOT WEARING.** He carried the biggest multiply-down of the three
(`tint: 0x8e8478`, 0.56, at `emis` 0.09) on the strength of a note about a
pale shirt and a light waistcoat, and there is no shirt on the model at all:
measured off his own maps the torso is (133, 102, 81), the head (126, 96, 79)
and the legs (116, 89, 72) — the same warm mid-tone the orc ships. What he
rendered as was a black cut-out in a room of pale flagstones. Neither he nor
Wong has a tint now (a flat multiply is a desaturator whatever it was meant to
be, and the orc, who has never had one, is the one of the three that has always
read), and the one number left — the emissive lift, which is all a lit figure
in a BAKED, UNLIT room has to carry it — is swept against the room rather than
chosen: 0.24 puts the drunk's skin at the flags' own level and 0.22 puts
Wong's shirt and waistcoat at white linen and grey wool.

**THERE IS NO SHELF IN THE TAVERN, AND THERE IS NOT GOING TO BE ONE.** Four
times a bracketed board was put on a tavern wall to split a step into two
jumps — on the stall's wall, then along it, then on the back of the gallery —
and four times the owner's word was to take it out, the last with "never put
it there again, you keep getting it wrong". `buildTavShelf`, `TAV_SHELF` and
`tavShelfMesh` are DELETED rather than commented out, because a function left
in the file with a commented call is an invitation. The steps it was for are
climbed by things the room already has: the file's own crate on the stall
roof, and the PLANK for the 2.12 m step at the back of the gallery, which is
a physics puzzle and the better answer anyway. If a step in there ever needs
splitting, move something that is already in the room.

**AND THE MODEL IS BUILT LIKE A THING THAT HAS BEEN USED.** The old one was a
tube, six torus rings and a cone, and in the hand it was a white stick with an
orange tip. Everything on it now is something a real glass syringe has: the
glass is ONE lathe up the outside, over the luer cone and back down the bore,
so the rim and the shoulder are real thickness and the silhouette reads as
glass; there is a knurled luer LOCK collar, a coloured needle hub, a lancet
bevel cut by a PLANE with the lumen showing in it, a two-rib rubber piston and
a dished thumb rest; and it has been used — dried haemolymph in the crease
behind the hub, a stain on the piston, the print worn off the barrel where a
thumb rides it. Four things it cost:

- **THE SCALE IS PRINTED, NOT MODELLED**, on a sleeve a quarter of a
  millimetre proud of the glass with its own alpha. **AND A TICK IS SHORT**:
  the first build drew each one 148 px of 768 across, which is nineteen per
  cent of the circumference — a 69-DEGREE ARC — and twenty-one of those in
  three columns rendered as a comb of white bands spiralling up the barrel. A
  real graduation is a few degrees of arc, and two columns round it is enough
  to read from any angle a hand holds it at.
- **AND THE VIEW-MODEL SCENE CARRIES ITS OWN THREE UNITS OF LIGHT.** Medical
  white (0xe9ecef) blows out to a flat bar in your fist, which is exactly how
  the old one read; every colour here is chosen against that and not against
  paper. METALNESS IS A TRAP for the ninth time — the needle is a bright rough
  dielectric, not steel at 0.92.
- **AND THE BLOOD COLUMN STARTS AT THE PISTON'S FRONT FACE, WHICH IS A PLUS.**
  Written `pz - pistonHalf` it measured from the piston's BACK, so an EMPTY
  syringe carried eleven millimetres of blood sitting just behind the shoulder
  — invisible while `visible` was hiding it, and switched straight back on by
  `holdable`'s builder, which forces every child of the clone visible to undo
  whatever the WORLD hid. In the hand it was a bright blue band round an empty
  barrel. Both halves are fixed: the arithmetic, and `bwKeepHidden`, which is
  the flag that loop honours.
- and the luer collar went from 0x5c636a to a neutral grey, because under this
  scene's blue ambient it was the most saturated thing on the prop and took
  the eye off the glass.

**AND THERE IS A BOTTLE OF WATER ON THE TAVERN'S BAR.** Everything else on
that counter is liquor and breaks; this is the one thing on it you can carry
away, and it is the only water in the game that is not bought, found behind a
hatch, or a slot you already had — which is what makes the stack worth having.
WHERE is measured: the counter's own top swept in both directions with
`keepDrawnFloor`, so it can only ever stand on something drawn. **And
"furthest from a liquor bottle" on its own picks a CORNER** — swept over the
whole top it came out at the back edge half a metre past the end of the
dressing, which is the one place on that counter nothing would ever be put.
The clearance is a score, not the only one: it stands on the customers' side,
inside the run the liquor occupies, and every corner of its own footprint has
to be over something drawn. **And it is lifted off its own colour**, because
the tavern is a BAKED scan that ships `KHR_materials_unlit` and has no lights
in it at all — the liquor on the same counter carries its own emissive for
exactly this reason. **And the call goes AFTER `buildTavBottles`**: it reads
where they are, and placed before them it found an empty list and returned.

**INDOORS IS SILENT.** `beachBedK`/`windBedK` return 0 in the tavern, the
catacombs, the undercroft, the bunker and the hall (`indoors()`); the old
2 % / 1.5 % / 8 % remainders were audible in a quiet room. Only the drain's
mouth, open to the sea, keeps a little.

**"LAGGING ACROSS THE ROOM" IN THE TAVERN WAS THREE THINGS, NONE OF THEM THE
FRAME RATE** (CPU stayed under 10 ms a frame through the fight). Knockback
was 6.6 m/s decaying at 7/s — a metre a hit, run through the hit's own
freeze at a twelfth of speed, so two men landing blows slid you 4-9 m
across the room in slow motion; it is 7.5 decaying at 20 now, about 0.4 m.
The camera shake was a fresh random offset every frame, up to 0.2 m, which
at sixty a second reads exactly as dropped frames; it is three sines now, a
third smaller. And a kill one man made on another froze the frame and shook
the lens as if it were yours (`u.lastHitMine`). The hurt freeze is 0.09 at
most. Measure displacement with `step` and SPLIT it: most of what looked
like being moved was the shake.

**THE TAVERN IS RELIT IN ITS OWN SHADER, BECAUSE NO LAMP CAN TOUCH IT.** The
hall is a baked, `KHR_materials_unlit` scan that was baked under a bright
day, so dimming it and lighting it warm is one onBeforeCompile on every
material in it (`tavRelight`, patched in the loader and again after the
build for the chairs, the door and the crates): the map is MULTIPLIED by a
light worked out per pixel in the hall's own frame (`tavLightU`) — a dim
cold fill (the moon bouncing in off the flags), the moon round each shaft
(strong close to its line, and a wide spill across the floor where it lands,
dimmed by the same cloud that dims the shafts), and warm torches with a steep
falloff so the dark comes back between them. The normal is the facet's own
(`dFdx`/`dFdy`), turned toward the camera. Two things it needed:
- **A LINEAR MULTIPLIER LOOKS GENTLER THAN ITS NUMBER.** The output is sRGB,
  so a fill of 0.3 read as barely dimmed; "dim" is 0.04-0.09 (`uAmb`).
- **WORK IN THE HALL'S FRAME, NOT THE WORLD'S.** At twelve kilometres a
  derivative of world position is a tenth noise; `vTavW` is relative to
  `uTavO`.
The TORCHES are found, not typed (`buildTavTorches`): standable floor from
the walk grid, rays at head height through the WALL INDEX (`tavWallRay` —
a three raycast against the merged hall is 52 ms a ray, the index is
microseconds), flat at three heights, on a STONE material only (the wall
index now records each face's material: `TextureMaterial_2` is the dressers'
timber and a torch hung on one), not on the door, not within 3.2 m of a moon
pool, dealt out 5.5 m apart. Each is a sconce and brand (merged), a flame and
a glow (two Points batches), a pooled PointLight for the lit cast, and a
flicker that drives the relight's `uTorch` too. The sky lights are ducked
indoors (`setSkyDuck(0.72)` in `tavEnter`, back in `tavLeave`) so the cast is
lit by the torches, not by a moon the room has a roof over.

**A TEARDROP SHADER MUST DISCARD PAST ITS TIP.** The tavern torch flame's
width goes negative above the tip, and `smoothstep` with both edges below
zero returns 1 for every x — which lit the whole top band of the point
sprite, a bright bar hanging over every flame. `if (w <= 0.002) discard;`.

**THE TAVERN'S SKYLIGHT IS ONLY THE WINDOW.** The interior-mapped stone
recess behind the glass shifted with parallax as you walked under it and
read as the old vault texture showing through, and the leading — cames a
centimetre wide, thirteen metres up at the retro scale — was under a pixel
and shimmered. The glass is drawn flat on the vault now (`mlatticeAA`: each
came held to a pixel by its own `fwidth`, and faded to its average where the
whole pattern is finer than the pixels), the quarries are bigger (2.4/1.6,
the shaft and the pool trace the same pattern), the curb is blended rather
than cut, the conform grid is 20 x 20 at 3 cm off the vault, and the
material carries a polygon offset so the vault can never win the depth test.
Measured by diffing six renders a fraction of a millimetre apart: 4,391
pixels changing became 1,351, and what is left is ordinary edge pixels.

**AND A PIECE MUST NOT STAND THROUGH HER SIDE, WHICH IS `halfAtY` AND NOT AN
EYEBALL.** Every piece's turned footprint is checked at three heights against
the lining at its own station. Two barrels in the bow came out 5 and 23 cm
through the planking; the whole set now clears by 0.07 m at worst, and that
worst is a CYLINDER measured by its axis-aligned box, which overestimates a
round barrel by 0.41r.

**AND A DECK PIECE SITS ON `DECK_Y`, WHICH IS FLAT.** They were put at
`DECK_Y + 0.055` — the height of the breasthook's planking up forward — and
measured by raycast at the two stations they actually stand on, her deck is
3.200 there. Both casks floated five and a half centimetres over her boards.
Her deck is flat by construction (sheer lifts the RAIL, not the deck), so
there is one number and it is `DECK_Y`.

**THE KEEP'S LAMPS ARE TORCHES.** The pier's glowing box on a stick is an
open iron cresset on a banded post with coals, charred billets, two ragged
teardrop flames on their own counts, embers lifting off with the wind and a
flickering pooled light (`keepFirePoints`, the tavern's flame at a basket's
size); the door's wall lanterns are bracket torches leaning out of the
stone. And the PLACEMENT asks two questions it never asked: is there WATER
beside it (an edge of the pier, not the terrace at deck height the old walk
wandered onto), and is anything drawn within reach of the post
(`keepWallNear` from the ankle to over the flame) — no rail, keg, bale or
fence through it.

**THE CRATES ARE WOOD, AND BREAK INTO WHAT THEY ARE MADE OF.** A board
texture that reads as timber (grain swelling round knots, a split, weathered
edges, a warm brown the moon still greys) and a crate built as a LIST of
parts — planks with gaps, a rail top and bottom on every face, a diagonal
brace, nail heads, lid planks on cleats, corner posts — every part a box
long along its own X (`crateParts`), merged while it stands (three draws).
The break is the blow's: the face you hit SNAPS into two torn halves driven
away from you, the sides fall outward a beat later top-first (`wait`), the
lid jumps, the posts topple across the blow, and thirty splinters and a few
nails come off the break; `sfxWoodSnap` + `sfxCrateCrunch` on the hit and
every board KNOCKS where it lands (`gib.onLand` → `sfxPlankKnock`,
positional). No sand clods: the dig's puffs over a box of wood read as pale
shards of something else.

**MEMORY OF GRAMMY ORC.** The owner's painting, as a photo the tavern's orc drops
when he dies (`maybeDropGrammy` in `finishMutant`). It is aged on a canvas at
load from `assets/grammy-orc.jpg` on fixed seeds — sepia, yellowing, stains, a
water ring, scratches, grain, worn edges, a torn corner — and CRUMPLED IN THE
GEOMETRY along the same `GRAMMY_FOLDS` whose cracks are drawn into the print, so
the white crack is where the paper actually bends. The back is BackSide on the
same geometry, with the text mirrored (seen from behind) and the tears NOT (same
uv, same hole). It flutters down rocking and lands face up. **On the tavern floor
it needs its own lift** (`grammyWorldCopy`, emissive 0.62 on cloned materials):
that room is a baked picture with no lamp that reaches the flags, and a lit
material lying there is a black square. The trader buys it for two jars (the
first SELL row that is not a stack). `grammy` / `grammyAt` on the save; a save
with the orc dead and no photo state puts it on the flags where he fell.

**HIS TORCH NEVER WENT OUT; IT LEFT THE LAMP POOL.** "The torch goes in and
out when I step away" was not the flame: its lamp had a 6 m `distance`, and
`lampReach` drops a lamp from the twelve real lights the moment the CAMERA is
past its window — so walking six metres off put Ben in the dark and walking
back lit him again. A lamp may carry `userData.lpAlways` (metres): inside it,
it ranks above anything windowed, because it is what you see something by from
across the room. Measured: pool weight 1 at 8-12 m (0 past 6 before). The
gutter cycle is gone too. The torch is rebuilt the bonfire's way at a tenth the
size — a crooked barked shaft charred up its last third (`emberWood` takes a
scale now, `uFS`), a lumpy rag head bound with cord, dropped coals, a scorch —
and its flame is three `fireSheetMaterial` sheets whose `uWind` is fixed along
the line from Ben out through the head, so it LEANS OFF HIM and breathes.
`BEN_TORCH_OUT`: 3.2 s after the dialogue closes it sputters and is out by
7.4 s (`sfxTorchOut`), the coals die by 17 s and the smoke by 16; restored
dead, it is out from the start (`outT` 99).

**THE TAVERN'S DOOR WALL HAS A BACK NOW, AND NOTHING STANDS BEHIND IT.** The
owner photographed the built door from BEHIND with the whole hall showing round
it: the scan is SketchUp and the packer drops `BackSide_0`, so from behind the
end wall there is no wall at all. The walk grid has no floor past the door's
own recess, so how he got there is not known — which is why the fix does not
trust the push-outs: `tavWestStop` holds every body east of the door's face
(it runs last in `updateTavern` and in the tavern branch of
`clampPlayerToRoom`), and `buildTavDoorBack` draws the wall's back anyway, a
plane of the wall's own stone at the wall's own texel density (0.326 of the map
a metre, measured off its faces) a hand behind the recess. The leaves carry
full-width ledger boards behind their planks, so a seam is a shadow and never a
slot of light.

**THE OLD RING IS ONE WHOLE BAR** (`OLD_HP` 1, `maxHp()` = `MAX_HP + 1` worn),
a full fifth segment, and putting it on fills your health to the new full
(`item.onWear`, called from `wearRingAt`, never while a save is applied or
replayed).

**THE TAVERN'S PLANK SLEEPS (`sleeps` on a PhysProp).** Dropped at random
spots round the hall, a third of the time it never settled: wedged between
two faces it was pushed out of one into the other and back, 8 cm a frame for
ever, and balanced on a ledge it fell off and was lifted back every frame
with a knock each time (178 knocks in 200 frames at one spot). Every flicker
also moved its floor under you, and every time it went "still" it rebuilt the
fighters' routing grid (3,500 cells of floor and wall queries) — the noise,
the lag and the dead controls through the whole fight. A body with `sleeps`
now stops simulating once it is in contact and has moved under 15 cm and
0.12 rad over two half-second windows, or four seconds after it was let go:
no step, no walls, no settle, no sound. It wakes when it is picked up or when
`wakeOK` says so (`tavPropEpoch`, bumped when a table or chair is smashed).
Every prop's knock is also limited to one per 120 ms, and the grid is only
dirtied when the board comes to rest on the HALL FLOOR more than 0.3 m from
where the grid last saw it (`tavPlankGridTouch`). Measured over 108 drops:
one knocked five times then slept, the rest were silent, and the grid
rebuilt zero times. **Harness:** the pane's `frame()` runs at real dt (about
3 ms), so the half-second windows need a fake clock that only moves FORWARD
(`performance.now = () => real() + off`, `off += 16.7` a frame), and a
sleeping prop you teleport must have `asleep = false` set.

**THE DEALER'S HEALTH BAR JUMPED BECAUSE THE WALL CHECK OVERWROTE ITS ANCHOR.**
`ehpBlocked(p)` is handed `_ehV` — the bar's own anchor, by reference — and in
the two rooms that answer by RAYCAST (the bunker and the undercroft) it did
`_ehV.copy(p).sub(e).normalize()` to build the ray, so every 0.18 s the anchor
became a unit direction and the bar was projected from near the origin. Its own
scratch vector now (`_ehD`). Measured after: the bar holds within a pixel,
12 px over the head bone. **A helper handed a shared scratch vector may not use
that scratch vector.**

**A CORRECTION IS A LEAN IN EVERY STOREYED ROOM, NOT ONLY THE TAVERN.** The
catacombs and the sea keep share the tavern's walk and never got its two
rules. `CAT_FIX` (0.09 m) caps what a frame's pushes may move you, skipped
after a frame that was itself a teleport; and a push that sends you AGAINST
the move you made is refused if where you were still stands. Measured with
`tools/roomsweep.js` (8 headings from 40 seeded spots, walking into
everything): catacombs worst frame 1.42 m -> 0.12, backward bounces 24 -> 2;
keep 0.93 m -> 0.15, 13 throws over 0.2 m -> 0, 48 bounces -> 24. No spot in
either room is trapped (at most 5 of 8 headings blocked, which is a corner).
The hoist keeps its own 1.5 cm cap while riding.

**IN THE TAVERN A MAN WALKS THROUGH THE FURNITURE BY BREAKING IT
(`tavCrush`).** The tables and chairs are `bwGhost` (a thing that breaks when
you touch it must not also be a wall), so the fighters' routes run straight
through them, and they drew passing through a table top. Every frame, anything
awake and moving (`tavPeople()`: the bar's three and the two drinkers) whose
body is inside a table's disc or a chair's footprint smashes it, harder the
faster he was, and `smashTavTable` / `smashTavChair` take a `by` so the pieces
go AWAY FROM WHOEVER BROKE IT (it used to be always from the camera). Measured
in a hands-off brawl: the orc takes a table and three chairs as the fight
crosses the room.

**TWO FARMERS DRINKING AT A TABLE (`buildTavDrinkers`, `updateTavDrinkers`,
`tavDrinkerProvoke`).** Kinds `tavDrinker0/1` are copies of castle brawlers
`farmer3` (wood) and `farmer10` (farm), bare-handed, with `tav: true` (the
hall's floor, arena, steering and crush), no night grade, and a room-sized
ragdoll. They keep `farmer: true` for the castle's shared hurt gate; the
tavern branch of `updateMutantUnit` runs their late motion capture
(`parLate`). They sit on the two chairs furthest apart at the table furthest
from the bar, each with a bottle in his right fist (`tavBottleToHand`,
`TAV_DRINK_GRIP`), and every 5-13 s one tips it back with a gulp.
- **THE SIT IS A FARMER CLIP** (`fSit`, `fDrink`, `fRise` in `farmKeyDefs`,
  so every file has them). Measured: hips 0.62 m over a 0.50 m seat, knees
  0.3 forward, feet on the floor (toe 0.01). Their origin is pulled back
  (`TAV_DRINK_SEAT` -0.07) so the hips sit at the back of the seat.
- **WHAT WAKES THEM, and who they go for**: a blow or a thrown bottle on
  either (you), the chair under one or the table in front of them breaking
  (whoever did it: `c.by` / `t.by`, null for you). Both come up together:
  `fRise` played as the roar clip, the bottle smashed on the floor. A man from
  the bar is their foe (`st.foe`); you make them `mine`. When their foe is
  down they stop and stand about (not `mine`: they have no quarrel with you).
- **AND THE BAR'S THREE ANSWER THEM**: `hurtMutantCore` records `st.hitBy`,
  and `tavSides` makes a drinker who has hit one of the three in the last
  15 s that man's foe (unless he is yours).
Measured: provoked by a chair broken on the orc's behalf, the two take him
from 33 to 10 health in 14 s; provoked by you, 12 swings in 12 s. Harness:
`tools/tavdrink.js` (`__tavSetup` holds the bar scene back with
`tavScene.phase = 9`; dev mode switches swinging off, so turn it off to
measure a fight).

**THE HOTBAR IS WHAT YOU CARRY.** Empty slots are not drawn (`#hotbar .slot.empty` is
`display: none`), the wheel walks EVERY filled slot (not only holdables, and not only weapons in
a fight), a slot whose thing is not held in the hand becomes `restSlot` and the wheel carries on
from it, the name comes up beside the slot as you scroll (`.say`), and a commit that lands while
the game is frozen WAITS rather than snapping the cursor back. **And a checkpoint's replay may
not undo you**: `applySavedInventory` runs again every time the replay hands something over,
for seconds after a load, and it re-sorted the strip and put the saved item back in your hand
each time — "the hotbar reverts once you changed it". `invTouched` (set by `toggleEquip` outside
a restore and by the pack's reorders) switches the sort and the hand off.

**THE DRINKERS' GRIP WAS MEASURED OFF THE HAND.** In this rig's hand frame
+Y runs down the fingers, +X across the palm toward the thumb and the
fingers curl toward +Z, so a thing in the fist lies ALONG X at (0, 0.135,
0.048) — the old grip ran the neck out the pinky side ("facing the wrong
way") on the heel of the palm. The drink pose was SOLVED on the rig
(`tools/farmpose.js`): the bottle's lip on the lips to 5 mm, base up and out
at forty-five degrees, with the elbow bent and the head tipping back; the
left forearm rests on the table, palm down. `life.grip` may be `{ R, L }`
now, so the right fist closes on the bottle and the left hand is a hand.
Four of them at the two tables furthest from the bar (a quarrel is the
TABLE's), and the loop draws a drink, a long swig, a toast to the man across
the table, and a wipe of the mouth after.

**THE ARTIFACT'S BAR IS GONE.** The pips and cooldown strip sat above the
health as a yellow bar; `#artifact` is no longer on the page. Its state is on
the weapon's own hotbar diamond (`updateArtHud`): hollow while it recharges,
glowing harder with each hit of the chain.


**THE ORC'S STEEL TOUCHES YOU NOW.** `limbR` 0.36, `landSlop` 0.30, `reachK`
0.88, `lungeStop` 1.90 and every swing's `stop` 0.15-0.2 m nearer (1.85-1.95),
the kick scored on his leg (`limbs: [2]`, stop 1.30). Measured over a minute:
36 hits, all within 0.23 m of the body, 39 damage a minute (unchanged).

**THE DRINKERS HOLD THEIR BOTTLES, AND THERE IS NO AXE AT THE TABLE.** Two of
the four came from farmer kinds that carry an axe (`farmer4`, `farmer18`), and
`tavDrinkerKind` copied the kind whole — so a man sat drinking with the axe in
the same fist. `tool: null` on the drinker kind. The drink pose had been solved
BEFORE the bottle's grip was re-measured off the hand: with the bottle along the
hand's own X the solved "lip on the lips" put the fist at the chin and the
bottle pointing straight back behind his head (measured on the shipped DR2: lip
0.50 m from the mouth, axis 0.74 away from the face). DR1/DR2/DR3 are
re-solved with the bottle attached by the game's own grip (`tools/farmpose.js`,
a bottle lathe on `J.handR`, coordinate descent on arm/forearm/wrist/neck/head
against the mouth and a bottle axis 60-70 degrees up out of it): lip 0.000 m.

**A FIST CLOSES TOWARD THE PALM, WHICH THE SHORTEN-THE-DISTANCE TEST CANNOT
TELL ON A STRAIGHT FINGER.** `installLife` picked each finger's curl sign by
whichever turn brought the tip nearer the wrist — degenerate on a finger that is
nearly straight (both ways shorten it by the same cosine), and on the farmers it
chose the wrong way on the right hand: measured, a +0.6 curl moved the
fingertips AWAY from the palm, so every castle man fought with his fingers bent
back over his knuckles and the drinkers held bottles in open hands. A kind may
say where its palm is in the hand bone's frame (`palm: [0, 0, 1]` on
`FARM_BASE`, measured for the bottle grip): each finger bone's axis is then
built — perpendicular to the bone and to the palm, signed toward the palm — and
`lifeApply` turns about `f.ax` instead of a bare local X.

**THE STOREROOM OFF THE HALL IS LOCKED, AND THE CHEST IS THROUGH ITS BARS.**
`buildTavStore`: the doorway in the north wall (room-local x -7.4, the wall's
hall face at z 8.6) is MEASURED by ray — jambs 1.5 m apart, lintel at 2.5 — and
a plank leaf with ledgers, iron bands, studs, a lock plate and a BARRED WINDOW
at eye height is cut to it, flush with the hall face inside the wall's own
thickness. It is an ordinary mesh, so it is in the wall index: walked at, you
stop at z 8.33. "The door is locked." (bare) on a proxy across it; nothing
opens it yet. In the room: a built table (lit, the chairs' timber as a map,
because a baked basic material cannot take a lamp) with the wreck's own sea
chest on it (`assets/chest.glb`, fetched again, the same lift `dressChest`
gives it), shut and empty, a pooled warm lamp over it with `lpAlways`, and the
relight's last torch slot (`TAV_TORCH_MAX - 1`, driven from `updateTavTorches`)
so the stone round it takes the light.

**AND EVERY WALL HAS A BACK.** SketchUp draws each face twice and the packer
drops the back copy, so from inside the storeroom its own wall was not drawn
and you looked straight out through the planks at the hall. The hall's
materials are `DoubleSide` now (set in the loader with the relight); the
render time did not move (2.48 → 2.37 ms).

**A SHELF WHERE THE OWNER POINTED (`buildTavShelfAt`, `TAV_SHELF_AT`).** He
stood on the ledge at room-local (-0.04, 3.67, 2.88), put the crosshair on
the wall at (0.99, 4.76, 5.15) — 1.09 m over his feet — and sent the picture.
The board's TOP is that point, the wall it hangs on is found by ray (it faces
-x), and the storey is written with `tavCellTop`. Measured with the game's
own movement: walk and jump from his spot, feet 3.67 → 4.78 on the board.
The two shelves this file carried before were on other walls, placed by
reasoning about steps; this one is placed by the picture, by his word.

**THE STOREROOM HAS A KEY, THE SHELF HAS BRACKETS AND A BOTTLE, AND THE
GRILLE HAS A JAR BEHIND IT.** Four things from one message of the owner's,
and the measurement that mattered was about the DEV READOUT: **the P overlay's
heights are over the FLAGS (`TAV_FLOOR`), not over the room's origin.** The
first placement of the key went on a floor 7.5 m under the one he was
standing on, and the "bars" of his second screenshot were looked for 7.5 m
too low as well — a drinkers' table top was found there and taken for a
grating, and a black box was built under a table before the frame was
checked. Measure the room where the readout says, in the readout's frame.
- **The storeroom key** (`storeKeyItem`, `storeKeyModel` — the key scan
  dulled to old iron, with its own lift: the tavern is a baked room and a
  lit material in it is black) lies at room-local (-3.28, 21.55) on the
  mezzanine 6.27 m over the flags, where he pointed (`TAV_STORE_KEY_AT`,
  `placeTavStoreKey`: the floor asked of the drawn room, his reading as the
  fallback; the group placed with its proxy at once and filled when the scan
  lands, in `updateTavStore`). The door is the pavilion gate's arrangement:
  bare without the key, "Unlock the door" with it, `keyUsed`, the key eaten,
  the bolt heard at 0.64 s and the leaf swinging 0.9 s after on a HINGE at the
  left jamb (`openTavStore`, `TAV_STORE_OPEN` -1.72 rad into the room).
  `tavStoreOpen` is on the save (`tavStore`) and a restore opens it in
  silence. The leaf is in the wall index where it was drawn shut, so the index
  is taken again once it has swung (`tavWallsDirty`). Inside, the walk stops a
  metre past the threshold: that is the chest's TABLE, which fills the little
  room — correct, not a wall.
- **The brackets** are flat bar (32 x 8 mm): a wall plate with two screw
  heads, an arm under the board, a strut from the plate's foot to the arm's
  end with a scroll where they meet. The square post and diagonal they
  replace were scaffolding.
- **A bottle on the shelf** (`buildTavBottles`, after the tables: the shelf
  is built before the bottles, so it goes in THEIR builder, since
  `buildTavBottles` returns early when any bottle exists). It stands near the
  board's front so a jump up onto the shelf is beside it while still in the
  air, which is what `stompBreakables`' loose branch asks. Measured: a jump in
  place on the shelf breaks it; a jump from the ledge that catches the board's
  edge is beside it for a frame or two and breaks it most of the time.
- **The jar behind the grille** (`TAV_GRILLE`, `buildTavGrilleJar`). He stood
  on the bore's landing (7.48 over the flags) half a metre from a barred iron
  screen — `TextureMaterial_1`, a cut-out in the plane x = -14.35, 8.0 to
  10.75 over the flags, posts at z ±0.75 — with the gallery floor 2.3 m below
  and beyond it. The bay he looked through is a NICHE: a BackSide box behind
  the screen between its posts, unlit and unfogged, so the bars read against
  black; a stone ledge at the screen's foot inside it; and a jar on the ledge
  (`dropJar` with a pre-built jar at 0.72), 1.45 m from the eye. The crosshair
  raycasts only what can be taken, so the bars are never in the way.
**Harness:** `__bw.fallbackLook = true` is a SETTER with no getter (reading
it back gives undefined), and `updateHover` reads `camera.matrixWorld` — call
`camera.updateMatrixWorld(true)` after `lookAt` or every hover reads null.

**The grille jar is sized by hand (2026-10-08)**: at 0.9 with `keepSize` it
was 0.12 m tall and the owner called it small. The noticeable-boost would make
it 3.2× (0.41 m, 0.28 across) and put its back through the black panel 15 cm
behind the kerb's middle. `scale 2.4` (0.31 tall, 0.21 across) with
`keepSize` and the hit proxy at 0.11 local (0.26 m world) is the beach size
from a stride off and still clear of the panel.

**THE STOREROOM DOOR, REDONE (2026-10-09; the owner: "looks like AI").** Lit
standard materials with drawn maps (`tavPlankMaps`: grain, two small brown
knots — black ones read as HOLES — scratches, grime low; `tavIronMaps`: rust
and hammer dents), uneven planks a hair out of true, a ledger-and-brace Z on
the room side, forged strap hinges (`Shape` + extrude, fishtail ends) with
domed clout nails, pintles, a rim lock, a ring pull on a lozenge plate.
**"I got stuck there"**: `buildTavStore` runs BEFORE `pruneTavStoreys`, and
the prune dropped every floor cell under the shut leaf — the threshold had no
floor, so an open door stopped you dead at z 8.33 (face 8.6).
`tavStoreThreshold()` puts the cells back when it opens (and on a restore).
**The chest**: lid hung on the file's hinge like the wreck's; the Artifact
of the Flame inside (`noBake` — the tavern's `bakeStatic` takes every
unnamed mesh and it vanished into the merge while still drawn), on the
chest's measured floor (0.044). Save flag `tavChest`.

**WONG'S NAME TAG, ON HIS SHIRT (2026-10-10; first a floating sprite, then
the owner: "on his shirt that you can inspect, like he's at work").**
`makeNameBadge()`: a 75 × 28 mm rounded, bevelled extrusion with a 768×288
canvas (ivory, a red rule, WONG in red Georgia, STAFF small), the pin bar,
pin and clasp on the back. `updateWongBadge` (every frame until done) waits
for his model, casts a ray from a stride in front back at his spine, over
and up a hand (`CC_Base_Spine02_035`), puts the badge 4 mm proud of the hit
on the cloth, tips it down a little and `bone.attach`es it — the bone's
world scale is 0.0106, and `attach` gives the badge the 94× local scale that
makes it 75 mm again; DO NOT set the badge's scale after (a test did and it
went to 0.8 mm). "Inspect the name tag" (`addInteractable` on it, a 0.11 m
proxy) opens the examine view on a second badge at its own size. Lessons:
a fixed 12.5 cm off the spine bone was INSIDE him (the bone sits behind the
body's middle — hence the ray); a MeshPhysicalMaterial (clearcoat) on the
plate drew nothing on him in the tavern though the examine view drew it —
MeshStandardMaterial draws — but BLACK (6/255, measured with a 48 px render target on him): the torches barely reach his chest and the cast only reads because `dressMutant` lifts their maps with an emissive; the badge's own map is its emissive at 0.7. The man in the well calls the barman Stanley.

**A CLICK PUTS THE PLANK DOWN (2026-10-12, the owner).** `attackAction` with the
plank held (`held === tavPlankProp`) calls `dropHeld` — E's lay-or-prop — not
`throwHeld`; everything else held is still thrown by a click.

**THE KEEP DOOR, REDONE (2026-10-13; the owner: "the tavern doors textures are
blinking fix it make the door look more real and blend in the scene").** The
blinking was the TEXTURE: `tavOakTex` was a 48 × 160 canvas through `retroTex`
(nearest, no mipmaps) and every plank squeezed all of it into 15 cm, so the
grain aliased and crawled with every step; the ledger boards behind also
overlapped their neighbours by 2 mm on one plane. `makeTavDoor` is the
storeroom door's work now: `tavPlankMaps`/`tavIronMaps` (mipmapped, lit
standard materials with 0.36 of their own map as emissive), uneven planks per
leaf, each plank a box whose four top corners are moved to `topAt(x)` — the
measured `A.tops` interpolated — so the heads follow the arch as one curve
instead of steps; a dark backing cut edge to edge and 6 cm under the heads;
forged straps with fishtail ends and clout nails, ring pulls on lozenge plates.
**Traps hit:** a box built at the origin has to have its x MOVED to the plank's
place (the first build stacked every plank at x 0); and a board map's random
v-offset must not wrap — the grime at the board's foot came up over the heads
as black notches. `tavOakTex` is gone.

**BOTH DOORS FLICKERED FOR THE SAME TWO REASONS (2026-10-13, the storeroom
door).** Measured by rendering two frames 4 mm apart and diffing: (1) the
board map's late-wood lines were a pixel or two wide every 15 px, which crawls
on a 20 px plank at the retro scale even mipmapped — `tavPlankMaps` now has
bands three times as broad at half the contrast (`x * 0.15`, pow 3, −0.17),
fewer and fainter scratches and a normal strength of 1.3; (2) each leaf was cut
to the measured opening EXACTLY, so its outer edges lay in the jambs' own
planes — a dashed bright line down the hinge side. Both leaves now run into the
stone (`W = xr − xl + 0.03`; the keep door's `HW = halfW + 0.012`), where the
wall hides the edge; running them short of it leaves a slot of light. The diff
went 979 → 552 pixels, the rest being ordinary silhouette edges.
