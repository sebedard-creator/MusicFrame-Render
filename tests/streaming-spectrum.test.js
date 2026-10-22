import test from 'node:test';
import assert from 'node:assert/strict';
import {StreamingStereoSampler} from '../public/analysis-loader.js';
import {processStereoTrack,sampleStereoTrack} from '../public/stereo-spectrum.js';
import {presets} from '../public/presets.js';
test('streamed spectrum exactly matches full processing across block boundaries, seeks and setting changes',async t=>{
 const count=2000,raw=Array.from({length:count},(_,f)=>[0,1].map(ch=>Uint8Array.from({length:160},(_,b)=>(f*31+b*17+ch*93)%256)));
 const binary=Buffer.concat(raw.flat().map(a=>Buffer.from(a))),original=globalThis.fetch;let requests=0;
 globalThis.fetch=async(url,options)=>{requests++;const [,lo,hi]=/^bytes=(\d+)-(\d+)$/.exec(options.headers.Range);return new Response(binary.subarray(Number(lo),Number(hi)+1),{status:206});};t.after(()=>{globalThis.fetch=original;});
 const sampler=new StreamingStereoSampler({count,fps:60},'http://local/analyzer.bin');
 for(const config of [presets.stereoGlow,{...presets.stereoGlow,glowSmoothing:.95,glowPeaks:1,glowPeakDrop:.99,glowBands:160}]){
  const expected=processStereoTrack(raw,config);
  for(const time of [0,29.98,30,30.04,12.3,12.32,33.32]){await sampler.ensure(time,config);assert.deepEqual(sampler.sample(time,config),sampleStereoTrack(expected,60,time,config.glowBands));assert.ok(sampler.output.size<=4);assert.ok(sampler.raw.length<=1800*320);}
 }
 assert.ok(requests>=4);
});
