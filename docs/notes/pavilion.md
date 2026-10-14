# The pavilion (mushroom house)

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**THE SCP IS IN FRONT OF THE PAVILION, AND THE HOUSE IS THE TRIGGER.** He
sat on the lane below the tower; he stands on the dry sand under the round
room's windows now (`SCP_X` 10.6, `SCP_Z` MUSH_Z - 15), facing the house,
in the standing `idle` with the neck and head turned back about the body's
right (`scpLookUp`, composed AFTER the mixer's stamp, which is why
`updateScp` runs after `updateMutant`). Three phases (`scpPhase`): HIDDEN
— `visible` false and NOT in `farProps`, because a far-prop entry writes
`visible` every frame; REVEALED the frame `mushWhere` leaves 'out', so
from the glass you look down and he is looking up; AWAKE when you come
out of the gate — `mushInYard` true, then false, read only while
`mushWhere` is 'out' so the climb cannot count as leaving. The look cone
and the hearing are off until then (`scpLookedAt` returns false below
phase 2). And a trigger that can be missed is a boss that looks broken:
walk straight past the house and he is revealed and awake thirty metres
on. Measured on a clean load: hidden on the approach, visible from the
stair, asleep in the yard, roaring on the sand outside the gate.

**The mushroom house (`MUSH_X` / `MUSH_Z`, 90 m past the tall one).** The
Bell Pavilion — La Jolla's "mushroom house" — built to the photographs in
`models/mushroom-house.js`, GENERATED like the lighthouse, not imported: a
round concrete room on a single column, its underside a flaring dish of 28
radial ribs (the gills), a band of 26 steel-framed window bays all the way
round under a low roof with a ribbed ceiling, and below it a bunker on a
raised platform: a low parapet across the front with an iron gate hanging
open in it, and a tall retaining wall round everything else. Inside the
column a spiral stair of cantilevered treads winds round an open well up
into the room, a rail on the well side and a rail round the well above with
a gap where the stair arrives. Abandoned: 42 % of the panes
gone and another fifth broken to a half, glass on the floor under them,
streaked and tie-holed concrete with spray tags on a few wall bays, a dead
pendant lamp. Everything the walk needs is in `MUSH` (radii, `H_ROOM`, the
door's angle and half-width, the stair's rise, treads, turns, `A0` and
`TOP_ANG`); the stair goes UP as the angle DECREASES, the lighthouse's
convention, and `updateMushroom()` is `updateTower()`'s shape: regions and
clamps, the climb by winding, the tread snap.

**AND `mushWhere` REACHED ACROSS THE BEACH.** On the stair the walk clamps
you to the shaft's bore FROM WHEREVER YOU ARE. The state is sticky on
purpose — it is what stops one step off the top tread putting the room's
floor back under you — so a state left set by any exit the three
transitions do not name (a knockback out of the door, a teleport, a test
harness) dragged the player back across the sand and posted them inside the
column, over and over. Anything past `R_ROOM + 2.5`, or below the sand, is
not in the building.

**WHERE YOU ARE IS REMEMBERED, NOT INFERRED.** `mushWhere` is `'out'` /
`'stair'` / `'floor'` and the transitions are the three real ways through:
the doorway at the bottom, the top tread, and the gap in the well rail.
Before that the room was "feet high enough and far enough out from the
axis" — which is true of the top three treads as well, so ONE STEP DOWN off
the top tread put the room's floor back under you and its rail back in
front of you, and there was no way down again. That was the owner's
"barrier". The two well transitions carry hysteresis — in at the tread line
(`BORE − PLAYER_R·0.55`), out at the well line (`BORE`) — so standing on the
lip cannot flicker between them. Three older traps live in the same
function: **the wall clamp parks you at exactly `COL_R + PLAYER_R`, so an
entry test of "closer than that" was never true** and you could stand in the
doorway pushing forever (the door admits you from 0.3 m further out); at the
top the well's inner clamp has to OPEN or you can never step off onto the
floor ring; and the cliff clamp has to lift inside the house.

**THE COUNT IS NEGATIVE AT THE DOOR.** `A0`, the first tread, is 0.6 rad
round from the doorway, and the floor is flat over that stretch — so a count
clamped at zero from the door credited you with those 0.6 rad: you stood a
third of a metre above every tread you climbed, and at the top the height
said you had arrived a fifth of a turn before the top tread and the gap in
the rail actually were. `MUSH.TURN_MIN` lets it go negative and the treads
and the walk line up exactly (`height = PLAT_TOP + i·STEP` at
`ang = A0 − i·stepA`, both sides). The same rule applies stepping INTO the
well from the room: derive the count from `TOP_ANG` and the angle you came
in at, never a flat `TURNS`.

**AND SMALL FAST RAIN IS WORSE THAN BIG SLOW RAIN AT 222 PIXELS.** Tiling the
rain to a realistic drop and scrolling it at a realistic nine metres a second
made the flashing WORSE, not better, and the reason is the retro scale: a
streak a tenth of a metre wide is one pixel at ten metres and moves three
pixels a frame, so it samples in and out of itself and sparkles. The pictures
have to be BIG and SLOW for the same reason the pavilion's patterns are big —
anything finer than the downscale is noise. Measured by diffing consecutive
live frames of an empty dojo:

| | bright jumps | rain pixels on screen |
|---|---|---|
| 10×8 at 1.0 tiles/s | 22483 | 3033 |
| 6×5 at 0.62 | 7 | 1905 |
| 5×4 at 0.75 | 0 | 1907 |

**THE PAVILION'S RING IS ON DISPLAY.** It was a few pixels of gold in a dark
room, and it had been placed standing on its EDGE sideways: its own frame puts
the band in local XY with the stone at +Y, and the old "flat, tipped" turn
about local Y tumbled it (measured 11 cm tall, 3 across). It stands upright in
the cushion now, stone up, half again its size (`gemWorld.scale` 1.7), turning
slowly about the vertical (`updateGemDisplay`), with an emerald point light of
its own, a glowing stone, a strong glint that shows over the box's rim, a soft
moonbeam falling on the credenza (it dissolves as you walk into it), and
sparks turning round it — all removed on pickup. **Stills of a room have to
run frames first**: the glint's opacity, the pooled lights and the sparks are
all set per frame, so a render with rAF frozen from the start shows none of
them. And the game's clamps move a teleported camera, so set it again after
the frames and before the render.

**THE THING OUTSIDE THE PAVILION IS OUT (`SCP_ON`).** He is built and then
retired on the next line, and `updateScp` returns at once; set `SCP_ON` to
bring him back.

**THE PAVILION WAS REBUILT (models/mushroom-house.js), INSIDE AND OUT.** The
owner's verdict on the old one was AI slop, and the reasons were in the
materials: every map 256-512 px, nearest-filtered and crushed to fourteen
levels, every surface flat-shaded and lit by its own emissive at nearly its
own brightness, so a drum was grey facets and a sofa an orange shape. Now:
- **Every map has a HEIGHT drawn beside it** (`normalFrom`), 1024 where the
  surface is big, linear and anisotropic, nothing quantised; the concrete is
  weathered (streaks, damp at the foot, rust at the tie holes) with the board
  seams in the relief more than the colour. **Every concrete surface is mapped
  in METRES** by a traverse at the end (plan for anything facing up, arc
  length and height for anything standing), so the seams are level and one
  size on every wall.
- **Smooth shading everywhere**, `roundBox` (a rounded rectangle extruded with
  a bevel) for anything made, and `smoothNormals` (position-keyed, keeps the
  UVs) on every extrusion and lathe.
- **A curved thing is a LATHE of its own section** (`rrProf`, `lathe` with end
  caps): the sofa is base, back, arms and six cushions each revolved over its
  arc, so nothing on the curve interpenetrates. Lounge chairs are lathed tubs
  with the front left out, turned so the gap faces the table.
- **The room is lit by LIGHT**: five cold moon fills round the glass, two in
  the stair's bore, a hurricane lantern on the table (`MUSH.LANTERN`,
  flickered by `mushLantern` in `updateMushroom`) and a small lamp in the
  ring's casket. Every point light is pooled, so this is free anywhere else;
  furniture carries a breath of its own map as emissive and no more. The
  EXTERIOR still carries a real lift (0x7c8591): it is backlit from every
  approach and was a black silhouette at the old level.
- **The ring's case** is a brass-and-glass casket on a teak stand at the head
  of the stair (`TOP_ANG - 0.62`, r 3.05, turned to face the stair), lid up,
  an open velvet ring box with an ivory satin cushion in it; `MUSH.JEWEL` is
  measured off the cushion. **Lids hinge at the BACK**: hinged at the front
  and turned "open" they hang down over the thing in the box. The beam and
  the sparks round the ring in `placeGemRing` are gone; it is 1.25x, faces
  the stair (`J.ry`), with a small emerald glow and a quieter glint.
- **THE STAIR SPRINGS FROM A NEWEL** (`MUSH.NEWEL` 0.2): the well is closed,
  the treads run from the newel to the wall and the handrail is on the wall.
  The walk band is `NEWEL + PLAYER_R` to `BORE - PLAYER_R * 0.55`, and the
  feet follow the treads' own LINE (`PLAT_TOP + turns * RISE`, eased), not a
  stepped height — the stepped snaps were "getting down the steps is bad".
  The gap into the room is ±0.55 rad. `tools/mushwalk.js` (`__mushWalk('up' |
  'down' | 'room')`) drives the real walk: up 329 ticks and down 328 with no
  stalls and at most 5 cm of eye movement a tick; a lap of the room round the
  well clear. **Teleporting to the pavilion fires the dock's swim-in**, and
  `packCut` is in `frozen()`: step until `__bw.packPhase` is 2 first.
- The room's colliders are discs that stop a hand short of the outer clamp
  and are floor-gated (`floorY`), and nothing but the rail stands within
  2.5 m of the well, so the ring round it is always walkable.
Measured: 649 meshes baked to 57 draws, the render call about 1.1 ms in the
room, on the stair and from the beach.

**THE PAVILION'S HANDRAIL STOPS BELOW THE ROOM'S FLOOR.** The bore is a tube
that ends at the floor; a rail 0.9 m over the treads rose out of it over the
last few steps and those points stood in the open mouth of the well with
nothing behind them — the floating piece of railing. `RAIL_TOP` caps it
(and its brackets) at the floor, and the end is turned back into the wall.


**THE STAIR: FEET ON THE TREADS (2026-10-13; the owner: "i sometimes float on
the pavilion steps or sink into them").** Five causes, measured: the height was
a ramp through flat treads (+7/−9 cm), eased behind you (4–19 cm of lag, worse
near the newel and running); the way down was free-fall under gravity (4–28 cm
bobs); and — the big one — `mushTurns` was CLAMPED at both ends while nothing
stopped you walking on round the well, so turning back put you half a metre per
radian of overshoot above or below the flight for the rest of it (the room-side
entry could start it 0.33 m off the same way). Now: the count runs free and at
either end the BODY is stopped (put back round the column to the flight's end
angle, `TURNS + 0.45/TREADS` and `TURN_MIN`), entry from the room is unclamped;
the floor is the top face of the tread under you (`PLAT_TOP + i*STEP + 0.012`,
blended only across the middle third of each riser), with no ease; and
`update`'s walk-down and step-up ease (the island's) now include
`mushWhere === 'stair'`, the step-up at 28/s. Measured with `tools/mushwalk.js`
plus a ray down at the treads each step: feet-to-tread median −1 cm up / 0 down,
p10–p90 within −11..0 cm up (the step-up ease) and ±4 cm down; both walks
complete with no stall.

**2026-10-14: THE PILLOWS SIT UP, AND THE ROOM IS LITTERED.** The two throw
pillows were slabs built flat (`roundBox(0.42, 0.13, 0.40)`) tipped by a
guess and turned 0.4 off the sofa's heading, so they stuck out through the
seat and back cushions ("they face the wrong ways and clip"). Now upright
(0.42 × 0.40 × 0.11, plumped by a bulge on z), +z to the axis (yaw a + π,
order YXZ), leant back 0.30/0.36 with the foot on the seat top (F + 0.55)
and the back's top corner on the back cushion's face (r 4.59 + 0.14 per
metre of height — the back is lathed with a skew). Measured in a lit render:
nothing through anything. In main.js, before the bake: 18 spent syringes and
22 drained jars on the terrazzo (seeded, `mulberry32(51014)`), kept off the
bore and the furniture (the room's colliders); clones of two syringes and one
jar with their names cleared so `bakeStatic` folds them into a few draws; the
jar's beach glow cut to 0.12. Not takeable.

**THE PORTRAIT SHINES LIKE AN ITEM.** Its glint stood at 0.2, in the middle
of the photograph, so the frame cut it through, and the lift greyed the dark
frame to a flat blue. Glint at 0.42 (over the frame), `through` 0.5, and the
shine's `mats` filtered to the photograph alone; the photo's 0.22 moved from
`emissiveIntensity` into the emissive colour, because the shine adds to the
colour and on white × 0.22 it did nothing.

**THE JARS ARE EMPTY AND JAR-SIZED (2026-10-14, later).** At fill 0 a jar still
carries its blue silt, froth, crust and bubbles. `jarEmpty(jar, true, hard)`
hides every blue mesh (b > 1.25 r and > 1.05 g — not the glass, the label or
the foil) and, `hard`, removes them, because `bakeStatic` ignores `visible`.
×3.04 (the sand's size). Their glass is cloned to 0.55 opacity with a faint
emissive (`userData.lifted`, kept out of the dimming pass): at 0.30 an empty
jar at night was a label lying on the floor.

## The scattered jars (2026-10-14, round 2)
"The pavilion jars look like floating labels": the glass had been removed with the blood (see items.md,
`jarEmpty` by tag). The glass is the beach jar's own now — no opacity/emissive lift. The scatter keeps a
list of what it has put down (`put`, a jar 0.24 + 0.24 from the next, a syringe 0.1) and a spot must
ray down onto the FLOOR itself at its centre and six points round its pad (`onFloor`): the side table
has no collider and a jar had been dropped on it. All 22 jars and 18 syringes still find room.

## The scattered jars, round 3 (2026-10-14): footprints, and only upright or flat
"Don't make the jars clip through anything or each other … only on their side or standing up." A jar's
origin is the middle of its BASE: on its side it ran 0.38 m off its spot, so spacing by spot let it lie
into the next. Each thing is now a row of discs along its real length (`fits`, `row`): a standing jar one
disc, a jar on its side five down its axis, a syringe five along its z (−0.15 … +0.23 m at ×1.6); every
disc on bare floor (`onFloor` at its centre and rim), clear of colliders, inside the room, and clear of
every disc already down. A jar on its side is centred on its spot, axis level, body on the floor (`JR`/`JL`
measured off the model's box); a standing one on its heel. All 22 jars and 18 syringes still fit.
`window.__bwPavJars` / `__bwPavDiscs` for the harness.
