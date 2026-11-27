/* THE BLOW WHERE IT LANDED, AND THE WAY IT WAS GOING (2026-11-23, the owner: "make the ragdoll physics during a fight more
 * reactionary to the direction you hit the enemy … a cool death … the impact and slices be exactly where they are hit at").
 * The katana's real swings (`startDig`, the blade sweep) at a farmer and at one of the beach's mutants, stood 1.7 m in front of
 * you down −z (your right is +x): per cut, where the contact was recorded (height, side), the edge's travel, the line he is
 * pushed along, the flinch's twist; stills at the cut. Then kills — aimed at the head and at the legs, light and heavy — and
 * how the body leaves: its middle's travel along the cut, how far the head and the feet went each way, the spin; stills.
 * PB_PORT=4227 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/hitdir.js&k=farmer1' <out> */
const KIND = new URLSearchParams(location.search).get('k') || 'farmer1';
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const T = b.THREE, C = b.camera, f2 = (v) => (+v).toFixed(2);
const kat = b.katanaItem; b.addToInventory(kat); b.toggleEquip(kat);
let X = 8, Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -4; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
w.__clockOn();
const put = () => { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; };
const spawn = (kind, dz = -1.7) => {
  const u = b.mutSpawnTest(X, Z + dz, kind, 0);
  return u;
};
const ready = async (u) => { for (let i = 0; i < 600 && !(u.model && u.mixer); i++) { put(); w.__adv(1); await sleep(10); } for (let i = 0; i < 30; i++) { put(); w.__adv(1); } };
const snap = (nm, px, py, pz, tx, ty, tz, fov = 60) => { const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = fov; C.updateProjectionMatrix(); C.position.set(px, py, pz); C.lookAt(tx, ty, tz); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 560, 1.3); C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q); C.updateMatrixWorld(true); };
const view = (nm) => { C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 560, 1.3); };
// one swing: aimed at height `ay` on him, power P; until the blow lands (the record's time moves)
const shYaw = (u) => { let L = null, R = null; u.model.traverse((o) => { if (o.isBone && !L && /LeftShoulder|LeftArm$/.test(o.name)) L = o; if (o.isBone && !R && /RightShoulder|RightArm$/.test(o.name)) R = o; }); if (!L || !R) return null; u.model.updateMatrixWorld(true); const a = L.getWorldPosition(new T.Vector3()), c = R.getWorldPosition(new T.Vector3()); return Math.atan2(c.x - a.x, c.z - a.z); };
const swing = (u, ay, P, tag, still) => {
  const at0 = u.blow ? u.blow.at : 0, hp0 = u.st.hp;
  let y0 = null;
  let landed = -1;
  for (let i = 0; i < 90; i++) {
    put(); b.lookAt(u.g.position.x, u.g.position.y + ay, u.g.position.z);
    if (i === 2) b.startDig(P);
    if (u.model) y0 = shYaw(u);
    w.__adv(1);
    if (landed < 0 && u.blow && u.blow.at !== at0 && (u.st.hp < hp0 || !u.st.alive)) { landed = i; if (still) { w.__adv(2); view(still); } break; }
  }
  if (landed >= 0 && u.st.alive && y0 !== null) { let mx = 0; for (let i = 0; i < 8; i++) { put(); w.__adv(1); const y = shYaw(u); let d = y - y0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(d) > Math.abs(mx)) mx = d; } log('   shoulders turned', f2(mx * 57.3), 'deg (+ = toward +x seen from above… the cut goes toward -x)'); }
  const B = u.blow, F = u.life && u.life.flinch;
  log(tag, landed >= 0 ? 'landed f' + landed : 'MISSED', '| contact h', B ? f2(B.off.y / (u.kind.h || 1.8)) : '-', 'side x', B ? f2(B.off.x) : '-',
    '| edge', B ? [B.d.x, B.d.y, B.d.z].map(f2).join(',') : '-', '| pushed', [u.hitDir.x, u.hitDir.z].map(f2).join(','),
    '| flinch tw', F ? f2(F.tw) : '-', 'hy', F ? f2(F.hy) : '-', '| cut pieces', b.BLOW.cut ? b.BLOW.cut.pts.filter(Boolean).length + '/' + b.BLOW.cut.pts.length : 'none', 'cost ms', f2(b.BLOW.cost || 0), 'marks', b.slashMarksS().length, '| slow', f2(b.killSlowS()));
  return landed >= 0;
};
// the cuts on a living one
{
  const u = spawn(KIND); await ready(u);
  u.st.hp = 999;
  log('kind', KIND, 'life', !!u.life, 'flinch kind', u.kind.flinch || 0, 'h', u.kind.h);
  for (let k = 0; k < 4; k++) { swing(u, [1.3, 0.8, 1.6, 0.5][k] * (u.kind.h || 1.8) / 1.8, k === 2 ? 1 : 0, 'cut ' + k + (k === 2 ? ' heavy' : ''), k < 2 ? 'cut' + k : null); for (let i = 0; i < 40; i++) { put(); w.__adv(1); } }
  snap('marks', X + 0.5, 1.5, Z - 0.6, u.g.position.x, u.g.position.y + 1.1, u.g.position.z, 45);
  u.st.alive = false; u.g.visible = false;
}
// the kills: where the body goes
const kill = async (tag, ay, P) => {
  const u = spawn(KIND); await ready(u);
  u.st.hp = 1;
  const p0 = u.g.position.clone();
  swing(u, ay * (u.kind.h || 1.8) / 1.8, P, 'kill ' + tag, null);
  // follow it: the middle, the head, the feet
  let parts = null; const sv = [];
  for (let i = 0; i < 150; i++) {
    put(); w.__adv(1);
    if (!parts && u.rag) { parts = u.rag.parts; const sd = parts.filter((q) => q.seed); log('  thrown: seed speed avg', f2(sd.reduce((a, q) => a + Math.hypot(q.seed.x, q.seed.z), 0) / Math.max(1, sd.length)), 'up', f2(sd.reduce((a, q) => a + q.seed.y, 0) / Math.max(1, sd.length)), '| vmax', u.rag.vmax, 'travel', u.rag.travel, '| killP', f2(u.st.killP || 0), 'frame', i); }
    if (i === 10 || i === 30 || i === 70) { const c = u.rag ? u.rag.parts.reduce((a, q) => a.add(q.p), new T.Vector3()).multiplyScalar(1 / u.rag.parts.length) : u.g.position; snap(tag + '_' + i, X + 3.2, 1.5, Z - 1.2, c.x, c.y + 0.3, c.z, 60); }
  }
  if (u.rag) {
    const P = u.rag.parts, mid = P.reduce((a, q) => a.add(q.p), new T.Vector3()).multiplyScalar(1 / P.length);
    const hd = P.find((q) => /Head/.test(q.name)), ft = P.filter((q) => /Foot|Leg/.test(q.name));
    const d = u.blow ? u.blow.d : new T.Vector3(1, 0, 0);
    const along = (v) => f2((v.x - p0.x) * d.x + (v.z - p0.z) * d.z);
    log('  body: middle went', f2(Math.hypot(mid.x - p0.x, mid.z - p0.z)), 'm, along the cut', along(mid), '| head along the cut', hd ? along(hd.p) : '-', '| feet along', ft.length ? along(ft.reduce((a, q) => a.add(q.p), new T.Vector3()).multiplyScalar(1 / ft.length)) : '-', '| gone', JSON.stringify(Object.keys(u.gone || {}).filter((k) => u.gone[k])));
  } else log('  no ragdoll', 'alive', u.st.alive, 'struck', u.st.struck);
  u.g.visible = false;
};
await kill('head', 1.65, 0);
// ---- a closer look (2026-11-23, "MAKE SURE THESE CHANGES ARE GOOD AND NOT CHEAP"): the marks once he has turned, the streak
// frame by frame from your eye, a kill from the side every 6 frames, and what the body is made of (vertices) for the cost
{
  const u = spawn(KIND); await ready(u);
  u.st.hp = 999;
  let nv = 0, nm = 0; u.model.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) { nm++; nv += o.geometry.attributes.position.count; } });
  log('body: meshes', nm, 'vertices', nv);
  const at0 = u.blow ? u.blow.at : 0; let i0 = -1;
  for (let i = 0; i < 90; i++) { put(); b.lookAt(u.g.position.x, u.g.position.y + 1.25, u.g.position.z); if (i === 2) b.startDig(0); w.__adv(1); if (u.blow && u.blow.at !== at0 && i0 < 0) i0 = i; if (i0 >= 0 && i - i0 <= 16 && (i - i0) % 4 === 0) snap('eye_' + (i - i0), X, 1.7, Z, u.g.position.x, u.g.position.y + 1.1, u.g.position.z, 38); if (i0 >= 0 && i - i0 > 16) break; }
  { const n0 = b.bloodDropsN(); let mx = 0; for (let i = 0; i < 30; i++) { put(); w.__adv(1); mx = Math.max(mx, b.bloodDropsN() - n0); if (i === 3 || i === 20) snap('wound_' + i, X, 1.7, Z, u.g.position.x, u.g.position.y + 1.2, u.g.position.z, 22); } log('drops in the air after the cut, at most', mx); }
  // turned: the mark from his side and from behind his shoulder
  const g = u.g.position;
  for (const [nm2, a] of [['mark_front', 0], ['mark_side', Math.PI / 2], ['mark_34', Math.PI / 4]]) { u.g.rotation.y += a; w.__adv(1); snap(nm2, g.x + 0.9, g.y + 1.35, g.z + 0.9, g.x, g.y + 1.2, g.z, 40); u.g.rotation.y -= a; }
  u.st.alive = false; u.g.visible = false;
}
{
  const u = spawn(KIND); await ready(u); u.st.hp = 1;
  const at0 = u.blow ? u.blow.at : 0; let i0 = -1;
  for (let i = 0; i < 160; i++) { put(); b.lookAt(u.g.position.x, u.g.position.y + 1.3, u.g.position.z); if (i === 2) b.startDig(0); w.__adv(1); if (u.blow && u.blow.at !== at0 && i0 < 0) i0 = i; if (i0 >= 0 && (i - i0) % 6 === 0 && i - i0 <= 54) { snap('side_' + (i - i0), X + 3.4, 1.3, Z - 1.6, X - 0.6, 0.7, Z - 1.9, 55); snap('keye_' + (i - i0), X, 1.7, Z, X - 0.5, 0.6, Z - 2.2, 60); } }
  u.g.visible = false;
}
