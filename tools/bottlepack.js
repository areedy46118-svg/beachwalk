/* THE BOTTLE FULL IN THE PACK, EMPTYING AS DRUNK; A SPLIFF SPENT WHEN IT TAKES (2026-11-21, the owner: "the water should still be
 * full in the pack and store like how it is on inspect" / "when drinking make it empty at the speed its drank" / "if the
 * waters or spliffs take effect they should be gone"). The pack opened on the bottle: its slot's icon and the big picture,
 * as stills; the water's level through a drink; a spliff lit and put away right after the breath out.
 * Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/bottlepack.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const it = b.packByName('Bottle of water'); b.addToInventory(it); it.count = Math.max(1, it.count || 0);
for (let i = 0; i < 200 && !(it.inspectModel && it.inspectModel.userData.filled); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(30); }
const d = w.document; b.openPack();
const slot = [...d.querySelectorAll('#inv-grid .islot')].find((e) => e.querySelector('img') && /water/i.test(e.title || e.textContent || e.getAttribute('data-name') || '')) || [...d.querySelectorAll('#inv-grid .islot.filled')].pop();
slot && slot.click(); await sleep(2500);
const shotE = (name, el) => { if (!el) { log('no', name); return; } const r = el.getBoundingClientRect(); const c = document.createElement('canvas'); c.width = Math.max(1, r.width); c.height = Math.max(1, r.height); const g = c.getContext('2d'); try { g.drawImage(el, 0, 0, c.width, c.height); } catch (e) { log('draw', name, e.message); } const u = c.toDataURL('image/png').split(',')[1], n = Math.ceil(u.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, u.slice(i * 8000, (i + 1) * 8000)); };
const ic = [...d.querySelectorAll('#inv-grid .islot img')].find((im) => im.closest('.islot') && im.closest('.islot').classList.contains('sel')) || slot && slot.querySelector('img');
log('icon src', ic ? ic.src.slice(0, 40) : 'none', 'slot', slot ? (slot.title || slot.className) : '-');
if (ic && ic.src.startsWith('data:')) { const u = ic.src.split(',')[1], n = Math.ceil(u.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', 'iconraw', i + '/' + n, u.slice(i * 8000, (i + 1) * 8000)); }
shotE('packicon', ic); shotE('packbig', d.querySelector('#invpanel .detail .big canvas') || d.querySelector('#invpanel .detail .big img'));
b.closePack && b.closePack(); for (let i = 0; i < 20; i++) { b.frame(1); await sleep(20); }
if (b.equippedS() !== it) b.toggleEquip(it); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(16); }
const vw = it.viewmodel.getObjectByName('water'); const lv = [];
b.drinkWaterS(); for (let i = 0; i < 100; i++) { b.step(1 / 60); if (i % 10 === 0) lv.push((vw.userData.fill ?? -1).toFixed(2) + '@' + (b.drinkT || 0).toFixed(2)); }
log('drink levels', lv.join(' '), '| bottles left', it.count, 'in pack', b.inventory.includes(it));
const sp = b.packByName ? b.packByName('Wax Spliff') : null;
if (sp) { sp.count = 1; if (!b.inventory.includes(sp)) b.addToInventory(sp); b.toggleEquip(sp); for (let i = 0; i < 20; i++) b.step(1 / 60);
  b.smokeSpliffS ? b.smokeSpliffS() : log('no smokeSpliffS'); for (let i = 0; i < 72; i++) b.step(1 / 60);
  b.toggleEquip(sp); for (let i = 0; i < 10; i++) b.step(1 / 60);
  log('spliff put away after the breath out: count', sp.count, 'in pack', b.inventory.includes(sp)); }
