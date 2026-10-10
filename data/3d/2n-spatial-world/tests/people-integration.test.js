import {limitManualHistoryEntry,manualHistoryEntryEnd} from '../src/manual-history-entry.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createPeopleRoute,resizeCourtyard,sampleCourtyard} from '../src/people-courtyard.js';
const fixture={leaders:[{id:'ending',name:'Leader',role:'Role',intro:'Intro'}],members:Array.from({length:15},(_,i)=>`Member ${i}`)};
const metrics={members:Array.from({length:15},()=>({minX:0,minY:0,maxX:4,maxY:1,glyphs:[[0,0,1,1]]}))};
import * as THREE from 'three';
import {Text} from 'troika-three-text';
import {createPeopleGallery} from '../src/people-gallery.js';
import {normalizeHistory} from '../src/guild-history-data.js';
const historyData=JSON.parse(readFileSync(new URL('../content/history.json',import.meta.url)));
import {createAutoplay} from '../src/autoplay.js';
import {lookbackPose} from '../src/lookback.js';
import {pose} from '../src/journey.js';
import {gardenPose} from '../src/garden-path.js';
import {oceanPose} from '../src/ocean-production.js';
import {junglePose} from '../src/jungle-production.js';
import {hellPose} from '../src/hell-production.js';
import {scrollProgress} from '../src/viewport.js';
import {createClosureView} from '../src/guild-closure-view.js';
import {createMonument} from '../src/monument.js';
import {historyTimeToDistance} from '../src/guild-history-route.js';
import {renderMemoryPreview} from '../src/guild-memory-preview.js';

const api=await import('../src/people-story.js').catch(()=>({}));
const requireApi=()=>assert.equal(typeof api.sampleStoryPose,'function','appended story scheduler is missing');
const camera=()=>new THREE.PerspectiveCamera(48,414/896,.2,2400);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('same physical scroll offset keeps every old camera shot and original 28-unit coordinate',()=>{
 requireApi();
 const oldCamera=camera(),nextCamera=camera();
 const samples=[
  [3,()=>pose(.5,oldCamera,true)],
  [10,()=>gardenPose(.5,oldCamera,true)],
  [17,()=>oceanPose(.5,oldCamera,true)],
  [22,()=>junglePose(.5,oldCamera)],
  [25,()=>hellPose(.25,oldCamera)],
  [41.2,()=>lookbackPose(.5,oldCamera)],
  [55.2,()=>lookbackPose(1,oldCamera)],
 ];
 for(const [units,oldPose] of samples){
  const progress=api.scrollToStory(units*896/(api.TOTAL_UNITS*896));
  near(progress,units/28);
  const old=oldPose(),next=api.sampleStoryPose(progress,nextCamera,true);
  for(const key of ['position','target'])old[key].forEach((v,i)=>near(next[key][i],v));
  assert.ok(nextCamera.quaternion.angleTo(oldCamera.quaternion)<1e-7);
 }
});

test('direct ending seek, reverse drag and portrait/landscape resize are absolute samples',()=>{
 requireApi();
 const cam=camera(),end=api.scrollToStory(1);
 near(api.chapterAt(end).peopleT,1);
 assert.equal(api.chapterAt(end).chapter,'next');
 const before=api.sampleStoryPose(api.scrollToStory(.88),cam,true);
 api.sampleStoryPose(end,cam,true);
 assert.deepEqual(api.sampleStoryPose(api.scrollToStory(.88),cam,true),before);
 const progress=api.scrollToStory(.88);
 const retained=api.storyToScroll(progress);
 cam.aspect=896/414;cam.updateProjectionMatrix();
 const landscape=api.sampleStoryPose(progress,cam,false);
 assert.ok(landscape.position.every(Number.isFinite));
 near(api.scrollToStory(retained),progress);
 cam.aspect=414/896;cam.updateProjectionMatrix();
 assert.deepEqual(api.sampleStoryPose(progress,cam,true),before);
 near(api.chapterAt(api.scrollToStory(55.2/api.TOTAL_UNITS)).peopleT,0);
 assert.equal(api.chapterAt(api.scrollToStory(55.2/api.TOTAL_UNITS)).chapter,'lookback');
});

test('paced autoplay preserves old speed and inverts every route reading window',()=>{
 const route=resizeCourtyard(createPeopleRoute(fixture),{width:414,height:896,glyphMetrics:metrics});
 assert.equal(typeof api.autoplayToScroll,'function');
 const duration=api.autoplayDuration(route),player=createAutoplay(duration);player.toggle(0,true);
 near(api.autoplayToScroll(player.advance(75),route)*api.TOTAL_UNITS,27.6);
 near(api.autoplayToScroll(player.advance(75),route)*api.TOTAL_UNITS,55.2);
 for(const w of route.windows){
  const seconds=(w.readEnd-w.readStart)*route.seconds;
  near(seconds,route.stations[w.stationIndex].readSeconds);
 }
 for(let i=0;i<=1000;i++)near(api.scrollToAutoplay(api.autoplayToScroll(i/1000,route),route),i/1000);
 near(api.autoplayToScroll(player.advance(route.seconds+36),route),api.NEXT_START_UNITS/api.TOTAL_UNITS);assert.equal(player.playing,true);
 near(api.autoplayToScroll(player.advance(16),route),1);assert.equal(player.playing,false);
});

test('semantic remap retains original member inside changed subwindow numbering',()=>{
 const base=createPeopleRoute(fixture),narrow=resizeCourtyard(base,{width:320,height:568}),wide=resizeCourtyard(base,{width:896,height:414,glyphMetrics:metrics});
 const i=narrow.stations.findIndex(s=>s.kind==='member'&&s.memberIndices.includes(6)),w=narrow.windows[i],t=w.readStart+(w.readEnd-w.readStart)*.37;
 const token=api.capturePeoplePosition(narrow,t);assert.ok(narrow.stations[i].memberIndices.includes(token.memberIndex));
 const next=api.restorePeoplePosition(wide,token),j=wide.windows.findIndex(w=>next>=w.start&&next<=w.end);
 assert.ok(wide.stations[j].memberIndices.includes(token.memberIndex));near((next-wide.windows[j].readStart)/(wide.windows[j].readEnd-wide.windows[j].readStart),.37);
});

// The GPU/text boundary is replaced; the actual entry script and scheduler run.
// This catches adding people to the original ready gate or seeking on retry.
function entry({constructionError=false,preparationError=false,reduced=false,late=false,galleryFactory,data=fixture,openingFailure=false,historyFailure=false,preview=false}={}){
 const events=new Map(),elements=new Map(),calls={distancePrepared:[],distanceCancelled:[],prepare:0,historyPrepare:0,next:[],captures:0,memory:[],people:[],companion:[],scroll:[],render:0,shots:[],routes:[]};
 const element=id=>{
  if(!elements.has(id))elements.set(id,{hidden:false,dataset:{},style:{},classList:{add(){},remove(){}},textContent:'',setAttribute(){},querySelector(){return element(id+'-span');},addEventListener(type,fn){events.set(id+':'+type,fn);}});
  return elements.get(id);
 };
 let complete;
 let frame,resize,oldReady=false,now=0,scrollY=0,currentReduced=reduced;
 const resource=()=>({group:new THREE.Group(),ready:true,prepare:async()=>{},update(){},resize(){},capture(){},install(){},prepared:7,displayPrepared:14});
 const companion=resource();companion.captureChain=()=>{calls.captures++;return [];};let openingAttempts=0;companion.prepare=async()=>{openingAttempts++;if(openingFailure&&openingAttempts===1)throw new Error('network interrupted');};companion.update=(...args)=>calls.companion.push(args);
 const gallery=galleryFactory?galleryFactory():resource();
 if(!galleryFactory){gallery.ready=false;gallery.error=null;
 gallery.glyphMetrics={members:[]};
 gallery.resize=(aspect,height=896)=>gallery.route=resizeCourtyard(gallery.route,{width:aspect*height,height,glyphMetrics:gallery.glyphMetrics});
 gallery.adoptRoute=route=>gallery.route=route||createPeopleRoute(data);
 gallery.prepare=gallery.retry=async()=>{calls.prepare++;if(late)await new Promise(resolve=>complete=resolve);if(preparationError){gallery.error=new Error('font timeout');throw gallery.error;}gallery.glyphMetrics=metrics;gallery.resize(gallery.route.viewport.width/gallery.route.viewport.height,gallery.route.viewport.height);gallery.ready=true;};
 gallery.update=(...args)=>calls.people.push(args);}
 const updateGallery=gallery.update;gallery.update=(...args)=>{calls.people.push(args);return updateGallery(...args);};
 const world={loading:{failures:{},counts:{}},groundStatus:'ready',prepare:async()=>{},update(){}};
 const view={width:414,height:896,range:api.TOTAL_UNITS*896};
 class Renderer{setClearColor(){}setPixelRatio(v){this.ratio=v;}getPixelRatio(){return this.ratio;}setSize(){}initTexture(){}render(scene,cam){calls.render++;calls.shots.push(cam.position.toArray());calls.routes.push(gallery.route);}setAnimationLoop(fn){frame=fn;}}
 const context={limitManualHistoryEntry,manualHistoryEntryEnd,renderMemoryPreview,createMemoryScene:()=>({group:new THREE.Group(),assetCount:14,setPreview(){},update(state,camera){calls.memory.push(state);camera.position.set(0,0,100);},shot:{target:[0,0,0]},install(){}}),URLSearchParams,location:{search:preview?'?historyPreview=1':''},...api,THREE:{...THREE,WebGLRenderer:Renderer},oceanPose,createAutoplay,junglePose,hellPose,lookbackPose,RETURN_START:27.2/28,RETURN_UNITS:28,STORY_UNITS:55.2,pose,gardenPose,scrollProgress,
  createNextView(){const view=resource();view.readingBounds=new THREE.Box3();view.update=state=>calls.next.push(state);return view;},createMonument,normalizeHistory,historyData,createHistoryView(){const h=resource();h.ready=false;h.readingBounds=new THREE.Box3();h.prepare=async()=>{calls.historyPrepare++;if(historyFailure&&calls.historyPrepare===1)throw new Error('font unavailable');h.ready=true;};return h;},createLighting(){},createRevealLight(){},atmosphere:()=>({update(){}}),createBiomes:()=>world,createCompanionship:()=>companion,createMapFlowers:resource,createRegionNames:resource,
  cancelPendingModelLoads(){},createLoadingIntro:()=>({update:({allReady})=>({locked:!allReady,speed:1})}),attachIntroInput(){},allBiomesReady:()=>oldReady,warmBiomeResources:async()=>{},prepareBiomePetals:async()=>{},
  createPeopleRoute,resizeCourtyard,peopleData:data,createPeopleGallery(data,route){if(!galleryFactory)gallery.route=route||createPeopleRoute(data);if(constructionError)throw new Error('invalid record');return gallery;},
  preparePeopleDistance(route){calls.distancePrepared.push(route);return ()=>calls.distanceCancelled.push(route);},
  stableViewport(fn){resize=fn;fn(view,null);return()=>view;},
  document:{body:{append(){}},createElement:tag=>({...element(`preview-${tag}`),append(){},querySelectorAll(){return[];}}),querySelector:s=>element(s.slice(1)),documentElement:{classList:{toggle(){}}},addEventListener(){}},
  matchMedia:query=>({get matches(){return query.includes('prefers-reduced-motion')&&currentReduced;}}),devicePixelRatio:1,performance:{now:()=>now},setTimeout:()=>1,clearTimeout(){},requestIdleCallback(){},window:{},
  addEventListener(type,fn){events.set(type,fn);},scrollTo({top}){scrollY=top;calls.scroll.push(top);},get scrollY(){return scrollY;},
 };
 vm.runInNewContext(readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),context);
 return {calls,gallery,elements,events,get openingAttempts(){return openingAttempts;},complete(){complete();},setReduced(value){currentReduced=value;},async settle(){await new Promise(resolve=>setImmediate(resolve));},tick(){now+=20;frame(now);},open(){oldReady=true;},seek(p){scrollY=p*view.range;},resize(){const old={...view};view.width=896;view.height=414;view.range=api.TOTAL_UNITS*414;resize(view,old);}};
}

test('ready memory petals can show preview despite an unrelated opening resource failure',async()=>{
 const app=entry({preview:true,openingFailure:true});await app.settle();app.tick();
 assert.equal(app.elements.get('world').dataset.biome,'memory-preview');
 assert.equal(app.elements.get('loading-status').hidden,true);
 assert.ok(app.calls.historyPrepare>0);
});

test('history survives orientation change, reversed seeks and five replays without rebuilding resources',async()=>{
 const app=entry({reduced:true});await app.settle();app.open();app.tick();
 app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});
 app.seek(api.storyToScroll((api.NEXT_START_UNITS-.05)/28,app.gallery.route));app.tick();
 assert.equal(app.elements.get('world').dataset.biome,'history');
 const t=Number(app.elements.get('world').dataset.historyProgress),prepared=app.calls.prepare;
 app.resize();app.tick();assert.equal(Number(app.elements.get('world').dataset.historyProgress),t);
 assert.equal(app.elements.get('replay').hidden,true);
 app.seek(1);app.tick();assert.equal(app.elements.get('replay').hidden,false);
 for(let i=0;i<5;i++){
  app.events.get('replay:click')({stopPropagation(){}});app.tick();
  assert.equal(app.elements.get('world').dataset.progress,'0.000');assert.equal(app.elements.get('replay').hidden,true);
  app.seek(api.storyToScroll((api.NEXT_START_UNITS-.05)/28,app.gallery.route));app.tick();assert.equal(app.elements.get('replay').hidden,true);
  app.seek(1);app.tick();assert.equal(app.elements.get('replay').hidden,false);
 }
 assert.equal(app.calls.prepare,prepared);
 app.seek(.85);app.tick();assert.equal(app.elements.get('replay').hidden,true);
 assert.equal(app.calls.companion.at(-1)[4],null);
});

test('history and replay remain available when people font preparation failed',async()=>{
 const app=entry({reduced:true,preparationError:true});await app.settle();app.open();app.tick();
 app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});app.seek(api.storyToScroll(api.NEXT_START_UNITS/28,app.gallery.route));app.tick();
 assert.equal(app.elements.get('world').dataset.biome,'history');
 assert.equal(app.elements.get('people-status').hidden,true);
 app.events.get('replay:click')({stopPropagation(){}});app.tick();assert.equal(app.elements.get('world').dataset.progress,'0.000');
});

test('people font failure cannot lock original opening; retry and resize do not reset camera progress',async()=>{
 requireApi();
 const app=entry({preparationError:true});
 assert.equal(app.calls.prepare,0,'font work competes with opening preparation');
 await app.settle();
 assert.equal(app.calls.prepare,1);
 app.open();app.tick();
 assert.equal(app.elements.get('world').dataset.loadingIntro,'false');
 app.events.get('pointerdown')({target:{closest:()=>false}});
 app.seek(api.storyToScroll((api.LEGACY_TOTAL_UNITS-1)/28,app.gallery.route));for(let i=0;i<180;i++)app.tick();
 assert.equal(app.elements.get('world').dataset.biome,'people');
 const before=Number(app.elements.get('world').dataset.progress);
 app.events.get('retry-people:click')({stopPropagation(){}});await app.settle();
 app.tick();near(Number(app.elements.get('world').dataset.progress),before);
 app.resize();app.tick();near(Number(app.elements.get('world').dataset.progress),before);
 app.events.get('autoplay:click')({stopPropagation(){}});app.tick();
 const playing=app.elements.get('autoplay').textContent;assert.equal(playing,'暂停播放');
 const scrollCalls=app.calls.scroll.length;
 app.events.get('retry-people:click')({stopPropagation(){}});await app.settle();assert.equal(app.calls.scroll.length,scrollCalls,'retry seeks during playback');
 app.events.get('pointerdown')({target:{closest:selector=>selector.includes('#retry-people')}});app.tick();
 assert.equal(app.elements.get('autoplay').textContent,'暂停播放','retry pointer unexpectedly takes story control');
 app.events.get('wheel')({type:'wheel',target:{closest:selector=>selector.includes('#retry-people')}});app.tick();
 assert.equal(app.elements.get('autoplay').textContent,'自动播放','wheel over status must immediately pause');
 app.events.get('autoplay:click')({stopPropagation(){}});app.tick();
 app.events.get('touchstart')({target:{closest:()=>false}});app.tick();
 assert.equal(app.elements.get('autoplay').textContent,'自动播放');
 app.gallery.ready=true;app.gallery.error=null;app.tick();
 assert.equal(app.elements.get('people-status').hidden,true,'late sync recovery leaves stale failure');
 assert.ok(app.calls.render>0);
});

test('invalid people content preserves the original scene and intro',async()=>{
 requireApi();
 const app=entry({constructionError:true});await app.settle();app.open();app.tick();
 assert.equal(app.elements.get('world').dataset.loadingIntro,'false');
 assert.ok(app.calls.render>0);
});

test('reduced motion reaches appended ending while gallery and companion receive no drift time',async()=>{
 requireApi();
 const app=entry({reduced:true});await app.settle();app.open();app.tick();
 assert.equal(app.elements.get('world').dataset.biome,'next');
 assert.equal(app.elements.get('world').dataset.peopleProgress,'1.000');
 const companion=app.calls.companion.at(-1),gallery=app.calls.people.at(-1);
 near(companion[0],1);near(companion[1],0);near(companion[2],1);
 near(gallery[0],1);near(gallery[2],0);assert.equal(gallery[3],true);
});

test('reduced-motion manual input reads forward and backward without smoothing or forced ending',async()=>{
 requireApi();
 const app=entry({reduced:true});await app.settle();app.open();app.tick();
 app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});
 for(const scroll of [.88,.4,.93]){
  app.seek(scroll);app.tick();
  near(Number(app.elements.get('world').dataset.progress),Number(api.scrollToStory(scroll,app.calls.routes.at(-1)).toFixed(3)));
  near(app.calls.companion.at(-1)[1],0);
 }
 const before=app.elements.get('world').dataset.progress;
 app.setReduced(false);app.tick();assert.equal(app.elements.get('world').dataset.progress,before);
 app.setReduced(true);app.tick();assert.equal(app.elements.get('world').dataset.progress,before);
});

test('turning reduced motion on mid-opening holds the current shot rather than jumping to ending',async()=>{
 requireApi();
 const app=entry();await app.settle();app.open();for(let i=0;i<50;i++)app.tick();
 const before=app.elements.get('world').dataset.progress;
 app.setReduced(true);app.tick();assert.equal(app.elements.get('world').dataset.progress,before);
 for(let i=0;i<50;i++)app.tick();assert.equal(app.elements.get('world').dataset.progress,before);
});

test('late glyph completion retains actual camera pose and shared route during people reading',async()=>{
 const app=entry({late:true,reduced:true});await app.settle();app.open();app.tick();
 app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});const readingScroll=api.storyToScroll((55.2+api.PEOPLE_UNITS*.9)/28,app.gallery.route);app.seek(readingScroll);app.tick();
 const pose=app.calls.shots.at(-1),route=app.calls.routes.at(-1);
 const physical=sampleCourtyard(route,api.chapterAt(api.scrollToStory(readingScroll,route)).peopleT,414/896);
 pose.forEach((v,i)=>near(v,physical.position[i]));
 app.complete();await app.settle();app.tick();
 assert.deepEqual(app.calls.shots.at(-1),pose);assert.equal(app.calls.routes.at(-1),route);
 assert.equal(app.calls.companion.at(-1)[3],route);
 app.resize();app.tick();assert.notEqual(app.calls.routes.at(-1),route);
 assert.equal(app.calls.companion.at(-1)[3],app.calls.routes.at(-1));
});

test('missing route preserves old ending for every requested people sample',()=>{
 const old=lookbackPose(1,camera());
 for(const t of [.1,.5,1])assert.deepEqual(api.sampleStoryPose((55.2+api.PEOPLE_UNITS*t)/28,camera(),true),old);
});

test('base route namespaces route-owned IDs while preserving original person IDs',()=>{
 const route=createPeopleRoute({leaders:[{id:'entry',name:'A',role:'R'},{id:'ending',name:'B',role:'R'},{id:'members-0',name:'C',role:'R'}],members:['M']});
 assert.equal(new Set(route.stations.map(s=>s.id)).size,route.stations.length);
 assert.deepEqual(route.stations.filter(s=>s.kind==='leader').map(s=>s.personId),['entry','ending','members-0']);
});

test('entry toggle and resize preserve reading member and active time mapping',async()=>{
 const app=entry({reduced:true});await app.settle();app.open();app.tick();
 app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});app.seek(.91);app.tick();
 const route=app.calls.routes.at(-1),t=Number(app.elements.get('world').dataset.peopleProgress);
 const token=api.capturePeoplePosition(route,t);
 const before=Number(app.elements.get('world').dataset.progress);
 app.events.get('autoplay:click')({stopPropagation(){}});app.tick();
 const step=Number(app.elements.get('world').dataset.progress)-before;assert.ok(step>=0&&step<.01);
 app.resize();app.tick();
 assert.equal(app.elements.get('autoplay').textContent,'暂停播放');
 const next=app.calls.routes.at(-1),actual=api.capturePeoplePosition(next,Number(app.elements.get('world').dataset.peopleProgress));
 assert.equal(actual.kind,token.kind);assert.equal(actual.sourceStationId,token.sourceStationId);
 if(token.kind==='member')assert.ok(next.stations.some(s=>s.memberIndices.includes(token.memberIndex)&&s.sourceStationId===actual.sourceStationId));
 for(const type of ['pointerdown','keydown']){
  app.events.get(type)({type,key:'PageDown',target:{closest:()=>false}});app.tick();
  assert.equal(app.elements.get('autoplay').textContent,'自动播放');
  app.events.get('autoplay:click')({stopPropagation(){}});app.tick();
 }
});

test('actual gallery late measurement publishes on the existing route before first ready frame',async()=>{
 const sync=Text.prototype.sync;let release,held=false;
 Text.prototype.sync=function(){
  const publish=()=>{this._textRenderInfo={glyphBounds:new Float32Array([0,-.5,4,.5])};this.dispatchEvent({type:'synccomplete'});};
  if(this.text==='Member 0'&&!held){held=true;release=publish;}else publish();
 };
 let app;
 try{
  app=entry({reduced:true,galleryFactory:()=>createPeopleGallery(fixture,createPeopleRoute(fixture))});
  await app.settle();assert.equal(typeof release,'function');app.open();app.tick();
  app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});
  const w=app.gallery.route.windows[app.gallery.route.stations.findIndex(s=>s.kind==='member'&&s.memberIndices.includes(6))];
  app.seek(api.storyToScroll((55.2+api.PEOPLE_UNITS*(w.readStart+w.readEnd)/2)/28,app.gallery.route));app.tick();
  const route=app.calls.routes.at(-1),pose=app.calls.shots.at(-1);
  release();await app.settle();assert.equal(app.gallery.ready,true);
  app.tick();assert.equal(app.gallery.route,route);assert.deepEqual(app.calls.shots.at(-1),pose);
  app.tick();await app.settle();app.tick();
  assert.equal(app.gallery.route,route);assert.deepEqual(app.calls.shots.at(-1),pose);
  const t=app.calls.companion.at(-1)[2],station=route.stations[route.windows.findIndex(w=>t>=w.start&&t<=w.end)];
  assert.equal(station.kind,'member');const visible=[];app.gallery.group.traverse(o=>{if(o instanceof Text&&o.visible&&o.userData.memberIndex!==undefined)visible.push(o.userData.memberIndex);});
  assert.ok(visible.includes(station.memberIndices[0]),'ready member pool never publishes on deferred route');
 }finally{app?.gallery.dispose();Text.prototype.sync=sync;}
});

test('invalid content route cannot prevent reduced old world return or start playback',async()=>{
 const app=entry({reduced:true,data:{leaders:[{id:'bad',name:'',role:'R'}],members:[]}});
 await app.settle();app.open();app.tick();
 assert.equal(app.elements.get('world').dataset.loadingIntro,'false');
 assert.equal(app.elements.get('autoplay').textContent,'自动播放');
 assert.deepEqual(app.calls.shots.at(-1),lookbackPose(1,camera()).position);
 assert.equal(app.calls.companion.at(-1)[3],null);
});

test('reverse courtyard seeks restore pristine historical camera orientation and up in every old chapter',()=>{
 const route=createPeopleRoute(fixture);
 for(const peopleT of [.5,1])for(const units of [3,10,17,22,25,41.2,55.2]){
  const shared=camera(),pristine=camera();
  api.sampleStoryPose((55.2+api.PEOPLE_UNITS*peopleT)/28,shared,true,route);
  const expected=api.sampleStoryPose(units/28,pristine,true);
  const actual=api.sampleStoryPose(units/28,shared,true,route);
  assert.deepEqual(actual,expected);assert.deepEqual(shared.up.toArray(),pristine.up.toArray());
  assert.ok(shared.quaternion.angleTo(pristine.quaternion)<1e-7,`old orientation changed at ${units}`);
 }
 const shared=camera(),pristine=camera();
 api.sampleStoryPose((55.2+9)/28,shared,true,route);
 assert.deepEqual(api.sampleStoryPose(api.LEGACY_TOTAL_UNITS/28,shared,true),lookbackPose(1,pristine));
 assert.deepEqual(shared.up.toArray(),pristine.up.toArray());
 assert.ok(shared.quaternion.angleTo(pristine.quaternion)<1e-7);
});

test('entry applies manual distance inverse, and play/pause retain the rendered shot',async()=>{
 const app=entry({reduced:true});await app.settle();app.open();app.tick();
 app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});
 for(const scroll of [.81,.91,.99,.87]){
  app.seek(scroll);app.tick();const route=app.calls.routes.at(-1);
  const expected=api.sampleStoryPose(api.scrollToStory(scroll,route),camera(),true,route);
  const displayed=['history','next'].includes(app.elements.get('world').dataset.biome)?[0,0,100]:expected.position;
  app.calls.shots.at(-1).forEach((v,i)=>near(v,displayed[i]));
  const t=app.calls.companion.at(-1)[2];
  app.events.get('autoplay:click')({stopPropagation(){}});app.tick();
  near(app.calls.companion.at(-1)[2],Math.min(1,t+.02/route.seconds));
  const playingPose=app.calls.shots.at(-1);
  app.events.get('wheel')({type:'wheel',target:{closest:()=>false}});app.tick();
  app.calls.shots.at(-1).forEach((v,i)=>near(v,playingPose[i]));
 }
});


test('entry prepares only adopted routes and cancels previous preparation through late readiness and resize',async()=>{
 const app=entry({reduced:true,late:true});await app.settle();
 assert.equal(app.calls.distancePrepared.at(-1),app.gallery.route);
 app.open();app.tick();app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});
 app.seek(.9);app.tick();const route=app.calls.routes.at(-1),count=app.calls.distancePrepared.length;
 app.complete();await app.settle();app.tick();
 assert.equal(app.calls.routes.at(-1),route);assert.equal(app.calls.distancePrepared.length,count);
 app.events.get('autoplay:click')({stopPropagation(){}});app.tick();
 app.resize();assert.equal(app.calls.distancePrepared.at(-1),app.gallery.route);
 assert.deepEqual(app.calls.distanceCancelled,app.calls.distancePrepared.slice(0,-1));
 app.tick();assert.equal(app.elements.get('autoplay').textContent,'暂停播放');
});


test('opening failure retry button starts a fresh settled preparation without reloading the page',async()=>{
 const app=entry({openingFailure:true});await app.settle();app.tick();
 const button=app.elements.get('retry-models');assert.equal(button.hidden,false);assert.equal(button.disabled,false);
 assert.equal(app.openingAttempts,1);assert.equal(app.calls.prepare,0);
 app.events.get('retry-models:click')({stopPropagation(){}});app.tick();assert.equal(button.disabled,true);
 await app.settle();app.open();app.tick();
 assert.equal(app.openingAttempts,2);assert.equal(button.hidden,true);
 assert.equal(app.elements.get('world').dataset.loadingIntro,'false');assert.equal(app.calls.prepare,1);
});


 test('history failure retries in place while preceding world remains unlocked',async()=>{
 const app=entry({reduced:true,historyFailure:true});await app.settle();app.open();app.tick();
 app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});app.seek(api.storyToScroll(api.NEXT_START_UNITS/28,app.gallery.route));app.tick();
 assert.equal(app.elements.get('world').dataset.loadingIntro,'false');assert.equal(app.elements.get('history-status').hidden,false);
 const before=app.elements.get('world').dataset.progress;app.events.get('retry-history:click')({stopPropagation(){}});await app.settle();app.tick();
 assert.equal(app.calls.historyPrepare,2);assert.equal(app.elements.get('history-status').hidden,true);assert.equal(app.elements.get('world').dataset.progress,before);
 app.events.get('autoplay:click')({stopPropagation(){}});app.events.get('replay:click')({stopPropagation(){}});app.tick();assert.equal(app.elements.get('autoplay').textContent,'自动播放');assert.equal(app.elements.get('world').dataset.progress,'0.000');
 });

 test('normal website entry uses all three memory stages after members without preview mode',async()=>{
 const app=entry({reduced:true});await app.settle();app.open();app.tick();
 app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});
 for(const [t,stage] of [[.14,0],[.52,1],[.86,2]]){
 app.seek((api.LEGACY_TOTAL_UNITS+6.4*historyTimeToDistance(t))/api.TOTAL_UNITS);app.tick();
 assert.equal(app.elements.get('world').dataset.biome,'history');
 assert.equal(app.calls.memory.at(-1).eventIndex,stage);assert.equal(app.calls.memory.at(-1).showText,true);
 }
 });

test('manual fling lands on first history text and clears the old far scroll target',async()=>{
 const app=entry();await app.settle();app.open();for(let i=0;i<3;i++)app.tick();app.events.get('touchstart')({type:'touchstart'});
 app.seek(api.storyToScroll((api.LEGACY_TOTAL_UNITS-.1)/28,app.gallery.route));for(let i=0;i<180;i++)app.tick();
 app.seek(1);for(let i=0;i<240;i++)app.tick();
 assert.equal(app.elements.get('world').dataset.biome,'history');const t=Number(app.elements.get('world').dataset.historyProgress);assert.ok(t>=.21&&t<=.24,`must land at first text instead of distant target (${t})`);
 app.seek(api.storyToScroll((api.LEGACY_TOTAL_UNITS+6.4*.55)/28,app.gallery.route));for(let i=0;i<160;i++)app.tick();assert.ok(Number(app.elements.get('world').dataset.historyProgress)>.5,'new manual scroll can continue after landing');
});

 test('next ending has only replay and hides autoplay, while replay restores normal controls',async()=>{
 const app=entry({reduced:true});app.open();await app.settle();app.tick();await app.settle();for(let i=0;i<10;i++)app.tick();
 assert.equal(app.elements.get('world').dataset.biome,'next');
 assert.equal(app.calls.memory.at(-1).nextT,1);assert.equal(app.calls.next.at(-1).nextOpacity,1);
 assert.equal(app.elements.get('replay').hidden,false);
 assert.equal(app.elements.get('autoplay').hidden,true);
 assert.equal(app.events.has('return-world:click'),false);
 const captures=app.calls.captures;for(let i=0;i<5;i++)app.tick();assert.equal(app.calls.captures,captures);
 app.events.get('replay:click')({stopPropagation(){}});app.tick();
 assert.equal(app.elements.get('world').dataset.progress,'0.000');assert.equal(app.elements.get('autoplay').hidden,false);
 });
 test('next ending replay resets progress and keeps controls out of the takeover gesture',async()=>{
 const app=entry({reduced:true});app.open();await app.settle();app.tick();await app.settle();app.tick();
 app.events.get('replay:click')({stopPropagation(){}});app.tick();assert.equal(app.calls.scroll.at(-1),0);assert.equal(app.elements.get('replay').hidden,true);
 });

 test('replay appears only after the final ending, and reverse scrolling hides it again',async()=>{
 const app=entry({reduced:true});await app.settle();app.open();app.tick();await app.settle();app.tick();
 app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});
 for(const nextT of [0,.5,14/16,15.99/16,1,.9,1]){
  app.seek(api.storyToScroll((api.NEXT_START_UNITS+3.2*nextT)/28,app.gallery.route));app.tick();
  assert.equal(app.elements.get('replay').hidden,nextT!==1,`replay visibility at nextT=${nextT}`);
 }
 });
