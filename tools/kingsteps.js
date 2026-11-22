/* THE KING'S FOOTFALLS (2026-11-21, the owner: "GIVE THE FINAL BOSS THE SAME FOOTSTEP SOUNDS THE PLAYER HAS IN THIS AREA MAKE THEM
 * MATCH HIS STEPS TOO"). Dev teleport, his fight; 12 s of you backing off from him (he hunts and fights you), every step he
 * makes counted off the buffers started from the step banks: its time, which (stone / sand), his mode, his speed — the gaps
 * between them are his cadence. Run: PB_PORT=4266 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/kingsteps.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.tmpS().ready && b.KING.u && b.KING.u.ready); i++) { b.frame(1); await sleep(50); }
for (let i = 0; i < 200 && !((b.sampleBanks.churchStep || []).filter(Boolean).length && (b.sampleBanks.sandStep || []).filter(Boolean).length); i++) await sleep(50);
w.__clockOn();
const u = b.KING.u, C = b.camera, X = b.TMP_X, Y = b.TMP_Y, Z = b.TMP_Z;
C.position.set(X - 12, Y + b.tmpFloorAt(-12, 0) + 1.7, Z); b.lookAt(X, Y + 2, Z);
for (let i = 0; i < 900 && b.kingS().mode !== 'descend'; i++) w.__adv(1);
w.__adv(30); w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
for (let i = 0; i < 600 && b.kingS().mode !== 'fight'; i++) w.__adv(1);
const ctx = b.audioCtx, CH = new Set(b.sampleBanks.churchStep.filter(Boolean)), SA = new Set(b.sampleBanks.sandStep.filter(Boolean));
let t = 0; const ev = []; const P = u.g.position; let lp = P.clone();
const orig = ctx.createBufferSource.bind(ctx);
ctx.createBufferSource = () => { const s = orig(); let buf = null; Object.defineProperty(s, 'buffer', { get: () => buf, set: (v) => { buf = v; if (CH.has(v) || SA.has(v)) ev.push([t, CH.has(v) ? 'stone' : 'sand', b.kingS().mode, +(u.mvS ? Math.hypot(u.mvS.x, u.mvS.z) : 0).toFixed(1)]); } }); return s; };
for (let f = 0; f < 60 * 12; f++) {
  const dx = C.position.x - P.x, dz = C.position.z - P.z, d = Math.hypot(dx, dz) || 1;
  if (d < 7) { C.position.x += dx / d * 5 / 60; C.position.z += dz / d * 5 / 60; }      // backing off at 5 m/s
  const lx = C.position.x - X, lz = C.position.z - Z, r = Math.hypot(lx, lz); if (r > 60) { C.position.x = X + lx / r * 60; C.position.z = Z + lz / r * 60; }
  C.position.y = Y + b.tmpFloorAt(C.position.x - X, C.position.z - Z) + 1.7; b.camBaseY = C.position.y;
  b.lookAt(P.x, P.y + 1.5, P.z); b.heal && b.heal();
  w.__adv(1); t += 1 / 60;
}
log('steps', ev.length, 'in 12 s;', ev.filter((e) => e[1] === 'stone').length, 'stone,', ev.filter((e) => e[1] === 'sand').length, 'sand');
log('events', ev.slice(0, 40).map((e, i) => e[0].toFixed(2) + ' ' + e[1] + ' ' + e[2] + ' ' + e[3] + 'm/s' + (i ? ' +' + (e[0] - ev[i - 1][0]).toFixed(2) : '')).join(' | '));
