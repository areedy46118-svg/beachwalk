/* WHAT THE ANIMATION COSTS (2026-11-22): every AnimationMixer.update timed for 240 frames at a few places, with how many
 * mixers ran, and how many of them were more than 40 m from the camera or behind it — what a half-rate rule could save.
 * PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/mixcost.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(8000);
const T = b.THREE, C = b.camera, P = T.AnimationMixer.prototype, up = P.update;
let ms = 0, msFar = 0, n = 0, nFar = 0; const seen = new Set(), farSeen = new Set(), _v = new T.Vector3(), _f = new T.Vector3();
P.update = function (dt) {
  const t0 = performance.now(); const r = up.call(this, dt); const t = performance.now() - t0; ms += t; n++; seen.add(this);
  const root = this.getRoot(); if (root && root.matrixWorld) { _v.setFromMatrixPosition(root.matrixWorld); C.getWorldDirection(_f); const d = _v.distanceTo(C.position); if (d > 40 || _v.sub(C.position).dot(_f) < -2) { msFar += t; nFar++; farSeen.add(this); } }
  return r;
};
const run = async (name) => {
  ms = msFar = n = nFar = 0; seen.clear(); farSeen.clear();
  const t0 = performance.now(); for (let i = 0; i < 240; i++) b.frame(1); const all = performance.now() - t0;
  log(name.padEnd(12), 'frame', (all / 240).toFixed(2), 'ms | mixers', seen.size, 'calls/f', (n / 240).toFixed(1), 'ms/f', (ms / 240).toFixed(3), '| far/behind', farSeen.size, 'ms/f', (msFar / 240).toFixed(3));
};
for (const z of [-60, -300, -600, -900]) { b.clearRoomFlags(); C.position.set(6, 1.7, z); b.camBaseY = 1.7; b.look(Math.PI, -0.05); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); } await run('beach ' + z); }
for (const k of ['tav', 'cat', 'keep', 'uc']) {
  const RB = b.ROOM_BACK[k]; if (!RB) continue; b.clearRoomFlags(); RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
  RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(10); } await run(k);
}
