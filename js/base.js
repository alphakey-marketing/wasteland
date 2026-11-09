'use strict';
// 基地：砍樹得木材，木材／麻繩／犬皮／鐵礦起床、儲物箱、籠。
const BUILDS={
  bed:{name:'床',cost:{wood:3,hide:1},sec:4,s:.55,h:5,sub:'瞓覺回血，免租'},
  chest:{name:'儲物箱',cost:{wood:4,rope:1},sec:4,sub:'隊友可存取物品'},
  cage:{name:'籠',cost:{wood:4,iron:2,rope:2},sec:4,s:.9,h:18,sub:'關一個人（階段 3 用）'}
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
function placeProblem(x,y){
  if(x<1||y<1||x>MAP-1||y>MAP-1)return '太近地圖邊';
  if(!fogKnown({x,y}))return '未探索嘅地方';
  if(AREAS[activeArea].exits.some(e=>Math.hypot(x-e.x,y-e.y)<e.r+1.2))return '唔可以起喺出口';
  if(CAMPS.some(c=>c.area===activeArea&&Math.hypot(x-c.x,y-c.y)<4.5))return '唔可以起喺營寨';
  if(OUTPOSTS.some(d=>d.area===activeArea&&Math.hypot(x-d.x,y-d.y)<3))return '唔可以起喺關所';
  if(props.some(p=>Math.hypot(x-p.x,y-p.y)<(p.s||.5)*.62+.9))return '呢度有嘢阻住';
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
  if(k==='bed'){p.bed=1;p.own=1;(a.beds||(a.beds=[])).push(p);if(live)BEDS.push(p)}
  a.props.push(p);if(live)props.push(p);return p;
}
function buildMenu(sx,sy){
  const opts=Object.entries(BUILDS).map(([k,d])=>({label:`${d.name} · ${costText(d.cost)}`,sub:`${d.sub} · 全隊有：${Object.keys(d.cost).map(id=>`${ITEMS[id].name}${teamCount(id)}`).join(' ')}`,fn:()=>{
    if(!canAfford(d.cost)){toast('材料唔夠；砍樹得木材，麻繩喺村店買');return}
    buildMode=k;toast(`點空地放置${d.name}（${d.sec} 秒）`)}}));
  if(buildMode)opts.push({label:'取消建造',fn:()=>{buildMode=null;toast('已取消建造')}});
  showMenu(sx,sy,'建造 · 揀完再點空地',opts);
}
function tryPlace(sx,sy){
  const k=buildMode,w=world(sx,sy),why=placeProblem(w.x,w.y);
  if(why){toast(why);return}
  const v=issueOne({t:'build',k,x:w.x,y:w.y},w,'揀咗嘅隊友做唔到');
  if(v){buildMode=null;toast(`${v.name} 去起${BUILDS[k].name}`)}
}
function treeWood(t){if(t.wood===0&&simT-t.cut>240)t.wood=3;return t.wood??3}
function drawBuilt(p,sc){
  const z=cam.z;
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
  opts.push({label:'處決',sub:side?`${FACTIONS[side].name}關係 −20，唔可撤回`:'唔可撤回',fn:()=>{factionRep(b,-20);freeCage(b);kill(b);toast(`${b.name} 被處決`)}});
  showMenu(sx,sy,`俘虜 · ${b.name}`,opts);
}
function cageMenu(c,sx,sy){const b=cageOcc(c);if(b)prisonerMenu(b,sx,sy);else toast('空籠；揹倒地嘅敵人過嚟（撳佢 → 押入籠）')}
