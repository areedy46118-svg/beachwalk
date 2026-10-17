/* THE PUPPET ON THE FIRE, THE TAPS, THE HOUSE. Not part of the game.
 *   await import('/tools/elvtest.js'); await import('/tools/still.js'); await import('/tools/burntest.js');
 *   await __elvBoot(); await __elvTo('carry');   // the puppet in your arms, upstairs
 *   __clockOn()                                 // the loop frozen and a fake clock: `__adv(n)` runs n frames of 1/60 s
 *   __atFire(d)                                 // on the sand d metres from the fire, looking at it
 *   __hl(x, y, z), __still([...])               // (still.js) */
const W = window;
W.__clockOn = () => {
  const b = W.__bw;
  if (W.__advOn) return;
  W.__advOn = true;
  W.requestAnimationFrame = () => 0;
  const real = performance.now.bind(performance), base = real(); let off = 0, creep = 0;
  performance.now = () => base + off + (creep += 0.01);
  W.__adv = (n = 1) => { for (let i = 0; i < n; i++) { off += 16.7; b.frame(1); } };
};
W.__atFire = (d = 2.2, side = 1) => {
  const b = W.__bw, C = b.ELV_CAMP || { x: 8.2, z: -697 };
  const x = C.x + d * 0.35 * side, z = C.z + d * 0.94;
  b.camera.position.set(x, 1.7, z); b.camBaseY = 1.7;
  b.lookAt(C.x, 0.35, C.z);
  return [x, z];
};
/* the game's own frame, as you see it (the hands' scene and all): n frames on, then the canvas copied out at once */
W.__pov = (n = 1, w = 640, gain = 1) => {
  W.__adv(n);
  const src = W.__bw.renderer.domElement, h = Math.round(w * src.height / src.width);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.filter = gain !== 1 ? `brightness(${gain})` : 'none'; g.drawImage(src, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
};
/* a strip of the game's own frames: `shots` frames `every` apart, two across */
W.__povStrip = (shots = 6, every = 20, w = 400, gain = 1) => {
  const src = W.__bw.renderer.domElement, h = Math.round(w * src.height / src.width);
  const c = document.createElement('canvas'); c.width = w * 2; c.height = Math.ceil(shots / 2) * h;
  const g = c.getContext('2d'); g.filter = gain !== 1 ? `brightness(${gain})` : 'none';
  for (let i = 0; i < shots; i++) { W.__adv(every); g.drawImage(src, (i % 2) * w, Math.floor(i / 2) * h, w, h); }
  return c.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
};
