import test from 'node:test';
import assert from 'node:assert/strict';
import { spectralRanges, sampleSpectrum } from '../public/spectrum.js';
import {adaptiveMode,balancedMode} from '../public/audio-response.js';

test('spectral sampling preserves frequency position, silence and seek order',()=>{
  const ranges=spectralRanges();assert.equal(ranges.length,64);
  ranges.forEach(([lo,hi],i)=>{assert.ok(lo>=1&&hi>lo&&hi<=1024);if(i)assert.ok(lo>=ranges[i-1][0]);});
  const first=Array(64).fill(0),last=Array(64).fill(0);first[10]=1;last[40]=1;
  const analysis={fps:2,spectrum:{frames:[first,last]}};
  const halfway=sampleSpectrum(analysis,.25);
  assert.equal(halfway[10],.5);assert.equal(halfway[40],.5);assert.equal(halfway[20],0);
  sampleSpectrum(analysis,500);
  assert.deepEqual(sampleSpectrum(analysis,.25),halfway);
  assert.equal(sampleSpectrum(analysis,-1,3)[10],1.5);
  assert.deepEqual([...sampleSpectrum({},20)],Array(64).fill(0));
  const legacy=sampleSpectrum({fps:1,frames:[[0,.1,.2,.3]]},0);
  assert.ok(Math.abs(legacy[0]-.1)<1e-6&&Math.abs(legacy[63]-.3)<1e-6);
});

test('photo spectrum uses the same intermediate response without moving frequencies',()=>{
 const frames=[Array.from({length:64},(_,i)=>i/63),Array.from({length:64},(_,i)=>(63-i)/63)],analysis={fps:60,spectrum:{frames}};
 const original=sampleSpectrum(analysis,1/120,2.45),reduced=sampleSpectrum(analysis,1/120,2.45,adaptiveMode),balanced=sampleSpectrum(analysis,1/120,2.45,balancedMode);
 for(let band=0;band<64;band++){assert.ok(balanced[band]>reduced[band]&&balanced[band]<original[band]);assert.ok(Math.abs(balanced[band]-(original[band]+reduced[band])*.5)<1e-7);}
 assert.deepEqual(sampleSpectrum({},10,3,balancedMode),new Float32Array(64));
});
