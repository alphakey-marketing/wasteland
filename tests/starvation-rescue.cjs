const assert=require('node:assert/strict');const {chromium}=require('playwright');
let browser;const errors=[];
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage({viewport:{width:360,height:844},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.stack));
  await page.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await page.click('#bStart');
  await page.evaluate(()=>{
    setPaused(true);autoPause=false;
    window.fixture=()=>{hardcore=true;units.filter(u=>u.team!=='a').forEach(u=>{u.dead=true;u.down=true});
      for(const u of allies()){u.dead=u.down=false;u.starvation=null;u.carry=u.carriedBy=null;u.p=mkParts(u.base);u.bleed=0;u.pack=[];u.food=100;u.cmd=[];u.rules={flee:false,rescue:false,fight:false};u.x=8;u.y=8;u.interruptT=0}
      return allies()[0]};
    window.advance=t=>{for(let n=0;n<Math.round(t*10);n++)simulate(.1)};
  });
  function truth(o){for(const[k,v]of Object.entries(o))assert.equal(v,true,k)}
  truth(await page.evaluate(()=>{
    const u=fixture();u.food=0;u.p.torso.hp=.001;advance(.1);
    const faint=u.down&&u.starvation.phase==='faint';advance(15);
    const rise=!u.down&&u.starvation.phase==='grace'&&u.starvation.left>118;
    advance(121);getUp(u,.5);const dying=u.down&&!u.dead&&u.starvation.phase==='dying';
    advance(91);return{faint,rise,dying,death:u.dead};
  }));
  truth(await page.evaluate(()=>{
    const u=fixture();u.food=0;u.p.torso.hp=-1;checkWounds(u,'torso','');advance(1);
    const battle=!u.starvation;u.down=false;u.p.torso.hp=.001;advance(.1);
    const h=allies()[1];h.carry=u;u.carriedBy=h;advance(16);
    const carried=u.down&&u.starvation.phase==='faint';drop(h);advance(.1);
    return{battle,carried,ground:!u.down&&u.starvation.phase==='grace'&&u.starvation.left===120};
  }));
  truth(await page.evaluate(()=>{
    const u=fixture(),h=allies()[1];u.food=0;u.down=true;u.starvation={phase:'dying',left:30};
    h.pack=[{id:'meat',n:2}];eatFood(h,u,'meat');const partial=u.starvation?.left===30;
    eatFood(h,u,'meat');const rescued=!u.starvation&&u.food===30&&!u.dead&&u.down;
    u.food=0;u.down=false;u.p.torso.hp=.001;advance(.1);
    return{partial,rescued,newChance:u.starvation.phase==='faint'};
  }));
  await page.evaluate(()=>{const u=fixture(),h=allies()[1];u.food=0;u.down=true;u.starvation={phase:'dying',left:60};h.pack=[{id:'ration',n:1}];sel.clear();sel.add(h);openCard(u)});
  await page.click('#bFeed');
  truth(await page.evaluate(()=>{const u=allies()[0],h=allies()[1];const queued=h.cmd[0]?.t==='feed';advance(8);return{queued,rescued:!u.starvation&&u.food>25,consumed:!h.pack.length}}));
  truth(await page.evaluate(()=>{
    const u=fixture(),h=allies()[1];u.food=0;u.down=true;u.starvation={phase:'dying',left:50};u.pack=[{id:'ration',n:1}];h.carry=u;u.carriedBy=h;
    const c={t:'feed',pat:u};h.cmd=[c];runFeed(h,c,2);
    const ownBag=!u.starvation&&!u.pack.length&&u.carriedBy===h&&u.down;
    u.food=0;u.starvation={phase:'dying',left:10};h.cmd=[{t:'feed',pat:u}];runFeed(h,h.cmd[0],2);
    const empty=u.starvation.left===10&&!h.cmd.length;
    u.carriedBy=allies()[2];h.pack=[{id:'ration',n:1}];h.cmd=[{t:'feed',pat:u}];runFeed(h,h.cmd[0],2);
    return{ownBag,empty,otherCarrier:h.pack[0].n===1&&u.starvation.left===10};
  }));
  truth(await page.evaluate(()=>{
    const u=fixture(),h=allies()[1];u.food=0;u.down=true;u.starvation={phase:'dying',left:40};h.rules.rescue=true;
    advance(3);const noBypass=u.down&&u.starvation?.phase==='dying';h.pack=[{id:'ration',n:1}];advance(12);
    return{noBypass,autoRescue:!u.starvation&&u.food>25};
  }));
  truth(await page.evaluate(()=>{
    const u=fixture(),h=allies()[1];u.food=0;u.down=true;u.starvation={phase:'dying',left:50};h.pack=[{id:'ration',n:1}];h.interruptT=1;
    h.cmd=[{t:'feed',pat:u}];runFeed(h,h.cmd[0],2);const interrupted=!!u.starvation&&h.pack[0].n===1;
    h.cmd=[];h.interruptT=0;h.carry=u;u.carriedBy=h;const g=AREAS.village.gate;h.x=g.x;h.y=g.y;
    travelArea([h,u],'temple');const travel=u.starvation.left===50&&u.carriedBy===h;
    switchReserve('village');advance(2);const inactive=u.starvation.left===50;
    switchReserve('temple');return{interrupted,travel,inactive};
  }));
  await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{setPaused(true);cb(t)})});
  for(const phase of['faint','grace','dying']){
    await page.evaluate(phase=>{const u=allies()[0];u.dead=false;u.food=0;u.down=phase!=='grace';u.starvation={phase,left:37.5};save(false)},phase);
    await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>setPaused(true));
    assert.deepEqual(await page.evaluate(()=>allies()[0].starvation),{phase,left:37.5});
    await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>allies()[0].starvation.left),37.5);
  }
  // Reload removed the test fixtures; test old-save defaults and casual-mode death protection directly.
  truth(await page.evaluate(()=>{
    const u=allies()[0];hardcore=false;tickHunger(u,40);getUp(u,.5);const casual=!u.dead&&u.down;
    const d=JSON.parse(serialize());for(const a of Object.values(d.areas))for(const v of a.units||[])delete v.starvation;
    for(const v of d.units)delete v.starvation;localStorage.setItem(SAVE_KEY,JSON.stringify(d));restarting=true;
    return{casual};
  }));
  await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>setPaused(true));
  assert.equal(await page.evaluate(()=>allies()[0].starvation),null);
  for(const width of[360,390]){await page.setViewportSize({width,height:844});await page.evaluate(()=>openCard(allies()[0]));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
  assert.deepEqual(errors,[]);console.log('PASS starvation stages/death, battle and carry recovery, nutrition threshold, card feeding, own bag, rescue AI, reload/pause, legacy saves and portrait layout');
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
