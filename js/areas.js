'use strict';
// Inactive areas retain their objects and pause simulation.
const AREAS={
  village:{name:'青葉村',exits:[{to:'temple',x:12,y:12,r:1.7}],center:{x:5,y:5},links:['temple'],hint:'貧村補給／工匠；西面銅礦'},
  temple:{name:'荒寺山道',exits:[{to:'village',x:7,y:8,r:1.7},{to:'forge',x:24,y:14,r:1.7}],center:{x:14,y:12},links:['village','forge'],hint:'北面鐵礦；尋圖錄，東南出口可往鍛冶場'},
  forge:{name:'廢棄鍛冶場',exits:[{to:'temple',x:5,y:8,r:1.7}],center:{x:14,y:12},links:['temple'],hint:'外圍補給；深處有機關圖樣／零件，毋須清場'}
};
// Edge exits: walking a commanded party into one travels. gate = first exit, kept for caravan/legacy code.
for(const a of Object.values(AREAS))a.gate=a.exits[0];
const exitTo=(area,to)=>AREAS[area].exits.find(e=>e.to===to);
function arrivalPoint(area,from){const e=exitTo(area,from),c=AREAS[area].center,dx=c.x-e.x,dy=c.y-e.y,l=Math.hypot(dx,dy)||1;return{x:e.x+dx/l*2.4,y:e.y+dy/l*2.4}}
function exitAt(x,y){return AREAS[activeArea].exits.find(e=>Math.hypot(x-e.x,y-e.y)<=e.r&&fogKnown(e))||null}
let activeArea='village';
const areaStates={};
const villageProps=props.filter(p=>p.x<13&&p.y<13&&(!p.isOre||p.ore==='copper'));
const templeProps=[{x:13,y:13,s:1.8,h:37,c:[156,139,104],house:1,temple:1},{x:10.2,y:12.8,s:.6,h:18,c:[136,137,118]},{x:14.7,y:10.4,s:.65,h:14,c:[131,131,111]},{x:12.2,y:14.5,s:.55,h:8,c:[142,132,106],crate:1}];
const villageOres=ORES.filter(o=>o.x<6),templeOres=ORES.filter(o=>o.x>=6);
templeOres.forEach(o=>templeProps.push(o));
for(const [x,y] of [[1,4],[2,9],[8,1],[11,6],[15,12],[5,12],[8,15],[16,7],[3,13]]){
  villageProps.push({x,y,s:.5,h:27,c:[91,111,67],tree:1});
  templeProps.push({x:x+3,y:y+3,s:.5,h:30,c:[77,99,62],tree:1});
}
areaStates.village={units:units.filter(u=>u.team!=='e'&&u.team!=='w'),piles:[],props:villageProps,ores:villageOres,beds:[...BEDS],alerted:false,cleared:false};
areaStates.temple={units:units.filter(u=>u.team==='e'||u.team==='w'),piles:[{pile:true,permanent:true,id:'temple-supplies',name:'荒寺遺留箱',x:10.8,y:10.6,t:0,eq:{weapon:null,armor:null},pack:[{id:'ration',n:2},{id:'medkit',n:1},{id:'kit',n:1},{id:'seal',n:1}]}],props:templeProps,ores:templeOres,beds:[],alerted:false,cleared:false};
areaStates.temple.units.filter(u=>u.team==='e').forEach((u,i)=>{u.x=14+(i%2)*.8;u.y=12+Math.floor(i/2)*.8;u.home={x:14,y:12};u.leash=5});
const forgeOre={x:5,y:4.5,ore:'iron',isOre:1,s:.8,h:14,c:[118,122,117],landmark:'鐵礦脈'};
const forgeProps=[forgeOre,{x:13.5,y:12,s:1.8,h:25,c:[92,89,82],furnace:1,landmark:'舊鍛爐'},{x:16.5,y:15,s:1.5,h:27,c:[116,107,92],house:1,temple:1,landmark:'舊工房'},
  ...[[9,5],[10,13],[15,8],[17,11]].map(([x,y])=>({x,y,s:.65,h:9,c:[104,100,88]})),
  ...[[3,5],[4,13],[8,16],[18,17]].map(([x,y])=>({x,y,s:.5,h:30,c:[80,91,66],tree:1}))];
function forgeCache(id,name,x,y,pack){return {pile:true,permanent:true,id,name,x,y,t:0,eq:{weapon:null,armor:null},pack}}
areaStates.forge={units:[[13,10],[15,13],[16,14]].map(([x,y],i)=>mk({team:'e',name:i?'鍛冶場浪人':'守料浪人',color:'#82715b',base:i?62:48,x,y,home:{x,y},aggroR:3.2,leash:6,eq:{weapon:i?'machete':'club',armor:i?'plate':'leather'},lv:{atk:i?23:16,tough:i?22:15,dod:14},pack:[{id:'coin',n:12}]})),
  piles:[forgeCache('forge-edge','外圍行囊',8,8,[{id:'ration',n:1},{id:'medkit',n:1},{id:'iron',n:2}]),
    forgeCache('forge-parts','舊料箱',11,9,[{id:'steel',n:2},{id:'mechanism',n:1}]),
    forgeCache('forge-plans','工房秘藏',15,14,[{id:'steel',n:2},{id:'mechanism',n:1},{id:'forge_scroll',n:1}])],
  props:forgeProps,ores:[forgeOre],beds:[],alerted:false,cleared:false};
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
function startTravel(target=AREAS[activeArea].links[0]){
  if(!AREAS[activeArea].links.includes(target))return false;
  cancelTravel(false);const party=travelParty(),walkers=party.filter(u=>!u.carriedBy),gate=exitTo(activeArea,target);
  if(!walkers.length){toast('先揀可以行動嘅隊友；傷者要先揹起');return}
  pendingTravel={area:activeArea,party,target};
  walkers.forEach((u,i)=>{const f=formation(walkers.length,i);u.cmd=[{t:'move',x:gate.x+f.dx*.5,y:gate.y+f.dy*.5,travel:true}]});
  hideMenu();toast(`集合到出口後自動前往${AREAS[target].name}；追兵可能跟過嚟`);updateTravel();
}
function updateTravel(){
  if(!pendingTravel)return;const {area,party}=pendingTravel;
  if(area!==activeArea||party.some(u=>!units.includes(u)||(!u.carriedBy&&(u.dead||u.down))||(u.carry&&!party.includes(u.carry)))||party.some(u=>u.carriedBy&&!party.includes(u.carriedBy))){cancelTravel();return}
  if(party.filter(u=>!u.carriedBy).every(u=>dist(u,exitTo(area,pendingTravel.target))<=1.3)){
    if(!campaignEscortReady(party,exitTo(area,pendingTravel.target))){if(!pendingTravel.escortWarned){toast('等阿澄到出口先出發；倒地要揹起，亦可喺世情報叫佢等候');pendingTravel.escortWarned=true}return}
    travelArea(party,pendingTravel.target);
  }
}
function travelArea(party=travelParty(),target=AREAS[activeArea].links[0]){
  if(!AREAS[activeArea].links.includes(target)){toast('呢條山道去唔到該地區');return false}
  const gate=exitTo(activeArea,target);party=campaignTravelParty(party,gate);
  const walkers=party.filter(u=>!u.carriedBy);
  if(!walkers.length){toast('先揀可以出發嘅隊友；倒地同伴要有人揹');return false}
  if(walkers.some(u=>dist(u,gate)>2.4)){toast('先叫出發隊友集合到出口');return false}
  if(!campaignEscortReady(party,gate)){toast('阿澄未到出口；等埋佢，倒地就先揹起');return false}
  const pursuers=units.filter(u=>u.team!=='g'&&!u.down&&!u.dead&&!u.carriedBy&&!party.includes(u)&&(u.aggro||u.pursuitId)&&dist(u,gate)<5&&walkers.some(a=>hostile(u,a)&&dist(u,a)<6));
  pendingTravel=null;
  for(const u of party){u.cmd=[];u.moving=false;u.lunge=0}
  const from=activeArea;captureArea();areaStates[activeArea].units=areaStates[activeArea].units.filter(u=>!party.includes(u)&&!pursuers.includes(u));areaStates[target].units.push(...party,...pursuers);activateArea(target);
  const arr=arrivalPoint(target,from);
  walkers.forEach((u,i)=>{u.x=arr.x+(i%2)*.7;u.y=arr.y+Math.floor(i/2)*.7;if(u.carry){u.carry.x=u.x;u.carry.y=u.y}});
  pursuers.forEach((u,i)=>{u.x=arr.x+1.6+(i%2)*.7;u.y=arr.y+.8+Math.floor(i/2)*.7;u.home={x:u.x,y:u.y};u.wp=null;u.cmd=[];u.aggro=true;u.pursuitId=nearest(walkers.filter(a=>hostile(u,a)),u).id});
  sel.clear();walkers.filter(u=>u.team==='a').forEach(u=>sel.add(u));finishAreaChange(arr);toast(`到達${AREAS[target].name} · ${walkers.length} 人同行${pursuers.length?' · 有追兵！':''}`);return true;
}
function finishAreaChange(at){
  updateFog();
  cam.follow=null;centerOn(at?.x??8,at?.y??8);if(at)areaFade();
  for(const key of Object.keys(fx))fx[key]=[];
  hideMenu();charSheet.hidden=sheet.hidden=shopSheet.hidden=lootSheet.hidden=barSheet.hidden=true;setModal(false);buildSquadUI();refreshStatus();updatePortraits(true);save(false);
}
const fadeEl=$('#fade');
function areaFade(){if(paused||!fadeEl)return;fadeEl.style.transition='none';fadeEl.style.opacity=1;void fadeEl.offsetWidth;fadeEl.style.transition='opacity .45s';fadeEl.style.opacity=0}
function switchReserve(target=Object.keys(AREAS).find(id=>id!==activeArea&&areaStates[id].units.some(u=>u.team==='a'&&!u.dead))){
  if(!target||target===activeArea||!areaStates[target]){toast('另一區冇留守隊友');return false}
  if(!areaStates[target].units.some(u=>u.team==='a'&&!u.dead)){toast('另一區冇留守隊友');return false}
  cancelTravel(false);captureArea();activateArea(target);sel.clear();allies().filter(u=>!u.dead).forEach(u=>sel.add(u));finishAreaChange();toast(`切換到${AREAS[target].name}留守隊；冇人跨區移動`);return true;
}
function travelMenu(sx=W-60,sy=H-220,ex=AREAS[activeArea].exits[0]){
  const a=AREAS[activeArea],n=travelParty().filter(u=>!u.carriedBy).length;
  showMenu(sx,sy,`${a.name} · 出口：${AREAS[ex.to].name}`,[
    ...[ex.to].map(id=>({label:`${id==='village'?'返回':'出發'}：${AREAS[id].name}`,sub:`已選 ${n} 人 · 自動集合；追兵會跟隨 · ${id==='forge'?'危險較高，可先搜外圍再撤退':'傷者要先揹起'}`,fn:()=>startTravel(id)})),
    {label:'世情報／傳聞',sub:'人物由開局已經存在，冇章節先後限制',fn:openJournal},
    ...(pendingTravel?[{label:'取消出發',fn:cancelTravel}]:[]),
    ...Object.keys(AREAS).filter(id=>id!==activeArea&&areaStates[id].units.some(u=>u.team==='a'&&!u.dead)).map(id=>({label:`切換留守隊 · ${AREAS[id].name}`,sub:'只切換控制地區；出征隊留喺原位',fn:()=>switchReserve(id)})),
    ...(knownLandmarks().length?[{label:`已發現地點 · ${knownLandmarks().length}`,sub:'查看已記錄嘅路牌、礦脈同工房位置',fn:()=>landmarkMenu(sx,sy)}]:[]),
    ...(!hasFog()&&ORES.some(fogKnown)?[{label:activeArea==='village'?'查看西面銅礦':'查看北面鐵礦',sub:'移動鏡頭到已發現礦脈，再點礦石落採礦指令',fn:()=>{const ore=ORES.find(fogKnown);if(ore){cam.follow=null;centerOn(ore.x,ore.y);toast(`點礦石就可以採${ITEMS[ore.ore].name}，揹緊人嘅隊友做唔到`)}}}]:[])
  ]);
}
function landmarkMenu(sx,sy){
  showMenu(sx,sy,'已發現地點 · 只查看位置',[
    ...knownLandmarks().map(p=>({label:p.name,sub:'敵情同物資要接近確認',fn:()=>{cam.follow=null;centerOn(p.x,p.y);toast(`查看已記錄地點：${p.name}`)}})),
    {label:'返回出口選單',fn:()=>travelMenu(sx,sy)}
  ]);
}
function packAreaUnit(u){
  return {id:u.id,team:u.team,kind:u.kind,name:u.name,role:u.role,color:u.color,base:u.base,x:u.x,y:u.y,p:u.p,sk:u.sk,eq:u.eq,pack:u.pack,bounty:u.bounty,down:u.down,dead:u.dead,bleed:u.bleed,rules:u.rules,home:u.home,aggroR:u.aggroR,leash:u.leash,food:u.food,starvation:u.starvation,kitUse:u.kitUse,spd:u.spd,face:u.face,gid:u.gid,idx:u.idx,dir:u.dir,waitT:u.waitT,retreating:u.retreating,pursuitId:u.pursuitId,carryId:u.carry?u.carry.id:null,leaderId:u.leader?u.leader.id:null};
}
function packAreas(){captureArea();return Object.fromEntries(Object.entries(areaStates).map(([id,a])=>[id,{units:a.units.map(packAreaUnit),piles:a.piles,alerted:a.alerted,cleared:a.cleared,pausedAt:a.pausedAt}]))}
function restoreAreas(saved,id){
  for(const key of Object.keys(AREAS)){
    const a=saved[key];if(!a&&key==='forge')continue; // Pre-forge saves keep their existing regions and receive the new region once.
    if(!a||!Array.isArray(a.units)||!Array.isArray(a.piles))throw Error('區域存檔不完整');
    const byId=new Map(),restored=a.units.map(o=>{
      const npc=key==='village'?(o.role==='trader'?TRADER:o.role==='inn'?INNKEEPER:o.team==='g'&&!o.kind?GUARD:null):null;
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
