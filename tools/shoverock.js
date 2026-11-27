/* SHOVED INTO A ROCK (2026-11-25, the owner: "make sure he doesnt clip through anything"). A farmer on the open beach a metre off a
 * formation's face, shoved at it as hard as anything in the game shoves (a blast's `flinchPush`, v 22) and, fresh, a body thrown
 * dead at it (`mutRagdoll`, power 4). How deep into the stone he went: the feet for the shove, the deepest joint for the body —
 * measured against `rockColliders` with the walk's own rule (a top more than a step over the feet/underside is a wall). Run
 * twice, `__rkOff` (the old beach: the cliff the only wall) and on. Stills from above the rock.
 *   PB_PORT=4224 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/shoverock.js' /tmp/bw-shove */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const C = b.camera, T = b.THREE, f2 = (v) => (+v).toFixed(2);
const depthAt = (x, z, feet, grow = 0, head = feet + 1.6) => { let d = 0; for (const c of b.colNear(x, z, grow)) { if (feet >= c.top - (c.step ?? 0.42)) continue; if (c.floorY !== undefined && head < c.floorY) continue; d = Math.max(d, b.solidDepth(c, x, z, grow)); } return d; };
// a spot on open sand with a thick face of stone 1-2 m to its +x (the walk's own rule: what stops a body standing on the sand)
let R = null;
for (let z = -90; z > -1100 && !R; z -= 1) for (let x = 1; x < 11 && !R; x += 0.5) {
  if (z < -138 && z > -172) continue;   // (not the wreck: its hull is a room you walk into)
  if (depthAt(x, z, 0, 0.8) > 0) continue;
  let face = null; for (let d = 0.5; d <= 2.0; d += 0.1) if (depthAt(x + d, z, 0) > 0) { face = d; break; }
  if (face === null || face < 1.0) continue;
  let thick = true; for (let d = face + 0.1; d <= face + 1.6; d += 0.1) if (depthAt(x + d, z, 0) <= 0) { thick = false; break; }
  if (thick) R = { sx: x, z, face: x + face };
}
log('spot', R ? `sand at x ${f2(R.sx)} z ${R.z}, the face at x ${f2(R.face)}` : 'none');
w.__clockOn();
const spawn = async () => {
  const sx = R.sx, sz = R.z;
  C.position.set(sx - 5, 1.7, sz); b.camBaseY = 1.7;
  const u = b.mutSpawnTest(sx, sz, new URLSearchParams(location.search).get('k') || 'pale', 0);
  for (let i = 0; i < 600 && !(u.model && u.mixer); i++) { C.position.set(sx - 5, 1.7, sz); w.__adv(1); await sleep(10); }
  for (let i = 0; i < 10; i++) w.__adv(1);
  u.g.position.set(sx, u.g.position.y, sz);
  for (let i = 0; i < 3; i++) w.__adv(1);
  return u;
};
const topShot = (name) => {
  w.requestAnimationFrame = () => 0;
  const Rr = b.renderer, H = 5, oc = new T.OrthographicCamera(-H * 1.6, H * 1.6, H, -H, 0.1, 200);
  oc.position.set(R.face, 40, R.z); oc.up.set(-1, 0, 0); oc.lookAt(R.face, 0, R.z);
  Rr.setSize(960, 600, false); Rr.render(b.scene, oc);
  const c = document.createElement('canvas'); c.width = 960; c.height = 600; c.getContext('2d').drawImage(Rr.domElement, 0, 0, 960, 600);
  const u64 = c.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(u64.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, u64.slice(i * 8000, (i + 1) * 8000));
};
const prev = [];
for (const off of [true, false]) {
  w.__rkOff = off; const tag = off ? 'BEFORE' : 'AFTER ';
  // the shove: as hard as a blast, straight at the stone, and the bump's walk-on push for ten frames after
  {
    const u = await spawn(); prev.push(u); u.st.awake = true; const p = u.g.position;
    u.st.flinchPush = { x: 1, z: 0, v: 22, d: 5.5 };
    let worst = 0;
    for (let i = 0; i < 90; i++) { if (i < 40 && i % 4 === 0 && !u.st.flinchPush) u.st.flinchPush = { x: 1, z: 0, v: 6, d: 5 }; w.__adv(1); worst = Math.max(worst, depthAt(p.x, p.z, p.y)); if (i % 10 === 0) log('   f', i, 'x', f2(p.x), 'push', u.st.flinchPush ? f2(u.st.flinchPush.v) : '-', 'down', u.st.down || 0, 'recoil', f2(u.st.recoil || 0)); }
    log(tag, 'shove: deepest feet in stone', f2(worst), 'm, ends', f2(depthAt(p.x, p.z, p.y)), 'm in, at x', f2(p.x), '(face at', f2(R.face) + ')');
    u.g.visible = false; p.y -= 300;
  }
  // the chase: you behind the stone, he walks at you for three seconds
  {
    const u = await spawn(); prev.push(u); u.st.awake = true; const p = u.g.position;
    let worst = 0;
    for (let i = 0; i < 180; i++) { C.position.set(R.face + 4, 1.7, R.z); b.camBaseY = 1.7; w.__adv(1); worst = Math.max(worst, depthAt(p.x, p.z, p.y)); }
    log(tag, 'chase: deepest feet in stone', f2(worst), 'm, ends at x', f2(p.x), 'z', f2(p.z));
    u.g.visible = false; p.y -= 300;
  }
  // the body: killed and thrown at the stone
  {
    const u = await spawn(); prev.push(u); const p = u.g.position;
    u.st.hp = 0; u.st.alive = false; b.mutRagdoll(u, 1, 0, 4.0);
    let worst = 0, wn = '';
    for (let i = 0; i < 240; i++) {
      w.__adv(1);
      if (u.rag) for (const q of u.rag.parts) { const d = depthAt(q.p.x, q.p.z, q.p.y - q.r, q.r); if (d > worst) { worst = d; wn = q.name.replace('Character1_', ''); } }
    }
    let fin = 0; if (u.rag) for (const q of u.rag.parts) fin = Math.max(fin, depthAt(q.p.x, q.p.z, q.p.y - q.r, q.r));
    const hip = u.rag && (u.rag.byName['Character1_Hips'] || u.rag.parts[0]);
    log(tag, 'thrown body: rag', !!u.rag, 'deepest joint in stone', f2(worst), wn, '| at rest', f2(fin), '| hips x', hip ? f2(hip.p.x) : '-', 'y', hip ? f2(hip.p.y) : '-');
    topShot(off ? 'before' : 'after');
    w.requestAnimationFrame = (f) => setTimeout(f, 16);
    u.g.visible = false; if (u.rag) for (const q of u.rag.parts) q.p.y -= 300;
  }
}
log('DONE');
