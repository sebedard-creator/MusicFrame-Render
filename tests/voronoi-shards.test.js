import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShardCells } from '../public/voronoi-shards.js';

test('Voronoi photo shards tile the whole frame and obey nearest-seed boundaries', () => {
  for (const count of [12, 32, 64]) {
    const cells = buildShardCells(count);
    let totalArea = 0;
    for (const cell of cells) {
      assert.ok(cell.polygon.length >= 3);
      let signedArea = 0;
      for (let i = 0; i < cell.polygon.length; i++) {
        const p = cell.polygon[i], next = cell.polygon[(i + 1) % cell.polygon.length];
        signedArea += p[0] * next[1] - next[0] * p[1];
        assert.ok(p.every(value => Number.isFinite(value) && value >= -1.000001 && value <= 1.000001));
        const ownDistance = (p[0] - cell.center[0]) ** 2 + (p[1] - cell.center[1]) ** 2;
        for (const other of cells) assert.ok(ownDistance <= (p[0] - other.center[0]) ** 2 + (p[1] - other.center[1]) ** 2 + 1e-9);
      }
      assert.ok(signedArea > 0);
      totalArea += signedArea / 2;
    }
    assert.ok(Math.abs(totalArea - 4) < 1e-9, 'The unbroken photo must have no gaps or duplicated area.');
    assert.deepEqual(cells, buildShardCells(count));
  }
});
