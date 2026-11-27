/* A SWING AT THE TAVERN'S ORC, TIMED (2026-11-26, the owner: "everytime i swing at the orc i lag in the tavern fix this now").
 * The tavern loaded and placed; you 1.7 m in front of the orc, the katana out; light and heavy swings at his chest, head and
 * beside him — each frame of the swing timed on the probe's clock (real ms), with the skin test (`meleeSkin`) and with the
 * capsule (`__meleeCap = 1`), and what reading his skin costs.
 *   PB_PORT=4241 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/orcswing.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
b.settings.devMode = true;
const RB = b.ROOM_BACK.tav; RB.load();
for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
log('tavern ready', RB.ready()); b.clearRoomFlags(); RB.place();
if (new URLSearchParams(location.search).get('nowarm')) for (const x of [b.orcUnit, b.wongUnit, b.drunkUnit]) if (x) x.hitWarm = true;
let wf = 0; const slow = []; for (let i = 0; i < 90; i++) { const a = performance.now(); b.frame(1); const ms = performance.now() - a; wf = Math.max(wf, ms); if (ms > 12) slow.push(i + ':' + ms.toFixed(0)); await sleep(20); } log('worst frame while his light copy is made', wf.toFixed(1), 'ms | frames over 12 ms', slow.join(' '), '| warm off for comparison:', new URLSearchParams(location.search).get('nowarm'));
let u = b.orcUnit;
for (let i = 0; i < 400 && !((u = b.orcUnit) && u.model && u.mixer); i++) { b.frame(1); await sleep(30); }
log('orc', !!u, 'model', !!(u && u.model), 'in tavern', b.tavState().inTavern);
let faces = 0, verts = 0; u.model.traverse((m) => { if (m.isSkinnedMesh) { faces += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; verts += m.geometry.attributes.position.count; } });
log('his skinned meshes', faces, 'faces', verts, 'verts'); if (0) { const L = []; u.model.traverse((m) => { if (m.isSkinnedMesh) { m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; L.push(m.name + ':' + ((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3) + ' diag ' + bb.max.distanceTo(bb.min).toFixed(2) + ' vis ' + m.visible); } }); log('meshes', L.length, L.join(' | ')); }
const kat = b.katanaItem; b.addToInventory(kat); if (b.state().equipped !== kat.name) b.toggleEquip(kat);
w.__clockOn();
const C = b.camera, P = u.g.position.clone(), yaw = u.g.rotation.y, X = P.x + Math.sin(yaw) * 1.7, Z = P.z + Math.cos(yaw) * 1.7;
const put = () => { C.position.set(X, P.y + 1.7, Z); b.camBaseY = P.y + 1.7; };
for (let i = 0; i < 30; i++) { put(); w.__adv(1); }
{ let lf = 0, nl = 0, worstB = 0; u.model.traverse((m) => { if (m.isSkinnedMesh && m.geometry.userData.hitLod) { lf += m.geometry.userData.hitLod.tri.length / 3; nl++; } }); log('warmed', u.hitWarm, '| light copies', nl, 'meshes,', lf, 'faces'); }
{ let a = performance.now(); for (let i = 0; i < 5; i++) b.cutTrisS(u, P.clone().setY(P.y + 1), 2.8); log('reading his skin once', ((performance.now() - a) / 5).toFixed(1), 'ms,', b.pbSkinS(u).length / 9, 'faces near him'); }
const blk = u.kind.block; u.kind.block = 0;
// (who skins vertices on the CPU through a swing: every call counted a frame, and the stack of the first heavy one of each kind)
const SK = b.THREE.SkinnedMesh.prototype, cnt = { n: 0 }, stacks = new Map();
for (const fn of ['getVertexPosition', 'applyBoneTransform']) { const o = SK[fn]; SK[fn] = function (...a) { cnt.n++; if (cnt.n === 30001) { const st = new Error().stack.split('\n').slice(2, 7).map((l) => l.trim().replace(/\(?http.*main\.js\?[^:]*:/, 'main.js:')).join(' < '); stacks.set(st, (stacks.get(st) || 0) + 1); } return o.apply(this, a); }; }
const swing = (ay, dx, heavy) => {
  const hp0 = u.st.hp; let worst = 0, tot = 0, n = 0, landed = false, wv = 0;
  for (let i = 0; i < 70; i++) {
    put(); u.st.atk = -1; u.st.cool = 3; u.st.block = 0;
    b.lookAt(P.x + dx, P.y + ay, P.z);
    if (i === 2) b.startDig(heavy);
    cnt.n = 0; const a = performance.now(); w.__adv(1); const ms = performance.now() - a; if (i > 2) { if (ms > worst) { worst = ms; wv = cnt.n; } tot += ms; n++; }
    if (u.st.hp < hp0) landed = true;
  }
  for (let i = 0; i < 40; i++) { put(); w.__adv(1); }
  return `landed ${landed} worst ${worst.toFixed(1)} ms (${wv} verts skinned in it, blade cut ${(b.BLOW.cost || 0).toFixed(1)} ms) mean ${(tot / n).toFixed(1)}`;
};
for (const mode of (new URLSearchParams(location.search).get('nowarm') ? [] : ['skin', 'cap'])) {
  w.__meleeCap = mode === 'cap' ? 1 : 0;
  for (const [nm, ay, dx] of [['chest', 1.4, 0], ['head', 1.9, 0], ['side', 1.2, 0.9]]) for (const H of [0, 1]) {
    u.st.hp = 9999; u.st.alive = true; u.st.stun = 0; u.st.recoil = 0;
    log(mode, nm, H ? 'heavy' : 'light', swing(ay, dx, H));
  }
}
w.__meleeCap = 0; u.kind.block = blk;
for (const [st, k] of stacks) log('HEAVY x' + k, st);
log('DONE');
