const assert=require('node:assert/strict');const {chromium}=require('playwright');
let browser;const errors=[];
async function open(width=390){
  const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await p.route('**/favicon.ico',r=>r.fulfill({status:204}));p.on('pageerror',e=>errors.push(e.stack));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  await p.click('#bStart');await p.evaluate(()=>{setPaused(true);autoPause=false});return p;
}
function allTrue(o){for(const[k,v]of Object.entries(o))assert.equal(v,true,k)}
async function reload(p){await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>{setPaused(true);autoPause=false})}
async function travel(p,target,gather=false){
  const sign=await p.evaluate(([gather,target])=>{const g=AREAS[activeArea].exits.find(e=>AREAS[e.to].name.includes(target))||AREAS[activeArea].gate;travelParty().filter(u=>!u.carriedBy).forEach((u,i)=>{u.x=g.x-(gather?3:0);u.y=g.y+(gather?i*.2:0)});centerOn(g.x,g.y);return scr(g.x,g.y,20)},[gather,target]);
  await p.mouse.click(sign.x,sign.y);await p.locator('#cmenu button').filter({hasText:target}).first().click();
  if(gather){assert.equal(await p.evaluate(()=>pendingTravel?.target==='forge'),true);await p.evaluate(()=>{for(let i=0;i<400&&pendingTravel;i++)simulate(.05)});assert.equal(await p.evaluate(()=>activeArea),'forge')}
}
async function take(p,id){
  // Relocate only to isolate cache transfers from combat; enemies remain alive.
  await p.evaluate(id=>{const u=allies()[0],b=piles.find(p=>p.id===id);u.x=b.x+.6;u.y=b.y;openLoot(u,b)},id);
  await p.click('#bLootAll');await p.click('#bLootClose');
}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  {
    const p=await open();
    await p.evaluate(()=>{
      money=517;economy.smithing=true;merchantState('village').stock.ration=0;
      const box=areaStates.temple.piles.find(p=>p.id==='smith-cache');box.pack=[{id:'steel',n:6}];areaStates.temple.piles[0].pack=[];
      areaStates.temple.units[0].down=areaStates.temple.units[0].dead=true;
      const d=JSON.parse(serialize());delete d.areas.forge;localStorage.setItem(SAVE_KEY,JSON.stringify(d));restarting=true;
    });
    await reload(p);
    allTrue(await p.evaluate(()=>({money:money===517,unlock:economy.smithing&&!economy.forging,
      stock:merchantState('village').stock.ration===0,oldBox:areaStates.temple.piles.find(p=>p.id==='smith-cache').pack[0].n===6,
      empty:areaStates.temple.piles[0].pack.length===0,corpse:areaStates.temple.units[0].dead,
      newArea:areaStates.forge.units.filter(u=>u.team==='e').length===3&&areaStates.forge.piles.filter(p=>p.id.startsWith('forge-')).length===3})));
    await p.evaluate(()=>save(false));await reload(p);
    assert.equal(await p.evaluate(()=>areaStates.forge.piles.filter(p=>p.id==='forge-plans').length),1);
    await p.close();console.log('PASS old two-area save gains forge once, preserving money, unlocked recipes, finite stock, old materials, empty crates and corpses');
  }
  for(const width of[360,390]){
    const p=await open(width);
    assert.equal(await p.evaluate(()=>areaStates.temple.piles.find(p=>p.id==='smith-cache').pack.find(s=>s.id==='steel').n),2);
    await travel(p,'荒寺');await travel(p,'廢棄鍛冶場',true);
    assert.equal(await p.evaluate(()=>activeArea),'forge');
    // One real pointer-issued command proves the outer reward is reachable without a fight.
    const point=await p.evaluate(()=>{const b=piles.find(p=>p.id==='forge-edge');centerOn(7,8);return scr(b.x,b.y,4)});
    await p.mouse.click(point.x,point.y);await p.locator('#cmenu button[data-i="0"]').click();
    allTrue(await p.evaluate(()=>{for(let i=0;i<200&&lootSheet.hidden;i++)simulate(.05);return{opened:!lootSheet.hidden&&lootBody.id==='forge-edge',safe:allies().every(u=>!u.down&&pct(u)===1)&&bandits().every(u=>!u.aggro)}}));
    await p.click('#bLootAll');await p.click('#bLootClose');
    allTrue(await p.evaluate(()=>({reward:allies().some(u=>countItem(u,'iron')>=2),alive:bandits().every(u=>!u.down),locked:!economy.forging,
      separated:piles.find(p=>p.id==='forge-parts').pack.some(s=>s.id==='mechanism')&&piles.find(p=>p.id==='forge-plans').pack.some(s=>s.id==='forge_scroll'),
      wrongRoute:!travelArea(travelParty(),'village'),noOverflow:document.documentElement.scrollWidth<=W})));
    await p.evaluate(()=>save(false));await reload(p);
    assert.equal(await p.evaluate(()=>activeArea==='forge'&&!piles.find(p=>p.id==='forge-edge').pack.length),true);
    for(const id of['forge-parts','forge-plans'])await take(p,id);
    // Return with a carried casualty and a live pursuer through both links.
    allTrue(await p.evaluate(()=>{
      const [a,b]=allies();b.down=true;b.p.head.hp=-10;b.bleed=0;pickUp(a,b);sel.clear();sel.add(a);
      const e=bandits()[0],gate=AREAS.forge.gate;a.x=gate.x;a.y=gate.y;e.x=gate.x+1;e.y=gate.y;e.aggro=true;
      const out=travelArea();const first=activeArea==='temple'&&units.includes(e)&&a.carry===b&&b.carriedBy===a;
      const g=AREAS.temple.gate;a.x=g.x;a.y=g.y;e.x=g.x+1;e.y=g.y;e.aggro=true;
      const home=travelArea();return{out,first,home,arrived:activeArea==='village'&&units.includes(e)&&e.pursuitId===a.id,carried:a.carry===b};
    }));
    // Explicitly separate the crafting proof from the pursuit scenario.
    await p.evaluate(()=>{
      const a=allies().find(u=>u.carry);drop(a);units.filter(u=>u.team==='e').forEach(u=>{u.x=25;u.y=25;u.aggro=false});
      const u=allies()[0],donors=allies().filter(v=>v!==u);
      for(const v of donors)for(const id of['mechanism','forge_scroll','steel','iron'])while(useItem(v,id))addItem(u,id);
      u.x=TRADER.x;u.y=TRADER.y;money=1000;openShop(u,'village');shopTab='craft';renderShop();
    });
    assert.equal(await p.locator('[data-recipe="mechanism_armor"]').isDisabled(),true);
    await p.locator('[data-learn="forge"]').click();
    assert.equal(await p.locator('[data-recipe="mechanism_armor"]').isDisabled(),false);
    await p.locator('[data-recipe="mechanism_armor"]').click();
    allTrue(await p.evaluate(()=>{const u=allies()[0];return{unlocked:economy.forging,crafted:countItem(u,'mechanism_armor')===1,consumed:!countItem(u,'mechanism')&&!countItem(u,'forge_scroll'),
      improved:ITEMS.mechanism_armor.red>ITEMS.forged_armor.red,exclusive:Object.values(MERCHANTS).every(m=>!m.stock.includes('mechanism_armor')&&!m.stock.includes('mechanism')),fee:money===860}}));
    await p.click('#bShopClose');await reload(p);
    allTrue(await p.evaluate(()=>({persisted:economy.forging&&countItem(allies()[0],'mechanism_armor')===1,
      depleted:areaStates.forge.piles.filter(p=>p.id.startsWith('forge-')).every(p=>!p.pack.length),casualty:allies().some(u=>u.down),squad:allSquad().length===4})));
    await p.evaluate(()=>{const u=allies()[0];u.eq.armor='mechanism_armor';drawUnit(u);u.down=true;drawUnit(u);u.down=false});
    allTrue(await p.evaluate(()=>{
      const reserve=switchReserve('forge')&&activeArea==='forge'&&allies().length===2&&piles.filter(p=>p.id.startsWith('forge-')).every(p=>!p.pack.length);
      const squad=allSquad(),unique=squad.length===4&&new Set(squad.map(u=>u.id)).size===4;
      return{reserve,unique,back:switchReserve('village')&&allies().length===2};
    }));
    await p.close();console.log(`PASS ${width}px: signpost route, safe outer cache pointer/walk, guarded resources, depletion/reload, carried retreat/pursuit, blueprint/crafting and equipment rendering`);
  }
  assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
