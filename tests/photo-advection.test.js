import test from 'node:test';
import assert from 'node:assert/strict';
import { advectionDrive } from '../public/advection-drive.js';
import { legacyPresets as presets,photoModelIds } from '../public/presets.js';
import { validateConfig } from '../server/config.js';

test('micrograin motion follows causal audio attacks and stops in silence',()=>{
 const c=presets.advection,track={events:[{time:1,strength:1,pattern:3}]},silence=[0,0,0,0];
 assert.equal(advectionDrive(c,.999,silence,track).force,0);
 assert.equal(advectionDrive(c,1,silence,track).attack,1);
 assert.ok(advectionDrive(c,1,silence,track).force>1);
 assert.equal(advectionDrive(c,1.2,silence,track).force,0);
 assert.equal(advectionDrive({...c,advReaction:0},1,[1,1,1,1],track).force,0);
 assert.equal(advectionDrive({...c,intensity:0},1,[1,1,1,1],track).force,0);
 const beforeSeek=advectionDrive(c,1,silence,track);
 advectionDrive(c,30,silence,track);
 assert.deepEqual(advectionDrive(c,1,silence,track),beforeSeek);
});

test('micrograin controls stay bounded and preserve existing photo IDs',()=>{
 assert.equal(photoModelIds[26],'advection');
 assert.equal(validateConfig({...presets.advection,preset:'advection',advPitch:1.25,glowPhoto:27}).advPitch,1.25);
 for(const invalid of [{advPitch:0},{advPitch:11},{advFlow:2},{advDepth:-1},{advReturn:0},{advGain:5},{advReaction:NaN}])assert.throws(()=>validateConfig({preset:'advection',...invalid}));
});
