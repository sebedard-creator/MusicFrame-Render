import test from 'node:test';
import assert from 'node:assert/strict';
import { sculptHeightfield, sculptPose } from '../public/sculpt-heightfield.js';
import { validateConfig } from '../server/config.js';
import { legacyPresets as presets } from '../public/presets.js';

test('photo sculpture preserves a flat image and derives correctly oriented slopes from a ramp',()=>{
  const pixels=new Uint8ClampedArray(8*6*4);
  for(let y=0;y<6;y++)for(let x=0;x<8;x++){const i=(y*8+x)*4;pixels.fill(128,i,i+3);pixels[i+3]=255;}
  const flat=sculptHeightfield(pixels,8,6,.8);
  assert.ok(flat.values.every(v=>Math.abs(v-128/255)<1e-6));
  assert.ok(flat.slopes.every(v=>Math.abs(v)<1e-6));
  for(let y=0;y<6;y++)for(let x=0;x<8;x++){const i=(y*8+x)*4;pixels.fill(x*20+y*10,i,i+3);}
  const field=sculptHeightfield(pixels,8,6,0);
  for(let i=0;i<48;i++){assert.ok(field.slopes[i*2]>0);assert.ok(field.slopes[i*2+1]<0);}
  assert.throws(()=>sculptHeightfield(pixels,1,6,.5));
});

test('photo sculpture follows audio, stops moving in silence and survives arbitrary seek order',()=>{
  const config={...presets.sculpt};
  const quiet=sculptPose(config,3,[0,0,0,0]);
  const later=sculptPose(config,60,[0,0,0,0]);
  for(const key of Object.keys(quiet).filter(k=>k!=='phase'))assert.equal(quiet[key],later[key]);
  const active=sculptPose(config,3,[.7,.9,.5,.6],.8);
  assert.ok(active.depth>quiet.depth*1.5);
  assert.ok(active.wave>0);
  sculptPose(config,10,[1,.5,.4,.2],1);
  assert.deepEqual(sculptPose(config,3,[.7,.9,.5,.6],.8),active);
  const disabled=sculptPose({...config,intensity:0},3,[1,1,1,1],1);
  for(const key of Object.keys(quiet))assert.equal(disabled[key],quiet[key]);
  const validated=validateConfig({...config,preset:'sculpt',glowPhoto:22});
  assert.equal(validated.sculptDensity,200);assert.equal(validated.glowPhoto,22);
  for(const invalid of [{sculptDepth:2},{sculptWave:-1},{sculptDensity:321},{sculptDensity:40.5},{sculptOrbit:NaN}])assert.throws(()=>validateConfig({preset:'sculpt',...invalid}));
});
