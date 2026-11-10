'use strict';
// 基地：砍樹得木材，木材／麻繩／犬皮／鐵礦起床、儲物箱、籠。
const BUILDS={
  bed:{name:'床',cost:{wood:3,hide:1},sec:4,s:.55,h:5,sub:'瞓覺回血，免租'},
  chest:{name:'儲物箱',cost:{wood:4,rope:1},sec:4,sub:'隊友可存取物品'},
  cage:{name:'籠',cost:{wood:4,iron:2,rope:2},sec:4,s:.9,h:18,sub:'關一個人（階段 3 用）'},
  field:{name:'田',cost:{wood:2},sec:4,s:.9,h:1,sub:'播稻種，約 4 分鐘收成'},
  hearth:{name:'灶',cost:{wood:3},sec:4,s:.6,h:6,sub:'2 米煮 1 飯糰'},
  smelter:{name:'煉爐',cost:{wood:3,iron:2},sec:5,s:.8,h:16,sub:'鐵 2 + 木 1 煉玉鋼'},
  bench:{name:'作業台',cost:{wood:3,rope:1},sec:5,s:.8,h:9,sub:'自己整熟肉、藥包、修具、皮甲'},
  anvil:{name:'鍛冶台',cost:{wood:4,iron:3},sec:5,s:.8,h:11,sub:'自己打刀甲、機關肢；有品質'}
};
let buildMode=null;
const costText=c=>Object.entries(c).map(([id,n])=>`${ITEMS[id].name}${n}`).join(' + ');
function teamCount(id){return units.filter(a=>a.team==='a'&&!a.dead).reduce((n,a)=>n+countItem(a,id),0)}
function canAfford(cost){return Object.entries(cost).every(([id,n])=>teamCount(id)>=n)}
function spendItem(id,n){
  for(const a of units.filter(a=>a.team==='a'&&!a.dead)){
    for(let i=a.pack.length-1;i>=0&&n>0;i--){const s=a.pack[i];if(s.id!==id)continue;const t=Math.min(s.n,n);s.n-=t;n-=t;if(!s.n)a.pack.splice(i,1)}
  }
}
function buildPay(k){const c=BUILDS[k].cost;if(!canAfford(c))return false;for(const [id,n] of Object.entries(c))spendItem(id,n);return true}
// Returns '' when the spot is fine, else the reason it is not.
function placeProblem(x,y,k){
  if(x<1||y<1||x>MAP-1||y>MAP-1)return '太近地圖邊';
  if(!fogKnown({x,y}))return '未探索嘅地方';
  if(AREAS[activeArea].exits.some(e=>Math.hypot(x-e.x,y-e.y)<e.r+1.2))return '唔可以起喺出口';
  if(CAMPS.some(c=>c.area===activeArea&&Math.hypot(x-c.x,y-c.y)<4.5))return '唔可以起喺營寨';
  if(OUTPOSTS.some(d=>d.area===activeArea&&Math.hypot(x-d.x,y-d.y)<3))return '唔可以起喺關所';
  if(props.some(p=>Math.hypot(x-p.x,y-p.y)<(p.wall&&isWallKind(k)?.9:(p.s||.5)*.62+.9)))return '呢度有嘢阻住';
  if(piles.some(p=>Math.hypot(x-p.x,y-p.y)<1.1))return '呢度有嘢阻住';
  return '';
}
function addBuilt(area,k,x,y,restoring=false){
  const a=areaStates[area],live=area===activeArea,d=BUILDS[k];
  if(k==='chest'){
    if(restoring)return;
    const p={pile:true,permanent:true,chest:true,id:'chest-'+Math.random().toString(36).slice(2,8),name:'儲物箱',x,y,t:0,eq:{weapon:null,armor:null},pack:[]};
    (live?piles:a.piles).push(p);return p;
  }
  const p={x,y,s:d.s,h:d.h,c:k==='bed'?[150,120,90]:[110,90,60],built:k,occ:null};
  if(k==='field')p.sown=null;
  if(WORK_AT[k]){p.q=[];p.prog=0;p.paid=false}
  if(isWallKind(k))initWall(p,k);
  if(k==='bed'){p.bed=1;p.own=1;(a.beds||(a.beds=[])).push(p);if(live)BEDS.push(p)}
  a.props.push(p);if(live)props.push(p);return p;
}
function buildMenu(sx,sy){
  const opts=Object.entries(BUILDS).map(([k,d])=>({label:`${d.name} · ${costText(d.cost)}`,sub:`${d.sub} · 全隊有：${Object.keys(d.cost).map(id=>`${ITEMS[id].name}${teamCount(id)}`).join(' ')}`,fn:()=>{
    if(!canAfford(d.cost)){toast('材料唔夠；砍樹得木材，麻繩喺村店買');return}
    buildMode=k;buildStart=null;toast(d.line?`點起點，再點終點，起一條${d.name}`:`點空地放置${d.name}（${d.sec} 秒）`)}}));
  if(buildMode)opts.push({label:'取消建造',fn:()=>{buildMode=null;buildStart=null;toast('已取消建造')}});
  showMenu(sx,sy,'建造 · 揀完再點空地',opts);
}
function tryPlace(sx,sy){
  const k=buildMode,w=world(sx,sy),why=placeProblem(w.x,w.y,k);
  if(why&&!(BUILDS[k].line&&buildStart)){toast(why);return}
  if(isWallKind(k)){tryPlaceWall(k,w);return}
  const v=issueOne({t:'build',k,x:w.x,y:w.y},w,'揀咗嘅隊友做唔到');
  if(v){buildMode=null;toast(`${v.name} 去起${BUILDS[k].name}`)}
}
/* ---------- 田同灶：播種 → 4 分鐘 → 收米同種 → 灶煮飯糰 ---------- */
const FIELD_SEC=240;
function fieldStage(p){if(p.sown==null)return 0;const g=(simT-p.sown)/FIELD_SEC;return g>=1?3:g>=.4?2:1}
const fieldLeft=p=>Math.max(0,Math.ceil(FIELD_SEC-(simT-p.sown)));
// 先拎背包，再拎本區儲物箱
const areaChests=()=>piles.filter(p=>p.chest);
function availItem(u,id){return countItem(u,id)+areaChests().reduce((n,c)=>n+c.pack.filter(s=>s.id===id).reduce((a,s)=>a+s.n,0),0)}
function takeItem(u,id,n){if(availItem(u,id)<n)return false;
  for(const bag of [u.pack,...areaChests().map(c=>c.pack)])for(let i=bag.length-1;i>=0&&n>0;i--){const s=bag[i];if(s.id!==id)continue;const t=Math.min(s.n,n);s.n-=t;n-=t;if(!s.n)bag.splice(i,1)}
  return true}
function pickFarm(sx,sy){for(const p of props){if(p.built!=='field'&&p.built!=='hearth'||!fogVisible(p))continue;const s=scr(p.x,p.y,4);if(Math.hypot(s.x-sx,s.y-sy)<26*Math.max(.8,cam.z))return p}return null}
function farmMenu(p,sx,sy){
  const go=(c,msg)=>{const v=issueOne(c,p,'揀咗嘅隊友做唔到');if(v)toast(`${v.name} ${msg}`)},any=sel.size?[...sel][0]:allies()[0];
  if(p.built==='hearth'){const r=any?availItem(any,'rice'):0;
    showMenu(sx,sy,`灶 · 米 ${r}`,[{label:'煮飯糰',sub:'2 米 → 1 飯糰 · 8 秒 · 米由背包或儲物箱拎',fn:()=>{if(r<2){toast('米唔夠（要 2 粒）');return}go({t:'cook',node:p},'去煮飯')}}]);return}
  const st=fieldStage(p);
  if(st===3){go({t:'reap',node:p},'去收割');return}
  if(st>0){toast(`禾苗生長中 · 仲有約 ${fieldLeft(p)} 秒`);return}
  const n=any?availItem(any,'seed'):0;
  showMenu(sx,sy,`田 · 空 · 稻種 ${n}`,[{label:'播種',sub:'用 1 粒稻種 · 稻種喺村店買，收割會再得',fn:()=>{if(!n){toast('冇稻種；村店有得買');return}go({t:'sow',node:p},'去播種')}}]);
}
function drawFarm(p,sc){
  const z=cam.z;
  if(p.built==='hearth'){inkRect(sc.x-9*z,sc.y-6*z,18*z,6*z,'#6b6258');inkRect(sc.x-5*z,sc.y-10*z,10*z,4*z,'#3a302a');
    ctx.fillStyle='#e8803a';ctx.beginPath();ctx.arc(sc.x,sc.y-8*z,3*z,0,7);ctx.fill();return}
  const st=fieldStage(p);ctx.fillStyle=st?'#5a4128':'#6e5236';ctx.beginPath();
  ctx.moveTo(sc.x,sc.y-14*z);ctx.lineTo(sc.x+26*z,sc.y-1*z);ctx.lineTo(sc.x,sc.y+12*z);ctx.lineTo(sc.x-26*z,sc.y-1*z);ctx.closePath();ctx.fill();
  if(!st)return;const col=['','#8fbf5a','#5f9a3a','#d9b443'][st],hh=[0,3,6,8][st]*z;ctx.strokeStyle=col;ctx.lineWidth=1.6*z;
  for(let i=-2;i<=2;i++)for(let j=-1;j<=1;j++){const x=sc.x+i*8*z+j*4*z,y=sc.y-1*z+j*5*z-i*1.5*z;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-hh);ctx.stroke()}
  if(st===3)label('可收割',sc.x,sc.y-18*z,'#f0c45a',9);
}
/* ---------- 工坊：煉爐、作業台、鍛冶台。排隊做，唔收工錢 ---------- */
const WORK_RECIPES=[
  {id:'steel',at:'smelter',needs:{iron:2,wood:1},sec:60},
  {id:'cooked_meat',at:'bench',needs:{meat:1},sec:6},
  {id:'medkit',at:'bench',needs:{cloth:1},sec:12},
  {id:'kit',at:'bench',needs:{iron:1,copper:1},sec:20},
  {id:'worked_armor',at:'bench',needs:{hide:3,iron:1},sec:40},
  {id:'machete',at:'anvil',needs:{iron:3,wood:1},sec:45},
  {id:'forged_blade',at:'anvil',needs:{steel:2,iron:2},sec:90,advanced:true},
  {id:'forged_armor',at:'anvil',needs:{steel:2,hide:3,iron:2},sec:90,advanced:true},
  {id:'p_forged',at:'anvil',needs:{steel:2,copper:3,p_scrap:1},sec:120,advanced:true},
  {id:'mechanism_armor',at:'anvil',needs:{mechanism:2,steel:2,iron:2},sec:120,forge:true}
];
const WORK_AT={smelter:1,bench:1,anvil:1},WORK_Q=5;
const workRecipe=id=>WORK_RECIPES.find(r=>r.id===id);
function workLock(r){return r.advanced&&!economy.smithing?'未解鎖（村工匠交鍛冶圖錄）':r.forge&&!economy.forging?'未解鎖（村工匠交機關圖樣）':''}
const workMissing=(u,r)=>Object.entries(r.needs).filter(([id,n])=>availItem(u,id)<n).map(([id,n])=>`${ITEMS[id].name}${n}`);
const workSpeed=u=>1+(u.sk.smith?.lv||1)*.04;
// 品質：鍛冶越高越易出良、名
function rollQuality(u,id){if(!QUALITY_ITEMS.includes(id))return id;const lv=u.sk.smith?.lv||1,r=Math.random();
  if(r<Math.max(0,(lv-8)*.02))return `${id}~2`;if(r<Math.min(.7,lv*.035))return `${id}~1`;return id}
// 隊列頭件可唔可以開工（已付料或者夠料）
const workReady=(u,p)=>p.q.length&&(p.paid||!workLock(workRecipe(p.q[0]))&&!workMissing(u,workRecipe(p.q[0])).length);
function pickWork(sx,sy){for(const p of props){if(!WORK_AT[p.built]||!fogVisible(p))continue;const s=scr(p.x,p.y,6);if(Math.hypot(s.x-sx,s.y-sy)<26*Math.max(.8,cam.z))return p}return null}
function workMenu(p,sx,sy){
  const any=sel.size?[...sel][0]:allies()[0],name=BUILDS[p.built].name;
  const opts=WORK_RECIPES.filter(r=>r.at===p.built).map(r=>{const lock=workLock(r),miss=any?workMissing(any,r):[];
    return{label:`${ITEMS[r.id].name} · ${r.sec} 秒`,sub:lock||`${costText(r.needs)}${miss.length?` · 欠 ${miss.join(' ')}`:' · 料夠'}${QUALITY_ITEMS.includes(r.id)?' · 有機會出良品':''}`,fn:()=>{
      if(lock){toast(lock);return}if(p.q.length>=WORK_Q){toast(`隊列滿咗（最多 ${WORK_Q} 件）`);return}
      p.q.push(r.id);toast(`${name}排咗：${ITEMS[r.id].name}（${p.q.length}/${WORK_Q}）`);
      if(any&&!any.down&&!any.dead&&!(any.job==='craft'))go()}}});
  const go=()=>{const v=issueOne({t:'craft',node:p},p,'揀咗嘅隊友做唔到');if(v)toast(`${v.name} 去${name}做工`)};
  if(p.q.length){opts.push({label:'叫隊友開工',sub:`隊列：${p.q.map(id=>ITEMS[id].name).join('、')}`,fn:go});
    opts.push({label:'清空隊列',sub:p.paid?'已入爐嘅料會退返落地':'',fn:()=>{if(p.paid)for(const [id,n] of Object.entries(workRecipe(p.q[0]).needs))dropAt(p,id,n);p.q=[];p.prog=0;p.paid=false;toast('隊列清空')}})}
  showMenu(sx,sy,`${name}${p.q.length?` · ${p.q.length}/${WORK_Q} · ${Math.floor(p.prog)}秒`:' · 空'}`,opts);
}
function dropAt(p,id,n){piles.push({pile:true,x:p.x+.5,y:p.y+.5,t:0,eq:{weapon:null,armor:null},pack:[{id,n}]})}
// 一格時間嘅工作；做完返 true
function workTick(u,p,dt){
  const r=workRecipe(p.q[0]);if(!r){p.q.shift();return false}
  if(!p.paid){if(workLock(r)||workMissing(u,r).length)return false;for(const [id,n] of Object.entries(r.needs))takeItem(u,id,n);p.paid=true;p.prog=0}
  p.prog+=dt*workSpeed(u);train(u,'smith',dt*.06);
  if(p.prog<r.sec)return true;
  const out=rollQuality(u,r.id);addItem(u,out,1);train(u,'smith',r.sec*.02);p.q.shift();p.prog=0;p.paid=false;
  float(u,`+1 ${ITEMS[out].name}`,out.includes('~')?'#f0c45a':'#e8c79a');return true;
}
function drawWork(p,sc){
  const z=cam.z,k=p.built,busy=p.paid;
  if(k==='smelter'){inkRect(sc.x-8*z,sc.y-16*z,16*z,16*z,'#6b5a4a');inkRect(sc.x-4*z,sc.y-22*z,8*z,6*z,'#4a3e34');
    ctx.fillStyle=busy?'#f08a3a':'#3a2e26';ctx.beginPath();ctx.arc(sc.x,sc.y-6*z,3.5*z,0,7);ctx.fill()}
  else if(k==='bench'){inkRect(sc.x-12*z,sc.y-9*z,24*z,4*z,'#8a6a46');inkRect(sc.x-10*z,sc.y-5*z,3*z,5*z,'#5f4630');inkRect(sc.x+7*z,sc.y-5*z,3*z,5*z,'#5f4630')}
  else{inkRect(sc.x-6*z,sc.y-6*z,12*z,6*z,'#5a4a3a');inkRect(sc.x-10*z,sc.y-11*z,20*z,5*z,'#7d8488');inkRect(sc.x+8*z,sc.y-11*z,4*z,3*z,'#7d8488')}
  if(p.q.length){const r=workRecipe(p.q[0]);label(busy?`${ITEMS[p.q[0]].name} ${Math.floor(p.prog/r.sec*100)}%`:`排隊 ${p.q.length}`,sc.x,sc.y-(k==='smelter'?28:18)*z,busy?'#f0c45a':'#d8d0b8',9)}
}
function treeWood(t){if(t.wood===0&&simT-t.cut>240)t.wood=3;return t.wood??3}
function drawBuilt(p,sc){
  const z=cam.z;
  if(p.built==='field'||p.built==='hearth'){drawFarm(p,sc);return}
  if(WORK_AT[p.built]){drawWork(p,sc);return}
  if(p.wall){drawWall(p,sc);return}
  if(p.built==='bed'){inkRect(sc.x-11*z,sc.y-7*z,22*z,8*z,'#8a6a46');inkRect(sc.x-10*z,sc.y-10*z,7*z,4*z,'#d9cfb4');return}
  inkRect(sc.x-13*z,sc.y-20*z,26*z,20*z,'rgba(70,50,30,.25)');
  ctx.strokeStyle='#2c2016';ctx.lineWidth=1.6*z;
  for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(sc.x+i*4*z,sc.y-20*z);ctx.lineTo(sc.x+i*4*z,sc.y);ctx.stroke()}
  inkRect(sc.x-14*z,sc.y-23*z,28*z,4*z,'#70513a');
  if(p.occ)label('囚',sc.x,sc.y-28*z,'#f0c45a',10);
}

/* ---------- 俘虜：揹落籠，喺籠入面先可以招降／贖金／釋放／處決 ---------- */
const cageOf=b=>props.find(p=>p.built==='cage'&&p.occ===b);
function cageOcc(c){if(c.occ&&(c.occ.gone||!units.includes(c.occ)||c.occ.dead||!c.occ.captive))c.occ=null;return c.occ}
function canJail(b){return !b.dead&&b.down&&!b.captive&&b.team!=='a'&&!b.pile&&b.kind!=='dog'&&b!==TRADER&&b!==INNKEEPER&&b.kind!=='border_refugee'&&!(b.team==='g'&&!b.kind)}
function jailOption(b){
  if(!canJail(b))return null;
  const free=props.filter(p=>p.built==='cage'&&!cageOcc(p));
  if(!free.length)return {label:'押入籠',sub:'要先起一個空籠（建造 → 籠）',fn:()=>toast('冇空籠；撳「建造」起一個')};
  const cage=nearest(free,b);
  return {label:'押入籠',sub:'揹去最近嘅空籠，喺籠入面先可招降／贖金／釋放／處決',fn:()=>{const v=issueOne({t:'jail',body:b,cage},b,'揀咗嘅隊友已經揹緊人',a=>!a.carry);if(v)toast(`${v.name} 去押 ${b.name} 入籠`)}};
}
function pickCage(sx,sy){for(const p of props){if(p.built!=='cage'||!fogVisible(p))continue;const s=scr(p.x,p.y,10);if(Math.hypot(s.x-sx,s.y-sy)<26*Math.max(.8,cam.z))return p}return null}
const unitLevel=b=>{const v=Object.values(b.sk);return v.reduce((n,s)=>n+s.lv,0)/Math.max(1,v.length)};
function sideRep(b){const s=outpostSide(b);return s?campaign.rep[s]:repTown}
function persuadeChance(b){return clamp(.55-(unitLevel(b)-1)*.04+(1-pct(b))*.3+sideRep(b)/250-(b.tries||0)*.1,.05,.9)}
function ransomValue(b){return Math.round((40+unitLevel(b)*12)*(outpostInfo(b)?.role==='commander'?3:1))}
function factionRep(b,d){const s=outpostSide(b);if(s)campaign.rep[s]=clamp(Math.round(campaign.rep[s]+d),-100,100)}
function freeCage(b){const c=cageOf(b);if(c)c.occ=null;b.captive=false}
function prisonerMenu(b,sx,sy){
  const side=outpostSide(b),pc=Math.round(persuadeChance(b)*100);
  const opts=[
    {label:`招降 · 成功率約 ${pc}%`,sub:'受等級、傷勢、關係影響；失敗後再試更難',fn:()=>{
      if(allSquad().length>=SQUAD_MAX){toast(`隊伍已滿（最多 ${SQUAD_MAX} 人）`);return}
      if(Math.random()<persuadeChance(b)){
        freeCage(b);b.team='a';b.kind='recruit';b.down=false;for(const k of ['head','torso'])b.p[k].hp=Math.max(b.p[k].hp,b.p[k].max*.5);
        b.rules={flee:true,rescue:false,fight:true};b.role=b.role||'降兵';b.cmd=[];b.aggro=false;b.lastHit=null;b.food=Math.max(b.food||0,60);
        factionRep(b,-15);sel.add(b);buildSquadUI();toast(`${b.name} 願意加入隊伍`)}
      else{b.tries=(b.tries||0)+1;toast(`${b.name} 唔肯降`)}}},
  ];
  if(side)opts.push({label:`贖金 · 收 ${ransomValue(b)} 文`,sub:`賣返畀${FACTIONS[side].name}；佢哋對你嘅關係 −5`,fn:()=>{money+=ransomValue(b);factionRep(b,-5);freeCage(b);b.gone=true;toast(`收到贖金 ${ransomValue(b)} 文`)}});
  opts.push({label:'釋放',sub:side?`放佢走；${FACTIONS[side].name}關係 +5`:'放佢走',fn:()=>{factionRep(b,5);freeCage(b);b.gone=true;toast(`${b.name} 走咗`)}});
  opts.push({label:'處決',sub:side?`${FACTIONS[side].name}關係 −20，唔可撤回`:'唔可撤回',fn:()=>{factionRep(b,-20);if(side)addWanted(side,25,'處決俘虜');freeCage(b);kill(b);toast(`${b.name} 被處決`)}});
  showMenu(sx,sy,`俘虜 · ${b.name}`,opts);
}
function cageMenu(c,sx,sy){const b=cageOcc(c);if(b)prisonerMenu(b,sx,sy);else toast('空籠；揹倒地嘅敵人過嚟（撳佢 → 押入籠）')}

/* ---------- 自動工作：冇指令、冇敵人時，隊友按「工作」設定自己做嘢 ---------- */
const STORE_TYPES=['ore','goods']; // food and medkits stay with the worker
const depositable=u=>u.pack.some(s=>STORE_TYPES.includes(ITEMS[s.id].type));
function autoDeposit(u,dt){
  if(!depositable(u))return false;
  const ch=nearest(piles.filter(p=>p.chest),u);if(!ch)return false;
  if(dist(u,ch)>1){u.state='存貨入箱';step(u,ch.x,ch.y,dt);return true}
  for(let i=u.pack.length-1;i>=0;i--){const s=u.pack[i];if(!STORE_TYPES.includes(ITEMS[s.id].type))continue;
    const t=ch.pack.find(x=>x.id===s.id&&ITEMS[s.id].stack);if(t)t.n+=s.n;else ch.pack.push({id:s.id,n:s.n});u.pack.splice(i,1)}
  float(u,'存貨入箱','#e8c79a');return true;
}
// Returns true when it handled this frame (moved, worked or issued a command).
function autoWork(u,dt){
  const j=u.job;if(!j||j==='idle')return false;
  if(u.food<25&&!feedingSource(u,u)){u.state='餓 · 停工';return false}
  if(load(u)>cap(u)*.7&&autoDeposit(u,dt))return true;
  if(pct(u)<.6){const bed=nearest(BEDS.filter(b=>b.own),u);if(bed){u.cmd=[{t:'sleep',bed,auto:true}];return true}}
  if(j==='guard'){
    const pat=nearest(allies().filter(a=>a!==u&&!a.down&&hurt(a)&&canTreat(u,a)&&dist(u,a)<10),u);
    if(pat){u.state='醫'+pat.name;if(dist(u,pat)>.8)step(u,pat.x,pat.y,dt);else treat(u,pat,dt);return true}
    const home=nearest([...props.filter(p=>p.built),...piles.filter(p=>p.chest)],u);
    if(!home){u.state='守家 · 未有基地';return false}
    if(dist(u,home)>3){u.state='返基地';step(u,home.x,home.y,dt)}else u.state='守家';
    return true;
  }
  u.autoT=(u.autoT||0)-dt;if(u.autoT>0)return false;u.autoT=1;
  if(load(u)>cap(u)*1.6){u.state='揹唔郁 · 起個儲物箱';return false}
  if(j==='chop'){const t=nearest(props.filter(p=>p.tree&&treeWood(p)>0&&fogKnown(p)),u);
    if(t){u.cmd=[{t:'chop',node:t,auto:true}];return true}u.state='冇樹可砍';return false}
  if(j==='mine'){const o=nearest(ORES.filter(fogKnown),u);
    if(o){u.cmd=[{t:'mine',node:o,auto:true}];return true}u.state='冇礦可採';return false}
  if(j==='farm'){const fs=props.filter(p=>p.built==='field');
    if(!fs.length){u.state='耕田 · 未有田';return false}
    const ripe=nearest(fs.filter(p=>fieldStage(p)===3),u);if(ripe){u.cmd=[{t:'reap',node:ripe,auto:true}];return true}
    const empty=nearest(fs.filter(p=>fieldStage(p)===0),u);if(empty&&availItem(u,'seed')){u.cmd=[{t:'sow',node:empty,auto:true}];return true}
    const h=nearest(props.filter(p=>p.built==='hearth'),u);if(h&&availItem(u,'rice')>=2){u.cmd=[{t:'cook',node:h,auto:true}];return true}
    u.state=empty?'耕田 · 冇稻種':'耕田 · 等禾熟';return false}
  if(j==='craft'){const wr=nearest(props.filter(p=>p.wall&&p.hp<p.max*.7),u);if(wr&&availItem(u,'wood')>=1){u.cmd=[{t:'repair',node:wr,auto:true}];return true}
    const ws=props.filter(p=>WORK_AT[p.built]);
    if(!ws.length){u.state='做工 · 未有工坊';return false}
    const p=nearest(ws.filter(p=>workReady(u,p)),u);if(p){u.cmd=[{t:'craft',node:p,auto:true}];return true}
    u.state=ws.some(p=>p.q.length)?'做工 · 冇料':'做工 · 隊列空';return false}
  return false;
}

/* ---------- 懸賞：打勢力嘅人會被通緝，過百有賞金獵人上門 ---------- */
const SIDES=['takeda','uesugi','ikko'];
function wantedOf(){const w=campaign.wanted||(campaign.wanted={takeda:0,uesugi:0,ikko:0,why:{}});if(!w.why)w.why={};w.ikko??=0;return w}
function addWanted(side,n,why){const w=wantedOf(),before=w[side];w[side]=Math.min(1000,before+n);w.why[side]=why;
  if(Math.floor(w[side]/100)>Math.floor(before/100))toast(`${FACTIONS[side].name}懸賞你 ${Math.round(w[side])} 文！`);
  campaign.anger[side]=true;}
function onDowned(t){
  if(!t.bountied&&(t.team==='s'||t.team==='e')&&(t.hitBy==='s'||t.hitBy==='e')&&t.hitBy!==t.team){t.bountied=true;logClash(t);return}
  if(t.bountied||t.hitBy!=='a')return;const side=outpostSide(t);if(!side)return;t.bountied=true;
  if(/^hunter_/.test(t.kind||'')){const w=wantedOf();w[side]=Math.floor(w[side]/2);return}
  addWanted(side,outpostInfo(t)?.role==='commander'?40:15,outpostInfo(t)?.role==='commander'?'打倒守將':'打倒士兵');
}
function wantedText(side){const w=wantedOf(),n=Math.round(w[side]);return n>0?` · 懸賞 ${n} 文（${w.why[side]||'通緝'}）`:''}
function hunterWave(side){
  const w=wantedOf(),n=Math.min(3,1+Math.floor(w[side]/150)),camp=CAMPS.find(c=>c.side===side);if(!camp)return;
  const from=camp.area===activeArea?{x:camp.x,y:camp.y+2.6}:arrivalPoint(activeArea,camp.area),s=FACTIONS[side];
  for(let i=0;i<n;i++){const kind=`hunter_${side}_${Math.floor(simT)}_${i}`;
    borderSpawn(activeArea,{id:kind,kind,team:'g',name:`${s.name}賞金獵人`,color:s.color,base:50+i*4,x:from.x+i*.7,y:from.y+(i%2)*.7,home:{x:from.x,y:from.y},aggroR:12,leash:30,eq:{weapon:i?'knife':'machete',armor:'leather'},lv:{atk:12+i*2,tough:12,dod:9},pack:[{id:'ration',n:1}]})}
  toast(`${s.name}派咗賞金獵人搵你！`);
}
let wantedClock=0,hunterTimer={};
function tickWanted(dt){
  const w=wantedOf();
  for(const side of SIDES){
    if(w[side]>0)w[side]=Math.max(0,w[side]-dt*.1);
    if(campaign.rep[side]<=-40)campaign.anger[side]=true;
    else if(campaign.rep[side]>=40&&w[side]<20)campaign.anger[side]=false;
  }
  wantedClock+=dt;if(wantedClock<1)return;wantedClock=0;
  for(const side of SIDES){
    if(w[side]<100){hunterTimer[side]=null;continue}
    if(borderUnits().some(u=>u.kind?.startsWith(`hunter_${side}_`)&&!u.dead&&!u.down))continue;
    hunterTimer[side]=(hunterTimer[side]??rand(60,120))-1;
    if(hunterTimer[side]<=0){hunterTimer[side]=rand(150,240);hunterWave(side)}
  }
}
function washOptions(){
  const w=wantedOf(),opts=[];
  for(const side of SIDES){if(w[side]<1)continue;const nm=FACTIONS[side].name;
    for(const k of [1,5]){opts.push({label:`${nm}洗底：付 ${k*100} 文 · 懸賞 −${k}`,sub:`現時懸賞 ${Math.round(w[side])} 文`,
      fn:()=>{const n=Math.min(k,Math.ceil(w[side]));if(money<n*100){toast(`錢唔夠（要 ${n*100} 文）`);return}money-=n*100;w[side]=Math.max(0,w[side]-n);toast(`${nm}懸賞減咗 ${n}，剩 ${Math.round(w[side])}`)}})}}
  return opts;
}

/* ---------- NPC 生活：晝夜、商人日程、巡邏休息、爭地盤紀錄 ---------- */
const DAY_LEN=480; // one day = 8 minutes of sim time
const dayFrac=()=>(simT%DAY_LEN)/DAY_LEN;
const isNight=()=>dayFrac()>=.7;
const dayName=()=>{const f=dayFrac();return f<.55?'白天':f<.7?'黃昏':'夜晚'};
let lifeClock=0,clashAt=-99;
function tickLife(dt){
  lifeClock+=dt;if(lifeClock<1)return;lifeClock=0;
  const f=dayFrac(),el=$('#tint');if(!el)return;
  const a=f<.55?0:f<.7?(f-.55)/.15*.15:.32;
  el.style.opacity=a.toFixed(2);
}
// Trader and innkeeper wander near their post by day; trader stands by the inn at night.
function npcLife(u,dt){
  u.post=u===TRADER?{x:4.9,y:4.4}:{x:3.6,y:6.4}; // fixed posts so a night save cannot move them
  if(allies().some(a=>a.cmd[0]?.npc===u))return;
  let goal=u.post,r=1.1;
  if(u===TRADER&&isNight()){goal={x:4.6,y:6.7};r=.3;u.state='收檔'}
  else u.state=u===TRADER?'擺檔':'招呼客人';
  if(dist(u,goal)>r+.3){step(u,goal.x,goal.y,dt,.4);return}
  if(!u.wp||dist(u,u.wp)<.15){u.wp={x:goal.x+rand(-r,r),y:goal.y+rand(-r,r)}}
  step(u,u.wp.x,u.wp.y,dt,.18);
}
function logClash(t){
  if(simT-clashAt<60)return;clashAt=simT;
  borderLog(`${t.team==='s'?'山賊':'落武者'}同${t.team==='s'?'落武者':'山賊'}喺${AREAS[activeArea].name}交戰`);
}
function safetyDelay(){return Math.min(120,15*borderUnits().filter(u=>u.team==='e'&&!u.down&&!u.dead).length)}
