/* DO THE FARMERS' WEAPONS TWIST WHEN THEY LOOK ROUND? (2026-11-25, the owner: "their weapons should [not] be twisting all over when they
 * look different directions its held how its held"). You circle the garrison at ~4 m (devMode: nobody dies), every live armed man out
 * of a swing is read each frame: the weapon's turn RELATIVE TO HIS CHEST (Spine2) in °/s, the wrist's carry turn off his clip's own
 * hand (`u.fcyOrig`), and the largest one-frame turn of each.   PB_PORT=4247 sh tools/probe.sh 'evalFile&f=/tools/farmlook.js&secs=60' <out> */
const Q = new URLSearchParams(location.search), SECS = +(Q.get('secs') || 60), TAG = Q.get('tag') || 'x';
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS(), V3 = b.camera.position.constructor, Qt = b.camera.quaternion.constructor;
for (let i = 0; i < 400 && !(units().filter((x) => x.model).length >= 18); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = true; if (Q.get('old')) w.__bwCarryAtFoe = true;
const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.visible = false; }
const cam = b.camera.position, c0 = [cam.x, cam.z];
const chestOf = (u) => { if (u.__ch === undefined) { u.__ch = null; u.model.traverse((o) => { if (!u.__ch && o.isBone && /Spine2(_|$)/.test(o.name)) u.__ch = o; }); } return u.__ch; };
const rFull = [], rEase = [], big = {}, rateH = [], rate = [], wrist = [], one = []; let n = 0, t = 0;
for (let f = 0; f < SECS * 60; f++) {
  t += 1 / 60;
  // you walk a slow circle round where you began, looking at the nearest of them
  const a = t * 0.5; cam.x = c0[0] + Math.sin(a) * 2.5; cam.z = c0[1] + Math.cos(a) * 2.5;
  const live = units().filter((u) => u.st.alive && u.farm && u.farm.out && u.farmTool && u.model && u.g.visible);
  const nr = live.sort((p, q) => p.g.position.distanceTo(cam) - q.g.position.distanceTo(cam))[0];
  if (nr) b.lookAt(nr.g.position.x, cam.y - 0.1, nr.g.position.z);
  if (P0.unit) P0.unit.g.position.y = -500;
  w.__adv(1); b.heal();
  for (const u of live) {
    const ch = chestOf(u); if (!ch) continue;
    ch.updateWorldMatrix(true, false); u.farmTool.updateWorldMatrix(true, false);
    const rel = ch.getWorldQuaternion(new Qt()).invert().multiply(u.farmTool.getWorldQuaternion(new Qt()));
    const hq = new Qt().setFromAxisAngle(new V3(0, 1, 0), u.g.rotation.y + (u.model.rotation.y || 0)), relH = hq.invert().multiply(u.farmTool.getWorldQuaternion(new Qt()));
    const free = !(u.st.atk >= 0) && !(u.st.stun > 0) && !(u.st.recoil > 0) && !((u.st.down || 0) > 0);
    if (free && u.__relH && u.__free) { const dh = 2 * Math.acos(Math.min(1, Math.abs(u.__relH.dot(relH)))) * 57.3; rateH.push(dh * 60); }
    if (free && u.__rel && u.__free) { const d = 2 * Math.acos(Math.min(1, Math.abs(u.__rel.dot(rel)))) * 57.3; rate.push(d * 60); one.push(d); n++; ((u.farmCarryK || 0) > 0.95 ? rFull : rEase).push(d * 60); if (d > 6) (big[(u.farmCarryK || 0) > 0.95 ? (u.st.awake ? 'full-awake' : 'full-calm') : 'easing'] = (big[(u.farmCarryK || 0) > 0.95 ? (u.st.awake ? 'full-awake' : 'full-calm') : 'easing'] || 0) + 1); }
    if (free && u.fcyOrig && u.bones && u.bones.hand) wrist.push(2 * Math.acos(Math.min(1, Math.abs(u.fcyOrig.dot(u.bones.hand.quaternion)))) * 57.3);
    u.__rel = rel; u.__relH = relH; u.__free = free;
  }
  if (f % 600 === 0) await sleep(1);
}
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(0) : '-'; };
log(TAG, 'SPLIT carry full °/s median', pct(rFull, 0.5), 'p90', pct(rFull, 0.9), 'n', rFull.length, '| easing median', pct(rEase, 0.5), 'p90', pct(rEase, 0.9), 'n', rEase.length, '| frames over 6° by', JSON.stringify(big).replace(/"/g, ''));
log(TAG, 'LOOK frames', n, '| weapon turn off his chest °/s median', pct(rate, 0.5), 'p90', pct(rate, 0.9), 'p99', pct(rate, 0.99), '| off his HEADING °/s median', pct(rateH, 0.5), 'p90', pct(rateH, 0.9), 'p99', pct(rateH, 0.99), '| one frame max', pct(one, 1), '° | frames over 6°', one.filter((d) => d > 6).length,
  '| wrist off his clip median', pct(wrist, 0.5) + '° p90', pct(wrist, 0.9) + '° max', pct(wrist, 1) + '°');
