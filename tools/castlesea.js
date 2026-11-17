/* THE SEA FROM INSIDE THE CASTLE (2026-11-17, `castleSeaK`). Not part of the game. Run headless:
 *   PB_PORT=4254 sh tools/probe.sh 'evalFile&f=/tools/castlesea.js' <out>
 * In the first castle: the wave bus's level as you stand at the gate and walk in along x. */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
const c = b.audioCtx; await w.AudioContext.prototype.resume.call(c);
const cam = b.camera.position, z = cam.z, wv = () => b.audioNodes().waveBusGain.gain.value;
log('settings waves', b.settings.waveVolume, '| in fort', b.state().inFort, '| start x', cam.x.toFixed(1));
for (const x of [cam.x, 10, 14, 20, 28, 36, 46]) {
  for (let i = 0; i < 90; i++) { cam.x = x; cam.z = z; b.frame(1); await sleep(16); }
  log('x', x.toFixed(1), '| waves bus', wv().toFixed(4), '(of', b.settings.waveVolume, '=', (wv() / b.settings.waveVolume * 100).toFixed(0) + ' %)', '| inFort', b.state().inFort);
}
