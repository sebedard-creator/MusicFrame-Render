import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {analyzeAudio,command,ffmpeg,inspectAudio} from '../server/media.js';
test('packed analysis retains every original envelope, spectral value and stereo bin',{timeout:120000},async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'visualizer-packed-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const audio=path.join(dir,'audio.wav');await command(ffmpeg,['-v','error','-y','-f','lavfi','-i','sine=frequency=440:duration=2','-ac','2',audio]);
 const old=path.join(dir,'old'),compact=path.join(dir,'compact');await mkdir(old);await mkdir(compact);
 const reference=await analyzeAudio(audio,old,2),manifest=await analyzeAudio(audio,compact,2,{packed:true});
 const env=await readFile(path.join(compact,'envelopes.bin')),spec=await readFile(path.join(compact,'spectrum.bin')),stereo=await readFile(path.join(compact,'analyzer.bin'));
 assert.equal(manifest.version,2);assert.equal(manifest.count,120);assert.deepEqual(manifest.wave,reference.wave);
 for(let i=0;i<120;i++){
  for(let b=0;b<4;b++)assert.equal(env.readUInt16LE((i*4+b)*2)/1000,reference.frames[i][b]);
  for(let b=0;b<64;b++)assert.equal(spec.readUInt16LE((i*64+b)*2)/1000,reference.spectrum.frames[i][b]);
  for(let c=0;c<2;c++)assert.deepEqual(stereo.subarray(i*320+c*160,i*320+(c+1)*160),Buffer.from(reference.analyzer.frames[i][c],'base64'));
 }
});
test('WAV duration greater than one hour is accepted',{timeout:60000},async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'visualizer-long-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const audio=path.join(dir,'65-minutes.wav');await command(ffmpeg,['-v','error','-y','-f','lavfi','-i','anullsrc=r=8000:cl=mono','-t','3900','-c:a','pcm_s16le',audio]);
 const metadata=await inspectAudio(audio);assert.equal(metadata.duration,3900);
});
