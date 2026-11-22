/* WHICH STEP OF THE IMAGE SWAP (2026-11-22): the swap off at once; then on one uploaded map at a time, logged between —
 * createImageBitmap's resize, the swap, the close — to find what takes the browser down.  PB_PORT=4223 sh tools/probe.sh 'evalFile&f=/tools/relstep.js' <out> */
b.imgRelOn(false); log('off');
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(15000);
const Q = b.imgRelQ(); const up = Q.filter((t) => t.userData.bwUpAt); log('queued', Q.length, 'uploaded', up.length);
const t = up[0], im = t.image; log('one', t.name, im.width, im.height, im.constructor.name);
const sm = await createImageBitmap(im, { resizeWidth: im.width >> 1, resizeHeight: im.height >> 1, resizeQuality: 'medium' }); log('resized', sm.width); await sleep(3000);
t.image = sm; log('swapped'); for (let i = 0; i < 20; i++) { b.frame(1); await sleep(20); } await sleep(2000); log('frames ok');
im.close(); log('closed'); for (let i = 0; i < 20; i++) { b.frame(1); await sleep(20); } await sleep(3000); log('frames ok after close');
let n = 0; for (const t2 of up.slice(1, 40)) { const i2 = t2.image; if (!(i2 instanceof ImageBitmap) || !i2.width) continue; const s2 = await createImageBitmap(i2, { resizeWidth: i2.width >> 1, resizeHeight: i2.height >> 1, resizeQuality: 'medium' }); t2.image = s2; i2.close(); n++; }
log('forty more', n); for (let i = 0; i < 30; i++) { b.frame(1); await sleep(20); } await sleep(3000); log('frames ok after forty');
