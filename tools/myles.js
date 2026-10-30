/* MYLES ALWAYS WITH YOU (2026-10-30, the owner: "MYLES DIDNT SHOW UP IN THE CASTLE AFTER TALKING TO HIM … IF YOU SAY
 * YOULL KILL THE KING WITH HIM HE HAS TO ALWAYS SPAWN WITH YOU IN THE CASTLE … MYLES IS INVISIBLE"). Not part of the game.
 * Run through tools/probes.js's `myl`:  PB_PORT=4223 sh tools/probe.sh 'myl&f=<name>' <outdir>
 *   allyWalk / allyFade / allyAfter   the real path from his Yes: you go in at the gate while he is still walking to it, while
 *                                     he is fading into it, or after he is through — then every cut between the castles,
 *                                     the gate out and in, a checkpoint load and a death's respawn; each one asserted
 *   noMyles                           a No (him hostile, then calmed) and into XIII: the arch door tried wakes the gargoyles;
 *                                     and again after a checkpoint load
 *   dkCrouch                          the dark knight in the first castle's street: every frame his lowest foot against the
 *                                     paving, by clip, and stills of the low ones */
const D = (w) => w.document.getElementById('dialog');
const EYE = 1.7;
function mState(b) {
  const M = b.MINO, u = M.u, c = b.camera.position;
  if (!u) return { u: false, stage: M.stage };
  let op = 1, tr = false; for (const m of u.mats || []) { op = Math.min(op, m.opacity); tr = tr || m.transparent; }
  let shown = u.g.visible && !!u.g.parent; for (let o = u.g.parent; o; o = o.parent) if (o.visible === false) shown = false;
  let skin = 0, skinOn = 0; if (u.model) u.model.traverse((o) => { if (o.isSkinnedMesh) { skin++; let v = o.visible; for (let p = o.parent; p && p !== u.g; p = p.parent) if (p.visible === false) v = false; if (v) skinOn++; } });
  const f = b.c13State().inC13 ? b.c13CourtAt(u.g.position.x, u.g.position.z) : b.fortState().inFort ? b.fortCourtAt(u.g.position.x, u.g.position.z) : null;
  return { stage: M.stage, place: M.place, ally: M.ally, vis: u.g.visible, shown, model: !!u.model, skin: skinOn + '/' + skin, op: +op.toFixed(2), tr, fade: M.fade,
    d: +Math.hypot(u.g.position.x - c.x, u.g.position.z - c.z).toFixed(2), feet: f == null ? null : +(u.g.position.y - f).toFixed(2), alive: u.st.alive, pend: u.clipsPending || 0 };
}
const good = (s, dMax = 9) => s.u !== false && s.stage === 'with' && s.ally && s.vis && s.shown && s.model && s.op > 0.99 && !s.tr && s.d < dMax && s.skin.split('/')[0] !== '0' && (s.feet === null || Math.abs(s.feet) < 0.3);
async function boot(w, b, sleep) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  await w.__mnGate(4.5);
  w.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
}
function talk(w, b, pick) {
  const step = (n) => w.__c13Step(n);
  b.minoTalk(); step(2);
  for (let i = 0; i < 40; i++) { D(w).click(); step(2); const bs = [...D(w).querySelectorAll('button.choice')]; const y = bs.find((x) => x.textContent.trim() === pick); if (y) { y.click(); break; } }
  for (let i = 0; i < 400 && b.state().dialogOpen; i++) { if (i % 20 === 0) D(w).click(); step(1); }
}
function cut(w, b, fn) { fn(); for (let i = 0; i < 400 && b.fortState().busy; i++) w.__c13Step(1); w.__c13Step(90); }
async function reloadAs(w, log, sleep, died) {
  const f = w.frameElement;
  sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1');
  if (died) sessionStorage.setItem('beachwalk.died', '1'); else sessionStorage.removeItem('beachwalk.died');
  const t0 = performance.now();
  f.contentWindow.location.reload(); await sleep(1200);
  let w2 = null; for (let i = 0; i < 300; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) break; } catch (e) { /* */ } }
  const B = w2.__bw;
  let lift = null, seen = null;
  for (let i = 0; i < 600; i++) {
    const btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
    if (!lift && !B.frozen() && B.state().introDone) lift = (performance.now() - t0) / 1000;
    if (!seen && good(mState(B), 12)) seen = (performance.now() - t0) / 1000;
    if (lift && (seen || performance.now() - t0 > lift * 1000 + 15000)) break;
    await sleep(100);
  }
  try { await B.audioCtx.suspend(); } catch (e) { /* */ }
  await sleep(1500);
  return { w2, B, lift, seen };
}
async function allyPath(ctx, when) {
  const { w, b, log, sleep, shot } = ctx;
  await boot(w, b, sleep);
  const M = b.MINO, u = M.u, cam = b.camera.position, step = (n) => w.__c13Step(n);
  let fails = 0;
  const check = (label, dMax) => { const s = mState(b); const ok = good(s, dMax); if (!ok) fails++; log(ok ? 'OK  ' : 'FAIL', label, JSON.stringify(s)); return ok; };
  talk(w, b, 'Yes');
  log('after the Yes:', M.stage, 'ally', M.ally);
  // you follow him to the gate, two metres behind, and walk in when `when` says
  const G = b.fortW(b.FORT_GATE.x, b.FORT_GATE.z);
  for (let i = 0; i < 60 * 20; i++) {
    const p = u.g.position, bz = Math.max(p.z + 2.0, G.z + 1.2);
    cam.x = p.x; cam.z = bz; cam.y = b.beachGroundAt(cam.x, cam.z) + EYE; b.lookAt(G.x, cam.y, G.z - 3);
    step(1);
    if (when === 'walk' && i === 45) break;
    if (when === 'fade' && M.fade !== undefined && M.fade > 0.35) break;
    if (when === 'after' && M.stage === 'inside') { step(30); break; }
  }
  log('walking in at the gate: stage', M.stage, 'fade', M.fade && +M.fade.toFixed(2), 'his opacity', mState(b).op);
  cut(w, b, () => b.startFort(1));
  check('1 the first castle, in at the gate');
  b.lookAt(u.g.position.x, u.g.position.y + 1.4, u.g.position.z); b.camera.updateMatrixWorld(true); shot('a_fort_' + when, 480, 1.3);
  // a walk down the street, 8 m over 4 s: he keeps up
  { const x0 = cam.x, z0 = cam.z, d = b.fortW(b.FORT_DOOR.x, b.FORT_DOOR.z), L = Math.hypot(d.x - x0, d.z - z0) || 1;
    for (let i = 0; i < 240; i++) { const k = Math.min(1, i / 240) * Math.min(8, L - 2) / L; const x = x0 + (d.x - x0) * k, z = z0 + (d.z - z0) * k; const f = b.fortCourtAt(x, z); if (f !== null) { cam.x = x; cam.z = z; cam.y = f + EYE; } step(1); }
    step(120); check('2 the street, after a walk', 10); }
  for (let i = 0; i < 200 && !b.c13State().ready; i++) { await sleep(200); step(2); }
  cut(w, b, () => b.startFort(1, 'c13'));
  check('3 into XIII by the back door');
  b.lookAt(u.g.position.x, u.g.position.y + 1.4, u.g.position.z); b.camera.updateMatrixWorld(true); shot('a_c13_' + when, 480, 1.3);
  cut(w, b, () => b.startFort(1, 'fromC13'));
  check('4 back into the first castle');
  cut(w, b, () => b.startFort(-1, 'gate'));
  check('5 out of the gate onto the beach', 12);
  cut(w, b, () => b.startFort(1));
  check('6 in at the gate again');
  cut(w, b, () => b.startFort(1, 'c13'));
  check('7 into XIII again');
  if (when !== 'walk' && !w.__mwLoads) { log('fails', fails); return; }
  b.saveCheckpoint();
  const sv = JSON.parse(localStorage.getItem('beachwalk.save') || 'null');
  log('saved', JSON.stringify(sv && sv.flags.mino), 'room', sv && sv.room);
  for (const died of [false, true]) {
    const { B, lift, seen, w2 } = await reloadAs(w, log, sleep, died);
    const s = mState(B), ok = good(s, 12); if (!ok) fails++;
    log(ok ? 'OK  ' : 'FAIL', died ? '8 a death respawn in XIII' : '8 a checkpoint load in XIII', '| black lifted', lift && lift.toFixed(1), 's, him there', seen && seen.toFixed(1), 's |', JSON.stringify(s), 'room', B.devRoom());
    if (died) {
      // and from there, back to the first castle and in again, under the restored game
      w2.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
      const st = (n) => w2.__c13Step(n), cutB = (fn) => { fn(); for (let i = 0; i < 400 && B.fortState().busy; i++) st(1); st(90); };
      for (let i = 0; i < 300 && !(B.fortRdy() && B.fortWallsReady()); i++) { await sleep(200); st(2); }
      cutB(() => B.startFort(1, 'fromC13')); { const s2 = mState(B), ok2 = good(s2); if (!ok2) fails++; log(ok2 ? 'OK  ' : 'FAIL', '9 restored, back to the first castle', JSON.stringify(s2)); }
      B.saveCheckpoint();
      const R = await reloadAs(w2, log, sleep, true);
      const s3 = mState(R.B), ok3 = good(s3, 12); if (!ok3) fails++;
      log(ok3 ? 'OK  ' : 'FAIL', '10 a death respawn in the first castle | lifted', R.lift && R.lift.toFixed(1), 'him', R.seen && R.seen.toFixed(1), JSON.stringify(s3), 'room', R.B.devRoom());
    }
  }
  log('fails', fails);
}
export const allyWalk = (ctx) => allyPath(ctx, 'walk');
export const allyFade = (ctx) => allyPath(ctx, 'fade');
export const allyAfter = (ctx) => allyPath(ctx, 'after');

// WITHOUT HIM: a No, into XIII (his stage hostile, calmed at his post), the arch door tried — the gargoyles come down
export async function noMyles(ctx) {
  const { w, b, log, sleep } = ctx;
  await boot(w, b, sleep);
  const M = b.MINO, G = b.GARG, cam = b.camera.position, step = (n) => w.__c13Step(n);
  if (w.__nmDead) { /* (killed: his unit retired) */ }
  talk(w, b, 'No');
  log('after the No:', M.stage, 'ally', M.ally);
  for (let i = 0; i < 200 && !b.c13State().ready; i++) { await sleep(200); step(2); }
  cut(w, b, () => b.startFort(1)); log('in the fort: him', M.stage, M.place, 'vis', M.u && M.u.g.visible);
  cut(w, b, () => b.startFort(1, 'c13'));
  for (let i = 0; i < 400 && !(G.units.length && G.units.every((u) => u.model)); i++) { step(1); await sleep(20); }
  const A = b.c13Dbg().arch, door = [b.C13_X + A.ax + A.ux * A.L * 0.5, b.C13_Z + A.az + A.uz * A.L * 0.5];
  const home = [b.C13_X + A.ax + A.ux * (A.L + 2.0), b.C13_Z + A.az + A.uz * (A.L + 2.0)];
  const tryIt = (BB, st, label) => {
    const c = BB.camera.position, GG = BB.GARG;
    for (let i = 0; i < 60; i++) { c.x = home[0]; c.z = home[1]; BB.lookAt(door[0], c.y, door[1]); st(1); }
    const before = { phase: GG.phase, modes: GG.units.map((x) => x.gp && x.gp.mode).join(','), locked: BB.gargLockedS && BB.gargLockedS() };
    BB.gargTryDoor();
    for (let i = 0; i < 180; i++) { c.x = home[0]; c.z = home[1]; st(1); }
    const after = { phase: GG.phase, dialog: BB.state().dialogOpen, modes: GG.units.map((x) => x.gp && x.gp.mode).join(',') };
    const ok = after.phase === 1 && GG.units.some((x) => x.gp && !['perch'].includes(x.gp.mode));
    log(ok ? 'OK  ' : 'FAIL', label, 'him', BB.MINO.stage, BB.MINO.place, '| before', JSON.stringify(before), '| after the try', JSON.stringify(after));
    return ok;
  };
  b.saveCheckpoint();
  tryIt(b, step, 'no Myles: the door tried');
  // and after a checkpoint load into XIII
  const R = await reloadAs(w, log, sleep, true);
  for (let i = 0; i < 300 && !(R.B.GARG.units.length && R.B.GARG.units.every((u) => u.model)); i++) await sleep(100);
  R.w2.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
  tryIt(R.B, (n) => R.w2.__c13Step(n), 'no Myles, restored: the door tried');
}

/* THE DARK KNIGHT'S FEET (2026-10-30, the owner: "THE DARK KNIGHT KEEPS FLOATING WHILE CROUCHED"). Every clip on him scrubbed
 * in place: the lowest of his feet, toes and knees against his root (his idle's soles are the zero), and how far the root
 * itself is off the paving; then 40 s of the fight with every frame's lowest sole against the street under him, by clip. */
export async function dkCrouch({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); b.settings.devMode = false; w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  const u = b.dkS().u, V = u.g.position.constructor, Mi = new (u.g.matrixWorld.constructor)(), v = new V();
  const nm = (s) => u.model.getObjectByName('b_MF_' + s);
  const feet = ['Foot_L', 'Foot_R', 'Toe_L', 'Toe_R', 'Calf_L', 'Calf_R'].map(nm).filter(Boolean);
  // the soles: lowest skinned vertex of each frame (the true contact), and the bones for a cheap read in the live fight
  const skins = []; u.model.traverse((o) => { if (o.isSkinnedMesh) skins.push(o); });
  const lowVert = () => { let y = 9; for (const s of skins) { const P = s.geometry.attributes.position; for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i); s.applyBoneTransform(i, v); v.applyMatrix4(s.matrixWorld).applyMatrix4(Mi); if (v.y < y) y = v.y; } } return y; };
  const lowBone = () => { let y = 9; for (const f of feet) { f.getWorldPosition(v).applyMatrix4(Mi); if (f.name.includes('Foot') || f.name.includes('Toe')) y = Math.min(y, v.y); } return y; };
  const ry0 = u.model.rotation.y; u.model.rotation.y = 0;
  const saved = []; for (const k in u.clips) { const a = u.clips[k]; saved.push([a, a.time, a.enabled, a.paused, a.getEffectiveWeight()]); a.stop(); a.enabled = false; a.setEffectiveWeight(0); }
  const rows = [], seen = new Set();
  for (const k of Object.keys(u.clips)) {
    const a = u.clips[k]; if (seen.has(a)) continue; seen.add(a);
    const dur = a.getClip().duration, N = Math.max(10, Math.round(dur * 15));
    a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
    let mx = -9, mn = 9, worstT = 0, hipLow = 9;
    for (let i = 0; i <= N; i++) {
      a.time = dur * i / N; u.mixer.update(0); u.g.updateMatrixWorld(true); Mi.copy(u.g.matrixWorld).invert();
      const y = lowVert(); if (y > mx) { mx = y; worstT = a.time; } mn = Math.min(mn, y);
      nm('Pelvis').getWorldPosition(v).applyMatrix4(Mi); hipLow = Math.min(hipLow, v.y);
    }
    rows.push([a.getClip().name, +mx.toFixed(2), +mn.toFixed(2), +worstT.toFixed(2), +hipLow.toFixed(2), +dur.toFixed(2)]);
    a.stop(); a.enabled = false; a.setEffectiveWeight(0);
  }
  rows.sort((p, q) => q[1] - p[1]);
  log('clip: lowest skin point over the root — worst frame (float), best frame, at t, the pelvis lowest, dur');
  for (const r of rows) log('  ', r.join('  '));
  for (const [a, t, en, pa, wt] of saved) { a.time = t; a.enabled = en; a.paused = pa; a.setEffectiveWeight(wt); }
  u.model.rotation.y = ry0; u.mixer.update(0);
  // THE FIGHT: you three metres off, hands off, 40 s; each frame his lowest bone against the street
  for (const f of b.dkS().dk.victims) { f.st.awake = false; f.g.visible = false; f.g.position.x += 60; }
  for (const f of b.farmUnitsS()) f.st.awake = false;
  b.dkTurn(u, true);
  const C = b.camera.position, P = u.g.position, home = [P.x + Math.sin(u.g.rotation.y) * 3, P.z + Math.cos(u.g.rotation.y) * 3];
  u.model.rotation.y = ry0; u.g.updateMatrixWorld(true); Mi.copy(u.g.matrixWorld).invert();
  const idleSole = (() => { const a = u.clips.sIdle; return 0; })();
  const by = {}; let shots = 0;
  for (let f = 0; f < 60 * (w.__dkSecs || 40); f++) {
    b.lookAt(P.x, C.y - 0.2, P.z); w.__adv(1); C.x = home[0]; C.z = home[1];
    for (const g of b.farmUnitsS()) g.st.awake = false;
    b.heal();
    if (f % 3) continue;
    u.g.updateMatrixWorld(true); const fl = b.fortCourtAt(P.x, P.z); if (fl === null) continue;
    const I = new (u.g.matrixWorld.constructor)(); let low = 9;
    for (const s of skins) { const Pp = s.geometry.attributes.position; for (let i = 0; i < Pp.count; i += 5) { v.fromBufferAttribute(Pp, i); s.applyBoneTransform(i, v); v.applyMatrix4(s.matrixWorld); if (v.y < low) low = v.y; } }
    const gap = low - fl, cur = (u.cur && u.cur.getClip().name) || '?';
    const r = by[cur] || (by[cur] = { n: 0, max: -9, sum: 0, root: 0 }); r.n++; r.max = Math.max(r.max, gap); r.sum += gap; r.root = Math.max(r.root, P.y - fl);
    if (gap > 0.12 && shots < 4 && !/Leap|sAtk$/.test(cur)) { shots++; const c0 = C.clone(); const yy = u.g.rotation.y + 1.5708; C.set(P.x + Math.sin(yy) * 4.5, fl + 0.9, P.z + Math.cos(yy) * 4.5); b.lookAt(P.x, fl + 0.7, P.z); b.camera.updateMatrixWorld(true); shot('dkfloat' + shots + '_' + cur + '_' + gap.toFixed(2), 480, 1.6); C.copy(c0); log('float still', shots, cur, 'gap', gap.toFixed(2), 'root over street', (P.y - fl).toFixed(2), 'atk', u.st.atk.toFixed(2), u.st.swing); }
  }
  log('live: clip, frames, sole over the street max / mean, root over the street max');
  for (const [k, r] of Object.entries(by).sort((p, q) => q[1].max - p[1].max)) log('  ', k, r.n, r.max.toFixed(2), (r.sum / r.n).toFixed(2), r.root.toFixed(2));
}

// HIS LOW POSES, side on and from the paving: each clip at the frame given (or its lowest), the street under him
export async function dkStills({ w, b, log, sleep, shot }) {
  const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
  await ev('/tools/burntest.js'); await ev('/tools/paltest.js');
  b.settings.devMode = false; log('boot', JSON.stringify(await w.__palBoot())); w.__clockOn();
  for (let i = 0; i < 200 && b.dkS().dk.stage === 0; i++) { w.__adv(1); b.heal(); }
  for (let i = 0; i < 200 && !b.dkS().u.dkTravel; i++) w.__adv(1);
  const u = b.dkS().u, P = u.g.position, C = b.camera.position, fl = b.fortCourtAt(P.x, P.z);
  for (const f of b.farmUnitsS()) { f.g.visible = false; }
  const fov0 = b.camera.fov; b.camera.fov = 40; b.camera.updateProjectionMatrix();
  const list = (w.__dkList || 'sCBlock:0.3,sBlockI:0.5,sSlashE:0.4,sHit:0.3,sIdle:0.3,sStr2:0.5,dkS3:0.42,sSlashB:0.62').split(',');
  u.model.rotation.y = 0;
  for (const it of list) {
    const [nm, f] = it.split(':'), a = u.clips[nm]; if (!a) { log(nm, 'none'); continue; }
    for (const k in u.clips) { const x = u.clips[k]; x.stop(); x.enabled = false; x.setEffectiveWeight(0); }
    a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; a.time = a.getClip().duration * +f; u.mixer.update(0);
    u.g.updateMatrixWorld(true);
    for (const side of [1.5708]) {
      const yy = u.g.rotation.y + side;
      C.set(P.x + Math.sin(yy) * 4.2, fl + 0.35, P.z + Math.cos(yy) * 4.2); b.camera.lookAt(P.x, fl + 0.75, P.z); b.camera.updateMatrixWorld(true);
      b.renderer.render(b.scene, b.camera); shot('dk_' + nm + '_' + f, 460, 1.6);
    }
  }
  b.camera.fov = fov0; b.camera.updateProjectionMatrix();
}

// THE TWO BEFORE THE THRONE DOOR, the same pack: each one's lowest leg point (shins, feet, toes) against the court, by clip,
// over 30 s of them fighting you (dev mode: nothing finishes you), and a still of each standing in his guard
export async function knFeet({ w, b, log, sleep, shot }) {
  w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
  await w.__mnGate(4.5);
  w.eval(await (await fetch('/tools/c13shot.js?' + Date.now())).text());
  for (let i = 0; i < 120 && !b.c13State().ready; i++) { await sleep(300); w.__c13Step(2); }
  b.skipTakes(); await w.__c13Go(); b.skipTakes();
  for (let i = 0; i < 400 && !(b.knUnitsS().length === 2 && b.knUnitsS().every((k) => k.model && !(k.clipsPending > 0) && k.natDone)); i++) { w.__c13Step(1); await sleep(40); }
  const K = b.knUnitsS(), V = b.camera.position.constructor, v = new V();
  const legSets = K.map((u) => { const J = u.kind.joints, names = [J.calfL, J.calfR, J.footL, J.footR]; const out = [];
    u.model.traverse((o) => { if (!o.isSkinnedMesh) return; const bs = o.skeleton.bones, ok = bs.map((x) => names.includes(x.name) || (x.parent && [J.footL, J.footR].includes(x.parent.name)));
      const SI = o.geometry.attributes.skinIndex, SW = o.geometry.attributes.skinWeight; for (let i = 0; i < SI.count; i++) { let bi = -1, bw = 0; for (let k = 0; k < 4; k++) { const w2 = SW.getComponent(i, k); if (w2 > bw) { bw = w2; bi = SI.getComponent(i, k); } } if (ok[bi]) out.push([o, i]); } });
    return out; });
  const low = (u, L) => { let y = 9; for (const [o, i] of L) { v.fromBufferAttribute(o.geometry.attributes.position, i); o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); if (v.y < y) y = v.y; } return y; };
  // stills, standing in their guard (before they wake)
  K.forEach((u, j) => { const P = u.g.position, C = b.camera.position, fl = b.c13CourtAt(P.x, P.z), yy = u.g.rotation.y + 1.5708; u.g.updateMatrixWorld(true);
    log(u.kindName, 'idle', u.cur && u.cur.getClip().name, 'lowest leg point over the court', (low(u, legSets[j]) - fl).toFixed(3));
    const f0 = b.camera.fov; b.camera.fov = 40; b.camera.updateProjectionMatrix(); C.set(P.x + Math.sin(yy) * 3.6, fl + 0.3, P.z + Math.cos(yy) * 3.6); b.camera.lookAt(P.x, fl + 0.7, P.z); b.camera.updateMatrixWorld(true);
    b.renderer.render(b.scene, b.camera); shot('kn_guard_' + u.kindName, 460, 1.6); b.camera.fov = f0; b.camera.updateProjectionMatrix(); });
  b.settings.devMode = true;
  const P0 = K[0].g.position, home = [P0.x + Math.sin(K[0].g.rotation.y) * 4, P0.z + Math.cos(K[0].g.rotation.y) * 4], cam = b.camera.position;
  cam.set(home[0], P0.y + 1.7, home[1]); for (const k of K) { k.st.awake = true; k.st.mine = true; }
  const by = {};
  for (let f = 0; f < 60 * 30; f++) {
    cam.x = home[0]; cam.z = home[1]; b.lookAt(P0.x, cam.y - 0.2, P0.z); w.__c13Step(1); b.heal && b.heal();
    if (f % 4) continue;
    K.forEach((u, j) => { if (!u.st.alive) return; const fl = b.c13CourtAt(u.g.position.x, u.g.position.z); if (fl === null) return; u.g.updateMatrixWorld(true);
      const g = low(u, legSets[j]) - fl, cur = u.kindName + ' ' + ((u.cur && u.cur.getClip().name) || '?'); const r = by[cur] || (by[cur] = { n: 0, min: 9, max: -9, sum: 0 }); r.n++; r.min = Math.min(r.min, g); r.max = Math.max(r.max, g); r.sum += g; });
  }
  log('live: knight clip, frames, lowest leg point over the court min / mean / max');
  for (const [k, r] of Object.entries(by).sort()) log('  ', k, r.n, r.min.toFixed(2), (r.sum / r.n).toFixed(2), r.max.toFixed(2));
}
