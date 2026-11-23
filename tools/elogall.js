/* THE ENEMY LOG, EVERY KIND (2026-11-23, the owner: "some enemies dont show up make it so they all do … they should appear
 * immediately in it after the kill no bugs"). Each kind of MUT_KINDS made (eight at a time, the loop running so their
 * models come in), killed by you, and the log read ON THE FRAME OF THE BLOW: its line, its likeness (meshes, its idle);
 * then each likeness in the log's box and its pixels counted, a contact sheet; then as after a load — every likeness
 * dropped and made again from a stand-in, timed. The other four (gull, pliosaur, sewer monster, crying head): their own
 * kill functions, the same checks.
 * Run: PB_PORT=4223 PB_WAIT=1500 sh tools/probe.sh 'evalFile&f=/tools/elogall.js' <out>   (PB_Q='&k=pale,demon0' for some) */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera; C.position.set(6, 1.7, -400); b.camBaseY = 1.7;
const ONLY = (new URLSearchParams(w.location.search).get('k') || '').split(',').filter(Boolean);
const kinds = (ONLY.length ? ONLY : Object.keys(b.MUT_KINDS)).filter((k) => { const K = b.MUT_KINDS[k]; return K && !K.friendly && !K.ally && !K.whaleBody; });
const res = [], bad = [];
const ready = (u) => u.model && !u.parLate && !(u.clipsPending > 0);
for (let i0 = 0; i0 < kinds.length; i0 += 8) {
  const batch = [];
  for (const k of kinds.slice(i0, i0 + 8)) { try { batch.push([k, b.makeMutant(7 + batch.length * 3, -404, k, 0)]); } catch (e) { res.push(`${k}: MAKE THREW ${e.message}`); bad.push(k); } }
  for (let t = 0; t < 1200 && !batch.every(([, u]) => ready(u)); t++) { await sleep(20); for (const [, u] of batch) if (u.parLate) try { if (u.parLate()) u.parLate = null; } catch (e) {} }
  for (const [k, u] of batch) {
    if (!ready(u)) { res.push(`${k}: NO MODEL`); bad.push(k); try { b.retireUnit(u); } catch (e) {} continue; }
    u.st.awake = true; u.lastHitMine = true;
    const key = b.elogKeyS(u), n0 = (b.ELOG.kinds[key] || { n: 0 }).n;
    let f = 0, why = '';
    try { if (u.kind.baby || u.kind.garg || u.kind.stone) b.killMutant(u); else b.hurtMutant(u, 999, 1); } catch (e) { why = ' kill threw ' + e.message; }   // (the young counts blows, a gargoyle asleep is stone: the kill itself)
    for (; f < 400 && !((b.ELOG.kinds[key] || { n: 0 }).n > n0); f++) b.frame(1);
    const s1 = b.ELOG.snap[key]; let vis = 0;
    if (s1) s1.root.traverse((o) => { if (o.isMesh && o.visible) vis++; });
    const ok = f === 0 && !!s1 && vis > 0;
    if (!ok) bad.push(k);
    res.push(`${ok ? 'ok ' : 'BAD'} ${k}${key !== k ? '→' + key : ''}: frames after blow ${f} likeness ${!!s1} meshes ${vis} clip ${s1 && s1.clip ? s1.clip.name : '-'}${why}`);
  }
  for (let i = 0; i < 30; i++) { b.frame(1); await sleep(5); }
  for (const [, u] of batch) try { b.retireUnit(u); } catch (e) {}
}
// the other four, by their own deaths
try { const r = b.elogOtherTestS(); for (const x of r) { res.push(x); if (/^BAD/.test(x)) bad.push(x); } } catch (e) { res.push('others threw ' + e.message); }
for (const r of res) log(r);
// each in the box: its pixels, and a sheet
b.openPack(); for (let i = 0; i < 10; i++) { b.frame(1); await sleep(10); }
w.document.querySelector('#invpanel .pk-tab[data-tab=log]').click(); await sleep(100);
const keys = b.ELOG.order.slice();
const sheet = async (nm) => {
  const cv = w.document.createElement('canvas'), CW = 150, CH = 190, cols = 9;
  cv.width = CW * cols; cv.height = CH * Math.ceil(keys.length / cols); const g = cv.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, cv.width, cv.height);
  const px = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]; b.ELOG.sel = k; b.elogRenderListS();
    for (let j = 0; j < 400 && !b.ELOG.snap[k]; j++) { b.frame(1); b.elogFrameS(); await sleep(15); }
    for (let j = 0; j < 6; j++) { b.elogFrameS(); await sleep(15); }
    const c = w.document.querySelector('#elog-view canvas'); if (!c) { px.push(k + ' NO CANVAS'); continue; }
    const t2 = w.document.createElement('canvas'); t2.width = 60; t2.height = 75; const g2 = t2.getContext('2d'); g2.drawImage(c, 0, 0, 60, 75);
    const d = g2.getImageData(0, 0, 60, 75).data; let on = 0; for (let p = 3; p < d.length; p += 4) if (d[p] > 20) on++;
    const pc = Math.round(on / 45); px.push(`${k} ${pc}%${b.ELOG.snap[k] ? '' : ' (NO LIKENESS)'}`);
    g.drawImage(c, (i % cols) * CW, Math.floor(i / cols) * CH, CW, CH); g.fillStyle = '#fff'; g.font = '11px monospace'; g.fillText(k, (i % cols) * CW + 3, Math.floor(i / cols) * CH + 12);
  }
  log(nm, 'box:', px.join(' | '));
  const u8 = cv.toDataURL('image/jpeg', 0.8).split(',')[1], N = Math.ceil(u8.length / 8000);
  for (let i = 0; i < N; i++) console.log(`[PBIMG] ${nm} ${i}/${N} ${u8.slice(i * 8000, (i + 1) * 8000)}`);
};
await sheet('elog_kill');
// as after a load
b.closePack(); for (const k in b.ELOG.snap) delete b.ELOG.snap[k];
b.elogLoad(b.elogSave());
b.openPack(); w.document.querySelector('#invpanel .pk-tab[data-tab=log]').click(); await sleep(100);
const t0 = performance.now();
await sheet('elog_load');
log('after a load: all made again in', Math.round(performance.now() - t0), 'ms; missing', keys.filter((k) => !b.ELOG.snap[k]).join(',') || 'none', '| stand-ins left', Object.keys(b.ELOG.pend).length);
// the list: every kind on it, the ones killed shaded apart
log('rows', w.document.querySelectorAll('#elog-list .elog-row').length, 'found', w.document.querySelectorAll('#elog-list .elog-row.found').length, 'unfound', w.document.querySelectorAll('#elog-list .elog-row.unfound').length);
log('BAD:', bad.join(',') || 'none');
// a kind whose file was never fetched (Myles, far down the walk): as after a load that has him in the log — his likeness made?
{
  const L = b.elogSave(); if (!L.some(([k]) => k === 'minotaur')) L.push(['minotaur', 1]);
  b.elogLoad(L); b.ELOG.sel = 'minotaur'; b.elogRenderListS();
  const t0 = performance.now(); let n = 0;
  for (; n < 3000 && !b.ELOG.snap.minotaur; n++) { b.frame(1); b.elogFrameS(); await sleep(15); }
  log('Myles after a load:', b.ELOG.snap.minotaur ? 'made in ' + Math.round(performance.now() - t0) + ' ms' : 'NOT MADE (' + b.ELOG.pend.minotaur + ')');
}
