import test from 'node:test';
import assert from 'node:assert/strict';
import { activeGrains } from '../public/grain-schedule.js';

test('granular crops remain seekable, windowed, and bounded over a one-hour track', () => {
  const first = activeGrains(24.35, 55, .42, .18);
  assert.ok(first.length > 5);
  activeGrains(900, 100, 1.2, .4);
  assert.deepEqual(activeGrains(24.35, 55, .42, .18), first);
  for (const time of [0, .01, 24.35, 900, 3599.99]) {
    const grains = activeGrains(time, 100, 1.2, .4);
    assert.ok(grains.length < 192, 'The full supported lifetime/density range must fit the GPU allocation.');
    for (const grain of grains) {
      assert.ok(grain.phase >= 0 && grain.phase < 1);
      assert.ok(grain.alpha > .01 && grain.alpha <= 1);
      assert.ok(grain.x >= 0 && grain.x <= .6 && grain.y >= 0 && grain.y <= .6);
    }
  }
});
