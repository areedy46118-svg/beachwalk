/* THE BOOT ON A BODY THAT IS DOWN (2026-11-25, "improve the physics": `ragKick`). On the open beach, a man spawned, killed with a
 * light cut, left 6 s to come to rest; then stood a metre from his hips, looking down at them, kicked — how far the hips and the
 * furthest joint went, how high anything rose, that it rests again and on the floor. Three bodies; side-on stills of the first.
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/kickbody.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true; w.__bwZDieNone = 1; w.__clockOn();
const C = b.camera, T = b.THREE; let X = 8, Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -4; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
for (let i = 0; i < 80 && !b.KICK.ready; i++) { w.__adv(1); await sleep(50); }
const kat = b.katanaItem; b.addToInventory(kat); if (b.state().equipped !== kat.name) b.toggleEquip(kat);
const snap = (nm, c) => { const q = C.quaternion.clone(), pp = C.position.clone(); C.position.set(c.x + 3.4, 1.0, c.z + 0.4); C.lookAt(c.x, 0.4, c.z - 0.6); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 380, 1.3); C.position.copy(pp); C.quaternion.copy(q); };
let prev = null;
for (let n = 0; n < 3; n++) {
  if (prev) { prev.g.visible = false; }
  const u = b.mutSpawnTest(X, Z - 1.75, 'farmer1', 0); prev = u;
  for (let i = 0; i < 600 && !(u.model && u.mixer); i++) { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; w.__adv(1); await sleep(10); }
  u.st.hp = 1; u.st.awake = true; const p = u.g.position;
  for (let i = 0; i < 400 && !u.rag; i++) { C.position.set(p.x, p.y + 1.7, p.z + 1.75); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + 1.2, p.z); if (i % 45 === 14) b.startDig(0); w.__adv(1); }
  if (!u.rag) { log('body', n, 'never died'); continue; }
  for (let i = 0; i < 360; i++) w.__adv(1);
  const R = u.rag, H = R.byName.Character1_Hips || R.parts[0], h0 = H.p.clone(), at0 = R.parts.map((q) => q.p.clone());
  const put = () => { C.position.set(h0.x, h0.y + 1.6, h0.z + 1.0); b.camBaseY = C.position.y; b.lookAt(h0.x, h0.y, h0.z); };
  for (let i = 0; i < 30; i++) { put(); w.__adv(1); }
  b.KICK.cd = 0; b.KICK.lastBody = null; const asleep0 = !!R.asleep, ok = b.startKick(); let top = 0;
  for (let i = 0; i < 300; i++) { put(); w.__adv(1); for (const q of R.parts) top = Math.max(top, q.p.y - q.r - (q.floor ?? 0)); if (n === 0 && i % 8 === 0 && i <= 88) snap('kick_' + String(i).padStart(3, '0'), h0); }
  log('body', n, '| at rest before', asleep0, '| kicked', ok, 'took it', b.KICK.lastBody === u, '| hips went', Math.hypot(H.p.x - h0.x, H.p.z - h0.z).toFixed(2), 'm (along the kick', (h0.z - H.p.z).toFixed(2), ') | furthest joint', Math.max(...R.parts.map((q, i) => Math.hypot(q.p.x - at0[i].x, q.p.z - at0[i].z))).toFixed(2), 'm | highest any joint rose', top.toFixed(2), 'm | at rest again', !!R.asleep, '| lowest joint over its floor', Math.min(...R.parts.map((q) => q.p.y - q.r - (q.floor ?? 0))).toFixed(2));
}
log('DONE');
