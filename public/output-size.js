// MB are decimal megabytes; the duration is video time, not rendering time.
export function averageSizePerTenMinutes(job) {
  const estimated = ['rendering', 'encoding'].includes(job.status);
  if (!estimated && job.status !== 'completed') return null;
  const bytes = estimated ? job.outputBytes : job.result?.size;
  const seconds = estimated
    ? Math.min(job.durationSeconds || Infinity, job.frames / job.fps)
    : job.result?.duration;
  if (!Number.isFinite(bytes) || bytes <= 0 || !Number.isFinite(seconds) || seconds <= 0) return null;
  if (estimated && seconds < 30) return null;
  return { megabytes: bytes / 1_000_000 * 600 / seconds, estimated };
}
