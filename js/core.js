'use strict';
/* 畫布、等角座標換算 */
const $=s=>document.querySelector(s);
const cv=$('#cv'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px'}
addEventListener('resize',resize);resize();

/* ---------- iso math ---------- */
const TW=64,TH=32,MAP=32;
const cam={x:0,y:0,z:1,follow:null};
const isoX=(x,y)=>(x-y)*TW/2, isoY=(x,y)=>(x+y)*TH/2;
function scr(x,y,h=0){return{x:(isoX(x,y)-cam.x)*cam.z+W/2,y:(isoY(x,y)-h-cam.y)*cam.z+H/2}}
function world(sx,sy){const ix=(sx-W/2)/cam.z+cam.x,iy=(sy-H/2)/cam.z+cam.y;const a=ix/(TW/2),b=iy/(TH/2);return{x:(a+b)/2,y:(b-a)/2}}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rand=(a,b)=>a+Math.random()*(b-a);
const ri=(a,b)=>Math.floor(rand(a,b+1));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
let seed=11;const srnd=()=>(seed=(seed*16807)%2147483647,(seed-1)/2147483646);

const DEN={x:5,y:17},TOWN={x:5,y:4};

