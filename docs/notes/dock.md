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

## 2026-10-14 — his lucky rod, his old spot, the lamps

- **The rod is the scan** (`assets/fishing-rod.glb`, Ergin ERYILDIR, CC-BY-4.0; loader right under
  `holdable(fishingRodItem, …)`). Its blank and line are SKINNED to a ten-bone chain and its one clip is one
  frame, and a skinned mesh does not survive `holdable`'s `clone(true)`, so `rodBake` bakes every part flat
  (positions through `getVertexPosition`, normals through the blended bone matrices — the whale's `wbBake`)
  and the whole rod is put in the built rod's frame: +Y up the blank (butt→tip measured off the blank's
  extreme vertices along (-1, 0.83, 0)), the GRIP at y 0 (the reel foot's centre projected onto the axis),
  the reel hanging on -Z, 1.9 m. `ROD_TIP_Y` is a `let` measured from it. The crank (`rod03`) is a pivot named
  `reel` on its axle (the 8 % of its vertices nearest the rod's plane), so `rodArmPose`'s `reel.rotation.x`
  turns it. Materials: metalness 0 (METALNESS IS A TRAP), emissive lift 0.07 (0.18 made the white blank glow).
  `fishingRod` starts EMPTY so the icon waits for the scan; `ICON_CACHE_V` v8. `iconRot.flip`, tip up-right.
- **Hold to reel** (`rodHeld`: left button, or E/F held): a press with the float down starts `reel`, and
  `updateRod` drops back to `down` the frame it is let go — the float stops where it is. Measured: cast lands
  ~21 m out; 0.67 s held reels 5 m; released it stays put; held again it comes home. Prompt "Hold to reel in".
- **His lines** (the `rod` node, then `farUp`): "Take these. It's my lucky fishing rod and a map of my old
  fishing spot. …" → "Thanks" → "I don't go that far up the beach anymore."
- **The map is back** (`BEACH_MAP_ON` true) and has NOTHING on it but coast, cliff, sand, sea marks, the rose,
  the cartouche, the scale, the folds — the owner: "take all landmarks off the map just show the big rocks but
  dont label them". The rocks come off `rockColliders` (a stone: has `r`, top 1.2–12, no `mat`, not castle,
  whale or `fill`), each a lump inked in plan (the sheet is ~10× tighter along the beach than across it).
  The big red X is at `(TRIBE_X - 3, TRIBE_Z - 10)`, past the five's fire, where the owner will put the tree.
- **The dock lamps hold their pool slots from 300 m** (`lpAlways`): a pooled lamp otherwise only wins a slot
  inside its own falloff (14 m / 9 m), so they faded on as you walked up — "i see them turn on when i get close".

## 2026-10-14 — the spot itself: the X, the tree, the fish; the chart made old

- **The X moved straight left, into the water** (`FISH_SPOT`, declared with the tree after `TRIBE_X`): world
  x -10 at the same z (`TRIBE_Z - 10`). At x -6 it sat in the worn hole where the chart's centre fold crosses the
  first third (`mapX(-6)` ≈ 503, the fold at 512, `mapY(-846)` ≈ 512 = `MAP_H / 3`). The chart is drawn on first
  use, so a constant declared at 60k is fine there.
- **Nothing written on it, no compass**: the rhumb lines, the rose, the cartouche and the scale are gone. **Made
  old and folded**: each of the 4 × 3 panels is shaded as a plane of its own (mountain and valley folds alternate,
  so the light gradient flips at every crease), each crease is a dark line with a rubbed pale ridge, cracked in
  runs with fibres, split in from both edges; worn-through holes where folds cross; a tide-marked water stain on
  the lower right with the ink faded inside it; thumb grime at the edges. Cracks were first drawn at 0.85 alpha
  and read as white dashed lines — 0.35–0.6 now.
- **The tree** (EFX, CC-BY-4.0, `assets/tree.glb`, 8.3 MB at `--tex 1024`; 13.8 MB at 2048): a windswept pine
  skinned to ~450 bones with a 2.5 s sway. Its roots are measured off the trunk's (the one unskinned mesh)
  lowest vertices; `TREE_SPOT` (5.4, `TRIBE_Z - 10.5`), yaw -0.31 turns its lean (root → crown (-3.6, +1.15)
  in its file) straight out to sea, scale 1.8 (~11 m), sunk 0.18. The surf there runs x -2.6 … +7.5
  (`shoreLineJS`), so the roots are wet now and then, which is how such a tree stands. Needles alpha-tested
  (0.42, depth-written — the blended cards re-sort per frame, Henry's hair again), metalness 0, emissive lift
  0.12. Every mesh `frustumCulled = false` (skinned bounds are the bind pose). Its mixer runs only within
  `FISH_FAR` (150 m) and out of rooms. Trunk colliders: half-metre columns of trunk vertices whose lowest point is
  under 1.6 m (so you walk under the high part of the lean).
- **The fish** (stand-ins until the owner's model: `fishSchoolGeo`): three schools 7–11 m beyond the X (~20 m off
  the water's edge, where a cast lands), one InstancedMesh of 86, each fish milling round its school's drifting
  centre, backs and fins at the surface (the sea is opaque — measured, sunk 2–14 cm they were invisible), a silver
  flash as one turns, one jumping clear every 1.2–4 s with a splash and a ring, and rings over them every 0.18 s.
  From the tide line over the swell that was still a few dark specks, so each fish also stirs two sparks of the
  sea's own light (additive Points, BIO colour) — the patch you see and cast at. Built and both programs compiled
  at load, hidden until within 150 m.

## 2026-10-14 — the chart is paper; the rod points out and winds on the button

- **The chart is a lit sheet of paper** (`mapSheetGeo`, `mapSheetMesh`, `renderBeachMapSheet`; the owner: "make the
  map icon way better too hyper realistic … it just looks like a png"). A 0.42 × 0.63 m plane at 96 × 144 cut along
  the 4 × 3 panels (so every crease is a vertex line), each panel displaced as a plane — mountain and valley folds
  alternate (`A` across, `B` down) — plus a handled crinkle and a lift at the edges; the chart and its blank back
  as two faces, a fibre bump map (`mapPaperBump`), warm-tinted. Full screen it is rendered ONCE (1200 × 1760, a
  warm key low from the upper left so each panel takes the light at its own angle, alpha background so the CSS
  drop-shadow follows the sheet) and shown as the image. The pack's icon is the same sheet folded half up
  (`beachMapIconModel`, through `itemIcon`); `makeMapIcon` (the drawn 64 px icon) is gone; `ICON_CACHE_V` v9.
- **The rod points forward** (`holdable` rot [-1.10, 0, 0.15]: a pitch stands +Y out in front ~30° up, the roll
  leans it in toward the middle; the crank is on the scan's local -X, which the pitch leaves on your LEFT —
  measured, crank vertices average x -0.041). pos y 0.05 so the reel and crank are in the frame.
- **"The reel in is not working"**: the left-click verb (`attackAction`) runs on the canvas's `click`, i.e. when the
  button comes back UP — so the reel `onCast` started had already lost its held button and stopped on its first
  frame. The winding is read off `rodHeld()` in `updateRod` now: a FRESH press (`rod.wasHeld`) with the float down
  starts it, letting go stops it, `onCast` only casts, and a hold that winds the float all the way home sets
  `rod.noCast` so its own release-click does not cast again. Measured with real pointer events: 0.75 s held reels
  5.6 m, released it sits, held again it comes home, and the release after does not cast.
- **The reel's sound**: a gear whirr while you wind (`rodWhirStart/Stop`: looped noise through two bands, beaten at
  6.2 Hz, faded in and out), ratchet ticks as modelled foley (`GF.reelTick`, replacing the swept triangle), and the
  float knocking home on the tip (`GF.reelStop`). The crank turns only while winding (a spinning reel's line peels
  off the spool on a cast; it used to spin backwards). No rod bend yet — the owner's word: wait for the catch model.

## 2026-10-14 — hold to cock the cast; the rod up more; the rocks always on the chart

- **The rod stands ~40° up** (`holdable` rot x -0.86, was -1.10 ≈ 27°).
- **Hold to cock, let go to cast** (`ROD_COCK_T` 1.3 s). Read off the button in `updateRod` like the reel: a fresh press
  with the line home sets `rod.arm = 'charge'`; `rodArmPose` draws it back by `cockNow` (0.35 at once, easing to 1.25
  at the full draw, a small tremble at the top) along `RC` per unit of draw — pitch 0.42, yaw -0.20, roll -0.30, lift
  0.08, push 0.05: back toward upright and out over the right shoulder. A straight pitch of 0.62+ took the whole rod
  off the top of the frame (measured: tip NDC (4.1, 3.3), the reel a dark stub in the corner). Letting go stores the
  pose (`cockPose`) and starts the cast at its WHIP (`armT = ROD_WIND`), which runs from that pose, and `launchFloat`
  throws at 7 + 12·k m/s (rooms 4 + 3·k), k = draw. Measured: a 0.1 s flick lands 9.4 m out, 0.67 s 17.7 m, the full
  draw 30.4 m. `onCast` (the button-up click) only clears `noCast` now; `castRod` is gone. Prompts "Hold to cast" /
  "Release to cast".
- **The rocks were missing when the chart was drawn early** — it is drawn the first time it is wanted, which since the
  sheet became the pack icon is the moment it enters the pack or a checkpoint's first frames, before the rock
  formation's scan has filled `rockColliders`. `beachMapRockN` counts what was drawn; `mapChartTextures` (and
  `openBeachMap` through it) redraws the chart and re-renders the reading whenever `mapRocksNow()` finds more. The
  lumps are bolder too (ink 0.95, fill 0.5, six hatches, at least 12 × 8 px).

## 2026-10-14 — the spot glows; the fish are gone

"Make the fishing area in the water a glowing area … noticeable but natural for the game i don't like the school of
fish idea." The schools (`FISH_SCHOOLS`, `fishSchoolGeo`, the instanced fish and their sparks) are deleted. In their
place `uFishSea` (x, z, radius, strength) in the OCEAN SHADER — beside the farewell's `uGlowSea`, but its own, since
that one is driven by the whale's take — lights a patch at `FISH_GLOW` (`FISH_SPOT.x - 9`, r 10, ~20 m off the water's
edge, where a cast lands) in the sea's own `BIO_COL`: an irregular edge (angular + positional noise, never a disc),
drifting cells (two noises multiplied), a slow breath, pinpricks, and a paler heart. Strength 1 inside 220 m, faded to 0
by 320 m, 0 in rooms. Over it stands `fishHaze`, a soft additive fogged billboard 24 × 8 m with its core 2.4 m above the
water (at 1.4 the core was under the surface and hidden): from the beach the patch itself is a foreshortened line behind
the nearer swell, and the haze is what reads. Measured: a clear cyan patch from under the tree and from the water, a
small glow on the horizon from 30 m up the beach.

**The hold-to-cock cast is OUT again** ("the cast is not working and stops me when moving … put the cast back to how
it was but keep the tilt"): `ROD_COCK_T`, the `charge` arm, `cockPose` and the draw-scaled throw are deleted; `onCast`
(the click) throws the full cast (15.5 m/s, rooms 7) as before; holding with the float out still reels; the rod keeps
its −0.86 tilt. Measured: walking 3.5 m/s straight through a click-cast, the float 20 m out.

## The gifts on his table (2026-10-14)

"make both items appear on the table after being gave them by the fisherman and play the item drop music". `giveFishingRod`
lays the rod (a clone of the baked scan, flat along z, the reel on its side) and `mapSheetMesh` on the shed's `Table`
(top y 2.585) at `FISH_TABLE`, each with `addItemShine` (beacon) and an 'inventory' interactable, and plays `ringDrop`
once for the pair. `fishGift` [rod, map] — 0 not given, 1 on the table, 2 taken — is on the save; a save from before
the table (`pegReturned`) restores rod 2 and map `mapGiven ? 2 : 1`. The rod waits (800 ms retries) if the scan is not
in. To photograph it: hide `__bw.fisherman` and stand at (10.0, 3.75, -217.6) looking at (10.05, 2.6, -219.4) — the
floor is 1.77.

## The captain, his fish, and the screwdriver (2026-10-15)

- The Very Old Fisherman was the wreck's captain (owner's answer). `OFFER_FISH`
  ("I found your fish") rides beside `OFFER_PEG` in all three hubs; the
  reunion is three lines, the middle one Billy's — a dialogue node may carry
  `speaker` (the card's name for that line) and `enter` (run as the line goes
  up: the artifact is handed over on the line that hands it over).
- Billy goes up on the shed's BACK wall over the table (`BILLY_HOME`, world
  10.66, 3.30, -219.75, facing -X): the same mesh, so he talks there too
  ('home' node), and `updateBilly` animates him for a line whose speaker is
  'Billy' in somebody else's script.
- The table top is at y 2.59, x 9.45-10.86, z -220.72..-218.73 (measured off
  the `Table` mesh). The dock is built at 2.8x, so a real 21 cm screwdriver
  looks small on it — left real-sized, `keepSize` (no pickup boost).

**THE REUNION AND THE RING (2026-10-17).** The owner: "a reuniting scene with
Billy Bass and the captain, happy and cute" and the reward is now the **Ring of
Connection** (the Artifact of The Sea is gone, code and all — 291 lines).
- `startReunion` / `updateReunion` (called from `updateBilly`, which runs during
  dialogue): GLIDE 1.1 s from your hands to the captain's shoulder (on your side
  of him, 0.56 m to his right as you look, 0.12 below his head — at 0.34 he
  covered the beard), JOY 6.2 s wriggling and singing (frames 2/3, the mouth on
  `dialogSpeakerNow === 'Billy'`), hearts (`reunionHeart`, pooled sprites, ≤ 24)
  and a music-box tune (`sfxReunionTune`), LIFT 1.5 s onto `BILLY_HOME`, then
  `mountBillyHome`. `billyState` is 2 from the first frame, so a save mid-way
  restores him home.
- **The merge of 2026-10-17 had dropped "I found your fish" from his opening
  choices**: main had added a `wreck` node next to `start`, and git aligned this
  branch's `OFFER_FISH` line into it. Restored; checked by clicking the real
  choice button (a `startDialog` while a dialogue is open is ignored — drive it
  through `#dialog .choice` and clicks on `#dialog`).
- **Billy's three-dots bubble** (main's) is gone; his motion-sensor whirr stays.

**NO CRATE ON THE DOCK (2026-10-17, "remove the crate on the fishermans dock").** `buildCrate` is no longer called for
the pier: the chest key is laid where the crate stood (`dropKey({x, y: DOCK_DECK, z})`), under its glint. Only the
beach crate is built now (`crates[0]`); a save that broke the dock's names index 1, which is passed over, and taking
the key replays by its label. The model's own `BoxCrate` mesh stays hidden and, being invisible, gets no collider.
**AND NO KEY ON THE DOCK (2026-10-18, the owner: "THE KEY THAT USED TO BE IN THE CRATE ON THE FISHERMANS DOCK HAS TO
GO").** The `dropKey` call is gone: the "Rusted Key" (`keyItem`) opened nothing since the captain's key took the sea
chest. `keyItem` stays defined (a save carrying it still loads it; the fisherman's "Do you know about this key?" lines
only show with it in the pack). The end's tally: `STAT_KEYS` drops it (6), `STAT_RINGS` gains the Ring of Connection (6).
