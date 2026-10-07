// Stable viewport units exclude browser-chrome animation; no UA sniffing.
export function changed(a,b) {
  return !a || ['width','height','safeHeight','orientation'].some(k=>Math.abs(a[k]-b[k])>1);
}
export const scrollProgress=(y,range)=>Math.max(0,Math.min(1,y/range));
export function stableViewport(onResize, storyUnits=6) {
  const probe=document.createElement('div');
  probe.style.cssText='position:fixed;left:0;top:0;width:100%;height:100lvh;min-height:100svh;visibility:hidden;pointer-events:none;contain:strict;';
  document.body.append(probe);
  const supported=CSS.supports('height','100lvh');
  const touch=matchMedia('(pointer:coarse)').matches;
  let state,timer;
  function measure() {
    const width=document.documentElement.clientWidth;
    const orientation=screen.orientation?.angle ?? window.orientation ?? 0;
    let height,safeHeight;
    if(supported) {
      const css=getComputedStyle(probe);
      height=Math.round(parseFloat(css.height));safeHeight=Math.round(parseFloat(css.minHeight));
    } else {
      // Older touch engines lock height until width/orientation really changes.
      const locked=touch&&state&&Math.abs(width-state.width)<=1&&orientation===state.orientation;
      height=locked?state.height:innerHeight;safeHeight=height;
    }
    const next={width,height,safeHeight,orientation,range:storyUnits*safeHeight};
    if(!changed(state,next))return;
    const previous=state;state=next;
    document.documentElement.style.setProperty('--scene-height',height+'px');
    document.documentElement.style.setProperty('--safe-height',safeHeight+'px');
    document.documentElement.style.setProperty('--story-height',(next.range+height)+'px');
    onResize(next,previous);
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(measure,200);}
  addEventListener('resize',schedule,{passive:true});
  addEventListener('orientationchange',schedule,{passive:true});
  screen.orientation?.addEventListener('change',schedule);
  addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  // Also catches height-only desktop / split-window changes via stable units.
  const observer=new ResizeObserver(schedule);observer.observe(probe);
  measure();
  return ()=>state;
}
