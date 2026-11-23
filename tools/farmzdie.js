/* THE RARE DEATH ON HIS FEET (2026-11-23): every farmer's death forced to it (`window.__bwZDieAll`); one killed in front of you: the
 * clip plays (how long, where his hips go — not into you), then the ragdoll from that pose; stills through it from your eye.
 * PB_PORT=4241 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/farmzdie.js' <out> */
w.__bwZDieAll = true;
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !units().some((x) => x.farm && x.farm.out && x.model && x.clips && x.clips.mZDie); i++) { w.__adv(2); await sleep(30); }
b.settings.devMode = true;
const P0 = b.dkSlotS(); if (P0.unit) { P0.unit.st.awake = false; P0.unit.g.position.y = -500; }
const C = b.camera, T = b.THREE;
const u = units().find((x) => x.farm && x.farm.out && x.model && x.clips && x.clips.mZDie);
if (!u) log('no man out'); else {
  for (const o of units()) if (o !== u) o.g.position.y -= 300;
  const p = u.g.position, f = new T.Vector3(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y));
  C.position.set(p.x + f.x * 2.2, p.y + 1.7, p.z + f.z * 2.2); b.camBaseY = C.position.y; b.lookAt(p.x, p.y + 1.0, p.z); w.__adv(2);
  const snap = []; const grab = (lb) => { C.position.set(p.x + f.x * 2.6 + f.z * 1.2, p.y + 1.6, p.z + f.z * 2.6 - f.x * 1.2); b.lookAt(p.x, p.y + 0.8, p.z); C.updateMatrixWorld(true); b.scene.updateMatrixWorld(true); b.renderer.render(b.scene, C); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 300; c.height = Math.round(300 * src.height / src.width); const g = c.getContext('2d'); g.filter = 'brightness(1.8)'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#ff0'; g.font = '11px monospace'; g.fillText(lb, 3, 12); snap.push(c); };
  u.lastHitMine = true; u.st.awake = true; b.hurtMutant(u, 99, 1);
  const hip0 = new T.Vector3(); let started = false, t = 0, ragAt = null, hipMax = 0;
  for (let i = 0; i < 360; i++) {
    b.lookAt(p.x, p.y + 0.9, p.z); w.__adv(1); t += 1 / 60;
    if (u.zDie && !started) { started = true; u.zHip.getWorldPosition(hip0); log('dying on his feet from', t.toFixed(2), 's: clip', u.zDie.dur.toFixed(2), 's'); }
    if (started && u.zHip && !u.rag) { const h = u.zHip.getWorldPosition(new T.Vector3()); hipMax = Math.max(hipMax, Math.hypot(h.x - hip0.x, h.z - hip0.z)); }
    if (u.rag && ragAt === null) { ragAt = t; log('ragdoll from', t.toFixed(2), 's'); }
    if (i % 18 === 0) grab(`${t.toFixed(2)}s ${u.zDie ? 'dying' : u.rag ? 'ragdoll' : '-'}`);
  }
  log('his hips moved sideways at most', hipMax.toFixed(2), 'm while dying | ragdoll started', ragAt !== null, '| alive', u.st.alive);
  const cols = 5, W = snap[0].width, H = snap[0].height, sh = w.document.createElement('canvas'); sh.width = W * cols; sh.height = H * Math.ceil(snap.length / cols);
  snap.forEach((c, i) => sh.getContext('2d').drawImage(c, (i % cols) * W, Math.floor(i / cols) * H));
  const d = sh.toDataURL('image/jpeg', 0.85).split(',')[1], N = Math.ceil(d.length / 8000); for (let i = 0; i < N; i++) console.log(`[PBIMG] zdie ${i}/${N} ${d.slice(i * 8000, (i + 1) * 8000)}`);
}
