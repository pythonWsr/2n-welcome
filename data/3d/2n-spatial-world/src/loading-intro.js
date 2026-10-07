// All chapters are prepared before travel; errors stay at the retryable opening.
export function createLoadingIntro(){
 let released=false;
 return {update({allReady,reduced}){if(allReady)released=true;return {locked:!released,speed:reduced?0:released?1:.18};}};
}
export const allBiomesReady=world=>world.groundStatus==='ready'&&['petalStatus','desertPetalStatus','oceanPetalStatus','junglePetalStatus','hellPetalStatus'].every(k=>world[k]==='ready');
export function attachIntroInput(target,isLocked,onSkip){
 const block=event=>{if(!isLocked()||event.target.closest?.('#loading-status'))return;if(event.type==='touchmove'&&event.touches.length>1)return;event.preventDefault();};
 target.addEventListener('touchmove',block,{passive:false});target.addEventListener('wheel',block,{passive:false});
 target.addEventListener('keydown',event=>{if(event.key==='Escape'){onSkip();return;}if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))block(event);});
}
