const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-dev-shm-usage']});
  const p=await b.newPage({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  await p.evaluate(()=>localStorage.clear());await p.reload({waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  const r=await p.evaluate(()=>{
    const out={},u=allies()[0],run=n=>{for(let i=0;i<n;i++){u.food=100;simulate(.1)}};
    out.skill=!!u.sk.smith&&u.sk.smith.lv===1;
    addItem(u,'wood',12);addItem(u,'iron',20);addItem(u,'rope',1);addItem(u,'meat',1);addItem(u,'hide',3);
    const spots=[];for(let dx=-7;dx<=7&&spots.length<3;dx+=2)for(let dy=-7;dy<=7&&spots.length<3;dy+=2){const x=u.x+dx,y=u.y+dy;if(!placeProblem(x,y)&&!spots.some(s=>Math.hypot(s.x-x,s.y-y)<2.5))spots.push({x,y})}
    ['smelter','bench','anvil'].forEach((k,i)=>{u.cmd=[{t:'build',k,x:spots[i].x,y:spots[i].y}];run(300)});
    const at=k=>props.find(q=>q.built===k),sm=at('smelter'),be=at('bench'),an=at('anvil');out.built=!!(sm&&be&&an);
    // smelt steel
    const iron0=countItem(u,'iron');sm.q.push('steel');u.cmd=[{t:'craft',node:sm}];run(700);
    out.steel=countItem(u,'steel')===1&&countItem(u,'iron')===iron0-2&&!sm.q.length;
    // bench: cooked meat
    be.q.push('cooked_meat');u.cmd=[{t:'craft',node:be}];run(200);out.meat=countItem(u,'cooked_meat')===1;
    // missing material stops, nothing taken
    be.q.push('kit');u.cmd=[{t:'craft',node:be}];run(30);out.stuck=be.q.length===1&&!be.paid&&countItem(u,'kit')===0;be.q=[];
    // locked advanced
    out.locked=!!workLock(workRecipe('forged_blade'));
    // anvil machete (quality possible)
    an.q.push('machete');u.cmd=[{t:'craft',node:an}];run(600);out.machete=u.pack.some(s=>baseId(s.id)==='machete');
    out.skillUp=u.sk.smith.lv>1;
    // quality roll odds rise with skill
    const roll=lv=>{u.sk.smith.lv=lv;let g=0;for(let i=0;i<2000;i++)if(rollQuality(u,'machete')!=='machete')g++;return g};
    const lo=roll(1),hi=roll(20);out.quality=hi>lo*3;out.great=(()=>{u.sk.smith.lv=20;for(let i=0;i<500;i++)if(rollQuality(u,'machete')==='machete~2')return true;return false})();
    u.sk.smith.lv=2;
    out.betterDmg=ITEMS['machete~2'].dmg[1]>ITEMS.machete.dmg[1]&&ITEMS['worked_armor~1'].red>ITEMS.worked_armor.red&&sellPrice('machete~1')>sellPrice('machete');
    // auto job crafts queue
    u.pack=u.pack.filter(s=>!['iron','wood','steel'].includes(s.id));addItem(u,'meat',2);be.q.push('cooked_meat','cooked_meat');u.job='craft';u.cmd=[];run(400);out.auto=!be.q.length&&countItem(u,'cooked_meat')===3;
    u.job='idle';u.cmd=[];
    // leave a half-done paid job, then save
    addItem(u,'iron',3);addItem(u,'wood',1);an.q.push('machete','machete');u.cmd=[{t:'craft',node:an}];run(80);u.cmd=[];
    addItem(u,'machete~1',1);
    out.save={q:an.q.length,paid:an.paid,prog:Math.round(an.prog)};save(true);return out});
  const sv=r.save;delete r.save;
  assert.deepEqual(r,{skill:true,built:true,steel:true,meat:true,stuck:true,locked:true,machete:true,skillUp:true,quality:true,great:true,betterDmg:true,auto:true},JSON.stringify(r));
  assert.ok(sv.paid&&sv.q===2&&sv.prog>0,JSON.stringify(sv));
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const after=await p.evaluate(()=>{const an=props.find(q=>q.built==='anvil'),u=allies()[0];
    return{q:an?.q.length,paid:an?.paid,prog:Math.round(an?.prog||0),smith:u.sk.smith.lv,good:allies().some(a=>countItem(a,'machete~1')>0)}});
  assert.ok(after.q===2&&after.paid&&Math.abs(after.prog-sv.prog)<=1&&after.smith>1&&after.good,JSON.stringify({sv,after}));
  // old save without smith skill still loads
  await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>localStorage.getItem(k).includes('"areas"'));const d=JSON.parse(localStorage.getItem(k));
    for(const u of d.units)delete u.sk.smith;for(const a of Object.values(d.areas))for(const u of a.units||[])if(u.sk)delete u.sk.smith;localStorage.setItem(k,JSON.stringify(d))});
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const old=await p.evaluate(()=>({ok:allies().length>0&&allies().every(u=>u.sk.smith?.lv>=1),anvil:!!props.find(q=>q.built==='anvil')}));
  assert.ok(old.ok&&old.anvil,JSON.stringify(old));
  // menu opens
  await p.evaluate(()=>{const an=props.find(q=>q.built==='anvil');centerOn(an.x,an.y);render();const s=scr(an.x,an.y,6);workMenu(an,s.x,s.y)});
  await p.waitForTimeout(200);if(process.env.SHOT)await p.screenshot({path:process.env.SHOT});
  assert.deepEqual(errors,[]);await b.close();console.log('PASS workshop: smelter steel, bench, anvil, lock, quality odds, smith skill, auto craft, save queue, old save skill');
})().catch(e=>{console.error(e);process.exit(1)});
