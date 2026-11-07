'use strict';
/* 商人、宿屋、足輕、頭像、角色卡、戰術頁、酒場 */
/* ---------- trader, inn & guard ---------- */
function innMenu(sx,sy){showMenu(sx,sy,'青葉宿屋 · 酒場',[
  {label:'打聽傳聞／世情報',sub:'人物位置、可做嘅事同關所局勢；自由選擇先後',fn:()=>{const v=issueOne({t:'talk',npc:INNKEEPER,act:'campaign'},INNKEEPER);if(v)toast(`${v.name} 去打聽傳聞`)}},
  {label:'租床瞓（每人 10 文）',sub:'瞓到傷醫好為止，好快過包紮',fn:()=>{
    const list=[...sel].filter(a=>!a.down&&!a.carry);if(!list.length){toast('先揀冇揹人嘅隊友');return}
    const taken=new Set(allies().map(a=>a.cmd[0]&&a.cmd[0].t==='sleep'?a.cmd[0].bed:null));let n=0;
    list.forEach(a=>{const b=BEDS.find(x=>!taken.has(x));if(!b)return;taken.add(b);a.cmd=[{t:'sleep',bed:b}];n++});
    toast(n<list.length?`得 ${BEDS.length} 張床，${n} 個人去瞓`:`${n} 個人去瞓覺`)}},
  {label:'睇下酒場有咩人請',fn:()=>{const v=issueOne({t:'talk',npc:INNKEEPER,act:'bar'},INNKEEPER);if(v)toast(`${v.name} 去酒場`)}},
  {label:'買飯糰同藥包',fn:()=>{const v=issueOne({t:'talk',npc:INNKEEPER,act:'shop'},INNKEEPER);if(v)toast(`${v.name} 去宿屋`)}}])}
function arriveTalk(u,npc,act){
  if(anyModal()){toast(`${u.name} 到咗`);return}
  if(act==='campaign'){if(npc===INNKEEPER)openJournal();else borderTalk(u,npc);return}
  if(npc===INNKEEPER){if(act==='bar')openBar(u);else openShop(u,'inn');return}
  if(npc.kind==='caravan'){if(caravanAngry){toast('遊商：強盜！我唔同你做生意');return}openShop(u,'caravan','caravan:'+npc.id);return}
  if(npc===TRADER){if(repTown<=-30){toast('商人：你哋係青葉村嘅敵人，我唔做你生意');return}openShop(u,'village');return}
  if(npc===GUARD){if(repTown<=-30){toast('足輕：滾！');return}const c=u.carry;
    if(c&&c.team==='e'&&c.bounty&&!c.dead){money+=c.bounty;float(u,`+${c.bounty} 文 賞金`,'#f0c45a',true);toast(`足輕收咗 ${c.name}，賞金 ${c.bounty} 文`);
      u.carry=null;c.carriedBy=null;units.splice(units.indexOf(c),1);changeRep(10,'交懸賞犯');return}
    if(c&&c.bounty&&c.dead){toast('足輕：死咗嘅唔收，要生擒先有賞金');return}
    if(c&&c.team==='e'){toast('足輕：呢個人冇懸賞');return}
    toast('足輕：有懸賞犯就揹過嚟，生擒先有錢')}
}
function anyModal(){return !shopSheet.hidden||!lootSheet.hidden||!barSheet.hidden||!$('#journalSheet').hidden}
function setModal(on){modal=on}

const shopSheet=$('#shopSheet'),shopList=$('#shopList');let shopUnit=null,shopTab='buy',shopVendor=null;
function openShop(u,kind,key=kind){shopUnit=u;shopVendor={...MERCHANTS[kind],kind,key};shopTab='buy';renderShop();shopSheet.hidden=false;setModal(true)}
function renderShop(){
  const u=shopUnit,m=merchantState(shopVendor.kind,shopVendor.key);$('#shopTitle').textContent=`${shopVendor.title} · 同${u.name}交易`;$('#shopWallet').textContent=money+' 文';
  $('#segBuy').setAttribute('aria-selected',shopTab==='buy');$('#segSell').setAttribute('aria-selected',shopTab==='sell');
  $('#segCraft').hidden=!shopVendor.craft;$('#segCraft').setAttribute('aria-selected',shopTab==='craft');
  $('#shopLoad').textContent=`${u.name} 負重 ${load(u)} / ${cap(u)} kg`;
  $('#shopFunds').textContent=`商人：${m.cash} 文`;
  $('#shopNote').textContent=`第 ${Math.floor(simT/ECONOMY_DAY)+1} 日 · 距下次補給 ${Math.ceil((ECONOMY_DAY-simT%ECONOMY_DAY)/60)} 分鐘遊戲時間；暫停唔計時`;
  if(shopTab==='craft'){
    $('#shopNote').textContent=`只用${u.name}背包材料；交工錢即時製成。荒寺得少量玉鋼，鍛冶場深處有新圖樣同零件；材料賣出前先睇配方。`;
    shopList.innerHTML=`<li class="col"><b>${economy.smithing?'荒寺鍛冶術 · 已解鎖全隊':'荒寺鍛冶術 · 未解鎖'}</b><span>${economy.smithing?'圖錄已交予工匠，配方永久保留':'到荒寺工匠藏箱尋找鍛冶圖錄，帶返嚟交予工匠'}</span>${!economy.smithing?`<button data-learn="1" ${!countItem(u,'smith_scroll')||smithReason(u,{needs:{},fee:0})?'disabled':''}>交出圖錄，解鎖進階配方</button>`:''}</li>`+
      `<li class="col"><b>鍛冶場機關術 · ${economy.forging?'已解鎖全隊':'未解鎖'}</b><span>經荒寺路牌去廢棄鍛冶場；圖樣同零件喺浪人守住嘅深處，唔使清場先可以搜箱。</span>${!economy.forging?`<button data-learn="forge" ${!countItem(u,'forge_scroll')||smithReason(u,{needs:{},fee:0})?'disabled':''}>交出機關圖樣</button>`:''}</li>`+
      RECIPES.map(r=>{const why=smithReason(u,r);return `<li class="col"><b>${ITEMS[r.id].name}${r.forge?' · 機關秘傳':r.advanced?' · 圖錄秘傳':''}</b><span>${desc(r.id)}</span><span>${Object.entries(r.needs).map(([id,n])=>`${ITEMS[id].name} ${countItem(u,id)}/${n}`).join(' · ')} · 工錢 ${r.fee} 文</span><div class="opts"><button data-recipe="${r.id}" ${why?'disabled':''}>${why||'委託製作'}</button></div></li>`}).join('');return;
  }
  if(shopTab==='buy'){
    shopList.innerHTML=(repTown>=30?'<li><span class="empty">青葉村當你係朋友：買嘢九折，賣嘢多一成</span></li>':'')+Object.entries(m.stock).map(([id,n])=>{const it=ITEMS[id],pr=buyPrice(id);return `<li><div class="nm"><b>${it.name} · 餘 ${n}</b><span>${desc(id)}</span></div><span class="price">${pr} 文</span><div class="btns"><button class="buy" data-buy="${id}" ${money<pr||!n?'disabled':''}>${n?'買':'售罄'}</button></div></li>`}).join('');
  }else{
    if(!u.pack.length){shopList.innerHTML='<li><span class="empty">背包係空嘅。打倒敵人去執嘢，或者去採礦。裝備緊嘅嘢要先喺角色卡卸低先賣得。</span></li>';return}
    shopList.innerHTML=u.pack.map((s,i)=>{const it=ITEMS[s.id];if(it.type==='quest')return `<li><div class="nm"><b>${it.name}</b><span>${desc(s.id)}</span></div><span>不可出售</span></li>`;const p=sellPrice(s.id),n=Math.min(s.n,Math.floor(m.cash/p));return `<li><div class="nm"><b>${it.name}${s.n>1?' ×'+s.n:''}</b><span>每件 ${p} 文 · 最多收 ${n} 件 · ${desc(s.id)}</span></div><div class="btns"><button data-sell="${i}" ${!n?'disabled':''}>${n?'賣 1':'商人唔夠錢'}</button>${s.n>1?`<button data-sellall="${i}" ${!n?'disabled':''}>賣 ${n} 件 +${p*n} 文</button>`:''}</div></li>`}).join('');
  }
}
shopList.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const u=shopUnit;
  const m=merchantState(shopVendor.kind,shopVendor.key);
  if(b.dataset.buy){const id=b.dataset.buy;if(buyFrom(u,m,id))toast(`買咗${ITEMS[id].name}，放咗入${u.name}背包`)}
  else if(b.dataset.sell)sellTo(u,m,+b.dataset.sell);
  else if(b.dataset.sellall){const i=+b.dataset.sellall;sellTo(u,m,i,u.pack[i]?.n||0)}
  else if(b.dataset.learn&&shopVendor.craft){const forge=b.dataset.learn==='forge';if(learnSmithing(u,forge))toast(forge?'已交出圖樣，全隊解鎖機關護胴':'已交出圖錄，全隊解鎖荒寺鍛冶術')}
  else if(b.dataset.recipe&&shopVendor.craft){if(commission(u,b.dataset.recipe))toast(`工匠製好${ITEMS[b.dataset.recipe].name}，放入${u.name}背包`)}
  renderShop();updatePortraits(true);save(false)});
$('#segBuy').addEventListener('click',()=>{shopTab='buy';renderShop()});
$('#segSell').addEventListener('click',()=>{shopTab='sell';renderShop()});
$('#segCraft').addEventListener('click',()=>{if(shopVendor.craft){shopTab='craft';renderShop()}});
$('#bShopClose').addEventListener('click',()=>{shopSheet.hidden=true;setModal(false)});

const lootSheet=$('#lootSheet'),lootList=$('#lootList');let lootUnit=null,lootBody=null;
let harvestArmed=false;
function openLoot(u,b){if(anyModal())return;lootUnit=u;lootBody=b;harvestArmed=false;renderLoot();lootSheet.hidden=false;setModal(true)}
function fatalHarvest(r){return lootBody.kind==='dog'&&!lootBody.dead&&(r.id==='hide'||r.id==='meat')}
function confirmHarvest(rows){if(!rows.some(fatalHarvest)||harvestArmed)return true;harvestArmed=true;renderLoot();toast('動物仍然生存；再按一次確認宰割，動物會死亡');return false}
function lootRows(b){const rows=[];if(b.eq.weapon)rows.push({slot:'weapon',id:b.eq.weapon});if(b.eq.armor)rows.push({slot:'armor',id:b.eq.armor});b.pack.forEach((s,i)=>rows.push({idx:i,id:s.id,n:s.n}));return rows}
function renderLoot(){
  const b=lootBody,u=lootUnit;
  if(b.pile&&!piles.includes(b))b.pack=[];
  $('#lootTitle').textContent=b.permanent?b.name:b.pile?'執起地上嘅嘢':`搜身 · ${b.name}${b.dead?'（屍體）':''}`;
  $('#lootSub').textContent=`${u.name} 負重 ${load(u)} / ${cap(u)} kg · 超重會行慢，銅幣直接入全隊錢包`;
  if(b.kind==='dog'&&!b.dead)$('#lootSub').textContent+=' · 宰割取皮／肉會令動物死亡';
  const rows=lootRows(b);
  lootList.innerHTML=rows.length?rows.map((r,i)=>{const it=ITEMS[r.id];return `<li><div class="nm"><b>${it.name}${r.n>1?' ×'+r.n:''}${r.slot?' · 身上著緊':''}</b><span>${r.id==='coin'?'全隊錢包':it.type==='quest'?desc(r.id):desc(r.id)+` · 賣 ${sellPrice(r.id)} 文`}</span></div><div class="btns"><button data-i="${i}">拎</button></div></li>`}).join('')
    :`<li><span class="empty">${b.pile?'已經搜清光':'已被搜清 · 身上冇可取物品，可能已被其他人搜走'}</span></li>`;
  lootList.querySelectorAll('button[data-i]').forEach(bt=>{if(fatalHarvest(rows[+bt.dataset.i]))bt.textContent=harvestArmed?'確認宰割':'宰割取材（會死亡）'});
  $('#bLootAll').textContent=rows.some(fatalHarvest)?harvestArmed?'確認宰割並全拎':'宰割並全拎（會死亡）':'全部拎走';
  $('#bLootAll').disabled=!rows.length;
  const canCarry=!b.pile&&!b.carriedBy&&!u.carry&&b.down;$('#bLootCarry').hidden=!canCarry;
  $('#bLootCarry').textContent=b.bounty&&!b.dead?`揹起佢（懸賞 ${b.bounty} 文）`:'揹起佢';
}
function takeRow(r){const b=lootBody,u=lootUnit;
  if(fatalHarvest(r))kill(b);
  if(r.slot){addItem(u,r.id,1);b.eq[r.slot]=null}else{const s=b.pack[r.idx];addItem(u,s.id,s.n);b.pack.splice(r.idx,1)}}
lootList.addEventListener('click',e=>{const bt=e.target.closest('button');if(!bt)return;const rows=lootRows(lootBody);const r=rows[+bt.dataset.i];if(r&&confirmHarvest([r]))takeRow(r);renderLoot();updatePortraits(true)});
$('#bLootAll').addEventListener('click',()=>{if(!confirmHarvest(lootRows(lootBody)))return;let rows;while((rows=lootRows(lootBody)).length)takeRow(rows[rows.length-1]);toast(`${lootUnit.name} 執晒`);renderLoot();updatePortraits(true)});
$('#bLootCarry').addEventListener('click',()=>{pickUp(lootUnit,lootBody);lootSheet.hidden=true;setModal(false);updatePortraits(true)});
$('#bLootClose').addEventListener('click',()=>{lootSheet.hidden=true;setModal(false)});

/* ---------- HUD ---------- */
const partColor=r=>r<=0?'#6b5b4a':r<.3?'#d8553d':r<.6?'#e5a23c':'#8fc56e';
function partCol(u,k){const p=u.p[k];if(p.lost)return '#4a1a12';const r=ratio(u,k);if(p.pros&&r>.3)return '#9fb0bb';return partColor(r)}
const sq=$('#squad');const pEls=new Map();
function makePortrait(u){
  const b=document.createElement('button');b.className='pt';b.setAttribute('aria-label',u.name);
  b.innerHTML=`<span class="row"><span class="sw" style="background:${u.color}"></span><span class="nm">${u.name}</span></span><span class="hp"><i></i></span><span class="pips">${PARTS.map(()=>'<i></i>').join('')}</span><span class="st"></span>`;
  let last=0,cardT=0;
  b.addEventListener('click',()=>{const now=performance.now();
    if(now-last<330){clearTimeout(cardT);cam.follow=u;toast(`鏡頭跟住 ${u.name} · 拖一下畫面解除`);last=0}
    else{const already=sel.size===1&&sel.has(u);sel.clear();if(!u.dead)sel.add(u);last=now;
      if(already||u.dead)cardT=setTimeout(()=>openCard(u),340)}
    updatePortraits(true)});
  sq.appendChild(b);pEls.set(u,{b,hp:b.querySelector('.hp i'),pips:[...b.querySelectorAll('.pips i')],nm:b.querySelector('.nm'),st:b.querySelector('.st'),cam:null,up:null});
}
const ctxEl=$('#ctx');let ctxSig='';
function updateCtx(){
  const carriers=[...sel].filter(u=>u.carry);const sig=carriers.map(u=>u.id+u.carry.id).join();if(sig===ctxSig)return;ctxSig=sig;
  ctxEl.innerHTML=carriers.map((u,i)=>`<button data-i="${i}">↓ ${u.name} 放低 ${u.carry.name}</button>`).join('');
  ctxEl.onclick=e=>{const b=e.target.closest('button');if(!b)return;const u=carriers[+b.dataset.i];if(u){drop(u);toast(`${u.name} 放低咗`);ctxSig='';updateCtx()}};
}
let lastHud=0;
function updatePortraits(force){
  const now=performance.now();if(!force&&now-lastHud<120)return;lastHud=now;
  pEls.forEach((e,u)=>{
    e.b.classList.toggle('sel',sel.has(u));e.b.classList.toggle('down',u.down);
    const p=pct(u);e.hp.style.width=(p*100).toFixed(1)+'%';e.hp.style.background=p<.3?'#e5813c':'#8fc56e';
    PARTS.forEach(([k],i)=>e.pips[i].style.background=partCol(u,k));
    const q=u.cmd.length>1?` · 排隊 ${u.cmd.length}`:'';
    const hungry=starvationText(u);
    e.st.textContent=(u.food<25&&!u.dead&&!hungry?'肚餓 · ':'')+(u.dead?'陣亡':hungry?hungry+(u.carriedBy?' · 被揹緊':u.down?'':` · ${u.state}`):u.down?(u.carriedBy?'俾人揹緊':u.bleed>0?'倒地 · 流血中':`倒地 · 回復 ${Math.round(recov(u)*100)}%`):u.state)+(u.bleed>.15&&!u.dead?' · 流血':'')+q;e.nm.textContent=u.name;
    const f=cam.follow===u;
    if(f&&!e.cam){e.cam=document.createElement('span');e.cam.className='cam';e.cam.textContent='鏡頭';e.b.appendChild(e.cam)}
    if(!f&&e.cam){e.cam.remove();e.cam=null}
    const up=u.flash>0;
    if(up&&!e.up){e.up=document.createElement('span');e.up.className='up';e.up.textContent='升級';e.b.appendChild(e.up)}
    if(!up&&e.up){e.up.remove();e.up=null}
  });
  moneyTxt.textContent=money+' 文';updateCtx();
  $('#journey').textContent=(pendingTravel?`正集合去${AREAS[pendingTravel.target].name} · 點路牌可取消`:`${AREAS[activeArea].name}｜${AREAS[activeArea].hint}`)+` · 遊商：${caravanLocation()}`;
  if(!charSheet.hidden&&cardUnit)fillCard();
}

/* ---------- character card ---------- */
const charSheet=$('#charSheet'),tabs=$('#tabs'),partList=$('#partList'),skillList=$('#skillList');
let cardUnit=null;
function makeTab(u){const b=document.createElement('button');b.setAttribute('role','tab');b.innerHTML=`<span class="sw" style="background:${u.color}"></span><span>${u.name}</span>`;
  b.addEventListener('click',()=>{cardUnit=u;sel.clear();if(!u.dead)sel.add(u);buildCard();updatePortraits(true)});u.tab=b;tabs.appendChild(b)}
function buildSquadUI(){sq.innerHTML='';tabs.innerHTML='';pEls.clear();allies().forEach(u=>{makePortrait(u);makeTab(u)});
  if(cardUnit&&!allies().includes(cardUnit))cardUnit=null;updatePortraits(true)}
partList.innerHTML=PARTS.map(([k,l])=>`<li><span>${l}</span><span class="bar"><i id="pb_${k}"></i></span><span class="v" id="pv_${k}"></span></li>`).join('');
skillList.innerHTML=SKILLS.map(([k,l,how])=>`<li class="sk" id="sk_${k}"><div class="hd"><b>${l}</b><span class="lvl" id="sl_${k}"></span></div><div class="how">${how}</div><div class="xp"><i id="sx_${k}"></i></div><div class="eff" id="se_${k}"></div></li>`).join('');
function openCard(u){cardUnit=u||[...sel][0]||allies()[0];buildCard();charSheet.hidden=false}
function buildCard(){allies().forEach(a=>a.tab.setAttribute('aria-selected',a===cardUnit));wsSig=eqSig=packSig='';fillCard()}
function fillCard(){
  const u=cardUnit;$('#chName').textContent=`${u.name} · ${u.role}`;u.tab.lastChild.textContent=u.name;
  const notes=[];if(u.dead)notes.push('已陣亡 · 可以將佢移離隊伍，去宿屋酒場請新人');else{const hungry=starvationText(u);if(hungry)notes.push(`${hungry} · 飽肚至少 ${HUNGER.sated} 先解除危機`);if(u.down)notes.push(u.carriedBy?`俾 ${u.carriedBy.name} 揹緊`:u.bleed>0?'倒地中 · 流緊血，冇人止血會死':hungerBlocksRecovery(u)?'需要食物救援':`倒地中 · 回復緊 ${Math.round(recov(u)*100)}%`)}
  if(u.bleed>.05&&!u.dead)notes.push(`流血中，每秒 −${u.bleed.toFixed(1)}`);
  PARTS.forEach(([k,l])=>{if(u.p[k].lost)notes.push(`${l}斷咗`)});
  if(!u.p.legs.lost&&ratio(u,'legs')<=0)notes.push('腳殘廢，只可以爬');else if(ratio(u,'legs')>0&&ratio(u,'legs')<.6)notes.push(`腳傷，速度 ${Math.round(legMul(u)*100)}%`);
  if(!u.p.rarm.lost&&ratio(u,'rarm')<=0)notes.push('右手殘廢，攻擊大減');if(!u.p.larm.lost&&ratio(u,'larm')<=0)notes.push('左手殘廢');
  if(u.carry)notes.push(`揹緊 ${u.carry.name}`);
  $('#chSub').textContent=notes.length?notes.join(' · '):`狀態：${u.state} · 整體 ${Math.round(pct(u)*100)}%`;
  PARTS.forEach(([k])=>{const p=u.p[k],r=ratio(u,k),c=partCol(u,k);const el=$('#bp_'+k);
    el.setAttribute('fill',p.lost?'transparent':c);el.style.strokeDasharray=p.lost?'4 3':'';el.style.stroke=p.lost?'#d8553d':p.pros?'#dfe6ea':'';
    const bar=$('#pb_'+k);bar.style.width=(r*100).toFixed(0)+'%';bar.style.background=c;
    const v=$('#pv_'+k);if(p.lost){v.textContent='斷咗';v.classList.add('cr')}else if(p.hp<=0){v.textContent=p.pros?'義肢壞咗':'殘廢';v.classList.add('cr')}
    else{v.textContent=(p.pros?'義 ':'')+`${Math.ceil(p.hp)} / ${p.max}`;v.classList.remove('cr')}});
  fillWorkshop(u);fillEquip(u);
  const f=Math.round(u.food);$('#foodTxt').textContent=`飽肚 ${f} / 100`;$('#foodEff').textContent=starvationText(u)||(u.food<=0?'餓到扣血':u.food<30?'肚餓：傷害同速度下降':'');
  const helper=feedingHelper(u),feedButton=$('#bFeed');feedButton.hidden=u.dead||u.food>=40;feedButton.disabled=!helper;feedButton.textContent=helper?`叫${helper.name}餵食`:'餵食（需要隊友同食物）';
  const ff=$('#foodFill');ff.style.width=f+'%';ff.style.background=u.food<30?'#d8553d':u.food<50?'#e5a23c':'#8fc56e';
  $('#bDismiss').hidden=!u.dead;{const bb=$('#bBandage');bb.disabled=u.dead||u.down||!hurt(u);bb.textContent=u.cmd[0]&&u.cmd[0].t==='bandage'&&u.cmd[0].pat===u?'包紮緊…':hurt(u)?`包紮自己（藥包 ${countItem(u,'medkit')} 個）`:'冇傷，唔使包紮'}
  const l=load(u),c=cap(u);$('#loadTxt').textContent=`負重 ${l} / ${c} kg${u.carry?'（包括揹緊嘅人 30kg）':''}`;
  $('#loadEff').textContent=l>c?`速度 ${Math.round(encMul(u)*100)}% · 練緊力量`:l>c*.5?'練緊力量':'';
  const lf=$('#loadFill');lf.style.width=Math.min(100,l/c*100)+'%';lf.style.background=l>c?'#d8553d':l>c*.5?'#e5a23c':'#5fb3a8';
  SKILLS.forEach(([k])=>{const s=u.sk[k];$('#sl_'+k).textContent='Lv '+s.lv;$('#sx_'+k).style.width=(s.lv>=100?100:s.xp/need(s.lv)*100).toFixed(1)+'%';
    $('#se_'+k).textContent=effText(k,s.lv);$('#sk_'+k).classList.toggle('flash',u.flash>0&&u.flashSkill===k)});
}
const workshop=$('#workshop'),equipEl=$('#equip'),packEl=$('#pack');let wsSig='',eqSig='',packSig='';
function inDanger(u){return hostiles(u).some(h=>dist(h,u)<6)}
function fillWorkshop(u){
  const busy=u.dead?'dead':u.down?'down':inDanger(u)?'danger':'';
  const prosItems=u.pack.filter(s=>ITEMS[s.id].type==='pros').map(s=>s.id),kits=countItem(u,'kit');
  const rows=[];PARTS.forEach(([k,l])=>{const p=u.p[k];if(p.lost)rows.push({k,l,type:'lost'});else if(p.pros&&p.hp<p.max)rows.push({k,l,type:'fix'})});
  const sig=u.id+'|'+busy+'|'+prosItems.join()+'|'+kits+'|'+rows.map(r=>r.k+r.type).join();if(sig===wsSig)return;wsSig=sig;
  if(!rows.length){workshop.innerHTML='<li><span class="empty">冇斷肢，亦冇義肢要修。義肢要去青葉村商人度買。</span></li>';return}
  const why=busy==='dead'?'已陣亡':busy==='down'?'倒地中做唔到':busy==='danger'?'附近有敵人，做唔到':'';
  workshop.innerHTML=rows.map(r=>{
    if(r.type==='lost'){const opts=[...new Set(prosItems)].map(id=>`<button data-k="${r.k}" data-id="${id}" ${busy?'disabled':''}>裝上${ITEMS[id].name}<small>${desc(id)}</small></button>`).join('');
      return `<li class="col"><b>${r.l}斷咗${why?' · '+why:''}</b><div class="opts">${opts||'<span class="empty">背包冇義肢。去青葉村商人度買：木鐵機關肢 $150，精製機關肢 $700。</span>'}</div></li>`}
    return `<li class="col"><b>${r.l}${PROS[u.p[r.k].pros].name}損壞${why?' · '+why:''}</b><div class="opts"><button data-k="${r.k}" data-fix="1" ${busy||!kits?'disabled':''}>用機關修具修理<small>${kits?`背包有 ${kits} 個`:'背包冇機關修具，商人有得賣 $40'}</small></button></div></li>`}).join('');
}
workshop.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled||!cardUnit)return;const u=cardUnit,p=u.p[b.dataset.k];
  if(b.dataset.fix){if(useItem(u,'kit')){p.hp=p.max;toast('義肢修好咗')}}
  else{const id=b.dataset.id;if(useItem(u,id)){const d=PROS[ITEMS[id].pros];p.lost=false;p.pros=ITEMS[id].pros;p.max=Math.round(p.base*d.hp);p.hp=p.max;toast(`${u.name} 裝咗${d.name}`)}}
  wsSig=packSig='';updatePortraits(true)});
function fillEquip(u){
  const mate=u.dead||u.down?null:nearest(allies().filter(a=>a!==u&&!a.dead&&!a.down&&dist(a,u)<2),u);
  const sig=u.id+'|'+u.eq.weapon+'|'+u.eq.armor+'|'+u.pack.map(s=>s.id+s.n).join()+'|'+u.dead+'|'+(mate?mate.id:'');
  if(sig!==eqSig){eqSig=sig;
    equipEl.innerHTML=[['weapon','武器'],['armor','盔甲']].map(([slot,l])=>{const id=u.eq[slot];
      return `<li><div class="nm"><b>${l}：${id?ITEMS[id].name:(slot==='weapon'?'冇（用拳頭）':'冇')}</b><span>${id?desc(id):slot==='weapon'?'傷害 2–4':'冇減傷'}</span></div>${id&&!u.dead?`<div class="btns"><button data-unequip="${slot}">卸低</button></div>`:''}</li>`}).join('');}
  if(sig!==packSig){packSig=sig;
    packEl.innerHTML=u.pack.length?u.pack.map((s,i)=>{const it=ITEMS[s.id];const eqable=(it.type==='weapon'||it.type==='armor')&&!u.dead;
      return `<li><div class="nm"><b>${it.name}${s.n>1?' ×'+s.n:''}</b><span>${desc(s.id)} · 賣 ${sellPrice(s.id)} 文</span></div><div class="btns">${eqable?`<button data-equip="${i}">裝備</button>`:''}${mate?`<button data-give="${i}" data-mate="${allies().indexOf(mate)}">俾${mate.name}</button>`:''}<button data-drop="${i}">掉落地</button></div></li>`}).join('')
      :'<li><span class="empty">背包係空嘅</span></li>';}
}
equipEl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const u=cardUnit,slot=b.dataset.unequip;if(u.eq[slot]){addItem(u,u.eq[slot],1);u.eq[slot]=null}eqSig=packSig='';updatePortraits(true)});
packEl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const u=cardUnit;
  if(b.dataset.equip){const i=+b.dataset.equip,id=u.pack[i].id,slot=ITEMS[id].type;takeOne(u,i);if(u.eq[slot])addItem(u,u.eq[slot],1);u.eq[slot]=id;toast(`${u.name} 裝備咗${ITEMS[id].name}`)}
  else if(b.dataset.drop){const i=+b.dataset.drop,s=u.pack[i];u.pack.splice(i,1);dropToGround(u,s);toast(`${ITEMS[s.id].name}${s.n>1?' ×'+s.n:''} 掉咗喺地上，5 分鐘內冇人執就會消失`)}
  else if(b.dataset.give){const i=+b.dataset.give,s=u.pack[i],m=allies()[+b.dataset.mate];if(s&&m){u.pack.splice(i,1);addItem(m,s.id,s.n);toast(`${u.name} 將${ITEMS[s.id].name}${s.n>1?' ×'+s.n:''}交咗俾${m.name}`)}}
  eqSig=packSig=wsSig='';updatePortraits(true)});
$('#bChar').addEventListener('click',()=>openCard());
$('#bBandage').addEventListener('click',()=>{const u=cardUnit;if(u&&!u.dead&&!u.down&&hurt(u)){orderBandage(u,u);charSheet.hidden=true}});
$('#bFeed').addEventListener('click',()=>{if(cardUnit&&orderFeed(cardUnit))charSheet.hidden=true});
$('#bDismiss').addEventListener('click',()=>{const u=cardUnit;if(!u||!u.dead)return;u.team='c';sel.delete(u);if(cam.follow===u)cam.follow=null;
  toast(`${u.name} 已移離隊伍，屍體上嘅嘢仲可以執`);buildSquadUI();const n=allies()[0];if(n){cardUnit=n;buildCard()}else charSheet.hidden=true});
$('#bCharClose').addEventListener('click',()=>charSheet.hidden=true);
charSheet.addEventListener('click',e=>{if(e.target===charSheet)charSheet.hidden=true});

const moneyTxt=$('#moneyTxt'),status=$('#status'),statusTxt=$('#statusTxt'),banner=$('#banner'),bPause=$('#bPause');
const ICON_PAUSE='<rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/>',ICON_PLAY='<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>';
function refreshStatus(){
  status.classList.toggle('paused',paused);status.classList.toggle('slow',!paused&&speed<1);
  statusTxt.textContent=paused?'已暫停':speed<1?'慢鏡 ¼':'進行中';
  banner.hidden=!paused;bPause.classList.toggle('on',paused);bPause.setAttribute('aria-label',paused?'繼續':'暫停');
  $('#pIcon').innerHTML=paused?ICON_PLAY:ICON_PAUSE;
}
function setPaused(v){paused=v;refreshStatus()}
bPause.addEventListener('click',()=>{setPaused(!paused);if(!paused){const n=allies().filter(u=>u.cmd.length).length;if(n)toast(`繼續 · ${n} 個隊友開始執行指令`)}});
$('#bSlow').addEventListener('click',e=>{speed=speed<1?1:.25;e.currentTarget.setAttribute('aria-pressed',speed<1);refreshStatus()});
$('#bSel').addEventListener('click',e=>{selectMode=!selectMode;e.currentTarget.setAttribute('aria-pressed',selectMode);toast(selectMode?'框選模式：單指拖 = 拉框':'返回普通模式：單指拖 = 鏡頭')});
$('#bAll').addEventListener('click',()=>{sel.clear();allies().filter(u=>!u.dead).forEach(u=>sel.add(u));updatePortraits(true);toast('全隊已選')});
addEventListener('keydown',e=>{if(e.code==='Space'&&!(e.target instanceof HTMLInputElement)){e.preventDefault();bPause.click()}});

let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2200)}

/* ---------- tactics sheet ---------- */
const RULES=[
  ['flee','重傷撤退','血量或頭／身低過 40% 就撤退，安全後休養至 60%；近身可自衛，手動指令優先'],
  ['rescue','救人醫人','先扶起倒地隊友；冇敵人時去幫受傷隊友包紮'],
  ['fight','見敵就打','冇指令嗰陣，6 格內見到敵人就自動開打'],
];
const PRESETS={'坦克':{flee:false,rescue:false,fight:true},'戰士':{flee:true,rescue:false,fight:true},'醫療':{flee:true,rescue:true,fight:false},'膽小':{flee:true,rescue:false,fight:false}};
const sheet=$('#sheet'),rulesEl=$('#rules'),presetsEl=$('#presets');
RULES.forEach(([k,t,d],i)=>{const li=document.createElement('li');li.className='rule';
  li.innerHTML=`<span class="n">${i+1}</span><div class="tx"><b>${t}</b><span>${d}</span></div><input type="checkbox" class="sw2" id="r_${k}" aria-label="${t}">`;
  rulesEl.appendChild(li);li.querySelector('input').addEventListener('change',e=>{[...sel].forEach(u=>u.rules[k]=e.target.checked);syncSheet()})});
Object.keys(PRESETS).forEach(n=>{const b=document.createElement('button');b.textContent=n;b.addEventListener('click',()=>{[...sel].forEach(u=>u.rules={...PRESETS[n]});syncSheet();toast(`已套用「${n}」`)});presetsEl.appendChild(b)});
function syncSheet(){
  const list=[...sel];$('#tacTitle').textContent=list.length?'戰術規則 · '+list.map(u=>u.name).join('、'):'戰術規則';
  $('#tacSub').textContent=list.length?'由上至下，邊條先成立就做邊條；你親手落嘅指令排喺「見敵就打」之前。':'先喺底部揀隊友，先可以改佢哋嘅規則。';
  RULES.forEach(([k])=>{const el=$('#r_'+k);const on=list.filter(u=>u.rules[k]).length;el.disabled=!list.length;el.checked=list.length>0&&on===list.length;el.indeterminate=on>0&&on<list.length});
  presetsEl.querySelectorAll('button').forEach(b=>b.disabled=!list.length);
  const src=list[0],bc=$('#bCopy');bc.disabled=list.length!==1;
  bc.textContent=list.length===1?`將${src.name}嘅規則複製去全隊`:'淨係揀一個人，就可以將佢嘅規則複製去全隊';
}
$('#bCopy').addEventListener('click',()=>{const src=[...sel][0];if(!src)return;allies().forEach(u=>u.rules={...src.rules});toast(`全隊而家用${src.name}嘅規則`);syncSheet()});
function renderFactions(){const v=Math.round(repTown),lbl=repLabel(v),col=lbl==='敵對'?'#d8553d':lbl==='友好'?'#8fc56e':'#e5a23c';
  $('#factions').innerHTML=`<li class="col"><div style="display:flex;gap:8px;align-items:baseline"><b style="flex:1">青葉村</b><span style="color:${col};font-weight:700">${lbl} ${v>0?'+':''}${v}</span></div>
    <div class="loadbar" style="margin:0"><i style="width:${(v+100)/2}%;background:${col}"></i></div>
    <span class="empty">${lbl==='敵對'?'足輕會打你，商人唔做你生意。關係會好慢咁回升返中立。':lbl==='友好'?'買嘢九折、賣嘢多一成，足輕會幫你打走敵人。':'交懸賞犯 +10。到 +30 變友好；攻擊足輕會即刻變敵對。'}</span></li>
    <li><div class="nm"><b>野武士</b><span>永遠敵對 · 有機會補刀倒地嘅人</span></div></li>
    <li><div class="nm"><b>野犬</b><span>野獸 · 見人就咬，包括野武士，亦會咬倒地嘅人</span></div></li>`}
$('#bTac').addEventListener('click',()=>{syncSheet();renderFactions();sheet.hidden=false});
$('#bClose').addEventListener('click',()=>sheet.hidden=true);
sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.hidden=true});
$('#optHard').addEventListener('change',e=>{hardcore=e.target.checked;toast(hardcore?'硬派模式：會斷肢、會陣亡':'休閒模式：最多只會倒地')});
$('#optSync').addEventListener('change',e=>{groupSync=e.target.checked});
$('#optAuto').addEventListener('change',e=>{autoPause=e.target.checked});
const RECRUITS=['阿明','大隻','細妹','老鬼','阿九','肥仔','阿珍','火水','阿棠','豆皮'];let recruitN=0;
const PALETTE=['#e0a46a','#8fc0e8','#b6d27a','#e48fa8','#9fd6c6','#d6b85c','#a7a0e0','#e8c0a0'];
const BAR_POOL=[
  {key:'miner',name:'老鐵',role:'前礦工',cost:350,base:62,lv:{str:15,tough:8},eq:{weapon:'club',armor:'cloth'},note:'力量好，揹嘢採礦一流'},
  {key:'doc',name:'阿霞',role:'退役醫生',cost:450,base:46,lv:{aid:18,dod:5},eq:{weapon:'knife',armor:'cloth'},pack:[{id:'medkit',n:4}],note:'急救高手，自帶 4 個藥包',rescue:true},
  {key:'merc',name:'刀疤',role:'前傭兵',cost:800,base:64,lv:{atk:16,tough:12,dod:8},eq:{weapon:'machete',armor:'leather'},note:'打得又捱得'},
  {key:'hunter',name:'細眼',role:'獵人',cost:400,base:48,lv:{atk:10,dod:10},eq:{weapon:'bow',armor:'cloth'},note:'用弓，閃避好'},
  {key:'cook',name:'阿肥',role:'廚房佬',cost:150,base:58,lv:{tough:6},eq:{armor:'cloth'},pack:[{id:'ration',n:6}],note:'耐打，帶住一袋飯糰'},
  {key:'deserter',name:'阿七',role:'逃兵',cost:600,base:56,lv:{atk:12,dod:12,str:6},eq:{weapon:'club',armor:'leather'},note:'身手唔錯，唔多講嘢'}];
let hired=new Set(),barOffer=null,barT=-999;const SQUAD_MAX=8;
const barSheet=$('#barSheet'),barList=$('#barList');let barUnit=null;
function rollBar(){const pool=BAR_POOL.filter(c=>!hired.has(c.key));const pick=[];while(pick.length<2&&pool.length)pick.push(pool.splice(ri(0,pool.length-1),1)[0]);
  barOffer=[{key:'drifter',name:RECRUITS[recruitN%RECRUITS.length],role:'流浪漢',cost:0,base:44,lv:{},eq:{armor:'cloth'},note:'乜都唔識，全部技能 Lv1，但係免費'},...pick];barT=simT}
function openBar(u){barUnit=u;if(!barOffer||simT-barT>180)rollBar();renderBar();barSheet.hidden=false;setModal(true)}
function renderBar(){const n=allSquad().length;$('#barSub').textContent=`隊伍 ${n} / ${SQUAD_MAX} 人 · 錢包 ${money} 文 · 酒場大約每 3 分鐘換一批人`;
  barList.innerHTML=barOffer.length?barOffer.map((c,i)=>`<li><div class="nm"><b>${c.name} · ${c.role}</b><span>${c.note} · ${Object.entries(c.lv).map(([k,v])=>SKILLS.find(x=>x[0]===k)[1]+' '+v).join('、')||'技能 Lv1'}</span></div><span class="price">${c.cost?c.cost+' 文':'免費'}</span><div class="btns"><button class="buy" data-i="${i}" ${money<c.cost||n>=SQUAD_MAX?'disabled':''}>請佢</button></div></li>`).join('')
    :'<li><span class="empty">而家冇人搵工，遲啲再嚟</span></li>'}
barList.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const c=barOffer[+b.dataset.i];if(!c||money<c.cost||allSquad().length>=SQUAD_MAX)return;
  money-=c.cost;if(c.key==='drifter')recruitN++;else hired.add(c.key);barOffer.splice(+b.dataset.i,1);
  const u=mk({team:'a',name:c.name,role:c.role,color:PALETTE[allies().length%PALETTE.length],base:c.base,x:INNKEEPER.x+.6,y:INNKEEPER.y+.6,
    eq:Object.assign({weapon:null,armor:null},c.eq),pack:(c.pack||[]).map(x=>({...x})).concat([{id:'ration',n:1}]),lv:c.lv,rules:{flee:true,rescue:!!c.rescue,fight:true}});
  units.push(u);float(u,'加入隊伍','#a9e08a',true);toast(`${c.name} 加入咗你嘅隊伍`);buildSquadUI();renderBar()});
$('#bBarClose').addEventListener('click',()=>{barSheet.hidden=true;setModal(false)});

