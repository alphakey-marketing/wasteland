const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  const r=await p.evaluate(()=>{
    setPaused(true);autoPause=false;const out={};
    const quiet=()=>{for(const u of units)if(['e','w','s','v'].includes(u.team))u.dead=u.down=true};
    const run=(n=400)=>{for(let i=0;i<n;i++){simulate(.1);if(window.__area!==activeArea)return}};
    // data: every link has a matching exit, temple has two distinct exits
    out.exitsMatch=Object.entries(AREAS).every(([id,a])=>a.links.every(l=>exitTo(id,l))&&a.exits.every(e=>AREAS[e.to]));
    out.templeTwo=AREAS.temple.exits.length===2&&AREAS.temple.exits[0].to!=='forge'&&exitTo('temple','forge').x!==AREAS.temple.gate.x;
    // arrival is inside the destination area but outside its own exit zone
    out.arrivalOff=['village>temple','temple>village','temple>forge','forge>temple'].every(k=>{const[a,b]=k.split('>');const pt=arrivalPoint(b,a),e=exitTo(b,a);return Math.hypot(pt.x-e.x,pt.y-e.y)>e.r&&pt.x>0&&pt.y>0&&pt.x<MAP&&pt.y<MAP});
    // 1) walking AI inside an exit zone never travels
    for(const u of [...units])if(['v','e','w','s'].includes(u.team))units.splice(units.indexOf(u),1);quiet();const[a,b]=allies();const ve=exitTo('village','temple');
    a.x=ve.x;a.y=ve.y;a.cmd=[];b.cmd=[];window.__area=activeArea;run(50);out.aiStays=activeArea==='village';
    // 2) commanded move into zone: only the selected unit goes
    sel.clear();sel.add(a);b.x=3;b.y=3;a.x=ve.x-4;a.y=ve.y-4;
    const s=scr(ve.x+.2,ve.y,0);tap(s.x,s.y);
    out.pending=!!pendingTravel&&pendingTravel.target==='temple'&&pendingTravel.party.length===1;
    a.x=ve.x-1.5;a.y=ve.y;run(400);
    out.onlySelected=activeArea==='temple'&&units.includes(a)&&!units.includes(b)&&areaStates.village.units.includes(b);
    // arrived beside the village exit of the temple, not on top of the forge exit
    const te=exitTo('temple','village');out.arrivedNearVillageExit=Math.hypot(a.x-te.x,a.y-te.y)<4&&Math.hypot(a.x-te.x,a.y-te.y)>te.r;
    // 3) forge exit is a different place; going there lands in forge by its temple exit
    for(const u of [...units])if(['v','e','w','s'].includes(u.team))units.splice(units.indexOf(u),1);sel.clear();sel.add(a);a.cmd=[];const fe=exitTo('temple','forge');a.x=fe.x-6;a.y=fe.y-3;window.__area=activeArea;
    const s2=scr(fe.x+.2,fe.y,0);tap(s2.x,s2.y);a.x=fe.x-1.5;a.y=fe.y;run(400);
    out.toForge=activeArea==='forge';
    // 4) fade overlay never blocks input
    out.fadeClear=getComputedStyle(document.querySelector('#fade')).pointerEvents==='none';
    return out;
  });
  for(const [k,v] of Object.entries(r))assert.equal(v,true,k);
  assert.deepEqual(errors,[]);
  await browser.close();console.log('PASS exits: per-link edge exits, manual-only entry, selected-only travel, arrival points');
})().catch(e=>{console.error(e);process.exit(1)});
