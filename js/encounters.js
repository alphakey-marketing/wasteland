'use strict';
/* 路上遇敵：每次轉區到達時擲一次骰。伏擊、野犬、落難商人、傷兵、散落貨物 */
const ENC_GRACE=180,ENC_COOL=120,ENC_LIFE=300,ENC_TRADER_LIFE=150;
let encCool={},encRng=Math.random;
const areaLv=id=>AREAS[id].gen?.lv??{village:0,temple:1,forge:3}[id]??1;
const areaTpl=id=>AREAS[id].gen?.tpl??{village:'forest',temple:'forest',forge:'pass'}[id]??'forest';
const isEnc=u=>typeof u.kind==='string'&&u.kind.startsWith('enc_');
function encChance(from,to,party=allies().length){
  // 開新局頭 3 分鐘唔遇敵
  if(simT<ENC_GRACE||(encCool[`${from}>${to}`]||0)>simT)return 0;
  return clamp(.15+(isNight()?.1:0)+areaLv(to)*.05-Math.max(0,party-2)*.03,0,.6);
}
function encJournal(){const ls=AREAS[activeArea].links;if(!ls.length)return '';
  return ` 路上遇敵機率：${ls.map(l=>`往${AREAS[l].name} ${Math.round(encChance(activeArea,l)*100)}%`).join('、')}（夜晚更高，人多啲會低啲）。`}
function encTypes(to){const t=areaTpl(to),lv=areaLv(to);
  return [['ambush',3+lv],...(t==='forest'||t==='river'?[['dogs',2]]:[]),['trader',2],['wounded',2],['cargo',2]]}
function pickEncType(to){const ts=encTypes(to),sum=ts.reduce((n,[,w])=>n+w,0);let r=encRng()*sum;for(const [k,w] of ts){if((r-=w)<0)return k}return ts[0][0]}
// 到達後叫：骰中先生成
function rollEncounter(from,to,walkers,arr){
  cleanEncounters();
  if(encRng()>=encChance(from,to,walkers.length))return null;
  encCool[`${from}>${to}`]=simT+ENC_COOL;
  return spawnEncounter(pickEncType(to),to,arr);
}
function spawnEncounter(type,to,arr){
  const c=AREAS[to].center,dx=c.x-arr.x,dy=c.y-arr.y,l=Math.hypot(dx,dy)||1,at={x:arr.x+dx/l*3.2,y:arr.y+dy/l*3.2},lv=Math.max(1,areaLv(to)),place=AREAS[to].name;
  const near=i=>({x:at.x+(i%3-1)*.8,y:at.y+Math.floor(i/3)*.8});
  if(type==='ambush'){const n=2+Math.floor(lv/2),name=areaTpl(to)==='ruin'?'落武者':areaTpl(to)==='pass'?'山道浪人':'山賊';
    for(let i=0;i<n;i++){const p=near(i);borderSpawn(to,{kind:'enc_ambush',team:'e',name,color:'#7d5a45',base:38+lv*6,...p,home:{...p},aggroR:9,leash:14,aggro:true,
      eq:{weapon:lv>=3||i?'machete':'club',armor:lv>=3?'plate':'leather'},lv:{atk:8+lv*5,tough:8+lv*4,dod:8+lv*2},pack:[{id:'coin',n:5+lv*4}],encUntil:simT+ENC_LIFE})}
    toast(`${place}路上：${name}伏擊！即刻行返出口可以走`);return type}
  if(type==='dogs'){const n=3+Math.floor(encRng()*3);
    for(let i=0;i<n;i++){const p=near(i);borderSpawn(to,{kind:'enc_dog',team:'w',name:'野犬',color:'#8a6a48',base:22,natural:BITE,spd:2.7,aggroR:6,leash:10,aggro:true,
      pack:[{id:'hide',n:1},{id:'meat',n:1}],lv:{tough:1,atk:2+lv,dod:5},...p,home:{...p},encUntil:simT+ENC_LIFE})}
    toast(`${place}路上：一群野犬（${n} 隻）撲埋嚟！`);return type}
  if(type==='trader'){borderSpawn(to,{kind:'enc_trader',team:'n',name:'落難商人',color:'#b89a5a',base:30,...at,home:{...at},encUntil:simT+ENC_TRADER_LIFE});
    toast(`${place}路上：遇到落難商人，點佢交易；佢唔會等好耐`);return type}
  if(type==='wounded'){const side=encRng()<.5?'takeda':'uesugi',u=borderSpawn(to,{kind:`enc_wounded_${side}`,team:'c',name:`${FACTIONS[side].name}傷兵`,color:FACTIONS[side].color,base:40,...at,home:{...at},
      eq:{weapon:'knife',armor:'leather'},pack:[{id:'ration',n:1},{id:'coin',n:12}],encUntil:simT+ENC_LIFE});
    u.down=true;u.p.torso.hp=Math.min(u.p.torso.hp,u.p.torso.max*.05);u.p.head.hp=Math.min(u.p.head.hp,u.p.head.max*.3);
    toast(`${place}路上：${u.name}倒喺路邊。救佢（藥包）加聲望；搶佢會被通緝`);return type}
  const pack=[{id:'ration',n:1+Math.floor(encRng()*2)},{id:'rope',n:1},...(lv>=2?[{id:'iron',n:2}]:[{id:'wood',n:2}]),...(lv>=3?[{id:'steel',n:1}]:[]),{id:'coin',n:6*lv}];
  const pile={pile:true,id:'enc-cargo-'+Math.floor(simT),name:'散落貨物',...at,t:0,eq:{weapon:null,armor:null},pack};
  if(to===activeArea)piles.push(pile);else areaStates[to].piles.push(pile);
  toast(`${place}路上：發現散落貨物`);return 'cargo';
}
const encSide=u=>/^enc_wounded_(takeda|uesugi)$/.exec(u.kind||'')?.[1]||null;
function rescueWounded(h,b){
  if(!countItem(h,'medkit')){toast('要 1 個藥包先救到');return false}
  useItem(h,'medkit');const side=encSide(b);b.down=false;b.bleed=0;
  for(const k of ['head','torso'])b.p[k].hp=Math.max(b.p[k].hp,b.p[k].max*.5);
  b.rescued=true;b.encUntil=simT+20;if(side)campaign.rep[side]=clamp(Math.round(campaign.rep[side]+8),-100,100);
  float(b,`多謝！${side?FACTIONS[side].name+' 聲望 +8':''}`,'#a9e08a');return true;
}
function robWounded(b){if(b.robbed||b.dead||!encSide(b))return;b.robbed=true;const side=encSide(b);
  campaign.rep[side]=clamp(Math.round(campaign.rep[side]-10),-100,100);addWanted(side,40,'搶傷兵');toast(`搶${b.name}：${FACTIONS[side].name}聲望 −10，被通緝`)}
// 過期就清走；活躍區只清商人同救咗嘅傷兵（佢哋自己行開）
function dropEnc(list,u){const i=list.indexOf(u);if(i>=0)list.splice(i,1);if(u.kind==='enc_trader')delete economy.merchants['wander:'+u.id]}
function cleanEncounters(){
  for(const [id,a] of Object.entries(areaStates)){if(id===activeArea)continue;
    for(const u of a.units.filter(isEnc)){u.encUntil??=simT+ENC_LIFE;if(simT>u.encUntil)dropEnc(a.units,u)}
    a.piles=a.piles.filter(p=>!(p.id?.startsWith('enc-cargo-')&&!p.pack.length))}
}
let encClock=0;
function tickEncounters(dt){encClock+=dt;if(encClock<2)return;encClock=0;
  for(const u of units.filter(isEnc)){u.encUntil??=simT+ENC_LIFE;
    if((u.kind==='enc_trader'||u.rescued)&&!u.down&&simT>u.encUntil){dropEnc(units,u);dropEnc(areaStates[activeArea].units,u);toast(`${u.name}已經離開`)}}
}
function packEncounters(){return{cool:Object.fromEntries(Object.entries(encCool).filter(([,t])=>t>simT))}}
function restoreEncounters(d){encCool={};if(d&&typeof d.cool==='object'&&d.cool)for(const [k,t] of Object.entries(d.cool))if(typeof t==='number'&&isFinite(t))encCool[k]=t}
