'use strict';
/* 觸控、框選、指令、彈出選單 */
/* ---------- input ---------- */
const LONG=320;const ptrs=new Map();let gest=null,box=null;
const buzz=()=>{try{navigator.vibrate&&navigator.vibrate(15)}catch(e){}};
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
  hideMenu();
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){if(gest)clearTimeout(gest.timer);box=null;const [a,b]=[...ptrs.values()];
    gest={mode:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y),z0:cam.z,m:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};cam.follow=null;return}
  if(ptrs.size>2)return;
  gest={mode:'pending',sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,t:performance.now(),id:e.pointerId};
  if(selectMode||e.shiftKey){gest.mode='box';box={x0:e.clientX,y0:e.clientY,x1:e.clientX,y1:e.clientY}}
  else gest.timer=setTimeout(()=>{if(gest&&gest.mode==='pending'){gest.mode='box';box={x0:gest.sx,y0:gest.sy,x1:gest.lx,y1:gest.ly};buzz()}},LONG);
});
cv.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gest)return;
  if(gest.mode==='pinch'&&ptrs.size>=2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    cam.x-=(m.x-gest.m.x)/cam.z;cam.y-=(m.y-gest.m.y)/cam.z;gest.m=m;zoomAt(m.x,m.y,gest.z0*d/Math.max(1,gest.d0));return}
  if(e.pointerId!==gest.id)return;
  if(gest.mode==='pending'&&Math.hypot(e.clientX-gest.sx,e.clientY-gest.sy)>10){clearTimeout(gest.timer);gest.mode='pan';cam.follow=null;updatePortraits(true)}
  if(gest.mode==='pan'){cam.x-=(e.clientX-gest.lx)/cam.z;cam.y-=(e.clientY-gest.ly)/cam.z}
  if(gest.mode==='box'){box.x1=e.clientX;box.y1=e.clientY}
  gest.lx=e.clientX;gest.ly=e.clientY;
});
function endPtr(e){
  if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);if(!gest)return;
  if(gest.mode==='pinch'){if(ptrs.size===0)gest=null;else gest={mode:'done'};return}
  if(gest.mode==='done'){if(ptrs.size===0)gest=null;return}
  if(e.pointerId!==gest.id)return;clearTimeout(gest.timer);
  if(gest.mode==='box'&&box){finishBox();box=null}
  else if(gest.mode==='pending'&&e.type==='pointerup')tap(e.clientX,e.clientY);
  gest=null;
}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,cam.z*Math.exp(-e.deltaY*.0015))},{passive:false});

function finishBox(){
  const x0=Math.min(box.x0,box.x1),x1=Math.max(box.x0,box.x1),y0=Math.min(box.y0,box.y1),y1=Math.max(box.y0,box.y1);
  if(x1-x0<6&&y1-y0<6){tap(box.x0,box.y0);return}
  const hit=allies().filter(u=>!u.dead&&!u.carriedBy).filter(u=>{const s=scr(u.x,u.y,12);return s.x>=x0&&s.x<=x1&&s.y>=y0&&s.y<=y1});
  if(hit.length){sel.clear();hit.forEach(u=>sel.add(u));toast(`框選咗 ${hit.length} 個隊友`)}else toast('個框入面冇隊友');
  updatePortraits(true);
}
function pickHits(sx,sy){const hits=[];for(const u of units){if(!unitVisible(u))continue;const s=scr(u.x,u.y,u.carriedBy?22:u.down?4:u.kind==='dog'?8:14);const d=Math.hypot(s.x-sx,(s.y-sy)*.8);
  if(d<(u.down?20:26)*Math.max(.8,cam.z))hits.push({u,d})}return hits.sort((a,b)=>a.d-b.d).map(h=>h.u)}
function pick(sx,sy){return pickHits(sx,sy)[0]||null}
function pickPile(sx,sy){for(const p of piles){if(!fogVisible(p))continue;const s=scr(p.x,p.y,4);if(Math.hypot(s.x-sx,s.y-sy)<22*Math.max(.8,cam.z))return p}return null}
function pickBed(sx,sy){for(const b of BEDS){if(!fogVisible(b))continue;const s=scr(b.x,b.y,5);if(Math.hypot(s.x-sx,s.y-sy)<20*Math.max(.8,cam.z))return b}return null}
function pickOre(sx,sy){for(const o of ORES){if(!fogVisible(o))continue;const s=scr(o.x,o.y,o.h*.6);if(Math.hypot(s.x-sx,s.y-sy)<28*Math.max(.8,cam.z))return o}return null}
function formation(n,i){const cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols),r=Math.floor(i/cols),c=i%cols;return{dx:(c-(cols-1)/2)*.85,dy:(r-(rows-1)/2)*.85}}
function fleeCheck(list){
  if(pendingTravel&&list.some(u=>pendingTravel.party.includes(u)))cancelTravel(false);
  list.forEach(u=>{u.retreating=false;u.forceT=0});
  return false;
}
function push(u,c){if(paused){if(u.cmd.length>=6)u.cmd.shift();u.cmd.push(c)}else u.cmd=[c]}
function issue(make){
  const list=[...sel].filter(u=>!u.down);if(!list.length){toast(sel.size?'揀咗嘅隊友全部倒地':'先揀隊友（點佢或者框選）');return false}
  const said=fleeCheck(list);
  list.forEach((u,i)=>push(u,make(u,i,list.length)));
  if(!said&&paused){const n=Math.max(...list.map(u=>u.cmd.length));toast(`已排隊 · 第 ${n} 個指令`)}
  return true;
}
function issueOne(c,target,why,filter){ // send only the nearest suitable selected ally
  const list=[...sel].filter(u=>!u.down&&(!filter||filter(u)));
  if(!list.length){toast(sel.size?(why||'揀咗嘅隊友做唔到'):'先揀隊友（點佢或者框選）');return null}
  const u=nearest(list,target);fleeCheck([u]);push(u,c);return u;
}
function tap(sx,sy){
  const gate=AREAS[activeArea].gate,gs=scr(gate.x,gate.y,20);
  if(fogKnown(gate)&&Math.hypot(sx-gs.x,sy-gs.y)<24*Math.max(.8,cam.z)){travelMenu(sx,sy);return}
  const hits=pickHits(sx,sy),bodies=hits.filter(u=>u.down&&!u.carriedBy);
  if(bodies.length&&hits.length>1){showMenu(sx,sy,'附近倒地角色 · 揀操作目標',bodies.map((b,i)=>({label:`${i+1}. ${b.name} · ${b.dead?'屍體':'倒地'}`,sub:hasLoot(b)?'身上仲有物品':'已被搜清 · 身上冇可取物品',fn:()=>bodyMenu(b,sx,sy)})));return}
  const u=hits[0];
  if(u){
    if(u.carriedBy){toast(`${u.carriedBy.name} 揹緊 ${u.name}`);return}
    if(!u.down&&['border_refugee','border_lord'].includes(u.kind)&&u.team!=='a'){const v=issueOne({t:'talk',npc:u,act:'campaign'},u);if(v)toast(`${v.name} 去同 ${u.name} 交談`);return}
    if(u===TRADER){const v=issueOne({t:'talk',npc:u},u);if(v)toast(`${v.name} 行去搵商人`);return}
    if(u===INNKEEPER){innMenu(sx,sy);return}
    if(u.team==='v'&&!u.down){const opts=[];
      if(u.kind==='caravan'&&!caravanAngry)opts.push({label:'同遊商交易',sub:'佢會行嚟行去，追住佢',fn:()=>{const v=issueOne({t:'talk',npc:u},u);if(v)toast(`${v.name} 去搵遊商`)}});
      opts.push({label:'攻擊商隊',sub:caravanAngry?'已經敵對':'護衛會反擊，青葉村關係 −25',fn:()=>{issue(()=>({t:'attack',u}))}});
      showMenu(sx,sy,`遊商隊 · ${caravanAngry?'敵對':'中立'}`,opts);return}
    if(u.team==='s'&&!u.down){const angry=scavAngry.has(u.gid);
      showMenu(sx,sy,`落武者 · ${angry?'敵對':'中立'}`,[{label:'交談',fn:()=>toast(['落武者：地上嘅嘢，邊個執到就係邊個嘅','落武者：唔好望住我，我淨係執死人嘢','落武者：你哋打完交未呀？'][ri(0,2)])},
        {label:'攻擊落武者',sub:angry?'已經敵對':'佢哋成組會反擊',fn:()=>{issue(()=>({t:'attack',u}))}}]);return}
    if(u.team==='g'){if(u.down){bodyMenu(u,sx,sy);return}
      showMenu(sx,sy,`青葉村足輕 · 關係${repLabel(repTown)}`,[
        {label:'交談／交懸賞犯',sub:'揹住生擒嘅懸賞犯過去就有賞金',fn:()=>{const v=issueOne({t:'talk',npc:u},u);if(v)toast(v.carry?`${v.name} 揹住 ${v.carry.name} 去見足輕`:`${v.name} 行去搵足輕`)}},
        {label:'攻擊足輕',sub:repTown>-30?'青葉村會即刻同你敵對，商人唔再做你生意':'已經敵對',fn:()=>{issue(()=>({t:'attack',u}))}}]);return}
    if(u.down){bodyMenu(u,sx,sy);return}
    if(u.team==='a'){const others=[...sel].filter(a=>a!==u&&!a.down);
      const pickIt=()=>{sel.clear();sel.add(u);updatePortraits(true);toast(`揀咗 ${u.name}（${u.role}）`)};
      const selfBand={label:'包紮自己',sub:bandSub(u,u),fn:()=>orderBandage(u,u)};
      const feed=feedOption(u);
      if(!others.length){const opts=[...(hurt(u)?[selfBand]:[]),...(feed?[feed]:[])];if(sel.has(u)&&opts.length){showMenu(sx,sy,u.name,opts);return}pickIt();return}
      const healer=nearest(others,u);const opts=[{label:`揀${u.name}`,fn:pickIt},...(feed?[feed]:[])];
      if(hurt(u))opts.push({label:`叫${healer.name}幫${u.name}包紮`,sub:bandSub(healer,u),fn:()=>orderBandage(healer,u)},selfBand);
      showMenu(sx,sy,u.name,[...opts,
        {label:`叫${others.map(a=>a.name).join('、')}跟住${u.name}`,sub:'一直跟住佢行，見敵照打。落新指令就會取消',fn:()=>{fleeCheck(others);others.forEach(a=>{a.cmd=[{t:'follow',u}]});toast(`${others.map(a=>a.name).join('、')} 跟住 ${u.name}`)}}]);return}
    if(issue(()=>({t:'attack',u})))fx.pings.push({x:u.x,y:u.y,t:performance.now(),col:'#d65b41'});return}
  const bd=pickBed(sx,sy);if(bd){innMenu(sx,sy);return}
  const pl=pickPile(sx,sy);
  if(pl){showMenu(sx,sy,pl.permanent?`${pl.name} · ${pl.pack.length?'物資只可取一次':'已搜清'}`:`地上布袋 · ${pl.pack.length} 樣嘢 · ${Math.max(0,Math.ceil((300-(simT-pl.t))/60))} 分鐘內會消失`,[{label:pl.permanent?'搜查':'執起',sub:'行過去揀要拎咩',fn:()=>{const v=issueOne({t:'loot',body:pl},pl);if(v)toast(`${v.name} 去搜查`)}}]);return}
  const o=pickOre(sx,sy);
  if(o){const list=[...sel].filter(a=>!a.down&&!a.carry);if(!list.length){toast('先揀冇揹人嘅隊友');return}
    fleeCheck(list);list.forEach(a=>push(a,{t:'mine',node:o}));toast(`${list.map(a=>a.name).join('、')} 去採${ITEMS[o.ore].name}`);return}
  const w=world(sx,sy);if(w.x<0||w.y<0||w.x>MAP||w.y>MAP)return;
  const grp=groupSync&&!paused?[...sel].filter(u=>!u.down):null;
  if(issue((u,i,n)=>{const f=formation(n,i);return{t:'move',grp:grp&&grp.length>1?grp:null,x:clamp(w.x+f.dx,.5,MAP-.5),y:clamp(w.y+f.dy,.5,MAP-.5)}}))
    fx.pings.push({x:w.x,y:w.y,t:performance.now(),col:'#eaa93a'});
}

/* ---------- context menu ---------- */
const cmenu=$('#cmenu');
function hideMenu(){cmenu.hidden=true}
function showMenu(sx,sy,title,opts){
  cmenu.innerHTML=`<div class="t">${title}</div>`+opts.map((o,i)=>`<button data-i="${i}">${o.label}${o.sub?`<small>${o.sub}</small>`:''}</button>`).join('');
  cmenu.hidden=false;const r=cmenu.getBoundingClientRect();
  cmenu.style.left=clamp(sx-r.width/2,16,W-r.width-16)+'px';cmenu.style.top=clamp(sy-r.height-14,70,H-r.height-130)+'px';
  cmenu.onclick=e=>{const b=e.target.closest('button');if(!b)return;hideMenu();opts[+b.dataset.i].fn()};
}
function bandSub(h,p){const kits=countItem(h,'medkit');return `${kits?`${h.name}有 ${kits} 個藥包`:`${h.name}冇藥包，淨係止到血`} · 包紮期間唔會還手，被打會中斷`}
function orderBandage(h,p){if(h.down){toast(`${h.name} 倒咗地`);return}fleeCheck([h]);push(h,{t:'bandage',pat:p});toast(p===h?`${h.name} 開始包紮自己`:`${h.name} 去幫 ${p.name} 包紮`)}
function orderFeed(p){
  const h=feedingHelper(p);if(!h){toast('需要可行動隊友；隊友或傷者背包要有食物，揹住傷者嘅人可直接餵');return false}
  fleeCheck([h]);push(h,{t:'feed',pat:p});toast(`${h.name} 去餵 ${p.name}；飽肚至少 ${HUNGER.sated} 先解除危機`);return true;
}
function feedOption(p){
  if(p.dead||p.team!=='a'||p.food>=40)return null;
  const h=feedingHelper(p),s=h&&feedingSource(h,p);
  return {label:h?`叫${h.name}餵食`:'餵食 · 需要隊友同食物',sub:s?`${s.donor.name}背包：${ITEMS[s.id].name} · 飽肚 +${ITEMS[s.id].food}`:'可用隊友或傷者背包嘅食物',fn:()=>orderFeed(p)};
}
function hasLoot(b){return b.pack.length>0||!!b.eq.weapon||!!b.eq.armor}
function bodyMenu(b,sx,sy){
  const opts=[];
  const feed=feedOption(b);if(feed)opts.push(feed);
  if(b.team!=='a'||b.dead)opts.push({label:hasLoot(b)?'搜身／取裝備':'搜身 · 已被搜清',sub:hasLoot(b)?'行過去搜查背包同身上裝備':'身上冇可取物品；可能已被其他人搜走',fn:()=>{const v=issueOne({t:'loot',body:b},b);if(v)toast(`${v.name} 去搜身`)}});
  if(!b.dead&&b.team!=='a')opts.push({label:'補刀',sub:'打到佢死為止，唔會再醒',fn:()=>{if(issue(()=>({t:'attack',u:b,finish:true})))fx.pings.push({x:b.x,y:b.y,t:performance.now(),col:'#d65b41'})}});
  if(!b.dead&&b.team==='a'&&!b.pile){const h=nearest([...sel].filter(a=>!a.down&&a!==b),b);
    if(h)opts.push({label:`叫${h.name}幫佢包紮`,sub:bandSub(h,b),fn:()=>orderBandage(h,b)})}
  if(!b.dead&&b.team!=='a'&&b.bleed>0)opts.push({label:'幫佢止血',sub:b.bounty?`保住條命先攞到懸賞 ${b.bounty} 文 · 會練急救`:'唔會醫好佢，淨係止血 · 會練急救',fn:()=>{const v=issueOne({t:'aid',body:b},b);if(v)toast(`${v.name} 去幫 ${b.name} 止血`)}});
  opts.push({label:b.bounty&&!b.dead?`揹起佢（懸賞 ${b.bounty} 文）`:'揹起佢',sub:b.bounty&&!b.dead?'揹去青葉村足輕度領賞':b.team==='a'&&!b.dead?'揹佢離開險地，等人救':'好重，會行得好慢',
    fn:()=>{const v=issueOne({t:'carry',body:b},b,'揀咗嘅隊友已經揹緊人',a=>!a.carry);if(v)toast(`${v.name} 去揹 ${b.name}`)}});
  const title=`${b.name} · ${b.dead?'屍體':starvationText(b)||`倒地（${b.bleed>0?'流緊血':'回復 '+Math.round(recov(b)*100)+'%'}）`}`;
  showMenu(sx,sy,title,opts);
}

