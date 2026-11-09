'use strict';
/* 存檔同讀檔 */
/* ---------- save / load ---------- */
const SAVE_KEY='wl_save_sengoku_v1',LEGACY_SAVE_KEY='wl_save_v1',BACKUP_SAVE_KEY=SAVE_KEY+'_backup',SAVE_MAX_BYTES=2*1024*1024;
let restarting=false,saveProtected=false,saveWarningShown=false;
function saveNotice(message){const el=$('#saveNotice');if(el)el.textContent=message;toast(message)}
function validateSave(d){
  const fail=()=>{throw Error('存檔內容不完整或含無效資料')},obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const num=(v,min=-1e9,max=1e9)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const text=v=>typeof v==='string'&&v.length<=160&&!/[<>]/.test(v),id=v=>num(v)||text(v);
  function walk(v,depth=0){if(depth>30)fail();if(typeof v==='number'&&!Number.isFinite(v))fail();if(!v||typeof v!=='object')return;
    for(const[k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))fail();walk(x,depth+1)}}
  function pack(a){if(!Array.isArray(a)||a.length>2000)fail();for(const s of a)if(!obj(s)||!Object.hasOwn(ITEMS,s.id)||!Number.isInteger(s.n)||s.n<1||s.n>1000000)fail()}
  function unit(u){
    if(!obj(u)||!id(u.id)||!['a','e','c','g','n','w','v','s'].includes(u.team)||!text(u.name)||!num(u.base,1,100000)||!num(u.x,-1000,1000)||!num(u.y,-1000,1000))fail();
    for(const key of ['role','kind'])if(u[key]!=null&&!text(u[key]))fail();
    if(u.color!=null&&(typeof u.color!=='string'||!/^#[0-9a-f]{3,8}$/i.test(u.color)))fail();
    if(!obj(u.p)||!obj(u.sk)||!obj(u.eq)||Object.keys(u.p).some(k=>!PARTS.some(([part])=>part===k)))fail();
    for(const[k]of PARTS){const p=u.p[k];if(!obj(p)||!num(p.hp,-1e7,1e7)||!num(p.max,1,100000)||!num(p.base,1,100000)||p.pros!=null&&!Object.hasOwn(PROS,p.pros))fail();if(p.lost!=null&&typeof p.lost!=='boolean')fail()}
    for(const[k]of SKILLS){const s=u.sk[k];if(!obj(s)||!num(s.lv,0,1000)||!num(s.xp,0,1e9))fail()}
    for(const[k,type]of [['weapon','weapon'],['armor','armor']])if(u.eq[k]!=null&&(!Object.hasOwn(ITEMS,u.eq[k])||ITEMS[u.eq[k]].type!==type))fail();
    pack(u.pack);if(u.food!=null&&!num(u.food,0,100)||u.bleed!=null&&!num(u.bleed,0,100000))fail();
    if(typeof u.down!=='boolean'||typeof u.dead!=='boolean'||u.dead&&!u.down)fail();
    for(const k of ['bounty','kitUse','spd','aggroR','leash'])if(u[k]!=null&&!num(u[k],0,1e6))fail();
    if(u.face!=null&&!num(u.face,-1,1))fail();
    if(u.home!=null&&(!obj(u.home)||!num(u.home.x,-1000,1000)||!num(u.home.y,-1000,1000)))fail();
    if(u.rules!=null){if(!obj(u.rules))fail();for(const k of ['flee','rescue','fight'])if(typeof u.rules[k]!=='boolean')fail()}
    if(u.starvation!=null&&(!obj(u.starvation)||!['faint','grace','dying'].includes(u.starvation.phase)||!num(u.starvation.left,0,120)))fail();
  }
  function group(a){if(!Array.isArray(a)||a.length>2000)fail();const byId=new Map();for(const u of a){unit(u);if(byId.has(u.id))fail();byId.set(u.id,u)}
    const carried=new Set();for(const u of a){if(u.carryId!=null){const b=byId.get(u.carryId);if(!b||b===u||!b.down||carried.has(b)||b.carryId!=null)fail();carried.add(b)}if(u.leaderId!=null&&!byId.has(u.leaderId))fail()}}
  function piles(a,area=false){if(!Array.isArray(a)||a.length>2000)fail();for(const p of a){if(!obj(p)||!num(p.x,-1000,1000)||!num(p.y,-1000,1000)||!num(p.t,0,1e9))fail();if(p.name!=null&&!text(p.name))fail();pack(p.pack);
    if(area){if(p.pile!==true||!obj(p.eq))fail();for(const[k,type]of [['weapon','weapon'],['armor','armor']])if(p.eq[k]!=null&&(!Object.hasOwn(ITEMS,p.eq[k])||ITEMS[p.eq[k]].type!==type))fail()}}}
  if(!obj(d)||d.v!==1)fail();walk(d);
  if(!num(d.money,0,1e9)||!num(d.repTown,-100,100)||!num(d.wave,0,1e6)||!num(d.simT,0,1e9))fail();
  for(const k of ['hardcore','groupSync','autoPause'])if(typeof d[k]!=='boolean')fail();
  if(d.recruitN!=null&&!num(d.recruitN,0,1e9))fail();
  if(d.hired!=null&&(!Array.isArray(d.hired)||d.hired.some(v=>!text(v))))fail();
  if(d.scavAngry!=null&&(!Array.isArray(d.scavAngry)||d.scavAngry.some(v=>!id(v))))fail();
  if(d.areas){if(!obj(d.areas)||!['village','temple','forge'].includes(d.activeArea))fail();
    for(const key of Object.keys(d.areas))if(!Object.hasOwn(AREAS,key))fail();
    const seen=new Set();for(const key of Object.keys(AREAS)){const a=d.areas[key];if(!a&&key==='forge')continue;if(!obj(a))fail();group(a.units);piles(a.piles,true);
      if(a.built!=null){if(!Array.isArray(a.built)||a.built.length>200)fail();for(const b of a.built)if(!obj(b)||!['bed','cage'].includes(b.k)||!num(b.x,-1000,1000)||!num(b.y,-1000,1000))fail()}
      for(const u of a.units){if(seen.has(u.id))fail();seen.add(u.id)}}
    if(!d.areas[d.activeArea])fail();
  }else{group(d.units);piles(d.piles||[])}
  if(d.cam&&(!obj(d.cam)||!num(d.cam.x,-1e6,1e6)||!num(d.cam.y,-1e6,1e6)||!num(d.cam.z,.05,10)))fail();
  if(d.economy!=null){if(!obj(d.economy)||!obj(d.economy.merchants))fail();for(const m of Object.values(d.economy.merchants)){
    if(!obj(m)||!Object.hasOwn(MERCHANTS,m.kind)||!num(m.cash,0,1e9)||!num(m.day,0,1e9)||!obj(m.stock))fail();for(const[k,n]of Object.entries(m.stock))if(!Object.hasOwn(ITEMS,k)||!Number.isInteger(n)||n<0||n>1e6)fail()}}
  if(d.caravan!=null){const c=d.caravan;if(!obj(c)||!['away','lost','arrive','stay','exit'].includes(c.phase)||c.area!=null&&!['village','temple'].includes(c.area)||!num(c.nextAt,0,1e9))fail();group(c.units||[])}
  if(d.exploration!=null&&(!obj(d.exploration)||typeof d.exploration.forge!=='string'||!new RegExp(`^[01]{${FOG_GRID*FOG_GRID}}$`).test(d.exploration.forge)))fail();
  if(typeof validateCampaign==='function')validateCampaign(d.campaign);
  return d;
}
function parseSave(raw){if(typeof raw!=='string'||new Blob([raw]).size>SAVE_MAX_BYTES)throw Error('存檔檔案太大（上限 2 MB）');return validateSave(JSON.parse(raw))}
function validSaveText(raw){try{parseSave(raw);return true}catch(_){return false}}
function serialize(){const keep=units.filter(u=>u.team==='a'||u.team==='e'||u.team==='c');
  return JSON.stringify({v:1,money,repTown,wave,hardcore,groupSync,autoPause,simT,recruitN,hired:[...hired],economy,caravan:packCaravan(),exploration:packExploration(),campaign:typeof packCampaign==='function'?packCampaign():undefined,activeArea,areas:packAreas(),caravanAngry,scavAngry:[...scavAngry],cam:{x:cam.x,y:cam.y,z:cam.z},
    units:keep.map(u=>({id:u.id,team:u.team,kind:u.kind,name:u.name,role:u.role,color:u.color,base:u.base,x:u.x,y:u.y,p:u.p,sk:u.sk,eq:u.eq,pack:u.pack,bounty:u.bounty,
      down:u.down,dead:u.dead,bleed:u.bleed,rules:u.rules,home:u.home,aggroR:u.aggroR,leash:u.leash,food:u.food,starvation:u.starvation,kitUse:u.kitUse,carryId:u.carry?u.carry.id:null})),
    piles:piles.map(p=>({x:p.x,y:p.y,pack:p.pack,t:p.t}))})}
function save(manual){if(restarting||saveProtected&&!manual)return;try{const raw=serialize();parseSave(raw);const old=localStorage.getItem(SAVE_KEY);
  if(validSaveText(old))localStorage.setItem(BACKUP_SAVE_KEY,old);
  localStorage.setItem(SAVE_KEY,raw);saveProtected=false;saveWarningShown=false;if(manual)saveNotice('已存檔；可匯出備份保存到其他裝置')
}catch(e){if(manual||!saveWarningShown)saveNotice('存唔到檔；請匯出備份，瀏覽器可能禁止儲存');saveWarningShown=true}}
function loadGame(){let d=null,warning='';try{const raw=localStorage.getItem(SAVE_KEY)||localStorage.getItem(LEGACY_SAVE_KEY);if(!raw)return false;
  try{d=parseSave(raw)}catch(e){saveProtected=true;const backup=localStorage.getItem(BACKUP_SAVE_KEY);if(validSaveText(backup)){d=parseSave(backup);warning='原存檔損壞，已讀取上次備份；自動存檔暫停，請匯出備份或手動存檔'}else{warning='存檔未能讀取，已保留原檔並停止自動存檔；請匯入有效備份'};
    setTimeout(()=>saveNotice(warning),500);if(!d)return false}
}catch(e){saveProtected=true;setTimeout(()=>saveNotice('瀏覽器禁止讀寫存檔；請用匯出／匯入保存進度'),500);return false}
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
  economy=d.economy||{merchants:{},smithing:false};ensureSmithCache();restoreCaravan(d.caravan);restoreExploration(d.exploration);if(typeof restoreCampaign==='function')restoreCampaign(d.campaign);
  if(d.cam&&d.areas){cam.x=d.cam.x;cam.y=d.cam.y;cam.z=d.cam.z}
  sel.clear();allies().filter(u=>!u.dead).forEach(u=>sel.add(u));
  $('#optHard').checked=hardcore;$('#optSync').checked=groupSync;$('#optAuto').checked=autoPause;
  if(!d.areas){alerted=false;cleared=false}buildSquadUI();return true}
$('#bSave').addEventListener('click',()=>save(true));
function exportSave(){try{const raw=serialize();parseSave(raw);const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download=`kikan-ronin-save-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);saveNotice('已匯出目前進度；請保留下載嘅 JSON 備份')
}catch(e){saveNotice(`匯出失敗：${e.message}`)}}
function importSaveText(raw){
  try{parseSave(raw)}catch(e){saveNotice(`未匯入：${e.message}`);return false}
  try{const current=serialize();parseSave(current);localStorage.setItem(BACKUP_SAVE_KEY,current);localStorage.setItem(SAVE_KEY,raw)}catch(e){saveNotice('匯入失敗，原有進度未被取代；請檢查瀏覽器儲存空間');return false}
  restarting=true;location.reload();return true;
}
function restoreBackup(){try{const raw=localStorage.getItem(BACKUP_SAVE_KEY);if(!validSaveText(raw)){saveNotice('冇可用嘅上次備份');return false}return importSaveText(raw)}catch(e){saveNotice('未能讀取上次備份');return false}}
$('#bExport')?.addEventListener('click',exportSave);
$('#bRestoreSave')?.addEventListener('click',restoreBackup);
$('#saveFile')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>SAVE_MAX_BYTES){saveNotice('存檔檔案太大（上限 2 MB）');e.target.value='';return}
  try{importSaveText(await file.text())}catch(_){saveNotice('未能讀取所選檔案，原有進度未變')}e.target.value='';});
let resetArm=null;$('#bReset').addEventListener('click',e=>{const now=performance.now();
  if(resetArm!==null&&now-resetArm<3000){
    restarting=true;
    try{localStorage.removeItem(SAVE_KEY);localStorage.removeItem(LEGACY_SAVE_KEY);localStorage.removeItem(BACKUP_SAVE_KEY)}catch(_){restarting=false;toast('刪唔到存檔，未有重開');return}
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

