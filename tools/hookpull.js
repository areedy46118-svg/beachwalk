/* SKRIM'S HOOK THROWN AT A CREATURE (2026-11-20, the owner: "MAKE THE PROJECTILE HOOK THE ENEMY AND BRING THEM CLOSER THAT
 * ISNT WORKING. MAKE CLICKING AGAIN WHILE LAUNCHED PULL THE HOOK BACK"). On the beach, a creature (`&k=pale`, any kind) made
 * `&d=` metres in front of you and woken; a full throw at its chest; its distance to you each tenth of a second, the hook's
 * state, where it went. `&recall=0.2`: a click that many seconds after the throw (the recall). `&temple=1`: in the desert
 * temple instead, thrown at the king (`&k=king`) or at a pillar (`&k=wall`).
 * Run: PB_PORT=4266 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/hookpull.js&k=pale' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), K = Q.get('k') || 'pale', D = +(Q.get('d') || 9), RECALL = Q.get('recall') ? +Q.get('recall') : -1, TEMPLE = !!+(Q.get('temple') || 0);
b.settings.devMode = !TEMPLE;
const errs = []; w.addEventListener('error', (e) => errs.push('uncaught ' + e.message));
for (let i = 0; i < 400 && !(b.hookRawS() && b.state().started); i++) { b.frame(1); await sleep(50); }
const T = b.THREE, C = b.camera;
let u = null, aimAt = null;
if (TEMPLE) {
  b.devTeleportTemple();
  for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
}
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(40);
const fwd = new T.Vector3(); C.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
if (TEMPLE) {
  const X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
  C.position.set(X - 12, Y + F + 1.7, Z); b.lookAt(X, Y + F + 2, Z);
  if (K === 'king') {
    for (let i = 0; i < 600 && b.kingS().mode !== 'descend'; i++) adv(1);
    for (let i = 0; i < 30; i++) w.__adv(1); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })); adv(2);
    u = b.KING.u; const p = u.g.position, dx = p.x - C.position.x, dz = p.z - C.position.z, dl = Math.hypot(dx, dz);
    C.position.set(p.x - dx / dl * D, C.position.y, p.z - dz / dl * D); adv(1);
  } else {
    b.KING.mode = 'gone';           // (no descent over the test)
    // a pillar: the nearest, looked at square
    const P = b.KING_PILLARS, a = P.a0, R = P.face + 1.0; aimAt = new T.Vector3(X + Math.sin(a) * R, Y + F + 1.6, Z + Math.cos(a) * R);
    C.position.set(X + Math.sin(a) * (R - D), Y + F + 1.7, Z + Math.cos(a) * (R - D));
  }
} else {
  u = b.makeMutant(C.position.x + fwd.x * D, C.position.z + fwd.z * D, K, 0);
  for (let i = 0; i < 600 && !u.ready; i++) { b.frame(1); await sleep(16); }
  u.st.awake = true; u.st.mine = true;
}
const tgt = () => aimAt || new T.Vector3(u.g.position.x, u.g.position.y + (u.kind.h || 1.8) * 0.55, u.g.position.z);
const dist = () => u ? Math.hypot(u.g.position.x - C.position.x, u.g.position.z - C.position.z) : C.position.distanceTo(aimAt);
log('kind', K, 'start dist', dist().toFixed(2), u ? 'h ' + u.kind.h + ' bossDeath ' + !!u.kind.bossDeath : '');
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
const keep = C.position.clone();
const hold = u ? u.g.position.clone() : null;
key('ShiftLeft', true); log('wind', b.startWind(), 'mode', TEMPLE ? b.kingS().mode : '-', 'frozen?', b.state().dialogOpen, b.state().menuOpen);
for (let i = 0; i < 50; i++) { C.position.copy(keep); if (hold) { u.g.position.copy(hold); u.st.atk = -1; } b.lookAt(tgt().x, tgt().y, tgt().z); adv(1); }
b.releaseWind(); key('ShiftLeft', false);
log('thrown', b.HK.st, 'at', b.HK.to ? b.HK.to.kind + ' ' + b.HK.to.t.toFixed(2) : 'nothing', 'end', b.HK.end.toArray().map((v) => v.toFixed(1)).join(','));
let last = '', minD = 1e9, maxHookD = 0, recalled = false;
for (let f = 0; f < 60 * 4; f++) {
  C.position.copy(keep);
  if (RECALL >= 0 && !recalled && f >= RECALL * 60) { recalled = true; b.hookRecallS(); log('  click at', (f / 60).toFixed(2), 's: hook', b.HK.st, 'at', C.position.distanceTo(b.HK.p).toFixed(2), 'm'); }
  adv(1);
  maxHookD = Math.max(maxHookD, C.position.distanceTo(b.HK.p));
  minD = Math.min(minD, dist());
  const s = b.HK.st + (b.HK.u ? '+u' : '');
  if (f % 6 === 0 || s !== last) log('  t', (f / 60).toFixed(2), 'hook', s, 'hook out', C.position.distanceTo(b.HK.p).toFixed(2), 'its dist', dist().toFixed(2), u ? 'recoil ' + (u.st.recoil || 0).toFixed(2) + ' hp ' + u.st.hp : '');
  last = s;
  if (b.HK.st === 'idle' && f > 20) { log('  home at', (f / 60).toFixed(2)); break; }
}
log('RESULT', K, 'closest', minD.toFixed(2), 'from', D, '| furthest the hook went', maxHookD.toFixed(2), '| errors', errs.length, errs.slice(0, 3).join(' | '));
