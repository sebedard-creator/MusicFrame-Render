import test from 'node:test';
import assert from 'node:assert/strict';
import { holoPose } from '../public/holo-pose.js';
import { presets } from '../public/presets.js';
import { validateConfig } from '../server/config.js';

test('holographic planes follow audio without idle movement or seek history',()=>{
 const config=presets.holo,quiet=holoPose(config,3,[0,0,0,0]),later=holoPose(config,40,[0,0,0,0]);
 for(const key of Object.keys(quiet).filter(key=>key!=='phase'))assert.equal(quiet[key],later[key]);
 const active=holoPose(config,3,[1,.9,.7,.6],.8);
 assert.ok(active.depth>quiet.depth*1.5);assert.ok(active.stagger>0);assert.ok(active.glow>quiet.glow);assert.ok(active.scanDrive>0);
 holoPose(config,91,[1,1,1,1],1);assert.deepEqual(holoPose(config,3,[1,.9,.7,.6],.8),active);
 assert.deepEqual(holoPose({...config,intensity:0},3,[1,1,1,1],1),quiet);
 assert.deepEqual(holoPose({...config,holoReaction:0},3,[1,1,1,1],1),{...quiet,push:config.zoom*30});
});

test('holographic plane controls validate and preserve their appended spectrum ID',()=>{
 const config=validateConfig({...presets.holo,preset:'holo',glowPhoto:23});
 assert.equal(config.holoLayers,44);assert.equal(config.glowPhoto,23);
 assert.equal(config.holoDepth,1);assert.equal(config.holoOrbit,1);assert.equal(config.holoTint,0);assert.equal(config.holoLines,0);assert.equal(config.rgb,.23);
 for(const invalid of [{holoLayers:3},{holoLayers:49},{holoLayers:16.5},{holoDepth:NaN},{holoPhoto:2},{holoTint:-1},{holoReaction:1.01}])assert.throws(()=>validateConfig({preset:'holo',...invalid}));
});
