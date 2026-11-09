const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const width of [360,390]){
  const p=await b.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  // job buttons on card
  await p.evaluate(()=>openCard(allies()[0]));
  await p.tap('#chJob button[data-job="chop"]');
  assert.equal(await p.evaluate(()=>allies()[0].job),'chop');
  const r=await p.evaluate(()=>{
    const u=allies()[0];sel.clear();sel.add(u);u.cmd=[];
    const tree=props.find(t=>t.tree&&treeWood(t)>0&&fogKnown(t));
    // auto chop: gets wood without any command from us
    const w0=countItem(u,'wood');for(let j=0;j<900&&countItem(u,'wood')<1;j++)simulate(.1);
    const chopped=countItem(u,'wood')>w0||!tree;
    // player command replaces auto command
    u.cmd=[{t:'chop',node:tree,auto:true}];push(u,{t:'talk',npc:u});const replaced=!u.cmd[0].auto;
    u.cmd=[];
    // heavy load + chest -> deposit
    addItem(u,'wood',40);const ch={x:u.x+2,y:u.y,chest:1,name:'儲物箱',pack:[],permanent:1,items:[]};piles.push(ch);
    for(let j=0;j<400&&u.pack.some(s=>s.id==='wood');j++)simulate(.1);
    const stored=ch.pack.some(s=>s.id==='wood'&&s.n>=40);
    // guard and idle
    u.job='idle';u.cmd=[];const idle=!autoWork(u,.1);
    u.job='guard';
    return{chopped,replaced,stored,idle,hasRation:u.pack.some(s=>s.id==='ration')}});
  assert.deepEqual(r,{chopped:true,replaced:true,stored:true,idle:true,hasRation:true},JSON.stringify(r));
  await p.evaluate(()=>{piles=piles.filter(x=>!x.chest);allies()[0].job='mine'});
  await p.evaluate(()=>save(true));await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  assert.equal(await p.evaluate(()=>allies()[0].job),'mine');
  await p.close();}
  assert.deepEqual(errors,[]);await b.close();console.log('PASS autowork: card buttons, auto chop, override, deposit, save');
})().catch(e=>{console.error(e);process.exit(1)});
