# Beach Walk

A first-person horror walking sim: an eerie shoreline at night that runs
until you reach the lighthouse at the end.

## Run it

ES modules need HTTP (opening `index.html` as `file://` won't work).

```bash
python3 serve.py 4173
```

Then open <http://localhost:4173> and click to begin. Any static server works
(`npx serve`, VS Code Live Server, …) — `serve.py` is just dependency-free.

## Controls

| Input | Action |
|-------|--------|
| `W` `A` `S` `D` | Walk |
| `Shift` | Run (≈5 s of stamina) |
| `8` | Toggle the walk-speed setting between 14x and 1.4x — it drives the slider in the menu, and never persists |
| `Space` | Jump &mdash; a directional step while a fight is live |
| Mouse | Look (pointer lock; drag-to-look fallback if it's blocked) |
| Click / `E` / `F` | Grab a physics object · take an item · dig (with the shovel) |
| Click (while carrying) | Throw the held object — it's a toggle, no hold |
| Hold right-click | Guard with the shovel, held across you. Raise it INTO a blow to parry and stun — then hit it, because a blow on a parried enemy counts double. No swing comes out of a guard |
| `Ctrl` | Crouch (toggle) — crawl under the pier |
| `G` | Drop the held object gently |
| `1`–`6` / click a slot | Hold an inventory item — everything can be carried |
| Scroll wheel | Step through the hotbar, equipping as you go |
| `Tab` | The pack. Click an item to select it, then **Inspect** or **Hold** in the pane (double-click inspects). Drag to reorder, drop one item on another to combine. `Tab` or `Esc` leaves |
| Hold left-click | Wind up a heavy swing; release to land it |
| Hold right-click (examine view) | Turn the item over |
| Left-click / scroll (examine view) | Put it away / zoom in |
| `Q` | Holster the equipped tool · close the examine view |
| `Esc` | Pause / settings menu (and close the note / examine view) |

## World layout

You walk **down the beach along -Z toward the low moon**. The **ocean is to
your left** (-X); the **dry beach (+X)** ends in an eroded **sand cliff** you
can't climb — and beyond it the faint lights and rooftops of a **city just
out of reach**. Far down the shore a **lighthouse** turns; reaching it ends
the game.

The sand, ocean, wrack line, cliff and city are large tiling fields that
recentre on the player each frame (snapped to their period), so the walk is
endless; the lighthouse is a fixed landmark at `LH_Z` (≈ 1.2 km away).

## What's in it

- **Title & opening** — the title card is just **BEACHWALK** + the controls.
  Clicking begin cuts *straight* to black (no glimpse of the world), the
  opening line fades in and out, then the world fades up. `INTRO_LINE` /
  the timings in `beginGame()`.
- **Opening music** — `assets/backrooms.m4a` swells in over ~7 s once the
  world appears, holds, then fades back out (~30 s total). Routed through a
  Web Audio gain chain so the volume slider still works. `MUSIC_*` consts.
- **PS1 / low-poly-horror presentation** — the scene renders at
  `RETRO_SCALE` (~42 %) of the window and is blown back up with
  `image-rendering: pixelated`, so you get chunky pixels and crawling
  edges. Textures are 256², nearest-filtered with no anisotropy and
  quantised to a coarse palette; everything is flat-shaded.
- **Settings menu** (`Esc`) — FOV (60–120), mouse sensitivity, brightness,
  volume, invert-Y. Persisted to `localStorage`.
- **Run + stamina** — hold `Shift` to sprint; `RUN_SECONDS` (≈5 s) of stamina
  drains, then you're winded until it recovers. A thin bar shows near the
  crosshair. `RUN_SPEED` is only ~40 % above the walk.
- **Jump** — `Space`, a short hop with real vertical physics. In a fight the
  same key is a directional step instead; see **The step** below.
- **Physics objects** — driftwood, a pail, a glass float, a stone, a can.
  Click to grab & carry (HL2 / Amnesia style), click again to throw, `G` to
  drop. A tiny custom rigid-body sim (gravity, ground bounce/friction, walls).
- **Inventory + equipping** — a vertical hotbar on the **left** that appears
  once you pick something up. Items either **use** (the bottle → reads the
  note, `NOTE_TEXT`; the crab → examine view; the syringe → examine, or draw
  blood if you also carry the crab) or **equip** (the shovel).
- **The horseshoe crab** — a detailed smooth-shaded *Limulus* stranded in the
  wrack line (`models/horseshoe-crab.js`): a broad rounded head shield with the
  cardiac + ophthalmic ridges and raised margin sculpted in, a wavy hinge,
  movable spines, a triangular telson, and a complete underside — six leg
  pairs, chelicerae, operculum, book gills. Take it, then **use** it to open
  the **examine view**: the object floats in the dark, **drag to turn it over**
  and look underneath, scroll to zoom, `Esc`/`Q` to put it away. The view is
  its own scene rendered over everything (`openInspect()` / `inspectScene`).
- **The bleeding syringe** — a glass hypodermic further down the beach
  (`models/syringe.js`): barrel with graduations, a slim plunger, luer hub,
  needle, orange cap, blue haemolymph column. Carry it **and** the crab, then
  **use** either one: the needle goes into the hinge, the plunger draws back
  and the barrel fills (`startExtraction()`). The **crab is spent and leaves
  your pack**; the blood is never an item either — it runs straight into the
  **tally in the top-left corner** (the jar model from `models/blood-jar.js`,
  turning on the spot beside a mL count).
- **The children's sand shovel** — the first item down the beach, stuck in a
  **sand castle**: bucket-molded stacked towers with crenellations, a curtain
  wall with a collapsed section and rubble, drip-castle blobs, shells pressed
  into the walls, a scratched moat and the spoil pile from digging it. Take
  the shovel and it auto-equips: a first-person **bare hand and forearm**,
  fist closed around the shaft (aspect-aware so it stays framed at any window
  shape), and **click digs wherever the crosshair is pointing** — a layered
  synth *shff → crunch → grain-spray* sound, a detailed crater (irregular
  pit, dark undercut bowl, shovel gouges, scattered clods) with a real 3D
  sunk cone + spoil mound, and a burst of tumbling low-poly sand chunks.
- **The Military Shovel is in a case** — an olive equipment case on the desk
  in the bunker, stencilled E-TOOL, that reads LOCKED until the Blue Blood
  Dealer is dead and opens on `E` after. The shovel lies in its foam. It is
  the prize for the first boss: there is no other way to it.
- **The heavy swing** — hold the **right button** and the shovel hauls back
  and keeps straining; let go and it drops from exactly where your hands were,
  with no re-wind and nothing to snap through. Release to blade moving is one
  frame, and the drop is about 130 ms of accelerating arc against the 370 ms
  a left click takes from rest. A heavy also reaches **6.6 m to a click's
  4.2 m**, so there are angles you can only land wound up, and it throws more
  sand, shakes the camera harder and kills the crab from further out. The
  shaft creaks when the charge tops out, and the blade leaves a **trail** —
  a thin streak off the cutting edge that brightens with how hard you swung.
- **Glass floats break** — three of them along the walk, and a hard throw
  shatters one into shards that bounce and settle. A drop from your hand does
  not; breaking one is always something you chose.
- **The Very Old Fisherman** — sitting on a blue fish tub in the dock house,
  beside the table. The only other person on the walk, and he is not pleased
  to see you — and you cannot hail him through a shut door. His cut-out is
  `assets/fisherman.png`, made from the photograph with `tools/cutout.swift`.
- **The dock house** — sixty metres past the wreck, a pier on piles standing
  out from the cliff foot into the surf, with a shed on the boards, a lamp lit
  on the post at the sea end, and a boat tied up under it. The beach has
  drifted up against its land end, and a short flight of timber steps takes
  you the last of the way onto the boards. The
  pier is solid — you cannot walk in under it. Its sea end and the last
  stretch of its sides hold you out of the surf; over the beach the sides are
  open, so step off onto the sand and carry on. Boards knock underfoot. The
  shed door opens with `E`. The crate
  by the lamp post breaks the way the one under Bradly does, and holds
  **A Rusted Key** — a scanned medieval key — that, for now, opens nothing.
- **The shells** are scans now. Take one and it goes straight into your hand;
  click to hold it to your ear, and the hand rises to the side of your head
  while you listen. Under the roar there is something that isn't the sea. Put
  the shell down and it goes silent at once.
- **Throw anything at anything.** A thrown prop splashes going into the sea,
  lands on the pier's boards instead of dropping through them, bounces off
  rock and timber with a sound that matches what it hit, and will kill the
  crab outright.
- **Crouch (`Ctrl`) to get under the pier.** Nothing solid can be walked
  through: the piles, the light post and the boat are all real, and you can
  stand on the boat and step off it.
- **Walk speed always starts at 1.4×.** The slider in the menu is for the
  session you are in; it is not remembered.
- **The crate below Bradly** — washed up at the cliff foot, and the first lock
  in the game. A left click thuds off the boards. Only a wound-up heavy (about
  two-thirds of a full charge) puts the blade through the lid.
- **The Octopus Ring** — in the crate: a scanned ring, an octopus with its
  arms curled round to make the band, gone to rust — the metal is a real rust
  texture projected onto the scan. Take it, examine it, and press `E` to put it on — it leaves
  the pack for a new **Rings** section, two slots under the hotbar that appear
  the first time a ring is in your hands. Click a worn ring to take it off.
- **The crab telegraphs** — it no longer nips the instant it reaches you. It
  rears with its claws thrown wide and its pincers gaping for 18 frames while
  a rasp climbs under it, strikes for 6, and is then wide open for 20. The
  reach is re-checked on the frame the claw closes, so backing off during the
  wind-up actually works, and the recovery is your opening to swing back.
- **The kill lands in two beats** — the blade connects, time stops for five
  frames with the crab still there, folded up under the shovel and thrown
  back, and *then* it comes apart.
- **The three mutants** — hunched, flayed things standing on the dry sand a
  hundred and thirty metres past the pavilion. Cross the line and they are a
  **cutscene**: they roar where they stand and then all three come at you flat
  out, the lens punching from wide to tight in half a second and holding there
  while they grow to fill the frame — and it is dropped mid-stride, so the
  frame you get your hands back on is the frame they are ten metres out and
  still running.
  They are three different animals, and they do not move alike: each has its
  own run, idle, roar and death out of the pack, and the two that share a run
  cycle play it at half again the rate and thirty degrees more bent over.
  **The pale one** is the fight you learn the language on: five hit points,
  all four swings. **The flayed red one** is half a metre taller, seven hit
  points, and **hits for two** — you have three — with no quick swipe;
  everything it does is committed and everything it does leaves it open for a
  long time. **The dark one** is small, fast, four hit points, mostly the
  swipe, and the only one that chains three swings together; it is the one
  that gets behind you while you are reading one of the others. Each has its
  own voice, a pitch and a weight, so you can tell from across the sand which
  of them is winding up, and its own build — the red one's skull flaps are
  thrown a third wider and its arms are thick, the dark one has a small tight
  head on forearms and shins a third too long.
- **You cannot walk away from them.** They close through their own wind-ups,
  they break off circling the moment you open the range, anything left more
  than eight metres behind rejoins at a sprint, and a gap you open by running
  is crossed by a dash at eight metres a second that ends in a swing. And
  whichever of them is at the back throws sand: it leads the throw and misses
  if you move, and what it takes is your WIND, not your health — so backing
  off to breathe is the one thing it stops.
- **A parry is worth landing.** A blow on one you have just parried counts
  double, which takes half of the big one off in a swing. They feint, too:
  the startup goes up, gets most of the way through, and nothing comes — so
  the tell has to be read off the arm and not off a count.
  **Only one of them swings at a time**, and the turn goes to whichever has
  gone longest without one. Three tells at once is not three times the fight,
  it is no fight at all — there is nothing to read. So what you are answering
  is always one creature, and the pressure is where the other two have got to.
  A light swing takes one hit point and a charged one takes two. Their swings
  are the crab's grammar played
  bigger — and it has FOUR of them: the overhand you learn on, a quick swipe
  for standing in reach with the guard down, a held one that hangs at the top
  for a second so a guard raised on the first count is a block and not a
  parry, and a lunge that covers ground through the strike. A swipe chains
  into the overhand more often than not. Between swings it circles you or
  steps back before the lunge, on a drawn rhythm rather than a fixed one, and
  a plain click into the last part of a committed startup takes its point of
  health without stopping the blow. Every swing still has a startup you can
  see and one frame it lands on: guard it, or raise the guard INTO it to
  parry, which leaves it doubled over and helpless for two seconds. It does
  not come apart when it dies; it goes down and stays down.
- **The thing in front of the lighthouse** — a two-and-a-half-metre creature
  sitting on the lane with its back to you and its face in its hands, at the
  end of the walk. Nothing happens until you LOOK AT IT: put it near the
  middle of the screen inside thirty metres and it is up and screaming, and
  from then on it does not stop and cannot be outrun. It fights in the
  language the Dealer taught — a startup you can read, a frame the blow
  lands on, a guard that stops it, a parry that opens it, poise that takes a
  flurry to break. Four swings, every one of them telegraphed for at least
  a third of a second of visible approach against a fifth-of-a-second parry
  window, and every one aimed at your chest so it can be timed; the claw
  arrives inside 0.15 m of you at any range from 1.6 m to 3.4.
  - **The pounce** is the one you are afraid of: he stops dead, rears with
    both arms over his head for a second and a bit, and then leaves the
    ground and crosses two and a half metres to land on you for half your
    health. It is what the closing sprint finishes with and the first thing
    he throws after the scream, and it costs most of your guard to hold off.
  - **Half his health and he screams again**, and the second fight is not
    the first one: he stops breathing between swings, chains four deep,
    feints one startup in three and pounces twice as often. His tells do not
    change — those are what keep him fair.
  - Thirty-four health, and blocking is not free: hold the guard through a
    minute of him and eight gets through in the first phase and twenty in
    the second.
- **The wreck's wheel** — one star out over the water blinks. Take the wheel,
  drag her toward it and hold her there, and the captain's head comes off
  the davit hook and drops through the hatch into the hold. The key is
  clenched sideways across his teeth, so you can see it is a key before you
  ever pick him up. Take him, open him in the examine screen — from the pack
  or from your hand, either works — and pull the key out of his mouth; it
  unlocks the shell door low in her far side, which is the only way off her.
  Her whole deck walks: a clear lane down each waist between the wheelhouse
  and the bulwark, round her bow and out onto the afterdeck, with her gear
  stowed forward of the stair and aft of the house. A door you opened stays
  open across a checkpoint.
- **Footprints** — pre-stamped trail behind spawn, new prints as you go
  (toe pointing the right way), footstep sound; oldest recycle.
- **The sand cliff** — a lofted eroded escarpment, scalloped lip, vertical
  runnels, talus at its foot; periodic erosion so it tiles seamlessly.
- **The wrack line** — kelp clumps and ribbons, scallop and spiral shells,
  water-worn pebbles, planks and gnarled branches, bleached plastic scraps —
  all confined to the high-tide band and tiled down the beach.
- **The city** — pushed far back and heavily fogged so you can only just make
  out rooflines and a scattering of lit windows, under a faint sodium
  light-pollution wash that lifts over the cliff ridge.
- **The lighthouse** — a whitewashed conical tower with a black lantern, the
  brightest thing on the headland. Inside, a round brick shaft with a slim
  red cast-iron spiral stair wound round a central steel pole, standing free
  of the wall: thin diamond-plate treads, one continuous red handrail on the
  outside, oil lamps on the brick every half turn, moonlight standing in the
  windows and washing down from the lantern glass. Climb it, and put your hand on the light to end the walk.
- **Detailed low-poly ground** — procedural sand (mottling, ripples, grit,
  pebbles, shell flecks) with a self-illuminating emissive map.
- **Livelier ocean** — layered swell/chop/ripples, animated micro-normals,
  scrolling whitecaps, and a breaking swash band that fizzes and slides in
  and out with a tide + wave-set shoreline (`shoreLine()` in GLSL).
- **Night mood** — haloed moon + reflection, stars, fog, synthesised
  wind/surf that swells in sets.
- **Pickup shine** — takeable things (the crab, the shovel) carry a soft
  additive glint and a gentle lift in their own emissive, so they separate
  from very dark sand without turning into waypoint markers.
  `addItemShine()`.
- **The rock formation** — six real scanned granite boulders
  (`assets/rocks.glb`) in one heap on the sand below Bradly, and only there: a
  dominant mass with smaller ones leaning into it, two riding up on the pile,
  a skirt of half-buried chunks, and sand banked against the lot so they sit
  *in* the beach rather than on it. Solid — you're pushed out of them and can
  climb them. The scans were baked in daylight, so `reexpose()` gamma-lifts
  the albedo for the moonlight.
- **The body bag** — a corpse roped at the head and the feet
  (`assets/corpse.glb`), on the high-water line thirty metres short of the
  wreck, tipped on its side and settled into the sand, clear of the tide at
  every state of it. You read it as a black bar long before you can tell what
  it is. Solid; looking at it says one line and offers you nothing to do.
  `CORPSE_X` / `CORPSE_Z`.
- **The stuck gate** — the barred outlet in the back wall of the drainage
  tunnel home now says **Look inside**. Press `E` and you lean the last half
  metre onto the bars while the FOV squeezes to 24°, which is the zoom and is
  also what crops the lit room out of frame. Eight metres of ribbed pipe run
  back into the hill. Nothing is down there — and then, a second and a half
  later, a pair of drawn eyes fades up out of the black — a drawing of
  Ethan's, knocked out to alpha — blinks at its own pace, drifts, creeps
  closer, and is gone again within a few seconds. Cave drone, far-off drips
  and the whisper track pushed down a delay so it reads as somebody muttering
  to himself round a bend. `E` again backs you out.
- **The enemy crab** — a bigger animal on a proper rig: eight two-bone legs
  walking an alternating-tripod gait, articulated claws that weave as it
  closes, gape when it rears and snap shut on the strike, eye stalks that
  lean toward you, and a death that rolls it onto its back with the legs
  curling in.
- **Audio mix** — every one-shot effect routes through an **SFX bus**
  (`sfxBusGain`) under the master volume, with its own *Effects volume*
  slider. Previously they went straight to the speakers, which is why
  digging was so loud.

## The bunker

Halfway between the snorkeler and the tall one, on the dry sand, a steel lid
in a concrete collar with a red marker lamp blinking beside it. `E` on it —
**E To Enter Bunker** — and a second and a quarter later you are standing at
the foot of a ladder in a sealed control room forty metres under the beach:
Bohdan Lvov's scanned bunker, exact, with its CRTs flickering and its reels
turning. `E` on the ladder — **E To Leave Bunker** — puts you back on the sand
where you stood. You hear the hatch open ahead of you and slam behind you
both ways. The room cannot be reached any other way.

## The Blue Blood Dealer

He is already down there, standing at the far end with his hands empty, and
he has been for a while. Come down the ladder and the first thing that
happens is that he asks how you got here. The only thing you can say is
nothing, and the crowbar comes up on the frame you say it.

The crowbar is lying on the console beside him the whole time you talk, in
plain view; when the talking stops he turns, takes it, and comes at you.

He is the first boss, and he fights by every rule the beach spent a
kilometre teaching: read the tell, watch for the commit, block it or time
the parry, and take the riposte while he is open. What is different is that
he is a man — he does not roar, does not come apart, and falls where he
stood — and that he is faster than anything on the sand. Ten health,
twenty-five swing-sequences a minute, and one feint in six. You have four.

Everything loose in the room is a body you can pick up, throw and break:
bottles, jars, valves, a set and a monitor. Glass goes at a knock, a set
takes rather more, and the shovel breaks them too.

## Saving

### The mushroom house

The Bell Pavilion, generated rather than imported: a round room on one
column, a dish of ribs under it, a band of steel-framed windows all the way
round, a walled yard below with an iron gate, and a spiral stair inside the
column up into the room.

The glass runs unbroken all the way round, so everything in the room is
kept below the sill and the horizon is visible from anywhere you stand.

The top floor is furnished, and it is 1974 — a burnt-orange curved sofa
facing the sea, two globe chairs turned in at a smoked-glass table across a
wave-pattern shag rug, a teak credenza with the deck still on it and the
records off the shelf, low open shelving, a dome lamp, a disco ball nobody
took down. Nothing in it is ruined: it is dusty and sun-bleached and open
to the weather through the panes that are gone, with the beach drifting in
under them. Somebody carried all of it up that stair and then left.

The iron gate in the yard wall is shut, and it opens on `E` with the noise
fifty years of salt air makes of a hinge. Grass has seeded in the cracks in
the concrete around the yard and the steps.

The room carries its own light in its materials rather than in lamps: a
light entering a scene recompiles every shader in the game, and a building
you walk past should never do that.

The furniture is solid up there and nowhere else, so you walk round the
sofa on the top floor and not through thin air on the sand five metres
under it.

### The desk

The Dealer's desk — the one the crowbar lies on and the equipment case sits
on — is breakable. Hit it hard enough with the blade, a thrown prop, or by
putting the Dealer through it, and it comes apart into its own planks and
legs and rails, everything on it falls and smashes on the steel — the mug
included — the floor where it stood opens up, and the case goes over and
spills the Military Shovel onto the floor in a pool of light you cannot
miss. It is the room's own desk rebuilt in the room's own wood, grain and
plank seams and all, so until you break it you cannot tell it from the
scan.

### The riposte

Parry him and the next blow you land counts double. That is all it is: the
swing is yours to throw and yours to aim, and reading the tell is what pays
for it. His recoveries differ by swing — the quick side swing barely leaves
him open, the held overhead and the lunge leave him open several times
longer — so which one to answer is a thing you learn. The wind bar flashes
on every block, so the third of it each one costs is a thing you watch go.

### The camera on the tripod

The scan's own camera, standing where it always stood — and it comes apart
into what it is actually made of: the body, the lens barrel, the film
magazine, the head, and the three legs, each one the scan's own geometry
rather than a stand-in. Hit it, throw something at it, put a body through it
or just walk into it, and it goes over. It is not a wall: you shoulder
through a tripod, you do not stop at one.

### He digs in at half health

At half his health the Blue Blood Dealer stops, roars through the mask and
comes back at you harder — more aggressive, more feints, longer chains. It
costs him: he is stopped and open for a second and a half, and it is the
biggest window in the fight. His tells are untouched, so the second half is
faster without being unfair.

The mask never comes off. A whole head was built under it once — a
photoscanned bust fitted to his skeleton — and it was cut: the man in the gas
mask is the character.

### The step

**Space** is a directional step while a fight is live, and jump everywhere
else. It goes where you are holding — back if you are holding nothing — and
for the first fraction of it nothing can touch you; a blow that goes through
you in that window is heard going past your ear. It costs a chunk of the same
bar you block and sprint on, and it has a short cooldown, so it is a thing
you time rather than a thing you hold.

### Everything sounds like what it is

A swing that lands on something plays that thing's own material: the
bunker's walls and ceiling are concrete — a flat dead crack with grit off
the face and no ring — the floor is steel deck plate that sings, the desk is
timber, and the console bank and cupboards are steel. Wood, stone, metal and
sand on the beach do the same. What you hit and what you hear are the same
thing.

One autosave, and no save button. Reaching the mushroom house — the last
stretch before the three come out of the dark — writes a checkpoint, and a
small ring in the top right says so. It keeps where you stood, what you were
carrying and in what order, what was in your hand, how hurt you were, the
holes you dug and everything the walk has latched.

Dying puts you back there with all of it. The settings menu has **Restart
from last checkpoint** (greyed out until you have one) and **Restart game**,
which clears the checkpoint and gives you the first morning again.

Coming back to a checkpoint is instant — no title card, no opening line, no
opening music. You are standing at the pavilion before you have finished
reading the button you pressed; the first click takes the mouse back.

## Layout

| File | Purpose |
|------|---------|
| `index.html` | Page shell, HUD, title, intro card, settings menu, hotbar, examine view, end screen |
| `main.js` | The whole game |
| `models/` | Standalone object models + a dev viewer (`horseshoe-crab.js`, `viewer.html`) |
| `assets/backrooms.m4a` | Opening music (mono AAC, converted from the source WAV) |
| `vendor/three/` | three.js r160 (vendored, offline-safe) |
| `serve.py` | Tiny static server |

## Tuning knobs (top of `main.js`)

- `RETRO_SCALE` — internal render resolution (lower = chunkier pixels)
- `WALK_SPEED` / `RUN_SPEED` / `RUN_SECONDS` / `STAM_REGEN` / `JUMP_V`
- `MOON_DIR`, `EYE_HEIGHT`, `DIG_DUR`
- `WADE_X` / `CLIFF_BLOCK_X` — the two invisible walls
- `CLIFF_X` / `CLIFF_H` / `CLIFF_PERIOD`
- `LH_Z` — how far the lighthouse (the ending) is; `END_Z` is the trigger
- `CITY_TILE` and the `towers` block — city distance / height / density
- `CASTLE_Z` — where the shovel-in-a-castle sits; `crabWorld.position` — the crab
- `inspectDist` / the `k` fit factor in `inspectSetModel()` — examine-view framing
- `layoutViewmodel()` / `shovelVM` transforms — the first-person hand pose
- `INTRO_LINE` + the setTimeout offsets in `beginGame()` — opening pacing
- `MUSIC_TARGET` / `MUSIC_FADE_IN` / `MUSIC_HOLD` / `MUSIC_FADE_OUT`
- `PATH_LEN` / `PATH_HALF` / `pathBend()` — the lighthouse path's shape
- `CRAB_SPEED` / `CRAB_REACH` / `CRAB_WAKE` / `crab.scale` — the enemy crab
- `MUT_KINDS` — the three of them: height, health, and the multipliers on
  speed, startup and reach; which swings each has and how often it reaches for
  them; how much it circles; and `voice`, a pitch and two weights every sound
  it makes goes through. `MUT_SPOTS` is where they stand, `MUT_TRIGGER` /
  `MUT_CUT_END` / `MUT_CUT_FOV` are the cutscene's Z line, its hand-back
  distance and how tight the lens gets.
- `MUT_ATTACKS` — the mutants' four swings: each one's startup (`wind`), active
  window, recovery, reach, lunge distance, what it chains into and how often, and
  `hit`, where the contact is in its clip (measured in the build, not guessed —
  move `wind` and the hand still lands on the damage frame). `MUT_HP`, `MUT_STUN`,
  `MUT_COOLDOWN` (a range), `MUT_STRAFE`, `MUT_SPEED`, `MUT_WAKE`, `MUT_H`.
- `DEFAULT_SETTINGS.sfxVolume` — how loud one-shot effects sit
- `FOOT_POOL`, `REACH`, `NOTE_TEXT`, `scene.fog` density
- `DEFAULT_SETTINGS` — starting FOV etc.

`window.__bw` is a dev hook (scene, camera, physProps, inventory, lighthouse,
castle, crab, `startDig`, `toggleEquip`, `openMenu`, `openInspect`, `showEnd`,
…) for the console.

## Next steps

- Real note art; more items and scripted events along the walk (the examine
  view is ready for more examinable objects — add a model in `models/`)
- Object–object physics collisions (currently ground + walls only)
- Two-handed / nicer dig animation
- Persistent dig holes (pool currently recycles after 20)

## Credits

Three of the red alien's moves — the compass kick, the side handspring and
the knockdown — are Mixamo animations (Adobe), retargeted onto his rig by
- `assets/church-step*.m4a` — eleven footfalls cut from "Steps in corridor" by freesound_community (via Pixabay, Pixabay Content License), normalised and faded.
`tools/ntar_moves.py` into `assets/ntar-moves.json`.

This work is based on ["Cave 5.0"](https://sketchfab.com/3d-models/cave-50-7c4df6d7354b4ed39b50db47d66f96f8)
by [Valsev](https://sketchfab.com/Valsev) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) — the way OUT, behind
the altar (`assets/cave.glb`, decimated and packed with its walk by
`tools/undercroft_pack.py`). One of its three materials carries no texture at
all — it is the lamps on the posts, not rock.

This work is based on ["Portal"](https://sketchfab.com/3d-models/portal-3279b8d99fe244059c40a66e8aa39590)
by [DJMaesen](https://sketchfab.com/bumstrum) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) — the stone circle on the
sand a hundred metres past the cave (`assets/portal.glb`, through
`tools/gltfpack.py`; its spec-gloss material is rewritten to metallic-roughness,
which three r160 needs). The light turning over inside the ring is not the
model — it is built round it.

This work is based on ["Scorched Dojo"](https://sketchfab.com/3d-models/scorched-dojo-b6fc27abbe984d4ea3997941382b665f)
by [matiasmgru](https://sketchfab.com/matiasmgru) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) — what is on the other
side of the portal (`assets/dojo.glb`, packed by `tools/undercroft_pack.py` with
its walk grid inside it). Its rain is driven by the game, not by the model's own
clip, which cannot survive a world-space bake.

This work is based on ["Fantasy Sea Keep"](https://sketchfab.com/3d-models/fantasy-sea-keep-daa54937ce844ed390101fa9318843ba)
by [JesseL](https://sketchfab.com/JesseL) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) — where the fisherman's
boat takes you (`assets/keep.glb`, through `tools/undercroft_pack.py keep`: the
file untouched, every triangle and every map, with a storeyed walk grid inside
it). Its sky is painted by the game, because the pink evening in Sketchfab's
viewer is the viewer's own environment and not in the file.

"Samurai japanese free low-poly 3d model" by
[adrigon](https://www.cgtrader.com/adrigon) (CGTrader, free licence) — the man
who wants his sword back (`assets/samurai.glb`, through
`tools/samurai_pack.py`). He ships a Rigify control rig with 678 pose
constraints and exactly one animation, a 38-frame `Swing`. His move set - a
side cut, a rising kesa, a turning cut, a thrust and an overhead - is authored
in that packer instead. It is RETARGETED Mixamo animation now - eight clips
supplied by the owner (Great Sword Slash x2, Sword and Shield Slash, two
Kicks, Blocking, Crouching, Run), mapped onto his Rigify skeleton by
`tools/samurai_pack.py`, trimmed to the strike and measured for their
contact frames. The taunt, the stagger and the death stay authored. The
shipped swing ships under its own name and the
fight does not draw it, because it begins and ends in the artist's stance while
every authored swing begins and ends on the guard.

The Elden Ring katana animations (MCO/SCAR, for Skyrim) supplied alongside are
NOT in the build and cannot be: they are Havok spline-compressed `.hkx` and the
archive carries no skeleton, so the tracks are bare indices into a bone list
that is not there. Their annotation track IS readable, and the startup and
contact timings in `MUT_ATTACKS.s*` are taken from it.

This work is based on ["Old church modeling - Interior Scene"](https://sketchfab.com/3d-models/old-church-modeling-interior-scene-eb6cf543aa7d45e3acee49887ae3135c)
by [Aurélien Martel](https://sketchfab.com/aurelien_martel) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) — the church at the bottom of
it (`assets/church.glb`, same packer; its pews come out as forty breakable benches).

`assets/cave-ambience.m4a` is the owner's own recording — a 45-minute cave
ambience cut to a 75 s seamless loop. It plays in both tunnels and never in
the church, and it is not redistributable. (A bank of ten reverbed footfalls
from the same session shipped for a while and came back off on his word: the
undercroft already has a convolver on the sfx bus, and a recorded tail under
it was a room inside a room.)

This work is based on ["Tunnel"](https://sketchfab.com/3d-models/tunnel-5a1ce8da91684583a917b613a521161f)
by [local.yany](https://sketchfab.com/local.yany) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) — the tunnel you crawl
in through (`assets/tunnel.glb`, turned onto +x and scaled to metres and packed
with its walk by `tools/undercroft_pack.py`). It keeps its own rock map and its
own uvs; its spec-gloss materials are rewritten to metallic-roughness on the
way in, because three dropped that extension. It has standing water down the
middle of it, which is the floor you wade through — so the carve leaves it
alone, and it is lifted off black by hand because the grime pass lifts a
surface off its own map and the water has none. Its "Particles" tube — a
light-shaft for a scene with a sun in it — is dropped at pack time. (It
replaces Ant leader's "3DRT-uderground for game", which was the tunnel here
until Sep 2026.)

This work is based on ["Rock Mountain with cave realistic 85k by JJ"](https://sketchfab.com/3d-models/rock-mountain-with-cave-realistic-85k-by-jj)
(Sketchfab) — the rock outcrop at the foot of the sand wall, past the mutants,
with the cave mouth you crawl into (`assets/rockmouth.glb`, through
`tools/gltfpack.py`).

`assets/sol.glb` is the owner's own model — SOL, the robed figure in the gold
sun mask holding a bleeding heart, which stands on the undercroft church's
altar in a ring of lit candles. Packed by `tools/sol_pack.py` from `SOL.blend`
— the .blend and not the .fbx, because the heart carries a geometry-nodes
modifier and the eight daggers are parented to it, and none of that survived
the FBX export: measured, the heart came out at the figure's thighs instead of
in its hands. 205k faces down to 51k, 4096 maps down to 1024 colour/normal and
512 roughness, and every metallic map dropped (there is no environment map in
this game).

This work is based on ["The smile ( Rigged)"](https://sketchfab.com/3d-models/the-smile-rigged-6795ba0b406f4e61993fafebbb94ebd9)
by [Vertex Mercher](https://sketchfab.com/VertexMercher) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) — the tall one past the snorkeler.

This work is based on ["Character with animation"](https://sketchfab.com/3d-models/character-with-animation-31ea9ee9c82340bc8fd8da2343f9234d)
by [Yury Misiyuk](https://sketchfab.com/Tim0) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) — the Blue Blood
Dealer (`assets/dealer.glb`, built by `tools/dealer_pack.py`).

This work is based on ["Underground Bunker"](https://sketchfab.com/3d-models/underground-bunker-720d2958484345d7b535554e14122b5c)
by [Bohdan Lvov](https://sketchfab.com/ostapblendercg) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) — the bunker control
room (`assets/bunker.glb`, packed as an exact replica by `tools/bunker_pack.py`)
under the hatch between the snorkeler and the tall one.

This work is based on ["Survival Shovel"](https://sketchfab.com/3d-models/survival-shovel-143de1be88704810bd14f64cfed64bb7)
by [howittworks](https://sketchfab.com/howittworks) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) — the Military Shovel.


The **katana's swing, block, hit, draw and parry sounds** are the owner's own
bounces — four swings and four blocks from Sekiro effects, four hits from a
royalty-free sword-slash pack, a draw and a parry — rotated at random where
there is more than one, and like `poise-broken.m4a` they are NOT
redistributable.

The **three break sounds** — `table-break.m4a`, `camera-break.m4a` and
`coat-break.m4a`, for the desk, the tripod camera and the coat stand — are
the owner's own bounces as well, and are NOT redistributable either. Each
one is the whole event: the synthesised stack it replaced stays behind it as
the fallback for the frames before the bank is off the network.

**Grass pack (lowpoly, game-ready)** — the grass on the headland.
["Grass pack (lowpoly, game-ready)"](https://sketchfab.com/3d-models/grass-pack-lowpoly-game-ready)
by [LOLIPOP](https://sketchfab.com/lolipop_1707), [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**(FREE) Realistic Rocks - Asset LowPoly** — the rock formations on the beach.

["(FREE) Realistic Rocks - Asset LowPoly"](https://sketchfab.com/3d-models/free-realistic-rocks-asset-lowpoly-6e02ec577b4a473fb173c54fd6eef62d)
by [Domenico Bianco - Pizza&Games](https://sketchfab.com/pizzaandgames),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Sea shell** — the shells on the wrack line, and the one you hold to your ear.

["Sea shell"](https://sketchfab.com/3d-models/sea-shell-742a5f4a7bc84abe8d0c645cdb411cc8)
by [blenderboom](https://sketchfab.com/blenderboom),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Dock House - Stylized Wooden Pier** — the pier past the wreck.

["Dock House - Stylized Wooden Pier"](https://sketchfab.com/3d-models/dock-house-stylized-wooden-pier-4f0df975625a432c91f2685963d12500)
by [voyoo](https://sketchfab.com/voyoo),
[Sketchfab Standard](https://sketchfab.com/licenses) licence.


**Medieval key (copper version)** — the key in the dock's crate.

["Medieval key (copper version)"](https://sketchfab.com/3d-models/medieval-key-copper-version-21595543c33a4150bc65d04e025aa84c)
by [Sousinho](https://sketchfab.com/sousinho),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Low poly sand castle** — the castle the shovel is stuck in.

["Low poly sand castle"](https://sketchfab.com/3d-models/low-poly-sand-castle-b0fb3f4ec6d643b9b468cc7724b17f85)
by [assetfactory](https://sketchfab.com/assetfactory),
[Sketchfab Standard](https://sketchfab.com/licenses) licence.


**CRAB 001** — the crab that comes for you. Rigged by its author; the five
animation clips (`idle`, `walk`, `attack`, `stun`, `die`) are built here by
`tools/crab_anim.py`, with the attack authored against the game's own parry
timing.

["CRAB 001"](https://www.cgtrader.com/free-3d-models) by
[artofmickey](https://www.cgtrader.com/artofmickey), CGTrader free model.


**Severed head** — the captain, on the hook over the wreck's hatch.

This work is based on ["Severed head"](https://sketchfab.com/3d-models/severed-head-65103457564048b7a89d177e550181ae)
by [alexrmartinez](https://sketchfab.com/alexrmartinez) licensed under
[CC-BY-NC-4.0](http://creativecommons.org/licenses/by-nc/4.0/). **Non-commercial**:
this build is a personal one, and the licence does not allow the model in
anything sold. `assets/head.glb` is the scan cut to 20k triangles by
`tools/head_pack.py`.


**SCP-096 Reanimated** — the thing sitting on the lane in front of the
lighthouse. It is the first asset here that arrived with a whole fight
already animated: `attack1`, `attackjump`, `attackrun`, `attackrunstart`,
`idle_rage`, `panicstart`, `teslagatehit` and `die` are the creature's own
clips out of SCP: Containment Breach. `assets/scp096.glb` is the scan through
`tools/gltfpack.py` with twelve of its thirty-seven clips kept
(`--clips`), 6.3k triangles and its own two maps.

This work is based on ["SCP-096 Reanimated"](https://sketchfab.com/3d-models/scp-096-reanimated-9e0b35c9485d4b51864a232e9653cc3a)
by [Sealife Fan 3](https://sketchfab.com/SealifeFan3) licensed under
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Mutant 01** — the thing on the beach past the pavilion.

"Mutant 01" from CGTrader, supplied by the project owner: a rigged mesh, three
texture sets and seventeen authored animation clips. `assets/mutant.glb` is
built from its base mesh and eight of those clips by `tools/mutant_anim.py`.
Its licence is whatever the owner bought it under — check that before
redistributing this build with the model in it.


**Poise Broken** — the sound of a parry landing. An Elden Ring sound effect
(FromSoftware) supplied by the project owner for this personal build; it is
not covered by any open licence and must not be redistributed with the game.

**Paint can / metal impacts** — the sand shovel's block, and the Military
Shovel's block, light hits and heavy hit, are five impact samples the owner
supplied (`assets/block-sand.m4a`, `assets/block-military.m4a`,
`assets/military-light1.m4a`, `assets/military-light2.m4a`,
`assets/military-heavy.m4a`). They are not ours to
redistribute and are credited as such.


**Rusty Metal 02** — the rust on the ring.

[Rusty Metal 02](https://polyhaven.com/a/rusty_metal_02) by Poly Haven, CC0.


**Octopus Ring** — the ring in the crate.

["Octopus Ring"](https://sketchfab.com/3d-models/octopus-ring)
by [Thunk3D scanner](https://sketchfab.com/Diana123456),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Corpse in a black body bag with ropes** — the body on the beach before the
wreck.

["Corpse in a black body bag with ropes"](https://sketchfab.com/3d-models/corpse-in-a-black-body-bag-with-ropes-fb2fe10ba9b14982b5785d73d7155daa)
by [Dennis Hafemann](https://sketchfab.com/dennis.hafemann),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Procedural Eyes For Ray II** — the eyes down the pipe behind the drain gate.

["Procedural Eyes For Ray II"](https://sketchfab.com/3d-models/procedural-eyes-for-ray-ii)
by [ChamberSu1996](https://sketchfab.com/chambersu1996),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Rocks and stones pack** — the stone on the headland round the lighthouse.

["Rocks and stones pack"](https://sketchfab.com/3d-models/rocks-and-stones-pack)
by [shtran](https://sketchfab.com/shtran),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Simple grass chunks** — the grass clumps on the headland.

["Simple grass chunks"](https://sketchfab.com/3d-models/simple-grass-chunks)
by [3dhdscan](https://sketchfab.com/3dhdscan),
[CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


**Realistic grass** — the dense grass along the lane to the door.

["Realistic grass"](https://sketchfab.com/3d-models/realistic-grass)
by [Pasha](https://sketchfab.com/Pasha.), under the
[Sketchfab Standard licence](https://sketchfab.com/licenses).


**Animated Crab rigged FREE** — the enemy crab.

["Animated Crab rigged FREE"](https://sketchfab.com/3d-models/animated-crab-rigged-free-ca331da937b04b0f94b9245d5f2ac778)
by [TwilightFox](https://sketchfab.com/twilightfox), under the
[Sketchfab Standard licence](https://sketchfab.com/licenses) — commercial use
and derivative works allowed.

"Iron Juggernaut" by IronSpear — the armoured knight standing against the wall
to the left of the altar in the church (`assets/knight.glb`, through
`tools/knight_pack.py`). Its two UDIM texture tiles are packed side by side
into one atlas and every u halved, so the whole knight is three materials; its
metallic map is dropped, because a metal has no diffuse term and this game has
no environment map; and its occlusion is multiplied into its albedo, because
one directional light that is somewhere else entirely never shades a crease.
Its file ships six locomotion clips and NOT ONE SWING — the fight is authored
in code on the stance its own idle carries, the way the witness's is.
