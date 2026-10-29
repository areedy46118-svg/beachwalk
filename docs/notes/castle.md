# The castles (XVII and XIII), the farmers, the throne room

Lessons moved out of CLAUDE.md (in the order they were written). Grep before reading the whole file.

**Sand does not crack.** `sfxCastleBreak()` is a soft low give, one of the
recorded sand impacts pitched down under it, a second of granular crumble
closing down as the pile settles (timed to the slump's 70 ms layers), a
few dull lumps landing, and a fine hiss of dry grains sifting off the heap
at the end. The crate's knock was there first and it was wrong: a castle
is damp sand, not boards.

**A GRIP CHANGE BELONGS BEFORE THE STROKE, NOT INSIDE IT.** A light click has
no wind-up, so at the old blend rate the sword was still rotating out of its
low carry and into the line of the cut while the arm was already throwing the
stroke — two rotations at once, which is the definition of a flail and is the
whole of "the move set must be fluid". Going in it snaps in about three
frames; coming out it stays soft, because settling back to the carry is a
recovery and should be seen.

**The sandcastle is a scan, and the break is a triangle-grid fracture.**
`assets/sandcastle.glb` (assetfactory) is welded into ONE geometry in metres
with its base on y = 0 at load, because `breakCastle()` cuts it up by
walking its triangles into 0.28 m cells — each occupied cell becomes a chunk
with its own body. Nothing is sliced; a chunk's ragged edge reads as a
break at this triangle count. Cells are stacked, so the keep comes down as
lumps and the base stays a low ring, and higher chunks are thrown further.
The collider is pushed by the loader, not at module time: a `Box3` of an
empty group is size zero. The break is a SLUMP, not a burst: chunks are
sorted into layers by height and let go top-down, 70 ms apart, each barely
lifting and coming to rest part-buried (rest height under its own
half-height) — the first version threw everything up at once, which is an
explosion, and sand does not explode. It stands at x = 10.4 on the dry
beach with a `makeApron()` bank round its foot, tinted to `sandMat`'s own
family; at x = 4.6 it was inside the swash and sat in the sea half the tide.
The crab running into it and the shovel hitting it both break it.

**A chunk of castle is a LUMP, not its triangles.** Cutting the mesh by cell
and keeping the raw triangles gave each piece a scatter of long thin slivers
— at this triangle count a cell is a handful of big faces and the leftovers
stuck out like spines. Sand does not break into spikes. The cell still says
where a piece is and how big it is; the piece itself is a rounded icosahedron
knocked out of round. It also needs its OWN material: on `castleMat` a
rounded lump's uv samples wherever it happens to land on the scan's baked
atlas — mostly the dark parts — so the heap came out far darker than the
castle it fell off. `castleChunkMat` is the beach's own grain lifted (the map
multiplies) to the tone the castle actually renders at, so the pile matches
the thing that made it and settles into the sand around it.

**THE MARAUDER GETS UP FAST.** His knockdown lies 0.35 s and rises in 0.85
(`knock.lie`, `knock.rise`), `stunK` 0.38 and `recoilK` 0.38.

Measured at the end: a live walk 896 frames at a median 13.3 ms and none
over 25; a live sweep of 700 m in 25 m hops 1798 frames, median 13.3, 99th
15.5, three over 22 (background parses, which BEGIN now waits for); rooms
steady at 1.5-2.5 ms with the first frame behind their black cut; tavern
kills under 12 ms; no GL errors.

**CASTLE XVII STANDS ACROSS THE BEACH BEFORE THE LIGHTHOUSE, AND THE MARAUDER
FIGHTS IN ITS COURTYARD.** (SUPERSEDES the marauder's `UMBRA_Z = LH_Z + 92`:
he waits in the courtyard now, `UMBRA_X/Z` off `FORT_X/Z`.) The owner's
"Castle XVII" (CC-BY-4.0) through `tools/undercroft_pack.py castle
~/Downloads/castle_xvii/scene.gltf assets/castle.glb --tex 1024 --scale 1.5
--yaw -7.37`, which is a new EXACT kind that keeps normals and drops the
land (`acmat_52/53`). It also merges images that are identical by md5 and
materials that are identical in canonical form, then merges the meshes per
material: 27 meshes, 302k triangles, 21.8 MB, and a 46,966-cell walk. The
yaw squares the gate to the walk, and the gate lands at world (10, -1065.85).
- **IT IS ON THE BEACH, NOT IN A ROOM.** `FORT_X/Y/Z` put it there, and
  `inFort` is not a room: `inRoom()` stays false, so the sky, the moon, the
  mood, the gulls and the far-cull all run over it, and the lighthouse stands
  over the roofs. The beach is cut out of its footprint by a MASK built from
  its own walk cells (dilated 3 and eroded 5, stored as an R8 texture,
  `FORT_M`, `fortMaskAt`, `FORT_CUT_GLSL`). The sand, the sea and the dune
  discard inside it. So do `inWater`, `roomSubmersion`, the dig target, cache
  placement (2.6 m clear), and the mist and blown grains. Inside, the fog is
  ×0.55 and the sky clears (`updateMood`).
- **EVERY WALL IS THE SITE MACHINERY** (`FORT_SITE`, the tavern's walk:
  `keepHitsWall` at three heights, `keepWallPush`, `pushOutOfKeep`,
  `tavEscape`, the `TAV_FIX` cap). The wall index covers 300k triangles, so it
  is built in SLICES, 4 ms a frame once you are within 260 m
  (`fortWallsStep`). It is finished at the cut if it has not already been.
  Outside, the castle is a solid thing: a move into the mask, or through its
  stone, is slid along.
- **THE GATE IS WALKED INTO.** It has no prompt from the beach, although E
  works too. It cuts to `FORT_MID`, which was chosen by a SILHOUETTE RENDER
  of the lighthouse from every candidate spot, because a raycast was the wrong
  instrument: FrontSide misses back faces, and the walk grid ignores steep
  roofs. 93 % of the tower's column shows from there.
- **THE BACK DOOR IS BARRED WHILE HE LIVES** ("The door is barred.", bare).
  Once he is dead it puts you on the sand behind the castle (`fortPosternSpot`)
  facing the lighthouse. A POSTERN on the outer back wall (a clone of the back
  door's own mesh) lets you back in, because a castle you can leave only one
  way takes everything before it away. Leaving by the gate mid-fight calms him
  (`fortCalmBoss`).
- **HE IGNORES THE CHASE GRACE.** The gate's checkpoint (`updateFortSave`,
  14 m out) starts the 25 s grace, and it kept him asleep through the whole
  arrival. `fortBody` wakes on `inFort && fortInT > 0.9`, holds him inside the
  walls (`fortClampUnit`), sets his height from the paving, and pushes his
  ragdoll out of the walls.
- **A BRAZIER IS A DISC, NOT A WALL.** Put in the wall index, its bowl ring
  was a pen that a jump could land you inside (0.26 m deep). They are
  `bwGhost` with round colliders (`fortPropPush`), and so are the torches.
- Life: five braziers down the street, wall torches either side of every
  door, pooled lamps with `lpAlways`, and warm windows (`acmat_22`, flickered
  in their own shader). The blade on the walls marches the wall index
  (`fortBladeHit`, 'concrete').
Measured: 28,800 frames walking hands-off in the courtyard, jumping, with 0
off the paving and the worst overlap 0.163 m against a 0.26 m body; 34,000
frames from the beach with 0 inside the footprint; the fight at 65 swings and
63 damage a minute, never in stone; a median frame of 2.6 ms and a worst of
9.1 in the courtyard; 239 draws. `tools/fortwalk.js` holds the harness.
**Teleporting to the castle fires the horde's take** (`mutCut`): step until it
is false first, or every look you set is turned onto them.

**THE CASTLE IS 15 % BIGGER THAN ITS PACK (`FORT_K`), AND IT GREW TOWARD YOU.**
The pack's source is gone, so the scale is put on at LOAD: the root takes
`makeScale(FORT_K)`, the walk grid's `x0`, `z0`, `cell` and every floor and
roof in it are multiplied by it, and every number typed in the castle's own
frame goes through `fk()` — `FORT_GATE`, `FORT_DOOR`, `FORT_MID`,
`FORT_FLOOR`, `FARM_DOOR_SPOTS`, `FARM_SPINE`, `farmCobble`'s band, the
marauder's spot, the torches and the door boxes. What is MEASURED off the
geometry (the farmer doors' islands, the braziers, the postern) scales by
itself. The back wall stays at the headland's foot (z -1126.5), the gate stays
square on the walk at x = 10 and moved nine metres up the beach (z -1056.75),
the cobbles stay at the sand's level (`FORT_Y` follows), and the castle's
trader moved with the gate (`TRADER2_Z` -1040.4; a literal, because it is
declared twenty thousand lines above the castle). Measured: 13 of 13 farmer
doors found, 9,600 courtyard frames with nothing in stone or off the paving,
22,614 frames walking at it from the beach with nothing inside the footprint,
and the farmer fight unchanged at 34.7 damage a minute with three out.
`tools/fortwalk.js` scales its own spots by `__bw.FORT_K`.

**THE MARAUDER WAITS OUTSIDE THE CASTLE NOW (`UMBRA_X/Z` 11.2, -1150, `fortOut`).** On the
sand past the back wall, facing the back door, so leaving the castle is walking into him. The
back door is barred until the FARMERS are done (`fortBackBarred`), he does not wake while you are
inside or before you are past the back wall (`umbraLimZ`), the back wall is a wall to him, going
into the castle calms him (`umbraCalm`), he ignores the chase grace, and a save that killed him
in the courtyard still counts (his old save key is checked).

**FARMERS COME APART (`kind.cutApart`).** Every kill takes one to three more pieces (sometimes
through the middle, never a second piece off an arm already gone or the top half already cut
away), and they fly less far (`ragK` 3.3, `ragVmax` 18.5). `kind.slice` was already taken — it is
the clip windows — and reusing it threw inside `dressMutant` for every farmer.

**THE FARMERS ARE DIRTY NOW (`farmGrit`, their `matMore`).** In the bind
pose's own centimetres: two scales of mottle and a fibre on cloth and skin,
mud from the boots to the knees, soot, and DRIED blood (nearly black — at a
wet red it read as orange paint dots under the fires), seeded per man. All of
it is ONE multiplier applied to the colour AND the emissive lift, because the
lift reads the raw map and would put every stain back on the dark side. The
AO the file ships is pushed to 1.55, the grade is pulled off the cold blue,
and the rim is the fires' warm. The tavern's drinkers are farmer kinds and
get it too. A test render of a farmer belongs in its own scene with
directional lights only (`__farmStudio` in this session's harness): a point
light added from the harness is taken by the lamp pool and lights nothing.

**THE FARMERS ARE A MOB NOW, AND THE CASTLE IS ALIVE.** Three things read as
"AI" and none of them was a single clip:
- **THEY WALKED LIKE MUTANTS.** The knight's `walk` and `run` are the owner's
  "Mutant Walking" / "Mutant Run" — hunched, arms hanging wide — and those were
  the farmers' default gaits. Wong's Male Locomotion Pack is now on them too
  (`mH*` in `FARM_MOCAP`: walk, jog, idle, strafes, side steps; `mDIdle` off the
  drunk pack for the coward), and is the default; only the maniac keeps the
  hunched run. Rendered in a lit studio (`tools/farmlive.js`, `__studio`), which
  is how to judge a clip — the courtyard is too dark to read one in.
- **THEY TURNED AT SEVEN RADIANS A SECOND, TOGETHER.** `turnMax` is 2.6–4.6 by
  temperament, varied per man.
- **THE ONES NOT PRESSING ORBITED YOU ON A RING.** `farmMobHold` (from
  `demonHold`, for `u.farm`) gives each a mind of small beats on his own clock —
  watch, pace, move elsewhere in the crowd, edge in and think better of it, a
  war cry (`farmTaunt`, through `st.flourish`, which now takes
  `flourishRate`), call to the man beside him — and a distance of his own.
  `farmMobReact`: a man cut down flinches the near ones back and sets others
  shouting; a blow on you is cheered. A presser sometimes shouts his turn
  before he comes. Farmers press two at a time until five are out, and up to
  four, five, then six come out (it was three, which meant every man was
  pressing and the mob never existed). Measured over 30 s with four out: the
  holders' time split watch 50 % / pace 28 / move 6 / edge 6 / taunt 5 /
  call 5, seven war cries, 32 damage and 48 swings a minute.

**THE COURTYARD'S AIR (`buildFortDress`, `updateFortAir`).** Off the castle
itself, so nothing stands in stone: banners on the house walls, checked that
the wall is behind their whole width (one hung over a corner and stuck out over
the street), with a cloth sway in the vertex shader (`swayMaterial`,
`FORT_SWAY_U`); lanterns strung across the street on cord (a `TubeGeometry` — a
one-pixel `Line` vanishes at the retro scale), swinging, every other one with a
pooled lamp; and three `makeAirPoints` batches: smoke off every brazier (a
moonlit grey — dark smoke is invisible against the night sky), additive embers
drifting in the wind, and low mist sheets on the cobbles round you.

**CASTLE XIII, THROUGH THE FIRST CASTLE'S BACK DOOR.** gogiart's (CC-BY-4.0),
the same builder as the first, packed EXACT at `--scale 13` (its doors are
0.2 units in the file; at 13 they are 2.76 m, the first castle's own). It
cannot stand where the back door is — the headland starts at the first
castle's back wall — so it stands ON THE BEACH past the tower (`C13_X/Y/Z`,
z -1750), not in a room: the beach's sky, moon, fog and sea, its footprint cut
out of the sand, sea and dune by a SECOND MASK (`C13_M`, `uFortMask2`/`uFortM2`
in `FORT_CUT_GLSL`; `fortMaskAt` asks both). The walk is the first castle's
inside walk on `C13_SITE` (`fortWallsStep` takes a site now; the index is
built in slices on approach or at the cut). The back door (once the farmers
are done) is `startFort(1, 'c13')`: you arrive through the east tower's door
looking down the east court (`C13_SPAWN`, the owner's second screenshot), and
that door behind you (`C13_DOOR`, his third) is "Leave the castle" — back to
the sand behind the first castle. Dressed with `fortDress` (its glass,
`acmat_9`, lit like the first one's shutters via `userData.fortWin`),
braziers in the open courts and torches by the door, solid as discs. No
enemies yet. Measured: 21,600 frames walked from six spots in twelve
directions with jumps, never off the paving, worst overlap with stone
0.26 m against a 0.26 m body (at the narrow way between the courts). The pale
patch low on one wall of the east court is the model's own brick texture.

**CASTLE XIII MOVED ONTO THE BLUFF, AND GREW.** (SUPERSEDES "it stands ON THE
BEACH past the tower, z -1750".) It is `C13_K` (1.5) bigger than its pack,
put on at load exactly the way `FORT_K` is (`ck()` on every number typed in
its frame, the walk grid's `x0`/`z0`/`cell`/floors/roofs scaled), and it
stands on top of the sand cliff behind the first castle
(`C13_X = 18 + ck(37.08)`, `C13_Z = -1131 - ck(20.5)`), so from the farmers'
courtyard it rises over the house roofs with the lighthouse to its left.
The cliff's top only runs about thirty metres inland, so `buildC13Plateau`
lays a grid of the cliff's own material (`aU = 1`, the top of its shading)
from x 45.6 to 210 under it, rolling off past 145.

**A DOOR IN A MODEL MAY BE A PICTURE OF A DOOR.** The arched door between
Castle XIII's two courts (the owner's first screenshot) is a leaf on EACH face
of a wall two metres thick, and the wall carries on between them: brick faces
and the frame's recesses fill the whole thickness, which is why a flood of the
walk found the courts unconnected. Lifting the leaves onto hinges opened
nothing. The passage is CUT (`buildC13Arch`):
- the two leaves are found as the oak and iron triangles (`acmat_1/3`) within
  2.7 m of the door, split by which face they are on, and everything else is
  measured off them — the passage frame (`ax, az, ux, uz, L`), its half-width,
  and a pointed-arch profile from springing to crown;
- every castle material discards inside that profile in its own shader
  (`uC13PassA/B/T`, chained onto `onBeforeCompile`), with the leaves on
  CLONED materials so the cut cannot eat the door;
- the cut is lined (`buildC13PassLining`) in the castle's own brick and
  paving, uv'd at the textures' measured density (brick 0.0456 of the map a
  metre, paving 0.41);
- the faces lying between the wall's two faces and reaching across the
  doorway leave the wall index (`C13_SITE.cutTri`, asked by `fortWallsStep`
  per triangle — a centroid test missed big faces whose middle was beside the
  opening); the lining carries `c13Keep` and stays;
- **the walk had floors inside the wall** a step and a half under the courts
  (3.31 against 3.94), which you could walk down into and never up out of —
  `c13PassGround` writes the court's own paving, read a stride out of each
  face, through every cell of the passage;
- shut, it is refused (`c13PassBlocked`, in the C13 walk's `legal`).
Measured: shut stops you at the leaf; open, walked both ways with the eye
steady and no stall. `__bw.c13Dbg()` reads it.

**THE THRONE ROOM** (`THR_*`, `loadThrone`, `placeInThrone`, `startThrone`;
Uğur Yakışık, CC-BY-4.0, `assets/throne.glb`) is through door 6 of Castle
XIII's west court (the owner's second screenshot, "Go through the door"); its
right-hand lattice door, "Go out to the beach", puts you on the sand behind
the first castle facing the lighthouse (`placeOutOfFort('back')`) and saves.
The model is a stage set: it ends 2.4 m behind where you arrive with nothing
there, and there is nothing behind its two lattice doors. `buildThroneFill`
walls the end in `Wall_Base` along the hall's measured section (straight to
15.6, vaulted to 21.8), copies the left lattice door into it as the door you
came in by (a proper rotation — `(dx, dz) → (dz, -dx)`, or the copy is
mirrored), and puts a dark backing behind both side doors. The stained glass
is lifted at 0.62, not 1.15: hotter, it read as a lamp. A `startThrone(1)`
before the room has loaded only starts the load; the harness has to wait for
`c13Dbg().thrReady` and call it again.

**CASTLE XIII IS A THRIVING TOWN (`c13BuildThrive`).** The eight iron bowls on
tripods in the courts are gone (the owner: "torches on the ground don't look
good"); everything is found off the castle and hung on its walls:
- **Open court = the paving with SKY over it** (`c13Open`: lowest storey at
  `C13_FLOOR` and roof > 40). House interiors are floored at court level too,
  roofed at 17-19 m, so "floored" alone is the whole footprint.
- **Walls** are `keepWallNear` at the height asked from court cells beside an
  edge (`c13WallScan`); a wall is used only where it is flat for the thing's
  width (`c13Flat`: from in front, the nearest wall is straight back on the
  plane), and never near a door or window (`c13FeatNear`, the doors' and
  windows' own vertices on a 0.6 m hash).
- 19 wall **torches** (`c13AddTorch`, merged, flames via `keepFirePoints`, a
  pooled lamp each, plus an instanced warm WASH and SOOT on the stone behind,
  so the wall reads lit even when that lamp is out of the pool of twelve); 12
  long crimson/blue **banners** (`swayMaterial`); **flags** on the tower tops
  (parapet rings at 24.4 m, pole stood on the floor INSIDE the ring); 11
  **bunting** lines with **lanterns** (one instanced batch, swung per frame —
  30 separate lanterns were 120 draws); a **market** of 6 stalls round a
  **fountain** in the west court (drops as points, never a sheet; the owner's
  fountain recording from where it is); **flowers** under every low window,
  measured under the window's wooden FRAME (`acmat_8`), not its glass;
  **chimneys** on the roof ridges (`acmat_5`) with smoke; embers, warm motes,
  low mist; a synthesised **lute** (Karplus-Strong) from beside the fountain;
  a bell now and then. The windows (`acmat_9`, the glass) are 86 % lit
  (`fortLit`), glowing on their own: the glass map is BLUE, and the orange
  lamp multiplied by a blue map comes out grey. Inside, `updateMood` warms the
  air amber and clears the sky.
- **The way through stays clear**: `C13_PATH` (arrival door → arch → throne
  door) keeps 3.4 m clear of stalls. What stands on the floor is solid
  (`c13Solids`, discs and oriented boxes, `c13PushSolids`); nothing goes into
  the wall index.
- **The throne room's door** is measured off its own planks and frame
  (`c13MeasureThroneDoor`, PCA in plan; it is a narrow door on a diagonal in a
  corner) and dressed: torches and banners either side, a crest over it, a red
  carpet across the open stretch in front (the threshold has the lintel over
  it, so "open" starts a metre out), and firelight leaking under it, up both
  edges and in a halo. Its prompt is "Enter the throne room".
- It is built as a JOB in 3-8 ms slices (`c13Jobs`) from the moment the wall
  index is up, which is on the beach. Measured: 53 draw calls for all of it,
  0.6 ms of update; 18,000 frames of walking into everything — never in stone,
  never inside a stall; the route from the arrival door to the throne door in
  1,251 ticks with no stall. `tools/c13shot.js` (`__c13Go`, `__c13Sheet`) and
  `tools/c13walk.js` (`__c13Clip`, `__c13Route`) are the harness.

**A FACE WITH ALL THREE CORNERS ON ONE TEXEL IS A FLAT COLOUR (`fixFlatUV`).**
That was the owner's "untextured castle wall" in Castle XIII's east court: 380
m² of faces (most on the brick) whose uv collapsed to a point. Each is given its
own corners and a planar projection at the material's own measured density
(along-and-up for a wall, plan for a floor). It runs on both castles at load
(33 and 65 ms with the parse). The brick is a tiling texture, so a projection
lands on brick wherever it is.

**THE FLAIL KNIGHT HOLDS CASTLE XIII'S WEST COURT** (`MUT_KINDS.crusader`,
`placeCrusader`, `updateCrusader`, `crusaderChain`). The owner's "Crusader tank"
(`tools/crusader_pack.py` → `assets/crusader.glb`: his own fourteen clips, their
Unity playback rates written into the file as `bw_crusader.rate`) plus Mixamo's
Pro Sword and Shield Pack (`tools/ntar_moves.py -- crusader` →
`assets/crusader-moves.json`). He stands in the open square eighteen metres in
from the arch toward the fountain, facing the arch; he wakes when you come
through it (`crusaderMayWake`), leaving the castle calms him back onto his post,
and the throne room's door is barred while he lives. 66 health, poise 16, a
shield (`block` 0.5) — measured on a still player: 42 swings and 40 damage a
minute, the flail's ball 0.05–0.53 m from your chest on the frame it lands.
- **THE LOADER SHARES ONE TIMES ARRAY between tracks — and between clips of the
  same length.** `crusaderPre` rescaled his clips in place and each was rescaled
  hundreds of times into nothing; every clip gets its own copy now.
- **The hit is the BALL** (`rig.tip: 'ball_on_a_club2'`), and the aim steers it
  only late in the startup (`aimFrom` 0.78, a new kind field): aimed from the
  usual 0.55 the ball was swung into your face during the tell.
- **A blow that lands on your chest is never in the picture** — your chest is
  straight under the camera. `aimDrop` 0.08 aims at your face so the ball comes
  in through the frame; the stops are 1.9 m because the ball is 1–1.6 m out.
- His own clips key the chain; the pack's do not, so `crusaderChain` swings it
  as a Verlet rope while one of those plays and lays the bones along it.
- **CASTLE XIII'S PAVING IS TWO FLOORS ROUND THE THRONE DOOR** (0.30 and 0.69):
  `c13CourtAt` takes the highest near the paving now (`c13PaveAt` for the
  dressing). He stood 0.39 m into the stones, the runner was laid under them,
  and `bunkerFloorAt` asked the FIRST castle's walk for both masks, so a body
  killed there fell to the beach. Each castle answers from its own walk now.
- **Harness:** `tools/crusader.js` (`__crBoot` after setting skipIntro and
  reloading, `__crFight`, `__crPOV`, `__crStrip`, `__crStill`). c13shot's clock
  now creeps on every read: frozen, the boot warm loop (`while (now - t0 < 55)`)
  never ended once a warm step re-queued itself, and the page hung.

**THE CASTLE'S DRESSING IS MADE, NOT GENERATED** (the block headed "MADE, NOT
GENERATED", before `startC13Thrive`). The first pass was right shapes in flat
colours — suns with faces, clip-art crowns, rows of identical sphere apples,
glowing-cube lanterns, bead flowers, a neon outline round the throne door — and
the owner called it corny AI. Cloth is drawn the long way (`c13ClothCanvas`):
a weave with slubs, uneven dye, the sun fading the top, the street in the foot,
tide-line stains, frayed edges and holes, with a weave normal map
(`c13ClothMat`). Arms are period ordinaries in hand-laid paint
(`C13_ARMS`, `c13PaintArms`) in the dyes a town had (`C13_DYE`, deliberately
smoke-dulled). Banners hang in pleats (`c13FoldedPlane`) from iron rods; produce
is heaped in wicker baskets, every item its own lump and shade (`c13Lumpy`);
lanterns are iron straps round horn panes (`c13LanternGeos`); window boxes have
leaf cards, flower heads and trailing ivy; torches are charred rag burning at
the crown (keyed on the cylinder's uv, which survives `bakeStatic` — a local
height does not); the throne door has a worn runner (`c13RunnerTex`), a painted
shield (`c13ShieldTex`) and light only under the sill. The lit windows are
leaded diamond quarries with an uneven room behind them (`C13_WIN_GLSL`). **A
`ShaderMaterial` with no tone-map chunk sRGB-encodes linear values**, so the
fountain's "dark" water came out cyan; it is near-black with the light on it.
Keep lifts low (0.09–0.22): everything here is lit by torches, and a lift that
makes cloth readable at noon makes it a poster at night.

**THE MARAUDER SITS ON THE THRONE NOW, AND STANDS UP TO FIGHT IN THE THRONE
ROOM.** (SUPERSEDES "he waits outside the castle", `fortOut` and `umbraLimZ`,
which are gone.) He is made at module load at the throne's foot
(`UMBRA_SEAT`, room-local (0.05, 3.845, -5.25), a stride in front of the seat:
the model's `Throne.001` has its cushion at 0.71 m over the dais, its front
edge at z -5.48 and its armrests at 1.08) with `kind.thrBody`, seated
(`st.thrSeat`, `sleepIdle: 'uSit'`). He wakes once you are past room-local z
`UMBRA_WAKE_Z` (7.5) on the carpet, or on a blow or a round; the wake is
`uRise` (`UMBRA_RISE_DUR` 2.5 s, the roar the fight opens on, no turning
through it) with a shriek as he straightens, then he comes down the dais.
`thrClampUnit` holds him in the hall's stone and smashes the furniture he walks
into; `updateThroneBoss` (after `updateCrusader`) draws him only in the hall,
eases him onto its floor, and puts him back on the throne whenever you are not
in it — including when a save's `calmChasers` has put him to sleep standing on
the carpet. A save that killed him at either old spot still retires him.
- **THE SIT, THE LEAN AND THE PUSH-UP ARE SOLVED** (`UMBRA_SIT`, `UMBRA_RISE1/2`,
  `tools/umbrasit.js`): coordinate descent on his body-axis angles against joint
  targets measured off the throne, the pelvis 0.62 m back over the cushion.
  `poseRig`'s `build` takes `hipF` now (metres along the body's forward, like
  `hipY`), so the hips sit back on the seat and come forward over his feet as
  he rises, rather than his feet sliding.
- **THE SOLVER'S BASE MUST BE THE STANCE**: stopping every action AND disabling
  it made `poseRig`'s `a.play()` stamp nothing, and the first solve was built on
  his bind pose — measured in the game, the pelvis sat 0.22 m low and the knees
  half a metre out. Stop them and leave them enabled, then check `__usWhere({})`
  against the game's own `uStance` before trusting any number.

**THE THRONE ROOM'S GREAT WINDOW IS THE OWNER'S OWN PICTURE** (`THR_WIN`,
`buildThroneWindow`, `assets/throne-window.jpg` built by `tools/throne_window.js`
from `tools/throne_window_src.jpg`). The window is an APSE, not a pane: five
glass facets up to 16.41 m and a half-dome to 20, plus two front facets that
turn toward you. Its faces are lifted out of `Wall_Base` (uv2 inside the glow
atlas's window rectangle, or anything of the wall inside the apse) and the
picture is projected straight down the hall, so from the carpet it reads flat.
The composite is drawn in that frame (x -4.75..4.85, y 4.05..20.05, 128 px a
metre): the picture, its black frame trimmed, fills the straight part inside a
red band with gold pearls; the dome is a tympanum in its own blue with roundels
cut from its own glass; the front facets are blue diamond quarries drawn
squeezed by `KX` (0.21) because two metres of their depth project into half a
metre of x, and so are their leads, or they come out a hand wide on the glass.
It is unlit at 0.55 linear, which is the old window's level from the carpet,
measured. **The apse opening's reveal was ALSO mapped with the glass** — colour
and glow — so a ring of the old shards stood round the new picture; its jambs
and soffit take the side wall's stone uvs and a black glow texel. A ray that
"hits the new mesh" does not prove the old one is gone: coplanar faces drew the
old glass over the new at the same depth.

**A CASTLE'S WALK HOLDS YOU TO THE COURTS (`siteCrossed`, `siteMainStep`,
`siteOnMain`).** In Castle XIII a narrow alley between two buildings had a
crack in its drawn stone you could be shoved through, onto floor behind the
houses with the sea showing under it. Two rules, at the end of both castles'
walks and in their knockback clamps:
- **a frame's move may not cross a drawn face**, tested at three heights and
  on three parallel lines 5 cm apart. One line slipped through a seam between
  two triangles;
- **and you must stay on the courts' own floor.** That is a walled flood from
  the arrival spot, built in slices on the approach (`S._main`), with a
  one-cell margin. It catches a real diagonal crack that no segment test sees.
Measured: no shove into any wall ends off the courts, and the walk tests are
unchanged (the route reaches all 8 waypoints, 0 frames in stone).

**MOVING BETWEEN THE CASTLES AND THE THRONE ROOM SAVES.** Going in by the
first castle's gate, through its back door into Castle XIII, and into the
throne room are all checkpoints (`fortIn`, `c13In`, `thrIn`); leaving to the
beach saves too. `saveRoom()` answers `fort` / `c13` / `thr`, `ROOM_BACK` can
restore all three, and `clearRoomFlags` puts `inFort` and `inC13` down.

**THE FLAIL KNIGHT HOLDS HIS WEAPONS.** By the file's own bind his shield
hangs 0.57 m off his wrist and the haft 0.46 m off his other hand, so they
floated in every clip. `crusaderSeat` fits both from their own shape:
- the haft goes through the right fist;
- the shield's front is the side its middle sinks away from.
Every clip's tracks on those bones are dropped. `crusaderShieldTick` then
carries the shield upright on his left forearm every frame.

**AND HIS FIGHT IS READABLE.**
- `naturalSwings` was never called for him; `updateCrusader` calls it now.
- Each swing has a held cock (`natHold`, `cockF`), so the flail visibly draws
  back and hangs before it comes.
- Every blow lands at 2.1–2.4 m (`stop`), which keeps the ball in the frame.
  Closer, it landed beside or behind your eye.
- `stepBack` makes him give ground when you crowd him.
- On the wind-up the chain rattles and a glint shows on the ball
  (`sfxFlailTell`).
- On the strike there is a rush of air and a faint trail
  (`sfxFlailRush`, `makeFlailTrail`).
- A ball that comes down near the paving thuds, sparks and throws dust,
  whether or not it found you.
- He is lighter (`emis` 0.24, warm rim, gamma 0.86).

Measured hands-off: 30 swings and 35 damage a minute, about 80 % of contacts
on screen. `tools/crusader.js`'s `__crStrips` and `__crPOV` are the harness.


**THE SLOT BESIDE THE GATE IS WALLED UP (`buildFortNotchWall`, `FORT_NOTCH`).**
Between the gate tower and the round tower east of it the model leaves a
crooked slot a stride wide, open to the beach, with no paving: the dune and
the sea showed in it as a ragged dark-blue floor with loose blue shards over
it (the cliff poking up through the unmasked cells). A curtain of the
castle's own stone (`acmat_8`, uv'd at ~0.3 of the map a metre) closes the
mouth tower face to tower face, 5.45 m with three merlons, and the slot
behind it (a flood from inside it, plus a box for its far end east of the
round tower) goes into `FORT_M`, which also makes it solid from the beach.
The mask cut is kept a whole cell BEHIND the wall's face, or the sand's
ragged cut shows as teeth along its foot. How it was found: a probe of what
the walk's floor is made of (`tools/castlefloor.js`) found nothing; a notch
search on the mask (open beach with mask on two opposite sides within 3 m)
did, and `tools/widestill.js` renders 16:9 stills to match a screenshot.

**THE LOST FARMER (`farmLostTick`, `farmRecall`).** A farmer out and alive
but neither within 8 m nor in line of sight (`keepHitsWall` at his chest)
for 12 s (24 while three or more are out) is sent back indoors and out again
through a door (`farmSendOut(u, true)`, which may use a busy or near door).
The very last man must come within 8 m — hanging back in the dark counts as
lost. And if nobody is out and three sends in a row find no door, every
door's `busy` is cleared and one is forced (a man retired mid-burst never
handed his door back). Measured: a farmer pinned 40 m off came out of a door
at 23 s and was at 1.5 m soon after; a full fight still ends (78 s, 20 kills).
`tools/farmlost.js` plays the fight and logs anyone who goes missing.

**A FARMER YOU KILLED STAYS KILLED (`farmKeepDead`).** The checkpoint a death
loads is the gate's, written as you came in, so every farmer cut down since
came back. Each death is now written straight into the save that is there,
and the last one sets `fortFarm`. (Leaving by the gate always saved the dead
correctly; this is the death-and-reload case.)

**THE THRONE ROOM'S DOOR MOVED (`C13_THR_DOOR` = `ck(-24.93), ck(13.53)`).**
The owner's screenshot: the tall door at the west court's far end under the
keep, seen from local (-34.8, 14.1) looking 2.74 rad. Found by clustering the
oak and iron (`acmat_14/16`) vertices and taking the one dead ahead of that
view; `c13MeasureThroneDoor` measures it as before (it faces (0.84, -0.54)).
`C13_PATH` ends on it, so the fountain (which keeps off the path) moved too —
and with it the knight's post and his save key, so a dead knight is now dead
under ANY `crusader@` key (`placeCrusader` and the restore).
**The overlay's `look` is `lookEuler.y`, and so is `__bw.look(yaw)`:**
forward is (-sin, -cos). `tools/c13look.js` renders 16:9 stills from it.

**LEAVING THE THRONE ROOM COMES OUT INTO THE WEST COURT** (`placeOutOfThrone`),
a stride in front of the door, facing away; turning round shows the door in
the keep. It used to be the sand behind the FIRST castle, whose six-metre back
wall was nothing like the hall you had left. Both the dais door and a new one
at the hall's near end say "Leave the throne room"; the save is `c13In`.

**THE MARKET IS GONE; THE FOUNTAIN STAYS.** No stalls, barrels or crates in
`c13BuildMarket` (the owner: "take out the stands and just have the fountain").

**CASTLE XIII IS LIT (`c13LightsTick`, `C13_LAMP_K`, `c13TorchPools`).** Its
stone is lit mostly by its OWN EMISSIVE MAP (`fortDress`'s night level), so
ambient and lamps barely moved it: inside, the castle's `acmat` materials'
emissive is warmed (×(1.22, 1, 0.8)) and lifted ×1.45, the moon ×2.4, ambient
×2.7, hemisphere ×2.5 (intensities only: `updateMood` owns the colours and
rewrites them every frame), torches ×1.7, all put back on the way out. Each
wall torch throws a warm additive pool on the paving (one instanced draw),
the ground mist is 130 soft sheets at 0.30-0.50 alpha, and the fog is ×0.9
instead of the first castle's ×0.55.

**THE FLAIL WHIRLS (`crusaderChain`, `u.whirl`).** Through every flail blow's
wind-up (not `cBash`/`sKick`), the chain's points are pulled onto a tilted
circle over his flail shoulder, spinning up to 2.1 turns a second with a
swish each half turn, then let go at the strike so the rope's own momentum
carries the ball in. Keyed own clips give up their keys while it whirls and
blend back after. The strike trail is wider and brighter. (The owner: "i cant
even tell he is swinging".) `tools/crlive.js` renders a live swing.

**FARMERS ARE KNOCKED DOWN WHERE THEY STAND, IN PIECES.** `ragK` 1.15,
`ragVmax` 6.5, `ragTravel` 5, `ragLift` 0.45 (from 3.3/18.5/22/1.15: they flew
out of sight), `pieceK` 0.45 on the severed pieces' throw, and two to four
pieces a kill (65 % through the middle on a heavy). The tavern's drinkers
inherit it. Measured: body 0.3 m from where he stood, four pieces off.

**THE MARAUDER, HARDER AGAIN:** hp 115 (80), poise 26, block 0.62 at 0.74 a
block, stun/recoil 0.24, bleed resistance 1.6, knockdown 0.07 every 26 s,
and a hotter rage. Tells untouched.

**THE FLAIL IS A WEAPON NOW, NOT A PENDULUM (`crusaderChain`).** Three things:
- between swings the rope is heavily damped (0.90 a step) so the ball comes to
  hang off the haft in a second instead of orbiting him through the exchange;
  and no link may move more than 0.45 m in a frame, or the rope snaps about;
- the body is SOLID to the chain: every link is pushed out of a capsule round
  him, so a swing let go behind his head no longer comes round through his
  helmet and chest;
- a blow goes where it is aimed. The rope is physics and the aim turns his
  shoulder, which cannot steer a ball on a chain. Through the strike the ball
  is GUIDED on a curve from where it was when the wind-up was let go, up over
  his flail shoulder, down onto your chest on the contact frame, blended in
  over the swing and never further from the haft than the chain is long; the
  links are laid between with a little sag. After the contact the physics has
  it back, so the follow-through is a real swing carrying on.
- **and held in the gold it holds too**: the artifact freezes the mixer and
  the body, and the rope is simulated outside the mixer, so the ball went on
  swinging round a statue. `crusaderChain` returns while `st.immob > 0`.

## The beast on the chain, and the throne room's two takes (2026-10-08)

The owner: put DanteGuy's "Dante Beast FPSC Pack" on a chain round its neck in
the throne room; the marauder cuts the chain and it charges; he watches and
only fights if hit; when it dies he gets up slowly and charges.

- **The file** (`assets/dante.glb`, gltfpack 1024): Biped rig, clips named
  `Dante Beast|dante2_skeleton|Attack1` etc. — `dantePre` keeps the last part,
  lower-cased: idle, walk, run, attack1 (2.7 s, contact f46/81 = 0.568, two
  hands), attack2 (2.23 s, f33/67 = 0.49, right hand), rage, stun, death
  (4.43 s, forward onto its face). Model faces -0.585 rad (`faceFix: 0.585`).
- **`h` is NOT its height here.** Its origin is the PELVIS, and the scale
  comes out as `h / (origin → top)`: at `h: 2.35` it stood 3.44 m. `h: 1.78`
  gives 2.5 m. Measure the box after loading whenever an origin is not at
  the feet.
- **Placement**: `DANTE_SPOT` (-2.30, -1.30) is the hall floor (2.68 over
  `THR_Y`) left of the carpet at the dais' foot; the dais top is 3.85, the
  steps run z -1 → -5. The chain is bolted to an eye on the OUTER FACE OF
  THE THRONE'S RIGHT ARMREST (`DANTE_RING`, y 0.90 over the dais) — a floor
  ring anywhere he could not reach seated made the cut impossible.
- **The collar**: the beast's neck is buried in its shoulders. A torus round
  the neck bone at 0.19 m was entirely inside the mesh (render it red to
  see). 0.30 m at 0.55 of the way neck → head shows as a ring each side of
  the head; the chain hangs from the ring's lowest point (`danteCollarLow`),
  not from inside the neck.
- **Scratch-vector aliasing**: `stepThrChain` held the collar in `_chV` and
  then reused `_chV` for every link's midpoint — the collar was put on the
  last link. A position kept across a loop gets its own vector.
- **The chain** is a Verlet rope (points a link apart, 10 iterations, floor
  from `thrStandY`, pinned at the eye and the collar), links an
  `InstancedMesh` with every other one turned 90°. Iron needs to be LIGHTER
  than the steps (0x8a847a, emissive 0x2e2a24) or it is a black line on black.
- **The cut is SOLVED**: the marauder's blades are separate meshes
  (`Blade1_94` under `Hand1R_95`, tip 0.92 m past the hand, found as the
  blade's farthest vertex). `tools/umbrasit.js`'s `__usWhere` plus a tip
  target solved `uCut`'s top (tip 2.83 over his feet above the right
  shoulder) and its contact (blade middle 0.82 m out at armrest height, tip
  a third of a metre off the dais) — only chest, right arm, hand, clavicle
  differ from `UMBRA_SIT`. Group frame: x his LEFT, y up, z his front.
- **The takes** (`thrCut`, in `frozen()`): the camera is turned, never moved.
  From 14 m down the hall a 26° lens shows nothing; `thrCutFov(target, h)`
  picks the lens that makes h metres fill the frame (8–12° on him, ~20° on
  the beast). `updateWorldSparks` lives in `update()`, which a take stops —
  the take calls it, or the sparks at the snap hang in the air unseen.
- **Phases** (`thrScene.phase`): 0 chained → 1 cut → 2 its fight → 3 dead →
  4 rise → 5 his fight. `throneMayWake` refuses until 5; a blow on him wakes
  him (his own provoke) and the beast's chain goes too; a blow on the
  chained beast starts the cut. A restore with the beast dead is phase 3 and
  the rise plays when you come up the hall.
- **Leaving** through the lattice door now goes OUT TO THE LIGHTHOUSE
  (`startThrone(-1, 'lh')` → `placeOutOfFort('back')`: the beach behind the
  first castle, facing it).

## The beast, second pass (2026-10-08)

- **"He keeps clipping into the player"**: the beast is bent double — head and
  fists a metre ahead of its pelvis-origin — so `body` 1.30 (the shove radius,
  his chest), `lungeStop` 2.35, swing stops 2.25 / 2.45 and reaches 2.75 /
  3.05. Measured after: closest 2.06 m, blows landing at 2.1–2.6 m.
- **Sliding**: `gaitBySpeed` + `velGait` + `rag` naming his toes
  (`Bip01_R_Toe0_094` / `Bip01_L_Toe0_079`) so `measureGaits` reads his own
  strides — walk 1.39 m/s, run 2.86 m/s — and the body is held to them
  (median mismatch 0.05 m/s). And **`kind.planted`**: his attack clips carry
  no travel, so the startup walk-in, the gap-closing `lungeLead` and the
  chained step-in all glided him (10.7 m/s in a smash after you stepped
  back). A planted kind skips all three, caps its lunge (`lungeMax`), and
  DROPS a swing whose target left reach early in the startup and runs after
  you instead — after: ≤0.21 m/s while swinging.
- **Harder / more aggressive**: 80 hp, poise 20, aggr 3.4, press 0.96, chains
  of three, `reacts`, `smart`, a rage at half health (`rageClip: 'rage'`).
  He does NOT circle — his only sideways clip is his walk.
- **The collar** is fitted to the mesh, not the bones (`fitDanteCollar`): the
  neck flesh sits 0.18 m off the neck→head line and there is no neck
  narrower than the skull base; the section there (0.88 of the way) is an
  ELLIPSE ~0.19 × 0.29 m. A tube bent along it, stored in the neck bone's
  frame, follows every clip; the chain hangs from its lowest point.
- **The rise waits for the fall**: the death clip is 4.43 s and starts ~0.4 s
  after the blow; the take now needs the clip finished AND 1.3 s past its
  length. `noTail` skips the warden death's tail thump four metres behind.

**THE BEAST, THIRD PASS (2026-10-09; "his hits never really land, his arms
look twisted").** `aimed: false` — the shoulder correction at aimK 1.6 was
the twist. Reaches set from his hands (smash 2.1 m at chest height, backhand
2.3–2.6 m at hip): dA1 reach 2.45 / stop 2.0, dA2 2.75 / 2.25. `landSlop`
0.22 and `limbR` 0.28: at 0.45 eight blows scored at 2.3–2.9 m with the
hands half a metre short. `plantSlack` 0.2: a planted swing whose target is
beyond reach early in the startup switches to a longer swing it owns (inside
0.2 s) or is dropped with `st.closeIn` 0.5 s, during which he is not "near"
and WALKS in — without it he started and dropped 342 swings in 25 s, because
`near` uses his LONGEST reach. After: contacts at 2.6–2.7 (backhand), hands
on you in the stills.

**THE FARMERS AGAINST THE DOUBLE (2026-10-09).** The owner's damping on them
(`ragK` 1.15, `ragVmax` 6.5, `ragTravel` 5, `ragLift` 0.45, `pieceK` 0.45 —
"they fly too far, it looks like they disappear") stays for blades; a SHOTGUN
kill overrides it per body (creatures.md, `rBL`): thrown 3.6–6.2 m, hips
lifted 0.4–1.4 m, ~0.6–0.9 s in the air, still inside the courtyard's walls.
The crowd numbers are in weapons.md ("THE CROWD").

**A DEATH PUTS THE WHOLE FARMER FIGHT BACK (2026-10-09; the owner: "there's
always less farmers in the castle fight when I reload the checkpoint — it
should fully restart the fight").** `farmKeepDead` no longer writes each
death into the save on disk; it only notes the key in `deadUnitKeys`. A death
loads the gate's checkpoint exactly as it was written (every door full), and
the dead are still in any checkpoint written AFTER them — leaving by the gate,
the west court, the throne room — which is the progress that should keep. The
2026-10-08 "a farmer you killed stays killed" above is reversed by this.

**THE BEAST, FOURTH PASS (2026-10-09; "too slow and clumsy, needs more attack
animations and scary aggression, connect better").**
- **Five swings out of two clips.** `danteMirrorClips` (in `dantePre`) reflects
  the backhand across his own sagittal plane at load → `attack2m`, the other
  arm. The recipe that worked, after three that did not: the plane is the
  CLIP's (hip to hip at its first frame, squared to the spine, through the
  pelvis); the per-bone right-hand factor `G = Rm_bind · F_b` is measured ONCE
  in the SKIN's bind pose (`bindMatrix · inverse(boneInverses[i])`, which is
  a symmetric figure: hips, shoulders, hands and feet on one axis, every
  partner exactly a half turn off its reflection), and holds under any turn
  of the whole animal; locals are re-derived under the mirrored parents;
  quaternions kept on one side of the sphere frame to frame. What failed:
  `S·W·S` with the plane's offset in the right-hand factor (every bone 680
  units off — tore him apart); F measured off the LOADED nodes (a bent, twisted
  idle frame: F ran 144°–178°, and the mirrored beast was hunched and turned);
  the plane from the bind figure (he faces another way in it: mirrored beast
  turned 90°). Verified by stills: the mirrored backhand is the original's
  exact reflection.
- **Rate.** `naturalSwings` takes `A.rate`: the clip plays at that speed,
  startup and recovery alike, still landing on its contact frame. Smash 1.4x
  (wind 1.10 s), backhands 1.5x (0.73), the quick ones 1.9x (0.58). Five
  entries `dA1 dA2 dA2m dA3 dA3m` (dA3/dA3m are the backhands fast), chains
  left-right-left at 0.6–0.82, `chainMax` 4.
- **Numbers:** `speedK` 1.75, rage 2.1; `gaitMax` 1.5 (at 1.25 a sprinting
  player walked away from him); `aggr` 4.2 / rage 4.8; `press` 0.98; `feint`
  0.10; `step` 0.20; `turnMax` 7; `fade` 0.11 (the 0.20 crossfade was the
  "clumsy": every swing began with the arms sliding out of the last pose).
- Measured, standing still at 2.4–2.8 m with health pinned: 12 blows landed
  in 15 s, chains of four, all five swings drawn over 20 s (13 starts).
- Chase, measured: from 9.5 m he is on you (3.2 m) in 2.75 s, running at
  3.6 m/s — faster than your walk (3.4), slower than your sprint (5.7, five
  seconds of it). `gaitMax` 1.5 is the cap; raise it before `speedK` if he
  needs to be quicker, or the feet slide again.

**THE BEAST'S OWN VOICE (2026-10-10, the owner's recordings).** `voice.rec`
on his kind is a map of role → bank: `roar: 'danteChain'` (two screams cut
from the end of a 37 s file — the first 28 s are silence), `hurt`/`tell`:
`danteHit` (one take cut at −28 dB into ten grunts, `DANTE_HIT_N`), `die:
'danteDeath'` (4 s, the length of his fall). `mutVox` with an object `rec`
takes the WHOLE bank as the pool at the clip's own pitch (±2 %), and a role
the map leaves out falls back to the synthesised throat. The chain take plays
scream 1 through `playSampleAt` at him as he rears (`C.raged`), the synth roar
only if the bank has not landed.


## 2026-10-13 — every door names where it goes

XIII's "Leave the castle" sent you through `placeOutOfFort('back')`, the
first castle's back-door EXIT, which the lighthouse island had taken over the
day before, so the owner left XIII for the first castle and stood on the
island. The castles are one road now, and each door names its own
destination (details in `docs/notes/lighthouse.md`, 2026-10-13): fort gate ↔
beach, fort back door → XIII only, XIII "Back to the first castle" →
`startFort(1, 'fromC13')` → inside the fort's back door facing the gate
(`fortBackInside`), XIII arch → throne, throne near door → XIII court, throne
lattice door → island drawbridge, island postern → throne lattice door. The
postern outside the fort's back wall is barred (`bare`). **A placement shared
by two doors is a trap: change it for one and the other goes there too.**
The beach map numbers the four and draws the road between them in red.

## 2026-10-13 (later) — the passage between the castles, XIII's north door

The owner: "make the castles look like they connect from the doors used when
you look from the lighthouse island". The first castle's back door is at
world (21, −1115.3) — its doorway is open in the back wall's outer face
(−1118) at x 20–22 — and XIII put you in at its EAST tower door (122, −1174),
a hundred metres off with nothing between. Measured by raycasting: XIII's
north wall's outer face at z ≈ −1134 for x 28–50 (receding to −1149 at x 20,
the north-west corner), its inner face at −1136.25 (x 39), the wall 16 m tall
(top 20.4); the court just inside is open at x 37–40 (floor 3.94), a tower
fills x 29–36; the bluff between the castles is a plateau at 3.58 → 4.0.
- `buildCastleLink` (called when XIII lands): a covered gallery from
  `CASTLE_LINK.a` (21, −1117.6) to `.b` (39, −1134.5), seven 3.4 m bays
  stepping up the plateau, ashlar walls (`lhAshlarMaps`, `fortDress`) with
  planar uvs (`planarUV`, a block 0.8 m), arrow slits, buttresses, a slate
  roof (`lhSlateMaps`) and a pair of lamps at each end. No colliders: it is
  past `CLIFF_BLOCK_X`, out of reach on foot; walked by the cut.
- `C13_NDOOR` (world 39, −1136.25): a plank door in an ashlar frame on the
  north wall's inner face, "Back to the first castle". `C13_SPAWN` is a
  stride inside it facing into the court (yaw 0), so the fort's back door,
  XIII's restore ('c13In') and its way out all use it. The east tower door is
  only a door now.

## 2026-10-13 — the passage between the castles, in their own stone

The owner: "make the connection of the castles you added blend more too the
textures dont match the castle it just looks like ai slop make it better."

- The first passage used the lighthouse's ashlar (`lhAshlarMaps`) at 0.8 m
  blocks and a slate roof: neither castle's stone. `buildCastleLink` now uses
  the castles' own MATERIAL OBJECTS (`linkCastleMat`): XIII's wall brick
  `acmat_4` and the first castle's rubble `acmat_8` — so the night grade
  (`fortDress`) and the fog are theirs.
- **Their scale, measured off their faces** (median world length per uv unit
  over horizontal / vertical edges): XIII `acmat_4` 11.76 m along a wall,
  23.37 m up it; the first castle's `acmat_8` 5.30 / 3.36. `planarUV2(geo,
  ku, kv)` lays uv by face normal at those. (Both maps repeat; `acmat_4` has
  four material instances in XIII — any one serves.)
- The shape: a battered rubble footing, XIII brick curtain walls both sides
  with a rubble string course, a brick parapet and merlons with rubble caps,
  rubble-dressed slits, a flat walk roof below the parapet, and a square gate
  tower half way (rubble quoins, battlements, a lit window each side). The
  lamps at the ends stay.
- It needs BOTH castles in: `buildCastleLink` returns until `fortReady` and
  XIII's model are both there, and is called from both loaders.

**XIII: IN BY THE EAST COURT AGAIN, AND THE NORTH DOOR IS OUT (2026-10-13; the
owner: "after the farmer fight … the door to XIII needs to spawn you here [the
east court street] then the door with the red carpet leads to the throne room.
take out that door you added. dont change the position of the castles just the
doors").** `C13_SPAWN` is HEAD's again (`ck(28), ck(-8)`, yaw 1.75: down the
east court, the arch ahead) — just inside the north door it put you 4.5 m from
the red-carpet door, past the arch and the knight. `buildC13Doors` is the
invisible proxy at the east tower door (`C13_DOOR`) again, now "Back to the
first castle" → `startFort(1, 'fromC13')` (NOT HEAD's `startFort(-1,
'back')`, the island's exit by now). `C13_NDOOR` and the `c13NorthDoor` frame
are gone; `buildCastleLink`'s gallery stands, as scenery.

**THE THRONE ROOM'S END WALL HAD HOLES (2026-10-13, "THE THRONE ROOM IS MISSING
WALLS").** `buildThroneFill` builds the end wall (the model stops at z 20.96)
from a run of the left wall's bays turned a quarter round — and dropped any
triangle with a corner outside the run. SketchUp fans a wall off far corners, so
the bottom 3 m across the whole width, full-height strips at both sides and the
upper corners were open onto `thrEndBack`'s black (55 wall, 33 window, 30 beam
triangles). Each triangle is now CLIPPED to the run (Sutherland–Hodgman against
z = BAY ± 6.55 and y = 15.75), position, normal and all three uv sets
interpolated on its own plane, so the stone carries on seamlessly; and a plain
`Wall_Base` plane (`thrEndPlain`, the lunette's uv recipe) stands 6 cm behind
the bays, so nothing can show black again. Rendered from mid-hall: the whole end
reads as wall.

**DANTE GOES LIMP AT THE END OF HIS FALL (2026-10-13).** His `rag` map is the
whole biped now (Bip01_* → Character1_*). `updateDante`, on the last frame of
his `death` clip, calls `mutRagdoll(D, 0, 0, 0)` and sets every particle's
previous position to its current one — no throw — so the arms and head settle
onto the flags from the pose the clip ended in. Measured: 22 parts, the body
lying at the floor (hips 0.7 m, hands and feet 0.6 over the hall's 602.2) and
staying there. **The marauder looks at you through the chain cut too**
(`thrHeadToCamera` after the mixer in the `chain` take).

**THE FARMERS LOST THEIR POSTER COLOURS (2026-10-14, "the farmers look too
cartoonish make them match the style better").** `farmGrit`'s map_fragment now
starts by washing the albedo halfway to its own luminance and raising it to
the 1.12 power (1.22 was too dark: the faces went to silhouettes against the
cobbles); the emissive lift gets the same 50 % desaturation before `fgMul`.
Cache key `farmGrit3` — bump it whenever the injected GLSL changes, or the old
program is reused. Judge it in the courtyard (`tools/farmlook.js`,
`__farmLine`), not in a studio: the point is that they match the stone.

**THE MARAUDER'S RISE TAKE NEVER PLAYED.** A hit while he sat on the throne
went through `umbraProvoke`, which woke him straight off the seat and skipped
the take. Now, while `thrSeat` and `thrScene.phase < 5`, a provoke only starts
`startThrCutRise()` (if phase 3, no cut running, `uRiseSlow` loaded) and
otherwise returns. Leaving the throne room mid-take puts phase 4 back to 3
(and 1 back to 0 for the chain take), so it plays in full the next time.
Measured: a hit while seated leaves him seated; after the beast dies the rise
plays (phase 3 → 4, 3.4 s, → 5).

**THE FARMERS HOLD THEIR TOOLS, AND THE FOLDS ARE IN THE LIGHT (2026-10-14, round 3).** Measured from the front and the
side INSIDE a frame (see harness.md — the life layer's curl is undone after the render): every handle lay across the
outside of half-bent fingers, the rake's under the wrist. The handle went through `palm` (62 % wrist → middle
knuckle, the flat of the palm) and the curl was 1.2 a joint. Now `FARM_FIST` 1.5, and `farmSeatTool` closes the right
hand's fingers by it, takes the mean of the four fingers' joints 1-4 (the hole the fist makes) and moves the tool
there, in the hand's frame (`u.farmPalm` is where `farmArm` put it). Detail: `farmGrit` puts the file's AO into the
COLOUR (`texture2D(aoMap, vAoMapUv)`, squared, 60 %) and into the emissive lift — three's aoMap darkens only ambient
light and these men are lit by direct light, so every fold and seam was being thrown away; relief at a 3 mm grain and
in long hanging folds; normalScale 2.1; a roughness floor of 0.58 (0.25 was a plastic sheen). Cache key `farmGrit4`.

**THE MARAUDER WAITED FOR A HIT AFTER DANTE (2026-10-16, "make the marauder attack right after you kill dante, it
waits until you hit right now").** The rise take waited for `fell`: Dante's death clip within 0.03 s of its end. But
`updateDante` hands the body to the ragdoll at 0.04 s from the end and the clip stops there, so `fell` never came true
and only `umbraProvoke` (a blow) started the take. `fell` is also `!!D.rag` now, and the beat on the body is 0.4 s,
not 1.3. Measured: the kill at 0 s, the take at 5.0 s (the 4.4 s fall + the beat), he is up and charging at 11.5 s.
Two end-of-clip tests that differ by a centisecond is a door that never opens.

**THE PALADIN (2026-10-17, the owner's "paintpoly paladin knight").** Comes into the farmers' fight in the first castle
when half the twenty are dead (`palMayCome`, from `updateFarmers`), with a take (`palStartCut` / `updatePalCut`, wall
clock, `palCutRef` in `frozen()` and the lens, declared at the top of the file): the bell's last stroke, a low drone
(`palDrone`), dust where he stands out of the dark beyond the nearest farmer, the farmers stop and turn to him (their
mixers ticked by the take, idle), he walks up dragging his point (sparks when the tip is under 0.45 m), the wide sweep
(`pWide`) takes the man's head off (`palKill` + `finishMutant` by hand: `gunHead` → `burstHead`) with the world
slowed to a fifth for 0.75 s, then he turns to you and roars and the fight is his (`forceSwing` pLeap / pWide).
- **Model:** `tools/paladin_pack.py` rebuilds the Rigify rig onto 52 Mixamo-named bones (twist halves, pelvis,
  breast and palm merged into their chain bones' weights), skins the sword wholly to `RightHand`, hangs
  `paladin_tip` / `paladin_hilt` / `paladin_pommel` empties off the hand, and repaints the storybook lilac as
  blackened steel (the painted light kept as wear), a black-red tabard and dark hide. 1.4 MB. At `h` 2.45.
- **Moves:** `ntar_moves.py -- paladin` (`--partial` writes a set whose clips are still coming). Swings: the owner's
  Mixamo `paladin moves` folder on the Desktop (Standing Melee Attack Downward/Horizontal/Backhand, Combo Ver. 1–3,
  360 Low, Run Jump Attack, Taunt Battlecry, Falling Back Death). Stance, gait, flinches: Great Sword Pack clips the
  orc does NOT use (idle 3–5, impact 3–5, blocking 2, casting, death 2). The sources moved to
  `~/Desktop/BEACHWALK ASSETS`; the set says so (`SRC`).
- **Swings he has no clip for are not thrown** (`kind.clipGated`, in the pick). `hit` comes off the json at author
  time (`authorPaladinClips`) so `natural` times every swing off its own contact frame; `natHold` holds the top.
- **Cleave:** `palCleave` — a farmer whose chest (1.15 m, r 0.5) or head (1.55, r 0.42) the hilt→tip segment passes
  near during a `cleave` swing's strike window dies (`palKill`, head 35 % or when the head was the hit).
- **Heavy guard:** `blockMutant` / `parryMutant` call `palBlockFx` for a `heavyBlock` kind: 44/64 world sparks off
  the point of HIS blade nearest your eye, the deflect lamp, a low `blockMil`, a slam, more shake, hitstop 0.13/0.26,
  and the block's shove ×1.5.
- **The street is not won until he is dead too** (`paladinDone()` gates `farmFight.done`); `farmCalm` → `palCalm`;
  `farmRetireAll` retires him (a save from before he existed, with the street already won).
- **Boss bar:** `palBarShow` / `palBarTick` — the game's first; a DOM bar under the picture, "THE PALADIN".
- Not the beach's ground clamp (`!u.kind.paladin`); `fortBody` gives him the castle's stone (`fortClampUnit`).
- **His entrance spot must be SEEN**: the first try put him on open cobbles round a corner and the take's first six
  seconds were a wall. `palStartCut` now wants a clear line (`keepHitsWall`, FORT_SITE) from your eye to his chest
  and head height, and from him to the victim at knee and chest height, scoring far-and-behind-the-victim. The victim
  is the farmer nearest EIGHT metres off (more than 5): a man at 3 m put the roar on top of the lens.
- **Harness:** `tools/paltest.js` (`__palBoot`, `__palCut`). In a pane that is not focused rAF gives NO frames: drive it
  with `tools/burntest.js`'s fake clock (`__clockOn`, `__adv(n)`); `b.frame(n)` alone advances real time only (a
  thirtieth of a second for thirty frames). The intro waits on wall time: let a few real seconds pass. A still of the
  player's view needs `renderer.setSize(...)` first — the hidden pane's canvas is 0×0. tools/farmfight.js's
  `__unfreeze` spins up to 5,000 frames if the intro never finished: it held the page for minutes.

**THE PALADIN'S MOVES, ROUND 2 (2026-10-17): the EEJANAI slashes, a real grip, and one rest per skeleton.**
- **Sources:** the owner's EEJANAI "Free Sword Animation" (nine slashes, three stances; `~/paladin moves/Assets/
  EEJANAI_Team`), MocapOnline's "TC Sword" free pack (`~/Downloads/TC_Sword_Free_Pack`: ready idle, walk, run, one
  combo), the Great Sword Pack for flinches, strafes and death. EEJANAI's FBXs have the HIPS AS THE ARMATURE OBJECT
  (`EEJANAIBot:Hips` under an `Armature` empty, 0.01 scale) and prefixed bones: `tools/eej_convert.py` re-lays each on a
  plain Mixamo skeleton (Copy Rotation, world→world, per bone — they share rest axes; a Child Of on every bone counted
  each parent twice — and a Child Of with its inverse set at rest for the hips) and bakes to `~/paladin moves/converted`.
  Its three STANCE FBXs are a near T pose (the real stances are Unity humanoid .anim curves): not used.
- **ONE REST PER SKELETON (the owner's "all bunched up and ugly").** `ntarRetarget` aligns the rig once, to the FIRST
  clip it is handed, and plays every clip's delta from that rest. Fed Mixamo, MotusMan and EEJANAI clips together, the
  TC walk and the slashes were played off Mixamo's rest: shin swinging sideways, arms flared. `authorPaladinClips`
  groups clips by rest (rest Hips quaternion + LeftArm rest position) and retargets each with the first of its group;
  `facingRef: 'mixamo'` only for Mixamo's rest (it compares the hips BONE's rest to Mixamo's, meaningless for others).
  After: his walk's bone directions match the source to a hundredth.
- **THE GRIP** (`tools/paladin_pack.py`): the hand is a leaf of the retarget and takes its FOREARM's rest alignment, so
  the blade is seated as the captured swordsman's sat at HIS rest, turned back by the smallest rotation that lays the
  paladin's forearm along his (`Ai`). Read in the hand's own frame on a frame of a SLASH (constant to a hundredth
  through the clip; the stance files hang the sword anyhow, and with the sword empty's own action off it sat a
  quarter-turn wrong), carried to the rest hand, and turned to face −Y off his feet (EEJANAI's bot faces +Y; the same
  foot rule ntar uses, so they agree). Blade ×0.78 (1.5 m model, ~2.1 m at h 2.75).
- **CONTACT IS MEASURED ON HIS BLADE** (`palContact`, at load): after the draw's apex, the fastest frame with the
  blade's middle at a man's height across his front (within ±115°), the active window the span where the point's
  speed is over half that, opened 0.16 s earlier (in the fight the blade went through you before the window, every
  time), the clip's own travel counted. The clip is turned about the vertical (ramped in to the blow, out to the end,
  ≤ 0.9 rad) so the blow crosses his line; his stop is where the blade crosses (≤ 2.6 m); a blow that never crosses his
  front is `skip`ped (slash4, 7, 8) and nothing chains into it; the second slash measured 0/5 and is out of `use`.
  `ring` and `maxReach` are recomputed after. The game's own aimed blow (`blowLands`, `aimK` 2.2) is the hit test:
  `palLands` (blade-through-capsule) was stricter than a held, slowed capture could pass.
- **ROOT MOTION** (`palRootMotion`): swings are played in place by the game; the captured man steps up to 1.8 m into a
  cut, so his feet slid. During a swing his root follows `clipTravelAt` (turned to his heading, never closer than
  body + 0.45 to you, `fortClampUnit`), and `lunge` is 0.15.
- **Heavy:** `h` 2.75, every slash `rate` 0.78, `speedK` 0.76. Measured on a still player: ~40 swings a minute.
- **The take:** spawns off to the farmer's SIDE (`|off| ≈ 1 rad` scores best) — square behind him the farmer stood in
  front of him the whole walk; the kill is `PAL_KILL` (`pS3`); the roar frames 3.4–3.8 m (2.2 was his breastplate).
- **The trail** is faint (×0.22) and fades within 2.6 m of the eye: an additive hilt-to-point sheet across the lens was
  half the picture white.
- **`kind.clipGated`** (in the pick): a swing with no clip, or `skip`, is not thrown.
- **ROUND 3 — HITS THAT CONNECT AND CAN BE READ (the owner: "make sure he feels good to fight and hits connect well
  and read visually like swordfighting").** The hit is HIS BLADE THROUGH YOU again (`palLands`, R 0.42, the blade's
  outer three quarters swept between frames), over the WHOLE CUT: `palContact`'s window opens 0.18 s before the
  point's fast part (never before the draw's apex) and closes three frames after it slows (≤ 0.8 s). Root motion is
  live through the draw and SIDEWAYS ONLY once the cut starts (he does not chase you through it). Measured with
  `tools/paltest.js`: `__palBout(25)` against a man standing still — 6 of 9 blows landed, ~22 swings a minute;
  `__palBout(30, true)`, stepping back 1.6 m as each blow came — 1 of 14. `__palCal` / `__palFair` per swing.
- **His timing was never applied**: `naturalSwings` + the measured windows ran on the creature tick, which is not run
  while he waits underground before the take (and on its first frame his clips were not in, so it set nothing and
  never ran again). They run at the end of `palContact` now (`u.palMeasured`).
- Live swings after measuring: slash 1, 2, 3, 6, 9 (4, 7, 8 cross nothing at a man's height: `skip`).

**THE PALADIN, ROUND 4 (2026-10-17): BAKED IN BLENDER, A REAL FIST, NO ENTRANCE.** The owner: "the paladin fight is
horrible take out the cutscene and just make him join the fight half way. his rig is bad it makes no sense. his moves
look horrible hes not even holding his sword. fingers arent even wrapped around the handle".
- **What was wrong, measured:** the moves file carried 22 bones (no fingers), so his hands were open; the blade was
  seated off one capture's (EEJANAI's) rest and played under TC and Mixamo clips too, so it sat at a different wrong
  angle in each pack. And the model's own sword seat is for a POSED hand — at rest the blade floats across his chest
  nowhere near the palm (rendered in Blender): no rest-relative seat was ever a grip.
- **`tools/paladin_pack.py`** now seats the sword itself: grip across the palm along the knuckles (pinky→index, tipped
  0.3 up the hand), in front of the palm by the grip's radius + 1.6 cm, flat parallel to the palm, the fist just under
  the guard (the guard is the widest section of the blade's profile along its PCA axis; a low-poly grip has vertices
  only at its rings — take the median of the non-zero bins). The blade has its own `Sword` bone (child of RightHand);
  `paladin_tip`/`paladin_hilt` ride it. It saves /tmp/paladin_pack/rest.blend; the maps are cached in /tmp/paladin_pack/tex.
- **`tools/paladin_bake.py`** (Blender) bakes every clip onto his own skeleton and exports assets/paladin.glb with the
  clips in it (NLA tracks → glTF animations by name) plus a small assets/paladin-moves.json ({dur, travel, hipY, mode}).
  World-space retarget off each source's own rest, put upright and turned to his facing (-Y): his bone takes the
  source bone's motion since ITS rest, applied to his bone laid along the source's rest direction (shortest turn);
  the hips and both hands are laid by whole FRAMES (pelvis up + across; hand along + across the knuckles).
  EEJANAI's hips are the armature OBJECT: its rest is its parent's frame with the identity local rotation (checked:
  upright, facing +Y). **The right hand follows the CAPTURED BLADE** (TC's `TonySword_01`, EEJANAI's `Sword` mesh):
  hand = capturedSwordFrame · hisSwordFrame⁻¹ · handRest, the flat's sign picked once per clip nearest the plain
  retarget. Checked every frame: his blade within 1.2° of the capture's. **The fist:** each finger joint turned about
  the grip's axis until its end lands on a cylinder of grip-radius + 1.6 cm (curling IN only), the thumb last, aimed
  over the index's middle joint. `--shots DIR` renders six frames of each clip and of the captured man beside it;
  `--only fist` renders the fist at rest. TRAP: the source sword's `matrix_world` has no facing turn in it — compare it
  against a hand position taken the same way, or the blade's point/pommel flips.
- **The set:** TC ready/walk/run; EEJANAI slashes 1, 2, 3, 4, 7 (5 is a 7 m dash, 6 a leaping spin, 8 a twitch, 9 a
  roll); Great Sword Pack strafes, 180 turn, impact (2) → pHit, impact (3) → pHitBig (impact, (4), (5) are held
  crouches), blocking (2), casting (the rage), both two-handed deaths. The TC string (pCut1–3, pSlam) turns ±170°
  between pieces and is gone with the entrance. Turns: gaits lose drift only; swings unwind their end turn over the
  back half; the turn and the deaths keep theirs. 2.44 MB with every clip (the old pair was 2.6).
- **In the game:** the loader already makes actions of a GLB's clips by name; `authorPaladinClips` no longer
  retargets — it sets `clipTravel`/`clipSpeed` from the moves file × the model's scale (× `PAL_TRAVEL_K` 0.8 for
  swings: a captured lunge scaled to a 2.75 m body covered three metres), then `palContact` as before. Swing `rate`
  0.78 → 0.90, `speedK` 0.85. `palRootMotion` lets 40 % of the forward step through once the cut starts (none of it
  slid his feet). Measured (`__palBout`): standing still 11/11 blows land; a 1.6 m step back still eats ~9 in 10 (he is
  a 2.75 m man with a 2.1 m blade); a 2.6 m retreat escapes 3 in 4. Block and parry are the answer, as in Sekiro.
- **No entrance:** `palMayCome` → `palJoin()`: the bell, a roar, and he is on open paving 9.5–14 m off with a clear
  line to you, to your side or behind rather than in your face, awake. `palStartCut`/`updatePalCut` are kept, unused.
- `ntar_moves.py -- paladin` now exits without writing (it would overwrite the new moves file in the old format);
  `tools/eej_convert.py` and the converted folder are no longer read.
- HARNESS TRAPS: `__palBoot` leaves him `holdAnim` (bind pose, no swings) and dev mode on (no attacks) — a still of a
  live swing needs `u.holdAnim = false; settings.devMode = false`. `__palBout(sec, dodge, far)` takes the retreat now.

**THE PALADIN, ROUND 5 (2026-10-17): BOTH HANDS ON THE HANDLE, A TWO-HANDER'S BLOWS.** The owner: "he holds the sword
too awkward … make him actually hold the sword on the handle"; then "hes holding too high on the handle".
- **Why it was awkward:** a long-handled two-hander in ONE fist, the other arm loose, and in the TC ready/walk/run the
  blade followed a captured curved sabre held out at his right side — his left hand could not have reached the grip
  (1.15–1.24 of his arm). The EEJANAI slashes are a fencer's, one-handed, out of a low side guard.
- **The set now (tools/paladin_bake.py):** guard, walk and run are the Great Sword Pack's idle / walk (2) / run, blade up
  in front in both hands; his blows are its slash → pS1, slash (3) → pS2, slash (4) → pS3, attack (the chop, dmg 2,
  `slam`) → pS4, high spin → pS6, jump attack → pS9 (minDist 3.2). They start and end in the guard he stands in, so
  every join is seamless. (The tavern orc uses the same captures — on a different body, in a different room.)
- **THE LEFT HAND IS PUT ON THE GRIP every frame:** a left fist made like the right (`make_fist(side, hilt, axis)` on a
  grip mirrored across his middle — the rig is symmetric to the millimetre), its seat on the blade the right one's
  mirrored (`seatL`, made proper again with a Z flip), placed `space` (palm width + 3 cm) down the grip from the right,
  and the arm solved two-bone to reach it with the capture's own elbow as the pole. Weighted by reach
  (1 under 0.98 of his arm, 0 over 1.12, eased per frame), so where a cut takes the blade past his left arm the hand
  comes off and goes back on. Logged per clip: "left hand on the grip: reach a..b".
- **Lower on the handle:** the right fist closes 8.2 cm (unscaled) under the guard, not 1.2 — `gripAt` in paladin_pack.
- Measured: standing still 4 of 6 blows land, a 1.6 m step back escapes 7 of 8 (`__palBout`), ~20 blows a minute.
- `gripshots()` in the bake renders the sword hand close at four moments of each clip (`--shots DIR`).

**HE NEVER CAME AFTER A CHECKPOINT (2026-10-17).** The bar was up and the man nowhere: `palMayCome` could fire while a
load was still putting you back (it only asked `frozen()`), and `palJoin` placed him off the spot you stood on before the
restore. It now waits on `restore`, `applyingSave` and `bootHold`, and `palUnitPre` puts him back on the street near you
(`palJoin(true)`, no bell) whenever he is out, alive and more than 30 m off or six under you in the castle.

**THE FARMERS' BLOWS CAN BE READ (2026-10-17, "they just shrug and you get hurt").** (1) They swing at the capture's own
speed (`naturalSwings`, which overwrites `wind`/`clipRate`), a jab in you 0.3 s after it starts: every `ax/hm/rk/fs`
move now has `natHold` (0.22, fists and rake 0.30) at `cockF` 0.55 — drawn back and HELD, then let go. Measured winds
0.8–1.2 s. (2) Out-of-turn swings (`frenzy`) and the pack's man sent to your back hit you from where you were not
looking: `farmInView(u)` (70° of your facing) now gates both `wantSwing` and `demonFrenzyOK` for farmers.

**ROUND 6 (2026-10-17): HIS BLOWS COME AT YOU; THE FARMERS HIT FROM BEHIND AGAIN.** The owner: "the farmers should
still hit you from behind just make their swings better and more readable/visible"; "the paladins hits dont even get
near me … he just swinging randomly and his sword doesnt even touch my player".
- `farmInView` is GONE (both gates): they swing from wherever they stand, as before. What they have instead is a TELL
  ON THE WEAPON — `farmTellTick` (from `updateFarmers`): a warm additive glint (`glowTex`, 0xffcf8a) on each man's weapon
  hand from the start of a swing to its release, one cloned sprite per farmer made on his first swing — with the held
  tops (`natHold`) it is up 0.8–1.2 s. Measured: made on the men who swung, two lit at once in a busy street.
- **`palTrack`** (from `updatePaladin`, after `palRootMotion`): through the draw he turns into you at up to 4.5 rad/s
  and closes or gives ground to `A.tipF × 0.95 − the clip's travel so far` (tipF is measured from where the swing began,
  with the travel in it — `palContact`), at ≤ 3.2 m/s in, 2.2 out, never inside body + 0.5. Once it commits (0.1 s
  before the window) he stops coming on but keeps turning into the cut at 2.4 rad/s (with the turn stopped at the
  commit, nine cuts in twelve went past a man walking round him). A blow begun with you further than the draw can close
  (tipF + max(1.2, wind × 2.6)) is called off in its first 0.2 s unless it is a gap-closer (`minDist`) — the
  "swinging randomly" was chains and picks thrown from 10 m.
- The cut's whole step goes through again (`palRootMotion`'s sideways-only block is out). `aimK` 2.2 → 1.2 (the body
  aims now; `grip` keeps the left hand on the handle under what arm steering is left). rate 0.9 → 1.0, recover × 0.7,
  press 0.95, sizeUp/circle 0.08, stepBack 1.6, turnMax 3.4.
- **`__palNear(sec, mode)`** (tools/paltest.js) — per blow, the closest the blade's outer three quarters came to your
  body's axis over its strike, and whether it hurt. Measured: still 5 of 6 land (blade 0.00–0.24 m off you); walking
  round him at 2 m/s 5 of 10; stepping back 1.6 m as each is drawn, most miss.
- HARNESS: the pane can stop giving the page frames while it is "displayed" (uTime frozen, `document.hidden` false) —
  `__palBoot` then reports `fight: false`; `__clockOn(); __adv(90)` starts it.

**ROUND 7 (2026-10-17): EVERY BLOW VISIBLY THROUGH YOU; THE HIGH SPIN OUT.** The owner: "make all his hits visually
connect to the player some of the spin moves are bad".
- **Why some never touched you (measured per blow, `__palEach(reps, mode)` — forced, three of each):** a captured cut
  meets an opponent the performer's size, so on a 2.75 m body the overheads come through 1.9–2.0 m up — at and over
  your head (your eye is 1.7) — and `palLands` counted steel up to 0.47 m over your eye within 0.42 m: pS3 and pS4
  "hit" with the blade never lower than your eye.
- **Now:** `palLands` counts only steel between knee (feet + 0.35) and crown (eye + 0.15), within 0.34 m of your axis;
  the arm aim pulls the blade down onto you (`aimK` back to 2.2, `aimDrop` 0.6, `aimFrom` 0.5 — `grip` keeps the left
  hand on); `palTrack` closes to `tipF × 0.88`. (`palContact`'s band stays on HIS scale, 0.6–2.4 m with the point
  under 2.9: 0.5–1.6 was tried and threw three of five blows out as never crossing his front.)
- Measured after, standing still and walking round him: every blow's steel passes 0–0.25 m off your axis and lands;
  stepping 1.6 m back as each is drawn, one of thirteen lands.
- `pS6` (the high spin) is out of `use` (its clip is still in the file); pS4 now chains to pS2.

**THE FARMERS, 2026-10-17 (later): NO GLINT; HITS YOU CAN SEE; THE EDGE LEADS.** The owner: "i dont need glints when
fighting the farmers i need there hits to look better and their weapons facing the right way. the hits do not connect
right." `farmTellTick` is gone.
- **Seen, not just counted.** tools/farmhits.js said every counted blow was within 8 cm of you — and a projection said
  the weapon's head was in the picture on 4 of 12: judged at your middle, a blow counts as the weapon goes UNDER the
  lens (you have no body on screen). Now `kind.hitFront` 0.30 judges it that far in front of you towards the man
  swinging (in `blowLands`), `kind.bodyLowArm` 0.85 counts a hand or weapon blow only from the upper chest up (kicks
  keep `bodyLow` 1.5), and `aimDrop` 0.25 → 0.05 aims them at your face. After: 17 of 18 blows land, median 0.15 m.
- **The edge leads the cut** (`farmRollMeasure`, `farmToolRoll`, from the top of `updateFarmers`). The tool is seated
  once at the stance and every swing is a borrowed capture whose wrist turns its own way: averaged over each blow's
  fast part, the face (`FARM_TOOLS[t].bT`) led the head's travel by 0.05 (the rake's thrust −0.78: tines backwards).
  Each swing's roll about the handle is measured ONCE on his own clip and seat at its contact (`A.hit`; along-handle
  thrusts skipped), and applied about the handle's line through the grip, eased in from wind − 0.35 and out through
  the recovery. After: 0.57 mean, every swing positive (0.15–0.96). (Following the head's travel frame by frame was
  tried first and locked onto the draw: −0.8 to −0.95 at contact.) `u.farmToolBase` / `u.farmGrip` keep the seat.
- `natHold` 0.30/0.22 → 0.16/0.12: frozen at the top of every swing.
- TRAP PAID AGAIN: a `//` comment appended inside a one-line `for … { …; …; }` commented out its `}` and took the page
  ("Unexpected end of input"). Put a comment AFTER the closing brace.

## The paladin's spawn, his bar, the late farmer, the farmers thinned (2026-10-18)
- **`palJoin` never in a wall or a house**: a spot is `farmCobble` (the paving, not a house's boards), `siteOnMain`
  (the walkable flood), a metre off any wall (`keepWallNear`), and seen down a line walked a metre at a time
  (`keepHitsWall` only checks the cells round a line's two ENDS — a 14 m "clear line" never saw the walls between).
  Fallback: the farthest passing point on `FARM_SPINE` near 12 m. `palUnitPre` re-places him after 2 s off the paving
  or the flood. Measured from 6 spine positions: every spawn on the street, none near a wall.
- **His bar is everyone's**: `palBarTick` no longer runs (he always had the over-head bar too). `ehpBlocked` now asks
  the fort's walls (`FORT_SITE`) — every bar there showed through walls.
- **The late farmer**: the forced send (`noDoorT`) counted only when nobody was out; now any failed send counts.
  `farmLostTick` runs at 4 Hz on `fortLineClear` (walked) and recalls after 12 s (16.8 with three or more out, was 24).
- **Thinned animation** (`farmMixThin`): a farmer not swinging, over 18 m off or behind you past 6 m, steps his mixer
  every third frame on the summed time. Not re-timed (the pane was throttled).

## Blows that arrive on screen (2026-10-18, "THE FARMERS HITS NEVER VISUALLY CONNECT … THE PALADINS SWORD DOESNT EVEN GET NEAR ME")
Every stand-off and hit test was built round the line UNDER the camera: at FOV 105 a blade at your body is off screen.
- **Paladin**: he stands at the crossing point `+ PAL_STAND` (−0.13; `A.vAdj` per swing, pS2 +0.25), and a blow is
  judged in a 0.40 ring `PAL_VIEW` (0.30) IN FRONT of your eye toward him, chest to brow, the blade point required in
  front of the eye (`palLands`; it stores `u.hitPt`). His cuts `rate` 1.18 and chained as strings (pS2→pS1→pS3→pS4,
  pS1→pS3, pS9→pS1; pS4 the finisher). Measured (`tools/probe.sh paladin`: every swing forced 3x, standing, facing him):
  15/15 land, the landed blade at ndc x −0.36…0.10, y −0.96…0.72 (on screen). Before: 0/15 inside the picture.
- **Farmers**: `stop` = head reach + 0.32 (was −0.06: the head arrived AT the lens); a blow is the tool's segment only
  (the forearm landed it before the head); the "benefit of the doubt" fallback is off for `hitFront` kinds. Measured
  (`tools/probe.sh farmers`, a 40 s natural fight): 17 hurt, all with a tool point; 12 in front on screen (x ±0.2,
  y −0.2…−0.7), 5 from behind (kept: "they should still hit you from behind").
- Headless harness: `tools/probe.sh <scenario>` with `tools/probes.js` (house, toilet, paladin, farmers, wave, bodies).

## The farmers' and the paladin's blows, given weight (2026-10-18, "the farmer and paladin fight is just bad")
Looked at frame by frame from the eye (`sh tools/probe.sh castleSheet` — a paladin cut then a farmer's blow, a still
every 4 frames; `farmSheet` for the farmers alone; stitch with any contact-sheet script).
- **The paladin's sheet was invisible**: 0.22 alpha and faded out inside 1.2–2.6 m, so on a whole cut that reached you
  not one still showed it. 0.45 now, thinned inside 1.8 m, gone at 0.8.
- **Farmers get the same streak** (`farmTrailTick`, `makeSwingTrail`, 12 samples): the outer half of the handle to the
  tool head (`u.bones.tip`), from 0.2 s before the blow to 0.08 after, fading from its tail. Not a glint (the owner did
  not want glints on them). Kicks (`A.limbs` ≥ 2) leave none.
- **The blow stops in you** (`u.st.impF`, 0.085 s, fortBody and paladin kinds): on a landed or guarded blow the man's
  swing clock runs at 6 % and his mixer too (`mutAnim`), then the follow-through — measured on a rake thrust, its clock
  held at 0.48 across eight frames. The paladin's 15 forced blows still all land on screen (`probe.sh paladin`).
- Seen and NOT fixed (needs new animation, not tuning): the paladin's pS1 holds the sword behind his back, turned away,
  for ~0.7 s of the draw; the farmers' borrowed captures throw the tool wide of the face before the aim brings it in.

## The two swordsmen of Castle XIII's west court (2026-10-19) — the flail knight out
The owner: "take out the mace knight in the second section of the castle and add both of these guys … avoid using
anything out of place for these characters because they have no shields … give each character … personality … make all
moves connect … make sure they actually hold their sword normally … make sure their textures blend in with the game".
- **Out**: the crusader is not parsed, not placed (`updateCrusader` no longer called; his code stays). `crusaderAlive()`
  (the throne door's bar) is now `knAlive()`: barred until BOTH are down. Stats count two kills where he was one.
- **Packer** `tools/swordknights_pack.py` (system python): `knight-man.glb` (sanyaork's, an Unreal mannequin: bone
  suffixes stripped so `MUT_KINDS.knight.rag` maps him; 44 maps/330 MB → 28 at 512–1024; metal/rough, specular,
  OCCLUSION (the MR map's red — a dangling `occlusionTexture` made GLTFLoader throw "reading 'extensions'") dropped;
  BLEND → MASK) and `knight-iron.glb` (PONCHIK's, a 20-bone rig renamed to `Character1_*`, his single spine bone as
  Spine2 so the whole torso turn lands on it). Both: the source pose animation and a stray `Icosphere` gone, tangents
  gone, the binary rebuilt with only drawn accessors. 7.3 + 1.8 MB.
- **Blending in**: the man's maps darkened (0.70 plate, 0.78 cloth), a third less saturated, warmed, grimed with low
  noise; the iron knight had NO colour map (flat 0.013 factors and a normal map) — his colour is MADE from his normal
  map (flat plate dark, recesses darker, raised edges worn light, grime). Lighting measured in the court (`probe.sh
  knLight`, 16 px at the chest against the paving before him): a flat emissive on a mapless material is a grey wash
  (iron 5 → 37 with 0.03!), so `matMore` zeroes the lift on parts with no map; man `emis` 0.17 / gamma 0.86 → 22 vs
  paving 24; iron `emis` 0.13 / gamma 0.92 off his new map.
- **The sword in the fist** (`knSeatSword`, the kind's `pre`): every skeleton `pose()`d to its bind first (node TRS is
  the artist's last pose); the iron knight's sword is a loose node that sits in his fist only in the bind — `attach`ed
  to `Character1_RightHand`; the man's is skinned to `hand_r`. `kn_tip`/`kn_hilt` are added as **Bones** (the rig's
  names are looked up among bones: an Object3D was never found) at the vertex farthest from the hand and the hand.
- **Clips** (`KN_CLIPS`): the pack minus the shield's — no blocks, crouch blocks, casts, `sHit` (its left arm shoves
  a shield), `sDraw` (the blade is already out), `sAtkD` (contact behind him), `sSlashB` (a 3.7 s jump-spin to a crouch).
- **The empty left hand** (`knFreeHand`): every clip carries the shield arm raised; after the mixer and the aim the left
  upper arm and forearm are aimed (in the model's frame, +z front, +x his left) to a swordsman's carry, 0.85 standing,
  0.45 in a blow, eased; per kind (`freeHand`: the iron knight's forearm further down).
- **Personalities** (tables `kmCut…kmKick`, `kiChop…kiKick`, each `clip`-aliased; `hit`/`cockF` MEASURED off each man's
  own blade by `tools/swordknights.js` `__knContact` — the frame the tip is fastest, the frame before it furthest away):
  the man fences (rate 1.1–1.2, holds 0.10–0.16, strings of three, `circle` 0.30, `feint` 0.25, `opening` 0.45, hp 34,
  light blows; lunge, leap, spin, kick); the iron knight walks you down (rate 0.92–1.0, holds 0.24–0.42, dmg 2,
  `chainMax` 1, `poise` 18, `opening` 0.9, hp 52; chop, sweep, low spin, charge, kick; roars at half health: `rage`).
- **Gap-closers were never thrown**: the draw runs only at reach, where every `minDist` swing is out of the hat.
  `kind.gapRate` (per second) throws one from the chase when the gap is inside its window — and the turn is taken from a
  holder who is not mid-blow (with two of them the near one held `mutToken` while circling: 11 frames in 1006 free).
- **Trail** (`knSwordTrail`, `makeSwingTrail`): outer half of the blade, 0.24 (iron `trailK` 0.15), thinned from 2.4 m
  and gone at 1.1 — at 0.42 inside 0.7–1.6 his 1.5 m blade drew a white sheet across the picture.
- **Measured** (`sh tools/probe.sh knFight`, 50 s, standing, healed): man 16 thrown 14 landed, iron 8/8, every landed
  blade on screen (ndc x ±0.2); `knKite` (backing off): lunges, leaps and charges thrown and landed. `knDeath`: both
  ragdoll, the door opens, saves carry `knMan@…`/`knIron@…` (retired on restore under ANY key: the court's dressing moves
  their posts). Not parsed at boot: load 10.5 s fresh / 5.6 s checkpoint (unchanged); musictest 5/5.
- Harness: `tools/swordknights.js` (`__knGo`, `__knStrip` in a studio scene via `__bw.knStudio`, `__knContact`), probes
  `knStrips`, `knClose`, `knFreeFront`, `knFight`, `knSheet`, `knKite`, `knMat`, `knLight`, `knDeath`, `glbTest`.

## The dark knight in the paladin's place (2026-10-19)
The owner: "the paladin is awful switch him with this knight but make him the same size roughly. give him all new sword
and shield moves we have and use the animations that come with this character … have the textures blend well. you should
walk in to him killing farmers too". Catholomew's "The Dark Knight - Infinity Blade" — **CC-BY-NC-4.0, not for a sale**.
- `tools/swordknights_pack.py dark` → `assets/dark-knight.glb` (3.5 MB): bone suffixes stripped (MF rig `b_MF_*`), his
  eight strings kept as `dkC0…dkC7` (animation samplers carried in the rebuilt binary), his map graded and LIFTED (`**0.72`
  after ×1.25 — at the first grade his chest read 1 against paving 17: a hole). In-game `emis` 0.30, gamma 0.82, rim 0.075:
  chest 12 vs paving 31 — the darkest thing on the street, readable.
- `MUT_KINDS.darkKnight` (h 2.7, hp 90, `block` 0.45 — he has a shield), `dkSeat`: sword ends off the vertices skinned
  to `b_MF_Weapon_R` (tip = farthest from the hand), `dk_shield` = the centre of `b_MF_Weapon_L`'s. `authorDkClips` lays
  the WHOLE Sword and Shield pack on him (blocks included: they fit him) but `sDraw`.
- **Contacts measured as a body would meet them** (`tools/probes.js dkContacts`/`dkPack`): every frame, the blade's
  nearest pass to a body 1.6/2.0/2.4 m in front of him at chest-to-eye height; the tip-SPEED peaks were useless on these
  (root motion and leaps). His strings land 1–2 times: `dkS0/1/2/7` one contact, `dkS3/5/6` two. `dkC4` reaches nobody: out.
  The long stands before the first blow sliced off (`kind.slice`: dkC0 from 0.9 s, dkC3 1.6, dkC6 3.6, dkC7 1.5).
- **`A.more` — a swing that lands several times**: extra contacts as clip fractions, put on the swing's clock by
  `naturalSwings` (`moreT`, linear before and after the contact — natural, no `natHold`), each its own guarded/parried
  window in the attack tick. General: any kind's natural swing may use it.
- **He takes the paladin's slot** (`paladin.unit` = `makeMutant(..., 'darkKnight')`, park spot → same save key every game;
  `paladinDone()` still gates the back door). Nothing of the paladin's runs on him: `updatePaladin` returns unless
  `kind.paladin`; `palReady` wants `pWalkT`, so `palJoin` never fires. The paladin's glb and moves json are no longer
  fetched (files kept).
- **The entrance** (`dkStage1`, `updateDarkKnight`): when the farmers' fight starts and he is ready, he is put on the
  street's own line (`FARM_SPINE`) ~10.5 m ahead of you, three idle farmers placed round him with `st.foe = him`
  (`farm.victim`, hp ≤ 3) and he on them — he cuts them down (measured: two in eight to twelve seconds). He turns on you
  (`dkTurn`) when they are dead, you come within 5 m, or you strike him; what the farmers took is given back. `palCalm`
  (leaving) still parks him; he is back on the street when you return, without the men already dead (`dk.done1`).
- Measured hands-off (`dkFight`, 45 s, still, healed): 18 swings — his strings and the pack's — 14 landed, all on screen.
- **DEV MODE STOPS A CREATURE SWINGING AT REACH** (`u.st.cool <= 0 && !settings.devMode`): `__palBoot` turns it on — a
  fight probe must turn it off after, or it measures only the gap-closers.

## The castles' frame cost (2026-10-19, "the castle lags very badly fix this in every section of it")
Measured (`tools/probes.js castlePerf`: 150 frames each, `gl.finish` so the GPU counts, info summed over the frame —
`renderer.info` resets per render): the first castle's street 465 draws / 1.12 M tris, Castle XIII's court 470 / 1.08 M.
- **Both castles drawn from inside either**: from 39 spots over XIII's whole court, 8 ways round each, the first castle
  and the sea change NO pixel (`castleVisC13`) → hidden while `inC13`. From the first castle's street XIII and the island
  DO show (14k px), but piece by piece (`castleVisMesh`) only XIII's outer chunks `acmat_4`–`9` and its flags, and part
  of the island: the rest (62 + 35 draws) are hidden for the one render from the first castle (`farMaskBegin/End`).
- **Skinned creatures were drawn everywhere** (their culling is off: a skinned box is the bind pose) — the court's two
  swordsmen through two castles' walls. `cullUnitModels`: a sphere round each creature's height and reach against the
  frustum, `u.model.visible` for the frame (nothing else reads it). The swordsmen are only shown in or within 50 m of XIII.
- **The man-at-arms was 118k triangles** — decimated in Blender (`tools/swordknights_decimate.py`, collapse 0.33 on
  meshes over 1200 faces, BEFORE the armature modifier) → 40k; packed 3.6 MB (was 7.3); same at game resolution.
- XIII's instanced dressing (lanterns, flags, goods, flowers, bunting) given bounds over all instances (+2 m) and culled.
- After: street 360 draws / 868k (median 3.4 → 2.7 ms here), XIII's court 296 / 584k (turned: 98 draws).

## Castle XIII's arch door: only the wood swings (2026-10-19)
The owner: "trim this door better it should just be the door that opens not concrete textures too". The leaves were cut
from two materials: `acmat_3` (the castle's STONE wall — it swung open with the door) and `acmat_1`, the door's map, which
paints the stone surround round the wood in one texture (upside down: the arch is at the bottom of the image). Now only
`acmat_1` is cut; the leaf wears `assets/c13-door-mask.png` (the wood's outline — straight sides, the round end — fitted
off the map by `tools/c13_door_mask.py`) as `alphaMap` + `alphaTest`, and a fixed copy (`c13ArchFrame*`) stays in the
wall wearing the inverse (`c13-door-frame-mask.png`): opened, the painted arch stays round an empty doorway.

## 2026-10-19 — the dark knight's throw; already at it as you come in

- **THE THROW** ("his hits should destroy the farmers and fling them pretty far"): `dkFling` sets `killFling` 1; in
  `mutRagdoll` `rFL` gives the throw (11 + 6·rFL)·(0.55 + 0.45·kw) out and 3.2 + rFL·(2.6 + 1.6h) up (cap 7.5),
  turned ¾ onto the street's line (`FARM_SPINE`, nearer way) — thrown every way from him, one hit a house wall 2 m
  off. Measured 7 m and no further, and it was not the throw: **`RAG_DAMP` 0.990 a substep is 84 % of a body's speed
  gone in one second of AIR**, and `RAG_FRICTION` 0.74 runs every iteration of every substep (36 a frame), so a body
  stopped dead where it first touched. A flung body (`r.slide` 1.8 s) gets 0.998 damping and friction 0.012 → 0.062
  over the window: `dkIntro` measures 12.9–13.0 m, the body skidding the last metre.
- **ALREADY THERE** ("i see them clip in when entering the castle"): `sh tools/probe.sh fortEntry` (an ordinary
  boot, outside the gate, the gate's own cut) — the knight and his three are staged and drawn at frame 28, under the
  black; nothing else appears but the farmers' door bursts (knock, roar, door smashed), off screen or 20 m up.
  Cold (`fortEntryCold`, half a second at the gate) the same: he is warm by then. A CHECKPOINT in the street
  (`fortEntryRestore`) staged him at 2.6 s with the black lifting at 3.1 — luck. `bootStageHold` (a `var` declared by
  `deathWait`, assigned beside `updateDarkKnight`) holds the load's black until he is out, at most
  `BOOT_HOLD_WARM_MAX`.

## 2026-10-19 (later) — the dark knight's feet, his leap, his trail, and the town on him

- **SKATE, MEASURED** (`tools/probes.js dkSkate`: the lower foot, when within 0.345 of the paving and not rising, and
  its speed over the ground). Causes found: `sRunB` in his runs is a run BACKWARDS (−2.34 m) — 9-11 m/s of skate;
  `velGaitAnim` played `anim.back` reversed, and his `sWalkB` already walks backwards (it now plays forwards when the
  clip's own travel is backwards — general, every velGait kind); his running strafes `sStr3/4` (2.9 m/s) at 0.7× under a
  1.8 m/s body; a gap between his walk's top (1.68) and his run's bottom (2.44) (`gaitBands`: run only at a run, else
  walk held to the walk's stride); every swing's 1 m lunge and `lungeLead` 0.30 closing; the chained step-in at
  2.4 m/s and the wind-up glide (`noSkate` — `planted` also gives up a swing thrown from beyond reach + 0.9, which
  killed the leap from range); `stepBack` 2.4. Now `velGait`, `gaitBands`, `smoothMove`, `noSkate`, `lungeMax` 2.0,
  `stepBack` 0.9, `turnMax` 2.8, lunges 0.45, `lungeLead` 0.18. Swings skating: his strings 17-45 % → 18-32 %;
  moving, matched clips at full weight 0.2-1.2 m/s (most of what is left is cross-fades).
- **THE LEAP** ("he slides towards you then hits you"): `dkLeapMeasure` — the clip jumped in place (feet 2.3 m up at
  0.33-1.0 s), landed into a crouch, and the 4 m lunge went on AFTER the landing, on his knees. `dkRootMotion`: the
  four pack blows that step (`dkLeap` sAtk 3.6 m, `dkLunge` sAtkC, `dkTurn` sAtkB, `dkSpin` sSlashD — `dkTravel`) take
  no lunge and walk the clip's own recorded step up to their last contact (`A.rm`), its forward part scaled to what
  is left to his stand-off (×0-1.6), its side halved, nothing after (their recoveries wander sideways). Measured: the
  4 m crossed between take-off and touchdown, then still through the crouch; the blow on the rise, 3 m from you.
- **THE TRAIL** ("a swing where i see no white air effect … cant block it"): it was drawn only round a swing's first
  contact, and his strings land two and three times (`A.more`): the later blades came out of nothing. `knSwordTrail`
  draws through every `moreT` window too. (Against a held guard for a minute — `dkBlock` — nothing got through: the
  blocking was always there; what was missing was the tell.)
- **THE TOWN ON HIM** ("make the farmers also attack the dark knight"): `dkTownFights` — once he has turned on you, up
  to two men out on the street go for him (`st.foe`), nearest him and furthest from you; he answers the nearest one
  hacking at him (< 4.5 m) while you are over 6 m off and have not cut him for 3 s, and throws him (`dkFling`); their
  blows wound him but not below 40 % (`mutLandBlow`). `dkTown`: 2 on him most of the time, 10 thrown in 40 s.

## 2026-10-19 (round 3) — the dark knight: his arm in its own swing, a tight blow, a steadier head

The owner: "only the swing down on the dark knights jump hit should hit not his sword after. make the dark knights
connectivity way more tight hes all over the place and his arm is moving weird on some swings".

- **THE LEAP'S ONE BLOW** is the chop as he lands: `dkLeapMeasure` now logs the tip — down through head and chest height
  2.7 m in front of him at 0.488 of the clip, just before his feet touch; 0.777 was the sword lifted out of the crouch.
  `hit` 0.488 (and `rm`, his travel, ends there); stand-off 2.6.
- **THE ARM** (`dkAimSweep*`, every swing at every stand-off, logging the most the aim bent his shoulder): at `aimK` 2.6
  it was 119° off the clip on nearly every blow — the arm "moving weird"; at 1.0 it sat on the 46° cap. And they
  hit anyway at nearly every stand-off: the BLOW TEST was loose (blade only, judged 0.55 in front of your eye, radius
  0.45 — a blade half a metre short scored). Now `aimK` 0.3 (≤ 14°), `aimFront`/`hitFront` 0.3, `limbR` 0.33 (on a
  farmer `foeLimbR` 0.6: the tight radius had his opening kills taking 19 s), and each swing's stand-off re-swept under
  it (`dkAimSweepK`): the one where its own blade lands nearest the middle of the picture. `dkLunge` (landing at
  alternate stand-offs, low) and `dkKick` (only from 1.4 m) are out of `use`. The pack's held tells shortened
  (`natHold` 0.22 → 0.12; the spin 0.16, the turn 0.10): an arm frozen in the cock read as a fault.
- **THE HEAD**: circle/step/feint/sizeUp to 0.03-0.04, `fidgetK` 0.05, `gapRate` 0.35; `dkTownFights` keeps whoever he
  picks three seconds and only turns from you when you are over 8 m off. `dkBehave` (40 s at 3/6/4.5/8 m): 77 %
  swinging, 21 swings a minute, 14 % side-stepping, 9 % closing, no flips between closing and backing off, 3.5 m kept.
- `dkFight`: 15 of 16 blows landed, all at x ±0.17, y −0.69…+0.19. `dkPoseSheet`: each swing from his side at
  three-quarter wind and contact, drawn in `knStudio` (his street is too dark to read a pose in).

## 2026-10-19 (round 4) — his blows land up close

The owner: "some of the dark nights hits don even land when he swings close to the player". `dkClose` (each swing at its
own stand-off, you at 1.2/1.6/2.0/2.4 m): 6 of 52 missed — he steps back through the wind (`stepBack` 0.9) and did not
always reach his stand-off, and only the blade's last segment was judged, 0.3 in front of your eye, so the end of the
blade went past you while his hilt and forearm went through you (`dkS0` from 1.2 and 1.6, `dkCut` from 1.2).
- `kind.closeBody`: when you are inside the swing's stand-off (by 0.2), the whole chain — shoulder, elbow, hand, blade —
  is tested against your UPPER body where you stand (eye + 0.15 down to eye − 0.85, radius `limbR` + 0.07), and only
  where it is in front of the lens (> 0.12 m ahead): the first cut of it scored hits through your legs and behind your
  head (ndc y −19), a blow you never see land.
- `kind.stopPick` 0.6: a swing is picked by how near its measured stand-off is to where you are (×0.15 floor, gaussian
  of 0.6 m) — up close he reaches for the cut (1.8), not the long strings (2.9).
- After: `dkClose` 48 of 52 (the four: the leap, only ever thrown from 4 m); `dkFightClose` (you at 1.6 m, his own
  choices) 14 of 16 thrown landed, all but one in the picture; `dkFight` at 3 m unchanged.

## The minotaur at the first castle's gate (2026-10-28)
The owner: "add this minotaur to the left of the very first castle door … 'You must be here to kill the king?' … 'Yes'
'No' … if yes … walk to the entrance of the castle and enter … if 'No' … attack the player … fight through the castle
with you up until you kill the two guys before the throne room door … slowly lay down and hold his stomach as blood
increases … breath heavy … 'I tried my best friend, I love you...' … slowly die … as tall as the dark knight … unique in
the way he fights and be strong … cannot be damaged by the player". Toni García Vilche's "Minotaur Low-Poly" (CC-BY-4.0),
`tools/minotaur_pack.py` → `assets/minotaur.glb` (3.9 MB). Code: `MINO_*`, `minoSeat`, `authorMinoClips`,
`minoAuthorOwn`, `MUT_KINDS.minotaur`, `MINO` (the story), `updateMinotaur`, `minoUnitPre`. Harness `tools/minotaur.js`
(`__mnGate`, `__mnStrip`, `__mnContact`); probes `minoRestore`, `minoFort`.
- **Where**: `minoPost` — 3.6 m to the sea side of the gate's outer face, 2.2 m out from it (world 6.4, −1154.55; his
  save key `minotaur@6.4,-1155.0` is off the gate's constants, not the mask search). He watches you come up the beach.
  Made when the fort is ready and you are within 420 m; `assets/minotaur.glb` at reach 980 + BEACH_EXT.
- **Stages** (`MINO.stage`, on the save as `mino: {s, at}`): wait → (yes) toGate → inside → with → down → dying → dead;
  (no, or your blade before you have spoken) hostile. `minoLeave` is the dialogue's `onLeave`; a No goes to a node that
  does not exist, so the box closes on it and he roars (`minoTurn`). Hostile, he goes back to his post whenever you are
  off the sand (`minoCalm`) and turns again within 14 m.
- **THE GATE'S DOORS DO NOT SWING**: walked straight in, he went through the shut planks. He stops at the outer face,
  the gate's groan plays from the gate (`sfxAt` + `sfxFortGate(1)`) and he fades out over 0.7 s (his cloned `u.mats`
  transparent, then put back).
- **WITH YOU**: every change of place (beach / fort / c13 / room) puts him behind your left shoulder on that place's
  floor (`minoJoin`); a room hides him. `minoFollow` walks/runs him there under the castles' own clamps; left behind
  (stuck 1.6 s, or 30 m off) he is put behind you again where you are not looking (`dkInView`). With a foe the creature
  AI runs him (`minoUnitPre` returns false); `minoPickFoe` (nearest to him, within 16 m of you, kept 2.5 s, never changed
  mid-blow) over `minoFoes` (farmers out of their doors, the dark knight, the two swordsmen). `minoDraws`: up to two
  farmers go for him, and one knight turns on him while he is close and you are not. `dkTownFights` answers him like a
  pesting farmer.
- **HIS BLOWS** (`mutLandBlow` → `minoLand`): a farmer is thrown down the street (`dkFling`); a knight or the dark knight
  takes ×4 (`MINO_UNIT_K`) but never below a sixth — THE KILL IS YOURS (the owner: "until you kill the two guys").
  Theirs on him stop at 35 % (`MINO_FLOOR`): he goes down at the end, not in the fight. On you (a no) a cut is one of
  your four and a heavy two (at three, a slam was the bar; measured, two blows killed you).
- **UNTOUCHABLE BY YOU** (`minoAlly`: `MINO.ally`): `hurtMutantCore` refuses a blow with no `from`, `bladeHitMutant`
  refuses, and the blade sweep, the aim sweep, the dig ray, a thrown thing, the revolver's trace, the double's wave and
  `nearestMutant` skip him — the blade passes through. He is also not "something awake near you" (saves, the far
  loading's pause, the music's `mutNearest`, `inCombat`, the token, `calmChasers`, the laughers) and has no enemy bar.
- **THE END**: on XIII's court, `knAlive()` false and his blow finished, 1.4 s later `minoGoDown`: `mnFall` (4.4 s: folds
  over with the left hand to the wound, knees, sits back, onto his back with his head up), both swords baked out of his
  skinned mesh into static meshes that fall and land (`minoDropSwords`, `sfxSwordDrop`), Ben's pool texture spreading
  from under his belly bone over 40 s (`minoPoolStep`, 0.3 → 3.3 m), and the owner's dying-man recording at 0.8× rate
  looped from where he lies, his chest and head driven by its envelope (`updateMinoBreath`, `minoBreathPose`).
  "Talk to the minotaur" (after 4 s) → his line at 70 ms a character, never ending on its own; closing it is
  `minoLetGo`: the last breath (the recording from 6.05 s), `mnDie` (5.2 s) and the lens held on his head
  (`cineHold`, fov 30) until he is still.
- **BEN'S POOL IS FOR THE DARK**: on XIII's torch-warm paving it read as a shadow (measured in a still). His is
  multiplied up (color 2.1, 0.9, 0.9) with a little more red emissive.
- **THE POSES ARE SOLVED, NOT GUESSED** (`MINO_LIE`, `MINO_DEAD`, `MINO_HOLD`): the guessed thighs drove his legs 0.96 m
  into the paving and the hand sat at his mouth. In the pane: hipY bisected so the lowest skinned vertex is 1.5 cm over
  the floor; the left hand searched (coordinate descent on armL/foreL) onto the front of his belly (0.2-0.5 cm), the
  right onto the stone (7 cm). Lying: top 0.99 m, head 0.66; dead: head 0.47.
- Measured: `minoFort` (street, hands off): 11 swings of 8 kinds in 40 s, farmers 20 → 13, the dark knight 90 → 63,
  1–2 farmers on him, his health 150 → 143. Court (pane): the man-at-arms 34 → 6 (his floor) in ten seconds.
  `minoRestore`: saved `{"s":"down"}` with the knights' keys; reloaded, lying at the spot, posed (hips 0.30 m), pool and
  both swords. Musictest 7/7.

## The gargoyles of XIII's east court, and the arch door they keep (2026-10-28)
The owner: "4 of these … grey statue textures as if they are gargoyles … hyper realistic … spread out in the section after
the farmers … sitting hanging off the walls semi high up but noticeable above the fog … make the door to the section with
the fountain be locked. once you try the door you hear the gargoyles drop down behind you … attack you and the minotaur …
semi hard to kill flying around fast biting and striking with their feet … unlocked once the gargoyles are dead"; then
"give them a block of stone they sit on matching the textures on the castle sticking out from the wall". Spinnee's "Flint
Maw" (CC-BY-4.0), `tools/gargoyle_pack.py` → `assets/gargoyle.glb` (1.7 MB). Code: `GARG*`, `gargFindPerches`,
`gargPlinths`, `placeGargoyles`, `gargTryDoor`, `gargUnitPre`, `gargLand`, `gargDied`/`gargDeadStep`, `updateGargoyles`;
harness `tools/minotaur.js` (`__ggBoot`, `__ggShots`); probe `gargFight`.
- **THE STONE IS MADE FROM THE NORMAL MAP** (the iron knight's way): cool limestone grey, folds darker by CURVATURE only —
  the first cut darkened by slope (`1 − n.z`) and came out zebra-striped: a normal map holds slope, not depth — ridges
  worn pale, the flesh map's detail kept as faint tone, mottle, pitting, grime in recesses, a little lichen.
- **ITS EMISSIVE MAP IS A BROWN WASH** with the eyes in it (median 0.10): lit at the waking strength (2.6) it glowed the
  whole stone body flesh-brown in flight. Packed eyes-only (over 0.30, ~1.2k px of 512²). `matMore` takes that map back
  (`dressMutant` puts every emissive on the colour map), dark while stone, lit as it wakes. Grey ×1.5, gamma 0.78, a
  cold rim: at ×1 they were small black shapes five metres up where the torches below do not reach.
- **ITS ONE CLIP IS ONE SLOW WINGBEAT** (8.4 s, off a wingtip): `gPerch` frame 0 (crouched, head out and down, the wings'
  elbows up over its shoulders, wings draped — already a gargoyle), `gWake` 0 → 2.4 s, `gBeat` the upstroke 2.0 ↔ 3.8
  played there and back (`pingClip`), sped up in flight. The head never moves in the file: bite (neck, head, jaw) and
  talons (body reared, legs forward, toes spread) are laid on after the mixer (`gargStrikePose`).
- **WHERE THEY SIT** (`gargFindPerches`, runtime, deterministic): open east-court cells within 14 m of your way in
  (spawn → arch), 16 rays out to a wall face 4.8 m up that is flat a metre either side, goes on 1.6 m higher, has open
  court 2.5/5/7.5 m in front of it (not an alley) and faces your path; the first nearest the arch, the rest farthest-point.
  Their save keys come off fixed spots (`C13_X − 60 − 2i`), not the perches.
- **THE PLINTHS** (`gargPlinths`): a slab with a drip-lip, two stepped courses and a strut tapering into the face, let
  0.15 m into the wall; XIII's own brick (`acmat_4`, the same material object) in world-metre planar UVs at its repeat
  (11.8 along, 23.4 up). The toes stand on the slab's middle: its toes are 0.83 m over its origin and 0.70 behind it in
  the perch (measured, `gargFootH`) — before, it hung a metre over the ledge.
- **THE DOOR**: the arch's "Open the door" is "The door is locked." while `gargLocked()`; trying it rattles it and wakes
  them nearest first, 0.35–0.7 s apart (stone crack, dust, a screech). All dead: the bar's knock, and it opens. Leaving
  XIII mid-fight puts the living back on their walls whole. On the save: `garg: 2` once they are all dead; a save with the
  arch open (from before them) has them retired. Dev mode opens the door like every locked door, and they never wake.
- **IN THE AIR** (`gargUnitPre`, the ground AI never runs them): wake → drop (an arc off the wall to behind their target)
  → circle (4–5.6 m out, 2–3.7 m up, its own clock) → dive (two at most) → strike (0.5 s hanging in front, the blow at
  0.24) → back → circle; struck → reel (a parry stuns longer and lower). Two go for you, two for the minotaur when he is
  with you. Your guard and parry answer them (`blockMutant`/`parryMutant`). hp 12 (your blows are 1–3). Death: back to
  stone in the air, falls, shatters on the paving into stone chips (`gibs`).
- **TWO DIVE FAULTS, MEASURED**: from the wall's side a dive was held off by the stone and struck air — now the stand-off
  point is taken on the OPEN side, and a dive that cannot arrive in 2.4 s pulls out; at a flat 11 m/s it overshot and
  circled its spot (38 % diving, 1 % striking) — now it brakes in (`min(11, 2.5 + 4d)`).
- **THE MINOTAUR AGAINST THINGS IN THE AIR**: his ground blade test never caught one (two took him to his floor in a
  minute). `kind.landFn` → `minoLandsOn`: on a gargoyle the blow lands if it is in front, within his stop + 1.3 and at a
  height he swings at; and as one dives at him he answers with his quickest cut (`minoCounter`, 75 %). His blows on one
  are ×2, not the castle's ×4, and he may kill it.
- Measured (`gargFight`, you 2.6 m out from the door on the EAST side — the passage runs from `arch.ax` along `u` into the
  east court; the first probe stood you in the fountain court and every dive met the wall): all four broken at 74.5 s,
  the door open, you answering every strike at reach; the minotaur 110 → 91 and both of his killed by him. Unanswered,
  they landed 3 blows on you in 10 s. Musictest 7/7.

## The gargoyles break (2026-10-28/29)
The owner: "give these random stone breaking effects on each kill of the gargoyles and have them break into pieces
matching the audio well … a very satisfying break smashing them into pieces with good physics"; then, of the first cut,
"i dont want bullshit claude peices make the model actualy break into its own parts".
- **THE SOUND**: his recording (9.1 s, six breaks) cut at its silences by `tools/stone_break_pack.py` into
  `assets/stone-break1..6.m4a` (110 KB in all), each from 10 ms before its first crack; the packer measures each one's
  `peak` (loudest 5 ms) and `subs` (later 6 dB rises: the debris going again) into `GARG_BREAKS`. One at random a kill,
  never the last one twice. `gargBreakSound` plays it from where it falls with an OFFSET (`playSampleAt` has none).
- **THE SMASH LANDS ON THE IMPACT**: the dead statue falls ballistically, so its landing time is known; the sound starts
  that far ahead of its peak (measured: break 5, peak 0.435, started 0.42 s before the landing) — the crackle in the air,
  the smash on the stone. Killed on the ground: straight into the peak.
- **ITS OWN PARTS, NOT CUT PIECES**: the first version cut the statue into Voronoi chunks with a rough lump inside each
  and threw stone chips and the sand's puffs — the owner rejected all of it. Now every triangle goes with the part its
  dominant bone belongs to (`gargPartOf`: head, jaw, chest, hips, upper arm / forearm / hand-with-fingers-and-membrane a
  wing, thigh / shin / foot a leg, the tail in three); on the stone it splits into its seven limbs and trunk
  (`GARG_LIMBS`), and on each `sub` beat the piece with the most joints left loses its outermost part (a wing's hand,
  then its forearm; a foot; the jaw; the tail's tip). Nothing added: the only extra is a dark unlit dust cloud
  (`gargDust` sprites — at 0.52 grey they glowed white in the torchlight).
- **PHYSICS** (`updateStoneBits`): gravity, spin integrated on a quaternion, the floor met at the piece's own lowest
  point turned with it (14 extreme points a piece), a hard landing bounces 0.26 and puts a twist in it from where it
  struck (r × J), a soft one slides to a stop; the court's walls throw it back; asleep when still for 0.6 s. All of one
  statue's pieces still → merged into one mesh a material (`gargMergeBits`).
- **COST**: baking the skin and cutting it on the LANDING frame was 23 ms; the pose is frozen at death, so `gargBake`
  runs on the death frame (in the statue's own frame) and the landing only transforms and throws: 9–13 ms and 10–18.
- Measured (`gargFight`): all four broken, the door open, no errors; a break's parts at rest in 3 s, the wings snapped at
  the wrist on the beats. Musictest 7/7.
## 2026-10-29 — the owner's playthrough of the minotaur and the gargoyles ("this is unplayable")
- **HIS BODY VANISHED WHEN YOU KILLED HIM (a no)**: `updateMinotaur`'s visibility asked `u.st.alive`; it now reads
  `(alive || stage === 'hostile')`, so the body lies where he fell.
- **HIS BLOWS ON YOU**: `aimDrop 0`, `aimFront 0.35`, `aimK 0.45`, a measured `STOP` per swing (`__mnContact`,
  `minoClose`): the slam lands mid-screen, the slash and sweep near eye level; the chop and kick (whose contact was at
  your shins) are out of his table. A cut is 1, a heavy 2 — two-hit kills before. Harder as a foe: `aggr 3.4`,
  `press 1.0`, `chainMax 3`, almost no circling/feinting.
- **HE AND THE DARK KNIGHT FIGHT**: they ignored each other. `minoFoes` lists the dark knight (+6 score in
  `minoPickFoe`); `dkTownFights` takes him as a pest within 5 m, and a dark knight he strikes turns on him.
- **"THE FARMER FIGHT IS A LAGGY MESS"**: measured (`fortPerf`) with him: median 6 ms, p99 17, nothing over 33 — the
  frames were fine; what read as lag was the camera shake of his throws and slams on every farmer. `dkFling` from him
  throws no impulse shake (0.06 trauma), `minoQuake` 0.2 only within 9 m. And `fade 0.32` between his clips.
- **STANDING WITH YOU** (`minoFollow`): he circled you. Now he holds 3.6–5.5 m off (hysteresis), turns to face you, and
  backs off with `oWalkB` if you walk into him under 2 m.
- **HIS FISTS**: a borrowed (Mixamo) clip has no fingers for him — his `F4` is the wrist — so every finger fell back to
  the file's rest, OPEN, 30–79° off his grip, and the hilts floated in open hands. `authorMinoClips` passes
  `ntarRetarget` a `keep` map of every finger (not `F4`) at his `mIdle`'s first frame (measured after: < 1° off it in
  every clip, rendered closed round the hafts).
- **HIS EYES** ("his eyeballs are just brown"): the visible eyeballs are two 74-vertex hemispheres each (upper, lower;
  both eyes share one mirrored UV layout, bottom left of the Base map) — NOT the cupped 32-vertex shells round them,
  which are the sockets (found by painting test colours on the live map in the pane: the first repaint went on the
  sockets and showed as a white rim round a black eye). `tools/minotaur_pack.py` rasterises the +x eye's normals into UV
  space and paints by angle to a gaze 0.55 out / 0.83 forward: sclera (dimmed toward the lids, a few thin veins), hazel
  iris with fibres and a limbal ring, pupil, a painted catchlight (the 0.85-rough eye has no specular); its normal-map
  texels go flat.
- **LYING DOWN** ("his arm is coming out his stomach … his body should not float … easier to talk to"): measured, the old
  `MINO_LIE` had his back 13–30 cm off the stone (propped on the right arm and his hooves), and the left upper arm ran
  THROUGH his torso so the fist came out of his belly; the fall's in-between keys sank his shins up to 40 cm into the
  floor. Re-solved with `tools/minolie.js` (coordinate descent; the arm-in-body test casts a ray straight up from each
  arm vertex through the rest of him — odd crossings = inside — valid because he lies on his back). Now: back 0.7 cm,
  pelvis 1.9, every vertex over the floor, the fist on the top of his belly; the fall never more than 3 cm under (two
  half-keys at their own height: his legs fold before his hips drop); the death keeps the fist on the wound (a hand
  sliding off was solved too — every path between two keys swung the arm up through him), and the breath's chest lift
  turns his right arm with it (it put the hand 9 cm into the paving). In the court (`minoDown` probe): chest and head
  within 1 cm of the paving under them. The talk box is a wide low one over his chest while he lies; from every side
  you can stand at 1.8 and 3 m, the prompt comes up (`__bw.hoveredS()` reads it).
- **NOTHING THROUGH WALLS**: `minoKeepOut` each frame he is with you: the step is legal only on a floor within half a
  step, inside the court's mask, not a blocked passage, `keepWallNear(0.55)` clear from knee to head and no
  `keepHitsWall` crossing at hip and chest height — else slid along the wall, else put back. The gargoyles fly a 1 m
  grid of the court (`gargGrid`, clearance 0.95 m from 1.6–4.6 m up), route by BFS to the furthest visible cell, and
  every step passes `gargLegal`; an illegal start (a perch, a knock) is allowed to step OUT.
- **THE GARGOYLES**: four new perches, all on the door region's walls, none over a window (picked by rendered
  thumbnails — the far-wall ones were reachable only through a low passage); immune to everything until the door is
  tried (`gargImmune`). Their fight is a cycle, one at a time on you (`gargTurnOf`): ring (circle out of reach) →
  approach → TELL (rear back, wings up, 0.5 s) → LUNGE (bite or feet, 9.5 m/s) → RECOVER (hang in front of you, the
  opening) → back off; a block or parry knocks it to `reel`. Measured (`gargFight`, a guard-and-answer player): all four
  broken in 53 s, 3 hurts on you, the minotaur 110 → 95. Their breaks' bits crumble and are removed after 3.5 s.
- **HE LOOKS DOWN AT YOU** (2026-10-29, "have the minotaurs head tilt down at you as he looks at you to talk or
  follow"): `minoHeadAt` after his clip is sampled — the neck a third, the head the rest, ≤ 0.9 rad off the clip, eased
  — aims his face at a hand under your eyes. His "face" is the stance's forward carried in the head's frame
  (`Head.userData.mnFront`, `minoSeat`); the painted irises measured within a degree of it. Measured, his face's pitch
  in his clips: idle −11…−15°, walk −8°, the borrowed walk-back/idle/run −6…+4° — level over your head. Called in the
  wait branch (within 12 m), the talk (`dialogOpen` at the gate) and `minoFollow` (within 14 m, his body turned to you);
  not in a fight and not lying. In the game at the gate and following: 0.0° off. TRAP: `q.slerpQuaternions(I, q, t)`
  with `q` as both target and argument copies the identity over it first — the turn was always nothing.
- **THE GARGOYLES' PERCHES, ON THE DRAWN STONE** (2026-10-29, "one is floating off the wall the other clipped through the
  wall"): two causes, both measured. (1) The perches were found off XIII's COLLISION walls, and on the door's side the
  drawn wall is elsewhere: a ray from a metre out hit the stone at 0.26 m for perch 0 (a tower's corner 0.74 m in front of
  the face, more stone 0.6 m beside) and 2.64 m for perch 1 (hanging 1.64 m off the wall), and the drawn face there runs
  8–11° off the collision one. Re-found by raycasting the castle's own meshes (every mesh of `c13World` but the corbels):
  flat to 2 cm over ±1.2 m × four metres of height, nothing within 1.5 m of the statue either side, nothing out in front
  or overhead, the face's OWN normal from the hit (`face.normal` → world). Only one stretch of the door-side wall passes
  that (x 31–35); perch 0 is on a 2.4 m face between two corners, its wings ±0.95 m, the corner 1.34 m off. (2) The far
  wall's two were never SEATED: `gargFootH` (the toes' offset in the perch pose) ran only from the unit's own tick, near
  it — until then they stood at the guessed offset, 0.7 m deeper and 0.22 m lower (56 cm of statue inside the stone) with
  their mixers blending four clips. `updateGargoyles` seats every one the moment its model is in. After: all four on the
  stone (rays 1.00 m), nearest vertex 15 cm off the wall.
- **THE LOCKED DOOR, WITH HIM** (2026-10-29, "when you go to open the locked door make the player spin around and enter
  dialog with the minotaur in the angle i provided … 'FUCK its locked...'"): `gargTryDoor` → `minoAtDoor` (him at your
  side in XIII, not mid-blow, within 16 m): a dialog on `MINO_DOOR_NPC` — the target his root raised to YOUR eye height
  less 5 cm (level), `fov 200` so the lens stays at yours (his screenshot: the whole of him, level, not the push-in), no
  head bone so it holds still; the dialogue camera's own slerp is the spin (measured: 148° round in 1.25 s, pitch −1°).
  He stops, plays his idle and turns to you through it (the talk branch of `updateMinotaur` now runs for `with` too).
  The line ends on its own (2.6 s) or a click, and its `onLeave` is `gargWake` — they come down then. Once a game
  (`GARG.told`); without him, the door wakes them at once as before. Probe `gargDoor`.
- **THE DOOR'S CONVERSATION** (2026-10-29, the owner's script, replacing the one line): "FUCK its locked..." → you: "You
  can probably break this door." → "I’m not some savage beast." → you: "You just killed 40 people?" (→ the polite-door
  line) or "Okay, let’s figure out another way" (→ "…smart one human.") → you: "I swear a gargoyle just dropped behind
  you." → "I DON’T HAVE TIME FOR GAMES! …" → (click) the box goes, the gargoyle rises and hangs over him, he turns round
  on it SLOWLY (0.25 → 0.8 rad/s, ~4.5 s for the half turn, his head on it) → "oh" → (click) the rest drop, the fight.
  All in `MINO_NPC.script` (`locked` … `oh`), the one conversation open throughout so the world is held; the scripted
  gargoyle is `gp.mode = 'script'` (immune, the AI skips it) driven by `gargSceneStep` from `updateGargoyles`, which
  runs while frozen. The DROP starts on entering either of his two middle lines (`enter`), 0.9 s in: the closest
  gargoyle to him cracks, falls 1.15 s in an arc and crouches on the paving 2.4 m behind him — OFF to one side of your
  line (`gargSceneSpot` tries ±0.85 rad first): dead behind him his body hid it (measured in the probe's still). Its
  eyes light as it cracks; it watches you over his shoulder. `gargWake` takes it straight into the fight from where it
  is ('ring'); clicked or Escaped through early, every path still ends in `gargWake`. Probe `gargDoor` clicks through
  the whole of it.
- **THE DOOR TALK'S LENS** (2026-10-29, "make the minotaur zoom … be normal like when you talk to him and have him stand a
  little closer … so you dont expect the gargoyle to drop"): `MINO_DOOR_NPC` is the gate's framing again (his head bone,
  `fov 34`), and `minoAtDoor` puts him 2.3 m from you along his line while he is still behind you (a legal floor, no
  stone crossed, `MINO.legal` moved with him). The drop happens out of that frame; the rise and his turn are in it.
- **THE GARGOYLES, ROUND THREE** (same day: "stop spinning there head … harder and more aggressive … flap their wings way
  faster … a smooth fight diving at you … i cant even register if they attack"). Measured causes: `gBeat` is 3.6 s of clip
  a beat (they flapped once every 3 s; now `GARG_BEAT` 5.4–8.6 = 1.5–2.4 beats/s); the strike poses bent Spine1/Spine3/Neck,
  which have NO track in the clip, so each frame's bend stacked on the last — the spin (`gargRest` puts `GARG_FREE` back
  to rest after the mixer, before the pose: measured after, never more than 0.35 rad off rest); its head is 1.85 m and
  its toes 0.75 m over its origin in flight (`GARG_HEAD`/`GARG_TOE`), so the bite now arrives at your eyes and the claws
  at your chest. The attack is a dive: approach to 4.2 m out with its head 1.25 m over yours → `tell` 0.55 s (rears back
  and up, wings HELD at the top of the beat, jaw open, eyes ×2.3, a screech every time) → `lunge` on `gGlide` at 12.5 m/s
  → the blow (`gargLand`: your hit also shakes the view 0.22 and it screams) → `recover` is a pull-up past you on hard
  beats → `back`. `gargBodyMotion`: banks into turns and drift, noses down with speed, the body heaves on its beats (on
  the model). Two on you at once when three or more are left, the second only once the first is diving (`gargTurnOf`).
  hp 12 → 16. Measured (`gargFight`): 16 of their blows landed in 74 s on the probe's player, all four broken.
- **THE KNIGHTS BEFORE THE THRONE ROOM, ROUND TWO** ("actually hard and a good fight … smarter and have different
  personalities. make sure one fights the minotaur first as well unless engaged with"). THE DUELIST (`knMan`): hp 48,
  chains of four, feints, circles, sidesteps your charge on his strafe (`dodgeClip`), small openings, and a second wind
  at 40% (`rageAt`) — faster and closer. THE JUGGERNAUT (`knIron`): hp 72, poise 28, never backs out of your charge
  (`reactK: 0`, new — the react's chance is scaled by it), short stuns, a berserk second wind at half. In `minoDraws`
  one of them is ON the minotaur from the moment they wake (the iron one, or the other if you are on the iron) and
  stays on him; the one you strike is yours for good (`knYours`), and the minotaur picks the one on him first (+8).
  Measured (`knDuel`, a probe player striking light blows between theirs, never blocking): the iron knight on him at
  0.3 s for 57 s, taken by him from 72 to his floor of 12 while he lost 38; the duelist 55 s to kill and landed 30 on a
  player who never blocked. TRAP: dev mode stops every creature starting a swing (`!settings.devMode` in the tick) — a
  fight probe in dev mode measures nothing; turn it off and `heal()` each frame.
- **HIS DEATH SONG AND A SLOWER FALL** (2026-10-29, the owner: "when the minotaur falls too his knees make this play.
  have him fall slowly and natural … dont loop it"; then "dont actually stretch the song"; then "just have it play when
  you notice him dying and if you do the dialog it still plays through"). `assets/minotaur-death.m4a` (his MP3, 13.5 s of
  music + 3 s of silence → 14.6 s, AAC 160k, 288 KB, NOT time-stretched). `startMinoSong` is the end song's pattern: its
  own gain to the output (`minoSongVol`, `MINO_SONG_LEVEL` 3.2 capped at 1 — the file is ~6 dB louder than the end
  song's piece), in `musicGuard`, `musicNote('minotaur song')`, played once. It starts in `minoDownStep` on the FIRST frame
  his head is on your screen (projected inside ±0.85/±0.9 of the view, within 40 m) while he is down or dying — only if
  `MINO.songDue`, which only `minoGoDown` sets, so a restore into his lying there never plays it; a conversation does
  nothing to it. Preloaded (`lazyBuf`) while he is at your side in XIII. Musictest scenario `mino` (into XIII with
  `__ggBoot`, which SUSPENDS the context — resume it after — him down, looked at): PASS. The fall is 9.8 s now:
  folded over the wound (1.1), a sway (1.8), down onto his knees (3.5), held there head hanging to 5.3, sat back (7.2),
  over (8.4), lying (9.8) — the floor-fitted keys spaced out plus two holds that bend only chest and head (the sway's
  hips at −0.04 sank him 4.5 cm: 0.005 now; the whole fall within 3 cm of the floor). Swords leave his hands at 3.3 s,
  as his knees land; the talk prompt waits for the fall to finish.
- **ROUND FOUR (2026-10-29)** — the owner's list after playing:
  - **The door scene's end**: no "oh". He turns round slowly on it (its body, not over its head — "looking up too much":
    look target its origin + 1.0, the hover lower and further back, 1.7 m up and 2.2 m behind him), holds 0.7 s, then a
    double take (`S.stage` 'back': his head led round to you, smoothed at 10/s, his shoulders after at 1.7 rad/s), a
    second of eye contact once he is within 1 rad of you, round again onto it, and the conversation ends itself
    (`endDialog` → `gargWake`).
  - **His step back** ("he looks scared of me"): the orc's guarded walk-back is out; backing off you he walks his own
    `mWalk` backwards, 0.45–0.6 m/s, from under 1.8 m out to 2.6.
  - **Gargoyles break in the air**: `gargDied` bakes and sets `airBreak`; the next frame `gargShatter(u, true)` throws
    the parts from where it was struck, off the line of the killing blow (0.8 of a 4.5 m/s push carried, limbs ×1.35),
    the smash of its recording on that instant.
  - **Their moveset** (Elden Ring's birds, the owner): three moves, each its own tell and cue. TALON DIVE — up and out,
    rears back with its feet drawn up (`GARG_DRAWN`), wings held at the top, screech; dives with both feet thrust out
    (`GARG_THRUST`), rakes them on through and back (`GARG_SWEPT`) as it pulls up past you. RAKE — hovers in to a stride,
    feet cocked (`GARG_COCK`), hiss of beats; a left kick then a right (`GARG_KICK`, 0.2 s each, eased out), each its own
    hit; its kicks keep their own clock (`g.rk`) that only runs once it is within 1.5 m (the first was thrown from 2 m).
    DELAYED BITE — reared and swaying 0.95 s, then a snap. Legs: [thigh, knee] ×2 about the body's left-right, MEASURED in
    the studio (thigh negative = forward, knee negative = straightened ahead, positive = folded up under); they have
    tracks, so they are laid on after the mixer each frame (eased). `gargClawTrails`: the swords' white streak on each
    striking foot, ankle to 2.4× past its toe. Hits judged by `gargStrikes` (toe or head within 1.05 m of you, or the body
    within 1.7 in front of you): measured, the talons reach no further forward than the body, so the dive stands in to
    0.9 m and the rake to 1.0 — before that 9 of 28 reached; after, 24 of 24. hp 20.
  - **Blows between creatures in the street** (`townHits`: every swing the minotaur and the dark knight throw at a man,
    at its contact): 19/21 and 10/14 at first, the dark knight's every miss on the minotaur. Fixed in the creature tick:
    the blade test counts the target's BODY (`lr += body*0.8 − 0.25` on a creature), the stand-off adds its body, a LEAP
    is not held to the stride's cap (9 m/s), a creature on a creature starts its closing 0.42 s out at up to 3.4 m/s, the
    step-back through a wind-up is for blows at YOU only, and a creature on a creature lets go of a swing in its wind-up
    (to 0.7 of it) when its man is dead, thrown, switched, off its line (< 0.55 in front) or further than its closing can
    reach — including the next blow of a string (his first blow THROWS a farmer). The minotaur does not take a man the
    dark knight is mid-swing at. Root-motion swings (`dkRootMotion`) stop at the body too, a leap stretching to 2.4×.
    After: 25/25 and 22/22.
  - **Lying**: his breath's rest pose (`MINO.base`) is read from `mnFall`'s last frame (`minoClipEnd`) — read off the live
    bones it held a stray 0.46 rad in the neck (and the chest, which carries the arms): the back of his head was 14 cm
    into the paving. Now 5.5 cm over it. A finished clip is NOT re-applied by `mixer.update(0)` (it is not running): a
    "clip alone" check that way measures nothing. The swords are thrown 1.7 m/s out to his sides (one landed on his leg).
  - **Myles**: his name on the card; dying, "I thought I could push through" (click on) then "I tried my best friend, I
    love you..."; his head turns to your face while you speak to him and through his dying (0.6 rad, he is on his back),
    eased off after. His breath while he lies is slower and quieter (rate 0.64, level 0.24, the chest's heave halved).
  - **His song** is the owner's longer file (55.8 s, whole), faded in over 3.5 s and out over 5 as he dies
    (`minoSongFade` on 'dead').
  - **Through the arch** (`minoViaArch`): on the other side of the open door from you he walks to its mouth on his side,
    then along the passage and out (measured, `minoArch`: from 4 m off its line he stuck at the wall beside it).
  - **The two knights guard the throne room's door**: 3 m out in front of it, 1.8 either side, facing out across the
    court (`guardOK` asks a 1.1 m clear circle, not the court's 2.6).
