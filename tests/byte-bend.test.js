import test from 'node:test';
import assert from 'node:assert/strict';
import { bendBytes } from '../public/byte-bend.js';

test('databend echo crosses RGBA boundaries, uses bipolar bytes, and preserves source alpha', () => {
  const source = new Uint8ClampedArray([200, 100, 40, 255, 80, 160, 220, 127]);
  const result = bendBytes(source, { mode: 0, offset: 1, intensity: 1 });
  assert.deepEqual([...result], [200, 172, 12, 255, 207, 112, 252, 127]);
  assert.equal(source[1], 100, 'The source bytes must remain intact.');
});

test('databend reverses alternating byte chunks, restores alpha, and is repeatable', () => {
  const source = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 128, 70, 80, 90, 64]);
  const options = { mode: 3, offset: 5 };
  assert.deepEqual([...bendBytes(source, options)], [40, 255, 30, 255, 10, 50, 60, 128, 70, 80, 64, 64]);
  for (const mode of [0, 1, 2, 3]) {
    const output = bendBytes(source, { mode, offset: 11 });
    for (let i = 3; i < source.length; i += 4) assert.equal(output[i], source[i]);
    assert.deepEqual(output, bendBytes(source, { mode, offset: 11 }));
  }
});
