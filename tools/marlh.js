/* THE MARIONETTE AT THE TOP OF THE LIGHTHOUSE (2026-11-23): him with you, up the ladder (its cut) — where he is put (on the gallery,
 * in your sight: the angle off your look), the beat, his head round, the talk (each line, each answer clicked), the horn held until
 * it closes, the achievement, his walk round the gallery and away, home on his swing; then the horn calls the crow.
 * &ans=k|amazing  PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/marlh.js&ans=amazing' <out> */
const Q = new URLSearchParams(location.search), ANS = Q.get('ans') || 'amazing';
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/sgtest.js'); await ev('/tools/isleshot.js');
log('isle', JSON.stringify(await w.__isle.boot()));
b.settings.devMode = true;
b.setCelWash(2); b.marRestore('with');
for (let i = 0; i < 300 && !(b.MAR.u && b.MAR.u.model && !b.MAR.u.marPend); i++) { w.__cadv(1); await sleep(50); }
const C = b.camera, T = b.THREE, M = b.MAR.u;
b.addToInventory(b.hornItem);
log('with him', !!M, b.MAR.st, '| crusty before', b.crustyS(), JSON.stringify(b.marLhS()));
b.isleStartCut('up');
for (let i = 0; i < 90; i++) w.__cadv(1);
const sight = () => { const f = new T.Vector3(); C.getWorldDirection(f); const d = M.g.position.clone().add(new T.Vector3(0, 0.6, 0)).sub(C.position); const a = f.angleTo(d) * 180 / Math.PI; return `${a.toFixed(0)}° off your look, ${d.length().toFixed(1)} m, feet ${(M.g.position.y - b.ISLE_GALLERY).toFixed(2)} over the gallery, shown ${M.g.visible}`; };
log('up:', JSON.stringify(b.marLhS()), '| him', sight());
const snap = (nm) => { w.__cadv(1); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 640; c.height = Math.round(640 * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); const u8 = c.toDataURL('image/jpeg', 0.85).split(',')[1], N = Math.ceil(u8.length / 8000); for (let i = 0; i < N; i++) console.log(`[PBIMG] ${nm} ${i}/${N} ${u8.slice(i * 8000, (i + 1) * 8000)}`); };
if (Q.get('shots')) { for (let i = 0; i < 4; i++) w.__cadv(1); snap('lh_look'); }
const promptTxt = () => { b.hoverNowS(); const e = w.document.getElementById('prompt'); return e ? e.textContent.trim() : '?'; };
log('prompt at the top before his goodbye:', JSON.stringify(promptTxt()));
b.crowCallFromTopS(); log('horn blown before he speaks → flight?', b.marLhS().tmp);
let t = 0; for (; t < 400 && !b.marLhS().dialog; t++) { w.__cadv(1); await sleep(10); }
log('frozen?', JSON.stringify(b.state().frozen));
if (Q.get('shots')) { for (let i = 0; i < 20; i++) await sleep(40); snap('lh_talk'); }
log('talk opened after', t, 'frames', JSON.stringify(b.marLhS()));
const btns = () => [...w.document.querySelectorAll('#dialog-choices button')];
const line = () => w.document.getElementById('dialog-text').textContent.trim();
for (let step = 0; step < 2; step++) {
  let n = 0; for (; n < 300 && !btns().length; n++) await sleep(30);
  log('  he:', JSON.stringify(line()), '| answers', JSON.stringify(btns().map((x) => x.textContent.trim())));
  b.crowCallFromTopS(); if (b.marLhS().tmp) log('  HORN WENT DURING THE TALK');
  const pick = step === 0 ? btns()[1] : btns().find((x) => (ANS === 'k' ? /^K$/ : /amazing/i).test(x.textContent.trim()));
  if (!pick) { log('  no answer to click'); break; }
  pick.click(); await sleep(50);
}
await sleep(1500); log('  he:', JSON.stringify(line()));
for (let n = 0; n < 200 && b.marLhS().dialog; n++) await sleep(30);
log('talk closed:', JSON.stringify(b.marLhS()), '| crusty', b.crustyS(), '| achievement on screen', JSON.stringify([...w.document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /lil crusty/i.test(e.textContent || '')).map((e) => e.textContent.trim()).slice(0, 1)));
const tr = []; for (let i = 0; i < 600 && b.MAR.st === 'with'; i++) { w.__cadv(1); if (i % 20 === 0) { const L = b.marLhS().lh; tr.push(`${sight().split(',')[0]} t${L ? L.t : '-'} ${M.g.position.x.toFixed(1)},${M.g.position.z.toFixed(1)}`); } }
log('walking off:', tr.join(' → '), '| then st', b.MAR.st, JSON.stringify(b.marLhS()));
log('prompt after he has gone:', JSON.stringify(promptTxt()));
b.crowCallFromTopS(); log('horn after → flight', b.marLhS().tmp);
