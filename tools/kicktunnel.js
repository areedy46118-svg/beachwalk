/* THE TUNNEL TEST, ON THE KICK (2026-11-26, the owner: "make sure i can kick anyone through walls or floors or anything" — read: that
 * you CANNOT; and the physics-tuning skill's check #1: the fastest body at the thinnest wall). The first castle; for each man out in
 * the street, the nearest drawn wall round his chest (16 directions, `worldDrawnHit`, 0.8-3.5 m off); you stand 1.4 m off him on the
 * far side and kick him dead into it — the fastest throw the game has (`killFling`, and `&air=1` a jump kick's). Per man: did any
 * joint end on the far side of that wall (the line from where his chest stood to the joint crosses drawn stone), and did any end
 * under its floor. `&n=` men.
 *   PB_PORT=4243 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/kicktunnel.js&n=8' <out> */
const Q = new URLSearchParams(location.search), N = +(Q.get('n') || 8);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn(); b.settings.devMode = true;
const C = b.camera, T = b.THREE, units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
for (let i = 0; i < 60 && !b.KICK.ready; i++) { w.__adv(1); await sleep(50); }
const used = new Set(); let tried = 0, through = 0, under = 0, part = 0; const rows = [];
for (let t = 0; t < 40 && tried < N; t++) {
  const u = units().find((x) => x.st.alive && x.model && x.g.visible && x.farm && x.farm.out && !used.has(x)); if (!u) break; used.add(u);
  const m = u.g.position, ch = new T.Vector3(m.x, m.y + 1.1, m.z);
  let best = null;
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, d = new T.Vector3(Math.sin(a), 0, Math.cos(a)); const h = b.worldDrawnHitS(ch, d, 3.5, 0.05); const ho = h && h.hit && h.hit.object; if (ho && ho === b.sand) continue; if (h && h.t > 0.8 && (!best || h.t < best.t)) { const o = h.hit && h.hit.object; let nm = o ? (o.name || o.type) : '?'; for (let q = o && o.parent, j = 0; q && j < 3; q = q.parent, j++) nm += '<' + (q.name || q.type); if (o && !o.name) { const g = o.geometry, mt = [].concat(o.material)[0]; o.updateMatrixWorld(true); const wp = new T.Vector3().setFromMatrixPosition(o.matrixWorld); nm += ` [verts ${g && g.attributes.position ? g.attributes.position.count : '?'} mat ${mt && (mt.name || mt.type)} map ${!!(mt && mt.map)} inst ${!!o.isInstancedMesh} ud ${Object.keys(o.userData || {}).join('/')} at ${(wp.x - m.x).toFixed(1)},${(wp.y - m.y).toFixed(1)},${(wp.z - m.z).toFixed(1)} scale ${o.scale.x.toFixed(2)} box ${(() => { const bb = new T.Box3().setFromObject(o), sz = bb.getSize(new T.Vector3()); return sz.toArray().map((v) => v.toFixed(1)).join('x'); })()} tex ${mt && mt.map && (mt.map.name || (mt.map.image && (mt.map.image.currentSrc || mt.map.image.src || '').split('/').pop().slice(0, 40)) || '-')} geo ${o.geometry && o.geometry.name}]`; } best = { t: h.t, d, nm, pt: h.point.clone() }; } }
  if (!best) { rows.push(u.kindName + ' no wall near'); continue; }
  const fx = best.d.x, fz = best.d.z, eyeY = C.position.y;
  const put = () => { const p = u.g.position; C.position.set(p.x - fx * 1.4, eyeY, p.z - fz * 1.4); b.camBaseY = eyeY; b.lookAt(p.x, eyeY - 0.35, p.z); };
  for (let i = 0; i < 10; i++) { put(); w.__adv(1); }
  const ch0 = new T.Vector3(u.g.position.x, u.g.position.y + 1.1, u.g.position.z);
  u.st.hp = 1; b.KICK.cd = 0; b.heal(); if (Q.get('air')) b.KICK.forceAir = true;
  if (!b.startKick()) { rows.push(u.kindName + ' kick refused'); continue; }
  const here = new T.Vector3();
  for (let i = 0; i < 20 && !b.KICK.struck; i++) { put(); here.copy(C.position); w.__adv(1); }
  let topY = -1e9, y0 = u.g.position.y; for (let i = 0; i < 240; i++) { C.position.copy(here); w.__adv(1); if (u.rag) for (const q of u.rag.parts) topY = Math.max(topY, q.p.y - y0); }
  b.KICK.forceAir = false;
  const R = u.rag; if (!R) { rows.push(u.kindName + ' not thrown'); continue; }
  tried++;
  let crossed = 0, sunk = 0, far = 0;
  for (const q of R.parts) {
    const v = new T.Vector3().subVectors(q.p, ch0), L = v.length(); far = Math.max(far, Math.hypot(v.x, v.z));
    const h = L > 0.1 ? b.worldDrawnHitS(ch0, v.clone().normalize(), L, 0.05) : null;
    if (h && !(h.hit && h.hit.object === b.sand) && h.t < L - (q.r || 0.1) - 0.05) crossed++;
    if (q.floor !== undefined && q.p.y < q.floor - 0.05) sunk++;
  }
  if (crossed >= 4) through++; else if (crossed) part++; if (sunk) under++;
  const kw = b.fortDbg && b.fortDbg.keepWallNear ? b.fortDbg.keepWallNear(best.pt.x, best.pt.z, 0.3, best.pt.y - 0.4, best.pt.y + 0.4, b.FORT_SITE) : 'n/a';
  { let tp = best.pt.y; for (let yy = best.pt.y; yy < best.pt.y + 8; yy += 0.25) { const h2 = b.worldDrawnHitS(new T.Vector3(ch.x, yy, ch.z), best.d, best.t + 0.3, 0.05); if (h2 && !(h2.hit && h2.hit.object === b.sand)) tp = yy; else break; } best.top = tp - u.g.position.y; }
  rows.push(`[in the wall index: ${kw ? (kw === 'n/a' ? 'n/a' : 'yes') : 'NO'}, hit at y ${(best.pt.y - u.g.position.y).toFixed(2)}] ` + `${u.kindName}: wall ${best.t.toFixed(2)} m behind him (${best.nm}) | flew ${far.toFixed(2)} m, highest joint ${topY.toFixed(2)} m up, the wall's top ${best.top !== undefined ? best.top.toFixed(2) : '?'} | joints past the wall ${crossed} | under the floor ${sunk}`);
}
log(rows.join('\n  '));
log('TUNNEL', Q.get('air') ? '(jump kicks)' : '', '| thrown', tried, '| whole body through a wall', through, '| a limb tip past one', part, '| under a floor', under, through || under ? 'FAIL' : 'ok');
log('DONE');
