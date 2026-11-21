/* THE KING TORN OFF THE PILLAR BY SKRIM'S HOOK (2026-11-21, the owner: "MAKE IT SO YOU CAN GRAB THE FINAL BOSS OFF THE WALL WHEN
 * HES RUNNNING UP IT WITH THE HOOK AND HELL STOP"). The fight, him sent up a pillar (`kingRunStart`); you `&d=` m in from the
 * pillar's foot, and at `&at=` s into his climb Skrim's hook thrown at him for real (Shift held, released at his chest). Then
 * every tenth of a second: his mode, his height, his hp, the hook's state — and stills of the climb, the bite, the fall, the
 * crash and him getting up. `&none=1`: no throw (he goes on to the lip and the slam, as before).
 * Run: PB_PORT=4266 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/kinghookwall.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), D = +(Q.get('d') || 9), AT = +(Q.get('at') || 0.9), NONE = !!+(Q.get('none') || 0);
b.settings.devMode = false;
const errs = []; w.addEventListener('error', (e) => errs.push('uncaught ' + e.message));
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u; if (!u) { log('NO KING'); throw 0; }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0), T = b.THREE;
C.position.set(X - 12, Y + F + 1.7, Z); b.lookAt(X, Y + F + 2, Z);
for (let i = 0; i < 600 && b.kingS().mode !== 'descend'; i++) adv(1);
for (let i = 0; i < 30; i++) adv(1); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })); adv(4);
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem); adv(30);
log('fight', b.kingS().mode);
b.kingRunStart(u);
const P = u.g.position, pa = b.KING.pa, R = b.KING_PILLARS.face;
const stand = () => { C.position.set(X + Math.sin(pa) * (R - D), Y + F + 1.7, Z + Math.cos(pa) * (R - D)); };
const tiles = [];
const grab = (lab, look) => { if (look) b.lookAt(look.x, look.y, look.z); b.renderer.render(b.scene, C); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.filter = src.style.filter || 'none'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#f33'; g.font = '12px monospace'; g.fillText(lab, 6, 14); tiles.push(c); };
let last = '', thrown = false, f0 = 0, hp0 = u.st.hp, shots = {};
for (let f = 0; f < 60 * 14; f++) {
  stand();
  const m = b.kingS().mode, mt = b.KING.mt, hy = P.y - Y - F;
  const tgt = new T.Vector3(P.x, P.y + 1.4, P.z);
  b.lookAt(tgt.x, tgt.y, tgt.z);
  if (!thrown && !NONE && m === 'climb' && mt >= AT) {
    thrown = true; f0 = f;
    const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
    key('ShiftLeft', true); log('wind', b.startWind(), 'his height', hy.toFixed(1));
    for (let i = 0; i < 24; i++) { stand(); b.lookAt(P.x, P.y + 1.4, P.z); adv(1); }
    b.releaseWind(); key('ShiftLeft', false);
    log('thrown: hook', b.HK.st, 'at', b.HK.to ? b.HK.to.kind + ' t ' + b.HK.to.t.toFixed(1) : 'nothing', '| him', b.kingS().mode, (P.y - Y - F).toFixed(1), 'm up');
  }
  adv(1);
  const s = m + (b.KING.tornLand ? '+down' : '');
  if (s !== last || f % 6 === 0) log(' t', (f / 60).toFixed(2), 'mode', m, 'mt', mt.toFixed(2), 'height', hy.toFixed(2), 'hp', u.st.hp.toFixed(1), 'hook', b.HK.st, 'puppet', u.st.puppet, 'clip', u.cur && u.cur.getClip().name);
  if (s !== last && !shots[s]) { shots[s] = 1; grab(s + ' ' + hy.toFixed(1), tgt); }
  for (const k of [0.3, 0.8, 1.4]) if (thrown && !shots['f' + k] && f - f0 === Math.round(k * 60) + 24) { shots['f' + k] = 1; grab('fall +' + k + ' ' + hy.toFixed(1), tgt); }
  if (b.KING.tornLand && (shots.dbgN = (shots.dbgN || 0) + 1) <= 40 && shots.dbgN % 4 === 1) { const v = b.KD.sp.filter((q) => q.visible && q.position.distanceTo(P) < 8); log('dust', shots.dbgN, 'near him', v.length, 't', v[0] && v[0].userData.t.toFixed(3), 'life', v[0] && v[0].userData.life.toFixed(2), 'a', v[0] && v[0].userData.a.toFixed(2), 'op', v[0] && v[0].material.opacity.toFixed(3), 'hitstop', b.hitstop, 'frozen', b.state().dialogOpen); }
  if (b.KING.tornLand && !shots.crash2 && mt > 0.25) { shots.crash2 = 1; grab('crash +0.25', new T.Vector3(P.x, P.y + 0.6, P.z)); }
  if (b.KING.tornLand && !shots.crash3 && mt > 0.9) { shots.crash3 = 1; grab('crash +0.9', new T.Vector3(P.x, P.y + 0.6, P.z)); }
  last = s;
  if (m === 'fight' && thrown && f - f0 > 60) { log('back to the fight at', (f / 60).toFixed(2), 'hp', u.st.hp, 'of', hp0); grab('fight', tgt); break; }
  if (m === 'slamRec' || (NONE && m === 'fight' && f > 120)) { log('no grab: on to', m); break; }
}
log('climbs', b.KING.climbs, 'climbCd', b.KING.climbCd);
if (tiles.length) {
  const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
  const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
  const d = cv.toDataURL('image/jpeg', 0.82).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', 'hookwall', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
}
log('END errors', errs.length, errs.slice(0, 3).join(' | '));
