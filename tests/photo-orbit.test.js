import test from 'node:test';
import assert from 'node:assert/strict';
import { orbitCover,orbitPose } from '../public/orbit-pose.js';
import { presets,photoModelIds } from '../public/presets.js';
import { validateConfig } from '../server/config.js';

test('rotation cover keeps all output corners inside the source at every pivot',()=>{
 for(const centerX of [.2,.5,.8])for(const centerY of [.2,.5,.8])for(let degree=-180;degree<=180;degree+=3){
  const a=degree*Math.PI/180,z=orbitCover(a,centerX,centerY),c=Math.cos(a),s=Math.sin(a);
  for(const x of [0,1])for(const y of [0,1]){
   const dx=(x-centerX)*1920,dy=(y-centerY)*1080;
   const u=(c*dx+s*dy)/z/1920+centerX,v=(-s*dx+c*dy)/z/1080+centerY;
   assert.ok(u>=-1e-10&&u<=1+1e-10&&v>=-1e-10&&v<=1+1e-10);
  }
 }
 assert.equal(orbitCover(0),1);
});

test('rotation follows integrated audio with bounded rocking and short causal kicks',()=>{
 const c=presets.orbit,empty={events:[]},track={events:[{time:1,strength:1,pattern:2}]};
 const before=orbitPose(c,.999,2,track),hit=orbitPose(c,1,2,track);
 assert.ok(Math.abs(hit.angle-before.angle)>2*Math.PI/180);
 assert.deepEqual(orbitPose(c,2,2,track),orbitPose(c,80,2,track),'No audio travel means no autonomous rotation.');
 assert.deepEqual(orbitPose({...c,orbitReaction:0},1,2,track),orbitPose(c,1,2,empty));
 assert.equal(orbitPose({...c,intensity:0},1,2,track).angle,0);
 for(const travel of [0,1,2,10,100])assert.ok(Math.abs(orbitPose(c,2,travel,empty).angle)<=c.orbitAmplitude*Math.PI/180);
 const continuous={...c,orbitMode:1};assert.ok(orbitPose(continuous,2,100,empty).angle>orbitPose(continuous,2,50,empty).angle);
 assert.equal(photoModelIds[29],'orbit');
 assert.equal(validateConfig({...c,preset:'orbit',glowPhoto:30}).orbitAmplitude,7);
 for(const invalid of [{orbitAmplitude:21},{orbitMode:.5},{orbitCenterX:0},{orbitReturn:0},{orbitGrain:NaN}])assert.throws(()=>validateConfig({preset:'orbit',...invalid}));
});
