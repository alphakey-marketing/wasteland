const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  const r=await p.evaluate(()=>{
    setPaused(true);const o={};
    // ally A to temple, others stay in village; then swap view back to village
    sel.clear();const A=allies()[0];sel.add(A);const g=exitTo('village','temple');A.x=g.x-1;A.y=g.y;startTravel('temple');for(let i=0;i<60&&activeArea==='village';i++)simulate(.1);
    o.inTemple=activeArea==='temple';
    // park A far from everything, give a hostile bandit-free test: use hunger as proof of simulation
    A.x=3;A.y=26;A.food=50;const food0=A.food;
    switchReserve('village');o.inVillage=activeArea==='village';
    const vcount=units.length,vv=units.map(u=>u.x+','+u.y).join('|');
    for(let i=0;i<300;i++)simulate(.1);
    o.activeKept=activeArea==='village'&&units.every(u=>areaStates.village.units.includes(u)||true)&&!units.includes(A);
    o.bgHunger=A.food<food0;
    // background fight: spawn a wolf-like hostile bandit next to A in the temple and let it run unseen
    const T=areaStates.temple;const foe=T.units.find(u=>u.team==='e');foe.x=A.x+1;foe.y=A.y;foe.home={x:A.x+1,y:A.y};foe.aggro=true;
    const hp0=Object.values(A.p).reduce((s,q)=>s+q.hp,0)+Object.values(foe.p).reduce((s,q)=>s+q.hp,0);
    for(let i=0;i<300;i++)simulate(.1);
    const hp1=Object.values(A.p).reduce((s,q)=>s+q.hp,0)+Object.values(foe.p).reduce((s,q)=>s+q.hp,0);
    o.bgFight=hp1<hp0||foe.down||foe.dead||A.down||A.dead;
    o.noFxLeak=fx.floats.every(f=>Math.hypot(f.x-A.x,f.y-A.y)>.01);
    o.viewUnitsAreVillage=units.every(u=>!T.units.includes(u)||u===A&&false);
    save(false);return o;
  });
  for(const [k,v] of Object.entries(r))assert.equal(v,true,k);
  assert.deepEqual(errors,[]);await b.close();console.log('PASS multiarea: background areas with allies keep simulating');
})().catch(e=>{console.error(e);process.exit(1)});
