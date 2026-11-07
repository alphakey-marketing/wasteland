'use strict';
// A fictional border incident, using historical figures' familiar names.
const CAMPAIGN_VERSION=1;
const BORDER_SIDES={
  takeda:{name:'武田家',lord:'武田信玄',color:'#b95c48',promise:'護住武田糧道：得到巡邏隊支援及玉鋼打刀；上杉方視你為敵。'},
  uesugi:{name:'上杉家',lord:'上杉謙信',color:'#7396bd',promise:'替上杉截斷軍糧：得到巡邏隊支援及玉鋼胴丸；武田方視你為敵。'},
  village:{name:'青葉村',lord:null,color:'#8da66d',promise:'拒絕交出村民名冊：兩家都唔會派兵保護你；村店獲得補給，得到匠製機關肢。'}
};
const BORDER_STEPS={
  offer:['序章 · 川霧之間','到青葉宿屋接糧運委託。先補飯糰同藥包，點路牌出發；你隨時可以暫停落指令。'],
  grain:['一 · 山道失糧','荒寺山道外圍有失散糧袋（路牌東南面）。搜查並由可行動隊友帶返青葉宿屋；唔使清場。'],
  orders:['二 · 兩封軍令','廢棄鍛冶場外圍嘅破損運糧車有兩軍軍令。經荒寺路牌前往，搜查後帶返青葉宿屋。小心附近浪人。'],
  decision:['三 · 糧歸何處','兩封軍令都要求控制糧道。返宿屋決定協助武田、上杉，或者保住村民名冊；選擇會留下永久後果。'],
  escort:['四 · 帶人返屋企','機關師阿澄被困喺鍛冶場外圍（舊料箱西南面）。行近交談，帶佢經路牌返青葉宿屋；倒地就要揹。'],
  complete:['終章 · 霧散之後','地方故事已完成。可以同來訪名將交談、邀請阿澄入隊，或者繼續探索同製作。其他路線可用新遊戲體驗，記得先匯出存檔。'],
  loss:['終章 · 未歸之人','阿澄喺護送途中陣亡。糧道嘅抉擇仍然留下後果，但你失去咗佢嘅幫助。可以繼續生存，或者從備份重試。']
};
function freshCampaign(){return {v:CAMPAIGN_VERSION,stage:'offer',side:null,escort:false,leaderId:null,recruited:false,rep:{takeda:0,uesugi:0,village:0},log:[]}}
let campaign=freshCampaign(),campaignClock=0,journalChoice=null;
const journalSheet=$('#journalSheet');
function validateCampaign(c){
  if(c==null)return;
  if(c.v!==CAMPAIGN_VERSION||!Object.hasOwn(BORDER_STEPS,c.stage)||!(c.side===null||Object.hasOwn(BORDER_SIDES,c.side))||typeof c.escort!=='boolean'||typeof c.recruited!=='boolean'||!c.rep||!Array.isArray(c.log)||c.log.length>30)throw Error('行腳錄格式不完整');
  for(const side of Object.keys(BORDER_SIDES))if(!Number.isFinite(c.rep[side])||Math.abs(c.rep[side])>100)throw Error('勢力關係格式不完整');
  if(c.log.some(s=>typeof s!=='string'||s.length>500)||(['escort','complete','loss'].includes(c.stage)&&!c.side)||(['offer','grain','orders','decision'].includes(c.stage)&&c.side!==null))throw Error('行腳錄進度不一致');
  if(c.leaderId!=null&&!(typeof c.leaderId==='number'&&Number.isFinite(c.leaderId)||typeof c.leaderId==='string'&&c.leaderId.length<=160))throw Error('護送隊長格式不完整');
}
function packCampaign(){return JSON.parse(JSON.stringify(campaign))}
function restoreCampaign(c){validateCampaign(c);campaign=c?JSON.parse(JSON.stringify(c)):freshCampaign();campaignClock=0;ensureCampaignWorld();updateCampaignHUD()}
function borderUnits(){return [...units,...Object.entries(areaStates).filter(([id])=>id!==activeArea).flatMap(([,a])=>a.units)]}
function borderPiles(id){return id===activeArea?piles:areaStates[id].piles}
function borderFind(kind){return borderUnits().find(u=>u.kind===kind)}
function borderHasCargo(id){return borderUnits().some(u=>countItem(u,id)>0)||Object.keys(AREAS).some(a=>borderPiles(a).some(p=>p.pack.some(s=>s.id===id&&s.n>0)))}
function borderCache(id,name,x,y,item,area){
  if(borderHasCargo(item))return;
  let p=borderPiles(area).find(p=>p.id===id);
  if(!p){p=forgeCache(id,name,x,y,[]);borderPiles(area).push(p)}
  p.pack.push({id:item,n:1});
}
function ensureCampaignWorld(){
  if(campaign.stage==='grain')borderCache('border-grain','失散糧袋',9.4,9.6,'border_grain','temple');
  if(campaign.stage==='orders')borderCache('border-orders','破損運糧車',8.8,10,'border_orders','forge');
  if(campaign.stage==='escort'&&!borderFind('border_refugee')){
    const u=mk({id:'border-refugee',team:'c',kind:'border_refugee',role:'機關師',name:'阿澄',color:'#c0a67a',base:52,x:9,y:10.8,home:{x:9,y:10.8},lv:{aid:12,tough:5,str:4},pack:[{id:'medkit',n:2}],eq:{weapon:'knife',armor:'cloth'}});
    u.p.legs.hp=u.p.legs.max*.55;areaStates.forge.units.push(u);if(activeArea==='forge')units.push(u);
  }
  if(campaign.stage==='complete'&&campaign.side!=='village'&&!borderFind('border_lord')){
    const s=BORDER_SIDES[campaign.side],u=mk({id:'border-lord',team:'n',kind:'border_lord',role:'大名',name:s.lord,color:s.color,base:95,x:5,y:7.8,home:{x:5,y:7.8},eq:{weapon:'forged_blade',armor:'forged_armor'},lv:{atk:45,tough:45,dod:35}});
    areaStates.village.units.push(u);if(activeArea==='village')units.push(u);
  }
}
function borderLog(s){campaign.log.push(s);campaign.log=campaign.log.slice(-30)}
function borderActor(){return activeArea==='village'&&!INNKEEPER.down&&repTown>-30?nearest(allies().filter(u=>!u.down&&!u.dead&&dist(u,INNKEEPER)<=1.8&&!inDanger(u)),INNKEEPER):null}
function borderCargoActor(id){return activeArea==='village'?allies().find(u=>!u.down&&!u.dead&&dist(u,INNKEEPER)<=1.8&&!inDanger(u)&&countItem(u,id)>0):null}
function borderSave(){ensureCampaignWorld();renderJournal();updateCampaignHUD();save(false)}
function acceptBorderQuest(){
  if(campaign.stage!=='offer'||!borderActor()){toast('要由可行動隊友到青葉宿屋交談');return false}
  campaign.stage='grain';borderLog('宿屋托付尋回失散糧袋。兩軍正爭奪山道，村民只想捱過冬天。');borderSave();return true;
}
function turnBorderCargo(){
  const stage=campaign.stage,id=stage==='grain'?'border_grain':stage==='orders'?'border_orders':null;
  const u=id&&borderActor()&&borderCargoActor(id);if(!u){toast('帶住委託物品嘅隊友要親自到宿屋，並避開敵人');return false}
  useItem(u,id);
  if(stage==='grain'){campaign.stage='orders';money+=90;changeRep(5,'尋回糧袋');borderLog('糧袋送返村，獲得 90 文。袋內路引指向鍛冶場：武田信玄與上杉謙信嘅軍令竟然同時出現。')}
  else{campaign.stage='decision';money+=60;borderLog('帶回兩封軍令，獲得 60 文。武田要求糧道供軍；上杉要求截糧牽制對手。名冊上亦有青葉村流民嘅名字。')}
  borderSave();return true;
}
function chooseBorderSide(side){
  if(campaign.stage!=='decision'||!Object.hasOwn(BORDER_SIDES,side)||!borderActor())return false;
  campaign.side=side;campaign.stage='escort';campaign.rep=side==='village'?{takeda:-10,uesugi:-10,village:30}:{takeda:side==='takeda'?30:-30,uesugi:side==='uesugi'?30:-30,village:5};
  borderLog(`選擇${BORDER_SIDES[side].name}。${BORDER_SIDES[side].promise}宿屋請你最後帶返知道機關水車修法嘅阿澄。`);
  if(side!=='village'){
    const opposing=side==='takeda'?'uesugi':'takeda';
    for(const [team,key,x,y]of[['g',side,8.5,9],['e',opposing,15.5,12]]){
      const s=BORDER_SIDES[key],u=mk({id:`border-patrol-${key}`,team,kind:`border_patrol_${key}`,name:`${s.name}山道兵`,color:s.color,base:48,x,y,home:{x,y},aggroR:3,leash:4,eq:{weapon:'knife',armor:'leather'},lv:{atk:10,tough:10,dod:8},pack:[{id:'ration',n:1}]});
      areaStates.temple.units.push(u);
    }
  }
  journalChoice=null;borderSave();return true;
}
function beginBorderEscort(u,npc){
  if(campaign.stage!=='escort'||npc.kind!=='border_refugee'||npc.dead||npc.down||!units.includes(npc)||dist(u,npc)>1.8){toast('先行近阿澄；倒地時可以直接揹走');return false}
  if(!campaign.escort){campaign.escort=true;borderLog('阿澄答應同行：我只識修機關，唔識打仗；到路牌前記得等埋我。')}
  campaign.leaderId=u.id;
  borderSave();return true;
}
function finishBorderEscort(){
  const u=borderActor(),npc=borderFind('border_refugee');
  if(campaign.stage!=='escort'||!u||!npc||npc.dead||!units.includes(npc)||dist(npc,INNKEEPER)>3.2){toast('要將阿澄帶到青葉宿屋附近先可完成護送');return false}
  if(npc.carriedBy)drop(npc.carriedBy);campaign.escort=false;campaign.stage='complete';money+=180;
  const reward=campaign.side==='takeda'?'forged_blade':campaign.side==='uesugi'?'forged_armor':'p_forged';addItem(u,reward);
  const m=merchantState('village');m.stock.ration=(m.stock.ration||0)+2;m.stock.medkit=(m.stock.medkit||0)+1;
  changeRep(campaign.side==='village'?25:10,'護送機關師');
  borderLog(campaign.side==='village'?'你保住名冊，阿澄修好水車。村民分出少量餘糧；兩家暫未信任你，青葉村仍要靠自己。':`${BORDER_SIDES[campaign.side].lord}途經青葉村，接見護送隊。糧道納入${BORDER_SIDES[campaign.side].name}保護，同時成為另一方眼中嘅軍事目標。`);
  borderLog(`護送報酬：180 文、${ITEMS[reward].name}。村店增加飯糰 2、藥包 1；可邀請阿澄入隊。故事完結後世界繼續運作。`);
  borderSave();return true;
}
function recruitBorderRefugee(){
  const npc=borderFind('border_refugee'),u=borderActor();
  if(campaign.stage!=='complete'||campaign.recruited||!u||!npc||npc.dead||!units.includes(npc)||dist(npc,u)>3||allSquad().length>=8)return false;
  campaign.recruited=true;npc.team='a';npc.rules={flee:true,rescue:true,fight:false};npc.role='機關師／急救';npc.food=70;sel.add(npc);buildSquadUI();borderLog('阿澄加入隊伍。佢擅長急救，重傷會撤退，唔會主動衝鋒。');borderSave();return true;
}
function campaignTravelParty(party){
  const npc=borderFind('border_refugee');
  if(campaign.stage==='escort'&&campaign.escort&&npc&&!npc.down&&!npc.dead&&units.includes(npc)&&dist(npc,AREAS[activeArea].gate)<=2.4&&!party.includes(npc))return [...party,npc];
  return party;
}
function campaignEscortReady(party){
  if(campaign.stage!=='escort'||!campaign.escort)return true;
  const npc=borderFind('border_refugee');if(!npc||npc.dead||!units.includes(npc)||!party.some(u=>u.id===campaign.leaderId))return true;
  if(npc.carriedBy)return party.includes(npc.carriedBy);
  return !npc.down&&dist(npc,AREAS[activeArea].gate)<=2.4;
}
function tickCampaign(dt){
  if(campaign.stage==='escort'){
    const npc=borderFind('border_refugee');
    if(npc?.dead){campaign.stage='loss';campaign.escort=false;borderLog('阿澄冇能夠返到青葉村。村人為佢留低一盞燈，糧道嘅選擇已無法挽回。');save(false)}
    else if(npc&&!npc.down&&campaign.escort&&units.includes(npc)){
      const available=allies().filter(u=>!u.down&&!u.dead&&!u.carriedBy),leader=available.find(u=>u.id===campaign.leaderId)||nearest(available,npc);npc.state='跟隨護送隊';if(leader){campaign.leaderId=leader.id;if(dist(npc,leader)>1.25)step(npc,leader.x,leader.y,dt,.85)}
    }
  }
  campaignClock+=dt;if(campaignClock>=1){campaignClock=0;ensureCampaignWorld()}
}
function borderTalk(u,npc){
  if(npc.kind==='border_refugee'&&campaign.stage==='escort')beginBorderEscort(u,npc);
  if(npc.kind==='border_lord')toast(`${npc.name}：糧道已定，村民亦應該有活路。餘下嘅路，要由你哋自己行。`);
  openJournal();
}
function openJournal(){
  if(!journalSheet.hidden){renderJournal();return}
  if(anyModal()){toast('先關閉交易或搜查視窗');return}
  sheet.hidden=charSheet.hidden=true;hideMenu();journalChoice=null;journalSheet.hidden=false;setModal(true);ensureCampaignWorld();renderJournal();$('#journalTitle').tabIndex=-1;$('#journalTitle').focus();
}
function journalButton(label,fn,disabled=false){const b=document.createElement('button');b.className='wide';b.textContent=label;b.disabled=disabled;b.onclick=fn;$('#journalActions').appendChild(b)}
function renderJournal(){
  const [title,hint]=BORDER_STEPS[campaign.stage];$('#journalTitle').textContent=title;$('#journalObjective').textContent=hint;
  const actor=borderActor();$('#journalLocation').textContent=actor?'已到青葉宿屋，可以交談／交付。':'交付同抉擇要由可行動隊友親自到青葉宿屋；可按下方指令行過去。';
  $('#journalFactions').replaceChildren();for(const [key,s]of Object.entries(BORDER_SIDES)){const li=document.createElement('li');li.className='col';const b=document.createElement('b');b.textContent=`${s.name}${s.lord?' · '+s.lord:''} · 關係 ${campaign.rep[key]}`;const p=document.createElement('span');p.textContent=s.promise;li.append(b,p);$('#journalFactions').appendChild(li)}
  $('#journalLog').replaceChildren();for(const line of campaign.log){const p=document.createElement('p');p.className='note';p.textContent=line;$('#journalLog').appendChild(p)}
  $('#journalActions').replaceChildren();
  if(allSquad().every(u=>u.dead)){journalButton('全隊陣亡 · 可從戰術頁還原備份',()=>{journalSheet.hidden=true;setModal(false);sheet.hidden=false});return}
  if(!actor&&activeArea==='village')journalButton('叫已選隊友到宿屋交談',()=>{const u=issueOne({t:'talk',npc:INNKEEPER,act:'campaign'},INNKEEPER);if(u){journalSheet.hidden=true;setModal(false);toast(`${u.name} 去了解糧運委託`)}});
  if(campaign.stage==='offer')journalButton('接受尋糧委託',acceptBorderQuest,!actor);
  if(campaign.stage==='grain'||campaign.stage==='orders')journalButton(campaign.stage==='grain'?'交出糧袋 · 報酬 90 文':'交出兩封軍令 · 報酬 60 文',turnBorderCargo,!actor||!borderCargoActor(campaign.stage==='grain'?'border_grain':'border_orders'));
  if(campaign.stage==='decision'){
    if(journalChoice){const s=BORDER_SIDES[journalChoice];const p=document.createElement('p');p.className='note';p.textContent=`確認選擇${s.name}？${s.promise}呢個決定會存檔，唔可以喺同一局反覆領取其他路線報酬。`;$('#journalActions').appendChild(p);journalButton('確認呢個選擇',()=>chooseBorderSide(journalChoice),!actor);journalButton('再諗一諗',()=>{journalChoice=null;renderJournal()})}
    else for(const[key,s]of Object.entries(BORDER_SIDES))journalButton(`了解：${s.name}`,()=>{journalChoice=key;renderJournal()},!actor);
  }
  const npc=borderFind('border_refugee');
  if(campaign.stage==='escort'){
    if(campaign.escort)journalButton('叫阿澄原地等候（可先返村補給）',()=>{campaign.escort=false;borderSave()});
    if(npc&&!campaign.escort&&units.includes(npc)&&!npc.down&&!npc.dead)journalButton('行近阿澄，請佢同行',()=>{const u=issueOne({t:'talk',npc,act:'campaign'},npc);if(u){journalSheet.hidden=true;setModal(false)}},!fogVisible(npc));
    journalButton('交付護送 · 完成地方故事',finishBorderEscort,!actor||!npc||!units.includes(npc)||npc.dead||dist(npc,INNKEEPER)>3.2);
  }
  if(campaign.stage==='complete'&&!campaign.recruited)journalButton('邀請阿澄加入隊伍（最多 8 人）',recruitBorderRefugee,!actor||!npc||npc.dead||!units.includes(npc)||dist(npc,actor)>3||allSquad().length>=8);
  const lord=borderFind('border_lord');if(campaign.stage==='complete'&&lord&&units.includes(lord)&&!lord.dead)journalButton(`拜會${lord.name}`,()=>{const u=issueOne({t:'talk',npc:lord,act:'campaign'},lord);if(u){journalSheet.hidden=true;setModal(false);toast(`${lord.name}：亂世之中，守住一條糧道，亦係守住一方人。`)} });
}
let objectiveSig='';
function updateCampaignHUD(){const t=allSquad().every(u=>u.dead)?'全隊陣亡 · 點開行腳錄查看重試方法':`${BORDER_STEPS[campaign.stage][0]} · 行腳錄`;if(t!==objectiveSig){objectiveSig=t;$('#bObjective').textContent=t}}
$('#bObjective').onclick=openJournal;$('#bJournal').onclick=openJournal;
$('#bJournalClose').onclick=()=>{journalSheet.hidden=true;journalChoice=null;setModal(false);$('#bObjective').focus()};
addEventListener('keydown',e=>{if(e.code==='Escape'&&!journalSheet.hidden){e.preventDefault();$('#bJournalClose').click()}});
