/* THE SAMURAI'S LOOKS (2026-11-16, the owner: "HIS WALK ANIMATION IS BAD HIS BLADE IS LIKE IN HIS STOMACH. HIS BLADE
 * SHOULD ACTUALLY FACE YOU WHEN FIGHTING. HIS ARMS KEEP ROTATION PASSED HIS HEAD WHEN THROWING A SHURIKAN … DONT CHANGE THE
 * FIGHT AT ALL"). Not part of the game. Run headless:
 *   PB_PORT=4301 sh tools/probe.sh 'evalFile&f=/tools/samlook.js&m=blade&n=3600' <out>
 * m=blade  a hands-off fight: per clip, how near the BLADE (beyond the fist) comes to his body (the capsule hips → neck,
 *          and his thighs), and between swings the angle between the blade and the line from his hilt to your chest
 * m=throw  a throw forced and filmed from his left and front every 3 frames; per frame his left hand against the top of
 *          his head and how far his upper arm turned in a frame
 * m=walk   stills of him walking toward you, from the side */
const Q = new URLSearchParams(location.search), M = Q.get('m') || 'blade', N = +(Q.get('n') || 3600);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/contact.js');
const u = await w.__roomBoot('dojo', 'assets/samurai.glb');
if (!u) { log('no samurai'); return; }
const it = b.interactables.find((i) => /katana/i.test(typeof i.label === 'function' ? i.label() : (i.label || '')));
if (it) (it.data && it.data.onActivate || it.onActivate)();
b.wakeSamurai();
for (let k = 0; k < 300; k++) { w.__cadv(1); b.heal(); }
let m0 = 0; while ((b.frozen() || b.mutCut) && m0++ < 900) w.__cadv(1);
u.g.visible = true; u.st.awake = true; u.holdAnim = false;
b.settings.devMode = false;
const V3 = b.camera.position.constructor, cam = b.camera.position, home = cam.clone();
const BN = {}; u.model.traverse((o) => { if (o.isBone) BN[o.name] = o; });
const W = (n) => BN[n].getWorldPosition(new V3());
const kat = BN.Katana, tip = BN['DEF-katana_tip'];
const segD = (p, a, c) => { const ab = c.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / (ab.lengthSq() || 1))); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
const stateKey = () => (u.thr ? 'THROW' : u.st.atk >= 0 ? 'SW ' + u.st.swing : 'clip ' + (u.cur && u.cur.getClip ? u.cur.getClip().name : '-'));
const solo = (fn) => { const hid = []; b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine || o.isLineSegments) && o.visible) { let x = o, mine = false; while (x) { if (x === u.g) { mine = true; break; } x = x.parent; } if (!mine) { hid.push(o); o.visible = false; } } }); try { fn(); } finally { for (const o of hid) o.visible = true; } };
const still = (name, yawOff, dist = 4.2, gain = 1.8) => {
  const sv = cam.clone(), sq = b.camera.quaternion.clone(), f0 = b.camera.fov, P = u.g.position, ry = u.g.rotation.y + yawOff;
  solo(() => { b.camera.fov = 36; b.camera.updateProjectionMatrix(); cam.set(P.x + Math.sin(ry) * dist, P.y + 1.4, P.z + Math.cos(ry) * dist); b.lookAt(P.x, P.y + 1.25, P.z); b.camera.updateMatrixWorld(true); shot(name, 300, gain); });
  cam.copy(sv); b.camera.quaternion.copy(sq); b.camera.fov = f0; b.camera.updateProjectionMatrix();
};
if (M === 'blade') {
  const R = {}, G = { n: 0, ang: [] };
  for (let f = 0; f < N; f++) {
    cam.x = home.x; cam.z = home.z; const P = u.g.position; b.lookAt(P.x, P.y + 1.5, P.z);
    w.__cadv(1); if (b.state().hp < 3) b.heal(); if (!u.st.alive) break;
    const hip = W('DEF-spine'), neck = W('DEF-spine004'), k0 = kat.getWorldPosition(new V3()), t0 = tip.getWorldPosition(new V3()), hr = W('DEF-handR');
    // the steel beyond the fist: from a hand's width past the grip to the tip
    let core = 9, thigh = 9;
    for (let i = 3; i <= 10; i++) { const p = k0.clone().lerp(t0, i / 10); core = Math.min(core, segD(p, hip, neck)); thigh = Math.min(thigh, segD(p, W('DEF-thighL'), W('DEF-shinL')), segD(p, W('DEF-thighR'), W('DEF-shinR'))); }
    const k = stateKey(), r = R[k] || (R[k] = { n: 0, core: [], thigh: 0, inside: 0 });
    r.n++; r.core.push(core); if (core < 0.20) r.inside++; if (thigh < 0.10) r.thigh++;
    if (u.st.atk < 0 && !u.thr && !(u.st.stun > 0)) {
      const chest = cam.clone(); chest.y -= 0.45;
      const bl = t0.clone().sub(k0).normalize(), to = chest.sub(hr).normalize();
      const ang = Math.acos(Math.max(-1, Math.min(1, bl.dot(to)))) * 57.3; G.n++; G.ang.push(ang);
      const ck = (u.cur && u.cur.getClip ? u.cur.getClip().name : '-'), C = G[ck] || (G[ck] = { a: [], g: [], bad: 0 }); C.a.push(ang); C.g.push(u.samIK ? u.samIK.g : -1); if (ang > 90) C.bad++;
      if (u.samIK && u.samIK.g < 0.3) { const st = u.st, key = ['recoil', 'roar', 'down', 'immob', 'stun', 'openT', 'flourish', 'fidget', 'block', 'parry', 'dodge', 'stagger'].filter((x) => st[x] > 0).join('+') + (u.holdAnim ? '+hold' : '') + (u.running ? '+run' : '') + '|' + ck; G.low = G.low || {}; G.low[key] = (G.low[key] || 0) + 1; }
      if (ang > 90 && (G.shots = (G.shots || 0)) < 8 && f - (G.lastShot || -99) > 30) { G.lastShot = f; still('bad_' + G.shots++ + '_' + ck + '_' + ang.toFixed(0) + '_g' + (u.samIK ? u.samIK.g.toFixed(2) : '-'), 0.6); }
    }
  }
  const q = (a, p) => { a = a.slice().sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, a.length * p | 0)].toFixed(2) : '-'; };
  for (const k of Object.keys(R).sort((a, c) => R[c].inside / R[c].n - R[a].inside / R[a].n)) { const r = R[k]; log('BLADE', k.padEnd(16), 'n', r.n, '| steel to his core min', q(r.core, 0), 'p5', q(r.core, 0.05), 'median', q(r.core, 0.5), '| frames inside 0.20', r.inside, '| through a thigh', r.thigh); }
  for (const ck in G) if (G[ck] && G[ck].a) log('GUARD', ck.padEnd(10), 'n', G[ck].a.length, 'median', q(G[ck].a, 0.5), 'p90', q(G[ck].a, 0.9), 'frames > 90', G[ck].bad, 'guard weight median', q(G[ck].g, 0.5));
  log('GUARD LOW (weight < 0.3) by state', JSON.stringify(G.low || {}));
  log('GUARD between swings: blade vs line hilt→your chest, degrees — median', q(G.ang, 0.5), 'p90', q(G.ang, 0.9), 'n', G.n);
}
if (M === 'throw') {
  // stand off 5 m so he throws, and force it
  const P = u.g.position; cam.set(P.x + Math.sin(u.g.rotation.y) * 6, cam.y, P.z + Math.cos(u.g.rotation.y) * 6); home.copy(cam);
  let shots = 0, started = false, prevQ = null, worst = 0, over = 0, nT = 0;
  const arm = BN['DEF-upper_armL'], fo = BN['DEF-forearmL'];
  for (let f = 0; f < 900; f++) {
    cam.x = home.x; cam.z = home.z; b.lookAt(P.x, P.y + 1.5, P.z);
    if (!u.thr && !started) { u.thrCool = 0; u.st.cool = 0; }
    w.__cadv(1); b.heal();
    if (u.thr) {
      started = true; nT++;
      const head = W('DEF-spine006'), hl = W('DEF-handL'), el = W('DEF-forearmL'), sh = W('DEF-upper_armL');
      const q = arm.getWorldQuaternion(new u.g.quaternion.constructor()), dq = prevQ ? 2 * Math.acos(Math.min(1, Math.abs(q.dot(prevQ)))) : 0; prevQ = q;
      worst = Math.max(worst, dq); if (hl.y > head.y + 0.15) over++;
      if (nT % 3 === 0 || dq > 0.35) log('THR', nT, u.thr.ph, 't', u.thr.t.toFixed(2), 'hand over head', (hl.y - head.y).toFixed(2), 'elbow over head', (el.y - head.y).toFixed(2), 'hand fwd', ((hl.x - P.x) * Math.sin(u.g.rotation.y) + (hl.z - P.z) * Math.cos(u.g.rotation.y)).toFixed(2), 'arm turn this frame', dq.toFixed(2), 'model yaw', u.model.rotation.y.toFixed(2));
      if (u.thr.ph === 'throw' && nT % 4 === 0 && shots < 18) { still('thr_' + String(shots).padStart(2, '0') + '_L', Math.PI / 2 + 0.4); shots++; }
    } else if (started) break;
  }
  log('THROW frames', nT, 'left hand > 15 cm over his head on', over, '| worst one-frame upper-arm turn', worst.toFixed(2));
}
if (M === 'walk') {
  const P = u.g.position; cam.set(P.x + Math.sin(u.g.rotation.y) * 9, cam.y, P.z + Math.cos(u.g.rotation.y) * 9); home.copy(cam);
  let shots = 0;
  for (let f = 0; f < 600 && shots < 8; f++) {
    cam.x = home.x; cam.z = home.z; b.lookAt(P.x, P.y + 1.5, P.z);
    w.__cadv(1); b.heal();
    const nm = u.cur && u.cur.getClip ? u.cur.getClip().name : '';
    if (/walk|strafe|run/.test(nm) && u.st.atk < 0 && !u.thr && f % 9 === 0) { still('walk_' + shots + '_' + nm, Math.PI / 2); still('walkf_' + shots + '_' + nm, 0.35); shots++; }
  }
}

if (M === 'pov') {
  // his guard from your eye, between swings, a few times; and the throw from your eye
  let shots = 0;
  for (let f = 0; f < 2400 && shots < 6; f++) {
    cam.x = home.x; cam.z = home.z; const P = u.g.position; b.lookAt(P.x, P.y + 1.3, P.z);
    w.__cadv(1); b.heal();
    if (u.st.atk < 0 && !u.thr && u.samIK && u.samIK.g > 0.9 && f % 97 === 0) { shot('pov_' + shots++, 420, 1.6); }
  }
}
