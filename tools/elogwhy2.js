/* the log's box itself, for kinds that draw and kinds that don't: its draw calls and triangles, GL errors, the camera, the
 * likeness's world box. PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/elogwhy2.js&k=hulk,farmer1' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera; C.position.set(6, 1.7, -400); b.camBaseY = 1.7;
const ks = (new URLSearchParams(w.location.search).get('k') || 'hulk,farmer1').split(',');
const us = ks.map((k, i) => [k, b.makeMutant(7 + i * 3, -404, k, 0)]);
for (let t = 0; t < 1200 && !us.every(([, u]) => u.model && !u.parLate); t++) { await sleep(20); for (const [, u] of us) if (u.parLate) try { if (u.parLate()) u.parLate = null; } catch (e) {} }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(20); }   // (drawn by the game first, as they would be)
for (const [, u] of us) { u.st.awake = true; u.lastHitMine = true; b.hurtMutant(u, 999, 1); }
b.openPack(); for (let i = 0; i < 5; i++) { b.frame(1); await sleep(20); }
w.document.querySelector('#invpanel .pk-tab[data-tab=log]').click(); await sleep(100);
const f2 = (v) => v.toArray().map((x) => x.toFixed(2)).join(',');
for (const [k, u] of us) {
  const key = b.elogKeyS(u); b.ELOG.sel = key; b.elogRenderListS();
  for (let j = 0; j < 6; j++) { b.elogFrameS(); await sleep(20); }
  const V = b.elogViewS(), gl = V.r.getContext();
  V.r.info.autoReset = true; b.elogFrameS(); const inf = V.r.info.render;
  const err = gl.getError();
  const bb = new T.Box3().setFromObject(V.turn, true);
  let meshes = 0, skinned = 0; V.turn.traverse((o) => { if (o.isMesh) meshes++; if (o.isSkinnedMesh) skinned++; });
  log(k, 'calls', inf.calls, 'tris', inf.triangles, 'glErr', err, 'turn kids', V.turn.children.length, 'meshes', meshes, 'skinned', skinned, 'box', bb.isEmpty() ? 'EMPTY' : f2(bb.min) + '..' + f2(bb.max), 'cam', f2(V.cam.position), 'h', V.h.toFixed(2), 'w', (V.w || 0).toFixed(2), 'canvas', V.canvas.width + 'x' + V.canvas.height, 'lost', gl.isContextLost());
  V.turn.traverse((o) => { if (!o.isMesh) return; const chain = []; for (let a = o; a && a !== V.sc; a = a.parent) chain.push((a.name || a.type) + (a.visible ? '' : '(HIDDEN)') + (a.layers.mask !== 1 ? '[L' + a.layers.mask + ']' : '')); log('   mesh', chain.join(' < ')); });
  // and the same scene drawn by the GAME's renderer into a target: does it have pixels?
  const rt = new T.WebGLRenderTarget(64, 80); b.renderer.setRenderTarget(rt); b.renderer.setClearColor(0, 0); b.renderer.clear(); b.renderer.render(V.sc, V.cam);
  const px = new Uint8Array(64 * 80 * 4); b.renderer.readRenderTargetPixels(rt, 0, 0, 64, 80, px); b.renderer.setRenderTarget(null);
  let on = 0; for (let p = 3; p < px.length; p += 4) if (px[p] > 20) on++;
  const c = V.canvas, t2 = w.document.createElement('canvas'); t2.width = 64; t2.height = 80; t2.getContext('2d').drawImage(c, 0, 0, 64, 80);
  const d = t2.getContext('2d').getImageData(0, 0, 64, 80).data; let on2 = 0; for (let p = 3; p < d.length; p += 4) if (d[p] > 20) on2++;
  log('   pixels: its own renderer', Math.round(on2 / 51.2) + '%', '| the game renderer', Math.round(on / 51.2) + '%');
}
