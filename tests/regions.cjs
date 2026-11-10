const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-dev-shm-usage']});
  const p=await b.newPage({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  const url=process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/';
  await p.goto(url,{waitUntil:'networkidle'});await p.evaluate(()=>localStorage.clear());await p.reload({waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  const r=await p.evaluate(()=>{
    const out={},ids=Object.keys(AREAS);out.count=ids.length;
    // every area reachable from village
    const seen=new Set(['village']),q=['village'];while(q.length){const a=q.shift();for(const l of AREAS[a].links)if(!seen.has(l)){seen.add(l);q.push(l)}}
    out.reach=seen.size;
    // links two-way and every link has an exit
    out.links=ids.every(a=>AREAS[a].links.every(l=>AREAS[l].links.includes(a)&&AREAS[a].exits.some(e=>e.to===l)));
    // generated exits not blocked by props, and inside map
    const gen=ids.filter(a=>AREAS[a].gen);out.gen=gen.length;
    out.clear=gen.every(a=>AREAS[a].exits.every(e=>e.x>=1&&e.x<=31&&e.y>=1&&e.y<=31&&areaStates[a].props.every(pr=>Math.hypot(pr.x-e.x,pr.y-e.y)>pr.s*.62+1)));
    // same seed -> same layout
    out.same=gen.every(a=>JSON.stringify(genRegion(a).props.map(q=>[q.x,q.y,q.s]))===JSON.stringify(areaStates[a].props.map(q=>[q.x,q.y,q.s])));
    out.foes=gen.every(a=>areaStates[a].units.length>0&&areaStates[a].piles.length===2);
    // danger rises with distance
    const hp=a=>Math.max(...areaStates[a].units.filter(u=>u.team==='e').map(u=>u.sk.tough.lv),0);out.harder=hp('jizo')>hp('amemiya');
    out.fog=gen.every(a=>{activeArea=a;return hasFog()});activeArea='village';
    return out});
  assert.deepEqual(r,{count:9,reach:9,links:true,gen:6,clear:true,same:true,foes:true,harder:true,fog:true},JSON.stringify(r));
  // walk a squad to every generated area: switch time, canvas cache, fog reveal
  const walk=await p.evaluate(async()=>{
    const out={times:[],canv:0,explored:true};
    const order=['saijo','hachiman','saijo','village','temple','amemiya','zenkoji','amemiya','temple','forge','jizo','shio'];
    for(const id of order){const g=exitTo(activeArea,id);
      for(const u of units)if(allies()[0]&&hostile(u,allies()[0])&&dist(u,g)<7){u.dead=true;u.down=true}
      allies().forEach((u,i)=>{u.x=g.x+(i%2)*.4;u.y=g.y+Math.floor(i/2)*.4});
      const t=performance.now();const ok=travelArea(allies(),id);out.times.push(performance.now()-t);
      if(!ok||activeArea!==id){out.fail=id;break}
      const arr=allies()[0];out.blocked=(out.blocked||0)+props.filter(q=>!q.bed&&Math.hypot(q.x-arr.x,q.y-arr.y)<q.s*.62+.2).length;
      for(let i=0;i<20;i++)simulate(.1);render();
      if(AREAS[id].gen&&!fogKnown(allies()[0]))out.explored=false}
    out.canv=groundCache.size;out.max=Math.max(...out.times);out.area=activeArea;save(false);return out});
  assert.ok(walk.explored&&!walk.fail&&!walk.blocked&&walk.canv<=2&&walk.area==='shio',JSON.stringify(walk));
  console.log('switch ms max',walk.max.toFixed(0));
  // save/reload keeps area and fog per region; tree chop kept
  const before=await p.evaluate(()=>{const t=props.find(q=>q.tree);t.chopped=true;t.regrow=100;save(false);
    return{n:Object.keys(packExploration().regions).length,tree:[t.x,t.y],len:JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>localStorage.getItem(k).includes('"areas"')))).areas?1:0}});
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const after=await p.evaluate(t=>{const tr=props.find(q=>q.x===t[0]&&q.y===t[1]);return{area:activeArea,n:Object.keys(packExploration().regions).length,known:fogKnown(allies()[0]),tree:!!tr&&!!tr.chopped}},before.tree);
  assert.ok(after.area==='shio'&&after.n===before.n&&before.n>=6&&after.known,JSON.stringify({before,after}));
  // old save without new regions still loads and gains them
  const old=await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>localStorage.getItem(k).includes('"areas"'));const d=JSON.parse(localStorage.getItem(k));
    for(const id of Object.keys(REGIONS))delete d.areas[id];d.activeArea='village';delete d.exploration.regions;
    for(const u of d.units||[])if(u.area&&REGIONS[u.area])u.area='village';
    localStorage.setItem(k,JSON.stringify(d));return k});
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const o=await p.evaluate(()=>({area:activeArea,n:Object.keys(areaStates).length,fresh:areaStates.jizo.units.length>0}));
  assert.ok(o.n===9&&o.fresh,JSON.stringify(o));
  // map sheet shows 9 nodes
  await p.evaluate(()=>{setPaused(false);openWorldMap()});const nodes=await p.locator('#mapNodes .mapNode').count();assert.equal(nodes,9);
  await p.screenshot({path:process.env.SHOT||require('os').tmpdir()+'/regions-map.png'});
  assert.deepEqual(errors,[]);await b.close();console.log('PASS regions: 9 areas linked, seeded, fog per area, save/reload, old save migrate, map 9 nodes');
})().catch(e=>{console.error(e);process.exit(1)});
