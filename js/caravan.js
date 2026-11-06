'use strict';
// Only this travelling group advances in inactive areas; other residents stay paused.
const CARAVAN_STOPS={village:{x:6.8,y:6.6},temple:{x:9,y:5}};
let caravanJourney={phase:'away',area:null,leaderId:null,nextAt:0},awayCaravan=[];
const areaUnits=id=>id===activeArea?units:areaStates[id].units;
function putAreaUnits(id,list){areaStates[id].units=list;if(id===activeArea)units.splice(0,units.length,...list)}
function caravanLeader(){return caravanJourney.area?areaUnits(caravanJourney.area).find(u=>u.id===caravanJourney.leaderId):awayCaravan.find(u=>u.id===caravanJourney.leaderId)}
function caravanLocation(){return caravanJourney.phase==='away'?'外地行商':caravanJourney.phase==='lost'?'暫未到訪':caravanJourney.area==='temple'?'荒寺山道':'青葉村'}
function spawnCaravan(){
  const o=AREAS.village.gate;
  const l=mk({team:'v',kind:'caravan',name:'遊商',color:'#d8c27a',base:50,x:o.x,y:o.y,spd:2.3,pack:[{id:'coin',n:ri(60,120)}],lv:{tough:6,dod:6}});
  const group=[l];
  for(let i=0;i<2;i++)group.push(mk({team:'v',kind:'cguard',name:'商隊護衛',color:'#a98b54',base:65,x:o.x+.7*(i?1:-1),y:o.y+.6,leader:l,aggroR:5,leash:7,home:{x:o.x,y:o.y},eq:{weapon:i?'machete':'axe',armor:i?'leather':'plate'},lv:{tough:18,atk:18,dod:12}}));
  putAreaUnits('village',[...areaUnits('village'),...group]);
  caravanJourney={phase:'arrive',area:'village',leaderId:l.id,nextAt:0};awayCaravan=[];caravanAngry=false;
}
function updCaravan(u,dt,area=activeArea){
  if(u.down||u.carriedBy)return;
  if(u.id!==caravanJourney.leaderId){u.state='停留';return}
  const t=area===activeArea&&u.lastHit&&!u.lastHit.down&&dist(u,u.lastHit)<4?u.lastHit:null;
  if(t){u.state='逃命';steer(u,{x:u.x+(u.x-t.x)*3,y:u.y+(u.y-t.y)*3},dt,[t],1,areaStates[area].props);return}
  if(caravanJourney.phase==='stay'){u.state='擺檔';return}
  const goal=caravanJourney.phase==='arrive'?CARAVAN_STOPS[area]:AREAS[area].gate;
  u.state=dist(u,goal)<.5?'等護衛':'趕路';
  if(dist(u,goal)>=.5)steer(u,goal,dt,[],.8,areaStates[area].props);
}
function moveCaravan(target){
  const source=caravanJourney.area,l=caravanLeader(),members=areaUnits(source).filter(u=>u===l||(u.leader===l&&!u.down&&!u.carriedBy));
  for(const u of areaUnits(source))if(u.leader===l&&!members.includes(u)){u.leader=null;u.home={x:u.x,y:u.y}}
  putAreaUnits(source,areaUnits(source).filter(u=>!members.includes(u)));
  if(!target){awayCaravan=members;caravanJourney.area=null;caravanJourney.phase='away';caravanJourney.nextAt=simT+120;toast('遊商已離開山道，去外地行商');return}
  const gate=AREAS[target].gate;
  members.forEach((u,i)=>{u.x=gate.x+(i%2)*.7;u.y=gate.y+Math.floor(i/2)*.7;u.home={x:u.x,y:u.y};u.wp=null});
  putAreaUnits(target,[...areaUnits(target),...members]);caravanJourney.area=target;caravanJourney.phase='arrive';caravanJourney.nextAt=0;
  toast(`遊商已進入${AREAS[target].name}，正前往停靠點`);
}
function tickCaravan(dt){
  const j=caravanJourney;
  if(j.phase==='lost'){if(simT>=j.nextAt){spawnCaravan();toast('另一隊遊商到訪青葉村')}return}
  if(j.phase==='away'){
    if(simT<j.nextAt)return;
    const gate=AREAS.village.gate;awayCaravan.forEach((u,i)=>{u.x=gate.x+(i%2)*.7;u.y=gate.y+Math.floor(i/2)*.7;u.home={x:u.x,y:u.y};u.wp=null});
    putAreaUnits('village',[...areaUnits('village'),...awayCaravan]);awayCaravan=[];j.area='village';j.phase='arrive';j.nextAt=0;toast('遊商返到青葉村');return;
  }
  const l=caravanLeader();
  if(!l||l.dead){j.phase='lost';j.nextAt=simT+180;return}
  if(l.down||l.carriedBy)return;
  const guards=areaUnits(j.area).filter(u=>u.leader===l&&!u.down&&!u.carriedBy);
  if(j.area!==activeArea){updCaravan(l,dt,j.area);for(const g of guards)if(dist(g,l)>1.2)steer(g,l,dt,[],1,areaStates[j.area].props)}
  if(j.phase==='arrive'&&dist(l,CARAVAN_STOPS[j.area])<.6){j.phase='stay';j.nextAt=simT+60;toast(`遊商喺${AREAS[j.area].name}停留一分鐘`)}
  else if(j.phase==='stay'&&simT>=j.nextAt){j.phase='exit';toast(j.area==='village'?'遊商收檔，準備經路牌去荒寺山道':'遊商收檔，準備離開山道')}
  else if(j.phase==='exit'&&dist(l,AREAS[j.area].gate)<.6&&guards.every(g=>dist(g,l)<3))moveCaravan(j.area==='village'?'temple':null);
}
function packCaravan(){return {...caravanJourney,units:awayCaravan.map(packAreaUnit)}}
function restoreCaravan(saved){
  awayCaravan=[];
  if(saved){
    const {units:packed=[],...journey}=saved;caravanJourney=journey;
    awayCaravan=packed.map(o=>Object.assign(mk(o),{p:o.p,sk:o.sk}));
    for(let i=0;i<packed.length;i++)if(packed[i].leaderId)awayCaravan[i].leader=awayCaravan.find(u=>u.id===packed[i].leaderId);
    if(journey.phase==='lost'||caravanLeader())return;
  }
  awayCaravan=[];
  for(const id of Object.keys(AREAS)){
    const l=areaUnits(id).find(u=>u.kind==='caravan'&&!u.dead);
    if(l){caravanJourney={phase:'arrive',area:id,leaderId:l.id,nextAt:0};return}
  }
  spawnCaravan();
}
spawnCaravan();
