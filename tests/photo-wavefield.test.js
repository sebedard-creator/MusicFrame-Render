import test from 'node:test';
import assert from 'node:assert/strict';
import { wavefieldHistory } from '../public/wavefield-history.js';
import { legacyPresets as presets,photoModelIds } from '../public/presets.js';
import { validateConfig } from '../server/config.js';

test('audio waterfall retains frequency position, causal row delays and arbitrary seek stability',()=>{
 const frames=Array.from({length:180},(_,frame)=>Array.from({length:64},(_,band)=>frame>=60&&frame<90&&band===20?1:0));
 const analysis={fps:60,spectrum:{frames}};
 const data=wavefieldHistory(analysis,1.3,64,1,1,1);
 assert.equal(data[20],170);assert.equal(data[19],0);assert.equal(data[21],0);
 assert.ok(data.slice(48*64).every(value=>value===0),'Older rows precede the measured pulse.');
 const copy=data.slice();wavefieldHistory(analysis,2.9,256,2,1,1);
 assert.deepEqual(wavefieldHistory(analysis,1.3,64,1,1,1),copy);
 assert.ok(wavefieldHistory(analysis,1.3,64,1,1,0).every(value=>value===0));
 assert.ok(wavefieldHistory(analysis,.1,64,1,1,1).every(value=>value===0));
 const target=new Uint8Array(64*64);assert.equal(wavefieldHistory(analysis,1.3,64,1,1,1,target),target);
 for(const rows of [47,257,64.5])assert.throws(()=>wavefieldHistory(analysis,1,rows,1,1,1));
});

test('ribbon controls save their own values and retain appended spectrum model numbering',()=>{
 const config=validateConfig({...presets.wavefield,preset:'wavefield',glowPhoto:25});assert.equal(config.wfRows,128);assert.equal(config.wfHistory,1.25);assert.equal(photoModelIds[24],'wavefield');
 for(const invalid of [{wfRows:47},{wfRows:257},{wfRows:128.5},{wfHistory:0},{wfHistory:3.1},{wfFill:0},{wfDepth:NaN},{wfReaction:2}])assert.throws(()=>validateConfig({preset:'wavefield',...invalid}));
});
