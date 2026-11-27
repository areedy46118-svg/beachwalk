/* EVERY GET-UP IN THE FIRST CASTLE'S FIGHT (2026-11-26, the owner: "FIX THIS BUG THEY ARE ALWAYS FLAOTING WHEN THEY GET UP LIKE FEET
 * ABOVE THE GROUND"). The fight on, 25 s for the men to come out; then every man who is out is put down `&n=` times (3) each way —
 * the kick's ragdoll in a direction of its own, and the clip knockdown — where he happens to be standing. Per get-up: which clip he
 * rose by; the whole body's lowest bone over the floor while rising (its highest value: > 0.15 = nothing of him on the ground); and,
 * from 0.4 s to 2.5 s after he is up, the LOWEST his feet come to the floor (a man walking touches it every step: ~0.0-0.08; one
 * who floats never does) and his group over the floor. Floors by `standFloorS` (the castle's own walking floor).
 *   PB_PORT=4241 PB_WAIT=1500 sh tools/probe.sh 'evalFile&f=/tools/riseall.js' <out> */
const Q = new URLSearchParams(location.search), N = +(Q.get('n') || 3);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
await ev('/tools/burntest.js'); b.settings.devMode = true; w.__clockOn();
const T = b.THREE, C = b.camera, v = new T.Vector3();
for (let i = 0; i < 60 * 25; i++) w.__adv(1);
const out = () => b.farmUnitsS().filter((u) => u.st.alive && u.model && u.farm && u.farm.out && u.g.visible);
log('men out', out().length, 'of', b.farmUnitsS().length);
const feetOf = (u) => u.rsFeet || (u.rsFeet = (() => { const o = []; u.model.traverse((x) => { if (x.isBone && /(Foot|ToeBase)/.test(x.name)) o.push(x); }); return o; })());
const bodyOf = (u) => u.rsBody || (u.rsBody = (() => { const o = []; u.model.traverse((x) => { if (x.isBone && /Head$|Head_|Hand$|Hand_|Hips|Spine2|Foot$|Foot_|ForeArm|Leg$|Leg_/.test(x.name) && !/Finger|Thumb|Index|Middle|Ring|Pinky|HeadTop|Toe/.test(x.name)) o.push(x); }); return o; })());
const rows = [], traced = {}, popRows = []; let bad = 0, tot = 0, poppedN = 0;
for (let round = 0; round < N; round++) for (const how of ['kick', 'clip']) for (const u of out()) {
  u.st.hp = Math.max(u.st.hp, 60); for (let i = 0; i < 40; i++) w.__adv(1);
  if (!u.st.alive || (u.st.down || 0) > 0 || u.kickRag) continue;
  const y0 = u.g.position.y, a = Math.random() * 6.283;
  const ok = how === 'kick' ? b.kickRagStartS(u, Math.sin(a), Math.cos(a), round === 2 ? 1.7 : 1) : (b.mutKnockdown(u), (u.st.down || 0) > 0);
  if (!ok) continue;
  let wasDown = true, upAt = -1, riseBody = -9, afterFoot = 9, afterGrp = 0, clip = '', f = 0, pop = -9;
  const tr = [], allB = u.rsAll || (u.rsAll = (() => { const o = []; u.model.traverse((x) => { if (x.isBone && !/Finger|Thumb|Index|Middle|Ring|Pinky|Toe_End|HeadTop|_end|Root|Armature/i.test(x.name)) o.push(x); }); return o; })());
  let prevB = null, prevG = null; const pops = [];
  for (; f < 60 * 10; f++) {
    w.__adv(1);
    const down = !!u.kickRag || (u.st.down || 0) > 0; if (!u.st.alive) break;
    u.model.updateMatrixWorld(true);
    const gfl = b.standFloorS(u, u.g.position.x, u.g.position.z, y0);
    if (down && !u.kickRag) { let lb = 1e9; for (const x of bodyOf(u)) lb = Math.min(lb, x.getWorldPosition(v).y); riseBody = Math.max(riseBody, lb - gfl); if (u.st.riseClipNow) clip = u.st.riseClipNow; else if (u.cur) clip = u.cur.getClip().name; }
    { let lo = 1e9, lx = 0, lz = 0; for (const x of feetOf(u)) { x.getWorldPosition(v); if (v.y < lo) { lo = v.y; lx = v.x; lz = v.z; } } let lb = 1e9; for (const x of bodyOf(u)) lb = Math.min(lb, x.getWorldPosition(v).y);
      tr.push([f / 60, down ? (u.kickRag ? 'R' : 'D') : 'U', lo - b.standFloorS(u, lx, lz, y0), lb - gfl, u.g.position.y - gfl, u.dfLift || 0, u.cur ? u.cur.getClip().name : '-']); }
    { const cur = allB.map((x) => x.getWorldPosition(new T.Vector3())), gp = u.g.position.clone();
      if (prevB) { const gd = gp.clone().sub(prevG); let m = 0, mn = ''; for (let i = 0; i < cur.length; i++) { const d = cur[i].distanceTo(prevB[i]); if (d > m) { m = d; mn = allB[i].name.replace(/^.*?(Left|Right)?([A-Z][a-zA-Z]+)$/, '$1$2'); } }
        const gj = gd.length(); pops.push({ t: f / 60, m, mn, gj, st: down ? (u.kickRag ? 'R' : 'D') : 'U', clip: u.cur ? u.cur.getClip().name : '-', ro: !!u.ragOut, dfo: !!u.dfOut, lift: +(u.dfLift || 0).toFixed(3), my: +u.model.position.y.toFixed(3) }); }
      prevB = cur; prevG = gp; }
    if (wasDown && !down) upAt = f / 60; wasDown = down;
    if (upAt >= 0 && f / 60 < upAt + 0.5) pop = Math.max(pop, tr[tr.length - 1][2]);
    if (upAt >= 0 && f / 60 >= upAt + 0.4) { let lo = 1e9, lx = 0, lz = 0; for (const x of feetOf(u)) { x.getWorldPosition(v); if (v.y < lo) { lo = v.y; lx = v.x; lz = v.z; } } afterFoot = Math.min(afterFoot, lo - b.standFloorS(u, lx, lz, y0)); afterGrp = Math.max(afterGrp, Math.abs(u.g.position.y - (u.dfLift || 0) - gfl)); }
    if (upAt >= 0 && f / 60 > upAt + 2.5) break;
  }
  if (upAt < 0) { rows.push(`${u.kindName} ${how}: never up in 10 s (alive ${u.st.alive})`); continue; }
  if (Q.get('trace') && (traced[how + clip] = (traced[how + clip] || 0) + 1) === 1) { log('TRACE', u.kindName, how, clip, '| t state foot body group lift clip');
    const d0 = tr.findIndex((x) => x[1] === 'D'); for (let i = Math.max(0, d0 - 2); i < tr.length; i += (tr[i][0] > upAt - 0.5 && tr[i][0] < upAt + 0.8) || i < d0 + 40 ? 3 : 12) { const x = tr[i]; log('   ', x[0].toFixed(2), x[1], 'foot', x[2].toFixed(2), 'body', x[3].toFixed(2), 'group', x[4].toFixed(2), 'lift', x[5].toFixed(2), x[6]); } }
  { const win = pops.filter((x) => x.st !== 'R' && (upAt < 0 || x.t < upAt + 1.0)); const wj = win.reduce((q, x) => (x.m > q.m ? x : q), { m: 0 }), wg = win.reduce((q, x) => (x.gj > q.gj ? x : q), { gj: 0 });
    popRows.push(`${(u.kindName || '?').padEnd(9)} ${how.padEnd(4)} by ${clip.padEnd(9)} | worst joint jump ${wj.m.toFixed(2)} m (${wj.mn}, at ${(wj.t - (upAt >= 0 ? upAt : 0)).toFixed(2)} s from up, ${wj.st} ${wj.clip}${wj.ro ? ' ragOut' : ''}${wj.dfo ? ' dfOut' : ''}) | worst whole-body jump ${wg.gj.toFixed(2)} m (at ${(wg.t - (upAt >= 0 ? upAt : 0)).toFixed(2)}, ${wg.st} ${wg.clip}, lift ${wg.lift}) | frames with a joint over 0.12 m: ${win.filter((x) => x.m > 0.12).length}`);
    if (Q.get('pops') && wj.m > 0.12 && (!Q.get('pophow') || Q.get('pophow') === how) && (poppedN++ < 3)) { const i0 = pops.indexOf(wj); for (const x of pops.slice(Math.max(0, i0 - 10), i0 + 14)) log('   POP', (u.kindName || ''), how, x.t.toFixed(3), x.st, x.clip, 'joint', x.m.toFixed(3), x.mn, 'group', x.gj.toFixed(3), 'lift', x.lift, 'model.y', x.my, x.ro ? 'ragOut' : '', x.dfo ? 'dfOut' : ''); } }
  tot++; const flo = pop > 0.4 || afterFoot > 0.12 || riseBody > 0.3; if (flo) bad++;
  rows.push(`${flo ? 'FLOATS ' : 'ok     '}${(u.kindName || '?').padEnd(9)} ${how.padEnd(4)} by ${clip.padEnd(9)} | rising: lowest bone at most ${riseBody.toFixed(2)} m up | the half-second after he is up: feet as high as ${pop.toFixed(2)} | after: feet come down to ${afterFoot.toFixed(2)} m, group ${afterGrp.toFixed(2)} m off the floor | floor there ${b.standFloorS(u, u.g.position.x, u.g.position.z, y0).toFixed(2)} was on ${y0.toFixed(2)}`);
}
for (const r of rows) log(r);
for (const r of popRows) log('JUMPS', r);
log('get-ups', tot, '| floating', bad);
log('DONE');
