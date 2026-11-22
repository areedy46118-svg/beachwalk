/* THE TAUNT (2026-11-21): T pressed — on the beach at night, and down in the cellar — the frame at a few moments of it, and the
 * light the hand was given there. Run: PB_PORT=4223 PB_WAIT=500 sh tools/probe.sh 'evalFile&f=/tools/taunttest.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !b.state().started; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 200 && !b.tauntS().ready; i++) { b.frame(1); await sleep(20); }
const C = b.camera;
const run = async (tag, look) => {
  w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyT', key: 't' })); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyT', key: 't' }));
  w.__adv(2); log(tag, 'after T:', JSON.stringify(b.tauntS()), '| tint', b.tauntHand.material.uniforms.tint.value.toArray().map((v) => v.toFixed(3)).join(','));
  let t = 0, k = 0; const at = [0.35, 1.2, 2.1];
  for (let i = 0; i < 60 * 2.6; i++) { look(); w.__adv(1); t += 1 / 60; if (k < at.length && t >= at[k]) { b.renderer.render(b.scene, b.camera); shot(tag + k, 560, 1.0); k++; } }
};
w.__clockOn();
C.position.set(6, 1.7, -40); b.camBaseY = 1.7;
for (let i = 0; i < 10; i++) { b.look(0.3, 0.05); w.__adv(1); }
await run('beach', () => b.look(0.3, 0.05));
// the cellar
b.elvLandSet(true); C.position.set(b.HOUSE_X + 7.5, b.HOUSE_Y + 1.9, b.HOUSE_Z); b.camBaseY = C.position.y;
for (let i = 0; i < 2500; i++) { w.__adv(1); if (i % 20 === 0) await sleep(5); if (b.celS().ready && b.celS().out && i > 60) break; }
b.startCellar(1);
for (let i = 0; i < 400 && (b.celS().celBusy || !b.celS().inCel); i++) w.__adv(1);
for (let i = 0; i < 30; i++) w.__adv(1);
await run('cellar', () => b.look(Math.PI / 2, -0.25));
