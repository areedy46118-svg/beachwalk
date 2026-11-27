/* THE GARRISON READING THE FIGHT, AGAINST ONE THAT DOES NOT (2026-11-24, the owner: "do 7 but dont make the fight easier"). The
 * natural fight, but you fight back as a player does: a light cut at the nearest man in reach every ~1.3 s, now and then a feint (a
 * charge started and left for the guard), and the guard up when a man is winding up at you within 2.5 m (dropped after his blow).
 * You are healed every frame and pinned. Counted per minute: the hurts you took, the blows they threw, kills; and the reading's own
 * events (back-offs, rushes, feint checks) and how spread round you the pressers are. Run twice, `&off=1` with the reading off.
 * PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/fightread.js&secs=90' <out> */
const Q = new URLSearchParams(location.search), SECS = +(Q.get('secs') || 90);
if (Q.get('off')) w.__bwNoRead = true;
if (Q.get('plantoff')) w.__plantOff = true;   // (the planted feet off, for a before-and-after: `ragPlantInit`)
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()), 'reading', Q.get('off') ? 'OFF' : 'on');
w.__clockOn();
const units = () => b.farmUnitsS();
// (&dead=1, 2026-11-25 — the owner: "farmers bodies still float around after death this should never happen": every man from the frame
// he dies, his hips over the floor under them, his lowest joint clear of the floor, the drift and the fastest move once he has fallen)
const DEAD = !!Q.get('dead'), DEADS = [], FILM = +(Q.get('film') || 0);
const gfl = (x, z, y) => { const g = b.groundUnderS(x, z, y + 0.4); return Number.isFinite(g) ? g : 0; };
function deadStep(D) {
  const u = D.u, R = u.rag; D.t += 1 / 60;
  if (FILM && DEADS.indexOf(D) < FILM && D.t < 1.35 && Math.round(D.t * 60) % 5 === 1) { const C2 = b.camera; const q0 = C2.quaternion.clone(); const hp = (R && R.parts ? ((R.byName && R.byName.Character1_Hips) || R.parts[0]).p : u.g.position); C2.lookAt(hp.x, hp.y + 0.3, hp.z); C2.updateMatrixWorld(true); b.renderer.render(b.scene, C2); shot('death' + DEADS.indexOf(D) + '_' + D.t.toFixed(2), 240, 1.0); C2.quaternion.copy(q0); }
  let hip = null, lo = 1e9;
  if (R && R.parts) { const H = R.byName && (R.byName.Character1_Hips || R.byName.mixamorigHips); hip = (H || R.parts[0]).p; for (const q of R.parts) lo = Math.min(lo, q.p.y - gfl(q.p.x, q.p.z, q.p.y)); }
  else if (u.model && u.g.visible) { let hb = null; u.model.traverse((o) => { if (!hb && o.isBone && /Hips/.test(o.name)) hb = o; }); if (hb) hip = hb.getWorldPosition(new b.THREE.Vector3()); }
  if (!hip) return;
  if (R && R.parts && !D.v0 && D.t > 0.06) { const H = (R.byName && R.byName.Character1_Hips) || R.parts[0], ft = R.parts.filter((q) => /Foot|ToeBase/.test(q.name || ''));
    const sp = (q) => Math.hypot(q.p.x - q.pp.x, q.p.z - q.pp.z) * 60 * 3;   // (per substep → per second, RAG_SUB 3)
    D.v0 = { hips: +sp(H).toFixed(1), feet: ft.length ? +(ft.reduce((a2, q) => a2 + sp(q), 0) / ft.length).toFixed(1) : null, before: D.vBefore, stag: !!R.stag, slide: R.slide, fric: !!ft.length }; }
  if (D.t <= 3 && R && R.parts) { const gh = gfl(hip.x, hip.z, hip.y), feet = R.parts.filter((q) => /Foot|ToeBase/.test(q.name || ''));
    if (D.fp && hip.y - gh > 0.6) { D.glide = (D.glide || 0) + Math.hypot(hip.x - D.fp.x, hip.z - D.fp.z); D.upT = (D.upT || 0) + 1 / 60; if (D.ff && feet.length) D.footMove = (D.footMove || 0) + feet.reduce((s2, q, i) => s2 + Math.hypot(q.p.x - D.ff[i].x, q.p.z - D.ff[i].z), 0) / feet.length; }
    D.fp = hip.clone(); D.ff = feet.map((q) => q.p.clone()); D.stag = !!R.stag; }
  if (D.t > 2) { D.worst.hips = Math.max(D.worst.hips, hip.y - gfl(hip.x, hip.z, hip.y)); if (lo < 1e8) D.worst.gap = Math.max(D.worst.gap, lo);
    if (D.prev) { const v = hip.distanceTo(D.prev) * 60; if (v > D.worst.late) { D.worst.late = v; if (v > 2) D.jump = { t: +D.t.toFixed(2), rag: !!R, zDie: !!u.zDie, y: +hip.y.toFixed(2) }; } } }
  if (D.t > 3) { if (!D.p3) D.p3 = hip.clone(); else D.worst.drift = Math.max(D.worst.drift, hip.distanceTo(D.p3)); }
  // (the DRAWN floor under him, a ray straight down onto the castle as it is drawn, against the floor the game walks on)
  if (D.t > 4 && !D.drawn && R && R.parts) { let worst = -9, at = null; const T3 = b.THREE;
    for (const q of R.parts) { const h = b.worldDrawnHitS(new T3.Vector3(q.p.x, q.p.y + 1.2, q.p.z), new T3.Vector3(0, -1, 0), 4, 0); if (!h) continue; const dy = q.p.y - h.point.y; if (dy > worst) { worst = dy; at = { joint: q.name, drawnFloor: +h.point.y.toFixed(2), walkFloor: +gfl(q.p.x, q.p.z, q.p.y).toFixed(2), jointY: +q.p.y.toFixed(2) }; } }
    let lo2 = 9; for (const q of R.parts) { const h = b.worldDrawnHitS(new T3.Vector3(q.p.x, q.p.y + 1.2, q.p.z), new T3.Vector3(0, -1, 0), 4, 0); if (h) lo2 = Math.min(lo2, q.p.y - h.point.y); }
    D.drawn = { lowestOverDrawn: +lo2.toFixed(2), highest: at }; }
  D.prev = hip.clone();
}
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = false;
const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.visible = false; }
const kat = b.katanaItem; b.addToInventory(kat); b.toggleEquip(kat);
const cam = b.camera.position, home = [cam.x, cam.z];
let hurts = 0, thrown = 0, kills = 0, back = 0, rush = 0, feints = 0, checks = 0, spread = [], nextCut = 60, guardFor = null, guardT = 0;
const last = new Map();
for (let f = 0; f < SECS * 60; f++) {
  const us = units().filter((u) => u.st.alive && u.model && u.g.visible && u.farm && u.farm.out);
  let tgt = null, bd = 99; for (const u of us) { const d = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z); if (d < bd) { bd = d; tgt = u; } }
  if (tgt) b.lookAt(tgt.g.position.x, tgt.g.position.y + 1.2, tgt.g.position.z);
  // a man winding up at you: guard (most of the time), drop it after his strike
  const winder = us.find((u) => u.st.atk >= 0 && u.atk && u.atk[u.st.swing] && u.st.atk < u.atk[u.st.swing].wind && Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z) < 2.5);
  if (!guardFor && winder && Math.random() < 0.04) { b.setGuardTest(true, 0); guardFor = winder; guardT = 0; }
  if (guardFor) { guardT++; const A = guardFor.atk[guardFor.st.swing]; if (!(guardFor.st.atk >= 0) || !A || guardFor.st.atk > A.wind + A.strike + 0.1 || guardT > 120) { b.setGuardTest(false); guardFor = null; } }
  if (!guardFor && f >= nextCut && tgt && bd < 2.6) {
    if (Math.random() < 0.25) { b.startWind(); feints++; for (let i = 0; i < 6; i++) w.__adv(1); b.raiseGuard(); for (let i = 0; i < 8; i++) w.__adv(1); b.setGuardTest(false); }
    else b.startDig(0);
    nextCut = f + 70 + ((Math.random() * 40) | 0);
  }
  const hp0 = b.state().hp, alive0 = us.length;
  w.__adv(1); cam.x = home[0]; cam.z = home[1]; if (P0.unit) P0.unit.st.awake = false;
  if (b.state().hp < hp0) hurts++;
  b.heal();
  for (const u of units()) {
    const s = u.st, L = last.get(u) || {};
    if (s.atk >= 0 && !(L.atk >= 0)) thrown++;
    if (s.bkT > 0 && !(L.bk > 0)) back++;
    if ((s.revengeUntil || 0) > (L.rev || 0) + 0.5) rush++;
    if (L.alive && !s.alive) { kills++; if (DEAD) DEADS.push({ vBefore: L.pos ? +(Math.hypot(u.g.position.x - L.pos[0], u.g.position.z - L.pos[1]) * 60).toFixed(1) : null, u, t: 0, worst: { hips: 0, gap: 0, drift: 0, late: 0 }, how: (u.zDie ? 'zDie ' : '') + (u.st.killBlast ? 'blast ' : '') + (u.blow ? 'blow' : '') }); }
    if (L.atk >= 0 && s.atk >= 0 && s.atk < L.atk - 0.05 && s.swing === L.sw) checks++;
    L.pos = [u.g.position.x, u.g.position.z]; L.atk = s.atk; L.bk = s.bkT || 0; L.rev = s.revengeUntil || 0; L.alive = s.alive; L.sw = s.swing; last.set(u, L);
  }
  if (DEAD) for (const D of DEADS) deadStep(D);
  if (f % 30 === 0) { const P = units().filter((u) => u.pk && u.pk.role === 'press' && u.st.alive && Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z) < 6); if (P.length >= 2) { const a = P.map((u) => Math.atan2(u.g.position.x - cam.x, u.g.position.z - cam.z)).sort((x, y) => x - y); let mx = 0; for (let i = 0; i < a.length; i++) { const g = i ? a[i] - a[i - 1] : a[0] + Math.PI * 2 - a[a.length - 1]; mx = Math.max(mx, g); } spread.push(Math.round((Math.PI * 2 - mx) * 57.3)); } }
}
for (let i = 0; DEAD && i < 600; i++) { w.__adv(1); cam.x = home[0]; cam.z = home[1]; b.heal(); for (const D of DEADS) deadStep(D); }   // (10 s more for the last of them)
if (DEAD) { let nb = 0; for (const D of DEADS) { const fl = D.worst.hips > 0.6 || D.worst.gap > 0.2 || D.worst.drift > 0.3; if (fl) nb++;
  log(fl ? 'FLOAT' : 'ok   ', 'body', D.how, '| watched', D.t.toFixed(1), 's | after 2 s: hips up to', D.worst.hips.toFixed(2), 'lowest joint clear', D.worst.gap.toFixed(2), '| drift after 3 s', D.worst.drift.toFixed(2), '| fastest after 2 s', D.worst.late.toFixed(1), 'm/s', D.jump ? '| jump ' + JSON.stringify(D.jump) : '', '| V0', JSON.stringify(D.v0), '| glide', (D.glide || 0).toFixed(2), '| rag', !!D.u.rag, 'shown', D.u.g.visible); }
  const gl = DEADS.map((D) => D.glide || 0).sort((x, y) => x - y), ft = DEADS.map((D) => D.footMove || 0).sort((x, y) => x - y), up = DEADS.map((D) => D.upT || 0).sort((x, y) => x - y);
  const md = (a) => a.length ? a[a.length >> 1].toFixed(2) : '-', mx = (a) => a.length ? a[a.length - 1].toFixed(2) : '-';
  for (const grp of [true, false]) { const G = DEADS.filter((D) => !!D.stag === grp); const g2 = G.map((D) => D.glide || 0).sort((x, y) => x - y), f2b = G.map((D) => D.footMove || 0).sort((x, y) => x - y); log('  ', grp ? 'staggers' : 'others', G.length, '| glide median', g2.length ? g2[g2.length >> 1].toFixed(2) : '-', '| feet median', f2b.length ? f2b[f2b.length >> 1].toFixed(2) : '-'); }
  log('DEAD bodies', DEADS.length, 'floating', nb, '| THE FALL, upright: glide median', md(gl), 'max', mx(gl), 'm | feet slid median', md(ft), 'max', mx(ft), 'm | up on his feet median', md(up), 'max', mx(up), 's | staggers', DEADS.filter((D) => D.stag).length); }
const m = SECS / 60, med = (a) => { a = a.slice().sort((x, y) => x - y); return a.length ? a[a.length >> 1] : '-'; };
log('PER MINUTE | hurts taken', (hurts / m).toFixed(1), '| blows thrown', (thrown / m).toFixed(1), '| kills', (kills / m).toFixed(1), '| back-offs', back, 'rushes', rush, 'feints', feints, 'checked by them', checks, '| pressers spread round you (deg, median)', med(spread));
