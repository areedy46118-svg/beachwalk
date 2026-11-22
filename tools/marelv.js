/* THE MARIONETTE AND ELVÉDOR (2026-11-21): at your side, Elvédor in sight — he goes for him, the man turns on him; the man
 * killed by him with the puppet in your arms, and the line it opens ("What should I do with the puppet?" → "Throw it in the
 * fire"). And the sea from Elvédor's land and inside his house. Run: PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh
 * 'evalFile&f=/tools/marelv.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, C = b.camera, f2 = (v) => (+v).toFixed(2);
C.position.set(8, 1.7, b.HOUSE_Z + 30); b.camBaseY = 1.7;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const M = b.elvManS(); if (M && M.u && M.u.model && M.u.mixer && i > 60) break; }
const E = b.elvManS().u;
log('Elvédor at', f2(E.g.position.x), f2(E.g.position.y), f2(E.g.position.z), '| awake', E.st.awake, '| hp', E.st.hp);
C.position.set(E.g.position.x + 1.5, E.g.position.y + 1.7, E.g.position.z + 9); b.camBaseY = C.position.y; b.lookAt(E.g.position.x, E.g.position.y + 1, E.g.position.z);
b.MAR.st = 'with';
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); const m = b.marS(); if (m.model && m.bones && i > 30) break; }
log('him:', JSON.stringify(b.marS()));
w.__clockOn();
b.setHp(10); b.setElvCarrying(true);
let on = -1, hitsOnYou = 0, foeYou = 0, wokeAt = -1;
for (let i = 0; i < 60 * 40; i++) {
  C.position.set(E.g.position.x + 1.5, C.position.y, E.g.position.z + 9); w.__adv(1); if (b.state().hp < 10) { hitsOnYou++; b.setHp(10); }
  if (E.st.awake && wokeAt < 0) { wokeAt = i; log('Elvédor wakes at frame', i, '| hit by the marionette', E.st.hitBy === b.MAR.u); }
  if (E.st.awake && E.st.alive && E.st.foe !== b.MAR.u) foeYou++;
  if (on < 0 && b.MAR.elvOn) { on = i; log('he goes for him at frame', i, '| Elvédor awake', E.st.awake, '| his foe is the marionette', E.st.foe === b.MAR.u); }
  if (i === 300) shot('elv_fight', 480, 1.6);
  if (!E.st.alive || !b.MAR.u.st.alive) break;
}
log('blows on you in the fight', hitsOnYou, '| frames Elvédor was on you', foeYou);
log('after: Elvédor alive', E.st.alive, 'hp', E.st.hp, '| killed by him', E.st.hitBy === b.MAR.u, '| marionette', JSON.stringify(b.marS()), '| ask', b.MAR.pupAsk);
for (let i = 0; i < 30; i++) w.__adv(1);
log('ask now:', b.MAR.pupAsk, '| the puppet came alive:', !!b.EPUP.u, '| carrying', JSON.stringify(b.pupDropS ? b.pupDropS() : {}));
if (b.EPUP.u) { const P = b.EPUP.u; for (let i = 0; i < 300 && !P.model; i++) { b.frame(1); await sleep(15); } for (let i = 0; i < 200 && P.parLate; i++) { b.frame(1); await sleep(15); }
  b.MAR.u.st.hp = 18; const mh = b.MAR.u.st.hp; let on = 0;
  for (let i = 0; i < 60 * 20; i++) { w.__adv(1); if (P.st.foe === b.MAR.u) on++; if (i === 90) shot('epup_fight', 480, 1.8); if (!P.st.alive || !b.MAR.u.st.alive) break; if (b.state().hp < 10) b.setHp(10); }
  log('puppet vs marionette: puppet alive', P.st.alive, 'hp', P.st.hp, '| on him (frames)', on, '| marionette hp', mh, '->', b.MAR.u.st.hp, b.MAR.u.st.alive); }
if (b.MAR.pupAsk) {
  b.marTalk(); for (let i = 0; i < 90; i++) { w.__adv(1); await sleep(5); }
  const btn = w.document.querySelector('.choice'); log('choice:', btn && btn.textContent);
  if (btn) btn.click(); await sleep(300); for (let i = 0; i < 120; i++) { w.__adv(1); await sleep(5); }
  log('his answer:', w.document.querySelector('#dialog') ? w.document.querySelector('#dialog').textContent.replace(/\s+/g, ' ').slice(0, 120) : '?');
}
// the sea: the beach, the lot, the porch, inside
b.elvLandSet(true);
const at = (x, y, z) => { C.position.set(x, y, z); b.camBaseY = y; w.__adv(2); return JSON.stringify(b.elvSeaS()); };
log('sea at the gully mouth:', at(b.HOUSE_X - 20, b.HOUSE_Y + 1.7, b.HOUSE_Z + 10));
log('sea in the lot:', at(b.HOUSE_X - 7, b.HOUSE_Y + 1.7, b.HOUSE_Z));
log('sea in the house:', at(b.HOUSE_X, b.HOUSE_Y + 1.8, b.HOUSE_Z));
log('sea upstairs:', at(b.HOUSE_X + 1, b.HOUSE_Y + 5.8, b.HOUSE_Z + 2));
