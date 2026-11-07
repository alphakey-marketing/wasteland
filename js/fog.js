'use strict';
// Forge pilot: persistent half-tile exploration, shared circular sight, no line-of-sight obstacles.
const FOG_GRID=MAP*2,FOG_SCALE=8,FOG_PIXELS=MAP*FOG_SCALE;
let exploredForge=new Uint8Array(FOG_GRID*FOG_GRID),fogSignature=null;
const fogMemory=document.createElement('canvas'),fogCanvas=document.createElement('canvas');
for(const c of [fogMemory,fogCanvas])c.width=c.height=FOG_PIXELS;
const fogMemoryCtx=fogMemory.getContext('2d'),fogCtx=fogCanvas.getContext('2d');
const hasFog=()=>activeArea==='forge';
function sightRadius(u){return u.team!=='a'||u.dead||u.carriedBy?0:u.down?1.5:5}
function fogVisible(p){
  if(!hasFog())return true;
  return units.some(u=>{const r=sightRadius(u);return r>0&&dist(u,p)<=r});
}
function fogKnown(p){
  if(!hasFog())return true;
  const x=Math.floor(p.x*2),y=Math.floor(p.y*2);
  return x>=0&&y>=0&&x<FOG_GRID&&y<FOG_GRID&&!!exploredForge[y*FOG_GRID+x];
}
const unitVisible=u=>u.team==='a'||fogVisible(u);
function resetFogMemory(){
  fogMemoryCtx.globalCompositeOperation='copy';fogMemoryCtx.fillStyle='#12150f';fogMemoryCtx.fillRect(0,0,FOG_PIXELS,FOG_PIXELS);
  fogMemoryCtx.globalCompositeOperation='source-over';fogMemoryCtx.fillStyle='rgba(18,21,15,.65)';
  for(let i=0;i<exploredForge.length;i++)if(exploredForge[i]){const x=i%FOG_GRID*4,y=Math.floor(i/FOG_GRID)*4;fogMemoryCtx.clearRect(x,y,4,4);fogMemoryCtx.fillRect(x,y,4,4)}
  fogSignature=null;
}
function updateFog(){
  if(!hasFog()){fogSignature=null;return}
  const viewers=units.filter(u=>sightRadius(u)>0);
  const signature=viewers.map(u=>`${u.id}:${u.x.toFixed(2)},${u.y.toFixed(2)},${sightRadius(u)}`).join('|');
  if(signature===fogSignature)return;fogSignature=signature;
  fogMemoryCtx.fillStyle='rgba(18,21,15,.65)';
  for(const u of viewers){const r=sightRadius(u);
    for(let y=Math.max(0,Math.floor((u.y-r)*2));y<Math.min(FOG_GRID,Math.ceil((u.y+r)*2));y++)
      for(let x=Math.max(0,Math.floor((u.x-r)*2));x<Math.min(FOG_GRID,Math.ceil((u.x+r)*2));x++){
        const i=y*FOG_GRID+x;
        if(!exploredForge[i]&&Math.hypot((x+.5)/2-u.x,(y+.5)/2-u.y)<=r+.35){exploredForge[i]=1;fogMemoryCtx.clearRect(x*4,y*4,4,4);fogMemoryCtx.fillRect(x*4,y*4,4,4)}
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
  ctx.save();ctx.transform(TW/2/FOG_SCALE*cam.z,TH/2/FOG_SCALE*cam.z,-TW/2/FOG_SCALE*cam.z,TH/2/FOG_SCALE*cam.z,W/2-cam.x*cam.z,H/2-cam.y*cam.z);
  ctx.drawImage(fogCanvas,0,0);ctx.restore();
}
function packExploration(){updateFog();return {forge:Array.from(exploredForge).join('')}}
function restoreExploration(saved){
  const raw=saved?.forge;
  exploredForge=typeof raw==='string'&&raw.length===FOG_GRID*FOG_GRID&&/^[01]+$/.test(raw)?Uint8Array.from(raw,c=>+c):new Uint8Array(FOG_GRID*FOG_GRID);
  resetFogMemory();updateFog();
}
resetFogMemory();
