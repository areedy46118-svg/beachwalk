/* WHERE THE TEMPLE TELEPORT PUTS YOU (2026-11-21): the dev teleport from the beach, the first frames after the black, your
 * place in the room's frame (distance from the middle), your height over the sand, where you look; and a still.
 * Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/tmpspawn.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && !(b.state().started); i++) { b.frame(1); await sleep(50); }
b.devTeleportTemple();
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z;
for (let i = 0; i < 900 && !(b.tmpS().ready && b.state().inTemple !== false && Math.abs(C.position.x - X) < 2000); i++) { b.frame(1); await sleep(50); }
for (let k = 0; k < 4; k++) {
  for (let i = 0; i < 30; i++) { b.frame(1); await sleep(16); }
  const p = C.position, d = new b.THREE.Vector3(); C.getWorldDirection(d);
  log('t', k, '| room x', (p.x - X).toFixed(1), 'z', (p.z - Z).toFixed(1), '| from the middle', Math.hypot(p.x - X, p.z - Z).toFixed(1), 'm | eye over the sand', (p.y - Y - b.tmpFloorAt(p.x - X, p.z - Z)).toFixed(2), '| looking', d.x.toFixed(2), d.y.toFixed(2), d.z.toFixed(2));
}
shot('spawn', 640, 1.0);
