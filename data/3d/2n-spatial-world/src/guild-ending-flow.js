import {nextSmooth} from './guild-next-route.js';
const TAU=Math.PI*2,mix=(a,b,k)=>a.map((v,i)=>v+(b[i]-v)*k);
export const endingGateProgress=t=>nextSmooth((t-.18)/.40);
export const endingGlyphProgress=(t,seed=0)=>nextSmooth((t-.80-seed*.02)/.08);
export function endingFlowCenter(s,fit=1){
 const r=1-s;
 return [(-150*r*r*s+165*r*s*s)*fit,30*r*r*r-300*r*r*s+405*r*s*s+43*s*s*s,-14*r*r*r-540*r*r*s-390*r*s*s-14*s*s*s];
}
export function endingFlowTangent(s,fit=1){
 const r=1-s;
 return [3*(-50*r*r+210*r*s-55*s*s)*fit,3*(-130*r*r+470*r*s-92*s*s),3*(-166*r*r+100*r*s+116*s*s)];
}
// Restore the 158c2fb stream, its five-biome angular placement, depth and
// billow. The former disk alone is replaced; playback drives replay exactly.
export function endingStreamPoint(seed,t,aspect=.6,reduced=false){
 const [u,v,w,g]=seed,turn=u*TAU,rad=32+v*68,width=Math.max(.65,Math.min(aspect,1.5));
 const p=[Math.cos(g*1.256637+v*5)*rad*width+Math.sin(turn)*5,30+(v-.5)*140+Math.cos(turn)*5,-14+Math.sin(g*1.256637+v*5)*rad+w*10];
 const clock=t*18,flow=reduced?0:2.2;
 return [p[0]+Math.sin(p[1]*.07+clock*.23)*flow,p[1]+Math.cos(p[2]*.08-clock*.17)*flow,p[2]+Math.sin(p[0]*.06+clock*.2)*flow];
}
export function endingFlowPoint(cloud,mark,seed,t,aspect=.6,reduced=false){
 t=Number.isFinite(t)?Math.max(0,Math.min(1,t)):0;
 const [u,v,w]=seed,fit=Math.min(1,aspect/.6),motion=reduced?0:1,s=endingGateProgress(t);
 const a=nextSmooth((t-.26)/.10),b=nextSmooth((t-.36)/.10),c=nextSmooth((t-.46)/.10),phase=u*TAU+t*10*motion;
 const width=1.15*(20+26*a)*(1-.35*b+.30*c),height=1.15*(36-20*a)*(1+.6*c),thick=1.15*(10+17*b);
 const x=(u*2-1)*width+Math.sin(v*TAU+phase)*6*motion;
 const y=(v*2-1)*height+Math.sin(u*TAU+phase)*8*motion;
 const z=(w*2-1)*thick+Math.cos(u*TAU+v*4-phase)*8*motion;
 const roll=(.55*Math.sin((t-.28)*7)+b*.9-c*.8)*motion,yaw=b*.7*motion;
 const xx=x*Math.cos(roll)-y*Math.sin(roll),yy=x*Math.sin(roll)+y*Math.cos(roll);
 const center=endingFlowCenter(s,fit);
 const wave=[center[0]+(xx*Math.cos(yaw)+z*Math.sin(yaw))*fit,center[1]+yy,center[2]-xx*Math.sin(yaw)+z*Math.cos(yaw)];
 const stream=endingStreamPoint(seed,t,aspect,reduced);
 let p=mix(stream,wave,nextSmooth((t-.18)/.12));
 const turn=u*TAU+t*(5+3*v+2*w)*motion,ny=Math.sin(Math.asin(v*2-1)+Math.sin(turn*2+t*7)*.18*motion),ring=Math.sqrt(Math.max(0,1-ny*ny));
 const radius=39*Math.cbrt(w)*(1+.16*Math.sin(turn*3+ny*4)+.08*Math.sin(v*12+t*8*motion));
 const cluster=[Math.cos(turn)*ring*radius*fit,43+ny*radius*(.9+.10*Math.sin(t*9*motion+u*3)),-14+Math.sin(turn)*ring*radius];
 p=mix(p,cluster,nextSmooth((t-.55)/.15));
 // There is deliberately no use of mark before this independent, late stage.
 return mix(p,mark,endingGlyphProgress(t,w));
}
export const ENDING_FLOW_GLSL=`
float gateProgress(float t){return ease((t-.18)/.40);}
float glyphProgress(float t,float seed){return ease((t-.80-seed*.02)/.08);}
vec3 flowCenter(float s,float fit){float r=1.-s;return vec3((-150.*r*r*s+165.*r*s*s)*fit,30.*r*r*r-300.*r*r*s+405.*r*s*s+43.*s*s*s,-14.*r*r*r-540.*r*r*s-390.*r*s*s-14.*s*s*s);}
vec3 streamPoint(vec4 seed,float t,float aspect,float reduced){
 float turn=seed.x*6.28318530718,rad=32.+seed.y*68.,width=max(.65,min(aspect,1.5));
 vec3 p=vec3(cos(seed.w*1.256637+seed.y*5.)*rad*width+sin(turn)*5.,30.+(seed.y-.5)*140.+cos(turn)*5.,-14.+sin(seed.w*1.256637+seed.y*5.)*rad+seed.z*10.);
 float clock=t*18.,flow=2.2*(1.-reduced);
 return p+vec3(sin(p.y*.07+clock*.23),cos(p.z*.08-clock*.17),sin(p.x*.06+clock*.2))*flow;
}
vec3 flowPoint(vec3 cloud,vec3 mark,vec4 seed,float t,float aspect,float reduced){
 float fit=min(1.,aspect/.6),motion=1.-reduced,s=gateProgress(t);
 float a=ease((t-.26)/.10),b=ease((t-.36)/.10),c=ease((t-.46)/.10),phase=seed.x*6.28318530718+t*10.*motion;
 float width=1.15*(20.+26.*a)*(1.-.35*b+.30*c),height=1.15*(36.-20.*a)*(1.+.6*c),thick=1.15*(10.+17.*b);
 float x=(seed.x*2.-1.)*width+sin(seed.y*6.28318530718+phase)*6.*motion;
 float y=(seed.y*2.-1.)*height+sin(seed.x*6.28318530718+phase)*8.*motion;
 float z=(seed.z*2.-1.)*thick+cos(seed.x*6.28318530718+seed.y*4.-phase)*8.*motion;
 float roll=(.55*sin((t-.28)*7.)+b*.9-c*.8)*motion,yaw=b*.7*motion;
 float xx=x*cos(roll)-y*sin(roll),yy=x*sin(roll)+y*cos(roll);
 vec3 wave=flowCenter(s,fit)+vec3((xx*cos(yaw)+z*sin(yaw))*fit,yy,-xx*sin(yaw)+z*cos(yaw));
 vec3 p=mix(streamPoint(seed,t,aspect,reduced),wave,ease((t-.18)/.12));
 float turn=seed.x*6.28318530718+t*(5.+3.*seed.y+2.*seed.z)*motion,ny=sin(asin(seed.y*2.-1.)+sin(turn*2.+t*7.)*.18*motion),ring=sqrt(max(0.,1.-ny*ny));
 float radius=39.*pow(seed.z,1./3.)*(1.+.16*sin(turn*3.+ny*4.)+.08*sin(seed.y*12.+t*8.*motion));
 vec3 cluster=vec3(cos(turn)*ring*radius*fit,43.+ny*radius*(.9+.10*sin(t*9.*motion+seed.x*3.)),-14.+sin(turn)*ring*radius);
 p=mix(p,cluster,ease((t-.55)/.15));
 return mix(p,mark,glyphProgress(t,seed.z));
}`;
