import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';

const root=resolve('dist');
const html=await readFile(resolve(root,'index.html'),'utf8');
const css=await readFile(resolve(root,'style.css'),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"#]+)"/g),...html.matchAll(/url\('([^']+)'\)/g),...css.matchAll(/url\('([^']+)'\)/g)]
  .map(match=>match[1].split(/[?#]/,1)[0])
  .filter(Boolean);
for(const ref of new Set(refs)) {
  assert.ok(!/^(?:https?:)?\/\//.test(ref),'No external asset dependency: '+ref);
  assert.ok((await stat(resolve(root,ref))).isFile(),ref);
}
for(const file of ['app.js','leaders-data.js','motion.js','liquid.js','v35-runtime.js','profile.js','perf.js','mobile-story.js','touch-timeline.js','liquid-renderers.js']) execFileSync(process.execPath,['--check',resolve(root,file)]);
assert.equal((html.match(/class="panel biome"/g)||[]).length,5);
assert.equal((html.match(/class="leader-card"/g)||[]).length,5);
const leaderContext={window:{}};
runInNewContext(await readFile(resolve(root,'leaders-data.js'),'utf8'),leaderContext);
const leaderData=leaderContext.window.TwoNLeadersContent;
assert.ok(leaderData?.intro?.title && leaderData.intro.eyebrow && leaderData.intro.lines?.length);
assert.ok(Array.isArray(leaderData.people) && leaderData.people.length>0);
for(const person of leaderData.people) {
  for(const field of ['number','role','roleEn','name','description']) assert.ok(person[field],`Leader ${field}`);
}
assert.equal(new Set(leaderData.people.map(person=>person.number)).size,leaderData.people.length);
assert.equal((html.match(/class="panel /g)||[]).length,10);
for(const name of ['CNFlyDream','sschara','awdc','flowerwsr','20180333']) assert.ok(html.includes(name));
const scripts=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(match=>match[1]);
const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]);
assert.deepEqual(scripts.map(ref=>ref.split('?')[0]),[
  'profile.js','perf.js','motion.js','v35-runtime.js','liquid.js',
  'mobile-story.js','touch-timeline.js','leaders-data.js','app.js'
],'Runtime script order');
assert.deepEqual(styles.map(ref=>ref.split('?')[0]),[
  'style.css','v35.css','mobile.css','polish.css','visual-impact.css'
],'CSS cascade order');
for(const ref of [...scripts,...styles]) {
  assert.equal(new URLSearchParams(ref.split('?')[1]?.replaceAll('&amp;','&')).get('v'),'1.0.0',`Release cache version: ${ref}`);
}
assert.match(html,/<meta name="viewport" content="[^"]*viewport-fit=cover"/);
for(const name of ['description','theme-color']) assert.ok(html.includes(`<meta name="${name}"`));
for(const name of ['og:type','og:title','og:description','og:url','og:image']) assert.ok(html.includes(`<meta property="${name}"`));
assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image"'));
assert.ok(html.includes('<link rel="icon"'));
assert.ok(html.includes('preload="none"'));
assert.ok(html.includes('setTimeout(window.twoNFallback, 12000)'));
console.log('Static checks passed: local assets, JS syntax, chapters/leaders, v1.0.0 assets and runtime order, lazy video and fallback.');
