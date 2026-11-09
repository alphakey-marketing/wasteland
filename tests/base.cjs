const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const width of [360,390]){
  const p=await b.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  // chop a tree: 5 s per wood, tree runs out after 3
  const wood=await p.evaluate(()=>{const u=allies()[0],t=props.find(p=>p.tree);sel.clear();sel.add(u);u.x=t.x-.8;u.y=t.y;u.cmd=[{t:'chop',node:t}];for(let i=0;i<200;i++)simulate(.1);return{n:countItem(u,'wood'),left:treeWood(t),cmd:u.cmd.length}});
  assert.equal(wood.n,3);assert.equal(wood.left,0);assert.equal(wood.cmd,0);
  // not enough materials -> refused
  assert.equal(await p.evaluate(()=>canAfford(BUILDS.cage.cost)),false);
  // give materials, build bed + chest + cage on valid spots
  const r=await p.evaluate(()=>{const u=allies()[0];addItem(u,'wood',20);addItem(u,'rope',4);addItem(u,'hide',1);addItem(u,'iron',2);
    const bad={exit:placeProblem(AREAS.village.exits[0].x,AREAS.village.exits[0].y),prop:placeProblem(props.find(p=>!p.tree&&!p.built).x,props.find(p=>!p.tree&&!p.built).y)};
    sel.clear();sel.add(u);let spots=[];for(let x=2;x<10&&spots.length<3;x+=1.5)for(let y=2;y<10&&spots.length<3;y+=1.5)if(!placeProblem(x,y)&&spots.every(s=>Math.hypot(s[0]-x,s[1]-y)>2))spots.push([x,y]);
    const ks=['bed','chest','cage'];spots.forEach(([x,y],i)=>{u.cmd=[{t:'build',k:ks[i],x,y}];for(let j=0;j<600&&u.cmd.length;j++)simulate(.1)});
    return{bad,spots:spots.length,beds:BEDS.filter(b=>b.own).length,chest:piles.filter(p=>p.chest).length,cages:props.filter(p=>p.built==='cage').length,wood:teamCount('wood'),rope:teamCount('rope'),iron:teamCount('iron')}});
  assert.ok(r.bad.exit&&r.bad.prop,JSON.stringify(r));assert.equal(r.spots,3);
  assert.ok(r.beds===1&&r.chest===1&&r.cages===1,JSON.stringify(r));
  assert.equal(r.wood,3+20-3-4-4);assert.equal(r.rope,1);assert.equal(r.iron,0);
  // own bed: free sleep, heals
  const s=await p.evaluate(()=>{const u=allies()[0],bd=BEDS.find(b=>b.own),m=money;u.p.torso.hp=Math.max(1,u.p.torso.max-5);u.cmd=[{t:'sleep',bed:bd}];for(let i=0;i<100;i++)simulate(.1);return{m:money===m,healed:u.p.torso.hp>u.p.torso.max-5}});
  assert.ok(s.m&&s.healed);
  // chest: deposit via UI, take back
  await p.evaluate(()=>{const u=allies()[0],c=piles.find(p=>p.chest);openLoot(u,c)});
  await p.locator('button[data-dep]').first().click();
  assert.ok(await p.evaluate(()=>piles.find(p=>p.chest).pack.length)>0);
  await p.evaluate(()=>{lootSheet.hidden=true;setModal(false)});
  // save and reload
  const saved=await p.evaluate(()=>{const d=JSON.parse(serialize());return{valid:!!validateSave(d),built:d.areas.village.built.map(b=>b.k).sort()}});
  assert.ok(saved.valid);assert.deepEqual(saved.built,['bed','cage']);
  await p.evaluate(()=>save(true));
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(500);
  const after=await p.evaluate(()=>({beds:BEDS.filter(b=>b.own).length,cages:props.filter(p=>p.built==='cage').length,chest:piles.filter(p=>p.chest).length,stored:(piles.find(p=>p.chest)||{pack:[]}).pack.length}));
  console.log(width,JSON.stringify(after));
  await p.close();}
  assert.deepEqual(errors,[]);await b.close();console.log('PASS base: chop, build bed/chest/cage, own bed, chest, save');
})().catch(e=>{console.error(e);process.exit(1)});
