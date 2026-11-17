/* THE PUPPET BACK ON HIS BED AFTER A LOAD (2026-11-17). Not part of the game (its own profile). Run headless:
 *   PB_PORT=4259 sh tools/probe.sh 'evalFile&f=/tools/pupbed3.js&st=2' <out>     (st = the stage written into the save)
 * A checkpoint written, its puppet stage set to `st`, reloaded as a death; then walked to the house: where he is. */
const ST = +(new URLSearchParams(location.search).get('st') || 2), f = w.frameElement;
for (let i = 0; i < 300 && !b.state().introDone; i++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(20); }
localStorage.removeItem('beachwalk.save'); b.saveCheckpoint(); await sleep(500);
const sv = JSON.parse(localStorage.getItem('beachwalk.save') || 'null'); if (!sv) { log('no save'); return; }
sv.flags.elvStage = ST; localStorage.setItem('beachwalk.save', JSON.stringify(sv));
sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
f.contentWindow.location.reload(); await sleep(1500);
let w2 = null; for (let i = 0; i < 200; i++) { await sleep(100); try { w2 = f.contentWindow; if (w2.__bw && w2.__bw.state) break; } catch (e) {} }
const B = w2.__bw, btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
for (let i = 0; i < 400 && (B.frozen() || !B.state().introDone); i++) await sleep(100);
try { await B.audioCtx.suspend(); } catch (e) {}
B.settings.devMode = true;
log('loaded: stage', B.elvS().elvStage, 'carrying', B.elvS().elvCarrying);
const cam = B.camera.position;
for (const z of [-560, -700]) { for (let i = 0; i < 150; i++) { cam.set(14, cam.y, z); B.frame(1); await sleep(15); } }
let k = 0; for (; k < 600 && !(B.elvPupS() && B.elvPupS().bed); k++) { cam.set(14, cam.y, -700); await sleep(50); }
for (let i = 0; i < 60; i++) { cam.set(14, cam.y, -700); B.frame(1); await sleep(15); }
const P = B.elvPupS(), R = P && P.bed && P.bed.root; log('placed after', (k * 0.05).toFixed(1), 's at the house');
const S = B.elvS(); log('loader', JSON.stringify(B.bootLeft()).slice(0, 400)); log('house', !!B.scene.getObjectByName('puppetHouse'), 'ready', S.houseReady, '| puppet src', !!(P && P.src), '| elvPup', !!P);
log('at the house: stage', B.elvS().elvStage, '| bed puppet', R ? 'visible ' + R.visible : 'NOT PLACED', '| carrying', B.elvS().elvCarrying);
