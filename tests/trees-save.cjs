const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-dev-shm-usage']});
  const p=await b.newPage({viewport:{width:390,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  const pos=await p.evaluate(()=>{const ts=props.filter(t=>t.tree);const a=ts[0],c=ts[1];
    a.wood=0;a.cut=simT-100; // cut 100 s ago -> 140 s left
    c.wood=1;                // partly chopped
    save(true);return{a:[a.x,a.y],c:[c.x,c.y]}});
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(900);
  const r=await p.evaluate(({a,c})=>{const f=(q)=>props.find(t=>t.tree&&Math.abs(t.x-q[0])<1e-6&&Math.abs(t.y-q[1])<1e-6);
    const ta=f(a),tc=f(c);const out={stump:treeWood(ta)===0,partial:treeWood(tc)===1};
    const left=240-(simT-ta.cut);out.left=left>130&&left<=141;
    simT+=150;out.regrow=treeWood(ta)===3;return out},pos);
  assert.deepEqual(r,{stump:true,partial:true,left:true,regrow:true},JSON.stringify(r));
  assert.deepEqual(errors,[]);await b.close();console.log('PASS trees-save: stump, partial wood, remaining regrow time survive reload');
})().catch(e=>{console.error(e);process.exit(1)});
