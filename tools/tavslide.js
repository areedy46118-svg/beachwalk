/* WONG AND THE DRUNK, SLIDING (2026-11-26, the owner: "give the drunk and wong some animations that work better they fight bad and
 * slide around too much"). One of them (&who=wong|drunk) provoked at you on the open floor in front of the dancers, the other two of
 * the bar's cast held asleep; `&secs=` of fight. Every frame: the clip on his mixer, his body's ground speed, and THE PLANTED FOOT —
 * the lower toe while it is within 8 cm of his floor — and how fast it moves over the ground (a foot on the floor that moves is a
 * skate). Per clip: frames, body speed, foot skate median / p90, the share of planted frames skating over 0.35 m/s. And the swings he
 * threw, how many hurt you, and his nearest part to you when they did.
 *   PB_PORT=4246 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/tavslide.js&who=drunk&secs=40' <out> */
const Q = new URLSearchParams(location.search), WHO = Q.get('who') || 'drunk', SECS = +(Q.get('secs') || 40);
await (async () => { w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text()); w.eval(await (await fetch('/tools/tavdrink.js?' + Date.now())).text()); })();
const sit = await w.__tavSetup(); log('in the tavern', JSON.stringify(sit), 'wong', !!b.wongUnit, 'drunk', !!b.drunkUnit);
for (let i = 0; i < 400 && !((WHO === 'wong' ? b.wongUnit : b.drunkUnit) && (WHO === 'wong' ? b.wongUnit : b.drunkUnit).clips); i++) { b.frame(1); await sleep(40); }
w.__clockOn(); b.settings.devMode = false;
const C = b.camera, T = b.THREE;
const u = WHO === 'wong' ? b.wongUnit : b.drunkUnit, others = [b.wongUnit, b.drunkUnit, b.orcUnit].filter((q) => q && q !== u);
const D = b.tavDancers, home = [(D[0].g.position.x + D[1].g.position.x) / 2, (D[0].g.position.z + D[1].g.position.z) / 2 - 2.5];
b.tavProvoke(u);
const hold = () => { for (const q of others) { q.st.awake = false; q.st.foe = null; q.st.mine = false; q.st.atk = -1; } u.st.foe = null; u.st.mine = true; u.st.awake = true; u.lastHitMine = true; };
const toes = WHO === 'wong' ? ['CC_Base_L_ToeBase_08', 'CC_Base_R_ToeBase_022'] : ['ball_l', 'ball_r'];
const TB = toes.map((n) => { let f = null; u.model.traverse((o) => { if (o.isBone && o.name === n) f = o; }); return f; });
log('toes', TB.map((t) => !!t).join(','));
const per = new Map(), prev = [new T.Vector3(), new T.Vector3()], cur = [new T.Vector3(), new T.Vector3()], pg = new T.Vector3(), loc = [new T.Vector3(), new T.Vector3()], ploc = [new T.Vector3(), new T.Vector3()], inv = new T.Matrix4(); let pyaw = 0;
let have = false, hurts = 0; const sw = {}, gaps = []; let lastSw = null;
const clipName = () => u.cur ? u.cur.getClip().name : '-';
for (let f = 0; f < SECS * 60; f++) {
  hold(); C.position.x = home[0]; C.position.z = home[1];
  b.lookAt(u.g.position.x, u.g.position.y + 1.4, u.g.position.z);
  const hp0 = b.state().hp; pg.copy(u.g.position);
  w.__adv(1);
  for (let k = 0; k < 2; k++) if (TB[k]) TB[k].getWorldPosition(cur[k]);
  u.g.updateMatrixWorld(true); inv.copy(u.g.matrixWorld).invert(); for (let k = 0; k < 2; k++) loc[k].copy(cur[k]).applyMatrix4(inv);   // (the toe in HIS frame: what the clip and the rig do to it, not his body's move or turn)
  const yawSp = Math.abs(Math.atan2(Math.sin(u.g.rotation.y - pyaw), Math.cos(u.g.rotation.y - pyaw))) * 60; pyaw = u.g.rotation.y;
  const nm = (u.st.atk >= 0 ? 'ATK ' : '') + clipName(), dt = 1 / 60;
  const bodySp = Math.hypot(u.g.position.x - pg.x, u.g.position.z - pg.z) / dt;
  if (have && f > 180 && !u.st.vault) {
    const lo = cur[0].y <= cur[1].y ? 0 : 1, fl = u.g.position.y;
    const S = per.get(nm) || { n: 0, body: [], skate: [], planted: 0, local: [], turn: [] }; per.set(nm, S); S.n++; S.body.push(bodySp); S.turn.push(yawSp);
    if (cur[lo].y - fl < 0.08) { S.planted++; S.skate.push(Math.hypot(cur[lo].x - prev[lo].x, cur[lo].z - prev[lo].z) / dt); S.local.push(Math.hypot(loc[lo].x - ploc[lo].x, loc[lo].z - ploc[lo].z) / dt); }
  }
  prev[0].copy(cur[0]); prev[1].copy(cur[1]); ploc[0].copy(loc[0]); ploc[1].copy(loc[1]); have = true;
  const s = u.st.atk >= 0 ? u.st.swing : null; if (s && lastSw !== s + ':' + (u.st.swingN || 0) && u.st.atk < 0.1) { lastSw = s + ':' + (u.st.swingN || 0); sw[s] = (sw[s] || 0) + 1; }
  if (b.state().hp < hp0) {
    hurts++; let gap = 99;
    u.model.traverse((o) => { if (!o.isBone || !/hand|head|foot|ball|Hand|Head|Foot|Toe/.test(o.name) || /finger|thumb|index|middle|ring|pinky|Index|Middle|Ring|Pinky|Thumb/.test(o.name)) return; const p = o.getWorldPosition(new T.Vector3()); gap = Math.min(gap, p.distanceTo(C.position)); });
    gaps.push(gap);
  }
  b.heal();
}
const q = (a, k) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, (s.length * k) | 0)]; };
let tot = 0, totSk = 0, totPl = 0;
for (const [nm, S] of [...per].sort((a, c) => c[1].n - a[1].n)) {
  const over = S.skate.filter((v) => v > 0.35).length; tot += S.n; totSk += over; totPl += S.skate.length;
  log(nm.padEnd(22), 'frames', String(S.n).padStart(5), '| body m/s med', q(S.body, 0.5).toFixed(2), 'p90', q(S.body, 0.9).toFixed(2), '| foot skate med', q(S.skate, 0.5).toFixed(2), 'p90', q(S.skate, 0.9).toFixed(2), '| skating', S.skate.length ? Math.round(100 * over / S.skate.length) : 0, '% of', S.skate.length, 'planted', '| in his frame med', q(S.local, 0.5).toFixed(2), '| turning rad/s med', q(S.turn, 0.5).toFixed(2), 'p90', q(S.turn, 0.9).toFixed(2));
}
log('SLIDE', WHO, '| planted frames skating > 0.35 m/s:', totPl ? Math.round(100 * totSk / totPl) : 0, '% |', 'swings', JSON.stringify(sw), '| hurt you', hurts, '| contact median', q(gaps, 0.5).toFixed(2), 'worst', q(gaps, 0.99).toFixed(2), '| alive', u.st.alive, '| stops', JSON.stringify(u.tavReachZ || null));
log('DONE');
