import test from 'node:test';
import assert from 'node:assert/strict';
import {averageSizePerTenMinutes} from '../public/output-size.js';

test('live average uses video duration, decimal MB and files larger than 4 GB',()=>{
  const job={status:'rendering',outputBytes:8_000_000_000,frames:144_000,fps:60,durationSeconds:5400,renderSeconds:18000};
  assert.deepEqual(averageSizePerTenMinutes(job),{megabytes:2000,estimated:true});
});
test('completed average uses the final MP4 size and exact duration',()=>{
  assert.deepEqual(averageSizePerTenMinutes({status:'completed',frames:1,outputBytes:1,result:{size:12_000_000_000,duration:7200}}),{megabytes:1000,estimated:false});
});
test('missing measurements and short or cancelled renders have no misleading average',()=>{
  const job={status:'rendering',outputBytes:50_000_000,frames:1800,fps:60};
  for(const change of [{outputBytes:undefined},{outputBytes:0},{outputBytes:-1},{frames:0},{frames:1799},{fps:0},{status:'cancelled'},{status:'starting'}])assert.equal(averageSizePerTenMinutes({...job,...change}),null);
  assert.equal(averageSizePerTenMinutes({status:'completed',result:{size:100,duration:0}}),null);
});
