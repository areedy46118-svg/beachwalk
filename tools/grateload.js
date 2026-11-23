/* the grate after a load that had it off (`liftGrate(true)`): a body lying by the hole on the drain room's floor, and pickable.
 * PB_PORT=4223 PB_WAIT=300 sh tools/probe.sh 'evalFile&f=/tools/grateload.js' <out> */
w.eval(await (await fetch('/tools/burntest.js?' + Date.now())).text());
b.settings.devMode = true;
for (let i = 0; i < 300 && !(b.state && b.state().started); i++) { b.frame(1); await sleep(50); }
w.__clockOn();
b.liftGrate(true); w.__adv(90);
const S = b.grateS(), DX = b.DRAIN_XS(), DZ = b.DRAIN_ZS(), C = b.camera;
log('after a load: off', S.off, 'body', S.prop, '| at local', (S.at[0] - DX).toFixed(2), (S.at[1] - S.floor).toFixed(2), (S.at[2] - DZ).toFixed(2), '| outlet says', JSON.stringify(S.label));
C.position.set(S.at[0] - 1.0, S.floor + 1.7, S.at[2] + 0.3); b.camBaseY = C.position.y; b.lookAt(S.at[0], S.at[1], S.at[2]); C.updateMatrixWorld(true);
log('aimed at it:', JSON.stringify(b.hoverNowS()));
