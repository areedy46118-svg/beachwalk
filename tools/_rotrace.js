const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
await ev('/tools/burntest.js'); b.settings.devMode = true; w.__clockOn();
for (let i = 0; i < 60 * 20; i++) w.__adv(1);
const T = b.THREE, v = new T.Vector3();
const us = b.farmUnitsS().filter((x) => x.st.alive && x.model && x.farm && x.farm.out && x.g.visible).slice(0, 3);
for (const u of us) {
  u.st.hp = 80; for (let i = 0; i < 40; i++) w.__adv(1);
  b.kickRagStartS(u, 1, 0, 1); let rStart = -1; { let ro = u.ragOut; Object.defineProperty(u, 'ragOut', { configurable: true, get() { return ro; }, set(x) { if (!x && ro) log('   ragOut cleared at t', ro.t.toFixed(3), 'of', ro.T, '| by', new Error().stack.split('\n').slice(2, 4).map((l) => l.trim().replace(/\(?http:\/\/localhost:\d+\//, '(').slice(0, 70)).join(' < ')); if (x) log('   ragOut set, T', x.T); ro = x; } }); }
  let seen = false, n = 0, prev = null;
  for (let f = 0; f < 60 * 6; f++) {
    w.__adv(1);
    if (!u.kickRag && (u.st.down || 0) > 0 && u.dfBones) { if (rStart < 0) rStart = f; if (f - rStart > 34) { if (seen && !((u.st.down || 0) > 0)) break; continue; }
      u.model.updateMatrixWorld(true); let lo = 1e9, ln = ''; for (const bn of u.dfBones) { const y = bn.getWorldPosition(v).y; if (y < lo) { lo = y; ln = bn.name.replace(/^mixamorig/, '').replace(/_.*$/, ''); } }
      const hd = u.model.getObjectByName ? null : null;
      if (!seen) { seen = true; log('--', u.kindName, 'riseFloor', (u.st.riseFloor ?? NaN).toFixed(3), 'riseClip', u.st.riseClipNow, 'dfBones', u.dfBones.length, u.dfBones.map((x) => x.name.replace(/^mixamorig/, '').replace(/_.*$/, '')).join(',')); }
      log('  f', f - rStart, 'ragOut', u.ragOut ? u.ragOut.t.toFixed(3) + '/' + u.ragOut.T : '-', '| lowest dfBone over riseFloor', (lo - (u.st.riseFloor ?? 0)).toFixed(3), ln, '| lift', (u.dfLift || 0).toFixed(3), '| g.y', u.g.position.y.toFixed(3), '| clip t', u.cur ? u.cur.time.toFixed(3) + ' ' + u.cur.getClip().name : '-', '| hips y', (u.model.getObjectByName ? (() => { let h = null; u.model.traverse((o) => { if (!h && o.isBone && /Hips/.test(o.name)) h = o; }); return h ? (h.getWorldPosition(v).y - (u.st.riseFloor ?? 0)).toFixed(3) : '?'; })() : '?'));
    }
    if (seen && !((u.st.down || 0) > 0)) break;
  }
}
log('DONE');
