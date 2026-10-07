import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryText} from '../src/guild-memory-text.js';
test('native story text switches approved content, follows fades and hides outside the story',()=>{
 const element=()=>({style:{},children:[],setAttribute(k,v){this[k]=v;},append(...items){this.children.push(...items);}});
 const doc={body:element(),createElement:element};
 const events=[{date:'2026-02-24',title:'相遇',body:'同行'},{date:'2026-04-03',title:'延续',body:'记忆'}];
 const view=createMemoryText(events,doc);view.update({eventIndex:0,eventOpacity:.5});
 assert.equal(view.root.style.opacity,'0.5');assert.equal(view.root.children[0].textContent,'2026.02.24');
 view.update({eventIndex:1,eventOpacity:1});assert.equal(view.root.children[1].textContent,'延续');assert.equal(view.root.children[2].textContent,'记忆');
 assert.equal(view.root.children.length,3);view.update({eventIndex:1},false);assert.equal(view.root.hidden,true);
 view.update({eventIndex:0});view.hide();assert.equal(view.root.hidden,true);
});
