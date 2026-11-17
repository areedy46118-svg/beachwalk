/* WHERE THE DARK KNIGHT THROWS EACH BLOW FROM (2026-11-16). Not part of the game. `sh tools/probe.sh
 * 'evalFile&f=/tools/dkpick.js'`: you stand 3 m in front of him, still; for 40 s every swing he starts — the distance,
 * its tuned stand-off (`stop`, `rmStop`), where it is thrown from (`rmFrom`), its reach — and at its contact his
 * distance and whether it hurt. */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
b.settings.devMode = false; log('boot', JSON.stringify(await w.__fortBoot())); b.settings.devMode = false; w.__clockOn();
for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
const u = b.dkS().u; for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
for (const f of b.farmUnitsS()) f.st.awake = false;
b.dkTurn(u, true);
log('STOPS', JSON.stringify(Object.fromEntries(Object.keys(u.kind.use).map((k) => [k, u.atk[k] && [+(u.atk[k].stop || 0).toFixed(2), u.atk[k].rmFrom && u.atk[k].rmFrom.map((x) => +x.toFixed(2))]]))), 'maxReach', u.maxReach && u.maxReach.toFixed(2), 'scale', u.model.scale.x.toFixed(2), 'knBlade', u.knBlade && u.knBlade.toFixed(3), 'travel', !!u.dkTravel);
const C = b.camera.position, P = u.g.position, y0 = u.g.rotation.y; C.x = P.x + Math.sin(y0) * 3; C.z = P.z + Math.cos(y0) * 3; const home = [C.x, C.z];
let last = -1, cur = null;
for (let f = 0; f < 60 * 40; f++) {
  b.lookAt(P.x, C.y - 0.2, P.z);
  const hp0 = b.state().hp;
  w.__adv(1); C.x = home[0]; C.z = home[1]; for (const g of b.farmUnitsS()) g.st.awake = false;
  const s = u.st, d = Math.hypot(P.x - C.x, P.z - C.z);
  if (s.atk >= 0 && (last < 0 || s.atk < last - 0.05)) { const A = u.atk[s.swing]; cur = { k: s.swing, d0: +d.toFixed(2), stop: A.stop, rmStop: A.rmStop && A.rmStop.map((x) => +x.toFixed(2)), rmFrom: A.rmFrom && JSON.stringify(A.rmFrom).slice(0, 40), reach: +A.reach.toFixed(2), hit: false }; }
  if (cur && s.atk >= 0) { const A = u.atk[s.swing]; if (!cur.dC && s.atk >= A.wind) cur.dC = +d.toFixed(2); if (b.state().hp < hp0) cur.hit = true; }
  if (cur && s.atk < 0) { log('SW', JSON.stringify(cur)); cur = null; }
  if (f % 30 === 0 && f < 900) log('TR', (f / 60).toFixed(1), 'pos', P.x.toFixed(2), P.z.toFixed(2), 'd', d.toFixed(2), 'atk', s.atk.toFixed(2), s.swing, 'cur', u.cur && u.cur.getClip().name, 'w', u.cur && u.cur.getEffectiveWeight().toFixed(2), 'cool', (s.cool || 0).toFixed(2), 'rm', !!u.dkRM, 'face', (u.faceOff || 0).toFixed(2), 'wallNear', b.keepWallNearS ? 1 : '-');
  last = s.atk; b.heal();
}
log('SUM');
