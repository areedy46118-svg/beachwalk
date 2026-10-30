# The whale: on the sand, the belly, the farewell

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**The gutting crate is there to hide the cut-out's bottom edge.** A
photograph ends somewhere, and that hard horizontal line at his boots is the
one thing that gives a sprite away — so something has to stand in front of
it. A fish crate a man sitting in a shed would be working over earns its
place twice. It goes on the DOOR side of him, because a billboard is only
occluded by what is genuinely nearer the camera, and the doorway is the only
direction anyone sees him from. `bakeCutout` takes `grain` and `sat` now: he
is the one cut-out you stand close to, so he bakes at 620 px with far less
grain than Bradly, who is read across a beach.

**AND A PROJECTION IS NOT THE ANSWER WHEN THE MAP IS AN ATLAS.** The obvious
repair for a destroyed uv is the octopus ring's — sample the map triplanar
and blend by the normal — and it was built, measured and deleted. It works
only for a TILE. Drawing this church's own maps to a canvas settles it in one
look: `mur-bas_diffuse` is a grid of rounded panels with black gutters
between them, `colonne_diffuse` is a row of tall unwrapped strips. Projected
at the density the geometry implies the surface is nearly a flat colour
(1 tile per 47 m); projected at anything you can see, it draws the gutters as
bright and dark stripes. **Look at the map before deciding a projection can
stand in for a uv.**

**THE WHALE: A DOOR IN THE SAND WALL NEAR THE LIGHTHOUSE, AND BEHIND IT YOU
ARE SWALLOWED.** (SUPERSEDED: the door, `WH_DOOR_Z` and `fitWhaleDoor` are
gone; the way in is the beached whale's own mouth — see "THE WHALE ON THE
SAND" at the end of this file. The belly below is unchanged.) `WH_DOOR_Z` (= `LH_Z + 92`, just short of the headland) was a
built sea door — weathered planks, a lintel, iron straps and a ring, lifted off
its own maps — fitted to the drawn dune lazily (`fitWhaleDoor`, the catacombs
door's own raycasts) from `updateCatacombs`' beach branch. The owner will move
the entry later; `startWhale(1)` is the one call it has to make. The room is
at (15000, 500, 15000) and is ENTIRELY GENERATED (`buildWhale`), built at the
cut behind the black (about 200 ms, and `renderer.compile` there too — the
keep island's argument) and never before:
- **The gut is one parametric tube**: a heart-shaped section (`whR`: an
  ellipse with a cleft down the vault and a lobe either side), bending
  (`whCx`), closing at both ends (`whScale`: the throat behind you, a black
  hole high in the wall, and the far end narrowing into the dark), with an
  arch every eight metres (`WH_RIBS`/`whRib`, displaced inward) and two
  families of wandering folds. Wound to face INTO the tube (FrontSide). The
  walk's walls are MEASURED off that same geometry per ring at body height
  (`wallL`/`wallR`); the floor is a function (`whFloor`: a bowl, mounds, a
  channel of fluid widening into pools, the parlour's mound, the throat's
  slope), so the walk and the mesh cannot disagree.
- **The light is from your eye, and that is the look.** A flat emissive fill
  hid every arch; the fill is multiplied by the baked AO (vertex colour) and by
  how squarely the surface faces you (`lights_fragment_begin`), so crests catch
  it and the far side of every arch goes black — the receding heart rings of
  the second reference — plus a tight wet glisten off the normal map. Keep the
  glisten TIGHT (pow 70, 0.05): at pow 26 / 0.10 it painted whole arch faces
  grey. **A constant emissive of 0.012 linear is a visible grey after ACES**;
  that is what turned the fluid into a concrete road.
- **The fluid** is a flat plane at `WH_FLUID` showing only where the floor
  dips under it: dark, a Fresnel that gives back the walls' red, scrolling
  ripple normals and cold bioluminescent specks; wading slows you
  (`updateWhale` scales the frame's move) and the step is the `wade` bank.
- **Alive**: a peristaltic wave in the vertex shader (never in the walk),
  mucus strands swaying and dripping (drips heard where they land, splashes
  into the fluid), bubbles that rise and burst with a gulp, spores round you,
  mist on the fluid, bio colonies pulsing on the walls with small cold lamps,
  and the throat's cold light and shaft over the landing slope.
- **Furnished**: the parlour at `WH_PARLOUR` — armchair, lit standing lamp (an
  unfogged beacon so it is seen from the landing), side table with a book and
  a teacup, rug, and a clock RAYCAST onto the gut wall that keeps real time
  and ticks within 13 m — plus a half-sunk rowboat with a burning lantern, a
  wreck's ribs, an anchor and chain, barrels, crates, bottles and fish bones.
  Things it swallowed are lifted off their own maps, or they are holes.
- **Quiet**: `updateWhaleAudio` — a heart far too slow, the gut groaning, the
  whale singing very rarely through the body (all under 240 Hz), the clock,
  and `ucVerbGain` at 0.66 so everything has the gut's wet tail.
It is on every room list (`inRoom`, `indoors`, the hall cull, the cliff
clamp, `clearRoomFlags`, `dropTargets`, `bunkerFloorAt`, the P readout), and
`whaleBusy` is in `frozen()`. (SUPERSEDED: there IS a checkpoint — see "THE SEVEN IN THE WHALE" at the end of this file.)

**THE WHALE'S GUT IS EMPTY.** Furniture, lamps, beacons, the clock, the boat,
the wreck, the anchor, the barrels, the colonies' lamps and the throat's lamp
are all out, by the owner's word; the gut has no point light in it at all now.
And its walk was the glitch: the walls were read off the NEAREST RING and
clamped in x alone, so every arch (three metres of rib over two) was a
sideways jump the frame you crossed onto its ring. The walls are a smoothed
curve between the rings now (`wallLs`/`wallRs`, `whWallAt`), a body inside one
is pushed out along the curve's own normal in (x, s), and on the ground a body
stays on the gut's floor downhill instead of falling down it a few centimetres
at a time. Measured over nine walks along and into the walls: worst step
0.062 m, no reversals. **A test that jumps from one room to another with
`place*` leaves the first room's flag set** — the church's walk went on
clamping the body and the whale read as "nothing moves at all". Reload between
rooms.

**THE WHALE ON THE SAND, AND ITS MOUTH IS THE WAY INTO THE BELLY.** Bohdan
Lvov's "Blue Whale - Textured" (CC-BY-4.0, `assets/whale.glb`, `gltfpack.py
--tex 2048 --normal-tex 2048`) lies at `WB_Z = CAT_OUT_Z - 175`, past the five:
the snout at `WB_SNOUT_X` 10.2, a stride short of the dune with a four-metre
corridor between them, and the body running straight out into the sea
(`WB_DIR`, 7 degrees toward you) so you walk up on its whole flank. `startSwallow`
is the "Enter" under the crosshair on its mouth; it hands over to the belly's
own cut at its middle (`whaleT = WH_OUT`), and `placeOutOfWhale` puts you back
on the sand in front of its face with the jaw open and closing slowly. The song
is the owner's recording (`assets/whale-song.m4a`, the `whaleSong` bank),
looped from where it lies: silent past ~200 m, faint at 170, full beside it,
duller and panned with distance (`updateWhaleSong`). What it cost:

- **THE SKIN IS BAKED OFF THE SKELETON ONCE, AND EVERY MOTION IS A SHADER.**
  Its one clip is a swim. `wbBake` takes positions through `getVertexPosition`
  and normals through the same blended bone matrices, in the pose the file
  stands it in, into a plain mesh; `WB_GLSL`'s `wbDeform` does the breath, the
  jaw, the sag, the tail and the blink, on the skin, the eyes, the lids and the
  whole inside of the mouth alike (`wbInject`), so none of them can disagree.
- **THE MOUTH WAS ALREADY SPLIT.** The lower jaw is its own island of the
  mesh, cut from the head along the lip line (y = 96 from the snout back to the
  corner at z = 345, model units) — measured by flooding the index and asking
  which islands share positions. So `aG` (+1 head, -1 jaw) comes from which
  island a vertex is in, and one rotation about the corner of the mouth opens
  it with no hole but the mouth. The head's own vertices on the seam BELOW the
  corner go with the jaw, or a second mouth opens under the eye.
- **WHAT THE OPEN MOUTH SHOWS IS BUILT TO THE LIP LINE** (`wbMouthGeo`): a
  ridged palate, gums along both lips, a tongue with a furrow, cheeks stretched
  between the lips, a throat receding to black, and short baleen that
  retracts into the gum while the mouth is shut (`aK`). **THE CHEEKS ARE BUILT
  SHUT, A STRIP OF NO WIDTH, SO THEY HAVE NO NORMAL** — `computeVertexNormals`
  gave them zero and they drew black; they are given one facing out.
- **THE FILE'S POSE IS A SWIM, AND THREE THINGS UNDO IT.** The head is tipped
  up twenty degrees, so `wbBend` brings everything forward of the flippers down
  about a point under the corner of the mouth (every builder calls it, in the
  whale's own metres). The body is round, so from the side you saw UNDER it —
  its widest line a metre up — and it read as hovering; the settling pass
  pushes each section below its widest line out to that width, a function of
  position alone so a seam's two sides move together. And it arches, so its
  back half stood clear of the sea; the shader sags it (`wS`). Then it is
  sunk 0.75 m, sand is banked along both flanks, a contact shadow is laid under
  it, and the skin darkens toward the sand (`wbAO`, by world height) — what
  grounds a body here is the light that cannot get under it.
- **THE LENS IS 105 DEGREES VERTICAL**, about 130 across at 16:9, so a true
  blue whale and then a forty-metre one both read as a large fish. It is built
  in a thirty-two-metre animal's metres and the group scaled by `WB_K` (1.9,
  about sixty-one metres), so every number below scales with it.
- **THE SWALLOW'S PATH IS THE DRAWN GAPE, FROM WHERE YOU STAND.** `wbMouthAt`
  runs the same bend and the same hinge as the shader, and the path is you,
  halfway, the lips, over the tongue, the throat. Written in fixed local
  numbers it flew over the head (the bend had moved the mouth), and with its
  first point in front of the snout it backed you up and swung you round to
  the moon.
- **Hurt**: three propeller cuts and a gash by the flipper, tapered and torn,
  black-red where deep with a torn lip of blubber, blood run down its side and
  soaked round them, old round scars, a harpoon measured onto the skin with
  its line trailing into the sand, blood pools on the sand and a slow cloud of
  it in the water (`oceanUniforms.uBlood`). The flippers are marked (`aE` 6)
  and carry none. **Alive**: a ragged breath with a catch after it and mist
  off the blowhole (`wbExhale`, `sfxWhaleBreath`), a slow blink with a lid of
  its own skin coming down over each eye, the tail lifting out of the sea now
  and then and splashing back. **Lit**: a cold key over the beach side that the
  face and eye come into, the sea's glow low on the flank, a moon rim and the
  moon's own glint broken by water running down it, drops that catch the light,
  a little of the surf's glow clinging low; the fog on it is thinned
  (`vFogDepth *= 0.66`) so its silhouette stands against the moon from a long
  way up the beach, and the sky clears over it (`updateMood`, key 14).
- The marauder moved to where the door was (`UMBRA_Z = LH_Z + 92`).
- `tools/whalecap.js` captures a swallow on a fake clock; `__bw.wbGet()`,
  `wbU` and `startSwallow` are on the harness.

**THE WALK DOWN TO THE WHALE IS ITS OWN PLACE, AND IT RUNS ON THE TRACK'S
CLOCK.** Past the five's fire (`WS_Z0 = CAT_OUT_Z - 48`) the beach goes into
a silver mist. The first frame the whale's call is audible there (its song's
distance gain over 0.2 on the same curve `updateWhaleSong` uses), with nothing
awake near you, the owner's "whale sighting" starts (`assets/whale-sighting.m4a`,
57 s, on the music slider at `WS_LEVEL`; `WS_LEVEL`, `wsGain` and `wsSrc` are
declared up by the keep intro because `applySettings` reads them at load).
The track swells at 15 s (measured, -26 dB to -13 in one second), and
`WS_SWELL` is where the whale is seen:
- **THE REVEAL IS READ OFF THE TRACK, NOT THE DISTANCE** (`wsTime`: the audio
  clock while it plays, the wall clock if there is no audio). Walking is
  3.4 m/s, so fifteen seconds is fifty metres, but a player who stops, runs or
  fights would put the swell and the reveal in different places. `wsR` is a
  smoothstep over 12.5-17.5 s, raised anyway inside 55 m of the snout; a player
  who arrives near is started part way in so the swell is still ahead. Measured
  in real time at walk pace: started 126 m from the snout, revealed at 15.5 s
  about 73 m out.
- **Before the swell** (`wsM`, the mist, = the stretch times 1 - 0.82 R): the
  fog is thickened up to 2.9 times (`updateMood`), the ground mist 3.4 times,
  and 56 moonlit mist banks (`wsBanks`) stand on the sand and the water. The
  moon only now and then gets a shaft through (`wsBeams`, each peeking on its
  own count). The whale is a dark mass in it.
- **At the swell** the banks between you and the whale draw aside, the cloud
  opens over it (the whale term in `updateMood`'s `clear` is gated on `wsR`),
  the shafts stand on its back, the screen-space moon rays strengthen
  (`beachRays`), its key light comes up from a fifth, and a moon-kiss light
  rises over its back. Motes glitter in the moonlight the whole way (`wsMotes`).
- `whaleSighted` is on the save, and a save past the whale has seen it. The
  harness has `wsState()`, `startSighting(offset)` and `wsReset()`.

**THE BEACHED WHALE, ALIVE (round 14).** Everything moves in `WB_GLSL`'s
vertex shader off baked attributes (`aE` kind: 3/4 upper lids, 13/14 lower
lids, 6 flippers, 9 tongue, 15 saliva); `updateWhaleBeach` drives it:
- **EYES AND LIDS.** The blink was the eyeball squashing. Each eye now has two
  real lids baked out of the head's own skin (uv taken from the nearest head
  vertex beside the socket), an upper that comes down 70 % of the way and a
  lower that meets it; the eye turns toward you inside 40 m (`uEyeRot*`, a
  mat3 — write it with `U.value.setFromMatrix4`, a Uniform has no such
  method) with darts and a slerp.
- **THE JAW LIES ON THE SAND; THE HEAD OPENS.** `WB_OPEN_DN` 0.035 against
  `WB_OPEN_UP` 0.33: a lower jaw swung down through a beach is a jaw in the
  sand. The mouth is textured per surface with relief (`wbMouthMat`: palate
  ridges and raphe, a spongy tongue with SCATTERED papillae — a jittered grid
  read as a studded mat — gums, throat rings, cheek folds, veins), finest
  detail faded past 14 m or it moirés at the retro scale; saliva strands
  (`wbMucusGeo`) sag as it opens; the tongue rolls you in during the swallow.
- Flippers lift and thud every 14–32 s, the skin shivers, water drips off it,
  barnacles are sparse patches on the rostrum and behind the blowhole only.
- **THE BERM IS GROUND AND IT IS A TONE.** Its contact rows initialised
  `lo = 9, hi = -9` — values that were right in a local frame and are
  nothing like a WORLD projection (~970), so one whole flank of the berm was
  built a hundred metres off at x -104 and only one side ever existed. It is
  rasterised onto a 0.25 m height grid at build (`wbBerm`, `wbBermAt`, read in
  `update()` beside the dock's drift). Under a 4 % moon a slope barely shades,
  so the ploughed look is a 2x-multiply overlay of the same triangles
  (`whaleBermTone`): a wet dark trench against the skin, runnels, a pale dry
  crest, clods (faded past 26 m), neutral past 4.8 m out, with distance, and
  SEAWARD OF `shoreLine` — the overlay has no discard, and over the surf its
  lift drew a pale sheet on the water.
- **NOTHING ON IT IS A STEP.** The body's discs are `top ≥ 3.2` and the
  flipper chains `≥ 2.4`: once the berm lifts your feet half a metre a
  1.2 m disc is within `ROCK_STEP` and you walked up onto the whale.
  Measured, 30 approaches with jumping: never nearer the skin than 0.53 m,
  feet on the berm, worst eye step 3 cm.
- The song lifts the whale's own calls round the 15 s swell (`sw` in
  `updateWhaleSong`, the loop realigned so file 17 s lands on it).
- **The belly**: `whFleshMaterial` carries sparse veins that pulse with the
  heart (`WH_U.uHeart`), the fog is `0x1f080b` at 0.030, and a drift of
  bioluminescent plankton (`air.plank`) wraps round you.

**THE HEAP IN FRONT OF THE WHALE'S CHIN WAS WOUND UPSIDE DOWN.** Every one of
its 1,920 triangles faced the sand, so from anywhere a player can stand it was
back-face culled and the head sat over bare beach; the flanks' rows were fine.
Its normals were upside down too, so the overlay's "faces that look up" read
it as a wall. Count the normals of a generated mesh (`cross(b-a, c-a).y`)
before blaming its material.

**THE DARK SQUARES ON THE WHALE'S HEAP WERE THE OVERLAY'S "CLODS".** Hard
world-aligned 9 cm cells (`floor(vW.xz * 11)`) darkened by 30 %: invisible by
moonlight, and under a glowstick at arm's length a field of dark squares that
read as holes. They are soft two-scale noise now. Two things about finding
it: a `farProps` entry has its `visible` rewritten by the far-cull every frame,
so hiding one before `__bw.frame` hides nothing (the first A/B said "not the
overlay" for that reason); and a `MeshNormalMaterial` swapped onto the berm is
the quick way to tell geometry from shading.

**Also:** the last mound short of the whale (z -852) holds a spliff; the
snorkeler laughs only before he has been roused (`snorkMet`), three or four a
visit, the first 3-6.5 s in and then every 15-32 s; and the marauder is harder
(74 health, poise 20, `speedK` 1.92, `aggr` 3.7, `comboGrace` 0.18, a guard
that holds more and costs more, knocked down less; the tells untouched).
Measured hands-off against a player standing still: 53 swings and 63 damage a
minute (it was about 48).

**THE SEVEN IN THE WHALE, AND A CHECKPOINT AT ITS THROAT.** PolyGoreStudio's
"Cursed Rune Demon" (CC-BY-4.0, `assets/demon.glb`, `gltfpack.py --tex 1024
--no-clips`, 0.36 MB) to the owner's "Scary Zombie Pack" — every clip, both
folders — through `tools/ntar_moves.py -- demon` (`assets/demon-moves.json`,
32 clips). The demon is itself a Mixamo rig (`mixamorig:Hips_56`, which three
spells `mixamorigHips_56`; `DB(name)` builds them), so `DEMON_RAG` maps the
ragdoll's names straight onto it.
- **A ZOMBIE PACK IS PERFORMANCES.** The bite lunges at frame 24 and gnaws
  for six seconds; the packer's `WINDOW` cuts each blow at the valleys of the
  hands' own speed curve (surveyed first with a throwaway Blender script), and
  its `CONTACT` may now be a TUPLE of ends — the fastest of them wins and is
  written as `by`. The gnawing is kept as `feed` (frames 52-200), and because
  it starts crouched it is in `HIP_FROM_REST`, or its hips read as standing.
- **THEY LIVE IN THE BELLY** (`kind.whaleBody`): `demonUnitPre` (hooked in
  `updateMutantUnit` after the cat branch) draws them only `inWhale`, stands
  them on `whFloor`, and runs their sleep — each kneels at one of the seven
  points of the rune star facing its middle, playing its own `sleep` clip —
  and the wake: within `DEMON_WAKE` (17 m) of any, or past `WH_ARENA_S - 14`,
  `demonAlarm` wakes the nearest at once and the rest a beat apart by
  distance, each turning to you and screaming (`roar`, `sfxScpScream`). A
  blow on a sleeping one is `provoke`. `demonClamp` (first line of
  `mutClampX`) holds them inside `whWallAt`'s curve and the throat/narrowing.
- **ONE AT A TIME, AND EASY** (the owner's word, round E): `frenzy` is off,
  so only the token holder swings; 7-9 health, poise 3, slower tells
  (`windK` 1.25), `aggr` 1.2, one-deep chains, few feints. `kind.frenzy` /
  `demonFrenzyOK` (two in the air) is still there if it is ever wanted, and
  **ONE HURT PER HALF SECOND** (`demonLastLand` in `mutLandBlow`) is shared
  by all seven. Measured on a passive player at the arena's middle: first
  build 120 damage a minute; frenzy 62; now about 12 swings and 10 damage a
  minute across the seven.
- **THE RUNES BURN** (`kind.matMore` → `demonRuneGlow`, a hook added after
  `reexpose` in `dressMutant`): the map's hot red-orange (sRGB 200-230 in
  red, where the flesh never passes 140) is added to the emissive, crawling.
- Death is the ordinary mutant ragdoll (non-boss path, limbs and heads).
  Seven variants (`DEMON_VARIANTS` → `MUT_KINDS.demon0..6`): heights 1.95-2.7,
  scaled bones, voices, speeds. At half health each rages (`rageClip: 'roar'`).
- **THE CHECKPOINT**: `autosaveNow('whaleIn')` on the swallow's cut,
  `saveRoom()` answers `'whale'`, `ROOM_BACK.whale` places you by
  `placeInWhale` (always ready: the belly is generated). Measured: the save
  restores to the exact spot with all seven there, and a killed one stays dead.

**THE BELLY'S ARENA AND ITS LIGHT** (`whBuildArena`, `whArenaTick`). The
floor between s 22 and WH_L-50 is flattened by `whArenaK` (the bowl opened,
the mounds rolled out, the channel let up to a sheet a hand deep), and:
- **A TEAL LIGHT ON RED FLESH LIGHTS NOTHING.** The glands were first a cold
  green-blue and the walls round them stayed black — red reflects none of it.
  They are pale gold now (a quarter amber), 40-48 over 18 m: under three's
  physical falloff an intensity of 13 on a 0.1 albedo read as nothing.
- **A STILL OF A POOLED LAMP UNDERSTATES IT**: `lpW` eases over a quarter
  second of the CLOCK, so frames run with rAF frozen and a real clock leave
  every lamp at a tenth of itself. Advance `performance.now` 16.7 ms a frame
  for the capture, and give it back afterwards (never backwards).
- The blowhole and the rune circle were built in round D and are GONE (round
  E, the owner's word): the moon comes in through the wounds instead (below).
  `WH_RUNE_R` survives only as the radius the demons kneel on and the remains
  are scattered over; Dennis's limbs lie there (`whPlaceRemains`).
- **THE FLUID FADES AT ITS EDGE**: a flat plane cut by the floor drew a hard
  straight line; the depth over the floor is baked once into a byte map (the
  floor is a function) and the last 12 cm fade (`uDepth`). The eye-lit fill
  on the flesh came down a third so the lamps model it.

**THE WHALE'S BERM IS A WHISPER** (the owner's word): the flank heap at 0.38
of its height, the chin ring at 0.38 and only 0.55 m up under the jaw, the
ridge 0.05, and the tone overlay a third of its strength.

**THE MOON THROUGH THE WHALE'S WOUNDS, AND THEY ARE THE SAME CUTS OUTSIDE AND
IN.** `WH_CUTS_EXT` holds the exterior cuts in `wbWounds`' own numbers;
`whWoundS` / `whWoundTh` map them onto the gut's (s, th), so each slash in the
belly wall is the other side of one you saw on the flank. The flesh shader
(`whFleshMaterial`, heave only, `aTh` per vertex, `WH_CUT_GLSL`) cuts them
with a torn lip, a pale band of cut blubber and the night through the middle —
navy, with stars, darkest at the edge where you look past the wall's
thickness, sinews still across it — and inside the hole the lit flesh is
REPLACED by the sky at `opaque_fragment`, or the wet glisten paints it grey.
**THE SKY IS LINEAR**: (0.13, 0.18, 0.34) came out a pale blue-grey slab;
(0.020, 0.032, 0.080) is a night. Each cut throws a sheet of moonlight
(additive shader, `renderOrder` 7) down onto the floor with a cold pooled
lamp where it lands (`A.moonLamps`, 20 / 15, `lpAlways` 50). Outside, the
wounds have a blubber band, striated muscle and clots, and a bump with a
ledge. **Syntax without node**: strip the `import` lines and run the file
through JavaScriptCore's `new Function` (`osascript -l JavaScript`); it gives
the line of a syntax error, and a stray raw newline inside a JS string built
for GLSL (`join('\n')` written with a real newline) is exactly what it
catches.

**THE WHALE'S MOUND ENDS AT THE HEAD.** The bow wave that wrapped round in
front of the chin met the flank heap in a sharp dark crease exactly where you
stand to go in at the mouth; the owner's word was to end the mound there and
make it clean. The ring is off (`WB_CHIN_RING`, false), and the flank heap
eases to nothing over its last 2.5 m of rows toward the snout
(`smoothstep(lz, 0.55, -2.0)`) and sinks a hand under the sand, so there is no
cut row across its end either.

**THE SEVEN FIGHT AS A PACK (`updateDemonPack`, `demonHold`).** Harder
(hp 10 base, 7-13 by temperament; `windK` 1.12, `aggr` 1.9, `chainMax` 2,
poise 4, a harder rage) and METHODICAL: a director, run once a frame by the
first live one, keeps TWO pressing (all of them once three are left) and the
rest HOLDING — each on a ring at its own `holdR`, circling on the strafe
clips, facing you, taking no turn (`maySwing` and `mutGiveToken` both skip a
holder). A presser rotates out after its `bursts` swings or `pressT` seconds,
between swings, and the holder that has waited longest (times `pressW`)
comes in; the STALKER (`flank`) comes in by way of your back. Pressers may
swing together, but a beat apart: the second only once the first is a third
of a second into its swing, three times in ten (`demonFrenzyOK`). Seven
temperaments in `DEMON_VARIANTS` — the caller (heavy, stays in, the neck grab
takes two), the reacher (long forearms, fights from range), the runt (one
swing and away, feints), the stalker, the hunch (guards and answers), the
stilt (kicks take two), the claws (flurries, three-deep chains) — each with
its own `use` table, bones and voice. Measured hands-off against a player
standing still: 60 swings and 52 damage a minute, two in a swing 21 % of the
time, the roles changing 23 times in 45 s. Bodies fly further (`kind.ragK`
1.65: a heavy kill throws the hips 3.4 m) and the ragdoll is held by the
gut's walls (`r.gut`), or they went out through the flesh.

**THE BELLY, REWORKED (in progress).** The glands' light is summed in the
flesh shader (`WH_GL`, `whGlUpdate` from the gut's and floor's
`onBeforeRender`): as seventeen pooled point lights each only took a slot once
the camera was inside its 18 m reach, so walls lit up as you walked to them.
The creatures are lit by four warm fills and the moon lamps, all `lpAlways`.
The arena floor carries radial veins pulsing with the heart, and a warm glow
sits deep at the far end. Belly creatures use `velGait` (`velGaitAnim`: the
clip comes off the body's own velocity in its own frame — walk, run,
walk-backwards, side-step — at the rate the stride keeps), `gaitMax` 1.35,
`noDash`, and `lungeK` (a lunge the clip does not carry is a skate). Demons
take the knight's strafes (`dStrL/R`) through `authorPickClips`, the generic
multi-pack retarget the parasites use. Parasites are bigger (3.15 / 2.95 m),
tinted to the room, with authored heavy claws (`authorParasiteOwn`: pcRakeR,
pcRakeL, pcMaul) plus the pounce, spin, combo and leap; no kicks or dodges.
NOT YET MEASURED: the fight's damage rate and whether the strafe direction
signs in `velGaitAnim` are right way round — check both in the preview.

Also this round: the church's far-door checkpoint replays the passing theme
(`saveTune`/`restoreTune`); Drop keeps the pack open and a stack has Drop all;
`addToInventory` refuses a ring you are wearing (the octopus ring duplicated
when its pickup replayed on a load); the knight's bar was the Dealer's bug.

**THE BELLY, ROUND E2: IT LOOKED CHEAP, AND IT WAS THE GRADE, NOT THE MODELS.**
Seen from the player's eye: a chrome floor (the fluid at roughness 0.16 and
the floor at 0.30 under 34-38 fills and 20 moon lamps), neon walls (the map's
red at full saturation), sticker wounds (a saturated blue night with a white
rim) and glossy red demons. Now: fog `0x0f0406` at 0.040, the flesh taken a
third to its own grey in `color_fragment` with emissive 0.80/0.40, floor
roughness 0.66 and fluid 0.42, fills 16-22, moon lamps 8-11, shafts and far
glow halved, the night in the cuts at a third, demons `tint 0x8c7672` with a
faint rim so the runes carry them.

**THE PARASITES' CLAWS ARE MOCAP.** `authorParasiteOwn` is deleted: posed arms
on a 3 m body read as a pole raised and dropped. A: the orc's `oCut`/`oCutC`/
`oChop` (`paCut`/`paCutB`/`paChop`), and the demon pack's `idle`/`idleS` for
idles. B: the zombie `zAtk`/`zAtkB` (`pbClaw`/`pbClaw2`) and `oChop`
(`pbChop`). Crossfades 0.22 demons, 0.26 parasites. Hands-off, standing still,
40 s: 57 swings and 37 damage across the nine.

**A STALE SAMPLE IS NOT A SPEED — the belly's "lagging back and forth".**
`velGaitAnim` measures a creature's velocity from its last position, and it
only runs while the creature is on its feet and not swinging — so the first
frame after a swing compared where it is with where it stood BEFORE the lunge,
read a metre or two in one frame, and `capStep` dragged it most of the way
back. Every swing of every demon and parasite ended with the body snapping
back to where it started. Traced with a setter on `position.x` that records a
stack on any write over 0.3 m. A sample older than a couple of frames
(`u._vgT`) restarts the measurement. Measured over sixty seconds of the belly
fight: largest single-frame move 2.17 m → 0.14 (a lunge). The parasites'
hold also flipped sides every frame straight behind the pack (`cross` near
zero); it has hysteresis now, its velocity is eased, and walking within 5.2 m
of one makes it fight instead of backing off at your own pace.

**Demons fly further**: `ragK` 2.45 and `ragVmax` 12 — a kind may exceed
`RAG_VMAX` in its FIRST flight only (`r.landed` false), which is the cap that
had been holding every throw to 6.5 m/s. Bodies travel 4.3-5.3 m (was
2.4-3.3) and still land flat and sleep. **Leaving the whale's mouth is a
checkpoint** (`autosaveNow()` after `placeOutOfWhale`).

**THE OWNER'S SOUNDS, ROUND OF THE WHALE'S FAREWELL.** Cut at their own
silences, each normalised to -3 dBFS (`/tmp` scratch `cut.py` shape: seek
BEFORE `-i`, or `afade`'s timestamps are the source's and the fade-out
silences the whole cue):
- `unlock` — every key through `keyUsed` → `sfxLockOpen`, which plays it and
  falls back to the synthesised lock only before the bank lands. Its turn is at
  0.72 s, under the doors' 0.85-0.9 s wait.
- `mutantVox` (6) — the eight `mutant.glb` kinds carry `voice.rec`, and
  `mutVox(role, dist, V)` answers roar / tell / hurt / die / laugh / hunger out
  of `MUT_VOX` (picks, gain, rate, a per-role cooldown), pitched by a gentle
  root of `V.f`. Everything else voiced is still synthesised.
- `dealerHit` (8) — the Dealer's voice has `grunt: 'dealerHit'`; `sfxMutHit`
  plays one on every hit.
- `catFall` is now his "catacombs fall music" (15.4 s, cut so the first note
  is the impact), started by `playCatFallMusic` on the landing cue AND on the
  dev-mode shortcut, on the music slider (`CAT_FALL_LEVEL`).
- `drainBreath` — under the face in the drain, `drainBreathTick(here)` rides
  the face's own fade through a lowpass and a pipe delay at
  `DRAIN_BREATH_LEVEL` 0.30 into the peek's own gain. Low on purpose.

**THE WHALE'S FAREWELL (`updateWhaleFarewell`, `WF_T`).** Kill all seven demons
and both parasites and 2.4 s later the whale says `whaleThanks` through the gut
(the fog goes warm), heaves, and puts you on the sand up the beach from its
flank (`wfPlaceOut`, `WF_VX` / `WF_VZ_OFF`). Then `whaleHeal` under a column
of light (`wfFx.beam`, a pool, 420 motes that gather and burst): the skin
shader's `uGlowZ` band runs tail to head, `uHealGlow` lights the wounds gold and
`uHeal` closes them (raw, deep, blood and rim all scaled), the harpoon is
thrown out and tumbles to the sand, the blood leaves the water, and a flash, a
ring and two breaths. It backs 46 m down the beach on its flippers (colliders
out, sand and surf thrown), turns in the shallows, swims out singing, lifts its
flukes and dives; and 116 m out in front of the moon it breaches — posed about
its centre of mass (`WF_COM`, `wfPose`), because a leap turns about that and
turning it about the snout swings the tail up as it levels — rolls, slams on
its side (`wfSplash`, `sfxWhaleSplash` late by the distance), and is gone
(`wbRemoveForGood`, `wbGone` on the save). Its fog is thinned for the breach
(`uWbFog`) or at 116 m it is gone in the haze. `wbFareCut` is in `frozen()`,
the lens and the pointer-lock guards; it plays in dev mode too. Harness:
`startWhaleFarewell`, `wfState`, `wbObj`, `placeInWhale`.

**THE WHALE'S FAREWELL IS CUT TO THE OWNER'S "WHALE LEAVING" (`assets/whale-leaving.m4a`,
100 s, AAC 192k, the file's own -1 dBFS peak).** Everything after you are put out on the sand
reads `C.S`, seconds into the song's own file: the cut runs it on the frame clock and pulls it
onto the song's clock only while the audio context is RUNNING (a suspended context's clock
stands still, and a take driven straight off it would stall for ever). The song starts
`WL_OFF` (5.5 s) into the file at the cut and fades up with the picture; the black holds up to
two seconds for it if it is still downloading (it is fetched while you fight in the belly).
The song's shape was measured off its loudness in half-second windows and every beat sits on
it (`WL`): the quiet build is the heal (the cloud parts, a column of light comes DOWN out of the
gap — `uDrop` on the beam — the lens goes up it and back down, the sea's own light rises off the
water all along the bay and drifts in on it, the light runs tail to head and back, the lens goes
in on its eye, the wounds fill gold and close, the harpoon is thrown out); the swell at 18.15 s
is the flash (gold rays off its body through the mist — `wfRay` takes the lighthouse's slot in
the sharpen pass's second ray source — a ring of light going out across the sea, `uHealSea` in
the ocean shader, its flippers lifting like wings); 27.45 it backs into the sea with its
flippers heaving on the song's 4.55 s phrase; 36.6 it turns and swims out leaving a wake of the
sea's light (`wfWake`) and its flukes slap on the 45.75 section; under, a light moves out under
the water (`uGlowSea`) to where it breaches in front of the moon (52.4, landing ~59); 64 it
surfaces once more far out, spouts on the 68.4 peak and goes under with its flukes against the
moon; 80.5 the lens lifts to the moon; 86.3 — the song's last climax — you have your hands back
and the song plays on out under you (a room fades it). Letterbox bars and no HUD for the length
of it, nothing in your hands (the view model is not drawn while `wbFareCut.cue.cut`), and Enter
skips it once you are on the sand (`wfFinish(true)`). `tools`-free: `__bw.wfState().S` is where
it is.

**THE DEMONS' BLOWS ARE READ OFF THEIR RUNES (`demonTellTick`, `uDemTell`).** Every rune on the
one winding up flares from orange to white-hot through the cock, peaks on the strike and dies
back. The uniform is created when `demonRuneGlow` attaches (it only exists on the material after
a compile otherwise, and a cache taken before then is empty). Their reaches came in 0.4 m, the
lunge closes WITH the blow (`lungeLead`), `limbR` 0.40 and `landSlop` 0.26, `windK` 1.34 and a
0.52 s shared hurt gate: measured with the player standing in the arena, 36 hurts a minute (was
52), every one from a blow landing within 1.4 m.

**THE FAREWELL ENDS ON THE SPLASH, AND THE SONG STARTS LATER TO FIT.** The
cues keep the take's original clock; `WL_START` (39.0) is where in the FILE
the song now begins and `wfMapS` maps the song's real position onto that
clock (`WL_MAP`: the quiet at 38.5, swells at 50.0 / 57.5 / 68.0 / 82.5, the
last climax 86.5-90, the fade from 91.5). After the breach the map runs 1:1,
the slam lands on the climax and `wfFinish` fires 4.4 s after it, under the
song's own fade; the surfacing, the spout and the sky are parked past the
end. **AND THE ARTIFACT IS MADE OF THE HEAL'S LIGHT**: after the flash the
motes stream to `C.artP` (a few strides in front of you, worked out in
`wfPlaceOut`) and spiral into a ball; at `WL_ART` the artifact forms there,
drops into the sand (a puff, `sfxSandDrop`) and lies with its shaft and
glint, takeable once the take lets go. The belly no longer gives it up and
the farewell no longer waits on it; `art.spot` / `artAt` on the save puts it
back on the beach. `tools/wftest.js` runs the take on a fake clock.

**THE ARTIFACT IS SCRIMSHAW, NOT PRIMITIVES.** The first was a smooth gold
torus with cone spikes and a white lathe whale, every part a primitive with
no surface — "it looks like AI". `makeWhaleArtifact` is a domed disc of
whalebone with a humpback engraved into it (lamp-black in the cuts, a
crescent moon, stars, curling waves, WHAT THE SEA TAKES IT KEEPS round the
rim), set in a bronze bezel with verdigris in the recesses, the crown rubbed
bright, rivets (one lost), barnacles, a tarred cord through the bail, and a
small glowing stone in the whale's eye (`ART_EYE`). Every map is DRAWN at
load (`artFaceMaps`, `artBackMaps`, `artBronzeMaps`, `artCrustMaps`), colour
and height in one pass, height through `artNormalFrom`. Two things that read
wrong on the first draw: a hundred and seventy strong growth lines are WOOD
grain, not bone (forty-six faint ones); and a slim pointed outline is a FISH
(a humpback is a third as deep as it is long, blunt at the head).
`tools/artshot.js` renders it from four angles. `ICON_CACHE_V` went to v5.

**THE ARTIFACT'S MARK IS A WHALE** (`ART_WHALE_SVG` / `ART_WHALE_URL`, a `var`
so the style block at module time can read it): on the weapon's slot in the
hotbar and the pack, and beside its name in the pane. Glow is
`filter: drop-shadow`, which follows a background image's alpha (a
box-shadow would draw a square).

**THE WHALE'S CUTS ARE REAL HOLES ONTO THE BEACH'S SKY.** The gut's flesh
shader DISCARDS inside a cut (sinews across it stay flesh), and the beach's
sky dome is kept visible while you are in the belly (`whaleEnter`), centred
on the eye (`update`: `if (inWhale) sky.position.copy(camera.position)`) and
left out of the hall cull. Two things stood outside the walls and only showed
once the holes were open: the floor mesh, laid 40 m across and rising to 14 m
outside the gut (`whBuildFloor` now keeps a quad only if a corner is inside
the gut's own drawn section at its ring, ray-cast against `gut.pos`), and the
moon shafts' wide tops, which now fade over their first 2.4 m.

**AN ARTIFACT SHOWS AS A GOLD BORDER**, not the whale icon: `.slot.art` in
the hotbar and `.islot.art` in the pack carry a gold edge and glow, brighter
with each hit of the chain (`art1`, `art2`, `artpulse`) and dim while it
recharges (`artcd`). The pane's line about it keeps its whale.


**THE ARTIFACT'S REVEAL IS NOT LOOT (the owner: it looked AI-made).** On the
sand there is no gold shaft, no hover, no spin, no bob, no rising jingle and
no sand puff: the heal's motes drift in loosely and come down like sparks,
each to its own spot round it (all onto one circle read as a halo), and go
out as they land; the artifact lies face up in the sand, tilted toward you
with one edge of the bezel in it, and drops its last 12 cm with a soft thud.
Its lamp is a dim warm glow (0.45, a brief 2.0 as it lands) and its shine is
smaller than an ordinary pickup's. The belly's old spawn keeps the shaft.

**THE CUTS ARE SEE-THROUGH, AND NOTHING HANGS IN THEM.** The sinews drawn
across the holes read as scraps floating in mid-air (the owner's "floating
textures in the space of the cuts") — gone; a cut is a discard and what shows
through it is the sky dome (`whaleEnter` keeps it visible), moon, stars and
clouds. And the pale band of cut blubber round each hole was a white outline:
it is darker and half as wide now, a torn edge rather than a frame.

**THE BELLY FIGHT, PUSHED (2026-10-13; "the parasite and demons fight is not fun
… make their hits better … make it harder … spread more … the parasites' jump
hit slides towards you after they hit and does damage").**
- **The pounce**: `A.air` is a swing's own flight time; the lunge runs from
  `wind − air` and stops ON the contact frame (no `strike + 0.12` tail), closing
  exactly the gap that is there. `paPounce` hit 0.49 / air 1.05 (off the knight's
  jump clip: off the floor at 0.53 s, fists down at 1.60–1.67 of 3.33 — the
  knight's 0.64 was measured at his double speed); `pbLeap` 0.51 / 0.65.
  Measured from 5.2 m: 5.2 → 1.9 m in the air, damage at 1.67 s against a
  1.63 s contact, no slide after.
- **Parasites**: `lungeLead` 0.25; their cuts at `rate` 1.2 (natural swings —
  `windK` never reached them); wait at 5.5–7.5 m (was 8–11.5), first raid after
  1.5–3 s, again after 2–4 (was 3.5–8.5), 2–3 swings a raid, and both at once
  with three or fewer demons left. B walks the Mutant walk/run (it had two
  plain human walks and a sideways run). Late clips reset `_gaitMeasured`.
- **Demons**: three press down to the last three; a holder that is hit, or that
  you come within 3 m of, presses; holders take EVEN slots round you
  (`pk.slotA`, steering `pk.side` toward theirs) rather than one arc in front of
  you; `holdR` × 0.75; the shared hurt gate 520 → 340 ms; walkC and runB out of
  the gait pools. **A `gaitLo` 0.6 floor was tried and taken out**: A/B on
  `__bellyRun`, foot slip 1.64 → 1.97 m/s.
- **Measured** (`tools/bellyrun.js`, 40 s standing still): demons 53 swings,
  parasites 30, 50 damage taken.
- **Still to do**: their feet slip 1–3 m/s while circling (the strafe clips'
  own speed against the ring's tangential speed) — the next thing for their
  animation.

## The demons, 2026-10-14 ("they never attack they slide … they just stand there like they are dumb")
Why (measured/read): 3 of 7 allowed to press; a chase capped at ~walking pace (`gaitMax` 1.35 × a 2.65 m/s run);
a failed `demonFrenzyOK` cost a 0.5–1.3 s circle; `restless: 0` (the statue); the wind-up walk-in skated at
3.7 m/s on a planted attack clip; waiting demons circled on the knight's borrowed strafes whose feet travel
FORWARD. Now: four press (`nPress`), pincer roll 0.15 → 0.45, `bursts` 3, `pressT` 9, `gaitMax` 1.8 (a chase over
your walk, under your sprint), `lungeK` 0.45 + `lungeMax` 3.6, `windWalkK` 0.3, `restless: 1`, `waitSide` 0.35,
`anim.walk`/`gaits.walk` = `walkB` (the 0.33 m/s `walk` out), and `prowl: 0.85` — a holder walks its arc FACING
where it goes on its own walk, stopping to face you between legs; a circling presser goes at that pace too. The
shared hurt gate 340 → 750 ms (four pressing: each landed blow is one you can read). Measured 40 s: standing
69 swings / 51 hurts; walking a 3 m circle without fighting back 81 swings / 32 hurts (all belly creatures).
Foot slip while circling is still ~2.2 m/s on the strafes — the remaining fix is real side-step clips.

**THE SPLASH WAS STILL THERE FROM THE LIGHTHOUSE (2026-10-14).** `wfFinish` now
zeroes every `F.SP` life, clears the spray's `aA` attribute, and hides `F.spray`
and `F.wake`. From the
gallery's height the leftover spray was in view.

**ROUND 3 ON THE DEMONS ("still not doing enough fighting").** Measured (`__bellyRun`, 20 s standing): five pressed
but three of the seven were NEVER within reach (2.05 m) — `MUT_SEP` had gone to 3.2 for the beach pack (creatures.md)
and it is global, so at 3.2 m apart only two fit round you inside reach. `mutSeparate` now takes `kind.sep` (the
smaller of the two), and the demons stand at 1.7. Also: `nPress` 5, `demonFrenzyOK` lets a second in at 0.8 (was
0.45) and a third at 0.25, `aggr` 2.2, `press` 0.95, `windK` 1.22, `chainMax` 3, `bursts` 4, `pressT` 12, `holdR`
4.0, `gaitMax` 2.2, `circle` 0.12, `feint` 0.04, `sizeUp` 0, `waitSide` 0.2. Result: 19–26 swings in 20 s with 3–4 of
them fighting → 47 with six; damage taken ~1.1 a second, as before (the 750 ms hurt gate paces it).

**ROUND 4: SPREAD ROUND YOU, AND HARDER ("the demons need to spread out more and are way to easy you can hit them all
with one swipe").** `sep` 1.7 had packed the pressers into one arc in front of you. Now `sep` 2.5; the pressers are
walked along the circle round you toward their own `pk.slotA` as they close (`updateDemonPack`, ≤ 0.6 rad of error ×
1.6 m/s, not mid-blow), so they arrive from all sides; a cleave through a second body does `cleaveK` 0.45 of the blow
(`bladeHitMutant`, the first body full); `hp` 10 → 14, `poise` 4 → 5. Measured, 20 s standing: 4.84 in reach on
average, but the most inside any one 110° arc is 2–3 (mean 2.27; never 4+); 37 swings, 17 hits landed.

## The beached whale moved 20 m toward the castle (2026-10-15)

"push the hurt whale intro scene a little closer towards the castle … i don't want the whale scenes music to play
when you are close to the tree they should be different parts." `WB_Z = CAT_OUT_Z − 195` (−995; it was −975): its
far side (z −1019) is 37 m short of the castle's gate (−1057) and 21 m short of the trader (−1040). Everything hung on
`WB_Z` moves with it; the two absolute copies were updated (`ROOM_Z.whale` 995 in `BW_FROM`, `whale.glb`'s reach
980). `WS_Z0 = WB_Z + 127` (the sighting track's start, 127 m short of the snout as before: −868). `WB_SONG_FAR`
180 → 150, so the whale's own calls are first heard ~31 m past the fishing tree. A mound at (12.6, −987.7) now sits
by its head: `settleMounds` moves mounds off solids, and the whale's colliders are solids.
- (later the same day) `WB_SONG_FAR` back to 180: the sighting track starts where `1 − (d − NEAR)/(FAR − NEAR) > 0.2`
  — the song's range — and at 150 the track started ~24 m later and the fog's clearing came off the music's swell.
- (2026-10-15 again) "the fog hiding the whale used to work way better before we moved him": the TOWER's clearing
  (`moodKeys`: `smoothstep(430 − twr, 0, 260)`, which also parts the cloud over the moon) reaches 20 m deeper into the
  misted stretch now — about 0.5 against 0.37 before the reveal — and the whale stood against a clearing sky. It is
  multiplied by `1 − wsM` now: while the sighting's mist is up the tower clears nothing; at the swell it comes back.

**SKRIM, AND THE BELLY EMPTIED (2026-10-29, the owner: "take out all enemies in the whales mouth and free up space with
their models. add this character named 'Skrim' …", his script word for word, and a water-magic fight on its two bad ends).**
- **The seven demons and the two parasites are gone**: their spawns (`demonUnits` / `parasiteUnits` stay as empty
  lists for the code that walks them), `assets/demon.glb` and `assets/parasite.glb` deleted (1.2 MB), the room's file
  lists and reach table carry `skrim.glb` / `skrim-moves.json` instead. `assets/demon-moves.json` STAYS: the minotaur's
  roar (`MINO_PACKS`, `dRoar`) is in it. `statKillTotal` counts Skrim as one. `wbBellyClear` (the farewell's trigger)
  is now Skrim dead or held to his deal.
- **His files**: `tools/skrim_pack.py` (Blender; "Dagon's sectarian", CC-BY-4.0, bones renamed onto `Character1_*`
  so `ntarRetarget` maps them by itself, 16.7k verts, 1.98 MB, 1.85 m, facing +Z, a steep A-pose rest) and
  `tools/ntar_moves.py -- skrim` (all 56 Pro Magic Pack clips, `TAKE_FROM_ACTION`: the takes run to the armature
  action's own end, not the 250-frame scene). Keys: idle/idle2-4, walk/walkB/walkL/walkR, run…, crouchIdle…,
  fromCrouch, m1A1-3, m2A1-5, area1-2, cast1-2, block*, hitS*/hitL*, die*, jump….
- **Where**: `whBuildArena` records every moonbeam's floor point (`A.skrimSpots`) and kneels him under the widest
  (`A.skrimSpot`), the heap (`whFleshPile`: icospheres pushed out on noise, vertex-coloured folds, wet roughness) beside
  him. `skrimDigPose` lays a slow dig on `crouchIdle` (arms in and out, head down) — he never looks at you.
- **Talk** (`SKRIM_NPC`, `skrimTalk` / `skrimLeave`): "Fine here." shows only with 4 jars and spends them
  (`spendJars`, `SKRIM.paid`); "*Kill him*" and "No, I want it." → "I tried to be nice." start the fight
  (`SKRIM.fightNext` → `skrimFight`, `fromCrouch`); "Of course, as long as you promise to heal the whale" is the deal
  (`stage 'deal'`). A blow on him while he digs starts it too. On the save as `flags.skrim` ('deal' / 'paid').
- **His fight** (`skrimFightStep`): a ring 5.8–9 m out, strafing, turning sides; moves `SK_ACTS` — bolt (a ball from
  his right hand), volley (3, enraged 5, fanned, both hands), geyser (its circle under you first, `skwGeyserTell`, up
  at 0.55 of the clip), wave (a ring along the floor: jump it or guard it), palm (close: a water-burst strike,
  blockable, parryable — a parry stuns him), dash (back out of reach in a spray, after two blows in 1.5 s or when you
  close), nova (at half health, once: a ring bursting off him). Struck before two-thirds of a wind-up, he flinches
  and the cast breaks. A ball's release is the frame his hand goes out fastest (`skrimRelease`, measured once a clip).
- **Balls** (`SKW.balls`): 15.5 m/s, homing for 0.35 s, a little lead. Reaching you: guard → `blockMutant` + splash;
  guard inside the parry window → it goes BACK at him (21 m/s, homing) for 7; otherwise 1.
- **The water** (`skwMat`): MeshPhysicalMaterial transmission 1, ior 1.33, attenuation blue-green over 0.42 m,
  clear coat; its vertices moved on a noise field (`SKW_NOISE`) so it quivers. Droplets: one InstancedMesh of 500,
  stretched along velocity. Splash = droplets + mist sprites + a crown (torn-rim cylinder shader) + a wet gloss decal
  that dries over 7 s. Geyser column and wave lip are their own flowing-foam shaders.
- **His dig is AIMED**: `skrimDigPose` turns each upper arm so shoulder→hand points at a place on the heap (in and out
  on his clock), and bows his head toward it. Turns about his own axes (two tries) held his arms out level over it:
  this rig's crouch carries them forward. The heap is rough (0.62) and dark — at 0.34 its glints read as red stones.
- **The release frame is measured BEFORE the clip is played** (`skrimRelease` scrubs the mixer; after, it stopped
  the clip just begun, and he cast standing still).
- **The wave's lip and the geyser's column are water too** (`skwBodyMat`: the transmission material with its own
  vertex stage), with only their foam in the shader over them — a white shader alone read as plastic at range. The
  balls are 0.26 m with a faint additive glow (`skwGlow`) so they read in the dark.
- Probe `skrimIn` (`skrimDig` for the stills only): over 40 s of fixed 1/60 steps he cast ~12 times; with your guard
  held (the probe must hold `mouseBtns & 2` too: `blocking` is dropped every frame without the button, line ~45815,
  `__bw.setGuardTest`) blocked 7, parried 4 (him 120 → 92), 5 on you (the geysers, and balls with the guard down).
  Frame cost of the transmission pass while his water is on screen was NOT measured.

## 2026-10-29 (later) — the belly darker, Skrim lit, his search, the walk up to him; his chains

The owner: "make inside the whale way more atmospheric it should be darker with more shine onto skrim. make the flesh pile
look more like this [a raw meat mound with bones in it] … have him search through it better … moving bones throwing flesh
to the side. make walking up on skrim way more cinematic"; then "his loading screen and moves are horrible … sliding all
over and its lagging bad try that he throws and swings chains … like hellraiser chains swinging and big chains he summons
through the ground like the water. make performance better than the water. use the hook his model has on these chains".
- **THE MOON LAMPS WERE ALL AT THE WHALE'S ORIGIN.** `ml.position.copy(T).lerp(H, 0.3); ml.userData.lpAlways = 50;` sat
  inside the `//` comment on the line above it (in HEAD too). Fixed — and the lamps at their cuts lit the floor brighter,
  so the darkening had to be measured, not reasoned: probe `skrimLight` lists every point light near him by owner
  (FILL / MOON / pool) and renders with the wash, the glands and the lights each off. The floor was the point lights;
  the glands (`uWhN`) hardly mattered. `WH_DARK` { gl 0.45, fill 0.13, moon 0.14, wash 0.42 } (the wash is `uWhMoon`,
  1.5 before). His lamp (`L.skrim`) distance 9 decay 1.4 (a pool on him, not the floor), ×`whMood.beam` 1.6 → 2.6.
- **THE HEAP** (`whFleshPile`, `whMeatMap`, `whLump`, `whBoneGeo`): a painted muscle map (pieces, grain, fat, the black
  between) as map + bump, roughness 0.42; lumps welded with `mergeVertices` (an icosahedron comes unindexed: its normals
  were the faces' — facets with a white glint on each) with their own planar UVs; ten bones (0.42–0.82 m) standing out
  of it. Returns the bones. He kneels 1.05 m from its middle (`SKRIM_OFF` 0.95/0.45; at 0.5 he was inside it).
- **HIS SEARCH** (`skrimSearch`, `updateSkrimLife`): off `animate`, NOT `update` (a dialogue returns `update` early: he
  froze while you talked). Aimed upper arms (`skrimAimArm`), eased targets, a lean at the waist BEFORE the aims, the
  head (`skrimLookAt`). Loop dig → fling / bone (every third). The bone is `attach`ed to his hand and SEATED at the hand
  (`position.set(0,0,0)`: the aimed hand never quite reaches it, and it floated a hand off his fist). Guard each grab
  with a flag of its own (`R.got`): after the throw the "not holding" test re-grabbed the same bone every frame — 106
  throws counted in 40 s. Thrown things fly in the whale group's frame (`skrimFlyTick`, floor `whFloor`).
- **THE WALK UP** (`updateSkrimMood`): `whMood.cine` from 14 → 6 m (1 in a dialogue), dims the glands/fills, raises his
  beam, black bars (z-index 3: under the HUD and the dialogue), a drone (saws at 36.7/37.3/55/73.6 Hz through 220 Hz
  lowpass + banded noise, on `sfxOutBase`), dust motes in the beam (`whBeamMotes`).
- **CHAINS, NOT WATER** (`SKC`, `skcInit`, `skcTick`, `skcLay`, `updateSkrimChains`): the water built and disposed a
  material per splash — a shader compile mid-fight each time. Every link is one `InstancedMesh` (1800); the hooks are
  meshes of HIS hook's geometry (bind-pose `skrim_hook`, put on its handle at min z, pointing +Z) out of a pool;
  everything is made in `skcInit` while he digs and parked at y −1000 (drawn, so compiled). Kinds: dangle (the sling
  whirl in the wind-up), throw (out / bite + yank / slack / whip back when parried / haul in over the floor), sweep
  (hits when the chain's angle crosses your bearing inside its reach), rise (pit ×4, line ×13, ring ×12). Sounds made
  (`sfxChainRattle`, `sfxChainRing`). Probes `skrimChains` (stills of each), `skrimIn` (40 s: 12 casts, blocks, parries,
  hits; 0 errors).
- **HIS FEET** (`SK_GAIT`, `skrimGait`): his clips' ground speeds read off `travel` — walk 1.67, walkB 1.21, walkL 1.33,
  walkR 1.38, runB 3.25 m/s — all four were played as if 1.35, and the dash was 6.5 m/s on the 3.25 clip. Velocity
  eased (2.5/s), the clip kept until another beats it by 0.3, turn 3.4 rad/s (2.6 mid-cast). His throws' release frames
  are measured during the rise, one a frame (`SK_MEASURE`): measuring scrubs 41 mixer steps.
- **"MY SCREEN WENT BLACK AT THE WHALE LOADING SCREEN"**: the owner loaded while `whBuildArena` called `whBeamMotes`
  before it was written. A half-made edit to anything the whale builds is a black screen for whoever is playing.
- **HE LOOKS UP ON "BRO…"** (`bro.enter` sets `SKRIM.lookT` 3.2 s; `skrimSearch` turns the look onto your eye). His
  look (`skrimLookAt`) takes the face's forward from the head bone to between his eyes (`c_eye_l/r`), neck 40% then
  head, ≤ 1.4 rad, and lifts the point by 0.7 × its distance: the eyes sit ~35° up off the head bone's front, and aimed
  by them his face still pointed at your chest (probe `skrimFace`, stills `bro_before/look/after`).
- **BLINK AND BREATH** (`skrimFace`, in the search and after the fight's mixer): Auto-Rig Pro lid bones
  `c_eyelid_top/bot_01..03_l/r` pivot on the eye's centre (measured 0.000 m off `c_eye_l`); turned about the line
  between the eyes, top −0.9 rad shuts the eye (+0.9 stares it open), bottom +0.15. No clip moves them: their rest is put
  back each frame. Breath: the chest about his lateral axis and the shoulders, 0.028 rad at ~0.5 Hz digging, 0.045
  quicker in the fight, quicker again angry.

## 2026-10-30 — the cave under the moon: rays, mist, cold; grounded heaps, real bones; his look

The owner, with a still of a creature crouched under shafts of cold light in a cave: "skrims scene needs to be darker
more scary with light rays shining down on him with subtle mist low on the ground moving … the bones and flesh piles look
awful make them not float on the ground … the bones in his hand look awful too like ai slop … make him stop searching for
a second then look at you more natural. his head turns too weird and should be longer … put some more flesh piles around".
- **WHAT LIT THE FLOOR PINK** (probe `skrimDig` now steps the game's own `update` — `b.step` — then `b.lamps()`, or its
  stills never showed the mood's dimming): floor means with each source off — all point lights off 49 → 14; the wash,
  the eye-lit fill and the glands hardly mattered; of the point lights only HIS lamp (39 at full mood, 6.5 m reach from
  3.4 m up). Now 3.0 m reach, decay 2, 2.4 m over him and his heap, colour 0x8aa2e0, `whMood.beam` 1.0 + 0.7·cine.
  `whMood.dim` 1 − 0.75·cine also takes the other moon lamps and the flesh's eye-lit fill (`uWhDim`, new uniform), and
  a COLD GRADE in the flesh shader (luma × (0.74, 0.86, 1.12), up to 0.8 of the way, on `uWhDim`). Fog goes toward
  0x03050a and +0.018 density with cine.
- **RAYS** (`whGodRays`): five soft cones out of his cut (one wide, four narrow at their own angles), edge-lit additive
  with dust streaks falling down them and a slow flicker; `A.rays.U.uI` 0.45 + 0.8·cine. **MIST** (`whGroundMist`):
  three 30 m sheets whose every vertex is put at the gut's floor + 0.1 / 0.32 / 0.6 m (no hard line where it meets the
  floor), two-octave fbm drifting, lit cold under the rays, faded near the lens and at its edge.
- **HEAPS** (`whFleshPile(G, x, s, rnd, K, nBones)`): every lump's geometry is sheared onto the curved floor under each
  vertex and sunk 4 cm (`whSeat`), darkened toward the floor through vertex colours (the contact shadow nothing else
  draws; the meat material is `vertexColors` now — `whLump` always carries a white colour attribute, or a chunk with
  none would draw black); a wet black-red pool under it laid on the floor itself (`whFloorDisc`, ragged `whPoolMap`
  alpha, its UVs turned per heap — a flat disc floated over half of it; at 0x1a0203 opaque it read as a hole); the beam's
  pool of light conformed the same way. Six more heaps (K 0.42–0.77) seeded round his within 3.5–11.5 m.
- **BONES** (`whBoneGeo(len, r, rnd, broken)`): lathe-turned — knuckled flaring ends, a narrow bowed shaft, a third
  snapped into splinters — vertex-coloured old yellow-white, blood up the end that was in the meat, grime in the flares;
  ribs in a row (`whRibGeo`, flat curved tubes).
- **HIS LOOK** (`SK_LOOK` {4.8 s: wait 0.55, rise 1.15, fall 1.2}): on "bro…" his hands stop in the meat (the search's
  clocks held), a beat, the head comes up and round, the chest following a little (≤ 0.21 rad), held, and slowly back.
  The face's forward is `skrimFaceDir`: head→eyes turned −0.61 rad about the eye line (`SK_FACE_TILT`), aimed from
  between the eyes — the earlier "lift the point 35°" was right far off and threw his head back at a bone under his chin.
  Measured: 1.5° off your eye. The inspected bone is held under his chin (−0.26).

## 2026-10-30 — Skrim's fight: his feet, his hook, his head, the chains as chains

The owner: "fix his animations i hate when his head leans back too much on that one move ... give the chains some more
realism ... he needs some normal swings too he slides around too much. when you are up close he does nothing and is easy
to hit he should back up to use the distant change or just swing his hook". Probe `skrimF2` (tools/probes.js; `&m=poses`
the head/swings/gait-scale numbers and stills, `&m=fight` four 10–14 s fights on fixed steps, `&m=chains` chain stills;
add `&wt=1` for mixer weights and a per-frame walk trace). Run it with `PB_PORT=4223`.
- **THE FOOT METRIC**: the lower toe while it is within 3 cm of the lowest that clip puts it (walk's toe never comes below
  6.7 cm of his root; walkB 4.2, runB 5.1, the rest ~3), its world speed. Before: walkL 0.84, walkR 1.21, walkB 0.85–1.08,
  walk 1.25, runB 4.2 m/s. With root travel alone (scaled): 0.2–0.5 still (scrubbed in place — the hips' path in a take
  does not keep the stance foot's pace). With the foot lock (`skrimMix`): walkL 0.00, walk 0.06, walkB 0.05–0.2, runB
  0.01–0.14. What is left is close-in: the player put at 1.5 m every frame by the probe pushes him.
- **HIS STRIDE IS 0.75–0.82 OF THE TAKE'S** (him held still, gaits scrubbed: planted toe speed over root travel — walk
  0.80, walkB 0.82, walkL/R 0.75, runB 0.80; `SK_STRIDE`). SK_GAIT's speeds were all a quarter too fast for his feet.
- **`skrimMix`**: the mixer moved on, then he is moved by whatever keeps the planted toe where the last frame left it (its
  `matrixWorld` is still last frame's when `skrimMix` starts: nothing updates it between); with no foot down, the clips'
  `travel` deltas × weight × `SK_STRIDE`, loop wrap handled. `skrimTurn` turns about the planted toe. `k.vx/vz` only
  choose the clip now (`skrimGait`: idle under 0.45, a clip held ≥ 0.4 s, `kind.fade` 0.22). Backed onto the gut wall,
  `k.wallT` drops the backward part for 0.9 s (a walk into a wall is the clip playing with no motion: the worst skate).
- **A TRAP IN `skrimRelease`** (measuring scrubs the mixer): putting back `setEffectiveWeight` on EVERY action stopped any
  fade in progress, and a clip fading in stayed at part weight — three then blends the rest of the pose toward the bind
  pose: legs half frozen, every skate number 0.00 in that probe run. Only the measured clip's weight is put back now.
  (A probe that scrubs must `stop()` every action after, too.)
- **THE HEAD** (`skrimNeckFix`, after the mixer, before `skrimFace`): the face's pitch off his chest over the idle's
  (idle 53.9° off the chest, 28° up in the world), scrubbed through every fight clip — m1A3 122° at 0.47 (the bolt's and
  the sweep's clip: the one he did most), area1 63, cast2 35; in the world cast2 61, hitSF 49, area2 47, cast1 40, m1A3
  31. The neck (45%) and head (55%) are turned forward about his shoulders' line by 85% of whatever is over 30° off the
  chest or 20° up in the world (`SK_NECK`). m1A3 after: 24° off the chest (still `posefix_m1A3`). + about his left
  (cos y, 0, −sin y) is the face DOWN.
- **HIS HOOK, CLOSE IN** (`SK_HOOK`, `skrimHookNext`, `skrimHookStep`, act `hook`): the pack has no left-hand swing (every
  1H clip is thrown with the right, `by: RightHand`), so `skrimMirrorMoves` mirrors m1A1–3 into `m1A1M..m1A3M` at load:
  the file's tracks are each bone's turn since rest in ONE frame (him facing +Z), and the rests are mirror images across X
  (LeftArm (−.5,−.5,.5,−.5) ↔ RightArm (−.5,.5,−.5,−.5)), so the other side's quaternion → (x, −y, −z, w), the middle bones
  in place, travel x negated; the rests left alone (the hips' carries his facing). The blow lands where the hand is
  furthest out after its fastest frame (`skrimHookContact`: at the fastest frame the hand was 0.07–0.61 m out, crossing
  his body), reach 2.05 m in a 0.8 rad cone, 1–3 blows, the last of a string 2 dmg; blocked, the string stops; parried,
  `parryMutant` → stun. A little out of reach he walks in first (≤ 1.1 s, on his feet).
- **CLOSE RANGE** (`skrimPick`): under 3 m, the hook 58% (66 angry), else `dash` (runB 1.5 strides on its own feet, then
  `k.ranged`: a throw next) or the sweep, else `retreat` (walkB 1.1–1.6 s, then a throw); after a string, 45% back out
  (`k.backOff`). Struck: a flinch ONCE (`k.armT` 1.5 s); struck again in it with you close, he answers — the hook back at
  you (`k.counter`, 1–2 blows) or the dash; he does not stop for a blow in his own swing or his run back. Parried: hitLF
  on its own feet (1.13 m back) instead of half a metre slid. Measured, pressed at 1.5 m and cut every 0.8 s: before,
  489 of 720 frames standing flinching, 0 blows on you; now ~130–200 (flinches, mostly), 4 on you, 3–5 hooks and 2–3
  dashes in 12 s. Standing at 1.5 m without cutting: he swings or backs out, mean distance 2.0–3.9.
- **THE CHAINS** (`skcSim`, `skcLay`, `skcLinkGeo`): links were a stretched thin torus (wire 0.023 in a link 0.16 long)
  laid at 0.066 — half the inside length, each half inside the last. Now a stadium of round bar (`SKC_BAR` 0.0125, eye
  1.45 bars wide and 3 long), pitch = the inside length (0.076 × sc), vertex colour wear on the bends, instance colour
  iron/rust (24%)/near-black (10%), `vertexColors` + instance colour multiply; no metalness. Each link's frame is
  carried down the chain (made fresh per segment it twisted at every bend), a quarter-turn each with a little play. Every
  chain is Verlet points (gravity, damp 0.985, two half-steps, 10 constraint passes, floor with drag): dangle (hook
  dragged round the wrist's circle, 0.8 m), throw (pinned hand↔hook while out/bite/whip, paid out 1–10% long; let go,
  the hook flies on with its velocity on what is out and is hauled in by shortening it), sweep (the hook on its arc, let
  go at ≤ 9 m/s at the end), rise (16 points; the top on a spring 15/1.5 with a random shove, so a great chain swings
  over and back about 0.6 a second). Still one InstancedMesh, nothing built after `skcInit`. The hook geometry is now
  put on the middle of its HANDLE end (the box's middle hung it a hand off the last link, still `ch_hook_close`).
- **NOT DONE**: turnL/turnR (they keep their 90° in the hips; playing them needs the clip's yaw curve put back on his
  heading); hits of yours while you walk into him still push him (the general separation, not his feet).

## 2026-10-30 (later) — no glands, thicker murk; his body turns; bones in his fist; his song from the start
- **NO GLANDS** (`WH_GLANDS = false`: "take out those orange light up things in the whale belly just have the light from
  the cuts"): the wall glands (instanced bulbs), their halos, their shader lamps (`A.lamps`), the four warm fills
  (`A.fills`) and the far-end orange glow are not built/shown. `WH_FOG` 0x07050a, 0.058. Mist sheets 24 m (15), alpha
  (0.2 + 0.3·lit) (0.1 + 0.22), thresholds 0.08–0.40, `uI` 0.9 + 0.5·cine.
- **HIS BODY ON "BRO…"** (`skrimBroBody`, put on BEFORE his arms are aimed so his hands stay in the meat): waist and
  chest share half the bearing to you (≤ 0.9 rad between them) a beat behind the head, and he straightens 0.16; the head
  does the rest (still 1.6° off your eye).
- **BONES** 0.26–0.48 m × 1.3–2 cm (0.42–0.82 × 2–3.2). **THE GRIP** (`skrimGrip`): his rig has no fingers — the hand's
  line is forearm→wrist carried on; the bone is set across it, level, at the palm 7 cm past the wrist, a third of the way
  along, and `attach`ed with that world transform (it had sat centred on the wrist joint, at the angle it was pulled at).
- **HIS SONG** from the frame you are in the belly (not whale-busy, not frozen), at `SKRIM_SONG_LEVEL` 0.55 (1.9:
  "turn it down alot"); still faded on talking. musictest `skrim` has its own floor (0.0012): PASS 0.0014.

## 2026-10-30 — chains that sound like iron, sparks like Sekiro

The owner: "make his sound effects better with the metal chains. make sparks fly like sekiro when blocked or parried
against him." Probes `skrimSparks` (tools/probes.js; `&m=snd` the sounds only, `&m=fx` the stills only) and
`skrimFxFight` (the 40 s fight of `skrimIn`, every step guarded, then the chains' source count and spark bursts).
- **THE SOUND BANK** (`SKA`, `skaBuild`, built in `skcInit` while he digs — 38–40 ms — or by `skaReady()` on the first
  sound): AudioBuffers by modal synthesis, each partial a damped resonator run down the samples (`skaModes`: y = 2r·cos
  w·y1 − r²·y2), a crack of contact (`skaCrack`: differenced noise, or dulled through a pole), a falling-sine thump
  (`skaThump`), shaped noise (`skaWet`); every buffer peak-normalised to 0.9, the last 20 ms faded. Banks: clink ×10
  (1.5–3.2 kHz, ratios 1/1.47/2.09/2.75/3.6/4.4 under 7.5 kHz, ~0.09 s), heavy ×8 (380–800 Hz, 7 partials, a 150→65 Hz
  thump), clang ×3 (the hook as a bent bar 1/2.756/5.404/8.933 over ~880 Hz, the blade's steel ~2.9 kHz with its pair
  2 Hz apart so the 1 s tail beats), parry ×2 (higher and longer, a second smaller strike 24–36 ms on), tick ×3 (the hook's
  point), slap ×3, drag ×2 (a rub with a sticky, bumpy level), swish ×2 (resonant band swept 300→1300→300 Hz), rumble ×2
  (low noise chattering at 18–30 Hz). Measured energy by octave (first 2048 samples): clink 2k 40% / 4k 57%; heavy <177
  50% (the thump), 500 29%, 1k 14%; clang 1k 27% / 2k 57%; parry 4k 71% — the parry is the brighter.
- **PLAYING THEM** (`skaOne`: a buffer source and a gain, rate jitter, optional grain envelope): `sfxChainRattle` (clumps:
  40% of clinks get a quieter neighbour 4–16 ms after; heavy adds a rumble grain), `sfxChainWhirl` (once a TURN of the
  dangle, `C.turn` — was a rattle every 0.22 s), `sfxChainPayout` (the throw: clinks 65 ms apart closing ×0.86 to 11 ms,
  pitch rising), `sfxChainDrag` (the haul back over flesh, every 0.24 s while the hook is down; in the air a light
  rattle), `sfxChainSlap` (slack chain landing, the throw's and now the sweep's: a slap, then nine clinks settling, gaps
  ×1.32), `sfxChainBite` (the hook into you: tick, wet, the chain snapping taut), `sfxChainClang(parry)` (AT your blade
  whatever scope it is called in: the clang over the game's own block sample, and a shiver of links), `sfxChainBurst`
  (pit, ring and line chains up through the floor). `sfxChainRing` is kept as the old name for the block clang.
- **LEVELS** (each sound alone at 2 m: in the probe, anything that would `connect` to the effects bus is sent to an
  isolated gain instead — the whale's beds read 0.03 peak on the bus under everything): katBlock at 0.82 peak 1.12 rms
  0.38; fleshHit 0.88 / 0.26; clang 0.50 / 0.15, parry clang 0.57 / 0.17 (layered under the block, ~8 dB down); rattle
  0.22 / 0.07; whirl 0.23 / 0.07; payout 0.26 / 0.07; drag 0.21 / 0.06; slap 0.33 / 0.10; bite 0.34 / 0.09; pit burst 0.50
  / 0.17, ring burst 0.65 / 0.20; a rattle at 12 m 0.06 / 0.018 (positional, `sfxAt`). Sources: 4–35 an event, ~2 nodes
  each, none an oscillator.
- **A NaN CHAIN** (fixed): a throw hauled in after a BITE or a WHIP never had `C.Ls` set — NaN, the whole run NaN, never
  hauled in and never freed (its `C.Ls < 0.3` never true). The old rattle only played `if (C.p.y < floor + 0.15)`, false
  for NaN, so it was silent; the new drag's else-branch panned to NaN and threw (`sfxPosOut`: "The provided float value
  is non-finite"). It went NaN on the very frame of the change (whip/bite → back, then the shape's `skcSim` with
  `C.Ls / (n − 1)` before `back` ever ran): `C.Ls` is now set from the hook's distance there if it is not > 0, and
  `skaFar` treats NaN as far. `skrimFxFight` watches every step for a chain going NaN (before: six left in a 40 s fight,
  all throws parried into a whip; after: none).
- **SPARKS** (`SKSP`, `skSparks`, `updateSkSparks`, `skSparkAt`, `skspView`; fired from `skrimGuardFx` in
  `skrimHitsYouC` on every block and parry of his — hook, sweep, throw, rise — with the clang, `deflectLamp` at the
  contact 28/48 for 0.12/0.18 s, a small trauma and view kick on top of `blockMutant`/`parryMutant`'s). 300 thin quads in
  one InstancedMesh (x 0..1 tail→head), per-instance colour, additive, a streak texture, one more mesh for the flash; all
  built at load. Each spark is drawn from where it was 0.024 s ago (by its velocity, 1.2–30 cm) to where it is, its
  width 0.75% of its distance (min 3.5 mm), the quad's normal toward you (FrontSide: a transparent DoubleSide material
  draws twice and sets `needsUpdate` both times, every frame). Gravity 9.8, air drag 1.5/s, one bounce off the gut floor
  (×0.3 up, ×0.45 along) then out. Heat: white → yellow → orange → dull red, the parry's whiter and longer. Block: 80 at
  ≤7.5 m/s, 0.2–0.52 s; parry: 140 at ≤9 m/s, 0.28–0.78 s, plus 30 slow gold embers 0.5–1 s. They fan along the blow
  across your view (`dir`: the throw's velocity, the sweep's arc, up for a rise; else hand→blade), up 0.5, toward you
  0.2, 20% thrown back the other way. In a hitstop they run at 0.3 of real time (`hitstopFrame`), so the spray blooms
  slowly in the freeze instead of hanging as a dot.
- **DRAWN IN THE VIEW MODEL'S PASS**: the world pass is overdrawn by the blade (`clearDepth`, then `vmScene`), so the
  sparks live in `vmScene` but fly in world space: `onBeforeRender` sets the mesh's `matrixWorld` to diag(sx, sy, 1) ×
  `camera.matrixWorldInverse` × T(origin), sx = tan(vmFov/2)·vmAspect / (tan(fov/2)·aspect), sy = tan(vmFov/2)/tan(fov/2)
  — the same pixel at the same depth under the 70° view-model camera as under the world's 105° (z kept, so they depth-
  test against the blade truly). Instance positions are relative to the camera at update (no float32 trouble thousands
  of metres out). `onBeforeRender` runs before three computes `modelViewMatrix`, after `objects.update` — so the matrix
  is set there, the instance buffers in update.
- **THE CONTACT** (`skSparkAt`): in the guard the katana lies across the whole view, grip left, point off the right edge;
  "two thirds up the blade" was x 0.79 m at z −0.36 (the screen's right edge). Now the point of grip→point (0.3–0.92 of
  it) whose projection is nearest NDC (0.1, −0.02): x 0.07, z −0.36 in the held block. A parry lands while the guard is
  still coming up, so its sparks come off wherever the blade is then (still `rise_par`: to the right).
- **CHECKED**: stills `guard_up`, `blk_0..2`, `par_0..3`, `swp_blk`, `rise_par`; `skrimFxFight` 40 s (blocks and
  parries of bolt and volley, ~30 chain sources a second of fight) and `skrimF2 &m=fight` (hook, geyser, bolt parried;
  hook, palm, wave, bolt landing): no errors; `sh tools/musictest.sh` all PASS. NOT DONE: the view
  model's own square point sparks (`spawnSparks`, called by `blockMutant`/`parryMutant` for every foe) still show at the
  blade tip, off to the right in the guard; nothing was heard (levels and spectra measured, not listened to).

## 2026-10-30 — the piles, the artifact, his deal

The owner: "make like 6 other flesh piles scattered past skrim after you agree to help him you can search the piles and in
one random one the artifact of the whale will fall out with the octopus drop noise … two heavies or 4 light hits to fully
break and dissapear. if you pick up the artifact before you walk past him hell come up to you and say this dialog", his
tree word for word, and "if you let him leave the whale stays on the beach for the rest of the game.. if you leave the
whale with the artifact you should still get the healing cutscene just take out the artifact spawning on the beach. if you
just walk out nothing happens". All of it is the `SKQ` section after `skrimUnitPre`; probe `skrimQ` (`&m=` give | givekill
| keep | hitleave | none | restore | giverestore), run with `PB_PORT=4223`.
- **THE HEAPS** (`skqBuild`, lazily off `skqTick` once `whale.arena.skrimSpot` exists): six `whFleshPile`s, seed
  `mulberry32(30102026)` so the same every load, 6.4–22.9 m further down the gut than his spot (alternate sides, off the
  walls by `whWallAt` + 2.2, out of the fluid, 2.9 m clear of every other 'skrimPile' — his own and the six about him), K
  0.62–0.84. The group is `bones[0].m.parent` (the function returns its bones). Which one holds it: `skqChoose`, random,
  on the first tick in `'deal'` (so an old 'deal' save gets one too), or on the first blow once he is dead unasked.
- **THE BLOW** (`skqPileStrike`, in `digImpactCore` after `catBoneStrike`): the aim line within 0.5 + 0.6·K of the heap's
  middle inside `digRay.far`. `P >= MUT_HEAVY` counts 2, else 1 (`skqPileHit`). Not open yet (`skqOpen`: picked, or
  `'deal'`, or him dead) it only squelches and wobbles. Open: pieces thrown off the blow (`skqThrow`: one pool of 60
  meshes over six `whLump` shapes made at build, landing flat with a wet hit; the oldest lying one is taken up again),
  red puffs, the heap sinks and spreads (`skqShape`); at 4 `skqBreak`: 14 pieces, gone, `SKQ.broke |= 1 << i`.
  Measured with real `startDig` swings: LLLL → 1, 2, 3, 4 gone; HH → 2, 4 gone; before the deal a light swing hit (wobble)
  and left hits 0.
- **THE ARTIFACT OUT** (`skqArtOut` → `skqArtSpawn`, `skqArtLie`): `ringDrop`, `artState` 1, laid 0.9 m toward you face
  up like the beach's, the MODEL falling the 0.6 s from the heap's top (the root waits where it lands, because the drop
  shine's column stands in the scene where the root was when it was hung), a soft wet hit, its warm glow guttering down.
  It IS `art.world` (`w.userData.belly`; `updateArtWorld` hands it to `skqArtLie`); `artTick` puts it back on a restore
  from `SKQ.artAt` before `art.spot`. Taken (`skqArtTake`): `dropShine` (the beach's take never did), `stickArtifacts`,
  `skqStick`. Measured: lying at floor + 0.000.
- **HIM** (`skqMeet`, `skqUnitStep`, stages `'meet' | 'talk' | 'leave' | 'gone'` next to 'dig' | 'deal' | 'rise' |
  'fight'): with it on you (`skqHolding`: pack, or set in a weapon in the pack) and him in 'deal', inside 6.5 m or past him
  toward the throat inside 14 m: `fromCrouch` ×1.35 (his throws measured one a frame through it, as the rise does), then
  `skrimGait`/`skrimTurn`/`skrimMix` at you; the talk opens after 0.45 s stood inside 2 m, or at once inside 1.6 (you
  walking on into him: the first try opened at 0.8 m, his body filling the frame). Measured from 6.5 m: up 1.2 s, 4.6 m
  walked, talk at 1.55 m. In the talk the dialogue holds `update`, so `updateSkrimLife` runs `skqTalkPose` (idle, neck
  fix, his look on you). Escaped before a choice: he puts it again in 1.4 s, or walks after you past 3.6 m. The climb out
  while he is coming opens it there (`whaleClimbOut`).
- **THE TALK** (nodes added to `SKRIM_NPC.script` with `Object.assign`: `skqFound` → `skqHand` → give `skqThanks` →
  `skqWaste` → "*Kill him*" `killNow` / "*let him leave*" `skqBye`; keep `skqKeep`). Give (`skqGive`): out of the pack or
  off the weapon, `artState` 3 (his — `artRestore` keeps any number), a copy `attach`ed in his right hand (`skqHand`).
  The talk closed on him (`skqDialogLeave`, in `skrimLeave` after its fight check): given → `skqLetGo` ('leave'), else ask
  again. 'leave' walks a point 3 m ahead of him down the gut's middle (`skqInGut`, `whWallAt` — `skrimInGut` holds only
  the fight's stretch), ~1.2 m/s measured (s 57.6 → 18.9 in 32 s), and is 'gone' at s < 14.6 with you over 5 m off (or
  s < 11.6), or the moment you are out of the whale (`skqGoneNow`: hidden, `doomed` if he had it, `skqStick`). Struck on
  the way (the `hurtMutantAt` hook takes 'meet'/'talk'/'leave' too) → the fight. Kept, "*Kill him*", or struck: `skrimFight`
  → `skqFightStanding` (no `fromCrouch`: 'fight' at once, the roar, any throws not yet measured measured). Dead with it
  on him: 0.6 s after, out of his hand toward you (`skqDropFromHim`, `ringDrop`).
- **THE WAY OUT IS THE HEAL** (`whaleClimbOut` on "Climb back up the throat"): `wbBellyClear()` is now "not doomed, he is
  not on his feet alive, and it is yours" — the farewell no longer starts by itself 2.4 s after the belly clears (that
  block is gone from `updateWhaleFarewell`; `wbFareClearT` is left unused). With it: `startWhaleFarewell`; `wfPlaceOut`
  sets no `C.artP` while you carry it, so nothing lands on the beach and the motes gather on the whale (`C.artP || Cw`).
  Without it, or him doomed: the plain `startWhale(-1)`. Measured: none → no farewell, the climb cut; kept/killed/hit →
  farewell, `artP` undefined after the cut onto the sand, still yours; let go → doomed, bellyClear false, the climb cut.
- **SAVES**: `flags.skrimQ` = `skqSave()` {pick, broke, artAt, gave, gone, doomed} (`gone`/`doomed` also true while he is
  still walking out: the climb's autosave runs before `skqTick` sees you are out); `flags.skrim` is 'deal' in 'meet'/'talk'
  too; `flags.whaleArt` 3 when given. `skqRestore` (after the `f.skrim` line in the restore; dead units are retired before
  it): given and him alive on a save → gone and doomed; gone → stage 'gone', hidden; broken heaps hidden (also in
  `skqBuild` when it runs after). `skqStick` writes `skrimQ`, `whaleArt`, `artOn`, `skrim` 'deal' into the STORED
  checkpoint on taking it and on his going (and takes it out of that save's pack when he has it). Measured: restore with
  two heaps broken and it lying → heaps 0,1 hidden, pick kept, lying again (`belly`); restore after he left → 'gone',
  hidden, doomed, art 3, not in the pack, bellyClear false.
- **A BUG THAT IS NOT THIS SECTION'S**: killing him while a hook chain is out (`throw` → `back`) leaves the chain's `p` NaN;
  `skcTick` passes it to `sfxChainRattle` → `sfxPosOut` throws ("non-finite") and `update` throws there every frame after
  (so `skqTick` never drops the artifact). Probe `skrimQ&m=hitleave&chainbug` shows it; without `chainbug` the probe clears
  `SKC.list` before the kill.
- **HIS WALK TO YOU** (2026-10-30: "make him walk over to you faster. his walk when not in combat should be more relaxed
  he has his hand up swinging it. make the artifact dissapear when hes hit"): `skrimGait` plays the walk at 1.45 in
  'meet' (his feet move him, so it is a quicker walk, not a slide): ~2.1 m/s over the ground (1.2). `skrimArmsDown`
  ('meet'/'leave', eased): each upper arm aimed under its shoulder, 10 cm out, swung ±16 cm against the stride — the
  pack's walks carry a caster's hand up. `skqFightStanding` hides the artifact in his hand (`SKQ.held.visible = false`);
  it still falls out of him when he dies. Probe `skrimQ&m=give` stills `q_walkside130/146`.
- **THE GROUND FOG, THE GUT'S LENGTH** (2026-10-30, "needs more fog in the whale it must actually be noticeable drifting
  across the ground beautifully"): `whGroundMist(G, spot, cuts)` — four sheets from the throat (`WH_S0`) to `WH_L` − 8,
  each vertex on the floor (+0.05 / 0.22 / 0.48 / 0.9 m), faded to the walls (`aW`) and the two ends. Grey-blue
  (0.22, 0.25, 0.32), brighter (0.6, 0.7, 0.92) in a pool under EVERY cut (`uCuts`, his ×1.6). Wisps: domain-warped
  5-octave fbm, each sheet drifting its own way (low banks ~0.4 m/s), times a large slow noise so it lies in BANKS with
  clear ground between; thinned edge-on (`vG`, the view's steepness: four sheets at a grazing look added up to a solid
  grey floor — the `entry_view` still), near the lens and far off. Measured first that the drawn floor is the walked
  floor (`skrimDig` raycast: within 0.01 m wherever you walk; the "clear strip" in the stills is the gut wall's foot).

## 2026-10-30 (late) — fog that reads, fog in the air, every cut lit; the lag; the piles; his chains recorded
- **THE LAG** ("fix the lag here too its horrible"): probe `skrimPerf` — the world drawn and GPU-synced (a 1-px read)
  at 1280×720, by part, then 15 s of the REAL loop near him (save `w.__rafOrig` before the probe freezes rAF; `delete
  w.requestAnimationFrame` removes it outright). Headless M4: 3.5 ms near him, 4.8–7 across the gut; the loop 60 fps,
  p99 19 ms, max 21–23, no span over 16 ms — not reproduced here. Made cheap anyway: the fog READS a 256² tileable
  noise texture (`whNoiseTex`: R, G fbm, B a broad one for banks, A a warp) — four fetches, not ~15 fbm octaves a pixel
  a sheet (switching all fog off now saves ≤ 0.3 ms); his beam's 70 dust sprites (a draw each) are gone into one
  `Points`; the letterbox bars' style is written only when it changes, the drone's gain only when it moves (an
  automation event a frame before).
- **GLSL TRAP**: `.aw` mixes the rgba and xyzw sets — a compile error, and the material simply does not draw (no error
  in the probe's console grep). Use `.ba`.
- **FOG** "more like this" (his still: thick and white round him): `whGroundMist` thick again (smoothstep 0.30–0.66 on
  the texture, banks only thin it to 0.45), white (0.72, 0.8, 0.96) under the cuts. **IN THE AIR** (`whAirFog`): 70
  fog banks 2–9 m up the gut, one instanced draw, each a lens-facing quad (built in the vertex stage), drifting, a warped
  read of the noise, lit only near a cut; and 2200 dust motes the length of the gut (one `Points` draw, size by
  `PIXEL_RATIO_U`, bright only near a cut). Two rays down every other cut (`whGodRays(..., n, U)`, shared `A.rays2`).
  `WH_FOG` 0.04 (0.058): the far gut seen through the hanging banks is what makes it big.
- **PILES**: every visible heap but his is searchable — the six about him are added to `SKQ.piles` after the six past
  him (`grp.userData.K`), so a save's broken bits keep their meaning. `skqOpen()` is always true (breakable before the
  talk); the artifact is put only on the deal, in the FARTHEST pile still standing (`skqChoose`; all broken → it lies
  where the farthest stood). Probe `skrimQ&m=give`: before the deal a light swing counts; pick 5 (the farthest).
- **TALKING**: no bone to his face while a dialogue is open; one in his hand is dropped (his rig has no fingers to close
  on it). The grip 11 cm past the wrist (7).
- **HIS CHAINS RECORDED** (the owner's "Chain Whip Rifle (Fantasy Weapon SFX Preview)": "trim them in the best possible
  way for skrims weapon and attack with the chains"): four takes at 3.6 / 5.9 / 7.6–9.3 / 11.1–13.0 s (silencedetect
  −42 dB, onsets off a 20 ms envelope); cut on their attacks — `skrim-chain-crack` (the snap), `-lash1` (a whoosh into a
  lash, its blow 0.26 s in), `-lash2` (a quick lash), `-slam1/2` (heavy crashes) — 6 ms in, tails faded, mono,
  loudnorm −14 LUFS, AAC 128 (80 kB). `skChainCrack` on a throw, `skChainLash` on the sweep, `skChainSlam` on the
  chains bursting up and (higher, quieter) the bite; the made metal under them at half.
- **HIS CROUCH** (2026-10-30, the owner: "fix his crouch his back looks too bent … dont change his heads height or where
  hes at"): `skrimPosture`, first thing in `skrimSearch` (before the dig lean and the arm aims): 0.42 rad of the crouch
  clip's curl taken back out through Spine1/Spine2, and the lean put at the base of the back (Spine) by two secant steps
  on the head's height. Probe `skrimDig` POSTURE: head 1.248 → 1.237 m over his feet, 0.33 → 0.27 m forward of them;
  stills `posture_0` / `posture_0.42`. His opening line is "*Digging*" (was "...").
- **SMALL HEAPS AT ONE BLOW** ("make the small flesh piles one hit"): `skqPileHit` — a heap of K < 0.65 takes all four
  at the first blow. **HIS FOUR JARS** ("make skrim drop 4 jars as well with octopus drop sound"): `skrimJarsOut`, 0.75 s
  after he dies (from `skqTick`): `ringDrop`, four `makeBloodJar` thrown up out of him through `dropJar(..., fly)` with
  the whale's floor (`fly.floorAt`, new — it was always `corpseTopAt`); saved where they still lie (`skrimJars`), laid
  again on a restore (`SKRIM.jarsAt`). Probe `skrimJars`: small heap (K 0.50) broke at one light blow, a big one dented;
  4 jars, lowest point 2 mm over the floor (their origin 0.14 m up: they lie on their sides); one taken → 3 on the list.
- **HIS HOOK IN THE WHALE'S SIDE** ("instead of a sword in the whale make it look like one of skrims hooks and chain
  hanging rocking in the wind dont make this corny"): the harpoon (iron shaft, snapped pole, rope across the sand) is
  gone. The group is still named 'harpoon' (the heal throws it out of the wound) and holds his own `skrim_hook` (×1.7,
  filled in when his model is in: `wbHookGeo`), sunk point-first 0.28 m out from the wound, turned π so the curve of the
  blade goes down into it (four turns rendered, `wbHook` probe). `wbHookTick` (off `animate`): a 30-point verlet chain
  pinned at the handle, gravity, damping 0.985, 14 constraint passes, the sand (dragging), wind gusts along the flank
  and a lift off the sea; the flank read by RAYS at the drawn body every 10 cm (its sample points `B.P` held nothing
  near the hook, and a fin 9 m off read as the flank and flung the chain 17 m); pushes move the frame-before too (a
  push, not a throw). Drawn as the fight's links ×1.6, one draw ('harpoonChain', dropped with the whale). Measured:
  hangs to the sand, 7 of 30 points lying on it, a point 60% down swings ~0.28 m over 6 s; a quiet clink as it swings
  within 14 m. `wbHook` is declared at the top of the module: the whale is built early.
- **HIS BACK, AGAIN** ("his back looks worse he shouldn't be arching like that his back needs to be straighter"): the
  fixed 0.42 rad "unbend" of Spine1/2 hollowed it. Measured (`skrimDig` POSTURE, joint to joint): the clip's spine
  chain was nearly straight already (hips→waist→sp1→sp2→neck bends 3/5/6°), 23° off upright; what read as bent was the
  PELVIS — tipped forward, his seat out behind and the small of his back hollow. `skrimPosture` now: the pelvis tucked
  under (`SK_POSTURE.tuck` 0.32 rad about his side) with both thighs turned back the same (feet within 2 cm), each of
  Spine1/Spine2 turned so the stretch above carries straight on from the one below (`straight` 0.9: bends 0/1°), and the
  lean at the base of the back solved for the head's height (1.247 → 1.244). Stills `posture_0_0` / `posture_0.9_0.32`.

## 2026-10-30 — the crying heads
The owner: "if you walk a little further past the pile with the artifact in it make this creature jump like a head crab
through the air with good source engine like physics and can be smacked out of the air for one hit. make the first one
like a jump scare sorta. this is near the back of the whale belly", then "make a visible jar lit like an item in the very
back of the whale belly lit up make 3 headcrabs attack you but the first supposed to scare you like i said and jump out".
All of it is the `CRY` section after the `SKQ` one; probes `cryHeads` (`&m=restore`), `cryMeasure`, `cryGait`, `cryLook`,
`cryFace` (run with `PB_PORT=4223`).
- **THE FILE** (`tools/crying_head_pack.py`, `python3 -I`, json + struct + `sips`, no Blender): 1.39 MB. Floor disc gone,
  clearcoat/specular/texture-transform stripped, metalness 0 and the metal/rough map dropped (roughness 0.55 factor),
  base colour and normal 1024 JPEG, no tangents, Sketchfab `_0NN` suffixes off and '.' → '_'. Node chain kept.
- **MEASURED IN ITS FILE**: faces +Z; centimetres; legs 4.6 × 3.1 × 6.2 m; tips at y −184 (IDLE) / ~−190 (MOVE);
  HeadBase y −3.5 z ~120 in MOVE, y ~28 z ~270 in IDLE (IDLE leans it 0.3 m forward). Both clips in place. The first leg
  pair (`H_*_000..004`) stays up at its eyes — its hands over its face, crying — and its open bloody mouth is under it:
  rendered from in front, pitched, the mouth turns to you at +0.45 (`CRY_MOUTH`), not at the "underside forward" sign the
  maths gave. MOVE's planted tips go back at ~410–800 units/s (noisy: the tips never sit on one floor); `CRY_GAIT` 520,
  so the clip's rate is set from the speed (`spd / (CRY_GAIT·K)`). `CRY_K` 0.0021: a leg span ~1 m, the head ~0.3 m.
- **THE NEST** (`cryBuild`, from `cryWarmIn` in `placeInWhale` under the black, before its `renderer.compile`; else lazily
  from `cryTick`): three skinned copies (`cryClone`: the scene cloned and each skin rebound to the copy's bones — no
  SkeletonUtils), each with a clone of one material made at build (its glow its own), in `whale.G`. The jar at local
  x = `whCx(s)` (−0.95), s = `WH_S1` − 1.6 = 152.4 (world 14999.05, 500.54, 14847.60), stood on the floor, the full
  `DROP_SHINE` (beacon and all): seen as a glow from 25 m up the gut. The heads at the walls' feet s 148.1 / 149.2 / 151.6
  (x −10.1 / 10.6 / −11.3: up the floor's curve there, 2.1–2.7 m above the middle). The wake line `CRY.wakeS` = s 145.9.
- **THE SCARE** (`cryWake`): head 0 is put 4 m along your look (whichever way), 0.8 m toward the nearer wall, 1.35 m up;
  0.14 s later it launches at your eye (T 0.40 s: 10.9 m/s), `babyScream` at 1.32 + a synthesised wet shriek
  (`sfxCryShriek`: three detuned saws through two formants with a 26–34 Hz vibrato, noise chopped at 17 Hz under it),
  fov kick 9, trauma. It bites (`damagePlayer(1)`) and hangs on your face 1.0 s (`'latch'`, 0.36 m out, legs going).
  The other two `'stir'` and come 1.5 / 2.2 s after (`catTell` at 1.55 and ticks as their tell).
- **THE HEADCRAB** (`cryStep`): `'crawl'` (MOVE at its speed, weaving; a fed one keeps off 2–3 s, `h.fed`) → `'rear'`
  0.5 s (stops, mouth up, trembling, the tell) → `'leap'`: T = clamp(0.26 + 0.075·d, 0.32, 0.72), v solved for the arc
  under `CRY_G` 15 to meet your head (−0.12 m) led by 0.6 of your velocity, capped 14 m/s; two half-steps a frame;
  contact within 0.42 m across and −1.35..+0.25 of your eye. Guard (`blocking && guardSees`) → batted off alive
  (`'tumble'`, half a block's stamina). Floor/walls (`cryCollide`): restitution 0.3–0.38, Coulomb friction off the
  blow, spin handed over to a roll; walls by `whWallAt`'s own normals; s held in [`WH_S0`+1, `WH_S1`+1.5]. Righted in
  0.3 s and back to crawling. One leap in the air at a time (`CRY.next` 0.8 s).
- **ONE BLOW** (`cryStrike` in `digImpactCore` before `skqPileStrike`; `cryBladeRay` in `bladeSweep`'s ray loop sets
  `CRY.first`, which also fires the impact like `blade.first`): radius 0.78 + 0.25P in the air or on your face, 0.5 +
  0.25P on the floor. Thrown 7 + 5P m/s along the aim, a cut's side by `slashDir`, up 2.4 + 1.6P (an overhead drives it
  down), spun 12 + 10P rad/s → `'dead'` → `'still'` legs up.
- **MEASURED** (`cryHeads`, standing, facing the nearest): woke 1.78 s after the walk started 2.5 m short; the scare at
  0.68 m from your eye at 0.8 of its flight; leaps apex 1.5–2.5 (your eye 2.0 local there) — every unguarded leap at a
  player standing still bites; guard → 'blocked'; a light swing at a head 3.56 m out, 0.18 s into its flight → killed
  'leap', first floor hit at 0.59 s, settled at 1.39 s, 7.0 m from where it was struck.
- **SAVES**: `flags.cry` = `crySave()` {w, d (bit per head), j (the jar)}; `cryRestore` after `skqRestore`; `cryStick`
  writes it into the stored checkpoint on the wake, each death and the jar. The wake is refused while `restore`,
  `applyingSave` or `replaying`. Measured (`&m=restore`): restored → built, woke, dead 1 (#0 lying, 'still'), no scare,
  jar not rebuilt.
- Dev mode does NOT keep them asleep (the crabs' rule): damage still clamps to 1 hp.
- **AND AGAIN, WITH REFERENCES** (the owner's sheet of crouching men: "his lower back should not bend inward like that
  its like hes sticking his butt out"): the probe's bends are SIGNED now (+ forward/rounded, − back/hollow, about his
  side). Tuck 0.62 with the lower back (Spine) turned forward by the same — the pelvis rolls under while the trunk keeps
  its line — then Spine1/2 straightened and rounded +0.09 each, and the head's height trimmed within ±0.3 rad (unbounded,
  the solve found the height leaning BACK: head 0.26 m behind his feet). Clip: hip>waist −3°, 24° off upright; now
  +26° (rounded), 5/5 through the back, 17° off upright, feet unmoved, head 1.21 → 1.25 m. Still `posture_0.9_0.62`.
