/* HARNESS STILLS. Not part of the game.  eval(await (await fetch('/tools/cap.js')).text());
 * __cap([{p:[x,y,z], l:[x,y,z]}, ...]) -> base64 jpeg, padded so the tool writes it to a file. */
window.__cap = function (views, W = 640) {
  const b = window.__bw, R = b.renderer, cv = R.domElement; const out = document.createElement('canvas');
  const h = Math.round(W * cv.height / cv.width); out.width = W; out.height = h * views.length; const g = out.getContext('2d');
  views.forEach((v, i) => {
    for (let k = 0; k < (v.n || 3); k++) { b.camera.position.set(...v.p); b.camBaseY = v.p[1]; b.lookAt(...v.l); b.frame(1); }
    b.camera.position.set(...v.p); b.lookAt(...v.l); b.frame(1); g.drawImage(cv, 0, i * h, W, h);
  });
  return out.toDataURL('image/jpeg', 0.85).split(',')[1] + '#' + 'x'.repeat(120000);
};
window.__mute = function () { for (const id of ['s-vol', 's-music', 's-wave', 's-sfx']) { const e = document.getElementById(id); if (!e) continue; e.value = 0; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')); } };
