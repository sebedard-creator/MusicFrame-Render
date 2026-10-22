import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBandIntegral, sampleBandIntegral } from '../public/audio-integral.js';

test('audio travel integrates silence, constant envelopes and ramps independently of analysis rate or seek order', () => {
  for (const fps of [30, 60, 120]) {
    const ramp = buildBandIntegral({ fps, frames: Array.from({ length: fps + 1 }, (_, i) => [0, i / fps, 0, 0]) });
    assert.ok(Math.abs(sampleBandIntegral(ramp, .75) - .28125) < 1e-12);
    assert.ok(Math.abs(sampleBandIntegral(ramp, 1) - .5) < 1e-12);
    sampleBandIntegral(ramp, 1);
    assert.ok(Math.abs(sampleBandIntegral(ramp, .25) - .03125) < 1e-12);
    const constant = buildBandIntegral({ fps, frames: Array.from({ length: fps }, () => [0, .4, 0, 0]) });
    assert.ok(Math.abs(sampleBandIntegral(constant, 1.5) - .6) < 1e-12);
  }
  assert.equal(sampleBandIntegral(buildBandIntegral({ fps: 60, frames: [[0, 0, 0, 0]] }), 100), 0);
});
