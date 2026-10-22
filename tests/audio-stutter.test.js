import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleStutter } from '../public/audio-stutter.js';

test('stutter bursts repeat on their onset, remain seekable, and end after their duration', () => {
  const track = { events: [{ time: 1, strength: 1, pattern: 7 }] };
  assert.equal(sampleStutter(track, .99).impact, 0);
  assert.equal(sampleStutter(track, 1).impact, 1);
  const beforeRepeat = sampleStutter(track, 1.095, 1, .3, 3);
  const repeat = sampleStutter(track, 1.105, 1, .3, 3);
  assert.ok(repeat.impact > beforeRepeat.impact * 10, 'A new reprise should restart the impulse.');
  assert.equal(repeat.step, 1);
  sampleStutter(track, 3600);
  assert.deepEqual(sampleStutter(track, 1.105, 1, .3, 3), repeat);
  assert.equal(sampleStutter(track, 1.31, 1, .3, 3).impact, 0);
  assert.equal(sampleStutter({ events: [] }, 1).impact, 0);
});
