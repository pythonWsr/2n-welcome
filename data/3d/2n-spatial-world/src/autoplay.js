// Normalized story progress; hidden tabs do not advance because their render loop stops.
export function createAutoplay(duration=150){
 let playing=false,position=0;
 return {get playing(){return playing;},toggle(current,ready){
  if(!ready)return;position=Math.max(0,Math.min(1,current));playing=!playing&&position<1;
 },pause(){playing=false;},advance(dt){
  if(playing){position=Math.min(1,position+Math.max(0,dt)/duration);if(position===1)playing=false;}
  return position;
 }};
}
