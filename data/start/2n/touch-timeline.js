/* Bounded, reversible visual catch-up. Never writes a scroll position. */
(function(target) {
  class TouchTimeline {
    constructor(events=[]) {this.events=events;this.reset(0);}
    reset(value) {this.value=value;this.target=value;this.queue=[];this.deadline=0;this.direction=0;this.finishTarget=false;}
    next(target,now) {
      const direction=Math.sign(target-this.value);
      if(this.direction && direction && direction!==this.direction) this.queue.length=0;
      this.direction=direction;this.target=target;
      if(this.queue.length) {
        if(now>=this.deadline) {this.queue.length=0;return this.value=target;}
        this.queue=this.queue.filter(e=>direction>0?e>=this.value&&e<=target:e<=this.value&&e>=target);
      } else if(Math.abs(target-this.value)>.018) {
        // One representative per event type, not hundreds of quantized steps.
        const crossed=this.events.filter(e=>direction>0?e.phase>this.value&&e.phase<target:e.phase<this.value&&e.phase>target);
        const types=new Map();
        for(const event of crossed) {
          const prior=types.get(event.type);
          if(!prior || (direction>0?event.phase>prior.phase:event.phase<prior.phase)) types.set(event.type,event);
        }
        this.queue=[...types.values()].map(e=>e.phase).sort((a,b)=>direction*(a-b)).slice(0,4);
        this.deadline=now+96;
      }
      // Do not create another queue for the same target after the last substep.
      if(this.queue.length) {
        const value=this.queue.shift();
        if(!this.queue.length) this.finishTarget=true;
        return this.value=value;
      }
      return this.value=target;
    }
    tick(target,now) {
      if(this.finishTarget) {
        this.finishTarget=false;this.queue.length=0;this.target=target;
        return this.value=target;
      }
      return this.next(target,now);
    }
    get pending() {return this.value!==this.target;}
  }
  if(typeof module==='object'&&module.exports) module.exports=TouchTimeline;
  else target.TwoNTouchTimeline=TouchTimeline;
})(typeof window==='object'?window:this);
