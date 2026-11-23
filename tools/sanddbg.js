/* why the new sand is not seen: counts, a grain's place on screen, its alpha/size (2026-11-22) */
for (let i = 0; i < 100 && !b.state().started; i++) { try { b.beginGame(); } catch (e) {} await sleep(150); }
for (let i = 0; i < 300 && !b.state().introDone; i++) await sleep(100);
await sleep(4000); w.requestAnimationFrame = () => 0; await sleep(100);
const C = b.camera, X = 8, Z = -40; C.position.set(X + 1.1, 1.5, Z + 1.1); b.camBaseY = 1.5; b.lookAt(X, 0.35, Z); b.frame(2);
b.spawnPuffs(X, Z, 30, -0.7, -0.7, 0.06);
const F = b.sandFxS(); log('after spawn: live', F.SG.live, F.SD.live, 'gnd', F.SG.gnd[F.SG.i - 1], 'y', F.SG.p[(F.SG.i - 1) * 3 + 1]);
for (let k = 0; k < 8; k++) b.frame(1);
const G = F.grains, A = G.geometry.attributes.aA.array, P = G.geometry.attributes.position.array, S = G.geometry.attributes.aS.array; let n = 0, j = -1; for (let i = 0; i < A.length; i++) if (A[i] > 0) { n++; j = i; }
const v = new b.THREE.Vector3(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]); C.updateMatrixWorld(true); const sc = v.clone().project(C);
log('after 8 frames: live', F.SG.live, 'drawn', n, 'visible', G.visible, 'sample', v.toArray().map((x) => x.toFixed(2)).join(','), 'ndc', sc.x.toFixed(2), sc.y.toFixed(2), sc.z.toFixed(3), 'size', S[j], 'uPx', G.material.uniforms.uPx.value.toFixed(0), 'cam', C.position.toArray().map((x) => x.toFixed(1)).join(','), 'layers', G.layers.mask, 'parent', G.parent && G.parent.type);
log('dust drawn', [...F.dust.geometry.attributes.aA.array].filter((a) => a > 0).length, 'clods', b.scene.children.includes(F.grains));
