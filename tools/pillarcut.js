/* A CUT INTO A TEMPLE PILLAR (2026-11-21, the owner: "MAKE THE CLAW HIT THE PILLARS TOO"): the temple, the king held off; you
 * `&d=` m from a pillar's face, looking at it; `&w=hook|katana` equipped, a light cut and a heavy; whether each struck stone (the
 * world held on it — hitstop — and a scar stamped), and the same cut at open air for comparison.
 * Run: PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/pillarcut.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
const Q = new URLSearchParams(location.search), D = +(Q.get('d') || 1.1), WP = Q.get('w') || 'hook';
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
w.__clockOn(); const adv = (n = 1) => w.__adv(n);
const C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z, F = b.tmpFloorAt(0, 0), P = b.KING_PILLARS;
b.KING.mode = 'gone';
const it = WP === 'katana' ? b.katanaItem : b.hookItem; b.addToInventory(it); if (b.state().equipped !== it.name) b.toggleEquip(it); adv(40);
const a = P.a0, R = P.face, fx = Math.sin(a), fz = Math.cos(a);
const stand = (toPillar) => { const r = R - D; C.position.set(X + fx * r, Y + F + 1.7, Z + fz * r); b.camBaseY = C.position.y; if (toPillar) b.lookAt(X + fx * (R + 1), Y + F + 1.5, Z + fz * (R + 1)); else b.lookAt(X + fx * (r - 5), Y + F + 1.6, Z + fz * (r - 5)); };
const scarsN = () => { let n = 0; b.scene.traverse((o) => { if (o.isMesh && o.material && o.material.map && o.material.map === b.scarTexS && o.visible) n++; }); return n; };
const swing = async (tag, toPillar, heavy) => {
  stand(toPillar); adv(20);
  let hs = 0; const s0 = scarsN();
  if (heavy) { b.startWind(); for (let i = 0; i < 40; i++) { stand(toPillar); adv(1); } b.releaseWind(); } else b.startDig(0);
  for (let i = 0; i < 50; i++) { stand(toPillar); adv(1); hs = Math.max(hs, b.hitstop || 0); }
  log(tag, '| struck stone (hitstop)', hs.toFixed(3), '| scars', s0, '->', scarsN());
};
await swing('light, at the pillar', true, false);
await swing('light, at open air', false, false);
await swing('heavy, at the pillar', true, true);
