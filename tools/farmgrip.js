/* THE FARMERS' GRIP, CLOSE (2026-11-24, the owner, with a picture of a low-poly knight — the sword's handle through his closed
 * fist, the guard on top of it, the pommel under it, the blade rising forward and up from the hand: "the farmers still hold their
 * weapons so wrong why cant you fix this? ive asked a million times weapons should be in the hands exactly like this"). One man of
 * each weapon, alone in the street: at his idle (asleep) and standing awake in his guard (the carry), the hand and the weapon close
 * from his front-right and from his side, and the whole man; per man the numbers — the handle's line against his forearm (90° =
 * square across the fist), the blade's lean off vertical and forward, where the handle passes the fist (cm from its middle).
 * PB_PORT=4241 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/farmgrip.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().filter((x) => x.farmTool).length >= 12); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = true;
const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.position.y = -500; }
const C = b.camera, T = b.THREE, f2 = (v) => (+v).toFixed(2), deg = (r) => (r * 57.3).toFixed(0);
const byW = {}; const cnt = {}; for (const u of units()) { const kk = u.kind.wkey || u.kind.tool; if (u.farmTool && u.farmW && u.farm && u.farm.out && (cnt[kk] || 0) < 2) { cnt[kk] = (cnt[kk] || 0) + 1; byW[kk + (cnt[kk] > 1 ? 'b' : '')] = u; } }
log('weapons', Object.keys(byW).join(' '));
const WP = (o) => o.getWorldPosition(new T.Vector3());
const bone = (u, re) => { let r = null; u.model.traverse((x) => { if (!r && x.isBone && re.test(x.name)) r = x; }); return r; };
const snap = (nm, px, py, pz, tx, ty, tz, fov) => { C.position.set(px, py, pz); C.lookAt(tx, ty, tz); C.fov = fov; C.updateProjectionMatrix(); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 420, 1.2); };
const measure = (u, tag) => {
  u.model.updateMatrixWorld(true);
  const W = u.farmW, mesh = u.farmTool;
  const ax = W.ax.clone().transformDirection(mesh.matrixWorld).normalize();                     // handle → blade
  const hand = bone(u, /RightHand_/), fore = bone(u, /RightForeArm_/), mid = bone(u, /RightHandMiddle1_/);
  const fa = WP(hand).sub(WP(fore)).normalize();
  const fwd = new T.Vector3(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y));
  const gp = u.farmGrip.clone().applyMatrix4(mesh.matrixWorld), fist = WP(hand).lerp(WP(mid), 0.62);
  // the fist's middle: the curled finger bones' centre; the handle's line's nearest pass to it
  const fb = []; u.model.traverse((x) => { if (x.isBone && /RightHand(Index|Middle|Ring|Pinky)[1-3]_/.test(x.name)) fb.push(WP(x)); });
  const fc = fb.length ? fb.reduce((a, c) => a.add(c), new T.Vector3()).multiplyScalar(1 / fb.length) : fist;
  const rel = fc.clone().sub(gp), off = rel.clone().addScaledVector(ax, -rel.dot(ax)).length(), along = rel.dot(ax);
  log(tag, u.kind.wkey || u.kind.tool, '| handle vs forearm', deg(Math.acos(Math.max(-1, Math.min(1, ax.dot(fa))))), '° | blade up', deg(Math.asin(ax.y)), '° forward', f2(ax.dot(fwd)),
    '| handle passes the fingers\' middle at', f2(off * 100), 'cm, the grip point', f2(along * 100), 'cm along it | forearm points', fa.toArray().map(f2).join(','));
  return { hand: WP(hand), fwd, fc, ax };
};
const keys = Object.keys(byW), home = new Map(units().map((o) => [o, o.g.position.y]));
for (const k of keys) {
  const u = byW[k];
  for (const o of units()) o.g.position.y = o === u ? home.get(o) : home.get(o) - 300;
  for (const mode of ['idle', 'guard']) {
    if (mode === 'guard') { u.st.awake = true; }
    // you stand 3 m in front of him (in his guard he faces you)
    const p = u.g.position, f = new T.Vector3(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y));
    C.position.set(p.x + f.x * 3, p.y + 1.7, p.z + f.z * 3); b.camBaseY = C.position.y;
    for (let i = 0; i < 50; i++) { C.position.set(p.x + f.x * 3, p.y + 1.7, p.z + f.z * 3); b.lookAt(p.x, p.y + 1.2, p.z); w.__adv(1); }
    const M = measure(u, mode), h = M.hand, fw = M.fwd, rt = new T.Vector3(fw.z, 0, -fw.x);
    { // square to the handle, from the side that faces out of him: the handle across the frame, the fist in the middle of it
      const c = M.fc, up = new T.Vector3(0, 1, 0), d = new T.Vector3().crossVectors(M.ax, up); if (d.lengthSq() < 1e-4) d.copy(fw); d.normalize();
      const out = c.clone().sub(u.g.position).setY(0).normalize(); if (d.dot(out) < 0) d.negate();
      snap(`${k}_${mode}_square`, c.x + d.x * 0.3, c.y + 0.02, c.z + d.z * 0.3, c.x, c.y, c.z, 42);
      const d2 = d.clone().applyAxisAngle(up, 0.7); snap(`${k}_${mode}_square2`, c.x + d2.x * 0.3, c.y + 0.1, c.z + d2.z * 0.3, c.x, c.y, c.z, 42); }
    w.requestAnimationFrame = () => 0;
    snap(`${k}_${mode}_close`, h.x + fw.x * 0.3 - rt.x * 0.14, h.y + 0.06, h.z + fw.z * 0.3 - rt.z * 0.14, h.x, h.y, h.z, 38);
    snap(`${k}_${mode}_fist`, h.x - rt.x * 0.32 + fw.x * 0.08, h.y + 0.04, h.z - rt.z * 0.32 + fw.z * 0.08, h.x, h.y, h.z, 38);
    snap(`${k}_${mode}_front`, h.x + fw.x * 1.3, h.y + 0.25, h.z + fw.z * 1.3, h.x, h.y + 0.25, h.z, 55);
    snap(`${k}_${mode}_side`, h.x - rt.x * 0.9, h.y + 0.2, h.z - rt.z * 0.9, h.x, h.y + 0.15, h.z, 50);
    snap(`${k}_${mode}_whole`, p.x + fw.x * 2.4 - rt.x * 1.2, p.y + 1.3, p.z + fw.z * 2.4 - rt.z * 1.2, p.x, p.y + 0.95, p.z, 45);
  }
  // walking in at you (awake, from 6 m): the carry while he closes, measured every 10 frames, one still
  { const p = u.g.position, f0 = new T.Vector3(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y)); u.st.awake = true; let ups = [];
    const cx = p.x + f0.x * 6, cz = p.z + f0.z * 6;
    for (let i = 0; i < 120; i++) { C.position.set(cx, p.y + 1.7, cz); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + 1.2, p.z); w.__adv(1);
      if (i % 10 === 9 && !(u.st.atk >= 0)) { u.model.updateMatrixWorld(true); const ax = u.farmW.ax.clone().transformDirection(u.farmTool.matrixWorld).normalize(); ups.push(Math.round(Math.asin(ax.y) * 57.3)); }
      if (i === 60) { const fw = new T.Vector3(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y)), rt = new T.Vector3(fw.z, 0, -fw.x); snap(`${k}_walk`, p.x + fw.x * 2.4 - rt.x * 1.3, p.y + 1.3, p.z + fw.z * 2.4 - rt.z * 1.3, p.x, p.y + 0.95, p.z, 45); } }
    log('walk', k, '| blade up while closing', ups.join(' ')); }
  // a blow of his: dev mode off (nothing swings in it), you kept alive; stills mid-swing and the grip through it
  if (!new URLSearchParams(location.search).get('noswing')) {
    b.settings.devMode = false; u.st.awake = true; let shots = 0, seen = 0, mn = 999, mx = 0, sw = new Set();
    const p = u.g.position;
    for (let i = 0; i < 600 && shots < 3; i++) {
      const f2d = new T.Vector3(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y));
      C.position.set(p.x + f2d.x * 1.8, p.y + 1.7, p.z + f2d.z * 1.8); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + 1.2, p.z);
      if (b.state().hp < 3) b.setHp(4);
      w.__adv(1);
      if (u.st.atk >= 0) {
        sw.add(u.st.swing); seen++;
        u.model.updateMatrixWorld(true);
        const ax = u.farmW.ax.clone().transformDirection(u.farmTool.matrixWorld).normalize();
        const hand = bone(u, /RightHand_/), fore = bone(u, /RightForeArm_/);
        const ang = Math.acos(Math.max(-1, Math.min(1, ax.dot(WP(hand).sub(WP(fore)).normalize())))) * 57.3; mn = Math.min(mn, ang); mx = Math.max(mx, ang);
        if (seen % 14 === 7) { const h = WP(hand), fw = f2d, rt = new T.Vector3(fw.z, 0, -fw.x); snap(`${k}_swing${shots}`, p.x + fw.x * 2.6 - rt.x * 1.4, p.y + 1.4, p.z + fw.z * 2.6 - rt.z * 1.4, p.x, p.y + 1.1, p.z, 50); shots++; }
      }
    }
    log('swing', k, '| moves', [...sw].join(','), '| handle vs forearm through the blows', mn.toFixed(0) + '-' + mx.toFixed(0) + '°');
    b.settings.devMode = true;
  }
  u.st.awake = false;
}
