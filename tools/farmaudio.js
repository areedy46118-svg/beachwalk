/* THE FARMERS' FIGHT, LISTENED TO (2026-11-17, the owner: "THE AUDIO CUT OUT AGAIN WHEN FIGHTING THE FARMERS … IT SHOULD
 * NEVER DO THIS"). Not part of the game. Run headless:
 *   PB_PORT=4246 sh tools/probe.sh 'evalFile&f=/tools/farmaudio.js&secs=60' <out>
 * The first castle with the fight on, in REAL time (the audio thread renders as it would for you, into a null sink),
 * `tools/audiowatch.js` on it: every non-finite param write and thrown param call, nodes made per second, and the
 * master's level ten times a second. You stand in the street healed and land a blow on the nearest man every 1.5 s.
 * Prints the worst seconds for node load, any second the master went silent while the fight ran, and the context's
 * state. */
const Q = new URLSearchParams(location.search), S = +(Q.get('secs') || 60);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/audiowatch.js'); w.__awPatch();
await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
const c = b.audioCtx; await w.AudioContext.prototype.resume.call(c);
log('tap', w.__awTap()); await sleep(600); await w.AudioContext.prototype.resume.call(c);
b.settings.devMode = false;
const cam = b.camera.position, home = [cam.x, cam.z];
const W = w.__aw; W.level.length = 0;
const t0 = performance.now(); let hits = 0, lastHit = 0, cut = [];
while (performance.now() - t0 < S * 1000) {
  const us = b.farmUnitsS().filter((u) => u.st.alive && u.model && u.g.visible && u.farm && u.farm.out);
  let tgt = null, bd = 99; for (const u of us) { const d = Math.hypot(u.g.position.x - cam.x, u.g.position.z - cam.z); if (d < bd) { bd = d; tgt = u; } }
  if (tgt) b.lookAt(tgt.g.position.x, cam.y - 0.15, tgt.g.position.z);
  if (tgt && bd < 4 && performance.now() - lastHit > 1500) { lastHit = performance.now(); hits++; b.hurtMutant(tgt, Q.get('heavy') ? 2 : 1, Q.get('heavy') ? 1.2 : 0.5); }
  b.frame(1); cam.x = home[0]; cam.z = home[1];
  if (b.state().hp < 3) b.heal();
  await sleep(14);
}
const L = W.level.map((r) => ({ t: r[0], rms: r[1], nan: r[2], st: r[3], g: r[4], n: r[5] }));
const perSec = {}; for (const r of L) { const k = Math.floor(r.t); perSec[k] = (perSec[k] || 0) + r.n; }
const secs = Object.entries(perSec).sort((a, b2) => b2[1] - a[1]);
// silent runs: rms < 1e-4 for 3+ samples in a row (0.3 s) while the master gain is up
let run = 0; for (const r of L) { if (r.rms < 1e-4 && r.g > 0.05) { run++; if (run === 3) cut.push(r.t); } else run = 0; }
log('fight', S, 's real time | blows on them', hits, '| killed', b.farmUnitsS().filter((u) => !u.st.alive).length, '| ctx', c.state);
log('nodes made', W.nodes, '| busiest seconds (nodes/s)', secs.slice(0, 6).map(([k, v]) => k + 's:' + v).join(' '), '| mean', (W.nodes / S).toFixed(0));
log('non-finite param writes', W.bad.length, JSON.stringify(W.bad.slice(0, 4)));
log('thrown param calls', W.thrown.length, JSON.stringify(W.thrown.slice(0, 4)));
log('busiest 0.1 s (nodes)', Math.max(...L.map((r) => r.n)), '| samples with the context not running', L.filter((r) => r.st !== 'running').length, 'of', L.length, '| master gain min', Math.min(...L.map((r) => r.g)).toFixed(3), '| dark knight', JSON.stringify((() => { const d = b.dkSlotS().unit; return d ? { awake: d.st.awake, alive: d.st.alive, vis: d.g.visible } : null; })()), '| loadSilent-ish', JSON.stringify({ bootHold: b.restoreS ? b.restoreS().bootHold : '?', gate: b.audioGate && b.audioGate() }));
log('NaN samples on the master', L.reduce((s, r) => s + r.nan, 0), '| silent runs (0.3 s+, master up) at', cut.join(' ') || 'none', '| rms median', (L.map((r) => r.rms).sort((a, b2) => a - b2)[L.length >> 1] || 0).toFixed(4));
