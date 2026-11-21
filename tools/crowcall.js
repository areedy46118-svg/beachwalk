/* THE CALL OF THE CROW (2026-11-19): on the lighthouse's top with the horn, the call, the crow out of the sky, the flight,
 * the desert, its "E — End game" and the stats. Run: PB_PORT=4253 sh tools/probe.sh 'evalFile&f=/tools/crowcall.js' <out> */
b.settings.devMode = true;
const fr = async (n) => { for (let i = 0; i < n; i++) { b.frame(1); if (i % 8 === 0) await sleep(4); } };
b.loadIsle(); for (let i = 0; i < 300 && !b.isleS().ready; i++) { b.frame(1); await sleep(50); }
b.placeOnIsle(); await fr(60);
log('isle', JSON.stringify(b.isleS()).slice(0, 120), '| merchant at the door', !!(b.trader3World && b.trader3World.parent), b.trader3World ? b.trader3World.position.toArray().map((v) => +v.toFixed(1)).join(',') : '', '| horn name', b.hornItem.name);
b.addToInventory(b.hornItem);
for (let i = 0; i < 100 && !b.TC.crow; i++) await sleep(100);
b.crowCallFromTop(); await fr(2);
log('after the call: cut', JSON.stringify(b.tmpS().cut), 'crow', !!b.TC.crow);
const seen = []; let crowVis = 0;
const t0 = performance.now(); let k = 0, lhMax = 0;
while (performance.now() - t0 < 42000) { b.frame(1); await sleep(16); k++; const S = b.tmpS(); if (b.TC.crow && b.TC.crow.visible) crowVis++; if (k % 150 === 0) seen.push(S.cut + (S.room ? 'R' : '') + (S.inTemple ? 'T' : '')); if (S.cut < 0 && S.inTemple) break; }
log('flight', seen.join(' '), '| crow seen in', crowVis, 'checks | inTemple', b.tmpS().inTemple);
for (let i = 0; i < 120; i++) { b.frame(1); await sleep(16); }
const pr = w.document.getElementById('prompt');
log('in the desert: prompt', JSON.stringify(pr ? pr.textContent : null), '| ended', b.state().ended);
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyE', key: 'e' })); await fr(10);
log('after E: ended', b.state().ended, '| end card', w.document.getElementById('end') && w.document.getElementById('end').classList.contains('show'));
