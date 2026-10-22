import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProductionSequence} from '../server/production-sequence.js';
import {videoEncodingArgs} from '../server/video-encoding.js';

test('production uses all approved effects, frozen settings and a full-song loop',()=>{
 const project={audio:{duration:321.5}},saved={dataGrains:{revision:3,config:{dataDensity:600,rgb:.12,fps:30}},stereoGlow:{revision:2,config:{glowOpacity:.7}}};
 const before=structuredClone(saved),sequence=buildProductionSequence(project,saved);
 assert.equal(sequence.segments.length,20);assert.equal(sequence.repeat,true);assert.equal(sequence.labels,false);assert.equal(sequence.durationSeconds,321.5);
 assert.equal(sequence.segmentSeconds,8);assert.equal(sequence.transitionSeconds,3);
 assert.ok(sequence.segments.every(s=>s.config.fps===60&&s.config.imageSeconds===8&&s.config.audioResponse==='balanced-v1'));
 assert.equal(sequence.spectrumConfig.audioResponse,'legacy');
 assert.ok(!sequence.segments.some(s=>['stereoGlow','pulse','portal','advection','lamella'].includes(s.key)));
 const grains=sequence.segments.find(s=>s.key==='dataGrains');assert.equal(grains.revision,3);assert.equal(grains.config.dataDensity,600);assert.equal(grains.config.rgb,.12);
 assert.equal(sequence.spectrumConfig.glowOpacity,.7);assert.deepEqual(saved,before);
 const fallback=buildProductionSequence(project);assert.equal(fallback.spectrumConfig.glowOpacity,.57);assert.equal(fallback.segments.find(s=>s.key==='orbit').config.orbitGrain,.72);
});

test('YouTube output uses progressive high-profile H264, closed short GOP and bounded quality',()=>{
 const args=videoEncodingArgs(60,{youtube:true}),value=key=>args[args.indexOf(key)+1];
 assert.equal(value('-c:v'),'libx264');assert.equal(value('-crf'),'18');assert.equal(value('-g'),'30');assert.equal(value('-bf'),'2');assert.equal(value('-profile:v'),'high');assert.equal(value('-level:v'),'4.2');assert.equal(value('-pix_fmt'),'yuv420p');assert.equal(value('-colorspace'),'bt709');assert.equal(value('-maxrate'),'32M');
 assert.throws(()=>videoEncodingArgs(60,{encoder:'untrusted'}));
});
