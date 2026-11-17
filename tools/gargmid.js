/* A SAVE IN THE MIDDLE OF THE GARGOYLES (2026-11-17, the owner: "ONLY ONE GARGOYLE SPAWNED WHEN LOADING THE CHECKPOINT").
 * Not part of the game (its own headless Chrome and save). Run:
 *   PB_PORT=4248 sh tools/probe.sh 'evalFile&f=/tools/gargmid.js' <out>        three killed, a checkpoint, reloaded
 *   PB_PORT=4248 sh tools/probe.sh 'evalFile&f=/tools/gargmid.js&old=1' <out>  the save rewritten as the old game wrote it
 *                                                                               (three gargoyle keys among the dead, garg 0)
 * Counts the gargoyles alive and on their walls after the load: four is right. */
const Q = new URLSearchParams(location.search), OLD = !!Q.get('old');
w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
w.__ggBoot(); for (let i = 0; i < 120 && !w.__ggBooted; i++) await sleep(1000);
const G = b.GARG, M = b.MINO, cam = b.camera.position, A = b.c13Dbg().arch, f = w.frameElement;
M.stage = 'with'; M.ally = true; M.place = '?';
const home = [b.C13_X + A.ax + A.ux * (A.L + 2.0), b.C13_Z + A.az + A.uz * (A.L + 2.0)];
cam.set(home[0], cam.y, home[1]); for (let i = 0; i < 120; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); }
G.phase = 1; for (const u of G.units.slice(0, 3)) { u.gp.mode = 'recover'; b.hurtMutantTest(u, 999); }
for (let i = 0; i < 120; i++) { cam.x = home[0]; cam.z = home[1]; w.__c13Step(1); }
log('mid-fight: phase', G.phase, 'dead', G.units.filter((u) => !u.st.alive).length, 'of', G.units.length);
localStorage.removeItem('beachwalk.save');
b.saveCheckpoint(); await sleep(600);
const sv = JSON.parse(localStorage.getItem('beachwalk.save') || 'null');
if (!sv) { log('no save written'); return; }
let gk = sv.flags.deadUnits.filter((k) => k.startsWith('gargoyle@'));
log('saved: garg', sv.flags.garg, '| gargoyles among the dead', gk.length);
if (OLD) { sv.flags.deadUnits.push(...G.units.slice(0, 3).map((u) => u.saveKey)); localStorage.setItem('beachwalk.save', JSON.stringify(sv)); log('rewritten the old way: gargoyles among the dead', sv.flags.deadUnits.filter((k) => k.startsWith('gargoyle@')).length); }
sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
f.contentWindow.location.reload(); await sleep(1500);
let w2 = null; for (let i = 0; i < 200; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) break; } catch (e) {} }
const B = w2.__bw, btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
for (let i = 0; i < 400 && (B.frozen() || !B.state().introDone || !B.state().inC13); i++) await sleep(100);
try { await B.audioCtx.suspend(); } catch (e) { /* */ }
for (let i = 0; i < 60 && B.GARG.units.length < 4; i++) await sleep(250);
await sleep(1500);
const U = B.GARG.units;
log('after the load: inC13', B.state().inC13, '| garg phase', B.GARG.phase, '| gargoyles', U.length, 'alive', U.filter((u) => u.st.alive && !u.retired).length, 'retired', U.filter((u) => u.retired).length, 'on their walls', U.filter((u) => u.gp && u.gp.mode === 'perch').length);
