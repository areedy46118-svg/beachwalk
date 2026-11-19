/* DOORS AND LIFTS, LISTENED TO (2026-11-19, "give the lifts and doors that dont have the unlock sound the item pickup
 * sound"): a few doors' own uses run, and what started counted — his pickup sound, his key in a lock. Run:
 *   PB_PORT=4251 sh tools/probe.sh 'evalFile&f=/tools/doorsnd.js' <out> */
const ctx = b.audioCtx; try { await w.AudioContext.prototype.resume.call(ctx); } catch (e) { /* */ }
for (let i = 0; i < 100 && !['pickup', 'unlock'].every((k) => (b.sampleBanks[k] || []).filter(Boolean).length); i++) { b.frame(1); await sleep(50); }
const pick = new Set((b.sampleBanks.pickup || []).filter(Boolean)), lock = new Set((b.sampleBanks.unlock || []).filter(Boolean));
let P = 0, U = 0; const S0 = w.AudioBufferSourceNode.prototype.start;
w.AudioBufferSourceNode.prototype.start = function (...a) { if (pick.has(this.buffer)) P++; if (lock.has(this.buffer)) U++; return S0.apply(this, a); };
const label = (e) => (typeof e.label === 'function' ? e.label() : e.label) || '';
const tryUse = async (match) => {
  const e = b.interactables.find((x) => match(label(x), x)); if (!e) { log(String(match).slice(0, 60), 'not found'); return; }
  const p0 = P, u0 = U; try { (e.onActivate || (e.data && e.data.onActivate))(); } catch (err) { log('threw', String(err).slice(0, 80)); }
  await sleep(300); log(JSON.stringify(label(e)).padEnd(26), '| pickup', P - p0, '| unlock', U - u0);
};
await tryUse((l, x) => l === 'Open the door' && x.root === b.lighthouse.userData.door || (l === 'Open the door' && !x.far));
await tryUse((l) => l === 'Close the door');
await tryUse((l) => l === 'To Enter Bunker');
log('entries with onActivate', b.interactables.filter((x) => x.onActivate || (x.data && x.data.onActivate)).length);
