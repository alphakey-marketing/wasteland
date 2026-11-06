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
  const hs=p.s/2,h=p.h;
  const N=[p.x-hs,p.y-hs],E=[p.x+hs,p.y-hs],S=[p.x+hs,p.y+hs],Wc=[p.x-hs,p.y+hs];
  const P=(q,hh)=>scr(q[0],q[1],hh);
  const poly=(pts,fill)=>{ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fillStyle=fill;inkFill()};
  const sc=scr(p.x,p.y);ctx.fillStyle='rgba(40,24,10,.28)';ell(sc.x+6*cam.z,sc.y+3*cam.z,p.s*40*cam.z,p.s*18*cam.z);ctx.fill();
  poly([P(Wc,0),P(S,0),P(S,h),P(Wc,h)],rgb(p.c,.82));
  poly([P(S,0),P(E,0),P(E,h),P(S,h)],rgb(p.c,.62));
  poly([P(N,h),P(E,h),P(S,h),P(Wc,h)],rgb(p.c,1.12));
  if(p.crate){const a=P(Wc,h*.5),b=P(S,h*.5);ctx.strokeStyle='rgba(40,25,10,.6)';ctx.lineWidth=1.2*cam.z;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
  if(p.house){const a=P(Wc,h*.35),b=P(S,h*.35);const m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};ctx.fillStyle='rgba(40,25,12,.7)';ctx.fillRect(m.x-4*cam.z,m.y-2*cam.z,8*cam.z,11*cam.z);
    poly([P(N,h+2),P(E,h+2),P(S,h+2),P(Wc,h+2)],'#a75b3e');
    // Corrugated roof seams, projected onto the existing roof plane.
    ctx.strokeStyle='#623b2b';ctx.lineWidth=.85*cam.z;
    for(let n=1;n<6;n++){const t=n/6,a=P([N[0]+p.s*t,N[1]],h+2),b=P([Wc[0]+p.s*t,Wc[1]],h+2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
  if(p.bed){const a=P([p.x-hs*.6,p.y-hs*.6],h+1);ctx.fillStyle='#e8dcc4';ell(a.x,a.y,6*cam.z,3*cam.z);ctx.fill()}
  if(p.isOre){const t=P([p.x,p.y],h);ctx.fillStyle=p.ore==='copper'?'#e39a5c':'#c9d4dc';
    [[-6,-1],[4,2],[1,-4],[7,-2]].forEach(([dx,dy])=>{ell(t.x+dx*cam.z,t.y+dy*cam.z,1.8*cam.z,1.2*cam.z);ctx.fill()});
    label(ITEMS[p.ore].name,t.x,t.y-8*cam.z,'#f2e7d4',10)}
}
function drawPile(p){const s=scr(p.x,p.y),z=cam.z;const fade=simT-p.t>240?.5+.5*Math.sin(simT*6):1;ctx.globalAlpha=fade;
  ctx.fillStyle='rgba(35,20,8,.35)';ell(s.x,s.y+1*z,9*z,3.5*z);ctx.fill();
  ctx.fillStyle='#9b7a4f';ell(s.x,s.y-4*z,7.5*z,6*z);ctx.fill();ctx.fillStyle='#7d5f3b';ell(s.x+2*z,s.y-3*z,4.5*z,4.5*z);ctx.fill();
  ctx.fillStyle='#6a4f30';ctx.fillRect(s.x-2*z,s.y-12*z,4*z,3*z);ctx.globalAlpha=1;
  if(p.pack.length>1)label(p.pack.length+'',s.x+9*z,s.y-10*z,'#f0c45a',9)}
function hpBar(u,x,y,k){const w=(u.kind==='dog'?18:26)*k,bx=x-w/2,p=pct(u);
  ctx.fillStyle='rgba(20,14,8,.75)';ctx.fillRect(bx-1,y-1,w+2,4*k+2);
  ctx.fillStyle=u.team==='g'?'#7ea4dc':u.team==='w'?'#c98a4a':u.team==='e'?'#d65b41':p<.3?'#e5813c':'#8fc56e';ctx.fillRect(bx,y,w*p,4*k)}
function drawDog(u,s,z){
  const k=z,f=u.face;
  if(u.down){ctx.fillStyle=u.dead?'#5d5045':u.color;ell(s.x,s.y-3*k,9*k,3.5*k);ctx.fill();ctx.fillStyle='#6b4f35';ell(s.x+9*k*f,s.y-3*k,3.5*k,3*k);ctx.fill();return}
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
  const y=s.y-lift*z;
  ctx.fillStyle=u.dead?'#5d5045':u.color;ell(s.x-2*z,y-3*z,10*z,4*z);inkFill();
  ctx.fillStyle=u.dead?'#8a7a68':'#d6ad84';ell(s.x+10*z,y-4*z,4.5*z,4*z);inkFill();
}
function drawUnit(u){
  const z=cam.z,isSel=sel.has(u);
  if(u.carriedBy){const s=scr(u.x,u.y);if(u.kind==='dog')drawDog(u,{x:s.x,y:s.y-20*z},z);else drawBodyLying(u,s,z,20);return}
  const s=scr(u.x,u.y);
  ctx.fillStyle='rgba(35,20,8,.38)';ell(s.x,s.y,11*z,5*z);ctx.fill();
  if(isSel){const pulse=1+Math.sin(performance.now()/220)*.06;ctx.strokeStyle='#eaa93a';ctx.lineWidth=2*z;ell(s.x,s.y,15*z*pulse,7.5*z*pulse);ctx.stroke()}
  if((u.team==='e'||u.team==='w')&&u.aggro&&!u.down){ctx.strokeStyle='rgba(214,91,65,.7)';ctx.lineWidth=1.5*z;ell(s.x,s.y,13*z,6.5*z);ctx.stroke()}
  if(u.kind==='dog'){drawDog(u,s,z);return}
  if(u.state==='瞓緊'){drawBodyLying(u,s,z,6);label('Zz',s.x+10*z,s.y-20*z-((simT*8)%6)*z,'#cfd8de',10);return}
  if(u.dead){ctx.globalAlpha=.8;drawBodyLying(u,s,z,0);ctx.fillStyle='rgba(120,20,10,.45)';ell(s.x+2*z,s.y,14*z,5*z);ctx.fill();ctx.globalAlpha=1;
    if(u.team==='a')label('亡',s.x,s.y-14*z,'#ff7a5c',9);return}
  if(u.down){drawBodyLying(u,s,z,0);
    if(u.team==='a'){ctx.strokeStyle='#f2c14e';ctx.lineWidth=2*z;ctx.strokeStyle=u.bleed>0?'#d8553d':'#f2c14e';ctx.beginPath();ctx.arc(s.x,s.y-18*z,6*z,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.02,recov(u)));ctx.stroke();label(u.bleed>0?'血':'倒',s.x,s.y-15*z,u.bleed>0?'#ff7a5c':'#f2c14e',9)}
    if(u.bounty)label(`懸賞 $${u.bounty}`,s.x,s.y-22*z,'#f0c45a',10);
    if(u.team==='e'&&(u.pack.length||u.eq.weapon||u.eq.armor)){ctx.fillStyle='#f0c45a';ell(s.x-12*z,s.y-8*z,2.5*z,2.5*z);ctx.fill()}
    return}
  const crawl=ratio(u,'legs')<=0;
  const bob=u.moving?Math.abs(Math.sin(simT*11+u.id*20))*-2:0;
  const k=z,x=s.x+u.lunge*5*u.face*k,y=s.y+bob*k+(crawl?8*k:0);
  if(u.bleed>.15&&Math.random()<u.bleed*.08)fx.drops.push({x:u.x,y:u.y,t:0});
  if(!crawl){const legColor=u.p.legs.pros?'#8d9aa3':'#514332';inkRect(x-4*k,y-9*k,3*k,9*k,legColor);inkRect(x+1*k,y-9*k,3*k,9*k,legColor)}
  ctx.save();rr(x-6.5*k,y-23*k,13*k,15*k,2*k);ctx.fillStyle=u.color;inkFill();ctx.clip();
  ctx.fillStyle='rgba(42,28,19,.32)';ctx.fillRect(x-6.5*k,y-23*k,5*k,15*k);
  const ar=u.eq.armor;if(ar==='leather'||ar==='plate'){ctx.fillStyle=ar==='plate'?'rgba(190,200,210,.7)':'rgba(110,70,40,.65)';ctx.fillRect(x-6.5*k,y-23*k,13*k,7*k)}
  ctx.restore();
  inkRect(x-6*k,y-11*k,12*k,2.2*k,'#66503a');
  inkRect(x-1.5*k,y-11*k,3*k,2.2*k,'#d4ac61');
  if(u.p.larm.pros||u.p.rarm.pros){ctx.fillStyle='#a9b7c0';ctx.fillRect(x+(u.p.rarm.pros?-6.5:3)*k*u.face,y-22*k,3.5*k,12*k)}
  if(ratio(u,'larm')<=0||ratio(u,'rarm')<=0){ctx.fillStyle='#c9442e';ctx.fillRect(x-6.5*k,y-18*k,13*k,2.2*k)}
  ctx.fillStyle='#d6ad84';ell(x,y-28*k,5.6*k,5.6*k);inkFill();
  ctx.fillStyle='#a47652';ctx.beginPath();ctx.arc(x,y-28*k,5.1*k,Math.PI/2,Math.PI*1.5);ctx.fill();
  ctx.fillStyle=u.team==='e'?'#7e2416':u.color;ctx.fillRect(x-5.6*k,y-31.5*k,11.2*k,2.6*k);
  if(u.team==='e'){ctx.fillStyle='#7e2416';ctx.fillRect(x-5.6*k,y-28*k,11.2*k,2*k)}
  if(u.team==='g'){ctx.fillStyle='#9aa6b0';ctx.beginPath();ctx.arc(x,y-29*k,6.2*k,Math.PI,0);ctx.fill()}
  if(u.team==='n'){ctx.fillStyle='#7a5a2a';ctx.fillRect(x-8*k,y-33*k,16*k,2.4*k);ctx.fillRect(x-4.5*k,y-37*k,9*k,4.5*k)}
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
  if(u.team==='n'||u.team==='g')label(u===TRADER?'商人 · 點我交易':u===INNKEEPER?'旅館 · 酒吧':'守衛',x,y-46*k,u.team==='n'?'#f0c45a':'#bcd0ec',10);
  else if(u.kind==='caravan')label('遊商 · 點我交易',x,y-46*k,'#f0c45a',10);
  else if(u.team==='s'&&!scavAngry.has(u.gid))label('拾荒者',x,y-46*k,'#d9d29a',9);
  else if(pct(u)<1||isSel||paused)hpBar(u,x,y-42*k,k);
  if(u.bounty&&u.team==='e')label(`懸賞 $${u.bounty}`,x,y-48*k,'#f0c45a',10);
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
    u.cmd.forEach((c,i)=>{const tgt=c.t==='move'?c:c.t==='bandage'?c.pat:c.t==='sleep'?c.bed:c.t==='mine'?c.node:c.t==='talk'?c.npc:(c.t==='attack'||c.t==='follow')?c.u:c.body;const p=scr(tgt.x,tgt.y);
      ctx.strokeStyle=c.t==='attack'?'#d65b41':c.t==='move'?'#eaa93a':'#f0c45a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(p.x,p.y);ctx.stroke();
      if(c.t==='move'){ctx.setLineDash([]);ctx.fillStyle='rgba(234,169,58,.9)';ell(p.x,p.y,7*cam.z,3.5*cam.z);ctx.fill();
        if(paused&&u.cmd.length>1){ctx.fillStyle='#24180a';ctx.font=`700 ${9*cam.z}px "Chakra Petch",sans-serif`;ctx.textAlign='center';ctx.fillText(i+1,p.x,p.y+3*cam.z)}
        ctx.setLineDash([6,5])}
      prev=p});}
  ctx.restore();
}
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle='#1d1610';ctx.fillRect(0,0,W,H);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(ground,(-gw/2-cam.x)*cam.z+W/2,(-cam.y)*cam.z+H/2,gw*cam.z,gh*cam.z);
  const dl=scr(DEN.x,DEN.y,46);label('野狗竇 · 練功場',dl.x,dl.y,'#f2e7d4');
  const tl=scr(TOWN.x-1.6,TOWN.y-1.6,64);label('綠洲鎮',tl.x,tl.y,'#f2e7d4',12);
  const now=performance.now();
  fx.pings=fx.pings.filter(p=>now-p.t<600);
  for(const p of fx.pings){const k=(now-p.t)/600,s=scr(p.x,p.y);ctx.strokeStyle=p.col;ctx.globalAlpha=1-k;ctx.lineWidth=2;ell(s.x,s.y,(6+k*14)*cam.z,(3+k*7)*cam.z);ctx.stroke();ctx.globalAlpha=1}
  drawPaths();
  const list=[...piles.map(p=>({d:p.x+p.y-.25,f:()=>drawPile(p)})),...props.map(p=>({d:p.x+p.y,f:()=>drawProp(p)})),...units.map(u=>({d:u.x+u.y+(u.carriedBy?.02:u.down?-.3:0),f:()=>drawUnit(u)}))];
  list.sort((a,b)=>a.d-b.d).forEach(o=>o.f());
  for(const s of fx.shots){const a=scr(s.a.x,s.a.y,18),b=scr(s.b.x,s.b.y,18),k=s.t/.18;
    ctx.strokeStyle='#f6e2b0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x+(b.x-a.x)*k*.6,a.y+(b.y-a.y)*k*.6);ctx.lineTo(a.x+(b.x-a.x)*Math.min(1,k+.4),a.y+(b.y-a.y)*Math.min(1,k+.4));ctx.stroke()}
  fx.drops=fx.drops.filter(d=>(d.t+=1/60)<.6);for(const d of fx.drops){const s=scr(d.x,d.y,22-d.t*30);ctx.fillStyle=`rgba(190,30,20,${1-d.t/.6})`;ell(s.x+3*cam.z,s.y,1.6*cam.z,2.4*cam.z);ctx.fill()}
  ctx.textAlign='center';
  for(const f of fx.floats){const life=f.big?1.8:1.1;const s=scr(f.x,f.y,44+f.t*(f.big?16:24)+(f.big?14:0));ctx.globalAlpha=Math.min(1,(life-f.t)*2);
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

