import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptiveMode,balancedMode,reactionGain,responseAnalysis,sampleResponse} from '../public/audio-response.js';
import {sampleImpact} from '../public/audio-impacts.js';
import {portalPulse} from '../public/portal-pulse.js';
import {validateConfig} from '../server/config.js';
import {projectAudioPath} from '../server/project-paths.js';
import {buildBandIntegral,sampleBandIntegral} from '../public/audio-integral.js';
import path from 'node:path';

const stats=values=>({min:Math.min(...values),max:Math.max(...values)});
test('high-level music retains its small variations instead of a permanent visual ceiling',()=>{
 const analysis={fps:60,frames:Array.from({length:1200},(_,i)=>{const x=.965+.025*Math.sin(i*2*Math.PI/30);return [x,x,x,x];})};
 const original=structuredClone(analysis),legacy=[],adaptive=[];
 for(let i=300;i<1200;i++){legacy.push(sampleResponse(analysis,i/60,3)[0]);adaptive.push(sampleResponse(analysis,i/60,3,adaptiveMode)[0]);}
 assert.equal(stats(legacy).min,1.5);assert.equal(stats(legacy).max,1.5);
 const range=stats(adaptive);assert.ok(range.max-range.min>.15);assert.ok(range.max<1);assert.ok(range.min>=0);assert.deepEqual(analysis,original);
});
test('adaptive response is silent in silence, stable on a constant tone, and independent of seek order',()=>{
 const silence={fps:60,frames:Array.from({length:120},()=>[0,0,0,0])};assert.deepEqual(sampleResponse(silence,1,3,adaptiveMode),[0,0,0,0]);
 const steady={fps:60,frames:Array.from({length:120},()=>[.99,.99,.99,.99])};assert.deepEqual(sampleResponse(steady,.3,3,adaptiveMode),sampleResponse(steady,1.5,3,adaptiveMode));
 const frames=Array.from({length:600},(_,i)=>[0,1,2,3].map(b=>.5+.3*Math.sin(i*.3+b))),analysis={fps:60,frames};
 const expected=sampleResponse(analysis,4.15,2.5,adaptiveMode);sampleResponse(analysis,9.5,3,adaptiveMode);sampleResponse(analysis,.2,1,adaptiveMode);assert.deepEqual(sampleResponse(analysis,4.15,2.5,adaptiveMode),expected);
 const prefix={fps:60,frames:frames.slice(0,300)};assert.deepEqual(sampleResponse(prefix,4.15,2.5,adaptiveMode),expected,'Future frames must not affect past response.');
 assert.equal(responseAnalysis(analysis,adaptiveMode),responseAnalysis(analysis,adaptiveMode),'Preprocessing should be shared across effects.');
});
test('strong attacks remain ordered, with original timing and finite release',()=>{
 const low={events:[{time:1,strength:.7,pattern:1}]},high={events:[{time:1,strength:1.3,pattern:1}]};
 assert.equal(sampleImpact(low,1,3,1).impact,sampleImpact(high,1,3,1).impact);
 assert.ok(sampleImpact(low,1,3,1,.18,adaptiveMode).impact<sampleImpact(high,1,3,1,.18,adaptiveMode).impact);
 assert.equal(sampleImpact(high,.99,3,1,.18,adaptiveMode).impact,0);assert.equal(sampleImpact(high,1.3,3,1,.18,adaptiveMode).impact,0);
 assert.ok(portalPulse(low,1,{sensitivity:3,audioResponse:adaptiveMode}).impact<portalPulse(high,1,{sensitivity:3,audioResponse:adaptiveMode}).impact);
 for(const gain of [.25,1,3]){let previous=-1;for(let value=0;value<=2;value+=.01){const next=reactionGain(value,gain,adaptiveMode);assert.ok(next>previous&&next<1);previous=next;}}
});
test('response modes are validated and project audio follows the current folder',()=>{
 assert.equal(validateConfig({}).audioResponse,'legacy');assert.equal(validateConfig({audioResponse:adaptiveMode}).audioResponse,adaptiveMode);assert.equal(validateConfig({audioResponse:balancedMode}).audioResponse,balancedMode);assert.throws(()=>validateConfig({audioResponse:'unknown'}));
 const directory=path.resolve('data/projects/example');assert.equal(projectAudioPath({audioPath:'Z:/old-folder/data/projects/example/audio.mp3'},directory),path.join(directory,'audio.mp3'));
 assert.throws(()=>projectAudioPath({audioPath:'audio.exe'},directory));
});

test('balanced response restores half the original level while limited music still varies in every band',()=>{
 const analysis={fps:60,frames:Array.from({length:1200},(_,i)=>[0,1,2,3].map(b=>.965+.025*Math.sin(i*2*Math.PI/(30+b*5)+b)))};
 for(const sensitivity of [1.9,2.45,3]){
  const bands=[[],[],[],[]];
  for(let i=300;i<1200;i+=5){
   const original=sampleResponse(analysis,i/60,sensitivity),reduced=sampleResponse(analysis,i/60,sensitivity,adaptiveMode),balanced=sampleResponse(analysis,i/60,sensitivity,balancedMode);
   for(let b=0;b<4;b++){
    assert.ok(balanced[b]>reduced[b]&&balanced[b]<original[b]);
    assert.ok(Math.abs((balanced[b]-reduced[b])/(original[b]-reduced[b])-.5)<1e-12);
    bands[b].push(balanced[b]);
   }
  }
  for(const band of bands)assert.ok(stats(band).max-stats(band).min>.04,'Limited music must retain visible variation.');
 }
 const silence={fps:60,frames:Array.from({length:120},()=>[0,0,0,0])};assert.deepEqual(sampleResponse(silence,1,3,balancedMode),[0,0,0,0]);
 const expected=sampleResponse(analysis,4.15,2.5,balancedMode);sampleResponse(analysis,19,3,balancedMode);sampleResponse(analysis,.1,1,balancedMode);assert.deepEqual(sampleResponse(analysis,4.15,2.5,balancedMode),expected);
});

test('balanced attacks are stronger than adaptive attacks without changing timing or losing strength differences',()=>{
 const low={events:[{time:1,strength:.7,pattern:1}]},high={events:[{time:1,strength:1.3,pattern:1}]};
 const impact=(track,mode,time=1)=>sampleImpact(track,time,3,1,.18,mode).impact;
 assert.ok(impact(high,balancedMode)>impact(high,adaptiveMode));
 assert.ok(impact(high,balancedMode)<impact(high,'legacy'));
 assert.ok(impact(low,balancedMode)<impact(high,balancedMode));
 assert.equal(impact(high,balancedMode,.99),0);assert.equal(impact(high,balancedMode,1.3),0);
});

test('audio-driven rotation also integrates the intermediate envelope deterministically',()=>{
 const analysis={fps:60,frames:Array.from({length:600},(_,i)=>[0,1,2,3].map(b=>.5+.3*Math.sin(i*.3+b)))};
 const intermediate=responseAnalysis(analysis,balancedMode),originalTrack=buildBandIntegral(analysis,0),reducedTrack=buildBandIntegral(responseAnalysis(analysis,adaptiveMode),0),balancedTrack=buildBandIntegral(intermediate,0);
 for(const time of [0,.1,1.4,4.15,9.5])assert.ok(Math.abs(sampleBandIntegral(balancedTrack,time)-(sampleBandIntegral(originalTrack,time)+sampleBandIntegral(reducedTrack,time))*.5)<1e-12);
 assert.equal(responseAnalysis(analysis,balancedMode),intermediate);
 const prefix=responseAnalysis({fps:60,frames:analysis.frames.slice(0,300)},balancedMode);
 assert.deepEqual(prefix.frames[249],intermediate.frames[249]);
});
