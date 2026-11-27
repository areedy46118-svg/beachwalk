/* A CLIP THAT SNAPS AT ITS ENDS (2026-11-26): for every Scourger clip, straight off its tracks, how far his trunk and limbs turn
 * (summed local turn of the main bones) between each pair of keys — the first and last intervals against the clip's median. A
 * loop-closing last key on a one-shot blow is a pop the instant it ends.
 *   PB_PORT=4266 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/scourgeendpop.js' <out> */
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state; i++) await sleep(50);
b.devTeleportTemple();
for (let i = 0; i < 900 && !(b.KING.u && b.KING.u.ready && b.KING.u.kgMeasured); i++) { b.frame(1); await sleep(50); }
const u = b.KING.u, T = b.THREE, RE = /^Character1_(Hips|Spine|Spine1|Spine2|Neck|Head|RightArm|RightForeArm|RightHand|LeftArm|LeftForeArm|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg)\.quaternion$/;
const a = new T.Quaternion(), c = new T.Quaternion();
for (const k in u.clips) {
  const clip = u.clips[k].getClip(); if (clip.name !== k) continue;
  const tr = clip.tracks.filter((t) => RE.test(t.name)); if (!tr.length) continue;
  const n = Math.max(...tr.map((t) => t.times.length)), ref = tr.find((t) => t.times.length === n), mv = [];
  for (let i = 1; i < n; i++) { let s = 0; for (const t of tr) { if (t.times.length !== n) continue; a.fromArray(t.values, (i - 1) * 4); c.fromArray(t.values, i * 4); s += a.angleTo(c) * 57.3; } mv.push(s); }
  const med = mv.slice().sort((x, y) => x - y)[Math.floor(mv.length / 2)] || 1, mx = Math.max(...mv), at = mv.indexOf(mx);
  log(k.padEnd(9) + ' keys ' + n + ' dur ' + clip.duration.toFixed(2) + ' last dt ' + (ref.times[n - 1] - ref.times[n - 2]).toFixed(3) + ' | first ' + mv[0].toFixed(0) + ' last ' + mv[mv.length - 1].toFixed(0) + ' median ' + med.toFixed(0) + ' max ' + mx.toFixed(0) + ' @key ' + (at + 1) + '/' + (n - 1) + (mv[mv.length - 1] > 4 * med && mv[mv.length - 1] > 40 ? '   <<< END SNAP' : ''));
}
log('DONE');
