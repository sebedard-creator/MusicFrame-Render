// Decimal GB, using the agreed planning estimate of 2 GB per 10 minutes.
// Rendering time and already-written bytes do not change the track duration.
export function estimatedOutputSize(job) {
  if (job.status === 'completed') {
    const bytes = job.result?.size;
    return Number.isFinite(bytes) && bytes > 0 ? {bytes, estimated: false} : null;
  }
  if (!['starting', 'rendering', 'paused', 'encoding'].includes(job.status)) return null;
  const seconds = job.durationSeconds ?? job.totalFrames / job.fps;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return {bytes: seconds / 600 * 2_000_000_000, estimated: true};
}
