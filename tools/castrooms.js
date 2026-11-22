/* EVERY ROOM'S PEOPLE, WHOLE (2026-11-22, the owner: "do it for every room"): a fresh game; each room loaded and walked into (its
 * `place`, as a cut does), and how long until everyone within reach is whole (`castLoading` 0) — who is not, if any.
 * Run: PB_PORT=4223 PB_WAIT=900 sh tools/probe.sh 'evalFile&f=/tools/castrooms.js' <out> */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
await sleep(1500);
const R = { keep: 60, tav: 40, uc: 60, dojo: 60, cat: 60, bunker: 45, whale: 60, thr: 60, dun: 40, cel: 30, sewer: 60, fort: 110, c13: 110 };
for (const k of Object.keys(R)) {
  const RB = b.ROOM_BACK[k]; if (!RB) { log(k, 'no ROOM_BACK'); continue; }
  try { b.clearRoomFlags(); } catch (e) {}
  RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(40); }
  if (!RB.ready()) { log(k, 'never ready'); continue; }
  RB.place(); const t0 = performance.now(); let n = -1;
  for (let i = 0; i < 400; i++) { b.frame(1); await sleep(15); n = b.castLoadingS(R[k]); if (n === 0) break; }
  log(k.padEnd(7), '| whole after', ((performance.now() - t0) / 1000).toFixed(2), 's | still being made', n, n ? '(' + b.castWhoS(R[k]) + ')' : '');
}
