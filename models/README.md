# models/

Standalone 3D models for Beachwalk. Each model is a plain factory function
that returns a `THREE.Group`, with a viewer page for looking at one in
isolation.

The horseshoe crab is **live in the game**: it's stranded in the wrack line
(`crabWorld` in `main.js`), you take it with `E`, and using the inventory
slot opens the examine view (`openInspect`) where you drag to turn it over.

## Files

| file | what it is |
|---|---|
| `horseshoe-crab.js` | `makeHorseshoeCrab()` → a detailed smooth-shaded *Limulus*: a broad rounded head shield on a poleless Cartesian-grid dome with the **cardiac + ophthalmic ridges, the raised margin and the articulation groove sculpted into the height field**, a wavy hinge bar, six movable spines per side, a triangular telson, genal spines, and a full underside (six leg pairs, chelicerae, operculum, book gills). Plus `makeHorseshoeCrabIcon()`. |
| `syringe.js` | `makeSyringe()` → a glass bleeding hypodermic: barrel with graduation marks, a small finger flange + slim cross-section plunger + thumb rest, rubber piston, luer hub, steel needle, removable orange cap, and a **blue haemolymph column**. `group.userData.setFill(t)` (0→1) slides the plunger and grows the blood — the game drives this during the extraction. Plus `makeSyringeIcon()`. |
| `blood-jar.js` | `makeBloodJar()` → an old milk-bottle-style glass jar filled with glowing blue haemolymph, a pale foam layer, a crimped foil cap and a paper label. `group.userData.setFill(t)` sets the level. Plus `makeBloodJarIcon()`. |
| `drainage-tunnel-home.js` | `makeDrainageTunnelHome()` → the drainage tunnel home: a storm-drain outfall up the beach behind spawn, and the chamber somebody lives in at the end of it. Distinct from the **tunnel in the sand wall** (`TUN_*` in `main.js`) further down the walk, which is a dug corridor. Outside: a weathered concrete headwall with the pipe hole punched through a ring plate, wing walls, and the **scour channel** the outflow has cut down the beach (wet bed, sand berms, cobbles, fallen blocks, a scour pool). Inside: a ringed circular bore with a silted invert, a green-algae water channel, graffiti, caged wall lamps, a side connection bleeding rust down the wall, a steel blast door standing open, and the brick chamber somebody lives in (joists and conduit, one dim tube light, pallet bed, shelving, barrel, bucket under a drip, cobwebs, and a **rusted outlet in the back wall** with an ochre run below it). A red beacon on a mast blinks on top so you can find it from down the beach. Carries `userData.nav` (collision numbers + solid-prop AABBs), `userData.lights`, `userData.beacon`, `userData.outlet` and `userData.drips`. Takes `makeDrainageTunnelHome({ sandMat, wetSandMat })` so the scour outside blends with the real beach. |
| `water-bottle.js` | `makeWaterBottle()` → a half-litre supermarket bottle, still sealed and full: ribbed body, moulded base dimple, knurled blue cap with a tamper ring, printed label, and a water column driven by `userData.setFill(t)`. Found by the bed in the drain chamber. Plus `makeWaterBottleIcon()`. |
| `shipwreck.js` | `makeShipwreck({ sandMat })` → the **Limulus**, an old horseshoe-crabbing boat driven up the sand and lying **across** the beach, blocking the walk. Proper hull form — fined raked stem, bow flare, sheer lifting to both ends, rounded transom — corroded with the old blue-green paint still on it in patches, graffiti, plating torn through in five places, bulwark buckled away in stretches, a collapsed run of deck showing the frames. Her gear is still aboard: culling table, stacked wire baskets, davit and hand winch, and the catch that never got landed lying in the hold. Name board on the bridge front. You get past it by going **through** it: in at the breach in the near side, up the stair out of the hold, across the deck, down the ramp of torn plate on the far side. The bridge aft holds a **ship's wheel with three detents** (`userData.wheel`; `shipWheel.position` is −1/0/1) for a later puzzle. `userData.nav` carries the walkable regions. |
| `underground-bunker.js` | `makeUndergroundBunker()` → Bohdan Lvov's scanned **bunker control room** (`assets/bunker.glb`, out of `tools/bunker_pack.py`), an exact replica at human scale: steel floor, two vault doors, a ladder to a roof hatch, a wall of CRTs and consoles, lockers, safes, a world map, tape shelves, two AC units. Floor at `y = 0`, room centred on the origin, so placing it is position + `rotation.y`. The GLB carries its own walkability in the root node's extras — `userData.bunker.nav` (room box, doors, ladder, lamps) and `blocked(lx, lz, r)` over a 0.1 m furniture grid rasterised off the geometry at pack time — plus the scan's one clip split into an ambient loop (screens, panel lights, reels, rotors) and `openHatch()` / `closeHatch()`. Point lights are placed at every bright cluster of the lamp mesh's emissive map. In the game it stands forty metres under the beach hatch between the snorkeler and the tall one (`bunkerHome` in `main.js`), drawn only while you are in it; `__bw.spawnBunker(x, y, z, yaw)` stands another anywhere. |
| `viewer.html` | Dev viewer — `?model=horseshoe-crab` (default), `?model=syringe`, `?model=blood-jar`, `?model=drainage-tunnel-home`, `?model=water-bottle`, `?model=shipwreck`, `?model=underground-bunker`. Drag to rotate, scroll to zoom, **Flip over**, Wireframe, Auto-spin, **Fill** (syringe/jar), Reset. |

## Looking at it

```bash
python3 serve.py 4173
```

Then open <http://localhost:4173/models/viewer.html>.

> In this git worktree the Claude Code preview attaches to a server on
> **port 4176** (`.claude/launch.json`), because a separate checkout may
> already hold 4173. If `preview_start` can't attach, start it by hand:
> `python3 serve.py 4176` from the worktree root.

## Model conventions

- **Units are metres.** The crab is ~0.42 m across, ~0.6 m long with the
  telson; the syringe ~0.19 m.
- **Local frame:** `+Y` up, `+Z` forward. Crab: `-Z` is the telson, underside
  at `y ≈ 0` (rests carapace-up). Syringe: `+Z` is the needle, `-Z` the
  thumb-rest.
- Origin is roughly the centre of the carapace.
- Smooth-shaded, no textures / external assets — a deliberate exception to the
  flat-shaded world props because these are hero props seen up close.
  `drainage-tunnel-home.js` is the exception to the exception: it's a walk-in world
  structure, not a hero prop, so it's **flat-shaded** with small procedural
  canvas textures (concrete, brick) like the rest of the beach.
- Helpers worth reusing: `domeGeo()` / `domeField()` (dome caps, the latter a
  poleless Cartesian grid you can sculpt ridges into), `taperedTube()` (smooth
  swept limb / spike / needle), `seat()` (ray-cast detail onto a surface).

## In the game (`main.js`, search "Horseshoe crab" / "Bleeding syringe")

The crab and syringe are **two separate world pickups** (`crabWorld` at z −58,
`syringeWorld` at z −96); `E` takes each into inventory.

**The combine:** while carrying both, "use" *either* one (`crabItem.use` /
`syringeItem.use` both check for the other). `startExtraction()` runs the
scripted sequence — cap flicks off, needle enters the hinge, plunger draws
back, `syringe.userData.setFill()` 0→1 fills the barrel blue (~3.4 s,
`sfxDraw()`), needle lifts out. `finishExtraction()` then:

- empties + re-caps the syringe (stays **"Bleeding syringe"**),
- leaves the crab untouched (`crabBled` blocks a second draw),
- adds a **"Jar of blue blood"** item and shows the jar as the payoff.

Mechanically: `startExtraction` builds an `extractRig` (crab + syringe with the
needle tip at `_hinge`), and `updateInspect()` drives it via `driveExtraction(t)`
→ `finishExtraction()`.

## Adding another examinable object

1. Write `models/<thing>.js` exporting `make<Thing>()` (same conventions).
2. `import` it in `main.js`, build a world group + `hitProxy`, `scene.add`,
   `addInteractable(..., 'inventory', { onActivate })`.
3. In `onActivate`, `addToInventory({ name, icon, use: () => openInspect(model) })`.

`openInspect()` handles centring, scaling, drag-rotate, zoom, and the
pointer-lock dance. `viewer.html` stays as a standalone way to iterate on a
model without launching the whole game.
