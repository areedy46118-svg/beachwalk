/* PREVIEW-PANE HARNESS FOR THE CATACOMBS DOOR. Not part of the game.
 * Load in the pane:  eval(await (await fetch('/tools/cattrial.js')).text())
 * then  await __catSetup();  __trial(4000)
 *
 * It reproduces the one case that parks the hunter: you are chased on the
 * GROUND FLOOR, he sees you, and then you are at the barred door nine metres
 * above him. The player is pinned (position, `camBaseY` and `groundY` every
 * tick, or his knockback walks you out of the room and gravity drops you the
 * moment the pin stops), healed, and the creature kept at full health, so
 * what is measured is his movement and nothing else.
 *
 * Returns the closest he got, the time he first reached your storey, and the
 * WORST STALL — and a stall is NET progress under 0.3 m in a second with
 * ground still to cover, excluding the beats he stands still on purpose (an
 * act, a peek's hold, a swing). A per-frame threshold never reads as still
 * while a clamp is arguing with the follower, which is the whole reason the
 * bug was invisible; and counting an act as a stall reads 29 s on a creature
 * that is eating. */
(function(){
const b=window.__bw;
window.__catSetup = async function(){
  b.beginGame(); b.fallbackLook=true;
  b.camera.position.set(12,1.7,b.CAVE_Z+14);
  for(let i=0;i<60;i++){ await new Promise(r=>setTimeout(r,250)); if(b.catWalk) break; }
  b.placeInCatacombs(); b.placeInCatacombs();
  return {catG:!!b.catG, nodes:b.catG?b.catG.nodes.length:0};
};
window.__trial = function(steps, seed){
  const u=b.crawlerUnit, g=b.catG;
  b.placeInCatacombs();
  const P0=b.camera.position.clone();
  let near=null,nd=1e9;
  for(const n of g.nodes){const d=Math.hypot(n.x-P0.x,n.z-P0.z); if(d>6&&d<12&&d<nd){nd=d;near=n;}}
  u.g.position.set(near.x,near.f,near.z); u.catFloor=near.f; u.path=null; u.catRouteFail=0; u.catGrind=0; u.catLastSeen=null; u.catGAt=null;
  const C=u.cat||(u.cat={}); C.mode='chase'; u.st.awake=true; u.st.hp=u.kind.hp;
  for(let i=0;i<400;i++){ b.camera.position.copy(P0); b.heal&&b.heal(); u.st.hp=u.kind.hp; b.step(0.016); }
  b.placeInsideCatDoor();
  const P=b.camera.position.clone(), CB=b.camBaseY, GY=b.groundY;
  let closest=1e9, worst=0, stall=0, mark={x:u.g.position.x,z:u.g.position.z}, mt=0, arrived=-1, up=-1;
  for(let i=0;i<steps;i++){
    b.camera.position.copy(P); b.camBaseY=CB; b.groundY=GY; b.heal&&b.heal(); u.st.hp=u.kind.hp;
    b.step(0.016);
    const sep=Math.hypot(u.g.position.x-P.x,u.g.position.z-P.z,u.g.position.y-(CB-1.65));
    if(sep<closest) closest=sep;
    if(arrived<0 && sep<3.0) arrived=+(i*0.016).toFixed(1);
    if(up<0 && Math.abs(u.g.position.y-(CB-1.65))<1.5) up=+(i*0.016).toFixed(1);
    const busy = C.mode==='act' || (C.peekHold||0)>0 || u.st.atk>=0 || C.mode==='down';
    mt+=0.016;
    if(mt>1.0){ const net=Math.hypot(u.g.position.x-mark.x,u.g.position.z-mark.z);
      if(!busy && net<0.3 && sep>3) stall+=mt; else { if(stall>worst) worst=stall; stall=0; }
      mark={x:u.g.position.x,z:u.g.position.z}; mt=0; }
  }
  return {closest:+closest.toFixed(2), worstStall:+Math.max(worst,stall).toFixed(1), arrivedAt:arrived, reachedDoorLevelAt:up,
    him:[+(u.g.position.x-b.CAT_X).toFixed(1),+(u.g.position.y-b.CAT_Y).toFixed(1),+(u.g.position.z-b.CAT_Z).toFixed(1)], mode:C.mode};
};
})();
