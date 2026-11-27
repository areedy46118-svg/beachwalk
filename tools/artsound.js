/* THE ARTIFACT'S OWN SOUND (2026-11-25, the owner's "artifact soound": "MAKE THIS PICKING UP OR PUTTING ON AND TAKING OFF ARTIFACT SOUND").
 * Put on, swapped, taken off: each logged as the samples played (`artAttach`, and the rate a take-off plays at).
 * PB_PORT=4227 PB_WAIT=200 sh tools/probe.sh 'evalFile&f=/tools/artsound.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1500);
const banks = b.sampleBanksS(); log('loaded', !!(banks.artAttach && banks.artAttach.filter(Boolean).length));
const played = []; const S0 = w.AudioBufferSourceNode.prototype.start;
w.AudioBufferSourceNode.prototype.start = function (...a) { if (banks.artAttach && banks.artAttach.includes(this.buffer)) played.push('artAttach@' + this.playbackRate.value.toFixed(2)); return S0.apply(this, a); };
const K = b.katanaItem, S = b.seaArtItem, F = b.flameArtItem;
b.addToInventory(K); b.addToInventory(S); b.addToInventory(F);
b.attachArtifact(S, K); log('put on', played.splice(0).join(' '));
b.attachArtifact(F, K); log('swapped', played.splice(0).join(' '));
b.detachArtifact(K); log('taken off', played.splice(0).join(' '));
