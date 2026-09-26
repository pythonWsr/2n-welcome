/* Backends accept geometry only. Neither backend owns progress or scheduling. */
(() => {
  const L=window.TwoNLiquid;
  function outline(state,split=false) {
    const x=state.x||0,y=state.y||0,R=state.radius;
    let d=L.mother(x,y,R,state.deform);
    for(const drop of state.drops) {
      if(drop.r<=.1 || (split&&drop.handoff>=1)) continue;
      d+=L.plainCircle(drop.x,drop.y,drop.r)+L.neck(x,y,R,drop.x,drop.y,drop.r);
    }
    return d;
  }
  class SVGRenderer {
    constructor(path) {this.path=path;this.last='';}
    render(state,split) {
      const d=outline(state,split);
      if(d!==this.last) {this.path.setAttribute('d',d);this.last=d;}
    }
  }
  class CanvasRenderer {
    constructor(canvas,width,height,radius) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d');
      this.resize(width,height,radius);
    }
    resize(width,height,radius) {
      this.width=width;this.height=height;
      this.canvas.width=width;this.canvas.height=height;
      const g=this.ctx.createLinearGradient(-radius,-radius,radius,radius);
      g.addColorStop(0,'#a6ebc5');g.addColorStop(.5,'#64b7d0');g.addColorStop(1,'#2875f0');
      this.gradient=g;
    }
    render(state,split) {
      const ctx=this.ctx,x=state.x||0,y=state.y||0,R=state.radius;
      const path=new Path2D(L.mother(x,y,R,state.deform));
      for(const drop of state.drops) {
        if(drop.r<=.1 || (split&&drop.handoff>=1)) continue;
        path.moveTo(drop.x+drop.r,drop.y);
        path.arc(drop.x,drop.y,drop.r,0,Math.PI*2);path.closePath();
        const neck=L.neck(x,y,R,drop.x,drop.y,drop.r);
        if(neck) path.addPath(new Path2D(neck));
      }
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.width,this.height);
      ctx.translate(this.width/2,this.height/2);ctx.fillStyle=this.gradient;
      ctx.fill(path,'nonzero');
    }
  }
  window.TwoNLiquidRenderers={SVGRenderer,CanvasRenderer,outline};
})();
