/* HOW THEY DIE (2026-11-24, the owner: "make heavy hitting a farmer in the fall animation his body explodes into pieces … the cuts
 * through bodies to be an exact hit. the mace should just crush the bodies more but have it so hitting body parts effect the death
 * … a mind of their own and can all die uniquely"). The garrison booted, one man at a time in the street, real swings: per kill the
 * weapon, where it was aimed, what the cut crossed (`u.blow.cutBones`), what came off (`u.gone`), the throe chosen and what it did
 * (a hand's nearest approach to the wound, how far the chest crawled away from you), the gibs thrown; stills from the side every
 * 12 frames. Then the fall: `__bwZDieAll`, a light kill starts it, and a heavy blows him apart mid-fall.
 * (on the open beach, a fresh man spawned for each — `&k=` the kind, farmer1 by default)
 * PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/deathlab.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(1200);
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
const C = b.camera, T = b.THREE, f2 = (v) => (+v).toFixed(2);
let X = 8, Z = -60;
for (let z = -60; z > -400; z -= 3) { let ok = true; for (let dx = -3; dx <= 3 && ok; dx += 0.5) for (let dz = -4; dz <= 4 && ok; dz += 0.5) if (b.beachGroundAt(8 + dx, z + dz) > 0.002) ok = false; if (ok) { Z = z; break; } }
w.__clockOn();
const KIND = new URLSearchParams(location.search).get('k') || 'farmer1';
const gear = { katana: b.katanaItem, mace: b.maceItem };
const spawnOne = async () => { const u = b.mutSpawnTest(X, Z - 1.75, KIND, 0); for (let i = 0; i < 600 && !(u.model && u.mixer); i++) { C.position.set(X, 1.7, Z); b.camBaseY = 1.7; w.__adv(1); await sleep(10); } for (let i = 0; i < 20; i++) w.__adv(1); return u; };
let prev = null;
const run = async (tag, wpn, ay, P, zd) => {
  if (prev) { prev.g.visible = false; if (prev.rag) prev.g.position.y -= 300; }
  const u = await spawnOne(); prev = u;
  const it = gear[wpn]; b.addToInventory(it); if (b.state().equipped !== it.name) b.toggleEquip(it);
  w.__bwZDieAll = zd ? true : w.__bwZDieNone ? 0 : false;
  const p = u.g.position, f = new T.Vector3(0, 0, 1);
  u.st.hp = 1; u.st.awake = true; u.lastHitMine = true;
  const put = () => { C.position.set(p.x + f.x * 1.75, p.y + 1.7, p.z + f.z * 1.75); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + ay, p.z); };
  for (let i = 0; i < 12; i++) { put(); w.__adv(1); }
  const g0 = parseInt(b.gibsN());
  for (let i = 0; i < 90; i++) { put(); if (i === 2) b.startDig(zd ? 0 : P); w.__adv(1); if (!u.st.alive && (u.rag || u.zDie)) break; }
  if (zd) {   // he is falling: the second blow, the heavy, mid-fall
    for (let i = 0; i < 40 && u.zDie && !u.rag; i++) { put(); w.__adv(1); }
    log('  falling', !!u.zDie, 'rag', !!u.rag);
    for (let i = 0; i < 70 && !u.rag; i++) { put(); b.lookAt(p.x, p.y + 1.0, p.z); if (i === 2) b.startDig(P); w.__adv(1); }
  }
  const B = u.blow, r = u.rag;
  log(tag, '| cut crossed', B && B.cutBones ? JSON.stringify([...new Set(B.cutBones.map((n) => n.replace(/mixamorig|_[a-z]+$/g, '')))]) : '-', '| gone', JSON.stringify(Object.keys(u.gone || {}).filter((x) => u.gone[x]).map((x) => x.replace('Character1_', ''))),
    '| throe', r && r.throe ? r.throe.kind : '-', '| stagger', !!(r && r.stag), '| gibs', parseInt(b.gibsN()) - g0);
  // watch it die
  const wound = r && r.throe ? r.throe : null;
  let near = 9, crawl = 0, c0 = null;
  const trace = []; let fly = { top: 0, travel: 0, late: 0, h0: null, pk: 0 };
  for (let i = 0; i < 300; i++) {
    w.__adv(1);
    if (r) { const hp = r.byName['Character1_Hips'] || r.parts[0], f = hp.floor ?? 0; if (!fly.h0) fly.h0 = hp.p.clone(); fly.top = Math.max(fly.top, hp.p.y - f); fly.travel = Math.max(fly.travel, Math.hypot(hp.p.x - fly.h0.x, hp.p.z - fly.h0.z));
      let mx = 0; for (const q of r.parts) mx = Math.max(mx, q.p.y - (q.floor ?? 0)); fly.pk = Math.max(fly.pk, mx);
      if (i > 90) for (const q of r.parts) { const sp = q.p.distanceTo(q.pp) * 180; if (sp > fly.late) fly.late = sp; }
      // (2026-11-26, "bodies keep flying and sliding around on the ground after they are killed": once DOWN — the hips first under
      // 0.45 m — how far the hips and the furthest joint go from there, and the time it takes him to stop)
      { const hp = r.byName['Character1_Hips'] || r.parts[0], fl = hp.floor ?? 0;
        if (!fly.down && hp.p.y - fl < 0.45) { fly.down = hp.p.clone(); fly.downAt = i; fly.j0 = r.parts.map((q) => q.p.clone()); }
        if (fly.down) { fly.slide = Math.max(fly.slide || 0, Math.hypot(hp.p.x - fly.down.x, hp.p.z - fly.down.z)); fly.jmax = Math.max(fly.jmax || 0, ...r.parts.map((q, k) => fly.j0[k] ? Math.hypot(q.p.x - fly.j0[k].x, q.p.z - fly.j0[k].z) : 0)); if (!r.asleep) fly.stopAt = i; } } }
    if (r && ONLY === 'stand' && i % 6 === 0 && i <= 108) { const B = r.byName, ch = B['Character1_Spine2'], hp = B['Character1_Hips'], f = hp.floor ?? 0; trace.push(`${i}:ch ${(ch.p.y - f).toFixed(2)} hip ${(hp.p.y - f).toFixed(2)} mus ${r.mus ? (r.mus.air || 0).toFixed(1) : '-'}`); }
    if (r) {
      const ch = r.byName['Character1_Spine2'] || r.byName['Character1_Spine1'];
      if (ch && i === 40) c0 = ch.p.clone();
      if (wound && ch) for (const nm of ['Character1_LeftHand', 'Character1_RightHand']) { const hq = r.byName[nm]; if (hq) near = Math.min(near, hq.p.distanceTo(ch.p.clone().add(wound.w))); }
      if (c0 && ch && wound) crawl = Math.max(crawl, (ch.p.x - c0.x) * wound.away.x + (ch.p.z - c0.z) * wound.away.z);
      if (ONLY === 'topple') { const hp = r.byName['Character1_Hips'], ft = r.parts.filter((q) => q.foot), fl = hp.floor ?? 0;
        if (!fly.f0) { fly.f0 = ft.map((q) => q.p.clone()); fly.fs = 0; fly.up = 0; fly.gl = 0; fly.lp = hp.p.clone(); fly.planted = !!r.plant; }
        if (hp.p.y - fl > 0.6) { fly.up += 1 / 60; fly.gl += Math.hypot(hp.p.x - fly.lp.x, hp.p.z - fly.lp.z); fly.fs = Math.max(fly.fs, ...ft.map((q, k) => Math.hypot(q.p.x - fly.f0[k].x, q.p.z - fly.f0[k].z))); } fly.lp.copy(hp.p);
        if (i % 7 === 0 && i <= 77) { const c = hp.p, fw = f; snap(`${tag}_${String(i).padStart(3, '0')}`, c.x - fw.z * 3.4, 1.0, c.z + fw.x * 3.4, c.x, 0.8, c.z); } }
      else if (i % 24 === 0 && i <= 216) { const c = ch ? ch.p : p; const fw = f; snap(`${tag}_${i}`, c.x - fw.z * 2.6 + fw.x * 0.6, c.y + 1.1, c.z + fw.x * 2.6 + fw.z * 0.6, c.x, c.y + 0.1, c.z); }
    }
  }
  if (trace.length) log('   first 1.8 s:', trace.join(' | '));
  if (ONLY === 'topple' && fly.f0) log('   TOPPLE planted', fly.planted, '| upright', fly.up.toFixed(2), 's | hips went', fly.gl.toFixed(2), 'm while up | feet slid', fly.fs.toFixed(2), 'm while up | steps', r.nSteps || 0, '| stagger', !!r.stag);
  log('   STEPS', r ? r.nSteps || 0 : '-', '| hands as he fell', r ? r.reflexDone || '-' : '-');
  log('   ONCE DOWN (from', ((fly.downAt ?? 0) / 60).toFixed(2), 's) hips slid', (fly.slide || 0).toFixed(2), 'm | a joint moved up to', (fly.jmax || 0).toFixed(2), 'm | still moving until', ((fly.stopAt ?? 0) / 60).toFixed(2), 's');
  log('   FLIGHT hips highest', fly.top.toFixed(2), 'm | any joint highest', fly.pk.toFixed(2), 'm | hips travelled', fly.travel.toFixed(2), 'm | fastest joint after 1.5 s', fly.late.toFixed(1), 'm/s');
  if (wound) log('   ', wound.kind, '| a hand came to', f2(near), 'm of the wound | crawled', f2(crawl), 'm away | asleep', r.asleep);
};
const snap = (nm, px, py, pz, tx, ty, tz) => { const q = C.quaternion.clone(), pp = C.position.clone(), f0 = C.fov; C.fov = 55; C.updateProjectionMatrix(); C.position.set(px, py, pz); C.lookAt(tx, ty, tz); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); shot(nm, 380, 1.3); C.fov = f0; C.updateProjectionMatrix(); C.position.copy(pp); C.quaternion.copy(q); };
const ONLY = new URLSearchParams(location.search).get('only');
{ const Q2 = new URLSearchParams(location.search); if (Q2.get('nothroe')) w.__noThroe = 1; if (Q2.get('oldw')) w.__ragOldW = 1; if (Q2.get('musoff')) w.__musOff = 1; }   // (&only=fall: just the falls — a light blow and a heavy mid-fall, 2026-11-25)
// (&only=topple, 2026-11-25 "improve the physics": the ordinary deaths from the side, a still every 7 frames of the first 1.3 s —
// two that are thrown and two that stagger; `&plantoff=1` for the feet as they were)
if (new URLSearchParams(location.search).get('plantoff')) w.__plantOff = true;
if (ONLY === 'topple') { w.__bwZDieNone = 1; w.__bwStag = 0; await run('thrown-a', 'katana', 1.2, 0); await run('thrown-b', 'katana', 1.4, 0); w.__bwStag = 1; await run('stagger-a', 'katana', 1.2, 0); await run('stagger-b', 'katana', 1.4, 0); }
else if (ONLY === 'stand') { w.__bwStag = 1; w.__musDbg = 1; w.__bwZDieNone = 1; await run('katana-chest', 'katana', 1.15, 0); await run('katana-chest2', 'katana', 1.15, 0); await run('katana-legs', 'katana', 0.55, 0); await run('mace-chest', 'mace', 1.15, 0); }   // (the powered deaths, 2026-11-25)
else if (ONLY === 'fall') { await run('fall-light', 'katana', 1.2, 0, true); await run('fall-light-mace', 'mace', 1.2, 0, true); await run('fall-heavy', 'katana', 1.2, 1, true); }

else {
await run('katana-chest-heavy', 'katana', 1.25, 1);
await run('katana-head', 'katana', 1.62, 0);
await run('katana-legs', 'katana', 0.55, 0);
await run('katana-chest', 'katana', 1.15, 0);
await run('mace-chest', 'mace', 1.15, 0);
await run('mace-legs', 'mace', 0.45, 0);
await run('mace-head', 'mace', 1.65, 0);
await run('fall-heavy', 'katana', 1.2, 1, true);
}
