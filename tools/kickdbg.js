// (a quick look: does the kick's clock run, and when does it strike — 2026-11-25)
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
w.__clockOn();
for (let i = 0; i < 60 && !b.KICK.ready; i++) { w.__adv(1); await sleep(50); }
w.__kickDbg = [];
log('start', b.startKick(), 'on', b.KICK.on, 'cd', b.KICK.cd);
for (let i = 0; i < 20; i++) { w.__adv(1); log('f', i, 'on', b.KICK.on, 't', (+b.KICK.t).toFixed(3), 'struck', b.KICK.struck, 'dbg', w.__kickDbg.length); }
log('DONE');
