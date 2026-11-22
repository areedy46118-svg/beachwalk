/* ENEMIES TURN ON THE MARIONETTE (2026-11-22): him with you and three of Elvédor's kind awake on you; his blows (`hurtMutant` from
 * him) — how many turn on him, how many stay yours, and do they come back? Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh
 * 'evalFile&f=/tools/maraggro.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
await sleep(1500);
const C = b.camera; C.position.set(6, 1.7, -400); b.camBaseY = 1.7;
b.setCelWash(2); b.marRestore('with');
for (let i = 0; i < 300 && !(b.MAR.u && b.MAR.u.model && !b.MAR.u.marPend); i++) { b.frame(1); await sleep(30); }
const M = b.MAR.u;
const E = [0, 1, 2, 3].map((i) => b.makeMutant(5 + i * 1.2, -405, 'runt', 0));
for (let i = 0; i < 400 && !E.every((e) => e.model && !e.parLate); i++) { b.frame(1); await sleep(15); for (const e of E) if (e.parLate) try { if (e.parLate()) e.parLate = null; } catch (er) {} }
for (const e of E) { e.st.awake = true; e.st.hp = 99; }
const tally = () => ({ onHim: E.filter((e) => e.st.foe === M).length, onYou: E.filter((e) => e.st.alive && !e.st.foe).length });
for (let k = 0; k < 6; k++) { for (const e of E) b.hurtMutant(e, 0.01, 0, M); b.frame(1); await sleep(20); }
log('after his blows', JSON.stringify(tally()));
w.__clockOn(); for (let s2 = 0; s2 < 12; s2++) { w.__adv(60); await sleep(30); if (s2 % 2) log('t+', s2 + 1, 's', JSON.stringify(tally()), 'marHp', M.st.hp, 'yourHp', b.hpS()); }
const one = E.find((e) => e.st.foe === M); if (one) { b.hurtMutant(one, 0.01, 0, null); log('you hit one on him: still on him?', one.st.foe === M); }
