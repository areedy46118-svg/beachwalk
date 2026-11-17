/* THE SAMURAI, HONESTLY (2026-11-16, the owner: "his model keeps stretching … a few of his hits are bullshit … his
 * sword isnt even swung but you get hurt"). Not part of the game. Run headless:
 *   PB_PORT=4231 sh tools/probe.sh 'evalFile&f=/tools/samhonest.js&n=3600&raw=0' /tmp/x
 * A hands-off fight on a fake clock, you pinned in place facing him and healed. Two things measured:
 *  STRETCH: every edge of his skinned meshes, skinned on the CPU from the bones as drawn, against its bind length;
 *           per frame the worst ratio and how many edges are past 1.6x, grouped by what he was doing, with the bone
 *           that owns the worst edge. (`raw=1` turns his post-mixer layers off, `window.__samRaw`, for a baseline.)
 *  HITS:    every blow that took health — the swing, its clock, which part of the chain was in you (blade, forearm,
 *           upper arm, leg), the steel's nearest approach to your body, the tip's speed, and whether the steel was
 *           anywhere on your screen. A POV still of the first few blows the steel was NOT in.
 *  `kill=1` then kills him and measures the stretch through the ragdoll. */
const Q = new URLSearchParams(location.search);
const N = +(Q.get('n') || 3600), RAW = Q.get('raw') === '1', KILL = Q.get('kill') === '1', SHOTS = +(Q.get('shots') || 6);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/contact.js');
const u = await w.__roomBoot('dojo', 'assets/samurai.glb');
if (!u) { log('no samurai'); return; }
const it = b.interactables.find((i) => /katana/i.test(typeof i.label === 'function' ? i.label() : (i.label || '')));
log('katana', !!it); if (it) (it.data && it.data.onActivate || it.onActivate)();
b.wakeSamurai();
for (let k = 0; k < 300; k++) { w.__cadv(1); b.heal(); }
let m0 = 0; while ((b.frozen() || b.mutCut) && m0++ < 900) w.__cadv(1);
u.g.visible = true; u.st.awake = true; u.holdAnim = false;
b.settings.devMode = false;
w.__samRaw = RAW;
const V3 = b.camera.position.constructor, M4 = u.g.matrixWorld.constructor;
const BN = {}; u.model.traverse((o) => { if (o.isBone) BN[o.name] = o; });
const kat = BN.Katana, tip = BN['DEF-katana_tip'];
log('bones', Object.keys(BN).length, 'katana', !!kat, 'tip', !!tip, 'raw', RAW);

// ---- the skin
const meshes = []; u.model.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
const SK = meshes.map((m) => {
  const g = m.geometry, P = g.attributes.position, I = g.index, n = P.count;
  const bind = new Float32Array(n * 3); const v = new V3();
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.bindMatrix); bind[i * 3] = v.x; bind[i * 3 + 1] = v.y; bind[i * 3 + 2] = v.z; }
  const seen = new Set(), E = [];
  const add = (a, c) => { const k = a < c ? a * n + c : c * n + a; if (seen.has(k)) return; seen.add(k); const d = Math.hypot(bind[a * 3] - bind[c * 3], bind[a * 3 + 1] - bind[c * 3 + 1], bind[a * 3 + 2] - bind[c * 3 + 2]); if (d > 0.004) E.push(a, c, d); };
  if (I) for (let i = 0; i < I.count; i += 3) { const a = I.getX(i), c = I.getX(i + 1), e = I.getX(i + 2); add(a, c); add(c, e); add(e, a); }
  const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), top = new Uint16Array(n);
  for (let i = 0; i < n; i++) { let best = -1, bw = -1; for (let k = 0; k < 4; k++) { si[i * 4 + k] = SI.getComponent(i, k); sw[i * 4 + k] = SW.getComponent(i, k); if (sw[i * 4 + k] > bw) { bw = sw[i * 4 + k]; best = si[i * 4 + k]; } } top[i] = best; }
  return { m, n, bind, E: new Float32Array(E), si, sw, top, cur: new Float32Array(n * 3), bm: new Float32Array(m.skeleton.bones.length * 16) };
});
log('skinned meshes', SK.map((s) => s.m.name + ':' + s.n + 'v/' + s.E.length / 3 + 'e').join(' '));
const _m = new M4();
let REC_IDLE = false;
function stretch() {
  let worst = 0, wBone = '', over = 0, over2 = 0;
  for (const S of SK) {
    const sk = S.m.skeleton, bm = S.bm;
    for (let j = 0; j < sk.bones.length; j++) { _m.multiplyMatrices(sk.bones[j].matrixWorld, sk.boneInverses[j]); bm.set(_m.elements, j * 16); }
    const { n, bind, si, sw, cur } = S;
    for (let i = 0; i < n; i++) {
      const x = bind[i * 3], y = bind[i * 3 + 1], z = bind[i * 3 + 2]; let ox = 0, oy = 0, oz = 0;
      for (let k = 0; k < 4; k++) { const wt = sw[i * 4 + k]; if (!wt) continue; const e = si[i * 4 + k] * 16;
        ox += wt * (bm[e] * x + bm[e + 4] * y + bm[e + 8] * z + bm[e + 12]); oy += wt * (bm[e + 1] * x + bm[e + 5] * y + bm[e + 9] * z + bm[e + 13]); oz += wt * (bm[e + 2] * x + bm[e + 6] * y + bm[e + 10] * z + bm[e + 14]); }
      cur[i * 3] = ox; cur[i * 3 + 1] = oy; cur[i * 3 + 2] = oz;
    }
    // (each mesh's own scale: its median edge ratio on the first frame is taken as 1 — he was scaled after the bind)
    if (!S.sc) { const r = []; for (let q = 0; q < S.E.length; q += 3) { const a = S.E[q], c = S.E[q + 1]; r.push(Math.hypot(cur[a * 3] - cur[c * 3], cur[a * 3 + 1] - cur[c * 3 + 1], cur[a * 3 + 2] - cur[c * 3 + 2]) / S.E[q + 2]); } r.sort((x, y) => x - y); S.sc = r[r.length >> 1] || 1; }
    const sc = S.sc;
    const E = S.E;
    if (REC_IDLE) { S.idle = new Float32Array(E.length / 3); for (let q = 0; q < E.length; q += 3) { const a = E[q], c = E[q + 1]; S.idle[q / 3] = Math.max(1e-4, Math.hypot(cur[a * 3] - cur[c * 3], cur[a * 3 + 1] - cur[c * 3 + 1], cur[a * 3 + 2] - cur[c * 3 + 2])); } continue; }
    for (let q = 0; q < E.length; q += 3) {
      const a = E[q], c = E[q + 1];
      const d = Math.hypot(cur[a * 3] - cur[c * 3], cur[a * 3 + 1] - cur[c * 3 + 1], cur[a * 3 + 2] - cur[c * 3 + 2]) / (S.idle ? S.idle[q / 3] : E[q + 2] * sc);
      if (d > 1.6) over++; if (d > 2.2) over2++;
      if (d > worst) { worst = d; wBone = S.m.name + ':' + sk.bones[S.top[a]].name + '/' + sk.bones[S.top[c]].name; S.wv = a; }
    }
  }
  return { worst, wBone, over, over2 };
}
// ---- the forest roots: where each one should be (its idle offset off the bone it hangs off) against where it was drawn
const FOREST = { 'DEF-thighL': 'DEF-spine', 'DEF-thighR': 'DEF-spine', 'DEF-pelvisL': 'DEF-spine', 'DEF-pelvisR': 'DEF-spine',
  'DEF-breastL': 'DEF-spine003', 'DEF-breastR': 'DEF-spine003', 'DEF-shoulderL': 'DEF-spine003', 'DEF-shoulderR': 'DEF-spine003',
  'DEF-upper_armL': 'DEF-shoulderL', 'DEF-upper_armR': 'DEF-shoulderR' };
const fkOff = {};
{
  const ia = u.clips.idle, keep = [];
  for (const k in u.clips) { const a = u.clips[k]; keep.push([a, a.time, a.enabled, a.paused, a.getEffectiveWeight(), a.isRunning() || u.mixer._isActiveAction(a)]); }
  for (const k in u.clips) { const a = u.clips[k]; a.stop(); a.enabled = false; a.setEffectiveWeight(0); }
  ia.reset(); ia.play(); ia.enabled = true; ia.setEffectiveWeight(1); ia.paused = true; ia.time = 0.3;
  u.mixer.rawUpdate(0); u.model.updateMatrixWorld(true);
  REC_IDLE = true; stretch(); REC_IDLE = false;
  const inv = new M4();
  for (const c in FOREST) fkOff[c] = BN[c].getWorldPosition(new V3()).applyMatrix4(inv.copy(BN[FOREST[c]].matrixWorld).invert());
  ia.stop(); ia.enabled = false; ia.setEffectiveWeight(0);
  for (const [a, t, en, pa, wt, run] of keep) { if (run) a.play(); a.time = t; a.enabled = en; a.paused = pa; a.setEffectiveWeight(wt); }
  w.__cadv(1);
}
const drift = () => { let mx = 0, who = ''; for (const c in FOREST) { const want = fkOff[c].clone().applyMatrix4(BN[FOREST[c]].matrixWorld), d = BN[c].getWorldPosition(new V3()).distanceTo(want); if (d > mx) { mx = d; who = c; } } return [mx, who]; };
const DR = {}, drAll = [];
// calibrate the world scale: at frame 0 the median ratio should be ~1
{ const s = stretch(); log('first frame worst', s.worst.toFixed(2), s.wBone, 'over1.6', s.over); }

// ---- the hits
const cam = b.camera.position, home = cam.clone();
const tPrev = new V3(), tNow = new V3(), kNow = new V3(), tmp = new V3();
const torsoD = (p) => { const y = Math.max(cam.y - 1.15, Math.min(cam.y + 0.15, p.y)); return Math.hypot(p.x - cam.x, p.y - y, p.z - cam.z); };
const segD = (p, a, c) => { const ab = tmp.subVectors(c, a), t = Math.max(0, Math.min(1, new V3().subVectors(p, a).dot(ab) / (ab.lengthSq() || 1))); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
const onScr = (p) => { const q = p.clone().project(b.camera); return q.z < 1 && Math.abs(q.x) < 1 && Math.abs(q.y) < 1; };
const hits = [], byState = {}, worstFrames = []; let shots = 0, lastHitAt = 0, frames = 0;
const stateKey = () => { const c = u.cur && u.cur.getClip ? u.cur.getClip().name : '-'; return (u.st.atk >= 0 ? 'SW ' + u.st.swing : u.st.stun > 0 ? 'stun' : u.st.recoil > 0 ? 'recoil' : u.st.roar > 0 ? 'roar' : 'clip ' + c); };
tip.getWorldPosition(tPrev);
for (let f = 0; f < N; f++) {
  cam.x = home.x; cam.z = home.z;
  const P = u.g.position; b.lookAt(P.x, P.y + 1.5, P.z);
  const hp0 = b.state().hp, ha0 = u.hitAt || 0, nShur = (b.shurikens || []).length;
  w.__cadv(1);
  if (!u.st.alive) { log('he died at frame', f); break; }
  frames++;
  tip.getWorldPosition(tNow); kat.getWorldPosition(kNow);
  const tipSp = tNow.distanceTo(tPrev) * 60;
  { u.model.updateMatrixWorld(true); const [d, who] = drift(), k = stateKey(), D = DR[k] || (DR[k] = { n: 0, mx: 0, sum: 0, who: {}, big: 0 }); D.n++; D.sum += d; if (d > D.mx) D.mx = d; if (d > 0.03) { D.big++; D.who[who] = (D.who[who] || 0) + 1; } drAll.push(d); }
  if (f % 2 === 0) {
    const s = stretch(), k = stateKey(), B = byState[k] || (byState[k] = { n: 0, worst: 0, sum: 0, over: 0, bone: '' });
    B.n++; B.sum += s.worst; B.over += s.over; if (s.worst > B.worst) { B.worst = s.worst; B.bone = s.wBone; }
    if (s.worst > 1.8) worstFrames.push([f, +s.worst.toFixed(2), s.wBone, k, s.over]);
    if (Q.get('side') && s.worst > +Q.get('side') && (w.__sideN = (w.__sideN || 0)) < 6 && f - (w.__sideF || -99) > 40) {
      w.__sideN++; w.__sideF = f;
      const sv = cam.clone(), sq = b.camera.quaternion.clone(), ry = u.g.rotation.y + 1.2, P = u.g.position;
      const hid = []; b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite) && o.visible) { let x = o, mine = false; while (x) { if (x === u.g) { mine = true; break; } x = x.parent; } if (!mine) { hid.push(o); o.visible = false; } } });
      const fov0 = b.camera.fov; b.camera.fov = 38; b.camera.updateProjectionMatrix(); cam.set(P.x + Math.sin(ry) * 4.2, P.y + 1.3, P.z + Math.cos(ry) * 4.2); b.lookAt(P.x, P.y + 1.15, P.z); b.camera.updateMatrixWorld(true);
      shot('side_' + f + '_' + k.replace(/ /g, '_') + '_' + s.worst.toFixed(1), 420, 1.8);
      for (const o of hid) o.visible = true; cam.copy(sv); b.camera.quaternion.copy(sq); b.camera.fov = fov0; b.camera.updateProjectionMatrix();
      log('SIDE', f, k, s.worst.toFixed(2), s.wBone);
    }
  }
  if (b.state().hp < hp0) {
    const A = u.atk && u.atk[u.st.swing];
    const H = { f, sw: u.st.atk >= 0 ? u.st.swing : '(none)', t: +(u.st.atk).toFixed(3), wind: A ? A.wind : null, dmg: hp0 - b.state().hp };
    // the steel's nearest approach to your body
    let bd = 9; for (let i = 0; i <= 10; i++) bd = Math.min(bd, torsoD(kNow.clone().lerp(tNow, i / 10)));
    H.steel = +bd.toFixed(2); H.tipSp = +tipSp.toFixed(1);
    H.dist = +Math.hypot(P.x - cam.x, P.z - cam.z).toFixed(2);
    H.newPt = (u.hitAt || 0) !== ha0;
    if (H.newPt && u.hitPt) {
      const hp = u.hitPt, w2 = (n) => BN[n].getWorldPosition(new V3());
      const parts = { blade: segD(hp, kNow, tNow), fore: segD(hp, w2('DEF-forearmR'), w2('DEF-handR')), upper: segD(hp, w2('DEF-upper_armR'), w2('DEF-forearmR')),
        legR: Math.min(segD(hp, w2('DEF-thighR'), w2('DEF-shinR')), segD(hp, w2('DEF-shinR'), w2('DEF-footR')), segD(hp, w2('DEF-footR'), w2('DEF-toeR'))),
        legL: Math.min(segD(hp, w2('DEF-thighL'), w2('DEF-shinL')), segD(hp, w2('DEF-shinL'), w2('DEF-footL')), segD(hp, w2('DEF-footL'), w2('DEF-toeL'))) };
      H.part = Object.entries(parts).sort((a, c) => a[1] - c[1])[0][0];
      H.thigh = Math.min(segD(hp, w2('DEF-thighR'), w2('DEF-shinR')), segD(hp, w2('DEF-thighL'), w2('DEF-shinL'))) < 0.06;
      H.ptScr = onScr(hp);
    } else H.part = u.st.atk >= 0 ? 'fallback' : 'other';
    let vis = false; for (let i = 0; i <= 10; i++) if (onScr(kNow.clone().lerp(tNow, i / 10))) vis = true;
    H.steelOnScreen = vis;
    H.shur = (b.shurikens || []).length !== nShur || !!u.thr;
    hits.push(H);
    if (shots < SHOTS && (!vis || H.steel > 0.5 || H.tipSp < 2)) { shot('hit_' + shots + '_' + H.sw, 560, 1.6); shots++; }
    lastHitAt = f;
  }
  tPrev.copy(tNow);
  if (b.state().hp < 3) b.heal();
}
log('frames', frames, 'hits', hits.length, 'his hp', u.st.hp);
for (const H of hits) log('HIT', JSON.stringify(H));
const ks = Object.keys(byState).sort((a, c) => byState[c].worst - byState[a].worst);
for (const k of ks) { const B = byState[k]; log('STRETCH', k.padEnd(18), 'n', B.n, 'mean worst', (B.sum / B.n).toFixed(2), 'max', B.worst.toFixed(2), 'edges>1.6/frame', (B.over / B.n).toFixed(1), B.bone); }
drAll.sort((a, c) => a - c); log('DRIFT all: median', drAll[drAll.length >> 1].toFixed(3), '95%', drAll[drAll.length * 0.95 | 0].toFixed(3), '99%', drAll[drAll.length * 0.99 | 0].toFixed(3), 'max', drAll[drAll.length - 1].toFixed(3));
for (const k of Object.keys(DR).sort((a, c) => DR[c].mx - DR[a].mx)) { const D = DR[k]; log('DRIFT', k.padEnd(18), 'n', D.n, 'mean', (D.sum / D.n).toFixed(3), 'max', D.mx.toFixed(3), 'frames>3cm', D.big, JSON.stringify(D.who)); }
log('frames worse than 1.8:', worstFrames.length, JSON.stringify(worstFrames.slice(0, 30)));
if (Q.get('fount') === '1') {
  // THE FOUNTAIN: every 5 s you are put on the far side of it from him, 2.2 m off its axis; frames he stands in its pool
  const FX = 6000 - 0.947, FZ = 6000 - 0.015; let inPool = 0, minD = 9, n = 0, swings = 0;
  for (let f = 0; f < 60 * 40; f++) {
    if (f % 300 === 0) { const P = u.g.position, a = Math.atan2(P.z - FZ, P.x - FX) + Math.PI; cam.x = FX + Math.cos(a) * 2.2; cam.z = FZ + Math.sin(a) * 2.2; home.copy(cam); }
    cam.x = home.x; cam.z = home.z; const P = u.g.position; b.lookAt(P.x, P.y + 1.5, P.z);
    w.__cadv(1); if (b.state().hp < 3) b.heal(); if (!u.st.alive) break;
    const d = Math.hypot(P.x - FX, P.z - FZ); n++; if (d < 0.95) { inPool++; if (inPool % 5 === 1) log('  IN POOL f', f, 'd', d.toFixed(2), 'y', (P.y - 800).toFixed(2), 'atk', u.st.atk.toFixed(2), u.st.swing, 'thr', u.thr && u.thr.ph, 'stun', u.st.stun > 0, 'recoil', u.st.recoil > 0, 'down', u.st.down || 0, 'clip', u.cur && u.cur.getClip().name, 'me d', Math.hypot(cam.x - FX, cam.z - FZ).toFixed(2)); } if (d < minD) minD = d; if (u.st.atk >= 0 && u.st.atk < 0.02) swings++;
    if (f % 600 === 300) shot('fount_' + f, 560, 1.6);
    if (false) log('  fount f', f, 'him', (P.x - FX).toFixed(2), (P.z - FZ).toFixed(2), 'y', (P.y - 800).toFixed(2), 'd', d.toFixed(2), 'me', (cam.x - FX).toFixed(2), (cam.z - FZ).toFixed(2), 'vis', u.g.visible, 'atk', u.st.atk.toFixed(2), u.st.swing, 'thr', !!u.thr, 'path', u.path ? u.path.length : 0);
  }
  log('FOUNT frames', n, 'in pool (<0.95 m)', inPool, 'nearest', minD.toFixed(2), 'swings started', swings, 'player hurt by then', 'ok');
}
if (KILL) {
  b.settings.devMode = false;
  if (Q.get('nocarry')) u.fkCarry = () => {};
  u.st.hp = 1; b.hurtMutant(u, 5); if (u.st.alive) { log('hurt did not kill; killMutant'); b.killMutant(u); }
  let mx = 0, mb = '';
  for (let f = 0; f < 300; f++) { w.__cadv(1); if (f % 3 === 0) { const s = stretch(); if (s.worst > mx) { mx = s.worst; mb = s.wBone; } if (f % 30 === 0) log('RAG f', f, 'worst', s.worst.toFixed(2), s.wBone, 'over', s.over, 'rag', !!u.rag); } }
  log('RAG max', mx.toFixed(2), mb);
  const hp = BN['DEF-spine'].getWorldPosition(new V3());
  const hid = []; b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine || o.isLineSegments) && o.visible) { let x = o, mine = false; while (x) { if (x === u.g) { mine = true; break; } x = x.parent; } if (!mine) { hid.push(o); o.visible = false; } } });
  b.camera.fov = 40; b.camera.updateProjectionMatrix();
  for (const [k, a] of [['a', 0.6], ['b', 2.2]]) { cam.set(hp.x + Math.sin(a) * 3.2, hp.y + 1.8, hp.z + Math.cos(a) * 3.2); b.lookAt(hp.x, hp.y, hp.z); shot('rag_' + k + (Q.get('nocarry') ? '_nocarry' : ''), 480, 1.8); }
  for (const o of hid) o.visible = true;
}
