// Approved sequence defaults; exported manifests retain their original timing.
export const defaultSequenceTiming = Object.freeze({ holdSeconds: 5, transitionSeconds: 3 });

export function sequencePosition(sequence, time) {
  const elapsed = Math.max(0, time - (sequence.startTime || 0));
  const step = Math.floor(elapsed / sequence.segmentSeconds + 1e-9);
  const index = sequence.repeat ? step % sequence.segments.length : Math.min(sequence.segments.length - 1, step);
  const ordinal = sequence.repeat ? step : index;
  const local = elapsed - ordinal * sequence.segmentSeconds;
  const transition = sequence.transitionSeconds || 0;
  const next = sequence.repeat ? sequence.segments[(index+1)%sequence.segments.length] : index + 1 < sequence.segments.length ? sequence.segments[index + 1] : null;
  const mix = next && transition > 0 ? Math.max(0, Math.min(1, (local - sequence.segmentSeconds + transition) / transition)) : 0;
  return { index, ordinal, segment: sequence.segments[index], elapsed: local, next, mix };
}

export function sequenceDuration(sequence) {
  if (Number.isFinite(sequence.durationSeconds)) return sequence.durationSeconds;
  return sequence.segments.length * sequence.segmentSeconds - (sequence.transitionSeconds || 0);
}
