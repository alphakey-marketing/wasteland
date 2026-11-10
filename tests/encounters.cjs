const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-dev-shm-usage']});
  const p=await b.newPage({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  await p.evaluate(()=>localStorage.clear());await p.reload({waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  const r=await p.evaluate(()=>{
    const out={},go=to=>{const g=exitTo(activeArea,to);for(const u of units)if(allies()[0]&&hostile(u,allies()[0])&&dist(u,g)<7){u.dead=true;u.down=true}
      allies().forEach((u,i)=>{u.x=g.x+(i%2)*.4;u.y=g.y+Math.floor(i/2)*.4});return travelArea(allies(),to)};
    const encs=()=>units.filter(isEnc);
    // grace: early game never
    out.grace=encChance('village','temple')===0;simT=1000;
    // chance: night and danger raise it
    const day=encChance('village','temple');simT=1000+DAY_LEN*.8;const night=encChance('village','temple');simT=1000;
    out.night=night>day;out.danger=encChance('forge','jizo')>encChance('forge','temple');out.cap=encChance('jizo','shio')<=.6;
    // forced types: each spawns
    encRng=()=>0;go('temple');out.ambush=encs().filter(u=>u.kind==='enc_ambush'&&u.team==='e').length>=2;
    out.cool=encChance('village','temple')===0;
    for(const u of encs()){u.dead=true;u.down=true}
    const seen={};for(const t of ['dogs','trader','wounded','cargo']){seen[t]=spawnEncounter(t,activeArea,allies()[0])===t}out.types=seen;
    out.dogs=encs().some(u=>u.kind==='enc_dog');out.trader=encs().some(u=>u.kind==='enc_trader');
    out.cargo=piles.some(q=>q.name==='散落貨物');
    // rescue wounded
    const w=encs().find(u=>encSide(u)),side=encSide(w),rep0=campaign.rep[side],h=allies()[0];addItem(h,'medkit',1);
    h.cmd=[{t:'rescue',body:w}];for(let i=0;i<100&&h.cmd.length;i++)simulate(.1);
    out.rescued=!w.down&&campaign.rep[side]===rep0+8;
    // rob another wounded
    spawnEncounter('wounded',activeArea,allies()[0]);const w2=encs().find(u=>encSide(u)&&u.down),s2=encSide(w2),r2=campaign.rep[s2];
    robWounded(w2);out.robbed=campaign.rep[s2]===r2-10&&wantedOf()[s2]>=40;
    // trader shop
    const tr=encs().find(u=>u.kind==='enc_trader');arriveTalk(h,tr);out.shop=!$('#shopSheet').hidden&&shopVendor.kind==='wander';
    $('#shopSheet').hidden=true;setModal(false);
    // trader leaves after life
    simT+=200;for(let i=0;i<30;i++)simulate(.1);out.traderGone=!units.includes(tr);
    // dice miss: no spawn
    encRng=()=>.99;const n0=encs().length;encCool={};go('village');out.miss=units.filter(isEnc).length===0;
    // cleanup in left area after life
    simT+=400;encRng=()=>.99;encCool={};go('temple');go('village');out.clean=areaStates.temple.units.filter(isEnc).length===0;
    // save cooldown
    encRng=()=>0;go('temple');out.coolSaved=Object.keys(packEncounters().cool).length>0;
    out.journal=encJournal().includes('%');
    save(true);return out});
  assert.deepEqual(r,{grace:true,night:true,danger:true,cap:true,ambush:true,cool:true,types:{dogs:true,trader:true,wounded:true,cargo:true},dogs:true,trader:true,cargo:true,
    rescued:true,robbed:true,shop:true,traderGone:true,miss:true,clean:true,coolSaved:true,journal:true},JSON.stringify(r));
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const after=await p.evaluate(()=>({area:activeArea,cool:encChance('village','temple')===0,enc:units.filter(isEnc).length}));
  assert.ok(after.area==='temple'&&after.cool&&after.enc>0,JSON.stringify(after));
  assert.deepEqual(errors,[]);await b.close();console.log('PASS encounters: grace, odds by night/danger, 5 types, rescue, rob, trader shop+leave, cleanup, cooldown save');
})().catch(e=>{console.error(e);process.exit(1)});
