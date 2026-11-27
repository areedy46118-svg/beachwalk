/* SKRIM OFF HIS CHAIN, FRAME BY FRAME (2026-11-26, the owner: "make skrims animation jumping off the chain smoother and look
 * better … especially whne he lands"). In the whale, the fight on, him at 49 %: up his chain; no heads sent (`H.n` set full), so he
 * flips off it as soon as the wait is over. From the flip's first frame to 3 s after he is back in the fight, every frame: his
 * hips and his lowest toe over the floor, his hips' speed, the clips in the mix and their weights — and the biggest single-frame
 * JUMP of his hips and of any joint (a pop). Stills from the side every `&every=` s (0.12) into a strip.
 *   PB_PORT=4231 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/skrimflip.js' <out> */
const Q = new URLSearchParams(location.search), EVERY = +(Q.get('every') || 0.12), VERB = !!Q.get('verb');
b.settings.devMode = false;
b.placeInWhale();
const S = b.SKRIM, cam = b.camera.position, C = b.camera;
for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
const u = S.u; if (!u || !u.model) { log('no skrim'); return; }
for (let i = 0; i < 30; i++) b.frame(1);
w.requestAnimationFrame = () => 0;
const P = u.g.position, T = b.THREE;
S.stage = 'dig'; cam.set(P.x + Math.sin(u.g.rotation.y) * 4, P.y + 1.62, P.z + Math.cos(u.g.rotation.y) * 4);
b.skrimFight();
for (let i = 0; i < 120 && S.stage !== 'fight'; i++) b.step(1 / 60);
for (let i = 0; i < 300 && !(b.CRY && b.CRY.built); i++) b.step(1 / 60);
u.st.hp = Math.round(u.kind.hp * 0.49);
const k = u.sk, bones = []; u.model.traverse((o) => { if (o.isBone) bones.push(o); });
const hips = u.model.getObjectByName('Character1_Hips'), toes = ['Character1_LeftToeBase', 'Character1_RightToeBase', 'Character1_LeftFoot', 'Character1_RightFoot'].map((n) => u.model.getObjectByName(n)).filter(Boolean);
log('clips', ['flipOff', 'land', 'jumpLand', 'idle'].map((n) => n + ':' + (u.clips[n] ? u.clips[n].getClip().duration.toFixed(2) : 'NONE')).join(' '));
const frames = []; let t = 0, t0 = -1, after = -1, lastHip = null, lastB = null; const v = new T.Vector3(), strip = [];
const side = () => {
  const keep = cam.clone(), kq = C.quaternion.clone(), kf = C.fov; C.fov = 42; C.updateProjectionMatrix();
  const dx = keep.x - P.x, dz = keep.z - P.z, d = Math.hypot(dx, dz) || 1, fl = b.skrimFloorW(P.x, P.z);
  C.position.set(P.x - dz / d * 7.5, fl + 2.2, P.z + dx / d * 7.5); C.lookAt(P.x, fl + 2.4, P.z); C.updateMatrixWorld(true);
  b.renderer.render(b.scene, C);
  const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 150; c.height = 250;
  const g = c.getContext('2d'); g.filter = 'brightness(2.2)'; const sw = src.height * 0.6; g.drawImage(src, (src.width - sw) / 2, 0, sw, src.height, 0, 0, 150, 250);
  strip.push(c); C.position.copy(keep); C.quaternion.copy(kq); C.fov = kf; C.updateProjectionMatrix();
};
let nextShot = 0;
for (let f = 0; f < 60 * 40; f++) {
  const dx = cam.x - P.x, dz = cam.z - P.z, d = Math.hypot(dx, dz) || 1; cam.x = P.x + dx / d * 6; cam.z = P.z + dz / d * 6;
  b.lookAt(P.x, P.y + 1.3, P.z);
  const H0 = k.hang; if (H0 && H0.ph === 'hang' && H0.n < 5) H0.n = 5;       // (no heads: he comes off as soon as the wait is over)
  b.step(1 / 60); t += 1 / 60; b.heal && b.heal();
  const H = k.hang, ph = H ? H.ph : (k.hangDone ? 'after' : 'before');
  if (ph === 'flip' && t0 < 0) t0 = t;
  if (t0 < 0) continue;
  if (ph === 'after' && after < 0) after = t;
  u.g.updateMatrixWorld(true);
  const fl = b.skrimFloorW(P.x, P.z), hp = hips.getWorldPosition(new T.Vector3());
  let lo = 1e9; for (const tb of toes) lo = Math.min(lo, tb.getWorldPosition(v).y);
  const pos = bones.map((bn) => bn.getWorldPosition(new T.Vector3()));
  let pop = 0, popN = ''; if (lastB) for (let i = 0; i < bones.length; i++) { const dd = pos[i].distanceTo(lastB[i]); if (dd > pop) { pop = dd; popN = bones[i].name.replace('Character1_', ''); } }
  const mix = u.mixer._actions.filter((a) => a.isScheduled() && a.getEffectiveWeight() > 0.01).map((a) => a.getClip().name + ' ' + a.getEffectiveWeight().toFixed(2) + '@' + a.time.toFixed(2)).join(' + ');
  frames.push({ t: t - t0, ph, rise: !!k.rise, g: P.y - fl, hip: hp.y - fl, toe: lo - fl, hv: lastHip ? hp.distanceTo(lastHip) * 60 : 0, hvy: lastHip ? (hp.y - lastHip.y) * 60 : 0, pop, popN, mix });
  lastHip = hp; lastB = pos;
  if (t - t0 >= nextShot && strip.length < 34) { nextShot += EVERY; side(); }
  if (after >= 0 && t > after + 3) break;
}
const F = frames; if (!F.length) { log('he never flipped'); return; }
const tl = F.findIndex((x) => x.ph !== 'flip');
log('flip', F[0].t.toFixed(2), '->', tl >= 0 ? F[tl].t.toFixed(2) : '?', 's | back in the fight at', (after - t0).toFixed(2));
// the worst single-frame jumps (a smooth body moves a few cm a frame; a pop is tens of cm in one)
const worst = F.map((x, i) => ({ i, ...x })).sort((a, c) => c.pop - a.pop).slice(0, 8).sort((a, c) => a.t - c.t);
for (const x of worst) log('  JUMP at', x.t.toFixed(3), 's', x.ph + (x.rise ? '+rise' : ''), '|', x.popN, 'moved', x.pop.toFixed(2), 'm in one frame | hips', x.hip.toFixed(2), 'toe', x.toe.toFixed(2), 'group', x.g.toFixed(2), '|', x.mix);
log('lowest toe over the floor: min', Math.min(...F.map((x) => x.toe)).toFixed(2), 'at', F.reduce((a, x) => (x.toe < a.toe ? x : a)).t.toFixed(2), 's | hips lowest', Math.min(...F.map((x) => x.hip)).toFixed(2));
const step = VERB ? 1 : 3;
for (let i = 0; i < F.length; i += step) { const x = F[i]; if (!VERB && (x.t > 4.2)) break; log(x.t.toFixed(2), (x.ph + (x.rise ? '+rise' : '')).padEnd(10), 'group', x.g.toFixed(2), 'hips', x.hip.toFixed(2), 'toe', x.toe.toFixed(2), '| hips', x.hvy.toFixed(1), 'm/s up | worst joint', x.pop.toFixed(2), x.popN, '|', x.mix); }
{ const c = document.createElement('canvas'), per = 17; c.width = 150 * per; c.height = 250 * Math.ceil(strip.length / per); const g = c.getContext('2d'); strip.forEach((s2, i) => { g.drawImage(s2, (i % per) * 150, Math.floor(i / per) * 250); g.fillStyle = '#f33'; g.font = '13px monospace'; g.fillText((i * EVERY).toFixed(2), (i % per) * 150 + 4, Math.floor(i / per) * 250 + 14); });
  const d = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'flipstrip', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000)); }
log('DONE');
