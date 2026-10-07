// Stable identities: two interwoven chains -> rotating shell -> breathing expansion.
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=v=>{const u=clamp(v);return u*u*(3-2*u);};
export function memoryPoint(a,phase=0,spin=0){
 const p=Math.max(0,Math.min(2,phase));
 const join=smooth(p),expand=smooth(p-1),angle=a.longitude+spin;
 const radial=Math.sqrt(1-a.latitude*a.latitude),radius=42*(1+expand*1.15);
 const shell=[Math.cos(angle)*radial*radius,a.latitude*radius,Math.sin(angle)*radial*radius-14];
 return a.chain.map((v,k)=>mix(v,shell[k],join));
}
export function createMemoryLayout({mobile=true,assets=[],chains=null,seed=260206}={}){
 const usable=assets.filter(a=>a.key&&Number.isFinite(a.radius)&&a.radius>0);
 const anchors=[],perChain=mobile?28:42;
 const shots=[{position:[0,3,190],target:[0,0,-14]},{position:[6,-4,190],target:[0,0,-14]},{position:[-4,7,198],target:[0,0,-14]}];
 for(let branch=0;branch<2&&usable.length;branch++){
 const members=chains?.filter(a=>a.branch===branch),count=members?members.length:perChain;
 for(let slot=0;slot<count;slot++){
  const u=count>1?slot/(count-1):1,sign=branch===0?1:-1;
  const asset=members?usable.find(a=>a.key===members[slot].key):usable[(slot+branch*7+seed)%usable.length];
  if(!asset)continue;
  const a={id:members?members[slot].id:`memory-${branch}-${slot}`,key:asset.key,radius:asset.radius,branch,u,
   chain:[(u-.5)*(mobile?196:260),sign*(42+7*Math.sin(u*Math.PI*2))+Math.sin(u*Math.PI)*3,sign*(u-.5)*54-14],
   latitude:sign*(.96-(slot+.5)/count*.92),longitude:slot*Math.PI*(3-Math.sqrt(5))+branch*Math.PI,
   twist:((slot*17+branch*5+seed)%21-10)*.013};
  a.positions=[0,1,2].map(p=>memoryPoint(a,p));anchors.push(a);
 }}
 return {anchors,shots,bounds:{radius:Math.max(1,...anchors.map(a=>Math.max(...a.positions.map(p=>Math.hypot(...p)+a.radius))))}};
}
export function sampleMemoryStory(t=0){
 const seconds=clamp(Number.isFinite(t)?t:0)*36;
 const phase=smooth((seconds-12)/3)+smooth((seconds-24)/3);
 const eventIndex=seconds<13.5?0:seconds<25.5?1:2;
 const start=[7,15,27][eventIndex],end=[12,24,36][eventIndex];
 const eventOpacity=smooth((seconds-start)/.8)*(eventIndex===2?1:1-smooth(seconds-end+1));
 return {memoryPhase:phase,eventIndex,eventOpacity,target:[0,0,-14]};
}
