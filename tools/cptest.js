// harness: make a checkpoint the way a save point makes it, reload into it the way a death does, and say whether it came back.
//   await import('/tools/cptest.js');  await __cpReady();  __cpMake('bunkerIn');  __cpReload();
//   (after the reload) await import('/tools/cptest.js');  await __cpCheck();
const W = window;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
W.__cpReady = async function () {
  while (!W.__bw) await sleep(100);
  try { const m = await import('/tools/thrdante.js'); if (W.__tdMute) W.__tdMute(); } catch (e) {}
  const c = W.__bw.audioCtx; if (c) { c.resume = () => Promise.resolve(); try { await c.suspend(); } catch (e) {} }
  document.querySelectorAll('audio,video').forEach((m) => { m.muted = true; });   // the intro video has its own sound
  await W.__cpPump();
  const t0 = performance.now();
  while (W.__bw.bootLeft().n && performance.now() - t0 < 40000) await sleep(400);
  const b = W.__bw;
  if (!b.state().started) { b.beginGame(); await sleep(600); }
  if (!b.state().started) { b.beginGame(); await sleep(600); }
  b.settings.devMode = true;          // nothing kills the test player while a save is being set up (a death reloads the last save)
  return b.state().started;
};
const beach = (z, x = 10) => () => { const b = W.__bw; if (b.devLeaveRooms) b.devLeaveRooms(); b.camera.position.set(x, 1.7, z); b.camBaseY = 1.7; b.frame(1); b.frame(1); };
// each: [set the place up, the spot the real save point passes]
W.__CP = {
  wreck: [beach(-150), null], dock: [beach(-212, 8), null], camp: [beach(-262), null], well: [beach(-382), null],
  pavilion: [beach(-452), null], hatchOut: [beach(-544), null], gap: [beach(-620), null], mutants: [beach(-700), null],
  caveOut: [beach(-905), null], whaleOut: [beach(-1040), null], fortGate: [beach(-1060), null],
  bunkerIn: [() => W.__bw.placeInBunker(), 'bunkerIn'],
  ucIn: [() => W.__bw.placeInUndercroft('entry'), 'ucIn'], ucInFar: [() => W.__bw.placeInUndercroft('exit'), 'ucInFar'],
  dojoIn: [() => W.__bw.placeInDojo(), 'dojoIn'],
  catIn: [() => W.__bw.placeInCatacombs(), 'catIn'], catDoorIn: [() => { W.__bw.placeInCatacombs(); W.__bw.placeInsideCatDoor(); }, 'catDoorIn'],
  whaleIn: [() => W.__bw.placeInWhale(), 'whaleIn'],
  keepIn: [() => W.__bw.placeInKeep(), 'keepIn'], tavIn: [() => W.__bw.placeInTavern(), 'tavIn'],
  fortIn: [() => W.__bw.placeInFort(), 'fortIn'], c13In: [() => W.__bw.placeInC13(), 'c13In'],
  thrIn: [() => W.__bw.placeInThrone(false), 'thrIn'], isle: [() => W.__bw.placeOnIsle(), null],
  dungeon: [() => W.__bw.placeInDungeon(), null],
};
W.__cpMake = function (name) {
  const b = W.__bw, S = W.__CP[name];
  if (!S) return 'no scenario ' + name;
  if (b.devLeaveRooms) b.devLeaveRooms();     // every room is entered from the beach in the game, never from another room
  S[0]();
  for (let i = 0; i < 3; i++) b.frame(1);
  b.saveCheckpoint(S[1] || undefined);
  const d = JSON.parse(localStorage.getItem('beachwalk.save') || 'null');
  sessionStorage['cp.name'] = name;
  return d ? { name, room: d.room, spot: d.spot, pos: d.pos } : 'no save written';
};
W.__cpReload = function () { sessionStorage['beachwalk.load'] = 'checkpoint'; location.reload(); return 'reloading'; };
// a hidden preview pane runs no requestAnimationFrame at all: drive the game's own loop off a timer then (same frames)
W.__cpPump = async function () {
  let n = 0; await new Promise((r) => { requestAnimationFrame(() => { n++; r(); }); setTimeout(r, 400); });
  if (n) return 'raf';
  W.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
  W.__bw.animate(); return 'pump';
};
W.__cpCheck = async function (maxMs = 42000) {
  const b = W.__bw, bl = document.getElementById('blackout');
  b.settings.devMode = true;          // and nothing kills it while the check waits (a death would reload the same save, round and round)
  const loop = await W.__cpPump();
  const t0 = performance.now();
  let lifted = -1;
  while (performance.now() - t0 < maxMs) {
    const op = +getComputedStyle(bl).opacity;
    if (op < 0.05) { lifted = Math.round(performance.now() - t0); break; }
    await sleep(300);
  }
  const f0 = b.renderer.info.render.frame; await sleep(1200); const frames = b.renderer.info.render.frame - f0;
  const p = b.camera.position, s = b.state();
  const room = b.devRoom ? b.devRoom() : null;
  return { name: sessionStorage['cp.name'], loop, lifted, frames, black: +(+getComputedStyle(bl).opacity).toFixed(2), boot: b.bootLeft().n,
    pos: [p.x, p.y, p.z].map((v) => +v.toFixed(2)), finite: [p.x, p.y, p.z].every(Number.isFinite), dying: s.dying, ended: s.ended, room };
};

// one step of the run: check the save this page came back from, then make the next one and reload into it
W.__cpStep = async function (maxMs = 28000) {
  const r = await W.__cpCheck(maxMs);
  const q = JSON.parse(sessionStorage['cp.q'] || '[]'), log = JSON.parse(sessionStorage['cp.log'] || '[]');
  log.push(r); sessionStorage['cp.log'] = JSON.stringify(log);
  const next = q.shift(); sessionStorage['cp.q'] = JSON.stringify(q);
  if (next) {
    await W.__cpReady();
    // a room whose files are still coming cannot be entered yet: try again for half a minute, then say so
    let m = null, err = null;
    for (let i = 0; i < 6 && !m; i++) { try { m = W.__cpMake(next); if (typeof m === 'string') { err = m; m = null; } } catch (e) { err = String(e && e.message || e); await sleep(5000); } }
    if (!m) { log.push({ name: next, makeErr: err }); sessionStorage['cp.log'] = JSON.stringify(log); W.__cpBusy = false; return W.__cpStep(maxMs); }
    setTimeout(() => W.__cpReload(), 150); return { r, next: m };
  }
  return { r, next: null };
};
// the same, started in the background (a check can need longer than one harness call): poll `__cpStatus()`
W.__cpAuto = function (maxMs = 90000) {
  if (W.__cpBusy) return 'busy';
  W.__cpBusy = true;
  W.__cpStep(maxMs).then((x) => { W.__cpLast = x; }, (e) => { W.__cpLast = { err: String(e && e.stack || e).slice(0, 300) }; });
  return 'started';
};
W.__cpStatus = function () {
  return { log: JSON.parse(sessionStorage['cp.log'] || '[]').map((r) => [r.name, r.lifted, r.black, r.frames, r.boot, r.room, r.pos]),
    q: JSON.parse(sessionStorage['cp.q'] || '[]'), busy: !!W.__cpBusy, last: W.__cpLast || null };
};
