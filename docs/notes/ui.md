# HUD, pack, hotbar, shop, menus and input

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**Pointer lock is hand-rolled** (not `PointerLockControls`, so we get
sensitivity + invert-Y). `requestLock()` + `pointerlockchange` +
one `mousemove` handler. There's a drag-to-look **fallback** for browsers
that can't lock. Key gotcha: browsers enforce a ~1.25 s cooldown before
re-locking after an exit, so re-locking right after closing the note/menu
fails — handled by `everLocked` / `scheduleLockRetry()`; never fall back to
drag-look once we've successfully locked once.

**The pack's slots carry no names.** The pane on the right names the
selection; a name under every icon in the grid was clutter.

**The pack has a SELECTION, and the verbs are buttons.** Click a slot and
the item comes up in the pane beside the grid — icon large, name, and
INSPECT and HOLD (or USE) as the biggest things on the screen. The old
pack hid "Inspect" in a corner of the slot until you hovered it, and
nobody found it. A press ARMS a drag and it only becomes one after 6 px of
movement, so a still click selects and the two never fight; double-click
goes straight to the examine screen. The whole HUD — hotbar, rings, pack,
ghost — is the dialogue's language now: black, white, one hairline,
square, monospace, no glow and no colour. The held slot is the one solid
white line.

**The wheel walks the hotbar.** `scrollHotbar(dir)` steps through the
strip's held-able slots, wrapping, and EQUIPS — everything can be held, so
a slot you scroll onto is a thing in your hands. It accumulates `deltaY`
to 40 before stepping so a trackpad flick is one step, and it is gated on
being in the game: the examine screen's wheel is its zoom.

**Inventory icons are RENDERS, and the render target must be sRGB.** A
`WebGLRenderTarget` does not get the canvas's output transform: unless its
texture's `colorSpace` says sRGB the shader writes LINEAR values, and read
back as bytes those are the dark, flat, greyed icons the first version
had — every colour a stop and a half too dark. `samples: 4` gives them
edges. The rim light from behind is most of what reads as "detail" on a
dark object over a dark tile.

**Inventory icons are RENDERS.** `renderItemIcon()` puts the item's own
model through the game's renderer into an offscreen target, reads the
pixels, and composites them onto a dark tile with a shadow under them —
once, at pickup, cached on the item. The model is CLONED first: the
originals are live in the world, and the examine screen re-parents whatever
it is handed. Restore the renderer's target, clear colour and `autoClear`
around it; this runs mid-frame on the game's own renderer.

**The examine screen dies if the pack re-locks the pointer.** `closePack()`
re-requests pointer lock asynchronously and it lands a frame later, on top
of the overlay, eating every click, drag and scroll — turning, zooming and
clicking out were all dead. Clear `packReturnLock` FIRST. Same trap the
combine recipes hit.

**Everything can be held, and examining moved into the pack.** `holdable()`
gives an item a view model cloned LAZILY from the same object the examine
screen shows — lazily because the ring and the key are scans that land over
the network long after the item exists. `use` equips; the pack's per-slot
Inspect button is the only way into `openInspect()`, which now names what
you are holding.

**Textured scans come in through `tools/gltfpack.py`.** `gltfslim.py` throws
the maps away (right for the flat-shaded crab); `gltfpack.py` keeps them, and
is what the rocks and the body bag went through. It rebuilds the binary from
scratch so dropped attributes actually leave, downcasts 32-bit indices,
resizes every image and re-encodes it as JPEG (Sketchfab ships 4096² PNGs —
344 MB for six little rocks), and **rewrites
`KHR_materials_pbrSpecularGlossiness` into metallic-roughness**. That last one
is not optional: three r160 dropped the extension, and a spec-gloss model
loads as blank white with no maps at all, which is exactly how the body bag
first looked.

**`use` ON A HOLDABLE ITEM IS THE HOTBAR'S VERB, SO NOTHING THE PACK NEEDS
MAY LIVE THERE.** Pulling the key lived in `headItem.use`, and the head is
`holdable` — so the pack's second button says "Hold" and calls exactly that,
its Inspect button opened a generic examine screen with no way to take
anything, and the only place in the game the key could be pulled from was
the hand. `inspectOpts` is the door the ring already uses: whatever opens
the examine screen, from the pack or from the hand, carries the option with
it. If an item has a verb, ask which button the player will actually press.

**First-person hand.** Rendered in a **separate overlay scene**
(`vmScene` / `vmCamera`, `renderer.autoClear=false; clearDepth()`).
`armRig` = a bare skin-toned hand/forearm; `toolMount` at the fist centre
holds tool models (the shovel). `layoutViewmodel()` positions the hand from
the view camera's half-extents so it stays framed at any window aspect —
call it on resize. The dig swing is driven by `digT` (0→1 over `DIG_DUR`)
in `updateViewmodel()`; the impact fires at the halfway point.

**`kind.rim` IS A COLOUR, NOT A STRENGTH.** The pack's default is
[0.070, 0.088, 0.125] and `reexpose` writes it straight into the shader as a
vec3, so a scalar there is a TypeError inside `onBeforeCompile` — which is to
say on the first frame the thing is ever drawn. And WHICH creatures get one is
a question about SHAPE, not about darkness: the warden goes out with
`rim: null` because Fresnel is a grazing-angle term and on a body of spindly
limbs and a whip tail every surface grazes, so it lit the whole animal; the
beast is the opposite shape, one heavy solid mass, and without a rim it
rendered at twelve metres as a black hole in a black hall with nothing on it
to read.

**A BUILD THAT READS A TEMP DIRECTORY IS NOT A BUILD.** This packer read an
extraction that happened to be sitting in a session scratchpad, so the day
that was cleared the asset could not be rebuilt at all. It reads the delivered
ZIP now, out of the folder the models arrive in, and unpacks it beside itself
once.

**AND THE PROMPT THAT TAKES YOU SOMEWHERE SITS IN THE MIDDLE.** A prompt down
beside the stamina bar is right for picking a shell up and wrong for the mouth
of a cave — the owner walked into it and never saw it. An interactable with
`mid` puts its prompt under the crosshair in white. It lives BESIDE THE
CROSSHAIR and not in the HUD strip: an ancestor with a `transform` contains
`position: fixed`, so inside the strip it rendered at the bottom of the screen
anyway.

**AND THE PACKER'S WORLD BAKE PUTS EVERY NODE AT THE ORIGIN.**
`undercroft_pack.py` bakes geometry into world space and leaves the node
transforms at identity, so `getWorldPosition` returns (0, 0, 0) for every mesh
in the dojo and "the sword nearest the picture" came back as whichever one was
walked first. The geometry is the only thing that knows where anything is:
measure a `Box3`. Measured that way the picture sits at (0.71, 0.90, -2.57),
`HeroSword2` is 0.88 m from it on the wall at 1.47 m with its sheath beside
it, and `HeroSword1` is 1.5 m away down at 0.45 m — so the one by the picture
is the one on the stand, and that is the one you take. Note also that
`HeroSwordHolder` is the RACK and matches any looser prefix than
`/^HeroSword\d/`, which is how the first build offered you the furniture.

**BRADLY WAITS TO BE SPOKEN TO.** Walking within seven and a half metres of
him opened the exchange by itself, on the theory that you must not be able to
miss him — and what that actually does is take the player's hands away for a
conversation they did not ask for, on a beach whose whole subject is choosing
where to walk. He is a `Talk to him` interactable like everybody else; the
prompt is what stops you missing him.

**AND DEV MODE HANDS YOU THE TOOLS, FOR GOOD.** It is for walking the beach
and testing the fights, and both need something in your hands — the two
shovels are an hour apart and the katana is past the drain, so testing the
knight meant playing most of the game first. Turning it on gives you every
dig tool you do not have; turning it OFF does not take them back, which is
the only behaviour that makes sense: an inventory is a thing you have, not a
mode you are in. They are the SAME item objects the world hands out, so the
view model, the icon, the pack and the save's own replay all behave as if you
had picked each one up.

**8 SETS THE SETTING, NOT A SECOND SPEED.** The first pass multiplied
`RUN_SPEED` behind the slider's back, so the menu said 1.4x while you crossed
the beach at eight metres a second and nothing you could see agreed with what
you were doing. It drives the walk-speed slider to its top (14x) and back to
the owner's own 1.4, readout and slider handle with it. It is never saved —
`settings.walkSpeed` is forced back to the default at load, the way dev mode
is — so a game always starts at the pace it is meant to be walked.

**A MAN DOES NOT POWER DOWN.** The pack's death is a sawtooth falling from 78
to 23 Hz over nearly two seconds under a lowpass sweeping down with it, which
on a creature is a throat going out and on the one HUMAN in the game is
unmistakably a machine winding off — the owner heard machine sounds when he
killed the Dealer, and that was them. A continuous downward glide IS the
machine sound, whatever it is made of. He goes down on breath now: the last
of it driven out through the mask's filter drum, a groan that steps down
twice and stops, and the mask emptying after him. No sweep anywhere in it.

**AND A PALE CREATURE IS NOT A DARK ONE.** The pack's material — a gamma
lift, a fifth of emissive and a cold rim — is for two metres of dark flesh
that renders as a hole without help. His albedo is chalk to begin with and
the same treatment made him a white cut-out on a black ridge, which is the
Military Shovel's failure in a new place. `tint` multiplies the map down,
`emis` is the lift, `rim` the Fresnel, and the pack's values are the
defaults so nothing on the beach moved. Measured on the screen: his lit side
reads 72 against the lane's 62 — a body lighter than the ground it stands
on, which is what lurking looks like.

**AND `press` IS HOW OFTEN IT SWINGS WHEN IT COULD.** 0.62 is the pack's and
it is right for three creatures taking turns — two of them should be circling
at any moment or there is nothing to read. A boss fighting you alone has
nobody to take turns with, and at the pack's number he spent two fifths of
every opening walking sideways: twelve swings in forty-five seconds while the
arithmetic of his own timings allowed thirty-six.

**AN ICON THAT FELL BACK IS NOT THE FINAL ANSWER — AND THE FALLBACK MUST BE
THE RIGHT OBJECT.** `itemIcon` renders the item's own model into a tile the
first time it is asked and caches it, and until the model arrives it shows
the item's DRAWN icon. Two faults, and the checkpoint is what exposed both.
`militaryItem` declared `icon: makeShovelIcon()` — the *sand* shovel's, a
bright red plastic beach spade — so the fallback was a different object
entirely; and nothing ever asked again, so whatever the fallback was became
permanent. On a normal walk you pick the thing up an hour in and the render
has long since replaced it; on a CHECKPOINT LOAD the whole pack is rebuilt
seconds after the page starts, before any network model has landed, so every
scanned item kept its drawing for the rest of the game. The Military Shovel
has its own olive icon now, and `iconsPending` makes the pack ask again on a
TIMER — not a frame, because a pack should not depend on the render loop.

**The pointer lock never gives up.** `scheduleLockRetry()` used to stop
after six tries and leave the player to click, and Safari makes that a
regular event — its "press Esc to reveal the pointer" banner eats a
keypress, it drops the lock on its own, and its post-exit cooldown outlasts
six retries. It asks every 600 ms for as long as the game wants the lock;
any press on the world takes it back (on `pointerdown`, since the click may
never arrive); focus / visibilitychange ask again; and a drag fallback that
latched after a real lock once worked is undone by the next press.

**AND THEY MUST NOT MOVE ALIKE.** The pack has two runs, two idles, two rages
and two deaths, so each kind gets its own in `kind.anim` — but two of them
share a run clip, and the thing that makes those two different animals is not
the clip, it is `rate` and `lean`: the small one plays Run02 at nearly twice
speed bent thirty degrees over its own feet, the big one at four fifths
almost upright. The lean goes on the MODEL group, never the skeleton and
never the heading, and eases in with the running so a standing creature is
never tipped.

**THE CUTSCENE IS A LENS MOVE, NOT A POSE.** `mutCut` joins `packCut` in
`frozen()` and in the pointerlock guard; the camera is TURNED, never moved,
so every clamp still agrees and the hand-back is exact. Two things it got
wrong first. It threw the field of view WIDE for a beat before punching in,
and at 118 degrees three creatures thirty metres off are specks — half a
second of nothing at the head of a five-second shot. And it then OPENED the
lens as they closed, which made them shrink: the field of view widened faster
than the distance fell, the exact opposite of the shot. It goes straight in
now (settings.fov to 24 in half a second, tight before the first roar lands),
HOLDS there while they grow, and gives back only a little inside fifteen
metres. The rest is `mutCutOut`: four tenths of a second of lens after the
take is dropped, while the player already has their hands — which is what
makes it seamless instead of a one-second zoom-out over the opening of the
fight. During the cutscene `updateMutantCut` drives them itself and returns
true, so `updateMutantUnit` never runs and `frozen()` cannot freeze them.

**AND PRESSING E LOOKS THE SAME WHEREVER THE PROMPT SITS.** There have
always been two of these — `#prompt` beside the stamina bar for picking a
shell up, and `#promptmid` under the crosshair for the mouth of a cave and
for the idol on the altar — and they were styled in two separate blocks, so
the strip one had drifted to 0.78rem of dim blue-grey with a small dark key
badge while the altar's read white at 1.02rem with a white-bordered one. E
is ONE verb; only the POSITION is per-prompt. The type, the tracking, the
colour, the shadow and the key badge are declared once against both
selectors, so anything added later inherits it by construction rather than
by somebody remembering. Measured: every computed property identical on
both, badge included. The strip is wider for it (564 px at the longest
label, "Take the Military Shovel") and still centred inside any real
window; only a pane under about 570 px reaches the edges.

**"G DROP" WAS NOT A PROMPT.** A prompt says what the thing you are LOOKING
AT will do. This said what a key does, on every frame you had anything in
your hand, which is most of the game — the one piece of text on the screen
that never changed and never needed reading. G still drops; the controls
sheet still says so.

**AND THE PACK TAKES THE SCREEN IT IS ON.** 880 px was a band across the
middle of a wide display with most of the picture left over, on the one
screen that is nothing but the thing you are reading: 1280, wider gaps, and
a detail pane that grows with it. The RINGS row went from a 40 px footnote
to its own section — its own heading, its own rule, 84 px slots — because
what you are wearing is half of what you are carrying.

**AND THE LEDGE ALONG THE SOUTH WALL IS NOT A LEDGE, IT IS A CARPET.** Four and
a half metres up, hung over a beam: two of them, `TextureMaterial_4`, x -7.64 to
-4.57 and -2.08 to 0.99, and the only thing up there to stand on is the rolled
top of the cloth. The packer samples what is DRAWN, so the walkable strip came
out **0.40 m wide against a body 0.52 across** — measured, a floor at 4.5 from
z -6.62 to -6.22 and nothing either side, so the push-out took you off it every
time. That is "I keep clipping through". `openTavCurtains` widens it to the
carpet's own plan and a hand's breadth beyond, at the height the cloth is
actually drawn at, cell by cell, REPLACING the packer's narrow storeys rather
than adding to them (a duplicate storey a centimetre away is a coin toss over
which one `keepFloorAt` returns, and the packer's carries a roof). Measured
after: 0.8 m of catwalk, walked hands-off from the passage to the break with no
stall. The gap between the two is 2.49 m and the jump clears it — 0.78 s of
flight against a 3.4 m/s walk — with the jump pressed anywhere in a 0.13 s
window, and comfortably at a run.

**SCROLLING THROUGH YOUR THINGS WAS A FLICKER, AND IT WAS `innerHTML`.**
`renderHotbar` threw the whole strip away and built six fresh slots on every
call — and it is called on every equip, so every notch of the wheel destroyed
six nodes and six `<img>` and made six more. Three things follow from that
and all three are the "not smooth": the browser re-decodes every icon, the
0.12 s CSS transition on the selection never runs (a brand new element starts
at its final state), and the strip visibly flashes. The slots are built ONCE
and only a slot whose ITEM changed is rebuilt; everything else is a class
toggle, which is what the transition was always for. Measured: the six DOM
nodes are the same objects before and after a scroll.

**AND A WHEEL GESTURE IS NOT A COUNTER.** The old handler added `deltaY` up
to 40 and zeroed it, which threw the REMAINDER away (a slow trackpad drag
stepped unevenly), let a flick step as fast as the events arrived (a trackpad
sends a hundred small deltas in a burst — measured, that is five slots in one
gesture), and kept a stalled gesture's half-step for ever. It keeps the
remainder, starts clean after 400 ms, and will not step more than once every
85 ms. Measured: four notches step four slots; a forty-event flick steps ONE.

**"IT STILL WILL NOT SHOOT WHEN AIMED" WAS A LATCH, THREE TIMES OVER, AND
THE ANSWER IS THAT THERE IS NO LATCH.** The first build fired on a
`pointerdown`; the second kept a `magTrigger` flag set by that press and
cleared by a release; both are a CHAIN OF EVENTS, and a chain is only as
good as the weakest event in it. Every press listener in this game is on
`renderer.domElement`, so a press that lands on ANYTHING ELSE — an overlay,
a prompt, a frame the canvas was not the target of, a gesture the browser
routed past it — is simply never seen; and the press least likely to be
seen is the one made while another button is ALREADY DOWN, which is exactly
the case the owner was reporting. `mouseBtns` is one capture-phase listener
on the WINDOW for pointerdown, pointerup and pointermove, which no target
and no ordering can bypass, and `updateGun` then DERIVES both of the gun's
controls from it every frame: right is the sights, left is the trigger.
There is no state left for a missed press or a missed release to leave
behind, the two cannot interfere with each other in any order, and the
sights come back the instant a reload lets go of them with the button never
having moved (latching them off in `magReload` was its own small bug).
Measured with real dispatched events: right down then a left press
**dispatched on `document.body`, which the canvas never sees at all**, fires
at full aim and stops on release; left first and then right does the same.

**AND A DOOR YOU HAVE UNLOCKED IS A DOOR.** The way out was a one-way valve:
the leaf on the beach was scenery. It carries the same prompt from this side
now and `startCatReturn` is `startCatExit` the other way round — one cut, one
`catReturn` flag that `updateCatCut` reads to know which end it is going to,
and the black HOLDS until the room is back down, which is the cave-in's own
rule. And it puts you at the THRESHOLD, not at the landing: the landing is
the hole you fell through and there is no way back up it. The spot is the
walk's own — the nearest standable cell a stride inside the leaf — so a
repack of the room cannot leave you inside its wall.

**A SHOP IS A THING YOU LOOK AT, NOT A CONVERSATION YOU HAVE.** He was four
dialogue choices with a price on each — which reads as a chat about buying
something. It is Resident Evil 3's shape now, which is the right one: a
title, what you have to spend, a list of rows with the price on the right,
and beside it a pane showing the one you are on — its picture, its name and
what it does. He says ONE line, and that same line is where every answer a
sale has goes, so there is one place on the screen he ever speaks from.
`itemIcon` is the same render the pack and the hotbar draw, so what you look
at in the shop is the object you will be carrying. And the SIX ROUNDS are
gone: a revolver's whole shape is that there are six and then there are none,
and being able to buy more took it away.

**AND ITS FLAG LIVES WITH THE OTHER OVERLAYS, NOT WITH ITS OWN CODE.**
`frozen()` is at line 4331 and `animate()` is kicked synchronously at module
time, so a `let shopOpen` declared beside the shop — thirty thousand lines
down — is read out of its dead zone on the first frame and takes the page.
This file has now paid for that twice.

**THE ICONS WERE FRAMED BY A BOUNDING BOX, WHICH IS NOT THE PICTURE.**
"Center each, some are off center like the water bottle" — measured against
the control build, and he had picked the worst one: the bottle's silhouette
sat **0.611 of the tile across against a middle at 0.5**, eleven per cent of
the tile off, and the revolver 0.586 across and 0.332 down. Nothing was the
same size either: the fill ran 0.324 (the glowstick) to 0.656 (the CD), a
factor of two. `renderItemIcon` fitted `Box3.setFromObject` — a WORLD-space
box on an object turned by its parent — and then wrote the correction into
`m.position`, which is in the PARENT's frame, so the two disagreed by exactly
the icon rig's own rotation. Worse, a box is not what you see: a katana's box
is mostly air.

**THE SECOND HORSESHOE CRAB WAS WORTH NOTHING, AND THE WHEEL WAS VERY NEARLY
DEAD.** Three of the owner's four, and two of them are one-line causes worth
writing down.

**A STACK IS A COUNT, AND THE SECOND CRAB HAD NONE.** `addToInventory`
refuses an item already in the pack by identity — which is what stops a shell
appearing twice — so the crab in the wreck's hold was written
`if (!inventory.includes(crabItem)) addToInventory(...)`: pick it up carrying
the first and the sound played, the thing left the sand, and you got nothing
at all. `gainCrab` is the one door both pickups go through; `iconHTML` has
drawn a `count` badge in the hotbar, the pack and the ring row since the jars
needed one, and `renderHotbar`'s cache keys on it, so all three show it by
construction. The extraction SPENDS from that number rather than removing the
item, and `crabBled` stops gating it — what says you may bleed another is
that you are carrying another, and two crabs are two jars, which is what the
trader takes. **And a count is not in the save's `pack`**, which is a list of
names: it rides in the flags, and it may not simply be written at load
because the pickups' own replay is about to run and would add to it — a save
with two crabs restored as four. The number is the floor and the replay is
the mechanism, which is `finishRestore`'s own arrangement for everything else.

**AND ONE CLOCK CANNOT BE BOTH THE GESTURE AND THE RATE LIMIT.** `wheelAt`
was the time of the last STEP and was then also asked whether an event began
a new gesture — so until a step had actually fired, every event was more than
400 ms from the last one and reset the accumulator ON ARRIVAL. It could
therefore never accumulate at all, and the only thing that ever moved the
strip was a single event big enough to clear the threshold by itself.
Measured against a fake clock, so the timings are exact:

| | before | after |
|---|---|---|
| a mouse's four notches of 10 | **0 steps** | 4, one per notch, first at 0 ms |
| a slow trackpad drag, 30 x 2 | **0 steps** | 6, evenly at 150 ms |
| a trackpad flick, 40 x 8 | **0 steps** | 6, paced at 56 ms |
| a three-event graze | 0 | 0 |

On a trackpad, which sends small deltas at 60 Hz, the wheel was dead. Two
clocks now — `wheelSeen` closes a gesture, `wheelAt` paces one — the FIRST
step of a gesture does not wait out the gap (the gap exists so a flick cannot
blur through six slots, not so the first notch arrives late), and the
threshold is one mouse notch rather than two and a half of one.
**`performance.now` is stubbable, and a fake clock is the only honest way to
measure anything gated on it**: the pane clamps `setTimeout` to a second
while it is hidden, so a wall-clock trial of thirty events at 30 ms takes
thirty seconds and times the tool call out.

**AND THE WHEEL IS A MOUSE OR A TRACKPAD, WHICH IS A QUESTION ABOUT TIME.**
The round that made it responsive made it hair-trigger: the threshold was ten
pixels, which is one notch of a wheel and about two frames of a thumb, so the
strip ran away under a scroll nobody thought was a gesture. A pixel threshold
CANNOT separate the two devices, and their sizes differ by platform, browser
and the user's own scroll settings — but their TIMING does not overlap at all:
a wheel sends a few big quantised deltas 80–150 ms apart, a trackpad sends
dozens of small ones at the frame rate.

So an event more than `WHEEL_SPARSE` (35 ms) after the last one is a NOTCH and
steps once whatever it measures; a stream faster than that is a SWIPE and has
to cover `WHEEL_SWIPE` (55 normalised px) for each step, paced by `WHEEL_GAP`
(240 ms) so a flick cannot blur through the strip. A step CONSUMES the travel
rather than banking it — banking is what let a flick keep stepping after the
fingers had stopped. Two more things it needed:

- **`deltaMode` IS NORMALISED FIRST.** A wheel set to scroll by LINES reports
  3, not 100, and unnormalised it could never reach any threshold at all.
- **AND A NOTCH IS NEVER TWO PIXELS.** The first event of any gesture is
  sparse by construction, so time alone made the lightest graze of a trackpad
  a notch — measured, three events of two pixels moved a slot, which is
  exactly the "too sensitive". The smallest real wheel notch anywhere is ten
  (three lines is forty-eight, Chrome's is a hundred) and a trackpad's first
  tick is one or two, so `WHEEL_NOTCH` is 6 and nothing else has to separate
  them.
- **AND THE GAP PACES THE SWIPE, NOT THE NOTCH.** A notch is already 35 ms
  from the last event — that IS its rate limit — and holding it to the
  swipe's gap threw away every second click of a wheel: measured, six notches
  120 ms apart moved the strip three slots.

Measured against a FAKE CLOCK, because everything here is gated on
`performance.now` and the pane clamps timers while it is hidden:

| gesture | slots |
|---|---|
| a wheel, six notches (10, 100, or 3 lines) | 6 — one each |
| the same wheel scrolled fast, 40 ms apart | 6 |
| a graze, three ticks, 6 px | 0 |
| a nudge, 24 px | 0 |
| a short deliberate drag, 60 px | 1 |
| a flick, 320 px in a third of a second | 2 |
| a long swipe, 360 px over a second | 4 |
| the momentum tail after a flick | 0 |

**SHIFT TURNS A MAC'S WHEEL SIDEWAYS.** Sprint is Shift, and a mouse wheel
scrolled with Shift down arrives as `deltaX` — the strip never moved while
you ran. The wheel handler reads `deltaX` when Shift is held.

**THE SHOP'S BOXES ARE CHECKBOXES.** The box beside each line used to be
filled when you already OWNED the thing — a picture of a checkbox nothing
could tick — and buying was one button per line. Now a click or Space ticks
the line (`shopCart`, `shopToggle`), the button reads `Confirm · N jars` for
everything ticked, and Confirm or E buys it through `traderBuy`. ONE LINE AT
A TIME, by the owner's word: ticking a line clears any other. A line that is sold out or already in the pack cannot be ticked
(dashed box, "owned"/"sold out" where the price was), and the button refuses
a total you cannot pay rather than filling half the order. The glowstick
costs one jar.

**A BLOW HAS TO REACH YOU IN HEIGHT, AND THE SETTINGS MENU IS IN THE PACK'S DRESS.** The pack's hit test was a distance on the sand with no height or direction in it, so a creature at the foot of the lighthouse bit you at the top. `blowHeightOK(u)` (your feet under its height ×1.05 + 0.3, your head over its feet) gates every creature blow, `blowFacing(u)` the non-aimed ones, and a crab bites only within 0.9 m of its own level. `#menu` is monospace, white, hairline, square, with a square slider thumb and a square checkbox — the same controls and ids.

**LIFE IN THE AIR, CONTROLS ON THEIR OWN PAGE, AND NO WEAPON HINTS.** `critters` (declared above "Shared GLSL", ticked from `animateFrame` via `updateCritters`): ten gulls as one InstancedMesh wheeling 30–110 m off and 16–42 m up over the water, flapping in bursts in the vertex shader, pale enough (0x46506a) to catch against a night sky once fogged; and fourteen moths as one Points batch jittering round you at knee to head height. Both off in any room. The menu's controls are a second `.panel.controls` toggled by `#menu.ctl` (Controls / Back buttons; `openMenu` always opens on settings). The dig prompt ("Dig here · Hold LMB Heavy · Shift + hold") is gone — only "Dig up the mound" remains, when you are looking at one.

**A THING YOU TAKE GIVES BACK ITS SHINE.** `updateShines` lifts the emissive of a takeable's materials, and those are SHARED with the copy in your hand, the pack's icon and the examine screen — so a pickup kept the lift of its last pulse for good ("the gem ring is covered by a bright shade": `#494e59` on both its materials). It is put back the frame the root leaves the scene; `addInteractable`'s `shineLift` lets a displayed thing (the gem ring, `0`) take none at all.

**INVERT LOOK IS GONE FROM THE MENU**, and `settings.invertY` is forced false
at load so a saved session cannot keep it.

**AND `gltfpack --decimate` THREW THE ALBEDO AWAY, WHICH IS A SCAN'S WHOLE
POINT.** The plain weld keeps positions and indices only; the octopus ring
paid for that once by having a projection invented for it. `--keep-uv` is the
undercroft's `cluster_uv` moved into it — a vertex may only merge with one near
it in the ATLAS as well as in space, the POSITION cell still decides a collapse
so the budget means what it meant, and a duplicate is a duplicate in SPACE or
two welded faces fight at the same depth. Normals are RECOMPUTED, never
carried: a decimated vertex is an average of the ones that fell in its cell, so
the normal it arrived with belongs to a surface that is no longer there.
84,815 triangles and 9.6 MB became 30,000 and 2.4.

**THE SHOP BUYS.** A Sell tab beside Buy (click, Tab or left/right):
`SELL_ROWS`, `traderSell`, the same list and the same pane. A Mutant Fang is
a jar; "Sell one" and "Sell all" when you have more than one.

**THE SHOP HAS A LEAVE BUTTON** in its top-left corner (`#shop-leave`), and
Esc still closes it. Tab switches Buy and Sell.

**AN ICON IS RENDERED ONLY WHEN THE MODEL HAS SOMETHING TO DRAW
(`iconDrawable`).** The spliff carries its ember, halo and flame from the
start, hidden on purpose, so "has a mesh" was true before the joint had
downloaded — the icon was an empty tile, cached for good. Meshes under a
`bwKeepHidden` part do not count.

**ICONS ARE KEPT ACROSS SESSIONS, AND ONE WAITS FOR ITS PICTURES.** A checkpoint
load rebuilt the pack before any model had downloaded, so every slot sat empty
for seconds. Every rendered icon goes into localStorage
(`beachwalk.icon.<ICON_CACHE_V>.<id or name>`) and a load draws them on the
first frame; bump `ICON_CACHE_V` if the icon rig changes. And `iconDrawable`
also requires every map on a drawn part to have its image: the CD's sleeve is
a TextureLoader texture that exists before its pixels do, and the icon was a
blank grey case, cached. Icons are webp where the browser can encode it.

**CLOSING AN OVERLAY GIVES YOU YOUR EYES BACK AT ONCE (`regainLook`).** A
lock asked for outside a click is refused (Safari always, Chrome in its
cooldown), so leaving the shop left the camera dead until you clicked. Every
overlay's close now turns on `softLook` as well as asking for the lock: the
plain movement of the mouse turns the head, and the first click takes the
real lock. The shop's Leave always does it, however the shop was opened.

**A WORN RING DRAGS BACK INTO THE PACK**: a press on a ring slot in the pack
arms the same drag as a grid slot, the grid's empty slots light dashed while a
worn ring is in hand, and a drop anywhere over the grid takes it off into the
slot it landed on. **AND A FULL PACK SAYS SO**: an inventory pickup that would
need a new slot reads "Inventory Full" where its prompt would be and refuses
the press (`pickupNeedsSlot` knows which pickups stack), and so do taking a
ring off and dragging one back.

**AN ICON'S ROLL IS AN AXIS, NOT A DIRECTION.** `renderItemIcon` lays a long
thing on the diagonal off its second moments, which cannot say which end goes
up; `iconRot.flip` turns it half round. The Bloody Blade has it (point up,
hilt at the bottom, by the owner's word). `ICON_CACHE_V` is 'v2'.

**The shop:** the .44 is 5 jars, the pack upgrade 3; he buys the Military
Shovel for 3. The tribe's fire makes no sound. The whale's song at the swell is
about 7 dB over what it was (`updateWhaleSong`, cap 2.4).

**THE PACK HAS A LEAVE BUTTON** (`#pack-leave`, the shop's own style, top
left), and it gives the look back like the shop's.

**THE MOUSE COMES BACK ON A KEY, NOT ONLY ON A CLICK.** A pointer lock the
browser takes away (focus, a banner, a system popup, Safari's own) may only be
asked for again inside a user action, and a click was the only one the game
listened for — so the look went dead until you clicked the screen. Two things:
every keydown while playing and unlocked (not Esc, not Tab, at most every
250 ms) calls `requestPointerLock` inside the gesture, and you are always
pressing W; and ANY lock loss turns on `softLook`, so the plain movement of
the free mouse turns your head in between. Neither can be tested in the
preview pane, which cannot lock at all.

**THE LOCK IS NEVER GIVEN UP FOR AN OVERLAY (`vcActive`, `#vcursor`).** The
pack, the examine screen, a dialogue, the shop, a note and the draw each let
the pointer lock go when they opened so the real cursor could click them —
and closing one asked for the lock back, which a browser refuses for about a
second and a quarter after an exit and refuses outright without a gesture.
So every look in the pack or word with somebody came back with the mouse
disconnected. They keep the lock now: while one is open the mouse moves a
cursor of our own, and every trusted press, release, click, double click,
context menu and wheel is stopped at the window (capture phase, registered
before every other listener) and re-sent as an ordinary event to whatever is
under that cursor, with its coordinates — so the pack's drag, the examine
screen's right-drag and zoom, every button, and every `:hover` rule (each is
twinned onto `.vch` at first use) work unchanged. `setPointerCapture` is
wrapped because it throws under a lock. The tail of the press that CLOSES an
overlay (its up and its click, inside 320 ms) is swallowed, or with the lock
held it would land on the world as a swing. Only Esc and the settings menu
free the mouse. And a checkpoint load starts in the drag fallback (a page
nobody has clicked cannot lock); any KEY now takes the lock there too, so the
first W you press after a load is the gesture. Tested in the pane with the
lock faked (a getter on `document.pointerLockElement` and a dispatched
`pointerlockchange`): real mouse moves drive the cursor, a real click selects
a pack slot, and closing the pack keeps the lock.

**DEV: TELEPORT TO THE SHOP** (`devTeleportShop`, `#m-shop` in the settings
menu; it comes out before release). Four rules, and the last one is general:
- It leaves a room by that room's OWN exit (`placeOnBeach`,
  `placeBackAtPortal`, `placeOutOfUndercroft`, `keepLeave`, `tavLeave`,
  `catLeave`, `whaleLeave`, `fortCalmBoss`), so fog, sky, lights and sound
  come back as walking out would.
- It marks the dock's swim-in, the horde's take and the two beach autosaves
  as passed, the way a checkpoint restore does. Otherwise a teleport past
  them plays a cutscene aimed at a beach you are not on, and writes over your
  save.
- It refuses mid-cut and in the saucer's hall, and the button is greyed out
  there.
- **A ROOM MUST NOT READ THE SKY'S STATE UNDER THE HALL CULL.** Five rooms
  save `sky.visible` on the way in and put it back on the way out. The
  undercroft's save runs after `update()`, and on the frame you arrive the
  cull has already hidden the dome, since it has not yet been moved onto you
  and measures three kilometres off. So it saved "hidden". Leaving by the cut
  happened to restore things in an order that hid this; the teleport restored
  them in the other order, and the beach came back under a black sky. All
  five saves now count a dome the cull is holding as visible
  (`hallHid.includes(sky)`).
Measured, from the beach and from inside the bunker, dojo (mid-fight),
undercroft (twice), catacombs, keep, tavern, whale and castle: every room flag
off, sky up, beach fog colour, the sky's duck at 0, and 0.00 m from the spot,
with no console errors. `__bw.roomFlags()` reads all of it in one call.

**THERE ARE TWO TRADERS.** The first stands where he always did (`TRADER_Z`,
short of the stones); the second (`TRADER2_X/Z`, `trader2World`) at the foot of
the dune sixteen metres short of the castle's gate. They share one stock. The
second is the first man's posed skin BAKED into a plain mesh (`buildTrader2`) —
a cloned skinned mesh keeps the original's skeleton and draws where he stands.
`openShop(at)` sets `shopAt`, and only the castle's man (2) lists or sells
**6 Rounds**: two jars, five boxes
(`ammoV` on the save gives an older save that recorded the empty box its
stock back). The row needs the .44 (`needs`), shows the loose rounds you carry
as its stack, and its picture is drawn (`ammoIconItem`).

**THE WHEEL RUNS THE OTHER WAY, AND THE HAND FOLLOWS THE CURSOR.** Wheel down
goes UP the strip now (the owner's way round). A step moves a highlight
(`wheelCursor`) at once, with a pop (`el.animate`) and a soft tick
(`sfxWheelTick`); what it rests on goes into your hand `WHEEL_COMMIT` (95 ms)
after the last step, on the frame clock (`updateWheelCommit`, in
`animateFrame` — a timer is throttled the moment the browser thinks nobody is
looking). Equipping every slot a fast scroll passed through swapped models and
played draws for each, which was the stutter. A digit or a click cancels the
cursor. Trackpads step a little quicker (`WHEEL_SWIPE` 44, `WHEEL_GAP` 150).
Note `__bw.equipped` is a snapshot — read `__bw.state().equipped`.

**THE PACK HAS SLOTS, AND A THING STAYS IN THE ONE YOU PUT IT IN.**
`inventory` is still the LIST of what you carry (every count, save, grant
and trim reads it); `packSlots` is WHERE each thing sits in the grid, and it
may have holes. The old reorder spliced a dense array, so a thing dragged to
the bottom row slid up to the first gap on the next render. The hotbar is the
TOP ROW of the grid (`hotbarN()`: five, seven once the trader has widened
it), shows only what is in it, and the wheel and the digits walk the filled
slots alone — a thing on the bottom row is in the pack and out of the strip,
which is how you keep the wheel short. The save carries `slots` (names by
index) and a restore puts each thing back in its own. **A FULL PACK SWAPS**
(`swapHeldFor`): E on a pickup with no room and something in your hand puts
what you hold down where you are looking and takes the new thing into the
same slot and your hand (`slotHint`); a stack is not swapped. The dojo's
sword is taken OVER THE TOP (`addToInventory(item, true)`) so nothing is
lost for it, and the grid grows a cell.

**THE HUD IS IN THE GAME'S LANGUAGE NOW** — cold moonlight on dark glass and
Georgia, not monospace hairlines. Health and stamina are ONE block bottom
left (`#vitals`): stamina used to sit alone on the bottom's centre and ran
into the health bar at any narrow window. Health is blade-cut segments of
blood in a dark track with a drop at its head, and a GHOST (`#health
i::before`, the same `--f` on a delayed transition) that lingers and drains
after a hit; stamina is a moonlit blade. Hotbar slots are dark glass with
bracketed corners (eight gradient layers on `--c`), italic Georgia numerals,
and the held slot standing out with a lit mark. The `.wf-cine` rule hides
`#vitals` with everything else.

**THE HUD: STAMINA IS BACK ON THE BOTTOM'S CENTRE (`#stamwrap`), and the drop
left of the health is gone.** The bar goes RED (`.out` on the bar and its
track) while `exhausted` — the state in which the guard refuses to come up
until a third is back — and amber (`.low`) under the cost of one more block.
Swinging costs no stamina in this game; red means "you cannot block".

**THE PACK IS ONE SIZE.** `#invpanel .body` is a fixed height and the grid and
the pane scroll inside it; every row of the pane is `flex: none`. The pane's
buttons come and go with the item (an artifact has one per weapon), and the
panel used to grow, re-centre and slide its title under LEAVE, which now sits
in the header row beside the title.

**A FULL PACK SAYS "INVENTORY FULL" AND NOTHING ELSE.** (SUPERSEDES "A FULL
PACK SWAPS".) `swapHeldFor` is still in the file and nothing calls it; the
prompt and the press both just say so.

**A SCROLL UNDER THE VIRTUAL CURSOR IS DONE BY HAND.** `vcFire` re-sends a
wheel to whatever is under the cursor, and a synthetic `WheelEvent` scrolls
nothing — so the pack's list of weapons to set an artifact into never moved.
The capture listener walks up from the target to the first element whose
overflow is auto or scroll and moves its `scrollTop`/`scrollLeft` itself.


**A WEAPON DRAGGED INTO THE HOTBAR GOES INTO YOUR HAND.** The pack's drop
(no recipe) equips the dragged item if it lands in the top row and has a
view model; if what you were holding goes down into the bag and something
holdable came up into its slot, that is equipped instead.

**A FOCUSED BUTTON IS LET GO BEFORE SPACE CAN PRESS IT.** "I keep teleporting
back to the shop when I jump" was the dev "Teleport to shop" button keeping
keyboard focus after the menu closed: every Space clicked it again. The
keydown handler blurs a focused button/input on Space or Enter while no
overlay that takes keys is up, and `closeMenu` blurs anything inside the menu.

**AND A WEAPON DROPPED ONTO THE ONE IN YOUR HAND REPLACES IT** (`target ===
equipped` in the pack's drop), wherever that slot is.

**THE CASTLE'S TRADER SELLS THE DOUBLE.** `shotgun` (10 jars, both barrels and
six shells) and `shells` (2 jars, six, four boxes) are castle-only rows
(`shopRows` filter, `shopAt !== 2` refusals); a row's `needsLabel` overrides the
"Needs the .44" chip.


**AND TWO LOOSE ONES FOR FOUR** (`shells2`, 2026-10-09, the owner's): a
castle-only row after the box of six — 4 jars, +2 shells, five in stock
(`TRADER_STOCK.shells2`, saved with the rest of the stock; an older save keeps
the default). Icon `drawShellsIcon(2)` / `makeShellSix(2)`.

**DEV MODE TOPS THE JARS UP TO 100** (`DEV_JARS`, in `devGrantWeapons`, 2026-10-09, the owner's word): every time dev mode comes on (the menu box, or the reload after a dev-mode death/restart), never cut down. Set directly, not through `gainJar`, which calls `settleRestore()` and could finish a restore early.

**FOUR SHOTS, THEN TWO FOR FIVE** (2026-10-09, the owner's word): the double
comes with both barrels loaded and `sgSpare = 2`; the box of six is gone and
the only shells are `shells2` — 2 for 5 jars, five pairs. A restore deletes a
saved `TRADER_STOCK.shells`, and `traderBuy` returns on any key without a
price (an unknown key used to spend `undefined` jars and made the count NaN).

**THE FLAME'S BORDER BURNS (2026-10-09).** A weapon with the Artifact of the
Flame set in, and the loose artifact itself, carry the class `fire` on their
hotbar slot and pack slot (next to the gold `art` class every artifact weapon
has): orange border and glow, breathing on a 1.6 s alternate animation
(`fireb`). The classes are set where `art` is (`renderHotbar`, `renderPack`),
keyed on `item.artifact === flameArtItem || item === flameArtItem`; the CSS
sits after the `.art` rules so it wins.

**THE TUTORIAL TIPS ARE BIGGER (2026-10-13, "make tutorial text bigger").**
`#fighttip, #digtip` 11 → 16 px (13 under 1100 px wide, 11 under 760), a touch
brighter.

**THE DIG TIP IS THE FIGHT TIP'S ROW, AND STAYS LIKE IT (2026-10-14, the owner:
"make digging the mound the first crab attack too").** `#digtip` is three
entries in the `#fighttip` layout (Mound / Shovel out (or Find a shovel) /
Click the mound), sharing its narrow-screen rules, and it is up for as long
as the first crab fight's row is: until that mound (or any) is dug, a minute,
or you are 22 m from it (`digTip.m`), not eight seconds.

## The shop is the pack's size (2026-10-14)
"Make the shop menu the size of the tab menu … have the leave around the same area." `#shoppanel .panel`
is `min(94vw, 1280px)` like the pack; Leave moved INTO the shop's head row (as the pack's is), styled by
the shared `#invpanel #pack-leave, #shoppanel #shop-leave` rule; the body has a fixed height
`calc(clamp(300px, 54vh, 640px) + 133px)` — the pack's body plus what its rings row adds less the shop's
"say" line — and its list and detail scroll inside. Measured at 1762×1354: both panels (241, 222,
1280×910), both Leave buttons at (244, 247). If the pack gains or loses a row, re-measure the 133.

## The end screen's tally (2026-10-14)

The owner: "when the game ends give a total of 'Mounds dug 0/ however many there is in the game' same for Kills,
Keys found, weapons found, rings found, jars found make these all spot on accurate. then below all that have WALK
AGAIN". `renderEndStats()` fills `#end-stats` from `statLines()` on `showEnd`; it shows in the bare (Great Crab Call)
end too. The button reads "Walk again" (CSS upper-cases it).

- **Nothing can be read back off the pack at the end.** Shovels and rings get sold, keys go into their locks, the peg
  goes home. So `endStats = { kill: Set, item: Set }` (declared beside `bloodJars`, early, because `addToInventory`
  runs at load) is written WHERE THE THING HAPPENS — `statItem` in `addToInventory` and `wearRingAt`, `statKill` at
  the top of `finishMutant`, `mutBleedOut` and `finishCrab` — and rides the save as `flags.stats`.
- **Never on a load or a replay** (`applyingSave`, `replaying`), never for `devGrantWeapons` (`statHush`), and never
  before the module has run to its end (`statReady`, set on the LAST line of main.js — `addToInventory` is called at
  load, before the item lists exist, and `started` is NOT a safe stand-in: the harness's `beginGame` leaves it false).
- A kill is yours only: `lastHitMine === false` (the tavern brawl) and `kind.undying` (the catacombs crawler) do not
  count; a `retired` unit (fled, put away on a restore) never reaches the three death doors. Crabs have no save key:
  `crab#<index in crabs>`. Crab deaths are not otherwise saved, so a reload brings them back — the Set keeps a
  second kill of the same crab from counting twice.
- Totals are from the lists the world is BUILT from (most rooms make their people and jars on first entry):
  `statKillTotal()` = MUT_SPOTS + CAT_FOES + Dealer, knight, samurai, the crawler's young, crusader, Umbra, the well
  man, Dante + 7 demons + PAR_SPOTS + Wong/drunk/orc + TAV_DRINK_FROM + FARM_ROSTER + 1 + PACK_SPOTS = 56. SCP-096 is
  retired at boot and not counted. Keys 6 (the dock key gone 2026-10-18), weapons 7, rings 6 (+ connection) (`STAT_KEYS/WEAPONS/RINGS`, function declarations so
  they are hoisted). Jars = mounds whose `moundRole` is 'jar' + dojo 1 + catacombs 2 + tavern bore 2 + grille 1 +
  the Dealer's bench 3 = 12; found = `takenPickups` ids starting "Take the jar@". Add a jar or a unit anywhere and
  these totals must be told.
- `statHad(item)` also accepts the flags a save from before the tally carried (`boatKeyTaken`, `catDoorOpen`,
  `TRADER_STOCK.gun === 0`, `henryRingTaken`, `tookLabel(...)` …), and a save without `stats` seeds the kills from
  `deadUnits` minus SCP and minus the young one if it fled (`f.catBaby`).

**"Jars obtained" (2026-10-15, the owner: "so it includes any made during the game not just found").** The last row
is a plain count, no total: `endStats.jars`, added in `gainJar` — the one door every jar comes through (pickups,
the syringe on a crab, the trader's price for what you sell) — and never on a replay or a load (`replaying`,
`applyingSave`; measured, a reload into a save of 3 shows 3). On the save as `stats.jars`; a save from before it
counts its jar pickups (`d.took`). `statJarTotal` is gone. Dev mode's hundred is set straight into `bloodJars` and
is not counted.

**The mound tip is one line** (2026-10-15): "CLICK WITH SHOVEL TO DIG UP MOUNDS", whatever you carry.
**Dev mode gives the skull key and the bigger pack** too (`devGrantWeapons`: `INV_MAX` 14, the trader's one then sold).

## Achievement toast; a bigger end screen (2026-10-15)

- `#ach` (index.html, CSS beside `#end`): the console's toast after the owner's picture — a round red badge with a
  white diamond pops (scale, overshoot), a dark-red pill unrolls out of it to 380 px (`width` transition), two lines
  come up ("Rare achievement unlocked" / Ⓖ "50 - Seagull Slayer", the G an inline SVG), it holds ~5 s and rolls back.
  `showAchievement(line1, line2)` drives the classes (`on`, `pop`, `open`) on timers and plays sample `achievement`.
  Centred as a whole: the box is the pill's full width (a 0-wide box translated -50 % put the pill's start at the
  middle). Bottom 13vh, z 70, no pointer events.
- The end screen ("make final stats and walk again way bigger"): `#end-stats` clamp(1.25rem, 2.7vw, 2.1rem), min-width
  min(40rem, 88vw); the button clamp(1.15rem, 2.4vw, 1.8rem) with a 2 px border. Measured at 1762 wide: rows 33.6 px
  (were 15), the button 372×77.
- Then (same day): "take out the 'the lighthouse' text and the message at the end i just want the stats and 'walk
  again' make it white text too" — `#end h1, #end p { display: none }` for every ending (the `.bare` rule was only the
  crab call's), the stats and their numbers #fff, the button white with a white 0.75 border.
- (same day) `RARE_ACHIEVEMENTS` (main.js, above `statLines`): a list of `() => bool`; the end screen's last row is
  "RARE ACHIEVEMENTS" with how many are true (the Seagull Slayer is the first). Every stat label is in capitals in
  `statLines`, and `#end-stats` is `text-transform: uppercase` too.

## The dialog card, bigger and following the window (2026-10-15)

"make all dialog a little bigger and the name of the character more noticeable … make it match the size better and look
better." `#dialog` carries one font size, `clamp(16px, 0.62vw + 0.55vh + 4px, 26px)` (~21 px on a 2000 x 840 window, ~18
on a 1440 laptop), and everything in it is in em off that (the column 44em). The name is a tag — bold, 0.8em, on
rgba(0,0,0,.62) with a 3 px white bar at its left — and hidden when empty. A gradient shade rises from the bottom only
(`#dialog::before`), so the words hold over a lit scene and never cover a face. Still black and white, still monospace.

## The tips take turns (2026-10-16)

"one tutorial should play after another they were just overlapped." The fight, dig and pack tips share one spot. The
dig tip no longer ends when the fight tip starts: it hides while the fight tip (or a shown pack tip) is up and its clock
pauses; the pack tip waits unshown while the fight or dig tip is up, and once shown hides and pauses the same way. The
dealer's dialog was selectable (a drag highlighted it): `#dialog` is `user-select: none`.

## Twelve pockets, and the shop says what things do (2026-10-16)

- `INV_MAX` starts at 12 (2 × 6, the hotbar 6); the trader's Bigger Pack makes it 16 (2 × 8, the hotbar 8, keys 1–8,
  `HOTBAR_SLOTS` 8). A save with the old 14 comes back at 16 (`f.invMax > 12`).
- The shop's Buy / Upgrades / Sell tabs are white, bold, 1.08rem, with a shadow; the one you are on underlined in
  white and lit. The detail text is brighter (0.86). The sell list's descriptions were the trader's flavour lines; they
  are what the thing does now (rings and artifacts read their own `desc`, "Worn: …").

- **Fast walk (`toggleFastWalk`) is key 9 (2026-10-16, the owner).** It was 8 until the upgraded hotbar grew to eight
  slots and the digit test became `Digit[1-8]`, which caught 8 first and fast walk silently died. A dev key must
  never sit inside the hotbar's digit range — if the hotbar ever grows to nine, move fast walk again.

- **The crosshair hides in a dialog; the dialog cursor starts on the box (2026-10-16).** `startDialog` adds
  `body.dialog-on` (`#crosshair` opacity 0), `endDialog` removes it. `vcSync` puts `#vcursor` over the dialog box when a
  dialog opens: at screen centre it sat on the speaker's mouth (the lens frames his face there).

**A FLASHED PROMPT WAS NEVER DRAWN (`flashPrompt`, 2026-10-14).** Every prompt
that says what just HAPPENED — PARRY, BLOCKED, RIPOSTE, OUT OF BREATH, DOWN,
SAND, STEP, the crawl-hole's "Crouch (Ctrl) to get through" — was
`setPrompt(x)` inside `update` with a `setTimeout` to clear it, and
`updateHover` runs later in the same frame and clears the prompt whenever
nothing is under the crosshair (and you are holding a tool: "HOW A WEAPON
WORKS IS NOT A PROMPT"). Measured: "PARRY" on the element after the call,
hidden one frame later, every time. `flashPrompt(html, ms)` sets it and holds
it (`promptHold`) — the hover's own `setPrompt` is shadowed inside
`updateHover` and waits the hold out — and clears it after `ms` if nothing
replaced it. All eighteen call sites converted (they were all the same
two-line idiom). The hover label comes back after the flash. The helm has its
own owner flag (`helmOwnsPrompt`) for the same reason: at the wheel you look
at the sea.

**NO CALLOUTS FOR WHAT YOU JUST DID (2026-10-17, the owner: "get rid of it
saying parry and riposte after you do them — things that are obvious don't
need to be said").** Every `flashPrompt`/`setPrompt` of PARRY, BLOCKED,
RIPOSTE, DOWN, SAND and STEP is gone (17 of them, every creature family).
OUT OF BREATH (a state, not an act) and the deep's "SPACE rise · CTRL sink"
(keys you could not guess) stay.

**CTRL+W CLOSES THE TAB (2026-10-18, the owner, on Windows: "control and w to crouch and walk ... closes the
tab").** Crouch is a toggle on Ctrl, and a W pressed before Ctrl is released is Ctrl+W, which every browser keeps
for itself: `preventDefault` on it is ignored in a normal tab (only the Keyboard Lock API, Chromium-only and only
in element fullscreen, can take it). So: C crouches too and is the key the controls card, the README and the
deep's hint name; and a `beforeunload` guard asks "Leave site?" while a game is under way — skipped when the game
reloads itself (`leavingOnPurpose`, set by `reloadInto`, the end screen's restart and the lost-context fallback)
and in dev mode. A new self-reload must set `leavingOnPurpose` or it will ask.

**THE STATS HAVE A SONG, AND THE STATS CAME UP AGAIN (2026-10-17).** The owner: "add this music to right when you see
the stats it starts" ("5451 beachwalk.mp3"). `assets/end-theme.m4a` (afconvert AAC 160 kbps, 2.09 MB, 109.3 s; the
file is silent from 1:03 to 1:37 and then plays again — the owner's own, left as made). `startEndSong()` at the end
of `showEnd`, prefetched by `lazyBuf(END_SONG)` in `startWakeCut` and retried every 250 ms if it is still on its way;
played once on the music slider (`endVol`, `END_LEVEL` 2.4 capped at `END_MAX` 1.0 — 0.30 at the defaults; peak
0 dBFS straight to the output), in over 0.6 s under the card's two-second fade. Measured through the silent iframe
(audio.md): it reaches the output as the card shows.
**And `showEnd` threw**: `statHad(boatKeyItem)` still read `holdDoorOpen`, removed with the hold door in e7e7e6a.
It is only reached when `boatKeyTaken` is false (never took the boat key), and then `renderEndStats` threw a
ReferenceError before `endEl` was shown: the game ended on the black with no stats and no "Walk again". Now
`boatKeyTaken` alone (a save's `f.holdDoor` already sets it). A removed variable must be grepped for in `statHad`.

## The death card, Esc out of the shop, Ctrl chords, scrollbars you can hold (2026-10-18)
- **YOU DIED** (`#deathcard` in index.html; `deathCardShow/Ready/Go` beside `updateBootHold`). `playerDied` puts it up
  over the red after the usual hold, sets `beachwalk.died` and reloads; the head script adds `html.died` before the
  first paint so the reload comes up on the same card (and `#overlay` is hidden under it). `deathWait` (a `var`, read
  by the input gate) makes `updateBootHold` hold the black after the load is done and light "Restart from last
  checkpoint"; the click clears it (the fade and `audioAfterLoad` follow as before) and, being a real gesture, takes
  the pointer lock and resumes the context. No checkpoint: the reload is fresh, "Restart" lights off the start gate
  and calls `beginGame`. "Quit to title screen" clears the session keys and reloads (the save is kept). The input
  gate lets presses inside `#deathcard` through, and Esc is swallowed while it waits.
- **Esc leaves the shop and the pack.** Both keep the pointer lock (the virtual cursor), and with the lock held the
  browser spends Esc on releasing it — the keydown never arrives. `pointerlockchange` losing the lock with either open
  now closes it (the pack re-asks for the look).
- **Ctrl/Cmd + any key**: a capture keydown takes the default off every chord once `started` (text fields excepted).
  Ctrl+W/T/N/Tab cannot be cancelled by a page; `navigator.keyboard.lock` is asked for those keys only (never all:
  Esc must still release the pointer) whenever the lock is taken — Chrome honours it only in fullscreen.
- **Long descriptions**: the examine screen's `.idesc` wraps (max 86vw × 24vh) and scrolls; a release or a wheel on
  it is not "put it away"/zoom. The pack's/shop's panes and it have styled (classic, 10 px) scrollbars, and under the
  virtual cursor a press in a scrollable box's bar gutter is dragged by hand (`vcScrollAt`, `vcScrollGrab`), its
  release swallowed.
**The death card's Restart is always clickable (2026-10-18).** Clicked before the load is done, the words fade
(`#deathcard.early`) and only the hairline is left; the checkpoint's black stops waiting (`deathWait` off) and the card
goes as the black starts to lift (`deathCardHide` in `updateBootHold`); with no checkpoint `dcFreshGo` begins the game
from the start gate. The lock is taken inside that click either way.
**The stats song, trimmed and from its first note (2026-10-18).** "YOU CUT THE START … I HEAR CLICKS … TAKE OUT THE LOUD
PART AFTER THE SONG": the source MP3 peaks +0.93 dBFS in the reprise after its 34 s silence (clipped on decode: the
clicks); `end-theme.m4a` is now its first 63.77 s only (to where it fades to silence, a 0.5 s tail fade), AAC 192 kbps,
peak −9.6 dB, mean −25.2; `END_LEVEL` 6.5; no fade-in (0.6 s from nothing swallowed its start at 0.3 s).

## 2026-10-18 — the death card's two choices are grey until the cursor is on one

`#deathcard button` is #7d7d7d; `:hover`/`:focus-visible` white with the glow. The `.loading` dimming of Restart is
gone (still clickable while loading, as before; both look the same).

## 2026-10-19 — Restart on the death card, clicked once

The owner: "when clicking restart on the checkpoint the text should fade and it continues loading with just the
loading bar then starts i keep having to click restart twice". Two windows lost the click: (1) the card goes up
750 ms BEFORE the reload, when `deathWait` is still false — `deathCardGo` returned; (2) after the reload the card is
up from the first paint, but `main.js` (4.8 MB) downloads and parses for ~1.7 s under it with no listener. Now:
(1) a click on the pre-reload card sets `beachwalk.dcGo` in sessionStorage and fades the words; index.html's head
script reads it into `window.__dcEarly` and `html.dcgo` (the words hidden from the first paint); (2) a capture
listener in index.html's head keeps a Restart click (and does Quit itself) until `window.__dcLive` is set where
main.js attaches its own. `__dcEarly` is acted on at the very BOTTOM of main.js — `instantStart` is only set there,
and read at line ~8750 it is still false, which would have sent a checkpoint load down the fresh-start path. Acted on
without a gesture, so it does not ask for the pointer lock. `sh tools/probe.sh dcClick`: clicked early → words faded
→ in at 5.3 s; clicked before the reload → in at 5.7 s; not clicked → still waiting.

## 2026-10-24 — "Quit to title screen" asks first

The owner: "quit to title screen should ask are you sure you want to quit?" (a first try put a question on the MENU's
"Restart game" instead — "no change it back to how it was"; reverted). On the death card, `.dc-quit` swaps the two
choices for `.ask` ("Are you sure you want to quit?", Quit / Cancel: `#deathcard.asking`). The swap is index.html's
own click listener, which runs from the first paint — so a press before main.js is up asks too; Quit (`.dc-quit-yes`)
is index.html's until `__dcLive`, main.js's after (`leavingOnPurpose`). `deathCardShow` clears `asking`.
`sh tools/probe.sh dcQuitAsk`: early press asks, Cancel restores, Quit goes to the title with the save kept.

**DEV MODE GIVES THE FISHING ROD TOO** (2026-11-14, "make dev mode give me fishing rod"): `fishingRodItem` is last in
`devGrantWeapons`' list, so the menu box and a dev-mode reload both hand it over if it is not in the pack. Once the deep
is done (`deepDone`) the glow is gone and the bite never comes again, so a rod given then only fishes. Probe `devRod`.

## 2026-11-14 — the merchant is not to be hit
The owner: "make the merchant if you hit him say 'Touch me again and I'll fucking kill you.' if you hit him after that he
swiftly pulls out the gun and shoots you in the face killing you straight to the restart screen abruptly … comedically
abrupt". `traderStrike(P)` in `digImpactCore` (after `plioStrike`): the aim ray against either of his two places (the
beach's `traderWorld`, the castle's `trader2World`), within reach + 0.45, 0.5 m round him, feet to head. `TRADER_RAGE.n`:
1 → `bossLine` with the line; 2 → `busy`, a clone of `magModel` (the .44 he sells) brought from his hip to arm's length at
your eyes over 0.2 s, its −Z on you (`traderGunPose`), the click (`sfxMagShut`), and at 0.3 s `sfxMagBlast` and
`playerExecuted()`: the red with `transition: none`, the death card without `fadein`, the reload in 1.5 s. It ignores dev
mode (you asked twice). Not saved. `traderRageTick` runs from `updateSkrimMood` (every frame). The harness's `aimRay`
reads `_aimD`, which only a swing sets — `__bw.aimHere()` sets it for a probe. Probe `nov14`: line on the first, the gun
on the second, fired 19 frames later, the card shown on that frame.
- **Later the same day** ("make the merchant wait like a second after pulling his gun on you to shoot make him pulling it
  out a little more noticeable too the shot should also be the real gun shot sound with the same recoil for him. make his
  'touch me again' line look like real dialog we have in game too"): the line is `startDialog` on his own card
  (`TRADER_NPC`, "Trader" (it was "Rude Trader" until the owner: "make it just say Trader not rude"), the lens on whichever of him you hit), typed, ending on its own at 2.6 s (`bossLine` only
  if a dialog cannot open). The draw: a cloth-and-leather rasp (`sfxTraderDraw`), out from low at his hip muzzle-down,
  arcing up onto your face over `TRADER_DRAW` 0.6 s, the hammer (`sfxMagShut`) at the top; held `TRADER_HOLD` 1.0 s,
  breathing; then exactly `magFire`'s sound (`sfxMagBlast` + `magShot` 1.22 through `magBus`), a muzzle flash
  (`traderFlash`, an additive sprite 0.3 m toward you, 0.85, gone in ~4 frames — at 0.55/1.0 it whited the screen out), and
  the gun thrown back and up in his hand (`traderGunPose(u, kick)`) for `TRADER_KICK` 0.1 s before the card. Measured
  (`nov14`): his card up on the first blow; the shot 1.62 s after the second; the card 0.1 s after the shot.
- **Third round** ("hitting the merchant lagged my inventory and made my weapon glitch off screen … make the merchant
  actually hold the gun in his hand give him a good animation where he pulls it out and has his arm stuck out aiming at
  your head"):
  - THE LINE OPENED ON THE BLOW'S OWN FRAME, AND A DIALOG FREEZES THE WORLD. Measured (`traderSwing`, a real
    `startDig` at him): `digT` stopped at 0.48, the view model hidden, the swing resuming from that pose when the card
    went — the "glitch". The first blow now sets `TRADER_RAGE.linePending`; `traderRageTick` opens the card once
    `digT` is back to 0 (or 1.5 s), `bossLine` if no card can open by 4 s. After: the swing runs out to 0, the card at
    frame 54.
  - THE ARM (`traderArmAim`): `traderBones.upper_armR` turned so its +Y (a bone's own axis) points at your head
    (world: the bind's axis rotated onto the line, back into the parent's frame), forearm and hand slerped to their
    binds (straight), each blended from the crossed pose (`R.arm0`) by the draw's ease (out fast, a touch past,
    settled); the kick lifts the aim 0.9 m for an instant. The gun rides `handR` (`magModel` hangs from its grip),
    scaled `0.32 / MAG_LEN` — `Box3.setFromObject` on the .44 measures the whole file (its parts share one position
    attribute) and shrank it to nothing. The castle's man is a baked copy with no bones: the live rig is carried into
    `trader2World` and the copy hidden (nobody lives to see it go back). Side still: the arm level at you, the gun in
    the hand pointing down it.
- **Fourth round** ("make sure the merchants arms doesnt clip through his body also make sure his hand is closed around
  the handle of the gun"): measured through the draw (`traderArm`): his right elbow, forearm and hand only move AWAY from
  his spine's line (hand 0.16 → 0.51 m) — but stood to his left a straight aim crossed his chest, so the line is held,
  in his own frame, from 20° toward his left round to 80° to his right. THE HAND: `traderGrip` curls f_index/middle/
  ring/pinky 01-03 about their own X (`TRADER_CURL`) and the thumb about X or Z — WHICH WAY is measured once (each tried,
  the fingertips' distance to the palm read, the nearer kept). The gun's grip sits in the palm (`traderPalm`: the hand
  bone 0.7 of the way to `f_middle01R`). The bones are collected by their three-sanitised names (`f_index01R`, no dots).
- **The inspect screen turns with the mouse, no button** ("when inspecting an item make it so you dont have to right
  click to move it around"): every `pointermove` turns it by `movementX/Y` (the locked cursor's re-sent events carry
  them — it keeps turning at the screen's edge), else by the cursor's delta; left click still puts it away; the hints
  say "Move the mouse to turn it over".
- **The ship's key is "Captain's Chest Key", no description** (was "Captain's Key" / "Off the hook over her hold"). Old
  saves: `ITEM_RENAMED` for the pack, and `PICKUP_RENAMED` for its taken-pickup id (label @ place).

## 2026-11-14/15 — the keychain
- Keys (`isKey`) stay in `inventory` (doors still `inventory.includes`) but take no pack slot: `packCount()` counts the rest
  and every `INV_MAX` test uses it; `keyChain()` lists them. `#keychain-btn` in `#pack-rings`, the overlay `#keychain` with
  its own WebGLRenderer (`kcBuild`), opened only from the open pack; a capture-phase keydown owns the keyboard while up.
- **Real hanging.** Each key is a damped pendulum off the point where it sits on the ring (in-plane `th`, toward you `ps`),
  driven only by that point's acceleration (finite difference, smoothed, × `DRIVE` 0.42 — at 1 a key flailed 2.2 rad going
  over the top), G 4.7 / ℓ 0.085 / damping 5.5, substepped at 240 Hz. No idle wobble: at rest it hangs plumb. The ring angle
  is a critically damped spring (ω 7) on `K.target`, which only ever counts on; `kcPhi(d, n, step)` maps a key's place
  cyclically so the seam between last and first is over the TOP of the ring (Hermite into it) — the old version jumped the
  angle by n on a wrap and teleported every key. Measured: max swing ≈ 0.5 rad, settled in ~0.7 s, no frame jumps.
- **Threaded like a real one.** The ring is the owner's split ring (`assets/key-ring.glb`, decimated by clustering, so it
  has no normals: `computeVertexNormals`), scaled so the middle of its wire (radial spread of its vertices) is at R. The
  chain's first link and each key's jump ring go round that 4.7 mm wire (axis along the wire). The key's hole is found by
  rasterising the key flat into a 72² grid and flooding empty cells from the edge: enclosed cells in the top third are the
  hole, and the key hangs with the hole's top edge resting on the jump ring's lower bend (a hook with no closed hole hangs
  by its top). Models are cleaned of `hitProxy`, sprites, clear materials and `bwKeepHidden` before measuring (the cell
  key's 0.35 m aim ball made it a speck); a key whose model is not in yet gets `makeLairKey()` and is rebuilt when it lands
  (`K.sig` includes each model's mesh count).
- **Reflective metal** (the owner: "make the surface reflective"): this renderer has its own environment (`kcEnv`, a
  float equirect studio through PMREM), so the steel is metalness 1 / roughness 0.2 and the key clones are converted to
  metal (0.92) — their own materials, so the game's copies stay dielectric. A flat dark iron as metal is black: its
  lightness is lifted to 0.42.
- `key-ring.glb` is in `ASSET_REACH` at 60 so it is in the near chain (the keychain can open from the first key).

## 2026-11-15 — the keychain moves into the pack's corner
- The owner: "make the keychain actually be in the corner of the inventory and not another menu". The overlay
  (`#keychain`, its Back/Hold/desc and its capture-phase keydown that ate the pack's keys) is gone. `#keychain-box` sits at
  the end of the rings' row with `#kc-canvas` in it; `openPack` calls `openKeyChain` (now: start drawing), `closePack`
  `closeKeyChain` (stop, and drop `packKeySel`). Pulled up over the pane with a negative margin it covered the selection's
  Drop button, so it stands in the row (the row grows).
- `packKeySel`: a click on the ring (pointerdown + pointerup without a 46 px drag) makes its current key the pack's
  selection (`selectKeyChain`); `renderPackDetail` draws the key (Inspect, Hold/Holster); slot and ring selections clear
  it; `kcStep` re-renders the pane while it is selected. Wheel: deltas gathered to 30 px, then a 140 ms beat (a trackpad
  swipe was six keys). Drag: a key per 46 px. Arrow keys turn it only while it is selected.
- Framing for the small box: Hc 0.31 / Wc 0.34, the content filling 80 % of its height, a little above the middle for the
  name label; camera drift cut to 0.012.
- Keys flipped round the top rode through the ring's wire: a key's attach point now moves out in front of the ring by
  0.045 × smoothstep(sin φ, -0.55, 0.35). The bow is the end with an enclosed hole (`findHang` returns hole counts low and
  high): the Captain's Chest Key hung by its bit under the wider-end guess. Only for long things (aspect > 1.9) — the Skull
  Key's eye sockets are low holes too. A near-round thing keeps its face to you (thin-axis turn only below 0.8×).

## The keychain hangs from a hand (2026-11-16)
"Smoother and have the keys move like in real life when you look at them like they have gravity." `kcFrame`: the ring is a
pendulum (LR 0.22, damping 1.5) off a hand that follows the cursor on a spring (`kc.mx/my`, from a window pointermove
while the pack is open, relative to the box); each key is driven by its attach point's acceleration IN THE WORLD (the
ring's swing included) and drawn at `th − aR`, so it hangs plumb whichever way the ring tilts. Key damping 5.5 → 2.4 (a
key swings two or three times and settles), drive 0.6, with a soft bind past 1.2 / 1.0 rad. Opening the pack gives the
ring and keys a small random swing. The camera looks round with the cursor at 0.03 of its distance (0.10 panned the ring
across the box). The sewer key is the "Steel Door Key" now (`was: ['Lair key']` for old saves).

## Keys all one way, and never through each other or the ring (2026-11-16)
- "All the keys facing the same way": no per-key yaw any more (`yaw: 0`), and the bit goes RIGHT on every key — measured in
  the lower 42 % of the key against the hole's line; a key whose bit is left is turned about its own axis and its hole found
  again (after the upside-down check, which mirrors x).
- "Make sure the keys aren't clipping through each other or the chain": `kcClip` measures it — each key's surface sampled
  into 1.5 mm cells, and shared cells counted against the ring + chain, every other key, and every other key's jump ring;
  `&dense=1` checks every 2nd frame through 8 turns and two hard shakes (238 checks). Before: through the ring at rest,
  through each other on every turn. What fixed it, in order of what the numbers showed:
  - Each key hangs on its OWN side of the ring's plane (alternately front/behind), its middle `KC_WIRE_R + thick/2 + KC_GAP`
    out: the jump ring turns about the wire (`tieG`, pivot on the wire) and the key turns back under it (`bendG`) to hang
    plumb. A key never changes side (the selected one used to swing to the front — through the wire).
  - `KC_WIRE_R` is 0.0105, not the wire's 2.35 mm: the split ring as drawn is ±1 cm deep (two turns and a pitch).
  - Each jump ring is sized to its key (the Skull Key is 3.2 cm thick: no lean of a 12.5 mm ring could carry it clear).
  - A key carried up the side and over the top FLOPS OUT on its side (its body tilted out under the jump ring, the jump
    ring's lean capped at 1.35 rad — added up, lean and flop hung it from above the wire, into the chain's first link), and
    is set out by the bow's rim × sin(tilt), or the rim above its hang point tips back into the wire.
  - The swing binds from 0.6 rad, and the keys are 0.12 long, not 0.14 (as long as the ring is wide: a 16° swing reached the
    next key on its side). Result: 238/238 clear.

- **Stuck in a heavy charge after his line** (2026-11-15, the owner: "after i hit the merchant the first time i get
  stuck in a heavy swing charge"). Not his code: the virtual cursor's tail-swallow. When any vc screen closes, the
  `pointerup`/`mouseup`/`click` in the next 320 ms were eaten (so the click that closed a dialog doesn't swing). His
  line closes on its own at 2.6 s while you are still clicking at him, so a press made just after went to the game
  (`windHeld`, the latch, `startWind`) and its RELEASE was eaten — before the game's `pointerup` and even the
  `mouseBtns` capture listener (registered after the vc one, so `stopImmediatePropagation` starves it). The haul-back
  never let go. Now the tail is eaten only if the press itself went to the cursor (`vcDownEaten`), and a swallowed
  `pointerup` still writes `mouseBtns`. Not reproducible headless (no pointer lock, so the vc never comes on; synthetic
  events are ignored by the vc router) — the fix is from reading the event order.
- **Bigger bars, same numbers** (2026-11-15, the owner: "make health and stamina look a little bigger on screen", then
  "only make them look bigger dont change health or stamia"): `#health i` 60 × 12 → 72 × 14 px (gap 5, padding up a
  pixel), `#stamina` 300 × 11 → 360 × 13. The strip's width at a full reserve is `STAM_BAR_W` in main.js (it grows with
  `stamMax()`), kept equal to the CSS. No game value changed.
- **The ring is "Lucky bastards ring"** (2026-11-15, the owner's words as written). `ITEM_RENAMED` maps both old names
  straight to it (a chain is not followed), and `PACK_FILES` knows it.
- **The merchant's gun sits in his fist** (2026-11-15, "make the gun fit better in the merchants hand when he shoots you
  it looks weird and off"). Measured (probe `merchGun`): the barrel was on you and along his forearm (12°), but the gun
  was squared to the WORLD's up, rolled 46° off his knuckles, the grip out of his fist, and its origin (the top of the
  grip) 9 cm off the hand. `traderGunPose` now builds its frame from the hand: the barrel on you, its top along his
  knuckle line (pinky → index knuckle) made square to the barrel, the top of the grip `TRADER_SEAT.along` (0.45) of the
  way from his wrist to his index knuckle and `.in` (2.5 cm) toward the side his fingertips curl to. The kick still
  turns it about its own side axis. Side stills: grip down through the curled fingers, barrel out of the fist.
- **The castle merchant's teleport after a checkpoint load** ("why when i teleport to the castle sometimes its not
  there"). A fast load (a checkpoint or a death) waits only for what is near the save (`bootLeft`); the far rest,
  castle.glb (22 MB) among it, comes in behind you. Teleporting before it did showed the beach with no castle.
  Reproduced (probe `castleTpCp`, served by a copy of serve.py holding castle.glb back 10 s): `fortState().ready` false,
  86 load steps left. `devTeleportShop(2)` now jumps the castle and Castle XIII to the front (`ROOM_BACK.*.load`) and
  holds the black on the spot (`devFortWait`, minded first thing in `updateFort`, exempt in `blackGuard`, 30 s at most):
  the castle stood there 9.3 s after the click with the 10 s hold.
- **By the handle** (2026-11-15, the same day, "the merchant should hold the handle of the gun not the magazine"): seated
  by the top of its grip (`TRADER_SEAT`, gone), the gun's own frame put his knuckles 9 cm ahead of the grip and 4 cm
  over it — his fingers shut round the trigger guard and the cylinder, the grip hung under his wrist. Now the grip's
  middle (`TRADER_GRIP`, measured off the model in its frame at 0.32 m: the grip spans y −0.085..−0.025, x −0.053..0 at
  its foot) goes on the hole of his fist (the mean of `f_middle01/02/03R` and his palm), and the gun is
  `TRADER_GUN_LEN` 0.37 m (0.32: a 6 cm grip in 8.6 cm of knuckles). Measured after: his middle finger's joints at the
  grip's middle (y −0.056..−0.063 of −0.098..−0.03), the index knuckle at its top, the cylinder and guard ahead of his
  hand. Probe `merchGun`, views `tightR/tightL/tightUnder`.
- **The hotbar a little bigger too** (2026-11-15, "make health stamina and the hotbar bigger on the screen not too much
  tho"): `#hotbar .slot` 62 → 72 px (gap 8, number 14 px, label at 84 px, the held mark 32 px), the ring slots 36 →
  42. Eight slots and the rings are ~700 px tall now, so `#gear` scales to 0.86 under a 780 px window and 0.72 under
  640. The health and stamina bars were already up 20 % that day and left there (that change had not been seen yet).
- **Bigger again, and the rings** (2026-11-15, "make health stamina and the ring section on the hud bigger"): `#health i`
  72 × 14 → 84 × 16 (gap 6, padding 9/18/9/12), `#stamina` 360 × 13 → 420 × 15 (`STAM_BAR_W` 420; `max-width: 62vw` so
  a narrow window keeps it), `#rings .rslot` 42 → 52 (gap 8), the RINGS label 0.58 → 0.68 rem. Still only the drawing:
  no value changed. (Not seen in a still: the probes draw the canvas, not the page.)
- **Items open centred in the inspect view** (2026-11-15, "ITEMS SHOULD START CENTERED WHEN INSPECTING"). Probe
  `inspectCentre` (every `__bw` item with an `inspectModel`, opened as the pack opens it, the drawn pixels' box against
  the frame's middle): up to 11 % off, and the numbers moved with the ORDER they were opened in. Three causes:
  1. **The stale pivot.** `inspectSetModel` reset the pivot's position and rotation but `inspectFit.updateMatrixWorld`
     multiplies by the pivot's matrixWorld — the LAST item's, turned however it was left: each item was measured
     through the previous one's turn. `inspectScene.updateMatrixWorld(true)` first.
  2. **The box.** `Box3.setFromObject` counts the invisible `hitProxy`, sprites and a split part's whole file.
     `inspectBounds` walks only drawn meshes, each vertex its own index reaches, skinned ones posed — used for the
     CENTRE. The SIZE is still the old whole box: the screwdriver and the chest key sit inside their glow sprites, and
     framed by the steel alone the halo filled the screen.
  3. **Perspective.** Opened turned toward you (`rotX`, `rotY`), a long thing's near end draws bigger: centred in 3D
     the shells and the water sat 7–11 % toward it. `inspectCentreOnScreen` projects the drawn vertices at the opening
     turn and slides the pivot in the camera's plane until the outline's box is on the middle (two passes).
  Measured after: every item within 0.5 % (the artifacts 2 %; the screwdriver's steel centred, its halo above it).
  The three keys with no model loaded in a fresh boot draw nothing in the probe (as before). `inspectPivot` is on `__bw`.

- **No mending while the game is stopped** (2026-11-17, "HEALTH SHOULD NOT RECHARGED WHILE IN PACK OR PAUSED"): `hpHeld`
  (pack, menu, shop, note, inspecting) in the HUD tick stops both the wait-then-a-point mend (`sinceHurt`/`regenAcc`) and
  the ring's fill (`hpCharge`) — they carry on from where they were. `tools/hphold.js`: hurt to 1; 40 s in the pack 1,
  40 s in the menu 1, 40 s playing 4. (A probe must load `burntest.js` and step `__adv(1)`: `b.frame(1)` in a tight loop
  is no time at all, and nothing mends.)
- **The hand-drawn HUD** (2026-11-17, the owner: "i want the health and stamina bar to have a more hand drawn feel … i dont
  want you to change the game or size of anything"): health, stamina, the hotbar frames and the blood-jar count are the
  owner's own marker drawings, photographed (IMG_7188 four boxes = health, 7189 long bar = stamina, 7190 six-cell strip =
  hotbar, 7191 numerals 1–10 = the jar count). `tools/hand_hud_pack.py` cuts them into WHITE ALPHA MASKS in
  `assets/hud/` at 2× the drawn size, and the CSS colours them with `mask` + a background colour — so the ink can be
  moonlight, red, green, gold or the blood's blue without a second set of art. Sizes are unchanged: `#health i` 84 × 16,
  `#stamina` 420 × 15 (and `STAM_BAR_W`), `#hotbar .slot` 72², the digits 22 px tall.
  - Pillow on this Mac is an x86_64 build: run the packer as `arch -x86_64 python3 -E tools/hand_hud_pack.py …` (plain
    `python3` fails to dlopen `_imaging`). The inputs are the HEICs converted with `sips -s format png -Z 2400`; the
    crop boxes in the script are in that 2400-wide frame.
  - The packer levels each drawing (`deskew`), sets the marker weight to a target px at the drawn size (`set_stroke`,
    erode/dilate), and scales the bars to height with only the MIDDLE third stretched (`fit3`) — a plain stretch to
    28:1 made the end strokes four times fatter than the long ones.
  - Each bar has two masks: `-ink` (the line) and `-shape` (the filled outline, flood-filled from outside). The shape
    masks the track and the fill; the ink is drawn OVER it (`#health i b`, `#stamina::after`, `#hotbar .slot::after`).
  - **A mask cuts off its own element's glow**, filter and box-shadow alike (CSS applies filter → clip → mask). So the
    stamina's track + fill live in `.sbody` (masked) and the state glows are `filter: drop-shadow` on `#stamina`,
    outside it; the jar count's blue glow is a filter on `.amt`, not on the glyphs. The states recolour the ink by
    `--ink` (stamina) and `--c` (hotbar — so the artifacts' injected `--c` gold/orange colour the drawn frame for free;
    their `border-color` now does nothing, their box-shadows still glow).
  - Hotbar frames cycle by `:nth-child(6n+k)` (six drawn cells; slots 7–8 reuse 1–2); an empty slot is `display:none`
    but still counts, so a slot keeps its drawing whatever is carried. `updateBloodReadout` writes one `<i class="g gN">`
    per character of `N + 'x'` (the x is drawn by the packer in the same stroke — none was on the paper).
  - **The hotbar's boxes are REBUILT, not cut** (same day, the owner: "the hotbar looks bad fix the boxes and make them
    more straight i cant even see the number of the item"). The six drawn cells had kinked, zigzag dividers and a 3.5 px
    line that sat on the slot number. Straightening the drawn walls in place (slide each row onto the wall's median)
    failed on that strip — the jogs pinched, a cell caught its neighbour's wall, the top and bottom lines dropped out.
    `draw_box` now lays four dead-straight strokes, each carrying the THICKNESS PROFILE of the matching line on the
    paper (`profile_rows` / `profile_cols`, clamped to 0.6–1.3× the median so a jog or a crossing doesn't read as fat),
    each edge roughened on its own, a slight tilt per line; 2.5 px at 72. `.num` moved 3/5 → 6/8 and `.count` 5/2 →
    8/5, both `z-index: 3`, so neither sits on the line. The health, stamina and digit masks are unchanged by this.
  - **The hotbar's slot numbers are the drawn numerals too** (same day, "now add the written numbers for the hotbar"):
    `renderHotbar` writes `<span class="num"><i class="hd hdN"></i></span>`. `.hd` / `.hd0`–`.hd9` / `.hdx` in index.html
    are a GENERAL glyph — `currentColor`, width from the drawing's own aspect, as tall as the context's `height` — so the
    held slot's white `.num` colour still works; the dark halo is `filter: drop-shadow` on `.num` (a mask eats a
    text-shadow and its own filter). The pack grid's `.islot .num` and the stack `.count` are still Georgia.
  - **Thinner borders opened the first health box** (same day, "make the drawn health and stamina borders … a little
    thinner and more subtle" → 1.8 px / 1.6 px, ink alpha 0.55; then "i just started with a health missing"). At 1.8 px
    the first box's outline broke at a thin spot, `shape_of`'s flood from outside ran in, and its `-shape` mask was the
    line alone (22 % cover vs 83–91 %): the box drew EMPTY at full health. `frame` now takes the shape from the
    full-weight line BEFORE `set_stroke`, then pulls it in by the same erosion so the edges still meet. Check after any
    stroke change: every `-shape.png` should be well over half solid.
- **Fewer words** (2026-11-17, the owner): the pack's detail panel no longer says "Drag onto another item to combine" under
  Drop (the bottom tip row still says "Drop onto another item to combine"), and the hotbar's label — on hover and as the
  wheel walks it — is the item's name alone, no " — holster" / " — equip" / " — use" (`renderHotbar`).
- **The HUD fits the screen** (2026-11-17, the owner: "make the hud naturally adjust to whatever screen you play on … switching
  laptops … can make the hud overlap"). `hudFit` (inline at the foot of index.html, on load and `resize`) sets `--hud`: 1
  from 1400×820 to 1920×1080 (the sizes it was tuned at), proportionally smaller below (floor 0.4), up to 1.35 above, and
  capped at `(W − 64) / 1300` so the health block (~410 px from the left) never meets the centred stamina bar; `--hud-gear`
  bounds the hotbar column by the height (`(H − 40) / 790`, replacing the two max-height steps). `#vitals`, `#stamwrap`,
  `#prompt`, the tips, `#blood`, `#autosave` (the `scale` property: its slide-in owns `transform`) and `#gear` scale about
  their own corners. Measured gaps health→stamina: 1920×1080 344 px, 1440×900 104, 1280×720 96 (0.88), 1024×768 56
  (0.73), 614 wide 42 (0.42) — they overlapped below ~1300 wide before.

- **The title in the owner's hand** (2026-11-17, a photo of BEACH WALK in brush: "replace the title screen letters with
  these but keep them in the original spots … give them the glow and make them the same color … a more hand drawn
  feel"). `assets/title-{B,E,A,C,H,W,A2,L,K}.png` (white on clear, 240 px tall, 92 KB in all): cut from the photo by
  ink against the paper (rows by ink per line; letters by empty columns, the touching A·C·H and W·A split at their
  thinnest column), solid to the stroke's edge and ~3 px bolder (soft, thin ink read grey at title size), stray flecks
  of a neighbour's stroke dropped (components under 5 % of the letter; the W's last 6 columns). In `index.html` every
  title letter is still its Helvetica glyph, transparent, so the tracking and the per-letter nudges are where they were;
  `::before` lays the drawn letter into the glyph's box (`right: 0.36em`, the tracking) as a mask — the front `#f4f4f4`,
  the glow copy its old blue and blur. Text-shadow would have drawn the old Helvetica, so both shadows are `filter:
  drop-shadow` now; the print-noise mask is off. Preloaded in `<head>` so the name is whole on the frame it lands.
  `tools/titleshot.html` (headless `--screenshot`) shows the title alone; pin `#intro-title` and the glow's breath, or
  two shots differ by the intro's own fades.
- **The title bigger** (2026-11-17, "make the title text bigger"): both layers' `font-size` clamp(1.1rem, 6.2vw, 6rem) →
  clamp(1.4rem, 7.4vw, 8rem). The name is ~12 of its own em wide with the tracking: 8.2vw ran edge to edge at 1280
  (`tools/titleshot.html`); 7.4vw leaves ~6 % a side, and 8rem holds it to ~80 % on a wide screen.

## Keys clicked on the ring, no descriptions (2026-11-17, "take out key descriptions and have it so i can click each key to see them in my pack as well as use the arows")
- The pane shows a key's name and Inspect / Hold, no `desc`. `kcKeyAt(x, y)`: a ray from the ring's own camera through every
  key's `pivot`; a click without a drag on a key turns the ring the short way to it (`kcStep(d)`, d the cyclic
  difference folded to ±n/2) and selects it; a click on the ring or between keys takes the front one, as before. The
  arrows work whenever the pack is open (they waited for the ring to be clicked): the first press selects the front key,
  each after turns. `tools/kcpick.js` (three keys, each projected and clicked): picked = clicked = front, selected, no
  description; Right 0 → 1, Left back. `__bw.kcS`, `kcKeyAt`, `packKeySelS` exposed for it.


## The end's totals (2026-11-17)
"Add total amount of jars and rare achievements at the end, it doesn't show the total possible": RARE ACHIEVEMENTS is
x / `RARE_ACHIEVEMENTS.length`; JARS OBTAINED is x / `jarTotal()` — every jar found or bled (the mounds' jars by `moundRole`,
a jar per crab: the mounds', beach, rock ledge, wreck hold, Skrim's heap `SKQ_LOOT`; plus the fixed ones listed at
`jarTotal`) = 35 today. The trader's pay no longer counts toward the line (`gainJar(n, paid)`, every `traderSell` sale): it
has no ceiling, and a count with a total has to be of things that do. A NEW JAR ANYWHERE MUST BE ADDED TO `jarTotal`.
Probe `statsAndSteps`: the card reads "JARS OBTAINED 0/35 | RARE ACHIEVEMENTS 0/3".

## The pack in the owner's hand (2026-11-18, "what are some ideas on giving the inventory an art style that matches the game" → "do 1 and 4 make it good")
Idea 1: the pack drawn with his marker, like the HUD. Idea 4: lit like the night it is opened in. Sizes and layout unchanged.
- **The art**: `tools/hand_pack_pack.py` (`arch -x86_64 python3 -E tools/hand_pack_pack.py hotbar.png assets/hud`; the
  input is IMG_7190 at 2400 wide, `sips -s format png -Z 2400 ~/Downloads/IMG_7190.HEIC`). It imports `hand_hud_pack`
  for the cut and `draw_box`, so every stroke carries the THICKNESS PROFILE of a line on his paper (the strip's top,
  bottom and walls), edges roughened, laid straight. Writes `assets/hud/pk-*` (~230 KB): six cells `pk-slot1..6` 288²
  (cycled `:nth-child(6n+k)` like the hotbar), `pk-dash` (a dashed cell: where the thing you drag can go), `pk-sel` (a
  loop circled round the cell, ends overlapping), `pk-big`, `pk-btn1..3`, `pk-leave`, `pk-ring1..2` (circles), `pk-kc`,
  the long rules `pk-rule1..2` 2600×20, the short `pk-short1..2` 640×16, and `pk-vrule`. Seeded: re-running gives the
  same files byte for byte.
  - `loop()` is a superellipse (sq 2 a circle, ~3.6 a rounded square) whose wobble MUST be low-frequency (sines of 2, 3
    and 5 bumps round the loop) plus the boxes' small edge noise. A per-sample random walk on the radius came out as a
    jagged, hairy outline.
  - **A long rule squeezed into a short element reads as dots** (2600 px of profile packed into ~250 px): the short
    lines (the name's underline, the rules round what a thing does) use `pk-short*`.
- **The CSS** is one block in index.html after the pack's own rules ("THE PACK IN THE OWNER'S HAND"), overriding them:
  each thing's drawing is a `::after` (or `::before`) masked by its PNG, coloured `--c` (the hotbar's convention), so
  states recolour the ink: hover brighter, selection white, empty cells dim, `combines` white with a glow, `.takes`
  swaps the cell's `--ink` for `pk-dash`, and the artifacts' injected `#inv-grid .islot.art/.fire/.sea` rules got a
  `--c` each (gold/orange/blue frames, measured in `tools/packshot.html?art=1`). Georgia (the hotbar label's face)
  replaced the monospace; the slot numbers are his drawn numerals (`renderPack` writes `.hd` glyphs, one per digit).
  - **The slot's `::after` used to be "IN HAND"**: it is the frame now, so `renderPack` writes `<span class="inhand">`.
  - The selection is a loop circled round the cell (`.islot.sel::before`, inset −10px, a 0.22 s draw-in), the cell lit
    from inside like a torch over it, the icon brighter (the others at 0.9). The grid has 10 px padding (and −10 margin)
    so a loop on an outer cell is not cut by the grid's `overflow-y: auto`; `.islot` is `overflow: visible`.
  - **Light**: a cool radial wash from the upper left (the moon), the corners down to 0.95 black, and film grain:
    `#invpanel::after`, an inline SVG `feTurbulence` tile at 0.075, jumped in `steps(1)` (off under
    `prefers-reduced-motion`). The panel rises 8 px as it opens.
  - **TRAP: `#pack-leave` was given `position: relative` in the block, and the shop section's LATER
    `#invpanel #pack-leave, #shoppanel #shop-leave { position: static }` (same specificity) won.** Its absolutely placed
    drawn box then sized itself to `.panel` and drew a huge blurred frame round the whole pack. `#invpanel .head
    #pack-leave` outweighs it, with `top/left: auto` (the base rule's `top: 1.6rem; left: 1.8rem` otherwise push it onto
    slot 1). Any new pseudo-element frame: check that its host is positioned.
- The masks load at boot (the pack's DOM exists from the start), so the first open has no missing frames.
- `tools/packshot.html` (headless `--screenshot`, `--virtual-time-budget=60000`): the pack open with nine things and two
  keys; `&st=1` forces the drag states, `&art=1` the artifact frames (forced AFTER the frames: renderPack redraws as
  icons land and wipes classes set earlier). Per-pixel DOM, so it shows what a canvas grab cannot.
- Not changed: on a screen under ~760 px tall the panel is taller than the window (top −44 px at 470×650), so its top
  and bottom lines fall off the screen, as the old hairlines did.
- **`refreshUI()` does not redraw the hotbar** (2026-11-17, the owner: "stacked item numbers arent showing up in hotbar"). It
  only toggles visibility. `renderHotbar` rebuilds a slot only when called, so a count changed with just `refreshUI()`
  left the old number up until something else redrew it (equipping, scrolling): a second glowstick showed no "2",
  dropping one off a stack (`dropItem`) kept the old number, and taking a dropped one back did the same. All three now
  call `renderHotbar()`. Anything that changes an item's `count` must call `renderHotbar()` (the `gainX` helpers do).
  A headless check: `addToInventory(glowstickItem)` with `count = 3`, `dropItem` it twice, and read `#hotbar .count`.
- **The owner's alphabet is the game's font** (2026-11-18, "use this aplabet for all the letters in the game except the
  setting for now … flip over the m for the w … start game and stats and death screen as well"). `tools/hand_font_pack.py`
  (native `/usr/bin/python3 -E`: Pillow, numpy and fontTools all load there now; `-I` hides numpy) cuts the 25 marker
  capitals (IMG_7204, no W) by CONNECTED INK — the X-Z row's tops dip into P-V's feet, so row bands fail; every letter is
  one blob — levels the paper, sets one stroke weight, traces pixel-edge loops (RDP + one Chaikin pass) to TrueType at cap
  700/1000, W = M turned over, lowercase = small caps (0.8), 0-9 from `assets/hud/d*.png` → `assets/hand-font.woff`
  (15 KB). index.html: `@font-face 'BW Hand'` (preloaded, `font-display: block`) and `body :not(#menu, #menu *,
  #intro-title, #intro-title *)` — NOT `body` itself, or `#menu` inherits it. Punctuation falls back to Georgia. Canvas
  lettering on things in the world (engravings, labels) is untouched. Checked full-page (CDP screenshots): loading, START
  GAME, the pack, the HUD, the end stats, the death card in it; settings in its monospace.
- **"Hold" → "Equip"** in the pack's detail panel (`renderPack` and its button), "Holster" while held.
- **Bigger** (2026-11-18, "make start game and death screen text bigger"): START GAME clamp(2.7rem, 4.8vw, 3.9rem) (was
  1.9/3.4/2.7), YOU DIED clamp(3.6rem, 7.6vw, 6.2rem) (was 2.6/5.4/4.4), its buttons 1.4/2.6/2.0 (1.05/1.9/1.45), the ask 1.25/2.2/1.65.

## The menu in the owner's hand, and every panel fitting its window (2026-11-18)
"restyle the settings to match the pack's hand-drawn style … make every HUD element, the pack and the settings fit and
look their best on any window size … have all this match the games style as well".
- **The menu's dress** is one block after its own rules ("THE MENU IN THE OWNER'S HAND"), the pack's language: the
  moonlit wash and the moving grain (`#menu::after`, `pkgrain`), the top/bottom lines `pk-rule1/2`, every button a
  drawn box (`pk-btn1..3` cycled by `nth-child(3n…)`, `--c` ink; hover lights the inside, nothing fills solid), the
  controls page's rows ruled by `pk-short1/2` at 0.22, the toggle a drawn box (`pk-slot3`) lit from inside when on.
  **The words keep the menu's monospace** (asked to stay readable; the owner decides if it goes to his hand).
- **A slider's drawn line is the INPUT's own background** (`pk-short1/2`, white as drawn, the input at 0.92): a mask on
  `::-webkit-slider-runnable-track` clips the thumb, which lives inside the track — the thumbs vanished. The thumb is a
  plain ring (2 px border, a lit dot): 288 px of marker loop squeezed to 15 px was a smudge on the line.
- **Fit**: `hudFit` (foot of index.html) also works out `--fit-pack`, `--fit-shop`, `--fit-menu` from each panel's own
  laid-out size (`offsetWidth`, and the menu's `scrollHeight`: `scale` leaves both alone, so it never feeds on itself):
  the `--hud` scale (1 at the tuned sizes, up to 1.35 on a big screen) unless that runs it off the window (97 % × 95 %),
  floor 0.5 (the menu 0.62, and below that it scrolls: its `max-height` is `94vh / --fit-menu`). `scale:` not
  `transform:`, so it stacks with the pack's rise. A `ResizeObserver` on the panels and `document.fonts.ready` re-run it.
- **A wide but short window** (`max-height: 860px` and `min-width: 900px`) lays the settings' sliders two to a line and
  the buttons four across, and the controls page in two columns (keys 8.4rem): 1280×720 and 960×540 fit with nothing
  scrolled. Before: the menu ran off the bottom at 1280×720 and the pack's top was cut at 960×540.
- The fight/dig/pack tips sat under the panels and read through their dark: hidden while one is open
  (`body:has(#menu.show, #invpanel.show, #shoppanel.show)`).
- `sh tools/uishot.sh [out] ["menu pack ctl hud"]` (port 4215, own profile): full-page headless screenshots of each at
  1280×720, 1440×900, 1920×1080, 960×540 and 2560×1440 (`tools/uishot.html?ui=…&w=&h=`).

## The menu in his hand font, the shop in his drawn style (2026-11-18)
- The owner chose the hand font for the settings over the monospace: `#menu` came out of the page-wide `BW Hand` rule's
  `:not(...)` (only `#intro-title` is left out now). The shop was ALREADY in the hand: that rule is `!important` and
  beat `#shoppanel`'s own monospace and `.say`'s Georgia.
- "make the shop match the style we have now too also handwritten": block "THE SHOP IN THE OWNER'S HAND" after the
  shop's rules — the pack's wash and grain, drawn top/bottom rules, the list/pane line, a drawn box per picture
  (`pk-slot1..6` by `nth-child`), the chosen line's picture circled (`pk-sel`, the pack's `pkcircle`), drawn price chips
  (`pk-btn*`, red `--c` when poor, `pk-dash` when owned), the big drawn frame on the pane's picture, the tab you are on
  underlined by hand, Leave the pack's `pk-leave`.
  - **The list/pane line lives on `.body`, not on `.list`**: the list scrolls, and a pseudo-element in it scrolls with it.
    Its place is `right: calc(max(290px, 30%) + 2.2rem)` — the pane column is `minmax(290px, 30%)` plus the gap.
  - **`#shop-leave` carries `top: 1.6rem; left: 1.8rem` from when it was absolutely placed**: made `position: relative`
    for its drawn box, those offsets pushed it onto the tabs. `top: auto; left: auto` (the pack had the same trap).
  - The thumbnail went `overflow: visible` so the circle isn't clipped; the list got 8 px of left padding for the loop.
- `tools/uishot.html?ui=shop` opens the shop (`openShop(1)`); `sh tools/uishot.sh <dir> shop` shoots it at the five sizes.

## The pack's pane, live (2026-11-18, "do 1 and 3 … make the item sounds not corny … impressive … amazing and intuitive")
Section "THE PANE, LIVE" in `main.js`, just above `const invDetailEl` (it must be: `renderPack()` runs at module time and
its `renderPackDetail` → `pvAttach` reads `pvShown`). CSS block "THE PANE, LIVE" in `index.html`, before the shop's.
- **Its own renderer** (`pvBuild`, the keychain's pattern), a canvas moved into each new `.big` the pane's innerHTML makes
  (`renderPackDetail` is now a wrapper: `renderPackDetail0` sets `pvShown`, `pvAttach(pvShown)` mounts). Drawn only while
  the pack is open (`pvFrame` stops itself), at `RETRO_SCALE` with `image-rendering: pixelated`. The picture stays under
  it until the model is drawable (`.big.live` hides it). Lights: the icon rig's, plus a `glint` directional and a `glow`
  point light made once and only turned up/down. `sc.environment = ringEnv()` (THIS scene only): without it a metal with
  no map of its own was a black hole (the Wedding Ring's band, the Skull Key).
- **Fit** (`pvMount`/`pvSeat`): `pvProfile(item).pose` or by the box — long (a/b > 2.6) STANDS on its axis leaned 0.62
  across the box and spins about itself; flat (c < 0.3 b) FACES you (the icon's rotation, turned till widest) and sways;
  else LIES (pitch ~0.36) over a shadow. Sized to the largest it gets on screen as it turns, at `PV_FILL` 0.74.
  - **Measure the orient group DETACHED** — `Box3` is world space; under the turning groups it took their turn and the
    fit's last offset (every next item came out further off, pos in the 10⁵s).
  - **`pvBox` counts only what is drawn** (`traverseVisible` + geometry boxes): `setFromObject` counts hidden parts and
    the .44 fitted to its invisible muzzle flash was a speck.
  - `pvProfile` matches by NAME; order matters — "syRINGe" was a ring.
- **Behaviour**: selecting sets it DOWN (drops 0.42, bounces once at 0.22, rocks on a spring — a liquid one, `slosh`,
  longer and softer); drag turns it (movementX, works with the pack's own cursor's synthetic events), its fling kept
  and eased back to the auto spin; "drag to turn" breathes until the first drag; double-click examines. Metal `glint`s
  every 4.5–8.5 s (the directional swept across at up to 9 — at 3.4 nobody could see it); glowing things (glowstick,
  Flame, Sea, Whale faintly, the Shock Ring flickering with a crackle) light the box, tint its drawn frame and spill
  `--pvglow` round it (`--pvk` the flicker), and their CELL glows in the grid (`.islot.glows`, `--glow`); the horseshoe
  crab twitches now and then, Billy's motor turns over.
- **Sounds** (`pvSfx(mat)`, all through `sfxOut()`): a thing SET DOWN in canvas — a filtered-noise contact, the body as
  inharmonic partials (metal ~1:2.76:5.4:8.9, glass 1:2.32:4.25), wood/bone a knock damped in tens of ms, plastic a hollow
  tock, paper a rustle in grains (`pvGrains`), a low thud for weight. Gains in the ring sound's range (`sfxRingOn`).
  `pvSlosh` (lowpassed wash + chirping bubbles), `pvCrackle`, `pvMotor`, `sfxPackOpen(open)` (canvas and the flap).
  Not listened to by me (headless is muted): judge them in the game.
- **A thing new to the pack** (`_packSeen` on the item; more than two at once is a load and just appears): its box is
  drawn round (`@property --pkdraw` swept in a conic mask over the ink, `mask-composite: intersect`), the thing set in,
  and it is the selection — `--fd` carries the elapsed time so a re-render mid-draw continues it.
- **Harness**: `__bw.pvS/pvShot/pvLook(item)/pvMore/pvDbg/pvSettle/pvSfx/pvSlosh/pvProfile/removeFromInventory`.
  `sh tools/pvsheet.sh out.png` — every item in the pane, two turns each, pose and material (QS="strip=A|B" for 13 frames
  of each one's first 1.3 s). `tools/uishot.html?ui=pack&sel=<name>` puts one in the pane; `&fresh=1` freezes a new
  item's draw-in at 0.32 s. Probe `packLive` (sounds don't throw, the draw-in selects, it turns, a drag turns it, the
  loop stops on close, no errors).

## The settings in two columns at every size (2026-11-18, "make the settings more like this layout", his 1280×720 shot)
- The short-window media query is `@media (min-width: 900px)` now: two sliders to a line, buttons four across, the
  controls page in two columns, at every window wide enough; under 900 px one column.
- And `hudFit` lets the MENU (only) grow to 59 % of the window's width, the share it has in his shot (still bounded by
  97 % W / 95 % H): at the HUD's own scale (≤ 1.35) it sat small in the middle of a 1920 or 2560 screen.
- The settings menu is in his hand font too now (`#menu` out of the page-wide rule's `:not()`).

## The shop's pictures as the pack's; the settings smaller (2026-11-18, late)
- "fix shop item icons like how they are in the pack": the shop's `.pic` showed the icon IMAGE — its own black tile
  cropped inside the drawn frame — and the list's thumbs were 52 px. Now `renderShop` ends with
  `pvAttach(it, shopDetailEl.querySelector('.pic'))`: the pack's live view (one renderer, its canvas moved into whichever
  box is up; `pvAttach`/`pvFrame`/the parallax ask `invOpen || shopOpen`; double-click examines only in the pack — a
  shop's thing is not yours). The `.big` rules are doubled for `#shoppanel .detail .pic` (the canvas, `.live`, the hint,
  the glow); `.pic` is `min(100%, 300px)` square and not clipped; thumbs 66 px. An upgrade (no model) keeps its drawing.
- "make the settings less big": the menu's fit is `min(1.25, 48 % of the width / its width)` (not the HUD scale, not
  59 %). At 1280 that is 0.71, at 1920 1.07.

## The pack on the paper in his hands (2026-11-18, IMG_7207: "put this as the canvas behind the inventory … an animation opening it up with the same sound effects in the video keep the hands … written style on this worn paper … retro", then "fix the left hand")
- **The frames**: `ffmpeg -ss 1.80 -t 2.45 -i IMG_7207.MOV -vf "fps=30,scale=960:-1" frames/%03d.png`, then
  `swift tools/hands_cutout.swift frames cut` (Vision "lift subject"; keeps only instances reaching the bottom edge — the
  arms — and big ones overlapping them below the top band — the sheet), then `/usr/bin/python3 -E tools/pack_hands_pack.py
  cut assets/hud/pack-hands.png` (313 KB, 14 frames 669×330 in a 4-wide sheet, 96-colour PNG). Frames 7-22 the opening
  (8 frames: folded strip, snap, settle), 25-45 held (6, ping-ponged at 6 fps), REGISTERED on the paper's centroid so the
  sheet stays put under the writing. The motion-blurred snap frames (11, 12, 15-17, 62-65) carried the table, the
  notebook and the jar: not used. Closing plays the opening backwards (the video's own close blurs the same way).
- **The clean-up, and the left hand**: a box cut for the notebook (`U<0.175, V<0.47`) took the TOP OFF HIS LEFT HAND (a
  straight edge across the knuckles), and the jar beside it (lid over the thumb, body between palm and sheet) was kept as
  skin — a second thumb. Now: the notebook goes only where it is not skin (`warm = (r−g)/r < 0.2`; skin ~0.38, paper
  0.09-0.13); the jar by colour (dark red-black, lum < 0.30, or its rim lit purple, b > g — skin is never either), and
  only the parts of it that TOUCH THE OUTSIDE (the crease between his thumb and finger is as dark but enclosed);
  holes refilled only under 120 px (a big one is where the jar stood). Vision's person segmentation was tried for the
  hands and took the table with them.
- **The look**: skin vs paper by `warm` (not saturation: the shadowed sheet is as saturated as skin); the sheet recoloured
  from its own crease shading (relative to the frame's median: the exposure wandered) to old paper, tea stains with tide
  lines, browned ragged edges (distance transform), grime where the thumbs hold it, sparse foxing; a cool moon from the
  upper left; 4×4 Bayer dither to 9 levels a channel; a one-pixel dark line round the silhouette; 1.14× wider than shot.
  The tide lines at full strength read as a contour MAP — kept faint.
- **In the game** (`PH` in main.js, `#pack-hands` in index.html): a canvas at the sprite's own size blown up pixelated,
  sized so the whole sheet fits (height mostly), its middle on the window's; its own rAF loop only while shown. `phPlay`
  from `openPack`/`closePack` — a close mid-opening folds back from the frame it got to. The panel is written into
  `PH.write` (the sheet clear of both thumbs and the torn top, by eye): `packPaperFit` → hudFit's `--fit-pack`, placed
  by `--pk-dx/dy`, `width: 960px` on paper (the sheet is nearer square than the screen, so a narrower panel scales up and
  the words read bigger). It fades in at 0.44 s, when the snap is done.
- **The ink** (`#invpanel.paper`, after the live-pane block): `--moon` becomes brown-black ink, so every drawn line turns
  at once; each stroke's mask is intersected with `--brk` (SVG noise) so the pen skips. **TRAP: a `mask` shorthand
  resets `mask-composite` to add** — stroke ADD noise is a solid box; the composite rule must come after every
  shorthand (it is the block's last rule). Selection circled in dried oxblood with a drop-shadow second stroke; glows,
  the artifacts' neon frames and the pane's light spill all off (inks instead).
- **The pictures**: `renderItemIcon` also writes `lastClear`, the render with no tile (`itemIconClear`, cached under
  `<key>.clear`; an old tile renders once more for it); `iconHTML(item, true)` in the pack, its ring row, the pane and
  the drag ghost. Multiplied into the sheet, drained a little, a pencil shadow. The hotbar and the shop keep tiles.
- **Sounds**: his two snaps (open 1.92-2.42 s, close 3.76-4.18 s), highpass 140, `afftdn`, faded, `assets/pack-open.m4a`
  / `pack-close.m4a` (`SAMPLES.packOpen/packClose`); the old drawn grains are the fallback until they load.
- The health and stamina showed through the dark round his arms: hidden while `#pack-hands.on`.
- Harness: `tools/uishot.html` `&ph=open:0.3` (held still that far in; `held:t`, `close:t`) and `&at=x,y` (lists every
  element under a point — `elementFromPoint` skips `pointer-events: none`); probe `packHands` (frames, breathing, the
  mid-open close, clear pictures, errors). Reduced motion: no animation, the held sheet.

## The paper pack darker and in marker; inspect beside the sheet; bare arms (2026-11-19, "make the pack more able to be seen and marker like drawing of the lines darker the inspect should still have the paper beside it. make that blue sleeve on the right arm be skin color and fix the skin spiking out on the other left arm. make everything more visible in the pack but still have it blend")
- **Marker**: every stroke's mask is its drawing three times — at 0, 1.1 px right, 1.1 px down, ADDED — then INTERSECTED with
  the skip noise (`--brk`, now `-6R + 4.8`: fewer skips). One generic rule, the block's last (`--mk` per element names
  its drawing). **A drop-shadow cannot thicken a masked stroke: CSS filters run BEFORE the mask.** A thing new to the pack
  keeps its draw-in (`.islot.fresh::after`, its own three-layer mask after the generic one). Ink `rgba(14,9,4,.96)`, words
  `#120b04` with `-webkit-text-stroke: .35px`, empty cells .52, the verbs' boxes full ink.
- **Things**: `mix-blend-mode: hard-light` (was multiply, which turned anything pale — the water bottle — into paper):
  each keeps its own light and dark and the sheet's grain shows through; saturate .92, contrast 1.12, sepia .1.
- **Inspect from the pack** (`inspectFromPack`): while the sheet is held, the pack goes as `closePack` would (`packAside`)
  but the sheet stays — `#pack-hands.aside` slides it left (translate −27vw, scale .68, no dim), the examine scene's lens
  slides a quarter-screen (`inspectCamera.filmOffset`, set at the render only; `inspectCentreOnScreen` zeroes it to centre
  on the true lens) so the thing turns on the right, and its words sit over it (z 14, above his arm). Putting it away
  (`closeInspect`) re-opens the pack quietly (`openPack(true)`: no snap, the sheet only slides back — `phPlay` returns for
  a held sheet). `phDraw` folds a held sheet that nothing is on (no pack, no look). Probe `packHands` covers it.
- **Arms** (`pack_hands_pack.py`): the sleeves are bare forearm — his forearm's colour just above the cuff, shaded by the
  cloth's folds at 60 %, a little shadow toward the frame's edge, drained like the hands (both arms, so the opening's two
  arms match). The left wrist's spur (the jar's edge): a diamond opening of 4 took its tip and left the wedge; a DISK of
  radius 8 rounds that stretch of the arm.
- `tools/uishot.html`: `&still=1` turns transitions off (a headless `--screenshot` can land mid-fade: the panel came out
  blank once), `&insp=1` inspects the selected thing from the pack, `&insp=2` a plain inspect. A plain inspect of the
  shovel is as dark headless as the aside one.
- (2026-11-19, "still show the inventory to the left on the paper while inspecting"): `packAside` keeps `#invpanel.show`
  and adds `.aside` — the whole pack layer is carried with the sheet (translate −27vw 4vh, scale .68) about the SAME point,
  the canvas's middle (`--ph-ox/oy`, set in `phLayout`), not clickable (a click puts the thing away), its grain hidden
  (the grain is screen-sized: aside it showed as a box). Every way out removes `.aside`/`.show` (`phPlay`, the fold guard
  in `phDraw`, `closeInspect`).

## The sheet bigger, the writing readable (2026-11-19, "make the pack bigger by having the paper bigger the little bit of the top can be trimmed by the screen. make evrything on the pack more visible it seems hard to read make it blend well still with the game and notes style")
- `phLayout`: the sheet 1.12 of the window's height (was 0.955), its foot at 98.5 %, the torn top off the screen. The
  panel fits the part of `PH.write` that is ON the screen (`ph.wv`, clamped to 3-97 % of the height) — `packPaperFit`
  and `--pk-dx/dy` read it — so nothing written runs off the top.
- In the note's hand still, every size up and in full ink (index.html, under "THE PACK ON THE PAPER"): h2 1.32 rem, the
  name 1.36, the verbs 1, the hints 0.92 and no longer a dimmed italic, slot numbers 0.9; the marker's stroke 0.5 px.

- **Inspect aside, its old size** (2026-11-19, "the size of the pack when inspecting can go back to how it was it blocks
  the models now"): the sheet grew to 1.12 of the window, and aside at 0.68 of it it covered the thing turning. Both
  `#pack-hands.aside canvas` and `#invpanel.paper.aside` at 0.58 (0.68 × 0.955 / 1.12: the size it was).
- **The sleeves their own colour** (2026-11-19, "make the sleeves their original color in the inventory"): the same day's
  bare-forearm repaint in `pack_hands_pack.py` undone (`sl = rgb * 0.85`); the left wrist's disk opening kept. Re-made
  from `~/Desktop/BEACHWALK ASSETS/IMG_7207.MOV` by the docstring's three steps; its JSON is the game's `PH` unchanged.
- **Names fit** (2026-11-19, "some of the names get cut off in the inventory fix this but keep the pack all the same"):
  `packFitName` after `renderPackDetail` and in `kcText`: one line as drawn, a name too wide for its place stepped down 7 %
  at a time (no smaller than 55 %), nothing else moves. `tools/packnames.js`: every slot and every key, none cut ("Spare
  fancy house gate key" 21.76 → 14.08 px in the pane).

## The inspect fits the screen, whatever the screen (2026-11-19, the owner, a wide window: the bone mace half behind his hand, its words off the right edge — "THIS SHOULD ADJUST TO EVERYSCREEN PERFECTLY. I CANT HAVE ITEMS BEING CUT OFF WHILE INSPECTING")
- `inspectLayout()` (on `openInspect` and every resize): from the pack, the sheet aside is scaled (`--aside-s`, 0.58 down to
  0.36; `--aside-tx` −27 % of the width) until his hand's right-most pixel — read off the frame on `phCv`
  (`inspectHandRight`) — stops at 55 % of the width; the free box is right of it (the whole width otherwise), under the
  name and words, over the hint; the words are centred on it and wrap to it; the thing's whole turning size (1.7 x 1.12 at
  the opening distance) is fitted to the box by the lens's `zoom` (out only) and slid onto its middle by a VIEW OFFSET
  (`inspectApplyView`) — the old `filmOffset` slide was a fixed quarter of the screen. `inspectCentreOnScreen` clears
  the view first (it centres on the true lens). Checked headless at 800x600, 1000x650, 1280x1024, 1440x900,
  1920x1080, 2560x1080 (`uishot.html?ui=pack&insp=1&sel=Bone%20Mace`).
- **Grammy orc's photo, the back** is written in the owner's alphabet ('BW Hand'): drawn at load in Georgia, then again
  when `document.fonts.load` has it (the texture's canvas redrawn, `needsUpdate`). `tools/grammyback.js` dumps it.

## Picking a thing in the pack is paper (2026-11-19, the owner: "when clicking through items in the pack have the paper sounds i dont want the claude sound effects")
- `sfxPackPaper()`: one of his sketchbook page turns (`packPaper` = `assets/intro/flip1-3.m4a`, the call's, cut off his own
  clip) at 0.4 (they are ~9 dB over `pack-open.m4a`'s mean), ±7 % rate, none within 70 ms of the last — on a slot, a ring
  or the key ring becoming the selection (`selectPackSlot`, `selectRingSlot`, `selectKeyChain`; not re-clicking the
  same one). The synthesized sounds of the pane (`pvSfx`'s set-down knocks and rings, `pvSlosh`, `pvCrackle`,
  `pvMotor`) are off behind `PV_SYNTH`. `tools/packpaper.js`: 8 picks → 6 page turns (one already selected, one empty),
  0 other buffers, 0 oscillators.

## 2026-11-19 (later): the achievement's face, artifacts' squares, the spliff's green, the wrist, the crab
- **The achievement pop-up keeps the console's face**: `#ach, #ach *` are out of the 'BW Hand' rule ("RARE ACHEIVEMENT TEXT
  SHOULD GO BACK TO HOW IT WAS NOT HANDDRAWN").
- **Artifact squares in the pack** in the hotbar's colours: whale #ffd46a, fire #ff9a3c, water #7fe0f2 (`#invpanel.paper
  #inv-grid .islot.art/.fire/.sea`), a shade stronger when picked.
- **The spliff's stamina green** deeper and softer: #3aa83c, a 5 px 0.45 glow (was #4ef04a, 10 px 0.95).
- **The pack's left wrist**: the inner wrist's spur rounding in `tools/pack_hands_pack.py` is a disk of 16 now (8 left a
  knob of skin standing out under his palm in the held frames); the sheet rebuilt from IMG_7207 (Desktop, BEACHWALK
  ASSETS) — its paper rects unchanged.
- **A crab being drained does not turn with the cursor** (the inspect's `pointermove` returns while `extracting`), and
  does not drift either (the idle drift is off while extracting: its `inspectAuto = 999` "no drift" turned it instead).
- **The pack's left wrist, the patch** ("fix the patch of skin sticking out the left wrist too way more"): the bare wrist
  between the heel of his palm and the cuff bulged out (a gentle bump no opening takes). `clean()` now trims his inner
  edge, row by row, from the deepest point of the notch under the palm (searched within 0.22 of the frame above the cuff)
  to the cuff's inner corner, to the straight line between them — on the arm's own piece only (the one the cuff is in), so
  the fingers and the paper are untouched. (Raising the cuff instead left a blocky step in the opening frames.)
- **The pack's left wrist FLAT like the right** ("look at how flat the right side wrist is and do that"): in the held frames
  (source 13 on) the inner edge from the heel of the palm (the edge's farthest point out, 0.18-0.36 of the frame above the
  cuff) to the cuff's inner corner IS the straight line between them: past it cut, short of it filled with the skin at its
  edge (`clean`, writing `a` in place). The SLEEVE there is dark AND grey (`warm < 0.1`): his shaded forearm is as dark but
  warm, and taken for the sleeve it put the "cuff" 160 px too high, so nothing happened.
- **Achievements**: "Piss off the dealer" as he takes the well man's portrait (`dealerTakePortrait`, `dealerPissed`, saved)
  and "Free Henry" as his cell is unlocked (`henryFree` ≥ 1); both in `RARE_ACHIEVEMENTS`.
- **"Nothing bites here"** (`landFloat`): the float down anywhere outside the spot's water (`FISH_GLOW`, 0.85 of its r),
  until the deep has had you.

## The pack's ink heavier, its numbers bigger (2026-11-19, "make lines and font thicker and more noticeable on the pack the numbers are very small too")
- Every marker stroke is laid SIX times now (0, 1.1 px right/down, 1.6 diagonal, 2.2 right/down — the `--mk` mask layers,
  ADDED, then `--brk` INTERSECTED; composites `intersect, add ×5`); the fresh-item draw-in four. Letters: text-stroke 0.85 px
  (0.5), every size a step up (h2 1.46, name 1.5, desc 1.14, verbs 1.1, hints 1.02, rings 1.2, keys 1.04).
- The slot numbers are his drawn digits (`.hd` masks, `aspect-ratio` per digit), so their size is a HEIGHT: 13 → 21 px
  (`#invpanel.paper .islot .num .hd`), and heavier by a drop-shadow of their own ink on `.num` — on the parent, because a
  filter on the masked box itself runs before its mask. Stack counts (Georgia) 1.45 rem.
- `sh tools/uishot.sh <dir> 'pack&still=1'` (the `&still=1` rides in the ui name; without it a shot can land mid-fade and come
  out blank).
- **DROP hidden at 960×540** (older than the above; the owner: "Yes, fix it"): `#invpanel .body` is `clamp(300px, 54vh,
  640px)` and `.detail .big` 28vh — off the WINDOW's height while the words are rem — so in a short window the body sat at
  its 300 px floor and the pane (overflow-y auto) scrolled its last verb out of sight. The paper pack is scaled to the sheet
  as a whole (`packPaperFit`), so its body is a fixed 570 px and the preview min(100%, 280 px): the same layout at every
  size, only scaled. Shot at 960×540, 1280×720, 1440×900, 1920×1080, 2560×1440: all three verbs, nothing cut.

## 2026-11-19 (late) — the keys black in the pack; the left wrist not ruled straight
- **"the keys are glitched fix this now"** (a key drawn black over another on the ring, a black bar through the gate key in the
  box): `ringEnv()` is a PMREM render target of the GAME's renderer, and the pack's live view (`pvBuild`: `sc.environment`)
  and some keys' own materials (the Skull Key's, given it so it was not a black hole) carried it into OTHER WebGL contexts,
  where it does not exist: metal reflected nothing — black. Headless Chrome tolerated it (the bug never showed in a probe,
  at any size, any keys, after holding them); the owner's Chrome on the Mac's GPU did not. Now `ringEnvFor(r)` makes the
  same night per renderer (cached), `pvBuild` uses its own, `pvSeat` swaps any carried env on cloned materials
  (`envSwapFor`: shared materials stay the world's), and the keychain's metal copies drop a carried env (`envMap = null`; its
  scene has `kcEnv`). Any new canvas with a renderer of its own: never hand it the game's env.
- `tools/uishot.html`: `&keys=name,name` (keys on the ring, by `packByName`), `&kc=1` (the keychain picked, by a real
  pointerdown/up — a click does nothing there), `&kcn=N` (the ring turned N keys), `&eq=name` (held and put away first).
- **The left wrist** ("make his left hand less straight it looks unatural … i just wanted that patch of skin fixed better"):
  `pack_hands_pack.py`'s heel-to-cuff line is bowed in (0.022 W0 at its middle) and only what stands PAST it is cut; the dip
  under the palm is no longer filled out to the line. Re-made from `~/Desktop/BEACHWALK ASSETS/IMG_7207.MOV` (the docstring's
  steps); `PH` unchanged.

## 2026-11-20 — the keychain does not turn; the menu holds a cutscene; the credits
- The keychain: each key keeps its place on the ring (`mid` at the bottom), the one you are on comes forward `KC_FWD`
  (0.045 m) and turns its face to you. The ring no longer carries the chosen key round (the owner: "not flip around").
- **The menu holds a cutscene still** (`cutNow`, `cutPause`): the menu may open in any cut now (the pointer-lock handler's
  list of cuts that refused it is gone); while open over one, `animateFrame` skips `update` and every cut updater, the audio
  context is suspended (`loadSilent` returns true while `cutPaused`, so nothing resumes it — the watchdog, a key, a click),
  and the intro's cues are let go and set again off the song's clock (`introHold`), the waves video paused.
