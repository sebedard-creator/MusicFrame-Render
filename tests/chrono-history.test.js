import test from 'node:test';
import assert from 'node:assert/strict';
import { PhotoChrono } from '../public/photo-chrono.js';

test('slit scan samples a bounded audio history and cannot cross photo cuts',()=>{
  const effect=new PhotoChrono(),config={imageSeconds:12,intensity:1,chronoDelay:.5};
  let samples=[];
  const frameAt=time=>{samples.push(time);return [time%1,.2,.3,.4];};
  try{
    effect.configure(config,2,frameAt);
    assert.equal(samples.length,64);assert.equal(samples[0],2);assert.equal(samples[63],1.5);
    const first=effect.values.slice();
    samples=[];effect.configure(config,12.1,frameAt);
    assert.ok(samples.every(time=>time>=12&&time<=12.1));assert.equal(samples[63],12);
    samples=[];effect.configure(config,2,frameAt);assert.deepEqual(effect.values,first);
    samples=[];effect.configure({...config,chronoDelay:0},1,frameAt);
    assert.ok(samples.every(time=>time===1));
    samples=[];effect.configure(config,.1,frameAt);assert.equal(samples[63],0);
  }finally{effect.dispose();}
});
