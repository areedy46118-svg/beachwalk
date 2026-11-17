/* THE PUPPET ON ITS BED (2026-11-17, "MAKE SURE THE PUPPET IS ALWAYS ON THE BED"). Not part of the game. Run headless:
 *   PB_PORT=4259 sh tools/probe.sh 'evalFile&f=/tools/pupbed.js' <out>
 * A fresh game: the house asked for, then how long until the house is in and until the puppet sits on its bed. */
for (let i = 0; i < 300 && !b.state().introDone; i++) { try { if (!b.state().started) b.beginGame(); } catch (e) {} b.frame(3); await sleep(20); }
const t0 = performance.now(); b.loadHouse();
let tHouse = -1, tBed = -1;
for (let i = 0; i < 600 && tBed < 0; i++) {
  await sleep(50); b.frame(1);
  const P = b.elvPupS();
  if (tHouse < 0 && b.scene.getObjectByName('puppetHouse') && b.scene.getObjectByName('puppetHouse').children.length > 1) tHouse = performance.now() - t0;
  if (P && P.bed) tBed = performance.now() - t0;
}
const P = b.elvPupS();
log('house in at', (tHouse / 1000).toFixed(2), 's | puppet on the bed at', (tBed / 1000).toFixed(2), 's | bed visible', !!(P && P.bed && P.bed.root.visible), '| stage', b.elvS ? JSON.stringify(b.elvS()).slice(0, 120) : '?');
// who hides it: a setter on its `visible`, the stack of every write
{
  const R = P && P.bed && P.bed.root; if (!R) { log('no bed'); } else {
    let v = R.visible; const writes = [];
    Object.defineProperty(R, 'visible', { get: () => v, set: (x) => { if (x !== v && writes.length < 6) writes.push(x + ' <- ' + (new Error().stack || '').split('\n').slice(2, 5).map((l) => l.trim().replace(/http:\/\/localhost:\d+\//g, '')).join(' < ')); v = x; }, configurable: true });
    R.visible = true;
    for (let i = 0; i < 300; i++) { b.frame(1); await sleep(10); }
    log('after 300 frames: visible', R.visible, '| writes', writes.length); for (const x of writes) log('  ', x.slice(0, 260));
    // and from inside the house
    const H = b.scene.getObjectByName('puppetHouse'); log('house visible', H && H.visible, '| parent chain visible', (() => { let o = R.parent, s = []; while (o) { s.push((o.name || o.type) + ':' + o.visible); o = o.parent; } return s.join(' > '); })());
  }
}
