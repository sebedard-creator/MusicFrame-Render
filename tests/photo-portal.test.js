import test from 'node:test';
import assert from 'node:assert/strict';
import { portalPulse,portalLayout } from '../public/portal-pulse.js';
import { legacyPresets as presets,photoModelIds } from '../public/presets.js';
import { validateConfig } from '../server/config.js';

test('portal impact begins on the attack, decays quickly and cannot move in silence',()=>{
 const config=presets.portal,track={events:[{time:1,strength:1,pattern:3},{time:2,strength:.01,pattern:4}]};
 assert.equal(portalPulse(track,.999,config).impact,0);assert.equal(portalPulse(track,1,config).impact,1);
 const decay=[1.02,1.06,1.10,1.15].map(time=>portalPulse(track,time,config).impact);
 assert.ok(decay[0]>decay[1]&&decay[1]>decay[2]&&decay[2]>decay[3]);assert.equal(decay[3],0);
 assert.equal(portalPulse(track,2,config).impact,0);assert.equal(portalPulse(track,30,config).impact,0);
 assert.equal(portalPulse(track,1,{...config,intensity:0}).impact,0);
 assert.equal(portalPulse(track,1,{...config,portalReaction:0}).impact,0);
 portalPulse(track,40,config);assert.deepEqual(portalPulse(track,1,config),{impact:1,pattern:3});
 const exported={events:[{time:481/60,strength:1,pattern:7}]};
 assert.equal(portalPulse(exported,7+61/60,config).impact,1,'The MP4 frame at the measured onset must contain the impulse.');
});

test('portal frames partition exactly one photo and accept only bounded control values',()=>{
 for(const frames of [4,14,40]){
  const layout=portalLayout(frames);assert.equal(layout.count,4*(frames-1)+1);
  let area=0;for(let i=0;i<layout.count;i++){const w=layout.sizes[i*2],h=layout.sizes[i*2+1];area+=w*h;assert.ok(w>0&&h>0);}
  assert.ok(Math.abs(area-1)<1e-6);
 }
 const config=validateConfig({...presets.portal,preset:'portal',glowPhoto:26});assert.equal(config.portalReturn,.14);assert.equal(photoModelIds[25],'portal');
 for(const invalid of [{portalFrames:3},{portalFrames:41},{portalFrames:14.5},{portalReturn:0},{portalGain:5},{portalThreshold:NaN}])assert.throws(()=>validateConfig({preset:'portal',...invalid}));
});
