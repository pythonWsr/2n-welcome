/* Real content scrolling. The driver never transforms the track. */
window.TwoNMobileStory=class {
  constructor({shell,track,hero,bridge,members,leaders,panels,onChapter,wake,perf}) {
    Object.assign(this,{shell,track,hero,bridge,members,leaders,panels,onChapter,wake,perf});
    this.holds=new Map();this.bounds=new Map();this.latest=0;this.width=1;
    track.prepend(hero);
    for(const panel of [bridge,members]) {
      const hold=document.createElement('div');hold.className='native-chapter';
      panel.before(hold);hold.append(panel);this.holds.set(panel,hold);
    }
    this.targets=[hero,...panels,...leaders.querySelectorAll('.leader-card')];
    this.observer=new IntersectionObserver(entries=>{
      for(const entry of entries) {
        const visible=entry.isIntersecting;
        entry.target.classList.toggle('is-native-visible',visible);
        entry.target.inert=!visible;
      }
      this.scroll();
    },{root:shell,threshold:[0,.15,.5,.85]});
    this.targets.forEach(e=>this.observer.observe(this.holds.get(e)||e));
    // Holds carry observer state but the actual stage remains interactive.
    for(const [panel,hold] of this.holds) {hold.dataset.stage=panel.id;}
    this.onEnd=()=>this.scroll();
    shell.addEventListener('scrollend',this.onEnd,{passive:true});
    this.onTouchStart=event=>{
      this.edgeTouch=null;
      if(event.touches.length!==1) return;
      const t=event.touches[0];
      // Preserve Safari's system back gesture at the physical left edge.
      if(t.clientX<24) return;
      this.edgeTouch={x:t.clientX,y:t.clientY,lastX:t.clientX};
    };
    this.onTouchMove=event=>{
      const start=this.edgeTouch;
      if(!start || event.touches.length!==1) {this.edgeTouch=null;return;}
      const t=event.touches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;
      const step=t.clientX-start.lastX;start.lastX=t.clientX;
      if(Math.abs(dx)<6 || Math.abs(dx)<Math.abs(dy)*1.3) return;
      const x=this.shell.scrollLeft;
      if((x<=.5 && step>0)||(x>=this.max-.5 && step<0)) {
        if(event.cancelable) event.preventDefault();
      }
    };
    this.onTouchEnd=()=>{this.edgeTouch=null;};
    shell.addEventListener('touchstart',this.onTouchStart,{passive:true});
    shell.addEventListener('touchmove',this.onTouchMove,{passive:false});
    shell.addEventListener('touchend',this.onTouchEnd,{passive:true});
    shell.addEventListener('touchcancel',this.onTouchEnd,{passive:true});
  }
  measure(width,height,bridgeDuration,memberDuration) {
    this.width=width;this.height=height;
    for(const [panel,hold] of this.holds) {
      const duration=panel===this.bridge?bridgeDuration:memberDuration;
      hold.style.width=(width+duration)+'px';
    }
    // All writes above, then one layout read pass. Coordinates are content-local.
    const shellLeft=this.shell.getBoundingClientRect().left;
    const x=this.shell.scrollLeft;
    this.bounds.clear();
    for(const panel of [this.hero,...this.panels]) {
      const box=(this.holds.get(panel)||panel).getBoundingClientRect();
      this.bounds.set(panel,{x:box.left-shellLeft+x,width:box.width});
    }
    this.stops=[0,...this.panels.map(p=>this.bounds.get(p).x)];
    for(const card of this.leaders.querySelectorAll('.leader-card'))
      this.stops.push(card.getBoundingClientRect().left-shellLeft+x);
    this.max=this.shell.scrollWidth-width;
    this.latest=this.shell.scrollLeft;
    this.publish();
  }
  heavy() {
    const x=this.latest,w=this.width;
    for(const panel of [this.hero,this.bridge,this.members]) {
      const b=this.bounds.get(panel);
      if(b && x<b.x+b.width && x+w>b.x) return panel===this.hero?'hero':panel.id;
    }
    return '';
  }
  phase(panel) {
    const b=this.bounds.get(panel);
    return b?Math.max(0,Math.min(1,(this.latest-b.x)/Math.max(1,b.width-this.width))):0;
  }
  scroll() {
    this.dirty=true;this.wake();
    clearTimeout(this.endTimer);
    this.endTimer=setTimeout(()=>{this.dirty=true;this.wake();},120);
  }
  reconcile() {
    // One canonical native position per frame, including momentum jumps.
    this.latest=Math.max(0,Math.min(this.max||0,this.shell.scrollLeft));
    this.dirty=false;this.publish();
  }
  publish() {
    if(!this.bounds.size) return;
    const center=this.latest+this.width*.5;
    let index=0;
    this.panels.forEach((p,i)=>{if(this.bounds.get(p).x<=center) index=i+1;});
    this.onChapter(index,this.latest,this.max);
    const section=this.heavy()||(index>=1&&index<=5?'biomes':index===7?'leaders':index===9?'film':'ending');
    if(this.perf) this.perf.section(section);
  }
  destroy() {
    this.observer.disconnect();this.shell.removeEventListener('scrollend',this.onEnd);
    clearTimeout(this.endTimer);
    for(const [type,fn] of [['touchstart',this.onTouchStart],['touchmove',this.onTouchMove],['touchend',this.onTouchEnd],['touchcancel',this.onTouchEnd]]) this.shell.removeEventListener(type,fn);
    this.shell.prepend(this.hero);
    for(const [panel,hold] of this.holds) {hold.before(panel);hold.remove();}
    this.targets.forEach(e=>{e.inert=false;e.classList.remove('is-native-visible');});
    this.track.style.transform='';
  }
};
