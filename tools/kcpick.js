/* CLICKING A KEY ON THE RING (2026-11-17, `kcKeyAt`). Not part of the game. Run headless:
 *   PB_PORT=4272 sh tools/probe.sh 'evalFile&f=/tools/kcpick.js' <out>
 * Three keys on the ring, the pack open: each key's middle projected to the screen and clicked (pointerdown + pointerup,
 * no drag) — which key comes to the front and is selected, and is there a description in the pane; then the arrows. */
for (let i = 0; i < 300 && !b.state().introDone; i++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(20); }
b.settings.devMode = true; b.devGrantWeapons && b.devGrantWeapons();
for (const it of [b.skullKeyItem, b.cellKeyItem]) if (it && !b.state().inv.includes(it.name)) b.addToInventory(it);
b.openPack(); for (let i = 0; i < 40; i++) { b.frame(1); await sleep(30); }
const K = b.kcS(); log('ring keys', K ? K.items.map((it) => it.name).join(' | ') : 'none', '| at the front', K && K.sel);
const cv = w.document.getElementById('kc-canvas'), bx = cv.getBoundingClientRect();
const V = b.camera.position.constructor;
const fire = (type, x, y) => cv.dispatchEvent(new w.PointerEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true }));
const pane = () => w.document.getElementById('inv-detail');
for (let round = 0; round < 3 && K; round++) {
  await sleep(1500);                                             // (let the ring settle)
  const want = (K.sel + 1 + round) % K.items.length;
  K.sc.updateMatrixWorld(true);
  const p = new V(); new b.THREE.Box3().setFromObject(K.keys[want].pivot).getCenter(p); p.project(K.cam);
  const x = bx.left + (p.x + 1) / 2 * bx.width, y = bx.top + (1 - p.y) / 2 * bx.height;
  const hit = b.kcKeyAt(x, y);
  fire('pointerdown', x, y); w.dispatchEvent(new w.PointerEvent('pointerup', { clientX: x, clientY: y, button: 0 }));
  const P = pane();
  log('clicked key', want, '(' + K.items[want].name + ') at', x.toFixed(0), y.toFixed(0), '| picked', hit, '| now at the front', K.sel, '| selected', b.packKeySelS(), '| pane', P ? JSON.stringify(P.textContent.replace(/\s+/g, ' ').trim().slice(0, 80)) : 'NOT FOUND', '| description shown', !!(P && P.querySelector('.desc')));
}
const s0 = K.sel; w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight' })); await sleep(100);
log('ArrowRight: front', s0, '->', K.sel, '| selected', b.packKeySelS());
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'ArrowLeft', key: 'ArrowLeft' })); await sleep(100);
log('ArrowLeft: front ->', K.sel);
