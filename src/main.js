import {limitManualHistoryEntry,manualHistoryEntryEnd} from './manual-history-entry.js';
import {cancelPendingModelLoads} from './petal-loader.js';
import {preparePeopleDistance} from './people-distance.js';
import {createPeopleRoute} from './people-courtyard.js';
import {createAutoplay} from './autoplay.js';
import {createMapFlowers} from './map-flowers.js';
import {RETURN_START,STORY_UNITS} from './lookback.js';
import {TOTAL_UNITS,LEGACY_TOTAL_UNITS,PEOPLE_UNITS,autoplayDuration,autoplayToScroll,scrollToAutoplay,capturePeoplePosition,restorePeoplePosition,scrollToStory,storyToScroll,chapterAt,sampleStoryPose} from './people-story.js';
import {createPeopleGallery} from './people-gallery.js';
import peopleData from '../content/people.json';
import {createHistoryView} from './guild-history-view.js';
import {createMemoryScene} from './guild-memory-scene.js';
import {renderMemoryPreview} from './guild-memory-preview.js';
import {normalizeHistory} from './guild-history-data.js';
import historyData from '../content/history.json';
import {createCompanionship} from './companionship.js';
import {createLoadingIntro,attachIntroInput,allBiomesReady} from './loading-intro.js';
import {warmBiomeResources} from './biome-warmup.js';
import {createRegionNames} from './region-names.js';
import * as THREE from 'three';
import './style.css';
import { createMonument, createLighting } from './monument.js';
import { atmosphere } from './atmosphere.js';
import {stableViewport,scrollProgress} from './viewport.js';
import {createRevealLight} from './reveal-light.js';
import {createBiomes,prepareBiomePetals} from './biomes.js';

const HERO_END=6/28, DESERT_END=14/28, OCEAN_END=20/28, JUNGLE_END=24/28;

const canvas = document.querySelector('#world');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
catch { document.querySelector('#fallback').hidden = false; }
if (renderer) {
  renderer.setClearColor(0x060709);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const openingMonument=createMonument();openingMonument.name='opening-monument';scene.add(openingMonument);
  const historyRecords=normalizeHistory(historyData);
  const memoryPreview=new URLSearchParams(location.search).get('historyPreview')==='1';
  const memory=createMemoryScene({mobile:matchMedia('(max-width: 700px)').matches});
  if(memory)scene.add(memory.group);
  let memoryIndex=0,memoryText=true;
  const memoryControls=memoryPreview?document.createElement('nav'):null;
  if(memoryControls){
    memoryControls.className='memory-preview-controls';memoryControls.setAttribute('aria-label','工会故事构图预览');memoryControls.hidden=true;
    const label=document.createElement('span');label.textContent='滑动阅读';memoryControls.append(label);
    ['相遇','延续','繁盛','文案'].forEach((title,index)=>{const button=document.createElement('button');button.type='button';button.textContent=title;button.setAttribute('aria-pressed',String(index===3?memoryText:index===0));button.addEventListener('click',event=>{event.stopPropagation();if(index===3){memoryText=!memoryText;button.setAttribute('aria-pressed',String(memoryText));}else{memoryIndex=index;scrollTo({top:[.14,.52,.86][index]*viewport().range,behavior:'smooth'});[...memoryControls.querySelectorAll('button')].slice(0,3).forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}});memoryControls.append(button);});
    document.body.append(memoryControls);
  }
  let history=null,historyPreparing=false,historyError=null;
  if(!historyRecords.errors.length){history=createHistoryView(historyRecords.events);scene.add(history.group);}else historyError=new Error(historyRecords.errors.join(' '));
  async function prepareHistory(){
    if(!history||historyPreparing)return;historyPreparing=true;historyError=null;
    try{await history.prepare();}catch(error){historyError=error;}finally{historyPreparing=false;}
  }
  createLighting(scene, renderer);
  createRevealLight(scene);
  const atmosphereRig=atmosphere(scene, matchMedia('(max-width: 700px)').matches);
  const world=createBiomes(scene,matchMedia('(max-width: 700px)').matches);
  const companionship=createCompanionship(scene);scene.add(companionship.group);
  const flowers=createMapFlowers();scene.add(flowers.group);
  world.onAssetPrepared=(mesh,kind,name)=>{if(mesh.material.map)renderer.initTexture(mesh.material.map);companionship.install(mesh,kind,name);};
  let gpuReady=false,gpuError='',warming=false,preparingAll=false;
  let people=null,peopleRoute=null,peoplePreparing=false,peopleError=null,peopleStarted=false;
  let measuredRoutePending=false,metricsAdopted=false;
  let cancelDistancePreparation=()=>{};
  // Gallery validation and font sync are isolated from all prior scene resources.
  async function preparePeople(){
    if(peoplePreparing)return;
    peopleStarted=true;peoplePreparing=true;peopleError=null;
    try{
      if(!people){
        const base=createPeopleRoute(peopleData);
        people=createPeopleGallery(peopleData,base);scene.add(people.group);
        const view=viewport();adoptPeopleRoute(people.resize(camera.aspect,view.height));
      }
      await people.retry();
      adoptReadyMetrics();
    }catch(error){peopleError=error;}finally{peoplePreparing=false;}
  }
  async function prepareEverything(){
    if(preparingAll)return;
    preparingAll=true;gpuReady=false;gpuError='';world.prepare();
    try{
    const initMaps=mesh=>{for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])for(const value of Object.values(material))if(value?.isTexture)renderer.initTexture(value);};
    // Settle every branch before enabling a retry: never overlap preparation runs.
    const results=await Promise.allSettled([prepareBiomePetals(world),companionship.prepare(initMaps,(source,kind,name)=>memory?.install(source,kind,name)),flowers.prepare(initMaps)].map(job=>job.catch(error=>{cancelPendingModelLoads();throw error;})));
    const rejected=results.find(result=>result.status==='rejected');if(rejected)throw rejected.reason;
    if(Object.values(world.loading.failures).some(list=>list.length))return;
    const groundDeadline=performance.now()+15000;
    while(world.groundStatus!=='ready'){if(world.groundStatus==='error')throw new Error('地图准备失败，请重试');if(performance.now()>groundDeadline)throw new Error('地图准备超时，请重试');await new Promise(resolve=>setTimeout(resolve,16));}
    companionship.capture();
    warming=true;
    await warmBiomeResources(renderer,scene);gpuReady=true;
    }catch(error){gpuError=error.message;}finally{
      warming=false;preparingAll=false;
      // Do not compete with the old opening's model decode and GPU preparation.
      if(gpuReady&&!peopleStarted)void preparePeople();
      if(gpuReady)void prepareHistory();
    }
  }
  void prepareEverything();
  if(typeof requestIdleCallback==='function')requestIdleCallback(()=>world.prepare(),{timeout:500});
  else setTimeout(()=>world.prepare(),80);
  const camera = new THREE.PerspectiveCamera(48, 1, .2, 2400);
  const names=createRegionNames();scene.add(names.group);
  camera.position.set(0, 5, 145); camera.lookAt(5, 5, 0);
  const arrival = document.querySelector('#arrival');
  const loading=document.querySelector('#loading-status'),retry=document.querySelector('#retry-models');
  const peopleStatus=document.querySelector('#people-status'),peopleRetry=document.querySelector('#retry-people');
  const historyStatus=document.querySelector('#history-status'),historyRetry=document.querySelector('#retry-history');
  historyRetry.addEventListener('click',event=>{event.stopPropagation();void prepareHistory();});
  peopleRetry.addEventListener('click',event=>{event.stopPropagation();void preparePeople();});
  const autoplayButton=document.querySelector('#autoplay');
  const replayButton=document.querySelector('#replay');
  let player=createAutoplay(autoplayDuration(peopleRoute));
  let dimTimer,buttonShown=false;
  function revealButton(){clearTimeout(dimTimer);autoplayButton.classList.remove('dimmed');dimTimer=setTimeout(()=>autoplayButton.classList.add('dimmed'),1400);}
  retry.addEventListener('click',event=>{event.stopPropagation();void prepareEverything();});
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const startAtEnding=reduced.matches;
  const intro=createLoadingIntro();
  let introLocked=true;
  let lastLoadingText='',lastPeopleText='';
  let progress = 0, previous = performance.now(), auto = 0, controlled = false;
  function adoptPeopleRoute(next){
    const playing=player.playing;
    cancelDistancePreparation();
    peopleRoute=next;people.adoptRoute(next);
    cancelDistancePreparation=preparePeopleDistance(next);
    player=createAutoplay(autoplayDuration(next));
    if(playing)player.toggle(scrollToAutoplay(storyToScroll(progress,peopleRoute),next),true);
  }
  function adoptReadyMetrics(){
    if(!people?.ready||metricsAdopted)return;
    if(measuredRoutePending&&chapterAt(progress).peopleT>0)return;
    // Async glyph completion cannot replace geometry under a people camera.
    if(chapterAt(progress).peopleT>0){measuredRoutePending=true;people.adoptRoute(peopleRoute);return;}
    const view=viewport();adoptPeopleRoute(people.resize(camera.aspect,view.height));
    metricsAdopted=true;measuredRoutePending=false;
  }
  const viewport=stableViewport((next,old)=>{
    const retained=old?scrollProgress(scrollY,old.range):0;
    renderer.setSize(next.width,next.height);
    camera.aspect=next.width/next.height;camera.updateProjectionMatrix();
    companionship.resize(camera.aspect);
    history?.resize(next);
    if(gpuReady)void prepareHistory();
    let nextScroll=retained;
    if(people){
      const currentChapter=chapterAt(progress);
      const token=old&&currentChapter.chapter==='people'?capturePeoplePosition(peopleRoute,currentChapter.peopleT):null;
      const nextRoute=people.resize(camera.aspect,next.height);
      if(token){progress=(STORY_UNITS+PEOPLE_UNITS*restorePeoplePosition(nextRoute,token))/28;nextScroll=storyToScroll(progress,nextRoute);}
      adoptPeopleRoute(nextRoute);
      if(people.ready){metricsAdopted=true;measuredRoutePending=false;}
    }
    if(old&&controlled)scrollTo({top:nextScroll*next.range,behavior:'instant'});
  },memoryPreview?6.4:TOTAL_UNITS);
  const takeControl = event => {
    if(introLocked)return;
    if(memoryPreview){controlled=true;player.pause();return;}
    if(event?.target?.closest?.('#autoplay')||event?.target?.closest?.('#replay'))return;
    if(event?.type!=='wheel'&&(event?.target?.closest?.('#retry-people')||event?.target?.closest?.('#retry-history')))return;
    if(event?.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
    player.pause();
    if (!controlled) {
      // Hand off at the current shot, never jump back to the start on first touch.
      scrollTo({top:storyToScroll(progress,peopleRoute)*viewport().range,behavior:'instant'});
      controlled = true;
    }
  };
  addEventListener('wheel', takeControl, {passive:true});
  addEventListener('touchstart', takeControl, {passive:true});
  addEventListener('pointerdown', takeControl, {passive:true});
  addEventListener('keydown', takeControl);
  autoplayButton.addEventListener('click',event=>{
    event.stopPropagation();if(introLocked)return;
    player.toggle(scrollToAutoplay(storyToScroll(progress,peopleRoute),peopleRoute),true);controlled=true;
    scrollTo({top:storyToScroll(progress,peopleRoute)*viewport().range,behavior:'instant'});
    revealButton();
  });
  replayButton.addEventListener('click',event=>{
    event.stopPropagation();if(introLocked)return;
    player.pause();progress=0;auto=0;controlled=true;
    scrollTo({top:0,behavior:'instant'});replayButton.hidden=true;
  });
  attachIntroInput(window,()=>introLocked,()=>{});
  function frame(now) {
    const dt = Math.min(.05, (now-previous)/1000); previous=now;
    const view=viewport();
    const failed=!!gpuError||Object.values(world.loading.failures).some(list=>list.length);
    const memoryReady=memoryPreview&&memory.assetCount===14;
    const introState=intro.update({allReady:allBiomesReady(world)&&gpuReady&&companionship.ready&&flowers.ready,reduced:reduced.matches});introLocked=introState.locked&&!memoryReady;
    if(memoryReady&&history&&!history.ready&&!historyPreparing&&!historyError)void prepareHistory();
    document.documentElement.classList.toggle('loading-intro',introLocked);
    const wasPlaying=player.playing;
    if(wasPlaying){
      progress=scrollToStory(autoplayToScroll(player.advance(dt),peopleRoute),peopleRoute);
      scrollTo({top:storyToScroll(progress,peopleRoute)*view.range,behavior:'instant'});
    }
    const scroll = scrollProgress(scrollY,view.range);
    if(!controlled&&!reduced.matches) auto = Math.min(HERO_END*(introLocked?.92:1),auto+dt*HERO_END/30*introState.speed);
    // Initial reduced-motion landing is not a permanent scroll lock. Preference
    // changes hold the current shot; manual reduced-motion reads sample directly.
    const initialEnding=startAtEnding&&!introLocked&&!controlled;
    const requested=initialEnding?(peopleRoute?1:LEGACY_TOTAL_UNITS/TOTAL_UNITS):controlled?scroll:reduced.matches?progress:auto;
    const target=controlled||initialEnding?scrollToStory(requested,peopleRoute):requested;
    if(!wasPlaying){
      if(reduced.matches)progress=target;
      else if(controlled||initialEnding){
        // Damp the physical distance coordinate, then sample its inverse. Time
        // damping would reintroduce the hold/transfer sensitivity cliff.
        const current=storyToScroll(progress,peopleRoute);
        const candidate=scrollToStory(current+(requested-current)*(1-Math.exp(-dt*5)),peopleRoute);
        const before=progress;
        progress=initialEnding?candidate:limitManualHistoryEntry(progress,candidate,dt);
        if(!initialEnding&&before<manualHistoryEntryEnd&&progress>=manualHistoryEntryEnd&&target>manualHistoryEntryEnd){
          // Discard the fling overshoot at the first readable story event.
          scrollTo({top:storyToScroll(progress,peopleRoute)*view.range,behavior:'instant'});
        }
      } else progress += (target-progress)*(1-Math.exp(-dt*5));
    }
    if(people?.ready&&(!metricsAdopted||measuredRoutePending))adoptReadyMetrics();
    const chapter=chapterAt(progress),heroProgress=chapter.heroT,worldProgress=chapter.worldT;
    const portrait=view.width<view.height;
    const returnProgress=chapter.returnT,peopleProgress=chapter.peopleT;
    const state=sampleStoryPose(progress,camera,portrait,peopleRoute);
    const closing=chapter.chapter==='history';
    if(history){history.group.visible=false;if(closing)history.update(state,camera,view);}
    if(gpuReady&&history&&!history.ready&&!historyPreparing&&!historyError)void prepareHistory();
    atmosphereRig.update(camera,heroProgress);
    if(heroProgress>.72)world.prepare();
    world.update(camera,worldProgress);
    const departureCamera=closing?camera.clone():null;
    if(departureCamera){departureCamera.position.fromArray(state.entryPose.position);departureCamera.up.fromArray(state.entryPose.up);departureCamera.lookAt(...state.entryPose.target);departureCamera.updateMatrixWorld();}
    companionship.update(returnProgress,reduced.matches?0:dt,peopleProgress,peopleRoute,closing?{camera:departureCamera}:null);
    const entryKey=closing?JSON.stringify([state.entryPose.position,state.entryPose.target,camera.aspect]):null;
    if(!closing)memory.group.userData.entryCaptured=null;
    if(closing&&memory.group.userData.entryCaptured!==entryKey){companionship.captureChain(departureCamera);memory.captureEntry?.(companionship.group,departureCamera);memory.group.userData.entryCaptured=entryKey;}
    people?.update(peopleProgress,camera,reduced.matches?0:dt,reduced.matches);
    if(closing&&people){
      people.group.traverse(object=>{
        const materials=Array.isArray(object.material)?object.material:[object.material];
        for(const material of materials){if(!material)continue;if(material.uniforms?.opacity)material.uniforms.opacity.value*=state.peopleOpacity;else material.opacity*=state.peopleOpacity;}
      });
      people.group.visible=people.group.visible&&state.peopleOpacity>0;
    }
    replayButton.hidden=introLocked||!closing||!state.replayVisible;
    flowers.group.visible=heroProgress>=.98;
    flowers.update(camera,reduced.matches?0:dt);
    const readingPixelRatio=Math.min(devicePixelRatio,(memoryPreview||closing)?2.5:returnProgress>.95?2:1.5);
    if(renderer.getPixelRatio()!==readingPixelRatio)renderer.setPixelRatio(readingPixelRatio);
    if(returnProgress>0&&scene.fog){const blend=THREE.MathUtils.smoothstep(returnProgress,0,.12);scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,.0015,blend);}
    names.update(progress>HERO_END&&progress<RETURN_START?camera:-1);
    const text = THREE.MathUtils.smoothstep(heroProgress,.93,.995)*(1-THREE.MathUtils.smoothstep(progress,HERO_END+.025*DESERT_END,HERO_END+.09*DESERT_END));
    arrival.style.opacity=text;arrival.style.transform=`translateY(calc(-100% + ${(1-text)*18}px))`;
    arrival.setAttribute('aria-hidden',String(text<.5));
    canvas.dataset.progress=progress.toFixed(3);
    canvas.dataset.camera=JSON.stringify(state.position);
    canvas.dataset.biome=closing?'history':chapter.chapter==='people'?'people':progress>=RETURN_START?'lookback':progress>JUNGLE_END?'hell':progress>OCEAN_END?'jungle':progress>DESERT_END?'ocean':worldProgress<.76?'garden':'desert-threshold';
    canvas.dataset.returnProgress=returnProgress.toFixed(3);
    canvas.dataset.peopleProgress=peopleProgress.toFixed(3);
    canvas.dataset.historyProgress=chapter.historyT.toFixed(3);
    canvas.dataset.hellPetals=world.hellPetalStatus;
    canvas.dataset.loadingIntro=String(introLocked);canvas.dataset.junglePetals=world.junglePetalStatus;
    canvas.dataset.gardenAssets=world.gardenStatus;
    canvas.dataset.oceanPetals=world.oceanPetalStatus;
    canvas.dataset.desertPetals=world.desertPetalStatus;
    const counts=world.loading.counts;
    loading.hidden=!introLocked;
    autoplayButton.hidden=introLocked;
    autoplayButton.setAttribute('aria-pressed',String(player.playing));
    autoplayButton.textContent=player.playing?'暂停播放':'自动播放';
    if(!introLocked&&!buttonShown){buttonShown=true;revealButton();}
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    const loadingText=failed?(preparingAll?'正在完成剩余资源，随后可重试':`资源准备失败，可重试${gpuError?' · '+gpuError:''}`):warming?'正在预热完整画面，稍候即可滑动':`正在准备五境花瓣 · ${total}/23 · 高清花瓣 ${companionship.displayPrepared}/14 · 花朵 ${flowers.prepared}/7`;
    if(loadingText!==lastLoadingText){loading.querySelector('span').textContent=loadingText;lastLoadingText=loadingText;}
    retry.hidden=!failed;retry.disabled=preparingAll;retry.textContent=preparingAll?'准备中…':'重新加载';
    const galleryReady=!!people?.ready;
    // Read the gallery getter every frame: late sync can clear a prior timeout.
    const galleryFailed=!galleryReady&&!!(people?.error||peopleError);
    peopleStatus.hidden=introLocked||closing||progress<(STORY_UNITS-2)/28||galleryReady;
    const peopleText=galleryFailed?'人物文字暂未准备好，可继续滑动或重试':'正在准备人物文字，可继续滑动';
    if(peopleText!==lastPeopleText){peopleStatus.querySelector('span').textContent=peopleText;lastPeopleText=peopleText;}
    peopleRetry.hidden=!galleryFailed;peopleRetry.disabled=peoplePreparing;
    historyStatus.hidden=introLocked||!closing||!!history?.ready;
    historyStatus.querySelector('span').textContent=historyError?'历史文字暂未准备好，可重试':'正在准备公会历史，可继续滑动';
    historyRetry.hidden=!historyError;historyRetry.disabled=historyPreparing;
    if(memoryPreview&&!introLocked){
      memoryControls.hidden=false;autoplayButton.hidden=true;replayButton.hidden=true;arrival.style.opacity=0;peopleStatus.hidden=true;
      historyStatus.hidden=!memoryText||!!history?.ready;
      renderMemoryPreview({scene,renderer,camera,memory,history,index:memoryIndex,progress:scrollProgress(scrollY,view.range),viewport:view,dt,reducedMotion:reduced.matches,showText:memoryText});
      canvas.dataset.biome='memory-preview';canvas.dataset.memoryStage=String(memoryIndex);
    }else if(closing&&memory.assetCount===14){
      renderMemoryPreview({scene,renderer,camera,memory,history,entryPose:state.entryPose,departureGroups:[companionship.group],progress:chapter.historyT,viewport:view,dt,reducedMotion:reduced.matches,showText:true,updateEnvironment:renderCamera=>{atmosphereRig.update(renderCamera,heroProgress);world.update(renderCamera,worldProgress);if(scene.fog)scene.fog.density=.0015;}});
    }else renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => {previous=performance.now();renderer.setAnimationLoop(document.hidden ? null : frame);});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);});
  canvas.addEventListener('webglcontextrestored',()=>{previous=performance.now();renderer.setAnimationLoop(frame);});
}
