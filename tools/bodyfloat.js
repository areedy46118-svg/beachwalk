/* DO THE DEAD FLOAT? (2026-11-25, the owner, again: "farmers bodies still float around after death this should never happen"). The
 * first castle booted, its men awake in the street; one at a time, stood 2.2 m in front of you, killed — by the blade (`&how=cut`:
 * a light and a heavy, the katana's own swings), or a plain blow through the fight's door (`hurt`, light / heavy), or the rare
 * death on his feet forced (`zdie`), or the water ball (`ball`) — and EVERY body then followed for 15 s of the game's clock: the
 * hips over the floor under them, the lowest joint against that floor, how far the body drifted after 3 s, the fastest joint after
 * 3 s. FLOAT = hips over 0.6 m up after 3 s, or a joint 0.15 m clear of the floor with nothing under it, or a drift > 0.3 m late.
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/bodyfloat.js&how=hurt,cut,zdie,ball&n=3' <out> */
const Q0 = new URLSearchParams(location.search), FILM = !!Q0.get('film');
const Q = Q0, HOWS = (Q.get('how') || 'hurt,cut,zdie,ball').split(','), N = +(Q.get('n') || 3);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS(), T = b.THREE, C = b.camera, f2 = (v) => (+v).toFixed(2);
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = true;
const P0 = C.position.clone(), yaw0 = 0;
const floor = (x, z, y) => { const g = b.groundUnderS(x, z, y + 0.5); return Number.isFinite(g) ? g : 0; };
const watch = [];
const kill = async (u, how, k) => {
  const p = u.g.position; p.set(P0.x, p.y, P0.z - 2.2); u.g.rotation.y = 0; u.st.awake = true; u.st.atk = -1; u.st.cool = 3;
  b.look(Math.PI, -0.05); C.position.copy(P0); b.camBaseY = P0.y;
  for (let i = 0; i < 4; i++) w.__adv(1);
  if (how === 'zdie') w.__bwZDieAll = true; else w.__bwZDieAll = 0;
  const heavy = k % 2 === 1;
  const blk = u.kind.block; u.kind.block = 0; u.st.block = 0;
  const force = (P, set) => { for (let r = 0; r < 4 && u.st.alive; r++) { u.st.hp = 1; u.st.block = 0; if (set) set(); b.hurtMutant(u, 5, P); for (let i = 0; i < 3; i++) w.__adv(1); } };
  if (how === 'blast') force(heavy ? 1 : 0, () => { u.st.killBlast = heavy ? 1 : 0.5; });
  else if (how === 'mace') force(1, () => { u.st.killMace = true; });
  else if (how === 'gun') force(0, () => { u.st.gunHead = true; });
  else if (how === 'over') force(1, () => { u.st.hpBefore = 1; });
  u.kind.block = blk;
  if (how === 'hurt') { u.st.hp = 1; b.hurtMutant(u, 5, heavy ? 1 : 0); }
  else if (how === 'zdie') { u.st.hp = 1; b.hurtMutant(u, 5, 0); }
  else if (how === 'cut') { u.st.hp = 1; b.lookAt(p.x, p.y + 1.3, p.z); b.startDig(heavy ? 1 : 0); for (let i = 0; i < 60 && u.st.alive; i++) { C.position.copy(P0); b.lookAt(p.x, p.y + 1.3, p.z); w.__adv(1); } }
  else if (how === 'ball') { u.st.hp = 1; b.lookAt(p.x, p.y + 1.1, p.z); for (let i = 0; i < 400 && b.seaBall.cd > 0; i++) w.__adv(1); b.seaBallFire(); for (let i = 0; i < 60 && u.st.alive; i++) w.__adv(1); }
  w.__bwZDieAll = 0;
  watch.push({ u, how: how + (heavy ? '-heavy' : '-light'), t0: 0, p3: null, worst: { hips: 0, gap: 0, late: 0, drift: 0 } });
  log('killed', how, heavy ? 'heavy' : 'light', '| alive', u.st.alive, '| rag', !!u.rag, '| zDie', !!u.zDie);
};
if (HOWS.includes('ball')) { b.addToInventory(b.katanaItem); if (b.state().equipped !== b.katanaItem.name) b.toggleEquip(b.katanaItem); b.addToInventory(b.seaArtItem); b.attachArtifact(b.seaArtItem, b.katanaItem); }
else { b.addToInventory(b.katanaItem); if (b.state().equipped !== b.katanaItem.name) b.toggleEquip(b.katanaItem); }
let used = new Set();
for (const how of HOWS) for (let k = 0; k < N; k++) {
  const u = units().find((x) => x.st.alive && x.model && x.g.visible && !used.has(x)) || units().find((x) => x.st.alive && x.model && !used.has(x));
  if (!u) { log('no man left'); break; }
  used.add(u); u.g.visible = true;
  await kill(u, how, k);
  // follow every body so far for 3 s between kills
  for (let i = 0; i < 180; i++) { C.position.copy(P0); w.__adv(1); for (const W of watch) step(W); }
}
function step(W) {
  const u = W.u; if (u.st.alive) { W.alive = true; return; } W.alive = false; W.t0 += 1 / 60;
  const R0 = u.rag;
  if (W.t0 <= 3 && R0 && R0.parts) {   // (the fall: how far the body glides while still up on its feet, and how much its feet move under it)
    const H = (R0.byName && R0.byName.Character1_Hips) || R0.parts[0], hp = H.p, gf = floor(hp.x, hp.z, hp.y);
    const feet = R0.parts.filter((q) => /Foot|ToeBase/.test(q.name || ''));
    if (W.fp) { const d = Math.hypot(hp.x - W.fp.x, hp.z - W.fp.z); if (hp.y - gf > 0.6) { W.glide = (W.glide || 0) + d; W.upT = (W.upT || 0) + 1 / 60;
        const fm = feet.length && W.ff ? feet.reduce((s2, q, i) => s2 + Math.hypot(q.p.x - W.ff[i].x, q.p.z - W.ff[i].z), 0) / feet.length : 0; W.footMove = (W.footMove || 0) + fm; } }
    W.fp = hp.clone(); W.ff = feet.map((q) => q.p.clone());
    if (FILM && W === watch[0] && Math.round(W.t0 * 60) % 9 === 0 && W.t0 < 2.6) { const c0 = C.position.clone(), q0 = C.quaternion.clone(); C.position.set(hp.x + 3.2, 1.2, hp.z + 0.4); C.lookAt(hp.x, 0.8, hp.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('fall_' + W.t0.toFixed(2), 260, 1.0); C.position.copy(c0); C.quaternion.copy(q0); }
  }
  const R = u.rag; let hip, lo = 1e9, parts = [];
  if (R && R.parts) { parts = R.parts.map((q) => q.p); hip = (R.byName && (R.byName.Character1_Hips || R.byName.mixamorigHips)) ? (R.byName.Character1_Hips || R.byName.mixamorigHips).p : R.parts[0].p; }
  else { if (!u.model) return; const hb = u.model.getObjectByProperty('isBone', true); hip = hb ? hb.getWorldPosition(new T.Vector3()) : u.g.position; }
  for (const p of parts) { const g = floor(p.x, p.z, p.y); lo = Math.min(lo, p.y - g); }
  const gh = floor(hip.x, hip.z, hip.y), hipsUp = hip.y - gh;
  if (W.t0 > 3) {
    if (!W.p3) W.p3 = hip.clone(); else W.worst.drift = Math.max(W.worst.drift, hip.distanceTo(W.p3));
    W.worst.hips = Math.max(W.worst.hips, hipsUp);
    if (parts.length) W.worst.gap = Math.max(W.worst.gap, lo);
    if (W.prev) { const v = hip.distanceTo(W.prev) * 60; if (v > W.worst.late) { W.worst.late = v; W.jump = { t: W.t0.toFixed(2), from: W.prev.toArray().map((x) => x.toFixed(2)).join(','), to: hip.toArray().map((x) => x.toFixed(2)).join(','), settled: R ? [R.settled, R.sleep, R.asleep, R.t && R.t.toFixed ? R.t.toFixed(2) : R.t].join('/') : 'no rag', zDie: !!u.zDie, parts: R ? R.parts.length : 0 }; } }
  }
  W.prev = hip.clone(); W.last = { hipsUp, lo, hasRag: !!R, gone: !u.g.visible || u.retired };
}
// and 15 s for the last ones
for (let i = 0; i < 900; i++) { C.position.copy(P0); w.__adv(1); for (const W of watch) step(W); }
let bad = 0;
for (const W of watch) {
  const f = W.worst.hips > 0.6 || W.worst.gap > 0.15 || W.worst.drift > 0.3;
  if (f) bad++;
  if (W.alive !== false) { log('alive', W.how, '(the blow did not kill him)'); continue; }
  if (f && W.jump) log('   the jump:', JSON.stringify(W.jump));
  log('   the fall: up on his feet', (W.upT || 0).toFixed(2), 's, the body glided', (W.glide || 0).toFixed(2), 'm while his feet moved', (W.footMove || 0).toFixed(2), 'm', '| stagger', !!(W.u.rag && W.u.rag.stag), 'steps', W.u.rag && W.u.rag.nSteps);
  log(f ? 'FLOAT' : 'ok   ', W.how.padEnd(11), '| after 3 s: hips up to', f2(W.worst.hips), 'm | lowest joint clear of the floor up to', f2(W.worst.gap), '| drift', f2(W.worst.drift), '| hips fastest', f2(W.worst.late), 'm/s | at the end hips', f2(W.last.hipsUp), 'rag', W.last.hasRag, 'gone', W.last.gone);
}
log('bodies', watch.length, '| floating', bad);
log('DONE');
