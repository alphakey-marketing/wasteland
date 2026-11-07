const assert=require('node:assert/strict');const {chromium}=require('playwright');
let browser;const errors=[];
function check(o){for(const[k,v]of Object.entries(o))assert.equal(v,true,k)}
async function journal(p){await p.click('#bObjective')}
async function close(p){await p.click('#bJournalClose')}
async function setup(p){await p.evaluate(()=>{
  setPaused(true);autoPause=false;for(const u of allSquad()){u.rules={flee:false,rescue:false,fight:false};u.cmd=[]}
  window.quiet=()=>{for(const u of units)if(['e','w','s','v'].includes(u.team)){u.dead=u.down=true}};
  window.go=target=>{quiet();const g=AREAS[activeArea].gate;for(const u of allies()){u.x=g.x;u.y=g.y;u.cmd=[]}sel.clear();allies().forEach(u=>sel.add(u));if(!travelArea(travelParty(),target))throw Error('travel failed');quiet()};
  window.dock=()=>{for(const u of allies()){u.cmd=[];u.x=INNKEEPER.x+.6;u.y=INNKEEPER.y}quiet()};
})}
async function loot(p,id){
  await close(p);const s=await p.evaluate(id=>{quiet();const b=piles.find(p=>p.id===id),a=allies()[0];sel.clear();sel.add(a);a.x=b.x-1.2;a.y=b.y;updateFog();centerOn(b.x,b.y);return scr(b.x,b.y,4)},id);
  await p.mouse.click(s.x,s.y);await p.locator('#cmenu button').filter({hasText:'搜查'}).click();await p.evaluate(()=>{for(let n=0;n<100&&!modal;n++)simulate(.1)});
  const diagnostic=await p.evaluate(()=>({menu:cmenu.hidden?'':cmenu.textContent,cmd:allies().map(u=>u.cmd.map(c=>c.t)),modal}));
  assert.equal(await p.locator('#lootSheet').isVisible(),true,id+' loot '+JSON.stringify(diagnostic));await p.click('#bLootAll');await p.click('#bLootClose');
}
async function turn(p,label){await p.evaluate(()=>dock());await journal(p);await p.getByRole('button',{name:label,exact:true}).click()}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const side of['takeda','uesugi','village','loss']){
    const p=await browser.newPage({viewport:{width:side==='takeda'?360:390,height:844},isMobile:true,hasTouch:true});
    p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await p.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{setPaused(true);cb(t)})});
    await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');await setup(p);
    await journal(p);assert.equal(await p.getByRole('button',{name:'接受尋糧委託',exact:true}).isDisabled(),true);await close(p);
    await p.evaluate(()=>dock());await journal(p);await p.getByRole('button',{name:'接受尋糧委託',exact:true}).click();await close(p);
    check(await p.evaluate(()=>{const old=money;return{once:!acceptBorderQuest()&&money===old,stage:campaign.stage==='grain',cache:areaStates.temple.piles.filter(p=>p.id==='border-grain').length===1,valid:!!validateSave(JSON.parse(serialize()))}}));
    await p.evaluate(()=>save(false));await p.reload({waitUntil:'networkidle'});await setup(p);assert.equal(await p.evaluate(()=>campaign.stage),'grain');
    await p.evaluate(()=>go('temple'));await journal(p);await loot(p,'border-grain');
    check(await p.evaluate(()=>{const u=allies().find(u=>countItem(u,'border_grain'));const m=merchantState('village'),cash=money;return{noSale:sellTo(u,m,u.pack.findIndex(s=>s.id==='border_grain'))===0&&money===cash,noRemote:!turnBorderCargo()}}));
    await p.evaluate(()=>go('village'));await turn(p,'交出糧袋 · 報酬 90 文');assert.equal(await p.evaluate(()=>campaign.stage),'orders');
    await close(p);await p.evaluate(()=>{go('temple');go('forge')});await journal(p);await loot(p,'border-orders');
    await p.evaluate(()=>{go('temple');go('village')});await turn(p,'交出兩封軍令 · 報酬 60 文');
    const selected=side==='loss'?'village':side,name={takeda:'武田家',uesugi:'上杉家',village:'青葉村'}[selected];
    await p.getByRole('button',{name:'了解：'+name,exact:true}).click();await p.getByRole('button',{name:'確認呢個選擇',exact:true}).click();
    check(await p.evaluate(selected=>({side:campaign.side===selected,locked:!chooseBorderSide(selected),npc:!!borderFind('border_refugee'),valid:!!validateSave(JSON.parse(serialize()))}),selected));
    await close(p);await p.evaluate(()=>{go('temple');go('forge')});
    check(await p.evaluate(()=>{const n=borderFind('border_refugee'),a=allies()[0];a.x=n.x-1;a.y=n.y;quiet();const started=beginBorderEscort(a,n),x=n.x;a.x-=2;tickCampaign(.1);return{started,follow:n.x<x,hostile:hostile(n,mk({team:'e',base:40,x:1,y:1})),friendly:!hostile(n,a)}}));
    if(side==='loss'){
      check(await p.evaluate(()=>{const n=borderFind('border_refugee');kill(n);tickCampaign(.1);const cash=money;return{loss:campaign.stage==='loss',noReward:!finishBorderEscort()&&money===cash}}));
      await p.evaluate(()=>save(false));await p.reload({waitUntil:'networkidle'});assert.equal(await p.evaluate(()=>campaign.stage),'loss');
    }else{
      if(side==='takeda'){
        check(await p.evaluate(()=>{
          quiet();sel.clear();allies().forEach(u=>sel.add(u));startTravel('temple');for(let n=0;n<400&&activeArea==='forge';n++)simulate(.1);
          const first=activeArea==='temple'&&units.includes(borderFind('border_refugee'));
          quiet();startTravel('village');for(let n=0;n<400&&activeArea==='temple';n++)simulate(.1);
          const second=activeArea==='village'&&units.includes(borderFind('border_refugee'));
          const a=allies().find(u=>u.id===campaign.leaderId);a.cmd=[{t:'talk',npc:INNKEEPER,act:'campaign'}];for(let n=0;n<300&&!modal;n++)simulate(.1);
          return{first,second,walkedHome:dist(borderFind('border_refugee'),INNKEEPER)<=3.2};
        }));
        await close(p);
      }else{
        await p.evaluate(()=>{const n=borderFind('border_refugee');n.down=true;n.p.torso.hp=-1;pickUp(allies()[0],n);go('temple');save(false)});
        await p.reload({waitUntil:'networkidle'});await setup(p);
        check(await p.evaluate(()=>{const n=borderFind('border_refugee');return{carried:!!n.carriedBy&&n.carriedBy.carry===n,down:n.down}}));
        await p.evaluate(()=>{go('village');dock();simulate(.1)});
      }
      await journal(p);await p.getByRole('button',{name:'交付護送 · 完成地方故事',exact:true}).click();
      check(await p.evaluate(selected=>{const cash=money,n=borderFind('border_refugee');return{complete:campaign.stage==='complete',once:!finishBorderEscort()&&money===cash,lord:selected==='village'?!borderFind('border_lord'):borderFind('border_lord').name===BORDER_SIDES[selected].lord,valid:!!validateSave(JSON.parse(serialize())),present:units.includes(n)}},selected));
      await p.getByRole('button',{name:'邀請阿澄加入隊伍（最多 8 人）',exact:true}).click();
      await p.evaluate(()=>save(false));await p.reload({waitUntil:'networkidle'});
      check(await p.evaluate(()=>({ending:campaign.stage==='complete',recruit:campaign.recruited&&allies().some(u=>u.kind==='border_refugee'),count:allSquad().length===5,stock:merchantState('village').stock.ration===4,noOverflow:document.documentElement.scrollWidth<=innerWidth})));
      if(side==='takeda'){
        await setup(p);await p.evaluate(()=>{go('temple');const guard=borderFind('border_patrol_takeda');guard.down=true;guard.p.torso.hp=-1;pickUp(allies()[0],guard);go('village');save(false)});
        await p.reload({waitUntil:'networkidle'});
        check(await p.evaluate(()=>{const patrol=borderFind('border_patrol_takeda');return{guardIdentity:GUARD!==patrol&&GUARD.kind!=='border_patrol_takeda',patrolCarry:patrol.carriedBy?.carry===patrol,oneGuard:units.filter(u=>u===GUARD).length===1}}));
      }
    }
    await p.close();console.log('PASS '+side+': physical cargo loot/return, irreversible choice, escort/failure, finite rewards, recruit/lord and reload');
  }
  assert.deepEqual(errors,[]);console.log('PASS no runtime/resource/console errors');
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
