/* EVERY ENEMY THE LOG CAN HOLD (2026-11-25, the owner: "show me all enemies that can be in the enemy log"). Each kind the log would
 * take (every `MUT_KINDS` kind that is not a companion or gone, folded to its log key — the castle's men one per body — plus the crab
 * and the four of its own: gull, pliosaur, sewer monster, crying head), its likeness made the log's own way (`elogEnsure`), stood in its
 * idle, and drawn on one sheet with its key and its log name.  PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/elogall.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
b.settings.devMode = true;
const E = b.elogS, T = b.THREE, keys = [];
const add = (k) => { if (k && !keys.includes(k)) keys.push(k); };
for (const k of Object.keys(b.MUT_KINDS)) { if (E.out(k)) continue; const K = b.MUT_KINDS[k]; if (!K || !K.glb && !/^farmer/.test(k)) continue; const lk = E.kindKey(k); if (E.makeKind(lk)) add(lk); }
add('crab'); for (const k of Object.keys(E.OTHER)) add(k);
log('keys', keys.length, keys.join(' '));
for (const k of keys) { for (let i = 0; i < 3200 && !b.ELOG.snap[k] && b.ELOG.pend[k] !== 'fail'; i++) { try { E.ensure(k); } catch (e) { log('ensure fail', k, e.message); break; } b.frame(1); await sleep(15); } log(k, b.ELOG.snap[k] ? 'made' : 'NOT MADE ' + b.ELOG.pend[k]); }
// one sheet: each in its idle, framed on its bounds, lit flat and warm, its key and name under it
const R = b.renderer, S = new T.Scene(); S.background = new T.Color(0x1b1d22);
S.add(new T.HemisphereLight(0xdfe6ff, 0x3a3028, 2.2)); const dl = new T.DirectionalLight(0xffffff, 2.4); dl.position.set(2, 4, 5); S.add(dl);
const W = 260, H = 300, cols = 6, made = keys.filter((k) => b.ELOG.snap[k]), rows = Math.ceil(made.length / cols);
const sheet = document.createElement('canvas'); sheet.width = cols * W; sheet.height = rows * (H + 40); const g2 = sheet.getContext('2d'); g2.fillStyle = '#121317'; g2.fillRect(0, 0, sheet.width, sheet.height);
R.setPixelRatio(1); R.setSize(W, H, false);
made.forEach((k, i) => {
  const sn = b.ELOG.snap[k], root = sn.root; S.add(root); root.visible = true;
  if (sn.clip) { const m = new T.AnimationMixer(root.children[0] && !root.isSkinnedMesh && root.type === 'Group' && root.children.length === 1 ? root.children[0] : root); const a = m.clipAction(sn.clip); a.play(); m.update(0.4); }
  root.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(root), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), r = Math.max(sz.y, sz.x, sz.z) * 0.62 + 0.05;
  const cam = new T.PerspectiveCamera(32, W / H, 0.01, 500); cam.position.set(c.x + r * 0.9, c.y + r * 0.35, c.z + r * 2.9); cam.lookAt(c); cam.updateMatrixWorld(true);
  R.render(S, cam);
  const x = (i % cols) * W, y = Math.floor(i / cols) * (H + 40);
  g2.fillStyle = '#e6e2d6'; g2.font = 'bold 15px Georgia'; g2.fillText((i + 1) + '. ' + E.name(k), x + 8, y + 16); g2.fillStyle = '#8f96a3'; g2.font = '12px monospace'; g2.fillText(k, x + 8, y + 32);
  g2.drawImage(R.domElement, 0, 0, R.domElement.width, R.domElement.height, x, y + 40, W, H);
  if (!(sz.x > 0.01 && sz.y > 0.01)) { g2.fillStyle = '#b55'; g2.fillText('(no shape to draw)', x + 8, y + 60); }
  S.remove(root);
});
const d = sheet.toDataURL('image/jpeg', 0.86).split(',')[1], n = Math.ceil(d.length / 8000);
for (let i = 0; i < n; i++) console.log('[PBIMG]', 'enemylog', i + '/' + n, d.slice(i * 8000, (i + 1) * 8000));
log('drawn', made.length, 'of', keys.length);
log('DONE');
