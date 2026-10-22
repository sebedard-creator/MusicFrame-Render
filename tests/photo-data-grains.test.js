import test from 'node:test';
import assert from 'node:assert/strict';
import { dataGrainLayout,dataGrainDrive } from '../public/data-grains.js';
import { presets,photoModelIds } from '../public/presets.js';
import { validateConfig } from '../server/config.js';

test('data microfragments stay within their photo cells and rebuild deterministically',()=>{
 const layout=dataGrainLayout(480);assert.equal(layout.count,129600);
 for(let i=0;i<layout.count;i++){
  assert.equal(Math.floor(layout.homes[i*2]*480),i%480);
  assert.equal(Math.floor(layout.homes[i*2+1]*layout.rows),Math.floor(i/480));
  assert.ok(layout.seeds[i]>=0&&layout.seeds[i]<=1);
 }
 assert.deepEqual(dataGrainLayout(160),dataGrainLayout(160));
});

test('data grain jets respond to causal attacks and disable completely with reaction zero',()=>{
 const c=presets.dataGrains,track={events:[{time:1,strength:1,pattern:3}]},silent=[0,0,0,0];
 assert.equal(dataGrainDrive(c,.999,silent,track).force,0);
 const hit=dataGrainDrive(c,1,silent,track);assert.equal(hit.attack,1);assert.ok(hit.force>.8);
 assert.equal(dataGrainDrive(c,1.6,silent,track).force,0);
 assert.equal(dataGrainDrive({...c,dataReaction:0},1,[1,1,1,1],track).force,0);
 assert.equal(dataGrainDrive({...c,intensity:0},1,[1,1,1,1],track).force,0);
 dataGrainDrive(c,70,silent,track);assert.deepEqual(dataGrainDrive(c,1,silent,track),hit);
 assert.equal(photoModelIds[28],'dataGrains');
 assert.equal(validateConfig({...c,preset:'dataGrains',glowPhoto:29}).dataDensity,800);
 for(const invalid of [{dataDensity:159},{dataDensity:801},{dataDensity:480.5},{dataSize:0},{dataFlow:2},{dataReturn:0},{dataReaction:NaN}])assert.throws(()=>validateConfig({preset:'dataGrains',...invalid}));
});
