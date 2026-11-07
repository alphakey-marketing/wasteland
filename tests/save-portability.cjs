const assert=require('node:assert/strict');const fs=require('node:fs/promises');const {chromium}=require('playwright');
let browser;const errors=[];
async function reload(p){await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>setPaused(true))}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await p.route('**/favicon.ico',r=>r.fulfill({status:204}));p.on('pageerror',e=>errors.push(e.stack));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{setPaused(true);cb(t)})});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  const original=await p.evaluate(()=>{money=321;allies()[0].food=67;save(false);return serialize()});
  const rejected=await p.evaluate(()=>{
    const before={main:localStorage.getItem(SAVE_KEY),backup:localStorage.getItem(BACKUP_SAVE_KEY),money};
    const variants=['{','{}',JSON.stringify({v:99}),' '.repeat(SAVE_MAX_BYTES+1)];
    for(const change of[
      d=>{d.areas.village.units[0].pack=[{id:'not-an-item',n:1}]},
      d=>{d.areas.village.units[0].p.head.max=0},
      d=>{d.areas.village.units[0].sk.atk=null},
      d=>{d.areas.village.units[0].name='<img src=x onerror=alert(1)>'},
      d=>{d.areas.village.units[0].carryId=d.areas.village.units[0].id},
      d=>{d.areas.village.units.push(d.areas.village.units[0])},
      d=>{d.economy={merchants:{bad:{kind:'bad',cash:5,day:0,stock:{}}}}},
      d=>{d.areas.village.units[0].food=-1},
      d=>{d.exploration={forge:'bad'}},
    ]){const d=JSON.parse(serialize());change(d);variants.push(JSON.stringify(d))}
    const all=variants.every(raw=>!importSaveText(raw));
    const after={main:localStorage.getItem(SAVE_KEY),backup:localStorage.getItem(BACKUP_SAVE_KEY),money};
    return all&&JSON.stringify(before)===JSON.stringify(after)&&!restarting;
  });assert.equal(rejected,true);
  assert.equal(await p.evaluate(raw=>{
    const originalSet=Storage.prototype.setItem,before=localStorage.getItem(SAVE_KEY),beforeMoney=money;
    Storage.prototype.setItem=function(k,v){if(k===SAVE_KEY)throw new DOMException('full','QuotaExceededError');return originalSet.call(this,k,v)};
    try{return !importSaveText(raw)&&localStorage.getItem(SAVE_KEY)===before&&money===beforeMoney&&!restarting}
    finally{Storage.prototype.setItem=originalSet}
  },original),true);
  // Exercise the browser download and real file-upload path, then verify persistent state after navigation.
  const [download]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#bExport').click())]);
  const exported=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(exported.money,321);assert.equal(exported.areas.village.units.find(u=>u.team==='a').food,67);
  const incoming=JSON.parse(original);incoming.money=789;incoming.areas.village.units.find(u=>u.team==='a').food=44;
  await Promise.all([p.waitForEvent('load'),p.setInputFiles('#saveFile',{name:'incoming.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))})]);
  await p.evaluate(()=>setPaused(true));assert.equal(await p.evaluate(()=>money),789);assert.equal(await p.evaluate(()=>allies()[0].food),44);
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(BACKUP_SAVE_KEY)).money),321);
  await Promise.all([p.waitForEvent('load'),p.evaluate(()=>document.querySelector('#bRestoreSave').click())]);
  await p.evaluate(()=>setPaused(true));assert.equal(await p.evaluate(()=>money),321);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(BACKUP_SAVE_KEY)).money),789);
  // A corrupt main save falls back without erasing the original until an explicit manual replacement.
  await p.evaluate(()=>{localStorage.setItem(SAVE_KEY,'corrupt-original');restarting=true});await reload(p);
  assert.equal(await p.evaluate(()=>money),789);
  assert.equal(await p.evaluate(()=>{save(false);return localStorage.getItem(SAVE_KEY)}),'corrupt-original');
  assert.equal(await p.evaluate(()=>saveProtected),true);
  await p.evaluate(()=>save(true));assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(SAVE_KEY)).money),789);
  // Pre-area legacy files and missing newer optional fields remain accepted.
  assert.equal(await p.evaluate(()=>{const d=JSON.parse(serialize());delete d.areas;delete d.activeArea;delete d.campaign;delete d.exploration;delete d.caravan;delete d.economy;for(const u of d.units)delete u.starvation;return !!validateSave(d)}),true);
  await p.evaluate(()=>{localStorage.setItem(SAVE_KEY,'broken-no-backup');localStorage.removeItem(BACKUP_SAVE_KEY);restarting=true});await reload(p);
  assert.equal(await p.evaluate(()=>{save(false);return localStorage.getItem(SAVE_KEY)}),'broken-no-backup');
  assert.equal(await p.evaluate(()=>saveProtected),true);
  assert.deepEqual(errors,[]);console.log('PASS validated export/import, malformed-file isolation, real file reload, backup swap, corrupt-main fallback/protection and legacy compatibility');
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
