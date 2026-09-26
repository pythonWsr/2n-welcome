/* Deterministic, filter-free droplet geometry. All input is scroll progress. */
(function(target) {
  'use strict';
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);
  const ramp=(x,a,b)=>smooth(clamp((x-a)/(b-a)));
  const point=(x,y,r,a)=>[x+Math.cos(a)*r,y+Math.sin(a)*r];
  const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const touchFirst=!!(target&&target.TwoNProfile&&target.TwoNProfile.input==='touch');
  const precision=touchFirst?2:3;
  const num=v=>Number(v.toFixed(precision));
  const fmt=p=>num(p[0])+' '+num(p[1]);
  const motherPoints=Array.from({length:28},()=>[0,0]);
  let pendingMother=null;

  function plainCircle(x,y,r) {
    if(r<.05) return '';
    // Two clockwise arcs share the positive winding of softMother and neck.
    return `M ${num(x+r)} ${num(y)} A ${num(r)} ${num(r)} 0 1 1 ${num(x-r)} ${num(y)} A ${num(r)} ${num(r)} 0 1 1 ${num(x+r)} ${num(y)} Z `;
  }

  function softMother(x,y,r,deform) {
    const segments=touchFirst?20:28;
    const lobes=deform&&deform.lobes?deform.lobes:[];
    const totalWeight=lobes.reduce((sum,l)=>sum+l.weight,0);
    const stretch=clamp(deform&&deform.stretch||0,0,.028);
    const axis=deform&&Number.isFinite(deform.axis)?deform.axis:0;
    const points=motherPoints;
    for(let i=0;i<segments;i++) {
      const a=i/segments*Math.PI*2;
      let local=0;
      for(const lobe of lobes) {
        const c=Math.max(0,Math.cos(angleDelta(a,lobe.angle)));
        local+=lobe.weight*c*c*c*c;
      }
      // The average of the positive half-wave cos^4 lobe is 3/16. Removing
      // that mean keeps the deformation area-neutral to first order.
      local-=totalWeight*3/16;
      const bulge=clamp(local*.025,-.018,.038);
      const inertia=stretch*Math.cos(2*(a-axis));
      const rr=r*(1+bulge+inertia);
      points[i][0]=x+Math.cos(a)*rr;points[i][1]=y+Math.sin(a)*rr;
    }
    const tension=.92;
    let d=`M ${fmt(points[0])} `;
    for(let i=0;i<segments;i++) {
      const p0=points[(i-1+segments)%segments];
      const p1=points[i];
      const p2=points[(i+1)%segments];
      const p3=points[(i+2)%segments];
      const c1=[p1[0]+(p2[0]-p0[0])/6*tension,p1[1]+(p2[1]-p0[1])/6*tension];
      const c2=[p2[0]-(p3[0]-p1[0])/6*tension,p2[1]-(p3[1]-p1[1])/6*tension];
      d+=`C ${fmt(c1)} ${fmt(c2)} ${fmt(p2)} `;
    }
    return d+'Z ';
  }

  function circle(x,y,r) {
    if(r<.05) return '';
    if(pendingMother) {
      const deform=pendingMother;
      pendingMother=null;
      if((deform.lobes&&deform.lobes.length) || (deform.stretch||0)>.001) return softMother(x,y,r,deform);
    }
    return plainCircle(x,y,r);
  }

  function neck(x,y,R,bx,by,r) {
    const d=Math.hypot(bx-x,by-y);
    const gap=Math.max(10,Math.min(28,r*1.15));
    if(R<1 || r<1 || d<=Math.abs(R-r)+.01 || d>=R+r+gap) return '';
    const theta=Math.atan2(by-y,bx-x);
    const intersect=d<R+r;
    const u=intersect?Math.acos(clamp((R*R+d*d-r*r)/(2*R*d),-1,1)):0;
    const v=intersect?Math.acos(clamp((r*r+d*d-R*R)/(2*r*d),-1,1)):0;
    const outer=Math.acos(clamp((R-r)/d,-1,1));
    // A compact tangent bridge reads as a high-surface-tension neck rather than
    // a metaball/goo connector. It vanishes quickly once the drop separates.
    const strength=.50*(1-ramp(d,R+r,R+r+gap));
    if(strength<.001) return '';
    const a1=theta+u+(outer-u)*strength;
    const a2=theta-u-(outer-u)*strength;
    const a3=theta+Math.PI-v-(Math.PI-v-outer)*strength;
    const a4=theta-Math.PI+v+(Math.PI-v-outer)*strength;
    // Put the bridge endpoints *inside* both silhouettes rather than merely
    // touching their mathematical circumferences. The mother surface can deform
    // inward by a few pixels, and Safari exposes a hairline slit when two SVG
    // subpaths only meet at an edge. This overlap hides that seam without making
    // the neck look thick or gooey.
    const motherInset=Math.min(18,Math.max(3,R*.045));
    const dropInset=Math.min(4.5,Math.max(1.8,r*.07));
    const innerR=Math.max(1,R-motherInset),innerR2=Math.max(1,r-dropInset);
    const p1=point(x,y,innerR,a1),p2=point(x,y,innerR,a2);
    const p3=point(bx,by,innerR2,a3),p4=point(bx,by,innerR2,a4);
    const h=Math.min(strength*2.0,Math.hypot(p1[0]-p3[0],p1[1]-p3[1])/(innerR+innerR2))*Math.min(1,2*d/(innerR+innerR2));
    const h1=point(...p1,innerR*h,a1-Math.PI/2),h3=point(...p3,innerR2*h,a3+Math.PI/2);
    const h4=point(...p4,innerR2*h,a4-Math.PI/2),h2=point(...p2,innerR*h,a2+Math.PI/2);
    // Keep the bridge winding identical to the droplet paths. Opposite winding
    // inside one compound path is interpreted as subtraction by Safari.
    return `M ${fmt(p1)} L ${fmt(p2)} C ${fmt(h2)} ${fmt(h4)} ${fmt(p4)} L ${fmt(p3)} C ${fmt(h3)} ${fmt(h1)} ${fmt(p1)} Z `;
  }

  function separateDrops(drops,gap=2.5,passes=4,maxPush=24) {
    for(let pass=0;pass<passes;pass++) {
      for(let i=0;i<drops.length;i++) for(let j=i+1;j<drops.length;j++) {
        const a=drops[i],b=drops[j];
        const ar=a.collisionR==null?a.r:a.collisionR;
        const br=b.collisionR==null?b.r:b.collisionR;
        if(ar<.5 || br<.5) continue;
        let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
        const min=ar+br+gap;
        if(d>=min) continue;
        if(d<.001) {
          const angle=(i*2.399963+j*.83)% (Math.PI*2);
          dx=Math.cos(angle);dy=Math.sin(angle);d=1;
        }
        const push=Math.min(maxPush,(min-d)*.52);
        const ux=dx/d,uy=dy/d;
        a.x-=ux*push;a.y-=uy*push;
        b.x+=ux*push;b.y+=uy*push;
      }
    }
  }

  function buildGather(M,count,width,height,steps=720) {
    const dense=count>48;
    const seed=Math.min(width*.06,height*.045,28);
    const finalRadius=Math.min(width*.72,height*.65)*.6;
    const rawRadii=Array.from({length:count},(_,i)=>58*M.memberPath(i,count,0,width,height).scale);
    const rawArea=rawRadii.reduce((sum,r)=>sum+r*r,0)||1;
    const targetArea=Math.max(1,finalRadius*finalRadius-seed*seed);
    const areaScale=Math.sqrt(targetArea/rawArea);
    const sourceRadii=rawRadii.map(r=>r*areaScale);
    const meanArea=targetArea/Math.max(1,count);
    const rows=[];
    // Transfer is a function of local progress, never of the previous mother's
    // radius. A growing neighbour cannot trigger an absorption avalanche.
    for(let k=0;k<=steps;k++) {
      const phase=k/steps;
      const paths=Array.from({length:count},(_,i)=>M.memberPath(i,count,phase,width,height));
      const absorbed=paths.map(p=>ramp(p.approach,.64,1));
      const radius=Math.sqrt(seed*seed+sourceRadii.reduce((sum,r,i)=>sum+r*r*absorbed[i],0));
      const states=paths.map((p,i)=> {
        const source=sourceRadii[i], amount=absorbed[i];
        const r=source*Math.sqrt(1-amount);
        const heading=p.heading+(dense?phase*1.8:0);
        const cs=Math.cos(heading),sn=Math.sin(heading);
        const edge=Math.min(Math.max(68,width*.5-46)/Math.max(.06,Math.abs(cs)),
          Math.max(90,height*.5-92)/Math.max(.06,Math.abs(sn)));
        const gap=Math.max(10,Math.min(28,source*1.15));
        const waiting=radius+source+gap+Math.max(24,source);
        // .48-.64 is a real contact dwell, before any area is transferred.
        let radial=mix(Math.max(edge,waiting),radius+source+gap*.72,ramp(p.approach,0,.48));
        radial=mix(radial,radius+source*.80,ramp(p.approach,.48,.64));
        radial=mix(radial,Math.max(0,radius-r*.96),ramp(amount,0,1));
        return {x:cs*radial,y:sn*radial,scale:p.scale,mix:p.mix,
          approach:p.approach,heading,collisionR:r*(1-ramp(p.approach,.40,.64))};
      });
      if(!dense) separateDrops(states,2.5,3,18);
      rows.push({radius,absorbed,samples:states});
    }
    return {
      rows,steps,seed,finalRadius,count,width,height,sourceRadii,meanArea,dense,
      totalArea:seed*seed+targetArea,renderSteps:2400,
      cacheKey:-1,cacheValue:null
    };
  }

  function gatherAt(M,plan,phase) {
    const renderKey=Math.round(clamp(phase)*plan.renderSteps);
    if(plan.cacheKey===renderKey && plan.cacheValue) {
      pendingMother=plan.cacheValue.deform;
      return plan.cacheValue;
    }
    const q=renderKey/plan.renderSteps;
    const sample=q*plan.steps,k=Math.floor(sample),t=sample-k;
    const a=plan.rows[k],b=plan.rows[Math.min(k+1,plan.steps)];
    let radius=plan.seed*plan.seed;
    let rx=0,ry=0;
    const lobes=[];
    const drops=plan.drops||(plan.drops=Array.from({length:plan.count},()=>({})));
    for(let i=0;i<plan.count;i++) {
      const pa=a.samples[i],pb=b.samples[i];
      const p={
        x:mix(pa.x,pb.x,t),y:mix(pa.y,pb.y,t),scale:mix(pa.scale,pb.scale,t),
        mix:mix(pa.mix,pb.mix,t),approach:mix(pa.approach,pb.approach,t),
        heading:mix(pa.heading,pb.heading,t)
      };
      const absorbed=mix(a.absorbed[i],b.absorbed[i],t);
      const source=plan.sourceRadii[i];
      radius+=source*source*absorbed;
      const areaR=source*Math.sqrt(Math.max(0,1-absorbed));
      const reveal=Math.sqrt(ramp(p.mix,0,.09));
      const pulse=Math.sin(absorbed*Math.PI)*clamp(source*source/plan.meanArea,.55,1.7);
      const impulse=3.2*pulse;
      rx-=Math.cos(p.heading)*impulse;ry-=Math.sin(p.heading)*impulse;
      if(pulse>.025) lobes.push({angle:Math.atan2(p.y,p.x),weight:Math.min(1.4,pulse)});
      const renderedR=areaR*reveal;
      Object.assign(drops[i], {
        x:p.x,y:p.y,r:renderedR,areaR,
        label:ramp(p.mix,0,.10)*(1-ramp(absorbed,.03,.45)),
        // The DOM member bubble is 116px wide (58px radius). Scale it to the
        // exact SVG radius so large rosters do not leave oversized label circles
        // floating over the smaller area-conserving liquid droplets.
        scale:renderedR/58,absorbed,collisionR:renderedR
      });
    }
    radius=Math.sqrt(radius);
    const recoilScale=plan.dense?.32:1;
    const x=clamp(rx*recoilScale,-6,6),y=clamp(ry*recoilScale,-6,6);
    for(const drop of drops) {drop.x+=x*drop.absorbed;drop.y+=y*drop.absorbed;}

    if(!plan.dense) separateDrops(drops,2.5,5,30);
    const speed=Math.hypot(x,y);
    const deform={lobes,axis:speed>.01?Math.atan2(y,x):0,stretch:Math.min(.022,speed*.0026)};
    const value={radius,x,y,drops,deform};
    plan.cacheKey=renderKey;plan.cacheValue=value;
    pendingMother=deform;
    return value;
  }

  function buildSplit(M,count,width,height,radius) {
    const activeCount=Math.min(23,count);
    const entries=Array.from({length:count},(_,i)=>{
      if(i>=activeCount) return {active:false,start:2,duration:.54,orbitRadius:1,tangent:0};
      return {
        active:true,
        start:((i*7)%activeCount)/activeCount*.46,
        duration:.54,
        orbit:M.anniversaryParticle(i,activeCount,.43,width,height),
        orbitRadius:(16+(i%5)*3)/2,
        tangent:(i%2?1:-1)*(.55+(i%5)*.08)
      };
    });
    const weights=entries.reduce((sum,p)=>sum+(p.active?p.orbitRadius*p.orbitRadius:0),0);
    for(const p of entries) {
      if(p.active) {
        p.volumeRadius=p.orbitRadius*radius/Math.sqrt(weights);
        p.orbitRadius=p.volumeRadius*.55;
      }
    }
    const mother=s=>Math.sqrt(Math.max(0,radius*radius-entries.reduce((sum,p)=>
      sum+(p.active?p.volumeRadius*p.volumeRadius*ramp((s-p.start)/p.duration,.04,.50):0),0)));
    return {plan:entries,mother,activeCount,totalArea:radius*radius,renderSteps:1800,cacheKey:-1,cacheValue:null};
  }

  function splitAt(plan,s) {
    const renderKey=Math.round(clamp(s)*plan.renderSteps);
    if(plan.cacheKey===renderKey && plan.cacheValue) {
      pendingMother=plan.cacheValue.deform;
      return plan.cacheValue;
    }
    const q=renderKey/plan.renderSteps;
    const lobes=[];
    const drops=plan.plan.map((p,i)=> {
      if(!p.active) return {x:0,y:0,r:0,collisionR:0,handoff:0,color:0,scale:0,local:0};
      const local=clamp((q-p.start)/p.duration);
      const transferred=ramp(local,.04,.50);
      const areaR=p.volumeRadius*Math.sqrt(transferred);
      // Optical taper after budding: keep source volume accounting independent
      // from the smaller display radius requested for released particles.
      const r=areaR*mix(1,.55,ramp(local,.12,.64));
      const release=ramp(local,.48,.68);
      const flight=ramp(local,.64,1);
      const angle=p.orbit.angle+Math.sin(flight*Math.PI)*.09;
      const gap=Math.max(10,Math.min(28,r*1.15));
      const contact=plan.mother(q)+r*mix(.35,.94,ramp(local,.04,.48));
      const distance=mix(contact+release*gap*1.35,p.orbit.radius,flight);
      const drift=Math.sin(flight*Math.PI)*p.tangent*3;
      const x=Math.cos(angle)*distance-Math.sin(angle)*drift;
      const y=Math.sin(angle)*distance+Math.cos(angle)*drift;
      const bulge=Math.sin(ramp(local,0,.52)*Math.PI)*(1-ramp(local,.52,.82));
      if(bulge>.02) lobes.push({angle,weight:bulge*(.7+(i%4)*.08)});
      return {
        x,y,r,areaR,collisionR:r*(1-ramp(local,.02,.24)),
        handoff:ramp(local,.74,1),color:0,
        scale:r/Math.max(.001,p.orbitRadius),local
      };
    });
    const deform={lobes,axis:0,stretch:Math.min(.014,lobes.reduce((s,l)=>s+l.weight,0)*.0018)};
    const value={radius:plan.mother(q),drops,deform};
    plan.cacheKey=renderKey;plan.cacheValue=value;
    pendingMother=deform;
    return value;
  }

  const mother=(x,y,r,deform)=>r<.05?'':deform&&((deform.lobes&&deform.lobes.length)||deform.stretch>.001)?softMother(x,y,r,deform):plainCircle(x,y,r);
  const api={circle,plainCircle,mother,neck,buildGather,gatherAt,buildSplit,splitAt};
  if(typeof module==='object' && module.exports) module.exports=api;
  else target.TwoNLiquid=api;
})(typeof window==='object'?window:this);
