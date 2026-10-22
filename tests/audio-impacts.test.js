import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImpactTrack, sampleImpact } from '../public/audio-impacts.js';

test('silence and a sustained level do not generate autonomous movement', () => {
  for (const level of [0, .5]) {
    const track = buildImpactTrack({ fps: 60, frames: Array.from({ length: 180 }, () => [level, level, level, level]) });
    assert.equal(track.events.length, 0);
    assert.deepEqual(sampleImpact(track, .5), { impact: 0, pattern: 0 });
    assert.deepEqual(sampleImpact(track, 2.5), { impact: 0, pattern: 0 });
  }
});

test('attacks trigger seekable patterns with a finite return to the unmodified image', () => {
  const frames = Array.from({ length: 240 }, () => [0, 0, 0, 0]);
  for (const start of [30, 90]) for (let offset = 0; offset < 12; offset++) {
    const level = 1 - offset / 12; frames[start + offset] = [level, level, level * .5, level * .2];
  }
  const track = buildImpactTrack({ fps: 60, frames });
  assert.equal(track.events.length, 2);
  assert.ok(Math.abs(track.events[0].time - .5) <= 1 / 60);
  const onset = track.events[0].time;
  assert.equal(sampleImpact(track, onset - .01).impact, 0);
  const peak = sampleImpact(track, onset, 1, 1, .18);
  assert.ok(peak.impact > .8);
  assert.ok(sampleImpact(track, onset + .09, 1, 1, .18).impact < peak.impact * .5);
  const quiet = sampleImpact(track, onset + .25, 1, 1, .18);
  assert.equal(quiet.impact, 0);
  assert.equal(sampleImpact(track, onset + .7).pattern, quiet.pattern);
  assert.notEqual(sampleImpact(track, 1.5).pattern, peak.pattern);
  sampleImpact(track, 3.9);
  assert.deepEqual(sampleImpact(track, onset, 1, 1, .18), peak, 'Seeking and export order must not change an impact.');
  assert.ok(sampleImpact(track, onset, .25, .25, .18).impact < peak.impact);
});
