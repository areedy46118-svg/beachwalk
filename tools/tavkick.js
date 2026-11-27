/* THE MAN AT THE RAILING, KICKED THE WAY YOU KICK HIM (2026-11-26, the owner: "the enemy kicked off looking out the window should
 * ragdoll off"). `tools/tavlook.js` calls `kickMan` straight; this presses Q, so the kick goes through `startKick` → `kickTick` →
 * `kickStrike`'s choice of man, from where you would stand: &case=behind (1.2 m straight behind), &case=angle (1.3 m behind, 35°
 * off), &case=side (beside him at the rail, kicking across), &case=far (2.1 m back, the reach's edge).
 *   python3 -I tools/cpuprof.py 'evalFile&f=/tools/tavkick.js' --q '&case=behind&prof=1'   (the slow frames' own profiles)
 *   PB_PORT=4245 PB_WAIT=600 PB_Q='&case=angle' sh tools/probe.sh 'evalFile&f=/tools/tavkick.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(20); }
for (let i = 0; i < 400 && !(b.tavLookoutS() && b.tavLookoutS().model && b.tavLookoutS().clips); i++) { b.frame(1); await sleep(40); }
for (let i = 0; i < 500 && !b.TAV_YARDS.on; i++) { b.frame(1); await sleep(40); }
const u = b.tavLookoutS(); if (!u) { log('NO LOOKOUT'); log('DONE'); }
b.settings.devMode = true; w.__clockOn();
for (let i = 0; i < 60; i++) w.__adv(1);
const C = b.camera, X = -6000, Z = 12000, fl0 = b.tavInfoS().floor(X - 1.4, Z - 10, 810), fl = typeof fl0 === 'number' ? fl0 : fl0.f;
const cs = new URLSearchParams(w.parent.location.search).get('case') || 'behind';
const P = u.g.position, off = { behind: [0, 1.2], angle: [Math.sin(0.61) * 1.3, Math.cos(0.61) * 1.3], side: [-0.9, 0.05], far: [0, 2.1] }[cs];
const ex = P.x + off[0], ez = P.z + off[1], yaw = Math.atan2(-(P.x - ex), -(P.z - ez));   // (look(yaw): 0 faces -Z)
const put = () => { C.position.set(ex, fl + 1.7, ez); b.camBaseY = C.position.y; b.look(yaw, -0.12); };
for (let i = 0; i < 10; i++) { put(); w.__adv(1); }
log('case', cs, '| you local', (ex - X).toFixed(2), (ez - Z).toFixed(2), '| him', (P.x - X).toFixed(2), (P.z - Z).toFixed(2), '| hp', u.st.hp, 'awake', u.st.awake);
w.__kickDbg = [];
const key = (t) => w.document.dispatchEvent(new w.KeyboardEvent(t, { code: 'KeyQ', key: 'q', bubbles: true }));
key('keydown'); put(); w.__adv(1); key('keyup');
let ragAt = null, out = null, dead = null, low = 0;
const QQ = new URLSearchParams(w.parent.location.search), R = b.renderer, gl = R.getContext(), px = new Uint8Array(4), FT = [], spk = [], big = [], PF = QQ.get('prof'), PF0 = +(QQ.get('pf0') || 0), PF1 = +(QQ.get('pf1') || 240);
let progs0 = R.info.programs ? R.info.programs.length : 0;
// (the frame's real time, the GPU synced by a one-pixel read: "fix the window lag when kicking out")
const SECS = +(QQ.get('secs') || 6), land = { at: null, x: 0, z: 0, slid: 0 }, hb = new b.THREE.Vector3();
let inside = [];
for (let f = 0; f < 60 * SECS; f++) {
  if (f < 30) put();
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  if (PF && f >= PF0 && f < PF1) console.profile('kick #' + f);
  const t0 = performance.now(); w.__adv(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const ms = performance.now() - t0; FT.push(ms);
  if (PF && f >= PF0 && f < PF1) { console.profileEnd('kick #' + f); if (ms > 9) log('SPIKE', 'kick #' + f, ms.toFixed(1)); }
  if (ms > 9) spk.push((f / 60).toFixed(2) + ':' + ms.toFixed(1));
  { const np = R.info.programs ? R.info.programs.length : 0; if (ms > 18 || np !== progs0) big.push((f / 60).toFixed(2) + ':' + ms.toFixed(1) + (np !== progs0 ? ' +' + (np - progs0) + ' programs' : '')); progs0 = np; }
  if (ragAt === null && (u.rag || u.kickRag)) ragAt = (f / 60).toFixed(2);
  const H = u.rag && (u.rag.byName['Character1_Hips'] || u.rag.parts[0]);
  if (H) low = Math.min(low, H.p.y - fl);
  if (H && out === null && b.tavOutsideS(H.p.x, H.p.z)) out = (f / 60).toFixed(2);
  if (dead === null && !u.st.alive) dead = (f / 60).toFixed(2);
  // (after the landing: how far his hips go along the ground, and any frame his drawn body is back INSIDE the hall)
  if (H && dead !== null && land.at === null) { land.at = f; land.x = H.p.x; land.z = H.p.z; }
  if (H && land.at !== null) land.slid = Math.max(land.slid, Math.hypot(H.p.x - land.x, H.p.z - land.z));
  { const hipB = (() => { let q = null; u.model && u.model.traverse((o) => { if (!q && o.isBone && /hips/i.test(o.name)) q = o; }); return q; })();
    if (hipB && f >= 160 && f <= 180) { hipB.getWorldPosition(hb); const r = u.rag, K = u.kickRag; log('   f', f, (f / 60).toFixed(2), '| rag', !!r, r ? 'done ' + !!r.done + ' asleep ' + !!r.asleep + ' downT ' + (r.downT || 0).toFixed(2) + ' tav ' + !!r.tav : '', '| kickRag', !!K, K ? 't ' + K.t.toFixed(2) + ' ph ' + K.ph : '', '| alive', u.st.alive, 'struck', !!u.st.struck, 'fellHit', !!u.st.fellHit, 'down', (u.st.down || 0).toFixed(2), '| clip', u.cur ? u.cur.getClip().name : '-', '| drawn hips y', (hb.y - fl).toFixed(1), 'z', (hb.z - Z).toFixed(1), '| rag hips y', H ? (H.p.y - fl).toFixed(1) : '-', '| riseFrom', !!u.st.riseFrom); }
    if (hipB && u.g.visible && u.model.visible !== false) { hipB.getWorldPosition(hb); if (!b.tavOutsideS(hb.x, hb.z) && f > 40) inside.push((f / 60).toFixed(2) + ' (' + (hb.x - X).toFixed(1) + ',' + (hb.y - fl).toFixed(1) + ',' + (hb.z - Z).toFixed(1) + ') rag ' + !!u.rag); } }
  if (f % 30 === 29 && u.rag) { const r = u.rag, nm = (n) => r.byName[n] || null, Hd = nm('Character1_Head'), Ft = nm('Character1_LeftFoot') || nm('Character1_RightFoot');
    log('   t', ((f + 1) / 60).toFixed(1), '| hips', H ? (H.p.y - fl).toFixed(2) : '-', 'head', Hd ? (Hd.p.y - fl).toFixed(2) : '-', 'foot', Ft ? (Ft.p.y - fl).toFixed(2) : '-', '| upright', Hd && Ft ? (Hd.p.y - Ft.p.y).toFixed(2) : '-', '| holdI', !!r.holdI, 'kfly', !!r.kfly, 'downT', (r.downT || 0).toFixed(2), '| z', H ? (H.p.z - Z).toFixed(2) : '-'); }
  if (f === 20) log('  0.33 s | rag', !!u.rag, 'kickRag', !!u.kickRag, '| awake', u.st.awake, 'hp', u.st.hp, '| clip', u.cur ? u.cur.getClip().name : '-', '| g', (P.x - X).toFixed(2), (P.z - Z).toFixed(2));
}
{ const so = FT.slice().sort((x, y) => x - y); log('  FRAMES median', so[so.length >> 1].toFixed(1), 'p95', so[(so.length * 0.95) | 0].toFixed(1), 'worst', so[so.length - 1].toFixed(1), '| over 9 ms at', spk.slice(0, 24).join(' ')); }
log('  LANDING: slid', land.slid.toFixed(2), 'm after he died | drawn back INSIDE the hall on', inside.length, 'frames:', inside.slice(0, 8).join(' | '));
log('  BIG frames / new shader programs', big.join(' | '));
log('  kick dbg', JSON.stringify(w.__kickDbg.slice(0, 6)));
log('RESULT', cs, '| ragdoll at', ragAt, '| out at', out, '| lowest hips', low.toFixed(1), '| dead at', dead, '| bays down', b.tavRailS().bays.map((B) => B.dead).join(','), '| now awake', u.st.awake, 'alive', u.st.alive, 'g', (P.x - X).toFixed(2), (P.z - Z).toFixed(2));
log('DONE');
