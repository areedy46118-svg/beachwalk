// harness: Elvédor, the gully and the house behind the dune — get there fast, muted, in dev mode.
//   await import('/tools/elvtest.js');  await __elvBoot();  await __elvTo('gate');   // 'beach' (Elvédor), 'mouth', 'gate', 'porch', 'bed', 'carry'
//   __elvWalk(x, z) puts you on the land's own floor at (x, z) once you are on it (through the mouth first: `__elvTo` does that)
const W = window;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
W.__elvErrs = [];
W.__elvBoot = async function () {
  while (!W.__bw) await sleep(100);
  document.querySelectorAll('audio,video').forEach((m) => { m.muted = true; });
  const c = W.__bw.audioCtx; if (c) { c.resume = () => Promise.resolve(); try { await c.suspend(); } catch (e) {} }
  W.addEventListener('error', (e) => W.__elvErrs.push(String(e.message).slice(0, 160)));
  const b = W.__bw;
  let t = performance.now(); while (b.bootLeft().n && performance.now() - t < 30000) await sleep(400);
  for (let i = 0; i < 6 && !b.state().started; i++) { b.beginGame(); await sleep(1200); }
  t = performance.now(); while (!b.state().introDone && performance.now() - t < 30000) await sleep(400);
  b.settings.devMode = true; b.setFallbackLook(true);
  document.querySelectorAll('audio,video').forEach((m) => { m.muted = true; });
  return b.state().introDone;
};
W.__elvWalk = function (x, z) {
  const b = W.__bw, f = b.elvLandFloorAt(x, z, null) ?? 0;
  b.camera.position.set(x, f + 1.7, z); b.camBaseY = f + 1.7;
  return f;
};
W.__elvTo = async function (where) {
  const b = W.__bw;
  if (b.devLeaveRooms) b.devLeaveRooms();
  if (b.state().dialogOpen) { const l = document.getElementById('dialog-leave'); if (l) l.click(); }
  if (where === 'beach') {
    b.camera.position.set(5, 1.7, -592); b.camBaseY = 1.7;
    const t = performance.now(); while (!(b.elvManS() && b.elvManS().ready) && performance.now() - t < 30000) await sleep(400);
    return b.elvS();
  }
  const P = b.ELV_PATH, G = P[0], H = P[P.length - 1];
  b.camera.position.set(4, 1.7, G[1] + 14); b.camBaseY = 1.7;
  const t = performance.now();
  while (!(b.elvFieldS() && b.elvS().houseReady && b.elvS().walls && b.elvS().pup) && performance.now() - t < 40000) await sleep(400);
  if (where === 'mouth') { b.camera.position.set(G[0] + 1.2, 1.7, G[1] + 1.6); b.camBaseY = 1.7; b.lookAt(P[4][0], 2.2, P[4][1]); return b.elvS(); }
  b.camera.position.set(P[2][0], 1.75, P[2][1]); b.camBaseY = 1.75; await sleep(350);   // in through the mouth: the land's walk takes over
  for (const [x, z] of P.slice(3)) { W.__elvWalk(x, z); await sleep(120); }
  if (where === 'gate') { b.lookAt(b.HOUSE_X, b.HOUSE_Y + 4, b.HOUSE_Z); return b.elvS(); }
  if (where === 'porch') { W.__elvWalk(b.HOUSE_X - 7.0, b.HOUSE_Z + 3.8); b.lookAt(b.HOUSE_X, b.HOUSE_Y + 2.5, b.HOUSE_Z + 3.8); return b.elvS(); }
  b.setElvStage(1);
  b.camera.position.set(b.HOUSE_X + 0.9, b.HOUSE_Y + 6.6, b.HOUSE_Z - 4.2); b.camBaseY = b.HOUSE_Y + 6.6; await sleep(400);
  if (b.elvPupS().bed) { const p = b.elvPupS().bed.root.getWorldPosition(new b.camera.position.constructor()); b.lookAt(p.x, p.y + 0.4, p.z); }
  if (where === 'carry') { b.elvPickUp(); await sleep(300); b.look(Math.PI / 2, 0); }
  return b.elvS();
};
