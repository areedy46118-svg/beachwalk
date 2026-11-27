/* AN ARTIFACT ONTO A WEAPON THAT HOLDS ONE SWAPS THEM (2026-11-25, the owner: "MAKE DRAGGING AN ARTIFACT TO THE WEAPON WITH ONE ALREADY ON IT
 * JUST SWITCH IT OUT"). The katana with the Sea on it, the Flame in the pack: attach the Flame — the katana holds the Flame, the Sea is in
 * the pocket the Flame left; then with the pack full. PB_PORT=4227 PB_WAIT=200 sh tools/probe.sh 'evalFile&f=/tools/artswap.js' <out> */
for (let i = 0; i < 400 && b.bootLeft().parsing > 0; i++) { b.frame(1); await sleep(30); }
for (let i = 0; i < 600 && !b.state().introDone; i++) await sleep(100);
await sleep(800);
const K = b.katanaItem, S = b.seaArtItem, F = b.flameArtItem, slot = (it) => b.packSlotsS ? b.packSlotsS().indexOf(it) : -1;
b.addToInventory(K); b.addToInventory(S); b.addToInventory(F);
log('attach sea', b.attachArtifact(S, K), '| katana holds', K.artifact && K.artifact.name);
const fs = slot(F);
log('flame was in pocket', fs);
log('swap to flame', b.attachArtifact(F, K), '| katana holds', K.artifact && K.artifact.name, '| sea in pack', b.inventory.includes(S), 'pocket', slot(S), '| flame in pack', b.inventory.includes(F), '| sea.on', !!S.on);
// full pack
let n = 0; while (b.inventory.length < 40 && n < 40) { const it = { name: 'filler' + n, icon: '' }; if (!b.addToInventory(it)) break; n++; }
log('pack filled with', n, 'fillers');
log('swap back to sea (full pack)', b.attachArtifact(S, K), '| katana holds', K.artifact && K.artifact.name, '| flame in pack', b.inventory.includes(F), '| sea in pack', b.inventory.includes(S));
