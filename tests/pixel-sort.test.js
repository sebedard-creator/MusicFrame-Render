import test from 'node:test';
import assert from 'node:assert/strict';
import { sortPixels } from '../public/pixel-sort.js';

const rgba = values => new Uint8ClampedArray(values.flatMap(value => [value, value, value, 255]));
const gray = pixels => [...pixels].filter((_, index) => index % 4 === 0);

test('pixel sorting preserves gated pixels and sorts runs within row and column boundaries', () => {
  const source = rgba([180, 80, 0, 150, 60, 255, 90, 200]);
  const horizontal = sortPixels(source, 4, 2, { threshold: .1, length: 1, direction: 0 });
  assert.deepEqual(gray(horizontal), [80, 180, 0, 150, 60, 255, 90, 200]);
  assert.deepEqual(gray(source), [180, 80, 0, 150, 60, 255, 90, 200], 'The source remains unchanged.');
  assert.deepEqual(gray(sortPixels(source, 4, 2, { threshold: .1, length: 1, direction: 1 })), [60, 80, 0, 150, 180, 255, 90, 200]);
  assert.deepEqual(gray(sortPixels(rgba([180, 90, 150, 60]), 4, 1, { threshold: 0, length: .5, direction: 0 })), [90, 180, 60, 150]);
  assert.deepEqual(gray(sortPixels(rgba([50, 180, 90]), 3, 1, { threshold: 0, length: 1, direction: 0, reverse: 1 })), [180, 90, 50]);
});

test('sorting moves complete RGBA pixels without losing colors or alpha', () => {
  const pixels = new Uint8ClampedArray([200, 50, 10, 180, 10, 20, 30, 90, 50, 100, 200, 255]);
  const sorted = sortPixels(pixels, 3, 1, { threshold: 0, length: 1, direction: 0 });
  const colors = data => Array.from({ length: 3 }, (_, i) => [...data.slice(i * 4, i * 4 + 4)].join(',')).sort();
  assert.deepEqual(colors(sorted), colors(pixels));
});
