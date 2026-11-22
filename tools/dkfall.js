/* THE PALADIN FALLING, AS YOU SEE IT (2026-11-21, the owner: "the paladins fall is bad you need to fix that"). One spawned 4.5 m
 * in front of you on the beach (devMode); five heavies land → his knockdown, stills every 0.2 s from the side through the fall,
 * the lie and the get-up; then the blow that kills him and his death the same way. Each still logs his hips' height over the
 * sand and his feet's, so a body through the floor or hanging over it shows as numbers too.
 * Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/dkfall.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera, cam = C.position, T = b.THREE;
const u = b.dkSpawnTest(cam.x + 4.5, cam.z);
for (let i = 0; i < 400 && !(u.clips && (u.clips.knock || u.clips.knockOut) && !u.clipsPending); i++) { b.frame(1); await sleep(50); }
u.st.awake = true; u.st.hp = 999;
for (let i = 0; i < 30; i++) adv(1);
const P = u.g.position, tiles = [];
const bone = (n) => u.model && (u.model.getObjectByName(n) || null);
const hipsName = Object.keys(u.kind.rag || {}).length ? (u.kind.rag.Character1_Hips || 'Hips') : 'Hips';
const lowest = () => { let lo = 1e9; u.model.traverse((o) => { if (o.isBone && /Foot|Toe/i.test(o.name)) lo = Math.min(lo, o.getWorldPosition(new T.Vector3()).y); }); return lo; };
const hipY = () => { let h = null; u.model.traverse((o) => { if (!h && o.isBone && /Hips|pelvis/i.test(o.name)) h = o; }); return h ? h.getWorldPosition(new T.Vector3()).y : NaN; };
const shotSide = (lab) => {
  const keep = cam.clone(), kq = C.quaternion.clone();
  let H = null; u.model.traverse((o) => { if (!H && o.isBone && /Hips|pelvis/i.test(o.name)) H = o; }); const hp = H ? H.getWorldPosition(new T.Vector3()) : P.clone();
  const fl = b.sandHeight ? b.sandHeight(hp.x, hp.z) : P.y;
  C.position.set(hp.x + 0.6, fl + 1.1, hp.z + 3.6); C.lookAt(hp.x, fl + 0.55, hp.z); C.fov = 55; C.updateProjectionMatrix(); C.updateMatrixWorld(true);
  b.renderer.render(b.scene, C);
  const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 320; c.height = Math.round(320 * src.height / src.width);
  const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height); g.fillStyle = '#f33'; g.font = '11px monospace'; g.fillText(lab, 4, 12); tiles.push(c);
  C.position.copy(keep); C.quaternion.copy(kq);
};
const watch = async (tag, secs, every) => {
  let t = 0, next = 0;
  for (let f = 0; f < secs * 60; f++) {
    adv(1); t += 1 / 60; b.lookAt(P.x, P.y + 1.2, P.z);
    if (t >= next) { next += every; const lab = `${tag} ${t.toFixed(1)} ${u.cur ? u.cur.getClip().name : '-'} hips ${(hipY() - P.y).toFixed(2)} feet ${(lowest() - P.y).toFixed(2)}`; log(lab, 'down', (u.st.down || 0).toFixed(2), 'alive', u.st.alive, 'rag', !!u.rag); shotSide(lab); }
  }
};
// the knockdown
for (let k = 0; k < 5; k++) { b.hurtMutant(u, 1, 2.0, null); for (let i = 0; i < 72; i++) { adv(1); b.lookAt(P.x, P.y + 1.2, P.z); } if ((u.st.down || 0) > 0) break; }
log('down after heavies:', (u.st.down || 0).toFixed(2));
await watch('knock', 2.6, 0.15);
// and his death
u.st.hp = 2; b.hurtMutant(u, 5, 2.0, null);
await watch('death', 2.0, 0.2);
const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.8).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'fall', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
