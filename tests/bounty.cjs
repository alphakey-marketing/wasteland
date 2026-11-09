const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const width of [360,390]){
  const p=await b.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  const r=await p.evaluate(()=>{
    const out={};const u=allies()[0];
    const s=mk({team:'g',kind:'outpost_takeda_soldier',name:'武田足輕',color:'#b95c48',base:50,x:u.x+1,y:u.y,lv:{atk:2}});units.push(s);
    s.hitBy='a';s.p.torso.hp=-1;checkWounds(s,'torso','軀幹');
    out.soldier=Math.round(wantedOf().takeda)===15&&campaign.anger.takeda===true;
    const c=mk({team:'g',kind:'outpost_takeda_commander',name:'守將',color:'#b95c48',base:50,x:u.x+1,y:u.y,lv:{atk:2}});units.push(c);
    c.hitBy='a';kill(c);out.commander=Math.round(wantedOf().takeda)===55;
    const e=mk({team:'g',kind:'outpost_takeda_soldier',name:'兵',color:'#b95c48',base:50,x:u.x,y:u.y,lv:{atk:2}});units.push(e);e.hitBy='g';kill(e);
    out.noOther=Math.round(wantedOf().takeda)===55;
    const w0=wantedOf().takeda;for(let j=0;j<100;j++)tickWanted(.1);out.decay=wantedOf().takeda<w0;
    // hunters
    wantedOf().takeda=120;hunterTimer.takeda=.5;for(let j=0;j<30;j++)tickWanted(.1);
    const h=borderUnits().filter(x=>x.kind?.startsWith('hunter_takeda_'));out.hunters=h.length>=1&&h.length<=3&&h.every(x=>hostile(x,u));
    h[0].hitBy='a';const before=wantedOf().takeda;kill(h[0]);out.halve=wantedOf().takeda<=Math.floor(before/2);
    // wash
    wantedOf().takeda=30;money=1000;const o=washOptions().find(x=>/−5/.test(x.label)&&/武田/.test(x.label));o.fn();
    out.wash=money===500&&Math.round(wantedOf().takeda)===25;
    // rep -40 turns anger on; rep 40 and low bounty turns it off
    campaign.anger.uesugi=false;campaign.rep.uesugi=-50;tickWanted(.1);out.angry=campaign.anger.uesugi===true;
    campaign.rep.uesugi=50;tickWanted(.1);out.calm=campaign.anger.uesugi===false;
    wantedOf().takeda=77;wantedOf().why.takeda='打倒士兵';
    return out});
  assert.deepEqual(r,{soldier:true,commander:true,noOther:true,decay:true,hunters:true,halve:true,wash:true,angry:true,calm:true},JSON.stringify(r));
  await p.evaluate(()=>save(true));await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  assert.equal(await p.evaluate(()=>Math.round(wantedOf().takeda)),77);
  assert.match(await p.evaluate(()=>wantedText('takeda')),/懸賞 7\d/);
  await p.close();}
  assert.deepEqual(errors,[]);await b.close();console.log('PASS bounty: gain, decay, hunters, wash, anger, save');
})().catch(e=>{console.error(e);process.exit(1)});
