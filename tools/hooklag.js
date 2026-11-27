/* THE HOOK'S LAG (2026-11-25, the owner: "the hook also lags the game when throw"). Real time per frame (the probe page's
 * own clock; the game's is fake) with no ball, then the frames a thrown ball flies — the first throw of the game and a later one —
 * on the beach (&at=beach) or in the first castle's street (&at=fort). Also the cost of one `worldDrawnHit` down the throw.
 *   PB_PORT=4241 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/hooklag.js&at=fort' <out> */
const Q = new URLSearchParams(location.search), AT = Q.get('at') || 'beach';
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js');
if (AT === 'fort') { await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot())); }
else { for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); } for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100); }
b.settings.devMode = true; await sleep(500);
const C = b.camera;
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
for (let i = 0; i < 60; i++) { b.frame(1); await sleep(20); }
w.__clockOn(); w.__adv(30);
if (AT === 'beach') { C.position.set(6, 1.7, -60); b.camBaseY = 1.7; }
const P0 = C.position.clone(), yaw = AT === 'beach' ? Math.PI : 0;
const timeFrames = (n, fn) => { const t = []; for (let i = 0; i < n; i++) { if (fn) fn(i); const a = performance.now(); w.__adv(1); t.push(performance.now() - a); } t.sort((x, y) => x - y); return { med: t[t.length >> 1], max: t[t.length - 1], mean: t.reduce((s, x) => s + x, 0) / t.length }; };
const f2 = (o) => `median ${o.med.toFixed(1)} mean ${o.mean.toFixed(1)} worst ${o.max.toFixed(1)} ms`;
const hold = () => { C.position.copy(P0); b.look(yaw, 0); };
log('no ball:', f2(timeFrames(60, hold)));
for (const nm of ['first throw', 'second throw', 'third throw']) {
  for (let i = 0; i < 200 && b.HK && b.HK.st !== 'idle'; i++) w.__adv(1); w.__adv(10); hold();
  const a = performance.now(); b.hookThrow(1); const fire = performance.now() - a;
  const R = b.renderer, r0 = R.render.bind(R); let rT = 0; R.render = (...a2) => { const t1 = performance.now(); r0(...a2); rT += performance.now() - t1; };
  const fl = []; for (let i = 0; i < 45; i++) { hold(); rT = 0; const pg = R.info.programs ? R.info.programs.length : -1, tx = R.info.memory.textures, ge = R.info.memory.geometries; const t0 = performance.now(); w.__adv(1); const dt0 = performance.now() - t0;
    fl.push([dt0, (b.HK ? b.HK.st : '?') + ' draw ' + rT.toFixed(0) + ' new progs ' + ((R.info.programs ? R.info.programs.length : -1) - pg) + ' tex ' + (R.info.memory.textures - tx) + ' geo ' + (R.info.memory.geometries - ge)]); }
  R.render = r0;
  const srt = fl.map((x) => x[0]).sort((x, y) => x - y);
  log(nm + ': the throw call', fire.toFixed(1), 'ms | flying: median', srt[srt.length >> 1].toFixed(1), 'worst', srt[srt.length - 1].toFixed(1), 'ms | worst frames', fl.map((x, i) => [i, x[0], x[1]]).filter((x) => x[1] > 12).map((x) => x[0] + ':' + x[1].toFixed(0) + 'ms(' + x[2] + ')').join(' '));
  for (let i = 0; i < 120; i++) w.__adv(1);
}
{ const D = new b.THREE.Vector3(); C.getWorldDirection(D); const a = performance.now(); for (let i = 0; i < 10; i++) b.worldDrawnHitS ? b.worldDrawnHitS(C.position, D, 1.0, 0) : null; log('one worldDrawnHit (1 m reach):', b.worldDrawnHitS ? ((performance.now() - a) / 10).toFixed(2) + ' ms' : 'not exported'); }
log('DONE');
// (which meshes cost it: one ray down the throw against each mesh alone, the worst ten, with their triangle counts and whether it skips them after)
{
  const T = b.THREE, rc = new T.Raycaster(), D = new T.Vector3(); C.getWorldDirection(D); rc.set(C.position, D); rc.far = 1.0;
  const cost = [];
  b.scene.traverse((o) => { if (!o.isMesh || !o.geometry) return; const a = performance.now(); for (let k = 0; k < 3; k++) rc.intersectObject(o, false); const ms = (performance.now() - a) / 3; if (ms > 0.15) { const g = o.geometry, n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; let nm = o.name || o.type, p = o.parent; for (let k = 0; k < 2 && p; k++, p = p.parent) nm = (p.name || '?') + '/' + nm; cost.push([ms, nm, n | 0, o.visible, !!(o.material && o.material.isShaderMaterial)]); } });
  cost.sort((a, b2) => b2[0] - a[0]); let tot = 0; for (const c of cost) tot += c[0];
  log('meshes costing > 0.15 ms each:', cost.length, 'together', tot.toFixed(1), 'ms');
  for (const c of cost.slice(0, 12)) log('  ', c[0].toFixed(2), 'ms', c[1], c[2], 'tris', c[3] ? 'shown' : 'hidden', c[4] ? 'shader' : '');
}
log('DONE2');
