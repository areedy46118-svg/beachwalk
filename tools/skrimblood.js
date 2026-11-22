/* SKRIM'S HOOKS TOLD BY BLOOD (2026-11-21, the owner: "THERE SHOULD BE A INDICATION WHERE SKRIMS HOOKS ARE ABOUT TO COME OUT
 * OF THE GROUND SOME SORT OF BLOOD EFFECT ON THE GROUND BEFORE THEY SHOOT OUT"). In the whale, him placed (his chains made),
 * you 6 m off his spot; a pit's tell (r 1.7, 0.9 s) 3.5 m in front of you, stills through its wind-up, its burst and its
 * soaking away; then a line's tells (one under each chain, its own beat) out from a point beside you. Through the real
 * frame (the ground mist on). Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/skrimblood.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
b.placeInWhale();
const S = b.SKRIM;
for (let i = 0; i < 600 && !(S.u && S.u.model && S.placed && b.SKC.ready); i++) { b.frame(1); await sleep(50); }
log('skrim', !!S.u, 'chains ready', b.SKC.ready, 'tells', b.SKC.tells.length);
w.requestAnimationFrame = () => 0;
const cam = b.camera.position, P = S.u.g.position;
const put = (x, z) => { cam.x = x; cam.z = z; const fy = b.skrimFloorW(x, z); b.groundY = fy; cam.y = fy + 1.62; b.camBaseY = cam.y; };
const sp = b.whaleS().arena.skrimSpot;
put(P.x, P.z - 6); b.lookAt(P.x, P.y + 0.3, P.z);
for (let i = 0; i < 20; i++) b.frame(1);
const tiles = [];
const shotT = (lab) => { b.renderer.render(b.scene, b.camera); const src = b.renderer.domElement, c = w.document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * src.height / src.width); const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height); g.fillStyle = '#ff0'; g.font = '12px monospace'; g.fillText(lab, 4, 13); tiles.push(c); };
const fx = cam.x + (P.x - cam.x) * 0.45, fz = cam.z + (P.z - cam.z) * 0.45;
b.lookAt(fx, b.skrimFloorW(fx, fz) + 0.4, fz);
const T = b.skcTell(fx, fz, 1.7, 0.9);
{ const R = new b.THREE.Raycaster(new b.THREE.Vector3(fx, cam.y + 3, fz), new b.THREE.Vector3(0, -1, 0)); R.camera = b.camera; const hs = R.intersectObjects(b.scene.children.filter((o) => !o.isSprite && !o.isPoints), true).filter((h) => !h.object.isSprite).filter((h) => h.object.visible && !h.object.userData.bwGhost).slice(0, 3);
  log('pool at', T.m.position.toArray().map((v) => v.toFixed(2)).join(','), 'in scene', !!T.m.parent, 'visible', T.m.visible, 'floorW', b.skrimFloorW(fx, fz).toFixed(2), 'drawn hits', hs.map((h) => h.object.name + '@' + h.point.y.toFixed(2)).join(' | '), 'cam', cam.toArray().map((v) => v.toFixed(1)).join(','), 'fog', b.scene.fog && b.scene.fog.density); }
const run = (secs, every, tag) => { let t = 0, nx = 0; for (let f = 0; f < secs * 60; f++) { b.updateSkrimChains(1 / 60); t += 1 / 60; if (t >= nx) { nx += every; shotT(`${tag} ${t.toFixed(2)}s op ${T.m.material.opacity.toFixed(2)} drops ${b.SKBS().filter((d) => d.t < d.life).length}`); } } };
run(0.9, 0.15, 'pit tell'); 
T.done = true; run(1.6, 0.25, 'burst+soak');
// a line out across in front of you
const L = []; for (let i = 1; i <= 8; i++) { const x = cam.x + (fx - cam.x) * 0.3 + i * 0.9, z = fz; const Tq = b.skcTell(x, z, 0.6, Math.max(0.12, i * 0.085)); Tq.auto = i * 0.085 + 0.02; L.push(Tq); }
b.lookAt(fx + 3, b.skrimFloorW(fx, fz) + 0.3, fz);
run(0.8, 0.1, 'line');
const cols = 4, tw = tiles[0].width, th = tiles[0].height, cv = w.document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(tiles.length / cols) * th;
const g = cv.getContext('2d'); tiles.forEach((c, i) => g.drawImage(c, (i % cols) * tw, ((i / cols) | 0) * th));
const d = cv.toDataURL('image/jpeg', 0.82).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'blood', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
