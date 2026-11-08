const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  assert.equal(await p.isVisible('#bSwap'),false);
  // send one ally to the temple, rest stay in the village
  await p.evaluate(()=>{setPaused(true);sel.clear();const u=allies()[0];sel.add(u);const g=exitTo('village','temple');u.x=g.x-1;u.y=g.y;startTravel('temple');for(let i=0;i<60&&activeArea==='village';i++)simulate(.1)});
  await p.waitForTimeout(400);
  assert.equal(await p.evaluate(()=>activeArea),'temple');
  assert.equal(await p.isVisible('#bSwap'),true);
  await p.click('#bSwap');
  assert.equal(await p.evaluate(()=>activeArea),'village');
  await p.waitForTimeout(300);assert.equal(await p.isVisible('#bSwap'),true);
  // paused: a second order replaces the first (one command per unit)
  const n=await p.evaluate(()=>{setPaused(true);sel.clear();const u=allies()[0];sel.add(u);issue(()=>({t:'move',x:5,y:5}));issue(()=>({t:'move',x:6,y:6}));return [u.cmd.length,u.cmd[0].x]});
  assert.deepEqual(n,[1,6]);
  assert.deepEqual(errors,[]);await b.close();console.log('PASS swap: squad switch button across areas');
})().catch(e=>{console.error(e);process.exit(1)});
