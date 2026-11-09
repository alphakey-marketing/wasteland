'use strict';
/* 物品定義、價錢、說明文字 */
/* ---------- items ---------- */
const ITEMS={
  border_grain:{name:'失散糧袋',type:'goods',w:10,v:110,stack:1},
  border_orders:{name:'武田／上杉軍令',type:'goods',w:1,v:75,stack:1},
  knife:{name:'舊脇差',type:'weapon',w:2,v:20,dmg:[4,7],cd:.9},
  club:{name:'金碎棒',type:'weapon',w:5,v:45,dmg:[6,10],cd:1.2},
  machete:{name:'打刀',type:'weapon',w:4,v:90,dmg:[7,11],cd:1.0},
  axe:{name:'長柄戰斧',type:'weapon',w:9,v:160,dmg:[11,17],cd:1.6,heavy:1},
  bow:{name:'竹弓',type:'weapon',w:2,v:70,dmg:[4,7],cd:1.3,range:3.6},
  cloth:{name:'布衣',type:'armor',w:1,v:15,red:.05},
  leather:{name:'革札甲',type:'armor',w:4,v:60,red:.15},
  plate:{name:'鐵札甲',type:'armor',w:10,v:220,red:.3,dod:-8},
  copper:{name:'銅礦',type:'ore',w:3,v:10,stack:1},
  iron:{name:'鐵礦',type:'ore',w:4,v:16,stack:1},
  wood:{name:'木材',type:'goods',w:2,v:4,stack:1},
  rope:{name:'麻繩',type:'goods',w:.5,v:8,stack:1},
  hide:{name:'犬皮',type:'goods',w:2,v:12,stack:1},
  kit:{name:'機關修具',type:'tool',w:1,v:40,stack:1},
  p_scrap:{name:'木鐵機關肢',type:'pros',w:6,v:150,pros:'scrap'},
  p_mil:{name:'精製機關肢',type:'pros',w:5,v:700,pros:'mil'},
  coin:{name:'銅幣',type:'coin',w:0,v:1,stack:1},
  medkit:{name:'藥包',type:'med',w:1,v:30,stack:1},
  ration:{name:'飯糰',type:'food',w:1,v:12,food:40,stack:1},
  meat:{name:'犬肉',type:'food',w:1,v:6,food:15,stack:1},
  seal:{name:'舊寺銅印',type:'goods',w:2,v:180,stack:1},
  cooked_meat:{name:'炭燒犬肉',type:'food',w:.7,v:14,food:40,stack:1},
  worked_armor:{name:'工匠皮札甲',type:'armor',w:4,v:90,red:.22},
  steel:{name:'古製玉鋼',type:'goods',w:2,v:60,stack:1},
  smith_scroll:{name:'荒寺鍛冶圖錄',type:'goods',w:1,v:120},
  forged_blade:{name:'玉鋼打刀',type:'weapon',w:5,v:320,dmg:[13,19],cd:1.2},
  forged_armor:{name:'玉鋼胴丸',type:'armor',w:7,v:400,red:.38,dod:-4},
  p_forged:{name:'匠製機關肢',type:'pros',w:4,v:950,pros:'master'},
  mechanism:{name:'精密機關零件',type:'goods',w:2,v:90,stack:1},
  forge_scroll:{name:'鍛冶場機關圖樣',type:'goods',w:1,v:120},
  mechanism_armor:{name:'機關護胴',type:'armor',w:6,v:540,red:.43,dod:-2},
};
const FIST={name:'拳頭',dmg:[2,4],cd:.8};
const BITE={name:'咬',dmg:[2,4],cd:.9,range:.8};
const STOCK=['medkit','ration','kit','p_scrap','p_mil','machete','axe','bow','leather','plate'];
const INN_STOCK=['ration','medkit'];
const CARAVAN_STOCK=['ration','medkit','kit','machete','axe','plate','bow','leather','p_scrap','p_mil'];
const PROS={scrap:{name:'木鐵機關肢',hp:.8,mul:.85},mil:{name:'精製機關肢',hp:1.3,mul:1.15},master:{name:'匠製機關肢',hp:1.6,mul:1.25}};
function desc(id){const it=ITEMS[id];
  if(it.type==='quest')return `委託物品 · 帶返青葉宿屋交付 · 不可出售 · ${it.w}kg`;
  if(it.type==='goods')return `貨物 · 可賣畀商人 · ${it.w}kg`;
  if(it.type==='weapon')return `傷害 ${it.dmg[0]}–${it.dmg[1]} · 每 ${it.cd} 秒${it.range?' · 遠程':''}${it.heavy?' · 重武器（靠力量）':''} · ${it.w}kg`;
  if(it.type==='armor')return `減傷 ${Math.round(it.red*100)}%${it.dod?` · 閃避 ${it.dod}`:''} · ${it.w}kg`;
  if(it.type==='pros'){const p=PROS[it.pros];return `耐久 ${Math.round(p.hp*100)}% · 力量／速度 ${p.mul<1?'−':'+'}${Math.round(Math.abs(p.mul-1)*100)}%`}
  if(id==='smith_scroll')return '帶返青葉村商人嘅工匠頁，交出圖錄解鎖全隊進階配方';
  if(id==='forge_scroll')return '鍛冶場深處所得 · 帶返青葉村工匠解鎖機關護胴';
  if(id==='mechanism')return '鍛冶場舊料箱／工房秘藏所得 · 保留製作機關護胴';
  if(id==='steel')return '荒寺少量藏料／頭目／鍛冶場所得 · 製作材料，賣出前留意配方';
  if(it.type==='tool')return '修理一個義肢部位';
  if(it.type==='food')return `食咗回復飽肚 ${it.food} · ${it.w}kg`;
  if(it.type==='med')return '包紮用，每個大約醫 20 點 · 冇藥包淨係止到血';
  return `${it.w}kg`;
}
const sellPrice=id=>{const it=ITEMS[id];return Math.max(1,Math.floor(it.v*(it.type==='ore'||it.type==='goods'?.8:.5)*(repTown>=30?1.1:1)))};
let money=100,hardcore=true,repTown=20;
const repLabel=v=>v<=-30?'敵對':v>=30?'友好':'中立';
const buyPrice=id=>Math.round(ITEMS[id].v*(repTown>=30?.9:1));

