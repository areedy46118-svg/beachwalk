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
