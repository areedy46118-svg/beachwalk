/* WHAT COULD BE LET GO (2026-11-22): after the beach's far rest, (a) the downloaded file cache `bwGot` summed, (b) the decoded
 * images whose texture is already on the GPU summed — then each released in turn with a MARK between, for `ps` on the
 * process to read what each is really worth.  Run with the ps sampler (see perf.md). */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(45000);
const got = b.bwGotS(); let gb = 0, gn = 0; for (const p of got.values()) { try { const v = await Promise.race([p, sleep(50).then(() => null)]); if (v && v.byteLength) { gb += v.byteLength; gn++; } } catch (e) {} }
const props = b.renderer.properties, imgs = new Set(); let ib = 0, iu = 0;
b.scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) for (const k of Object.keys(m)) { const t = m[k]; if (!t || !t.isTexture) continue; const im = t.image; if (!im || imgs.has(im)) continue; imgs.add(im); const up = !!props.get(t).__webglTexture; const by = (im.width || 0) * (im.height || 0) * 4; ib += by; if (up && im.close) iu += by; } });
log('bwGot', gn, 'files', (gb / 1048576).toFixed(0), 'MB | images', imgs.size, (ib / 1048576).toFixed(0), 'MB, of them uploaded ImageBitmaps', (iu / 1048576).toFixed(0), 'MB | heap', (performance.memory.usedJSHeapSize / 1048576).toFixed(0));
log('MARK A-before'); await sleep(20000);
let closed = 0; b.scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) for (const k of Object.keys(m)) { const t = m[k]; if (!t || !t.isTexture) continue; const im = t.image; if (im && im.close && props.get(t).__webglTexture && im.width) { im.close(); closed++; } } });
log('closed', closed); log('MARK B-images-closed'); await sleep(20000);
got.clear(); if (window.gc) window.gc(); log('MARK C-cache-cleared'); await sleep(20000);
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
log('frames after: ok'); log('MARK D-end'); await sleep(3000);
