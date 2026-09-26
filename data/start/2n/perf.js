/* Disabled by default. No timer, observer or DOM in normal visits. */
(() => {
  if(new URLSearchParams(location.search).get('perf')!=='1') return;
  const values={frames:0,frameMs:0,liquidMs:0,worldMs:0,longFrames:0,
    consecutiveLongFrames:0,maxLongRun:0,active:'intro',renderer:'svg'};
  const output=document.createElement('output');
  output.id='perf-debug';
  output.style.cssText='position:fixed;right:8px;top:80px;z-index:200;background:#000d;color:#fff;padding:8px;font:12px monospace;white-space:pre;pointer-events:none';
  document.addEventListener('DOMContentLoaded',()=>document.body.append(output),{once:true});
  let last=0,previous=0;
  window.TwoNPerf={
    values,
    start:()=>performance.now(),
    end(name,start) {
      const now=performance.now();
      values[name+'Ms']=now-start;
      if(name==='frame') {
        values.frames++;
        const delta=previous?now-previous:0;
        values.fps=delta>0&&delta<250?Math.round(1000/delta):0;
        previous=now;
        const long=delta>34&&delta<250;
        values.consecutiveLongFrames=long?values.consecutiveLongFrames+1:0;
        if(long) values.longFrames++;
        values.maxLongRun=Math.max(values.maxLongRun,values.consecutiveLongFrames);
      }
      if(now-last>300) {last=now;this.paint();}
    },
    section(name) {values.active=name;this.paint();},
    paint() {
      output.textContent=JSON.stringify({...values,input:document.documentElement.dataset.input},null,1);
    }
  };
})();
