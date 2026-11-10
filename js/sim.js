'use strict';
/* 部位、技能、角色、背包、戰鬥、AI、傷勢、經濟、勢力、主模擬 */
/* ---------- body parts & skills ---------- */
const PARTS=[['head','頭',.45,12],['torso','身',1,35],['larm','左手',.5,15],['rarm','右手',.5,15],['legs','腳',.7,23]];
const HIT_TOTAL=PARTS.reduce((s,p)=>s+p[3],0);
const SKILLS=[['tough','耐打','被打中就會升'],['atk','攻擊','出手就升，打中升得快啲'],['dod','閃避','俾人攻擊就升，閃到升得快啲'],['aid','急救','包紮自己或者醫隊友就升'],['str','力量','揹重嘢行路、揹人、採礦就會升']];
SKILLS.push(['smith','鍛冶','喺工坊做嘢就升；越高越易出良品、名品，做得越快']);
const need=lv=>5+lv*1.5;
function effText(k,lv){
  if(k==='tough')return `受到傷害 −${Math.round((1-1/(1+lv*.025))*100)}%`;
  if(k==='atk')return `傷害 +${lv*2}% · 命中修正 +${(lv*.8).toFixed(1)}%`;
  if(k==='dod')return `對方命中 −${(lv*.8).toFixed(1)}%`;
  if(k==='str')return `負重上限 ${20+lv}kg · 重武器傷害 +${(lv*1.5).toFixed(1)}% · 採礦快 ${lv*3}%`;
  return `每秒醫 ${(2.5+lv*.35).toFixed(1)} 點 · 止血同救人更快`;
}
function mkParts(base){const p={};PARTS.forEach(([k,,f])=>{const m=Math.round(base*f);p[k]={hp:m,max:m,base:m,lost:false,pros:null}});return p}
function mkSkills(o){const s={};SKILLS.forEach(([k])=>s[k]={lv:(o&&o[k])||1,xp:0});return s}
const pct=u=>{let a=0,b=0;for(const k in u.p){const p=u.p[k];a+=p.lost?0:Math.max(0,p.hp);b+=p.max}return a/b};
const ratio=(u,k)=>{const p=u.p[k];return p.lost?0:Math.max(0,p.hp)/p.max};

/* ---------- units ---------- */
const units=[];
function mk(o){const u=Object.assign({cmd:[],cd:0,state:'待命',down:false,dead:false,bleed:0,downT:0,lunge:0,rescueT:0,aggro:false,face:1,id:Math.random(),spd:2.3,flash:0,
  pack:[],eq:{weapon:null,armor:null},bounty:0,carry:null,carriedBy:null,mineT:0,forceT:0,food:100,kitUse:0,starvation:null},o);
  u.p=mkParts(o.base);u.sk=mkSkills(o.lv);return u}
const squadDef=[
  {name:'阿岩',role:'坦克',color:'#5fb3a8',base:70,pack:[{id:'medkit',n:1},{id:'ration',n:2}],eq:{weapon:'club',armor:'leather'},lv:{tough:6,atk:2,dod:1,aid:1,str:4},rules:{flee:false,rescue:false,fight:true}},
  {name:'小白',role:'醫療',color:'#ece2cf',base:44,pack:[{id:'medkit',n:4},{id:'ration',n:2}],eq:{weapon:'knife',armor:'cloth'},lv:{tough:1,atk:1,dod:3,aid:6,str:1},rules:{flee:true,rescue:true,fight:false}},
  {name:'鐵頭',role:'戰士',color:'#7ea4dc',base:56,pack:[{id:'medkit',n:1},{id:'ration',n:2}],eq:{weapon:'machete',armor:'cloth'},lv:{tough:2,atk:5,dod:2,aid:1,str:3},rules:{flee:true,rescue:false,fight:true}},
  {name:'阿影',role:'弓手',color:'#c995d4',base:46,pack:[{id:'medkit',n:1},{id:'ration',n:2}],eq:{weapon:'bow',armor:'cloth'},lv:{tough:1,atk:4,dod:4,aid:1,str:1},rules:{flee:true,rescue:false,fight:true}},
];
squadDef.forEach((d,i)=>units.push(mk(Object.assign({team:'a',x:7.2+(i%2)*.9,y:8.4+Math.floor(i/2)*.9},d))));
const TRADER=mk({team:'n',role:'trader',name:'商人',color:'#d9b24c',base:60,x:4.9,y:4.4});
const GUARD=mk({team:'g',name:'足輕',color:'#6f8fc4',base:110,eq:{weapon:'axe',armor:'plate'},lv:{tough:30,atk:30,dod:24,str:30},aggroR:6,leash:7,x:6.6,y:5.3,home:{x:6.2,y:5}});
const INNKEEPER=mk({team:'n',role:'inn',name:'宿屋老闆',color:'#c98a6a',base:60,x:3.6,y:6.4});
units.push(TRADER,GUARD,INNKEEPER);
const allies=()=>units.filter(u=>u.team==='a');
const bandits=()=>units.filter(u=>u.team==='e');
let caravanAngry=false;const scavAngry=new Set();
function hostile(a,b){
  const outpost=outpostHostile(a,b);if(outpost!==null)return outpost;
  if((a.kind==='border_refugee'&&a.team==='c')||(b.kind==='border_refugee'&&b.team==='c'))return ['e','w'].includes((a.kind==='border_refugee'&&a.team==='c'?b:a).team);
  if(a.team===b.team||a.team==='n'||b.team==='n'||a.team==='c'||b.team==='c')return false;
  const pair=(x,y)=>(a.team===x&&b.team===y)||(a.team===y&&b.team===x);
  if(pair('g','a'))return repTown<=-30;if(pair('v','a'))return caravanAngry;if(pair('s','a'))return scavAngry.has((a.team==='s'?a:b).gid);
  if(pair('g','v')||pair('g','s')||pair('v','s'))return false;return true}
function changeRep(d,why){const before=repLabel(repTown);repTown=clamp(Math.round(repTown+d),-100,100);const after=repLabel(repTown);
  toast(after!==before?`青葉村而家對你${after}（${why}）`:`青葉村關係 ${d>0?'+':''}${Math.round(d)}（${why}）`);if(after==='敵對'){GUARD.aggro=true}}
const hostiles=u=>units.filter(o=>!o.down&&hostile(u,o)&&(u.team!=='a'||fogVisible(o)));
const weapon=u=>u.eq.weapon?ITEMS[u.eq.weapon]:(u.natural||FIST);
const range=u=>weapon(u).range||.95;

function spawnDog(){const a=Math.random()*Math.PI*2;
  units.push(mk({team:'w',kind:'dog',name:'野犬',color:'#8a6a48',base:22,natural:BITE,spd:2.7,aggroR:4,leash:8,pack:[{id:'hide',n:1},{id:'meat',n:1}],
    lv:{tough:1,atk:2,dod:5},x:DEN.x+Math.cos(a)*1.4,y:DEN.y+Math.sin(a)*1.4,home:{x:DEN.x,y:DEN.y}}))}
for(let i=0;i<3;i++)spawnDog();
let dogTimer=0,guardTimer=0;

let wave=0,alerted=false,cleared=false;
function spawnWave(){
  for(let i=units.length-1;i>=0;i--)if(units[i].team==='e'&&units[i].down&&!units[i].carriedBy)units.splice(i,1);
  const spots=[[14,12],[15,14],[13,15],[16,13]];const [cx,cy]=spots[wave%spots.length];wave++;
  const n=3+Math.min(3,wave);
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,boss=i===0,b=wave*2+(boss?4:0);
    const r=Math.random();
    units.push(mk({team:'e',name:boss?'野武士頭目':'野武士',color:boss?'#9c3a28':'#b9563c',base:boss?52:40,aggroR:6,leash:17,
      eq:{weapon:boss?'machete':['knife','club','machete'][ri(0,2)],armor:boss?'leather':r<.5?'cloth':r<.75?'leather':null},
      pack:[{id:'coin',n:ri(5,25)+(boss?40:0)},...(boss?[{id:'steel',n:1}]:[])],bounty:boss?250:Math.random()<.3?ri(6,12)*10:0,
      lv:{tough:8+b,atk:9+b,dod:7+b},x:cx+Math.cos(a)*1.3,y:cy+Math.sin(a)*1.3,home:{x:cx,y:cy}}));}
  alerted=false;cleared=false;
}
spawnWave();

const sel=new Set(allies());
let groupSync=true;let paused=false,modal=false,speed=1,autoPause=true,selectMode=false,simT=0;
const fx={floats:[],shots:[],pings:[],drops:[]};
let piles=[];
function dropToGround(u,s){let p=piles.find(q=>dist(q,u)<.9);
  if(!p){p={pile:true,name:'地上布袋',x:clamp(u.x+.35,.5,MAP-.5),y:clamp(u.y+.25,.5,MAP-.5),pack:[],eq:{weapon:null,armor:null},t:simT,id:Math.random()};piles.push(p)}
  const it=ITEMS[s.id];const ex=it.stack&&p.pack.find(x=>x.id===s.id);if(ex)ex.n+=s.n;else p.pack.push({id:s.id,n:s.n});p.t=simT}
function float(u,txt,col,big){fx.floats.push({x:u.x,y:u.y,txt,col,t:0,big})}

/* ---------- inventory ---------- */
function addItem(u,id,n=1){if(id==='coin'){money+=n;return}const it=ITEMS[id];
  if(it.stack){const s=u.pack.find(x=>x.id===id);if(s){s.n+=n;return}u.pack.push({id,n})}else for(let i=0;i<n;i++)u.pack.push({id,n:1})}
function takeOne(u,idx){const s=u.pack[idx];if(!s)return null;if(s.n>1){s.n--;return s.id}u.pack.splice(idx,1);return s.id}
function countItem(u,id){return u.pack.filter(x=>x.id===id).reduce((a,x)=>a+x.n,0)}
function useItem(u,id){const i=u.pack.findIndex(x=>x.id===id);if(i<0)return false;takeOne(u,i);return true}
function load(u){let w=0;u.pack.forEach(it=>w+=ITEMS[it.id].w*it.n);for(const k in u.eq)if(u.eq[k])w+=ITEMS[u.eq[k]].w;if(u.carry)w+=30;return w}
const cap=u=>20+u.sk.str.lv;
function encMul(u){if(u.team!=='a')return 1;const w=load(u),c=cap(u);return w<=c?1:Math.max(.25,1-(w-c)/(c*2))}

/* ---------- skills ---------- */
function train(u,k,amt){
  if(u.team!=='a')return;const s=u.sk[k];if(s.lv>=100)return;
  s.xp+=amt;
  while(s.lv<100&&s.xp>=need(s.lv)){s.xp-=need(s.lv);s.lv++;
    const lbl=SKILLS.find(x=>x[0]===k)[1];float(u,`${lbl} Lv${s.lv}`,'#a9e08a',true);u.flash=2.2;u.flashSkill=k}
}

/* ---------- simulation ---------- */
function nearest(list,u){let best=null,bd=1e9;for(const o of list){const d=dist(u,o);if(d<bd){bd=d;best=o}}return best}
function legMul(u){const r=ratio(u,'legs');if(r<=0)return .25;const m=u.p.legs.pros?PROS[u.p.legs.pros].mul:1;return (.55+.45*r)*m}
function step(u,tx,ty,dt,mul=1){
  const dx=tx-u.x,dy=ty-u.y,d=Math.hypot(dx,dy);if(d<.05)return true;
  let mx=dx/d,my=dy/d;
  // 前面有嘢擋住：沿物件邊行，唔好撞埋去企死
  for(const p of props){if(p.bed)continue;const px=p.x-u.x,py=p.y-u.y,pd=Math.hypot(px,py),r=p.s*.62+.22;
    if(pd>r+.3||pd>d||pd<1e-4||(px*mx+py*my)/pd<.3)continue;
    let tx2=-py/pd,ty2=px/pd;if(tx2*mx+ty2*my<0){tx2=-tx2;ty2=-ty2}mx=tx2;my=ty2;break}
  const s=Math.min(d,u.spd*mul*legMul(u)*encMul(u)*(u.team==='a'&&u.food<30?.9:1)*dt);u.x+=mx*s;u.y+=my*s;
  const sdx=dx-dy;if(Math.abs(sdx)>.01)u.face=sdx>0?1:-1;u.moving=true;
  if(u.team==='a'){const l=load(u),c=cap(u);if(l>c*.5)train(u,'str',dt*.35*l/c)}
  return d<.15;
}
function pickPart(){let r=Math.random()*HIT_TOTAL;for(const p of PARTS){r-=p[3];if(r<=0)return p}return PARTS[1]}
function attack(u,t){
  t.hitBy=u.team;
  const side=outpostSide(t);
  if(u.team==='a'&&side&&!campaign.anger[side]){campaign.anger[side]=true;campaign.rep[side]=Math.max(-100,campaign.rep[side]-40);toast(`${FACTIONS[side].name}據點部隊開始反擊`)}
  if(u.team==='a'&&t.team==='g'&&!side&&repTown>-30){changeRep(-60,'攻擊足輕');repTown=Math.min(repTown,-40)}
  if(u.team==='a'&&t.team==='v'&&!caravanAngry){caravanAngry=true;changeRep(-25,'搶商隊');float(t,'商隊嬲咗','#ff7a5c',true)}
  if(u.team==='a'&&t.team==='s'&&!scavAngry.has(t.gid)){scavAngry.add(t.gid);float(t,'落武者嬲咗','#ff7a5c',true)}
  const wpn=weapon(u);u.cd=wpn.cd;u.lunge=1;const tArm=t.eq.armor?ITEMS[t.eq.armor]:null;
  const hitP=clamp(.6+(u.sk.atk.lv-(t.sk.dod.lv+((tArm&&tArm.dod)||0)))*.008,.12,.95);
  if(Math.random()>hitP){train(u,'atk',.6);train(t,'dod',1.5);float(t,'閃','#cfc4b0');
    if(range(u)>2)fx.shots.push({a:{x:u.x,y:u.y},b:{x:t.x+rand(-.6,.6),y:t.y+rand(-.6,.6)},t:0});return}
  let [pk,pl]=pickPart();if(t.p[pk].lost){pk='torso';pl='身'}
  let arm=ratio(u,'rarm')<=0?.35:.6+.4*ratio(u,'rarm');if(ratio(u,'larm')<=0)arm*=.85;
  if(u.p.rarm.pros&&ratio(u,'rarm')>0)arm*=PROS[u.p.rarm.pros].mul;if(u.p.larm.pros&&ratio(u,'larm')>0)arm*=1+(PROS[u.p.larm.pros].mul-1)*.5;
  const dmg=rand(wpn.dmg[0],wpn.dmg[1])*(1+u.sk.atk.lv*.02)*arm*(wpn.heavy?1+u.sk.str.lv*.015:1)/(1+t.sk.tough.lv*.025)*(tArm?1-tArm.red:1)*(u.team==='a'&&u.food<30?.85:1);
  const part=t.p[pk];const wasUp=part.hp>0;
  const floor=part.pros?0:hardcore?-part.max*1.05:-part.max*.5;part.hp=Math.max(floor,part.hp-dmg);
  if(!part.pros)t.bleed=Math.min(2.5,t.bleed+dmg*.025);
  float(t,`-${Math.round(dmg)} ${pl}`,t.team==='a'?'#ff9b84':'#fff3dc');
  if(range(u)>2)fx.shots.push({a:{x:u.x,y:u.y},b:{x:t.x,y:t.y},t:0});
  train(u,'atk',1.2);train(t,'tough',dmg*.25);train(t,'dod',.6);
  if(t.cmd[0]&&['bandage','feed'].includes(t.cmd[0].t)){t.interruptT=1.2;float(t,t.cmd[0].t==='feed'?'餵食被打斷':'包紮被打斷','#ff9b84')}
  if(t.team!=='a'){t.aggro=true;t.lastHit=u}
  if(wasUp&&part.hp<=0&&(pk==='larm'||pk==='rarm'||pk==='legs'))float(t,part.pros?`${pl}義肢壞咗`:`${pl}殘廢`,'#ff7a5c',true);
  checkWounds(t,pk,pl);
}
function drop(u){const b=u.carry;if(!b)return;b.carriedBy=null;u.carry=null;b.x=u.x+.35;b.y=u.y+.35}
function pickUp(u,b){if(u.carry||b.carriedBy||!b.down)return false;u.carry=b;b.carriedBy=u;toast(`${u.name} 揹起咗 ${b.name}`);return true}
function kill(t){onDowned(t);if(t.carry)drop(t);t.dead=true;t.down=true;t.cmd=[];t.bleed=0;t.rescueT=0;float(t,'陣亡','#ff4a2e',true);sel.delete(t);if(cam.follow===t)cam.follow=null;
  if(t.team==='a')toast(`${t.name} 陣亡咗`)}
function checkWounds(t,pk,pl){
  if(t.dead)return;const part=t.p[pk];
  if(hardcore&&!part.pros&&!part.lost&&(pk==='larm'||pk==='rarm'||pk==='legs')&&part.hp<=-part.max){part.lost=true;part.hp=0;
    float(t,`${pl}斷咗`,'#ff4a2e',true);if(t.team==='a')toast(`${t.name} 嘅${pl}永久斷咗 · 去商人度買義肢`)}
  if(hardcore&&(t.p.head.hp<=-t.p.head.max||t.p.torso.hp<=-t.p.torso.max)){kill(t);return}
  if(!t.down&&(t.p.head.hp<=0||t.p.torso.hp<=0)){if(t.carry)drop(t);t.down=true;t.downT=14;t.cmd=[];t.rescueT=0;float(t,'倒地','#f2c14e',true);onDowned(t)}
}
function engage(u,t,dt){
  const d=dist(u,t);const sdx=(t.x-u.x)-(t.y-u.y);if(Math.abs(sdx)>.01)u.face=sdx>0?1:-1;
  if(d>range(u)*.95)step(u,t.x,t.y,dt);else if(u.cd<=0)attack(u,t);
}
function healRate(u){return 2.5+u.sk.aid.lv*.35}
function useKit(h,amt){h.kitUse+=amt;if(h.kitUse>=20){h.kitUse-=20;useItem(h,'medkit');if(!countItem(h,'medkit')&&h.team==='a')toast(`${h.name} 用晒藥包`)}}
function canTreat(h,pat){return pat.bleed>0||countItem(h,'medkit')>0}
function treat(healer,pat,dt){
  const kit=countItem(healer,'medkit')>0;
  if(pat.bleed>0){const r=(1+healer.sk.aid.lv*.05)*(kit?1:.4);pat.bleed=Math.max(0,pat.bleed-r*dt);train(healer,'aid',1.2*dt);if(kit)useKit(healer,r*dt*2);return true}
  if(!kit)return false;
  let worst=null,wr=2;for(const [k] of PARTS){const q=pat.p[k];if(q.lost||q.pros)continue;const r=q.hp/q.max;if(r<1&&r<wr){wr=r;worst=k}}
  if(!worst)return false;const p=pat.p[worst],amt=Math.min(p.max-p.hp,healRate(healer)*dt);p.hp+=amt;useKit(healer,amt);train(healer,'aid',1.2*dt);return true;
}
function getUp(u,f){if(u.dead||u.carriedBy||hungerBlocksRecovery(u))return;u.down=false;['head','torso'].forEach(k=>{u.p[k].hp=Math.max(u.p[k].hp,u.p[k].max*f)})}
function recov(u){return clamp(Math.min(u.p.head.hp/(u.p.head.max*.1),u.p.torso.hp/(u.p.torso.max*.1)),0,1)}
function hurt(u){return u.bleed>0||PARTS.some(([k])=>{const q=u.p[k];return !q.lost&&!q.pros&&q.hp<q.max})}

function runCmd(u,dt,ne,nd){
  const c=u.cmd[0],forced=u.forceT>0?'強制執行':null;
  switch(c.t){
    case 'move':{u.state=forced||'移動';let mul=1;
      if(c.grp){const sp=m=>m.spd*legMul(m)*encMul(m);const act=c.grp.filter(m=>!m.down&&m.cmd[0]&&m.cmd[0].grp===c.grp);
        if(act.length>1){const slow=Math.min(...act.map(sp));mul=slow/sp(u);if(mul<.98)u.state=(forced||'移動')+' · 等隊友'}}
      if(c.travel){u.state=dist(u,c)<.4?'出口等隊友':'前往出口';if(dist(u,c)>=.4)steer(u,c,dt,[],mul)}
      else if(step(u,c.x,c.y,dt,mul))u.cmd.shift();break}
    case 'follow':{const L=c.u;if(L.dead){u.cmd.shift();break}
      if(u.rules.fight&&ne&&nd<6&&!u.carry){u.state='見敵就打';engage(u,ne,dt);break}
      u.state='跟住'+L.name;if(dist(u,L)>1.3)step(u,L.x,L.y,dt);break}
    case 'feed':runFeed(u,c,dt);break;
    case 'bandage':{const p=c.pat;if(p.dead||(p.carriedBy&&p.carriedBy!==u)){u.cmd.shift();break}
      if(p!==u&&p.carriedBy!==u&&dist(u,p)>.8){u.state='去幫'+p.name+'包紮';step(u,p.x,p.y,dt);break}
      if(!hurt(p)){u.cmd.shift();float(p,'包紮好','#a9e08a');break}
      if(!canTreat(u,p)){u.cmd.shift();float(u,'冇藥包','#ff9b84');toast(`${u.name} 冇藥包，淨係止到血，傷口醫唔到`);break}
      if(u.interruptT>0){u.state='包紮被打斷';break}
      const near=hostiles(u).some(h=>dist(h,u)<3);
      u.state=(p===u?'包紮自己':'幫'+p.name+'包紮')+(p.bleed>0?'（止血）':'')+(near?' · 好危險':'');
      treat(u,p,dt*(near?.5:1));break}
    case 'aid':{const b=c.body;if(b.dead||!b.down||b.carriedBy&&b.carriedBy!==u){u.cmd.shift();break}
      if(dist(u,b)>.9){u.state='去止血';step(u,b.x,b.y,dt);break}
      u.state='幫'+b.name+'止血';{const kit=countItem(u,'medkit')>0,r=(1+u.sk.aid.lv*.05)*(kit?1:.4);b.bleed=Math.max(0,b.bleed-r*dt);if(kit)useKit(u,r*dt*2)}train(u,'aid',1.2*dt);
      if(b.bleed<=0){u.cmd.shift();float(b,'止咗血','#a9e08a')}break}
    case 'attack':if(c.u.dead||(c.u.down&&!c.finish)||(u.team==='a'&&!unitVisible(c.u)))u.cmd.shift();else{u.state=forced||'攻擊目標';engage(u,c.u,dt)}break;
    case 'mine':{
      if(ne&&nd<3&&!u.carry){u.state='自衛';engage(u,ne,dt);break}
      const r=c.node.s*.62+.6;if(dist(u,c.node)>r){u.state='去採礦';step(u,c.node.x,c.node.y,dt);break}
      if(load(u)>cap(u)*1.6){u.cmd.shift();toast(`${u.name} 揹唔郁喇，停咗採礦`);break}
      u.state='採礦';u.mineT+=dt*(1+u.sk.str.lv*.03);train(u,'str',.3*dt);
      if(u.mineT>=4){u.mineT=0;addItem(u,c.node.ore,1);float(u,`+1 ${ITEMS[c.node.ore].name}`,'#e8c79a')}
      break}
    case 'craft':{const p=c.node;
      if(!props.includes(p)||!workReady(u,p)){if(!c.auto&&props.includes(p)&&p.q.length)toast(`${u.name}：${workLock(workRecipe(p.q[0]))||'材料唔夠（欠 '+workMissing(u,workRecipe(p.q[0])).join(' ')+'）'}`);u.cmd.shift();break}
      if(ne&&nd<3&&!u.carry){u.state='自衛';engage(u,ne,dt);break}
      if(dist(u,p)>p.s*.62+.6){u.state='去工坊';step(u,p.x,p.y,dt);break}
      u.state=`做 ${ITEMS[p.q[0]].name}`;if(!workTick(u,p,dt)){u.cmd.shift();break}
      if(!p.q.length||!p.paid&&!workReady(u,p))u.cmd.shift();
      break}
    case 'sow':case 'reap':case 'cook':{const p=c.node,st=fieldStage(p);
      if(c.t==='sow'&&st!==0||c.t==='reap'&&st!==3||!props.includes(p)){u.cmd.shift();break}
      if(ne&&nd<3&&!u.carry){u.state='自衛';engage(u,ne,dt);break}
      if(dist(u,p)>p.s*.62+.6){u.state=c.t==='cook'?'去灶頭':'去田';step(u,p.x,p.y,dt);break}
      u.state={sow:'播種',reap:'收割',cook:'煮飯'}[c.t];c.prog=(c.prog||0)+dt;
      if(c.prog<{sow:2,reap:3,cook:8}[c.t])break;u.cmd.shift();
      if(c.t==='sow'){if(!takeItem(u,'seed',1)){toast('冇稻種；村店有得買');break}p.sown=simT;float(u,'播種','#a9e08a')}
      else if(c.t==='reap'){p.sown=null;addItem(u,'rice',3);addItem(u,'seed',1);float(u,'+3 米 +1 稻種','#e8c79a')}
      else{if(!takeItem(u,'rice',2)){toast('米唔夠（要 2 粒）');break}addItem(u,'ration',1);float(u,'+1 飯糰','#e8c79a')}
      break}
    case 'chop':{const t=c.node;
      if(treeWood(t)===0){u.cmd.shift();break}
      if(ne&&nd<3&&!u.carry){u.state='自衛';engage(u,ne,dt);break}
      if(dist(u,t)>t.s*.62+.6){u.state='去砍樹';step(u,t.x,t.y,dt);break}
      if(load(u)>cap(u)*1.6){u.cmd.shift();toast(`${u.name} 揹唔郁喇，停咗砍樹`);break}
      u.state='砍樹';u.chopT=(u.chopT||0)+dt*(1+u.sk.str.lv*.03);train(u,'str',.25*dt);
      if(u.chopT>=5){u.chopT=0;t.wood=treeWood(t)-1;addItem(u,'wood',1);float(u,'+1 木材','#e8c79a');if(t.wood===0){t.cut=simT;u.cmd.shift()}}
      break}
    case 'build':{const d=BUILDS[c.k];
      if(ne&&nd<3&&!u.carry){u.state='自衛';engage(u,ne,dt);break}
      if(!c.started){
        if(dist(u,c)>1.3){u.state='去起'+d.name;step(u,c.x,c.y,dt);break}
        const why=placeProblem(c.x,c.y);if(why){u.cmd.shift();toast(why);break}
        if(!buildPay(c.k)){u.cmd.shift();toast('材料唔夠，建造取消');break}
        c.started=true;c.prog=0}
      u.state='起緊'+d.name;c.prog+=dt;
      if(c.prog>=d.sec){u.cmd.shift();addBuilt(activeArea,c.k,c.x,c.y);float(u,`起好 ${d.name}`,'#a9e08a')}
      break}
    case 'jail':{const b=c.body,cage=c.cage;
      if(!props.includes(cage)||(cageOcc(cage)&&cage.occ!==b)||b.captive||b.dead||(u.carry&&u.carry!==b)){u.cmd.shift();break}
      if(u.carry!==b){
        if(!b.down||(b.carriedBy&&b.carriedBy!==u)){u.cmd.shift();break}
        if(dist(u,b)>.9){u.state='去揹俘虜';step(u,b.x,b.y,dt);break}
        pickUp(u,b);break}
      if(dist(u,cage)>1.1){u.state='押去籠';step(u,cage.x,cage.y,dt);break}
      drop(u);b.x=cage.x;b.y=cage.y;b.captive=true;b.bleed=0;b.cmd=[];b.aggro=false;b.lastHit=null;b.victim=null;cage.occ=b;u.cmd.shift();toast(`${b.name} 已關入籠`);break}
    case 'talk':if(c.npc.down||c.npc.dead||!units.includes(c.npc)){u.cmd.shift();break}if(dist(u,c.npc)>1.35){u.state='行去'+c.npc.name;step(u,c.npc.x,c.npc.y,dt)}else{u.cmd.shift();arriveTalk(u,c.npc,c.act)}break;
    case 'sleep':{const b=c.bed;
      if(!c.paid){if(dist(u,b)>.7){u.state='去瞓覺';step(u,b.x,b.y,dt);break}
        if(b.own)c.paid=true;else{if(money<10){u.cmd.shift();toast(`唔夠錢租床（每人 10 文）`);break}money-=10;merchantState('inn').cash+=10;c.paid=true;float(u,'-10 文 租床','#f0c45a')}}
      u.x=b.x;u.y=b.y;u.state='瞓緊';u.bleed=Math.max(0,u.bleed-2*dt);
      for(const [k] of PARTS){const q=u.p[k];if(!q.lost&&!q.pros&&q.hp<q.max)q.hp=Math.min(q.max,q.hp+3*dt)}
      if(!hurt(u)){u.cmd.shift();float(u,'瞓醒，精神返晒','#a9e08a')}break}
    case 'loot':if(c.body.carriedBy||(!c.body.pile&&(!c.body.down||!units.includes(c.body)))){u.cmd.shift();toast('目標已起身、離開或被揹起，搜身取消');break}if(dist(u,c.body)>.9){u.state=c.body.pile?'去搜查':'去搜身';step(u,c.body.x,c.body.y,dt)}else{u.cmd.shift();openLoot(u,c.body)}break;
    case 'rescue':{const b=c.body;if(b.dead||!b.down||b.carriedBy||!units.includes(b)){u.cmd.shift();break}
      if(dist(u,b)>.9){u.state='去救人';step(u,b.x,b.y,dt);break}u.cmd.shift();rescueWounded(u,b);break}
    case 'carry':if(c.body.carriedBy||!c.body.down||u.carry){u.cmd.shift();break}if(dist(u,c.body)>.9){u.state='去揹人';step(u,c.body.x,c.body.y,dt)}else{u.cmd.shift();pickUp(u,c.body)}break;
  }
}
// Sample short clear headings; avoid walking into props or map edges.
function steer(u,goal,dt,threats=[],mul=1,obstacles=props){
  const heading=Math.atan2(goal.y-u.y,goal.x-u.x);let best=null,score=-Infinity;
  for(const turn of [0,.45,-.45,.9,-.9,1.5,-1.5,2.2,-2.2,Math.PI]){
    const a=heading+turn,p={x:u.x+Math.cos(a)*.85,y:u.y+Math.sin(a)*.85};
    if(p.x<.6||p.y<.6||p.x>MAP-.6||p.y>MAP-.6)continue;
    if(obstacles.some(o=>!o.bed&&[.25,.5,.85].some(r=>dist({x:u.x+Math.cos(a)*r,y:u.y+Math.sin(a)*r},o)<o.s*.62+.25)))continue;
    const safety=threats.length?Math.min(...threats.map(e=>dist(p,e))):0;
    const s=safety*2.5-dist(p,goal)*.65-Math.abs(turn)*.08;
    if(s>score){score=s;best=p}
  }
  if(best)step(u,best.x,best.y,dt,mul);return !!best;
}
function retreat(u,dt,hs,ne,nd){
  const safe=nd>7;
  if(safe&&(pct(u)>.6||!hurt(u))&&ratio(u,'head')>.6&&ratio(u,'torso')>.6){u.retreating=false;return false}
  u.state=safe?'撤退 · 安全休養':'重傷撤退';
  if(safe){if(hurt(u)&&canTreat(u,u))treat(u,u,dt);return true}
  const friends=allies().filter(a=>a!==u&&!a.down&&pct(a)>.6&&dist(a,ne)>dist(u,ne)+1);
  const goal=nearest(friends,u)||AREAS[activeArea].gate;
  const moved=steer(u,goal,dt,hs);
  // One close defensive swing, never engage/chase during retreat.
  if(ne&&!u.carry&&nd<=Math.min(range(u),1.1)&&u.cd<=0&&(!moved||nd<.85)){u.state='撤退 · 自衛';attack(u,ne)}
  return true;
}
function updAlly(u,dt){
  u.flash=Math.max(0,u.flash-dt);
  u.forceT=Math.max(0,u.forceT-dt);u.interruptT=Math.max(0,(u.interruptT||0)-dt);if(u.cmd.length&&u.forceT>0)u.forceT=3;
  if(u.dead){u.state='陣亡';return}
  if(u.down){u.state=u.carriedBy?'俾人揹緊':u.bleed>0?'倒地流血':'倒地';return}
  const hs=hostiles(u);const ne=nearest(hs,u);const nd=ne?dist(u,ne):99;
  if(u.cmd[0]?.auto&&((ne&&nd<7)||(load(u)>cap(u)*.7&&depositable(u)&&piles.some(p=>p.chest))))u.cmd=[];
  if(u.cmd.length){runCmd(u,dt,ne,nd);if(u.cmd[0]?.auto)u.state='自動 · '+u.state;return}
  if(!u.rules.flee)u.retreating=false;
  if(u.rules.flee&&nd<6&&(pct(u)<.4||ratio(u,'torso')<.4||ratio(u,'head')<.4))u.retreating=true;
  if(u.retreating&&retreat(u,dt,hs,ne,nd))return;
  if(u.rules.rescue&&!u.carry){
    const da=nearest(allies().filter(a=>a.down&&!a.dead&&!a.carriedBy&&a!==u),u);
    if(da&&dist(u,da)<12){u.state='救人';if(dist(u,da)>.7){u.rescueT=0;step(u,da.x,da.y,dt)}else{u.rescueT+=dt;da.bleed=Math.max(0,da.bleed-2*dt);train(u,'aid',1.5*dt);
      if(hungerBlocksRecovery(da)){u.state='救人 · 需要食物';if(feedingSource(u,da))u.cmd=[{t:'feed',pat:da}]}
      else if(u.rescueT>=2.5/(1+u.sk.aid.lv*.03)){getUp(da,.3);da.bleed=0;u.rescueT=0;float(da,'救返起身','#a9e08a')}}return}
    u.rescueT=0;
    if(nd>6&&!u.cmd.length){const pat=nearest(allies().filter(a=>a!==u&&!a.down&&hurt(a)&&canTreat(u,a)&&(a.bleed>0||pct(a)<.85)&&dist(u,a)<10),u);
      if(pat){u.state='醫'+pat.name;if(dist(u,pat)>.8)step(u,pat.x,pat.y,dt);else treat(u,pat,dt);return}}
  }
  if(nd>6&&shareFood(u,dt))return;
  if(u.rules.fight&&ne&&nd<6&&!u.carry){u.state='見敵就打';engage(u,ne,dt);return}
  if(hurt(u)&&nd>6&&!u.carry&&canTreat(u,u)){u.state='包紮緊';treat(u,u,dt);return}
  if(nd>6&&!u.carry&&autoWork(u,dt)){if(u.cmd[0]?.auto)u.state='自動 · '+u.state;else if(u.job==='guard'||u.state==='存貨入箱')u.state='自動 · '+u.state;return}
  u.state=u.carry?'揹緊'+u.carry.name:ratio(u,'legs')<=0?'爬行中':encMul(u)<1?'負重過重':'待命';
}
function updOther(u,dt){
  if((u===TRADER||u===INNKEEPER)&&!u.down){npcLife(u,dt);return}
  if((u.team==='n'&&!outpostSide(u))||u.kind==='border_refugee'||u.down)return;
  const pursued=units.find(a=>a.id===u.pursuitId&&!a.down&&hostile(u,a));
  if(pursued&&dist(u,pursued)<10){u.home={x:pursued.x,y:pursued.y};u.aggro=true}else u.pursuitId=null;
  const leash=u.pursuitId?10:u.leash;
  let t=u.lastHit&&!u.lastHit.down&&dist(u,u.lastHit)<leash?u.lastHit:null;
  if(!t)t=nearest(hostiles(u),u);const d=t?dist(u,t):99;
  if(!u.aggro&&d<u.aggroR)u.aggro=true;
  if(u.aggro&&t&&d<leash&&dist(t,u.home)<leash+3){u.state='戰鬥';engage(u,t,dt);return}
  if(u.victim&&(u.victim.dead||!u.victim.down||u.victim.carriedBy))u.victim=null;
  if(!u.victim&&hardcore&&(u.team==='w'||u.team==='e')){u.rolled=u.rolled||{};
    for(const o of units){if(o.team!=='a'||!o.down||o.dead||o.carriedBy||dist(o,u)>(u.team==='w'?3:4))continue;
      if(u.rolled[o.id]===undefined)u.rolled[o.id]=Math.random()<(u.team==='w'?.6:.35);
      if(u.rolled[o.id]){u.victim=o;toast(u.team==='w'?`野犬咬緊倒地嘅${o.name}！`:`野武士想補刀${o.name}！快啲去救`);break}}}
  if(u.victim){u.state=u.team==='w'?'咬緊':'補刀';engage(u,u.victim,dt);return}
  u.aggro=false;u.lastHit=null;u.state='巡邏';
  if(u.team==='g'&&!outpostSide(u)){for(const [k] of PARTS){const p=u.p[k];if(!p.lost&&p.hp<p.max)p.hp=Math.min(p.max,p.hp+3*dt)}u.bleed=0}
  if(u.kind?.startsWith('patrol_')){if(u.restT>0){u.restT-=dt;u.state='食飯休息';return}const r=patrolRoute(u),w=r[(u.ri||0)%r.length];if(step(u,w.x,w.y,dt,.32)||dist(u,w)<.5){u.ri=(u.ri||0)+1;if(u.ri%4===0)u.restT=10}return}
  if(dist(u,u.home)>2.2)step(u,u.home.x,u.home.y,dt,.55);
  else{if(!u.wp||dist(u,u.wp)<.2)u.wp={x:u.home.x+rand(-1.6,1.6),y:u.home.y+rand(-1.6,1.6)};step(u,u.wp.x,u.wp.y,dt,.22)}
}
function lootable(b){return (b.pile||(b.down&&!b.carriedBy&&(b.dead||b.team!=='a')))&&(b.pack.length||b.eq.weapon||b.eq.armor)}
function updScav(u,dt){
  if(u.down)return;
  let t=u.lastHit&&!u.lastHit.down&&dist(u,u.lastHit)<6?u.lastHit:null;
  if(!t){const h=nearest(hostiles(u),u);if(h&&dist(h,u)<3.5)t=h}
  if(t){u.state='打交';engage(u,t,dt);return}
  if(u.leaving){u.state='離開';if(step(u,u.exit.x,u.exit.y,dt,.7)||dist(u,u.exit)<.6)u.gone=true;return}
  if(!u.goal||u.goal.permanent||!(u.goal.pile?piles.includes(u.goal):units.includes(u.goal))||!lootable(u.goal)){u.goal=null;
    const cands=[...piles,...units.filter(b=>b.team!=='s')].filter(b=>!b.permanent&&lootable(b));u.goal=nearest(cands,u);
    if(!u.goal||u.taken>=2){u.leaving=true;u.exit={x:u.x<MAP/2?.6:MAP-.6,y:u.y};return}}
  const g=u.goal;if(dist(u,g)>.8){u.state='去執嘢';step(u,g.x,g.y,dt,.75);return}
  u.state='執緊嘢';u.lootT=(u.lootT||0)+dt;
  if(u.lootT>2){u.lootT=0;u.taken=(u.taken||0)+1;let n=0;
    if(g.eq.weapon){u.pack.push({id:g.eq.weapon,n:1});g.eq.weapon=null;n++}if(g.eq.armor){u.pack.push({id:g.eq.armor,n:1});g.eq.armor=null;n++}
    if(g.kind==='dog'&&!g.dead&&g.pack.some(x=>x.id==='hide'||x.id==='meat'))kill(g);
    g.pack.forEach(x=>{u.pack.push({id:x.id,n:x.n});n++});g.pack.length=0;
    if(n)float(u,`執走咗 ${n} 樣嘢`,'#d9d29a');u.goal=null}
}
let scavTimer=40,saveTimer=0;
function spawnScavs(){const gid=Math.random(),side=Math.random()<.5,x=side?.8:MAP-.8,y=rand(6,MAP-4);
  for(let i=0;i<2;i++)units.push(mk({team:'s',kind:'scav',gid,name:'落武者',color:'#8d8a5a',base:40,x:x+i*.5,y:y+i*.4,aggroR:3.5,leash:8,home:{x,y},
    eq:{weapon:i?'club':'knife',armor:'cloth'},lv:{tough:5,atk:6,dod:6}}))}
let bgArea=false;
// Every area that holds a living ally keeps running; others stay frozen.
const liveAreas=()=>Object.keys(AREAS).filter(id=>id!==activeArea&&areaStates[id].units.some(u=>u.team==='a'&&!u.dead));
const pinned=u=>u.team==='n'&&u!==TRADER&&u!==INNKEEPER; // wandering shopkeepers can be nudged aside
function simulate(dt){
  simT+=dt;scavTimer+=dt;dogTimer+=dt;saveTimer+=dt;
  const live=liveAreas();
  simArea(dt);
  if(live.length){
    const main=activeArea,saved={};for(const k in fx)saved[k]=fx[k];
    try{captureArea();bgArea=true;
      for(const id of live){swapIn(id);for(const k in fx)if(Array.isArray(fx[k]))fx[k]=[];simArea(dt);captureArea()}}
    finally{bgArea=false;Object.assign(fx,saved);swapIn(main)}
  }
  tickCaravan(dt);tickCampaign(dt);updateTravel();
}
function simArea(dt){
  for(const u of allies()){tickHunger(u,dt);if(u.dead)continue;const sleeping=u.state==='瞓緊';
    if(!u.down&&u.bleed<=0&&u.food>0&&!sleeping&&!hostiles(u).some(h=>dist(h,u)<6))for(const [k] of PARTS){const q=u.p[k];if(!q.lost&&!q.pros&&q.hp<q.max)q.hp=Math.min(q.max,q.hp+.12*dt)}}
  if(activeArea==='temple'&&scavTimer>100){scavTimer=0;if(new Set(units.filter(u=>u.kind==='scav'&&!u.down).map(u=>u.gid)).size<2)spawnScavs()}
  for(let i=units.length-1;i>=0;i--)if(units[i].gone)units.splice(i,1);
  if(!bgArea&&saveTimer>20){saveTimer=0;save(false)}
  for(const u of units){if(u.dead||!(u.bleed>0))continue;
    u.p.torso.hp-=u.bleed*(u.down?1.4:1)*dt;u.bleed=Math.max(0,u.bleed-(u.down?.03:.1)*dt);
    if(!hardcore)u.p.torso.hp=Math.max(-u.p.torso.max*.5,u.p.torso.hp);checkWounds(u,'torso','身')}
  for(const u of units){if(!u.down||u.dead||u.captive||u.bleed>0||u.starvation?.phase==='dying')continue;const r=.6+u.sk.tough.lv*.03;
    ['head','torso'].forEach(k=>{u.p[k].hp=Math.min(u.p[k].max,u.p[k].hp+r*dt)});
    if(tryStarvationRise(u))continue;
    if(recov(u)>=1&&!u.carriedBy&&!hungerBlocksRecovery(u)){getUp(u,0);float(u,u.team==='a'?'自己爬起身':'醒返','#a9e08a');u.victim=null;if(u.team!=='a'){u.aggro=false;u.lastHit=null}}}
  piles=piles.filter(p=>p.permanent||p.pack.some(s=>ITEMS[s.id].type==='quest')||(p.pack.length&&simT-p.t<300));
  if(repTown<0)repTown=Math.min(0,repTown+dt/30);
  for(const u of units){u.moving=false;u.cd=Math.max(0,u.cd-dt);u.lunge=Math.max(0,u.lunge-dt*5);if(u.carriedBy)continue;if(u.team==='a')updAlly(u,dt);else if(u.kind==='caravan')updCaravan(u,dt);else if(u.kind==='scav')updScav(u,dt);else{if(u.kind==='cguard'&&u.leader&&!u.leader.down)u.home={x:u.leader.x,y:u.leader.y};updOther(u,dt)}}
  for(const u of units){if(!u.carriedBy)continue;const c=u.carriedBy;if(c.down||c.carry!==u){u.carriedBy=null;if(c.carry===u)c.carry=null}else{u.x=c.x;u.y=c.y;
}}
  if(activeArea==='temple'&&dogTimer>12){dogTimer=0;
    for(let i=units.length-1;i>=0;i--){const d=units[i];if(d.kind==='dog'&&d.down&&!d.carriedBy&&dist(d,nearest(allies(),d))>3)units.splice(i,1)}
    if(units.filter(u=>u.kind==='dog'&&!u.down).length<3)spawnDog()}
  if(activeArea==='village'&&GUARD.dead){guardTimer+=dt;if(guardTimer>40){guardTimer=0;GUARD.p=mkParts(GUARD.base);GUARD.down=GUARD.dead=false;GUARD.bleed=0;GUARD.x=GUARD.home.x;GUARD.y=GUARD.home.y;float(GUARD,'新足輕上更','#cfd8de',true)}}
  for(let i=0;i<units.length;i++){const a=units[i];if(a.down)continue;
    for(let j=i+1;j<units.length;j++){const b=units[j];if(b.down)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      if(d<.55&&d>1e-4){const p=(.55-d)/2,fa=pinned(a)?0:pinned(b)?2:1,fb=2-fa;a.x-=dx/d*p*fa;a.y-=dy/d*p*fa;b.x+=dx/d*p*fb;b.y+=dy/d*p*fb}}
    for(const p of props){if(p.bed)continue;const r=p.s*.62+.22,dx=a.x-p.x,dy=a.y-p.y,d=Math.hypot(dx,dy);if(d<r&&d>1e-4){a.x=p.x+dx/d*r;a.y=p.y+dy/d*r}}
    a.x=clamp(a.x,.5,MAP-.5);a.y=clamp(a.y,.5,MAP-.5);}
  fx.floats.forEach(f=>f.t+=dt);fx.floats=fx.floats.filter(f=>f.t<(f.big?1.8:1.1));
  fx.shots.forEach(f=>f.t+=dt);fx.shots=fx.shots.filter(f=>f.t<.18);
  updateFog();
  if(autoPause&&!alerted&&bandits().some(e=>!e.down&&fogVisible(e)&&allies().some(a=>!a.down&&dist(a,e)<e.aggroR))){alerted=true;setPaused(true);toast(`${bgArea?'【'+AREAS[activeArea].name+'】':''}${activeArea==='forge'?'發現鍛冶場浪人':'發現野武士'} · 已自動暫停，慢慢落指令`)}
  if(!cleared&&bandits().length&&bandits().every(e=>e.down)&&(!hasFog()||bandits().every(fogVisible))){cleared=true;toast(activeArea==='forge'?'鍛冶場浪人全部倒地 · 記得搜箱，留力帶物資返村':'野武士全部倒地 · 記得執嘢，頭目有懸賞')}
}

