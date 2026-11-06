// Run against a local HTTP server. Requires Playwright and installed Chrome.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/';
const errors=[];
let browser;
async function open(width=390){
  const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await p.route('**/favicon.ico',r=>r.fulfill({status:204}));
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  p.on('response',r=>{if(r.status()>=400)errors.push(r.url()+':'+r.status())});
  await p.goto(base,{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));return p;
}
async function reload(p){await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>setPaused(true))}
async function travel(p){
  const sign=await p.evaluate(()=>{const g=AREAS[activeArea].gate;for(const u of travelParty().filter(u=>!u.carriedBy)){u.x=g.x;u.y=g.y}centerOn(g.x,g.y);return scr(g.x,g.y,20)});
  await p.mouse.click(sign.x,sign.y);await p.locator('#cmenu button[data-i="0"]').click();
}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const width of [360,390]){
    const p=await open(width);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>W||H<=W),false);
    await p.evaluate(()=>{for(const z of [.45,1.3,2.4]){cam.z=z;for(const team of ['a','e','n','g'])for(const pros of ['scrap','mil'])for(const state of ['standing','down','dead']){const u=mk({team,base:60,x:8,y:9,color:'#5fb3a8'});u.p.rarm.pros=pros;u.down=state!=='standing';u.dead=state==='dead';const before=JSON.stringify(ctx.getTransform().toJSON());drawUnit(u);if(JSON.stringify(ctx.getTransform().toJSON())!==before)throw Error('Draw transform leaked')}render()}cam.z=.8});
    await p.evaluate(()=>{setPaused(false)});await p.waitForTimeout(1500);await p.evaluate(()=>setPaused(true));
    await travel(p);assert.equal(await p.evaluate(()=>activeArea),'temple');
    // Actual loot UI followed by sale UI exercises the first expedition loop.
    await p.evaluate(()=>{const u=allies()[0],c=piles.find(p=>p.permanent);u.x=c.x;u.y=c.y;u.cmd=[{t:'loot',body:c}];runCmd(u,.1,null,99)});
    await p.click('#bLootAll');await p.click('#bLootClose');
    assert.equal(await p.evaluate(()=>countItem(allies()[0],'seal')),1);
    await p.evaluate(()=>{const e=bandits()[0];e.dead=e.down=true;e.bleed=0;allies().forEach(u=>{u.x=7;u.y=8});save(false)});
    await reload(p);
    assert.equal(await p.evaluate(()=>piles.find(p=>p.permanent).pack.length),0);
    assert.equal(await p.evaluate(()=>bandits().filter(u=>u.dead).length),1);
    await travel(p);assert.equal(await p.evaluate(()=>activeArea),'village');
    const sale=await p.evaluate(()=>{const u=allies()[0];u.x=TRADER.x;u.y=TRADER.y;arriveTalk(u,TRADER);shopTab='sell';renderShop();return {money,price:sellPrice('seal'),idx:u.pack.findIndex(s=>s.id==='seal')}});
    await p.locator(`[data-sell="${sale.idx}"]`).click();
    assert.equal(await p.evaluate(()=>money),sale.money+sale.price);
    await p.evaluate(()=>{shopSheet.hidden=true;setModal(false);allies().forEach(u=>{u.x=8;u.y=10})});
    await travel(p);assert.equal(await p.evaluate(()=>piles.find(p=>p.permanent).pack.length),0);
    // Direct transitions still require the exit; active pursuers may follow.
    assert.equal(await p.evaluate(()=>{allies()[0].x=30;return travelArea()}),false);
    assert.equal(await p.evaluate(()=>{allies().forEach(u=>{u.x=7;u.y=8});const e=bandits().find(u=>!u.down);e.x=7.5;e.y=8.5;e.aggro=true;return travelArea()}),true);
    await p.close();console.log(`PASS ${width}px: portrait, expedition, sale, persistent loot/death, travel gates`);
  }
  {
    const p=await open();await travel(p);
    const bounty=await p.evaluate(()=>{const u=allies()[0],e=bandits()[0];e.down=true;e.bleed=0;e.p.head.hp=0;u.x=7;u.y=8;e.x=7;e.y=8;pickUp(u,e);sel.clear();sel.add(u);return {id:e.id,reward:e.bounty,money}});
    await travel(p);assert.equal(await p.evaluate(()=>activeArea),'village');await reload(p);
    assert.equal(await p.evaluate(id=>allies().some(u=>u.carry&&u.carry.id===id),bounty.id),true);
    await p.evaluate(()=>{const u=allies().find(u=>u.carry);arriveTalk(u,GUARD)});
    assert.equal(await p.evaluate(()=>money),bounty.money+bounty.reward);
    assert.equal(await p.evaluate(id=>units.some(u=>u.id===id),bounty.id),false);
    await p.close();console.log('PASS live bounty transport across areas, reload and guard reward');
  }
  {
    const p=await open();
    const ids=await p.evaluate(()=>{const [a,b]=allies();b.down=true;b.p.head.hp=0;pickUp(a,b);sel.clear();sel.add(a);a.x=8;a.y=10;return {a:a.id,b:b.id}});
    await travel(p);assert.equal(await p.evaluate(()=>allies().length),2);
    assert.equal(await p.evaluate(()=>allSquad().length),4);
    // Dropped bags must not expire while their area is inactive.
    await p.evaluate(()=>{dropToGround(allies()[0],{id:'iron',n:1});save(false)});
    await reload(p);
    assert.equal(await p.evaluate(ids=>{const a=units.find(u=>u.id===ids.a),b=units.find(u=>u.id===ids.b);return a.carry===b&&b.carriedBy===a},ids),true);
    // Changing control to reserves moves nobody and keeps the expedition frozen.
    const result=await p.evaluate(()=>{const before=JSON.stringify(areaStates.village.units.map(u=>({id:u.id,x:u.x,y:u.y,p:u.p,food:u.food})));const start=simT;simulate(.5);const after=JSON.stringify(areaStates.village.units.map(u=>({id:u.id,x:u.x,y:u.y,p:u.p,food:u.food})));return {same:before===after,switched:switchReserve(),area:activeArea,total:allSquad().length,start}});
    assert.equal(result.same,true);assert.equal(result.switched,true);assert.equal(result.area,'village');assert.equal(result.total,4);
    await p.evaluate(()=>{simT+=500});
    assert.equal(await p.evaluate(()=>switchReserve()),true);
    assert.equal(await p.evaluate(()=>piles.some(p=>!p.permanent&&p.pack.some(s=>s.id==='iron')&&simT-p.t<300)),true);
    await p.evaluate(()=>{sel.clear();const a=allies().find(u=>!u.down);sel.add(a);a.x=7;a.y=8});
    await travel(p);await reload(p);
    assert.equal(await p.evaluate(()=>allies().length),4);
    assert.equal(await p.evaluate(()=>units.includes(TRADER)&&units.includes(INNKEEPER)&&units.includes(GUARD)),true);
    assert.equal(await p.evaluate(()=>new Set(allSquad().map(u=>u.id)).size),4);
    await p.close();console.log('PASS selected party, carried casualty, reload links, reserves, NPC identity');
  }
  {
    const p=await open();
    const legacy=await p.evaluate(()=>{money=876;const u=allies()[0];u.sk.str.lv=17;u.p.larm.lost=true;u.food=64;const d=JSON.parse(serialize());delete d.areas;delete d.activeArea;const raw=JSON.stringify(d);localStorage.setItem(LEGACY_SAVE_KEY,raw);return {raw,id:u.id}});
    await reload(p);
    assert.equal(await p.evaluate(id=>{const u=allies().find(u=>u.id===id);return money===876&&u.sk.str.lv===17&&u.p.larm.lost&&u.food<=64&&activeArea==='village'},legacy.id),true);
    assert.equal(await p.evaluate(()=>localStorage.getItem(LEGACY_SAVE_KEY)),legacy.raw);
    await p.evaluate(()=>{money=12345;save(false)});await reload(p);
    assert.equal(await p.evaluate(()=>money),12345);
    // First click only arms reset; reload/pagehide cannot resurrect either save.
    await p.evaluate(()=>document.querySelector('#bReset').click());
    assert.equal(await p.evaluate(()=>money),12345);
    await Promise.all([p.waitForEvent('load'),p.evaluate(()=>document.querySelector('#bReset').click())]);
    await p.evaluate(()=>setPaused(true));
    assert.equal(await p.evaluate(()=>money),100);
    assert.equal(await p.evaluate(()=>localStorage.getItem(SAVE_KEY)||localStorage.getItem(LEGACY_SAVE_KEY)),null);
    assert.equal(await p.evaluate(()=>allies()[0].p.larm.lost),false);
    await p.close();console.log('PASS legacy migration, original backup, new-save reload, true restart');
  }
  assert.deepEqual(errors,[]);console.log('PASS no runtime, console or resource errors');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
