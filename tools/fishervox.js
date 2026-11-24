/* THE VERY OLD FISHERMAN'S VOICE (2026-11-23, the owner's four takes: "make them the fisher dialog sounds dont have them too
 * loud"). The four loaded; his dialogue opened the way the game opens it; a take on his first line, and on each line clicked
 * through after it (one mouth: the last cut off), its gain beside Skrim's talk at the same distance.
 * PB_PORT=4227 PB_WAIT=240 sh tools/probe.sh 'evalFile&f=/tools/fishervox.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(2500);
const bank = (n) => (b.sampleBanksS ? b.sampleBanksS()[n] : null);
const V = b.FISHER_VOICE, d = w.document;
log('ctx', b.audioCtx && b.audioCtx.state);
const take = () => { const M = V.mouth; if (!M) return 'none'; return (M.src.buffer.duration).toFixed(2) + 's gain ' + M.g.gain.value.toFixed(2); };
const fp = new b.THREE.Vector3(); b.scene.traverse((o) => { if (o.isSprite && o.material && o.material.map && !fp.lengthSq() && o.parent && o.parent.name !== '' ) {} });
const fs = b.fisherman; fs.getWorldPosition(fp); log('fisherman at', fp.toArray().map((v) => v.toFixed(1)).join(','));
b.camera.position.set(fp.x + 1.4, fp.y + 1.6, fp.z + 0.6); b.frame(2);
b.talkToFishermanS(); await sleep(2500);
log('line 1', d.getElementById('dialog').classList.contains('show'), '|', take());
const durs = [];
for (let k = 0; k < 5; k++) {
  const ch = [...d.querySelectorAll('#dialog-choices button, #dialog-choices .choice, #dialog-choices > *')].filter((e) => e.offsetParent !== null || true);
  if (!ch.length) { log('no choices at', k); break; }
  const m0 = V.mouth; ch[k % ch.length].click(); await sleep(2500);
  log('line', k + 2, '|', (d.querySelector('#dialog-text') || {}).textContent ? d.querySelector('#dialog-text').textContent.slice(0, 50) : '', '|', take(), V.mouth !== m0 ? 'new take' : 'SAME');
  if (V.mouth) durs.push(V.mouth.src.buffer.duration.toFixed(2));
  if (!b.state().dialogOpen && !d.getElementById('dialog').classList.contains('show')) break;
}
log('takes heard', [...new Set(durs)].join(' '));
