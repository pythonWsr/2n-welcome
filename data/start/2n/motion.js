/* Pure timing and scroll geometry; no DOM and no network dependencies. */
(function (target) {
  'use strict';
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, t) => from + (to - from) * t;
  const progress = (value, from, to) => clamp((value - from) / (to - from));
  const smooth = t => t * t * (3 - 2 * t);
  const easeOut = t => 1 - Math.pow(1 - clamp(t), 4);
  const DURATION = 5600;
  function intro(time) {
    return {
      lineOne: easeOut(progress(time, 100, 880)),
      lineTwo: easeOut(progress(time, 680, 1530)),
      statementExit: smooth(progress(time, 1880, 2680)),
      curtain: smooth(progress(time, 2040, 3450)),
      world: easeOut(progress(time, 2200, 4140)),
      logo: easeOut(progress(time, 2990, 4570)),
      eyebrow: easeOut(progress(time, 4100, 4660)),
      copyOne: easeOut(progress(time, 4250, 4930)),
      copyTwo: easeOut(progress(time, 4500, 5240)),
      controls: smooth(progress(time, 4920, 5500)),
      complete: time >= DURATION
    };
  }
  function scroll(position, lead, travel) {
    return {
      entry: clamp(position / lead),
      x: clamp(position - lead, 0, travel),
      progress: clamp(position / Math.max(1, lead + travel))
    };
  }
  function bridgeScroll(distance, start, duration) {
    return { x: distance - clamp(distance - start, 0, duration), phase: progress(distance, start, start + duration) };
  }
  // Stable per-member variation keeps reverse scrolling identical to forward scrolling.
  const noise = seed => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
  function memberPath(index, count, phase, width, height) {
    const start = .015 + index / Math.max(1,count-1) * .61 + noise(index+4)*.025;
    const duration = .23 + noise(index+15)*.10;
    const local = progress(phase,start,start+duration);
    const t = smooth(progress(local,.13,1));
    const angle = index*2.399963 + noise(index+9)*.7;
    const radius = .94 + noise(index+21)*.06;
    const rx = Math.max(68,width*.5-52), ry = Math.max(90,height*.5-100);
    const edge=Math.max(Math.abs(Math.cos(angle)),Math.abs(Math.sin(angle)));
    const sx = Math.cos(angle)/edge*rx*radius, sy = Math.sin(angle)/edge*ry*radius;
    const bend = (noise(index+2)>.5 ? 1 : -1)*(.3+noise(index+18)*.5);
    const cx = clamp(sx*.6-Math.sin(angle)*rx*bend,-rx,rx);
    const cy = clamp(sy*.6+Math.cos(angle)*ry*bend,-ry,ry);
    const u = 1-t;
    return {
      x:u*u*sx+2*u*t*cx, y:u*u*sy+2*u*t*cy,
      scale:lerp(.92+noise(index+7)*.12,.35,t),
      opacity:smooth(progress(local,0,.16))*(1-smooth(progress(local,.74,1))),
      mix:smooth(local), absorbed:smooth(progress(local,.64,1)), approach:t, heading:Math.atan2(sy,sx)
    };
  }
  function anniversary(phase) {
    return {
      gather:progress(phase,0,.30),
      resultFade:1-smooth(progress(phase,.315,.355)),
      split:smooth(progress(phase,.355,.43)),
      title:smooth(progress(phase,.43,.48))*(1-smooth(progress(phase,.70,.82))),
      order:smooth(progress(phase,.52,.62)),
      turns:progress(phase,.43,1)*Math.PI*4,
      spiral:smooth(progress(phase,.66,.84)),
      collapse:Math.pow(progress(phase,.66,1),2)
    };
  }
  function anniversaryParticle(index,count,phase,width,height) {
    const s=anniversary(phase), fraction=index/count;
    const base=fraction*Math.PI*2;
    const orbit=progress(phase,.43,.62);
    const breathing=Math.sin(orbit*Math.PI)*(1-s.order);
    const jitter=(noise(index+50)-.5)*.30*(1-s.order)+Math.sin(s.turns*1.3+index*2.1)*.07*breathing;
    const radius=Math.min(width*.42,height*.32);
    const irregular=lerp(.88+noise(index+80)*.10,1,s.order)+Math.sin(s.turns*1.7+index*1.9)*.025*breathing;
    const coil=s.spiral;
    const angle=base+jitter+s.turns+coil*fraction*Math.PI*3;
    const release=smooth(progress(phase,.355+fraction*.008,.43));
    const sourceRadius=Math.min(width*.72,height*.65)*.6*.80;
    const r=lerp(sourceRadius,radius*irregular,release)*lerp(1,.13+.87*fraction,coil)*(1-s.collapse);
    return {
      x:Math.cos(angle)*r,y:Math.sin(angle)*r,
      opacity:smooth(progress(phase,.355+fraction*.008,.375+fraction*.008))*(1-smooth(progress(s.collapse,.72,1))),
      scale:lerp(.45,1,s.split)*lerp(1,.74,coil)*(1-s.collapse*.8),
      color:smooth(progress(s.split,.12,.94)), angle,radius:r
    };
  }
  function recoil(paths,gather) {
    let x=0,y=0,stretch=0;
    for(const p of paths) {
      const impulse=Math.sin(progress(p.mix,.64,1)*Math.PI)*4;
      x-=Math.cos(p.heading)*impulse; y-=Math.sin(p.heading)*impulse; stretch+=impulse*.003;
    }
    const envelope=Math.sin(clamp(gather)*Math.PI);
    return {x:clamp(x,-7,7)+Math.sin(gather*15)*1.5*envelope,y:clamp(y,-7,7)+Math.cos(gather*12)*1.5*envelope,stretch:Math.min(.035,stretch)};
  }
  // Symmetric and frame-bounded: even a delayed Safari frame cannot skip the
  // whole contact interval. Slow scrolling remains effectively direct.
  function liquidProgress(current,target,dt) {
    const delta=target-current;
    const limit=current<.30 || target<.30 ? .003 : current<.47 || target<.47 ? .0045 : .035;
    const step=Math.min(limit,Math.max(.00025,Math.abs(delta)*(1-Math.exp(-dt/28))));
    return Math.abs(delta)<=step?target:current+Math.sign(delta)*step;
  }
  const api = Object.freeze({ liquidProgress, clamp, lerp, progress, smooth, easeOut, DURATION, intro, scroll, bridgeScroll, memberPath, anniversary, anniversaryParticle, recoil });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else target.TwoNMotion = api;
})(typeof window === 'object' ? window : this);
