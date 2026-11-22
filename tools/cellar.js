/* THE CELLAR UNDER ELVÉDOR'S HOUSE (2026-11-21): the doors at the house's back, in through them, the room's views, a walk down
 * the stairs, through the blue door, across to the workbench (the other puppet), up the bulkhead's steps as far as they go,
 * and out again. Run: PB_PORT=4223 PB_WAIT=400 sh tools/probe.sh 'evalFile&f=/tools/cellar.js' <out>   (&nowalk=1: views only) */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const Q = new URLSearchParams(location.search), T = b.THREE, C = b.camera, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
const f2 = (v) => (+v).toFixed(2);
// to the yard behind the house: the house, the cellar's doors, the room itself and the puppet load from here
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ + 2.5); b.camBaseY = C.position.y;
for (let i = 0; i < 900; i++) { b.lookAt(HX + 5, HY + 0.8, HZ); b.frame(1); await sleep(15); const s = b.celS(); if (s.out && s.ready && s.pup && i > 60) break; }
log('outside:', JSON.stringify(Object.fromEntries(Object.entries(b.celS()).filter(([k]) => !['world', 'outM'].includes(k)))));
const st0 = b.celS(); if (st0.outM) { const bb = new T.Box3().setFromObject(st0.outM); log('doors box x', f2(bb.min.x), f2(bb.max.x), 'y', f2(bb.min.y), f2(bb.max.y), 'z', f2(bb.min.z), f2(bb.max.z), '| ground', f2(st0.fy)); }
w.__clockOn();
const still = (nm, x, y, z, lx, ly, lz, fov = 75, gain = 1.4) => { C.fov = fov; C.updateProjectionMatrix(); C.position.set(x, y, z); C.lookAt(lx, ly, lz); C.updateMatrixWorld(true); shot(nm, 560, gain); };
still('out_yard', HX + 9.2, HY + 1.75, HZ - 2.6, HX + 5.6, HY + 0.4, HZ, 70, 1.6);
still('out_door', HX + 8.6, HY + 1.75, HZ + 1.6, HX + 5.6, HY + 0.45, HZ, 70, 1.4);
{ C.fov = 75; C.updateProjectionMatrix(); C.position.set(HX + 7.1, HY + 1.9, HZ + 0.3); b.camBaseY = C.position.y; b.lookAt(HX + 5.8, HY + 0.6, HZ); w.__adv(3); b.lookAt(HX + 5.8, HY + 0.6, HZ); w.__adv(2); log('hover at the doors outside:', b.hoveredS ? b.hoveredS() : '?'); }
// walking into the doors: refused
{ C.position.set(HX + 7.4, HY + 1.75, HZ); b.camBaseY = C.position.y; w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
  for (let i = 0; i < 120; i++) { b.look(Math.PI / 2, 0); b.step(1 / 60); }
  w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }));
  log('walked at the doors: stopped at x', f2(C.position.x), '(doors from', f2(b.CEL_OUT_XS ? b.CEL_OUT_XS() : 39.68), 'to', f2(39.68 + 1.3), ')'); }
// in
C.position.set(HX + 7.4, HY + 1.75, HZ); b.camBaseY = C.position.y;
b.startCellar(1);
for (let i = 0; i < 240 && (b.celS().celBusy || !b.celS().inCel); i++) w.__adv(1);
for (let i = 0; i < 20; i++) w.__adv(1);
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z;
log('in:', b.celS().inCel, '| at', f2(C.position.x - X), f2(C.position.y - Y), f2(C.position.z - Z), '| walls', b.celS().walls, '| inRoom', b.state ? '' : '');
// the views, the game's own lens
const fov = b.settings.fov || 105;
const eye = C.position.clone();
const sp = (nm, yaw, pitch, g = 1.4) => { C.fov = fov; C.updateProjectionMatrix(); C.position.copy(eye); b.look(yaw, pitch); w.__adv(1); C.position.copy(eye); b.look(yaw, pitch); C.updateMatrixWorld(true); shot(nm, 560, g); };
sp('in_spawn', Math.PI / 2, -0.32);
sp('in_back', -Math.PI / 2, 0.12);
sp('in_left', 0, -0.1);
sp('in_back_up', -Math.PI / 2, 0.38, 1.6);
still('in_pup', X + 0.25, Y + 1.5, Z + 1.5, X - 0.05, Y + 0.86, Z + 2.3, 50, 1.3); still('in_pup2', X - 0.9, Y + 1.25, Z + 1.7, X - 0.05, Y + 0.86, Z + 2.3, 50, 1.3); still('in_pup3', X - 0.45, Y + 0.9, Z + 1.25, X - 0.45, Y + 0.85, Z + 2.3, 55, 1.3); still('in_pup4', X - 0.45, Y + 2.1, Z + 2.25, X - 0.45, Y + 0.8, Z + 2.3, 50, 1.3); log('puppet bones y:', b.celS().world ? (() => { let r = '?'; b.celS().world.traverse((o) => { if (o.userData && o.userData.lieDbg) r = o.userData.lieDbg(); }); return r; })() : ''); C.position.copy(eye);
log('hover looking back:', (() => { C.position.copy(eye); b.look(-Math.PI / 2, 0.3); w.__adv(3); return b.hoveredS ? b.hoveredS() : '?'; })());
if (!Q.get('nowalk')) {
  const keyW = (on) => w.dispatchEvent(new w.KeyboardEvent(on ? 'keydown' : 'keyup', { code: 'KeyW', key: 'w' }));
  const go = (lx, lz, n = 600) => {
    keyW(true);
    let k = 0, best = 1e9, stuck = 0;
    for (; k < n; k++) {
      const dx = X + lx - C.position.x, dz = Z + lz - C.position.z, d = Math.hypot(dx, dz);
      if (d < 0.25) break;
      if (d < best - 0.01) { best = d; stuck = 0; } else if (++stuck > 90) break;
      b.look(Math.atan2(-dx, -dz), -0.1); w.__adv(1);
    }
    keyW(false); w.__adv(2);
    const d = Math.hypot(X + lx - C.position.x, Z + lz - C.position.z);
    log('to', lx, lz, d < 0.3 ? 'REACHED' : 'STOPPED ' + f2(d) + ' short', '| at', f2(C.position.x - X), f2(C.position.z - Z), 'feet', f2(b.camBaseY - 1.7 - Y), '| frames', k);
    return d < 0.3;
  };
  go(-0.68, -2.805); shot('w_stairs_foot', 560, 1.4);
  go(-1.81, -2.805);
  go(-2.95, -2.85); shot('w_blue_door', 560, 1.4);
  go(-3.85, -1.13); shot('w_laundry', 560, 1.4);
  go(-1.36, -0.11); shot('w_middle', 560, 1.4);
  go(0.0, 1.6);
  { const e2 = C.position.clone(); C.fov = fov; C.updateProjectionMatrix(); b.look(Math.PI, -0.5); w.__adv(1); C.position.copy(e2); b.look(Math.PI, -0.5); C.updateMatrixWorld(true); shot('w_bench', 560, 1.4); }
  // the head: jump under the joists
  { const y0 = C.position.y; w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Space', key: ' ' })); let top = y0; for (let i = 0; i < 50; i++) { w.__adv(1); top = Math.max(top, C.position.y); } w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'Space', key: ' ' })); for (let i = 0; i < 40; i++) w.__adv(1); log('jump at the bench: eye from', f2(y0 - Y), 'to', f2(top - Y)); }
  // back to the stairs and up them
  go(-1.36, -0.11); go(-3.0, -0.6); go(-3.3, -2.6); go(-2.0, -2.85); go(-1.5, -2.805); go(2.0, -2.805); go(2.9, -2.805);
  // and up the bulkhead's steps as far as they go
  go(5.2, -2.805, 200);
}
// out
b.startCellar(-1);
for (let i = 0; i < 240 && (b.celS().celBusy || b.celS().inCel); i++) w.__adv(1);
for (let i = 0; i < 10; i++) w.__adv(1);
log('out:', !b.celS().inCel, '| at', f2(C.position.x), f2(C.position.y), f2(C.position.z), '| house', HX, f2(HY), HZ, '| elvLand', b.elvLandS(C.position.x, C.position.z, C.position.y)[2]);
shot('out_again', 560, 1.6);
