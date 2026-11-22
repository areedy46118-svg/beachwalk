/* SKRIM'S VOICE FROM WHERE HE IS (2026-11-21, the owner: "MAKE HIS AUDIO DIRECTIONAL"). In the whale, his fight; a line of his
 * forced (his start roar); while it plays you turn a quarter at a time and the panner's place (in your view: +x right, −z
 * ahead) is read off after each turn — he should go ahead → left → behind → right as you turn right round. Then you walk
 * 20 m off and his gain is read. Frame-driven audio clock (headless never moves it).
 * Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/skrimvoxdir.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
b.placeInWhale();
const S = b.SKRIM, cam = b.camera.position;
for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 200 && !(b.sampleBanks.skrimStart || []).filter(Boolean).length; i++) await sleep(50);
w.requestAnimationFrame = () => 0;
const u = S.u, P = u.g.position, ctx = b.audioCtx; let t = 0;
const ct0 = ctx.currentTime; Object.defineProperty(ctx, 'currentTime', { get: () => ct0 + t, configurable: true });
cam.set(P.x, P.y + 1.62, P.z - 5); b.lookAt(P.x, P.y + 1.5, P.z);
S.stage = 'dig'; b.skrimFight();
const tr = b.farmVoxTrackedS(); log('tracked lines after his roar', tr.length, tr[0] ? 'panner ' + tr[0].pn.panningModel + ' line ' + (tr[0].end - ct0).toFixed(2) + ' s' : '');
const M = tr[0]; if (!M) { log('NO TRACKED LINE'); } else {
  const rd = () => `x ${M.pn.positionX.value.toFixed(2)} y ${M.pn.positionY.value.toFixed(2)} z ${M.pn.positionZ.value.toFixed(2)} gain ${M.g.gain.value.toFixed(3)}`;
  for (const Q of [M.pn.positionX, M.pn.positionY, M.pn.positionZ, M.g.gain, M.lp.frequency]) Q.setTargetAtTime = (v) => { Q.value = v; return Q; };   // (headless: the audio clock never runs a ramp)
  log('facing him:', rd());
  const fx = P.x - cam.x, fz = P.z - cam.z, fl = Math.hypot(fx, fz), F = [fx / fl, fz / fl], Rt = [-F[1], F[0]];
  for (const [lab, dir] of [['turned right 90 (he is on your left)', Rt], ['turned 180 (behind you)', [-F[0], -F[1]]], ['turned left 90 (he is on your right)', [-Rt[0], -Rt[1]]]]) {
    for (let i = 0; i < 12; i++) { b.lookAt(cam.x + dir[0] * 5, cam.y, cam.z + dir[1] * 5); t += 1 / 60; b.frame(1); }
    log(lab + ':', rd());
  }
  cam.set(P.x, P.y + 1.62, P.z - 20); for (let i = 0; i < 6; i++) { t += 1 / 60; b.frame(1); } log('20 m off:', rd());
}
