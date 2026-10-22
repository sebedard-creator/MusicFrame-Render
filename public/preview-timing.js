// Keep a phase-based deadline: displays at 75/144 Hz should still reach the target.
export function nextPreviewDeadline(previous, timestamp, fps) {
  const interval = 1000 / fps;
  if (!previous) return timestamp + interval;
  const next = previous + interval;
  return next < timestamp - .5 ? timestamp + interval : next;
}
