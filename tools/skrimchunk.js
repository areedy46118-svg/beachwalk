/* THE FLESH IN HIS FIST (2026-11-21, the owner: "MAKE THE FLESH FIT BETTER IN SKRIMS HAND"). In the whale, him digging; his
 * search put into its fling (`u.sk.sr.mode = 'fling'`), stills from where you would stand and close beside his hand while
 * he holds the piece, at four beats. Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/skrimchunk.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
b.placeInWhale();
const S = b.SKRIM, cam = b.camera.position, C = b.camera;
for (let i = 0; i < 400 && !(S.u && S.u.model && !(S.u.clipsPending > 0) && S.placed && S.u.clips.crouchIdle); i++) { b.frame(1); await sleep(50); }
w.__clockOn();
const u = S.u, P = u.g.position, T = P.constructor;
for (let i = 0; i < 60; i++) w.__adv(1);
const yaw = u.g.rotation.y;
cam.set(P.x + Math.sin(yaw + 0.9) * 3.2, P.y + 1.62, P.z + Math.cos(yaw + 0.9) * 3.2); b.camBaseY = cam.y;
const R = u.sk.sr; R.mode = 'fling'; R.t = 0; R.held = null;
const tiles = [];
const shotT = (lab, pos, at, fov = 50) => { const kq = C.quaternion.clone(), kp = cam.clone(), kf = C.fov; C.fov = fov; C.updateProjectionMatrix(); C.position.copy(pos); C.lookAt(at); C.updateMatrixWorld(true); b.renderer.render(b.scene, C); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height); g.fillStyle = '#ff0'; g.font = '12px monospace'; g.fillText(lab, 4, 13); tiles.push(c); C.position.copy(kp); C.quaternion.copy(kq); C.fov = kf; C.updateProjectionMatrix(); };
const hand = u.model.getObjectByName('Character1_RightHand');
let t = 0, done = {};
for (let f = 0; f < 60 * 1.7; f++) {
  w.__adv(1); t += 1 / 60;
  for (const tb of [0.9, 1.1, 1.3, 1.6]) if (t >= tb && !done[tb] && R.held) {
    done[tb] = 1; const H = hand.getWorldPosition(new T());
    shotT(`t ${tb} you`, cam.clone(), H.clone().setY(H.y - 0.1), 45);
    const side = new T(Math.sin(yaw - 1.2), 0, Math.cos(yaw - 1.2));
    shotT(`t ${tb} close`, H.clone().addScaledVector(side, 0.9).add(new T(0, 0.15, 0)), H, 40);
    const cm = R.held.m.getWorldPosition(new T()); log('t', tb, 'chunk from wrist', cm.distanceTo(H).toFixed(3), 'm, its size', (() => { R.held.m.geometry.computeBoundingSphere(); return (R.held.m.geometry.boundingSphere.radius * R.held.m.getWorldScale(new T()).x).toFixed(3); })());
  }
}
const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'chunk', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
