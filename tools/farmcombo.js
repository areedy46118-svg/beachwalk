/* THE OWNER'S COMBOS ON A FARMER (2026-11-23): each combo clip scrubbed on a man holding his weapon (120 samples): the head's speed and
 * where it is in his frame; the contacts = the head's fastest moments in front of him at head height. And stills of each combo from his
 * front-right (solo), at the weapon's seat turned by &turns=… radians (0 = as seated) to set the hold against the owner's screenshot.
 * PB_PORT=4241 PB_WAIT=700 sh tools/probe.sh 'evalFile&f=/tools/farmcombo.js&turns=-0.6,0,0.6&file=kn' <out> */
const Q = new URLSearchParams(location.search), CL = (Q.get('clips') || 'mCombo1,mCombo2,mCombo3').split(',');   // (&clips=mSwAtk: the big cut, 2026-11-25)
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
const units = () => b.farmUnitsS();
for (let i = 0; i < 400 && !(units().length >= 20 && units().every((u) => u.model && !u.parLate)); i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 300 && !units().some((x) => x.farm && x.farm.out && x.model && x.farmTool); i++) { b.frame(1); await sleep(30); }
const u = units().find((x) => x.farm && x.farm.out && x.model && x.farmTool && x.clips[CL[0]] && (!Q.get('file') || x.kind.file === Q.get('file'))) || units().find((x) => x.model && x.farmTool && x.clips[CL[0]]);
if (!u) { log('no man with the combos', JSON.stringify(units().slice(0, 3).map((x) => Object.keys(x.clips || {}).filter((k) => /Combo|ZDie/.test(k))))); }
else {
  const T = b.THREE, tip = u.bones.tip, inv = new T.Matrix4();
  log('man', u.kindName, u.kind.file, u.kind.tool, u.farmW && u.farmW.pack);
  const stopAll = () => { for (const x of Object.values(u.clips)) { x.stop(); x.enabled = false; x.setEffectiveWeight(0); } };
  const res = {};
  if (+Q.get('seat')) b.farmSeatTurnS(u, +Q.get('seat'));   // (the video's grip, `FARM_SW_SEAT`, for the passes)
  for (const nm of CL) {
    const a = u.clips[nm]; stopAll(); const dur = a.getClip().duration; a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
    const N = 160, S = [];
    const r0 = u.model.rotation.y; u.model.rotation.y = 0;
    for (let i = 0; i <= N; i++) { a.time = dur * i / N; u.mixer.update(0); u.g.updateMatrixWorld(true); inv.copy(u.g.matrixWorld).invert(); S.push(tip.getWorldPosition(new T.Vector3()).applyMatrix4(inv)); }
    u.model.rotation.y = r0;
    const sp = S.map((p, i) => (i ? p.distanceTo(S[i - 1]) * N / dur : 0));
    // the passes through the space in front of him at a man's head (fast, and most squarely in front during each pass)
    const fr = S.map((p) => p.z - Math.abs(p.x) * 0.6), pass = [];
    for (let i = 1; i < N; i++) { const ok = sp[i] > 5 && fr[i] > 0.15 && S[i].y > 1.05 && S[i].y < 2.3; if (ok) { const l = pass[pass.length - 1]; if (l && i - l.e <= 2) { l.e = i; if (fr[i] > fr[l.b2]) l.b2 = i; } else pass.push({ s: i, e: i, b2: i }); } }
    log('   PASSES', nm, pass.map((q) => `${(q.b2 / N).toFixed(3)} (${(q.s / N).toFixed(2)}-${(q.e / N).toFixed(2)}, ${sp[q.b2].toFixed(0)} m/s, ${fr[q.b2].toFixed(2)} in front at y ${S[q.b2].y.toFixed(2)})`).join(' ; '));
    const peaks = [];
    for (let i = 2; i < N - 1; i++) if (sp[i] > 3.0 && sp[i] >= sp[i - 1] && sp[i] >= sp[i + 1] && sp[i] >= sp[i - 2] && sp[i] >= sp[i + 2] && S[i].z > 0.25 && S[i].y > 0.9 && S[i].y < 2.3) peaks.push([i / N, sp[i], S[i]]);
    // merge peaks closer than 0.08 of the clip (keep the faster)
    const kept = []; for (const pk of peaks) { const l = kept[kept.length - 1]; if (l && pk[0] - l[0] < 0.08) { if (pk[1] > l[1]) kept[kept.length - 1] = pk; } else kept.push(pk); }
    res[nm] = kept.map((k) => +k[0].toFixed(3));
    const all = []; for (let i = 2; i < N - 1; i++) if (sp[i] > 4 && sp[i] >= sp[i - 1] && sp[i] >= sp[i + 1] && sp[i] >= sp[i - 2] && sp[i] >= sp[i + 2]) all.push(`${(i / N).toFixed(2)}:${sp[i].toFixed(0)}m/s@${S[i].x.toFixed(1)},${S[i].y.toFixed(1)},${S[i].z.toFixed(1)}`);
    log('   every peak (frac:speed@x,y,z his frame; +x his left, +z in front)', all.join(' '));
    log(nm, dur.toFixed(2) + 's', '| contacts', kept.map((k) => `${k[0].toFixed(3)} (${k[1].toFixed(1)} m/s at ${k[2].x.toFixed(2)},${k[2].y.toFixed(2)},${k[2].z.toFixed(2)})`).join(' ; '));
  }
  log('FARM_COMBO', JSON.stringify(res));
  // stills: solo, from his front-right, at the turns
  const cam = b.camera, C = cam.position, home = C.clone(), hid = [];
  b.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine) && o.visible) { let x = o, mine = false; while (x) { if (x === u.g) { mine = true; break; } x = x.parent; } if (!mine) { o.visible = false; hid.push(o); } } });
  for (let x = u.g; x; x = x.parent) x.visible = true; u.model.visible = true; u.model.traverse((o) => { if (o.isMesh) o.visible = true; });
  const bg = b.scene.background; b.scene.background = new T.Color(0x8a8a8a);
  const P = u.g.position, ry = u.g.rotation.y;
  const turns = (Q.get('turns') || '0').split(',').map(Number);
  const W = +(Q.get('W') || 220), VIEWS = (Q.get('views') || '0.55').split(',').map(Number), sheet = w.document.createElement('canvas'), frs = (Q.get('frs') || '0.12,0.25,0.38,0.5,0.62,0.75').split(',').map(Number);
  sheet.width = W * frs.length; sheet.height = W * CL.length * turns.length * VIEWS.length; const g = sheet.getContext('2d');
  let row = 0;
  for (const tr of turns) {
    if (tr) b.farmSeatTurnS(u, tr);
    for (const nm of CL) for (const VW of VIEWS) {
      const a = u.clips[nm]; stopAll(); const dur = a.getClip().duration; a.reset(); a.play(); a.enabled = true; a.setEffectiveWeight(1); a.paused = true;
      frs.forEach((fr, i) => {
        a.time = dur * fr; u.mixer.update(0); u.model.rotation.y = 0;
        cam.fov = 35; cam.updateProjectionMatrix();
        C.set(P.x + Math.sin(ry + VW) * 4.2, P.y + 1.2, P.z + Math.cos(ry + VW) * 4.2); b.lookAt(P.x, P.y + 1.1, P.z); cam.updateMatrixWorld(true);
        b.scene.updateMatrixWorld(true); b.renderer.render(b.scene, cam);
        const src = b.renderer.domElement, s = Math.min(src.width, src.height); g.drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, i * W, row * W, W, W);
        g.fillStyle = '#000'; g.font = '11px monospace'; g.fillText(`${nm} ${fr} view ${VW}`, i * W + 3, row * W + 12);
      });
      row++;
    }
    if (tr) b.farmSeatTurnS(u, -tr);
  }
  for (const o of hid) o.visible = true; b.scene.background = bg; C.copy(home); cam.fov = 105; cam.updateProjectionMatrix();
  const d = sheet.toDataURL('image/jpeg', 0.85).split(',')[1], N2 = Math.ceil(d.length / 8000); for (let i = 0; i < N2; i++) console.log(`[PBIMG] combos ${i}/${N2} ${d.slice(i * 8000, (i + 1) * 8000)}`);
}
