# Items and pickups

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**Retro look.** `renderer.setPixelRatio(RETRO_SCALE)` (0.62) renders at low
res; CSS `image-rendering: pixelated` blows it up. `retroTex()` forces
nearest filtering / no anisotropy. Canvas textures are small (256²) and
colour-quantised. Everything is `flatShading`.

**Examine view.** `openInspect(model)` / `closeInspect()` — a "turn the item
over" screen (like the RE inventory). `inspectScene` + `inspectCamera` render
over everything when `inspecting` (animate() early-returns); `inspectFit`
centres+scales the model, `inspectPivot` is spun by dragging `#inspect`.
`frozen()` includes `inspecting`. Used by the crab (`openInspect(crab)`) and
the syringe; reusable for any examinable item.

**The extraction / combine.** Crab + syringe are separate inventory items;
"use" *either* while carrying the other → `startExtraction()`. A scripted
sequence plays in the inspect scene: an `extractRig` holds crab + syringe with
the needle at `_hinge`, and `driveExtraction(t)` (from `updateInspect`, ~3.4 s)
pops the cap, sinks the needle, runs `syringe.userData.setFill(0→1)`, then
lifts out. `finishExtraction()` sets `crabBled`, empties + re-caps the syringe,
adds a **"Jar of blue blood"** item (`makeBloodJar()`), and shows the jar as
the payoff.

**A scan with no UVs gets its texture PROJECTED — see the ring.** The
octopus ring is an STL and cannot carry UVs, so Poly Haven's rust goes on
triplanar in `iron.onBeforeCompile`: sampled along each object-space axis and
blended by the face normal. Two things it depends on: `USE_MAP` still wants a
`uv` attribute on the geometry (a zero one is added), and the blend normal
comes from `dFdx/dFdy` of the object-space position — NOT the `normal`
attribute, because `gltfpack.py --decimate` emits positions and indices only,
so `normal` reads as zero, the weights sum to nothing and the ring renders as
a black cut-out. Flat shading never notices, because three derives its
lighting normal from derivatives too. `uTri` is the tiling.

**Photo cut-out NPCs share `bakeCutout()`** — low pixel count, posterised,
graded cold, with blink as a fake eyelid (a band of forehead painted down
over the eyes, both frames baked once). Bradly and the Very Old Fisherman
use it. `startDialog(id, npc)` takes `{name, script, sprite}`; omitting it
is still Bradly. Both cut-outs come from `tools/cutout.swift`, which is
macOS Vision person segmentation and needs no dependencies:
`swift tools/cutout.swift assets/x.JPG assets/x.png 900`.

**HIS LEFT LEG IS PAINTED ON.** A photograph ends where it ends, and the
hard cut at his shin was the tell — so that leg comes off below the knee and
a peg goes on it. `paintPegLeg()` runs inside `bakeCutout` via its `paint`
hook, which fires BEFORE the downsample, the posterise and the grade: paint
it after and it sits on top of the picture looking like paint. It is painted
rather than modelled because he is a billboard and a 3-D peg would line up
from exactly one angle. The coordinates come from walking the PNG's alpha,
not from guessing.

**Crates are a factory now** — `buildCrate(x, y, z, yaw, onBreak)` into
`crates[]`, walked by `crateStrike()`; `crate`/`breakCrate()` still mean the
first. Gibs and puffs take the crate's own `y`, so the deck crate's boards
land on the deck. The key it holds is set down, not thrown: `PhysProp`
knows one ground, the sand, and a body bouncing on a deck two metres up
falls straight through the boards. The key itself is Sousinho's scan
(`assets/key.glb`), loaded async into the `keyModel` Group like the ring.

**The string courses are open-ended cylinders.** `CylinderGeometry` caps by
default, and three capped bands round the outside of the shaft are three
solid discs straight through the bore — floors at 7, 14 and 20.5 m that you
climbed up into. Pass `openEnded = true` on anything ring-shaped that crosses
the shaft.

**A KEY POINTED AT YOU IS A STICK.** The wheelhouse key was set in the
captain's mouth turned to run OUT through his teeth along +Z, and end-on a
key is fully foreshortened: no bow, no bit, nothing on it that says key, and
what you actually saw was a black rod hanging out of a dead man's mouth. Its
length is its own local X and its flat is its local Z (measured off the
scan: 15 cm by 5 by 1.5), so the IDENTITY rotation lays it across the mouth
with the flat toward you and the whole silhouette showing — clenched in the
teeth, the way anyone carries something in them. A few degrees off level,
because nothing in a dead man's mouth is straight. And it was black for the
usual reason: roughness 1 and a dark map on a surface facing away from the
only light on the beach. METALNESS IS A TRAP — tarnished brass reads as a
bright rough dielectric with a warm lift.

**THE WHEEL, THE STAR, THE HEAD, THE KEY, THE DOOR — one chain, and every
link had a break in it.** `dragWheel` was defined and never called: the look
handler took every mousemove, so the wheel could be grabbed and let go and
never turned. It is routed first now, ahead of `applyLook`, while
`wheelGrab`. The puzzle is a BEARING, not a lock: ONE star (`helmStar`) is in
the sky always, off her port bow, blinking on an irregular count (`bwHashJS`
of the beat, not a sine — a swelling star is a lamp), and holding the wheel
at `HELM_STAR_DETENT` for 0.8 s solves it and `dropShipHead()` lets the hook
go. The head is alexrmartinez's scan (`assets/head.glb`), and it could NOT
go through `gltfpack --decimate`: vertex clustering keeps positions and
indices only, and a face is a UV atlas — it rendered as a flat red blob.
`tools/head_pack.py` decimates in Blender, which keeps the UVs; note the
glTF importer loads images LAZILY (`has_data` false until the pixels are
touched), and the first build shipped the 2K PNGs whole. The built head's
Group is kept and emptied and the scan lands in it, so the hook, the
examine screen and the pack all hold the same object; the scan faces +Z in
its own frame and is turned to face the helm. The key is a SECOND load of
`assets/key.glb` into `boatKey`, a Group that exists synchronously, because
`boatKeyItem` and `holdable()` name it at module time — the old code read
`shipHead.userData.key` and nothing ever set it, so the key never existed
and the door could not be opened. `holdable` clones lazily, so an empty
group is fine.

**A DOOR YOU OPENED STAYS OPEN.** The shell door EATS the key — it goes into
the lock and stays there — and `holdDoorOpen` was not in the save, so a
checkpoint made on the far side of her came back with the wreck locked again
and `boatKey` still true, which handed you back a key you had already spent.
It is a flag now, and it is restored BEFORE the key's own gate so the two
cannot both fire. Same rule as the smiling one and the pack's cutscene: a
thing you have already done does not un-happen when you load.

**The crate and the ring.** The crate under Bradly is the game's one lock:
`crateStrike(P)` raycasts the crosshair at the crate itself — reading the sand
under it lands the ground point a metre past the far side when you aim at the
lid — and only `P >= CRATE_POWER` (0.75, ~two-thirds of a charge) breaks it.
It is a `rockColliders` cylinder while it stands, removed in `breakCrate()`.
The ring (`models/ring.js`) is a takeable that `openInspect()`s with
`equipLabel`/`onEquip`; `E` in the inspect view — not the click, which already
means "put it away" in there — calls `wearRing()`. Worn rings live in
`rings[]`, a separate array from `inventory` so `RING_SLOTS` is a real limit,
rendered by `renderRings()` into `#rings` under the hotbar; both sit in the
`#gear` column so the rings stay under the hotbar however many slots it has.
`#rings` stays hidden until `ringsFound`. `wearRing()` refuses a ring already
in `rings[]` — it duplicated once.

**Everything a mound gives up carries a shine.** The glowstick lights
itself, so it was obvious; everything else was a dark object dropped on a
dark beach at the moment the screen was full of flying sand, and it went
straight past people. `addItemShine()` on the relic, at a good size. The CD
is also STOOD UP in the hole rather than laid flat — face up it is a
hand-sized rectangle seen edge-on from standing height, and it read as a
sliver.

**A footprint's rim has to be a RING.** `makeFootTexture()` draws heel, ball,
arch and five separate toe pits, and the thing that makes it read as a print
is the pale lip of displaced sand round it. Drawn as radial gradients whose
inner stop sits inside the part, that lip FILLS each part pale — and since a
night beach is nearly black the pale wins and the whole print is a white
ghost, which is exactly what the first build did. It is strokes now, offset
toward the moon and stacked wide-then-narrow for softness, leaving the middle
to the dark pits. Toes must also stay clear of the ball; joined to it they
read as a paw.

**THE BOTTLE IS A DRINK, AND IT HEALS.** A click with it in your hand
(`onDrink`, the shell's own `onListen` door in `primaryAction` and
`attackAction`) brings it up under the lens and tips it back —
`MOUTH_AT` / `MOUTH_POSE`, blended into the arm the way the ear pose is,
with a small tremor at the lips — three gulps, and `hp` is full on the
second. Four sips in it (`waterSips`); each drains the model AND the copy in
your hand, which is found BY NAME (`water`, set in `models/water-bottle.js`)
and given the original's scale and position, because `holdable` clones and
`setFill` closes over the original's mesh. Empty, it taps hollow and does
nothing. Measured: hp 1 → 4 at 0.62 s, water column 0.176 → 0.124.

**SEEN THROUGH THE WINDOW, AND ONLY THAT.** Entering the column revealed
the SCP for one build and a fallback woke him on anyone who walked past —
the owner was killed coming back from the checkpoint. `scpInView`: the
middle of the screen on his spot from the round room's floor (`mushWhere`
'floor'), inside 45 m and 37 degrees, and there is no other trigger. The
`scpPhase` getter had to move into the ORIGINAL `__bw` literal, the
`abductDone` lesson again.

**AND THE RING IS BEHIND THE WALL, WITH THE BREAK'S OWN RIM.** It stood at
exitEdge + 0.06, which is the plane the wall is in, so from the nave a disc
of cave stone eighteen metres across hung in front of the apse and fought it
for the depth buffer. It is behind the wall now, and its inner rim is built
to the SAME wobble the shader cuts with, a finger's width inside it, so it
plugs the cut exactly instead of leaving a crescent of open wall wherever a
round hole and a ragged one disagree.

**AND THE GLOWSTICK IS A CRACKED LIGHT-STICK, NOT A LAMP.** At 17 over eleven
metres it washed a room out, which never showed on an open beach and showed
badly in the tunnel, where the owner was carrying it: the one place in the
game that is meant to be dark was the one place it was brightest. Eight over
seven metres.

**AND HE MAY NOT ARRIVE IN YOUR FACE, OR INDOORS BY DEFAULT.** The spawn is the
nearest cell behind you that the walk grid calls floor AND has room around it —
the free cells within a body's radius are counted, so a cramped interior corner
loses to the open ground through the doorway and the fight can start in the
yard, which is the better arena of the two. Scoring on clearance alone walked
him back off the open ground and into the room (measured: 1.2 m behind the
player, which is not "at your back", it is on top of you), so anything nearer
than `MIN_BACK` is refused outright.

**AND THE SAME THING CANNOT BE HAD TWICE.** `addToInventory` refuses an item
already in the pack. Every takeable that can be picked up more than once —
the shells, the note — builds a FRESH item object, so identity is a safe
test, and it is needed the moment anything hands out an item whose world copy
is still lying on the sand waiting to be taken.

**AND THE KEY COMES OUT OF THE HEAD IN YOUR HAND.** The examine screen was
the only door, which is a door you have to know about: you are standing there
holding a head with a key in its teeth and the obvious thing to do is reach
for it. `onPull` is the shell's own `onListen` door — a click, or E — and it
is a GETTER, so once the key is out the head is just a head. **And what you
hold is a CLONE**, so a change to the world object does not reach it and the
key stayed in the teeth of the head in your fist: `holdable` keeps its
builder (`vm.userData.make`) and clears the group first, so anything that
changes an object under a held copy can ask for it again.

**AND THE CORNER IS THE ONE UNDER THE POSTER.** Measured, not guessed: the
corner itself is full of cupboards, so the stand stands at the nearest cell to
it that a body actually fits in — 1.05 m out along the -x wall, under "IT CAN
HAPPEN HERE". The way to find a corner someone has photographed is to raycast
the render at the thing in the picture and read the object's name back, not to
reason about which wall is which.

**BEING HIT WAS THE ONE IMPACT IN THIS GAME WITH NO SPRING UNDER IT.** The
guard rings on one, the world rolls on one, an overhead dips the camera on
one — and a crowbar landing on the PLAYER got a red flash, a shove and a
lowpassed puff, which is why losing a quarter of your health read as a
nudge. Four things now, and the one that carries it is DIRECTION:

- **The head is thrown, and thrown the right way.** `hurtShock` is the same
  damped spring, released from its PEAK on the frame the blow arrives (a head
  is thrown in one frame, never eased into it) and ringing back through
  centre in two thirds of a second. `hurtRollK` / `hurtPitchK` are worked out
  from where the thing that hit you is standing, in the camera's own frame:
  struck from your right and your head snaps LEFT, struck from in front and
  it snaps back. **Positive `camera.rotateZ` is your head going left** —
  measured with a render, not reasoned about. It is applied around the scene
  render and taken off again, like `hitRoll` and `slamDip`, so it can never
  leak into the look state. About 5° on a light blow and 7° on a heavy one.
- **`k` is how hard it was, and everything reads off it.** A two-point blow
  is half of you and it used to arrive through the same flash as a nip; and
  the blow that leaves you on your LAST point is the one moment in a fight
  the game should be shouting, so it lands hardest of all (×1.22). Trauma,
  hitstop, the FOV punch, the knee dip, the knockback and the sound all
  scale with it.
- **BLOOD ON THE LENS, AND IT OUTLASTS THE FLASH.** Drawn once onto a canvas
  — big splashes bedded into the corners and edges with their own satellites
  and drips, and a mist over it — and hung on its own layer. Three things it
  needed. It is round the EDGES: the middle of the screen is where you are
  looking and a game that paints over it is a game you cannot play. It is
  BRIGHT red with a dark heart and a lit rim, blurred in CSS, because the
  first pass drew it near-black over a beach that is already nearly black and
  you could not see you had been bled on — a drop on glass is wet, and wet
  catches the moon. And it is a SIBLING of `#hurt`, not a child: a child is
  multiplied by its parent's opacity, and that parent fades to nothing in a
  second, while what lands on the glass should still be there two and a half
  seconds later. Its z ties with the HUD it is declared before, so it sits
  over the dark edge vignette that would swallow it and under the health bar,
  which must stay readable while you are being hit. It is drawn and encoded
  at the END OF THE INTRO, never on the frame you are hit — twenty
  milliseconds of canvas is nothing at a loading screen and a dropped frame
  in the middle of an exchange, the same reason the drain and the bunker are
  warmed.
- **And it sounds like a body, in the order a body feels it.** The crack of
  the thing arriving, the dull weight of it going in, a sub you feel rather
  than hear, and — a beat LATER, because the noise a person makes is never
  simultaneous with the blow — the breath it drives out of you.

**AND TWO THINGS STEERING ONE BODY IS NEITHER OF THEM STEERING.** He was
still catching on the table after the pathfinder went in, because
`updateMutantUnit`'s chase and `followPath`'s route were BOTH moving him
every frame — the chase straight at you and into the table, the route round
it. Whoever is steering, steers: the chase branch is off while he is on a
route. And the gate that let him ask for one was `dist > 2.4`, which is
exactly the range at which a table between you IS the problem; anything past
his own reach counts now. Measured: 17 of 17 with furniture between you.

**AND A TEST THAT KILLS THE THING IT IS MEASURING MEASURES NOTHING.** Two
whole rounds of "the read only fires 25 % of the time" were a corpse: the
harness was releasing a real charged swing next to him every iteration and
he was dead by the fourth. `heal()` keeps the PLAYER up and everybody knows
it; the same rule applies to whatever you are pointing at. Top his health up
in the loop, or the numbers are noise.

**ONE RULE FOR EVERY TAKEABLE ON THE GROUND.** A syringe is 14 cm and a CD
case is 12; on a dark beach at head height those are a few pixels and you
walk past them. Rather than a hand-tuned scale per item — which is how the
ring got a glint and the syringe did not — `addInteractable` gives anything
with kind `'inventory'` the same treatment: `makeNoticeable()` measures it
and lifts it until its longest side reaches `ITEM_MIN_SIZE` (0.42 m), then
adds the shine. It is a FLOOR, not a multiplier, so the shovel (0.81) and
the horseshoe crab (0.73) are left exactly as they were. Two things it has
to get right: the measurement SKIPS `hitProxy`, which is an invisible sphere
of at least 0.4 m — include it and everything measures the same and nothing
ever scales — and a scan that has not landed yet measures zero, so it retries
for a few seconds rather than blowing an empty group up to the cap.

**AND A COLLIDER MUST NOT REACH PAST THE CLAMP IT SHARES A WALL WITH.** The
sofa's discs were run out past the room's own outer clamp to close the
pocket behind it, and that is the same trap wearing the other hat: the
push-out shoves you to 5.24, the clamp pulls you back to 5.15, and the two
fight over you every frame. They stop a hand's breadth short of it.

**AND THE FLOOR OF A ROOM IS NOT THE SLAB IT WAS POURED ON.** The room read
as a black ring round a lit rug because the only thing under the furniture
was the same structural concrete as the outside. Terrazzo — a pale ground
with big chips in it — is what a dim room needs: something that catches
what light there is. A round rug in a round room with a hole in the middle
of it is a SECTOR of a ring, not a disc; a disc big enough to matter lay
straight over the open well you climb up through.

**MEASURING ANY OF THIS NEEDS `heal()` EVERY FRAME.** A sample that lets the
player die schedules `location.reload()`, and the page comes back mid-loop
with everything reset — the run reads as seven swings a minute and the
distances read as six hundred metres, and neither number means anything.

**A footprint is ONE depression with a shadow INSIDE it.** Built off a
photograph of a bare print in wet sand: the whole sole is a single shallow
floor with a continuous edge, the shadow lies inside along the wall that
faces away from the moon (the floor is darkened under a clip and the
darkening lifted off with `destination-out` through the same shape shifted
toward the light, which leaves a band on the far side), a faint lip sits
outside the lit edge only, and the toes are small deep pits. Two wrong
versions preceded it: pale rings round every part (a cartoon) and then rings
so faint the print was nothing at all. The wall shadow is what sells depth.

**THE JARS ARE COUNTED, AND THE MILLILITRES MOVED ONTO THE GLASS.** The
corner of the screen read "120 mL" out of a tank that filled up; what you
actually carry is JARS, so it counts them ("1 jar", "5 jars", the unit its
own span so the singular is right). `bloodAmount`, `BLOOD_PER_CRAB` and
`BLOOD_JAR_CAP` are gone and `gainJar(n)` is the one door — the tally, the
icon, the pulse and the sound in one place, so a jar handed over by an
extraction and a jar lifted out of a hole cannot drift apart. 120 mL is a
fact about one crab and it is PRINTED ON THE LABEL now, where a number that
never changes belongs. The first dig mound gives up a jar instead of the
ring (`dropJar`), and the ring comes off the knight.

**AND THE JAR ITSELF WAS A SHAPE, NOT A BOTTLE.** What makes a prop read as
old is the record of how it was MADE and what has HAPPENED to it since, and
the first build had neither: one clean lathe, a cap turned on the same
lathe, and a label that was four black boxes. It now carries the two MOULD
SEAMS it was blown in, a heel ring it stands on, a crimped foil cap whose
segments are pushed in and out so the highlight breaks up round it (a lathe
is a perfect surface of revolution, which is exactly what foil pressed down
by hand is not), a run of dried haemolymph from under the seal, sediment,
bubbles clinging up one side, and a drawn label — foxed, ink run, a ring
where something wet stood on it, a batch number in a different hand, and
torn away at both ends through an alpha map, because a label peels from its
ends first. Two things measured on screen: **the meniscus is a RING, not a
lid** (at full opacity the little dome on top of the blood is a flat pale
disc the width of the jar and it reads as milk), and **a mould seam may not
run under the label** — both the geometry and the label arc are in three's
(sin, cos) convention where theta 0 is +Z, so seams at 0 and PI put one of
them straight down the middle of the printing.

**AND THE OCTOPUS RING HAD NEVER ACTUALLY BEEN SEEN.** Its level was set
years of passes ago on a surface that was two per cent of a scan rendering
as speckle — near-white base, orange rust map, orange emissive over the
top. With the whole 45,000-triangle octopus finally on the screen it
measured (168, 114, 65) under the examine lamps: bright orange batter, not
metal out of the sea. At (85, 59, 36) it is corroded bronze with the rust
still reading in the pits, and the pits are the whole point of decimating
rather than chunking. The tiling was already right (`uTri` 0.062 on a
31-unit span is 1.9 repeats round it) — **check the level before the
tiling, and check both only once there is something to look at.**

**AND THE RING SAYS WHAT IT DOES.** `desc` on an item is drawn under its
name on the examine screen and in the pack's detail pane; the octopus ring
reads "10% Stamina Increase" and, worn, that is exactly what it does —
`stamMax()` is a forward hook filled in beside `ringItem`, the regen, the
breath and the bar all read it, and the STRIP ITSELF grows by the tenth
(150 px to 165) rather than drawing a bigger reserve inside the same width,
which would be a ring that changes a number you cannot see.

**A STACK IS ONE ITEM WITH A COUNT, AND `iconHTML` IS WHERE IT SHOWS.** The
one object in this game you collect more than one of was the one object you
could not find in your own pack: a jar was a model at the end of an
extraction and a number in the corner, and `jarItem` was literally `null`.
It is an item now, and because it is the SAME item object every time,
`count` is the whole of stacking — `addToInventory` has refused a duplicate
by identity since the day a ring appeared twice, so a second jar lands on
the first instead of taking a slot. The badge goes on `iconHTML`, which is
the one door the hotbar, the pack grid and the ring row all draw through, so
all three show it by construction. `gainJar` writes the count BEFORE the
add, because the render reads it.

**AND THE CORNER NAMES WHAT IT COUNTS, IN THE GAME'S OWN HAND.** It read a
monospace number and a small dim "jars" — a different voice from every other
piece of text on the screen, and the thing it counted was never named. "1
BLOOD JAR" in the prompt's Georgia, letter-spaced, uppercase and white.

**AND A RING IN YOUR HAND GOES ON YOUR HAND.** Putting one on was only ever
reachable from the examine screen, on the argument that that is where you
can see what you are wearing — true, and it also meant the gesture everybody
tries first, holding the thing up and pressing the button, did nothing.
`canWearHeld` is the shell's own `onListen` door and is asked of the ITEM,
so the next ring inherits it. The pack shows the ring slots too, drawn by
the same `renderRings` into both hosts so they cannot drift.

**A COUNT BESIDE A PICTURE OF A JAR DOES NOT NEED THE WORD "JAR".** The
corner reads "2x" in the blood's own blue — the icon says what it is, and a
label naming its own drawing is the caption on a photograph of a caption.

**THE DOOR IS CUT TO THE ARCH, AND THE ARCH IS MEASURED.** "Make this line up
perfectly with the stone arch, don't add any stone yourself" is one job, and
the reason the first door needed a surround of its own is that it was built to
numbers somebody typed: 2.62 m wide, springing at 2.20, radius 1.31, against an
opening that is actually **3.84 m wide, 4.05 m to the crown**. Three quarters of
the width, off-centre by half a metre, and a ring of invented voussoirs round
it to hide the difference.

Nothing about it is written down now. Rays go at the wall from a hand in front
of its moulding: the recess behind the arch is at x = -20.40, the wall's face at
-20.11 and the moulding at -19.82, so a hit past -20.31 is INSIDE the opening
and anything nearer is outside it, and bisection between the two gives the
jambs and then the head over every plank's own middle. The leaves are built to
that profile and to nothing else, set a finger back into the reveal so the
model's arch frames them. **And a semicircle fitted through the crown and the
springing is not good enough**: this is a SketchUp polygon, and the circle
through its own crown (11.599) and half-width (1.919) stands up to five
centimetres proud of the real head all the way round — which is exactly the
sliver of daylight a shut door is judged by. Measure the profile, do not fit it.
The two meshes it cuts through are found once with a handful of rays and asked
directly after that, or the bisection is a hundred thousand bounding spheres.

**AND TWO JARS OF BLUE BLOOD AT THE END OF THE PASSAGE.** It runs six metres
back over the stall and stops at a blind wall, so there has never been anything
down there to have gone for. The far end is FOUND — the last station the walk
still has a floor at — and the jars are the beach's own `dropJar`, which now
takes a height, so the count in the corner and the stack in the pack cannot get
out of step with what the first cache hands out.

**AND THE QUARREL IS A SIDE NOW, NOT A PAIRING.** `u.st.foe` made another
creature the thing every distance and aim is measured to, and with three in the
room it is re-read every frame: the pair both want Wong while he is alive, Wong
wants whichever of them is nearer, and the moment he goes down **neither of
them has a foe left** — which is `mutFoePos`'s own rule for turning on the
player. Nothing had to be written to make the last beat happen. A blow of YOURS
still takes its man out of the quarrel and gives him to you, and that is a flag
now (`st.mine`), because a room that re-reads its sides every frame would
otherwise hand him straight back.

**THE FORGOTTEN WEDDING RING, AND THE FIRST ENVIRONMENT MAP IN THIS GAME.**
Cécile Amstad's "Jewelery - Ring- Diamonds", at the back of the bore between
the two jars, worn for six per cent of your pace per jar of blood you carry.

- **READ THE LICENCE, NOT THE FOLDER NEXT TO IT.** Every other model here is
  CC-BY; this one is Sketchfab Standard, and the credit was written wrong
  before the `license.txt` was opened.
- **AND READ EVERY MAP BEFORE DECIDING WHAT THE MODEL NEEDS.** Measured: all
  five of its baseColour maps are PURE WHITE and all four normal maps are
  FLAT — sixteen 4096s, a quarter of a gigabyte, of which the only content is
  five metallic-roughness maps and two emissives on the stones. They are all
  kept anyway (2.00 MB at 2048/1024, an rms of 0.9 of 255 against the
  originals): the white and the flat cost 130 KB, which is less than the
  argument about whether they are the artist's textures.
- **METALNESS IS A TRAP — the seventh time, and the first time the answer is
  not to change the metal.** Every material here is metalness 1, which is what
  a ring IS, and a metal has no diffuse term: shipped as authored the band
  rendered as a black hoop with two pale bands where the view model's own
  directionals strike. What a jewellery viewer shows it against is an
  ENVIRONMENT. `ringEnv()` is 128 by 64 pixels of this beach's night — sky,
  ground and the moon where `MOON_DIR` says it is — through three's PMREM, set
  on this ring's materials and nothing else, so the model and its maps are
  still exactly the ones in the file. `envMapIntensity` was swept: 1.6 is
  still a dark hoop, 4.2 reads as metal face-on.
- **AND `ITEM_MAX_BOOST` IS 3.2, SO THE FITTED SIZE IS THE SIZE.**
  `ITEM_MIN_SIZE` (0.42) is a floor every takeable gets, and it cannot reach a
  true-size ring from 21 mm — measured in the bore, that is two pixels at two
  metres and the glint is the only thing you could ever find. Fitted at the
  octopus ring's own 0.055 it comes out at 0.195 on the floor, which is what a
  takeable looks like here.
- **AND `makeNoticeable` GIVES UP AFTER SIX TRIES.** It measures the group and
  retries for 5.4 s, so a 2 MB model that lands after the cut into the room is
  a ring left at true size for the rest of that game — a race between a
  download and a doorway. `dropWedRing` waits for the model instead.
- **AND THE PACE YOU WALK AT HAS A DOOR NOW.** `speedK`, beside `stamMax`: the
  one place the player's speed is worked out multiplies by it, so an item can
  change it. Measured on open sand, 100 ticks to terminal speed then 60 more:
  4.76 m/s with no ring and 4.76 with four jars and no ring, 5.90 wearing it —
  +24.0 %, which is four times six.

**THE JARS ARE A NUMBER, NOT A THING YOU CARRY.** They had a stacking slot in
the pack with a badge on it, and the owner's word is the corner and nowhere
else — which is right: a jar is not held, equipped or used, and two places
showing the same tally is one of them lying the first time they disagree.
`gainJar` no longer adds it, and a save from before this is cleaned up on the
way through.

**THE SKULL KEY, AND THE FIRST DOOR IN THIS GAME THAT IS REALLY SHUT.**
VISHNUGAMER's "Skull Key" (Sketchfab Standard — read the licence, not the
folder beside it) lies between the candles on a plinth in the catacombs' lower
vault, and the barred door out of them is locked until you have it. Shipped
EXACT by the owner's word: all three meshes, 256,688 triangles, its own
colour, metal-rough and normal maps at 2048/1024 — 8.7 MB, at the back of
`ASSET_REACH` with the room it lies in. Its three `Object_N` are the
65,532-vertex chunks a 16-bit index split and not an LOD chain, so they ship
together (the octopus ring's lesson); and **METALNESS IS A TRAP for the
eighth time** — it ships metallic, a metal has no diffuse term, and the answer
is `ringEnv()` again rather than touching the metal.

- **A KEY OPENS A DOOR FROM THE PACK.** The owner's word, and the wreck's
  shell door has done it since it went in (`inventory.includes(boatKeyItem)`);
  the catacombs' door is written the same way. It is never in your hand, and
  it is not eaten — the wreck's door swallows its key, and a skull is worth
  keeping. `catDoorOpen` is on the save, like `holdDoor` and `dojoWon`.
- **AND A LOCKED DOOR SAYS SO WITH NO VERB.** `bare` while it is locked, so
  the prompt reads "The door is locked." and carries no E — the prompt is the
  thing that sends you back down for the key. With the key in the pack it
  reads "Unlock the door" and turns once.
- **AND A STATION HAS A HEIGHT.** The candles are measured, not typed: the
  scan's own `Candle` mesh is one mesh per material, so a candle is a cluster
  of vertices (the skull piles' trick), and `CAT_KEY` is only a spot to look
  round. The first pass windowed that in PLAN alone and caught two candles
  from a room two storeys up — the middle came out a quarter of a metre off
  the ring and the key lay on the plinth's edge. The window is a box now.
  Two buckets a finger apart are also ONE candle, or the fragment weights the
  middle toward whichever it belongs to.
- **AND IT LIES ALONG THE GAP THEY LEAVE.** A 0.42 m key laid on the room's
  square crosses two of a ring of four; the bearing is swept for the line
  whose BOTH ENDS are furthest from any candle, which here is the diagonal —
  107 and 108 degrees of clear air against 68 and 77 the other way.
- Measured after: the key lies at the centre of the ring; the door reads
  locked and bare without it, "Unlock the door" with it in the PACK and
  nothing in hand, and opens onto the sand at (12.6, -800).

**THE RUDE TRADER, AND THE FIRST THING THE JARS EVER BOUGHT.** EZ-GAZI's
"BOUNTY HUNTER" (CC-BY-4.0) stands at the foot of the sand wall a little
short of the stones, arms crossed, looking out at the water. E, and he says
"Just buy something..."; what he has is one glowstick and two bottles of
water, and what he wants is the thing you have been filling jars with all
night. He is not a `MUT_KINDS` entry and has no fight in him — a model, a
hit proxy and a script, the snorkeler's own arrangement.

- **A SHOP IS A DIALOGUE NODE WITH A GETTER ON ITS TEXT.** Every answer he
  has — sold, sold out, you cannot afford it, you already have one — is the
  same node; what he says is decided by the SALE and not by which line you
  pressed (`traderSaid`). Choices are re-read every time a node is shown, so
  looping back to it is the whole of "buy something else".
- **AND THE SAME THING CANNOT BE HAD TWICE.** `addToInventory` refuses an
  item already in the pack by identity, so a sale that did not ask would
  take the jars and hand over nothing. The water is the interesting case: a
  bottle you have DRUNK is gone from the pack and can be sold again, and a
  bottle you still carry is refilled instead (`refillBottle`), which is the
  same jar for the same water and needs no second item.
- **AND SPENDING GOES OUT BY ITS OWN DOOR.** `gainJar` pulses the corner and
  plays the sound of a jar ARRIVING; `spendJars` is the other direction.
- **HIS ARMS ARE THE ONLY THING HERE THAT WAS LOOKED AT RATHER THAN
  MEASURED**, and even they were solved rather than typed: the rig's own
  axes were found by ROTATING each one and reading where the hand went
  (`upper_arm` local -Z brings the arm down and in; local X swings it
  forward), and then a coordinate descent put each hand on a target across
  the chest with the elbow held out. **The forearm is 0.22 m**, so a hand
  can never reach the opposite elbow: the best this rig can do is the
  gauntlets meeting at the centre line, which is what crossed arms look
  like anyway. Weighting the elbow too little collapses it onto the chest
  and reads as a man hugging himself — that is the one number that matters.

**AND A LONG THING LIES ON THE DIAGONAL.** Fitting the longest side to 0.80
of the tile is right for a crab and absurd for a katana: seventeen pixels of
blade down the middle with the whole tile empty either side, using a tenth of
it. A tile's diagonal is 1.41 times its side and it is the only free size
there is. The silhouette's own long axis comes out of the same second moments,
and anything over `ICON_ROLL_AR` (2.6) is rolled onto the diagonal and fitted
again — the two shovels, the katana, the bottle, the glowstick, both keys, the
skull key and the syringe; the CD, the crab, the rings, the head and the
revolver read as they are and are left alone. **AND THE ROLL HAS TO BE THE
OUTERMOST TURN**: at three's default XYZ Euler order the z is applied to the
object FIRST, under the pitch and the yaw, which is a turn about an axis
pointing wherever the model happens to point — measured, every rolled icon
came out 10 to 25 degrees off the diagonal it was aimed at. `'ZXY'`, and with
z = 0 the two orders are the same rotation, so nothing unrolled moved. After:
every rolled item lands at -43 to -48 degrees.

**AND THE CACHE MADE THE REPAIR A NO-OP.** "The item icons keep changing to
look awful after a checkpoint" is the drawn fallback becoming permanent, and
the retry that exists to fix it had been dead since it was written:
`renderHotbar` keeps a per-slot cache and rebuilt a slot only when the ITEM or
the COUNT changed — and when a scan lands, neither does. Only the `src` does.
The cache key reads it now, and the retry walks `rings` as well as the pack,
because a worn ring is the one item on the HUD that is in neither list the old
loop looked at. Measured end to end: a model taken away and put back goes
drawn → RENDER inside the 600 ms timer, with no reload and the pack shut.

**AND A RING DROPPED ON A RING SLOT GOES ON.** The pack's drag only ever
looked for an `.islot`, so a drop on the ring row found nothing and was a
silent no-op — the one gesture everybody tries. `ringSlotFromPoint` reads
`.rslot` in either host (`#pack-rings` and the HUD's `#rings`), the slots light
up as `.wearable` while a ring is in hand, and `wearRingAt(item, i)` is
`wearRing` with a slot: an occupied one SWAPS, putting the worn ring back in
the pack. Measured: 3 px of movement still selects rather than dragging (the
6 px threshold holds), both rings go on, a swap returns the old one, and a
syringe dropped on a ring slot does nothing and loses nothing.

**THE SHELF IS BACK, AND IT IS THE WAY UP TO THE RING.** The owner's word, the
fourth time this one has been asked for or taken away — and this time with a
reason in it: the wedding ring lies at the back of the tavern's bore, and the
only way onto that landing is the 2.12 m step at the back of the gallery,
which nothing can jump. Uncommenting `buildTavShelf()` is the whole change;
the function measures its own wall and its own two floors, so it needed
nothing else. Measured with the game's own movement, holding W and jumping:
**5.30 (the gallery) → 6.36 (the shelf) → 7.42 (the landing)**, two jumps of
1.06 against a 1.34 ceiling, and the walk carries on down the bore to the
ring at z = -23.59.

**AND THE CATACOMBS' JARS WERE SCORED ON THE WRONG THING.** "I never ran into
the two blood jars that should be in the halls of the catacombs." They were
there, on the main component, takeable — and the score was `dL`, the distance
from the LANDING, sorted DESCENDING, so what got chosen was the two furthest
corners of the complex. Measured: **44.4 m and 39.7 m from where you come
down, and 47.5 m and 39.7 m from the route you actually walk.** "A passage
you did not have to go down" had become a passage nobody would ever go down.

- **THE WALK IS THE THING TO SCORE AGAINST, AND THE ROOM CAN ANSWER IT.**
  The graph is asked for the way from the landing to the key and from the key
  to the door — every step the game requires of you, 53 legs — and a
  candidate has to be off that line but only a few strides off it (4 to 13 m,
  best near eight and a half). Nothing is typed.
- **AND EACH END OF A LEG IS A NODE, CHOSEN ON HEIGHT AS WELL AS PLAN.**
  Nearest-in-plan alone put the door's end of the walk on the node directly
  UNDER it — the door is nine and a half metres up and the ground floor runs
  beneath it — so the route came back along the bottom and never climbed at
  all (measured: it ended at f 0.7 against the door's 9.53).
- **AND A JAR YOU CANNOT GLIMPSE IS A JAR YOU DO NOT FIND.** Distance alone
  is not enough: the first build of this put one eight and a half metres off
  the walk with no waypoint anywhere on its own storey that could see it — it
  was eight metres away through a wall. A candidate is only one if some point
  of the walk, on its storey, can actually look at it.
- **AND `keepHitsWall` IS A WALKING TEST, NOT A SEEING TEST.** It indexes
  only STEEP faces over `KEEP_WALL_MIN` tall — what a body is stopped by — so
  an arch, a vault's curve, a low sill and the shoulder of a pier are all
  invisible to it. Measured: it called a spot clear from 7.7 m and a real ray
  at the drawn room met stone at 2.76. It stays as the cheap pre-filter,
  because it is generous in the safe direction and the alternative is fifteen
  thousand rays at ninety thousand triangles; the two that are actually
  CHOSEN are then confirmed with a handful of real ones, trying the nearest
  six sight lines before giving the candidate up.
- **AND THE ROOM'S GEOMETRY IS NOT ALL UNDER `catWorld`.** The two walls that
  hid the second jar were `CatacombWall.005` meshes hanging off a group of
  the SCENE, so the confirming ray went straight through them and the
  placement called a blind corner "in sight" a second time. Ask the scene;
  the ray is short and every bounding sphere elsewhere rejects it at once.
  And do not filter on `visible` — the room is still hidden when this runs.
- **AND THE TWO ARE ON DIFFERENT STRETCHES OF THE WALK**, at least a quarter
  of the route apart, so one is passed on the way to the key and the other on
  the way up to the door. Well apart in the ROOM is not enough: two jars
  either side of the same corridor are one find.
- And it SAYS SO when it fails. Three silent returns, one of which quietly
  shipped a single jar, are exactly the class of bug `mutPlay`'s warning
  exists for.

Measured after: **7.0 m and 5.9 m off the walk (was 47.5 and 39.7), in clear
sight from 5.4 m and 6.8 m, 31.7 m apart, at legs 5 and 39 of 53** — and
rendered from those sight lines both read as a blue glow at the end of a dark
passage (peak blue 179 and 165 against 23 for the one that was hidden).

**A LAMP ON A THING YOU PICKED UP WENT ON LIGHTING THE FLOOR IT CAME OFF.**
"When picking up the jars the item aura should disappear — it was still bright
where they last were." The GLINT was innocent: it is a child of the jar, so
`scene.remove` takes it, and `updateShines` zeroes it besides (measured at
pickup: opacity 0). What was left was the catacombs jars' own POINT LAMP —
the one the round before gave them because a takeable's stock shine is tuned
for a beach under a quarter moon and that stone reads at 0.03.

`lampReach` walked the parents asking whether every ancestor was VISIBLE and
never whether the chain still ends at the scene at all — and `scene.remove`
neither hides what it detaches nor touches its `matrixWorld`. So the lamp kept
its 1.5, kept a world matrix frozen at the spot it was lifted from, and the
pool went on pointing a real light at that patch of flags for the rest of the
game. Measured at the moment of the pickup: the jar out of the scene, the
glint at opacity 0, the lamp still at intensity 1.5 at its old (9001.83,
400.66, 8985.96), and the old test — intensity and a visible chain — still
answering TRUE. **The same loop answers it: the top of the chain has to BE the
scene.** Measured after, both jars: one pool slot lit at 1.5 on the jar before,
nothing lit at all after; and the corridor photographed before and after is a
jar under a blue pool, then bare stone.

And the thing worth keeping is the shape of it, not the line. The SKULL KEY
carries a lamp too and had been given a hand-written `skullLamp.removeFromParent()`
inside its own `onActivate` — so somebody had already met this bug, fixed it
where they met it, and left the next object to find it again. **One object
remembering to do a thing that every object needs is a bug waiting for the
second object.** Anything a takeable can carry — a light, a sound, an entry in
a per-frame list — has to be answered at the door all of them go through.

**THE SYRINGE WAS HELD WITH THE NEEDLE POINTING AT YOUR OWN FACE.** The view
model's frame is the camera's and this model's needle runs +Z, which is TOWARD
the lens: measured on the old pose, the needle's direction in view space was
(0.07, -0.22, 0.97) and the tip sat at NDC (0.84, -1.15), off the bottom of the
frame — so what was actually on the screen was the plunger and nothing else.
The pose is SOLVED, the way the katana's carry is: the tip and the back of the
barrel projected to NDC and driven onto a target, with the needle's own view
direction held away from the lens and the flange's ears held level. After: tip
(0.28, -0.10), the back of the plunger (0.88, -0.73), needle direction
(-0.23, 0.48, -0.85) — it lies across the lower right with the point up into
the frame, which is a hand about to use it.

**AND WATER BOTTLES STACK.** `addToInventory` refuses an item already in the
pack by identity — which is what stops a shell appearing twice — so the second
bottle you found was worth nothing at all: the pickup played, the thing left
the bar, and you got a slot you already had. It is the crab's own door.
`count` is the whole of stacking, `iconHTML` has drawn the badge in the
hotbar, the pack and the ring row since the jars needed one, and ONE DRINK
SPENDS ONE BOTTLE — so what the number means is how many drinks you are
carrying, which is the only thing about water anybody wants to know. The
empty still goes; what is left in your hand is the next one, full. Measured:
three in one slot with a "3" badge, three drinks, and the slot goes on the
third. Every place that hands one over goes through `gainWater` — the drain's
bottle, the bar's, and the trader, **who sells you another now rather than
refusing you while yours is full**, which was the only thing he could do when
the pack could hold exactly one.

**AND BRADLY HEARS WHICH ANSWER YOU GAVE, AND LOOKS AT WHAT YOU ARE
CARRYING.** Saying yes or no still lands you in the same place — he was never
really asking — but YES gets "Doubt it." and NO gets the look up and down,
and both arrive at the same last word. That last word now reads your pack:
carrying water he says "I see you got a water on you, that should come in
handy" instead of the sneer. A dialogue node's `text` may be a FUNCTION, the
way an interactable's `label` and `bare` already are, and for the same reason
— a line that depends on the world has to be asked at the moment it is put
up, not written down once at module time, and `waterBottleItem` is declared
two thousand lines below the script and would be in its dead zone there
whatever you did. He has been sneering at you about the water since the first
build; finding one answers him.

**THE GEM STONE RING, AND A LICENCE THAT WENT OUT OF THE TREE.** Delandi's
"Gold Ancient Ring Green Gem Stone", CC-BY-4.0, in the jewellery box on the
credenza. It replaced a silver one that was CC-BY-**NC-ND** — no commercial
use, no distributed modifications — and that model is DELETED rather than
left in the tree: an asset a commercial release cannot include is a problem
waiting for the day somebody ships, and there is no reason to carry one when
a permissive model does the same job. `tools/gltf_to_glb.py` was written for
that one (an exact byte-for-byte container swap, which is all a
no-derivatives licence permits) and is kept, because it is the right tool
whenever "exact replica" is the brief.

This one is packed, because it can be and because it has to be: a 1,371
vertex game-ready mesh under **forty-three megabytes of 4K maps**, which is
twice the whole bunker for a thing you hold in your hand. `gltfpack.py` at
2048 takes it to 7 MB. **AND ONLY ONE OF ITS TWO BLEND MATERIALS MEANT IT**:
both ship `alphaMode: BLEND`, the stone's map carries a true 0-255 alpha and
is meant to be seen into, and the gold's has no alpha channel at all — a
blended opaque surface that sorts against itself and against the box it lies
in for nothing.

- **METALNESS IS A TRAP, the tenth time, and the third where the answer is
  not to touch the metal.** It is silver with a real metallic-roughness map,
  and a metal has no diffuse term — without an environment it draws as a
  black hoop with two pale bands where the view model's lights strike.
  `ringEnv()` was already built for the other ring.
- **AND A THING THAT IS ALREADY SOMEWHERE IS ALREADY THE RIGHT SIZE.**
  `makeNoticeable` blows any takeable up to `ITEM_MIN_SIZE`, which exists
  because a 14 cm syringe on a kilometre of dark beach is a few pixels — and
  in a jewellery box it made a ring the size of the box's own lining.
  `keepSize` skips the boost and keeps the glint: the half that says "this is
  a thing" rather than the half that says "you would never otherwise see it".
  Measured in the box: 6.2 cm across, in a 31 by 21 cm lining.
- **AND NEGATION IS A POOL, BECAUSE HEALTH IS AN INTEGER.** Seven per cent of
  a one-point blow is seven hundredths of nothing; rounded it is either the
  whole blow or none of it and both are lies. The fraction is BANKED, and
  when the bank holds a whole point that point comes off the next blow — so
  the moment it pays is a blow that visibly does not hurt you. Measured over
  two hundred blows: **186 points taken wearing it against 200 without,
  exactly 7.0 %.**

**A PICKUP'S SAVE ID IS WHERE IT STANDS, NOT WHEN IT REGISTERED.** It was
`label#n`, n the registration order — and three rings are "Take the ring",
three bottles "Take the bottle of water", two keys "Take the key", every jar
"Take the jar", most registered in LOADER CALLBACKS whose order is the
network's. So "Take the ring#1" was the pavilion's gem ring when saved and
the tavern's wedding ring when loaded, and the restore handed the owner a
ring he had never been near and minted jars. `it.save` is `label@x,y,z` now,
read in a MICROTASK after `addInteractable` (half the call sites position the
thing after registering it), and the restore matches the nearest of that
label within 2 m, because the tavern's water stands by a score off where the
liquor fell — and the liquor's placement is SEEDED now (`mulberry32`) so
that score cannot wander. An old `label#n` is replayed only for a label no
other takeable wears (`PICKUP_SHARED`). Verified: every id identical across
two loads made in opposite orders. `tookLabel(label)` is the test for a
one-of-a-kind pickup whose world copy moves before it is taken.

**AND THE DROPS AND THE SPRAY ASK THE SAME FUNCTION.** Sixteen spray specks
dealt evenly round a landing circle is the very ring this pass exists to
remove, drawn in spray — so both are drawn from the spill instead, and the
sparkle and the splash are where the water is.

**AND WATER THAT ARRIVES SOMEWHERE THROWS SOMETHING UP.** Three sheets fell a
metre into stone and simply stopped. A ring of specks at each landing line,
thrown up on its own little parabola and drifting outward, is what says the
water is HITTING something — at the landing radius, which is the sheet's
bottom rim and not its lip, or the spray comes up inside the fall.

**AND THE POOL IS INVISIBLE, WHICH IS HALF OF WHY A RING IS ALL YOU SEE.**
Measured: the water covers 1.4 % of a close view and renders at a mean
luminance of **7.1** — the open beach's own 7.3 — inside a basin whose lit
stone rim reads **38.5**. A black hole with a bright ring round it is exactly
what the eye reports as "a weird ring". Raising the emissive was tried at
1.05 / 5.5 / 9 / 13 and is NOT the answer: it does not brighten water, it
brightens the CAUSTIC MAP, and by 9 the pool is a cyan neon web on black. What
was fixed is the thing that was actually wrong — the falls — and the pool's
own level is left where it is.

**AND THERE IS A JAR OF BLUE BLOOD UNDER THE TORII.** The gate is the one
part of that courtyard you walk THROUGH rather than into, so it is where a
thing worth finding belongs. Where it lies is FOUND, not typed: from the gate
island's own centre it walks the room's walk grid for cells with floor at the
gate's level and a body's room around them, and takes the one furthest from
the middle of the courtyard — the back of the gate house, behind the posts, by
construction.

**A KEY THAT HAS DONE ITS JOB IS GONE.** The owner's word, for every key: the
wreck's hold door already swallowed its own, and now the chest key goes into
the sea chest's lock and the skull key into the catacombs' door
(`removeFromInventory` on the unlock). Both unlocked states were already on
the save (`chest`, `catDoor`), so a restore cannot hand a spent key back with
the lock shut. The chest still opens and shuts as often as you like.

**MUTANT FANGS.** ex_natura's "Spinosaurus Tooth" (CC-BY-4.0,
`assets/fang.glb`, 6,000 triangles, then compacted — `--keep-uv` left 39k
vertices for 18k indices, most of them unreferenced). `maybeDropFang` on
every beach mutant (`mutant.glb` kinds only, never a boss or the young one),
from `finishMutant` and `mutBleedOut`: `FANG_CHANCE` 0.34. It is the ring's
drop — a small `PhysProp` knocked out of the jaw, landing with
`sfxFangSand` (the recorded sand hit pitched up and down, a thud, a sift of
grains) — and it stacks like the crabs: `fangItem.count`, `gainFang`, on the
save as `fangs`, never replayed because it was never on the beach. A drop
before the scan has landed waits in `fangWorlds` and is filled when it does.

**THE OLD RING, AND HEALTH THAT IS NOT ALWAYS FOUR.** Qifan Zhang's "An Old
Ring" (CC-BY-4.0, `assets/old-ring.glb`, exact: 19k triangles and all three
maps at 2048) is on the trader's table for four jars (`TRADER_STOCK.ring`)
and worn is Max Health +10%. `maxHp()` is the hook every part of the health
asks — the bar, the mend, the drink, the red rim, the harness's heal — the
`speedK`/`stamMax` arrangement, filled in by the ring's section. Health is
WHOLE BLOWS, so a tenth more is a sliver: the bar grows a fifth segment a
tenth as long (`#health i.xtra`, 4 px), every segment shows its own fill
through `--f`, and from full the ring is the difference between four blows
and five. Take it off and `updateHurt` takes back what it lent.

**FANGS ARE RARER, CAPPED AND FOUND.** `FANG_CHANCE` 0.26 and `FANG_MAX` 4
across the eight mutants (`fangDrops`, on the save so loading cannot reset
it). Each drop carries a strong glint that shows through what it lands
behind (added BEFORE `addInteractable`, since `addItemShine` refuses a
second one), the tooth is lifted pale, and a small cold lamp lights the sand
round it. **A pooled lamp only lights anything while the CAMERA is inside
its range** (`lampReach` returns 0 past `distance`) — at 4.2 m you had to be
standing on the fang to see its pool; at 14 the pool is there from across
the beach and the decay keeps the lit patch small.

**THE WAX SPLIFF.** woddson's joint (CC-BY-4.0, `assets/spliff.glb`): wide end
at -X, filter at +X, measured when it lands. It is in the THIRD cache
(`mounds[2]`), on the trader's table at a jar (`TRADER_STOCK.spliff`, six), and in
the crate on the keep's pier; it stacks (`gainSpliff`, the crab's door). Click or E
with one in your hand (`onSmoke`, the drink's door): a lighter at the wide end, one
hit, the breath out as world smoke, the butt flicked away still burning — two
seconds, on the DRINK'S machinery (`dk`, `SMOKE_AT`/`SMOKE_POSE`), with the joint
itself solved onto the lips by `spliffMouth` (the filter's end is put under the
lens and the lit end points out and down, whatever the arm is doing). The hit
sets `spliffBuffT` to 240 s: stamina recovers 1.4× (`SPLIFF_REGEN`, measured
0.17 → 0.23 of the bar a second) and `#stamina-fill.buff` goes green unless you
are below 28 % or exhausted. **Its state is declared beside `STAM_REGEN`**, not in
its own section: the frame loop reads it long before that section has run. The
ember, its halo and the lighter's flame are the MODEL'S children with
`bwKeepHidden`, and the halo is a sphere, not a sprite, because `holdable` strips
sprites off anything you hold. The butt is a gib (`half` given, a Group has no
geometry) with a coal that smoulders and threads smoke for twenty seconds. Smoke
is one `Points` batch in the WORLD scene with a torn puff texture turned per
particle: a smooth disc of grey reads as a ball whatever its alpha.

**THE SHOP IS A LIST AND ONE BUTTON, AND IT SELLS UPGRADES.** The checklist
(tick a line, then a separate CONFIRM) read as a filter and the owner found it
confusing. Three tabs — Buy, Upgrades, Sell — and every row carries its
picture, a one-line summary (`sum`) and a price chip, red when you cannot pay
it and dashed when it is owned or sold out. A click picks a line; the one
button under the big picture says what it costs ("Buy · 2 jars") or why not
("Need 3 more jars", "Owned"); double-click, E, Enter or Space buys. `shopState`
is the one place that decides all of it. The upgrades are `packSpace` (2 jars:
`INV_MAX` 10 → 14, and the grid goes seven wide so the rings row stays on a
1080 screen) and `ringSlot` (5 jars: `RING_SLOTS` 2 → 3). Both are `let` now,
saved as `invMax` / `ringSlots`, and restored BEFORE the pack is rebuilt — the
pack is put back at line ~34374, well above where the trader's stock is read,
so restoring them beside the stock left the extra four items nowhere to go.
An upgrade has no model: its picture is drawn (`drawUpgradeIcon`). The Grammy
photo sells for four jars.

**HE ONLY ASKS ABOUT WHAT YOU ARE CARRYING.** The Sell tab lists a row only
while its `count()` is over zero (`shopRows` filters `SELL_ROWS`), so an empty
pocket reads "Nothing he wants." and he says so. He buys the sand shovel for
two jars, and a Wax Spliff or a Bottle of water for one each — both stacks go
out one at a time through `sellFromStack`, and the slot goes with the last.

**THE TRIBE'S FIRE IS A PIT.** (SUPERSEDED: no stones and no spit now — see the end of this file.) Nine branches thrown in at random angles read
as noise; it is a ring of stones set shoulder to shoulder (one kicked out), a
teepee of poles leaned in to a point with one burnt through and fallen in, two
split lengths in the bed, a woodpile stacked beside it clear of the flames, a
poker on the ring, a spit whose bar actually rests in its two forks with a
roasting haunch on it, and the bones in one heap. The flames stand in the
middle of the teepee.

**HE IS HEARD ONLY IN HIS ROOM, AND ONLY CLOSE (`benHearing`).** The breath
was a distance across the plan, and the landing is ten metres from him in plan
and EIGHT AND A HALF METRES ABOVE HIM, so the owner heard him on arriving. It
is gated on being within 2.1 m of his height, on no drawn wall between you
(walked in one-metre legs, because `keepHitsWall` only asks the faces round
each end of the line it is given), and falls from full at 1.2 m to nothing at
6.5 (`BEN_BR_FAR`): measured 0.26 at 1.8 m, 0.11 at 3.5, 0.015 at 5.5, 0 at
the landing. Asked four times a second.

**AND THE HEAP RUNS IN UNDER THE CHIN.** The ring in front of the chin started
0.35 m inside the chin's own radius, which left a disc of bare beach under the
snout, and the jaw's tip stands 0.8-1.7 m over it. The ring now reaches nearly
to its centre and its inner part rises to about 1.5 m (buried in the body
wherever the body is lower), so the tip of the mound is shoved up under the
jaw. The walk grid keeps the heap's own height (`walkY`), so you cannot climb
up under the head. A version that followed the whale's own underside (a height
map off its vertices, 3x3 neighbourhood) was built and reverted: the
neighbourhood picked up the jaw's height in front of and beside the snout and
stood a two-metre WALL of sand across the whole head.

**Round C, smaller:** the first crab to wake shows the fight controls
(`#fighttip`, `startFightTip`, the parry line lit through the crab's own
wind-up; `fightTipDone` on the save); a click skips the extraction
(`skipExtraction`); `clickInspect` items (the CD, the fang, the photo) examine
on a click (`inspectHeld`); the pack has Drop (`dropItem`, one from a stack at
a time — the pickup adds it back to the stack); the trader buys any ring for
3 jars (`SELL_ROWS` ring rows); the wedding ring's text says when 6 jars is
the most it gives; thrown props raycast the dock's meshes each frame
(`dockThrowHit`, inside `dockHitBox`); the tavern's steps ask the floor face
under you (`tavFloorMat`: `TAV_WOOD`, `TAV_CLOTH`, else stone); the pavilion's
well rail and handrail stop at `MUSH.GAP` (0.85) either side of the stair's
head and the table lantern is off; the octopus ring is worn gold
(`makeWornGold`, a per-vertex cavity from a Blob Web Worker — `ringCavity` —
because on 400k triangles it froze the page for two seconds);
Ben's wounds are a cloth soaked and dried in bands with a height bump from
`dFdx/dFdy` of the wound height (no normal map needed); the knight's shuffle
only starts with 0.62 s of cooldown left and a restless kind only strafes
when it is actually moving sideways (the "wiggle"); the catacombs monster is
115 health, faster, meaner, with a heartbeat and a dark vignette while he is
hunting you within 25 m (`updateCatDread`, `#dread`).

**THE OCTOPUS RING'S DROP HAS A STING**: the owner's recording
(`assets/octopus-ring-drop.m4a`, the `ringDrop` bank), played in `dropRing`.

**THE SNORKELER'S LOST KEY, AND THE PAVILION'S GATE IS LOCKED WITHOUT IT.**
Give him the CD ("Wait.. where did you... I lost this over a week ago! Thank
you."), answer either "You're welcome" or "No reward?", and he says "Heres a
key I found up the beach, gotta fit somewhere." When the dialogue closes
(`snorkKey.pending` → `updateSnorkKey`) he comes up (`snorkWant`), winds up
0.7 s and throws it on a 4 m arc onto the sand by his towel (`LOST_KEY_AT`),
where it lies with a glint: "Take the Lost key" (`lostKeyItem`, `id
'lostKey'`, a paler clone of `keyModel`). Then he goes under and back to
laughing and splashing — `updateSnorkLaugh`'s `idle` is "not met yet, or the
key has been thrown". The pavilion's gate reads "The gate is locked." (bare)
without the key and "Unlock the gate" with it; unlocking eats the key
(`removeInventoryKey`), turns the lock (`sfxKeyTurn`) and swings it open
(`mushGateUnlocked`). A shut gate rattles (`sfxGateRattle`). On the save:
`lostKey` (0 not given, 1 on the sand, 2 taken) and `mushGate`; a save from
before this that is already past the pavilion is treated as unlocked.
Measured end to end in the pane: CD taken, the key's arc 1.25 s landing at
(10.1, -273.2), taken, the gate unlocked and open with the key gone.

**A KEY THAT HAS DONE ITS JOB SAYS SO (`keyUsed(item)`).** All four locks —
the pavilion gate (Lost key), the sea chest (Chest Key), the wreck's shell
door (Wheelhouse key) and the catacombs' door (Skull Key) — call it: "<NAME>
USED" in white Georgia capitals in the middle of the screen (`#keyused`,
z-index 60 so it shows over a cut) and `sfxLockOpen`, a mechanism in order:
the key sliding in over the pins, three pins setting, the cam grinding round,
and the BOLT at 0.64 s — a weighted clunk with a sub, inharmonic iron partials
and the owner's `blockMil` pitched down under it. Every lock then waits for
the bolt before it moves (gate 0.9 s, chest and door 0.85, the catacombs'
exit 0.9), with a busy flag so a second press cannot double it.

**THE LOST KEY'S THROW IS A CUTSCENE (`keyCut`, `updateKeyCut`).** The pack's
rule: the camera is TURNED, never moved, and `keyCut` is in `frozen()` and
the pointer-lock guard. Onto the snorkeler as he comes up (the lens drawn in
to 52: he is twenty metres out), along the arc with a twinkling glint on the
key (`snorkKey.flyGlint`), then 1.8 s on the key lying on the sand at a lens
of 34 before it hands you back looking at it. It plays in dev mode too: it is
how you find out where the key went.

**THE OCTOPUS RING IS 15 % STAMINA RECOVERY** (`stamRegenK`, beside
`stamMax`), no longer a tenth more bar.

**THE OCTOPUS RING IS BOTH: +10 % max stamina and +15 % recovery** (`stamMax`
and `stamRegenK`).

**THE WEDDING RING GOES TO EIGHT JARS** (`WED_MAX_JARS`), 32 % at the most.

**PRICES:** the .44 is six jars, the bigger pack four, the extra ring slot six
(`TRADER_PRICE`).

**AND A BOTTLE THE BRAWL KNOCKED FLYING IS NOT YOUR THROW.** `tavThrownHits`
counted any breakable moving over 3.2 m/s near a man as a blow of yours, which
made him "yours": he dropped his quarrel and came for you for something you
never did. It asks `p.thrown` now.

**A PICKED-UP BOTTLE IS SPENT ON EVERY PATH (`spendBottle`).** It was only spent if the whole
1.45 s drink ran with the bottle still in hand; switching away half way left an empty in the
pack that then said EMPTY. Put away mid-drink, finished, or an empty somehow left over: one door.

**THE KEY IS BITTEN.** Measured off the head scan: the mouth's seam is at
y -0.05, z 0.076 and the lips bulge to 0.10-0.11, so a key centred at z 0.108
stood on the lip surface and floated in front of the face. At (0.002, -0.052,
0.091) its middle is behind the lips and the bow and bit stand out past the
corners of the mouth; at 0.072 the ends came out through the cheeks.

**THE IMMOBILIZE HAS NO SEAL AND NO RINGS** (the owner's "circle thing"), and
the rest is quieter: the shells are a pale old gold at about half their old
strength, a smaller burst, a fainter gold flash, a lamp of 3, fewer motes.

**THE SPLIFF WEARS OFF ON THE WALL CLOCK.** `spliffBuffT` was counted down in
`update`, which returns early in a dozen states and scales by hitstop; it is
counted in `animateFrame` on `rawDt` now. While it works the bar AND its track
are a strong glowing green (`#stamina.buff`).

**THE OLD RING'S SEGMENT IS A WHOLE SEGMENT** (`#health i.xtra` was 22 px of a
46 px bar: half). Health segments are 60 x 12 and the stamina strip 300 x 11.


**A HORSESHOE CRAB IN YOUR HAND IS BLED WITH A CLICK (or E).** `crabItem.onDrain`
→ `drainHeldCrab()`, the drink's door in `attackAction`/`primaryAction`: with a
syringe in the pack it runs `startExtraction`; without one it says "You need a
syringe" (`sayInventoryFull(text)` takes a message now).

**THE PAVILION KEY (`pavKeyItem`, 2026-10-12).** Dropped where the man from the
well falls (1.7 s after `st.struck`, `wellKeyLie`), a cold-iron clone of
`keyModel` with a glint; "Take the Pavilion key". The pavilion gate takes it
or the Lost key (`gateKeyIn()`, his first). Saved as `wellKey` 0/1/2 +
`wellKeyAt`; a save with him dead and no `wellKey` lays it by the well. On a
restore the key scan may not be loaded yet — `wellKeyLie` retries the fill.
In `itemByName`'s list.

**THE SAND SHOVEL IS SEEN (2026-10-12: play testers missed it).** Its red
emissive 0x8a1a10 (a dark lump at night before), and its shine size 1.5,
strength 2.6, `through` (the faint sprite that shows through the castle's
sand).

**NOTHING THROWN GOES THROUGH ANYTHING (2026-10-12).** `PhysProp.step`
sub-steps the free move (steps ≤ 0.7 of the radius, max 24) and asks the
body's `wall` and `pushOutOfSolids` at each step; where a step is pushed
back the velocity reflects off the face and it is an impact at the arrival
speed (`_wallHit`) — glass shatters ON the wall. Every body has a wall now:
its room's, or `worldPropWall` (the drawn faces of FORT_SITE, C13_SITE,
ISLE_SITE, beach only). The island is in the `bunkerFloorAt` chain, so
anything thrown there lands on its rock and boards. Measured in the tavern:
17 bottles thrown at 16 m/s in every direction from the hall, 17 shattered
on the drawn stone, 0 crossed a face.

## 2026-10-13 — his photograph, taken

- `wellPhotoModel` (the frame on its strut, upright, foot at 0) is the
  pavilion table's copy (`wellPortrait`, a clone), the held one (`holdable`,
  scale 1.35, pos [0, −0.1, 0]) and the Inspect model. `bakeStatic` on the
  pavilion keeps `wellPortrait` out of the bake, or it could not be lifted.
- "Take the photograph" → `wellPhotoTaken` (saved as `wellPhoto`; a restore
  removes the table copy, `wellPhotoGone`), `addToInventory(wellPhotoItem)`.
  Its icon is drawn from the jpg once it loads. `packByName` lists it.
- Sold to the trader for 4 jars (`SELL_ROWS` `wellPhoto`, `traderSell`).

**A DROP OFF A BODY IS TOSSED UP AND LANDS ON TOP (2026-10-13; the owner:
"items drop by enemies should fly up in the air a little so they are visible
instantly upon death then fall on top of whatever is beneath them").**
`tossDrop(prop, up, side)` gives a drop's PhysProp a mostly-upward velocity
(3–3.8 m/s, a few tenths sideways) and `floorAt = corpseTopAt`, which is the
top of any ragdoll part under the point (for parts no more than 0.3 m above
it), so it comes down on the body rather than beside it and, as the body
settles, settles with it. Used by the fang, the knight's ring (`dropRing` with
`toss` 0), the horn (now 0.25 s after Umbra dies, not 1.4) and the well man's
key (0.25 s, not 1.7, and off his hips rather than beside them; it is now a
PhysProp too and `wellKey.x/z` follow it). The orc's photograph flutters UP
first (vy 2.4, falling at full gravity until it turns) and its floor also asks
`corpseTopAt`. **The portrait in the pavilion shines** like every takeable
(`addItemShine` before its interactable). **The fisherman's chart is out for
now**: `BEACH_MAP_ON = false` — `giveBeachMap` does nothing, his line drops the
chart, `packByName` skips it so an old save does not bring it back.

**AN ARTIFACT IS KEPT THROUGH A CHECKPOINT (2026-10-13; "i just lost my
flame").** The save carried `flameOn`/`artOn` correctly; what lost it was that
the flame comes out of a chest in a room with no checkpoint, so dying on the way
back loaded a save from before the chest. `stickArtifacts()` rewrites the
STORED checkpoint the moment an artifact is taken (chest, whale) or set or taken
out (`attachArtifact`/`detachArtifact`): set in a weapon that save's pack holds,
else in the pack (and a free slot), with `tavChest` / `whaleArt: 2` set. It is
refused during a restore or a replay.

**THE SPLIFF ENDS ON THE WALL CLOCK, AND THE SAVE CARRIES THE END (2026-10-13;
"the spliff should only last 4 minutes no matter what … i see it forever after
getting a checkpoint").** The countdown was already wall-clock, but the save
carried `spliffBuff` — the seconds LEFT — so every load gave back whatever was
left when the checkpoint was written, and dying near a save made it last for
ever. `spliffEndAt` (Date.now ms) is set when you inhale and is what the save
carries (`spliffEnd`); `spliffBuffT` is read off it every frame in
`animateFrame`, and a restore clamps it to at most four minutes from now. An
old save's `spliffBuff` is ignored.

**SMALL ONES (2026-10-13).** The portrait is "Homeowners Portrait" (`was`
keeps old saves finding it). The trader buys glowsticks at a jar each (`glow`
row, `sellFromStack`), and lists WORN rings with the carried ones — selling one
takes it off your finger (`rings.splice`). Fangs drop at 0.5 (was 0.26), up to
8 a game (was 4).

**A DROPPED THING LIES ON THE GROUND, NOT IN IT (2026-10-13).** `visBox(obj)`
is the world box of an object's DRAWN meshes (no hit proxy, no glint).
`dropItem` lays anything much taller than wide on its side (`YXZ`: a random yaw,
then over) and lifts it so its lowest point is on the drop point — models are
centred on themselves, so half of each was under the sand. A PhysProp that says
`fitRest` (every `tossDrop`, every ring) measures itself once it has stopped
and moves its `restH` so the mesh's lowest point is on the floor; it measures
again after it is moving fast.

## An empty blood jar loses its fluid by TAG, not by colour (2026-10-14)
`jarEmpty` used to pick out the blood, silt, froth and bubbles as "bluer than red ×1.25 and green ×1.05".
That test runs on `material.color`, which three keeps in LINEAR space, and the glass (0xcfe2e8) is
r .62 g .76 b .81 there: it passes. So every emptied jar lost its glass and became a label and a foil
cap floating in the air (the pavilion's scattered jars, the drained jar on the Dealer's bench). The
model now tags its fluid meshes `userData.jarFluid = true` (models/blood-jar.js, after `parts`) and
`jarEmpty` hides only those. Any colour test on a three material: remember it is linear.
