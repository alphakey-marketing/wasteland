const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const width of [360,390]){
  const p=await b.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  // build a cage, make a downed bandit, jail it
  const r=await p.evaluate(()=>{
    const u=allies()[0];sel.clear();sel.add(u);addItem(u,'wood',8);addItem(u,'rope',4);addItem(u,'iron',4);
    let sp=null;for(let x=2;x<10&&!sp;x+=1.5)for(let y=2;y<10&&!sp;y+=1.5)if(!placeProblem(x,y))sp=[x,y];
    u.cmd=[{t:'build',k:'cage',x:sp[0],y:sp[1]}];for(let j=0;j<600&&u.cmd.length;j++)simulate(.1);
    const cage=props.find(p=>p.built==='cage');
    const e=mk({team:'e',kind:'bandit',name:'山賊甲',color:'#a33',base:60,x:u.x+1,y:u.y+1,lv:{atk:3}});units.push(e);e.down=true;e.p.torso.hp=-3;
    const none=jailOption(e);
    u.cmd=[{t:'jail',body:e,cage}];for(let j=0;j<600&&u.cmd.length;j++)simulate(.1);
    for(let j=0;j<400;j++)simulate(.1); // stays down while captive
    return{opt:!!none,caged:e.captive===true&&cage.occ===e&&e.down,near:Math.hypot(e.x-cage.x,e.y-cage.y)<.1,carried:!u.carry,chance:persuadeChance(e)}});
  assert.ok(r.opt&&r.caged&&r.near&&r.carried,JSON.stringify(r));assert.ok(r.chance>.05&&r.chance<=.9);
  // save with captive then reload
  await p.evaluate(()=>save(true));await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(500);
  const rl=await p.evaluate(()=>{const c=props.find(p=>p.built==='cage');return{occ:!!c&&!!c.occ&&c.occ.captive===true&&c.occ.down}});
  assert.ok(rl.occ,'captive survives reload');
  // persuade: forced success joins squad; faction unit ransom lowers rep; execute; release
  const act=await p.evaluate(()=>{
    const out={};const c=props.find(p=>p.built==='cage'),e=c.occ,before=allSquad().length;
    const rnd=Math.random;Math.random=()=>0;
    // reach the menu action through the same function the UI uses
    prisonerMenu(e,100,100);document.querySelector('#cmenu button').click();Math.random=rnd;
    out.joined=e.team==='a'&&!e.down&&allSquad().length===before+1&&!c.occ&&!e.captive;
    // faction prisoner ransom
    const f=mk({team:'g',kind:'outpost_takeda_soldier',name:'武田足輕',color:'#b95c48',base:50,x:c.x,y:c.y,lv:{atk:2}});units.push(f);f.down=true;f.captive=true;c.occ=f;
    const rep=campaign.rep.takeda,m=money;prisonerMenu(f,100,100);[...document.querySelectorAll('#cmenu button')].find(b=>/贖金/.test(b.textContent)).click();
    out.ransom=money>m&&campaign.rep.takeda===rep-5&&f.gone===true&&!c.occ;
    // execute
    const g=mk({team:'e',kind:'bandit',name:'山賊乙',color:'#a33',base:50,x:c.x,y:c.y,lv:{atk:2}});units.push(g);g.down=true;g.captive=true;c.occ=g;
    prisonerMenu(g,100,100);[...document.querySelectorAll('#cmenu button')].find(b=>/處決/.test(b.textContent)).click();
    out.exec=g.dead&&!c.occ;
    const h=mk({team:'e',kind:'bandit',name:'山賊丙',color:'#a33',base:50,x:c.x,y:c.y,lv:{atk:2}});units.push(h);h.down=true;h.captive=true;c.occ=h;
    prisonerMenu(h,100,100);[...document.querySelectorAll('#cmenu button')].find(b=>/釋放/.test(b.textContent)).click();
    out.free=h.gone===true&&!c.occ;
    return out});
  assert.deepEqual(act,{joined:true,ransom:true,exec:true,free:true});
  await p.close();}
  assert.deepEqual(errors,[]);await b.close();console.log('PASS prisoners: jail in cage, persist, persuade, ransom, execute, release');
})().catch(e=>{console.error(e);process.exit(1)});
