export const NEXT_SECONDS=16,NEXT_UNITS=3.2;
export const PARTICLE_ENDING_SECONDS=18;
export const PARTICLE_MARK_FORMED=16.5/18,PARTICLE_PETALS_ARRIVED=17.8/18;
export const particleEndingEnabled=(search,floatBuffers=true)=>floatBuffers&&new URLSearchParams(search).get('ending')!=='legacy';
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export const nextSmooth=v=>{const u=clamp(v);return u*u*u*(10+u*(-15+6*u));};
export function sampleNext(t=0,{particleEnding=false}={}){
 const nextT=clamp(t),seconds=nextT*(particleEnding?PARTICLE_ENDING_SECONDS:NEXT_SECONDS);
 return {nextT,particleEnding,opening:nextSmooth((seconds-3)/7),historyOpacity:1-nextSmooth(seconds/(particleEnding ? .75 : 3)),nextOpacity:particleEnding?nextSmooth((nextT-.915)/.06):nextSmooth(seconds-10),buttonsVisible:nextT>=1-1e-5};
}
