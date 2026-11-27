/* the farmers' weapons out of the pack (2026-11-23): the file in? each man's wanted model and what he holds. &film=1 his hand stills.
 * PB_PORT=4241 PB_WAIT=600 sh tools/probe.sh 'evalFile&f=/tools/farmwpn.js' <out> */
const ev = async (f) => w.eval(await (await fetch(f + '?' + Date.now())).text());
await ev('/tools/burntest.js'); await ev('/tools/fortboot.js');
log('boot', JSON.stringify(await w.__fortBoot()));
for (let i = 0; i < 200; i++) { b.frame(1); await sleep(30); if (b.farmWpnS().men.every((m) => !/none/.test(m))) break; }
log(JSON.stringify(b.farmWpnS()));
