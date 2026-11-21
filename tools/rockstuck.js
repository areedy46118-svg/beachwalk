/* STUCK BY A ROCK ON THE SHORE (2026-11-21, the owner, at feet 10.53, 0.12, -734.66 looking -0.12 rad: "i keep getting stuck right
 * here fix this rocks colliders now they always have been bad"). Every collider within 10 m of the spot, and every rock mesh's
 * world bounds there; then you walked at that spot from each of 16 ways for a second and where you end up (a ring of
 * walks that get nowhere is the trap). Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/rockstuck.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), PX = +(Q.get('x') || 10.53), PZ = +(Q.get('z') || -734.66);
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
const C = b.camera; C.position.set(PX, 1.7, PZ); b.camBaseY = 1.7;
for (let i = 0; i < 120; i++) { b.frame(1); await sleep(10); }
const near = b.rockColliders.filter((c) => { const x = c.x != null ? c.x : (c.x0 + c.x1) / 2, z = c.z != null ? c.z : (c.z0 + c.z1) / 2; return Math.hypot(x - PX, z - PZ) < 12; });
for (const c of near) log('COL', Object.entries(c).filter(([k, v]) => typeof v !== 'object' || v === null).map(([k, v]) => k + '=' + (typeof v === 'number' ? v.toFixed(2) : v)).join(' '));
const T = b.THREE, bx = new T.Box3();
b.scene.traverse((o) => { if (!o.isMesh || !o.visible) return; o.updateWorldMatrix(true, false); bx.setFromObject(o); if (bx.isEmpty()) return; const cx = (bx.min.x + bx.max.x) / 2, cz = (bx.min.z + bx.max.z) / 2; if (bx.max.x - bx.min.x > 60 || bx.max.z - bx.min.z > 60) return; if (bx.min.x - 3 < PX && bx.max.x + 3 > PX && bx.min.z - 3 < PZ && bx.max.z + 3 > PZ) { let n = o.name || '?', p = o.parent; for (let k = 0; k < 2 && p; k++, p = p.parent) n = (p.name || '?') + '/' + n; log('MESH', n, 'x', bx.min.x.toFixed(2), bx.max.x.toFixed(2), 'y', bx.min.y.toFixed(2), bx.max.y.toFixed(2), 'z', bx.min.z.toFixed(2), bx.max.z.toFixed(2)); } });
log('ground here', b.rockGroundAt ? JSON.stringify(b.rockGroundAt(PX, PZ)) : '?', 'solidDepth', b.solidDepth ? b.solidDepth(PX, PZ, 0.35, 0.12) : '?', 'WADE_X', b.WADE_X, 'CLIFF_BLOCK_X', b.CLIFF_BLOCK_X);
// (walked at from the spot: 24 ways, 3 m each in 5 cm steps, pushed out of the solids as the player is; how far each got)
{
  const R0 = +(Q.get('r') || 0.35), res = [];
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * Math.PI * 2, p = new T.Vector3(PX, 1.7, PZ);
    for (let s = 0; s < 60; s++) { p.x += Math.cos(a) * 0.05; p.z += Math.sin(a) * 0.05; b.pushOutOfSolids(p, 0.1, R0); }
    res.push(Math.round(a * 180 / Math.PI) + ':' + Math.hypot(p.x - PX, p.z - PZ).toFixed(1));
  }
  log('WALKS (deg:m of 3)', res.join(' '));
  // the colliders as a map round the spot: # solid, . free, @ the spot (x across, z down; 0.25 m a char)
  const rows = [];
  for (let z = PZ - 6; z <= PZ + 6; z += 0.5) { let r = ''; for (let x = PX - 5; x <= PX + 9; x += 0.25) { const at = Math.abs(x - PX) < 0.13 && Math.abs(z - PZ) < 0.26; let solid = false; for (const c of b.colNear(x, z, 0)) if (b.solidDepth(c, x, z, 0) > 0 && c.top > 1) { solid = true; break; } r += at ? '@' : solid ? '#' : '.'; } rows.push(r); }
  log('MAP x ' + (PX - 5) + '..' + (PX + 9) + ' z ' + (PZ - 6) + '..' + (PZ + 6)); for (const r of rows) log('|' + r);
}
// (a still from straight above, the colliders outlined in red over the drawn rock, and one from where the owner stood)
{
  w.requestAnimationFrame = () => 0;
  const R = b.renderer, sc = b.scene, H = 11, oc = new T.OrthographicCamera(-H * 1.6, H * 1.6, H, -H, 0.1, 200);
  oc.position.set(PX + 2, 60, PZ - 3); oc.up.set(-1, 0, 0); oc.lookAt(PX + 2, 0, PZ - 3);
  const g = new T.Group(); const mat = new T.LineBasicMaterial({ color: 0xff2020, depthTest: false });
  for (const c of near) { let pts; if (c.r != null) { pts = []; for (let i = 0; i <= 16; i++) pts.push(new T.Vector3(c.x + Math.cos(i / 16 * 6.283) * c.r, 3, c.z + Math.sin(i / 16 * 6.283) * c.r)); } else pts = [[c.x0, c.z0], [c.x1, c.z0], [c.x1, c.z1], [c.x0, c.z1], [c.x0, c.z0]].map(([x, z]) => new T.Vector3(x, 3, z)); const l = new T.Line(new T.BufferGeometry().setFromPoints(pts), mat); l.renderOrder = 1e6; g.add(l); }
  const dot = new T.Mesh(new T.SphereGeometry(0.35), new T.MeshBasicMaterial({ color: 0x20ff40, depthTest: false })); dot.position.set(PX, 3, PZ); dot.renderOrder = 1e6; g.add(dot);
  sc.add(g); R.setSize(960, 600, false); R.render(sc, oc);
  const pic = (name) => { const c = document.createElement('canvas'); c.width = 960; c.height = 600; c.getContext('2d').drawImage(R.domElement, 0, 0, 960, 600); const u = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(u.length / 8000); for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, u.slice(i * 8000, (i + 1) * 8000)); };
  pic('top');
  C.position.set(PX, 1.7, PZ); b.look(-0.12, -0.1); C.aspect = 1.6; C.updateProjectionMatrix(); C.updateMatrixWorld(true); R.render(sc, C); pic('view');
  sc.remove(g);
}
