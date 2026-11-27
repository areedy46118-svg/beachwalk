/* THE KICK ON Q (2026-11-25, the owner: IMG_7253 — "a kick like in other games like dark messiah that knocks people over and they get
 * back up sometimes too … if it a death kill make them fly further … bosses should not be knocked over easy"). The first castle, its
 * men awake: one stood 1.4 m in front of you, facing you, kicked (`startKick`, the real key's path) `&n=` times, a fresh man each time
 * (half of them mid-wind-up): hurt, shoved how far in 0.8 s, stunned, down, up again when; then `&kills=` men on 1 health kicked —
 * how far the body flew; then the paladin (`dkSlot`, a boss) kicked `&boss=` times — down? shoved? Stills of the leg (`&shots=1`).
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/kick.js&n=12&kills=5&boss=8&shots=1' <out> */
const Q = new URLSearchParams(location.search), N = +(Q.get('n') || 12), KILLS = +(Q.get('kills') || 5), BOSS = +(Q.get('boss') || 8);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS(), C = b.camera, f2 = (v) => (+v).toFixed(2);
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = true;
for (let i = 0; i < 60 && !b.KICK.ready; i++) { w.__adv(1); await sleep(50); }
log('kick ready', b.KICK.ready);
const P0 = C.position.clone(); const DK = b.dkSlotS(); if (DK.unit) { DK.unit.g.visible = false; DK.unit.st.awake = false; }
const place = (u, d) => { u.g.position.set(P0.x, u.g.position.y, P0.z - d); u.g.rotation.y = 0; C.position.copy(P0); b.camBaseY = P0.y; b.lookAt(P0.x, P0.y - 0.35, P0.z - d); };
const used = new Set();
// (a man in the street — the hidden ones in the houses take no blow; reused, a fresh one when he can)
let rr = 0; const fresh = () => { const out = units().filter((x) => x.st.alive && x.model && x.g.visible && x.farm && x.farm.out); if (!out.length) return null; const u = out.find((x) => !used.has(x)) || out[(rr++) % out.length]; used.add(u); u.st.down = 0; u.st.knocked = false; return u; };
const kickOnce = (u, d, windUp) => {
  place(u, d); u.st.awake = true; u.st.hp = Math.max(u.st.hp, 3); u.st.down = 0; u.st.stun = 0;
  for (let i = 0; i < 6; i++) { place(u, d); w.__adv(1); }
  if (windUp && u.atk) { const k = Object.keys(u.atk).find((k2) => u.clips[u.atk[k2].clip]); if (k) { u.st.swing = k; u.st.atk = 0.05; } }
  w.__kickDbg = []; b.KICK.cd = 0; const ok = b.startKick(); const p0 = u.g.position.clone(), hp0 = u.st.hp;
  let downAt = -1, upAt = -1, stun = 0;
  for (let i = 0; i < 300; i++) { C.position.copy(P0); if (!b.KICK.struck) { u.g.position.set(P0.x, u.g.position.y, P0.z - d); p0.copy(u.g.position); } w.__adv(1); stun = Math.max(stun, u.st.stun || 0); if (downAt < 0 && (u.st.down || 0) > 0) downAt = i; if (downAt >= 0 && upAt < 0 && !((u.st.down || 0) > 0)) upAt = i; if (i === 48) u.pushed = Math.hypot(u.g.position.x - p0.x, u.g.position.z - p0.z); if (i > 60 && downAt < 0) break; }
  if (w.__kickDbg && w.__kickDbg.length) log('   DBG', u.kindName, '|', w.__kickDbg.slice(0, 6).join(' || ')); else log('   DBG none within 3 m');
  return { ok, hurt: hp0 - u.st.hp, pushed: u.pushed || 0, stun, down: downAt >= 0, downAt, upAt, alive: u.st.alive, last: b.KICK.lastHit && b.KICK.lastHit.u === u };
};
let downs = 0, ups = 0;
for (let k = 0; k < N; k++) {
  const u = fresh(); if (!u) break;
  const r = kickOnce(u, 1.4, k % 2 === 1);
  if (r.down) downs++; if (r.upAt >= 0) ups++;
  log('kick', k, k % 2 ? '(he was winding up)' : '', '| started', r.ok, 'struck him', r.last, '| hurt', r.hurt, '| shoved', f2(r.pushed), 'm in 0.8 s | stun', f2(r.stun), '| DOWN', r.down, r.down ? 'up again after ' + ((r.upAt - r.downAt) / 60).toFixed(1) + ' s' : '');
  if (Q.get('shots') && k === 0) { /* (stills taken on the next kick below) */ }
}
log('men kicked', N, '| went down', downs, '| got up again', ups);
// the stills: the leg up, out, coming down — from your eye, a man in front
if (Q.get('shots')) {
  const u = fresh(); place(u, 1.4); for (let i = 0; i < 10; i++) { place(u, 1.4); w.__adv(1); }
  b.KICK.cd = 0; b.startKick();
  for (let i = 0; i < 14; i++) { C.position.copy(P0); w.__adv(1); if (i === 1 || i === 4 || i === 9 || i === 12) { b.renderer.render(b.scene, C); shot('kick_' + i, +(Q.get('shotw') || 420), 1.0); } }
}
// the kills: how far the body goes
for (let k = 0; k < KILLS; k++) {
  const u = fresh(); if (!u) break;
  place(u, 1.4); for (let i = 0; i < 6; i++) { place(u, 1.4); w.__adv(1); }
  u.st.hp = 1; const p0 = u.g.position.clone();
  b.KICK.cd = 0; b.startKick();
  let far = 0, top = 0, along = 0, side = 0;
  for (let i = 0; i < 240; i++) { C.position.copy(P0); if (!b.KICK.struck) { u.g.position.set(P0.x, u.g.position.y, P0.z - 1.4); p0.copy(u.g.position); } w.__adv(1); const R = u.rag; if (R && R.parts) { const H = (R.byName && R.byName.Character1_Hips) || R.parts[0]; far = Math.max(far, Math.hypot(H.p.x - p0.x, H.p.z - p0.z)); top = Math.max(top, H.p.y - p0.y); along = p0.z - H.p.z; side = H.p.x - p0.x; } }
  log('kill', k, '| dead', !u.st.alive, '| ragdoll', !!u.rag, 'died standing', !!u.zDie, '| body flew', f2(far), 'm, hips up to', f2(top), 'm | came to rest', f2(along), 'm ALONG the kick,', f2(side), 'm across');
}
// the boss
if (DK.unit && BOSS) {
  const u = DK.unit; u.g.visible = true; u.st.awake = true; let bd = 0, bp = [];
  for (let k = 0; k < BOSS; k++) { u.st.hp = Math.max(u.st.hp, 50); const r = kickOnce(u, 1.7, k % 2 === 1); if (r.down) bd++; bp.push(f2(r.pushed)); }
  log('BOSS (the paladin) kicked', BOSS, '| down', bd, '| shoved', bp.join(' '), 'm');
}
log('DONE');
