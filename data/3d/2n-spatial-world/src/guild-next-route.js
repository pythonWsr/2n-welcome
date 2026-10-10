export const NEXT_SECONDS=16,NEXT_UNITS=3.2;
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export const nextSmooth=v=>{const u=clamp(v);return u*u*u*(10+u*(-15+6*u));};
export function sampleNext(t=0){
 const nextT=clamp(t),seconds=nextT*NEXT_SECONDS;
 return {nextT,opening:nextSmooth((seconds-3)/7),historyOpacity:1-nextSmooth(seconds/3),nextOpacity:nextSmooth(seconds-10),buttonsVisible:nextT>=1-1e-5};
}
