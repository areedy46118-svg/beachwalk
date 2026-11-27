// WHICH DRAW THE DRIVER REFUSES at boot ("glDrawElementsInstanced: Vertex buffer is not big enough", twice a session) — 2026-11-25.
// The game reloaded with `bwGlDbg` set (main.js checks every draw), 25 s of it, the refused draws listed.
//   PB_PORT=4241 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/glerr.js' <out>
localStorage.setItem('bwGlDbg', '1');
const fr = document.querySelector('iframe'); fr.contentWindow.location.reload(); await sleep(1500);
let w2 = null; for (let i = 0; i < 300; i++) { await sleep(100); try { w2 = fr.contentWindow; if (w2.__bw && w2.__glErrs) break; } catch (e) {} }
const B = w2.__bw;
for (let k = 0; k < 100 && !B.state().introDone; k++) { try { if (!B.state().started) B.beginGame(); } catch (e) {} await sleep(250); }
await sleep(8000);
localStorage.removeItem('bwGlDbg');
log('refused draws', w2.__glErrs.length); for (const e of [...new Set(w2.__glErrs)].slice(0, 10)) log('  ', e);
log('DONE');
