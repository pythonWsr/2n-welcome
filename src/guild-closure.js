// An independent epilogue: a small retreat in the current map, never the hero reveal.
export const CLOSURE_UNITS=3;
export const CLOSURE_SECONDS=12;
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{const u=clamp(t);return u*u*u*(10+u*(-15+6*u));};
export function sampleClosure(t,entryPose){
 if(!Number.isFinite(t)||!['position','target','up'].every(k=>entryPose?.[k]?.length===3&&entryPose[k].every(Number.isFinite)))throw new RangeError('结尾需要有效进度与镜头');
 t=clamp(t);const retreat=.04*ease(t);
 return {position:entryPose.position.map((v,i)=>v+(v-entryPose.target[i])*retreat),target:[...entryPose.target],up:[...entryPose.up],
  peopleOpacity:1-ease(t/.25),monumentOpacity:ease((t-.25)/(7/12-.25)),replayVisible:t>=7/12};
}
