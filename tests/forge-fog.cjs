const assert=require('node:assert/strict');const {chromium}=require('playwright');
let browser;const errors=[];
async function open(width){
  const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await p.route('**/favicon.ico',r=>r.fulfill({status:204}));p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');await p.evaluate(()=>{setPaused(true);autoPause=false});return p;
}
async function reload(p){await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>{setPaused(true);autoPause=false})}
function allTrue(o){for(const[k,v]of Object.entries(o))assert.equal(v,true,k)}
async function enter(p){await p.evaluate(()=>{for(const target of['temple','forge']){const g=exitTo(activeArea,target);allies().forEach(u=>{u.x=g.x;u.y=g.y});travelArea(travelParty(),target)}})}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const width of[360,390]){
    const p=await open(width);
    allTrue(await p.evaluate(()=>({village:!hasFog()&&fogVisible({x:30,y:30})&&fogKnown({x:30,y:30})})));
    await enter(p);
    allTrue(await p.evaluate(()=>({pilot:hasFog(),entry:fogKnown(AREAS.forge.gate)&&fogVisible(AREAS.forge.gate),outer:fogVisible(piles.find(p=>p.id==='forge-edge')),
      hidden:!fogKnown(piles.find(p=>p.id==='forge-plans'))&&!fogVisible(bandits()[2]),noClick:!pickPile(...Object.values(scr(15,14,4)))})));
    allTrue(await p.evaluate(()=>{
      const[a,b,c,d]=allies();a.x=5;a.y=8;b.x=20;b.y=5;c.x=20;c.y=20;c.down=true;c.p.head.hp=-10;d.x=28;d.y=28;d.dead=d.down=true;updateFog();
      const shared=fogVisible({x:23,y:5}),downNear=fogVisible({x:21,y:20}),downFar=!fogVisible({x:22,y:20}),deadBlind=!fogVisible(d)&&unitVisible(d);
      pickUp(b,c);updateFog();const carriedBlind=!fogVisible({x:20,y:20});drop(b);c.down=false;c.p.head.hp=c.p.head.max;d.dead=d.down=false;
      allies().forEach(u=>{u.x=15;u.y=14});updateFog();const discovered=fogKnown({x:16.5,y:15});
      allies().forEach(u=>{u.x=5;u.y=8});updateFog();
      const alpha=(x,y)=>fogCtx.getImageData(x*FOG_SCALE,y*FOG_SCALE,1,1).data[3];
      return{shared,downNear,downFar,deadBlind,carriedBlind,discovered,remembered:fogKnown({x:15,y:14})&&!fogVisible({x:15,y:14}),
        clear:alpha(5,8)===0,dim:alpha(15,14)>150&&alpha(15,14)<180,black:alpha(30,30)===255,soft:alpha(9.6,8)>0&&alpha(9.6,8)<180};
    }));
    allTrue(await p.evaluate(()=>{
      const box=piles.find(p=>p.id==='forge-plans'),e=bandits()[2];e.x=box.x;e.y=box.y;e.down=true;
      centerOn(box.x,box.y);const s=scr(box.x,box.y,4);hideMenu();sel.clear();sel.add(allies()[0]);tap(s.x,s.y);
      const blindMove=cmenu.hidden&&allies()[0].cmd.every(c=>c.t==='move'),noBody=!pickHits(s.x,s.y).includes(e),noBox=!pickPile(s.x,s.y);
      const a=allies()[0];a.cmd=[{t:'attack',u:e,finish:true}];const hp=e.p.torso.hp;runCmd(a,.1,null,99);
      const noAttack=!a.cmd.length&&e.p.torso.hp===hp;
      e.down=false;const noAuto=!hostiles(a).includes(e);
      const calls=[],texts=[],oldUnit=drawUnit,oldPile=drawPile,oldProp=drawProp,oldText=ctx.fillText;
      drawUnit=u=>{calls.push(u);oldUnit(u)};drawPile=b=>{calls.push(b);oldPile(b)};drawProp=b=>{calls.push(b);oldProp(b)};
      ctx.fillText=function(t,...args){texts.push(t);oldText.call(this,t,...args)};
      fx.floats.push({x:15,y:14,txt:'HIDDEN_EVENT',col:'#fff',t:0,big:false});
      try{render()}finally{drawUnit=oldUnit;drawPile=oldPile;drawProp=oldProp;ctx.fillText=oldText;fx.floats=[]}
      const rememberedBuilding=calls.some(p=>p.house&&p.x===16.5);
      const hiddenRender=!calls.includes(e)&&!calls.includes(box)&&!texts.includes(box.name)&&!texts.includes('HIDDEN_EVENT');
      allies().forEach(u=>{u.x=1;u.y=1});updateFog();const ore=ORES[0],os=scr(ore.x,ore.y,ore.h*.6);const noOre=!pickOre(os.x,os.y);
      allies().forEach(u=>{u.x=5;u.y=8;u.cmd=[]});updateFog();
      return{blindMove,noBody,noBox,noAttack,noAuto,rememberedBuilding,hiddenRender,noOre};
    }));
    // Walk into unknown terrain using an ordinary move command, then preserve discovery through reload and travel.
    allTrue(await p.evaluate(()=>{
      const a=allies()[0],before=exploredForge.reduce((n,x)=>n+x,0);a.cmd=[{t:'move',x:8,y:4.5}];
      for(let i=0;i<300&&a.cmd.length;i++)simulate(.05);
      save(false);return{walked:dist(a,{x:8,y:4.5})<.2,revealed:fogKnown({x:12,y:4}),grew:exploredForge.reduce((n,x)=>n+x,0)>before};
    }));
    await reload(p);
    allTrue(await p.evaluate(()=>({memory:fogKnown({x:15,y:14})&&fogKnown({x:12,y:4}),hidden:!fogVisible({x:15,y:14}),size:JSON.parse(serialize()).exploration.forge.length===4096})));
    await p.evaluate(()=>{allies().forEach(u=>{u.x=5;u.y=8});sel.clear();allies().forEach(u=>sel.add(u));travelArea()});
    await reload(p);
    allTrue(await p.evaluate(()=>{
      const temple=!hasFog()&&fogVisible({x:30,y:30});const g=exitTo('temple','forge');allies().forEach(u=>{u.x=g.x;u.y=g.y});travelArea(travelParty(),'forge');
      return{temple,returnMemory:fogKnown({x:15,y:14})&&!fogVisible({x:15,y:14}),portrait:document.documentElement.scrollWidth<=W};
    }));
    // Remove only the new field to represent an existing forge save from before fog.
    await p.evaluate(()=>{money=713;economy.forging=true;piles.find(p=>p.id==='forge-edge').pack=[];const d=JSON.parse(serialize());delete d.exploration;localStorage.setItem(SAVE_KEY,JSON.stringify(d));restarting=true});
    await reload(p);
    allTrue(await p.evaluate(()=>({oldProgress:money===713&&economy.forging&&!piles.find(p=>p.id==='forge-edge').pack.length,
      oldSight:fogKnown(AREAS.forge.gate)&&!fogKnown({x:15,y:14}),party:allSquad().length===4})));
    await p.close();console.log(`PASS ${width}px: shared/downed/carried/dead sight, fog mask states/soft edge, hidden draw/pick/FX/attack, walking discovery, reload/travel and old saves`);
  }
  assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
