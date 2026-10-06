import * as T from 'three';
import {Text} from 'troika-three-text';

export function createHistoryView(events,route){
 const group=new T.Group();group.name='guild-history';group.visible=false;
 const readingBounds=new T.Box3();let prepared=false,disposed=false,inflight=null,revision=0;
 let viewport={width:414,height:896};const cards=[];
 const shade=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,uniforms:{opacity:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform float opacity;void main(){vec2 p=(v-.5)*2.;float a=1.-smoothstep(.25,1.,length(p));gl_FragColor=vec4(.025,.035,.03,a*opacity);}'}));shade.renderOrder=1;group.add(shade);
 events.forEach(event=>{const card=new T.Group();group.add(card);cards.push(card);for(const [tier,content] of [['date',event.date.replaceAll('-','.')],['title',event.title],['body',event.body]]){
  const text=new Text();text.text=content;text.fontSize=1;text.anchorX='left';text.anchorY='bottom';text.lineHeight=1.45;text.whiteSpace='normal';text.overflowWrap='break-word';text.color=tier==='body'?0xc8cbbc:0xf4f0df;text.strokeWidth=0;text.sdfGlyphSize=256;text.gpuAccelerateSDF=false;text.renderOrder=2;text.userData.tier=tier;
  Object.assign(text.material,{transparent:true,depthWrite:false,depthTest:true,fog:false,toneMapped:false,opacity:0});card.add(text);
 }});
 function measure(text){const b=text.textRenderInfo?.glyphBounds;if(!b?.length)throw new Error('历史文字字形尚未准备好');return {minX:Math.min(...Array.from(b).filter((_,i)=>i%4===0)),maxX:Math.max(...Array.from(b).filter((_,i)=>i%4===2)),minY:Math.min(...Array.from(b).filter((_,i)=>i%4===1)),maxY:Math.max(...Array.from(b).filter((_,i)=>i%4===3))};}
 function reshape(font,timeoutMs){const jobs=[];for(const card of cards)for(const text of card.children){
  const pixels=text.userData.tier==='date'?Math.min(48,viewport.width*.112):text.userData.tier==='title'?Math.max(18,Math.min(23,viewport.width*.056)):16;
  text.userData.pixels=pixels;text.maxWidth=Math.max(120,viewport.width-64)/pixels;
  text.font=null;text.font=font;
  jobs.push(new Promise((resolve,reject)=>{let settled=false;const timer=setTimeout(()=>{settled=true;reject(new Error('历史文字准备超时，可重试'));},timeoutMs);const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);try{if(!disposed)text.userData.ink=measure(text);resolve();}catch(e){reject(e);}};try{text.sync(finish);}catch(e){settled=true;clearTimeout(timer);reject(e);}}));
 }return Promise.all(jobs);}
 async function prepare(timeoutMs=20000){if(disposed)throw new Error('历史章节已释放');if(prepared)return;if(inflight)return inflight;
 const current=revision;inflight=(async()=>{const {default:font}=await import('./guild-history-font.js');await reshape(font,timeoutMs);if(disposed||current!==revision)return;prepared=true;})().finally(()=>{inflight=null;});return inflight;}
 function resize(next){if(viewport.width===next.width&&viewport.height===next.height)return;viewport={width:next.width,height:next.height};revision++;prepared=false;group.visible=false;}
 function update(state,camera,next){readingBounds.makeEmpty();group.visible=prepared&&!disposed&&state.eventOpacity>0;if(!group.visible)return;
  camera.updateMatrixWorld();const depth=camera.position.distanceTo(new T.Vector3(...state.target)),half=depth*Math.tan(T.MathUtils.degToRad(camera.fov/2)),unit=2*half/next.height;
  const card=cards[state.eventIndex];cards.forEach(c=>c.visible=c===card);
  const gap=12;let total=gap*2;for(const text of card.children){const b=text.userData.ink;total+=(b.maxY-b.minY)*text.userData.pixels;}
  const fit=Math.min(1,next.height*.35/total),origin=new T.Vector3(...state.target);let cursor=total*fit/2;
  for(const text of card.children){const b=text.userData.ink,scale=text.userData.pixels*fit*unit,height=(b.maxY-b.minY)*text.userData.pixels*fit;
   text.quaternion.copy(camera.quaternion);text.scale.setScalar(scale);text.position.copy(origin).add(new T.Vector3(-half*camera.aspect*(1-64/next.width)-b.minX*scale,(cursor-height/2)*unit-(b.minY+b.maxY)/2*scale,0).applyQuaternion(camera.quaternion));cursor-=height+gap*fit;text.material.opacity=state.eventOpacity;text.material.depthWrite=(state.memoryPhase??0)>1;text.visible=true;text.updateMatrixWorld(true);
   for(const x of [b.minX,b.maxX])for(const y of [b.minY,b.maxY])readingBounds.expandByPoint(new T.Vector3(x,y,0).applyMatrix4(text.matrixWorld));
  }
  shade.position.copy(origin).add(new T.Vector3(0,0,-.35).applyQuaternion(camera.quaternion));shade.quaternion.copy(camera.quaternion);shade.scale.set(half*camera.aspect*1.85,half*.9,1);shade.material.uniforms.opacity.value=.22*state.eventOpacity;
 }
 return {group,readingBounds,prepare,resize,update,get ready(){return prepared&&!disposed;},dispose(){if(disposed)return;disposed=true;prepared=false;cards.forEach(c=>c.children.forEach(t=>t.dispose()));shade.geometry.dispose();shade.material.dispose();group.clear();}};
}
