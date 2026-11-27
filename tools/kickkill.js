/* A KICK THAT KILLS THROWS HIM ALONG IT (2026-11-26, the owner: "when kicked as a death blow make the enemy go flying in the direction
 * kicked"). The first castle; a man on 1 health stood 1.4 m in front of you, kicked, in `&dirs=` directions (degrees, 0 = -z);
 * per kill: did the kick start, did it strike him, how far the hips went and where (along the kick / across), the ragdoll's
 * first-flight cap, and what stopped it (a wall within 0.6 m of where the hips came to rest).
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/kickkill.js&dirs=0,90,180,270' <out> */
const Q = new URLSearchParams(location.search), DIRS = (Q.get('dirs') || '0,90,180,270').split(',').map(Number);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS(), C = b.camera, f2 = (v) => (+v).toFixed(2);
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = true;
for (let i = 0; i < 60 && !b.KICK.ready; i++) { w.__adv(1); await sleep(50); }
const P0 = C.position.clone();
// (clear of the court's solid props — a man held at 1.4 m was pushed off the fountain's rim before the kick landed)
{ const sol = b.CP.sites.fort.props.filter((q) => !q.dead && (q.kind.K.solid || q.kind.K.fixed)), c0 = P0.clone();
  const clear = (x, z) => sol.every((q) => Math.hypot(q.x - x, q.z - z) > q.kind.r + 3.2);
  if (Q.get('clear')) outer: for (let r = 0; r <= 8; r += 1) for (let k = 0; k < 8; k++) { const x = c0.x + Math.sin(k * Math.PI / 4) * r, z = c0.z + Math.cos(k * Math.PI / 4) * r; if (clear(x, z)) { P0.x = x; P0.z = z; break outer; } }
  log('stood', f2(P0.x - c0.x), f2(P0.z - c0.z), 'from the boot spot'); } const DK = b.dkSlotS(); if (DK.unit) { DK.unit.g.visible = false; DK.unit.st.awake = false; }
const used = new Set();
for (const deg of DIRS) {
  const a = deg * Math.PI / 180, fx = -Math.sin(a), fz = -Math.cos(a);
  const u = units().find((x) => x.st.alive && x.model && x.g.visible && x.farm && x.farm.out && !used.has(x)); if (!u) { log('no man left'); break; }
  used.add(u);
  // (you go to him: stood 1.4 m off him on the side the kick comes from — a man moved by the probe is put back by his own clamps)
  const put = () => { const m = u.g.position; P0.set(m.x - fx * 1.4, P0.y, m.z - fz * 1.4); C.position.copy(P0); b.camBaseY = P0.y; b.lookAt(m.x, P0.y - 0.35, m.z); };
  for (let i = 0; i < 20; i++) { put(); u.st.awake = true; u.st.down = 0; u.st.stun = 0; w.__adv(1); }
  u.st.hp = 1; b.KICK.cd = 0; b.KICK.lastHit = null; w.__kickDbg = [];
  const st0 = JSON.stringify({ on: b.KICK.on, cd: b.KICK.cd, ready: b.KICK.ready });
  const ok = b.startKick(); const p0 = u.g.position.clone();
  let far = 0, top = 0, H = null;
  const P1 = new b.THREE.Vector3(); for (let i = 0; i < 300; i++) { if (!b.KICK.struck) { put(); P1.copy(P0); p0.copy(u.g.position); } C.position.copy(P1); w.__adv(1); const R = u.rag; if (R && R.parts) { H = (R.byName && R.byName.Character1_Hips) || R.parts[0]; far = Math.max(far, Math.hypot(H.p.x - p0.x, H.p.z - p0.z)); top = Math.max(top, H.p.y - p0.y); } }
  const along = H ? (H.p.x - p0.x) * fx + (H.p.z - p0.z) * fz : 0, across = H ? (H.p.x - p0.x) * -fz + (H.p.z - p0.z) * fx : 0;
  const R = u.rag; let wall = null;
  if (H) { let bd = 9; for (const q of b.CP.sites.fort.props) { if (q.dead || !(q.kind.K.solid || q.kind.K.fixed)) continue; const d = Math.hypot(q.x - H.p.x, q.z - H.p.z) - q.kind.r; if (d < bd) { bd = d; wall = q.kind.name + ' ' + f2(d); } } if (bd > 1.0) wall = null;
    for (let t = 0.2; t < 6 && !wall; t += 0.2) { const x = H.p.x + fx * t, z = H.p.z + fz * t; if (b.fortWallAtS && b.fortWallAtS(x, z)) wall = 'stone ' + f2(t) + ' m on'; } }
  log('dir', deg, '| hitDir', u.hitDir ? f2(u.hitDir.x) + ',' + f2(u.hitDir.z) : '-', 'want', f2(fx) + ',' + f2(fz), '| kick', st0, 'started', ok, 'struck', !!(b.KICK.lastHit && b.KICK.lastHit.u === u), '| dead', !u.st.alive, 'rag', !!R, 'fling', u.st.killFling, '| vmax', R ? f2(R.vmax) : '-', 'travel', R ? f2(R.travel) : '-',
    '| hips went', f2(far), 'm: along', f2(along), 'across', f2(across), 'up', f2(top), '| a wall at rest', wall ? 'yes' : 'no');
  log('   dbg', (w.__kickDbg || []).slice(0, 8).join(' || '));
  u.g.visible = false;
}
// (&down=N, 2026-11-26: men on full health kicked until N have been THROWN as a ragdoll — `kickRagStart`: how far, how long in it,
// that he gets up, where he stands against where his hips lay, and how far his pose jumped the frame the ragdoll let go)
const DOWN = +(Q.get('down') || 0); let got = 0;
for (let tries = 0; tries < 40 && got < DOWN; tries++) {
  const u = units().find((x) => x.st.alive && x.model && x.g.visible && x.farm && x.farm.out && !x.kickRag && !(x.st.down > 0)); if (!u) { log('no man left'); break; }
  const fx = 0, fz = -1;
  const put = () => { const m = u.g.position; P0.set(m.x - fx * 1.4, P0.y, m.z - fz * 1.4); C.position.copy(P0); b.camBaseY = P0.y; b.lookAt(m.x, P0.y - 0.35, m.z); };
  for (let i = 0; i < 12; i++) { put(); w.__adv(1); }
  u.st.hp = Math.max(u.st.hp, 6); b.KICK.cd = 0; b.KICK.lastHit = null; b.heal(); if (b.setStaminaS) b.setStaminaS(1);
  if (!b.startKick()) { for (let i = 0; i < 60; i++) w.__adv(1); continue; }
  const P1 = new b.THREE.Vector3(), p0 = u.g.position.clone();
  for (let i = 0; i < 30 && !u.kickRag; i++) { if (!b.KICK.struck) { put(); P1.copy(P0); p0.copy(u.g.position); } C.position.copy(P1); w.__adv(1); }
  if (!u.kickRag) { for (let i = 0; i < 50; i++) { C.position.copy(P1); w.__adv(1); } continue; }
  got++;
  let far = 0, top = 0, tRag = 0, hipAt = null, jump = 0, upAt = -1, snapN = 0;
  const bones = []; u.model.traverse((o) => { if (o.isBone && /Hips|Spine2|Head|LeftHand|RightHand|LeftFoot|RightFoot/.test(o.name) && !/Index|Thumb|Middle|Ring|Pinky/.test(o.name)) bones.push(o); });
  const wp = () => bones.map((o) => o.getWorldPosition(new b.THREE.Vector3()));
  let prev = wp(), wasRag = true;
  for (let i = 0; i < 420; i++) {
    C.position.copy(P1); b.heal(); w.__adv(1); u.model.updateMatrixWorld(true);
    const now = wp(), R = u.rag;
    if (R) { const H = R.byName.Character1_Hips || R.parts[0]; far = Math.max(far, Math.hypot(H.p.x - p0.x, H.p.z - p0.z)); top = Math.max(top, H.p.y - p0.y); tRag = i / 60; hipAt = H.p.clone(); }
    if (wasRag && !R) { jump = Math.max(...now.map((v, k) => v.distanceTo(prev[k]))); wasRag = false; }
    if (Q.get('shots') && got === 1 && i % 9 === 0 && i < 216) { const q0 = C.quaternion.clone(), c0 = C.position.clone(); const m = hipAt || u.g.position; C.position.set(m.x + 4.2, p0.y + 1.3, m.z + 0.8); C.lookAt(m.x, p0.y + 0.7, m.z); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot('down_' + String(i).padStart(3, '0'), 320, 1.0); C.position.copy(c0); C.quaternion.copy(q0); }
    if (!R && upAt < 0 && !(u.st.down > 0)) upAt = i / 60;
    if (!R && u.st.down > 0) { let lo = 9; u.model.traverse((o) => { if (o.isBone && /Foot_/.test(o.name)) lo = Math.min(lo, o.getWorldPosition(new b.THREE.Vector3()).y); }); u.__footEnd = lo - (u.st.riseFloor ?? u.g.position.y); }
    if (upAt >= 0 && i === Math.round(upAt * 60) + 30) { let lo = 9; u.model.traverse((o) => { if (o.isBone && /Foot_/.test(o.name)) lo = Math.min(lo, o.getWorldPosition(new b.THREE.Vector3()).y); }); u.__footUp = lo - u.g.position.y; u.__groundUp = u.g.position.y - b.groundUnderS(u.g.position.x, u.g.position.z, u.g.position.y + 0.5); u.__state = 'clip ' + (u.cur ? u.cur.getClip().name : '-') + ' model.y ' + u.model.position.y.toFixed(2) + ' dfLift ' + (u.dfLift || 0).toFixed(2) + ' down ' + (u.st.down || 0).toFixed(2) + ' atk ' + (u.st.atk ?? 0).toFixed(2) + ' stun ' + (u.st.stun || 0).toFixed(2) + ' fade ' + (u.mixer && u.mixer._actions ? u.mixer._actions.filter((x) => x.isRunning() && x.getEffectiveWeight() > 0.01).map((x) => x.getClip().name + ':' + x.getEffectiveWeight().toFixed(2)).join(',') : ''); }
    if (!R && u.st.down > 0) { if (u.st.riseClipNow) u.__rc = u.st.riseClipNow; let lo = 9; u.model.traverse((o) => { if (o.isBone && /Head$|Head_|Hand_|Hips|Spine2|Foot_|ForeArm|Leg_/.test(o.name)) lo = Math.min(lo, o.getWorldPosition(new b.THREE.Vector3()).y); }); const fl = u.g.position.y - (u.dfLift || 0); u.__under = Math.max(u.__under || 0, fl - lo); }
    prev = now;
  }
  // (under the floor during the rise: the lowest of his big bones against the floor under him, the worst frame)
  log('   got up by', u.st.riseClipNow || u.__rc || '-', '| ankles over the floor at the end of the rise', (u.__footEnd ?? 0).toFixed(2), 'm, half a second after', (u.__footUp ?? 0).toFixed(2), 'm | his origin over the ground then', (u.__groundUp ?? 0).toFixed(2), '|', u.__state, '| lowest bone under the floor at worst', (u.__under || 0).toFixed(2), 'm');
  log('THROWN', got, '| flew', f2(far), 'm, hips up', f2(top), '| a ragdoll for', f2(tRag), 's | the frame it let go a joint jumped', f2(jump), 'm | on his feet at', upAt < 0 ? 'NEVER' : f2(upAt) + ' s', '| alive', u.st.alive, '| stands', hipAt ? f2(Math.hypot(u.g.position.x - hipAt.x, u.g.position.z - hipAt.z)) : '-', 'm from where his hips lay | y over where he stood', f2(u.g.position.y - p0.y));
  used.add(u);
}
log('DONE');
