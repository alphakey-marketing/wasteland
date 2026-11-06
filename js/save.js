'use strict';
/* 存檔同讀檔 */
/* ---------- save / load ---------- */
const SAVE_KEY='wl_save_sengoku_v1',LEGACY_SAVE_KEY='wl_save_v1';
let restarting=false;
function serialize(){const keep=units.filter(u=>u.team==='a'||u.team==='e'||u.team==='c');
  return JSON.stringify({v:1,money,repTown,wave,hardcore,groupSync,autoPause,simT,recruitN,hired:[...hired],activeArea,areas:packAreas(),caravanAngry,scavAngry:[...scavAngry],cam:{x:cam.x,y:cam.y,z:cam.z},
    units:keep.map(u=>({id:u.id,team:u.team,kind:u.kind,name:u.name,role:u.role,color:u.color,base:u.base,x:u.x,y:u.y,p:u.p,sk:u.sk,eq:u.eq,pack:u.pack,bounty:u.bounty,
      down:u.down,dead:u.dead,bleed:u.bleed,rules:u.rules,home:u.home,aggroR:u.aggroR,leash:u.leash,food:u.food,kitUse:u.kitUse,carryId:u.carry?u.carry.id:null})),
    piles:piles.map(p=>({x:p.x,y:p.y,pack:p.pack,t:p.t}))})}
function save(manual){if(restarting)return;try{localStorage.setItem(SAVE_KEY,serialize());if(manual)toast('已存檔')}catch(e){if(manual)toast('存唔到檔：呢個瀏覽器唔俾儲存')}}
function loadGame(){let d=null;try{d=JSON.parse(localStorage.getItem(SAVE_KEY)||localStorage.getItem(LEGACY_SAVE_KEY)||'null')}catch(e){return false}if(!d||d.v!==1)return false;
  money=d.money;repTown=d.repTown;wave=d.wave;hardcore=d.hardcore;groupSync=d.groupSync;autoPause=d.autoPause;simT=d.simT;recruitN=d.recruitN||0;hired=new Set(d.hired||[]);
  if(d.areas){restoreAreas(d.areas,d.activeArea);caravanAngry=!!d.caravanAngry;scavAngry.clear();(d.scavAngry||[]).forEach(g=>scavAngry.add(g))}else{
  for(let i=units.length-1;i>=0;i--){const t=units[i].team;if(t==='a'||t==='e'||t==='c')units.splice(i,1)}
  const byId={};d.units.forEach(o=>{const u=mk(Object.assign({},o,{lv:null}));
    Object.assign(u,{p:o.p,sk:o.sk,eq:o.eq,pack:o.pack,down:o.down,dead:o.dead,bleed:o.bleed,food:o.food==null?100:o.food,kitUse:o.kitUse||0});
    if(u.team==='a'&&!u.rules)u.rules={flee:true,rescue:false,fight:true};units.push(u);byId[u.id]=u});
  d.units.forEach(o=>{if(o.carryId&&byId[o.carryId]){byId[o.id].carry=byId[o.carryId];byId[o.carryId].carriedBy=byId[o.id]}});
  piles=(d.piles||[]).map(p=>({pile:true,name:'地上布袋',x:p.x,y:p.y,pack:p.pack,eq:{weapon:null,armor:null},t:p.t,id:Math.random()}));
  migrateLegacyArea();
  }
  if(d.cam&&d.areas){cam.x=d.cam.x;cam.y=d.cam.y;cam.z=d.cam.z}
  sel.clear();allies().filter(u=>!u.dead).forEach(u=>sel.add(u));
  $('#optHard').checked=hardcore;$('#optSync').checked=groupSync;$('#optAuto').checked=autoPause;
  if(!d.areas){alerted=false;cleared=false}buildSquadUI();return true}
$('#bSave').addEventListener('click',()=>save(true));
let resetArm=null;$('#bReset').addEventListener('click',e=>{const now=performance.now();
  if(resetArm!==null&&now-resetArm<3000){
    restarting=true;
    try{localStorage.removeItem(SAVE_KEY);localStorage.removeItem(LEGACY_SAVE_KEY)}catch(_){restarting=false;toast('刪唔到存檔，未有重開');return}
    location.reload();return;
  }
  resetArm=now;e.currentTarget.textContent='再撳一次確認';setTimeout(()=>{if(performance.now()-resetArm>=3000){resetArm=null;e.currentTarget.textContent='重新開始'}},3000)});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save(false)});
addEventListener('pagehide',()=>save(false));
$('#bWave').addEventListener('click',()=>{if(activeArea!=='temple'){toast('先經山道去荒寺，先可以再挑戰野武士');return}spawnWave();sheet.hidden=true;toast(`第 ${wave} 波野武士出現咗（每波都強啲）`)});
$('#bHelp2').addEventListener('click',()=>{sheet.hidden=true;help.hidden=false});
const help=$('#help');
let seen=false;try{seen=localStorage.getItem('wl_help_sengoku1')==='1'}catch(e){}
if(seen)help.hidden=true;
$('#bStart').addEventListener('click',()=>{help.hidden=true;try{localStorage.setItem('wl_help_sengoku1','1')}catch(e){}});

