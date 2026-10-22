import test from 'node:test';
import assert from 'node:assert/strict';
import { lamellaDrive } from '../public/lamella-drive.js';
import { legacyPresets as presets,photoModelIds } from '../public/presets.js';
import { validateConfig } from '../server/config.js';

test('lamellae follow measured audio and remain stable across seeks',()=>{
 const config=presets.lamella,track={events:[{time:1,strength:1,pattern:2}]},silence=[0,0,0,0];
 assert.equal(lamellaDrive(config,.999,silence,track).force,0);
 const attack=lamellaDrive(config,1,silence,track);assert.equal(attack.attack,1);assert.ok(attack.force>.8);
 assert.equal(lamellaDrive(config,1.5,silence,track).force,0);
 assert.equal(lamellaDrive({...config,lamReaction:0},1,[1,1,1,1],track).force,0);
 assert.equal(lamellaDrive({...config,intensity:0},1,[1,1,1,1],track).force,0);
 lamellaDrive(config,60,silence,track);assert.deepEqual(lamellaDrive(config,1,silence,track),attack);
});

test('lamella settings validate and append a stable spectrum photo ID',()=>{
 assert.equal(photoModelIds[27],'lamella');
 assert.equal(validateConfig({...presets.lamella,preset:'lamella',glowPhoto:28}).lamColumns,160);
 for(const invalid of [{lamColumns:39},{lamColumns:641},{lamColumns:160.5},{lamTravel:2},{lamAngle:91},{lamReturn:0},{lamGain:NaN}])assert.throws(()=>validateConfig({preset:'lamella',...invalid}));
});
