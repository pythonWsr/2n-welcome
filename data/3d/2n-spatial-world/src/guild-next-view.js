import * as T from 'three';
import {Text} from 'troika-three-text';
export const NEXT_COPY=['下一程，仍然同行','五境里留下的足迹，还会继续延伸。','2n'];
export function createNextView(){
 const group=new T.Group();group.name='guild-next-message';group.visible=false;
 const readingBounds=new T.Box3();let viewport={width:414,height:896},revision=0,prepared=false,disposed=false,inflight=null;
 const texts=NEXT_COPY.map((content,i)=>{
  const text=new Text();text.text=content;text.anchorX='left';text.anchorY='bottom';text.fontSize=1;text.lineHeight=1.55;text.whiteSpace='normal';text.overflowWrap='break-word';text.color=i===1?0xc8cbbc:0xf4f0df;text.strokeWidth=0;text.sdfGlyphSize=256;text.gpuAccelerateSDF=false;text.renderOrder=2;
  Object.assign(text.material,{transparent:true,depthWrite:true,depthTest:true,fog:false,toneMapped:false,opacity:0});group.add(text);return text;
 });
 function measure(text){const b=text.textRenderInfo?.glyphBounds;if(!b?.length)throw new Error('结尾字形尚未准备好');const points=Array.from(b);return {minX:Math.min(...points.filter((_,i)=>i%4===0)),maxX:Math.max(...points.filter((_,i)=>i%4===2)),minY:Math.min(...points.filter((_,i)=>i%4===1)),maxY:Math.max(...points.filter((_,i)=>i%4===3))};}
 function prepare(timeoutMs=20000){
  if(disposed)return Promise.reject(new Error('结尾视图已释放'));if(prepared)return Promise.resolve();if(inflight)return inflight;
  const current=revision;
  inflight=(async()=>{
   const {default:font}=await import('./guild-next-font.js');
   if(disposed)return;
   await Promise.all(texts.map((text,i)=>{
    const pixels=i===0?Math.max(22,Math.min(30,viewport.width*.07)):i===1?17:Math.max(36,Math.min(52,viewport.width*.11));text.userData.pixels=pixels;text.maxWidth=Math.min(480,Math.max(160,viewport.width-64-(viewport.safeLeft||0)-(viewport.safeRight||0)))/pixels;text.font=null;text.font=font;
    return new Promise((resolve,reject)=>{let settled=false;const timer=setTimeout(()=>{settled=true;reject(new Error('结尾文字准备超时，可重试'));},timeoutMs);
     try{text.sync(()=>{if(settled)return;settled=true;clearTimeout(timer);try{if(!disposed)text.userData.ink=measure(text);resolve();}catch(error){reject(error);}});}catch(error){settled=true;clearTimeout(timer);reject(error);}
    });
   }));
   if(!disposed&&current===revision)prepared=true;
  })().finally(()=>{inflight=null;});return inflight;
 }
 function resize(next){if(next.width===viewport.width&&next.height===viewport.height&&(next.safeLeft||0)===(viewport.safeLeft||0)&&(next.safeRight||0)===(viewport.safeRight||0))return;viewport={width:next.width,height:next.height,safeLeft:next.safeLeft||0,safeRight:next.safeRight||0};revision++;prepared=false;group.visible=false;readingBounds.makeEmpty();}
 function update(state,camera,next){
  readingBounds.makeEmpty();group.visible=prepared&&!disposed&&(state?.nextOpacity||0)>0;if(!group.visible)return;
  camera.updateMatrixWorld();const origin=new T.Vector3(...state.target),depth=camera.position.distanceTo(origin),half=depth*Math.tan(T.MathUtils.degToRad(camera.fov/2)),unit=half*2/next.height;
  const total=texts.reduce((sum,text)=>sum+(text.userData.ink.maxY-text.userData.ink.minY)*text.userData.pixels,0)+32;
  const fit=Math.min(1,next.height*.4/total);let cursor=total*fit/2;
  for(const text of texts){const b=text.userData.ink,scale=text.userData.pixels*fit*unit,height=(b.maxY-b.minY)*text.userData.pixels*fit;
   text.quaternion.copy(camera.quaternion);text.scale.setScalar(scale);text.position.copy(origin).add(new T.Vector3(-half*camera.aspect+(32+(viewport.safeLeft||0))*unit-b.minX*scale,(cursor-height/2)*unit-(b.minY+b.maxY)/2*scale,0).applyQuaternion(camera.quaternion));cursor-=height+16*fit;
   text.material.opacity=state.nextOpacity;text.updateMatrixWorld(true);
   for(const x of [b.minX,b.maxX])for(const y of [b.minY,b.maxY])readingBounds.expandByPoint(new T.Vector3(x,y,0).applyMatrix4(text.matrixWorld));
  }
 }
 return {group,readingBounds,prepare,resize,update,get ready(){return prepared&&!disposed;},dispose(){if(disposed)return;disposed=true;prepared=false;readingBounds.makeEmpty();texts.forEach(t=>t.dispose());group.clear();}};
}
