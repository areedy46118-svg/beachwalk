/* THE TWO FARMERS AT THE PAVILION'S GATE (2026-11-26, the owner: "put two farmers outside the pavillion at the gate mad pacing
 * around and they say "Is this your place?" …"). &look=1: where the gate is (its pivot in the world, the yard's wall), the
 * farmer kinds there are, and stills of the gate from the sand in front of it.
 *   PB_PORT=4252 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/gatefarm.js&look=1' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const Q = new URLSearchParams(w.parent.location.search), T = b.THREE, C = b.camera;
if (Q.get('look')) {
  const G = b.mushHouse && b.mushHouse.gate, pv = new T.Vector3();
  if (G && G.pivot) { G.pivot.updateMatrixWorld(true); G.pivot.getWorldPosition(pv); }
  log('MUSH', b.MUSH_X, b.MUSH_Z, '| gate pivot', pv.x.toFixed(2), pv.y.toFixed(2), pv.z.toFixed(2), '| gate fields', G ? JSON.stringify(Object.keys(G)) : '-', '| x', G && G.x, 'z', G && G.z, 'shut', G && G.shut, 'open', G && G.open);
  const K = b.MUT_KINDS, fk = Object.keys(K).filter((k) => /^farmer\d+$/.test(k));
  log('farmer kinds', fk.length, fk.map((k) => k + ':' + (K[k].tool || '-') + ':' + (K[k].file || '').split('/').pop()).join(' '));
  b.settings.devMode = true; w.__clockOn();
  for (const [nm, dx, dz, yaw, pitch] of [['front', -9, 0, -Math.PI / 2, -0.05], ['front2', -6, 4, -2.2, -0.05], ['side', -4, -10, Math.PI, -0.1]]) {
    for (let i = 0; i < 6; i++) { C.position.set(pv.x + dx, 1.7, pv.z + dz); b.camBaseY = 1.7; b.look(yaw, pitch); w.__adv(1); }
    b.updateFarProps && b.updateFarProps(); C.updateMatrixWorld(true); shot('gate_' + nm, 640, 1.4);
  }
}
if (Q.get('fight')) {
  // walk down to them from 40 m up the beach, watching them pace; then the question, 'No', the fight, both killed, the jars
  b.settings.devMode = true; for (let i = 0; i < 300 && !b.state().introDone; i++) { try { b.skipTakes && b.skipTakes(); } catch (e) {} b.introDone = true; b.frame(2); await sleep(20); } log('introDone', b.state().introDone); w.__clockOn();
  const G = b.GATE_FARMS; const errs = []; w.addEventListener('error', (e) => errs.push(String(e.message).slice(0, 160)));
  let z = -440; C.position.set(8.0, 1.7, z); b.camBaseY = 1.7;
  for (let i = 0; i < 600 && !(G.units.length === 2 && G.units.every((u) => u.model && u.clips)); i++) { C.position.set(8.0, 1.7, z); b.look(Math.PI, 0); w.__adv(1); if (i % 20 === 0) await sleep(30); }
  log('built', G.built, 'units', G.units.length, 'models', G.units.map((u) => !!u.model).join(','), '| kinds', G.units.map((u) => u.kindName + ':' + (u.kind.tool || '-')).join(' '));
  const zs = G.units.map(() => [99, -999]);
  for (let f = 0; f < 60 * 6; f++) { C.position.set(8.0, 1.7, z); b.look(Math.PI, -0.05); w.__adv(1); G.units.forEach((u, k) => { zs[k][0] = Math.min(zs[k][0], u.g.position.z); zs[k][1] = Math.max(zs[k][1], u.g.position.z); }); }
  log('the banger: at', (G.units[0].g.position.x).toFixed(2), (G.units[0].g.position.z).toFixed(2), 'yaw', G.units[0].g.rotation.y.toFixed(2), '| clip', G.units[0].cur && G.units[0].cur.getClip().name, '| blows in 6 s', G.bangs || 0, '| gate pivot y', b.mushHouse.gate.pivot.rotation.y.toFixed(3));
  log('pacing 6 s at 40 m: z ranges', zs.map((r) => r.map((v) => v.toFixed(1)).join('..')).join(' | '), '| clips', G.units.map((u) => u.cur && u.cur.getClip().name).join(','), '| visible', G.units.map((u) => u.g.visible).join(','));
  C.position.set(4.5, 1.7, -473); b.lookAt(9.5, 1.2, -481); for (let i = 0; i < 4; i++) w.__adv(1); C.updateMatrixWorld(true); shot('pace', 640, 1.4);
  // walk in
  let asked = null;
  for (let f = 0; f < 60 * 12 && !asked; f++) { z = Math.max(-476.5, z - 4 / 60); C.position.set(8.0, 1.7, z); b.look(Math.PI, -0.05); w.__adv(1); if (b.state().dialogOpen) asked = { f, z }; }
  log('asked', !!asked, asked ? 'at z ' + asked.z.toFixed(1) : '', '| text', (w.document.getElementById('dialog-text') || {}).textContent);
  for (let i = 0; i < 90; i++) { w.__adv(1); await sleep(16); }   // (the line types on a real timer)
  C.updateMatrixWorld(true); shot('asked', 640, 1.4);
  const btns = [...w.document.querySelectorAll('#dialog-choices button')]; log('choices', btns.map((x) => x.textContent).join('/'));
  const no = btns.find((x) => /No/.test(x.textContent)); if (no) no.click();
  for (let i = 0; i < 40; i++) { w.__adv(1); await sleep(16); }
  log('answered: text', (w.document.getElementById('dialog-text') || {}).textContent);
  for (let i = 0; i < 300 && b.state().dialogOpen; i++) { w.__adv(1); await sleep(16); }
  log('dialog closed', !b.state().dialogOpen, '| awake', G.units.map((u) => u.st.awake).join(','), 'angry', G.angry);
  if (Q.get('kick')) {
    // a real kick (Q) on the nearer one from 1.2 m: the view punch, the hold, the step back
    const u = G.units.slice().sort((p, q) => p.g.position.distanceTo(C.position) - q.g.position.distanceTo(C.position))[0], P = u.g.position;
    C.position.set(P.x, 1.7, P.z + 1.2); b.camBaseY = 1.7; b.lookAt(P.x, 1.3, P.z); for (let i = 0; i < 3; i++) w.__adv(1);
    const x0 = C.position.x, z0 = C.position.z; const rows = [];
    w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyQ', key: 'q' })); w.__adv(1); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyQ', key: 'q' }));
    for (let f = 0; f < 40; f++) { w.__adv(1); const v = b.vpS(); rows.push(f + ':' + (v[0] * 57.3).toFixed(1) + '/' + (v[1] * 57.3).toFixed(1) + (b.hitstopS() > 0 ? 'h' : '')); }
    const E = new b.THREE.Euler(0, 0, 0, 'YXZ'); let maxRoll = 0;
    for (let k = 0; k < 5; k++) { for (let i = 0; i < 50; i++) { w.__adv(1); E.setFromQuaternion(C.quaternion, 'YXZ'); maxRoll = Math.max(maxRoll, Math.abs(E.z)); } w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyQ', key: 'q' })); w.__adv(1); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyQ', key: 'q' })); }
    for (let i = 0; i < 60; i++) { w.__adv(1); E.setFromQuaternion(C.quaternion, 'YXZ'); maxRoll = Math.max(maxRoll, Math.abs(E.z)); }
    log('CAMERA ROLL over five more kicks: max', (maxRoll * 57.3).toFixed(2), 'deg');
    log('KICK FEEL: struck', !!b.kickS().struck, 'felt', !!b.kickS().felt, '| punch deg pitch/roll per frame', rows.join(' '), '| you moved', Math.hypot(C.position.x - x0, C.position.z - z0).toFixed(2), 'm | him: rag', !!u.rag || !!u.kickRag);
  }
  b.settings.devMode = false;   // (a fight as it is played: dev mode may hold the swings)
  const hp0 = b.state().hp; let hurts = 0; const sw = {};
  for (let f = 0; f < 60 * 15; f++) { const h = b.state().hp; w.__adv(1); if (b.state().hp < h) hurts++; b.heal(); for (const u of G.units) if (u.st.atk >= 0 && u.st.atk < 0.03) sw[u.st.swing] = (sw[u.st.swing] || 0) + 1; if (f % 180 === 179) log('  t', ((f + 1) / 60).toFixed(0), 'dist', G.units.map((u) => Math.hypot(u.g.position.x - C.position.x, u.g.position.z - C.position.z).toFixed(1)).join(','), 'atk', G.units.map((u) => (u.st.atk ?? -1).toFixed(2)).join(',')); }
  log('fight 15 s: hurt you', hurts, 'times | swings started', JSON.stringify(sw), '| cool', G.units.map((u) => (u.st.cool || 0).toFixed(2)).join(','));
  b.settings.devMode = true;
  const jars0 = b.interactables ? b.interactables.filter((it) => /jar/i.test(typeof it.label === 'function' ? it.label() : it.label || '')).length : -1;
  for (let k = 0; k < 120 && G.units.some((u) => u.st.alive); k++) { for (const u of G.units) { if (!u.st.alive) continue; u.st.block = 0; u.st.parryT = 0; try { b.hurtMutantS(u, 3); } catch (e) { log('kill err', e.message); break; } } w.__adv(2); }
  for (let i = 0; i < 240; i++) w.__adv(1);
  const jars1 = b.interactables ? b.interactables.filter((it) => /jar/i.test(typeof it.label === 'function' ? it.label() : it.label || '')).length : -1;
  log('killed: alive', G.units.map((u) => u.st.alive).join(','), '| jars to take', jars0, '->', jars1, '| jar flags', G.units.map((u) => u.gf.jar).join(','));
  C.position.set(G.units[0].g.position.x - 3, 1.7, G.units[0].g.position.z + 3); b.lookAt(G.units[0].g.position.x, 0.3, G.units[0].g.position.z); for (let i = 0; i < 3; i++) w.__adv(1); C.updateMatrixWorld(true); shot('dead', 640, 1.4);
  log('errors', JSON.stringify(errs.slice(0, 5)));
}
log('DONE');
