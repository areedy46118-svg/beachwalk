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

## The sewer through the pipe (2026-10-22)

The owner: a new area through the pipe behind the grate, built from his five Sketchfab downloads (`incoming/sewerrooms`,
packed by `tools/sewer_pack.py` into `assets/sewer*.glb`) to a pencil sketch. The pipe's crawl (`updatePipeCut`) now
ends in it (`placeInSewer`, autosave spot `sewIn`); the culvert is still built behind the room but nothing leads to it.

- **A far room, not the drain's frame** (`SEW_X/Y/Z` 24000/700/24000, `inSewer`, room key `sewer`): it is 6.6 m wide
  and 5.5 m tall, which the sand plane and the cliff would cut. Every hook the dungeon has, it has (`inRoom`,
  `indoors`, `saveRoom`, `ROOM_BACK`, `clearRoomFlags`, the lighthouse teleport's leave-all, `dropTargets`,
  `bunkerFloorAt`, the beach clamp's room list, the hall cull's key 11, the step sounds, `clampPlayerToRoom`).
- **The kit is a catalogue laid out in rows**, not a level: its pieces do not join where they stand. Each one is
  placed by a MEASURED native anchor (`put(name, anchor, yaw, to)`, a translate-rotate-translate), and everything that
  does not move is baked and merged one mesh a material. The anchors came off the gltf with every node transform
  applied: the big tunnel runs along z, walks at -0.70 (|x| 1.16..2.65), channel bed -1.47, walls x +-2.65 to 3.52,
  vault 4.80; `Serwers_007`'s side door is 1.07 wide x 2.37 on the kit's -x, `Serwers_001`'s branch spans z 17.35..22.65
  and ends 4.38 from its centre (10.16), `Serwers_011` is the dead end (ledge z -16.09..-14.52 round the channel's end),
  `SerwersP_003`'s branch is 0.21 off its middle, `SerwersP_012`'s door gap is the same 1.07 as the side door.
- **The big tunnel has no grate of its own.** The small passage's plain arched grate (`SerwersP_011`) is WARPED onto
  the rib's opening: both arches are straight walls under a vault, so y is mapped piecewise (wall to wall, vault to
  vault) and each vertex's x by the ratio of the two half-widths at its height — the bars stay upright and the frame
  meets the brick all round. A linear scale left 0.44 m gaps at the springing.
- **The levers are on local -x** (the left walking from the ladder to the generator — his sketch's right side, read
  facing down the page). Knife switch: the hinge is the middle of the blade's lowest tenth; down is -2.0 rad about x.
- **Light, measured from the ladder looking down the tunnel** (frame mean of 255, `readPixels` straight after
  `__bw.frame(1)`): the walls' emissive lift `SEW_LIFT` gives 0.6 at 0x1a1e17 (black), 4.0 at 0x30362c, 6.9 at
  0x3a4136 (kept), 11 at 0x464e40. The response is steep — an emissive in the 0x1x range is invisible in this game.
  With the power off the lift drops to `SEW_DARK` (0.45): 7.9 -> 2.8, and the glowstick takes it to ~28 around you.
- **Fog 0.022, not the dungeon's 0.07**: the generator's lamp is meant to be seen from the ladder 44 m off; its halo
  is unfogged and 2.6 m across.
- **The room is lit only by the live box** (`boxLight`, `lpAlways` 14, plus the sparks' flashes): without it the box
  and its wires could not be seen through the grate, which is the whole warning.
- **Saves**: `flags.sewer` = levers bitmask, generator off, gate, chest, loot, plank (2 = laid, at `pz`), spare
  glowstick. A plank carried up the ladder goes back by the wall (`sewerLeave`).
- **Harness traps met here**: `beginGame()` returns early until the boot's warms are done (`__bw.bootLeft().nWarm`
  0), and until `introStarted` the title camera (`titleCam`) rewrites the camera every frame — a body put in the room
  is snapped by the room's clamp to the nearest corner of its walks (it read (-2.25, -43.92) every time). Call
  `beginGame` until `#overlay` is `hidden`, then `__bw.introDone = true; __bw.started = true`. A tab that is not
  fronted (`tabs_select`) boots at a crawl. Replacing `requestAnimationFrame` to freeze the loop eats its next
  request, and the loop does not come back when you put it back: drive frames with `__bw.frame(1)` after that.
  `__bw.sewS()`, `sewG()`, `sewSet(lx, lz, yaw, pitch)`, `sewRestore({...})`, `sewPullLever(i)`, `sewPressButton()`.
- **Never put Python with backticks in a PowerShell `@"..."@`**: the backtick is PowerShell's escape, and these notes
  came out once with tabs, carriage returns and bells where the code names were. Write the script to a file.

**THE SECOND PASS (the owner, 2026-10-22: "the levers ... arent even attached to the wall", darker, "ray tracing type
effects with fog ... amnesia the bunker", "no collision errors or invisible walls", and the screwdriver onto the crate by
the drain's grate).**
- **THE BIG TUNNEL IS EGG-SHAPED.** `Serwers_009`'s section: from the walk's edge (|x| 2.65, y -0.70) the wall leans OUT
  to 3.30 at 0.66, stands straight to 2.16, comes back to 2.65 at 3.52 and over the vault (1.47 at 4.46, 0 at 4.80).
  The first pass read "walls at +-2.65" off the floor's edge and hung the levers, the cable and the leaning plank
  there — 0.6 m out in the air above the knee. Everything on a wall goes on the straight (`SEW.WALL_HI` 3.30): the
  panels at walk + 1.6, the cable at y 1.9 and over the vault along the section three centimetres in (`ARCH`), the
  plank leaning from the walk's foot (x -2.56) to the straight (top at 2.11). The walk clamp's 2.65 was right.
- **Bodies are round.** Props were pushed out to the nearest edge of a box grown by the radius, so a body meeting a
  box's corner was thrown back the way it came: walking south along the wall stopped dead at the ladder. Pushed out
  along the line from the box's nearest point, it slides round (`sewClamp`). And no box for what is on the wall above
  the walk: the first pass's lever boxes were four invisible walls; the leaning plank's box is its foot, not its lean.
- **Narrow ways catch you.** The plank allowed +-0.13 off its line and the side door +-0.135: arriving a hand off either
  stopped you at the lip. Heading onto the plank or into the door's passage the body is drawn to the line
  (`sewClamp`'s funnel, only while moving that way); the plank's rect runs 0.35 onto each walk so a slanted step off it
  lands; the far walk's inside corner into the branch has a fillet rect.
- **Walked, not reasoned** (`tools/sewer.js`: `__sw.route` turns toward each point and holds W through real `keydown`s,
  reporting a leg that stops making headway). Final run: every leg on both walks hugging the wall both ways past the
  ladder and the plank's foot, the dead end's ledge, onto and off the plank at slants both ways, into the branch's
  mouth and out round its corner, through the door and to all four corners of the room with the power off — none
  stuck. A crate that stood between the door and the chest is stacked on the other.
- **Darker, and the light in the air**: `SEW_LIFT` 0x2c3229 (mean 4.7 from the ladder, was 6.9), 0.3 of it once the power
  is gone; the fog chunk's ground mist laid on the water in here (`SEW_MIST`, `FOG_GROUND` y/z/w in `animateFrame`, and
  `FOG_TINT.w` 0 after `drainAir` — the murk's own grey, no moon). It is NOT lit by the lamps (the fog chunk has no
  lights) and at density 1.25 it covered a lamp's pool on the floor by 80 %: 0.6. A cone of lit air under every burning
  lamp (the drain's beam shader): measured, K 0.07 and 0.24 vanish under ACES in this dark, 0.8 reads as a soft wedge
  (`SEW_BEAM_K` 0.75). 1,100 motes lit by the eight lights that matter, the held glowstick among them.
- **The Bunker's sound**: a sub drone (34 / 35.3 Hz triangles under a 95 Hz lowpass), pipes groaning (`sewGroan`, a
  falling saw through a sweeping resonance, 18-44 s), something heavy far off (`sewThuds`, one to three dull impacts
  with the tunnel's echo, 38-83 s), rats (`sewRats`, squeaks and the patter passing across, 15-40 s), and a burning lamp
  stuttering with a crack now and then (7-21 s). All through `sfxOut`, so the drain's reverb (`pipeVerbGain`) has them.
- **The screwdriver** is on the drain room's crate table (top 0.674 in the world, a ray down says; the three candles
  stand in the corner toward the grate, so it lies along the far edge). Its pickup id is a PLACE, so a save that took it
  from the fisherman's table restores it in the pack and the restore stows the one on the crate (`stowScrewdriver`).
- **Harness traps, again**: the boot's warms run one a frame and the pane gives few frames — drive `__bw.frame(1)`
  until `bootLeft().nWarm` is 0 and `beginGame` takes (`__sw.boot`). The overlay's fade runs for seconds in the pane;
  a load after a death waits on `#deathcard`'s Restart. A pane resized after the load shows the top-left of an old-size
  render (the view's centre lands bottom-right) — reload at the pane's size. Screenshots need the page's own rAF: never
  stub it (the tool times out); and while the game's loop also runs, a still can be one of ITS frames — measure with
  `readPixels` straight after `frame(1)` (`__sw.lum`). Restoring the sewer's state while standing in the room shuts the
  gate, the clamp puts you in the live passage, and you die — `sewRestore` from the walk.

## The kit's surfaces on the drain, the brick headwall, the storeroom cut down (2026-10-23)

The owner: "revamp the sewer tunnel using the modular sewer textures to better match the deeper sewerrooms area",
"update and improve the front of the tunnel", the screwdriver "on the other side of the crate so its easier seen", the
electric box "backwards the warning should be facing out", "get rid of the other little room in the storage area and
bring the chest into the other room where it can be seen through the grated door", "check again for collision errors
especially with the plank". ("The sewer tunnel" here is the drainage tunnel home — the bore and the chamber.)

- **The kit's colour maps are copied out of `assets/sewer.glb`** (`tools/sewer_tex.py` -> `assets/sewer-tex/*.jpg`,
  256 px as packed, 6 files, ~120 KB): the drain is built at boot and the sewer's glb is not. `kitTex(name, avg)` hands
  back a CanvasTexture painted the map's average colour and draws the picture over it when it lands (quantised `& 0xF0`
  like `paint`), and refills the normal map `normalFrom` lifted off the placeholder (`fillNormal`, `_nmCache`) — so no
  material changes shape when the picture arrives and nothing recompiles.
- **Kit maps are ~1.8x the brightness of the paint they replaced** (means: brick 128-131, base concrete 125, paving 118,
  bare concrete 101, Metal 133; the paint was ~72). `kitLift` cuts each material's colour and lift by `72 / mean`, and
  the frames measured from the same spots came out as dark as before.
- **Tile sizes, measured off the kit's own pieces** (uv per metre along their edges, `KIT_M`): the big tunnel's
  `brick_modern_01` 5.75 m, the small passage's `brick_modern` 3.24, `brick_pavement` 2.5, `concrete_bare_01` 1.37,
  `concrete_base` 4.24. The end-of-builder metres pass (was brick only) now lays every box, extrusion and flat piece of
  each kit material in metres (`KIT_UV`); a mesh with `userData.ownUV` keeps its own.
- **The bore's brick runs ALONG the pipe**: the cylinder's u goes round and v along, so its uv is swapped and laid in
  metres, two tiles round — a whole number, or the seam shows. The rings are the bare concrete.
- **The chamber**: the storeroom's red brick, a paved floor (`M.pave`), and a knee-high skirting of bare concrete
  (`M.skirt`, one tile tall so the map's own top and foot lines are the skirting's) two centimetres proud of the brick,
  because every room of the sewer stands its brick on that band.
- **The headwall** is an extruded wall with the bore's hole cut through it (`ExtrudeGeometry` turned so its cap faces
  -x; its foot is at -0.6 so the hole, which goes below the sand, is inside the shape), a ring of bricks on end round
  the hole (`RingGeometry`, u = radius, v = arc over a tile that goes round 8 times), keystone, plinth, piers, band,
  coping, stepped wings set back 16 cm. All of it is at x >= -0.3 and `updateDrain` stops you at -0.5, so none of it
  needs collision; the fallen coping and loose bricks on the sand are half sunk because nothing stops you walking
  through them. The bore's shell behind went to r 2.95 so its top stays under the coping. Out under the moon the brick
  is lifted moon-blue off its own map (`FACE_LIFT`): at the paint's lift it was a black cut-out against the bank.
- **The screwdriver** is on the crate's near edge (-z in the crate's frame, `lz` -0.27): on the far edge the lantern
  hid it from everywhere in the room.

**The storeroom.**
- **The electric box's face is its model's -z**, not +z: turned -pi/2 its back was to the gate and the DANGER label
  read mirrored through the double-sided material. Turned +pi/2, its back (+z) on the wall: x = ROOM_X1 - (max.z -
  centre.z). At eye height now (`BOX_Y` walk + 1.6) — square in the gate's frame, and clear of the chest's open lid.
- **The room is the T only** (`ROOM_Z1` -4.48; the `SerwersP` length that ran on to -0.29 is gone, the end wall loop
  closes the T itself). The T is x 4.35..7.48 (its branch the mouth onto the door's passage), z -8.66..-4.48.
- **From the walk the passage shows a hand's width either side of the box** — a chest beside the box (tried at z
  -7.75, then -7.55) stood behind the passage's wall whatever its light. So the chest is UNDER the box (`SEW.CHEST`,
  turned so its lock faces the gate), the wires draped out over its lid's front edge into the water, the zap light moved
  out of it (a point light inside a closed box lights nothing you can see). At fov 105 from the walk it is small; at
  fov 12 it is plainly a chest in the box's cold light. Measured with a red override material: 36,822 red pixels from
  the walk, so it is not occluded — a 560 px sheet just loses it. Its own lift is `SEW_CHEST_LIFT` x the walls'.
- **The open gate leaf had no collision**: it swings a metre into the room off the passage's north jamb (hinge
  (4.56, -6.295), leaf to (5.53, -6.12) at -1.75 rad). It is a prop now, tagged `'gate'`, live only once it has swung.
- **The passage is live too**: the flood polygon starts at x 2.66, so with the power on a harness `go` into the door's
  passage zaps you (and without dev mode, kills you and the page restarts). Look through the gate from the walk
  (2.1, -6.8), or turn the power off first. Set `__bw.settings.devMode = true` before a harness run in here.
- **Walked** (`__sw.route`, real keys): the near walk both ways past the leaning plank's foot; the plank laid at
  -6.78, -2.1, 0, 2.6 and -24.5 and crossed four times each at slants; through the gate into the shortened room, round
  the chest and both ends. No stalls. The two legs that stopped were into the open leaf, which is the point.

## The thing in the water, the flashlight, the light falling off (2026-10-23)

The owner: a monster that stalks you in the sewer's water from the first lever — rising only while you do not look,
diving with a loud splash when you do (seen a beat first), leaping and killing you after ~5 s unseen, more often and
sooner once the generator is off; his slosh/splash/jump recordings and a "creepy sewers" bed; the monster model from
~/Desktop/Tunnel Rooms/monster; eyes glowing slightly as it peeks; "starts with just his head peeking out then as he
lifts out he starts to raise his arms like he is about to grab you"; the green angle-head flashlight (his
FlashlightFBX pack, the Fulton) in place of the spare glowstick; the lighting "more natural with the fog and darkness".

- **Assets**: `tools/sewer_monster_pack.py` (Blender; base 1024, normal 512 JPEG, metallic/roughness/emission dropped:
  the emission is 30 texels of speckle, no eyes) -> `assets/sewer-monster.glb` 2.0 MB (32k verts after seams, 63 bones,
  no clip). `tools/sewer_monster_sound.py` (afconvert + plain Python) -> `sew-slosh1..8`, `sew-splash`, `sew-leap`,
  `sew-drip-bed` (64 s loop, padded). `tools/flashlight_pack.py` -> `assets/flashlight.glb` 152 KB (decimated to 4.6k
  faces, 0.19 m, lens at (-0.034, 0.169, 0) facing -x, measured off its near-white `Material.002`).
- **It lives under the water sheet.** The channel's and the branch's water are opaque meshes, so anything below WATER
  simply is not drawn: it rises THROUGH the sheet. `SEWMON.HID` (-0.35) is hidden.
- **THE BONES CARRY THE FBX'S 0.01.** Anything hung on a bone (the eye glows on `Head_M`) is drawn at a hundredth of
  its size unless scaled by `1 / bone.getWorldScale()`. The eyes were two millimetres across until that.
- **The model's own eyes are amber in its map**; the glow sprites stand `SEWMON_EYE_OUT` (0.15 m) in front of the
  sockets — inside the head, the face hid their middle and they read as a halo round the skull — and draw at
  renderOrder 6, after the mist sheets lying on the water, which veiled a peek's glow to nothing.
- **Posing without a clip** (`sewAim`): every frame the bones go back to bind, then a bone is turned in the world so the
  line from it to a tip points somewhere: `L' = P^-1 q P L` (P its parent's world quaternion). Neck then head onto
  you; upper arm (joint5 -> elbow joint6) and forearm (joint6 -> wrist joint7) out at you with `reach`.
  With the camera half a metre off its face, arms aimed past your head land at the edges of a 105-degree frame:
  measured, the upper arm points within ~25 degrees of the camera, it only LOOKS sideways.
- **Size**: at 0.95 and rising 1.45 only its back cleared the water from the walk; 1.1 and `UP` 2.0 puts its head at
  your eye, waist-deep. At fov 105 it is still small at 5 m — the game's lens is wide.
- **Seen** = its eyes inside ~43 degrees of the middle of your view with an open line (`sewOpenAt` — the tunnel, past
  both grates, the branch, the door's passage, the room). It only comes up more than ~83 degrees off your view.
  Walked: it picked a spot behind me (past the north grate), rose; turning onto it -> `seen` (0.5 s) -> `dive` with
  the splash -> `under`, 13 s to the next, that spot marked and avoided.
- **The scare** (`sewScare`, declared ahead of `frozen()`, which reads it): the camera is slerped onto its eyes, it
  flies the distance in 0.34 s + 0.022 s a metre, lands its eyes 0.52 m in front of yours, a pooled lamp lights its
  face (1.3 — 2.6 washed its brow white), the synthesised scream, 0.85 s, `playerDied`. Dev mode: the scare and back
  under. A bug met: `sewMonPose` writes `_smCam` (the camera in WORLD space), so the scare's own camera vector has to
  be a different one taken after the pose — sharing it put the landing point 24 km off.
- **Sounds**: an HRTF `PannerNode` per sound (the listener is set to the camera every sewer frame; nothing else in the
  game uses the 3-D panner, so moving the listener disturbs nothing), into the effects bus, so the sewer's concrete
  reverb send has them. The water running off it is a looped noise on its own panner, louder the more of it is out.
- **The light falls off** (`sewLightPass`): every sewer material lit off its own map (`emissiveMap`) has its emissive
  multiplied by `0.2 + 0.8 exp(-0.11 d)` (view distance, `vViewPosition`, no new varyings), so near walls keep their
  breath of light and far ones go into the dark. Not the lamps' glass.
- **The flashlight's beam is a real SpotLight that lives in the sewer's world** (`sewP.flash`): a light inside a group
  that is not visible is not in three's light state, the sewer's world is only visible in the sewer, and its warm
  compile includes it — so it costs no recompile anywhere. Off the sewer the flashlight is a pooled point thrown 2.2 m
  ahead (`flashGlow`). 14 / 0.62 penumbra was a hard white stage disc on a near wall: 9, angle 0.52, penumbra 0.88, and
  a faint pooled spill 1.6 m out so the dark at the pool's edge is not a cut-out. The ledge torch lies on its side
  (turned 1.35) throwing its pool along the floor and up the wall; in the dark it is the guide to the far end.
- **Harness**: `__bw.SEWMON` is the tuning object (set `LOOK = 2` to photograph a rise without being "seen", and
  `RISE[0]` long to hold one), `sewMon()`, `sewMonS()`, `sewMonLeap()`. `__bw.frame(1)` advances ~7 ms, not 1/60.

**The playthrough (2026-10-23)**, beach -> drain -> screwdriver -> four screws -> crawl -> four levers -> generator ->
flashlight -> plank -> gate -> chest -> ladder, by real keys and aimed E presses (scratch harness). Fixed on the way:
- **Seen is at the crosshair** (the owner): its eyes within ~16 degrees of the middle of the view (`SEWMON.LOOK`, a cos).
  Where it comes up is off the SCREEN (`sewNdc`, NDC beyond `CLEAR` 1.2 at both its peek and full heights) — the lens is
  105 degrees tall and ~121 across at 4:3, so the old 83-degree cone let it rise in plain sight. (Harness: `LOOK = 2`
  now means never seen.)
- **A ladder lamp** (`sewP.ladderLamp`, dim, cut last): you came down into black.
- **The flashlight blew out at arm's length** at decay 2: decay 1.25 at 2.8.
- **"Lay the plank across" was a low box over the channel**: looking across at the far walk missed it. 2.4 m tall now.
- Death with dev mode off: hp 0, `dying`, the card and the checkpoint reload, as any death.

**The owner's four (2026-10-24): wake, breath, the torch, pressure.**
- **It swims there** (`'swim'`, `sewWaterPath` — straight down the channel or the branch, by the junction between):
  from where it went under (the first time, ten metres further down the water away from you) at 2.4 m/s (3.3 in the
  dark), the last 14 m of the way only. And while it waits under (`'under'`) it drifts down the channel after you,
  holding seven metres off.
- **The wake**: a soft ripple texture on a flat quad (`ripTex`), not a ring mesh — the hairline ring was a pixel wide at
  five metres. Drawn at renderOrder 5, after the mist sheets on the water, which veiled them (as they did the eyes);
  opacity floor `0.2 + 0.3k`. A chain of equal rings read as the Olympic logo: each one its own size, jittered off its
  line, 0.22-0.38 s apart. Ten in the pool, the oldest reused.
- **Its breath**: the water-noise buffer slowed, a narrow 420 Hz band, its level drawn in and let out on a 3.1 s cycle
  (the out-breath gurgles), on its own HRTF panner at its underwater position, within 8 m, only once it has a place
  (`M.placed` — at first its position defaults to the ladder). Bubbles: a rising sine blip, placed.
- **The torch** reads `flashDread` (declared beside `flashOn`, written by the monster's tick): rising unseen, nearer,
  higher -> stutters up to 15x as often and deeper.
- **The pressure** (`M.press`): rise progress while unseen, drained fast when caught; a lub-dub (`sfxSewHeart`, 62 -> 38
  Hz under a 140 Hz lowpass) from 62 to 132 bpm, and a 6.3 kHz ringing at 0.012 x press^2. Cut by the scream.

**The detail pass (2026-10-24)** — the owner: "update all the animations and particles to look more natural and be more
detailed", his "Monster Breathing" for its breath ("subtle but noticable and directional"), then optimise.
- **Its breath** is his recording (`sew-breath1..2`, two takes cut at the quiet between): every 4-6 s within 9 m under the
  water (lowpassed to 900 Hz, Q 2: muffled) or 13 m once it is up (open), on the HRTF panner, 0.05-0.35. Breathing out
  under water sends up bubbles. The synthesised breath is gone.
- **The droplets** (`sewDrop`, one pool of 220, a ShaderMaterial of soft round points, a size and a colour each): a dive
  throws a column, a crown and low spatter, and a smaller splash as the water closes; drops landing in the channel leave
  a ripple one time in five; while it is up, water runs off its hands, arms, chin and shoulders and laps round its waist;
  the box's wires throw a few blue-white sparks with every crack. **TRAP: the lifetimes array was named `sl`, the same as
  the slosh timer further down the state object literal — the later field won, every drop died on its first frame and
  `M.sl[i] = ...` threw on a number.**
- **The pose**: the chest heaves on its breath (`sewTurn`: a bone turned about a world axis, P^-1 q P), it sways on the
  current, its head is cocked (a new angle every 2-4 s, eased) with the odd twitch, caught it flinches (head and body
  jerk back), and it throws itself back and round going under, arms up out of the water.
- **Optimised**: its audio graph (the water-off-it noise, the ringing) is built on the way in and stopped and let go on
  the way out (`sewMonReset(true)`), not left running at nought for the rest of the game; the droplet buffers upload
  only while a drop is alive; the drain's kit textures share one canvas and one normal map per picture (`_kitSrc`,
  `_nmCanvas`) — six fetches and six Sobel passes instead of sixteen.

**The stalker round (2026-10-26)** — the owner: the monster waits behind the grate before the first lever; the ripples
"look like little droplets", it must look like something moving through the water, flowing away; it must never move in
the water while you look at it ("it is a stalker and is smart about its attacks"); rusty levers that take a couple of
seconds, with his lever recording and reverb; all its sounds cohesive, the tinnitus quieter; the stalking earlier and the
rise longer; and it pulls you back into the water.
- **The watcher** (states `gone` -> `wrise` -> `watch` -> `wsink`): before the first lever it stands at `WATCH_H` (1.35;
  at 0.9 the grate's lower bar hid its eyes from the ladder) 1.3-2.8 m past the north grate (or past the branch's bars),
  sinks after 1.6 s of being stared at, when you reach the bars, or after 40 s, and is gone 16-34 s. On the first lever
  it dives with a splash if it was up (otherwise the far splash), and `M.hunt = SEWMON.FIRST` (4 s) puts it `under`.
- **Frozen while watched**: `sewMonWatched(x, z)` (within 32 m, NDC |x|,|y| <= 1.08, a clear line) — the swim's speed is
  nought while it holds and the under-drift does not run. So the wake is seen at the edge of the screen, or after.
- **The wake is in the water's shader, not sprites.** The ring sprites read as droplets. `sewP.wake`: 24 points (x, z,
  age, strength), the oldest replaced (`sewMonRing`); `waterMat.onBeforeCompile` sums for each a wave packet on an
  expanding front (`front = 0.12 + age*0.85`) plus a turbulent inner fill, into the normal (through `viewMatrix`: the
  normal is in view space), the roughness (smoother where disturbed) and a faint crest emissive. The points are aged and
  carried on the flow in `sewMonWater` (down the channel at 0.24 m/s, out along the branch at 0.2). Laid every 0.11-0.16 s
  while it swims, the overlapping fronts make a V (half-angle ~16°, about Kelvin's). **The channel's mist sheet at 1.0
  veiled it entirely** (pixel diff max 31 with, 86 without): it is 0.6 now.
- **The rusty pull** (`sewPullLever` -> `sewPull`, `sewPullTick`): a keyed curve `SEW_PULL` (2.47 s: a grab, two jerks
  with strains between, a slam with a bounce); the lever's arm shudders through the strains; the owner's take cut in three
  (`sew-lever-a/b/c`) laid on the jerks, a synthesized rusty creak (`sfxRustCreak`: a gated sawtooth through two
  bandpasses) on the strains, trauma on each. You are held where you stood. `sewPullLeverNow` is the old instant one (the
  harness, restores). `sewApplyState` and `sewerLeave` clear a half-done pull.
- **The drag** (`SEW_DRAG`, `sewDragCamera`, `sewUnderwater`): 0.45 s after it lands on you, you and it go together — its
  face held where it landed in front of yours (`C.dir`, fixed at the hit) — out over the channel and then down, under
  the water: a murky green radial overlay, the fog green and dense, the deep's lowpass (`deepAudio`), bubbles (droplet
  kind 2) going up past you; dead there (dev mode: let go, back on the walk). TRAPS, all measured:
  - **Moving `camera.position.y` does nothing**: `update` runs the walk's vertical step after `updateSewer` and puts the eye
    back on `camBaseY`. Set `camBaseY`, `groundY` (under it) and `vy` with it.
  - **It is posed standing where it rose, then moved bodily**: its head aim (and the arms' reach) must look at where you
    are from where it was moved to (`sewMonPose(dt, reach, at)`, `C.shift` = last frame's move), or dragged below its
    standing eyes it looked down and you saw the crown of its head.
  - Its turn must freeze during the haul: with you right over it, `atan2` of the jolts spun it round.
  - Sending it ahead into the water below you rolled the lens (lookAt straight down) and showed its back or chest
    whichever way it leaned; face to face, fixed, reads.
  - The leap's offset was solved from the pose's full height while the jump left from `f0` (its height when it leapt):
    a leap from low ended short and under you. `_smTip` is moved to `f0` before the offset.

**The tunnel, the room's air, the grate's hitch, held levers (2026-10-26)** — the owner: "get rid of this arrow in the
tunnel ... random props in the wall of the tunnel that look strange and out of place ... more dingy and misty and dark in
the actual room where the bed is ... hyper real ... It lags super bad when you take the grate off ... hold e on the
levers".
- **Gone from the bore**: the chalk arrow at BORE_LEN - 3.2 (and the culvert's, and `chalkTex` with them), and the
  "smaller line joining the bore" at x 11.4 — a concrete torus proud of the wall with two bars in it, which over the
  sewer's brick read as a ring hung on nothing.
- **The room** (`T.userData.roomMist`, the block after the air in the model; `DRAIN_ROOM`, `drainRoomK` in main.js):
  - every Standard material in R with an emissive map (the `liftOff` breath) gets `*= 0.1 + 0.9 exp(-0.34 d)` on its
    emissive (`drainFall`; the headwall's moonlit materials are kept out — they are seen from the beach);
  - the hung lantern 3.4 / 9 m / decay 2, the crate's 1.8 / 6 / 2, and every warm point light in R is
    `userData.flame`: `updateDrainFlicker` breathes those (several sines, no stutter) instead of the bulbs' sag;
  - a candle stub on a tin lid at the head of the bed (0.65, 3.4 m, decay 2, `lpAlways` 7): with the lift gone the
    bed's corner was black;
  - five Lambert mist sheets, floor to 1.7 m, 0.85 -> 0.08 opacity, drifting. **At 0x8c8878 they were a grey veil over
    everything** (the scene's base light lights a Lambert sheet everywhere); 0x625e54, and the flames light them;
  - past the door the fog closes to 0.15 and goes 0x0e100b, the ground mist 1.25 dense to 0.6 m (1.6 / 0.85 hid the
    lantern's pool on the floor), eased in over 2.2 m of the doorway.
- **THE GRATE'S HITCH WAS THE SEWER BEING BUILT.** Taking the grate off fetched the sewer (`loadSewer`) and the last file
  to land built it on the spot: one 2.3 s task in the room (a longtask observer). `loadSewer(false)` now only fetches and
  keeps the pieces (`sewGot`); a `loadSewer()` builds — the crawl's hold (black at 1, measured: a 2.9 s task at opacity
  1) and the restore's room loader. Off the grate now: a 66 ms parse.
- **Held levers**: `sewPull.held` is kept only while E / F / Enter is down (`sewUseHeld`, `keys`) and the game is not
  frozen; let go and it runs back at 1.4x with a creak, the jerks re-armed as it passes back over them (`P.ev--`), and
  at 0 it is let go with a small clunk; E on it on the way back takes it from where it is. You are held at it only while
  holding. The leap takes your hands off it.

**Shadows, breath, roaches and moths (2026-10-26)** — the owner's pick of the ideas: "do 1,4,5".
- **Contact shadows** (`roomShade`, the block after the room's air in the model): one merged mesh, one 64² radial
  falloff texture, **nine-sliced** so the falloff is the same width in metres whatever the size of the thing (the
  slice's middle is the texture's centre, its rim the edge); strength per vertex (4-component colour, black). Under
  each prop from `nav.props`' boxes, round ones as a small core (0.6 r) with a wide rim; wall feet are strips down the
  texture's centre line, 0.42 m out over the floor and 0.38 m up the brick (the front wall either side of the door, its
  face at DOOR_X + 0.46). **Prop shadows sit at 0.016, not 0.005: the rug is a plane at 0.012 and hid the bed's.**
  MeshBasic, DoubleSide, depthWrite off, renderOrder 1 (under the mist's 2).
- **Breath** (`updateBreath`, `BREATH`, after `updateFlashlight` in the update): `insideDrain || inSewer`, not
  `frozen()`; an exhale every ~4.2 s (faster by `1 - stamina / stamMax()`), four or five world-space sprites 0.3 m out
  and 0.2 down, slowing and spreading over ~2 s. Unlit, so the opacity carries the light: 0.3 + 0.7 torch in the sewer,
  0.35 + 0.45 `drainRoomK` + 0.4 torch in the drain. **At 0.12 a puff the four of one breath overlapped into a pale
  ball;** 0.055 and a wider spread.
- **Roaches** (`drainBugs`, `updateDrainBugs`): one InstancedMesh in the drain's frame, 8 homes. **In the dark corners
  they were nothing at all** — measured a roach at 32 on a floor of 28 (the floor under the hung lantern is ~28/255),
  and a real-sized 4.8 cm one is a few pixels at the game's resolution. So: 6 cm, a glossy 0x8a4420 with emissive
  0x44200e, **transparent with renderOrder 3 so they draw after the floor mist** (under it 51-on-30 became 32-on-28),
  and most homes out in the lanterns' pools, where you walk in among them. Scared at 1.9 m (1.3 on the crate: at 1.25
  they went from under the bottom of the view, unseen), or a torch on (`flashOn > 0.5`, `_flAim` within ~13°, 5 m).
  They run to the hide that is furthest from you for the least run (`dist(hide, you) - 1.3 dist(hide, it)`, within
  3.5 m), in jinks and stops, clamped inside the walls (a jink along the back wall went 5 cm into it), 6 s at most;
  then gone 18-43 s and back only when you are over 3 m off and not looking toward the spot. Idle shuffles are tethered
  to 10 cm of home (the crate's would have walked off it). `sfxSkitter`: a scatter of 1.5 ms high-passed ticks, placed.
  **Instance matrices start as identity: they stand at the drain's mouth until the first live frame** — harmless only
  because the mesh is hidden until then.
- **Moths**: 7 instanced cards (4 at the hung lantern, 3 at the crate's) chasing a target that jumps about the glass
  every 0.15-0.6 s (8 % of the time into it); wings flap by x scale. **A bare card read as a grey square up close**
  (seen in a still and first taken for a broken breath sprite): an alpha-tested wing cut-out now.
- Harness: `__bw.flashlightItem` is exposed for torch tests. Teleporting straight into the room off the centre line
  puts you back at the mouth ("walked into the concrete face") — enter with `__dr.at(…, 0, …)` then move. The preview
  pane's canvas can be ~300 px wide: judge small things after `renderer.setSize(1280, 760, false)`.
