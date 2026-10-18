# The drainage tunnel home

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**The crosshair can thread a grille.** The back-wall outlet needs an
invisible `hitProxy` disc across the bore, or the centre ray passes between
the bars and straight down the open pipe.

**The peek never drops the pointer lock.** `pointerlockchange` treats any
exit it did not cause as "the user hit Esc" and opens the settings menu, and
`peeking` was not in its guard list — so E on the gate opened the menu on top
of the peek. `startPeek()` holds the lock (mouse look is gated by `frozen()`,
which includes peeking) and the guard names `peeking` too. Anything else that
freezes the player should do the same, or be added to that guard.

**The stuck gate — "Look inside".** That outlet is now the game's one set
piece of pure looking: `startPeek()` / `updatePeek()` / `endPeek()`, with the
eyes in `makeGateEyes()` / `updateGateEyes()` and the sound in
`startPeekAudio()`. Behind the bars is eight metres of ribbed pipe (built in
`models/drainage-tunnel-home.js`, capped by an `M.void` box so the sky dome —
which is centred on the player — doesn't show through the open end). Four
things carry it and none of them is a jump scare:

- **The lean is a camera move, not a player move.** `update()` starts by
  putting `camera.position` back on `_peekHome` while `peeking`, so every
  clamp below it — cliff, drain walls, floor — sees a position it agrees with;
  `updatePeek()` at the bottom of `update()` writes the leaned camera back for
  the render. Skip that and the clamps get a frame of a body half inside a
  wall and hand it back to you when you stand up. It also clears `_shakePrev`
  each frame, or the trauma shake leaves a stale offset behind on exit.
- **Where you stop is load-bearing.** At 0.4 m the FOV-24 crop threads clean
  between the middle two bars and you are simply *in* the pipe. 0.78 m keeps
  the grille in frame, and looking through something you cannot open is the
  whole point.
- **The eyes must not be there when you arrive.** They fade up 1.5 s after the
  lean settles and are gone 2.4–4 s later, between one frame and the next.
  They are a DRAWING — a pair of eyes in ink on white, knocked out to alpha by
  `tools/knockout.py` into `assets/eyes.png` and put on a plane, tinted down
  with `MeshBasicMaterial.color` so white paper reads as skin in a black
  drain. Two models were tried before it (a canvas pair, then a real eyeball
  glb) and both read as lights or as cartoons at that distance; ink does not.
  And they happen ONCE a game: `eyesSeen` is set the moment the fade passes
  0.35, and every later peek starts with `gone = true`. A second showing
  would make them a feature of the gate; the first made them a thing that
  happened to you.
- **`createMediaElementSource()` can only be called once per element.** The
  whisper graph is built on the first peek and kept; later peeks ramp the gain
  and call `play()` again. Rebuilding it stacks a second chain off the same
  source and the whispers get louder every time you look in.

The **erosion channel** outside can only ever sit *above* y = 0 — the beach
sand is a flat plane recentred on the player, so a trench cut below it would
just be covered over. The depth reads from the berms heaped either side, and
those are squashed icosahedra using **the beach's own `sandMat`** (passed in
via `makeDrainTunnel({ sandMat, wetSandMat })`) — boxes in a bespoke colour
read as pale slabs dropped on the sand, which is exactly what it looked like
first time round.

Ambience is synthesised in `startDrainAudio()` / `sfxDrip()` and ramped by
`drainMix` (how deep you are), which also ducks `waveBusGain` so the surf falls
away behind you; `mouthNear` drives a separate trickle layer at the outfall.
`updateDrainDrips()` drops visible droplets and fires `sfxDrip()` — panned by
where the drop is relative to your view — at the moment one lands. Note
`exponentialRampToValueAtTime` throws on a zero target, so the drip gain is
guarded: `drainMix` can reach 0 while a drop is still falling.

A full **bottle of water** (`models/water-bottle.js`) sits by the bed —
`waterBottleItem`, takeable with `E`, examinable like the crab. It is not
wired to `hp`; making it a consumable would just need `use` to call a heal.

**A HOLE THAT SITS ON THE GROUND IS A DRAIN.** The way in was a circle cut
into the TALUS with its bottom edge on the beach and a heap of spoil in
front of it, and the owner's word for it was horrible. It is a hole IN THE
WALL now — its floor most of a metre clear of the sand, its middle at eye
height, so you look straight into it from where you stand — and three things
make it a hole rather than a disc of black: the edge is RAGGED (three sine
terms on the angle, because sand does not break in a circle); the wall
darkens into it over the last THIRTY centimetres, which is the shadow a
recess throws on its own lip and is most of what says depth — at the half
metre it was first drawn at, the lip read as a blurred smudge on the dune;
and behind it is nothing at all, pure black, unfogged and unlit, in a box
wholly behind the face. The spoil heap is gone: it made a found thing into a
dug one.

**AND THE ONLY TRUSTWORTHY FORWARD ON A HUMANOID IS THE EYES.** A forward
built as `(rightJoint − leftJoint) × up` comes out BACKWARD on this rig and
disagrees with itself between the hips, the shoulders and the eyes — and the
clavicles are worse than useless, because their heads sit a few centimetres
apart at the sternum so the vector between them is mostly noise (it reported a
twist no neck could survive). What is unambiguous is the vector from the HEAD
bone to the midpoint of the two EYE bones, and the way to be sure is to put
the camera on that line and render: it comes back a face, every time. Measure
it on the pose READ OUT OF THE GLB, not in the game, or a bug in the game's
own posing is measured instead — which is exactly what happened here, twice.

**A PATTERN HAS TO BE TOLD HOW BIG IT IS.** Hung with the stock 0..1 uv, the
wallpaper's four bullseyes stretched over fifteen metres of wall and came
out as an orange smear — the drawing was there and none of it could be
seen. Every map in the room carries a `repeat` worked out from the real
size of the thing it is on. And the RETRO DOWNSCALE eats any pattern finer
than a hand's breadth, so the patterns are big on purpose.

**`__bw.step` HAS TO DRAIN HITSTOP.** It is `update()`, and `hitstop` is
counted down in `animate()` — so under the harness a killed crab or mutant
sat in its impact frames for ever, because the frame that finishes it is the
frame hitstop reaches zero. `step` now does what animate does: drain it, and
scale dt by 0.08 while it runs.

**THE KATANA BY THE DRAIN IS GONE.** It lay past the drainage tunnel home
from the day the sword went in; once the dojo's stand handed out the same
item there were two katanas and the first was free. Nothing is added to the
scene or registered there now; `katanaWorld` stays a group, dev mode still
hands the sword over, and an old save that recorded "Take the katana#1" finds
no handler and is granted the item by name.

**THE EYES IN THE DRAIN ARE GONE, AND WHAT COMES UP THE PIPE IS THE CRAWLER'S
OWN HEAD — THE MODEL, NOT A PICTURE OF IT.** They were a drawing of the
owner's, ink on white, knocked out to alpha into `assets/eyes.png`; that went,
and for one build what replaced it was a RENDER of the creature's head on a
plane, which went too. His word was the model, and he is right, in one word:
PARALLAX. A picture of a head hung down a pipe is a picture whatever you do
with it; a head is a thing at a DEPTH — lean on that grille and it turns,
catches its own brow and jaw against the light, and the maw moves behind the
face. The first sight you get of the thing you will meet seven hundred and
fifty metres and an hour from here is through a grille you cannot open, at a
level you could argue yourself out of.

- **IT IS THE HEAD ALONE, AND THAT IS ITS OWN ASSET.** `crawler.glb` is
  4.2 MB at the very back of `ASSET_REACH` because it belongs to a room most
  of a kilometre down the walk, and the drain is thirty-four metres BEHIND
  the spawn — fetching it, parsing it, building a rig and dressing a whole
  creature for a few seconds of a thing you are meant to barely see would be
  the most expensive object in the first minute of the game.
  `tools/crawler_head.py` cuts it at the neck, decimates what is left and
  ships the maps at 512: **768 KB, 4,403 vertices, one material, no rig**, at
  a reach of 40.
- **AND WHAT COUNTS AS THE HEAD IS THE RIG'S OWN ANSWER.** `DEF-spine.006`
  and its hundred and two descendants — every brow, lid, lip, nose, ear,
  temple and the jaw — are the head's bones, so a vertex belongs to the head
  when more than half its weight is on that set. Nothing is boxed or sliced;
  repack the creature and it still comes out at the neck. The eyes and the
  three jawfuls of teeth are their OWN meshes and are kept whole, which is
  the trap the render walked into first: six meshes name that bone group and
  the eye mesh has not one vertex weighted above a half to it.
- **AND THE MOUTH IS NOT OPEN — HIS LIPS ARE DRAWN BACK.** Three passes tried
  to close it. Two posed `DEF-jaw_master` and both swung the chin BACKWARD
  rather than up (measured: the head got five centimetres deeper and two
  shorter), because a bone's own axes are not the body's — this file has paid
  for that assumption before. The third turned the jaw's vertices about world
  X through the hinge and found there was nothing to turn: the lower teeth's
  biting edge sits at 1.617 against an upper-teeth floor of 1.612. The jaw is
  SHUT in the bind; what reads as a gape is the sculpt. (The measurement that
  settled it is the keeper: the thing that has to meet the upper teeth is the
  LOWER TEETH, not the highest point of the whole jaw — which is its hinge,
  up by the ears, and already well above them, so the first version measured
  the mouth as closed and turned nothing.)
- **AND NOTHING LIGHTS THAT PIPE, SO THERE IS NO LAMP ON HIM.** One was built
  — cold, close in and under his own chin, on the argument that an emissive
  lift ignores the NORMAL and so draws a mask with a picture of a face on it
  rather than a head. The owner's word on seeing it was to take it off and
  make him blend in, and he is right: a light in a pipe nothing lights is a
  light SOMEBODY PUT THERE, and it says a thing is being shown to you. What
  carries him is his own map handed back through the emissive, which already
  has the packer's baked AO in it, so the sockets and the folds are what you
  read.
- **AND A LAMP THAT LIGHTS A THING IS NOT RANKED BY WHAT REACHES THE EYE** —
  worth keeping though the lamp is gone, because it is general and it cost a
  round. `lampReach` scores a lamp by what it delivers AT THE CAMERA and drops
  it outright once the camera is past its falloff: right for a lamp on a pier,
  whose job is the room you are standing in, and wrong for a small one
  lighting a small object five metres off. At 0.85 m of range it never scored,
  never took one of the twelve slots and did nothing whatever (measured: the
  head read 36 of 255 with it at 3.2 and 44 at four times that), and giving it
  the range to reach the eye lit the whole outfall — **the pipe went from 8 of
  255 to 61**, which is the one thing that must not happen.
- **AND A FLAT LIFT MAKES HIS TEETH THE BRIGHTEST THING, WHICH IS A GRIN.**
  His teeth and the whites of his eyes are near-white in the map, so an
  emissive lift raises them furthest: measured, the face peaked at 67 of 255
  against a mean of 17, and what came out of the dark was a smile rather than
  a face. The church's own knee — `x / (1 + kx)` on `totalEmissiveRadiance`,
  after `<emissivemap_fragment>` — rolls the top off and leaves the bottom
  alone, so nothing in the map can become a highlight and the flesh keeps its
  level. **Peak 67 → 49 with the mean held at 17**, which is the whole point:
  a knee is a contrast change, not a level change.
- **AND HE HAS NO EDGE.** A plane could bake its falloff into its alpha; a
  head cannot, and a head at forty per cent over a black pipe with a hard
  outline is a thing PASTED on the dark rather than a thing in it. The alpha
  carries the cosine of the angle between the normal and the eye, raised
  (`FACE_EDGE`), so the silhouette is exactly where the surface turns away and
  that is what dissolves. It is the octopus ring's Fresnel wearing the
  opposite sign — that one lights a grazing edge, this one eats it.
- **AND "BARELY VISIBLE" IS A MEASUREMENT, not a feeling.** Shipped, measured
  by rendering the frame twice and diffing (the face is the pixels that
  change, exactly, so no box has to be guessed at): **the face reads max 49
  and mean 17 over 2,016 pixels against the pipe round it at max 11 and mean
  4.6.** The first build of the still measured 24 against 5-12, which is not
  barely visible, it is invisible.
- **AND HE IS SOLID NOW, NOT A GHOST.** The alpha edge above is history: a
  translucent head reads as a ghost however well it is lit, because you can
  see the pipe through it. The material is opaque and depth-written, the
  silhouette falls into shadow (the Fresnel term scales his EMISSIVE, not his
  alpha), and the whole lit result — the drain's own lamps on him and his map
  through the emissive — is multiplied by `here * FACE_PEAK` in LINEAR light,
  after `opaque_fragment`, so at nothing he is a black head in a black pipe.
  The fade has to go there: done after `dithering_fragment` it was in display
  space on the canvas and linear in a render target, and the two disagreed by
  a factor of two. Swept through full frames (grain, palette and all),
  `FACE_PEAK` 0.2 is a face you resolve and 0.45 one you are shown. **Judge it
  off the canvas, not a render target** — the target read him twice as bright
  as the frame the player sees.
- **AND IT DOES NOT ARRIVE AND VANISH.** The eyes were gone between one frame
  and the next, which is a jump scare's timing. Measured on the shipped
  curve: nothing for 2.3 s, up over 3 s while he comes from 5.4 m to 3.9 m
  down the pipe, 1.3 s held, then back down over 2.4 s drifting away to 4.8.
  Once a game, on `eyesSeen`, which the save has always carried.


**THE PIPE HAS NO END NOW, AND HE IS DIMMER (2026-10-13; the owner: "tunnel
monsters face can be seen less make it darker in there like you cant see the
end").** Every material down the bore (`throatMat`, the drool, the ribs — a
CLONE of `M.dark`, which the rest of the drain shares — and the invert) carries
a `murk` patch after `opaque_fragment`: `rgb *= exp(-max(0, |viewPos| -
PIPE_CLEAR) * PIPE_MURK)` (1.3 m, 0.62), so from the peek's 0.78 m back the
bore reads a quarter at 3 m, a twentieth at 6 m and nothing at the cap. It is
distance from the EYE, not depth down the pipe, so it costs nothing to place
and darkens the pipe further still from the room. `FACE_PEAK` 0.2 → 0.12; the
throat's own emissive came down 0x0c1014 → 0x080b0e.

## The retexture and the lived-in pass (second look)

- **SAME GEOMETRY, NEW SURFACES.** Like the wreck: every material in the `M`
  table gets a painted 256² map through `liftOff(m, map, k, tint, rep)`, which
  sets the map as both `map` and `emissiveMap` — nothing down here is reached
  by the moon, so what you see of a surface is mostly its own lift. The
  painters (`pipeTex`, `brickTex2`, `floorTex`, `woodTex`, `mattressTex`,
  `rustTex`, `siltTex`, `mossTex`, `puddleTex`, `dampTex`, `spinesTex`,
  `tinTex`…) sit together above `makeDrainageTunnelHome`, all through `paint()`
  (quantised, nearest-filtered, repeat-wrapped).
- **`M.conc` IS OUTSIDE AS WELL AS IN.** It is the collars and lips round the
  bore AND the door's bulkhead. Lifted for the room it went pale beige under
  the moon; it stays barely lifted (0.08) and the room got its own
  `M.roomConc` for floor and ceiling. The bulkhead's room side is faced in
  the room's brick (`veneer`), with its uv cut down so the courses match the
  side walls — a box maps the WHOLE texture onto every face whatever its size.
- **THE PIPE'S TEXTURE RUNS AROUND, NOT ALONG.** On the bore, texture x wraps
  the circumference and y runs down the length. Streaks painted "down" in y
  ran along the tunnel; anything that weeps down a wall is painted along x.
  Same trap with a long thin box: the silt shelves are 18 m × 0.7 m, so a
  [6, 1] repeat stretched 4:1 into wood grain — [24, 1] keeps it square.
- **A DARK FLAT POLYGON ON A LIT FLOOR IS A HOLE.** The puddles were discs of
  `M.water` and read as black holes cut in the floor; the damp down the walls
  was `M.dark` slabs and read as doorways. Both are now feathered transparent
  decals (`M.puddle`, `M.damp`: `depthWrite: false`, polygon offset) on
  planes. `M.water` itself is metalness 0 — with no env map any metal is black.
- **FLAT SLABS IN A ROUND PIPE STAND OFF THE WALL.** The slime at the
  waterline was boxes at |z| 1.02, which the curve leaves floating as green
  panels higher up. It is slices of cylinder at wall radius now, by the same
  `(y, z) = (sin t, cos t) * r` rule as the stain run under the side outlet.
- **FURNITURE IS BUILT, NOT BLOCKED.** Pallet (blocks, stringers, nine boards),
  slatted crate table with a dark core between the slats, hurricane lantern
  (lathe glass, guards, cap, bail), hooped lathe barrel, battened crates,
  angle-iron shelving with tins, jars, books, a radio; a chair, a gas ring and
  kettle, his coat on a peg, a duckboard walkway over the last ten metres of
  the invert, and a string of dead-and-alive bulbs (emissive only, no light).
  Everything is added straight to `R`/`T` so `bakeScatter` merges it by
  material — a nested Group escapes the merge (and costs a draw call per
  mesh), so a turned piece is built in a temp frame by `turned()` and each
  part handed over with the turn baked in.
- **THE ROOM'S FRONT WALL SNAPPED YOU INTO THE DOORWAY.** Between DOOR_X and
  `ROOM_X0 + PLAYER_R` the clamp was "doorway: clamp z to the door's width",
  so backing along the room's front wall at z -2 put you at z -0.6 in one
  frame. Wide of the opening you can only have come from the room (the bore
  funnels you to the door's width), so there it is the wall: back off it the
  shorter way.
- **PUSH-OUT HAS TO SEE EVERY BOX AT ONCE.** The barrel and the crates touch
  once each is grown by `PLAYER_R`; the nearest face of one put you in the
  other, and one-at-a-time passes bounced between them and left you inside.
  `pushOutOfDrainProps` now searches: the ways out of the box you are in, and
  from any that land in another box, that box's ways out, nearest clear spot
  inside the walls wins. Swept on a 10 cm grid over the whole room: 0 of
  3,520 spots end inside furniture or a wall. New props (chair, stove) are in
  `nav.props`; anything new and solid has to be too.

## The grate comes off, and the culvert behind it (2026-10-15)

- **`bakeStatic(drainTunnel)` MERGES EVERY UNNAMED MESH** in the tunnel at
  load, nested groups included, unless an ancestor has `userData.noBake`. The
  grate was "lifted off" as an empty group while its bars stayed in the wall
  in the merged mesh — `G.userData.noBake = true`. Anything in the tunnel that
  will move later needs the same.
- **The screws** replace the frame's corner bolts (`grateScrews`, the
  outlet's own frame). `screwSet` is shared with Billy's plaque: label "I have
  nothing for this" (bare) without the screwdriver, "Unscrew" with it; a
  bitmask on the save; a screw already out on a load is laid where it would
  have landed (`screwRestAt`). The last one out calls `liftGrate`, which
  re-registers the outlet as "Crawl into the pipe" (the old interactable's
  mesh list still held the grate's meshes).
- **THE CULVERT is in the tunnel's own frame, not a far room.** A far room
  would have meant ~64 `inRoom()` sites and a room flag everywhere; behind
  the room it is the drain's: `updateDrain` asks by POSITION (inside its box =
  on its walks, `insideDrain` true, so the beach clamps stand aside), and the
  crawl (`startPipe`, the catacombs' cut timings) only moves you. Its crown is
  3.05 under the cliff's 3.2, and the WALKS are raised (0.40) rather than the
  channel sunk, because the beach's sand plane is drawn at y = 0 wherever you
  stand. The vault is a cylinder slice seen from inside — `M.brickIn`
  (BackSide) — and its uv is cut to the walls' brick (measured: at the walls'
  rate the vault's bricks came out twice the size).
- **Clamp order in `clampToCulvert`: walks, props, walks.** The walk's end
  alone put you inside the sluice post's margin (x 52.45 -> 52.15). Swept on a
  10 cm grid: 0 of 11,616 spots off the walks or inside a prop; the bridge
  crosses both ways, and off it you stop at the channel's lip.
- **Light shafts are front-face only**: double-sided, standing in one laid a
  sheet over half the view.

**THE THIRD PASS: PLASTIC, BRIGHT, FLOATING (the owner, 2026-10-16).** "Reads
as plastic, especially the water", "too bright", the bed the wrong way, the
ceiling light and the door "just floating", the grate and the wall behind it
"weird textures", the sounds. What changed, in `models/drainage-tunnel-home.js`:
- **Every lifted surface has a normal map now** (`normalFrom(map, k)`: a Sobel
  normal off the colour canvas's luminance, sharing its repeat/offset).
  A flat-shaded box with a painted brick is a plastic box; the same paint
  with its mortar sunk catches the lamp. `liftOff(m, map, k, tint, rep, bump)`
  sets it, and scales every lift by `DIM` (0.6) — the room was lit by its
  emissive lift more than by its lamps, which is what "too bright" and
  "plastic" were both describing.
- **The water** is near-black (0x141a1c, emissive 0x070b0c), roughness 0.08,
  with a ripple normal map (`rippleNormalTex`) that `updateDrain` scrolls
  (`T.userData.waterMat`). Before, it was a lit blue-grey sheet.
- **Bricks are box-mapped in world metres** before `bakeScatter` (3.45 x 2.7
  m a repeat), so a course runs at one scale across every wall and round the
  outlet — the "weird texture" behind the grate was the end wall's box UVs
  stretched over a different size than its neighbours.
- **Lamps**: bore 1.15/11/1.25, room tube 1.55/12/1.2, lamp2 0.6/4/1.6,
  candle 0.55/3/1.6, cistern 1.15/11/1.25 and 0.75/9/1.3 (intensity /
  distance / decay). Darker at the walls, the same pool under each light.
- **Nothing floats.** The tube light hangs on a steel batten with end caps and
  two rods to the joists; the conduit is strapped at every joist; a soil pipe
  runs floor to ceiling in the corner on collars and brackets. The door leaf
  is built in its OWN frame (group at (0.62, 0, -2.15), yaw -0.42) and then
  flattened into the door with `applyMatrix4`, so its lip, kick plates, dogs,
  stiffeners, wheel, hub and spokes all sit on the leaf they belong to — they
  were placed in the room's frame and hung beside it.
- **The bed** has its pillow at the wall end (bx + 0.64), the blanket and its
  fold toward the room, and the book on the mattress.
- **The outlet** is a precast concrete surround (an extruded square with a
  round hole, `M.surround`), an angle-iron frame (flange and web, `ironTex`),
  round bars with rust scabs and riveted flats, the screws on the frame face.
- **Rust on brick DARKENS it** (`brickBleedTex`, `M.bleed`). The bleed under
  the outlet used `rustStainTex` — drawn for grey concrete, where ochre is
  darker than the wall — and over red-brown brick at half opacity it
  LIGHTENED the wall into a pale curtain with square edges. Now a dark wet fan
  with feathered, wandering edges, thin rust runs, a slime skin under the lip.
- **The bore** has wet-mud silt (`siltTex`), and debris clear of the walk: a
  tyre leaned on the wall at (5.2, FLOOR_Y + 0.3, 1.02), bricks, bottles, rags,
  a board. Keep anything new out of the walk's band or the clamp walks into it.
- **Sound**: the drain bed has a flow layer (420 Hz bandpassed noise on an
  LFO) and a low moan (55 / 57.3 Hz triangles under a 160 Hz lowpass), a clank
  somewhere in the pipe every 10-26 s, and everything you make in there goes
  through the pipe's own reverb (audio.md, `pipeVerbGain`).

**THE FOURTH PASS (the owner, 2026-10-16): the door, a stick, still too
bright, only his sewer sound.**
- **The door leaf hangs on the ROOM side, open against the front wall.** It
  stood at 24° with its hinge end 23 cm inside the bulkhead (x 0.23 in a wall
  from -0.06 to 0.46) on hinges that were on the tunnel side. Now the hinge
  line is at the jamb on the room side (`HX` = ROOM_X0 - DOOR_X + 0.11, z
  -1.06), the leaf ajar 0.12 rad off the wall, its dogs and wheel at the free
  (latch) edge, the knuckles on the leaf. It has a prop box
  `[ROOM_X0, -3.0, ROOM_X0 + 0.42, -1.08]`, clear of the doorway's clamp.
- **The stick was the last bore lamp's conduit**: 2.6 m off a lamp at x 16.2
  ran on through the bulkhead into the room. Each conduit is
  `min(2.6, BORE_LEN - x)` now and ends in the bulkhead.
- **Lit by a few lanterns.** `DIM` 0.6 → 0.22 (the lift was what lit the walls
  where no lamp reaches). The ceiling tube is dead (`M.dark`); the room's light
  is a hurricane lantern hung from joist 4 (screw-eye, wire, bail, chimney,
  cap, a warm `MeshBasicMaterial` globe, guard wires, font; foot at 2.05 m),
  `PointLight(0xffa458, 0.85, 7.5, 1.5)`, the crate lantern 0.7/4.5, the
  candles. Bore bulbs 0.5/7/1.4, culvert 0.6/8 and 0.45/7.
- **Sound: his recording only.** The pipe's sung note, the air, the mouth's
  trickle, the flow, the moan and the clanks are deleted; `drainAudio.gain`
  is kept for the drips (events) and the bed rides `drainMix * SEWER_LEVEL`.
- **ON ITS HINGES (2026-10-17: "the door is off its hinges").** The hinge line
  stood 18 cm out from the wall with nothing between. The doorway has a steel
  frame on the ROOM side now (jambs and head, `PF` 0.08 deep off the wall's room
  face, which is x 0.484 in the door's frame — measured by casting from the
  room), the pin is at that frame's corner (`HX` = WF + PF + 0.09, `HZ` -1.03),
  each knuckle has a strap across the leaf and a leaf back onto the frame, and
  the leaf rests open against its own frame (`LA` +0.03), clear of the wall.

**THE AIR (2026-10-17, the owner: "add some mist/fog in the sewer tunnel and
... make the lights more ambient and more ray traced feeling of a real nasty
sewer").**
- **The drain breathed the beach's air.** It is not a far room, so `inRoom()`
  is false in it and the fog chunk ran the beach's moonlit blue fog and ground
  mist at y -0.10 all the way in. `drainAir()` (after `updateSquall` in
  `animateFrame`, so it has the last word) takes it over by `drainMix`: the
  density goes to `DRAIN_FOG_D` (0.085: half gone at ten metres), the colour to
  `DRAIN_FOG_COL` (the base saved on the way in and put back when `drainMix`
  reaches 0), `FOG_MOON.w` to 0, the tint down and green, and the ground mist
  is laid on `DN.FLOOR_Y - 0.05` at `DRAIN_MIST_D`.
- **`fogTint.w` is "how much moon lights the mist"** in the fog chunk: the
  ground mist's moonlit terms and its blue lift are scaled by it (1 everywhere
  but the drain). The dojo's mist has no moon in `FOG_MOON` but keeps its own
  look because `w` stays 1 there.
- **The light in the air is the model's** (`T.userData.air`, added after the
  bakes, all `noBake`, `raycast` no-op, unfogged and fading with distance in
  their own shaders): a halo sprite on each burning lamp; a beam (open cone,
  ShaderMaterial, additive, FrontSide) whose alpha is `|N·V|^2.2` — feathered
  at its silhouette, a hard-edged cone is a lampshade — times `v^1.6` so it is
  gone before it meets the floor; 520 dust points lit by the eight nearest
  lamps in the vertex shader (`uL`/`uLC`), dark between them.
  `updateDrainFlicker` drives each halo and beam by its lamp's stutter
  (`drainAirLamps`) and the dust's time.
- **Softer lamps**: bore bulbs 0.46/9/1.1 (was 0.5/7/1.4), the hung lantern
  0.8/9.5/1.2, the crate lantern 0.6/6/1.3: the same pools, falling off into
  the murk instead of stopping.

**2026-10-17, the owner's cuts.** "Remove the sewer face and breathing sound when you look in the drain": the peek
(`startPeek`) no longer builds or shows `gateFace` (nor is it pre-built on load), so `updateGateFace` and its
`drainBreathTick` never run; the `drainBreath` sample is out of `SAMPLES`; `assets/crawler-head.glb` and
`assets/drain-breath.m4a` moved to `incoming/unused-2026-10-17/` (gitignored). The lean, the bars, the drone and the
drips stay. "Move the water bucket … I walk into it": it stood two metres in from the door beside its line —
`BUCKET_X/Z` (ROOM_X0 + 2.65, ROOM_HZ − 0.38) puts it against the side wall past the shelving, and the nav prop
follows the constants. The tally scratched by the bed, the chalk tally beside the arrow, and his boots by the bed
are gone.

- **Flicker scan (2026-10-17)**: rays fanned from eye height down the bore,
  the room and the culvert. Real: the algae patches (26 slabs 6 mm thick, all
  topped at one height — overlapping ones fought; each now `i * 0.0003` up,
  all under the silt shelf's top; the culvert's nine `i * 0.0015`)
  and the door frame's jambs, whose inner faces were the bulkhead's own at
  z = ±OW (now 1 cm proud). Not real: the stain decals (`polygonOffset` -2/-2,
  no depth write) — a ray scan cannot see the offset, so they always report.
