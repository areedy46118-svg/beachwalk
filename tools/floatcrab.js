/* A GLASS FLOAT THROWN AT A CRAB (2026-11-21, the owner: "THROWING A GLASS FLOAT AT A CRAB SHOULD BREAK AND KILL IT"). Devmode,
 * the first live crab; a glass float put 2.5 m off it at chest height and sent at it at 11 m/s (a throw's speed); 3 s of
 * frames: the crab dead? the float broken? Run: PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/floatcrab.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); w.__adv(120);
const crab = b.crabs.find((u) => u.st && u.st.alive), fl = b.physProps.find((p) => !p.dead && p.onImpact && /shatterGlass\(\w+, float/.test(String(p.onImpact)));
log('crab', !!crab, 'float', !!fl);
if (crab && fl) {
  const C = crab.g.position, P = fl.mesh.position;
  b.camera.position.set(C.x + 4, 1.7, C.z); b.camBaseY = 1.7;
  P.set(C.x + 2.5, C.y + 0.6, C.z); fl.vel.set(-11, 0.5, 0); fl.everHeld = true; fl.born = -1e9; if ('resting' in fl) fl.resting = false; if ('sleep' in fl) fl.sleep = false;
  const hp0 = crab.st.hp; let at = null;
  for (let i = 0; i < 180; i++) { const was = fl.dead; const q = P.clone(); w.__adv(1); if (fl.dead && !was) at = [i, q.distanceTo(C).toFixed(2), (q.y - C.y).toFixed(2)]; if (fl.dead && !crab.st.alive) break; }
  log('crab hp', hp0, '->', crab.st.hp, 'struck', crab.st.struck, '| float broke at frame', at && at[0], at && at[1] + ' m from the crab, ' + at[2] + ' m over it', '| crab y', C.y.toFixed(2));
  log('after the throw: crab alive', crab.st.alive, '| float broken', !!fl.dead);
}
