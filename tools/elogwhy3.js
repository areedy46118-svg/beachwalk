/* the log's box for the four of their own (&k=pliosaur,cry): made, mounted, what it draws, its meshes' chains and skeletons.
 * PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/elogwhy3.js&k=pliosaur,cry' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE;
const ks = (new URLSearchParams(w.location.search).get('k') || 'pliosaur,cry').split(',');
for (const k of ks) b.elogOtherS(k);
b.openPack(); for (let i = 0; i < 5; i++) { b.frame(1); await sleep(20); }
w.document.querySelector('#invpanel .pk-tab[data-tab=log]').click(); await sleep(100);
const f2 = (v) => v.toArray().map((x) => x.toFixed(2)).join(',');
for (const k of ks) {
  b.ELOG.sel = k; b.elogRenderListS();
  let n = 0; for (; n < 1500 && !b.ELOG.snap[k]; n++) { b.frame(1); b.elogFrameS(); await sleep(15); }
  for (let j = 0; j < 6; j++) { b.elogFrameS(); await sleep(20); }
  const V = b.elogViewS(), S = b.ELOG.snap[k];
  if (!S) { log(k, 'NO LIKENESS', b.ELOG.pend[k]); continue; }
  V.r.info.autoReset = true; b.elogFrameS(); const inf = V.r.info.render;
  const bb = new T.Box3().setFromObject(V.turn, true);
  log(k, 'made after', n, 'frames; calls', inf.calls, 'tris', inf.triangles, 'box', bb.isEmpty() ? 'EMPTY' : f2(bb.min) + '..' + f2(bb.max), 'cam', f2(V.cam.position), 'h', V.h.toFixed(2), 'w', (V.w || 0).toFixed(2), 'clip', S.clip && S.clip.name, 'turn kids', V.turn.children.length);
  V.turn.traverse((o) => { if (!o.isMesh) return; const chain = []; for (let a = o; a && a !== V.sc; a = a.parent) chain.push((a.name || a.type) + (a.visible ? '' : '(HIDDEN)') + ' s' + a.scale.x.toFixed(3)); const m = Array.isArray(o.material) ? o.material[0] : o.material; log('   ', o.isSkinnedMesh ? `skinned bones ${o.skeleton.bones.length} undefined ${o.skeleton.bones.filter((x) => !x).length} outside ${o.skeleton.bones.filter((x) => { for (let a = x; a; a = a.parent) if (a === V.turn) return false; return true; }).length}` : 'rigid', 'mat', m.type, 'op', m.opacity, 'side', m.side, '|', chain.slice(0, 6).join(' < ')); });
}
// a still of each in the box at its own size
for (const k of ks) {
  b.ELOG.sel = k; b.elogRenderListS(); for (let j = 0; j < 30; j++) { b.elogFrameS(); await sleep(20); }
  const c = w.document.querySelector('#elog-view canvas'), t2 = w.document.createElement('canvas'); t2.width = c.width; t2.height = c.height;
  const g = t2.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, t2.width, t2.height); g.drawImage(c, 0, 0);
  const u8 = t2.toDataURL('image/jpeg', 0.85).split(',')[1], N = Math.ceil(u8.length / 8000);
  for (let i = 0; i < N; i++) console.log(`[PBIMG] elog_${k} ${i}/${N} ${u8.slice(i * 8000, (i + 1) * 8000)}`);
}
