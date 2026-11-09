const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-dev-shm-usage']});
  for(const width of [360,390]){
  const p=await b.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  const r=await p.evaluate(()=>{
    const out={};const al=allies();
    ['chop','mine','guard','idle'].forEach((j,i)=>{if(al[i])al[i].job=j});
    addItem(al[0],'wood',6);addItem(al[0],'rope',2);
    wantedOf().takeda=150;wantedOf().uesugi=60;
    let max=0,tot=0,n=0;const t0=performance.now();
    for(let j=0;j<18000;j++){const a=performance.now();simulate(.1);const d=performance.now()-a;tot+=d;n++;if(d>max)max=d;
      if(j%3000===0){for(const u of allies()){if(u.dead||u.down){u.dead=false;u.down=false;for(const k in u.p)u.p[k].hp=u.p[k].max;u.bleed=0;u.starvation=null}u.food=100}}}
    out.avgMs=+(tot/n).toFixed(3);out.maxMs=+max.toFixed(1);out.wallS=+((performance.now()-t0)/1000).toFixed(1);
    out.days=+(simT/DAY_LEN).toFixed(1);out.units=units.length;
    // save size stable across repeated save/load
    const sizes=[];for(let i=0;i<20;i++){save(true);sizes.push(localStorage.getItem(SAVE_KEY).length);loadGame()}
    out.size0=sizes[0];out.size19=sizes[19];out.grow=sizes[19]-sizes[0];
    return out});
  console.log(width,JSON.stringify(r));
  assert.ok(r.avgMs<8,'avg step too slow '+r.avgMs);
  assert.ok(r.grow<Math.max(2000,r.size0*.05),'save grows '+r.grow);
  // old save: strip every field added after stage 1, then load
  const ok=await p.evaluate(()=>{
    const d=JSON.parse(localStorage.getItem(SAVE_KEY));
    for(const a of Object.values(d.areas||{})){delete a.built;delete a.trees;for(const u of a.units||[]){delete u.job;delete u.captive;delete u.tries}}
    for(const u of d.units||[]){delete u.job}
    if(d.campaign)delete d.campaign.wanted;
    localStorage.setItem(SAVE_KEY,JSON.stringify(d));return loadGame()});
  assert.ok(ok,'old-format save loads');
  await p.evaluate(()=>{for(let i=0;i<300;i++)simulate(.1)});
  await p.close();}
  assert.deepEqual(errors,[]);await b.close();console.log('PASS soak: 30 min sim, perf, save size, old save');
})().catch(e=>{console.error(e);process.exit(1)});
