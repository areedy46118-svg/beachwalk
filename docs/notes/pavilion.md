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

**THE WHALE TAKES HENRY SIX SECONDS AFTER THE SPLASH (`hjwTick`, `HJW_T`, 2026-10-14).** The take no longer
lets go 2.8 s after he hits the water. At `HJW_T.surface` (2.2 s) he comes up, chest out, thrashing
(`hjPoseAir` flail, `hjScreamFace`, the fainter scream on its live chain) and the lens creeps in to a 4.5 m
half-height (min fov 3.5). At 6.0 s a whale comes up through him: 0.5 s rise to ~9 m with its jaws wide, he
rides the floor of its lower jaw (`hjwJawAt`, the shader's own hinge), the jaws slam at 0.6 s (`sfxWhaleJaw`;
the scream is cut when that sound would arrive), and it drops back into its own splash; gone at 2.2 s, the
cut ends 1.6 s later. Measured: max frame 9 ms through the lunge (its programs are compiled when it is built).
- **IT IS THE BEACHED WHALE'S BAKE, THROUGH ITS OWN UNIFORMS** (`hjwBuild`, called at the end of
  `buildWhaleBeach`): the same `B.geo`, mouth and baleen geometries, `wbSkinMat/wbMouthMat/wbBaleenMat(L)`
  with `L.U` a clone of `wbU` — wounds closed (`uHeal` 1), eyes open, `uExK` (new: scales the moon rim/sheen/
  drops) — and `HJW_GLSL`, `WB_GLSL` with the hinge's constants swapped for `uOpenUp`/`uOpenDn` (0.55/0.45:
  a lunge-feeder's gape, where the beached one only lifts its head). Separate `customProgramCacheKey`
  (`-lunge`) — same GLSL text would otherwise share a program with the wrong hinge.
- **AT 120 M LOOKING AT THE MOON IT WAS THE SEA'S LAVENDER WHATEVER THE SKIN DID.** A black skin with no
  emissive and every light off read the same pixel: the global fog chunk's ground mist and moon-lit air read
  `vFogView`'s LENGTH, not `vFogDepth`, so the beached whale's `vFogDepth *= 0.66*uWbFog` thinning does nothing
  to them. The lunge variant scales `vFogView` too (`uWbFog` 0.35); then it is a dark wet mass.
- **Side on** (`C.wYaw = toCam + 1.5`, swept 0.3/0.95/1.5/2.2): the jaws read apart with the red between.
- **He rides the swell**: `waterSurfaceAt` (it is a metre and more out there); at OCEAN_Y he was under it.
  Everything of the whale's is measured off the sea's height at S the second it starts (`C.wS.y`).
- Harness: `tools/hjshot.js` `__hjToSea()` runs to the splash and returns its time; `__bw.hjW`, `__bw.hjCut`.

**HENRY'S FLICKER WAS HIS MATERIALS (`henryCutout`, 2026-10-14).** "When talking to henry in the dungeon he shakes
and flickers a lot." Measured frame to frame in the dialogue: head 0.1–0.3 mm, lens 0.01–0.5°, lights smooth —
nothing jumps. His hair (`Hair_Transparency`, 20,062 verts), scalp, lashes and `material` (brows) were
`transparent` with depthWrite off, so their triangles re-sorted every frame the camera moved (the hair boiled under
the 24° dialogue lens), and his corneas (`Std_Cornea_L/R`) are OPAQUE double-sided shells over the eyes,
z-fighting the iris. Cards are alpha-tested now (0.45, depth-written, alpha-to-coverage) and the corneas hidden,
on both copies (dungeon and jetty).

**The lunge whale's mouth has no web** (the owner, with a photo of a humpback's open jaws: "the cheeks should not
be webbed like that with the pink part"). In `wbMouthMat(L)` the cheek strips (`aE` 12) are discarded where
front-facing (the near side), and the far one, seen from inside, is shaded as the dark interior with baleen
striations (`vWbP.z * 25`), darker toward the throat. The mouth's emissive is 0.12 (0.5 lit a red fan).
**And then no web at all** (the owner, again: "the whale mouth should have no webbing at all"): both cheek strips
are discarded in the lunge variant; the dark far-cheek shading is gone. The jaws stand apart with the sky between.
**The beached whale has no web either** ("the whale on the beach mouth should have no webbing either"): the cheek
discard in `wbMouthMat` is unconditional now, and the saliva strands (`whaleSaliva`, `wbMucusGeo`) are hidden — strung
across the gape they read as webbing too.

**NO YANKS IN THE PAVILION (`clampSoft`, `MUSH_LEAN` 0.06; 2026-10-14, "i keep getting lagged back … passing this wall in
the pavilion same with the top of the steps").** Two causes, measured with a walk that counts frames moving back along
the heading and the biggest single-frame move:
- **The door took you as you walked past.** Out on the platform, the stair claimed anyone inside the door's angle and
  within `COL_R + PLAYER_R + 0.3` — a line past the column's west side qualifies — and on the stair the bore clamp
  then pulled you in 0.47 m in one frame. Entry now wants the door's middle (`DOOR_HALF · 0.75`) AND the frame's
  movement heading at the axis (inward component > 0.7 of the step): a straight line past the door gets NEARER the
  axis until it passes, so "nearer" was not enough.
- **The top tread's end-stop** put you on the top tread in one frame coming in through the rail's gap (0.79 m round
  the well), and the stair's and room's radius limits snapped on and off with the gap and the door's angle.
  All of those are now leans: at most `MUSH_LEAN` a frame (the end-stop as an angle at that arc length). The column's
  outside wall, met from the sand, is still a hard clamp.
Measured: past the door both ways and along the owner's heading — stays outside, biggest frame 0.057 m (a walking
step); in through the door and in through the gap still take you onto the stair, biggest frame 0.057.

## Henry, round J (2026-10-14)

- **The mouth says the line as it types.** `henryFace` reads the last character of `dialogTextEl.textContent` while
  `typeFull` is set (only while a line is typing): a vowel opens the jaw 0.85 (with a fast flutter), a consonant 0.32,
  a space 0.08, punctuation shuts it; lerp `dt*26`. Measured on the jetty: the jaw follows letter by letter and stops
  with the text. Both copies of him (cell and jetty) use it.
- **The clothes flicker** was cloth over skin z-fighting on the motion capture: `henryCutout` gives the sweater,
  trousers and turtleneck `polygonOffset` (-2, -4). Do NOT hide `Std_Skin_Body` to fix it: his sweater stops short of
  his trousers and the sea shows through his middle (rendered both ways). With the offset, three moments of the walk
  render clean.
- The cell's cold light behind him (a 2.6 lamp, r 3, at -2.25, 0.25, 2.35 on the back wall) is gone — the owner
  saw it as a glow next to his head.
- **The whale take**: `HJW_T.at` 9 (was 6), so he treads water ~6.8 s. No zoom: `hjwTick` returns a HELD lens
  (`T` = where he came up, +2 m; `R: null`, so the fov never changes) from the moment he surfaces to the end. A null
  lens fell back to the splash +3 at R 14, which left him a speck at the frame's edge. He rides higher (pelvis at
  sea + 0.1): from the jetty down a 14° lens a crest hid him ~45% of the time at sea - 0.12, which read as nothing
  there.

## The doorway is a hole in the wall (2026-10-15)

"the pavillon entrance colliders are even worse i still snap back make the entrance easy to walk through." The 10-14
fix (the door takes you only from its middle with a step aimed at the axis) left the column's wall clamped ACROSS
the doorway for everything else: 9 of 25 approaches stood pushing at an opening. Now, in `updateMushroom`'s 'out'
branch:
- the column's skin (`COL_R + PLAYER_R`) holds only OUTSIDE the door's arc (`DOOR_HALF` 0.32 rad, 1.3 m);
- across it are two JAMBS (`mushJambs`): faces from `BORE` out to `COL_R` at `DOOR_ANG ± DOOR_HALF`, a body put off
  the nearest point of each by `JAMB_R` 0.25 (a shoulder; the 0.4 ring left half a metre to thread). Used on the
  stair side of the doorway too, at platform height;
- `mushFunnel`: walking AT the door from in front (step's inward part ≥ half of it, within 1.2 m of its axis) eases
  you toward the middle by up to 0.7 of the inward step;
- the stair takes you when you are THROUGH: middle inside the column's skin (`COL_R − 0.05`) inside the arc. A
  line walked past the door never gets there.
Measured with real key input, steering at the doorway each frame (as a player looks at the door): 27/27 in from
−80° … +80° off its axis with ±12° of aim error, 0 frames moving backward, biggest frame 0.079 m (a step and the
nudge). Walked past at 2.6/2.9/3.3 m both ways: stays out, 0.057. In and back out: smooth, 0.057. Up the stair from
the door: 0.41 → 5.2 m, 0.056. NB a fixed-heading walk aimed in FRONT of the door from 60–70° slides along the wall
and across the doorway without going in — that is the walk-past case, and correct.

## Henry, round K (2026-10-15)

- **Named** "Henry" in the cell and when freed (`HENRY_NPC`, `HENRY_FREE_NPC`; they said "Prisoner").
- **The flicker when freed was the LAMPS**: with his pose frozen his face went 11.3 → 16.8 mean brightness in under
  a second — `dunLamps` flickered ±22 % at 6.3 and 13.1 Hz, a strobe through the talk's 30° lens. Now 0.95 ± 0.05
  over 1.3 and 2.7 Hz: measured swing 4.7 %. (His maps are mipmapped and linear; the clothes' polygon offset stays.)
- **The mouth talks in syllables**: a 4.4 Hz beat (±15 %) while the line types, open 0.85 on a vowel / 0.55 else,
  shut on a stop, eased at dt·12 (letter-by-letter was 36 shapes a second). Measured ~3 opens a second.
- **The jetty take ends on the splash** ("i want the player to still be looking for henry with their own control"):
  `C.released` — out of `frozen()` and the lock-loss guard, `cineHold` off, the lens back (eases 14° → your FOV in
  ~2 s); the take's clock runs on for the bird flying off and for the whale, which comes up at the splash
  (`C.hp = C.splash`) at `HJW_T.at` 9 s exactly as before. He no longer surfaces (the tread block is gone). Measured:
  released at the splash, Henry visible 0 frames after it, the whale up at 8.9 s.
- `tools/dunshot.js` now creeps its fake clock (a frozen one can hang the warm loop).

## The real snag at the foot of the stair (2026-10-15)

"I SHOULD NOT BE GETTING STUCK ON THE PAVILLION ENTRANCE TO THE STEPS." Tested as a player this time — from the sand
through the yard gate (opened with `__bw.openPavGate()`; with it shut the gate stops you, by design) to the door:
every approach, walking and running, in, no stops. The snag was INSIDE: turning left at the foot of the flight
(away from it), held dead at 23° past the door by `TURN_MIN` (−0.159) for 3.3 s under a flight 2.7 m overhead; at a
run it slipped through (the end-stop was a 6 cm/frame lean, a run is 9.5) and round under the whole stair. The bottom
stop is now where the turn above leaves you headroom (`(playerHeight() + 0.25) / RISE − 1` ≈ −0.33: ~86° past the
door; seen from there, the treads' undersides cross the view at head height) and it is HARD at the bottom (the lean
stays at the top). Measured: 86° walking and running, then stopped by stone; the centre post; up the flight; out.

## Out through the door (2026-10-15)
"walking out of the area with the steps the door … pulls you back if you are even close to the walls." The stair let
you out only 0.9 m past the skin and inside 95 % of the door's angle; drift toward a jamb and its bore clamp leaned you
in — and RUNNING out on a slant crossed the skin at a jamb's edge, stayed 'stair', and was leaned back toward the
column from the sand (measured: 4.4 m out, still 'stair'). Now: past `COL_R + 0.05` at the foot of the flight you are
out at any angle (the door is the only way through the wall); the doorway's depth inside the door's angle is never
pulled on; the jambs and the column's skin both hold a body 0.3 off (`JAMB_R`, `SKIN_R`), so there is no step where
they meet. Measured: walking and running out at 0 / ±1.2 / ±1.8 m to the side — out in 21–35 frames, 0 pulls once
outside; in from −70° … +70°, walking and running, 10/10, 0 back.
- **Henry's whale is seen again** ("i couldn't see the whale at all … it should still look how it used to"): the
  splash still hands the controls back, but the take's long lens (`C.fov`, ~14°) is HELD (`C.lensHold`, read in
  `updateDialogCam`'s `wantFov`) until the whale is down and the take ends; then it eases back. Measured: 14° through
  the whale (up at 8.9 s), back to 104° by 1.2 s after.

## Henry's wiggle in the dungeon was FLOAT32 SKINNING far out (2026-10-15)

"Henry is perfect when talking to him at the lighthouse I'm not sure why his textures move like that and wiggle in the
dungeon after talking to him when you free him." Both copies run the same capture idle and the same materials; what
differs is WHERE: the dungeon is at (21000, 700, 21000), the jetty 1.2 km out. three skins on the GPU with each bone's
WORLD matrix in float32 and takes the mesh's world off afterwards — at 21 km a float32 is good to ~2 mm, so his
vertices sit on a 2 mm lattice his breathing flips between, and the sweater (a few mm over the skin) trades places with
it in patches that crawl. Rendered still (bones moving 0.1–0.3 mm a frame) his chest's blotches changed every 3 frames.
**`skinLocal(mesh)`** (from `henryCutout`, so both copies): the bone matrices are made relative to the mesh in the
CPU's doubles (`meshWorld⁻¹ · boneWorld · boneInverse · bind`), the mesh's bind matrices set to identity
(`bindMode 'detached'`), and `applyBoneTransform` overridden with the same sum for bounds/raycasts. Meshes bound the
same way (same bones, inverses, bind, parent, local matrix) SHARE one such skeleton — his 18 meshes are one update and
one bone texture a frame (three gave each its own). Measured, 24° lens on his chest, 12 frame pairs: mean pixel change
0.8–1.0 → 0.2, pixels jumping > 24 levels 108–159 → 0. Any skinned thing in a far room has the same lattice; only
Henry (cloth over skin) showed it. `__bw.dunG().henry`, `mesh.userData.skinBind` holds the original bind.

## Henry looks at you in the cell (2026-10-15)

"make henrys head turn and look right at you when talking in the cellar." `henryLookAt(h, h.talk)` replaces the fixed
neck lift: the face direction is off his eyes (`CC_Base_L_Eye`/`R_Eye`, made level against the neck→head line), the
target is the camera, and the turn is laid half on `CC_Base_NeckTwist01` (≤ 0.75 rad) and the rest on `CC_Base_Head`
(≤ 0.9), in each bone's parent frame, every frame — so he follows you. The head is reset to `head0` each frame first.

## Henry fights the eagle (2026-10-16)

"give henrys legs while getting flown away more randomness … make it like he's actually struggling." `hjPoseAir`
keeps the run under it with a lurching pace (`hjRunPace`: 0.5–2.05x, re-drawn every 0.25–0.85 s), and `hjStruggle`
lays per-leg kicks over it — a thigh thrown forward or back, a knee snapped up or straight, a leg wrenched out, now
and then both together, now and then hanging limp — eased between targets every 0.16–0.65 s and slerped on by a
weight that wanders 0.35–0.9, aimed with `henryAim` in his own frame. Before the hands are snapped to the feet.

- **(2026-10-16) The pavilion checkpoint's lag and noise were Elvédor's house** (157 m away, inside its old 160 m load
  radius). See `beach.md`, "Elvédor, round 2".
