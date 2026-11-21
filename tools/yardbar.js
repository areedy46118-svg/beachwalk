/* THE PAVILION'S YARD IS ITS GATE'S (2026-11-21, the owner: "i shouldnt be able to hook and clip through things using the boost.
 * i just hooked over the pavillon wall and clipped through it ... u should need the key to acess this"). Skrim's hook in hand,
 * stood outside the yard's wall away from the gate: pulled on the chain at a point inside, low and then high (over the top);
 * then at the gate, shut and open. Where each pull leaves you (in the yard or not).
 * Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/yardbar.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
b.settings.devMode = false;                       // (dev mode opens every lock: this is about the lock)
const hk = b.inventory.find((i) => i.name === "Skrim's Hook") || b.packByName("Skrim's Hook"); if (!b.inventory.includes(hk)) b.addToInventory(hk);
if (b.equippedS() !== hk) b.toggleEquip(hk);
const MX = b.MUSH_XS(), MZ = b.MUSH_ZS(), M = b.MUSH_S(), G = b.MGATES(), C = b.camera;
const gx = G.x + Math.sin(G.shut) * G.w / 2, gz = G.z + Math.cos(G.shut) * G.w / 2, ga = Math.atan2(gx, gz);
log('gate gap at angle', ga.toFixed(2), 'r', Math.hypot(gx, gz).toFixed(2), '| wall r', M.WALL_R);
C.position.set(MX + Math.sin(ga) * 9, 1.7, MZ + Math.cos(ga) * 9); b.camBaseY = 1.7;
for (let i = 0; i < 120; i++) { b.frame(1); await sleep(10); }
const pull = async (tag, a, r0, y, r1) => {
  for (let k = 0; k < 2; k++) { C.position.set(MX + Math.sin(a) * r0, 1.7, MZ + Math.cos(a) * r0); b.camBaseY = C.position.y; for (let i = 0; i < 20; i++) b.step(1 / 60); }
  const ok = b.hookZipAtS(MX + Math.sin(a) * r1, y, MZ + Math.cos(a) * r1);
  let minD = 99; for (let i = 0; i < 120; i++) { b.step(1 / 60); minD = Math.min(minD, Math.hypot(C.position.x - MX, C.position.z - MZ)); }
  const d = Math.hypot(C.position.x - MX, C.position.z - MZ);
  log(tag, '| pulled', ok, '| ends', d.toFixed(2), 'from the column (closest', minD.toFixed(2) + ')', d < M.WALL_R ? 'IN THE YARD' : 'outside', '| feet', (C.position.y - 1.7).toFixed(2));
};
await pull('away from the gate, low', ga + 1.0, M.WALL_R + 1.6, M.PLAT_TOP + 1.2, 3.2);
await pull('away from the gate, over the top', ga + 1.0, M.WALL_R + 1.6, M.PLAT_TOP + 4.0, 3.2);
await pull('at the gate, shut', ga, M.WALL_R + 2.2, M.PLAT_TOP + 1.2, 3.0);
b.openPavGate(); for (let i = 0; i < 120; i++) b.step(1 / 60);
log('gate open', b.gateOpenS());
await pull('at the gate, open', ga, M.WALL_R + 2.2, M.PLAT_TOP + 1.2, 3.0);
await pull('away from the gate, low (gate open)', ga + 1.0, M.WALL_R + 1.6, M.PLAT_TOP + 1.2, 3.2);
