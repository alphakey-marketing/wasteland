'use strict';
// Inactive areas retain their objects and pause simulation.
const AREAS={
  village:{name:'青葉村',map:{x:.13,y:.4},exits:[{to:'temple',x:12,y:12,r:1.7},{to:'saijo',x:2,y:18,r:1.7}],center:{x:5,y:5},links:['temple','saijo'],hint:'貧村補給／工匠；西面銅礦'},
  temple:{name:'荒寺山道',map:{x:.45,y:.22},exits:[{to:'village',x:7,y:8,r:1.7},{to:'forge',x:24,y:14,r:1.7},{to:'amemiya',x:14,y:26,r:1.7}],center:{x:14,y:12},links:['village','forge','amemiya'],hint:'北面鐵礦；尋圖錄，東南出口可往鍛冶場'},
  forge:{name:'廢棄鍛冶場',map:{x:.8,y:.4},exits:[{to:'temple',x:5,y:8,r:1.7},{to:'jizo',x:26,y:24,r:1.7}],center:{x:14,y:12},links:['temple','jizo'],hint:'外圍補給；深處有機關圖樣／零件，毋須清場'}
};
// 生成區域：用種子砌地形，唔使存地形。地名用川中島一帶，地理唔求準。
const REGIONS={
  saijo:{name:'妻女山',tpl:'forest',lv:1,seed:101,map:{x:.12,y:.76},links:['village','hachiman'],hint:'杉林密，野犬出沒；好多樹可砍',mark:'上杉陣跡'},
  hachiman:{name:'八幡原',tpl:'ruin',lv:2,seed:202,map:{x:.34,y:.6},links:['saijo'],hint:'合戰後嘅荒村；廢屋有米同稻種',mark:'八幡社'},
  amemiya:{name:'雨宮渡',tpl:'river',lv:2,seed:303,map:{x:.55,y:.5},links:['temple','zenkoji'],hint:'千曲川渡口；山賊守住淺灘',mark:'渡口小屋'},
  zenkoji:{name:'善光寺',tpl:'ruin',lv:3,seed:404,map:{x:.55,y:.82},links:['amemiya'],hint:'信濃名寺，門前荒廢；寺中有藥',mark:'善光寺本堂'},
  jizo:{name:'地藏峠',tpl:'pass',lv:3,seed:505,map:{x:.9,y:.64},links:['forge','shio'],hint:'山路崎嶇，銅鐵礦多；浪人好打',mark:'地藏堂'},
  shio:{name:'鹽之道',tpl:'river',lv:4,seed:606,map:{x:.8,y:.88},links:['jizo'],hint:'運鹽古道；盡頭未通（之後開放）',mark:'鹽倉'}
};
for(const [id,R] of Object.entries(REGIONS)){
  // exit sits on the side facing the linked area on the world map (screen dir -> iso world dir)
  const exits=R.links.map(to=>{const L=REGIONS[to]?.map||AREAS[to].map,sx=L.x-R.map.x,sy=L.y-R.map.y,wx=sx+sy,wy=sy-sx,n=Math.hypot(wx,wy)||1;
    return{to,x:Math.max(2,Math.min(30,16+wx/n*13.5)),y:Math.max(2,Math.min(30,16+wy/n*13.5)),r:1.7}});
  AREAS[id]={name:R.name,map:R.map,exits,center:{x:16,y:16},links:R.links,hint:R.hint,gen:{tpl:R.tpl,lv:R.lv,seed:R.seed,mark:R.mark}};
}
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
const rng32=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const TPL={
  forest:{tree:42,rock:6,house:0,ore:[],foe:'山賊',foes:1,dogs:3,cache:['獵人小屋','倒木下行囊'],extra:[{id:'hide',n:2},{id:'meat',n:2}]},
  ruin:{tree:10,rock:6,house:6,ore:[],foe:'落武者',foes:3,dogs:0,cache:['廢屋米櫃','燒剩倉庫'],extra:[{id:'seed',n:3},{id:'rice',n:2}]},
  river:{tree:16,rock:10,house:1,ore:[],foe:'渡口山賊',foes:3,dogs:0,cache:['渡船遺包','漁小屋'],extra:[{id:'rope',n:2},{id:'ration',n:1}]},
  pass:{tree:8,rock:18,house:0,ore:['copper','copper','iron','iron'],foe:'山道浪人',foes:3,dogs:1,cache:['峠茶屋','崖下荷物'],extra:[{id:'iron',n:2},{id:'kit',n:1}]}
};
function genRegion(id){
  const A=AREAS[id],G=A.gen,T=TPL[G.tpl],lv=G.lv,r=rng32(G.seed),R=(a,b)=>a+r()*(b-a);
  const taken=[...A.exits.map(e=>[e.x,e.y,3.4]),[A.center.x,A.center.y,2.4]];
  // road from each exit to centre stays clear
  const onRoad=(x,y)=>A.exits.some(e=>{const dx=A.center.x-e.x,dy=A.center.y-e.y,l2=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((x-e.x)*dx+(y-e.y)*dy)/l2));return Math.hypot(x-e.x-dx*t,y-e.y-dy*t)<1.3});
  const put=(gap,fn)=>{for(let k=0;k<60;k++){const x=R(2,30),y=R(2,30);if(!onRoad(x,y)&&taken.every(([a,b,q])=>Math.hypot(x-a,y-b)>Math.max(q,gap))){taken.push([x,y,gap]);return fn(x,y)}}return null};
  const props=[],ores=[],piles=[],units=[];
  put(3.2,(x,y)=>props.push({x,y,s:1.6,h:34,c:[156,136,104],house:1,temple:1,landmark:G.mark}));
  for(let i=0;i<T.house;i++)put(2.4,(x,y)=>props.push({x,y,s:R(1.05,1.35),h:R(18,28),c:[146+R(-10,10),126,98],house:1}));
  for(const ore of T.ore)put(2,(x,y)=>{const o={x,y,ore,isOre:1,s:.9,h:15,c:ore==='copper'?[150,98,62]:[110,118,124],landmark:ore==='copper'?'銅礦脈':'鐵礦脈'};ores.push(o);props.push(o)});
  const camp=put(3,(x,y)=>({x,y})),den=T.dogs?put(3,(x,y)=>({x,y})):null;
  for(let k=0;k<2;k++)put(1.6,(x,y)=>piles.push({pile:true,permanent:true,id:`${id}-cache-${k}`,name:T.cache[k],x,y,t:0,eq:{weapon:null,armor:null},
    pack:k?[...T.extra,...(lv>=3?[{id:'steel',n:1}]:[]),...(G.mark==='善光寺本堂'?[{id:'medkit',n:2}]:[])]:[{id:'ration',n:1},{id:'medkit',n:lv>=2?1:0},{id:'coin',n:8*lv}].filter(s=>s.n)}));
  for(let i=0;i<T.tree;i++)put(1.2,(x,y)=>props.push({x,y,s:.5,h:R(26,34),c:[70+R(0,20),94+R(0,20),58],tree:1}));
  for(let i=0;i<T.rock;i++)put(1.1,(x,y)=>props.push({x,y,s:R(.45,.8),h:R(7,13),c:[118+R(-8,8),116,106]}));
  if(camp)for(let i=0;i<T.foes+(lv>=3?1:0);i++){const x=camp.x+R(-1.2,1.2),y=camp.y+R(-1.2,1.2);
    units.push(mk({team:'e',name:T.foe,color:'#7d6a55',base:40+lv*7,x,y,home:{x:camp.x,y:camp.y},aggroR:3.2,leash:6,
      eq:{weapon:lv>=2||i?'machete':'club',armor:lv>=3?'plate':'leather'},lv:{atk:10+lv*5,tough:8+lv*5,dod:8+lv*2},pack:[{id:'coin',n:6+lv*4}]}))}
  if(den)for(let i=0;i<T.dogs;i++)units.push(mk({team:'w',kind:'dog',name:'野犬',color:'#8a6a48',base:22,natural:BITE,spd:2.7,aggroR:4,leash:8,pack:[{id:'hide',n:1},{id:'meat',n:1}],
    lv:{tough:1,atk:2,dod:5},x:den.x+R(-1.2,1.2),y:den.y+R(-1.2,1.2),home:{x:den.x,y:den.y}}));
  return{units,piles,props,ores,beds:[],alerted:false,cleared:false,visited:false};
}
for(const id of Object.keys(REGIONS))areaStates[id]=genRegion(id);
ground=groundFor(activeArea);
function captureArea(){Object.assign(areaStates[activeArea],{units:[...units],piles:[...piles],alerted,cleared,pausedAt:simT})}
function activateArea(id){
  activeArea=id;const a=areaStates[id];a.visited=true;
  for(const p of a.piles)if(!p.permanent)p.t+=Math.max(0,simT-(a.pausedAt??simT));a.pausedAt=simT;
  units.splice(0,units.length,...a.units);piles=[...a.piles];props.splice(0,props.length,...a.props);ORES.splice(0,ORES.length,...a.ores);BEDS.splice(0,BEDS.length,...a.beds);ground=groundFor(id);alerted=a.alerted;cleared=a.cleared;
}
// Light swap used by the background stepper: no visited flag, no pile-age shift.
function swapIn(id){const a=areaStates[id];activeArea=id;units.splice(0,units.length,...a.units);piles=[...a.piles];props.splice(0,props.length,...a.props);ORES.splice(0,ORES.length,...a.ores);BEDS.splice(0,BEDS.length,...a.beds);alerted=a.alerted;cleared=a.cleared}
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
    {label:'打開地圖',sub:'睇所有區域、路線同隊伍位置',fn:openWorldMap},
    {label:'世情報／傳聞',sub:'人物由開局已經存在，冇章節先後限制',fn:openJournal},
    ...(pendingTravel?[{label:'取消出發',fn:cancelTravel}]:[]),
    ...Object.keys(AREAS).filter(id=>id!==activeArea&&areaStates[id].units.some(u=>u.team==='a'&&!u.dead)).map(id=>({label:`切換留守隊 · ${AREAS[id].name}`,sub:'只切換控制地區；出征隊留喺原位',fn:()=>switchReserve(id)})),
    ...(knownLandmarks().length?[{label:`已發現地點 · ${knownLandmarks().length}`,sub:'查看已記錄嘅路牌、礦脈同工房位置',fn:()=>landmarkMenu(sx,sy)}]:[]),
    ...(!hasFog()&&ORES.some(fogKnown)?[{label:activeArea==='village'?'查看西面銅礦':'查看北面鐵礦',sub:'移動鏡頭到已發現礦脈，再點礦石落採礦指令',fn:()=>{const ore=ORES.find(fogKnown);if(ore){cam.follow=null;centerOn(ore.x,ore.y);toast(`點礦石就可以採${ITEMS[ore.ore].name}，揹緊人嘅隊友做唔到`)}}}]:[])
  ]);
}
function landmarkMenu(sx,sy){
  showMenu(sx,sy,'已發現地點 · 只查看位置',[
    ...knownLandmarks().map(p=>({label:p.name,sub:'敵情同物資要接近確認',fn:()=>{cam.follow=null;centerOn(p.x,p.y);toast(`查看已記錄地點：${p.name}`)}}))
  ]);
}
function packAreaUnit(u){
  return {id:u.id,team:u.team,kind:u.kind,name:u.name,role:u.role,color:u.color,base:u.base,x:u.x,y:u.y,p:u.p,sk:u.sk,eq:u.eq,pack:u.pack,bounty:u.bounty,down:u.down,dead:u.dead,bleed:u.bleed,rules:u.rules,home:u.home,aggroR:u.aggroR,leash:u.leash,food:u.food,starvation:u.starvation,kitUse:u.kitUse,spd:u.spd,face:u.face,gid:u.gid,idx:u.idx,dir:u.dir,waitT:u.waitT,retreating:u.retreating,job:u.job,captive:u.captive,tries:u.tries,pursuitId:u.pursuitId,carryId:u.carry?u.carry.id:null,leaderId:u.leader?u.leader.id:null};
}
function packAreas(){captureArea();return Object.fromEntries(Object.entries(areaStates).map(([id,a])=>[id,{units:a.units.map(packAreaUnit),piles:a.piles,alerted:a.alerted,cleared:a.cleared,pausedAt:a.pausedAt,visited:!!a.visited,trees:a.props.filter(p=>p.tree&&p.wood!=null&&p.wood<3).map(p=>({x:p.x,y:p.y,w:p.wood,left:p.wood===0?Math.max(0,240-(simT-p.cut)):0})),built:a.props.filter(p=>p.built).map(p=>({k:p.built,x:p.x,y:p.y,occ:p.occ?p.occ.id:null,...(p.sown!=null?{left:fieldLeft(p)}:{})}))}]))}
function restoreAreas(saved,id){
  for(const key of Object.keys(AREAS)){
    const a=saved[key];if(!a&&(key==='forge'||AREAS[key].gen))continue; // Pre-forge saves keep their existing regions and receive the new region once.
    if(!a||!Array.isArray(a.units)||!Array.isArray(a.piles))throw Error('區域存檔不完整');
    const byId=new Map(),restored=a.units.map(o=>{
      const npc=key==='village'?(o.role==='trader'?TRADER:o.role==='inn'?INNKEEPER:o.team==='g'&&!o.kind?GUARD:null):null;
      const u=Object.assign(npc||{},mk(o),{p:o.p,sk:o.sk,food:o.food==null?100:o.food});if(u.kind==='dog')u.natural=BITE;
      if(u.team==='a'&&!u.rules)u.rules={flee:true,rescue:false,fight:true};byId.set(u.id,u);return u;
    });
    a.units.forEach((o,i)=>{const u=restored[i];if(o.carryId&&byId.has(o.carryId)){u.carry=byId.get(o.carryId);u.carry.carriedBy=u}if(o.leaderId)u.leader=byId.get(o.leaderId)});
    Object.assign(areaStates[key],{units:restored,piles:a.piles,alerted:!!a.alerted,cleared:!!a.cleared,pausedAt:a.pausedAt,visited:a.visited??(key!=='forge'&&!AREAS[key].gen)});
    areaStates[key].props=areaStates[key].props.filter(p=>!p.built);areaStates[key].beds=(areaStates[key].beds||[]).filter(b=>!b.built);
    for(const c of a.trees||[]){const t=areaStates[key].props.find(p=>p.tree&&Math.abs(p.x-c.x)<1e-6&&Math.abs(p.y-c.y)<1e-6);if(t){t.wood=c.w;if(c.w===0)t.cut=simT-(240-c.left)}}
    for(const b of a.built||[]){const p=addBuilt(key,b.k,b.x,b.y,true);if(p&&b.occ!=null&&byId.get(b.occ))p.occ=byId.get(b.occ);if(p&&b.k==='field'&&b.left!=null)p.sown=simT-(FIELD_SEC-b.left)}
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

// World map (read-only): areas as nodes, links as roads, stronghold control, '？' for unvisited.
function drawWorldMap(cv=$('#worldMap'),h=240){
  if(!cv)return;const w=cv.width=cv.clientWidth||300;cv.height=h;const c=cv.getContext('2d'),P=id=>[AREAS[id].map.x*w,AREAS[id].map.y*h];
  c.clearRect(0,0,w,h);c.lineWidth=2;c.strokeStyle='#8a7a5c';
  for(const [id,a] of Object.entries(AREAS))for(const l of a.links)if(id<l){const [x1,y1]=P(id),[x2,y2]=P(l);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
  c.textAlign='center';
  for(const [id,a] of Object.entries(AREAS)){
    const [x,y]=P(id),seen=areaStates[id].visited,here=id===activeArea,squad=areaUnits(id).filter(u=>u.team==='a'&&!u.dead).length;
    c.fillStyle=seen?'#3b3226':'#2a2620';c.strokeStyle=here?'#f4d28d':'#8a7a5c';c.lineWidth=here?3:1.5;
    c.beginPath();c.arc(x,y,22,0,7);c.fill();c.stroke();
    c.fillStyle=seen?'#e5d5a7':'#8a7a5c';c.font='bold 16px sans-serif';c.fillText(seen?(here?'●':squad?'◆':'·'):'？',x,y+6);
    c.font='11px sans-serif';c.fillText(seen?a.name:'未探索',x,y+38);
    if(squad){c.fillStyle=here?'#f4d28d':'#a9c6e0';c.fillText(`${here?'主隊':'留守'} ${squad} 人`,x,y+52)}
    if(caravanJourney.area===id&&seen){c.fillStyle='#e8c79a';c.fillText('遊商',x+30,y-14)}
    if(seen)OUTPOSTS.filter(d=>d.area===id).forEach((d,i)=>{const o=campaign.outposts[d.id];c.fillStyle=o.owner?FACTIONS[o.owner].color:'#888';c.fillText(`${d.name} · ${o.owner?FACTIONS[o.owner].name:'無主'}${raidActive(d)?' ⚔交戰中':''}`,x,y-30-i*13)});
  }
}
// path hint: next area to walk through to reach target
function mapRoute(to){const prev={[activeArea]:null},q=[activeArea];while(q.length){const a=q.shift();if(a===to)break;for(const l of AREAS[a].links)if(!(l in prev)){prev[l]=a;q.push(l)}}
  if(!(to in prev))return null;const path=[];for(let a=to;a;a=prev[a])path.unshift(a);return path}
const mapSheet=$('#mapSheet');
function openWorldMap(){
  if(anyModal()&&mapSheet.hidden){toast('先關閉其他視窗');return}
  sheet.hidden=charSheet.hidden=true;hideMenu();mapSheet.hidden=false;setModal(true);renderWorldMap();
}
function closeWorldMap(){mapSheet.hidden=true;setModal(false)}
function renderWorldMap(pick=null){
  const w=wantedOf();$('#mapTop').textContent=`${dayName()} · 通緝：武田 ${Math.round(w.takeda)}／上杉 ${Math.round(w.uesugi)}`;
  drawWorldMap($('#mapCv'),320);
  const box=$('#mapNodes');box.replaceChildren();
  for(const [id,a] of Object.entries(AREAS)){const b=document.createElement('button');b.className='mapNode'+(id===pick?' on':'');b.dataset.area=id;
    b.style.left=a.map.x*100+'%';b.style.top=a.map.y*320+'px';b.setAttribute('aria-label',areaStates[id].visited?a.name:'未探索區域');
    b.onclick=()=>renderWorldMap(id);box.appendChild(b)}
  const info=$('#mapInfo'),act=$('#mapActions');act.replaceChildren();
  const btn=(label,fn)=>{const b=document.createElement('button');b.className='wide';b.textContent=label;b.onclick=fn;act.appendChild(b)};
  if(!pick){info.textContent='點區域睇詳情。只可以直接去隔籬區域。';return}
  const a=AREAS[pick],seen=areaStates[pick].visited,name=seen?a.name:'未探索之地';
  if(pick===activeArea){info.textContent=`${a.name} · 主隊喺度。${a.hint||''}`;return}
  info.textContent=seen?`${a.name} · ${a.hint||''}`:'未探索 · 去到先知有咩。';
  if(AREAS[activeArea].links.includes(pick))btn(`出發：${name}（已選 ${travelParty().filter(u=>!u.carriedBy).length} 人）`,()=>{closeWorldMap();startTravel(pick)});
  else{const r=mapRoute(pick);info.textContent+=r?` 要經${r.slice(1,-1).map(x=>areaStates[x].visited?AREAS[x].name:'未探索之地').join('、')}先到。`:' 暫時冇路去。'}
  if(areaUnits(pick).some(u=>u.team==='a'&&!u.dead))btn(`切換留守隊 · ${name}`,()=>{closeWorldMap();switchReserve(pick)});
}
$('#bMap').onclick=openWorldMap;$('#bMapClose').onclick=closeWorldMap;
addEventListener('keydown',e=>{if(e.code==='Escape'&&!mapSheet.hidden){e.preventDefault();closeWorldMap()}});
