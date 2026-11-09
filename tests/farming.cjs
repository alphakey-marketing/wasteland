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
    const out={},u=allies()[0],run=n=>{for(let i=0;i<n;i++)simulate(.1)};
    out.shopSeed=MERCHANTS.village.stock.includes('seed');
    addItem(u,'wood',5);addItem(u,'seed',1);
    // find two clear spots near the squad
    const spots=[];for(let dx=-6;dx<=6&&spots.length<2;dx+=2)for(let dy=-6;dy<=6&&spots.length<2;dy+=2){const x=u.x+dx,y=u.y+dy;if(!placeProblem(x,y)&&!spots.some(s=>Math.hypot(s.x-x,s.y-y)<2.5))spots.push({x,y})}
    u.cmd=[{t:'build',k:'field',x:spots[0].x,y:spots[0].y}];run(300);
    u.cmd=[{t:'build',k:'hearth',x:spots[1].x,y:spots[1].y}];run(300);
    const f=props.find(q=>q.built==='field'),h=props.find(q=>q.built==='hearth');out.built=!!f&&!!h;
    u.cmd=[{t:'sow',node:f}];run(200);out.sown=fieldStage(f)===1&&countItem(u,'seed')===0;
    simT+=FIELD_SEC;out.ripe=fieldStage(f)===3;
    u.cmd=[{t:'reap',node:f}];run(200);out.reaped=fieldStage(f)===0&&countItem(u,'rice')===3&&countItem(u,'seed')===1;
    const food0=countItem(u,'ration');u.cmd=[{t:'cook',node:h}];run(300);out.cooked=countItem(u,'ration')===food0+1&&countItem(u,'rice')===1;
    // auto farm: sows, then reaps after growth
    u.job='farm';u.food=100;run(100);out.autoSow=fieldStage(f)>0;
    simT+=FIELD_SEC;for(let i=0;i<400&&countItem(u,'rice')<4;i++){u.food=100;simulate(.1)}out.autoReap=countItem(u,'rice')>=4;
    // save keeps growth time
    u.job='idle';u.cmd=[];if(fieldStage(f)===0){addItem(u,'seed',1);u.cmd=[{t:'sow',node:f}];run(200)}
    simT-=0;out.left=fieldLeft(f);save(true);return out});
  const left=r.left;delete r.left;
  assert.deepEqual(r,{shopSeed:true,built:true,sown:true,ripe:true,reaped:true,cooked:true,autoSow:true,autoReap:true},JSON.stringify(r));
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const after=await p.evaluate(()=>{const f=props.find(q=>q.built==='field');return f?{left:fieldLeft(f),hearth:props.some(q=>q.built==='hearth')}:null});
  assert.ok(after&&after.hearth&&Math.abs(after.left-left)<=2,JSON.stringify({left,after}));
  // tap menu on field opens without error
  await p.evaluate(()=>{const f=props.find(q=>q.built==='field');const s=scr(f.x,f.y,4);farmMenu(f,s.x,s.y)});
  await p.close();}
  assert.deepEqual(errors,[]);await b.close();console.log('PASS farming: build field/hearth, sow, reap, cook, auto farm, save growth');
})().catch(e=>{console.error(e);process.exit(1)});
