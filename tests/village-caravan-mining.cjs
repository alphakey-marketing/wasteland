const assert=require('node:assert/strict');const {chromium}=require('playwright');
let browser;const errors=[];
async function open(width=390){
  const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await p.route('**/favicon.ico',r=>r.fulfill({status:204}));p.on('pageerror',e=>errors.push(e.stack));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  await p.click('#bStart');await p.evaluate(()=>{setPaused(true);autoPause=false});return p;
}
function allTrue(o){for(const [k,v]of Object.entries(o))assert.equal(v,true,k)}
async function reload(p){await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>setPaused(true))}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  {
    const p=await open();
    allTrue(await p.evaluate(()=>{
      const m=merchantState('village'),inn=merchantState('inn'),v=merchantState('caravan','test');
      return {poor:Object.values(m.stock).reduce((a,b)=>a+b,0)===17&&m.cash===180&&inn.cash===50,
        basics:m.stock.ration===2&&m.stock.medkit===1&&m.stock.kit===1,
        noRichGear:!m.stock.plate&&!m.stock.axe&&!m.stock.p_mil,
        betterCaravan:v.stock.plate===1&&v.stock.axe===1&&v.stock.p_mil===1&&!v.stock.p_forged};
    }));
    await p.evaluate(()=>{
      economy.merchants.village={kind:'village',cash:1000,day:0,stock:Object.fromEntries(STOCK.map(id=>[id,stockCount(id)]))};
      economy.merchants.village.stock.forged_blade=1;money=777;save(false);
    });await reload(p);
    allTrue(await p.evaluate(()=>{
      const m=merchantState('village');const migrated=m.cash===280&&m.stock.ration===2&&!m.stock.plate&&m.stock.forged_blade===1&&money===777;
      const snapshot=JSON.stringify(m);merchantState('village');save(false);
      return {migrated,once:snapshot===JSON.stringify(m)};
    }));await reload(p);
    assert.equal(await p.evaluate(()=>merchantState('village').cash),280);
    await p.close();console.log('PASS poor village, stronger caravan, one-time stock/cash migration and resold artisan item preservation');
  }
  {
    const p=await open();
    const trip=await p.evaluate(()=>{
      const l=caravanLeader(),id=l.id;merchantState('caravan','caravan:'+id).stock.ration=3;
      // Exercise travelling while the player is in the other area.
      const gate=AREAS.village.gate;allies().forEach(u=>{u.x=gate.x;u.y=gate.y});travelArea();
      for(let i=0;i<1500&&!(caravanJourney.area==='temple'&&caravanJourney.phase==='stay');i++)simulate(.1);
      const reached=caravanJourney.area==='temple'&&caravanJourney.phase==='stay';
      const escort=units.filter(u=>u.leader===l).length===2;
      save(false);return {id,reached,escort};
    });allTrue({reached:trip.reached,escort:trip.escort});await reload(p);
    allTrue(await p.evaluate(id=>{
      const l=caravanLeader();const linked=l.id===id&&units.filter(u=>u.leader===l).length===2;
      for(let i=0;i<1200&&caravanJourney.phase!=='away';i++)simulate(.1);
      save(false);return {linked,departed:caravanJourney.phase==='away'&&!units.some(u=>u.id===id),stored:awayCaravan.length===3};
    },trip.id));await reload(p);
    allTrue(await p.evaluate(id=>{
      const remaining=caravanJourney.nextAt-simT;
      const restored=caravanJourney.phase==='away'&&awayCaravan.length===3&&remaining>0;
      for(let i=0;i<Math.ceil(remaining/.1)+1;i++)simulate(.1);
      const l=caravanLeader();const returned=caravanJourney.area==='village'&&l.id===id&&areaStates.village.units.includes(l);
      const ids=[...units,...areaStates.village.units].map(u=>u.id);
      return {restored,returned,links:areaStates.village.units.filter(u=>u.leader===l).length===2,
        sameStock:merchantState('caravan','caravan:'+id).stock.ration===3,unique:new Set(ids).size===ids.length};
    },trip.id));
    await p.close();console.log('PASS caravan walks across zones with guards, departure, away/reload/return, inactive progress and persistent stock');
  }
  for(const width of [360,390]){
    const p=await open(width);
    allTrue(await p.evaluate(()=>({noGhost:!props.some(o=>o.isOre&&o.ore==='iron'),match:props.filter(o=>o.isOre).every(o=>ORES.includes(o))})));
    await p.evaluate(()=>{const g=AREAS.village.gate;allies().forEach(u=>{u.x=g.x;u.y=g.y});travelArea()});
    const orePoint=await p.evaluate(()=>{
      const o=ORES.find(o=>o.ore==='iron'),a=allies()[0];sel.clear();sel.add(a);a.x=o.x-3;a.y=o.y;
      centerOn(o.x,o.y);return scr(o.x,o.y,o.h*.6);
    });await p.mouse.click(orePoint.x,orePoint.y);
    allTrue(await p.evaluate(()=>{
      const a=[...sel][0],ordered=a.cmd[0]?.t==='mine'&&a.cmd[0].node.ore==='iron';
      for(let i=0;i<200&&!countItem(a,'iron');i++)simulate(.05);
      a.cmd=[];return {ordered,mined:countItem(a,'iron')>=1,match:props.filter(o=>o.isOre).every(o=>ORES.includes(o))};
    }));
    const bodyPoint=await p.evaluate(()=>{
      const a=allies()[0],e=bandits()[0],b=bandits()[1];
      a.x=18;a.y=5;for(const u of [e,b]){u.x=20;u.y=5;u.down=u.dead=true;u.pack=[];u.eq={weapon:null,armor:null};u.bleed=0}
      centerOn(20,5);return scr(20,5,4);
    });await p.mouse.click(bodyPoint.x,bodyPoint.y);
    assert.equal(await p.locator('#cmenu button').count(),2);
    await p.locator('#cmenu button').first().click();
    assert.equal(await p.locator('#cmenu button').first().textContent().then(t=>t.includes('已被搜清')),true);
    await p.locator('#cmenu button').first().click();
    await p.evaluate(()=>{for(let i=0;i<100&&lootSheet.hidden;i++)simulate(.05)});
    assert.equal(await p.locator('#lootSheet').isVisible(),true);
    assert.equal(await p.locator('#lootList').textContent().then(t=>t.includes('已被搜清')),true);
    await p.click('#bLootClose');
    allTrue(await p.evaluate(()=>{
      const a=allies()[0],e=bandits()[0];e.dead=false;e.down=true;e.pack=[{id:'coin',n:10}];e.x=a.x;e.y=a.y;
      a.cmd=[{t:'loot',body:e}];e.down=false;runCmd(a,.1,e,0);
      return {awakeCancelled:!a.cmd.length&&lootSheet.hidden,unchanged:e.pack[0].n===10};
    }));
    await p.close();console.log(`PASS ${width}px: visible/clickable iron, actual mining, overlapping bodies, empty search and wake cancellation`);
  }
  assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
