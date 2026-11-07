'use strict';
const HUNGER={rest:14,grace:120,dying:90,sated:25};
const hungerBlocksRecovery=u=>u.starvation?.phase==='faint'||u.starvation?.phase==='dying';
function starvationText(u){
  if(u.dead||!u.starvation)return '';
  const s=u.starvation,n=Math.ceil(s.left);
  if(s.phase==='faint')return n>0?`餓暈 ${n}秒 · 休息`:u.carriedBy?'餓暈 · 放低後再嘗試起身':'餓暈 · 等傷勢穩定';
  if(s.phase==='grace')return `自救 ${n}秒 · 極度飢餓`;
  return !hardcore&&n===0?'飢餓倒地 · 等待餵食':`瀕死 ${n}秒 · 需要餵食`;
}
function eatFood(donor,patient,id){
  const it=ITEMS[id];if(patient.dead||patient.food>=100||it?.type!=='food'||!useItem(donor,id))return false;
  patient.food=Math.min(100,patient.food+it.food);patient.hungryWarned=false;
  float(patient,`食咗${it.name}`,'#e8c79a');
  if(patient.starvation&&patient.food>=HUNGER.sated){patient.starvation=null;toast(`${patient.name} 已脫離飢餓危機，自救機會重置`)}
  return true;
}
function tickHunger(u,dt){
  if(u.dead)return;
  u.food=Math.max(0,u.food-(u.state==='瞓緊'?.06:.12)*dt);
  if(u.food<40&&!u.down){const item=u.pack.find(s=>ITEMS[s.id].type==='food');
    if(item)eatFood(u,u,item.id);
    else if(u.food<25&&!u.hungryWarned&&!u.starvation){u.hungryWarned=true;toast(`${u.name} 好肚餓，背包冇嘢食；餓到倒地會有生命危險`)}}
  const s=u.starvation;
  if(s){
    s.left=Math.max(0,s.left-dt);
    if(s.phase==='grace'&&s.left<=0){
      s.phase='dying';s.left=HUNGER.dying;u.p.torso.hp=Math.min(0,u.p.torso.hp);checkWounds(u,'torso','身');
      toast(`${u.name} 再次餓倒！${HUNGER.dying} 秒內餵食至飽肚 ${HUNGER.sated}，否則硬派模式會陣亡`);float(u,'飢餓瀕死','#ff7a5c',true);
    }else if(s.phase==='dying'&&s.left<=0&&hardcore){kill(u);toast(`${u.name} 因飢餓陣亡`)}
  }else if(u.food<=0&&!u.down){
    u.p.torso.hp-=.15*dt;checkWounds(u,'torso','身');
    if(u.down&&!u.dead){u.starvation={phase:'faint',left:HUNGER.rest};toast(`${u.name} 餓暈咗；休息後可自行起身一次，隊友亦可餵食救援`);float(u,'餓暈','#f2c14e',true)}
  }
}
function tryStarvationRise(u){
  const s=u.starvation;
  if(s?.phase!=='faint'||s.left>0||u.carriedBy||u.bleed>0||recov(u)<1)return false;
  s.phase='grace';s.left=HUNGER.grace;getUp(u,0);
  toast(`${u.name} 勉強起身；有 ${HUNGER.grace} 秒搵食，飽肚至少 ${HUNGER.sated} 先解除危機`);float(u,'最後一次自救','#f2c14e',true);return true;
}
function feedingSource(h,p){
  for(const donor of h===p?[h]:[h,p]){const s=donor.pack.find(s=>ITEMS[s.id].type==='food'&&s.n>0);if(s)return {donor,id:s.id}}
  return null;
}
function feedingHelper(p){
  if(p.dead||p.team!=='a'||p.food>=40)return null;
  const helpers=allies().filter(h=>h!==p&&!h.dead&&!h.down&&(!h.carry||h.carry===p)&&(!p.carriedBy||p.carriedBy===h)&&feedingSource(h,p));
  return nearest(helpers.filter(h=>sel.has(h)),p)||nearest(helpers,p);
}
function runFeed(h,c,dt){
  const p=c.pat;
  if(!units.includes(p)||p.dead||p.team!=='a'||p.food>=100||(p.carriedBy&&p.carriedBy!==h)||(h.carry&&h.carry!==p)){h.cmd.shift();return}
  if(p.carriedBy!==h&&dist(h,p)>.9){h.state=`去餵${p.name}`;step(h,p.x,p.y,dt);return}
  const source=feedingSource(h,p);
  if(!source){h.cmd.shift();toast('隊友同傷者背包都冇食物');return}
  h.state='餵食中';if(h.interruptT>0)return;
  c.elapsed=(c.elapsed||0)+dt;
  if(c.elapsed>=2){eatFood(source.donor,p,source.id);h.cmd.shift();if(p.starvation)toast(`${p.name} 飽肚 ${Math.floor(p.food)}；要達 ${HUNGER.sated} 先解除危機`)}
}
