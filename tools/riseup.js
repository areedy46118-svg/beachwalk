/* DO THEY STAND ON THE FLOOR WHEN THEY GET UP (2026-11-26, the owner, a still in the tavern: "when they get up they are floating fix
 * this now"). `&at=tav` (default) the tavern's three, `&at=fort` the first castle's men. Each knocked down two ways — the kick's
 * ragdoll and rise (`kickRagStart` → `kickRagRise`) and the clip knockdown (`mutKnockdown`) — then followed until 2 s after he is up:
 * his lowest foot over the floor under it (`groundUnderS`, the place's own), his group over that floor. A man standing reads his
 * soles at ~0.0-0.1.
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/riseup.js' <out> */
const Q = new URLSearchParams(location.search), AT = Q.get('at') || 'tav';
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
let units = [];
if (AT === 'fort') { await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot())); units = b.farmUnitsS().filter((u) => u.st.alive).slice(0, 3); }
else {
  w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
  for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
  const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
  b.clearRoomFlags(); RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(20); }
  for (let i = 0; i < 300 && !(b.orcUnit && b.orcUnit.model && b.wongUnit && b.wongUnit.model && b.drunkUnit && b.drunkUnit.model); i++) { b.frame(1); await sleep(30); }
  units = [b.wongUnit, b.drunkUnit, b.orcUnit].filter(Boolean); if (Q.get('only')) units = units.filter((u) => (u.kindName || '') === Q.get('only'));
  log('in the tavern', b.tavState().inTavern);
}
if (!w.__clockOn) await ev('/tools/burntest.js');
b.settings.devMode = true; w.__clockOn();
const T = b.THREE, C = b.camera;
const feetOf = (u) => { const out = []; u.model.traverse((o) => { if (o.isBone && /(Foot|Toe|Ball|ball|foot)/.test(o.name) && !/End|_end|Top/.test(o.name)) out.push(o); }); return out; };
const v = new T.Vector3();
{ let worst = 0, n = 0; for (let f = 0; f < 240; f++) { w.__adv(1); for (const u of units) { if ((u.st.down || 0) > 0 || u.kickRag || !u.st.alive) continue; const d = u.g.position.y - (u.dfLift || 0) - b.standFloorS(u, u.g.position.x, u.g.position.z, u.g.position.y); worst = Math.max(worst, Math.abs(d)); n++; } }
  log('the floor checked against the game\'s own walking: standing men are within', worst.toFixed(3), 'm of it over', n, 'samples | vs groundUnder:', units.map((u) => (u.g.position.y - b.groundUnderS(u.g.position.x, u.g.position.z, u.g.position.y + 0.45)).toFixed(2)).join(' ')); }
for (const u of units) {
  const name = u.kindName || (u.kind && u.kind.file) || '?', F = feetOf(u);
  for (const how of (Q.get('how') ? [Q.get('how')] : ['kick', 'clip'])) {
    u.st.hp = Math.max(u.st.hp, 50); u.st.alive = true; u.st.down = 0; u.st.atk = -1; u.st.stun = 0; u.st.recoil = 0;
    for (let i = 0; i < 60; i++) w.__adv(1);
    // you 2 m off him, looking at him
    const p = u.g.position; C.position.set(p.x + 2, p.y + 1.7, p.z); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + 1, p.z);
    let ok; const y0 = u.g.position.y;
    if (how === 'kick') ok = b.kickRagStartS ? b.kickRagStartS(u, -1, 0, 1) : false;
    else { try { b.mutKnockdown(u); ok = (u.st.down || 0) > 0; } catch (e) { ok = 'ERR ' + e.message; } }
    if (!ok) { log(name, how, '| not knocked down', ok); continue; }
    let winMin = 9, winBody = 9, winBodyN = '', winLift = 0, winMins = [], wasDown = true, upAt = -1, worstUp = -9, worstAfter = -9, minAfter = 9, groupAfter = -9, riseMax = -9; const trace = [];
    for (let f = 0; f < 60 * 9; f++) {
      w.__adv(1);
      const down = !!u.kickRag || (u.st.down || 0) > 0;
      u.model.updateMatrixWorld(true);
      let lo = 1e9, lx = 0, lz = 0; for (const b2 of F) { b2.getWorldPosition(v); if (v.y < lo) { lo = v.y; lx = v.x; lz = v.z; } }
      const fl = b.standFloorS(u, lx, lz, y0), gfl = b.standFloorS(u, u.g.position.x, u.g.position.z, y0);   // (the floor a man stands on there, at his standing level: the castle's or the tavern's own storeys, `standFloorAt`)
      const sole = lo - fl, grp = u.g.position.y - gfl;
      if (!u.kickRag && (u.st.down || 0) > 0) riseMax = Math.max(riseMax, sole);
      if (wasDown && !down) { upAt = f / 60; }
      wasDown = down;
      if (upAt >= 0 && f / 60 < upAt + 2) { worstAfter = Math.max(worstAfter, sole); minAfter = Math.min(minAfter, sole); groupAfter = Math.max(groupAfter, Math.abs(grp)); }
      winMin = Math.min(winMin, sole);
      if (down && !u.kickRag) { let lb = 1e9, ln = ''; u.model.traverse((o) => { if (o.isBone && /Head$|Head_|Hand$|Hand_|Hips|Spine2|Foot$|Foot_|ForeArm|Leg$|Leg_|Calf|Thigh/.test(o.name) && !/Finger|Thumb|Index|Middle|Ring|Pinky|HeadTop|Toe/.test(o.name)) { const yy = o.getWorldPosition(v).y; if (yy < lb) { lb = yy; ln = o.name.replace(/^.*?(Left|Right)?([A-Z][a-zA-Z]+)$/, '$1$2'); } } }); winBody = Math.min(winBody, lb - gfl); winBodyN = winBody === lb - gfl ? ln : winBodyN; winLift = Math.max(winLift, u.dfLift || 0); }
      if (f % 30 === 29) { winMins.push(`${((f - 29) / 60).toFixed(1)}${down ? (u.kickRag ? 'R' : 'D') : 'U'}:${winMin.toFixed(2)}${u.cur ? '(' + u.cur.getClip().name + ')' : ''}${winBody < 9 ? ' body ' + winBody.toFixed(2) + ' ' + winBodyN + ' lift ' + winLift.toFixed(2) : ''}`); winMin = 9; winBody = 9; winLift = 0; }
      if (f % 30 === 0 && Q.get('dbg') && upAt >= 0) { let hb = null; u.model.traverse((o) => { if (!hb && o.isBone && /Hips|hips|pelvis/.test(o.name)) hb = o; }); log('   dbg', (f / 60).toFixed(1), 'model.y', u.model.position.y.toFixed(3), 'modelY', (u.modelY || 0).toFixed(3), 'dfLift', (u.dfLift || 0).toFixed(3), 'hips local y', hb && hb.position.y.toFixed(3), 'hips over floor', hb && (hb.getWorldPosition(new T.Vector3()).y - gfl).toFixed(3), 'cur', u.cur && u.cur.getClip().name, 'ragOut', !!u.ragOut, 'model scale', u.model.scale.y.toFixed(3), 'g scale', u.g.scale.y.toFixed(3)); }
      if (f % 30 === 0) trace.push(`${(f / 60).toFixed(1)}${down ? (u.kickRag ? 'R' : 'D') : 'U'}:${sole.toFixed(2)}/${grp.toFixed(2)}`);
      if (upAt >= 0 && f / 60 > upAt + 2) break;
    }
    log(name.padEnd(10), how.padEnd(4), '| up at', upAt.toFixed(2), 's | lowest foot over the floor while rising, highest', riseMax.toFixed(2), '| in the 2 s after:', minAfter.toFixed(2), '..', worstAfter.toFixed(2), 'm | group off its floor', groupAfter.toFixed(2));
    log('     each half-second, its LOWEST foot over the floor [R ragdoll/D down/U up]:', winMins.join(' '));
  }
}
log('DONE');
