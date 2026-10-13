# The dock and the fisherman

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**And there is no environment map in this game, so METALNESS IS A TRAP.** A
metal has no diffuse term; at `metalness: 0.62` the ring rendered as a few
hundred lit facets on black, because a scan's thousands of small faces
shatter the one directional specular into pinpoints where a built model's
broad faces catch it as sheets. Tarnished metal reads far better here as a
bright rough dielectric with an emissive lift. The body bag hit this first.

**The dock is solid from below and edged from above, and `onDock` is
STICKY.** The first `updateDock()` let the boards count as a floor whenever
your feet were within a step of them — but the drift runs on under the deck,
so walking in beneath the pier carried you up the sand until the deck took
you and you popped up through the boards; and stepping off the sea end
dropped `onDock`, brought the `WADE_X` clamp back, and threw you a metre and
a half up the beach. Same bug both times: a floor test that did not know
whether you were on the thing. Now you get on only at the buried land end
at board height, you stay on until you leave by that end, the other three
edges clamp, and off the pier its whole footprint is a wall — pushed out
along the shallowest face, never toward the buried end, and never toward a
face that would land you past `WADE_X`. The shed door is the model's own
Door mesh re-hung on a pivot with `attach()`; its doorway slab is solid
only while `dockDoorOpen` is false.

**Dock colliders come out of the model, in three shapes** (in its loader).
`columnsOf()` buckets vertices on a coarse grid and emits a cylinder per
bucket — the piles are a single mesh whose bounding box is the whole pier.
`slicesOf()` cuts the boat along its length and takes the beam of each
slice, because its bounding box is a rectangle with a metre of open air at
each corner where the hull tapers, and that is the invisible ledge you could
stand on off its side. `boxOf()` does the table, chair, ladder and crate,
which really are boxes. A per-vertex occupancy grid was tried for the boat
and was worse: vertices are sparse inside big flat faces, so its own floor
came out full of holes.

**The pier is an L, and its footprint is SAMPLED, not assumed.** Asking
whether you stood inside the deck's bounding rectangle put boards under you
out over open water — including right over the moored boat, which is the
invisible deck you walked along at plank height with wood knocking
underfoot. `buildDeckGrid()` raycasts down onto the floor mesh over a 0.35 m
grid ONCE at load; `deckHeightAt()` is a lookup after that, because a
raycast per frame per prop would be far too much. `onDock` is no longer
sticky either: you are on it while there are boards under your feet, so you
step off wherever they stop.

**The dock clamp must not get the last word on your position.**
`updateDock()` clamps you to the deck footprint, and running that after the
solid push-out put you straight back inside a pile — which is how you ended
up standing in one. The push-out runs again after it.

**A billboard and a solid prop at the same spot fight.** The fisherman's
blue tub was directly under him, so the sprite plane cut through the
cylinder and the tub's front half ate his legs and boots. It is set back
0.3 m into the shed instead, behind him from the doorway — which is the
only direction anyone sees him from. And `dialogTarget` takes a `headY`,
because a sprite's origin is its centre and on a seated man that is his
chest, so the push-in framed his jumper.

**`headroomClear()` gates standing up, and it RAYCASTS.** It asked whether
you were inside the pier's plan rectangle first, which is a much bigger
thing than the pier's roof — the boat is moored inside that rectangle with
open sky above it, so standing up beside the boat was refused. A ray up from
your head knows the difference. It also uses a narrower body than the
push-out for the analytic colliders: at the full radius, standing beside one
of the pier's bollards counted as a ceiling. Jumping stands you up first.

**Splashing needs a reason.** Three separate sources each fired without one:
a prop resting near the waterline crossed `submersionAt` every few seconds
as the swash moved and splashed each time (it needs an arrival SPEED); the
crab wading fired `sfxSplash`, which is not positional, from anywhere on the
kilometre (it needs a distance gate); and landing splashed off `inWater`
alone, which is true above the sea as well as in it.

**Crouch is a toggle (Ctrl), and it is what gets you under the pier.**
`playerEye()` / `playerHeight()` replace the EYE_HEIGHT constant everywhere
"where are my feet" is asked; `updateDock()` only makes the footprint a wall
when `feet + playerHeight() > DOCK_DECK`, so crouching walks you under it —
the piles stay solid because they are real colliders.

**Splashing is for walking THROUGH water, never over it.** `wading` is
gated on `!onDock && !onShip` and on your feet actually being near sea
level; before that the pier's boards splashed underfoot.

**The dock house is a fixed world object like the wreck** (`DOCK_*`,
`updateDock()`), sixty metres past it. The model is built at about 1:2.8 —
its door is 65 cm — so it is scaled to a door you can walk through and turned
-90° so the shed end is landward; model x runs down world z and model z back
up world x, and `updateDock()` works in model space. You get onto the boards
by the DRIFT, a `makeApron()` dome of the beach's own sand banked against the
land end, which `driftAt()` also serves as terrain. The boards only count as
a floor when your feet are already within a step of them, so walking under
the pier keeps you on the sand; the shed's walls are five thin slabs with the
doorway left out, pushed out of along the shallowest face and only at deck
height. `onDock` lifts the `WADE_X` clamp because the sea end stands past it.
The two lamp materials are lit and carry a PointLight each; the whole thing
is in `farProps` at 300 m.

**AND A TAKE THAT HAS HANDED YOU OVER HAS FINISHED.** The lift runs from the
beam to the flash and the CUT happens partway through that window, so without a
`!inShrine` guard the take went on hauling the player toward the saucer's beach
coordinates after they had been set down in the hall — three thousand metres
away, so it dragged them clean across the floor while the white was still up.

**AND THE DOCK'S TWO LAMPS WERE IN `farProps`.** This is the last copy of the
oldest performance bug in this file and it was hiding in the one list that
looks harmless: `farProps.push` on a LIGHT. Measured across the abduction, 29
point lights while you are in the hall and 31 the instant the crash puts you
back on the sand — those two — so the cut paid for thirty fresh shader
programs and, once, a frame of nearly eleven seconds. Left switched on they
cost nothing: an 11 W lamp with a 14 m falloff at `DOCK_Z` lights nothing else
on a kilometre of beach, which is exactly why the hall's lamps and the
saucer's already live in a group that is never hidden. **Far-cull the boards,
never the lamp.** With the count pinned at 31 the walk has no light transition
anywhere in it (measured every 20 m from z = 60 to -420: one value).

**AND A REEL THAT MOVES HIM STILL OBEYS THE ROOM.** `mutClampX` is called
from every movement branch and the knockdown is not one — it rebuilds his
position from `hitFrom` plus the clip's own travel and returns — so a fall's
metre and a half could carry him through a pier and stand him up inside it,
where the chase's own clamp then shoved him out a hand a frame. The down
branch clamps too now, and the correction is folded back into `hitFrom`,
because a position that is rebuilt from a stored point every frame forgets
any clamp it is not told about and re-fights it every frame.

**AND HE STEPS ROUND A PIER RATHER THAN SHOULDERING IT.** The chase is a
straight line at you and a nave's piers are a metre of stone with open floor
either side, so he met one, the push-out held him off it, and he worked along
its face — which on a thing this size reads as stupid rather than as strong.
The Dealer has had the answer since the bunker's table and nothing else in
this game had it: `S.clearAhead` marches a heading and says whether a body of
a given radius can walk it, `S.route` is a breadth-first search over the free
cells thinned to its CORNERS, and the route is dropped the moment the direct
line opens — a route is a way ROUND something, not a way of getting about.
Both take `bare`, so the only things he ever routes around are the walls and
the columns. Measured with a pier between them: he is on a seven-waypoint
route within half a second, past it in one, and closing straight after.

**AND A HEADING IS A TURN, NOT A SNAP.** The other half of "he flies around",
and it came in with the routing: `S.route` starts from the nearest cell a
body FITS in, which when he is pressed against a pier is a cell back the way
he came — so the route's first waypoint could be BEHIND him and he spun to
face it. Measured: **48 degrees of heading in one frame**. Two fixes, and
both are about mass: the route skips any leading waypoint inside a stride,
because anything that close is already behind him; and `kind.turnMax` is
radians a second, a cap on how fast the thing can physically come round.
Measured after, over a three-minute fight: **5.0 degrees a frame, worst** —
and he still routes past the pier every time. A corner is rounded too rather
than turned, the aim blending toward the waypoint AFTER this one as he closes
on it, so a route reads as something with momentum walking a curve.

Measured at the end, hands-off at fighting range over three minutes: **39
swings and 40 damage a minute at 97 % connect, 98 % of contacts on screen at
0.31-0.55 m from the chest, still between swings 15 %, worst step 0.128 m,
worst turn 5 degrees a frame, worst tick 4.3 ms** — and crossing the nave
from his alcove he takes **eleven pews** with him and arrives in four
seconds.

**The walk ends when you put your hand on the light.** Not by arriving, and
not by stepping onto the gallery — that fired `showEnd()` off a two-metre
drift and finished a kilometre by accident. The optic carries a `hitProxy`
cylinder sized to the whole lens (the crosshair cannot find a 0.19 m burner
through a glass drum), registered as an interactable far down the file
because `addInteractable` does not exist where the lantern is built. `Enter`
is an alias for `E` everywhere, for the people who reach for it on a prompt.

**AND THE DOCK'S CUTSCENE IS BEHIND YOU.** It fires on Z alone and the
pavilion is three hundred metres past it, so a restore played the whole
swim-in the moment you loaded, at a place with no water and no crabs.
`beginRestore` marks `packPhase = 2` when the checkpoint is past the trigger
and leaves those three asleep where they wait — which is what the beach
behind you actually looks like once you have walked it. Anything else keyed
to a trigger you have already crossed needs the same treatment.

**AND WHAT WAS STANDING ON IT FALLS, BUT IS NOT SMASHED THERE.** Each prop
holds a `floorAt` that answers with the table's top; the break drops that and
hands them back to the physics, so they arrive on the steel a beat later and
their own `onImpact` finishes them. Bursting them in the same frame reads as
the table exploding, and this is a collapse.

**REVERTING THE FRAME IS STANDING STILL, AND STANDING STILL IS THE BUG.** The
player's furniture clamp pushed out, then escaped, then — failing both —
refused the move, which is exactly the state it was meant to prevent. A
blow's knockback can put you a metre inside the console bank in ONE frame,
deeper than `escape` looks, and from in there every move is refused for ever.
`S.mainRegion` is the last word: the largest connected piece of walkable
floor, worked out once. Measured: 72 starts buried in furniture, none still
inside twenty frames later, worst ejection 1.28 m.

**SOME PEOPLE DO NOT LET YOU WALK AWAY.** Escape closes any conversation,
which is right for a man in a shed and wrong for the one standing between you
and the ladder: leaving his line unanswered left `dealerFight` false and him
rooted to his mark for the rest of the game, so the boss of the game had an
exit written into his own dialogue box. An NPC may carry an `onLeave`; his
takes the crowbar off the shelf.

**The three, and the wakes.** `PACK_Z` is `DOCK_Z + 18`, in front of the
shed.
They wait a long way out with `wake: 0`, so they never notice you on their
own; crossing `PACK_TRIGGER` starts the cutscene and what wakes them is its
end. **The trigger is the player's z ALONE** — it does not care whether you
are walking the waterline or the foot of the cliff — and it has to be a long
way past the wreck: at `DOCK_Z + 34` with a 22 m lead it fired at z = -159,
four metres past the wreck at -155, so it went off the moment you were clear
of it instead of on the last stretch to the dock. It fires at -177 now, 22 m
past the wreck and 38 m short of the shed. Two things make it work: `updateCrabUnit` already hides anything with a
submersion over 0.92, so on the way in there is nothing to see BUT the wake —
which is the whole idea — and they have to come ashore at the WATERLINE
(`PACK_SPOTS` at x ≈ 2–4), because arriving out in the deep ended the
cutscene on three ripples and nothing standing in them. The camera is TURNED,
never moved, so every clamp still agrees with where you are standing and you
are exactly there when it lets go. `packCut` is in `frozen()` and in the
pointerlock guard, like `peeking`.

**A LIP IS NOT A WALL, AND THAT IS A QUESTION ABOUT THE FACE'S OWN CROWN.**
The plank would not lay as a ramp up to the vaulted passage, and the reason is
the one every push-out in this file eventually meets: the thing a board leans
ON is, in plan, a face right beside it. Traced station by station, the riser of
the 1.74 m step into the passage tops out FOUR CENTIMETRES above the station
resting against it — so a band starting a finger over the timber read it as a
wall, pushed the board sideways a quarter of a metre a frame, and walked the
ramp off the stall roof and into the hall.

Raising the band until it cleared that riser works and is the wrong fix: it
lets the board through everything else as well (0 of 104 drops came to rest in
stone at the tight band, **12** at the raised one). The band is opened DOWNWARD
instead and the face is judged by its TOP — `keepWallNear` returns `yhi` of the
triangle it picked, which it has had all along — so anything whose crown is
under a hand's breadth over the timber is a lip the timber lies across, and
anything taller is a wall. Measured after: the ramp stands (3.61 → 6.10 over
the passage lip, walked from the stall roof into the tunnel and on to its far
end), the bar's edge still gives a ramp (0.09 → 1.45), the gap is still
bridged, and **0 of 104 drops** leave any part of the board inside drawn stone.

Two smaller things came out of the same pass. **A station is a cross-section,
not a disc**: the timber is half a metre wide ACROSS its axis and nothing at
all along it, so an interior station is pushed across by however much the face
really is inside the width, and only the two ENDS keep the whole push — an end
driven into masonry is the one case where along IS the overlap. And **a
teleport is not a frame's motion**: the between-frames segment test reverts a
move that crossed a face, which on a body picked up and put down somewhere else
entirely (a restore, the harness) reverted it to wherever it had last been
lying. It is skipped past a metre.

**THE BEACH MOODS ARE SUBTLER AND WANDER.** The tint is let through at 0.55 and the density excess at 0.6; the z the mood is read at is pushed ±35 m by slow noise so a hand-over never sits on a line; and the density breathes a few per cent on two slow counts.

**PAINTED, TO MATCH THE SKY.** `paintBands(mat)` steps a material's finished
light into soft bands in sqrt space and meets the smooth value halfway; it is
on the beach's rock formation. The sea bands its facet light (five steps),
its moon highlights (flat strokes) and its crests the same way.

**AND EVERY SIGN IS MEASURED, NOT REASONED.** Which way a thigh's `fwd` takes
the foot, and which way a shin's `right` lifts it, are properties of somebody
else's rig; this file has got the curl of a fist, the swing of a thigh and the
roll of a tail wrong at least once each by reasoning about them. A test
rotation goes on the joint, the FOOT is asked where it went, and the sign that
moves it the way the parameter is named is the one kept. The STRIDE is
measured the same way, off the planted foot of the finished clip, because the
parameter is an angle and the travel is a chord: 0.845 m of travel for a metre
asked for.

Measured after: foot lift 0.20 m, step width 0.44 m, planted drift -0.97 to
-1.23 m/s against a declared 1.11, and in a live fight both clips play at
timeScale 1.77 — 1.96 m/s of foot travel against a circling speed of the same.
**He is still only circling 0.2 % of the time**, which is his own tuning
(`circle` 0.18, `press` 0.96) from the round that established he comes at you
rather than hesitating; the strafe is now correct whenever he does use it.

**AND THE KEY FROM THE CRATE AT THE DOCK NOW OPENS IT.** It was "A Rusted
Key" and its own comment called it a placeholder for whatever the pier turned
out to be about; it is the "Chest Key", and the pier is the first half of a
sentence that finishes in the wreck. It is NOT eaten — the shell door
swallows its own key because that door is a way off the ship, and a chest is
a thing you come back to.

**A RAGDOLL MAY NOT BE FINISHED UNTIL IT IS LYING, AND "LYING" MEANS
LYING.** The spindle — three metres on long shins — knelt with its chest a
metre up and the 5.5 s deadline put it to sleep there: "frozen mid-air". Two
things let it: `lying` was 0.42 of the height it died at, which for a
three-metre body is a chest at 1.3 m, and the deadline only asked that a foot
be on the floor. `lying` is now a shoulder's width (0.24 of the height,
clamped 0.5–0.8); a body not lying by 1.2 s goes LIMP (`r.limp`: the trunk's
stiffeners and the bend limits are eased off, and a limp chain of fixed
lengths cannot stand), one still up at 3.4 s SLUMPS onto the floor under it,
and nothing sleeps it before then (a hard stop at 9 s). And `RAG_TRAVEL` no
longer teleports a body back and zeroes its speed — on a body in the air that
was a corpse stopping dead mid-flight; it brakes it across the ground and
leaves gravity alone. Measured over sixteen kills in three sessions, every
body ends with its highest joint 0.17–0.40 m over the floor.


**HIS CHART (2026-10-09).** Giving the peg back now hands over the rod AND
"Old Map of the Beach" (`giveBeachMap`, `beachMapGiven` on the save; an old
save with the leg given and no flag is owed one after the restore). The map is
drawn once, on first use, on a 1024×1536 canvas (`drawBeachMap`, ~16 ms) from
the game's own positions (`mapY(z)`, `mapX(x)`), so it cannot lie about
distance; USE opens it full-screen through `noteOpen` (closeNote hides it), the
pack's inspect shows a curled sheet. PNG, because the burnt corner is cut out
of the paper and a JPEG paints the hole black.
**"I found your leg" needs the LEG, not a peg**: dev mode grants the Spare
Peg as a weapon, so `inventory.includes(pegItem)` offered the line to a player
who had never opened the wreck's chest. `OFFER_PEG` now also asks
`pegTaken`, which is on the save as `pegFound` (an older save: the chest was
unlocked).

**THE CHART, REDRAWN (2026-10-09; "it looks bad … hyper realistic … nothing
on the back … no whale, catacombs or UFO").** 1536×2304 (drawn in the
1024×1536 coordinates under a 1.5 transform), ~70 ms on first use.
`mapPaper` (rag paper: two scales of mottling, fibres, foxing, tea stains with
a tide-line rim, edges yellowed and darkened) and `mapEdge` (a deckled,
browned edge cut with `destination-in`) are shared with `drawBeachMapBack`,
the blank reverse. The look that reads as REAL rather than drawn-by-a-program:
watercolour washes under the ink (canvas `filter: blur`), the engraver's
WATER-LINING (eleven offset coast lines fading out), rhumb lines from a
32-point rose, stippled sand, hachured cliff, every ink line drawn twice (a
faint wide bleed, then the line) with a tremor, Palatino italics with a soft
shadow, a ribbon cartouche, folds with a dark crease + pale ridge + soft
shadow + ink rubbed off, and worn spots where the folds cross. Concentric
"hills" read as rings — taken out. The full-screen view gets a PNG through
`toBlob` (the sheet is big); the inspect model is two faces, the chart in
front and the blank paper behind.

## 2026-10-13 — the chart draws the castles as one road

`drawBeachMap`: his dotted way up the sand now ends at the first castle's
gate; from there the castles are numbered in his hand — i. the castle, ii.
XIII, iii. the throne (a crown over XIII's keep), iv. the light (drawn at
`ISLE_AXIS`, the island, not the old `LH_X`/`LH_Z`) — with the road between
them dashed in red and a barb at the middle of each leg, and "one road in,
the same road out" under the castle. Labels near the right edge run off the
1024-wide sheet: the crown sits over XIII and the note under the castle so
nothing is clipped.
