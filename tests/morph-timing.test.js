import test from 'node:test';
import assert from 'node:assert/strict';
import { morphProgress } from '../public/morph-timing.js';

test('photo morph finishes at the shared image boundary and restarts cleanly after seeks', () => {
  assert.equal(morphProgress(10, 12, 1.2), 0);
  assert.ok(Math.abs(morphProgress(11.4, 12, 1.2) - .5) < 1e-10);
  assert.ok(morphProgress(11.99999, 12, 1.2) > .9999);
  assert.equal(morphProgress(12, 12, 1.2), 0);
  assert.equal(morphProgress(36, 12, 1.2), 0);
  assert.equal(morphProgress(.001, .04, 2), 0, 'A long morph must still leave a hold interval on short songs.');
  const held = morphProgress(47.4, 12, 1.2);
  morphProgress(2500, 12, 1.2);
  assert.equal(morphProgress(47.4, 12, 1.2), held);
});
