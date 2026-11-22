/* THE ONE OFF THE BENCH STAYS DEAD (2026-11-22): injected, he is killed; saved in the cellar; reloaded — is the bench empty, is he
 * gone, are the rest down? Run: PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/benchdead.js' <out> */
const f = w.frameElement;
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
await sleep(2000);
b.settings.devMode = true;
const RB = b.ROOM_BACK.cel; RB.load(); for (let i = 0; i < 300 && !RB.ready(); i++) { b.frame(2); await sleep(50); } RB.place();
for (let i = 0; i < 400 && !(b.cpS().models === 8 && b.cpS().ready === 8 && b.celPupS()); i++) { b.frame(1); await sleep(15); }
b.gainJar(1); b.cpInject(); for (let i = 0; i < 60 * 5; i++) { b.frame(1); if (i % 20 === 0) await sleep(1); }
const bench = b.cpUnitsS().find((u) => u.cpBench);
log('injected: fight', b.cpS().fight, '| bench awake', bench && bench.st.awake, '| copy on the bench', b.celPupS().root.visible);
b.hurtMutant(bench, 999, 1); for (let i = 0; i < 120; i++) { b.frame(1); if (i % 20 === 0) await sleep(1); }
log('killed: alive', bench.st.alive, '| fight', b.cpS().fight);
b.saveCheckpoint();
const sv = JSON.parse(localStorage.getItem('beachwalk.save')); log('saved celBench', sv.flags.celBench, 'celPupFight', sv.flags.celPupFight);
sessionStorage.setItem('beachwalk.load', 'checkpoint'); sessionStorage.setItem('beachwalk.skipIntro', '1'); sessionStorage.setItem('beachwalk.died', '1');
w.__old = 1; f.contentWindow.location.reload(); await sleep(1500);
let w2 = null; for (let i = 0; i < 200; i++) { await sleep(100); try { w2 = f.contentWindow; if (!w2.__old && w2.__bw && w2.__bw.state) break; } catch (e) {} }
const B = w2.__bw; const btn = w2.document.querySelector('.dc-restart'); if (btn) btn.click();
for (let i = 0; i < 300 && (B.frozen() || !B.state().introDone); i++) await sleep(100);
await sleep(4000);
const P = B.celPupS(), U = B.cpUnitsS();
log('reloaded: room', B.devRoom(), '| copy on the bench', P ? P.root.visible : 'none', '| bench unit', !!U.find((u) => u.cpBench), '| units', U.length, '| hung', U.filter((u) => u.cpHung).length, '| fight', B.cpS().fight);
