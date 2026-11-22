/* THE MENU HOLDS THE GAME, THE MUSIC PLAYS (2026-11-22): on the beach and in a cut (the cellar's door, `celBusy`), the menu opened —
 * is the frame held, the audio clock running, the effects ducked only in the cut? Run: PB_PORT=4223 PB_WAIT=200 sh tools/probe.sh
 * 'evalFile&f=/tools/menuhold.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 200 && !b.state().introDone; i++) { await sleep(100); }
b.introSkip && b.introSkip();
await sleep(1500);
const ac = () => { try { return b.audioCtx ? b.audioCtx.currentTime : null; } catch (e) { return null; } };
b.openMenu(); const t0 = performance.now(); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(20); }
log('beach, menu open', JSON.stringify(b.menuHoldS()), 'introDone', b.state().introDone);
b.closeMenu(); for (let i = 0; i < 5; i++) b.frame(1);
log('beach, menu shut', JSON.stringify(b.menuHoldS()));
b.setCelBusyS(true); b.openMenu(); for (let i = 0; i < 10; i++) { b.frame(1); await sleep(20); }
log('in a cut, menu open', JSON.stringify(b.menuHoldS()));
b.closeMenu(); b.setCelBusyS(false); for (let i = 0; i < 10; i++) { b.frame(1); await sleep(20); }
log('cut, menu shut', JSON.stringify(b.menuHoldS()));
