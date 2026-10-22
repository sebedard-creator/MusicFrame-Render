import test from 'node:test';
import assert from 'node:assert/strict';
import { samplePulseWaves } from '../public/audio-shock.js';

test('shock waves start on measured attacks, travel outward, expire and remain seekable', () => {
  const silent = { events: [] };
  assert.ok(samplePulseWaves(silent, 500).gains.every(value => value === 0));
  const track = { events: [{ time: 10, strength: 1 }, { time: 12, strength: .6 }] };
  assert.ok(samplePulseWaves(track, 9).gains.every(value => value === 0));
  const start = samplePulseWaves(track, 10);
  assert.equal(start.radii[0], 0); assert.equal(start.gains[0], 1);
  const later = samplePulseWaves(track, 10.5);
  assert.ok(Math.abs(later.radii[0] - .4) < 1e-6);
  assert.ok(later.gains[0] > 0 && later.gains[0] < start.gains[0]);
  assert.ok(samplePulseWaves(track, 11.8).gains.every(value => value === 0));
  assert.ok(samplePulseWaves(track, 10.9, 2).gains.every(value => value === 0));
  samplePulseWaves(track, 13);
  assert.deepEqual(samplePulseWaves(track, 10.5), later);
  const dense = { events: Array.from({ length: 1000 }, (_, i) => ({ time: i * .01, strength: 1 })) };
  const bounded = samplePulseWaves(dense, 9.99);
  assert.equal(bounded.gains.length, 8); assert.ok(bounded.gains.every(value => value > 0));
});
