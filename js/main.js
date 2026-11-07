'use strict';
/* 主迴圈同啟動 */
/* ---------- loop ---------- */
let lt=performance.now();
function frame(t){
  const dt=clamp((t-lt)/1000,0,.05);lt=t;
  if(!paused&&!modal&&help.hidden)simulate(dt*speed);
  if(cam.follow){const tx=isoX(cam.follow.x,cam.follow.y),ty=isoY(cam.follow.x,cam.follow.y);cam.x+=(tx-cam.x)*Math.min(1,dt*6);cam.y+=(ty-cam.y)*Math.min(1,dt*6)}
  render();updatePortraits(false);updateCampaignHUD();requestAnimationFrame(frame);
}
buildSquadUI();
if(loadGame())setTimeout(()=>toast('讀取咗上次嘅存檔'),400);
refreshStatus();updatePortraits(true);requestAnimationFrame(frame);
