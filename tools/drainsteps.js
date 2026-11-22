/* THE WAY INTO THE SEWER SOUNDS LIKE THE CHURCH'S TUNNEL (2026-11-21, the owner: "give the sewer entrance and tunnel the church
 * tunnel footsteps please"). From the sand before the drainage tunnel's mouth, W held into it for five seconds: each footstep's
 * recording, and whether you were in the tunnel when it fell. Run: PB_PORT=4223 PB_WAIT=200 sh tools/probe.sh 'evalFile&f=/tools/drainsteps.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
try { await b.audioCtx.resume(); } catch (e) {}
const C = b.camera, DX = b.DRAIN_XS(), DZ = b.DRAIN_ZS();
C.position.set(DX - 2.5, 1.7, DZ); b.camBaseY = 1.7; b.lookAt(DX + 20, 1.5, DZ);
for (let i = 0; i < 30; i++) { b.lookAt(DX + 20, 1.5, DZ); b.frame(1); await sleep(10); }
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
const out = []; let n0 = b.sampleLogS().length, seen = 0;
for (let i = 0; i < 300; i++) {
  b.lookAt(DX + 20, C.position.y, DZ); b.step(1 / 60);
  const L = b.sampleLogS(); if (L.length !== n0) { for (const s of L.slice(Math.max(0, L.length - (L.length - n0)))) out.push(s + (b.insideDrainS() ? '@tunnel' : '@sand')); n0 = L.length; }
}
w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }));
log('walked to x', (C.position.x - DX).toFixed(1), 'm past the mouth | in the tunnel', b.insideDrainS(), '| recordings', out.join(' ') || '(none)');
