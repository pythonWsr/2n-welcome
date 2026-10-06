import test from 'node:test';
import assert from 'node:assert/strict';
import {stableViewport,scrollProgress} from '../src/viewport.js';

test('toolbar resize does not resize stage; real dimensions and orientation do',()=>{
  const events={},css={height:'844px',minHeight:'724px'},vars={};let pending,updates=0;
  const saved=new Map();
  const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
  try {
    set('document',{documentElement:{clientWidth:390,style:{setProperty:(k,v)=>vars[k]=v}},body:{append(){}},createElement:()=>({style:{}}),addEventListener(){}});
    set('CSS',{supports:()=>true});set('matchMedia',()=>({matches:true}));
    set('screen',{orientation:{angle:0,addEventListener(){}}});set('window',{});
    set('innerHeight',724);set('getComputedStyle',()=>css);
    set('addEventListener',(name,cb)=>events[name]=cb);
    set('setTimeout',cb=>{pending=cb;return 1;});set('clearTimeout',()=>{});
    set('ResizeObserver',class{observe(){}});
    const view=stableViewport(()=>updates++),initial=view();
    for(const h of [740,780,810,844,800,724]){
      globalThis.innerHeight=h;events.resize();pending();
      assert.equal(view(),initial);assert.equal(updates,1);
      assert.equal(scrollProgress(2172,view().range),.5);
    }
    assert.equal(vars['--scene-height'],'844px');
    // Real height-only window change must not be mistaken for browser chrome.
    css.height='700px';css.minHeight='580px';events.resize();pending();assert.equal(updates,2);
    document.documentElement.clientWidth=844;screen.orientation.angle=90;
    css.height='390px';css.minHeight='340px';events.orientationchange();pending();assert.equal(updates,3);
    assert.equal(view().width,844);assert.equal(view().height,390);
    assert.equal(scrollProgress(-100,view().range),0);assert.equal(scrollProgress(99999,view().range),1);
  } finally {for(const [k,d] of saved){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
