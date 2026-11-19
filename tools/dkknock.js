/* THE PALADIN ON HIS BACK (2026-11-19, "make the paladin fall like the church knight if hit with enough heavies"): one
 * spawned in front of you, five heavy blows landed 1.2 s apart, his state and clip read through the fall and the get-up.
 * Run: PB_PORT=4253 sh tools/probe.sh 'evalFile&f=/tools/dkknock.js' <out> */
b.settings.devMode = true;
const cam = b.camera.position;
const u = b.dkSpawnTest(cam.x + 4, cam.z);
for (let i = 0; i < 400 && !(u.clips && u.clips.knock && !u.clipsPending); i++) { b.frame(1); await sleep(50); }
log('clips', Object.keys(u.clips || {}).length, 'knock clip', !!(u.clips && u.clips.knock), 'pending', u.clipsPending, 'kind knock', u.kind.knockClip, u.kind.knockAfter);
u.st.awake = true; u.st.hp = 999;
const out = [];
for (let k = 0; k < 7; k++) {
  b.hurtMutant(u, 1, 2.0, null);
  for (let i = 0; i < 72; i++) { b.frame(1); await sleep(16); }
  out.push(`hit${k + 1}: down ${(+(u.st.down || 0)).toFixed(2)} hh ${u.st.headHits || 0} act ${u.act ? (u.act.getClip ? u.act.getClip().name : '?') : '-'}`);
}
for (let i = 0; i < 200; i++) { b.frame(1); await sleep(16); }
out.push(`after: down ${(+(u.st.down || 0)).toFixed(2)} alive ${u.st.alive} hipY ${u.g.position.y.toFixed(2)}`);
log(out.join(' | '));
