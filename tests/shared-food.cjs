const assert=require('node:assert/strict');const {chromium}=require('playwright');
let browser;const errors=[];
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.route('**/favicon.ico',r=>r.fulfill({status:204}));
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>{
    setPaused(true);autoPause=false;
    window.resetFood=()=>{units.filter(u=>u.team!=='a').forEach(u=>{u.dead=u.down=true});
      allies().forEach((u,i)=>{u.p=mkParts(u.base);u.dead=u.down=false;u.bleed=0;u.retreating=false;u.starvation=null;u.carry=u.carriedBy=null;u.food=100;u.pack=[];u.cmd=[];u.rules={flee:false,rescue:false,fight:false};u.x=8+i*3;u.y=8});
      const [a,b]=allies();a.food=10;b.pack=[{id:'ration',n:2}];return[a,b]};
    window.advance=t=>{for(let n=0;n<Math.round(t*10);n++)simulate(.1)};
  });
  function check(result){for(const[k,v]of Object.entries(result))assert.equal(v,true,k)}
  check(await p.evaluate(()=>{
    const [a,b]=resetFood();advance(.1);const walks=a.x>8&&a.food<10&&countItem(b,'ration')===2;
    advance(5);return{walks,ate:a.food>40&&a.food<50,onePortion:countItem(b,'ration')===1&&a.pack.length===0,close:dist(a,b)<=.9};
  }));
  check(await p.evaluate(()=>{
    let [a,b]=resetFood();a.cmd=[{t:'move',x:5,y:8}];updAlly(a,.1);const manual=a.x<8&&countItem(b,'ration')===2;
    [a,b]=resetFood();a.retreating=true;a.rules.flee=true;a.p.head.hp=1;updAlly(a,.1);const retreat=a.state.includes('\u4f11\u990a')&&a.x===8;
    [a,b]=resetFood();const e=mk({team:'e',name:'Test enemy',base:50,x:10,y:9});units.push(e);updAlly(a,.1);const danger=a.x===8&&a.food===10;
    [a,b]=resetFood();b.x=15;updAlly(a,.1);const distant=a.x===8&&a.food===10;
    b.x=11;b.dead=true;updAlly(a,.1);const corpse=a.food===10&&a.x===8;
    [a,b]=resetFood();a.down=true;advance(.2);return{manual,retreat,danger,distant,corpse,downed:a.food<10&&countItem(b,'ration')===2};
  }));
  check(await p.evaluate(()=>{
    const [a,b]=resetFood();b.x=8.6;a.food=0;a.starvation={phase:'grace',left:60};advance(.1);
    const rescue=!a.starvation&&a.food>=25&&countItem(b,'ration')===1;
    a.food=10;a.pack=[{id:'ration',n:1}];tickHunger(a,.1);const own=countItem(a,'ration')===0&&countItem(b,'ration')===1;
    a.food=10;a.x=8;b.x=11;updAlly(a,.1);b.pack=[];const left=a.x;updAlly(a,.1);
    return{rescue,own,exhausted:a.food===10&&a.x===left};
  }));
  await p.evaluate(()=>{const[a,b]=resetFood();a.starvation={phase:'grace',left:60};save(false)});
  await p.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{setPaused(true);cb(t)})});
  await p.reload({waitUntil:'networkidle'});
  check(await p.evaluate(()=>{const[a,b]=allies();for(let n=0;n<60;n++)simulate(.1);return{reload:!a.starvation&&a.food>25,stock:countItem(b,'ration')===1}}));
  check(await p.evaluate(()=>{
    const[a,b]=allies();a.food=10;a.pack=[];b.pack=[{id:'ration',n:1}];b.x=AREAS.village.gate.x;b.y=AREAS.village.gate.y;
    travelArea([b],'temple');switchReserve('village');const before={x:a.x,y:a.y};for(let n=0;n<10;n++)simulate(.1);
    return{separateArea:a.food<10&&a.x===before.x&&a.y===before.y&&countItem(b,'ration')===1};
  }));
  assert.deepEqual(errors,[]);console.log('PASS physical sharing, single consumption, manual/retreat/combat priority, range/dead/down restrictions, starvation rescue, own food, depletion, reload and separate areas');
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
