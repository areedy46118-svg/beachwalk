/* WHAT HOLDS THE OPENING'S SLOW FRAMES (2026-11-21, the perf pass): START on the real clock and the JS sampler over the call
 * between `&a=` and `&b=` seconds of it; the functions inside frames over 25 ms, self and inclusive, top 30.
 * Run: PB_PORT=4266 PB_WAIT=240 PB_Q='&title=1&a=57&b=66' sh tools/probe.sh 'evalFile&f=/tools/callprof.js' <out> */
const Q = new URLSearchParams(location.search), A = +(Q.get('a') || 57), B = +(Q.get('b') || 66);
for (let i = 0; i < 300 && !(b.TB && b.TB.ready); i++) await sleep(100);
const st = w.document.querySelector('#overlay .start');
for (let i = 0; i < 900 && st.classList.contains('loading'); i++) await sleep(100);
for (let i = 0; i < 100 && !b.icCanRun(); i++) await sleep(100);
st.click();
while (!(b.icNow() >= A)) await new Promise((r) => w.requestAnimationFrame(r));
const P = new w.Profiler({ sampleInterval: 1, maxBufferSize: 900000 });
const slow = []; let last = performance.now();
while (b.icNow() < B && !b.IC.ended) { await new Promise((r) => w.requestAnimationFrame(r)); const now = performance.now(); if (now - last > 25) slow.push([last, now]); last = now; }
const tr = await P.stop();
const inSlow = (t) => slow.some(([a, c]) => t >= a && t <= c);
const self = new Map(), incl = new Map(); let tot = 0;
const nm = (fi) => { const f = tr.frames[fi]; return (f.name || '(anon)') + ':' + (f.line || 0) + (f.resourceId != null && !/main\.js/.test(tr.resources[f.resourceId] || '') ? '@' + (tr.resources[f.resourceId] || '').split('/').pop() : ''); };
for (const s of tr.samples) {
  if (s.stackId == null || !inSlow(s.timestamp)) continue; tot++;
  const k = nm(tr.stacks[s.stackId].frameId); self.set(k, (self.get(k) || 0) + 1);
  const seen = new Set(); for (let id = s.stackId; id != null; id = tr.stacks[id].parentId) { const kk = nm(tr.stacks[id].frameId); if (!seen.has(kk)) { seen.add(kk); incl.set(kk, (incl.get(kk) || 0) + 1); } }
}
const top = (m) => [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 30).map(([k, v]) => k + ' ' + v);
log('slow frames', slow.length, 'samples in them', tot);
log('SELF', JSON.stringify(top(self)));
log('INCL', JSON.stringify(top(incl)));
