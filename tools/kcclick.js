/* CLICKING A KEY ON THE RING (2026-11-21, the owner: "clicking the keys should be easier it sometimes doesnt work in the pack").
 * Three keys on the ring, the pack open; for each key, real pointer clicks at its middle as drawn and 10 / 14 px to either
 * side: which key comes up. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/kcclick.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
for (const n of ['Skull Key', 'Tavern storage key', "Henry's cell key"]) { const it = b.packByName(n); if (it) b.addToInventory(it); }
b.openPack(); for (let i = 0; i < 60; i++) { b.frame(1); await sleep(30); }
const K = b.kcG(), el = w.document.getElementById('kc-canvas'), B = el.getBoundingClientRect(), T = b.THREE;
log('keys on the ring', K.keys.length, 'box', Math.round(B.width), 'x', Math.round(B.height));
const at = (k) => { const bx = new T.Box3().setFromObject(k.pivot), c = bx.getCenter(new T.Vector3()).project(K.cam); return [B.left + (c.x + 1) / 2 * B.width, B.top + (1 - c.y) / 2 * B.height]; };
const click = async (x, y) => { const box = w.document.getElementById('keychain-box'); box.dispatchEvent(new w.PointerEvent('pointerdown', { clientX: x, clientY: y, button: 0, bubbles: true })); w.dispatchEvent(new w.PointerEvent('pointerup', { clientX: x, clientY: y, button: 0, bubbles: true })); for (let i = 0; i < 40; i++) { b.frame(1); await sleep(15); } return b.kcState().sel; };
let ok = 0, all = 0;
for (let i = 0; i < K.keys.length; i++) {
  const res = [];
  for (const dx of [0, -10, 10, -14, 14]) {
    const [x, y] = at(b.kcG().keys[i]); const s = await click(x + dx, y); res.push(dx + ':' + s); all++; if (s === i) ok++;
  }
  log('key', i, 'clicks (offset:selected)', res.join(' '));
}
log('RESULT', ok, 'of', all, 'clicks picked the key aimed at');
