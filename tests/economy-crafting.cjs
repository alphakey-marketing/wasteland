const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const errors=[];let browser;
async function open(width=390){
  const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await p.route('**/favicon.ico',r=>r.fulfill({status:204}));p.on('pageerror',e=>errors.push(e.stack));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  await p.click('#bStart');await p.evaluate(()=>{setPaused(true);autoPause=false});return p;
}
async function reload(p){await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>setPaused(true))}
function allTrue(o){for(const [key,value]of Object.entries(o))assert.equal(value,true,key)}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  {
    const p=await open();
    allTrue(await p.evaluate(()=>{
      const u=allies()[0],m=merchantState('village'),price=buyPrice('ration'),before=countItem(u,'ration'),cash=m.cash;
      m.stock.ration=1;money=100;const bought=buyFrom(u,m,'ration');
      const finite=bought&&m.stock.ration===0&&money===100-price&&m.cash===cash+price&&countItem(u,'ration')===before+1&&!buyFrom(u,m,'ration');
      addItem(u,'iron',5);m.cash=sellPrice('iron')*2+1;const idx=u.pack.findIndex(s=>s.id==='iron'),n=sellTo(u,m,idx,5);
      const partial=n===2&&countItem(u,'iron')===3&&m.cash===1&&m.stock.iron===2&&!sellTo(u,m,u.pack.findIndex(s=>s.id==='iron'));
      const inn=merchantState('inn'),c1=merchantState('caravan','caravan:first'),c2=merchantState('caravan','caravan:second');
      c1.stock.ration=0;const independent=inn!==m&&c1!==c2&&c2.stock.ration===6;
      save(false);return {finite,partial,independent};
    }));
    await p.evaluate(()=>{const u=allies()[0];u.x=TRADER.x;u.y=TRADER.y;arriveTalk(u,TRADER)});
    assert.equal(await p.locator('[data-buy="ration"]').isDisabled(),true);
    await p.click('#segSell');
    assert.equal(await p.locator('[data-sell]').first().isDisabled(),true);
    await p.click('#bShopClose');
    await reload(p);
    allTrue(await p.evaluate(()=>{
      const m=merchantState('village');const persisted=m.cash===1&&m.stock.ration===0&&m.stock.iron===2;
      simT=ECONOMY_DAY;const same=merchantState('village');const replenished=same.cash===180&&same.stock.ration===2&&same.stock.iron===2;
      same.cash=1000;same.stock.medkit=10;simT+=ECONOMY_DAY*3;merchantState('village');
      const noStack=same.cash===1000&&same.stock.medkit===10&&same.stock.ration===2;
      money=0;const before=same.stock.ration;const noFree=!buyFrom(allies()[0],same,'ration')&&same.stock.ration===before;
      return {persisted,replenished,noStack,noFree};
    }));
    await p.close();console.log('PASS finite stock/cash, partial sales, separate merchants, save/reload and daily replenishment');
  }
  for(const width of [360,390]){
    const p=await open(width);
    // An existing pre-economy save gains the new cache without losing progress.
    await p.evaluate(()=>{money=777;allies()[0].sk.str.lv=18;const d=JSON.parse(serialize());delete d.economy;d.areas.temple.piles=d.areas.temple.piles.filter(p=>p.id!=='smith-cache');localStorage.setItem(SAVE_KEY,JSON.stringify(d));restarting=true});
    await reload(p);
    allTrue(await p.evaluate(()=>({progress:money===777&&allies()[0].sk.str.lv===18,cache:areaStates.temple.piles.filter(p=>p.id==='smith-cache').length===1,locked:!economy.smithing})));
    await p.evaluate(()=>{const g=AREAS[activeArea].gate;allies().forEach(u=>{u.x=g.x;u.y=g.y});travelArea();const u=allies()[0],box=piles.find(p=>p.id==='smith-cache');u.x=box.x;u.y=box.y;u.cmd=[{t:'loot',body:box}];runCmd(u,.1,null,99)});
    await p.click('#bLootAll');await p.click('#bLootClose');
    allTrue(await p.evaluate(()=>{
      const u=allies()[0],ore=ORES.find(o=>o.ore==='iron');u.sk.str.lv=40;u.x=ore.x+1;u.y=ore.y;u.cmd=[{t:'mine',node:ore}];
      for(let i=0;i<100&&countItem(u,'iron')<6;i++)runCmd(u,.5,null,99);u.cmd=[];
      save(false);return {scroll:countItem(u,'smith_scroll')===1,steel:countItem(u,'steel')===2,mined:countItem(u,'iron')===6};
    }));
    await reload(p);
    assert.equal(await p.evaluate(()=>piles.find(p=>p.id==='smith-cache').pack.length),0);
    // Additional advanced gear requires another expedition; use actual cache transfer controls.
    await p.evaluate(()=>{const g=exitTo('temple','forge');allies().forEach(u=>{u.x=g.x;u.y=g.y});travelArea(travelParty(),'forge')});
    for(const id of ['forge-parts','forge-plans']){
      await p.evaluate(id=>{const u=allies()[0],box=piles.find(p=>p.id===id);u.x=box.x;u.y=box.y;openLoot(u,box)},id);
      await p.click('#bLootAll');await p.click('#bLootClose');
    }
    await p.evaluate(()=>{const g=AREAS.forge.gate;allies().forEach(u=>{u.x=g.x;u.y=g.y});travelArea()});
    await p.evaluate(()=>{
      const g=AREAS[activeArea].gate;allies().forEach(u=>{u.x=g.x;u.y=g.y});travelArea();
      const u=allies()[0],ore=ORES.find(o=>o.ore==='copper');u.x=ore.x+1;u.y=ore.y;u.cmd=[{t:'mine',node:ore}];for(let i=0;i<100&&countItem(u,'copper')<4;i++)runCmd(u,.5,null,99);u.cmd=[];
      addItem(u,'hide',6);addItem(u,'meat');money=2000;u.x=TRADER.x;u.y=TRADER.y;arriveTalk(u,TRADER);
    });
    await p.locator('[data-buy="p_scrap"]').click();await p.click('#segCraft');
    assert.equal(await p.locator('[data-recipe="forged_blade"]').isDisabled(),true);
    await p.locator('[data-learn="1"]').click();
    assert.equal(await p.evaluate(()=>economy.smithing&&!countItem(allies()[0],'smith_scroll')),true);
    for(const id of ['cooked_meat','kit','worked_armor','forged_blade','forged_armor','p_forged']){
      assert.equal(await p.locator(`[data-recipe="${id}"]`).isDisabled(),false,id);
      await p.locator(`[data-recipe="${id}"]`).click();
    }
    allTrue(await p.evaluate(()=>{
      const u=allies()[0];return {outputs:RECIPES.filter(r=>!r.forge).every(r=>countItem(u,r.id)>=1),consumed:!countItem(u,'steel')&&!countItem(u,'iron')&&!countItem(u,'copper')&&!countItem(u,'hide')&&!countItem(u,'p_scrap'),
        blade:ITEMS.forged_blade.dmg[0]>ITEMS.axe.dmg[0]&&ITEMS.forged_blade.dmg[1]>ITEMS.axe.dmg[1],
        armor:ITEMS.forged_armor.red>ITEMS.plate.red&&ITEMS.forged_armor.w<ITEMS.plate.w,
        limb:PROS.master.hp>PROS.mil.hp&&PROS.master.mul>PROS.mil.mul,
        exclusive:!Object.keys(MERCHANTS).some(k=>MERCHANTS[k].stock.some(id=>['forged_blade','forged_armor','p_forged'].includes(id))),
        noOverflow:document.documentElement.scrollWidth<=W,
        noFree:!commission(u,'forged_blade')};
    }));
    await p.click('#bShopClose');await reload(p);
    allTrue(await p.evaluate(()=>({unlocked:economy.smithing,products:countItem(allies()[0],'forged_blade')===1,empty:areaStates.temple.piles.find(p=>p.id==='smith-cache').pack.length===0,unique:areaStates.temple.piles.filter(p=>p.id==='smith-cache').length===1})));
    await p.evaluate(()=>{const u=allies()[0];openCard(u)});
    const equipIdx=await p.evaluate(()=>allies()[0].pack.findIndex(s=>s.id==='forged_blade'));
    await p.locator(`[data-equip="${equipIdx}"]`).click();
    await p.evaluate(()=>{const u=allies()[0];u.p.larm.lost=true;u.p.larm.hp=0;wsSig='';fillWorkshop(u)});
    await p.locator('[data-id="p_forged"][data-k="larm"]').click();
    allTrue(await p.evaluate(()=>{const u=allies()[0];u.eq.armor='forged_armor';drawUnit(u);u.down=true;drawUnit(u);u.down=false;return {equipped:u.eq.weapon==='forged_blade',installed:u.p.larm.pros==='master'&&u.p.larm.max===Math.round(u.p.larm.base*1.6)}}));
    await p.close();console.log(`PASS ${width}px: old save, exploration/mining, unlock, six recipes, artisan advantage, equipment and persistence`);
  }
  {
    const p=await open();
    allTrue(await p.evaluate(()=>{
      const u=allies()[0];u.x=TRADER.x;u.y=TRADER.y;money=2000;addItem(u,'steel',2);addItem(u,'iron',2);economy.smithing=true;
      const cash=money;u.down=true;const down=!commission(u,'forged_blade');u.down=false;
      const e=mk({team:'e',base:40,x:u.x+1,y:u.y});units.push(e);const danger=!commission(u,'forged_blade');e.down=true;
      money=0;const poor=!commission(u,'forged_blade');money=cash;
      const intact=countItem(u,'steel')===2&&countItem(u,'iron')===2&&money===cash;
      const inn=merchantState('inn'),before=inn.cash,bed=BEDS[0];u.x=bed.x;u.y=bed.y;u.cmd=[{t:'sleep',bed}];runCmd(u,.1,null,99);u.cmd=[];
      const rent=inn.cash===before+10&&money===cash-10;
      const g=AREAS[activeArea].gate;sel.clear();sel.add(u);u.x=g.x;u.y=g.y;travelArea();
      const box=piles.find(p=>p.id==='smith-cache'),scav=mk({team:'s',kind:'scav',base:40,x:box.x,y:box.y,gid:42});units.push(scav);scav.goal=box;scav.lootT=3;updScav(scav,.1);
      return {down,danger,poor,intact,rent,protected:box.pack.length===2,renewable:bandits().some(e=>countItem(e,'steel')===1)};
    }));
    await p.close();console.log('PASS crafting rejects incapacitation, danger and insufficient funds without consuming materials');
  }
  assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
