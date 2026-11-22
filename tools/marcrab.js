/* THE MARIONETTE ON A CRAB THAT IS ON YOU (2026-11-22): him at your side on the open sand, a crab woken a few metres off —
 * does he go for it, do his blows land (`hurtCrab`), is it killed. Run: PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh
 * 'evalFile&f=/tools/marcrab.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, f2 = (v) => (+v).toFixed(2);
C.position.set(6, 1.7, -400); b.camBaseY = 1.7;
b.MAR.st = 'with';
for (let i = 0; i < 1500; i++) { b.frame(1); await sleep(15); const m = b.marS(); if (m.model && m.bones && m.vis && i > 30) break; }
const K = b.makeCrabUnit(6.5, -405.5, {});
for (let i = 0; i < 400 && !K.model; i++) { b.frame(1); await sleep(15); }
w.__clockOn(); b.setHp(10);
K.st.awake = true;
const hp0 = K.st.hp; let near = 99, frames = 0, leaps = 0, wasL = false; K.st.hp = 4;
for (let i = 0; i < 60 * 15; i++) {
  C.position.set(6, 1.7, -400); w.__adv(1); if (b.state().hp < 10) b.setHp(10);
  const m = b.marS(); near = Math.min(near, Math.hypot(m.at[0] - K.g.position.x, m.at[2] - K.g.position.z));
  if (b.MAR.crab === K) frames++; if (!b.MAR.leap) b.MAR.leapT = 0; if (b.MAR.leap && !wasL) leaps++; wasL = !!b.MAR.leap; if (b.MAR.leap && b.MAR.leap.air && !shot.l) { shot.l = 1; shot('mar_leap', 480, 1.6); }
  if (i === 150) shot('mar_crab', 480, 1.6);
  if (!K.st.alive) { log('crab dead at', (i / 60).toFixed(1), 's'); break; }
}
log('leaps', leaps, '| crab hp', hp0, '->', K.st.hp, '| alive', K.st.alive, '| he went for it (frames)', frames, '| nearest', f2(near), '| him', JSON.stringify(b.marS()));
