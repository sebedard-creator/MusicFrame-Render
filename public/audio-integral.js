// Integrate the prepared audio envelope once, then sample it at any MP3 time.
// A fixed analysis clock keeps travel continuous across seeks and export FPS.
export function buildBandIntegral(analysis, band = 1) {
  const prefix = new Float64Array(analysis.frames.length);
  for (let i = 1; i < prefix.length; i++) prefix[i] = prefix[i - 1] + (analysis.frames[i - 1][band] + analysis.frames[i][band]) / (2 * analysis.fps);
  return { frames: analysis.frames, fps: analysis.fps, band, prefix };
}

export function sampleBandIntegral(track, time) {
  if (time <= 0 || !track.frames.length) return 0;
  const position = time * track.fps, last = track.frames.length - 1;
  const index = Math.min(last, Math.floor(position));
  const duration = time - index / track.fps;
  const a = track.frames[index][track.band], b = track.frames[Math.min(last, index + 1)][track.band];
  return track.prefix[index] + a * duration + (b - a) * duration * duration * track.fps / 2;
}
