import test from 'node:test';
import assert from 'node:assert/strict';
import {stableViewport} from '../src/viewport.js';

test('browser toolbar height changes leave the stage and its logical scroll range fixed, while rotation still resizes',async()=>{
 const names=['document','CSS','matchMedia','screen','window','innerHeight','getComputedStyle','addEventListener','ResizeObserver'];
 const saved=new Map(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),listeners=new Map(),changes=[];
 let width=390,height=844,safe=724,angle=0;
 const style={setProperty(){}},orientation={get angle(){return angle;},addEventListener(){}};
 const values={document:{createElement:()=>({style:{}}),body:{append(){}},documentElement:{get clientWidth(){return width;},style},addEventListener(){}},CSS:{supports:()=>true},matchMedia:()=>({matches:true}),screen:{orientation},window:{orientation:0},innerHeight:724,getComputedStyle:()=>({height:String(height),minHeight:String(safe)}),addEventListener:(name,callback)=>listeners.set(name,callback),ResizeObserver:class{observe(){}}};
 try{
  for(const [key,value]of Object.entries(values))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  const viewport=stableViewport(next=>changes.push({...next}),8),first={...viewport()};
  globalThis.innerHeight=844;listeners.get('resize')();await new Promise(resolve=>setTimeout(resolve,230));
  assert.deepEqual(viewport(),first);assert.equal(changes.length,1);assert.equal(viewport().range,5792);
  globalThis.innerHeight=724;listeners.get('resize')();await new Promise(resolve=>setTimeout(resolve,230));
  assert.deepEqual(viewport(),first);assert.equal(changes.length,1);
  width=844;height=390;safe=390;angle=90;listeners.get('orientationchange')();await new Promise(resolve=>setTimeout(resolve,230));
  assert.equal(changes.length,2);assert.equal(viewport().width,844);assert.equal(viewport().height,390);assert.equal(viewport().range,3120);
 }finally{for(const key of names){const descriptor=saved.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
