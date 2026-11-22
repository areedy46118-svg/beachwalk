/* DO THE PUPPETS' FEET SLIDE (2026-11-22, the owner: "the puppets feet slide give them animations"): the workshop's fight, all of
 * them down and on you, sampled every frame for 10 s — each one on the floor (not in the air, not thrown): how fast its body goes
 * against how fast its clip's feet go (`clipSpeed` × timeScale), by what it is doing. Run: PB_PORT=4223 PB_WAIT=700 sh
 * tools/probe.sh 'evalFile&f=/tools/pupslide.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
w.__clockOn();
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z;
C.position.set(X - 0.4, Y + 1.7, Z + 1.0); b.camBaseY = C.position.y; b.setCelLast && b.setCelLast(X - 0.4, Z + 1.0, Y);
b.gainJar(1); b.cpInject(); for (let i = 0; i < 60 * 4; i++) w.__adv(1);
b.cpAllDown(); for (let i = 0; i < 60 * 2; i++) w.__adv(1);
const U = b.cpUnitsS().filter((u) => u.st.alive && !u.cpHung);
const why = {}, ex = {}, modeOf = new Map(); let switches = 0, unitFrames = 0;
const prev = new Map(U.map((u) => [u, u.g.position.clone()])), stat = {};
const dt = 1 / 60;
for (let i = 0; i < 60 * 10; i++) {
  w.__adv(1);
  for (const u of U) {
    const p = u.g.position, q = prev.get(u), v = Math.hypot(p.x - q.x, p.z - q.z) / dt; q.copy(p);
    if (!u.st.alive || u.cpHung || u.cpAir || u.cpLeap || u.cpFall || u.cpHold || u.st.struck) continue;
    unitFrames++; if (modeOf.has(u) && modeOf.get(u) !== u._vgMode) switches++; modeOf.set(u, u._vgMode);
    const st = u.cpDash ? 'dash' : (u.cur && u.cur.getClip().name) || 'none';
    const cs = u.cur ? (u.clipSpeed && u.clipSpeed[u.cur.getClip().name]) || 0 : 0, foot = cs * (u.cur ? u.cur.timeScale : 0);
    const S = stat[st] || (stat[st] = { n: 0, body: 0, foot: 0, slide: 0, big: 0 });
    if (st === 'mHIdle' && v > 1.0) { const k = [u.st.atk >= 0 ? 'atk' : '', u.st.recoil > 0 ? 'recoil' : '', u.st.stun > 0 ? 'stun' : '', u.st.roar > 0 ? 'roar' : '', 'vg:' + u._vgMode, 'sm:' + Math.hypot(u._vx || 0, u._vz || 0).toFixed(1)].filter(Boolean).join(' '); const kk = k.replace(/sm:[0-9.]+/, 'sm'); why[kk] = (why[kk] || 0) + 1; if (!ex[kk]) ex[kk] = k + ' v ' + v.toFixed(2); }
    S.n++; S.body += v; S.foot += Math.abs(foot); const sl = Math.abs(v - Math.abs(foot)); S.slide += sl; if (sl > 1.0) S.big++;
  }
}
for (const [k, S] of Object.entries(stat)) log(k.padEnd(10), 'frames', S.n, '| body', (S.body / S.n).toFixed(2), 'm/s | feet', (S.foot / S.n).toFixed(2), '| mean slide', (S.slide / S.n).toFixed(2), '| frames sliding >1 m/s', S.big);
log('clipSpeed', ['mMRun','mHRun','mHWalk','mHStrL','mHStrR'].map((k) => k + ' ' + (U[0].clipSpeed[k] || 0).toFixed(2)).join(' | '));
log('idle-but-moving, by state', JSON.stringify(why)); log('examples', JSON.stringify(ex));
log('gait switches per puppet-second', (switches / (unitFrames / 60)).toFixed(2));
