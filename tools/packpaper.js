/* PICKING THINGS IN THE PACK, LISTENED TO (2026-11-19, "have the paper sounds i dont want the claude sound effects"): the
 * pack open with a few things, click through them, and count what started — his page turns (`packPaper`) vs anything
 * synthesized (oscillators, noise buffers through the pack's band filters). Run:
 *   PB_PORT=4251 sh tools/probe.sh 'evalFile&f=/tools/packpaper.js' <out> */
const ctx = b.audioCtx; try { await w.AudioContext.prototype.resume.call(ctx); } catch (e) { /* */ }
for (const k of ['shovelItem', 'glowstickItem', 'waterBottleItem', 'syringeItem', 'keyItem', 'ringItem', 'jarItem', 'crabItem']) { try { if (b[k]) b.addToInventory(b[k]); } catch (e) { /* */ } }
for (let i = 0; i < 100 && !(b.sampleBanks.packPaper || []).filter(Boolean).length; i++) { b.frame(1); await sleep(50); }
log('paper takes loaded', (b.sampleBanks.packPaper || []).filter(Boolean).length);
b.openPack(); for (let i = 0; i < 40; i++) { b.frame(1); await sleep(30); }
const bank = new Set((b.sampleBanks.packPaper || []).filter(Boolean)); let paper = 0, otherBuf = 0, osc = 0;
const S0 = w.AudioBufferSourceNode.prototype.start; w.AudioBufferSourceNode.prototype.start = function (...a) { if (bank.has(this.buffer)) paper++; else otherBuf++; return S0.apply(this, a); };
const O0 = w.OscillatorNode.prototype.start; w.OscillatorNode.prototype.start = function (...a) { osc++; return O0.apply(this, a); };
for (let i = 0; i < 8; i++) { b.selectPackSlot(i); for (let k = 0; k < 40; k++) { b.frame(1); await sleep(25); } }
log('8 picks: page turns', paper, '| other buffers started', otherBuf, '| oscillators', osc);
