import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Text} from 'troika-three-text';
const api=await import('../src/guild-history-view.js').catch(()=>({}));
import {createHistoryRoute,sampleHistory} from '../src/guild-history-route.js';
test('history view measures wrapped text and publishes one warm-white station without growing children',async()=>{
 assert.equal(typeof api.createHistoryView,'function');
 const original=Text.prototype.sync;
 Text.prototype.sync=function(callback){const b=[];let x=0,y=0;for(const ch of this.text){if(x+.7>this.maxWidth){x=0;y-=1.4;}b.push(x,y,x+.65,y+1);x+=.7;}this._textRenderInfo={glyphBounds:new Float32Array(b)};this.dispatchEvent({type:'synccomplete'});callback?.();};
 const events=Array.from({length:3},(_,i)=>({id:String(i),date:'2026-08-18',title:'一片花瓣，见证繁盛',body:'一起走过的日子，留下值得铭记的印记。'.repeat(3)}));
 const route=createHistoryRoute(events,{position:[0,100,100],target:[0,55,30],up:[0,1,0]});let view;
 try{view=api.createHistoryView(events,route);await view.prepare();const count=view.group.children.length;
 for(const [width,height] of [[414,896],[896,414],[280,600]]){view.resize({width,height});await view.prepare();const cam=new T.PerspectiveCamera(48,width/height,.2,2400),s=sampleHistory(route,1,cam.aspect);cam.position.fromArray(s.position);cam.up.fromArray(s.up);cam.lookAt(...s.target);cam.updateMatrixWorld();view.update(s,cam,{width,height});
 const visible=[];view.group.traverse(o=>{if(o instanceof Text&&o.parent.visible&&o.visible)visible.push(o);});assert.equal(visible.length,3);assert.ok(visible.every(o=>!o.strokeWidth));
 const date=visible.find(t=>t.userData.tier==='date'),title=visible.find(t=>t.userData.tier==='title'),body=visible.find(t=>t.userData.tier==='body');
 assert.ok(date.userData.pixels>=title.userData.pixels*1.7,'date is the primary visual landmark');assert.ok(title.userData.pixels>body.userData.pixels);assert.equal(date.color,0xf4f0df);
 assert.ok(visible.every(o=>o.material.depthTest===true&&o.material.depthWrite===false),"foreground petals must occlude text using scene depth");
 assert.equal(view.group.children[0].material.depthTest,true,"shade must not wash over foreground petals");
 for(const text of visible){const b=text.textRenderInfo.glyphBounds;for(let i=0;i<b.length;i+=4)for(const x of [b[i],b[i+2]])for(const y of [b[i+1],b[i+3]]){const p=new T.Vector3(x,y,0).applyMatrix4(text.matrixWorld).project(cam);assert.ok(Math.abs(p.x)<=1-60/width+1e-6&&Math.abs(p.y)<=.4+1e-6);}}
 const leftEdges=visible.map(text=>{const b=text.textRenderInfo.glyphBounds;const x=Math.min(...Array.from(b).filter((_,i)=>i%4===0));return new T.Vector3(x,0,0).applyMatrix4(text.matrixWorld).project(cam).x;});
 assert.ok(Math.max(...leftEdges)-Math.min(...leftEdges)<1e-6,'date, title and body share a left edge');
 assert.equal(view.group.children.length,count);}
 view.dispose();view.dispose();assert.equal(view.ready,false);
 }finally{Text.prototype.sync=original;view?.dispose();}
});
test('timed-out old font completion cannot publish a resized retry',async()=>{
 const original=Text.prototype.sync,jobs=[];
 Text.prototype.sync=function(callback){const text=this;jobs.push(()=>{text._textRenderInfo={glyphBounds:new Float32Array([0,0,1,1])};text.dispatchEvent({type:'synccomplete'});callback?.();});};
 const events=Array.from({length:3},(_,i)=>({id:String(i),date:'2026-08-18',title:'标题',body:'正文'}));const view=api.createHistoryView(events);
 try{await assert.rejects(view.prepare(5));const old=jobs.splice(0);view.resize({width:896,height:414});const retry=view.prepare(1000);await new Promise(resolve=>setImmediate(resolve));old.forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));assert.equal(view.ready,false,'old glyph result published retry');jobs.splice(0).forEach(fn=>fn());await retry;assert.equal(view.ready,true);}finally{Text.prototype.sync=original;view.dispose();}
});
