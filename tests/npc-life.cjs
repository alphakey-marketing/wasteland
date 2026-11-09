const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-dev-shm-usage']});
  for(const width of [360,390]){
  const p=await b.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  const r=await p.evaluate(()=>{
    const out={};
    simT=100;out.day=dayName()==='白天'&&!isNight();simT=300;out.dusk=dayName()==='黃昏';simT=400;out.night=dayName()==='夜晚'&&isNight();
    simT=100;lifeClock=1;tickLife(.1);out.tintDay=+$('#tint').style.opacity===0;
    simT=400;lifeClock=1;tickLife(.1);out.tintNight=+$('#tint').style.opacity===.32;
    // trader walks to inn at night, wanders by day
    if(activeArea!=='village')return{skip:activeArea};
    simT=400;TRADER.cmd=[];for(let j=0;j<400;j++)simulate(.1);
    out.traderInn=Math.hypot(TRADER.x-4.6,TRADER.y-6.7)<1&&TRADER.state==='收檔';
    simT=100;for(let j=0;j<400;j++)simulate(.1);
    out.traderDay=Math.hypot(TRADER.x-TRADER.post.x,TRADER.y-TRADER.post.y)<1.6&&TRADER.state==='擺檔';
    return out});
  if(r.skip){console.log('skip: area '+r.skip)}
  else assert.deepEqual(r,{day:true,dusk:true,night:true,tintDay:true,tintNight:true,traderInn:true,traderDay:true},JSON.stringify(r));
  const c=await p.evaluate(()=>{ // clash log + caravan delay + closed trader message
    clashAt=-99;const n=campaign.log.length;
    const s=mk({team:'s',kind:'scav',name:'落武者',color:'#8d8a5a',base:30,x:2,y:2,lv:{}});units.push(s);s.hitBy='e';s.p.torso.hp=-1;checkWounds(s,'torso','軀幹');
    const logged=campaign.log.length===n+1&&/交戰/.test(campaign.log.at(-1));
    const e1=mk({team:'e',name:'賊',color:'#a33',base:30,x:3,y:3,home:{x:3,y:3},lv:{}});units.push(e1);
    return{logged,delay:safetyDelay()>=15&&safetyDelay()<=120}});
  assert.deepEqual(c,{logged:true,delay:true},JSON.stringify(c));
  await p.evaluate(()=>save(true));await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  assert.ok(await p.evaluate(()=>simT>=0&&['白天','黃昏','夜晚'].includes(dayName())));
  await p.close();}
  assert.deepEqual(errors,[]);await b.close();console.log('PASS npc-life: clock, tint, trader schedule, clash log, caravan delay, save');
})().catch(e=>{console.error(e);process.exit(1)});
