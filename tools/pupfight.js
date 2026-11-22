/* THE PUPPET WORKSHOP (2026-11-21): the eight made and hung, the workshop in stills, the injection (stills of the syringe in
 * him and his eyes), the fight with the first (how near he gets, whether his blows land), his death (the ragdoll's flight),
 * the rest coming down, all of them killed, and the washer starting after.
 * Run: PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/pupfight.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z, f2 = (v) => (+v).toFixed(2);
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
log('made:', JSON.stringify(b.cpS()));
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
log('in:', JSON.stringify(b.cpS()));
w.__clockOn();
const U0 = () => b.cpUnitsS();
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z;
const snap = (nm, px, py, pz, tx, ty, tz, fov = 62, g = 1.6) => { const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = fov; C.updateProjectionMatrix(); C.position.set(X + px, Y + py, Z + pz); C.lookAt(X + tx, Y + ty, Z + tz); C.updateMatrixWorld(true); shot(nm, 560, g); C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q); };
let at0 = null;
// (placed once — teleported every frame the walk read the feet off the ceiling's storey and every blow was 'too high' — then only turned)
const stand = (lx, lz, tx, tz) => { if (!at0 || at0[0] !== lx || at0[1] !== lz) { at0 = [lx, lz]; C.position.set(X + lx, Y + 1.7, Z + lz); b.camBaseY = C.position.y; b.setCelLast && b.setCelLast(X + lx, Z + lz, Y); } b.lookAt(X + tx, Y + 1.0, Z + tz); };
for (let i = 0; i < 10; i++) { stand(-1.6, -0.6, 1, 1); w.__adv(1); }
{ let tw = 0, last = b.cpAtmo().twitchT; for (let i = 0; i < 60 * 20; i++) { w.__adv(1); const a = b.cpAtmo().twitchT; if (a > last + 1) tw++; last = a; } log('twitches in 20 s before the fight', tw); }
snap('ws_a', -2.0, 1.6, -1.2, 1.5, 1.1, 1.2, 70);
snap('ws_b', 3.3, 1.6, 2.0, 0.0, 1.0, -0.4, 70);
snap('ws_c', 0.0, 1.5, -1.3, 3.4, 1.1, 0.6, 70);
snap('ws_d', -2.0, 1.2, -1.4, 2.2, 1.4, 1.3, 75);
// hung: walk into the Host (the one in the middle) and see him swing
{ const H = U0().find((u) => u.cpH && u.cpH.who === 'host'), S = H.cpSw; const c0 = H.g.position.clone();
  let mx = 0; for (let i = 0; i < 50; i++) { const k = i / 50; C.position.set(X + 0.55 - 1.0 + k * 1.3, Y + 1.7, Z + 0.15); b.camBaseY = C.position.y; w.__adv(1); mx = Math.max(mx, H.g.position.distanceTo(c0)); }
  for (let i = 0; i < 40; i++) { w.__adv(1); mx = Math.max(mx, H.g.position.distanceTo(c0)); }
  log('host shoved: moved up to', f2(mx), 'm | swing', f2(S.s.x), f2(S.s.y), '| L', f2(S.L), '| loose limbs', S.loose.length);
  snap('ws_shove', -1.2, 1.5, -1.3, 0.55, 1.0, 0.15, 70); at0 = null; }
// the two upside down
snap('ws_flip', 0.4, 1.4, 0.0, 1.0, 1.5, 1.4, 70);
// the injection: by the bench, a jar in hand
b.gainJar(1);
for (let i = 0; i < 6; i++) { stand(-0.4, 1.3, -0.4, 2.3); w.__adv(1); }
b.cpInject();
const it = [[0.5, 'inj_in'], [1.3, 'inj_push'], [2.3, 'inj_eyes'], [3.9, 'inj_up'], [4.8, 'inj_land']];
let t = 0, k = 0;
for (let i = 0; i < 60 * 6; i++) { stand(-0.4, 1.0, -0.4, 2.3); w.__adv(1); t += 1 / 60; if (k < it.length && t >= it[k][0]) { snap(it[k][1], 0.3, 1.45, 1.35, -0.45, 0.85, 2.3, 50, 1.7); log('  inject t', t.toFixed(1), JSON.stringify(b.cpAtmo())); k++; } }
log('after the injection:', JSON.stringify(b.cpS()));
// the fight with the first: stand still and let him come (dev mode: hits land on 1 hp)
const U = b.cpUnitsS(), first = U.find((u) => u.cpBench);
b.settings.devMode = false;   // (in dev mode nothing ever starts a swing: `!settings.devMode` in the decision)
let near = 9, hits = 0; const hp0 = b.state().hp;
const dmg0 = b.state().hp;
b.setHp(4); for (let i = 0; i < 60 * 8; i++) { stand(-0.8, -0.2, first.g.position.x - X, first.g.position.z - Z); w.__adv(1); near = Math.min(near, Math.hypot(first.g.position.x - C.position.x, first.g.position.z - C.position.z)); if (b.state().hp < 4) { hits++; b.setHp(4); } }
log('swings so far', JSON.stringify(b.celClampTest)); log('first: awake', first.st.awake, '| nearest', f2(near), '| blows that landed', hits, '| his swing', first.st.atk, '| player hp', b.state().hp, 'of', dmg0, '| clip', first.cur && first.cur.getClip().name);
snap('fight_first', -0.8 - 0.2, 1.6, -0.2 - 0.9, first.g.position.x - X, 0.5, first.g.position.z - Z, 60, 1.6);
// smacked: he flies; then killed: he breaks
const p0 = first.g.position.clone();
b.hurtMutant(first, 1, 0.6); let maxD = 0, topY = 0, airF = 0;
for (let i = 0; i < 150; i++) { w.__adv(1); maxD = Math.max(maxD, Math.hypot(first.g.position.x - p0.x, first.g.position.z - p0.z)); topY = Math.max(topY, first.g.position.y - Y); if (first.cpAir) airF++; if (i === 10) snap('fly', -1.8, 1.4, -1.3, p0.x - X, 0.6, p0.z - Z, 75, 1.7); }
log('smacked: thrown', f2(maxD), 'm, up to', f2(topY), 'm, in the air/lying', airF, 'frames | back up', !first.cpAir, '| hp', first.st.hp);
const g0 = b.cpGibs();
for (let k = 0; k < 12 && first.st.alive; k++) { b.hurtMutant(first, 1, 0.9); for (let i = 0; i < 5; i++) w.__adv(1); }
for (let i = 0; i < 90; i++) { w.__adv(1); if (i === 8) snap('break', -1.8, 1.4, -1.3, first.g.position.x - X, 0.5, first.g.position.z - Z, 75, 1.7); }
log('broken: pieces', b.cpGibs() - g0);
log('first dead:', !first.st.alive, '| fight', b.cpS().fight, '| right after:', JSON.stringify(b.cpAtmo()));
for (let i = 0; i < 60 * 2.5; i++) { stand(-0.8, -0.2, 1, 1); w.__adv(1); if (i === 50) { snap('drop', -1.8, 1.6, -1.3, 1.5, 0.9, 1.0, 72, 1.7); log('  in the drop', JSON.stringify(b.cpAtmo())); } if (i === 149) log('  after the drop', JSON.stringify(b.cpAtmo()), '| standing', b.cpUnitsS().filter((u) => u.st.alive && !u.cpFall && !u.cpHung).length); }
log('the rest:', JSON.stringify(b.cpS()));
for (let i = 0; i < 60 * 4; i++) { stand(-0.8, -0.2, 1, 1); w.__adv(1); if (i === 120) snap('chaos', -2.0, 1.7, -1.4, 0.8, 0.5, 0.8, 75, 1.7); }
let hits2 = 0, leapsSeen = 0, wasL = new Set(); b.setHp(4);
for (let i = 0; i < 60 * 3; i++) { stand(-0.8, -0.2, 1, 1); w.__adv(1); if (b.state().hp < 4) { hits2++; b.setHp(4); } for (const u of U) { if (u.cpLeap && !wasL.has(u)) { leapsSeen++; wasL.add(u); } if (!u.cpLeap) wasL.delete(u); } }
log('cpDrive', JSON.stringify(b.CPD), '| puppet steps heard', b.sampleLogS().filter((n) => n === 'pupStep').length, 'of the last', b.sampleLogS().length); log('the seven on you for 3 s: pounces', leapsSeen, '| blows landed', hits2, '| swings', JSON.stringify(b.celClampTest));
const ds = U.filter((u) => u.st.alive).map((u) => f2(Math.hypot(u.g.position.x - C.position.x, u.g.position.z - C.position.z)));
{ const off = U.filter((u) => u.st.alive && !b.celFloorAtS(u.g.position.x, u.g.position.z, Y + 0.35)).length; log('off the floor now', off, '| rescued so far', b.CPD.rescue || 0); }
log('alive, distances to you:', ds.join(' '), '| bearings round you (deg):', U.filter((u) => u.st.alive).map((u) => Math.round(Math.atan2(u.g.position.z - C.position.z, u.g.position.x - C.position.x) * 180 / Math.PI)).sort((a, b2) => a - b2).join(' '), '| player hp', b.state().hp);
// thrown at the walls, all of them, hard, every way: is any of them ever off the room's floor
{ let out = 0, n = 0; const live = U.filter((u) => u.st.alive);
  live.forEach((u, i) => { const a = i * 2.4; u.st.hp = 99; b.cpLaunchS(u, Math.cos(a), Math.sin(a), 11, 4); });
  for (let i = 0; i < 150; i++) { w.__adv(1); for (const u of live) if (u.cpAir) { n++; const c = u.cpAir.C; if (!b.celFloorAtS(c.x, c.z, Y + 0.35)) out++; } if (i === 20) snap('walls_thrown', -2.0, 1.7, -1.4, 0.8, 0.8, 0.8, 80, 1.7); }
  log('thrown at the walls: body-frames', n, '| off the floor', out); for (const u of live) u.st.hp = 5; }
// all of them
for (let k = 0; k < 9; k++) { for (const u of U) if (u.st.alive) b.hurtMutant(u, 1, 0.9); for (let i = 0; i < 6; i++) w.__adv(1); }
for (let i = 0; i < 60 * 5; i++) { stand(-0.8, -0.2, 1, 1); w.__adv(1); }
snap('after', -2.0, 1.7, -1.4, 0.8, 0.3, 0.8, 75, 1.7);
{ const P = b.cpPiecesS(); let off = 0, far = []; for (const G of P) { const p = G.m.position; if (b.celFloorAtS(p.x, p.z, p.y + 0.2)) continue; off++;
    let best = 9; for (let r = 0.05; r <= 0.6 && best > 8; r += 0.05) for (let a = 0; a < 6.28; a += 0.4) if (b.celFloorAtS(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r, p.y + 0.2)) { best = r; break; }
    far.push(best.toFixed(2) + '@' + (p.x - X).toFixed(2) + ',' + (p.y - Y).toFixed(2) + ',' + (p.z - Z).toFixed(2)); }
  log('pieces', P.length, '| off the floor', off, '| how far from a floor:', far.join(' ')); }
log('all dead:', JSON.stringify(b.cpS()), '| washer', JSON.stringify(b.celWashS()));
