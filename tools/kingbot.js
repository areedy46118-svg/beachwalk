/* THE KING FOUGHT BY A PLAYER WHO KNOWS HOW (2026-11-20, the owner: "TEST IT AND MAKE SURE THE FIGHT IS GOOD"). The katana in
 * hand; you keep 1.6-2.4 m off him, turned to him; on each of his contacts you raise the guard — `&skill=` the share of them
 * raised on the beat for a parry (fresh, 0.07 s before; the rest held up early, a block); `&miss=` the share you do nothing
 * about. In his openings (not swinging, near) a string of light cuts; `&hook=1` the hook thrown when he is 5-10 m off.
 * Out: the fight minute by minute — his health, yours (a "death" is your health run out: healed, counted), parries, blocks,
 * hits taken, his staggers — and how long he took to kill, or what he had left. `&secs=` the cap.
 * Run: PB_PORT=4266 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/kingbot.js&skill=0.6&miss=0.1' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), SECS = +(Q.get('secs') || 180), SKILL = +(Q.get('skill') ?? 0.6), MISS = +(Q.get('miss') ?? 0.1), HOOK = !!+(Q.get('hook') || 0);
b.settings.devMode = false;
const errs = []; w.addEventListener('error', (e) => errs.push('uncaught ' + e.message));
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
w.__clockOn();
C.position.set(X - 12, Y + F + 1.7, Z); b.lookAt(X, Y + F + 2, Z);
for (let i = 0; i < 600 && b.kingS().mode !== 'descend'; i++) w.__adv(1);
for (let i = 0; i < 30; i++) w.__adv(1); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })); w.__adv(2);
log('fight', b.kingS().mode);
b.addToInventory(b.katanaItem); if (HOOK) b.addToInventory(b.hookItem);
const equip = (it) => { if (b.state().equipped !== it.name) b.toggleEquip(it); };
equip(b.katanaItem); w.__adv(30);
const st = u.st;
let deaths = 0, parries = 0, blocks = 0, taken = 0, cuts = 0, hooks = 0, staggers = 0, hpLast = b.state().hp, cutT = 0, decided = new Map(), guardUntil = 0, hisHpLast = st.hp;
let mode = '', minute = [];
const T0 = performance.now();
const parryHook = b.parryCountS ? null : null;
let lastRec = 0, stunT = 0, recT = 0, swT = 0, swId = 0, lastAtk = -1, lastSwK = null;
for (let f = 0; f < 60 * SECS; f++) {
  const now = f / 60, p = u.g.position, M = b.kingS().mode;
  if (!st.alive || M === 'dying' || M === 'gone') { log('HE IS DOWN at', now.toFixed(1), 's'); break; }
  const dx = C.position.x - p.x, dz = C.position.z - p.z, d = Math.hypot(dx, dz) || 1;
  // you: holding your ground at 1.6-2.4 m
  if (M === 'fight') { const want = d > 2.6 ? 2.2 : d < 1.4 ? 1.7 : d; C.position.x = p.x + dx / d * (d + (want - d) * 0.05); C.position.z = p.z + dz / d * (d + (want - d) * 0.05); C.position.y = Y + b.tmpFloorAt(C.position.x - X, C.position.z - Z) + 1.7; }
  b.lookAt(p.x, p.y + 1.7, p.z);
  // his contacts: each decided once — parry it, block it, or miss it
  const A = st.atk >= 0 && u.atk ? u.atk[st.swing] : null;
  if (A && (lastAtk < 0 || st.atk < lastAtk || st.swing !== lastSwK)) swId++;
  lastAtk = st.atk; lastSwK = st.swing;
  let guard = false, fresh = false;
  if (A) {
    const cs = [A.wind, ...(A.moreT || [])];
    for (let i = 0; i < cs.length; i++) {
      const key = swId + ':' + i, t0 = cs[i];
      if (st.atk > t0 - 0.35 && st.atk < t0 + A.strike + 0.05) {
        if (!decided.has(key)) { const r = Math.random(); decided.set(key, r < MISS ? 'miss' : r < MISS + (1 - MISS) * SKILL ? 'parry' : 'block'); }
        const how = decided.get(key);
        if (how === 'block') guard = true;
        if (how === 'parry' && st.atk > t0 - 0.07) { guard = true; fresh = true; }
      }
    }
  }
  if (guard && !b.blockingS()) b.setGuardTest(true, 0); else if (!guard && b.blockingS()) b.setGuardTest(false);
  // your cuts in his openings
  const open = M === 'fight' && st.atk < 0 && d < 2.5;
  if (!guard && open && (cutT -= 1 / 60) <= 0 && !(b.state().digT > 0)) { b.startDig(0); cuts++; cutT = 0.42; }
  // the hook from range
  if (HOOK && M === 'fight' && st.atk < 0 && d > 5 && d < 10 && b.HK.st === 'idle' && Math.random() < 0.02) {
    equip(b.hookItem); w.__adv(6); b.startWind(); for (let i = 0; i < 20; i++) { b.lookAt(p.x, p.y + 1.5, p.z); w.__adv(1); } b.releaseWind(); hooks++;
    for (let i = 0; i < 90 && b.HK.st !== 'idle'; i++) { b.lookAt(u.g.position.x, u.g.position.y + 1.5, u.g.position.z); w.__adv(1); }
    equip(b.katanaItem); w.__adv(6);
  }
  const stam0 = b.state().stamina, rec0 = st.stun || 0;
  w.__adv(1);
  if (b.blockingS() && b.state().stamina < stam0 - 0.04) blocks++;
  if ((st.stun || 0) > rec0 + 0.05) parries++;
  if ((st.stun || 0) > 0) stunT += 1 / 60; if ((st.recoil || 0) > 0) recT += 1 / 60; if (st.atk >= 0) swT += 1 / 60;
  if ((st.recoil || 0) > 0.3 && lastRec <= 0.3) staggers++; lastRec = st.recoil || 0;
  const hn = b.state().hp; if (hn < hpLast) taken += hpLast - hn; if (hn <= 2) b.heal(); deaths = Math.floor(taken / 4); hpLast = b.state().hp;
  if (M !== mode) { if (M !== 'fight') log('  ', now.toFixed(1), 's', M); mode = M; }
  if (f % (60 * 5) === 0 && f > 60 * (+(Q.get('dbg') || 999))) log('   dbg', now.toFixed(0), 'mode', M, 'atk', st.atk.toFixed(2), 'swing', st.swing, 'clip', u.cur && u.cur.getClip().name, 'd', d.toFixed(2), 'recoil', (st.recoil||0).toFixed(2), 'stun', (st.stun||0).toFixed(2), 'down', (st.down||0).toFixed(2), 'cool', (st.cool||0).toFixed(2), 'awake', st.awake, 'puppet', st.puppet, 'y', (p.y - Y).toFixed(2), 'lift', u.model.position.y.toFixed(2), 'tok', b.mutTokenS() === u, 'hitstop', b.hitstop, 'digT', b.state().digT, 'frozen', b.state().dialogOpen, b.state().menuOpen, b.state().dying, 'kingCut', b.kingS().cut, 'impF', st.impF, 'block', st.block, 'flee', st.flee, 'clipsPending', u.clipsPending, 'mixer', !!u.mixer, 'roar', st.roar, 'struck', st.struck);
  if (f % (60 * 20) === 0 && f) log('t', now.toFixed(0), 's | his hp', st.hp.toFixed(0), '| your deaths', deaths, 'taken', taken, '| parries', parries, 'blocks', blocks, 'staggers', staggers, '| cuts', cuts, 'hooks', hooks);
}
const dc = {}; for (const v of decided.values()) dc[v] = (dc[v] || 0) + 1; log('his swings', swId, 'contacts decided', JSON.stringify(dc), 'his stun time', stunT.toFixed(1), 's, recoil time', recT.toFixed(1), 's, swinging', swT.toFixed(1), 's');
log('END', st.alive ? 'he lives, hp ' + st.hp.toFixed(0) : 'dead', '| your deaths', deaths, 'health taken', taken, '| parries', parries, 'blocks', blocks, 'staggers', staggers, 'cuts', cuts, 'hooks', hooks, '| errors', errs.length, errs.slice(0, 3).join(' | '));
