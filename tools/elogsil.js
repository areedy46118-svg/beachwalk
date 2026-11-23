/* THE ENEMY LOG'S SILHOUETTES IN THE PACK (2026-11-23): nothing killed — the roster all dim, one picked: the box shows its flat black
 * outline (no turning model); then a farmer of one body killed with an axe and one of the same body with a rake: ONE line, ×2, warm,
 * its model in the box. Stills of the pack's log both times. PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/elogsil.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera; C.position.set(6, 1.7, -400); b.camBaseY = 1.7;
b.elogLoad([]);
b.openPack(); for (let i = 0; i < 5; i++) { b.frame(1); await sleep(20); }
w.document.querySelector('#invpanel .pk-tab[data-tab=log]').click(); await sleep(300);
const rows = () => [...w.document.querySelectorAll('#elog-list .elog-row')];
log('rows', rows().length, '| count', w.document.querySelector('#elog-list .elog-count').textContent, '| found', rows().filter((r) => r.classList.contains('found')).length);
const pick = rows().find((r) => r.textContent.startsWith('03')); pick.click(); await sleep(800);
const sil = w.document.querySelector('#elog-view .elog-sil'), cv = w.document.querySelector('#elog-view .elog-canvas');
const cover = (c) => { const t = w.document.createElement('canvas'); t.width = 60; t.height = 40; t.getContext('2d').drawImage(c, 0, 0, 60, 40); const d = t.getContext('2d').getImageData(0, 0, 60, 40).data; let n = 0; for (let p = 3; p < d.length; p += 4) if (d[p] > 100) n++; return Math.round(n / 24) + '%'; };
log('unfound picked: name', JSON.stringify(w.document.querySelector('#elog-view .elog-name').textContent), '| silhouette shown', !!sil && sil.style.display !== 'none', sil ? 'covering ' + cover(sil) : '', '| 3D box hidden', cv.style.visibility === 'hidden');
const still = async (nm) => { await sleep(200); const P = w.document.getElementById('invpanel'), r = P.getBoundingClientRect(); const c = w.document.createElement('canvas'); c.width = 900; c.height = Math.round(900 * r.height / r.width);
  // (the pack is DOM: the box's two canvases drawn where they sit, the list as text beside)
  const g = c.getContext('2d'), K = 900 / r.width; g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
  const V = w.document.getElementById('elog-view').getBoundingClientRect(); g.fillStyle = '#1c2230'; g.fillRect((V.left - r.left) * K, (V.top - r.top) * K, V.width * K, V.height * K);
  for (const e of [cv, sil]) if (e && e.style.display !== 'none' && e.style.visibility !== 'hidden') g.drawImage(e, (V.left - r.left) * K, (V.top - r.top) * K, V.width * K, V.height * K);
  g.font = '13px monospace'; rows().slice(0, 30).forEach((x, i) => { g.fillStyle = x.classList.contains('found') ? '#f0d6a4' : x.classList.contains('sel') ? '#999' : '#555'; g.fillText(x.textContent, 8, 30 + i * 16); });
  const u8 = c.toDataURL('image/jpeg', 0.85).split(',')[1], N = Math.ceil(u8.length / 8000); for (let i = 0; i < N; i++) console.log(`[PBIMG] ${nm} ${i}/${N} ${u8.slice(i * 8000, (i + 1) * 8000)}`); };
await still('elogsil_a');
b.closePack();
// two of one body, an axe and a rake (ka: farmer0 hacker/axe, farmer7 jumper/axe; hd: farmer1 rake, farmer11 axe)
const us = [b.makeMutant(7, -404, 'farmer1', 0), b.makeMutant(10, -404, 'farmer11', 0)];
for (let t = 0; t < 1200 && !us.every((u) => u.model && !u.parLate); t++) { await sleep(20); for (const u of us) if (u.parLate) try { if (u.parLate()) u.parLate = null; } catch (e) {} }
for (const u of us) { u.st.awake = true; u.lastHitMine = true; b.hurtMutant(u, 999, 1); }
for (let i = 0; i < 10; i++) { b.frame(1); await sleep(20); }
log('logged:', JSON.stringify(b.elogSave()));
b.openPack(); w.document.querySelector('#invpanel .pk-tab[data-tab=log]').click(); await sleep(300);
for (let i = 0; i < 20; i++) { b.elogFrameS(); await sleep(20); }
const f = rows().filter((r) => r.classList.contains('found'));
log('found rows', f.map((r) => r.textContent).join(' | '), '| box: name', JSON.stringify(w.document.querySelector('#elog-view .elog-name').textContent), 'model covering', cover(cv), 'silhouette hidden', !sil || sil.style.display === 'none');
await still('elogsil_b');
