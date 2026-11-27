/* THE TAVERN WINDOW'S LAG (2026-11-26, the owner: "i lag a little on the edge of the tavern window when standing"). Stands you
 * at points down the hall to the window and on its edge, looking out and down, and times each: the whole frame (a 1-pixel
 * read syncs the GPU), update() alone, and the draw calls / triangles.
 *   python3 -I tools/cpuprof.py 'evalFile&f=/tools/tavlag.js' --q '&still=1&prof=1' --min 4   (the spikes' own profiles)
 *   PB_PORT=4243 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/tavlag.js' <out>      (&who=1: the top draws at each) */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(20); }
for (let i = 0; i < 300; i++) { b.frame(1); await sleep(20); }      // (the keep's outside builds once the keep is in)
w.__clockOn();
const R = b.renderer, gl = R.getContext(), px = new Uint8Array(4), C = b.camera, X = -6000, Z = 12000;
const fl0 = b.tavInfoS().floor(X - 1.4, Z - 10, 800 + 10), fl = typeof fl0 === 'number' ? fl0 : fl0.f;
const Q = new URLSearchParams(w.parent.location.search);
if (Q.get('who') && !w.__whoDraws) w.eval(await (await fetch('/tools/perf.js?' + Date.now())).text());
const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
const at = (nm, lx, lz, yaw, pitch) => {
  b.settings.devMode = true;
  const put = () => { C.position.set(X + lx, fl + 1.7, Z + lz); b.camBaseY = C.position.y; b.look(yaw, pitch); };
  for (let i = 0; i < 40; i++) { put(); w.__adv(1); }
  const full = [], upd = [], ren = [];
  for (let i = 0; i < 40; i++) {
    put(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let t0 = performance.now(); w.__adv(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); full.push(performance.now() - t0);
    put(); t0 = performance.now(); b.step(1 / 60); upd.push(performance.now() - t0);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); t0 = performance.now(); R.render(b.scene, C); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ren.push(performance.now() - t0);
  }
  R.info.autoReset = false; R.info.reset(); R.render(b.scene, C); const calls = R.info.render.calls, tris = R.info.render.triangles; R.info.autoReset = true;
  const mx = Math.max(...full);
  log(nm.padEnd(22), 'frame', med(full).toFixed(2), 'max', mx.toFixed(2), '| update', med(upd).toFixed(2), 'max', Math.max(...upd).toFixed(2), '| render', med(ren).toFixed(2), '| calls', calls, 'tris', (tris / 1000).toFixed(0) + 'k', '| out', !!b.tavOutS(), 'z', (C.position.z - Z).toFixed(2));
  if (Q.get('who')) { const r = w.__whoDraws(8); log('   who', r.calls, r.tris, JSON.stringify(r.top)); }
};
const still = (nm, lx, lz, yaw, pitch, n = 300) => {
  const put = () => { C.position.set(X + lx, fl + 1.7, Z + lz); b.camBaseY = C.position.y; b.look(yaw, pitch); };
  for (let i = 0; i < 30; i++) { put(); w.__adv(1); }
  const upd = [], ren = [], spikes = [];
  for (let i = 0; i < n; i++) {
    const pf = Q.get('prof'); if (pf) console.profile(nm + ' #' + i); let t0 = performance.now(); b.step(1 / 60); const u = performance.now() - t0; upd.push(u); if (pf) { console.profileEnd(nm + ' #' + i); if (u > 3) log('SPIKE', nm + ' #' + i, u.toFixed(1)); }
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); t0 = performance.now(); R.render(b.scene, C); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const r = performance.now() - t0; ren.push(r);
    if (u > 4 || r > 9) spikes.push(i + ':' + u.toFixed(1) + '/' + r.toFixed(1));
  }
  log('STILL', nm.padEnd(20), 'update med', med(upd.slice()).toFixed(2), 'max', Math.max(...upd).toFixed(2), '| render med', med(ren.slice()).toFixed(2), 'max', Math.max(...ren).toFixed(2), '| z', (C.position.z - Z).toFixed(2), '| spikes', spikes.length, spikes.slice(0, 30).join(' '));
};
if (Q.get('still')) {
  b.tavOutResetS(); b.tavRailS().bays.forEach((y) => { y.dead = false; }); b.settings.devMode = false;
  if (!Q.get('prof')) still('hall middle', -1.4, -4, 0, 0);
  still('at railing whole', -1.4, -12.7, 0, 0);
  still('at railing, pressing', -1.4, -12.6, 0, 0);
  b.tavRailBreakS(0); for (let i = 0; i < 4; i++) w.__adv(1);
  still('edge broken bay', -2.4, -12.88, 0, 0);
  log('DONE');
}
b.tavOutResetS(); b.tavRailS().bays.forEach((y) => { y.dead = false; });
at('hall middle, out', -1.4, -4, 0, 0);
at('hall 8 m, out', -1.4, -8, 0, 0);
at('3 m from it, out', -1.4, -10, 0, 0);
at('1 m from it, out', -1.4, -11.8, 0, 0);
at('at railing, out', -1.4, -12.7, 0, 0);
at('at railing, down', -1.4, -12.7, 0, -0.9);
at('at railing, back', -1.4, -12.7, Math.PI, 0);
b.tavRailBreakS(0); for (let i = 0; i < 4; i++) w.__adv(1);
at('edge, bay broken, out', -2.4, -12.88, 0, 0);
at('edge, bay broken, down', -2.4, -12.88, 0, -0.9);
log('DONE');
