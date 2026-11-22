/* A KEY PICKED UP SOUNDS LIKE THE KEYS IN THE PACK (2026-11-21, the owner: "when picking up a key use the key sound effects from
 * the pack"). Each key put in the pack through the one door every key comes in by (`addToInventory`), and a shell taken as a
 * press takes it: which recordings started for each. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/keypick.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 300; i++) { b.frame(1); await sleep(20); }
try { await b.audioCtx.resume(); } catch (e) {}
for (const nm of ['Captain\'s Chest Key', 'Fancy house gate key', 'Spare fancy house gate key', "Henry's cell key", 'Skull Key', 'Tavern storage key']) {
  const it = b.packByName(nm); if (!it) { log(nm, 'no item'); continue; }
  const s0 = b.sampleLogS().length; b.addToInventory(it); const s1 = b.sampleLogS();
  log(nm, '| on the ring', b.inventory.includes(it), '| sounds', s1.slice(s0).join(',') || '(none)');
}
const sh = b.interactables.find((q) => { const l = typeof q.label === 'function' ? q.label() : q.label; return q.kind === 'inventory' && !/key/i.test(l || ''); });
if (sh) { const s0 = b.sampleLogS().length; b.takeNowS(sh); log('not a key:', typeof sh.label === 'function' ? sh.label() : sh.label, '| sounds', b.sampleLogS().slice(s0).join(',') || '(none)'); }
