(() => {
  'use strict';

  // v35.8 compatibility layer for the existing app shell.
  // Keep the complete member roster for gathering, but use stable one-way
  // trajectories for dense rosters and restore the original 23-particle split.
  const root=document.documentElement;
  const source=window.TwoNMotion;
  if(!source) return;
  const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);
  const progress=(value,from,to)=>clamp((value-from)/(to-from));
  const noise=seed=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  const nativeBridgeScroll=source.bridgeScroll;
  const nativeMemberPath=source.memberPath;
  const nativeAnniversaryParticle=source.anniversaryParticle;

  const SPLIT_COUNT=23;
  const motion={...source};

  motion.memberPath=function(index,count,phase,width,height){
    if(count<=48) return nativeMemberPath(index,count,phase,width,height);

    // Dense-roster paths keep a fixed golden-angle lane. The liquid engine adds
    // a deterministic tangential bow around the growing mother drop, so every
    // member follows one clean curved sweep instead of a straight chord or loop.
    const start=.012+index/Math.max(1,count-1)*.72;
    const duration=.095+noise(index+15)*.020;
    const local=progress(phase,start,start+duration);
    const t=smooth(progress(local,.07,1));
    const angle=index*2.399963+noise(index+9)*.16;
    const radius=.955+noise(index+21)*.045;
    const rx=Math.max(68,width*.5-46),ry=Math.max(90,height*.5-92);
    const edge=Math.max(Math.abs(Math.cos(angle)),Math.abs(Math.sin(angle)));
    const falloff=(1-t)*(1-t);
    return {
      x:Math.cos(angle)/edge*rx*radius*falloff,
      y:Math.sin(angle)/edge*ry*radius*falloff,
      scale:lerp(.94+noise(index+7)*.08,.35,t),
      opacity:smooth(progress(local,0,.13))*(1-smooth(progress(local,.76,1))),
      mix:smooth(local),
      absorbed:smooth(progress(local,.66,1)),
      approach:t,
      heading:angle
    };
  };

  motion.anniversaryParticle=function(index,count,phase,width,height){
    if(count<=48) return nativeAnniversaryParticle(index,count,phase,width,height);
    // The old chapter used 23 orbit particles. Keep all 95 names during gather,
    // but only the first 23 anonymous color particles exist after separation.
    if(index>=SPLIT_COUNT){
      const p=nativeAnniversaryParticle(index,Math.max(1,count),phase,width,height);
      return {...p,opacity:0,scale:0};
    }
    return nativeAnniversaryParticle(index,SPLIT_COUNT,phase,width,height);
  };

  window.TwoNMotion=Object.freeze(motion);

  // Event routing belongs to app.js; do not monkey-patch window listeners.
})();
