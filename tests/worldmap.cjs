const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  const r=await p.evaluate(()=>{
    setPaused(true);const o={};
    o.initial=areaStates.village.visited===true&&!areaStates.temple.visited&&!areaStates.forge.visited;
    drawWorldMap();o.drawn=document.querySelector('#worldMap').height===170;
    activateArea('temple');o.templeSeen=areaStates.temple.visited===true;
    const packed=packAreas();o.packed=packed.temple.visited===true&&packed.forge.visited===false;
    return o;
  });
  for(const [k,v] of Object.entries(r))assert.equal(v,true,k);
  await p.click('#bJournal').catch(()=>{});
  assert.equal(await p.evaluate(()=>typeof drawWorldMap),'function');
  await p.reload({waitUntil:'networkidle'});
  assert.deepEqual(errors,[]);await b.close();console.log('PASS worldmap: visited flags, pack, draw');
})().catch(e=>{console.error(e);process.exit(1)});
