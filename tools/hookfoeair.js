/* WHAT 'FOE' THE HOOK FINDS IN XIII'S EMPTY AIR (2026-11-23): every unit near the castle — kind, alive, shown, height off the floor
 * under it — and every throw whose trace answers 'foe' at a unit that is not shown or not where a body stands.
 * PB_PORT=4223 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/hookfoeair.js' <out> */
w.eval(await (await fetch('/tools/c13look.js?' + Date.now())).text());
log('c13', await w.__c13LookBoot());
const T = w.__T, C = b.camera, S = b.C13_SITE, X = b.C13_X, Z = b.C13_Z;
for (let i = 0; i < 200; i++) w.__c13Adv(1);
for (let i = 0; i < 300; i++) { await sleep(20); if (i % 10 === 0) w.__c13Adv(1); }
const shownUp = (o) => { for (let a = o; a; a = a.parent) { if (!a.visible) return false; if (a === b.scene) return true; } return false; };
const us = b.mutants.filter((u) => Math.abs(u.g.position.x - X) < 200 && Math.abs(u.g.position.z - Z) < 200);
log('units near XIII', us.length);
const groups = {};
for (const u of us) { const k = `${u.kindName} alive ${u.st.alive} retired ${!!u.retired} shown ${shownUp(u.g)} model ${!!u.model}`; groups[k] = (groups[k] || 0) + 1; }
for (const k in groups) log('  ', groups[k], '×', k);
for (const u of us) if (shownUp(u.g)) log('   shown:', u.kindName, 'at', (u.g.position.x - X).toFixed(1), u.g.position.y.toFixed(1), (u.g.position.z - Z).toFixed(1), 'model', !!u.model, u.model ? 'model shown ' + shownUp(u.model) : '', 'parLate', !!u.parLate, 'awake', !!u.st.awake);
// every unit the hook's trace can answer with, from below it
b.addToInventory(b.hookItem); if (b.state().equipped !== b.hookItem.name) b.toggleEquip(b.hookItem);
let ghosts = 0; const seen = {};
for (const u of us) {
  const P = u.g.position.clone().add(new T.Vector3(0, 1.0, 0));
  for (const [ox, oz] of [[3, 0], [0, 3], [-3, 0]]) {
    C.position.set(P.x + ox, P.y + 0.3, P.z + oz); C.updateMatrixWorld(true);
    const D = P.clone().sub(C.position).normalize(), mt = b.magTraceS(D);
    const drawnBody = mt && mt.u && mt.u.model && shownUp(mt.u.model);
    if (mt && mt.kind === 'foe' && mt.u && !drawnBody) { ghosts++; const k = mt.u.kindName + ' alive ' + mt.u.st.alive + ' retired ' + !!mt.u.retired; seen[k] = (seen[k] || 0) + 1; }
  }
}
log('trace answered with a body not shown:', ghosts, JSON.stringify(seen));
