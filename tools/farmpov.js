/* THE FARMERS AS YOU SEE THEM (2026-11-23, the owner: "their weapons should be angled like they are being held they dont stick up
 * straight when held … they dont even swing the blade at you and their moves dont connect to the player"). One man of a role at a
 * time (the rest cut down), you standing still facing him as the duel does; filmed from YOUR eye at your own field of view: him
 * closing in, carrying it (every 20 frames), then his first two blows every 3 frames from the wind to the recovery. One sheet a
 * role: pov_<role>.jpg. Also logged per blow: the tip's least distance to your eye, and whether the tip was ever inside the middle
 * third of the screen. &tools=sword,axe  PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/farmpov.js&tools=axe' <out> */
const Q = new URLSearchParams(location.search);
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().length >= 20 && units().every((u) => u.model)); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = false;
const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.position.y = -500; }
const cam = b.camera, C = cam.position, home = [C.x, C.z], T = b.THREE;
// a crop of your view round him (his chest projected), sized by his distance, at full resolution; brightened so the weapon reads
const grab = (u) => { const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 260; c.height = 260; const g = c.getContext('2d');
  const m = u.g.position.clone(); m.y += 1.1; const q = m.clone().project(cam), d = Math.max(0.8, m.distanceTo(C));
  const cx = (q.x * 0.5 + 0.5) * src.width, cy = (1 - (q.y * 0.5 + 0.5)) * src.height, half = Math.min(src.height * 0.5, src.height * 1.25 / d);
  g.filter = 'brightness(1.9)'; g.drawImage(src, cx - half, cy - half, half * 2, half * 2, 0, 0, 260, 260); return c; };
for (const tool of (Q.get('tools') || 'sword,axe,hammer,rake').split(',')) {
  const frames = [], landed = [], acr = [], hist = [], sweeps = [], acrMax = []; const SM = { tip: 0, hand: 0, rot: 0, n: 0, at: '', big: [] }; let blows = 0, inSw = false, f = 0, carryN = 0, minEye = 9, centred = false; const per = [];
  for (f = 0; f < 60 * 120 && blows < (+Q.get('n') || 2); f++) {
    for (const u of units()) if (u.st.alive && u.farm && u.farm.out && u.kind.tool !== tool) { try { b.hurtMutant(u, 99, 0.2); } catch (e) {} }
    const me = units().find((u) => u.st.alive && u.farm && u.farm.out && u.kind.tool === tool);
    if (me) { b.lookAt(me.g.position.x, C.y - 0.1, me.g.position.z); me.st.foe = null; me.st.swFoe = null; }
    if (P0.unit) P0.unit.g.position.y = -500;
    w.__adv(1); C.x = home[0]; C.z = home[1]; b.heal(); if (P0.unit) P0.unit.st.awake = false;
    if (!me) continue;
    const d = Math.hypot(me.g.position.x - C.x, me.g.position.z - C.z);
    const sw = me.st.atk >= 0;
    if (!sw && d < 4.5 && carryN < 4 && f % 15 === 0) { frames.push(['carry d' + d.toFixed(1), grab(me)]); carryN++; }
    if (sw) {
      if (!inSw) { inSw = true; minEye = 9; centred = false; me._hitThisSw = false; me._lastHitAt = me.hitAt; me._pv = null; }
      const tip = me.bones && me.bones.tip && me.bones.tip.getWorldPosition(new T.Vector3());
      { const hd0 = me.bones.hand.getWorldPosition(new T.Vector3()), hq = me.bones.hand.getWorldQuaternion(new T.Quaternion());
        if (me._pv) { const jt = tip.distanceTo(me._pv.tip), jh = hd0.distanceTo(me._pv.hand), ja = 2 * Math.acos(Math.min(1, Math.abs(hq.dot(me._pv.q)))) * 180 / Math.PI;
          if (jt > SM.tip) SM.at = `${me.st.swing} t ${me.st.atk.toFixed(2)} (wind ${me.atk[me.st.swing].wind.toFixed(2)} strike ${me.atk[me.st.swing].strike.toFixed(2)}) ik ${!!me.farmIKOn} was ${!!me.fikWas} stun ${(me.st.stun || 0).toFixed(2)} recoil ${(me.st.recoil || 0).toFixed(2)} rag ${!!me.rag} turn ${ja.toFixed(0)}°`; SM.tip = Math.max(SM.tip, jt); SM.hand = Math.max(SM.hand, jh); SM.rot = Math.max(SM.rot, ja); SM.n++; if (jt > 0.35) SM.big.push(`${me.st.swing} ${me.st.atk.toFixed(2)} ${jt.toFixed(2)}m ik ${!!me.farmIKOn}`); }
        me._pv = { tip: tip.clone(), hand: hd0, q: hq };
        const mid = hd0.clone().lerp(tip, 0.6), q = mid.clone().project(cam), bd = tip.clone().sub(hd0).normalize(), te = C.clone().sub(mid).normalize();
        hist.push({ t: f, x: q.x, y: q.y, across: Math.acos(Math.min(1, Math.abs(bd.dot(te)))) * 180 / Math.PI }); if (hist.length > 30) hist.shift(); }
      if (me.hitAt && me.hitAt !== me._lastHitAt && !me._hitThisSw && tip && me.farmTool) { me._lastHitAt = me.hitAt; me._hitThisSw = true;
        const hd = me.farmTool.parent.getWorldPosition(new T.Vector3()), a = hd.clone().project(cam), z = tip.clone().project(cam);
        const len = Math.hypot((z.x - a.x) * cam.aspect, z.y - a.y) / 2, mid = hd.clone().lerp(tip, 0.6).project(cam);
        const bd = tip.clone().sub(hd).normalize(), toEye = C.clone().sub(hd.clone().lerp(tip, 0.6)).normalize(), across = Math.acos(Math.min(1, Math.abs(bd.dot(toEye)))) * 180 / Math.PI; acr.push(across);
        { const recent = hist.filter((h) => h.t > f - 15); if (recent.length > 2) { let tr = 0; for (let i = 1; i < recent.length; i++) tr += Math.hypot((recent[i].x - recent[i - 1].x) * cam.aspect, recent[i].y - recent[i - 1].y) / 2; sweeps.push(tr); acrMax.push(Math.max(...recent.map((h) => h.across))); } }
        landed.push(`across ${across.toFixed(0)}° blade ${(len * 100).toFixed(0)}% of the screen, its middle at ${mid.x.toFixed(2)},${mid.y.toFixed(2)}, tip ${tip.distanceTo(C).toFixed(2)} m from your eye`); }
      if (tip) { minEye = Math.min(minEye, tip.distanceTo(C)); const q = tip.clone().project(cam); if (Math.abs(q.x) < 0.34 && Math.abs(q.y) < 0.34 && q.z < 1) centred = true; }
      if (f % 3 === 0 && frames.length < 46 && (d < 3.2 || me.st.atk > 0.3)) frames.push([me.st.swing + ' ' + me.st.atk.toFixed(2) + ' d' + d.toFixed(1), grab(me)]);
    } else if (inSw) { inSw = false; blows++; per.push(`${me.st.swing || '?'} tip to eye ${minEye.toFixed(2)} centred ${centred}`); }
  }
  log(tool, 'blows', blows, '|', per.join(' | ')); log('   landed:', landed.join(' || ') || 'none'); const med = (a) => a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : NaN;
  log('   SWEEP', tool, 'the blade across the screen in the quarter-second before it lands (screen heights) median', med(sweeps).toFixed(2), '| most across in that time (90 = whole length) median', med(acrMax).toFixed(0) + '°');
  log('   SMOOTH', tool, 'largest one-frame jump: tip', SM.tip.toFixed(3), 'm, hand', SM.hand.toFixed(3), 'm, hand turn', SM.rot.toFixed(1) + '° over', SM.n, 'swing frames | worst at', SM.at, '| frames over 0.35 m:', SM.big.length, SM.big.slice(0, 8).join(' ; '));
  log('   SUMMARY', tool, 'blows', blows, 'landed', acr.length, 'blade across your view (90 = full length, 0 = end-on) median', acr.length ? acr.slice().sort((a, b) => a - b)[acr.length >> 1].toFixed(0) : '-', 'min', acr.length ? Math.min(...acr).toFixed(0) : '-');
  if (!frames.length) continue;
  const cols = 6, W = frames[0][1].width, H = frames[0][1].height, sh = w.document.createElement('canvas'); sh.width = W * cols; sh.height = H * Math.ceil(frames.length / cols);
  const g = sh.getContext('2d'); frames.forEach(([lb, c], i) => { g.drawImage(c, (i % cols) * W, Math.floor(i / cols) * H); g.fillStyle = '#ff0'; g.font = '11px monospace'; g.fillText(lb, (i % cols) * W + 3, Math.floor(i / cols) * H + 12); });
  const d = sh.toDataURL('image/jpeg', 0.8).split(',')[1], N = Math.ceil(d.length / 8000); for (let i = 0; i < N; i++) console.log(`[PBIMG] pov_${tool} ${i}/${N} ${d.slice(i * 8000, (i + 1) * 8000)}`);
}
