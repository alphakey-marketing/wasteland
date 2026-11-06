'use strict';
// Inactive areas retain their objects and pause simulation.
const AREAS={village:{name:'青葉村',gate:{x:8,y:10},entry:{x:7.5,y:8.5}},temple:{name:'荒寺山道',gate:{x:7,y:8},entry:{x:7.5,y:8.5}}};
let activeArea='village';
const areaStates={};
const villageProps=props.filter(p=>p.x<13&&p.y<13);
const templeProps=[{x:13,y:13,s:1.8,h:37,c:[156,139,104],house:1,temple:1},{x:10.2,y:12.8,s:.6,h:18,c:[136,137,118]},{x:14.7,y:10.4,s:.65,h:14,c:[131,131,111]},{x:12.2,y:14.5,s:.55,h:8,c:[142,132,106],crate:1}];
const villageOres=ORES.filter(o=>o.x<6),templeOres=ORES.filter(o=>o.x>=6);
templeOres.forEach(o=>templeProps.push(o));
for(const [x,y] of [[1,4],[2,9],[8,1],[11,6],[15,12],[5,12],[8,15],[16,7],[3,13]]){
  villageProps.push({x,y,s:.5,h:27,c:[91,111,67],tree:1});
  templeProps.push({x:x+3,y:y+3,s:.5,h:30,c:[77,99,62],tree:1});
}
areaStates.village={units:units.filter(u=>u.team!=='e'&&u.team!=='w'),piles:[],props:villageProps,ores:villageOres,beds:[...BEDS],alerted:false,cleared:false};
areaStates.temple={units:units.filter(u=>u.team==='e'||u.team==='w'),piles:[{pile:true,permanent:true,id:'temple-supplies',name:'荒寺遺留箱',x:10.8,y:10.6,t:0,eq:{weapon:null,armor:null},pack:[{id:'ration',n:4},{id:'medkit',n:2},{id:'kit',n:1},{id:'seal',n:1}]}],props:templeProps,ores:templeOres,beds:[],alerted:false,cleared:false};
areaStates.temple.units.filter(u=>u.team==='e').forEach((u,i)=>{u.x=14+(i%2)*.8;u.y=12+Math.floor(i/2)*.8;u.home={x:14,y:12};u.leash=5});
function captureArea(){Object.assign(areaStates[activeArea],{units:[...units],piles:[...piles],alerted,cleared,pausedAt:simT})}
function activateArea(id){
  activeArea=id;const a=areaStates[id];
  for(const p of a.piles)if(!p.permanent)p.t+=Math.max(0,simT-(a.pausedAt??simT));a.pausedAt=simT;
  units.splice(0,units.length,...a.units);piles=[...a.piles];props.splice(0,props.length,...a.props);ORES.splice(0,ORES.length,...a.ores);BEDS.splice(0,BEDS.length,...a.beds);ground=grounds[id];alerted=a.alerted;cleared=a.cleared;
}
activateArea('village');
function allSquad(){return [...units,...Object.entries(areaStates).filter(([id])=>id!==activeArea).flatMap(([,a])=>a.units)].filter(u=>u.team==='a')}
function travelParty(){const party=new Set([...sel].filter(u=>units.includes(u)&&u.team==='a'&&!u.dead&&!u.down));for(const u of party)if(u.carry)party.add(u.carry);return [...party]}
let pendingTravel=null;
function cancelTravel(notify=true){if(!pendingTravel)return;for(const u of pendingTravel.party)u.cmd=u.cmd.filter(c=>!c.travel);pendingTravel=null;if(notify)toast('已取消出發')}
function startTravel(){
  cancelTravel(false);const party=travelParty(),walkers=party.filter(u=>!u.carriedBy),gate=AREAS[activeArea].gate;
  if(!walkers.length){toast('先揀可以行動嘅隊友；傷者要先揹起');return}
  pendingTravel={area:activeArea,party};
  walkers.forEach((u,i)=>{const f=formation(walkers.length,i);u.cmd=[{t:'move',x:gate.x+f.dx*.5,y:gate.y+f.dy*.5,travel:true}]});
  hideMenu();toast('集合到路牌後自動出發；追兵可能跟過嚟');updateTravel();
}
function updateTravel(){
  if(!pendingTravel)return;const {area,party}=pendingTravel;
  if(area!==activeArea||party.some(u=>!units.includes(u)||(!u.carriedBy&&(u.dead||u.down))||(u.carry&&!party.includes(u.carry)))||party.some(u=>u.carriedBy&&!party.includes(u.carriedBy))){cancelTravel();return}
  if(party.filter(u=>!u.carriedBy).every(u=>dist(u,AREAS[area].gate)<=1.3))travelArea(party);
}
function travelArea(party=travelParty()){
  const walkers=party.filter(u=>!u.carriedBy),gate=AREAS[activeArea].gate;
  if(!walkers.length){toast('先揀可以出發嘅隊友；倒地同伴要有人揹');return false}
  if(walkers.some(u=>dist(u,gate)>2.4)){toast('先叫出發隊友集合到山道口');return false}
  const pursuers=units.filter(u=>u.team!=='g'&&!u.down&&!u.dead&&!u.carriedBy&&!party.includes(u)&&(u.aggro||u.pursuitId)&&dist(u,gate)<5&&walkers.some(a=>hostile(u,a)&&dist(u,a)<6));
  const target=activeArea==='village'?'temple':'village';
  pendingTravel=null;
  for(const u of party){u.cmd=[];u.moving=false;u.lunge=0}
  captureArea();areaStates[activeArea].units=areaStates[activeArea].units.filter(u=>!party.includes(u)&&!pursuers.includes(u));areaStates[target].units.push(...party,...pursuers);activateArea(target);
  walkers.forEach((u,i)=>{u.x=AREAS[target].entry.x+(i%2)*.7;u.y=AREAS[target].entry.y+Math.floor(i/2)*.7;if(u.carry){u.carry.x=u.x;u.carry.y=u.y}});
  pursuers.forEach((u,i)=>{u.x=AREAS[target].entry.x+2+(i%2)*.7;u.y=AREAS[target].entry.y+1+Math.floor(i/2)*.7;u.home={x:u.x,y:u.y};u.wp=null;u.cmd=[];u.aggro=true;u.pursuitId=nearest(walkers.filter(a=>hostile(u,a)),u).id});
  sel.clear();walkers.filter(u=>u.team==='a').forEach(u=>sel.add(u));finishAreaChange();toast(`到達${AREAS[target].name} · ${walkers.length} 人同行${pursuers.length?' · 有追兵！':''}`);return true;
}
function finishAreaChange(){
  cam.follow=null;centerOn(8,8);
  for(const key of Object.keys(fx))fx[key]=[];
  hideMenu();charSheet.hidden=sheet.hidden=shopSheet.hidden=lootSheet.hidden=barSheet.hidden=true;setModal(false);buildSquadUI();refreshStatus();updatePortraits(true);save(false);
}
function switchReserve(){
  const target=activeArea==='village'?'temple':'village';
  if(!areaStates[target].units.some(u=>u.team==='a'&&!u.dead)){toast('另一區冇留守隊友');return false}
  cancelTravel(false);captureArea();activateArea(target);sel.clear();allies().filter(u=>!u.dead).forEach(u=>sel.add(u));finishAreaChange();toast(`切換到${AREAS[target].name}留守隊；冇人跨區移動`);return true;
}
function travelMenu(sx=W-60,sy=H-220){
  const a=AREAS[activeArea],n=travelParty().filter(u=>!u.carriedBy).length;
  showMenu(sx,sy,`${a.name} · 山道口`,[
    {label:activeArea==='village'?'出發：荒寺山道':'返回：青葉村',sub:`已選 ${n} 人 · 自動集合出發；附近追兵會跟隨 · 傷者要先揹起`,fn:startTravel},
    ...(pendingTravel?[{label:'取消出發',fn:cancelTravel}]:[]),
    ...(areaStates[activeArea==='village'?'temple':'village'].units.some(u=>u.team==='a'&&!u.dead)?[{label:'切換留守隊',sub:'只切換控制地區；出征隊會留喺原位',fn:switchReserve}]:[])
  ]);
}
function packAreaUnit(u){
  return {id:u.id,team:u.team,kind:u.kind,name:u.name,role:u.role,color:u.color,base:u.base,x:u.x,y:u.y,p:u.p,sk:u.sk,eq:u.eq,pack:u.pack,bounty:u.bounty,down:u.down,dead:u.dead,bleed:u.bleed,rules:u.rules,home:u.home,aggroR:u.aggroR,leash:u.leash,food:u.food,kitUse:u.kitUse,spd:u.spd,face:u.face,gid:u.gid,idx:u.idx,dir:u.dir,waitT:u.waitT,retreating:u.retreating,pursuitId:u.pursuitId,carryId:u.carry?u.carry.id:null,leaderId:u.leader?u.leader.id:null};
}
function packAreas(){captureArea();return Object.fromEntries(Object.entries(areaStates).map(([id,a])=>[id,{units:a.units.map(packAreaUnit),piles:a.piles,alerted:a.alerted,cleared:a.cleared,pausedAt:a.pausedAt}]))}
function restoreAreas(saved,id){
  for(const key of Object.keys(AREAS)){
    const a=saved[key];if(!a||!Array.isArray(a.units)||!Array.isArray(a.piles))throw Error('區域存檔不完整');
    const byId=new Map(),restored=a.units.map(o=>{
      const npc=key==='village'?(o.role==='trader'?TRADER:o.role==='inn'?INNKEEPER:o.team==='g'?GUARD:null):null;
      const u=Object.assign(npc||{},mk(o),{p:o.p,sk:o.sk,food:o.food==null?100:o.food});if(u.kind==='dog')u.natural=BITE;
      if(u.team==='a'&&!u.rules)u.rules={flee:true,rescue:false,fight:true};byId.set(u.id,u);return u;
    });
    a.units.forEach((o,i)=>{const u=restored[i];if(o.carryId&&byId.has(o.carryId)){u.carry=byId.get(o.carryId);u.carry.carriedBy=u}if(o.leaderId)u.leader=byId.get(o.leaderId)});
    Object.assign(areaStates[key],{units:restored,piles:a.piles,alerted:!!a.alerted,cleared:!!a.cleared,pausedAt:a.pausedAt});
  }
  activateArea(AREAS[id]?id:'village');
}
function migrateLegacyArea(){
  const enemies=units.filter(u=>u.team==='e'||u.team==='c');areaStates.temple.units=areaStates.temple.units.filter(u=>u.team!=='e').concat(enemies);
  enemies.forEach((u,i)=>{u.x=14+(i%2)*.8;u.y=12+Math.floor(i/2)*.8;u.home={x:14,y:12};u.leash=5});
  const carried=new Set(allies().filter(u=>u.carry).map(u=>u.carry));areaStates.temple.units=areaStates.temple.units.filter(u=>!carried.has(u));
  units.splice(0,units.length,...units.filter(u=>!enemies.includes(u)||carried.has(u)));
  allies().forEach((u,i)=>{u.x=7.2+(i%2)*.9;u.y=8.4+Math.floor(i/2)*.9;if(u.carry){u.carry.x=u.x;u.carry.y=u.y}});captureArea();
}
