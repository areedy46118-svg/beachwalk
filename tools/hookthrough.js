/* SKRIM'S HOOK MEETS THE MOUNDS, AND DOES NOT TAKE YOU THROUGH THE TAVERN (2026-11-21, the owner: "make projectile hooking the
 * mounds more responsive it sometimes clips through" / "i should never glitch through the tavern like this even using the
 * hook"). A throw low at the sand apron before the entrance rock: where it lands. Then in the tavern, pulls on the chain at
 * points through its walls every 30 degrees round: where you end, and whether there is floor under you there.
 * Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/hookthrough.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const hk = b.inventory.find((i) => i.name === "Skrim's Hook") || b.packByName("Skrim's Hook"); if (!b.inventory.includes(hk)) b.addToInventory(hk);
if (b.equippedS() !== hk) b.toggleEquip(hk);
const C = b.camera, AX = b.MOUNT_FRONT_X - 1, AZ = b.MOUNT_MOUTH_Z;
for (const [dx, dz] of [[-7, 0], [-6, 4], [-6, -4]]) {
  C.position.set(AX + dx, 1.7, AZ + dz); b.camBaseY = 1.7;
  for (let i = 0; i < 10; i++) { b.lookAt(AX, 0.15, AZ); b.step(1 / 60); }
  b.lookAt(AX, 0.15, AZ); C.updateMatrixWorld(true);
  const H = b.HKS(); H.st = 'idle'; H.cd = 0;
  const ok = b.hookThrowS(0.6);
  log('throw at the apron from', dx, dz, '| thrown', ok, '| lands on', H.to ? H.to.kind + '/' + (H.to.surface || '') : 'nothing', 'at', H.end.toArray().map((v) => v.toFixed(2)).join(','), '| ground there', b.sandMoundAt(H.end.x, H.end.z).toFixed(2));
  for (let i = 0; i < 90; i++) b.step(1 / 60);
}
// the tavern
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 600 && !RB.ready(); i++) { b.frame(1); await sleep(30); }
RB.place(); for (let i = 0; i < 30; i++) b.step(1 / 60);
const T = b.tavInfoS(), P0 = C.position.clone(), res = [];
for (let k = 0; k < 12; k++) {
  const a = k / 12 * Math.PI * 2;
  C.position.copy(P0); b.camBaseY = P0.y; for (let i = 0; i < 5; i++) b.step(1 / 60);
  const H = b.HKS(); H.st = 'idle'; H.zipUsed = false;
  b.hookZipAtS(P0.x + Math.sin(a) * 14, P0.y + 1.5, P0.z + Math.cos(a) * 14);
  for (let i = 0; i < 90; i++) b.step(1 / 60);
  const f = T.floor(C.position.x, C.position.z, C.position.y - 1.6 + 0.5);
  res.push(Math.round(a * 57.3) + '°:' + Math.hypot(C.position.x - P0.x, C.position.z - P0.z).toFixed(1) + 'm' + (f == null ? ' NO FLOOR' : ''));
}
log('tavern pulls (moved, floor):', res.join(' '));
