/* A FARMER PUT DOWN AND GETTING UP: DOES HE FLOAT? (2026-11-26, the owner: "after that their bodies still float as they stand up fix
 * this"). The first castle; `&n=` men each knocked down (`mutKnockdown`, the poise-break / kick knockdown's clip), and through the
 * fall, the lie and the rise and a second after: the lowest ankle over the floor under him, the worst and at the end; his origin
 * over the ground.
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/knockrise.js&n=4' <out> */
const Q = new URLSearchParams(location.search), N = +(Q.get('n') || 4);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn(); b.settings.devMode = true;
const units = () => b.farmUnitsS(), V = new b.THREE.Vector3();
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
const rows = [];
for (const u of units().filter((x) => x.st.alive && x.model && x.g.visible && x.farm && x.farm.out).slice(0, N)) {
  const ank = () => { let lo = 9; u.model.updateMatrixWorld(true); u.model.traverse((o) => { if (o.isBone && /Foot_/.test(o.name)) lo = Math.min(lo, o.getWorldPosition(V).y); }); return lo; };
  const gnd = () => b.groundUnderS(u.g.position.x, u.g.position.z, u.g.position.y + 0.6);
  b.mutKnockdown(u);
  let worstRise = -9, last = 0, endOrigin = 0, t = 0;
  for (let f = 0; f < 360; f++) { w.__adv(1); t = f / 60;
    const a = ank() - gnd();
    if (u.st.down > 0 && (u.st.down < 1.2)) worstRise = Math.max(worstRise, a);   // (the rise: the last stretch of the knockdown)
    if (!(u.st.down > 0)) { last = a; endOrigin = u.g.position.y - gnd(); } }
  rows.push(`${u.kindName}: ankles over the floor in the rise at worst ${worstRise.toFixed(2)} m, a second after ${last.toFixed(2)} m, origin over the ground ${endOrigin.toFixed(2)} m`);
}
log(rows.join('\n  '));
log('DONE');
