/* THE MARIONETTE ON THE SWING, AND AT YOUR SIDE (2026-11-21): out of the washer he is on the swing in front of Elvédor's house,
 * facing you, pumping it high (stills across a swing); the walk up (bars); the talk and his hop off; following you; a fight
 * with one of Elvédor's kind beside you; and his death, in pieces.
 * Run: PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/marswing.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z, f2 = (v) => (+v).toFixed(2);
b.elvLandSet(true); C.position.set(HX - 8, HY + 1.9, HZ - 4); b.camBaseY = C.position.y;
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); if (b.elvSwingS() && i > 60) break; }
b.MAR.st = 'swing';
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); const m = b.marS(); if (m.model && m.bones && m.vis && i > 30) break; }
log('on the swing:', JSON.stringify(b.marS()));
w.__clockOn();
const S = b.elvSwingS(), gp = S.g.getWorldPosition(new T.Vector3()), ax = new T.Vector3(1, 0, 0).applyQuaternion(S.g.getWorldQuaternion(new T.Quaternion())).setY(0).normalize();
const fl = gp.y - S.L - 0.55;
// stand in front of him, 7 m off along his way
const side = (C.position.x - gp.x) * ax.x + (C.position.z - gp.z) * ax.z >= 0 ? 1 : -1;
const stand = (d, h = 1.7) => { C.position.set(gp.x + ax.x * side * d, fl + h, gp.z + ax.z * side * d); b.camBaseY = C.position.y; b.lookAt(gp.x, fl + 0.9, gp.z); };
const snap = (nm, px, py, pz, tx, ty, tz, fov = 55, g = 1.6) => { const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = fov; C.updateProjectionMatrix(); C.position.set(px, py, pz); C.lookAt(tx, ty, tz); C.updateMatrixWorld(true); for (const u of b.mutants || []) if (u.model) u.model.visible = true; if (b.MAR.u && b.MAR.u.model) b.MAR.u.model.visible = true; shot(nm, 480, g); C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q); };
for (let i = 0; i < 60; i++) { stand(20); w.__adv(1); }
for (let i = 0; i < 30; i++) { stand(6); w.__adv(1); }
log('facing', b.MAR.face, '| side', side, '| amp', f2(S.amp));
for (let k = 0; k < 6; k++) { for (let i = 0; i < 39; i++) { stand(6); w.__adv(1); } const p = new T.Vector3(gp.x + ax.x * side * 2.8, fl + 1.2, gp.z + ax.z * side * 2.8); snap('swing_' + k, p.x, p.y, p.z, gp.x, fl + 0.85, gp.z, 50, 1.8); }
{ const n = new T.Vector3(-ax.z, 0, ax.x); snap('swing_side', gp.x + n.x * 4, fl + 1.2, gp.z + n.z * 4, gp.x, fl + 1.0, gp.z, 55, 1.8); }
for (let i = 0; i < 40; i++) { stand(3.0); w.__adv(1); }
log('walked up: cine', b.marS().cine, '| amp', f2(S.amp));
// the talk: his line, then your answer, then off the swing
b.marTalk();
for (let i = 0; i < 120; i++) { w.__adv(1); await sleep(5); }
const btn = w.document.querySelector('#dialog .choice, .choice');
log('talking:', !!btn, btn ? btn.textContent : '');
if (btn) btn.click(); else b.marHopOff();
await sleep(400);
for (let i = 0; i < 150; i++) { stand(3.0); w.__adv(1); if (i === 18) snap('hop_a', C.position.x, C.position.y, C.position.z, gp.x, fl + 0.6, gp.z, 60, 1.8); if (i === 40) snap('hop_b', C.position.x, C.position.y, C.position.z, gp.x, fl + 0.6, gp.z, 60, 1.8); }
log('after the hop:', JSON.stringify(b.marS()));
// following: walk off 9 m along the swing's line and wait
const away = (d) => { C.position.set(gp.x + ax.x * side * d, fl + 1.7, gp.z + ax.z * side * d); b.camBaseY = C.position.y; };
let dMin = 99;
for (let i = 0; i < 60 * 6; i++) { away(3 + Math.min(9, i / 20)); w.__adv(1); }
{ const m = b.marS(); log('following: him at', JSON.stringify(m.at), '| from you', f2(Math.hypot(m.at[0] - C.position.x, m.at[2] - C.position.z)), '| clip', m.clip); }
snap('follow', C.position.x + ax.x * side * 2, C.position.y, C.position.z + ax.z * side * 2, b.MAR.u.g.position.x, b.MAR.u.g.position.y + 0.6, b.MAR.u.g.position.z, 60, 1.8);
// a fight: one of Elvédor's kind, awake, a few metres off
b.settings.devMode = false;
const ex = C.position.x - ax.x * side * 4, ez = C.position.z - ax.z * side * 4;
const E = b.makeMutant(ex, ez, 'elvedor', fl);
for (let i = 0; i < 300 && !(E.model && E.mixer); i++) { b.frame(1); await sleep(15); }
for (let i = 0; i < 200 && E.parLate; i++) { b.frame(1); await sleep(15); }
E.st.awake = true; E.st.roar = 0; E.st.cool = 0.5;
const ehp0 = E.st.hp, mhp0 = b.MAR.u.st.hp; b.setHp(10);
let onHim = 0, leapF = 0, idleF = 0, fightF = 0;
for (let i = 0; i < 60 * 12; i++) { away(3 + 9); w.__adv(1); if (E.st.foe === b.MAR.u) onHim++; if (b.MAR.leap) leapF++; if (E.st.alive) { fightF++; const m = b.marS(); if (m.clip === 'mHIdle' && !b.MAR.leap) idleF++; } if (b.state().hp < 10) b.setHp(10); if (i === 200) snap('fight', C.position.x, C.position.y + 0.3, C.position.z, E.g.position.x, E.g.position.y + 0.8, E.g.position.z, 60, 1.8); if (!E.st.alive) break; }
log('fight: enemy hp', ehp0, '->', E.st.hp, 'alive', E.st.alive, '| his hp', mhp0, '->', b.MAR.u.st.hp, '| enemy on him (frames)', onHim, '| leaping (frames)', leapF, '| idle while it lived', idleF, 'of', fightF, '| his foe', JSON.stringify(b.marS()));
// his death
const g0 = b.cpGibs(), mp = b.MAR.u.g.position.clone();
b.MAR.u.st.hp = 1; b.hurtMutant(b.MAR.u, 5, 1, E);
if (b.MAR.u.st.alive) { b.MAR.u.st.hp = 0; b.killMutant && b.killMutant(b.MAR.u); }
for (let i = 0; i < 40; i++) { w.__adv(1); if (i === 4 || i === 12 || i === 24) snap('death_' + i, mp.x + 1.6, mp.y + 1.3, mp.z + 1.6, mp.x, mp.y + 0.4, mp.z, 70, 1.8); }
log('dead:', JSON.stringify(b.marS()), '| pieces', b.cpGibs() - g0);
for (let i = 0; i < 90; i++) w.__adv(1);
snap('death_after', mp.x + 1.8, mp.y + 2.4, mp.z + 1.8, mp.x, mp.y, mp.z, 75, 1.8);
for (const g of b.gibsS ? [] : []) {}
