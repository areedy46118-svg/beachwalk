/* THE .44 ON A FARMER (2026-11-27, the owner: "make the gunplay way better … more effective and more impact/recoil"). On the open beach
 * (the death lab's way), a fresh farmer 6 m off for each of `&n=` runs: one round to his chest (how far it shoved him, and whether he
 * lived), rounds until he dies (how far the kill threw the body along the round), then a round into the body on the sand (how far
 * it moved). And the kick on you: the look's climb and the lens's kick over the shot.
 *   PB_PORT=4269 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/gunfeel.js&n=3' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const C = b.camera, T = b.THREE, Q = new URLSearchParams(location.search), N = +(Q.get('n') || 3), KIND = Q.get('k') || 'farmer1';
let X = 8, Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -8; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
if (Q.get('fling') !== null) w.__magFling = +Q.get('fling');
w.__clockOn();
const it = b.magnumItem; b.addToInventory(it); if (b.state().equipped !== it.name) b.toggleEquip(it);
for (let i = 0; i < 60; i++) w.__adv(1);
let prev = null; const rows = [];
const hipsOf = (u) => { const r = u.rag; if (r) return (r.byName['Character1_Hips'] || r.parts[0]).p.clone(); return u.g.position.clone(); };
for (let k = 0; k < N; k++) {
  if (prev) { prev.g.visible = false; if (prev.rag) for (const q of prev.rag.parts) { q.p.y -= 300; q.pp.y -= 300; } }
  const u = b.mutSpawnTest(X, Z - 6, KIND, 0); prev = u;
  for (let i = 0; i < 600 && !(u.model && u.mixer); i++) { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; w.__adv(1); await sleep(10); }
  for (let i = 0; i < 20; i++) w.__adv(1);
  u.st.awake = true; u.st.cool = 99; u.st.hp = Math.max(u.st.hp, 20); u.st.block = 0;
  const aim = () => { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; b.lookAt(u.g.position.x, u.g.position.y + 1.2, u.g.position.z); };
  const fire = () => { b.magAmmo = 6; for (let i = 0; i < 60 && (b.magAmmoS().busy); i++) w.__adv(1); aim(); b.magFire(); };
  // one round: the shove
  aim(); w.__adv(2); const p0 = u.g.position.clone(); let pitch0 = 0; { const e = new T.Euler().setFromQuaternion(C.quaternion, 'YXZ'); pitch0 = e.x; }
  fire(); let pk = 0;
  for (let i = 0; i < 40; i++) { w.__adv(1); const e = new T.Euler().setFromQuaternion(C.quaternion, 'YXZ'); pk = Math.max(pk, e.x - pitch0); }
  const shove = Math.hypot(u.g.position.x - p0.x, u.g.position.z - p0.z), alive1 = u.st.alive;
  // then down: rounds till he dies
  let shots = 1; const pre = hipsOf(u);
  for (let s = 0; s < 8 && u.st.alive; s++) { u.st.hp = Math.min(u.st.hp, 10); fire(); shots++; for (let i = 0; i < 30; i++) w.__adv(1); }
  for (let i = 0; i < 180; i++) w.__adv(1);
  const post = hipsOf(u), dir = new T.Vector3(post.x - X, 0, post.z - Z).normalize(), thrown = (post.x - pre.x) * dir.x + (post.z - pre.z) * dir.z;
  // and the body shot where it lies
  let corpse = '-';
  if (u.rag) { const h0 = hipsOf(u); C.position.set(X, 1.7, Z); b.lookAt(h0.x, h0.y + 0.05, h0.z); w.__adv(1); b.magAmmo = 6; for (let i = 0; i < 60 && b.magAmmoS().busy; i++) w.__adv(1); b.lookAt(h0.x, h0.y + 0.05, h0.z); b.magFire(); const tr = []; for (let i = 0; i < 120; i++) { w.__adv(1); if ([1, 3, 6, 10, 20, 40].includes(i)) { const hh = hipsOf(u); let vm = 0; for (const q of u.rag.parts) vm = Math.max(vm, q.p.distanceTo(q.pp) * 180); tr.push(i + ':' + Math.hypot(hh.x - h0.x, hh.z - h0.z).toFixed(2) + '/' + vm.toFixed(1) + (u.rag.asleep ? 'z' : '')); } } w.__corpseTr = tr.join(' '); const h1 = hipsOf(u); corpse = Math.hypot(h1.x - h0.x, h1.z - h0.z).toFixed(2) + ' m (blows on it ' + (u.rag.hitN || 0) + ') ' + w.__corpseTr; }
  rows.push(`run ${k}: one round shoved him ${shove.toFixed(2)} m (alive ${alive1}) | the look climbed ${(pk * 57.3).toFixed(1)}° at most | killed after ${shots} rounds, the body thrown ${thrown.toFixed(2)} m along the line | a round into the body moved it ${corpse}`);
}
// THE KICK ON YOU: where a round fired level leaves you standing, and a barrel of the sawn-off fired at your feet in the air
{
  if (prev) { prev.g.visible = false; if (prev.rag) for (const q of prev.rag.parts) { q.p.y -= 300; q.pp.y -= 300; } }
  C.position.set(X, 1.7, Z); b.camBaseY = 1.7; b.look(0, 0); for (let i = 0; i < 40; i++) w.__adv(1);
  const a0 = C.position.clone(); b.magAmmo = 6; for (let i = 0; i < 60 && b.magAmmoS().busy; i++) w.__adv(1); b.look(0, 0); b.magFire(); for (let i = 0; i < 40; i++) w.__adv(1);
  const magPush = Math.hypot(C.position.x - a0.x, C.position.z - a0.z);
  let sg = '-';
  try {
    const sgI = b.shotgunItem; b.addToInventory(sgI); if (b.state().equipped !== sgI.name) b.toggleEquip(sgI); for (let i = 0; i < 90; i++) w.__adv(1);
    C.position.set(X, 1.7, Z); b.camBaseY = 1.7; b.look(0, 0); for (let i = 0; i < 10; i++) w.__adv(1);
    b.sgCh = [1, 1]; const s0 = C.position.clone(); b.sgFire(); for (let i = 0; i < 40; i++) w.__adv(1);
    const sgPush = Math.hypot(C.position.x - s0.x, C.position.z - s0.z);
    for (let i = 0; i < 40; i++) w.__adv(1); b.sgCh = [1, 1]; C.position.set(X, 12.0, Z); b.camBaseY = 12.0; b.airborne = true; b.look(0, -1.3); for (let i = 0; i < 8; i++) w.__adv(1);
    const vy0 = b.state().vy; b.look(0, -1.3); b.sgFire(); w.__adv(1); const vy1 = b.state().vy;
    sg = `the sawn-off moved you ${sgPush.toFixed(2)} m on your feet; at your feet in the air vy ${vy0} → ${vy1}`;
    b.toggleEquip(b.magnumItem); for (let i = 0; i < 60; i++) w.__adv(1);
  } catch (e) { sg = 'sawn-off: ' + e.message; }
  rows.push(`the .44 fired level moved you ${magPush.toFixed(2)} m | ${sg}`);
}
// A ROUND INTO A LOOSE THING: the first loose body in the world that is not a breakable, set down 5 m off and shot
{
  const P = b.physProps.filter((p) => !p.onImpact && !p.dead && !p.pinned && !p.room && p.mesh.parent);
  rows.push(`loose bodies ${P.length}: ${[...new Set(P.map((p) => (p.radius || 0).toFixed(2)))].slice(0, 12).join(' ')}`);
  for (const p of P.slice(0, 3)) {
    C.position.set(X, 1.7, Z); b.camBaseY = 1.7; b.look(0, 0);
    p.mesh.position.set(X, b.beachGroundAt(X, Z - 5) + p.restH, Z - 5); p.vel.set(0, 0, 0); p.angVel.set(0, 0, 0); p.asleep = false;
    for (let i = 0; i < 40; i++) w.__adv(1);
    const m0 = p.mesh.position.clone(); b.magAmmo = 6; for (let i = 0; i < 60 && b.magAmmoS().busy; i++) w.__adv(1);
    b.lookAt(m0.x, m0.y, m0.z); b.magFire(); let top = 0; for (let i = 0; i < 120; i++) { w.__adv(1); top = Math.max(top, p.mesh.position.y - m0.y); }
    rows.push(`  r ${p.radius.toFixed(2)}${p.drift ? ' (driftwood)' : ''}: knocked ${Math.hypot(p.mesh.position.x - m0.x, p.mesh.position.z - m0.z).toFixed(2)} m, up ${top.toFixed(2)} m`);
  }
}
for (const r of rows) log(r);
log('DONE');
