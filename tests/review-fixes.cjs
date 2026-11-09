const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-dev-shm-usage']});
  const p=await b.newPage({viewport:{width:390,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  const r=await p.evaluate(()=>{
    const out={};const u=allies()[0];
    // 1: heavy gear + chest, nothing depositable -> auto cmd must not be cleared every frame
    u.cmd=[{t:'chop',node:props.find(t=>t.tree),auto:true}];
    u.pack=[];addItem(u,'ration',1);u.eq.armor='plate';
    const chest={x:u.x+3,y:u.y,chest:1,name:'儲物箱',pack:[],permanent:1,items:[]};piles.push(chest);
    u.sk.str.lv=1;for(const k of Object.keys(ITEMS))if(k!=='plate'&&ITEMS[k].type==='armor'){}
    // force heavy load via a big carried weight stack of food
    addItem(u,'ration',40);
    const heavy=load(u)>cap(u)*.7;
    simulate(.1);out.kept=!heavy||(u.cmd[0]?.auto===true);
    piles=piles.filter(x=>!x.chest);
    // 2: posts fixed regardless of position
    TRADER.x=1;TRADER.y=1;simT=100;simulate(.1);out.post=TRADER.post.x===4.9&&TRADER.post.y===4.4;
    // 3: jailed commander counts as fallen
    const def=OUTPOSTS[0],o=campaign.outposts[def.id];
    const cmd=borderFind(outpostKind(def,o.owner,'commander'));
    if(!cmd)return{skip:true,out};
    cmd.down=true;cmd.captive=true;tickOneOutpost(def,o,.1);
    out.fell=o.owner===null&&o.phase==='vacant';
    return out});
  const res=r.out||r;
  assert.ok(res.kept&&res.post&&res.fell,JSON.stringify(r));
  assert.deepEqual(errors,[]);await b.close();console.log('PASS review-fixes: auto cmd kept, fixed posts, jailed commander falls');
})().catch(e=>{console.error(e);process.exit(1)});
