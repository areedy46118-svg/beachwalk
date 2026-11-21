/* WHAT FLASHES WHILE HE LOOKS AT THE POSTER (2026-11-19, the owner: "WHEN HE GLANCES AT THE POSTER YOU CAN SEE A CABINET TO
 * THE RIGHT OF THE WINDOW AND THE TEXTURES ARE FLASHING CRAZY"). The call stepped at 60 fps through `&t0=` .. +`&n=` frames
 * (default the poster glance's hold, 50.2 s), each frame read back, every pixel's change frame to frame summed: the frame
 * and a heat map beside it (hot = flashing). Run: PB_PORT=4251 PB_Q='&title=1' sh tools/probe.sh 'evalFile&f=/tools/glanceflicker.js' <out> */
const Q = new URLSearchParams(location.search), t0 = +(Q.get('t0') || 50.2), n = +(Q.get('n') || 30);
for (let i = 0; i < 300 && !(b.icCanRun && b.icCanRun()); i++) await sleep(100);
const st = w.document.querySelector('#overlay .start'); for (let i = 0; i < 900 && st.classList.contains('loading'); i++) await sleep(100);
st.click(); for (let i = 0; i < 60 && !(b.IC.on && b.IC.start); i++) await sleep(100);
const T = b.TB, IC = b.IC, ctx = b.audioCtx; T.raf && w.cancelAnimationFrame(T.raf); T.raf = 0;
IC.press = performance.now() - 60000;
const r = T.r, gl = r.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4), acc = new Float32Array(W * H); let prev = null;
for (let i = 0; i < n; i++) {
  IC.start = ctx.currentTime - (t0 + i / 60); b.icFrame(1 / 60, 0); b.tbRender();
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  if (prev) for (let k = 0; k < W * H; k++) acc[k] += Math.abs(px[k * 4] - prev[k * 4]) + Math.abs(px[k * 4 + 1] - prev[k * 4 + 1]) + Math.abs(px[k * 4 + 2] - prev[k * 4 + 2]);
  prev = px.slice();
}
const s = 0.5, w2 = Math.round(W * s), h2 = Math.round(H * s), c = w.document.createElement('canvas'); c.width = w2 * 2; c.height = h2; const g = c.getContext('2d');
g.drawImage(T.el, 0, 0, w2, h2);
const hc = w.document.createElement('canvas'); hc.width = W; hc.height = H; const hg = hc.getContext('2d'), im = hg.createImageData(W, H); let hot = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (H - 1 - y) * W + x, v = Math.min(255, acc[k] / n * 2.5), o = (y * W + x) * 4; im.data[o] = v; im.data[o + 1] = v * 0.3; im.data[o + 3] = 255; if (v > 60) hot++; }
hg.putImageData(im, 0, 0); g.drawImage(hc, w2, 0, w2, h2);
log('t0', t0, 'frames', n, 'pixels flashing (>60)', hot, 'of', W * H, '| cam', [T.cam.position.x, T.cam.position.y, T.cam.position.z].map((v) => v.toFixed(2)).join(','));
const d = c.toDataURL('image/jpeg', 0.88).split(',')[1], m = Math.ceil(d.length / 8000);
for (let i = 0; i < m; i++) console.log('[PBIMG]', 'glance', i + '/' + m, d.slice(i * 8000, (i + 1) * 8000));
