import test from 'node:test';
import assert from 'node:assert/strict';
import { nextPreviewDeadline } from '../public/preview-timing.js';

test('preview scheduling maintains its target on 60, 75, 120, 144 and 240 Hz displays', () => {
  for (const displayHz of [60, 75, 120, 144, 240]) for (const target of [30, 60]) {
    let deadline = 0; let rendered = 0;
    for (let frame = 0; frame < displayHz * 2; frame++) {
      const timestamp = frame * 1000 / displayHz;
      if (timestamp + .5 < deadline) continue;
      rendered++; deadline = nextPreviewDeadline(deadline, timestamp, target);
    }
    assert.ok(Math.abs(rendered - target * 2) <= 1, `${displayHz} Hz / ${target} fps rendered ${rendered} frames in 2 seconds`);
  }
  assert.ok(nextPreviewDeadline(100, 500, 60) > 500, 'A slow frame should skip missed deadlines instead of building a backlog.');
});
