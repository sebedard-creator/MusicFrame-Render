// Fixed 60 Hz history for both preview and 30/60 fps exports.
// A seek reconstructs the last 32 ticks (maximum retained weight: .84^32 < .004).
export function feedbackPlan(time, previousTick = -1, reset = false, photoStart = 0) {
  const tick = Math.max(0, Math.floor(time * 60 + 1e-6));
  const first = Math.max(0, Math.floor(photoStart * 60 + 1e-6));
  const restart = reset || previousTick < first || tick < previousTick || tick - previousTick > 18;
  const start = restart ? Math.max(first, tick - 31) : previousTick + 1;
  return { tick, restart, ticks: Array.from({ length: Math.max(0, tick - start + 1) }, (_, i) => start + i) };
}
