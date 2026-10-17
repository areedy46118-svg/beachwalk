/* A STILL FROM ANYWHERE. Not part of the game. The loop frozen, the camera put at (x, y, z) looking at (tx, ty, tz),
 * one render, the camera put back.   await import('/tools/still.js');
 *   __still([[x, y, z, tx, ty, tz, fov], ...], w, gain)  -> padded base64 jpeg, two across
 *   __hl(x, y, z) house-local to world (`[x, y, z]`) */
const W = window;
import('three').then((T) => { W.__T = T; });
W.__hl = (x, y, z) => { const H = W.__bw.scene.getObjectByName('puppetHouse'); return [H.position.x + x, H.position.y + y, H.position.z + z]; };
W.__still = (shots, w = 480, gain = 1) => {
  const b = W.__bw, r = b.renderer, src = r.domElement, cam = b.camera;
  W.requestAnimationFrame = () => 0;
  const s0 = r.getSize(new W.__T.Vector2());
  const p0 = cam.position.clone(), q0 = cam.quaternion.clone(), f0 = cam.fov, a0 = cam.aspect;
  const h = Math.round(w * 9 / 16); r.setSize(w, h, false);
  const c = document.createElement('canvas'); c.width = w * Math.min(2, shots.length); c.height = Math.ceil(shots.length / 2) * h;
  const g = c.getContext('2d');
  shots.forEach(([x, y, z, tx, ty, tz, fov], i) => {
    cam.position.set(x, y, z); cam.fov = fov || 70; cam.aspect = 16 / 9; cam.updateProjectionMatrix(); cam.lookAt(tx, ty, tz); cam.updateMatrixWorld(true);
    r.render(b.scene, cam);
    g.filter = gain !== 1 ? `brightness(${gain})` : 'none';
    g.drawImage(src, (i % 2) * w, Math.floor(i / 2) * h, w, h);
  });
  r.setSize(s0.x, s0.y, false);
  cam.position.copy(p0); cam.quaternion.copy(q0); cam.fov = f0; cam.aspect = a0; cam.updateProjectionMatrix();
  return c.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
};
