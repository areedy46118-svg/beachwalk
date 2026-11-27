/* THE MAN AT THE RAILING, KICKED THE WAY YOU KICK HIM (2026-11-26, the owner: "the enemy kicked off looking out the window should
 * ragdoll off"). `tools/tavlook.js` calls `kickMan` straight; this presses Q, so the kick goes through `startKick` → `kickTick` →
 * `kickStrike`'s choice of man, from where you would stand: &case=behind (1.2 m straight behind), &case=angle (1.3 m behind, 35°
 * off), &case=side (beside him at the rail, kicking across), &case=far (2.1 m back, the reach's edge).
 *   PB_PORT=4245 PB_WAIT=600 PB_Q='&case=angle' sh tools/probe.sh 'evalFile&f=/tools/tavkick.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
const RB = b.ROOM_BACK.tav; RB.load(); for (let i = 0; i < 400 && !RB.ready(); i++) { b.frame(2); await sleep(50); }
b.clearRoomFlags(); RB.place(); for (let i = 0; i < 90; i++) { b.frame(1); await sleep(20); }
for (let i = 0; i < 400 && !(b.tavLookoutS() && b.tavLookoutS().model && b.tavLookoutS().clips); i++) { b.frame(1); await sleep(40); }
for (let i = 0; i < 500 && !b.TAV_YARDS.on; i++) { b.frame(1); await sleep(40); }
const u = b.tavLookoutS(); if (!u) { log('NO LOOKOUT'); log('DONE'); }
b.settings.devMode = true; w.__clockOn();
for (let i = 0; i < 60; i++) w.__adv(1);
const C = b.camera, X = -6000, Z = 12000, fl0 = b.tavInfoS().floor(X - 1.4, Z - 10, 810), fl = typeof fl0 === 'number' ? fl0 : fl0.f;
const cs = new URLSearchParams(w.parent.location.search).get('case') || 'behind';
const P = u.g.position, off = { behind: [0, 1.2], angle: [Math.sin(0.61) * 1.3, Math.cos(0.61) * 1.3], side: [-0.9, 0.05], far: [0, 2.1] }[cs];
const ex = P.x + off[0], ez = P.z + off[1], yaw = Math.atan2(-(P.x - ex), -(P.z - ez));   // (look(yaw): 0 faces -Z)
const put = () => { C.position.set(ex, fl + 1.7, ez); b.camBaseY = C.position.y; b.look(yaw, -0.12); };
for (let i = 0; i < 10; i++) { put(); w.__adv(1); }
log('case', cs, '| you local', (ex - X).toFixed(2), (ez - Z).toFixed(2), '| him', (P.x - X).toFixed(2), (P.z - Z).toFixed(2), '| hp', u.st.hp, 'awake', u.st.awake);
w.__kickDbg = [];
const key = (t) => w.document.dispatchEvent(new w.KeyboardEvent(t, { code: 'KeyQ', key: 'q', bubbles: true }));
key('keydown'); put(); w.__adv(1); key('keyup');
let ragAt = null, out = null, dead = null, low = 0;
for (let f = 0; f < 60 * 6; f++) {
  if (f < 30) put(); w.__adv(1);
  if (ragAt === null && (u.rag || u.kickRag)) ragAt = (f / 60).toFixed(2);
  const H = u.rag && (u.rag.byName['Character1_Hips'] || u.rag.parts[0]);
  if (H) low = Math.min(low, H.p.y - fl);
  if (H && out === null && b.tavOutsideS(H.p.x, H.p.z)) out = (f / 60).toFixed(2);
  if (dead === null && !u.st.alive) dead = (f / 60).toFixed(2);
  if (f === 20) log('  0.33 s | rag', !!u.rag, 'kickRag', !!u.kickRag, '| awake', u.st.awake, 'hp', u.st.hp, '| clip', u.cur ? u.cur.getClip().name : '-', '| g', (P.x - X).toFixed(2), (P.z - Z).toFixed(2));
}
log('  kick dbg', JSON.stringify(w.__kickDbg.slice(0, 6)));
log('RESULT', cs, '| ragdoll at', ragAt, '| out at', out, '| lowest hips', low.toFixed(1), '| dead at', dead, '| bays down', b.tavRailS().bays.map((B) => B.dead).join(','), '| now awake', u.st.awake, 'alive', u.st.alive, 'g', (P.x - X).toFixed(2), (P.z - Z).toFixed(2));
log('DONE');
