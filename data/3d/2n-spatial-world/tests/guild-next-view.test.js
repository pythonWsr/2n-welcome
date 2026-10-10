import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {Text} from 'troika-three-text';
const api=await import('../src/guild-next-view.js').catch(()=>({}));
test('next view uses exact left aligned copy and fits phone and landscape',async()=>{
 assert.equal(typeof api.createNextView,'function');
 const original=Text.prototype.sync;Text.prototype.sync=function(cb){const b=[];let x=0,y=0;for(const ch of this.text){if(x+.7>this.maxWidth){x=0;y-=1.45;}b.push(x,y,x+.65,y+1);x+=.7;}this._textRenderInfo={glyphBounds:new Float32Array(b)};cb();};
 let view;try{
 view=api.createNextView();for(const [width,height,safeLeft,safeRight] of [[390,844,0,0],[430,932,0,0],[844,390,59,59]]){
 view.resize({width,height,safeLeft,safeRight});await view.prepare();const cam=new T.PerspectiveCamera(48,width/height,.2,2400);cam.position.set(-2,4,140);cam.lookAt(0,0,-50);cam.updateMatrixWorld();
 view.update({nextOpacity:0,target:[0,0,-50]},cam,{width,height});assert.equal(view.group.visible,false);assert.equal(view.readingBounds.isEmpty(),true);
 view.update({nextOpacity:1,target:[0,0,-50]},cam,{width,height});assert.equal(view.group.visible,true);assert.equal(view.readingBounds.isEmpty(),false);
 const texts=view.group.children.filter(o=>o instanceof Text);assert.deepEqual(texts.map(o=>o.text),['下一程，仍然同行','五境里留下的足迹，还会继续延伸。','2n']);assert.ok(texts.every(o=>o.anchorX==='left'&&o.strokeWidth===0&&o.material.depthTest));
 const lefts=[];for(const text of texts){const b=text.userData.ink;lefts.push(new T.Vector3(b.minX,0,0).applyMatrix4(text.matrixWorld).project(cam).x);for(const x of [b.minX,b.maxX])for(const y of [b.minY,b.maxY]){const point=new T.Vector3(x,y,0).applyMatrix4(text.matrixWorld).project(cam);assert.ok(point.x>=-1+2*(safeLeft+30)/width&&point.x<=1-2*(safeRight+30)/width&&Math.abs(point.y)<.5);}}
 assert.ok(Math.max(...lefts)-Math.min(...lefts)<1e-6);
 }view.dispose();view.dispose();assert.equal(view.ready,false);
 }finally{Text.prototype.sync=original;view?.dispose();}
});
test('height-only resize reshapes ready Troika text rather than timing out on unchanged properties',async()=>{
 const original=Text.prototype.sync;Text.prototype.sync=function(cb){if(!this._needsSync)return;this._needsSync=false;this._textRenderInfo={glyphBounds:new Float32Array([0,0,1,1])};cb();};
 let view;try{view=api.createNextView();view.resize({width:414,height:896});await view.prepare(20);assert.equal(view.ready,true);
 view.resize({width:414,height:780});await view.prepare(20);assert.equal(view.ready,true);
 }finally{Text.prototype.sync=original;view?.dispose();}
});
