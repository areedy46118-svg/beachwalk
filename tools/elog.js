/* THE ENEMY LOG (2026-11-22): a crab and one of Elvédor's kind killed by you, the pack opened on the log, each shown (stills);
 * then as after a load — the likenesses dropped and made again from stand-ins. Run: PB_PORT=4223 PB_WAIT=500 sh
 * tools/probe.sh 'evalFile&f=/tools/elog.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera;
C.position.set(6, 1.7, -400); b.camBaseY = 1.7;
const K = b.makeCrabUnit(6.5, -404, {}), E = b.makeMutant(7, -403, 'elvedor', 0);
for (let i = 0; i < 600 && !(K.model && E.model && !E.parLate); i++) { b.frame(1); await sleep(15); if (E.parLate) try { if (E.parLate()) E.parLate = null; } catch (e) {} }
w.__clockOn();
K.st.awake = true; b.hurtCrab(K, 99, 1);
E.st.awake = true; b.hurtMutant(E, 99, 1);
for (let i = 0; i < 60; i++) w.__adv(1);
log('log:', JSON.stringify(b.elogSave()), '| likenesses', Object.keys(b.ELOG.snap).join(','));
b.openPack(); for (let i = 0; i < 20; i++) { w.__adv(1); await sleep(10); }
w.document.querySelector('#invpanel .pk-tab[data-tab=log]').click();
for (let i = 0; i < 40; i++) { await sleep(20); }
log('rows:', [...w.document.querySelectorAll('#elog-list .elog-row')].map((r) => r.textContent).join(' | '), '| name shown', w.document.querySelector('#elog-view .elog-name').textContent);
const pageShot = async (nm) => { for (let i = 0; i < 12; i++) { b.elogFrameS(); await sleep(20); } const c = w.document.querySelector('#elog-view canvas'); if (c) { const u = c.toDataURL('image/jpeg', 0.8); const s = u.split(',')[1]; const n = Math.ceil(s.length / 8000); for (let i = 0; i < n; i++) console.log(`[PBIMG] ${nm} ${i}/${n} ${s.slice(i * 8000, (i + 1) * 8000)}`); } };
await sleep(300); await pageShot('elog_a');
const rows = w.document.querySelectorAll('#elog-list .elog-row'); if (rows[0]) rows[0].click();
await sleep(400); await pageShot('elog_b');
// as after a load: no likenesses
b.closePack(); for (const k in b.ELOG.snap) delete b.ELOG.snap[k];
b.elogLoad(b.elogSave());
b.openPack(); w.document.querySelector('#invpanel .pk-tab[data-tab=log]').click();
let t = 0; for (; t < 400 && !b.ELOG.snap[b.ELOG.sel]; t++) { b.frame(1); b.elogFrameS(); await sleep(25); }
log('after a load: likeness of', b.ELOG.sel, 'made again', !!b.ELOG.snap[b.ELOG.sel], 'in', t, 'frames | stand-ins left', Object.keys(b.ELOG.pend).length);
await sleep(300); await pageShot('elog_c');
