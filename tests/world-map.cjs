const assert=require('node:assert/strict');const {chromium}=require('playwright');
const errors=[];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.WASTELAND_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-dev-shm-usage']});
  for(const width of [360,390]){
  const p=await b.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(process.env.WASTELAND_TEST_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});await p.click('#bStart');
  await p.evaluate(()=>setPaused(true));
  // button reachable and not overlapping objective
  const box=await p.evaluate(()=>{const a=$('#bMap').getBoundingClientRect(),o=$('#bObjective').getBoundingClientRect();return{h:a.height,w:a.width,overlap:o.right>a.left&&o.left<a.right&&o.bottom>a.top&&o.top<a.bottom,inView:a.right<=innerWidth}});
  assert.ok(box.h>=44&&box.w>=44&&!box.overlap&&box.inView,JSON.stringify(box));
  await p.tap('#bMap');
  assert.equal(await p.isVisible('#mapSheet'),true);
  assert.equal(await p.locator('.mapNode').count(),await p.evaluate(()=>Object.keys(AREAS).length));
  assert.match(await p.textContent('#mapTop'),/通緝/);
  // far area: no travel button, route hint; unexplored shows ?
  await p.tap('.mapNode[data-area="forge"]');
  const far=await p.evaluate(()=>({info:$('#mapInfo').textContent,btns:[...document.querySelectorAll('#mapActions button')].map(b=>b.textContent)}));
  assert.ok(!far.btns.some(t=>t.startsWith('出發')),JSON.stringify(far));assert.match(far.info,/要經/);
  if(!(await p.evaluate(()=>areaStates.forge.visited)))assert.match(far.info,/未探索/);
  // neighbour: travel works
  await p.evaluate(()=>{sel.clear();allies().forEach(u=>sel.add(u))});
  await p.tap('.mapNode[data-area="temple"]');
  await p.locator('#mapActions button',{hasText:'出發'}).tap();
  assert.equal(await p.isVisible('#mapSheet'),false);
  assert.equal(await p.evaluate(()=>pendingTravel?.target),'temple');
  const arrived=await p.evaluate(()=>{for(let i=0;i<900&&activeArea!=='temple';i++)simulate(.1);return activeArea});
  assert.equal(arrived,'temple');
  // reopen: map open/close, Escape closes
  await p.tap('#bMap');assert.equal(await p.isVisible('#mapSheet'),true);
  await p.keyboard.press('Escape');assert.equal(await p.isVisible('#mapSheet'),false);
  await p.tap('#bMap');await p.tap('#bMapClose');assert.equal(await p.isVisible('#mapSheet'),false);
  await p.close();}
  assert.deepEqual(errors,[]);await b.close();console.log('PASS world-map: open/close, nodes, far area blocked, neighbour travel');
})().catch(e=>{console.error(e);process.exit(1)});
