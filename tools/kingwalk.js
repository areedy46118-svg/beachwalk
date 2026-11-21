/* THE KING BETWEEN HIS BLOWS (2026-11-21: `kingPersona`): the fight on, you standing 5.5 m off; whenever he is not swinging, a
 * still from beside him (3.5 m, at his chest) every 0.35 s, 12 of them, with his speed and the persona's weight and look.
 * `&off=1`: the layer off (for a before/after). Run: PB_PORT=4266 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/kingwalk.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), OFF = !!+(Q.get('off') || 0);
b.settings.devMode = false;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0);
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
C.position.set(X - 20, Y + F + 1.7, Z); b.lookAt(X, Y + F + 2, Z);
for (let i = 0; i < 600 && b.kingS().mode !== 'descend'; i++) adv(1);
for (let i = 0; i < 30; i++) adv(1); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })); adv(4);
if (OFF) u.kind.postClip = null;
const tiles = []; let last = -1, lp = u.g.position.clone();
for (let f = 0; f < 60 * 40 && tiles.length < 12; f++) {
  const p = u.g.position, dx = C.position.x - p.x, dz = C.position.z - p.z, d = Math.hypot(dx, dz) || 1;
  C.position.x = p.x + dx / d * 9; C.position.z = p.z + dz / d * 9; b.lookAt(p.x, p.y + 1.6, p.z);
  adv(1); if (b.state().hp < 4) b.heal();
  const v = lp.distanceTo(p) * 60; lp.copy(p);
  if (u.st.atk < 0 && (b.kingS().mode === 'fight' || b.kingS().mode === 'hunt') && f - last > 12) {
    last = f;
    const keep = C.position.clone(), kq = C.quaternion.clone(), kf = C.fov;
    const yw = u.g.rotation.y, sx = Math.cos(yw), sz = -Math.sin(yw);
    C.fov = 45; C.updateProjectionMatrix(); C.position.set(p.x + sx * 3.8, p.y + 1.5, p.z + sz * 3.8); C.lookAt(p.x, p.y + 1.25, p.z); C.updateMatrixWorld(true);
    b.renderer.render(b.scene, C);
    const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 300; c.height = Math.round(300 * src.height / src.width);
    const g = c.getContext('2d'); g.filter = src.style.filter || 'none'; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none'; g.fillStyle = '#f33'; g.font = '11px monospace';
    g.fillText(`${(f / 60).toFixed(1)}s v ${v.toFixed(1)} ${u.cur ? u.cur.getClip().name : ''}`, 4, 12); tiles.push(c);
    C.position.copy(keep); C.quaternion.copy(kq); C.fov = kf; C.updateProjectionMatrix();
  }
}
const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.85).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'walk', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
log('stills', tiles.length);
