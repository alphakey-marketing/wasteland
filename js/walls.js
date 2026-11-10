'use strict';
/* 圍牆同閘門：木柵、土塀成條起，閘門淨係自己友過。敵人被擋會斬牆。夜晚有人嚟偷襲據點 */
const WALLS={fence:{hp:120},wall:{hp:300},gate:{hp:200}},WALL_R=.6,WALL_GAP=1,WALL_MAX=12;
Object.assign(BUILDS,{
  fence:{name:'木柵',cost:{wood:2},sec:3,s:.8,h:14,sub:'一節耐久 120 · 撳起點再撳終點，起成條',line:true},
  wall:{name:'土塀',cost:{wood:3,rope:1},sec:5,s:.8,h:12,sub:'一節耐久 300 · 撳起點再撳終點，起成條',line:true},
  gate:{name:'閘門',cost:{wood:4,iron:1},sec:6,s:.8,h:18,sub:'耐久 200 · 自己人行近會開，敵人過唔到'}
});
let buildStart=null;
const isWallKind=k=>!!WALLS[k];
function initWall(p,k){Object.assign(p,{wall:1,gate:k==='gate'?1:0,hp:WALLS[k].hp,max:WALLS[k].hp,ang:0})}
// 兩下撳：起點、終點，每 1 米一節
function wallLine(a,b,k){const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),n=Math.min(WALL_MAX,Math.floor(l/WALL_GAP)+1),ang=Math.atan2(dy,dx),out=[];
  for(let i=0;i<n;i++){const x=a.x+(l?dx/l:0)*i*WALL_GAP,y=a.y+(l?dy/l:0)*i*WALL_GAP;if(!placeProblem(x,y,k))out.push({t:'build',k,x,y,ang})}return out}
function wallAngNear(x,y){const w=nearest(props.filter(p=>p.wall&&!p.gate&&Math.hypot(p.x-x,p.y-y)<1.8),{x,y});return w?w.ang:0}
function tryPlaceWall(k,w){
  if(k==='gate'){const v=issueOne({t:'build',k,x:w.x,y:w.y,ang:wallAngNear(w.x,w.y)},w,'揀咗嘅隊友做唔到');if(v){buildMode=null;toast(`${v.name} 去起閘門`)}return}
  if(!buildStart){buildStart={x:w.x,y:w.y};toast(`起點定咗，再點終點（最多 ${WALL_MAX} 節）`);return}
  const cmds=wallLine(buildStart,w,k);buildStart=null;if(!cmds.length){toast('條線上面冇位起');return}
  const v=issueOne(cmds[0],cmds[0],'揀咗嘅隊友做唔到');if(!v)return;v.cmd.push(...cmds.slice(1));buildMode=null;
  toast(`${v.name} 去起${BUILDS[k].name} ${cmds.length} 節（材料夠幾多起幾多）`);
}
// 硬碰：牆推返出去；敵人撞到就記低，等陣斬
function wallPush(u){
  for(const p of props){if(!p.wall||p.gate&&u.team==='a')continue;const dx=u.x-p.x,dy=u.y-p.y,d=Math.hypot(dx,dy);
    if(d>=WALL_R)continue;if(d<1e-4){u.x+=WALL_R;continue}u.x=p.x+dx/d*WALL_R;u.y=p.y+dy/d*WALL_R;if(u.team!=='a')u.wallHit={p,t:simT}}
}
const canBreakWall=u=>u.team!=='a'&&u.team!=='w'&&!u.natural;
// engage 入面叫：被牆擋住就斬牆，返 true 表示今步用咗
function wallAttack(u,t,dt){const h=u.wallHit;if(!h||!canBreakWall(u)||simT-h.t>.6||!props.includes(h.p))return false;
  if(dist(u,t)<=range(u)*.95){u.wallHit=null;return false}
  const w=h.p;h.t=simT;u.state='斬牆';
  if(dist(u,w)>1.05){const dx=w.x-u.x,dy=w.y-u.y,l=Math.hypot(dx,dy)||1;u.x+=dx/l*Math.min(l,u.spd*dt);u.y+=dy/l*Math.min(l,u.spd*dt);wallPush(u);return true}
  if(u.cd<=0){const wpn=weapon(u);u.cd=wpn.cd;u.lunge=1;hitWall(w,rand(wpn.dmg[0],wpn.dmg[1])*(1+u.sk.atk.lv*.02)*1.5)}
  return true}
function hitWall(w,n){w.hp=Math.max(0,w.hp-n);if(w.hp<=0)breakWall(w)}
function removeProp(p){for(const list of [props,areaStates[activeArea].props]){const i=list.indexOf(p);if(i>=0)list.splice(i,1)}}
function breakWall(w){removeProp(w);piles.push({pile:true,id:'wreck-'+Math.random().toString(36).slice(2,8),name:'爛木',x:w.x,y:w.y,t:0,eq:{weapon:null,armor:null},pack:[{id:'wood',n:1}]});
  float(w,`${BUILDS[w.built].name}倒咗！`,'#ff9b84',true)}
function repairWall(u,w){if(!takeItem(u,'wood',1)){toast('要 1 條木先修到');return false}w.hp=w.max;float(w,'修好','#a9e08a');return true}
function demolishWall(u,w){removeProp(w);for(const [id,n] of Object.entries(BUILDS[w.built].cost)){const k=Math.floor(n/2);if(k)addItem(u,id,k)}float(w,'拆咗，退返一半材料','#f0c45a')}
// sim.js 入面嘅 repair / demolish 指令
function wallCmd(u,c,dt){const w=c.node;if(!props.includes(w)){u.cmd.shift();return}
  if(dist(u,w)>1.2){u.state=c.t==='repair'?'去修牆':'去拆牆';step(u,w.x,w.y,dt);return}
  c.prog=(c.prog||0)+dt;u.state=c.t==='repair'?'修緊牆':'拆緊牆';if(c.prog<(c.t==='repair'?3:2))return;
  u.cmd.shift();if(c.t==='repair')repairWall(u,w);else demolishWall(u,w)}
function pickWall(sx,sy){for(const p of props){if(!p.wall||!fogVisible(p))continue;const s=scr(p.x,p.y,6);if(Math.hypot(s.x-sx,s.y-sy)<22*Math.max(.8,cam.z))return p}return null}
function wallMenu(p,sx,sy){const d=BUILDS[p.built],go=(c,msg)=>{const v=issueOne(c,p,'揀咗嘅隊友做唔到');if(v)toast(`${v.name} ${msg}`)},opts=[];
  if(p.hp<p.max)opts.push({label:'修理',sub:'用木 1 · 補返滿耐久',fn:()=>go({t:'repair',node:p},'去修牆')});
  opts.push({label:'拆',sub:`退返 ${costText(Object.fromEntries(Object.entries(d.cost).map(([k,n])=>[k,Math.floor(n/2)]).filter(([,n])=>n)))||'冇嘢'}`,fn:()=>go({t:'demolish',node:p},'去拆牆')});
  showMenu(sx,sy,`${d.name} · 耐久 ${Math.ceil(p.hp)}/${p.max}`,opts)}
function drawWall(p,sc){
  const z=cam.z,ex=Math.cos(p.ang)*.5,ey=Math.sin(p.ang)*.5,a=scr(p.x-ex,p.y-ey,0),b=scr(p.x+ex,p.y+ey,0),hh=BUILDS[p.built].h*z,bad=p.hp<p.max*.4;
  if(p.gate){const open=allies().some(u=>!u.down&&dist(u,p)<1.6),m=open?.25:.5;
    for(const [q,s] of [[a,1],[b,-1]]){const x2=q.x+(sc.x-q.x)*m*2*(open?.5:1),y2=q.y+(sc.y-q.y)*m*2*(open?.5:1);ctx.fillStyle=bad?'#6b4a36':'#7b5a3a';ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(x2,y2);ctx.lineTo(x2,y2-hh*.8);ctx.lineTo(q.x,q.y-hh*.8);ctx.closePath();ctx.fill();ctx.strokeStyle='#2c2016';ctx.lineWidth=1.2*z;ctx.stroke()}
    for(const q of [a,b])inkRect(q.x-2*z,q.y-hh,4*z,hh,'#4a3524');
  }else if(p.built==='wall'){ctx.fillStyle=bad?'#8a6f52':'#a88e6a';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x,b.y-hh);ctx.lineTo(a.x,a.y-hh);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#3a2a1c';ctx.lineWidth=1.2*z;ctx.stroke();ctx.fillStyle='#5a4a3a';ctx.fillRect(Math.min(a.x,b.x),Math.min(a.y,b.y)-hh-2*z,Math.abs(b.x-a.x)||2*z,3*z)
  }else{ctx.strokeStyle=bad?'#5e4630':'#7a5634';ctx.lineWidth=2.4*z;for(let i=0;i<3;i++){const x=a.x+(b.x-a.x)*i/2,y=a.y+(b.y-a.y)*i/2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-hh);ctx.stroke()}
    ctx.lineWidth=1.6*z;for(const f of [.4,.75]){ctx.beginPath();ctx.moveTo(a.x,a.y-hh*f);ctx.lineTo(b.x,b.y-hh*f);ctx.stroke()}}
  if(p.hp<p.max){const w=18*z;inkRect(sc.x-w/2,sc.y-hh-7*z,w,3*z,'#2a1a14');inkRect(sc.x-w/2,sc.y-hh-7*z,w*p.hp/p.max,3*z,p.hp<p.max*.4?'#d65b41':'#a9c46a')}
}
/* ---------- 夜襲：你有據點（床、工坊、牆）嘅地方，每晚一次機會 ---------- */
let raidDay=-1,nightRaidAt=null;
const baseHere=()=>props.filter(p=>p.built&&(p.built==='bed'||WORK_AT[p.built]||p.wall||p.built==='field'||p.built==='hearth'));
function tickNightRaid(dt){
  const day=Math.floor(simT/DAY_LEN);if(!isNight()||raidDay===day||simT<ENC_GRACE){if(!isNight())nightRaidAt=null;return}
  const base=baseHere();if(!base.length)return;
  nightRaidAt??=simT+10+encRng()*60;if(simT<nightRaidAt)return;
  raidDay=day;nightRaidAt=null;if(encRng()>=.5)return;
  nightRaid(base);
}
function nightRaid(base=baseHere()){
  const cx=base.reduce((n,p)=>n+p.x,0)/base.length,cy=base.reduce((n,p)=>n+p.y,0)/base.length,ex=AREAS[activeArea].exits,e=ex[Math.floor(encRng()*ex.length)%ex.length];
  const from=e?arrivalPoint(activeArea,e.to):{x:1.5,y:1.5},lv=Math.max(1,areaLv(activeArea)),n=Math.min(6,2+lv);
  for(let i=0;i<n;i++){const p={x:from.x+(i%3-1)*.8,y:from.y+Math.floor(i/3)*.8};
    borderSpawn(activeArea,{kind:'enc_nightraid',team:'e',name:i?'夜盜':'夜盜頭目',color:'#5d4a5a',base:i?40+lv*5:52+lv*6,...p,home:{x:cx,y:cy},aggroR:14,leash:40,aggro:true,
      eq:{weapon:'machete',armor:lv>=3?'plate':'leather'},lv:{atk:8+lv*5,tough:8+lv*4,dod:8+lv*2},pack:[{id:'coin',n:6+lv*4}],encUntil:simT+ENC_LIFE})}
  toast(`夜襲！${n} 個夜盜摸近你嘅據點`);borderLog(`${AREAS[activeArea].name}夜襲：${n} 個夜盜。`);return n;
}
