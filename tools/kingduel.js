/* FIGHTING HIM (2026-11-20, the owner: "hes horrible he never even hit me make all his hits visually connect … fight him
 * yourself … i never blocked anything"). The descent skipped; you with the katana, kept 2.2-3.0 m off him and turned to him,
 * a light cut every so often when he is not mid-blow, and (`&guard=1`) the guard raised as each of his blows comes in. Every
 * contact window of every blow: whether it took health, was blocked, or missed; and how near his striking limbs came to your
 * body (a capsule from over your eye to your knees), at what height against your eye, and where on the screen. His motion:
 * clip changes a second, his feet's root speed spikes, his heading's turn rate. `&secs=` `&guard=` `&dist=`.
 * Run: PB_PORT=4266 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/kingduel.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), SECS = +(Q.get('secs') || 40), GUARD = !!+(Q.get('guard') || 0), DIST = +(Q.get('dist') || 2.6);
b.settings.devMode = false;
const errs = []; w.addEventListener('error', (e) => errs.push('uncaught ' + e.message));
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
w.__clockOn();
C.position.set(X - 20, Y + F + 1.7, Z); b.lookAt(X, Y + F + 2, Z);
for (let i = 0; i < 600 && b.kingS().mode !== 'descend'; i++) w.__adv(1);
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })); w.__adv(2);
log('fight on', b.kingS().mode);
for (let i = 0; i < 30; i++) w.__adv(1); log('blows', b.kingBlowsS());
b.addToInventory(b.katanaItem); if (b.state().equipped !== b.katanaItem.name) b.toggleEquip(b.katanaItem); w.__adv(30);
const RAG = u.kind.rag, bone = (n) => u.model.getObjectByName(RAG['Character1_' + n]);
const chains = [['RightArm', 'RightForeArm', 'RightHand'], ['LeftArm', 'LeftForeArm', 'LeftHand'], ['RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'], ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase']].map((c) => c.map(bone));
const _a = new T.Vector3(), _b = new T.Vector3(), _p = new T.Vector3();
// nearest approach of chain i to the capsule round your eye (from 0.15 over it to 1.15 under it)
function near(i) {
  const eye = C.position, ch = chains[i]; let best = 1e9, bh = 0, bp = null;
  for (let j = 1; j < ch.length; j++) {
    ch[j - 1].getWorldPosition(_a); ch[j].getWorldPosition(_b);
    for (let k = 0; k <= 6; k++) {
      _p.lerpVectors(_a, _b, k / 6); const y = Math.max(eye.y - 1.15, Math.min(eye.y + 0.15, _p.y));
      const d = Math.hypot(_p.x - eye.x, _p.y - y, _p.z - eye.z); if (d < best) { best = d; bh = _p.y - eye.y; bp = _p.clone(); }
    }
  }
  return [best, bh, bp];
}
const rec = {}, prevHp = () => b.state().hp; let hp0 = prevHp(), lastSw = null, swN = 0, cutT = 0, clipSw = 0, lastClip = null, spikes = 0, lastP = u.g.position.clone(), lastV = 0, turnMax = 0, lastYaw = u.g.rotation.y + (u.model ? u.model.rotation.y : 0);
let stam0 = 0, hpLast = prevHp(), totalLost = 0;
for (let f = 0; f < 60 * SECS; f++) {
  const p = u.g.position, st = u.st;
  // you: kept at DIST, turned to him, the guard up through his contact windows
  const dx = C.position.x - p.x, dz = C.position.z - p.z, d = Math.hypot(dx, dz) || 1;
  // (you hold your ground between 1.4 and 3.4 m: in if he is further, a step back if he is on top of you)
  if (b.kingS().mode === 'fight') { const want = d > 3.4 ? 3.0 : d < 1.4 ? 1.6 : d; C.position.x = p.x + dx / d * (d + (want - d) * 0.06); C.position.z = p.z + dz / d * (d + (want - d) * 0.06); }
  b.lookAt(p.x, p.y + 2.0, p.z);
  const A = st.atk >= 0 && u.atk ? u.atk[st.swing] : null;
  const contacts = A ? [A.wind, ...(A.moreT || [])] : [];
  const inWin = A && contacts.some((t0) => st.atk >= t0 - 0.30 && st.atk <= t0 + A.strike + 0.05);
  if (GUARD) b.setGuardTest(!!inWin, inWin ? 0.4 : 0);
  if (!inWin && (cutT -= 1 / 60) <= 0 && d < 3.2 && !(b.state().digT > 0)) { b.startDig(0); cutT = 0.9 + Math.random() * 0.6; }
  stam0 = b.state().stamina;
  w.__adv(1);
  // his blows
  if (A && st.swing !== lastSw) { swN++; lastSw = st.swing; }
  if (!A) lastSw = null;
  if (A) {
    const r = rec[st.swing] || (rec[st.swing] = { n: 0, hit: 0, blk: 0, miss: 0, near: [], h: [], scr: [] });
    for (let ci = 0; ci < contacts.length; ci++) {
      const t0 = contacts[ci], key = st.swing + ci;
      if (st.atk >= t0 && st.atk < t0 + 1 / 60 + 1e-6) {
        r.n++;
        const lim = A.limbs || [0, 1]; let bn = 1e9, bh = 0, bp = null;
        for (const i of lim) { const [dd, hh, pp] = near(i); if (dd < bn) { bn = dd; bh = hh; bp = pp; } }
        r.near.push(bn.toFixed(2)); r.h.push(bh.toFixed(2));
        if (bp) { const q = bp.clone().project(C); r.scr.push(q.x.toFixed(2) + ',' + q.y.toFixed(2)); }
        r.pend = { hp: prevHp(), at: f, blocking: b.blockingS() };
        if (r.n <= 0) log('  ', st.swing, ci, 'lands?', b.blowLandsS(u), 'heightOK', b.blowHeightOKS(u), 'camBase', b.camBaseS().toFixed(2), 'eye', C.position.y.toFixed(2), 'his y', u.g.position.y.toFixed(2), 'dist', Math.hypot(C.position.x - u.g.position.x, C.position.z - u.g.position.z).toFixed(2), 'dev', b.settings.devMode, 'hitAt', u.hitAt ? (performance.now() - u.hitAt).toFixed(0) : '-');
      }
    }
    if (r.pend && f - r.pend.at === 8) { if (r.pend.lost > 0) r.hit++; else if (r.pend.blocking) r.blk++; else r.miss++; r.pend = null; }
  }
  { const hn = prevHp(); if (hn < hpLast) { const r = rec[lastSw || st.swing]; if (r && r.pend) r.pend.lost = (r.pend.lost || 0) + hpLast - hn; totalLost += hpLast - hn; } if (hn < 3) b.heal(); hpLast = prevHp(); }
  // his motion
  const cn = u.cur && u.cur.getClip().name; if (cn !== lastClip) { clipSw++; lastClip = cn; }
  const v = Math.hypot(p.x - lastP.x, p.z - lastP.z) * 60; if (Math.abs(v - lastV) > 4) spikes++; lastV = v; lastP.copy(p);
  const vy = u.g.rotation.y + (u.model ? u.model.rotation.y : 0); let dy = vy - lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); if (Math.abs(dy) * 60 > 8) log('  snap', (Math.abs(dy) * 60).toFixed(1), 'rad/s at', (f / 60).toFixed(2), 's mode', b.kingS().mode, 'swing', st.atk >= 0 ? st.swing + ' t ' + st.atk.toFixed(2) : '-', 'clip', u.cur && u.cur.getClip().name, 'stun', (st.stun || 0).toFixed(2), 'recoil', (st.recoil || 0).toFixed(2)); turnMax = Math.max(turnMax, Math.abs(dy) * 60); lastYaw = vy;
}
for (const k in rec) { const r = rec[k]; log(k.padEnd(8), 'contacts', r.n, 'HIT', r.hit, 'blocked', r.blk, 'missed', r.miss, '| nearest m', r.near.slice(0, 8).join(' '), '| height vs eye', r.h.slice(0, 8).join(' '), '| screen', r.scr.slice(0, 5).join(' ')); }
log('health taken', totalLost, 'swings', swN, 'his hp', u.st.hp, 'clip changes/s', (clipSw / SECS).toFixed(2), 'speed spikes/s', (spikes / SECS).toFixed(2), 'max turn rad/s', turnMax.toFixed(1), 'errors', errs.length, errs.slice(0, 3).join(' | '));
