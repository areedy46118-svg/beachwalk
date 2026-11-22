/* THE WELL MAN AFTER HIS CHECKPOINT (2026-11-22, the owner: "the well guy checkpoint is bugged he doesnt hit me now and it says to
 * look inside the well still once hes up"): staged as a load stages it (`wellReveal(true)`), then left to come — his swings, his
 * blows that land, the prompt in front of the well. Run: PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/wellfight.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 400 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera;
C.position.set(b.WELL_X + 6, 1.7, b.WELL_Z); b.camBaseY = 1.7;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const u = b.wellU(); if (u && u.model && u.mixer && i > 60) break; }
const U = b.wellU(); log('the well man:', !!U, U && !!U.model);
b.setWellPhase(2); b.wellReveal(true);
w.__clockOn();
b.setHp(4); const H0 = b.state().hp; let hurt = 0, swings = 0, wasAtk = false, clinch = 0, minD = 99;
for (let i = 0; i < 60 * 20; i++) {
  w.__adv(1);
  if (b.state().hp < H0) { hurt++; b.setHp(4); }
  const a = U.st.atk >= 0; if (a && !wasAtk) swings++; wasAtk = a;
  minD = Math.min(minD, Math.hypot(U.g.position.x - C.position.x, U.g.position.z - C.position.z));
  if (i === 60 * 3) log('at 3 s: stare', JSON.stringify(b.wellStalkS ? b.wellStalkS() : {}), '| awake', U.st.awake, '| hold', U.holdAnim, '| cine', b.wellStalkS && b.wellStalkS().cine);
}
log('20 s: swings', swings, '| hits on you', hurt, '| nearest', minD.toFixed(2), '| awake', U.st.awake, '| hold', U.holdAnim, '| atk', U.st.atk, '| alive', U.st.alive, '| prompt', b.hoveredS ? b.hoveredS() : '?');
