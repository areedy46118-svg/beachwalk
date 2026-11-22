/* DOES THE ENEMY LOG COST A FRAME (2026-11-22, the owner: "does the enemy log cause lag?"): kills of a kind's first and second of
 * each, timed whole (the blow's own work and the log's), and the frame after each. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh
 * 'evalFile&f=/tools/elogcost.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
await sleep(2000);
const C = b.camera; C.position.set(6, 1.7, -400); b.camBaseY = 1.7;
const kinds = ['runt', 'hulk', 'spindle', 'elvedor'], U = {};
for (const k of kinds) U[k] = [b.makeMutant(4, -404, k, 0), b.makeMutant(8, -404, k, 0)];
for (let i = 0; i < 600 && !Object.values(U).flat().every((u) => u.model && !u.parLate); i++) { b.frame(1); await sleep(15); for (const u of Object.values(U).flat()) if (u.parLate) try { if (u.parLate()) u.parLate = null; } catch (e) {} }
for (let i = 0; i < 30; i++) { b.frame(1); await sleep(10); }
const ft = () => { const t = performance.now(); b.frame(1); return performance.now() - t; };
const base = []; for (let i = 0; i < 20; i++) base.push(ft()); base.sort((a, c) => a - c);
log('frame baseline median', base[10].toFixed(1), 'ms');
for (const k of kinds) {
  const row = [];
  for (const u of U[k]) {
    u.st.awake = true; const t = performance.now(); b.hurtMutant(u, 999, 1); const kill = performance.now() - t;
    let mx = 0, n0 = b.elogSave().length; for (let j = 0; j < 90; j++) { const f = ft(); if (f > mx) mx = f; } row.push(`kill ${kill.toFixed(1)} worst frame after ${mx.toFixed(1)} (log +${b.elogSave().length - n0})`);
    await sleep(50);
  }
  log(k, '| first:', row[0], '| second:', row[1], '| logged', JSON.stringify(b.elogSave().find((e) => e[0] === k)));
}
