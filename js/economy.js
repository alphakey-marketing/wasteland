'use strict';
// One game day is ten minutes of running simulation; menus/pause do not advance it.
const ECONOMY_DAY=600;
const MERCHANTS={
  village:{title:'青葉村商人／工匠',stock:['ration','medkit','kit','knife','cloth','p_scrap'],supply:{ration:2,medkit:1,kit:1,knife:1,cloth:1,p_scrap:1},cash:180,craft:true},
  inn:{title:'青葉宿屋',stock:INN_STOCK,supply:{ration:2,medkit:1},cash:50},
  caravan:{title:'遊商',stock:CARAVAN_STOCK,supply:{ration:6,medkit:4,kit:2},cash:600}
};
const RECIPES=[
  {id:'cooked_meat',fee:2,needs:{meat:1}},
  {id:'kit',fee:6,needs:{iron:1,copper:1}},
  {id:'worked_armor',fee:18,needs:{hide:3,iron:1}},
  {id:'forged_blade',fee:100,needs:{steel:2,iron:2},advanced:true},
  {id:'forged_armor',fee:90,needs:{steel:2,hide:3,iron:2},advanced:true},
  {id:'p_forged',fee:180,needs:{steel:2,copper:3,p_scrap:1},advanced:true},
  {id:'mechanism_armor',fee:140,needs:{mechanism:2,steel:2,iron:2},forge:true}
];
let economy={merchants:{},smithing:false};
function stockCount(id){const t=ITEMS[id].type;return t==='food'?12:t==='med'?8:t==='tool'?4:t==='pros'?1:2}
const supplyCount=(kind,id)=>MERCHANTS[kind].supply[id]??1;
function rebalanceMerchant(m){
  if(m.balance===2)return;
  const def=MERCHANTS[m.kind],oldStock=m.kind==='village'?STOCK:m.kind==='inn'?INN_STOCK:CARAVAN_STOCK;
  for(const id of Object.keys(m.stock))if(oldStock.includes(id)){
    const extras=Math.max(0,m.stock[id]-stockCount(id));
    m.stock[id]=Math.min(m.stock[id],def.stock.includes(id)?supplyCount(m.kind,id):0)+extras;
    if(!m.stock[id]&&!def.stock.includes(id))delete m.stock[id];
  }
  for(const id of def.stock)if(m.stock[id]===undefined)m.stock[id]=supplyCount(m.kind,id);
  const oldCash=m.kind==='village'?900:m.kind==='inn'?250:600;
  m.cash=Math.min(m.cash,def.cash)+Math.max(0,m.cash-oldCash);m.balance=2;
}
function merchantState(kind,key=kind){
  const def=MERCHANTS[kind],day=Math.floor(simT/ECONOMY_DAY);
  let m=economy.merchants[key];
  if(!m)m=economy.merchants[key]={kind,cash:def.cash,day,balance:2,stock:Object.fromEntries(def.stock.map(id=>[id,supplyCount(kind,id)]))};
  rebalanceMerchant(m);
  if(day>m.day){m.day=day;m.cash=Math.max(m.cash,def.cash);for(const id of def.stock)m.stock[id]=Math.max(m.stock[id]||0,supplyCount(kind,id))}
  return m;
}
function buyFrom(u,m,id){
  if(!ITEMS[id]||!(m.stock[id]>0)||money<buyPrice(id))return false;
  const price=buyPrice(id);money-=price;m.cash+=price;m.stock[id]--;addItem(u,id);return true;
}
function sellTo(u,m,idx,amount=1){
  const s=u.pack[idx];if(!s)return 0;
  const price=sellPrice(s.id),n=Math.min(s.n,Math.max(0,Math.floor(amount)),Math.floor(m.cash/price));if(!n)return 0;
  m.cash-=price*n;money+=price*n;m.stock[s.id]=(m.stock[s.id]||0)+n;s.n-=n;if(!s.n)u.pack.splice(idx,1);return n;
}
function smithReason(u,r){
  if(activeArea!=='village'||!units.includes(u)||u.dead||u.down||TRADER.down||!units.includes(TRADER)||dist(u,TRADER)>1.8)return '要由可行動隊友帶材料到青葉村商人處';
  if(repTown<=-30)return '青葉村拒絕交易';
  if(inDanger(u))return '附近有敵人，暫時做唔到';
  if(r.advanced&&!economy.smithing)return '先去荒寺搵鍛冶圖錄';
  if(r.forge&&!economy.forging)return '先去廢棄鍛冶場搵機關圖樣';
  if(Object.entries(r.needs).some(([id,n])=>countItem(u,id)<n))return '背包材料不足';
  if(money<r.fee)return '工錢不足';return '';
}
function commission(u,id){
  const r=RECIPES.find(r=>r.id===id);if(!r||smithReason(u,r))return false;
  for(const [item,n]of Object.entries(r.needs))for(let i=0;i<n;i++)useItem(u,item);
  money-=r.fee;merchantState('village').cash+=r.fee;addItem(u,id);return true;
}
function learnSmithing(u,forge=false){
  const key=forge?'forging':'smithing',item=forge?'forge_scroll':'smith_scroll';
  if(economy[key]||!countItem(u,item)||smithReason(u,{needs:{},fee:0}))return false;
  useItem(u,item);economy[key]=true;return true;
}
function ensureSmithCache(){
  const a=areaStates.temple;
  if(!a.piles.some(p=>p.id==='smith-cache'))a.piles.push({pile:true,permanent:true,id:'smith-cache',name:'荒寺工匠藏箱',x:12,y:11.6,t:0,eq:{weapon:null,armor:null},pack:[{id:'smith_scroll',n:1},{id:'steel',n:2}]});
  if(activeArea==='temple')piles=[...a.piles];
}
ensureSmithCache();
