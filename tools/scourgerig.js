/* THE SCOURGER'S BODY IN THE REAL FIGHT, MEASURED (2026-11-26, the owner: "the final boss rig is off … his weapon clips through his
 * body … his walk and run look sideways … fix his head and chest spinning vertically around"). The fight on the clock as
 * `scourgefilm.js` runs it (you back away `&back=` s, circle `&circ=` s, stand `&stand=` s), and every frame, per clip:
 *   hipsYaw   his hips' facing (across the thighs) against the way his group faces, deg
 *   travel    the way he is moving against his hips' facing, deg (only while he moves over 0.8 m/s): a gait run side-on
 *   chestYaw  the shoulders' line against the hips', about up; chestRoll the shoulders' line off level; chestPitch the spine's lean
 *   headYaw/Pitch, chestYaw2/Pitch   the head's / chest's facing in his group's frame, its axes taken off his own idle
 *   spin      the head's own turn in his group's frame from one frame to the next, deg (cspin the chest's)
 *   axeIn     axe vertices within `&r=` (0.16 m) of his torso's line (hips..head) or his thighs/shins, the grip's own 0.35 m left out
 * `&tiles=1`: a still from the side each time a reading is the worst yet for its clip (16 at most), labelled.
 *   PB_PORT=4266 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/scourgerig.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), VB = +(Q.get('v') || 1.6), BACK = +(Q.get('back') || 6), CIRC = +(Q.get('circ') || 8), STAND = +(Q.get('stand') || 6), RD = +(Q.get('d') || 6), AR = +(Q.get('r') || 0.16), TILES = Q.get('tiles') === '1';
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
const M = u.model, bn = (n) => M.getObjectByName(n);
const B = { hips: bn('Character1_Hips'), sp: bn('Character1_Spine'), sp1: bn('Character1_Spine1'), sp2: bn('Character1_Spine2'), neck: bn('Character1_Neck'), head: bn('Character1_Head'),
  la: bn('Character1_LeftArm'), ra: bn('Character1_RightArm'), lt: bn('Character1_LeftUpLeg'), rt: bn('Character1_RightUpLeg'), ls: bn('Character1_LeftLeg'), rs: bn('Character1_RightLeg'),
  lf: bn('Character1_LeftFoot'), rf: bn('Character1_RightFoot'), hand: bn('Character1_RightHand'), jaw: bn('Jaw') };
{ const kids = []; B.head && B.head.traverse((o) => { if (o.isBone && kids.length < 30) kids.push(o.name); }); log('head kids', kids.join(',')); }
if (!B.jaw) { B.head.traverse((o) => { if (!B.jaw && o.isBone && /jaw|snout|beak|nose|eye/i.test(o.name)) B.jaw = o; }); }
log('bones', Object.entries(B).map(([k, v]) => k + ':' + (v ? v.name : 'MISSING')).join(' '));
let axe = null; M.traverse((o) => { if (!axe && o.isMesh && /axe/i.test(o.name)) axe = o; });
const P = (o) => o.getWorldPosition(new T.Vector3()), up = new T.Vector3(0, 1, 0);
const gqi = () => u.g.getWorldQuaternion(new T.Quaternion()).invert();
let lHF, lCF; { const ia = u.clips.idle; for (const x of new Set(Object.values(u.clips))) { x.enabled = false; x.setEffectiveWeight(0); } ia.play(); ia.enabled = true; ia.setEffectiveWeight(1); ia.time = 0.3; for (const bd of u.mixer._bindings) { bd.buffer.fill(0, bd.valueSize, bd.valueSize * 2); bd.buffer.fill(1, bd.valueSize * 2, bd.valueSize * 3); }; u.mixer.rawUpdate(0); u.g.updateMatrixWorld(true);
  const g0 = gqi(); lHF = new T.Vector3(0, 0, 1).applyQuaternion(B.head.getWorldQuaternion(new T.Quaternion()).premultiply(g0).invert()); lCF = new T.Vector3(0, 0, 1).applyQuaternion(B.sp2.getWorldQuaternion(new T.Quaternion()).premultiply(g0).invert());
  if (u.cur !== ia) ia.stop(); if (u.cur) { u.cur.play(); u.cur.enabled = true; u.cur.setEffectiveWeight(1); } }
const inG = (bo, l) => l.clone().applyQuaternion(bo.getWorldQuaternion(new T.Quaternion()).premultiply(gqi()));
const ang = (a, b2) => { const d = Math.atan2(a.x, a.z) - Math.atan2(b2.x, b2.z); return Math.atan2(Math.sin(d), Math.cos(d)) * 57.3; };
const fwdOf = (L, R) => { const lat = R.clone().sub(L); return new T.Vector3().crossVectors(up, lat).setY(0).normalize(); };
const segD = (p, a, b2) => { const ab = b2.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
const S = {}, st = (clip) => S[clip] || (S[clip] = { n: 0, hipsYaw: [], travel: [], chestYaw: [], chestRoll: [], chestPitch: [], headYaw: [], headPitch: [], spin: [], cspin: [], axeIn: [] });
const lastQ = new T.Quaternion(), lastC = new T.Quaternion(), q = new T.Quaternion(); let haveLast = false; const lp = new T.Vector3(); let haveP = false;
const cam2 = new T.PerspectiveCamera(30, 240 / 200, 0.3, 400), TW = 240, TH = 200, COLS = 8, cv = document.createElement('canvas'); cv.width = TW * COLS; cv.height = TH * 2; const g = cv.getContext('2d'); let tiles = 0; const worst = {};
const tile = (lab) => {
  if (!TILES || tiles >= 16) return; const p = u.g.position, dx = p.x - px, dz = p.z - pz, dl = Math.hypot(dx, dz) || 1, sx = -dz / dl, sz = dx / dl;
  cam2.position.set(p.x + sx * 9, p.y + 2.4, p.z + sz * 9); cam2.lookAt(p.x, p.y + 1.6, p.z); cam2.updateMatrixWorld(true); b.renderer.render(b.scene, cam2);
  const src = b.renderer.domElement, sw = src.height * TW / TH; g.filter = 'contrast(1.15) brightness(1.5)'; g.drawImage(src, (src.width - sw) / 2, 0, sw, src.height, (tiles % COLS) * TW, Math.floor(tiles / COLS) * TH, TW, TH);
  g.filter = 'none'; g.fillStyle = '#ff5'; g.font = '11px monospace'; g.fillText(lab, (tiles % COLS) * TW + 3, Math.floor(tiles / COLS) * TH + 12); tiles++;
};
let angC = Math.PI; const TT = BACK + CIRC + STAND;
for (let f = 0; f < TT * 60; f++) {
  const t = f / 60, p = u.g.position;
  if (t < BACK) { const dd = Math.hypot(px - p.x, pz - p.z) || 1, ux = (px - p.x) / dd, uz = (pz - p.z) / dd; if (dd < RD + 0.3 && Math.hypot(px - X, pz - Z) < 19) { px += ux * VB / 60; pz += uz * VB / 60; } }
  else if (t < BACK + CIRC) { angC += 0.5 / 60; px = p.x + Math.cos(angC) * RD; pz = p.z + Math.sin(angC) * RD; }
  put(); adv(1);
  if (!u.st.alive) break;
  u.g.updateMatrixWorld(true);
  const clip = (u.cur ? u.cur.getClip().name : '-') + (u.st.atk >= 0 ? '*' : ''), s = st(clip); s.n++;
  const yaw = u.g.rotation.y + (M.rotation.y || 0), gf = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const hf = fwdOf(P(B.lt), P(B.rt)), cf = fwdOf(P(B.la), P(B.ra));
  s.hipsYaw.push(ang(hf, gf));
  const pp = p.clone(); if (haveP) { const v = pp.clone().sub(lp).setY(0); if (v.length() * 60 > 0.8) s.travel.push(ang(v, hf)); } lp.copy(pp); haveP = true;
  s.chestYaw.push(ang(cf, hf));
  { const sh = P(B.ra).sub(P(B.la)); s.chestRoll.push(Math.atan2(sh.y, Math.hypot(sh.x, sh.z)) * 57.3); }
  { const hf = inG(B.head, lHF), cf2 = inG(B.sp2, lCF); s.headYaw.push(Math.atan2(hf.x, hf.z) * 57.3); s.headPitch.push(Math.asin(Math.max(-1, Math.min(1, hf.y))) * 57.3); s.chestPitch.push(Math.asin(Math.max(-1, Math.min(1, cf2.y))) * 57.3); s.chestYaw2 = s.chestYaw2 || []; s.chestYaw2.push(Math.atan2(cf2.x, cf2.z) * 57.3); }
  B.head.getWorldQuaternion(q).premultiply(gqi()); const sp2q = B.sp2.getWorldQuaternion(new T.Quaternion()).premultiply(gqi());
  if (haveLast) { s.spin.push(q.angleTo(lastQ) * 57.3); s.cspin.push(sp2q.angleTo(lastC) * 57.3); } lastQ.copy(q); lastC.copy(sp2q); haveLast = true;
  if (axe && f % 2 === 0) {
    const segs = [[B.hips, B.sp], [B.sp, B.sp1], [B.sp1, B.sp2], [B.sp2, B.neck], [B.neck, B.head], [B.lt, B.ls], [B.rt, B.rs], [B.ls, B.lf], [B.rs, B.rf]].map(([a, c]) => [P(a), P(c)]);
    const hp = P(B.hand), pos = axe.geometry.attributes.position, v = new T.Vector3(); let n = 0;
    for (let i = 0; i < pos.count; i += 3) { v.fromBufferAttribute(pos, i).applyMatrix4(axe.matrixWorld); if (v.distanceTo(hp) < 0.35) continue; for (const [a, c] of segs) if (segD(v, a, c) < AR) { n++; break; } }
    s.axeIn.push(n);
    if (n > 8 && n > (worst[clip + 'axe'] || 0) * 1.5) { worst[clip + 'axe'] = n; tile(t.toFixed(2) + ' ' + clip + ' axeIn ' + n); }
  }
  const cy = Math.abs(s.chestYaw[s.chestYaw.length - 1]), hy = Math.abs(s.headYaw[s.headYaw.length - 1]);
  if (cy > 40 && cy > (worst[clip + 'cy'] || 0) + 15) { worst[clip + 'cy'] = cy; tile(t.toFixed(2) + ' ' + clip + ' chestYaw ' + cy.toFixed(0)); }
  if (hy > 50 && hy > (worst[clip + 'hy'] || 0) + 15) { worst[clip + 'hy'] = hy; tile(t.toFixed(2) + ' ' + clip + ' headYaw ' + hy.toFixed(0)); }
}
const sum = (a) => { if (!a.length) return '-'; const s2 = a.slice().sort((x, y) => x - y), m = a.reduce((x, y) => x + y, 0) / a.length; return 'mean ' + m.toFixed(0) + ' [' + s2[0].toFixed(0) + '..' + s2[s2.length - 1].toFixed(0) + '] p90|.|' + a.map(Math.abs).sort((x, y) => x - y)[Math.floor(a.length * 0.9)].toFixed(0); };
for (const k in S) { const s = S[k]; log('== ' + k + ' frames ' + s.n); for (const m of ['hipsYaw', 'travel', 'chestYaw', 'chestYaw2', 'chestRoll', 'chestPitch', 'headYaw', 'headPitch', 'spin', 'cspin', 'axeIn']) if (s[m]) log('   ' + m.padEnd(10) + ' ' + sum(s[m])); }
if (TILES && tiles) { const d = cv.toDataURL('image/jpeg', 0.82).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'rig', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); }
log('DONE');
