/* THE SCOURGER, LOOKED AT (2026-11-26, the owner: "the final boss needs to be bigger and actually hold his weapon it floats beside
 * him … make him more visible in the black and white setting"). Stills of him in the temple, front / side / 3/4, in his clips
 * (&clips=idle,walk,sAtk&fr=0.3), graded as the fight grades it (grayscale, contrast) — and his fist against the axe's haft: the
 * nearest axe vertex to the palm, per clip and frame.
 *   PB_PORT=4267 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/scourgelook.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.natDone !== undefined); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE; w.__clockOn();
b.KING.mode = 'ready'; u.g.visible = true; for (let i = 0; i < 30; i++) w.__adv(1);
const Q = new URLSearchParams(location.search), CL = (Q.get('clips') || 'idle,walk,sAtk,sCutB').split(','), FR = +(Q.get('fr') || 0.3);
const life = u.life; u.life = null;
let axe = null; u.model.traverse((o) => { if (!axe && o.isMesh && /axe/i.test(o.name)) axe = o; });
const hand = u.model.getObjectByName('Character1_RightHand'), knk = u.model.getObjectByName('MFinger1_R');
log('clipSpeed sStalk', u.clipSpeed && u.clipSpeed.sStalk, 'kSprint', u.clipSpeed && u.clipSpeed.kSprint, '| clips', ['sFly', 'sLand', 'kSlam', 'sStalk'].map((k) => k + ':' + (u.clips[k] ? u.clips[k].getClip().duration.toFixed(2) + 's/' + u.clips[k].getClip().tracks.length : 'NONE')).join(' '));
log('axe', axe && axe.name, 'parent', axe && axe.parent && axe.parent.name, 'scale', axe && axe.scale.toArray().map((v) => v.toFixed(3)).join(','), '| model scale', u.model.scale.x.toFixed(3), 'g scale', u.g.scale.x.toFixed(3));
let skin = null; u.model.traverse((o) => { if (o.isSkinnedMesh && !skin) skin = o; });
const box = new T.Box3().setFromObject(u.model); log('his box', box.min.toArray().map((v) => v.toFixed(2)).join(','), '->', box.max.toArray().map((v) => v.toFixed(2)).join(','));
const C = b.camera, gp = u.g.position.clone(); C.fov = 40; C.updateProjectionMatrix(); log('g at', gp.toArray().map((x) => x.toFixed(2)).join(','));
const grade = (name) => {   // (as `tmpFilter` grades the fight at KA.k = 1)
  b.renderer.render(b.scene, C);
  const src = b.renderer.domElement, c = document.createElement('canvas'); c.width = 520; c.height = Math.round(520 * src.height / src.width);
  const g2 = c.getContext('2d'); g2.filter = 'grayscale(1) contrast(1.24) brightness(0.94)'; g2.drawImage(src, 0, 0, c.width, c.height);
  const d = c.toDataURL('image/jpeg', 0.8).split(',')[1], n = Math.ceil(d.length / 8000);
  for (let i = 0; i < n; i++) console.log('[PBIMG]', name, i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
};
const pos = axe.geometry.attributes.position, v = new T.Vector3();
for (const nm of CL) {
  const a = u.clips[nm]; if (!a) { log('no clip', nm); continue; }
  for (const k in u.clips) u.clips[k].stop();
  a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true; a.time = a.getClip().duration * FR; u.mixer.update(0); b.kingAxeHoldS(u, ['sFly', 'sLand'].includes(a.getClip().name) ? 0 : 1); u.g.updateMatrixWorld(true);
  const palm = hand.getWorldPosition(new T.Vector3()).add(knk.getWorldPosition(new T.Vector3())).multiplyScalar(0.5);
  let nd = 1e9; for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(axe.matrixWorld); nd = Math.min(nd, v.distanceTo(palm)); }
  log(nm, FR, '| palm', palm.clone().sub(gp).toArray().map((x) => x.toFixed(2)).join(','), '| nearest axe point to the palm', nd.toFixed(3), 'm');
  const bx = new T.Box3().setFromObject(u.model), cc = bx.getCenter(new T.Vector3()), H = bx.max.y - bx.min.y;
  for (const [cn, ang, dist] of (Q.get('cams') === 'one' ? [['q', 0.8, 8]] : [['front', 0, 9], ['side', Math.PI / 2, 9], ['q', 0.8, 7]])) {
    const yaw = u.g.rotation.y + ang; C.position.set(cc.x + Math.sin(yaw) * dist, bx.min.y + 1.7, cc.z + Math.cos(yaw) * dist); C.lookAt(cc.x, cc.y, cc.z); C.updateMatrixWorld(true);
    grade(`${nm}_${cn}`);
  }
}
u.life = life;
log('DONE');
