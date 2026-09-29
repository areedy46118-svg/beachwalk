/* The catacombs monster's solid body and blows, measured hands-off.
 * Load in the pane after `beginGame()` with the skipIntro flag set:
 *   await import('/tools/catsolid.js?' + Date.now()); await __catSetup(1.3);
 *   __catStep(1800)   // frames on a fake clock, the player pinned at the door
 * Reports: frames with his head through drawn stone, frames with any of him in
 * the barred door's box, blows that landed, swings begun, frames stunned. */
const b = window.__bw;
window.__catSetup = async (dx = 1.3, off = false) => {
  b.setCatSolidOff(off === true ? true : (off || 0));
  b.devTeleportShop(); for (let i = 0; i < 5; i++) b.frame(1);
  const t0 = performance.now(); b.startCaveIn();
  while (performance.now() - t0 < 25000 && !(b.CAT_SITE.walls && b.catWalk)) { b.frame(1); await new Promise((r) => setTimeout(r, 25)); }
  if (!window.__realNow) { window.__realNow = performance.now.bind(performance); window.__off = 0; window.__base = window.__realNow(); performance.now = () => window.__base + window.__off; }
  let n = 0; while (b.frozen() && n++ < 1500) { window.__off += 16.7; b.frame(1); }
  const D = b.CAT_DOOR, S = b.CAT_SITE;
  window.__P = { x: S.X + D.x - dx, z: S.Z + D.z, f: S.Y + D.f };
  b.catEnrage(b.crawlerUnit);
  window.__m = { frames: 0, headIn: 0, doorIn: 0, hits: 0, walled: 0, minD: 99, swings: 0, lastAtk: -1, stun: 0 };
  return 'ready';
};
window.__catStep = (N, pin = true) => {
  const M = window.__m, P = window.__P, u = b.crawlerUnit;
  for (let i = 0; i < N; i++) {
    window.__off += 16.7;
    if (pin) { b.camera.position.set(P.x, P.f + 1.7, P.z); b.camBaseY = P.f + 1.7; }
    const hp0 = b.state().hp; b.frame(1); const hp1 = b.state().hp; b.heal();
    M.frames++;
    const p = u.g.position, h = u.bones.head.getWorldPosition(p.clone());
    { const hx = h.x - p.x, hz = h.z - p.z, hl = Math.hypot(hx, hz);
      if (hl > 0.9) { const k = (hl - 0.8) / hl; if (b.catLegBlocked(p.x + hx * k, p.z + hz * k, h.x, h.z, h.y) && b.catLegBlocked(p.x + hx * k, p.z + hz * k, h.x, h.z, p.y + 0.7)) M.headIn++; } }
    if (b.catDoorBody(p.x, p.z, p.y) || b.catDoorBody(h.x, h.z, p.y)) M.doorIn++;
    if (Math.abs(p.y - P.f) < 1.5) M.minD = Math.min(M.minD, Math.hypot(p.x - P.x, p.z - P.z));
    if (hp1 < hp0) { M.hits++; if (b.blowWalled(u, b.camera.position)) M.walled++; }
    if (u.st.stun > 0) M.stun++;
    if (u.st.atk >= 0 && M.lastAtk < 0) M.swings++;
    M.lastAtk = u.st.atk;
  }
  const u2 = b.crawlerUnit;
  return { ...M, pos: u2.g.position.toArray().map((v) => +v.toFixed(1)), awake: u2.st.awake, path: u2.path ? u2.path.length : 0, blockT: +(u2.catBlockT || 0).toFixed(2) };
};
