import test from 'node:test';
import assert from 'node:assert/strict';
import {estimatedOutputSize} from '../public/output-size.js';

test('total size scales the agreed 2 GB per 10 minutes to the full track',()=>{
  for(const [seconds,bytes] of [[285,950_000_000],[600,2_000_000_000],[5400,18_000_000_000],[43200,144_000_000_000]]){
    assert.deepEqual(estimatedOutputSize({status:'starting',durationSeconds:seconds}),{bytes,estimated:true});
  }
});
test('paused and running estimates use track length, independent of render speed or partial bytes',()=>{
  for(const status of ['rendering','paused','encoding'])assert.deepEqual(estimatedOutputSize({status,totalFrames:216000,fps:60,frames:2,outputBytes:1,renderSeconds:18000}),{bytes:12_000_000_000,estimated:true});
});
test('completed size is the actual MP4 size, not the planning estimate',()=>{
  assert.deepEqual(estimatedOutputSize({status:'completed',durationSeconds:7200,result:{size:12_000_000_000}}),{bytes:12_000_000_000,estimated:false});
});

test('invalid durations and stopped jobs have no misleading estimate',()=>{
  for(const durationSeconds of [undefined,0,-1,Infinity,NaN])assert.equal(estimatedOutputSize({status:'rendering',durationSeconds}),null);
  for(const status of ['cancelled','error','interrupted'])assert.equal(estimatedOutputSize({status,durationSeconds:600}),null);
  assert.equal(estimatedOutputSize({status:'completed',result:{size:0}}),null);
});
