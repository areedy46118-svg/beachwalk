/* HOW THE FARMERS' BLOWS SWING, FROM YOUR EYE (2026-11-24, the owner: "THE FARMERS ARE NOT SWING THERE FUCKIN WEAPONS RIGHT … THE BLADE
 * NEVER VISUALLY CONNECT … ANIMATIONS WHERE IT BARELY EVEN SWINGS"). One role at a time (the rest cut down), you standing, healed, devMode
 * off: per blow and per contact (`A.wind` and each of `A.moreT`): the ARC — the largest angle the weapon's head has swung round his shoulder
 * in the 0.6 s into the contact — and its NEAREST APPROACH to your eye (the blade from his hand to its tip, within 0.06 s of the contact).
 * Stills from your eye through the first blows of each attack: the wind (40 %), just before, the contact, the follow-through.
 * &tools=sword,axe,rake &k=10 &tag=before  PB_PORT=4243 PB_WAIT=1200 sh tools/probe.sh 'evalFile&f=/tools/farmarc.js' <out> */
const Q = new URLSearchParams(location.search), TAG = Q.get('tag') || 'x', K = +(Q.get('k') || 10);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS(), V3 = b.camera.position.constructor;
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = false; if (Q.get('dbg')) w.__bwEdgeDbg = 1; if (Q.get('nosm')) w.__bwNoArmSmooth = 1;
const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.visible = false; }
const cam = b.camera.position, home = [cam.x, cam.z], f2 = (v) => (+v).toFixed(2);
/* the edge (the weapon's local +X, measured per model: `tools/edgedir.js`) and the haft (+Y) in the world */
const edgeOf = (me) => { const q = me.farmTool.getWorldQuaternion(new b.camera.quaternion.constructor()); return { e: new V3(1, 0, 0).applyQuaternion(q), ax: new V3(0, 1, 0).applyQuaternion(q), two: !!(me.farmW && me.farmW.two) }; };
const perp = (v, ax) => v.clone().addScaledVector(ax, -v.dot(ax));
const angE = (e, v, two) => { const d = e.dot(v.clone().normalize()); return Math.acos(Math.min(1, two ? Math.abs(d) : d)) * 57.3; };
/* the middle of the bit's edge (an axe's: its steel off the haft, on the side toward you if it has two; a sword's edge is on its line) */
const bitPt = (me, head) => { const W = me.farmW || {}, E = edgeOf(me), bw = W.bitW || 0; if (!bw) return head.clone(); const sg = W.two && E.e.dot(cam.clone().sub(head)) < 0 ? -1 : 1; return head.clone().addScaledVector(E.ax, -0.08).addScaledVector(E.e, sg * bw); };
/* the contact, close: from your eye with the lens narrowed onto where it strikes (the head filling the frame), and from the side,
 * 0.9 m off, a red bead where your eye is — which way the bit faces, against you */
const closeShots = (me, name) => {
  const C = b.camera, fov0 = C.fov, q0 = C.quaternion.clone(), p0 = cam.clone();
  me.model.updateMatrixWorld(true);
  const head = me.bones.tip.getWorldPosition(new V3()), hand = (me.bones.hand || me.farmTool).getWorldPosition(new V3());
  const sp = (me.farmW && me.farmW.bitW) ? bitPt(me, head) : hand.clone().lerp(head, 0.62);
  { const q = me.farmTool.getWorldQuaternion(new b.camera.quaternion.constructor()), nW = new V3(0, 0, 1).applyQuaternion(q), eW = new V3(1, 0, 0).applyQuaternion(q), axW = new V3(0, 1, 0).applyQuaternion(q), v = sp.clone().sub(p0).normalize();
    log('  STILL', name, 'flat to your line of sight', (Math.asin(Math.min(1, Math.abs(nW.dot(v)))) * 57.3).toFixed(0) + '° (0 = edge-on)', '| edge vs line to you', angE(eW, perp(p0.clone().sub(sp), axW), !!(me.farmW && me.farmW.two)).toFixed(0) + '°', '| bit at', sp.distanceTo(p0).toFixed(2), 'm', '| ik', !!me.farmIKOn, 'atk', me.st.atk.toFixed(2), 'wind', me.atk[me.st.swing].wind.toFixed(2), me.st.swing); }
  C.fov = 34; C.updateProjectionMatrix(); C.lookAt(sp.clone().lerp(hand, 0.15)); b.renderer.render(b.scene, C); shot(name + '_close', 300, 1.0);
  const bead = new (b.THREE || b.TB3).Mesh(new (b.THREE || b.TB3).SphereGeometry(0.035, 10, 8), new (b.THREE || b.TB3).MeshBasicMaterial({ color: 0xff2020 })); bead.position.copy(p0); b.scene.add(bead);
  const side = sp.clone().sub(p0).cross(new V3(0, 1, 0)); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
  cam.copy(sp).lerp(p0, 0.5).addScaledVector(side, 0.95).add(new V3(0, 0.2, 0)); C.fov = 50; C.updateProjectionMatrix(); C.lookAt(sp.clone().lerp(p0, 0.45));
  b.renderer.render(b.scene, C); shot(name + '_side', 300, 1.0);
  b.scene.remove(bead); cam.copy(p0); C.quaternion.copy(q0); C.fov = fov0; C.updateProjectionMatrix();
};
const segDist = (p, a, c) => { const ab = c.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq()))); return a.clone().addScaledVector(ab, t).distanceTo(p); };
// (&only=wcSwAtk: every man throws just that one — 2026-11-25, the big cut off the owner's video)
if (Q.get('only')) for (const u of units()) { const ks = Q.get('only').split(',').filter((k) => u.atk && u.atk[k]); if (ks.length) { const U = Object.fromEntries(ks.map((k) => [k, 1])); u.kind.use = U; if (u.use) u.use = U; } }
for (const tool of (Q.get('tools') || 'sword,axe,rake').split(',')) {
  const R = {}; let got = 0, shots = {};
  for (let f = 0; f < 60 * 160 && got < K; f++) {
    for (const u of units()) if (u.st.alive && u.farm && u.farm.out && u.kind.tool !== tool) { try { b.hurtMutant(u, 99, 0.2); } catch (e) {} }
    const me = units().find((u) => u.st.alive && u.farm && u.farm.out && u.kind.tool === tool);
    if (me) { b.lookAt(me.g.position.x, cam.y - 0.15, me.g.position.z); me.st.foe = null; }
    if (P0.unit) P0.unit.g.position.y = -500;
    w.__adv(1); cam.x = home[0]; cam.z = home[1]; b.heal(); if (P0.unit) P0.unit.st.awake = false;
    if (!me || !me.st.alive || !me.bones || !me.bones.tip || !me.farmTool) continue;
    const s = me.st, A = s.atk >= 0 ? me.atk[s.swing] : null;
    const L = me.__arc || (me.__arc = { sw: null, t: -1, hist: [], cs: [] });
    if (A && (L.sw !== s.swing || s.atk < L.t - 0.02)) { if (L.sw && L.cs.length) { (R[L.sw] || (R[L.sw] = [])).push(...L.cs); got++; } L.sw = s.swing; L.hist = []; L.sha = L.shb = L.shc = L.shd = L.shDone = false; L.cs = []; L.done = new Set(); L.hat0 = me.hitAt || 0; }
    if (!A) { if (L.sw && L.cs.length) { (R[L.sw] || (R[L.sw] = [])).push(...L.cs); got++; } L.sw = null; L.t = -1; continue; }
    L.t = s.atk;
    me.model.updateMatrixWorld(true);
    const head = me.bones.tip.getWorldPosition(new V3()), hand = (me.bones.hand || me.farmTool).getWorldPosition(new V3()), sho = (me.bones.arm || me.bones.hand).getWorldPosition(new V3());
    L.hist.push({ err: me.fikP && me.farmIKOn ? segDist(me.fikP, hand, head) : -1, tgt: me.fikP ? me.fikP.distanceTo(sho) : -1, reachA: (me.bones.fore && me.bones.hand) ? me.bones.arm.getWorldPosition(new V3()).distanceTo(me.bones.fore.getWorldPosition(new V3())) + me.bones.fore.getWorldPosition(new V3()).distanceTo(hand) : -1, t: s.atk, v: head.clone().sub(sho), d: Math.min(segDist(cam, hand, head), bitPt(me, head).distanceTo(cam)), ik: !!me.farmIKOn, seg: me.fikSeg, hd: head.distanceTo(cam), dist: Math.hypot(me.g.position.x - cam.x, me.g.position.z - cam.z), face: (() => { const E = edgeOf(me), sp0 = (me.farmW && me.farmW.bitW) ? bitPt(me, head) : hand.clone().lerp(head, 0.62), nW = new V3(0, 0, 1).applyQuaternion(me.farmTool.getWorldQuaternion(new b.camera.quaternion.constructor())); return [Math.asin(Math.min(1, Math.abs(nW.dot(sp0.clone().sub(cam).normalize())))) * 57.3, sp0.distanceTo(cam), me.fikEdgeW ? angE(E.e, perp(me.fikEdgeW, E.ax), true) : -1, me.fikEdgeW ? angE(perp(me.fikEdgeW, E.ax).normalize(), perp(cam.clone().sub(sp0), E.ax), true) : -1]; })(), hp: head.clone(), sp: (me.farmW && me.farmW.bitW) ? bitPt(me, head) : hand.clone().lerp(head, 0.62), hs: (b.hitstop || 0) > 0, dbg: me.fesDbg ? Object.entries(me.fesDbg).map((x) => x.join('=')).join(',') : (me.farmIKOn ? 'ik-nodbg' : 'noik'), ...edgeOf(me) });
    const C = [A.wind, ...(A.moreT || [])].filter((c) => c < A.wind + A.strike + 3);
    C.forEach((c, j) => {
      if (L.done.has(j) || s.atk < c + 0.06) return;
      L.done.add(j);
      const at = L.hist.reduce((a, q) => (Math.abs(q.t - c) < Math.abs(a.t - c) ? q : a), L.hist[0]);
      let arc = 0; for (const q of L.hist) if (q.t >= c - 0.6 && q.t <= c) arc = Math.max(arc, q.v.angleTo(at.v));
      let near = 9; for (const q of L.hist) if (Math.abs(q.t - c) <= 0.06) near = Math.min(near, q.d);
      const tv = []; for (let i = 3; i < L.hist.length; i++) { const q = L.hist[i], q0 = L.hist[i - 3];   // (over three frames: what the eye reads as its motion)
 if (q.t < c - 0.12 || q.t > c + 0.02 || q.hs) continue; const v = perp(q.hp.clone().sub(q0.hp), q.ax); if (v.length() > 0.004) tv.push(angE(q.e, v, q.two)); }
      tv.sort((x, y) => x - y);
      if (Q.get('frames') && (w.__frE = (w.__frE || 0) + 1) <= 8) log('  FRAMES', s.swing, j, L.hist.filter((q) => q.t >= c - 0.1 && q.t <= c + 0.08).map((q) => (q.t - c).toFixed(2) + (q.hs ? 'H' : '') + ':face' + q.face[0].toFixed(0) + '/d' + q.face[1].toFixed(2) + '/set' + q.face[2].toFixed(0) + '/tgt' + q.face[3].toFixed(0)).join(' '));
      if (Q.get('dbg') && (w.__dbgE = (w.__dbgE || 0) + 1) <= 6) { const rows = []; for (let i = 1; i < L.hist.length; i++) { const q = L.hist[i], q0 = L.hist[i - 1]; if (q.t < c - 0.14 || q.t > c + 0.04) continue; const v = perp(q.hp.clone().sub(q0.hp), q.ax); rows.push((q.t - c).toFixed(2) + (q.hs ? 'H' : '') + ' tr' + (v.length() > 0.004 ? angE(q.e, v, q.two).toFixed(0) : '-') + ' eye' + angE(q.e, perp(cam.clone().sub(q.hp.clone().addScaledVector(q.e, 0.12)), q.ax), q.two).toFixed(0) + ' ' + q.dbg); } log('  EDGEDBG', s.swing, j, rows.join(' | ')); }
      const eyeA = angE(at.e, perp(cam.clone().sub(at.sp), at.ax), at.two);   // (from where it strikes: the bit's edge, or 0.62 of a sword)
      L.cs.push({ model: (me.farmW && me.farmW.pack) || me.kind.tool, trav: tv.length ? tv[tv.length >> 1] : -1, travMax: tv.length ? tv[tv.length - 1] : -1, eyeA, j, arc: arc * 57.3, near, dist: Math.hypot(me.g.position.x - cam.x, me.g.position.z - cam.z), landed: (me.hitAt || 0) !== (L.hat0 || 0), err: at.err, tgt: at.tgt, ra: at.reachA });
    });
    // stills: the first two blows of each attack, four moments of its first contact
    const key = s.swing, n = shots[key] || 0;
    if (n < 2) { const m = [['a', A.wind * 0.4], ['b', A.wind - 0.15], ['c', A.wind], ['d', A.wind + 0.18]]; for (const [nm, tt] of m) if (!L.shDone && !L['sh' + nm] && s.atk >= tt) { L['sh' + nm] = true; b.renderer.render(b.scene, b.camera); shot(`${TAG}_${tool}_${key}_${n}_${nm}`, 300, 1.0); if (nm === 'c') closeShots(me, `${TAG}_${tool}_${key}_${n}`); } if (L.shd && !L.shDone) { shots[key] = n + 1; L.shDone = true; } }
  }
  for (const k of Object.keys(R).sort()) { const cs = R[k]; const byJ = {}; for (const c of cs) (byJ[c.j] || (byJ[c.j] = [])).push(c);
    for (const j of Object.keys(byJ)) { const a = byJ[j].map((c) => c.arc).sort((x, y) => x - y), d = byJ[j].map((c) => c.near).sort((x, y) => x - y);
      log(TAG, tool, k.padEnd(9), 'contact', j, '| n', a.length, '| ARC median', a[a.length >> 1].toFixed(0) + '°', 'min', a[0].toFixed(0) + '° | NEAREST TO YOUR EYE median', f2(d[d.length >> 1]), 'min', f2(d[0]), '| he stood', f2(byJ[j].map((c) => c.dist).sort((x, y) => x - y)[a.length >> 1]), '| landed', byJ[j].filter((c) => c.landed).length + '/' + a.length, '| EDGE vs TRAVEL (median over the strike, per blow)', byJ[j].map((c) => c.trav.toFixed(0) + '°').join(','), 'worst', byJ[j].map((c) => c.travMax.toFixed(0)).join(','), '| EDGE vs YOUR EYE at contact', byJ[j].map((c) => c.eyeA.toFixed(0) + '°').join(','), '| model', [...new Set(byJ[j].map((c) => c.model))].join('/'), '| ik err', byJ[j].map((c) => f2(c.err)).join(','), 'target off shoulder', byJ[j].map((c) => f2(c.tgt)).join(','), 'arm', f2(byJ[0] ? 0 : byJ[j][0].ra)); } }
}
