/* THE ENEMY LOG'S SILHOUETTES (2026-11-23): every kind on the log's roster made (its stand-in, as after a load), posed in its idle
 * half a second in, turned as the box first shows it, drawn flat black with no light, cropped, and laid into one sheet of cells.
 * Out: [PBPNG] elog-shadows (the sheet) and [PBJSON] its cells by key — `tools/elogshadows.sh` writes them to assets/.
 *   PB_PORT=4223 PB_WAIT=1500 sh tools/probe.sh 'evalFile&f=/tools/elogshadows.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const T = b.THREE, keys = b.elogRosterS();
log('roster', keys.length, keys.join(','));
const CW = 176, CH = 160, COLS = 8;
const sheet = w.document.createElement('canvas'); sheet.width = CW * COLS; sheet.height = CH * Math.ceil(keys.length / COLS);
const sg = sheet.getContext('2d');
const R = new T.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(320, 400, false);
const sc = new T.Scene(), turn = new T.Group(); sc.add(turn); sc.overrideMaterial = new T.MeshBasicMaterial({ color: 0x000000, side: T.DoubleSide });
const cam = new T.PerspectiveCamera(30, 320 / 400, 0.05, 5000);
const map = {}, missing = [];
for (let i = 0; i < keys.length; i++) {
  const k = keys[i];
  let n = 0; for (; n < 2500 && !b.ELOG.snap[k] && b.ELOG.pend[k] !== 'fail'; n++) { b.elogEnsureS(k); b.frame(1); await sleep(12); }
  const S = b.ELOG.snap[k]; if (!S) { missing.push(k + '(' + b.ELOG.pend[k] + ')'); continue; }
  const root = S.root; root.traverse((o) => { if (!o.isMesh && !o.isSprite && !o.isPoints && !o.isLight) o.visible = true; });
  while (turn.children.length) turn.remove(turn.children[0]);
  turn.add(root); root.position.set(0, 0, 0);
  if (S.clip) { const mx = new T.AnimationMixer(root); mx.clipAction(S.clip).play(); mx.update(0.5); }
  // the turn whose outline is narrowest for its height, the box's own first turn (0.5) unless it is much wider (a spear across him)
  let best = null;
  for (const yaw of [0.5, 0.95, 0.1, 1.35, -0.35, 1.9]) {
    root.position.set(0, 0, 0); turn.rotation.y = yaw; turn.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(root, true), c = bb.getCenter(new T.Vector3());
    root.position.x -= c.x; root.position.z -= c.z; root.position.y -= bb.min.y; turn.updateMatrixWorld(true);
    const h = bb.max.y - bb.min.y, wd = Math.hypot(bb.max.x - bb.min.x, bb.max.z - bb.min.z), span = Math.max(h, wd * 1.25 / cam.aspect);
    const dist = span * 0.6 / Math.tan(T.MathUtils.degToRad(15)); cam.near = dist * 0.02; cam.far = dist + span * 4; cam.updateProjectionMatrix();
    cam.position.set(0, h * 0.5, dist); cam.lookAt(0, h * 0.5, 0);
    R.setClearColor(0, 0); R.clear(); R.render(sc, cam);
    const t = w.document.createElement('canvas'); t.width = 320; t.height = 400; const tg = t.getContext('2d'); tg.drawImage(R.domElement, 0, 0);
    const d = tg.getImageData(0, 0, 320, 400); let x0 = 320, y0 = 400, x1 = -1, y1 = -1;
    for (let y = 0; y < 400; y++) for (let x = 0; x < 320; x++) { const a = d.data[(y * 320 + x) * 4 + 3]; if (a > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 < 0) continue;
    const asp = (x1 - x0 + 1) / (y1 - y0 + 1), score = asp * (yaw === 0.5 ? 0.8 : 1);
    if (!best || score < best.score) best = { score, t, x0, y0, x1, y1, yaw };
    if (yaw === 0.5 && asp < 1.0) break;
  }
  const t = best ? best.t : null, x0 = best ? best.x0 : 0, y0 = best ? best.y0 : 0, x1 = best ? best.x1 : -1, y1 = best ? best.y1 : -1;
  if (x1 < 0) { missing.push(k + '(blank)'); continue; }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, K = Math.min((CW - 4) / bw, (CH - 4) / bh), dw = Math.max(1, Math.round(bw * K)), dh = Math.max(1, Math.round(bh * K));
  const cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * CH, ox = cx + Math.round((CW - dw) / 2), oy = cy + CH - 2 - dh;
  const s2 = w.document.createElement('canvas'); s2.width = dw; s2.height = dh; const g2 = s2.getContext('2d'); g2.imageSmoothingEnabled = true; g2.drawImage(t, x0, y0, bw, bh, 0, 0, dw, dh);
  const e = g2.getImageData(0, 0, dw, dh); for (let p = 0; p < e.data.length; p += 4) { const on = e.data[p + 3] > 110; e.data[p] = e.data[p + 1] = e.data[p + 2] = 0; e.data[p + 3] = on ? 255 : 0; }
  sg.putImageData(e, ox, oy);
  map[k] = [ox, oy, dw, dh];
  log('  ', k, 'made after', n, 'frames, drawn', bw + 'x' + bh, 'turn', best.yaw);
}
log('missing:', missing.join(',') || 'none');
console.log('[PBJSON] ' + JSON.stringify(map));
const u8 = sheet.toDataURL('image/png').split(',')[1], N = Math.ceil(u8.length / 8000);
for (let i = 0; i < N; i++) console.log(`[PBPNG] elog-shadows ${i}/${N} ${u8.slice(i * 8000, (i + 1) * 8000)}`);
