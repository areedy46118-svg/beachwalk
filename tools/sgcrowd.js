/* THE DOUBLE AGAINST THE CASTLE'S CROWD. Not part of the game. After tools/farmfight.js:
 *   eval(await (await fetch('/tools/sgcrowd.js')).text());
 *   __blastTest(ids, dist, gap, depth)  stands those farmers in a ragged line `dist` in front of you,
 *                                        `gap` apart (every other one `depth` further), fires one barrel
 *                                        at the middle one's chest and follows them for three seconds:
 *                                        dead or not, pieces off, how far and how high each was thrown */
(function () {
const b = window.__bw, V = b.camera.position.constructor;
window.__crowd = (ids, dist = 3.5, gap = 0.8, depth = 0.4) => {
  b.placeInFort(); __adv(2);
  const p = b.camera.position.clone(), fw = new V(); b.camera.getWorldDirection(fw); fw.y = 0; fw.normalize();
  const rt = new V(-fw.z, 0, fw.x), us = ids.map((i) => b.farmUnits[i]);
  us.forEach((u, k) => {
    u.farm.out = true; u.farm.burst = null; u.st.awake = false;
    const dd = dist + (k % 2) * depth, s = (k - (ids.length - 1) / 2) * gap;
    const x = p.x + fw.x * dd + rt.x * s, z = p.z + fw.z * dd + rt.z * s;
    u.g.position.set(x, b.fortCourtAt(x, z) ?? (p.y - 1.7), z); u.g.rotation.y = Math.atan2(p.x - x, p.z - z); u.g.visible = true;
  });
  __adv(6); b.camera.position.copy(p); return { us, p, fw };
};
window.__shotgunIn = () => {
  b.addToInventory(b.shotgunItem); b.sgCh = [1, 1]; b.sgSpare = 12;
  if (b.state().equipped !== b.shotgunItem.name) b.toggleEquip(b.shotgunItem);
  __adv(40); return b.state().equipped;
};
window.__blastTest = (ids, dist, gap, depth = 0.4, film) => {
  const { us, p, fw } = __crowd(ids, dist, gap, depth);
  b.sgCh = [1, 1]; __adv(30);
  b.look(Math.atan2(-fw.x, -fw.z), -Math.atan2(0.75, dist));
  __adv(2); b.camera.position.copy(p);
  const hips = us.map((u) => { const h = u.model.getObjectByName(u.kind.rag.Character1_Hips); return { h, at: h.getWorldPosition(new V()) }; });
  b.sgFire();
  const maxD = us.map(() => 0), up = us.map(() => 0), fl = us.map(() => 0), cells = [];
  for (let i = 0; i < 180; i++) {
    __adv(1); b.camera.position.x = p.x; b.camera.position.z = p.z; b.heal && b.heal();
    if (film && film.includes(i)) cells.push(__cap(320, 200));
    us.forEach((u, k) => {
      const q = hips[k].h.getWorldPosition(new V());
      maxD[k] = Math.max(maxD[k], Math.hypot(q.x - hips[k].at.x, q.z - hips[k].at.z)); up[k] = Math.max(up[k], q.y - hips[k].at.y);
      if (u.rag && !u.rag.landed) fl[k]++;
    });
  }
  const txt = us.map((u, k) => `${u.kindName} hp${u.kind.hp} ${u.st.alive ? 'ALIVE hp' + u.st.hp : 'dead'} gone${Object.keys(u.gone || {}).length} k${(u.st.killBlast || 0).toFixed(2)} thrown${maxD[k].toFixed(1)}m up${up[k].toFixed(2)} flight${fl[k]}f`).join('\n');
  return film ? { txt, sheet: __sheet(cells, 3) } : txt;
};
})();
