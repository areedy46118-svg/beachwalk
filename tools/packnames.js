/* NAMES THAT FIT (2026-11-19, `packFitName`). Not part of the game. Run headless:
 *   PB_PORT=4284 sh tools/probe.sh 'evalFile&f=/tools/packnames.js' <out>
 * Dev's weapons and every key given, the pack open: each slot selected, and each key on the ring, and whether its name
 * is wider than its place (cut off) — with the size it was set to. */
for (let i = 0; i < 300 && !b.state().introDone; i++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(20); }
b.settings.devMode = true; b.devGrantWeapons && b.devGrantWeapons();
for (const k of Object.keys(b)) { const it = b[k]; if (k.endsWith('Item') && it && typeof it === 'object' && it.isKey && !b.state().inv.includes(it.name)) try { b.addToInventory(it); } catch (e) {} }
b.openPack(); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(30); }
const D = w.document, out = [];
const check = (tag, el) => { if (!el) return; out.push((el.scrollWidth > el.clientWidth + 1 ? 'CUT ' : 'ok  ') + tag + ' "' + el.textContent + '" ' + el.scrollWidth + '/' + el.clientWidth + ' at ' + getComputedStyle(el).fontSize); };
for (const s2 of D.querySelectorAll('#inv-grid .islot, .islot')) { if (!s2.querySelector('img, canvas')) continue; s2.click(); await sleep(60); check('slot', D.querySelector('#inv-detail .name')); }
const K = b.kcS && b.kcS();
if (K) for (let i = 0; i < K.items.length; i++) { await sleep(80); check('ring', D.querySelector('#keychain-box .kc-name')); b.selectKeyChain ? 0 : 0; w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight' })); await sleep(80); check('key pane', D.querySelector('#inv-detail .name')); }
const seen = new Set(); for (const o of out) if (!seen.has(o)) { seen.add(o); log(o); }
