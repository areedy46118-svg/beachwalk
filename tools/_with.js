/* (a probe run with switches set first: `&set=__kacOff,__x` sets each window flag true, then runs `&g=/tools/<probe>.js`) */
for (const k of (new URLSearchParams(location.search).get('set') || '').split(',').filter(Boolean)) window[k] = true;
const src = await (await fetch(new URLSearchParams(location.search).get('g') + '?' + Date.now())).text();
await new (Object.getPrototypeOf(async function () {}).constructor)('w', 'b', 'log', 'sleep', 'shot', src)(w, b, log, sleep, shot);
