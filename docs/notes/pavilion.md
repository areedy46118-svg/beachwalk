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

## The dungeon behind the yard, and Henry (2026-10-14)
The owner, from the yard (feet 19.40, 0.40, −479.80, looking +x): a door here to lumoize's "Castle Dungeon",
the model's own door; no empty walls; the barred window closed; Henry sat in the cell, mouth moving as he
talks, eyes blinking, dark enough that you cannot really tell what he looks like, dirty; his lines given.
- **Where:** `DUN_DOOR_ANG` π/2 — the yard wall's cliff side, opposite the column's door. `placeDunDoor` rays
  out from the column to find the wall (5.55 m), stands the dungeon's +z door (cut out of the model's pair by
  `dunPart`) against it with a dark reveal behind, the wood given an emissive off its own map (lit for
  torches it was a black slab under the moon). "Open the door" → `startDungeon(1)`.
- **The room:** a room like the others (`DUN_X/Y/Z` 21000/700/21000), the throne room's pattern line for
  line — `DUN_SITE` walk off the packer's `bw_walk`, `updateDungeon` / `dunClampPlayer` / `updateDungeonCut`,
  `ROOM_BACK.dun`, `saveRoom` 'dun', and `inDun` added to `inRoom`, `indoors`, the hall-hide key (9),
  `clearRoomFlags` (both copies), `dropTargets`, the beach clamp, both footstep lists, the where-am-I readout,
  `frozen()` and the menu's busy list (`dunBusy`), and `bunkerFloorAt`. The bars are a wall (`dunKeepOut`:
  the corridor's x 0.79 + body .. 2.77, its ends 0.4 short of the doors). Leave by the door you came in by.
- **Out again:** to r = door − 1.1 facing the column, `mushWhere` 'out' AND `mushInYard` true — without the
  second the beach's cliff clamp ran first and took you to x 14.2, inside the column (mushWhere 'stair').
- **No empty walls:** the corridor's outer wall (x 2.77) and the vault over everything are built in the model's
  `wALLS` with the uv of the model's own back wall — the affine (z, y) → uv off its biggest triangle
  (`stoneUV`), so the same bricks at the same size; a measured "uv per metre" came out streaked. The window
  gets a shutter of the `Door` wood behind its bars. Metalness 0 everywhere (iron included), and a small
  emissive off each map so a wall the torches do not reach is dark stone, not a hole.
- **The dark:** a guttering orange light at the far door (7.5), a weaker one by the way in (2.4), and in the
  cell only a cold low one behind Henry at the shutter's side (2.6, range 3): an edge on a shape.
- **Henry:** `tools/henry_pack.py` — NOT Blender: Blender's glTF re-export lost the rig's joint offsets (the
  source's bones are in cm under a scaled root; every leg and arm bone came out at the origin, so turning one
  turned nothing). The repack keeps the source's node tree and skin, keeps the head's and eyelashes' targets
  16/17 (the blinks, found by measuring which shapes pull the upper lids down) and 117 (lips apart), drops
  the eye overlays and the clip, turns spec-gloss into metal-rough, and washes/darkens/grimes the colour maps
  at 512. 6 MB (most of it his hair cards). The file carries a SECOND, empty copy of the rig under the same
  names: bones come from the skinned mesh's `skeleton.bones`, never by name from the tree.
- **His pose** (`henryPose`, `HENRY_POSE`): each limb aimed at a direction in his own frame (`henryAim`,
  world-space, so the rig's local axes do not matter), the pelvis then lowered onto the stone; on top, a
  breath, the blink (both lids, 0.14 s, a fifth of the time twice), and while `typeFull` (his line typing)
  the jaw bone turns (`rotateZ` 0.26 — tested: the jaw opens the mouth, teeth and tongue follow) with the lip
  shape at 0.55 of it on a run of syllables; his head comes up toward you while the box is open.
- **His lines:** `HENRY_SCRIPT`, the owner's exactly; "Prisoner" on the card, fov 24 on his head bone. Talked
  to from the corridor (`far` 4.6, through the bars: the hover ray only tests his proxy sphere).
- `tools/dunshot.js`: `__dunBoot`, `__dunEnter`, `__dunLeave`, `__dunSheet` (room-local views).

## Henry let out (2026-10-14)
The cell's gate (`Entrance`) is put on a pivot at its far end (`buildDunGate`, `DUN_GATE` x 0.70, z −2.92 …
−0.95) — the far end so its leaf swings clear of his path. "The cell is locked." (bare) / "Unlock the cell"
with `cellKeyItem`: `keyUsed`, the key eaten, `sfxLockOpen`, the gate swings 1.75 rad in 1.1 s, and `henry.free`
runs (`updateHenryFree`): wait 0.9 s → 'up' (1.8 s, every bone slerped sat → stood, the pelvis raised to
`standY`, his soles on the stone) → 'walk' (1.25 m/s: inside the gate, through it, then to a metre short of
you in the corridor) → 'talk' (`startDialog('found')`, "YOU FOUND IT!", click to go on; `HENRY_FREE_NPC.onLeave`)
→ 'run' (3.6 m/s to the +z door) → the door's sound and he is gone, `henryFree` 2 on the save. He has no clips:
standing, walking and running are `henryStandAims(phase, gait)` on top of his stood pose, written once from the
rig's rest (`henryPoses`; `henry.rest` taken at load before he is sat). While he walks the face still blinks
and talks; the sat-only breath/neck layer is off.

**THE CELL GATE SWINGS FROM THE LOCK END, AND THE CELL IS WALKABLE (2026-10-14).**
The padlock is at `DUN_GATE.z0`, so the pivot is at `z1` and +1.75 rad swings the
lock end in: measured, the open leaf lies inside the cell along its front, x
-1.28…0.67, z -1.04…-0.61, with no wall within 3 m on that side. Once the swing
reaches 1, `DUN_SITE.skip` drops the `Entrance` material from the wall index,
`DUN_SITE.extra` adds the gateway's floor box, `dunMinX()` lets x go to the back
wall (-2.53 + body), and `dunWalls = null` forces the rebuild (restores too).
Measured with W held from the corridor: 2.1 m into the cell. Henry's walk legs
go round the open leaf: (-1.75,-1.35), (0.15,-2.0), (1.35,-2.0), then you.
**His last lines wait for a click**: `rush`, `no` and `yes` have `end: false`
and `hint: 'click to leave'`.

## Henry on the jetty, and the eagle (2026-10-14)
The owner: Henry, once out, at the sea end of the lighthouse's jetty "staring into the ocean"; talked to, he
turns round — "Hey!, its you again. I cant thank you enough for saving me." / "No problem" / "You know, they say a
lot of bad things about this beach … it feels good to just..." — and the click that ends that line has an eagle
"swoop down fast as hell" and carry him high out over the water, drop him from very high up, a splash far away; his
scream fading with the distance; a hyper-real sound on the snatch.
- **Where:** `HJ_SPOT` (-24.2, 0.41, -1160.3), measured by raycasting the deck from the owner's screenshot
  (feet -23.60, 0.41, -1151.22, look 0.81): the jetty is x -26.5..-22, z -1140..-1161.3, top 0.41; its lamp post
  is at (-26.0, -1160.6) (`HJ_LAMP`). He faces -z (`HJ_FACE` π), toward the moon.
- **A second Henry:** `loadJettyHenry` parses henry.glb again (bwFetch caches the bytes, bwGlb parses fresh,
  so it is a separate scene), once `henryFree` is 2 and you are past z -800. The pose helpers take the copy
  now: `henryAim(…, h)`, `henryStandAims(ph, g, amt, h)`, `henryMorph(name, v, h)`, and the blink/mouth are
  `henryFace(h, dt, talking)` (the cell's `updateHenry` calls it too). His materials get fog off, and a fifth of
  his own map as emissive — the moon is behind him from anywhere on the jetty and his face was a black hole.
  You cannot walk through him (a 0.5 m push, kept on the boards).
- **The talk:** `HENRY_JETTY_SCRIPT`, card "Henry". He turns over 1.1 s (feet shuffling, `henryStandAims` at
  0.32) and keeps facing you. The last node's `say` sets `hjSaid`; `onLeave` (`hjLeave`) snatches only if it was
  said — walking off earlier turns him back to the sea, and he can be talked to again.
- **The eagle:** WildPoly3D's (CC-BY-NC-4.0 — non-commercial!), packed from glTF by joining its .bin into a .glb
  and shortening its clip names (`flapping fly gliding idle landing leap lookaround sleep`). Faces +z, rests
  perched; 6.2 m across the wings in flight at scale 1, 1.1 here. Its root motion is under 0.6 m: none stripped.
  Vertex colours only; colour 0.42, emissive 0x0a0908, fog off. Compiled on load with `visible` set true for the
  call (`compileAsync` walks only visible objects).
- **The take (`hjCut`, `updateHenrySnatch`):** keyed flight `HJ_KEYS` [t, along f (you → him), sea side, up],
  a time-keyed Hermite (`hjFly`), then free flight toward `out` climbing 10 m/s. It comes down out of the sky
  BEHIND him where you are looking — the first version came from behind YOU and was in frame for 0.05 s, since
  a tight dialog lens only sees a thing within a metre and a half of his head. Grab at 0.75 s ('landing' clip
  from 0.3 for the flare, then 'fly' ×1.3). Then it swings up and back out the way it came (carried on across
  it went into the island's rock). His hands are put on its feet every frame (`hjEagleFeet`, `hjHandsMid`),
  swinging with its change of speed; legs running (`hjPoseAir`). Let go at 7.4 s carried, ~75 m up; he falls
  ballistic and tumbling about his pelvis; under the sea line the splash. `out` is bent seaward until where he
  will land is 0.22 rad off the lamp post's bearing from you — the first splash landed behind the post.
- **The lens:** `cineHold` with `dialogHead` null and `dialogTarget` driven every frame (him, the pair, him
  falling, the splash); `dialogFov` = 2·atan(R/d) clamped 14..55. `frozen()` has `hjCut`. At the end the look is
  re-read from the camera (`lookEuler.setFromQuaternion`).
- **The splash:** the whale's spray (`wfBuildFx`/`wfSplash`): a column and a crown at sizes 5.5/4.5 — its points
  are sized `uPx * aS / depth`, blind to the lens, so through a 14° lens at 150 m the whale's 1.6 is a sprinkle.
  `wfUpdateFx` is run by this take, and 7 s on after it, then every drop is put out (`hjSprayOut`, the whale's
  lesson). `sfxWhaleSplash(…, 0.55)` is the boom, late by its distance.
- **The sound:** the stoop's air is a live chain on the bird (looped noise → bandpass → lowpass → gain → pan):
  pitch (320 + 26·speed)·Doppler, level 0.85·(speed/40)^1.6·3/d; measured it rises 0.06 → 0.26 as it comes in and
  pitches 2.2 kHz → 1 kHz as it brakes. `sfxSnatch`: sub thump, cloth slap, three talon clicks, a tear, the
  hardest wing beat. A wing beat on every wrap of the 'fly' clip, late by d/343. The scream (`henryScream`, the
  owner's file, the 0.085 s of silence in front cut) on its own live chain following his pelvis: 1.5/(1+d/6) and
  a lowpass closing to 600 Hz at 180 m — measured 0.83 at 5 m, 0.1 at 84 m; a second, fainter one from 0.9 s into
  the file as he falls, cut when the SOUND of the splash arrives (d/343), not before it.
- **Saved:** `henryJetty` (`hjTaken`), set the moment it starts. `isleRestoreAt` refused any feet under 2 m —
  a save on the jetty (0.41) restored onto the beach at WADE_X. The jetty's box (x -27..-21.5, z -1161.6..-1139.5,
  feet > 0.2) is let through: it is out at sea where no beach is. Measured: a checkpoint load on the jetty
  stands you on it.
- `tools/hjshot.js`: `__hjBoot`, `__hjStand`, `__hjTalk`, `__hjClick`, `__hjChoose`, `__hjSheet`, `__hjTrack`.
  A frame of the take costs enough in the pane that a 16-still sheet runs past the tool's 45 s: four at a time,
  stored on `window`, read back in the next call.

**HENRY IS ON MOTION CAPTURE (2026-10-14, "make henry move more natural his limbs are all stiff").** `henryMocap(h)`
retargets Wong's idle (8.3 s), walk and run (`wongMoves`, the farmers' walk) onto his CC rig through `ntarRetarget`
with a fake unit `{ kind: { rag }, clipSpeed… }`: `HENRY_RAG` maps Mixamo onto CC (Hips → CC_Base_Hip, Spine →
Waist, Spine1/2 → Spine01/02, Neck → NeckTwist01, shoulders → Clavicle, …; his Pelvis and NeckTwist02 ride their
parents), `bind` is captured at load (`h.bind`), hipUp/hipPos read at the bind as `poseRig` reads them. Measured
on his rig: walk 1.48 m/s, run 3.74 — played at `speed / clipSpeed` so the feet do not skate. **The mixer is rooted
on the skinned mesh** (`new AnimationMixer(h.sk)`): the file's second, empty rig has the same names, and three's
`PropertyBinding.findNode` looks a name up through `root.skeleton` first. 18 skinned meshes share the one set of
bones. The cell: his stood pose is the idle's first frame (`henrySample`), getting up slerps sat → that and lerps the
hip's position, then walk/talk/run are the clips. The jetty: idle from a random point; turning, the walk at 0.55;
carried and falling, the run at 1.45/1.9 with the arms aimed on top after the mixer; the face after that. The sat
head-lift (`NeckTwist01 rotateX -0.2`) came off the standing copy — standing, it turned his face up at the sky.
**He is on the jetty only once freed:** `updateHenryJetty` does nothing (and loads nothing) unless `henryFree` is 2,
which only his run out of the door or a save written after it sets.

**HENRY'S GOLD RING (2026-10-14).** `found` now runs on (`next: 'gift'`) to the owner's line, and the dialog's
`onLeave` is `henryOffer`: phase 'offer' — the idle, facing you, and `henryHoldOut(h, k)` on top over 0.7 s (the
right upper arm and forearm aimed out and down, then the hand turned about its own length until the palm's
normal — cross(wrist → Mid1, Index1 → Pinky1), `HENRY_PALM_SIGN` +1, measured palm up — points at the sky). The
ring (`goldRing`, in `henryRingWorld` in world) lies at 80 % wrist → middle knuckle, 5.8 cm off the bone along that
normal (3.5 was half sunk in the skin, 55 % at the heel of the hand in his cuff); a small glint (the key's full one
whited it out; no column through the vault) and `ringDrop`, the octopus ring's sting, as the arm comes out.
"Take ring" (`takeHenryRing`, kind 'default' so the pickup replay never sees it): into the pack, and 'run'.
Saved as `henryRing`; a save from before you took it has `henryFree` 2 (1 is saved as 2), so the restore OWES it
(`henryRingOwed`, granted in `finishRestore` after the pack is put back, `addToInventory(…, true)`).

**ROUND 3:** his run out of the door is the OLD aimed stride again ("make henrys run out … the old way he did it"; the
walk stays on the capture), and the jetty fall is the old aimed flail (`hjPoseAir` uses the mocap run only while he is
carried). The ring line reads "all I had left, but it’s my way…", and the jetty's lines got their apostrophes
("Hey! It’s you again. I can’t…", "…but it’s still beautiful to me. After being trapped for so long, it…").
