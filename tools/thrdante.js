/* Into the throne room in short steps, muted, for the beast's scene. Not part
 * of the game. Each step returns quickly so a harness call never wedges:
 *   await import('/tools/thrdante.js'); __tdMute(); await __tdGo()  (repeat until 'in')
 * __tdGo advances one stage per call and says where it got to. */
(function () {
  window.__tdMute = () => {
    const AC = window.AudioContext; if (AC.__bwMuted) return 'already';
    AC.prototype.resume = function () { return Promise.resolve(); };
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
    const W = function (...a) { const c = new AC(...a); try { c.suspend(); } catch (e) { /* fine */ } return c; };
    W.prototype = AC.prototype; W.__bwMuted = true; window.AudioContext = W;
    return 'muted';
  };
  let stage = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__tdGo = async () => {
    const b = window.__bw;
    if (stage === 0) {
      try { b.beginGame(); } catch (e) { /* begun */ }
      await import('/tools/c13shot.js'); await import('/tools/roomshot.js');
      b.settings.devMode = true; stage = 1;
    }
    if (stage === 1) {
      for (let i = 0; i < 20 && !b.c13State().ready; i++) { await wait(300); __c13Step(2); }
      if (!b.c13State().ready) return 'c13 loading';
      b.skipTakes(); await __c13Go(); b.skipTakes(); stage = 2;
    }
    if (stage === 2) {
      if (!b.c13Dbg().thrReady) { b.startThrone(1); for (let k = 0; k < 20 && !b.c13Dbg().thrReady; k++) { __c13Step(1); await wait(1000); } }
      if (!b.c13Dbg().thrReady) return 'throne loading';
      stage = 3;
    }
    if (stage === 3) { b.placeInThrone(); b.skipTakes(); __c13Step(30); stage = 4; }
    return 'in';
  };
})();
/* walk the carpet to a room-local z (the clamps keep a teleport only when update() has run on it) */
window.__tdWalk = (z, x = 0.2) => {
  const b = window.__bw;
  for (let zz = b.camera.position.z - b.THR_Z; zz > z; zz = Math.max(z, zz - 1.0)) {
    b.tp(b.THR_X + x, b.camera.position.y, b.THR_Z + Math.max(z, zz - 1.0)); b.step(1 / 60); __c13Step(1);
    if (b.thrCutS()) break;
  }
  return +(b.camera.position.z - b.THR_Z).toFixed(2);
};
/* a sheet of the running take at the given seconds of its own clock */
window.__tdTake = (marks, cols = 3, w = 400) => {
  const b = window.__bw; __sheet(cols, w);
  let i = 0, guard = 0;
  while (b.thrCutS() && i < marks.length && guard++ < 1200) {
    const c = b.thrCutS();
    if (c.t >= marks[i]) { __sheetAdd('t ' + c.t.toFixed(2) + ' fov ' + b.camera.fov.toFixed(0) + (c.snapped ? ' snap' : '')); i++; continue; }
    __c13Step(1);
  }
  return __sheetEnd();
};
