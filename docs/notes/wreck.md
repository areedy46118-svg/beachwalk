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

**HER SURFACES ARE REDRAWN, AND PAINTED BEHIND THE LOADING CARD
(2026-10-10).** The owner's word on her was "AI slop": every surface was a
small canvas of blotches multiplied down to brown, and from the sand she was a
smudge. Eight maps now — `hullMaps` 2048x512, `deckMaps` 1024x512,
`plankMaps` 1024x256, `paintMaps` / `innerMaps` / `soleMaps` 512,
`woodMaps` / `metalMaps` 256 — each painted in FLOATS (`surface(w, h)`, a
colour and a HEIGHT per texel), and the normal map is a Sobel of that float
height written in the same pass (`S.paint`). What makes it read as a boat
rather than a pattern:
- **boards are COURSES** (`courses`), seamless on the phase, each board its
  own tone and grain, the butts staggered — so the seams are the lines on her;
- **the paint is FAILING, not drawn as blotches**: white topsides over the
  planking, flaked where a noise field passes a threshold with a dark lip
  round each flake, a boot-top stripe, antifouling under it, algae and a salt
  line where the sea reached, frame nails with rust running out of each one,
  barnacles and weed low on her;
- **every field TILES** (`vnoise` / `field`): a map that does not tile is a
  seam at every repeat, and the deck repeats.

Painting floats at that size is not free (1755 ms inline), so
`makeShipwreck({ deferPaint: true })` builds every texture BLANK — its own
base tone and a flat normal, so no material recompiles when it is painted —
and hands the painting to the boot's warm chain (`wreckPaintJobs()` →
`warmStep('wreck paint <map> <k>')`), the hull in five steps. Measured:
147 ms at module load, worst step 80 ms, all behind the card. **Allocating
the float buffers per map put a garbage collection inside the NEXT step**
(225-525 ms): one pair is pooled, owned by one map from its first draw step
to its write-out (`_poolOwner`), and a map that finds it taken gets its own.

**AND THE LIFTS CAME DOWN WITH IT.** A drawn map carries real darks and
lights where the blotches were mid-tone, so at the old emissive levels the
hold read half again brighter and orange. Interior lifts: inner 0.86 → 0.60,
sole 0.54 → 0.40, deck 0.34 → 0.25, plank 0.28 → 0.22, paint 0.30 → 0.25.
Mean screen luminance against the old build: hold aft 17.8 → 20.0, hold
forward 12.6 → 15.4, deck 16.8 → 17.1, wheelhouse 23.9 → 25.5. The outside
views move with the sky and the surf from one capture to the next (±3) and
match within that.

**A JUMP PUT YOU INSIDE THE WHEELHOUSE, THROUGH ITS WALL.** `inBridge` was
set by "feet above the sole less 0.35, within a body's width of the walls",
and a jump off the deck peaks at 3.82 against 3.75 — walk up to the house's
front or back, jump, and you were standing on its floor. It wants the feet AT
the sole (less 0.15) and the body INSIDE the walls now; the door is still the
way in. Three more, all pops of a third to three quarters of a metre in one
frame, all found by the sweep below:
- **THE EDGE OF A HOLE PUSHED THE WRONG WAY.** The hatch coaming and the
  ladder well's lip pushed anything in their ring OUT by the shallowest face
  — right for a body walking on the deck, and wrong for a body already in the
  hole: the deck is within a step of it, so a body falling near the edge was
  lifted out onto the deck (0.43 m). `shipHoleEdge` asks where you were
  BEFORE this frame's step (`_preMove`): in the hole, you stay in it (and the
  floor under the new spot is asked again, or the frame lifts you anyway);
  coming down from a jump, whichever side is nearer; walking, out. A jump CAN
  clear the coaming into the hold — it is an open hatch, and the ladder is
  there to climb back.
- **THE RAMP OUT OF THE BREACH STARTED AT A FIXED 3.45** while her sole
  narrows to 3.4 at the breach's forward end, leaving a strip with no floor —
  and no floor inside her hull means "slide out of her": a step onto it threw
  you out through her side (1.14 m). It starts where the hold's floor stops.
  And a body leaving the breach at a slant crosses its forward EDGE still
  inside her hull line, where the same rule threw it out through the plating
  (0.73 m): the no-floor push now takes whichever is nearer, out through her
  side or back into the breach (or the open shell door).
- **THE WHEELHOUSE DOOR'S JAMBS.** A body entering the doorway at a slant
  could slide out of the door's width while inside the wall's thickness and
  be snapped into the room by a whole body radius (0.77 m). A body that was
  in the wall's thickness last frame is held to the door's width instead.

- **THE COMPANION LADDER'S SIDES.** Its "solid from below" box came in at a
  full body's width the moment the treads rose past the knee, so walking
  along its low end was a 0.33 m shove sideways. The side margin grows from
  nothing to a body's width over the next 0.4 m of rise.

- **THE LADDER AND THE DOOR STEPS HAVE RAILS, AND NOW THE WALK DOES.**
  Climbed at a slant you stepped off the companion ladder's side through its
  handrail 1.4 m up and dropped back into the hold, and the wheelhouse steps'
  walkable floor ran 8 cm past their drawn rails. A body that was ON the
  treads last frame (`_preMove`) is held between the rails; the ladder's
  foot (the first treads) and head are open, and the steps' floor stops at
  the door's half-width + 0.14.

Measured after, the whole ship (`__shipSweepAll`): 1,646 walks from 207
spots, nobody trapped, no body left standing on air; worst single-frame move
0.06 m in the wheelhouse (was 0.42), 0.12 in the hold (was 1.14), and on deck
0.09 everywhere but jumps into a crate wedged at the rail (0.23). A walking
stride is 0.057.

**`tools/shipsweep.js`** walks every spot on the deck, the wheelhouse or the
hold into eight headings, jumping, and reports the worst single-frame move,
walks that fall a metre through her, bodies left standing on air (a ray DOWN
onto what is drawn — her station half-width is no test at the bow, whose
raked planking runs past ±HALF), and trapped spots. Two traps in it: `onShip`
and `inBridge` are sticky module state, so a teleport onto the deck from
inside the wheelhouse is clamped straight back in — teleport off her first;
and the walk carries its momentum across a `tp`, so let it die and put the
body back. The green floats along her port bulwark have no collider on
purpose: 0.4 m, stepped over.

**THE WHEEL ANSWERS NOW (2026-10-13).** The puzzle gave almost nothing back:
the only sign of progress was which star flared next, and a star you had set
dropped straight back to the sky's level. Now:
- **a set star STAYS LIT** — steady, bright and warmer than the sky — until a
  wrong star puts it out, so the sequence so far reads at a glance from the
  helm or the deck;
- **each set star is a NOTE** (`sfxStarChime`: a struck bell, inharmonic
  partials, rising a third a star), the last one under the old `sfxStarSet`;
- **the star being asked for SWELLS while you hold the cap on it**, so holding
  is something you watch work instead of a timer you guess at;
- **a wrong star is answered**: with stars set, settling on an unlit wrong one
  costs them — she groans (`sfxHullGroan`, the saucer crash's own), the deck
  shifts (trauma 0.14) and the set stars GUTTER out over a second rather than
  switching off. With none set it only creaks and the wrong star shrinks back.
  `wrongFired` latches it once per settle.
- **progress survives letting go of the wheel.** `begin()` reset the sequence
  on every grab, which was invisible while nothing showed it and a punishment
  once set stars stay lit. And a star already set is NOT a wrong answer —
  looking back at it to check is not a mistake worth the sequence (the old
  `justDid` forgiveness, extended to every set star).

**AND AT THE HELM THE LENS LEANS IN (`HELM_FOV` 62, `helmFovK`).** The stars
are 190 m out and at the walk's field of view of 105 each was three or four
pixels — no bigger than the sky's own stars, so none of the above could be
seen. Measured by projecting each star and reading the pixels: they WERE
drawing, bright, glass or no glass; they were simply points. Gripping the
wheel narrows the view to the windscreen and the sprites are a third bigger.
`helmFovK` is its own variable declared above `updateDialogCam` — `helmT` is
thousands of lines below it and the frame loop starts before the module has
finished loading.

**THE SHELL DOOR SAYS LOCKED FROM THE SIDE YOU MEET IT ON (`holdLock`).** You
reach that door from INSIDE her, from the hold, long before you have a key —
and every part of the lock the model draws (plate, keyhole, ring) is on its
OUTBOARD face. From the hold it was a dark recess behind the ladder. The
inside face now carries a chain from a staple on the latch jamb to a ring bolt
on the leaf, with a brass padlock through the staple, a small cold pooled lamp
off the door, and a glint on the padlock that CATCHES as you cross the hold:
strongest on one bearing from the door (az -0.42 rad), which the walk from the
breach to the ladder sweeps through — measured along that walk 0.28, 0.57,
0.95, 0.54, 0.29, and 0.10 anywhere off it. With the key in your pack it
pulses 0.5-0.95 from anywhere in the hold. On unlocking, the shackle pops on
the lock sound's bolt (0.64 s), the chain slides off the ring bolt and swings
down off the staple, and the lot drops on the boards, landing with
`sfxChainDrop`'s heavy thump (~1.55 s). A restore lays it on the boards. Every
piece is named and the group is `noBake`, or the wreck's merge eats it. **Three's
`smoothstep(x, min, max)` wants its edges in order** — written (d, 15, 7) for
a fade with distance it returned 0 everywhere and the glint never showed.

**AND A RESTORED SHELL DOOR STOOD THROUGH HER SIDE.** The restore set the leaf
to `rotation.y = -2.0`, the old outward swing that the note in
`updateHoldDoor` says went through her plating; live it opens inward to +1.85.
`holdDoorSwing` was restored as 1, so `updateHoldDoor` never moved it, and
every load past the door showed it through the hull. It restores inward.

**THE CAPTAIN LANDS IN A BASKET.** The hold's three baskets were rolls of `rnd`
and two came up on the same spot, (-3.31, -0.57): two baskets inside each
other, half a metre from where he lands when the wheel lets him go, so he hit
the boards beside them. They are laid by hand now: the first square under the
hook (`userData.catchBasket`), each on the LOWEST board under its own
footprint (her sole is dished; at HOLD_Y + a height they floated) and each
solid in the hold. `dropShipHead` measures how far his lowest point hangs
under his middle at a scale of one — he is scaled up by `makeNoticeable` once
he is takeable (1.15 measured) — and `updateShipHead` steers him to the
basket's middle and sets him on its FLOOR, where the basket rocks and rattles.
Measured: dead centre, his lowest point 3 cm over the basket's floor and his
crown 13 cm over its rim. The route and the hold sweep round the new colliders
are unchanged (worst step 0.09 m, nobody trapped).

**THE SHELL DOOR IS GONE: HER FAR SIDE IS A SECOND TEAR (`FAR_X0..FAR_X1`,
-2.2..0.9, top 2.3).** The owner's call: no door, a hole through to the other
side, the captain's key opens the sea chest and the dock key opens nothing for
now (it is the "Rusted Key" again; the fisherman keeps his "old chest key"
line). `breached(x, y, sg)` takes the side and cuts both the skin and the hold
lining for either tear, on its own wobble phase; `breachTopAt(x, sg)` lays the
torn planking along both; the frames skip both. Sand heaps that land over the
far tear are kept to a 0.32 m spill — six of them stood up to 1.6 m tall right
in front of it. In main.js the floor, the null-floor fallback and the hold's
lateral clamp ask `atBreachX` / `atFarX`, one place each. The leaf, frame,
padlock (`holdLock`), its pooled lamp and `holdDoorOpen` are all gone. A save
from the door's days (`f.holdDoor`) spent the key on it, so with the chest
still shut the restore hands the key back; with `f.chest` it is spent. The
tear is where the door was, so the companion ladder stands in front of its
middle: you step round the ladder's foot (x < -1) to reach it, as you did to
reach the door.

**AND THE EDGE OF A HOLE IS A WALL.** Standing in either tear (out past the
hold's own line) and stepping along her past the end of the hole put you back
to the line: 0.32 m inward in a frame, measured at the far tear's forward
edge. Coming from inside the hole (`_preMove`), x is held at the hole's end.

**HER GEAR PUSHES YOU OUT BY THE NEAREST CLEAR WAY (`pushOutOfShipGear`).** A
sweep of the quarters at 0.6 m (the old whole-ship sweep sampled x only to 6.4
and never reached the aft end) found three failures of "the nearest face of
the box you are in": the aft bunk stands 8 cm off the transom, so its nearest
face was through the clamp (0.78 m jumps, and a body trapped behind a cask);
the starboard bunk and the cask beside it stand 2 cm apart, so their grown
boxes overlap and each pushed you into the other; and the bench's end and the
quarters bulkhead make a crevice whose way out is a CORNER. Every face and
corner of the boxes you are in is a candidate now, and the nearest one in no
box and inside the room wins; a way out more than 0.35 m off is refused in
favour of where you stood before the step. The aft starboard corner (chest,
two casks, hull, transom) is a sealed pocket nobody can reach; the sweep was
starting bodies in it, so it now skips starts inside any grown box. After:
quarters worst 0.085 m, nothing big, nothing trapped.
**And it runs twice: once in `updateShip`, and again after it (in `update`).**
`updateShip` pushes you out of her gear and THEN clamps you to her sides, and
a clamp can put you back into a box: the strip behind the long locker down the
port bulwark narrows toward the bow, the deck-edge clamp walked you into the
locker, and the next frame threw you out of its far end, 1.64 m. A candidate
up to 8 cm past the room's edge is still allowed (the clamp takes the rest;
refused outright it sent you to the far face), and the second pass sends a
wedged body back to where it stood. Whole ship after: hold worst 0.107 (the
ladder's side), house 0.058, deck 0.21 (a jump onto the hatch coaming), aft
deck 0.089; the remaining "big" deck moves are bodies jumping down the hatch
onto the hold's baskets, whose boxes stand room-high (2.65) like all the
hold's gear, so a falling body is pushed off them sideways — as before.

**THE QUARTERS: BUNK LADDERS AND CHAIRS.** The bunk model's ladder is its +X
face (its rungs are the only geometry at x > 0.3, between z -0.8 and -0.6), so
the open side of a berth is wherever its +X goes. The aft one stood at no turn
and climbed into the transom; turned π it faces the room with the starboard
one. A chair faces its own +Z (its back is the only part over 0.7 m, at
z = -0.22): both mess chairs are turned `atan2(dx, dz)` onto the table's
middle. Their solid boxes swap w/d to match.

**SIGNS (`signMat`, `signBoard` in shipwreck.js).** Pale paint on dark oak,
chipped, quantised, its own emissive lift off its own map (nothing in the hold
is moonlit). QUARTERS on the hold side of the bulkhead over the barricaded
door; DECK with an arrow each side, hung on two irons under the planking at the
foot of the companion ladder, 2.4 m off the sole so you walk under it. The
board faces -X: a plane turned -π/2 about Y reads left to right along +Z,
which is your right looking aft.

**E LETS GO OF THE WHEEL.** The window's capture-phase keydown already took
Esc; it takes the interact keys (E, F, Enter) too, so the press that lets go is
caught before `primaryAction` and can never take hold again, and a held key's
auto-repeat is ignored so holding E to grab does not let go on the first
repeat. The prompt says "E to step away".

**THE GULLS (`GULL`, `updateGulls`, `gullStrike`, `hurtGull`).** Three, from
the owner's bird collection (`tools/gull_pack.py`: the OBJ's `gull_Figur`,
wings spread, 1.8k tris, 1.3 m span, grey mantle and black tips as vertex
colours since the map is all white, shape keys `up`/`down` for the wing beat;
faces +Z). They wheel at 12.5 m over her; the weather deck wakes them
(`gullsAwake`, saved), and they hunt you while you are within 32 m of her
middle and not in the hold or the wheelhouse. Crab numbers: `CRAB_HP`, one a
strike, one at a time (`gullToken`) with a 2.0-3.8 s gap after each, and only
one you can SEE may start (any, after 2.5 s with none in view). The tell is a
0.62 s stall, wings high, with `sfxGullShriek`; the stoop is 10.5 m/s at your
face, re-aimed over its first half and then committed. Contact is the bolt's
hips-to-head segment at 0.85 m: guard facing it on the beat is a parry
(knocked onto the boards, 1.7 s stunned, riposte doubles), guard otherwise a
block (glances off and climbs), else `damagePlayer(1)`. A swing finds one by
the crab's ray-to-body test (`gullStrike`, after the crab block in
`digImpactCore`); the gun traces them in `magTrace` and both fire paths
dispatch on `u.gull`. Floors are asked of `shipFloorAt` then `groundUnder`
(`gullFloorAt`); the wheelhouse box is checked along a dive's line before one
starts. Dev mode never wakes them, as it never wakes the crabs. Measured
standing still on her deck: wind 0.6-0.7 s, stoop 0.7 s, a hit every ~4 s at
the old [1.5, 3.1] gap; parried, it lies on the deck and a light riposte
kills; a dead one lies at deck + 0.08, belly up.

**THE WALK UP TO HER (`updateWreckApproach`, `WK`) — first build; see "SECOND PASS" below for what was taken out.** The moon is 6.6° up and
15° to seaward of dead ahead, so from 20-40 m up the beach it stands right
behind her bow on its own. `wkA` rises from 132 m to 90 m and fades from 34 m
to 15 m, only on the up-beach side of her; `wkR` is the reveal, 3.5 s from the
first time you are inside 72 m, re-armed past 170 m. It drives: her own mist
banks and five moon shafts (the sighting's `mistBanks` and `moonShaft`, pulled
out of the whale's IIFEs into shared builders), the sighting's motes
(whichever wants more), a silver mood tint, the moon's disc (+32 %) and its
rays, the sky clearing round her, the lens (`WK_FOV` 88, eased by `wkFovK`,
off in a fight or on the sights), a low swell (three saws closed to 150 Hz on
the effects bus) and two hull groans at the reveal. **The fog has to come
DOWN for the reveal**: at the wreck's own density she was a fifth seen at
fifty metres and gone at seventy, so before the reveal the air is up to 1.9×
and at it the density is lerped back to the stock 0.014 (never under it —
`cullBeyondFog`). Measured on the walk: 0.015 at 135 m, 0.046 at 75, 0.0145
from 55 to 35, the wreck's own again by 15; the lens 105 → 90.6 → 103. **And
she is darkened**: every surface of her carries an emissive lift and with it on
she read beige and lit with the moon right behind her; `wkDarken` takes the
lift down to 40 % under the reveal (glass excepted: the wheelhouse windows
keep their dull glow). `wkA`/`wkR` are declared up with the mood's, `wkFovK`
by `HELM_FOV`. `__bw.wk()` reads it, `__bw.wkSet(seen, t)` forces it.

**SECOND PASS, AFTER THE OWNER PLAYED IT (2026-10-13).** "Super laggy, long to
load, the fog is pixelated and blocky, don't mess with the sky box, give the
FOV back, only three gulls, parry them out of the sky, and the exit is a
crouch."
- **The lag, measured at 1280x760.** In the first ~40 s after load the boot's
  warm chain is still running (mound relics 1.3-1.4 s, crab dress 0.7-1.4 s,
  cave.glb 0.7 s, "warm wreck paint hull 5" 0.9 s) and a fight there averaged
  84 ms a frame with 0.9 s spikes — and my own whole-ship sweep was running in
  the preview tab on the same machine while the owner played. After the chain
  the fight is 16.9-17.5 ms a frame (p95 ~20), the walk up 16.7 (max 23).
  Fixed what was ours: the gulls' morph + vertex-colour material is compiled
  when the model lands (`warmStep('gulls')`, 28 ms) instead of on first sight,
  and the hull map's write-out (2048x512, colour and normal) is four warm
  steps (`paintColor`, `paintNormal` in thirds) — 914 ms became 21 + three
  steps under the frame budget.
- **The blocky fog was the sighting's mist banks.** Billboards at the beach's
  pixel size stood behind her as a bright slab with a hard straight edge. The
  wreck has none now, and no moon shafts: the approach is the scene's own fog
  (x1.55 before the reveal, back to stock at it), a silver tint at half the
  first build's strength, the motes, the swell, the groans and a hull lift
  down by a third at most (was 60 %, which muddied her paint).
- **The sky is not touched**: no clearing over her, no bigger moon, no extra
  rays. `mistBanks` and `moonShaft` stay as shared builders; the whale still
  has its 56 banks and 11 shafts (checked after the refactor).
- **The lens is a beat, not a place (`WK_LENS`).** It drew in by distance, so
  standing 20-34 m from her — where the gull fight spills onto the sand — it
  stayed narrowed. Now it draws in for 2.2 s on the reveal, holds 2.8, gives
  back over 3: measured 105 -> 91.4 -> 105 inside eight seconds, and 105 when
  standing at 35 m after.
- **Thirteen gulls, not three**: the beach's ambient flock (`critters`, ten
  instanced birds) spawns round YOU, so it came to the wreck too. Hidden
  within 110 m of her (`critters.hideNear`).
- **Out of the sky.** The parry window for a gull is 0.34 s from the guard
  going up (`GULL.PARRY`; the game's 0.20 is short for a stoop that is on you
  a fifth of a second after it is readable) and the facing test is in 3D (the
  flat bearing is noise with the bird overhead). A parry throws it back off
  the guard, tumbling, onto whatever is under it, where it lies on its side
  beating a wing for 2.6 s (`knockGullDown`); a blow it survives knocks it down
  too (1.5 s); a blow on it there is a riposte. Measured: guard at 2.4-2.8 m ->
  stun, lands on the deck in ~2 s at deck + 0.10 on its side, still down a
  second later, a light blow kills, the body lies at deck + 0.08. Standing
  still on her deck: a dive every ~4.3 s, every one lands.
- **The far tear is a crouch.** -2.6..1.0, crown 1.7 (1.45 over her sole),
  edge wobble a hand's width. `FAR_ROOF` samples `breachTopAt(x, -1)` once and
  keeps the LOWEST edge within 0.3 m either side; the passage (`FAR_PX0..PX1`,
  about -2.0..0.25) is where a crouched body (1.03) fits, and `atFarX` is that
  passage for the floor, the clamps and the fallback. In the thickness of her
  side (the hold's line to the plating's outside + a radius, `farSkin`) only a
  body that fits may be: standing, you are put back on the side you came
  from, with "Crouch (Ctrl) to get through"; inside it `headroomClear`
  refuses the stand. **The null-floor fallback has to ask too**: offering the
  tear as "back the way you came" to a standing body put it in the side of
  her, and the next frame pulled it on into the hold — 2 of 15 standing walks
  along her side got in that way. After: 0 of 30, worst step 0.2 at the
  tear's ends; crouched out from the hold and in from the sand both pass; the
  hold sweep round the tear is worst 0.13 (the ladder's side).

**THE WAY OUT SHOWS, AND THE GULLS CAST SHADOWS (2026-10-14, the owner's
"5 and 1").**
- **Sand blown in and the moon on it** (shipwreck.js, after the sole). One
  height function (`spill`) for a fan of sand pushed in through the far tear
  and over her boards (2.5 m in) and, outside, the ramp of it down to the
  beach — the walk's own apron (`outerZ` mirrors `shipFloorAt`), so the feet
  and the sand agree. Its edges are buried under the boards and the beach, not
  drawn as a rim. Inside it is her own wet sand (the beach's pale sand glowed
  in the dark of the hold); outside, the beach's. On it lies a pool of
  moonlight (`farMoonPool`): the moon is at -Z, the side this hole faces, low,
  so it shines in and on a little toward +X. Per-vertex colour (smooth at the
  beach's pixel size, no map), additive, **fog off** (an added colour fogged
  adds the fog's own: its dark would show as a pale sheet from far off), and
  faint — at 0.26/0.32/0.46 it was a white lamp; 0.075/0.09/0.135 is a cold
  wash. **Two wrong turns, both measured on screen:** the light laid on the
  floor hung in the air over the gouge torn in her boards just inside the hole
  and ended on its cut edge in a hard straight line; masking it and the sand
  away from the gouge carved the sand into a raised crescent. The answer was
  to let the sand fill the gouge (wherever it shows, it is above the boards)
  and lay the light only where the sand is thick (`F` > 0.2-0.45), so it is
  always on one unbroken surface. From across the hold it is a soft pale patch
  at the foot of the far wall; from outside it glows inside the hole.
- **The hole's edge, close up.** Crawling up to it showed pale stair-steps
  round it: the lip the hull grows on a cut, in her painted plating, and the
  lining cut on 0.33 m cells. Now the far tear's planks go by ARC LENGTH round
  the whole edge, up the ends from the sand (`pts`), thin enough to hang no
  more than 8 cm into the crawl space; a strip of her inner timber
  (`farReveal`) joins the lining to the plating round the edge, so the 0.7 m
  between them is torn timber and not the inside of her paint; and the lining
  is cut on 0.1 m cells (`holdSide` 152 x 33). The breach's own pale steps
  are as they were — rendered with the old lining for comparison, they were
  bigger then.
- **A shadow under each gull (`updateGullShadow`).** A soft radial map
  (64 px, linearly filtered) on a disc, stretched a span across and a body
  along and turned to the bird's heading, on whatever is under it:
  `gullShadeAt` is the wheelhouse ROOF (6.89) when it is over the house and
  above it, else `gullFloorAt` (the deck, the hold through the hatch, the
  sand). Strength 0.78 x k^2 with k = 1 - (h - 0.4) / 11.5 — measured 0.51 at
  1.5 m up, 0.19 at the hunt's 5.6, none past ~11.5 — so a dive darkens and
  tightens as it comes. None once the bird is down on the ground, stunned or
  dead (`landed`, `landedDead`). Not the moon's shadow, which at 6.6 degrees
  would land forty metres off. Warmed with the birds; a fight measured 8.2 ms
  a frame with all three drawn.

**A NEWCOMER'S PLAYTHROUGH, AND WHAT IT SMOOTHED (2026-10-14).** Walked from
the spawn to the wreck, in by the breach, up the ladder, the gull fight with
the sand shovel (timed swings only, no parry), the wheel, the head, the key,
the barricade, the chest, the peg, and out on hands and knees. Frames on the
ship 8-10 ms (p95 ~11); no errors. Found and fixed:
- **The gulls' motion.** The stoop went from a stall to 10.5 m/s in one frame
  — now `S.spd` ramps at 48 m/s^2 (full speed in ~0.2 s; the contact test
  uses |v|^2, not DIVE_V^2). The folded stoop wings blend in and out
  (`stoopK`) instead of switching. Knocked down or killed, a gull hits,
  bounces once (`bounced`, a fifth of its speed), then EASES onto its side /
  back (`gullEaseAngle`, wrap-aware: a tumble leaves it many turns round)
  instead of snapping; getting up, its angles are wrapped and the flight
  attitude rights it, from 4.5 m/s up, instead of a flip and a 7 m/s launch.
  Turning is rate-capped (4.5 rad/s, 7 in the stall and the stoop): when a
  course reversed it swung 0.6 rad in a frame. And it keeps clear of her
  (`gullClearY`): above her rail over the hull, above the wheelhouse roof
  rising smoothly within 1.5 m of it, and a dive's line is refused if it
  passes through the hull or the house (`gullLineClear`) — measured, no gull
  inside her in ~1,500 frames of a fight. A newcomer swinging on the stoop
  killed two and left the third at one in 30 s, taking nothing.
- **The helm.** Stepping up to the wheel moved the camera 0.23 m and 7
  degrees in its first frame (an exponential ease is fastest at the start);
  now `helmP` runs linearly over 0.55 s and `helmT` is its smootherstep —
  0.000, 0.001, 0.002, 0.004 m on the first frames, 0.054 at most. The
  instructions at the helm were never seen: looking out to sea nothing is
  hovered and `updateHover` cleared the prompt on the first frame; the helm
  owns the prompt now (`helmOwnsPrompt`). Solving it says "Something fell
  into the hold · E to step away" instead of going blank.
- **The crouch hint never showed** — the same clear; see ui.md, `flashPrompt`.

**HER STORES ARE THE OWNER'S PIRATE-SHIP SET, AND SHE IS STILL A CRAB BOAT
(2026-10-14).** `assets/pirate-props.glb` (`tools/pirate_pack.py`: the zip's
one mesh split into loose parts, parts whose boxes touch clustered into
pieces, each named, centred, based at 0, maps to 512 JPEG) replaces every
stowed box or cylinder she had — the furniture set's casks, the deck's own
casks and crate, two of the port pot stacks, the two loose hold baskets — and
each piece stands where the thing it replaces stood and is solid where that
was solid (`PIRATE` in shipwreck.js), so the swept walk is unchanged. **The
owner's word: she is a crab boat.** The cannon, the shot, the cutlass, the
treasure chest and the stocked anchor are left in the pack (an anchor was
tried on the foredeck and cut), and three of the five port stacks are still
her steel crab pots — the set has nothing like them and they are what says
what she was. Lit like everything else of hers: each material cloned with a
colour scalar per set (`K`), a cold cast on the wood (`TINT`), and an emissive
lift off its own map, 0.26 on the deck and 0.55 below it where no moon
reaches; metalness 0 (no environment map). Sweeps after: hold forward worst
0.092, deck bow 0.142, quarters 0.104, nobody trapped.

**`solid()` boxes are COLUMNS, 2.6 m of them, and carry a real `top` now.**
A player box runs DECK_Y - 0.4 to + 2.2 whatever stands in it. The gull
ragdoll took that as the gear's height, a gull that came down by the gaff's
post started inside one, and the push out of it fired the bird 4 m across the
deck in a quarter of a second. Each solid now takes an optional seventh value,
where the thing really stops (the pirate pieces from their measured heights
times scale, plus whatever is stacked on them; pots `0.03 + n * 0.36`; the
coil 0.25; the netting 0.45). With no `top` (the mast, the gaff post) a
ragdoll treats it as a column it is pushed out of and never lands on.

**A GULL BROUGHT DOWN IS A RAGDOLL (2026-10-14, `gullRagdoll`).** The model
is skinned at load (`gullSkin`, `GULL_BONES`: body, each wing in two, head;
weights by |x| past the shoulder 0.09-0.15 and the wrist 0.34-0.42, the head
past z 0.10-0.15 within 6 cm of the centreline). In the air the bones sit at
rest and the shape keys flap it exactly as before. Knocked down or killed it
becomes ten points (`GULL_RD`): a rigid five-point body (chest, tail, both
shoulders, keel — the keel is what makes it 3-D rigid), a wrist and a tip
each wing, a head; sticks for the bones and AT-LEAST limits for the joints (a
wing to the vertical and not over its back, swept so far, the wrist folding to
a right angle; the head lolls but cannot fold into the body). Position-based:
gravity 14, feather drag (wings 2.0/s, so they trail a fall), 120 Hz substeps,
four iterations; velocity is what the solve came to, clamped at 14, and a WALL
PUSH ZEROES the pushed axis instead of becoming speed (`rd.w`). Each point's
floor is `gullShadeAt` (deck, the hold through the hatch, the roof, sand),
asked once a frame at y + 0.3; walls are the wheelhouse box, the bulwark from
either side (`deckHalfAt` above DECK_Y - 0.35, the hull's own half less the
lining below) and the props by `top`. `rdPose` reads the body's frame (x
shoulder to shoulder, z tail to chest, against the rest frame `q0i`) onto the
group and turns each bone from its rest direction. Stunned, it thrashes
(zero-mean wing forces, so never a lift) and once down beats one wing against
the boards in bursts; the stun counts from its landing, and getting up hands
the frame to the flight code (`S.right` rights it at twice the bank rate for
0.9 s) while the bones slerp back to rest (`bonesOff`). Dead, it sleeps once
every point is under 0.06 m/s for 0.6 s. Measured: killed over the deck it
rests with every point exactly on its floor (min clearance 0.000), thrown at
the house it stops at the wall, thrown high it clears the rail and lands on
the sand; stunned at 2.2 m it lands, struggles, gets up at 1.2 s and is
hunting again in another second.

**AND THEY HAVE THE OWNER'S VOICES.** `gullCall` (five calls) and `gullCry`
(two cries) are cut from the owner's one gull take. Idle (`gullVoice`), each
of the three calls every 6-15 s while wheeling and 3.5-8 s once hunting,
`playSampleAt` from where it is, gain 0.24/0.34 falling off at 12 m and
silent past 110 — about one call every 3 s across the three, faint from up
the beach. The stoop's tell is a cry (`sfxGullShriek` plays `gullCry` when
loaded, the synthesised shriek before), a hurt is a cry at 1.2x, a parry 1.12x,
a death 0.84x. `sfxGull`, which every other gull on the beach uses, plays one
or two of the real calls when they have loaded, duller with distance.

**WHAT THE RAGDOLL'S STRESS TEST FOUND (2026-10-14).** Thirty throws at a
time from random spots on her deck, half kills and half stuns, checked every
frame for a point under its own floor, a point inside the deck's thickness,
NaN, and speed. What it took to come back clean (30/30, worst speed the throw
itself, ~10 m/s):
- **The bulwark goes by the BODY's side** (`rd.out`, worked out once a step
  from the five body points). Per point, a bird thrown just over the rail
  hung outside her by a wing still lying on her deck, the stick through the
  plank. Above the cap a point is free, onto the cap it lies on it.
- **Her hold's bulkheads are walls** (`rd.hold`): a stunned bird slid through
  the forward one and lay on the sand in her bow.
- **A floor that jumps up more than 0.15 m in a step is a RISER** — the
  wheelhouse's door steps from the side, the deck's edge from inside the
  hatch — the point is put back and PINNED there for the step (`rd.pin`), or
  the sticks drag it straight back in under the edge.
- **`GULL_BOXES`**: what the player's walk handles its own way (the hatch's
  coaming is `shipHoleEdge`, the ladder well's lip is walked into) or never
  needed (the hatch boards, the second coil, the bucket), as boxes with real
  tops. Pushed out by the face the point came IN through, so a 12 cm coaming
  is not crossed by a point more than halfway into it.
- **Stunned in the hold, it climbs out by the hatch** (`climb`): along under
  her deck at DECK_Y - 0.7 to the hatch opening, then straight up; the
  `gullClearY` lift is off for it. Before, it got up through the planking.
- The house rule pushes a point that STARTS inside the wheelhouse by the
  least depth, which is a metre in a frame — a test artifact only (no gull is
  ever inside it), but it is why spawn points in a test avoid the house.
Warmed, a fight with a stun and two kills: avg 7.5 ms, p95 8.7, max 14.7.

**THE SWEEP'S "STANDING ON SOMETHING NOT UNDER YOU" FOUND THREE OLD THINGS.**
The hold's two bulkheads were drawn a quarter-metre proud of her deck (a
ridge right across her, abaft the house and forward of the hold) that nothing
collided with — they stop under the planking now. And the floats and the
netting bundles down the port side had no box out to the bulwark, so you
stood inside them; both boxes run to the rail now (with real tops, 0.51 and
0.45). Deck strips after: -8.4..-4.6 worst 0.401 (a spot on the hatch's
coaming stepping into the hatch — a jump over the coaming still drops you into the
hold), 6.8..11.4 worst 0.089, nothing outside, nobody trapped.

## The chest through the barricade, and gulls that hit things

- **THE CHEST GLOWS A LITTLE** so it can be seen through the barricade's gaps
  from the deck: `dressChest` gives the chest's own materials a warm emissive
  (0xffd9a8 at 0.62) and hangs a small pooled lamp in it (`lpAlways` 11, so it
  is lit from the far side of the boards, not only beside it). Both breathe
  together in `updateShipChest` off `shipwreck.userData.chestGlow`.
- **A FLYING GULL HAS A SOLID WORLD NOW** (`gullSolidAt`): the sand cliff, the
  boulders near her (`rockColliders` within 70 m, cached), her wheelhouse
  below its roof, the mast and the gaff's post as columns, her hull and rail
  from outside, and her stowed gear up to each thing's real top. Wheeling and
  hunting it looks 0.35 s ahead and climbs over (`gullAvoid`); diving, passing
  or glancing off a guard it does not, and what it flies into puts it back at
  last frame's spot (`S.prev`) and knocks it down stunned (`bonkGull`).
- **AND IT MUST BE ABLE TO GET UP AGAIN.** The ragdoll keeps its POINTS out of
  the wheelhouse box grown by a point's radius; the flying bird keeps its
  BODY out of the box grown by 0.17 + 0.18. A bird that came to rest against
  the wall got up inside that wider margin, "flew into" the wall on its first
  frame and was knocked straight back down — measured: pass at frame 0, stun
  at frame 1, for ever. Getting up now carries `S.grace` 0.8 s, during which
  there is no bonk and `gullUnstick` eases it out to the nearest clear side.

## The key on the hook, and Billy off the wall (2026-10-15)

- **THE HEAD IS GONE; THE KEY HANGS ALONE.** `boatKey` hangs from the gaff's
  hook by its bow (`KEY_HANG`: a quarter turn about Y puts its flat to the
  helm, a quarter about Z stands it on end — the bow came out on top, checked
  in a render). At its own 13 cm it was a few dark pixels from the deck, so it
  hangs at 1.4 and comes back to 1 when taken, with brass at emissive 1.5 and
  a glint at strength 4.2 (2.4 peaked at 0.21 opacity and the night ate it).
  `shipwreck.userData.head` (still built by the model) is taken off the hook.
- **`dropShipKey` / `takeShipKey`.** The stars drop it into the catch basket
  (`scene.attach` keeps where it hung); it is takeable from the moment it
  lets go, so its pickup id is the hook's position on every load. Taken, it
  loses its aim sphere and its glint (`dropShine`) — the examine screen
  re-parents the world object, and a glint left on it shows there. A replay
  from a save whose chest is open does not hand a spent key back.
- **OLD SAVES** carry `headTaken`: `migrateHeadSave` turns a carried head
  whose key was still in its teeth into the key, drops the head's pickup
  from the replay (it would wait out the full eight seconds for nothing), and
  marks the key taken so it is not also in the basket.
- **BILLY'S LINES** are the owner's, verbatim; "Do you need help?" is offered
  once key, heading and "which ones" are all asked (`billyAsked`, saved).
- **THE PLAQUE'S SCREWS** are on the wood inside the scalloped corners in
  both photographs (`BILLY_SCREW_UV`, checked by drawing them on both PNGs).
  They ride a group that copies the plaque's position and rotation but NOT
  its scale — `scale.x` carries the photo's aspect and would squash a screw.
  Out, they lie on the wheelhouse sole (`SN.DECK_Y + SN.BR_STEP`).
- **THE CAPTAIN IS THE VERY OLD FISHERMAN** (owner's answer). See dock.md.

**SHE WAS PAPER (the owner, 2026-10-16): depth, rot, the bulwark, the gulls.**
- **`rotPass(S, {k, rust, seed})`** runs after a map's draw jobs on every
  surface that asks (`opts.rot` on hull, deck, plank, paint, inner, sole and
  wood): rot patches that LOWER the height (so the normal map sinks them), mould
  specks, rust discs with streaks running down, worm holes.
- **HER TIMBERS** (shipwreck.js, before "the hold"): stanchions inside the
  bulwark, two wales proud of her sides (lofted off `hullPt`, cut where she is
  breached or holed), a rib every 0.9 m up the hold lining (seven segments
  each, rotation x = +atan2(dz, dy) — the sign was measured), beams under the
  deck clear of the hatch and the ladder well, the deck's thickness round both
  openings, and carlins along the hatch.
- **THE BULWARK BREAKS BY THE PLANK** (`bulwarkWear(x, sg)`, `COURSE` 0.17).
  The old wear was a random dip at every 15 cm station and drew the rail's top
  as a saw blade — the torn sheet in the owner's screenshot. Now whole courses
  go out of a 1.45 m stretch, each lower course over a narrower span than the
  one above (a stepped notch), the old full gaps are a stub of one or two
  courses, and each station is a box of its own with end grain wherever the
  next is lower. **The cap rail only runs where the planking under it is
  whole** — it was placed at full height everywhere and floated over every
  worn stretch. Stanchions outlive the planking; now and then one is snapped
  off above the highest board left.
- **A replace in this file must be bounded by the function, not the next
  banner**: replacing from `bulwarkGeo` to "HER BULWARKS AND RAILS" took 500
  lines with it once (restored from the preview mirror). Find the closing
  `\n}\n` after the function's own line.
- **GULLS THROUGH THE DECK, the last of it.** The deck-slab rule (a point in
  the deck's thickness is kept in the hole it came from, or under the deck)
  stopped bones crossing the planking, but a gull dead on the deck BESIDE the
  hatch could drape a wing over the coaming and let it hang down inside —
  shoulder on the planks, wrist at 2.76 m inside the hatch, the bone through
  0.6 m of coaming. `rdCollide` now keeps every point below the coaming's top
  on the side of it the CHEST (particle 0) is on; over the top it is free.
  Forty random drops round the hatch: no point inside the deck, no wing
  through the coaming.

**THE FIFTH PASS (the owner, 2026-10-16, four screenshots).**
- **"A strip of wood sticking out of the deck each side, the length of her"
  was the HOLD LINING**, lofted to `DECK_Y + 0.35`: it stands inboard of her
  side (≤ HOLD_HZ 3.7) so it came up through the planking as a 0.25 m wall
  along the hold on both sides. It stops at `DECK_Y - 0.01` now. Found by
  casting the screen pixel the strip was on (`setFromCamera`) and reading the
  mesh's bounds — a straight-down scan missed it, the wall being vertical.
- **The hatch's deck-edge pieces ended IN the deck's plane** (top at exactly
  DECK_Y): 1.5 cm lower now.
- **HER TOPSIDES ARE THICK** (`bulwarkGeo`, `TOPSIDE_T` 0.13). The skin
  (`hullGeo`) stops at the deck — its rows run KEEL_Y..DECK_Y, `v` still the
  rail-relative one so the paint and holes do not move — and above the deck
  her side IS the bulwark: lofted on `hullPt` (flare and rake), outer face in
  `M.hull`, inner face, top and end grain in `M.plank`, broken a plank at a
  time (`bulwarkWear`). `transomTopGeo` is the same across her stern. The
  cap rail sits ON the top now (`railY + 0.035`, `TOPSIDE_T + 0.07` wide) and
  the stanchions lean with the flare against the inner face. `quadOut` winds
  every face by the normal it is told, so no face is guessed. The two rot
  holes that reached half a metre over the deck are kept to the skin: cut
  through the topside they read as a doorway in her bow.
- **The bow is solid**: walks from 21 foredeck spots × 8 headings keep the
  body's centre ≥ 0.34 m from the inside of her sides. MEASURE IT WITH THE
  RAKE INVERTED — forward the planking at x comes from a station up to 1.9 m
  aft, and `halfAtY(x)` at the walk's own x said the body was 6 mm inside the
  wall. From the sand, 35 walks at her bow: the only one that ended inside her
  skin went through the breach.
- **The dune cut** (main.js, `uShipCutTop` / `cutHW`) stopped under a rail the
  sheer lifts 0.3 m aft, and at 0.96 of her half-width, short of the thick
  sides: now `DECK_Y + BULWARK + 0.45` and `halfAtY - 0.06`.
- **The drifts** were spaced off her by `sz / 2` and then spun: spaced by
  `rEff = 0.58 · max(sx, sz)` now, checked over that whole reach.
- **A real hook**: one `TubeGeometry` along a J (eye in its own plane, collar,
  shank offset so the bowl hangs plumb under the eye, the bowl 1.38× thick,
  drawn down to a point) — the bowl's bottom where it was, so `KEY_HANG` did
  not move. The chain had nine links running down through the hook (sized for
  the head that hung under it); it is `NL` links to the eye now (three).
- **Signs**: `signMat` is old — 620 specks and 14 flakes back to the wood, a
  sun bleach over all of it, a grime line, a split, mould, letters at 0.82,
  lift 0.24. **WHEELHOUSE** over its door outside (`signBoardZ`, between the
  dead lamp and the roof edge). A manual render of a small far mesh can show
  it hidden: the distance cull (`bwCullR`) is only re-run by a frame.
- **No hints aboard**: the helm says only "E to step away"; "Something fell
  into the hold" and "Crouch (Ctrl) to get through" are gone.
- **Gulls and the new sides**: `rdCollide`'s inner limit above the deck is
  `min(deckHalfAt, hull - 0.13)`. 20 drops: nothing in the deck, the coaming
  or her sides.
- **ONE RAIL (2026-10-17: "the railings are sideways blocks, not connected").**
  The cap rail was 84 axis-aligned slabs, square to the world while her side
  curves and climbs: a staircase of loose blocks round the quarters. It is
  `capRailGeo` now, lofted on `hullPt` at `railY`, `RAIL_H` 0.07 tall and
  `RAIL_OVER` 0.035 over each face, top/edges/underside and end grain where a
  stretch is broken out; the transom carries the same section.
- **THE BOW CLOSES (2026-10-17: "a gap in the middle of the front").** The
  topsides skipped stations narrower than `TOPSIDE_T + 0.06`, which left a slot
  of sea where her sides meet. Every station is built now and the inside face is
  drawn in to her centreline (`In`: offset `min(T, halfAtY + 0.004)`, and the
  cap rail's `inOff` the same) — PAST the centreline by 4 mm, so the two sides
  overlap. At `- 0.003` a ray straight down her bow at 1.4 m still went out
  through a 6 mm slit; to close a seam, overlap it, never meet it.
- **Billy glimmers** (`billyGlint`, 2026-10-17): an additive star sprite on his
  body, depth-tested (so only through her door and glass), fog off, scaled to
  `clamp(d·0.03, 0.14, 2.6)` so it holds a few pixels at any distance; twinkles
  every 1.6-3.4 s over a sheen. Only while `billyState === 0`. Measured from the
  sand 14 m out: max 245 at its peak, in the doorway. From further up the beach
  her side hides the door — the line through the doorway only reaches the sand
  inside ~20 m on the walk's line.
- **A set star goes out** (2026-10-17: "it disappears instead of fully
  glowing"): `target` 0 for a set star, eased out at 2.2/s after its flare,
  and its sprites scaled by `max(lit/0.4, flare)` so no faint dot is left.
  Measured: 1.00 at 0.25 s, 0.22 at 1.25 s, 0.00 at 2.75 s; a broken run brings
  it back.

**THE ROUND OF 2026-10-17 (the owner: lantern, breakables, glimmer, flicker,
the reunion).**
- **The deck lantern is gone** (`S.userData.lantern` is no longer set).
- **Billy's glimmer waits for the reveal**: `updateBillyGlint` hides it until
  `wkSeen` and inside `WK.REVEAL` of her — the same moment as the sting and the
  FOV change. Its own scratch vector (`_bgV`).
- **No reunion.** The plaque goes straight on the wall when you hand him over
  (`returnBilly` → `mountBillyHome()`), and the fisherman's `fish` node is the
  last line, "I thought I lost you to the sea.", whose `enter` gives the Ring of
  Connection. No drawn frames of Billy anywhere: his pack icon is his photo
  (`billy.photo[0]`).
- **FLOOR FLICKER WAS THE HOLD POSTS' TOPS.** The z-fight scan (rays from above
  and from eye height in all directions, the FIRST hit and any parallel face
  within 2 mm behind it) found 13 cm squares in the merged `M.wood` lying in
  the deck's own plane every 0.875 m down the port side: the hold's frames are
  slabs from `HOLD_Y` to exactly `DECK_Y`, so each one's top was IN the walking
  surface. They stop 2 cm under it now. Anything that stands up to a surface
  stops short of it or goes through it; never flush.
- **SHE HAS THINGS TO BREAK** (`smashShipStore`, main.js; `nav.breakable`, the
  model): every barrel and crate of the pirate set and the three stacks of pots
  down her port side, 18 units. The barricade's door: a `physProps` entry with
  an invisible box proxy (in the SCENE at the unit's middle, so `mesh.position`
  is the world position every other path reads) and its `SN.props` box spliced
  out when it goes. The stores STAY BAKED (3-4 draws for twenty pieces): each
  unit's box is taken off its pieces before the bake — `shipwreck
  .updateMatrixWorld(true)` first, the stores group was only just added and
  `setFromObject` measured it in her frame — and on the break its triangles are
  found in the merged meshes by centroid and the index rewritten without them.
  A pot stack is its own group (one draw). Barrels go to six staves and two
  heads, crates and pots to their sides in halves; each piece is drawn with its
  triangles twice (wound back) so a stave is not a hole from inside without a
  DoubleSide clone (a compile on the hit frame), laid flat in its geometry, and
  kept aboard (`confine`: inside her sides; `restAt`: the deck, or the hold
  through the hatch). Gibs flagged `dry` skip the sea's float/hide and are
  folded into the rubble merge once at rest. Sacks are cloth and stay. The save
  carries `shipBrk` (unit indices).
- **The rest of the flicker scan** (rays from eye height in every direction,
  deck and hold): the quarters bulkhead and the window glass ran to exactly
  `DECK_Y` / the sill and head (now 2 cm short / 2 cm into them); the coaming
  started on the deck (its foot is 3 cm down through it now); the door steps'
  risers shared their treads' tops and the deck; the hatch edge pieces filled
  the same cube at each corner; the hold frames' overlapping segments were one
  section (every other one 4 mm slimmer). And **the deck has an underside**, a
  second sheet 2.5 cm down: as one double-sided sheet, everything standing on
  the deck had its bottom face in the hold's ceiling. The sole's half-width is
  clamped at 0.05 at the stem. A scanner trap: a ray that lands exactly on a
  grid line hits two neighbouring triangles of one mesh at the same distance —
  that is a shared edge, not a fight (the scan at z = 0 reported both the sole
  and the deck "overlapping themselves" from it).
- **The bow** after the 4 mm overlap: 0 of 1,296 rays from inside her bow
  below the rail get out.
