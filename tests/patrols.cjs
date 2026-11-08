const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  const r=await p.evaluate(()=>{
    setPaused(true);const o={};ensureCampaignWorld();activateArea('temple');ensureCampaignWorld();
    for(const u of allies()){u.x=3;u.y=26}
    const at=k=>units.find(u=>u.kind?.startsWith(k));
    // 1) camp has lord, two guards inside it, a patrol outside it
    const c=CAMPS[0],lord=at('border_lord_takeda'),gs=units.filter(u=>u.kind?.startsWith('camp_guard_takeda'));
    o.lordInCamp=Math.hypot(lord.x-c.x,lord.y-c.y)<3;o.twoGuards=gs.length===2&&gs.every(g=>Math.hypot(g.x-c.x,g.y-c.y)<3.5);
    o.guardsStrong=gs.every(g=>g.sk.atk.lv>=25&&g.p.torso.max>=lord.p.torso.max*.8)&&lord.sk.atk.lv>=40;
    const pat=at('patrol_takeda');o.patrol=!!pat&&outpostSide(pat)==='takeda';
    // 2) patrol walks: leaves camp, position changes, no travel
    const x0=pat.x,y0=pat.y;for(let i=0;i<150;i++)simulate(.1);o.patrolMoves=Math.hypot(pat.x-x0,pat.y-y0)>1&&activeArea==='temple';
    // 3) lord reacts: enemy patrol next to camp dies, guards and lord survive
    const foes=[0,1,2].map(i=>borderSpawn('temple',{id:'t-foe'+i,kind:`patrol_uesugi_t${i}`,team:'g',name:'上杉巡邏兵',color:'#7396bd',base:48,x:c.x-3+i*.5,y:c.y+4,home:{x:c.x-3,y:c.y+4},aggroR:5,leash:8,eq:{weapon:'machete',armor:'leather'},lv:{atk:10,tough:10,dod:8}}));
    for(let i=0;i<500;i++){simulate(.1);if(foes.every(f=>f.dead||f.down))break}
    o.foesDown=foes.every(f=>f.dead||f.down);o.guardsLive=gs.every(g=>!g.dead&&!g.down)&&!lord.dead&&!lord.down;
    // 4) raid spawns, is faction-bound, and marches on the outpost; world map flags it
    raidTimer.misaka=.01;tickRaids(.1);const rs=raiders(OUTPOSTS[0]);
    o.raid=rs.length===4&&rs.every(u=>outpostSide(u)==='uesugi')&&campaign.log.some(l=>l.includes('攻向'));
    drawWorldMap();o.noDoubleRaid=(raidTimer.misaka=.01,tickRaids(.1),raiders(OUTPOSTS[0]).length===4);
    // 5) player stays neutral to raiders
    o.neutral=!hostile(areaStates.village.units.find(u=>u.team==='a'),rs[0]);
    // 5b) moving faction units (string ids) still draw a finite sprite
    o.spritesFinite=(()=>{const ms=units.filter(u=>outpostSide(u)&&!u.dead);ms.forEach(u=>u.moving=true);let ok=ms.length>0;const f=ctx.fillRect;ctx.fillRect=function(...a){if(a.some(v=>!Number.isFinite(v)))ok=false;return f.apply(this,a)};for(const u of ms)drawUnit(u);ctx.fillRect=f;return ok})();
    // 6) save keeps camp + raid units
    save(false);return o;
  });
  for(const [k,v] of Object.entries(r))assert.equal(v,true,k);
  await p.reload({waitUntil:'networkidle'});
  const r2=await p.evaluate(()=>{const all=borderUnits();return{lord:all.some(u=>u.kind==='border_lord_takeda'),guards:all.filter(u=>u.kind?.startsWith('camp_guard_')).length,raid:all.some(u=>u.kind?.startsWith('raid_'))}});
  assert.equal(r2.lord,true);assert.ok(r2.guards>=4);assert.equal(r2.raid,true);
  assert.deepEqual(errors,[]);await b.close();console.log('PASS patrols: camps, strong guards, patrols, raids, save/reload');
})().catch(e=>{console.error(e);process.exit(1)});
