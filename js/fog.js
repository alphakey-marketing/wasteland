'use strict';
// Forge pilot: persistent half-tile exploration, shared circular sight, no line-of-sight obstacles.
const FOG_GRID=MAP*2,FOG_SCALE=8,FOG_PIXELS=MAP*FOG_SCALE;
let explored={},fogSignature=null,fogMemArea=null;
const exploredHere=()=>explored[activeArea]||(explored[activeArea]=new Uint8Array(FOG_GRID*FOG_GRID));
const fogMemory=document.createElement('canvas'),fogCanvas=document.createElement('canvas');
for(const c of [fogMemory,fogCanvas])c.width=c.height=FOG_PIXELS;
const fogMemoryCtx=fogMemory.getContext('2d'),fogCtx=fogCanvas.getContext('2d');
const hasFog=()=>activeArea==='forge'||!!AREAS[activeArea]?.gen;
function sightRadius(u){return u.team!=='a'||u.dead||u.carriedBy?0:u.down?1.5:5}
function fogVisible(p){
  if(!hasFog())return true;
  return units.some(u=>{const r=sightRadius(u);return r>0&&dist(u,p)<=r});
}
function fogKnown(p){
  if(!hasFog())return true;
  const x=Math.floor(p.x*2),y=Math.floor(p.y*2);
  return x>=0&&y>=0&&x<FOG_GRID&&y<FOG_GRID&&!!exploredHere()[y*FOG_GRID+x];
}
const unitVisible=u=>u.team==='a'||fogVisible(u);
// Static locations only: reuse explored terrain, never infer enemy or container state.
function knownLandmarks(){
  if(!hasFog())return [];
  updateFog();
  return [...AREAS[activeArea].exits.map(e=>({x:e.x,y:e.y,name:`往${AREAS[e.to].name}出口`,gate:true})),
    ...props.filter(p=>p.landmark).map(p=>({x:p.x,y:p.y,h:p.h+(p.furnace?36:25),name:p.landmark,ore:!!p.isOre}))].filter(fogKnown);
}
function resetFogMemory(){
  fogMemoryCtx.globalCompositeOperation='copy';fogMemoryCtx.fillStyle='#12150f';fogMemoryCtx.fillRect(0,0,FOG_PIXELS,FOG_PIXELS);
  fogMemoryCtx.globalCompositeOperation='source-over';fogMemoryCtx.fillStyle='rgba(18,21,15,.65)';
  const ex=exploredHere();fogMemArea=activeArea;
  for(let i=0;i<ex.length;i++)if(ex[i]){const x=i%FOG_GRID*4,y=Math.floor(i/FOG_GRID)*4;fogMemoryCtx.clearRect(x,y,4,4);fogMemoryCtx.fillRect(x,y,4,4)}
  fogSignature=null;
}
function updateFog(){
  if(!hasFog()){fogSignature=null;return}
  if(fogMemArea!==activeArea)resetFogMemory();const ex=exploredHere();
  const viewers=units.filter(u=>sightRadius(u)>0);
  const signature=viewers.map(u=>`${u.id}:${u.x.toFixed(2)},${u.y.toFixed(2)},${sightRadius(u)}`).join('|');
  if(signature===fogSignature)return;fogSignature=signature;
  fogMemoryCtx.fillStyle='rgba(18,21,15,.65)';
  for(const u of viewers){const r=sightRadius(u);
    for(let y=Math.max(0,Math.floor((u.y-r)*2));y<Math.min(FOG_GRID,Math.ceil((u.y+r)*2));y++)
      for(let x=Math.max(0,Math.floor((u.x-r)*2));x<Math.min(FOG_GRID,Math.ceil((u.x+r)*2));x++){
        const i=y*FOG_GRID+x;
        if(!ex[i]&&Math.hypot((x+.5)/2-u.x,(y+.5)/2-u.y)<=r+.35){ex[i]=1;fogMemoryCtx.clearRect(x*4,y*4,4,4);fogMemoryCtx.fillRect(x*4,y*4,4,4)}
      }
  }
  fogMemoryCtx.globalCompositeOperation='source-over';
  fogCtx.globalCompositeOperation='copy';fogCtx.drawImage(fogMemory,0,0);fogCtx.globalCompositeOperation='destination-out';
  for(const u of viewers){const x=u.x*FOG_SCALE,y=u.y*FOG_SCALE,r=sightRadius(u)*FOG_SCALE;
    const g=fogCtx.createRadialGradient(x,y,r*.78,x,y,r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');
    fogCtx.fillStyle=g;fogCtx.fillRect(x-r,y-r,r*2,r*2);
  }
  fogCtx.globalCompositeOperation='source-over';
}
function drawFog(){
  if(!hasFog())return;
  if(fogMemArea!==activeArea)updateFog();
  ctx.save();ctx.transform(TW/2/FOG_SCALE*cam.z,TH/2/FOG_SCALE*cam.z,-TW/2/FOG_SCALE*cam.z,TH/2/FOG_SCALE*cam.z,W/2-cam.x*cam.z,H/2-cam.y*cam.z);
  ctx.drawImage(fogCanvas,0,0);ctx.restore();
}
// forge keeps old 0/1 string; new regions use hex (4 cells per char) to keep saves small
const bitsHex=b=>{let s='';for(let i=0;i<b.length;i+=4)s+=(b[i]<<3|b[i+1]<<2|b[i+2]<<1|b[i+3]).toString(16);return s};
const hexBits=h=>{const b=new Uint8Array(FOG_GRID*FOG_GRID);for(let i=0;i<h.length;i++){const v=parseInt(h[i],16);for(let k=0;k<4;k++)b[i*4+k]=v>>(3-k)&1}return b};
function packExploration(){updateFog();const f=explored.forge||new Uint8Array(FOG_GRID*FOG_GRID);
  return {forge:Array.from(f).join(''),regions:Object.fromEntries(Object.entries(explored).filter(([k,b])=>AREAS[k]?.gen&&b.some(x=>x)).map(([k,b])=>[k,bitsHex(b)]))}}
function restoreExploration(saved){
  const raw=saved?.forge;explored={};
  explored.forge=typeof raw==='string'&&raw.length===FOG_GRID*FOG_GRID&&/^[01]+$/.test(raw)?Uint8Array.from(raw,c=>+c):new Uint8Array(FOG_GRID*FOG_GRID);
  for(const [k,h] of Object.entries(saved?.regions||{}))if(AREAS[k]?.gen&&typeof h==='string'&&/^[0-9a-f]+$/.test(h)&&h.length===FOG_GRID*FOG_GRID/4)explored[k]=hexBits(h);
  resetFogMemory();updateFog();
}
resetFogMemory();
