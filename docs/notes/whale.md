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
