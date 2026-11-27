/* THE BLOW MOVES WHAT IT HIT (2026-11-24, the owner: "physics-blended hit reactions while alive … make it good … have the wounds react to
 * where hit"). A man stood 1.75 m in front of you (devMode: he never swings), the katana's real cuts at his head, his right shoulder,
 * his belly and his left knee; per cut: the bone the blow was on, the biggest spring angle reached and where, how long until it is
 * still; stills from your eye 0/3/6/10/16 frames after; and after four cuts to one arm and two to a leg, the wounds as they stay.
 * &k= the kind (farmer1, pale). PB_PORT=4227 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/hitreact.js&k=farmer1' <out> */
const KIND = new URLSearchParams(location.search).get('k') || 'farmer1';
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const C = b.camera, T = b.THREE, f2 = (v) => (+v).toFixed(2);
const kat = b.katanaItem; b.addToInventory(kat); b.toggleEquip(kat);
let X = 8, Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -4; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
w.__clockOn();
const put = () => { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; };
const u = b.mutSpawnTest(X, Z - 1.75, KIND, 0);
for (let i = 0; i < 600 && !(u.model && u.mixer); i++) { put(); w.__adv(1); await sleep(10); }
for (let i = 0; i < 40; i++) { put(); w.__adv(1); }
u.st.hp = 9999; u.st.awake = true;
log('kind', KIND, 'life', !!u.life);
const H = u.kind.h || 1.8;
const view = (nm) => { const q = C.quaternion.clone(), f0 = C.fov; C.fov = 40; C.updateProjectionMatrix(); put(); C.lookAt(u.g.position.x, u.g.position.y + H * 0.6, u.g.position.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 400, 1.3); C.fov = f0; C.updateProjectionMatrix(); C.quaternion.copy(q); };
const cut = (tag, ay, ax, P, still) => {
  u.g.position.set(X, u.g.position.y, Z - 1.75);
  const at0 = u.blow ? u.blow.at : 0, hp0 = u.st.hp;
  let i0 = -1, maxA = 0, maxK = '-', calm = -1;
  for (let i = 0; i < 120; i++) {
    put(); b.lookAt(u.g.position.x + ax, u.g.position.y + ay, u.g.position.z);
    if (i === 2) b.startDig(P);
    w.__adv(1);
    if (i0 < 0 && u.st.hp < hp0) i0 = i;
    if (i0 >= 0) {
      const S = u.life && u.life.spr;
      if (S) for (const k in S) { const a = S[k].th.length(); if (a > maxA) { maxA = a; maxK = k; } }
      if (!S && calm < 0 && i > i0 + 1) calm = i - i0;
      if (still && [0, 3, 6, 10, 16].includes(i - i0)) view(`${tag}_${i - i0}`);
      if (i - i0 > 50) break;
    }
  }
  const W = u.life && u.life.wound;
  log(tag, 'stumbled', f2(Math.hypot(u.g.position.x - X, u.g.position.z - (Z - 1.75))), 'm |', i0 >= 0 ? 'hit' : 'MISSED', '| biggest swing', f2(maxA * 57.3), 'deg at', maxK, '| still after', calm, 'frames | wounds', W ? JSON.stringify(Object.fromEntries(Object.entries(W).map(([k, v]) => [k, +v.toFixed(2)]))) : '-');
};
cut('head', H * 0.92, 0, 0, true);
for (let i = 0; i < 60; i++) { put(); w.__adv(1); }
cut('shoulderR', H * 0.78, -0.22, 0, true);
for (let i = 0; i < 60; i++) { put(); w.__adv(1); }
cut('belly', H * 0.55, 0, 1, true);
for (let i = 0; i < 60; i++) { put(); w.__adv(1); }
cut('kneeL', H * 0.3, 0.15, 0, true);
for (let k = 0; k < 3; k++) { for (let i = 0; i < 40; i++) { put(); w.__adv(1); } cut('arm' + k, H * 0.72, -0.25, 0, false); }
for (let k = 0; k < 2; k++) { for (let i = 0; i < 40; i++) { put(); w.__adv(1); } cut('leg' + k, H * 0.28, 0.15, 0, false); }
for (let i = 0; i < 90; i++) { put(); w.__adv(1); }
view('wounded_front');
{ const q = C.quaternion.clone(); C.position.set(X + 2.2, 1.4, Z - 1.75); C.lookAt(u.g.position.x, u.g.position.y + H * 0.5, u.g.position.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('wounded_side', 400, 1.3); C.quaternion.copy(q); }

// the bump: you at a run straight into him
{
  u.g.position.set(X, u.g.position.y, Z - 1.75); for (let i = 0; i < 40; i++) { put(); w.__adv(1); }
  const V = b.velocityS(); let moved = 0, maxA = 0;
  for (let i = 0; i < 60; i++) {
    const cz = Z + 2.0 - i * 0.09; C.position.set(X, 1.7, Math.max(cz, Z - 1.0)); b.camBaseY = 1.7; b.lookAt(X, 1.2, Z - 3);
    if (i === 28) b.bumpBodyS(u, new b.THREE.Vector3(0, 0, -1), 5.7);   // (the game's own run sets your velocity; a probe cannot hold it: the shove called as the run would)
    w.__adv(1);
    moved = Math.max(moved, Math.hypot(u.g.position.x - X, u.g.position.z - (Z - 1.75)));
    const S = u.life && u.life.spr; if (S) for (const k in S) maxA = Math.max(maxA, S[k].th.length());
    if (i === 30 || i === 36 || i === 44) view('bump_' + i);
  }
  log('bump: he was shoved', f2(moved), 'm | his biggest bone swing', f2(maxA * 57.3), 'deg | bumped', !!u.bumpAt);
}
