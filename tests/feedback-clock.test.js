import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackPlan } from '../public/feedback-clock.js';

test('feedback uses the same 60 Hz ticks for 30/60 fps, rebuilds seeks and respects photo cuts', () => {
  const run = fps => {
    let last = -1; const ticks = [];
    for (let f = 0; f <= fps; f++) { const p = feedbackPlan(f / fps, last); ticks.push(...p.ticks); last = p.tick; }
    return ticks;
  };
  assert.deepEqual(run(30), run(60));
  assert.deepEqual(feedbackPlan(1, 60).ticks, [], 'Paused redraw must not accumulate feedback.');
  const seek = feedbackPlan(10, 60);
  assert.equal(seek.restart, true); assert.equal(seek.ticks.length, 32); assert.equal(seek.ticks.at(-1), 600);
  assert.deepEqual(feedbackPlan(10, 900), seek, 'Forward/backward seeks rebuild the same history.');
  assert.deepEqual(feedbackPlan(12.05, 700, false, 12).ticks, [720, 721, 722, 723]);
  assert.equal(feedbackPlan(1, 59, true).restart, true);
});
