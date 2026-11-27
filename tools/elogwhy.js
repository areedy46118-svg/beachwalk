/* WHY SOME LIKENESSES IN THE ENEMY LOG DRAW NOTHING (2026-11-23): for each kind asked (&k=…), the likeness taken at the kill — its
 * meshes, their skeletons (bones present? where?), materials (visible, opacity, transparent, side), its box before and after the idle's
 * first step. PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/elogwhy.js&k=hulk,farmer0,farmer1' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera; C.position.set(6, 1.7, -400); b.camBaseY = 1.7;
const ks = (new URLSearchParams(w.location.search).get('k') || 'hulk,farmer0,farmer1').split(',');
const us = ks.map((k, i) => [k, b.makeMutant(7 + i * 3, -404, k, 0)]);
for (let t = 0; t < 1200 && !us.every(([, u]) => u.model && !u.parLate); t++) { await sleep(20); for (const [, u] of us) if (u.parLate) try { if (u.parLate()) u.parLate = null; } catch (e) {} }
const f2 = (v) => v.toArray().map((x) => x.toFixed(2)).join(',');
for (const [k, u] of us) {
  if (!u.model) { log(k, 'NO MODEL'); continue; }
  u.st.awake = true; u.lastHitMine = true; b.hurtMutant(u, 999, 1);
  const S = b.ELOG.snap[b.elogKeyS(u)]; if (!S) { log(k, 'no likeness'); continue; }
  const R = S.root; R.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(R, true);
  log(k, '== root', R.type, 'scale', f2(R.scale), 'box', bb.isEmpty() ? 'EMPTY' : f2(bb.min) + ' .. ' + f2(bb.max), 'clip', S.clip && S.clip.name);
  const live = []; u.model.traverse((o) => { if (o.isMesh) live.push(o); });
  let i = 0;
  R.traverse((o) => {
    if (!o.isMesh) return;
    const L = live[i++], m = Array.isArray(o.material) ? o.material[0] : o.material;
    let up = o.visible; for (let a = o.parent; a && a !== R.parent; a = a.parent) up = up && a.visible;
    const sk = o.isSkinnedMesh ? `bones ${o.skeleton.bones.length} missing ${o.skeleton.bones.filter((x) => !x).length} inRoot ${o.skeleton.bones.filter((x) => { for (let a = x; a; a = a.parent) if (a === R) return true; return false; }).length}` : 'rigid';
    log('   ', o.name || o.type, 'vis', o.visible, 'chainVis', up, sk, 'mat vis', m.visible, 'op', m.opacity, 'transp', m.transparent, 'cw', m.colorWrite, 'live vis', L ? L.visible : '-', 'live mat op', L ? (Array.isArray(L.material) ? L.material[0] : L.material).opacity : '-');
  });
}
