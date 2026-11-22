/* THE PUPPETS IN THE FIGHT, AS YOU SEE THEM (2026-11-22, "LOOK HOW THEY MOVE THEIR RIGS ARE OFF"): the seven on you, your own view
 * every 8 frames for 6 s, each still labelled with what the nearest is doing (its clips and weights, leap/dash/air).
 * Run: PB_PORT=4223 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/pupframes.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
const C = b.camera, T = b.THREE, HX = b.HOUSE_X, HY = b.HOUSE_Y, HZ = b.HOUSE_Z;
b.elvLandSet(true); C.position.set(HX + 7.5, HY + 1.9, HZ); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { b.frame(1); await sleep(15); const s = b.celS(), p = b.cpS(); if (s.out && s.ready && p.models === 8 && p.ready === 8 && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) { b.frame(1); await sleep(10); }
w.__clockOn();
const X = b.CEL_X, Y = b.CEL_Y, Z = b.CEL_Z;
C.position.set(X - 0.4, Y + 1.7, Z + 1.0); b.camBaseY = C.position.y; b.setCelLast && b.setCelLast(X - 0.4, Z + 1.0, Y);
b.gainJar(1); b.cpInject(); for (let i = 0; i < 60 * 4; i++) w.__adv(1);
b.settings.devMode = false;
b.cpAllDown(); for (let i = 0; i < 60 * 2; i++) w.__adv(1);
const A = new T.AmbientLight(0xffffff, 1.4); b.scene.add(A);
const tiles = [];
for (let f = 0; f < 60 * 6 && tiles.length < 40; f++) {
  const U = b.cpUnitsS().filter((u) => u.st.alive && !u.cpHung);
  let n = null, nd = 1e9; for (const u of U) { const d = Math.hypot(u.g.position.x - C.position.x, u.g.position.z - C.position.z); if (d < nd) { nd = d; n = u; } }
  if (n) b.lookAt(n.g.position.x, Y + 0.6, n.g.position.z);
  C.position.set(X - 0.4, Y + 1.7, Z + 1.0);
  b.setHp(4); w.__adv(1);
  if (f % 9 || !n) continue;
  const acts = n.mixer._actions.filter((a) => a.isRunning() && a.getEffectiveWeight() > 0.02).map((a) => a.getClip().name + ':' + a.getEffectiveWeight().toFixed(2)).join(' ');
  const flags = [n.cpLeap ? 'LEAP' : '', n.cpDash ? 'DASH' : '', n.cpAir ? 'AIR' : '', n.st.atk >= 0 ? 'atk' + n.st.atk.toFixed(2) : '', n.st.recoil > 0 ? 'rec' : '', n._vgMode || ''].filter(Boolean).join(' ');
  for (const u of U) if (u.model) u.model.visible = true;
  const pp = C.position.clone(), q = C.quaternion.clone(), np = n.g.position, dx = np.x - pp.x, dz = np.z - pp.z, dl = Math.hypot(dx, dz) || 1;
  C.position.set(pp.x - dx / dl * 0.3, Y + 1.2, pp.z - dz / dl * 0.3); C.lookAt(np.x, Y + 0.45, np.z); C.updateMatrixWorld(true);
  b.renderer.render(b.scene, C);
  C.position.copy(pp); C.quaternion.copy(q);
  const cv = b.renderer.domElement, c = document.createElement('canvas'); c.width = 320; c.height = 240;
  const g = c.getContext('2d'); g.drawImage(cv, cv.width * 0.25, cv.height * 0.1, cv.width * 0.5, cv.height * 0.8, 0, 0, 320, 240);
  g.fillStyle = '#ff0'; g.font = '10px monospace'; g.fillText(f + ' ' + flags, 4, 12); g.fillText(acts.slice(0, 60), 4, 24); tiles.push(c);
}
const cols = 5, cv = document.createElement('canvas'); cv.width = 320 * cols; cv.height = 240 * Math.ceil(tiles.length / cols);
tiles.forEach((t, i) => cv.getContext('2d').drawImage(t, (i % cols) * 320, Math.floor(i / cols) * 240));
const d = cv.toDataURL('image/jpeg', 0.82).split(',')[1], nn = Math.ceil(d.length / 8000);
for (let i = 0; i < nn; i++) console.log('[PBIMG]', 'frames', i + '/' + nn, d.slice(i * 8000, (i + 1) * 8000));
