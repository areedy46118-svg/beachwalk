/* THE WATER BALL THAT DOES NOT GO (2026-11-25, the owner: "the water ball somtimes doesnt shoot fix this"). The katana with the Sea set
 * in it, on the open beach; Shift held, the heavy wound a full 1.2 s and let go, the way the keys do it — at 8 aims (down at the sand,
 * level, up, left, right), each after the cooldown, twice: did a ball leave, and how far did it get before it burst (a ball that
 * bursts in your face reads as one that never left). Also a quick one: let go at 0.8 s.
 *   PB_PORT=4241 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/seafail.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
b.settings.devMode = true; await sleep(800);
const C = b.camera;
b.addToInventory(b.katanaItem); if (b.state().equipped !== b.katanaItem.name) b.toggleEquip(b.katanaItem);
b.addToInventory(b.seaArtItem); b.attachArtifact(b.seaArtItem, b.katanaItem);
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
w.__clockOn(); w.__adv(30);
const key = (type) => w.document.dispatchEvent(new w.KeyboardEvent(type, { code: 'ShiftLeft', key: 'Shift', bubbles: true }));
const aims = [[Math.PI, -0.45], [Math.PI, -0.15], [Math.PI, 0], [Math.PI, 0.35], [Math.PI + 0.8, -0.05], [Math.PI - 0.8, -0.05], [0, -0.1], [Math.PI / 2, -0.1]];
const res = []; let fails = 0, near = 0;
for (let rep = 0; rep < 2; rep++) for (const [yaw, pitch] of aims) for (const hold of [72, 48]) {
  for (let i = 0; i < 400 && b.seaBall.cd > 0; i++) w.__adv(1);
  for (let i = 0; i < 40 && (b.winding || b.state().swinging); i++) w.__adv(1);
  w.__adv(20);
  C.position.set(6, 1.7, -60); b.camBaseY = 1.7; b.look(yaw, pitch);
  const n0 = b.seaBall.balls.length, cd0 = b.seaBall.cd;
  key('keydown');
  const ok = b.startWind();
  for (let i = 0; i < hold; i++) { b.look(yaw, pitch); w.__adv(1); }
  const wound = b.winding, oh = b.windOverhead, wt = b.windT;
  b.releaseWind(); key('keyup');
  const fired = b.seaBall.balls.length > n0 || b.seaBall.cd > cd0 + 1;
  let life = 0, from = null, to = null;
  if (fired && b.seaBall.balls.length > n0) {
    const B = b.seaBall.balls[b.seaBall.balls.length - 1]; from = B.m.position.clone();
    for (; life < 120 && b.seaBall.balls.includes(B); life++) { to = B.m.position.clone(); w.__adv(1); }
  }
  const dist = from && to ? from.distanceTo(to) : 0;
  if (!fired) fails++; else if (dist < 2) near++;
  res.push(`${yaw.toFixed(1)}/${pitch} hold ${hold}: start ${ok} wound ${wound} overhead ${oh} windT ${(+wt).toFixed(2)} -> ${fired ? 'FIRED, ' + dist.toFixed(1) + ' m in ' + life + ' f' : 'NOT FIRED (cd ' + cd0.toFixed(1) + ')'}`);
}
// (and the two that used to say nothing: a quicker heavy, and one let go while it is coming back)
{ for (let i = 0; i < 400 && b.seaBall.cd > 0; i++) w.__adv(1); w.__adv(20);
  C.position.set(6, 1.7, -60); b.look(Math.PI, 0);
  const n0 = b.seaBall.balls.length; key('keydown'); b.startWind(); for (let i = 0; i < 34; i++) w.__adv(1); const wt = b.windT; b.releaseWind(); key('keyup');
  res.push(`quick heavy, windT ${(+wt).toFixed(2)}: ${b.seaBall.balls.length > n0 ? 'FIRED' : 'NOT FIRED'}`);
  for (let i = 0; i < 60 && (b.winding || b.state().swinging); i++) w.__adv(1); w.__adv(20);
  const n1 = b.seaBall.balls.length, cd1 = b.seaBall.cd; let err = null;
  try { key('keydown'); b.startWind(); for (let i = 0; i < 72; i++) w.__adv(1); b.releaseWind(); key('keyup'); } catch (e) { err = e.message; }
  res.push(`while coming back (cd ${cd1.toFixed(1)}): ${b.seaBall.balls.length > n1 ? 'FIRED (wrong)' : 'not fired, the dry tell'}${err ? ' ERROR ' + err : ''}`); }
for (const r of res) log(r);
log('throws', res.length, '| not fired', fails, '| burst within 2 m', near);
log('DONE');
