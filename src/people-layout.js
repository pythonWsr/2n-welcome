import * as T from 'three';
import {Text} from 'troika-three-text';
import {normalizePeople} from './people-data.js';
import {resizeCourtyard, sampleCourtyard, chapterHandoff} from './people-courtyard.js';
import {peoplePose,projectTextBounds} from './people-path.js';

function ink(text) {
 const raw=text.textRenderInfo?.glyphBounds;
 if(!raw?.length)throw new Error('人物文字缺少有效字形范围。');
 const glyphs=[];for(let i=0;i<raw.length;i+=4)glyphs.push(Array.from(raw.slice(i,i+4)));
 const result={minX:Math.min(...glyphs.map(g=>g[0])),minY:Math.min(...glyphs.map(g=>g[1])),maxX:Math.max(...glyphs.map(g=>g[2])),maxY:Math.max(...glyphs.map(g=>g[3])),glyphs};
 if(!Object.values(result).slice(0,4).every(Number.isFinite))throw new Error('人物文字字形范围无效。');
 return result;
}

function spatialOpacity(rects,viewport,fallback) {
 if(!rects.length)return fallback;
 const left=Math.min(...rects.map(r=>r.x)),right=Math.max(...rects.map(r=>r.x+r.width));
 const top=Math.min(...rects.map(r=>r.y)),bottom=Math.max(...rects.map(r=>r.y+r.height));
 const u=T.MathUtils.clamp(Math.min((left/viewport.width)/.12,(1-right/viewport.width)/.12,(top/viewport.height)/.30,(1-bottom/viewport.height)/.30),0,1);
 const smooth=u*u*u*(10+u*(-15+6*u));
 return Math.min(fallback,smooth);
}

/** Route-backed text layer; no camera track or independently-owned windows. */
export function createCourtyardGallery(data, initialRoute) {
 const people=normalizePeople(data);if(people.errors.length)throw new Error(people.errors.join('\n'));
 if(people.leaders.length>5)throw new Error('第一轮最多展示五位管理层。');
 const group=new T.Group();group.name='people-gallery';group.visible=false;
 const leaderGroup=new T.Group();leaderGroup.name='people-leaders';group.add(leaderGroup);
 const crowd=new T.Group();crowd.name='people-crowd';group.add(crowd);
 const shade=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({
  transparent:true,depthWrite:false,toneMapped:false,
  uniforms:{opacity:{value:0}},
  vertexShader:'varying vec2 uvShade; void main(){uvShade=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 uvShade; uniform float opacity; void main(){vec2 p=abs(uvShade*2.-1.);float edge=max(p.x,p.y);float alpha=1.-smoothstep(.28,1.,edge);gl_FragColor=vec4(.025,.035,.03,alpha*opacity);}'
 }));
 shade.name='people-soft-shade';shade.visible=false;shade.renderOrder=1;group.add(shade);
 const all=[],cards=[],slots=[],glyphMetrics={leaders:{},members:[]};
 let route=initialRoute,viewport={width:414,height:896},disposed=false,prepared=false,error=null,inflight=null,revision=0;
 function label(tier){
  const text=new Text();text.font=`${import.meta.env?.BASE_URL||'/'}assets/fonts/people-sc-semibold.woff?v=people-sdf256-1`;
  text.fontSize=1;text.anchorX='left';text.anchorY='bottom';text.whiteSpace='pre';text.lineHeight=1.4;
  text.strokeWidth=0;text.renderOrder=2;
  text.sdfGlyphSize=256;text.gpuAccelerateSDF=false;text.color=0xf4f0df;
  Object.assign(text.material,{fog:false,depthWrite:false,transparent:true,toneMapped:false,opacity:0});
  text.userData.tier=tier;text.visible=false;all.push(text);return text;
 }
 people.leaders.forEach((person,index)=>{
  const card=new T.Group();card.userData.leaderIndex=index;leaderGroup.add(card);cards.push(card);
  for(const tier of ['name','role','intro'])if(person[tier]){const text=label(tier);text.text=person[tier];text.userData.personId=person.id;card.add(text);}
 });
 for(let i=0;i<21;i++){const text=label('name');text.userData.memberSlot=i;crowd.add(text);slots.push({text,pending:null,desired:null,published:null,serial:0});}

 // Troika coalesces sync while busy. Never change text until its original
 // sync finishes; stale completion may measure, but cannot publish a layer.
 function request(slot, binding) {
  slot.desired=binding;
  if(slot.pending)return slot.pending;
  if(!binding)return Promise.resolve();
  if(slot.published?.key===binding.key)return Promise.resolve();
  slot.text.visible=false;slot.published=null;
  const text=slot.text,serial=++slot.serial;text.text=binding.content;
  text.maxWidth=binding.maxWidth??Infinity;
  text.whiteSpace=binding.maxWidth?'normal':'pre';text.overflowWrap=binding.maxWidth?'break-word':'normal';
  // These are the only shaping properties changed after label construction.
  // Revision identifies the route placement; it is not a glyph-work identity.
  const shaping=[text.text,text.maxWidth,text.whiteSpace,text.overflowWrap];
  if(slot.settled?.shaping.every((value,i)=>value===shaping[i])){
   binding.measured=slot.settled.measured;slot.published=binding;
   return Promise.resolve();
  }
  slot.settled=null;
  const promise=new Promise((resolve,reject)=>{
   const complete=()=>{
    text.removeEventListener('synccomplete',complete);
    if(disposed){resolve();return;}
    try{
     const measured=ink(text);binding.measured=measured;
     if(serial===slot.serial)slot.settled={shaping,measured};
     if(slot.desired?.key===binding.key&&serial===slot.serial)slot.published=binding;
     resolve();
    }catch(reason){error=reason;reject(reason);}
   };
   text.addEventListener('synccomplete',complete);
   slot.cancel=()=>{text.removeEventListener('synccomplete',complete);resolve();};
   try{text.sync();}catch(reason){text.removeEventListener('synccomplete',complete);reject(reason);}
  });
  slot.pending=promise;
  promise.finally(()=>{slot.pending=null;if(!disposed&&slot.desired?.key!==binding.key)request(slot,slot.desired).catch(reason=>{error=reason;});}).catch(()=>{});
  return promise;
 }
 const leaderSlots=cards.flatMap(card=>card.children.map(text=>({text,pending:null,published:null,desired:null,serial:0})));
 async function load(){
  await Promise.all(leaderSlots.map(async slot=>{const p=slot.text.userData.personId,tier=slot.text.userData.tier;await request(slot,{key:`leader:${p}:${tier}`,content:slot.text.text});if(disposed)return;
   (glyphMetrics.leaders[p]||= {})[tier]=slot.published.measured;layoutLeaders();}));
  if(disposed)return;
  await Promise.all(slots.slice(0,7).map(async(slot,worker)=>{for(let i=worker;i<people.members.length;i+=7){const binding={key:`measure:${i}`,content:people.members[i]};await request(slot,binding);if(disposed)return;glyphMetrics.members[i]=slot.published.measured;}}));
  resize(viewport.width/viewport.height,viewport.height);prepared=true;error=null;
 }
 function prepare(timeoutMs=20000){
  if(disposed)return Promise.reject(new Error('人物章节已释放。'));
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)return Promise.reject(new RangeError('人物文字超时必须为有限正数。'));
  if(prepared)return Promise.resolve();
  if(!inflight)inflight=load().catch(reason=>{error=reason;throw reason;}).finally(()=>{inflight=null;});
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{const reason=new Error('人物文字准备超时');error=reason;reject(reason);},timeoutMs);inflight.then(()=>{clearTimeout(timer);resolve();},reason=>{clearTimeout(timer);reject(reason);});});
 }
 function resize(aspect,height=896){
  if(!Number.isFinite(aspect)||aspect<=0||!Number.isFinite(height)||height<=0)throw new RangeError('人物画幅必须为正数。');
  viewport={width:aspect*height,height};route=resizeCourtyard(route,{...viewport,glyphMetrics});revision++;layoutLeaders();return route;
 }
 function poseFor(index){const w=route.windows[index],cam=new T.PerspectiveCamera(48,viewport.width/viewport.height,.2,2400);peoplePose(w.readStart,cam,cam.aspect,route);return cam;}
 function place(text,station,metric,pixels,x,y,cam){
  text.position.fromArray(station.position);text.quaternion.fromArray(station.quaternion);text.scale.setScalar(1);text.updateMatrixWorld(true);
  const unit=projectTextBounds(cam,text.matrixWorld,metric,viewport).fontPixels;
  const scale=pixels/unit;
  text.scale.setScalar(scale);
  const shift=new T.Vector3(x-(metric.minX+metric.maxX)/2*scale,y-(metric.minY+metric.maxY)/2*scale,0).applyQuaternion(text.quaternion);
  text.position.add(shift);text.updateMatrixWorld(true);
  text.userData.bounds=metric;text.userData.projection=projectTextBounds(cam,text.matrixWorld,metric,viewport);
 }
 function layoutLeaders(){
  for(let i=0;i<route.stations.length;i++){const s=route.stations[i];if(s.kind!=='leader')continue;
   const cam=poseFor(i),card=cards[s.leaderIndex],metrics=glyphMetrics.leaders[s.personId??people.leaders[s.leaderIndex].id];if(!metrics)continue;
   const unit=viewport.height/(2*100*Math.tan(48*Math.PI/360));
   for(const text of card.children){const tier=text.userData.tier,m=metrics[tier];if(!m)continue;const glyphHeight=Math.max(...m.glyphs.map(g=>g[3]-g[1]));
    const desired=tier==='name'?48:tier==='role'?24:19;
    const pixels=Math.min(desired,viewport.width*.74*glyphHeight/(m.maxX-m.minX));
    const y=tier==='name'?Math.min(48,viewport.height*.10):tier==='role'?-8:-Math.min(64,viewport.height*.12);
    place(text,s,m,pixels,0,y/unit,cam);}
  }
 }
 function updateShade(){
  const visible=all.filter(text=>text.visible&&text.userData.bounds);
  shade.visible=visible.length>0;if(!shade.visible)return;
  const origin=visible[0].position,quaternion=visible[0].quaternion,inverse=quaternion.clone().invert(),box=new T.Box3();
  for(const text of visible){text.updateMatrixWorld(true);const b=text.userData.bounds;
   for(const x of [b.minX,b.maxX])for(const y of [b.minY,b.maxY])box.expandByPoint(new T.Vector3(x,y,0).applyMatrix4(text.matrixWorld).sub(origin).applyQuaternion(inverse));
  }
  const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  // Broad feather, no border, outline or hard-edged card. Actual world depth.
  const padding=visible[0].scale.x*1.4;
  shade.scale.set(size.x+padding*2,size.y+padding*2,1);center.z=-.25;
  shade.position.copy(center.applyQuaternion(quaternion).add(origin));shade.quaternion.copy(quaternion);
  shade.material.uniforms.opacity.value=.42*Math.max(...visible.map(text=>text.material.opacity));
 }
 function update(t,camera){
  if(disposed)return;group.visible=t>0;
  const sample=sampleCourtyard(route,t,viewport.width/viewport.height);
  for(const text of all){text.visible=false;text.material.opacity=0;}
  for(const visible of sample.visibleStations){const s=route.stations[visible.stationIndex];if(s.kind!=='leader')continue;
   const children=cards[s.leaderIndex].children,rects=children.filter(text=>text.userData.bounds).map(text=>{text.updateMatrixWorld(true);return projectTextBounds(camera,text.matrixWorld,text.userData.bounds,viewport,false).rect;});
   const opacity=Math.min(chapterHandoff(route,t).people,spatialOpacity(rects,viewport,visible.opacity));
   for(const text of children){text.material.opacity=opacity;text.visible=Boolean(glyphMetrics.leaders[s.personId??people.leaders[s.leaderIndex].id]?.[text.userData.tier])&&opacity>0;}
  }
  // The measurement pass owns the member pool until every metric is recorded.
  // Partial metrics must not let animation repurpose its pending probe slot;
  // a timeout keeps this reservation until the original work completes.
  if(!prepared){updateShade();return;}
  const desired=sample.visibleStations.filter(v=>route.stations[v.stationIndex].kind==='member');
  const wanted=new Set(desired.map(v=>route.stations[v.stationIndex].id));
  const buckets=new Map();for(let b=0;b<3;b++){const first=slots[b*7];if(first.desired&&wanted.has(first.desired.stationId))buckets.set(first.desired.stationId,b);}
  for(const v of desired){const station=route.stations[v.stationIndex];let bucket=buckets.get(station.id);
   if(bucket===undefined){bucket=[0,1,2].find(b=>!Array.from(buckets.values()).includes(b));buckets.set(station.id,bucket);}
   for(let j=0;j<7;j++){const slot=slots[bucket*7+j],index=station.memberIndices[j];if(index===undefined){slot.desired=null;continue;}
    const metric=glyphMetrics.members[index];if(!metric)continue;
    const glyphHeight=Math.max(...metric.glyphs.map(g=>g[3]-g[1]));
    request(slot,{key:`${revision}:${station.id}:${index}`,stationId:station.id,content:people.members[index],index,maxWidth:viewport.width*(station.columns===2?.34:.74)/22*glyphHeight}).catch(reason=>{error=reason;});
   }
   const complete=station.memberIndices.every((index,j)=>slots[bucket*7+j].published?.key===`${revision}:${station.id}:${index}`);
   if(!complete)continue;
   const needsPlacement=slots.slice(bucket*7,bucket*7+station.memberIndices.length).some(slot=>slot.text.userData.placementKey!==slot.published.key);
   const cam=needsPlacement?poseFor(v.stationIndex):null,unit=viewport.height/(2*100*Math.tan(48*Math.PI/360));
   for(let j=0;j<7;j++){const slot=slots[bucket*7+j],index=station.memberIndices[j];if(index===undefined){slot.desired=null;continue;}
    const row=Math.floor(j/station.columns),rows=Math.ceil(station.memberIndices.length/station.columns),x=station.columns===2?(j%2?1:-1)*viewport.width*.20/unit:0,y=((rows-1)/2-row)*station.rowPixels/unit;
    if(slot.text.userData.placementKey!==slot.published.key){place(slot.text,station,slot.published.measured,22,x,y,cam);slot.text.userData.placementKey=slot.published.key;}
    slot.text.userData.memberIndex=index;slot.text.userData.stationId=station.id;
    slot.text.visible=v.opacity>0;slot.text.material.opacity=v.opacity;
   }
   const active=slots.slice(bucket*7,bucket*7+station.memberIndices.length);
   const opacity=Math.min(chapterHandoff(route,t).people,spatialOpacity(active.map(slot=>projectTextBounds(camera,slot.text.matrixWorld,slot.text.userData.bounds,viewport,false).rect),viewport,v.opacity));
   active.forEach(slot=>{slot.text.material.opacity=opacity;slot.text.visible=opacity>0;});
  }
  updateShade();
 }
 return {group,prepare,retry:prepare,update,resize,
  get ready(){return prepared&&!disposed;},get error(){return error;},get route(){return route;},glyphMetrics,
  adoptRoute(next){route=next;revision++;layoutLeaders();return route;},
  dispose(){if(disposed)return;disposed=true;prepared=false;for(const slot of [...slots,...leaderSlots]){slot.desired=null;slot.cancel?.();}for(const text of all){text.dispose();text.material.dispose();}shade.geometry.dispose();shade.material.dispose();group.clear();group.visible=false;}};
}
