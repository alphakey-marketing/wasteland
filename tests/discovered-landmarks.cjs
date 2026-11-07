const assert=require('node:assert/strict');const {chromium}=require('playwright');
let browser;const errors=[];
async function open(width){
  const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await p.route('**/favicon.ico',r=>r.fulfill({status:204}));p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');await p.evaluate(()=>{setPaused(true);autoPause=false});return p;
}
async function reload(p){await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>{setPaused(true);autoPause=false})}
function allTrue(o){for(const[k,v]of Object.entries(o))assert.equal(v,true,k)}
async function menu(p){
  const s=await p.evaluate(()=>{const g=AREAS.forge.gate;centerOn(g.x,g.y);return scr(g.x,g.y,20)});
  await p.mouse.click(s.x,s.y);await p.locator('#cmenu button').filter({hasText:'已發現地點'}).click();
}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const width of[360,390]){
    const p=await open(width);
    assert.equal(await p.evaluate(()=>knownLandmarks().length),0);
    await p.evaluate(()=>{for(const target of['temple','forge']){const g=AREAS[activeArea].gate;allies().forEach(u=>{u.x=g.x;u.y=g.y});travelArea(travelParty(),target)}});
    assert.deepEqual(await p.evaluate(()=>knownLandmarks().map(p=>p.name)),['返荒寺路牌','鐵礦脈']);
    await menu(p);
    assert.equal(await p.locator('#cmenu').textContent().then(t=>t.includes('舊工房')||t.includes('舊鍛爐')),false);
    const before=await p.evaluate(()=>{const a=allies()[0];a.cmd=[{t:'move',x:6,y:8}];return{cmd:JSON.stringify(allies().map(u=>u.cmd)),fog:packExploration().forge}});
    await p.locator('#cmenu button').filter({hasText:'鐵礦脈'}).click();
    allTrue(await p.evaluate(before=>({camera:cam.x===isoX(5,4.5)&&cam.y===isoY(5,4.5)&&!cam.follow,
      orders:JSON.stringify(allies().map(u=>u.cmd))===before.cmd,memory:packExploration().forge===before.fog}),before));
    await p.evaluate(()=>{
      allies().forEach(u=>{u.cmd=[];u.x=15;u.y=14});updateFog();
      allies().forEach(u=>{u.x=6;u.y=10.5});updateFog();
    });
    allTrue(await p.evaluate(()=>{
      const labels=[],original=label;label=(txt,...args)=>{labels.push(txt);original(txt,...args)};
      try{render()}finally{label=original}
      const box=piles.find(p=>p.id==='forge-plans'),e=bandits()[2],s=scr(box.x,box.y,4),ore=ORES[0],os=scr(ore.x,ore.y,ore.h*.6);
      return{four:knownLandmarks().length===4,building:labels.includes('舊工房 · 記錄'),furnace:labels.includes('舊鍛爐 · 記錄'),ore:labels.includes('鐵礦脈 · 記錄'),
        gate:labels.includes('返荒寺'),noBoxLabel:!labels.includes(box.name)&&!labels.includes('已搜清'),hiddenBox:!pickPile(s.x,s.y),
        hiddenEnemy:!unitVisible(e)&&!pickHits(s.x,s.y).includes(e),hiddenOre:!fogVisible(ore)&&!pickOre(os.x,os.y)};
    }));
    await menu(p);const rememberedMenu=await p.locator('#cmenu').textContent();
    // Changing unseen occupants and inventory must not change the remembered location list.
    await p.evaluate(()=>{hideMenu();piles.find(p=>p.id==='forge-plans').pack=[];bandits().forEach(u=>{u.x=25;u.y=25})});
    await menu(p);assert.equal(await p.locator('#cmenu').textContent(),rememberedMenu);
    await p.locator('#cmenu button').filter({hasText:'舊工房'}).click();
    allTrue(await p.evaluate(()=>({camera:cam.x===isoX(16.5,15)&&cam.y===isoY(16.5,15),notRevealed:!fogVisible({x:16.5,y:15}),
      noOrders:allies().every(u=>!u.cmd.length),portrait:document.documentElement.scrollWidth<=W})));
    await p.evaluate(()=>{money=524;economy.forging=true;save(false)});await reload(p);
    allTrue(await p.evaluate(()=>({remembered:knownLandmarks().length===4,progress:money===524&&economy.forging&&!piles.find(p=>p.id==='forge-plans').pack.length,
      schema:!('landmarks'in JSON.parse(serialize()))&&JSON.parse(serialize()).exploration.forge.length===4096})));
    await p.evaluate(()=>{const g=AREAS.forge.gate;allies().forEach(u=>{u.x=g.x;u.y=g.y});travelArea()});await reload(p);
    assert.equal(await p.evaluate(()=>knownLandmarks().length),0);
    await p.evaluate(()=>{const g=AREAS.temple.gate;allies().forEach(u=>{u.x=g.x;u.y=g.y});travelArea(travelParty(),'forge')});
    assert.equal(await p.evaluate(()=>knownLandmarks().length),4);
    // Pre-fog saves reveal only the present party's surroundings, never all named locations.
    await p.evaluate(()=>{allies().forEach(u=>{u.x=6;u.y=10.5});const d=JSON.parse(serialize());delete d.exploration;localStorage.setItem(SAVE_KEY,JSON.stringify(d));restarting=true});
    await reload(p);assert.deepEqual(await p.evaluate(()=>knownLandmarks().map(p=>p.name)),['返荒寺路牌']);
    await p.close();console.log(`PASS ${width}px: discovered-only markers, remembered labels, signpost camera-only navigation, hidden contents/occupants, persistence/travel and old saves`);
  }
  assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
