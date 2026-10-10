# Testing in the preview pane and the harness

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**AND THE PREVIEW PANE DIES ON ONE LONG CALL.** A single `javascript_tool`
call that awaits a page reload, then six seconds of loads, then two thousand
steps, kills the pane outright ("Preview not found"), twice in a row. Reload
in one call, `computer.wait` for the load, and keep each stepping call to a
few thousand steps with no `await` in it.

**A SCREENSHOT INSIDE `browser_batch` IS THE PREVIOUS FRAME.** Three rounds
of this were judged on stale pictures — a render and a screenshot in one
batch returned the sheet from the call before, identically, and every
change read as "no effect". Render in one call, screenshot in the next;
this file has said so before and it cost an hour anyway.

Measured after: the passage walks in 2329 ticks with zero stalls, the shell
shows in 0.005 % of the frame, and the twelve stations photographed under
the glowstick read as one bore.

**AND IT DID NOT SHOW UP IN THE HARNESS, WHICH IS THE REAL LESSON.** Every
measurement of this fight walked the player straight in along one line and the
creature spawned near the same spot, so both were on the SAME side of the step
and the gap was zero. It took standing deep inside the building — which puts
his spawn out in the yard and makes him cross the step to reach you — to
reproduce it at all. A test that always starts the fight in the same place
cannot find a bug that is about crossing between two places.

**`SWING_GAP` IS WALL-CLOCK TIME, AND THE HARNESS STEPS FASTER THAN THE
CLOCK.** A hundred `__bw.step` calls run in a couple of milliseconds, so a
gap of 140 ms between swings is hundreds of stepped frames — a test that
clicks, steps fifty frames and clicks again finds the second click queued and
never fired, and reads as "swings stopped working". They had not: the gap
had not elapsed in REAL time. Any test of anything gated on
`performance.now()` has to `await` the gap between its beats.

**AND THE PREVIEW RUNS WHILE YOU ARE TYPING.** Every one of these tests ended
with a live fight and no healing, and the twenty seconds it takes to compose
the next tool call is twenty seconds of the boss hitting a player who cannot
be healed — so the player died, `playerDied` reloaded the page, and the next
call measured a module that had been rebuilt from scratch with the creature
asleep. That is what "he went back to sleep between calls" was, and it wasted
three rounds of debugging. Freeze rAF at the top of any measurement, not just
for stills.

**NOTHING IN THE ROOM IS BROWN.** The window frames were dark wood and the
sill was capped with it, and at eye height in a round room that is one
unbroken tan band all the way round you — the only warm thing on a cold
beach and the first thing you look at. Weathered grey steel, concrete sill,
and the bench went from cream to a cold pale stone for the same reason.

Walk it with `__bw.step`, `__bw.keys.KeyW` and `__bw.look()` steering at the
next point on the spiral: in at the door, up, off onto the floor ring, round
the room, back in at the gap, down and out is 89 / 160 / 44 / … / 164 / 125
ticks and no snap over 9 cm in a tick. That test is what finds all of this.

**The preview browser is fragile with this scene.** It can't pointer-lock, it
throttles `requestAnimationFrame` when the pane isn't focused, and long
`javascript_tool` calls (especially ones that start the audio) will kill the
pane. Drive tests through `window.__bw`, keep calls short, and force a frame
with a screenshot before reading state.

· prop-vs-prop physics · persistent dig holes · a nicer two-handed dig anim.

**AND THE PREVIEW PANE HIDES ITSELF ON EVERY TOOL CALL, WHICH STOPS rAF
DEAD.** Three separate measurements this session read "the creature never
moves" and "the take never finishes" when what was actually true was
`document.hidden` and zero frames. Worse, a screenshot does NOT flush the
real rAF queue, and once the loop's callback is sitting in it the loop is
unrecoverable — a pump that stubs `requestAnimationFrame` cannot get it back.
`__bw.step(dt)` runs the real `update()` and needs no frame loop at all, and
the wall-clock work `animateFrame` does is already mirrored into it. **Drive
the game with `step`; check `document.hidden` before believing any measured
zero.** (And a screenshot taken after setting an overlay's `src` shows the
PREVIOUS frame, so a contact sheet needs a call of its own — this file has
said so before and it cost an hour again.)

**AND THE HARNESS TRAPS OF THIS ROUND.** `bw.catG` is an OBJECT in the
original literal, so a `catG: () => catG` added to the later block is
shadowed (a later duplicate key wins — the fourth time). `bw.keepFloorAt`
is a three-argument wrapper for the keep, not the site function. A placer
that calls `startCaveIn()` every half second in dev mode re-places you every
half second, and the real loop runs between tool calls: freeze rAF the frame
the room takes. A metric that reads 0 on every frame is a metric to test
against a wall before believing it — the body probe read 0 because there
were no walls, and would have gone on reading 0 for ever.

**THE HARNESS: THE ROOM BUILDS ON FRAMES, AND A HIDDEN PANE HAS NONE.** The
cave-in's dev-mode shortcut places you only once `catReady`, and the parse
chain that makes it ready wants a frame per step: a hidden pane runs no
frames, so a placer that calls `startCaveIn()` every half second waits for
ever at x = 8. Drive frames by hand (`bw.animate()`) until `CAT_SITE.walls`
exists, then `placeInCatacombs()` directly — and `bw.catFloorAt` is the
site's floor lookup, because `bw.keepFloorAt` is the keep's three-argument
wrapper and answers null for everything here.

**`node --check` DOES NOT CHECK THIS FILE, AND HAS NOT FOR A LONG TIME.** The
ritual at the end of every round here is `node --check main.js`, and it passed
a file with `color: 0xb0a characters` sitting in the middle of a function —
reproduced on a copy, exit 0, twice. In the CommonJS goal the whole source is
wrapped in one function and V8 PRE-parses a body that large rather than
parsing it, so an error inside a function is not found until that function is
first called; on a 200 KB fragment of the same file it is caught immediately,
and `--no-lazy` does not help. The file is a MODULE — that is how `index.html`
loads it — and as a module the check is eager:

```bash
node --input-type=module --check < main.js
```

Broken, that exits 1; clean, 0. Use it, and remember that a shell pipeline's
`$?` is the LAST command's, so `node --check x | tail` always reports 0.

**A SCREENSHOT OF A PANE WITH rAF STUBBED IS ALWAYS THE OLD FRAME.** This file
already says to freeze the loop for a still and to screenshot in a separate
call; what it did not say is that the two together do not work. With
`requestAnimationFrame` stubbed the page never presents, so `renderer.render`
updates the drawing buffer and the compositor never shows it — a magenta
override on the object under test came back as the same black frame as before
it, which is how half an hour went on a ring that was drawing correctly all
along. Capture the canvas in the SAME call instead (`drawImage` onto a 2D
canvas, `toDataURL`), and make the result big enough that the harness writes
it to a file — a JPEG that fits inline costs 25k tokens of context to say
nothing. And **the point-light virtualiser owns every `PointLight` in the
scene**: a probe lamp added from the harness is moved to layer 2 on the next
frame and lights nothing, which reads exactly like a broken material.

**AND DEV MODE CAN TELL YOU WHERE YOU ARE.** Two rounds of this project have
gone on working out which wall a screenshot was taken at — matching the
owner's pictures against renders of the room, which cost hours and still
ended in a question. A place in this game is three numbers and nobody could
read them. `P` in dev mode puts them on the screen: the room, the spot in the
ROOM'S own frame (which is what every constant in the file is written in),
the floor under your feet, your heading, and where the crosshair lands.
"Stand there and press P" is one line instead of an afternoon.

**AND `strafeL`/`strafeR` ARE STILL THE WALK.** The oldest animation bug in
this file, and it cannot be fixed from here: the eight Mixamo clips he was
given contain no sideways stride, so a man holding his distance strides forward
while travelling sideways. It wants one clip dropped in `~/Downloads` and a
re-run, the way the knight's was.

**TWO MEASUREMENT TRAPS, BOTH OF WHICH COST A ROUND.** The pane's own rAF loop
RUNS BETWEEN TOOL CALLS, so a fight left standing keeps being fought and a boss
killed in one call has finished dying, won the room and put the player back on
the beach by the next one — three contact sheets came back as pictures of grass
a kilometre away. Freeze `requestAnimationFrame` at the top of the measurement
and give it back with `__bw.animate()` afterwards. And **`applyBoneTransform`
reads each bone's `matrixWorld`, which only a RENDER refreshes**: the ragdoll
driver updates the bones it drives and leaves the fingers and twists holding
last frame's matrices, so skinned bounds sampled without `updateMatrixWorld`
mix fresh and stale joints and report a body 6.1 m across that is really 2.15.

**AND A REPRO BUILT ON DISPATCHED EVENTS MUST DISPATCH ON THE LISTENER'S OWN
TARGET.** Half of this round went on "you cannot fire while aiming",
reproduced by `window.dispatchEvent(new PointerEvent('pointerdown'))` — and
the handler is on `renderer.domElement`, which a window event never reaches,
so every one of those measurements was of nothing at all. The tell was that
the SECOND reading looked right: `magAiming` was still true from a line in
the previous call that had set it by hand. **And the pane runs NO FRAMES
while `document.hidden`** — measured, 0 rAF callbacks in a one-second wait —
so `magAim` sat at 0, the title card never finished, and the whole thing read
as a gun that would not aim. Check `document.hidden` and count frames before
believing any measured zero; front the pane with a screenshot first and the
same test runs 295 frames and answers honestly.

**AND A NaN WRITTEN INTO THE CAMERA POISONS THE SESSION.** A harness line
that set the camera from an undefined constant put NaN into x and z, and
after that every reset — `position.set`, a fresh `groundY`, twenty steps —
came back NaN, because the velocity and the knockback carry it round. There
is no recovering it: reload.

**AND A COORDINATE OFF A SCREENSHOT IS NOT A MEASUREMENT.** He gave the spot
as the P overlay's own cursor — (0.99, 4.71, 5.75) in the room's frame — and
in this build that point is a bare wall face (normal -1, 0, 0) with the flags
**4.68 m below it** and the gallery's rim 1.55 m above: no floor within a
jump either way, so a shelf there would be a board on a blank wall. His other
readings do not line up either — he was standing at (-3.38, 6.27, 20.88) with
the take prompt up, and the ring measures (-12.70, 7.23, -23.59), forty-four
metres away down the other end of the room, on a floor the probe puts at 7.23
against his 6.27. The PICTURE is unmistakable (the same ribbed bore, the same
two blue jars, the ring between them — rendered from the measured spot it
matches his shot frame for frame), so the place is not in doubt; only the
numbers are. When a spot read off a screenshot disagrees with the room,
trust the thing that measures itself and say so.

**And the harness hides the room**: `UC.group.visible` is false until the
cut's own beats have run, so a camera teleported into the church photographs
pure black and reads as a broken room. Set the group visible by hand, and
raise `UC.setLook('cave', …)` to see any of it — the shipped level is 0.19,
which is a tunnel you are meant to need the glowstick in.

**AND `__bw.step` IS NOT A FRAME.** It is `update()`, and the warm chain, the
far-cull and every wall-clock cut live in `animateFrame` — so a harness that
drives with `step` alone drains none of them. A pane that re-hides between tool
calls runs rAF at about four frames a second, which starves the chain for
minutes: measured, 91 frames in twenty seconds with the wreck's own merge step
still queued, which reads EXACTLY like a `bakeStatic` that silently does
nothing. An hour went on that. `__bw.frame(n)` runs whole frames on demand,
render and all. Use it before believing any measurement of anything the loop
owns — and note the wreck's merge is fine: 158 meshes to 90 with 17 merged,
exactly as documented.

**AND `node --check` IS NOT AVAILABLE ON THIS MACHINE ANY MORE.** There is no
`node` on the PATH at all. The browser is the eager parser for an ES module
anyway: load the page and read `read_console_messages` — a syntax error is a
blank screen and a message, not a silent pass.

**AND `node --check` IS GONE FROM THIS MACHINE.** There is no `node` on the
PATH at all now. The browser is the eager parser for an ES module: load the
page and read `read_console_messages` — a syntax error is a blank screen and a
message.

**AND A SCREENSHOT OF THE PANE IS NOT HOW TO SEE A FRAME.** `drawImage` off
the WebGL canvas in the SAME call that rendered it, `toDataURL`, and return
the bare base64 — big enough that the harness writes it to a file, which is
then decoded in the shell and read as an image. A JPEG small enough to come
back inline costs 25k tokens of context to say nothing. And `renderer.render`
alone does not draw the VIEW MODEL, which lives in its own overlay scene:
call the game's own frame (`__bw.animate()`) when what you are looking at is
in your hands.

**A HARNESS STILL THAT IS SMALL ENOUGH TO COME BACK INLINE IS 25k TOKENS OF
NOTHING.** Pad the base64 (`+ '#' + 'x'.repeat(120000)`) so the result is
always written to a file, and strip the padding when decoding it.

**HARNESS: `tools/route.js`** walks a waypoint list with the game's own
movement and reports stalls, one-frame jumps (with the frames around the
first) and eye steps; **`tools/walker.js`** walks the beach down a lane;
**`tools/snap.js`** is `__at` / `__sheet` stills; **`tools/roomsweep.js`**
is the push-out sweep above. A catacombs route comes from `bw.catRoute` on
a fake unit (`{ g: { position }, catReach: null, st: {} }`, read `u.path`,
local x/z + 9000). And **`placeInCatacombs` before `catReady` places you
without building the room** — no graph, no route; wait for `catState().
catReady` and call it again.


**`frozen()` is true in a harness load unless the intro is skipped**: after
`beginGame()` `introDone` waits on the intro video's real clock, so every
take that checks `!frozen()` never starts. Set
`sessionStorage['beachwalk.skipIntro'] = '1'` and reload; the game consumes it.
**Dev mode stops every creature's swing** (`updateMutantUnit`, `cool <= 0 &&
!settings.devMode`) — a fight that "never attacks" in a test is dev mode.
**A teleport in the throne room holds only after `__bw.step()`**: `tp` then
`frame` reverts it to the last spot; `tp`, `step(1/60)`, then frames.
`tools/thrdante.js` (`__tdMute`, `__tdGo` in short stages, `__tdWalk`,
`__tdTake`) and `tools/shot.js` (`__shot`, `__sheet`/`__sheetAdd`/`__sheetEnd`,
which size a hidden pane's zero canvas) are the throne room's kit.
`tools/audiowatch.js`: `__awPatch()` before the game makes sound, `__awTap()`
after (null sink, analyser on `masterGain`, NaN/throw catchers, node counts),
`__awReport()`. Import it ONCE per load.

**A `javascript_tool` CALL THAT TIMES OUT KEEPS RUNNING IN THE PAGE**
(2026-10-09). Five crowd tests in one call timed out at 45 s, finished in the
background, and the re-run measured corpses ("thrown 0.0 m"). Split long work
across calls, and after a timeout reload before trusting anything. The pane's
console buffer also keeps errors from a PREVIOUS load (a `SyntaxError` from a
broken edit stayed listed after the fix) — check `window.__bw` exists rather
than trusting the error list. A new module-level `const` sharing a name with
one declared mid-line elsewhere (`const _a = …, _spQ = …`) kills the page:
grep `[ ,]name =`, not just `^const name`.

**THE PANE CAN LOSE WEBGL FOR GOOD** (2026-10-09): after ~40 reloads in an
hour the preview browser answered "Web page caused context loss and was
blocked", then disabled the GPU outright (`GL_VENDOR = Disabled`) — a new tab,
`127.0.0.1` instead of `localhost`, and closing/reopening the pane did not
bring it back. Batch checks into fewer reloads; prefer re-running a harness on
the live page over reloading for it.

**THE SAWN-OFF (2026-10-09).** `tools/sgglb.js`: `await import('/tools/sgglb.js'); await __sgG.load()` loads `assets/sawnoff.glb` into its own lit scene; `__sgG.sheet([[t, cx, cy, cz, lx, ly, lz, fov, label], …])` renders the clip at time `t` from a camera (metres, the scan scaled 0.01) into a padded sheet; `__sgG.pos(name)` / `__sgG.at(t)`. The game's harness exposes `sgG` (root, mixer, actions, parts), `sgRig`, `SG_HOLD_HIP`/`SG_HOLD_ADS` (edit the arrays in place and step a frame), `SG_KICK`, `itemIcon` and `shells2IconItem` (so a shop icon can be rendered without opening the shop). `__sgSheet` from `tools/sgtest.js` returns bare base64 (no `data:` prefix) — the scratchpad decoder takes both. The hotbar's icons are `#hotbar img` data URLs, readable without a screenshot.
