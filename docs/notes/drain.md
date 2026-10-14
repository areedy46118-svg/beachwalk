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
