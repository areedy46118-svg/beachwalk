/* THE HOOK AND XIII'S BUNTING (2026-11-23, the owner: "my hook hits things in the air i cant see fix this make it go through these
 * laterns and strings across the castle"): from the court below, the hook thrown straight at each lantern and at points along
 * each rope; what it bites (its kind, how far) against the first wall behind (the castle's face grid, `siteRay`). A bite short of
 * the wall by more than 0.5 m is a bite on the bunting. Also: any rope or lantern mesh in the castle's wall index.
 * PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/hookbunting.js' <out> */
w.eval(await (await fetch('/tools/c13look.js?' + Date.now())).text());
log('c13', await w.__c13LookBoot());
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 600 && !(b.c13ThriveS() && b.c13ThriveS().done); i++) { w.__c13Adv(1); await sleep(10); }
const T = w.__T, C = b.camera, Th = b.c13ThriveS(), S = b.C13_SITE;
log('thrive done', !!(Th && Th.done), 'lanterns', Th ? Th.lanterns.length : -1);
const ms = b.c13WallMeshesS() || []; const inIdx = ms.filter((o) => { for (let a = o; a; a = a.parent) if (/c13Ropes|c13Lantern|c13Bunting/.test(a.name)) return true; return false; });
log('wall index meshes', ms.length, '| of the bunting/ropes/lanterns', inIdx.length, inIdx.slice(0, 5).map((o) => o.name + '<' + (o.parent && o.parent.name)).join(','));
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
for (let i = 0; i < 60; i++) { w.__c13Adv(1); await sleep(30); }
for (let i = 0; i < 60 && !b.hookThrowS(1); i++) { b.HK.st = 'idle'; w.__c13Adv(2); await sleep(100); } b.HK.st = 'idle';
const targets = [];
Th.G.updateMatrixWorld(true);
for (const L of Th.lanterns) targets.push(['lantern', Th.G.localToWorld(L.p.clone()).add(new T.Vector3(0, -0.28, 0))]);
const ropes = Th.G.getObjectByName('c13Ropes');
if (ropes) ropes.traverse((o) => { if (!o.isMesh) return; const P = o.geometry.attributes.position; for (const f of [0.2, 0.5, 0.8]) { const i = Math.floor(P.count * f); targets.push(['rope', new T.Vector3().fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld)]); } });
const pen = Th.G.getObjectByName('c13Bunting');
if (pen) { const m = new T.Matrix4(); for (let i = 0; i < pen.count; i += 9) { pen.getMatrixAt(i, m); targets.push(['pennant', new T.Vector3(0, -0.15, 0).applyMatrix4(m).applyMatrix4(pen.matrixWorld)]); } }
log('targets', targets.length);
let bad = 0, n = 0; const kinds = {}, shown = [];
for (const [what, P] of targets) for (const [ox, oz] of [[4, 0], [-4, 0], [0, 4], [0, -4], [3, 3]]) {
  const fx = P.x + ox, fz = P.z + oz, fy = b.keepFloorAtS ? null : null;
  C.position.set(fx, P.y - 4, fz); b.camBaseY = C.position.y;
  const D = P.clone().sub(C.position).normalize();
  b.look(Math.atan2(-D.x, -D.z), Math.asin(D.y)); C.updateMatrixWorld(true);
  const D2 = new T.Vector3(); C.getWorldDirection(D2);
  const wall = b.siteRayS(S, C.position.clone(), D2.clone(), 60);
  b.HK.st = 'idle'; b.HK.cd = 0; b.HK.armT = -1;
  if (!b.hookThrowS(1)) continue; n++;
  const to = b.HK.to; b.HK.st = 'idle';
  const dist = P.distanceTo(C.position);
  if (to && to.t < dist + 1.0 && (wall === null || to.t < wall - 0.5)) {
    bad++; const mt = b.magTraceS(D2), dh = b.hookDrawnHitS(C.position.clone(), D2.clone(), 60);
    const k = what + ' bit by ' + to.kind + (to.surface ? ':' + to.surface : '') + (to.hit && to.hit.object ? ':' + to.hit.object.name : '');
    kinds[k] = (kinds[k] || 0) + 1;
    if (shown.length < 12) shown.push(`${k} t ${to.t.toFixed(2)} (target ${dist.toFixed(2)}, wall ${wall === null ? '-' : wall.toFixed(2)}) magTrace ${mt ? mt.kind + ' ' + mt.t.toFixed(2) : '-'} drawn ${dh ? dh.t.toFixed(2) + ' ' + (dh.hit && dh.hit.object.name) : '-'} at ${(P.x - b.C13_X).toFixed(1)},${P.y.toFixed(1)},${(P.z - b.C13_Z).toFixed(1)}`);
  }
}
log('throws', n, '| bit the bunting', bad, JSON.stringify(kinds));
for (const s of shown) log('  ', s);
// and from under each lantern, all round and up: a bite short of the first DRAWN face (a ray against what is shown) is a ghost
const rc = new T.Raycaster(); rc.camera = C;
const drawn = (O, D, far) => { rc.set(O, D); rc.far = far; for (const h of rc.intersectObjects(b.scene.children, true)) { const o = h.object; let vis = o.visible; for (let a = o.parent; a && vis; a = a.parent) vis = a.visible; if (!vis || !o.isMesh || o.isSprite || o.isPoints || o.name === 'hitProxy') continue; const m = Array.isArray(o.material) ? o.material[h.face ? h.face.materialIndex : 0] : o.material; if (m && ((m.transparent && m.opacity < 0.35) || m.visible === false || m.colorWrite === false)) continue; return h; } return null; };
let g2 = 0, n2 = 0; const k2 = {}, s2 = [];
const fl = (x, z) => { for (let y = 30; y > -5; y -= 0.25) { const f = b.siteRayS(S, new T.Vector3(x, y, z), new T.Vector3(0, -1, 0), 0.3); if (f !== null) return y - f; } return null; };
for (const L of Th.lanterns) {
  const P = Th.G.localToWorld(L.p.clone()), f = fl(P.x, P.z); if (f === null) continue;
  for (let a = 0; a < 12; a++) for (const el of [15, 35, 55, 75]) {
    C.position.set(P.x + 1.5, f + 1.7, P.z + 1.5); b.camBaseY = C.position.y;
    b.look(a / 12 * Math.PI * 2, el * Math.PI / 180); C.updateMatrixWorld(true);
    b.HK.st = 'idle'; b.HK.cd = 0; b.HK.armT = -1;
    if (!b.hookThrowS(1)) continue;
    const to = b.HK.to; b.HK.st = 'idle'; if (!to || to.kind === 'foe' || to.kind === 'gull') continue; n2++;
    const D = b.HK.aim.clone(), dv = drawn(C.position.clone(), D, to.t + 30), short = dv ? dv.distance - to.t : 99;
    if (short > 0.6) { g2++; const k = to.kind + (to.surface ? ':' + to.surface : '') + (to.hit && to.hit.object ? ':' + to.hit.object.name : ''); k2[k] = (k2[k] || 0) + 1;
      if (s2.length < 14) { const pt = to.point; s2.push(`${k} t ${to.t.toFixed(1)} drawn ${dv ? dv.distance.toFixed(1) + ' ' + dv.object.name : 'none'} pt ${(pt.x - b.C13_X).toFixed(1)},${pt.y.toFixed(1)},${(pt.z - b.C13_Z).toFixed(1)} el ${el}`); } }
  }
}
log('from under the lanterns: throws', n2, '| caught short of anything drawn', g2, JSON.stringify(k2));
for (const s of s2) log('  ', s);
