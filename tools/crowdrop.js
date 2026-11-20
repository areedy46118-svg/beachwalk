/* THE CROW'S DROP (2026-11-20, the owner: "put a checkpoint when the crow drops you and have the crow fly above the pillar like
 * it was but he dissapears by flying further even after the cutscene"): the flight from the stump, on the fixed clock; the save
 * written as you hit the sand (its room, its time against the cut's), and the crow after the cut: where it is, how high,
 * visible, until it is gone. Run: PB_PORT=4268 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/crowdrop.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.settings.devMode = false;
try { w.localStorage.removeItem('beachwalk.save'); } catch (e) {}
// to the stump, the temple fetched, the flight begun (the templeFlight probe's way)
w.__clockOn(); b.settings.devMode = true;
for (let i = 0; i < 400 && !(b.tmpS().ready && b.TC.crow); i++) { b.loadTemple(); w.__adv(1); await sleep(50); }
{ const T = b.TC; log("crow ready", !!T.crow, "g", !!T.g, JSON.stringify(b.tmpS())); if (T.g) { const sx = T.g.position.x, sz = T.g.position.z, C = b.camera; C.position.set(sx - 0.8, 1.7, sz + 3.2); b.lookAt(sx, 1.2, sz); } w.__adv(40); }
try { w.localStorage.removeItem('beachwalk.save'); } catch (e) {}
b.startTempleFlight();
let saved = null, landT = null;
for (let f = 0; f < 60 * 45; f++) {
  w.__adv(1);
  const s = b.tmpS(); let sv = null; try { sv = JSON.parse(w.localStorage.getItem('beachwalk.save') || 'null'); } catch (e) {}
  if (sv && !saved) { saved = sv; log('saved at cut t', s.cut, 'room', sv.room, 'pos', JSON.stringify(sv.pos), 'tmpFlown', sv.flags && sv.flags.tmpFlown); }
  const C = b.TC.crow;
  if (f % 60 === 0 && C) log('t', (f / 60).toFixed(0), 'cut', s.cut, 'crow vis', C.visible, 'mode', b.TC.mode, 'crow above you', (C.position.y - b.camera.position.y).toFixed(0), 'away', Math.hypot(C.position.x - b.camera.position.x, C.position.z - b.camera.position.z).toFixed(0));
}
