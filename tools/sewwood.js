/* THE SEWER'S BRIDGES IN REAL WOOD, THE STEEL DOOR IN REAL STEEL AND CLEAR OF ITS JAMB (2026-11-22): stills of both bridges and the
 * door shut and open (placed by `sewSet`, no frames run: the walk's clamp would move the eye). Run: PB_PORT=4223 PB_WAIT=400 sh
 * tools/probe.sh 'evalFile&f=/tools/sewwood.js' <out> */
await w.eval(`import('/tools/sewer.js?${Date.now()}')`); for (let i = 0; i < 100 && !w.__sw; i++) await sleep(50);
await w.__sw.boot(); await w.__sw.run(30);
const B = b, G = B.sewG();
const at = (fx, fz, tx, tz, ty) => { const dx = tx - fx, dz = tz - fz; return [Math.atan2(-dx, -dz), Math.atan2(ty - 1.6, Math.hypot(dx, dz))]; };
const still = (nm, fx, fz, tx, tz, ty, open) => {
  B.sewRestore({ d2: open ? 1 : 0 }); const [yaw, pitch] = at(fx, fz, tx, tz, ty); B.sewSet(fx, fz, yaw, pitch);
  B.scene.updateMatrixWorld(true); B.renderer.render(B.scene, B.camera); shot(nm, 640, 1.0);
  log(nm, 'door rot', G.P.door2 ? G.P.door2.rotation.y.toFixed(3) : '-');
};
w.__sw.light(true);
const S = G.SEW, DZ = S.T_Z - S.WALL + 0.08;
still('bridge1', -1.6, -2.2, 0, S.BRIDGE_Z, 0.0);
still('bridge1_close', -1.7, -2.9, 0.2, S.BRIDGE_Z, -0.2);
still('bridge2', 2.4, S.T_Z + 2.4, S.BRIDGE2_X, S.T_Z, 0.2);
still('door_shut', S.DOOR2_X + 0.2, DZ + 2.0, S.DOOR2_X, DZ, 1.0, false);
still('door_open_in', S.DOOR2_X + 0.3, DZ - 1.6, S.DOOR2_X - 0.5, DZ - 0.5, 1.4, true);
still('door_open_out', S.DOOR2_X + 0.6, DZ + 1.7, S.DOOR2_X - 0.3, DZ - 0.6, 1.0, true);
