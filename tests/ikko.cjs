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
    const out={};encRng=()=>1;
    out.rel=factionRel('ikko','uesugi')==='enemy'&&factionRel('ikko','takeda')==='neutral'&&factionRel('uesugi','ikko')==='enemy';
    out.rep0=campaign.rep.ikko===0;
    // camp seeded in zenkoji, no bandits there
    const zs=areaStates.zenkoji.units;out.camp=!!zs.find(u=>u.kind==='border_lord_ikko')&&zs.filter(u=>u.kind?.startsWith('camp_guard_ikko')).length===2&&zs.some(u=>u.name==='僧兵');
    out.noBandit=!zs.some(u=>u.team==='e');
    // hunters from non-neighbour camp don't crash
    out.arrival=!!arrivalPoint('village','zenkoji');
    // go to zenkoji: village > temple > amemiya > zenkoji
    const go=to=>{const g=exitTo(activeArea,to);allies().forEach((u,i)=>{u.x=g.x+(i%2)*.4;u.y=g.y+Math.floor(i/2)*.4});return travelArea(allies(),to)};
    go('temple');go('amemiya');go('zenkoji');out.there=activeArea==='zenkoji';
    const l=units.find(u=>u.kind==='border_lord_ikko');out.lordSide=outpostSide(l)==='ikko';
    // far away: no donate
    money=1000;out.farNo=!ikkoDonate();
    allies().forEach(u=>{u.x=l.x+.8;u.y=l.y+.8});
    for(let i=0;i<6;i++)ikkoDonate();out.donate=campaign.rep.ikko===30&&money===700;
    const n0=allSquad().length,f=ikkoRecruit('follower');out.follower=!!f&&f.team==='a'&&allSquad().length===n0+1&&money===620;
    out.monkLocked=ikkoRecruit('monk')===null;
    for(let i=0;i<6;i++)ikkoDonate();const m=ikkoRecruit('monk');out.monk=!!m&&m.role==='僧兵';
    // journal buttons near abbot
    openJournal();out.buttons=[...document.querySelectorAll('#journalActions button')].filter(b=>/寄進|招/.test(b.textContent)).length===3;
    $('#bJournalClose').click();
    out.wounded=(encRng=()=>.9,spawnEncounter('wounded','zenkoji',allies()[0]))==='wounded'&&units.some(u=>encSide(u)==='ikko');encRng=()=>1;
    // hit a monk: anger, rep drop
    const g=units.find(u=>u.kind==='camp_guard_ikko_0'),rep=campaign.rep.ikko;
    attack(allies()[0],g);out.anger=campaign.anger.ikko&&campaign.rep.ikko<rep&&hostile(g,allies()[0]);
    save(true);out.save={rep:campaign.rep.ikko,n:allSquad().length};return out});
  const sv=r.save;delete r.save;
  assert.deepEqual(r,{rel:true,rep0:true,camp:true,noBandit:true,arrival:true,there:true,lordSide:true,farNo:true,donate:true,follower:true,monkLocked:true,monk:true,buttons:true,wounded:true,anger:true},JSON.stringify(r));
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const after=await p.evaluate(()=>({rep:campaign.rep.ikko,n:allSquad().length,area:activeArea,anger:campaign.anger.ikko}));
  assert.ok(after.rep===sv.rep&&after.n===sv.n&&after.area==='zenkoji'&&after.anger,JSON.stringify({sv,after}));
  // ikko raid on kanaya
  const raid=await p.evaluate(()=>{
    const go=to=>{const e=exitTo(activeArea,to);allies().forEach(u=>{u.x=e.x;u.y=e.y});return travelArea(allies(),to)};
    encRng=()=>1;go('amemiya');go('temple');go('forge');
    Math.random=()=>.99;raidTimer.kanaya=0;tickRaids(.1);
    return{area:activeArea,ikko:units.some(u=>u.kind?.startsWith('raid_ikko_kanaya')&&u.name.startsWith('一揆')),side:outpostSide(units.find(u=>u.kind?.startsWith('raid_ikko')))}});
  assert.ok(raid.area==='forge'&&raid.ikko&&raid.side==='ikko',JSON.stringify(raid));
  // old save without ikko rep/anger/wanted
  await p.evaluate(()=>{save(true);const k=SAVE_KEY;const d=JSON.parse(localStorage.getItem(k));
    delete d.campaign.rep.ikko;delete d.campaign.anger.ikko;if(d.campaign.wanted)delete d.campaign.wanted.ikko;localStorage.setItem(k,JSON.stringify(d));save=()=>{}});
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const old=await p.evaluate(()=>({rep:campaign.rep.ikko,anger:campaign.anger.ikko,w:wantedOf().ikko,ok:allies().length>0}));
  assert.deepEqual(old,{rep:0,anger:false,w:0,ok:true});
  if(process.env.SHOT){await p.evaluate(()=>{const go=to=>{const e=exitTo(activeArea,to);allies().forEach(u=>{u.x=e.x;u.y=e.y});return travelArea(allies(),to)};encRng=()=>1;go('temple');go('amemiya');go('zenkoji');
    const l=units.find(u=>u.kind==='border_lord_ikko');allies().forEach(u=>{u.x=l.x+.8;u.y=l.y+1.2});centerOn(l.x,l.y);render()});await p.waitForTimeout(400);await p.screenshot({path:process.env.SHOT})}
  assert.deepEqual(errors,[]);await b.close();console.log('PASS ikko: relations, camp at zenkoji, donate, recruit follower/monk, journal buttons, wounded, anger, raid kanaya, save, old save');
})().catch(e=>{console.error(e);process.exit(1)});
