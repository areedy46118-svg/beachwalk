/* THE FIGHT, FILMED FROM THE SIDE (2026-11-26, the owner: "final boss walk and all animations are still bad improve these"): the real
 * fight on the clock — you back away at `&v=` (1.6 m/s) for `&back=` s (8), then circle — and a second camera beside the line between
 * you, 12 m off, a frame every `&ev=` ticks (5) from `&t0=` s for `&n=` frames (40), on sheets of 8 across; each tile says the clip
 * he is on and the time.   PB_PORT=4266 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/scourgefilm.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), VB = +(Q.get('v') || 1.6), EV = +(Q.get('ev') || 5), T0 = +(Q.get('t0') || 0), N = +(Q.get('n') || 40), BACK = +(Q.get('back') || 8), RD = +(Q.get('d') || 6), CD = +(Q.get('cd') || 11);
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z;
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
b.setKingDown(true); for (let i = 0; i < 20; i++) adv(1);
const fy = (x, z) => Y + b.tmpFloorAt(x - X, z - Z);
let px = X - RD, pz = Z; const put = () => { C.position.set(px, fy(px, pz) + 1.7, pz); b.camBaseY = C.position.y; b.lookAt(u.g.position.x, u.g.position.y + 2, u.g.position.z); };
put(); for (let i = 0; i < 30; i++) { put(); adv(1); }
if (b.kingFightOnS) b.kingFightOnS(u); else { b.KING.mode = 'fight'; u.st.puppet = false; u.st.awake = true; u.st.mine = true; }
const cam2 = new T.PerspectiveCamera(30, 240 / 200, 0.3, 400);
const TW = 240, TH = 200, COLS = 8, cv = document.createElement('canvas'); cv.width = TW * COLS; cv.height = TH * Math.ceil(N / COLS); const g = cv.getContext('2d');
let ang = Math.PI, k = 0; const names = {};
for (let f = 0; f < 60 * 60 && k < N; f++) {
  const t = f / 60, p = u.g.position;
  if (t < BACK) { const dd = Math.hypot(px - p.x, pz - p.z) || 1, ux = (px - p.x) / dd, uz = (pz - p.z) / dd; if (dd < RD + 0.3 && Math.hypot(px - X, pz - Z) < 19) { px += ux * VB / 60; pz += uz * VB / 60; } }
  else { ang += 0.5 / 60; px = p.x + Math.cos(ang) * RD; pz = p.z + Math.sin(ang) * RD; }
  put(); adv(1);
  const nm = (u.cur ? u.cur.getClip().name : '-') + (u.st.atk >= 0 ? '*' : ''); names[nm] = (names[nm] || 0) + 1;
  if (t < T0 || f % EV) continue;
  const dx = p.x - px, dz = p.z - pz, dl = Math.hypot(dx, dz) || 1, sx = -dz / dl, sz = dx / dl;
  cam2.position.set(p.x - dx / dl * 1.5 + sx * CD, p.y + 2.6, p.z - dz / dl * 1.5 + sz * CD); cam2.lookAt(p.x - dx / dl * 1.5, p.y + 1.9, p.z - dz / dl * 1.5); cam2.updateMatrixWorld(true);
  b.renderer.render(b.scene, cam2);
  const src = b.renderer.domElement, sw = src.height * TW / TH; g.filter = 'contrast(1.15) brightness(1.5)';
  g.drawImage(src, (src.width - sw) / 2, 0, sw, src.height, (k % COLS) * TW, Math.floor(k / COLS) * TH, TW, TH);
  g.filter = 'none'; g.fillStyle = '#ff5'; g.font = '12px monospace'; g.fillText(t.toFixed(2) + ' ' + nm + ' ' + (b.KING.mode || ''), (k % COLS) * TW + 3, Math.floor(k / COLS) * TH + 12);
  k++;
}
log('clips seen (frames)', JSON.stringify(names));
const d = cv.toDataURL('image/jpeg', 0.82).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'film', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
log('DONE');
