/* FARMER FIGHT HARNESS. Not part of the game.  await eval(await (await fetch('/tools/farmfight.js')).text())  */
(async function(){
const b=__bw;
eval(await (await fetch('/tools/fortwalk.js')).text());
b.beginGame && b.beginGame(); await new Promise(r=>setTimeout(r,300));
await __fortSetup(); window.__hl=setInterval(()=>b.heal(),50);
window.__cap=(W=640,H=360)=>{const c=b.renderer.domElement;const cv=document.createElement('canvas');cv.width=W;cv.height=H;cv.getContext('2d').drawImage(c,0,0,W,H);return cv;};
window.__sheet=(cvs,cols=3)=>{const W=cvs[0].width,H=cvs[0].height,rows=Math.ceil(cvs.length/cols);const o=document.createElement('canvas');o.width=W*cols;o.height=H*rows;const x=o.getContext('2d');cvs.forEach((c,i)=>x.drawImage(c,(i%cols)*W,Math.floor(i/cols)*H));return o.toDataURL('image/jpeg',0.82).split(',')[1]+'#'+'x'.repeat(120000);};
const real=performance.now.bind(performance); window.__realNow=real; const base0=real(); window.__off=0; performance.now=()=>base0+window.__off;
// a clock that moves only when a frame is stepped
window.__adv=(n)=>{for(let i=0;i<n;i++){window.__off+=16.7; b.frame(1);}};
window.__unfreeze=()=>{let calm=0; for(let i=0;i<5000&&calm<40;i++){ __adv(1); calm = b.frozen()?0:calm+1; } return calm;}; __unfreeze();
b.farmFight.done=true;
b.farmCalm(); b.farmFight.done=true; b.farmFight.sent=0;
window.__shoot=(di,ui,dist=6,n=12,every=5,clipForce,camAt)=>{const D=b.farmDoors[di];const dw=b.fortW(D.cx,D.cz);
 let cx, cz; if (camAt) { cx=camAt.x; cz=camAt.z; } else { let d=dist; while(d>2 && !b.farmCobble(dw.x+D.n.x*d, dw.z+D.n.z*d)) d-=0.25; cx=dw.x+D.n.x*d; cz=dw.z+D.n.z*d; }
 b.placeInFort({x:cx,z:cz,yaw:0}); __adv(2);
 for(const q of b.farmDoors) if(q!==D) q.out=0; D.out=undefined;
 const u=b.farmUnits[ui]; if(clipForce){ u.kind=Object.assign({},u.kind,{out:[clipForce]}); }
 b.farmSendOut(u); const bst=u.farm.burst;
 const aim=()=>{const dx=dw.x-cx, dz=dw.z-cz; b.look(Math.atan2(-dx,-dz),-0.06);};
 const cells=[]; for(let i=0;i<n;i++){ __adv(every); b.camera.position.x=cx; b.camera.position.z=cz; aim(); b.frame(1); cells.push(__cap(320,200)); }
 for(const q of b.farmDoors) q.out=undefined;
 window.__lastinfo={clip:bst.clip,cam:[cx,cz],awake:u.st.awake,open:D.open,ang:D.ang}; return cells;};
/* the fight hands-off: the player stands at the gate's spot (healed), and
 * every `killEvery` seconds the nearest farmer out is cut down with a heavy */
window.__fightRun=(sec=40, killEvery=0, P=1)=>{
 b.farmCalm(); b.farmFight.done=false; b.farmFight.started=false; b.farmFight.sent=0; b.farmFight.t=0;
 const um=b.mutants.find(u=>u.kindName==='umbra'); if(um){ um.st.awake=false; um.st.atk=-1; um.st.alive=false; um.g.position.y-=200; }   // he waits out of it
 b.placeInFort(); __adv(2);
 const spot=[b.camera.position.x,b.camera.position.z];
 let dmg=0, maxLive=0, worst=0, kills=0, nextKill=killEvery; const sw0=b.farmUnits.reduce((s,u)=>s+u.st.swings,0);
 const flights=[]; const hist=[]; const slow=[];
 for(let i=0;i<60*sec;i++){ const hp0=b.state().hp; const a=performance.now(); window.__off+=16.7; b.frame(1); const dt=performance.now()-a-16.7; if(dt>25) slow.push(+dt.toFixed(0)); worst=Math.max(worst,dt);
  const hp1=b.state().hp; if(hp1<hp0) dmg+=hp0-hp1; b.heal(); b.camera.position.x=spot[0]; b.camera.position.z=spot[1];
  const out=b.farmUnits.filter(u=>u.farm.out&&u.st.alive&&!u.farm.burst); maxLive=Math.max(maxLive,out.length);
  if(killEvery && i/60>=nextKill && out.length){ nextKill+=killEvery; const u=out.sort((p,q)=>Math.hypot(p.g.position.x-spot[0],p.g.position.z-spot[1])-Math.hypot(q.g.position.x-spot[0],q.g.position.z-spot[1]))[0];
    b.look(Math.atan2(-(u.g.position.x-spot[0]),-(u.g.position.z-spot[1])),0);
    const at=[u.g.position.x,u.g.position.z]; b.hurtMutant(u,99,P); kills++; flights.push({u,at,t:i}); }
  for(const f of flights) if(f.t>=0 && i-f.t===180){ const h=f.u.rag&&f.u.rag.parts? f.u.rag.parts[0]:null; const hp=f.u.model? f.u.model.getObjectByProperty('isBone',true):null; let p=null; if(f.u.rag&&f.u.rag.p) p=f.u.rag.p; f.dist= hp? +Math.hypot(hp.getWorldPosition(new b.camera.position.constructor()).x-f.at[0], hp.getWorldPosition(new b.camera.position.constructor()).z-f.at[1]).toFixed(2):null; f.t=-1; }
  if(i%300===0) hist.push(out.length+'/'+b.farmFight.sent);
 }
 const sw=b.farmUnits.reduce((s,u)=>s+u.st.swings,0)-sw0;
 return JSON.stringify({sec, sent:b.farmFight.sent, done:b.farmFight.done, kills, dmgPerMin:+(dmg*60/sec).toFixed(1), swingsPerMin:+(sw*60/sec).toFixed(1), maxLive, hist, worstMs:+worst.toFixed(1), slow:slow.slice(0,20), flights: flights.map(f=>f.dist)});
};
/* the same, resumable in chunks (the pane dies on one long call) */
window.__fs=null;
window.__fightStart=()=>{
 b.farmCalm(); b.farmFight.done=false; b.farmFight.started=false; b.farmFight.sent=0; b.farmFight.t=0;
 const um=b.mutants.find(u=>u.kindName==='umbra'); if(um&&um.st.alive){ um.st.awake=false; um.st.atk=-1; um.st.alive=false; um.g.position.y-=200; }
 b.placeInFort(); __adv(2);
 __fs={spot:[b.camera.position.x,b.camera.position.z], dmg:0, frames:0, kills:0, nextKill:0, maxLive:0, sw0:b.farmUnits.reduce((s,u)=>s+u.st.swings,0), flights:[], hist:[], ms:[]};
 return 'started';
};
window.__fightStep=(sec=20, killEvery=3, P=1)=>{
 const F=__fs, spot=F.spot, V=b.camera.position.constructor;
 if(!F.nextKill) F.nextKill=killEvery;
 for(let i=0;i<60*sec;i++){ const hp0=b.state().hp; const a=__realNow(); window.__off+=16.7; b.frame(1); F.ms.push(__realNow()-a); F.frames++;
  const hp1=b.state().hp; if(hp1<hp0) F.dmg+=hp0-hp1; b.heal(); b.camera.position.x=spot[0]; b.camera.position.z=spot[1];
  const out=b.farmUnits.filter(u=>u.farm.out&&u.st.alive&&!u.farm.burst); F.maxLive=Math.max(F.maxLive,out.length);
  if(killEvery && F.frames/60>=F.nextKill && out.length){ F.nextKill+=killEvery; const u=out.sort((p,q)=>Math.hypot(p.g.position.x-spot[0],p.g.position.z-spot[1])-Math.hypot(q.g.position.x-spot[0],q.g.position.z-spot[1]))[0];
    b.look(Math.atan2(-(u.g.position.x-spot[0]),-(u.g.position.z-spot[1])),0);
    const hip=u.model.getObjectByName(u.kind.rag.Character1_Hips); const at=hip.getWorldPosition(new V());
    b.hurtMutant(u,99,P); F.kills++; F.flights.push({u,hip,at,f:F.frames,max:0}); }
  for(const f of F.flights){ if(f.done) continue; const p=f.hip.getWorldPosition(new V()); f.max=Math.max(f.max, Math.hypot(p.x-f.at.x,p.z-f.at.z)); if(F.frames-f.f>=240){ f.rest=+Math.hypot(p.x-f.at.x,p.z-f.at.z).toFixed(2); f.done=true; } }
  if(F.frames%300===0) F.hist.push(out.length+'/'+b.farmFight.sent);
 }
 const ms=F.ms.slice().sort((a,b)=>a-b);
 return JSON.stringify({t:+(F.frames/60).toFixed(0), sent:b.farmFight.sent, done:b.farmFight.done, kills:F.kills, dmgPerMin:+(F.dmg*3600/F.frames).toFixed(1), swingsPerMin:+((b.farmUnits.reduce((s,u)=>s+u.st.swings,0)-F.sw0)*3600/F.frames).toFixed(1), maxLive:F.maxLive, hist:F.hist.slice(-8), ms50:+ms[ms.length>>1].toFixed(1), ms99:+ms[Math.floor(ms.length*0.99)].toFixed(1), msMax:+ms[ms.length-1].toFixed(1), flights:F.flights.filter(f=>f.done).map(f=>f.rest)});
};
/* a burst from a door, filmed through a narrow lens from `camAt` */
window.__burstFilm=(di,ui,clip,camAt,n=12,every=4,fov=38)=>{ const D=b.farmDoors[di]; const dw=b.fortW(D.cx,D.cz);
 b.placeInFort({x:camAt.x,z:camAt.z,yaw:0}); __adv(2);
 for(const q of b.farmDoors) if(q!==D) q.out=0; D.out=undefined;
 const u=b.farmUnits[ui]; const k0=u.kind; if(clip) u.kind=Object.assign({},u.kind,{out:[clip]});
 b.farmSendOut(u); u.kind=k0;
 const cam=new b.camera.constructor(fov, 400/280, 0.05, 400);
 const cells=[]; for(let i=0;i<n;i++){ __adv(every); b.camera.position.x=camAt.x; b.camera.position.z=camAt.z;
  cam.position.set(camAt.x, (b.fortCourtAt(camAt.x,camAt.z)??0)+1.6, camAt.z); cam.lookAt(dw.x+D.n.x*1.6, (b.fortCourtAt(camAt.x,camAt.z)??0)+1.1, dw.z+D.n.z*1.6); cam.updateMatrixWorld();
  b.renderer.render(b.scene,cam); cells.push(__cap(400,280)); }
 for(const q of b.farmDoors) q.out=undefined; return cells; };
/* stand some of them in a row in front of you, asleep, and pose one of them through a narrow lens */
window.__lineup=(ids, dist=3.2)=>{ const V=b.camera.position.constructor; b.placeInFort(); __adv(2); const p=b.camera.position.clone(); const fw=new V(); b.camera.getWorldDirection(fw); fw.y=0; fw.normalize(); const rt=new V(-fw.z,0,fw.x);
 const us=ids.map(i=>b.farmUnits[i]);
 us.forEach((u,k)=>{ u.farm.out=true; u.farm.burst=null; u.st.awake=false; const x=p.x+fw.x*dist+rt.x*(k-(ids.length-1)/2)*1.2, z=p.z+fw.z*dist+rt.z*(k-(ids.length-1)/2)*1.2; u.g.position.set(x, b.fortCourtAt(x,z)??(p.y-1.7), z); u.g.rotation.y=Math.atan2(p.x-x,p.z-z); });
 __adv(20); b.camera.position.copy(p); return {us,p,fw,rt}; };
window.__pose=(u, clip, frac, yaw=0.5, W=300, H=300, dist=4.2)=>{ const cam=new b.camera.constructor(34, W/H, 0.05, 300); const g=u.g.position; const a0=u.g.rotation.y+yaw; cam.position.set(g.x+Math.sin(a0)*dist, g.y+1.2, g.z+Math.cos(a0)*dist); cam.lookAt(g.x, g.y+1.0, g.z); cam.updateMatrixWorld(); const a=u.clips[clip]; for(const k in u.clips) u.clips[k].stop(); a.reset(); a.play(); a.paused=true; a.time=a.getClip().duration*frac; a.setEffectiveWeight(1); u.mixer.update(0); u.g.updateMatrixWorld(true); b.renderer.render(b.scene,cam); return __cap(W,H); };
return 'ready';
})()
