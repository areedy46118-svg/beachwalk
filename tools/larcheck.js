/* (2026-11-25) the active body on a living man (`larHit`/`larApply`): the hit-reaction probe with a counter — how many blows started
 * one, how many bone-frames it turned, and the biggest turn it put over the clip.  PB_PORT=4241 sh tools/probe.sh 'evalFile&f=/tools/larcheck.js' <out> */
w.__larDbg = { hits: 0, frames: 0, max: 0 };
await (async () => { const src = await (await fetch('/tools/hitreact.js?' + Date.now())).text(); const F = Object.getPrototypeOf(async function () {}).constructor; await new F('w', 'b', 'log', 'sleep', 'shot', 'location', src)(w, b, () => {}, sleep, shot, { search: '?k=farmer1' }); })();
log('active body: blows', w.__larDbg.hits, '| bone-frames turned', w.__larDbg.frames, '| biggest turn', w.__larDbg.max.toFixed(1), 'deg');
log('DONE');
