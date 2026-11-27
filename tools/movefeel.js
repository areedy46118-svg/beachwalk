/* HOW MOVING FEELS, IN NUMBERS (2026-11-27, the owner: "do one more pass just to improve movement smoothness and feel. the jump and
 * momentum … make the kick feel good in relation to this"). On the open beach, on the clock, by the real keys:
 *   1  a standing jump, Space HELD: the rise, the fall, the top, the landing's speed, the lens's dip after it;
 *   2  the same, Space TAPPED (let go after two frames): the top;
 *   3  from standing to the run and back to standing: how long each takes, and the biggest frame-to-frame change of speed;
 *   4  a running jump with the keys held: how far, the speed through it, the landing and a hop straight out of it;
 *   5  in the air, the keys turned round (W let go, S held): the speed along the run 0.3 s on;
 *   6  a kick thrown at a run, at nothing: the speed before, through and after it;
 *   7  a kick thrown at a run INTO a man (a farmer, 20 points): the speed after, how far he went;
 *   8  a jump kick at a run into a man: the same, and your rise off him.
 *   PB_PORT=4271 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/movefeel.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
w.__clockOn(); const adv = (n = 1) => w.__adv(n), C = b.camera, T = b.THREE;
const key = (code, on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
let X = 8, Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -30; dz <= 4 && ok; dz += 1) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
const look = () => b.lookAt(C.position.x, C.position.y - 0.02, C.position.z - 10);
// (your speed is the walk's own velocity, `velS` — the lens's position has the shake on it, and reads as a stutter that is not there)
let px, pz; const sp = () => { const v = b.velS(); return Math.hypot(v[0], v[1]); };
const home = () => { key('KeyW', false); key('KeyS', false); key('ShiftLeft', false); key('Space', false); for (let i = 0; i < 50; i++) adv(1); C.position.set(X, 1.7, Z); b.camBaseY = 1.7; for (let i = 0; i < 40; i++) { look(); adv(1); } px = C.position.x; pz = C.position.z; b.stamina = 1; };
const runUp = (n = 70) => { key('KeyW', true); key('ShiftLeft', true); for (let i = 0; i < n; i++) { look(); adv(1); sp(); } };
// 1, 2: the jump's shape
for (const [nm, hold] of [['held', 60], ['tapped', 2]]) {
  home(); const y0 = b.camBaseY; key('Space', true);
  let top = 0, up = 0, air = 0, vLand = 0, dipMax = 0, dipMin = 0, dipAt = -1, f = 0, tr = [];
  for (; f < 90; f++) {
    if (f === hold) key('Space', false);
    const vy = b.state().vy; look(); adv(1);
    const y = b.camBaseY - y0; if (y > top) { top = y; up = f + 1; }
    if (f % 4 === 0 && !b.state().onGround) tr.push(y.toFixed(2));
    if (!b.state().onGround) { air = f + 1; vLand = b.state().vy; }
    else if (f > 3) { dipMax = Math.max(dipMax, b.landS()[0]); dipMin = Math.min(dipMin, b.landS()[0]); if (dipAt < 0 && b.landS()[1] < 0) dipAt = f - air; if (f > air + 30) break; }
  }
  key('Space', false);
  log(`${nm === 'held' ? 1 : 2} standing jump, Space ${nm}: top ${top.toFixed(3)} m at ${(up / 60).toFixed(2)} s, down at ${(air / 60).toFixed(2)} s (rise ${(up / 60).toFixed(2)} / fall ${((air - up) / 60).toFixed(2)}), last speed in the air ${vLand} m/s, the lens dipped ${dipMax.toFixed(3)} m, deepest ${dipAt} frames after landing, came back ${(-dipMin).toFixed(3)} m over | height every 4 frames ${tr.join(' ')}`);
}
// 3: start and stop
{ home(); key('KeyW', true); key('ShiftLeft', true); let t90 = -1, jerk = 0, last = 0, vmax = 0; const tr = [];
  for (let f = 0; f < 80; f++) { look(); adv(1); const v = sp(); jerk = Math.max(jerk, Math.abs(v - last)); last = v; vmax = Math.max(vmax, v); if (f < 24 && f % 3 === 0) tr.push(v.toFixed(1)); }
  home(); key('KeyW', true); key('ShiftLeft', true); for (let f = 0; f < 80; f++) { look(); adv(1); const v = sp(); if (t90 < 0 && v > vmax * 0.9) t90 = (f + 1) / 60; }
  key('KeyW', false); key('ShiftLeft', false); let t10 = -1, slid = 0; const z0 = C.position.z;
  for (let f = 0; f < 80; f++) { look(); adv(1); const v = sp(); if (t10 < 0 && v < vmax * 0.1) t10 = (f + 1) / 60; } slid = z0 - C.position.z;
  log(`3 start and stop: the run ${vmax.toFixed(2)} m/s, 90 % of it in ${t90.toFixed(2)} s (every 0.05 s: ${tr.join(' ')}), biggest frame-to-frame change ${jerk.toFixed(2)} m/s | keys let go: under 10 % in ${t10.toFixed(2)} s, ${slid.toFixed(2)} m on`); }
// 4: a running jump, keys held, and a hop out of the landing
{ home(); runUp(69); look(); adv(1); const z0 = C.position.z, v0 = sp(); key('Space', true); let land = -1, jerk = 0, last = v0, vmin = 99, zl = 0, hop = false; const tr = [];
  for (let f = 0; f < 110; f++) { if (f === 30) key('Space', false); look(); adv(1); const v = sp(); jerk = Math.max(jerk, Math.abs(v - last)); last = v; vmin = Math.min(vmin, v); if (f % 6 === 0) tr.push(v.toFixed(1) + (b.state().onGround ? 'g' : 'a'));
    if (land < 0 && f > 4 && b.state().onGround) { land = f; zl = z0 - C.position.z; key('Space', true); hop = true; } else if (hop && f === land + 3) key('Space', false); }
  log(`4 running jump, keys held: run ${v0.toFixed(2)} m/s, landed ${zl.toFixed(2)} m on after ${(land / 60).toFixed(2)} s, then a hop; slowest ${vmin.toFixed(2)}, biggest frame-to-frame change ${jerk.toFixed(2)} m/s | every 0.1 s ${tr.join(' ')}`); }
// 5: turned round in the air
{ home(); runUp(); key('Space', true); adv(2); key('Space', false); key('KeyW', false); key('ShiftLeft', false); key('KeyS', true); const z0 = C.position.z; for (let f = 0; f < 18; f++) { look(); adv(1); sp(); }
  look(); adv(1); const along = -b.velS()[1]; key('KeyS', false);
  log(`5 turned round in the air (S held from take-off): 0.3 s on, still going ${along.toFixed(2)} m/s the way you jumped`); }
// 6: a kick at a run, at nothing
{ home(); runUp(69); look(); adv(1); const v0 = sp(); b.KICK.cd = 0; b.startKick(); let vmin = 99; const tr = []; for (let f = 0; f < 40; f++) { look(); adv(1); const v = sp(); vmin = Math.min(vmin, v); tr.push(v.toFixed(1)); }
  log(`6 a kick at a run, at nothing: ${v0.toFixed(2)} m/s before, slowest ${vmin.toFixed(2)} through it | every frame ${tr.join(' ')}`); }
// 7, 8: into a man
let prev = null;
for (const [n, air] of [[7, false], [8, true]]) {
  home();
  if (prev) { prev.g.visible = false; if (prev.rag) for (const q of prev.rag.parts) { q.p.y -= 300; q.pp.y -= 300; } prev.st.alive = false; }
  const u = b.mutSpawnTest(X, Z - 9.5, 'farmer1', 0); prev = u;
  for (let i = 0; i < 600 && !(u.model && u.mixer); i++) { adv(1); await sleep(10); }
  for (let i = 0; i < 20; i++) adv(1);
  u.st.awake = true; u.st.cool = 99; u.st.hp = 20; home(); u.st.cool = 99;
  const pose = () => { u.st.cool = 99; };
  key('KeyW', true); key('ShiftLeft', true); let thrown = false, v0 = 0, y0 = b.camBaseY, top = 0, hit = -1, m0 = null; const tr = []; let vAfter = [];
  for (let f = 0; f < 200; f++) {
    pose(); b.lookAt(u.g.position.x, C.position.y - (air ? 0.25 : 0.1), u.g.position.z); adv(1); const v = sp();
    const d = Math.hypot(u.g.position.x - C.position.x, u.g.position.z - C.position.z);
    if (air && !thrown && d < 4.6 && b.state().onGround && !w.__mfJ) { w.__mfJ = 1; key('Space', true); }
    if (!thrown && d < (air ? 2.5 : 2.2)) { thrown = true; v0 = v; m0 = u.g.position.clone(); b.KICK.cd = 0; b.startKick(); key('Space', false); }
    if (thrown && hit < 0 && b.KICK.struck) hit = f;
    if (hit >= 0) { top = Math.max(top, b.camBaseY - y0); if (vAfter.length < 40) vAfter.push(v.toFixed(1) + (b.state().onGround ? '' : 'a') + (b.hitstopS && b.hitstopS() > 0 ? 'h' : '')); if (f - hit > 70) break; }
  }
  w.__mfJ = 0; key('KeyW', false); key('ShiftLeft', false);
  const hp = u.rag ? (u.rag.byName['Character1_Hips'] || u.rag.parts[0]).p : u.g.position;
  log(`${n} ${air ? 'a jump kick' : 'a kick'} at a run into a man: ${v0.toFixed(2)} m/s when thrown, struck ${b.KICK.struck}, air ${!!b.KICK.air}, mom ${(b.KICK.mom || 0).toFixed(2)}; your speed every frame after (a in the air, h held) ${vAfter.join(' ')}; your feet got to ${top.toFixed(2)} m; he went ${m0 ? Math.hypot(hp.x - m0.x, hp.z - m0.z).toFixed(2) : '?'} m (alive ${u.st.alive}, down ${(u.st.down || 0) > 0 || !!u.rag})`);
}
// 9: slide, jump out of it, slide again on landing, six times: the speed at each landing
{ home(); if (prev) { prev.g.visible = false; prev.st.alive = false; } runUp(); const tr = [sp().toFixed(1)]; let n = 0, was = true, wait = 0; key('KeyC', true); adv(2); key('KeyC', false); wait = 6;
  for (let f = 0; f < 420 && n < 6; f++) { look(); adv(1); const v = sp(), g = b.state().onGround;
    if (wait > 0 && --wait === 0) { key('Space', true); adv(2); sp(); key('Space', false); }
    if (g && !was) { tr.push(v.toFixed(1)); n++; if (b.state().crouching) { key('KeyC', true); adv(2); key('KeyC', false); } key('KeyC', true); adv(2); sp(); key('KeyC', false); wait = 6; }
    was = g; }
  key('KeyW', false); key('ShiftLeft', false);
  log(`9 slide-hops: the run, then the speed at each landing ${tr.join(' ')} | stamina left ${b.stamina.toFixed(2)}`); }
log('DONE');
