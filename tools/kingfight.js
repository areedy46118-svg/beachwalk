/* THE FINAL FIGHT, END TO END (2026-11-20): the dev teleport to the temple, onto the podium; his coming down out of the mist
 * (stills); then a stretch of the fight stood still in front of him — every swing he throws, where its contacts land, guarded
 * or not (`&block=1`), your health kept up; his flip (forced), his climb (forced), his death (forced) and the credits.
 * `&fight=s` seconds of fight. Run: PB_PORT=4266 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/kingfight.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search);
b.settings.devMode = false;
const errs = []; const oe = w.console.error.bind(w.console); w.console.error = (...a) => { errs.push(String(a[0]).slice(0, 200)); oe(...a); };
w.addEventListener('error', (e) => errs.push('uncaught ' + e.message + ' ' + (e.error && e.error.stack ? e.error.stack.split('\n')[1] : '')));
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.tmpS().room !== undefined && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
log('in the temple', b.tmpS().ready, 'king made', !!b.KING.u, 'ready', !!(b.KING.u && b.KING.u.ready), JSON.stringify(b.kingS()));
const u = b.KING.u; if (!u) { log('NO KING'); throw 0; }
log('clips', Object.keys(u.clips).filter((k) => /^k[A-Z]|^kg|hover|flip|wallRun|parry|knockOut|getUp|^hit/.test(k)).join(' '));
log('swings', Object.keys(u.atk).map((k) => k + ' w' + u.atk[k].wind.toFixed(2) + ' more ' + (u.atk[k].moreT ? u.atk[k].moreT.map((x) => x.toFixed(2)).join('/') : '-')).join(' | '));
w.__clockOn();
const C0 = 0; const C = b.camera, T = b.THREE, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
const tiles = [];
const grab = (lab) => { b.renderer.render(b.scene, C); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.filter = src.style.filter || 'none'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none';   /* (the canvas's own CSS filter, the fight's black and white, drawn in) */ g.fillStyle = '#ff0'; g.font = '12px monospace'; g.fillText(lab, 6, 15); tiles.push(c); };
C.position.set(X - 26, Y + F + 1.7, Z); b.lookAt(X, Y + F + 2, Z); w.__adv(2);
let started = -1;
for (let f = 1; f <= 60 * 14; f++) {
  w.__adv(1);
  const s = b.kingS();
  if (started < 0 && s.cut >= 0) { started = f; log('he comes at frame', f); }
  if (started > 0 && [30, 80, 140, 260, 420, 540, 560, 600].includes(f - started)) grab(`t ${((f - started) / 60).toFixed(1)} y ${(u.g.position.y - Y - F).toFixed(1)} vis ${u.g.visible ? 1 : 0} mist ${b.KFX.mistK.toFixed(2)}`);
  if (started > 0 && s.mode === 'fight') { log('fight on at', ((f - started) / 60).toFixed(2), 's; feet', (u.g.position.y - Y - F).toFixed(2), 'cur', u.cur && u.cur.getClip().name); break; }
}
// the fight: stood 7 m in front of him, facing him, health kept up
{ const p = u.g.position, yw = u.g.rotation.y; C.position.set(p.x + Math.sin(yw) * 7, C.position.y, p.z + Math.cos(yw) * 7); w.__adv(1); }
{ const a = u.clips.wallRun; log('feet at wallRun end', a ? b.kingFeetAtS(u, a, a.getClip().duration - 1e-3).toFixed(2) : '-', 'at 0', a ? b.kingFeetAtS(u, a, 0).toFixed(2) : '-', 'model y', u.model.position.y.toFixed(2), 'scale', u.model.scale.x.toFixed(3)); }
log('st', JSON.stringify({ awake: u.st.awake, puppet: u.st.puppet, cool: u.st.cool, roar: u.st.roar, mine: u.st.mine, foe: !!u.st.foe }), 'token', b.mutTokenS ? String(b.mutTokenS() && b.mutTokenS().kindName) : '?');
const FIGHT = +(Q.get('fight') || 25), block = !!Q.get('block');
let lastSw = null, hits = 0, sw = 0, hp0 = b.state().hp; const seen = {};
const hpOf = () => b.state().hp;
for (let f = 0; f < 60 * FIGHT; f++) {
  const p = u.g.position; b.lookAt(p.x, p.y + 2.2, p.z);
  w.__adv(1);
  const st = u.st;
  if (st.atk >= 0 && st.swing !== lastSw) { sw++; lastSw = st.swing; seen[st.swing] = (seen[st.swing] || 0) + 1; }
  if (st.atk < 0) lastSw = null;
  const hp = hpOf(); if (hp < hp0) { hits++; } if (hp < 3) b.heal(); hp0 = hpOf();
  if (f % 60 === 0) log('t', (f / 60).toFixed(0), 'mode', b.KING.mode, 'dist', Math.hypot(p.x - C.position.x, p.z - C.position.z).toFixed(2), 'swing', st.atk >= 0 ? st.swing : '-', 'clip', u.cur && u.cur.getClip().name);
  if (f === 60 * 6 || f === 60 * 14) grab(`fight ${(f / 60).toFixed(0)}s ${st.atk >= 0 ? st.swing : u.cur && u.cur.getClip().name}`);
}
log('swings started', sw, JSON.stringify(seen), 'hits taken', hits);
// the flip
b.KING.cd = 0; const p0 = u.g.position.clone();
const fl = b.kingFlipStart(u); log('flip started', fl, 'from dist', Math.hypot(p0.x - C.position.x, p0.z - C.position.z).toFixed(2));
for (let f = 0; f < 60 * 4; f++) { w.__adv(1); if (f === 40 || f === 70) { b.lookAt(u.g.position.x, u.g.position.y + 2, u.g.position.z); grab('flip ' + f + ' ' + b.KING.mode); } if (b.KING.mode === 'fight') { log('flip done at', (f / 60).toFixed(2), 'behind you', ((u.g.position.x - C.position.x) * (p0.x - C.position.x) + (u.g.position.z - C.position.z) * (p0.z - C.position.z) < 0)); break; } }
// the climb
b.kingRunStart(u);
for (let f = 0; f < 60 * 20; f++) {
  w.__adv(1); const M = b.KING.mode;
  if (f % 30 === 0) log('climb', (f / 60).toFixed(1), M, 'y', (u.g.position.y - Y - F).toFixed(1), 'r', Math.hypot(u.g.position.x - X, u.g.position.z - Z).toFixed(1));
  if ((M === 'perch' && b.KING.mt > 1 && b.KING.mt < 1.02) || (M === 'leap' && b.KING.lAir && b.KING.lt > 0.8 && b.KING.lt < 0.82) || (M === 'slamRec' && b.KING.mt < 0.02)) { b.lookAt(u.g.position.x, u.g.position.y + 1.5, u.g.position.z); grab(M + ' hp ' + b.state().hp); }
  if (M === 'fight' && f > 30) { log('back to fight at', (f / 60).toFixed(1), 'feet', (u.g.position.y - Y - F).toFixed(2)); break; }
}
// the death
b.lookAt(u.g.position.x, u.g.position.y + 2, u.g.position.z); w.__adv(2);
b.hurtMutantTest ? b.hurtMutantTest(u, 9999) : null;
for (let f = 0; f < 60 * 12; f++) { w.__adv(1); const M = b.KING.mode; if ([20, 120, 300].includes(f) || (M === 'gone' && !w.__gs)) { if (M === 'gone') w.__gs = 1; grab('death ' + (f / 60).toFixed(1) + ' ' + M); } }
log('after death', JSON.stringify(b.kingS()), 'gibs', b.gibsS ? b.gibsS().length : '?');
await sleep(4000); for (let i = 0; i < 30; i++) w.__adv(1);
log('stats shown', w.document.getElementById('end').classList.contains('show'), JSON.stringify(b.kingS()));
log('errors', errs.length, errs.slice(0, 5).join(' | '));
const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'kingfight', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
