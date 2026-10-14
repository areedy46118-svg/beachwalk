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
