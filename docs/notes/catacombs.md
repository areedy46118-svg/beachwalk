# The catacombs and the hunter

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**THE CATACOMBS: THE SAND GIVES PAST THE STONES, AND THE MONSTER HUNTS YOU
UNDER IT.** The owner's brief in one message: a little after the portal the
ground caves in dramatically and you fall into wiz's "Catacombs Map"
(CC-BY-4.0, `assets/catacombs.glb`, `tools/undercroft_pack.py tavern` — exact,
142k triangles, 9.1 MB, NO `--scale`: the file already carries its own
centimetre root and a 0.01 on top made a 27 cm walk grid), landing in the crypt
room of the first screenshot; dark; the monster wandering the whole place
looking for you, his feet and claws heard scraping when he is near; attacking
only when he has you in sight; hard to kill; the way out the barred door of
the second screenshot with light through its window, onto the beach from a
door in the sand wall. `CAT_*`, the tavern's machinery on a third site.
What it cost, in the order it bit:

- **A ROOM IS FOUND, NOT NAMED.** The file has 744 nodes called `Object_N`.
  The rooms came out of the WALK GRID: flood the storeys by height into
  connected pieces, render each from inside (`tools/sheet.js` has
  `__loadGlb` / `__view` for it), and match the pictures. The crypt room is
  floor 0.34 at (5.6, -11.6); the barred door is the +x wall of the upper room
  at (8.84, 4.33, -14.4), flanked by torches at z -15.3 and -13.5 with skulls
  at its foot — the second screenshot exactly.
- **AND "YOUR Z ALONE" FIRES IN A ROOM AT POSITIVE Z — the keep's own lesson,
  the day after.** Not this time: the trigger is a BAND (`CAVE_Z` .. -7) on
  the beach with `!inRoom()`, and `caveDone` is on the save and inferred past
  it. The take is four beats on the wall clock (`updateCaveIn`): the shake and
  sand off the ground, the give (a crack and the camera falling under its
  own gravity with the black closing over it), the cut, the landing.
- **THE CLIFF CLAMP WAS STILL ON IN THE ROOM.** Every frame `update()` pulled
  `camera.position.x` to `CLIFF_BLOCK_X` — nine kilometres — and the hall cull
  then measured the room from the beach and HID it, and the room's walk put x
  back before anything drew, so the camera read as inside a room that had
  been switched off. Traced with a setter on `visible`: `cullWorldInHall`,
  under `update()`. `!inCat` joins the one list of places that are not this
  beach. (And a `bwSpan` frame that says "cannot access 'right' before
  initialization" is the life layer's TDZ from the round before, on the frame
  a page hidden to rAF finally drew him.)
- **THE HUNTER'S GRAPH IS THE STOREYED WALK AS NODES**, (cell, storey) with a
  hop over one missing cell (`catBuildGraph` / `catRoute`, breadth-first).
  Three filters were wrong before one was right: headroom 1.6 threw away the
  crypt room (this model's rooms are 1.5 m under the next slab — a catacomb;
  0.9, he crawls); a wall clearance of 0.28 m cut the graph into 229 pieces
  because its stairs and doorways are narrower than that (none — his body,
  not the graph, keeps him off walls); and "no roof" is the OUTSIDE of the
  model only when nothing stands over it in the same cell. Measured: 14,512
  nodes, one piece of 9,962 that reaches six of the seven rooms (the flooded
  level is the seventh).
- **A TARGET HE CAN REACH.** A random node anywhere was outside his piece often
  enough that, once down a stair into the water, every route failed and he
  stood there for good. `catFlood` from his own node, cached, and targets come
  from that.
- **AND THREE THINGS UNDID EVERY STRIDE.** The wall push at a cap of 0.06 a
  frame cancelled the follower's 4 cm step (a millimetre moved, a live route in
  hand); on a route he ignores the drawn faces and trusts the floor cells. The
  snap back to the last standable spot refused the one-cell gap the route
  hops; on a route he crosses it. And a stuck test on per-frame deltas never
  read as still while a clamp argued with the follower; it is NET progress
  over a second and a half now.
- **HE SEES YOU ON TWO EYE-LINES, ON YOUR STOREY.** `catSees`: inside thirty
  metres, a 72-degree cone (hearing inside six, and inside three whatever he
  faces), no drawn wall between his eye and yours at EITHER eye height (a
  tomb at chest height between you hides neither), and never a storey apart —
  at 2.6 m of slack he heard you through a floor and roared at the ceiling,
  and the fight AI, which is planar, then had him "in reach" of a player a
  storey up (`near` is false across a floor now). Lose him for six seconds
  from ten metres and he goes back to searching from where he last had you.
- **HIS FEET ARE CLAWS ON STONE.** `voice.scrape` routes his step through
  `sfxClawScrape`: a rasp swept down through a band, a click, a knock under
  it, panned by his bearing (`panTo`) and gone by twenty-six metres.
- **THE PANE HIDDEN TO rAF RUNS NO FRAMES**, and a hidden pane looked
  displayed to `tabs_context`: a reference tab opened beside it was enough.
  `bw.animate()` by hand drives a frame each; `document.hidden` is the truth.
  And a dev checkpoint left 14 m from him reloaded the page every nineteen
  seconds — `playerDied` — for a whole round of "nothing works".

Measured: he wanders 50 m in 22 s across three storeys, walks into the crypt
room, sees you and roars; in the room 9 swings and 12 damage in 14 s at 2.6 m
with his face on you 98 % of frames; the door puts you on the sand at
(12.6, -800) with the wall door 1.9 m to your right and the checkpoint written.
Health 80, poise 12, a guard of 0.28.

Two smaller ones from the last look. **You land where the picture was taken
from**, not in the middle of the room: `CAT_LAND` is (7.0, -12.5) facing the
green tomb, because the first spot put the sarcophagus at your back and the
first thing you saw of the crypt was a wall. And **a door swung -0.72 about Y
opens OUT over the beach**: a leaf built along +z swings to (sin, 0, cos) of
its yaw, and -x is seaward here, so the door in the sand wall stood across
the frame with the beach behind it; +0.72 puts it into the recess, where the
comment always said it was. Read a swing's sign off where the leaf ENDS UP.

**AND THEN THE CATACOMBS WERE TWICE THE SIZE, PITCH DARK, AND THE THING IN
THEM LIVED THERE.** The owner played it: everything too small to walk
through, he could not fit in the doors, the monster glitched through the
ground and was lit up like a lamp, and the room lagged all over. Seven
things, and the two that mattered most are both about a graph.

- **A ROOM IS SCALED AT THE PACKER, NOT IN THE GAME.** `tools/undercroft_pack.py
  tavern … --scale 2.2`. Measured on the first pack: rooms 1.5 m from floor
  to slab against a 1.88 m body, and corridors 0.6 m wide — that is a
  catacomb you crawl through sideways and it is exactly what "I couldn't fit
  in the doors" is. At 2.2 the rooms are 3.3 m and the doorways 1.3 to 2.
  Every number the game holds about the place is written `× CAT_SCALE`, so a
  spot measured in the old file is the same spot in the new one.
- **VERY DARK, WHICH IS A LEVEL AND A REACH.** The stone carries 0.03 of its
  own map (it was 0.085), the fog is 0.040 and near-black, and a torch is
  1.7 over 8.5 m rather than 2.6 over 11 — so a torch is a pool with dark
  either side of it and not a room light. What carries the place is the
  flames, the door's cold glow and what you are holding.
- **AND HE WAS LIT FOR A BEACH.** `emis` 0.10 with a cold Fresnel rim is the
  pack's night lift — a creature on open sand under a quarter moon is a hole
  in the dark without it — and in a room whose stone reads 3 it made him a
  pale animal visible across the whole hall. Measured by rendering him and
  then hiding him and diffing the frame: at 3 m he covers 6.3 % of it at a
  mean of 9.8 against the room's 3.2, which is a dark shape you can just
  make out. `emis` 0.022, the rim a third of what it was.
- **A FLOOR LOOKUP SEARCHES DOWNWARD, WHICH IS HOW HE WENT THROUGH THE
  GROUND.** Standing over a stair well or a hole in a vault, `keepFloorAt`
  answers with the storey BELOW — and the follow eased him into it at three
  metres a second. `catStand` is the one door now: a floor more than a
  stride under him is not his floor, he holds the last one he stood on, and
  if he holds it for most of a second he is put back on the nearest node at
  that height and his route dropped. Measured over ninety seconds of
  roaming: never more than 0.27 m under a floor, and 1 % of frames with
  nothing under him at all.
- **"I LAGGED ALL OVER THIS ROOM" WAS THE ROUTE, AND IT WAS THREE FAULTS IN
  ONE SEARCH.** Measured: 9.6 ms a route with the chase asking for one every
  0.4 s. (1) It was a BREADTH-FIRST search over 53,145 nodes, which visits
  every one of them before it gives up — A* with the straight-line distance
  finds a path in a tenth of a millisecond. (2) The reachable set was an
  ARRAY and `Array.includes` over 35,324 ids was asked every time he chose
  somewhere to go; it is a mask. (3) A node every 0.2 m is nine times the
  graph a crawling animal needs — at 0.6 m it is 5,887 nodes and the build
  is 112 ms rather than 275.
- **AND A WEIGHTED HEURISTIC IS INCONSISTENT, SO A* MUST CLOSE WHAT IT HAS
  EXPANDED.** This is the one that took the longest to see, because the
  symptom lies: routes to nodes his OWN FLOOD had just proved reachable came
  back refused, eleven in twenty, at seven milliseconds each. Every one of
  them had popped 14,001 entries — the cap — on a graph of 5,887 nodes,
  because a node whose cost improves after it has been popped gets expanded
  again, and with a 1.3 weight that cascades. A closed stamp ends it: 30 of
  30 routes, median 0.9 ms, worst 2.1. **If a search fails on something you
  can prove is reachable, count its expansions before you touch anything
  else.**
- **AND A SPOT RESOLVES TO A NODE ON THE STOREY YOU MEANT.** Two rooms stack
  at the same (x, z) all over this place, so `catNodeAt` can answer with the
  floor above or below the one a target was taken from — and the route was
  then refused as unreachable by the very flood that produced it. It takes
  the reach mask and prefers a node inside it.

**AND THEN HE GOT A HOME, A GRAB, AND NO DEATH.** Seven things on the
owner's list, and the useful ones are the three that change what the
encounter IS rather than how it looks.

- **DEV MODE SURVIVES A RELOAD THE GAME ITSELF ASKED FOR.** "No deaths, no
  cutscenes" is what you are testing WITH, and every death and every
  restart-from-checkpoint reloads the page — so it came back off and the
  takes you had just skipped played again. It rides in `sessionStorage`,
  written by `reloadInto` and consumed at boot, which a new tab does not
  have: a game still always starts as a game. And the cave-in is a take, so
  in dev mode it does not play one — it still puts you in the room.
  Measured: `caveBusy` never goes true and you are in the catacombs.
- **HE DOES NOT DIE, HE GOES DOWN.** A catacomb with a corpse in it is a
  catacomb you have finished, and the whole of the fear down there is that
  it is his and you are in it. `kind.undying` intercepts `killMutant`: the
  blow still lands, still throws him, still reads as a kill — and he lies
  where he fell with the death clip held on its last frame for forty to
  sixty seconds, then the same clip runs BACKWARDS, which is a body rocking
  back onto its hands, and he is up with two thirds of his health and a
  roar. Measured: down 43 s, up at 53 of 80, straight into a stalk.
- **AND HE TAKES YOU IF YOU ARE NOT LOOKING.** `catCanGrab` wants him inside
  2.9 m, on your storey, and your eyes off him for a second and a half
  (`catSeenAt`, stamped six times a second the same way his own sight is) —
  and then it is not a swing, it is a TAKE: up off your feet with his face
  in yours, screaming, a point gone, and thrown back down on the spot you
  were standing. It costs your footing and the thing you were about to do
  and it leaves you playing, which is worth more than a death screen. It
  runs on the wall clock beside the cave-in and the door, the camera is
  turned and never moved, and `catGrabT >= 0` is in `frozen()`.
- **AND A TAKE SETS THE POSE; IT DOES NOT ASK FOR IT.** `mutPlay` crossfades,
  which is right for a fight and wrong for a scripted beat: measured
  mid-grab, the grab clip sat at weight 0 with the crawl still at 1 and what
  played was the crawl. Setting the weight explicitly was not enough either
  — BOTH then read 1, because an action the mixer has already bound goes on
  contributing until something zeroes it. Every other action is stopped,
  zeroed AND disabled. (`stopAllAction` is the one thing that must not be
  used here: it restores every bound property, which is the bind pose — the
  severed limb's own bug.) And the take OWNS him: the fight's own `mutAnim`
  was picking a gait over the top of it.
- **HE MOVES LIKE HE KNOWS THE PLACE, WHICH IS A STRING-PULL.** A route over
  a grid is a staircase of little turns — cell, cell, cell — and what that
  reads as is a thing feeling its way along a wall. `catSmooth` drops any
  waypoint whose neighbours can see each other (`catLineOpen`: the drawn
  faces at his hip and his shoulder, the floor under every stride, and the
  headroom), so what is left is the long runs a thing that lives here would
  take and the turns are only where the walls actually turn. Measured: legs
  went from 0.6 m to 3.0–4.3, a 74 m route from about 120 waypoints to 26.
- **AND HE STALKS A GREAT DEAL MORE.** He goes to a corner from eight metres
  out rather than eleven; a stalk is THREE corners, each nearer than the
  last, rather than a clock; a peek is held five to eleven seconds; losing
  you in a fight sends him back to watching half the time rather than always
  searching; and `blooded` — which is what makes him charge instead of peek
  — lapses after forty seconds, so the second half of a long visit is not
  all fighting.
- **AND THE BONES ARE THE THING THAT TELLS YOU ABOUT NOISE.** His hearing has
  been in the game since he went in — a sprint carries 24 m, a walk 11, a
  crouch 5 — and nothing ever told the player so. The floor of a catacomb is
  bones: run through a pile of them (the piles the game already finds by
  bucketing the skull mesh's own vertices) and it is a dry clatter with no
  body under it, a puff of dust, and a noise that carries twenty-six metres.
  It is the one thing down there that makes where you walk a decision.
- **AND SOMETHING IN THE AIR.** Two `Points` batches and one draw each: motes
  that are POSITIONS rather than particles — a slow wander round a fixed
  offset from wherever you are standing, so the air is always full and
  nothing is ever born or dies — and dust, a pool that recycles, thrown
  where something happened: his feet on the stone within sixteen metres, a
  pile of bones kicked through.

**THE HUNTER WENT ROUND IN CIRCLES, AND IT WAS THE CORNER CUT.** Two rounds
of "he glitches" were measured as one thing: 78 % of roaming frames spent
in a half-metre circle — 113 m of travel in a minute, none of it anywhere —
with a live route in his hands and nothing crossing a wall. `ucFollowPath`
blends its aim toward the waypoint AFTER the current one as it closes on
it; on a route that turns back on itself (the waypoint 1.3 m west, the next
seven metres east, round the end of a wall) that aimed him AWAY from the
waypoint, the distance grew, the blend fell to nothing, he aimed back, the
distance shrank, the blend returned — a limit cycle. The next leg is blended
only when it continues AHEAD of this one. After: 0 % orbiting over four
minutes of roam, and the same follower serves the knight.

- **AND THE WALL PUSHES MUST NOT OUT-STEP THE WALK, which they did twice a
  frame.** `mutClampX` ran once from the follower and once from `catWander`
  after it, each capped at 4 cm, against a 3.2 cm stride. They run once a
  tick (`catTick`, stamped where `catPrev` is) and are capped at a third of
  the stride he actually took.
- **AND THE STRAIGHT CHASE STAYS ON YOUR STOREY.** `clear()` compared each
  sample's floor to HIS feet, which follow the floor, so a stair down beside
  you passed a riser at a time: he finished the fight 1.4 m from you in plan
  and 4.5 m under your floor, 92 % still, two swings in thirty seconds.
  Every sample must be within a step of YOUR level too; a route that keeps
  failing snaps him to the nearest node and then loses you (`catLose`); and
  four seconds still with ground to cover is a loss whatever he thinks.
  Measured after: from 35 m with a line of sight he closes to 3.9 m in
  eight seconds, four trials of four, 13–15 swings a half minute.
- **THE ROUTE PREFERS THE MIDDLE.** Every node carries `w`, its distance to
  the nearest drawn face within a metre, and A* charges nearly double for a
  node against the stone. `catLineOpen`, the string-pull and the chase's
  `clear()` test a hand either side at the hip as well as the centre line.
- **AND WHAT IS LEFT IS THE BODY.** Measured off his skinned vertices in the
  crawl: 1.65 m across the trunk, 3.3 m long, in corridors 1.3 m wide. An
  arm tuck was probed (turn the upper arms about the body's up) and bought
  8 cm — the width is the shoulders. He will touch corridor walls by
  construction; what the routing buys is that he touches both equally.

**THE HUNTER HAS A PLAN NOW: FOUR THINGS, ALL ON MACHINERY HE ALREADY HAD.**
- **HE LEARNS YOUR ROUTE.** `catMemory` is the last three places he laid
  eyes on you (both sight paths write it, six metres apart or it is the same
  place); when he has gone twelve seconds without you, two errands in five
  go to one of them — most recent likeliest — and he WAITS there (`ambush`,
  or a look or a sit). A player who runs the same corridor every time finds
  him in it. Measured: 10 of 40 errands to a remembered spot 13 m away.
- **THE FAKE-OUT.** Once a stalk, two peeks in five are a FEINT: he shows
  for a second or two, and if you have not looked, withdraws — and the next
  corner he takes is at least seventy degrees round you (`avoidA`, held
  until a corner is FOUND there: cleared after the first search it was gone
  on the retry, and he came back on the same bearing). A feint does not count
  as one of his three corners. Measured: a 2.3 s show at 12 s of a stalk,
  gone, and the next corner across the room.
- **AMBUSH AT THE DOOR.** Inside twenty metres of the way out on its storey,
  three times in five and not twice in fifty seconds, his errand is a spot
  in the door room your line cannot see, within seven metres of the frame,
  where he crouches and waits at his full senses — so the exit is not free.
  Measured with the player 9 m from the door: 15 of 20 draws, all hidden.
- **HE KICKS THE BONES AT YOU.** Charging through a pile (the litter check's
  own spots) at over 2.2 m/s with you 3.5–16 m off, he throws five to eight
  real gibs in the skulls' own material at where you stand, arcing to arrive
  in about a second, every six to nine seconds at most; one that reaches
  you takes 0.09 of the bar and knocks the lens (`catBonesHit`, in the
  room's own update). Measured at 7 m: eight of twenty-four land on a
  standing player, a volley about a quarter of the bar. It is the one ranged
  thing he has, and it is readable: stay off the piles.
Every one of them is a branch of `catPickTarget` or the stalk and touches
nothing about how he moves, so the six-of-six chases and the zero-stall roams
of the round before still hold.

**THE DOOR IN THE DUNE IS THE ONE YOU CAME OUT OF, LIFTED.** It was six grey
boxes and a plank leaf — flat colours, no map on any of them — and the
owner's word was that it looks horrible and should look like the door you go
in to leave. It IS that door now: the catacombs' own doorway, copied
triangle for triangle and stood in the sand.

- **AND IT COMES OUT CLEAN BECAUSE OF WHAT IT IS MADE OF.** This file's rule
  is that a box through a scan shears the stones it cuts and leaves ragged
  shards, which is why the tavern's door was BUILT. Measured here, the
  doorway is not in the wall's mesh at all: the jambs either side are
  `CatacombWall`, and the leaf, its frame and its barred head are **983
  triangles of `Stuffidk` standing wholly inside a box round `CAT_DOOR`**.
  The box takes the door and nothing else — the two torches and the skull
  pile that also stand in it are excluded by material.
- **AND IT NEEDS NO TURNING.** The leaf faces -x in the catacombs and you
  come out facing -x on the beach, so the copy is a translation and a scale
  (the room is at 2.2x; the door stands at a door's height out here).
- **AND IT IS SET INTO THE DUNE, NOT STOOD IN FRONT OF IT.** Where the
  sand's face is at that z is a RAYCAST, because a talus leans: 15.23 at the
  sill and 16.10 at head height. The leaf stands a hand proud of that and
  everything behind it is buried.
- The material is CLONED (it is shared with the whole scan, and a lift on it
  would light every stone in the catacombs — the Military Shovel's scar) and
  lifted from 0.03 to 0.12, because down there it has no moon on it.

**THE HUNTER'S WATCHDOG WAS NOT UNDER THE ONE MODE THE OWNER WAS WATCHING.**
`catWatch` is called from `catWander`, and `catWander` is the NOT-AWAKE
branch — so roaming, stalking, searching and fleeing had a net under them and
CHASING, the mode in which he is pressing at you through the furniture, had
none at all. It also refused to act while you could see him or while he was
chasing, on the argument that a creature which teleports in front of you is
worse than one that is stuck: true for a second or two, and false after ten.
What the owner was looking at was a boss ground against a tomb in plain sight
with the net deliberately declining to catch him. The leash is 2.5 s instead
of 6, it runs in the chase as well, and a hard backstop at three times that
moves him whatever mode he is in.

**AND THEY ARE PLACED IN THE CATACOMBS' OWN SECTION, NOT WITH THE PACK.**
Every number in the line is written off `CAT_OUT_Z`, and A CONSTANT THAT
READS A LATER ONE IS A DEAD-ZONE CRASH that takes the page before a line of
it runs. `makeMutant` is a function declaration, so it is hoisted and this is
simply a later call.

**THE HUNTER STOOD UNDER THE DOOR FOR FORTY SECONDS, AND FOUR THINGS WERE
HOLDING HIM THERE.** Reproduced in the pane before anything was touched —
the player at the barred door, the hunter one storey below it: **39.75 s of a
50 s sample with his position unchanged to two decimals**, 4.4 m away in plan,
`wT` at zero on every frame of it. Every one of the four is a rule that was
correct when it was written and is wrong the day the room has two floors.

- **THE GRID SAID YOU MAY STAND WHERE THE WALL SAID SHUT.** The packed walk
  grid carries floor at the door's own level running straight THROUGH the
  leaf's footprint (x 19.2 to 20.0 against a leaf at 18.97-20.01), so a body
  driven into the doorway has floor under it, is inside drawn stone, has every
  step refused by `catCrossed`, and is eased out at two centimetres a frame.
  The severance used to be an ACCIDENT of the graph's own 0.40 m clearance
  from a drawn face. `catShutDoor` states it: 78 cells of 42,168, their
  storeys at the door's level dropped, their lower ones kept. **AND IT GOES
  AFTER `repairKeepStoreys`, WHICH IS THE WHOLE TRICK** — the repair puts a
  storey back wherever the NEIGHBOURS agree and something is drawn there, and
  a doorway is a hole with floor on both sides of it, which is the most
  agreeable cell in the building. Written into the loader, where it obviously
  belongs, it was undone within the second and the floor still answered 409.6
  straight across the leaf. A prune is only a prune if nothing downstream can
  fill it in again.
- **AND THE WATCHDOG WAS OFF BECAUSE SOMEBODY WAS STANDING NEAR HIM.**
  `catWatch` excused him whenever the player was inside `maxReach + 1.2` — six
  and a half metres, in PLAN, which at the exit door is the whole end of the
  room. The player was TEN AND A HALF METRES ABOVE HIM. That is this file's
  oldest arithmetic wearing a fifth coat, and it is also the wrong QUESTION:
  what says a creature is fighting is that it has thrown a swing, not that
  somebody is standing near it. He is excused only while he is in reach in
  three dimensions AND `st.swings` has moved since the mark was laid. The two
  other nets in `catSteer` — "he has lost you" and "he has stood still for
  four seconds" — were gated on the same plan distance and now use the real
  separation.
- **AND A ROUTE THAT CANNOT BE WALKED IS A REFUSAL.** `catRouteFail` counted
  only the times the SEARCH said no, and the search almost never says no: a
  route to you nearly always exists over the graph. What fails is the WALKING
  of it — he draws a good path, grinds on its first leg against a wall the
  graph does not know about, drops it, and draws the same path again from the
  same place, for ever, with the counter at zero and the whole escalation
  below it out of reach. A grind counts, and so does a route `catStand` drops
  for being held against stone. `catBlockT` DECAYS rather than resetting for
  the same reason: a body grinding on a wall is blocked, shoved a millimetre,
  free for a frame, blocked again, and a clock zeroed by one free frame never
  reached the half second that drops the route (measured: it oscillated around
  0.37 for forty seconds).
- **AND GOING THE OTHER WAY IS A BEHAVIOUR HE DID NOT HAVE.** The owner's own
  words. Everything the chase knew how to do was aim at you, and when the way
  to you could not be walked it aimed at you again. `catDetour` picks a place
  he demonstrably CAN reach — his own flood, six to fourteen metres off, and
  not back toward the leg he was grinding on — and routes there; from
  somewhere else the line to you is a different line.

**AND THE DOOR'S OWN PRUNE WAS NARROWER THAN THE DOOR.** `catShutDoor` was
`lz -32.75..-30.15` typed once, against a leaf that spans `CAT_DOOR.z` ± 1.9:
measured by sampling straight across it, the cells at the door's own x read
9.61 at dz -1.6, -2.0 and -2.4 — walkable, at door level, through a shut door —
and the graph carried nodes at lx 20.43 on the far side of it. It is derived
from `CAT_DOOR` now, and it has to run a NODE clear of the opening rather than
a cell: the walk is sampled at 0.2 m and the graph at 0.6, so a band that stops
at the last cell inside the leaf still leaves a node a cell past it (measured
after the first widening: two nodes at lx 20.43 survived). Measured after:
**0 of 119 sample points across the leaf have floor at door level** (18 before),
**0 of 44 nodes outside it are routable from just inside**, and the player's own
approach is untouched — floor runs unbroken up to the leaf and the flood from
the landing reaches within **0.62 m** of the door (0.78 before).

Measured at the end, the owner's own case (chased on the ground floor, then
standing at the door), three trials of sixty-four seconds: he reaches your
storey at **17.5 / 37.5 / 44.7 s**, closes to **4.2-8.7 m**, and the worst
stall is **3-9 s** against never moving again. The 9 s is him holding his own
fighting range, which on a creature whose face is 1.7 m ahead of its origin is
not a stall at all. `tools/cattrial.js` is the harness.

**THE CATACOMBS END IN THE MIDDLE OF A CORRIDOR, AND WHAT YOU SEE IS A BLACK
RECTANGLE.** The owner photographed one: a passage running away from him with
a black hole where the end of it should be. Cast down that line and two
hundred metres of ray hits nothing at all — the scan simply stops being
modelled at CAT-local z = 14.2, mid-passage, leaving a clean open
cross-section with the fog colour behind it.

`catCapEnds` walls them up in the room's own stone, and every one of them is
FOUND rather than typed — his was one of them and there is no reason to think
it was the only one. What settles it is a Map lookup and not a ray, because
three has no BVH and a per-cell raycast against 92k merged faces is far too
slow: the wall index already buckets every drawn triangle, wall and floor
both, and a walkable cell whose neighbour has none of them near it is the
edge of the model. A real wall always has its own triangles beside it and a
stair, a drop or an open shaft always has the floor below, so neither is ever
capped. 2,759 slabs, one merged mesh, and the wall index is taken again after
so they are solid as well as opaque. Three things it cost:

- **"IS ANYTHING DRAWN THERE" IS A QUESTION ABOUT THE CELL, NOT ITS BUCKET.**
  The index buckets a triangle by its bounding box on a ONE METRE grid and a
  walk cell is a fifth of that — so the bucket beyond the last cell of a
  corridor contains that corridor's own end cross-section, answers "drawn",
  and the one end the owner photographed was the one end that did not get
  capped. The triangles in the bucket are tested against the neighbour's own
  COLUMN instead, by bounding box, which errs toward NOT capping — and not
  capping an open passage is the only mistake here that matters.
- **AND A CELL MAY HAVE SEVERAL STOREYS.** Each is asked and each is capped:
  a shaft that runs out of model on two levels wants two slabs, and a
  corridor whose floor carries on below wants none.
- **AND GEOMETRY BUILT IN WORLD SPACE MAY NOT BE PARENTED INTO A GROUP THAT
  CARRIES AN OFFSET.** Everything above works in world x and z because the
  grid does, and `catWorld` stands at (9000, 400, 9000) — so the caps were
  drawn at eighteen thousand. They were all there, in the geometry, at
  exactly twice their own distance, and the ray that should have hit found
  nothing. The merged geometry comes back into the group's frame with an
  inverse `matrixWorld` before the mesh is made. **A bounding box read off a
  geometry is in the geometry's frame; only `Box3.setFromObject` is in the
  world's, and the difference is invisible until something is in the wrong
  place by exactly the group's own offset.**

Measured after: from the owner's own spot the sight line hits
`CatacombWall.005` at 4.81 m where it used to return nothing in two hundred,
and the corridor photographs as the room's own brickwork.

**THE CATACOMBS' TORCHES HAD NEVER LIT THE ROOM.** `torchSpots` are measured before `catWorld.add(root)`, so they are in the scan's own frame, and `worldToLocal` on them put every torch light nine kilometres away — the room was lit by nothing. The spot is the light's LOCAL position; `pickedW` (via `localToWorld`) is for the flames and halos. And only eleven were ever lit (the first eleven in file order); every one of the 107 brackets is now a light (0xff7424, 6.5, 11.5 m, decay 2 — the lamp pool puts the twelve that reach you in the shader), one in eight is out for good, and a draught can blow one out for 6–16 s (`sfxTorchOut`) before it catches again with false starts. The FLAME material reads its own torch's brightness per vertex out of `catTorchU` (128 vec4s) so the drawn flame gutters with its light, and is warm orange (0xffa24a) rather than a white ball. Each burning torch wears an additive halo and throws embers (`buildCatTorchFx`, one draw each). The stone is darker (emissive 0.014) and the fog closer (0.048). The render is ~1 ms there with the effects adding 0.3. The landing plays the owner's recording AND the old synthesised thud together.

**THE CATACOMBS MONSTER HAS YOUNG, AND THE FLOORS HAVE REMAINS.** `crawlerBaby` is `MUT_KINDS.crawler` at 1.15 m with a 1.38 head (the same `crawler.glb`, parsed again), placed in a HALL UNDER A BURNING TORCH — the owner's word: a lit `catLights` torch with a main-floor node a step out from its wall and 1–4.2 m under it (not a storey above), in a passage a body and a half wide, clear of the landing, key, door and jars, its back to the landing-to-key walk (`placeCatBaby`). It sits eating Dennis's rotten left leg (`assets/limbs.glb`, CC-BY-4.0): `babyEat` is `BABY_EAT_POSE` plus four keyposes (`BABY_EAT_KEYS`: bite, tear, chew, glance), all SOLVED on the rig by coordinate descent over every driven joint against measured targets — hips 0.13 m over the stone, knees up at 0.34, ankles flat 0.3 m in front, both wrists at the mouth — and each keypose re-solved from the base with the legs held still, and the leg's grip is MEASURED on that pose (`babyAttachLeg`: the knee end at the mouth, the shin down through the right fist; the leg's +Z runs knee to foot, the foot end being the wide one). The owner's eating recording loops on its own source (`babyEatSound`): silent past `BABY_EAT_FAR` (6.5 m), full at 1.6 — measured 0 at 6.5, 0.08 at 5, 0.46 at 3.5, 0.94 at 1.6. Hit it (`babyProvoke`, off `kind.provoke`) and it drops the leg, whips round, screams (the owner's scream, heard to 80 m), and flees at 7.0 m/s along a route away from you (the crawl played at the rate its OWN rig's measured stride needs — 1.25 m/s at 1x, so 5.6x; capped at 3.6 it skated) (`babyFleeRoute`), and is RETIRED the moment you cannot see it (`catBabyGone`, on the save). `BABY_ANSWER` (2.6 s) after the blow, HE roars — through `catCue` with `far` 160, the one cue of his heard across the whole place — and `catEnrage` puts him in the chase for 75 s during which `catSteer` does not lose you (`catRaging`); `catLose` in that time sets `rageHold` so the watchdog can still move him. Measured from 32 m: he closes and throws 15 swings in 25 s.
- **IT IS A COUNT, NOT A HEALTH BAR** (`babyHurt`, the first thing `hurtMutant` asks for a `baby` kind): the first blow of anything makes it scream and run; the third kills it on the spot and STOPS the scream where it is (`babyScreamSrc`); any of the scream having played brings him (`B.screamed`), killed or not.
- **A POSE SOLVER MUST MEASURE THE BASE THE GAME BUILDS ON, AND THAT IS NOT THE MODEL AS IT STANDS.** Two wrong solves before a right one. `installLife` wraps `u.mixer.update` and puts posture, breath and claws on top of whatever a clip writes, so a `poseRig` taken after it captures the LIFE as part of the stance — the game authors its clips before `installLife`, clean. `u.mixer.rawUpdate` is the clips alone. And `poseRig` plays its source with `a.play()`, which does nothing to an action whose `enabled` is false: disable every action "to be safe" and the base is whatever pose was last left on the model. Check a solver by applying the shipped pose both ways and comparing joint positions to the centimetre before trusting a single number out of it.
- **`__bw.frame(n)` in one synchronous call carries no clock time** — every frame reads `performance.now()`, so a hundred of them run in a few milliseconds and anything on a timer (the scream beat, a flee) never advances. Stub `performance.now` to add 1000/60 per frame for the length of the test.
- **Authored heights are WORLD metres.** `poseRig`'s `hipY` is divided by the parent's world scale, so a smaller copy of a kind inherits the big one's metres and sank half a metre into the floor; `kind.hipYK` scales them (and `posture.lift`, also metres, is scaled by hand on the baby).
- **`crawlerMovesLate` is a LIST** — a single slot was overwritten by whichever copy asked second; `kind.authorMore` runs after `authorCrawlerRest` in both the immediate and the late path.
- **`tools/sheet.js`'s `__pose` reads `window.__poseUnit`** and falls back to the crawler — reset on every reload, and two solves this round ran on the big one's body before that was noticed.
- **AND IT HOLDS THE LEG IN BOTH HANDS.** The leg was parented to the right
  wrist once, off the clip's first frame, so it rode one hand while the other
  went through it and neither closed on it. `babyHoldLeg` fits it EVERY FRAME
  after the clip and the life layer have posed the hands: the line through
  the two grip centres (palm, curled middle finger, thumb) is the leg's own
  measured centreline between the thigh and the shin, knee end up at the
  mouth. The fingers close round it through `life.grip` (a per-unit override
  of the claws' curl, cleared when it drops the leg), and the leg is carried
  at `BABY_LEG_K` 0.72 — at full size a 13 cm thigh swallowed a 5 cm fist and
  only the claw tips showed.
- **HE WALKS OVER IT.** `mutSeparate` holds every creature a pace off every
  other, and in a hall 1.2 m wide that pace is the whole corridor: the big one
  stopped dead at the young one's back. A pair with a `baby` in it is skipped
  both ways. Measured, chasing down that hall: he passes within 0.06 m of it
  and on to his fighting range, and it does not move.
- The remains: sixteen pieces of the other five parts at 1.4x (the room is packed at 2.2x, and its own skulls make a true-size arm a twig), one `InstancedMesh` per part plus one of stains, placed by a seeded draw on graph nodes — a third at the bone piles, the rest against walls (`n.w < 0.8`) — only where the floor under the whole footprint is level and no wall crosses it (`scatterCatLimbs`). `bwGhost`, so nothing is a wall.

**THE CATACOMBS' DEAD-END CAPS WEAR THE WALL'S OWN STONE AT ITS OWN SCALE.**
Each cap slab is one walk cell wide (a fifth of a metre) and a
PlaneGeometry's uv runs 0..1 across whatever it is, so every strip squeezed
the whole brick map into twenty centimetres and the cap drew as a speckled
grid nothing down there looks like. `catCapEnds` measures the drawn walls'
texel density (median over every `CatacombWall` face, about 0.119 texture
units a metre) and gives every cap vertex a uv from where it stands in the
world — along the wall and up it — so neighbouring strips run into each
other and the bricks are the size of the bricks beside them. **And a name
used in a helper must not be the name of a loop variable below it**: the
density was first called `k`, and `for (const [k, fl] of S.cells)` shadowed
it with the cell's integer key — the caps' uvs came out in the millions.

**A CATACOMBS TORCH BREATHES; IT DOES NOT STROBE.** Stepped stutters, torches
blown out for twenty seconds and draughts that dipped every torch in the room
were "too intense, on and off". Three sines of a few per cent (a slow breath,
a quicker lick, the wick), a rare smooth lean-and-sink of ten per cent when a
draught finds one, and nothing ever goes out.

**THE CATACOMBS' TORCHES ARE A BREATH.** The lick and the wick are a
centimetre of light, a gutter sinks to 91-95 % over 1.6-2.8 s and a draught
to 88-93 % over 2-3.2 s. Anything faster read as the frame rate.

**A DEAD-END CAP STANDS WHERE THE MODEL STOPS, NOT AT THE CELL'S EDGE.** The
catacombs' walk grid is a fifth of a metre and the scan ends wherever it ends
inside a cell: at CAT-local z = 14.2 the floor, both walls and the vault all
stop at 14.45 while the cell's edge is 14.53, so `catCapEnds` hung the cap
eight centimetres PAST the stone with a slot of night round three sides — the
slab the owner photographed not meeting its walls. Each cap now walks the drawn
floor (`keepDrawnFloor`) outward from its cell's middle in 2 cm steps and goes
two centimetres INSIDE the last of it, so the walls and the vault overlap its
edges: a gap you can see, an overlap you cannot.

**BEN ALI, AGAINST A TOMB IN THE LOWER VAULT, AND HIS SWORD IN THE THING'S
BACK.** Rida Sidi Ben Ali's "injured walk" (CC-BY-4.0, `assets/benali.glb`,
`gltfpack.py --tex 1024 --no-clips`) sits against the Mausoleum flank the owner
pointed at (CAT-local 9.46, -5.49, -35.17, facing (-0.76, 0.65)); the wall and
the floor there are measured by ray at placement. Walk within 3.1 m and he says
the owner's line (typed at 13 ms a character so it is up before he goes), and
three seconds after it starts — on the WALL clock (`B.t0`), whatever the frames
are doing — he dies: a last breath lifts his head, it drops, the hand comes off
the wound, the raised knee falls out. `benDead` is on the save.
- **HE IS POSED, NOT ANIMATED.** His file's one clip is a walk. `BEN_ALIVE` and
  `BEN_DEAD` are turns about his OWN body's axes in each bone's parent frame
  (`poseRig`'s idea) with the ORDER written per joint, because a thigh swung
  forward and then splayed is not one splayed and then swung; dying is the
  slerp between them. The limbs were SOLVED in the pane — coordinate descent
  on the angles against knee/foot/elbow/hand targets in his own metres
  (feet at 0, +Z his front, +X his left) — which is how the first guess (legs
  down through the floor, an arm waving) was found and fixed.
- **THE WOUNDS ARE IN HIS MATERIAL, IN HIS BIND POSE.** `uBenM` maps the
  skinned mesh's raw `position` to his bind-pose metres, so three ragged
  claw gashes across the chest, a rake down the left thigh, a soaked belly
  and a red right hand sit on him whatever the pose does. A gash under 2 cm
  across does not survive the retro scale — the first ones read as stripes.
- **A POOL IS SPILLS, AND EVERY SPILL IS INSIDE THE CANVAS**, or the plane's
  edge draws as a straight cut; and its red is dark (a bright saturated red
  under the exposure lift is paint).
- **THE SWORD IN HIS BACK** is a copy of the Bloody Blade `attach`ed to the
  crawler's `DEF-spine003` (local -Z is his back, measured on the crawl), driven
  in to a hand's breadth of steel, its colour multiplied down to his so it reads
  as one more ridge of the hump. The first `catPutDown` (he does not die) lifts
  it into the world, throws it clear on the side with floor, tumbles it, lands
  it FLAT on the stone found by ray (`sfxSwordDrop`: inharmonic steel partials,
  a strike, a thud and the recorded `blockMil` under it, then two clinks), and
  it becomes "Take the Bloody Blade" with a glint that shows through him.
  `bb`/`bbAt` on the save: in his back, on the floor where it fell, or yours.

**THE CATACOMBS' STONE IS LIT BY EVERY TORCH ALL THE TIME.** With 107 torches
and a pool of twelve real point lights, a torch's patch of wall switched on as
it ranked into the twelve — walking a corridor you watched the torches ahead
LIGHT UP. `catStoneLit` (every catacombs material but the flames and lilies,
and the dead-end caps, which copy its hook) adds the torchlight in the shader
from `catTorchU` — the same positions and flicker the flames read — with
three's own falloff, colour and strength (`CAT_TORCH_R/DECAY/I`), and zeroes
the pooled copies, which carry a decay of 2.07 AS A MARK
(`getPointLightInfo` is patched). The pool still lights the monster, the young
one and anything you carry. The flicker itself is a few per cent on waves at
unrelated rates, with a quicker flutter on top; nothing pulses or goes out.

**BEN ALI TALKS WHEN YOU PRESS E, AND DIES WHEN YOU CLOSE IT.** A `Talk to Ben
Ali` prompt on a proxy at his chest (gated on `!benDead`); the line never ends
on its own (`end: 1e9`), and `BEN_NPC.onLeave` (`benLetGo`) starts the last
breath the moment the dialogue closes — by the leave button, a click once the
line is up, or Escape. The walk-up trigger and the three-second timer are gone.

**THE FIVE PAST THE CATACOMBS' DOOR ARE AT HOME ON THE BEACH UNTIL THEY SEE
YOU.** Each has a ROLE in `CAT_FOES` (`[x, z, kind, role, yaw]`): two WALK
(wandering targets in x 9.6-13.2 round their spot), one DIGS (throwing sand),
one SITS, and one SPLASHES about shin-deep in the surf. None of this is a
new animation system: `authorMutComfort` writes `mSit`, `mDig` and `mSplash`
on the pack's own rig through `poseRig` (`MUT_JOINTS`), with the hips dropped
off the creature's OWN standing hip height (`H0`), not its total height —
the eight kinds are built on one skeleton at five sets of proportions, and a
drop in metres typed for the hulk sank the runt through the sand. The whole
of it is `updateComfy`, hooked in `updateMutantUnit` just before the sleeping
branch, and it runs only while `u.comfy` is set.
- **THEY WAKE ON SIGHT.** Inside `COMFY_HEAR` (7 m) always, and inside
  `COMFY_SEE` (26 m, four less for a digger or a sitter, whose heads are
  down) when you are in front of them (`COMFY_CONE`). Every five to eleven
  seconds each one GLANCES about for a second and a half, and while it does
  its cone is most of the way round it — without that, five creatures facing
  the sea and the cliff let you walk into the middle of them and were woken
  by hearing at four metres. A waking one turns to you, then the rest within
  16 m are woken a beat apart (`comfyWake`), so the beach comes at you as a
  group. Measured with a real clock: first spotted at 25 m, all five up by 45.
- **THE WADER SITS IN THE SEA**, `restYInWater(x, z, 0.75)` off the swash it
  follows (`shoreLineJS - 2.8`, never landward of its own spot), so
  `mutClampX` lets it past `WADE_X` while it is comfy. On waking it is NOT
  snapped to the sand plane (that stood it on the water): `u.wadeY` eases its
  feet onto whatever is under them until it is on dry sand.
- **TWO HARNESS TRAPS, both of which read as "it does not move".**
  Teleporting down the beach fires the HORDE'S TAKE, and `frozen()` then
  stops every creature: step until `mutCut` is false first (`mutPhase`,
  `mutCut` are read-only getters). And `step()` barely moves
  `performance.now`, so the 25 s chase grace after a load stays on and only
  hearing wakes anything; stub `performance.now` to advance a frame per
  step.

**BEN ALI'S TORCH, AND HIS FIRST WORDS.** A torch lies where it fell beside
him (SUPERSEDED: it is built like the bonfire now and never gutters — see
"HIS TORCH NEVER WENT OUT" at the end of this file), and a pooled
orange lamp low at his side is what you see him by (`ben.torch`,
`updateBenTorch`). His dialogue opens on "The key's in this room." and a
click carries it on to the line he always had — `node.next` is new in
`showDialogNode`: a line with no choices and a `next` waits for a click and
goes on, instead of ending. Walking away from either still lets him go.

**BEN'S TORCH LIES THE WAY IT FELL OUT OF HIS HAND**: the handle by his hand,
the burning head out on the flags away from him, so its flame leans off him.

**THE INJURED MAN BREATHES, AND DIES ON HIS LAST ONE.** Ben's name on the
dialogue is "Injured Man" now (the prompt reads "Talk to the injured man").
The owner's dying-breath recording is `assets/ben-breath.m4a` (the whole 10 s,
mono): the first six seconds LOOP under him while he is alive
(`updateBenBreath`: loopStart 0.15, loopEnd 6.0, a lowpass that closes with
distance, panned by bearing, `f² × BEN_BR_LEVEL` 0.34 with f falling to
nothing at ~9 m — measured 0.31 at 1.5 m, 0.14 at 4, 0.03 at 7, 0 at 11), and
`benLastBreath` plays the long exhale from 6.05 s when the dialogue closes,
with the death timed onto it (gasp 0-0.6 s, fall over the next two, a twitch
at 2.3). The synthesised `sfxBenLastBreath` is the fallback before the bank
lands. **Measure audio levels with real waits**: `__bw.frame` in a loop
advances no audio time, so a `setTargetAtTime` read back after it is
whatever it was before.

**THE CATACOMBS' DOOR IS A WALL TO THE PLAYER, NOT A HOLE (`catDoorBlocks`).**
`catShutDoor` takes the door level's storeys out of the grid so nothing can
path through the leaf — which leaves the ground floor nine and a half metres
under the doorway as the only floor there, and the player's walk takes any
floor below as a drop: walking up to the door and a step further put you into
the doorway and down through the building (measured on six headings of
sixteen, five to twelve metres, and out past the leaf to x 25.7). The same box
is refused by the walk at the door's level and clamped as a last word.
Measured after, 32 headings with jumps: no fall.

**COBWEBS IN THE CATACOMBS (`buildCatWebs`, after `placeBenAli`).** Up to 48,
FOUND on the hunter's graph: a roofed node (h 2.3-4.6) with a wall within a
metre, the cross-section measured by marching `keepHitsWall` out in 0.2 m legs
at chest height over eight headings (0.9-2.5 m across, at least 1.8 m clear
along both ways), five metres apart, clear of the landing, key, door and the
young one. Three kinds: tucked into a top corner (most), wall to wall from the
vault down to 1.35-1.85 m, or only high in the vault.
- **EVERY WEB IS ITS OWN DRAWING.** Three shared textures read as the same web
  hung again and again. Each web has its own 256 cell of one 2048 atlas
  (`drawWebCell`, seeded per web), in one of four styles: cellar-spider TANGLE
  (`sheet`, most of the spanning ones), a CORNER tangle whose free edge is a
  superellipse of its own proportions, a RUINED orb (frame, snapped radials,
  spiral mostly gone, a hole torn out), or a few long sagging STRANDS. Every
  thread carries dust beads and there is a film of dust where the threads
  bunch. **A dust film is a radial gradient drawn under a squash, and the
  rectangle filled must be squashed too**: filling the cell's own rect under
  the transform cut the ellipse off in a hard straight line and every tangle
  read as a grey slab. And threads are never laid ALONG the stone edge.
- **A WEB IS NOT A PANE.** One InstancedMesh on a 10 x 8 plane; `aCell` picks
  the atlas cell, `aSag` bows it (anchored along the top and both sides, or
  the top and one wall for a corner), droops the free edge and sways it in the
  draught on its own phase (`catWebU.uTime`). Mipmapped LINEAR so it is a haze
  at a distance and threads up close; instance colour is stone dust lit by how
  near a burning torch is (`catTorchU`).
Stand up into one and it tears (`updateCatWebs`: your eye over its bottom edge
inside its span, within 0.3 m of its plane) — the middle falls away drifting
and fading, a rag clings at each anchor and swings where you pushed it, and
`sfxWebTear` is a soft rasp. Crouched you pass under. The hunter does NOT break
them. Torn ones are on the save (`catWebs`) and come back as settled rags.
Measured: built, atlas and all, in 60 ms.

**THE HUNTER STEERS HIS HEAD, NOT HIS MIDDLE (`catLookAhead`, `catHeadClear`,
`catFurnNear`).** Every clear-or-blocked test he had asked about a 0.3-0.42 m
disc round his origin, and he is 1.65 m across with his face 1.7 m in front of
it — so what the owner watched was his head and shoulders going into a tomb
before the clamp, a body-length behind, knew. Once a frame (whoever calls
`mutClampX`), before the move is taken, the line his HEAD will travel is asked
(four samples to 2.5 m, knee-to-chest over whatever floor is under each
sample, plus his FLANKS at 0.62 m either side against the furniture only —
anything that is not `CatacombWall`/`CatacombGround` — or every 1.3 m corridor
would read shut). If it is shut the move is turned onto the nearest open
heading, trying the side he last went round first so he does not dither, and
he faces where he is going. Off during a swing. The route search also charges
heavily for nodes within 0.8 m of stone, and the straight chase and the
string-pull both test his flanks at the knee. `tools/catnav.js` is the
harness: `__nav(n, steps, seed)` random chases (body-in-stone frames while
travelling, worst stall, reached) and `__tombs(steps)` for every sarcophagus;
`__bw.setCatAvOff(true)` is the A/B switch. Measured, 20 chases each way:
body in stone 35-49 % of travelling frames off, 28-31 % on; tomb contact 20 %
→ 14 %; the 6 s stall gone. **A body-wide push through his middle made it
WORSE** (the stall came back) and is not in.

**A SKULL PILE COMES DOWN (`breakBonePile`).** The skulls are ONE merged mesh
(`catSkullMat`), so a pile is its triangles inside 1.9 m of the cluster
centre: they are COLLAPSED in place (every vertex of the triangle set to its
first) so the pile is gone, and rebuilt as the pieces — a Voronoi of 14-42
seeds, the real skulls in their own material — thrown clear along the blow,
with dust (`idolDust`) and `sfxPileCrash`. A blade does it (`catBoneStrike`)
and so does running into one. It is LOUD: `catNoiseAt(x, z, 90, true)`, and
a loud noise sends him at once, roaring, at 1.3x his hunt speed; a route to
the exact spot that fails goes to the nearest node beside it (it used to drop
him back to roaming — the target height is the pile's middle, not a floor).
Measured: from 38 m he investigates, spots you, stalks and is chasing inside
11 s. Broken piles are on the save (`catPiles`), re-broken quietly
(`catApplyPiles`) when the room lands. The walk and wall indexes still know
the pile's old triangles; it has not been found to matter.

**THE THRONE ROOM IS LIT A LITTLE MORE**: fog 0.015, torches 8.6 over 14 m,
chandeliers 12 over 21, the moon 8.5, the sky ducked to 0.78.


**MIST ON THE FLOOR (`buildCatMist` / `updateCatMist`).** The owner asked for
it "way more atmospheric". Not specks — the note above about the empty air
still holds, a drifting point is a square on the lens at the retro scale —
but the dojo's low mist SHEETS: sixty torn smoke sprites lying along the stone
at knee height round you, on their own counts, each placed on the walk grid
(`keepFloorAt`, your own storey) so none hangs over a stair well, faded with
distance and thinned where one would cross the lens, and tinted by the nearest
burning torch (`catTorchU`) so the fog is warm in a torch's pool and lilac
between them. One draw call; re-seeded as you move.

**HE IS SEEN BEFORE HE IS FOUGHT (the owner: "it's always charging — it should
stalk and be seen, like Amnesia").** Three things in `catWander`:
- a sighting charged him from inside eight metres and a stalk charged on a
  fifth of a second of being looked at. Now only a body nearly on him (4.5 m
  standing, 3.2 crouched) or one he has fought in the last forty seconds is
  charged; everything else is a stalk;
- the stalk's charge is: you inside four metres, your eyes on him for a second
  and a half from inside nine, a FOURTH corner, nowhere to watch from, a loud
  noise, or seventy-five seconds. Looked at from further off he FREEZES where
  he is (turned on you, breathing) and after three seconds of it gives the
  corner up and goes round the other side of you — the feint's own path;
- he prowls to a corner at 0.55 of his hunt speed (0.70 from far off), half
  his roaming legs are on his hind legs at a walk, and more of his errands are
  where you can watch him while you are crouched (0.42 against 0.28).

**AND A ROOM'S CUT HAS A WATCHDOG.** "I went into the first church tunnel and
everything went black and I couldn't even open the menu" could not be
reproduced here (entered twice on 4199: in, placed, black lifted on time). What
it looks like is an exception inside `update` on a frame after the placement:
`animate` re-arms the frame first so the loop lives, but nothing after the
throw runs — no render (black), and every cut sits on its busy flag, which is
what keeps the menu shut. `update` runs under a try/catch now (`bwFrameErr`,
once per message, the cuts and the render go on), and `updateUndercroftCut`
releases a cut that has outstayed its clock by ten seconds. If it happens
again the console will say what threw.

**THE HUNTER SQUEEZES THROUGH THE PASSAGES, AND THREE STEERING IDEAS WERE
MEASURED OUT OF THE FILE.** The owner's "less clipping through walls and
doors" was taken to the catnav harness first (`__nav`: five points down his
body against the drawn faces, every moving frame of twelve random chases),
and the number it starts from is **38 % of moving frames with part of him in
stone** — he is 1.65 m across in corridors 1.3 m wide, so wherever the route
is right he still stands in both walls by a hand and a half. Everything that
steers him was tried against that number and every one made it WORSE:
sliding him toward the corridor's middle (he slid into the tombs: 51 %),
bending his spine into the turns through the life layer (the head bone swung
into the stone and `catSolid` fought the route: 63 %), turning him at two
thirds the rate (44-57 %). All three are deleted. What is kept:
- **`catSqueeze`**: the walls are asked for on either flank at the hip, at
  the origin and a stride ahead, and the model is scaled ACROSS the body to
  the room there is (never under `CAT_SQ_MIN` 0.70), eased over a third of
  a second. The fight's hitbox, reach and body disc read none of it.
  Measured (`tools/catpen.js`): the drawn shoulder's mean penetration of the
  nearest wall 0.54 m → 0.45, the squeeze averaging 0.905 while he moves.
  **AND AN EASE FROM `undefined` IS NaN**: the first build eased
  `u.catSq` from itself before it existed, the model's scale went NaN, he
  vanished, and the metric read "no penetration" — a zero that has to be
  tested against a wall before it is believed.
- **a speed that gathers** (`u.catK` in `ucFollowPath`): a route no longer
  sets him off at full pace on the frame it arrives. Neutral on the metric
  (37-42 % against 38 %), 12/12 reached.
- **A CLEAR LINE HE IS NOT GETTING DOWN IS NOT A CLEAR LINE.** `catSteer`'s
  straight-line shortcut RETURNED before the grind accounting, so a creature
  whose line to you passed `clear()` and whose body the solid sweep then
  refused — the two ask the stone at different heights and widths — sat with
  its head in a wall at `grind 0, path 0`, every net under it unreachable.
  Measured: eight seconds parked 8.9 m from you. The grind is counted first,
  and a line ground on for most of a second is put aside (`catNoLine`, 2 s)
  so the route takes him round.
- **and a stalk whose corner is the node under his feet is a corner
  reached** (`catPeekSettle`): the spot picker could hand back where he
  stood, the zero-length route ended before the hold began, and he parked at
  11.7 m in `peek` with nothing counting.
**Harness:** the pane's real loop runs between tool calls, and a chase
creature kills the pinned player in the gap — the page reloaded and
`__nav` vanished twice before rAF was stubbed at the top of the session.

**DARKER, AND THE TORCHES SHINE THROUGH THE MIST.** The stone's own lift
0.014 → 0.010 and the fog 0.048 → 0.054 (the owner's word, a third time:
darker). What carries the place now is the AIR: every burning torch draws a
SHAFT under it (`buildCatTorchFx`'s third batch, `cones` — a sprite a torch
drawing a soft cone that opens downward and dies along its length, grained
by a slow swirl on the torch's own phase, breathing on the same `aK` the lamp
and the flame read, faded out as you walk into it and gone at the fog's
reach); the mist sheets take a torch's warmth from a metre further (8.5);
and **the hunter disturbs the air** — the last sixteen sheets (`CAT_WAKE_N`)
are born round his body as he moves and drift off it, so his passage through
the fog is a thing you see, and where he passes a torch the same warmth that
lights every sheet lights these: what the torchlight reveals is a shape
moving in lit mist before it is a face. Nothing while he is far, dead or not
drawn.

**HE IS HEARD THROUGH THE PLACE, NOT ACROSS IT (2026-10-08, `catHear` /
`catPlayAt`).** Every voice cue (`catCue`) and footstep of his now arrives the
loudest of three ways: in the open (a `catLineOpen` line and within 1.2 m of
your floor — as before); ROUND THE CORRIDORS (`catSoundField`: a Dijkstra
field from your node over the hunter's own graph, honouring `catEdgeCut`,
followed 55 m, rebuilt only when your node changes — 1–5 ms, 16 the first
time an area's cuts are computed — level by walked length, top end cut by
how far round against the straight line, PANNED TO THE LAST TURNING BEFORE
YOU by walking `prev` back to 2.6 m); or THROUGH THE STONE (0.30 of the
level, 380→170 Hz). Measured from one spot: open 6 kHz, round a corner
2.5–3.7 kHz at ~60 % level, through rock ~230 Hz at 9 %. 300–450 nodes are
within 55 m of a corridor; a pocket reaches a handful (the graph's `main` is
a flood that ignores cuts). His footstep no longer falls back to the claw
scrape when it is inaudible.

**HE IS ON THE FLOOR OVER YOUR HEAD (`catAboveStep`).** When he walks a storey
1.7–7 m above yours within 9 m and your ceiling there is his floor, his step
is the slab's: his own recording at 190 Hz low-pass plus a 52→34 Hz sine
(felt more than heard), panned at 0.4 — instead of the airborne step. Now and
then (≥2.6 s apart) grit trickles out of the ceiling (`catDustAt`, a 320-grain
`Points` pool, vertex colours scaled by `catLightAt` so it is only as visible
as the torches there make it) with a 3.2 kHz sift at ~0.02. Under him is often
ROCK, not your room: the spot is the first stretch of YOUR ceiling on the line
from him to you. A spread of 0.22 m read as snow; 0.07 with a few strays reads
as a stream out of a joint.

**HE IS AS AGGRESSIVE AS HE WAS, AND HIS BLOWS LAND WHERE YOU SEE THEM
(2026-10-13; the owner: "got stuck … go back to how aggressive he was … his hits
… dont even touch me … he swing but sits still then his hand does damage … hit
through walls … lag less").** Found by diffing `catWander`/`catSteer` against
HEAD and measuring with `tools/catnav.js` + `tools/contact.js`:
- **Aggression back to HEAD**: a sighting inside 8 m (or any within 40 s of a
  fight) is a charge; the stalk's trip-wire is `seenT > 0.18 || dP < 6 ||
  peeks >= 3 || tries > 3 || stalkT > 45` (plus a noise); the far-gaze freeze is
  off; prowl 0.82 of hunt speed and the crawl at 1.15; one leg in three upright.
- **The fight stall**: the grind net (`catGrind > 0.7` → `catNoLine` + a route)
  fired at his own stopping distance, where he barely moves; a creature with a
  route cannot swing, so he stopped attacking for two seconds at a time. It only
  counts out of reach now (`dist > maxReach + 1`).
- **Readable blows**: `lungeLead` 0.26 (the lunge began ON the contact frame:
  he stood through the wind-up, then skated in and the claw arrived up to 0.15 s
  late); stops 3.05–3.35 → 2.7–3.0; `stepBack` 3.2 (from closer than his stop
  he backs off through the wind-up — his blows had landed with his origin
  0.6–1.0 m from you, standing in you); `parryK` 0.62 → 0.85; `fade` 0.22 →
  0.13; `catSolid` no longer turns him while he swings.
- **The bite** (`plain`) went through `plainLands`: a swing with `headR` (1.15)
  lands only while his HEAD is within that of you across the strike, with no
  wall between (`blowWalled`). It was scored at 4.15 m from his feet, through
  stone, on one frame.
- **Lag**: `catSees` and the straight-line `clear()` in `catSteer` six times a
  second (cached), not every frame; `catSoundField` rebuilt at most every
  0.7 s (was 0.25); `catSqueeze` measures every third frame.
- **Measured**: 30 s standing still after a chase — 32–35 swings, 24–29 hits,
  his origin 2.7 m from you at the blow (was ~1.0). Chases: 15 run, all
  reached, one 8 s stall (seed 7's first, not reproduced), body-in-stone 35 %
  (the recorded baseline is 37–42 %). **Harness trap**: `__roomBoot('cat')`
  leaves you on a ledge 1.85 m over his floor and him in his lair, where
  `blowWalled` is true in every direction — use `__catSetup` + `__nav` first.
