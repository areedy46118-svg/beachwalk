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
  retired at boot and not counted. Keys 7, weapons 7, rings 5 (`STAT_KEYS/WEAPONS/RINGS`, function declarations so
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
