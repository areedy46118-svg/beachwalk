/* THE WOUND, CLOSE (2026-11-23, "MAKE AS REALISTIC AS POSSIBLE"): two real katana cuts on a stood-up enemy, then each mark
 * found by its own mesh and looked at from half a metre off its face — fresh (0.1 s), and after it has darkened (2.5 s);
 * the drops shed by it counted. &k= the kind.
 * PB_PORT=4227 PB_WAIT=360 sh tools/probe.sh 'evalFile&f=/tools/woundlook.js&k=farmer1' <out> */
const KIND = new URLSearchParams(location.search).get('k') || 'farmer1';
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const T = b.THREE, C = b.camera;
const kat = b.katanaItem; b.addToInventory(kat); b.toggleEquip(kat);
let X = 8, Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -4; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
w.__clockOn();
const put = () => { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; };
const u = b.mutSpawnTest(X, Z - 1.7, KIND, 0);
for (let i = 0; i < 600 && !(u.model && u.mixer); i++) { put(); w.__adv(1); await sleep(10); }
for (let i = 0; i < 30; i++) { put(); w.__adv(1); }
u.st.hp = 999;
{ const t0 = performance.now(); const r = b.cutCostS(u, 40); log('skin work per landed blow (real clock)', ((performance.now() - t0) / 40).toFixed(2), 'ms, triangles near the cut', r.tris); }
const look = (nm, M, fov = 35) => {
  M.updateMatrixWorld(true); M.geometry.computeBoundingBox(); const c = M.geometry.boundingBox.getCenter(new T.Vector3()); M.localToWorld(c);
  const d = new T.Vector3().subVectors(new T.Vector3(X, 1.7, Z), c).normalize();
  const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = fov; C.updateProjectionMatrix();
  C.position.copy(c).addScaledVector(d, 0.6); C.lookAt(c); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 480, 1.25);
  C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q); C.updateMatrixWorld(true);
};
for (const [k, ay, P] of (new URLSearchParams(location.search).get('cost') ? [] : [[0, 1.35, 0], [1, 1.0, 1]])) {
  const at0 = u.blow ? u.blow.at : 0, n0 = b.slashMarksS().length;
  for (let i = 0; i < 90; i++) { put(); b.lookAt(u.g.position.x, u.g.position.y + ay, u.g.position.z); if (i === 2) b.startDig(P); w.__adv(1); if (b.slashMarksS().length > n0) break; }
  const all = b.slashMarksS().slice(n0), M = all[all.length - 1];
  if (!M || b.slashMarksS().length === n0) { log('cut', k, 'no mark'); continue; }
  log('cut', k, 'pieces', b.BLOW.cut ? b.BLOW.cut.pts.filter(Boolean).length : '-', 'on bone', M.m.parent && M.m.parent.name, 'verts', M.m.geometry.attributes.position.count);
  const eye = (nm) => { const c = new T.Vector3(); let n = 0; for (const o of all) { if (!o.m.parent) continue; o.m.updateMatrixWorld(true); o.m.geometry.computeBoundingBox(); c.add(o.m.localToWorld(o.m.geometry.boundingBox.getCenter(new T.Vector3()))); n++; } if (!n) return; c.multiplyScalar(1 / n);
    const q = C.quaternion.clone(), f0 = C.fov; C.fov = 30; C.updateProjectionMatrix(); put(); C.lookAt(c); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 560, 1.25); C.fov = f0; C.updateProjectionMatrix(); C.quaternion.copy(q); };
  log('  pieces', all.length);
  w.__adv(6); look('fresh' + k, M.m); eye('eyeF' + k);
  const d0 = b.bloodDropsN(); let mx = 0; for (let i = 0; i < 150; i++) { put(); w.__adv(1); mx = Math.max(mx, b.bloodDropsN() - d0); }
  look('later' + k, M.m); eye('eyeL' + k);
  if (new URLSearchParams(location.search).get('dbg')) { M.m.material.emissive.set(0xff00ff); M.m.material.opacity = 1; look('dbg' + k, M.m); M.m.material.emissive.set(0); }
  log('  drops in the air at most', mx);
}
