const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>{setPaused(true);autoPause=false});
  const r=await p.evaluate(()=>{
    const out={};
    out.three=Object.keys(FACTIONS).join()==='takeda,uesugi,ikko,village';
    out.rel=factionRel('takeda','uesugi')==='enemy'&&factionRel('takeda','village')==='neutral';
    out.twoOutposts=OUTPOSTS.length===2&&!!borderFind('outpost_takeda_commander')&&!!borderFind('outpost_kanaya_uesugi_commander');
    const k=borderFind('outpost_kanaya_uesugi_commander'),m=borderFind('outpost_takeda_commander');
    out.kanayaArea=areaStates.forge.units.includes(k)&&!units.includes(k);
    out.enemyFactions=hostile(k,m)&&hostile(m,k);
    const a=allies()[0];out.neutralToPlayer=!hostile(k,a)&&!hostile(a,m);
    // attacking one outpost angers the faction everywhere
    units.push(k);attack(a,k);out.angerGlobal=campaign.anger.uesugi&&!campaign.anger.takeda&&hostile(k,a)&&!hostile(m,a);
    units.splice(units.indexOf(k),1);
    // kill kanaya commander: vacant, then takeda takes over after countdown (only counts while in that area)
    k.dead=k.down=true;tickCampaign(.1);const o=campaign.outposts.kanaya;out.vacant=o.phase==='vacant'&&o.owner===null&&o.left===45;
    const left=o.left;tickCampaign(30);out.paused=o.left===left;
    out.misakaUntouched=campaign.outposts.misaka.phase==='held';
    // save round trip keeps both outposts
    const d=JSON.parse(serialize());out.saveV3=d.campaign.v===3&&!!d.campaign.outposts.kanaya&&d.campaign.anger.uesugi===true&&validateSave(d)!=null;
    // v2 save migrates: old outpost state moves to misaka, kanaya fresh
    const c=packCampaign();delete c.outposts;c.v=2;c.outpost={phase:'vacant',owner:null,left:12,anger:{takeda:true,uesugi:false}};
    restoreCampaign(c);out.migrated=campaign.v===3&&campaign.outposts.misaka.phase==='vacant'&&campaign.outposts.misaka.left===12&&campaign.outposts.kanaya.phase==='held'&&campaign.anger.takeda===true&&!('outpost' in campaign);
    // bad shapes rejected
    let bad=0;for(const f of [c=>{c.outposts.kanaya.owner='takeda'},c=>{delete c.outposts.kanaya},c=>{c.anger.takeda='x'}]){const c=packCampaign();f(c);try{validateCampaign(c)}catch{bad++}}
    out.rejects=bad===3;
    out.hud=document.querySelector('#bObjective').textContent.includes('金屋寨');
    return out;
  });
  for(const [k,v] of Object.entries(r))assert.equal(v,true,k);
  assert.deepEqual(errors,[]);
  await browser.close();console.log('PASS factions: 3 factions, 2 outposts, shared anger, v2->v3 migration, validation');
})().catch(e=>{console.error(e);process.exit(1)});
