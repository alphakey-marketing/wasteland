const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const errors=[];
let browser;
async function open(width=390){
  const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await p.route('**/favicon.ico',r=>r.fulfill({status:204}));
  p.on('pageerror',e=>errors.push(e.stack||e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  await p.click('#bStart');await p.evaluate(()=>{setPaused(true);autoPause=false});return p;
}
function allTrue(result){for(const [name,value] of Object.entries(result))assert.equal(value,true,name)}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const width of [360,390]){
    const p=await open(width);
    allTrue(await p.evaluate(()=>{
      const [a,b,c,d]=allies();b.down=true;b.bleed=0;b.p.head.hp=b.p.head.max;pickUp(a,b);
      c.rules.rescue=true;c.x=a.x;c.y=a.y;c.rescueT=100;updAlly(c,.1);
      getUp(b,.3);for(let i=0;i<20;i++)simulate(.05);
      sel.clear();sel.add(a);updatePortraits(true);
      const btn=document.querySelector('#ctx button'),r=btn.getBoundingClientRect(),s=document.querySelector('#squad').getBoundingClientRect();
      return {held:b.down&&b.carriedBy===a&&a.carry===b,healed:recov(b)===1,
        visible:r.bottom<=s.top&&r.top>=0&&r.right<=W&&r.left>=0,
        clickable:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===btn,
        compact:s.height<130,noSidebar:!document.querySelector('#bTravel')};
    }));
    await p.evaluate(()=>save(false));await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>setPaused(true));
    assert.equal(await p.evaluate(()=>{const a=allies().find(u=>u.carry);return !!a&&a.carry.down&&a.carry.carriedBy===a}),true);
    await p.locator('#ctx button').click();
    assert.equal(await p.evaluate(()=>{const b=allies().find(u=>u.down);simulate(.05);return b&&!b.down&&!b.carriedBy}),true);
    allTrue(await p.evaluate(()=>{
      const a=allies()[0],e=mk({team:'e',name:'Prisoner',base:50,x:a.x,y:a.y,home:{x:a.x,y:a.y},aggroR:5,leash:5});
      units.push(e);e.down=true;pickUp(a,e);simulate(.1);const held=e.down&&e.carriedBy===a;
      e.p.torso.hp=-e.p.torso.max+1;e.bleed=10;hardcore=true;simulate(.2);
      return {enemyHeld:held,bleedsToDeath:e.dead&&a.carry===e};
    }));
    await p.close();console.log(`PASS ${width}px: held recovery/rescue/reload/death, drop hit target and compact footer`);
  }
  {
    const p=await open();
    allTrue(await p.evaluate(()=>{
      const as=allies();as.forEach((u,i)=>{u.x=3+i*.7;u.y=8;u.cmd=[]});startTravel();
      const gathering=activeArea==='village'&&!!pendingTravel;
      for(let i=0;i<300&&activeArea==='village';i++)simulate(.05);
      return {gathering,arrived:activeArea==='temple'&&!pendingTravel,selected:sel.size===as.length};
    }));
    allTrue(await p.evaluate(()=>{
      const a=allies()[0];sel.clear();sel.add(a);a.x=4;a.y=4;startTravel();
      issue(()=>({t:'move',x:4,y:5}));const manual=!pendingTravel&&a.cmd.some(c=>c.x===4&&c.y===5)&&!a.cmd.some(c=>c.travel);
      startTravel();cancelTravel();return {manual,cancelled:!pendingTravel&&!a.cmd.some(c=>c.travel)};
    }));
    allTrue(await p.evaluate(()=>{
      const a=allies()[0],e=bandits()[0];a.x=7;a.y=8;e.x=7.8;e.y=8;
      a.cmd=[{t:'move',x:7,y:8,travel:true}];updAlly(a,.1);updAlly(a,.1);
      const waiting=a.cmd[0]?.travel&&a.state==='出口等隊友'&&a.x===7&&a.y===8;
      a.cmd=[];return {waiting};
    }));
    const chase=await p.evaluate(()=>{
      const a=allies()[0],e=bandits()[0],far=bandits()[1];
      a.x=7;a.y=8;e.x=8;e.y=8;e.aggro=true;far.x=20;far.y=20;far.aggro=true;
      const id=e.id,farId=far.id;travelArea();save(false);
      return {id,farId,followed:activeArea==='village'&&units.includes(e)&&e.pursuitId===a.id,
        distantStayed:!units.includes(far)&&areaStates.temple.units.includes(far)};
    });allTrue({followed:chase.followed,distantStayed:chase.distantStayed});
    await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>setPaused(true));
    allTrue(await p.evaluate(id=>{
      const e=units.find(u=>u.id===id),a=allies()[0];const persisted=e.pursuitId===a.id;
      a.x=GUARD.x+1.5;a.y=GUARD.y;e.x=GUARD.x+.5;e.y=GUARD.y;e.cd=0;GUARD.cd=0;
      e.p=mkParts(e.base);e.down=e.dead=false;e.bleed=0;
      updOther(GUARD,.05);updOther(e,.05);
      const guardDefends=GUARD.cd>0&&(e.down||e.state==='戰鬥');
      // A random head hit can down the pursuer. Test return travel independently with a live pursuer.
      e.p=mkParts(e.base);e.down=e.dead=false;e.bleed=0;
      const g=AREAS.village.gate;a.x=g.x;a.y=g.y;e.x=g.x+.8;e.y=g.y;sel.clear();sel.add(a);travelArea();
      return {persisted,guardDefends,returnChase:activeArea==='temple'&&units.includes(e)&&e.pursuitId===a.id,
        unique:new Set([...areaStates.village.units,...units].map(u=>u.id)).size===areaStates.village.units.length+units.length};
    },chase.id));
    await p.close();console.log('PASS auto gathering/cancel, manual override, nearby pursuit, guard defence, reload and return chase');
  }
  {
    const p=await open();
    for(const all of [false,true]){
      await p.evaluate(()=>{hardcore=false;const a=allies()[0],b=mk({team:'w',kind:'dog',base:40,name:'Dog',x:a.x,y:a.y,pack:[{id:'hide',n:1},{id:'meat',n:1}]});b.down=true;units.push(b);openLoot(a,b)});
      const target=all?'#bLootAll':'#lootList button[data-i="0"]';
      await p.click(target);assert.equal(await p.evaluate(()=>lootBody.dead),false);
      await p.click(target);assert.equal(await p.evaluate(()=>lootBody.dead),true);
      await p.click('#bLootClose');
    }
    allTrue(await p.evaluate(()=>{
      const a=allies()[0],dog=units.find(u=>u.kind==='dog');dog.dead=false;dog.down=true;dog.bleed=0;
      dog.p=mkParts(dog.base);pickUp(a,dog);simulate(.05);const held=dog.down&&dog.carriedBy===a;drop(a);
      dog.x=25;dog.y=25;dog.pack=[{id:'hide',n:1}];
      const scav=mk({team:'s',kind:'scav',base:40,name:'Scav',x:25,y:25,gid:42});units.push(scav);scav.goal=dog;scav.lootT=2;updScav(scav,.1);
      return {animalHeld:held,scavHarvest:dog.dead&&countItem(scav,'hide')===1};
    }));
    await p.close();console.log('PASS individual and take-all animal harvesting confirms before killing');
  }
  {
    const p=await open();
    allTrue(await p.evaluate(()=>{
      const a=allies()[0],e=mk({team:'e',base:60,name:'Threat',x:20,y:20,home:{x:20,y:20}});
      units.splice(0,units.length,a,e);props.splice(0,props.length);a.rules.flee=true;a.x=19;a.y=20;a.cmd=[];a.p.head.hp=a.p.head.max*.35;
      updAlly(a,.1);const triggered=a.retreating&&a.state.startsWith('重傷');
      e.x=a.x+6.5;e.y=a.y;updAlly(a,.1);const sticky=a.retreating&&a.state!=='見敵就打';
      a.cmd=[{t:'move',x:a.x,y:a.y+3}];const y=a.y;updAlly(a,.1);const manual=a.y>y&&a.state==='移動';a.cmd=[];
      e.x=a.x+.5;e.y=a.y;a.cd=0;updAlly(a,.05);const defence=a.cd>0&&a.state.includes('自衛');
      a.x=.65;a.y=.65;e.x=1.5;e.y=1.5;updAlly(a,.1);const bounded=a.x>=.5&&a.y>=.5;
      a.x=19;a.y=20;e.x=20;e.y=20;const rock={x:18,y:20,s:.6,h:18,c:[90,90,90]};props.push(rock);updAlly(a,.1);const avoidsRock=dist(a,rock)>=rock.s*.62+.22;
      e.x=30;e.y=30;a.p.head.hp=a.p.head.max*.45;updAlly(a,.1);const resting=a.retreating&&a.state.includes('休養');
      for(const [k]of PARTS)a.p[k].hp=a.p[k].max;updAlly(a,.1);
      const recovered=!a.retreating;a.retreating=true;for(const k of ['larm','rarm','legs']){a.p[k].lost=true;a.p[k].hp=0}updAlly(a,.1);
      return {triggered,sticky,manual,defence,bounded,avoidsRock,resting,recovered,amputeeRestEnds:!a.retreating};
    }));
    await p.close();console.log('PASS retreat thresholds, hysteresis, manual priority, close defence, bounds and safe recovery');
  }
  assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
