# Checkpoints, saves and restores

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**AND `no-store` MEANS EVERY RELOAD REFETCHES NINETY-FOUR MEGABYTES.** That is
most of what "the loading takes too long" is when you are playing the game on
the machine you are building it on. `serve.py` keeps `no-store` for the code —
main.js is edited every few minutes and a stale copy is a terrible way to find
out your last three commits were never loaded — and gives the ASSETS
`no-cache`, whose name is nothing like its meaning: it still revalidates on
every request, so a rebuilt .glb is picked up the moment its mtime moves, and
it answers 304 with no body when it has not. 94 MB became 55. The four that
remain (bunker 22.7, boat 13.8, corpse 11.6, shrine 7.2) are simply too big
for Chrome's disk cache to keep — and their bytes are GEOMETRY, not maps:
462,206 triangles in the moored tug and 277,900 in the body bag against about
two megabytes of texture each. Decimating those two is the next real lever on
load time and on the walk's frame rate, and neither was ever asked to be exact.

**AND THE RESTORE CAN ONLY REPLAY A PICKUP WHOSE HANDLER EXISTS.** The
checkpoint remembers which pickups you took and fires those same handlers
again, which is the right design — the handler is what builds the view model,
names the thing and puts it in the pack. What it cannot do is find a handler
that has not been registered, and there are real ways for that: an item
registered by something ELSE breaking (the crate's glowstick), a scan that
has not landed inside the eight-second window, an interactable behind a gate
the restore has not opened. When that happens the item is gone for the rest
of the game with no error anywhere — and the owner lost his WEAPONS to it.

The replay stays the mechanism; `finishRestore` is the floor under it.
Anything the save says you were carrying that is still not in the pack when
the window closes is granted outright from a name lookup. It is a last resort
by construction — if the replay worked it finds nothing — and it can only
hand back something you are recorded as having had. **And a box you broke
stays broken**: `crates` is on the save now, restored quietly (no bang, no
boards in the air), which is both how the beach comes back right and how the
crate's own pickup gets registered at all.

**ONE AUTOSAVE, AT THE PAVILION, AND NO SAVE BUTTON.** The walk to the
mushroom house is an hour of finding things and the three past it can take
you in twenty seconds; losing the first to the second is the one thing that
would stop anyone playing it twice. `SAVE_Z` is `MUSH_Z + 26` and it fires on
your Z alone, the way the pack's trigger does — it does not care whether you
came down the waterline or the cliff — a little short of the house, so you
are saved walking up to it and not after you have climbed it. Once a game
(`checkpointDone`), never in dev mode, and there is deliberately no manual
save: a quicksave key turns a walk into a series of attempts.

**THE CHECKPOINT IS NOT THE WORLD — IT IS WHERE YOU STOOD AND WHAT YOU HAD.**
Every placement in this game runs off seeded noise (`mulberry32`), so a
reload rebuilds the beach identically; the save only has to put you back and
give you back. And it gives you back by RE-RUNNING THE PICKUPS: every
`addInteractable(..., 'inventory', ...)` gets a `save` id (its label plus a
count — the third shell is the third shell every load) and its `onActivate`
is wrapped to record itself in `takenPickups`. The restore fires those same
handlers again, which is the only way to get this right in a file this size:
the handler is what takes the thing off the beach, builds its view model,
names it and puts it in the pack, and every one of the fourteen is different.
Two of them do not exist until something else has happened — the captain's
head is not takeable until the wheel is turned and he has fallen — so the
replay is a pass that runs every frame for eight seconds and stops when it
has found everything. What is saved besides: position and heading, hp, the
dug mounds (re-`revealMoundNear`d), the pack's ORDER (replay lands things in
whatever order they arrive, and the hotbar is muscle memory — 3 was the
shovel all game), the rings, what was in your hand, and the dozen booleans
the walk latches (`castleBroken`, `crabBled`, `eyesSeen`, `snorkMet`, the
blood tally, the star, the boat key).

**AND A CHECKPOINT DOES NOT ASK.** Restarting from one used to hand you the
title card and PRESS ANY KEY, which is the game beginning, and this is the
middle of one. A checkpoint load calls `beginGame()` ITSELF at the bottom of
the module — at the bottom on purpose, because the restore names the mounds,
the wreck's star and the pack, all declared thousands of lines below the
title code, and reading them earlier is a dead-zone crash. No card, no menu,
and `instantStart` holds `startMusic()` off: the opening music is the
opening, and starting it three hundred metres down a beach you have already
walked would begin the game over in the one sense that matters. The sea keeps
going; nothing else does. The one thing a page cannot give itself is a
pointer lock, so the look falls back to drag for the instant it takes you to
click and the click takes the lock — which the Safari retry path already did.

**TWO WAYS BACK.** Both go through `reloadInto(mode)`, which writes the mode
into `sessionStorage` and loads the file again — the only honest way to reset
a world this size. "Restart game" clears the checkpoint first and gives you
the first morning; "restart from last checkpoint" keeps it, and the button is
disabled when there is nothing to go back to. A death takes the checkpoint if
there is one and a fresh start if there is not. The badge is `#autosave`, top
right, a hairline ring that fills once as it writes and is gone in two and a
half seconds — re-armed on a TIMER and not a frame, because the frame loop is
not something a save indicator should depend on.

**AND THE AUTOSAVE FIRES IN DEV MODE.** Dev mode is "no deaths, no cutscenes";
it was never meant to be "no autosave", and skipping it meant the one piece of
feedback that says the walk has been remembered never appeared for the person
who spends the most time walking it. A save you did not ask for is only any
use if you are told it happened.

**A CHECKPOINT BELONGS TO THE GAME THAT MADE IT.** It lives in localStorage so
a death can reload the page and still find it, and localStorage outlives the
tab — so refreshing the browser left "restart from last checkpoint" lit up
with a save from a game the player had already walked away from. The only
arrival that legitimately carries one is the one the game asked for
(`reloadInto('checkpoint')`, off a death or off the menu); every other way in
is a new game and the old save goes with the old game. One line at load, next
to where `loadMode` is read.

**A CHECKPOINT LOAD HAS NO GESTURE.** `beginGame` asks for the pointer lock
with nobody's hand on the mouse, the request fails, and `enterFallback` puts
the look on drag — right for a browser that cannot lock, wrong for one that
simply was not asked by a click. The way out of the fallback required a lock
to have ONCE worked, and on a fresh page it never had: the owner came back
from a checkpoint and dragged the camera round for the rest of the game. A
press on the world is a gesture, so it asks the browser outright even in the
fallback, and a lock that lands clears the fallback in `pointerlockchange`.

**AND A CHECKPOINT AFTER THE THREE CRABS.** `updatePackSave`: the moment the
last of `packCrabs` is down, once a game, the same `saveCheckpoint`. A restore
from it puts the three back asleep out at sea, which is what that stretch
looks like once you have walked it. Measured in the pane: the trigger crossed
in dev mode, the three marked dead, `hasCheckpoint()` true at z = -217.

**A SAVE MADE IN A ROOM IS NOT A POSITION ON THE BEACH.** Every checkpoint
before this one was written on the sand, so `pos` was a place; this one is
eight kilometres out on an island that is not fetched, not built and not
entered when the save is read. Handed straight to the camera it is a body
on the beach's own clamps, dragged back to the sand on the first frame. The
save carries `room` now, and a restore that reads `keep` HOLDS THE POSITION
— the black card up, `loadKeep`, and `updateKeepRestore` on the wall clock
until `keepReady` — then `placeInKeep`, the hoist parked at the top where
you left it, and you set down on the spot it was written at. It is the
sail's own honest failure: if the island never comes, the black stays.
Measured: the save reads `room: "keep"` at (-6002.5, 817.85, 6014.9), and a
reload into it comes up standing on the car at the terrace facing the
studded door with "E Lower the hoist" under the crosshair.

**AND AN OVERSIZED TOOL RESULT IS SAVED TO A FILE, WHICH IS HOW A PICTURE GETS
OUT OF THE PANE.** Screenshots of the preview only capture when the pane is
displayed, it re-hides on every tool call, and an overlay `<img>` at the top
of the z-order does not composite while it is hidden — three rounds of this
session were judged on a frame from two calls earlier. The way that works:
render the sheet into a 2D canvas in ONE call (`drawImage` off the WebGL
canvas must be in the same task — no `preserveDrawingBuffer`), `toDataURL` it,
and return the bare base64. It blows the result limit, the harness writes it
to disk, and `base64.b64decode` in a shell turns it into a real .jpg that can
be read and sent to the owner — for no token cost at all, and he gets a file
rather than a screenshot of a pane.

**A WORN RING WAS IN NEITHER LIST THE RESTORE READS.** `pack` is the
inventory and `wearRing` takes a ring OUT of the inventory, so the one item
the save recorded as `worn` was granted by nobody: it came back only if its
own pickup replayed, and the ring's pickup is registered by `dropRing` when
the knight dies — on a fresh page nothing has died, the interactable does not
exist, and the ring the owner had on his finger was gone. `finishRestore`
grants a worn name through `packByName` and puts it straight on (or into the
pack if the fingers are full). Measured: worn, saved, reloaded into the
checkpoint — on the finger on the first frame.

**AND THE SAVE IS THE AUTHORITY ON HOW MANY CRABS YOU HAD, not a floor under
the replay.** `finishRestore` only ever RAISED the count — which is right when
a pickup failed to fire and wrong every other way round, because a crab you
bled is a pickup that still replays: the handler puts a fresh one in the pack
and nothing takes it out again. Pick two up, bleed one, load the checkpoint,
and you have two. The replay is the mechanism; what you were carrying is what
the save says you were carrying.

**AND THE SAVE CARRIES THE STACK, with the same rule the crabs have** — the
number is what you were carrying, not a floor under the replay. A save
written before either stack existed has only a NAME in `pack`, so absent
means one if you were carrying it: without that an older checkpoint came back
having taken the one bottle (or the one crab) off you.

**A SAVE HAS TO COME BACK WHERE IT WAS WRITTEN, AND THE ONE WAY IT CANNOT IS
A ROOM FLAG.** The owner photographed a checkpoint load that came back to a
BLACK WORLD with the HUD over it and one creature showing — and that picture
names the bug exactly. `cullWorldInHall` switches off every scene child
further than a kilometre and a half while `inShrine || inKeep || inTavern ||
inCat`, which is right in a room three thousand metres out and is THE WHOLE
BEACH when the flag is set and you are standing on the sand. There is nothing
left to look at and nothing to walk to: the world is still there and none of
it is drawn.

Two things stop it, and the first is the general one:

- **EVERY RESTORE PUTS EVERY ROOM FLAG DOWN FIRST** (`clearRoomFlags`), so no
  flag from a previous room can survive into the next; the one being restored
  INTO is set by its own `place`, a line later.
- **AND A ROOM SAVE IS CHECKED AGAINST ITS ROOM.** Each `ROOM_BACK` entry says
  where its room stands, and a saved position more than a kilometre from it is
  not in that room whatever the save says. Rather than set the player down in
  a void, the restore keeps the entry placement the room's own `place` just
  gave it and says so in the console. Measured with a save poisoned exactly
  the way the picture looks — `room: 'cat'` with a beach position — it now
  lands in the catacombs' own entry with stone on every side, where before it
  put you on the sand with the world switched off.

**AND ALL SEVEN SAVE POINTS WERE WALKED, not reasoned about.** Each one
entered by the game's own cut, saved, reloaded through `reloadInto
('checkpoint')`, and then measured: the distance from the saved position, the
yaw and pitch against the saved look, and a raycast in six directions to
prove there is a room round the player rather than a void.

| | position | yaw / pitch | around you |
|---|---|---|---|
| beach | 0.000 | — | sand, 1462 meshes drawn |
| catacombs | 0.000 | 0.000 | floor 1.71, walls 2.0–11.0 |
| undercroft | 0.000 | 0.000 | the crawl: floor 1.62, roof 1.62 |
| bunker | 0.000 | 0.000 | floor 1.69, walls 2.1–8.9 |
| dojo | 0.000 | 0.000 | boards 1.74, open sky |
| sea keep | 0.000 | 0.000 | the pier, 1.70 |
| tavern | 0.000 | 0.000 | flags 1.70, walls 4.5–11.9 |

Two things about measuring it are worth keeping. **THE LOOK MUST BE RECORDED
FROM INSIDE THE PAGE**, at the frame the restore lands: a checkpoint load has
no pointer lock, so `fallbackLook` is on, and the harness's own screenshot
moves the pointer and DRAGS THE VIEW — measured, a false 16 degrees of pitch
"drift" that was the test turning the camera itself. A `setInterval` that
samples the moment the position matches reads the real value. And **the
flags have to be read, not inferred**: `catState().inCat` was true with the
player standing at z = -333 on the beach, which is the whole bug in one
boolean and is invisible from any screenshot that is not black.

**AND THE SAVE IS THE INVENTORY, NOT A FLOOR UNDER THE REPLAY.** The replay
re-runs every pickup you ever made, including ones since drunk, sold or
spent, and each jar pickup called `gainJar` on top of the restored tally.
`finishRestore` trims the pack and the fingers to the save's names (as a
multiset), sets the jar count to the save's, and empties your hand if the
save's was empty. `gainJar` is silent while a restore runs.

**A SAVE WRITTEN AT A DOOR IS RESTORED BY WALKING THROUGH THAT DOOR.** Every
room autosave is taken on the frame a cut has placed you, so `autosaveNow`
takes a `spot` (`tavIn`, `keepDoor`, `keepIn`, `catIn`, `catDoorIn`,
`dojoIn`, `ucIn`, `bunkerIn`) and `ROOM_BACK[room].spots` runs the SAME
placement — never a stored coordinate handed to the camera. The tavern
spot also builds the island and parks the hoist at the top, because you came
up it. There is no save at the top of the hoist any more (owner's word);
the island saves at the tavern's door, in and out. `armRestoreGuard` watches
every restore for three seconds and puts the body back if it drops 2.5 m
below where it was set down (then on the room's own entry). All eight
spots restore with zero drift over 400 frames.

**AND "YOU HAVE ALREADY WALKED PAST THIS" IS A QUESTION ABOUT THE BEACH.**
The inferences in `beginRestore` read `camera.position.z`, which for a room
save is the spawn the camera waits at — so leaving the catacombs by its door
replayed the horde's take. The save carries `beachZ` (the last z you stood
on the sand), `packDone`, `mutDone`; an older room save uses its room's way
in (`roomBeachZ`).

**A CHECKPOINT LOAD IS INSTANT AND WHOLE.** `index.html` reads the load
flag before the first paint and hides the title (`html.resuming`), removed
when the boot hold lifts; the hold is capped at 1.6 s; the save's own room
and area download first (`BW_FROM` re-ranks the queue by distance from the
save); and `applySavedInventory` puts the pack, fingers, hand, stacks and
jars back on the first frame — the replay only takes things off the floor.
Anything you gain while a restore is still running settles it first
(`settleRestore`), or the next pass trimmed your new jar back out. The first
jar also calls `refreshUI`, or the corner stayed hidden until something else
redrew the HUD.

**THE BEACH GRASS IS GONE** (owner: "it looks horrible") — code, asset and credit deleted; the paragraph above describing it is history. **A checkpoint load is silent**: `sfxOut()` returns a sink connected to nothing while `sfxHush` (all of `beginRestore`), `replaying` or `applyingSave` is set, because restoring re-runs every dig and pickup and each played its sound on load. Effects default to 20 %, and a settings save without `sv >= 2` is brought down to it once.

**A CHECKPOINT LOAD LOOKS WITHOUT A CLICK.** A page reload cannot take the
pointer lock, so until the first click the plain `pointermove` turns the head
(cursor hidden over the world); the click takes the real lock as before.

**"THE PREVIEW KEEPS ENDING" — three things in the dev server and one in the page.** `serve.py`
let the `4173` in `launch.json` win over the `$PORT` the preview assigns with `autoPort`, so
with anything already on 4173 (another preview, the owner's own server) the preview's server
could not bind and died; `$PORT` wins now. It logged every request to a pipe nobody may drain
(a full pipe blocks the handler thread and the page stops loading) — errors only now, dropped
connections swallowed, daemon threads, `allow_reuse_address`. And a LOST WEBGL CONTEXT leaves a
page running with nothing drawn: it is asked for back, and the game reloads into the last
checkpoint when it returns (or after four seconds).


## The tally and the table on the save (2026-10-14)

`flags.stats = { kill: [...], item: [...] }` (the end screen's counts, see ui.md) and `flags.fishGift` (the rod and
map on the fisherman's table, see dock.md). Both are read in the restore beside `deadUnits`/`pegReturned`, with a
fallback for saves from before them.

## The black that came back (2026-10-15)

"reloading the checkpoint in the catacombs still was making my screen flash." Not the restore guard this time
(that was the 10-14 fix in catacombs.md). Measured on the REAL clock — frames driven by hand at ~12 ms with the true
`performance.now`; the creeping fake clock never showed it: the boot hold's fade ran 1 → 0.26, a hold condition came
true again (a download joining the queue, a warm owed, a frame over 34 ms) and `updateBootHold` slammed the black to 1
for a second, then let it go at 0.2 — the fade's own value, carried on behind it. `updateBootHold` now asks the hold
only before the fade begins (`fading = bootHold < 1`; only the two restores ever set it, and both to exactly 1).
Twice after: one fade of 0.57–0.58 s, no rise, no jump in the picture after it. It applies to every restore, beach
and room.

## Every checkpoint, made and reloaded (2026-10-16)

"the new checkpoint after dying from the 3 mutants just gave me a black screen … every save needs to work." The black
screen was the dead-zone crash of that hour (`packTipDone` read at module time) — the page never ran, so nothing lifted
the black. Then, with `tools/cptest.js` (harness.md), every kind of save was made the way its save point makes it and
reloaded the way a death does: wreck, dock, camp, well (the stare replays), pavilion, hatchOut, gap, mutants, caveOut,
whaleOut, isle, bunkerIn, ucIn, ucInFar, dojoIn, catIn, catDoorIn, whaleIn, keepIn, tavIn, fortIn, c13In, thrIn, dun:
all lifted, frames running, in the right room. Traps the run hit, none of them the game's: a scenario that places into
a room from another room keeps the old room's flag (`devLeaveRooms` first); a test player who dies reloads the same save
and eats the queue (dev mode on); the harness module is cached across reloads (cache-bust the import); a room whose
files are still coming cannot be entered yet (retry).

- **Elvédor's flags (2026-10-16):** `elvStage, elvJar, elvGreeted, elvLantern`. His body is a mutant with `saveKey`
  `elvedor@9.3,-598.5`; `deadUnitKeys` retires him on a load, which `updateElvManPose` reads as "already dead".

## New flags (2026-10-15)

`billy` (0 her wall, 1 yours, 2 dock wall), `billyScrews`/`grateScrews`
(bitmasks of screws out), `billyAsk`, `grateOff`, `seaArt`, `seaOn` (the weapon
it is set in). `headTaken` is gone; `migrateHeadSave` reads it from old saves.
Checked by save -> reload: full chain done, a mid-way save (Billy carried, key
lying in the basket, two screws of each set out, artifact loose), and an
old-format save with the head carried (comes back as the key, in hand).
