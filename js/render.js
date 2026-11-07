'use strict';
/* canvas 繪圖同鏡頭 */
/* ---------- drawing ---------- */
function ell(x,y,rx,ry){ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2)}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
const rgb=(c,k=1)=>`rgb(${c.map(v=>Math.round(v*k)).join(',')})`;
// Ink stays in world scale so the portrait camera and hit targets stay unchanged.
function inkFill(){ctx.fill();ctx.strokeStyle='#35251c';ctx.lineWidth=1.35*cam.z;ctx.lineJoin='round';ctx.stroke()}
function inkRect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#35251c';ctx.lineWidth=1.1*cam.z;ctx.strokeRect(x,y,w,h)}
function label(txt,x,y,col,size=11){ctx.font=`700 ${size*Math.max(.8,cam.z)}px "Noto Sans HK",sans-serif`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(23,18,13,.75)';ctx.strokeText(txt,x,y);ctx.fillStyle=col;ctx.fillText(txt,x,y)}
function drawProp(p){
  if(!fogKnown(p)&&!fogVisible(p))return;
  const hs=p.s/2,h=p.h;
  const N=[p.x-hs,p.y-hs],E=[p.x+hs,p.y-hs],S=[p.x+hs,p.y+hs],Wc=[p.x-hs,p.y+hs];
  const P=(q,hh)=>scr(q[0],q[1],hh);
  const poly=(pts,fill)=>{ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fillStyle=fill;inkFill()};
  // Paint directly on the existing footprint; decorations never change hit targets.
  const point=(a,b,v)=>P([p.x+hs*a,p.y+hs*b],v);
  const panel=(a,b,c,d,fill)=>poly([a,b,c,d],fill);
  const seam=(a,b,color='#66503a')=>{ctx.strokeStyle=color;ctx.lineWidth=.8*cam.z;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()};
  const sc=scr(p.x,p.y);ctx.fillStyle='rgba(40,24,10,.28)';ell(sc.x+6*cam.z,sc.y+3*cam.z,p.s*40*cam.z,p.s*18*cam.z);ctx.fill();
  if(p.tree){
    inkRect(sc.x-2*cam.z,sc.y-p.h*.7*cam.z,4*cam.z,p.h*.7*cam.z,'#70513a');
    for(const [hh,w] of [[.45,12],[.7,10],[.93,7]])poly([{x:sc.x-w*cam.z,y:sc.y-p.h*hh*cam.z},{x:sc.x,y:sc.y-(p.h*hh+14)*cam.z},{x:sc.x+w*cam.z,y:sc.y-p.h*hh*cam.z}],rgb(p.c,hh===.45?.8:1));
    return;
  }
  if(p.bed){
    for(const [a,b] of [[-.85,-.85],[-.85,.85],[.85,.85],[.85,-.85]])panel(point(a,b,0),point(a+.18,b,0),point(a+.18,b,h),point(a,b,h),'#72523a');
    panel(point(-1,1,2),point(1,1,2),point(1,1,h),point(-1,1,h),'#8a6744');
    panel(point(1,1,2),point(1,-1,2),point(1,-1,h),point(1,1,h),'#644c36');
    panel(point(-1,-1,h),point(1,-1,h),point(1,1,h),point(-1,1,h),'#d8bc87');
    panel(point(-.94,-.14,h+.8),point(.94,-.14,h+.8),point(.94,.94,h+.8),point(-.94,.94,h+.8),'#888469');
    panel(point(-.76,-.85,h+1.8),point(.76,-.85,h+1.8),point(.76,-.38,h+1.8),point(-.76,-.38,h+1.8),'#eddbb7');
    // One large worn corner stays legible on a phone.
    poly([point(.38,.94,h+1),point(.94,.94,h+1),point(.94,.48,h+1),point(.65,.57,h+1)],'#d8bc87');
    return;
  }
  poly([P(Wc,0),P(S,0),P(S,h),P(Wc,h)],rgb(p.c,.82));
  poly([P(S,0),P(E,0),P(E,h),P(S,h)],rgb(p.c,.62));
  poly([P(N,h),P(E,h),P(S,h),P(Wc,h)],rgb(p.c,1.12));
  if(p.crate){
    for(const v of [h/3,h*2/3]){seam(P(Wc,v),P(S,v));seam(P(S,v),P(E,v))}
    for(const a of [-.34,.34])seam(point(a,-1,h),point(a,1,h));
    panel(point(-.88,1,h*.12),point(-.65,1,h*.12),point(.88,1,h*.88),point(.65,1,h*.88),'#c09761');
  }
  if(p.furnace){
    panel(point(-.7,1,h*.15),point(.7,1,h*.15),point(.7,1,h*.72),point(-.7,1,h*.72),'#292a28');
    for(const v of [.3,.65]){seam(P(Wc,h*v),P(S,h*v),'#56564f');seam(P(S,h*v),P(E,h*v),'#56564f')}
    panel(point(-.4,-.4,h),point(.35,-.4,h),point(.35,-.4,h+24),point(-.4,-.4,h+24),'#77766b');
    panel(point(.35,-.4,h),point(.35,.25,h),point(.35,.25,h+24),point(.35,-.4,h+24),'#4f514b');
    panel(point(-.4,-.4,h+24),point(.35,-.4,h+24),point(.35,.25,h+24),point(-.4,.25,h+24),'#333631');
    return;
  }
  if(p.house){
    panel(point(-1,1,0),point(1,1,0),point(1,1,h),point(-1,1,h),'#c8b58c');
    panel(point(1,1,0),point(1,-1,0),point(1,-1,h),point(1,1,h),'#777360');
    // Timber posts, plaster panels and low thatched/tiled roofs.
    for(const a of [-.65,-.3,.05,.4,.75]){
      seam(point(a,1,1),point(a,1,h-1),'#76563a');
      seam(point(1,a,1),point(1,a,h-1),'#524332');
    }
    panel(point(-1,1,1),point(1,1,1),point(1,1,h*.18),point(-1,1,h*.18),'#87633e');
    panel(point(1,1,1),point(1,-1,1),point(1,-1,h*.18),point(1,1,h*.18),'#674e35');
    panel(point(-.48,1,0),point(.03,1,0),point(.03,1,h*.62),point(-.48,1,h*.62),'#403024');
    panel(point(.28,1,h*.42),point(.8,1,h*.42),point(.8,1,h*.72),point(.28,1,h*.72),'#8d6b46');
    for(const v of [.51,.62])seam(point(.3,1,h*v),point(.78,1,h*v),'#48362a');
    const roof=p.temple?'#666e69':'#ac8c51',ridge=p.temple?'#848b7e':'#c4a568';
    panel(point(-1.18,-1.18,h+1),point(1.18,-1.18,h+1),point(1.18,0,h+14),point(-1.18,0,h+14),ridge);
    panel(point(-1.18,0,h+14),point(1.18,0,h+14),point(1.18,1.18,h+1),point(-1.18,1.18,h+1),roof);
    poly([point(1.18,-1.18,h+1),point(1.18,0,h+14),point(1.18,1.18,h+1)],p.temple?'#454f4b':'#806b42');
    for(let n=1;n<8;n++){const a=-1.18+n*2.36/8;seam(point(a,0,h+14),point(a,1.18,h+1),p.temple?'#3f4946':'#80693c')}
    seam(point(-1.25,0,h+15),point(1.25,0,h+15),'#493c2b');
    if(!p.temple)panel(point(.08,1.02,h*.62),point(.9,1.02,h*.62),point(.9,1.02,h*.78),point(.08,1.02,h*.78),'#55695c');
  }
  if(p.isOre){const t=P([p.x,p.y],h);ctx.fillStyle=p.ore==='copper'?'#e39a5c':'#c9d4dc';
    [[-6,-1],[4,2],[1,-4],[7,-2]].forEach(([dx,dy])=>{ell(t.x+dx*cam.z,t.y+dy*cam.z,1.8*cam.z,1.2*cam.z);ctx.fill()});
    if(fogVisible(p))label(ITEMS[p.ore].name,t.x,t.y-8*cam.z,'#f2e7d4',10)}
}
function drawPile(p){const s=scr(p.x,p.y),z=cam.z;
  if(!fogVisible(p))return;
  if(p.permanent){drawProp({x:p.x,y:p.y,s:.65,h:10,c:p.pack.length?[155,116,64]:[106,97,74],crate:1});label(p.pack.length?p.name:'已搜清',s.x,s.y-20*z,'#e8d9ae',9);return}
  const fade=simT-p.t>240?.5+.5*Math.sin(simT*6):1;ctx.globalAlpha=fade;
  ctx.fillStyle='rgba(35,20,8,.35)';ell(s.x,s.y+1*z,9*z,3.5*z);ctx.fill();
  ctx.fillStyle='#9b7a4f';ell(s.x,s.y-4*z,7.5*z,6*z);ctx.fill();ctx.fillStyle='#7d5f3b';ell(s.x+2*z,s.y-3*z,4.5*z,4.5*z);ctx.fill();
  ctx.fillStyle='#6a4f30';ctx.fillRect(s.x-2*z,s.y-12*z,4*z,3*z);ctx.globalAlpha=1;
  if(p.pack.length>1)label(p.pack.length+'',s.x+9*z,s.y-10*z,'#f0c45a',9)}
function hpBar(u,x,y,k){const w=(u.kind==='dog'?18:26)*k,bx=x-w/2,p=pct(u);
  ctx.fillStyle='rgba(20,14,8,.75)';ctx.fillRect(bx-1,y-1,w+2,4*k+2);
  ctx.fillStyle=u.team==='g'?'#7ea4dc':u.team==='w'?'#c98a4a':u.team==='e'?'#d65b41':p<.3?'#e5813c':'#8fc56e';ctx.fillRect(bx,y,w*p,4*k)}
function drawDog(u,s,z){
  const k=z,f=u.face;
  if(u.down||u.dead){
    ctx.save();ctx.translate(s.x,s.y);ctx.scale(f*k,k);
    if(u.dead){ctx.fillStyle='rgba(120,35,22,.35)';ell(1,0,12,3);ctx.fill()}
    ctx.strokeStyle='#35251c';ctx.lineWidth=1.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-7,-3);ctx.lineTo(-12,-1);ctx.moveTo(-4,-2);ctx.lineTo(-5,1);ctx.moveTo(3,-2);ctx.lineTo(5,1);ctx.moveTo(-8,-4);ctx.lineTo(-13,-6);ctx.stroke();
    const shape=(x,y,rx,ry,c)=>{ctx.fillStyle=c;ell(x,y,rx,ry);ctx.fill();ctx.strokeStyle='#35251c';ctx.lineWidth=1.2;ctx.stroke()};
    shape(0,-4,9,4,u.color);shape(9,-3.5,4,3,'#a17b50');
    ctx.fillStyle='#59432d';ctx.beginPath();ctx.moveTo(6,-6);ctx.lineTo(7,-9);ctx.lineTo(10,-6);ctx.fill();
    ctx.strokeStyle='#35251c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(9,-4);ctx.lineTo(11,-3);if(u.dead){ctx.moveTo(9,-3);ctx.lineTo(11,-4)}ctx.stroke();ctx.restore();return;
  }
  const run=u.moving?Math.sin(simT*18+u.id*30):0,x=s.x+u.lunge*4*f*k,y=s.y;
  ctx.strokeStyle='#4a3524';ctx.lineWidth=2*k;ctx.lineCap='round';
  [[-6,run],[-3,-run],[3,run],[6,-run]].forEach(([dx,r])=>{ctx.beginPath();ctx.moveTo(x+dx*k*f,y-7*k);ctx.lineTo(x+(dx+r*2)*k*f,y);ctx.stroke()});
  ctx.fillStyle=u.color;ell(x,y-9*k,9*k,4.5*k);inkFill();
  ctx.fillStyle='rgba(0,0,0,.18)';ell(x,y-7.5*k,8*k,2.5*k);ctx.fill();
  ctx.fillStyle='#a17b50';ell(x+10*k*f,y-13*k,4.5*k,4*k);inkFill();
  ctx.fillStyle='#35251c';ell(x+11*k*f,y-14*k,.8*k,.8*k);ctx.fill();
  ctx.fillStyle='#4a3524';ctx.beginPath();ctx.moveTo(x+8*k*f,y-16*k);ctx.lineTo(x+10*k*f,y-20*k);ctx.lineTo(x+12*k*f,y-16*k);ctx.fill();
  ctx.strokeStyle=u.color;ctx.lineWidth=2*k;ctx.beginPath();ctx.moveTo(x-8*k*f,y-10*k);ctx.lineTo(x-13*k*f,y-15*k+run*k);ctx.stroke();
  if(pct(u)<1||paused)hpBar(u,x,y-26*k,k);
}
function drawBodyLying(u,s,z,lift){
  ctx.save();ctx.translate(s.x,s.y-lift*z);ctx.scale(u.face*z,z);
  const box=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#35251c';ctx.lineWidth=1.1;ctx.strokeRect(x,y,w,h)};
  const limb=(part,x1,y1,x2,y2)=>{
    const p=u.p[part];if(p.lost&&!p.pros)return;
    ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle='#35251c';ctx.lineWidth=4;ctx.stroke();
    ctx.strokeStyle=p.pros?'#a9b7c0':part==='legs'?'#514332':'#d6ad84';ctx.lineWidth=2;ctx.stroke();
  };
  // Keep the same head/body proportions as standing characters, laid sideways.
  limb('legs',-5,-6,-14,-6);limb('legs',-5,-2,-13,0);
  limb('larm',2,-8,-3,-11);
  box(-6,-9,12,9,u.color);
  box(-6,-9,4,9,u.eq.armor==='mechanism_armor'?'#9b895d':u.eq.armor==='forged_armor'?'#789c9e':u.eq.armor==='plate'?'#a6afb1':['leather','worked_armor'].includes(u.eq.armor)?'#806044':u.color);
  box(-5,-9,2,9,'#66503a');
  if(u.team==='a'||u.team==='e')box(3,-9,3,9,u.team==='e'?'#8e392d':'#b97942');
  limb('rarm',2,-2,-2,1);
  ctx.fillStyle=u.dead?'#b49b7f':'#d6ad84';ell(10,-5,5.6,5);ctx.fill();ctx.strokeStyle='#35251c';ctx.lineWidth=1.2;ctx.stroke();
  box(7,-9,3,8,u.team==='e'?'#7e2416':u.color);
  if(u.team==='g')box(6,-10,4,10,'#9aa6b0');
  if(u.team==='n'){box(6,-11,2,12,'#7a5a2a');box(3,-8,3,6,'#7a5a2a')}
  ctx.strokeStyle='#35251c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(11,-6);ctx.lineTo(13,-4);if(u.dead){ctx.moveTo(11,-4);ctx.lineTo(13,-6)}ctx.stroke();
  // Equipment stays attached visually; this never creates a loot item.
  if(u.eq.weapon){
    ctx.strokeStyle='#35251c';ctx.lineWidth=3;ctx.beginPath();
    if(u.eq.weapon==='bow')ctx.arc(-1,0,7,.4,Math.PI-.4);else{ctx.moveTo(-7,3);ctx.lineTo(5,3)}
    ctx.stroke();ctx.strokeStyle='#c8c1a9';ctx.lineWidth=1.4;ctx.stroke();
    if(u.eq.weapon==='axe')box(2,1,4,4,'#a6afb1');
  }
  ctx.restore();
}
function drawUnit(u){
  if(!unitVisible(u))return;
  const z=cam.z,isSel=sel.has(u);
  if(u.carriedBy){const s=scr(u.x,u.y);if(u.kind==='dog')drawDog(u,{x:s.x,y:s.y-20*z},z);else drawBodyLying(u,s,z,20);return}
  const s=scr(u.x,u.y);
  ctx.fillStyle='rgba(35,20,8,.38)';ell(s.x,s.y,11*z,5*z);ctx.fill();
  if(isSel){const pulse=1+Math.sin(performance.now()/220)*.06;ctx.strokeStyle='#eaa93a';ctx.lineWidth=2*z;ell(s.x,s.y,15*z*pulse,7.5*z*pulse);ctx.stroke()}
  if((u.team==='e'||u.team==='w')&&u.aggro&&!u.down){ctx.strokeStyle='rgba(214,91,65,.7)';ctx.lineWidth=1.5*z;ell(s.x,s.y,13*z,6.5*z);ctx.stroke()}
  if(u.kind==='dog'){drawDog(u,s,z);return}
  if(u.state==='瞓緊'&&!u.down&&!u.dead){drawBodyLying(u,s,z,6);label('Zz',s.x+10*z,s.y-20*z-((simT*8)%6)*z,'#cfd8de',10);return}
  if(u.dead){ctx.fillStyle='rgba(120,20,10,.38)';ell(s.x+2*z,s.y,14*z,5*z);ctx.fill();drawBodyLying(u,s,z,0);
    if(u.team==='a')label('亡',s.x,s.y-14*z,'#ff7a5c',9);return}
  if(u.down){drawBodyLying(u,s,z,0);
    if(u.team==='a'){ctx.strokeStyle='#f2c14e';ctx.lineWidth=2*z;ctx.strokeStyle=u.bleed>0?'#d8553d':'#f2c14e';ctx.beginPath();ctx.arc(s.x,s.y-18*z,6*z,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.02,recov(u)));ctx.stroke();label(u.bleed>0?'血':'倒',s.x,s.y-15*z,u.bleed>0?'#ff7a5c':'#f2c14e',9)}
    if(u.bounty)label(`懸賞 ${u.bounty} 文`,s.x,s.y-22*z,'#f0c45a',10);
    if(u.team==='e'&&(u.pack.length||u.eq.weapon||u.eq.armor)){ctx.fillStyle='#f0c45a';ell(s.x-12*z,s.y-8*z,2.5*z,2.5*z);ctx.fill()}
    return}
  const crawl=ratio(u,'legs')<=0;
  const bob=u.moving?Math.abs(Math.sin(simT*11+u.id*20))*-2:0;
  const k=z,x=s.x+u.lunge*5*u.face*k,y=s.y+bob*k+(crawl?8*k:0);
  if(u.bleed>.15&&Math.random()<u.bleed*.08)fx.drops.push({x:u.x,y:u.y,t:0});
  if(!crawl){const legColor=u.p.legs.pros?'#8d9aa3':'#514332';inkRect(x-4*k,y-9*k,3*k,9*k,legColor);inkRect(x+1*k,y-9*k,3*k,9*k,legColor)}
  ctx.save();rr(x-6.5*k,y-23*k,13*k,15*k,2*k);ctx.fillStyle=u.color;inkFill();ctx.clip();
  ctx.fillStyle='rgba(42,28,19,.32)';ctx.fillRect(x-6.5*k,y-23*k,5*k,15*k);
  const ar=u.eq.armor;if(['leather','plate','worked_armor','forged_armor','mechanism_armor'].includes(ar)){ctx.fillStyle=ar==='mechanism_armor'?'#9b895d':ar==='forged_armor'?'rgba(120,170,175,.85)':ar==='plate'?'rgba(190,200,210,.7)':'rgba(110,70,40,.65)';ctx.fillRect(x-6.5*k,y-23*k,13*k,7*k);if(['forged_armor','mechanism_armor'].includes(ar)){ctx.fillStyle='#d4ac61';ctx.fillRect(x-6.5*k,y-18*k,13*k,1.5*k)}}
  ctx.restore();
  inkRect(x-6*k,y-11*k,12*k,2.2*k,'#66503a');
  inkRect(x-1.5*k,y-11*k,3*k,2.2*k,'#d4ac61');
  if(u.p.larm.pros||u.p.rarm.pros){const px=x+(u.p.rarm.pros?-6.5:3)*k*u.face;inkRect(px,y-22*k,3.5*k,12*k,u.p.larm.pros==='scrap'||u.p.rarm.pros==='scrap'?'#9b7849':'#89978b');inkRect(px,y-18*k,3.5*k,2*k,'#c5a05a')}
  if(ratio(u,'larm')<=0||ratio(u,'rarm')<=0){ctx.fillStyle='#c9442e';ctx.fillRect(x-6.5*k,y-18*k,13*k,2.2*k)}
  ctx.fillStyle='#d6ad84';ell(x,y-28*k,5.6*k,5.6*k);inkFill();
  ctx.fillStyle='#a47652';ctx.beginPath();ctx.arc(x,y-28*k,5.1*k,Math.PI/2,Math.PI*1.5);ctx.fill();
  ctx.fillStyle=u.team==='e'?'#7e2416':u.color;ctx.fillRect(x-5.6*k,y-31.5*k,11.2*k,2.6*k);
  if(u.team==='e'){ctx.fillStyle='#7e2416';ctx.fillRect(x-5.6*k,y-28*k,11.2*k,2*k)}
  if(u.team==='g'){ctx.fillStyle='#4c5a5c';ctx.beginPath();ctx.moveTo(x-8*k,y-30*k);ctx.lineTo(x,y-38*k);ctx.lineTo(x+8*k,y-30*k);ctx.closePath();inkFill()}
  if(u.team==='n'){ctx.fillStyle='#b3985b';ctx.beginPath();ctx.moveTo(x-9*k,y-32*k);ctx.lineTo(x,y-39*k);ctx.lineTo(x+9*k,y-32*k);ctx.closePath();inkFill()}
  if(u.team==='a'){inkRect(x-2*k,y-35*k,4*k,3*k,'#35251c');ctx.strokeStyle='#d3be8d';ctx.lineWidth=.8*k;ctx.beginPath();ctx.moveTo(x-4*k,y-18*k);ctx.lineTo(x+4*k,y-12*k);ctx.stroke()}
  ctx.fillStyle='#35251c';ctx.fillRect(x+2*u.face*k,y-29*k,1.5*k,1.2*k);
  // One broad scarf fold reads better than fine texture at the mobile zoom.
  if(u.team==='a'||u.team==='e'){
    inkRect(x-5*k,y-24*k,10*k,3*k,u.team==='e'?'#8e392d':'#b97942');
    ctx.fillStyle=u.team==='e'?'#8e392d':'#b97942';ctx.beginPath();ctx.moveTo(x-4*u.face*k,y-23*k);ctx.lineTo(x-10*u.face*k,y-18*k);ctx.lineTo(x-8*u.face*k,y-25*k);ctx.closePath();inkFill();
  }
  if(!u.carry){const w=u.eq.weapon,droop=ratio(u,'rarm')<=0;
    ctx.strokeStyle='#d8cfbd';ctx.lineWidth=(w==='axe'?2.6:1.7)*k;ctx.beginPath();
    if(range(u)>2){ctx.arc(x+7*k*u.face,y-17*k,7*k,u.face>0?-1.2:Math.PI-1.9,u.face>0?1.2:Math.PI+1.9-.7)}
    else if(droop){ctx.moveTo(x+6*k*u.face,y-12*k);ctx.lineTo(x+11*k*u.face,y-2*k)}
    else if(w){ctx.moveTo(x+6*k*u.face,y-14*k);ctx.lineTo(x+(13+u.lunge*3)*k*u.face,y-25*k)}
    ctx.stroke();
    if(w==='axe'&&!droop){ctx.fillStyle='#c8ccd0';ctx.fillRect(x+(11+u.lunge*3)*k*u.face-(u.face<0?5*k:0),y-28*k,5*k,6*k)}}
  if(u.team==='n'||u.team==='g')label(u===TRADER?'商人 · 交易／工匠':u===INNKEEPER?'宿屋 · 酒場':'足輕',x,y-46*k,u.team==='n'?'#f0c45a':'#bcd0ec',10);
  else if(u.kind==='caravan')label('遊商 · 點我交易',x,y-46*k,'#f0c45a',10);
  else if(u.team==='s'&&!scavAngry.has(u.gid))label('落武者',x,y-46*k,'#d9d29a',9);
  else if(pct(u)<1||isSel||paused)hpBar(u,x,y-42*k,k);
  if(u.bounty&&u.team==='e')label(`懸賞 ${u.bounty} 文`,x,y-48*k,'#f0c45a',10);
  if(u.state==='救人'&&u.rescueT>0){ctx.strokeStyle='#a9e08a';ctx.lineWidth=2*k;ctx.beginPath();ctx.arc(x,y-50*k,5*k,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,u.rescueT*(1+u.sk.aid.lv*.03)/2.5));ctx.stroke()}
  if(u.state==='包紮緊'||u.state.startsWith('醫')){ctx.fillStyle='#a9e08a';ctx.font=`800 ${11*k}px sans-serif`;ctx.textAlign='center';ctx.fillText('+',x+10*k,y-34*k-((simT*20)%8)*k)}
  if(u.state==='採礦'){ctx.strokeStyle='#d8cfbd';ctx.lineWidth=1.6*k;const a=Math.sin(simT*8)*.8;ctx.beginPath();ctx.moveTo(x+5*k*u.face,y-18*k);ctx.lineTo(x+(5+Math.cos(a)*10)*k*u.face,y-(18+Math.sin(a)*10)*k);ctx.stroke()}
  if(u.state==='逃跑')label('逃',x,y-46*k,'#e5813c',10);
}
function drawPaths(){
  ctx.save();ctx.setLineDash([6,5]);ctx.lineCap='round';
  for(const u of allies()){if(u.down||!u.cmd.length)continue;
    const strong=paused||sel.has(u);ctx.globalAlpha=strong?1:.35;
    let prev=scr(u.x,u.y);
    u.cmd.forEach((c,i)=>{const tgt=c.t==='move'?c:c.t==='bandage'?c.pat:c.t==='sleep'?c.bed:c.t==='mine'?c.node:c.t==='talk'?c.npc:(c.t==='attack'||c.t==='follow')?c.u:c.body;if(c.t!=='move'&&tgt.team!=='a'&&!fogVisible(tgt))return;const p=scr(tgt.x,tgt.y);
      ctx.strokeStyle=c.t==='attack'?'#d65b41':c.t==='move'?'#eaa93a':'#f0c45a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(p.x,p.y);ctx.stroke();
      if(c.t==='move'){ctx.setLineDash([]);ctx.fillStyle='rgba(234,169,58,.9)';ell(p.x,p.y,7*cam.z,3.5*cam.z);ctx.fill();
        if(paused&&u.cmd.length>1){ctx.fillStyle='#24180a';ctx.font=`700 ${9*cam.z}px "Chakra Petch",sans-serif`;ctx.textAlign='center';ctx.fillText(i+1,p.x,p.y+3*cam.z)}
        ctx.setLineDash([6,5])}
      prev=p});}
  ctx.restore();
}
function drawLandmarks(){
  for(const p of knownLandmarks()){
    if(p.gate||(p.ore&&fogVisible(p)))continue; // The road sign and visible ore already have labels.
    const s=scr(p.x,p.y,p.h),z=cam.z,seen=fogVisible(p),col=seen?'#e5d5a7':'#aa9c79';
    ctx.strokeStyle=col;ctx.lineWidth=1.2*z;ctx.beginPath();ctx.moveTo(s.x,s.y-3*z);ctx.lineTo(s.x+4*z,s.y);ctx.lineTo(s.x,s.y+3*z);ctx.lineTo(s.x-4*z,s.y);ctx.closePath();ctx.stroke();
    label(`${p.name}${seen?'':' · 記錄'}`,s.x,s.y-10*z,col,9);
  }
}
function render(){
  updateFog();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle='#1d1610';ctx.fillRect(0,0,W,H);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(ground,(-gw/2-cam.x)*cam.z+W/2,(-cam.y)*cam.z+H/2,gw*cam.z,gh*cam.z);
  drawFog();
  if(activeArea==='temple'){const dl=scr(DEN.x,DEN.y,46);label('野犬出沒',dl.x,dl.y,'#f2e7d4')}
  const tl=activeArea==='village'?scr(TOWN.x-1.6,TOWN.y-1.6,78):scr(13,13,60);if(!hasFog())label(AREAS[activeArea].name,tl.x,tl.y,'#f2e7d4',12);
  const gate=AREAS[activeArea].gate,gs=scr(gate.x,gate.y);
  if(fogKnown(gate)){ctx.save();ctx.globalAlpha=fogVisible(gate)?1:.4;
  ctx.strokeStyle='#e0b464';ctx.lineWidth=2*cam.z;ell(gs.x,gs.y,18*cam.z,9*cam.z);ctx.stroke();
  inkRect(gs.x-1.5*cam.z,gs.y-27*cam.z,3*cam.z,25*cam.z,'#81603f');inkRect(gs.x-12*cam.z,gs.y-27*cam.z,24*cam.z,9*cam.z,'#7c6748');label(activeArea==='village'?'往荒寺':activeArea==='forge'?'返荒寺':'村落／鍛冶場',gs.x,gs.y-33*cam.z,'#f4d28d',9);
  ctx.restore();}
  const now=performance.now();
  fx.pings=fx.pings.filter(p=>now-p.t<600);
  for(const p of fx.pings){const k=(now-p.t)/600,s=scr(p.x,p.y);ctx.strokeStyle=p.col;ctx.globalAlpha=1-k;ctx.lineWidth=2;ell(s.x,s.y,(6+k*14)*cam.z,(3+k*7)*cam.z);ctx.stroke();ctx.globalAlpha=1}
  drawPaths();
  const list=[...piles.filter(fogVisible).map(p=>({d:p.x+p.y-.25,f:()=>drawPile(p)})),...props.filter(p=>fogKnown(p)||fogVisible(p)).map(p=>({d:p.x+p.y,f:()=>{ctx.save();ctx.globalAlpha=fogVisible(p)?1:.35;drawProp(p);ctx.restore()}})),...units.filter(unitVisible).map(u=>({d:u.x+u.y+(u.carriedBy?.02:u.down?-.3:0),f:()=>drawUnit(u)}))];
  list.sort((a,b)=>a.d-b.d).forEach(o=>o.f());
  drawLandmarks();
  for(const s of fx.shots){const a=scr(s.a.x,s.a.y,18),b=scr(s.b.x,s.b.y,18),k=s.t/.18;
    if(!fogVisible(s.a)||!fogVisible(s.b))continue;
    ctx.strokeStyle='#f6e2b0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x+(b.x-a.x)*k*.6,a.y+(b.y-a.y)*k*.6);ctx.lineTo(a.x+(b.x-a.x)*Math.min(1,k+.4),a.y+(b.y-a.y)*Math.min(1,k+.4));ctx.stroke()}
  fx.drops=fx.drops.filter(d=>(d.t+=1/60)<.6);for(const d of fx.drops){if(!fogVisible(d))continue;const s=scr(d.x,d.y,22-d.t*30);ctx.fillStyle=`rgba(190,30,20,${1-d.t/.6})`;ell(s.x+3*cam.z,s.y,1.6*cam.z,2.4*cam.z);ctx.fill()}
  ctx.textAlign='center';
  for(const f of fx.floats){const life=f.big?1.8:1.1;const s=scr(f.x,f.y,44+f.t*(f.big?16:24)+(f.big?14:0));ctx.globalAlpha=Math.min(1,(life-f.t)*2);
    if(!fogVisible(f))continue;
    ctx.font=`${f.big?800:700} ${(f.big?13:11.5)*Math.max(.85,cam.z)}px "Chakra Petch","Noto Sans HK",sans-serif`;
    ctx.lineWidth=3;ctx.strokeStyle='rgba(20,12,4,.85)';ctx.strokeText(f.txt,s.x,s.y);ctx.fillStyle=f.col;ctx.fillText(f.txt,s.x,s.y)}
  ctx.globalAlpha=1;
  if(box){const x=Math.min(box.x0,box.x1),y=Math.min(box.y0,box.y1),w=Math.abs(box.x1-box.x0),h=Math.abs(box.y1-box.y0);
    ctx.fillStyle='rgba(234,169,58,.12)';ctx.fillRect(x,y,w,h);ctx.setLineDash([5,4]);ctx.strokeStyle='#eaa93a';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);ctx.setLineDash([])}
  if(gest&&gest.mode==='pending'){const e=(now-gest.t)/LONG;if(e>.2){ctx.strokeStyle='rgba(234,169,58,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(gest.sx,gest.sy,30,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,e));ctx.stroke()}}
  const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(23,18,13,0)');vg.addColorStop(1,'rgba(23,18,13,.6)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  if(paused){ctx.fillStyle='rgba(50,70,100,.16)';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(234,169,58,.45)';ctx.lineWidth=4;ctx.strokeRect(2,2,W-4,H-4)}
}

/* ---------- camera ---------- */
function centerOn(x,y){cam.x=isoX(x,y);cam.y=isoY(x,y)}
centerOn(7.5,8);cam.z=Math.min(1.3,Math.max(.8,Math.min(W,H)/520));
function zoomAt(mx,my,nz){nz=clamp(nz,.45,2.4);const ix=(mx-W/2)/cam.z+cam.x,iy=(my-H/2)/cam.z+cam.y;cam.z=nz;cam.x=ix-(mx-W/2)/nz;cam.y=iy-(my-H/2)/nz}

