# The wreck (the Limulus)

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**An interactable's `when()` gates it on the WORLD.** `updateHover()`
raycasts only an interactable's own meshes, so nothing in this game is
occluded by walls — the fisherman was hailable straight through a shut
door. Anything that should only exist under some condition needs `when`.

**Anything flat stuck to the wreck's hull is built from `hullPt()`.** The
plating flares and tumbles home, so a plane hung at one beam floats off the
plate within a metre; `hullQuad()` puts all four corners on the loft. The
porthole streaks and the name on the bows go through it, and they are
`noBake` so `bakeGroup()` leaves their materials alone. `hullQuad()` is a
GRID, not a quad: the hull is convex both ways, and a flat quad between two
points on it is a chord whose middle lies inside the plate — the name was
drawn that way first and only its two ends showed.

**The hold's inner walls are an inner skin on the same loft.** They were
flat slabs 2.8 m off the centreline the whole way down, and below the
porthole line the section tumbles home to ~2.3 m — so along the length of
the hold the inner wall stood PROUD of the plating and, from the beach, the
lower half of her was one black slab with a hard straight top edge. That
was the wreck's "it looks like slop" from the day it was built, and no
amount of texture fixed it. If the lower hull ever reads as a black band
again, raycast into the side: the first hit must be `M.hull`.

**Flicker is always coplanar faces.** The two that bit: the door frame's
back face sat exactly on the wall's front face, and the threshold slab's
top was exactly level with both the bore invert and the room floor.

**The wreck.** `models/shipwreck.js` → `makeShipwreck()`, the **Limulus** — an
old horseshoe-crabbing boat, which is why her gear is aboard and why the catch
is still in the hold. She lies across the beach at `SHIP_X` / `SHIP_Z` and
blocks the walk; you get past it by going through it.

The hull is a loft with `beamAt` (fined stem, rounded transom), `flareAt` (bow
flare), `rakeAt` (the stem leans forward as it rises) and **`sheerAt`** (the
deck line lifts to both ends). Sheer is the one that stops a hull reading as a
shoebox — and because the plating follows it, `shipFloorAt()` has to as well
via `deckYAt(lx)`, or you float over the bow and sink at midships. Collision is a **floor lookup**, not a solid: `shipFloorAt(lx, lz,
feet)` returns the highest walkable surface at or just below your feet, so the
hold floor and the deck can sit at the same (x, z) without fighting — the deck
is only selectable once the stair has actually lifted you. Anywhere inside the
hull with no floor is solid and pushes you back out.

Two things that had to be got right, both found by walking it:

- **Which lateral clamp applies is decided by *where* you are, not by how high
  the floor is.** Keying the hold's walls off "below deck level" made them
  apply to the exit ramp too, and they shoved you back up it every time.
- **Holes in the deck must not sit across the route.** The stair well was
  originally on the far side, which left a 0.4 m ledge between it and the
  bulwark — not a path. The stair is now on the side you come in, so climbing
  it leaves you on open deck with a clear run to the ramp.

**HER GEAR WAS THE WALL, AND THE WAIST IS ONLY 1.70 m WIDE.** The route
through her is breach → hold → stair → deck → wheelhouse → back down → shell
door, and the only way from the stair head to the wheelhouse door is down one
side of the house. The wheelhouse is 2.35 m off the centreline and the rail
is at 4.31, so a waist is 1.70 m of walkable deck — and a stowed basket stack
is 0.8 m, which with a body's radius round it is 1.32 of that. So gear in a
waist is not clutter, it is a 0.38 m slot at the rail: measured, walking +x
from every station across her, NOTHING got past the wheelhouse's forward
corner, and the wheelhouse — the wheel, the star, the head, the key, the way
off her — could not be reached at all. Three separate things were doing it
and each looked like scenery:

- a basket stack and a barrel in the starboard waist, which is the route;
- **her own hatch boards**, four 6 cm planks laid flat beside the coaming and
  given a full-height collider. 26 cm of stacked timber is a thing you step
  over, and as a wall it closed the port waist a hand's breadth from the
  coaming. The beach's rocks have carried this rule since they went in:
  anything whose crown lands under a step gets no collider at all;
- **the davit**, whose king post stood `HATCH_HZ + 0.75` off the centreline —
  0.75 m from the coaming, less than a body with the coaming's own margin
  either side. Out at the rail (`+ 1.75`) it leaves 0.92 m inboard and 1.03
  outboard, and a davit swings a load over the SIDE anyway; the boom is
  parametric, so it simply gets longer.

Gear goes forward of the stair and aft of the house now, which is where a
working boat would stow it. Measured after: the whole deck walks — stair head
to the door in one leg, and round her bow, both waists and the afterdeck
without a single leg stalling.

**The body bag.** `CORPSE_X/Z/YAW`, thirty metres short of the wreck — the
whole point of it is the approach, so everything about the placement serves
being seen from a long way down the beach:

- **It has to be clear of the water, and that is a hard number.**
  `shoreLine()` = tide(±3) + swash(±3.6) + wobble(±2), so the waterline can
  reach x = 8.6 and the sand plane discards a further metre seaward of it. Put
  the bag below that and the surf draws over the sand under it and it sits on
  the water like a raft. At `CORPSE_X` = 9.6 the body spans 8.9 to 10.3 and is
  never wet — measured, not guessed: sampling `shoreLineJS(-126, t)` over an
  hour of game time peaks at 8.13.
- It is skewed off the shore line with the head end nearest you, tipped onto
  one side, and settled into a `makeApron()` drift. That drift is kept **low**
  (0.085) — at the height it started at, its own shaded flank drew a dark halo
  round the bag.
- Four cylinders in `rockColliders[]` down its length make it solid. You walk
  round a body; you do not walk through one.
- The crosshair gets an **invisible box proxy**, not the model. The ropes are
  235k triangles and `updateHover()` raycasts every interactable every frame.
  Its label is `bare: true` — there is nothing to do here, which is the point.

**AND SHE WAS DRAWN AND NOBODY COULD SEE IT.** Everything below was on her
already — eighteen strakes, frames, fastenings, rust running out of every
one of them — and from the sand she was a smooth brown wall. Four faults,
and only the last is about the drawing:

- **`map` AND `emissiveMap` WERE SEPARATE CALLS.** `hullTex()` draws with
  `Math.random`, so `map: hullTex(...), emissiveMap: hullTex(...)` is TWO
  DIFFERENT HULLS — the lift never landed on the marks it was lifting, and
  half of what was drawn was cancelled by a highlight somewhere else. They
  are cached and shared now (`hullSet`), which is also two fewer 512s.
- **ANISOTROPY 1 ON A 28-METRE HULL.** `retroTex`'s nearest-and-no-aniso is
  right for a 256 canvas on a flat prop and catastrophic on something you
  walk the length of: at a glancing angle three picks the mip level off the
  worst derivative and averages the whole map away. Sixteen, and linear
  mips, on anything long.
- **AND NO NORMAL MAP AT ALL.** She is lit by one low moon, so a seam that
  is only DARK is a picture of a seam and a picture does not move when the
  light does. Every hull surface now draws its colour and its HEIGHT in the
  same pass — so the seam that is dark and the seam that is deep are the
  same seam — and `heightToNormal` differentiates it. This is the wreck's
  version of the lesson the Dealer's head taught: relief is what separates
  a surface from a picture of a surface.
- **THIRTY STRAKES OVER FIVE METRES IS UNDER A PIXEL.** 17 cm a plank down a
  28 m hull is gone at any distance; eighteen strakes at 28 cm is a real
  plank on a boat this size and survives being looked at from the sand. The
  pavilion's rule about patterns, on a bigger object.

**AND SHE WAS THE DARKEST PLACE IN THE GAME.** Measured as mean screen
luminance: the open beach reads 19, her hold read 12.5 and HER DECK READ
10.7. You climb aboard a wreck and find the darkest ground on the walk, and
the hold — which is where the captain's head, the catch and the way through
all are — was a black box you felt your way across. **One global multiplier
cannot fix it**: at the factor that brings the hold up the deck is still
dark, and at the factor that brings the deck up the hold goes flat. The
lifts are per material — the interior most, her deck next, her side least,
because her side was the one surface already catching the moon. Hold 12.5 →
17.4, deck 10.7 → 14.

**The hull had no UVs until Sep 2026.** `hullGeo()` and the deck plating set
only `position`, so `map: hullMap` sampled one texel and the wreck drew as a
single flat brown — the whole "it looks like slop" complaint was a texture
that had never rendered. Both write `uv` now (u along her length, v keel to
rail), the hull is smooth-shaded (a 44-station loft under flat shading is a
row of slabs), the map repeats ONCE up the hull so the weed line at the sand
appears once, and she is lifted off her own map like everything else on the
beach. If a wreck detail looks flat, check the geometry has `uv` before
touching the material.

**AND THEN IT COMES DOWN, IN FRONT OF YOU.** The take used to end with a
black card and the player back on the sand — you killed the thing in the ship
and the ship simply stopped being part of the story. The hall lets go, you are
set down on the beach UNDERNEATH the saucer still hovering where it took you,
and it comes apart over your head and goes into the sand twenty metres away.
Four beats on one clock (`CRASH`), each cue fired once, the camera TURNED and
never moved so every clamp still agrees and the hand-back is exact. What it
cost:

- **YOU MUST NOT BE STANDING WHERE IT IS GOING TO LAND.** `placeBackOnBeach`
  put you ten metres short of the saucer, which is inside the crash site's own
  collider — so the hull came down on top of you and the push-out then
  squeezed you across the beach and left you jammed against `CLIFF_BLOCK_X`
  for good. Twenty-seven metres back is where the whole of a twenty-six metre
  disc is in frame with seven metres of sand still in front of it.
- **`spawnPuffs` PICKS THE BIG CLODS OFF `i % 3`,** so a call with n = 1 is
  always i = 0 and always the FINE grain. The impact threw ninety separate
  single puffs and not one clod, and from twenty metres the sand curtain was
  invisible. Thirty calls of three.
- **A BALL AND A RING OVER A BLACK SKY READ AS TWO GREY SMOKE RINGS,** at any
  opacity, because additive pale-blue over nothing IS grey. What says
  "explosion" is the FRAME going white for a moment — the eye reads the whole
  picture, not the object — so the boom drives `flashEl`, the abduction's own
  card, and the fireball is small, briefly white and cooling to orange rather
  than big and pale.
- **The kit is built AT THE CUT, behind the black.** A fireball, a shockwave
  and forty shards of hull is a few milliseconds of geometry and the one
  moment in this take when a few milliseconds cost nothing is the one where
  the screen is already covered. The drain, the bunker and the pavilion are
  all warmed on exactly that argument.
- **The wreck STAYS.** A ship that blows up in front of you and is not on the
  sand afterwards is a video, not a thing that happened: the hull is parked
  driven in edge first, bedded into a `makeApron` drift in the beach's OWN
  `sandMat`, its lights out and one warm ember lamp in it, its meshes given
  their frustum culling back (they carried `frustumCulled = false` for the
  take), and one 10.4 m collider under it. A 26 m disc across a 16.6 m beach
  is a WALL — which is fine, because the abduction site is the dead end behind
  spawn and there is nothing past it. Getting inside it is a separate job and
  is deliberately not here.
- **And a downed ship stays down.** `crashDone` is on the save and is also
  inferred from `shrineWon`, the shell door's own rule — and because the model
  lands over the network long after the save is read, it is the LOADER that
  puts the hull on the sand when the flag is already set. Park it in the sky
  only if it is still up there.

**`farProps` IS FOR LANDMARKS, AND A CUTSCENE PROP IS NOT ONE.** Moving the
saucer's load to boot put it in `farProps`, which sets `visible` from your
distance down the walk every frame — right for the wreck and the dock, which
are always there, and exactly wrong for a thing that must be seen ONCE and
never otherwise. At the spawn the ship is 72 m away, comfortably inside the
320 m cull, so the list switched it on at the start of the game: a twenty-six
metre saucer standing on the sand in front of the player before they had taken
a step, AND at the world ORIGIN, because a group nobody has positioned yet
sits at (0, 0, 0). Two rules out of one bug — visibility for a cutscene prop
belongs to the cutscene, and anything loaded early must be PARKED where it
belongs at load rather than left at the origin waiting for its first update.

**AN ABDUCTION IS FOUR EVENTS, NOT A SLIDE.** The first take was a ship
descending on a smooth curve, a cone, and one steady hum switched on at the
trigger — nothing else in the frame moved, so it read as a picture with a
drone behind it. What it is now: the ship DECELERATES (a cubed ease, so two
hundred and sixty metres come down fast and the last thirty barely arrive) and
then never quite holds still, on a decaying wobble, because a thing that stops
dead has no mass; the beam PULSES and has grit turning over inside it, seeded
across the whole cone rather than emitted from the bottom, which is what makes
a shape into a force; the beach answers with sand off the ground and a lens
that shakes harder the closer it gets; and the sound is four one-shots on four
beats — something enormous coming down, the moment it stops, the beam taking
hold, and the moment it has you — every one of them low, because at the ear
any broadband hiss is a radio.

**THE SEA DOES NOT REACH THE SHIP.** The drain and the bunker are holes in this
beach and still belong to it, so they duck the surf and leave a little; the
hall is not on this planet and `shrineMix` takes the wave bus and the wind to
NOTHING. But silence is an absence, not an ambience, so the hall has a bed and
three things that happen on it — a hull groan on inharmonic partials (a bolted
shell is not a string), a distant knock with the room answering it, and the
orb's own two-sine beat, which swells as you close on it so the light is
audible before it is reachable. NOTHING ABOVE 240 Hz LIVES IN ANY OF IT: the
bunker paid for that when a CRT whine turned out to be tinnitus.

**THE FIGHT IN THE SHIP IS THREE FIGHTS.** One boss in an empty room is one
fight learned once. Touching the light now runs three waves, and the reason
they are three DIFFERENT things rather than more of one is that each takes a
different answer out of the same four inputs: three REPTILIANS who are a
crowd, flank, and DODGE a charge, so the heavy has to be bought; three DRONES
who are in the air and cannot be reached at all until they come down, so the
fight is a shot you sidestep and a swing you save; and the BEAST, ten points,
two enormous slow attacks, no way through but the parry. The first and third
are `MUT_KINDS` entries and are therefore almost nothing — the tell, the
commit, the poise, the parry, the riposte, the chain, the feint and the token
all come with the table. The drones are the only new behaviour, because
nothing else in this game flies.

**A DECIMATE RATIO IS OF TRIANGLES, NOT OF FACES.** The beast's body ships as
QUADS, so a ratio worked out against the face count comes out at twice the
budget the moment `use_collapse_triangulate` splits them: 15,000 asked for and
30,000 shipped, on the biggest asset here.

**READ EVERY MAP IN THE FOLDER BEFORE DECIDING WHICH ONES THE MODEL NEEDS.**
The alien animal shipped SEVEN and the first build used two. Measured, the
three that were left on the floor were not all worth having and the way to
tell was to look at their statistics:

- **the GLOSS map** (mean 119, stddev 28) is real surface variation, and
  without it the creature went out at one flat roughness over its whole body
  with nothing on it reading as wet. Gloss is the inverse of roughness, which
  is the whole conversion. It is the map that made its mouth and teeth read.
- **the EYE map**, while the 772-vertex eye mesh — which has its own UVs —
  was wearing the BODY's skin. Giving every mesh one material is the kind of
  mistake that survives a look at the silhouette and not a look at the face.
- **the METALLIC map** is deliberately not used. It ships at mean 98 stddev
  59, which is not the near-black a real metalness map for an organic
  creature would be; and METALNESS IS A TRAP here, for the third time — a
  metal has no diffuse term and this game has no environment map, so any of
  it renders as a dark shape with a couple of pinpoints on it.
- the 8K normal is the sculpt's source, baked down into the 4K one the body
  actually uses; and `Base-Diffuse` is a darker, lower-contrast twin of
  `Base-Color`, which is the albedo.

**AND BLENDER SHIPS A GENERATED METALLIC-ROUGHNESS PACK AS PNG.** Under
`export_image_format='AUTO'` the 1024 roughness map went into the GLB at
1000 KB against the albedo's 198 KB at the same size — a megabyte, on the one
asset whose download the cut waits for. Roughness is low-frequency: 512 and
`'JPEG'` makes it 46 KB.

**AND THE SHARDS WEAR THE HULL.** Forty planks in a grey box material under
a brown lift did not match the blue-grey saucer they came off — "the
pieces are brown". `makeCrashKit` clones the ship's own material (map,
normal, metal-rough) and `shedHull` gives each shard a hand-sized window
onto the atlas rather than the whole map per face; the glow is
`SHARD_HOT` in the air and cools to `SHARD_DEAD` at 0.48, which are the
numbers `placeCrashSite` writes onto the dead hull, so what lies on the
sand is one wreck. The clone carries `bwDead` so the site's own grade
leaves it alone.

**THE CARD IS BLACK, THE BOTTLE IS ONE DRINK, AND THE FISH TALKS ON THE
WALL CLOCK.** The intro's two lines came off on the owner's word: 2.6 s of
black under the heartbeat and the beach fades up (`INTRO_LINES` kept,
unused). `waterSips` is 1 and the empty is `removeFromInventory`'d as the
drink ends; and the drink's pitch was NEGATIVE — cap tipped up and away,
the base at the lips, "backwards" — so `MOUTH_POSE` is +1.95 with a little
lift, tuned live off `__bw.MOUTH_POSE`. `updateBilly` ran from `updateShip`
inside `update()`, which returns while a dialogue is open, so the one time
the fish had lines his mouth was never driven; it runs beside
`updateBradlyBlink` now.

**THE FISH SWITCHES ONCE.** Strobing between the two photographs at five
and a half a second was "moves too much, flashing": while he talks the
head comes round once and stays, and what moves is the plaque — a small
bob and a scale wobble at a mouth's rate. One switch in, one out.

**AND THE .BLEND IS THE SOURCE, NOT THE .FBX, AND THE HANDS ARE WHY.** Three
builds of SOL put the bleeding heart and its eight daggers at the figure's
THIGHS — "the heart and knives are not in its hands". Measured in both files
against the hem of the robe: in the .blend the heart stands at 1.118–1.313 m
and the hands at 0.974–1.233, which is a heart held in two hands at the
chest; in the .fbx the same heart is at 0.762–0.965 and the daggers are
squeezed from a 0.42 m span across to 0.21. The heart carries a GEOMETRY
NODES modifier and all eight daggers are PARENTED TO IT, and none of that
survives an FBX export. The blend also carries every texture PACKED,
including the heart's roughness map, which was never in the delivered
`textures/` folder at all. Two smaller ones from the same build: **a map
reached through anything but a bare link is still a map** (walking the socket
from the BSDF found fourteen of sixteen, and the robe's base colour came
through a mix node and shipped at 4096 — two and a third megabytes of the
asset on its own), and **a shift only works on an identity transform** —
writing `o.location` moved every object but the one that was neither parented
nor joined, which is a heart half a metre below its own body.

**THE TAKE IS 2.05 s TO THE CUT NOW.** Three passes: 5.30 end to end, then
3.95, now 2.55. Every beat is still there and in order — the ship decelerates
onto its mark, wobbles rather than stopping dead, the beam opens with grit
turning in it, you are lifted, it whites out — each given the time it needs
and no more. **And the park height came down with the clock**: two hundred and
sixty metres brought down in three quarters of a second is 350 m/s, which does
not read as a descent, it reads as a cut. `UFO_PARK` is 105.

**A ROUND ROOM IS NOT A BOX, AND A DOME IS NOT A FLAT LID.** `PhysProp.confine`
was written for the bunker, which is rectangular, so the hall had nothing at
all: the drones flew through the dome and the chandelier and a thrown wreck
went straight out through the ceiling. `confine` now takes `r` (a radial wall
about a centre) and `ceil` (a FUNCTION of radius), because the one number a
drum offers — `headMin`, the ceiling's lowest point out at the colonnade —
is the wrong number everywhere else: capping a wreck at 6.25 m while the
drones cruise between 6.4 and 7.7 meant a thrown one could never reach a
flying one at all, and the throw simply passed underneath. Asked at the
radius the body is actually at, both hold: a wreck hurled straight up stops
at 5.6 m near the rim, hurled sideways at r = 26.4 inside a 28.75 m room.
And the drones spawn just UNDER the lid rather than dropping in from above
it, which was the same clipping wearing an entrance.

**AND `use` ON A HOLDABLE ITEM IS THE HOTBAR'S VERB — the captain's head's
own lesson, broken again one item along.** The wheelhouse key is `holdable`,
so the pack's second button says HOLD and the hotbar's digit means hold; both
call `use`, and `use` opened the examine screen. The one thing you could not
do with the key you had just pulled out of a dead man's mouth was hold it.

**8 IS A LATCH, NOT A KEY YOU HOLD.** "Make 8 the max walk speed" was read
as a number the first time — the constant that comes out as eight at the
owner's own slider — and what he meant was the KEY: pressing 8 makes the top
speed your walk and pressing it again gives the ordinary pace back.
`fastWalk` turns the sprint off while it is on rather than stacking with it,
because there is nothing above the top speed to reach for and letting shift
still drain the bar would be charging you for a speed you already have; it
costs no stamina, since it is a gait and not an effort. Digits 1-6 are the
hotbar, so 8 was free. **And a latch with no visible state is a latch you
press twice to find out what it was doing**: the FAST tag beside the stamina
bar is in the HUD's own language — mono, letter-spaced, hairline, no colour —
and it is the whole reason the toggle is usable.

**METALNESS IS STILL A TRAP.** The blade ships at 0.94 and rendered as a
black slab with one pinpoint on it. Steel on this beach is a bright rough
dielectric (0.22 / 0.62) with the map multiplied down a touch and a small
COLD emissive, so the dark steel keeps its colour under the moon.

**AND THE PRIZE MUST NOT BE LOST IN THE WRECKAGE.** A dark olive scan lying
among a dozen planks on a steel floor is invisible. When the case spills, the
shovel's glint is moved over the middle of it and its `shinies` entry is
driven far harder than the one it wore in the case (strength 2.6, lift 1.1).

**THREE OF THEM, AND ONE SKIN EACH.** The pack ships three texture sets, so
the variations ARE the sets: 02 is baked into the GLB and 01 (flayed red) and
03 (dark green-brown) come out of the build as loose 150 KB colour JPEGs. One
download, `GLTFLoader.parse`d once per unit — a skinned mesh cannot be
`clone()`d — and two of the copies swap `map`. The material must be cloned to
do it: `parse` hands every copy the same one. Only the albedo changes; the
sculpt is shared, so one normal and one roughness serve all three. What makes
them read as different animals is `MUT_KINDS`: height, health, and scalars on
speed, startup and reach, with the swing table SCALED per kind rather than
restated (`windK` moves startup and recovery together, so the big one's reach
is paid for with the punish window), plus which swings it owns and a `voice`
— a pitch and two weights that every sound it makes goes through.

**THE BIGGEST THING ON THE BEACH WAS DRAWN FOR THE WHOLE WALK, AND THE RULE
THAT SHOULD HAVE CAUGHT IT WAS WRITTEN TO LEAVE HER ALONE.** Profiled by
hiding each top-level scene child in turn and reading `renderer.info.calls`
back, at sixteen stations from the spawn to the fence: **the shipwreck was
162 draw calls at EVERY ONE OF THEM** — at the pavilion a third of the frame,
at the tower half of it, and at the fence she is nine hundred and eighty-five
metres behind you. She was in no `farProps` entry (her DRIFT was, at 220; she
was not), and `cullBeyondFog` deliberately exempts anything bigger than
`SKYLINE_R`, because culling a landform does not remove a dim object, it
opens a hole in the fog. So the one rule that covers everything nobody
remembered to register is the one rule that could not cover her.

- **`farProps` at 240 m.** `FogExp2` 0.014 leaves 0.007 % of her there; the
  list's own numbers are 260–340 for the same reason.
- **AND `bakeStatic` HAD NEVER BEEN RUN ON HER.** It is for BUILDINGS and she
  is the biggest one in the game: 158 meshes, 85 of them unnamed, childless
  and unflagged, merged by material into 17. Her hull quads already carry
  `noBake` (they are lifted off their own maps and must keep them) and every
  part this file holds — the wheel, the gaff, the head, the lantern, the hold
  door, the barricade — is named or flagged, so all six survive the merge and
  were checked to still be in the scene afterwards. It runs on a `warmStep`,
  which is after the module has finished hanging things on her.
- **And the drainage tunnel home was the same bug, smaller**: 29 draws a
  frame for a building that stands at the dead end BEHIND the spawn and is
  never looked at again after the first hundred metres.

**AND THE ARTIST'S OWN ACTION WAS SHIPPING AS A T-POSE.** `Swing` is adrigon's
clip on adrigon's control rig; it is sampled at the top of the packer and
re-keyed onto the deform bones as `sSwing`, and the source action itself was
never removed. The exporter ships every action it can find, so 31 frames of it
went into the GLB - and rendered as a strip it is a man standing in a T with
the katana waving about in front of him, because it drives control bones the
export drops. Anything that played it would T-pose the boss. This is the
`Armature|mixamo.com|Layer0` trap wearing the source file's own name.

**AND A CARRIED BOARD IS PULLED IN BY WHAT IS IN FRONT OF IT.** This is the
whole of how it ended up lying inside the masonry, and no amount of push-out
could have fixed it: three metres of plank pointing where you look, carried up
to a wall, reaches a metre and a half INTO it — and `keepWallNear` only looks a
quarter of a metre round a sample, so once the board is half a metre deep in the
stone there is no face near enough to push it back out, and letting go there
leaves it in the wall for good. Half-Life's own answer is that the thing you are
holding comes back toward you: a segment from the camera along the board's axis,
bisected for the first face, and the hold pulled in so the far end stops short
of it. Measured facing five walls: released, 0 of 5 leave any part of the board
inside drawn stone. **And it may not pass through a wall between frames either**
— a hard throw moves it a third of a metre a step, so the move is tested as a
segment and reverted if it crossed a face, the player's own rule.

**AND A HOLD THAT NEVER RESOLVES IS THE STUCK.** "A tomb is not a step" gave
the hunter a HOLD when the lookup answered with a lid: he keeps his height
and the push is meant to slide him off its footprint. In the corner of a
sarcophagus and a wall there is nowhere to slide him to, so he keeps it for
ever — which is the owner's photograph, the thing hanging in the air over a
tomb with its arms out. After a second and a half he is handed the storey
UNDER him instead (`keepFloorAt` with no step allowance, which is the one
question the hold never asks) and climbs down off it.

**AND A CONE THAT IS MERELY SMALL IS STILL A CONE.** `MAG_SPREAD_ADS` was
0.0025 rad with a `magAim > 0.6` threshold; it is ZERO now and the spread
eases with the sights rather than flipping, so half-aimed is half as tight
and the movement penalty costs you almost nothing once the gun is up.
Measured: down the sights 0.0000 degrees over sixteen shots, from the hip a
1.95-degree cone with a 1.22-degree median.

**AND WHAT IS NOT STUCK HAS TO BE NAMED, OR THE NET BREAKS THE BEST THING HE
DOES.** An act is standing still on purpose; so is the hold at the end of a
peek, which at a 2.5 s leash would have been interrupted every single time;
and a fight is fought at arm's length with no ground covered at all. Measured
hands-off over three minutes in the catacombs, excluding exactly those: the
worst stall he has is **0.57 s and there is not one over four seconds**,
against 17 s before, and he still crosses 42 m to close on you.

**AND WHAT WAS LOOKED AT AND LEFT ALONE.** The wreck is 86-93 draws inside
the fog and 36 of its 90 meshes are held by name or by `noBake`; the
remaining fifty-odd sit under a `noBake` group somebody set on purpose in
`models/shipwreck.js`, and thirty draw calls on the one set piece the owner
has asked about most is not worth guessing at that flag. The lighthouse
draws nineteen from 1.2 km and is the one thing on the horizon. And the two
decorative horseshoe crabs are 49k triangles each in ten draws — triangles
have never been this game's problem.

**AND THE FACE IN THE PIPE IS DEEPER IN THE DARK AND LEAVES SOONER.** Peak
0.62 → 0.52 and lift 0.66 → 0.54 (max 49 / mean 17 becomes max 41 / mean 14
against a pipe at max 11), the rise 3.0 → 2.4 s, the hold 1.2–2.3 → 0.75–1.55,
and the fall 2.4 → 1.7. Three seconds of coming and two and a half of going is
a long time to look at a thing you have already understood.

**THE BARRICADE WAS NOT THERE ANY MORE.** The barricade across the quarters
door carries its own note saying it is "its OWN GROUP, never baked" — and the
function that note names is `bakeGroup`, which skips Groups. `bakeStatic` does
not: it TRAVERSES, takes every unnamed mesh whose ancestors do not say
otherwise, and re-parents the merge. `warmStep('wreck merge', …)` was added to
the wreck later, and measured in the game the barricade came out with **thirteen
orphaned slabs and an empty group**. What that ships as: you break the door,
`SN.props` loses the box so the collision goes, `smashBarricade` iterates
`g.children` and throws nothing, `g.removeFromParent()` removes an empty group
— and the barricade is still standing there, and you walk through it. One
`userData.noBake` on the group. **A comment that says "never baked" names ONE
merge; check every merge that has been added since.**

**AND ITS CROSSHAIR MESHES ARE SNAPSHOTTED, so it may not be rebuilt.**
`addInteractable` walks the root ONCE and keeps the list, so a piece of the
barricade that arrives over the network later is invisible to the blade. That
is why the furniture set is used everywhere in her EXCEPT the barricade: it is
measured against a 1.10 by 1.95 hole, it is the door the owner asked to keep,
and there is nothing to gain by putting a thing that lands seconds late into
the one object whose whole job is to be hit.

**THE FURNITURE IS A PLAN AND A GROUP, AND THE TWO ARE SEPARATED BY THE
NETWORK.** `makeShipwreck` runs at module time; `assets/furniture.glb` is
2.4 MB. So the PLAN (piece, x, z, yaw, footprint) is walked twice: once at
build, to push the solid boxes into PROPS, and once in `S.userData.furnish(scene)`
when the download lands, to stand the meshes in them. Collision is right on the
first frame whether the model is there or not — the captain's head's own
arrangement. It is merged on arrival (`bakeStatic(g, undefined, { named: true })`),
because the wreck's own merge ran long before and nineteen pieces is nineteen
draws.

**AND THE ROOM HAS TO STILL WALK, WHICH IS A FLOOD AND NOT A WALK TEST.**
Three rounds of "steer at a target and see how far you get" measured nothing
useful, because every start and every target I picked by eye turned out to be
INSIDE something — the barricade's own box, a chair, a barrel. A flood over the
free cells with the player's own radius answers it in one number, and the one
that matters is REACH against FREE: the first layout gave 9.4 m² free and only
8.6 reachable, with the aft corners stranded behind two barrels, and the mess
straddling the centreline so the walk from the door to the stove was 1.65 m of
slot. Everything the mess is made of went against her starboard side and the
barrels into the corners: **9.8 m² free and 9.8 m² reachable**, a 2.25 m
walkway down the port side, and the hold 56.4 of 56.4 against 70.2 empty.

**HER NAME COMES OFF BY BEING REMOVED, NOT BY BEING WORN AWAY.** Paint eaten to
nothing is still a rectangle of different weathering on the planking. The
topsides decal and the wheelhouse board are gone, and their two textures with
them; her REGISTRATION stays on the bow, because that is a number and not a
name.

**AND A CUT-OUT'S `--inset` HAD EATEN BOTH FRAMES OF THE FISH.**
`plaque_cutout.py` trims a proportion off every side before it floods, which
exists because these photographs are vignetted — and measured, both shipped
Billy frames were CLIPPED BY IT, in different directions: the idle lost its
left and right edges (33 and 74 rows of opaque pixel sitting on the frame
border) and the talk frame lost its top and bottom (467 and 598 columns). A
plaque with a sawn-off edge is the whole of "the cut-outs look strange". The
vignette is one pixel deep, not thirty-six: profiling inward from each edge,
the talk frame reads L 77–102 on the outermost row and L 152–182 by the fourth.

Three things had to be added to cut them at an inset that keeps the plaque:

- **THE SHADOW UNDER A PLAQUE IS NOT PART OF IT.** The talk frame is a thing
  standing on a table and the band below it reads L 1–8, against the plaque's
  own dark moulding at L 42–51. Both fail a brightness floor, both are grey,
  and the two TOUCH — so neither colour nor connectivity can separate them.
  `--dark` (a ceiling under the moulding) and `--trim-shadow` (scan up from the
  bottom edge and stop at the first row that is not that dark) do.
- **AND A WASHED-OUT THUMBNAIL HAS NO SATURATION TO KEY ON.** The idle frame's
  oak reads S 7–29 against a wall of S 8–17 — they OVERLAP, which is why the
  shipped cut had a smear of wall left down its right-hand side. `--sat 22`
  with `--luma 90` is the only window that takes the wall's own shadow and
  leaves the wood.

**AND THEN THE TWO WERE REGISTERED ON THE PLAQUE, NOT ON THE IMAGE.** They came
out at aspects 1.371 and 1.536, and the game sets the plane's WIDTH from the
picture's aspect — so the plaque grew by a ninth and shifted on the wall the
moment he opened his mouth. That is what the frame change actually looked like:
not a fish moving, a picture being swapped for a bigger picture, which is most
of "it flashes". `tools/billy_frames.py` finds each plaque's PANEL — the columns
and rows opaque over most of their length, which is the wood and not the jaw
hanging off the side of it — and puts both on one canvas with the panels on top
of each other. Both frames are 648 × 500 now and the plane never changes shape.

**AND THE SWING IS THE ANIMATION.** What shipped held the head-out photograph
for the whole conversation with a 2.5 % scale wobble on it: a still and a
shiver. A Billy Bass's head comes off the board on a hinge and goes back, over
and over, roughly in time with the words — so with the frames registered the
swap IS the move and nothing else has to be drawn. It goes in BURSTS of two to
five at about three a second with a beat of nothing between them (measured off
the running game: 0.18 s out, 0.16 s in, four swings, 0.53 s of pause), and the
cut is hidden in a JOLT — a damped spring in a squash, a bob and a roll about
the plaque's own normal, released at full when the head comes out and at half
when it goes back. `rotation.z` is the roll, because three composes XYZ and a
plane's local +Z is its normal, so the picture turns in its own plane: a plaque
shaking on its screw. And there is no third frame: `billy-shut.png` never
existed, 404'd on every load for months, and the talk frame's jaws are only
parted anyway.

**A SCAN REPLACING A BUILT MODEL IS FITTED TO THE BOX THE BUILT ONE
OCCUPIED.** The horseshoe crab is the owner's `limule.glb` now, and every
number downstream of the built one — the view model's 0.5, the 0.30 m hit
proxy, the shine's 0.8, the extraction's `_hinge` — was tuned against a
0.428 × 0.215 × 0.756 box. So the scan is scaled to that WIDTH and centred on
that CENTRE, both measured off the model it replaces rather than typed, and it
happens to agree on its proportions (0.744 m long against 0.756) and on its
frame (+Z the head, -Z the telson, +Y the carapace). Measured after: the needle
still bites the shell 2 cm inside the surface at the hinge. `hcrab` is an empty
Group the scan lands in — the captain's head's arrangement, so the hand, the
pack icon and the examine screen all hold the same object.

**AND THEN EVERY PIECE WAS AUDITED, AND SIX OF THEM WERE INSIDE SOMETHING.**
"Make sure all models have collision and do not collide with other objects"
is a measurement, and `tools/furniture_audit.py` is it: the plan is read out
of `models/shipwreck.js` and asked four questions — does every piece have a
solid box at all, does any piece's turned footprint meet another's, does any
meet the wreck's OWN gear (`shipwreck.userData.nav.props`), and does any
stand through her planking (`halfAtY` at its own station and its own height).
Run on the first layout it found SEVEN faults, and not one of them was
visible from the side I had been photographing:

- the tipped stool had **no box at all** and was lying through the bench;
- a cask in the bow was **15 cm inside the next cask**, and the staved one
  28 cm inside the one beside it;
- a chair was standing **26 cm inside the end of the gutting bench**;
- and two more were within a centimetre of touching.

Three things the audit needed before it could be trusted:

- **A CYLINDER IS A CIRCLE.** Testing a cask by its axis-aligned box
  overestimates it by 0.41r and moves casks that are already clear.
- **A SEPARATING-AXIS TEST MUST RETURN THE BEST AXIS, NOT THE FIRST.**
  Written to return the first axis that separates, it reported two boxes
  ELEVEN METRES APART as two centimetres clear — true, and useless, because
  a threshold on that number flags everything.
- **AND `halfAtY` HAS A FLARE IN IT.** Reimplementing her section without
  `flareAt` is conservative by up to a third of a metre in the bow, which is
  enough to move three casks that were never through anything.

**AND A FOOTSTOOL TIPPED OVER IS A SLAB ON THE FLOOR.** `chair_4` is 0.45 m
across and 0.50 tall; at this texel count, lying on her boards in the dark,
it read as a pale rectangle and not as a stool. It is out. The crew space's
own lesson — a thing too small to be what it is reads as a small pale lump —
applies to furniture as well as to litter.

Measured at the end: the audit is clean, the quarters are **9.5 m² free and
9.5 m² reachable**, the deck 190.8 of 190.8, and the hold 55.1 of 55.2 —
the 0.14 m² is a 0.6 by 0.1 m slot behind the forward cask against her
planking, which is what stowing a cask against a ship's side leaves. And
flooded from the breach, the quarters are NOT reachable: the barricade is
still in the doorway, which is the one thing about that room that has to
stay true.

**AND SHE IS HELD DOWN BY ROCK.** The wreck read as a hull somebody parked on
flat sand, because nothing was touching her. Everything about where the stone
goes is asked of HER rather than typed: `halfAtY` is her own section at the
height each boulder leans on, so it beds against the plating at every station
— she flares at the bow and tumbles home aft, and a line laid on one beam
stands a metre off her at both ends. The masses are at the bow, where she
struck; the line thins aft into the sand she is buried in.

- **TWO STATIONS ARE LEFT ALONE, AND THEY ARE THE TWO WAYS THROUGH HER.**
  The BREACH on the side you walk up to and the SHELL DOOR on the side you
  leave by, kept clear by her own constants (`BREACH_X0/X1`, `DOOR_X/W`)
  with a body's width of margin, so moving either moves the gap. Measured:
  0 of some fourteen hundred sampled points in either doorway lane is inside
  a rock, and all three breach lanes still walk straight into the hold.
- **AND A ROCK BESIDE A HULL IS A LADDER IF YOU LET IT BE.** `rockGroundAt`
  lifts you onto anything within a step, so a line of two-metre boulders
  against her side is a way onto her deck that skips the whole route through
  her. Measured by dropping the player onto all twenty reachable crowns and
  pushing at her side: the highest he ever gets is **1.61 m** against a deck
  at 3.20 and a rail at 4.05. The tallest crown anywhere in the walkable
  band is 2.34; the big ones are at the bow, which is past `WADE_X`.
- One draw call and 9,168 triangles: the group merges ITSELF, because the
  wreck's own `bakeStatic` ran on a warm step long before this could be
  there.

**THE CHEST IS THE OWNER'S OWN MODEL, AND THE ARTIST HAD ALREADY DONE THE
HARD PART.** `Medieval_Chest.blend` ships as THREE meshes — `Bottom`, `Top`
and `Padlock` — so the lid was already its own object and could be hung on a
real hinge rather than carved out of a solid, which is what the ten hand-built
boxes it replaces never had. `tools/chest_pack.py` runs itself inside Blender
(the .blend is the source; `head_pack.py`'s arrangement), multiplies the
occlusion into the albedo (nothing here consumes an AO map and the chest
stands below decks where the only light is each material's own emissive lift),
drops the metalness for the tenth time, resizes on disk and repoints the
datablocks (`sol_pack.py`'s trap: the exporter reads `filepath`, not whatever
buffer was last scaled), and 91 MB of PNG becomes 827 KB.

- **THE HINGE IS MEASURED AND WRITTEN INTO THE FILE.** The packer boxes the
  body, takes its own rim height and its back edge, and puts them in the root
  node's `extras` as `bw_chest` — which GLTFLoader hands straight to
  `userData`, the way `bw_walk` and `bw_nav` already cross from a packer into
  the game. Repack the chest at a different size and the lid still turns about
  the wood.
- **AND THE ARRANGEMENT IS BUILT EMPTY.** The scan lands long after
  `makeShipwreck` has run, so what the wreck builds is the GROUP, the hinge
  pivot, the collision box and an invisible `hitProxy` — and `dressChest`
  fills it when the download arrives. The proxy is not optional: an
  interactable's meshes are snapshotted ONCE, at registration, so a group that
  is empty at that moment is a group the crosshair can never find again.
- **AND A DEEP DOMED LID MAY NOT OPEN FLAT.** Half this chest's height is
  lid, so past the vertical it is not the lip that reaches furthest back, it
  is the crown, and the keg it stands in front of is a hand's breadth behind
  the hinge. 1.42 rad — a shade under vertical, which is where a lid rests on
  its own hinge anyway.

**THE HELM'S STARS WERE HIDDEN BY THE WINDSCREEN'S DEPTH.** The wheelhouse
glass (0.38 opacity) is merged by `bakeStatic` into one mesh whose sort
position is the ship's origin, not the window — so it could draw BEFORE the
three stars 190 m out, and it wrote depth, so it then hid them. Measured from
the helm: the stars read 81-103 of brightness through it and 164-554 without.
Glass writes no depth now (`models/shipwreck.js`). A merged transparent mesh
sorts as one object at its origin; anything behind it that must show through
it cannot rely on the sort.

**THE HELM'S STARS GO WHEN THE PUZZLE IS SOLVED.** `helmStar.solvedT` counts
up once the bearing is held; after 1.6 s the stars fade to nothing and the
group is hidden, so the sky over the wreck is the night's own again.

**A CHECKPOINT ON THE FAR SIDE OF THE WRECK** (`updateWreckSave`,
`WRECK_SAVE_Z` = `SHIP_Z - 11`). She spans z -162.3 to -147.6 and blocks the
whole beach, so a body's width past her far side means you came through her.
It is short of the dock's trigger (z -177) on purpose: loading it puts you in
front of the three crabs, and the pavilion's save is still to come. **And a
line is passed if the SAVE is past it**: `beginRestore` used to set
`checkpointDone = true` on every load, so loading the dock's save switched the
pavilion's off for good. Both flags are read off the save's `beachZ` now.

**BILLY'S CUT-OUTS ARE VISION'S SUBJECT LIFT (`tools/subject_cutout.swift`),
AND HE TURNS ONCE.** Colour keying could not tell his white chin from the
white wall (a wedge of wall rode on his jaw) and tore holes in the idle
frame's jaw. `VNGenerateForegroundInstanceMaskRequest` (macOS 14+) asks what
the object is. `tools/billy_frames.py` registers both on the plaque's panel,
histogram-matches the washed-out idle thumbnail to the talk still, and leaves
118 px either side (`--margin-x`) because his snout and jaw hang past the
wood. In the game he turns out as EACH line starts (`dialogLineN`, bumped by
`showDialogNode`), goes back to the board 0.45 s after that line has finished
typing (`typeFull` null), and is a fish on a plank while you pick an answer. **A test that runs frames on a
fake clock never finishes a line**: the typewriter is a real `setInterval`.

**THE CAPTAIN'S HEAD IS CARRIED BY THE HAIR.** Solved onto the screen at NDC
(0.46, -0.46), 0.70 of the frame tall, face three-quarters to you so the key
in the teeth reads; the held copy clones its materials (the world copy's
night lift burned it to flat pink under the view-model lights) and keeps the
key brass (`mat.userData.bwKey`); `headSway` swings it on a damped spring
off your turning and your walk.

**THE FISH KNOWS WHERE THEY WERE GOING.** Billy has two more nodes, `heading`
("We were told to follow the stars.") and `who` ("The captain, of course."),
off "Where were you heading?" on `start` and `head`. It is the wheel's star
puzzle said out loud by the one thing aboard that was there.

**THE SEA'S HOLE IS CUT INSIDE HER, NOT ROUND HER.** `uShipHW` was her widest
section plus 0.22, so wherever she tumbles home the sea was punched out
beside the plating and a wave reaching her foot vanished instead of lapping
against her. It is now the narrowest section over the swash band
(y -0.4..0.6), drawn in: `min(halfAtY) * 0.9 - 0.08`. The bed reads the same
array, so the hole and its bottom still agree.

**THE IMMOBILIZE IS A BEAT, WUKONG'S WAY.** On the third hit: a longer world
hold (0.14 s) with little shake, a golden SEAL with 定 stamped onto the chest
(`artSealOn`, a drawn canvas — Songti on macOS) that sinks INTO the body
after 0.35 s (left on the chest it covered the thing that was held), flares
on every blow and comes back up flickering as the hold gives; two thin rings
of light across the ground (`artRingAt`; thick, they swept under the lens as
a slab); a gold vignette flash (`artFlash`); a bronze gong under the bell;
the body GILT (a glaze, glitter and a band of light running up it in the
sheen shell); gold sparks on each hit of the chain; and gold flakes falling
off as it lets go. `tools/immob.js` captures it on a fake clock — pin the
creature's `visible`, the horde is hidden until its take.

**THE WHALE MARK IS A HUMPBACK**, not a fish: a pleated throat, tubercles, a
long knobbed pectoral fin, a low dorsal hump and edge-on flukes, in a bronze
gradient with a dark drop shadow. Shuriken do 1 (was 2).


**THE HELM'S STARS TWINKLE; THEY DO NOT BLINK (`helmStarTex`, `starPuzzle.update`).**
They were two spheres each (a solid disc and a pale one) switched bright and
dark on a count — "flashing a solid color". Each is two additive sprites now
(`core`: a hot point with diffraction spikes; `halo`: a cold bloom — the old
handle names, so the save and harness still find them), driven by a sum of four
unrelated sines and a hash flicker off its own seed (brightness, spike length, a
cold-blue-to-white colour, a few degrees of spike wobble). The star being asked
for twinkles harder and FLARES (`st.flare`) on the blink's old irregular count;
the others shimmer faintly. Two things measured: dips deeper than about half
read as blinking again (`sc` floored at 0.55), and at the retro scale thin
half-alpha spikes become a dot, so they are drawn bold.

**BILLY WANTS TO BE TALKED TO (2026-10-12: play testers missed him).** Prompt
"Talk to the fish" (was "Fish?"); a motion sensor like the toy's — within
6.5 m and not yet spoken to, his head swings out at you (frame 2 + the kick)
every 8–14 s with a gearmotor whirr (`sfxBillyWhirr`); and a "…" speech-bubble
sprite (`billy.bubble`) bobs by the plaque, fading in near, out far. Both stop
once `billy.talked`.
