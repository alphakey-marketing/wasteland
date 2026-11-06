'use strict';
/* 物品定義、價錢、說明文字 */
/* ---------- items ---------- */
const ITEMS={
  knife:{name:'生鏽短刀',type:'weapon',w:2,v:20,dmg:[4,7],cd:.9},
  club:{name:'鐵棍',type:'weapon',w:5,v:45,dmg:[6,10],cd:1.2},
  machete:{name:'砍刀',type:'weapon',w:4,v:90,dmg:[7,11],cd:1.0},
  axe:{name:'重斧',type:'weapon',w:9,v:160,dmg:[11,17],cd:1.6,heavy:1},
  bow:{name:'短弓',type:'weapon',w:2,v:70,dmg:[4,7],cd:1.3,range:3.6},
  cloth:{name:'布衣',type:'armor',w:1,v:15,red:.05},
  leather:{name:'皮甲',type:'armor',w:4,v:60,red:.15},
  plate:{name:'鐵甲',type:'armor',w:10,v:220,red:.3,dod:-8},
  copper:{name:'銅礦',type:'ore',w:3,v:10,stack:1},
  iron:{name:'鐵礦',type:'ore',w:4,v:16,stack:1},
  hide:{name:'狗皮',type:'goods',w:2,v:12,stack:1},
  kit:{name:'維修工具',type:'tool',w:1,v:40,stack:1},
  p_scrap:{name:'廢鐵義肢',type:'pros',w:6,v:150,pros:'scrap'},
  p_mil:{name:'軍用義肢',type:'pros',w:5,v:700,pros:'mil'},
  coin:{name:'銅幣',type:'coin',w:0,v:1,stack:1},
  medkit:{name:'醫療包',type:'med',w:1,v:30,stack:1},
  ration:{name:'乾糧',type:'food',w:1,v:12,food:40,stack:1},
  meat:{name:'狗肉',type:'food',w:1,v:6,food:15,stack:1},
};
const FIST={name:'拳頭',dmg:[2,4],cd:.8};
const BITE={name:'咬',dmg:[2,4],cd:.9,range:.8};
const STOCK=['medkit','ration','kit','p_scrap','p_mil','machete','axe','bow','leather','plate'];
const INN_STOCK=['ration','medkit'];
const CARAVAN_STOCK=['ration','medkit','kit','axe','plate','bow','p_scrap'];
const PROS={scrap:{name:'廢鐵義肢',hp:.8,mul:.85},mil:{name:'軍用義肢',hp:1.3,mul:1.15}};
function desc(id){const it=ITEMS[id];
  if(it.type==='weapon')return `傷害 ${it.dmg[0]}–${it.dmg[1]} · 每 ${it.cd} 秒${it.range?' · 遠程':''}${it.heavy?' · 重武器（靠力量）':''} · ${it.w}kg`;
  if(it.type==='armor')return `減傷 ${Math.round(it.red*100)}%${it.dod?` · 閃避 ${it.dod}`:''} · ${it.w}kg`;
  if(it.type==='pros')return it.pros==='scrap'?'耐久 80% · 力量／速度 −15%':'耐久 130% · 力量／速度 +15%';
  if(it.type==='tool')return '修理一個義肢部位';
  if(it.type==='food')return `食咗回復飽肚 ${it.food} · ${it.w}kg`;
  if(it.type==='med')return '包紮用，每個大約醫 20 點 · 冇醫療包淨係止到血';
  return `${it.w}kg`;
}
const sellPrice=id=>{const it=ITEMS[id];return Math.max(1,Math.floor(it.v*(it.type==='ore'||it.type==='goods'?.8:.5)*(repTown>=30?1.1:1)))};
let money=100,hardcore=true,repTown=20;
const repLabel=v=>v<=-30?'敵對':v>=30?'友好':'中立';
const buyPrice=id=>Math.round(ITEMS[id].v*(repTown>=30?.9:1));

