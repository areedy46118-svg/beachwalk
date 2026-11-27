/* THE MARKS A SWING LEAVES IN THE SAND (2026-11-23, the owner: "improve the marks in the ground when hitting the sand").
 * Five strikes stamped on dry beach the way digImpact() stamps them (`stampDigHole` + `spawnPuffs` along the swing),
 * then stills once the sand has settled: as you stand over them looking down the beach toward the moon, looking back
 * the other way, crouched close, and from eight metres. `&tag=` names the stills (before/after).
 * PB_PORT=4227 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/sandmarks.js&tag=before' <out> */
const TAG = new URLSearchParams(location.search).get('tag') || 'x';
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(5000);
b.settings.devMode = true;
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.__clockOn();
// a stretch of beach with no bank on it (the first try stood on a drift, which buries a mark at y = 0), and one bank
let X = 8, Z = -40;
for (let z = -40; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -3; dz <= 5 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
log('flat at', X, Z);
const C = b.camera;
const put = (x, h, z, tx, ty, tz) => { C.position.set(x, h, z); b.camBaseY = h; b.lookAt(tx, ty, tz); };
// a still is a render with nothing run after it, so the aim is the camera's own (the loop's look is applied a frame late)
const aim = (x, h, z, tx, ty, tz) => { C.position.set(x, h, z); C.lookAt(tx, ty, tz); C.updateMatrixWorld(true); };
put(X, 1.7, Z + 3, X, 0, Z); w.__adv(30);
// five strikes as a fight leaves them: a cluster in front of you, swung from where you stand (+z), one a little apart
const S = [[0, 0], [0.55, 0.35], [-0.6, 0.2], [0.15, -0.75], [1.5, -1.3, 1]];   // (the last with a blade)
for (const [dx, dz, bl] of S) {
  const fx = -dx * 0.3, fz = -1, fl = Math.hypot(fx, fz);
  b.stampDigHole(X + dx, Z + dz, fx / fl, fz / fl, { P: 0.6, blade: !!bl });
  b.spawnPuffs(X + dx, Z + dz, 30, fx / fl, fz / fl);
  w.__adv(20);
}
// the moment of the last one, then settled
put(X + 0.2, 1.7, Z + 2.6, X + 0.3, 0, Z - 0.3); w.__adv(1); aim(X + 0.2, 1.7, Z + 2.6, X + 0.3, 0, Z - 0.3); shot(`${TAG}-fresh`, 640);
w.__adv(240);
const views = [
  ['stand', [X + 0.2, 1.7, Z + 2.6], [X + 0.3, 0, Z - 0.3]],      // down the beach, toward the moon
  ['back', [X + 0.4, 1.7, Z - 3.2], [X + 0.2, 0, Z - 0.2]],       // the other way, moon behind you
  ['close', [X - 0.3, 0.9, Z + 1.3], [X, 0, Z - 0.1]],            // crouched over the first
  ['far', [X + 2.5, 1.7, Z + 8.0], [X + 0.3, 0, Z - 0.3]],        // from eight metres
];
for (const [nm, p, t] of views) { put(...p, ...t); w.__adv(1); aim(...p, ...t); shot(`${TAG}-${nm}`, 640); }
log('stamped', S.length);
// and through a long lens, to see what the mark is made of (the game's 105 degrees puts a mark in a few dozen pixels)
const fov0 = C.fov; C.fov = 32; C.updateProjectionMatrix();
for (const [nm, p, t] of [['zoom', [X + 0.2, 1.7, Z + 2.6], [X + 0.1, 0, Z - 0.1]], ['zoomback', [X + 0.4, 1.7, Z - 3.2], [X + 0.1, 0, Z - 0.1]], ['zoomblade', [X + 1.2, 1.7, Z + 1.4], [X + 1.5, 0, Z - 1.3]]]) {
  put(...p, ...t); w.__adv(1); aim(...p, ...t); shot(`${TAG}-${nm}`, 640); shot(`${TAG}-${nm}-g`, 640, 2.4);
}
C.fov = fov0; C.updateProjectionMatrix();
