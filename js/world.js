'use strict';
/* 地面、建築、礦石、床等場景物件 */
/* ---------- ground (pre-rendered once) ---------- */
const gw=MAP*TW,gh=MAP*TH;
function paintGround(area){
  const ground=document.createElement('canvas');ground.width=gw;ground.height=gh;
  const g=ground.getContext('2d');const ox=gw/2;
  const hash=(i,j)=>{const n=Math.sin(i*127.1+j*311.7)*43758.5453;return n-Math.floor(n)};
  const mix=(a,b,t)=>a.map((v,k)=>Math.round(v+(b[k]-v)*t));
  const sandA=area==='temple'?[112,126,83]:[147,156,99],sandB=[181,176,116],bed=[143,119,81],dark=[117,113,76],scrub=[111,132,77],pave=[195,178,132];
  for(let i=0;i<MAP;i++)for(let j=0;j<MAP;j++){
    const dune=(Math.sin(i*.33)+Math.cos(j*.27)+Math.sin((i+j)*.19))/6+.5;
    let c=mix(sandA,sandB,Math.min(1,Math.max(0,dune*.8+hash(i,j)*.25)));
    const river=Math.abs(i-j*.55-9);
    if(river<1.4)c=mix(c,bed,.75-river*.35);
    const camp=Math.hypot(i-20,j-17);if(camp<3)c=mix(c,dark,.45*(1-camp/3));
    const den=Math.hypot(i+.5-DEN.x,j+.5-DEN.y);if(den<3.2)c=mix(c,scrub,.5*(1-den/3.2));
    const town=Math.hypot(i+.5-TOWN.x,j+.5-TOWN.y);if(town<3.6)c=mix(c,pave,(town<2.8?.7:.35)*(hash(i+1,j)*.3+.7));
    if(Math.abs(i-j)<1.5)c=mix(c,pave,.65);
    if(area==='village'&&i>8&&i<13&&j>2&&j<6)c=mix(c,[98,132,69],.8);
    if(area==='forge'){c=mix(c,[106,102,93],.65);if(Math.hypot(i-14,j-13)<4)c=mix(c,[55,52,47],.55);if(Math.abs(j-8)<1&&i<12)c=mix(c,pave,.45)}
    const p=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([a,b])=>[isoX(a,b)+ox,isoY(a,b)]);
    g.beginPath();p.forEach(([x,y],k)=>k?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
    g.fillStyle=`rgb(${c})`;g.fill();
    g.strokeStyle=town<2.8?'rgba(90,70,45,.22)':'rgba(70,45,20,.035)';g.lineWidth=1;g.stroke();
    if(area==='village'&&i>8&&i<13&&j>2&&j<6){const x=isoX(i+.5,j+.5)+ox,y=isoY(i+.5,j+.5);g.strokeStyle='#c1bd72';g.lineWidth=1.4;g.beginPath();g.moveTo(x-5,y+1);g.lineTo(x-7,y-4);g.moveTo(x,y+3);g.lineTo(x,y-4);g.moveTo(x+5,y+4);g.lineTo(x+7,y-2);g.stroke()}
    if(hash(j,i)>.72&&town>3){const cx=isoX(i+.5,j+.5)+ox+(hash(i+3,j)-.5)*20,cy=isoY(i+.5,j+.5)+(hash(i,j+5)-.5)*10;
      g.fillStyle='rgba(90,60,30,.35)';g.beginPath();g.ellipse(cx,cy,2+hash(i,j)*2,1+hash(i,j),0,0,Math.PI*2);g.fill();}
    if(river<1&&hash(i+9,j)>.5){g.strokeStyle='rgba(80,50,25,.35)';g.beginPath();const cx=isoX(i+.5,j+.5)+ox,cy=isoY(i+.5,j+.5);
      g.moveTo(cx-10,cy);g.lineTo(cx-2,cy+3);g.lineTo(cx+8,cy-2);g.stroke();}
    // Sparse ink tufts are baked once; they add no per-frame objects or collision.
    if(town>3&&hash(i+41,j+19)>.88){
      const cx=isoX(i+.5,j+.5)+ox,cy=isoY(i+.5,j+.5);
      g.strokeStyle='#79633c';g.lineWidth=1.2;g.lineCap='round';g.beginPath();
      g.moveTo(cx-4,cy);g.lineTo(cx-7,cy-5);g.moveTo(cx-2,cy);g.lineTo(cx-3,cy-8);
      g.moveTo(cx,cy);g.lineTo(cx+2,cy-6);g.moveTo(cx+2,cy);g.lineTo(cx+6,cy-3);g.stroke();
    }
  }
  if(area==='temple'){
  const dx=isoX(DEN.x,DEN.y)+ox,dy=isoY(DEN.x,DEN.y);
  g.fillStyle='rgba(45,28,14,.75)';g.beginPath();g.ellipse(dx,dy,26,11,0,0,Math.PI*2);g.fill();
  g.fillStyle='rgba(20,12,6,.85)';g.beginPath();g.ellipse(dx,dy+1,15,6,0,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(235,225,205,.7)';g.lineWidth=2;g.lineCap='round';
  [[-34,6,-26,2],[30,-4,38,1],[22,10,30,12],[-20,-10,-12,-12]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(dx+a,dy+b);g.lineTo(dx+c,dy+d);g.stroke()});
  }
  return ground;
}
const grounds={village:paintGround('village'),temple:paintGround('temple'),forge:paintGround('forge')};
let ground=grounds.village;

/* ---------- props (2.5D blocks) ---------- */
const props=[];
const ORES=[{x:2.2,y:9.4,ore:'copper'},{x:3.3,y:10.7,ore:'copper'},{x:12.6,y:2.8,ore:'iron'},{x:13.9,y:3.9,ore:'iron'}];
const keepClear=[[8,9,3.5],[20,17,3],[22,8,2.5],[10,23,2.5],[25,23,2.5],[DEN.x,DEN.y,3.2],[TOWN.x,TOWN.y,4],[2.4,7.6,2],...ORES.map(o=>[o.x,o.y,1.6])];
for(let n=0;n<34;n++){
  const x=1.5+srnd()*29,y=1.5+srnd()*29;
  if(keepClear.some(([a,b,r])=>Math.hypot(x-a,y-b)<r))continue;
  const s=.45+srnd()*.75;props.push({x,y,s,h:8+srnd()*22,c:[120+srnd()*20,98+srnd()*15,78+srnd()*10]});
}
[[14,11,48],[15.4,11.3,30],[14.2,12.8,22]].forEach(([x,y,h])=>props.push({x,y,s:.6,h,c:[150,128,104]}));
[[18.6,15.4],[21.8,15.8]].forEach(([x,y])=>props.push({x,y,s:.55,h:12,c:[120,84,50],crate:1}));
const BEDS=[{x:1.2,y:7.2},{x:2.0,y:7.6},{x:2.8,y:7.9},{x:3.6,y:8.1}];
BEDS.forEach(b=>props.push(Object.assign(b,{s:.55,h:5,c:[150,120,90],bed:1})));
props.push({x:3,y:2.3,s:1.5,h:34,c:[184,158,124],house:1},{x:7.3,y:2.5,s:1.3,h:28,c:[176,150,118],house:1},{x:2.4,y:5.6,s:1.1,h:24,c:[170,146,116],house:1});
props.push({x:4.2,y:3.7,s:.75,h:12,c:[140,100,60],crate:1});
ORES.forEach(o=>props.push(Object.assign(o,{s:.95,h:16,c:o.ore==='copper'?[150,98,62]:[110,118,124],isOre:1})));

