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
    const out={},u=allies()[0],run=(n,f)=>{for(let i=0;i<n;i++){for(const a of allies())a.food=100;simulate(.1);if(f&&f())return i}return -1};
    encRng=()=>.99;sel.clear();sel.add(u);
    // 搵一段 9 米空地
    let Y,X;outer:for(let y=6;y<MAP-6;y++)for(let x=4;x<MAP-14;x++){
      let ok=true;for(let i=0;i<=8&&ok;i++)for(const dy of [-4,0,4])if(placeProblem(x+i,y+dy,'fence'))ok=false;
      if(ok&&!units.some(o=>o.team!=='a'&&Math.hypot(o.x-x-4,o.y-y)<12)){X=x;Y=y;break outer}}
    out.spot=X!=null;
    out.builds=['fence','wall','gate'].every(k=>BUILDS[k]);
    out.line=wallLine({x:X,y:Y},{x:X+8,y:Y},'fence').length===9&&wallLine({x:X,y:Y},{x:X+30,y:Y},'fence').length===12;
    // 材料只夠 5 節：起到 5 節就停
    for(const a of allies())a.pack=a.pack.filter(s=>!['wood','rope','iron'].includes(s.id));
    u.x=X+4;u.y=Y+2;addItem(u,'wood',10);
    buildMode='fence';tryPlaceWall('fence',{x:X,y:Y});tryPlaceWall('fence',{x:X+8,y:Y});
    out.queued=u.cmd.length===9&&buildMode===null;
    run(900,()=>!u.cmd.length);
    const fs=()=>props.filter(q=>q.built==='fence');
    out.partial=fs().length===5&&countItem(u,'wood')===0&&fs().every(q=>q.hp===120&&q.ang===0);
    // 補料起埋
    addItem(u,'wood',8);tryPlaceWall('fence',{x:X,y:Y});tryPlaceWall('fence',{x:X+8,y:Y});run(900,()=>!u.cmd.length);
    out.full=fs().length===9;
    // 敵人喺另一邊：斬牆
    u.x=X+4;u.y=Y+3;u.cmd=[];u.rules.fight=false;
    const e=mk({team:'e',name:'測試賊',color:'#888',base:60,x:X+4,y:Y-3,home:{x:X+4,y:Y-3},aggroR:14,leash:40,aggro:true,eq:{weapon:'machete',armor:null},lv:{atk:30}});units.push(e);
    let crossed=false;const hit=run(400,()=>{if(e.y>Y+.3&&fs().length===9)crossed=true;return fs().some(q=>q.hp<120)});
    out.hack=hit>=0&&!crossed&&e.state==='斬牆';
    const brk=run(900,()=>fs().length<9);out.broke=brk>=0&&piles.some(q=>q.name==='爛木');
    e.dead=e.down=true;units.splice(units.indexOf(e),1);
    // 修理
    const w=fs()[0];w.hp=50;addItem(u,'wood',1);u.x=w.x;u.y=w.y+1;u.cmd=[{t:'repair',node:w}];run(100,()=>!u.cmd.length);
    out.repair=w.hp===120&&countItem(u,'wood')===0;
    // 拆：退一半（木 1）
    const n0=fs().length;u.cmd=[{t:'demolish',node:w}];run(100,()=>!u.cmd.length);out.demolish=fs().length===n0-1&&countItem(u,'wood')===1;
    // 閘門：自己人過到，敵人推返出去
    const g=addBuilt(activeArea,'gate',X+2,Y+6);out.gateHp=g.hp===200&&g.gate===1;
    u.x=X+2;u.y=Y+4.6;u.cmd=[{t:'move',x:X+2,y:Y+7.5}];run(80,()=>!u.cmd.length);out.gateAlly=u.y>Y+7;
    const e2=mk({team:'e',name:'測試賊',color:'#888',base:40,x:X+2.1,y:Y+6.1});wallPush(e2);out.gateFoe=Math.hypot(e2.x-g.x,e2.y-g.y)>=.59;
    // 自動修（做工 craft）
    w.hp=1;const w2=fs()[0];w2.hp=40;addItem(u,'wood',1);u.cmd=[];u.job='craft';run(200,()=>w2.hp===120);out.autoRepair=w2.hp===120;u.job=null;
    // 選單
    showMenu.calls=0;const sm=showMenu;let title='';showMenu=(x,y,t,o)=>{title=t+o.map(q=>q.label).join()};wallMenu(w2,100,100);showMenu=sm;out.menu=/木柵/.test(title)&&/拆/.test(title);
    // 夜襲
    raidDay=-1;nightRaidAt=null;simT=DAY_LEN*3+DAY_LEN*.75;encRng=()=>0;tickNightRaid(.1);out.raidWait=nightRaidAt>simT;
    simT=nightRaidAt+.1;tickNightRaid(.1);out.raid=units.filter(o=>o.kind==='enc_nightraid'&&o.team==='e').length>=3&&raidDay===3;
    const nr=units.filter(o=>o.kind==='enc_nightraid').length;tickNightRaid(.1);out.once=units.filter(o=>o.kind==='enc_nightraid').length===nr;
    for(const o of units)if(o.kind==='enc_nightraid'){o.dead=o.down=true}
    w2.hp=77;w2.ang=.5;save(true);return out});
  assert.deepEqual(r,{spot:true,builds:true,line:true,queued:true,partial:true,full:true,hack:true,broke:true,repair:true,demolish:true,gateHp:true,gateAlly:true,gateFoe:true,autoRepair:true,menu:true,raidWait:true,raid:true,once:true},JSON.stringify(r));
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const after=await p.evaluate(()=>({walls:props.filter(q=>q.wall).length,hurt:props.some(q=>q.built==='fence'&&q.hp===77&&q.ang===.5),gate:props.some(q=>q.gate&&q.hp===200),day:raidDay}));
  assert.ok(after.walls>=8&&after.hurt&&after.gate&&after.day===3,JSON.stringify(after));
  // 舊格式：冇 hp/ang 嘅牆，同冇 raidDay
  await p.evaluate(()=>{save(true);const d=JSON.parse(localStorage.getItem(SAVE_KEY));for(const a of Object.values(d.areas||{}))for(const q of a.built||[]){delete q.hp;delete q.ang}
    if(d.encounters)delete d.encounters.raidDay;localStorage.setItem(SAVE_KEY,JSON.stringify(d));save=()=>{}});
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const old=await p.evaluate(()=>({full:props.filter(q=>q.wall).every(q=>q.hp===q.max),n:props.filter(q=>q.wall).length,day:raidDay,ok:allies().length>0}));
  assert.ok(old.full&&old.n>=8&&old.day===-1&&old.ok,JSON.stringify(old));
  if(process.env.SHOT){await p.evaluate(()=>{const f=props.filter(q=>q.wall);f[0].hp=30;const c=f[3];allies().forEach((u,i)=>{u.x=c.x+i*.5;u.y=c.y+1.5});centerOn(c.x,c.y);cam.z=2;render()});await p.waitForTimeout(400);await p.screenshot({path:process.env.SHOT})}
  assert.deepEqual(errors,[]);await b.close();console.log('PASS walls: line build, partial by material, hack+break, repair, demolish, gate, auto repair, menu, night raid, save, old save');
})().catch(e=>{console.error(e);process.exit(1)});
