/* YOU, OUT OF THE TAVERN'S WINDOW (2026-11-26, `tavPlayerOut`): walk at a whole railing (held), then at a broken bay (out, falling,
 * dead on landing); with dev mode on, put back inside.   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/tavfall.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(20); }
w.__clockOn();
const C = b.camera, X = -6000, Z = 12000, fl0 = b.tavInfoS().floor(X - 1.4, Z - 10, 800 + 10), fl = typeof fl0 === 'number' ? fl0 : fl0.f;
const errs = []; w.addEventListener('error', (e) => errs.push(String(e.message).slice(0, 140)));
const walk = (dev, nm, whole = false) => {
  b.settings.devMode = dev; b.tavOutResetS(); b.tavRailS().bays[0].dead = !whole;
  C.position.set(X - 2.4, fl + 1.7, Z - 11.6); b.camBaseY = C.position.y; b.look(0, 0);
  let minZ = 0, lowest = 0, deadAt = null, outAt = null;
  for (let f = 0; f < 60 * 5; f++) { b.look(0, 0); if (!b.tavOutS()) C.position.z -= 0.05; w.__adv(1); if (f === 12 && dev && b.tavOutS()) break;
    minZ = Math.min(minZ, C.position.z - Z); lowest = Math.min(lowest, C.position.y - 1.7 - fl);
    if (outAt === null && b.tavOutS()) outAt = (f / 60).toFixed(2); if (deadAt === null && b.state().dying) deadAt = (f / 60).toFixed(2); }
  log(nm, '| got to local z', minZ.toFixed(2), '| out at', outAt, '| lowest feet', lowest.toFixed(1), '| dying at', deadAt, '| now feet', (C.position.y - 1.7 - fl).toFixed(2), 'z', (C.position.z - Z).toFixed(2), '| out', !!b.tavOutS());
};
walk(false, 'railing whole', true);
b.tavRailBreakS(0); for (let i = 0; i < 4; i++) w.__adv(1);
walk(true, 'bay broken, dev mode');
walk(false, 'bay broken, a game');
log('errors', JSON.stringify(errs.slice(0, 4)));
log('DONE');
