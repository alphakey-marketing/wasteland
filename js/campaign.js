'use strict';
// Optional encounters and persistent world changes; no chapter prerequisites.
const CAMPAIGN_VERSION=3;
function freshOutposts(){return Object.fromEntries(OUTPOSTS.map(d=>[d.id,{phase:'held',owner:d.owner,left:0}]))}
function freshCampaign(){return {v:3,stage:'sandbox',side:null,escort:false,leaderId:null,recruited:false,jobs:{grain:false,orders:false,rescue:false},rep:{takeda:0,uesugi:0,village:0},outposts:freshOutposts(),anger:{takeda:false,uesugi:false},log:[]}}
let campaign=freshCampaign(),campaignClock=0;
const journalSheet=$('#journalSheet');
function validateCampaign(c){
  if(c==null)return;
  const old=['offer','grain','orders','decision','escort','complete','loss'];
  if(![1,2,3].includes(c.v)||!(c.v===1?old.includes(c.stage):c.stage==='sandbox')||!(c.side===null||Object.hasOwn(FACTIONS,c.side))||typeof c.escort!=='boolean'||typeof c.recruited!=='boolean'||!c.rep||!Array.isArray(c.log)||c.log.length>30)throw Error('世情報格式不完整');
  if(c.wanted!=null&&['takeda','uesugi'].some(k=>!Number.isFinite(c.wanted[k])||c.wanted[k]<0||c.wanted[k]>1e5))throw Error('懸賞格式不完整');
  for(const side of Object.keys(FACTIONS))if(!Number.isFinite(c.rep[side])||Math.abs(c.rep[side])>100)throw Error('勢力關係格式不完整');
  if(c.log.some(s=>typeof s!=='string'||s.length>500))throw Error('記錄格式不完整');
  if(c.leaderId!=null&&!(typeof c.leaderId==='number'&&Number.isFinite(c.leaderId)||typeof c.leaderId==='string'&&c.leaderId.length<=160))throw Error('護送隊長格式不完整');
  if(c.v===1){if((['escort','complete','loss'].includes(c.stage)&&!c.side)||(['offer','grain','orders','decision'].includes(c.stage)&&c.side!==null))throw Error('舊進度不一致');return}
  if(!c.jobs||['grain','orders','rescue'].some(k=>typeof c.jobs[k]!=='boolean'))throw Error('關所狀態不完整');
  if(c.v===2){validateOutpost(c.outpost,OUTPOSTS[0]);validateAnger(c.outpost.anger);return}
  if(!c.outposts||typeof c.outposts!=='object')throw Error('據點狀態不完整');
  for(const d of OUTPOSTS)validateOutpost(c.outposts[d.id],d);
  validateAnger(c.anger);
}
function validateOutpost(o,def){
  const owners={held:def.owner,vacant:null,occupied:def.successor,ruined:null};
  if(!o||!Object.hasOwn(owners,o.phase)||o.owner!==owners[o.phase]||!Number.isFinite(o.left)||o.left<0||o.left>def.occupation||(o.phase!=='vacant'&&o.left!==0))throw Error('關所狀態不完整');
}
function validateAnger(a){if(!a||['takeda','uesugi'].some(k=>typeof a[k]!=='boolean'))throw Error('關所狀態不完整')}
function packCampaign(){return JSON.parse(JSON.stringify(campaign))}
function restoreCampaign(c){
  validateCampaign(c);campaign=c?JSON.parse(JSON.stringify(c)):freshCampaign();
  if(c?.v===1){campaign={...freshCampaign(),side:c.side,escort:c.stage==='escort'&&c.escort,leaderId:c.leaderId,recruited:c.recruited,rep:c.rep,log:c.log.slice(),jobs:{grain:['orders','decision','escort','complete','loss'].includes(c.stage),orders:['decision','escort','complete','loss'].includes(c.stage),rescue:c.stage==='complete'}};borderLog('章節限制已解除；原有物品、報酬同人物狀態保留。')}
  if(c?.v===2){const {outpost,...rest}=campaign;campaign={...rest,v:3,outposts:{...freshOutposts(),misaka:{phase:outpost.phase,owner:outpost.owner,left:outpost.left}},anger:{...outpost.anger}}}
  campaignClock=0;ensureCampaignWorld();updateCampaignHUD();
}
function borderUnits(){return [...units,...Object.entries(areaStates).filter(([id])=>id!==activeArea).flatMap(([,a])=>a.units)]}
function borderPiles(id){return id===activeArea?piles:areaStates[id].piles}
function borderFind(kind){return borderUnits().find(u=>u.kind===kind)}
function borderHasCargo(id){return borderUnits().some(u=>countItem(u,id)>0)||Object.keys(AREAS).some(a=>borderPiles(a).some(p=>p.pack.some(s=>s.id===id&&s.n>0)))}
function borderCache(id,name,x,y,item,area){
  if(borderHasCargo(item))return;
  let p=borderPiles(area).find(p=>p.id===id);if(!p){p=forgeCache(id,name,x,y,[]);borderPiles(area).push(p)}p.pack.push({id:item,n:1});
}
function borderSpawn(area,o){const u=mk(o);areaStates[area].units.push(u);if(activeArea===area)units.push(u);return u}
function outpostHostile(a,b){
  const sa=outpostSide(a),sb=outpostSide(b);if(!sa&&!sb)return null;
  if(sa&&sb)return factionRel(sa,sb)==='enemy';
  const other=sa?b:a,side=sa||sb;
  return other.team==='a'?campaign.anger[side]:['e','w'].includes(other.team);
}
function seedOutpost(def,side){
  for(const [i,role]of ['commander','soldier'].entries()){
    const kind=outpostKind(def,side,role);if(borderFind(kind))continue;
    borderSpawn(def.area,{id:kind,kind,team:'g',name:role==='commander'?def.commanders[side]:`${FACTIONS[side].name}${def.name.slice(-2)}兵`,color:FACTIONS[side].color,base:i?42:65,x:def.x+i*.9,y:def.y+1+i,home:{x:def.x,y:def.y+1},aggroR:3,leash:4,eq:{weapon:i?'knife':'machete',armor:'leather'},lv:{atk:i?9:15,tough:i?9:15,dod:9},pack:[{id:'ration',n:1}]});
  }
}
function patrolRoute(u){
  if(u.route)return u.route;
  const c=CAMPS.find(c=>c.side===outpostSide(u)),d=OUTPOSTS.find(d=>d.area===c.area),mx=(c.x+d.x)/2,my=(c.y+d.y)/2;
  return u.route=[{x:c.x,y:c.y+2.6},{x:mx+1,y:my+2},{x:d.x,y:d.y+2.4},{x:mx-1,y:my+4}];
}
// Picked guards and patrols are much weaker than the lord's own guard, so a patrol cannot wipe out a camp.
function seedCamp(c){
  const s=FACTIONS[c.side],area=c.area;
  [[-1.6,1.6],[1.6,1.6]].forEach(([dx,dy],i)=>{const kind=`camp_guard_${c.side}_${i}`;if(borderFind(kind))return;
    borderSpawn(area,{id:kind,kind,team:'g',name:`${s.name}親兵`,color:s.color,base:82,x:c.x+dx,y:c.y+dy,home:{x:c.x+dx,y:c.y+dy},aggroR:4,leash:5,eq:{weapon:'forged_blade',armor:'forged_armor'},lv:{atk:28,tough:28,dod:20},pack:[{id:'ration',n:1}]})});
}
let patrolWait={};
function seedPatrols(c){
  const alive=borderUnits().filter(u=>u.kind?.startsWith(`patrol_${c.side}_`)&&!u.dead&&!u.down).length;
  if(alive>=2||(patrolWait[c.side]||0)>campaignClockTotal)return;
  const s=FACTIONS[c.side],kind=`patrol_${c.side}_${Math.floor(campaignClockTotal)}_${alive}`;
  borderSpawn(c.area,{id:kind,kind,team:'g',name:`${s.name}巡邏兵`,color:s.color,base:48,x:c.x,y:c.y+2.6,home:{x:c.x,y:c.y+2.6},aggroR:4,leash:7,eq:{weapon:alive?'knife':'machete',armor:'leather'},lv:{atk:10,tough:10,dod:8},pack:[{id:'ration',n:1}]});
  patrolWait[c.side]=campaignClockTotal+(alive?0:90);
}
let campaignClockTotal=0,raidTimer={};
const raiders=def=>borderUnits().filter(u=>u.kind?.startsWith('raid_')&&u.kind.includes(`_${def.id}_`)&&!u.dead&&!u.down);
const raidActive=def=>raiders(def).length>0;
function tickRaids(dt){
  for(const def of OUTPOSTS){
    const o=campaign.outposts[def.id];if(activeArea!==def.area||!o.owner||raidActive(def))continue;
    raidTimer[def.id]=(raidTimer[def.id]??rand(100,160))-dt;if(raidTimer[def.id]>0)continue;
    raidTimer[def.id]=rand(200,300);
    const rival=Object.keys(FACTIONS).find(k=>factionRel(o.owner,k)==='enemy'),camp=CAMPS.find(c=>c.side===rival);if(!rival||!camp)continue;
    const from=camp.area===def.area?{x:camp.x,y:camp.y+2.6}:arrivalPoint(def.area,camp.area),s=FACTIONS[rival];
    for(let i=0;i<4;i++){const kind=`raid_${rival}_${def.id}_${Math.floor(simT)}_${i}`;
      borderSpawn(def.area,{id:kind,kind,team:'g',name:`${s.name}${i?'先鋒':'隊長'}`,color:s.color,base:i?55:68,x:from.x+i*.7,y:from.y+(i%2)*.7,home:{x:def.x,y:def.y+1.4},aggroR:5,leash:7,eq:{weapon:'machete',armor:i?'leather':'forged_armor'},lv:{atk:i?16:22,tough:i?16:22,dod:i?11:14},pack:[{id:'ration',n:1}]})}
    borderLog(`${s.name}部隊攻向${def.name}，${FACTIONS[o.owner].name}守軍迎戰。`);toast(`${s.name}部隊進攻${def.name}！`);
  }
}
function ensureCampaignWorld(){
  // cargo is just goods now: seeded once, then free to sell, keep or drop
  campaign.escort=false;
  if(!campaign.jobs.grain){borderCache('border-grain','失散糧袋',9.4,9.6,'border_grain','temple');campaign.jobs.grain=true}
  if(!campaign.jobs.orders){borderCache('border-orders','破損運糧車',8.8,10,'border_orders','forge');campaign.jobs.orders=true}
  if(!borderFind('border_refugee')){const u=borderSpawn('forge',{id:'border-refugee',team:'c',kind:'border_refugee',role:'機關師',name:'阿澄',color:'#c0a67a',base:52,x:9,y:10.8,home:{x:9,y:10.8},lv:{aid:12,tough:5,str:4},pack:[{id:'medkit',n:2}],eq:{weapon:'knife',armor:'cloth'}});u.p.legs.hp=u.p.legs.max*.55}
  const old=borderFind('border_lord');if(old)old.kind=`border_lord_${campaign.side==='uesugi'?'uesugi':'takeda'}`;
  for(const [side,area]of [['takeda','temple'],['uesugi','forge']])if(!borderFind(`border_lord_${side}`)){
    const s=FACTIONS[side];borderSpawn(area,{id:`border-lord-${side}`,team:'n',kind:`border_lord_${side}`,role:'大名',name:s.lord,color:s.color,base:95,x:24,y:3.6,home:{x:24,y:3.6},aggroR:4,leash:5,eq:{weapon:'forged_blade',armor:'forged_armor'},lv:{atk:45,tough:45,dod:35}});
  }
  for(const side of ['takeda','uesugi']){const l=borderFind(`border_lord_${side}`);if(l&&!l.aggroR)Object.assign(l,{aggroR:4,leash:5})}
  for(const c of CAMPS){seedCamp(c);seedPatrols(c)}
  for(const def of OUTPOSTS){
    const ps=activeArea===def.area?props:areaStates[def.area].props,o=campaign.outposts[def.id];
    if(!ps.some(p=>p.outpost&&p.x===def.x&&p.y===def.y))ps.push({x:def.x,y:def.y,s:1.3,h:30,c:[125,104,76],house:1,outpost:def.id});
    if(o.phase==='held'||o.phase==='occupied')seedOutpost(def,o.owner);
  }
}
function outpostText(def){const o=campaign.outposts[def.id];return o.owner?`${FACTIONS[o.owner].name}控制`:(o.phase==='vacant'?'守將失守・無主':'兩軍撤離・荒廢')}
function tickOutpost(dt){for(const def of OUTPOSTS)tickOneOutpost(def,campaign.outposts[def.id],dt)}
function tickOneOutpost(def,o,dt){
  if(o.owner){const leader=borderFind(outpostKind(def,o.owner,'commander')),captured=leader?.captive||leader?.down&&leader.carriedBy?.team==='a'&&(!units.includes(leader)||activeArea!==def.area||dist(leader,def)>7);
    if(leader&&(leader.dead||captured)){const first=o.phase==='held',from=FACTIONS[def.owner].name,to=FACTIONS[def.successor].name;o.phase=first?'vacant':'ruined';o.owner=null;o.left=first?def.occupation:0;borderLog(first?`${def.name}守將失守，${from}控制瓦解。附近${to}部隊開始進駐。`:`${to}守將亦已失守。${def.name}荒廢，兩軍殘兵仍會留喺原地。`);save(false)}
  }else if(o.phase==='vacant'&&activeArea===def.area){
    o.left=Math.max(0,o.left-dt);if(o.left===0){o.phase='occupied';o.owner=def.successor;seedOutpost(def,def.successor);borderLog(`${FACTIONS[def.successor].name}部隊接管${def.name}，與殘留${FACTIONS[def.owner].name}兵交戰。`);save(false)}
  }
}
function outpostMenu(sx,sy,def,target){
  const o=campaign.outposts[def.id],leader=target||o.owner&&borderFind(outpostKind(def,o.owner,'commander')),opts=[{label:'查看據點情報',sub:'守將陣亡，或被揹離據點，會令控制權改變；打暈並不足夠',fn:openJournal}];
  if(leader&&!leader.down&&!leader.dead&&units.includes(leader))opts.push({label:`交談：${leader.name}`,fn:()=>issueOne({t:'talk',npc:leader,act:'campaign'},leader)},{label:'攻擊據點部隊',sub:'會令該勢力所有據點敵對，其他勢力同青葉村守衛仍然中立',fn:()=>issue(()=>({t:'attack',u:leader}))});
  showMenu(sx,sy,`${def.name} · ${outpostText(def)}`,opts);
}
function borderLog(s){campaign.log.push(s);campaign.log=campaign.log.slice(-30)}
function borderSave(){ensureCampaignWorld();renderJournal();updateCampaignHUD();save(false)}
// Free recruit: talk to the stranded machinist and she joins you if there is room.
function recruitBorderRefugee(u,npc){
  npc=npc||borderFind('border_refugee');
  if(!npc||campaign.recruited||npc.dead||!units.includes(npc)||npc.team==='a'){return false}
  if(allSquad().length>=8){toast('隊伍已滿（最多 8 人）');return false}
  if(u&&dist(u,npc)>2.4){toast('先行近阿澄');return false}
  campaign.recruited=true;campaign.jobs.rescue=true;npc.team='a';npc.rules={flee:true,rescue:true,fight:false};npc.role='機關師／急救';npc.food=Math.max(npc.food||0,70);sel.add(npc);buildSquadUI();
  borderLog('阿澄加入隊伍，擅長急救，重傷會撤退。');toast('阿澄加入隊伍');save(false);return true;
}
function campaignTravelParty(party,gate=AREAS[activeArea].gate){const npc=borderFind('border_refugee');return campaign.escort&&npc&&!npc.down&&!npc.dead&&units.includes(npc)&&dist(npc,gate)<=2.4&&!party.includes(npc)?[...party,npc]:party}
function campaignEscortReady(party,gate=AREAS[activeArea].gate){
  if(!campaign.escort)return true;const npc=borderFind('border_refugee');if(!npc||npc.dead||!units.includes(npc)||!party.some(u=>u.id===campaign.leaderId))return true;
  return npc.carriedBy?party.includes(npc.carriedBy):!npc.down&&dist(npc,gate)<=2.4;
}
function tickCampaign(dt){
  tickOutpost(dt);tickRaids(dt);tickWanted(dt);tickLife(dt);campaignClockTotal+=dt;campaignClock+=dt;if(campaignClock>=1){campaignClock=0;ensureCampaignWorld()}
}
function borderTalk(u,npc){
  if(npc.kind==='border_refugee'){if(recruitBorderRefugee(u,npc))return}
  else if(outpostSide(npc))toast(`${npc.name}：此處由${FACTIONS[outpostSide(npc)].name}駐守。`);
  else toast(`${npc.name}：亂世之中，去留由你；山道各處都有自己嘅局勢。`);
  openJournal();
}
function openJournal(){
  if(!journalSheet.hidden){renderJournal();return}if(anyModal()){toast('先關閉交易或搜查視窗');return}
  sheet.hidden=charSheet.hidden=true;hideMenu();journalSheet.hidden=false;setModal(true);ensureCampaignWorld();renderJournal();$('#journalTitle').tabIndex=-1;$('#journalTitle').focus();
}
function journalButton(label,fn,disabled=false){const b=document.createElement('button');b.className='wide';b.textContent=label;b.disabled=disabled;b.onclick=fn;$('#journalActions').appendChild(b)}
function renderJournal(){
  $('#journalTitle').textContent='世情報 · 局勢傳聞';$('#journalObjective').textContent=`${dayName()} · ${OUTPOSTS.map(d=>`${d.name}：${outpostText(d)}`).join('；')}。守將打暈後仍可能醒返；陣亡或被你揹離據點先會失守。失守後，繼承勢力約 45 秒後進駐（只計該區活動時間）。`;
  $('#journalLocation').textContent=`傳聞：武田信玄喺荒寺東北；上杉謙信喺鍛冶場東北；金屋寨喺鍛冶場深處，由上杉駐守；鍛冶場外圍有個受傷嘅機關師。冇任務，帶住貨物去邊度賣、幫邊個、打邊個，由你決定。青葉村聲望：${repTown>=30?'友好':repTown<=-30?'敵視':'普通'}（${Math.round(repTown)}）。`;
  drawWorldMap();$('#journalFactions').replaceChildren();for(const [key,s]of Object.entries(FACTIONS)){const li=document.createElement('li'),held=OUTPOSTS.filter(d=>campaign.outposts[d.id].owner===key).length,foes=Object.keys(FACTIONS).filter(k=>factionRel(key,k)==='enemy').map(k=>FACTIONS[k].name);li.className='col';li.textContent=`${s.name}${s.lord?' · '+s.lord:''} · 關係 ${campaign.rep[key]}${SIDES.includes(key)?wantedText(key):''}${OUTPOSTS.some(d=>d.owner===key||d.successor===key)?` · 據點 ${held}`:''}${foes.length?` · 敵對：${foes.join('、')}`:''}`;$('#journalFactions').appendChild(li)}
  $('#journalLog').replaceChildren();for(const line of campaign.log){const p=document.createElement('p');p.className='note';p.textContent=line;$('#journalLog').appendChild(p)}
  $('#journalActions').replaceChildren();
  if(allSquad().every(u=>u.dead)){journalButton('全隊陣亡 · 返回戰術頁還原備份',()=>{journalSheet.hidden=true;setModal(false);sheet.hidden=false});return}
}
let objectiveSig='';
function updateCampaignHUD(){const t=allSquad().every(u=>u.dead)?'全隊陣亡 · 點開世情報查看重試方法':`世情報 · ${OUTPOSTS.map(d=>`${d.name}：${outpostText(d)}`).join(' / ')}`;if(t!==objectiveSig){objectiveSig=t;$('#bObjective').textContent=t}}
$('#bObjective').onclick=openJournal;$('#bJournal').onclick=openJournal;
$('#bJournalClose').onclick=()=>{journalSheet.hidden=true;setModal(false);$('#bObjective').focus()};
addEventListener('keydown',e=>{if(e.code==='Escape'&&!journalSheet.hidden){e.preventDefault();$('#bJournalClose').click()}});
