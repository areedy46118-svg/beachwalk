/* THE KEEP'S OUTSIDE BEHIND THE TAVERN WINDOW, WEIGHED (2026-11-26, the owner, with a still looking down out of the window: "fix this
 * laggy ass part too and the textures here"). Its meshes, heaviest first (faces, material, map size); the frame's real time at the
 * window looking out, down and back into the hall, with the outside shown and hidden; and stills of the view down.
 *   PB_PORT=4249 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/tavout.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(20); }
for (let i = 0; i < 600 && !b.TAV_YARDS.on; i++) { b.frame(1); await sleep(40); }
const O = b.TAV_YARDS, G = O.G; log('outside on', O.on, '| meshes', G ? G.children.length : 0);
b.settings.devMode = true; w.__clockOn();
const R = b.renderer, gl = R.getContext(), px = new Uint8Array(4), C = b.camera, X = -6000, Z = 12000;
const fl0 = b.tavInfoS().floor(X - 1.4, Z - 10, 810), fl = typeof fl0 === 'number' ? fl0 : fl0.f;
if (G) {
  const rows = G.children.map((m) => { const g = m.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3, mp = m.material.map && m.material.map.image; return [m.name, n | 0, m.material.type, mp ? (mp.width + 'x' + mp.height) : '-', m.frustumCulled]; }).sort((a, c) => c[1] - a[1]);
  log('faces total', rows.reduce((s, r) => s + r[1], 0), '| heaviest', JSON.stringify(rows.slice(0, 16)));
}
const time = (n = 30) => { const t = []; for (let i = 0; i < n; i++) { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t0 = performance.now(); R.render(b.scene, C); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); t.push(performance.now() - t0); } t.sort((a, c) => a - c); return t[t.length >> 1]; };
const views = [['out', -1.4, -12.7, 0, -0.1], ['down', -1.4, -12.7, 0.3, -0.85], ['down2', -2.0, -12.7, -0.4, -1.1], ['back', -1.4, -12.7, Math.PI, 0], ['hall', -1.4, -4, Math.PI, 0]];
for (const [nm, lx, lz, yaw, pitch] of views) {
  for (let i = 0; i < 6; i++) { C.position.set(X + lx, fl + 1.7, Z + lz); b.camBaseY = C.position.y; b.look(yaw, pitch); w.__adv(1); }
  R.info.autoReset = false; R.info.reset(); R.render(b.scene, C); const calls = R.info.render.calls, tris = R.info.render.triangles; R.info.autoReset = true;
  const on = time();
  if (G) G.visible = false; R.info.autoReset = false; R.info.reset(); R.render(b.scene, C); const calls2 = R.info.render.calls, tris2 = R.info.render.triangles; R.info.autoReset = true; const off = time(); if (G) G.visible = true;
  log(nm.padEnd(6), '| shown', on.toFixed(2), 'ms', calls, 'calls', (tris / 1000).toFixed(0) + 'k', '| hidden', off.toFixed(2), 'ms', calls2, 'calls', (tris2 / 1000).toFixed(0) + 'k');
  if (nm.startsWith('down')) { C.updateMatrixWorld(true); shot('out_' + nm, 640, 1.0); }
}
// (the owner's view: on the threshold of a broken bay, looking down along the building's face — &edge=1)
if (new URLSearchParams(w.parent.location.search).get('edge')) {
  b.tavRailBreakS(0); for (let i = 0; i < 4; i++) w.__adv(1);
  for (const [nm, yaw, pitch] of [['edgeR', -0.6, -0.85], ['edgeR2', -1.0, -1.15], ['edgeL', 0.6, -0.85], ['edgeD', -0.2, -1.3]]) {
    for (let i = 0; i < 6; i++) { C.position.set(X - 2.4, fl + 1.7, Z - 13.42); b.camBaseY = C.position.y; b.look(yaw, pitch); w.__adv(1); }
    C.updateMatrixWorld(true); shot('out_' + nm, 640, 1.0);
  }
}
log('DONE');
