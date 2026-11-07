'use strict';
// Optional encounters and persistent world changes; no chapter prerequisites.
const CAMPAIGN_VERSION=2;
const BORDER_SIDES={takeda:{name:'武田家',lord:'武田信玄',color:'#b95c48'},uesugi:{name:'上杉家',lord:'上杉謙信',color:'#7396bd'},village:{name:'青葉村',color:'#8da66d'}};
const OUTPOST={x:19,y:6,name:'霧坂關所',area:'temple',occupation:45};
function freshCampaign(){return {v:2,stage:'sandbox',side:null,escort:false,leaderId:null,recruited:false,jobs:{grain:false,orders:false,rescue:false},rep:{takeda:0,uesugi:0,village:0},outpost:{phase:'held',owner:'takeda',left:0,anger:{takeda:false,uesugi:false}},log:[]}}
let campaign=freshCampaign(),campaignClock=0;
const journalSheet=$('#journalSheet');
function validateCampaign(c){
  if(c==null)return;
  const old=['offer','grain','orders','decision','escort','complete','loss'];
  if(![1,2].includes(c.v)||!(c.v===1?old.includes(c.stage):c.stage==='sandbox')||!(c.side===null||Object.hasOwn(BORDER_SIDES,c.side))||typeof c.escort!=='boolean'||typeof c.recruited!=='boolean'||!c.rep||!Array.isArray(c.log)||c.log.length>30)throw Error('世情報格式不完整');
  for(const side of Object.keys(BORDER_SIDES))if(!Number.isFinite(c.rep[side])||Math.abs(c.rep[side])>100)throw Error('勢力關係格式不完整');
  if(c.log.some(s=>typeof s!=='string'||s.length>500))throw Error('記錄格式不完整');
  if(c.leaderId!=null&&!(typeof c.leaderId==='number'&&Number.isFinite(c.leaderId)||typeof c.leaderId==='string'&&c.leaderId.length<=160))throw Error('護送隊長格式不完整');
  if(c.v===1){if((['escort','complete','loss'].includes(c.stage)&&!c.side)||(['offer','grain','orders','decision'].includes(c.stage)&&c.side!==null))throw Error('舊進度不一致');return}
  const o=c.outpost,owners={held:'takeda',vacant:null,occupied:'uesugi',ruined:null};
  if(!c.jobs||['grain','orders','rescue'].some(k=>typeof c.jobs[k]!=='boolean')||!o||!Object.hasOwn(owners,o.phase)||o.owner!==owners[o.phase]||!Number.isFinite(o.left)||o.left<0||o.left>OUTPOST.occupation||(o.phase!=='vacant'&&o.left!==0)||!o.anger||['takeda','uesugi'].some(k=>typeof o.anger[k]!=='boolean'))throw Error('關所狀態不完整');
}
function packCampaign(){return JSON.parse(JSON.stringify(campaign))}
function restoreCampaign(c){
  validateCampaign(c);campaign=c?JSON.parse(JSON.stringify(c)):freshCampaign();
  if(c?.v===1){campaign={...freshCampaign(),side:c.side,escort:c.stage==='escort'&&c.escort,leaderId:c.leaderId,recruited:c.recruited,rep:c.rep,log:c.log.slice(),jobs:{grain:['orders','decision','escort','complete','loss'].includes(c.stage),orders:['decision','escort','complete','loss'].includes(c.stage),rescue:c.stage==='complete'}};borderLog('章節限制已解除；原有物品、報酬同人物狀態保留。')}
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
function outpostSide(u){return ['takeda','uesugi'].find(s=>u.kind?.startsWith(`outpost_${s}_`))||null}
function outpostHostile(a,b){
  const sa=outpostSide(a),sb=outpostSide(b);if(!sa&&!sb)return null;
  if(sa&&sb)return sa!==sb;
  const other=sa?b:a,side=sa||sb;
  return other.team==='a'?campaign.outpost.anger[side]:['e','w'].includes(other.team);
}
function seedOutpost(side){
  for(const [i,role]of ['commander','soldier'].entries()){
    const kind=`outpost_${side}_${role}`;if(borderFind(kind))continue;
    borderSpawn('temple',{id:kind,kind,team:'g',name:role==='commander'?(side==='takeda'?'武田守將・矢代重政':'上杉守將・村井景久'):`${BORDER_SIDES[side].name}關所兵`,color:BORDER_SIDES[side].color,base:i?42:65,x:OUTPOST.x+i*.9,y:OUTPOST.y+1+i,home:{x:OUTPOST.x,y:OUTPOST.y+1},aggroR:3,leash:4,eq:{weapon:i?'knife':'machete',armor:'leather'},lv:{atk:i?9:15,tough:i?9:15,dod:9},pack:[{id:'ration',n:1}]});
  }
}
function ensureCampaignWorld(){
  if(!campaign.jobs.grain)borderCache('border-grain','失散糧袋',9.4,9.6,'border_grain','temple');
  if(!campaign.jobs.orders)borderCache('border-orders','破損運糧車',8.8,10,'border_orders','forge');
  if(!borderFind('border_refugee')){const u=borderSpawn('forge',{id:'border-refugee',team:'c',kind:'border_refugee',role:'機關師',name:'阿澄',color:'#c0a67a',base:52,x:9,y:10.8,home:{x:9,y:10.8},lv:{aid:12,tough:5,str:4},pack:[{id:'medkit',n:2}],eq:{weapon:'knife',armor:'cloth'}});u.p.legs.hp=u.p.legs.max*.55}
  const old=borderFind('border_lord');if(old)old.kind=`border_lord_${campaign.side==='uesugi'?'uesugi':'takeda'}`;
  for(const [side,area]of [['takeda','temple'],['uesugi','forge']])if(!borderFind(`border_lord_${side}`)){
    const s=BORDER_SIDES[side];borderSpawn(area,{id:`border-lord-${side}`,team:'n',kind:`border_lord_${side}`,role:'大名',name:s.lord,color:s.color,base:95,x:24,y:4,home:{x:24,y:4},eq:{weapon:'forged_blade',armor:'forged_armor'},lv:{atk:45,tough:45,dod:35}});
  }
  const ps=activeArea==='temple'?props:areaStates.temple.props;
  if(!ps.some(p=>p.outpost))ps.push({x:OUTPOST.x,y:OUTPOST.y,s:1.3,h:30,c:[125,104,76],house:1,outpost:1});
  if(campaign.outpost.phase==='held')seedOutpost('takeda');
  if(campaign.outpost.phase==='occupied')seedOutpost('uesugi');
}
function outpostText(){const o=campaign.outpost;return o.owner?`${BORDER_SIDES[o.owner].name}控制`:(o.phase==='vacant'?'守將失守・無主':'兩軍撤離・荒廢')}
function tickOutpost(dt){
  const o=campaign.outpost;
  if(o.owner){const leader=borderFind(`outpost_${o.owner}_commander`),captured=leader?.down&&leader.carriedBy?.team==='a'&&(!units.includes(leader)||activeArea!=='temple'||dist(leader,OUTPOST)>7);
    if(leader&&(leader.dead||captured)){const first=o.phase==='held';o.phase=first?'vacant':'ruined';o.owner=null;o.left=first?OUTPOST.occupation:0;borderLog(first?'霧坂守將失守，武田控制瓦解。附近上杉部隊開始進駐。':'上杉守將亦已失守。霧坂關所荒廢，兩軍殘兵仍會留喺原地。');save(false)}
  }else if(o.phase==='vacant'&&activeArea==='temple'){
    o.left=Math.max(0,o.left-dt);if(o.left===0){o.phase='occupied';o.owner='uesugi';seedOutpost('uesugi');borderLog('上杉部隊接管霧坂關所，與殘留武田兵交戰。');save(false)}
  }
}
function outpostMenu(sx,sy,target){
  const o=campaign.outpost,leader=target||o.owner&&borderFind(`outpost_${o.owner}_commander`),opts=[{label:'查看關所情報',sub:'守將陣亡，或被揹離關所，會令控制權改變；打暈並不足夠',fn:openJournal}];
  if(leader&&!leader.down&&!leader.dead&&units.includes(leader))opts.push({label:`交談：${leader.name}`,fn:()=>issueOne({t:'talk',npc:leader,act:'campaign'},leader)},{label:'攻擊關所部隊',sub:'只影響所屬勢力，青葉村守衛仍然中立',fn:()=>issue(()=>({t:'attack',u:leader}))});
  showMenu(sx,sy,`${OUTPOST.name} · ${outpostText()}`,opts);
}
function borderLog(s){campaign.log.push(s);campaign.log=campaign.log.slice(-30)}
function borderActor(){return activeArea==='village'&&!INNKEEPER.down&&repTown>-30?nearest(allies().filter(u=>!u.down&&!u.dead&&dist(u,INNKEEPER)<=1.8&&!inDanger(u)),INNKEEPER):null}
function borderCargoActor(id){return activeArea==='village'?allies().find(u=>!u.down&&!u.dead&&dist(u,INNKEEPER)<=1.8&&!inDanger(u)&&countItem(u,id)>0):null}
function borderSave(){ensureCampaignWorld();renderJournal();updateCampaignHUD();save(false)}
function turnBorderCargo(id){
  const key=id==='border_grain'?'grain':id==='border_orders'?'orders':null,u=key&&!campaign.jobs[key]&&borderActor()&&borderCargoActor(id);
  if(!u){toast('帶住物品嘅隊友要親自到宿屋，並避開敵人');return false}
  useItem(u,id);campaign.jobs[key]=true;money+=key==='grain'?90:60;changeRep(5,'帶回物資');borderLog(key==='grain'?'糧袋送返村，獲得 90 文。':'兩封軍令交予宿屋，獲得 60 文。');borderSave();return true;
}
function beginBorderEscort(u,npc){
  if(campaign.jobs.rescue||npc.kind!=='border_refugee'||npc.dead||npc.down||!units.includes(npc)||dist(u,npc)>1.8){toast('先行近阿澄；倒地時可以直接揹起');return false}
  if(!campaign.escort){campaign.escort=true;borderLog('阿澄願意同行返青葉村；隨時可以叫佢停低等候。')}
  campaign.leaderId=u.id;borderSave();return true;
}
function finishBorderEscort(){
  const u=borderActor(),npc=borderFind('border_refugee');
  if(campaign.jobs.rescue||!u||!npc||npc.dead||!units.includes(npc)||dist(npc,INNKEEPER)>3.2){toast('將阿澄帶到青葉宿屋附近先可交付');return false}
  if(npc.carriedBy)drop(npc.carriedBy);campaign.escort=false;campaign.jobs.rescue=true;money+=180;changeRep(15,'救回機關師');borderLog('阿澄平安返村，獲得 180 文；可以邀請佢入隊。其他地方嘅人物同局勢照常存在。');borderSave();return true;
}
function recruitBorderRefugee(){
  const npc=borderFind('border_refugee'),u=borderActor();
  if(!campaign.jobs.rescue||campaign.recruited||!u||!npc||npc.dead||!units.includes(npc)||dist(npc,u)>3||allSquad().length>=8)return false;
  campaign.recruited=true;npc.team='a';npc.rules={flee:true,rescue:true,fight:false};npc.role='機關師／急救';npc.food=70;sel.add(npc);buildSquadUI();borderLog('阿澄加入隊伍，擅長急救，重傷會撤退。');borderSave();return true;
}
function campaignTravelParty(party){const npc=borderFind('border_refugee');return campaign.escort&&npc&&!npc.down&&!npc.dead&&units.includes(npc)&&dist(npc,AREAS[activeArea].gate)<=2.4&&!party.includes(npc)?[...party,npc]:party}
function campaignEscortReady(party){
  if(!campaign.escort)return true;const npc=borderFind('border_refugee');if(!npc||npc.dead||!units.includes(npc)||!party.some(u=>u.id===campaign.leaderId))return true;
  return npc.carriedBy?party.includes(npc.carriedBy):!npc.down&&dist(npc,AREAS[activeArea].gate)<=2.4;
}
function tickCampaign(dt){
  if(campaign.escort){const npc=borderFind('border_refugee');
    if(npc?.dead){campaign.escort=false;borderLog('阿澄陣亡；其他機會同地方仍可自由探索。');save(false)}
    else if(npc&&!npc.down&&units.includes(npc)){const available=allies().filter(u=>!u.down&&!u.dead&&!u.carriedBy),leader=available.find(u=>u.id===campaign.leaderId)||nearest(available,npc);npc.state='跟隨護送隊';if(leader){campaign.leaderId=leader.id;if(dist(npc,leader)>1.25)step(npc,leader.x,leader.y,dt,.85)}}
  }
  tickOutpost(dt);campaignClock+=dt;if(campaignClock>=1){campaignClock=0;ensureCampaignWorld()}
}
function borderTalk(u,npc){
  if(npc.kind==='border_refugee')beginBorderEscort(u,npc);
  else if(outpostSide(npc))toast(`${npc.name}：此處由${BORDER_SIDES[outpostSide(npc)].name}駐守。`);
  else toast(`${npc.name}：亂世之中，去留由你；山道各處都有自己嘅局勢。`);
  openJournal();
}
function openJournal(){
  if(!journalSheet.hidden){renderJournal();return}if(anyModal()){toast('先關閉交易或搜查視窗');return}
  sheet.hidden=charSheet.hidden=true;hideMenu();journalSheet.hidden=false;setModal(true);ensureCampaignWorld();renderJournal();$('#journalTitle').tabIndex=-1;$('#journalTitle').focus();
}
function journalButton(label,fn,disabled=false){const b=document.createElement('button');b.className='wide';b.textContent=label;b.disabled=disabled;b.onclick=fn;$('#journalActions').appendChild(b)}
function renderJournal(){
  $('#journalTitle').textContent='世情報 · 自由行腳';$('#journalObjective').textContent=`${OUTPOST.name}：${outpostText()}。守將打暈後仍可能醒返；陣亡或被你揹離關所先會失守。武田失守後，上杉約 45 秒後進駐（只計山道活動時間）。`;
  const actor=borderActor();$('#journalLocation').textContent='傳聞：武田信玄喺荒寺東北；上杉謙信喺鍛冶場東北；阿澄被困鍛冶場外圍。人物由開局已經存在，唔使先接任務。關所守將係原創人物。';
  $('#journalFactions').replaceChildren();for(const [key,s]of Object.entries(BORDER_SIDES)){const li=document.createElement('li');li.className='col';li.textContent=`${s.name}${s.lord?' · '+s.lord:''} · 關係 ${campaign.rep[key]}`;$('#journalFactions').appendChild(li)}
  $('#journalLog').replaceChildren();for(const line of campaign.log){const p=document.createElement('p');p.className='note';p.textContent=line;$('#journalLog').appendChild(p)}
  $('#journalActions').replaceChildren();
  if(allSquad().every(u=>u.dead)){journalButton('全隊陣亡 · 返回戰術頁還原備份',()=>{journalSheet.hidden=true;setModal(false);sheet.hidden=false});return}
  if(!actor&&activeArea==='village')journalButton('叫已選隊友到宿屋打聽',()=>{if(issueOne({t:'talk',npc:INNKEEPER,act:'campaign'},INNKEEPER)){$('#bJournalClose').click()}});
  for(const [key,id,label]of [['grain','border_grain','交出糧袋 · 報酬 90 文'],['orders','border_orders','交出兩封軍令 · 報酬 60 文']])if(!campaign.jobs[key])journalButton(label,()=>turnBorderCargo(id),!actor||!borderCargoActor(id));
  const npc=borderFind('border_refugee');
  if(!campaign.jobs.rescue&&npc&&!npc.dead){
    if(campaign.escort)journalButton('叫阿澄原地等候',()=>{campaign.escort=false;borderSave()});
    else if(units.includes(npc)&&!npc.down)journalButton('行近阿澄，請佢同行',()=>{if(issueOne({t:'talk',npc,act:'campaign'},npc))$('#bJournalClose').click()},!fogVisible(npc));
    journalButton('帶阿澄返宿屋 · 報酬 180 文',finishBorderEscort,!actor||!units.includes(npc)||dist(npc,INNKEEPER)>3.2);
  }
  if(campaign.jobs.rescue&&!campaign.recruited)journalButton('邀請阿澄加入隊伍（最多 8 人）',recruitBorderRefugee,!actor||!npc||npc.dead||!units.includes(npc)||dist(npc,actor)>3||allSquad().length>=8);
}
let objectiveSig='';
function updateCampaignHUD(){const t=allSquad().every(u=>u.dead)?'全隊陣亡 · 點開世情報查看重試方法':`世情報 · ${OUTPOST.name}：${outpostText()}`;if(t!==objectiveSig){objectiveSig=t;$('#bObjective').textContent=t}}
$('#bObjective').onclick=openJournal;$('#bJournal').onclick=openJournal;
$('#bJournalClose').onclick=()=>{journalSheet.hidden=true;setModal(false);$('#bObjective').focus()};
addEventListener('keydown',e=>{if(e.code==='Escape'&&!journalSheet.hidden){e.preventDefault();$('#bJournalClose').click()}});
