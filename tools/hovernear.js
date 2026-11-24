/* THE HOVER'S NEAR PASS CHANGES NOTHING YOU CAN POINT AT (2026-11-23). For every interactable on the beach whose mesh can
 * be stood in front of: the camera put inside its reach looking at it, a frame run, and what the game hovers compared with
 * what the old every-frame loop over ALL interactables hits from there. `mismatch` must be 0.
 * PB_PORT=4227 sh tools/probe.sh 'evalFile&f=/tools/hovernear.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
b.settings.devMode = true;
for (let i = 0; i < 90 * 60 && !b.state().introDone; i++) { b.frame(1); if (i % 20 === 0) await sleep(1); }
w.requestAnimationFrame = () => 0;
const C = b.camera, I = b.interactables, V = C.position.constructor;
const T = await import('/vendor/three/three.module.js'), rc = new T.Raycaster();
const off = new URLSearchParams(location.search).get('off'); if (off) b.hoverNear(false);
let tried = 0, mismatch = 0, hovered = 0; const bad = [], seq = [];
const old = () => {   // the loop as it was: every interactable, every mesh
  rc.setFromCamera({ x: 0, y: 0 }, C); let best = null, bd = Infinity, inner = null, id = Infinity;
  for (const it of I) { if (!it.root.parent || (it.prop && it.prop.held) || (it.when && !it.when())) continue; rc.far = it.far || 3.2; const h = rc.intersectObjects(it.meshes, false); if (h.length && h[0].distance < bd) { bd = h[0].distance; best = it; } if (h.length && it.inside && h[0].distance < id) { id = h[0].distance; inner = it; } }
  return inner || best;
};
for (const it of I.slice()) {
  const m = it.meshes.find((q) => q.isMesh && q.geometry); if (!m || !it.root.parent) continue;
  m.updateWorldMatrix(true, false);
  const p = new V().setFromMatrixPosition(m.matrixWorld);
  if (Math.abs(p.x) > 300 || p.y < -5 || p.y > 60) continue;              // the beach's own, not the rooms'
  C.position.set(p.x + 1.2, p.y + 1.0, p.z + 1.2); b.camBaseY = C.position.y; b.lookAt(p.x, p.y, p.z);
  b.frame(2); C.position.set(p.x + 1.2, p.y + 1.0, p.z + 1.2); C.lookAt(p.x, p.y, p.z); C.updateMatrixWorld(true);
  b.frame(1); C.position.set(p.x + 1.2, p.y + 1.0, p.z + 1.2); C.lookAt(p.x, p.y, p.z); C.updateMatrixWorld(true);
  const want = old(); const got = b.state().hovered; seq.push(typeof got === 'function' ? 'fn' : String(got).slice(0, 12));
  tried++; if (want) hovered++;
  const wl = want ? want.label : null;
  if ((wl || null) !== (got || null) && !(typeof wl === 'function')) { mismatch++; if (bad.length < 8) bad.push(String(wl).slice(0, 30) + ' vs ' + String(got).slice(0, 30)); }
}
log('SEQ', seq.join(';'));
log('tried', tried, 'with something hovered', hovered, 'mismatch', mismatch, bad.join(' | '));
