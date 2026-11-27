/* MYLES THROUGH THE FARMERS' FIGHT (2026-11-26, the owner: "and myles went invisible"). The first castle, its fight on, him at your
 * side (`MINO.stage = 'with'`); 70 s of it on the fixed clock, you standing in the square. Every half second: is he drawn (his group
 * and each mesh up the chain), where he is against the floor and you, and what he is doing — the first moment he is NOT drawn is
 * logged with every flag that can turn him off. `&kick=1`: you kick whatever is in front every 2 s.
 *   PB_PORT=4241 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/minofort.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/fortboot.js'); log('boot', JSON.stringify(await w.__fortBoot()));
await ev('/tools/burntest.js');
const Q = new URLSearchParams(location.search), T = b.THREE, M = b.MINO;
for (let i = 0; i < 200 && !M.u; i++) { b.frame(2); await sleep(50); }
const u = M.u; if (!u) { log('no minotaur was placed'); return; }
M.stage = 'with'; M.ally = true; M.place = '?';
w.__clockOn();
{ let vis = u.model.visible; const seen = new Set(); Object.defineProperty(u.model, 'visible', { configurable: true, get() { return vis; }, set(v) { if (!v && vis) { const st = new Error().stack.split('\n').slice(2, 8).map((l) => l.trim().replace(/\(?http:\/\/localhost:\d+\//, '(').slice(0, 90)).join(' < '); if (!seen.has(st)) { seen.add(st); log('MODEL HIDDEN BY', st); } } vis = v; } }); }
const drawn = () => { if (!u.g.visible) return 0; let n = 0; u.g.traverse((o) => { if (!o.isMesh || o.name === 'hitProxy') return; for (let a = o; a; a = a.parent) if (a.visible === false) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m && m.visible !== false && !(m.transparent && m.opacity < 0.05)) n++; }); return n; };
const flags = () => JSON.stringify({ stage: M.stage, place: M.place, here: b.state().inFort ? 'fort' : '?', gVis: u.g.visible, modelVis: u.model && u.model.visible, alive: u.st.alive, hp: +(+u.st.hp).toFixed(0), retired: !!u.retired, rag: !!u.rag, kickRag: !!u.kickRag, down: +(u.st.down || 0).toFixed(2), fade: M.fade, tex: u.texW && u.texW.compiled, y: +(u.g.position.y - b.camera.position.y + 1.7).toFixed(2), dist: +Math.hypot(u.g.position.x - b.camera.position.x, u.g.position.z - b.camera.position.z).toFixed(1), scale: +u.g.scale.x.toFixed(2), mscale: u.model ? +u.model.scale.x.toFixed(3) : null, foe: !!u.st.foe, cur: u.cur ? u.cur.getClip().name : null });
let lost = 0, first = null, n0 = 0, off = 0, offY = 0; let hips = null; u.model.traverse((o) => { if (!hips && o.isBone && /hips|pelvis/i.test(o.name)) hips = o; });
for (let f = 0; f < 60 * 60; f++) {
  if (Q.get('kick') && f % 120 === 60 && b.kickS) { try { b.kickS(); } catch (e) {} }
  { const hp = hips ? hips.getWorldPosition(new T.Vector3()) : u.g.position; b.lookAt(hp.x, hp.y, hp.z); }
  w.__adv(1);
  if (hips) { const hp = hips.getWorldPosition(new T.Vector3()); off = Math.max(off, Math.hypot(hp.x - u.g.position.x, hp.z - u.g.position.z)); offY = Math.max(offY, Math.abs(hp.y - u.g.position.y - 1.2)); }
  if (f % 30 === 0) { const n = drawn(); if (f === 30) n0 = n; if (n < Math.max(1, n0)) { lost++; if (!first) { first = (f / 60).toFixed(1); log('NOT DRAWN at', first, 's: meshes', n, 'of', n0, flags()); } } }
  if (f % 600 === 0) log('t', (f / 60).toFixed(0), 'drawn meshes', drawn(), flags());
}
log('his hips strayed from his group by at most', off.toFixed(2), 'm across,', offY.toFixed(2), 'm up/down | cull sphere radius', ((u.kind.h || 2) * 0.85 + 1.2).toFixed(2));
log('half-seconds not fully drawn', lost, 'of 140 | first at', first, '| errors', JSON.stringify(w.__fortErrs.slice(0, 3)));
log('DONE');
