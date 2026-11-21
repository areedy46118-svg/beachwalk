/* THE TEMPLE'S FLOOR AGAINST ITS SAND (2026-11-21): at radii from the middle, the sand mesh's height (`tmpSandRaw`), the walk's
 * (`tmpFloorAt`), and the carved floor's own top (a ray down onto the temple's model, the sand hidden). Room frame, metres.
 * Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/templeheights.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
const T = b.THREE, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, W = b.scene.getObjectByName('temple'), sand = b.scene.getObjectByName('desertSand');
W.updateMatrixWorld(true); const rc = new T.Raycaster();
const model = []; W.traverse((o) => { if (o.isMesh && o !== sand && /^Object_/.test(o.name)) model.push(o); });
log('TMP_FLOOR', b.TMP_FLOOR, 'POD_R', b.TMP_POD_R);
for (const r of (new URLSearchParams(location.search).get('rs') || '0,2,4,5.5,7,9,11,12.5,13.5,15').split(',').map(Number)) {
  const x = r, z = 0.3;
  rc.set(new T.Vector3(X + x, Y + 30, Z + z), new T.Vector3(0, -1, 0)); const h = rc.intersectObjects(model, false)[0];
  log('r', r, '| sand', b.tmpSandRaw ? b.tmpSandRaw(x, z).toFixed(3) : '?', '| walk', b.tmpFloorAt(x, z).toFixed(3), '| carved floor', h ? (h.point.y - Y).toFixed(3) + ' ' + h.object.name : '-');
}
