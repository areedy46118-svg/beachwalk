/* IS MYLES DRAWN (2026-11-26, the owner: "and myles went invisible"). Into XIII with him (`tools/minotaur.js`'s boot); his group,
 * his model and every mesh of his: visible up the chain, its material's opacity / visible / colorWrite, its scale; his skin read
 * (`pbSkinS`), and a still from 5 m in front of him. Then as your ally (`M.stage = 'with'`), the same.
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/minoseen.js' <out> */
w.eval(await (await fetch('/tools/minotaur.js?' + Date.now())).text());
w.__ggBoot(); for (let i = 0; i < 180 && !w.__ggBooted; i++) await sleep(1000);
const M = b.MINO, u = M.u, T = b.THREE; if (!u) { log('no minotaur'); return; }
const report = (tag) => {
  const rows = []; let shownMeshes = 0, hidden = 0;
  const up = (o) => { for (let a = o; a; a = a.parent) if (a.visible === false) return a.name || a.type; return null; };
  u.g.traverse((o) => { if (!o.isMesh) return; const h = up(o), m = Array.isArray(o.material) ? o.material[0] : o.material;
    const bad = h || !m || m.visible === false || (m.transparent && m.opacity < 0.05) || m.colorWrite === false;
    if (bad) { hidden++; if (rows.length < 6) rows.push(`${o.name}: hidden by ${h} mat.visible ${m && m.visible} opacity ${m && m.opacity} transparent ${m && m.transparent}`); } else shownMeshes++; });
  const sc = new T.Vector3(); u.g.getWorldScale(sc); const msc = new T.Vector3(); u.model && u.model.getWorldScale(msc);
  const inScene = (() => { for (let a = u.g; a; a = a.parent) if (a === b.scene) return true; return false; })();
  log(tag, '| stage', M.stage, '| in the scene', inScene, '| g.visible', u.g.visible, 'model', !!u.model, u.model && u.model.visible, '| meshes drawn', shownMeshes, 'hidden', hidden, '| scale g', sc.x.toFixed(2), 'model', msc.x.toFixed(3), '| at', u.g.position.toArray().map((v) => v.toFixed(1)).join(','), '| you', b.camera.position.toArray().map((v) => v.toFixed(1)).join(','), '| alive', u.st.alive, 'skin faces', b.pbSkinS(u).length / 9);
  for (const r of rows) log('   ', r);
};
const snap = (name) => { const C = b.camera, p = u.g.position, yaw = u.g.rotation.y; C.position.set(p.x + Math.sin(yaw) * 5, p.y + 1.8, p.z + Math.cos(yaw) * 5); C.lookAt(p.x, p.y + 1.4, p.z); C.updateMatrixWorld(true); shot(name, 520, 2.2); };
for (let i = 0; i < 30; i++) w.__c13Step(1);
report('met'); snap('mino_met');
M.stage = 'with'; M.ally = true; M.place = '?';
for (let i = 0; i < 120; i++) w.__c13Step(1);
report('ally'); snap('mino_ally');
log('DONE');
