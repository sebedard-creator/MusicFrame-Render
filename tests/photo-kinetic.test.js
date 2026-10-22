import test from 'node:test';
import assert from 'node:assert/strict';
import { kineticLayout,kineticPose } from '../public/kinetic-prisms.js';
import { legacyPresets as presets,photoModelIds } from '../public/presets.js';
import { validateConfig } from '../server/config.js';

test('kinetic photo cells tile both halves of every square and retain deterministic seeds',()=>{
 const layout=kineticLayout(48);assert.equal(layout.count,48*27*2);
 for(let i=0;i<layout.count;i+=2){
  assert.equal(layout.faces[i],0);assert.equal(layout.faces[i+1],1);
  assert.equal(layout.cells[i*2],layout.cells[(i+1)*2]);assert.equal(layout.cells[i*2+1],layout.cells[(i+1)*2+1]);
  assert.ok(layout.cells[i*2]>=0&&layout.cells[i*2]<48);assert.ok(layout.cells[i*2+1]>=0&&layout.cells[i*2+1]<27);
 }
 assert.ok(layout.seeds.every(seed=>seed>=0&&seed<1));assert.deepEqual(kineticLayout(48),layout);
 for(const value of [11,145,12.5,NaN])assert.throws(()=>kineticLayout(value));
});

test('kinetic photo poses follow audio and remain identical after arbitrary seeks',()=>{
 const config=presets.kinetic,quiet=kineticPose(config,3,[0,0,0,0]),active=kineticPose(config,3,[1,.9,.7,.6],.8);
 assert.ok(active.bass>0&&active.mid>0&&active.impact>0);assert.ok(active.zoom>quiet.zoom);
 kineticPose(config,55,[1,1,1,1],1);assert.deepEqual(kineticPose(config,3,[1,.9,.7,.6],.8),active);
 assert.deepEqual(kineticPose({...config,intensity:0},3,[1,1,1,1],1),quiet);
 const validated=validateConfig({...config,preset:'kinetic',glowPhoto:24});assert.equal(validated.kinColumns,48);assert.equal(photoModelIds[23],'kinetic');
 for(const invalid of [{kinColumns:11},{kinColumns:145},{kinColumns:48.5},{kinDepth:2},{kinFlow:-1},{kinSpin:NaN}])assert.throws(()=>validateConfig({preset:'kinetic',...invalid}));
});
