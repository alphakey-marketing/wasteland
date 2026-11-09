const assert=require('node:assert/strict');const {chromium}=require('playwright');
let browser;const errors=[];
function check(o){for(const[k,v]of Object.entries(o))assert.equal(v,true,k)}
async function setup(p){await p.evaluate(()=>{
  setPaused(true);autoPause=false;
  for(const u of allSquad()){u.rules={flee:false,rescue:false,fight:false};u.cmd=[]}
  window.quiet=()=>{for(const u of units)if(['e','w','s','v'].includes(u.team)){u.dead=u.down=true}};
  window.go=target=>{quiet();const g=exitTo(activeArea,target);for(const u of allies()){u.x=g.x;u.y=g.y;u.cmd=[]}const npc=borderFind('border_refugee');if(campaign.escort&&units.includes(npc)&&!npc.down){npc.x=g.x;npc.y=g.y}sel.clear();allies().forEach(u=>sel.add(u));if(!travelArea(travelParty(),target))throw Error('travel failed');quiet()};
  window.dock=()=>{quiet();for(const u of allies()){u.cmd=[];u.x=INNKEEPER.x+.6;u.y=INNKEEPER.y}};
})}
async function reload(p){await p.evaluate(()=>save(false));await p.reload({waitUntil:'networkidle'});await setup(p)}
async function loot(p,id){
  const s=await p.evaluate(id=>{quiet();const b=piles.find(p=>p.id===id),a=allies()[0];for(const o of allies())if(o!==a){o.x=b.x-5;o.y=b.y}sel.clear();sel.add(a);a.x=b.x-1.2;a.y=b.y;updateFog();centerOn(b.x,b.y);return scr(b.x,b.y,4)},id);
  await p.mouse.click(s.x,s.y);await p.locator('#cmenu button').filter({hasText:'搜查'}).click();await p.evaluate(()=>{for(let n=0;n<100&&!modal;n++)simulate(.1)});
  assert.equal(await p.locator('#lootSheet').isVisible(),true,id);await p.click('#bLootAll');await p.click('#bLootClose');
}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const width of [360,390]){
    const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
    p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await p.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{setPaused(true);cb(t)})});
    await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');await setup(p);
    check(await p.evaluate(()=>({sandbox:campaign.stage==='sandbox',bothLords:!!borderFind('border_lord_takeda')&&!!borderFind('border_lord_uesugi'),refugee:!!borderFind('border_refugee'),grain:borderHasCargo('border_grain'),orders:borderHasCargo('border_orders'),outpost:!!borderFind('outpost_takeda_commander'),valid:!!validateSave(JSON.parse(serialize()))})));
    await p.click('#bObjective');assert.equal(await p.locator('#journalTitle').textContent(),'世情報 · 局勢傳聞');assert.equal(await p.locator('#journalActions button').count(),0);await p.click('#bJournalClose');
    // No quests: the machinist joins on a plain talk, cargo is ordinary sellable goods.
    await p.evaluate(()=>{go('temple');go('forge')});
    check(await p.evaluate(()=>{const n=borderFind('border_refugee'),a=allies()[0],before=allSquad().length;a.x=n.x-1;a.y=n.y;const ok=recruitBorderRefugee(a,n);return{ok,joined:n.team==='a'&&allSquad().length===before+1,again:!recruitBorderRefugee(a,n),noQuestFlags:campaign.escort===false}}));
    await loot(p,'border-orders');
    check(await p.evaluate(()=>{const cash=money,u=allies().find(u=>countItem(u,'border_orders'));return{hasOrders:!!u,sellable:ITEMS.border_orders.type==='goods'&&sellPrice('border_orders')>0}}));
    await p.evaluate(()=>{go('temple')});await loot(p,'border-grain');await p.evaluate(()=>{go('village');dock()});
    check(await p.evaluate(()=>{const cash=money,u=allies().find(u=>countItem(u,'border_grain'));const n=sellTo(u,merchantState('village'),u.pack.findIndex(s=>s.id==='border_grain'));return{sold:n===1&&money>cash,gone:!borderHasCargo('border_grain')}}));
    await reload(p);check(await p.evaluate(()=>({retained:campaign.jobs.grain&&campaign.jobs.orders&&campaign.jobs.rescue&&campaign.recruited,cash:money>0,squad:allSquad().length===5,noRespawn:!borderHasCargo('border_grain')})));
    await p.evaluate(()=>go('temple'));
    const flag=await p.evaluate(()=>{centerOn(OUTPOST_BY_ID.misaka.x,OUTPOST_BY_ID.misaka.y);return scr(OUTPOST_BY_ID.misaka.x,OUTPOST_BY_ID.misaka.y,48)});await p.mouse.click(flag.x,flag.y);assert.match(await p.locator('#cmenu').textContent(),/霧坂關所/);await p.evaluate(()=>hideMenu());
    check(await p.evaluate(()=>{const n=borderFind('outpost_takeda_commander'),a=allies()[0],rep=repTown;attack(a,n);return{familyEnemy:hostile(n,a)&&hostile(a,n),guardNeutral:!hostile(GUARD,a)&&!hostile(GUARD,n),townUnchanged:repTown===rep,familyRep:campaign.rep.takeda===-40}}));
    // Unconsciousness and carrying nearby do not change ownership.
    check(await p.evaluate(()=>{const n=borderFind('outpost_takeda_commander'),a=allies()[0];n.down=true;n.p.torso.hp=-1;n.bleed=0;tickCampaign(.1);const knocked=campaign.outposts.misaka.phase==='held';a.x=n.x;a.y=n.y;pickUp(a,n);tickCampaign(.1);return{knocked,nearby:campaign.outposts.misaka.phase==='held'}}));
    await reload(p);check(await p.evaluate(()=>{const n=borderFind('outpost_takeda_commander');return{carrySaved:n.carriedBy?.carry===n,heldSaved:campaign.outposts.misaka.phase==='held'}}));
    if(width===360){
      await p.evaluate(()=>{go('village');tickCampaign(.1)});
      check(await p.evaluate(()=>{const n=borderFind('outpost_takeda_commander');return{vacant:campaign.outposts.misaka.phase==='vacant',noGuardAlias:n!==GUARD&&units.includes(GUARD),carry:n.carriedBy?.carry===n}}));
      await reload(p);check(await p.evaluate(()=>{const left=campaign.outposts.misaka.left;tickCampaign(60);return{inactivePaused:campaign.outposts.misaka.left===left,carriedStillThere:!!borderFind('outpost_takeda_commander').carriedBy}}));
      await p.evaluate(()=>go('temple'));
    }else{
      check(await p.evaluate(()=>{const n=borderFind('outpost_takeda_commander');drop(n.carriedBy);kill(n);tickCampaign(.1);return{deathVacant:campaign.outposts.misaka.phase==='vacant',deadKept:units.includes(n)&&n.dead}}));
    }
    await p.evaluate(()=>tickCampaign(10));await reload(p);check(await p.evaluate(()=>({remaining:campaign.outposts.misaka.left>34&&campaign.outposts.misaka.left<=35,angerSaved:campaign.anger.takeda})));
    check(await p.evaluate(()=>{tickCampaign(36);const n=borderFind('outpost_uesugi_commander'),old=borderFind('outpost_takeda_soldier');return{occupied:campaign.outposts.misaka.phase==='occupied'&&campaign.outposts.misaka.owner==='uesugi',newArmy:!!n&&!!borderFind('outpost_uesugi_soldier'),fight:hostile(n,old)&&hostile(old,n),newNeutral:!hostile(n,allies()[0])}}));
    check(await p.evaluate(()=>{const n=borderFind('outpost_uesugi_commander'),old=borderFind('outpost_takeda_soldier'),hp=()=>[n,old].reduce((s,u)=>s+Object.values(u.p).reduce((v,p)=>v+p.hp,0),0),before=hp(),random=Math.random;n.x=19;n.y=8;old.x=19.6;old.y=8;try{Math.random=()=>.2;for(let i=0;i<40;i++)simulate(.1)}finally{Math.random=random}return{actualBattle:hp()<before}}));
    await reload(p);check(await p.evaluate(()=>{const n=borderFind('outpost_uesugi_commander');kill(n);tickCampaign(.1);ensureCampaignWorld();return{ruined:campaign.outposts.misaka.phase==='ruined'&&campaign.outposts.misaka.owner===null,noRevive:n.dead&&borderFind(n.kind)===n,noDuplicate:borderUnits().filter(u=>u.kind===n.kind).length===1}}));
    await reload(p);check(await p.evaluate(()=>({ruinedSaved:campaign.outposts.misaka.phase==='ruined',noOverflow:document.documentElement.scrollWidth<=innerWidth,valid:!!validateSave(JSON.parse(serialize()))})));
    // Migration validates every old stage, retaining earned flags and preventing reclaims.
    check(await p.evaluate(()=>{const saved=packCampaign(),cash=money;let migrated=true,valid=true;
      for(const stage of ['offer','grain','orders','decision','escort','complete','loss']){const c={v:1,stage,side:['escort','complete','loss'].includes(stage)?'village':null,escort:stage==='escort',leaderId:null,recruited:stage==='complete',rep:{takeda:3,uesugi:-2,village:4},log:['old']};restoreCampaign(c);migrated&&=campaign.v===3&&campaign.stage==='sandbox'&&campaign.jobs.rescue===(stage==='complete')&&campaign.rep.takeda===3&&money===cash;valid&&=!!validateSave(JSON.parse(serialize()))}
      restoreCampaign(saved);let rejected=false;try{const c=packCampaign();c.outposts.misaka.owner='bad';validateCampaign(c)}catch{rejected=true}return{migrated,valid,rejected};
    }));
    if(width===390){
      await p.evaluate(()=>{const lord=borderFind('border_lord_takeda');lord.kind='border_lord';lord.dead=lord.down=true;const d=JSON.parse(serialize());d.campaign={v:1,stage:'complete',side:'takeda',escort:false,leaderId:null,recruited:true,rep:{takeda:30,uesugi:-30,village:5},log:['old ending']};localStorage.setItem(SAVE_KEY,JSON.stringify(d))});
      await p.reload({waitUntil:'networkidle'});
      check(await p.evaluate(()=>({oldSaveLoaded:campaign.v===3&&campaign.jobs.rescue&&campaign.jobs.grain&&campaign.jobs.orders,oldMoney:money>0,deadLordPreserved:borderFind('border_lord_takeda').dead,oneLord:borderUnits().filter(u=>u.kind==='border_lord_takeda').length===1,recruitPreserved:campaign.recruited&&allSquad().length===5})));
    }
    await p.close();console.log('PASS '+width+': independent rescue/cargo, physical flag UI, faction combat, knockout/capture/death, occupation/ruin, save/reload and old-save migration');
  }
  assert.deepEqual(errors,[]);console.log('PASS zero console/runtime errors');
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
